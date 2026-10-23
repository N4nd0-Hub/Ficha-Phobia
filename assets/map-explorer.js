/* Map presentation; campaign records and saves remain owned by the sheet. */
let atlasTokyoCamera=null, atlasLocalCamera=null;
const atlasUi={query:'',localQuery:'',type:'all',view:typeof matchMedia==='function'&&matchMedia('(max-width:580px)').matches?'list':'map',district:null,geometry:null};
const ATLAS_COLORS={visited:'#a0d86a',important:'#ef2b97',danger:'#ff727c',cognitive:'#6ce6ff',discovered:'#dbcba9',locked:'#777080'};
const ATLAS_DISTRICT_PHOTO={shibuya:'center_gai',shinjuku:'kabuki',akihabara:'elec',ikebukuro:'sunshine',nakano:'broadway',harajuku:'takeshita',asakusa:'sensoji',roppongi:'clubs',meguro:'river',odaiba:'rainbow',ginza:'sony',kichijoji:'inokashira'};
function atlasLocked(record){return state.mode==='player'&&record?.state==='locked'}
function atlasNormalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function atlasPhoto(id){return window.PHOBIA_MAP_PHOTOS?.[id]||null}
function atlasPhotoHTML(id,label){
  const p=atlasPhoto(id);
  if(!p)return '<div class="atlas-photo-missing">Ainda sem referência fotográfica.</div>';
  return `<figure class="atlas-photo"><button type="button" data-atlas-photo="${esc(id)}" aria-label="Ampliar foto: ${esc(label)}"><img src="${esc(p.src)}" alt="${esc(p.caption)}" loading="lazy" decoding="async"></button><figcaption>${esc(p.date||'Data não informada')} · <a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">${esc(p.author)} · ${esc(p.license)}</a></figcaption></figure>`;
}
function atlasStatusOptions(value){return ['discovered','visited','important','danger','cognitive'].map(s=>`<option value="${s}" ${s===value?'selected':''}>${esc(STATUS[s])}</option>`).join('')}
function renderSidebar(){
  const el=document.getElementById('districtList'); if(!el)return;
  const q=atlasNormalize(atlasUi.query.trim());
  const available=Object.entries(state.districts).filter(([,d])=>!atlasLocked(d));
  const locked=Object.entries(state.districts).filter(([,d])=>atlasLocked(d));
  const matches=available.filter(([id,d])=>!q||atlasNormalize(d.name+' '+d.jp+' '+(d.tags||[]).join(' ')).includes(q));
  el.innerHTML=matches.map(([id,d])=>`<div class="jump-row"><button type="button" class="jump ${state.selected===id?'active':''}" data-atlas-district="${esc(id)}" ${state.selected===id?'aria-current="true"':''}><i class="atlas-dot" style="--marker:${ATLAS_COLORS[d.state]||ATLAS_COLORS.discovered}"></i><span class="atlas-jump-copy">${esc(d.name)}<small>${esc(STATUS[d.state])} · ${(state.places[id]||[]).filter(p=>!atlasLocked(p)).length} locais</small></span><span class="badge">${esc(d.code)}</span></button></div>`).join('');
  if(q){
    const placeMatches=available.flatMap(([did,d])=>(state.places[did]||[]).filter(p=>!atlasLocked(p)&&atlasNormalize(p.name+' '+p.type).includes(q)).map(p=>({did,d,p})));
    el.innerHTML+=placeMatches.map(({did,d,p})=>`<button type="button" class="jump" data-atlas-district="${esc(did)}" data-atlas-place="${esc(p.id)}"><span class="atlas-jump-copy">${esc(p.name)}<small>${esc(d.name)} · ${esc(p.type)}</small></span><span>↗</span></button>`).join('');
    if(!matches.length&&!placeMatches.length)el.innerHTML='<div class="atlas-empty">Nenhum local revelado corresponde à busca.</div>';
  }else if(locked.length){
    el.innerHTML+=`<details class="atlas-locked"><summary>${locked.length} áreas não reveladas</summary>${locked.map(([id])=>`<button class="jump" type="button" data-atlas-unlock="${esc(id)}"><span>Área não identificada</span><span class="badge">⌑</span></button>`).join('')}</details>`;
  }
  el.querySelectorAll('[data-atlas-district]').forEach(b=>b.onclick=()=>{
    if(b.dataset.atlasPlace)openPlaceInSubmap(b.dataset.atlasDistrict,b.dataset.atlasPlace);
    else if(state.mapMode==='local')setMapMode('local',b.dataset.atlasDistrict);
    else selectDistrict(b.dataset.atlasDistrict);
    document.querySelector('.map-layout').classList.remove('atlas-sidebar-open');
  });
  el.querySelectorAll('[data-atlas-unlock]').forEach(b=>b.onclick=()=>openUnlockGate('district',b.dataset.atlasUnlock));
}
function renderDossier(){
  const id=state.selected,d=state.districts[id],el=document.getElementById('dossier'); if(!d||!el)return;
  if(atlasLocked(d)){
    el.innerHTML='<h2>Área não revelada</h2><p class="atlas-copy">O registro deste distrito ainda está bloqueado.</p><button type="button" class="atlas-open" id="atlasUnlockDistrict">Inserir senha</button>';
    document.getElementById('atlasUnlockDistrict').onclick=()=>openUnlockGate('district',id);return;
  }
  const places=state.places[id]||[];
  el.innerHTML=`${atlasPhotoHTML(ATLAS_DISTRICT_PHOTO[id],d.name)}<h2>${esc(d.name)}</h2><div class="jp">${esc(d.jp)} / ${esc(d.code)}</div><div class="atlas-tagline">${(d.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div><p class="atlas-copy">${esc(d.summary)}</p><button type="button" class="atlas-open" id="openLocalMapBtn">Explorar distrito <span>↗</span></button><label class="atlas-status">Sua marcação <select id="atlasDistrictStatus" aria-label="Status do distrito">${atlasStatusOptions(d.state)}</select></label><div class="atlas-meta"><div><small>MOVIMENTO</small><b>${esc(d.crowd)}</b></div><div><small>CENA MUSICAL</small><b>${esc(d.music)}</b></div><div><small>ATIVIDADE COGNITIVA</small><b>${Number(d.activity)||0}%</b></div><div><small>LOCAIS REVELADOS</small><b>${places.filter(p=>!atlasLocked(p)).length} / ${places.length}</b></div></div>${cognitiveDistrictReadout(d)}<div class="section-title">LOCAIS DO DISTRITO</div><div id="atlasDossierPlaces"></div><p class="atlas-photo-note">Fotos de referência; datas e aparência podem diferir da campanha.</p>${atlasMasterDossier(id,d)}`;
  const list=document.getElementById('atlasDossierPlaces');
  places.forEach((p,i)=>{
    const locked=atlasLocked(p),b=document.createElement('button');b.type='button';b.className='atlas-place-link';
    b.innerHTML=`<span class="atlas-number">${String(i+1).padStart(2,'0')}</span><span><b>${locked?'Local não revelado':esc(p.name)}</b><small>${locked?'Inserir senha':esc(p.type)+' · '+esc(STATUS[p.state])}</small></span><span>↗</span>`;
    b.onclick=()=>locked?openUnlockGate('place',p.id):openPlaceInSubmap(id,p.id);list.appendChild(b);
  });
  document.getElementById('openLocalMapBtn').onclick=()=>{submapFocusPlaceId=null;setMapMode('local',id)};
  document.getElementById('atlasDistrictStatus').onchange=e=>setDistrictPlayerStatus(id,e.target.value);
  if(state.mode==='master'){
    document.getElementById('districtNote').oninput=e=>{d.note=e.target.value;saveState(true)};
    document.getElementById('cycleDistrictBtn').onclick=()=>cycleDistrict(id);
    document.getElementById('toggleDistrictLockBtn').onclick=()=>toggleDistrictLock(id);
  }
}
function atlasGeometry(places){
  const width=900,height=Math.max(620,Math.ceil(places.length/4)*155+160);
  const coords=places.map(p=>atlasLocked(p)?null:PUBLIC_PLACE_COORDS[p.id]||null),known=coords.filter(Boolean);
  const lats=known.map(c=>c[0]),lngs=known.map(c=>c[1]);
  const midLat=known.length?(Math.min(...lats)+Math.max(...lats))/2:0,midLng=known.length?(Math.min(...lngs)+Math.max(...lngs))/2:0;
  const rangeLat=known.length?Math.max(...lats)-Math.min(...lats):0,rangeLng=known.length?(Math.max(...lngs)-Math.min(...lngs))*.81:0;
  const k=Math.min(500/Math.max(rangeLng,.001),360/Math.max(rangeLat,.001));
  const positions=places.map((p,i)=>{
    if(coords[i]&&places.length<=12)return {x:450+(coords[i][1]-midLng)*.81*k,y:height/2-(coords[i][0]-midLat)*k};
    const cols=Math.min(4,places.length),rows=Math.ceil(places.length/cols);
    return {x:width/(cols+1)*(i%cols+1),y:height/(rows+1)*(Math.floor(i/cols)+1)};
  });
  for(let step=0;step<90;step++){
    let changed=false;
    for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
      const a=positions[i],b=positions[j],dx=b.x-a.x,dy=b.y-a.y;
      if(Math.abs(dx)<182&&Math.abs(dy)<140){
        if(Math.abs(dx)/182>Math.abs(dy)/140){const push=(182-Math.abs(dx))/2+1,dir=dx>=0?1:-1;a.x-=push*dir;b.x+=push*dir}
        else{const push=(140-Math.abs(dy))/2+1,dir=dy>=0?1:-1;a.y-=push*dir;b.y+=push*dir}changed=true;
      }
    }
    positions.forEach(p=>{p.x=Math.max(100,Math.min(width-100,p.x));p.y=Math.max(100,Math.min(height-100,p.y))});
    if(!changed)break;
  }
  // Very dense or unusually clustered custom records use evenly spaced rows.
  if(positions.some((a,i)=>positions.some((b,j)=>i<j&&Math.abs(a.x-b.x)<160&&Math.abs(a.y-b.y)<120))){
    const cols=Math.min(4,places.length);positions.forEach((p,i)=>{p.x=width/(cols+1)*(i%cols+1);p.y=100+Math.floor(i/cols)*155});
  }
  return {width,height,positions};
}
function atlasRoads(geom,name){
  const {width,height,positions}=geom;
  const blocks=Array.from({length:20},(_,i)=>`<rect class="atlas-street-block" x="${i%5*180+18}" y="${Math.floor(i/5)*155+18}" width="140" height="114" rx="10"/>`).join('');
  const path=`M 30 ${height/2} H ${width-30} M 450 30 V ${height-30} `+positions.map(p=>`M ${p.x} ${p.y} V ${height/2} H 450`).join(' ');
  return `<svg class="atlas-roads" viewBox="0 0 ${width} ${height}" aria-hidden="true">${blocks}<text class="atlas-map-word" x="450" y="${height-28}" text-anchor="middle">${esc(name.toUpperCase())}</text><path class="atlas-road-base" d="${path}"/><path class="atlas-road-line" d="${path}"/><path class="atlas-road-center" d="${path}"/></svg>`;
}
function atlasUpdateCrumb(){
  const el=document.getElementById('atlasCrumb');if(!el)return;
  const d=state.districts[state.selected];
  el.innerHTML=state.mapMode==='local'?`TOKYO <span aria-hidden="true"> / </span> <b>${esc(d?.name||'Distrito')}</b>`:'TOKYO <span aria-hidden="true"> / </span> MAPA DA CIDADE';
  document.getElementById('atlasBack').hidden=state.mapMode!=='local';
}
function setMapMode(mode,districtId=null){
  mode=mode==='local'?'local':'collage';
  const id=districtId||state.selected;
  if(!state.districts[id])return;
  if(mode==='local'&&atlasLocked(state.districts[id])){openUnlockGate('district',id);return}
  if(districtId)state.selected=id;
  const changed=atlasUi.district!==id;
  if(changed){atlasUi.localQuery='';atlasUi.type='all';submapFocusPlaceId=null;atlasUi.district=id}
  state.mapMode=mode;
  const shell=document.querySelector('.map-shell');shell.classList.remove('real-active');shell.classList.toggle('submap-active',mode==='local');
  setSubmapWorkspace(mode==='local');
  document.getElementById('atlasTokyoViewport').hidden=mode==='local';
  if(mode==='local')renderLocalSubmap(id,submapFocusPlaceId);
  else{atlasLocalCamera?.destroy();atlasLocalCamera=null;document.getElementById('subDistrictMap').replaceChildren();renderDistricts();requestAnimationFrame(()=>atlasTokyoCamera?.resize())}
  renderSidebar();renderDossier();atlasUpdateCrumb();updateCompactTaskbar();saveState(true);
}
function renderLocalSubmap(id,focusId=null){
  const panel=document.getElementById('subDistrictMap'),d=state.districts[id];if(!panel||!d)return;
  if(atlasLocked(d)){setMapMode('collage');return}
  const previous=atlasLocalCamera&&atlasLocalCamera.districtId===id?{view:{...atlasLocalCamera.view},fit:atlasLocalCamera.fitScale}:null;
  atlasLocalCamera?.destroy();atlasLocalCamera=null;atlasUi.district=id;
  const places=state.places[id]||[],geom=atlasGeometry(places);atlasUi.geometry=geom;
  const visible=places.filter(p=>!atlasLocked(p)),focus=visible.find(p=>p.id===focusId)||visible[0]||null;submapFocusPlaceId=focus?.id||null;
  panel.innerHTML=`<div class="atlas-local"><header class="atlas-local-head"><div><div class="atlas-eyebrow">ARQUIVO DE EXPLORAÇÃO / ${esc(d.code)}</div><h2>${esc(d.name)}</h2><p>${esc(d.jp)} · ${visible.length} locais revelados</p></div><div class="atlas-tabs" aria-label="Visualização do distrito"><button type="button" data-atlas-view="map" aria-pressed="${atlasUi.view==='map'}">Mapa</button><button type="button" data-atlas-view="list" aria-pressed="${atlasUi.view==='list'}">Lista</button></div></header><div class="atlas-local-grid"><section class="atlas-local-main" aria-label="Locais do distrito"><div class="atlas-local-tools"><input id="atlasLocalSearch" type="search" placeholder="Buscar neste distrito…" aria-label="Buscar neste distrito" value="${esc(atlasUi.localQuery)}"><select id="atlasLocalType" aria-label="Filtrar por tipo de local"><option value="all">Todos os tipos</option>${[...new Set(visible.map(p=>p.type))].sort().map(t=>`<option value="${esc(t)}" ${atlasUi.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div><div class="atlas-local-surface"><div id="atlasLocalViewport" class="atlas-viewport" tabindex="0" role="region" aria-label="Mapa do distrito. Arraste para mover; use mais, menos e zero para ajustar o zoom."><div id="atlasLocalWorld" class="atlas-local-world">${atlasRoads(geom,d.name)}</div></div><div class="atlas-local-caption" id="atlasLocalCaption">ESQUEMA DE LOCAIS · SEM ESCALA<br><span id="atlasLocalCount"></span></div><div class="atlas-compass" id="atlasLocalCompass"><b>↑</b>N</div><div class="map-controls" id="atlasLocalControls"><button type="button" data-local-zoom="out" aria-label="Diminuir zoom do submapa">−</button><output id="atlasLocalZoom" aria-label="Zoom do submapa">100%</output><button type="button" data-local-zoom="in" aria-label="Aumentar zoom do submapa">+</button><button type="button" class="atlas-fit" data-local-zoom="fit">Ajustar</button></div><div class="atlas-place-cards" id="atlasPlaceCards" hidden></div></div></section><aside class="atlas-local-detail" aria-label="Detalhes do local"><div id="submapFocusPanel"></div><details class="atlas-overview"><summary>Sobre ${esc(d.name)}</summary><p>${esc(d.summary)}</p><div class="atlas-tagline">${(d.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div><label class="atlas-status">Sua marcação <select id="atlasLocalDistrictStatus">${atlasStatusOptions(d.state)}</select></label></details></aside></div></div>`;
  const world=document.getElementById('atlasLocalWorld'),cards=document.getElementById('atlasPlaceCards');
  places.forEach((p,i)=>{
    const locked=atlasLocked(p),pos=geom.positions[i];
    const node=document.createElement('button');node.type='button';node.className='atlas-node';node.dataset.placeId=p.id;node.style.left=pos.x+'px';node.style.top=pos.y+'px';
    node.title=locked?'Local não revelado':p.name;
    node.setAttribute('aria-label',locked?'Local não revelado':String(i+1).padStart(2,'0')+' '+p.name+' · '+p.type);
    node.innerHTML=`<span class="atlas-node-top"><span class="atlas-node-number">${String(i+1).padStart(2,'0')}</span><span class="atlas-node-icon" aria-hidden="true">${locked?'⌑':iconSVG(p.icon||p.type)}</span><i class="atlas-dot" style="--marker:${ATLAS_COLORS[locked?'locked':p.state]||ATLAS_COLORS.discovered}"></i></span><b>${locked?'Local não revelado':esc(p.name)}</b><small>${locked?'⌑ Inserir senha':esc(p.type)}</small>`;
    node.onclick=()=>focusSubmapPlace(p.id);world.appendChild(node);
    const card=document.createElement('button');card.type='button';card.className='atlas-place-card';card.dataset.placeId=p.id;
    const photo=!locked&&atlasPhoto(p.id);
    card.innerHTML=(photo?`<img src="${esc(photo.src)}" alt="" loading="lazy" decoding="async">`:'')+`<span><b>${locked?'Local não revelado':esc(p.name)}</b><small>${locked?'Inserir senha':esc(p.type)+' · '+esc(STATUS[p.state])}</small></span>`;
    card.onclick=()=>focusSubmapPlace(p.id);cards.appendChild(card);
  });
  atlasLocalCamera=new PhobiaMapCamera.Camera(document.getElementById('atlasLocalViewport'),world,{width:geom.width,height:geom.height,onChange:percent=>{
    document.getElementById('atlasLocalZoom').textContent=percent+'%';
    panel.querySelector('[data-local-zoom="out"]').disabled=percent<=100;panel.querySelector('[data-local-zoom="in"]').disabled=percent>=400;
  }});
  atlasLocalCamera.districtId=id;
  if(previous?.fit&&atlasLocalCamera.fitScale){atlasLocalCamera.view=previous.view;atlasLocalCamera.paint()}
  panel.querySelectorAll('[data-local-zoom]').forEach(b=>b.onclick=()=>b.dataset.localZoom==='fit'?atlasLocalCamera.fit():atlasLocalCamera.zoomBy(b.dataset.localZoom==='in'?1.25:.8));
  panel.querySelectorAll('[data-atlas-view]').forEach(b=>b.onclick=()=>atlasSetLocalView(b.dataset.atlasView));
  document.getElementById('atlasLocalSearch').oninput=e=>{atlasUi.localQuery=e.target.value;atlasFilterLocal()};
  document.getElementById('atlasLocalType').onchange=e=>{atlasUi.type=e.target.value;atlasFilterLocal()};
  document.getElementById('atlasLocalDistrictStatus').onchange=e=>setDistrictPlayerStatus(id,e.target.value);
  focusSubmapPlace(submapFocusPlaceId,false);atlasSetLocalView(atlasUi.view);atlasFilterLocal();atlasUpdateCrumb();
}
function atlasSetLocalView(view){
  atlasUi.view=view==='list'?'list':'map';const map=atlasUi.view==='map';
  ['atlasLocalViewport','atlasLocalCaption','atlasLocalCompass','atlasLocalControls'].forEach(id=>{document.getElementById(id).hidden=!map});
  document.getElementById('atlasPlaceCards').hidden=map;
  document.querySelectorAll('[data-atlas-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.atlasView===atlasUi.view)));
  if(map)requestAnimationFrame(()=>atlasLocalCamera?.resize());
}
function atlasFilterLocal(){
  const q=atlasNormalize(atlasUi.localQuery),places=state.places[state.selected]||[];
  let count=0;const revealed=[];
  places.forEach(p=>{
    const locked=atlasLocked(p),show=locked?!q&&atlasUi.type==='all':(!q||atlasNormalize(p.name+' '+p.type).includes(q))&&(atlasUi.type==='all'||p.type===atlasUi.type);
    if(show){count++;if(!locked)revealed.push(p.id)}
    document.querySelectorAll('#subDistrictMap [data-place-id]').forEach(el=>{if(el.dataset.placeId===p.id)el.hidden=!show});
  });
  document.getElementById('atlasLocalCount').textContent=count?`${count} ${count===1?'LOCAL':'LOCAIS'} NA VISUALIZAÇÃO`:'NENHUM LOCAL ENCONTRADO';
  if(!revealed.includes(submapFocusPlaceId))focusSubmapPlace(revealed[0]||null,false);
  const cards=document.getElementById('atlasPlaceCards');cards.querySelector('.atlas-empty')?.remove();
  if(!count)cards.insertAdjacentHTML('beforeend','<div class="atlas-empty">Nenhum local encontrado. Tente outro nome ou tipo.</div>');
}
function focusSubmapPlace(pid,center=true){
  const places=state.places[state.selected]||[],p=places.find(x=>x.id===pid)||null;
  if(p&&atlasLocked(p)){openUnlockGate('place',p.id);return}
  submapFocusPlaceId=p?.id||null;
  document.querySelectorAll('#subDistrictMap [data-place-id]').forEach(el=>{const active=el.dataset.placeId===submapFocusPlaceId;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active))});
  const panel=document.getElementById('submapFocusPanel');if(!panel)return;
  if(!p){panel.innerHTML='<div class="atlas-empty">Selecione um local revelado para ver seus detalhes.</div>';return}
  const exact=atlasPhoto(p.id),photoId=exact?p.id:ATLAS_DISTRICT_PHOTO[state.selected];
  const coords=PUBLIC_PLACE_COORDS[p.id];
  panel.innerHTML=`${atlasPhotoHTML(photoId,p.name)}${!exact?'<p class="atlas-photo-note">Referência do distrito. Este local não possui uma foto específica.</p>':''}<div class="atlas-focus-kicker">LOCAL ${String(places.indexOf(p)+1).padStart(2,'0')} / ${esc(state.districts[state.selected].name)}</div><h3>${esc(p.name)}</h3><div class="atlas-focus-meta">${esc(p.type)} · ${esc(STATUS[p.state]||p.state)}</div><p class="atlas-copy">${esc(p.desc||'Ainda sem descrição.')}</p><div class="atlas-detail-links">${coords?`<a href="https://www.google.com/maps/search/?api=1&query=${coords.join(',')}" target="_blank" rel="noopener noreferrer">Localização real ↗</a>`:''}</div><p class="atlas-photo-note">${atlasPhoto(photoId)?.date&&atlasPhoto(photoId).date!=='Data não informada'?'Fotografia de '+esc(atlasPhoto(photoId).date)+'.':'Fotografia de referência, sem data confirmada.'} A aparência pode diferir do ano da história.</p><label class="atlas-note-label" for="atlasPlaceNote">ANOTAÇÕES DE EXPLORAÇÃO</label><textarea id="atlasPlaceNote" class="atlas-note" maxlength="4000" placeholder="Pistas, encontros, lembretes…">${esc(state.mapNotes?.[p.id]||'')}</textarea>${state.mode==='master'?`<div class="local-map-actions"><button type="button" id="atlasPlaceStatus">ALTERAR STATUS</button><button type="button" id="atlasPlaceLock">${p.state==='locked'?'LIBERAR':'TRAVAR'}</button><button type="button" id="atlasPlacePassword">SENHA</button></div>`:''}`;
  document.getElementById('atlasPlaceNote').oninput=e=>{state.mapNotes ||= {};state.mapNotes[p.id]=e.target.value;saveState(true)};
  if(state.mode==='master'){
    document.getElementById('atlasPlaceStatus').onclick=()=>cyclePlace(state.selected,p.id);
    document.getElementById('atlasPlaceLock').onclick=()=>togglePlaceLock(state.selected,p.id);
    document.getElementById('atlasPlacePassword').onclick=()=>setUnlockPassword('place',p.id);
  }
  if(center){const pos=atlasUi.geometry?.positions[places.indexOf(p)];if(pos)atlasLocalCamera?.centerOn(pos.x,pos.y)}
}
function openPlaceInSubmap(did,pid){
  if(!state.districts[did])return;
  if(atlasLocked(state.districts[did])){openUnlockGate('district',did);return}
  const p=(state.places[did]||[]).find(p=>p.id===pid);
  if(p&&atlasLocked(p)){openUnlockGate('place',p.id);return}
  setMapMode('local',did);if(pid)focusSubmapPlace(pid);
}
function bindAtlasExplorer(){
  atlasTokyoCamera=new PhobiaMapCamera.Camera(document.getElementById('atlasTokyoViewport'),document.getElementById('mapSvg'),{width:1000,height:700,disabled:()=>state.mapMode==='local'||cognitivePlacementMode||!!cognitiveDraggingId,onChange:percent=>{
    document.getElementById('atlasTokyoZoom').textContent=percent+'%';document.getElementById('zoomIn').disabled=percent>=400;document.getElementById('zoomOut').disabled=percent<=100;
  }});
  document.getElementById('zoomIn').onclick=()=>atlasTokyoCamera.zoomBy(1.25);document.getElementById('zoomOut').onclick=()=>atlasTokyoCamera.zoomBy(.8);document.getElementById('resetView').onclick=()=>atlasTokyoCamera.fit();
  document.getElementById('atlasSidebarToggle').setAttribute('aria-expanded',String(!matchMedia('(max-width:900px)').matches));
  document.getElementById('atlasDistrictSearch').oninput=e=>{atlasUi.query=e.target.value;renderSidebar()};
  document.getElementById('atlasSidebarToggle').onclick=()=>{
    const layout=document.querySelector('.map-layout');layout.classList.toggle(matchMedia('(max-width:900px)').matches?'atlas-sidebar-open':'atlas-sidebar-hidden');
    document.getElementById('atlasSidebarToggle').setAttribute('aria-expanded',String(matchMedia('(max-width:900px)').matches?layout.classList.contains('atlas-sidebar-open'):!layout.classList.contains('atlas-sidebar-hidden')));
  };
  document.getElementById('atlasBack').onclick=()=>setMapMode('collage');
  const expand=document.getElementById('atlasExpand');
  const toggleExpand=()=>{const on=document.getElementById('mapPage').classList.toggle('atlas-expanded');expand.textContent=on?'Reduzir':'Expandir';expand.setAttribute('aria-pressed',String(on))};
  expand.onclick=toggleExpand;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('atlasPhotoDialog').open&&document.getElementById('mapPage').classList.contains('atlas-expanded'))toggleExpand()});
  const dialog=document.getElementById('atlasPhotoDialog');
  document.getElementById('atlasPhotoClose').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  document.getElementById('mapPage').addEventListener('click',e=>{
    const b=e.target.closest('[data-atlas-photo]');if(!b)return;const p=atlasPhoto(b.dataset.atlasPhoto);if(!p)return;
    document.getElementById('atlasPhotoTitle').textContent=p.caption;document.getElementById('atlasPhotoFull').src=p.src;document.getElementById('atlasPhotoFull').alt=p.caption;
    document.getElementById('atlasPhotoCredit').innerHTML=`${esc(p.date||'Data não informada')} · ${esc(p.author)} · <a href="${esc(p.licenseUrl||p.source)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a> · <a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">Ver original</a><br>Referência visual; a fotografia pode ser de outra época. Imagem redimensionada e convertida para WebP.`;
    dialog.showModal();
  });
  document.getElementById('mapPage').addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.closest('.atlas-photo')?.classList.add('is-missing')},true);
  atlasUpdateCrumb();
}

function atlasMasterDossier(id,d){
  return `${state.mode==='master'?`<div class="master-only">
      <div class="section-title">MESTRE</div>
      ${getDistrictKeyRecord(id)?`<div class="district-password-master">
        <div><small>CHAVE EMOCIONAL / ${esc(d.code)}</small><strong>${esc(getDistrictKeyRecord(id).answer)}</strong><span>${districtUnlockStatus(id)}</span></div>
        <small>${districtHasCustomKey(id)?'A senha personalizada substitui a palavra padrão; use DEFINIR SENHA para alterá-la.':'Palavra padrão do distrito. Ela funciona caso este local seja bloqueado novamente.'}</small>
        ${districtHasCustomKey(id)?`<button type="button" class="tiny-btn" onclick="restoreDistrictPassword('${id}')">↺ SENHA PADRÃO</button>`:''}
      </div>`:''}
      <div class="master-note"><textarea id="districtNote" placeholder="Nota privada...">${esc(d.note||'')}</textarea></div>
      <div class="local-map-actions" style="margin-top:8px">
        <button class="primary" id="toggleDistrictLockBtn">${d.state==='locked'?'DESBLOQUEAR ÁREA':'BLOQUEAR ÁREA'}</button>
        <button class="primary" id="cycleDistrictBtn">ALTERAR STATUS DO DISTRITO</button>
        <button class="primary" type="button" onclick="setUnlockPassword('district','${id}')">DEFINIR SENHA</button>
      </div>
    </div>`:''}`;
}

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {constrain,anchoredZoom,Camera}=require('../assets/map-camera.js');

test('zoom keeps the map point underneath the cursor, without accumulating drift',()=>{
  let view={x:-100,y:-80,k:1.5};const anchor={x:275,y:220};
  const point={x:(anchor.x-view.x)/view.k,y:(anchor.y-view.y)/view.k};
  for(let i=0;i<500;i++){
    view=anchoredZoom(view,3.75,anchor);view=anchoredZoom(view,1.5,anchor);
  }
  assert.ok(Math.abs((anchor.x-view.x)/view.k-point.x)<1e-10);
  assert.ok(Math.abs((anchor.y-view.y)/view.k-point.y)<1e-10);
});
test('pan cannot lose the map and fit centers letterboxed content',()=>{
  assert.deepEqual(constrain({x:9000,y:-9000,k:1},{width:1000,height:700,vw:800,vh:500}),{k:1,x:0,y:-200});
  assert.deepEqual(constrain({x:9000,y:-9000,k:.5},{width:1000,height:700,vw:800,vh:500}),{k:.5,x:150,y:75});
});
test('pinch uses both the moving midpoint and the relative distance',()=>{
  const result=anchoredZoom({x:0,y:0,k:1},2,{x:200,y:100},{x:240,y:130});
  assert.deepEqual(result,{k:2,x:-160,y:-70});
});
test('camera resize preserves relative zoom and ignores hidden panels',()=>{
  global.ResizeObserver=class{observe(){}disconnect(){}};
  const viewport={clientWidth:900,clientHeight:630,addEventListener(){},classList:{add(){},remove(){}}};
  const content={style:{}};
  const camera=new Camera(viewport,content,{width:1000,height:700});
  camera.zoomBy(2);assert.equal(camera.view.k/camera.fitScale,2);
  viewport.clientWidth=450;viewport.clientHeight=315;camera.resize();
  assert.equal(camera.view.k/camera.fitScale,2);assert.equal(camera.view.x,-225);
  viewport.clientWidth=0;camera.resize();assert.equal(camera.view.k,.9);
  viewport.clientWidth=450;camera.fit();assert.equal(camera.view.k,.45);assert.equal(camera.view.x,0);
  camera.zoomBy(1000);assert.equal(camera.view.k/camera.fitScale,4);
  camera.zoomBy(.0001);assert.equal(camera.view.k/camera.fitScale,1);
  camera.destroy();
});
const source=fs.readFileSync(require.resolve('../index.html'),'utf8');
const defaults=source.slice(source.indexOf('const DEFAULT ='),source.indexOf('const SHAPES='));
const coords=source.slice(source.indexOf('const PUBLIC_PLACE_COORDS='),source.indexOf('const PT_DISTRICT_LABELS='));
const context=vm.createContext({window:{},console});
vm.runInContext(defaults+coords+'\nlet state=JSON.parse(JSON.stringify(DEFAULT));',context);
vm.runInContext(fs.readFileSync(require.resolve('../assets/map-explorer.js'),'utf8'),context);
test('all districts and 40 custom places fit without overlapping cards',()=>{
  vm.runInContext(`
    const checkGeometry=places=>{
      const g=atlasGeometry(places);
      if(g.positions.length!==places.length)throw Error('count');
      g.positions.forEach((p,i)=>{
        if(p.x<90||p.x>g.width-90||p.y<70||p.y>g.height-70)throw Error('bounds');
        g.positions.forEach((q,j)=>{if(i<j&&Math.abs(q.x-p.x)<158&&Math.abs(q.y-p.y)<120)throw Error('overlap '+i+','+j)});
      });
    };
    Object.values(DEFAULT.places).forEach(checkGeometry);
    for(let n=0;n<=40;n++)checkGeometry(Array.from({length:n},(_,i)=>({id:'custom'+i,state:'discovered'})));
  `,context);
});
test('player search and dossier do not disclose locked names or photographs',()=>{
  const elements={};
  context.document={getElementById:id=>elements[id]||=( {innerHTML:'',querySelectorAll:()=>[]} )};
  vm.runInContext("state.selected='akihabara';renderDossier();atlasUi.query='Akihabara';renderSidebar()",context);
  assert.ok(!elements.dossier.innerHTML.includes('<img'));
  assert.ok(!elements.dossier.innerHTML.includes('Electric Town'));
  assert.ok(!elements.dossier.innerHTML.includes('Akihabara'));
  assert.ok(elements.districtList.innerHTML.includes('Nenhum local revelado'));
});
test('image manifest covers every district and all bundled files are nonempty',()=>{
  vm.runInContext(fs.readFileSync(require.resolve('../assets/map-photos.js'),'utf8'),context);
  const ids=vm.runInContext('Object.values(ATLAS_DISTRICT_PHOTO)',context);
  for(const id of ids){const p=context.window.PHOBIA_MAP_PHOTOS[id];assert.ok(p,id);assert.ok(p.author);assert.ok(p.source.startsWith('https://commons.wikimedia.org/'));assert.ok(p.license);assert.ok(fs.statSync(require('node:path').join(__dirname,'..',p.src)).size>1000)}
});
test('old backups and a JSON round trip preserve discoveries, notes and custom places',()=>{
  const merge=source.slice(source.indexOf('function mergeDefaults('),source.indexOf('function loadState('));
  vm.runInContext('function clone(x){return JSON.parse(JSON.stringify(x))}\n'+merge,context);
  const result=vm.runInContext(`(()=>{
    const saved=clone(DEFAULT);saved.districts.akihabara.state='visited';
    saved.places.shibuya.push({id:'custom-cafe',name:'Café da mesa',state:'important',note:'nota privada'});
    saved.charSheet.profile.name='Teste de migração';saved.charSheet.photoData='data:image/png;base64,cGhvdG8=';
    delete saved.mapNotes;
    const old=mergeDefaults(DEFAULT,JSON.parse(JSON.stringify(saved)));
    old.mapNotes={'custom-cafe':'Encontro às 18h'};
    return mergeDefaults(DEFAULT,JSON.parse(JSON.stringify(old)));
  })()`,context);
  assert.equal(result.districts.akihabara.state,'visited');
  assert.equal(result.places.shibuya.at(-1).note,'nota privada');
  assert.equal(result.charSheet.profile.name,'Teste de migração');
  assert.equal(result.charSheet.photoData,'data:image/png;base64,cGhvdG8=');
  assert.equal(result.mapNotes['custom-cafe'],'Encontro às 18h');
});

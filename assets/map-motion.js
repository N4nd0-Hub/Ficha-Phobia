/* ==========================================================
   PERSONA // PHOBIA — map-motion.js
   Movimento do mapa de Tokyo. Sem dependências (usa a Web
   Animations API do próprio navegador) e sem mexer na lógica
   existente: só OBSERVA o DOM que o renderDistricts() e o
   renderDossier() já geram.

   O que faz:
   1. Entrada do mapa: título "bate" na tela, distritos surgem
      do centro para fora, rotas se desenham.
   2. Distrito selecionado: carimbo + onda.
   3. Distrito bloqueado: tremida ao clicar.
   4. Dossiê: itens entram em cascata e % sobe contando.
   5. Troca de período / camada: wipe diagonal rosa + ciano.
   6. Câmera: ao selecionar um distrito, o mapa voa até ele;
      "Ajustar" volta voando. Fundo com parallax (profundidade).

   Liga/desliga pelo console ou por um script seu:
     window.PHOBIA_MOTION = { flyOnSelect:false, parallax:false };
   ========================================================== */
(function(){
  'use strict';

  var EASE_OUT  = 'cubic-bezier(.22,1,.36,1)';
  var EASE_BACK = 'cubic-bezier(.34,1.56,.64,1)';
  var EASE_SNAP = 'cubic-bezier(.7,0,.2,1)';
  var SVGNS     = 'http://www.w3.org/2000/svg';

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced(){ return reduceQuery.matches; }
  function $(sel, root){ return (root || document).querySelector(sel); }
  function canAnimate(el){ return el && typeof el.animate === 'function'; }

  /* ---------- identificação do distrito ---------- */
  var BUTTONS = '.district-art-button, .district-placeholder-button';

  function districtId(g){
    var img = g.querySelector('image');
    if(img){
      var href = img.getAttribute('href') || '';
      var m = href.match(/([^\/]+?)\.(webp|png|jpe?g|svg)/i);
      if(m) return m[1].toLowerCase();
    }
    return (g.getAttribute('aria-label') || '').toLowerCase();
  }

  /* ==========================================================
     1. ENTRADA DO MAPA
     ========================================================== */
  var INTRO_STEP     = 70;   // ms entre um distrito e o próximo
  var INTRO_DURATION = 640;  // ms de cada distrito
  var introStart     = 0;    // quando a entrada atual começou
  var introTotal     = 0;    // duração total da entrada atual
  var introArmed     = true; // true = próxima renderização anima

  function mapVisible(){
    var page = $('#mapPage');
    return !!page && page.classList.contains('active');
  }

  /* ordena os distritos do centro para fora */
  function orderFromCenter(buttons){
    var boxes = buttons.map(function(g){
      try{
        var b = g.getBBox();
        return { g:g, x:b.x + b.width/2, y:b.y + b.height/2 };
      }catch(e){
        return { g:g, x:0, y:0 };
      }
    });
    var cx = boxes.reduce(function(s,b){ return s + b.x; }, 0) / (boxes.length || 1);
    var cy = boxes.reduce(function(s,b){ return s + b.y; }, 0) / (boxes.length || 1);
    boxes.forEach(function(b){ b.d = Math.hypot(b.x - cx, b.y - cy); });
    boxes.sort(function(a,b){ return a.d - b.d; });
    return boxes.map(function(b){ return b.g; });
  }

  /* elapsed > 0 = "pular" para o meio da animação (usado quando o
     site re-renderiza os distritos logo depois do primeiro desenho) */
  function runIntro(elapsed){
    elapsed = elapsed || 0;
    var dg = $('#districts');
    if(!dg || reduced()) return;

    var buttons = [].slice.call(dg.querySelectorAll(BUTTONS));
    var ordered = orderFromCenter(buttons);
    var seed = [-14, 10, -8, 16, -11, 7, -17, 12, -6, 15, -10, 9];

    ordered.forEach(function(g, i){
      if(!canAnimate(g)) return;
      g.animate(
        [{ opacity:0, transform:'translateY(22px) scale(.35) rotate(' + seed[i % seed.length] + 'deg)' }],
        { duration:INTRO_DURATION, delay:i * INTRO_STEP - elapsed, easing:EASE_BACK, fill:'backwards' }
      );
    });

    var districtsEnd = ordered.length * INTRO_STEP + INTRO_DURATION;

    /* rotas: o traço "se desenha" */
    var linkLayer = $('#districtLinks');
    if(linkLayer){
      var drawn = linkLayer.querySelectorAll('.district-link-outer, .district-link-inner, .district-link-edge');
      [].forEach.call(drawn, function(p, i){
        if(!canAnimate(p) || typeof p.getTotalLength !== 'function') return;
        var routeIndex = Math.floor(i / 3);
        p.setAttribute('pathLength', '1');
        p.style.strokeDasharray = '1 1';
        var a = p.animate(
          [{ strokeDashoffset:1 }, { strokeDashoffset:0 }],
          { duration:850, delay:200 + routeIndex * 130 - elapsed, easing:EASE_OUT, fill:'backwards' }
        );
        var clean = function(){ p.removeAttribute('pathLength'); p.style.strokeDasharray = ''; };
        a.onfinish = clean; a.oncancel = clean;
      });

      [].forEach.call(linkLayer.querySelectorAll('.district-link-lane'), function(p, i){
        if(canAnimate(p)) p.animate([{ opacity:0 }],
          { duration:500, delay:700 + Math.floor(i) * 90 - elapsed, easing:EASE_OUT, fill:'backwards' });
      });

      [].forEach.call(linkLayer.querySelectorAll('.district-link-node'), function(c, i){
        if(canAnimate(c)) c.animate([{ transform:'scale(0)', opacity:0 }],
          { duration:420, delay:350 + i * 45 - elapsed, easing:EASE_BACK, fill:'backwards' });
      });
    }

    /* título TOKYO */
    var title = $('#tokyoMapTitle');
    if(canAnimate(title)){
      title.animate(
        [{ opacity:0, transform:'translateX(-140px) skewX(-14deg)' }],
        { duration:720, delay:-elapsed, easing:EASE_OUT, fill:'backwards' }
      );
    }

    introStart = performance.now() - elapsed;
    introTotal = Math.max(districtsEnd, 1500);
  }

  /* ==========================================================
     2. SELEÇÃO / 3. BLOQUEADO
     ========================================================== */
  var lastSelected = null;

  function stampSelected(g){
    if(!canAnimate(g)) return;
    g.animate(
      [
        { transform:'scale(1) rotate(0deg)' },
        { transform:'scale(1.1) rotate(-1.8deg)', offset:.35 },
        { transform:'scale(1) rotate(0deg)' }
      ],
      { duration:520, easing:EASE_OUT }
    );

    var hit = g.querySelector('.district-art-hit, .district-placeholder-card');
    if(!hit) return;
    var ring = document.createElementNS(SVGNS, 'rect');
    ['x','y','width','height','rx'].forEach(function(k){
      var v = hit.getAttribute(k); if(v !== null) ring.setAttribute(k, v);
    });
    ring.setAttribute('class', 'pm-ripple');
    g.appendChild(ring);
    var a = ring.animate(
      [{ transform:'scale(1)', opacity:.9 }, { transform:'scale(1.28)', opacity:0 }],
      { duration:650, easing:EASE_OUT, fill:'forwards' }
    );
    a.onfinish = function(){ ring.remove(); };
  }

  function shake(g){
    if(!canAnimate(g)) return;
    g.animate(
      [
        { transform:'translateX(0)' },
        { transform:'translateX(-7px) rotate(-1deg)', offset:.15 },
        { transform:'translateX(6px) rotate(.8deg)',  offset:.35 },
        { transform:'translateX(-4px)',                offset:.55 },
        { transform:'translateX(2px)',                 offset:.78 },
        { transform:'translateX(0)' }
      ],
      { duration:420, easing:'ease-out' }
    );
  }

  document.addEventListener('click', function(e){
    if(reduced()) return;
    var g = e.target.closest && e.target.closest('#districts .district-art-button.locked');
    if(g) shake(g);
  }, true);

  /* ==========================================================
     OBSERVA #districts (o site recria tudo a cada renderDistricts)
     ========================================================== */
  var districtsTimer = 0;
  var selectionIntent = null;

  function rememberDistrictPick(e){
    if(e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    var target = e.target;
    var marker = target.closest && target.closest('#districts :is(' + BUTTONS + ')');
    var button = e.type === 'click' && target.closest &&
      target.closest('#districtList [data-atlas-district]:not([data-atlas-place])');
    if(!button && (!marker || marker.classList.contains('locked'))) return;
    selectionIntent = { id:button ? button.dataset.atlasDistrict : districtId(marker), event:e };
    onDistrictsChanged();
  }

  function onDistrictsChanged(){
    cancelAnimationFrame(districtsTimer);
    districtsTimer = requestAnimationFrame(function(){
      patchCamera(tokyoCam());
      var intent = selectionIntent;
      selectionIntent = null;
      var dg = $('#districts');
      if(!dg || !dg.children.length || !mapVisible()) return;

      var now = performance.now();
      var withinIntro = introStart && (now - introStart) < introTotal;
      var sel = dg.querySelector('.selected');
      var id = sel ? districtId(sel) : null;
      var picked = intent && id === intent.id &&
        (intent.event.type !== 'click' || !intent.event.defaultPrevented);

      if(introArmed){
        introArmed = false;
        if(!picked) runIntro(0);
        lastSelected = id;
      }
      if(withinIntro && !picked && id === lastSelected){
        runIntro(now - introStart);
        return;
      }

      if(id && (picked || id !== lastSelected) && !reduced() &&
          sel && !sel.classList.contains('locked') && cameraAvailable(tokyoCam())){
        introStart = 0;
        stampSelected(sel);
        flyToDistrict(sel);
      }
      lastSelected = id;
    });
  }

  /* ==========================================================
     4. DOSSIÊ
     ========================================================== */
  var lastDossierSig = '';

  function dossierSignature(root){
    var h = root.querySelector('h1,h2,h3,.dossier-title,.district-name');
    return (h ? h.textContent : root.textContent || '').trim().slice(0, 80);
  }

  function countUp(el){
    var m = (el.textContent || '').trim().match(/^(\d+)%$/);
    if(!m || !el.firstChild || el.firstChild.nodeType !== 3) return;
    var target = parseInt(m[1], 10), t0 = performance.now(), dur = 900, node = el.firstChild;
    (function tick(t){
      var k = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
      node.nodeValue = Math.round(target * eased) + '%';
      if(k < 1 && node.parentNode) requestAnimationFrame(tick);
      else node.nodeValue = target + '%';
    })(t0);
  }

  function onDossierChanged(){
    var root = $('#dossier');
    if(!root || reduced()) return;
    var sig = dossierSignature(root);
    if(!sig || sig === lastDossierSig) return;
    lastDossierSig = sig;

    var kids = [].slice.call(root.children);
    if(kids.length === 1) kids = [].slice.call(kids[0].children);
    kids.slice(0, 14).forEach(function(el, i){
      if(canAnimate(el)) el.animate(
        [{ opacity:0, transform:'translateY(24px)' }],
        { duration:520, delay:i * 45, easing:EASE_OUT, fill:'backwards' }
      );
    });

    [].forEach.call(root.querySelectorAll('*'), function(el){
      if(el.children.length === 0) countUp(el);
    });
  }

  /* ==========================================================
     5. WIPE DIAGONAL (período / camada)
     ========================================================== */
  var P_HIDE  = 'polygon(-60% 0,-60% 0,-90% 100%,-90% 100%)';
  var P_COVER = 'polygon(-10% 0,130% 0,100% 100%,-40% 100%)';
  var P_EXIT  = 'polygon(130% 0,130% 0,100% 100%,100% 100%)';
  var wipe = null;

  function ensureWipe(){
    if(wipe) return wipe;
    var shell = $('.map-shell');
    if(!shell) return null;
    var box = document.createElement('div');
    box.className = 'pm-wipe';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<div class="pm-wipe__b"></div><div class="pm-wipe__a"></div><div class="pm-wipe__label"></div>';
    shell.appendChild(box);
    wipe = {
      box:box,
      a:box.querySelector('.pm-wipe__a'),
      b:box.querySelector('.pm-wipe__b'),
      label:box.querySelector('.pm-wipe__label'),
      busy:false
    };
    return wipe;
  }

  function playWipe(text){
    var w = ensureWipe();
    if(!w || w.busy || reduced() || !canAnimate(w.a)) return;
    w.busy = true;
    w.label.textContent = text || '';

    var frames = [
      { clipPath:P_HIDE,  easing:EASE_SNAP },
      { clipPath:P_COVER, offset:.42, easing:EASE_OUT },
      { clipPath:P_EXIT }
    ];
    var opt = { duration:780, fill:'none' };

    w.b.animate(frames, opt);
    var main = w.a.animate(frames, { duration:780, delay:70, fill:'none' });

    w.label.animate(
      [
        { opacity:0, transform:'translateX(-60px) skewX(-12deg) rotate(-3deg)' },
        { opacity:1, transform:'translateX(0) skewX(-12deg) rotate(-3deg)', offset:.45 },
        { opacity:1, transform:'translateX(0) skewX(-12deg) rotate(-3deg)', offset:.62 },
        { opacity:0, transform:'translateX(60px) skewX(-12deg) rotate(-3deg)' }
      ],
      { duration:780, delay:70, easing:'ease-out', fill:'none' }
    );
    main.onfinish = main.oncancel = function(){ w.busy = false; };
  }

  /* captura = roda ANTES do clique do botão, então .active ainda é o estado antigo */
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-time], #realityBtn, #cognitionBtn');
    if(!b || b.classList.contains('active')) return;
    playWipe((b.textContent || '').trim());
  }, true);

  /* ==========================================================
     6. CÂMERA (usa a PhobiaMapCamera já existente, sem alterá-la)
     ========================================================== */
  function opts(){ return window.PHOBIA_MOTION || {}; }

  function tokyoCam(){
    try{ return (typeof atlasTokyoCamera !== 'undefined' && atlasTokyoCamera) || null; }
    catch(e){ return null; }
  }

  var flight = null;
  function cancelFlight(){
    if(flight){ cancelAnimationFrame(flight.raf); flight = null; }
  }

  function cameraAvailable(cam){
    return !!(cam && cam.fitScale > 0 && cam.vw > 0 && cam.vh > 0 &&
      !cam.viewport.hidden && mapVisible() && !cam.options?.disabled?.());
  }

  /* voa até o ponto (cx,cy) em unidades do mapa, com zoom k1 */
  function flyTo(cam, cx, cy, k1, duration){
    cancelFlight();
    if(!cameraAvailable(cam) || reduced() || opts().flyOnSelect === false ||
        ![cx,cy,k1].every(Number.isFinite)) return;
    var v0 = cam.view, k0 = v0.k;
    k1 = cam.limitScale(k1);
    var c0 = { x:(cam.vw/2 - v0.x) / k0, y:(cam.vh/2 - v0.y) / k0 };
    var dist = Math.hypot(cx - c0.x, cy - c0.y);
    var arc  = Math.min(.2, dist / 1400);             // leve "recuo" no meio do voo
    var dur  = duration || (750 + Math.min(450, dist * .7));
    var ln0 = Math.log(k0), ln1 = Math.log(k1);
    var t0 = performance.now();
    var f = { raf:0, vw:cam.vw, vh:cam.vh };
    flight = f;
    (function step(now){
      if(flight !== f) return;
      if(!cameraAvailable(cam) || cam.vw !== f.vw || cam.vh !== f.vh ||
          reduced() || opts().flyOnSelect === false){ cancelFlight(); return; }
      var t = Math.min(1, (now - t0) / dur);
      var e = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;   // power3.inOut
      var k = Math.exp(ln0 + (ln1 - ln0) * e) * (1 - arc * Math.sin(Math.PI * e));
      k = Math.max(cam.fitScale, Math.min(cam.fitScale * 4, k));
      var x = c0.x + (cx - c0.x) * e, y = c0.y + (cy - c0.y) * e;
      cam.view = { k:k, x:cam.vw/2 - x*k, y:cam.vh/2 - y*k };
      cam.paint();
      if(t < 1) f.raf = requestAnimationFrame(step); else flight = null;
    })(t0);
  }

  function flyToDistrict(g){
    var cam = tokyoCam();
    if(!cameraAvailable(cam) || reduced() || opts().flyOnSelect === false) return;
    var b; try{ b = g.getBBox(); }catch(e){ return; }
    if(!b.width || !b.height) return;
    var k1 = Math.min(cam.vw / (b.width * 2.1), cam.vh / (b.height * 2.1));
    k1 = Math.min(cam.fitScale * 4, Math.max(cam.limitScale(k1), cam.view.k));
    flyTo(cam, b.x + b.width/2, b.y + b.height/2, k1);
  }

  /* fundo com parallax: acompanha o arraste/zoom, só que bem mais devagar */
  function applyParallax(cam){
    var bd = $('#mapBackdrop');
    if(!bd || !cam.fitScale) return;
    if(reduced() || opts().parallax === false || cam.viewport.hidden){
      bd.style.transform = ''; return;
    }
    var v = cam.view;
    var offX = v.x - (cam.vw - cam.width  * v.k) / 2;
    var offY = v.y - (cam.vh - cam.height * v.k) / 2;
    var zoom = v.k / cam.fitScale;
    var s = 1.1 + Math.min(.05, (zoom - 1) * .02);
    var maxX = (s - 1) / 2 * cam.vw * .9;
    var maxY = (s - 1) / 2 * cam.vh * .9;
    var dx = Math.max(-maxX, Math.min(maxX, offX * .1));
    var dy = Math.max(-maxY, Math.min(maxY, offY * .1));
    bd.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')';
  }

  /* "pluga" na câmera existente SEM editar o map-camera.js */
  function patchCamera(cam){
    if(!cam || cam.__pm) return;
    cam.__pm = true;

    var paint = cam.paint;
    cam.paint = function(){
      paint.apply(this, arguments);
      applyParallax(this);
    };

    var fit = cam.fit;
    cam.fit = function(){
      cancelFlight();
      if(!this.fitScale) return;
      if(!cameraAvailable(this) || reduced() || opts().flyOnSelect === false ||
          this.view.k === this.fitScale) return fit.call(this);
      flyTo(this, this.width / 2, this.height / 2, this.fitScale);
    };

    var zoomBy = cam.zoomBy;
    cam.zoomBy = function(){
      cancelFlight();
      return zoomBy.apply(this, arguments);
    };

    /* se a pessoa pegar o mapa, o voo para na hora */
    ['pointerdown','wheel','keydown'].forEach(function(type){
      cam.viewport.addEventListener(type, cancelFlight, { capture:true, passive:true });
    });

    cam.paint();
  }

  window.PhobiaMapMotion = {
    flyTo:flyTo, flyToDistrict:flyToDistrict, cancelFlight:cancelFlight,
    camera:tokyoCam, applyParallax:applyParallax
  };

  /* ==========================================================
     INICIALIZAÇÃO
     ========================================================== */
  function init(){
    patchCamera(tokyoCam());
    document.addEventListener('click', rememberDistrictPick, true);
    document.addEventListener('keydown', rememberDistrictPick, true);
    reduceQuery.addEventListener?.('change', function(){
      cancelFlight();
      var cam = tokyoCam();
      if(cam) applyParallax(cam);
    });
    var dg = $('#districts');
    if(dg){
      new MutationObserver(onDistrictsChanged).observe(dg, { childList:true });
      onDistrictsChanged();            // o site pode já ter renderizado antes deste script
    }

    var dossier = $('#dossier');
    if(dossier){
      new MutationObserver(onDossierChanged).observe(dossier, { childList:true, subtree:true });
      onDossierChanged();
    }

    /* voltou para a aba do mapa → toca a entrada de novo */
    var page = $('#mapPage');
    if(page){
      var wasActive = page.classList.contains('active');
      new MutationObserver(function(){
        var now = page.classList.contains('active');
        if(!now) cancelFlight();
        if(now && !wasActive){
          requestAnimationFrame(function(){ runIntro(0); });
        }
        wasActive = now;
      }).observe(page, { attributes:true, attributeFilter:['class'] });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

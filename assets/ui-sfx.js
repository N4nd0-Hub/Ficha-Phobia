/* ==========================================================
   PERSONA // PHOBIA — ui-sfx.js
   Sons de interface no estilo Persona, sintetizados na hora
   (Web Audio, sem arquivos): cursor, clique, troca de aba,
   abrir/fechar, confirmar, erro, dado e anúncios de combate.
   Preferência salva em localStorage ('phobia-sfx').
   ========================================================== */
(function () {
  'use strict';
  if (window.PhobiaSfx) return;

  var KEY = 'phobia-sfx';
  var pref = { on: true, vol: 0.55 };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { pref.on = sv.on !== false; if (typeof sv.vol === 'number') pref.vol = Math.max(0, Math.min(1, sv.vol)); } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) {} }

  var ctx = null, master = null, comp = null, noiseBuf = null;
  function ac() {
    if (ctx) return ctx;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { ctx = new C({ latencyHint: 'interactive' }); } catch (e) { return null; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12;
    master = ctx.createGain(); master.gain.value = pref.vol * 0.9;
    master.connect(comp); comp.connect(ctx.destination);
    var len = ctx.sampleRate * 0.6; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function ready() { if (!pref.on || !pref.vol) return null; var c = ac(); if (!c) return null; if (c.state === 'suspended') c.resume(); return c; }

  /* ---------- peças ---------- */
  /* tom com envelope (freq pode deslizar) */
  function tone(t, o) {
    var c = ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || o.d));
    if (o.det) osc.detune.value = o.det;
    var a = o.a || 0.002, v = o.v || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    var out = g;
    if (o.lp) { var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); out = f; }
    osc.connect(g); out.connect(o.to || master);
    osc.start(t); osc.stop(t + o.d + 0.02);
  }
  /* ruído filtrado (estalos, “swish”) */
  function noise(t, o) {
    var c = ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; s.playbackRate.value = o.rate || 1;
    f.type = o.ft || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.d);
    var v = o.v || 0.2, a = o.a || 0.002;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    s.connect(f); f.connect(g); g.connect(o.to || master);
    s.start(t, Math.random() * 0.3); s.stop(t + o.d + 0.02);
  }

  /* ---------- sons ---------- */
  var SND = {
    /* cursor passando: tique curto e agudo */
    hover: function (t) {
      tone(t, { type: 'sine', f: 2650, f2: 2350, d: 0.035, v: 0.05 });
      noise(t, { ft: 'highpass', f: 6000, d: 0.018, v: 0.035 });
    },
    /* clique de menu: estalo + blip duplo */
    click: function (t) {
      noise(t, { ft: 'highpass', f: 3500, d: 0.03, v: 0.16 });
      tone(t, { type: 'square', f: 1560, f2: 1180, d: 0.05, v: 0.07, lp: 4200 });
      tone(t + 0.035, { type: 'square', f: 2090, d: 0.045, v: 0.045, lp: 5200 });
    },
    /* troca de aba: “swish” + dois tons subindo */
    tab: function (t) {
      noise(t, { ft: 'bandpass', f: 1400, f2: 7200, q: 1.4, d: 0.13, v: 0.16, a: 0.01 });
      tone(t + 0.02, { type: 'triangle', f: 1175, d: 0.07, v: 0.11 });
      tone(t + 0.07, { type: 'triangle', f: 1760, d: 0.1, v: 0.1 });
    },
    /* abrir painel / ficha: varrida + acorde brilhante */
    open: function (t) {
      noise(t, { ft: 'bandpass', f: 600, f2: 6000, q: 0.9, d: 0.22, v: 0.15, a: 0.03 });
      [880, 1318.5, 1760].forEach(function (f, i) { tone(t + 0.05 + i * 0.035, { type: 'triangle', f: f, d: 0.22, v: 0.07 }); });
      tone(t + 0.05, { type: 'sine', f: 220, f2: 330, d: 0.18, v: 0.12 });
    },
    /* fechar / voltar: varrida descendo */
    back: function (t) {
      noise(t, { ft: 'bandpass', f: 5200, f2: 700, q: 1, d: 0.16, v: 0.13, a: 0.01 });
      tone(t, { type: 'square', f: 990, f2: 520, d: 0.11, v: 0.06, lp: 2600 });
    },
    /* ligar / desligar */
    on: function (t) { tone(t, { type: 'square', f: 1320, d: 0.04, v: 0.06, lp: 4000 }); tone(t + 0.045, { type: 'square', f: 1980, d: 0.06, v: 0.06, lp: 5000 }); },
    off: function (t) { tone(t, { type: 'square', f: 1480, d: 0.04, v: 0.06, lp: 4000 }); tone(t + 0.045, { type: 'square', f: 990, d: 0.06, v: 0.06, lp: 3000 }); },
    /* digitação / slider */
    tick: function (t) { noise(t, { ft: 'highpass', f: 4800, d: 0.012, v: 0.05 }); },
    /* confirmar / salvar: arpejo curto */
    confirm: function (t) {
      [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) { tone(t + i * 0.045, { type: 'square', f: f, d: 0.12, v: 0.05, lp: 5000 }); });
      noise(t, { ft: 'highpass', f: 5000, d: 0.05, v: 0.08 });
    },
    /* erro: buzz grave duplo */
    error: function (t) {
      tone(t, { type: 'sawtooth', f: 180, d: 0.09, v: 0.12, lp: 1400 });
      tone(t + 0.11, { type: 'sawtooth', f: 150, d: 0.14, v: 0.12, lp: 1200 });
    },
    /* notificação (toast) */
    notify: function (t) { tone(t, { type: 'sine', f: 1568, d: 0.1, v: 0.09 }); tone(t + 0.07, { type: 'sine', f: 2349, d: 0.16, v: 0.08 }); },
    /* dados chacoalhando */
    dice: function (t) {
      for (var i = 0; i < 9; i++) {
        var dt = i * 0.055 + Math.random() * 0.03;
        noise(t + dt, { ft: 'bandpass', f: 2200 + Math.random() * 2600, q: 6, d: 0.03, v: 0.22 - i * 0.018 });
        tone(t + dt, { type: 'triangle', f: 600 + Math.random() * 500, d: 0.03, v: 0.05 });
      }
    },
    /* resultado do dado */
    land: function (t) { noise(t, { ft: 'lowpass', f: 900, d: 0.08, v: 0.25 }); tone(t, { type: 'sine', f: 140, f2: 80, d: 0.12, v: 0.2 }); },
    crit: function (t) {
      SND.land(t);
      [1318.5, 1760, 2637, 3520].forEach(function (f, i) { tone(t + 0.06 + i * 0.05, { type: 'square', f: f, d: 0.2, v: 0.05, lp: 7000 }); });
      noise(t + 0.06, { ft: 'highpass', f: 7000, d: 0.4, v: 0.1, a: 0.05 });
    },
    /* anúncio de combate (VANTAGEM!, CERCADO!...): impacto + rasgo */
    splash: function (t) {
      tone(t, { type: 'sine', f: 120, f2: 45, d: 0.35, v: 0.35 });
      noise(t, { ft: 'lowpass', f: 2400, f2: 300, d: 0.3, v: 0.3 });
      noise(t + 0.02, { ft: 'bandpass', f: 2000, f2: 9000, q: 1.2, d: 0.25, v: 0.16, a: 0.02 });
      [523.25, 659.25, 783.99].forEach(function (f) { tone(t + 0.03, { type: 'sawtooth', f: f, d: 0.3, v: 0.035, lp: 3000 }); });
    },
    splashBad: function (t) {
      tone(t, { type: 'sine', f: 110, f2: 40, d: 0.4, v: 0.35 });
      noise(t, { ft: 'lowpass', f: 1800, f2: 200, d: 0.35, v: 0.3 });
      [207.65, 246.94, 293.66].forEach(function (f) { tone(t + 0.03, { type: 'sawtooth', f: f, d: 0.4, v: 0.05, lp: 1500 }); });
    },
    /* subir de rank / vitória */
    rankup: function (t) {
      [783.99, 1046.5, 1318.5, 1568, 2093].forEach(function (f, i) { tone(t + i * 0.07, { type: 'square', f: f, d: 0.26, v: 0.05, lp: 6000 }); tone(t + i * 0.07, { type: 'sine', f: f / 2, d: 0.3, v: 0.05 }); });
      noise(t + 0.3, { ft: 'highpass', f: 6500, d: 0.6, v: 0.08, a: 0.08 });
    }
  };

  var last = {};
  function play(name, gap) {
    var c = ready(); if (!c || !SND[name]) return;
    var now = performance.now();
    if (last[name] && now - last[name] < (gap || 30)) return;
    last[name] = now;
    try { SND[name](c.currentTime + 0.005); } catch (e) {}
  }

  /* ---------- quem faz qual som ---------- */
  var CLICKABLE = 'button,a[href],[role="button"],[role="tab"],summary,select,label:has(>input[type="checkbox"]),label:has(>input[type="radio"]),input[type="checkbox"],input[type="radio"],.district-art-button,[data-sheet-section],[data-cm-splash],.eq-item,.bn-card,.trh-card';
  var TAB = '[data-workspace],.sheet-page-tab,[data-sheet-section],[data-hs-tab],.map-mode-btn,[role="tab"],.hud-nav a,.hud-nav button,[data-hp-tab],#realityBtn,#cognitionBtn,.district-art-button';
  var BACK = '[aria-label*="echar" i],[aria-label*="lose" i],[title*="echar" i],.close,.modal-close,[data-close],[data-cm-close],.sheet-ui-close';
  var OPEN = '#cmEnter,#drFab,#siteThemeButton,[data-open],.workspace-btn[data-workspace="sheet"]';
  var SKIP = '#sfxDock *,input[type="range"],input[type="text"],input[type="number"],input[type="search"],textarea';

  function kindOf(el) {
    if (el.matches(BACK) || /^\s*[×✕✖x]\s*$/i.test(el.textContent || '') && el.textContent.length < 3) return 'back';
    if (el.matches(OPEN)) return 'open';
    if (el.matches('[data-cm-splash]')) return null; /* o próprio anúncio toca */
    if (el.matches('input[type="checkbox"],label:has(>input[type="checkbox"])')) {
      var cb = el.matches('input') ? el : el.querySelector('input');
      return cb && !cb.checked ? 'on' : 'off';
    }
    if (el.matches(TAB)) return 'tab';
    if (el.matches('[aria-pressed]')) return el.getAttribute('aria-pressed') === 'true' ? 'off' : 'on';
    return 'click';
  }
  function target(e) {
    var t = e.target; if (!t || !t.closest) return null;
    if (t.closest(SKIP)) return null;
    var el = t.closest(CLICKABLE);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return null;
    return el;
  }
  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var el = target(e); if (!el) return;
    var k = kindOf(el); if (k) play(k, 40);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { play('back', 80); return; }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = document.activeElement; if (!el || el === document.body) return;
    if (el.matches('input,textarea') && e.key === ' ') return;
    if (el.matches(CLICKABLE) && !el.closest(SKIP)) { var k = kindOf(el); if (k) play(k, 40); }
  }, true);
  /* cursor: só com mouse de verdade */
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches, lastHover = null;
  if (fine) document.addEventListener('pointerover', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var el = target(e);
    if (!el || el === lastHover) return;
    lastHover = el; play('hover', 45);
  }, true);
  document.addEventListener('pointerout', function (e) { if (lastHover && !lastHover.contains(e.relatedTarget)) lastHover = null; }, true);
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t || t.closest('#sfxDock')) return;
    if (t.matches('input[type="range"]')) play('tick', 45);
    else if (t.matches('input[type="text"],input[type="search"],input[type="number"],textarea')) play('tick', 35);
  }, true);

  /* ---------- ganchos nas funções do site ---------- */
  function hook(obj, name, fn) {
    if (!obj || typeof obj[name] !== 'function' || obj[name].__sfx) return false;
    var orig = obj[name];
    var w = function () { try { fn.apply(this, arguments); } catch (e) {} return orig.apply(this, arguments); };
    for (var k in orig) { try { w[k] = orig[k]; } catch (e) {} }
    w.__sfx = true; obj[name] = w; return true;
  }
  function hookAll() {
    hook(window, 'toast', function (m) { play(/INCORRET|ERRO|FALH|NEGAD|INVÁLID|INVALID/i.test(String(m || '')) ? 'error' : 'notify', 120); });
    hook(window, 'openUnlockGate', function () { play('open', 100); });
    hook(window, 'setLayer', function (l) { play(l === 'cognition' ? 'splashBad' : 'back', 150); });
    if (window.PhobiaDice) hook(window.PhobiaDice, 'roll', function () { play('dice', 200); });
  }
  /* resultado do dado, anúncios de combate e RANK UP aparecem no DOM */
  function watch() {
    if (!('MutationObserver' in window)) return;
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i], el = m.target;
        if (m.type === 'attributes') {
          var cl = el.classList; if (!cl) continue;
          if (cl.contains('bn-rankup') && cl.contains('go') && !(m.oldValue || '').match(/\bgo\b/)) play('rankup', 400);
          else if (cl.contains('error') && !(m.oldValue || '').match(/\berror\b/) && /status|gate|unlock/i.test(el.id + ' ' + el.className)) play('error', 300);
          continue;
        }
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j]; if (n.nodeType !== 1) continue;
          var c = n.classList;
          if (c.contains('dr-card')) { var st = n.closest('.dr-stage'); play(st && st.classList.contains('crit') ? 'crit' : 'land', 200); }
          else if (c.contains('cm-splash')) play(c.contains('bad') ? 'splashBad' : /VIT[ÓO]RIA/i.test(n.textContent) ? 'rankup' : 'splash', 200);
          else if (c.contains('cm-notice') || c.contains('cm-toast')) play('notify', 200);
        }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class'] });
  }

  /* ---------- botão de som ---------- */
  var ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var dock;
  function buildDock() {
    if (document.getElementById('sfxDock')) return;
    dock = document.createElement('div'); dock.id = 'sfxDock';
    dock.innerHTML =
      '<button type="button" class="sfx-btn" aria-label="Sons da interface" aria-expanded="false"></button>' +
      '<div class="sfx-pop" hidden>' +
        '<b>SONS</b>' +
        '<button type="button" class="sfx-toggle"></button>' +
        '<label class="sfx-vol"><span>VOLUME</span><input type="range" min="0" max="100" step="1"></label>' +
        '<button type="button" class="sfx-test">TESTAR ▶</button>' +
      '</div>';
    document.body.appendChild(dock);
    var btn = dock.querySelector('.sfx-btn'), pop = dock.querySelector('.sfx-pop'), rng = dock.querySelector('input'), tg = dock.querySelector('.sfx-toggle');
    function paint() {
      btn.innerHTML = pref.on && pref.vol ? ICON_ON : ICON_OFF;
      btn.classList.toggle('muted', !(pref.on && pref.vol));
      btn.title = pref.on ? 'Sons: ligados' : 'Sons: desligados';
      tg.textContent = pref.on ? 'LIGADOS' : 'DESLIGADOS'; tg.classList.toggle('on', pref.on);
      rng.value = Math.round(pref.vol * 100);
      rng.style.setProperty('--p', rng.value + '%');
    }
    paint();
    btn.addEventListener('click', function () {
      var open = pop.hidden; pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      play(open ? 'open' : 'back', 0);
    });
    tg.addEventListener('click', function () { pref.on = !pref.on; save(); paint(); if (pref.on) play('on', 0); });
    rng.addEventListener('input', function () {
      pref.vol = rng.value / 100; save(); if (master) master.gain.value = pref.vol * 0.9; paint(); play('tick', 60);
    });
    dock.querySelector('.sfx-test').addEventListener('click', function () {
      ['click', 'tab', 'confirm'].forEach(function (k, i) { setTimeout(function () { play(k, 0); }, i * 260); });
    });
    document.addEventListener('pointerdown', function (e) { if (!pop.hidden && !dock.contains(e.target)) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); } }, true);
    place(); addEventListener('resize', place);
    var pr = 0; addEventListener('scroll', function () { if (!pr) pr = requestAnimationFrame(function () { pr = 0; place(); }); }, { passive: true, capture: true });
    setInterval(place, 1500);
  }
  /* fica logo abaixo do botão redondo de tema */
  function place() {
    if (!dock) return;
    var mb = document.querySelector('.hud-menu-btn'), m = mb && mb.offsetParent ? mb.getBoundingClientRect() : null;
    if (m && m.width && innerWidth <= 900) { /* celular: à esquerda do MENU */
      dock.style.top = Math.round(Math.max(6, m.top + m.height / 2 - 16)) + 'px';
      dock.style.left = Math.round(m.left - 42) + 'px'; dock.style.right = 'auto'; return;
    }
    var rb = document.getElementById('realityBtn'), sw = rb && rb.parentElement;
    var q = sw && sw.offsetParent ? sw.getBoundingClientRect() : null;
    if (q && q.width) { /* mapa: ao lado da chave Realidade/Cognição */
      dock.style.top = Math.round(q.top + q.height / 2 - 19) + 'px';
      dock.style.left = Math.round(q.left - 48) + 'px'; dock.style.right = 'auto'; return;
    }
    var nt = document.getElementById('navigationTabs'), n = nt && nt.offsetParent ? nt.getBoundingClientRect() : null;
    if (n && n.width) { /* ficha: à esquerda das abas MAPA/GUIA/... */
      dock.style.top = Math.round(n.top + n.height / 2 - 19) + 'px';
      dock.style.left = Math.round(n.left - 50) + 'px'; dock.style.right = 'auto'; return;
    }
    var ref = document.getElementById('siteThemeButton');
    var r = ref && ref.offsetParent ? ref.getBoundingClientRect() : null;
    if (r && r.width) {
      dock.style.top = Math.round(r.bottom + 8) + 'px';
      dock.style.left = Math.round(r.left + r.width / 2 - 19) + 'px';
      dock.style.right = 'auto';
    } else { dock.style.top = '12px'; dock.style.right = '12px'; dock.style.left = 'auto'; }
  }

  window.PhobiaSfx = { play: play, sounds: Object.keys(SND), pref: pref };

  function init() {
    buildDock(); hookAll(); watch();
    setTimeout(hookAll, 1500); setTimeout(hookAll, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

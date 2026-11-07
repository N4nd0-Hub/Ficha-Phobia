/* ==========================================================
   PERSONA // PHOBIA — theme-fx.js
   Interações dos temas especiais Naoya / Tatsuya / Maya / Kotone:
   • efeito ao clicar e ao passar o mouse em botões e caixas;
   • transição própria ao trocar de aba da ficha.
   Lê o tema ativo de body[data-hs-fx] (definido em sheet-style.js).
   Respeita "movimento calmo" e prefers-reduced-motion.
   ========================================================== */
(function () {
  'use strict';
  if (window.__themeFx) return; window.__themeFx = true;

  var KINDS = { naoya: 1, tatsuya: 1, maya: 1, kotone: 1 };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var HOVER = 'button,a[href],summary,select,input[type=checkbox],[role=button],[role=tab],.hs-attr,.er-slot,.eq-item,.hs-skill';

  function kind() {
    var b = document.body;
    if (!b || !b.classList.contains('workspace-sheet')) return '';
    var k = b.dataset.hsFx || '';
    return KINDS[k] ? k : '';
  }
  function calm() { return document.body.classList.contains('hs-calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function layer() { return document.getElementById('hsFxTop'); }
  function at(x, y) {
    var l = layer(); if (!l) return null;
    var g = document.createElement('span'); g.className = 'tf-at';
    g.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    l.appendChild(g);
    return g;
  }
  function kill(el, ms) { setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, ms); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ---------- efeitos ---------- */
  function crack(x, y, big) {
    var g = at(x, y); if (!g) return;
    var svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'tf-crack'); svg.setAttribute('viewBox', '-160 -160 320 320');
    var n = big ? 7 : 3, html = '';
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rnd(-.3, .3), len = big ? rnd(70, 150) : rnd(26, 50), px = 0, py = 0, d = 'M0 0', segs = big ? 4 : 2, L = 0;
      for (var s = 1; s <= segs; s++) {
        var r = len * s / segs, aa = a + rnd(-.35, .35);
        var nx = Math.cos(aa) * r, ny = Math.sin(aa) * r;
        L += Math.hypot(nx - px, ny - py); px = nx; py = ny;
        d += 'L' + nx.toFixed(1) + ' ' + ny.toFixed(1);
      }
      if (big && i % 2 === 0) { var ba = a + rnd(.5, .9), bl = len * .35, bx = px * .55, by = py * .55; d += 'M' + bx.toFixed(1) + ' ' + by.toFixed(1) + 'L' + (bx + Math.cos(ba) * bl).toFixed(1) + ' ' + (by + Math.sin(ba) * bl).toFixed(1); L += bl; }
      var Ls = Math.ceil(L + 4);
      html += '<path class="p" d="' + d + '" style="--l:' + Ls + ';--t:' + (big ? 1.1 : .7) + 's"/><path class="w" d="' + d + '" style="--l:' + Ls + ';--t:' + (big ? 1.1 : .7) + 's"/>';
    }
    svg.innerHTML = html; g.appendChild(svg);
    if (big) { var sh = document.createElement('i'); sh.className = 'tf-shine'; g.appendChild(sh); }
    kill(g, big ? 1200 : 800);
  }
  function sparks(x, y, big) {
    var g = at(x, y); if (!g) return;
    var n = big ? 16 : 4;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i'); p.className = 'tf-spark' + (i % 4 === 3 ? ' ash' : '');
      g.appendChild(p);
      var a = rnd(-Math.PI * .95, -Math.PI * .05), d = big ? rnd(40, 110) : rnd(16, 40);
      var dx = Math.cos(a) * d, dy = Math.sin(a) * d;
      p.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.8)', opacity: 1, offset: .55 },
        { transform: 'translate(' + (dx + rnd(-12, 12)) + 'px,' + (dy - rnd(30, 60)) + 'px) scale(.2)', opacity: 0 }
      ], { duration: rnd(600, 1000), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    }
    kill(g, 1100);
  }
  function hearts(x, y, big) {
    var g = at(x, y); if (!g) return;
    var n = big ? 5 : 1;
    for (var i = 0; i < n; i++) {
      var h = document.createElementNS(SVGNS, 'svg'); h.setAttribute('viewBox', '-12 -11 24 22'); h.setAttribute('class', 'tf-heart' + (i % 2 ? ' cy' : ''));
      h.innerHTML = '<path d="M0 9C-9 3-11-2-10-5C-9-9-4-10 0-5C4-10 9-9 10-5C11-2 9 3 0 9Z"/>';
      g.appendChild(h);
      var dx = big ? rnd(-60, 60) : rnd(-8, 8), dy = big ? rnd(-90, -40) : -34, sc = big ? rnd(.8, 1.4) : .8;
      h.animate([
        { transform: 'translate(0,0) scale(.2)', opacity: 0 },
        { transform: 'translate(' + dx * .4 + 'px,' + dy * .4 + 'px) scale(' + sc * 1.35 + ')', opacity: 1, offset: .25 },
        { transform: 'translate(' + dx * .6 + 'px,' + dy * .6 + 'px) scale(' + sc * .95 + ')', opacity: 1, offset: .45 },
        { transform: 'translate(' + dx * .75 + 'px,' + dy * .75 + 'px) scale(' + sc * 1.15 + ')', opacity: 1, offset: .6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')', opacity: 0 }
      ], { duration: big ? rnd(900, 1300) : 700, easing: 'ease-out', fill: 'forwards' });
    }
    if (big) for (var k = 0; k < 4; k++) {
      var t = document.createElement('i'); t.className = 'tf-twinkle'; g.appendChild(t);
      var a = rnd(0, Math.PI * 2), d = rnd(24, 60);
      t.animate([{ transform: 'translate(0,0) scale(0) rotate(0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) scale(1) rotate(90deg)', opacity: 1, offset: .5 }, { transform: 'translate(' + Math.cos(a) * d * 1.2 + 'px,' + Math.sin(a) * d * 1.2 + 'px) scale(0) rotate(180deg)', opacity: 0 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
    }
    kill(g, 1400);
  }
  function rings(x, y, big) {
    var g = at(x, y); if (!g) return;
    var n = big ? 3 : 1;
    for (var i = 0; i < n; i++) {
      var r = document.createElement('i'); r.className = 'tf-ring' + (i % 2 ? ' g' : '');
      r.style.setProperty('--k', big ? 6 + i * 1.5 : 3);
      r.style.animationDelay = (i * 0.12) + 's';
      g.appendChild(r);
    }
    kill(g, 1300);
  }
  var FX = { naoya: crack, tatsuya: sparks, maya: hearts, kotone: rings };

  /* clique */
  document.addEventListener('pointerdown', function (e) {
    var k = kind(); if (!k || calm()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    FX[k](e.clientX, e.clientY, true);
  }, { passive: true });

  /* hover: no máximo um efeito a cada 180 ms, e só uma vez por elemento */
  var lastT = 0, lastEl = null;
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse') return;
    var k = kind(); if (!k || calm()) return;
    var el = e.target.closest && e.target.closest(HOVER);
    if (!el || el === lastEl || !el.closest('#characterPage, .sheet-ui-backdrop, #phobiaDeckBar')) return;
    var now = performance.now(); if (now - lastT < 180) return;
    lastT = now; lastEl = el;
    var r = el.getBoundingClientRect();
    var x = Math.min(r.right - 6, Math.max(r.left + 6, e.clientX)), y = k === 'naoya' ? e.clientY : r.top + r.height / 2;
    FX[k](x, y, false);
  }, { passive: true });
  document.addEventListener('pointerout', function (e) { if (lastEl && !lastEl.contains(e.relatedTarget)) lastEl = null; }, { passive: true });

  /* ---------- transições de aba ---------- */
  var ZIPPO = '<svg class="zippo" viewBox="0 0 60 96"><g class="flame"><path d="M31 28C20 20 24 8 31 0C30 9 40 12 38 22C37 26 34 28 31 28Z" fill="#ffb13a"/><path d="M31 27C26 22 28 15 31 10C31 15 35 18 34 23C33 25 32 27 31 27Z" fill="#fff3c2"/></g>' +
    '<rect x="8" y="30" width="44" height="62" rx="5" fill="#2a2a2e" stroke="#f5a524" stroke-width="2.5"/><rect x="14" y="40" width="32" height="10" fill="none" stroke="#f5a524" stroke-width="1.5" opacity=".6"/>' +
    '<rect x="25" y="20" width="12" height="11" fill="#3a3a40" stroke="#f5a524" stroke-width="1.5"/><circle cx="29" cy="25.5" r="1.4" fill="#f5a524"/><circle cx="33" cy="25.5" r="1.4" fill="#f5a524"/>' +
    '<g class="lid"><rect x="8" y="10" width="44" height="21" rx="4" fill="#2a2a2e" stroke="#f5a524" stroke-width="2.5"/></g></svg>';
  function transition(k) {
    if (!KINDS[k] || k === 'naoya' || calm()) return;   /* o Naoya só tem a abertura (TV ligando) */
    var old = document.querySelector('.tf-trans'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'tf-trans ' + k; t.setAttribute('aria-hidden', 'true');
    if (k === 'maya') t.innerHTML = '<i class="flash"></i><i class="page"></i><i class="frame"></i>';
    else if (k === 'kotone') t.innerHTML = '<i class="glow"></i><i class="wave"></i>';
    else if (k === 'tatsuya') t.innerHTML = '<i class="burn"></i>' + ZIPPO;
    document.body.appendChild(t);
    if (k === 'tatsuya') burn(t.querySelector('.burn'));
    kill(t, k === 'tatsuya' ? 1000 : 800);
  }
  /* "derrete" a tela: um buraco de fogo abre a partir do isqueiro */
  function burn(el) {
    var x = window.innerWidth - Math.max(60, window.innerWidth * .04) - 30, y = window.innerHeight * .88 - 60;
    var max = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 80, t0 = performance.now(), dur = 620;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, r = e * max;
      el.style.background = 'radial-gradient(circle at ' + x + 'px ' + y + 'px,transparent ' + r + 'px,rgba(255,243,194,.95) ' + (r + 4) + 'px,#ffb13a ' + (r + 12) + 'px,#e3242b ' + (r + 28) + 'px,rgba(30,6,6,.96) ' + (r + 60) + 'px,#120707 ' + (r + 90) + 'px)';
      if (p < 1) requestAnimationFrame(step); else el.style.background = 'transparent';
    })(t0);
  }
  /* Naoya: ao abrir a ficha, a tela "liga" como uma TV de tubo — suave, sem flash */
  function tvOn() {
    if (kind() !== 'naoya' || calm()) return;
    var old = document.querySelector('.tf-tvon'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'tf-trans tf-tvon'; t.setAttribute('aria-hidden', 'true');
    t.innerHTML = '<i class="half top"></i><i class="half bot"></i><i class="beam"></i><i class="snow"></i>';
    document.body.appendChild(t);
    kill(t, 1300);
  }
  window.PhobiaThemeFx = { transition: transition, tvOn: tvOn };
  function wrapWorkspace() {
    var o = window.switchWorkspace;
    if (typeof o !== 'function') { setTimeout(wrapWorkspace, 300); return; }
    if (o.__tf) return;
    var w = function (ws) {
      var was = document.body.classList.contains('workspace-sheet');
      var r = o.apply(this, arguments);
      if (ws === 'sheet' && !was) setTimeout(tvOn, 30);
      return r;
    };
    w.__tf = true; window.switchWorkspace = w;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapWorkspace); else wrapWorkspace();

  function wrapSection() {
    var o = window.setSheetSection;
    if (typeof o !== 'function') { setTimeout(wrapSection, 300); return; }
    if (o.__tf) return;
    var w = function (section) {
      var before = '';
      try { before = state.charSheet.sheetSection; } catch (e) {}
      var k = kind();
      var r = o.apply(this, arguments);
      if (k && section && section !== before) transition(k);
      return r;
    };
    w.__tf = true; window.setSheetSection = w;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapSection); else wrapSection();
})();

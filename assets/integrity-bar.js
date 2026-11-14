/* ==========================================================
   PERSONA // PHOBIA — integrity-bar.js
   Barra de INTEGRIDADE repaginada (aba Ficha Base):
   fita de 20 blocos, cursor com o valor, prévia ao passar o
   mouse, botões −5/+5 e estágios clicáveis. Cores seguem o
   tema da ficha (--hud-acc*). Usa o mesmo range/data-sheet
   de sempre; nada muda no save.
   ========================================================== */
(function () {
  'use strict';
  if (window.__integrityBar) return; window.__integrityBar = true;

  var STAGES = [
    { v: 0, k: 'morte', n: 'Morte', r: '0%', g: '✕' },
    { v: 1, k: 'ruina', n: 'Ruína', r: '1–24%', g: '◣' },
    { v: 25, k: 'fraturado', n: 'Fraturado', r: '25–49%', g: '◪' },
    { v: 50, k: 'estavel', n: 'Estável', r: '50–74%', g: '◆' },
    { v: 75, k: 'integro', n: 'Íntegro', r: '75–99%', g: '✦' },
    { v: 100, k: 'plenitude', n: 'Plenitude', r: '100%', g: '★' }
  ];
  var ZONE = function (v) { return v >= 100 ? 'plenitude' : v >= 75 ? 'integro' : v >= 50 ? 'estavel' : v >= 25 ? 'fraturado' : v >= 1 ? 'ruina' : 'morte'; };
  var root = null, last = null, lastZone = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function val() { try { return Math.max(0, Math.min(100, Math.round(+state.charSheet.integrity))); } catch (e) { return 50; } }
  function info(v) { try { return integrityInfo(v); } catch (e) { return { name: ZONE(v).toUpperCase(), range: '', flavor: '' }; } }
  function stageOf(v) { var z = ZONE(v); return STAGES.filter(function (s) { return s.k === z; })[0]; }

  function build() {
    var host = $('#characterPage .hs-integ'); if (!host) return false;
    if (host.querySelector('.ib')) { root = host.querySelector('.ib'); return true; }
    var cells = ''; for (var k = 0; k < 20; k++) cells += '<i class="ib-cell" data-z="' + ZONE(k * 5 + 1) + '"></i>';
    root = document.createElement('div'); root.className = 'ib';
    root.innerHTML =
      '<header class="ib-head">' +
        '<div class="ib-title"><small>INTEGRIDADE <span>// SINAL DA MENTE</span></small><b class="ib-state">—</b><em class="ib-range"></em></div>' +
        '<div class="ib-num"><button type="button" class="ib-step" data-ib-step="-5" aria-label="Diminuir 5%">−5</button>' +
          '<strong aria-live="polite"><span class="ib-val">0</span><i>%</i></strong>' +
          '<button type="button" class="ib-step" data-ib-step="5" aria-label="Aumentar 5%">+5</button></div>' +
      '</header>' +
      '<div class="ib-track"><div class="ib-cells">' + cells + '</div>' +
        '<span class="ib-mark m25"></span><span class="ib-mark m50"></span><span class="ib-mark m75"></span>' +
        '<span class="ib-ghost" aria-hidden="true"><b></b><small></small></span>' +
        '<span class="ib-cursor" aria-hidden="true"><b></b></span></div>' +
      '<div class="ib-stages">' + STAGES.map(function (s) {
        return '<button type="button" class="ib-stage" data-integrity-stage="' + s.v + '" data-k="' + s.k + '"><i>' + s.g + '</i><b>' + s.n + '</b><small>' + s.r + '</small></button>';
      }).join('') + '</div>' +
      '<p class="ib-flavor"></p>';
    host.appendChild(root);
    host.classList.add('ib-on');
    var range = $('.integrity-game-range', host) || document.querySelector('.integrity-game-range[data-sheet="integrity"]');
    if (range) { $('.ib-track', root).appendChild(range); range.setAttribute('aria-label', 'Integridade'); range.addEventListener('input', function () { paint(+range.value); }); }

    var track = $('.ib-track', root), ghost = $('.ib-ghost', root);
    track.addEventListener('pointermove', function (e) {
      var r = track.getBoundingClientRect(), v = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100), st = stageOf(v);
      ghost.style.left = v + '%'; ghost.style.setProperty('--gv', v); ghost.dataset.k = st.k;
      ghost.querySelector('b').textContent = v + '%'; ghost.querySelector('small').textContent = st.n;
      root.classList.add('is-hover');
    });
    track.addEventListener('pointerleave', function () { root.classList.remove('is-hover'); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ib-step]'); if (!b) return;
      set(val() + (+b.dataset.ibStep));
    });
    return true;
  }
  function set(v) {
    v = Math.max(0, Math.min(100, v));
    try { state.charSheet.integrity = v; } catch (e) { return; }
    var range = $('.integrity-game-range', root); if (range) range.value = String(v);
    paint(v);
    try { renderCharacterSheet(); } catch (e) {}
    try { saveState(true); } catch (e) {}
  }
  function paint(v) {
    if (!root && !build()) return;
    if (v == null) v = val();
    var z = ZONE(v), d = info(v);
    root.dataset.k = z;
    root.style.setProperty('--v', v);
    root.querySelectorAll('.ib-cell').forEach(function (c, k) {
      var f = Math.max(0, Math.min(1, (v - k * 5) / 5));
      c.style.setProperty('--f', (f * 100).toFixed(0) + '%');
      c.classList.toggle('on', f >= 1); c.classList.toggle('part', f > 0 && f < 1);
    });
    $('.ib-state', root).textContent = d.name || z.toUpperCase();
    $('.ib-range', root).textContent = d.range || '';
    $('.ib-val', root).textContent = v;
    $('.ib-cursor b', root).textContent = v;
    $('.ib-cursor', root).style.left = v + '%';
    $('.ib-flavor', root).textContent = d.flavor || '';
    root.querySelectorAll('.ib-stage').forEach(function (b) { b.classList.toggle('on', b.dataset.k === z); });
    root.querySelector('[data-ib-step="-5"]').disabled = v <= 0;
    root.querySelector('[data-ib-step="5"]').disabled = v >= 100;
    if (lastZone && lastZone !== z) {
      var up = STAGES.findIndex(function (s) { return s.k === z; }) > STAGES.findIndex(function (s) { return s.k === lastZone; });
      root.classList.remove('fx-up', 'fx-down'); void root.offsetWidth; root.classList.add(up ? 'fx-up' : 'fx-down');
    }
    lastZone = z; last = v;
  }
  function wrap(name) {
    var o = window[name]; if (typeof o !== 'function' || o.__ib) return;
    var w = function () { var r = o.apply(this, arguments); try { paint(); } catch (e) {} return r; };
    w.__ib = true; window[name] = w;
  }
  function init() {
    if (typeof state === 'undefined' || !state.charSheet || !$('#characterPage .hs-integ')) { setTimeout(init, 300); return; }
    build(); paint();
    wrap('renderCharacterSheet'); wrap('hydrateCharacterSheet');
    setInterval(function () { if (root && val() !== last) paint(); if (root && !root.isConnected) { root = null; build(); paint(); } }, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

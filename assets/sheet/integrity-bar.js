/* ==========================================================
   PERSONA // PHOBIA — integrity-bar.js (v3, compacta)
   Barra de INTEGRIDADE da Ficha Base em uma linha só:
   nome do estado · barra líquida arrastável · número · −5/+5.
   • arrastar/clicar na barra, roda do mouse e setas do teclado
   • prévia ao passar o mouse, número que "conta" até o valor
   • seta ▲/▼ mostrando a última mudança (estilo Don't Starve)
   • abaixo de 25% a barra treme e falha (estilo Amnesia)
   Cores seguem o tema (--hud-acc*). Grava no mesmo
   state.charSheet.integrity / range data-sheet de sempre.
   ========================================================== */
(function () {
  'use strict';
  if (window.__integrityBar) return; window.__integrityBar = true;

  var ZONE = function (v) { return v >= 100 ? 'plenitude' : v >= 75 ? 'integro' : v >= 50 ? 'estavel' : v >= 25 ? 'fraturado' : v >= 1 ? 'ruina' : 'morte'; };
  var NAME = { morte: 'MORTE', ruina: 'EM RUÍNA', fraturado: 'FRATURADO', estavel: 'ESTÁVEL', integro: 'ÍNTEGRO', plenitude: 'PLENITUDE' };
  var root = null, last = null, shown = null, tween = 0, trendT = 0;

  function $(s, r) { return (r || document).querySelector(s); }
  function val() { try { return Math.max(0, Math.min(100, Math.round(+state.charSheet.integrity))); } catch (e) { return 50; } }

  function build() {
    var host = $('#characterPage .hs-integ'); if (!host) return false;
    if (host.querySelector('.ib2')) { root = host.querySelector('.ib2'); return true; }
    host.querySelectorAll('.ib').forEach(function (n) { n.remove(); });
    root = document.createElement('div'); root.className = 'ib2';
    root.innerHTML =
      '<div class="ib2-label"><small>INTEGRIDADE</small><b class="ib2-state">—</b></div>' +
      '<div class="ib2-track" tabindex="-1">' +
        '<div class="ib2-rail"><i class="ib2-fill"><i class="ib2-wave"></i></i><i class="ib2-ghostfill"></i></div>' +
        '<span class="ib2-tick" style="left:25%"></span><span class="ib2-tick" style="left:50%"></span><span class="ib2-tick" style="left:75%"></span>' +
        '<span class="ib2-thumb"><b></b></span><span class="ib2-tip"></span>' +
      '</div>' +
      '<div class="ib2-num"><button type="button" class="ib2-step" data-ib-step="-5" aria-label="Diminuir 5%">−5</button>' +
        '<strong aria-live="polite"><span class="ib2-val">0</span><i>%</i><em class="ib2-trend"></em></strong>' +
        '<button type="button" class="ib2-step" data-ib-step="5" aria-label="Aumentar 5%">+5</button></div>';
    host.appendChild(root);
    host.classList.add('ib-on');

    var range = $('.integrity-game-range', host) || document.querySelector('.integrity-game-range[data-sheet="integrity"]');
    var track = $('.ib2-track', root);
    if (range) {
      track.appendChild(range); range.setAttribute('aria-label', 'Integridade');
      range.addEventListener('input', function () { paint(+range.value, true); });
      range.addEventListener('pointerdown', function () { root.classList.add('is-drag'); });
      window.addEventListener('pointerup', function () { root.classList.remove('is-drag'); });
    }
    var tip = $('.ib2-tip', root), ghost = $('.ib2-ghostfill', root);
    track.addEventListener('pointermove', function (e) {
      var r = track.getBoundingClientRect(), v = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100);
      tip.style.left = v + '%'; tip.textContent = v + '% · ' + NAME[ZONE(v)];
      ghost.style.width = v + '%'; root.classList.add('is-hover');
    });
    track.addEventListener('pointerleave', function () { root.classList.remove('is-hover'); });
    track.addEventListener('wheel', function (e) { e.preventDefault(); set(val() + (e.deltaY < 0 ? 1 : -1)); }, { passive: false });
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-ib-step]'); if (b) set(val() + (+b.dataset.ibStep)); });
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
  function countTo(v) {
    cancelAnimationFrame(tween);
    var from = shown == null ? v : shown, t0 = performance.now(), el = $('.ib2-val', root);
    (function step(t) {
      var k = Math.min(1, (t - t0) / 380), e = 1 - Math.pow(1 - k, 3);
      shown = Math.round(from + (v - from) * e); el.textContent = shown;
      if (k < 1) tween = requestAnimationFrame(step);
    })(t0);
  }
  function paint(v, live) {
    if (!root && !build()) return;
    if (v == null) v = val();
    var z = ZONE(v);
    root.dataset.k = z;
    root.style.setProperty('--v', v);
    $('.ib2-state', root).textContent = NAME[z];
    $('.ib2-thumb b', root).textContent = v;
    if (last != null && v !== last) {
      var tr = $('.ib2-trend', root); tr.textContent = v > last ? '▲' : '▼'; tr.className = 'ib2-trend ' + (v > last ? 'up' : 'down');
      clearTimeout(trendT); trendT = setTimeout(function () { tr.className = 'ib2-trend'; }, 2600);
      if (ZONE(last) !== z) { root.classList.remove('fx-up', 'fx-down'); void root.offsetWidth; root.classList.add(v > last ? 'fx-up' : 'fx-down'); }
    }
    if (live) { shown = v; $('.ib2-val', root).textContent = v; } else countTo(v);
    $('[data-ib-step="-5"]', root).disabled = v <= 0;
    $('[data-ib-step="5"]', root).disabled = v >= 100;
    last = v;
  }
  function wrap(name) {
    var o = window[name]; if (typeof o !== 'function' || o.__ib) return;
    var w = function () { var r = o.apply(this, arguments); try { if (val() !== last) paint(); } catch (e) {} return r; };
    w.__ib = true; window[name] = w;
  }
  function init() {
    if (typeof state === 'undefined' || !state.charSheet || !$('#characterPage .hs-integ')) { setTimeout(init, 300); return; }
    build(); paint();
    wrap('renderCharacterSheet'); wrap('hydrateCharacterSheet');
    setInterval(function () { if (root && !root.isConnected) { root = null; build(); paint(); } else if (root && val() !== last) paint(); }, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

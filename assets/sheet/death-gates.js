/* ==========================================================
   PERSONA // PHOBIA — death-gates.js (Arcana XIII — Morte)
   Botão "Aplicar perda — Morrendo involuntário" na Ficha Base.
   Cada clique registra a perda permanente de 10% dos PV e PM
   máximos atuais em state.charSheet.resources.deathGates
   ({pvLoss, pmLoss, log[]}), que entra no save e no backup JSON.
   "Recuperar" desfaz a última perda (Final Hit ou clique errado).
   ========================================================== */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function isDeath() { try { var a = currentArcanaData(); return !!(a && a.romano === 'XIII'); } catch (e) { return false; } }
  function dg() {
    var r = state.charSheet.resources || (state.charSheet.resources = {});
    var d = r.deathGates;
    if (!d || typeof d !== 'object') d = r.deathGates = { pvLoss: 0, pmLoss: 0, log: [] };
    if (!Array.isArray(d.log)) d.log = [];
    d.pvLoss = Math.max(0, +d.pvLoss || 0); d.pmLoss = Math.max(0, +d.pmLoss || 0);
    return d;
  }
  function refresh() { try { renderCharacterSheet(); } catch (e) {} try { saveState(true); } catch (e) {} paint(); }
  function apply() {
    var c = calculateSheet(), d = dg();
    var pv = Math.round(c.pvMax * 0.10), pm = Math.round(c.pmMax * 0.10);
    d.pvLoss += pv; d.pmLoss += pm;
    d.log.push({ at: new Date().toISOString(), date: state.campaignDate || '', pvFrom: c.pvMax, pmFrom: c.pmMax, pv: pv, pm: pm });
    var r = state.charSheet.resources, nc = calculateSheet();
    if (r.pvCurrent != null && +r.pvCurrent > nc.pvMax) r.pvCurrent = nc.pvMax;
    if (r.pmCurrent != null && +r.pmCurrent > nc.pmMax) r.pmCurrent = nc.pmMax;
    if (typeof toast === 'function') toast('PORTÕES DA MORTE: PV ' + c.pvMax + '→' + nc.pvMax + ' · PM ' + c.pmMax + '→' + nc.pmMax);
    refresh();
  }
  function undo() {
    var d = dg(), e = d.log.pop(); if (!e) return;
    d.pvLoss = Math.max(0, d.pvLoss - e.pv); d.pmLoss = Math.max(0, d.pmLoss - e.pm);
    if (typeof toast === 'function') toast('PERDA RECUPERADA: +' + e.pv + ' PV · +' + e.pm + ' PM MÁX.');
    refresh();
  }
  var armed = false, armT = 0;
  function paint() {
    var host = $('#characterPage .hs-bars') || ($('#characterPage .hs-bar.pm') || {}).parentNode;
    var box = document.getElementById('deathGatesBox');
    if (!host || typeof state === 'undefined' || !state.charSheet) return;
    if (!isDeath()) { if (box) box.hidden = true; return; }
    if (!box) {
      box = document.createElement('div'); box.id = 'deathGatesBox'; box.className = 'dgx';
      host.parentNode.insertBefore(box, host.nextSibling);
      box.addEventListener('click', function (e) {
        if (e.target.closest('[data-dg-apply]')) {
          if (!armed) { armed = true; clearTimeout(armT); armT = setTimeout(function () { armed = false; paint(); }, 4000); paint(); return; }
          armed = false; apply();
        } else if (e.target.closest('[data-dg-undo]')) undo();
      });
    }
    box.hidden = false;
    var d = dg(), c = calculateSheet(), pv = Math.round(c.pvMax * .1), pm = Math.round(c.pmMax * .1);
    box.innerHTML =
      '<div class="dgx-info"><small>XIII · PORTÕES DA MORTE</small>' +
      '<span>' + (d.log.length ? 'Perdas permanentes: <b>−' + d.pvLoss + ' PV</b> · <b>−' + d.pmLoss + ' PM</b> máx. (' + d.log.length + 'x)' : 'Nenhuma perda registrada.') + '</span></div>' +
      '<button type="button" class="dgx-apply' + (armed ? ' armed' : '') + '" data-dg-apply title="−10% dos PV e PM máximos atuais">' +
        (armed ? 'Confirmar: ' + c.pvMax + '→' + (c.pvMax - pv) + ' PV · ' + c.pmMax + '→' + (c.pmMax - pm) + ' PM' : '☠ Aplicar perda — Morrendo involuntário') + '</button>' +
      (d.log.length ? '<button type="button" class="dgx-undo" data-dg-undo title="Desfaz a última perda (Final Hit ou clique errado)">↺ Recuperar última</button>' : '');
  }
  function init() {
    if (typeof state === 'undefined' || !state.charSheet) { setTimeout(init, 300); return; }
    paint();
    document.addEventListener('change', function (e) { if (e.target && e.target.matches && e.target.matches('[data-sheet="profile.arcana"], select')) setTimeout(paint, 60); }, true);
    setInterval(function () { var b = document.getElementById('deathGatesBox'); if (!b || !b.isConnected || b.hidden === isDeath()) paint(); }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

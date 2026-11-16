/* PERSONA // PHOBIA — dissonant-look.js
   Visual novo do Arquivo Dissonante (página Persona): carta invertida
   e rachada com o numeral. Só aparência; a escolha e os textos
   continuam vindo do mesmo select/data-sheet. */
(function () {
  'use strict';
  var CRACK = 'M52 0 L46 38 L58 64 L40 104 L54 132 L44 170 L50 210';
  function paint() {
    var sec = document.getElementById('personaDissonantSection'); if (!sec) return;
    var card = sec.querySelector('.dz-card');
    if (!card) {
      card = document.createElement('div'); card.className = 'dz-card'; card.setAttribute('aria-hidden', 'true');
      card.innerHTML = '<div class="dz-card-in"><span class="dz-card-top">DISSONANTE</span><b class="dz-card-num">?</b><span class="dz-card-name">—</span>' +
        '<svg class="dz-crack" viewBox="0 0 100 210" preserveAspectRatio="none"><path d="' + CRACK + '"/><path class="b" d="M46 38 L30 52 M58 64 L76 72 M40 104 L24 116 M54 132 L72 146"/></svg></div>';
      sec.insertBefore(card, sec.firstChild);
      sec.classList.add('dz-on');
    }
    var sel = document.getElementById('sheetDissonantArcanaSelect'), v = sel ? sel.value : '';
    var opt = sel && sel.selectedOptions[0], nm = v && opt ? opt.textContent.replace(/^[IVXL]+\s*—\s*/, '') : 'SEM DISSONÂNCIA';
    card.querySelector('.dz-card-num').textContent = v || '?';
    card.querySelector('.dz-card-name').textContent = nm;
    sec.classList.toggle('dz-empty', !v);
    var rec = document.getElementById('personaDissonantRecap');
    if (rec) rec.classList.add('dz-recap');
  }
  function init() {
    paint();
    document.addEventListener('change', function (e) { if (e.target && /Dissonant/.test(e.target.id || '')) setTimeout(paint, 30); }, true);
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#sheet-tab-persona')) setTimeout(paint, 60); }, true);
    setInterval(paint, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

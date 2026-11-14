/* PERSONA // PHOBIA — deck-file.js
   Repaginação do botão de Notas e do menu Arquivo da barra de baixo.
   Os ids e funções originais continuam os mesmos. */
(function () {
  'use strict';
  function $(s) { return document.querySelector(s); }
  function fmt(n) { if (!isFinite(n)) return '—'; var u = ['B', 'KB', 'MB', 'GB']; var i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++; } return (i ? n.toFixed(n < 10 ? 1 : 0) : n) + ' ' + u[i]; }
  function meter() {
    var bar = $('#dfMeter'), txt = $('#dfMeterTxt'); if (!bar) return;
    var est = navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.reject();
    est.then(function (e) {
      var pct = e.quota ? Math.max(1, Math.min(100, (e.usage || 0) / e.quota * 100)) : 0;
      bar.style.width = pct.toFixed(1) + '%';
      bar.parentNode.classList.toggle('warn', pct > 80);
      txt.textContent = fmt(e.usage || 0) + ' de ' + fmt(e.quota || 0) + ' usados';
    }).catch(function () { txt.textContent = 'Armazenamento ampliado ativo'; });
  }
  function init() {
    var note = $('#openNotesFoot'), tog = $('#footerFileToggle'), menu = $('#footerFileMenu');
    if (!note || !tog || !menu || menu.dataset.df) return;
    menu.dataset.df = '1';
    note.classList.add('df-note');
    note.innerHTML = '<span class="df-paper"><i></i><i></i><i></i></span><b class="df-pin"></b><em>NOTAS</em>';
    tog.classList.add('df-file');
    tog.innerHTML = '<span class="df-disk"><i></i></span><em>ARQUIVO</em>';
    tog.setAttribute('aria-label', 'Arquivo: salvar, backup e importar');
    tog.setAttribute('aria-haspopup', 'true');

    var title = menu.querySelector('.file-menu-title');
    if (title) title.innerHTML = '<small>SAVE DATA //</small><b>ARQUIVO</b>';
    var rows = [
      ['#saveBtn', '💾', 'SALVAR AGORA', 'Grava tudo neste navegador'],
      ['#exportBtn', '↓', 'BACKUP JSON', 'Baixa um arquivo com a ficha e as fotos'],
    ];
    rows.forEach(function (r) {
      var b = menu.querySelector(r[0]); if (!b) return;
      b.classList.add('df-row');
      b.innerHTML = '<i>' + r[1] + '</i><span><b>' + r[2] + '</b><small>' + r[3] + '</small></span>';
    });
    var imp = menu.querySelector('label');
    if (imp) {
      var input = imp.querySelector('input');
      imp.classList.add('df-row');
      imp.innerHTML = '<i>↑</i><span><b>IMPORTAR JSON</b><small>Abre um backup salvo antes</small></span>';
      if (input) imp.appendChild(input);
    }
    var fx = document.createElement('button');
    fx.type = 'button'; fx.className = 'df-row df-fichas';
    fx.innerHTML = '<i>🗂</i><span><b>FICHAS</b><small>Trocar de personagem ou criar outra</small></span>';
    fx.addEventListener('click', function () { menu.classList.remove('open'); if (window.PhobiaFichas) window.PhobiaFichas.open(); });
    (imp || menu.lastChild).insertAdjacentElement('afterend', fx);

    var info = menu.querySelector('.large-save-info');
    if (info) {
      info.classList.add('df-info');
      var meterEl = document.createElement('div');
      meterEl.className = 'df-meter';
      meterEl.innerHTML = '<span><i id="dfMeter"></i></span><small id="dfMeterTxt">Verificando espaço…</small>';
      info.insertBefore(meterEl, info.querySelector('#largeSaveUsage'));
    }
    tog.addEventListener('click', function () { setTimeout(function () { tog.setAttribute('aria-expanded', String(menu.classList.contains('open'))); if (menu.classList.contains('open')) meter(); }, 0); });
    meter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

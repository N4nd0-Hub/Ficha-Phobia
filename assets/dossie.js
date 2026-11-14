/* PERSONA // PHOBIA — dossie.js
   Dossiê repaginado: seções numeradas, nº de arquivo automático,
   aba da pasta com o codinome. Os campos e a gravação continuam
   os mesmos (data-sheet). */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function S() { try { return state; } catch (e) { return null; } }
  var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function fileNo() {
    var st = S() || {}, id = (st.saveMeta && st.saveMeta.fichaId) || ((st.charSheet || {}).profile || {}).name || 'phobia', h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return 'PHB-00-' + String(h % 10000).padStart(4, '0');
  }
  function sec(n, t, sub) { var d = document.createElement('div'); d.className = 'dz-sec'; d.innerHTML = '<b>' + n + '</b><span>' + t + '</span>' + (sub ? '<small>' + sub + '</small>' : ''); return d; }
  function build() {
    var file = $('#sheet-panel-record .record-file'); if (!file || file.dataset.dz) return !!file;
    file.dataset.dz = '1';
    var tab = document.createElement('div'); tab.className = 'dz-tab'; tab.innerHTML = '<small>ARTIST FILE</small><b id="dzTabName">—</b>';
    file.insertBefore(tab, file.firstChild);
    var logo = $('.record-logo', file);
    if (logo) logo.innerHTML = '<i class="dz-vinyl" aria-hidden="true"></i><span>RECORD LABEL</span>';
    var num = $('.record-number', file);
    if (num) num.innerHTML = '<small>FILE NO.</small><b id="dzFileNo">' + fileNo() + '</b><small id="dzFileDate">APR 2000</small>';
    var app = $('.record-application', file);
    if (app) app.innerHTML = '<span>ARTIST APPLICATION FILE</span><small>FORM A-7 // USO INTERNO</small>';
    var grid = $('.record-grid', file);
    if (grid) {
      var name = $('[data-sheet="profile.name"]', grid), band = $('[data-sheet="profile.band"]', grid);
      if (name) grid.insertBefore(sec('01', 'IDENTIFICAÇÃO', 'Dados pessoais do artista'), name.closest('label'));
      if (band) grid.insertBefore(sec('02', 'PERFIL MUSICAL', 'Banda, função e instrumento'), band.closest('label'));
    }
    var bio = $('.record-bio', file); if (bio) bio.parentNode.insertBefore(sec('03', 'HISTÓRICO', 'Quem é, de onde veio, o que procura'), bio);
    var ex = $('.record-extras', file);
    if (ex) { ex.open = true; ex.parentNode.insertBefore(sec('04', 'CARREIRA', 'Experiência musical e objetivos'), ex); }
    var mem = $('#sheet-panel-record .record-memories > header h3');
    if (mem) mem.innerHTML = 'MEMÓRIAS <small>// ARQUIVO DE FOTOS</small>';
    return true;
  }
  function refresh() {
    var st = S(); if (!st || !build()) return;
    var p = (st.charSheet || {}).profile || {};
    var t = $('#dzTabName'); if (t) t.textContent = (p.codename || p.name || 'SEM NOME').toUpperCase();
    var n = $('#dzFileNo'); if (n) n.textContent = fileNo();
    var d = $('#dzFileDate');
    if (d) { var k = String(st.campaignDate || '2000-04-17').split('-'); d.textContent = (k[2] || '17') + ' ' + (MON[(+k[1] || 4) - 1]) + ' ' + (k[0] || '2000'); }
  }
  function init() {
    refresh();
    document.addEventListener('input', function (e) { if (e.target.matches && e.target.matches('[data-sheet="profile.name"],[data-sheet="profile.codename"]')) refresh(); }, true);
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#sheet-tab-record')) setTimeout(refresh, 30); }, true);
    setInterval(refresh, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

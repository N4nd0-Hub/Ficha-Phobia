/* ==========================================================
   PERSONA // PHOBIA — bonds-net.js   (aba VÍNCULOS)
   • "Rede de Confidentes": seu personagem no centro e cada vínculo
     ao redor; a linha fica mais forte conforme o Rank. Clique para abrir.
   • Carta de Arcana do vínculo selecionado (foto, numeral, Rank).
   • Rank em 10 estrelas clicáveis, com aviso "RANK UP!" ao subir.
   Usa os dados e funções existentes (ensureBondState, bondById, ...).
   Os campos usam os mesmos data-bond-* que a ficha já salva.
   ========================================================== */
(function () {
  'use strict';
  if (window.__bondNet) return; window.__bondNet = true;

  var TONES = ['var(--hud-acc,#ef2b97)', 'var(--hud-acc2,#6ce6ff)', '#ffda4d', 'var(--hud-acc3,#96ff45)', '#c8aaff', '#ff8a5c'];
  var lastLevels = {}, pendingUp = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function reduced() { return document.body.classList.contains('hs-calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function lv(b) { return Math.max(0, Math.min(10, Number(b && b.level) || 0)); }
  function roman(b) { var m = String(b.arcana || '').match(/^(?:0|[IVX]+)(?=\s|$)/i); return m ? m[0].toUpperCase() : '✦'; }
  function arcName(b) { var a = String(b.arcana || '').replace(/^(?:0|[IVX]+)\s*[—–-]\s*/i, ''); return a || 'Arcana indefinida'; }
  function sel() { try { return selectedBondId; } catch (e) { return ''; } }
  function okImg(src) { return /^data:image\/(?:png|jpeg|webp|gif);base64,[\w+/=]+$/.test(String(src || '')); }

  /* ---------- rede ---------- */
  function network(items, current) {
    var sheet = (typeof state !== 'undefined' && state.charSheet) || {};
    var me = (sheet.profile && (sheet.profile.codename || sheet.profile.name)) || 'Você';
    var n = items.length, nodes = '', lines = '';
    var ring2 = n > 8;
    items.forEach(function (b, i) {
      var inner = ring2 && i % 2 === 1;
      var a = (i / n) * Math.PI * 2 - Math.PI / 2;
      var small = window.innerWidth < 760;
      var rx = inner ? 24 : (small ? 36 : 40), ry = inner ? 26 : (small ? 33 : 38);
      var x = 50 + Math.cos(a) * rx, y = 50 + Math.sin(a) * ry, L = lv(b), t = TONES[i % TONES.length];
      lines += '<line x1="50" y1="50" x2="' + x.toFixed(2) + '" y2="' + y.toFixed(2) + '" style="--t:' + t + ';--w:' + (0.25 + L * 0.09).toFixed(2) + ';--o:' + (0.25 + L * 0.075).toFixed(2) + '" class="' + (b.id === current ? 'on' : '') + (L >= 10 ? ' max' : '') + '"/>';
      nodes += '<button type="button" class="bn-node' + (b.id === current ? ' on' : '') + (L >= 10 ? ' max' : '') + '" data-bond-select="' + E(b.id) + '" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;--t:' + t + ';--d:' + (i * 50) + 'ms" aria-pressed="' + (b.id === current) + '" aria-label="' + E((b.name || 'Novo vínculo') + ', Rank ' + L) + '">' +
        '<span class="bn-face">' + (okImg(b.imageData) ? '<img src="' + b.imageData + '" alt="" loading="lazy" decoding="async">' : '<i>' + E(roman(b)) + '</i>') + '</span>' +
        '<span class="bn-rank">' + (L >= 10 ? 'MAX' : L) + '</span>' +
        '<span class="bn-label"><b>' + E(b.name || 'Novo vínculo') + '</b><small>' + E(roman(b)) + ' · ' + E(arcName(b)) + '</small></span></button>';
    });
    var center = '<div class="bn-me"><span class="bn-face">' + (okImg(sheet.photoData) || /^data:image/.test(String(sheet.photoData || '')) ? '<img src="' + E(sheet.photoData) + '" alt="">' : '<i>★</i>') + '</span><b>' + E(me) + '</b></div>';
    return '<div class="bn-map"><svg class="bn-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + lines + '</svg>' + center + nodes +
      (n ? '' : '<p class="bn-empty">Ninguém por perto ainda. Crie o primeiro vínculo e ele aparece aqui, ligado a você.</p>') + '</div>';
  }

  function summary(items) {
    var max = items.filter(function (b) { return lv(b) >= 10; }).length;
    var avg = items.length ? items.reduce(function (s, b) { return s + lv(b); }, 0) / items.length : 0;
    var best = items.slice().sort(function (a, b) { return lv(b) - lv(a); })[0];
    return '<div class="bn-stats">' +
      '<div><small>VÍNCULOS</small><b>' + items.length + '</b></div>' +
      '<div><small>RANK MÉDIO</small><b>' + avg.toFixed(1).replace('.', ',') + '</b></div>' +
      '<div class="gold"><small>NO MÁXIMO</small><b>' + max + '</b></div>' +
      (best ? '<div class="best"><small>MAIS PRÓXIMO</small><b>' + E(best.name || 'Novo vínculo') + '</b></div>' : '') +
      '<button type="button" class="bn-add" data-bond-add>＋ NOVO VÍNCULO</button></div>';
  }

  /* ---------- carta + editor do vínculo selecionado ---------- */
  function stars(L) {
    var s = '';
    for (var i = 1; i <= 10; i++) s += '<button type="button" class="bn-star' + (i <= L ? ' lit' : '') + '" data-bn-rank="' + i + '" aria-label="Rank ' + i + '" style="--i:' + i + '">★</button>';
    return s;
  }
  function detail(b, index) {
    var L = lv(b), t = TONES[index % TONES.length], photo = okImg(b.imageData);
    return '<article class="bn-card" data-bond-id="' + E(b.id) + '" style="--t:' + t + '">' +
      '<div class="bn-tarot' + (L >= 10 ? ' max' : '') + '">' +
        '<div class="bn-tarot-in">' +
          '<span class="bn-tarot-num">' + E(roman(b)) + '</span>' +
          '<button type="button" class="bn-tarot-photo" data-bond-photo="' + E(b.id) + '" aria-label="Adicionar ou trocar foto">' + (photo ? '<img src="' + b.imageData + '" alt="Foto de ' + E(b.name || 'vínculo') + '">' : '<span><b>✦</b><small>TOQUE PARA<br>ADICIONAR FOTO</small></span>') + '</button>' +
          '<div class="bn-tarot-name"><small>SOCIAL LINK // ' + E(b.arcana || 'ARCANA INDEFINIDA') + '</small><b>' + E(b.name || 'NOVO VÍNCULO') + '</b></div>' +
          '<div class="bn-tarot-rank"><small>RANK</small><b>' + L + '</b></div>' +
          (L >= 10 ? '<span class="bn-max-seal">MAX</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="bn-edit">' +
        '<div class="bn-rankbar"><header><small>RANK DO VÍNCULO</small><b>' + L + ' / 10</b></header>' +
          '<div class="bn-stars">' +
            '<button type="button" class="bn-step" data-bn-step="-1" aria-label="Diminuir Rank">−</button>' + stars(L) +
            '<button type="button" class="bn-step" data-bn-step="1" aria-label="Aumentar Rank">＋</button></div>' +
        '</div>' +
        '<div class="bn-fields">' +
          '<label>NOME<input data-bond-field="name" value="' + E(b.name || '') + '" placeholder="Nome do personagem" maxlength="140"></label>' +
          '<label>ARCANA<input data-bond-field="arcana" list="bondArcanaCatalog" value="' + E(b.arcana || '') + '" placeholder="Escolha ou digite uma Arcana" maxlength="85" autocomplete="off"></label>' +
        '</div>' +
        '<label class="bn-text benefits"><span><b>✦ BENEFÍCIOS</b><small>O que esse vínculo já te deu</small></span><textarea data-bond-field="benefits" rows="4" placeholder="Registre os benefícios de cada Rank…">' + E(b.benefits || '') + '</textarea></label>' +
        '<label class="bn-text description"><span><b>▤ HISTÓRIA</b><small>Como se conheceram, o que mudou</small></span><textarea data-bond-field="description" rows="4" placeholder="Como se conheceram? O que essa pessoa significa?">' + E(b.description || '') + '</textarea></label>' +
        '<footer class="bn-actions">' +
          '<button type="button" data-bond-photo="' + E(b.id) + '">' + (photo ? '↻ Trocar foto' : '＋ Enviar foto') + '</button>' +
          (photo ? '<button type="button" data-bond-clear-photo="' + E(b.id) + '">Remover foto</button>' : '') +
          '<button type="button" class="del" data-bond-remove="' + E(b.id) + '">✕ Excluir vínculo</button>' +
        '</footer>' +
      '</div>' +
      '<div class="bn-rankup" aria-hidden="true"></div>' +
    '</article>';
  }

  function render() {
    var page = $('#sheetBondsPage'); if (!page) return;
    var s; try { s = ensureBondState(); } catch (e) { return; }
    var items = s.items, cur = sel();
    var top = $('#bnTop');
    if (!top) {
      top = document.createElement('section'); top.id = 'bnTop'; top.className = 'bn-top';
      var layout = page.querySelector('.bond-layout'); page.insertBefore(top, layout);
    }
    top.innerHTML = '<header class="bn-head"><div><small>08 // SOCIAL LINKS · TOKYO 2000</small><b>REDE DE <span>CONFIDENTES</span></b></div>' + summary(items) + '</header>' + network(items, cur);
    var grid = $('#bondGrid'); if (!grid) return;
    var idx = items.findIndex(function (b) { return b.id === cur; });
    if (idx >= 0) grid.innerHTML = detail(items[idx], idx);
    /* "RANK UP!" quando o Rank sobe */
    if (pendingUp && pendingUp.id === cur && !reduced()) rankUp(pendingUp);
    pendingUp = null;
    items.forEach(function (b) { lastLevels[b.id] = lv(b); });
  }
  window.renderBondNet = render;

  function rankUp(info) {
    var box = $('#bondGrid .bn-rankup'); if (!box) return;
    box.innerHTML = '<div class="bn-ru-band"><b>' + (info.to >= 10 ? 'RANK MAX!' : 'RANK UP!') + '</b><small>' + E(info.name) + ' · RANK ' + info.from + ' → ' + info.to + '</small></div>';
    box.classList.remove('go'); void box.offsetWidth; box.classList.add('go');
    var st = document.querySelectorAll('#bondGrid .bn-star.lit');
    st.forEach(function (x, i) { if (i >= info.from) { x.classList.add('pop'); } });
    var card = $('#bondGrid .bn-tarot'); if (card) { card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip'); }
  }

  function setRank(n) {
    var b; try { b = bondById(sel()); } catch (e) { return; }
    if (!b) return;
    var from = lv(b), to = Math.max(0, Math.min(10, n));
    if (to === from) return;
    b.level = to;
    if (to > from) pendingUp = { id: b.id, from: from, to: to, name: b.name || 'Vínculo' };
    try { renderBondsPage(); saveState(true); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var st = e.target.closest && e.target.closest('#sheetBondsPage [data-bn-rank]');
    if (st) { var n = +st.dataset.bnRank, b = bondById(sel()); setRank(b && lv(b) === n ? n - 1 : n); return; }
    var sp = e.target.closest && e.target.closest('#sheetBondsPage [data-bn-step]');
    if (sp) { var b2 = bondById(sel()); if (b2) setRank(lv(b2) + Number(sp.dataset.bnStep)); }
  });
  /* campos do vínculo: salvamos aqui (antes do código antigo, que espera o cartão antigo) */
  document.addEventListener('input', function (e) {
    var f = e.target.closest && e.target.closest('#bondGrid .bn-card [data-bond-field]');
    if (!f) return;
    e.stopImmediatePropagation();
    var field = f.dataset.bondField;
    if (['name', 'arcana', 'benefits', 'description'].indexOf(field) < 0) return;
    var b = bondById(f.closest('[data-bond-id]').dataset.bondId); if (!b) return;
    b[field] = f.value;
    if (field === 'name' || field === 'arcana') {
      var card = f.closest('.bn-card');
      var nm = card.querySelector('.bn-tarot-name');
      if (nm) { nm.querySelector('b').textContent = b.name || 'NOVO VÍNCULO'; nm.querySelector('small').textContent = 'SOCIAL LINK // ' + (b.arcana || 'ARCANA INDEFINIDA'); }
      var num = card.querySelector('.bn-tarot-num'); if (num) num.textContent = roman(b);
      var map = document.querySelector('#bnTop .bn-map'); if (map) map.outerHTML = network(ensureBondState().items, sel());
    }
    try { saveState(true); } catch (x) {}
  }, true);

  function wrap(name) {
    var o = window[name]; if (typeof o !== 'function' || o.__bn) return;
    var w = function () { var r = o.apply(this, arguments); try { render(); } catch (e) { console.warn(e); } return r; };
    w.__bn = true; window[name] = w;
  }
  function init() {
    if (typeof renderBondsPage !== 'function' || typeof state === 'undefined' || !state.charSheet || !document.getElementById('sheetBondsPage')) { setTimeout(init, 200); return; }
    wrap('renderBondsPage');
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

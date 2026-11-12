/* ==========================================================
   PERSONA // PHOBIA — traits-deck.js   (aba VANTAGENS)
   • "Carteira de pontos": cada Ponto de Vantagem é uma ficha.
     As gastas viram e mostram a cor da Vantagem que as usou.
     Passar o mouse em "Comprar" acende as fichas que serão gastas.
   • "Sua mão": Vantagens e Defeitos adquiridos como cartas em leque.
   • Cartas do catálogo com estado (pode pegar / travada / adquirida),
     e carimbo animado ao comprar.
   Usa só as funções existentes (traitBudget, traitIsOwned, ...).
   ========================================================== */
(function () {
  'use strict';
  if (window.__trDeck) return; window.__trDeck = true;

  var CAT = { REL: '#ff5fa8', COM: 'var(--hud-acc2,#6ce6ff)', EST: 'var(--hud-acc3,#96ff45)', REC: '#ffda4d', REP: '#ff83d6', AUT: '#c8aaff', ARC: '#c8b3ff' };
  var CAT_ICON = { REL: '♥', COM: '✆', EST: '✎', REC: '◆', REP: '★', AUT: '◐', ARC: '☾' };
  var prevOwned = null, prevSpent = -1, prevTotal = -1;

  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function reduced() { return document.body.classList.contains('hs-calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function tone(n) { return 'var(--tr-point-' + Math.max(1, Math.min(5, n || 1)) + ')'; }

  /* ---------- carteira ---------- */
  function wallet(b, owned) {
    var adv = owned.filter(function (i) { return i.kind === 'vantagem'; });
    var flaws = owned.filter(function (i) { return i.kind !== 'vantagem'; });
    /* fichas: de onde vieram (I inicial, M mestre, D defeito) */
    var src = [];
    src.push({ s: 'I', t: 'Ponto inicial' });
    for (var m = 0; m < b.extra; m++) src.push({ s: 'M', t: 'Concedido pelo Mestre' });
    flaws.forEach(function (f) { var n = f.kind === 'dissonante' ? 5 : f.points; for (var k = 0; k < n; k++) src.push({ s: f.kind === 'dissonante' ? '☾' : 'D', t: 'Do Defeito ' + f.name }); });
    /* quem gastou cada ficha */
    var use = [];
    adv.slice().sort(function (a, c) { return a.points - c.points || a.name.localeCompare(c.name, 'pt-BR'); }).forEach(function (a) { for (var k = 0; k < a.points; k++) use.push(a); });
    var n = Math.max(src.length, use.length), coins = '';
    var shownMax = 24;
    for (var i = 0; i < Math.min(n, shownMax); i++) {
      var s = src[i] || { s: '!', t: 'Ponto além do orçamento' }, u = use[i];
      var cls = 'trw-coin' + (u ? ' is-spent' : '') + (!src[i] ? ' is-debt' : '') + (u && i >= prevSpent && prevSpent >= 0 ? ' just-spent' : '') + (!u && i >= prevTotal && prevTotal >= 0 && i < src.length ? ' just-got' : '');
      coins += '<span class="' + cls + '" data-i="' + i + '" title="' + E(u ? 'Gasto em ' + u.name : s.t) + '" style="--d:' + (i * 30) + 'ms' + (u ? ';--ct:' + tone(u.points) : '') + '"><i class="f">' + E(s.s) + '</i><i class="b">' + E(u ? (CAT_ICON[u.category_id] || '✦') : '') + '</i></span>';
    }
    if (n > shownMax) coins += '<span class="trw-more">+' + (n - shownMax) + '</span>';
    return '<div class="trw" id="trWallet">' +
      '<div class="trw-big' + (b.available < 0 ? ' is-neg' : b.available === 0 ? ' is-zero' : '') + '"><small>PONTOS LIVRES</small><b>' + b.available + '</b></div>' +
      '<div class="trw-body"><div class="trw-coins">' + coins + '</div>' +
      '<div class="trw-legend"><span><i class="lg">I</i>inicial</span><span><i class="lg">D</i>de Defeitos · ' + b.flawPoints + '/5</span>' + (b.extra ? '<span><i class="lg">M</i>do Mestre</span>' : '') + '<span><i class="lg sp"></i>gastos · ' + b.spent + '</span><span class="trw-lim">' + b.flawCount + '/3 Defeitos</span></div></div>' +
    '</div>';
  }

  /* ---------- mão de cartas ---------- */
  function hand(owned) {
    var adv = owned.filter(function (i) { return i.kind === 'vantagem'; });
    var flaws = owned.filter(function (i) { return i.kind !== 'vantagem'; });
    function fan(list, kind) {
      var n = list.length, mid = (n - 1) / 2;
      var cards = list.map(function (it, k) {
        var rot = n > 1 ? (k - mid) * Math.min(7, 26 / n) : 0, lift = Math.abs(k - mid) * Math.min(6, 18 / n);
        if (window.PhobiaTraitCards) return PhobiaTraitCards.hand(it, kind, rot.toFixed(1), lift.toFixed(1));
        return '<button type="button" class="trh-card ' + kind + '" data-trait-action="details" data-trait-id="' + E(it.id) + '" style="--r:' + rot.toFixed(1) + 'deg;--y:' + lift.toFixed(1) + 'px;--ct:' + (kind === 'flaw' ? (it.kind === 'dissonante' ? '#c8b3ff' : '#ff4d6a') : tone(it.points)) + ';--cc:' + (CAT[it.category_id] || '#fff') + ';z-index:' + (10 + k) + '">' +
          '<span class="trh-pt">' + (kind === 'flaw' ? '+' : '') + (it.kind === 'dissonante' ? 5 : it.points) + '</span>' +
          '<span class="trh-ic">' + (CAT_ICON[it.category_id] || '✦') + '</span>' +
          '<b>' + E(it.name) + '</b><small>' + E(it.kind === 'dissonante' ? 'Arcana ' + it.roman : it.category) + '</small></button>';
      }).join('');
      var empty = '<button type="button" class="trh-card trh-empty ' + kind + '" data-trait-browse="' + (kind === 'adv' ? 'vantagens' : 'defeitos') + '"><span class="trh-ic">＋</span><b>' + (kind === 'adv' ? 'Escolher Vantagem' : 'Assumir Defeito') + '</b></button>';
      return '<div class="trh-fan">' + (cards || empty) + '</div>';
    }
    return '<div class="trh" id="trHand">' +
      '<section class="trh-side adv"><header><small>SUA MÃO</small><b>VANTAGENS · ' + adv.length + '</b></header>' + fan(adv, 'adv') + '</section>' +
      '<section class="trh-side flaw"><header><small>O PREÇO</small><b>DEFEITOS · ' + flaws.length + '</b></header>' + fan(flaws, 'flaw') + '</section>' +
    '</div>';
  }

  /* ---------- cartas do catálogo ---------- */
  function decorate(justId) {
    if (justId && !reduced()) document.querySelectorAll('#traitGrid .tcx').forEach(function (c) {
      if (c.dataset.traitId === justId) { c.classList.add('tcx-just'); setTimeout(function () { c.classList.remove('tcx-just'); }, 1200); }
    });
    document.querySelectorAll('#traitGrid .tr-card').forEach(function (card) {
      var it = null; try { it = traitById(card.dataset.traitId); } catch (e) {}
      if (!it) return;
      card.style.setProperty('--cc', CAT[it.category_id] || '#fff');
      var owned = card.classList.contains('is-owned');
      var restricted = !!card.querySelector('.tr-restriction');
      card.classList.toggle('is-locked', !owned && restricted);
      card.classList.toggle('is-ready', !owned && !restricted);
      if (!card.querySelector('.trc-ic')) {
        var h = card.querySelector('.tr-card-head');
        if (h) h.insertAdjacentHTML('afterbegin', '<span class="trc-ic" aria-hidden="true">' + (CAT_ICON[it.category_id] || '✦') + '</span>');
      }
      if (owned && !card.querySelector('.trc-stamp')) card.insertAdjacentHTML('beforeend', '<span class="trc-stamp" aria-hidden="true">' + (it.kind === 'vantagem' ? 'ADQUIRIDA' : 'ASSUMIDO') + '</span>');
      if (justId && it.id === justId && !reduced()) {
        card.classList.add('trc-just');
        setTimeout(function () { card.classList.remove('trc-just'); }, 1100);
      }
    });
  }

  function render() {
    var root = $('#sheetTraitsPage'); if (!root) return;
    var b, owned;
    try { b = traitBudget(); owned = ALL_CHARACTER_TRAITS.filter(function (i) { return traitIsOwned(i); }); } catch (e) { return; }
    var top = $('#trTop');
    if (!top) {
      top = document.createElement('section'); top.id = 'trTop'; top.className = 'tr-top';
      var hero = root.querySelector('.tr-hero'); root.insertBefore(top, hero);
    }
    var ids = owned.map(function (i) { return i.id; });
    var justId = prevOwned ? ids.filter(function (id) { return prevOwned.indexOf(id) < 0; })[0] : null;
    top.innerHTML =
      '<header class="tr-top-head"><div><small>07 // ESCOLHAS DO PERSONAGEM</small><b>VANTAGENS <span>&amp; DEFEITOS</span></b></div>' +
      '<p>Gaste fichas em <b>Vantagens</b>. Assuma <b>Defeitos</b> para ganhar mais fichas (até 5 pontos e 3 escolhas).</p></header>' +
      wallet(b, owned) + hand(owned);
    prevOwned = ids; prevSpent = b.spent; prevTotal = b.total;
    decorate(justId);
  }
  window.renderTraitsDeck = render;

  /* passar o mouse em "Comprar": acende as fichas que serão gastas */
  function preview(n) {
    var free = document.querySelectorAll('#trWallet .trw-coin:not(.is-spent):not(.is-debt)');
    free.forEach(function (c, i) { c.classList.toggle('is-preview', n > 0 && i < n); c.classList.toggle('is-short', n > free.length && i < n); });
    var big = $('#trWallet .trw-big'); if (big) big.classList.toggle('is-preview', n > 0);
  }
  document.addEventListener('pointerover', function (e) {
    var bt = e.target.closest && e.target.closest('#sheetTraitsPage [data-trait-action="acquire"]');
    if (!bt) return;
    var it = null; try { it = traitById(bt.dataset.traitId); } catch (x) {}
    if (it && it.kind === 'vantagem') preview(it.points);
  });
  document.addEventListener('pointerout', function (e) {
    var bt = e.target.closest && e.target.closest('#sheetTraitsPage [data-trait-action="acquire"]');
    if (bt && !bt.contains(e.relatedTarget)) preview(0);
  });
  /* clicar no corpo da carta abre o efeito completo */
  document.addEventListener('click', function (e) {
    var card = e.target.closest && e.target.closest('#traitGrid .tr-card, #traitGrid .tcx');
    if (!card || e.target.closest('button,a,input,select,label')) return;
    try { openTraitDialog(card.dataset.traitId); } catch (x) {}
  });

  function wrap(name) {
    var o = window[name]; if (typeof o !== 'function' || o.__trd) return;
    var w = function () { var r = o.apply(this, arguments); try { render(); } catch (e) { console.warn(e); } return r; };
    w.__trd = true; window[name] = w;
  }
  function init() {
    if (typeof renderTraitsPage !== 'function' || typeof state === 'undefined' || !state.charSheet || !document.getElementById('sheetTraitsPage')) { setTimeout(init, 200); return; }
    wrap('renderTraitsPage');
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ==========================================================
   PERSONA // PHOBIA — traits-cards.js   (aba VANTAGENS)
   Cartas novas para o catálogo de Vantagens, Defeitos e
   Arcanas Dissonantes, e para a "mão" no topo da aba.
   Substitui traitCardHTML() mantendo os mesmos botões
   (data-trait-action / data-trait-id), então compra, remoção
   e detalhes continuam usando o código original.
   ========================================================== */
(function () {
  'use strict';
  if (window.PhobiaTraitCards) return;

  /* ícones por categoria */
  var SV = {
    CBT: '<path d="M4 20 15 9M15 9l2-5 3 3-5 2M9 15l-3 3M6 13l5 5"/><path d="M20 20 9 9M9 9 7 4 4 7l5 2M15 15l3 3M18 13l-5 5"/>',
    ATT: '<path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12"/>',
    SOC: '<path d="M4 5h11v8H9l-4 3v-3H4Z"/><path d="M15 9h5v8h-1v3l-3-3h-5v-2"/>',
    PER: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    REL: '<path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/><path d="m12 6-2 4 4 3-2 4"/>',
    COM: '<path d="M4 5h16v11H9l-5 4Z"/><path d="m10 8 4 4m0-4-4 4"/>',
    EST: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4Z"/><path d="M20 4h-4a2 2 0 0 0-2 2"/><path d="M20 4v14h-6"/>',
    REC: '<rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 10h18M16 14h2"/><path d="M6 6l9-3 2 3"/>',
    REP: '<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.5-2 2-3 3.5-3s3 1 3.5 3M14 10h5M14 13h4"/>',
    AUT: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/>',
    ARC: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    ok: '<path d="m5 12 4 4L19 6"/>',
    warn: '<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3h.01"/>',
    loop: '<path d="M17 2l3 3-3 3"/><path d="M20 5H8a5 5 0 0 0-5 5v1M7 22l-3-3 3-3"/><path d="M4 19h12a5 5 0 0 0 5-5v-1"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'
  };
  var COLOR = {
    CBT: 'var(--hud-acc,#ef2b97)', ATT: 'var(--hud-acc2,#6ce6ff)', SOC: 'var(--hud-acc3,#96ff45)', PER: '#ffda4d',
    REL: '#ff5f7e', COM: '#ff8a5c', EST: '#f2c14e', REC: '#e0a458', REP: '#ff6fb5', AUT: '#c98bff', ARC: '#b9a2ff'
  };
  function ico(k, cls) { return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (SV[k] || SV.ARC) + '</svg>'; }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function catOf(item) { return item.kind === 'dissonante' ? 'ARC' : item.category_id; }

  function gem(item) {
    if (item.kind === 'vantagem') return '<span class="tcx-gem coin" title="Custa ' + item.points + ' ponto' + (item.points === 1 ? '' : 's') + '"><b>' + item.points + '</b><small>PT' + (item.points === 1 ? '' : 'S') + '</small></span>';
    if (item.kind === 'dissonante') return '<span class="tcx-gem moon" title="Concede 5 pontos"><b>+5</b><small>PTS</small></span>';
    return '<span class="tcx-gem seal" title="Concede ' + item.points + ' ponto' + (item.points === 1 ? '' : 's') + '"><b>+' + item.points + '</b><small>PT' + (item.points === 1 ? '' : 'S') + '</small></span>';
  }

  function cardHTML(item) {
    var owned = traitIsOwned(item), req = traitRequirements(item), error = traitChangeError(item, owned);
    var rec = state.charSheet.traits && state.charSheet.traits.purchases && state.charSheet.traits.purchases[item.id];
    var defs = (item.configuration || []).filter(function (f) { return rec && rec.configuration && rec.configuration[f.key]; });
    var cat = catOf(item), sub = item.kind === 'dissonante' ? 'ARCANA DISSONANTE · ' + item.roman : [item.category, item.subgroup].filter(Boolean).join(' · ');
    var st = owned ? 'is-owned' : error ? 'is-locked' : 'is-ready';
    var reqCls = !req.met ? 'bad' : req.narrative ? 'warn' : 'ok';
    var reqTxt = item.requirement || 'Nenhum';
    var meta = '<li class="req ' + reqCls + '">' + ico(reqCls === 'ok' ? 'ok' : 'warn') + '<span><b>Requer</b> ' + E(reqTxt) + (owned && !req.met ? ' · confira ' + E(req.missing.join(', ')) : '') + '</span></li>';
    if (item.kind === 'vantagem' && item.frequency) meta += '<li>' + ico('loop') + '<span><b>Uso</b> ' + E(item.frequency) + '</span></li>';
    var act = owned ? 'Remover' : item.kind === 'vantagem' ? 'Comprar' : item.kind === 'dissonante' ? (traitBudget().hasDissonant ? 'Trocar' : 'Assumir') : 'Assumir';
    var price = item.kind === 'vantagem' ? '−' + item.points : '+' + (item.kind === 'dissonante' ? 5 : item.points);
    return '<article class="tcx k-' + item.kind + ' ' + st + '" data-kind="' + item.kind + '" data-trait-points="' + item.points + '" data-trait-id="' + E(item.id) + '" style="--cc:' + (COLOR[cat] || 'var(--hud-acc)') + ';--pt:var(--tr-point-' + Math.max(1, Math.min(5, item.points || 1)) + ')">' +
      '<div class="tcx-art">' +
        '<span class="tcx-wm" aria-hidden="true">' + (item.kind === 'dissonante' ? '<i>' + E(item.roman) + '</i>' : ico(cat)) + '</span>' +
        '<span class="tcx-ic">' + ico(cat) + '</span>' +
        gem(item) +
      '</div>' +
      (owned ? '<span class="tcx-stamp">' + (item.kind === 'vantagem' ? 'ADQUIRIDA' : 'ASSUMIDO') + '</span>' : '') +
      '<div class="tcx-body">' +
        '<small class="tcx-cat">' + E(sub) + '</small>' +
        '<h3 class="tcx-name">' + E(item.name) + '</h3>' +
        '<p class="tcx-desc">' + E(item.description) + '</p>' +
        '<ul class="tcx-meta">' + meta + '</ul>' +
        (defs.length ? '<div class="tcx-conf">' + defs.slice(0, 2).map(function (f) { return '<b>' + E(f.label) + ':</b> ' + E(rec.configuration[f.key]); }).join('<br>') + (defs.length > 2 ? '<br>+' + (defs.length - 2) + ' definições' : '') + '</div>' : '') +
      '</div>' +
      '<footer class="tcx-act">' +
        '<button type="button" class="tcx-see" data-trait-action="details" data-trait-id="' + E(item.id) + '" aria-label="Ler efeito e requisitos de ' + E(item.name) + '">' + ico('eye') + '<span>' + (owned && item.kind !== 'dissonante' ? 'Detalhes' : 'Efeito') + '</span></button>' +
        '<button type="button" class="tr-acquire tcx-buy' + (owned ? ' rm' : '') + '" data-trait-action="' + (owned ? 'remove' : 'acquire') + '" data-trait-id="' + E(item.id) + '"' + (error ? ' disabled' : '') + '>' +
          '<span>' + act + '</span>' + (owned ? '' : '<em>' + price + '</em>') + '</button>' +
      '</footer>' +
      (error && !owned ? '<p class="tr-restriction tcx-why">' + ico('lock') + E(error) + '</p>' : error && owned ? '<p class="tr-restriction tcx-why">' + E(error) + '</p>' : '') +
    '</article>';
  }

  /* mão no topo: carta pequena com a mesma linguagem */
  function handCard(it, kind, rot, lift) {
    var cat = catOf(it);
    var pts = it.kind === 'dissonante' ? 5 : it.points;
    return '<button type="button" class="trh-card tch ' + kind + '" data-trait-action="details" data-trait-id="' + E(it.id) + '" style="--r:' + rot + 'deg;--y:' + lift + 'px;--cc:' + (COLOR[cat] || 'var(--hud-acc)') + ';--pt:var(--tr-point-' + Math.max(1, Math.min(5, it.points || 1)) + ')">' +
      '<span class="tch-art">' + (it.kind === 'dissonante' ? '<i class="tch-roman">' + E(it.roman) + '</i>' : '') + ico(cat, 'tch-ic') + '</span>' +
      '<span class="tch-pt">' + (kind === 'flaw' ? '+' : '') + pts + '</span>' +
      '<b>' + E(it.name) + '</b><small>' + E(it.kind === 'dissonante' ? 'Arcana ' + it.roman : it.category) + '</small></button>';
  }

  window.PhobiaTraitCards = { card: cardHTML, hand: handCard, color: COLOR, icon: ico };

  function init() {
    if (typeof traitIsOwned !== 'function' || typeof renderTraitsPage !== 'function' || typeof state === 'undefined' || !state.charSheet) { setTimeout(init, 200); return; }
    window.traitCardHTML = cardHTML;
    try { renderTraitsPage(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

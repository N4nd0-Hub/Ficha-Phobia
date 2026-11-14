/* ==========================================================
   PERSONA // PHOBIA — persona-page.js
   Página PERSONA: ícones próprios para os 10 elementos, para as
   famílias de instrumento e para as reações (fraco, resiste...).
   Só acrescenta visual por cima do que a ficha já desenha.
   ========================================================== */
(function () {
  'use strict';
  function svg(body, vb) { return '<svg viewBox="' + (vb || '0 0 32 32') + '" aria-hidden="true">' + body + '</svg>'; }
  var EL = {
    fisico:  { c: '#ff9a3c', n: 'Físico',  i: svg('<path d="M5 27 21 6l3 2L9 29z" fill="currentColor"/><path d="M11 27 27 6l3 2-15 21z" fill="currentColor" opacity=".55"/><path d="M3 15l6 2M5 9l5 4M14 3l1 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>') },
    fogo:    { c: '#ff4d2e', n: 'Fogo',    i: svg('<path d="M16 2c1 6 9 9 9 18a9 9 0 0 1-18 0c0-5 3-7 4-11 1 3 2 4 4 5-1-4 0-8 1-12z" fill="currentColor"/><path d="M16 15c3 3 5 5 5 8a5 5 0 0 1-10 0c0-2 1-3 2-5 1 2 2 2 3 2-1-2-1-3 0-5z" fill="#0d0c10" opacity=".55"/>') },
    gelo:    { c: '#62d6ff', n: 'Gelo',    i: svg('<g stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M16 2v28M4 9l24 14M4 23 28 9"/><path d="M12 4l4 4 4-4M12 28l4-4 4 4M4 14l5-1-2-5M28 18l-5 1 2 5M4 18l5 1-2 5M28 14l-5-1 2-5"/></g><path d="m16 11 5 5-5 5-5-5z" fill="currentColor"/>') },
    vento:   { c: '#55f59a', n: 'Vento',   i: svg('<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M3 11h17a4 4 0 1 0-4-4"/><path d="M3 17h23a4 4 0 1 1-4 4"/><path d="M3 23h10"/></g>') },
    raio:    { c: '#ffe14a', n: 'Raio',    i: svg('<path d="M19 1 6 18h8l-3 13L26 12h-8z" fill="currentColor"/>') },
    nuclear: { c: '#3df2c4', n: 'Nuclear', i: svg('<g fill="none" stroke="currentColor" stroke-width="2.2"><ellipse cx="16" cy="16" rx="13" ry="5"/><ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(60 16 16)"/><ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(-60 16 16)"/></g><circle cx="16" cy="16" r="3.4" fill="currentColor"/>') },
    psy:     { c: '#ff5ccf', n: 'PSY',     i: svg('<path d="M16 16m-2 0a2 2 0 1 1 4 0 4 4 0 1 1-8 0 6 6 0 1 1 12 0 8 8 0 1 1-16 0 10 10 0 1 1 20 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M27 6l2-3M5 6 3 3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>') },
    luz:     { c: '#fff2a1', n: 'Luz',     i: svg('<path d="M16 1l2.6 9.4L28 7l-6.4 7.4L31 16l-9.4 1.6L28 25l-9.4-3.4L16 31l-2.6-9.4L4 25l6.4-7.4L1 16l9.4-1.6L4 7l9.4 3.4z" fill="currentColor"/><circle cx="16" cy="16" r="4.2" fill="#0d0c10" opacity=".35"/>') },
    trevas:  { c: '#a85cff', n: 'Trevas',  i: svg('<path d="M20 3a13 13 0 1 0 9 22A11 11 0 0 1 20 3z" fill="currentColor"/><path d="M24 5l1 2.5 2.5 1-2.5 1L24 12l-1-2.5-2.5-1 2.5-1z" fill="currentColor"/><circle cx="13" cy="17" r="2.2" fill="#0d0c10" opacity=".5"/>') },
    intel:   { c: '#4f8dff', n: 'Intel',   i: svg('<path d="M2 16S8 6 16 6s14 10 14 10-6 10-14 10S2 16 2 16z" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="16" cy="16" r="5.5" fill="currentColor"/><path d="M16 13v6M13 16h6" stroke="#0d0c10" stroke-width="1.8" opacity=".6"/>') }
  };
  var ORDER = ['fisico', 'fogo', 'gelo', 'vento', 'raio', 'nuclear', 'psy', 'luz', 'trevas', 'intel'];
  var INS = {
    cordas:       { c: '#ff6a3d', i: svg('<path d="M24 2l6 6-3 1-7 7-2-2 7-7z" fill="currentColor"/><path d="M18 14c-3-1-6 0-7 3-4-1-8 2-8 6 0 4 4 8 8 7 4 0 6-3 6-7 3-1 4-4 3-7z" fill="currentColor"/><circle cx="11" cy="22" r="2" fill="#0d0c10" opacity=".55"/><path d="M8 25l3-3" stroke="#0d0c10" stroke-width="1.6" opacity=".55"/>') },
    percussao:    { c: '#ffd23f', i: svg('<ellipse cx="16" cy="12" rx="12" ry="4.5" fill="currentColor"/><path d="M4 12v10c0 2.5 5.4 4.5 12 4.5S28 24.5 28 22V12c0 2.5-5.4 4.5-12 4.5S4 14.5 4 12z" fill="currentColor" opacity=".7"/><path d="M8 17l4 8M16 17v9M24 17l-4 8" stroke="#0d0c10" stroke-width="1.6" opacity=".5"/><path d="M20 2l6 8M27 3l-3 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>') },
    vocal:        { c: '#ff5c9d', i: svg('<rect x="11" y="2" width="10" height="16" rx="5" fill="currentColor"/><path d="M7 14a9 9 0 0 0 18 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M16 23v6M11 30h10" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M12 7h8M12 11h8" stroke="#0d0c10" stroke-width="1.4" opacity=".45"/>') },
    friccionadas: { c: '#c88bff', i: svg('<path d="M14 9c-3 0-5 2-5 4 0 1.5 1 2.5 1 3.5S7 18 7 22c0 4 4 8 9 8s9-4 9-8c0-4-3-5.5-3-6.5s1-2 1-3.5c0-2-2-4-5-4z" fill="currentColor"/><path d="M16 1v12" stroke="currentColor" stroke-width="2.4"/><path d="M13 20h6M14 24h4" stroke="#0d0c10" stroke-width="1.6" opacity=".5"/><path d="M3 29 29 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>') },
    sopro:        { c: '#3fd6ff', i: svg('<path d="M3 13h14l7-6v18l-7-6H3z" fill="currentColor"/><path d="M24 7c4 2 6 5 6 9s-2 7-6 9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="8" cy="11" r="1.4" fill="#0d0c10" opacity=".5"/><circle cx="12" cy="11" r="1.4" fill="#0d0c10" opacity=".5"/>') },
    eletronico:   { c: '#7dff5c', i: svg('<rect x="2" y="9" width="28" height="16" rx="2" fill="currentColor"/><path d="M6 25V17M10 25V17M16 25V17M20 25V17M26 25V17" stroke="#0d0c10" stroke-width="1.6" opacity=".55"/><circle cx="7" cy="13" r="1.6" fill="#0d0c10" opacity=".55"/><circle cx="12" cy="13" r="1.6" fill="#0d0c10" opacity=".55"/><path d="M18 13h9" stroke="#0d0c10" stroke-width="1.8" opacity=".55"/><path d="M8 5l3-3 3 3 3-3 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>') }
  };
  var INS_ORDER = ['cordas', 'percussao', 'vocal', 'friccionadas', 'sopro', 'eletronico'];
  var R = {
    Fraqueza: { k: 'weak',    t: 'FRACO',   i: svg('<path d="M16 2 30 28H2z" fill="currentColor"/><path d="M16 11v8" stroke="#0d0c10" stroke-width="3.2" stroke-linecap="round"/><circle cx="16" cy="24" r="1.9" fill="#0d0c10"/>') },
    Resistir: { k: 'resist',  t: 'RESISTE', i: svg('<path d="M16 2 28 6v9c0 8-5 13-12 15C9 28 4 23 4 15V6z" fill="currentColor"/><path d="M16 7v18" stroke="#0d0c10" stroke-width="2" opacity=".45"/>') },
    Anular:   { k: 'null',    t: 'ANULA',   i: svg('<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="4"/><path d="M8 24 24 8" stroke="currentColor" stroke-width="4"/>') },
    Refletir: { k: 'reflect', t: 'REFLETE', i: svg('<path d="M4 4h14l-5 5c6 1 12 6 12 13v6h-5v-6c0-4-3-7-8-8l-5 5z" fill="currentColor"/>') },
    Drenar:   { k: 'drain',   t: 'DRENA',   i: svg('<path d="M16 29S3 21 3 12a7 7 0 0 1 13-3 7 7 0 0 1 13 3c0 9-13 17-13 17z" fill="currentColor"/><path d="M16 12v9M12 17l4 4 4-4" stroke="#0d0c10" stroke-width="2.4" fill="none" stroke-linecap="round"/>') },
    Normal:   { k: 'normal',  t: 'NORMAL',  i: svg('<path d="M7 16h18" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>') }
  };
  window.PhobiaElementIcons = { el: EL, order: ORDER, ins: INS, reaction: R };

  function reactionOf(card) {
    var sel = card.querySelector('select'); if (!sel) return 'Normal';
    var badge = card.querySelector('.affinity-hud-badge');
    var txt = badge ? badge.textContent.toUpperCase() : '';
    if (/FRAQ/.test(txt)) return 'Fraqueza';
    if (/RESIST/.test(txt)) return 'Resistir';
    if (/ANULA/.test(txt)) return 'Anular';
    if (/REFLET/.test(txt)) return 'Refletir';
    if (/DRENA/.test(txt)) return 'Drenar';
    return 'Normal';
  }
  function deco(card, key, info, isIns) {
    if (card.classList.contains('pp-card')) return;
    var r = reactionOf(card), RR = R[r] || R.Normal;
    card.dataset.r = r;
    card.classList.add('pp-card', 'pp-r-' + RR.k);
    card.style.setProperty('--ec', info.c);
    card.dataset.el = key;
    var ico = document.createElement('span');
    ico.className = 'pp-ico'; ico.innerHTML = info.i;
    card.insertBefore(ico, card.firstChild);
    var name = card.querySelector('.affinity-hud-name');
    if (name && !isIns) name.textContent = info.n;
    var badge = card.querySelector('.affinity-hud-badge');
    if (badge) {
      var vant = /VANT/.test(badge.textContent);
      badge.innerHTML = '<i>' + RR.i + '</i><span>' + RR.t + (vant ? ' · VANT.' : '') + '</span>';
    }
    if (isIns) { var chip = card.querySelector('.instrument-hud-chip'); if (chip) chip.classList.add('pp-tag'); }
  }
  function decorate() {
    var g = document.getElementById('sheetAffinityGrid');
    if (g) [].forEach.call(g.querySelectorAll('.affinity-hud-card'), function (c, i) { if (ORDER[i]) deco(c, ORDER[i], EL[ORDER[i]], false); });
    var gi = document.getElementById('sheetInstrumentAffinityGrid');
    if (gi) [].forEach.call(gi.querySelectorAll('.instrument-hud-card'), function (c, i) { if (INS_ORDER[i]) deco(c, INS_ORDER[i], INS[INS_ORDER[i]], true); });
    summary();
  }
  /* resumo em chips com ícones acima de cada grade */
  function chipList(grid, map, order, isIns) {
    var out = { weak: [], resist: [], guard: [] };
    if (!grid) return out;
    [].forEach.call(grid.querySelectorAll('.pp-card'), function (c, i) {
      var k = order[i], info = map[k]; if (!info) return;
      var r = c.dataset.r || 'Normal', RR = R[r];
      var name = isIns ? (c.querySelector('.affinity-hud-name') || {}).textContent : info.n;
      var html = '<span class="pp-chip" style="--ec:' + info.c + '"><i>' + info.i + '</i>' + name + (RR.k !== 'weak' && RR.k !== 'resist' ? ' <small>' + RR.t + '</small>' : '') + '</span>';
      if (RR.k === 'weak') out.weak.push(html); else if (RR.k === 'resist') out.resist.push(html); else if (RR.k !== 'normal') out.guard.push(html);
    });
    return out;
  }
  function paintSummary(pane, lists, id) {
    if (!pane) return;
    var box = pane.querySelector('.pp-sum');
    if (!box) { box = document.createElement('div'); box.className = 'pp-sum'; box.id = id; var cap = pane.querySelector('.persona-v2-pane-caption'); cap.insertAdjacentElement('afterend', box); }
    var row = function (k, label, arr) { return '<div class="pp-sum-row pp-r-' + k + '"><b><i>' + R[label].i + '</i>' + R[label].t + '</b><div>' + (arr.length ? arr.join('') : '<em>nenhum</em>') + '</div></div>'; };
    box.innerHTML = row('weak', 'Fraqueza', lists.weak) + row('resist', 'Resistir', lists.resist) + row('null', 'Anular', lists.guard).replace('ANULA</b>', 'BLOQUEIA</b>');
  }
  function summary() {
    paintSummary(document.getElementById('personaElementPane'), chipList(document.getElementById('sheetAffinityGrid'), EL, ORDER, false), 'ppSumEl');
    paintSummary(document.getElementById('personaInstrumentPane'), chipList(document.getElementById('sheetInstrumentAffinityGrid'), INS, INS_ORDER, true), 'ppSumIns');
  }
  function captions() {
    var a = document.querySelector('#personaElementPane .persona-v2-pane-caption');
    if (a && !a.dataset.pp) { a.dataset.pp = 1; a.innerHTML = '<strong><span>✦</span> AFINIDADES ELEMENTAIS</strong><span>Toque num elemento para escolher a reação</span>'; }
    var b = document.querySelector('#personaInstrumentPane .persona-v2-pane-caption');
    if (b && !b.dataset.pp) { b.dataset.pp = 1; b.innerHTML = '<strong><span>♪</span> AFINIDADES MUSICAIS</strong><span>Como cada família de instrumento te afeta</span>'; }
  }
  function wrap(name) {
    var o = window[name]; if (typeof o !== 'function' || o.__pp) return;
    var w = function () { var r = o.apply(this, arguments); try { captions(); decorate(); } catch (e) { console.warn('persona-page', e); } return r; };
    w.__pp = true; window[name] = w;
  }
  function init() {
    wrap('renderInstrumentAffinityHUD'); wrap('renderPersonaAffinityHUD');
    try { renderPersonaAffinityHUD(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ==========================================================
   PERSONA // PHOBIA — magic-cd.js
   As magias do deck viram CDs (caixinha de acrílico + encarte
   + obi japonês + disco furta-cor). Só muda a aparência:
   depois de cada renderMagicDeck() o cartão é remontado com as
   mesmas peças e botões, então arrastar, ordenar, cores e
   remover continuam funcionando igual.
   ========================================================== */
(function () {
  'use strict';
  if (window.__magicCd) return; window.__magicCd = true;

  var KANJI = [
    [/f[ií]sico/, '拳', 'フィジカル'], [/fogo/, '火', 'ファイア'], [/gelo/, '氷', 'アイス'], [/vento/, '風', 'ウインド'],
    [/raio/, '雷', 'サンダー'], [/nuclear/, '核', 'ニュークリア'], [/psy|ps[ií]/, '念', 'サイキック'], [/luz|b[eê]n[cç]/, '光', 'ライト'],
    [/trevas|maldi/, '闇', 'ダーク'], [/cura|recupera/, '癒', 'ヒール'], [/intel/, '知', 'インテル'], [/passiv/, '常', 'パッシブ'],
    [/buff|aprimora/, '強', 'ブースト'], [/debuff|enfraq/, '弱', 'デバフ'], [/suporte|apoio/, '援', 'サポート'], [/status|condi/, '状', 'ステータス']
  ];
  function kanjiOf(type) {
    var t = String(type || '').toLowerCase();
    for (var i = 0; i < KANJI.length; i++) if (KANJI[i][0].test(t)) return KANJI[i];
    return [null, '創', 'オリジナル'];
  }
  var SHORT = [[/debuffs?\s*\(/i, 'Debuffs'], [/buffs?\s*\(/i, 'Buffs'], [/cura e recupera/i, 'Cura'], [/controle mental/i, 'Controle'], [/passivas m/i, 'Passiva'], [/luz e b/i, 'Luz'], [/trevas e m/i, 'Trevas']];
  function shortType(t) { t = String(t || '').trim(); for (var i = 0; i < SHORT.length; i++) if (SHORT[i][0].test(t)) return SHORT[i][1]; return t; }
  /* ajusta o tamanho do nome para caber sem quebrar palavra no meio */
  function fitName(n) {
    var box = n.parentNode; if (!box || !n.offsetWidth) return;
    var words = n.textContent.trim().split(/\s+/), longest = words.reduce(function (a, w) { return w.length > a ? w.length : a; }, 0);
    var max = 26, min = 11, size = Math.min(max, Math.max(min, Math.floor((n.clientWidth - 6) / (longest * .74))));
    n.style.setProperty('font-size', size + 'px', 'important');
    var guard = 0;
    var tooWide = function () {
      var r = n.getBoundingClientRect(), over = false;
      [].forEach.call(n.childNodes, function () {});
      var range = document.createRange(); range.selectNodeContents(n);
      [].forEach.call(range.getClientRects(), function (c) { if (c.right > r.right - 2 || c.left < r.left) over = true; });
      return over || n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1;
    };
    while (tooWide() && size > min && guard++ < 24) { size--; n.style.setProperty('font-size', size + 'px', 'important'); }
  }
  function fitAll() { document.querySelectorAll('#sheetMagicDeck .cd-copy .deck-card-name').forEach(fitName); }
  function el(tag, cls, html) { var e = document.createElement(tag); e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function txt(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  function build() {
    var deck = document.getElementById('sheetMagicDeck'); if (!deck) return;
    deck.classList.add('cd-rack');
    deck.querySelectorAll('.deck-lab-cassette').forEach(function (card, i) {
      if (card.dataset.cd) return; card.dataset.cd = '1'; card.classList.add('cd-case');
      var win = card.querySelector('.deck-cassette-window'); if (!win) return;
      var type = win.querySelector('.deck-card-type'), name = win.querySelector('.deck-card-name'), meta = win.querySelector('.deck-card-meta');
      var k = kanjiOf(type && type.textContent);
      var metas = meta ? meta.querySelectorAll('small') : [];
      var tier = metas[0] ? metas[0].textContent.replace(/^TIER\s*/i, '') : '';
      var cost = metas[1] ? metas[1].textContent : '';
      var nm = name ? name.textContent : '';

      // disco (atrás da caixa)
      var disc = el('span', 'cd-disc', '<span class="cd-disc-data"></span><span class="cd-disc-print"><b>' + txt(nm) + '</b><small>TIER ' + txt(tier) + ' · ' + txt(cost) + '</small></span><span class="cd-disc-hub"></span>');
      disc.setAttribute('aria-hidden', 'true');

      // encarte (capa) dentro da caixa
      var cover = el('span', 'cd-cover');
      cover.appendChild(el('span', 'cd-art', '<i class="cd-kanji">' + k[1] + '</i><i class="cd-burst"></i>'));
      var obi = el('span', 'cd-obi', '<b>' + k[1] + '</b><small>' + txt(k[2]) + '</small><em>TIER ' + txt(tier) + '</em>');
      obi.setAttribute('aria-hidden', 'true');
      cover.appendChild(obi);
      var copy = el('span', 'cd-copy');
      var head = el('span', 'cd-head');
      head.appendChild(el('span', 'cd-track', 'TRACK ' + String(i + 1).padStart(2, '0')));
      head.appendChild(el('span', 'cd-logo', '<i></i>CD'));
      copy.appendChild(head);
      if (type) { type.title = type.textContent; type.textContent = shortType(type.textContent); copy.appendChild(type); }
      if (name) { name.title = nm; copy.appendChild(name); }
      if (meta) {
        var tn = { I: 1, II: 2, III: 3, IV: 4, V: 5 }[String(tier).trim()] || 0, dots = '';
        for (var d = 1; d <= 5; d++) dots += '<i class="' + (d <= tn ? 'on' : '') + '"></i>';
        meta.insertAdjacentHTML('afterbegin', '<span class="cd-tier-dots" aria-hidden="true">' + dots + '</span>');
        copy.appendChild(meta);
      }
      cover.appendChild(copy);
      cover.appendChild(el('span', 'cd-glare'));
      cover.appendChild(el('span', 'cd-hinge'));

      /* controles: bandeja compacta (cor · ◀ ▶ · ×) */
      var ctr = card.querySelector('.deck-cassette-controls');
      if (ctr) {
        ctr.classList.add('cd-tray');
        var pt = ctr.querySelector('.deck-palette-toggle');
        if (pt) { [].slice.call(pt.childNodes).forEach(function (n) { if (n.nodeType === 3) n.remove(); }); pt.title = 'Cores do CD'; }
        ctr.querySelectorAll('[data-deck-move]').forEach(function (b) { var up = /:-1$/.test(b.dataset.deckMove); b.textContent = up ? '◀' : '▶'; b.title = up ? 'Mover para trás' : 'Mover para frente'; });
        var rm = ctr.querySelector('.deck-remove'); if (rm) rm.title = 'Remover do deck';
      }
      win.innerHTML = '';
      win.appendChild(disc);
      win.appendChild(cover);
    });
    requestAnimationFrame(fitAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  }
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fitAll, 150); });

  function init() {
    if (typeof renderMagicDeck !== 'function') { setTimeout(init, 200); return; }
    var orig = window.renderMagicDeck;
    if (!orig.__cd) {
      var w = function () { var r = orig.apply(this, arguments); try { build(); } catch (e) {} return r; };
      w.__cd = true; window.renderMagicDeck = w;
    }
    build();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

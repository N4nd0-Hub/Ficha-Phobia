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
      copy.appendChild(el('span', 'cd-track', 'TRACK ' + String(i + 1).padStart(2, '0')));
      if (type) copy.appendChild(type);
      if (name) copy.appendChild(name);
      if (meta) copy.appendChild(meta);
      cover.appendChild(copy);
      cover.appendChild(el('span', 'cd-logo', '<i></i>COMPACT<br>MAGIC'));
      cover.appendChild(el('span', 'cd-glare'));
      cover.appendChild(el('span', 'cd-hinge'));

      win.innerHTML = '';
      win.appendChild(disc);
      win.appendChild(cover);
    });
  }

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

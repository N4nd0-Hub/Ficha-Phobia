/* ==========================================================
   PERSONA // PHOBIA — district-badges.js
   Selos dos distritos desenhados em vetor (sem imagem).
   As cores vêm de variáveis CSS, então seguem o tema escolhido
   no VISUAL e mudam sozinhas no modo Cognição.
   Não mexe na lógica do mapa: depois de cada renderDistricts()
   troca a <image> do selo por um <svg> com o mesmo tamanho.
   ========================================================== */
(function () {
  'use strict';
  if (window.__districtBadges) return; window.__districtBadges = true;

  var NS = 'http://www.w3.org/2000/svg';
  var NAMES = {
    shibuya: ['SHIBUYA', '渋谷'], shinjuku: ['SHINJUKU', '新宿'], akihabara: ['AKIHABARA', '秋葉原'],
    nakano: ['NAKANO', '中野'], ikebukuro: ['IKEBUKURO', '池袋'], harajuku: ['HARAJUKU', '原宿'],
    asakusa: ['ASAKUSA', '浅草'], roppongi: ['ROPPONGI', '六本木'], odaiba: ['ODAIBA', 'お台場'],
    kichijoji: ['KICHIJOJI', '吉祥寺'], ginza: ['GINZA', '銀座'], meguro: ['MEGURO', '目黒']
  };

  /* ---------- peças ---------- */
  function R(x, y, w, h, c, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (rx ? ' rx="' + rx + '"' : '') + ' class="' + (c || 'bd-sil') + '"/>'; }
  function P(d, c) { return '<path d="' + d + '" class="' + (c || 'bd-sil') + '"/>'; }
  function C(cx, cy, r, c) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="' + (c || 'bd-sil') + '"/>'; }
  function E(cx, cy, rx, ry, c) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" class="' + (c || 'bd-sil') + '"/>'; }
  /* prédio com janelas */
  function B(x, y, w, h, cols, rows) {
    var s = R(x, y, w, h);
    cols = cols || Math.max(1, Math.floor(w / 9)); rows = rows || Math.max(1, Math.floor(h / 12));
    var gx = w / cols, gy = Math.min(12, h / (rows + 1));
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      if ((i * 7 + j * 3 + x) % 5 === 0) continue;
      s += R((x + i * gx + gx * .28).toFixed(1), (y + 6 + j * gy).toFixed(1), (gx * .44).toFixed(1), (gy * .45).toFixed(1), 'bd-win');
    }
    return s;
  }

  /* ---------- silhuetas de cada distrito (caixa 240×180, chão em y≈118) ---------- */
  var ART = {
    shibuya: function () {
      return B(30, 70, 30, 48) + B(150, 44, 32, 74) + B(186, 64, 26, 54) +
        B(60, 50, 38, 68) + R(64, 56, 30, 18, 'bd-lit') +
        R(100, 22, 44, 96, 'bd-sil', 8) + R(104, 30, 36, 6, 'bd-acc') + R(104, 96, 36, 4, 'bd-acc') +
        '<text x="122" y="54" class="bd-tiny" text-anchor="middle">109</text>' +
        R(108, 60, 4, 30, 'bd-win') + R(120, 60, 4, 30, 'bd-win') + R(132, 60, 4, 30, 'bd-win') +
        P('M64 116l8-10h9l-8 10zM86 116l8-10h9l-8 10zM108 116l8-10h9l-8 10zM130 116l8-10h9l-8 10zM152 116l8-10h9l-8 10z', 'bd-paper');
    },
    shinjuku: function () {
      return R(30, 58, 6, 60) + R(80, 58, 6, 60) + R(24, 46, 68, 16, 'bd-acc') + R(28, 50, 60, 8, 'bd-ink') +
        R(32, 51, 10, 6, 'bd-lit') + R(46, 51, 10, 6, 'bd-lit') + R(60, 51, 10, 6, 'bd-lit') + R(74, 51, 10, 6, 'bd-lit') +
        B(96, 16, 26, 102, 2, 8) + B(128, 16, 26, 102, 2, 8) + R(96, 58, 58, 60) +
        P('M96 16l13-8 13 8zM128 16l13-8 13 8z') + B(98, 64, 54, 50, 6, 4) +
        B(160, 48, 36, 70) + R(198, 56, 8, 40, 'bd-lit');
    },
    akihabara: function () {
      return B(30, 44, 42, 74) + R(34, 50, 8, 44, 'bd-acc') + R(60, 54, 8, 36, 'bd-lit') +
        R(78, 26, 58, 92) + R(84, 34, 46, 30, 'bd-lit') +
        P('M94 44h26a7 7 0 0 1 7 7v2a7 7 0 0 1-12 5h-16a7 7 0 0 1-12-5v-2a7 7 0 0 1 7-7z', 'bd-ink') +
        R(97, 48, 3, 9, 'bd-paper') + R(94, 51, 9, 3, 'bd-paper') + C(116, 50, 2.2, 'bd-paper') + C(121, 54, 2.2, 'bd-paper') +
        B(84, 70, 46, 44, 5, 3) + B(142, 46, 44, 72) + R(146, 52, 36, 8, 'bd-acc') + B(190, 64, 22, 54);
    },
    nakano: function () {
      return B(48, 40, 132, 78, 12, 2) + R(56, 46, 116, 14, 'bd-acc') +
        '<text x="114" y="57" class="bd-tiny ink" text-anchor="middle">BROADWAY</text>' +
        P('M94 118V88a20 20 0 0 1 40 0v30z', 'bd-lit') + P('M100 118V90a14 14 0 0 1 28 0v28z', 'bd-ink') +
        C(196, 52, 30) + C(196, 52, 22, 'bd-ring') + C(196, 52, 14, 'bd-ring') + C(196, 52, 8, 'bd-acc') + C(196, 52, 2.5, 'bd-ink');
    },
    ikebukuro: function () {
      return B(66, 56, 34, 62) + B(140, 48, 34, 70) + B(178, 70, 30, 48) +
        R(104, 10, 32, 108) + R(108, 14, 4, 100, 'bd-win') + R(118, 14, 4, 100, 'bd-win') + R(128, 14, 4, 100, 'bd-win') + R(104, 10, 32, 6, 'bd-acc') +
        E(44, 94, 19, 24) + P('M27 76l6-14 8 10zM61 76l-6-14-8 10z') +
        C(37, 86, 7, 'bd-lit') + C(51, 86, 7, 'bd-lit') + C(37, 86, 3, 'bd-ink') + C(51, 86, 3, 'bd-ink') + P('M41 94l3 5 3-5z', 'bd-acc');
    },
    harajuku: function () {
      return B(70, 72, 30, 46, 3, 2) + B(104, 62, 32, 56, 3, 3) + B(140, 76, 32, 42, 3, 2) +
        R(52, 44, 8, 74) + R(180, 44, 8, 74) +
        P('M46 38Q120 18 194 38v18Q120 36 46 56z', 'bd-lit') +
        '<text x="120" y="45" class="bd-tiny ink" text-anchor="middle" transform="rotate(-1 120 45)">TAKESHITA</text>' +
        P('M120 12c-7-9-21-4-16 7l16 12 16-12c5-11-9-16-16-7z', 'bd-paper') +
        P('M100 66l-12-6v14zM140 66l12-6v14z', 'bd-acc') + R(114, 62, 12, 8, 'bd-acc', 3);
    },
    asakusa: function () {
      return P('M14 40h30l-6-6H20zM12 58h34l-7-8H19zM10 78h38l-8-9H18zM8 100h42l-9-10H17z') + R(26, 30, 6, 88) + R(17, 34, 24, 2, 'bd-acc') +
        P('M44 54L120 30l76 24-12 8H56z') + R(56, 62, 128, 6) +
        R(62, 66, 10, 52) + R(168, 66, 10, 52) + R(92, 66, 6, 8) + R(142, 66, 6, 8) +
        E(120, 90, 24, 27, 'bd-lit') + R(98, 72, 44, 5, 'bd-ink') + R(98, 104, 44, 5, 'bd-ink') +
        '<text x="120" y="96" class="bd-tiny ink big" text-anchor="middle">雷門</text>' +
        P('M196 54l20 10v54h-20z');
    },
    roppongi: function () {
      return B(36, 62, 38, 56) + B(160, 30, 42, 88, 4, 7) + P('M160 30q21-16 42 0z') +
        P('M120 6L152 118H140L120 48 100 118H88z') + R(104, 60, 32, 9, 'bd-acc') + R(110, 36, 20, 6, 'bd-acc') +
        P('M120 14v100M104 76l32 30M136 76l-32 30M98 96h44', 'bd-line') + R(118, 0, 4, 8, 'bd-acc');
    },
    odaiba: function () {
      return C(192, 48, 24, 'bd-wheel') + P('M192 24v48M168 48h48M175 31l34 34M209 31l-34 34', 'bd-line thin') + C(192, 48, 5, 'bd-lit') +
        R(188, 48, 8, 70) + R(66, 26, 10, 82) + R(150, 26, 10, 82) + R(64, 22, 14, 6, 'bd-acc') + R(148, 22, 14, 6, 'bd-acc') +
        P('M14 92Q71 20 71 28M71 28Q113 96 155 28M155 28Q160 20 230 92', 'bd-line') +
        R(10, 92, 220, 9) + R(10, 92, 220, 3, 'bd-acc') +
        P('M12 112q12-6 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0', 'bd-wave');
    },
    kichijoji: function () {
      return C(70, 52, 30) + C(100, 40, 26) + C(52, 76, 22) + C(96, 70, 22) + R(76, 70, 10, 48) +
        C(66, 46, 4, 'bd-acc') + C(98, 34, 4, 'bd-acc') + C(54, 72, 4, 'bd-acc') + C(104, 64, 4, 'bd-acc') +
        E(160, 106, 66, 12, 'bd-lit') +
        P('M146 104h26c4 0 6-4 4-8l-6 2c-2-12-4-22 4-26 4-2 8 2 6 6l4-2c0-8-8-12-14-8-10 6-6 22-6 28h-14c-6 0-8 4-4 8z') +
        B(172, 52, 42, 40, 4, 2) + R(170, 48, 46, 6, 'bd-acc');
    },
    ginza: function () {
      return B(28, 66, 32, 52) + B(182, 60, 32, 58) +
        P('M64 118V60q0-8 8-8h96q8 0 8 8v58z') + B(68, 62, 104, 52, 10, 4) +
        R(98, 24, 44, 32) + P('M94 24q26-22 52 0z') + R(118, 4, 4, 8, 'bd-acc') +
        C(120, 40, 13, 'bd-paper') + C(120, 40, 13, 'bd-ring') + P('M120 40v-9M120 40l6 4', 'bd-hand') +
        P('M190 86h18l3 26h-24z', 'bd-lit') + P('M194 86q5-10 10 0', 'bd-hand');
    },
    meguro: function () {
      return B(96, 36, 24, 46, 2, 3) + B(124, 26, 24, 56, 2, 4) + B(152, 44, 22, 38, 2, 3) +
        R(46, 70, 8, 48) + R(190, 70, 8, 48) +
        C(50, 50, 24, 'bd-bloom') + C(32, 70, 16, 'bd-bloom') + C(68, 70, 16, 'bd-bloom') +
        C(194, 50, 24, 'bd-bloom') + C(176, 70, 16, 'bd-bloom') + C(212, 70, 16, 'bd-bloom') +
        P('M10 104q30-10 60 0t60 0 60 0 60 0V118H10z', 'bd-lit') +
        P('M70 100q50-34 100 0v6q-50-28-100 0z') + R(68, 100, 6, 16) + R(166, 100, 6, 16) +
        C(40, 40, 3, 'bd-paper') + C(206, 44, 3, 'bd-paper') + C(60, 62, 2.5, 'bd-paper') + C(184, 62, 2.5, 'bd-paper');
    }
  };

  /* explosão serrilhada (sempre igual para o mesmo distrito) */
  function burst(id) {
    var seed = 0; for (var i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) % 9973;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var n = 22, pts = [];
    for (var k = 0; k < n * 2; k++) {
      var a = (k / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      var outer = k % 2 === 0, rx = outer ? 104 + rnd() * 14 : 84 + rnd() * 6, ry = outer ? 78 + rnd() * 12 : 64 + rnd() * 5;
      pts.push((120 + Math.cos(a) * rx).toFixed(1) + ',' + (78 + Math.sin(a) * ry).toFixed(1));
    }
    return pts.join(' ');
  }

  var cache = {};
  function markup(id) {
    if (cache[id]) return cache[id];
    var nm = NAMES[id] || [id.toUpperCase(), ''], pts = burst(id), uid = 'bd-' + id;
    var len = nm[0].length, tl = Math.min(176, 22 * len + 8);
    var s =
      '<defs><pattern id="' + uid + '-dots" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.4" class="bd-dot"/></pattern>' +
      '<clipPath id="' + uid + '-clip"><polygon points="' + pts + '"/></clipPath></defs>' +
      '<g class="bd-float">' +
        '<polygon points="' + pts + '" class="bd-burst-shadow" transform="translate(7 7)"/>' +
        '<polygon points="' + pts + '" class="bd-burst"/>' +
        '<polygon points="' + pts + '" fill="url(#' + uid + '-dots)" class="bd-dots"/>' +
        '<polygon points="' + pts + '" class="bd-glitch" transform="translate(-5 3)"/>' +
        '<g clip-path="url(#' + uid + '-clip)"><g class="bd-art">' + (ART[id] ? ART[id]() : '') + '</g></g>' +
        '<g class="bd-cog-eye" transform="translate(206 20)"><path d="M-16 0q16-14 32 0-16 14-32 0z" class="bd-eye"/><circle r="5" class="bd-pupil"/></g>' +
        '<g transform="translate(120 136) skewX(-10)">' +
          '<polygon points="-104,-20 104,-24 98,18 -100,16" class="bd-plate-shadow" transform="translate(5 5)"/>' +
          '<polygon points="-104,-20 104,-24 98,18 -100,16" class="bd-plate"/>' +
          '<text x="0" y="9" text-anchor="middle" class="bd-name" textLength="' + tl + '" lengthAdjust="spacingAndGlyphs">' + nm[0] + '</text>' +
        '</g>' +
        '<g transform="translate(176 158) rotate(-4)"><rect x="-30" y="-10" width="60" height="18" class="bd-jp-bg"/><text x="0" y="4" text-anchor="middle" class="bd-jp">' + nm[1] + '</text></g>' +
      '</g>';
    cache[id] = s; return s;
  }

  /* ---------- trocar as imagens ---------- */
  var byHref = null;
  function hrefMap() {
    if (byHref) return byHref;
    byHref = {};
    try { Object.keys(DISTRICT_BADGE_IMAGES).forEach(function (id) { byHref[DISTRICT_BADGE_IMAGES[id]] = id; }); } catch (e) {}
    return byHref;
  }
  function swap() {
    var map = hrefMap();
    var imgs = document.querySelectorAll('#districts image, #landmarks image');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i], href = img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      var id = map[href]; if (!id || !NAMES[id]) continue;
      var svg = document.createElementNS(NS, 'svg');
      ['x', 'y', 'width', 'height'].forEach(function (a) { var v = img.getAttribute(a); if (v != null) svg.setAttribute(a, v); });
      svg.setAttribute('viewBox', '-8 -14 256 194');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('overflow', 'visible');
      svg.setAttribute('class', (img.getAttribute('class') || 'district-art-image') + ' bd-badge bd-' + id);
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = markup(id);
      img.parentNode.replaceChild(svg, img);
    }
  }

  function init() {
    if (typeof renderDistricts !== 'function') { setTimeout(init, 200); return; }
    var orig = window.renderDistricts;
    if (!orig.__bd) {
      var w = function () { var r = orig.apply(this, arguments); try { swap(); } catch (e) {} return r; };
      w.__bd = true; window.renderDistricts = w;
    }
    swap();
    // segurança: se alguém recriar os selos por outro caminho
    var host = document.getElementById('districts');
    if (host && 'MutationObserver' in window) {
      var pending = false;
      new MutationObserver(function () {
        if (pending) return; pending = true;
        requestAnimationFrame(function () { pending = false; if (host.querySelector('image')) swap(); });
      }).observe(host, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

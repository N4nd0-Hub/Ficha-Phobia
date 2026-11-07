/* ==========================================================
   PERSONA // PHOBIA — district-badges.js  (v2)
   Selos dos distritos desenhados em vetor, no estilo P5:
   moldura serrilhada com raios e retícula, marco do bairro com
   volume (frente/lateral/janelas/letreiros), nome em letras
   recortadas e etiqueta em japonês.
   Tudo usa variáveis CSS: segue o tema e muda na Cognição.
   Cada selo pode ser editado (aba SELOS do painel VISUAL).
   ========================================================== */
(function () {
  'use strict';
  if (window.PhobiaBadges) return;

  var NS = 'http://www.w3.org/2000/svg';
  var NAMES = {
    shibuya: ['SHIBUYA', '渋谷'], shinjuku: ['SHINJUKU', '新宿'], akihabara: ['AKIHABARA', '秋葉原'],
    nakano: ['NAKANO', '中野'], ikebukuro: ['IKEBUKURO', '池袋'], harajuku: ['HARAJUKU', '原宿'],
    asakusa: ['ASAKUSA', '浅草'], roppongi: ['ROPPONGI', '六本木'], odaiba: ['ODAIBA', 'お台場'],
    kichijoji: ['KICHIJOJI', '吉祥寺'], ginza: ['GINZA', '銀座'], meguro: ['MEGURO', '目黒']
  };
  var IDS = Object.keys(NAMES);

  /* ---------- aleatório previsível ---------- */
  var seed = 1;
  function setSeed(s) { seed = 0; for (var i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) % 233280; seed = seed || 7; }
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  /* ---------- peças ---------- */
  function n(v) { return Math.round(v * 10) / 10; }
  function R(x, y, w, h, c, extra) { return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" class="' + (c || 'bd-sil') + '"' + (extra || '') + '/>'; }
  function P(d, c, extra) { return '<path d="' + d + '" class="' + (c || 'bd-sil') + '"' + (extra || '') + '/>'; }
  function C(cx, cy, r, c, extra) { return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" class="' + (c || 'bd-sil') + '"' + (extra || '') + '/>'; }
  function E(cx, cy, rx, ry, c, extra) { return '<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" class="' + (c || 'bd-sil') + '"' + (extra || '') + '/>'; }
  function Tx(x, y, s, c, size, extra) { return '<text x="' + n(x) + '" y="' + n(y) + '" class="' + c + '" style="font-size:' + size + 'px" text-anchor="middle"' + (extra || '') + '>' + s + '</text>'; }
  function G(t, inner) { return '<g transform="' + t + '">' + inner + '</g>'; }
  /* letreiro vertical (caracteres empilhados) */
  function vsign(x, y, w, chars, box, ink, size) {
    size = size || 10; var h = chars.length * (size + 2) + 6;
    var s = R(x, y, w, h, box, ' stroke-width="2"');
    for (var i = 0; i < chars.length; i++) s += Tx(x + w / 2, y + 4 + (i + 1) * (size + 2) - 2, chars[i], ink, size);
    return s;
  }
  /* janelas */
  function win(x, y, w, h, cols, rows, lit) {
    var s = '', gx = w / cols, gy = h / rows;
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      var r = rnd(); if (r < .14) continue;
      s += R(x + i * gx + gx * .22, y + j * gy + gy * .25, gx * .56, gy * .42, r > 1 - (lit || .16) ? 'bd-lit' : 'bd-win');
    }
    return s;
  }
  /* prédio com volume: frente, lateral, topo, quina iluminada e janelas */
  function T(x, y, w, h, o) {
    o = o || {}; var d = o.d == null ? 9 : o.d;
    var s = '';
    if (d) {
      s += P('M' + (x + w) + ' ' + y + 'l' + d + ' ' + (-d * .55) + 'v' + h + 'l' + (-d) + ' ' + (d * .55) + 'z', 'bd-side');
      s += P('M' + x + ' ' + y + 'l' + d + ' ' + (-d * .55) + 'h' + w + 'l' + (-d) + ' ' + (d * .55) + 'z', 'bd-top');
    }
    s += R(x, y, w, h, 'bd-sil');
    s += P('M' + x + ' ' + (y + h) + 'V' + y + 'H' + (x + w), 'bd-hl');
    if (o.cols !== 0) s += win(x + 3, y + 5, w - 6, h - 10, o.cols || Math.max(2, Math.round(w / 11)), o.rows || Math.max(2, Math.round(h / 13)), o.lit);
    return s;
  }
  /* skyline de fundo */
  function far(y0, y1) {
    var s = 'M8 172', x = 8;
    while (x < 312) { var w = 12 + rnd() * 22, h = y0 + rnd() * (y1 - y0); s += 'V' + n(h) + 'H' + n(x + w); if (rnd() > .7) s += 'v-6h-4v6'; x += w; }
    s += 'V172Z';
    return P(s, 'bd-far');
  }
  /* brilho de 4 pontas */
  function spark(x, y, r) {
    var k = r * .28;
    return P('M' + x + ' ' + (y - r) + 'Q' + (x + k) + ' ' + (y - k) + ' ' + (x + r) + ' ' + y + 'Q' + (x + k) + ' ' + (y + k) + ' ' + x + ' ' + (y + r) + 'Q' + (x - k) + ' ' + (y + k) + ' ' + (x - r) + ' ' + y + 'Q' + (x - k) + ' ' + (y - k) + ' ' + x + ' ' + (y - r) + 'Z', 'bd-spark');
  }
  function lines(arr, c) { return P(arr.join(''), c || 'bd-hl'); }

  /* ==========================================================
     MARCOS (caixa 320×240; chão em y≈172, nome por cima de ~168)
     ========================================================== */
  var ART = {
    shibuya: function () {
      var s = far(78, 120);
      s += T(26, 70, 64, 102, { cols: 5, rows: 3 });
      s += R(31, 76, 54, 36, 'bd-lit', ' stroke-width="2.5"') + lines(['M33 84h50', 'M33 92h50', 'M33 100h50', 'M33 108h50'], 'bd-scan') + spark(58, 94, 11);
      s += R(146, 20, 24, 12, 'bd-sil') + P('M152 20v-12M164 20v-8', 'bd-hl');
      s += P('M126 172V50a32 32 0 0 1 64 0V172Z', 'bd-sil');
      s += P('M130 172V52a28 28 0 0 1 20-27', 'bd-hl');
      for (var y = 62; y < 168; y += 14) s += P('M128 ' + y + 'H188', 'bd-ring');
      s += R(149, 34, 18, 118, 'bd-acc', ' stroke-width="2.5"');
      s += Tx(158, 62, '1', 'bd-sign', 22) + Tx(158, 88, '0', 'bd-sign', 22) + Tx(158, 114, '9', 'bd-sign', 22);
      s += R(152, 124, 12, 24, 'bd-ink');
      s += T(206, 54, 56, 118, { cols: 4, rows: 7, lit: .25 });
      s += R(211, 38, 46, 15, 'bd-paper', ' stroke-width="2"') + Tx(234, 50, 'SALE', 'bd-sign', 11);
      s += vsign(266, 66, 14, ['渋', '谷'], 'bd-lit', 'bd-sign', 11);
      for (var i = 0; i < 9; i++) { var x = 22 + i * 32; s += P('M' + x + ' 154h17l' + (4 + (i - 4) * 2) + ' 18h-21z', 'bd-paper'); }
      s += P('M40 150L280 172M280 150L40 172', 'bd-cross');
      s += G('translate(96 128) scale(1.15)', P('M2 24V12Q2 7 6 6L8-2 11 3Q15 2 16 6L20 6Q22 8 20 10L16 11Q14 16 17 24Z', 'bd-sil bd-outline') + C(15, 6, 1.2, 'bd-paper'));
      s += spark(108, 34, 9) + spark(292, 92, 7);
      return s;
    },

    shinjuku: function () {
      var s = far(70, 118);
      s += E(272, 104, 20, 70, 'bd-sil') + P('M254 70Q272 100 290 70M254 100Q272 130 290 100M254 130Q272 160 290 130M256 54Q272 80 288 54', 'bd-hl') + P('M272 34V172', 'bd-hl');
      s += T(102, 100, 116, 72, { cols: 9, rows: 4 });
      s += T(106, 44, 44, 58, { cols: 3, rows: 4, lit: .1 }) + T(170, 44, 44, 58, { cols: 3, rows: 4, lit: .1 });
      s += P('M106 44h44v-8h-6v-9h-32v9h-6z', 'bd-sil') + P('M170 44h44v-8h-6v-9h-32v9h-6z', 'bd-sil');
      s += P('M106 44h44M112 35h32M170 44h44M176 35h32', 'bd-hl') + R(118, 22, 20, 6, 'bd-acc') + R(182, 22, 20, 6, 'bd-acc');
      s += lines(['M122 48v52', 'M134 48v52', 'M186 48v52', 'M198 48v52'], 'bd-ring');
      s += R(24, 104, 7, 68, 'bd-sil') + R(90, 104, 7, 68, 'bd-sil');
      s += P('M16 92Q60 78 104 92V114Q60 100 16 114Z', 'bd-lit', ' stroke-width="3"');
      s += '<text x="60" y="106" class="bd-sign" style="font-size:10px" text-anchor="middle" textLength="74" lengthAdjust="spacingAndGlyphs" transform="rotate(-1 60 106)">歌舞伎町一番街</text>';
      for (var i = 0; i < 9; i++) { var bx = 20 + i * 10; s += C(bx, 90 - Math.sin(i / 8 * Math.PI) * 8, 1.8, 'bd-paper'); }
      s += vsign(36, 122, 14, ['ホ', 'テ', 'ル'], 'bd-acc', 'bd-sign', 10);
      s += spark(242, 26, 9) + spark(84, 52, 7);
      return s;
    },

    akihabara: function () {
      var s = far(74, 112);
      s += T(18, 58, 60, 114, { cols: 4, rows: 7, lit: .2 });
      s += vsign(24, 66, 14, ['ゲ', 'ー', 'ム'], 'bd-acc', 'bd-sign', 10) + vsign(58, 76, 14, ['ア', 'ニ', 'メ'], 'bd-lit', 'bd-sign', 10);
      s += T(90, 30, 100, 142, { cols: 7, rows: 9 });
      s += R(97, 40, 86, 50, 'bd-lit', ' stroke-width="3"');
      s += P('M118 56h44c9 0 14 7 14 15v2c0 9-9 12-15 6l-6-6h-30l-6 6c-6 6-15 3-15-6v-2c0-8 5-15 14-15z', 'bd-ink');
      s += R(121, 63, 4, 13, 'bd-paper') + R(116.5, 67.5, 13, 4, 'bd-paper') + C(157, 64, 3, 'bd-acc') + C(164, 70, 3, 'bd-paper') + C(150, 70, 3, 'bd-paper') + C(157, 76, 3, 'bd-acc');
      s += R(97, 96, 86, 16, 'bd-acc', ' stroke-width="2.5"') + Tx(140, 109, '電気街', 'bd-sign', 13);
      s += T(206, 56, 64, 116, { cols: 4, rows: 7 });
      s += R(211, 62, 54, 16, 'bd-paper', ' stroke-width="2"') + Tx(238, 75, 'ラジオ', 'bd-sign', 11);
      s += vsign(276, 70, 14, ['秋', '葉'], 'bd-acc', 'bd-sign', 10);
      s += R(10, 146, 300, 9, 'bd-sil') + R(10, 146, 300, 2.5, 'bd-hl-fill');
      for (var px = 26; px < 310; px += 46) s += R(px, 155, 7, 17, 'bd-sil');
      s += P('M54 144V126q0-6 6-6h176q14 0 22 12l6 12z', 'bd-lit', ' stroke-width="2.5"');
      for (var wx = 64; wx < 232; wx += 18) s += R(wx, 125, 12, 9, 'bd-ink');
      s += R(54, 137, 210, 3, 'bd-acc') + P('M244 125h10l7 10h-17z', 'bd-ink');
      s += spark(196, 22, 9) + spark(36, 40, 7);
      return s;
    },

    nakano: function () {
      var s = far(80, 116);
      s += T(112, 34, 96, 80, { cols: 7, rows: 5 });
      s += R(118, 20, 84, 16, 'bd-paper', ' stroke-width="2.5"') + '<text x="160" y="32.5" class="bd-sign" style="font-size:11px" text-anchor="middle" textLength="72" lengthAdjust="spacingAndGlyphs">BROADWAY</text>';
      s += R(66, 98, 188, 74, 'bd-sil') + P('M66 172V98H254', 'bd-hl');
      s += P('M92 172V138a68 36 0 0 1 136 0V172Z', 'bd-lit', ' stroke-width="3"');
      s += P('M92 138L146 156M228 138L174 156M160 102V156M110 120L150 156M210 120L170 156', 'bd-truss');
      s += R(146, 150, 28, 22, 'bd-ink') + C(156, 160, 2, 'bd-paper') + C(165, 163, 2, 'bd-paper');
      s += R(92, 102, 136, 20, 'bd-acc', ' stroke-width="2.5"') + '<text x="160" y="116.5" class="bd-sign" style="font-size:12px" text-anchor="middle" textLength="116" lengthAdjust="spacingAndGlyphs">中野サンモール</text>';
      s += C(274, 128, 34, 'bd-sil', ' stroke-width="2"') + C(274, 128, 28, 'bd-ring2') + C(274, 128, 22, 'bd-ring2') + C(274, 128, 16, 'bd-ring2') + C(274, 128, 10, 'bd-acc') + C(274, 128, 2.4, 'bd-paper');
      s += P('M254 106a30 30 0 0 1 22-8', 'bd-shine');
      s += P('M26 150a16 16 0 0 1 32 0z', 'bd-lit', ' stroke-width="2.5"') + P('M26 150a16 16 0 0 0 32 0z', 'bd-paper', ' stroke-width="2.5"') + P('M24 150h36', 'bd-ink-line');
      s += spark(46, 84, 9) + spark(232, 38, 7);
      return s;
    },

    ikebukuro: function () {
      var s = far(80, 118);
      s += T(68, 80, 54, 92, { cols: 4, rows: 6 });
      s += T(208, 66, 58, 106, { cols: 4, rows: 7 });
      s += R(214, 72, 46, 16, 'bd-acc', ' stroke-width="2"') + Tx(237, 85, '池袋', 'bd-sign', 12);
      s += T(132, 18, 60, 154, { cols: 0, d: 11 });
      s += R(136, 10, 52, 9, 'bd-sil') + P('M140 10V2M184 10V4', 'bd-hl');
      for (var y = 24; y < 168; y += 7) s += R(137, y, 50, 2.6, 'bd-win');
      s += R(144, 22, 5, 146, 'bd-side') + R(160, 22, 5, 146, 'bd-side') + R(176, 22, 5, 146, 'bd-side');
      s += R(22, 162, 64, 10, 'bd-sil') + R(26, 158, 56, 6, 'bd-side');
      s += E(54, 128, 27, 32, 'bd-sil') + P('M30 106l4-18 12 12zM78 106l-4-18-12 12z', 'bd-sil');
      s += E(54, 116, 21, 14, 'bd-side');
      s += C(44, 116, 9, 'bd-paper') + C(64, 116, 9, 'bd-paper') + C(45, 117, 4.4, 'bd-ink') + C(65, 117, 4.4, 'bd-ink') + C(43.5, 115, 1.4, 'bd-paper') + C(63.5, 115, 1.4, 'bd-paper');
      s += P('M50 124l4 7 4-7z', 'bd-acc') + P('M38 140q16 10 32 0M40 150q14 8 28 0M42 132q12 8 24 0', 'bd-hl');
      s += spark(108, 36, 9) + spark(288, 46, 7);
      return s;
    },

    harajuku: function () {
      var s = far(70, 104);
      s += P('M10 52L124 106V172H10Z', 'bd-sil') + P('M310 52L196 106V172H310Z', 'bd-sil');
      s += P('M124 172L148 110H172L196 172Z', 'bd-street');
      var colors = ['bd-acc', 'bd-lit', 'bd-paper'];
      for (var i = 0; i < 4; i++) {
        var x = 16 + i * 26, t = 56 + i * 12.5;
        s += P('M' + x + ' ' + (t + 12) + 'l20 9v14l-20-9z', colors[i % 3], ' stroke-width="2"');
        var xr = 304 - i * 26;
        s += P('M' + xr + ' ' + (t + 12) + 'l-20 9v14l20-9z', colors[(i + 1) % 3], ' stroke-width="2"');
      }
      s += win(16, 116, 96, 50, 6, 3, .2) + win(208, 116, 96, 50, 6, 3, .2);
      s += R(92, 66, 9, 106, 'bd-sil') + R(219, 66, 9, 106, 'bd-sil') + P('M92 172V66', 'bd-hl');
      s += P('M80 54Q160 30 240 54V80Q160 56 80 80Z', 'bd-paper', ' stroke-width="3"');
      s += '<text x="160" y="68" class="bd-sign" style="font-size:17px" text-anchor="middle" textLength="80" lengthAdjust="spacingAndGlyphs">竹下通り</text>';
      s += P('M132 18c-6-8-18-3-14 6l14 10 14-10c4-9-8-14-14-6z', 'bd-acc', ' stroke-width="2"') + P('M132 34v20', 'bd-ink-line');
      s += P('M188 22c-5-7-15-3-12 5l12 9 12-9c3-8-7-12-12-5z', 'bd-lit', ' stroke-width="2"') + P('M188 36v20', 'bd-ink-line');
      s += P('M262 172L246 120h32z', 'bd-paper', ' stroke-width="2.5"') + P('M250 132l26 4M252 144l22 4M256 156l16 3', 'bd-ink-line');
      s += C(252, 116, 11, 'bd-paper', ' stroke-width="2.5"') + C(270, 114, 12, 'bd-paper', ' stroke-width="2.5"') + C(261, 104, 11, 'bd-paper', ' stroke-width="2.5"');
      s += P('M258 98l6-8 5 9z', 'bd-acc', ' stroke-width="2"');
      s += spark(48, 34, 8) + spark(298, 30, 7);
      return s;
    },

    asakusa: function () {
      var s = far(96, 126);
      s += P('M52 6L56 6L62 172H46Z', 'bd-far2') + R(46, 60, 16, 6, 'bd-far2') + R(48, 84, 12, 4, 'bd-far2') + P('M54 0V8', 'bd-hl');
      for (var i = 0; i < 5; i++) {
        var w = 52 - i * 7, y = 160 - i * 22, cx = 272;
        s += R(cx - w / 2 + 6, y - 14, w - 12, 14, 'bd-sil');
        s += P('M' + (cx - w / 2 - 6) + ' ' + y + 'Q' + cx + ' ' + (y - 8) + ' ' + (cx + w / 2 + 6) + ' ' + y + 'l-6-8H' + (cx - w / 2) + 'z', 'bd-sil') + P('M' + (cx - w / 2 - 6) + ' ' + y + 'Q' + cx + ' ' + (y - 8) + ' ' + (cx + w / 2 + 6) + ' ' + y, 'bd-hl');
      }
      s += P('M272 54V24', 'bd-ink-thick') + P('M266 50h12M266 44h12M267 38h10M268 32h8', 'bd-hl');
      s += P('M52 76Q160 42 268 76L250 90H70Z', 'bd-sil') + P('M52 76Q160 42 268 76', 'bd-hl') + P('M70 90Q160 66 250 90', 'bd-hl');
      s += R(72, 90, 176, 9, 'bd-sil') + R(150, 50, 20, 8, 'bd-acc');
      s += R(80, 99, 13, 73, 'bd-acc', ' stroke-width="2.5"') + R(227, 99, 13, 73, 'bd-acc', ' stroke-width="2.5"');
      s += R(104, 99, 8, 73, 'bd-sil') + R(208, 99, 8, 73, 'bd-sil');
      s += P('M126 104Q116 134 126 164H194Q204 134 194 104Z', 'bd-deep', ' stroke-width="3"');
      s += P('M124 114Q160 120 196 114M120 124Q160 130 200 124M120 146Q160 152 200 146M124 156Q160 162 196 156', 'bd-rib');
      s += R(122, 98, 76, 9, 'bd-sil') + R(122, 162, 76, 9, 'bd-sil') + P('M126 98V102M194 98V102', 'bd-hl');
      s += '<text x="160" y="147" class="bd-sign jp" style="font-size:32px" text-anchor="middle">雷門</text>' + P('M138 110q-6 22 0 44', 'bd-shine');
      s += spark(106, 30, 8) + spark(214, 30, 6);
      return s;
    },

    roppongi: function () {
      var s = far(84, 120);
      s += P('M70 172L40 10L58 10Z', 'bd-beam') + P('M250 172L292 14L306 22Z', 'bd-beam');
      s += P('M214 172V44Q240 22 266 44V172Z', 'bd-sil') + P('M218 172V46Q240 28 262 46', 'bd-hl');
      for (var y = 54; y < 168; y += 9) s += P('M218 ' + y + 'H262', 'bd-ring');
      s += R(236, 18, 8, 10, 'bd-sil');
      s += T(26, 92, 72, 80, { cols: 5, rows: 4, lit: .3 });
      s += P('M46 104h32l-16 18zM62 122v14M54 138h16', 'bd-neon') + C(72, 104, 3, 'bd-neon');
      s += R(32, 146, 60, 14, 'bd-acc', ' stroke-width="2"') + Tx(62, 157, 'CLUB', 'bd-sign', 11);
      s += P('M160 6L168 56L188 134L200 172H184L170 120H150L136 172H120L132 134L152 56Z', 'bd-acc', ' stroke-width="2.5"');
      s += P('M152 56L188 134M168 56L132 134M146 82L176 120M174 82L144 120M156 30L164 50M164 30L156 50', 'bd-lattice');
      s += R(136, 84, 48, 12, 'bd-paper', ' stroke-width="2.5"') + R(148, 46, 24, 8, 'bd-paper', ' stroke-width="2"');
      s += R(128, 128, 64, 6, 'bd-paper', ' stroke-width="2"') + P('M160 6V-2', 'bd-ink-thick');
      s += spark(112, 30, 9) + spark(206, 70, 6) + spark(296, 120, 7);
      return s;
    },

    odaiba: function () {
      var s = far(104, 130);
      s += R(22, 62, 92, 110, 'bd-sil') + P('M22 172V62H114', 'bd-hl');
      s += lines(['M22 86H114', 'M22 110H114', 'M22 134H114', 'M45 62V172', 'M91 62V172'], 'bd-ring');
      s += C(68, 84, 20, 'bd-paper', ' stroke-width="2.5"') + P('M48 84h40M68 64v40M52 72q16 6 32 0M52 96q16-6 32 0', 'bd-ink-line');
      s += R(148, 36, 10, 102, 'bd-paper', ' stroke-width="2.5"') + R(254, 36, 10, 102, 'bd-paper', ' stroke-width="2.5"');
      s += R(146, 56, 14, 5, 'bd-sil') + R(252, 56, 14, 5, 'bd-sil') + R(146, 92, 14, 5, 'bd-sil') + R(252, 92, 14, 5, 'bd-sil');
      s += P('M118 120Q140 40 153 38Q206 132 259 38Q272 40 306 104', 'bd-cable');
      for (var x = 166; x < 252; x += 9) { var t = (x - 153) / 106, yy = (1 - t) * (1 - t) * 38 + 2 * (1 - t) * t * 132 + t * t * 38; s += P('M' + x + ' ' + n(yy) + 'V124', 'bd-hanger'); }
      s += R(114, 124, 196, 9, 'bd-sil') + R(114, 124, 196, 3, 'bd-acc');
      s += G('translate(126 136)', P('M0 36V18l-3-2 2-8-1-6 3 2 1 6 2-6 2 1-2 8 2 5-1 8v18z', 'bd-sil bd-outline'));
      s += R(10, 150, 300, 22, 'bd-lit') + P('M18 158q8-4 16 0t16 0M70 164q8-4 16 0t16 0M150 158q8-4 16 0t16 0M220 164q8-4 16 0t16 0M262 156q8-4 16 0', 'bd-wave');
      s += P('M152 150v20M258 150v20', 'bd-reflect');
      s += spark(210, 22, 9) + spark(126, 46, 6);
      return s;
    },

    kichijoji: function () {
      var s = far(92, 124);
      function tree(cx, cy, r) {
        var t = R(cx - 4, cy, 8, 172 - cy, 'bd-sil') + P('M' + cx + ' ' + (cy + 10) + 'l-12-10M' + cx + ' ' + (cy + 16) + 'l12-12', 'bd-ink-thick');
        t += C(cx - r * .55, cy - r * .2, r * .7, 'bd-sil') + C(cx + r * .5, cy - r * .3, r * .72, 'bd-sil') + C(cx, cy - r * .8, r * .75, 'bd-sil');
        t += C(cx - r * .5, cy - r * .35, r * .5, 'bd-side') + C(cx + r * .1, cy - r * .9, r * .45, 'bd-side');
        for (var i = 0; i < 14; i++) t += C(cx + (rnd() - .5) * r * 1.9, cy - r * .3 + (rnd() - .6) * r * 1.4, 2 + rnd() * 2.4, 'bd-bloom');
        return t;
      }
      s += tree(60, 92, 36) + tree(262, 86, 34);
      s += E(160, 154, 150, 20, 'bd-lit') + P('M40 152q10-4 20 0M120 160q10-4 20 0M200 150q10-4 20 0M250 160q10-4 20 0', 'bd-wave');
      s += P('M58 140Q160 98 262 140V148Q160 108 58 148Z', 'bd-sil');
      s += P('M66 134Q160 94 254 134', 'bd-hl');
      for (var x = 76; x < 250; x += 16) { var y = 140 - Math.sin((x - 58) / 204 * Math.PI) * 30; s += P('M' + x + ' ' + n(y - 1) + 'v-10', 'bd-ink-thick'); }
      function swan(x, y, f) {
        return G('translate(' + x + ' ' + y + ') scale(' + f + ' 1)',
          P('M-20 0q2 10 20 10h10q12 0 14-12l-10 4q-10-6-24-4z', 'bd-paper', ' stroke-width="2.5"') +
          P('M10 -2q-6-12 0-20q5-6 10-1', 'bd-ink-thick') + P('M10 -2q-6-12 0-20q5-6 10-1', 'bd-swan') +
          C(19, -22, 4.2, 'bd-paper', ' stroke-width="2"') + P('M22 -23l7 2-6 3z', 'bd-acc', ' stroke-width="1.5"') + C(19, -23, 1, 'bd-ink'));
      }
      s += swan(116, 150, 1) + swan(214, 158, -1);
      s += R(286, 118, 4, 30, 'bd-acc') + R(302, 118, 4, 30, 'bd-acc') + P('M280 114q16-4 32 0v5h-32z', 'bd-acc', ' stroke-width="2"') + R(282, 124, 28, 3, 'bd-sil');
      s += spark(160, 36, 9) + spark(120, 72, 6);
      return s;
    },

    ginza: function () {
      var s = far(88, 122);
      s += R(258, 66, 40, 106, 'bd-sil', ' rx="10"') + lines(['M264 74v94', 'M276 72v98', 'M288 74v94'], 'bd-scan') + R(262, 80, 32, 14, 'bd-lit');
      s += P('M54 172V100Q54 88 66 88H254Q266 88 266 100V172Z', 'bd-sil') + P('M54 172V100Q54 88 66 88H254', 'bd-hl');
      for (var x = 66; x < 256; x += 17) { s += P('M' + x + ' 136v-16a6 6 0 0 1 12 0v16z', 'bd-win') + R(x, 146, 12, 18, 'bd-win'); }
      s += R(54, 106, 212, 4, 'bd-hl-fill');
      s += R(130, 46, 60, 44, 'bd-sil') + P('M130 90V46H190', 'bd-hl') + P('M124 46Q160 12 196 46Z', 'bd-sil') + P('M128 46Q160 16 192 46', 'bd-hl') + R(157, 4, 6, 18, 'bd-sil');
      s += C(160, 66, 17, 'bd-paper', ' stroke-width="3"');
      for (var a = 0; a < 12; a++) { var ang = a / 12 * Math.PI * 2; s += P('M' + n(160 + Math.cos(ang) * 13) + ' ' + n(66 + Math.sin(ang) * 13) + 'L' + n(160 + Math.cos(ang) * 15.5) + ' ' + n(66 + Math.sin(ang) * 15.5), 'bd-ink-line'); }
      s += P('M160 66V55M160 66l7 5', 'bd-ink-thick') + C(160, 66, 2, 'bd-acc');
      function lamp(x) { return R(x - 2, 112, 4, 60, 'bd-sil') + P('M' + (x - 12) + ' 112h24', 'bd-ink-thick') + C(x - 12, 106, 6, 'bd-lit', ' stroke-width="2"') + C(x + 12, 106, 6, 'bd-lit', ' stroke-width="2"') + C(x, 100, 7, 'bd-lit', ' stroke-width="2"'); }
      s += lamp(30) + lamp(286);
      s += P('M210 148h22l3 24h-28z', 'bd-acc', ' stroke-width="2.5"') + P('M215 148q6-12 12 0', 'bd-ink-line') + P('M228 152h20l2 20h-24z', 'bd-paper', ' stroke-width="2.5"') + P('M233 152q5-10 10 0', 'bd-ink-line');
      s += spark(100, 30, 8) + spark(226, 32, 7);
      return s;
    },

    meguro: function () {
      var s = far(80, 112);
      s += P('M10 172L118 116H202L310 172Z', 'bd-lit');
      s += P('M10 172L118 116V108L10 160Z', 'bd-sil') + P('M310 172L202 116V108L310 160Z', 'bd-sil');
      s += P('M60 166q20-8 40 0M140 150q12-5 24 0M200 162q20-8 40 0M150 132q8-3 16 0', 'bd-wave');
      s += P('M108 122Q160 94 212 122V128Q160 102 108 128Z', 'bd-sil') + P('M112 118Q160 92 208 118', 'bd-hl');
      function canopy(cx, cy, dir) {
        var t = P('M' + cx + ' 172V' + (cy + 10) + 'q' + (dir * 12) + '-14 ' + (dir * 26) + '-18', 'bd-ink-thick');
        for (var i = 0; i < 7; i++) t += C(cx + dir * (i * 12 - 6) + (rnd() - .5) * 8, cy - 8 + (rnd() - .5) * 26 + i * 2, 13 + rnd() * 8, 'bd-blossom');
        for (var j = 0; j < 18; j++) t += C(cx + dir * (rnd() * 82 - 14), cy - 22 + rnd() * 44, 1.6 + rnd() * 2, 'bd-acc', ' stroke-width="0"');
        return t;
      }
      s += canopy(34, 66, 1) + canopy(286, 66, -1);
      s += P('M20 46Q160 74 300 46', 'bd-ink-line');
      for (var i = 0; i < 9; i++) { var x = 36 + i * 31, y = 46 + Math.sin((x - 20) / 280 * Math.PI) * 14 + 4; s += E(x, y + 6, 6, 8, 'bd-paper', ' stroke-width="2"') + R(x - 6, y + 4, 12, 3, 'bd-acc'); }
      for (var k = 0; k < 10; k++) { var px = 100 + rnd() * 120, py = 70 + rnd() * 70; s += E(px, py, 3, 1.6, 'bd-petal', ' transform="rotate(' + Math.round(rnd() * 180) + ' ' + n(px) + ' ' + n(py) + ')"'); }
      s += spark(160, 30, 9);
      return s;
    }
  };

  /* ---------- molduras ---------- */
  function frame(kind, id) {
    setSeed('frame-' + id);
    var cx = 160, cy = 104;
    if (kind === 'circle') return { d: 'M' + (cx - 106) + ' ' + cy + 'a106 98 0 1 0 212 0a106 98 0 1 0-212 0z', ring: true };
    if (kind === 'ticket') return { d: 'M30 14H290L304 40V170L290 196H30L16 170V40Z' };
    if (kind === 'cut') return { d: 'M22 24L300 8L292 190L14 200Z' };
    var pts = [], spikes = 26;
    for (var k = 0; k < spikes * 2; k++) {
      var a = (k / (spikes * 2)) * Math.PI * 2 - Math.PI / 2, outer = k % 2 === 0;
      var rx = outer ? 142 + rnd() * 16 : 118 + rnd() * 8, ry = outer ? 98 + rnd() * 12 : 84 + rnd() * 6;
      pts.push(n(cx + Math.cos(a) * rx) + ' ' + n(cy + Math.sin(a) * ry));
    }
    return { d: 'M' + pts.join('L') + 'Z' };
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  /* ---------- nome em letras recortadas ---------- */
  function ransom(name, id, style) {
    setSeed('name-' + id + name);
    var txt = String(name || '').toUpperCase().slice(0, 14);
    var len = txt.length || 1, fs = len > 10 ? 24 : len > 8 ? 28 : 32, bw = fs * .8;
    var total = len * (bw + 1.5), x0 = 160 - total / 2 + bw / 2;
    var L = n(x0 - bw / 2 - 18), Rr = n(x0 + total - bw / 2 + 18);
    var bar = 'M' + L + ' 173L' + Rr + ' 167L' + (Rr - 6) + ' 207L' + (L + 6) + ' 211Z';
    var plate = '<g class="bd-namebar">' + P(bar, 'bd-plate-shadow', ' transform="translate(6 6)"') + P(bar, 'bd-plate') + '</g>';
    if (style === 'solid') {
      return plate + '<text x="160" y="198" class="bd-name" style="font-size:' + (fs + 2) + 'px" text-anchor="middle" textLength="' + n(Math.min(total, 250)) + '" lengthAdjust="spacingAndGlyphs" transform="rotate(-2 160 190)">' + esc(txt) + '</text>';
    }
    var kinds = ['l-paper', 'l-ink', 'l-acc', 'l-lit'], s = plate, last = -1;
    for (var i = 0; i < len; i++) {
      var ch = txt[i]; if (ch === ' ') continue;
      var k = Math.floor(rnd() * 4); if (k === last) k = (k + 1 + Math.floor(rnd() * 3)) % 4; if (i === 0) k = 0; last = k;
      var r = (rnd() - .5) * 18, dy = (rnd() - .5) * 8, sc = .92 + rnd() * .2, x = x0 + i * (bw + 1.5), h = fs * 1.08 * sc, w = bw * sc;
      var sk = (rnd() - .5) * 4;
      s += '<g class="bd-letter ' + kinds[k] + '" transform="translate(' + n(x) + ' ' + n(189 + dy) + ') rotate(' + n(r) + ')">' +
        '<path d="M' + n(-w / 2 + sk) + ' ' + n(-h / 2) + 'L' + n(w / 2) + ' ' + n(-h / 2 - sk) + 'L' + n(w / 2 - sk) + ' ' + n(h / 2) + 'L' + n(-w / 2) + ' ' + n(h / 2 + sk * .5) + 'Z" class="bd-lbox"/>' +
        '<text y="' + n(fs * .36 * sc) + '" text-anchor="middle" style="font-size:' + n(fs * sc) + 'px" class="bd-ltext">' + esc(ch) + '</text></g>';
    }
    return s;
  }

  /* ==========================================================
     ESTILOS EDITÁVEIS  (state.badgeStyles[id])
     ========================================================== */
  var DEF = { name: '', jp: '', frame: 'burst', letters: 'ransom', rays: true, tone: true, colors: 'theme', a: '#ef2b97', b: '#6ce6ff', tilt: 0, img: '' };
  function styleOf(id) {
    var st = {};
    try { st = (state.badgeStyles && state.badgeStyles[id]) || {}; } catch (e) {}
    var o = {}; for (var k in DEF) o[k] = st[k] == null ? DEF[k] : st[k];
    if (!o.name) o.name = NAMES[id] ? NAMES[id][0] : String(id).toUpperCase();
    if (!o.jp && st.jp == null) o.jp = NAMES[id] ? NAMES[id][1] : '';
    return o;
  }
  function saveStyle(id, patch) {
    if (!state.badgeStyles) state.badgeStyles = {};
    var cur = state.badgeStyles[id] || {};
    for (var k in patch) cur[k] = patch[k];
    state.badgeStyles[id] = cur;
    try { saveState(true); } catch (e) {}
  }

  /* ---------- montar o selo ---------- */
  var uidN = 0;
  function markup(id, st) {
    st = st || styleOf(id);
    var uid = 'bd' + (++uidN), fr = frame(st.frame, id);
    setSeed('art-' + id);
    var art = ART[id] ? ART[id]() : '';
    var rays = '';
    if (st.rays) { for (var i = 0; i < 18; i++) { var a1 = i / 18 * Math.PI * 2, a2 = a1 + Math.PI / 36; rays += 'M160 104L' + n(160 + Math.cos(a1) * 260) + ' ' + n(104 + Math.sin(a1) * 260) + 'L' + n(160 + Math.cos(a2) * 260) + ' ' + n(104 + Math.sin(a2) * 260) + 'Z'; } }
    return '' +
      '<defs>' +
        '<clipPath id="' + uid + 'c"><path d="' + fr.d + '"/></clipPath>' +
        '<pattern id="' + uid + 'p" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><circle cx="3" cy="3" r="1.25" class="bd-dot"/></pattern>' +
        '<linearGradient id="' + uid + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>' +
        '<mask id="' + uid + 'm"><rect x="0" y="0" width="320" height="240" fill="url(#' + uid + 'g)"/></mask>' +
        '<pattern id="' + uid + 's" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.3" class="bd-scanline"/></pattern>' +
      '</defs>' +
      '<g class="bd-float"><g transform="rotate(' + (+st.tilt || 0) + ' 160 120)">' +
        '<path d="' + fr.d + '" class="bd-frame-shadow" transform="translate(8 8)"/>' +
        '<path d="' + fr.d + '" class="bd-frame"/>' +
        '<g clip-path="url(#' + uid + 'c)">' +
          (rays ? '<path d="' + rays + '" class="bd-ray"/>' : '') +
          (st.tone ? '<rect width="320" height="240" fill="url(#' + uid + 'p)" mask="url(#' + uid + 'm)" class="bd-tone"/>' : '') +
          (st.img ? '<image href="' + esc(st.img) + '" x="0" y="0" width="320" height="200" preserveAspectRatio="xMidYMid slice" class="bd-photo"/>' : '<g class="bd-art">' + art + '</g>') +
          '<rect width="320" height="240" fill="url(#' + uid + 's)" class="bd-scan-all"/>' +
        '</g>' +
        '<path d="' + fr.d + '" class="bd-frame-line"/>' +
        (fr.ring ? '<path d="' + fr.d + '" class="bd-frame-ring" transform="translate(160 104) scale(.93) translate(-160 -104)"/>' : '') +
        '<path d="' + fr.d + '" class="bd-glitch" transform="translate(-6 4)"/>' +
        '<g class="bd-cog-eye" transform="translate(278 30)"><path d="M-18 0q18-15 36 0-18 15-36 0z" class="bd-eye"/><circle r="6" class="bd-pupil"/></g>' +
        ransom(st.name, id, st.letters) +
        (st.jp ? '<g transform="translate(266 224) rotate(-5)"><rect x="-34" y="-11" width="68" height="20" class="bd-jp-bg"/><text y="4.5" text-anchor="middle" class="bd-jp" style="font-size:12px"' + (st.jp.length > 4 ? ' textLength="58" lengthAdjust="spacingAndGlyphs"' : '') + '>' + esc(st.jp) + '</text></g>' : '') +
      '</g></g>';
  }
  function makeSvg(id, box, cls) {
    var st = styleOf(id), svg = document.createElementNS(NS, 'svg');
    if (box) ['x', 'y', 'width', 'height'].forEach(function (k) { if (box[k] != null) svg.setAttribute(k, box[k]); });
    svg.setAttribute('viewBox', '-6 -10 332 252');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('overflow', 'visible');
    svg.setAttribute('class', ((cls || '') + ' bd-badge bd-' + id).trim());
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('data-badge', id);
    if (st.colors === 'custom') { svg.setAttribute('data-custom', '1'); svg.setAttribute('style', '--bd-ca:' + st.a + ';--bd-cb:' + st.b); }
    svg.innerHTML = markup(id, st);
    return svg;
  }

  /* ---------- trocar as imagens do mapa ---------- */
  var byHref = null;
  function hrefMap() {
    if (byHref) return byHref; byHref = {};
    try { Object.keys(DISTRICT_BADGE_IMAGES).forEach(function (id) { byHref[DISTRICT_BADGE_IMAGES[id]] = id; }); } catch (e) {}
    return byHref;
  }
  function swap() {
    var map = hrefMap(), imgs = document.querySelectorAll('#districts image:not(.bd-photo), #landmarks image:not(.bd-photo)');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i], href = img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      var id = map[href]; if (!id || !NAMES[id]) continue;
      var box = {}; ['x', 'y', 'width', 'height'].forEach(function (k) { box[k] = img.getAttribute(k); });
      img.parentNode.replaceChild(makeSvg(id, box, img.getAttribute('class') || 'district-art-image'), img);
    }
  }
  function refresh(id) {
    var list = document.querySelectorAll('#districts svg.bd-badge' + (id ? '.bd-' + id : '') + ', #landmarks svg.bd-badge' + (id ? '.bd-' + id : ''));
    for (var i = 0; i < list.length; i++) {
      var old = list[i], bid = old.getAttribute('data-badge'); if (!bid) continue;
      var box = {}; ['x', 'y', 'width', 'height'].forEach(function (k) { box[k] = old.getAttribute(k); });
      var cls = (old.getAttribute('class') || '').replace(/\s*bd-badge[\s\S]*$/, '');
      old.parentNode.replaceChild(makeSvg(bid, box, cls), old);
    }
  }

  window.PhobiaBadges = { ids: IDS, names: NAMES, markup: markup, makeSvg: makeSvg, styleOf: styleOf, saveStyle: saveStyle, refresh: refresh };

  /* ==========================================================
     EDITOR — aba SELOS no painel VISUAL
     ========================================================== */
  var ed = { id: 'shibuya', root: null };
  function buildEditor() {
    var body = document.querySelector('#sheetAppearanceBackdrop .sheet-ui-modal-body');
    var tabs = body && body.querySelector('.hs-tabs');
    if (!tabs || tabs.querySelector('[data-hs-tab="selos"]')) return;
    tabs.style.gridTemplateColumns = 'repeat(5,1fr)';
    var t = document.createElement('button'); t.type = 'button'; t.dataset.hsTab = 'selos'; t.textContent = 'SELOS';
    tabs.appendChild(t);
    var pane = document.createElement('section'); pane.className = 'hs-pane'; pane.dataset.hsPane = 'selos';
    pane.innerHTML =
      '<p class="hs-hint">Edite o selo de cada distrito do mapa. As mudanças aparecem no mapa na hora.</p>' +
      '<div class="be-picker">' + IDS.map(function (id) { return '<button type="button" data-be-id="' + id + '">' + NAMES[id][0] + '</button>'; }).join('') + '</div>' +
      '<div class="be-preview" id="bePreview"></div>' +
      '<div class="be-form">' +
        '<label class="be-field"><span>Nome</span><input type="text" maxlength="14" data-be="name" autocomplete="off" spellcheck="false"></label>' +
        '<label class="be-field"><span>Japonês</span><input type="text" maxlength="6" data-be="jp" autocomplete="off" spellcheck="false"></label>' +
        '<div class="be-field wide"><span>Moldura</span><div class="hs-row">' +
          [['burst', 'EXPLOSÃO'], ['circle', 'CÍRCULO'], ['ticket', 'TICKET'], ['cut', 'RECORTE']].map(function (o) { return '<button type="button" data-be-frame="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="be-field wide"><span>Letras do nome</span><div class="hs-row"><button type="button" data-be-letters="ransom">RECORTADAS</button><button type="button" data-be-letters="solid">FAIXA</button></div></div>' +
        '<div class="be-field wide"><span>Fundo</span><div class="hs-row"><button type="button" data-be-toggle="rays">RAIOS</button><button type="button" data-be-toggle="tone">RETÍCULA</button></div></div>' +
        '<div class="be-field wide"><span>Cores</span><div class="hs-row"><button type="button" data-be-colors="theme">DO TEMA</button><button type="button" data-be-colors="custom">PRÓPRIAS</button>' +
          '<label class="be-swatch" title="Cor principal"><input type="color" data-be="a"><i></i></label><label class="be-swatch" title="Cor de destaque"><input type="color" data-be="b"><i></i></label></div></div>' +
        '<label class="be-field wide"><span>Inclinação <b id="beTiltV">0°</b></span><input type="range" min="-12" max="12" step="1" data-be="tilt"></label>' +
        '<div class="be-field wide"><span>Imagem própria</span><div class="hs-row"><label class="be-upload">ESCOLHER IMAGEM<input type="file" accept="image/*" id="beFile"></label><button type="button" data-be-clearimg>TIRAR IMAGEM</button></div>' +
          '<small class="be-note">A imagem entra no lugar do desenho, mantendo a moldura e o nome.</small></div>' +
      '</div>' +
      '<div class="be-actions"><button type="button" class="hs-ghost" data-be-all>Usar esta moldura, letras e fundo em todos</button><button type="button" class="hs-ghost danger" data-be-reset>Restaurar este selo</button></div>';
    body.appendChild(pane);
    ed.root = pane;
    pane.addEventListener('click', onClick);
    pane.addEventListener('input', onInput);
    pane.querySelector('#beFile').addEventListener('change', onFile);
    paint();
  }
  function cur() { return styleOf(ed.id); }
  function update(patch) { saveStyle(ed.id, patch); refresh(ed.id); paint(); }
  function onClick(e) {
    var b = e.target.closest('button'); if (!b) return; var d = b.dataset;
    if (d.beId) { ed.id = d.beId; paint(); return; }
    if (d.beFrame) return update({ frame: d.beFrame });
    if (d.beLetters) return update({ letters: d.beLetters });
    if (d.beToggle) { var o = {}; o[d.beToggle] = !cur()[d.beToggle]; return update(o); }
    if (d.beColors) return update({ colors: d.beColors });
    if (b.hasAttribute('data-be-clearimg')) return update({ img: '' });
    if (b.hasAttribute('data-be-reset')) { if (state.badgeStyles) delete state.badgeStyles[ed.id]; try { saveState(true); } catch (x) {} refresh(ed.id); paint(); return; }
    if (b.hasAttribute('data-be-all')) {
      var c = cur(); IDS.forEach(function (id) { saveStyle(id, { frame: c.frame, letters: c.letters, rays: c.rays, tone: c.tone }); });
      refresh(); paint();
    }
  }
  var tmr;
  function onInput(e) {
    var el = e.target, k = el.dataset && el.dataset.be; if (!k) return;
    var v = el.value, p = {};
    if (k === 'tilt') { v = +v; var tv = document.getElementById('beTiltV'); if (tv) tv.textContent = v + '°'; }
    p[k] = v; if (k === 'a' || k === 'b') p.colors = 'custom';
    saveStyle(ed.id, p);
    clearTimeout(tmr); tmr = setTimeout(function () { refresh(ed.id); paintPreview(); paintButtons(); }, 60);
  }
  function onFile(e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var max = 420, sc = Math.min(1, max / Math.max(im.width, im.height));
        var cv = document.createElement('canvas'); cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        var url = ''; try { url = cv.toDataURL('image/webp', .82); } catch (x) {}
        if (url.indexOf('data:image/webp') !== 0) url = cv.toDataURL('image/jpeg', .82);
        update({ img: url });
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(f); e.target.value = '';
  }
  function paintPreview() {
    var box = document.getElementById('bePreview'); if (!box) return;
    box.innerHTML = ''; box.appendChild(makeSvg(ed.id, null, 'be-svg'));
  }
  function paintButtons() {
    if (!ed.root) return; var c = cur(), r = ed.root;
    r.querySelectorAll('[data-be-id]').forEach(function (b) { b.classList.toggle('on', b.dataset.beId === ed.id); });
    r.querySelectorAll('[data-be-frame]').forEach(function (b) { b.classList.toggle('on', b.dataset.beFrame === c.frame); });
    r.querySelectorAll('[data-be-letters]').forEach(function (b) { b.classList.toggle('on', b.dataset.beLetters === c.letters); });
    r.querySelectorAll('[data-be-toggle]').forEach(function (b) { b.classList.toggle('on', !!c[b.dataset.beToggle]); });
    r.querySelectorAll('[data-be-colors]').forEach(function (b) { b.classList.toggle('on', b.dataset.beColors === c.colors); });
    r.querySelectorAll('.be-swatch').forEach(function (l) { var i = l.querySelector('input'); l.querySelector('i').style.background = c[i.dataset.be]; });
    var clr = r.querySelector('[data-be-clearimg]'); if (clr) clr.disabled = !c.img;
  }
  function paint() {
    if (!ed.root) return; var c = cur(), r = ed.root;
    r.querySelectorAll('[data-be]').forEach(function (i) {
      if (i.type === 'file' || document.activeElement === i) return;
      i.value = c[i.dataset.be];
    });
    var tv = document.getElementById('beTiltV'); if (tv) tv.textContent = (c.tilt || 0) + '°';
    paintButtons(); paintPreview();
  }

  /* ---------- ligar ---------- */
  function init() {
    if (typeof renderDistricts !== 'function' || typeof state === 'undefined') { setTimeout(init, 200); return; }
    var orig = window.renderDistricts;
    if (!orig.__bd) {
      var w = function () { var r = orig.apply(this, arguments); try { swap(); } catch (e) {} return r; };
      w.__bd = true; window.renderDistricts = w;
    }
    swap();
    var host = document.getElementById('districts');
    if (host && 'MutationObserver' in window) {
      var pending = false;
      new MutationObserver(function () {
        if (pending) return; pending = true;
        requestAnimationFrame(function () { pending = false; if (host.querySelector('image:not(.bd-photo)')) swap(); });
      }).observe(host, { childList: true, subtree: true });
    }
    buildEditor(); setTimeout(buildEditor, 800); setTimeout(buildEditor, 2500);
    var oa = window.openSheetAppearance;
    if (typeof oa === 'function' && !oa.__bd) {
      var wa = function () { var r = oa.apply(this, arguments); try { buildEditor(); paint(); } catch (e) {} return r; };
      wa.__bd = true; wa.__hs = oa.__hs; window.openSheetAppearance = wa;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

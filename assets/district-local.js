/* ==========================================================
   PERSONA // PHOBIA — district-local.js
   O mapa POR DENTRO de cada distrito, refeito:
   - cenário próprio do bairro (quarteirões, trilho, rio, parque…)
   - ruas no mesmo estilo do mapa de Tóquio
   - pinos estilo P5 com ícone, número e estado
   - rota animada: um marcador viaja pelas ruas até o local escolhido
   - filtros por tipo, busca, anterior/próximo, lista em cartões
   - modo Cognição: tudo vira neon com distorções nos locais
   Mantém os mesmos ids e funções do site (focusSubmapPlace,
   atlasFilterLocal, atlasSetLocalView…), então salvar, senhas
   e anotações continuam iguais.
   ========================================================== */
(function () {
  'use strict';
  if (window.__districtLocal) return; window.__districtLocal = true;

  var W = 1200, H = 780;
  var seed = 1;
  function setSeed(s) { seed = 0; for (var i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) % 233280; seed = seed || 11; }
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function n(v) { return Math.round(v * 10) / 10; }
  function E(v) { return typeof esc === 'function' ? esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function locked(r) { return typeof atlasLocked === 'function' ? atlasLocked(r) : false; }

  /* ---------- cenário de cada distrito ---------- */
  var SCENE = {
    shibuya:   { angle: -8,  rail: [[430, -20], [470, 800]], avenue: [[-20, 470], [420, 430], [760, 380], [1220, 300]], plaza: { x: 470, y: 440, r: 80, kind: 'scramble' } },
    shinjuku:  { angle: 0,   rail: [[600, -20], [600, 800]], avenue: [[-20, 420], [1220, 420]], park: { d: 'M830 520 L1180 480 L1220 800 L860 800 Z' }, towers: { x: 120, y: 80, w: 360, h: 260 } },
    akihabara: { angle: 12,  rail: [[-20, 560], [1220, 260]], avenue: [[520, -20], [560, 800]], water: { d: 'M-20 90 C 300 40 700 150 1220 70 L1220 130 C 700 210 300 100 -20 150 Z' } },
    ikebukuro: { angle: -4,  rail: [[360, -20], [380, 800]], avenue: [[-20, 400], [600, 380], [1220, 450]], plaza: { x: 820, y: 300, r: 100, kind: 'complex' } },
    nakano:    { angle: 0,   rail: [[-20, 620], [1220, 620]], avenue: [[600, -20], [600, 800]], arcade: { x: 570, y: 140, w: 60, h: 470 } },
    harajuku:  { angle: -6,  rail: [[520, -20], [540, 800]], avenue: [[540, 420], [1220, 470]], park: { d: 'M-20 -20 L470 -20 L500 800 L-20 800 Z' } },
    asakusa:   { angle: 6,   avenue: [[-20, 560], [1220, 520]], water: { d: 'M960 -20 C 1000 200 940 420 1010 800 L1220 800 L1220 -20 Z' }, plaza: { x: 520, y: 330, r: 130, kind: 'temple' } },
    roppongi:  { angle: -14, avenue: [[-20, 520], [1220, 360]], highway: [[-20, 300], [1220, 160]], plaza: { x: 820, y: 560, r: 70, kind: 'tower' } },
    odaiba:    { angle: 20,  avenue: [[200, 380], [1000, 420]], water: { d: 'M-700 -500 L1900 -500 L1900 1300 L-700 1300 Z', island: 'M120 180 C 300 90 760 110 1040 190 C 1140 330 1100 610 940 680 C 640 760 300 720 150 600 C 70 470 60 300 120 180 Z' }, bridge: [[-20, 140], [220, 260]] },
    kichijoji: { angle: 0,   rail: [[-20, 230], [1220, 230]], avenue: [[700, -20], [720, 800]], park: { d: 'M-20 420 L620 380 L660 800 L-20 800 Z' }, water: { d: 'M90 560 C 200 470 420 480 520 560 C 560 640 420 720 260 700 C 120 690 60 640 90 560 Z' } },
    ginza:     { angle: 0,   avenue: [[600, -20], [600, 800]], avenue2: [[-20, 400], [1220, 400]] },
    meguro:    { angle: -20, avenue: [[-20, 200], [1220, 160]], water: { d: 'M-20 640 C 300 560 700 520 1220 300 L1220 380 C 700 600 300 640 -20 720 Z', sakura: true } }
  };

  /* ---------- ícones dos locais (linha, cor do texto) ---------- */
  var ICONS = {
    train: 'M18 46h28M22 54l4-8M42 54l-4-8M20 14h24a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6zM14 30h36M24 38h.1M40 38h.1',
    music: 'M24 46V16l26-6v30M24 46a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM50 40a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
    shop: 'M12 24l4-12h32l4 12M12 24h40v28H12zM12 24c0 5 6 7 10 2 4 5 10 5 13 0 3 5 9 5 12 0 4 5 5 0 5-2M26 52V38h12v14',
    star: 'M32 8l7 15 17 2-12 11 3 17-15-8-15 8 3-17L8 25l17-2z',
    danger: 'M32 8l26 46H6zM32 26v12M32 45v1',
    arcade: 'M18 10h28v44H18zM24 16h16v14H24zM26 40h.1M38 40h.1M32 36v8M28 40h8',
    cafe: 'M14 26h30v12a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12zM44 30h4a5 5 0 0 1 0 10h-4M22 12c-2 4 2 6 0 10M30 12c-2 4 2 6 0 10',
    food: 'M20 10v18a6 6 0 0 0 12 0V10M26 10v44M44 10c-6 4-6 16 0 20v24',
    park: 'M32 54V34M32 34l-8-8M32 40l8-8M32 8c10 0 16 8 16 16s-7 14-16 14-16-6-16-14S22 8 32 8z',
    temple: 'M8 22h48L50 14H14zM14 22v6h36v-6M18 28v26M46 28v26M10 54h44M26 54V38h12v16',
    school: 'M8 26l24-14 24 14-24 14zM18 32v12c8 6 20 6 28 0V32M56 26v14',
    health: 'M24 10h16v14h14v16H40v14H24V40H10V24h14z',
    police: 'M32 8l20 8v14c0 12-8 20-20 26-12-6-20-14-20-26V16zM32 22l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
    hotel: 'M10 50V18M10 38h44v12M10 30h12a6 6 0 0 1 0 0v8M26 30h22a6 6 0 0 1 6 6v2',
    club: 'M14 12h36L32 34zM32 34v16M22 52h20M40 22h.1',
    film: 'M10 16h44v32H10zM10 24h44M10 40h44M18 16v8M30 16v8M42 16v8M18 40v8M30 40v8M42 40v8',
    book: 'M32 16c-6-4-14-4-20-2v36c6-2 14-2 20 2 6-4 14-4 20-2V14c-6-2-14-2-20 2zM32 16v36',
    building: 'M14 54V14h22v40M36 26h14v28M10 54h44M20 22h4M28 22h.1M20 30h4M20 38h4M42 34h.1M42 42h.1',
    water: 'M8 30c6-6 10 6 16 0s10 6 16 0 10 6 16 0M8 42c6-6 10 6 16 0s10 6 16 0 10 6 16 0M32 8v14M24 16h16',
    eye: 'M6 32c8-12 16-18 26-18s18 6 26 18c-8 12-16 18-26 18S14 44 6 32zM32 24a8 8 0 1 1 0 16 8 8 0 0 1 0-16z',
    house: 'M10 30L32 12l22 18M16 26v28h32V26M28 54V40h8v14'
  };
  function iconKey(p) {
    var k = '';
    try { k = normalizeIconKey(p.icon || p.type); } catch (e) {}
    var t = String((p.icon || '') + ' ' + (p.type || '') + ' ' + k).toLowerCase();
    var map = [
      [/train|subway|transporte|esta[cç][aã]o|metr/, 'train'], [/music|m[uú]sica|disco|record|studio|est[uú]dio/, 'music'],
      [/arcade|game/, 'arcade'], [/cafe|caf[eé]/, 'cafe'], [/restaurant|comida|food|ramen|bar\b/, 'food'],
      [/club|noite|boate|entertainment|entreten/, 'club'], [/cinema|filme/, 'film'], [/library|biblio|livr/, 'book'],
      [/temple|templo|santu|shrine/, 'temple'], [/park|parque|jardim|beach|praia/, 'park'], [/school|escola|colegio/, 'school'],
      [/hospital|cl[ií]nica|sa[uú]de/, 'health'], [/police|pol[ií]cia/, 'police'], [/hotel/, 'hotel'],
      [/danger|perigo/, 'danger'], [/cogn/, 'eye'], [/shop|mall|com[eé]rcio|loja/, 'shop'], [/port|bridge|ponte|porto|rio/, 'water'],
      [/house|casa/, 'house'], [/office|building|pr[eé]dio|govern/, 'building']
    ];
    for (var i = 0; i < map.length; i++) if (map[i][0].test(t)) return map[i][1];
    return 'star';
  }
  function icon(p) { return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="' + ICONS[iconKey(p)] + '"/></svg>'; }

  var STATE_TXT = function (s) { try { return STATUS[s] || s; } catch (e) { return s; } };

  /* ---------- posições ---------- */
  function layout(id, places) {
    var cx = W / 2, cy = H / 2 + 10, coords = places.map(function (p) { return locked(p) ? null : (typeof PUBLIC_PLACE_COORDS !== 'undefined' && PUBLIC_PLACE_COORDS[p.id]) || null; });
    var known = coords.filter(Boolean), pos;
    setSeed('pos-' + id);
    if (known.length >= 2) {
      var lats = known.map(function (c) { return c[0]; }), lngs = known.map(function (c) { return c[1]; });
      var mLat = (Math.min.apply(0, lats) + Math.max.apply(0, lats)) / 2, mLng = (Math.min.apply(0, lngs) + Math.max.apply(0, lngs)) / 2;
      var rLat = Math.max.apply(0, lats) - Math.min.apply(0, lats), rLng = (Math.max.apply(0, lngs) - Math.min.apply(0, lngs)) * .81;
      var k = Math.min(620 / Math.max(rLng, .0005), 380 / Math.max(rLat, .0005));
      pos = places.map(function (p, i) {
        if (coords[i]) return { x: cx + (coords[i][1] - mLng) * .81 * k, y: cy - (coords[i][0] - mLat) * k };
        var a = i / places.length * Math.PI * 2 + .6; return { x: cx + Math.cos(a) * 300, y: cy + Math.sin(a) * 200 };
      });
    } else {
      var count = places.length;
      pos = places.map(function (p, i) {
        if (count === 1) return { x: cx + 40, y: cy - 10 };
        var a = -Math.PI / 2 + i / count * Math.PI * 2 + .35; return { x: cx + Math.cos(a) * 320, y: cy + Math.sin(a) * 210 };
      });
    }
    var MX = 300, MY = 150;
    for (var step = 0; step < 160; step++) {
      var moved = false;
      for (var i = 0; i < pos.length; i++) for (var j = i + 1; j < pos.length; j++) {
        var a = pos[i], b = pos[j], dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) < MX && Math.abs(dy) < MY) {
          moved = true;
          if ((MX - Math.abs(dx)) / MX < (MY - Math.abs(dy)) / MY) { var px = (MX - Math.abs(dx)) / 2 + 1, sx = dx >= 0 ? 1 : -1; a.x -= px * sx; b.x += px * sx; }
          else { var py = (MY - Math.abs(dy)) / 2 + 1, sy = dy >= 0 ? 1 : -1; if (!dy) sy = i % 2 ? 1 : -1; a.y -= py * sy; b.y += py * sy; }
        }
      }
      pos.forEach(function (p) { p.x = Math.max(150, Math.min(W - 150, p.x)); p.y = Math.max(150, Math.min(H - 110, p.y)); });
      if (!moved) break;
    }
    return pos;
  }
  /* ==========================================================
     MALHA DE RUAS
     Tudo segue uma grade (girada no ângulo do bairro):
     os locais ficam nos cruzamentos e os caminhos andam pelas
     ruas da grade, em vez de linhas soltas pela tela.
     ========================================================== */
  var PX = 152, PY = 126, GAP = 34, NI = 7, NJ = 6;
  var G = { ang: 0 };
  function toWorld(x, y, ang) { var a = (ang == null ? G.ang : ang) * Math.PI / 180, cx = W / 2, cy = H / 2, dx = x - cx, dy = y - cy; return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) }; }
  function toLocal(x, y) { var a = -G.ang * Math.PI / 180, cx = W / 2, cy = H / 2, dx = x - cx, dy = y - cy; return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) }; }
  function gx(i) { return W / 2 + i * PX; }
  function gy(j) { return H / 2 + j * PY; }
  function wet(x, y, sc) {
    if (sc.water && !sc.water.island && inPath(sc.water.d, x, y)) return true;
    if (sc.water && sc.water.island && !inPath(sc.water.island, x, y)) return true;
    return false;
  }
  /* encaixa cada local num cruzamento livre, perto de onde ele estaria */
  function snap(raw, sc) {
    G.ang = sc.angle || 0;
    var taken = [], out = [];
    raw.forEach(function (p) {
      var l = toLocal(p.x, p.y), ti = Math.round((l.x - W / 2) / PX), tj = Math.round((l.y - H / 2) / PY), best = null;
      for (var i = -NI; i <= NI; i++) for (var j = -NJ; j <= NJ; j++) {
        var w = toWorld(gx(i), gy(j));
        if (w.x < 150 || w.x > W - 150 || w.y < 140 || w.y > H - 100) continue;
        if (wet(w.x, w.y, sc)) continue;
        if (taken.some(function (t) { return Math.abs(t.i - i) < 2 && Math.abs(t.j - j) < 2; })) continue;
        var d = Math.hypot((i - ti) * PX, (j - tj) * PY);
        if (!best || d < best.d) best = { i: i, j: j, d: d };
      }
      if (!best) best = { i: ti, j: tj };
      taken.push(best);
      var w2 = toWorld(gx(best.i), gy(best.j));
      out.push({ x: w2.x, y: w2.y, i: best.i, j: best.j });
    });
    return out;
  }
  /* árvore mínima entre os locais (distância andando pela grade) */
  function mst(pos) {
    var inTree = [0], edges = [];
    if (!pos.length) return edges;
    while (inTree.length < pos.length) {
      var best = null;
      inTree.forEach(function (a) { pos.forEach(function (p, b) { if (inTree.indexOf(b) >= 0) return; var d = Math.abs(p.i - pos[a].i) * PX + Math.abs(p.j - pos[a].j) * PY; if (!best || d < best.d) best = { a: a, b: b, d: d }; }); });
      inTree.push(best.b); edges.push([best.a, best.b]);
    }
    return edges;
  }
  function pathBetween(edges, from, to) {
    var adj = {}; edges.forEach(function (e) { (adj[e[0]] = adj[e[0]] || []).push(e[1]); (adj[e[1]] = adj[e[1]] || []).push(e[0]); });
    var prev = {}, q = [from], seen = {}; seen[from] = 1;
    while (q.length) { var c = q.shift(); if (c === to) break; (adj[c] || []).forEach(function (nx) { if (!seen[nx]) { seen[nx] = 1; prev[nx] = c; q.push(nx); } }); }
    if (!seen[to]) return [from, to];
    var out = [to]; while (out[0] !== from) out.unshift(prev[out[0]]); return out;
  }
  /* trecho pela grade (coordenadas locais): primeiro ao longo da rua horizontal, depois da vertical */
  function legLocal(a, b) {
    var pts = [[gx(a.i), gy(a.j)]];
    if (a.i !== b.i && a.j !== b.j) pts.push([gx(b.i), gy(a.j)]);
    pts.push([gx(b.i), gy(b.j)]);
    return pts;
  }
  function routePoints(pos, edges, from, to) {
    var nodes = pathBetween(edges, from, to), pts = [];
    for (var k = 1; k < nodes.length; k++) {
      var seg = legLocal(pos[nodes[k - 1]], pos[nodes[k]]);
      if (k > 1) seg = seg.slice(1);
      pts = pts.concat(seg);
    }
    if (!pts.length) pts = [[gx(pos[from].i), gy(pos[from].j)]];
    return pts.map(function (p) { var w = toWorld(p[0], p[1]); return [w.x, w.y]; });
  }

  /* ---------- desenho do cenário ---------- */
  function poly(pts) { return 'M' + pts.map(function (p) { return n(p[0]) + ' ' + n(p[1]); }).join('L'); }
  function roadPath(pts, cls) {
    var d = poly(pts);
    return '<g class="dl-road ' + (cls || '') + '"><path d="' + d + '" class="r-shadow"/><path d="' + d + '" class="r-outer"/><path d="' + d + '" class="r-edge"/><path d="' + d + '" class="r-inner"/><path d="' + d + '" class="r-lane"/></g>';
  }
  function scene(id, pos, edges) {
    var sc = SCENE[id] || { angle: 0 };
    G.ang = sc.angle || 0;
    setSeed('scene-' + id);
    var L0 = -NI - 3, L1 = NI + 3, M0 = -NJ - 3, M1 = NJ + 3;
    var railCell = sc.rail ? (sc.railCell != null ? sc.railCell : -2) : null;      // coluna de quarteirões ocupada pelo trilho
    var hwCell = sc.highway ? (sc.hwCell != null ? sc.hwCell : -2) : null;         // linha de quarteirões ocupada pela via expressa
    var aveRow = sc.aveRow != null ? sc.aveRow : 0, aveCol = sc.aveCol != null ? sc.aveCol : null;
    var occupied = function (wx, wy) { return pos.some(function (p) { return Math.hypot(p.x - wx, p.y - wy) < 40; }); };
    var plaza = null;
    if (sc.plaza) { var pl = toLocal(sc.plaza.x, sc.plaza.y); plaza = { i: Math.round((pl.x - W / 2) / PX), j: Math.round((pl.y - H / 2) / PY), kind: sc.plaza.kind }; }
    var rot = ' transform="rotate(' + G.ang + ' ' + W / 2 + ' ' + H / 2 + ')"';

    var s = '<defs>' +
      '<pattern id="dlDots" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.4" class="dl-dot"/></pattern>' +
      '<pattern id="dlHatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="14" height="2" class="dl-hatch"/></pattern>' +
      (sc.water && sc.water.island ? '<clipPath id="dlIsle"><path d="' + sc.water.island + '"/></clipPath>' : '') +
      '</defs>';
    s += '<rect x="-700" y="-500" width="' + (W + 1400) + '" height="' + (H + 1000) + '" class="dl-ground"/><rect x="-700" y="-500" width="' + (W + 1400) + '" height="' + (H + 1000) + '" fill="url(#dlHatch)" class="dl-ground-hatch"/>';
    if (sc.water && sc.water.island) {
      s += '<path d="' + sc.water.d + '" class="dl-water"/>' + waves(W, H);
      s += '<path d="' + sc.water.island + '" class="dl-island-shadow" transform="translate(10 12)"/><path d="' + sc.water.island + '" class="dl-island"/>';
    }

    /* ruas da grade + quarteirões (tudo no mesmo ângulo) */
    var city = '<g' + rot + '>';
    var st = '';
    for (var i = L0; i <= L1; i++) st += 'M' + gx(i) + ' ' + gy(M0) + 'V' + gy(M1);
    for (var j = M0; j <= M1; j++) st += 'M' + gx(L0) + ' ' + gy(j) + 'H' + gx(L1);
    city += '<path d="' + st + '" class="dl-street"/><path d="' + st + '" class="dl-street-line"/>';
    for (var ci = L0; ci < L1; ci++) for (var cj = M0; cj < M1; cj++) {
      if (ci === railCell || cj === hwCell) continue;
      var x0 = gx(ci) + GAP / 2, y0 = gy(cj) + GAP / 2, bw = PX - GAP, bh = PY - GAP;
      var cw = toWorld(x0 + bw / 2, y0 + bh / 2);
      if (wet(cw.x, cw.y, sc) && !(sc.water && sc.water.island)) continue;
      if (sc.park && inPath(sc.park.d, cw.x, cw.y)) continue;
      if (plaza && Math.abs(ci + .5 - plaza.i) < 1 && Math.abs(cj + .5 - plaza.j) < 1) continue;
      var tower = sc.towers && cw.x > sc.towers.x && cw.x < sc.towers.x + sc.towers.w && cw.y > sc.towers.y && cw.y < sc.towers.y + sc.towers.h;
      // às vezes o quarteirão é dividido em dois prédios
      var parts = rnd() > .62 ? (rnd() > .5 ? [[0, 0, bw / 2 - 5, bh], [bw / 2 + 5, 0, bw / 2 - 5, bh]] : [[0, 0, bw, bh / 2 - 5], [0, bh / 2 + 5, bw, bh / 2 - 5]]) : [[0, 0, bw, bh]];
      parts.forEach(function (q) {
        var bx = x0 + q[0], by = y0 + q[1], w = q[2], h = q[3];
        if (tower) {
          city += '<rect x="' + n(bx + 6) + '" y="' + n(by + 8) + '" width="' + n(w) + '" height="' + n(h) + '" class="dl-block-shadow"/><rect x="' + n(bx) + '" y="' + n(by) + '" width="' + n(w) + '" height="' + n(h) + '" class="dl-tower"/>';
          var ln = ''; for (var yy = by + 10; yy < by + h - 6; yy += 12) ln += 'M' + n(bx + 8) + ' ' + n(yy) + 'h' + n(w - 16);
          city += '<path d="' + ln + '" class="dl-tower-lines"/>';
          return;
        }
        var tone = rnd(), cls = tone < .55 ? 'b1' : tone < .85 ? 'b2' : 'b3';
        city += '<rect x="' + n(bx + 5) + '" y="' + n(by + 6) + '" width="' + n(w) + '" height="' + n(h) + '" class="dl-block-shadow"/>';
        city += '<rect x="' + n(bx) + '" y="' + n(by) + '" width="' + n(w) + '" height="' + n(h) + '" class="dl-block ' + cls + '"/>';
        if (rnd() > .5 && w > 40 && h > 34) { var k = 1 + Math.floor(rnd() * 2); for (var r = 0; r < k; r++) city += '<rect x="' + n(bx + 8 + rnd() * (w - 34)) + '" y="' + n(by + 8 + rnd() * (h - 28)) + '" width="' + n(12 + rnd() * 12) + '" height="' + n(9 + rnd() * 9) + '" class="dl-roof"/>'; }
      });
    }
    // praça num cruzamento
    if (plaza) {
      var px = gx(plaza.i), py = gy(plaza.j);
      city += '<g class="dl-plaza"><circle cx="' + px + '" cy="' + py + '" r="' + (PY * .62) + '" class="pl-base"/>';
      if (plaza.kind === 'scramble') for (var d = -3; d <= 3; d++) city += '<path d="M' + (px - 64) + ' ' + (py + d * 15) + 'h128" class="pl-stripe" transform="rotate(45 ' + px + ' ' + py + ')"/><path d="M' + (px - 64) + ' ' + (py + d * 15) + 'h128" class="pl-stripe" transform="rotate(-45 ' + px + ' ' + py + ')"/>';
      else city += '<circle cx="' + px + '" cy="' + py + '" r="' + (PY * .45) + '" class="pl-line"/>';
      city += '</g>';
    }
    // trilho e via expressa ocupam uma faixa de quarteirões inteira
    if (railCell != null) { var rx = gx(railCell) + PX / 2, rp = [[rx, gy(M0)], [rx, gy(M1)]]; city += '<g class="dl-rail"><path d="' + poly(rp) + '" class="t-bed"/><path d="' + poly(rp) + '" class="t-ties"/><path d="' + poly(rp) + '" class="t-steel"/></g>'; }
    if (hwCell != null) { var hy = gy(hwCell) + PY / 2, hp = [[gx(L0), hy], [gx(L1), hy]]; city += '<g class="dl-highway"><path d="' + poly(hp) + '" class="h-shadow"/><path d="' + poly(hp) + '" class="h-deck"/><path d="' + poly(hp) + '" class="h-line"/></g>'; }
    city += '</g>';
    s += sc.water && sc.water.island ? '<g clip-path="url(#dlIsle)">' + city + '</g>' : city;

    // parque e rio por cima da malha
    if (sc.park) {
      s += '<path d="' + sc.park.d + '" class="dl-park"/><path d="' + sc.park.d + '" fill="url(#dlDots)" class="dl-park-dots"/>';
      var bb = bbox(sc.park.d);
      for (var t = 0; t < 46; t++) { var tx = bb.x + rnd() * bb.w, ty = bb.y + rnd() * bb.h; if (!inPath(sc.park.d, tx, ty)) continue; if (pos.some(function (p) { return Math.hypot(p.x - tx, p.y - ty) < 80; })) continue; var rr = 10 + rnd() * 14; s += '<circle cx="' + n(tx + 4) + '" cy="' + n(ty + 5) + '" r="' + n(rr) + '" class="dl-tree-shadow"/><circle cx="' + n(tx) + '" cy="' + n(ty) + '" r="' + n(rr) + '" class="dl-tree"/>'; }
    }
    if (sc.water && !sc.water.island) {
      s += '<path d="' + sc.water.d + '" class="dl-water-edge" transform="translate(0 6)"/><path d="' + sc.water.d + '" class="dl-water"/>';
      var wb = bbox(sc.water.d);
      for (var w2 = 0; w2 < 16; w2++) { var wx = wb.x + rnd() * wb.w, wy = wb.y + rnd() * wb.h; if (inPath(sc.water.d, wx, wy)) s += '<path d="M' + n(wx) + ' ' + n(wy) + 'q8-6 16 0t16 0" class="dl-wave"/>'; }
      if (sc.water.sakura) for (var sk = 0; sk < 60; sk++) { var t2 = rnd(), sx = -20 + t2 * 1240, sy = 640 - t2 * 340 + (rnd() > .5 ? -40 - rnd() * 30 : 90 + rnd() * 30); s += '<circle cx="' + n(sx) + '" cy="' + n(sy) + '" r="' + n(8 + rnd() * 10) + '" class="dl-bloom"/>'; }
    }

    // avenidas principais e caminhos entre os locais, todos sobre a grade
    var roads = '<g' + rot + '>';
    var avW = sc.water && sc.water.island ? [-4, 4] : [L0, L1];
    roads += roadPath([[gx(avW[0]), gy(aveRow)], [gx(avW[1]), gy(aveRow)]], 'is-avenue');
    if (aveCol != null) roads += roadPath([[gx(aveCol), gy(-NJ)], [gx(aveCol), gy(NJ)]], 'is-avenue');
    // liga cada local à avenida pela rua vertical dele
    pos.forEach(function (p) { if (p.j !== aveRow) roads += roadPath([[gx(p.i), gy(p.j)], [gx(p.i), gy(aveRow)]], 'is-spur'); });
    edges.forEach(function (e) { roads += '<g data-edge="' + e[0] + '-' + e[1] + '">' + roadPath(legLocal(pos[e[0]], pos[e[1]]), 'is-route') + '</g>'; });
    roads += '</g>';
    s += sc.water && sc.water.island ? '<g clip-path="url(#dlIsle)">' + roads + '</g>' : roads;
    s += '<path id="dlTrail" class="dl-trail" d=""/>';
    return s;
  }
  function waves(w, h) { var s = ''; for (var i = 0; i < 40; i++) { var x = rnd() * w, y = rnd() * h; s += '<path d="M' + n(x) + ' ' + n(y) + 'q8-6 16 0t16 0" class="dl-wave"/>'; } return s; }
  var islandPath = null;
  var pathCache = {};
  function pathObj(d) { if (!pathCache[d]) { var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); svg.appendChild(p); svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.appendChild(svg); pathCache[d] = p; } return pathCache[d]; }
  function inPath(d, x, y) { try { var p = pathObj(d), pt = p.ownerSVGElement.createSVGPoint(); pt.x = x; pt.y = y; return p.isPointInFill(pt); } catch (e) { return true; } }
  function bbox(d) { try { var b = pathObj(d).getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; } catch (e) { return { x: 0, y: 0, w: W, h: H }; } }

  /* ---------- nome em letras recortadas (HTML) ---------- */
  function ransomHTML(name, id) {
    setSeed('rh-' + id);
    var kinds = ['l-paper', 'l-ink', 'l-acc', 'l-lit'], last = -1;
    return String(name || '').toUpperCase().split('').map(function (ch, i) {
      if (ch === ' ') return '<i class="dl-space"></i>';
      var k = Math.floor(rnd() * 4); if (k === last) k = (k + 1) % 4; if (i === 0) k = 0; last = k;
      return '<i class="dl-l ' + kinds[k] + '" style="--r:' + n((rnd() - .5) * 16) + 'deg;--y:' + n((rnd() - .5) * 6) + 'px">' + E(ch) + '</i>';
    }).join('');
  }

  /* ==========================================================
     RENDER
     ========================================================== */
  var cur = { id: null, pos: [], edges: [], places: [], token: null, last: null };

  function render(id, focusId) {
    var panel = document.getElementById('subDistrictMap'), d = state.districts[id];
    if (!panel || !d) return;
    if (locked(d)) { setMapMode('collage'); return; }
    var prev = atlasLocalCamera && atlasLocalCamera.districtId === id ? { view: Object.assign({}, atlasLocalCamera.view), fit: atlasLocalCamera.fitScale } : null;
    if (atlasLocalCamera) atlasLocalCamera.destroy(); atlasLocalCamera = null; atlasUi.district = id;
    var places = state.places[id] || [];
    var sc = SCENE[id] || {}; islandPath = sc.water && sc.water.island ? sc.water.island : null;
    var pos = snap(layout(id, places), sc), edges = mst(pos);
    atlasUi.geometry = { width: W, height: H, positions: pos };
    cur = { id: id, pos: pos, edges: edges, places: places, token: null, last: null };
    var visible = places.filter(function (p) { return !locked(p); });
    var focus = visible.filter(function (p) { return p.id === focusId; })[0] || visible[0] || null;
    submapFocusPlaceId = focus ? focus.id : null;
    var types = []; visible.forEach(function (p) { if (types.indexOf(p.type) < 0) types.push(p.type); }); types.sort();
    var act = Math.max(0, Math.min(100, Number(d.activity) || 0));

    panel.innerHTML =
      '<div class="atlas-local dl" data-district="' + E(id) + '">' +
        '<header class="atlas-local-head dl-head">' +
          '<div class="dl-badge" id="dlBadge" aria-hidden="true"></div>' +
          '<div class="dl-title">' +
            '<div class="atlas-eyebrow dl-eyebrow">ARQUIVO DE EXPLORAÇÃO <b>' + E(d.code) + '</b></div>' +
            '<h2 class="dl-name" aria-label="' + E(d.name) + '">' + ransomHTML(d.name, id) + '</h2>' +
            '<p class="dl-sub"><span class="dl-jp">' + E(d.jp) + '</span><span class="dl-chip">' + visible.length + ' / ' + places.length + ' LOCAIS</span><span class="dl-chip st-' + E(d.state) + '">' + E(STATE_TXT(d.state)) + '</span></p>' +
          '</div>' +
          '<div class="dl-meters">' +
            '<div class="dl-meter"><small>ATIVIDADE COGNITIVA</small><span class="dl-bar"><i style="width:' + act + '%"></i></span><b>' + act + '%</b></div>' +
            '<div class="dl-meter two"><div><small>MOVIMENTO</small><b>' + E(d.crowd || '—') + '</b></div><div><small>CENA MUSICAL</small><b>' + E(d.music || '—') + '</b></div></div>' +
          '</div>' +
          '<div class="atlas-tabs dl-tabs" aria-label="Visualização do distrito"><button type="button" data-atlas-view="map" aria-pressed="' + (atlasUi.view === 'map') + '">MAPA</button><button type="button" data-atlas-view="list" aria-pressed="' + (atlasUi.view === 'list') + '">LISTA</button></div>' +
        '</header>' +
        '<div class="atlas-local-grid dl-grid">' +
          '<section class="atlas-local-main dl-main" aria-label="Locais do distrito">' +
            '<div class="atlas-local-tools dl-tools">' +
              '<label class="dl-search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM15 15l5 5"/></svg><input id="atlasLocalSearch" type="search" placeholder="Buscar neste distrito…" aria-label="Buscar neste distrito" value="' + E(atlasUi.localQuery) + '" autocomplete="off"></label>' +
              '<div class="dl-chips" role="group" aria-label="Filtrar por tipo"><button type="button" data-dl-type="all">TODOS</button>' + types.map(function (t) { return '<button type="button" data-dl-type="' + E(t) + '">' + E(t).toUpperCase() + '</button>'; }).join('') + '</div>' +
              '<select id="atlasLocalType" aria-label="Filtrar por tipo de local" hidden><option value="all">Todos</option>' + types.map(function (t) { return '<option value="' + E(t) + '"' + (atlasUi.type === t ? ' selected' : '') + '>' + E(t) + '</option>'; }).join('') + '</select>' +
            '</div>' +
            '<div class="atlas-local-surface dl-surface">' +
              '<div id="atlasLocalViewport" class="atlas-viewport dl-viewport" tabindex="0" role="region" aria-label="Mapa do distrito. Arraste para mover; use mais e menos para o zoom; setas para trocar de local.">' +
                '<div id="atlasLocalWorld" class="atlas-local-world dl-world"><svg class="dl-scene" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + scene(id, pos, edges) + '</svg>' +
                  '<div class="dl-stamp" aria-hidden="true">' + E(d.name.toUpperCase()) + '<small>' + E(d.jp) + '</small></div>' +
                  '<div class="dl-token" id="dlToken" aria-hidden="true"><svg viewBox="-20 -20 40 40"><path d="M0-17 5-6 17-5 8 3 11 15 0 9-11 15-8 3-17-5-5-6z"/></svg></div>' +
                '</div>' +
              '</div>' +
              '<div class="atlas-local-caption dl-caption" id="atlasLocalCaption"><b>ESQUEMA DO DISTRITO</b> · SEM ESCALA<br><span id="atlasLocalCount"></span></div>' +
              '<div class="atlas-compass dl-compass" id="atlasLocalCompass" aria-hidden="true"><svg viewBox="-30 -30 60 60"><circle r="26"/><path d="M0-22 7 0 0-4-7 0z" class="n"/><path d="M0 22 7 0 0 4-7 0z"/></svg><b>N</b></div>' +
              '<div class="dl-route" id="dlRoute" aria-live="polite"></div>' +
              '<div class="dl-step"><button type="button" data-dl-step="-1" aria-label="Local anterior">◀</button><button type="button" data-dl-step="1" aria-label="Próximo local">▶</button></div>' +
              '<div class="map-controls dl-zoom" id="atlasLocalControls"><button type="button" data-local-zoom="out" aria-label="Diminuir zoom do submapa">−</button><output id="atlasLocalZoom" aria-label="Zoom do submapa">100%</output><button type="button" data-local-zoom="in" aria-label="Aumentar zoom do submapa">+</button><button type="button" class="atlas-fit" data-local-zoom="fit">AJUSTAR</button></div>' +
              '<div class="atlas-place-cards dl-cards" id="atlasPlaceCards" hidden></div>' +
            '</div>' +
          '</section>' +
          '<aside class="atlas-local-detail dl-detail" aria-label="Detalhes do local"><div id="submapFocusPanel"></div>' +
            '<details class="atlas-overview dl-overview"><summary>SOBRE ' + E(d.name.toUpperCase()) + '</summary><p>' + E(d.summary) + '</p><div class="atlas-tagline">' + (d.tags || []).map(function (t) { return '<span>' + E(t) + '</span>'; }).join('') + '</div><label class="atlas-status">Sua marcação <select id="atlasLocalDistrictStatus">' + atlasStatusOptions(d.state) + '</select></label></details>' +
          '</aside>' +
        '</div>' +
      '</div>';

    // selo do distrito no cabeçalho
    try { if (window.PhobiaBadges) document.getElementById('dlBadge').appendChild(PhobiaBadges.makeSvg(id, null, 'dl-badge-svg')); } catch (e) {}

    var world = document.getElementById('atlasLocalWorld'), cards = document.getElementById('atlasPlaceCards');
    places.forEach(function (p, i) {
      var lk = locked(p), ps = pos[i];
      var node = document.createElement('button');
      node.type = 'button'; node.className = 'atlas-node dl-pin st-' + (lk ? 'locked' : p.state) + (ps.y < 240 ? ' is-low' : '') + (i % 2 ? ' tilt-r' : ' tilt-l');
      node.dataset.placeId = p.id; node.style.left = ps.x + 'px'; node.style.top = ps.y + 'px';
      node.title = lk ? 'Local não revelado' : p.name;
      node.setAttribute('aria-label', lk ? 'Local não revelado' : String(i + 1).padStart(2, '0') + ' ' + p.name + ' · ' + p.type);
      node.innerHTML =
        '<span class="dl-pin-pulse" aria-hidden="true"></span>' +
        '<span class="dl-pin-burst" aria-hidden="true"></span>' +
        '<span class="dl-pin-dot" aria-hidden="true"></span>' +
        '<span class="dl-pin-card">' +
          '<span class="dl-pin-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="dl-pin-ico">' + (lk ? '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 30V22a12 12 0 0 1 24 0v8M14 30h36v24H14zM32 40v6"/></svg>' : icon(p)) + '</span>' +
          '<span class="dl-pin-txt"><b>' + (lk ? '???' : E(p.name)) + '</b><small>' + (lk ? 'INSERIR SENHA' : E(p.type).toUpperCase() + ' · ' + E(STATE_TXT(p.state))) + '</small></span>' +
        '</span>';
      node.onclick = function () { focusSubmapPlace(p.id); };
      world.appendChild(node);

      var card = document.createElement('button'); card.type = 'button'; card.className = 'atlas-place-card dl-card st-' + (lk ? 'locked' : p.state); card.dataset.placeId = p.id;
      var photo = !lk && atlasPhoto(p.id);
      card.innerHTML = '<span class="dl-card-art">' + (photo ? '<img src="' + E(photo.src) + '" alt="" loading="lazy" decoding="async">' : '<span class="dl-card-ico">' + (lk ? '?' : icon(p)) + '</span>') + '<span class="dl-card-num">' + String(i + 1).padStart(2, '0') + '</span></span>' +
        '<span class="dl-card-txt"><b>' + (lk ? 'Local não revelado' : E(p.name)) + '</b><small>' + (lk ? 'Inserir senha' : E(p.type) + ' · ' + E(STATE_TXT(p.state))) + '</small>' + (!lk && p.desc ? '<em>' + E(p.desc) + '</em>' : '') + '</span>';
      card.onclick = function () { focusSubmapPlace(p.id); };
      cards.appendChild(card);
    });

    atlasLocalCamera = new PhobiaMapCamera.Camera(document.getElementById('atlasLocalViewport'), world, {
      width: W, height: H, onChange: function (percent) {
        document.getElementById('atlasLocalZoom').textContent = percent + '%';
        panel.querySelector('[data-local-zoom="out"]').disabled = percent <= 100; panel.querySelector('[data-local-zoom="in"]').disabled = percent >= 400;
        world.style.setProperty('--zoom', String(atlasLocalCamera ? atlasLocalCamera.view.k / (atlasLocalCamera.fitScale || 1) : 1));
      }
    });
    atlasLocalCamera.districtId = id;
    if (prev && prev.fit && atlasLocalCamera.fitScale) { atlasLocalCamera.view = prev.view; atlasLocalCamera.paint(); }

    panel.querySelectorAll('[data-local-zoom]').forEach(function (b) { b.onclick = function () { b.dataset.localZoom === 'fit' ? atlasLocalCamera.fit() : atlasLocalCamera.zoomBy(b.dataset.localZoom === 'in' ? 1.25 : .8); }; });
    panel.querySelectorAll('[data-atlas-view]').forEach(function (b) { b.onclick = function () { atlasSetLocalView(b.dataset.atlasView); }; });
    panel.querySelectorAll('[data-dl-type]').forEach(function (b) { b.onclick = function () { atlasUi.type = b.dataset.dlType; var sel = document.getElementById('atlasLocalType'); if (sel) sel.value = atlasUi.type; atlasFilterLocal(); paintChips(); }; });
    panel.querySelectorAll('[data-dl-step]').forEach(function (b) { b.onclick = function () { step(+b.dataset.dlStep); }; });
    document.getElementById('atlasLocalSearch').oninput = function (e) { atlasUi.localQuery = e.target.value; atlasFilterLocal(); };
    document.getElementById('atlasLocalType').onchange = function (e) { atlasUi.type = e.target.value; atlasFilterLocal(); paintChips(); };
    document.getElementById('atlasLocalDistrictStatus').onchange = function (e) { setDistrictPlayerStatus(id, e.target.value); };
    document.getElementById('atlasLocalViewport').addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    });
    if (types.indexOf(atlasUi.type) < 0) atlasUi.type = 'all';
    paintChips();
    focusSubmapPlace(submapFocusPlaceId, false); atlasSetLocalView(atlasUi.view); atlasFilterLocal(); atlasUpdateCrumb();
    if (window.matchMedia && !matchMedia('(prefers-reduced-motion: reduce)').matches && !document.body.classList.contains('hs-calm')) intro(panel);
  }
  function paintChips() {
    document.querySelectorAll('#subDistrictMap [data-dl-type]').forEach(function (b) { b.classList.toggle('on', b.dataset.dlType === atlasUi.type); b.setAttribute('aria-pressed', String(b.dataset.dlType === atlasUi.type)); });
  }
  function intro(panel) {
    var pins = panel.querySelectorAll('.dl-pin');
    pins.forEach(function (p, i) { if (p.animate) p.animate([{ opacity: 0, transform: 'translate(-50%,-100%) translateY(-40px) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-100%) translateY(4px) scale(1.04)', offset: .7 }, { opacity: 1, transform: 'translate(-50%,-100%)' }], { duration: 560, delay: 160 + i * 90, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }); });
    var routes = panel.querySelectorAll('.dl-road.is-route .r-edge, .dl-road.is-route .r-inner');
    routes.forEach(function (r) { try { var L = r.getTotalLength(); r.style.strokeDasharray = L; r.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 900, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = function () { r.style.strokeDasharray = ''; }; } catch (e) {} });
    var head = panel.querySelectorAll('.dl-l');
    head.forEach(function (l, i) { if (l.animate) l.animate([{ opacity: 0, transform: 'translateY(-14px) rotate(var(--r))' }, { opacity: 1, transform: 'translateY(var(--y)) rotate(var(--r))' }], { duration: 380, delay: i * 40, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }); });
  }
  function visibleIds() {
    return [].slice.call(document.querySelectorAll('#subDistrictMap .dl-pin:not([hidden])')).map(function (n) { return n.dataset.placeId; }).filter(function (pid) { var p = cur.places.filter(function (x) { return x.id === pid; })[0]; return p && !locked(p); });
  }
  function step(dir) {
    var ids = visibleIds(); if (!ids.length) return;
    var i = ids.indexOf(submapFocusPlaceId); i = (i + dir + ids.length) % ids.length;
    focusSubmapPlace(ids[i]);
  }

  /* ---------- viagem do marcador pela rua ---------- */
  function travel(fromIdx, toIdx, animate) {
    var tok = document.getElementById('dlToken'), trail = document.getElementById('dlTrail'), route = document.getElementById('dlRoute');
    if (!tok || toIdx < 0) return;
    var to = cur.pos[toIdx], p = cur.places[toIdx];
    var place = function (x, y) { tok.classList.add('on'); tok.style.transform = 'translate(' + n(x) + 'px,' + n(y) + 'px)'; };
    if (fromIdx == null || fromIdx < 0 || fromIdx === toIdx || !animate) {
      place(to.x, to.y); trail.setAttribute('d', '');
      if (route) route.innerHTML = '<b>' + String(toIdx + 1).padStart(2, '0') + '</b> VOCÊ ESTÁ AQUI · ' + E(p.name).toUpperCase();
      return;
    }
    var pts = routePoints(cur.pos, cur.edges, fromIdx, toIdx), len = 0, segs = [];
    for (var i = 1; i < pts.length; i++) { var L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(L); len += L; }
    trail.setAttribute('d', poly(pts));
    try { trail.style.strokeDasharray = len; trail.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: Math.min(1400, 300 + len * 1.1), easing: 'cubic-bezier(.45,0,.2,1)' }); } catch (e) {}
    var frames = [], acc = 0;
    frames.push({ transform: 'translate(' + n(pts[0][0]) + 'px,' + n(pts[0][1]) + 'px)', offset: 0 });
    for (var j = 1; j < pts.length; j++) { acc += segs[j - 1]; frames.push({ transform: 'translate(' + n(pts[j][0]) + 'px,' + n(pts[j][1]) + 'px)', offset: Math.min(1, acc / (len || 1)) }); }
    var meters = Math.round(len * 1.6 / 10) * 10, mins = Math.max(1, Math.round(meters / 80));
    if (route) route.innerHTML = '<b>' + String(fromIdx + 1).padStart(2, '0') + '</b> → <b>' + String(toIdx + 1).padStart(2, '0') + '</b> · ~' + meters + ' m · ' + mins + ' min a pé';
    if (tok.animate) { var an = tok.animate(frames, { duration: Math.min(1400, 300 + len * 1.1), easing: 'cubic-bezier(.45,0,.2,1)' }); an.onfinish = function () { place(to.x, to.y); }; }
    place(to.x, to.y);
  }

  /* ---------- ligar ---------- */
  function init() {
    if (typeof renderLocalSubmap !== 'function' || typeof focusSubmapPlace !== 'function' || typeof state === 'undefined' || !window.PhobiaMapCamera) { setTimeout(init, 200); return; }
    window.renderLocalSubmap = render;
    var oFocus = window.focusSubmapPlace;
    window.focusSubmapPlace = function (pid, center) {
      var before = cur.places.map(function (p) { return p.id; }).indexOf(submapFocusPlaceId);
      var r = oFocus.apply(this, arguments);
      try {
        if (!document.querySelector('#subDistrictMap .dl')) return r;
        var idx = cur.places.map(function (p) { return p.id; }).indexOf(submapFocusPlaceId);
        decorateFocus(idx);
        var calm = document.body.classList.contains('hs-calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
        travel(before, idx, center !== false && !calm);
        document.querySelectorAll('#subDistrictMap .dl-road.is-route').forEach(function (g) { g.classList.remove('on'); });
      } catch (e) {}
      return r;
    };
    var oFilter = window.atlasFilterLocal;
    window.atlasFilterLocal = function () { var r = oFilter.apply(this, arguments); try { paintChips(); } catch (e) {} return r; };
    if (state.mapMode === 'local' && document.getElementById('subDistrictMap') && !document.querySelector('#subDistrictMap .dl')) { try { render(state.selected, submapFocusPlaceId); } catch (e) {} }
  }
  /* painel de detalhes: anterior/próximo e etiquetas */
  function decorateFocus(idx) {
    var panel = document.getElementById('submapFocusPanel'); if (!panel || idx < 0) return;
    var p = cur.places[idx];
    var meta = panel.querySelector('.atlas-focus-meta');
    if (meta) meta.innerHTML = '<span class="dl-tag">' + E(p.type).toUpperCase() + '</span><span class="dl-tag st-' + E(p.state) + '">' + E(STATE_TXT(p.state)) + '</span>';
    var h = panel.querySelector('h3'); if (h && !panel.querySelector('.dl-focus-ico')) h.insertAdjacentHTML('beforebegin', '<span class="dl-focus-ico" aria-hidden="true">' + icon(p) + '</span>');
    if (!panel.querySelector('.dl-focus-nav')) {
      var ids = visibleIds(), pos = ids.indexOf(p.id);
      panel.insertAdjacentHTML('afterbegin', '<div class="dl-focus-nav"><button type="button" data-dl-step="-1">◀ ANTERIOR</button><span>' + (pos + 1) + ' / ' + ids.length + '</span><button type="button" data-dl-step="1">PRÓXIMO ▶</button></div>');
      panel.querySelectorAll('[data-dl-step]').forEach(function (b) { b.onclick = function () { step(+b.dataset.dlStep); }; });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

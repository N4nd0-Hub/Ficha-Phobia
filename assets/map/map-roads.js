/* ==========================================================
   PERSONA // PHOBIA — map-roads.js
   Pistas e fundo do mapa de Tokyo.

   • Pistas: o código acha sozinho o melhor caminho entre dois
     distritos usando só linhas retas e diagonais de 45° (estilo
     mapa de metrô / cortes do Persona 5), desviando dos outros
     distritos, e arredonda as curvas.
   • Fundo: faixas diagonais, pontilhado (halftone), baía de Tokyo
     e estrelinhas, tudo cobrindo além das bordas do mapa (some
     aquele "retângulo" atrás dos distritos).

   Carregue ANTES do script inline do index.html (junto do
   map-camera.js). Não depende de nada além do DOM.
   ========================================================== */
(function (root) {
  'use strict';

  var NS    = 'http://www.w3.org/2000/svg';
  var WORLD = { w: 1280, h: 700 };
  var GRID  = 10;     // resolução da busca de caminho (px do mapa)
  var PAD   = 26;     // folga ao redor de cada distrito (metade da pista + margem)
  var MARGIN = 30;    // as pistas não chegam perto da borda do mapa
  var CORNER = 24;    // raio das curvas

  /* Linhas do mapa. kind: main = pista grossa, minor = fina */
  /* type: road = pista (asfalto), metro = linha de metrô (cor própria, estações e trem) */
  var ROUTES = [
    { id: 'chuo', kind: 'main',  type: 'road',  ids: ['kichijoji', 'nakano', 'shinjuku', 'harajuku', 'shibuya', 'meguro'] },
    { id: 'aki',  kind: 'main',  type: 'road',  ids: ['shinjuku', 'akihabara', 'asakusa'] },
    { id: 'bay',  kind: 'main',  type: 'road',  ids: ['shibuya', 'roppongi', 'ginza', 'odaiba'] },
    { id: 'ike',  kind: 'minor', type: 'metro', code: 'M1', name: 'Linha Oeste', color: '#2fbf71', ids: ['nakano', 'ikebukuro', 'shinjuku'] },
    { id: 'ring', kind: 'minor', type: 'metro', code: 'M2', name: 'Linha Leste', color: '#f5a623', ids: ['akihabara', 'ginza'] },
    { id: 'nort', kind: 'minor', type: 'metro', code: 'M3', name: 'Linha Norte', color: '#8b6cff', ids: ['ikebukuro', 'akihabara'] },
    { id: 'sul',  kind: 'minor', type: 'metro', code: 'M4', name: 'Linha Sul', color: '#e8344a', ids: ['meguro', 'roppongi'] }
  ];

  /* ---------- fila de prioridade (A*) ---------- */
  function Heap() { this.k = []; this.v = []; }
  Heap.prototype.push = function (key, val) {
    var k = this.k, v = this.v, i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      var tk = k[p]; k[p] = k[i]; k[i] = tk;
      var tv = v[p]; v[p] = v[i]; v[i] = tv;
      i = p;
    }
  };
  Heap.prototype.pop = function () {
    var k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop();
    if (k.length) {
      k[0] = lk; v[0] = lv;
      var i = 0, n = k.length;
      for (;;) {
        var l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && k[l] < k[m]) m = l;
        if (r < n && k[r] < k[m]) m = r;
        if (m === i) break;
        var tk = k[m]; k[m] = k[i]; k[i] = tk;
        var tv = v[m]; v[m] = v[i]; v[i] = tv;
        i = m;
      }
    }
    return top;
  };
  Heap.prototype.size = function () { return this.k.length; };

  /* ---------- grade com obstáculos ---------- */
  var DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  var TURN = [0, 1.2, 3.5, 9, 9];   // custo de virar 0°, 45°, 90°, 135°+

  function makeGrid(layout, skip) {
    var GW = Math.ceil(WORLD.w / GRID) + 1, GH = Math.ceil(WORLD.h / GRID) + 1;
    var blocked = new Uint8Array(GW * GH), gx, gy;
    for (gy = 0; gy < GH; gy++) for (gx = 0; gx < GW; gx++) {
      var x = gx * GRID, y = gy * GRID;
      if (x < MARGIN || y < MARGIN || x > WORLD.w - MARGIN || y > WORLD.h - MARGIN) blocked[gy * GW + gx] = 1;
    }
    Object.keys(layout).forEach(function (id) {
      if (skip[id]) return;
      var b = layout[id];
      var x1 = Math.floor((b.cx - b.w / 2 - PAD) / GRID), x2 = Math.ceil((b.cx + b.w / 2 + PAD) / GRID);
      var y1 = Math.floor((b.cy - b.h / 2 - PAD) / GRID), y2 = Math.ceil((b.cy + b.h / 2 + PAD) / GRID);
      for (gy = Math.max(0, y1); gy <= Math.min(GH - 1, y2); gy++)
        for (gx = Math.max(0, x1); gx <= Math.min(GW - 1, x2); gx++) blocked[gy * GW + gx] = 1;
    });
    return { GW: GW, GH: GH, blocked: blocked };
  }

  function astar(grid, sx, sy, ex, ey) {
    var GW = grid.GW, GH = grid.GH, N = GW * GH;
    var g = new Float32Array(N * 9); g.fill(Infinity);
    var came = new Int32Array(N * 9); came.fill(-1);
    var closed = new Uint8Array(N * 9);
    var heap = new Heap();
    function h(x, y) {
      var dx = Math.abs(x - ex), dy = Math.abs(y - ey);
      return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
    }
    var start = (sy * GW + sx) * 9 + 8;
    g[start] = 0; heap.push(h(sx, sy), start);
    while (heap.size()) {
      var cur = heap.pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      var cell = (cur / 9) | 0, pd = cur % 9, cx = cell % GW, cy = (cell / GW) | 0;
      if (cx === ex && cy === ey) {
        var out = [], s = cur;
        while (s !== -1) { var c = (s / 9) | 0; out.push([c % GW, (c / GW) | 0]); s = came[s]; }
        return out.reverse();
      }
      for (var d = 0; d < 8; d++) {
        var nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        if (grid.blocked[ny * GW + nx] && !(nx === ex && ny === ey)) continue;
        if (d % 2 === 1) {   // diagonal não pode "cortar quina" de obstáculo
          if (grid.blocked[cy * GW + nx] || grid.blocked[ny * GW + cx]) continue;
        }
        var diff = pd === 8 ? 0 : Math.abs(pd - d);
        if (diff > 4) diff = 8 - diff;
        var cost = g[cur] + (d % 2 ? Math.SQRT2 : 1) + (pd === 8 ? 0 : TURN[diff]);
        var ns = (ny * GW + nx) * 9 + d;
        if (cost < g[ns]) { g[ns] = cost; came[ns] = cur; heap.push(cost + h(nx, ny), ns); }
      }
    }
    return null;
  }

  /* tira pontos intermediários que estão em linha reta */
  function simplify(cells) {
    if (cells.length < 3) return cells;
    var out = [cells[0]];
    for (var i = 1; i < cells.length - 1; i++) {
      var a = cells[i - 1], b = cells[i], c = cells[i + 1];
      if ((b[0] - a[0]) !== (c[0] - b[0]) || (b[1] - a[1]) !== (c[1] - b[1])) out.push(b);
    }
    out.push(cells[cells.length - 1]);
    return out;
  }

  /* caminho entre dois distritos → lista de pontos {x,y} */
  function segment(layout, idA, idB) {
    var A = layout[idA], B = layout[idB];
    var skip = {}; skip[idA] = 1; skip[idB] = 1;
    var grid = makeGrid(layout, skip);
    var sx = Math.round(A.cx / GRID), sy = Math.round(A.cy / GRID);
    var ex = Math.round(B.cx / GRID), ey = Math.round(B.cy / GRID);
    var cells = astar(grid, sx, sy, ex, ey);
    if (!cells) return [{ x: A.cx, y: A.cy }, { x: B.cx, y: B.cy }];   // plano B: reta
    var pts = simplify(cells).map(function (c) { return { x: c[0] * GRID, y: c[1] * GRID }; });
    pts[0] = { x: A.cx, y: A.cy };
    pts[pts.length - 1] = { x: B.cx, y: B.cy };
    return pts;
  }

  /* uma linha inteira: junta os trechos e marca onde estão as curvas visíveis */
  function buildRoute(rt, layout) {
    var pts = [];
    for (var i = 0; i < rt.ids.length - 1; i++) {
      if (!layout[rt.ids[i]] || !layout[rt.ids[i + 1]]) continue;
      var seg = segment(layout, rt.ids[i], rt.ids[i + 1]);
      if (pts.length) seg.shift();
      pts = pts.concat(seg);
    }
    var bends = [];
    for (var j = 1; j < pts.length - 1; j++) {
      var isStop = rt.ids.some(function (id) {
        var b = layout[id]; return b && b.cx === pts[j].x && b.cy === pts[j].y;
      });
      if (!isStop) bends.push(pts[j]);
    }
    return { points: pts, bends: bends };
  }

  /* pontos → "M … L … Q …" com curvas arredondadas */
  function pathD(pts, r) {
    if (!pts.length) return '';
    var d = 'M ' + pts[0].x + ' ' + pts[0].y;
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y), l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      var rr = Math.min(r, l1 / 2, l2 / 2);
      var ax = p1.x + (p0.x - p1.x) / l1 * rr, ay = p1.y + (p0.y - p1.y) / l1 * rr;
      var bx = p1.x + (p2.x - p1.x) / l2 * rr, by = p1.y + (p2.y - p1.y) / l2 * rr;
      d += ' L ' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' Q ' + p1.x + ' ' + p1.y + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
    }
    var last = pts[pts.length - 1];
    return d + ' L ' + last.x + ' ' + last.y;
  }

  var cache = { sig: '', routes: null };
  function build(layout) {
    var sig = JSON.stringify(layout);
    if (cache.sig === sig) return cache.routes;
    var routes = ROUTES.map(function (rt, i) {
      var r = buildRoute(rt, layout);
      return { index: i, id: rt.id, kind: rt.kind, type: rt.type || 'road', code: rt.code, name: rt.name, color: rt.color, ids: rt.ids, points: r.points, bends: r.bends, d: pathD(r.points, rt.type === 'metro' ? 14 : CORNER) };
    });
    cache = { sig: sig, routes: routes };
    return routes;
  }

  /* ---------- desenho das pistas ---------- */
  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* pontos onde a linha sai/entra na caixa de um distrito (para as estações) */
  function stations(path, r, layout) {
    var out = [];
    try {
      var L = path.getTotalLength(), prev = null;
      var inside = function (p) {
        for (var i = 0; i < r.ids.length; i++) {
          var b = layout[r.ids[i]]; if (!b) continue;
          if (Math.abs(p.x - b.cx) <= b.w / 2 + 4 && Math.abs(p.y - b.cy) <= b.h / 2 + 4) return true;
        }
        return false;
      };
      for (var t = 0; t <= L; t += 3) {
        var p = path.getPointAtLength(t), ins = inside(p);
        if (prev !== null && ins !== prev) out.push(ins ? path.getPointAtLength(Math.max(0, t - 3)) : p);
        prev = ins;
      }
      return { pts: out, len: L, mid: path.getPointAtLength(L / 2) };
    } catch (e) { return { pts: out, len: 0, mid: null }; }
  }

  /* pistas (asfalto) primeiro, metrô por cima; camadas juntas para os cruzamentos ficarem limpos */
  function draw(layer, layout) {
    if (!layer) return;
    var routes = build(layout);
    var roads = routes.filter(function (r) { return r.type !== 'metro'; });
    var metro = routes.filter(function (r) { return r.type === 'metro'; });

    /* halo de cada distrito */
    var halo = el('g', { 'class': 'pm-halos' });
    Object.keys(layout).forEach(function (id) {
      var b = layout[id];
      halo.appendChild(el('ellipse', { 'class': 'pm-halo', cx: b.cx, cy: b.cy, rx: b.w * .78, ry: b.h * .8 }));
      halo.appendChild(el('ellipse', { 'class': 'pm-halo-ring', cx: b.cx, cy: b.cy + 4, rx: b.w * .66, ry: b.h * .64 }));
    });
    layer.appendChild(halo);

    ['shadow', 'outer', 'edge', 'inner', 'lane'].forEach(function (part) {
      roads.forEach(function (r) {
        var attrs = { 'class': 'district-link-' + part + ' is-road', 'd': r.d, 'data-route': r.index };
        if (part === 'shadow') attrs.transform = 'translate(6 7)';
        layer.appendChild(el('path', attrs));
      });
    });
    roads.forEach(function (r) { layer.appendChild(el('path', { 'class': 'pm-road-dash', 'd': r.d, 'data-route': r.index })); });
    roads.forEach(function (r) {
      r.bends.forEach(function (b) {
        layer.appendChild(el('path', {
          'class': 'district-link-node',
          'd': 'M ' + b.x + ' ' + (b.y - 8) + ' L ' + (b.x + 8) + ' ' + b.y + ' L ' + b.x + ' ' + (b.y + 8) + ' L ' + (b.x - 8) + ' ' + b.y + ' Z',
          'data-route': r.index
        }));
      });
    });

    ['case', 'white', 'line', 'flow'].forEach(function (part) {
      metro.forEach(function (r) {
        var a = { 'class': 'pm-metro-' + part, 'd': r.d, 'data-route': r.index, 'style': '--line:' + r.color };
        if (part === 'case') { var sh = el('path', { 'class': 'pm-metro-shadow', 'd': r.d, transform: 'translate(4 5)' }); layer.appendChild(sh); }
        layer.appendChild(el('path', a));
      });
    });
    metro.forEach(function (r) {
      var probe = layer.querySelector('.pm-metro-line[data-route="' + r.index + '"]');
      var st = stations(probe, r, layout);
      st.pts.forEach(function (p) {
        layer.appendChild(el('circle', { 'class': 'pm-station', cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 7.5, style: '--line:' + r.color }));
      });
      /* trem indo e voltando */
      var train = el('g', { 'class': 'pm-train', style: '--line:' + r.color });
      train.appendChild(el('rect', { x: -11, y: -4.5, width: 22, height: 9, rx: 4.5 }));
      train.appendChild(el('rect', { 'class': 'pm-train-win', x: -6, y: -2, width: 12, height: 4, rx: 2 }));
      var dur = Math.max(6, (st.len || 400) / 45).toFixed(1) + 's';
      var am = el('animateMotion', { dur: dur, repeatCount: 'indefinite', rotate: 'auto', path: r.d, keyPoints: '0;1;0', keyTimes: '0;.5;1', calcMode: 'spline', keySplines: '.45 0 .55 1;.45 0 .55 1' });
      train.appendChild(am);
      layer.appendChild(train);
      if (st.mid) {
        var bd = el('g', { 'class': 'pm-metro-badge', transform: 'translate(' + st.mid.x.toFixed(1) + ' ' + st.mid.y.toFixed(1) + ')', style: '--line:' + r.color });
        bd.appendChild(el('circle', { r: 13 }));
        var tx = el('text', { 'text-anchor': 'middle', dy: '4.5' }); tx.textContent = r.code; bd.appendChild(tx);
        var tl = el('title', {}); tl.textContent = 'Metrô ' + r.code + ' · ' + r.name; bd.appendChild(tl);
        layer.appendChild(bd);
      }
    });
  }

  /* ---------- fundo: faixas, pontilhado, baía, estrelas ---------- */
  function bayPath() {
    var base = [[1000,900],[1015,740],[1030,690],[1035,640],[1060,530],[1110,505],[1180,495],[1250,470],[1330,440],[1500,420],[3300,400]];
    var pts = [], sign = 1;
    for (var i = 0; i < base.length - 1; i++) {
      var a = base[i], b = base[i + 1];
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      var steps = Math.max(1, Math.round(len / 20));
      for (var s = 0; s < steps; s++) {
        var t = s / steps;
        var nx = -dy / len, ny = dx / len, off = (s % 2 ? 1 : -1) * 6 * sign;
        pts.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
      }
    }
    pts.push(base[base.length - 1]);
    return 'M ' + pts.map(function (p) { return p[0].toFixed(0) + ' ' + p[1].toFixed(0); }).join(' L ') + ' L 3300 2200 L 1000 2200 Z';
  }

  function star(x, y, s) {
    return '<path class="pm-star" transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6Z"/>';
  }

  /* faixa paralela à borda da faixa rosa do topo (y = 86 - 0.0484x) */
  function slash(cls, from, to) {
    var y = function (x) { return 86 - 0.0484 * x; };
    return '<path class="' + cls + '" d="M -2000 ' + (y(-2000) + from).toFixed(1) + ' L 3280 ' + (y(3280) + from).toFixed(1) +
      ' L 3280 ' + (y(3280) + to).toFixed(1) + ' L -2000 ' + (y(-2000) + to).toFixed(1) + ' Z"/>';
  }

  function decorMarkup() {
    var bay = bayPath();
    return '' +
      '<defs>' +
        '<pattern id="pmDots" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle class="pm-dot" cx="7" cy="7" r="2.6"/></pattern>' +
        '<pattern id="pmBlocks" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(-2.8)"><rect class="pm-block" x="4" y="4" width="26" height="18" rx="2"/><rect class="pm-block" x="34" y="4" width="26" height="18" rx="2"/><rect class="pm-block" x="4" y="28" width="56" height="12" rx="2"/><rect class="pm-block" x="4" y="44" width="18" height="16" rx="2"/><rect class="pm-block" x="26" y="44" width="34" height="16" rx="2"/></pattern>' +
        '<pattern id="pmTrees" width="18" height="18" patternUnits="userSpaceOnUse"><circle class="pm-tree" cx="5" cy="6" r="3.2"/><circle class="pm-tree" cx="13" cy="13" r="2.6"/></pattern>' +
        '<pattern id="pmDotsBay" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle class="pm-dot-bay" cx="6" cy="6" r="2.1"/></pattern>' +
        '<linearGradient id="pmFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
        '<mask id="pmFadeMask" maskUnits="userSpaceOnUse" x="-2000" y="-1500" width="5400" height="3700"><rect x="-2000" y="-1500" width="5400" height="3700" fill="url(#pmFade)"/></mask>' +
      '</defs>' +
      /* baía de Tokyo: sombra dura, água, pontilhado e contorno */
      '<rect class="pm-blocks" x="-2000" y="-1500" width="5400" height="3700" fill="url(#pmBlocks)"/>' +
      gridLines() +
      parks() +
      rivers() +
      '<path class="pm-bay-shadow" d="' + bay + '" transform="translate(7 8)"/>' +
      '<path class="pm-bay" d="' + bay + '"/>' +
      '<path class="pm-bay-dots" d="' + bay + '"/>' +
      '<path class="pm-bay-line" d="' + bay + '"/>' +
      /* pontilhado que sobe do rodapé */
      '<rect class="pm-halftone" x="-2000" y="-1500" width="5400" height="3700" fill="url(#pmDots)" mask="url(#pmFadeMask)"/>' +
      /* corte diagonal duplo logo abaixo da faixa rosa do topo */
      star(620, 300, 1.15) + star(660, 120, .8) + star(975, 300, 1) + star(250, 455, .85) + star(1240, 470, .7) +
      star(-420, 160, 1.3) + star(-260, 760, 1) + star(1620, 260, 1.2) + star(420, 980, 1.1) + star(1500, -60, .9) + star(-700, 460, .8) +
      compass(1262, 610);
  }

  /* rios estilizados: Sumida (leste) e Kanda (corta o centro) */
  function rivers() {
    /* Sumida passa à direita de Asakusa e desce reto até a baía; o Kanda deságua nele */
    var sumida = 'M 1340 -900 C 1318 -300 1290 0 1268 150 S 1236 380 1196 560',
        kanda = 'M -1400 270 C -600 250 -100 300 260 255 S 560 280 640 300 S 900 330 1010 312 S 1170 300 1252 262';
    var r = function (d) { return '<path class="pm-river-edge" d="' + d + '"/><path class="pm-river" d="' + d + '"/><path class="pm-river-flow" d="' + d + '"/>'; };
    return '<g class="pm-rivers">' + r(kanda) + r(sumida) + '</g>';
  }
  /* parques: manchas verdes com árvores */
  function parks() {
    var blob = function (cx, cy, rx, ry, rot) {
      return '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + rot + ')"><ellipse class="pm-park-shadow" rx="' + rx + '" ry="' + ry + '" transform="translate(5 6)"/><ellipse class="pm-park" rx="' + rx + '" ry="' + ry + '"/><ellipse class="pm-park-trees" rx="' + (rx - 6) + '" ry="' + (ry - 6) + '"/></g>';
    };
    return '<g class="pm-parks">' + blob(255, 470, 64, 40, -12) + blob(950, 110, 70, 36, 8) + blob(905, 330, 48, 34, 0) + blob(-260, 520, 140, 70, 10) + blob(640, -40, 110, 50, -6) + blob(-620, 300, 90, 52, 18) + blob(260, 880, 120, 60, -8) + blob(-380, 980, 80, 46, 4) + blob(1480, 120, 70, 40, -14) + '</g>';
  }
  /* grade de coordenadas bem fraquinha */
  function gridLines() {
    var g = '';
    for (var x = -1920; x <= 3200; x += 160) g += 'M ' + x + ' -1500 L ' + x + ' 2200 ';
    for (var y = -1440; y <= 2160; y += 160) g += 'M -2000 ' + y + ' L 3280 ' + y + ' ';
    return '<path class="pm-grid" d="' + g + '"/>';
  }
  function compass(x, y) {
    return '<g class="pm-compass" transform="translate(' + x + ' ' + y + ')"><circle r="30" class="pm-compass-ring"/><circle r="22" class="pm-compass-in"/>' +
      '<path class="pm-compass-n" d="M0 -27 L7 0 L0 -4 L-7 0Z"/><path class="pm-compass-s" d="M0 27 L7 0 L0 4 L-7 0Z"/>' +
      '<text class="pm-compass-t" y="-34" text-anchor="middle">N</text></g>';
  }
  function scaleBar(x, y) {
    return '<g class="pm-scale" transform="translate(' + x + ' ' + y + ')"><rect width="120" height="8" class="pm-scale-a"/><rect width="60" height="8" class="pm-scale-b"/><rect x="60" width="30" height="8" class="pm-scale-b" transform="translate(30 0)"/>' +
      '<text y="-6" class="pm-scale-t">0</text><text x="120" y="-6" text-anchor="end" class="pm-scale-t">2 KM</text></g>';
  }

  function ensureDecor(svg) {
    if (!svg || svg.querySelector('#pmDecor')) return;
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('id', 'pmDecor');
    g.setAttribute('aria-hidden', 'true');
    g.setAttribute('pointer-events', 'none');
    g.innerHTML = decorMarkup();
    var anchor = svg.querySelector('#districtLinks');
    if (anchor) svg.insertBefore(g, anchor); else svg.appendChild(g);
  }

  var api = {
    WORLD: WORLD, ROUTES: ROUTES,
    build: build, pathD: pathD,
    draw: function (layer, layout) {
      draw(layer, layout);
      var svg = layer && layer.ownerSVGElement;
      ensureDecor(svg);
    },
    ensureDecor: ensureDecor
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PhobiaMapRoads = api;
})(typeof window !== 'undefined' ? window : globalThis);

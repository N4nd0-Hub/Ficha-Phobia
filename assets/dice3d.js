/* ==========================================================
   PERSONA // PHOBIA — dice3d.js   (ROLA DADOS 3D)
   Dados d4, d6, d8, d10, d12 e d20 desenhados em 3D (canvas,
   sem bibliotecas), rolando pela tela e parando no resultado,
   com o total + bônus do teste.
   • Botão flutuante 🎲 abre o painel (testes de atributo, sociais,
     Acerto/Dano do instrumento, dados livres, fórmula).
   • Clicar em qualquer fórmula calculada (1d20+8, 8d10…) rola ela.
   API: PhobiaDice.roll('1d20+8', 'ACERTO')
   ========================================================== */
(function () {
  'use strict';
  if (window.PhobiaDice) return;

  /* ---------- álgebra ---------- */
  function v3(x, y, z) { return [x, y, z]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mulS(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function matAxis(ax, t) {
    ax = norm(ax); var c = Math.cos(t), s = Math.sin(t), C = 1 - c, x = ax[0], y = ax[1], z = ax[2];
    return [x * x * C + c, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, y * y * C + c, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, z * z * C + c];
  }
  function matMul(a, b) {
    var r = [];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
  }
  function apply(m, p) { return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2], m[3] * p[0] + m[4] * p[1] + m[5] * p[2], m[6] * p[0] + m[7] * p[1] + m[8] * p[2]]; }
  var I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  /* ---------- sólidos ---------- */
  function polyFrom(verts, normals) {
    verts = verts.map(function (v) { return norm(v); });
    var faces = normals.map(function (n) {
      n = norm(n);
      var md = -9; verts.forEach(function (v) { md = Math.max(md, dot(v, n)); });
      var idx = []; verts.forEach(function (v, i) { if (dot(v, n) > md - 1e-4) idx.push(i); });
      return face(verts, idx, n);
    });
    return { verts: verts, faces: faces };
  }
  function face(verts, idx, n) {
    var c = [0, 0, 0]; idx.forEach(function (i) { c = add(c, verts[i]); }); c = mulS(c, 1 / idx.length);
    if (!n) { /* normal pelo método de Newell */
      var nn = [0, 0, 0];
      for (var k = 0; k < idx.length; k++) { var a = verts[idx[k]], b = verts[idx[(k + 1) % idx.length]]; nn = add(nn, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]); }
      n = norm(nn); if (dot(n, c) < 0) n = mulS(n, -1);
    }
    var ax = norm(Math.abs(n[0]) < .9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0])), bx = cross(n, ax);
    idx = idx.slice().sort(function (i, j) { var p = sub(verts[i], c), q = sub(verts[j], c); return Math.atan2(dot(p, bx), dot(p, ax)) - Math.atan2(dot(q, bx), dot(q, ax)); });
    var up = norm(sub(verts[idx[0]], c));
    var inr = 9; idx.forEach(function (i, k) { var a = verts[i], b = verts[idx[(k + 1) % idx.length]]; var m = mulS(add(a, b), .5); inr = Math.min(inr, len(sub(m, c))); });
    return { idx: idx, n: n, c: c, up: up, right: cross(up, n), inr: inr };
  }
  var PHI = (1 + Math.sqrt(5)) / 2;
  var ICO = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]];
  var DOD = (function () {
    var o = [], s = [-1, 1];
    s.forEach(function (a) { s.forEach(function (b) { s.forEach(function (c) { o.push([a, b, c]); }); }); });
    s.forEach(function (a) { s.forEach(function (b) { o.push([0, a * PHI, b / PHI]); o.push([a / PHI, 0, b * PHI]); o.push([a * PHI, b / PHI, 0]); }); });
    return o;
  })();
  var CUBE = [], OCTA = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) { CUBE.push([a, b, c]); }); }); });
  function d10() {
    var h = 1, f = function (z0) {
      var T = [0, 0, h], R = function (k) { var a = k * Math.PI / 5; return [Math.cos(a), Math.sin(a), k % 2 ? -z0 : z0]; };
      return dot(sub(R(1), T), cross(sub(R(0), T), sub(R(2), T)));
    };
    var lo = 0.001, hi = 0.99; for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
    var z0 = (lo + hi) / 2, verts = [[0, 0, h], [0, 0, -h]];
    for (var k = 0; k < 10; k++) { var a = k * Math.PI / 5; verts.push([Math.cos(a), Math.sin(a), k % 2 ? -z0 : z0]); }
    var R = function (k) { return 2 + ((k % 10) + 10) % 10; }, faces = [];
    for (var j = 0; j < 5; j++) { faces.push(face(verts, [0, R(2 * j), R(2 * j + 1), R(2 * j + 2)])); faces.push(face(verts, [1, R(2 * j + 1), R(2 * j + 2), R(2 * j + 3)])); }
    var mx = 0; verts.forEach(function (v) { mx = Math.max(mx, len(v)); });
    verts = verts.map(function (v) { return mulS(v, 1 / mx); });
    faces = faces.map(function (fc) { return face(verts, fc.idx); });
    return { verts: verts, faces: faces };
  }
  var SHAPES = {};
  function shape(sides) {
    if (SHAPES[sides]) return SHAPES[sides];
    var s;
    if (sides === 4) { var T = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]; s = polyFrom(T, T.map(function (v) { return mulS(v, -1); })); }
    else if (sides === 6) s = polyFrom(CUBE, OCTA);
    else if (sides === 8) s = polyFrom(OCTA, CUBE);
    else if (sides === 10) s = d10();
    else if (sides === 12) s = polyFrom(DOD, ICO);
    else s = polyFrom(ICO, DOD);
    /* valores nas faces: opostas somam N+1 sempre que possível */
    var n = s.faces.length, used = {}, v = 1;
    s.faces.forEach(function (f, i) {
      if (f.val) return;
      f.val = v++;
      var opp = -1, best = 2;
      s.faces.forEach(function (g, j) { if (j !== i && !g.val) { var d = dot(f.n, g.n); if (d < best) { best = d; opp = j; } } });
      if (opp >= 0 && best < -0.9) s.faces[opp].val = n + 1 - f.val;
    });
    /* corrige faces que ficaram sem valor ou repetidas */
    var seen = {}; s.faces.forEach(function (f) { if (!f.val || seen[f.val]) f.val = 0; else seen[f.val] = 1; });
    var miss = []; for (var k = 1; k <= n; k++) if (!seen[k]) miss.push(k);
    s.faces.forEach(function (f) { if (!f.val) f.val = miss.shift(); });
    SHAPES[sides] = s; return s;
  }
  function shapeFor(sides) { return [4, 6, 8, 10, 12, 20].indexOf(sides) >= 0 ? shape(sides) : shape(20); }

  /* orientação final: face com o valor virada para a câmera, número em pé */
  function finalMatrix(sh, val) {
    var f = sh.faces.filter(function (x) { return x.val === val; })[0] || sh.faces[0];
    var z = [0, 0, 1], n = f.n, ax = cross(n, z), d = dot(n, z), m1;
    if (len(ax) < 1e-6) m1 = d > 0 ? I3 : matAxis([1, 0, 0], Math.PI); else m1 = matAxis(ax, Math.acos(Math.max(-1, Math.min(1, d))));
    var up = apply(m1, f.up), ang = Math.atan2(up[0], up[1]);
    var m2 = matAxis(z, ang + (Math.random() - .5) * .35);
    var tilt = matAxis([1, 0, 0], -.32 + (Math.random() - .5) * .1);
    return matMul(tilt, matMul(m2, m1));
  }

  /* ---------- cores do tema ---------- */
  var probe = null;
  function rgb(css) {
    if (!probe) { probe = document.createElement('canvas').getContext('2d'); }
    probe.fillStyle = '#000'; probe.fillStyle = css; var c = probe.fillStyle;
    if (c[0] === '#') return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    var m = c.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]];
  }
  function themeColors() {
    var cs = getComputedStyle(document.body);
    var g = function (n, f) { return (cs.getPropertyValue(n) || '').trim() || f; };
    return {
      acc: rgb(g('--hud-acc', '#ef2b97')), acc2: rgb(g('--hud-acc2', '#6ce6ff')), acc3: rgb(g('--hud-acc3', '#96ff45')),
      paper: g('--hud-paper', '#fff0d8'), black: g('--hud-black', '#0d0c10'), font: g('--hud-display', '"Archivo Black"')
    };
  }
  function dieColor(sides, T) {
    return ({ 4: T.acc3, 6: T.acc2, 8: [255, 216, 77], 10: [200, 170, 255], 12: [255, 154, 82], 20: T.acc })[sides] || T.acc;
  }
  function shade(c, k) { return 'rgb(' + Math.min(255, Math.round(c[0] * k)) + ',' + Math.min(255, Math.round(c[1] * k)) + ',' + Math.min(255, Math.round(c[2] * k)) + ')'; }

  /* ---------- palco ---------- */
  var shown = false, stage, cv, ctx, dpr = 1, W = 0, H = 0, raf = 0, dice = [], t0 = 0, DUR = 1500, panelEl = null, resultEl = null, current = null;
  var LIGHT = norm([-.45, .6, .75]);
  function ensureStage() {
    if (stage) return;
    stage = document.createElement('div'); stage.className = 'dr-stage'; stage.hidden = true; stage.setAttribute('aria-live', 'polite');
    stage.innerHTML = '<div class="dr-dim"></div><canvas class="dr-canvas" aria-hidden="true"></canvas><div class="dr-result"></div>';
    document.body.appendChild(stage);
    cv = stage.querySelector('canvas'); ctx = cv.getContext('2d'); resultEl = stage.querySelector('.dr-result');
    stage.addEventListener('click', function (e) { if (e.target.closest('.dr-again')) { roll(current.expr, current.label, current.opts); return; } if (!e.target.closest('.dr-result') || e.target.closest('.dr-close')) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !stage.hidden) hide(); });
    addEventListener('resize', size);
  }
  function size() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  function hide() { if (!stage) return; stage.hidden = true; cancelAnimationFrame(raf); raf = 0; }
  function reduced() { return document.body.classList.contains('hs-calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function drawDie(d, M, x, y, R, T, alpha) {
    var sh = d.sh, col = d.col, P = 900;
    var pts = sh.verts.map(function (v) { var p = apply(M, v); var k = P / (P - p[2] * R); return [x + p[0] * R * k, y - p[1] * R * k, p[2]]; });
    ctx.save(); ctx.globalAlpha = alpha;
    /* sombra */
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + R * .25, y + R * 1.05, R * .9, R * .22, 0, 0, Math.PI * 2); ctx.fill();
    var faces = sh.faces.map(function (f) { var n = apply(M, f.n); return { f: f, n: n, z: apply(M, f.c)[2] }; }).filter(function (o) { return o.n[2] > 0.001; }).sort(function (a, b) { return a.z - b.z; });
    faces.forEach(function (o) {
      var f = o.f, lit = .42 + .7 * Math.max(0, dot(o.n, LIGHT));
      ctx.beginPath(); f.idx.forEach(function (i, k) { var p = pts[i]; k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath();
      ctx.fillStyle = shade(col, lit); ctx.fill();
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, R * .045); ctx.strokeStyle = T.black; ctx.stroke();
      /* número na face (com perspectiva da face) */
      var c = apply(M, f.c), up = apply(M, f.up), rt = apply(M, f.right), k = P / (P - c[2] * R);
      var cx = x + c[0] * R * k, cy = y - c[1] * R * k, s = R * k * f.inr * (sh.faces.length === 4 ? .62 : sh.faces.length >= 12 ? 1.05 : .95);
      var front = o.n[2];
      ctx.save();
      ctx.setTransform(dpr * rt[0] * s, -dpr * rt[1] * s, -dpr * up[0] * s, dpr * up[1] * s, dpr * cx, dpr * cy);
      ctx.font = '400 1px ' + T.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var label = String(f.val) + ((f.val === 6 || f.val === 9) && sh.faces.length > 6 ? '.' : '');
      var fs = label.length > 1 ? .78 : 1;
      ctx.scale(fs, fs);
      ctx.lineWidth = .16; ctx.strokeStyle = T.black; ctx.strokeText(label, 0, .04);
      ctx.fillStyle = d.done && f.val === d.val && front > .95 ? '#ffffff' : T.paper; ctx.globalAlpha = alpha * (.55 + .45 * front);
      ctx.fillText(label, 0, .04);
      ctx.restore();
    });
    /* brilho */
    if (d.glow) { ctx.globalAlpha = alpha * d.glow; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R * 1.25, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function frame(now) {
    var T = themeColors(), t = (now - t0) / DUR, all = true;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    dice.forEach(function (d) {
      var lt = Math.max(0, Math.min(1, (now - t0 - d.delay) / DUR));
      if (lt < 1) all = false;
      var e = ease(lt);
      var x = d.sx + (d.x - d.sx) * e;
      var bounce = Math.abs(Math.sin(lt * Math.PI * 3)) * (1 - lt) * (1 - lt) * d.hop;
      var y = d.sy + (d.y - d.sy) * e - bounce;
      var M = matMul(d.final, matAxis(d.axis, d.spin * (1 - e)));
      if (lt >= 1 && !d.done) { d.done = true; d.glowT = now; }
      d.glow = d.done ? Math.max(0, 1 - (now - d.glowT) / 500) : 0;
      drawDie(d, M, x, y, d.R * (1 + (d.done ? .06 * d.glow : 0)), T, d.drop ? .4 : 1);
      if (d.done && d.drop) { ctx.save(); ctx.strokeStyle = '#ff4d6a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - d.R, y + d.R); ctx.lineTo(x + d.R, y - d.R); ctx.stroke(); ctx.restore(); }
    });
    if (all && !shown) { shown = true; showResult(); }
    var glowing = dice.some(function (d) { return d.glow > 0; });
    if (!all || glowing) raf = requestAnimationFrame(frame); else raf = 0;
  }

  /* ---------- rolagem ---------- */
  function parseExpr(expr) {
    var s = String(expr || '').replace(/\s+/g, '').replace(/[×x*]/gi, '*');
    var terms = [], re = /([+\-]?)(\d*)d(\d+)|([+\-]?)(\d+)/gi, m, ok = false;
    while ((m = re.exec(s))) {
      ok = true;
      if (m[3]) terms.push({ sign: m[1] === '-' ? -1 : 1, n: Math.min(40, Number(m[2] || 1)), sides: Math.max(2, Math.min(1000, Number(m[3]))) });
      else terms.push({ sign: m[4] === '-' ? -1 : 1, k: Number(m[5]) });
    }
    return ok ? terms : null;
  }
  function rnd(n) { var a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % n); }
  function crit() { try { return calculateSheet().critStart || 20; } catch (e) { return 20; } }

  function roll(expr, label, opts) {
    opts = opts || {};
    var terms = parseExpr(expr); if (!terms) return;
    ensureStage(); size();
    var rolls = [], bonus = 0, mode = opts.mode || 'normal';
    terms.forEach(function (t) {
      if (t.k != null) { bonus += t.sign * t.k; return; }
      for (var i = 0; i < t.n; i++) rolls.push({ sides: t.sides, val: rnd(t.sides), sign: t.sign });
    });
    if (opts.extra) bonus += Number(opts.extra) || 0;
    /* vantagem / desvantagem: rola mais um d20 e descarta */
    var d20s = rolls.filter(function (r) { return r.sides === 20; });
    if (mode !== 'normal' && d20s.length === 1) {
      var extra = { sides: 20, val: rnd(20), sign: 1 }; rolls.push(extra);
      var keep = mode === 'vant' ? (extra.val > d20s[0].val ? extra : d20s[0]) : (extra.val < d20s[0].val ? extra : d20s[0]);
      (keep === extra ? d20s[0] : extra).drop = true;
    }
    var sum = rolls.reduce(function (s, r) { return s + (r.drop ? 0 : r.sign * r.val); }, 0) + bonus;
    current = { expr: expr, label: label || 'ROLAGEM', opts: opts, rolls: rolls, bonus: bonus, total: sum, mode: mode };
    /* layout */
    var vis = rolls.slice(0, 14), n = vis.length;
    var cols = Math.min(n, W < 600 ? 3 : 7), rows = Math.ceil(n / cols);
    var R = Math.max(26, Math.min(W < 600 ? 62 : 86, (W * .8) / (cols * 2.6), (H * .42) / (rows * 2.6)));
    var cx = W / 2, cy = H * (W < 600 ? .36 : .4);
    dice = vis.map(function (r, i) {
      var row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, n - row * cols);
      var x = cx + (col - (inRow - 1) / 2) * R * 2.6, y = cy + (row - (rows - 1) / 2) * R * 2.6;
      var sh = shapeFor(r.sides), fv = r.sides === sh.faces.length ? r.val : Math.max(1, Math.min(sh.faces.length, Math.ceil(r.val / r.sides * sh.faces.length)));
      return { sh: sh, val: fv, real: r.val, col: dieColor(r.sides, themeColors()), R: R, x: x, y: y,
        sx: -R * 2 - Math.random() * 120, sy: H * (.15 + Math.random() * .6), hop: R * (1.2 + Math.random()),
        axis: norm([Math.random() - .5, Math.random() - .5, Math.random() - .5]), spin: 12 + Math.random() * 10,
        final: finalMatrix(sh, fv), delay: reduced() ? 0 : i * 70, drop: r.drop };
    });
    DUR = reduced() ? 1 : 1450;
    resultEl.className = 'dr-result'; resultEl.innerHTML = '';
    stage.hidden = false; stage.classList.remove('crit', 'fumble');
    shown = false; t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    log(current);
  }
  function showResult() {
    var c = current; if (!c) return;
    var nat = c.rolls.filter(function (r) { return r.sides === 20 && !r.drop; })[0];
    var isCrit = nat && nat.val >= crit(), isFumble = nat && nat.val === 1;
    stage.classList.toggle('crit', !!isCrit); stage.classList.toggle('fumble', !!isFumble);
    var parts = c.rolls.map(function (r) { return '<span class="dr-r' + (r.drop ? ' drop' : '') + (r.sides === 20 && r.val >= crit() ? ' hi' : '') + (r.sides === 20 && r.val === 1 ? ' lo' : '') + '"><small>d' + r.sides + '</small>' + (r.sign < 0 ? '−' : '') + r.val + '</span>'; }).join('');
    resultEl.innerHTML =
      (isCrit ? '<div class="dr-tag crit">CRÍTICO!</div>' : isFumble ? '<div class="dr-tag fumble">FALHA CRÍTICA</div>' : '') +
      '<div class="dr-card"><small>' + esc(c.label) + (c.mode === 'vant' ? ' · VANTAGEM' : c.mode === 'desv' ? ' · DESVANTAGEM' : '') + '</small>' +
      '<div class="dr-total"><b>' + c.total + '</b></div>' +
      '<div class="dr-parts">' + parts + (c.bonus ? '<span class="dr-bonus">' + (c.bonus > 0 ? '+' : '−') + Math.abs(c.bonus) + '</span>' : '') + '</div>' +
      '<div class="dr-expr">' + esc(String(c.expr)) + (c.opts.extra ? ' ' + (c.opts.extra > 0 ? '+' : '') + c.opts.extra : '') + '</div>' +
      '<div class="dr-actions"><button type="button" class="dr-again">↻ ROLAR DE NOVO</button><button type="button" class="dr-close">FECHAR</button></div></div>';
    resultEl.classList.add('in');
  }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }

  /* ---------- histórico ---------- */
  var LOG = [];
  function log(c) { LOG.unshift({ label: c.label, total: c.total, expr: c.expr, t: Date.now() }); LOG = LOG.slice(0, 10); paintPanel(); }

  /* ---------- painel ---------- */
  var pool = {}, mode = 'normal', extra = 0;
  function attrs() { try { var c = calculateSheet(); return { FOR: c.FOR, MAG: c.MAG, TEC: c.TEC, AGI: c.AGI, VIT: c.VIT, SOR: c.SOR }; } catch (e) { return { FOR: 0, MAG: 0, TEC: 0, AGI: 0, VIT: 0, SOR: 0 }; } }
  function weapon() { try { var q = ensureEquipmentState(); return q.items.filter(function (x) { return x.id === q.slots.primary && x.type === 'instrument'; })[0] || null; } catch (e) { return null; } }
  function resolve(f) {
    var a = attrs();
    try { var p = window.PhobiaFormulas && PhobiaFormulas.parse(f, a); if (p) return p.map(function (x) { return x.t != null ? x.t : x.v; }).join(''); } catch (e) {}
    return String(f).replace(/\b(FOR|MAG|TEC|AGI|VIT|SOR)\b/g, function (_, k) { return a[k]; });
  }
  function sgn(n) { return (n >= 0 ? '+' : '') + n; }
  function buildPanel() {
    panelEl = document.createElement('section'); panelEl.className = 'dr-panel'; panelEl.hidden = true; panelEl.setAttribute('aria-label', 'Rola dados');
    document.body.appendChild(panelEl);
    panelEl.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.drAdd) { var s = +b.dataset.drAdd; pool[s] = (pool[s] || 0) + 1; paintPanel(); return; }
      if (b.dataset.drSub) { var s2 = +b.dataset.drSub; pool[s2] = Math.max(0, (pool[s2] || 0) - 1); paintPanel(); return; }
      if (b.hasAttribute('data-dr-clear')) { pool = {}; paintPanel(); return; }
      if (b.hasAttribute('data-dr-clearlog')) { LOG = []; paintPanel(); return; }
      if (b.dataset.drMode) { mode = b.dataset.drMode; paintPanel(); return; }
      if (b.hasAttribute('data-dr-pool')) {
        var ex = Object.keys(pool).filter(function (k) { return pool[k]; }).map(function (k) { return pool[k] + 'd' + k; }).join('+');
        if (!ex) return; roll(ex, 'DADOS LIVRES', { mode: mode, extra: extra }); return;
      }
      if (b.dataset.drTest) { var t = b.dataset.drTest, v = b.dataset.drBonus; roll('1d20' + (+v ? sgn(+v) : ''), t, { mode: mode, extra: extra }); return; }
      if (b.dataset.drExpr) { roll(b.dataset.drExpr, b.dataset.drLabel, { mode: b.dataset.drD20 ? mode : 'normal', extra: extra }); return; }
      if (b.hasAttribute('data-dr-x')) { panelEl.hidden = true; return; }
    });
    panelEl.addEventListener('input', function (e) { if (e.target.id === 'drExtra') extra = Number(e.target.value) || 0; });
    panelEl.addEventListener('submit', function (e) {
      e.preventDefault(); var i = panelEl.querySelector('#drExpr'); var ex = resolve(i.value);
      if (parseExpr(ex)) roll(ex, i.value.toUpperCase(), { mode: mode, extra: extra });
    });
  }
  function paintPanel() {
    if (!panelEl || panelEl.hidden) return;
    var a = attrs(), w = weapon(), soc = ['Conhecimento', 'Disciplina', 'Empatia', 'Charme', 'Coragem', 'Expressão'];
    var sb = function (k) { try { return socialEffectiveBonus(k); } catch (e) { return 0; } };
    var diceBtns = [4, 6, 8, 10, 12, 20].map(function (s) {
      return '<div class="dr-die"><button type="button" data-dr-add="' + s + '" title="Adicionar d' + s + '"><i class="dr-ico d' + s + '"></i><b>d' + s + '</b></button>' +
        (pool[s] ? '<span>' + pool[s] + '</span><button type="button" class="dr-sub" data-dr-sub="' + s + '" aria-label="Tirar um d' + s + '">−</button>' : '') + '</div>';
    }).join('');
    var poolTxt = Object.keys(pool).filter(function (k) { return pool[k]; }).map(function (k) { return pool[k] + 'd' + k; }).join(' + ');
    var wb = '';
    if (w) {
      var acc = resolve(w.accuracy || ''), dmg = resolve(w.damage || '');
      if (parseExpr(acc)) wb += '<button type="button" data-dr-expr="' + esc(acc) + '" data-dr-label="ACERTO · ' + esc(w.name) + '" data-dr-d20="1"><small>ACERTO</small><b>' + esc(acc) + '</b></button>';
      if (parseExpr(dmg)) wb += '<button type="button" data-dr-expr="' + esc(dmg) + '" data-dr-label="DANO · ' + esc(w.name) + '"><small>DANO</small><b>' + esc(dmg) + '</b></button>';
    }
    panelEl.innerHTML =
      '<header><div><small>PERSONA // PHOBIA</small><b>ROLA <span>DADOS</span></b></div><button type="button" class="dr-x" data-dr-x aria-label="Fechar">×</button></header>' +
      '<div class="dr-modes">' + [['desv', 'DESVANTAGEM'], ['normal', 'NORMAL'], ['vant', 'VANTAGEM']].map(function (m) { return '<button type="button" data-dr-mode="' + m[0] + '" class="' + (mode === m[0] ? 'on' : '') + '">' + m[1] + '</button>'; }).join('') +
        '<label>BÔNUS EXTRA<input id="drExtra" type="number" value="' + (extra || '') + '" placeholder="0"></label></div>' +
      '<h4>TESTE DE ATRIBUTO <small>1d20 + atributo</small></h4><div class="dr-tests">' + Object.keys(a).map(function (k) { return '<button type="button" data-dr-test="TESTE DE ' + k + '" data-dr-bonus="' + a[k] + '"><b>' + k + '</b><small>' + sgn(a[k]) + '</small></button>'; }).join('') + '</div>' +
      '<h4>TESTE SOCIAL <small>1d20 + bônus do Tier</small></h4><div class="dr-tests soc">' + soc.map(function (k) { return '<button type="button" data-dr-test="' + k.toUpperCase() + '" data-dr-bonus="' + sb(k) + '"><b>' + k + '</b><small>' + sgn(sb(k)) + '</small></button>'; }).join('') + '</div>' +
      (wb ? '<h4>INSTRUMENTO <small>' + esc(w.name) + '</small></h4><div class="dr-tests wpn">' + wb + '</div>' : '') +
      '<h4>DADOS LIVRES' + (poolTxt ? ' <small>' + poolTxt + '</small>' : '') + '</h4><div class="dr-dice">' + diceBtns + '</div>' +
      '<div class="dr-poolrow"><button type="button" class="dr-go" data-dr-pool ' + (poolTxt ? '' : 'disabled') + '>ROLAR ' + (poolTxt || '') + '</button>' + (poolTxt ? '<button type="button" data-dr-clear>LIMPAR</button>' : '') + '</div>' +
      '<form class="dr-form"><input id="drExpr" placeholder="Fórmula: 2d6+MAG, 1d20+3…" autocomplete="off"><button type="submit">ROLAR</button></form>' +
      (LOG.length ? '<h4>ÚLTIMAS ROLAGENS <button type="button" class="dr-clearlog" data-dr-clearlog>LIMPAR HISTÓRICO</button></h4><ol class="dr-log">' + LOG.map(function (l) { return '<li><span>' + esc(l.label) + '</span><em>' + esc(l.expr) + '</em><b>' + l.total + '</b></li>'; }).join('') + '</ol>' : '');
    placePanel();
  }
  function togglePanel() { if (!panelEl) buildPanel(); panelEl.hidden = !panelEl.hidden; paintPanel(); placePanel(); }
  /* ---------- arrastar o botão (e o painel acompanha) ---------- */
  var POSKEY = 'phobia-dice-pos';
  function loadPos() { try { var p = JSON.parse(localStorage.getItem(POSKEY) || 'null'); if (p && isFinite(p.x) && isFinite(p.y)) return p; } catch (e) {} return null; }
  function savePos(p) { try { localStorage.setItem(POSKEY, JSON.stringify(p)); } catch (e) {} }
  function clampPos(x, y, el) {
    var w = el.offsetWidth || 62, h = el.offsetHeight || 62;
    return { x: Math.max(6, Math.min(innerWidth - w - 6, x)), y: Math.max(6, Math.min(innerHeight - h - 6, y)) };
  }
  function applyPos(el, p) {
    if (!p) { el.style.left = el.style.top = ''; el.style.right = el.style.bottom = ''; return; }
    p = clampPos(p.x, p.y, el);
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto';
  }
  function placePanel() {
    if (!panelEl || panelEl.hidden) return;
    var f = document.getElementById('drFab'); if (!f) return;
    var r = f.getBoundingClientRect(), pw = panelEl.offsetWidth, ph = panelEl.offsetHeight, gap = 12;
    if (!loadPos()) { panelEl.style.left = panelEl.style.top = ''; panelEl.style.right = panelEl.style.bottom = ''; return; }
    /* abre para o lado com mais espaço */
    var left = r.left + r.width / 2 > innerWidth / 2 ? r.right - pw : r.left;
    var top = r.top > innerHeight / 2 ? r.top - ph - gap : r.bottom + gap;
    if (top < 6 || top + ph > innerHeight - 6) { top = Math.max(6, Math.min(innerHeight - ph - 6, r.top - ph / 2)); left = r.left + r.width / 2 > innerWidth / 2 ? r.left - pw - gap : r.right + gap; }
    left = Math.max(6, Math.min(innerWidth - pw - 6, left));
    panelEl.style.left = left + 'px'; panelEl.style.top = top + 'px'; panelEl.style.right = 'auto'; panelEl.style.bottom = 'auto';
  }
  function makeDraggable(btn) {
    var start = null, moved = false;
    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      var r = btn.getBoundingClientRect();
      start = { px: e.clientX, py: e.clientY, x: r.left, y: r.top }; moved = false;
      btn.setPointerCapture(e.pointerId);
    });
    btn.addEventListener('pointermove', function (e) {
      if (!start) return;
      var dx = e.clientX - start.px, dy = e.clientY - start.py;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      moved = true; btn.classList.add('dragging');
      applyPos(btn, { x: start.x + dx, y: start.y + dy }); placePanel();
    });
    function end(e) {
      if (!start) return;
      if (moved) { var r = btn.getBoundingClientRect(); savePos({ x: r.left, y: r.top }); btn.classList.remove('dragging'); btn.dataset.justDragged = '1'; setTimeout(function () { delete btn.dataset.justDragged; }, 50); }
      start = null;
    }
    btn.addEventListener('pointerup', end); btn.addEventListener('pointercancel', end);
    btn.addEventListener('dblclick', function () { try { localStorage.removeItem(POSKEY); } catch (e) {} applyPos(btn, null); placePanel(); });
    addEventListener('resize', function () { applyPos(btn, loadPos()); placePanel(); });
    applyPos(btn, loadPos());
  }
  function fab() {
    if (document.getElementById('drFab')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'drFab'; b.className = 'dr-fab'; b.setAttribute('aria-label', 'Rola dados');
    b.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3 43 14v20L24 45 5 34V14z"/><path d="M24 3v13M43 14 32 21M5 14l11 7M24 45V33M43 34 32 27M5 34l11-7M16 21h16l-8 12z" fill="none"/></svg><b>20</b>';
    b.title = 'Clique para abrir · arraste para mover · duplo clique volta ao canto';
    b.addEventListener('click', function () { if (b.dataset.justDragged) return; togglePanel(); });
    document.body.appendChild(b); makeDraggable(b); return;
    document.body.appendChild(b);
  }

  /* clicar numa fórmula calculada rola ela */
  document.addEventListener('click', function (e) {
    var f = e.target.closest && e.target.closest('.fx-calc'); if (!f) return;
    var ex = f.textContent; if (!/d\d/.test(ex) && !/^\d/.test(ex)) return;
    if (!/d\d/.test(ex)) return;
    var lab = f.closest('span,p,div'); var sm = lab && lab.querySelector('small');
    roll(ex, (sm && sm.textContent.trim()) || f.dataset.f || 'ROLAGEM', { mode: /1d20/.test(ex) ? mode : 'normal' });
  });

  window.PhobiaDice = { roll: roll, open: togglePanel, parse: parseExpr, _shape: shapeFor };
  function init() { if (!document.body) { setTimeout(init, 100); return; } fab(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

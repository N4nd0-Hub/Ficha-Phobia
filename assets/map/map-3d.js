/* ==========================================================
   PERSONA // PHOBIA — map-3d.js
   Modo 3D do mapa de Tokyo (botão "3D" nos controles do mapa).

   • Usa Three.js (assets/vendor/three), carregado só quando o
     jogador liga o 3D — o mapa 2D continua igual e leve.
   • Usa os mesmos dados do mapa 2D: DISTRICT_ART_LAYOUT (posição
     de cada distrito), PhobiaMapRoads (pistas e metrô), estado dos
     distritos (bloqueado/selecionado), hora do dia e camada
     Realidade/Cognição.
   • Clicar num distrito chama selectDistrict(id), igual ao 2D
     (distrito bloqueado abre a senha).
   • Coordenadas: 1 unidade 3D = 10 px do mapa 2D, centro em (640,350).
   ========================================================== */
(function () {
  'use strict';

  var PREF_KEY = 'phobiaMap3d';
  var NS = 'http://www.w3.org/2000/svg';
  var base = (function () { var s = document.currentScript; return s ? s.src : location.href; })();
  var VENDOR = new URL('../vendor/three/', base).href;

  var THREE = null, Orbit = null, loading = null;
  var on = false, built = false, failed = false;
  var W = {};          // tudo da cena
  var raf = 0;

  /* ---------- utilidades ---------- */
  function S() { try { return window.state || state; } catch (e) { return null; } }
  function layout() { try { return DISTRICT_ART_LAYOUT; } catch (e) { return null; } }
  function badgeImages() { try { return DISTRICT_BADGE_IMAGES; } catch (e) { return {}; } }
  function wx(x) { return (x - 640) / 10; }
  function wz(y) { return (y - 350) / 10; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pref(v) { try { if (v === undefined) return localStorage.getItem(PREF_KEY) === '1'; localStorage.setItem(PREF_KEY, v ? '1' : '0'); } catch (e) { return false; } }
  function accent() {
    var v = '';
    try { v = getComputedStyle(document.body).getPropertyValue('--theme-accent').trim(); } catch (e) {}
    return /^#|^rgb/.test(v) ? v : '#ef2b97';
  }
  function isLocked(id) { var s = S(), d = s && s.districts && s.districts[id]; return !!(s && s.mode === 'player' && d && d.state === 'locked'); }
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* amostra um path SVG em pontos do mundo 3D */
  var probeSvg = null, probe = null;
  function sample(d, step) {
    if (!probe) {
      probeSvg = document.createElementNS(NS, 'svg');
      probeSvg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden');
      probe = document.createElementNS(NS, 'path'); probeSvg.appendChild(probe); document.body.appendChild(probeSvg);
    }
    probe.setAttribute('d', d);
    var L = probe.getTotalLength(), n = Math.max(2, Math.ceil(L / step)), out = [];
    for (var i = 0; i <= n; i++) { var p = probe.getPointAtLength(L * i / n); out.push({ x: wx(p.x), z: wz(p.y) }); }
    return out;
  }

  /* ---------- carregamento do Three.js ---------- */
  function load() {
    if (loading) return loading;
    loading = Promise.all([import(VENDOR + 'three.module.min.js'), import(VENDOR + 'OrbitControls.js')])
      .then(function (m) { THREE = m[0]; Orbit = m[1].OrbitControls; });
    return loading;
  }

  /* ---------- texturas desenhadas em canvas ---------- */
  function canvasTex(w, h, draw, repeat) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    return t;
  }
  function groundTex(acc) {
    return canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = '#efc3d3'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f6d7e3';
      [[8, 8, 104, 72], [128, 8, 120, 72], [8, 96, 240, 44], [8, 156, 70, 92], [92, 156, 156, 92]].forEach(function (r) { g.fillRect(r[0], r[1], r[2], r[3]); });
      g.strokeStyle = 'rgba(120,40,80,.18)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    }, true);
  }
  function roadTex(acc) {
    return canvasTex(256, 64, function (g, w, h) {
      g.fillStyle = '#121014'; g.fillRect(0, 0, w, h);
      g.fillStyle = acc; g.fillRect(0, 7, w, 6); g.fillRect(0, h - 13, w, 6);
      g.fillStyle = '#2d2833'; g.fillRect(0, 15, w, h - 30);
      g.fillStyle = '#ffd21f'; g.fillRect(0, h / 2 - 2, w * .55, 4);
    }, true);
  }
  function riverTex() {
    return canvasTex(256, 64, function (g, w, h) {
      g.fillStyle = '#86cdf0'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (var i = 0; i < 6; i++) { g.fillRect((i * 47) % w, 12 + (i * 17) % (h - 24), 26, 3); }
    }, true);
  }
  function waterTex() {
    return canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#7fd0f2'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.38)';
      for (var y = 0; y < h; y += 16) for (var x = (y / 16 % 2) * 8; x < w; x += 16) { g.beginPath(); g.arc(x + 4, y + 4, 2.4, 0, 7); g.fill(); }
    }, true);
  }
  function lockedPlate() {
    return canvasTex(256, 112, function (g, w, h) {
      g.fillStyle = '#111'; g.beginPath(); g.roundRect(6, 10, w - 12, h - 20, 10); g.fill();
      g.strokeStyle = '#f5ecd3'; g.lineWidth = 4; g.beginPath(); g.roundRect(14, 18, w - 28, h - 36, 6); g.stroke();
      g.fillStyle = '#fff'; g.font = '900 40px "Arial Black", Arial'; g.textAlign = 'center'; g.fillText('???', w / 2, 62);
      g.fillStyle = '#ef2b97'; g.font = '700 15px monospace'; g.fillText('CLICK // PASSWORD', w / 2, 84);
    });
  }

  /* ---------- geometria: fita ao longo de um caminho ---------- */
  function ribbon(pts, width, y, uLen) {
    var pos = [], uv = [], nor = [], idx = [], s = 0;
    for (var i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      var nx = -tz * width / 2, nz = tx * width / 2;
      if (i > 0) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      pos.push(pts[i].x + nx, y, pts[i].z + nz, pts[i].x - nx, y, pts[i].z - nz);
      nor.push(0, 1, 0, 0, 1, 0);
      uv.push(s / uLen, 0, s / uLen, 1);
      if (i > 0) { var k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  /* comprimento acumulado de um caminho, para andar por ele */
  function track(pts) {
    var acc = [0];
    for (var i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    return { pts: pts, acc: acc, len: acc[acc.length - 1] };
  }
  function along(tr, d) {
    d = Math.max(0, Math.min(tr.len, d));
    var lo = 0, hi = tr.acc.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (tr.acc[m] < d) lo = m; else hi = m; }
    var a = tr.pts[lo], b = tr.pts[hi], seg = (tr.acc[hi] - tr.acc[lo]) || 1, t = (d - tr.acc[lo]) / seg;
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / seg, dz: (b.z - a.z) / seg };
  }

  /* junta várias geometrias com cor por vértice numa só (prédios de um distrito = 1 draw call) */
  function merge(list) {
    var pos = [], nor = [], col = [], idx = [], off = 0;
    list.forEach(function (it) {
      var g = it.g.index ? it.g : it.g;
      var p = g.attributes.position, n = g.attributes.normal, c = new THREE.Color(it.c);
      for (var i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
      if (g.index) for (var j = 0; j < g.index.count; j++) idx.push(g.index.getX(j) + off);
      else for (var k = 0; k < p.count; k++) idx.push(k + off);
      off += p.count; g.dispose();
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.setIndex(idx);
    out.computeBoundingSphere();
    return out;
  }
  function box(w, h, d, x, y, z) { var g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return g; }
  function cyl(rt, rb, h, seg, x, y, z) { var g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y + h / 2, z); return g; }

  /* ---------- materiais ---------- */
  function buildingMaterial() {
    var m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.userData.u = { uNight: { value: 0 }, uWin: { value: new THREE.Color('#ffd27a') } };
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uNight = m.userData.u.uNight; sh.uniforms.uWin = m.userData.u.uWin;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform float uNight; uniform vec3 uWin;')
        .replace('#include <emissivemap_fragment>', [
          '#include <emissivemap_fragment>',
          'if (abs(vWN.y) < 0.5 && vWP.y > 0.7) {',
          '  vec2 gp = vec2(abs(vWN.x) > 0.5 ? vWP.z : vWP.x, vWP.y) * vec2(1.7, 1.3);',
          '  vec2 f = fract(gp);',
          '  float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.78);',
          '  float lit = step(0.42, fract(sin(dot(floor(gp), vec2(12.9898, 78.233))) * 43758.5453));',
          '  diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.62, 0.8, 0.92), diffuseColor.rgb * 0.35, uNight), win * 0.7);',
          '  totalEmissiveRadiance += win * lit * uNight * uWin * 1.15;',
          '}'
        ].join('\n'));
    };
    return m;
  }
  /* contorno preto estilo cel-shading: casco invertido inflado pela normal */
  function outlineMaterial(px) {
    var m = new THREE.MeshBasicMaterial({ color: 0x151216, side: THREE.BackSide });
    m.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * ' + px.toFixed(3) + ';');
    };
    return m;
  }

  /* ---------- perfis dos distritos ---------- */
  var PROFILE = {
    shinjuku:  { n: 30, lo: 4, hi: 13, land: 'tocho' },
    shibuya:   { n: 26, lo: 3, hi: 8, land: 'ichimaru' },
    ikebukuro: { n: 20, lo: 2.5, hi: 7, land: 'sunshine' },
    akihabara: { n: 24, lo: 3, hi: 7, land: 'neon' },
    asakusa:   { n: 16, lo: 1, hi: 2.6, land: 'pagoda' },
    ginza:     { n: 18, lo: 3.5, hi: 7, land: 'clock' },
    roppongi:  { n: 18, lo: 2.5, hi: 7, land: 'tower' },
    odaiba:    { n: 12, lo: 1.5, hi: 4, land: 'wheel' },
    harajuku:  { n: 14, lo: 1, hi: 3.2, trees: '#66b84f' },
    nakano:    { n: 18, lo: 2, hi: 5, land: 'broadway' },
    kichijoji: { n: 13, lo: 1, hi: 3, trees: '#66b84f' },
    meguro:    { n: 13, lo: 1, hi: 3.2, trees: '#f5a8c8' }
  };
  var COLORS = ['#f4ead2', '#f4ead2', '#fffaf0', '#fffaf0', '#cfc6ba', '#cfc6ba', '#3a3440', '#f6b6cf', '#d9e6ea'];

  function districtGeometry(id, box2, acc) {
    var P = PROFILE[id] || { n: 16, lo: 2, hi: 5 }, r = rng(hash(id));
    var cx = wx(box2.cx), cz = wz(box2.cy), rx = box2.w / 20 * .78, rz = box2.h / 20 * .78;
    var parts = [], cells = [], cs = 1.75, topH = 0;
    for (var gx = -rx; gx <= rx; gx += cs) for (var gz = -rz; gz <= rz; gz += cs) {
      var e = (gx * gx) / (rx * rx) + (gz * gz) / (rz * rz);
      if (e <= 1) cells.push({ x: gx, z: gz, e: e });
    }
    for (var i = cells.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    /* o centro fica para o marco do distrito */
    var landR = P.land ? 1.9 : 0;
    cells = cells.filter(function (c) { return Math.hypot(c.x, c.z) > landR; }).slice(0, P.n);
    cells.forEach(function (c) {
      var w = cs * (.62 + r() * .3), d = cs * (.62 + r() * .3);
      var h = P.lo + (P.hi - P.lo) * Math.pow(1 - Math.sqrt(c.e), 1.3) * (.65 + r() * .5);
      var col = r() < .08 ? acc : COLORS[Math.floor(r() * COLORS.length)];
      var x = cx + c.x + (r() - .5) * .3, z = cz + c.z + (r() - .5) * .3;
      parts.push({ g: box(w, h, d, x, .35, z), c: col });
      if (h > 4 && r() < .5) parts.push({ g: box(w * .55, h * .18, d * .55, x, .35 + h, z), c: col });
      if (r() < .35) parts.push({ g: box(w * .3, .35, d * .3, x + w * .2, .35 + h, z - d * .2), c: '#8c8590' });
      topH = Math.max(topH, h);
    });
    /* marcos */
    var L = P.land, y0 = .35;
    if (L === 'tocho') { parts.push({ g: box(1.3, 15, 1.6, cx - .8, y0, cz), c: '#d9d2c6' }, { g: box(1.3, 15, 1.6, cx + .8, y0, cz), c: '#d9d2c6' }, { g: box(3, 9, 1.8, cx, y0, cz), c: '#cfc6ba' }); topH = 15; }
    if (L === 'ichimaru') { parts.push({ g: cyl(1.2, 1.2, 7, 18, cx, y0, cz), c: '#e9eef2' }, { g: cyl(1.25, 1.25, 1.1, 18, cx, y0 + 6.2, cz), c: acc }); topH = Math.max(topH, 7); }
    if (L === 'sunshine') { parts.push({ g: box(2, 17, 2, cx, y0, cz), c: '#e3ded4' }, { g: box(1.2, 1, 1.2, cx, y0 + 17, cz), c: '#3a3440' }); topH = 18; }
    if (L === 'neon') { parts.push({ g: box(3, 6, 2, cx, y0, cz), c: '#3a3440' }, { g: box(.25, 4, 1.6, cx + 1.6, y0 + 1.5, cz), c: acc }, { g: box(.25, 3, 1.2, cx - 1.6, y0 + 2, cz), c: '#58d9ff' }); topH = Math.max(topH, 6); }
    if (L === 'pagoda') {
      for (var k = 0; k < 5; k++) { var s = 2.2 - k * .35, yy = y0 + k * 1.15; parts.push({ g: box(s * .7, .85, s * .7, cx, yy, cz), c: '#d23a32' }, { g: box(s, .22, s, cx, yy + .85, cz), c: '#2b2630' }); }
      parts.push({ g: cyl(.05, .12, 1.6, 6, cx, y0 + 5.9, cz), c: '#d8b45a' });
      /* torre alta ao fundo (marco da região) */
      var tx = cx + rx * .6, tz = cz - rz * .55;
      parts.push({ g: cyl(.25, .7, 22, 8, tx, y0, tz), c: '#e8f0f6' }, { g: cyl(.9, .9, .8, 12, tx, y0 + 13, tz), c: '#a9c7dc' }, { g: cyl(.6, .6, .6, 12, tx, y0 + 17.5, tz), c: '#a9c7dc' }, { g: cyl(.04, .1, 3, 6, tx, y0 + 22, tz), c: '#e8f0f6' });
      topH = 25;
    }
    if (L === 'clock') { parts.push({ g: box(2.6, 4.5, 2.6, cx, y0, cz), c: '#efe3c8' }, { g: cyl(.9, .9, 1.4, 16, cx, y0 + 4.5, cz), c: '#efe3c8' }, { g: cyl(0, .95, 1, 16, cx, y0 + 5.9, cz), c: '#4f8c7a' }); topH = Math.max(topH, 7); }
    if (L === 'tower') {
      var bands = ['#e8402f', '#fff6ec', '#e8402f', '#fff6ec', '#e8402f', '#fff6ec', '#e8402f'];
      bands.forEach(function (c2, bi) { var b0 = bi * 2.2, rr0 = 1.8 * (1 - b0 / 17), rr1 = 1.8 * (1 - (b0 + 2.2) / 17); parts.push({ g: cyl(Math.max(.08, rr1), Math.max(.1, rr0), 2.2, 4, cx, y0 + b0, cz), c: c2 }); });
      parts.push({ g: box(1.6, .6, 1.6, cx, y0 + 5, cz), c: '#fff6ec' }, { g: cyl(.03, .08, 2.5, 6, cx, y0 + 15.4, cz), c: '#e8402f' });
      topH = 18;
    }
    if (L === 'broadway') { parts.push({ g: box(3.4, 5, 2.4, cx, y0, cz), c: '#d9d2c6' }, { g: box(3.6, .6, 2.6, cx, y0 + 1.3, cz), c: acc }); topH = Math.max(topH, 5); }
    if (L === 'wheel') topH = Math.max(topH, 8);
    /* árvores */
    var trees = [];
    if (P.trees || L === 'pagoda') {
      for (var q = 0; q < 14; q++) {
        var a = r() * Math.PI * 2, rr = .55 + r() * .45, px = cx + Math.cos(a) * rx * rr, pz = cz + Math.sin(a) * rz * rr;
        trees.push({ g: cyl(.08, .1, .5, 5, px, y0, pz), c: '#6b4a35' });
        var ico = new THREE.IcosahedronGeometry(.55 + r() * .25, 0); ico.translate(px, y0 + .9, pz);
        trees.push({ g: ico, c: P.trees || '#f5a8c8' });
      }
    }
    return { geo: merge(parts), trees: trees.length ? merge(trees) : null, cx: cx, cz: cz, rx: rx, rz: rz, top: topH + .35 };
  }

  /* ---------- montagem da cena ---------- */
  function build(host) {
    var LAY = layout(); if (!LAY) throw new Error('layout');
    var acc = accent();
    W.acc = acc;
    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf3d9e4, 110, 230);
    var cam = new THREE.PerspectiveCamera(34, 1, .5, 600);
    cam.position.set(0, 100, 108);
    var ctl = new Orbit(cam, renderer.domElement);
    ctl.enableDamping = true; ctl.dampingFactor = .09;
    ctl.screenSpacePanning = false;
    ctl.minDistance = 22; ctl.maxDistance = 190;
    ctl.minPolarAngle = .18; ctl.maxPolarAngle = 1.2;
    ctl.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    ctl.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    ctl.target.set(0, 0, 0);
    ctl.addEventListener('change', function () {
      ctl.target.x = Math.max(-72, Math.min(72, ctl.target.x)); ctl.target.z = Math.max(-46, Math.min(46, ctl.target.z)); ctl.target.y = 0;
      zoomLabel();
    });
    W.renderer = renderer; W.scene = scene; W.cam = cam; W.ctl = ctl; W.host = host;

    /* luzes */
    var hemi = new THREE.HemisphereLight(0xfff3f7, 0xb98aa0, 1.35); scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-50, 90, 40); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -85; sc.right = 85; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 260;
    sun.shadow.bias = -.0006; sun.shadow.normalBias = .04;
    scene.add(sun); scene.add(sun.target);
    W.hemi = hemi; W.sun = sun;

    /* chão */
    var gt = groundTex(acc); gt.repeat.set(60, 60);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(640, 640), new THREE.MeshLambertMaterial({ map: gt }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    W.ground = ground;

    /* baía */
    var bayPts = [[1000, 900], [1015, 740], [1030, 690], [1035, 640], [1060, 530], [1110, 505], [1180, 495], [1250, 470], [1330, 440], [1500, 420], [3300, 400]];
    var shape = new THREE.Shape();
    shape.moveTo(wx(bayPts[0][0]), -wz(bayPts[0][1]));
    bayPts.slice(1).forEach(function (p) { shape.lineTo(wx(p[0]), -wz(p[1])); });
    shape.lineTo(wx(3300), -wz(3000)); shape.lineTo(wx(1000), -wz(3000)); shape.closePath();
    var wt = waterTex(); wt.repeat.set(.12, .12);
    var water = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ map: wt, side: THREE.DoubleSide }));
    water.rotation.x = -Math.PI / 2; water.position.y = .04; water.receiveShadow = true; scene.add(water);
    var shore = bayPts.map(function (p) { return { x: wx(p[0]), z: wz(p[1]) }; });
    scene.add(new THREE.Mesh(ribbon(shore, .9, .07, 10), new THREE.MeshBasicMaterial({ color: 0x151216 })));
    W.waterTex = wt;

    /* rios */
    var rt = riverTex(); W.riverTex = rt;
    ['M 1340 -900 C 1318 -300 1290 0 1268 150 S 1236 380 1196 560',
     'M -1400 270 C -600 250 -100 300 260 255 S 560 280 640 300 S 900 330 1010 312 S 1170 300 1252 262'].forEach(function (d) {
      var pts = sample(d, 14);
      scene.add(new THREE.Mesh(ribbon(pts, 4.2, .05, 12), new THREE.MeshBasicMaterial({ color: 0x151216 })));
      var rv = new THREE.Mesh(ribbon(pts, 3.4, .08, 12), new THREE.MeshLambertMaterial({ map: rt }));
      rv.receiveShadow = true; scene.add(rv);
    });

    /* parques */
    var parkMat = new THREE.MeshLambertMaterial({ color: 0x83c56c });
    var parkTrees = [];
    var pr = rng(77);
    [[255, 470, 64, 40, -12], [950, 110, 70, 36, 8], [905, 330, 48, 34, 0], [-260, 520, 140, 70, 10], [640, -40, 110, 50, -6], [260, 880, 120, 60, -8], [1480, 120, 70, 40, -14]].forEach(function (p) {
      var m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), parkMat);
      m.rotation.x = -Math.PI / 2; m.rotation.z = -p[4] * Math.PI / 180; m.scale.set(p[2] / 10, p[3] / 10, 1);
      m.position.set(wx(p[0]), .1, wz(p[1])); m.receiveShadow = true; scene.add(m);
      var rim = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x151216 }));
      rim.rotation.copy(m.rotation); rim.scale.set(p[2] / 10 + .4, p[3] / 10 + .4, 1); rim.position.set(m.position.x, .08, m.position.z); scene.add(rim);
      var n = Math.round(p[2] * p[3] / 260);
      for (var i = 0; i < n; i++) {
        var a = pr() * Math.PI * 2, rr = Math.sqrt(pr()) * .8, ca = Math.cos(-p[4] * Math.PI / 180), sa = Math.sin(-p[4] * Math.PI / 180);
        var lx = Math.cos(a) * rr * p[2] / 10, lz = Math.sin(a) * rr * p[3] / 10;
        var x = wx(p[0]) + lx * ca - lz * sa, z = wz(p[1]) + lx * sa + lz * ca;
        var t = new THREE.IcosahedronGeometry(.6 + pr() * .4, 0); t.translate(x, .9 + pr() * .3, z);
        parkTrees.push({ g: t, c: pr() < .2 ? '#f5a8c8' : '#4e9a45' });
      }
    });
    var treeMesh = new THREE.Mesh(merge(parkTrees), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    treeMesh.castShadow = true; scene.add(treeMesh);

    /* pistas e metrô */
    var routes = window.PhobiaMapRoads ? window.PhobiaMapRoads.build(LAY) : [];
    var rdt = roadTex(acc); W.roadTex = rdt;
    var roadMat = new THREE.MeshLambertMaterial({ map: rdt });
    W.cars = []; W.trains = [];
    var inside = function (p, ids) {
      return ids.some(function (id) { var b = LAY[id]; if (!b) return false; var dx = (p.x - wx(b.cx)) / (b.w / 20 * .95), dz = (p.z - wz(b.cy)) / (b.h / 20 * .95); return dx * dx + dz * dz < 1; });
    };
    routes.forEach(function (r) {
      var pts = sample(r.d, 4);
      if (r.type !== 'metro') {
        var rm = new THREE.Mesh(ribbon(pts, 2.6, .12, 5), roadMat); rm.receiveShadow = true; scene.add(rm);
        var tr = track(pts);
        for (var c = 0; c < 5; c++) W.cars.push({ tr: tr, d: tr.len * c / 5 + Math.random() * 4, v: 4 + Math.random() * 3, lane: c % 2 ? 1 : -1 });
      } else {
        /* metrô elevado: só os trechos fora dos distritos, com pilares */
        var runs = [], cur = [];
        pts.forEach(function (p) { if (inside(p, r.ids)) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(p); });
        if (cur.length > 1) runs.push(cur);
        var col = new THREE.Color(r.color);
        var lineMat = new THREE.MeshLambertMaterial({ color: col });
        runs.forEach(function (run) {
          scene.add(new THREE.Mesh(ribbon(run, 1.5, 1.95, 4), new THREE.MeshBasicMaterial({ color: 0x151216 })));
          var lm = new THREE.Mesh(ribbon(run, 1.1, 2.0, 4), lineMat); lm.castShadow = true; scene.add(lm);
          var trk = track(run);
          for (var d = 1.5; d < trk.len; d += 5) {
            var q = along(trk, d), pil = new THREE.Mesh(W.pillarGeo || (W.pillarGeo = new THREE.CylinderGeometry(.16, .2, 2, 6)), W.pillarMat || (W.pillarMat = new THREE.MeshLambertMaterial({ color: 0x3a3440 })));
            pil.position.set(q.x, 1, q.z); pil.castShadow = true; scene.add(pil);
          }
          /* estações nas pontas */
          [run[0], run[run.length - 1]].forEach(function (p) {
            var st = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .5, 16), new THREE.MeshLambertMaterial({ color: 0xffffff }));
            st.position.set(p.x, 2.15, p.z); scene.add(st);
            var ring = new THREE.Mesh(new THREE.TorusGeometry(.75, .13, 6, 18), lineMat); ring.rotation.x = Math.PI / 2; ring.position.set(p.x, 2.42, p.z); scene.add(ring);
          });
          var train = new THREE.Group();
          var body = new THREE.Mesh(new THREE.BoxGeometry(2.2, .7, .8), new THREE.MeshLambertMaterial({ color: col }));
          var win = new THREE.Mesh(new THREE.BoxGeometry(1.6, .22, .82), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
          win.position.y = .1; body.castShadow = true; train.add(body); train.add(win);
          scene.add(train);
          W.trains.push({ g: train, tr: trk, t: Math.random() });
        });
      }
    });
    /* carros: um InstancedMesh só */
    var carGeo = new THREE.BoxGeometry(.9, .45, .5); carGeo.translate(0, .45, 0);
    var carMesh = new THREE.InstancedMesh(carGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), W.cars.length);
    var carCols = ['#ffffff', '#ffd21f', '#58d9ff', '#ef2b97', '#2d2833', '#e8402f'];
    W.cars.forEach(function (c, i) { carMesh.setColorAt(i, new THREE.Color(carCols[i % carCols.length])); });
    carMesh.castShadow = true; scene.add(carMesh); W.carMesh = carMesh; W.tmp = new THREE.Object3D();

    /* distritos */
    W.bMat = buildingMaterial();
    W.lockMat = new THREE.MeshLambertMaterial({ color: 0x433d4b });
    W.olMat = outlineMaterial(.07);
    W.treeMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    W.d = {}; W.pick = [];
    var platGeo = new THREE.CylinderGeometry(1, 1, .35, 48); platGeo.translate(0, .175, 0);
    var platMat = new THREE.MeshLambertMaterial({ color: 0xfbf3e2 });
    var lockPlat = new THREE.MeshLambertMaterial({ color: 0x9a8f9e });
    var tl = new THREE.TextureLoader(), imgs = badgeImages(), plateTex = lockedPlate();
    Object.keys(LAY).forEach(function (id) {
      var b = LAY[id], info = districtGeometry(id, b, acc), g = new THREE.Group();
      var plat = new THREE.Mesh(platGeo, platMat); plat.scale.set(info.rx / .78 * .98, 1, info.rz / .78 * .98); plat.position.set(info.cx, 0, info.cz); plat.receiveShadow = true;
      var platOl = new THREE.Mesh(platGeo, W.olMat); platOl.scale.copy(plat.scale); platOl.position.copy(plat.position);
      var mesh = new THREE.Mesh(info.geo, W.bMat); mesh.castShadow = true; mesh.receiveShadow = true;
      var ol = new THREE.Mesh(info.geo, W.olMat);
      g.add(plat, platOl, mesh, ol);
      var tm = null;
      if (info.trees) { tm = new THREE.Mesh(info.trees, W.treeMat); tm.castShadow = true; g.add(tm); }
      var wheel = null;
      if (PROFILE[id] && PROFILE[id].land === 'wheel') {
        wheel = new THREE.Group();
        var rim = new THREE.Mesh(new THREE.TorusGeometry(3.4, .14, 6, 40), new THREE.MeshLambertMaterial({ color: 0xffffff }));
        wheel.add(rim);
        for (var s = 0; s < 12; s++) {
          var sp = new THREE.Mesh(new THREE.BoxGeometry(.07, 3.4, .07), new THREE.MeshLambertMaterial({ color: 0xd9d2c6 })); sp.rotation.z = s / 12 * Math.PI * 2; sp.position.set(Math.sin(-sp.rotation.z) * 1.7, Math.cos(sp.rotation.z) * 1.7, 0); wheel.add(sp);
          var cab = new THREE.Mesh(new THREE.BoxGeometry(.4, .4, .4), new THREE.MeshLambertMaterial({ color: new THREE.Color(s % 3 ? '#58d9ff' : acc) })); cab.position.set(Math.cos(s / 12 * Math.PI * 2) * 3.4, Math.sin(s / 12 * Math.PI * 2) * 3.4, 0); wheel.add(cab);
        }
        wheel.position.y = 4.3; wheel.traverse(function (o) { o.castShadow = true; });
        var pivot = new THREE.Group(); pivot.position.set(info.cx, 0, info.cz); pivot.rotation.y = .5;
        var legMat = new THREE.MeshLambertMaterial({ color: 0xcfc6ba });
        [-1, 1].forEach(function (sg) { var lg = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, 4.4, 5), legMat); lg.rotation.z = .25 * sg; lg.position.set(-.55 * sg, 2.15, 0); lg.castShadow = true; pivot.add(lg); });
        pivot.add(wheel); g.add(pivot);
      }
      /* placa do distrito */
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true }));
      spr.renderOrder = 10; spr.userData.id = id;
      spr.position.set(info.cx, Math.min(info.top, 10) + 4.2, info.cz + info.rz * .2);
      var artW = b.w / 10 * .44;
      spr.scale.set(artW, artW * b.h / b.w, 1);
      g.add(spr);
      /* área de clique invisível */
      var hit = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, Math.max(6, info.top), 16), new THREE.MeshBasicMaterial({ visible: false }));
      hit.scale.set(info.rx / .78, 1, info.rz / .78); hit.position.set(info.cx, Math.max(6, info.top) / 2, info.cz); hit.userData.id = id;
      g.add(hit);
      W.pick.push(hit, spr);
      scene.add(g);
      var rec = { id: id, g: g, mesh: mesh, ol: ol, plat: plat, trees: tm, spr: spr, info: info, wheel: wheel, locked: null, art: null, lockedPlat: lockPlat, platMat: platMat };
      W.d[id] = rec;
      if (imgs[id]) tl.load(imgs[id], function (t) { t.colorSpace = THREE.SRGBColorSpace; rec.art = t; applyState(rec, true); });
      rec.plate = plateTex;
    });

    /* marcador do distrito selecionado: anel pulsante + losango flutuando */
    var ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(acc), transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false });
    var ring = new THREE.Mesh(new THREE.RingGeometry(.92, 1.05, 64), ringMat); ring.rotation.x = -Math.PI / 2;
    var gem = new THREE.Group();
    var gm = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshLambertMaterial({ color: new THREE.Color(acc), emissive: new THREE.Color(acc), emissiveIntensity: .35 }));
    gm.scale.y = 1.5; gem.add(gm);
    var gmo = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), outlineMaterial(.12)); gmo.scale.y = 1.5; gem.add(gmo);
    scene.add(ring); scene.add(gem);
    W.ring = ring; W.gem = gem; W.ringMat = ringMat; W.gemMat = gm.material;

    /* nuvens */
    W.clouds = [];
    var cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .92 });
    var cr = rng(5);
    for (var k = 0; k < 7; k++) {
      var cg = new THREE.Group();
      for (var p = 0; p < 4; p++) { var bl = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 + cr() * 1.6, 1), cloudMat); bl.position.set(p * 2.6 - 4, cr() * .8, (cr() - .5) * 2); bl.scale.y = .55; bl.castShadow = true; cg.add(bl); }
      cg.position.set(-110 + k * 34 + cr() * 10, 30 + cr() * 6, -40 + cr() * 80);
      cg.userData.v = 1.2 + cr() * 1.2;
      scene.add(cg); W.clouds.push(cg);
    }
    W.cloudMat = cloudMat;

    /* interação */
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), down = null;
    function pickAt(ev) {
      var r = renderer.domElement.getBoundingClientRect();
      ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      var hits = ray.intersectObjects(W.pick, false);
      return hits.length ? hits[0].object.userData.id : null;
    }
    renderer.domElement.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener('pointerup', function (e) {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || e.button !== 0) { down = null; return; }
      down = null;
      var id = pickAt(e);
      if (id && typeof window.selectDistrict === 'function') { window.selectDistrict(id); flyTo(id); }
    });
    var hoverQ = null;
    renderer.domElement.addEventListener('pointermove', function (e) {
      if (e.buttons) return;
      hoverQ = e;
    });
    renderer.domElement.addEventListener('pointerleave', function () { setHover(null); });
    renderer.domElement.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    W.hoverTick = function () { if (hoverQ) { setHover(pickAt(hoverQ)); hoverQ = null; } };

    var ro = new ResizeObserver(resize); ro.observe(host); W.ro = ro;
    resize();
    built = true;
    sync(true);
    var sel = S() && S().selected;
    if (sel && W.d[sel]) { ctl.target.set(W.d[sel].info.cx * .5, 0, W.d[sel].info.cz * .5); }
    ctl.update();
  }

  function setHover(id) {
    if (W.hover === id) return;
    if (W.hover && W.d[W.hover]) W.d[W.hover].spr.userData.hover = false;
    W.hover = id;
    if (id && W.d[id]) W.d[id].spr.userData.hover = true;
    W.renderer.domElement.style.cursor = id ? 'pointer' : '';
  }

  function applyState(rec, force) {
    var locked = isLocked(rec.id);
    if (!force && rec.locked === locked) return;
    rec.locked = locked;
    rec.mesh.material = locked ? W.lockMat : W.bMat;
    rec.ol.visible = true;
    rec.plat.material = locked ? rec.lockedPlat : rec.platMat;
    if (rec.trees) rec.trees.visible = !locked;
    if (rec.wheel) rec.wheel.visible = !locked;
    var m = rec.spr.material;
    if (locked) { m.map = rec.plate; rec.spr.userData.bs = { x: 6, y: 6 * 112 / 256 }; }
    else if (rec.art) { m.map = rec.art; var b = layout()[rec.id], aw = b.w / 10 * .44; rec.spr.userData.bs = { x: aw, y: aw * b.h / b.w }; }
    m.needsUpdate = true;
    rec.spr.visible = !!m.map;
  }

  /* ---------- hora do dia, camada e tema ---------- */
  var LOOK = {
    morning:   { bg: '#f7e3ea', hemi: ['#fff6f0', '#d0a8ba', 1.7], sun: ['#fff1d8', 1.8, [-50, 90, 35]], night: 0, cloud: '#ffffff' },
    afternoon: { bg: '#f6d8e4', hemi: ['#fff1f6', '#c9a0b4', 1.7], sun: ['#ffe2bf', 1.9, [40, 95, 50]], night: 0, cloud: '#fff8f2' },
    night:     { bg: '#171a2e', hemi: ['#5a6aa8', '#1d1830', .55], sun: ['#9db4ff', .55, [-30, 90, -20]], night: 1, cloud: '#4a4f72' },
    cognition: { bg: '#0b130e', hemi: ['#7dff9a', '#14251a', .6], sun: ['#b6ffb0', .7, [20, 90, 30]], night: 1, cloud: '#1f3a28', win: '#96ff45' }
  };
  var lastSig = '';
  function sync(force) {
    var s = S(); if (!s || !built) return;
    var key = s.layer === 'cognition' ? 'cognition' : (s.time || 'afternoon');
    var acc = accent();
    var sig = key + '|' + acc + '|' + s.mode + '|' + s.selected + '|' + Object.keys(W.d).map(function (id) { return isLocked(id) ? 1 : 0; }).join('');
    if (!force && sig === lastSig) return;
    lastSig = sig;
    var L = LOOK[key] || LOOK.afternoon;
    W.scene.background = new THREE.Color(L.bg); W.scene.fog.color.set(L.bg);
    W.hemi.color.set(L.hemi[0]); W.hemi.groundColor.set(L.hemi[1]); W.hemi.intensity = L.hemi[2];
    W.sun.color.set(L.sun[0]); W.sun.intensity = L.sun[1]; W.sun.position.set(L.sun[2][0], L.sun[2][1], L.sun[2][2]);
    W.bMat.userData.u.uNight.value = L.night;
    W.bMat.userData.u.uWin.value.set(L.win || '#ffd27a');
    W.cloudMat.color.set(L.cloud); W.cloudMat.opacity = L.night ? .55 : .92;
    W.ground.material.color.set(key === 'cognition' ? '#2c4a35' : (L.night ? '#7c6c8a' : '#ffffff'));
    W.ringMat.color.set(key === 'cognition' ? '#96ff45' : acc);
    W.gemMat.color.set(key === 'cognition' ? '#96ff45' : acc); W.gemMat.emissive.set(key === 'cognition' ? '#96ff45' : acc);
    Object.keys(W.d).forEach(function (id) { applyState(W.d[id]); });
    placeMarker();
  }
  function placeMarker() {
    var s = S(), rec = s && W.d[s.selected];
    W.ring.visible = W.gem.visible = !!rec;
    if (!rec) return;
    W.ring.position.set(rec.info.cx, .42, rec.info.cz);
    W.ring.userData.sx = rec.info.rx / .78 * 1.08; W.ring.userData.sz = rec.info.rz / .78 * 1.08;
    W.gem.userData.base = rec.info.top + 2.6;
    W.gem.position.set(rec.info.cx, W.gem.userData.base, rec.info.cz);
  }

  /* ---------- câmera ---------- */
  var fly = null;
  function flyTo(id, dist) {
    var rec = W.d[id]; if (!rec) return;
    var to = new THREE.Vector3(rec.info.cx, 0, rec.info.cz);
    var off = W.cam.position.clone().sub(W.ctl.target);
    var len = dist || Math.min(off.length(), 70); off.setLength(len);
    fly = { t: 0, ft: W.ctl.target.clone(), tt: to, fp: W.cam.position.clone(), tp: to.clone().add(off) };
    if (reduceMotion) fly.t = 1;
  }
  function home() {
    fly = { t: reduceMotion ? 1 : 0, ft: W.ctl.target.clone(), tt: new THREE.Vector3(0, 0, 0), fp: W.cam.position.clone(), tp: new THREE.Vector3(0, 100, 108) };
  }
  function zoomBy(f) {
    var off = W.cam.position.clone().sub(W.ctl.target);
    off.setLength(Math.max(W.ctl.minDistance, Math.min(W.ctl.maxDistance, off.length() / f)));
    fly = { t: reduceMotion ? 1 : 0, ft: W.ctl.target.clone(), tt: W.ctl.target.clone(), fp: W.cam.position.clone(), tp: W.ctl.target.clone().add(off) };
  }
  function zoomLabel() {
    var out = document.getElementById('atlasTokyoZoom'); if (!out || !on || !W.cam) return;
    var d = W.cam.position.distanceTo(W.ctl.target);
    out.textContent = Math.round(147 / d * 100) + '%';
  }

  function resize() {
    if (!W.renderer) return;
    var r = W.host.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    W.renderer.setSize(w, h, false);
    W.cam.aspect = w / h; W.cam.updateProjectionMatrix();
  }

  /* ---------- laço de animação ---------- */
  var last = 0, frame = 0;
  function tick(now) {
    raf = 0;
    if (!visible()) return;
    var dt = Math.min(.05, (now - (last || now)) / 1000); last = now; frame++;
    var t = now / 1000;
    if (frame % 20 === 0) sync();
    if (fly) {
      fly.t = Math.min(1, fly.t + dt / .9);
      var e = fly.t < .5 ? 4 * fly.t * fly.t * fly.t : 1 - Math.pow(-2 * fly.t + 2, 3) / 2;
      W.ctl.target.lerpVectors(fly.ft, fly.tt, e); W.cam.position.lerpVectors(fly.fp, fly.tp, e);
      if (fly.t >= 1) fly = null;
      zoomLabel();
    }
    W.ctl.update();
    W.hoverTick();
    if (!reduceMotion) {
      W.waterTex.offset.set(t * .01, t * .006);
      W.riverTex.offset.x = -t * .12;
      W.clouds.forEach(function (c) { c.position.x += c.userData.v * dt; if (c.position.x > 130) c.position.x = -130; });
      var m = W.tmp;
      W.cars.forEach(function (c, i) {
        c.d += c.v * dt * c.lane; if (c.d > c.tr.len) c.d -= c.tr.len; if (c.d < 0) c.d += c.tr.len;
        var q = along(c.tr, c.d);
        m.position.set(q.x - q.dz * .55 * c.lane, .12, q.z + q.dx * .55 * c.lane);
        m.rotation.set(0, Math.atan2(-q.dz, q.dx), 0); m.updateMatrix();
        W.carMesh.setMatrixAt(i, m.matrix);
      });
      W.carMesh.instanceMatrix.needsUpdate = true;
      W.trains.forEach(function (tr) {
        tr.t += dt * 6 / Math.max(10, tr.tr.len);
        var ph = tr.t % 2, u = ph < 1 ? ph : 2 - ph; u = u * u * (3 - 2 * u);
        var q = along(tr.tr, u * tr.tr.len);
        tr.g.position.set(q.x, 2.45, q.z); tr.g.rotation.y = Math.atan2(-q.dz, q.dx);
      });
      Object.keys(W.d).forEach(function (id) { var r = W.d[id]; if (r.wheel) r.wheel.rotation.z = t * .15; });
    }
    var pulse = .5 + .5 * Math.sin(t * 3);
    if (W.ring.visible) { var k = 1 + pulse * .06; W.ring.scale.set(W.ring.userData.sx * k, W.ring.userData.sz * k, 1); W.ringMat.opacity = .55 + pulse * .4; W.gem.position.y = W.gem.userData.base + Math.sin(t * 2) * .5; W.gem.rotation.y = t * 1.2; }
    Object.keys(W.d).forEach(function (id) {
      var sp = W.d[id].spr, bs = sp.userData.bs; if (!bs) return;
      var want = sp.userData.hover ? 1.12 : 1, k = sp.userData.k = (sp.userData.k || 1) + (want - (sp.userData.k || 1)) * .25;
      sp.scale.set(bs.x * k, bs.y * k, 1);
    });
    W.renderer.render(W.scene, W.cam);
    schedule();
  }
  function schedule() { if (!raf && on && built) raf = requestAnimationFrame(tick); }

  function visible() {
    var s = S(), page = document.getElementById('mapPage');
    return on && built && !document.hidden && page && page.classList.contains('active') && (!s || s.mapMode !== 'local');
  }

  /* ---------- liga/desliga ---------- */
  var host = null, btn = null;
  function ensureHost() {
    if (host) return host;
    var vp = document.getElementById('atlasTokyoViewport'); if (!vp) return null;
    host = document.createElement('div'); host.id = 'map3d'; host.className = 'map3d'; host.setAttribute('aria-label', 'Mapa de Tokyo em 3D');
    host.innerHTML = '<div class="map3d-load">CARREGANDO TOKYO 3D…</div><div class="map3d-help">ARRASTE PARA MOVER · BOTÃO DIREITO (OU 2 DEDOS) PARA GIRAR · RODA PARA APROXIMAR</div>';
    vp.parentNode.insertBefore(host, vp.nextSibling);
    return host;
  }
  function setOn(v) {
    if (failed) v = false;
    on = !!v; pref(on);
    applyBody();
    if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? '2D' : '3D'; btn.title = on ? 'Voltar ao mapa 2D' : 'Ver Tokyo em 3D'; }
    if (!on) { var out = document.getElementById('atlasTokyoZoom'); if (window.atlasTokyoCamera && out) { try { window.atlasTokyoCamera.zoomBy(1); } catch (e) {} } return; }
    var h = ensureHost(); if (!h) return;
    if (built) { sync(true); resize(); schedule(); return; }
    h.classList.add('is-loading');
    load().then(function () {
      if (!built) build(h);
      h.classList.remove('is-loading');
      zoomLabel(); schedule();
    }).catch(function (err) {
      failed = true; h.classList.remove('is-loading');
      console.warn('[map-3d]', err);
      setOn(false);
      if (typeof window.toast === 'function') window.toast('O mapa 3D não abriu neste navegador. Voltando ao 2D.');
    });
  }

  function applyBody() {
    var s = S();
    document.body.classList.toggle('map3d-on', on && !(s && s.mapMode === 'local'));
  }

  function init() {
    var ctl = document.querySelector('#mapPage .map-controls');
    if (!ctl || !window.WebGLRenderingContext) return;
    btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'map3dToggle'; btn.className = 'map3d-toggle'; btn.textContent = '3D';
    btn.setAttribute('aria-pressed', 'false'); btn.title = 'Ver Tokyo em 3D';
    ctl.insertBefore(btn, ctl.firstChild);
    btn.addEventListener('click', function () { setOn(!on); });
    /* com o 3D ligado, −, + e Ajustar mexem na câmera 3D */
    ctl.addEventListener('click', function (e) {
      if (!on || !built) return;
      var b = e.target.closest('button'); if (!b || b === btn) return;
      if (b.id === 'zoomIn') zoomBy(1.3); else if (b.id === 'zoomOut') zoomBy(1 / 1.3); else if (b.id === 'resetView') home(); else return;
      e.stopPropagation(); e.preventDefault(); schedule();
    }, true);
    /* selecionar pela lista/busca também voa até o distrito */
    var origSel = window.selectDistrict;
    if (typeof origSel === 'function') window.selectDistrict = function (id) {
      var r = origSel.apply(this, arguments);
      if (on && built) { sync(true); if (!isLocked(id)) flyTo(id); }
      return r;
    };
    var origRender = window.renderDistricts;
    if (typeof origRender === 'function') window.renderDistricts = function () { var r = origRender.apply(this, arguments); if (on && built) sync(true); return r; };
    document.addEventListener('visibilitychange', schedule);
    setInterval(function () { if (on) applyBody(); if (on && built && !raf && visible()) { resize(); schedule(); } }, 400);
    if (pref()) setOn(true);
  }

  window.PhobiaMap3D = { set: setOn, get on() { return on; }, flyTo: function (id) { if (built) flyTo(id); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

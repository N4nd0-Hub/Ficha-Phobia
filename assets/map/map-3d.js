/* ==========================================================
   PERSONA // PHOBIA — map-3d.js
   Modo 3D do mapa de Tokyo (seletor 2D/3D ao lado de
   Realidade/Cognição).

   • Three.js (assets/vendor/three) e as peças da cidade
     (map-3d-kit.js) só são baixados quando o 3D é ligado.
   • Usa os mesmos dados do 2D: DISTRICT_ART_LAYOUT, as rotas do
     PhobiaMapRoads, o estado dos distritos, a hora do dia e a
     camada Realidade/Cognição.
   • Clicar num distrito chama selectDistrict(id), igual ao 2D.
   • 1 unidade 3D = 10 px do mapa 2D, centro em (640,350).
   ========================================================== */
(function () {
  'use strict';

  var PREF_KEY = 'phobiaMap3d';
  var NS = 'http://www.w3.org/2000/svg';
  var base = (function () { var s = document.currentScript; return s ? s.src : location.href; })();
  var VENDOR = new URL('../vendor/three/', base).href;
  var KIT = new URL('map-3d-kit.js?v=6', base).href;
  var NAMES = new URL('../map-names/', base).href;
  var NAME_IMG = ['shibuya', 'ikebukuro', 'shinjuku', 'ginza', 'roppongi', 'akihabara', 'odaiba', 'kichijoji', 'nakano', 'meguro', 'harajuku'];

  var THREE = null, Orbit = null, K = null, loading = null;
  var on = false, built = false, failed = false, busy = false;
  var W = {};
  var raf = 0;
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilidades ---------- */
  function S() { try { return window.state || state; } catch (e) { return null; } }
  function layout() { try { return DISTRICT_ART_LAYOUT; } catch (e) { return null; } }
  function badgeImages() { try { return DISTRICT_BADGE_IMAGES; } catch (e) { return {}; } }
  function wx(x) { return (x - 640) / 10; }
  function wz(y) { return (y - 350) / 10; }
  function pref(v) { try { if (v === undefined) return localStorage.getItem(PREF_KEY) === '1'; localStorage.setItem(PREF_KEY, v ? '1' : '0'); } catch (e) { return false; } }
  function accent() {
    var v = '';
    try { v = getComputedStyle(document.body).getPropertyValue('--theme-accent').trim(); } catch (e) {}
    return /^#|^rgb/.test(v) ? v : '#ef2b97';
  }
  function isLocked(id) { var s = S(), d = s && s.districts && s.districts[id]; return !!(s && s.mode === 'player' && d && d.state === 'locked'); }
  function frame() { return new Promise(function (res) { requestAnimationFrame(function () { res(); }); }); }
  function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  /* amostra um path SVG em pontos do mundo 3D */
  var probe = null;
  function sample(d, step) {
    if (!probe) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden');
      probe = document.createElementNS(NS, 'path'); svg.appendChild(probe); document.body.appendChild(svg);
    }
    probe.setAttribute('d', d);
    var L = probe.getTotalLength(), n = Math.max(2, Math.ceil(L / step)), out = [];
    for (var i = 0; i <= n; i++) { var p = probe.getPointAtLength(L * i / n); out.push({ x: wx(p.x), z: wz(p.y), px: p.x, py: p.y }); }
    return out;
  }

  /* baía (coordenadas do mapa 2D) */
  var BAY = [[1000, 900], [1015, 740], [1030, 690], [1035, 640], [1060, 530], [1110, 505], [1180, 495], [1250, 470], [1330, 440], [1500, 420], [3300, 400], [3300, 3000], [1000, 3000]];
  function inBay(px, py) {
    var inside = false;
    for (var i = 0, j = BAY.length - 1; i < BAY.length; j = i++) {
      var xi = BAY[i][0], yi = BAY[i][1], xj = BAY[j][0], yj = BAY[j][1];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  var RIVERS = ['M 1340 -900 C 1318 -300 1290 0 1268 150 S 1236 380 1196 560',
    'M -1400 270 C -600 250 -100 300 260 255 S 560 280 640 300 S 900 330 1010 312 S 1170 300 1252 262'];
  var PARKS = [[255, 470, 64, 40, -12], [950, 110, 70, 36, 8], [905, 330, 48, 34, 0], [-260, 520, 140, 70, 10], [640, -40, 110, 50, -6], [260, 880, 120, 60, -8], [1480, 120, 70, 40, -14], [-620, 300, 90, 52, 18], [-380, 980, 80, 46, 4]];

  /* ---------- carregamento ---------- */
  function load() {
    if (loading) return loading;
    loading = Promise.all([import(VENDOR + 'three.module.min.js'), import(VENDOR + 'OrbitControls.js'), import(KIT)])
      .then(function (m) { THREE = m[0]; Orbit = m[1].OrbitControls; K = m[2]; K.setThree(THREE); });
    return loading;
  }

  /* ---------- texturas ---------- */
  function canvasTex(w, h, draw, repeat) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    return t;
  }
  function groundTex() {
    return canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = '#efc8d6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f5d9e4';
      [[10, 10, 102, 70], [126, 10, 120, 70], [10, 94, 236, 46], [10, 154, 70, 92], [94, 154, 152, 92]].forEach(function (r) { g.fillRect(r[0], r[1], r[2], r[3]); });
      g.fillStyle = 'rgba(160,70,110,.10)';
      for (var y = 6; y < h; y += 14) for (var x = (y / 14 % 2) * 7; x < w; x += 14) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
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
      for (var i = 0; i < 6; i++) g.fillRect((i * 47) % w, 12 + (i * 17) % (h - 24), 26, 3);
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

  /* ---------- fita ao longo de um caminho ---------- */
  function ribbon(pts, width, y, uLen) {
    var pos = [], uv = [], nor = [], idx = [], s = 0;
    for (var i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      var nx = -tz * width / 2, nz = tx * width / 2, yy = typeof y === 'function' ? y(i, pts.length) : y;
      if (i > 0) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      pos.push(pts[i].x + nx, yy, pts[i].z + nz, pts[i].x - nx, yy, pts[i].z - nz);
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
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / seg, dz: (b.z - a.z) / seg, y: (a.y || 0) + ((b.y || 0) - (a.y || 0)) * t };
  }
  function runs(pts, test) {
    var out = [], cur = [];
    pts.forEach(function (p) { if (test(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } });
    if (cur.length > 1) out.push(cur);
    return out;
  }

  /* ---------- materiais ---------- */
  function buildingMaterial() {
    var m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.userData.u = { uNight: { value: 0 }, uWin: { value: new THREE.Color('#ffd27a') } };
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uNight = m.userData.u.uNight; sh.uniforms.uWin = m.userData.u.uWin;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
        .replace('#include <project_vertex>', [
          '#include <project_vertex>',
          'vec4 wp4 = vec4(transformed, 1.0); vec3 wn = objectNormal;',
          '#ifdef USE_INSTANCING',
          '  wp4 = instanceMatrix * wp4; wn = mat3(instanceMatrix) * wn;',
          '#endif',
          'vWP = (modelMatrix * wp4).xyz; vWN = normalize(mat3(modelMatrix) * wn);'
        ].join('\n'));
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform float uNight; uniform vec3 uWin;')
        .replace('#include <emissivemap_fragment>', [
          '#include <emissivemap_fragment>',
          'if (abs(vWN.y) < 0.5 && vWP.y > 0.62) {',
          '  vec2 gp = vec2(abs(vWN.x) > 0.5 ? vWP.z : vWP.x, vWP.y) * vec2(2.2, 1.9);',
          '  vec2 f = fract(gp);',
          '  float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.3, f.y) * step(f.y, 0.78);',
          '  float lit = step(0.45, fract(sin(dot(floor(gp), vec2(12.9898, 78.233))) * 43758.5453));',
          '  diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.6, 0.76, 0.88), diffuseColor.rgb * 0.3, uNight), win * 0.62);',
          '  totalEmissiveRadiance += win * lit * uNight * uWin * 1.1;',
          '}'
        ].join('\n'));
    };
    return m;
  }
  function outlineMaterial(px) {
    var m = new THREE.MeshBasicMaterial({ color: 0x151216, side: THREE.BackSide });
    m.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * ' + px.toFixed(3) + ';');
    };
    return m;
  }

  /* ==========================================================
     MONTAGEM DA CENA (em etapas, para a barra de progresso andar)
     ========================================================== */
  async function build(host, progress) {
    var LAY = layout(); if (!LAY) throw new Error('layout');
    var acc = accent();
    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'map3d-canvas';
    host.appendChild(renderer.domElement);
    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf6d8e4, 100, 250);
    var cam = new THREE.PerspectiveCamera(34, 1, .5, 3200);
    cam.position.set(0, 100, 108);
    var ctl = new Orbit(cam, renderer.domElement);
    ctl.enableDamping = true; ctl.dampingFactor = .09;
    ctl.screenSpacePanning = false;
    ctl.minDistance = 14; ctl.maxDistance = 200;
    ctl.minPolarAngle = .15; ctl.maxPolarAngle = 1.28;
    ctl.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    ctl.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    ctl.addEventListener('change', function () {
      ctl.target.x = Math.max(-75, Math.min(75, ctl.target.x)); ctl.target.z = Math.max(-50, Math.min(50, ctl.target.z)); ctl.target.y = 0;
      zoomLabel();
    });
    W.renderer = renderer; W.scene = scene; W.cam = cam; W.ctl = ctl; W.host = host; W.acc = acc;

    /* céu, sol/lua, estrelas, Fuji */
    var sky = K.sky(); scene.add(sky.mesh); W.sky = sky;
    var st = K.stars(); scene.add(st); W.stars = st;
    var orb = K.orb(); scene.add(orb); W.orb = orb;
    var fj = K.fuji(); scene.add(fj.g); W.fuji = fj;

    /* luzes */
    var hemi = new THREE.HemisphereLight(0xfff3f7, 0xb98aa0, 1.6); scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 64; sc.bottom = -64; sc.near = 10; sc.far = 300;
    sun.shadow.bias = -.0006; sun.shadow.normalBias = .04;
    scene.add(sun); scene.add(sun.target);
    W.hemi = hemi; W.sun = sun;
    progress(.12, 'TERRENO E ÁGUA');
    await frame();

    /* chão */
    var gt = groundTex(); gt.repeat.set(260, 260);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ map: gt }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); W.ground = ground;

    /* baía */
    var shape = new THREE.Shape();
    BAY.forEach(function (p, i) { var x = wx(p[0]), y = -wz(p[1]); if (i) shape.lineTo(x, y); else shape.moveTo(x, y); });
    var wt = waterTex(); wt.repeat.set(.12, .12);
    var water = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ map: wt, side: THREE.DoubleSide }));
    water.rotation.x = -Math.PI / 2; water.position.y = .04; water.receiveShadow = true; scene.add(water);
    var shore = BAY.slice(0, 11).map(function (p) { return { x: wx(p[0]), z: wz(p[1]) }; });
    scene.add(new THREE.Mesh(ribbon(shore, .9, .07, 10), new THREE.MeshBasicMaterial({ color: 0x151216, side: THREE.DoubleSide })));
    W.waterTex = wt;

    /* rios */
    var rt = riverTex(); W.riverTex = rt;
    var riverPts = [];
    RIVERS.forEach(function (d) {
      var pts = sample(d, 14); riverPts.push(pts);
      scene.add(new THREE.Mesh(ribbon(pts, 4.4, .05, 12), new THREE.MeshBasicMaterial({ color: 0x151216 })));
      var rv = new THREE.Mesh(ribbon(pts, 3.5, .08, 12), new THREE.MeshLambertMaterial({ map: rt }));
      rv.receiveShadow = true; scene.add(rv);
    });

    /* parques */
    var parkMat = new THREE.MeshLambertMaterial({ color: 0x83c56c });
    var parkTrees = [], pr = K.rng(77);
    PARKS.forEach(function (p) {
      var m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), parkMat);
      m.rotation.x = -Math.PI / 2; m.rotation.z = -p[4] * Math.PI / 180; m.scale.set(p[2] / 10, p[3] / 10, 1);
      m.position.set(wx(p[0]), .1, wz(p[1])); m.receiveShadow = true; scene.add(m);
      var rim = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x151216 }));
      rim.rotation.copy(m.rotation); rim.scale.set(p[2] / 10 + .4, p[3] / 10 + .4, 1); rim.position.set(m.position.x, .08, m.position.z); scene.add(rim);
      var n = Math.round(p[2] * p[3] / 220), ca = Math.cos(-p[4] * Math.PI / 180), sa = Math.sin(-p[4] * Math.PI / 180);
      for (var i = 0; i < n; i++) {
        var a = pr() * Math.PI * 2, rr = Math.sqrt(pr()) * .82;
        var lx = Math.cos(a) * rr * p[2] / 10, lz = Math.sin(a) * rr * p[3] / 10;
        var x = wx(p[0]) + lx * ca - lz * sa, z = wz(p[1]) + lx * sa + lz * ca, hh = .7 + pr() * .5;
        parkTrees.push({ g: K.cyl(.07, .1, .5, 5, x, .1, z), c: '#6b4a35' });
        parkTrees.push({ g: K.sphere(.55 + pr() * .4, x, .1 + .5 + hh * .5, z, 0), c: pr() < .18 ? '#f5a8c8' : (pr() < .5 ? '#4e9a45' : '#5fae52') });
      }
    });
    var treeMesh = new THREE.Mesh(K.merge(parkTrees), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    treeMesh.castShadow = true; scene.add(treeMesh);
    progress(.25, 'PISTAS, METRÔ E PONTES');
    await frame();

    /* pistas (com a Rainbow Bridge onde a pista atravessa a baía) e metrô */
    var routes = window.PhobiaMapRoads ? window.PhobiaMapRoads.build(LAY) : [];
    var rdt = roadTex(acc); W.roadTex = rdt;
    var roadMat = new THREE.MeshLambertMaterial({ map: rdt, side: THREE.DoubleSide });
    W.cars = []; W.trains = []; W.lampPts = [];
    var insideDistrict = function (p, ids, k) {
      return ids.some(function (id) { var b = LAY[id]; if (!b) return false; var dx = (p.x - wx(b.cx)) / (b.w / 20 * (k || .95)), dz = (p.z - wz(b.cy)) / (b.h / 20 * (k || .95)); return dx * dx + dz * dz < 1; });
    };
    var roadCells = {};
    function markCell(x, z, r) { for (var i = Math.floor((x - r) / 2); i <= Math.floor((x + r) / 2); i++) for (var j = Math.floor((z - r) / 2); j <= Math.floor((z + r) / 2); j++) roadCells[i + ',' + j] = 1; }
    routes.forEach(function (r) {
      var pts = sample(r.d, 3);
      pts.forEach(function (p) { markCell(p.x, p.z, r.type === 'metro' ? 1.4 : 2.2); });
      if (r.type !== 'metro') {
        /* trechos sobre a água viram ponte elevada */
        var wet = pts.map(function (p) { return inBay(p.px, p.py); });
        var deck = pts.map(function (p, i) {
          var d = 0; for (var k = -6; k <= 6; k++) { var q = wet[Math.max(0, Math.min(wet.length - 1, i + k))]; if (q) d = Math.max(d, 1 - Math.abs(k) / 7); }
          return { x: p.x, z: p.z, y: .12 + d * 1.6, wet: wet[i] };
        });
        var rm = new THREE.Mesh(ribbon(deck, 2.6, function (i) { return deck[i].y; }, 5), roadMat); rm.receiveShadow = true; rm.castShadow = true; scene.add(rm);
        bridges(scene, deck);
        var tr = track(deck);
        for (var c = 0; c < 6; c++) W.cars.push({ tr: tr, d: tr.len * c / 6 + Math.random() * 4, v: 4 + Math.random() * 3, lane: c % 2 ? 1 : -1 });
        for (var dd = 2; dd < tr.len; dd += 6) { var q = along(tr, dd); W.lampPts.push(q.x - q.dz * 1.5, q.y + .9, q.z + q.dx * 1.5, q.x + q.dz * 1.5, q.y + .9, q.z - q.dx * 1.5); }
      } else {
        var col = new THREE.Color(r.color), lineMat = new THREE.MeshLambertMaterial({ color: col });
        runs(pts, function (p) { return !insideDistrict(p, r.ids); }).forEach(function (run) {
          scene.add(new THREE.Mesh(ribbon(run, 1.5, 1.95, 4), new THREE.MeshBasicMaterial({ color: 0x151216, side: THREE.DoubleSide })));
          var lm = new THREE.Mesh(ribbon(run, 1.1, 2.0, 4), lineMat); lm.castShadow = true; scene.add(lm);
          var trk = track(run);
          for (var d = 1.5; d < trk.len; d += 5) {
            var q2 = along(trk, d), pil = new THREE.Mesh(W.pillarGeo || (W.pillarGeo = new THREE.CylinderGeometry(.16, .2, 2, 6)), W.pillarMat || (W.pillarMat = new THREE.MeshLambertMaterial({ color: 0x3a3440 })));
            pil.position.set(q2.x, 1, q2.z); pil.castShadow = true; scene.add(pil);
          }
          [run[0], run[run.length - 1]].forEach(function (p) {
            var stn = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .5, 16), new THREE.MeshLambertMaterial({ color: 0xffffff }));
            stn.position.set(p.x, 2.15, p.z); scene.add(stn);
            var ring = new THREE.Mesh(new THREE.TorusGeometry(.75, .13, 6, 18), lineMat); ring.rotation.x = Math.PI / 2; ring.position.set(p.x, 2.42, p.z); scene.add(ring);
          });
          var train = new THREE.Group();
          for (var cI = 0; cI < 3; cI++) {
            var body = new THREE.Mesh(new THREE.BoxGeometry(1.15, .62, .74), new THREE.MeshLambertMaterial({ color: 0xf2f2ee }));
            var stripe = new THREE.Mesh(new THREE.BoxGeometry(1.16, .14, .76), new THREE.MeshBasicMaterial({ color: col }));
            var win = new THREE.Mesh(new THREE.BoxGeometry(.9, .16, .76), new THREE.MeshBasicMaterial({ color: 0x2b3440 }));
            body.position.x = stripe.position.x = win.position.x = (cI - 1) * 1.22; stripe.position.y = -.1; win.position.y = .12;
            body.castShadow = true; train.add(body, stripe, win);
          }
          scene.add(train);
          W.trains.push({ g: train, tr: trk, t: Math.random() });
        });
      }
    });
    /* carros */
    var carGeo = new THREE.BoxGeometry(.9, .42, .5); carGeo.translate(0, .42, 0);
    var carMesh = new THREE.InstancedMesh(carGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), W.cars.length);
    var carCols = ['#ffffff', '#ffd21f', '#58d9ff', '#ef2b97', '#2d2833', '#e8402f', '#2f6fd6'];
    W.cars.forEach(function (c, i) { carMesh.setColorAt(i, new THREE.Color(carCols[i % carCols.length])); });
    carMesh.castShadow = true; scene.add(carMesh); W.carMesh = carMesh; W.tmp = new THREE.Object3D();
    /* postes acesos à noite */
    var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(W.lampPts, 3));
    W.lamps = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffd58a, size: .55, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(W.lamps);
    progress(.4, 'DISTRITOS');
    await frame();

    /* distritos */
    W.bMat = buildingMaterial();
    W.pMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    W.gMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    W.gNightMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, toneMapped: false });
    W.gBlinkMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    W.gScreenMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    W.wMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    W.lockMat = new THREE.MeshLambertMaterial({ color: 0x433d4b });
    W.lockGlow = new THREE.MeshBasicMaterial({ color: 0x2b2731 });
    W.olMat = outlineMaterial(.05);
    W.d = {}; W.pick = [];
    var platGeo = new THREE.CylinderGeometry(1, 1, .35, 56); platGeo.translate(0, .175, 0);
    var lockPlat = new THREE.MeshLambertMaterial({ color: 0x9a8f9e });
    var tl = new THREE.TextureLoader(), imgs = badgeImages(), plateTex = lockedPlate();
    var ids = Object.keys(LAY);
    for (var di = 0; di < ids.length; di++) {
      var id = ids[di], b = LAY[id], info = K.buildDistrict(id, b, acc, wx, wz), g = new THREE.Group();
      var platMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(info.platColor || '#fbf3e2') });
      var R = { x: info.rx / .8 * 1.02, z: info.rz / .8 * 1.02 };
      var plat = new THREE.Mesh(platGeo, platMat); plat.scale.set(R.x, 1, R.z); plat.position.set(info.cx, 0, info.cz); plat.receiveShadow = true;
      var platOl = new THREE.Mesh(platGeo, W.olMat); platOl.scale.copy(plat.scale); platOl.position.copy(plat.position);
      g.add(plat, platOl);
      var rec = { id: id, g: g, info: info, plat: plat, platMat: platMat, lockPlat: lockPlat, parts: [], glows: [] };
      var part = function (geo, mat, ol, cast) {
        if (!geo) return null;
        var m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; m.receiveShadow = true; g.add(m);
        if (ol) g.add(new THREE.Mesh(geo, W.olMat));
        return { m: m, mat: mat };
      };
      rec.parts = [part(info.ground, W.pMat, false, false), part(info.water, W.wMat, false, false), part(info.body, W.bMat, true, true), part(info.plain, W.pMat, true, true)].filter(Boolean);
      rec.glows = [part(info.glow, W.gMat), part(info.glowNight, W.gNightMat), part(info.glowBlink, W.gBlinkMat), part(info.glowScreen, W.gScreenMat)].filter(Boolean);
      if (info.wheelAt) rec.wheel = ferris(g, info.wheelAt, acc);
      /* placa */
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true, sizeAttenuation: false }));
      spr.renderOrder = 10; spr.userData.id = id;
      spr.position.set(info.cx, Math.min(info.top, 12) + 4.5, info.cz + info.rz * .25);
      g.add(spr);
      var hit = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, Math.max(6, info.top), 16), new THREE.MeshBasicMaterial({ visible: false }));
      hit.scale.set(R.x, 1, R.z); hit.position.set(info.cx, Math.max(6, info.top) / 2, info.cz); hit.userData.id = id;
      g.add(hit);
      W.pick.push(hit, spr);
      scene.add(g);
      rec.spr = spr; rec.plate = plateTex;
      W.d[id] = rec;
      (function (rc) {
        /* nome do distrito em letreiro (assets/map-names); sem ele, usa a ilustração do 2D */
        var useBadge = function () { if (imgs[rc.id]) tl.load(imgs[rc.id], function (t) { t.colorSpace = THREE.SRGBColorSpace; rc.art = t; rc.artName = false; applyState(rc, true); }); };
        if (NAME_IMG.indexOf(rc.id) < 0) return useBadge();
        tl.load(NAMES + rc.id + '.webp?v=1', function (t) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; rc.art = t; rc.artName = true; applyState(rc, true); }, undefined, useBadge);
      })(rec);
      var nm = (!isLocked(id) && S() && S().districts && S().districts[id]) ? String(S().districts[id].name).toUpperCase() : '???';
      progress(.4 + .4 * (di + 1) / ids.length, 'DISTRITOS · ' + nm);
      await frame();
    }

    /* cidade ao redor */
    progress(.85, 'ARREDORES');
    await frame();
    cityFiller(scene, LAY, roadCells, riverPts);

    /* marcador do selecionado */
    var ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(acc), transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false });
    var ring = new THREE.Mesh(new THREE.RingGeometry(.93, 1.05, 72), ringMat); ring.rotation.x = -Math.PI / 2;
    var gem = new THREE.Group();
    var gm = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: new THREE.Color(acc), emissive: new THREE.Color(acc), emissiveIntensity: .35 }));
    gm.scale.y = 1.5; gem.add(gm);
    var gmo = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), outlineMaterial(.12)); gmo.scale.y = 1.5; gem.add(gmo);
    scene.add(ring); scene.add(gem);
    W.ring = ring; W.gem = gem; W.ringMat = ringMat; W.gemMat = gm.material;

    /* nuvens */
    W.clouds = [];
    var cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .92 });
    var cr = K.rng(5);
    for (var k = 0; k < 9; k++) {
      var cg = new THREE.Group();
      for (var p = 0; p < 5; p++) { var bl = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + cr() * 1.8, 1), cloudMat); bl.position.set(p * 2.4 - 5, cr() * .9, (cr() - .5) * 2.4); bl.scale.y = .55; bl.castShadow = true; cg.add(bl); }
      cg.position.set(-150 + k * 34 + cr() * 10, 30 + cr() * 8, -60 + cr() * 110);
      cg.userData.v = 1 + cr() * 1.3;
      scene.add(cg); W.clouds.push(cg);
    }
    W.cloudMat = cloudMat;

    /* barcos no rio e na baía */
    W.boats = [];
    var boatMat = new THREE.MeshLambertMaterial({ color: 0xffffff }), roofMat = new THREE.MeshLambertMaterial({ color: 0xc8322b });
    riverPts.forEach(function (pts, ri) {
      var trk = track(pts.filter(function (p) { return Math.abs(p.x) < 160 && Math.abs(p.z) < 120; }));
      for (var bI = 0; bI < 3; bI++) {
        var boat = new THREE.Group(), hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, .3, .6), boatMat), cab = new THREE.Mesh(new THREE.BoxGeometry(.9, .32, .5), roofMat);
        hull.position.y = .2; cab.position.y = .5; boat.add(hull, cab); hull.castShadow = true;
        scene.add(boat); W.boats.push({ g: boat, tr: trk, d: trk.len * (bI + .3 * ri) / 3, v: (bI % 2 ? 1 : -1) * (1.2 + bI * .3) });
      }
    });
    W.bayBoats = [];
    for (var q3 = 0; q3 < 5; q3++) {
      var bb = new THREE.Group(), h2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, .35, .8), boatMat), c2 = new THREE.Mesh(new THREE.BoxGeometry(1, .5, .6), new THREE.MeshLambertMaterial({ color: 0x2f6fd6 }));
      h2.position.y = .2; c2.position.y = .55; c2.position.x = -.3; bb.add(h2, c2); h2.castShadow = true; scene.add(bb);
      W.bayBoats.push({ g: bb, cx: 70 + q3 * 14, cz: 40 + (q3 % 2) * 14, r: 6 + q3 * 2, a: q3, v: .05 + q3 * .01 });
    }
    progress(.95, 'ACENDENDO AS LUZES');

    /* interação */
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), down = null;
    function pickAt(ev) {
      var r = renderer.domElement.getBoundingClientRect();
      ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      var hits = ray.intersectObjects(W.pick, false);
      return hits.length ? hits[0].object.userData.id : null;
    }
    renderer.domElement.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; intro = null; });
    renderer.domElement.addEventListener('pointerup', function (e) {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || e.button !== 0) { down = null; return; }
      down = null;
      var id = pickAt(e);
      if (id && typeof window.selectDistrict === 'function') { window.selectDistrict(id); flyTo(id); }
    });
    var hoverQ = null;
    renderer.domElement.addEventListener('pointermove', function (e) { if (!e.buttons) hoverQ = e; });
    renderer.domElement.addEventListener('pointerleave', function () { setHover(null); });
    renderer.domElement.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    W.hoverTick = function () { if (hoverQ) { setHover(pickAt(hoverQ)); hoverQ = null; } };

    var ro = new ResizeObserver(resize); ro.observe(host); W.ro = ro;
    resize();
    built = true;
    sync(true);
    ctl.update();
  }

  /* torres e cabos onde a pista está elevada sobre a água (Rainbow Bridge) */
  function bridges(scene, deck) {
    runs(deck, function (p) { return p.y > .5; }).forEach(function (run) {
      var trk = track(run);
      if (trk.len < 6) return;
      var white = new THREE.MeshLambertMaterial({ color: 0xf7f5ef });
      var towers = [trk.len * .3, trk.len * .7];
      towers.forEach(function (d) {
        var q = along(trk, d), ang = Math.atan2(-q.dz, q.dx);
        [-1, 1].forEach(function (s) {
          var t = new THREE.Mesh(new THREE.BoxGeometry(.35, 6.2, .35), white);
          t.position.set(q.x - q.dz * 1.5 * s, 3.1, q.z + q.dx * 1.5 * s); t.castShadow = true; scene.add(t);
        });
        var beam = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, 3.3), white); beam.position.set(q.x, 5.6, q.z); beam.rotation.y = ang; scene.add(beam);
      });
      [-1, 1].forEach(function (s) {
        var pts = [];
        for (var i = 0; i <= 30; i++) {
          var d = trk.len * i / 30, q = along(trk, d), t1 = towers[0], t2 = towers[1], y;
          if (d < t1) y = q.y + .2 + (6.1 - q.y - .2) * (d / t1);
          else if (d > t2) y = q.y + .2 + (6.1 - q.y - .2) * ((trk.len - d) / (trk.len - t2));
          else { var u = (d - t1) / (t2 - t1); y = 6.1 - 4 * u * (1 - u) * 4.2; }
          pts.push(new THREE.Vector3(q.x - q.dz * 1.5 * s, y, q.z + q.dx * 1.5 * s));
        }
        scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .06, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })));
      });
    });
  }

  /* roda-gigante da Palette Town */
  function ferris(g, at, acc) {
    var wheel = new THREE.Group();
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(4, .16, 6, 48), new THREE.MeshLambertMaterial({ color: 0xffffff })));
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(3.7, .06, 4, 48), new THREE.MeshLambertMaterial({ color: 0xd9d2c6 })));
    var lights = [];
    for (var s = 0; s < 16; s++) {
      var a = s / 16 * Math.PI * 2;
      var sp = new THREE.Mesh(new THREE.BoxGeometry(.06, 4, .06), new THREE.MeshLambertMaterial({ color: 0xd9d2c6 })); sp.rotation.z = a; sp.position.set(-Math.sin(a) * 2, Math.cos(a) * 2, 0); wheel.add(sp);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(.42, .42, .42), new THREE.MeshLambertMaterial({ color: new THREE.Color(s % 4 === 0 ? acc : (s % 2 ? '#58d9ff' : '#ffd21f')) }));
      cab.position.set(Math.cos(a) * 4, Math.sin(a) * 4, 0); wheel.add(cab);
      var bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); bulb.position.set(Math.cos(a + .2) * 4.15, Math.sin(a + .2) * 4.15, 0); wheel.add(bulb); lights.push(bulb.material);
    }
    wheel.position.y = 4.9; wheel.traverse(function (o) { o.castShadow = true; });
    var pivot = new THREE.Group(); pivot.position.set(at.x, .35, at.z); pivot.rotation.y = .6;
    var legMat = new THREE.MeshLambertMaterial({ color: 0xcfc6ba });
    [-1, 1].forEach(function (sg) { [-1, 1].forEach(function (zz) { var lgm = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 5, 5), legMat); lgm.rotation.z = .22 * sg; lgm.rotation.x = .1 * zz; lgm.position.set(-.55 * sg, 2.45, .25 * zz); lgm.castShadow = true; pivot.add(lgm); }); });
    pivot.add(wheel); g.add(pivot);
    wheel.userData.lights = lights;
    return wheel;
  }

  /* quarteirões genéricos no resto da cidade */
  function cityFiller(scene, LAY, roadCells, riverPts) {
    var r = K.rng(2024), cells = [], step = 3.3;
    var near = function (x, z) {
      var best = 1e9;
      Object.keys(LAY).forEach(function (id) { var b = LAY[id], dx = (x - wx(b.cx)) / (b.w / 20), dz = (z - wz(b.cy)) / (b.h / 20); best = Math.min(best, Math.hypot(dx, dz)); });
      return best;
    };
    var riverNear = function (x, z) { return riverPts.some(function (pts) { return pts.some(function (p) { return Math.abs(p.x - x) < 3.6 && Math.abs(p.z - z) < 3.6; }); }); };
    var parkIn = function (x, z) { return PARKS.some(function (p) { var dx = (x - wx(p[0])) / (p[2] / 10 + 1.2), dz = (z - wz(p[1])) / (p[3] / 10 + 1.2); return dx * dx + dz * dz < 1.3; }); };
    var pal = ['#f3dfe6', '#eed6df', '#f6e8ec', '#e8dde2', '#ddd2d9', '#f5e9e4', '#e4d9e2'];
    for (var gx = -150; gx <= 150; gx += step) for (var gz = -110; gz <= 110; gz += step) {
      var x = gx + (r() - .5) * .8, z = gz + (r() - .5) * .8;
      var nd = near(x, z);
      if (nd < 1.25) continue;
      if (roadCells[Math.floor(x / 2) + ',' + Math.floor(z / 2)]) continue;
      if (inBay(x * 10 + 640, z * 10 + 350)) continue;
      if (parkIn(x, z) || riverNear(x, z)) continue;
      if (r() < .12) continue;
      var far = Math.hypot(x, z * 1.3);
      var h = (.3 + r() * .9) * (nd < 2.2 ? 1.6 : 1) * (r() < .05 ? 2.6 : 1) * (far > 110 ? .7 : 1);
      cells.push({ x: x, z: z, w: 1.3 + r() * 1.3, d: 1.3 + r() * 1.3, h: h, c: pal[Math.floor(r() * pal.length)] });
    }
    var geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, .5, 0);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
    var mesh = new THREE.InstancedMesh(geo, W.bMat, cells.length), o = new THREE.Object3D(), col = new THREE.Color();
    cells.forEach(function (c, i) {
      o.position.set(c.x, 0, c.z); o.scale.set(c.w, c.h, c.d); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, col.set(c.c));
    });
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh); W.filler = mesh;
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
    rec.parts.forEach(function (p) { p.m.material = locked ? W.lockMat : p.mat; });
    rec.glows.forEach(function (p) { p.m.material = locked ? W.lockGlow : p.mat; });
    rec.plat.material = locked ? rec.lockPlat : rec.platMat;
    if (rec.wheel) rec.wheel.parent.visible = !locked;
    var m = rec.spr.material, b = layout()[rec.id];
    if (locked) { m.map = rec.plate; rec.spr.userData.bs = { x: .062, y: .062 * 112 / 256 }; }
    else if (rec.art && rec.artName) { m.map = rec.art; var iw = rec.art.image.width, ih = rec.art.image.height, nw = .13; rec.spr.userData.bs = { x: nw, y: nw * ih / iw }; }
    else if (rec.art) { m.map = rec.art; var aw = .05 + b.w / 205 * .035; rec.spr.userData.bs = { x: aw, y: aw * b.h / b.w }; }
    m.needsUpdate = true;
    rec.spr.visible = !!m.map;
  }

  /* ---------- hora do dia, camada e tema ---------- */
  var LOOK = {
    morning:   { sky: ['#9fd3f0', '#fde6ee', '#fff6ef'], fog: '#f8e6ee', hemi: ['#fff6f0', '#d0a8ba', 1.7], sun: ['#fff1d8', 1.8, [-60, 85, 35]], orb: [-250, 70, -120, '#fff6dc', 60], night: 0, cloud: '#ffffff', fuji: ['#93a8cf', '#ffffff'] },
    afternoon: { sky: ['#f3a3c3', '#fbdbe7', '#fff1ec'], fog: '#f8dde8', hemi: ['#fff1f6', '#c9a0b4', 1.7], sun: ['#ffe2bf', 1.9, [50, 90, 50]], orb: [230, 80, -150, '#ffe7b8', 70], night: 0, cloud: '#fff8f2', fuji: ['#9d9fc6', '#fff4f6'] },
    night:     { sky: ['#0b0e25', '#1d2346', '#2c2a4e'], fog: '#1b2040', hemi: ['#5a6aa8', '#1d1830', .6], sun: ['#9db4ff', .55, [-30, 90, -20]], orb: [-180, 120, -200, '#e9eeff', 34], night: 1, cloud: '#3b4066', fuji: ['#232a4d', '#8c95c4'], stars: 1 },
    cognition: { sky: ['#030806', '#0c1f12', '#16301c'], fog: '#0b170f', hemi: ['#7dff9a', '#14251a', .62], sun: ['#b6ffb0', .7, [20, 90, 30]], orb: [0, 160, -260, '#96ff45', 80], night: 1, cloud: '#1f3a28', win: '#96ff45', fuji: ['#0f2416', '#3e7a4c'], stars: .4 }
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
    W.sky.u.top.value.set(L.sky[0]); W.sky.u.mid.value.set(L.sky[1]); W.sky.u.bot.value.set(L.sky[2]);
    W.scene.fog.color.set(L.fog);
    W.hemi.color.set(L.hemi[0]); W.hemi.groundColor.set(L.hemi[1]); W.hemi.intensity = L.hemi[2];
    W.sun.color.set(L.sun[0]); W.sun.intensity = L.sun[1]; W.sun.position.set(L.sun[2][0], L.sun[2][1], L.sun[2][2]);
    W.orb.position.set(L.orb[0], L.orb[1], L.orb[2]); W.orb.material.color.set(L.orb[3]); W.orb.scale.set(L.orb[4], L.orb[4], 1);
    W.stars.material.opacity = L.stars || 0; W.stars.visible = !!L.stars;
    W.fuji.body.color.set(L.fuji[0]); W.fuji.cap.color.set(L.fuji[1]);
    W.bMat.userData.u.uNight.value = L.night;
    W.bMat.userData.u.uWin.value.set(L.win || '#ffd27a');
    W.gNightMat.opacity = L.night ? 1 : 0; W.gNightMat.visible = !!L.night;
    W.gMat.color.setScalar(L.night ? 1 : .88);
    W.lamps.material.opacity = L.night ? .95 : 0; W.lamps.material.color.set(key === 'cognition' ? '#96ff45' : '#ffd58a');
    W.cloudMat.color.set(L.cloud); W.cloudMat.opacity = L.night ? .5 : .92;
    W.ground.material.color.set(key === 'cognition' ? '#2c4a35' : (L.night ? '#6f6283' : '#ffffff'));
    var mark = key === 'cognition' ? '#96ff45' : acc;
    W.ringMat.color.set(mark); W.gemMat.color.set(mark); W.gemMat.emissive.set(mark);
    Object.keys(W.d).forEach(function (id) { applyState(W.d[id]); });
    placeMarker();
  }
  function placeMarker() {
    var s = S(), rec = s && W.d[s.selected];
    W.ring.visible = W.gem.visible = !!rec;
    if (!rec) return;
    W.ring.position.set(rec.info.cx, .42, rec.info.cz);
    W.ring.userData.sx = rec.info.rx / .8 * 1.1; W.ring.userData.sz = rec.info.rz / .8 * 1.1;
    W.gem.userData.base = rec.info.top + 2.6;
    W.gem.position.set(rec.info.cx, W.gem.userData.base, rec.info.cz);
  }

  /* ---------- câmera ---------- */
  var fly = null, intro = null;
  var HOME = { r: 128, phi: 1.13, theta: 0 };
  /* em telas em pé (celular) a câmera olha mais de cima, senão sobra céu */
  function fitHome() { var a = W.cam ? (W.cam.userData.visAspect || W.cam.aspect) : 1.6; HOME.phi = a < 1.6 ? .34 : 1.02; HOME.r = a < 1.6 ? 150 : 132; HOME.mobile = a < 1.6; }
  function sph(r, phi, theta, target) {
    return new THREE.Vector3(target.x + r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), target.z + r * Math.sin(phi) * Math.cos(theta));
  }
  function flyTo(id, dist) {
    var rec = W.d[id]; if (!rec) return;
    intro = null;
    var to = new THREE.Vector3(rec.info.cx, 0, rec.info.cz);
    var off = W.cam.position.clone().sub(W.ctl.target);
    off.setLength(dist || Math.min(off.length(), 62));
    fly = { t: reduceMotion ? 1 : 0, ft: W.ctl.target.clone(), tt: to, fp: W.cam.position.clone(), tp: to.clone().add(off) };
  }
  function home() {
    intro = null; fitHome();
    var t0 = new THREE.Vector3(0, 0, 0);
    fly = { t: reduceMotion ? 1 : 0, ft: W.ctl.target.clone(), tt: t0, fp: W.cam.position.clone(), tp: sph(HOME.r, HOME.phi, HOME.theta, t0) };
  }
  function startIntro() {
    fitHome();
    W.ctl.target.set(0, 0, HOME.mobile && W.lastV && W.lastV < W.lastH - 2 ? (W.lastH - W.lastV) / W.lastH * 70 : 0);
    if (reduceMotion) { W.cam.position.copy(sph(HOME.r, HOME.phi, HOME.theta, W.ctl.target)); return; }
    intro = { t: 0 };
    W.cam.position.copy(sph(230, .02, -1.1, W.ctl.target));
  }
  function zoomBy(f) {
    intro = null;
    var off = W.cam.position.clone().sub(W.ctl.target);
    off.setLength(Math.max(W.ctl.minDistance, Math.min(W.ctl.maxDistance, off.length() / f)));
    fly = { t: reduceMotion ? 1 : 0, ft: W.ctl.target.clone(), tt: W.ctl.target.clone(), fp: W.cam.position.clone(), tp: W.ctl.target.clone().add(off) };
  }
  function zoomLabel() {
    var out = document.getElementById('atlasTokyoZoom'); if (!out || !on || !W.cam) return;
    out.textContent = Math.round(HOME.r / W.cam.position.distanceTo(W.ctl.target) * 100) + '%';
  }
  /* parte do palco que está à vista (no celular, a ficha do distrito cobre a metade de baixo) */
  function visibleH(r) {
    var dos = document.getElementById('districtDossierPanel'), h = r.height;
    if (dos && dos.offsetParent) {
      var d = dos.getBoundingClientRect();
      if (d.left < r.left + 20 && d.right > r.right - 20 && d.top > r.top + 80 && d.top < r.bottom) h = d.top - r.top;
    }
    return h;
  }
  function resize() {
    if (!W.renderer) return;
    var r = W.host.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height), vh = Math.max(1, visibleH(r));
    if (W.lastW === w && W.lastH === h && W.lastV === vh) return;
    W.lastW = w; W.lastH = h; W.lastV = vh;
    W.renderer.setSize(w, h, false);
    W.cam.aspect = w / h;
    W.cam.userData.visAspect = w / vh;
    W.cam.updateProjectionMatrix();
  }

  /* ---------- laço ---------- */
  var last = 0, nframe = 0;
  function tick(now) {
    raf = 0;
    if (!visible()) return;
    var dt = Math.min(.05, (now - (last || now)) / 1000); last = now; nframe++;
    var t = now / 1000;
    if (nframe % 20 === 0) sync();
    if (intro) {
      intro.t0 = intro.t0 || now; intro.t = Math.min(1, (now - intro.t0) / 2100);
      var e = 1 - Math.pow(1 - intro.t, 3);
      W.cam.position.copy(sph(230 + (HOME.r - 230) * e, .02 + (HOME.phi - .02) * e, -1.1 * (1 - e), W.ctl.target));
      W.cam.lookAt(W.ctl.target);
      if (intro.t >= 1) intro = null;
      zoomLabel();
    } else {
      if (fly) {
        fly.t0 = fly.t0 || now; fly.t = fly.t >= 1 ? 1 : Math.min(1, (now - fly.t0) / 900);
        var e2 = fly.t < .5 ? 4 * fly.t * fly.t * fly.t : 1 - Math.pow(-2 * fly.t + 2, 3) / 2;
        W.ctl.target.lerpVectors(fly.ft, fly.tt, e2); W.cam.position.lerpVectors(fly.fp, fly.tp, e2);
        if (fly.t >= 1) fly = null;
        zoomLabel();
      }
      W.ctl.update();
    }
    /* névoa acompanha a distância da câmera: perto fica nítido, o horizonte some no céu */
    var cd = W.cam.position.distanceTo(W.ctl.target); W.scene.fog.near = cd * 1.35; W.scene.fog.far = cd * 1.35 + 240;
    W.hoverTick();
    if (!reduceMotion) animateLife(t, dt);
    var pulse = .5 + .5 * Math.sin(t * 3);
    if (W.ring.visible) { var k = 1 + pulse * .06; W.ring.scale.set(W.ring.userData.sx * k, W.ring.userData.sz * k, 1); W.ringMat.opacity = .55 + pulse * .4; W.gem.position.y = W.gem.userData.base + Math.sin(t * 2) * .5; W.gem.rotation.y = t * 1.2; }
    Object.keys(W.d).forEach(function (id) {
      var sp = W.d[id].spr, bs = sp.userData.bs; if (!bs) return;
      var want = sp.userData.hover ? 1.12 : 1, kk = sp.userData.k = (sp.userData.k || 1) + (want - (sp.userData.k || 1)) * .25;
      sp.scale.set(bs.x * kk, bs.y * kk, 1);
    });
    W.renderer.render(W.scene, W.cam);
    if (W.onFirstFrame) { var f = W.onFirstFrame; W.onFirstFrame = null; f(); }
    schedule();
  }
  function animateLife(t, dt) {
    W.waterTex.offset.set(t * .01, t * .006);
    W.riverTex.offset.x = -t * .12;
    W.clouds.forEach(function (c) { c.position.x += c.userData.v * dt; if (c.position.x > 170) c.position.x = -170; });
    var m = W.tmp;
    W.cars.forEach(function (c, i) {
      c.d += c.v * dt * c.lane; if (c.d > c.tr.len) c.d -= c.tr.len; if (c.d < 0) c.d += c.tr.len;
      var q = along(c.tr, c.d);
      m.position.set(q.x - q.dz * .55 * c.lane, q.y, q.z + q.dx * .55 * c.lane);
      m.rotation.set(0, Math.atan2(-q.dz, q.dx), 0); m.updateMatrix();
      W.carMesh.setMatrixAt(i, m.matrix);
    });
    W.carMesh.instanceMatrix.needsUpdate = true;
    W.trains.forEach(function (tr) {
      tr.t += dt * 6 / Math.max(10, tr.tr.len);
      var ph = tr.t % 2, u = ph < 1 ? ph : 2 - ph; u = u * u * (3 - 2 * u);
      var q = along(tr.tr, u * tr.tr.len);
      tr.g.position.set(q.x, 2.42, q.z); tr.g.rotation.y = Math.atan2(-q.dz, q.dx);
    });
    W.boats.forEach(function (b) {
      b.d += b.v * dt; if (b.d > b.tr.len) b.d -= b.tr.len; if (b.d < 0) b.d += b.tr.len;
      var q = along(b.tr, b.d), sg = b.v > 0 ? 1 : -1; b.g.position.set(q.x - q.dz * .7 * sg, .05, q.z + q.dx * .7 * sg); b.g.rotation.y = Math.atan2(-q.dz, q.dx);
    });
    W.bayBoats.forEach(function (b) { b.a += b.v * dt; b.g.position.set(b.cx + Math.cos(b.a) * b.r, .05, b.cz + Math.sin(b.a) * b.r * .6); b.g.rotation.y = -b.a - Math.PI / 2; });
    W.gBlinkMat.color.setScalar((Math.floor(t * 1.4) % 2) === 0 ? 1 : .25);
    W.gScreenMat.color.setHSL((t * .05) % 1, .5, .75 + .15 * Math.sin(t * 3));
    var night = W.bMat.userData.u.uNight.value;
    Object.keys(W.d).forEach(function (id) {
      var r = W.d[id];
      if (r.wheel) { r.wheel.rotation.z = t * .12; r.wheel.userData.lights.forEach(function (lm, i) { lm.color.setHSL(((i / 16) + t * .2) % 1, .9, night ? .65 : .9); }); }
    });
  }
  function schedule() { if (!raf && on && built) raf = requestAnimationFrame(tick); }
  function visible() {
    var s = S(), page = document.getElementById('mapPage');
    return on && built && !document.hidden && page && page.classList.contains('active') && (!s || s.mapMode !== 'local');
  }

  /* ==========================================================
     INTERFACE: seletor 2D/3D e transição
     ========================================================== */
  var host = null, sw = null;
  function ensureHost() {
    if (host) return host;
    var vp = document.getElementById('atlasTokyoViewport'); if (!vp) return null;
    host = document.createElement('div'); host.id = 'map3d'; host.className = 'map3d'; host.setAttribute('aria-label', 'Mapa de Tokyo em 3D');
    host.innerHTML =
      '<div class="m3-wipe" aria-hidden="true"><i class="m3-s m3-s1"></i><i class="m3-s m3-s2"></i><i class="m3-s m3-s3"></i>' +
        '<div class="m3-card"><div class="m3-kick">PHOBIA // NAVEGAÇÃO</div><div class="m3-title"><b>TOKYO</b><span class="m3-cube"><i></i><i></i><i></i></span><em>3D</em></div>' +
        '<div class="m3-bar"><i></i></div><div class="m3-status">PREPARANDO…</div></div></div>' +
      '<div class="map3d-help">ARRASTE PARA MOVER · BOTÃO DIREITO (OU 2 DEDOS) PARA GIRAR · RODA PARA APROXIMAR</div>';
    vp.parentNode.insertBefore(host, vp.nextSibling);
    return host;
  }
  function progress(p, label) {
    if (!host) return;
    var bar = host.querySelector('.m3-bar i'), st = host.querySelector('.m3-status');
    if (bar) bar.style.transform = 'scaleX(' + Math.max(.04, Math.min(1, p)) + ')';
    if (st && label) st.textContent = label;
  }
  function wipeIn() { host.classList.remove('wipe-out'); host.classList.add('is-active'); void host.offsetWidth; host.classList.add('wipe-in'); return wait(reduceMotion ? 0 : 560); }
  function wipeOut() { host.classList.remove('wipe-in'); host.classList.add('wipe-out'); return wait(reduceMotion ? 0 : 760).then(function () { host.classList.remove('wipe-out'); }); }

  function updateSwitch() {
    if (!sw) return;
    sw.classList.toggle('is-3d', on);
    sw.querySelectorAll('button').forEach(function (b) { var is = (b.dataset.m3 === '3d') === on; b.setAttribute('aria-checked', String(is)); b.classList.toggle('on', is); });
  }
  function applyBody() {
    var s = S();
    document.body.classList.toggle('map3d-on', on && built && !(s && s.mapMode === 'local'));
  }

  async function setOn(v) {
    v = !!v && !failed;
    if (v === on || busy) { updateSwitch(); return; }
    var h = ensureHost(); if (!h) return;
    busy = true;
    on = v; pref(on); updateSwitch();
    var shell = h.parentNode; if (shell) { shell.scrollTop = 0; shell.scrollLeft = 0; }
    try {
      if (on) {
        progress(.03, built ? 'VOLTANDO PARA O 3D' : 'BAIXANDO O MOTOR 3D');
        await wipeIn();
        h.classList.add('is-loading');
        if (!built) {
          await load();
          progress(.1, 'MONTANDO A CIDADE');
          await build(h, progress);
        }
        progress(1, 'PRONTO');
        sync(true); W.lastW = 0; resize();
        startIntro();
        await new Promise(function (res) { W.onFirstFrame = res; applyBody(); schedule(); setTimeout(res, 1500); });
        await wait(reduceMotion ? 0 : 180);
        h.classList.remove('is-loading');
        zoomLabel();
        await wipeOut();
      } else {
        await wipeIn();
        applyBody();
        await wipeOut();
        h.classList.remove('is-active');
      }
    } catch (err) {
      failed = true; on = false; pref(false); updateSwitch(); applyBody();
      h.classList.remove('is-loading', 'wipe-in', 'wipe-out', 'is-active');
      console.warn('[map-3d]', err);
      if (typeof window.toast === 'function') window.toast('O mapa 3D não abriu neste navegador. Continuando no 2D.');
    }
    busy = false;
  }

  function buildSwitch() {
    sw = document.createElement('div');
    sw.className = 'm3-switch'; sw.setAttribute('role', 'radiogroup'); sw.setAttribute('aria-label', 'Visão do mapa');
    sw.innerHTML = '<span class="m3-knob" aria-hidden="true"></span>' +
      '<button type="button" role="radio" data-m3="2d" aria-checked="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="2"/></svg>2D</button>' +
      '<button type="button" role="radio" data-m3="3d" aria-checked="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l9 5v10l-9 5-9-5V7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M3 7l9 5 9-5M12 12v10" fill="none" stroke="currentColor" stroke-width="2"/></svg>3D</button>';
    sw.addEventListener('click', function (e) { var b = e.target.closest('button[data-m3]'); if (b) setOn(b.dataset.m3 === '3d'); });
    sw.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setOn(e.key === 'ArrowRight'); } });
    return sw;
  }
  function mountSwitch() {
    if (!sw) buildSwitch();
    /* logo abaixo da busca "Onde vamos?" do HUD; sem HUD, flutua no canto do mapa */
    var search = document.querySelector('.hud-search');
    if (search && search.parentNode) {
      if (sw.previousElementSibling !== search) search.parentNode.insertBefore(sw, search.nextSibling);
      sw.classList.add('hud-map-only', 'm3-docked'); sw.classList.remove('m3-floating');
    } else {
      var shell = document.querySelector('#mapPage .map-shell');
      if (shell && sw.parentNode !== shell) shell.appendChild(sw);
      sw.classList.add('m3-floating');
    }
    updateSwitch();
  }

  function init() {
    if (!window.WebGLRenderingContext) return;
    mountSwitch();
    var tries = 0, iv = setInterval(function () { mountSwitch(); if (++tries > 10 || (sw && sw.classList.contains('m3-docked'))) clearInterval(iv); }, 500);
    var ctl = document.querySelector('#mapPage .map-controls');
    if (ctl) ctl.addEventListener('click', function (e) {
      if (!on || !built) return;
      var b = e.target.closest('button'); if (!b) return;
      if (b.id === 'zoomIn') zoomBy(1.3); else if (b.id === 'zoomOut') zoomBy(1 / 1.3); else if (b.id === 'resetView') home(); else return;
      e.stopPropagation(); e.preventDefault(); schedule();
    }, true);
    var origSel = window.selectDistrict;
    if (typeof origSel === 'function') window.selectDistrict = function (id) {
      var r = origSel.apply(this, arguments);
      if (on && built) { sync(true); if (!isLocked(id)) flyTo(id); }
      return r;
    };
    var origRender = window.renderDistricts;
    if (typeof origRender === 'function') window.renderDistricts = function () { var r = origRender.apply(this, arguments); if (on && built) sync(true); return r; };
    ['setTime', 'setLayer', 'setMode'].forEach(function (fn) {
      var o = window[fn]; if (typeof o !== 'function') return;
      window[fn] = function () { var r = o.apply(this, arguments); if (on && built) { sync(true); schedule(); } return r; };
    });
    document.addEventListener('visibilitychange', schedule);
    setInterval(function () { if (on && !busy) applyBody(); if (on && built && !raf && visible()) { resize(); schedule(); } }, 400);
    if (pref()) setOn(true);
  }

  window.PhobiaMap3D = { _w: function () { return W; }, set: setOn, get on() { return on; }, flyTo: function (id, d) { if (built) flyTo(id, d); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

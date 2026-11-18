/* ==========================================================
   PERSONA // PHOBIA — map-3d-kit.js  (módulo ES)
   Peças do Tokyo 3D: primitivas, prédios genéricos e os marcos
   de cada distrito, modelados a partir de referências reais da
   Tokyo de ~2000 (nada posterior: sem Skytree, Roppongi Hills…).

   Carregado por map-3d.js só quando o modo 3D é ligado.
   Tudo é juntado em poucas malhas por distrito (corpo com
   janelas, peças lisas e letreiros que brilham).

   Escala: 1 unidade = 10 px do mapa 2D (≈ 15 m na altura).
   ========================================================== */

let T = null;
export function setThree(three) { T = three; }

/* ---------- aleatório com semente ---------- */
export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- primitivas (já posicionadas; base em y) ---------- */
function place(g, x, y, z, ry) { if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
export function box(w, h, d, x, y, z, ry) { const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return place(g, x, y, z, ry); }
export function cyl(rt, rb, h, seg, x, y, z, ry) { const g = new T.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); return place(g, x, y, z, ry); }
export function disc(r, x, y, z) { const g = new T.CylinderGeometry(r, r, .06, 18); g.rotateX(Math.PI / 2); g.translate(x, y, z); return g; }
export function sphere(r, x, y, z, det) { const g = new T.IcosahedronGeometry(r, det == null ? 1 : det); g.translate(x, y, z); return g; }
/* telhado de duas águas: retângulo w×d, cumeeira ao longo de x */
export function gable(w, d, h, x, y, z, ry) {
  const a = w / 2, b = d / 2;
  const v = [
    -a, 0, -b, a, 0, -b, a, h, 0, -a, 0, -b, a, h, 0, -a, h, 0,
    -a, 0, b, -a, h, 0, a, h, 0, -a, 0, b, a, h, 0, a, 0, b,
    -a, 0, -b, -a, h, 0, -a, 0, b,
    a, 0, -b, a, 0, b, a, h, 0
  ];
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  return place(g, x, y, z, ry);
}
/* prisma a partir de um perfil 2D (x,y) extrudado em z */
export function prism(profile, depth, x, y, z, ry) {
  const s = new T.Shape(); profile.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
  const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2);
  return place(g, x, y, z, ry);
}
/* telhado japonês: beiral largo + duas águas, opcionalmente em camadas */
function jroof(P, w, d, x, y, z, ry, c) {
  P.plain.push({ g: box(w * 1.18, .12, d * 1.22, x, y, z, ry), c: c || '#2a2730' });
  P.plain.push({ g: gable(w * 1.05, d * 1.1, Math.min(w, d) * .38, x, y + .12, z, ry), c: c || '#2a2730' });
}

/* ---------- junta peças com cor por vértice ---------- */
export function merge(list) {
  const pos = [], nor = [], col = [], idx = []; let off = 0;
  list.forEach(it => {
    const g = it.g, p = g.attributes.position, n = g.attributes.normal, c = new T.Color(it.c);
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
    if (g.index) for (let j = 0; j < g.index.count; j++) idx.push(g.index.getX(j) + off);
    else for (let k = 0; k < p.count; k++) idx.push(k + off);
    off += p.count; g.dispose();
  });
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  out.setIndex(idx); out.computeBoundingSphere();
  return out;
}

/* ---------- paletas ---------- */
const NEON = ['#ff2e88', '#ffd21f', '#28e0ff', '#ff6a2b', '#9cff3a', '#ffffff', '#ff3b3b', '#b06cff'];
const STYLE = {
  shinjuku:  { office: .5, shop: .5, walls: ['#d9d4cc', '#c3ccd4', '#e8e2d6', '#9fb0bf', '#f2ede2', '#7f8a96'], hi: 6, lo: 2.2 },
  shibuya:   { office: .25, shop: .75, walls: ['#f2ede2', '#d9d4cc', '#2f2b36', '#e9d9e2', '#c9c3bb'], hi: 5.2, lo: 1.8 },
  ikebukuro: { office: .35, shop: .45, mall: .2, walls: ['#e3ddd2', '#cfc8bd', '#b8c2c9', '#f0ebe1'], hi: 5, lo: 1.8 },
  akihabara: { shop: 1, walls: ['#ece7dd', '#d6d0c6', '#3a3542', '#f4efe4', '#c8cfd6'], hi: 4.6, lo: 2, signs: 1.6 },
  asakusa:   { house: .6, shop: .4, walls: ['#efe6d4', '#e2d6c0', '#d8cdb8', '#f6efe1'], hi: 2.2, lo: .8 },
  ginza:     { office: .35, mall: .65, walls: ['#f5f0e6', '#e9e1cf', '#d8d0c0', '#c9c2b4', '#fbf8f0'], hi: 4.6, lo: 2.4, gold: true },
  roppongi:  { office: .45, shop: .55, walls: ['#d8d2c8', '#3a3542', '#bfc7cf', '#ece6da'], hi: 5.2, lo: 1.8 },
  odaiba:    { mall: 1, walls: ['#eef2f5', '#d7dfe5', '#c4ced6', '#f6f6f2'], hi: 3, lo: 1.4 },
  harajuku:  { shop: .65, house: .35, walls: ['#ffd6e7', '#d7f3ff', '#fff3c4', '#f4efe4', '#e3d4ff'], hi: 2.6, lo: 1 },
  nakano:    { shop: .5, house: .5, walls: ['#e6e0d4', '#d2cbbf', '#efe9de', '#c7cdd2'], hi: 3.4, lo: 1 },
  kichijoji: { house: .7, shop: .3, walls: ['#efe6d4', '#e0d6c4', '#f4efe4', '#d9e0d3'], hi: 2.4, lo: .8 },
  meguro:    { house: .85, shop: .15, walls: ['#f1ebdf', '#e3dccf', '#d9d1c2', '#f6f1e6'], hi: 2.2, lo: .8 }
};
const ROOFS = ['#5d6f86', '#8a5a4c', '#4f6a5a', '#77738a', '#8d939c', '#b0654f'];

/* ---------- prédios genéricos ---------- */
function office(P, r, x, z, w, d, h, S) {
  const c = S.walls[Math.floor(r() * S.walls.length)];
  P.body.push({ g: box(w, h, d, x, P.y0, z), c });
  if (h > 4 && r() < .55) P.body.push({ g: box(w * .7, h * .14, d * .7, x, P.y0 + h, z), c });
  if (r() < .6) P.plain.push({ g: box(w * .3, .3, d * .25, x - w * .15, P.y0 + h, z + d * .1), c: '#8c8590' });
  if (h > 5 && r() < .35) P.plain.push({ g: cyl(.03, .05, 1.2, 4, x + w * .3, P.y0 + h, z - d * .3), c: '#c9c2c9' });
  if (h > 5 && r() < .5) P.glow.push({ g: box(.18, .18, .18, x + w * .3, P.y0 + h + (h > 5 ? 1.2 : 0), z - d * .3), c: '#ff3b3b', blink: true });
}
function shop(P, r, x, z, w, d, h, S) {
  const c = S.walls[Math.floor(r() * S.walls.length)];
  P.body.push({ g: box(w, h, d, x, P.y0, z), c });
  const neon = S.gold ? (r() < .5 ? '#ffe7a3' : '#ffffff') : NEON[Math.floor(r() * NEON.length)];
  /* faixa de letreiro na fachada (para todos os lados) */
  P.glow.push({ g: box(w * 1.02, .32, d * 1.02, x, P.y0 + Math.min(h - .4, 1.1), z), c: neon });
  /* letreiro vertical saltado */
  const n = Math.round((S.signs || 1) * (r() < .6 ? 1 : 0) + (r() < .3 ? 1 : 0));
  for (let i = 0; i < n; i++) {
    const side = r() < .5 ? 1 : -1, sh = Math.min(h * .75, 1.4 + r() * 2.6);
    P.glow.push({ g: box(.16, sh, .5, x + side * (w / 2 + .1), P.y0 + h - sh - .15, z + (r() - .5) * d * .6), c: NEON[Math.floor(r() * NEON.length)] });
  }
  /* outdoor no teto */
  if (r() < .3 && h > 1.5) {
    P.plain.push({ g: box(.08, .7, .08, x - w * .3, P.y0 + h, z), c: '#3a3542' }, { g: box(.08, .7, .08, x + w * .3, P.y0 + h, z), c: '#3a3542' });
    P.glow.push({ g: box(w * .85, .9, .1, x, P.y0 + h + .6, z), c: NEON[Math.floor(r() * NEON.length)] });
  }
}
function house(P, r, x, z, w, d, h, S) {
  const c = S.walls[Math.floor(r() * S.walls.length)], ry = r() < .5 ? 0 : Math.PI / 2;
  P.plain.push({ g: box(w, h, d, x, P.y0, z, ry), c });
  P.plain.push({ g: gable(w * 1.08, d * 1.1, .45 + r() * .2, x, P.y0 + h, z, ry), c: ROOFS[Math.floor(r() * ROOFS.length)] });
  if (r() < .25) P.glow.push({ g: box(.25, .18, .25, x + w * .45, P.y0 + h * .55, z), c: '#ffd9a0', night: true });
}
function mall(P, r, x, z, w, d, h, S) {
  const c = S.walls[Math.floor(r() * S.walls.length)];
  P.body.push({ g: box(w, h, d, x, P.y0, z), c });
  P.plain.push({ g: box(w * 1.03, .2, d * 1.03, x, P.y0 + h, z), c: '#8c8590' });
  P.glow.push({ g: box(w * .55, .55, d * 1.04, x, P.y0 + h - .9, z), c: S.gold ? '#ffe7a3' : NEON[Math.floor(r() * NEON.length)] });
}

/* preenche o distrito com prédios, evitando ruas e áreas reservadas */
function fill(P, id, r) {
  const S = STYLE[id] || STYLE.nakano, cs = S.house > .5 ? 1.25 : 1.6;
  const ok = (x, z, pad) => {
    const e = (x * x) / (P.rx * P.rx) + (z * z) / (P.rz * P.rz);
    if (e > 1) return false;
    if (P.streets.some(s => s.ax ? Math.abs(z - s.at) < s.w / 2 + pad : Math.abs(x - s.at) < s.w / 2 + pad)) return false;
    if (P.reserve.some(q => Math.abs(x - q.x) < q.w / 2 + pad && Math.abs(z - q.z) < q.d / 2 + pad)) return false;
    return true;
  };
  for (let gx = -P.rx; gx <= P.rx; gx += cs) for (let gz = -P.rz; gz <= P.rz; gz += cs) {
    const x = gx + (r() - .5) * .25, z = gz + (r() - .5) * .25;
    if (!ok(x, z, cs * .42)) continue;
    if (r() < .08) continue; /* respiros: pracinhas e estacionamentos */
    const e = Math.sqrt((x * x) / (P.rx * P.rx) + (z * z) / (P.rz * P.rz));
    const w = cs * (.66 + r() * .26), d = cs * (.66 + r() * .26);
    let h = S.lo + (S.hi - S.lo) * Math.pow(1 - e, 1.1) * (.55 + r() * .7);
    const roll = r(), X = P.cx + x, Z = P.cz + z;
    if (S.office && roll < S.office && (!P.officeSide || P.officeSide(x, z))) office(P, r, X, Z, w, d, h * 1.25, S);
    else if (S.mall && roll < (S.office || 0) + S.mall) mall(P, r, X, Z, w, d, Math.max(1.8, h * .9), S);
    else if (S.house && roll > 1 - S.house) house(P, r, X, Z, w * .85, d * .85, .7 + r() * .6, S);
    else shop(P, r, X, Z, w, d, Math.max(1.2, h * (S.office ? .7 : 1)), S);
    P.top = Math.max(P.top, h * 1.25);
  }
}

/* ruas internas com faixa de pedestre */
function streets(P, list) {
  list.forEach(s => {
    const L = (s.ax ? P.rx : P.rz) * 2.3;
    const g = s.ax ? box(L, .04, s.w, P.cx, P.y0 - .03, P.cz + s.at) : box(s.w, .04, L, P.cx + s.at, P.y0 - .03, P.cz);
    P.ground.push({ g, c: '#3a3640' });
    P.streets.push(s);
  });
}
function zebra(P, x, z, len, w, ry) {
  for (let i = -len / 2; i <= len / 2; i += .38) P.ground.push({ g: box(.2, .02, w, x + Math.cos(ry || 0) * i, P.y0 + .02, z - Math.sin(ry || 0) * i, ry), c: '#f6f1e6' });
}
function trees(P, r, pts, col, size) {
  pts.forEach(p => {
    P.plain.push({ g: cyl(.05, .07, .4, 5, p[0], P.y0, p[1]), c: '#6b4a35' });
    P.plain.push({ g: sphere((size || .45) * (.8 + r() * .5), p[0], P.y0 + .65, p[1], 0), c: Array.isArray(col) ? col[Math.floor(r() * col.length)] : col });
  });
}
function reserve(P, x, z, w, d) { P.reserve.push({ x: x - P.cx, z: z - P.cz, w, d }); }

/* ==========================================================
   MARCOS DE CADA DISTRITO (coordenadas locais ao centro)
   ========================================================== */
const L = {};

/* SHINJUKU — oeste: arranha-céus; leste: Kabukichō em neon */
L.shinjuku = (P, r) => {
  P.officeSide = (x) => x < .5;
  streets(P, [{ ax: 0, at: .4, w: .9 }, { ax: 1, at: 1.6, w: .7 }]);
  const y = P.y0, X = P.cx, Z = P.cz;
  /* Prefeitura (Tochō): bloco com duas torres que se separam e giram no alto */
  const tx = X - 4.2, tz = Z - 1.2;
  P.body.push({ g: box(3.6, 8.5, 1.9, tx, y, tz), c: '#cfc6b6' });
  P.plain.push({ g: box(.5, 8.6, 2, tx, y, tz), c: '#8f8a84' });
  P.body.push({ g: box(1.5, 6.2, 1.5, tx - 1, y + 8.5, tz, Math.PI / 4), c: '#d8d2c6' }, { g: box(1.5, 6.2, 1.5, tx + 1, y + 8.5, tz, Math.PI / 4), c: '#d8d2c6' });
  P.plain.push({ g: box(1.1, .5, 1.1, tx - 1, y + 14.7, tz, Math.PI / 4), c: '#9a948c' }, { g: box(1.1, .5, 1.1, tx + 1, y + 14.7, tz, Math.PI / 4), c: '#9a948c' });
  P.body.push({ g: box(2.2, 6, 2.6, tx + .4, y, tz + 2.6), c: '#ccc5b9' }, { g: box(1.6, 2, 2, tx + .4, y + 6, tz + 2.6), c: '#ccc5b9' });
  reserve(P, tx, tz + 1, 4.6, 5.4);
  /* Shinjuku Park Tower: três torres escalonadas com pirâmides de vidro */
  const px = X - 4.6, pz = Z + 3.3;
  [[0, 9.6], [1.2, 10.6], [2.4, 11.6]].forEach(([o, h], i) => {
    P.body.push({ g: box(1.15, h, 1.15, px + o, y, pz - i * .4), c: '#a9b4bd' });
    P.plain.push({ g: cyl(0, .82, 1.1, 4, px + o, y + h, pz - i * .4, Math.PI / 4), c: '#7f8b95' });
  });
  reserve(P, px + 1.2, pz - .4, 4.2, 2.2);
  /* Sumitomo: o prédio triangular */
  P.body.push({ g: cyl(1.35, 1.35, 10.5, 3, X - 1.4, y, Z - 3.7, Math.PI / 6), c: '#bfc6cc' });
  reserve(P, X - 1.4, Z - 3.7, 2.6, 2.6);
  /* NTT Docomo Yoyogi (2000): torre com relógio e agulha */
  const nx = X - 1.2, nz = Z + 3.6;
  P.body.push({ g: box(1.9, 7, 1.6, nx, y, nz), c: '#bdb5aa' }, { g: box(1.4, 3, 1.2, nx, y + 7, nz), c: '#bdb5aa' }, { g: box(.9, 2.2, .8, nx, y + 10, nz), c: '#bdb5aa' });
  P.glow.push({ g: disc(.32, nx, y + 10.8, nz + .82), c: '#fff6d8' });
  P.plain.push({ g: cyl(.03, .25, 3.4, 6, nx, y + 12.2, nz), c: '#9a948c' });
  reserve(P, nx, nz, 2.3, 2);
  /* Kabukichō Ichibangai: arco vermelho de neon na entrada */
  const kx = X + 3.6, kz = Z - .4;
  P.plain.push({ g: box(.18, 2.4, .18, kx - .55, y, kz), c: '#2b2630' }, { g: box(.18, 2.4, .18, kx + .55, y, kz), c: '#2b2630' });
  P.glow.push({ g: box(1.6, .55, .2, kx, y + 2.2, kz), c: '#ff2e3b' });
  P.top = 14;
};

/* SHIBUYA — cruzamento Scramble, 109, QFront e a estação */
L.shibuya = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  streets(P, [{ ax: 0, at: 0, w: 1.1 }, { ax: 1, at: -.4, w: 1.1 }, { ax: 1, at: 3.4, w: .7 }]);
  /* Scramble: praça de asfalto com faixas em todas as direções */
  P.ground.push({ g: box(3.2, .045, 3.2, X - .4, y - .02, Z), c: '#3a3640' });
  zebra(P, X - .4, Z - 1.35, 2.6, .5, 0); zebra(P, X - .4, Z + 1.35, 2.6, .5, 0);
  zebra(P, X - 1.75, Z, 2.6, .5, Math.PI / 2); zebra(P, X + .95, Z, 2.6, .5, Math.PI / 2);
  zebra(P, X - .4, Z, 3.4, .45, Math.PI / 4); zebra(P, X - .4, Z, 3.4, .45, -Math.PI / 4);
  reserve(P, X - .4, Z, 3.6, 3.6);
  /* Shibuya 109: cilindro prateado com o letreiro no topo */
  const ax = X + 2.2, az = Z - 2.3;
  P.body.push({ g: cyl(.95, .95, 6.4, 20, ax, y, az), c: '#e3e7ea' });
  P.glow.push({ g: cyl(1, 1, .9, 20, ax, y + 5.2, az), c: '#ff2e88' }, { g: box(.25, 4.2, .3, ax - .9, y + .6, az + .3), c: '#ffffff' });
  P.body.push({ g: box(2.2, 3.2, 1.6, ax + 1.2, y, az + .2), c: '#d9d4cc' });
  reserve(P, ax + .6, az, 3.6, 2.4);
  /* QFront com o telão (1999) */
  const qx = X - 3, qz = Z - 2.2;
  P.body.push({ g: box(2.2, 4.4, 1.7, qx, y, qz), c: '#2f2b36' });
  P.glow.push({ g: box(1.6, 2.2, .08, qx + .1, y + 1.6, qz + .88), c: '#28e0ff', screen: true }, { g: box(.08, 2.2, 1.2, qx + 1.12, y + 1.6, qz), c: '#ff2e88', screen: true });
  reserve(P, qx, qz, 2.6, 2.2);
  /* Estação de Shibuya (JR, verde Yamanote) e o viaduto, na borda sul */
  const sx = X - .4, sz = Z + P.rz * .78;
  P.body.push({ g: box(4.2, 1.3, 1.1, sx, y, sz), c: '#e6e0d4' });
  P.plain.push({ g: box(P.rx * 2.2, .25, .55, X, y + 1.35, sz + .55), c: '#55595f' });
  for (let i = -3; i <= 3; i++) P.plain.push({ g: box(.2, 1.35, .4, X + i * 1.9, y, sz + .55), c: '#4a4e55' });
  P.glow.push({ g: box(4.2, .16, 1.12, sx, y + 1, sz), c: '#7ed957' });
  reserve(P, X, sz + .2, P.rx * 2.2, 1.8);
  /* Hachikō */
  P.plain.push({ g: box(.3, .25, .3, X - 2.1, y, Z + 1.6), c: '#6b6f74' }, { g: sphere(.13, X - 2.1, y + .42, Z + 1.6, 0), c: '#8a7a5a' });
  /* telões e outdoors ao redor do cruzamento */
  P.glow.push({ g: box(1.3, 1, .08, X + 1.7, y + 3, Z + 1.1), c: '#ffd21f', screen: true });
  P.top = 7;
};

/* IKEBUKURO — Sunshine 60 e as lojas de departamento da estação */
L.ikebukuro = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  streets(P, [{ ax: 0, at: .8, w: .9 }, { ax: 1, at: -.8, w: .8 }]);
  /* estação no meio, com Seibu (leste) e Tobu (oeste) */
  P.body.push({ g: box(1.4, 1.3, 4.6, X - .8, y, Z - .6), c: '#d6d0c6' });
  P.plain.push({ g: box(.7, .25, 7, X - .8, y + 1.35, Z - .6), c: '#55595f' });
  P.body.push({ g: box(2.2, 3.6, 3.6, X + 1, y, Z - 1.3), c: '#efe9de' }); P.glow.push({ g: box(1.6, .5, 3.65, X + 1, y + 2.8, Z - 1.3), c: '#ffffff' });
  P.body.push({ g: box(2.2, 3.4, 3.4, X - 2.8, y, Z - 1.4), c: '#d9d2c4' }); P.glow.push({ g: box(1.6, .5, 3.45, X - 2.8, y + 2.6, Z - 1.4), c: '#28e0ff' });
  reserve(P, X - .9, Z - 1.3, 6.4, 4.6);
  /* Sunshine 60 e o Sunshine City */
  const sx = X + 4, sz = Z + 2.2;
  P.body.push({ g: box(3.2, 2.2, 2.6, sx, y, sz), c: '#ddd7cc' });
  P.body.push({ g: box(1.7, 15, 1.7, sx, y + 2.2, sz), c: '#e3ded4' });
  P.plain.push({ g: box(1.75, .9, 1.75, sx, y + 17.2, sz), c: '#3a3440' });
  P.glow.push({ g: box(.2, .2, .2, sx, y + 18.2, sz), c: '#ff3b3b', blink: true });
  reserve(P, sx, sz, 3.6, 3);
  P.top = 18;
};

/* AKIHABARA — Electric Town: letreiros enormes e o viaduto da JR */
L.akihabara = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  streets(P, [{ ax: 1, at: .3, w: 1.1 }, { ax: 0, at: -1.2, w: .7 }]);
  /* viaduto JR (Sōbu amarela) cortando o bairro */
  P.plain.push({ g: box(P.rx * 2.4, .35, .9, X, y + 2.1, Z + 1.6), c: '#5a5e66' });
  for (let i = -3; i <= 3; i++) P.plain.push({ g: box(.25, 2.1, .7, X + i * 2, y, Z + 1.6), c: '#4a4e55' });
  P.glow.push({ g: box(P.rx * 2.38, .1, .2, X, y + 2.46, Z + 1.25), c: '#ffd21f' });
  reserve(P, 0 + X, Z + 1.6, P.rx * 2.4, 1.1);
  /* Radio Kaikan e Sega: torres de letreiro */
  const rx = X + 1.8, rz = Z - 1.6;
  P.body.push({ g: box(1.8, 4.2, 1.6, rx, y, rz), c: '#ece7dd' });
  P.glow.push({ g: box(1.9, .9, .2, rx, y + 4.3, rz), c: '#ffd21f' }, { g: box(.2, 3, .9, rx - 1, y + .8, rz), c: '#ff3b3b' });
  const gx = X - 1.4, gz = Z - 1.8;
  P.body.push({ g: box(1.6, 3.6, 1.5, gx, y, gz), c: '#3a3542' });
  P.glow.push({ g: box(1.62, .6, 1.52, gx, y + 2.9, gz), c: '#28e0ff' }, { g: box(.2, 2.4, .8, gx + .9, y + .6, gz), c: '#ff2e88' });
  reserve(P, X + .2, Z - 1.7, 5.4, 2.2);
  /* estação */
  P.body.push({ g: box(3.4, 1.2, 1.3, X - .6, y, Z + 3.1), c: '#d6d0c6' });
  P.top = 6;
};

/* ASAKUSA — Sensō-ji, Kaminarimon, Nakamise e a Asahi do outro lado */
L.asakusa = (P, r) => {
  const y = P.y0, X = P.cx - 1, Z = P.cz;
  const red = '#c8322b', ink = '#2a2730';
  /* Nakamise: rua de pedestres entre duas fileiras de lojinhas */
  P.ground.push({ g: box(1, .04, 5.6, X, y - .02, Z + .6), c: '#d9cdb5' });
  for (let i = 0; i < 6; i++) {
    const z = Z + 3 - i * .9;
    [-1, 1].forEach(s => {
      P.plain.push({ g: box(.7, .7, .8, X + s * .9, y, z), c: '#f4ead8' });
      P.plain.push({ g: gable(.85, .95, .28, X + s * .9, y + .7, z, Math.PI / 2), c: red });
      P.glow.push({ g: box(.05, .18, .7, X + s * .52, y + .5, z), c: i % 2 ? '#ffd9a0' : '#ff6a5a', night: true });
    });
  }
  reserve(P, X, Z + .6, 3, 6.4);
  /* Kaminarimon: portão vermelho com a lanterna gigante */
  const kz = Z + 3.9;
  P.plain.push({ g: box(.22, 1.5, .5, X - .8, y, kz), c: red }, { g: box(.22, 1.5, .5, X + .8, y, kz), c: red }, { g: box(1.9, .5, .7, X, y + 1.5, kz), c: red });
  jroof(P, 1.9, .8, X, y + 2, kz, 0, ink);
  P.glow.push({ g: cyl(.32, .32, .6, 14, X, y + .75, kz), c: '#ff3b2b' });
  /* Hōzōmon e o Salão Principal */
  const hz = Z - 2.4;
  P.plain.push({ g: box(1.6, 1.6, .8, X, y, hz), c: red }); jroof(P, 1.6, .8, X, y + 1.6, hz, 0, ink); jroof(P, 1.3, .65, X, y + 2.2, hz, 0, ink);
  const mz = Z - 4.2;
  P.plain.push({ g: box(2.8, 1.6, 1.8, X, y, mz), c: red }, { g: box(2.6, .2, 1.6, X, y + 1.6, mz), c: '#f4ead8' });
  jroof(P, 2.9, 1.9, X, y + 1.8, mz, 0, ink);
  reserve(P, X, Z - 3.3, 3.6, 3.6);
  /* Pagode de cinco andares */
  const gx = X - 2.4, gz = Z - 2.6;
  for (let k = 0; k < 5; k++) { const s = 1.3 - k * .17, yy = y + k * .78; P.plain.push({ g: box(s * .62, .55, s * .62, gx, yy, gz), c: red }); jroof(P, s, s, gx, yy + .55, gz, 0, ink); }
  P.plain.push({ g: cyl(.03, .07, 1.2, 6, gx, y + 4.4, gz), c: '#d8b45a' });
  reserve(P, gx, gz, 1.8, 1.8);
  /* Asahi Beer Hall: prédio dourado em forma de caneca e a "chama" dourada */
  const ax = P.cx + P.rx * .72, az = Z + .4;
  P.body.push({ g: box(1.4, 5.4, 1.4, ax, y, az), c: '#d7a63a' });
  P.plain.push({ g: box(1.5, .7, 1.5, ax, y + 5.4, az), c: '#fbf6ea' });
  P.plain.push({ g: box(1.6, 1.4, 1.4, ax + 1.6, y, az), c: '#2a2730' });
  P.plain.push({ g: prism([[0, 0], [1.4, .4], [1.1, 1.1], [.2, 1.3], [-.2, .7]], .5, ax + 1.3, y + 1.4, az, .3), c: '#e8b931' });
  reserve(P, ax + .8, az, 3.4, 1.8);
  P.top = 6.5;
};

/* GINZA — Wakō e seu relógio, Kabuki-za, Chūō-dōri elegante */
L.ginza = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  streets(P, [{ ax: 0, at: 0, w: 1 }, { ax: 1, at: 0, w: 1 }]);
  zebra(P, X, Z - .75, 1, .4, 0); zebra(P, X, Z + .75, 1, .4, 0);
  /* Wakō: esquina curva + torre do relógio */
  const wx = X + 1.3, wz = Z - 1.3;
  P.body.push({ g: cyl(1, 1, 3.4, 20, wx, y, wz), c: '#d9cbb0' });
  P.body.push({ g: box(1.8, 3.4, 1.4, wx + .7, y, wz - .4), c: '#d9cbb0' });
  P.plain.push({ g: cyl(.55, .6, 1.5, 12, wx, y + 3.4, wz), c: '#cdbf9f' }, { g: cyl(0, .6, .7, 12, wx, y + 4.9, wz), c: '#5b7f73' });
  P.glow.push({ g: disc(.3, wx, y + 4.15, wz + .6), c: '#fff6d8' });
  reserve(P, wx + .3, wz - .2, 2.6, 2.4);
  /* Kabuki-za: fachada tradicional com telhados em gable */
  const kx = X - 2.2, kz = Z + 2.2;
  P.plain.push({ g: box(3, 1.4, 1.8, kx, y, kz), c: '#f1ead9' });
  P.plain.push({ g: box(3.1, .14, 1.9, kx, y + 1.4, kz), c: '#b02a2a' });
  jroof(P, 3, 1.8, kx, y + 1.55, kz, 0, '#2f3640'); jroof(P, 1.2, .9, kx, y + 1.1, kz + .9, Math.PI / 2, '#2f3640');
  P.glow.push({ g: box(2.2, .12, .05, kx, y + .9, kz + .92), c: '#ff6a5a', night: true });
  reserve(P, kx, kz, 3.4, 2.4);
  /* Sony Building (fachada iluminada) */
  P.body.push({ g: box(1.4, 3.6, 1.4, X - 1.4, y, Z - 1.4), c: '#e8e4dc' });
  P.glow.push({ g: box(1.42, 2.6, .05, X - 1.4, y + .8, Z - .68), c: '#9ad7ff', screen: true });
  reserve(P, X - 1.4, Z - 1.4, 1.8, 1.8);
  P.top = 5.6;
};

/* ROPPONGI — Tokyo Tower, a via expressa elevada e o Almond */
L.roppongi = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  streets(P, [{ ax: 0, at: .2, w: 1 }, { ax: 1, at: -.6, w: .8 }]);
  /* Shuto: via expressa elevada sobre a Roppongi-dōri */
  P.plain.push({ g: box(P.rx * 2.4, .3, 1, X, y + 2.2, Z + .2), c: '#8f949b' });
  for (let i = -3; i <= 3; i++) P.plain.push({ g: box(.3, 2.2, .3, X + i * 2.1, y, Z + .2), c: '#7c8188' });
  P.plain.push({ g: box(P.rx * 2.4, .14, .06, X, y + 2.5, Z + .7), c: '#c9ccd0' }, { g: box(P.rx * 2.4, .14, .06, X, y + 2.5, Z - .3), c: '#c9ccd0' });
  /* Almond: a esquina rosa do cruzamento */
  P.body.push({ g: box(1.1, 1.6, 1.1, X - 1.2, y, Z - 1.1), c: '#f6a6c8' });
  P.glow.push({ g: box(1.12, .3, 1.12, X - 1.2, y + 1.2, Z - 1.1), c: '#ff5fa8' });
  reserve(P, X - 1.2, Z - 1.1, 1.4, 1.4);
  /* Tokyo Tower: treliça vermelha e branca, dois mirantes e antena */
  const tx = X + 3.2, tz = Z - 2.6, H = 15;
  const bands = ['#e8402f', '#fff6ec'];
  for (let i = 0; i < 12; i++) {
    const y0 = i * H / 12, y1 = (i + 1) * H / 12, w0 = 2.4 * Math.pow(1 - y0 / H, 1.9) + .18, w1 = 2.4 * Math.pow(1 - y1 / H, 1.9) + .18;
    const c = bands[i % 2], s = .09 + .05 * (1 - y0 / H);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => {
      const leg = cyl(s, s * 1.15, y1 - y0, 4, 0, 0, 0);
      const dx = (w1 - w0) / 2 * a, dz = (w1 - w0) / 2 * b, len = y1 - y0;
      leg.rotateZ(-Math.atan2(dx, len)); leg.rotateX(Math.atan2(dz, len));
      leg.translate(tx + a * w0 / 2, y + y0, tz + b * w0 / 2);
      P.plain.push({ g: leg, c });
    });
    if (i % 2 === 0) P.plain.push({ g: box(w1 + .05, .06, .08, tx, y + y1, tz - w1 / 2), c }, { g: box(w1 + .05, .06, .08, tx, y + y1, tz + w1 / 2), c }, { g: box(.08, .06, w1 + .05, tx - w1 / 2, y + y1, tz), c }, { g: box(.08, .06, w1 + .05, tx + w1 / 2, y + y1, tz), c });
  }
  P.body.push({ g: box(1.1, .55, 1.1, tx, y + 5.2, tz), c: '#fff6ec' });
  P.plain.push({ g: box(.6, .35, .6, tx, y + 9.6, tz), c: '#fff6ec' });
  P.plain.push({ g: cyl(.04, .1, 3.2, 6, tx, y + H, tz), c: '#e8402f' });
  P.glow.push({ g: box(.16, .16, .16, tx, y + H + 3.2, tz), c: '#ff3b3b', blink: true });
  P.glow.push({ g: box(1.12, .12, 1.12, tx, y + 5.5, tz), c: '#ffb34a', night: true });
  reserve(P, tx, tz, 3, 3);
  P.top = 18;
};

/* ODAIBA — Fuji TV, roda-gigante da Palette Town, Big Sight e a Liberdade */
L.odaiba = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  P.platColor = '#f1e6c8';
  /* calçadão e praia */
  P.ground.push({ g: box(P.rx * 1.6, .03, 1.2, X - .8, y - .02, Z + P.rz * .78), c: '#f6e7b9' });
  /* Fuji TV: dois blocos ligados por grelha + a esfera prateada */
  const fx = X - 2.4, fz = Z - 1.6;
  P.body.push({ g: box(1.4, 5.6, 1.6, fx - 1.4, y, fz), c: '#e9edf0' }, { g: box(1.4, 5.6, 1.6, fx + 1.4, y, fz), c: '#e9edf0' });
  for (let k = 1; k <= 4; k++) P.plain.push({ g: box(4.2, .14, 1.4, fx, y + k * 1.3, fz), c: '#b9c3cb' });
  for (let k = -1; k <= 1; k++) P.plain.push({ g: box(.14, 5.6, 1.4, fx + k * .7, y, fz), c: '#b9c3cb' });
  P.plain.push({ g: sphere(1.15, fx, y + 4.4, fz, 2), c: '#c9d1d8' });
  P.glow.push({ g: box(1.2, .25, .05, fx, y + 1.2, fz + .85), c: '#28e0ff' });
  reserve(P, fx, fz, 4.4, 2.2);
  /* Tokyo Big Sight: pirâmides invertidas */
  const bx = X + 2.6, bz = Z + 1.6;
  P.body.push({ g: box(.6, 1.2, .6, bx - .9, y, bz), c: '#d7dfe5' }, { g: box(.6, 1.2, .6, bx + .9, y, bz), c: '#d7dfe5' });
  [-.9, .9].forEach(o => P.plain.push({ g: cyl(1.1, .3, 1.2, 4, bx + o, y + 1.2, bz, Math.PI / 4), c: '#b7c3cc' }));
  reserve(P, bx, bz, 3.8, 2);
  /* Estátua da Liberdade (réplica de 2000) */
  P.plain.push({ g: box(.4, .4, .4, X - 4.6, y, Z + 1.8), c: '#d9d2c6' }, { g: cyl(.08, .14, .8, 6, X - 4.6, y + .4, Z + 1.8), c: '#6fbfa6' }, { g: cyl(.03, .03, .35, 4, X - 4.52, y + 1.1, Z + 1.8), c: '#6fbfa6' });
  P.glow.push({ g: sphere(.07, X - 4.52, y + 1.48, Z + 1.8, 0), c: '#ffd27a' });
  P.wheelAt = { x: X + 1.6, z: Z - 2.4 };
  reserve(P, X + 1.6, Z - 2.4, 2.4, 1.6);
  trees(P, r, Array.from({ length: 16 }, () => [X + (r() - .5) * P.rx * 1.5, Z + P.rz * (.35 + r() * .35)]), ['#5aa84f', '#4e9a45'], .35);
  P.top = 9;
};

/* HARAJUKU — Meiji-jingū (torii e floresta), Takeshita-dōri, estação em estilo enxaimel */
L.harajuku = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  /* floresta do santuário no oeste */
  const forest = [];
  for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); const fx = X - 3 + Math.cos(a) * d * 2.6, fz = Z + Math.sin(a) * d * 3.4; forest.push([fx, fz]); }
  trees(P, r, forest, ['#2f6b35', '#3c7d3c', '#4e9a45'], .55);
  reserve(P, X - 3, Z, 5.4, 7);
  /* grande torii de madeira */
  const tx = X - .6, tz = Z + .2;
  P.plain.push({ g: cyl(.13, .15, 2, 8, tx, y, tz - .8), c: '#7a5a3c' }, { g: cyl(.13, .15, 2, 8, tx, y, tz + .8), c: '#7a5a3c' });
  P.plain.push({ g: box(.22, .2, 2.4, tx, y + 2, tz), c: '#6b4a32' }, { g: box(.16, .14, 1.9, tx, y + 1.6, tz), c: '#7a5a3c' });
  /* estação de Harajuku: branca com madeira aparente e telhado verde-escuro */
  const sx = X + .6, sz = Z + 2.6;
  P.plain.push({ g: box(1.6, .9, 1, sx, y, sz), c: '#f6f1e6' });
  [-.6, -.2, .2, .6].forEach(o => P.plain.push({ g: box(.05, .9, 1.02, sx + o, y, sz), c: '#6b4a32' }));
  P.plain.push({ g: gable(1.7, 1.1, .6, sx, y + .9, sz), c: '#2f4a3f' }, { g: gable(.5, .8, .7, sx + .3, y + .9, sz + .3, Math.PI / 2), c: '#2f4a3f' });
  P.plain.push({ g: box(.18, .5, .18, sx - .4, y + 1.3, sz), c: '#6b4a32' });
  reserve(P, sx, sz, 2, 1.4);
  /* Takeshita-dōri: arco de entrada colorido */
  const kx = X + 1.6, kz = Z - .6;
  P.plain.push({ g: box(.1, 1.6, .1, kx, y, kz - .45), c: '#3a3542' }, { g: box(.1, 1.6, .1, kx, y, kz + .45), c: '#3a3542' });
  P.glow.push({ g: box(.14, .35, 1.1, kx, y + 1.5, kz), c: '#ff5fb3' });
  streets(P, [{ ax: 0, at: -.6, w: .55 }]);
  /* Omotesandō: zelkovas */
  const zel = []; for (let i = 0; i < 7; i++) zel.push([X + .6 + i * .65, Z + 1.4]);
  trees(P, r, zel, '#5aa84f', .3);
  P.top = 3.2;
};

/* NAKANO — Sun Plaza (o prédio-triângulo), Sun Mall coberto e o Broadway */
L.nakano = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  streets(P, [{ ax: 0, at: 2.6, w: .8 }]);
  /* trilhos da Chūō e a estação */
  P.plain.push({ g: box(P.rx * 2.4, .25, .8, X, y + .2, Z + 3.2), c: '#5a5e66' });
  P.glow.push({ g: box(P.rx * 2.38, .06, .12, X, y + .48, Z + 3.0), c: '#ff8a2b' });
  /* Nakano Sun Plaza: perfil triangular branco */
  const sx = X - 2.6, sz = Z + 1.4;
  P.body.push({ g: prism([[-2, 0], [2, 0], [2, .6], [-1.6, 6.2], [-2, 6.2]], 1.6, sx, y, sz), c: '#f1ede4' });
  reserve(P, sx, sz, 4.4, 2);
  /* Sun Mall: galeria coberta até o Broadway */
  const mx = X + .6;
  for (let i = 0; i < 6; i++) { const z = Z + 1.6 - i * .75; [-1, 1].forEach(s => { P.plain.push({ g: box(.6, .9, .65, mx + s * .62, y, z), c: '#efe9de' }); P.glow.push({ g: box(.05, .2, .55, mx + s * .31, y + .7, z), c: NEON[(i + (s > 0 ? 3 : 0)) % NEON.length] }); }); }
  P.plain.push({ g: gable(.75, 4.6, .35, mx, y + .95, Z - .3, Math.PI / 2), c: '#bfe6f2' });
  reserve(P, mx, Z - .3, 2.2, 4.8);
  /* Nakano Broadway: o "condomínio-shopping" comprido */
  const bx = X + .4, bz = Z - 3.2;
  P.body.push({ g: box(4.6, 1.4, 1.8, bx, y, bz), c: '#d9d2c6' }, { g: box(4.2, 3.2, 1.4, bx, y + 1.4, bz), c: '#e6e0d4' });
  P.glow.push({ g: box(2.4, .4, .06, bx, y + 1, bz + .92), c: '#ffd21f' });
  reserve(P, bx, bz, 5, 2.2);
  P.top = 6.5;
};

/* KICHIJŌJI — Parque Inokashira (lago, pedalinhos de cisne), Harmonica Yokochō */
L.kichijoji = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  P.platColor = '#e4ecd2';
  /* lago */
  const px = X - 1.2, pz = Z + 1.6;
  const pond = new T.CircleGeometry(1, 36); pond.rotateX(-Math.PI / 2); pond.scale(3.6, 1, 1.6); pond.translate(px, y + .02, pz);
  P.water.push({ g: pond, c: '#7fc6e6' });
  const rim = new T.RingGeometry(1, 1.06, 36); rim.rotateX(-Math.PI / 2); rim.scale(3.6, 1, 1.6); rim.translate(px, y + .03, pz);
  P.ground.push({ g: rim, c: '#3a3640' });
  /* pedalinhos de cisne */
  for (let i = 0; i < 4; i++) { const a = r() * 6.28, d = .3 + r() * .5; const bx = px + Math.cos(a) * 3.6 * d, bz = pz + Math.sin(a) * 1.6 * d; P.plain.push({ g: box(.3, .14, .18, bx, y + .03, bz), c: '#ffffff' }, { g: cyl(.03, .04, .2, 5, bx + .12, y + .15, bz), c: '#ffffff' }); }
  /* ponte e o santuário de Benzaiten */
  P.plain.push({ g: box(.4, .08, 3.4, px + 1.2, y + .15, pz), c: '#c8322b' });
  P.plain.push({ g: box(.6, .45, .5, px - 2.4, y, pz - .3), c: '#c8322b' }); jroof(P, .7, .55, px - 2.4, y + .45, pz - .3, 0, '#2a2730');
  /* cerejeiras ao redor do lago */
  const ring = []; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28; ring.push([px + Math.cos(a) * 4.2, pz + Math.sin(a) * 2.2]); }
  trees(P, r, ring, ['#f7b3cf', '#f9c7dc', '#5aa84f'], .42);
  reserve(P, px, pz, 9.6, 5);
  /* estação e trilhos */
  P.plain.push({ g: box(P.rx * 2.4, .3, .8, X, y + 1.4, Z - 2.6), c: '#5a5e66' });
  P.body.push({ g: box(2.6, 1.3, 1.2, X + .8, y, Z - 2.6), c: '#e3ddd2' });
  /* Harmonica Yokochō: barraquinhas com lanternas */
  for (let i = 0; i < 5; i++) { P.plain.push({ g: box(.4, .5, .4, X - 2 + i * .45, y, Z - 1.5), c: '#7a5a3c' }); P.glow.push({ g: sphere(.08, X - 2 + i * .45, y + .58, Z - 1.28, 0), c: '#ff6a3a', night: true }); }
  P.top = 3;
};

/* MEGURO — o rio Meguro e o túnel de cerejeiras */
L.meguro = (P, r) => {
  const y = P.y0, X = P.cx, Z = P.cz;
  const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24, x = -P.rx * 1.05 + t * P.rx * 2.1; pts.push([X + x, Z + Math.sin(t * 3.2) * .9 + .3]); }
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), ang = -Math.atan2(dz, dx);
    P.ground.push({ g: box(len + .05, .05, 1.2, (ax + bx) / 2, y - .03, (az + bz) / 2, ang), c: '#9a948c' });
    P.water.push({ g: box(len + .05, .04, .8, (ax + bx) / 2, y - .01, (az + bz) / 2, ang), c: '#6fb6d8' });
    reserve(P, (ax + bx) / 2, (az + bz) / 2, len + .3, 2.3);
  }
  /* cerejeiras dos dois lados */
  const sak = []; pts.forEach(([x, z], i) => { if (i % 1 === 0) { sak.push([x, z - .95], [x + .15, z + .95]); } });
  trees(P, r, sak, ['#f7b3cf', '#f9c7dc', '#f2a2c4'], .42);
  /* pontezinhas */
  [5, 12, 19].forEach(i => { const [x, z] = pts[i]; P.plain.push({ g: box(.6, .1, 1.6, x, y + .1, z), c: '#c9c2b4' }); });
  /* Meguro Gajoen (torre) */
  P.body.push({ g: box(1.4, 4.2, 1.2, X + 2.6, y, Z - 2.6), c: '#e3dccf' });
  reserve(P, X + 2.6, Z - 2.6, 1.8, 1.6);
  P.top = 4.5;
};

/* ==========================================================
   construção de um distrito
   ========================================================== */
export function buildDistrict(id, b, acc, wx, wz) {
  const r = rng(hash(id + ':v2'));
  const P = {
    id, cx: wx(b.cx), cz: wz(b.cy), rx: b.w / 20 * .8, rz: b.h / 20 * .8, y0: .35,
    body: [], plain: [], glow: [], ground: [], water: [], streets: [], reserve: [], top: 3, acc
  };
  if (L[id]) L[id](P, r);
  fill(P, id, r);
  const glowNight = P.glow.filter(p => p.night), glowBlink = P.glow.filter(p => p.blink), glowScreen = P.glow.filter(p => p.screen), glowAll = P.glow.filter(p => !p.night && !p.blink && !p.screen);
  return {
    cx: P.cx, cz: P.cz, rx: P.rx, rz: P.rz, top: P.top + P.y0, platColor: P.platColor, wheelAt: P.wheelAt,
    body: P.body.length ? merge(P.body) : null,
    plain: P.plain.length ? merge(P.plain) : null,
    glow: glowAll.length ? merge(glowAll) : null,
    glowNight: glowNight.length ? merge(glowNight) : null,
    glowBlink: glowBlink.length ? merge(glowBlink) : null,
    glowScreen: glowScreen.length ? merge(glowScreen) : null,
    ground: P.ground.length ? merge(P.ground) : null,
    water: P.water.length ? merge(P.water) : null
  };
}

/* ==========================================================
   AMBIENTE
   ========================================================== */

/* céu em gradiente (cúpula) */
export function sky() {
  const u = { top: { value: new T.Color('#f3b8cf') }, mid: { value: new T.Color('#fbe3ec') }, bot: { value: new T.Color('#fff4f0') } };
  const m = new T.ShaderMaterial({
    uniforms: u, side: T.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bot, smoothstep(0.0, -0.2, h)); gl_FragColor = vec4(c, 1.0); }'
  });
  const mesh = new T.Mesh(new T.SphereGeometry(1500, 32, 16), m);
  mesh.renderOrder = -10; mesh.frustumCulled = false;
  return { mesh, u };
}
/* estrelas */
export function stars() {
  const r = rng(99), pos = [];
  for (let i = 0; i < 700; i++) { const a = r() * Math.PI * 2, e = .12 + r() * 1.2; pos.push(Math.cos(a) * Math.cos(e) * 1400, Math.sin(e) * 1400, Math.sin(a) * Math.cos(e) * 1400); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  return new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .9, depthWrite: false }));
}
/* Monte Fuji ao longe (oeste) */
export function fuji() {
  const g = new T.Group();
  const body = new T.Mesh(new T.ConeGeometry(95, 46, 48, 1, true), new T.MeshBasicMaterial({ color: 0x8d9fc2, fog: false }));
  body.position.y = 23;
  const cap = new T.Mesh(new T.ConeGeometry(30.5, 14.8, 48), new T.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  cap.position.y = 46 - 7.4;
  g.add(body, cap);
  g.position.set(-40, -6, -380); g.scale.set(1.5, 1.5, 1.5);
  return { g, body: body.material, cap: cap.material };
}
/* sol / lua */
export function orb() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 10, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.95)'); gr.addColorStop(.42, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  const s = new T.Sprite(new T.SpriteMaterial({ map: t, color: 0xfff1c8, fog: false, depthWrite: false, transparent: true }));
  s.scale.set(60, 60, 1); s.renderOrder = -9;
  return s;
}

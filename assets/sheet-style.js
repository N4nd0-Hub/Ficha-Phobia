/* ==========================================================
   PERSONA // PHOBIA — sheet-style.js
   Personalização da ficha (botão VISUAL): temas prontos, cores
   livres, cor-assinatura, fontes, painel lateral, movimento e
   código para compartilhar. Tudo fica salvo na ficha do personagem
   (state.charSheet.ui.hud), então cada personagem tem a sua cara.
   ========================================================== */
(function () {
  'use strict';
  if (window.__sheetStyle) return; window.__sheetStyle = true;

  var KEYS = ['acc', 'acc2', 'acc3', 'bg', 'card', 'card2', 'black', 'paper'];
  var LABELS = {
    acc: ['Destaque', 'Painel lateral, abas, títulos'],
    acc2: ['Destaque 2', 'PM, links, detalhes'],
    acc3: ['Destaque 3', 'PV, sucesso, contadores'],
    bg: ['Fundo', 'Fundo da página'],
    card: ['Cartões', 'Blocos e caixas'],
    card2: ['Cartões 2', 'Caixas internas'],
    black: ['Sombra / campos', 'Campos, contornos, sombras'],
    paper: ['Texto', 'Letras e números']
  };
  var PRESETS = [
    { id: 'naoya', site: 'midnight', name: 'NAOYA', tag: 'A linha do espelho', fx: 'naoya', c: { acc: '#a77bff', acc2: '#dfe3ee', acc3: '#c9b6ff', bg: '#101218', card: '#1c1f28', card2: '#171a22', black: '#08090d', paper: '#eef0f7' } },
    { id: 'tatsuya', site: 'joker', name: 'TATSUYA', tag: 'Borboletas e chamas', fx: 'tatsuya', c: { acc: '#e3242b', acc2: '#f5a524', acc3: '#ff7a2e', bg: '#120707', card: '#241111', card2: '#1c0c0c', black: '#070303', paper: '#fff1e2' } },
    { id: 'maya', site: 'violet', name: 'MAYA', tag: 'Neon e corações cósmicos', fx: 'maya', c: { acc: '#ff2fa8', acc2: '#2fe3ea', acc3: '#fff27a', bg: '#100a1c', card: '#21163a', card2: '#1a1130', black: '#090511', paper: '#fff0fa' } },
    { id: 'makoto', site: 'makoto', name: 'MAKOTO', tag: 'Hora Sombria', fx: 'makoto', c: { acc: '#3d8bff', acc2: '#6dffc2', acc3: '#9dffd6', bg: '#050d1f', card: '#0c1a36', card2: '#09152c', black: '#02060f', paper: '#e4f2ff' } },
    { id: 'kotone', site: 'sakura', name: 'KOTONE', tag: 'Pôr do sol e fones', fx: 'kotone', c: { acc: '#ff86b8', acc2: '#ffab52', acc3: '#ffd98a', bg: '#26120e', card: '#3a1e1b', card2: '#301815', black: '#170a08', paper: '#fff4ec' } },
    { id: 'narukami', site: 'graphite', name: 'NARUKAMI', tag: 'Flores ao vento', fx: 'narukami', c: { acc: '#f7c51e', acc2: '#c3c7cf', acc3: '#ffe36b', bg: '#17181c', card: '#26282e', card2: '#1f2126', black: '#0b0c0e', paper: '#f7f3e6' } },
    { id: 'joker', site: 'joker', name: 'JOKER', tag: 'Ladrão de corações', fx: 'joker', c: { acc: '#e5101c', acc2: '#ffffff', acc3: '#ff3a44', bg: '#0a0909', card: '#171313', card2: '#110e0e', black: '#000000', paper: '#ffffff' } },
    { id: 'phobia', site: 'cream', name: 'PHOBIA', tag: 'Padrão', c: { acc: '#ef2b97', acc2: '#6ce6ff', acc3: '#96ff45', bg: '#141523', card: '#1b1e33', card2: '#151729', black: '#0d0c10', paper: '#fff0d8' } },
    { id: 'rubro', site: 'joker', name: 'RUBRO', tag: 'Vermelho e preto', c: { acc: '#e8202a', acc2: '#f4ece2', acc3: '#ffcc33', bg: '#0e0b0b', card: '#1d1515', card2: '#160f10', black: '#060505', paper: '#f7efe6' } },
    { id: 'mare', site: 'makoto', name: 'MARÉ', tag: 'Azul profundo', c: { acc: '#2f8cff', acc2: '#8fe9ff', acc3: '#c6ff5c', bg: '#08132a', card: '#122242', card2: '#0d1a34', black: '#040a17', paper: '#e9f6ff' } },
    { id: 'sakura', site: 'sakura', name: 'SAKURA', tag: 'Rosa e pêssego', c: { acc: '#ff5c9d', acc2: '#ffc29a', acc3: '#ffe36e', bg: '#1d0f18', card: '#2d1726', card2: '#24121f', black: '#0f070c', paper: '#fff0f4' } },
    { id: 'veneno', site: 'violet', name: 'VENENO', tag: 'Ácido e roxo', c: { acc: '#a6ff2e', acc2: '#c77dff', acc3: '#3dfcd1', bg: '#110c1c', card: '#1e1630', card2: '#181127', black: '#08060d', paper: '#f1ffe4' } },
    { id: 'ouro', site: 'graphite', name: 'OURO', tag: 'Dourado e preto', c: { acc: '#f2b632', acc2: '#fff1c9', acc3: '#ff6b3d', bg: '#0f0d09', card: '#1d1a12', card2: '#16130d', black: '#070604', paper: '#fff5df' } },
    { id: 'violeta', site: 'violet', name: 'VIOLETA', tag: 'Clube noturno', c: { acc: '#b45cff', acc2: '#ff8ad8', acc3: '#7cf0ff', bg: '#140a22', card: '#24143a', card2: '#1c1030', black: '#0a0512', paper: '#f8edff' } },
    { id: 'gelo', site: 'ice', name: 'GELO', tag: 'Ciano e branco', c: { acc: '#38d6f5', acc2: '#ffffff', acc3: '#ffd86b', bg: '#0b1820', card: '#142a36', card2: '#10222d', black: '#050c11', paper: '#effbff' } },
    { id: 'crepusculo', site: 'midnight', name: 'CREPÚSCULO', tag: 'Laranja e roxo', c: { acc: '#ff7a2f', acc2: '#ff4f9a', acc3: '#ffd23f', bg: '#170d1f', card: '#281632', card2: '#201129', black: '#0b0610', paper: '#fff1e6' } },
    { id: 'grafite', site: 'graphite', name: 'GRAFITE', tag: 'Cinza e magenta', c: { acc: '#ff4fa3', acc2: '#d9dbe3', acc3: '#9be7c4', bg: '#131417', card: '#22242a', card2: '#1b1c21', black: '#08090b', paper: '#f2f2f0' } }
  ];
  var FONTS = [
    { id: 'p5', name: 'ORIGINAL', sample: 'PHOBIA 20', d: '"Archivo Black","Arial Black",Arial,sans-serif', c: '"Barlow Condensed","Arial Narrow",Arial,sans-serif', b: 'Barlow,"Arial Narrow",Arial,sans-serif', radar: 'original' },
    { id: 'tabloide', name: 'TABLOIDE', sample: 'PHOBIA 20', d: 'Impact,"Haettenschweiler","Archivo Black","Arial Black",sans-serif', c: '"Arial Narrow","Barlow Condensed",Arial,sans-serif', b: 'Arial,Barlow,sans-serif', radar: 'original' },
    { id: 'arcade', name: 'ARCADE', sample: 'PHOBIA 20', d: '"Silkscreen","Courier New",monospace', c: '"Silkscreen","Courier New",monospace', b: 'Barlow,"Arial Narrow",Arial,sans-serif', radar: 'pixel' },
    { id: 'dossie', name: 'DOSSIÊ', sample: 'Phobia 20', d: '"Special Elite","Courier New",monospace', c: '"Special Elite","Courier New",monospace', b: '"Courier New",Courier,monospace', radar: 'terminal' },
    { id: 'toquio', name: 'TÓQUIO', sample: 'PHOBIA 20', d: '"Noto Sans JP","Archivo Black",sans-serif', c: '"Barlow Condensed","Arial Narrow",sans-serif', b: 'Barlow,Arial,sans-serif', radar: 'original' },
    { id: 'diario', name: 'DIÁRIO', sample: 'Phobia 20', d: 'Caveat,"Comic Sans MS",cursive', c: '"Barlow Condensed","Arial Narrow",sans-serif', b: 'Barlow,Arial,sans-serif', radar: 'magazine' }
  ];
  var SLABS = [
    { id: 'dots', name: 'PONTOS' }, { id: 'stripes', name: 'LISTRAS' },
    { id: 'grid', name: 'XADREZ' }, { id: 'flat', name: 'LISO' }
  ];
  var SLAB_SRC = [{ id: 'acc', name: 'Destaque' }, { id: 'acc2', name: 'Destaque 2' }, { id: 'acc3', name: 'Destaque 3' }];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function preset(id) { for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i]; return PRESETS[0]; }
  function font(id) { for (var i = 0; i < FONTS.length; i++) if (FONTS[i].id === id) return FONTS[i]; return FONTS[0]; }
  function hexOk(v) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v); }

  function cfg() {
    if (typeof ensureCharacterUI !== 'function') return null;
    var ui = ensureCharacterUI();
    var h = ui.hud || (ui.hud = {});
    if (!h.preset) h.preset = 'phobia';
    if (!h.colors) h.colors = {};
    if (!h.font) h.font = 'p5';
    if (!h.slab) h.slab = 'dots';
    if (!h.slabFrom) h.slabFrom = 'acc';
    if (!h.motion) h.motion = 'full';
    return h;
  }
  function colors(h) {
    var base = preset(h.preset).c, out = {};
    KEYS.forEach(function (k) { out[k] = hexOk(h.colors[k]) ? h.colors[k] : base[k]; });
    return out;
  }

  /* ---------- cor ---------- */
  function hex2hsl(hex) {
    var r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      var d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  function hsl2hex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
    var a = s * Math.min(l, 1 - l);
    function f(n) { var k = (n + h / 30) % 12; var c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return ('0' + Math.round(c * 255).toString(16)).slice(-2); }
    return '#' + f(0) + f(8) + f(4);
  }
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  /* uma cor -> paleta inteira */
  function fromSignature(hex) {
    var t = hex2hsl(hex), h = t[0], s = Math.max(55, t[1]);
    return {
      acc: hsl2hex(h, s, Math.min(64, Math.max(50, t[2]))),
      acc2: hsl2hex(h + 165, 85, 72),
      acc3: hsl2hex(h + 95, 90, 62),
      bg: hsl2hex(h, 32, 8),
      card: hsl2hex(h, 30, 14),
      card2: hsl2hex(h, 30, 11),
      black: hsl2hex(h, 35, 4),
      paper: hsl2hex(h + 20, 70, 94)
    };
  }

  /* ---------- aplicar ---------- */
  var styleEl;
  function apply() {
    var h = cfg(); if (!h) return;
    var c = colors(h), f = font(h.font);
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'sheetStyleVars'; document.head.appendChild(styleEl); }
    var vars = KEYS.map(function (k) { return '--hud-' + k + ':' + c[k] + '!important'; });
    vars.push('--hud-ink:' + c.paper + '!important', '--hud-page:' + c.bg + '!important',
      '--hud-mute:color-mix(in srgb,' + c.paper + ' 64%,transparent)!important',
      '--hud-display:' + f.d + '!important', '--hud-cond:' + f.c + '!important', '--hud-body:' + f.b + '!important',
      '--theme-accent:' + c.acc + '!important', '--theme-accent-2:' + c.acc2 + '!important', '--theme-accent-3:' + c.acc3 + '!important',
      '--theme-surface:' + c.card + '!important', '--theme-surface-2:' + c.card2 + '!important', '--theme-panel:' + c.card + '!important',
      '--theme-ink:' + c.paper + '!important', '--theme-input:' + c.black + '!important', '--theme-input-ink:' + c.paper + '!important',
      '--hs-slab:' + c[h.slabFrom] + '!important', '--hs-on-slab:' + (contrast(c[h.slabFrom], c.black) > contrast(c[h.slabFrom], c.paper) ? c.black : c.paper) + '!important');
    var glob = ['--theme-accent:' + c.acc, '--theme-accent-2:' + c.acc2, '--theme-accent-3:' + c.acc3,
      '--hud-acc:' + c.acc, '--hud-acc2:' + c.acc2, '--hud-acc3:' + c.acc3, '--hud-black:' + c.black, '--hud-paper:' + c.paper,
      '--hud-card:' + c.card, '--hud-card2:' + c.card2, '--hud-display:' + f.d, '--hud-cond:' + f.c, '--hud-body:' + f.b,
      '--dk-acc:' + c.acc, '--dk-acc2:' + c.acc2, '--dk-acc3:' + c.acc3].map(function (v) { return v + '!important'; });
    styleEl.textContent =
      /* o site inteiro (mapa, guia, agenda, barra de baixo) usa os destaques e letras do visual */
      'body.hud,body.hud .sheet-ui-backdrop{' + glob.join(';') + '}' +
      'body.hud.workspace-sheet,body.hud.workspace-sheet .site>#characterPage,body.hud.workspace-sheet #characterPage,body.hud.workspace-sheet .sheet-ui-backdrop{' + vars.join(';') + '}';
    var b = document.body;
    b.dataset.hsSlab = h.slab;
    b.classList.toggle('hs-calm', h.motion === 'calm');
    applyFx(h);
    // compatibilidade com o hexágono social (fonte)
    try { var ui = ensureCharacterUI(); if (ui.font !== f.radar) { ui.font = f.radar; var p = document.getElementById('characterPage'); if (p) p.dataset.coreFont = f.radar; } } catch (e) {}
    try { if (typeof renderSocialVisualization === 'function') renderSocialVisualization(); } catch (e) {}
    paintPanel();
  }

  function save() { try { saveState(true); } catch (e) {} }
  /* o tema do mapa acompanha o tema escolhido aqui */
  function syncSite(id) {
    var t = preset(id).site;
    try { if (t && typeof applySiteTheme === 'function' && state.siteTheme !== t) applySiteTheme(t, false); } catch (e) {}
  }
  function set(fn) { var h = cfg(); if (!h) return; fn(h); apply(); save(); }

  /* ---------- painel ---------- */
  var panel = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  function card(p) {
    return '<button type="button" class="hs-preset' + (p.fx ? ' is-special fx-' + p.fx : '') + '" data-hs-preset="' + p.id + '" style="--p1:' + p.c.acc + ';--p2:' + p.c.acc2 + ';--p3:' + p.c.acc3 + ';--pb:' + p.c.bg + ';--pc:' + p.c.card + ';--pt:' + p.c.paper + '">' +
      '<span class="hs-preset-art"><i></i><i></i><i></i><em>Aa</em></span>' +
      '<b>' + p.name + '</b><small>' + p.tag + '</small></button>';
  }

  /* ---------- efeitos dos temas especiais ---------- */
  var FLOWER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 24 24"><g fill="COLOR">' +
    [0, 72, 144, 216, 288].map(function (a) { return '<ellipse cx="0" cy="-6" rx="3.6" ry="6" transform="rotate(' + a + ')"/>'; }).join('') +
    '</g><circle r="2.6" fill="CORE"/></svg>');
  function flower(c, core) { return "url('" + FLOWER.replace('COLOR', encodeURIComponent(c)).replace('CORE', encodeURIComponent(core)) + "')"; }
  var fxBuilt = {};
  function fxLayer(id, top) {
    var el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
    if (top) el.className = 'hs-fx-top'; else el.className = 'hs-fx-back';
    return el;
  }
  function buildFx(kind) {
    var back = fxLayer('hsFxBack'), top = fxLayer('hsFxTop', true);
    if (fxBuilt.kind === kind) return;
    fxBuilt.kind = kind; back.innerHTML = ''; top.innerHTML = '';
    if (kind === 'makoto') {
      back.innerHTML = '<i class="mk-sky"></i><i class="mk-moon"></i><i class="mk-mist a"></i><i class="mk-mist b"></i><i class="mk-scan"></i><i class="mk-clock">00:00</i>';
    } else if (kind === 'narukami') {
      back.innerHTML = '<i class="nk-fog a"></i><i class="nk-fog b"></i><i class="nk-static"></i>';
      var cols = [['#ffd84a', '#fff4c2'], ['#fff6dc', '#f7c51e'], ['#c9ccd4', '#ffe36b'], ['#ffe36b', '#fffbe9']], html = '';
      for (var i = 0; i < 20; i++) {
        var c = cols[i % cols.length], size = 14 + Math.round(Math.random() * 16), dur = 9 + Math.random() * 9;
        html += '<span class="nk-fall" style="left:' + (Math.random() * 100).toFixed(1) + '%;animation-duration:' + dur.toFixed(1) + 's;animation-delay:-' + (Math.random() * dur).toFixed(1) + 's">' +
          '<span class="nk-sway" style="animation-duration:' + (2.6 + Math.random() * 2.4).toFixed(1) + 's">' +
          '<i style="width:' + size + 'px;height:' + size + 'px;background-image:' + flower(c[0], c[1]) + ';animation-duration:' + (3 + Math.random() * 5).toFixed(1) + 's;animation-direction:' + (i % 2 ? 'reverse' : 'normal') + '"></i></span></span>';
      }
      top.innerHTML = html;
    } else if (kind === 'naoya') {
      back.innerHTML = '<i class="ny-base"></i><i class="ny-vhs"></i><i class="ny-noise"></i><i class="ny-track"></i><i class="ny-track b"></i><i class="ny-ghost"></i><i class="ny-vig"></i><i class="ny-rec">▶ PLAY &nbsp;SP 0:00:00</i>' +
        '<svg class="ny-mirror" viewBox="0 0 400 400"><path d="M200 200L40 30M200 200L370 60M200 200L390 260M200 200L250 395M200 200L20 330M200 200L120 0M120 112L170 48M262 132L330 120M300 236L360 300M220 300L180 360M110 260L60 250"/></svg>';
    } else if (kind === 'tatsuya') {
      back.innerHTML = '<i class="ts-base"></i><svg class="ts-heat-svg" aria-hidden="true"><filter id="tsHeat"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="3"><animate attributeName="baseFrequency" dur="9s" values="0.012 0.06;0.016 0.09;0.012 0.06" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" scale="34"/></filter></svg>' +
        '<div class="ts-flames"><i class="f1"></i><i class="f2"></i><i class="f3"></i><i class="f4"></i><i class="f5"></i></div><i class="ts-embers"></i><i class="ts-vig"></i>';
      var bh = '';
      for (var k = 0; k < 9; k++) {
        var d2 = 14 + Math.random() * 12, sz = 26 + Math.round(Math.random() * 22);
        bh += '<span class="ts-fly" style="left:' + (4 + Math.random() * 92).toFixed(1) + '%;animation-duration:' + d2.toFixed(1) + 's;animation-delay:-' + (Math.random() * d2).toFixed(1) + 's">' +
          '<span class="ts-drift" style="animation-duration:' + (3 + Math.random() * 3).toFixed(1) + 's"><svg class="ts-bfly" viewBox="-30 -24 60 48" style="width:' + sz + 'px;animation-duration:' + (0.28 + Math.random() * 0.25).toFixed(2) + 's">' +
          '<path class="w l" d="M-1 -2C-10 -22-28 -22-27 -10C-26 0-14 2-3 1C-16 5-22 17-12 20C-5 22-1 10-1 2Z"/><path class="w r" d="M1 -2C10 -22 28 -22 27 -10C26 0 14 2 3 1C16 5 22 17 12 20C5 22 1 10 1 2Z"/><path class="bd" d="M0 -8V14"/></svg></span></span>';
      }
      top.innerHTML = bh;
    } else if (kind === 'maya') {
      back.innerHTML = '<i class="my-base"></i><i class="my-grid"></i><i class="my-halo a"></i><i class="my-halo b"></i>';
      var st = '', hs = '';
      for (var q = 0; q < 26; q++) {
        st += '<i class="my-star" style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;--s:' + (8 + Math.random() * 16).toFixed(0) + 'px;animation-duration:' + (1.6 + Math.random() * 2.6).toFixed(1) + 's;animation-delay:-' + (Math.random() * 3).toFixed(1) + 's"></i>';
      }
      for (var w = 0; w < 9; w++) {
        var d3 = 16 + Math.random() * 14;
        hs += '<span class="my-rise" style="left:' + (Math.random() * 96).toFixed(1) + '%;animation-duration:' + d3.toFixed(1) + 's;animation-delay:-' + (Math.random() * d3).toFixed(1) + 's"><svg class="my-heart' + (w % 3 === 1 ? ' cy' : '') + '" viewBox="-12 -11 24 22" style="width:' + (18 + Math.round(Math.random() * 20)) + 'px;animation-duration:' + (1 + Math.random() * .8).toFixed(2) + 's"><path d="M0 9C-9 3-11-2-10-5C-9-9-4-10 0-5C4-10 9-9 10-5C11-2 9 3 0 9Z"/></svg></span>';
      }
      back.innerHTML += st;
      top.innerHTML = hs;
    } else if (kind === 'kotone') {
      back.innerHTML = '<i class="kt-sky"></i><i class="kt-sun"></i><i class="kt-cloud a"></i><i class="kt-cloud b"></i><i class="kt-shade"></i>';
      var eqb = '';
      for (var e = 0; e < 64; e++) eqb += '<b style="animation-duration:' + (0.7 + Math.random() * 1.1).toFixed(2) + 's;animation-delay:-' + (Math.random() * 1.5).toFixed(2) + 's"></b>';
      back.innerHTML += '<div class="kt-eq">' + eqb + '</div><svg class="kt-wave" viewBox="0 0 1200 120" preserveAspectRatio="none"><path class="a" d="M0 60Q150 10 300 60T600 60T900 60T1200 60"/><path class="b" d="M0 70Q150 120 300 70T600 70T900 70T1200 70"/></svg>';
      var pt = '', pc = [['#ffc2d9', '#ffe7a6'], ['#ffb0cb', '#fff1c9'], ['#ffd0e0', '#ffc76b']];
      for (var r = 0; r < 9; r++) {
        var c2 = pc[r % 3], d4 = 12 + Math.random() * 10, sz2 = 12 + Math.round(Math.random() * 10);
        pt += '<span class="nk-fall" style="left:' + (Math.random() * 100).toFixed(1) + '%;animation-duration:' + d4.toFixed(1) + 's;animation-delay:-' + (Math.random() * d4).toFixed(1) + 's">' +
          '<span class="nk-sway" style="animation-duration:' + (2.8 + Math.random() * 2.4).toFixed(1) + 's">' +
          '<i class="kt-petal" style="width:' + sz2 + 'px;height:' + sz2 + 'px;background-image:' + flower(c2[0], c2[1]) + ';animation-duration:' + (3 + Math.random() * 4).toFixed(1) + 's"></i></span></span>';
      }
      top.innerHTML = pt;
    } else if (kind === 'joker') {
      back.innerHTML = '<i class="jk-tone"></i><i class="jk-band a"></i><i class="jk-band b"></i><i class="jk-star"></i>' +
        '<svg class="jk-city" viewBox="0 0 1200 220" preserveAspectRatio="none"><path d="M0 220V150h40v-40h30v-30h20v70h35V60h50v90h25V100h30v-50h15v-20h10v20h15v120h40V90h60v130h20V40h45v60h25v120h30V120h40V70h20v-30h30v180h35V100h55v120h20V60h30V20h12v40h28v160h40V130h50v-50h40v140h25V90h60v130h30V50h40v170h30V140h35V100h45v120h40V70h30v150h25V120h35v100z"/></svg>' +
        '<i class="jk-cut c1">TAKE</i><i class="jk-cut c2">YOUR</i><i class="jk-cut c3">HEART</i>';
      top.innerHTML = '<i class="jk-slash"></i>';
    }
  }
  function applyFx(h) {
    var kind = h.fx === 'off' ? '' : (preset(h.preset).fx || '');
    document.body.dataset.hsFx = kind;
    document.documentElement.style.backgroundColor = kind ? colors(h).bg : '';
    if (kind) buildFx(kind); else { fxBuilt.kind = ''; ['hsFxBack', 'hsFxTop'].forEach(function (id) { var e = document.getElementById(id); if (e) e.innerHTML = ''; }); }
  }

  function build() {
    var body = $('#sheetAppearanceBackdrop .sheet-ui-modal-body');
    if (!body || body.dataset.hsBuilt) return;
    body.dataset.hsBuilt = '1';
    // guarda as seções antigas que continuam valendo (tiers sociais, hexágono, densidade)
    var keep = $$('.sheet-ui-group', body).filter(function (g) {
      return g.querySelector('[data-sheet-socialviz],[data-sheet-radar-palette],[data-sheet-density]');
    });
    var head = $('#sheetAppearanceBackdrop .sheet-ui-modal-head');
    if (head) {
      var sm = head.querySelector('small'); if (sm) sm.textContent = 'VISUAL // PERSONALIZAR';
      var bt = head.querySelector('b'); if (bt) bt.textContent = 'ESTILO DA FICHA';
    }
    body.innerHTML =
      '<div class="hs-tabs" role="tablist">' +
        '<button type="button" data-hs-tab="temas" class="on">TEMAS</button>' +
        '<button type="button" data-hs-tab="cores">CORES</button>' +
        '<button type="button" data-hs-tab="letras">LETRAS</button>' +
        '<button type="button" data-hs-tab="extras">EXTRAS</button>' +
      '</div>' +

      '<section class="hs-pane on" data-hs-pane="temas">' +
        '<p class="hs-hint">Escolha um tema pronto. O mapa e o resto do site acompanham. Dá para ajustar qualquer cor depois na aba Cores.</p>' +
        '<b class="hs-sub">ESPECIAIS · com efeito animado</b>' +
        '<div class="hs-presets hs-specials">' + PRESETS.filter(function (p) { return p.fx; }).map(card).join('') + '</div>' +
        '<b class="hs-sub">CLÁSSICOS</b>' +
        '<div class="hs-presets">' + PRESETS.filter(function (p) { return !p.fx; }).map(card).join('') + '</div>' +
        '<div class="hs-sign">' +
          '<div><b>COR-ASSINATURA</b><small>Escolha uma cor que represente o personagem e a ficha monta uma paleta inteira com ela.</small></div>' +
          '<label class="hs-sign-pick"><input type="color" id="hsSignature" value="#ef2b97"><span>GERAR</span></label>' +
        '</div>' +
      '</section>' +

      '<section class="hs-pane" data-hs-pane="cores">' +
        '<p class="hs-hint">Toque numa cor para trocar. A ficha muda na hora.</p>' +
        '<div class="hs-colors">' + KEYS.map(function (k) {
          return '<label class="hs-color" data-hs-key="' + k + '"><input type="color" data-hs-color="' + k + '"><span class="hs-swatch"></span>' +
            '<span class="hs-color-copy"><b>' + LABELS[k][0] + '</b><small>' + LABELS[k][1] + '</small></span><code></code></label>';
        }).join('') + '</div>' +
        '<p class="hs-warn" id="hsContrast" hidden></p>' +
        '<button type="button" class="hs-ghost" data-hs-reset-colors>Voltar às cores do tema</button>' +
      '</section>' +

      '<section class="hs-pane" data-hs-pane="letras">' +
        '<p class="hs-hint">Muda os títulos, números e textos da ficha.</p>' +
        '<div class="hs-fonts">' + FONTS.map(function (f) {
          return '<button type="button" class="hs-font" data-hs-font="' + f.id + '"><span style="font-family:' + esc(f.d) + '">' + f.sample + '</span>' +
            '<small style="font-family:' + esc(f.b) + '">' + f.name + ' · texto normal</small></button>';
        }).join('') + '</div>' +
      '</section>' +

      '<section class="hs-pane" data-hs-pane="extras">' +
        '<div class="hs-block"><b>PAINEL LATERAL</b><small>A faixa colorida atrás das abas.</small>' +
          '<div class="hs-row hs-slabs">' + SLABS.map(function (s) { return '<button type="button" data-hs-slab="' + s.id + '"><i class="hs-slab-' + s.id + '"></i>' + s.name + '</button>'; }).join('') + '</div>' +
          '<div class="hs-row hs-chips">' + SLAB_SRC.map(function (s) { return '<button type="button" data-hs-slabfrom="' + s.id + '"><i style="background:var(--hud-' + s.id + ')"></i>' + s.name + '</button>'; }).join('') + '</div>' +
        '</div>' +
        '<div class="hs-block"><b>ANIMAÇÕES</b><small>Reduzidas deixa tudo mais calmo (bom para celular fraco ou enjoo).</small>' +
          '<div class="hs-row hs-chips"><button type="button" data-hs-motion="full">COMPLETAS</button><button type="button" data-hs-motion="calm">REDUZIDAS</button></div>' +
        '</div>' +
        '<div class="hs-block"><b>EFEITO ESPECIAL</b><small>Lua da Hora Sombria, flores caindo ou cidade de Tóquio. Só aparece nos temas Makoto, Narukami e Joker.</small>' +
          '<div class="hs-row hs-chips"><button type="button" data-hs-fx="on">LIGADO</button><button type="button" data-hs-fx="off">DESLIGADO</button></div>' +
        '</div>' +
        '<div class="hs-keep"></div>' +
        '<div class="hs-block"><b>COMPARTILHAR VISUAL</b><small>Copie o código e mande para alguém, ou cole o código de outra ficha.</small>' +
          '<div class="hs-share"><input type="text" id="hsCode" spellcheck="false" autocomplete="off" aria-label="Código do visual"><button type="button" data-hs-copy>COPIAR</button><button type="button" data-hs-paste>APLICAR</button></div>' +
          '<p class="hs-share-msg" id="hsShareMsg" aria-live="polite"></p>' +
        '</div>' +
        '<button type="button" class="hs-ghost danger" data-hs-reset-all>Restaurar visual padrão</button>' +
      '</section>';
    var holder = $('.hs-keep', body);
    keep.forEach(function (g) {
      g.classList.add('hs-old'); holder.appendChild(g);
      if (g.querySelector('[data-sheet-radar-palette]')) {
        var sm = g.querySelector('.sheet-ui-group-head small'); if (sm) sm.textContent = 'Sincronizado usa as mesmas cores que você escolheu para a ficha.';
        var st = g.querySelector('[data-sheet-radar-palette="theme"] small'); if (st) st.textContent = 'Segue as cores da ficha.';
      }
    });

    body.addEventListener('click', onClick);
    $$('[data-hs-color]', body).forEach(function (inp) {
      inp.addEventListener('input', function () { var k = inp.dataset.hsColor; set(function (h) { h.colors[k] = inp.value; }); });
    });
    $('#hsSignature', body).addEventListener('change', function (e) {
      var v = e.target.value; set(function (h) { h.colors = fromSignature(v); h.preset = 'phobia'; h.custom = true; });
    });
    panel = body;
    paintPanel();
  }

  function onClick(e) {
    var t = e.target.closest('button'); if (!t) return;
    var d = t.dataset;
    if (d.hsTab) {
      $$('[data-hs-tab]', panel).forEach(function (b) { b.classList.toggle('on', b === t); });
      $$('[data-hs-pane]', panel).forEach(function (p) { p.classList.toggle('on', p.dataset.hsPane === d.hsTab); });
      panel.scrollTop = 0; return;
    }
    if (d.hsPreset) return set(function (h) { h.preset = d.hsPreset; h.colors = {}; h.custom = false; syncSite(h.preset); });
    if (d.hsFont) return set(function (h) { h.font = d.hsFont; });
    if (d.hsSlab) return set(function (h) { h.slab = d.hsSlab; });
    if (d.hsSlabfrom) return set(function (h) { h.slabFrom = d.hsSlabfrom; });
    if (d.hsMotion) return set(function (h) { h.motion = d.hsMotion; });
    if (d.hsFx) return set(function (h) { h.fx = d.hsFx; });
    if (t.hasAttribute('data-hs-reset-colors')) return set(function (h) { h.colors = {}; h.custom = false; });
    if (t.hasAttribute('data-hs-reset-all')) return set(function (h) { h.preset = 'phobia'; h.colors = {}; h.font = 'p5'; h.slab = 'dots'; h.slabFrom = 'acc'; h.motion = 'full'; h.fx = 'on'; h.custom = false; syncSite('phobia'); });
    if (t.hasAttribute('data-hs-copy')) return copyCode();
    if (t.hasAttribute('data-hs-paste')) return pasteCode();
  }

  /* código: PHB1.<preset>.<font>.<slab>.<slabFrom>.<motion>.<8 cores sem #> */
  function code() {
    var h = cfg(), c = colors(h);
    return ['PHB1', h.preset, h.font, h.slab, h.slabFrom, h.motion, KEYS.map(function (k) { return c[k].slice(1); }).join('')].join('.');
  }
  function copyCode() {
    var inp = $('#hsCode', panel); inp.value = code(); inp.select();
    var done = function () { msg('Código copiado.'); };
    try { navigator.clipboard.writeText(inp.value).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) { msg('Selecione e copie o código.'); } }); }
    catch (e) { try { document.execCommand('copy'); done(); } catch (e2) { msg('Selecione e copie o código.'); } }
  }
  function pasteCode() {
    var v = ($('#hsCode', panel).value || '').trim(), p = v.split('.');
    if (p[0] !== 'PHB1' || p.length !== 7 || !/^[0-9a-f]{48}$/i.test(p[6])) { msg('Código inválido.'); return; }
    set(function (h) {
      h.preset = preset(p[1]).id; h.font = font(p[2]).id;
      h.slab = SLABS.some(function (s) { return s.id === p[3]; }) ? p[3] : 'dots';
      h.slabFrom = /^acc[23]?$/.test(p[4]) ? p[4] : 'acc';
      h.motion = p[5] === 'calm' ? 'calm' : 'full';
      h.colors = {}; KEYS.forEach(function (k, i) { h.colors[k] = '#' + p[6].substr(i * 6, 6).toLowerCase(); });
      h.custom = true; syncSite(h.preset);
    });
    msg('Visual aplicado.');
  }
  function msg(t) { var m = $('#hsShareMsg', panel); if (m) { m.textContent = t; clearTimeout(msg.t); msg.t = setTimeout(function () { m.textContent = ''; }, 2600); } }

  function paintPanel() {
    if (!panel) return;
    var h = cfg(); if (!h) return;
    var c = colors(h), custom = KEYS.some(function (k) { return hexOk(h.colors[k]) && h.colors[k].toLowerCase() !== preset(h.preset).c[k]; });
    $$('[data-hs-preset]', panel).forEach(function (b) { b.classList.toggle('on', !custom && b.dataset.hsPreset === h.preset); });
    $$('[data-hs-font]', panel).forEach(function (b) { b.classList.toggle('on', b.dataset.hsFont === h.font); });
    $$('[data-hs-slab]', panel).forEach(function (b) { b.classList.toggle('on', b.dataset.hsSlab === h.slab); });
    $$('[data-hs-slabfrom]', panel).forEach(function (b) { b.classList.toggle('on', b.dataset.hsSlabfrom === h.slabFrom); });
    $$('[data-hs-motion]', panel).forEach(function (b) { b.classList.toggle('on', b.dataset.hsMotion === h.motion); });
    $$('[data-hs-fx]', panel).forEach(function (b) { b.classList.toggle('on', b.dataset.hsFx === (h.fx || 'on')); });
    $$('[data-hs-color]', panel).forEach(function (inp) {
      var k = inp.dataset.hsColor; if (document.activeElement !== inp) inp.value = c[k];
      var lab = inp.parentNode; lab.style.setProperty('--sw', c[k]); lab.querySelector('code').textContent = c[k].toUpperCase();
    });
    var sig = $('#hsSignature', panel); if (sig && document.activeElement !== sig) sig.value = c.acc;
    var w = $('#hsContrast', panel), r = contrast(c.paper, c.card);
    if (w) { w.hidden = r >= 3; w.textContent = 'O texto está com pouco contraste com os cartões (' + r.toFixed(1) + ':1). Pode ficar difícil de ler.'; }
    var ci = $('#hsCode', panel); if (ci && document.activeElement !== ci) ci.value = code();
  }

  /* ---------- ligar ---------- */
  function wrap(name, after) {
    var orig = window[name]; if (typeof orig !== 'function' || orig.__hs) return;
    var w = function () { var r = orig.apply(this, arguments); try { after(); } catch (e) {} return r; };
    w.__hs = true; window[name] = w;
  }
  function init() {
    if (typeof ensureCharacterUI !== 'function' || typeof state === 'undefined' || !state || !state.charSheet) { setTimeout(init, 200); return; }
    build(); apply();
    var stb = document.getElementById('siteThemeButton');
    if (stb && !stb.__hs) {
      stb.__hs = true; stb.title = 'Visual do site e da ficha';
      stb.addEventListener('click', function (e) {
        e.stopImmediatePropagation(); e.preventDefault();
        try { if (typeof closeGlobalThemePicker === 'function') closeGlobalThemePicker(); } catch (x) {}
        if (typeof openSheetAppearance === 'function') openSheetAppearance();
      }, true);
    }
    wrap('openSheetAppearance', function () { build(); paintPanel(); });
    wrap('hydrateCharacterSheet', apply);
    wrap('applyCharacterAppearance', function () { build(); paintPanel(); });
    // o hexágono "sincronizado" passa a seguir as cores da ficha
    var g = window.getSocialRadarPalette;
    if (typeof g === 'function' && !g.__hs) {
      var w = function () {
        var p = g.apply(this, arguments);
        try {
          var ui = ensureCharacterUI();
          if ((ui.radarPalette || 'theme') === 'theme') {
            var c = colors(cfg());
            p = Object.assign({}, p, { bg: c.black, bg2: c.card, line: 'color-mix(in srgb,' + c.paper + ' 30%,' + c.card + ')', text: c.paper, muted: 'color-mix(in srgb,' + c.paper + ' 65%,transparent)', main: c.acc, secondary: c.acc2 });
          }
        } catch (e) {}
        return p;
      };
      w.__hs = true; window.getSocialRadarPalette = w;
    }
  }
  /* usado pela tela de Fichas */
  window.PhobiaSheetStyle = {
    presets: PRESETS,
    current: function () { var h = cfg(); if (!h) return null; var p = preset(h.preset); return { id: p.id, name: h.custom ? 'Personalizado' : p.name, acc: (h.colors && h.colors.acc) || p.c.acc, acc2: (h.colors && h.colors.acc2) || p.c.acc2 }; },
    apply: function (id) { set(function (h) { h.preset = preset(id).id; h.colors = {}; h.custom = false; syncSite(h.preset); }); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ==========================================================
   PERSONA // PHOBIA — case-board.js   (NOTAS → Quadro de Investigação)
   Quadro de cortiça montável: fotos, notas adesivas, fichas,
   recortes e carimbos presos com tachinhas e ligados por fios.
   No canto, um computador de mesa com o Bloco de notas antigo
   (onde os comandos .exe continuam funcionando) e um Prompt
   de comando para ativar os desafios de programação.
   Salvo em state.charSheet.caseBoard.
   ========================================================== */
(function () {
  'use strict';
  if (window.PhobiaCaseBoard) return;

  var W = 3000, H = 1900;
  var NOTE_COLORS = { yellow: '#ffe873', pink: '#ff9ec7', blue: '#9fdcff', green: '#b6f29a', orange: '#ffbf7a' };
  var STR_COLORS = { red: '#d4142a', blue: '#1f6fe0', yellow: '#f2b705', black: '#1a1a1a', white: '#f4f1e8' };
  var TYPES = {
    photo: { label: 'Foto', w: 190 }, note: { label: 'Nota', w: 180 }, card: { label: 'Ficha', w: 240 },
    clip: { label: 'Recorte', w: 260 }, stamp: { label: 'Carimbo', w: 170 }
  };
  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function okImg(s) { return /^data:image\/(png|jpeg|webp|gif);base64,/.test(String(s || '')); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function sfx(k) { try { window.PhobiaSfx && PhobiaSfx.play(k, 0); } catch (e) {} }

  /* ---------- dados ---------- */
  function B() {
    var cs = state.charSheet; if (!cs) return null;
    var b = cs.caseBoard;
    if (!b || typeof b !== 'object') b = cs.caseBoard = {};
    if (!Array.isArray(b.items)) b.items = [];
    if (!Array.isArray(b.links)) b.links = [];
    if (typeof b.title !== 'string') b.title = 'CASO EM ABERTO';
    if (!b.view) b.view = { z: 0.8, x: 0, y: 0 };
    if (!b.next) b.next = 1;
    if (!b.seeded) { b.seeded = true; seed(b); }
    return b;
  }
  function seed(b) {
    if (b.items.length) return;
    var t = (state.notes || '').trim();
    add(b, { t: 'clip', x: 1080, y: 520, title: 'O QUE SABEMOS', text: 'Arraste os itens, clique duas vezes para escrever e use LIGAR para puxar um fio entre duas pistas.', r: -2 });
    add(b, { t: 'note', x: 1420, y: 560, text: 'Suspeito?', color: 'yellow', r: 4 });
    add(b, { t: 'stamp', x: 1440, y: 800, text: 'CONFIDENCIAL', r: -8 });
    if (t) add(b, { t: 'card', x: 760, y: 560, title: 'Bloco de notas', text: t.slice(0, 600), r: 1.5 });
    if (b.items.length > 1) b.links.push({ id: 'l' + (b.next++), a: b.items[0].id, b: b.items[1].id, c: 'red' });
  }
  function add(b, o) {
    var it = { id: 'i' + (b.next++), t: o.t, x: Math.round(o.x), y: Math.round(o.y), r: o.r != null ? o.r : +rnd(-4, 4).toFixed(1), z: (b.items.reduce(function (m, i) { return Math.max(m, i.z || 0); }, 0) + 1) };
    ['title', 'text', 'img', 'color'].forEach(function (k) { if (o[k] != null) it[k] = o[k]; });
    if (it.t === 'note' && !it.color) it.color = 'yellow';
    b.items.push(it); return it;
  }
  var saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { saveState(true); } catch (e) {} }, 350); }
  function item(id) { var b = B(); for (var i = 0; i < b.items.length; i++) if (b.items[i].id === id) return b.items[i]; return null; }

  /* ---------- DOM ---------- */
  var root, wrap, surf, inner, svg, menu, smenu, file, desk, sel = null, selLink = null, linkFrom = null, linkColor = 'red', ghost = null;
  function build() {
    if (root) return;
    root = document.createElement('div'); root.id = 'cbRoot'; root.className = 'cb-root'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Quadro de investigação');
    root.innerHTML =
      '<header class="cb-top">' +
        '<div class="cb-title"><small>NOTAS // QUADRO DE INVESTIGAÇÃO</small><input class="cb-case" data-cb="title" maxlength="48" aria-label="Nome do caso"></div>' +
        '<div class="cb-tools" role="toolbar" aria-label="Adicionar ao quadro">' +
          '<button type="button" data-cb-add="photo" title="Foto (ou arraste uma imagem para o quadro)"><i class="i-photo"></i><span>Foto</span></button>' +
          '<button type="button" data-cb-add="note"><i class="i-note"></i><span>Nota</span></button>' +
          '<button type="button" data-cb-add="card"><i class="i-card"></i><span>Ficha</span></button>' +
          '<button type="button" data-cb-add="clip"><i class="i-clip"></i><span>Recorte</span></button>' +
          '<button type="button" data-cb-add="stamp"><i class="i-stamp"></i><span>Carimbo</span></button>' +
          '<span class="cb-sep"></span>' +
          '<div class="cb-from"><button type="button" data-cb-from aria-expanded="false"><i class="i-people"></i><span>Do jogo ▾</span></button><div class="cb-from-pop" hidden></div></div>' +
          '<span class="cb-sep"></span>' +
          '<button type="button" class="cb-link-btn" data-cb-linkmode title="Clique numa pista e depois em outra"><i class="i-yarn"></i><span>Ligar</span></button>' +
          '<span class="cb-swatches" aria-label="Cor do fio">' + Object.keys(STR_COLORS).map(function (k) { return '<button type="button" data-cb-yarn="' + k + '" style="--c:' + STR_COLORS[k] + '" aria-label="Fio ' + k + '"></button>'; }).join('') + '</span>' +
        '</div>' +
        '<div class="cb-zoom"><button type="button" data-cb-zoom="-1" aria-label="Diminuir zoom">−</button><b data-cb-z>80%</b><button type="button" data-cb-zoom="1" aria-label="Aumentar zoom">+</button><button type="button" data-cb-zoom="0" title="Centralizar">⌖</button></div>' +
        '<button type="button" class="cb-close" data-cb-close aria-label="Fechar quadro">✕</button>' +
      '</header>' +
      '<div class="cb-wrap" tabindex="-1"><div class="cb-surf"><div class="cb-inner">' +
        '<svg class="cb-svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><defs>' +
          '<radialGradient id="cbPin" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>' +
          '<filter id="cbShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="2" dy="4" stdDeviation="2" flood-opacity=".45"/></filter>' +
        '</defs><g class="cb-links"></g><path class="cb-ghost" d="" /><g class="cb-pins"></g></svg>' +
      '</div></div></div>' +
      '<div class="cb-menu" hidden></div><div class="cb-smenu" hidden></div>' +
      '<p class="cb-hint" hidden></p>' +
      deskHTML() +
      '<input type="file" accept="image/*" hidden class="cb-file">';
    document.body.appendChild(root);
    wrap = $('.cb-wrap', root); surf = $('.cb-surf', root); inner = $('.cb-inner', root); svg = $('.cb-svg', root);
    menu = $('.cb-menu', root); smenu = $('.cb-smenu', root); file = $('.cb-file', root); desk = $('.cb-desk', root);
    ghost = $('.cb-ghost', root);
    bind();
  }

  /* ---------- itens ---------- */
  function itemHTML(it) {
    var w = TYPES[it.t] ? TYPES[it.t].w : 200, body = '';
    if (it.t === 'photo') {
      body = '<div class="cb-ph">' + (okImg(it.img) ? '<img src="' + it.img + '" alt="" draggable="false">' : '<button type="button" class="cb-ph-empty" data-cb-photo>＋ escolher foto</button>') + '</div>' +
        '<div class="cb-cap" data-f="text" data-ph="legenda">' + E(it.text || '') + '</div>';
    } else if (it.t === 'note') {
      body = '<div class="cb-txt" data-f="text" data-ph="escreva aqui…">' + E(it.text || '') + '</div>';
    } else if (it.t === 'card') {
      body = '<div class="cb-card-h"><span data-f="title" data-ph="NOME / ASSUNTO">' + E(it.title || '') + '</span><em>Nº ' + E(it.id.slice(1)).padStart(3, '0') + '</em></div><div class="cb-txt" data-f="text" data-ph="detalhes, horários, locais…">' + E(it.text || '') + '</div>';
    } else if (it.t === 'clip') {
      body = '<small class="cb-clip-k">TOKYO SHIMBUN · 2000</small><div class="cb-clip-h" data-f="title" data-ph="MANCHETE">' + E(it.title || '') + '</div><div class="cb-txt" data-f="text" data-ph="texto da matéria…">' + E(it.text || '') + '</div>';
    } else if (it.t === 'stamp') {
      body = '<div class="cb-stamp-t" data-f="text" data-ph="CARIMBO">' + E(it.text || '') + '</div>';
    }
    return '<div class="cb-it t-' + it.t + (String(it.text || '').length > 380 ? ' long' : '') + (sel === it.id ? ' sel' : '') + (linkFrom === it.id ? ' from' : '') + '" data-id="' + it.id + '" style="left:' + it.x + 'px;top:' + it.y + 'px;' + (it.t === 'stamp' ? '' : 'width:' + widthFor(it) + 'px;') + 'z-index:' + (it.z || 1) + ';--r:' + (it.r || 0) + 'deg' + (it.t === 'note' ? ';--nc:' + (NOTE_COLORS[it.color] || NOTE_COLORS.yellow) : '') + '">' + body + '</div>';
  }
  function render() {
    var b = B(); if (!b || !root) return;
    var html = b.items.map(itemHTML).join('');
    Array.prototype.slice.call(inner.querySelectorAll('.cb-it')).forEach(function (n) { n.remove(); });
    svg.insertAdjacentHTML('beforebegin', html);
    $('.cb-case', root).value = b.title;
    measure(); drawLinks(); paintTools(); placeMenu();
  }
  var size = {};
  function measure() { inner.querySelectorAll('.cb-it').forEach(function (n) { size[n.dataset.id] = [n.offsetWidth, n.offsetHeight]; }); }
  function pin(it) { var s = size[it.id] || [200, 200]; return [it.x + s[0] / 2, it.y + (it.t === 'stamp' ? 6 : 10)]; }
  function sag(a, c) {
    var dx = c[0] - a[0], dy = c[1] - a[1], d = Math.sqrt(dx * dx + dy * dy), s = Math.min(90, 14 + d * 0.1);
    return 'M' + a[0] + ' ' + a[1] + ' Q' + ((a[0] + c[0]) / 2) + ' ' + ((a[1] + c[1]) / 2 + s) + ' ' + c[0] + ' ' + c[1];
  }
  function drawLinks() {
    var b = B(), g = $('.cb-links', svg), pins = $('.cb-pins', svg), out = '', ps = '';
    b.links = b.links.filter(function (l) { return item(l.a) && item(l.b); });
    b.links.forEach(function (l) {
      var d = sag(pin(item(l.a)), pin(item(l.b))), c = STR_COLORS[l.c] || STR_COLORS.red;
      out += '<g class="cb-link' + (selLink === l.id ? ' sel' : '') + '" data-link="' + l.id + '"><path class="cb-yarn-sh" d="' + d + '"/><path class="cb-yarn" d="' + d + '" stroke="' + c + '"/><path class="cb-yarn-hit" d="' + d + '"/></g>';
    });
    b.items.forEach(function (it) {
      var p = pin(it), c = it.t === 'note' ? '#2f6fe0' : it.t === 'stamp' ? '#1a1a1a' : it.t === 'clip' ? '#f2b705' : '#d4142a';
      ps += '<g class="cb-pin" style="--pin:' + c + '"><ellipse cx="' + (p[0] + 3) + '" cy="' + (p[1] + 5) + '" rx="7" ry="4" fill="rgba(0,0,0,.35)"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="7.5" fill="' + c + '"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="7.5" fill="url(#cbPin)"/></g>';
    });
    g.innerHTML = out; pins.innerHTML = ps;
  }
  var drawQ = 0;
  function redraw() { if (!drawQ) drawQ = requestAnimationFrame(function () { drawQ = 0; drawLinks(); placeMenu(); }); }

  /* ---------- zoom / visão ---------- */
  function Z() { return B().view.z; }
  function applyZoom(z, cx, cy) {
    var b = B(), old = b.view.z; z = Math.max(0.35, Math.min(1.6, Math.round(z * 100) / 100));
    var r = wrap.getBoundingClientRect();
    if (cx == null) { cx = r.width / 2; cy = r.height / 2; }
    var bx = (wrap.scrollLeft + cx) / old, by = (wrap.scrollTop + cy) / old;
    b.view.z = z;
    surf.style.width = W * z + 'px'; surf.style.height = H * z + 'px';
    inner.style.transform = 'scale(' + z + ')';
    wrap.scrollLeft = bx * z - cx; wrap.scrollTop = by * z - cy;
    $('[data-cb-z]', root).textContent = Math.round(z * 100) + '%';
    placeMenu();
  }
  function center() {
    var b = B(), its = b.items; if (!its.length) { applyZoom(Z()); wrap.scrollLeft = (W * Z() - wrap.clientWidth) / 2; wrap.scrollTop = (H * Z() - wrap.clientHeight) / 2; return; }
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    its.forEach(function (it) { var s = size[it.id] || [200, 200]; x0 = Math.min(x0, it.x); y0 = Math.min(y0, it.y); x1 = Math.max(x1, it.x + s[0]); y1 = Math.max(y1, it.y + s[1]); });
    var z = Math.min(1.1, Math.max(0.4, Math.min(wrap.clientWidth / (x1 - x0 + 240), wrap.clientHeight / (y1 - y0 + 200))));
    applyZoom(z);
    wrap.scrollLeft = ((x0 + x1) / 2) * z - wrap.clientWidth / 2;
    wrap.scrollTop = ((y0 + y1) / 2) * z - wrap.clientHeight / 2;
  }
  function toBoard(e) {
    var r = surf.getBoundingClientRect(), z = Z();
    return [(e.clientX - r.left) / z, (e.clientY - r.top) / z];
  }
  function viewCenter() { var z = Z(); return [(wrap.scrollLeft + wrap.clientWidth / 2) / z, (wrap.scrollTop + wrap.clientHeight / 2) / z]; }

  /* ---------- menus de item e de fio ---------- */
  function placeMenu() {
    if (!root || root.hidden) return;
    var n = sel && inner.querySelector('.cb-it[data-id="' + sel + '"]');
    if (!n) { menu.hidden = true; } else {
      var it = item(sel), r = n.getBoundingClientRect(), rr = root.getBoundingClientRect();
      menu.innerHTML =
        '<button type="button" data-cb-act="link" title="Puxar fio desta pista">🧶 Ligar</button>' +
        (it.t === 'note' ? '<span class="cb-ncol">' + Object.keys(NOTE_COLORS).map(function (k) { return '<button type="button" data-cb-ncol="' + k + '" style="--c:' + NOTE_COLORS[k] + '"' + (it.color === k ? ' class="on"' : '') + ' aria-label="Cor ' + k + '"></button>'; }).join('') + '</span>' : '') +
        (it.t === 'photo' ? '<button type="button" data-cb-act="photo">🖼 Foto</button>' : '') +
        '<button type="button" data-cb-act="edit" title="Escrever">✎</button>' +
        '<button type="button" data-cb-act="rot" title="Girar">↻</button>' +
        '<button type="button" data-cb-act="dup" title="Duplicar">⧉</button>' +
        '<button type="button" data-cb-act="del" class="del" title="Remover">🗑</button>';
      menu.hidden = false;
      var top = r.top - rr.top - menu.offsetHeight - 10;
      if (top < 70) top = r.bottom - rr.top + 10;
      menu.style.left = Math.max(8, Math.min(rr.width - menu.offsetWidth - 8, r.left - rr.left + r.width / 2 - menu.offsetWidth / 2)) + 'px';
      menu.style.top = top + 'px';
    }
    var lg = selLink && svg.querySelector('[data-link="' + selLink + '"] .cb-yarn');
    if (!lg) { smenu.hidden = true; return; }
    var L = len(lg), mp = lg.getPointAtLength(L / 2), sr = surf.getBoundingClientRect(), rr2 = root.getBoundingClientRect(), z = Z();
    smenu.innerHTML = Object.keys(STR_COLORS).map(function (k) { return '<button type="button" data-cb-lcol="' + k + '" style="--c:' + STR_COLORS[k] + '" aria-label="Fio ' + k + '"></button>'; }).join('') + '<button type="button" data-cb-act="unlink" class="del">✂ Cortar</button>';
    smenu.hidden = false;
    smenu.style.left = (sr.left - rr2.left + mp.x * z - smenu.offsetWidth / 2) + 'px';
    smenu.style.top = (sr.top - rr2.top + mp.y * z + 14) + 'px';
  }
  function len(p) { try { return p.getTotalLength(); } catch (e) { return 0; } }
  function select(id) { sel = id; selLink = null; inner.querySelectorAll('.cb-it.sel').forEach(function (n) { n.classList.remove('sel'); }); var n = id && inner.querySelector('.cb-it[data-id="' + id + '"]'); if (n) n.classList.add('sel'); drawLinks(); placeMenu(); }
  function selectLink(id) { sel = null; selLink = id; inner.querySelectorAll('.cb-it.sel').forEach(function (n) { n.classList.remove('sel'); }); drawLinks(); placeMenu(); }
  function hint(t) { var h = $('.cb-hint', root); h.textContent = t || ''; h.hidden = !t; }
  function setLinkMode(on) {
    root.classList.toggle('linking', !!on);
    if (!on) { linkFrom = null; ghost.setAttribute('d', ''); inner.querySelectorAll('.cb-it.from').forEach(function (n) { n.classList.remove('from'); }); hint(''); }
    else hint(linkFrom ? 'Agora clique na pista de destino. Esc cancela.' : 'Clique na primeira pista. Esc cancela.');
    paintTools();
  }
  function paintTools() {
    $('[data-cb-linkmode]', root).classList.toggle('on', root.classList.contains('linking'));
    root.querySelectorAll('[data-cb-yarn]').forEach(function (b) { b.classList.toggle('on', b.dataset.cbYarn === linkColor); });
  }

  /* ---------- edição de texto ---------- */
  /* tamanho do papel acompanha o texto */
  var MAXW = { note: 330, card: 460, clip: 520, stamp: 0, photo: 0 };
  function widthFor(it) {
    var base = TYPES[it.t] ? TYPES[it.t].w : 200; if (!MAXW[it.t]) return base;
    var len = String(it.text || '').length + String(it.title || '').length * 1.5;
    var lines = String(it.text || '').split('\n').reduce(function (m, l) { return Math.max(m, l.length); }, 0);
    return Math.round(Math.min(MAXW[it.t], Math.max(base, base + Math.sqrt(len) * 7, Math.min(lines, 60) * 6.2)));
  }
  function grow(n, it) {
    if (!n || !it) return;
    var w = widthFor(it); if (w && it.t !== 'stamp') n.style.width = w + 'px';
    n.classList.toggle('long', String(it.text || '').length > 380);
  }
  function stopEdit() { var a = document.activeElement; if (a && a.closest && a.closest('.cb-it [data-f]')) a.blur(); }
  function editItem(n, field) {
    var fs = Array.prototype.slice.call(n.querySelectorAll('[data-f]')); if (!fs.length) return;
    var f = (field && n.querySelector('[data-f="' + field + '"]')) || fs[0];
    var it = item(n.dataset.id); if (!it) return;
    if (!n.classList.contains('editing')) {
      n.classList.add('editing'); menu.hidden = true;
      fs.forEach(function (x) {
        try { x.contentEditable = 'plaintext-only'; } catch (e) {}
        if (x.contentEditable !== 'plaintext-only') x.contentEditable = 'true';
        x.oninput = function () { it[x.dataset.f] = x.innerText; grow(n, it); measure(); redraw(); };
      });
      n.addEventListener('focusout', function done(ev) {
        if (ev.relatedTarget && n.contains(ev.relatedTarget)) return;
        n.removeEventListener('focusout', done); n.classList.remove('editing');
        fs.forEach(function (x) { x.contentEditable = 'false'; x.oninput = null; it[x.dataset.f] = x.innerText.replace(/\n{3,}/g, '\n\n').trim().slice(0, 4000); });
        grow(n, it); measure(); redraw(); save();
      });
    }
    f.focus();
    var rg = document.createRange(); rg.selectNodeContents(f); rg.collapse(false); var sl = getSelection(); sl.removeAllRanges(); sl.addRange(rg);
  }

  /* ---------- fotos ---------- */
  var photoTarget = null;
  function compress(fileOrBlob, cb) {
    var url = URL.createObjectURL(fileOrBlob), img = new Image();
    img.onload = function () {
      function out(max, q) {
        var s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var d = c.toDataURL('image/webp', q); if (d.indexOf('data:image/webp') !== 0) d = c.toDataURL('image/jpeg', q); return d;
      }
      var d = out(420, .78); if (d.length > 30000) d = out(340, .66); if (d.length > 30000) d = out(280, .58);
      URL.revokeObjectURL(url); cb(d);
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('Não deu para ler essa imagem.'); };
    img.src = url;
  }
  function addPhotoAt(blob, x, y) {
    compress(blob, function (d) {
      var b = B(), it = add(b, { t: 'photo', x: x - 95, y: y - 110, img: d, text: '' });
      render(); select(it.id); save(); sfx('confirm');
    });
  }

  /* ---------- "Do jogo" ---------- */
  function fromList() {
    var cs = state.charSheet || {}, out = [];
    var me = (cs.profile && (cs.profile.name || cs.profile.codename)) || 'Meu personagem';
    out.push({ k: 'me', n: me, s: 'Ficha', img: okImg(cs.photoData) ? cs.photoData : '' });
    ((cs.bonds && cs.bonds.items) || []).forEach(function (bd) { if (bd.name || okImg(bd.imageData)) out.push({ k: 'bond:' + bd.id, n: bd.name || 'Vínculo', s: (bd.arcana ? 'Arcana ' + bd.arcana : 'Vínculo') + (bd.level ? ' · Rank ' + bd.level : ''), img: okImg(bd.imageData) ? bd.imageData : '' }); });
    return out;
  }
  function openFrom(btn) {
    var pop = $('.cb-from-pop', root), list = fromList();
    pop.innerHTML = '<small>PRENDER NO QUADRO</small>' + list.map(function (o, i) { return '<button type="button" data-cb-fromi="' + i + '"><span>' + (o.img ? '<img src="' + o.img + '" alt="">' : '?') + '</span><b>' + E(o.n) + '</b><em>' + E(o.s) + '</em></button>'; }).join('') + (list.length < 2 ? '<p>Seus Vínculos (aba 08) aparecem aqui também.</p>' : '');
    pop._list = list; pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
  }

  /* ---------- eventos ---------- */
  var drag = null, pan = null;
  function bind() {
    root.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      var d = t.dataset, b = B(), c = viewCenter();
      if (d.cbClose != null) return close();
      if (d.cbAdd) {
        if (d.cbAdd === 'photo') { photoTarget = null; file.click(); return; }
        var it = add(b, { t: d.cbAdd, x: c[0] - TYPES[d.cbAdd].w / 2 + rnd(-40, 40), y: c[1] - 80 + rnd(-30, 30), text: d.cbAdd === 'stamp' ? 'SUSPEITO' : '' });
        render(); select(it.id); save(); sfx('tab');
        var n = inner.querySelector('.cb-it[data-id="' + it.id + '"]'); if (n && it.t !== 'stamp') setTimeout(function () { editItem(n, it.t === 'card' || it.t === 'clip' ? 'title' : 'text'); }, 30);
        return;
      }
      if (d.cbFrom != null) { var pop = $('.cb-from-pop', root); if (!pop.hidden) { pop.hidden = true; t.setAttribute('aria-expanded', 'false'); } else openFrom(t); return; }
      if (d.cbFromi != null) {
        var o = $('.cb-from-pop', root)._list[+d.cbFromi]; $('.cb-from-pop', root).hidden = true;
        var it2 = add(b, { t: 'photo', x: c[0] - 95 + rnd(-60, 60), y: c[1] - 110 + rnd(-40, 40), img: o.img, text: o.n });
        render(); select(it2.id); save(); sfx('confirm'); return;
      }
      if (d.cbLinkmode != null) { setLinkMode(!root.classList.contains('linking')); return; }
      if (d.cbYarn) { linkColor = d.cbYarn; paintTools(); return; }
      if (d.cbZoom) { if (d.cbZoom === '0') center(); else applyZoom(Z() + (+d.cbZoom) * 0.1); b.view.z = Z(); save(); return; }
      if (d.cbNcol && sel) { item(sel).color = d.cbNcol; render(); select(sel); save(); return; }
      if (d.cbLcol && selLink) { b.links.forEach(function (l) { if (l.id === selLink) l.c = d.cbLcol; }); linkColor = d.cbLcol; drawLinks(); paintTools(); save(); return; }
      if (d.cbPhoto != null) { var n2 = t.closest('.cb-it'); photoTarget = n2 && n2.dataset.id; file.click(); return; }
      if (d.cbAct) {
        var it3 = sel && item(sel);
        if (d.cbAct === 'unlink') { b.links = b.links.filter(function (l) { return l.id !== selLink; }); selLink = null; drawLinks(); placeMenu(); save(); sfx('back'); return; }
        if (!it3) return;
        var node = inner.querySelector('.cb-it[data-id="' + it3.id + '"]');
        if (d.cbAct === 'link') { linkFrom = it3.id; node.classList.add('from'); setLinkMode(true); return; }
        if (d.cbAct === 'photo') { photoTarget = it3.id; file.click(); return; }
        if (d.cbAct === 'edit') { editItem(node); return; }
        if (d.cbAct === 'rot') { it3.r = ((it3.r || 0) + 4 > 12 ? -12 : (it3.r || 0) + 4); node.style.setProperty('--r', it3.r + 'deg'); save(); return; }
        if (d.cbAct === 'dup') { var cp = JSON.parse(JSON.stringify(it3)); cp.x += 30; cp.y += 30; delete cp.id; var nn = add(b, cp); render(); select(nn.id); save(); return; }
        if (d.cbAct === 'del') { b.items = b.items.filter(function (x) { return x.id !== it3.id; }); b.links = b.links.filter(function (l) { return l.a !== it3.id && l.b !== it3.id; }); sel = null; render(); save(); sfx('back'); return; }
      }
    });
    $('.cb-case', root).addEventListener('input', function (e) { B().title = e.target.value; save(); });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; file.value = ''; if (!f) return;
      if (photoTarget && item(photoTarget)) { var id = photoTarget; compress(f, function (d) { item(id).img = d; render(); select(id); save(); sfx('confirm'); }); }
      else { var c = viewCenter(); addPhotoAt(f, c[0] + rnd(-40, 40), c[1] + rnd(-30, 30)); }
    });

    /* arrastar itens / panorâmica / ligar */
    wrap.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var pop = $('.cb-from-pop', root); if (!pop.hidden) { pop.hidden = true; }
      var hit = e.target.closest('.cb-link'), n = e.target.closest('.cb-it');
      if (n && n.classList.contains('editing')) return;
      stopEdit();
      if (desk.classList.contains('big')) deskSize(false);
      if (root.classList.contains('linking')) {
        if (!n) { setLinkMode(false); return; }
        if (!linkFrom) { linkFrom = n.dataset.id; n.classList.add('from'); setLinkMode(true); e.preventDefault(); return; }
        if (n.dataset.id !== linkFrom) {
          var b = B(), a = linkFrom, z2 = n.dataset.id;
          if (!b.links.some(function (l) { return (l.a === a && l.b === z2) || (l.a === z2 && l.b === a); })) { b.links.push({ id: 'l' + (b.next++), a: a, b: z2, c: linkColor }); save(); sfx('confirm'); }
          setLinkMode(false); drawLinks();
        }
        e.preventDefault(); return;
      }
      if (e.target.closest('button')) return;
      if (hit) { selectLink(hit.dataset.link); e.preventDefault(); return; }
      if (n) {
        var it = item(n.dataset.id), p = toBoard(e), b2 = B();
        it.z = b2.items.reduce(function (m, i) { return Math.max(m, i.z || 0); }, 0) + 1; n.style.zIndex = it.z;
        var wasSel = sel === it.id, fld0 = e.target.closest('[data-f]');
        if (!wasSel) select(it.id);
        drag = { edit: wasSel && fld0 ? fld0.dataset.f : null, id: it.id, n: n, dx: p[0] - it.x, dy: p[1] - it.y, sx: e.clientX, sy: e.clientY, moved: false };
        n.setPointerCapture(e.pointerId); e.preventDefault(); return;
      }
      /* fundo: desmarca e arrasta a visão (mouse) */
      if (sel || selLink) { sel = null; selLink = null; inner.querySelectorAll('.cb-it.sel').forEach(function (x) { x.classList.remove('sel'); }); drawLinks(); placeMenu(); }
      if (e.pointerType === 'mouse') { pan = { x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop }; wrap.classList.add('panning'); wrap.setPointerCapture(e.pointerId); }
    });
    wrap.addEventListener('pointermove', function (e) {
      if (drag) {
        if (!drag.moved && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 4) return;
        if (!drag.moved) { drag.moved = true; drag.n.classList.add('lift'); menu.hidden = true; }
        var p = toBoard(e), it = item(drag.id);
        it.x = Math.round(Math.max(0, Math.min(W - 60, p[0] - drag.dx))); it.y = Math.round(Math.max(0, Math.min(H - 60, p[1] - drag.dy)));
        drag.n.style.left = it.x + 'px'; drag.n.style.top = it.y + 'px'; redraw(); return;
      }
      if (pan) { wrap.scrollLeft = pan.sl - (e.clientX - pan.x); wrap.scrollTop = pan.st - (e.clientY - pan.y); return; }
      if (linkFrom && root.classList.contains('linking')) { var a = pin(item(linkFrom)); ghost.setAttribute('d', sag(a, toBoard(e))); ghost.setAttribute('stroke', STR_COLORS[linkColor]); }
    });
    function end() {
      if (drag) { var d = drag; drag = null; d.n.classList.remove('lift'); if (d.moved) { save(); sfx('tick'); } placeMenu(); if (!d.moved && d.edit) editItem(d.n, d.edit); }
      if (pan) { pan = null; wrap.classList.remove('panning'); }
    }
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('dblclick', function (e) {
      var n = e.target.closest('.cb-it'); if (!n || root.classList.contains('linking')) return;
      var hitEl = document.elementFromPoint(e.clientX, e.clientY), f = hitEl && hitEl.closest && hitEl.closest('[data-f]');
      if (n.classList.contains('editing') && (!f || document.activeElement === f)) return;
      editItem(n, f && n.contains(f) ? f.dataset.f : null);
    });
    wrap.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault(); var r = wrap.getBoundingClientRect();
      applyZoom(Z() * (e.deltaY < 0 ? 1.1 : 0.9), e.clientX - r.left, e.clientY - r.top); save();
    }, { passive: false });
    wrap.addEventListener('scroll', function () { placeMenu(); }, { passive: true });
    /* soltar imagens no quadro / colar */
    wrap.addEventListener('dragover', function (e) { if (e.dataTransfer && [].some.call(e.dataTransfer.items || [], function (i) { return i.kind === 'file'; })) { e.preventDefault(); wrap.classList.add('drop'); } });
    wrap.addEventListener('dragleave', function () { wrap.classList.remove('drop'); });
    wrap.addEventListener('drop', function (e) {
      wrap.classList.remove('drop'); var fs = [].filter.call((e.dataTransfer && e.dataTransfer.files) || [], function (f) { return /^image\//.test(f.type); });
      if (!fs.length) return; e.preventDefault(); var p = toBoard(e);
      fs.slice(0, 6).forEach(function (f, i) { addPhotoAt(f, p[0] + i * 40, p[1] + i * 30); });
    });
    document.addEventListener('paste', function (e) {
      if (!root || root.hidden || (document.activeElement && document.activeElement.closest('[data-f],textarea,input'))) return;
      var f = [].filter.call((e.clipboardData && e.clipboardData.files) || [], function (x) { return /^image\//.test(x.type); })[0];
      if (f) { e.preventDefault(); var c = viewCenter(); addPhotoAt(f, c[0], c[1]); }
    });
    document.addEventListener('keydown', function (e) {
      if (!root || root.hidden) return;
      var ed = document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-f],textarea,input');
      if (e.key === 'Escape') {
        if (ed) {
          var ae = document.activeElement;
          if (ae.closest('[data-f]')) ae.blur();
          else if (ae.id === 'noteText') { e.stopImmediatePropagation(); closeNotepad(); ae.blur(); }
          else if (ae.closest('.cb-term')) { e.stopImmediatePropagation(); $('.cb-cmd', desk).hidden = true; paintDesk(); ae.blur(); }
          return;
        }
        e.stopImmediatePropagation();
        if (root.classList.contains('linking')) return setLinkMode(false);
        if (desk.classList.contains('big')) return deskSize(false);
        if (sel || selLink) { sel = null; selLink = null; render(); return; }
        return close();
      }
      if (ed) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && (sel || selLink)) {
        e.preventDefault(); var b = B();
        if (sel) { b.items = b.items.filter(function (x) { return x.id !== sel; }); b.links = b.links.filter(function (l) { return l.a !== sel && l.b !== sel; }); sel = null; render(); }
        else { b.links = b.links.filter(function (l) { return l.id !== selLink; }); selLink = null; drawLinks(); placeMenu(); }
        save(); sfx('back');
      }
    }, true);
    window.addEventListener('resize', function () { if (root && !root.hidden) placeMenu(); });
    bindDesk();
  }

  /* ==========================================================
     COMPUTADOR NO CANTO
     ========================================================== */
  function deskHTML() {
    return '<aside class="cb-desk" aria-label="Computador">' +
      '<div class="cb-mon"><div class="cb-bezel"><div class="cb-screen">' +
        '<div class="cb-wall"><b>PHOBIA</b><small>OS 2000</small></div>' +
        '<div class="cb-icons">' +
          '<button type="button" class="cb-icon" data-desk="notepad"><i class="d-note"></i><span>Bloco de notas</span></button>' +
          '<button type="button" class="cb-icon" data-desk="cmd"><i class="d-cmd"></i><span>Prompt de comando</span></button>' +
          '<button type="button" class="cb-icon" data-desk="pc"><i class="d-pc"></i><span>Meu computador</span></button>' +
          '<button type="button" class="cb-icon cb-net" data-desk="net" hidden><i class="d-net"></i><span>NET//TRACE</span></button>' +
          '<button type="button" class="cb-icon" data-desk="trash"><i class="d-trash"></i><span>Lixeira</span></button>' +
        '</div>' +
        '<div class="cb-win cb-cmd" hidden><div class="cb-win-t"><span>C:\\WINDOWS\\system32\\cmd.exe</span><button type="button" data-desk-close="cmd">×</button></div>' +
          '<div class="cb-term" tabindex="0"><pre></pre><label><span>C:\\PHOBIA&gt;</span><input type="text" spellcheck="false" autocomplete="off" aria-label="Comando"></label></div></div>' +
        '<div class="cb-win cb-pcw" hidden><div class="cb-win-t"><span>Meu computador</span><button type="button" data-desk-close="pc">×</button></div><div class="cb-pc-body"></div></div>' +
        '<div class="cb-task"><button type="button" class="cb-start" data-desk="start">INICIAR</button><span class="cb-task-apps"></span><time></time></div>' +
      '</div></div></div>' +
      '<div class="cb-neck"></div><div class="cb-base"><i></i><button type="button" class="cb-power" data-desk="size" aria-label="Aproximar o computador" title="Aproximar / afastar"></button></div>' +
    '</aside>';
  }
  function deskSize(big) {
    desk.classList.toggle('big', big);
    if (!big) { closeNotepad(); }
    sfx(big ? 'open' : 'back');
  }
  function tick() { var t = $('time', desk); if (t) { var d = new Date(); t.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } }
  function netOn() { return !!state.netTraceUnlocked; }
  function paintDesk() {
    var n = $('.cb-net', desk); if (n) n.hidden = !netOn();
    var apps = [];
    var np = document.getElementById('notepad');
    if (np && np.classList.contains('open') && np.parentElement && np.parentElement.classList.contains('cb-screen')) apps.push('Bloco de notas');
    if (!$('.cb-cmd', desk).hidden) apps.push('cmd.exe');
    if (!$('.cb-pcw', desk).hidden) apps.push('Meu computador');
    $('.cb-task-apps', desk).innerHTML = apps.map(function (a) { return '<span>' + E(a) + '</span>'; }).join('');
  }
  function openNotepad() {
    var np = document.getElementById('notepad'); if (!np) return;
    var scr = $('.cb-screen', desk); if (np.parentElement !== scr) scr.appendChild(np);
    np.classList.add('open', 'cb-in');
    var t = document.getElementById('noteText'); if (t) { t.value = state.notes || ''; setTimeout(function () { t.focus(); }, 30); }
    paintDesk();
  }
  function closeNotepad() { var np = document.getElementById('notepad'); if (np) np.classList.remove('open'); paintDesk(); }
  function termOut(s) { var pre = $('.cb-term pre', desk); pre.textContent += s + '\n'; var tm = $('.cb-term', desk); tm.scrollTop = tm.scrollHeight; }
  function openCmd() {
    var w = $('.cb-cmd', desk); w.hidden = false;
    var pre = $('.cb-term pre', desk);
    if (!pre.textContent) pre.textContent = 'Phobia OS [Versão 5.00.2000]\n(C) 2000 Phobia Net. Todos os direitos reservados.\n\nDigite AJUDA para ver os comandos.\n\n';
    setTimeout(function () { $('.cb-term input', desk).focus(); }, 30); paintDesk();
  }
  async function runCmd(raw) {
    var line = String(raw || '').trim(); termOut('C:\\PHOBIA>' + line); if (!line) return;
    var low = line.toLowerCase(), cmd = low.split(/\s+/)[0];
    if (cmd === 'ajuda' || cmd === 'help' || cmd === '?') { termOut('AJUDA   mostra esta lista\nDIR     lista os arquivos\nCLS     limpa a tela\nVER     versão do sistema\nDATA    data da história\nSAIR    fecha esta janela\n\nProgramas (.exe) podem ser executados pelo nome.\n'); return; }
    if (cmd === 'cls') { $('.cb-term pre', desk).textContent = ''; return; }
    if (cmd === 'ver') { termOut('Phobia OS 5.00.2000 — build Tokyo\n'); return; }
    if (cmd === 'sair' || cmd === 'exit') { $('.cb-cmd', desk).hidden = true; paintDesk(); return; }
    if (cmd === 'data' || cmd === 'date') { var dl = document.querySelector('.ht-date b, #taskbarDate, .compact-date b'); termOut((dl ? dl.textContent.trim() : 'abril de 2000') + '\n'); return; }
    if (cmd === 'dir' || cmd === 'ls') { termOut(' Pasta de C:\\PHOBIA\n\n  NOTAS.TXT        ' + (state.notes || '').length + ' bytes\n  QUADRO.DAT       ' + B().items.length + ' itens\n  <DIR>            SISTEMA\n' + (netOn() ? '  NETTRACE.LNK     atalho\n' : '') + '\n'); return; }
    /* comandos .exe: mesma verificação do Bloco de notas (só o hash fica no código) */
    try {
      var norm = typeof normalizeNotepadCommand === 'function' ? normalizeNotepadCommand(line) : low;
      if (/\.exe$/.test(norm) && typeof sha256Hex === 'function' && typeof _netTraceCommandProof !== 'undefined') {
        termOut('Executando ' + norm + '...');
        var proof = await sha256Hex(norm);
        if (proof && proof === _netTraceCommandProof) {
          if (netOn()) { termOut('[OK] NET//TRACE já está montado.\n'); return; }
          termOut('[OK] NET//TRACE NODE MOUNTED\n[LINK] atalho criado na área de trabalho.\n');
          revealNetTrace(true); toast('NET//TRACE DESBLOQUEADO'); sfx('rankup'); paintDesk();
          var ic = $('.cb-net', desk); if (ic) { ic.classList.add('cb-new'); setTimeout(function () { ic.classList.remove('cb-new'); }, 2400); }
          return;
        }
        termOut('Acesso negado.\n'); sfx('error'); return;
      }
    } catch (e) {}
    termOut("'" + line.split(/\s+/)[0] + "' não é reconhecido como um comando interno\nou externo, um programa operável ou um arquivo em lotes.\n"); sfx('error');
  }
  function openPc() {
    var w = $('.cb-pcw', desk), cs = state.charSheet || {};
    $('.cb-pc-body', w).innerHTML = '<p><b>Usuário:</b> ' + E((cs.profile && cs.profile.name) || 'Convidado') + '</p><p><b>Sistema:</b> Phobia OS 2000</p><p><b>Processador:</b> Pentium III 733 MHz</p><p><b>Memória:</b> 128 MB</p><p><b>Rede:</b> ' + (netOn() ? 'NET//TRACE conectado' : 'discada · desconectada') + '</p>';
    w.hidden = false; paintDesk();
  }
  function openNet() {
    close();
    try { if (document.body.classList.contains('workspace-sheet')) switchWorkspace('navigation'); } catch (e) {}
    try { switchPage('hackPage'); } catch (e) {}
  }
  function bindDesk() {
    desk.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!desk.classList.contains('big')) { if (!t || t.dataset.desk !== 'size') { deskSize(true); return; } }
      if (!t) return;
      var k = t.dataset.desk;
      if (t.dataset.deskClose) { $('.cb-' + (t.dataset.deskClose === 'pc' ? 'pcw' : t.dataset.deskClose), desk).hidden = true; paintDesk(); return; }
      if (k === 'size') return deskSize(!desk.classList.contains('big'));
      if (k === 'notepad') return openNotepad();
      if (k === 'cmd') return openCmd();
      if (k === 'pc') return openPc();
      if (k === 'net') return openNet();
      if (k === 'trash') { toast('A Lixeira está vazia.'); return; }
      if (k === 'start') { openCmd(); return; }
    });
    var inp = $('.cb-term input', desk), hist = [], hi = 0;
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); var v = inp.value; inp.value = ''; if (v.trim()) { hist.push(v); hi = hist.length; } runCmd(v); }
      else if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); inp.value = hist[hi]; }
      else if (e.key === 'ArrowDown' && hist.length) { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; }
    });
    $('.cb-term', desk).addEventListener('click', function () { inp.focus(); });
    /* fechar o Bloco de notas pelo × dele, dentro do computador */
    var nc = document.getElementById('noteClose');
    if (nc) nc.addEventListener('click', function () { setTimeout(paintDesk, 0); });
    tick(); setInterval(tick, 20000);
  }

  /* ---------- abrir / fechar ---------- */
  var lastFocus = null;
  function open() {
    if (typeof state === 'undefined' || !state.charSheet) return;
    build(); B();
    lastFocus = document.activeElement;
    root.hidden = false; document.body.classList.add('cb-open');
    render(); applyZoom(Z());
    requestAnimationFrame(function () { measure(); drawLinks(); if (!B().view.seen) { B().view.seen = 1; center(); } else center(); });
    paintDesk(); sfx('open');
  }
  function close() {
    if (!root || root.hidden) return;
    var np = document.getElementById('notepad'); if (np) { np.classList.remove('open', 'cb-in'); }
    desk.classList.remove('big');
    root.hidden = true; document.body.classList.remove('cb-open'); setLinkMode(false); sel = null; selLink = null;
    save(); try { lastFocus && lastFocus.focus && lastFocus.focus(); } catch (e) {}
  }
  window.PhobiaCaseBoard = { open: open, close: close, render: render };

  function init() {
    if (typeof state === 'undefined' || !document.getElementById('openNotesTop')) { setTimeout(init, 200); return; }
    ['openNotesTop', 'openNotesFoot', 'noteLaunch'].forEach(function (id) { var b = document.getElementById(id); if (b) b.onclick = function (e) { e.preventDefault(); if (root && !root.hidden) close(); else open(); }; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

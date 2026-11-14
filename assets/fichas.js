/* ==========================================================
   PERSONA // PHOBIA — fichas.js
   Várias fichas no mesmo navegador. Cada ficha guarda o estado
   inteiro (fotos, tema, mapa, agenda, notas...). A ficha aberta
   continua usando o save normal; as outras ficam guardadas no
   mesmo IndexedDB com a chave "slot:<id>".
   ========================================================== */
(function () {
  'use strict';
  var META_KEY = 'phobia-fichas-v1';
  var DB = 'PersonaPhobiaLargeSave', STORE = 'saves', MAIN = 'main', LS_SAVE = 'phobiaTokyoV2';
  var ACC = { cream: '#ef2b97', sakura: '#ff5fa2', ice: '#2f9bff', midnight: '#6ce6ff', graphite: '#ffcf59', violet: '#b47cff', makoto: '#4f7dff', joker: '#e5191c' };
  var THEME_NAME = { cream: 'Tokyo Cream', sakura: 'Sakura Paper', ice: 'Ice Pop', midnight: 'Midnight', graphite: 'Graphite', violet: 'Violet Club', makoto: 'Makoto', joker: 'Joker' };

  function S() { try { return state; } catch (e) { return null; } }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function uid() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function say(t) { try { window.toast(t); } catch (e) {} }

  function readMeta() { try { var m = JSON.parse(localStorage.getItem(META_KEY) || 'null'); if (m && Array.isArray(m.list) && m.list.length) return m; } catch (e) {} return null; }
  function writeMeta(m) { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) { say('Não deu para salvar a lista de fichas.'); } }

  /* ---------- IndexedDB ---------- */
  function idb() {
    return new Promise(function (ok, bad) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { bad(r.error); };
      r.onblocked = function () { bad(new Error('O save está em uso por outra aba.')); };
    });
  }
  function op(mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (ok, bad) {
        var tx = db.transaction(STORE, mode), st = tx.objectStore(STORE), out;
        var req = fn(st);
        if (req) req.onsuccess = function () { out = req.result; };
        tx.oncomplete = function () { db.close(); ok(out); };
        tx.onerror = tx.onabort = function () { db.close(); bad(tx.error); };
      });
    });
  }
  var get = function (k) { return op('readonly', function (s) { return s.get(k); }); };
  var put = function (k, v) { return op('readwrite', function (s) { return s.put(v, k); }); };
  var del = function (k) { return op('readwrite', function (s) { return s.delete(k); }); };

  /* ---------- resumo da ficha (nome, foto pequena, tema) ---------- */
  function thumb(src) {
    return new Promise(function (ok) {
      if (!src || !/^data:image\//.test(src)) return ok('');
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'), S2 = 160; c.width = c.height = S2;
        var g = c.getContext('2d'), s = Math.max(S2 / im.width, S2 / im.height);
        g.drawImage(im, (S2 - im.width * s) / 2, (S2 - im.height * s) / 2, im.width * s, im.height * s);
        try { ok(c.toDataURL('image/jpeg', 0.8)); } catch (e) { ok(''); }
      };
      im.onerror = function () { ok(''); };
      im.src = src;
    });
  }
  function liveTheme() { try { return window.PhobiaSheetStyle && window.PhobiaSheetStyle.current(); } catch (e) { return null; } }
  function infoOf(st) {
    var sh = (st && st.charSheet) || {}, p = sh.profile || {}, t = liveTheme();
    var nm = String(p.name || '').trim(), cd = String(p.codename || '').trim();
    return {
      name: nm || cd || '',
      real: nm && cd && cd !== nm ? cd : '',
      theme: (st && st.siteTheme) || 'cream',
      themeName: t ? t.name : '',
      acc: t ? t.acc : '',
      level: sh.cnv || 1
    };
  }
  function refreshCurrent(meta) {
    var st = S(); if (!st) return Promise.resolve(meta);
    var cur = meta.list.find(function (f) { return f.id === meta.cur; });
    if (!cur) return Promise.resolve(meta);
    var i = infoOf(st);
    cur.auto = i; cur.theme = i.theme; cur.updated = Date.now();
    var src = (st.charSheet || {}).photoData;
    if (!src) delete cur.photo;
    writeMeta(meta);
    return thumb(src).then(function (t) { if (t) { cur.photo = t; writeMeta(meta); } return meta; });
  }
  function ensureMeta() {
    var m = readMeta();
    if (!m) { m = { cur: uid(), list: [] }; m.list.push({ id: m.cur, name: '', created: Date.now() }); writeMeta(m); }
    return m;
  }

  /* ---------- trocar de ficha ---------- */
  function freezeApp() {
    /* impede que a ficha atual se salve por cima depois da troca */
    try { phobiaRestoreBlocked = true; } catch (e) {}
    try { window.saveState = function () {}; saveState = function () {}; } catch (e) {}
    try { savePhobiaFallback = function () {}; } catch (e) {}
  }
  function flushCurrent() {
    try { saveState(true); } catch (e) {}
    var wait = Promise.resolve();
    try { wait = phobiaSaveSerial.catch(function () {}); } catch (e) {}
    return wait.then(function () { return new Promise(function (r) { setTimeout(r, 120); }); });
  }
  function snapshot() { return JSON.parse(JSON.stringify(S())); }

  function switchTo(id, opts) {
    opts = opts || {};
    var meta = ensureMeta();
    if (id === meta.cur && !opts.fresh) { close(); return; }
    busy(opts.fresh ? 'Criando ficha nova…' : 'Abrindo ficha…');
    return flushCurrent().then(function () { return refreshCurrent(meta); }).then(function () {
      var snap = snapshot();
      return put('slot:' + meta.cur, snap);
    }).then(function () {
      freezeApp();
      if (opts.fresh) return Promise.all([del(MAIN)]).then(function () { try { localStorage.removeItem(LS_SAVE); } catch (e) {} });
      return get('slot:' + id).then(function (data) {
        if (!data) throw new Error('Essa ficha não foi encontrada neste navegador.');
        data.saveMeta = data.saveMeta || {}; data.saveMeta.updatedAt = Date.now();
        return put(MAIN, data).then(function () {
          try { localStorage.setItem(LS_SAVE, serializePhobiaFallback(data)); } catch (e) { try { localStorage.removeItem(LS_SAVE); } catch (x) {} }
        });
      });
    }).then(function () {
      meta.cur = id;
      if (opts.fresh && !meta.list.some(function (f) { return f.id === id; })) meta.list.push({ id: id, name: opts.name || '', created: Date.now(), theme: opts.theme || 'cream' });
      writeMeta(meta);
      try { sessionStorage.setItem('phobia-fichas-opened', opts.fresh ? 'new' : 'open'); } catch (e) {}
      location.reload();
    }).catch(function (err) {
      busy(false); say(err && err.message ? err.message : 'Não deu para trocar de ficha.');
    });
  }

  function duplicate(id) {
    var meta = ensureMeta(), nid = uid(), src = meta.list.find(function (f) { return f.id === id; });
    var load = id === meta.cur ? flushCurrent().then(function () { return snapshot(); }) : get('slot:' + id);
    return load.then(function (data) {
      if (!data) throw new Error('Ficha não encontrada.');
      return put('slot:' + nid, data);
    }).then(function () {
      meta.list.push({ id: nid, name: (src && (src.name || (src.auto && src.auto.name)) || 'Ficha') + ' (cópia)', photo: src && src.photo, theme: src && src.theme, auto: src && src.auto, created: Date.now(), updated: Date.now() });
      writeMeta(meta); render(); say('Ficha duplicada.');
    }).catch(function (e) { say(e.message || 'Erro ao duplicar.'); });
  }
  function remove(id) {
    var meta = ensureMeta();
    if (id === meta.cur) return say('Abra outra ficha antes de excluir esta.');
    var f = meta.list.find(function (x) { return x.id === id; });
    if (!confirm('Excluir a ficha "' + label(f) + '"? Isso apaga tudo dela neste navegador (fotos, mapa, notas). Não dá para desfazer.')) return;
    del('slot:' + id).then(function () {
      meta.list = meta.list.filter(function (x) { return x.id !== id; }); writeMeta(meta); render(); say('Ficha excluída.');
    });
  }
  function rename(id) {
    var meta = ensureMeta(), f = meta.list.find(function (x) { return x.id === id; });
    var n = prompt('Nome da ficha (aparece só nesta tela):', label(f));
    if (n == null) return;
    f.name = n.trim().slice(0, 40); writeMeta(meta); render();
  }
  function label(f) { return (f && f.auto && f.auto.name) || 'Sem nome no Dossiê'; }

  /* ---------- tela ---------- */
  var root = null;
  function busy(msg) {
    if (!root) return;
    root.classList.toggle('busy', !!msg);
    var b = root.querySelector('.fx-busy'); if (b) b.textContent = msg || '';
  }
  function fmt(t) { if (!t) return '—'; var d = new Date(t); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function card(f, cur, i) {
    if (f.id === cur && S()) { f = Object.assign({}, f, { auto: infoOf(S()) }); var lp = (S().charSheet || {}).photoData; f.photo = lp && /^data:image\//.test(lp) ? lp : ''; }
    var a = f.auto || {}, th = f.theme || a.theme || 'cream', acc = a.acc || ACC[th] || '#ef2b97';
    var tname = a.themeName || THEME_NAME[th] || th;
    return '<article class="fx-card' + (f.id === cur ? ' cur' : '') + '" style="--fa:' + acc + ';--d:' + (i * 60) + 'ms" data-fx-open="' + E(f.id) + '" tabindex="0" role="button" aria-label="Abrir ficha ' + E(label(f)) + '">' +
      '<div class="fx-photo">' + (f.photo ? '<img src="' + f.photo + '" alt="">' : '<span>' + E(label(f).charAt(0).toUpperCase()) + '</span>') + '</div>' +
      '<div class="fx-info"><small>' + (f.id === cur ? 'EM USO AGORA' : 'FICHA ' + String(i + 1).padStart(2, '0')) + '</small>' +
      '<b>' + E(label(f)) + '</b>' +
      (a.real && a.real !== label(f) ? '<em>' + E(a.real) + '</em>' : '') +
      '<span class="fx-tags"><i style="background:' + acc + '"></i>' + E(tname) + (a.level ? ' · Nv. ' + E(a.level) : '') + '</span>' +
      '<u>' + (f.id === cur ? 'Aberta' : 'Salva em ' + fmt(f.updated || f.created)) + '</u></div>' +
      '<div class="fx-acts">' +
        '<button type="button" data-fx-dup="' + E(f.id) + '" title="Duplicar">⧉</button>' +
        (f.id === cur ? '' : '<button type="button" class="x" data-fx-del="' + E(f.id) + '" title="Excluir">✕</button>') +
      '</div></article>';
  }
  function render() {
    if (!root) return;
    var meta = ensureMeta();
    root.querySelector('.fx-grid').innerHTML = meta.list.map(function (f, i) { return card(f, meta.cur, i); }).join('') +
      '<button type="button" class="fx-new" data-fx-new style="--d:' + (meta.list.length * 60) + 'ms"><b>＋</b><span>NOVA FICHA</span><small>Começa do zero, com tema e fotos próprios</small></button>';
    root.querySelector('.fx-count').textContent = meta.list.length + (meta.list.length === 1 ? ' ficha' : ' fichas');
  }
  function build() {
    if (root) return root;
    root = document.createElement('div');
    root.className = 'fx-root'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Fichas');
    root.innerHTML = '<div class="fx-bg"></div><section class="fx-panel">' +
      '<header class="fx-head"><div><small>SELECT // PERSONAGENS <span class="fx-count"></span></small><h2>QUEM VAI <span>JOGAR?</span></h2></div>' +
      '<button type="button" class="fx-close" data-fx-close aria-label="Fechar">✕</button></header>' +
      '<p class="fx-hint">Cada ficha tem o próprio personagem, fotos, tema, mapa, agenda e notas. <b>O nome e a foto de cada cartão vêm do Dossiê</b> da ficha: mude lá e o cartão acompanha. Tudo fica salvo neste navegador; para levar a outro aparelho, use o Exportar da ficha.</p>' +
      '<div class="fx-grid"></div>' +
      '<div class="fx-new-form" hidden><label>Nome do personagem (vai para o Dossiê)<input maxlength="60" placeholder="Ex.: Ren Amamiya"></label><small class="fx-tlabel">TEMA DA FICHA</small>' +
      '<div class="fx-themes"></div>' +
      '<div class="fx-new-acts"><button type="button" data-fx-cancel>Cancelar</button><button type="button" class="go" data-fx-create>CRIAR E ABRIR ▶</button></div></div>' +
      '<div class="fx-busy" aria-live="polite"></div></section>';
    document.body.appendChild(root);
    var newTheme = 'phobia';
    root.addEventListener('click', function (e) {
      var t = e.target.closest('button,[data-fx-open]'); if (!t) { if (e.target.classList.contains('fx-bg')) close(); return; }
      if (t.hasAttribute('data-fx-close')) return close();
      if (t.dataset.fxDup) { e.stopPropagation(); return duplicate(t.dataset.fxDup); }
      if (t.dataset.fxRen) { e.stopPropagation(); return rename(t.dataset.fxRen); }
      if (t.dataset.fxDel) { e.stopPropagation(); return remove(t.dataset.fxDel); }
      if (t.hasAttribute('data-fx-new')) {
        var pr = (window.PhobiaSheetStyle && window.PhobiaSheetStyle.presets) || [];
        root.querySelector('.fx-themes').innerHTML = pr.map(function (q) { return '<button type="button" data-fx-theme="' + E(q.id) + '" style="--fa:' + q.c.acc + '"' + (q.id === newTheme ? ' aria-pressed="true"' : '') + '><i></i>' + E(q.name) + '</button>'; }).join('');
        root.querySelector('.fx-new-form').hidden = false; root.querySelector('.fx-new-form input').focus(); return;
      }
      if (t.hasAttribute('data-fx-cancel')) { root.querySelector('.fx-new-form').hidden = true; return; }
      if (t.dataset.fxTheme) { newTheme = t.dataset.fxTheme; root.querySelectorAll('[data-fx-theme]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); return; }
      if (t.hasAttribute('data-fx-create')) {
        var nm = root.querySelector('.fx-new-form input').value.trim();
        try { sessionStorage.setItem('phobia-fichas-new', JSON.stringify({ name: nm, theme: newTheme })); } catch (x) {}
        return switchTo(uid(), { fresh: true, name: nm, theme: newTheme });
      }
      if (t.dataset.fxOpen) return switchTo(t.dataset.fxOpen);
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.fxOpen) { e.preventDefault(); switchTo(e.target.dataset.fxOpen); }
    });
    return root;
  }
  function open() {
    build(); var meta = ensureMeta();
    refreshCurrent(meta).then(render);
    render(); root.hidden = false; document.body.classList.add('fx-lock');
    requestAnimationFrame(function () { root.classList.add('in'); });
  }
  function close() { if (!root) return; root.classList.remove('in'); document.body.classList.remove('fx-lock'); setTimeout(function () { root.hidden = true; }, 220); }
  window.PhobiaFichas = { open: open, close: close };

  /* ---------- botão no topo + ajustes da ficha recém-criada ---------- */
  function addButton() {
    if (document.getElementById('fichasButton')) return;
    var b = document.createElement('button');
    b.id = 'fichasButton'; b.type = 'button'; b.className = 'fx-btn'; b.title = 'Fichas: trocar de personagem ou criar outra';
    b.setAttribute('aria-label', 'Fichas');
    b.innerHTML = '<i></i><i></i><i></i><span>FICHAS</span>';
    b.addEventListener('click', open);
    var anchor = document.getElementById('siteThemeButton');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b, anchor);
    else document.body.appendChild(b);
    var extra = document.querySelector('.hud-menu-extra');
    if (extra && !extra.querySelector('.fx-menu-btn')) {
      var m = document.createElement('button');
      m.type = 'button'; m.className = 'fx-menu-btn';
      m.innerHTML = '<span><i></i><i></i></span>FICHAS <small>trocar de personagem</small>';
      m.addEventListener('click', function () { document.body.classList.remove('hud-menu-open'); open(); });
      extra.insertBefore(m, extra.firstChild);
    }
  }
  function afterBoot() {
    var meta = ensureMeta();
    var pend = null; try { pend = JSON.parse(sessionStorage.getItem('phobia-fichas-new') || 'null'); sessionStorage.removeItem('phobia-fichas-new'); } catch (e) {}
    var opened = null; try { opened = sessionStorage.getItem('phobia-fichas-opened'); sessionStorage.removeItem('phobia-fichas-opened'); } catch (e) {}
    var st = S();
    if (pend && st) {
      try { if (pend.theme && window.PhobiaSheetStyle) window.PhobiaSheetStyle.apply(pend.theme); } catch (e) {}
      try { if (pend.name) { st.charSheet.profile = st.charSheet.profile || {}; st.charSheet.profile.name = pend.name; } } catch (e) {}
      try { saveState(true); } catch (e) {}
      try { renderCharacterSheet && renderCharacterSheet(); } catch (e) {}
    }
    refreshCurrent(meta);
    if (opened) { var f = meta.list.find(function (x) { return x.id === meta.cur; }); say((opened === 'new' ? 'Ficha nova: ' : 'Ficha aberta: ') + label(f)); }
    var tmr = 0;
    document.addEventListener('input', function (e) {
      if (!e.target.matches || !e.target.matches('[data-sheet="profile.name"],[data-sheet="profile.codename"]')) return;
      clearTimeout(tmr); tmr = setTimeout(function () { var m = readMeta(); if (m) refreshCurrent(m).then(function () { if (root && !root.hidden) render(); }); }, 600);
    }, true);
    try { var op = window.saveState; } catch (e) {}
    /* mantém a miniatura em dia */
    setInterval(function () { var m = readMeta(); if (m) refreshCurrent(m); }, 60000);
  }
  function init() {
    addButton();
    var ready; try { ready = phobiaReadyPromise; } catch (e) { ready = Promise.resolve(); }
    ready.then(function () { setTimeout(afterBoot, 300); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

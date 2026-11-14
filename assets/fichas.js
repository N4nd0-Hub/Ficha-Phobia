/* ==========================================================
   PERSONA // PHOBIA — fichas.js  (v4, à prova de perda)
   Várias fichas no mesmo navegador. Cada ficha guarda o estado
   inteiro (fotos, tema, mapa, agenda, notas...).
   - A ficha aberta usa o save normal ("main").
   - As outras ficam no mesmo IndexedDB como "slot:<id>".
   - O id de cada ficha fica DENTRO do save dela (saveMeta.fichaId),
     então a lista nunca confunde uma ficha com outra.
   - A lista fica no IndexedDB ("fichas-meta"), com cópia leve no
     localStorage. Fichas guardadas fora da lista são encontradas
     e voltam para a tela sozinhas.
   - Nada é apagado na troca: só depois de conferir que a ficha
     aberta foi gravada com sucesso.
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
        tx.onerror = tx.onabort = function () { db.close(); bad(tx.error || new Error('Erro no armazenamento do navegador.')); };
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
      var im = new Image(), done = false, fin = function (v) { if (!done) { done = true; ok(v); } };
      setTimeout(function () { fin(''); }, 4000);
      im.onload = function () {
        var c = document.createElement('canvas'), Z = 160; c.width = c.height = Z;
        var g = c.getContext('2d'), s = Math.max(Z / im.width, Z / im.height);
        g.drawImage(im, (Z - im.width * s) / 2, (Z - im.height * s) / 2, im.width * s, im.height * s);
        try { fin(c.toDataURL('image/jpeg', 0.8)); } catch (e) { fin(''); }
      };
      im.onerror = function () { fin(''); };
      im.src = src;
    });
  }
  function presets() { return (window.PhobiaSheetStyle && window.PhobiaSheetStyle.presets) || []; }
  function themeOf(data) {
    try {
      var h = (data.charSheet.ui && data.charSheet.ui.hud) || {}, p = presets().find(function (x) { return x.id === h.preset; }) || presets()[0];
      return { themeName: h.custom ? 'Personalizado' : (p ? p.name : ''), acc: (h.colors && h.colors.acc) || (p ? p.c.acc : '') };
    } catch (e) { return {}; }
  }
  function infoFromData(data) {
    var sh = (data && data.charSheet) || {}, p = sh.profile || {}, t = themeOf(data);
    var nm = String(p.name || '').trim(), cd = String(p.codename || '').trim();
    return { name: nm || cd || '', real: nm && cd && cd !== nm ? cd : '', theme: (data && data.siteTheme) || 'cream', themeName: t.themeName || '', acc: t.acc || '', level: sh.cnv || 1 };
  }
  function curId() { var st = S(); return st && st.saveMeta && st.saveMeta.fichaId; }

  /* ---------- lista de fichas ---------- */
  var M = { cur: '', list: [] };
  function lsMirror(m) {
    try { localStorage.setItem(META_KEY, JSON.stringify({ cur: m.cur, list: m.list.map(function (f) { var c = Object.assign({}, f); delete c.photo; return c; }) })); } catch (e) {}
  }
  function loadMeta() {
    return get('fichas-meta').catch(function () { return null; }).then(function (m) {
      if (!m || !Array.isArray(m.list)) { try { m = JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch (e) { m = null; } }
      if (!m || !Array.isArray(m.list)) m = { cur: '', list: [] };
      M = m; return m;
    });
  }
  function saveMeta(m) { M = m; return put('fichas-meta', m).then(function () { lsMirror(m); return m; }); }
  function entry(m, id) { var f = m.list.find(function (x) { return x.id === id; }); if (!f) { f = { id: id, created: Date.now() }; m.list.push(f); } return f; }
  function refreshCurrent() {
    var st = S(), m = M; if (!st || !curId()) return Promise.resolve(m);
    var f = entry(m, curId()); m.cur = curId();
    f.auto = infoFromData(st); f.updated = Date.now();
    var src = (st.charSheet || {}).photoData;
    return thumb(src).then(function (t) { if (t) f.photo = t; else if (!src) delete f.photo; return saveMeta(m); }).catch(function () { return m; });
  }
  /* encontra fichas guardadas que não aparecem na lista (recuperação automática) */
  function scanSlots(m) {
    return op('readonly', function (s) { return s.getAllKeys(); }).then(function (keys) {
      var ids = (keys || []).filter(function (k) { return typeof k === 'string' && k.indexOf('slot:') === 0; }).map(function (k) { return k.slice(5); });
      var chain = Promise.resolve();
      ids.forEach(function (id) {
        if (id === m.cur) return;
        var known = m.list.find(function (x) { return x.id === id; });
        if (known && known.auto && known.auto.name !== undefined && known.photoChecked) return;
        chain = chain.then(function () {
          return get('slot:' + id).then(function (data) {
            if (!data) return;
            var e = entry(m, id); e.auto = infoFromData(data); e.photoChecked = true;
            e.updated = e.updated || (data.saveMeta && data.saveMeta.updatedAt) || Date.now();
            if (!known) e.recovered = true;
            return thumb((data.charSheet || {}).photoData).then(function (t) { if (t) e.photo = t; });
          });
        });
      });
      return chain.then(function () {
        m.list = m.list.filter(function (x) { return x.id === m.cur || ids.indexOf(x.id) >= 0; });
        return m;
      });
    }).catch(function () { return m; });
  }
  /* liga a ficha aberta a um id próprio, guardado dentro do save dela */
  function reconcile() {
    return loadMeta().then(function (m) {
      var st = S(); if (!st) return m;
      st.saveMeta = st.saveMeta || {};
      var pend = null; try { pend = JSON.parse(sessionStorage.getItem('phobia-fichas-new') || 'null'); } catch (e) {}
      if (pend && pend.id && !st.saveMeta.fichaId) st.saveMeta.fichaId = pend.id;
      var step = Promise.resolve();
      if (!st.saveMeta.fichaId) {
        step = (m.cur ? get('slot:' + m.cur).catch(function () { return null; }) : Promise.resolve(null)).then(function (slot) {
          /* já existe cópia guardada com o id antigo? então esta é OUTRA ficha: id novo, nada é sobrescrito */
          st.saveMeta.fichaId = (m.cur && !slot) ? m.cur : uid();
        });
      }
      return step.then(function () {
        try { saveState(true); } catch (e) {}
        m.cur = st.saveMeta.fichaId; entry(m, m.cur);
        return scanSlots(m);
      }).then(function (m2) { M = m2; return refreshCurrent(); });
    });
  }

  /* ---------- trocar de ficha ---------- */
  function freezeApp() {
    try { phobiaRestoreBlocked = true; } catch (e) {}
    try { window.saveState = function () {}; saveState = function () {}; } catch (e) {}
    try { savePhobiaFallback = function () {}; } catch (e) {}
  }
  function flushCurrent() {
    try { saveState(true); } catch (e) {}
    var wait = Promise.resolve();
    try { wait = phobiaSaveSerial.catch(function () {}); } catch (e) {}
    return wait.then(function () { return new Promise(function (r) { setTimeout(r, 150); }); });
  }
  function snapshot() { return JSON.parse(JSON.stringify(S())); }
  /* guarda a ficha aberta e confere a gravação antes de seguir */
  function stashCurrent() {
    return flushCurrent().then(function () {
      var snap = snapshot(); snap.saveMeta = snap.saveMeta || {};
      var id = snap.saveMeta.fichaId || uid(); snap.saveMeta.fichaId = id;
      return get('slot:' + id).then(function (old) {
        if (old && old.saveMeta && old.saveMeta.fichaId && old.saveMeta.fichaId !== id) { id = uid(); snap.saveMeta.fichaId = id; }
        return put('slot:' + id, snap);
      }).then(function () { return get('slot:' + id); }).then(function (back) {
        if (!back || !back.charSheet) throw new Error('Não deu para guardar esta ficha com segurança. Nada foi trocado.');
        return { id: id, snap: snap };
      });
    });
  }
  function switchTo(id, opts) {
    opts = opts || {};
    if (id === curId() && !opts.fresh) { close(); return; }
    busy(opts.fresh ? 'Criando ficha nova…' : 'Abrindo ficha…');
    var m;
    return loadMeta().then(function (mm) { m = mm; return stashCurrent(); }).then(function (r) {
      var e = entry(m, r.id); e.auto = infoFromData(r.snap); e.updated = Date.now(); e.photoChecked = false;
      if (opts.fresh) { var n = entry(m, id); n.auto = { name: opts.name || '', themeName: '', acc: '' }; }
      m.cur = id;
      return saveMeta(m);
    }).then(function () {
      if (opts.fresh) return null;
      return get('slot:' + id).then(function (data) { if (!data) throw new Error('Essa ficha não foi encontrada neste navegador.'); return data; });
    }).then(function (data) {
      freezeApp();
      if (opts.fresh) {
        try { sessionStorage.setItem('phobia-fichas-new', JSON.stringify({ id: id, name: opts.name || '', theme: opts.theme || 'phobia' })); } catch (e) {}
        return del(MAIN).then(function () { try { localStorage.removeItem(LS_SAVE); } catch (e) {} });
      }
      data.saveMeta = data.saveMeta || {}; data.saveMeta.fichaId = id; data.saveMeta.updatedAt = Date.now();
      return put(MAIN, data).then(function () {
        try { localStorage.setItem(LS_SAVE, serializePhobiaFallback(data)); } catch (e) { try { localStorage.removeItem(LS_SAVE); } catch (x) {} }
      });
    }).then(function () {
      try { sessionStorage.setItem('phobia-fichas-opened', opts.fresh ? 'new' : 'open'); } catch (e) {}
      location.reload();
    }).catch(function (err) {
      busy(false); say(err && err.message ? err.message : 'Não deu para trocar de ficha.');
    });
  }
  function duplicate(id) {
    var nid = uid();
    var load = id === curId() ? flushCurrent().then(function () { return snapshot(); }) : get('slot:' + id);
    return load.then(function (data) {
      if (!data) throw new Error('Ficha não encontrada.');
      data.saveMeta = data.saveMeta || {}; data.saveMeta.fichaId = nid;
      return put('slot:' + nid, data).then(function () { return data; });
    }).then(function (data) {
      return loadMeta().then(function (m) {
        var e = entry(m, nid); e.auto = infoFromData(data); e.copy = true; e.updated = Date.now(); e.photoChecked = true;
        return thumb((data.charSheet || {}).photoData).then(function (t) { if (t) e.photo = t; return saveMeta(m); });
      });
    }).then(function () { render(); say('Ficha duplicada.'); }).catch(function (e) { say(e.message || 'Erro ao duplicar.'); });
  }
  function remove(id) {
    if (id === curId()) return say('Abra outra ficha antes de excluir esta.');
    var f = M.list.find(function (x) { return x.id === id; }) || {};
    if (!confirm('Excluir a ficha "' + label(f) + '"? Isso apaga tudo dela neste navegador (fotos, mapa, notas). Não dá para desfazer.')) return;
    del('slot:' + id).then(loadMeta).then(function (m) {
      m.list = m.list.filter(function (x) { return x.id !== id; }); return saveMeta(m);
    }).then(function () { render(); say('Ficha excluída.'); });
  }
  function label(f) { return (f && f.auto && f.auto.name) ? f.auto.name + (f.copy ? ' (cópia)' : '') : 'Sem nome no Dossiê'; }

  /* ---------- tela ---------- */
  var root = null;
  function busy(msg) {
    if (!root) return;
    root.classList.toggle('busy', !!msg);
    var b = root.querySelector('.fx-busy'); if (b) b.textContent = msg || '';
  }
  function fmt(t) { if (!t) return '—'; var d = new Date(t); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function card(f, cur, i) {
    if (f.id === cur && S()) { f = Object.assign({}, f, { auto: infoFromData(S()) }); var lp = (S().charSheet || {}).photoData; f.photo = lp && /^data:image\//.test(lp) ? lp : ''; }
    var a = f.auto || {}, th = a.theme || 'cream', acc = a.acc || ACC[th] || '#ef2b97';
    var tname = a.themeName || THEME_NAME[th] || th;
    return '<article class="fx-card' + (f.id === cur ? ' cur' : '') + '" style="--fa:' + acc + ';--d:' + (i * 60) + 'ms" data-fx-open="' + E(f.id) + '" tabindex="0" role="button" aria-label="Abrir ficha ' + E(label(f)) + '">' +
      '<div class="fx-photo">' + (f.photo ? '<img src="' + f.photo + '" alt="">' : '<span>' + E(label(f).charAt(0).toUpperCase()) + '</span>') + '</div>' +
      '<div class="fx-info"><small>' + (f.id === cur ? 'EM USO AGORA' : f.recovered ? 'RECUPERADA' : 'FICHA ' + String(i + 1).padStart(2, '0')) + '</small>' +
      '<b>' + E(label(f)) + '</b>' +
      (a.real && a.real !== label(f) ? '<em>' + E(a.real) + '</em>' : '') +
      '<span class="fx-tags"><i style="background:' + acc + '"></i>' + E(tname) + (a.level ? ' · Nv. ' + E(a.level) : '') + '</span>' +
      '<u>' + (f.id === cur ? 'Aberta' : 'Guardada em ' + fmt(f.updated || f.created)) + '</u></div>' +
      '<div class="fx-acts">' +
        '<button type="button" data-fx-dup="' + E(f.id) + '" title="Duplicar">⧉</button>' +
        (f.id === cur ? '' : '<button type="button" class="x" data-fx-del="' + E(f.id) + '" title="Excluir">✕</button>') +
      '</div></article>';
  }
  function render() {
    if (!root) return;
    var m = M, cur = curId();
    var list = m.list.slice().sort(function (a, b) { return (a.id === cur ? -1 : 0) - (b.id === cur ? -1 : 0); });
    root.querySelector('.fx-grid').innerHTML = list.map(function (f, i) { return card(f, cur, i); }).join('') +
      '<button type="button" class="fx-new" data-fx-new style="--d:' + (list.length * 60) + 'ms"><b>＋</b><span>NOVA FICHA</span><small>Começa do zero, com tema e fotos próprios</small></button>';
    root.querySelector('.fx-count').textContent = list.length + (list.length === 1 ? ' ficha' : ' fichas');
  }
  function build() {
    if (root) return root;
    root = document.createElement('div');
    root.className = 'fx-root'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Fichas');
    root.innerHTML = '<div class="fx-bg"></div><section class="fx-panel">' +
      '<header class="fx-head"><div><small>SELECT // PERSONAGENS <span class="fx-count"></span></small><h2>QUEM VAI <span>JOGAR?</span></h2></div>' +
      '<button type="button" class="fx-close" data-fx-close aria-label="Fechar">✕</button></header>' +
      '<p class="fx-hint">Cada ficha tem o próprio personagem, fotos, tema, mapa, agenda e notas. <b>O nome e a foto de cada cartão vêm do Dossiê</b> da ficha. Tudo fica salvo neste navegador; para levar a outro aparelho, use o Backup JSON da ficha.</p>' +
      '<div class="fx-grid"></div>' +
      '<div class="fx-new-form" hidden><label>Nome do personagem (vai para o Dossiê)<input maxlength="60" placeholder="Ex.: Ren Amamiya"></label><small class="fx-tlabel">TEMA DA FICHA</small>' +
      '<div class="fx-themes"></div>' +
      '<div class="fx-new-acts"><button type="button" data-fx-cancel>Cancelar</button><button type="button" class="go" data-fx-create>CRIAR E ABRIR ▶</button></div></div>' +
      '<div class="fx-busy" aria-live="polite"></div></section>';
    document.body.appendChild(root);
    var newTheme = 'phobia';
    root.addEventListener('click', function (e) {
      var t = e.target.closest('button,[data-fx-open]'); if (!t) { if (e.target.classList.contains('fx-bg')) close(); return; }
      if (root.classList.contains('busy')) return;
      if (t.hasAttribute('data-fx-close')) return close();
      if (t.dataset.fxDup) { e.stopPropagation(); return duplicate(t.dataset.fxDup); }
      if (t.dataset.fxDel) { e.stopPropagation(); return remove(t.dataset.fxDel); }
      if (t.hasAttribute('data-fx-new')) {
        root.querySelector('.fx-themes').innerHTML = presets().map(function (q) { return '<button type="button" data-fx-theme="' + E(q.id) + '" style="--fa:' + q.c.acc + '"' + (q.id === newTheme ? ' aria-pressed="true"' : '') + '><i></i>' + E(q.name) + '</button>'; }).join('');
        root.querySelector('.fx-new-form').hidden = false; root.querySelector('.fx-new-form input').focus(); return;
      }
      if (t.hasAttribute('data-fx-cancel')) { root.querySelector('.fx-new-form').hidden = true; return; }
      if (t.dataset.fxTheme) { newTheme = t.dataset.fxTheme; root.querySelectorAll('[data-fx-theme]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); return; }
      if (t.hasAttribute('data-fx-create')) return switchTo(uid(), { fresh: true, name: root.querySelector('.fx-new-form input').value.trim(), theme: newTheme });
      if (t.dataset.fxOpen) return switchTo(t.dataset.fxOpen);
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.fxOpen) { e.preventDefault(); switchTo(e.target.dataset.fxOpen); }
    });
    return root;
  }
  var ready = Promise.resolve();
  function open() {
    build(); render(); root.hidden = false; document.body.classList.add('fx-lock');
    requestAnimationFrame(function () { root.classList.add('in'); });
    busy('Procurando fichas…');
    ready.then(function () { return loadMeta(); }).then(function (m) { return scanSlots(m); }).then(function (m) { M = m; return refreshCurrent(); })
      .catch(function () {}).then(function () { busy(false); render(); });
  }
  function close() { if (!root) return; root.classList.remove('in'); document.body.classList.remove('fx-lock'); setTimeout(function () { root.hidden = true; }, 220); }
  window.PhobiaFichas = { open: open, close: close };

  /* ---------- botão no topo ---------- */
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
    var pend = null; try { pend = JSON.parse(sessionStorage.getItem('phobia-fichas-new') || 'null'); } catch (e) {}
    var opened = null; try { opened = sessionStorage.getItem('phobia-fichas-opened'); sessionStorage.removeItem('phobia-fichas-opened'); } catch (e) {}
    var st = S();
    ready = reconcile().catch(function (e) { console.warn('fichas', e); }).then(function () {
      try { sessionStorage.removeItem('phobia-fichas-new'); } catch (e) {}
      if (pend && st) {
        try { if (pend.theme && window.PhobiaSheetStyle) window.PhobiaSheetStyle.apply(pend.theme); } catch (e) {}
        try { if (pend.name) { st.charSheet.profile = st.charSheet.profile || {}; st.charSheet.profile.name = pend.name; } } catch (e) {}
        try { saveState(true); } catch (e) {}
        try { renderCharacterSheet(); } catch (e) {}
        return refreshCurrent();
      }
    }).then(function () {
      if (opened) say((opened === 'new' ? 'Ficha nova: ' : 'Ficha aberta: ') + ((S() && infoFromData(S()).name) || 'sem nome'));
      var rec = M.list.filter(function (f) { return f.recovered; }).length;
      if (rec) say(rec === 1 ? 'Encontrei 1 ficha guardada e ela voltou para a lista de Fichas.' : 'Encontrei ' + rec + ' fichas guardadas e elas voltaram para a lista de Fichas.');
    });
    var tmr = 0;
    document.addEventListener('input', function (e) {
      if (!e.target.matches || !e.target.matches('[data-sheet="profile.name"],[data-sheet="profile.codename"]')) return;
      clearTimeout(tmr); tmr = setTimeout(function () { ready.then(refreshCurrent).then(function () { if (root && !root.hidden) render(); }); }, 600);
    }, true);
    setInterval(function () { ready.then(refreshCurrent); }, 60000);
  }
  function init() {
    addButton();
    var r; try { r = phobiaReadyPromise; } catch (e) { r = Promise.resolve(); }
    r.then(function () { setTimeout(afterBoot, 300); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

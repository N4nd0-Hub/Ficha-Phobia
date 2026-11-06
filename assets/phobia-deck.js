/* ==========================================================
   PERSONA // PHOBIA — phobia-deck.js
   Player da barra inferior com playlist.

   • Várias faixas, salvas no navegador (IndexedDB "PersonaPhobiaMedia").
   • Anterior / tocar / próxima, aleatório, repetir (tudo / uma), volume.
   • Capa por faixa (opcional) ou capa gerada pelo nome.
   • Arrastar para reordenar; soltar arquivos de áudio na playlist.
   • Teclas de mídia e tela de bloqueio do celular (Media Session).
   • Migra a faixa única do player antigo para a playlist.

   Usa do index.html, na hora da chamada: state, saveState, toast.
   ========================================================== */
(function (root) {
  'use strict';

  var DB_NAME = 'PersonaPhobiaMedia', STORE = 'files', LEGACY_KEY = 'activeTrack';
  var dbPromise = null;

  /* ---------- IndexedDB ---------- */
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!root.indexedDB) { reject(new Error('IndexedDB indisponível')); return; }
      var req = root.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    dbPromise.catch(function () { dbPromise = null; });
    return dbPromise;
  }
  function dbDo(mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode), out;
        var req = fn(tx.objectStore(STORE));
        if (req) req.onsuccess = function () { out = req.result; };
        tx.oncomplete = function () { resolve(out); };
        tx.onerror = tx.onabort = function () { reject(tx.error); };
      });
    });
  }
  var dbGet = function (k) { return dbDo('readonly', function (s) { return s.get(k); }); };
  var dbPut = function (k, v) { return dbDo('readwrite', function (s) { s.put(v, k); }); };
  var dbDel = function (k) { return dbDo('readwrite', function (s) { s.delete(k); }); };

  /* ---------- estado (vive em state.mediaPlayer, vai junto do save) ---------- */
  function st() {
    var s = (typeof state !== 'undefined') ? state : (root.state || (root.state = {}));
    var m = s.mediaPlayer || (s.mediaPlayer = {});
    if (!Array.isArray(m.tracks)) {
      m.tracks = [];
      if (m.fileName) {
        m.tracks.push({ id: 't_legacy', key: LEGACY_KEY, title: m.title || nameFromFile(m.fileName),
          artist: m.artist || '', fileName: m.fileName, duration: 0 });
        m.current = 't_legacy';
      }
      if (m.loop && !m.repeat) m.repeat = 'one';
    }
    if (m.repeat !== 'all' && m.repeat !== 'one') m.repeat = m.repeat === undefined ? 'all' : 'off';
    if (typeof m.volume !== 'number') m.volume = 75;
    return m;
  }
  function save() { try { if (typeof saveState === 'function') saveState(true); } catch (e) {} }
  function say(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }
  function nameFromFile(n) { return String(n || 'Faixa').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || 'Faixa'; }
  function newId() { return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function blobKey(t) { return t.key || ('track:' + t.id); }
  function coverKey(t) { return 'cover:' + t.id; }
  function track(id) { var l = st().tracks; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function index(id) { var l = st().tracks; for (var i = 0; i < l.length; i++) if (l[i].id === id) return i; return -1; }
  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hue(str) { var h = 0; str = String(str || ''); for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h % 360; }
  function initials(t) {
    var w = String(t.title || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/);
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
  }

  /* ---------- ícones ---------- */
  var I = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3v16H5zM20 4.5v15L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 4h3v16h-3zM4 4.5v15L15 12z"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h12v2.6H3zM3 10.7h12v2.6H3zM3 16.4h8V19H3zM17 9.5V19a2.6 2.6 0 1 1-2-2.5V7h5v2.5z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h4.2l9 12H19v-2.5l4 3.5-4 3.5V20h-3.8l-9-12H3zM16 6h3V3.5l4 3.5-4 3.5V8h-2.2l-2.3 3-1.2-1.6zM3 16h4.2l1.6-2.1L10 15.5 8.2 18H3z"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11V8a3 3 0 0 1 3-3h10V2.5l4 3.5-4 3.5V7H7a1 1 0 0 0-1 1v3zM20 13v3a3 3 0 0 1-3 3H7v2.5L3 18l4-3.5V17h10a1 1 0 0 0 1-1v-3z"/></svg>',
    vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4.5v15L7 15H3zM15 8.5a5 5 0 0 1 0 7l-1.4-1.4a3 3 0 0 0 0-4.2zM17.8 5.7a9 9 0 0 1 0 12.6l-1.4-1.4a7 7 0 0 0 0-9.8z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.2V20h2.8l9.9-9.9-2.8-2.8zM18.1 8.7l-2.8-2.8 1.6-1.6a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4z"/></svg>',
    del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 4.9 12 10.6l5.6-5.7 1.5 1.5-5.7 5.6 5.7 5.6-1.5 1.5-5.6-5.7-5.6 5.7-1.5-1.5 5.7-5.6-5.7-5.6z"/></svg>',
    grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v3H8zM13 5h3v3h-3zM8 10.5h3v3H8zM13 10.5h3v3h-3zM8 16h3v3H8zM13 16h3v3h-3z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 4h2.8v6.6H20v2.8h-6.6V20h-2.8v-6.6H4v-2.8h6.6z"/></svg>'
  };

  /* ---------- áudio ---------- */
  var audio = null, objUrl = '', loadedId = null, loadToken = 0, history = [];
  var coverUrls = {};   // id -> object URL (capas por faixa)
  var missing = {};     // id -> true quando o arquivo não está neste navegador
  var els = {};

  function current() { var m = st(); return track(m.current) || m.tracks[0] || null; }

  function loadTrack(t, autoplay) {
    if (!audio) return Promise.resolve(false);
    var token = ++loadToken;
    st().current = t ? t.id : null;
    renderAll();
    if (!t) { audio.pause(); audio.removeAttribute('src'); audio.load(); loadedId = null; return Promise.resolve(false); }
    if (loadedId === t.id && audio.src) {
      if (autoplay) playNow();
      return Promise.resolve(true);
    }
    return dbGet(blobKey(t)).then(function (blob) {
      if (token !== loadToken) return false;
      if (!blob) {
        missing[t.id] = true; renderAll();
        if (autoplay) say('ARQUIVO AUSENTE // REANEXE A FAIXA');
        return false;
      }
      delete missing[t.id];
      if (objUrl) URL.revokeObjectURL(objUrl);
      objUrl = URL.createObjectURL(blob);
      loadedId = t.id;
      audio.src = objUrl;
      audio.load();
      if (autoplay) playNow();
      return true;
    }).catch(function () {
      if (autoplay) say('NÃO FOI POSSÍVEL LER A FAIXA');
      return false;
    });
  }
  function playNow() {
    var p = audio.play();
    if (p && p.catch) p.catch(function () { /* o navegador pode exigir um clique */ });
  }

  function toggle() {
    var t = current();
    if (!t) { openPanel(true); pickFiles(); return; }
    if (loadedId !== t.id || !audio.src) { loadTrack(t, true); return; }
    if (audio.paused) playNow(); else audio.pause();
  }

  function order() {
    return st().tracks.filter(function (t) { return !missing[t.id]; });
  }
  function step(dir, fromEnded) {
    var m = st(), list = order(), t = current();
    if (!list.length) return;
    if (fromEnded && m.repeat === 'one' && t) { audio.currentTime = 0; playNow(); return; }
    var nextT;
    if (dir < 0) {
      if (audio.currentTime > 3) { audio.currentTime = 0; return; }
      var back = history.pop();
      nextT = (back && track(back)) || list[(Math.max(0, list.indexOf(t)) - 1 + list.length) % list.length];
    } else if (m.shuffle && list.length > 1) {
      var pool = list.filter(function (x) { return x !== t; });
      nextT = pool[Math.floor(Math.random() * pool.length)];
    } else {
      var i = list.indexOf(t);
      if (fromEnded && i === list.length - 1 && m.repeat === 'off') { audio.currentTime = 0; renderPlayback(); return; }
      nextT = list[(i + 1) % list.length];
    }
    if (dir > 0 && t) { history.push(t.id); if (history.length > 50) history.shift(); }
    var wasPlaying = fromEnded || !audio.paused;
    loadTrack(nextT, wasPlaying);
  }

  /* ---------- adicionar / remover / editar ---------- */
  function isAudio(f) { return f && (/^audio\//.test(f.type) || /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f.name || '')); }

  function addFiles(files) {
    var list = Array.prototype.filter.call(files || [], isAudio);
    if (!list.length) { say('NENHUM ARQUIVO DE ÁUDIO'); return Promise.resolve(); }
    var m = st(), first = null, failed = 0;
    return list.reduce(function (p, f) {
      return p.then(function () {
        var t = { id: newId(), title: nameFromFile(f.name), artist: '', fileName: f.name, duration: 0 };
        var dash = t.title.split(/\s+-\s+/);
        if (dash.length === 2) { t.artist = dash[0]; t.title = dash[1]; }
        return dbPut(blobKey(t), f).then(function () {
          m.tracks.push(t); if (!first) first = t;
          readDuration(f).then(function (d) { if (d) { t.duration = d; save(); renderList(); } });
        }).catch(function () { failed++; });
      });
    }, Promise.resolve()).then(function () {
      save(); renderAll();
      if (failed) say(failed + ' FAIXA(S) NÃO COUBERAM NO NAVEGADOR');
      else say(list.length === 1 ? 'FAIXA ADICIONADA' : list.length + ' FAIXAS ADICIONADAS');
      if (first && (!audio.src || !current() || missing[current().id])) loadTrack(first, false);
    });
  }
  function readDuration(file) {
    return new Promise(function (resolve) {
      try {
        var a = document.createElement('audio'), u = URL.createObjectURL(file);
        a.preload = 'metadata';
        a.onloadedmetadata = function () { URL.revokeObjectURL(u); resolve(isFinite(a.duration) ? a.duration : 0); };
        a.onerror = function () { URL.revokeObjectURL(u); resolve(0); };
        a.src = u;
      } catch (e) { resolve(0); }
    });
  }
  function relink(t, file) {
    if (!isAudio(file)) return;
    dbPut(blobKey(t), file).then(function () {
      delete missing[t.id]; t.fileName = file.name; save();
      if (current() === t) { loadedId = null; loadTrack(t, false); }
      renderAll(); say('FAIXA REANEXADA');
    }).catch(function () { say('NÃO COUBE NO NAVEGADOR'); });
  }
  function removeTrack(t) {
    var m = st(), i = index(t.id);
    if (i < 0) return;
    var wasCurrent = current() === t, playing = wasCurrent && !audio.paused;
    m.tracks.splice(i, 1);
    dbDel(blobKey(t)).catch(function () {});
    dbDel(coverKey(t)).catch(function () {});
    if (coverUrls[t.id]) { URL.revokeObjectURL(coverUrls[t.id]); delete coverUrls[t.id]; }
    if (wasCurrent) { loadedId = null; loadTrack(m.tracks[Math.min(i, m.tracks.length - 1)] || null, playing); }
    save(); renderAll();
  }
  function setCover(t, file) {
    if (!file) return;
    squareJpeg(file, 320).then(function (blob) {
      return dbPut(coverKey(t), blob).then(function () {
        t.hasCover = true;
        if (coverUrls[t.id]) URL.revokeObjectURL(coverUrls[t.id]);
        coverUrls[t.id] = URL.createObjectURL(blob);
        save(); renderAll();
      });
    }).catch(function () { say('ERRO AO CARREGAR CAPA'); });
  }
  function clearCover(t) {
    t.hasCover = false;
    dbDel(coverKey(t)).catch(function () {});
    if (coverUrls[t.id]) { URL.revokeObjectURL(coverUrls[t.id]); delete coverUrls[t.id]; }
    save(); renderAll();
  }
  function squareJpeg(file, size) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = c.height = size;
        var s = Math.max(size / img.width, size / img.height), w = img.width * s, h = img.height * s;
        c.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('blob')); }, 'image/jpeg', .84);
      };
      img.onerror = function () { URL.revokeObjectURL(u); reject(new Error('img')); };
      img.src = u;
    });
  }
  function loadCovers() {
    st().tracks.forEach(function (t) {
      if (!t.hasCover || coverUrls[t.id]) return;
      dbGet(coverKey(t)).then(function (b) {
        if (b) { coverUrls[t.id] = URL.createObjectURL(b); renderAll(); }
      }).catch(function () {});
    });
  }
  function coverHTML(t, big) {
    var url = t && coverUrls[t.id];
    var deck = st().coverData;
    if (url) return '<img src="' + url + '" alt="">';
    if (t && deck && !big) return '<img src="' + deck + '" alt="">';
    if (!t) return deck ? '<img src="' + deck + '" alt="">' : '<span class="dk-gen" style="--h:330">★</span>';
    return '<span class="dk-gen" style="--h:' + hue(t.title + t.artist) + '">' + esc(initials(t)) + '</span>';
  }

  /* ---------- montagem ---------- */
  function buildPanel() {
    var p = document.createElement('section');
    p.className = 'dk-panel';
    p.id = 'deckPanel';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'Playlist');
    p.hidden = true;
    p.innerHTML =
      '<header class="dk-head">' +
        '<div class="dk-head-cover" id="dkBigCover"></div>' +
        '<div class="dk-head-copy">' +
          '<span class="dk-tag">TOCANDO AGORA</span>' +
          '<b id="dkBigTitle">Sem faixas</b>' +
          '<small id="dkBigArtist"></small>' +
        '</div>' +
        '<button type="button" class="dk-x" id="dkClose" aria-label="Fechar playlist">' + I.del + '</button>' +
      '</header>' +
      '<div class="dk-seekrow"><span id="dkCur">00:00</span><input type="range" id="dkSeek" min="0" max="1000" value="0" aria-label="Posição da faixa"><span id="dkDur">00:00</span></div>' +
      '<div class="dk-transport">' +
        '<button type="button" id="dkShuffle" class="dk-mode" aria-pressed="false" title="Aleatório">' + I.shuffle + '</button>' +
        '<button type="button" id="dkPrev" title="Anterior" aria-label="Faixa anterior">' + I.prev + '</button>' +
        '<button type="button" id="dkPlay" class="dk-bigplay" aria-label="Tocar">' + I.play + '</button>' +
        '<button type="button" id="dkNext" title="Próxima" aria-label="Próxima faixa">' + I.next + '</button>' +
        '<button type="button" id="dkRepeat" class="dk-mode" title="Repetir">' + I.repeat + '<i id="dkRepeatOne">1</i></button>' +
      '</div>' +
      '<label class="dk-vol">' + I.vol + '<input type="range" id="dkVol" min="0" max="100" aria-label="Volume"></label>' +
      '<div class="dk-listhead"><span>PLAYLIST <b id="dkTotal"></b></span>' +
        '<label class="dk-add">' + I.plus + '<span>Adicionar músicas</span><input type="file" id="dkFiles" accept="audio/*" multiple></label></div>' +
      '<ol class="dk-list" id="dkList"></ol>' +
      '<p class="dk-drop">Solte arquivos de áudio aqui</p>' +
      '<input type="file" id="dkCoverInput" accept="image/*" hidden>' +
      '<input type="file" id="dkRelinkInput" accept="audio/*" hidden>';
    document.body.appendChild(p);
    return p;
  }

  var editing = null;
  function renderList() {
    var m = st(), list = els.list;
    if (!list) return;
    var cur = current();
    els.total.textContent = m.tracks.length ? m.tracks.length + (m.tracks.length === 1 ? ' faixa' : ' faixas') : '';
    if (!m.tracks.length) {
      list.innerHTML = '<li class="dk-empty">Nenhuma música ainda. Adicione MP3, M4A, OGG ou WAV do seu computador ou celular — elas ficam salvas neste navegador.</li>';
      return;
    }
    list.innerHTML = m.tracks.map(function (t, i) {
      var on = cur === t, lost = missing[t.id];
      var row = '<li class="dk-row' + (on ? ' is-current' : '') + (lost ? ' is-missing' : '') + '" data-id="' + t.id + '" draggable="true">' +
        '<span class="dk-grip" aria-hidden="true">' + I.grip + '</span>' +
        '<button type="button" class="dk-pick" data-act="play" aria-label="Tocar ' + esc(t.title) + '">' +
          '<span class="dk-num">' + (on && audio && !audio.paused ? '<i class="dk-mini-eq"><b></b><b></b><b></b></i>' : String(i + 1).padStart(2, '0')) + '</span>' +
          '<span class="dk-thumb">' + coverHTML(t, true) + '</span>' +
          '<span class="dk-copy"><b>' + esc(t.title) + '</b><small>' + (lost ? 'Arquivo não está neste navegador · toque para reanexar' : esc(t.artist || 'Artista desconhecido')) + '</small></span>' +
          '<span class="dk-len">' + (t.duration ? fmt(t.duration) : '') + '</span>' +
        '</button>' +
        '<button type="button" class="dk-icon" data-act="edit" aria-label="Editar ' + esc(t.title) + '" aria-expanded="' + (editing === t.id) + '">' + I.edit + '</button>' +
        '<button type="button" class="dk-icon dk-danger" data-act="del" aria-label="Remover ' + esc(t.title) + '">' + I.del + '</button>';
      if (editing === t.id) {
        row += '<div class="dk-edit">' +
          '<label>Título<input data-field="title" value="' + esc(t.title) + '"></label>' +
          '<label>Artista<input data-field="artist" value="' + esc(t.artist) + '"></label>' +
          '<div class="dk-edit-actions"><button type="button" data-act="cover">Trocar capa</button>' +
          (t.hasCover ? '<button type="button" data-act="nocover">Tirar capa</button>' : '') +
          '<button type="button" data-act="relink">Trocar arquivo</button>' +
          '<button type="button" class="dk-ok" data-act="done">Pronto</button></div></div>';
      }
      return row + '</li>';
    }).join('');
  }

  function renderNow() {
    var t = current(), m = st();
    var title = t ? t.title : 'Sem músicas';
    var meta = t ? (t.artist || 'Artista desconhecido') : 'Toque para montar a playlist';
    els.title.textContent = title;
    els.meta.textContent = meta;
    var pos = t ? (index(t.id) + 1) + '/' + m.tracks.length : '';
    els.count.textContent = m.tracks.length || '+';
    els.pos.textContent = pos;
    els.cover.innerHTML = coverHTML(t, false);
    els.bigCover.innerHTML = coverHTML(t, true);
    els.bigTitle.textContent = title;
    els.bigArtist.textContent = t ? meta + (pos ? '  ·  faixa ' + pos : '') : 'Adicione músicas para começar';
    var list = order(), up = '';
    if (t && list.length > 1) {
      if (m.shuffle) up = '<em>A SEGUIR</em><span>Ordem aleatória</span>';
      else {
        var ni = list.indexOf(t) + 1;
        if (ni < list.length || m.repeat === 'all') {
          var n = list[ni % list.length];
          up = '<em>A SEGUIR</em><span>' + esc(n.title) + (n.artist ? ' — ' + esc(n.artist) : '') + '</span>';
        }
      }
    }
    els.upNext.innerHTML = up;
    els.shuffle.setAttribute('aria-pressed', String(!!m.shuffle));
    els.repeat.dataset.mode = m.repeat;
    els.repeat.setAttribute('aria-label', { off: 'Repetir: desligado', all: 'Repetir: playlist', one: 'Repetir: esta faixa' }[m.repeat]);
    els.repeat.title = els.repeat.getAttribute('aria-label');
    if (document.activeElement !== els.vol) els.vol.value = String(m.volume);
    if (audio) audio.volume = Math.max(0, Math.min(1, m.volume / 100));
    marquee();
    mediaSession(t);
  }

  function renderPlayback() {
    if (!audio) return;
    var playing = !audio.paused && !audio.ended;
    var d = isFinite(audio.duration) ? audio.duration : 0, c = audio.currentTime || 0;
    var pct = d ? Math.min(1, c / d) : 0;
    els.bar.classList.toggle('is-playing', playing);
    els.panel.classList.toggle('is-playing', playing);
    [els.play, els.bigPlay].forEach(function (b) {
      b.innerHTML = playing ? I.pause : I.play;
      b.setAttribute('aria-label', playing ? 'Pausar' : 'Tocar');
    });
    els.progress.style.transform = 'scaleX(' + pct.toFixed(4) + ')';
    if (document.activeElement !== els.seek) els.seek.value = String(Math.round(pct * 1000));
    if (document.activeElement !== els.bigSeek) els.bigSeek.value = String(Math.round(pct * 1000));
    els.bigSeek.style.setProperty('--p', (pct * 100).toFixed(2) + '%');
    els.cur.textContent = fmt(c);
    els.dur.textContent = fmt(d);
    els.time.textContent = d ? fmt(c) + ' / ' + fmt(d) : '';
  }

  function renderAll() {
    if (!els.bar) return;
    renderNow(); renderList(); renderPlayback();
  }

  function marquee() {
    var box = els.titleBox, txt = els.title;
    if (!box || !txt) return;
    box.classList.remove('is-long');
    requestAnimationFrame(function () {
      var over = txt.scrollWidth - box.clientWidth;
      if (over > 4) {
        box.style.setProperty('--shift', (-over - 12) + 'px');
        box.style.setProperty('--dur', Math.max(6, over / 18) + 's');
        box.classList.add('is-long');
      }
    });
  }

  /* ---------- Media Session (teclas de mídia / tela de bloqueio) ---------- */
  var msBound = false;
  function mediaSession(t) {
    var ms = root.navigator && root.navigator.mediaSession;
    if (!ms || !root.MediaMetadata) return;
    try {
      var art = t && coverUrls[t.id] ? [{ src: coverUrls[t.id], sizes: '320x320', type: 'image/jpeg' }]
        : (st().coverData ? [{ src: st().coverData, sizes: '420x420', type: 'image/jpeg' }] : []);
      ms.metadata = t ? new root.MediaMetadata({ title: t.title, artist: t.artist || '', album: 'Persona // Phobia', artwork: art }) : null;
      if (msBound) return;
      msBound = true;
      ms.setActionHandler('play', function () { toggle(); });
      ms.setActionHandler('pause', function () { audio.pause(); });
      ms.setActionHandler('previoustrack', function () { step(-1); });
      ms.setActionHandler('nexttrack', function () { step(1); });
      ms.setActionHandler('seekto', function (e) { if (isFinite(e.seekTime)) audio.currentTime = e.seekTime; });
    } catch (e) {}
  }

  /* ---------- painel ---------- */
  function openPanel(force) {
    var open = typeof force === 'boolean' ? force : els.panel.hidden;
    els.panel.hidden = !open;
    els.listBtn.setAttribute('aria-expanded', String(open));
    els.coverBtn.setAttribute('aria-expanded', String(open));
    if (open) { position(); renderAll(); }
    else editing = null;
  }
  function position() {
    var r = els.player.getBoundingClientRect();
    var w = Math.min(380, root.innerWidth - 16);
    var left = Math.max(8, Math.min(r.left, root.innerWidth - w - 8));
    els.panel.style.left = left + 'px';
    els.panel.style.width = w + 'px';
    els.panel.style.bottom = (root.innerHeight - r.top + 8) + 'px';
  }
  function pickFiles() { els.files.click(); }

  /* ---------- ligações ---------- */
  function bind() {
    var m;
    els.play.addEventListener('click', toggle);
    els.bigPlay.addEventListener('click', toggle);
    els.prev.addEventListener('click', function () { step(-1); });
    els.next.addEventListener('click', function () { step(1); });
    els.bigPrev.addEventListener('click', function () { step(-1); });
    els.bigNext.addEventListener('click', function () { step(1); });
    els.listBtn.addEventListener('click', function (e) { e.stopPropagation(); openPanel(); });
    els.coverBtn.addEventListener('click', function (e) { e.stopPropagation(); openPanel(); });
    els.close.addEventListener('click', function () { openPanel(false); els.listBtn.focus(); });
    els.shuffle.addEventListener('click', function () { m = st(); m.shuffle = !m.shuffle; save(); renderNow(); });
    els.repeat.addEventListener('click', function () {
      m = st(); m.repeat = { off: 'all', all: 'one', one: 'off' }[m.repeat]; save(); renderNow();
    });
    els.vol.addEventListener('input', function () {
      m = st(); m.volume = Number(els.vol.value); audio.volume = m.volume / 100; renderNow();
    });
    els.vol.addEventListener('change', save);
    [els.seek, els.bigSeek].forEach(function (s) {
      s.addEventListener('input', function () {
        if (isFinite(audio.duration) && audio.duration > 0) audio.currentTime = s.value / 1000 * audio.duration;
        renderPlayback();
      });
    });
    els.files.addEventListener('change', function () { addFiles(els.files.files); els.files.value = ''; });

    var target = null;
    els.coverInput.addEventListener('change', function () {
      if (target && els.coverInput.files[0]) setCover(target, els.coverInput.files[0]);
      els.coverInput.value = '';
    });
    els.relinkInput.addEventListener('change', function () {
      if (target && els.relinkInput.files[0]) relink(target, els.relinkInput.files[0]);
      els.relinkInput.value = '';
    });

    els.list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'), row = e.target.closest('.dk-row');
      if (!b || !row) return;
      var t = track(row.dataset.id), act = b.dataset.act;
      if (!t) return;
      if (act === 'play') {
        if (missing[t.id]) { target = t; els.relinkInput.click(); return; }
        if (current() === t && audio.src && loadedId === t.id) toggle();
        else { var c = current(); if (c && c !== t) history.push(c.id); loadTrack(t, true); }
      } else if (act === 'edit') { editing = editing === t.id ? null : t.id; renderList(); focusEdit(); }
      else if (act === 'done') { editing = null; renderAll(); }
      else if (act === 'del') {
        if (root.confirm('Remover "' + t.title + '" da playlist?')) removeTrack(t);
      }
      else if (act === 'cover') { target = t; els.coverInput.click(); }
      else if (act === 'nocover') clearCover(t);
      else if (act === 'relink') { target = t; els.relinkInput.click(); }
    });
    els.list.addEventListener('input', function (e) {
      var f = e.target.dataset.field, row = e.target.closest('.dk-row');
      if (!f || !row) return;
      var t = track(row.dataset.id); if (!t) return;
      t[f] = e.target.value.slice(0, 120);
      if (f === 'title' && !t.title.trim()) return;
      save(); renderNow();
    });
    els.list.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.dataset.field) { editing = null; renderAll(); }
    });

    /* arrastar para reordenar */
    var dragId = null;
    els.list.addEventListener('dragstart', function (e) {
      var row = e.target.closest('.dk-row'); if (!row || e.target.closest('input')) return;
      dragId = row.dataset.id; row.classList.add('is-dragging');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } catch (x) {}
    });
    els.list.addEventListener('dragover', function (e) {
      if (!dragId) return;
      e.preventDefault();
      var row = e.target.closest('.dk-row'); if (!row || row.dataset.id === dragId) return;
      var r = row.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
      var from = index(dragId), to = index(row.dataset.id) + (after ? 1 : 0);
      if (from < to) to--;
      if (from === to || from < 0) return;
      var l = st().tracks, moved = l.splice(from, 1)[0]; l.splice(to, 0, moved);
      renderList();
      var again = els.list.querySelector('[data-id="' + dragId + '"]'); if (again) again.classList.add('is-dragging');
    });
    els.list.addEventListener('dragend', function () { dragId = null; save(); renderAll(); });

    /* soltar arquivos no painel */
    els.panel.addEventListener('dragover', function (e) {
      if (dragId || !e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return;
      e.preventDefault(); els.panel.classList.add('is-drop');
    });
    els.panel.addEventListener('dragleave', function (e) { if (!els.panel.contains(e.relatedTarget)) els.panel.classList.remove('is-drop'); });
    els.panel.addEventListener('drop', function (e) {
      if (dragId) return;
      e.preventDefault(); els.panel.classList.remove('is-drop');
      addFiles(e.dataTransfer.files);
    });

    document.addEventListener('click', function (e) {
      if (els.panel.hidden) return;
      /* um clique que redesenhou a lista deixa o alvo fora do documento: ainda conta como dentro */
      var path = e.composedPath ? e.composedPath() : [e.target];
      if (path.indexOf(els.panel) >= 0 || path.indexOf(els.player) >= 0 || !document.contains(e.target)) return;
      if (e.target.closest && e.target.closest('input[type=file]')) return;
      openPanel(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.panel.hidden) { openPanel(false); els.listBtn.focus(); }
    });
    root.addEventListener('resize', function () { if (!els.panel.hidden) position(); marquee(); });

    ['timeupdate', 'loadedmetadata', 'durationchange', 'play', 'pause', 'emptied'].forEach(function (ev) {
      audio.addEventListener(ev, renderPlayback);
    });
    audio.addEventListener('play', renderList);
    audio.addEventListener('pause', renderList);
    audio.addEventListener('loadedmetadata', function () {
      var t = track(loadedId);
      if (t && isFinite(audio.duration) && Math.abs((t.duration || 0) - audio.duration) > 1) { t.duration = audio.duration; save(); renderList(); }
    });
    audio.addEventListener('ended', function () { step(1, true); });
    audio.addEventListener('error', function () {
      if (audio.getAttribute('src')) say('FORMATO DE ÁUDIO NÃO SUPORTADO');
    });
  }
  function focusEdit() {
    var i = els.list.querySelector('.dk-edit input');
    if (i) { i.focus(); i.select(); }
  }

  /* ---------- API ---------- */
  function init() {
    if (els.bar) return;
    audio = document.getElementById('phobiaAudio');
    var bar = document.getElementById('phobiaDeckBar');
    if (!audio || !bar) return;
    var panel = buildPanel();
    var q = function (id) { return document.getElementById(id); };
    els = {
      bar: bar, panel: panel, player: q('deckPlayer'),
      coverBtn: q('deckCover'), cover: q('deckCoverArt'), titleBox: q('deckTitleBox'), title: q('deckTitle'),
      meta: q('deckMeta'), pos: q('deckPos'), time: q('deckTime'), upNext: q('deckUpNext'),
      play: q('deckPlay'), prev: q('deckPrev'), next: q('deckNext'),
      listBtn: q('deckListBtn'), count: q('deckCount'), seek: q('deckSeek'), progress: q('deckProgress'),
      bigCover: q('dkBigCover'), bigTitle: q('dkBigTitle'), bigArtist: q('dkBigArtist'), close: q('dkClose'),
      cur: q('dkCur'), dur: q('dkDur'), bigSeek: q('dkSeek'),
      shuffle: q('dkShuffle'), bigPrev: q('dkPrev'), bigPlay: q('dkPlay'), bigNext: q('dkNext'), repeat: q('dkRepeat'),
      vol: q('dkVol'), total: q('dkTotal'), files: q('dkFiles'), list: q('dkList'),
      coverInput: q('dkCoverInput'), relinkInput: q('dkRelinkInput')
    };
    els.prev.innerHTML = I.prev; els.next.innerHTML = I.next; els.listBtn.insertAdjacentHTML('afterbegin', I.list);
    bind();
    refresh();
  }
  /* chamado também quando o save termina de carregar */
  function refresh() {
    if (!els.bar) return;
    st();
    var t = current();
    if (t && loadedId !== t.id) loadTrack(t, false);
    loadCovers();
    renderAll();
  }

  var api = { init: init, refresh: refresh, addFiles: addFiles, toggle: toggle, next: function () { step(1); },
    prev: function () { step(-1); }, open: openPanel, _state: st, _fmt: fmt };
  root.PhobiaDeck = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

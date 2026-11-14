/* ==========================================================
   PERSONA // PHOBIA — phobia-chat.js   (Phobia Messenger)
   Mensageiro estilo 2000 dentro do PC do Quadro de
   Investigação. Fala com o Supabase da campanha:
   jogadores entram com nome + PIN (criados no Portal do
   Narrador) e usam só as funções phobia_*; o Narrador lê
   tudo em gm.html.
   ========================================================== */
(function () {
  'use strict';
  if (window.PhobiaChat) return;

  var URL = 'https://mmkpszyxoenchajdhrof.supabase.co';
  var KEY = 'sb_publishable_RBsJ992hiwq4tAyau_hPog_kKkzCbdX';
  var SKEY = 'phobia-msg-session';

  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function okImg(s) { return /^data:image\/(png|jpeg|webp|gif);base64,/.test(String(s || '')); }
  function sfx(k) { try { window.PhobiaSfx && PhobiaSfx.play(k, 0); } catch (e) {} }
  function say(t) { try { toast(t); } catch (e) {} }

  var ERR = {
    LOGIN_INVALIDO: 'Nome ou PIN incorretos.', LOGIN_BLOQUEADO: 'Muitas tentativas. Espere 5 minutos.',
    SESSAO_INVALIDA: 'Sua sessão expirou. Entre de novo.', SEM_ACESSO: 'Você não tem acesso a essa conversa.',
    DEVAGAR: 'Calma! Muitas mensagens seguidas.', MENSAGEM_VAZIA: 'Escreva alguma coisa.', CONTATO_INVALIDO: 'Contato indisponível.'
  };
  async function rpc(name, args) {
    var r = await fetch(URL + '/rest/v1/rpc/' + name, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) });
    var t = await r.text(), j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
    if (!r.ok) { var m = (j && j.message) || ('Erro ' + r.status); var e2 = new Error(ERR[m] || m); e2.code = m; throw e2; }
    return j;
  }

  /* ---------- estado ---------- */
  var S = { sess: null, me: null, players: {}, npcs: {}, threads: [], msgs: {}, since: null, cur: null, loaded: {}, avatars: {}, polls: 0, busy: false, view: 'list' };
  try { S.sess = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {}
  function saveSess() { try { if (S.sess) localStorage.setItem(SKEY, JSON.stringify(S.sess)); else localStorage.removeItem(SKEY); } catch (e) {} }

  /* ---------- UI no PC ---------- */
  var desk = null, win = null;
  function winHTML() {
    return '<div class="cb-win pm-win" hidden><div class="cb-win-t"><span><i class="pm-ic sm"></i>Phobia Messenger</span>' +
      '<button type="button" class="cb-wmax" data-pm="max" aria-label="Maximizar" title="Maximizar">□</button><button type="button" data-pm="close" aria-label="Fechar">×</button></div>' +
      '<div class="pm-body"></div></div>';
  }
  function inject() {
    var d = document.querySelector('#cbRoot .cb-desk'); if (!d) return false;
    if (d === desk && win && d.contains(win)) return true;
    desk = d;
    var icons = $('.cb-icons', d);
    if (icons && !$('[data-desk="chat"]', icons)) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cb-icon'; b.dataset.desk = 'chat';
      b.innerHTML = '<i class="pm-ic"></i><span>Phobia Messenger</span><b class="pm-badge" hidden></b>';
      icons.insertBefore(b, icons.firstChild);
    }
    var scr = $('.cb-screen', d);
    if (!$('.pm-win', scr)) { var tmp = document.createElement('div'); tmp.innerHTML = winHTML(); scr.insertBefore(tmp.firstChild, $('.cb-task', scr)); }
    win = $('.pm-win', scr);
    d.addEventListener('click', onDeskClick);
    win.addEventListener('click', onClick);
    win.addEventListener('keydown', onKey);
    win.addEventListener('input', onInput);
    win.addEventListener('focusout', function (e) { if (e.target.classList && e.target.classList.contains('pm-psm')) savePsm(e.target); });
    win.addEventListener('mousedown', function (e) { var m = $('.pm-stmenu', win); if (m && !m.hidden && !e.target.closest('.pm-stmenu,[data-pm="stmenu"]')) m.hidden = true; if (e.target.matches && e.target.matches('.pm-prof')) { S.prof = null; S.profEdit = false; render(); } });
    paintBadge();
    return true;
  }
  function onDeskClick(e) {
    var t = e.target.closest('[data-desk="chat"]'); if (!t || !desk.classList.contains('big')) return;
    open();
  }
  function open() {
    if (!inject()) return;
    win.hidden = false; desk.classList.add('xl');
    render(); if (S.sess) poll(true);
    setTimeout(function () { var i = $('.pm-pin, .pm-input', win); if (i) i.focus(); }, 60);
  }
  function close() { if (win) win.hidden = true; var web = desk && $('.cb-web', desk); if (desk && (!web || web.hidden)) desk.classList.remove('xl'); }
  function visible() { return win && !win.hidden && document.body.classList.contains('cb-open') && !document.hidden; }

  /* ---------- render ---------- */
  function avatar(src, name, color, cls) {
    return '<span class="pm-av ' + (cls || '') + '" style="--c:' + E(color || '#888') + '">' + (okImg(src) ? '<img src="' + src + '" alt="">' : '<b>' + E((name || '?').trim().charAt(0).toUpperCase()) + '</b>') + '</span>';
  }
  function render() {
    if (!win) return;
    var body = $('.pm-body', win);
    if (!S.sess) { renderLogin(body); return; }
    if (!S.me) { body.innerHTML = '<div class="pm-wait"><i class="pm-ic big"></i><p>Conectando ao servidor…</p></div>'; return; }
    var keepScroll = $('.pm-msgs', body), atBottom = keepScroll && keepScroll.scrollHeight - keepScroll.scrollTop - keepScroll.clientHeight < 40;
    var draft = $('.pm-input', body), dv = draft ? draft.value : '', focused = draft && document.activeElement === draft;
    var psm = $('.pm-psm', body), psmF = psm && document.activeElement === psm, psmV = psm && psm.value;
    var pf = $('.pm-prof-form', body); if (pf && S.profEdit) return; /* não recria enquanto edita o perfil */
    body.innerHTML = '<div class="pm-main' + (S.cur ? ' has-cur' : '') + '">' + listHTML() + convHTML() + '</div>' + profileHTML();
    if (psmF) { var np = $('.pm-psm', body); np.value = psmV; np.focus(); }
    var nd = $('.pm-input', body); if (nd) { nd.value = dv; if (focused) nd.focus(); }
    var ms = $('.pm-msgs', body); if (ms && (atBottom || !keepScroll || S._jump)) { ms.scrollTop = ms.scrollHeight; S._jump = false; }
  }
  function renderLogin(body) {
    body.innerHTML = '<form class="pm-login" autocomplete="off">' +
      '<div class="pm-logo"><i class="pm-ic big"></i><b>Phobia <span>Messenger</span></b><small>versão 2000 · rede de Tóquio</small></div>' +
      '<label>Seu nome<select class="pm-name"><option value="">carregando…</option></select></label>' +
      '<label>PIN<input class="pm-pin" type="password" inputmode="numeric" maxlength="8" placeholder="••••"></label>' +
      '<button type="submit" class="pm-btn go">Entrar</button>' +
      '<p class="pm-err" hidden></p>' +
      '<p class="pm-note">O Narrador cria o seu nome e PIN no Portal do Narrador.<br>⚠ As conversas ficam guardadas na rede e o Narrador pode ler todas.</p>' +
      '</form>';
    var sel = $('.pm-name', body);
    rpc('phobia_roster').then(function (list) {
      if (!list || !list.length) { sel.innerHTML = '<option value="">nenhum jogador cadastrado ainda</option>'; return; }
      var guess = (state.charSheet && state.charSheet.profile && state.charSheet.profile.name || '').toLowerCase();
      sel.innerHTML = '<option value="">— escolha —</option>' + list.map(function (p) { return '<option' + (p.name.toLowerCase() === guess ? ' selected' : '') + '>' + E(p.name) + '</option>'; }).join('');
    }).catch(function () { sel.innerHTML = '<option value="">sem conexão</option>'; });
    $('.pm-login', body).addEventListener('submit', function (e) {
      e.preventDefault();
      var name = sel.value, pin = $('.pm-pin', body).value.trim(), er = $('.pm-err', body), btn = $('.pm-btn', body);
      if (!name || !pin) { er.hidden = false; er.textContent = 'Escolha o nome e digite o PIN.'; return; }
      btn.disabled = true; btn.textContent = 'Conectando…';
      rpc('phobia_login', { p_name: name, p_pin: pin }).then(function (r) {
        S.sess = { token: r.token, id: r.id, name: r.name }; saveSess(); sfx('confirm');
        S.me = null; S.since = null; S.msgs = {}; S.loaded = {}; S.cur = null;
        render(); poll(true).then(pushAvatar);
      }).catch(function (x) { er.hidden = false; er.textContent = x.message; btn.disabled = false; btn.textContent = 'Entrar'; sfx('error'); });
    });
  }
  function threadFor(kind, id) {
    for (var i = 0; i < S.threads.length; i++) {
      var t = S.threads[i];
      if (kind === 'npc' && t.kind === 'npc' && t.npc === id) return t;
      if (kind === 'dm' && t.kind === 'dm' && t.members.indexOf(id) >= 0) return t;
      if (kind === 'group' && t.id === id) return t;
    }
    return null;
  }
  function badge(t) { return t && t.unread ? '<em class="pm-n">' + t.unread + '</em>' : ''; }
  var STATUS = { online: ['Online', '#3ec42e'], away: ['Ausente', '#f0a020'], busy: ['Ocupado', '#e2263b'], invisible: ['Aparecer offline', '#9aa'], offline: ['Offline', '#9aa'] };
  function stOf(x, isNpc) { if (isNpc) return x.status || 'online'; return x.online ? (x.status || 'online') : 'offline'; }
  function buddy(st) { return '<i class="pm-buddy st-' + st + '" aria-hidden="true">' + (st === 'away' || st === 'busy' ? '<b></b>' : '') + '</i>'; }
  var FONTS = { pixel: 'Silkscreen,"Press Start 2P",monospace', normal: 'Tahoma,Verdana,sans-serif', mono: '"Lucida Console",Consolas,monospace', hand: 'Caveat,"Comic Sans MS",cursive' };
  function linkify(t) { return E(t).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'); }
  function listHTML() {
    var me = S.me, groups = S.threads.filter(function (t) { return t.kind === 'group'; });
    var all = Object.keys(S.players).map(function (k) { var p = S.players[k]; return { key: 'p:' + p.id, x: p, npc: false, st: stOf(p), t: threadFor('dm', p.id) }; })
      .concat(Object.keys(S.npcs).map(function (k) { var n = S.npcs[k]; return { key: 'n:' + n.id, x: n, npc: true, st: stOf(n, true), t: threadFor('npc', n.id) }; }))
      .sort(function (a, b) { return a.x.name.localeCompare(b.x.name); });
    var on = all.filter(function (r) { return r.st !== 'offline'; }), off = all.filter(function (r) { return r.st === 'offline'; });
    function row(r) {
      var st = r.st, msg = r.x.status_msg;
      return '<div class="pm-crow"><button type="button" class="pm-c' + (S.cur === r.key ? ' on' : '') + (r.t && r.t.unread ? ' unread' : '') + (st === 'offline' ? ' off' : '') + '" data-pm-open="' + E(r.key) + '"><span class="pm-av-wrap">' + avatar(S.avatars[r.npc ? 'n' + r.x.id : r.x.id] || r.x.avatar, r.x.name, r.x.color) + '<i class="pm-st-dot st-' + st + '"></i></span>' +
        '<span class="pm-c-t"><b>' + E(r.x.name) + '</b>' + (msg ? ' <i>- ' + E(msg) + '</i>' : '') + (st !== 'online' && st !== 'offline' ? ' <small>(' + STATUS[st][0] + ')</small>' : '') + (r.npc ? ' <span class="pm-npc" title="Contato">★</span>' : '') + '</span>' + badge(r.t) + '</button>' +
        '<button type="button" class="pm-info" data-pm-prof="' + E(r.key) + '" title="Ver perfil de ' + E(r.x.name) + '">perfil</button></div>';
    }
    var myst = me.status || 'online', unread = totalUnread();
    var h = '<aside class="pm-list"><nav class="pm-strip" aria-hidden="true"><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i><i class="s5"></i></nav><div class="pm-listmain">' +
      '<header class="pm-me"><button type="button" class="pm-me-av" data-pm-prof="me" title="Meu perfil">' + avatar(S.avatars[me.id] || me.avatar, me.name, me.color, 'xl') + '</button>' +
      '<div class="pm-me-t"><small class="pm-me-k">Meu status:</small><div class="pm-me-name"><b>' + E(me.name) + '</b><button type="button" class="pm-st-btn" data-pm="stmenu" aria-haspopup="true">(' + STATUS[myst][0] + ') ▾</button></div>' +
      '<input class="pm-psm" maxlength="80" placeholder="&lt;Digite uma mensagem pessoal&gt;" value="' + E(me.status_msg || '') + '" aria-label="Mensagem pessoal">' +
      '<div class="pm-me-mail"><span class="pm-mail">✉ (' + unread + ')</span><button type="button" data-pm-prof="me">Meu perfil</button><button type="button" data-pm="logout">Sair</button></div></div>' +
      '<div class="pm-stmenu" hidden>' + ['online', 'away', 'busy', 'invisible'].map(function (k) { return '<button type="button" data-pm-st="' + k + '"' + (k === myst ? ' class="on"' : '') + '>' + buddy(k === 'invisible' ? 'offline' : k) + STATUS[k][0] + '</button>'; }).join('') + '</div></header>';
    h += '<div class="pm-scroll">';
    if (groups.length) h += '<h5>▾ Grupos (' + groups.length + ')</h5>' + groups.map(function (t) {
      return '<div class="pm-crow"><button type="button" class="pm-c' + (S.cur === 'g:' + t.id ? ' on' : '') + (t.unread ? ' unread' : '') + '" data-pm-open="g:' + t.id + '"><i class="pm-buddy grp"></i><span class="pm-c-t"><b>' + E(t.title || 'Grupo') + '</b> <i>- ' + t.members.length + ' participantes</i></span>' + badge(t) + '</button></div>';
    }).join('');
    h += '<h5>▾ Online (' + on.length + ')</h5>' + (on.length ? on.map(row).join('') : '<p class="pm-empty">Ninguém online agora.</p>');
    h += '<h5>▾ Offline (' + off.length + ')</h5>' + (off.length ? off.map(row).join('') : '');
    if (!all.length) h += '<p class="pm-empty">Nenhum contato ainda. O Narrador libera os contatos.</p>';
    return h + '</div></div></aside>';
  }
  function profInfo(key) {
    if (key === 'me') return { me: true, x: S.me, st: S.me.status || 'online', av: S.avatars[S.me.id] || S.me.avatar, text: S.me.profile };
    var k = key.slice(0, 1), id = key.slice(2);
    if (k === 'p') { var p = S.players[id]; return p && { x: p, st: stOf(p), av: S.avatars[id] || p.avatar, text: p.profile }; }
    if (k === 'n') { var n = S.npcs[id]; return n && { x: n, st: stOf(n, true), av: S.avatars['n' + id] || n.avatar, text: n.bio, npc: true }; }
    return null;
  }
  function profileHTML() {
    if (!S.prof) return '';
    var P = profInfo(S.prof); if (!P) return '';
    var x = P.x, bg = x.profile_bg || '#e9e4d6', fg = x.profile_fg || '#111', font = x.profile_font || 'normal';
    if (S.profEdit && P.me) {
      return '<div class="pm-prof"><div class="pm-prof-card edit"><div class="cb-win-t"><span>Editar meu perfil</span><button type="button" data-pm="profclose">×</button></div>' +
        '<form class="pm-prof-form">' +
        '<label>Mensagem pessoal<input name="msg" maxlength="80" value="' + E(x.status_msg || '') + '" placeholder="Ex.: feliz que é sexta"></label>' +
        '<label>Perfil pessoal (humor, música, frases…)<textarea name="text" rows="6" maxlength="1200" placeholder="current mood: …">' + E(x.profile || '') + '</textarea></label>' +
        '<div class="pm-prof-row"><label>Fundo<input type="color" name="bg" value="' + E(bg) + '"></label><label>Texto<input type="color" name="fg" value="' + E(fg) + '"></label>' +
        '<label>Letra<select name="font">' + [['pixel', 'Pixel'], ['normal', 'Normal'], ['mono', 'Máquina'], ['hand', 'À mão']].map(function (f) { return '<option value="' + f[0] + '"' + (f[0] === font ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></label></div>' +
        '<small>Prévia</small><div class="pm-pbox prev" style="--pbg:' + E(bg) + ';--pfg:' + E(fg) + ';--pff:' + E(FONTS[font]) + '">' + (x.profile ? linkify(x.profile) : '<i>(vazio)</i>') + '</div>' +
        '<div class="pm-prof-act"><button type="button" class="pm-btn" data-pm="profcancel">Cancelar</button><button type="submit" class="pm-btn go">Salvar</button></div></form></div></div>';
    }
    return '<div class="pm-prof" data-pm-bg><div class="pm-prof-card"><div class="cb-win-t"><span>Perfil de ' + E(x.name) + '</span><button type="button" data-pm="profclose">×</button></div>' +
      '<div class="pm-prof-top">' + avatar(P.av, x.name, x.color, 'xxl') + '<div><b>' + E(x.name) + '</b><span>' + buddy(P.st) + ' ' + STATUS[P.st][0] + (P.npc ? ' · contato' : '') + '</span>' + (x.status_msg ? '<em>“' + E(x.status_msg) + '”</em>' : '') + '</div></div>' +
      '<h6>Perfil pessoal</h6><div class="pm-pbox" style="--pbg:' + E(bg) + ';--pfg:' + E(fg) + ';--pff:' + E(FONTS[font]) + '">' + (P.text ? linkify(P.text) : '<i>' + (P.me ? 'Você ainda não escreveu nada no seu perfil.' : 'Nada por aqui ainda.') + '</i>') + '</div>' +
      '<div class="pm-prof-act">' + (P.me ? '<button type="button" class="pm-btn go" data-pm="profedit">Editar perfil</button>' : '<button type="button" class="pm-btn go" data-pm-open="' + E(S.prof) + '">Enviar mensagem</button>') + '</div></div></div>';
  }
  function curInfo() {
    if (!S.cur) return null;
    var k = S.cur.slice(0, 1), id = S.cur.slice(2), t = null, name = '', av = '', sub = '';
    if (k === 'g') { t = threadFor('group', id); name = t ? t.title || 'Grupo' : 'Grupo'; av = '<span class="pm-av grp lg"><b>☰</b></span>'; sub = t ? t.members.map(function (m) { return m === S.me.id ? 'você' : (S.players[m] || {}).name || '?'; }).join(', ') : ''; }
    if (k === 'p') { var p = S.players[id] || {}; t = threadFor('dm', id); name = p.name; av = avatar(S.avatars[id] || p.avatar, p.name, p.color, 'lg'); var st0 = stOf(p); sub = STATUS[st0][0] + (p.status_msg ? ' · ' + p.status_msg : ''); }
    if (k === 'n') { var n = S.npcs[id] || {}; t = threadFor('npc', id); name = n.name; av = avatar(S.avatars['n' + id] || n.avatar, n.name, n.color, 'lg'); sub = n.status_msg || n.bio || ''; }
    return { k: k, id: id, t: t, name: name, av: av, sub: sub };
  }
  function who(m) {
    if (m.sender_player) { if (m.sender_player === S.me.id) return { me: true, name: S.me.name, color: S.me.color }; var p = S.players[m.sender_player] || {}; return { name: p.name || 'Jogador', color: p.color, av: S.avatars[m.sender_player] || p.avatar }; }
    if (m.sender_npc) { var n = S.npcs[m.sender_npc] || {}; return { name: n.name || 'Desconhecido', color: n.color, av: S.avatars['n' + m.sender_npc] || n.avatar }; }
    return { name: 'Sistema', color: '#999', sys: true };
  }
  function hhmm(s) { var d = new Date(s); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function convHTML() {
    var c = curInfo();
    if (!c) return '<section class="pm-conv empty"><div class="pm-hint"><i class="pm-ic big"></i><p>Escolha um contato para conversar.</p></div></section>';
    var list = (c.t && S.msgs[c.t.id]) || [], h = '', lastDay = '', prev = null;
    list.forEach(function (m) {
      var w = who(m), day = new Date(m.created_at).toLocaleDateString('pt-BR');
      if (day !== lastDay) { h += '<div class="pm-day"><span>' + day + '</span></div>'; lastDay = day; prev = null; }
      var cont = prev && prev.name === w.name && !w.sys;
      if (w.sys) h += '<div class="pm-sys">' + E(m.body) + '</div>';
      else h += '<div class="pm-m' + (w.me ? ' mine' : '') + (cont ? ' cont' : '') + '" style="--c:' + E(w.color || '#888') + '">' +
        (cont ? '' : '<b class="pm-who">' + E(w.me ? 'Você' : w.name) + ' diz:</b>') +
        '<p>' + E(m.body).replace(/\n/g, '<br>') + '<time>' + hhmm(m.created_at) + '</time></p></div>';
      prev = w;
    });
    if (!list.length) h = '<p class="pm-empty center">' + (c.t && !S.loaded[c.t.id] ? 'Carregando…' : 'Nenhuma mensagem ainda. Diga oi!') + '</p>';
    return '<section class="pm-conv"><header class="pm-head"><button type="button" class="pm-back" data-pm="back" aria-label="Voltar">◀</button>' +
      (c.k === 'g' ? c.av + '<span><b>' + E(c.name) + '</b><small>' + E(c.sub) + '</small></span>' : '<button type="button" class="pm-head-who" data-pm-prof="' + E(S.cur) + '" title="Ver perfil">' + c.av + '<span><b>' + E(c.name) + '</b><small>' + E(c.sub) + '</small></span></button>') + '</header>' +
      '<div class="pm-msgs" aria-live="polite">' + h + '</div>' +
      '<form class="pm-compose"><textarea class="pm-input" rows="2" maxlength="2000" placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"></textarea><button type="submit" class="pm-btn send">Enviar</button></form></section>';
  }

  /* ---------- ações ---------- */
  function onClick(e) {
    var b = e.target.closest('button'); if (!b) return;
    var k = b.dataset.pm;
    if (k === 'close') { close(); return; }
    if (k === 'max') { desk && desk.classList.toggle('xl'); return; }
    if (k === 'logout') { var tk = S.sess && S.sess.token; S.sess = null; S.me = null; saveSess(); if (tk) rpc('phobia_logout', { p_token: tk }).catch(function () {}); render(); paintBadge(); return; }
    if (k === 'back') { S.cur = null; render(); return; }
    if (b.dataset.pmProf) { S.prof = b.dataset.pmProf; S.profEdit = false; render(); sfx('open'); return; }
    if (k === 'profclose' || k === 'profcancel') { S.prof = null; S.profEdit = false; render(); return; }
    if (k === 'profedit') { S.profEdit = true; render(); bindProfForm(); return; }
    if (k === 'stmenu') { var m = $('.pm-stmenu', win); m.hidden = !m.hidden; return; }
    if (b.dataset.pmSt) { setProfile({ p_status: b.dataset.pmSt }); S.me.status = b.dataset.pmSt; render(); sfx(b.dataset.pmSt === 'online' ? 'on' : 'off'); return; }
    if (b.dataset.pmOpen) { S.prof = null; openConv(b.dataset.pmOpen); return; }
    if (b.classList.contains('send')) { e.preventDefault(); send(); }
  }
  function savePsm(i) { var v = i.value.trim(); if ((S.me.status_msg || '') === v) return; S.me.status_msg = v || null; setProfile({ p_status_msg: v }); }
  function onKey(e) {
    if (e.target.classList.contains('pm-psm') && e.key === 'Enter') { e.preventDefault(); savePsm(e.target); e.target.blur(); return; }
    if (e.target.classList.contains('pm-input') && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') { e.stopPropagation(); if (S.prof) { S.prof = null; S.profEdit = false; render(); } }
  }
  function onInput(e) {
    var f = e.target.closest('.pm-prof-form'); if (!f) return;
    var pv = $('.pm-pbox.prev', f);
    pv.style.setProperty('--pbg', f.bg.value); pv.style.setProperty('--pfg', f.fg.value); pv.style.setProperty('--pff', FONTS[f.font.value]);
    pv.innerHTML = f.text.value.trim() ? linkify(f.text.value) : '<i>(vazio)</i>';
  }
  function setProfile(o) {
    var a = { p_token: S.sess.token, p_status: null, p_status_msg: null, p_profile: null, p_bg: null, p_fg: null, p_font: null };
    for (var k in o) a[k] = o[k];
    return rpc('phobia_set_profile', a).catch(handle);
  }
  function bindProfForm() {
    var f = $('.pm-prof-form', win); if (!f) return;
    f.font.addEventListener('change', function () { onInput({ target: f.font }); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var o = { p_status_msg: f.msg.value, p_profile: f.text.value, p_bg: f.bg.value, p_fg: f.fg.value, p_font: f.font.value };
      setProfile(o).then(function () {
        S.me.status_msg = f.msg.value.trim() || null; S.me.profile = f.text.value.trim() || null;
        S.me.profile_bg = f.bg.value; S.me.profile_fg = f.fg.value; S.me.profile_font = f.font.value;
        S.profEdit = false; render(); sfx('confirm'); say('Perfil salvo.');
      });
    });
  }
  async function openConv(key) {
    S.cur = key; S._jump = true; render();
    var c = curInfo(); if (!c) return;
    try {
      if (!c.t) {
        var id = c.k === 'p' ? await rpc('phobia_open_dm', { p_token: S.sess.token, p_other: c.id }) : c.k === 'n' ? await rpc('phobia_open_npc', { p_token: S.sess.token, p_npc: c.id }) : null;
        if (id) { await poll(false); c = curInfo(); }
      }
      if (c.t && !S.loaded[c.t.id]) {
        var hist = await rpc('phobia_history', { p_token: S.sess.token, p_thread: c.t.id, p_limit: 80 });
        merge(c.t.id, hist || []); S.loaded[c.t.id] = true; S._jump = true;
      }
      markRead(); render();
      var i = $('.pm-input', win); if (i && window.matchMedia('(pointer:fine)').matches) i.focus();
    } catch (x) { handle(x); }
  }
  async function send() {
    var c = curInfo(), i = $('.pm-input', win); if (!c || !i) return;
    var body = i.value.trim(); if (!body || S.sending) return;
    S.sending = true;
    try {
      if (!c.t) { await openConv(S.cur); c = curInfo(); }
      if (!c.t) throw new Error('Conversa indisponível.');
      var m = await rpc('phobia_send', { p_token: S.sess.token, p_thread: c.t.id, p_body: body });
      i.value = ''; merge(c.t.id, [m]); S._jump = true; sfx('tick'); render();
    } catch (x) { handle(x); } finally { S.sending = false; }
  }
  function merge(tid, arr) {
    var L = S.msgs[tid] || (S.msgs[tid] = []), ids = {};
    L.forEach(function (m) { ids[m.id] = 1; });
    arr.forEach(function (m) { if (!ids[m.id]) { L.push(m); ids[m.id] = 1; } });
    L.sort(function (a, b) { return a.id - b.id; });
    if (L.length > 400) L.splice(0, L.length - 400);
  }
  function markRead() {
    var c = curInfo(); if (!c || !c.t || !visible()) return;
    var L = S.msgs[c.t.id] || [], last = L.length ? L[L.length - 1].id : c.t.last;
    if (c.t.unread || (c.t.read || 0) < last) {
      c.t.unread = 0; c.t.read = last;
      rpc('phobia_read', { p_token: S.sess.token, p_thread: c.t.id, p_last: last }).catch(function () {});
      paintBadge();
    }
  }
  function handle(x) {
    if (x && x.code === 'SESSAO_INVALIDA') { S.sess = null; S.me = null; saveSess(); render(); paintBadge(); }
    say(x && x.message ? x.message : 'Falha na conexão.');
  }

  /* ---------- sincronização ---------- */
  async function poll(full) {
    if (!S.sess || S.busy) return; S.busy = true;
    try {
      var r = await rpc('phobia_sync', { p_token: S.sess.token, p_since: S.since, p_full: !!full || !S.me });
      var first = S.since == null;
      S.me = r.me; if (r.me.avatar) S.avatars[r.me.id] = r.me.avatar;
      var P = {}; (r.players || []).forEach(function (p) { P[p.id] = p; if (p.avatar) S.avatars[p.id] = p.avatar; }); S.players = P;
      var N = {}; (r.npcs || []).forEach(function (n) { N[n.id] = n; if (n.avatar) S.avatars['n' + n.id] = n.avatar; }); S.npcs = N;
      S.threads = r.threads || [];
      var maxId = S.since || 0; S.threads.forEach(function (t) { if (t.last > maxId) maxId = t.last; });
      var fresh = [];
      (r.messages || []).forEach(function (m) { if (S.loaded[m.thread_id]) merge(m.thread_id, [m]); if (m.id > maxId) maxId = m.id; if (m.sender_player !== S.me.id) fresh.push(m); });
      S.since = maxId;
      if (!first && fresh.length) notify(fresh);
      markRead();
      if (win && !win.hidden) render();
      paintBadge();
    } catch (x) { if (x.code === 'SESSAO_INVALIDA') handle(x); }
    finally { S.busy = false; }
  }
  function notify(list) {
    var c = curInfo(), openTid = c && c.t && visible() ? c.t.id : null;
    var other = list.filter(function (m) { return m.thread_id !== openTid; });
    if (!list.length) return;
    sfx('notify');
    if (other.length) { var m = other[other.length - 1], w = who(m); say('💬 ' + w.name + ': ' + m.body.slice(0, 60) + (m.body.length > 60 ? '…' : '')); }
  }
  function totalUnread() { return S.threads.reduce(function (a, t) { return a + (t.unread || 0); }, 0); }
  function paintBadge() {
    var n = S.sess ? totalUnread() : 0;
    var b = document.getElementById('openNotesTop');
    if (b) { var x = b.querySelector('.pm-top-n'); if (n) { if (!x) { x = document.createElement('em'); x.className = 'pm-top-n'; b.appendChild(x); } x.textContent = n > 99 ? '99+' : n; } else if (x) x.remove(); }
    if (desk) { var ib = $('[data-desk="chat"] .pm-badge', desk); if (ib) { ib.hidden = !n; ib.textContent = n; } }
  }
  async function pushAvatar() {
    try {
      var src = state.charSheet && state.charSheet.photoData; if (!okImg(src) || !S.sess) return;
      var img = new Image(); img.src = src; await img.decode();
      var c = document.createElement('canvas'), s = 96; c.width = c.height = s;
      var k = Math.max(s / img.naturalWidth, s / img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
      c.getContext('2d').drawImage(img, (s - w) / 2, (s - h) / 4, w, h);
      var d = c.toDataURL('image/webp', .8); if (d.indexOf('data:image/webp') !== 0) d = c.toDataURL('image/jpeg', .8);
      if (d.length < 60000) { await rpc('phobia_set_avatar', { p_token: S.sess.token, p_avatar: d }); S.avatars[S.sess.id] = d; if (win && !win.hidden) render(); }
    } catch (e) {}
  }

  /* ritmo: rápido com o mensageiro aberto, lento em segundo plano */
  function loop() {
    var fast = visible();
    S.polls++;
    if (S.sess && !document.hidden) poll(S.polls % 40 === 0);
    setTimeout(loop, fast ? 2500 : 15000);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.sess) poll(false); });

  window.PhobiaChat = { open: open, poll: poll, state: S };

  function init() {
    if (typeof state === 'undefined' || !window.PhobiaCaseBoard) { setTimeout(init, 300); return; }
    var o = PhobiaCaseBoard.open;
    if (!o.__pm) {
      PhobiaCaseBoard.open = function () { var r = o.apply(this, arguments); try { inject(); if (S.sess) poll(false); } catch (e) {} return r; };
      PhobiaCaseBoard.open.__pm = true;
    }
    /* os botões NOTAS chamam o open original: injeta quando o quadro aparece */
    new MutationObserver(function () { if (document.body.classList.contains('cb-open')) inject(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (S.sess) poll(true).then(function () { if (S.sess) pushAvatar(); });
    setTimeout(loop, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ==========================================================
   REWIND — a rede social da campanha Persona // Phobia
   Mesmo login do Phobia Messenger (nome + PIN). O Narrador
   entra com a conta dele e age como um NPC.
   Imagens: comprimidas no navegador e enviadas pela função
   rewind-media (com cota). Vídeos: só links (YouTube etc.).
   ========================================================== */
(function () {
  'use strict';
  var URL_ = 'https://mmkpszyxoenchajdhrof.supabase.co';
  var KEY = 'sb_publishable_RBsJ992hiwq4tAyau_hPog_kKkzCbdX';
  var SKEY = 'phobia-msg-session', AS_KEY = 'rewind-as';
  var sb = supabase.createClient(URL_, KEY);
  var app = document.getElementById('app');

  var ERR = {
    LOGIN_INVALIDO: 'Nome ou PIN incorretos.', LOGIN_BLOQUEADO: 'Muitas tentativas. Espere 5 minutos.',
    SESSAO_INVALIDA: 'Sua sessão expirou. Entre de novo.', SEM_ACESSO: 'Você não pode fazer isso.',
    DEVAGAR: 'Calma! Muitas postagens seguidas.', MENSAGEM_VAZIA: 'Escreva alguma coisa.', PERFIL_INEXISTENTE: 'Esse perfil não existe.',
    ENTRE_NA_COMUNIDADE: 'Entre na comunidade para participar.', COMUNIDADE_INEXISTENTE: 'Comunidade não encontrada.', TOPICO_INEXISTENTE: 'Tópico não encontrado.',
    LIMITE_COMUNIDADES: 'Você já criou o máximo de comunidades (10).', IMAGEM_INVALIDA: 'Imagem inválida.',
    COTA_CHEIA: 'Seu espaço de fotos acabou. Apague algumas em Fotos.', ESPACO_CHEIO: 'O espaço de imagens da campanha está cheio. Fale com o Narrador.',
    IMAGEM_GRANDE: 'Imagem grande demais.', FORMATO_INVALIDO: 'Use JPG, PNG ou WEBP.'
  };
  function msgOf(x) { var m = (x && (x.message || x.error)) || ''; for (var k in ERR) if (m.indexOf(k) >= 0) return ERR[k]; if (/duplicate key.*name/i.test(m)) return 'Já existe uma comunidade com esse nome.'; return m || 'Falha na conexão.'; }
  var tt = 0;
  function toast(t) { var n = document.getElementById('toast'); n.textContent = t; n.hidden = false; clearTimeout(tt); tt = setTimeout(function () { n.hidden = true; }, 3500); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function okImg(s) { return /^data:image\/(png|jpeg|webp|gif);base64,/.test(String(s || '')) || /^https:\/\/mmkpszyxoenchajdhrof\.supabase\.co\/storage\/v1\/object\/public\/rewind\//.test(String(s || '')); }
  function when(s) {
    var d = new Date(s), n = new Date(), p = function (x) { return String(x).padStart(2, '0'); };
    var hm = p(d.getHours()) + ':' + p(d.getMinutes());
    if (d.toDateString() === n.toDateString()) return 'hoje, ' + hm;
    var y = new Date(n); y.setDate(n.getDate() - 1); if (d.toDateString() === y.toDateString()) return 'ontem, ' + hm;
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + (d.getFullYear() !== n.getFullYear() ? '/' + d.getFullYear() : '') + ' ' + hm;
  }

  /* ---------- sessão ---------- */
  var S = { sess: null, as: null, gm: false, gmUser: null, me: null, people: {}, npcs: [], peopleAt: 0 };
  try { S.sess = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {}
  try { S.as = localStorage.getItem(AS_KEY) || null; } catch (e) {}
  function args(o) { var a = { p_token: S.as ? null : (S.sess && S.sess.token), p_as: S.as || null }; for (var k in o) a[k] = o[k]; return a; }
  async function rpc(name, o) {
    var r = await sb.rpc(name, args(o || {}));
    if (r.error) { var e = new Error(msgOf(r.error)); e.raw = r.error.message; throw e; }
    return r.data;
  }
  function logged() { return !!(S.as ? S.gmUser : S.sess); }

  /* ---------- pessoas ---------- */
  async function loadPeople(force) {
    if (!force && Date.now() - S.peopleAt < 60000) return;
    var r = await rpc('rw_people');
    S.me = r.me; S.gm = r.gm; S.npcs = r.npcs || [];
    var P = {}; (r.people || []).forEach(function (p) { P[p.id] = p; }); S.people = P; S.peopleAt = Date.now();
  }
  function P(id) { return S.people[id] || { id: id, name: 'Perfil apagado', color: '#999' }; }
  function ini(n) { var m = String(n || '').match(/[\p{L}\p{N}]/u); return (m ? m[0] : '?').toUpperCase(); }
  function av(id, cls) {
    var p = P(id);
    return '<span class="av ' + (cls || '') + '" style="--c:' + E(p.color || '#8aa') + '">' + (okImg(p.avatar) ? '<img src="' + p.avatar + '" alt="" loading="lazy">' : E(ini(p.name))) + '</span>';
  }
  function who(id) { var p = P(id); return '<a href="#/perfil/' + id + '">' + E(p.name) + '</a>' + (p.kind === 'npc' ? ' <span class="npc-tag">NPC</span>' : ''); }
  function tile(id) { var p = P(id); return '<a class="tile" href="#/perfil/' + id + '">' + av(id) + '<span>' + (p.online ? '<i class="on-dot"></i>' : '') + E(p.name) + '</span></a>'; }

  /* ---------- texto rico: links, YouTube, emoticons ---------- */
  var SMILE = { ':)': '🙂', ':-)': '🙂', ':D': '😄', ';)': '😉', ':(': '🙁', ':P': '😛', ':O': '😮', '<3': '❤️', ':*': '😘', 'XD': '😆' };
  function ytId(u) { var m = String(u).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/); return m && m[1]; }
  function rich(t) {
    var vids = [];
    var h = E(t).replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      var raw = u.replace(/&amp;/g, '&'), id = ytId(raw);
      if (id && vids.indexOf(id) < 0 && vids.length < 2) vids.push(id);
      return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + (u.length > 60 ? u.slice(0, 57) + '…' : u) + '</a>';
    });
    h = h.replace(/(^|\s)(:-?\)|:D|;\)|:\(|:P|:O|&lt;3|:\*|XD)(?=\s|$)/g, function (_, a, s) { return a + (SMILE[s.replace('&lt;', '<')] || s); });
    return { html: h, vids: vids };
  }
  function bodyHTML(t, img) {
    var r = rich(t);
    return '<div class="body">' + r.html + '</div>' +
      (img ? '<img class="att" src="' + E(img) + '" alt="" loading="lazy" data-zoom>' : '') +
      r.vids.map(function (id) { return '<button type="button" class="yt" data-yt="' + id + '" style="background-image:url(https://i.ytimg.com/vi/' + id + '/hqdefault.jpg)" aria-label="Tocar vídeo"></button>'; }).join('');
  }

  /* ---------- imagens (comprimir e enviar) ---------- */
  function compress(file, max, q) {
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) return rej(new Error('FORMATO_INVALIDO'));
      var u = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        function out(m, qq) {
          var k = Math.min(1, m / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          return new Promise(function (r2) { c.toBlob(function (b) {
            if (b && b.type === 'image/webp') return r2({ b: b, w: c.width, h: c.height });
            c.toBlob(function (j) { r2({ b: j, w: c.width, h: c.height }); }, 'image/jpeg', qq); /* navegadores sem WEBP */
          }, 'image/webp', qq); });
        }
        (async function () {
          var o = await out(max, q);
          var tries = [[max, q], [Math.round(max * .8), q - .1], [Math.round(max * .65), q - .18], [Math.round(max * .5), q - .25]];
          for (var i = 1; o && o.b && o.b.size > 600000 && i < tries.length; i++) o = await out(tries[i][0], tries[i][1]);
          URL.revokeObjectURL(u);
          if (!o || !o.b) return rej(new Error('FORMATO_INVALIDO'));
          res(o);
        })();
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('FORMATO_INVALIDO')); };
      img.src = u;
    });
  }
  async function upload(file, opt) {
    opt = opt || {};
    var o = await compress(file, opt.max || 1280, .8);
    var fd = new FormData();
    fd.append('file', new File([o.b], o.b.type === 'image/webp' ? 'img.webp' : 'img.jpg', { type: o.b.type }));
    fd.append('w', o.w); fd.append('h', o.h);
    if (opt.album) fd.append('album', '1');
    if (opt.caption) fd.append('caption', opt.caption);
    var headers = { apikey: KEY };
    if (S.as) { var ss = await sb.auth.getSession(); fd.append('as', S.as); headers.Authorization = 'Bearer ' + (ss.data.session && ss.data.session.access_token); }
    else fd.append('token', S.sess.token);
    var r = await fetch(URL_ + '/functions/v1/rewind-media', { method: 'POST', headers: headers, body: fd });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(msgOf(j));
    return j;
  }
  async function delMedia(id) {
    var fd = new FormData(); fd.append('action', 'delete'); fd.append('id', id);
    var headers = { apikey: KEY };
    if (S.as) { var ss = await sb.auth.getSession(); fd.append('as', S.as); headers.Authorization = 'Bearer ' + (ss.data.session && ss.data.session.access_token); }
    else fd.append('token', S.sess.token);
    var r = await fetch(URL_ + '/functions/v1/rewind-media', { method: 'POST', headers: headers, body: fd });
    if (!r.ok) throw new Error(msgOf(await r.json().catch(function () { return {}; })));
  }

  /* compositor reutilizável: texto + imagem opcional */
  function composer(id, ph, btn, extra) {
    return '<form class="compose" data-compose="' + id + '">' + (extra || '') +
      '<textarea name="body" maxlength="' + (id === 'post' || id === 'topic' ? 4000 : id === 'testi' ? 2000 : 1000) + '" placeholder="' + E(ph) + '"></textarea>' +
      '<div class="row"><label class="btn sm" title="Anexar imagem">📷 imagem<input type="file" accept="image/*" hidden data-attach></label><span class="prev"></span>' +
      '<span class="mute grow">links do YouTube viram vídeo · :) ;) &lt;3 viram carinhas</span><button class="btn pri" type="submit">' + E(btn) + '</button></div></form>';
  }
  function bindComposer(form, onSend) {
    var media = null, busy = false;
    var inp = form.querySelector('[data-attach]'), prev = form.querySelector('.prev');
    if (inp) inp.onchange = async function () {
      var f = inp.files[0]; inp.value = ''; if (!f) return;
      prev.innerHTML = '<span class="mute small">enviando imagem…</span>'; form.dataset.up = '1';
      try { var r = await upload(f); media = r.id; prev.innerHTML = '<span class="prev-img"><img src="' + E(r.url) + '" alt=""><button type="button" aria-label="Remover imagem">✕</button></span>'; prev.querySelector('button').onclick = function () { delMedia(media).catch(function () {}); media = null; prev.innerHTML = ''; }; }
      catch (x) { prev.innerHTML = ''; toast(msgOf(x)); }
      finally { delete form.dataset.up; }
    };
    form.onsubmit = async function (e) {
      e.preventDefault(); if (busy) return;
      if (form.dataset.up) return toast('Espere a imagem terminar de enviar…');
      var b = form.body.value.trim(); if (!b) return toast('Escreva alguma coisa.');
      busy = true; form.querySelector('[type=submit]').disabled = true;
      try { await onSend(b, media, form); media = null; form.reset(); prev.innerHTML = ''; }
      catch (x) { toast(msgOf(x)); }
      finally { busy = false; form.querySelector('[type=submit]').disabled = false; }
    };
  }

  /* ---------- moldura ---------- */
  var FORTUNES = ['Hoje é um ótimo dia para mandar um recado para alguém.', 'Alguém está pensando em você agora mesmo.', 'Cuidado com quem visita seu perfil à meia-noite.', 'Uma conversa no metrô vai mudar tudo.', 'Você vai descobrir um segredo antes do fim de semana.', 'Nem toda máscara esconde um rosto.', 'Seu próximo depoimento vai fazer alguém sorrir.', 'O que você procura está mais perto do que imagina.', 'Não confie em números desconhecidos.', 'A sorte favorece quem entra na comunidade certa.'];
  function fortune() { var d = new Date(), i = (d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate() + String(S.me).charCodeAt(0)) % FORTUNES.length; return FORTUNES[i]; }
  function topbar(sec) {
    var me = P(S.me);
    var gm = S.gmUser ? '<div class="gm-bar"><div class="wrap">🎲 <b>Modo Narrador</b> · agindo como <select data-as>' + S.npcs.map(function (n) { return '<option value="' + n.id + '"' + (n.id === S.as ? ' selected' : '') + '>' + E(n.name) + '</option>'; }).join('') + '</select>' +
      '<span class="mute">Para um NPC aparecer no Rewind, edite o perfil dele uma vez.</span><button class="lnk" data-act="gmout" type="button">sair do modo Narrador</button></div></div>' : '';
    return gm + '<header class="top"><div class="wrap"><a class="logo" href="#/">re<i>wind</i></a>' +
      '<nav class="nav"><a href="#/" class="' + (sec === 'home' ? 'on' : '') + '">Início</a><a href="#/perfil/' + S.me + '" class="' + (sec === 'perfil' ? 'on' : '') + '">Perfil</a><a href="#/recados/' + S.me + '" class="' + (sec === 'recados' ? 'on' : '') + '">Recados</a><a href="#/amigos/' + S.me + '" class="' + (sec === 'amigos' ? 'on' : '') + '">Amigos</a><a href="#/comunidades" class="' + (sec === 'comunidades' ? 'on' : '') + '">Comunidades</a></nav>' +
      '<form class="search" data-search><input name="q" placeholder="pessoas e comunidades" aria-label="Buscar"><button class="btn sm" type="submit">buscar</button></form>' +
      '<span class="me-mini"><b>' + E(me.name) + '</b> · <a href="#/editar">editar perfil</a> · <button type="button" data-act="logout">sair</button></span></div></header>';
  }
  function foot() { return '<div class="foot">© 2000 Rewind · <a href="#/">início</a>·<a href="#/comunidades">comunidades</a>·<a href="../" target="_top">voltar à ficha</a><br>Rede particular da campanha Persona // Phobia. O Narrador pode ver tudo.</div>'; }
  function leftCard(id, sec, prof) {
    var p = P(id), c = (prof && prof.counts) || {}, self = id === S.me;
    return '<div class="box">' + (okImg(p.avatar) ? '<img class="card-photo" src="' + p.avatar + '" alt="">' : '<div class="ph-letter" style="--c:' + E(p.color || '#8aa') + '">' + E(ini(p.name)) + '</div>') +
      '<div class="card-name">' + E(p.name) + (p.kind === 'npc' ? ' <span class="npc-tag">NPC</span>' : '') + '</div>' +
      '<div class="card-sub">' + (p.online ? '<i class="on-dot"></i>online' : 'offline') + (p.status_msg ? '<br><i>“' + E(p.status_msg) + '”</i>' : '') + '</div>' +
      '<ul class="menu">' +
        '<li><a href="#/perfil/' + id + '" class="' + (sec === 'perfil' ? 'on' : '') + '"><span class="ic">👤</span>perfil</a></li>' +
        '<li><a href="#/recados/' + id + '" class="' + (sec === 'recados' ? 'on' : '') + '"><span class="ic">💬</span>recados' + (c.scraps != null ? '<em>' + c.scraps + '</em>' : '') + '</a></li>' +
        '<li><a href="#/fotos/' + id + '" class="' + (sec === 'fotos' ? 'on' : '') + '"><span class="ic">📷</span>fotos' + (c.photos != null ? '<em>' + c.photos + '</em>' : '') + '</a></li>' +
        '<li><a href="#/depoimentos/' + id + '" class="' + (sec === 'depoimentos' ? 'on' : '') + '"><span class="ic">📝</span>depoimentos' + (c.testimonials != null ? '<em>' + c.testimonials + '</em>' : '') + '</a></li>' +
        '<li><a href="#/amigos/' + id + '" class="' + (sec === 'amigos' ? 'on' : '') + '"><span class="ic">👥</span>amigos' + (c.friends != null ? '<em>' + c.friends + '</em>' : '') + '</a></li>' +
        (self ? '<li><a href="#/editar" class="' + (sec === 'editar' ? 'on' : '') + '"><span class="ic">✏️</span>editar perfil</a></li>' : '') +
      '</ul></div>';
  }
  function friendBox(ids, total, ownerId) {
    return '<div class="box"><h3>amigos <small>(' + (total != null ? total : ids.length) + ')</small></h3>' + (ids.length ? '<div class="grid9">' + ids.slice(0, 9).map(tile).join('') + '</div>' : '<p class="empty">ninguém ainda</p>') +
      (ownerId ? '<div class="in small" style="padding-top:0"><a href="#/amigos/' + ownerId + '">ver todos</a></div>' : '') + '</div>';
  }
  function commTile(c) { return '<a class="tile" href="#/comunidade/' + c.id + '">' + cimg(c, 'md') + '<span>' + E(c.name) + '</span></a>'; }
  function cimg(c, cls) { return '<span class="cimg ' + (cls || '') + '">' + (c.img ? '<img src="' + E(c.img) + '" alt="" loading="lazy">' : E(ini(c.name))) + '</span>'; }
  function commBox(list, total) {
    return '<div class="box"><h3>comunidades <small>(' + (total != null ? total : list.length) + ')</small></h3>' + (list.length ? '<div class="grid9">' + list.slice(0, 9).map(commTile).join('') + '</div>' : '<p class="empty">nenhuma ainda</p>') + '</div>';
  }
  function page(sec, left, mid, right) {
    document.body.dataset.theme = S.theme || 'classic';
    app.innerHTML = topbar(sec) + '<div class="wrap"><div class="cols' + (right == null ? ' two' : '') + '"><div class="col left">' + left + '</div><div class="col mid">' + mid + '</div>' + (right != null ? '<div class="col right">' + right + '</div>' : '') + '</div>' + foot() + '</div>';
    bindCommon();
  }

  /* ---------- telas ---------- */
  async function vHome() {
    S.theme = null;
    var h = await rpc('rw_home'), me = P(S.me);
    var alerts = '';
    if (!h.has_profile) alerts += '<div class="alert">✏️ <span>Seu perfil está em branco. <a href="#/editar">Conte quem você é</a> para os outros te acharem.</span></div>';
    if (h.requests.length) alerts += '<div class="alert">👥 <span><b>' + h.requests.length + '</b> pedido(s) de amizade: ' + h.requests.map(function (id) { return who(id) + ' <button class="btn sm ok" data-friend="accept" data-id="' + id + '">aceitar</button>'; }).join(' ') + '</span></div>';
    if (h.pending_testimonials) alerts += '<div class="alert">📝 <span>Você tem <b>' + h.pending_testimonials + '</b> depoimento(s) esperando aprovação. <a href="#/depoimentos/' + S.me + '">ver</a></span></div>';
    var ups = h.updates.map(function (u) {
      var t = u.k === 'post' ? who(u.who) + ' respondeu em <a href="#/topico/' + u.topic + '">' + E(u.title) + '</a> · <a href="#/comunidade/' + u.comm + '">' + E(u.cname) + '</a>'
        : u.k === 'scrap' ? who(u.who) + ' deixou um recado'
        : who(u.who) + ' e ' + who(u.body) + ' agora são amigos';
      return '<div class="upd">' + av(u.who, 'sm') + '<div>' + t + ' <time>· ' + when(u.at) + '</time>' + (u.k !== 'friend' ? '<q>' + E(u.body) + '</q>' : '') + '</div></div>';
    }).join('');
    var scraps = h.scraps.map(scrapHTML).join('');
    var mid = '<div class="box"><div class="in"><div class="welcome"><div><h1 class="big-title">Bem-vindo(a), ' + E(me.name) + '</h1>' +
      '<div class="fortune"><b>Sorte de hoje:</b> ' + E(fortune()) + '</div></div></div></div></div>' +
      (alerts ? '<div>' + alerts + '</div>' : '') +
      '<div class="box"><h3>recados <small>(' + h.scrap_count + ')</small><a class="small" href="#/recados/' + S.me + '">ver todos</a></h3>' + (scraps || '<p class="empty">nenhum recado ainda</p>') + '</div>' +
      '<div class="box"><h3>atualizações dos amigos e comunidades</h3>' + (ups || '<p class="empty">Nada novo. Adicione amigos e entre em comunidades!</p>') + '</div>';
    var right = friendBox(h.friends, null, S.me) + commBox(h.communities) +
      '<div class="box"><h3>visitantes recentes</h3>' + (h.visitors.length ? '<div class="grid9">' + h.visitors.map(tile).join('') + '</div>' : '<p class="empty">ninguém ainda</p>') + '</div>' +
      '<div class="box"><h3>pessoas no rewind</h3><div class="grid9">' + Object.keys(S.people).filter(function (k) { return k !== S.me; }).slice(0, 9).map(tile).join('') + '</div></div>';
    page('home', leftCard(S.me, 'home'), mid, right);
  }

  var FIELDS = [['relacionamento', 'relacionamento'], ['aniversario', 'aniversário'], ['cidade', 'cidade'], ['escola', 'escola'], ['idiomas', 'idiomas'], ['humor', 'humor'], ['estilo', 'estilo'], ['interesses', 'interesses'], ['musica', 'música'], ['filmes', 'filmes'], ['livros', 'livros'], ['frase', 'frase favorita']];
  function ratingRow(k, label, icon, val, mine, self) {
    var h = '<div class="rt"><b>' + label + '</b><span class="ics">';
    for (var i = 1; i <= 3; i++) {
      if (self) h += '<span class="' + (i <= val ? 'on' : '') + '">' + icon + '</span>';
      else h += '<button type="button" class="' + (i <= (mine || 0) ? 'on' : '') + '" data-rate="' + k + '" data-v="' + i + '" title="' + label + ' ' + i + '/3">' + icon + '</button>';
    }
    return h + '</span>' + (self || !mine ? '' : '<span>média: ' + val + '/3</span>') + '</div>';
  }
  async function vProfile(id) {
    var pr = await rpc('rw_profile', { p_id: id }); S.theme = pr.theme; S.prof = pr;
    var p = P(id), self = id === S.me, f = pr.fields || {};
    var rows = FIELDS.filter(function (x) { return f[x[0]]; }).map(function (x) { return '<tr><th>' + x[1] + ':</th><td>' + rich(f[x[0]]).html + '</td></tr>'; }).join('');
    var my = pr.my_rating || {};
    var act = '';
    if (!self) {
      act = '<div class="actions">' +
        (pr.rel === 'friends' ? '<span class="btn sm" style="cursor:default">✔ amigos</span><button class="btn sm bad" data-friend="remove" data-id="' + id + '">desfazer amizade</button>'
          : pr.rel === 'pending_out' ? '<span class="btn sm" style="cursor:default">pedido enviado</span><button class="btn sm" data-friend="remove" data-id="' + id + '">cancelar</button>'
          : pr.rel === 'pending_in' ? '<button class="btn sm ok" data-friend="accept" data-id="' + id + '">aceitar amizade</button><button class="btn sm" data-friend="remove" data-id="' + id + '">recusar</button>'
          : '<button class="btn sm pri" data-friend="add" data-id="' + id + '">+ adicionar como amigo</button>') +
        '<a class="btn sm" href="#/recados/' + id + '">💬 deixar recado</a><a class="btn sm" href="#/depoimentos/' + id + '">📝 escrever depoimento</a></div>';
    }
    var testis = pr.testimonials.map(function (t) { return '<div class="scrap">' + av(t.from_id, 'sm') + '<div><div class="who">' + who(t.from_id) + '<time>' + when(t.created_at) + '</time></div>' + bodyHTML(t.body) + '</div></div>'; }).join('');
    var photos = pr.photos.length ? '<div class="box"><h3>fotos <small>(' + pr.counts.photos + ')</small><a class="small" href="#/fotos/' + id + '">ver álbum</a></h3><div class="album">' + pr.photos.map(function (ph) { return '<div class="photo"><button class="th" type="button" data-zoom-src="' + E(ph.url) + '" data-cap="' + E(ph.caption || '') + '"><img src="' + E(ph.url) + '" alt="" loading="lazy"></button></div>'; }).join('') + '</div></div>' : '';
    var mid = '<div class="box"><div class="in"><div class="prof-head"><div><h1 class="big-title">' + E(p.name) + (p.kind === 'npc' ? ' <span class="npc-tag">NPC</span>' : '') + '</h1>' +
      (p.status_msg ? '<div class="status-line">“' + E(p.status_msg) + '”</div>' : '') + '</div>' + act + '</div>' +
      '<div class="ratings"><div class="rt"><b>fãs</b><span data-fans>⭐ ' + pr.counts.fans + (S.as ? ' <button type="button" class="gm-edit" data-fans-edit title="Narrador: mudar a quantidade de fãs">✎</button>' : '') + '</span>' + (self ? '' : '<button type="button" class="fan-btn' + (my.fan ? ' on' : '') + '" data-fan>' + (my.fan ? '★ sou fã' : '☆ virar fã') + '</button>') + '</div>' +
        ratingRow('trusty', 'confiável', '🙂', pr.rating.trusty, my.trusty, self) + ratingRow('cool', 'legal', '🧊', pr.rating.cool, my.cool, self) + ratingRow('sexy', 'sexy', '❤️', pr.rating.sexy, my.sexy, self) + '</div>' +
      (rows ? '<table class="info">' + rows + '</table>' : '') +
      (pr.about ? '<div class="about"><b>quem sou eu:</b>\n' + rich(pr.about).html + '</div>' : (self ? '<p class="mute">Seu perfil está vazio. <a href="#/editar">Editar perfil</a></p>' : '')) +
      '</div></div>' + photos +
      '<div class="box"><h3>depoimentos <small>(' + pr.counts.testimonials + ')</small><a class="small" href="#/depoimentos/' + id + '">' + (self ? 'ver todos' : 'escrever / ver todos') + '</a></h3>' + (testis || '<p class="empty">nenhum depoimento ainda</p>') + '</div>';
    page('perfil', leftCard(id, 'perfil', pr), mid, friendBox(pr.friends, pr.counts.friends, id) + commBox(pr.communities, pr.community_count));
    app.querySelectorAll('[data-rate]').forEach(function (b) {
      b.onclick = async function () {
        var k = b.dataset.rate, v = +b.dataset.v, cur = Object.assign({ fan: false, trusty: 0, cool: 0, sexy: 0 }, pr.my_rating || {});
        cur[k] = cur[k] === v ? 0 : v;
        try { await rpc('rw_rate', { p_to: id, p_fan: cur.fan, p_trusty: cur.trusty, p_cool: cur.cool, p_sexy: cur.sexy }); route(); } catch (x) { toast(msgOf(x)); }
      };
    });
    var fe = app.querySelector('[data-fans-edit]');
    if (fe) fe.onclick = function () {
      var box = app.querySelector('[data-fans]');
      box.innerHTML = '<form class="fans-form"><input type="number" min="0" max="10000000" step="1" value="' + pr.counts.fans + '" aria-label="Quantidade de fãs"><button class="btn sm pri" type="submit">ok</button><button class="btn sm" type="button" data-c>×</button></form>';
      var f = box.querySelector('form'), inp = f.querySelector('input'); inp.focus(); inp.select();
      f.querySelector('[data-c]').onclick = function () { route(); };
      f.onsubmit = async function (e) {
        e.preventDefault(); var n = Math.floor(Number(inp.value));
        if (!(n >= 0)) return toast('Digite um número de 0 para cima.');
        var r = await sb.rpc('rw_gm_set_fans', { p_id: id, p_total: n });
        if (r.error) return toast('Não deu para mudar os fãs.');
        toast('Agora são ' + r.data + ' fã(s).'); route();
      };
    };
    var fb = app.querySelector('[data-fan]');
    if (fb) fb.onclick = async function () { var cur = Object.assign({ fan: false, trusty: 0, cool: 0, sexy: 0 }, pr.my_rating || {}); cur.fan = !cur.fan; try { await rpc('rw_rate', { p_to: id, p_fan: cur.fan, p_trusty: cur.trusty, p_cool: cur.cool, p_sexy: cur.sexy }); route(); } catch (x) { toast(msgOf(x)); } };
  }

  function scrapHTML(s, ownerId) {
    var can = s.from_id === S.me || ownerId === S.me || S.gmUser;
    return '<div class="scrap">' + av(s.from_id, 'sm') + '<div><div class="who">' + who(s.from_id) + '<time>' + when(s.created_at) + '</time></div>' + bodyHTML(s.body, s.img) +
      '<div class="tools">' + (s.from_id !== S.me ? '<a class="lnk" href="#/recados/' + s.from_id + '">responder</a>' : '') + (ownerId && can ? '<button class="lnk bad" type="button" data-del-scrap="' + s.id + '">apagar</button>' : '') + '</div></div></div>';
  }
  async function vScraps(id) {
    var pr = await rpc('rw_profile', { p_id: id }); S.theme = pr.theme;
    var list = await rpc('rw_scraps', { p_id: id });
    var p = P(id);
    var mid = '<div class="box"><h3>recados de ' + E(p.name) + ' <small>(' + pr.counts.scraps + ')</small></h3>' +
      composer('scrap', id === S.me ? 'Escreva um recado no seu próprio mural…' : 'Deixe um recado para ' + p.name + '…', 'enviar recado') +
      '<div data-list>' + (list.map(function (s) { return scrapHTML(s, id); }).join('') || '<p class="empty">nenhum recado ainda — seja o primeiro!</p>') + '</div>' +
      (list.length === 20 ? '<div class="in"><button class="btn sm" data-more="' + list[list.length - 1].id + '">recados mais antigos</button></div>' : '') + '</div>';
    page('recados', leftCard(id, 'recados', pr), mid, friendBox(pr.friends, pr.counts.friends, id));
    bindComposer(app.querySelector('[data-compose="scrap"]'), async function (b, m) { await rpc('rw_scrap_send', { p_to: id, p_body: b, p_media: m }); toast('Recado enviado!'); route(); });
    bindMore(id);
  }
  function bindMore(id) {
    var mb = app.querySelector('[data-more]'); if (!mb) return;
    mb.onclick = async function () {
      var more = await rpc('rw_scraps', { p_id: id, p_before: +mb.dataset.more });
      app.querySelector('[data-list]').insertAdjacentHTML('beforeend', more.map(function (s) { return scrapHTML(s, id); }).join(''));
      if (more.length < 20) mb.remove(); else mb.dataset.more = more[more.length - 1].id;
      bindCommon();
    };
  }

  async function vTesti(id) {
    var pr = await rpc('rw_profile', { p_id: id }); S.theme = pr.theme;
    var list = await rpc('rw_testimonials', { p_id: id }), p = P(id), self = id === S.me;
    var mine = list.filter(function (t) { return t.from_id === S.me; })[0];
    var pend = list.filter(function (t) { return !t.approved; }), ok = list.filter(function (t) { return t.approved; });
    function item(t) {
      return '<div class="scrap">' + av(t.from_id, 'sm') + '<div><div class="who">' + who(t.from_id) + '<time>' + when(t.created_at) + '</time>' + (t.approved ? '' : ' <span class="npc-tag">aguardando aprovação</span>') + '</div>' + bodyHTML(t.body) +
        '<div class="tools">' + (self && !t.approved ? '<button class="btn sm ok" data-testi="1" data-id="' + t.id + '">aceitar</button><button class="btn sm" data-testi="0" data-id="' + t.id + '">recusar</button>' : '') +
        ((self && t.approved) || t.from_id === S.me || S.gmUser ? '<button class="lnk bad" data-testi="0" data-id="' + t.id + '">apagar</button>' : '') + '</div></div></div>';
    }
    var mid = (self ? '' : '<div class="box"><h3>' + (mine ? 'editar meu depoimento' : 'escrever um depoimento para ' + E(p.name)) + '</h3>' +
        '<form class="compose" data-testi-form><textarea name="body" maxlength="2000" placeholder="O que você acha de ' + E(p.name) + '? Depoimentos só aparecem depois que a pessoa aceitar.">' + E(mine ? mine.body : '') + '</textarea><div class="row"><span class="mute grow">' + (mine && !mine.approved ? 'Seu depoimento está aguardando aprovação.' : 'A pessoa precisa aceitar para aparecer no perfil.') + '</span><button class="btn pri" type="submit">enviar depoimento</button></div></form></div>') +
      (self && pend.length ? '<div class="box"><h3>aguardando sua aprovação <small>(' + pend.length + ')</small></h3>' + pend.map(item).join('') + '</div>' : '') +
      '<div class="box"><h3>depoimentos de ' + E(p.name) + ' <small>(' + ok.length + ')</small></h3>' + (ok.map(item).join('') || '<p class="empty">nenhum depoimento ainda</p>') + '</div>';
    page('depoimentos', leftCard(id, 'depoimentos', pr), mid, friendBox(pr.friends, pr.counts.friends, id));
    var tf = app.querySelector('[data-testi-form]');
    if (tf) tf.onsubmit = async function (e) { e.preventDefault(); var b = tf.body.value.trim(); if (!b) return; try { await rpc('rw_testi_send', { p_to: id, p_body: b }); toast('Depoimento enviado! Ele aparece quando ' + p.name + ' aceitar.'); route(); } catch (x) { toast(msgOf(x)); } };
    app.querySelectorAll('[data-testi]').forEach(function (b) { b.onclick = async function () { try { await rpc('rw_testi_decide', { p_id: +b.dataset.id, p_approve: b.dataset.testi === '1' }); route(); } catch (x) { toast(msgOf(x)); } }; });
  }

  async function vFriends(id) {
    var pr = await rpc('rw_profile', { p_id: id }); S.theme = pr.theme;
    var r = await rpc('rw_friends_of', { p_id: id }), p = P(id);
    var req = (r.requests || []);
    var mid = (req.length ? '<div class="box"><h3>pedidos de amizade <small>(' + req.length + ')</small></h3>' + req.map(function (rid) { return '<div class="scrap">' + av(rid, 'sm') + '<div><div class="who">' + who(rid) + '</div><div class="tools"><button class="btn sm ok" data-friend="accept" data-id="' + rid + '">aceitar</button><button class="btn sm" data-friend="remove" data-id="' + rid + '">recusar</button></div></div></div>'; }).join('') + '</div>' : '') +
      '<div class="box"><h3>amigos de ' + E(p.name) + ' <small>(' + r.friends.length + ')</small></h3>' + (r.friends.length ? '<div class="grid9" style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr))">' + r.friends.map(tile).join('') + '</div>' : '<p class="empty">nenhum amigo ainda</p>') + '</div>' +
      (id === S.me ? '<div class="box"><h3>pessoas que você talvez conheça</h3><div class="grid9" style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr))">' + Object.keys(S.people).filter(function (k) { return k !== S.me && r.friends.indexOf(k) < 0; }).map(tile).join('') + '</div></div>' : '');
    page('amigos', leftCard(id, 'amigos', pr), mid, null);
  }

  async function vPhotos(id) {
    var pr = await rpc('rw_profile', { p_id: id }); S.theme = pr.theme;
    var r = await rpc('rw_photos', { p_id: id }), self = id === S.me, p = P(id);
    var u = r.usage, max = S.as ? 40e6 : 15e6, maxN = S.as ? 150 : 60;
    var up = self ? '<div class="box soft"><div class="in"><div class="row" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="btn pri">📷 adicionar fotos<input type="file" accept="image/*" multiple hidden data-up></label>' +
      '<span class="small mute">As fotos são comprimidas antes de enviar. Espaço usado: ' + (u.bytes / 1e6).toFixed(1) + ' MB de ' + (max / 1e6) + ' MB · ' + u.count + ' de ' + maxN + ' imagens (inclui imagens de recados e comunidades).</span></div>' +
      '<div class="usage" style="margin-top:6px"><i style="width:' + Math.min(100, u.bytes / max * 100).toFixed(1) + '%"></i></div></div></div>' : '';
    var mid = up + '<div class="box"><h3>álbum de ' + E(p.name) + ' <small>(' + r.photos.length + ')</small></h3>' + (r.photos.length ? '<div class="album">' + r.photos.map(function (ph) {
      return '<div class="photo"><button class="th" type="button" data-zoom-src="' + E(ph.url) + '" data-cap="' + E(ph.caption || '') + '"><img src="' + E(ph.url) + '" alt="" loading="lazy"></button><span class="cap">' + E(ph.caption || '') + '</span>' +
        (self || S.gmUser ? '<span><button class="lnk" data-cap-edit="' + ph.id + '" data-cur="' + E(ph.caption || '') + '">legenda</button> · <button class="lnk bad" data-ph-del="' + ph.id + '">apagar</button></span>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="empty">nenhuma foto ainda</p>') + '</div>';
    page('fotos', leftCard(id, 'fotos', pr), mid, null);
    var inp = app.querySelector('[data-up]');
    if (inp) inp.onchange = async function () {
      var fs = [].slice.call(inp.files, 0, 10); inp.value = ''; if (!fs.length) return;
      toast('Enviando ' + fs.length + ' foto(s)…');
      for (var i = 0; i < fs.length; i++) { try { await upload(fs[i], { album: true }); } catch (x) { toast(msgOf(x)); break; } }
      route();
    };
    app.querySelectorAll('[data-ph-del]').forEach(function (b) { b.onclick = async function () { if (!arm(b)) return; try { await delMedia(b.dataset.phDel); route(); } catch (x) { toast(msgOf(x)); } }; });
    app.querySelectorAll('[data-cap-edit]').forEach(function (b) { b.onclick = async function () { var c = prompt('Legenda da foto:', b.dataset.cur); if (c == null) return; try { await rpc('rw_media_set', { p_id: b.dataset.capEdit, p_caption: c, p_album: null }); route(); } catch (x) { toast(msgOf(x)); } }; });
  }

  var THEMES = [['classic', 'clássico', '#bfd0ea'], ['rosa', 'rosa', '#ffd6ea'], ['noite', 'noite', '#1d2a44'], ['verde', 'verde', '#cfe8c6'], ['roxo', 'roxo', '#d8c9ef'], ['preto', 'preto', '#222']];
  async function vEdit() {
    var pr = await rpc('rw_profile', { p_id: S.me }); S.theme = pr.theme;
    var f = pr.fields || {}, me = P(S.me);
    function inp(k, label, ph) { return '<label class="field"><span>' + label + '</span><input name="' + k + '" maxlength="300" value="' + E(f[k] || '') + '" placeholder="' + E(ph || '') + '"></label>'; }
    var mid = '<div class="box"><h3>editar perfil</h3><form class="form" data-edit>' +
      (S.as ? '<p class="small mute">Foto, cor e mensagem pessoal do NPC ficam no Portal do Narrador.</p>' : '<div class="field"><span>foto</span><div style="display:flex;gap:10px;align-items:center">' + av(S.me, 'lg') + '<label class="btn sm">trocar foto<input type="file" accept="image/*" hidden data-avatar></label><span class="small mute">Também muda no Messenger. A foto da ficha é usada automaticamente quando você entra pelo PC.</span></div></div>') +
      '<div class="two">' + inp('relacionamento', 'relacionamento', 'solteiro(a), enrolado(a)…') + inp('aniversario', 'aniversário', '17 de abril') + inp('cidade', 'cidade', 'Tóquio') + inp('escola', 'escola', '') + inp('idiomas', 'idiomas', 'japonês, inglês') + inp('humor', 'humor', 'extrovertido, sarcástico…') + inp('estilo', 'estilo', '') + inp('interesses', 'interesses', '') + '</div>' +
      inp('musica', 'música', '') + inp('filmes', 'filmes', '') + inp('livros', 'livros', '') + inp('frase', 'frase favorita', '') +
      '<label class="field"><span>quem sou eu</span><textarea name="about" maxlength="3000" rows="6">' + E(pr.about || '') + '</textarea></label>' +
      '<div class="field"><span>tema do perfil (o que os visitantes veem)</span><div class="themes">' + THEMES.map(function (t) { return '<label><input type="radio" name="theme" value="' + t[0] + '"' + (pr.theme === t[0] ? ' checked' : '') + '><i style="background:' + t[2] + '"></i>' + t[1] + '</label>'; }).join('') + '</div></div>' +
      '<div><button class="btn pri" type="submit">salvar perfil</button> <a class="btn" href="#/perfil/' + S.me + '">cancelar</a></div></form></div>';
    page('editar', leftCard(S.me, 'editar', pr), mid, null);
    var form = app.querySelector('[data-edit]');
    form.querySelectorAll('[name=theme]').forEach(function (r) { r.onchange = function () { document.body.dataset.theme = r.value; }; });
    form.onsubmit = async function (e) {
      e.preventDefault();
      var fields = {}; FIELDS.forEach(function (x) { if (form[x[0]]) fields[x[0]] = form[x[0]].value.trim(); });
      var th = (form.querySelector('[name=theme]:checked') || {}).value || 'classic';
      try { await rpc('rw_profile_save', { p_about: form.about.value, p_fields: fields, p_theme: th }); await loadPeople(true); toast('Perfil salvo!'); location.hash = '#/perfil/' + S.me; } catch (x) { toast(msgOf(x)); }
    };
    var ai = form.querySelector('[data-avatar]');
    if (ai) ai.onchange = async function () {
      var f0 = ai.files[0]; if (!f0) return;
      try {
        var o = await compress(f0, 192, .82);
        var d = await new Promise(function (r) { var fr = new FileReader(); fr.onload = function () { r(fr.result); }; fr.readAsDataURL(o.b); });
        if (d.length > 60000) { o = await compress(f0, 128, .7); d = await new Promise(function (r) { var fr = new FileReader(); fr.onload = function () { r(fr.result); }; fr.readAsDataURL(o.b); }); }
        var r = await sb.rpc('phobia_set_avatar', { p_token: S.sess.token, p_avatar: d }); if (r.error) throw new Error(msgOf(r.error));
        await loadPeople(true); toast('Foto trocada!'); route();
      } catch (x) { toast(msgOf(x)); }
    };
  }

  /* ---------- comunidades ---------- */
  async function vComms(q) {
    S.theme = null;
    var list = await rpc('rw_comms', { p_q: q || null });
    var mine = list.filter(function (c) { return c.joined; });
    var mid = '<div class="box"><h3>' + (q ? 'busca: “' + E(q) + '”' : 'comunidades do rewind') + ' <small>(' + list.length + ')</small><button class="btn sm pri" type="button" data-new-comm>+ criar comunidade</button></h3>' +
      '<div data-comm-form hidden></div>' +
      '<div class="comm-list">' + (list.map(function (c) { return '<div class="citem">' + cimg(c) + '<div><a href="#/comunidade/' + c.id + '"><b>' + E(c.name) + '</b></a> <span class="mute small">· ' + E(c.category) + ' · ' + c.members + ' membro(s)</span><div class="small">' + E(c.description || '') + '</div></div>' + (c.joined ? '<span class="small mute">✔ membro</span>' : '<button class="btn sm" data-join="' + c.id + '">participar</button>') + '</div>'; }).join('') || '<p class="empty">Nenhuma comunidade ainda. Que tal criar “Eu odeio acordar cedo”?</p>') + '</div></div>';
    page('comunidades', leftCard(S.me, ''), mid, commBox(mine.map(function (c) { return { id: c.id, name: c.name, img: c.img }; })));
    app.querySelector('[data-new-comm]').onclick = function () { showCommForm(app.querySelector('[data-comm-form]'), null); };
    app.querySelectorAll('[data-join]').forEach(function (b) { b.onclick = async function () { try { await rpc('rw_comm_join', { p_id: b.dataset.join, p_join: true }); location.hash = '#/comunidade/' + b.dataset.join; } catch (x) { toast(msgOf(x)); } }; });
  }
  var CATS = ['Humor', 'Música', 'Escola', 'Mistério', 'Cidades', 'Games', 'Anime', 'Esportes', 'Relacionamentos', 'Pessoas', 'Outros'];
  function showCommForm(box, c) {
    box.hidden = false;
    box.innerHTML = '<form class="form" data-cf style="border-bottom:1px solid var(--line);background:var(--box2)"><div class="two"><label class="field"><span>nome</span><input name="name" maxlength="60" required value="' + E(c ? c.name : '') + '" placeholder="Eu odeio segunda-feira"></label>' +
      '<label class="field"><span>categoria</span><select name="cat">' + CATS.map(function (k) { return '<option' + (c && c.category === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="field"><span>descrição</span><textarea name="desc" maxlength="1500" rows="3">' + E(c ? c.description || '' : '') + '</textarea></label>' +
      '<div class="field"><span>imagem</span><div style="display:flex;gap:8px;align-items:center"><span data-cprev>' + (c && c.img ? '<img src="' + E(c.img) + '" style="width:48px;height:48px;object-fit:cover">' : '') + '</span><label class="btn sm">escolher imagem<input type="file" accept="image/*" hidden data-cimg></label></div></div>' +
      '<div><button class="btn pri" type="submit">' + (c ? 'salvar' : 'criar comunidade') + '</button> <button class="btn" type="button" data-cancel>cancelar</button></div></form>';
    var f = box.querySelector('[data-cf]'), img = null;
    f.querySelector('[data-cancel]').onclick = function () { box.hidden = true; box.innerHTML = ''; };
    f.querySelector('[data-cimg]').onchange = async function (e) { var fl = e.target.files[0]; if (!fl) return; f.dataset.up = '1'; f.querySelector('[data-cprev]').innerHTML = '<span class="mute small">enviando…</span>'; try { var r = await upload(fl, { max: 400 }); img = r.id; f.querySelector('[data-cprev]').innerHTML = '<img src="' + E(r.url) + '" style="width:48px;height:48px;object-fit:cover">'; } catch (x) { f.querySelector('[data-cprev]').innerHTML = ''; toast(msgOf(x)); } finally { delete f.dataset.up; } };
    f.onsubmit = async function (e) {
      e.preventDefault();
      if (f.dataset.up) return toast('Espere a imagem terminar de enviar…');
      try { var id = await rpc('rw_comm_save', { p_id: c ? c.id : null, p_name: f.name.value, p_desc: f.desc.value, p_cat: f.cat.value, p_image: img }); toast(c ? 'Comunidade salva.' : 'Comunidade criada!'); location.hash = '#/comunidade/' + id; if (c) route(); } catch (x) { toast(msgOf(x)); }
    };
  }
  async function vComm(id) {
    S.theme = null;
    var c = await rpc('rw_comm', { p_id: id });
    var left = '<div class="box">' + cimg(c, 'lg') + '<div class="card-name">' + E(c.name) + '</div><div class="card-sub">' + E(c.category) + ' · ' + c.member_count + ' membro(s)<br>dono: ' + who(c.owner) + '</div>' +
      '<ul class="menu"><li>' + (c.joined ? '<button data-leave>🚪 sair da comunidade</button>' : '<button data-join-c>➕ participar</button>') + '</li>' + (c.can_edit ? '<li><button data-edit-c>✏️ editar comunidade</button></li><li><button data-del-c style="color:var(--bad)">🗑 apagar comunidade</button></li>' : '') + '</ul></div>';
    var topics = c.topics.map(function (t) { return '<tr><td><a href="#/topico/' + t.id + '"><b>' + E(t.title) + '</b></a><div class="small mute">por ' + who(t.author_id) + '</div></td><td class="n">' + t.posts + '</td><td class="n small">' + when(t.last_at) + '</td></tr>'; }).join('');
    var mid = '<div class="box"><div class="in"><h1 class="big-title">' + E(c.name) + '</h1><div class="about">' + (c.description ? rich(c.description).html : '<i class="mute">sem descrição</i>') + '</div><div data-comm-form hidden></div></div></div>' +
      '<div class="box"><h3>fórum <small>(' + c.topics.length + ' tópicos)</small>' + (c.joined ? '<button class="btn sm pri" type="button" data-new-topic>+ novo tópico</button>' : '') + '</h3>' +
      '<div data-topic-form hidden>' + composer('topic', 'Primeira mensagem do tópico…', 'criar tópico', '<label class="field"><span>título do tópico</span><input name="title" maxlength="120" required></label>') + '</div>' +
      (topics ? '<table class="topics"><tr><th>tópico</th><th style="text-align:center">posts</th><th style="text-align:center">última</th></tr>' + topics + '</table>' : '<p class="empty">' + (c.joined ? 'Nenhum tópico. Comece a conversa!' : 'Participe da comunidade para criar tópicos.') + '</p>') + '</div>';
    var right = '<div class="box"><h3>membros <small>(' + c.member_count + ')</small></h3><div class="grid9">' + c.members.slice(0, 9).map(tile).join('') + '</div></div>';
    page('comunidades', left, mid, right);
    var j = app.querySelector('[data-join-c]'); if (j) j.onclick = async function () { try { await rpc('rw_comm_join', { p_id: id, p_join: true }); route(); } catch (x) { toast(msgOf(x)); } };
    var l = app.querySelector('[data-leave]'); if (l) l.onclick = async function () { try { await rpc('rw_comm_join', { p_id: id, p_join: false }); route(); } catch (x) { toast(msgOf(x)); } };
    var ed = app.querySelector('[data-edit-c]'); if (ed) ed.onclick = function () { showCommForm(app.querySelector('[data-comm-form]'), c); };
    var dl = app.querySelector('[data-del-c]'); if (dl) dl.onclick = async function () { if (!arm(dl)) return; try { await rpc('rw_comm_delete', { p_id: id }); toast('Comunidade apagada.'); location.hash = '#/comunidades'; } catch (x) { toast(msgOf(x)); } };
    var nt = app.querySelector('[data-new-topic]'); if (nt) nt.onclick = function () { var b = app.querySelector('[data-topic-form]'); b.hidden = !b.hidden; if (!b.hidden) b.querySelector('[name=title]').focus(); };
    var tf = app.querySelector('[data-compose="topic"]');
    if (tf) bindComposer(tf, async function (b, m, form) { var t = form.title.value.trim(); if (!t) throw new Error('Dê um título ao tópico.'); var tid = await rpc('rw_topic_create', { p_comm: id, p_title: t, p_body: b, p_media: m }); location.hash = '#/topico/' + tid; });
  }
  async function vTopic(id) {
    S.theme = null;
    var t = await rpc('rw_topic', { p_id: +id });
    var posts = t.posts.map(function (p, i) {
      var can = p.author_id === S.me || t.mod;
      return '<div class="post" id="p' + p.id + '"><div class="pa">' + av(p.author_id, 'lg') + who(p.author_id) + '</div><div class="pb"><div class="meta"><span>' + when(p.created_at) + (i === 0 ? ' · abriu o tópico' : '') + '</span>' + (can ? '<button class="lnk bad" data-del-post="' + p.id + '">apagar</button>' : '') + '</div>' + bodyHTML(p.body, p.img) + '</div></div>';
    }).join('');
    var left = '<div class="box">' + cimg(t.community, 'lg') + '<div class="card-name"><a href="#/comunidade/' + t.community.id + '">' + E(t.community.name) + '</a></div><ul class="menu"><li><a href="#/comunidade/' + t.community.id + '">← voltar ao fórum</a></li>' + (t.mod || t.author === S.me ? '<li><button data-del-topic style="color:var(--bad)">🗑 apagar tópico</button></li>' : '') + '</ul></div>';
    var mid = '<div class="box"><h3>' + E(t.title) + ' <small>(' + t.posts.length + ' posts)</small></h3>' + posts +
      (t.joined ? composer('post', 'Responder neste tópico…', 'responder') : '<p class="empty"><a href="#/comunidade/' + t.community.id + '">Participe da comunidade</a> para responder.</p>') + '</div>';
    page('comunidades', left, mid, null);
    var pf = app.querySelector('[data-compose="post"]');
    if (pf) bindComposer(pf, async function (b, m) { await rpc('rw_post_send', { p_topic: +id, p_body: b, p_media: m }); route(); setTimeout(function () { window.scrollTo(0, document.body.scrollHeight); }, 50); });
    app.querySelectorAll('[data-del-post]').forEach(function (b) { b.onclick = async function () { if (!arm(b)) return; try { await rpc('rw_post_delete', { p_id: +b.dataset.delPost }); route(); } catch (x) { toast(msgOf(x)); } }; });
    var dt = app.querySelector('[data-del-topic]'); if (dt) dt.onclick = async function () { if (!arm(dt)) return; try { await rpc('rw_topic_delete', { p_id: +id }); location.hash = '#/comunidade/' + t.community.id; } catch (x) { toast(msgOf(x)); } };
  }
  async function vSearch(q) {
    S.theme = null;
    var ql = q.toLowerCase(), ppl = Object.keys(S.people).filter(function (k) { return (S.people[k].name || '').toLowerCase().indexOf(ql) >= 0; });
    var comms = await rpc('rw_comms', { p_q: q });
    var mid = '<div class="box"><h3>pessoas <small>(' + ppl.length + ')</small></h3>' + (ppl.length ? '<div class="grid9" style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr))">' + ppl.map(tile).join('') + '</div>' : '<p class="empty">ninguém com esse nome</p>') + '</div>' +
      '<div class="box"><h3>comunidades <small>(' + comms.length + ')</small></h3><div class="comm-list">' + (comms.map(function (c) { return '<div class="citem">' + cimg(c) + '<div><a href="#/comunidade/' + c.id + '"><b>' + E(c.name) + '</b></a> <span class="mute small">· ' + c.members + ' membro(s)</span></div><span></span></div>'; }).join('') || '<p class="empty">nenhuma</p>') + '</div></div>';
    page('', leftCard(S.me, ''), mid, null);
  }

  /* ---------- ações comuns ---------- */
  function arm(b) { if (b.dataset.arm && Date.now() - b.dataset.arm < 3000) return true; b.dataset.arm = Date.now(); var o = b.textContent; b.textContent = 'confirmar?'; setTimeout(function () { b.textContent = o; delete b.dataset.arm; }, 3000); return false; }
  function bindCommon() {
    app.querySelectorAll('[data-friend]').forEach(function (b) { b.onclick = async function () { try { var r = await rpc('rw_friend', { p_other: b.dataset.id, p_action: b.dataset.friend }); toast(r === 'friends' ? 'Agora vocês são amigos!' : r === 'pending_out' ? 'Pedido de amizade enviado.' : 'Pronto.'); route(); } catch (x) { toast(msgOf(x)); } }; });
    app.querySelectorAll('[data-del-scrap]').forEach(function (b) { b.onclick = async function () { if (!arm(b)) return; try { await rpc('rw_scrap_delete', { p_id: +b.dataset.delScrap }); route(); } catch (x) { toast(msgOf(x)); } }; });
    var s = app.querySelector('[data-search]'); if (s) s.onsubmit = function (e) { e.preventDefault(); var q = s.q.value.trim(); if (q) location.hash = '#/buscar/' + encodeURIComponent(q); };
    var lo = app.querySelector('[data-act="logout"]'); if (lo) lo.onclick = logout;
    var go = app.querySelector('[data-act="gmout"]'); if (go) go.onclick = function () { S.as = null; try { localStorage.removeItem(AS_KEY); localStorage.setItem('rewind-gm-off', '1'); } catch (e) {} start(); };
    var as = app.querySelector('[data-as]'); if (as) as.onchange = function () { S.as = as.value; try { localStorage.setItem(AS_KEY, S.as); } catch (e) {} S.peopleAt = 0; location.hash = '#/'; route(); };
  }
  document.addEventListener('click', function (e) {
    var y = e.target.closest('[data-yt]');
    if (y && !y.classList.contains('playing')) { y.classList.add('playing'); y.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + y.dataset.yt + '?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="Vídeo"></iframe>'; return; }
    var z = e.target.closest('[data-zoom],[data-zoom-src]');
    if (z) { var src = z.dataset.zoomSrc || z.src, cap = z.dataset.cap || ''; var lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = '<div><img src="' + E(src) + '" alt="">' + (cap ? '<p>' + E(cap) + '</p>' : '') + '</div>'; lb.onclick = function () { lb.remove(); }; document.body.appendChild(lb); return; }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var lb = document.querySelector('.lightbox'); if (lb) lb.remove(); } });

  /* ---------- rotas ---------- */
  var routing = 0;
  async function route() {
    if (!logged()) return vLogin();
    var my = ++routing, h = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
    try {
      await loadPeople(false);
      if (my !== routing) return;
      var k = h[0], id = h[1];
      if (k === 'perfil' && id) await vProfile(id);
      else if (k === 'recados' && id) await vScraps(id);
      else if (k === 'depoimentos' && id) await vTesti(id);
      else if (k === 'amigos' && id) await vFriends(id);
      else if (k === 'fotos' && id) await vPhotos(id);
      else if (k === 'editar') await vEdit();
      else if (k === 'comunidades') await vComms();
      else if (k === 'comunidade' && id) await vComm(id);
      else if (k === 'topico' && id) await vTopic(id);
      else if (k === 'buscar' && id) await vSearch(h.slice(1).join('/'));
      else await vHome();
      if (!/^#\/topico/.test(location.hash)) window.scrollTo(0, 0);
    } catch (x) {
      if (x.raw && /SESSAO_INVALIDA/.test(x.raw)) { S.sess = null; try { localStorage.removeItem(SKEY); } catch (e) {} return vLogin('Sua sessão expirou. Entre de novo.'); }
      if (x.raw && /SEM_ACESSO/.test(x.raw) && S.as) { S.as = null; try { localStorage.removeItem(AS_KEY); } catch (e) {} return start(); }
      app.innerHTML = topbar('') + '<div class="wrap"><div class="box" style="margin:20px 0"><div class="in">' + E(msgOf(x)) + ' <a href="#/">voltar ao início</a></div></div></div>';
      bindCommon();
    }
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (a && a.getAttribute('href') === location.hash && !e.ctrlKey && !e.metaKey) { e.preventDefault(); route(); }
  });

  /* ---------- login ---------- */
  function vLogin(err) {
    document.body.dataset.theme = 'classic';
    app.innerHTML = '<div class="login"><div class="pitch"><span class="logo">re<i>wind</i></span>' +
      '<p><b>Conecte-se aos seus amigos e familiares</b> da campanha usando recados e mensagens instantâneas.</p>' +
      '<ul><li><b>Encontre</b> os outros investigadores e os moradores de Tóquio</li><li><b>Deixe recados</b> e escreva depoimentos</li><li><b>Participe</b> de comunidades e discuta teorias</li></ul></div>' +
      '<div class="boxes"><div class="box"><h3>entrar no rewind</h3><form class="form" data-login>' +
        '<label class="field"><span>seu nome</span><select name="name"><option value="">carregando…</option></select></label>' +
        '<label class="field"><span>PIN</span><input name="pin" type="password" inputmode="numeric" maxlength="8"></label>' +
        '<button class="btn pri" type="submit">entrar</button><p class="err" hidden></p>' +
        '<p>É o mesmo nome e PIN do Phobia Messenger (no PC das Notas da ficha). Quem cria é o Narrador.</p></form></div>' +
      '<div class="box soft"><h3>sou o Narrador</h3><form class="form" data-gm><label class="field"><span>e-mail</span><input name="email" type="email" autocomplete="username"></label><label class="field"><span>senha</span><input name="pass" type="password" autocomplete="current-password"></label><button class="btn" type="submit">entrar como Narrador</button><p class="err" hidden></p></form></div>' +
      '</div></div>';
    var f = app.querySelector('[data-login]'), sel = f.name;
    if (err) { var e0 = f.querySelector('.err'); e0.hidden = false; e0.textContent = err; }
    sb.rpc('phobia_roster').then(function (r) {
      var list = r.data || [];
      sel.innerHTML = list.length ? '<option value="">— escolha —</option>' + list.map(function (p) { return '<option>' + E(p.name) + '</option>'; }).join('') : '<option value="">nenhum jogador cadastrado</option>';
    });
    f.onsubmit = async function (e) {
      e.preventDefault(); var er = f.querySelector('.err'); er.hidden = true;
      var r = await sb.rpc('phobia_login', { p_name: sel.value, p_pin: f.pin.value.trim() });
      if (r.error) { er.hidden = false; er.textContent = msgOf(r.error); return; }
      S.sess = { token: r.data.token, id: r.data.id, name: r.data.name }; try { localStorage.setItem(SKEY, JSON.stringify(S.sess)); } catch (x) {}
      S.as = null; try { localStorage.removeItem(AS_KEY); } catch (x) {}
      S.peopleAt = 0; location.hash = '#/'; route();
    };
    var g = app.querySelector('[data-gm]');
    g.onsubmit = async function (e) {
      e.preventDefault(); var er = g.querySelector('.err'); er.hidden = true;
      var r = await sb.auth.signInWithPassword({ email: g.email.value.trim(), password: g.pass.value });
      if (r.error) { er.hidden = false; er.textContent = 'E-mail ou senha incorretos.'; return; }
      try { localStorage.removeItem('rewind-gm-off'); } catch (x) {}
      start();
    };
  }
  async function logout() {
    if (S.as || S.gmUser) { await sb.auth.signOut(); S.gmUser = null; S.as = null; try { localStorage.removeItem(AS_KEY); } catch (e) {} }
    else { var t = S.sess && S.sess.token; S.sess = null; try { localStorage.removeItem(SKEY); } catch (e) {} if (t) sb.rpc('phobia_logout', { p_token: t }); }
    S.peopleAt = 0; vLogin();
  }

  async function start() {
    var ss = await sb.auth.getSession(), user = ss.data.session && ss.data.session.user;
    S.gmUser = null;
    var gmOff = false; try { gmOff = localStorage.getItem('rewind-gm-off') === '1'; } catch (e) {}
    if (user && !gmOff) {
      var adm = await sb.rpc('tanaka_is_admin');
      if (adm.data) {
        S.gmUser = user;
        var npcs = await sb.from('phobia_npcs').select('id,name').order('name');
        S.npcs = npcs.data || [];
        if (!S.npcs.length) {
          app.innerHTML = '<div class="wrap"><div class="box" style="margin:30px auto;max-width:560px"><h3>modo Narrador</h3><div class="in">' +
            '<p>Você entrou como <b>Narrador</b>. Aqui você age como um NPC, mas ainda não existe nenhum. Crie o primeiro agora (depois dá para pôr foto e detalhes no <a href="../gm.html" target="_top">Portal do Narrador</a>):</p>' +
            '<form data-npc0 style="display:flex;gap:8px;margin:12px 0"><input name="n" required maxlength="40" placeholder="Nome do NPC (ex.: Sr. Tanaka)" style="flex:1"><button class="btn pri" type="submit">criar NPC</button></form>' +
            '<p class="small mute">Os jogadores não veem esta tela: eles entram com nome + PIN normalmente. <button class="lnk" data-x>sair do modo Narrador</button></p></div></div></div>';
          app.querySelector('[data-x]').onclick = logout;
          app.querySelector('[data-npc0]').onsubmit = async function (e) {
            e.preventDefault(); var nm = e.target.n.value.trim(); if (!nm) return;
            var r = await sb.from('phobia_npcs').insert({ name: nm, color: '#c2185b', status: 'online' }).select('id').single();
            if (r.error) return toast('Não deu para criar o NPC.');
            S.as = r.data.id; try { localStorage.setItem(AS_KEY, S.as); } catch (x) {}
            start();
          };
          return;
        }
        if (!S.as || !S.npcs.some(function (n) { return n.id === S.as; })) { S.as = S.npcs[0].id; try { localStorage.setItem(AS_KEY, S.as); } catch (e) {} }
      }
    }
    if (!S.gmUser) S.as = null;
    S.peopleAt = 0;
    route();
  }
  start();
})();

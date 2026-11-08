/* ==========================================================
   PERSONA // PHOBIA — combat-mode.js   (MODO DE COMBATE)
   Tela de batalha da ficha:
   • PV e PM com botões rápidos de dano/cura, PV/PM temporários;
   • arma em mãos (acerto, dano, alcance) e Habilidades do instrumento;
   • magias do deck (custo, efeito, "Conjurar" desconta PM);
   • Habilidade de Combate, Habilidade Natural e Habilidades de Arcana
     (nível 1 + Despertares e Amplificações adquiridos);
   • afinidades (fraquezas/resistências), ações da rodada e contador;
   • animações de tela: VANTAGEM!, CERCADO!, EMBOSCADA!, CRÍTICO!,
     FRAQUEZA!, 1 MORE!, ALL-OUT ATTACK! e VITÓRIA!.
   Lê e grava nos mesmos campos da ficha (resources, actions...).
   ========================================================== */
(function () {
  'use strict';
  if (window.__combatMode) return; window.__combatMode = true;

  var SPLASH = {
    vantagem: { t: 'VANTAGEM!', s: 'O inimigo foi ao chão', c: '#ef2b97', k: 'good', state: 'vantagem' },
    cercado: { t: 'CERCADO!', s: 'As Sombras têm a vantagem', c: '#7a1cff', k: 'bad', state: 'cercado' },
    emboscada: { t: 'EMBOSCADA!', s: 'Vocês atacam primeiro', c: '#ffd84d', k: 'good', state: 'vantagem' },
    critico: { t: 'CRÍTICO!', s: 'Golpe perfeito', c: '#ff4d6a', k: 'good' },
    fraqueza: { t: 'FRAQUEZA!', s: 'Acertou o ponto fraco', c: '#6ce6ff', k: 'good' },
    onemore: { t: '1 MORE!', s: 'Ação extra', c: '#96ff45', k: 'good' },
    allout: { t: 'ALL-OUT ATTACK!', s: 'Todos juntos, agora!', c: '#ff2a2a', k: 'good' },
    vitoria: { t: 'VITÓRIA!', s: 'Combate encerrado', c: '#ffd84d', k: 'good', state: 'neutro' }
  };
  var ACTIONS = [['standardSpent', 'Padrão'], ['quickSpent', 'Rápida'], ['reactionSpent', 'Reação'], ['interruptSpent', 'Interromper']];
  var REACT_ORDER = { Fraqueza: 0, Resiste: 1, Nulo: 2, Drena: 3, Reflete: 4 };

  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function reduced() { return document.body.classList.contains('hs-calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function S() { return state.charSheet; }
  function ui() { var s = S(); s.ui = s.ui || {}; s.ui.combat = s.ui.combat || { round: 1, status: 'neutro', open: {} }; s.ui.combat.open = s.ui.combat.open || {}; return s.ui.combat; }
  function calc() { try { return calculateSheet(); } catch (e) { return null; } }
  function num(v) { return Number(v) || 0; }
  function rich(t) {
    var s = E(t || '');
    s = s.replace(/\[([^\]]+)\]/g, '<span class="cm-kw">$1</span>').replace(/\(([^)]{1,40})\)/g, '<span class="cm-tag">$1</span>');
    return s.replace(/\n/g, '<br>');
  }
  function save() { try { saveState(true); } catch (e) {} }

  /* ---------- dados ---------- */
  function res() {
    var c = calc(), r = S().resources;
    if (r.pvCurrent === null || r.pvCurrent === '') r.pvCurrent = c ? c.pvMax : 0;
    if (r.pmCurrent === null || r.pmCurrent === '') r.pmCurrent = c ? c.pmMax : 0;
    return { pv: num(r.pvCurrent), pvMax: c ? c.pvMax : 0, pvTemp: num(r.pvTemp), pm: num(r.pmCurrent), pmMax: c ? c.pmMax : 0, pmTemp: num(r.pmTemp) };
  }
  function weapons() {
    var out = [];
    try {
      var q = ensureEquipmentState();
      ['primary', 'secondary'].forEach(function (k, i) {
        var it = q.items.filter(function (x) { return x.id === q.slots[k] && x.type === 'instrument'; })[0];
        if (it) out.push({ slot: i ? 'SECUNDÁRIO' : 'PRINCIPAL', it: it });
      });
    } catch (e) {}
    return out;
  }
  function spells() {
    try {
      return getFilledMagicSlots().map(function (m) {
        var s = deckLabSpell(m) || m;
        return { name: s.name || m.name, tier: s.tier || m.tier, cost: s.cost || m.cost || '', cat: s.category || m.type || '', target: s.target || m.target || '', effect: m.effect || s.effect || '', desc: s.description || m.description || '', color: (function () { try { return deckLabColor(s); } catch (e) { return '#6ce6ff'; } })() };
      });
    } catch (e) { return []; }
  }
  function arcanaSkills() {
    var out = [];
    try {
      var a = currentArcanaData(); if (!a) return { arcana: null, list: out };
      (a.nivel1 || []).forEach(function (h) { out.push({ src: 'ARCANA ' + a.romano + ' · NÍVEL 1', name: h.nome, text: h.texto }); });
      var p = ensureArcanaProgress(a.romano);
      var NAMES = { impeto: 'Ímpeto', autocuidado: 'Autocuidado', artificio: 'Artifício', cognicao: 'Cognição', elo: 'Elo', resolucao: 'Resolução' };
      Object.keys(NAMES).forEach(function (k) {
        var e = p[k]; if (!e || !e.owned) return;
        var src = arcanaAwakeningSource(a, k); if (!src) return;
        if (src.habilidade) out.push({ src: 'DESPERTAR · ' + NAMES[k].toUpperCase(), name: src.habilidade.nome, text: src.habilidade.texto });
        (src.amplificacoes || []).forEach(function (am, i) { if (e.amplificacoes && e.amplificacoes[i]) out.push({ src: 'AMPLIFICAÇÃO · ' + NAMES[k].toUpperCase(), name: am.nome, text: am.texto }); });
      });
      return { arcana: a, list: out };
    } catch (e) { return { arcana: null, list: out }; }
  }
  function personalSkills() {
    var s = S(), out = [];
    [['combatAbility', 'HABILIDADE DE COMBATE'], ['naturalAbility', 'HABILIDADE NATURAL']].forEach(function (p) {
      var a = s[p[0]]; if (!a || !(a.name || a.description)) return;
      var meta = [a.cost, a.trigger, a.uses].filter(Boolean).join(' · ');
      var ups = (a.upgrades && a.upgrades.length ? a.upgrades : [a.upgrade1, a.upgrade2, a.upgrade3]).filter(function (x) { return String(x || '').trim(); });
      out.push({ src: p[1], name: a.name || p[1], text: (meta ? meta + '\n' : '') + (a.description || '') + (ups.length ? '\n' + ups.map(function (u, i) { return '★ Melhoria ' + (i + 1) + ': ' + u; }).join('\n') : '') });
    });
    return out;
  }

  /* ---------- montar ---------- */
  var root = null;
  function build() {
    root = document.createElement('section');
    root.id = 'combatMode'; root.className = 'cm'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Modo de Combate');
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches('.cm-amount')) { e.preventDefault(); var b = e.target.closest('.cm-res').querySelector('[data-cm-apply="-1"]'); if (b) b.click(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden && !document.querySelector('.cm-splash')) close(); });
  }
  function sideButton() {
    var nav = document.querySelector('#characterPage .sheet-page-tabs'); if (!nav || document.getElementById('cmEnter')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'cmEnter'; b.className = 'cm-enter';
    b.innerHTML = '<i aria-hidden="true">⚔</i><span><b>MODO DE COMBATE</b><small>Entrar na batalha</small></span>';
    b.addEventListener('click', open);
    nav.appendChild(b);
  }

  function bar(kind, cur, max, temp) {
    var pct = max ? Math.max(0, Math.min(100, cur / max * 100)) : 0, tp = max ? Math.min(100, temp / max * 100) : 0;
    var low = kind === 'pv' && pct <= 25;
    return '<div class="cm-res cm-' + kind + (low ? ' is-low' : '') + '" data-cm-res="' + kind + '">' +
      '<header><b>' + (kind === 'pv' ? 'PV' : 'PM') + '</b><span class="cm-val"><em>' + cur + '</em> / ' + max + (temp ? ' <i>+' + temp + ' TEMP</i>' : '') + '</span></header>' +
      '<div class="cm-bar"><i style="width:' + pct.toFixed(1) + '%"></i>' + (tp ? '<u style="width:' + tp.toFixed(1) + '%"></u>' : '') + '<s></s></div>' +
      '<div class="cm-quick">' +
        ['-10', '-5', '-1'].map(function (v) { return '<button type="button" class="neg" data-cm-delta="' + v + '">' + v + '</button>'; }).join('') +
        ['+1', '+5', '+10'].map(function (v) { return '<button type="button" class="pos" data-cm-delta="' + v + '">' + v + '</button>'; }).join('') +
        '<input class="cm-amount" type="number" min="0" inputmode="numeric" placeholder="Valor" aria-label="Valor de ' + (kind === 'pv' ? 'dano ou cura' : 'gasto ou recuperação') + '">' +
        '<button type="button" class="neg wide" data-cm-apply="-1">' + (kind === 'pv' ? 'DANO' : 'GASTAR') + '</button>' +
        '<button type="button" class="pos wide" data-cm-apply="1">' + (kind === 'pv' ? 'CURA' : 'RECUPERAR') + '</button>' +
      '</div>' +
      '<div class="cm-temp"><span>TEMPORÁRIO</span><button type="button" data-cm-temp="-1">−</button><b>' + temp + '</b><button type="button" data-cm-temp="1">+</button><button type="button" class="full" data-cm-full>' + (kind === 'pv' ? 'VIDA CHEIA' : 'PM CHEIO') + '</button></div>' +
    '</div>';
  }
  function skillRow(id, src, name, body, color, extra) {
    var on = !!ui().open[id];
    return '<article class="cm-sk' + (on ? ' open' : '') + '" style="--sc:' + (color || 'var(--hud-acc2,#6ce6ff)') + '">' +
      '<button type="button" class="cm-sk-head" data-cm-toggle="' + E(id) + '" aria-expanded="' + on + '"><span><small>' + E(src) + '</small><b>' + E(name) + '</b></span>' + (extra || '') + '<i aria-hidden="true">' + (on ? '−' : '+') + '</i></button>' +
      '<div class="cm-sk-body">' + body + '</div></article>';
  }
  function render() {
    if (!root || root.hidden) return;
    var s = S(), c = calc(), r = res(), u = ui();
    var name = (s.profile && (s.profile.codename || s.profile.name)) || 'Seu personagem';
    var photo = String(s.photoData || '');
    var mods = null; try { mods = getEquippedModifiers(); } catch (e) {}
    var st = u.status || 'neutro';
    /* coluna 1: personagem */
    var acts = ACTIONS.map(function (a) { var used = !!(s.actions && s.actions[a[0]]); return '<button type="button" class="cm-act' + (used ? ' used' : '') + '" data-cm-action="' + a[0] + '" aria-pressed="' + used + '"><i></i>' + a[1] + '</button>'; }).join('');
    var derived = c ? [['REAÇÃO', c.reaction], ['MOVIMENTO', c.movement + ' m'], ['CRÍTICO', c.critStart >= 20 ? '20' : c.critStart + '–20'], ['FUGA', c.escape], ['ESQUIVA EQP', (mods && mods.dodge ? (mods.dodge > 0 ? '+' : '') + mods.dodge : '—')]] : [];
    var attrs = c ? ['FOR', 'MAG', 'TEC', 'AGI', 'VIT', 'SOR'].map(function (k) { return '<span><small>' + k + '</small><b>' + c[k] + '</b></span>'; }).join('') : '';
    var aff = (s.persona && s.persona.affinities || []).filter(function (a) { return a.reaction && a.reaction !== 'Normal'; }).sort(function (a, b) { return (REACT_ORDER[a.reaction] || 9) - (REACT_ORDER[b.reaction] || 9); });
    var col1 =
      '<div class="cm-me">' +
        '<div class="cm-photo">' + (/^data:image|^https?:/.test(photo) ? '<img src="' + E(photo) + '" alt="">' : '<span>' + E(name.slice(0, 1).toUpperCase()) + '</span>') + '</div>' +
        '<div class="cm-me-name"><small>' + (st === 'cercado' ? 'CERCADO // EM PERIGO' : st === 'vantagem' ? 'COM VANTAGEM' : 'EM COMBATE') + '</small><b>' + E(name) + '</b></div>' +
      '</div>' +
      bar('pv', r.pv, r.pvMax, r.pvTemp) + bar('pm', r.pm, r.pmMax, r.pmTemp) +
      '<div class="cm-box"><h4>AÇÕES DA RODADA</h4><div class="cm-acts">' + acts + '</div></div>' +
      '<div class="cm-box"><h4>ATRIBUTOS</h4><div class="cm-attrs">' + attrs + '</div>' +
        '<div class="cm-derived">' + derived.map(function (d) { return '<span><small>' + d[0] + '</small><b>' + E(d[1]) + '</b></span>'; }).join('') + '</div></div>' +
      (aff.length ? '<div class="cm-box"><h4>AFINIDADES</h4><div class="cm-aff">' + aff.map(function (a) { return '<span class="r-' + E(String(a.reaction).toLowerCase()) + '"><small>' + E(a.reaction) + '</small>' + E(a.type) + '</span>'; }).join('') + '</div></div>' : '');
    /* coluna 2: ataques */
    var ws = weapons();
    var wHTML = ws.map(function (w, i) {
      var it = w.it, abil = [it.ability1, it.ability2, it.ability3].filter(function (x) { return String(x || '').trim(); });
      var abHTML = abil.map(function (a, k) {
        var sk = window.PhobiaInstrumentSkills && PhobiaInstrumentSkills.find(a);
        var nm = sk ? sk.name : String(a).split('\n')[0].slice(0, 60);
        var body = sk ? PhobiaInstrumentSkills.card(sk, { compact: true }) : '<p>' + rich(a) + '</p>';
        return skillRow('w' + i + 'a' + k, 'HABILIDADE ' + (k + 1) + (sk ? ' · ' + sk.cat.name.toUpperCase() : ''), nm, body, sk ? sk.cat.color : null, sk && sk.cost ? '<em class="cm-cost">' + E(sk.cost) + '</em>' : '');
      }).join('');
      return '<div class="cm-weapon' + (i ? ' sec' : '') + '"><header><small>' + w.slot + (it.family ? ' · ' + E(it.family).toUpperCase() : '') + '</small><b>' + E(it.name) + '</b></header>' +
        '<div class="cm-wstats"><span><small>ACERTO</small><b>' + E(it.accuracy || '—') + '</b></span><span><small>DANO</small><b>' + E(it.damage || '—') + '</b></span><span><small>ALCANCE</small><b>' + E(it.range || '—') + '</b></span><span><small>HAB</small><b>' + E(it.hab || '—') + '</b></span></div>' +
        (it.properties ? '<p class="cm-props">' + rich(it.properties) + '</p>' : '') +
        (abHTML ? '<div class="cm-sks">' + abHTML + '</div>' : '') + '</div>';
    }).join('');
    var ba = s.basicAttack || {};
    var basic = '<div class="cm-weapon basic"><header><small>SEMPRE DISPONÍVEL</small><b>' + E(ba.name || 'Ataque Básico') + '</b></header><div class="cm-wstats"><span><small>ACERTO</small><b>' + E(ba.accuracy || 'HAB') + '</b></span><span><small>DANO</small><b>' + E(ba.damage || '—') + '</b></span><span><small>ALCANCE</small><b>' + E(ba.range || '—') + '</b></span><span><small>HAB</small><b>' + E(ba.hab || '—') + '</b></span></div></div>';
    var col2 = '<h3 class="cm-h">ATAQUES</h3>' + (wHTML || '<p class="cm-empty">Nenhum instrumento equipado. Equipe um na aba Equipamentos.</p>') + basic;
    /* coluna 3: magias e habilidades */
    var sp = spells();
    var spHTML = sp.map(function (m, i) {
      var pm = String(m.cost).match(/(\d+)\s*PM/i);
      var extra = '<em class="cm-cost">' + E(m.cost || '—') + '</em>';
      var body = (m.target ? '<p class="cm-meta">ALVO · ' + E(m.target) + ' · TIER ' + E(m.tier || '') + '</p>' : '') + '<p>' + rich(m.effect) + '</p>' + (m.desc ? '<p class="cm-desc">' + rich(m.desc) + '</p>' : '') +
        (pm ? '<button type="button" class="cm-cast" data-cm-cast="' + pm[1] + '" data-cm-spell="' + E(m.name) + '">CONJURAR · −' + pm[1] + ' PM</button>' : '');
      return skillRow('m' + i + m.name, (m.cat || 'MAGIA').toUpperCase() + ' · TIER ' + (m.tier || ''), m.name, body, m.color, extra);
    }).join('');
    var pers = personalSkills().map(function (h, i) { return skillRow('p' + i, h.src, h.name, '<p>' + rich(h.text) + '</p>', '#ffd84d'); }).join('');
    var ar = arcanaSkills();
    var arHTML = ar.list.map(function (h, i) { return skillRow('a' + i + h.name, h.src, h.name, '<p>' + rich(h.text) + '</p>', '#c8aaff'); }).join('');
    var col3 =
      '<h3 class="cm-h">MAGIAS <span>' + sp.length + '</span></h3><div class="cm-sks">' + (spHTML || '<p class="cm-empty">Deck de magias vazio.</p>') + '</div>' +
      '<h3 class="cm-h">HABILIDADES</h3><div class="cm-sks">' + (pers || '<p class="cm-empty">Sem Habilidade de Combate ou Natural registrada.</p>') + '</div>' +
      '<h3 class="cm-h">ARCANA' + (ar.arcana ? ' <span>' + E(ar.arcana.romano + ' · ' + (ar.arcana.nomeFicha || ar.arcana.nome)) + '</span>' : '') + '</h3><div class="cm-sks">' + (arHTML || '<p class="cm-empty">Nenhuma Arcana escolhida.</p>') + '</div>';
    var splashBtns = Object.keys(SPLASH).map(function (k) { var o = SPLASH[k]; return '<button type="button" class="cm-fx ' + o.k + '" data-cm-splash="' + k + '" style="--fc:' + o.c + '">' + o.t + '</button>'; }).join('');
    var scroll = root.querySelector('.cm-grid'); var keep = scroll ? [].map.call(root.querySelectorAll('.cm-col'), function (x) { return x.scrollTop; }) : null;
    root.dataset.status = st;
    root.innerHTML =
      '<div class="cm-bg" aria-hidden="true"><i></i><i></i></div>' +
      '<header class="cm-top">' +
        '<div class="cm-title"><small>PERSONA // PHOBIA</small><b>MODO DE <span>COMBATE</span></b></div>' +
        '<div class="cm-round"><button type="button" data-cm-round="-1" aria-label="Rodada anterior">−</button><span><small>RODADA</small><b>' + u.round + '</b></span><button type="button" data-cm-round="1" aria-label="Próxima rodada">+</button>' +
          '<button type="button" class="cm-next" data-cm-next>NOVA RODADA ▸</button></div>' +
        '<div class="cm-status st-' + st + '"><small>SITUAÇÃO</small><b>' + (st === 'vantagem' ? 'VANTAGEM' : st === 'cercado' ? 'CERCADO' : 'NEUTRO') + '</b>' + (st !== 'neutro' ? '<button type="button" data-cm-neutral title="Voltar ao neutro">×</button>' : '') + '</div>' +
        '<button type="button" class="cm-exit" data-cm-exit>SAIR DO COMBATE ✕</button>' +
      '</header>' +
      '<nav class="cm-fxbar" aria-label="Animações de combate">' + splashBtns + '</nav>' +
      '<div class="cm-grid"><div class="cm-col c1">' + col1 + '</div><div class="cm-col c2">' + col2 + '</div><div class="cm-col c3">' + col3 + '</div></div>';
    if (keep) root.querySelectorAll('.cm-col').forEach(function (x, i) { x.scrollTop = keep[i] || 0; });
  }

  /* ---------- ações ---------- */
  function changeRes(kind, delta) {
    var r = S().resources, c = calc(); res();
    var key = kind === 'pv' ? 'pvCurrent' : 'pmCurrent', tkey = kind === 'pv' ? 'pvTemp' : 'pmTemp', max = c ? (kind === 'pv' ? c.pvMax : c.pmMax) : 9999;
    if (delta < 0) {
      var d = -delta, t = num(r[tkey]);
      var fromTemp = Math.min(t, d); r[tkey] = t - fromTemp; d -= fromTemp;
      r[key] = Math.max(0, num(r[key]) - d);
    } else r[key] = Math.min(max, num(r[key]) + delta);
    after(kind, delta);
  }
  function after(kind, delta) {
    save(); syncSheet(); render();
    var el = root.querySelector('[data-cm-res="' + kind + '"]');
    if (el && !reduced()) { el.classList.add(delta < 0 ? 'hit' : 'heal'); setTimeout(function () { el.classList.remove('hit', 'heal'); }, 600); floatNum(el, delta); }
    var r = res();
    if (kind === 'pv' && delta < 0 && r.pv === 0) setTimeout(function () { splash({ t: 'NOCAUTE', s: 'PV chegou a zero', c: '#ff4d6a', k: 'bad' }); }, 200);
  }
  function floatNum(el, delta) {
    var f = document.createElement('span'); f.className = 'cm-float ' + (delta < 0 ? 'neg' : 'pos'); f.textContent = (delta > 0 ? '+' : '') + delta;
    el.appendChild(f); setTimeout(function () { f.remove(); }, 900);
  }
  function syncSheet() { try { renderCharacterSheet(); } catch (e) {} }

  function onClick(e) {
    var t = e.target.closest('button'); if (!t) return;
    var resEl = t.closest('[data-cm-res]'), kind = resEl && resEl.dataset.cmRes;
    if (t.dataset.cmDelta) { changeRes(kind, Number(t.dataset.cmDelta)); return; }
    if (t.dataset.cmApply) {
      var inp = resEl.querySelector('.cm-amount'), v = Math.abs(Number(inp.value) || 0); if (!v) { inp.focus(); return; }
      changeRes(kind, v * Number(t.dataset.cmApply)); return;
    }
    if (t.dataset.cmTemp) { var r = S().resources, k2 = kind === 'pv' ? 'pvTemp' : 'pmTemp'; r[k2] = Math.max(0, num(r[k2]) + Number(t.dataset.cmTemp)); save(); syncSheet(); render(); return; }
    if (t.hasAttribute('data-cm-full')) { var c = calc(); if (c) { S().resources[kind === 'pv' ? 'pvCurrent' : 'pmCurrent'] = kind === 'pv' ? c.pvMax : c.pmMax; after(kind, 1); } return; }
    if (t.dataset.cmAction) { S().actions = S().actions || {}; S().actions[t.dataset.cmAction] = !S().actions[t.dataset.cmAction]; save(); syncSheet(); render(); return; }
    if (t.dataset.cmRound) { var u = ui(); u.round = Math.max(1, u.round + Number(t.dataset.cmRound)); save(); render(); return; }
    if (t.hasAttribute('data-cm-next')) { var u2 = ui(); u2.round++; ACTIONS.forEach(function (a) { S().actions[a[0]] = false; }); save(); syncSheet(); render(); banner('RODADA ' + u2.round); return; }
    if (t.dataset.cmToggle) { var o = ui().open; o[t.dataset.cmToggle] = !o[t.dataset.cmToggle]; save(); render(); return; }
    if (t.dataset.cmCast) {
      var cost = Number(t.dataset.cmCast), rr = res();
      if (rr.pm + rr.pmTemp < cost) { banner('PM INSUFICIENTE', true); return; }
      changeRes('pm', -cost); banner(String(t.dataset.cmSpell).toUpperCase() + '!'); return;
    }
    if (t.dataset.cmSplash) { var sp = SPLASH[t.dataset.cmSplash]; if (sp.state) { ui().status = sp.state; save(); render(); } splash(sp); return; }
    if (t.hasAttribute('data-cm-neutral')) { ui().status = 'neutro'; save(); render(); return; }
    if (t.hasAttribute('data-cm-exit')) { close(); }
  }

  /* ---------- animações de tela ---------- */
  function splash(o) {
    var old = document.querySelector('.cm-splash'); if (old) old.remove();
    var s = S(), photo = String(s.photoData || ''), name = (s.profile && (s.profile.codename || s.profile.name)) || '';
    var el = document.createElement('div'); el.className = 'cm-splash ' + o.k + (reduced() ? ' calm' : ''); el.style.setProperty('--fc', o.c); el.setAttribute('role', 'status');
    var cut = o.k === 'good' && /^data:image|^https?:/.test(photo) ? '<div class="cm-cut"><img src="' + E(photo) + '" alt=""></div>' : '';
    var shards = ''; for (var i = 0; i < 7; i++) shards += '<i style="--i:' + i + '"></i>';
    el.innerHTML = '<div class="cm-sp-bg"></div><div class="cm-sp-shards">' + shards + '</div>' + cut +
      (o.k === 'bad' ? '<div class="cm-eyes"><i></i><i></i><i></i><i></i><i></i><i></i></div>' : '') +
      '<div class="cm-sp-txt"><b data-t="' + E(o.t) + '">' + E(o.t) + '</b><small>' + E(o.s) + (name && o.k === 'good' ? ' · ' + E(name) : '') + '</small></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function () { el.remove(); });
    setTimeout(function () { if (el.parentNode) el.classList.add('out'); }, reduced() ? 900 : 1700);
    setTimeout(function () { if (el.parentNode) el.remove(); }, reduced() ? 1200 : 2150);
  }
  function banner(text, bad) {
    var b = document.createElement('div'); b.className = 'cm-banner' + (bad ? ' bad' : ''); b.textContent = text;
    root.appendChild(b); setTimeout(function () { b.remove(); }, 1300);
  }

  /* ---------- abrir / fechar ---------- */
  function open() {
    if (!root) build();
    root.hidden = false; document.body.classList.add('cm-open');
    render();
    if (!reduced()) { root.classList.remove('enter'); void root.offsetWidth; root.classList.add('enter'); }
    var x = root.querySelector('[data-cm-exit]'); if (x) x.focus({ preventScroll: true });
  }
  function close() {
    if (!root) return;
    root.hidden = true; document.body.classList.remove('cm-open');
    var b = document.getElementById('cmEnter'); if (b) b.focus({ preventScroll: true });
  }
  window.PhobiaCombat = { open: open, close: close, splash: function (k) { splash(SPLASH[k] || SPLASH.vantagem); }, render: render };

  function init() {
    if (typeof calculateSheet !== 'function' || typeof state === 'undefined' || !state.charSheet || !document.querySelector('#characterPage .sheet-page-tabs')) { setTimeout(init, 250); return; }
    sideButton();
    var o = window.renderCharacterSheet;
    if (typeof o === 'function' && !o.__cm) {
      var w = function () { var r = o.apply(this, arguments); try { sideButton(); } catch (e) {} return r; };
      w.__cm = true; window.renderCharacterSheet = w;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

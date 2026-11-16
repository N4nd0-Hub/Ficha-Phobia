/* ==========================================================
   PERSONA // PHOBIA — awaken-deck.js   (aba DESPERTARES)
   Página única no padrão das outras abas da ficha:
   • topo com a carta da Arcana, Pontos de Despertar como
     gemas na trilha de PNv e seletor de Arcana;
   • Características de Nível 1;
   • Trilhas da Trama: 6 trilhas, cada uma com o Despertar e
     suas 2 Amplificações ligadas como uma árvore;
   • Arcana Dissonante (benefício x complicação) e notas.
   Usa as funções e o save que já existem na ficha.
   ========================================================== */
(function () {
  'use strict';
  if (window.__adDeck) return; window.__adDeck = true;

  var PATHS = [
    { k: 'impeto', n: 'Ímpeto', c: '#ff8a3d' },
    { k: 'autocuidado', n: 'Autocuidado', c: '#ff5fa8' },
    { k: 'artificio', n: 'Artifício', c: '#c8aaff' },
    { k: 'cognicao', n: 'Cognição', c: 'var(--hud-acc2,#6ce6ff)' },
    { k: 'elo', n: 'Elo', c: 'var(--hud-acc3,#96ff45)', uni: true },
    { k: 'resolucao', n: 'Resolução', c: '#ffda4d', uni: true }
  ];
  var IC = {
    impeto: '<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
    autocuidado: '<path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>',
    artificio: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    cognicao: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    elo: '<path d="M9 15 15 9M7.5 12.5 5 15a3.5 3.5 0 0 0 5 5l2.5-2.5M16.5 11.5 19 9a3.5 3.5 0 0 0-5-5l-2.5 2.5"/>',
    resolucao: '<path d="m12 2 9 10-9 10-9-10Z"/><path d="m12 7 4 5-4 5-4-5Z"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    mask: '<path d="M3 5v6a9 9 0 0 0 18 0V5c-3 2-5 2-9 0-4 2-6 2-9 0Z"/><path d="m6 10 3 1m6 0 3-1M8 15c3-2 5-2 8 0"/>'
  };
  function ico(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[k] || '') + '</svg>'; }
  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function master() { return document.body.classList.contains('master'); }
  function sfx(k) { try { window.PhobiaSfx && PhobiaSfx.play(k, 0); } catch (e) {} }
  function reduced() { return document.body.classList.contains('hs-calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

  /* texto das regras: [termo] em destaque, (valor) em itálico, listas e notas */
  function inl(t) {
    return E(t).replace(/\[([^\[\]\n]{1,80})\]/g, '<b class="ad-k">$1</b>').replace(/\(([^()\n]{1,40})\)/g, '<i class="ad-v">$1</i>');
  }
  function rule(text) {
    return String(text || '').split(/\n\s*\n/).map(function (blk) {
      blk = blk.trim(); if (!blk) return '';
      var lines = blk.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (/^\[[\s\S]+\]$/.test(blk)) return '<aside class="ad-note">' + inl(blk.slice(1, -1)).replace(/\n/g, '<br>') + '</aside>';
      var out = '', list = [];
      lines.forEach(function (l) {
        if (/^[-•]\s/.test(l)) { list.push('<li>' + inl(l.replace(/^[-•]\s/, '')) + '</li>'); return; }
        if (list.length) { out += '<ul>' + list.join('') + '</ul>'; list = []; }
        if (/^\[[^\]]+\]$/.test(l)) out += '<aside class="ad-note">' + inl(l.slice(1, -1)) + '</aside>';
        else if (/^Limita[çc][ãa]o:/i.test(l)) out += '<p class="ad-limit">' + inl(l) + '</p>';
        else out += '<p>' + inl(l) + '</p>';
      });
      if (list.length) out += '<ul>' + list.join('') + '</ul>';
      return out;
    }).join('');
  }

  /* ---------- dados ---------- */
  function A() { try { return currentArcanaData(); } catch (e) { return null; } }
  function prog() { var a = A(); return a ? ensureArcanaProgress(a.romano) : null; }
  function bud() { return awakeningPointBudget(state.charSheet.pnv, A()); }
  function src(k) { return arcanaAwakeningSource(A(), k); }
  function ui() { state.charSheet.ui = state.charSheet.ui || {}; var u = state.charSheet.ui; if (!PATHS.some(function (p) { return p.k === u.adPath; })) u.adPath = 'impeto'; return u; }
  function resOk() { return resolutionPurchaseAllowed(); }
  function lockMain(k) {
    var p = prog(); if (!p || p[k].owned) return '';
    if (k === 'resolucao' && !resOk()) return 'Requer PNv. 10 ou liberação do Narrador';
    if (bud().available < 1) return 'Sem Pontos de Despertar';
    return '';
  }
  function lockAmp(k, i) {
    var p = prog(); if (!p || p[k].amplificacoes[i]) return '';
    if (!p[k].owned) return 'Requer o Despertar da trilha';
    if (bud().available < 1) return 'Sem Pontos de Despertar';
    return '';
  }
  function commit() {
    try { document.querySelectorAll('[data-sheet="persona.amplifications"]').forEach(function (el) { if (el.value !== (state.charSheet.persona.amplifications || '')) el.value = state.charSheet.persona.amplifications || ''; }); } catch (e) {}
    renderCharacterSheet(); saveState(true);
  }

  /* ---------- peças ---------- */
  function head() {
    return '<header class="ad-head"><div><small>05 // ARQUIVO DA ARCANA</small><b>ARCANA <span>&amp; DESPERTARES</span></b></div>' +
      '<p>A carta da sua Persona traz as <b>Características de Nível 1</b>. A cada 2 níveis você ganha um <b>Ponto de Despertar</b> para abrir Despertares e Amplificações.</p></header>';
  }
  function hero() {
    var a = A(), b = bud(), p = prog();
    var nAw = 0, nAmp = 0;
    if (p) PATHS.forEach(function (x) { if (p[x.k].owned) nAw++; nAmp += p[x.k].amplificacoes.filter(Boolean).length; });
    var img = a && window.ARCANA_DEFAULT_IMAGES ? ARCANA_DEFAULT_IMAGES[a.romano] : (a && typeof ARCANA_DEFAULT_IMAGES !== 'undefined' ? ARCANA_DEFAULT_IMAGES[a.romano] : '');
    var opts = '<option value="">— escolher Arcana —</option>' + PERSONA_PHOBIA_ARCANAS.arcanas.map(function (x) { return '<option value="' + E(x.nomeFicha) + '"' + (a && a.romano === x.romano ? ' selected' : '') + '>' + x.romano + ' — ' + E(x.nomeFicha) + '</option>'; }).join('');
    var used = Math.min(b.spent, b.levelPoints), gems = '';
    for (var i = 0; i < 10; i++) {
      var lv = (i + 1) * 2, got = lv <= b.pnv, sp = got && i < used, next = !got && (i === 0 || (i * 2) <= b.pnv);
      gems += '<span class="ad-gem' + (got ? ' got' : '') + (sp ? ' spent' : '') + (next ? ' next' : '') + '" title="Ponto ' + (i + 1) + ' · PNv. ' + pad(lv) + (sp ? ' · em uso' : got ? ' · livre' : ' · bloqueado') + '"><i></i><small>' + pad(lv) + '</small></span>';
    }
    var bonusGems = '';
    for (var j = 0; j < Math.min(b.bonus, 10); j++) bonusGems += '<span class="ad-gem got bonus' + (j < b.spent - used ? ' spent' : '') + '" title="Ponto extra do Narrador"><i></i><small>+</small></span>';
    var avail = b.overBudget ? b.balance : b.available;
    var warn = !a ? '' : b.overBudget ? '<p class="ad-warn bad">' + (b.spent - b.earned) + ' aquisição(ões) acima do total. Remova algo ou suba o PNv.</p>' : '';
    return '<section class="ad-hero">' +
      '<div class="ad-tarot-col">' +
        '<div class="ad-tarot' + (a ? '' : ' empty') + '">' + (img ? '<img src="' + E(img) + '" alt="Carta ' + E(a.romano + ' — ' + a.nomeFicha) + '" loading="lazy" decoding="async">' : '<span>?</span>') + '<em>' + (a ? E(a.romano) : '—') + '</em></div>' +
        '<label class="ad-pick"><small>ARCANA DA PERSONA</small><select data-ad="arcana">' + opts + '</select></label>' +
      '</div>' +
      '<div class="ad-hero-main">' +
        '<div class="ad-id"><small>' + (a ? 'ARCANA ' + E(a.romano) : 'SEM ARCANA') + '</small><b>' + E(a ? a.nome : 'Escolha sua carta') + '</b>' +
          (a ? '<div class="ad-chips"><span>' + nAw + ' DESPERTAR' + (nAw === 1 ? '' : 'ES') + '</span><span>' + nAmp + ' AMPLIFICAÇ' + (nAmp === 1 ? 'ÃO' : 'ÕES') + '</span></div>' : '') + '</div>' +
        '<div class="ad-points">' +
          '<div class="ad-big' + (avail <= 0 ? ' zero' : '') + (b.overBudget ? ' over' : '') + '"><small>PONTOS LIVRES</small><b>' + avail + '</b></div>' +
          '<div class="ad-track-wrap"><div class="ad-track" aria-label="Pontos de Despertar por nível">' + gems + bonusGems + '</div>' +
            '<div class="ad-legend"><span class="l-got">LIVRE</span><span class="l-spent">EM USO</span><span class="l-lock">PRÓXIMOS</span><span class="ad-next">' + (b.pnv < 20 ? 'Próximo ponto no PNv. ' + pad((Math.floor(b.pnv / 2) + 1) * 2) : 'Todos os pontos de nível recebidos') + '</span></div></div>' +
          '<div class="ad-stats">' +
            '<div class="ad-pnv"><small>PNv.</small><div><button type="button" data-ad-pnv="-1" aria-label="Diminuir PNv"' + (b.pnv <= 1 ? ' disabled' : '') + '>−</button><b>' + pad(b.pnv) + '</b><button type="button" data-ad-pnv="1" aria-label="Aumentar PNv"' + (b.pnv >= 20 ? ' disabled' : '') + '>+</button></div></div>' +
            '<div><small>RECEBIDOS</small><b>' + b.earned + '</b></div><div><small>EM USO</small><b>' + b.spent + '</b></div>' +
          '</div>' +
        '</div>' + warn +
        social() +
        '<div class="ad-gm master-only"><small>NARRADOR</small>' +
          '<label class="ad-gm-step">Pontos extras <span><button type="button" data-ad-bonus="-1">−</button><b>' + b.bonus + '</b><button type="button" data-ad-bonus="1">+</button></span></label>' +
          '<label class="ad-gm-tog"><input type="checkbox" data-ad="resolution"' + (state.charSheet.progress && state.charSheet.progress.resolutionOverride ? ' checked' : '') + '><i></i>Liberar Resolução antes do PNv. 10</label>' +
        '</div>' +
      '</div></section>';
  }
  function social() {
    var a = A(); if (!a) return '';
    var spec = arcanaSocialSpec(a); if (!spec) return '';
    var fixed = Object.keys(spec.fixed || {}).map(function (s) { var e = spec.fixed[s]; return '<span><b>' + E(s) + '</b> +' + (e.tier || 0) + ' Tier' + (e.permanent ? ' · +' + e.permanent + ' testes' : '') + '</span>'; }).join('');
    var choice = '';
    if (spec.choice) {
      var saved = ensureArcanaSocialState()[a.romano] || '';
      choice = '<label class="ad-soc-pick' + (saved ? '' : ' need') + '"><span>+' + (spec.choice.tier || 1) + ' Tier' + (spec.choice.permanent ? ' · +' + spec.choice.permanent + ' testes' : '') + ' em</span><select data-ad="social"><option value="">escolha a habilidade</option>' +
        spec.choice.skills.map(function (s) { return '<option' + (s === saved ? ' selected' : '') + '>' + E(s) + '</option>'; }).join('') + '</select></label>';
    }
    return '<div class="ad-soc"><small>BÔNUS SOCIAL DA ARCANA</small><div>' + fixed + choice + '</div></div>';
  }
  function secHead(n, t, s, extra) {
    return '<header class="ad-sec-head"><em>' + n + '</em><div><b>' + t + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>' + (extra || '') + '</header>';
  }
  function level1() {
    var a = A();
    if (!a) return '<section class="ad-sec">' + secHead('A', 'CARACTERÍSTICAS DE NÍVEL 1') + '<div class="ad-empty">Escolha a Arcana acima para ver as Características que vêm com a carta.</div></section>';
    var cards = a.nivel1.map(function (h, i) {
      if (h.tipo === 'nota') return '<aside class="ad-l1 note"><small>NOTA DA ARCANA</small><b>' + E(h.nome) + '</b><div class="ad-rule">' + rule(h.texto) + '</div></aside>';
      return '<article class="ad-l1" style="--i:' + i + '"><small>' + E(a.romano) + ' · ' + pad(i + 1) + '</small><b>' + E(h.nome) + '</b><div class="ad-rule">' + rule(h.texto) + '</div></article>';
    }).join('');
    return '<section class="ad-sec">' + secHead('A', 'CARACTERÍSTICAS DE NÍVEL 1', 'Vêm com a carta ' + E(a.nome) + ', sem custo') + '<div class="ad-l1-grid">' + cards + '</div></section>';
  }
  function pips(k) {
    var p = prog()[k];
    return '<span class="ad-pips"><i class="' + (p.owned ? 'on' : '') + '"></i><i class="a' + (p.amplificacoes[0] ? ' on' : '') + '"></i><i class="a' + (p.amplificacoes[1] ? ' on' : '') + '"></i></span>';
  }
  function trama() {
    var a = A();
    if (!a) return '<section class="ad-sec">' + secHead('B', 'TRILHAS DA TRAMA') + '<div class="ad-empty">Escolha a Arcana para abrir as trilhas de Despertar.</div></section>';
    var u = ui(), p = prog(), cur = PATHS.filter(function (x) { return x.k === u.adPath; })[0];
    var tiles = PATHS.map(function (x, i) {
      var s = src(x.k), e = p[x.k], lock = x.k === 'resolucao' && !resOk() && !e.owned;
      return '<button type="button" class="ad-path' + (x.k === cur.k ? ' on' : '') + (e.owned ? ' owned' : '') + (lock ? ' locked' : '') + '" data-ad-path="' + x.k + '" style="--pc:' + x.c + '" aria-pressed="' + (x.k === cur.k) + '">' +
        '<span class="ad-path-ic">' + ico(lock ? 'lock' : x.k) + '</span><span class="ad-path-t"><small>' + pad(i + 1) + (x.uni ? ' · UNIVERSAL' : '') + '</small><b>' + E(x.n) + '</b><em>' + E(s ? s.habilidade.nome : '') + '</em></span>' + pips(x.k) + '</button>';
    }).join('');
    var s = src(cur.k), e = p[cur.k], lm = lockMain(cur.k);
    var main = '<article class="ad-aw' + (e.owned ? ' owned' : '') + '" style="--pc:' + cur.c + '" data-ad-card="' + cur.k + '-m">' +
      '<div class="ad-aw-top"><span class="ad-aw-ic">' + ico(cur.k) + '</span><div><small>DESPERTAR · ' + E(cur.n.toUpperCase()) + '</small><b>' + E(s.habilidade.nome) + '</b></div>' +
        (e.owned ? '<span class="ad-stamp">DESPERTO</span>' : '<span class="ad-cost">1 PT</span>') + '</div>' +
      '<div class="ad-rule">' + rule(s.habilidade.texto) + '</div>' +
      '<div class="ad-act">' + (e.owned
        ? '<button type="button" class="ad-undo" data-ad-buy="' + cur.k + '">Remover (devolve ' + (1 + e.amplificacoes.filter(Boolean).length) + ' pt)</button>'
        : '<button type="button" class="ad-buy" data-ad-buy="' + cur.k + '"' + (lm ? ' disabled' : '') + '>DESPERTAR · −1 PT</button>' + (lm ? '<span class="ad-why">' + ico('lock') + E(lm) + '</span>' : '')) + '</div></article>';
    var amps = (s.amplificacoes || []).slice(0, 2).map(function (am, i) {
      var own = e.amplificacoes[i], la = lockAmp(cur.k, i);
      return '<article class="ad-amp' + (own ? ' owned' : '') + (!e.owned && !own ? ' sealed' : '') + '" style="--pc:' + cur.c + '" data-ad-card="' + cur.k + '-' + i + '">' +
        '<div class="ad-amp-top"><em>' + (own ? ico('check') : 'A' + (i + 1)) + '</em><div><small>AMPLIFICAÇÃO ' + (i + 1) + '</small><b>' + E(am.nome) + '</b></div>' + (own ? '' : '<span class="ad-cost">1 PT</span>') + '</div>' +
        '<div class="ad-rule">' + rule(am.texto) + '</div>' +
        '<div class="ad-act">' + (own
          ? '<button type="button" class="ad-undo" data-ad-buy="' + cur.k + '" data-ad-amp="' + i + '">Remover (devolve 1 pt)</button>'
          : '<button type="button" class="ad-buy" data-ad-buy="' + cur.k + '" data-ad-amp="' + i + '"' + (la ? ' disabled' : '') + '>AMPLIFICAR · −1 PT</button>' + (la ? '<span class="ad-why">' + ico('lock') + E(la) + '</span>' : '')) + '</div></article>';
    }).join('');
    return '<section class="ad-sec">' + secHead('B', 'TRILHAS DA TRAMA', 'Cada Despertar e cada Amplificação custam 1 ponto. Amplificações pedem o Despertar da trilha.') +
      '<div class="ad-paths" role="group" aria-label="Trilhas">' + tiles + '</div>' +
      '<div class="ad-tree' + (e.owned ? ' lit' : '') + '" style="--pc:' + cur.c + '">' + main + '<div class="ad-branch" aria-hidden="true"><i></i><i></i></div><div class="ad-amps">' + amps + '</div></div></section>';
  }
  function dissonant() {
    var d1 = currentDissonantArcana(), d2 = currentExtraDissonantArcana();
    var list = PERSONA_PHOBIA_DISSONANT_ARCANAS;
    function opts(sel, ex) { return '<option value="">— nenhuma —</option>' + list.map(function (d) { return '<option value="' + d.romano + '"' + (d.romano === sel ? ' selected' : '') + (d.romano === ex ? ' disabled' : '') + '>' + d.romano + ' — ' + E(d.nome) + (d.proposta ? ' · proposta' : '') + '</option>'; }).join(''); }
    var picks = '<div class="ad-dis-pick"><label><small>ARCANA DISSONANTE</small><select data-ad="dis">' + opts(d1 ? d1.romano : '') + '</select></label>' +
      (d1 && d1.romano === 'XI' ? '<label><small>SEGUNDA DISSONANTE (XI)</small><select data-ad="dis2">' + opts(d2 ? d2.romano : '', 'XI') + '</select></label>' : '') + '</div>';
    function card(d) {
      return '<div class="ad-dis">' +
        '<div class="ad-dis-id"><span>' + ico('mask') + '</span><div><small>DISSONANTE ' + E(d.romano) + (d.proposta ? ' · PROPOSTA' : '') + '</small><b>' + E(d.nome) + '</b><p>' + E(d.descricao || '') + '</p></div></div>' +
        '<div class="ad-dis-grid">' +
          '<article class="ad-dis-c good"><small>BENEFÍCIO</small><b>' + E(d.beneficio && d.beneficio.nome) + '</b><div class="ad-rule">' + rule(d.beneficio && d.beneficio.texto) + '</div></article>' +
          '<article class="ad-dis-c bad"><small>COMPLICAÇÃO</small><b>' + E(d.complicacao && d.complicacao.nome) + '</b><div class="ad-rule">' + rule(d.complicacao && d.complicacao.texto) + '</div></article>' +
        '</div>' +
        (d.exclusivo ? '<article class="ad-dis-c ex"><small>EXCLUSIVO</small><b>' + E(typeof d.exclusivo === 'string' ? 'Efeito exclusivo' : d.exclusivo.nome) + '</b><div class="ad-rule">' + rule(typeof d.exclusivo === 'string' ? d.exclusivo : d.exclusivo.texto) + '</div></article>' : '') +
      '</div>';
    }
    var body = d1 ? card(d1) + (d1.romano === 'XI' && d2 && d2.romano !== 'XI' ? card(d2) : '') : '<div class="ad-empty">Sem Arcana Dissonante. Ela é opcional e ocupa uma escolha de Defeito (vale 5 pontos de Vantagem).</div>';
    return '<section class="ad-sec">' + secHead('C', 'ARCANA DISSONANTE', 'O lado quebrado da sua Arcana: um benefício e uma complicação', picks) + body + '</section>';
  }
  function notes() {
    return '<section class="ad-sec">' + secHead('D', 'NOTAS DA ARCANA', 'Exceções, mudanças do Narrador e lembretes') +
      '<textarea class="ad-notes" data-ad="notes" rows="5" placeholder="Exceções, alterações narrativas ou observações desta ficha...">' + E((state.charSheet.persona && state.charSheet.persona.amplifications) || '') + '</textarea></section>';
  }

  /* ---------- montar ---------- */
  var root = null, flash = null;
  function mount() {
    var panel = document.getElementById('sheet-panel-awakening'); if (!panel) return null;
    root = document.getElementById('adDeck');
    if (!root) {
      root = document.createElement('div'); root.id = 'adDeck';
      panel.insertBefore(root, panel.firstChild);
      root.addEventListener('click', onClick);
      root.addEventListener('change', onChange);
      root.addEventListener('input', onInput);
    }
    return root;
  }
  function render() {
    if (!mount()) return;
    if (root.contains(document.activeElement) && document.activeElement.matches('textarea')) {
      /* não recria enquanto digita nas notas: só o resto */
    }
    var keepNotes = root.querySelector('.ad-notes'), focusNotes = keepNotes && document.activeElement === keepNotes, sel = focusNotes ? [keepNotes.selectionStart, keepNotes.selectionEnd] : null;
    var scroller = document.getElementById('characterPage'), top = scroller ? scroller.scrollTop : 0;
    root.innerHTML = head() + hero() + level1() + trama() + dissonant() + notes();
    if (scroller) scroller.scrollTop = top;
    if (focusNotes) { var t = root.querySelector('.ad-notes'); t.focus({ preventScroll: true }); t.setSelectionRange(sel[0], sel[1]); }
    if (flash) {
      var c = root.querySelector('[data-ad-card="' + flash + '"]');
      if (c && !reduced()) { c.classList.add('ad-pop'); var s = document.createElement('div'); s.className = 'ad-burst'; s.innerHTML = '<b>' + (/-m$/.test(flash) ? 'DESPERTOU!' : 'AMPLIFICOU!') + '</b>'; c.appendChild(s); setTimeout(function () { s.remove(); }, 1300); }
      flash = null;
    }
  }
  window.renderAwakenDeck = render;

  function onClick(e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var d = b.dataset;
    if (d.adPath) { ui().adPath = d.adPath; saveState(true); render(); return; }
    if (d.adPnv) { state.charSheet.pnv = Math.max(1, Math.min(20, (Number(state.charSheet.pnv) || 1) + Number(d.adPnv))); try { document.querySelectorAll('[data-sheet="pnv"]').forEach(function (el) { el.value = state.charSheet.pnv; }); } catch (x) {} commit(); return; }
    if (d.adBonus) {
      if (!master()) return;
      state.charSheet.progress = state.charSheet.progress || {};
      state.charSheet.progress.awakeningBonus = Math.max(0, Math.min(20, (Number(state.charSheet.progress.awakeningBonus) || 0) + Number(d.adBonus)));
      commit(); return;
    }
    if (d.adBuy) {
      var k = d.adBuy, p = prog(); if (!p) return;
      var it = p[k], s = src(k);
      if (d.adAmp != null) {
        var i = Number(d.adAmp);
        if (it.amplificacoes[i]) { it.amplificacoes[i] = false; toast('Amplificação removida. 1 ponto devolvido.'); }
        else { var la = lockAmp(k, i); if (la) { toast(la); return; } it.amplificacoes[i] = true; flash = k + '-' + i; sfx('confirm'); toast((s.amplificacoes[i] || {}).nome + ' adquirida.'); }
      } else {
        if (it.owned) { var r = 1 + it.amplificacoes.filter(Boolean).length; it.owned = false; it.amplificacoes = [false, false]; toast(r + ' ponto' + (r > 1 ? 's devolvidos' : ' devolvido') + '. Despertar removido.'); }
        else { var lm = lockMain(k); if (lm) { toast(lm); return; } it.owned = true; flash = k + '-m'; sfx('rankup'); toast(s.habilidade.nome + ' despertou!'); }
      }
      commit();
    }
  }
  function onChange(e) {
    var t = e.target, k = t.dataset.ad; if (!k) return;
    if (k === 'arcana') { setArcanaSelection(t.value); return; }
    if (k === 'social') { var a = A(), spec = a && arcanaSocialSpec(a); if (!spec || !spec.choice) return; ensureArcanaSocialState()[a.romano] = spec.choice.skills.indexOf(t.value) >= 0 ? t.value : ''; commit(); return; }
    if (k === 'resolution') { if (!master()) { render(); return; } state.charSheet.progress = state.charSheet.progress || {}; state.charSheet.progress.resolutionOverride = !!t.checked; commit(); return; }
    if (k === 'dis') { var r = setCharacterDissonant(t.value); if (r && !r.ok) { toast(r.error); render(); return; } commit(); return; }
    if (k === 'dis2') { var pf = state.charSheet.profile; if (pf.dissonantArcana !== 'XI' || t.value === 'XI') return; pf.dissonantArcanaExtra = t.value; commit(); return; }
  }
  var nt = 0;
  function onInput(e) {
    var t = e.target; if (t.dataset.ad !== 'notes') return;
    state.charSheet.persona = state.charSheet.persona || {}; state.charSheet.persona.amplifications = t.value;
    clearTimeout(nt); nt = setTimeout(function () {
      document.querySelectorAll('[data-sheet="persona.amplifications"]').forEach(function (el) { el.value = t.value; });
      saveState(true);
    }, 250);
  }

  function wrap(name) {
    var o = window[name]; if (typeof o !== 'function' || o.__ad) return;
    var w = function () { var r = o.apply(this, arguments); try { render(); } catch (e) { console.error(e); } return r; };
    w.__ad = true; window[name] = w;
  }
  function init() {
    if (typeof renderArcanaArchive !== 'function' || typeof state === 'undefined' || !state.charSheet || !document.getElementById('sheet-panel-awakening')) { setTimeout(init, 200); return; }
    document.body.classList.add('ad-on');
    wrap('renderArcanaArchive');
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

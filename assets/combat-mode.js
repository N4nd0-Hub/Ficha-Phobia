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
    vantagem: { t: 'VANTAGEM!', s: 'A primeira Magia do combate é de graça', c: '#ef2b97', k: 'good', state: 'vantagem' },
    cercado: { t: 'CERCADO!', s: 'Desvantagem nos seus Ataques · Magias e efeitos custam +50%', c: '#7a1cff', k: 'bad', state: 'cercado' },
    emboscada: { t: 'EMBOSCADA!', s: 'Vantagem em testes de Ataque', c: '#ffd84d', k: 'good', state: 'emboscada' },
    critico: { t: 'CRÍTICO!', s: '+1 Ataque adicional nesta Rodada', c: '#ff4d6a', k: 'good', hidden: true },
    fraqueza: { t: 'FRAQUEZA!', s: 'Acertou o ponto fraco', c: '#6ce6ff', k: 'good' },
    allout: { t: 'ALL-OUT ATTACK!', s: 'Todos juntos, agora!', c: '#ff2a2a', k: 'good' },
    vitoria: { t: 'VITÓRIA!', s: 'Combate encerrado', c: '#ffd84d', k: 'good' }
  };
  var STATUS_TXT = { vantagem: ['VANTAGEM', ''], cercado: ['CERCADO', 'Desvantagem nos seus Ataques · custos +50%'], emboscada: ['EMBOSCADA', 'Vantagem nos seus Ataques'] };
  var ACTIONS = [['standardSpent', 'Padrão'], ['quickSpent', 'Rápida'], ['reactionSpent', 'Reação'], ['interruptSpent', 'Interromper']];
  var REACT_ORDER = { Fraqueza: 0, Resiste: 1, Anula: 2, Drena: 3, Reflete: 4 };
  function reactName(r) { try { return PERSONA_REACTION_LABEL[r] || r; } catch (e) { return r; } }

  /* ---------- mecânica musical ---------- */
  var INST = [
    { k: 'Guitarra', fam: 'Cordas', ic: '🎸' }, { k: 'Baixo', fam: 'Cordas', ic: '' }, { k: 'Bateria', fam: 'Percussão', ic: '' },
    { k: 'Vocal', fam: 'Vocal', ic: '' }, { k: 'Teclas', fam: 'Teclas & Eletrônicos', ic: '' },
    { k: 'Cordas Friccionadas', fam: 'Cordas Friccionadas', ic: '' }, { k: 'Sopro', fam: 'Sopro', ic: '' }
  ];
  var FAM_COLOR = { 'Cordas': '#ef2b97', 'Percussão': '#ffd84d', 'Vocal': '#6ce6ff', 'Teclas & Eletrônicos': '#96ff45', 'Cordas Friccionadas': '#c8aaff', 'Sopro': '#ff9a52', 'Eletrônico': '#96ff45' };
  var COMBOS = [
    { n: 'Four on the Floor', seq: ['Bateria', 'Bateria', 'Bateria', 'Bateria'], fx: ['O alvo da última Execução fica automaticamente [Derrubado].', 'Contra alvos [Tirânicos ou Superiores], possui 50% de chance de [Derrubado].'] },
    { n: 'Wall of Sound', seq: ['Guitarra', 'Guitarra', 'Guitarra', 'Guitarra'], fx: ['O alvo recebe [Atordoado].', 'Caso já esteja [Atordoado], fica automaticamente [Derrubado].'] },
    { n: 'Sing Along!', seq: ['Vocal', 'Vocal', 'Vocal', 'Vocal'], fx: ['Todos os aliados podem remover [Medo, Desespero ou Charme].', 'Caso não possuam nenhuma dessas Condições, recebem [Vantagem] em seu próximo Teste.'] },
    { n: 'Bass Drop', seq: ['Baixo', 'Bateria', 'Baixo', 'Bateria'], fx: ['A última Execução recebe (+2 Dados de Dano).', 'O alvo possui 50% de chance de [Derrubado]. Com uma [Condição Negativa], a chance se torna 100%.'] },
    { n: 'We Will Rock You', seq: ['Bateria', 'Bateria', 'Vocal', 'Bateria'], fx: ['Todos os aliados recebem (+5 de Acerto Instrumental) até o final da próxima Rodada.'] },
    { n: 'Call & Response', seq: ['Guitarra', 'Vocal', 'Guitarra', 'Vocal'], fx: ['O responsável pela última Execução recebe uma [Ação Rápida] adicional, utilizável apenas em uma [Técnica Instrumental].', 'Pode ser ativado apenas 1 vez por Rodada.'] },
    { n: 'Power Ballad', seq: ['Vocal', 'Guitarra', 'Vocal', 'Guitarra'], fx: ['O aliado com menor [PV Atual] recupera [10% do PV Máximo].', 'A última Execução recebe (+1 de Margem Crítica).'] },
    { n: 'Digital Love', seq: ['Teclas', 'Vocal', 'Teclas', 'Vocal'], fx: ['A próxima [Magia] utilizada pela Party recebe (+1 QD) de Dano ou Cura.'] },
    { n: 'String Theory', seq: ['Cordas Friccionadas', 'Cordas Friccionadas', 'Cordas Friccionadas', 'Cordas Friccionadas'], fx: ['Escolha [1 Buff, Debuff ou Condição] ativo no alvo da última Execução.', 'Sua duração aumenta em (+1 Rodada).'] },
    { n: 'Brass Riot', seq: ['Sopro', 'Sopro', 'Sopro', 'Sopro'], fx: ['O alvo recebe [-5 de Acerto].', 'Não poderá realizar [Reações] até o final de sua próxima Rodada.'] },
    { n: 'Melancholia', seq: ['Vocal', 'Cordas Friccionadas', 'Vocal', 'Cordas Friccionadas'], fx: ['O alvo possui 50% de chance de receber [Medo].', 'Caso já esteja sob [Medo], torna-se [Desespero].'] },
    { n: 'Overdrive', seq: ['Teclas', 'Guitarra', 'Guitarra', 'Bateria'], fx: ['A última Execução recebe (+2 Dados de Dano).', 'A próxima [Técnica Instrumental] de qualquer aliado custa 50% menos PM.'] },
    { n: 'Teen Spirit', seq: ['Guitarra', 'Baixo', 'Bateria', 'Vocal'], fx: ['Todos que participaram do Sound Combo recebem (+2 de Margem Crítica) em sua próxima [Ofensiva Instrumental].'] },
    { n: 'Perfect Harmony', seq: ['4 Famílias diferentes'], any: true, fx: ['Todos os integrantes da Party recuperam [10% do PV Máximo] e [10% do PM Máximo].', 'Pode ser ativado apenas 1 vez por Combate.'] }
  ];
  var BD_TIERS = [
    { min: 10, n: 'BREAK THE LIMIT!', c: '#fff27a', fx: ['[40% do PV Máximo] como Dano Onipotente.', 'Fica automaticamente [Derrubado].', 'Remove todos os seus [Buffs].', 'Não poderá utilizar [Reações] durante 1 Rodada.', '[Reações Elementais] reduzidas em 1 Categoria durante 2 Rodadas.'] },
    { min: 8, n: 'OVERDRIVE', c: '#ff4d6a', fx: ['[30% do PV Máximo] como Dano Onipotente.', 'Fica automaticamente [Derrubado].', 'Remove todos os seus [Buffs].', '[Reações Elementais] reduzidas em 1 Categoria até o final da próxima Rodada.'] },
    { min: 6, n: 'FULL VOLUME', c: '#ef2b97', fx: ['[20% do PV Máximo] como Dano Onipotente.', 'Fica automaticamente [Derrubado].', 'Não poderá realizar [Reações] até o final da próxima Rodada.'] },
    { min: 4, n: 'GOOD PERFORMANCE', c: '#6ce6ff', fx: ['[10% do PV Máximo] como Dano Onipotente.', 'Fica automaticamente [Derrubado].'] }
  ];
  function instByKey(k) { return INST.filter(function (i) { return i.k === k; })[0] || { k: k, fam: k }; }
  function tokenMatch(token, ex) {
    if (token === 'Bateria') return ex.k === 'Bateria' || ex.fam === 'Percussão';
    if (token === 'Teclas') return ex.fam === 'Teclas & Eletrônicos';
    if (token === 'Guitarra' || token === 'Baixo') return ex.k === token;
    var i = INST.filter(function (x) { return x.k === token; })[0];
    if (i) return ex.fam === i.fam;
    return ex.k === token || ex.fam === token;          /* família escrita no Compasso */
  }
  function mus() {
    var u = ui(); u.music = u.music || {};
    var m = u.music; m.compasso = m.compasso || []; m.seq = m.seq || []; m.ruptures = m.ruptures || 0; m.mission = m.mission || 0; m.harmonyUsed = !!m.harmonyUsed;
    m.bd = m.bd || { active: false, round: 0, etapas: 0 }; m.log = m.log || [];
    return m;
  }
  function findCombo(seq) {
    if (seq.length < 4) return null;
    var last = seq.slice(-4);
    for (var i = 0; i < COMBOS.length; i++) {
      var c = COMBOS[i]; if (c.any) continue;
      if (c.seq.every(function (t, j) { return tokenMatch(t, last[j]); })) return c;
    }
    var fams = {}; last.forEach(function (x) { fams[x.fam] = 1; });
    if (Object.keys(fams).length === 4 && !mus().harmonyUsed) return COMBOS[COMBOS.length - 1];
    return null;
  }
  function bdTier(n) { for (var i = 0; i < BD_TIERS.length; i++) if (n >= BD_TIERS[i].min) return BD_TIERS[i]; return null; }
  function addExec(k) {
    var m = mus(), ex = instByKey(k), msgs = [];
    /* Compasso: se for a próxima exigência, é Etapa Perfeita */
    var next = m.compasso.filter(function (st) { return !st.done; })[0];
    var perfect = !!(next && tokenMatch(next.need, ex));
    if (perfect) {
      next.done = true;
      if (m.bd.active) m.bd.etapas++; else m.mission++;
      msgs.push('perfect');
      if (m.compasso.every(function (st) { return st.done; })) { m.ruptures++; msgs.push('rupture'); m.compasso.forEach(function (st) { st.done = false; }); }
    }
    m.seq.push({ k: ex.k, fam: ex.fam, p: perfect });
    var combo = findCombo(m.seq);
    if (combo) { if (combo.any) m.harmonyUsed = true; m.seq = []; m.lastCombo = combo.n; msgs.push('combo'); }
    else if (m.seq.length > 4) m.seq = m.seq.slice(-4);
    save(); render();
    if (msgs.indexOf('rupture') >= 0) splash({ t: 'RUPTURA!', s: 'Ruptura de Ressonância · nº ' + m.ruptures, c: '#ff4d6a', k: 'good' });
    else if (combo) splash({ t: 'SOUND COMBO!', s: combo.n, c: '#ffd84d', k: 'good' });
    else if (perfect) banner('ETAPA PERFEITA ★');
    if (combo && msgs.indexOf('rupture') >= 0) setTimeout(function () { splash({ t: 'SOUND COMBO!', s: combo.n, c: '#ffd84d', k: 'good' }); }, 2300);
  }
  function finishBreakdown() {
    var m = mus(), n = m.bd.etapas, t = bdTier(n);
    m.bd = { active: false, round: 0, etapas: 0 }; m.lastBreakdown = { n: n, tier: t ? t.n : 'Sem efeito' };
    save(); render();
    splash(t ? { t: t.n, s: n + ' Etapas no BREAKDOWN!', c: t.c, k: 'good' } : { t: 'FIM DO SHOW', s: n + ' Etapas: menos de 4, sem efeito', c: '#9b93a8', k: 'bad' });
  }
  function chip(k, extra) { var i = instByKey(k); return '<span class="cmm-chip' + (extra || '') + '" style="--fc:' + (FAM_COLOR[i.fam] || '#fff') + '"><b>' + E(i.k) + '</b>' + (i.k !== i.fam ? '<small>' + E(i.fam) + '</small>' : '') + '</span>'; }
  function musicView() {
    var m = mus(), w = weapons()[0], mine = w && (w.it.instrument || w.it.family) || '';
    var mineKey = (INST.filter(function (i) { return mine && new RegExp(i.k, 'i').test(mine); })[0] || INST.filter(function (i) { return w && i.fam === w.it.family; })[0] || {}).k;
    var instBtns = INST.map(function (i) { return '<button type="button" class="cmm-inst' + (i.k === mineKey ? ' mine' : '') + '" data-cmm-exec="' + E(i.k) + '" style="--fc:' + FAM_COLOR[i.fam] + '"><b>' + E(i.k) + '</b><small>' + E(i.k === mineKey ? 'SEU INSTRUMENTO' : i.fam) + '</small></button>'; }).join('');
    var nextIdx = m.compasso.findIndex(function (st) { return !st.done; });
    var steps = m.compasso.map(function (st, i) {
      return '<div class="cmm-step' + (st.done ? ' done' : '') + (i === nextIdx ? ' next' : '') + '" style="--fc:' + (FAM_COLOR[instByKey(st.need).fam] || '#fff') + '"><small>ETAPA ' + (i + 1) + '</small><b>' + E(st.need) + '</b>' + (st.done ? '<i>★</i>' : '') + '<button type="button" data-cmm-delstep="' + i + '" aria-label="Remover etapa">×</button></div>';
    }).join('<span class="cmm-arrow">▸</span>');
    var addStep = '<select data-cmm-addstep aria-label="Adicionar etapa ao Compasso"><option value="">+ Etapa…</option><optgroup label="Instrumento">' + INST.map(function (i) { return '<option>' + E(i.k) + '</option>'; }).join('') + '</optgroup><optgroup label="Família">' + ['Cordas', 'Percussão', 'Vocal', 'Teclas & Eletrônicos', 'Cordas Friccionadas', 'Sopro'].map(function (f) { return '<option value="' + E(f) + '">Família: ' + E(f) + '</option>'; }).join('') + '</optgroup></select>';
    var seq = []; for (var i = 0; i < 4; i++) seq.push(m.seq[i] ? chip(m.seq[i].k, m.seq[i].p ? ' perfect' : '') : '<span class="cmm-chip empty">—</span>');
    /* combos que ainda podem sair com a sequência atual */
    var possible = COMBOS.filter(function (c) { if (c.any) return !m.harmonyUsed; return m.seq.every(function (ex, j) { var off = 0; return tokenMatch(c.seq[j + off], ex); }); }).map(function (c) { return c.n; });
    var comboList = COMBOS.map(function (c) {
      var on = possible.indexOf(c.n) >= 0 && m.seq.length > 0, last = m.lastCombo === c.n;
      return '<article class="cmm-combo' + (on ? ' live' : '') + (last ? ' last' : '') + (c.any && m.harmonyUsed ? ' used' : '') + '"><header><b>' + E(c.n) + '</b>' + (last ? '<em>ÚLTIMO</em>' : on ? '<em class="g">POSSÍVEL</em>' : c.any && m.harmonyUsed ? '<em>USADO</em>' : '') + '</header>' +
        '<div class="cmm-seq">' + (c.any ? '<span class="cmm-chip rainbow"><b>4 Famílias diferentes</b></span>' : c.seq.map(function (t) { return chip(t); }).join('<i>▸</i>')) + '</div>' +
        '<ul>' + c.fx.map(function (f) { return '<li>' + rich(f) + '</li>'; }).join('') + '</ul></article>';
    }).join('');
    var bd = m.bd, pct = Math.min(100, m.mission / 15 * 100), tier = bdTier(bd.etapas);
    var bdHTML = bd.active ?
      '<div class="cmm-bd live"><header><b>BREAKDOWN!</b><span>RODADA ' + Math.max(1, bd.round) + ' / 3</span></header>' +
        '<div class="cmm-bd-count"><button type="button" data-cmm-bdstep="-1">−</button><b>' + bd.etapas + '</b><button type="button" data-cmm-bdstep="1">+</button><small>ETAPAS NA PERFORMANCE</small></div>' +
        '<div class="cmm-tiers">' + BD_TIERS.slice().reverse().map(function (t) { return '<span class="' + (tier && tier.n === t.n ? 'on' : '') + '" style="--fc:' + t.c + '"><b>' + t.n + '</b><small>' + t.min + (t.min === 10 ? '+' : '–' + (t.min + 1)) + '</small></span>'; }).join('') + '</div>' +
        '<button type="button" class="cmm-bd-end" data-cmm-bdend>ENCERRAR BREAKDOWN! ▸</button></div>'
      : '<div class="cmm-bd"><header><b>BREAKDOWN!</b><span>' + m.mission + ' / 15 ETAPAS PERFEITAS NA MISSÃO</span></header>' +
        '<div class="cmm-meter"><i style="width:' + pct.toFixed(1) + '%"></i>' + Array(15).join('<s></s>') + '</div>' +
        '<div class="cmm-bd-row"><button type="button" data-cmm-mission="-1">−1</button><button type="button" data-cmm-mission="1">+1</button>' +
        '<button type="button" class="cmm-bd-go" data-cmm-bdstart ' + (m.mission >= 15 ? '' : 'disabled') + '>INICIAR BREAKDOWN!</button></div>' +
        (m.lastBreakdown ? '<p class="cmm-last">Último: <b>' + E(m.lastBreakdown.tier) + '</b> com ' + m.lastBreakdown.n + ' Etapas</p>' : '') + '</div>';
    return '<div class="cmm">' +
      '<section class="cmm-panel exec"><h3 class="cm-h">EXECUÇÃO INSTRUMENTAL</h3><p class="cmm-help">Toque no instrumento de cada Execução <b>bem-sucedida</b> da Party. A ficha confere o Compasso e os Sound Combos sozinha.</p><div class="cmm-insts">' + instBtns + '</div></section>' +
      '<section class="cmm-panel compasso"><h3 class="cm-h">COMPASSO COGNITIVO <span>RUPTURAS · ' + m.ruptures + '</span></h3>' +
        '<div class="cmm-steps">' + (steps || '<p class="cm-empty">Monte a sequência da Sombra conforme for descobrindo as Etapas.</p>') + '</div>' +
        '<div class="cmm-row">' + addStep + '<button type="button" data-cmm-manual ' + (nextIdx < 0 ? 'disabled' : '') + '>★ Marcar Etapa Perfeita</button><button type="button" data-cmm-resetc>Reiniciar</button><button type="button" data-cmm-clearc>Limpar</button><button type="button" data-cmm-rupt="-1">− Ruptura</button></div></section>' +
      '<section class="cmm-panel combo"><h3 class="cm-h">SOUND COMBO <span>ÚLTIMAS 4 EXECUÇÕES</span></h3>' +
        '<div class="cmm-queue">' + seq.join('<i>▸</i>') + '</div>' +
        '<div class="cmm-row"><button type="button" data-cmm-undo ' + (m.seq.length ? '' : 'disabled') + '>↶ Desfazer última</button><button type="button" data-cmm-clearseq>Limpar sequência</button>' + (m.harmonyUsed ? '<button type="button" data-cmm-harmony>Liberar Perfect Harmony</button>' : '') + '</div></section>' +
      '<section class="cmm-panel bdp">' + bdHTML + '</section>' +
      '<section class="cmm-panel list"><h3 class="cm-h">LISTINHA DE COMBOS <span>' + COMBOS.length + '</span></h3><div class="cmm-combos">' + comboList + '</div></section>' +
    '</div>';
  }
  function musicClick(t) {
    var m = mus();
    if (t.dataset.cmmExec) { addExec(t.dataset.cmmExec); return true; }
    if (t.dataset.cmmDelstep) { m.compasso.splice(+t.dataset.cmmDelstep, 1); save(); render(); return true; }
    if (t.hasAttribute('data-cmm-manual')) {
      var nx = m.compasso.filter(function (st) { return !st.done; })[0]; if (!nx) return true;
      nx.done = true; if (m.bd.active) m.bd.etapas++; else m.mission++;
      if (m.compasso.every(function (st) { return st.done; })) { m.ruptures++; m.compasso.forEach(function (st) { st.done = false; }); save(); render(); splash({ t: 'RUPTURA!', s: 'Ruptura de Ressonância · nº ' + m.ruptures, c: '#ff4d6a', k: 'good' }); return true; }
      save(); render(); banner('ETAPA PERFEITA ★'); return true;
    }
    if (t.hasAttribute('data-cmm-resetc')) { m.compasso.forEach(function (st) { st.done = false; }); save(); render(); return true; }
    if (t.hasAttribute('data-cmm-clearc')) { m.compasso = []; save(); render(); return true; }
    if (t.dataset.cmmRupt) { m.ruptures = Math.max(0, m.ruptures + Number(t.dataset.cmmRupt)); save(); render(); return true; }
    if (t.hasAttribute('data-cmm-undo')) { m.seq.pop(); save(); render(); return true; }
    if (t.hasAttribute('data-cmm-clearseq')) { m.seq = []; m.lastCombo = ''; save(); render(); return true; }
    if (t.hasAttribute('data-cmm-harmony')) { m.harmonyUsed = false; save(); render(); return true; }
    if (t.dataset.cmmMission) { m.mission = Math.max(0, m.mission + Number(t.dataset.cmmMission)); save(); render(); return true; }
    if (t.hasAttribute('data-cmm-bdstart')) { m.mission = Math.max(0, m.mission - 15); m.bd = { active: true, round: 1, etapas: 0 }; save(); render(); splash({ t: 'BREAKDOWN!', s: '3 Rodadas de performance', c: '#ff2a8a', k: 'good' }); return true; }
    if (t.dataset.cmmBdstep) { m.bd.etapas = Math.max(0, m.bd.etapas + Number(t.dataset.cmmBdstep)); save(); render(); return true; }
    if (t.hasAttribute('data-cmm-bdend')) { finishBreakdown(); return true; }
    return false;
  }

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
        if (it) out.push({ slot: i ? 'INSTRUMENTO RESERVA' : 'INSTRUMENTO PRINCIPAL', it: it });
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
    root.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-cmm-addstep]'); if (!sel || !sel.value) return;
      mus().compasso.push({ need: sel.value, done: false }); save(); render();
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches('.cm-amount')) { e.preventDefault(); var b = e.target.closest('.cm-res').querySelector('[data-cm-apply="-1"]'); if (b) b.click(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden && !document.querySelector('.cm-splash')) close(); });
  }
  function sideButton() {
    var nav = document.querySelector('#characterPage .sheet-page-tabs'); if (!nav || document.getElementById('cmEnter')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'cmEnter'; b.className = 'cm-enter';
    b.title = 'Abrir o Modo de Combate';
    b.innerHTML = '<i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l10 10M4 4h4M4 4v4M13 16l3 3M16 13l3 3M14.5 17.5l3-3M20 4L10 14M20 4h-4M20 4v4M11 16l-3 3M8 13l-3 3M9.5 17.5l-3-3"/></svg></i>' +
      '<span><small>Entrar em</small><b>COMBATE</b></span><em aria-hidden="true">▶</em>';
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
    var critNow = u.critRound === u.round;
    var acts = (critNow ? '<button type="button" class="cm-act crit' + (u.critUsed ? ' used' : '') + '" data-cm-critatk aria-pressed="' + !!u.critUsed + '"><i></i>ATAQUE EXTRA · CRÍTICO</button>' : '') + ACTIONS.map(function (a) { var used = !!(s.actions && s.actions[a[0]]); return '<button type="button" class="cm-act' + (used ? ' used' : '') + '" data-cm-action="' + a[0] + '" aria-pressed="' + used + '"><i></i>' + a[1] + '</button>'; }).join('');
    var derived = c ? [['REAÇÃO', c.reaction], ['MOVIMENTO', c.movement + ' m'], ['CRÍTICO', c.critStart >= 20 ? '20' : c.critStart + '–20'], ['FUGA', c.escape], ['ESQUIVA EQP', (mods && mods.dodge ? (mods.dodge > 0 ? '+' : '') + mods.dodge : '—')]] : [];
    var attrs = c ? ['FOR', 'MAG', 'TEC', 'AGI', 'VIT', 'SOR'].map(function (k) { return '<span><small>' + k + '</small><b>' + c[k] + '</b></span>'; }).join('') : '';
    var aff = (s.persona && s.persona.affinities || []).map(function (a) { return { type: a.type, reaction: reactName(a.reaction) }; }).filter(function (a) { return a.reaction && a.reaction !== 'Normal'; }).sort(function (a, b) { return (REACT_ORDER[a.reaction] == null ? 9 : REACT_ORDER[a.reaction]) - (REACT_ORDER[b.reaction] == null ? 9 : REACT_ORDER[b.reaction]); });
    var mu = s.music || {};
    var maff = (mu.familyAffinities || []).map(function (a) { return { type: a.type, reaction: reactName(a.reaction || 'Normal') }; });
    var spec = mu.specificWeaknessInstrument || mu.specificWeaknessFamily;
    var col1 =
      '<div class="cm-me">' +
        '<div class="cm-photo">' + (/^data:image|^https?:/.test(photo) ? '<img src="' + E(photo) + '" alt="">' : '<span>' + E(name.slice(0, 1).toUpperCase()) + '</span>') + '</div>' +
        '<div class="cm-me-name"><small>' + (st === 'cercado' ? 'CERCADO // EM PERIGO' : st === 'vantagem' ? 'COM VANTAGEM' : st === 'emboscada' ? 'EMBOSCADA // ATAQUE COM VANTAGEM' : 'EM COMBATE') + '</small><b>' + E(name) + '</b></div>' +
      '</div>' +
      bar('pv', r.pv, r.pvMax, r.pvTemp) + bar('pm', r.pm, r.pmMax, r.pmTemp) +
      '<div class="cm-box"><h4>AÇÕES DA RODADA</h4><div class="cm-acts">' + acts + '</div></div>' +
      '<div class="cm-box"><h4>ATRIBUTOS</h4><div class="cm-attrs">' + attrs + '</div>' +
        '<div class="cm-derived">' + derived.map(function (d) { return '<span><small>' + d[0] + '</small><b>' + E(d[1]) + '</b></span>'; }).join('') + '</div></div>' +
      (maff.length ? '<div class="cm-box"><h4>AFINIDADE MUSICAL</h4><div class="cm-maff">' + maff.map(function (a) { return '<span class="r-' + E(String(a.reaction).toLowerCase()) + '" style="--fc:' + (FAM_COLOR[a.type] || '#fff') + '"><b>' + E(a.type) + '</b><small>' + E(a.reaction) + '</small></span>'; }).join('') + '</div>' +
        (spec ? '<p class="cm-spec"><b>FRAQUEZA ESPECÍFICA</b> ' + E([mu.specificWeaknessInstrument, mu.specificWeaknessFamily].filter(Boolean).join(' · ')) + '</p>' : '') + '</div>' : '') +
      (aff.length ? '<div class="cm-box"><h4>AFINIDADES ELEMENTAIS</h4><div class="cm-aff">' + aff.map(function (a) { return '<span class="r-' + E(String(a.reaction).toLowerCase()) + '"><small>' + E(a.reaction) + '</small>' + E(a.type) + '</span>'; }).join('') + '</div></div>' : '');
    /* coluna 2: ataques */
    var ws = weapons();
    var wHTML = ws.map(function (w, i) {
      var it = w.it, abil = [it.ability1, it.ability2, it.ability3].filter(function (x) { return String(x || '').trim(); });
      var abHTML = abil.map(function (a, k) {
        var sk = window.PhobiaInstrumentSkills && PhobiaInstrumentSkills.find(a);
        var nm = sk ? sk.name : String(a).split('\n')[0].slice(0, 60);
        var body = sk ? PhobiaInstrumentSkills.card(sk, { compact: true }) : '<p>' + rich(a) + '</p>';
        return skillRow('w' + i + 'a' + k, 'HABILIDADE ' + (k + 1) + (sk ? ' · ' + sk.cat.name.toUpperCase() : ''), nm, body, sk ? sk.cat.color : null, sk && sk.cost ? costTag(sk.cost) : '');
      }).join('');
      return '<div class="cm-weapon' + (i ? ' sec' : '') + '"><header><small>' + (i ? 'TROCA · ' : '') + w.slot + (it.family ? ' · ' + E(it.family).toUpperCase() : '') + (it.instrument ? ' · ' + E(it.instrument).toUpperCase() : '') + '</small><b>' + E(it.name) + '</b>' + (i ? '' : '<em class="cm-basic-tag">ATAQUE BÁSICO</em>') + '</header>' +
        '<div class="cm-wstats"><span><small>ACERTO</small><b>' + E(it.accuracy || '—') + '</b></span><span><small>DANO</small><b>' + E(it.damage || '—') + '</b></span><span><small>ALCANCE</small><b>' + E(it.range || '—') + '</b></span><span><small>HAB</small><b>' + E(it.hab || '—') + '</b></span></div>' +
        (it.properties ? '<p class="cm-props">' + rich(it.properties) + '</p>' : '') +
        (abHTML ? '<div class="cm-sks">' + abHTML + '</div>' : '') + '</div>';
    }).join('');
    var col2 = '<h3 class="cm-h">ATAQUE BÁSICO <span>SEU INSTRUMENTO</span></h3>' + (wHTML || '<p class="cm-empty">Nenhum instrumento equipado. Seu Ataque Básico é feito com o Instrumento: equipe um na aba Equipamentos.</p>');
    /* coluna 3: magias e habilidades */
    var sp = spells();
    var spHTML = sp.map(function (m, i) {
      var pm = String(m.cost).match(/(\d+)\s*PM/i), cerc = u.status === 'cercado';
      var pmc = pm ? (cerc ? Math.ceil(Number(pm[1]) * 1.5) : Number(pm[1])) : 0;
      var pvp = String(m.cost).match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:do\s+)?PV/i), pvf = !pvp && String(m.cost).match(/(\d+)\s*PV/i);
      var pv = pvp ? Math.max(1, Math.ceil(r.pvMax * Number(pvp[1].replace(',', '.')) / 100)) : pvf ? Number(pvf[1]) : 0;
      var pvBase = pv; if (cerc && pv) pv = Math.ceil(pv * 1.5);
      var extra = '<em class="cm-cost' + (pv ? ' hp' : '') + (cerc && (pm || pv) ? ' up' : '') + '">' + (cerc && pm ? '<s>' + pm[1] + '</s> ' + pmc + ' PM' : cerc && pv ? '<s>' + pvBase + '</s> ' + pv + ' PV' : E(m.cost || '—') + (pvp ? ' · ' + pv + ' PV' : '')) + '</em>';
      var body = (m.target ? '<p class="cm-meta">ALVO · ' + E(m.target) + ' · TIER ' + E(m.tier || '') + '</p>' : '') + '<p>' + rich(m.effect) + '</p>' + (m.desc ? '<p class="cm-desc">' + rich(m.desc) + '</p>' : '') +
        (u.freeSpell && (pm || pv) ? '<button type="button" class="cm-cast free" data-cm-free data-cm-spell="' + E(m.name) + '">' + (pv ? 'USAR' : 'CONJURAR') + ' · GRÁTIS <small>(VANTAGEM)</small></button>' :
         pm ? '<button type="button" class="cm-cast" data-cm-cast="' + pmc + '" data-cm-spell="' + E(m.name) + '">CONJURAR · −' + pmc + ' PM' + (cerc ? ' <small>(CERCADO +50%)</small>' : '') + '</button>' :
         pv ? '<button type="button" class="cm-cast hp" data-cm-castpv="' + pv + '" data-cm-spell="' + E(m.name) + '">USAR · −' + pv + ' PV' + (cerc ? ' <small>(CERCADO +50%)</small>' : pvp ? ' <small>(' + E(pvp[1]) + '% de ' + r.pvMax + ')</small>' : '') + '</button>' : '');
      return skillRow('m' + i + m.name, (m.cat || 'MAGIA').toUpperCase() + ' · TIER ' + (m.tier || ''), m.name, body, m.color, extra);
    }).join('');
    var pers = personalSkills().map(function (h, i) { return skillRow('p' + i, h.src, h.name, '<p>' + rich(h.text) + '</p>', '#ffd84d'); }).join('');
    var ar = arcanaSkills();
    var arHTML = ar.list.map(function (h, i) { return skillRow('a' + i + h.name, h.src, h.name, '<p>' + rich(h.text) + '</p>', '#c8aaff'); }).join('');
    var col3 =
      '<h3 class="cm-h">MAGIAS <span>' + sp.length + '</span></h3><div class="cm-sks">' + (spHTML || '<p class="cm-empty">Deck de magias vazio.</p>') + '</div>' +
      '<h3 class="cm-h">HABILIDADES</h3><div class="cm-sks">' + (pers || '<p class="cm-empty">Sem Habilidade de Combate ou Natural registrada.</p>') + '</div>' +
      '<h3 class="cm-h">ARCANA' + (ar.arcana ? ' <span>' + E(ar.arcana.romano + ' · ' + (ar.arcana.nomeFicha || ar.arcana.nome)) + '</span>' : '') + '</h3><div class="cm-sks">' + (arHTML || '<p class="cm-empty">Nenhuma Arcana escolhida.</p>') + '</div>';
    var splashBtns = Object.keys(SPLASH).filter(function (k) { return !SPLASH[k].hidden; }).map(function (k) { var o = SPLASH[k]; return '<button type="button" class="cm-fx ' + o.k + '" data-cm-splash="' + k + '" style="--fc:' + o.c + '">' + o.t + '</button>'; }).join('');
    var scroll = root.querySelector('.cm-grid'); var keep = scroll ? [].map.call(root.querySelectorAll('.cm-col'), function (x) { return x.scrollTop; }) : null;
    root.dataset.status = st;
    root.innerHTML =
      '<div class="cm-bg" aria-hidden="true"><i></i><i></i></div>' +
      '<header class="cm-top">' +
        '<div class="cm-title"><small>PERSONA // PHOBIA</small><b>MODO DE <span>COMBATE</span></b></div>' +
        '<div class="cm-round"><button type="button" data-cm-round="-1" aria-label="Rodada anterior">−</button><span><small>RODADA</small><b>' + u.round + '</b></span><button type="button" data-cm-round="1" aria-label="Próxima rodada">+</button>' +
          '<button type="button" class="cm-next" data-cm-next>NOVA RODADA ▸</button></div>' +
        '<div class="cm-status st-' + st + '"><small>SITUAÇÃO</small><b>' + (STATUS_TXT[st] ? STATUS_TXT[st][0] : 'NEUTRO') + '</b>' + (STATUS_TXT[st] ? '<em>' + (st === 'vantagem' ? (u.freeSpell ? 'Próxima Magia grátis' : 'Magia grátis já usada') : STATUS_TXT[st][1]) + '</em>' : '') + (st !== 'neutro' ? '<button type="button" data-cm-neutral title="Voltar ao neutro">×</button>' : '') + '</div>' +
        '<button type="button" class="cm-exit" data-cm-exit>SAIR DO COMBATE ✕</button>' +
      '</header>' +
      '<nav class="cm-fxbar" aria-label="Animações de combate"><span class="cm-views"><button type="button" data-cm-view="batalha" class="' + (u.view !== 'musica' ? 'on' : '') + '">⚔ BATALHA</button><button type="button" data-cm-view="musica" class="' + (u.view === 'musica' ? 'on' : '') + '">♫ PALCO MUSICAL' + (mus().bd.active ? ' <i>BREAKDOWN!</i>' : '') + '</button></span>' + splashBtns + '</nav>' +
      (u.view === 'musica' ? '<div class="cm-grid cm-musicgrid"><div class="cm-col">' + musicView() + '</div></div>' :
      '<div class="cm-grid"><div class="cm-col c1">' + col1 + '</div><div class="cm-col c2">' + col2 + '</div><div class="cm-col c3">' + col3 + '</div></div>');
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
    if (t.dataset.cmView) { ui().view = t.dataset.cmView; save(); render(); return; }
    if (musicClick(t)) return;
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
    if (t.hasAttribute('data-cm-next')) { var u2 = ui(); u2.round++;
      var mm = mus(); if (mm.bd.active) { if (mm.bd.round >= 3) { finishBreakdown(); } else mm.bd.round++; } ACTIONS.forEach(function (a) { S().actions[a[0]] = false; }); save(); syncSheet(); render(); banner('RODADA ' + u2.round); return; }
    if (t.dataset.cmToggle) { var o = ui().open; o[t.dataset.cmToggle] = !o[t.dataset.cmToggle]; save(); render(); return; }
    if (t.dataset.cmCast) {
      var cost = Number(t.dataset.cmCast), rr = res();
      if (rr.pm + rr.pmTemp < cost) { banner('PM INSUFICIENTE', true); return; }
      ui().spellCast = true; changeRes('pm', -cost); banner(String(t.dataset.cmSpell).toUpperCase() + '!'); return;
    }
    if (t.dataset.cmCastpv) {
      var hp = Number(t.dataset.cmCastpv), r2 = res();
      if (r2.pv + r2.pvTemp <= hp) { banner('PV INSUFICIENTE', true); return; }
      ui().spellCast = true; changeRes('pv', -hp); banner(String(t.dataset.cmSpell).toUpperCase() + '!'); return;
    }
    if (t.hasAttribute('data-cm-free')) { var uf = ui(); uf.freeSpell = false; uf.spellCast = true; save(); render(); banner(String(t.dataset.cmSpell).toUpperCase() + ' · GRÁTIS!'); return; }
    if (t.hasAttribute('data-cm-critatk')) { var uc = ui(); uc.critUsed = !uc.critUsed; save(); render(); return; }
    if (t.dataset.cmSplash) { effect(t.dataset.cmSplash); return; }
    if (t.hasAttribute('data-cm-neutral')) { ui().status = 'neutro'; save(); render(); return; }
    if (t.hasAttribute('data-cm-exit')) { close(); }
  }

  /* ---------- efeitos dos botões ---------- */
  function weaponDamage() {
    var w = weapons()[0]; if (!w || !w.it.damage) return '';
    var d = String(w.it.damage);
    try { var a = calc(), p = window.PhobiaFormulas && PhobiaFormulas.parse(d, { FOR: a.FOR, MAG: a.MAG, TEC: a.TEC, AGI: a.AGI, VIT: a.VIT, SOR: a.SOR }); if (p) d = p.map(function (x) { return x.t != null ? x.t : x.v; }).join(''); } catch (e) {}
    return d;
  }
  function maxOf(expr) {
    var m, re = /([+\-]?)(\d*)d(\d+)|([+\-]?)(\d+)/gi, tot = 0, ok = false;
    String(expr).replace(/\s+/g, '').replace(/^.*?(?=[\dd])/, '');
    while ((m = re.exec(String(expr).replace(/\s+/g, '')))) { ok = true; if (m[3]) tot += (m[1] === '-' ? -1 : 1) * Number(m[2] || 1) * Number(m[3]); else tot += (m[4] === '-' ? -1 : 1) * Number(m[5]); }
    return ok ? tot : null;
  }
  function chance() { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % 100; }
  function effect(k) {
    var u = ui(), o = SPLASH[k];
    if (k === 'vantagem') { u.status = 'vantagem'; u.freeSpell = !u.spellCast; save(); render(); splash(u.freeSpell ? o : { t: o.t, s: 'Uma Magia já foi usada neste combate', c: o.c, k: 'good' }); return; }
    if (k === 'cercado' || k === 'emboscada') { u.status = o.state; save(); render(); splash(o); return; }
    if (k === 'fraqueza') {
      var r = chance(), down = r < 50, dmg = weaponDamage(), mx = dmg ? maxOf(dmg) : null;
      splash({ t: 'FRAQUEZA!', s: (down ? 'DERRUBADO! ' : 'Não derrubou ') + '(' + r + ' de 100)' + (mx != null ? ' · Dano máximo: ' + mx + ' (' + dmg + ')' : ''), c: o.c, k: 'good' });
      if (down) setTimeout(function () { banner('ALVO DERRUBADO'); }, 2300);
      return;
    }
    if (k === 'allout') {
      var dm = weaponDamage(); splash(o);
      if (dm && window.PhobiaDice) setTimeout(function () { PhobiaDice.roll(dm, 'ALL-OUT ATTACK · SEU DANO'); }, 1900);
      else setTimeout(function () { banner('EQUIPE UM INSTRUMENTO PARA ROLAR O DANO', true); }, 1900);
      return;
    }
    if (k === 'vitoria') {
      var s = S(), m = mus();
      u.round = 1; u.status = 'neutro'; u.freeSpell = false; u.spellCast = false; u.critRound = 0; u.critUsed = false;
      ACTIONS.forEach(function (a) { s.actions[a[0]] = false; });
      s.resources.pvTemp = 0; s.resources.pmTemp = 0;
      m.compasso.forEach(function (st) { st.done = false; }); m.seq = []; m.lastCombo = ''; m.harmonyUsed = false; m.ruptures = 0; m.bd = { active: false, round: 0, etapas: 0 };
      save(); syncSheet(); render();
      splash({ t: 'VITÓRIA!', s: 'Rodada, ações, PV/PM temporários e efeitos de combate reiniciados', c: o.c, k: 'good' });
      return;
    }
    splash(o);
  }
  /* crítico no dado (chamado pelo rola dados) */
  function crit() {
    if (!root || root.hidden) return;
    var u = ui(), first = u.critRound !== u.round;
    if (first) { u.critRound = u.round; u.critUsed = false; save(); render(); }
    splash({ t: 'CRÍTICO!', s: first ? '+1 Ataque adicional nesta Rodada' : 'Ataque extra já ganho nesta Rodada', c: '#ff4d6a', k: 'good' });
  }
  function attackMode() { var st = root && !root.hidden ? ui().status : ''; return st === 'emboscada' ? 'vant' : st === 'cercado' ? 'desv' : 'normal'; }
  function costTag(cost) {
    var m = String(cost).match(/(\d+)\s*(PM|PV)/i);
    if (ui().status !== 'cercado' || !m) return '<em class="cm-cost">' + E(cost) + '</em>';
    return '<em class="cm-cost up"><s>' + m[1] + '</s> ' + Math.ceil(Number(m[1]) * 1.5) + ' ' + m[2].toUpperCase() + '</em>';
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
  window.PhobiaCombat = { open: open, close: close, splash: function (k) { splash(SPLASH[k] || SPLASH.vantagem); }, render: render, crit: crit, attackMode: attackMode };

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

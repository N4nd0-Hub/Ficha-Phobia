/* PERSONA RPG — PHOBIA // Livro de Regras
   Monta sumário, tabelas e compêndios a partir de livro-data.js
   (gerado da ficha por tools/build-livro-data.cjs). */
(function () {
  'use strict';
  var D = window.LIVRO_DATA || {}, $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  /* [termo] → destaque, (frequência) → itálico, **negrito**, quebras de linha */
  function fmt(t) {
    return E(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]{1,80})\]/g, '<span class="term">$1</span>')
      .replace(/\(([^()]{1,60})\)/g, '<span class="freq">($1)</span>').replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
  }
  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
  var TIER_ICON = ['', '🔹', '🔷', '🔶', '🔺', '🌟'];

  /* ---------- sumário + busca + progresso ---------- */
  var toc = $('#lvToc');
  $$('.pg[data-toc]').forEach(function (s) {
    toc.insertAdjacentHTML('beforeend', '<li><a href="#' + s.id + '"><i>' + E(s.dataset.tocN) + '</i>' + E(s.dataset.toc) + '</a></li>');
  });
  var links = $$('#lvToc a');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('.pg[data-toc]').forEach(function (s) { io.observe(s); });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-toc-toggle]')) document.body.classList.toggle('toc-open');
    else if (e.target.closest('#lvToc a')) document.body.classList.remove('toc-open');
  });
  var prog = $('#lvProgress');
  addEventListener('scroll', function () { var h = document.documentElement; prog.style.width = (100 * h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) + '%'; }, { passive: true });

  /* ---------- progressões ---------- */
  var pvLv = D.pvMilestones || [];
  $('#pvMilestones').textContent = pvLv.join(', ');
  var SOC = [2, 4, 6, 7, 8, 10, 12, 13, 14, 16, 18, 19, 20], CBT = [3, 6, 9, 12, 15, 18];
  var rows = '';
  for (var n = 1; n <= 20; n++) {
    var c = [];
    if (n === 1) c.push('<span class="chip">🎭 Criação do personagem</span><span class="chip soc">💬 Habilidade Social inicial (Tier I)</span><span class="chip cbt">⚔ Habilidades de Combate iniciais</span><span class="chip bon">⭐ Habilidade de Combate e Habilidade Natural da Arcana</span>');
    if (SOC.indexOf(n) >= 0) c.push('<span class="chip soc">💬 +1 Avanço Social</span>');
    if (CBT.indexOf(n) >= 0) c.push('<span class="chip cbt">⚔ +1 Habilidade de Combate</span>');
    if (pvLv.indexOf(n) >= 0) c.push('<span class="chip pv">❤ +5 PV Máximo</span>');
    rows += '<tr><td class="lv">' + n + '</td><td>' + (c.join('') || '<span class="count">PV e PM recalculados</span>') + '</td></tr>';
  }
  $('#tblCnv tbody').innerHTML = rows;
  rows = '';
  for (n = 1; n <= 20; n++) {
    c = [];
    if (n === 1) c.push('<span class="chip bon">🎭 Desperta a Persona inicial</span><span class="chip tier">🔹 Magias Tier I · MAG + 2 magias</span><span class="chip">🃏 Habilidades Base da Arcana</span>');
    else c.push('<span class="chip pm">💜 +10 PM Máx. ou 🔮 +1 Magia</span>');
    var t = [1, 5, 10, 15, 20].indexOf(n); if (t > 0) c.push('<span class="chip tier">' + TIER_ICON[t + 1] + ' Magias Tier ' + ROMAN[t + 1] + '</span>');
    if (n % 2 === 0) c.push('<span class="chip awk">🃏 +1 Ponto de Despertar</span>');
    if (n % 3 === 0 && n <= 18) c.push('<span class="chip bon">🌟 Bônus de Persona</span>');
    if (n === 10) c.push('<span class="chip">🌟 Elegível ao Despertar de Resolução</span>');
    if (n === 20) c.push('<span class="chip bon">👑 Ápice da Persona</span>');
    rows += '<tr><td class="lv">' + n + '</td><td>' + c.join('') + '</td></tr>';
  }
  $('#tblPnv tbody').innerHTML = rows;

  /* ---------- curvas ---------- */
  var names = (D.arcanas && D.arcanas.arcanas || []).reduce(function (o, a) { o[a.romano] = a.nomeFicha || a.nome; return o; }, {});
  var byCurve = { padrao: [], sacrificial: [], conjurador: [] };
  Object.keys(names).forEach(function (r) { byCurve[(D.arcanaCurve || {})[r] || 'padrao'].push(r + ' ' + names[r]); });
  $('#tblCurves tbody').innerHTML = ['padrao', 'sacrificial', 'conjurador'].map(function (k) {
    var v = D.curves[k];
    return '<tr><td><b>' + E(v.name) + '</b></td><td>' + v.pv1 + ' + 2×VIT PV<br>' + v.pm1 + ' + 2×MAG PM</td><td>' + v.pvLv + ' + VIT÷2 PV por CNv.<br>' + v.pmLv + ' PM por PNv.</td><td>' + byCurve[k].map(E).join(' · ') + '</td></tr>';
  }).join('');
  $('#tblCap tbody').innerHTML = [1, 2, 3, 4, 5].map(function (t) { return '<tr><td>' + TIER_ICON[t] + ' Tier ' + ROMAN[t] + '</td><td>até <b>' + D.diceCap[t] + '</b> dados</td></tr>'; }).join('');
  $('#reactList').innerHTML = (D.elementReactions || []).map(function (r) { return '<b>' + E(r) + '</b>'; }).join(' → ');

  /* ---------- social ---------- */
  $('#tblSocial tbody').innerHTML = (D.socialSkills || []).map(function (s) { return '<tr><td><b>' + E(s) + '</b></td><td>' + E((D.socialInfo || {})[s] || '') + '</td></tr>'; }).join('');
  $('#tblTier tbody').innerHTML = (D.socialTierLabels || []).map(function (l, i) { return '<tr><td>' + E(l) + '</td><td>+' + D.socialTierBonus[i] + '</td></tr>'; }).join('');

  /* ---------- integridade ---------- */
  var ZC = { morte: '#6b6577', ruina: '#ff3b5c', fraturado: '#ff9a3c', estavel: '#33d6ff', integro: '#9dff3c', plenitude: '#ffe14a' };
  $('#integrityStages').innerHTML = (D.integrity || []).slice().reverse().map(function (s) {
    var parts = [];
    if (s.concept) parts.push('<p>' + fmt(s.concept) + '</p>');
    ['social', 'persona', 'cost'].forEach(function (k) { if (s[k]) parts.push('<p><b>' + E(s[k].title) + ':</b> ' + fmt(s[k].text) + '</p>'); });
    (s.notes || []).forEach(function (n) { parts.push('<p class="desc">' + fmt(n) + '</p>'); });
    return '<article class="card" style="--c:' + ZC[s.key] + '"><h5>' + E(s.name) + '</h5><div class="meta"><span class="chip" style="background:' + ZC[s.key] + '">' + E(s.range) + '</span>' +
      (s.status ? '<span class="chip">Fuga/Recuperação ' + (s.status > 0 ? '+' : '') + s.status + '</span>' : '') + '</div>' + parts.join('') + '</article>';
  }).join('');

  /* ---------- dinheiro ---------- */
  var yen = function (v) { return '¥' + Number(v).toLocaleString('pt-BR'); };
  var fb = D.financialBase || { startingYen: 25000, weeklyYen: 6000 };
  $('#tblMoney tbody').innerHTML = '<tr><td><b>Padrão</b></td><td>—</td><td>' + yen(fb.startingYen) + '</td><td>' + yen(fb.weeklyYen) + '</td></tr>' +
    (D.advantages || []).concat(D.flaws || []).filter(function (x) { return x.category_id === 'ECO'; }).map(function (x) {
      return '<tr><td><b>' + E(x.name) + '</b> <span class="count">' + (x.kind === 'vantagem' ? 'Vantagem' : 'Defeito') + '</span></td><td>' + x.points + '</td><td>' + yen(x.startingYen) + '</td><td>' + yen(x.weeklyYen) + '</td></tr>';
    }).join('');

  /* ---------- arcanas ---------- */
  var AW = D.awakeningLabels || {};
  function ability(h, amps) {
    return '<div class="ab"><b class="n">' + E(h.nome) + '</b><p>' + fmt(h.texto) + '</p>' +
      (amps && amps.length ? '<div class="amp">' + amps.map(function (a) { return '<b class="n">↳ ' + E(a.nome) + '</b><p>' + fmt(a.texto) + '</p>'; }).join('') + '</div>' : '') + '</div>';
  }
  function socialFor(r) {
    var s = (D.arcanaSocial || {})[r]; if (!s) return '';
    if (s.fixed) return 'Começa com ' + Object.keys(s.fixed).map(function (k) { return k + ' Tier I'; }).join(' e ') + '.';
    if (s.choice) return 'Começa com Tier I em ' + s.choice.skills.join(' ou ') + ' (escolha).';
    return '';
  }
  $('#arcanaList').innerHTML = (D.arcanas.arcanas || []).map(function (a) {
    var curve = D.curves[(D.arcanaCurve || {})[a.romano] || 'padrao'].name, soc = socialFor(a.romano);
    var base = (a.nivel1 || []).filter(function (h) { return !/^exemplo$/i.test(h.nome); }).map(function (h) { return ability(h); }).join('');
    var aw = Object.keys(a.despertares || {}).map(function (k) { var d = a.despertares[k]; return '<h4 class="t">Despertar · ' + E(AW[k] || k) + '</h4>' + ability(d.habilidade, d.amplificacoes); }).join('');
    return '<details class="arc" id="arcana-' + a.romano + '"><summary><span class="rn">' + a.romano + '</span><div><h4>' + E(a.nome) + '</h4><span class="sub">Curva ' + E(curve) + (soc ? ' · ' + E(soc) : '') + '</span></div><span class="pm">+</span></summary>' +
      '<div class="arc-body"><h4 class="t">Nível 1 · Habilidades Base</h4>' + base + aw + '</div></details>';
  }).join('');

  /* ---------- despertares universais ---------- */
  $('#awkPaths').innerHTML = Object.keys(AW).map(function (k) { return '<li><b>' + E(AW[k]) + '</b></li>'; }).join('');
  var U = (D.arcanas && D.arcanas.universal) || {};
  $('#awkUniversal').innerHTML = ['elo', 'resolucao'].filter(function (k) { return U[k]; }).map(function (k) {
    return '<h4 class="t">' + E(AW[k]) + ' (universal)</h4>' + ability(U[k].habilidade, U[k].amplificacoes);
  }).join('');

  /* ---------- dissonantes ---------- */
  $('#dissList').innerHTML = (D.dissonants || []).map(function (d) {
    return '<article class="card" style="--c:var(--red)"><h5>' + E(d.romano) + ' — ' + E(d.nome) + '</h5><p class="desc">' + fmt(d.descricao) + '</p>' +
      '<p><b style="color:#2d8a00">LADO A · ' + E(d.beneficio.nome) + ':</b> ' + fmt(d.beneficio.texto) + '</p>' +
      '<p><b style="color:#c4143a">LADO B · ' + E(d.complicacao.nome) + ':</b> ' + fmt(d.complicacao.texto) + '</p>' +
      (d.exclusivo ? '<p><b>EXCLUSIVO · ' + E(d.exclusivo.nome) + ':</b> ' + fmt(d.exclusivo.texto) + '</p>' : '') + '</article>';
  }).join('');

  /* ---------- vantagens & defeitos ---------- */
  var traits = (D.advantages || []).concat(D.flaws || []);
  var tf = $('[data-filter="traits"]'), tState = { kind: 'all', q: '', cat: '' };
  var cats = []; traits.forEach(function (t) { if (cats.indexOf(t.category) < 0) cats.push(t.category); });
  tf.querySelector('[data-cat]').insertAdjacentHTML('beforeend', cats.map(function (c) { return '<option>' + E(c) + '</option>'; }).join(''));
  function paintTraits() {
    var q = tState.q.toLowerCase(), list = traits.filter(function (t) {
      return (tState.kind === 'all' || t.kind === tState.kind) && (!tState.cat || t.category === tState.cat) && (!q || (t.name + ' ' + t.description).toLowerCase().indexOf(q) >= 0);
    });
    $('#traitCount').textContent = list.length + ' resultado(s)';
    $('#traitList').innerHTML = list.map(function (t) {
      var v = t.kind === 'vantagem';
      return '<article class="card" style="--c:' + (v ? 'var(--cyan)' : 'var(--red)') + '"><h5>' + E(t.name) + '</h5><div class="meta"><span class="chip ' + (v ? 'soc' : 'pv') + '">' + (v ? 'Vantagem' : 'Defeito') + ' · ' + t.points + ' pt' + (t.points > 1 ? 's' : '') + '</span><span class="chip">' + E(t.category) + '</span>' +
        (t.requirement && t.requirement !== 'Nenhum' ? '<span class="chip bon">Requer ' + E(t.requirement) + '</span>' : '') + '</div><p>' + fmt(t.description) + '</p>' + (t.frequency ? '<p class="desc">' + E(t.frequency) + '</p>' : '') + '</article>';
    }).join('');
  }
  tf.addEventListener('input', function (e) { if (e.target.matches('[data-q]')) tState.q = e.target.value; if (e.target.matches('[data-cat]')) tState.cat = e.target.value; paintTraits(); });
  tf.addEventListener('click', function (e) { var b = e.target.closest('[data-kind]'); if (!b) return; tState.kind = b.dataset.kind; $$('[data-kind]', tf).forEach(function (x) { x.classList.toggle('on', x === b); }); paintTraits(); });
  paintTraits();

  /* ---------- magias ---------- */
  var sf = $('[data-filter="spells"]'), sState = { q: '', cat: '', tier: '', limit: 30 };
  sf.querySelector('[data-cat]').insertAdjacentHTML('beforeend', (D.spellCategories || []).map(function (c) { return '<option value="' + E(c.name) + '">' + E(c.name) + ' (' + c.count + ')</option>'; }).join(''));
  function paintSpells() {
    var q = sState.q.toLowerCase(), list = (D.spells || []).filter(function (s) {
      return (!sState.cat || s.category === sState.cat) && (!sState.tier || String(s.tier) === sState.tier) && (!q || (s.name + ' ' + s.effect + ' ' + (s.description || '')).toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return a.category === b.category ? a.tier - b.tier || a.name.localeCompare(b.name) : 0; });
    $('#spellCount').textContent = list.length + ' magia(s)';
    $('#spellList').innerHTML = list.slice(0, sState.limit).map(function (s) {
      return '<article class="card" style="--c:var(--pink)"><h5>' + E(s.name) + '</h5><div class="meta"><span class="chip">' + E(s.category) + '</span><span class="chip tier">Tier ' + ROMAN[s.tier] + '</span>' +
        (s.cost ? '<span class="chip pm">' + E(s.cost) + '</span>' : '') + (s.target ? '<span class="chip">' + E(s.target) + '</span>' : '') + '</div><p>' + fmt(s.effect) + '</p>' + (s.description ? '<p class="desc">' + E(s.description) + '</p>' : '') + '</article>';
    }).join('');
    $('#spellMore').hidden = list.length <= sState.limit;
  }
  sf.addEventListener('input', function (e) {
    if (e.target.matches('[data-q]')) sState.q = e.target.value; if (e.target.matches('[data-cat]')) sState.cat = e.target.value; if (e.target.matches('[data-tier]')) sState.tier = e.target.value;
    sState.limit = 30; paintSpells();
  });
  $('#spellMore').addEventListener('click', function () { sState.limit += 60; paintSpells(); });
  paintSpells();

  /* ---------- instrumentos ---------- */
  var IR = window.INSTRUMENT_SKILL_RULES || {}, IC = window.INSTRUMENT_SKILL_CATEGORIES || [];
  $('#instIntro').innerHTML = '<p>' + fmt(IR.intro || '') + '</p>' + (IR.superior ? '<div class="box tip"><h5>Instrumentos superiores trazem</h5><ul class="dot">' + IR.superior.map(function (x) { return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul></div>' : '');
  function instText(t) {
    return String(t || '').split('\n').map(function (l) {
      if (/^>/.test(l)) return '<p>▸ ' + fmt(l.replace(/^>\w*\s*/, '')) + '</p>';
      if (/^~/.test(l)) return '<p class="desc">' + fmt(l.slice(1)) + '</p>';
      if (/^(OU|E)$/.test(l.trim())) return '<p class="count">' + l.trim() + '</p>';
      return l.trim() ? '<p>' + fmt(l) + '</p>' : '';
    }).join('');
  }
  $('#instList').innerHTML = IC.map(function (c) {
    return '<h3 class="t">' + E(c.name) + '</h3><div class="grid">' + c.skills.map(function (s) {
      return '<article class="card" style="--c:' + E(c.color || 'var(--ink)') + '"><h5>' + E(s.name) + '</h5>' + (s.cost ? '<div class="meta"><span class="chip pm">' + E(s.cost) + '</span></div>' : '') + instText(s.text) + '</article>';
    }).join('') + '</div>';
  }).join('');

  $('#genDate').textContent = D.gerado || '';

  /* ---------- busca no livro ---------- */
  var search = $('#lvSearch');
  search.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var q = search.value.trim().toLowerCase(); if (!q) return;
    /* abre Arcanas que tenham o termo, e filtra compêndios */
    $$('.arc').forEach(function (d) { if (d.textContent.toLowerCase().indexOf(q) >= 0) d.open = true; });
    var hit = $$('.pg h2, .pg h3, .pg h4, .pg h5, .pg p, .pg td, .pg li').filter(function (n) { return n.offsetParent && n.textContent.toLowerCase().indexOf(q) >= 0; });
    var cur = +search.dataset.i || 0; if (search.dataset.q !== q) cur = 0; search.dataset.q = q;
    if (!hit.length) {
      $('[data-filter="spells"] [data-q]').value = search.value; sState.q = search.value; paintSpells();
      if (D.spells.some(function (s) { return s.name.toLowerCase().indexOf(q) >= 0; })) location.hash = '#compendio-magias';
      return;
    }
    var n = hit[cur % hit.length]; search.dataset.i = cur + 1;
    n.scrollIntoView({ block: 'center' });
    n.animate([{ background: '#ffe14a' }, { background: 'transparent' }], { duration: 1600 });
  });
})();

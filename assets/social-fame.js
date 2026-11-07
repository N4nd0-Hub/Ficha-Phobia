/* ==========================================================
   PERSONA // PHOBIA — social-fame.js
   Aba SOCIAL: o "disco de fama" do personagem.
   Um vinil girando com uma estrela de 6 pontas por dentro;
   cada Habilidade Social é uma ponta, que cresce a cada Tier
   até a estrela ficar completa (todas no Tier V).
   Só lê e escreve os mesmos dados de sempre
   (socialEffectiveTier / setSocialEffectiveTier).
   ========================================================== */
(function () {
  'use strict';
  if (window.__socialFame) return; window.__socialFame = true;

  var SK = ['Conhecimento', 'Disciplina', 'Empatia', 'Charme', 'Coragem', 'Expressão'];
  var SHORT = ['CON', 'DIS', 'EMP', 'CHA', 'COR', 'EXP'];
  var ROM = ['0', 'I', 'II', 'III', 'IV', 'V'];
  var RANKS = [[0, 'DESCONHECIDO', 'Ninguém sabe seu nome... ainda.'], [6, 'PROMESSA', 'O bairro começa a comentar.'], [12, 'EM ALTA', 'Seu nome circula pelas ruas de Tóquio.'],
    [18, 'ESTRELA', 'As pessoas te reconhecem na estação.'], [24, 'ÍCONE', 'Seu rosto estampa as revistas.'], [30, 'LENDA', 'Disco de platina. Todas as Habilidades no máximo.']];
  var R_IN = 44, R_MAX = 148, CX = 0, CY = 0;
  var anim = { cur: [0, 0, 0, 0, 0, 0], vel: [0, 0, 0, 0, 0, 0], tgt: [0, 0, 0, 0, 0, 0], raf: 0 }, built = false, last = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function tierOf(s) { try { return socialEffectiveTier(s); } catch (e) { return 0; } }
  function bonusOf(s) { try { return socialEffectiveBonus(s); } catch (e) { return 0; } }
  function arcanaOf(s) { try { return socialArcanaTierBonus(s); } catch (e) { return 0; } }
  function reduced() { return document.body.classList.contains('hs-calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function colors() {
    var fall = ['#08a3cf', '#e13eb3', '#9a65e8', '#f0b82d', '#8cf12f', '#58d9ff'];
    try { var p = getSocialRadarPalette(); if (p && p.skills && p.skills.length === 6) return p.skills; } catch (e) {}
    return fall;
  }
  function titleOf(skill, t) {
    try { var row = (SOCIAL_TIER_SKILLS[skill] || []).filter(function (x) { return String(x.tier) === ROM[t]; })[0]; return row ? row.title : ''; } catch (e) { return ''; }
  }
  function ang(i, off) { return (-90 + i * 60 + (off || 0)) * Math.PI / 180; }
  function pt(r, a) { return (CX + Math.cos(a) * r).toFixed(1) + ' ' + (CY + Math.sin(a) * r).toFixed(1); }
  function tipR(v) { return R_IN + 10 + (R_MAX - R_IN - 10) * Math.max(0, v) / 5; }
  function starD(vals) {
    var d = '';
    for (var i = 0; i < 6; i++) {
      d += (i ? 'L' : 'M') + pt(tipR(vals[i]), ang(i)) + 'L' + pt(R_IN, ang(i, 30));
    }
    return d + 'Z';
  }

  /* ---------- montar ---------- */
  function build() {
    var stage = $('#sfStage'); if (!stage) return false;
    var grooves = '';
    for (var g = 60; g < 176; g += 6) grooves += '<circle r="' + g + '" class="sf-groove' + (g % 24 === 0 ? ' b' : '') + '"/>';
    var guides = '';
    for (var t = 1; t <= 5; t++) guides += '<path class="sf-guide' + (t === 5 ? ' max' : '') + '" d="' + starD([t, t, t, t, t, t]) + '"/>';
    var spokes = '';
    for (var i = 0; i < 6; i++) spokes += '<path class="sf-spoke" d="M0 0L' + pt(R_MAX + 4, ang(i)) + '"/>';
    var labels = SK.map(function (s, i) {
      var a = ang(i), lr = 196, x = (Math.cos(a) * lr).toFixed(1), y = (Math.sin(a) * lr).toFixed(1);
      return '<g class="sf-lab" data-sf-skill="' + E(s) + '" transform="translate(' + x + ' ' + y + ')" role="button" tabindex="0" aria-label="Ver habilidades de ' + E(s) + '">' +
        '<rect x="-46" y="-21" width="92" height="42" rx="0" class="sf-lab-bg"/><text y="-4" class="sf-lab-name">' + SHORT[i] + '</text><text y="14" class="sf-lab-tier">TIER 0</text></g>';
    }).join('');
    stage.innerHTML =
      '<div class="sf-disc-wrap">' +
        '<svg class="sf-svg" viewBox="-250 -250 500 500" role="img" aria-label="Disco de fama: estrela das Habilidades Sociais">' +
          '<defs>' +
            '<radialGradient id="sfVinyl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2a2533"/><stop offset=".55" stop-color="#121016"/><stop offset="1" stop-color="#07060a"/></radialGradient>' +
            '<linearGradient id="sfStarFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="sf-s0"/><stop offset="1" class="sf-s1"/></linearGradient>' +
            '<linearGradient id="sfPlat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7c9"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>' +
            '<pattern id="sfDots" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.3" class="sf-dot"/></pattern>' +
          '</defs>' +
          '<g class="sf-spin-boost"><g class="sf-spin">' +
            '<circle r="186" class="sf-rim-shadow" transform="translate(8 10)"/>' +
            '<circle r="186" fill="url(#sfVinyl)" class="sf-rim"/>' + grooves +
            '<path d="M0 -178 A178 178 0 0 1 126 -126 L0 0Z" class="sf-sheen"/><path d="M0 178 A178 178 0 0 1 -126 126 L0 0Z" class="sf-sheen"/>' +
            '<circle r="58" class="sf-label"/><circle r="58" fill="url(#sfDots)" class="sf-label-dots"/>' +
            '<path id="sfLabelArc" d="M-42 0 A42 42 0 1 1 42 0 A42 42 0 1 1 -42 0" fill="none"/>' +
            '<text class="sf-label-text"><textPath href="#sfLabelArc">PERSONA // PHOBIA ★ FAME RECORD ★ 2000 ★</textPath></text>' +
          '</g></g>' +
          '<g class="sf-guides">' + spokes + guides + '</g>' +
          '<path class="sf-star-shadow" transform="translate(7 9)" d=""/>' +
          '<path class="sf-star" d=""/>' +
          '<path class="sf-star-line" d=""/>' +
          '<g class="sf-tips"></g>' +
          '<circle r="12" class="sf-hub"/><circle r="4" class="sf-hub-hole"/>' +
          '<g class="sf-labels">' + labels + '</g>' +
          '<g class="sf-fx"></g>' +
        '</svg>' +
        
        '<div class="sf-plat" aria-hidden="true">DISCO DE<b>PLATINA</b></div>' +
      '</div>';
    stage.addEventListener('click', function (e) { var l = e.target.closest('[data-sf-skill]'); if (l) focusSkill(l.dataset.sfSkill); });
    stage.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.sfSkill) { e.preventDefault(); focusSkill(e.target.dataset.sfSkill); } });
    var side = $('#sfSkills');
    side.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sf-set]'); if (b) { setTier(b.dataset.sfSkillRow, +b.dataset.sfSet); return; }
      var r = e.target.closest('[data-sf-pick]'); if (r) focusSkill(r.dataset.sfPick);
    });
    var auto = $('#sfAuto');
    auto.addEventListener('change', function (e) {
      if (e.target.id !== 'sfAutoToggle') return;
      try { ensureCharacterUI().socialAutoStats = e.target.checked; } catch (x) {}
      if (typeof renderCharacterSheet === 'function') renderCharacterSheet();
      try { saveState(true); } catch (x) {}
    });
    built = true;
    return true;
  }

  function setTier(skill, t) {
    var cur = tierOf(skill), next = cur === t ? t - 1 : t;
    var floor = arcanaOf(skill);
    if (next < floor) next = floor;
    try { setSocialEffectiveTier(skill, next); } catch (e) { return; }
    document.querySelectorAll('[data-social]').forEach(function (s) { if (s.dataset.social === skill) s.value = String(next); });
    try { ensureCharacterUI().socialSkillMonitor = skill; } catch (e) {}
    if (typeof renderCharacterSheet === 'function') renderCharacterSheet();
    try { saveState(true); } catch (e) {}
  }
  function focusSkill(skill) {
    try { ensureCharacterUI().socialSkillMonitor = skill; renderSocialTierMonitor(); } catch (e) {}
    paintSide();
    var mon = document.getElementById('socialTierMonitorSection');
    if (mon && mon.getBoundingClientRect().top > window.innerHeight * .7) mon.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- pintar ---------- */
  function paintSide() {
    var side = $('#sfSkills'); if (!side) return;
    var col = colors(), act = '';
    try { act = ensureCharacterUI().socialSkillMonitor; } catch (e) {}
    side.innerHTML = SK.map(function (s, i) {
      var t = tierOf(s), ab = arcanaOf(s);
      var pips = '';
      for (var k = 1; k <= 5; k++) pips += '<button type="button" class="sf-pip' + (k <= t ? ' on' : '') + (k <= ab ? ' arc' : '') + '" data-sf-skill-row="' + E(s) + '" data-sf-set="' + k + '" aria-label="' + E(s) + ' Tier ' + ROM[k] + '" aria-pressed="' + (k <= t) + '">' + ROM[k] + '</button>';
      return '<div class="sf-row' + (s === act ? ' is-active' : '') + '" role="listitem" style="--sk:' + col[i] + '">' +
        '<button type="button" class="sf-row-name" data-sf-pick="' + E(s) + '"><i></i><b>' + E(s).toUpperCase() + '</b><small>' + E(titleOf(s, t) || '—') + (ab ? ' · ARCANA +' + ab : '') + '</small></button>' +
        '<div class="sf-pips">' + pips + '</div><span class="sf-bonus">+' + bonusOf(s) + '</span></div>';
    }).join('');
  }
  function paintRank(total) {
    var r = RANKS[0];
    RANKS.forEach(function (x) { if (total >= x[0]) r = x; });
    var box = $('#sfRank'); if (!box) return;
    box.innerHTML = '<small>FAMA DO PERSONAGEM</small><div class="sf-rank-line"><b>' + r[1] + '</b><span>' + total + '<em>/30</em></span></div>' +
      '<div class="sf-rank-bar"><i style="transform:scaleX(' + (total / 30) + ')"></i></div><p>' + r[2] + '</p>';
  }
  function paintAuto() {
    var box = $('#sfAuto'); if (!box) return;
    var calc = null; try { calc = calculateSheet(); } catch (e) {}
    var st = calc && calc.socialTierStats; if (!st) { box.innerHTML = ''; return; }
    var parts = [];
    ['FOR', 'MAG', 'TEC', 'AGI', 'VIT', 'SOR'].forEach(function (k) { if (st.attrs[k]) parts.push('<span class="sf-chip">+' + st.attrs[k] + ' ' + k + '</span>'); });
    if (st.pv) parts.push('<span class="sf-chip pv">+' + st.pv + ' PV MÁX</span>');
    if (st.pm) parts.push('<span class="sf-chip pm">+' + st.pm + ' PM MÁX</span>');
    var col = colors();
    box.innerHTML =
      '<header class="sf-auto-head"><div><small>AUTOMÁTICO // BÔNUS PERMANENTES DOS TIERS</small><b>O QUE A FAMA JÁ TE DEU</b></div>' +
      '<label class="sf-switch"><input type="checkbox" id="sfAutoToggle"' + (st.enabled ? ' checked' : '') + '><span></span>Somar na ficha</label></header>' +
      '<div class="sf-auto-total">' + (st.enabled ? (parts.join('') || '<em>Nenhum bônus permanente liberado ainda.</em>') : '<em>Desligado: os bônus abaixo não estão sendo somados.</em>') + '</div>' +
      '<div class="sf-auto-list">' + st.rules.map(function (r) {
        var i = SK.indexOf(r.skill);
        return '<div class="sf-rule' + (r.on ? ' on' : '') + '" style="--sk:' + (col[i] || '#fff') + '"><span class="sf-rule-tag">' + SHORT[i] + ' ' + ROM[r.tier] + '</span><span class="sf-rule-text">' + E(r.text) + '</span><span class="sf-rule-state">' + (r.on ? (st.enabled ? '✓ SOMADO' : 'LIBERADO') : '🔒 TIER ' + ROM[r.tier]) + '</span></div>';
      }).join('') + '</div>';
  }

  /* ---------- animação da estrela ---------- */
  function paintStar(vals) {
    var svg = $('#sfStage .sf-svg'); if (!svg) return;
    var d = starD(vals);
    svg.querySelector('.sf-star').setAttribute('d', d);
    svg.querySelector('.sf-star-shadow').setAttribute('d', d);
    svg.querySelector('.sf-star-line').setAttribute('d', d);
    var col = colors(), tips = '';
    for (var i = 0; i < 6; i++) {
      var a = ang(i), r = tipR(vals[i]);
      tips += '<circle cx="' + (Math.cos(a) * r).toFixed(1) + '" cy="' + (Math.sin(a) * r).toFixed(1) + '" r="' + (7 + Math.max(0, vals[i]) * .9).toFixed(1) + '" class="sf-tip" style="fill:' + col[i] + '"/>';
    }
    svg.querySelector('.sf-tips').innerHTML = tips;
  }
  function loop() {
    var moving = false;
    for (var i = 0; i < 6; i++) {
      var x = anim.cur[i], v = anim.vel[i], t = anim.tgt[i];
      v += (t - x) * 0.11; v *= 0.74;
      x += v;
      if (Math.abs(t - x) < 0.002 && Math.abs(v) < 0.002) { x = t; v = 0; } else moving = true;
      anim.cur[i] = x; anim.vel[i] = v;
    }
    paintStar(anim.cur);
    anim.raf = moving ? requestAnimationFrame(loop) : 0;
  }
  function animateTo(vals, instant) {
    anim.tgt = vals.slice();
    if (instant || reduced()) { anim.cur = vals.slice(); anim.vel = [0, 0, 0, 0, 0, 0]; paintStar(anim.cur); return; }
    if (!anim.raf) anim.raf = requestAnimationFrame(loop);
  }
  function burst(i, up) {
    if (reduced()) return;
    var svg = $('#sfStage .sf-svg'); if (!svg) return;
    var fx = svg.querySelector('.sf-fx'), a = ang(i), r = tipR(anim.tgt[i]), cx = Math.cos(a) * r, cy = Math.sin(a) * r, col = colors()[i];
    for (var k = 0; k < (up ? 12 : 5); k++) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var s = 3 + Math.random() * 4;
      c.setAttribute('d', 'M0 ' + -s * 2 + 'L' + s * .5 + ' ' + -s * .5 + 'L' + s * 2 + ' 0L' + s * .5 + ' ' + s * .5 + 'L0 ' + s * 2 + 'L' + -s * .5 + ' ' + s * .5 + 'L' + -s * 2 + ' 0L' + -s * .5 + ' ' + -s * .5 + 'Z');
      c.setAttribute('class', 'sf-spark'); c.style.fill = k % 3 ? col : '#fff6e3';
      fx.appendChild(c);
      var aa = a + (Math.random() - .5) * 2.2, dd = 24 + Math.random() * 46;
      var an = c.animate([
        { transform: 'translate(' + cx + 'px,' + cy + 'px) scale(.2) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + (cx + Math.cos(aa) * dd) + 'px,' + (cy + Math.sin(aa) * dd) + 'px) scale(1) rotate(' + (90 + Math.random() * 180) + 'deg)', opacity: 1, offset: .55 },
        { transform: 'translate(' + (cx + Math.cos(aa) * dd * 1.25) + 'px,' + (cy + Math.sin(aa) * dd * 1.25) + 'px) scale(.3) rotate(360deg)', opacity: 0 }
      ], { duration: 650 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.3,1)' });
      an.onfinish = (function (el) { return function () { el.remove(); }; })(c);
    }
    var boost = svg.querySelector('.sf-spin-boost');
    if (boost && boost.animate) boost.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + (up ? 360 : -200) + 'deg)' }], { duration: up ? 1100 : 800, easing: 'cubic-bezier(.2,.75,.25,1)' });
    var lab = svg.querySelectorAll('.sf-lab')[i];
    if (lab && lab.animate) lab.animate([{ transform: lab.getAttribute('transform') + ' scale(1)' }, { transform: lab.getAttribute('transform') + ' scale(1.25)' }, { transform: lab.getAttribute('transform') + ' scale(1)' }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }

  function render(fromSwitch) {
    if (!built && !build()) return;
    var vals = SK.map(tierOf), total = vals.reduce(function (a, b) { return a + b; }, 0);
    var svg = $('#sfStage .sf-svg'), col = colors();
    if (svg) {
      svg.querySelectorAll('.sf-lab').forEach(function (g, i) {
        g.style.setProperty('--sk', col[i]);
        g.querySelector('.sf-lab-tier').textContent = vals[i] ? 'TIER ' + ROM[vals[i]] : 'TIER 0';
        g.classList.toggle('max', vals[i] === 5);
      });
    }
    var wrap = $('#sfStage .sf-disc-wrap');
    if (wrap) wrap.classList.toggle('is-platinum', total === 30);
    if (last && !fromSwitch) vals.forEach(function (v, i) { if (v !== last[i]) burst(i, v > last[i]); });
    if (fromSwitch && !reduced()) { anim.cur = [0, 0, 0, 0, 0, 0]; anim.vel = [0, 0, 0, 0, 0, 0]; }
    animateTo(vals, !last && !fromSwitch);
    last = vals;
    paintRank(total); paintSide(); paintAuto();
  }
  window.renderSocialFame = render;

  function wrap(name) {
    var o = window[name]; if (typeof o !== 'function' || o.__sf) return;
    var w = function () { var r = o.apply(this, arguments); try { render(false); } catch (e) {} return r; };
    w.__sf = true; window[name] = w;
  }
  function init() {
    if (typeof socialEffectiveTier !== 'function' || typeof state === 'undefined' || !state.charSheet) { setTimeout(init, 200); return; }
    wrap('renderCharacterSheet'); wrap('hydrateCharacterSheet'); wrap('applySiteTheme');
    render(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

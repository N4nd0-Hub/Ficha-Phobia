/* PERSONA // PHOBIA — persona-types.js
   Página PERSONA: escolha dos 4 tipos mágicos da Persona.
   Miscelânea e Defesa ficam livres para todo mundo; o Grimório
   só mostra/permite magias desses tipos. Grava em
   state.charSheet.personaMagicTypes. */
(function () {
  'use strict';
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  var ELEM = ['Físico', 'Fogo', 'Gelo', 'Vento', 'Raio', 'Nuclear', 'PSY', 'Luz e Bênção', 'Trevas e Maldição', 'Intel', 'Onipotente'];
  var SUP = ['Cura e Recuperação', 'Buffs (Aprimoramentos)', 'Debuffs (Enfraquecimentos)', 'Controle Mental e Status', 'Passivas Mágicas'];
  var EKEY = { 'Físico': 'fisico', 'Fogo': 'fogo', 'Gelo': 'gelo', 'Vento': 'vento', 'Raio': 'raio', 'Nuclear': 'nuclear', 'PSY': 'psy', 'Luz e Bênção': 'luz', 'Trevas e Maldição': 'trevas', 'Intel': 'intel' };
  function ok() { try { return typeof state !== 'undefined' && state.charSheet && typeof PERSONA_SPELL_CATEGORIES !== 'undefined'; } catch (e) { return false; } }
  function count(c) { var x = PERSONA_SPELL_CATEGORIES.filter(function (k) { return k.name === c; })[0]; return x ? x.count : 0; }
  var SHORT = { 'Cura e Recuperação': 'Cura', 'Buffs (Aprimoramentos)': 'Buffs', 'Debuffs (Enfraquecimentos)': 'Debuffs', 'Controle Mental e Status': 'Controle', 'Passivas Mágicas': 'Passivas' };
  function label(c) { return SHORT[c] || (typeof grimoireCategoryLabel === 'function' ? grimoireCategoryLabel(c) : c); }
  function icon(c) {
    var I = window.PhobiaElementIcons, k = EKEY[c];
    if (I && k && I.el[k]) return I.el[k].i;
    return '<span class="pt-glyph">' + E((typeof GRIMOIRE_ICONS !== 'undefined' && GRIMOIRE_ICONS[c]) || '✦') + '</span>';
  }
  function color(c) { return (typeof GRIMOIRE_CATEGORY_COLORS !== 'undefined' && GRIMOIRE_CATEGORY_COLORS[c]) || '#ef2b97'; }
  function chip(c, on, full, free) {
    return '<button type="button" class="pt-chip' + (on ? ' on' : '') + (free ? ' free' : '') + '" ' + (free ? 'disabled' : 'data-pt="' + E(c) + '" aria-pressed="' + on + '"' + (full && !on ? ' data-full="1"' : '')) +
      ' style="--tc:' + color(c) + '"><i>' + icon(c) + '</i><b>' + E(label(c)) + '</b><small>' + (free ? 'LIVRE' : count(c) + ' magias') + '</small>' + (on ? '<em>✓</em>' : '') + '</button>';
  }
  function render() {
    if (!ok()) return;
    var anchor = document.getElementById('personaAffinitySection'); if (!anchor) return;
    var box = document.getElementById('personaMagicTypes');
    if (!box) { box = document.createElement('section'); box.id = 'personaMagicTypes'; box.className = 'pt-box'; anchor.parentNode.insertBefore(box, anchor); box.addEventListener('click', onClick); }
    var ch = chosenMagicTypes(), full = ch.length >= MAGIC_TYPE_LIMIT;
    var slots = ''; for (var i = 0; i < MAGIC_TYPE_LIMIT; i++) slots += ch[i] ? '<span class="pt-slot on" style="--tc:' + color(ch[i]) + '"><i>' + icon(ch[i]) + '</i>' + E(label(ch[i])) + '</span>' : '<span class="pt-slot">' + (i + 1) + '</span>';
    box.innerHTML = '<header><strong><span>✦</span> TIPOS MÁGICOS DA PERSONA</strong><span>Escolha <b>4</b> tipos. Miscelânea e Defesa são livres para todos. O Grimório só mostra magias desses 6.</span></header>' +
      '<div class="pt-slots">' + slots + '<span class="pt-plus">+</span><span class="pt-slot free" style="--tc:' + color('Miscelânea') + '">★ Misc.</span><span class="pt-slot free" style="--tc:' + color('Defesa') + '">▣ Defesa</span><span class="pt-count">' + ch.length + '/' + MAGIC_TYPE_LIMIT + '</span></div>' +
      '<h4>ELEMENTOS</h4><div class="pt-grid">' + ELEM.map(function (c) { return chip(c, ch.indexOf(c) >= 0, full); }).join('') + '</div>' +
      '<h4>SUPORTE &amp; ESPECIAIS</h4><div class="pt-grid">' + SUP.map(function (c) { return chip(c, ch.indexOf(c) >= 0, full); }).join('') + '</div>' +
      (warn(ch) || '');
  }
  function warn(ch) {
    if (!ch.length) return '';
    var bad = ((state.charSheet.magicSlots) || []).filter(function (m) { return m && m.name && m.type && !magicTypeAllowed(m.type); }).map(function (m) { return m.name; });
    return bad.length ? '<p class="pt-warn">⚠ No deck, fora dos tipos escolhidos: <b>' + bad.map(E).join(', ') + '</b>. Elas continuam lá, mas você pode removê-las no Grimório.</p>' : '';
  }
  function onClick(e) {
    var b = e.target.closest('[data-pt]'); if (!b) return;
    var c = b.dataset.pt, ch = chosenMagicTypes(), i = ch.indexOf(c);
    if (i >= 0) ch.splice(i, 1);
    else if (ch.length >= MAGIC_TYPE_LIMIT) { if (typeof toast === 'function') toast('JÁ TEM 4 TIPOS — TIRE UM PRIMEIRO'); return; }
    else ch.push(c);
    state.charSheet.personaMagicTypes = ch;
    try { saveState(true); } catch (x) {}
    render();
    try { if (typeof renderGrimoire === 'function') renderGrimoire(); } catch (x) {}
  }
  function init() {
    if (!ok()) { setTimeout(init, 300); return; }
    render();
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#sheet-tab-persona')) setTimeout(render, 30); }, true);
    var last = '';
    setInterval(function () { var k = JSON.stringify(chosenMagicTypes()) + ((state.saveMeta || {}).fichaId || ''); if (k !== last) { last = k; render(); try { renderGrimoire(); } catch (x) {} } }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

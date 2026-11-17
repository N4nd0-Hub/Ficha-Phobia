#!/usr/bin/env node
/* Gera livro/livro-data.js a partir das tabelas do index.html,
   para o Livro de Regras ficar sempre igual à ficha.
   Uso: node tools/build-livro-data.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function grab(name, kind) {
  const re = kind === 'fn' ? new RegExp('\\nfunction ' + name + '\\s*\\(') : new RegExp('\\nconst ' + name + '\\s*=');
  const m = re.exec(html); if (!m) throw new Error('não achei ' + name);
  let i = m.index + 1, depth = 0, started = false, q = null, esc = false;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (q) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{' || c === '[' || c === '(') { depth++; started = true; }
    else if (c === '}' || c === ']' || c === ')') { depth--; }
    if (started && depth === 0) {
      if (kind === 'fn') { if (c === '}') return html.slice(i, j + 1); continue; }
      return html.slice(i, j + 1) + ';';
    }
  }
  throw new Error('fim não encontrado ' + name);
}
const ctx = { Intl, Math, JSON, Object, Number, String, Array };
vm.createContext(ctx);
const run = src => vm.runInContext(src.replace(/^const /, 'var '), ctx);
['SOCIAL_TIER_LABELS', 'SOCIAL_TIER_BONUS', 'SOCIAL_SKILLS', 'SOCIAL_SKILL_SCREEN_INFO', 'ELEMENT_REACTIONS', 'CNV_PV_LEVELS', 'RESOURCE_CURVES', 'ARCANA_CURVE', 'SPELL_DICE_CAP',
 'PERSONA_PHOBIA_DISSONANT_ARCANAS', 'PERSONA_PHOBIA_ARCANAS', 'ARCANA_SIMPLE_NAMES', 'ARCANA_SOCIAL_EFFECTS', 'ARCANA_AWAKENING_LABELS',
 'PERSONA_SPELL_LIBRARY', 'PERSONA_SPELL_CATEGORIES', 'EQ_TYPES', 'BP_CATEGORIES',
 'FINANCIAL_CATEGORY', 'FINANCIAL_BASE', 'FINANCIAL_PROFILES', 'FINANCIAL_YEN_FORMAT'].forEach(n => run(grab(n)));
run(grab('yenText', 'fn'));
run("var MAGIC_FREE_TYPES=['Miscelânea','Defesa','Passivas Mágicas'];");
['FINANCIAL_TRAITS', 'ADVANTAGE_CATEGORIES', 'ADVANTAGE_CATALOG', 'FLAW_CATALOG', 'FLAW_CATEGORIES', 'TRAIT_POINT_RULES'].forEach(n => run(grab(n)));
run(grab('integrityInfo', 'fn'));
const integrity = [0, 10, 30, 60, 80, 100].map(v => ctx.integrityInfo(v));
const pick = n => ctx[n];
const data = {
  gerado: new Date().toISOString().slice(0, 10),
  socialTierLabels: pick('SOCIAL_TIER_LABELS'), socialTierBonus: pick('SOCIAL_TIER_BONUS'), socialSkills: pick('SOCIAL_SKILLS'), socialInfo: pick('SOCIAL_SKILL_SCREEN_INFO'),
  elementReactions: pick('ELEMENT_REACTIONS'), pvMilestones: pick('CNV_PV_LEVELS'), curves: pick('RESOURCE_CURVES'), arcanaCurve: pick('ARCANA_CURVE'), diceCap: pick('SPELL_DICE_CAP'),
  arcanas: pick('PERSONA_PHOBIA_ARCANAS'), arcanaSocial: pick('ARCANA_SOCIAL_EFFECTS'), awakeningLabels: pick('ARCANA_AWAKENING_LABELS'),
  dissonants: pick('PERSONA_PHOBIA_DISSONANT_ARCANAS'),
  spells: pick('PERSONA_SPELL_LIBRARY'), spellCategories: pick('PERSONA_SPELL_CATEGORIES'), freeTypes: pick('MAGIC_FREE_TYPES'),
  advantageCategories: pick('ADVANTAGE_CATEGORIES'), advantages: pick('ADVANTAGE_CATALOG'), flaws: pick('FLAW_CATALOG'), flawCategories: pick('FLAW_CATEGORIES'),
  financialBase: pick('FINANCIAL_BASE'), integrity, eqTypes: pick('EQ_TYPES'), bagCategories: pick('BP_CATEGORIES')
};
const out = '/* GERADO por tools/build-livro-data.cjs a partir do index.html — não edite à mão. */\nwindow.LIVRO_DATA = ' + JSON.stringify(data) + ';\n';
fs.writeFileSync(path.join(root, 'livro', 'livro-data.js'), out);
console.log('livro/livro-data.js', (out.length / 1024).toFixed(0) + ' KB', 'arcanas', data.arcanas.arcanas.length, 'magias', data.spells.length, 'vantagens', data.advantages.length, 'defeitos', data.flaws.length, 'dissonantes', data.dissonants.length);

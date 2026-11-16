/* ==========================================================
   PERSONA // PHOBIA — instrument-skills.js
   Habilidades Básicas de Instrumento:
   • catálogo navegável (botão na aba Equipamentos);
   • "Escolher do catálogo" em cada espaço de Habilidade do editor;
   • quando o espaço guarda o nome de uma Habilidade do catálogo, a ficha
     mostra o texto completo formatado (nome em negrito, valores coloridos).
   O que já foi escrito à mão continua aparecendo como antes.
   ========================================================== */
(function () {
  'use strict';
  if (window.PhobiaInstrumentSkills) return;

  var CATS = window.INSTRUMENT_SKILL_CATEGORIES || [];
  var ALL = [];
  CATS.forEach(function (c) { c.skills.forEach(function (s) { s.cat = c; ALL.push(s); }); });
  var KIND_LABEL = { dmg: 'Dano', acc: 'Acerto', pm: 'PM', hp: 'PV', mov: 'Movimento', def: 'Defesa', deb: 'Penalidade', mus: 'Música', star: 'Especial', time: 'Duração', block: 'Bloqueio' };

  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\[[^\]]*\]/g, '').replace(/[^\w!]+/g, ' ').trim().toLowerCase(); }
  function find(text) {
    var first = String(text || '').split('\n')[0];
    var n = norm(first); if (!n) return null;
    for (var i = 0; i < ALL.length; i++) if (norm(ALL[i].name) === n) return ALL[i];
    return null;
  }
  function chipKind(t, fallback) {
    if (/Dano|Margem/i.test(t)) return 'dmg';
    if (/\bPM\b/.test(t)) return 'pm';
    if (/\bPV\b/.test(t)) return 'hp';
    if (/Acerto|Vantagem|Sucesso|Teste/i.test(t)) return 'acc';
    if (/Esquiva|Metros|Movimento/i.test(t)) return 'mov';
    if (/\bRD\b|VIT|%\]?$/.test(t)) return 'def';
    if (/Rodada/i.test(t)) return 'time';
    return fallback || 'acc';
  }
  function inline(s, kind) {
    var out = '', last = 0, re = /\*\*(.+?)\*\*|\[([^\]]+)\]|\((Rodada|Combate|Cena|Aliado|Ruptura Cognitiva|Sound Combo!)\)/g, m;
    s = String(s);
    while ((m = re.exec(s))) {
      out += E(s.slice(last, m.index));
      if (m[1]) out += '<b>' + E(m[1]) + '</b>';
      else if (m[2]) {
        var v = m[2], isVal = /\d|Vantagem|Sucesso|Metade/.test(v);
        out += isVal ? '<span class="isk-v isk-' + chipKind(v, kind) + '">' + E(v) + '</span>' : '<span class="isk-t">' + E(v) + '</span>';
      } else out += '<span class="isk-f">' + E(m[3]) + '</span>';
      last = re.lastIndex;
    }
    return out + E(s.slice(last));
  }
  function body(text) {
    return String(text || '').split('\n').map(function (line) {
      line = line.trim(); if (!line) return '';
      if (line === 'OU' || line === 'E') return '<div class="isk-or"><span>' + line + '</span></div>';
      if (line[0] === '~') return '<p class="isk-note">' + inline(line.slice(1)) + '</p>';
      var fx = line.match(/^>(\w+)\s+(.*)$/);
      if (fx) return '<p class="isk-fx isk-' + fx[1] + '"><i title="' + (KIND_LABEL[fx[1]] || '') + '"></i><span>' + inline(fx[2].replace(/\.\s*$/, ''), fx[1]) + '</span></p>';
      return '<p>' + inline(line) + '</p>';
    }).join('');
  }
  function card(skill, opts) {
    opts = opts || {};
    return '<article class="isk-card' + (opts.compact ? ' compact' : '') + '" style="--ic:' + skill.cat.color + '">' +
      '<header><div>' + (opts.tag ? '<small>' + E(opts.tag) + ' · ' + E(skill.cat.name) + '</small>' : '<small>' + E(skill.cat.name) + '</small>') +
      '<b>' + E(skill.name) + '</b></div>' + (skill.cost ? '<span class="isk-cost">' + E(skill.cost) + '</span>' : '') + '</header>' +
      '<div class="isk-body">' + body(skill.text) + '</div>' + (opts.extra ? '<p class="isk-extra">' + E(opts.extra) + '</p>' : '') + (opts.foot || '') + '</article>';
  }

  /* ---------- cartões de habilidade na ficha ---------- */
  function abilityCards(item, compact) {
    if (!item || item.type !== 'instrument') return '';
    var list = [['UNIVERSAL / 01', item.ability1], ['UNIVERSAL / 02', item.ability2], ['ADICIONAL / EXCLUSIVA', item.ability3]].filter(function (p) { return String(p[1] || '').trim(); });
    if (!list.length && !item.properties) return '<div class="eq-skill-empty">Habilidades ainda não registradas.</div>';
    return '<div class="eq-skill-list isk-list ' + (compact ? 'compact' : '') + '">' + list.map(function (p) {
      var sk = find(p[1]);
      if (sk) { var extra = String(p[1]).split('\n').slice(1).join('\n').trim(); return card(sk, { tag: p[0], compact: compact, extra: extra }); }
      return '<div class="eq-skill"><small>✦ ' + p[0] + '</small><p>' + E(p[1]) + '</p></div>';
    }).join('') + (item.properties ? '<div class="eq-skill eq-properties"><small>◈ PROPRIEDADES</small><p>' + E(item.properties) + '</p></div>' : '') + '</div>';
  }

  /* ---------- catálogo (janela) ---------- */
  var dlg = null, target = null, catSel = 'all', query = '';
  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog'); dlg.id = 'iskDialog'; dlg.className = 'isk-dialog';
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-isk-close]')) { dlg.close(); return; }
      var c = e.target.closest('[data-isk-cat]'); if (c) { catSel = c.dataset.iskCat; paint(); return; }
      var u = e.target.closest('[data-isk-use]');
      if (u && target) {
        var sk = ALL[+u.dataset.iskUse];
        target.value = sk.name;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        dlg.close(); preview(target);
      }
    });
    dlg.addEventListener('input', function (e) { if (e.target.id === 'iskSearch') { query = e.target.value; paint(true); } });
    dlg.addEventListener('close', function () { target = null; });
    document.body.appendChild(dlg);
    return dlg;
  }
  function paint(keepSearch) {
    var q = norm(query);
    var shown = ALL.filter(function (s) { return (catSel === 'all' || s.cat.id === catSel) && (!q || norm(s.name + ' ' + s.text.replace(/[>~*\[\]()]/g, ' ')).indexOf(q) >= 0); });
    var tabs = '<button type="button" data-isk-cat="all" class="' + (catSel === 'all' ? 'on' : '') + '" style="--ic:var(--hud-paper,#fff0d8)">Todas <i>' + ALL.length + '</i></button>' +
      CATS.map(function (c) { return '<button type="button" data-isk-cat="' + c.id + '" class="' + (catSel === c.id ? 'on' : '') + '" style="--ic:' + c.color + '">' + E(c.name) + ' <i>' + c.skills.length + '</i></button>'; }).join('');
    var slotName = target ? (target.closest('label') ? target.closest('label').firstChild.textContent.trim() : '') : '';
    var list = shown.map(function (s) {
      var idx = ALL.indexOf(s);
      return card(s, { foot: target ? '<button type="button" class="isk-use" data-isk-use="' + idx + '">Usar nesta Habilidade</button>' : '' });
    }).join('') || '<p class="isk-empty">Nenhuma Habilidade com esse termo.</p>';
    var head = dlg.querySelector('.isk-scroll');
    if (keepSearch && head) { dlg.querySelector('.isk-tabs').innerHTML = tabs; dlg.querySelector('.isk-grid').innerHTML = list; dlg.querySelector('.isk-count').textContent = shown.length + ' habilidades'; return; }
    var R = window.INSTRUMENT_SKILL_RULES || {};
    dlg.innerHTML = '<div class="isk-wrap">' +
      '<header class="isk-top"><div><small>' + (target ? 'ESCOLHER PARA · ' + E(slotName) : 'TIPOS DE INSTRUMENTOS') + '</small><b>HABILIDADES BÁSICAS <span>DE INSTRUMENTO</span></b></div><button type="button" class="isk-x" data-isk-close aria-label="Fechar">×</button></header>' +
      '<div class="isk-scroll">' +
        (target ? '' : '<section class="isk-rules"><p>' + inline(R.intro || '') + '</p><div class="isk-sup"><small>INSTRUMENTOS DE QUALIDADE SUPERIOR PODEM RECEBER</small><ul>' + (R.superior || []).map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul></div></section>') +
        '<div class="isk-sticky"><div class="isk-bar"><input type="search" id="iskSearch" placeholder="Buscar por nome ou efeito (ex.: Esquiva, Sound Combo, PM)…" value="' + E(query) + '" autocomplete="off"><span class="isk-count">' + shown.length + ' habilidades</span></div>' +
        '<nav class="isk-tabs">' + tabs + '</nav></div>' +
        '<div class="isk-grid">' + list + '</div>' +
      '</div></div>';
  }
  function open(forField) {
    ensureDialog(); target = forField || null; catSel = 'all'; query = '';
    paint();
    if (!dlg.open) dlg.showModal();
    var s = dlg.querySelector('#iskSearch'); if (s && !('ontouchstart' in window)) s.focus();
  }

  /* ---------- editor: botão "Escolher do catálogo" + prévia ---------- */
  function preview(field) {
    var label = field.closest('label'); if (!label) return;
    var box = label.nextElementSibling && label.nextElementSibling.classList.contains('isk-preview') ? label.nextElementSibling : null;
    var sk = find(field.value);
    if (!sk) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'isk-preview full'; label.after(box); }
    box.innerHTML = card(sk, { compact: true, tag: 'PRÉVIA' });
  }
  function enhanceEditor() {
    var ed = document.getElementById('equipmentEditor'); if (!ed) return;
    ed.querySelectorAll('textarea[data-eq-field^="ability"]').forEach(function (ta) {
      if (ta.dataset.isk) return; ta.dataset.isk = '1';
      ta.placeholder = 'Escolha do catálogo ou escreva uma Habilidade própria';
      var label = ta.closest('label');
      var b = document.createElement('button'); b.type = 'button'; b.className = 'isk-pick'; b.textContent = '♫ Escolher do catálogo';
      b.addEventListener('click', function (e) { e.preventDefault(); open(ta); });
      if (label) label.appendChild(b);
      ta.addEventListener('input', function () { preview(ta); });
      preview(ta);
    });
  }
  function addBrowseButton() {
    var bar = document.querySelector('#sheetEquipmentPage .eq-add-buttons');
    if (!bar || bar.querySelector('.isk-browse')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'isk-browse'; b.textContent = '♫ HABILIDADES DE INSTRUMENTO';
    b.addEventListener('click', function () { open(null); });
    bar.appendChild(b);
  }

  window.PhobiaInstrumentSkills = { all: ALL, categories: CATS, find: find, card: card, open: open };

  function wrapAfter(name, fn) {
    var o = window[name]; if (typeof o !== 'function' || o.__isk) return;
    var w = function () { var r = o.apply(this, arguments); try { fn(); } catch (e) { console.warn(e); } return r; };
    w.__isk = true; window[name] = w;
  }
  function init() {
    if (typeof eqAbilityCards !== 'function' || typeof openEquipmentEditor !== 'function') { setTimeout(init, 200); return; }
    window.eqAbilityCards = abilityCards;
    wrapAfter('openEquipmentEditor', enhanceEditor);
    wrapAfter('renderEquipmentPage', addBrowseButton);
    addBrowseButton();
    try { if (typeof renderEquipmentPage === 'function') renderEquipmentPage(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

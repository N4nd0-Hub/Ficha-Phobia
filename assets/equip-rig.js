/* ==========================================================
   PERSONA // PHOBIA — equip-rig.js
   Aba EQUIPAMENTOS repaginada:
   • "Loadout": o personagem no centro, os 5 espaços ao redor.
   • Clicar num espaço abre o seletor do arsenal, com comparação
     de bônus (▲ / ▼) antes de equipar — estilo menu de Persona.
   • Arrastar um item do arquivo até um espaço também equipa.
   • Animação de "encaixe" ao equipar e de saída ao retirar.
   Só usa as funções que já existem (setEquipmentSlot, eqItem,
   getEquippedModifiers, openEquipmentEditor...). Nada de dados novos.
   ========================================================== */
(function () {
  'use strict';
  if (window.__eqRig) return; window.__eqRig = true;

  var SC = { primary: 'var(--hud-acc,#ef2b97)', secondary: 'var(--hud-acc2,#6ce6ff)', protection: '#ffda4d', accessoryA: 'var(--hud-acc3,#96ff45)', accessoryB: '#c8aaff' };
  var GLYPH = { instrument: '♫', protection: '◈', accessory: '✧' };
  var ATTRS = ['FOR', 'MAG', 'TEC', 'AGI', 'VIT', 'SOR'];
  var SOC_SHORT = { Conhecimento: 'CON', Disciplina: 'DIS', Empatia: 'EMP', Charme: 'CHA', Coragem: 'COR', 'Expressão': 'EXP' };
  var built = false, picking = '', hoverId = null, lastSlots = null, dragType = '';

  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function reduced() { return document.body.classList.contains('hs-calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function eq() { try { return ensureEquipmentState(); } catch (e) { return null; } }
  function slots() { try { return EQ_SLOTS; } catch (e) { return []; } }
  function slotDef(k) { return slots().filter(function (s) { return s.key === k; })[0]; }
  function inSlot(k) { var q = eq(), d = slotDef(k); if (!q || !d) return null; return q.items.filter(function (it) { return it.id === q.slots[k] && it.type === d.type; })[0] || null; }
  function sn(n) { n = Number(n) || 0; return (n > 0 ? '+' : '') + n; }
  function photo(it, cls) {
    var src = String(it && it.imageData || '');
    var ok = /^data:image\/(?:png|jpeg|webp);base64,[\w+/=]+$/.test(src);
    return '<span class="' + cls + (ok ? ' has-img' : '') + '">' + (ok ? '<img src="' + src + '" alt="" loading="lazy" decoding="async">' : '<i>' + (GLYPH[it && it.type] || '♫') + '</i>') + '</span>';
  }
  function chips(it) {
    if (!it) return '';
    var c = [];
    if (it.type === 'instrument') {
      if (it.damage) c.push('<em><b>' + E(it.damage) + '</b>DANO</em>');
      if (it.accuracy) c.push('<em><b>' + E(it.accuracy) + '</b>ACERTO</em>');
      if (it.hab) c.push('<em><b>' + E(it.hab) + '</b>HAB</em>');
    } else if (it.type === 'protection') {
      if (it.protection) c.push('<em><b>' + E(it.protection) + '</b>PROT</em>');
      if (Number(it.socialBonus) && it.socialSkill) c.push('<em><b>' + sn(it.socialBonus) + '</b>' + E((SOC_SHORT[it.socialSkill] || it.socialSkill)) + '</em>');
      if (Number(it.dodgeBonus)) c.push('<em><b>' + sn(it.dodgeBonus) + '</b>ESQ</em>');
    } else {
      ATTRS.forEach(function (k) { var v = Number(it.statBonuses && it.statBonuses[k]) || 0; if (v) c.push('<em><b>' + sn(v) + '</b>' + k + '</em>'); });
    }
    return c.join('');
  }
  function brief(it) { try { return eqBrief(it); } catch (e) { return ''; } }

  /* bônus simulados: troca o item do espaço por um instante e lê os modificadores */
  function modsWith(slotKey, itemId) {
    var q = eq(); if (!q) return null;
    var keep = q.slots[slotKey];
    q.slots[slotKey] = itemId;
    var m; try { m = getEquippedModifiers(); } finally { q.slots[slotKey] = keep; }
    return m;
  }
  function deltaOf(a, b) {
    var out = [];
    ATTRS.forEach(function (k) { var d = (b.attrs[k] || 0) - (a.attrs[k] || 0); if (d) out.push([k, d]); });
    Object.keys(SOC_SHORT).forEach(function (k) { var d = (b.social[k] || 0) - (a.social[k] || 0); if (d) out.push([SOC_SHORT[k], d]); });
    var dd = (b.dodge || 0) - (a.dodge || 0); if (dd) out.push(['ESQ', dd]);
    return out;
  }

  /* ---------- montar ---------- */
  function build() {
    var col = $('#sheetEquipmentPage .eq-gear-column'); if (!col) return false;
    var rig = document.createElement('section');
    rig.id = 'eqRig'; rig.className = 'er'; rig.setAttribute('aria-label', 'Equipamento em uso');
    rig.innerHTML =
      '<header class="er-head"><div><small>LOADOUT // EM CENA</small><b>SEU EQUIPAMENTO</b></div>' +
      '<div class="er-head-side"><span class="er-count" id="erCount">0/5</span><small>Clique num espaço para trocar · arraste itens do arquivo até aqui</small></div></header>' +
      '<div class="er-stage">' +
        '<div class="er-col er-left" data-er-col="left"></div>' +
        '<div class="er-center" id="erCenter"></div>' +
        '<div class="er-col er-right" data-er-col="right"></div>' +
      '</div>' +
      '<div class="er-picker" id="erPicker" hidden role="dialog" aria-label="Escolher equipamento"></div>';
    col.insertBefore(rig, col.firstChild);

    rig.addEventListener('click', function (e) {
      var s = e.target.closest('[data-er-slot]'); if (s) { openPicker(s.dataset.erSlot); return; }
      var pick = e.target.closest('[data-er-pick]');
      if (pick) { if (pick.getAttribute('aria-disabled') === 'true') return; equip(picking, pick.dataset.erPick); return; }
      if (e.target.closest('[data-er-off]')) { equip(picking, ''); return; }
      if (e.target.closest('[data-er-close]')) { closePicker(); return; }
      var nw = e.target.closest('[data-er-new]');
      if (nw) {
        var t = nw.dataset.erNew; closePicker();
        try { openEquipmentEditor(t); } catch (x) {}
        var ed = document.getElementById('equipmentEditor');
        if (ed) setTimeout(function () { ed.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); }, 60);
      }
      var view = e.target.closest('[data-er-view]');
      if (view) {
        var id = view.dataset.erView; closePicker();
        try { renderEquipmentViewer(id); } catch (x) {}
        var ed2 = document.getElementById('equipmentEditor');
        if (ed2) setTimeout(function () { ed2.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); }, 60);
      }
    });
    rig.addEventListener('pointerover', function (e) {
      var r = e.target.closest('[data-er-pick]'); var id = r ? r.dataset.erPick : null;
      if (id !== hoverId) { hoverId = id; paintCenter(); }
    });
    rig.addEventListener('focusin', function (e) {
      var r = e.target.closest('[data-er-pick]'); if (r && r.dataset.erPick !== hoverId) { hoverId = r.dataset.erPick; paintCenter(); }
    });
    rig.addEventListener('pointerleave', function () { if (hoverId) { hoverId = null; paintCenter(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && picking) closePicker(); });
    document.addEventListener('click', function (e) {
      if (!picking) return;
      if (!document.contains(e.target)) return;
      if (e.target.closest('#erPicker') || e.target.closest('[data-er-slot]')) return;
      closePicker();
    });

    /* arrastar do arquivo para um espaço */
    var page = $('#sheetEquipmentPage');
    page.addEventListener('dragstart', function (e) {
      var card = e.target.closest && e.target.closest('.eq-item[data-er-id]'); if (!card) return;
      dragType = card.dataset.type;
      try { e.dataTransfer.setData('text/plain', 'eq:' + card.dataset.erId); e.dataTransfer.effectAllowed = 'move'; } catch (x) {}
      rig.classList.add('is-dragging'); rig.dataset.drag = dragType;
      card.classList.add('is-lifted');
    });
    page.addEventListener('dragend', function (e) {
      rig.classList.remove('is-dragging'); rig.removeAttribute('data-drag'); dragType = '';
      document.querySelectorAll('.er-slot.is-over').forEach(function (s) { s.classList.remove('is-over'); });
      var card = e.target.closest && e.target.closest('.eq-item'); if (card) card.classList.remove('is-lifted');
    });
    rig.addEventListener('dragover', function (e) {
      var s = e.target.closest('[data-er-slot]'); if (!s || !dragType) return;
      var d = slotDef(s.dataset.erSlot); if (!d || d.type !== dragType) return;
      e.preventDefault();
      document.querySelectorAll('.er-slot.is-over').forEach(function (x) { if (x !== s) x.classList.remove('is-over'); });
      s.classList.add('is-over');
    });
    rig.addEventListener('dragleave', function (e) { var s = e.target.closest('[data-er-slot]'); if (s && !s.contains(e.relatedTarget)) s.classList.remove('is-over'); });
    rig.addEventListener('drop', function (e) {
      var s = e.target.closest('[data-er-slot]'); if (!s) return;
      var raw = ''; try { raw = e.dataTransfer.getData('text/plain'); } catch (x) {}
      if (!/^eq:/.test(raw)) return;
      e.preventDefault();
      equip(s.dataset.erSlot, raw.slice(3));
    });

    /* o arquivo fica sempre aberto (sem gaveta) */
    var coll = $('#eqCollection'); if (coll) coll.open = true;
    built = true;
    return true;
  }

  function equip(slotKey, itemId) {
    if (!slotKey) return;
    var before = (eq() || {}).slots ? eq().slots[slotKey] : '';
    try { setEquipmentSlot(slotKey, itemId || ''); } catch (e) { return; }
    var after = eq().slots[slotKey];
    closePicker();
    if (before !== after) {
      try {
        var it = after ? eqItem(after) : null;
        toast(it ? String(it.name).toUpperCase() + ' // EQUIPADO' : 'ESPAÇO LIBERADO');
      } catch (e) {}
    }
  }

  /* ---------- seletor ---------- */
  function openPicker(slotKey) {
    if (picking === slotKey) { closePicker(); return; }
    picking = slotKey; hoverId = null;
    paintPicker();
    var p = $('#erPicker'); p.hidden = false;
    var rig = $('#eqRig'); rig.classList.add('is-picking'); rig.dataset.pick = slotKey;
    var d = slotDef(slotKey); rig.dataset.side = (d && d.type === 'instrument') ? 'left' : 'right';
    document.querySelectorAll('.er-slot').forEach(function (s) { s.classList.toggle('is-picking', s.dataset.erSlot === slotKey); s.setAttribute('aria-expanded', String(s.dataset.erSlot === slotKey)); });
    placePicker();
    if (window.innerWidth < 760) setTimeout(function () { p.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' }); }, 60);
    var first = p.querySelector('[data-er-pick]:not([aria-disabled="true"])') || p.querySelector('[data-er-close]');
    if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) {} }, 40);
  }
  function closePicker() {
    if (!picking) return;
    var k = picking; picking = ''; hoverId = null;
    var p = $('#erPicker'); if (p) p.hidden = true;
    var rig = $('#eqRig'); if (rig) { rig.classList.remove('is-picking'); rig.removeAttribute('data-pick'); }
    placePicker();
    document.querySelectorAll('.er-slot').forEach(function (s) { s.classList.remove('is-picking'); s.setAttribute('aria-expanded', 'false'); });
    paintCenter();
    var s = document.querySelector('[data-er-slot="' + k + '"]'); if (s && document.activeElement && document.activeElement.closest && document.activeElement.closest('#erPicker')) s.focus({ preventScroll: true });
  }
  function paintPicker() {
    var p = $('#erPicker'); if (!p || !picking) return;
    var d = slotDef(picking), q = eq(); if (!d || !q) return;
    var cur = inSlot(picking), base = modsWith(picking, q.slots[picking]);
    var list = q.items.filter(function (it) { return it.type === d.type; });
    var rows = list.map(function (it) {
      var on = cur && cur.id === it.id;
      var used = slots().filter(function (s) { return s.key !== picking && q.slots[s.key] === it.id; }).length;
      var blocked = !on && used >= Math.max(1, Number(it.qty) || 1);
      var dl = on ? [] : deltaOf(base, modsWith(picking, it.id));
      var cmp = dl.map(function (x) { return '<span class="' + (x[1] > 0 ? 'up' : 'down') + '">' + x[0] + ' ' + sn(x[1]) + (x[1] > 0 ? ' ▲' : ' ▼') + '</span>'; }).join('');
      if (d.type === 'instrument' && !on && cur) {
        if (it.damage && it.damage !== cur.damage) cmp += '<span class="eq">DANO ' + E(cur.damage || '—') + ' → ' + E(it.damage) + '</span>';
      }
      if (d.type === 'protection' && !on && cur && String(it.protection || '') !== String(cur.protection || '')) {
        var a = parseFloat(cur.protection) || 0, b = parseFloat(it.protection) || 0;
        cmp += '<span class="' + (b > a ? 'up' : b < a ? 'down' : 'eq') + '">PROT ' + E(cur.protection || '—') + ' → ' + E(it.protection || '—') + '</span>';
      }
      return '<button type="button" class="er-row' + (on ? ' is-on' : '') + (blocked ? ' is-blocked' : '') + '" data-er-pick="' + E(it.id) + '"' + (blocked || on ? ' aria-disabled="true"' : '') + '>' +
        photo(it, 'er-row-pic') +
        '<span class="er-row-copy"><b>' + E(it.name || 'Sem nome') + '</b><small>' + E(brief(it)) + '</small><span class="er-chips">' + chips(it) + '</span></span>' +
        '<span class="er-row-cmp">' + (on ? '<span class="tag">EM USO</span>' : blocked ? '<span class="tag dim">JÁ EQUIPADO</span>' : (cmp || '<span class="eq">SEM MUDANÇA DE BÔNUS</span>')) + '</span>' +
      '</button>';
    }).join('');
    p.style.setProperty('--sc', SC[picking]);
    p.innerHTML =
      '<header class="er-pk-head"><span class="er-pk-letter">' + d.serial[0] + '</span><div><small>ESCOLHER // ' + E(d.title) + '</small><b>' + (cur ? E(cur.name) : 'Espaço vazio') + '</b></div>' +
      '<button type="button" class="er-pk-x" data-er-close aria-label="Fechar">×</button></header>' +
      '<div class="er-pk-list">' + (rows || '<p class="er-pk-empty">Nenhum ' + E(d.type === 'instrument' ? 'instrumento' : d.type === 'protection' ? 'vestimenta' : 'acessório') + ' no seu arquivo ainda.</p>') + '</div>' +
      '<footer class="er-pk-foot">' +
        (cur ? '<button type="button" data-er-view="' + E(cur.id) + '">◉ Ver ficha do item</button><button type="button" class="off" data-er-off>Retirar ×</button>' : '') +
        '<button type="button" class="new" data-er-new="' + d.type + '">+ Cadastrar novo</button>' +
      '</footer>';
  }

  /* ---------- pintar ---------- */
  function slotHTML(s) {
    var it = inSlot(s.key);
    return '<button type="button" class="er-slot er-' + s.type + (it ? ' is-on' : ' is-empty') + (picking === s.key ? ' is-picking' : '') + '" data-er-slot="' + s.key + '" style="--sc:' + SC[s.key] + '" aria-expanded="' + (picking === s.key) + '" aria-label="' + E(s.title) + ': ' + E(it ? it.name : 'vazio') + '">' +
      '<span class="er-letter">' + s.serial[0] + '</span>' +
      (it ? photo(it, 'er-pic') : '<span class="er-pic er-pic-empty"><i>' + s.glyph + '</i></span>') +
      '<span class="er-copy"><small>' + E(s.title) + '</small><b>' + E(it ? it.name : '+ Equipar') + '</b>' +
      (it ? '<span class="er-chips">' + chips(it) + '</span>' : '<span class="er-hint">' + (s.type === 'instrument' ? 'Sua arma no palco' : s.type === 'protection' ? 'Roupa de batalha' : 'Bônus de atributos') + '</span>') + '</span>' +
      '<span class="er-flash" aria-hidden="true"></span>' +
    '</button>';
  }
  /* no celular o seletor abre logo abaixo do espaço tocado; no computador flutua sobre o loadout */
  function placePicker() {
    var p = $('#erPicker'), rig = $('#eqRig'); if (!p || !rig) return;
    var slot = picking && window.innerWidth < 760 ? document.querySelector('[data-er-slot="' + picking + '"]') : null;
    if (slot) { if (slot.nextSibling !== p) slot.parentNode.insertBefore(p, slot.nextSibling); p.classList.add('is-inline'); }
    else { if (p.parentNode !== rig) rig.appendChild(p); p.classList.remove('is-inline'); }
  }
  function paintSlots() {
    var L = $('#eqRig [data-er-col="left"]'), R = $('#eqRig [data-er-col="right"]'); if (!L || !R) return;
    var pk = $('#erPicker'), rigEl = $('#eqRig'); if (pk && rigEl && pk.parentNode !== rigEl) rigEl.appendChild(pk);
    var ss = slots();
    L.innerHTML = ss.filter(function (s) { return s.type === 'instrument'; }).map(slotHTML).join('');
    R.innerHTML = ss.filter(function (s) { return s.type !== 'instrument'; }).map(slotHTML).join('');
    var q = eq(), n = ss.filter(function (s) { return !!inSlot(s.key); }).length;
    var c = $('#erCount'); if (c) c.textContent = n + '/' + ss.length;
    /* animação de encaixe / saída */
    var now = {}; ss.forEach(function (s) { now[s.key] = q.slots[s.key] || ''; });
    if (lastSlots && !reduced()) {
      ss.forEach(function (s) {
        if (now[s.key] === lastSlots[s.key]) return;
        var el = document.querySelector('[data-er-slot="' + s.key + '"]'); if (!el) return;
        el.classList.add(now[s.key] ? 'er-pop' : 'er-out');
        setTimeout(function () { el.classList.remove('er-pop', 'er-out'); }, 900);
        if (now[s.key]) burst(el);
      });
    }
    lastSlots = now;
    if (picking) placePicker();
  }
  function burst(el) {
    var fx = document.createElement('span'); fx.className = 'er-burst'; fx.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 10; i++) {
      var b = document.createElement('i');
      b.style.setProperty('--a', (i * 36 + Math.random() * 18) + 'deg');
      b.style.setProperty('--d', (40 + Math.random() * 46) + 'px');
      fx.appendChild(b);
    }
    el.appendChild(fx);
    setTimeout(function () { fx.remove(); }, 800);
  }

  function paintCenter() {
    var box = $('#erCenter'); if (!box) return;
    var sheet = (typeof state !== 'undefined' && state.charSheet) || {};
    var name = (sheet.profile && (sheet.profile.codename || sheet.profile.name)) || 'Seu personagem';
    var ph = String(sheet.photoData || '');
    var q = eq(); if (!q) return;
    var cur = null, prev = null;
    try { cur = getEquippedModifiers(); } catch (e) { return; }
    if (picking && hoverId) prev = modsWith(picking, hoverId);
    var main = inSlot('primary'), prot = inSlot('protection');
    var calc = null; try { calc = calculateSheet(); } catch (e) {}
    var cells = ATTRS.map(function (k) {
      var v = cur.attrs[k] || 0, p = prev ? (prev.attrs[k] || 0) : v, d = p - v;
      var tot = calc && typeof calc[k] === 'number' ? calc[k] : null;
      return '<div class="er-stat' + (v ? ' has' : '') + (d > 0 ? ' up' : d < 0 ? ' down' : '') + '"><small>' + k + '</small><b>' + (tot != null ? tot + (d ? '<i>' + sn(tot + d) + '</i>' : '') : sn(v)) + '</b><em>' + (d ? (d > 0 ? '▲ ' : '▼ ') + sn(d) : v ? sn(v) + ' EQP' : '—') + '</em></div>';
    }).join('');
    var soc = Object.keys(SOC_SHORT).map(function (k) {
      var v = cur.social[k] || 0, p = prev ? (prev.social[k] || 0) : v;
      if (!v && !p) return '';
      return '<span class="' + (p > v ? 'up' : p < v ? 'down' : '') + '">' + k.toUpperCase() + ' <b>' + sn(p) + '</b></span>';
    }).join('');
    var dv = cur.dodge || 0, dp = prev ? prev.dodge || 0 : dv;
    if (dv || dp) soc += '<span class="' + (dp > dv ? 'up' : dp < dv ? 'down' : '') + '">ESQUIVA <b>' + sn(dp) + '</b></span>';
    var load = null; try { load = calculateCarryLoad(); } catch (e) {}
    var max = calc ? Math.max(0, Number(calc.carry) || 0) : 0, used = load ? load.total : 0;
    var pct = max ? Math.min(100, used / max * 100) : (used ? 100 : 0);
    function fmtW(v) { try { return bpWeightText(v); } catch (e) { return v; } }
    box.innerHTML =
      '<div class="er-hero">' +
        '<div class="er-spot" aria-hidden="true"></div>' +
        '<div class="er-photo">' + (ph ? '<img src="' + E(ph) + '" alt="">' : '<span>' + E(String(name).trim().slice(0, 1).toUpperCase() || '?') + '</span>') + '</div>' +
        '<div class="er-name"><small>LOADOUT DE</small><b>' + E(name) + '</b></div>' +
      '</div>' +
      '<div class="er-weapon"><small>ARMA EM MÃOS</small><b>' + E(main ? main.name : 'Desarmado') + '</b>' +
        '<div class="er-wstats"><span><small>ACERTO</small><b>' + E(main && main.accuracy || '—') + '</b></span><span><small>DANO</small><b>' + E(main && main.damage || '—') + '</b></span><span><small>ALCANCE</small><b>' + E(main && main.range || '—') + '</b></span><span><small>PROTEÇÃO</small><b>' + E(prot && prot.protection || '—') + '</b></span></div></div>' +
      '<div class="er-stats' + (prev ? ' is-preview' : '') + '">' + cells + '</div>' +
      (soc ? '<div class="er-soc">' + soc + '</div>' : '') +
      '<div class="er-load' + (used > max ? ' is-over' : '') + '"><div><small>CARGA</small><b>' + fmtW(used) + ' <em>/ ' + fmtW(max) + '</em></b></div><i><i style="width:' + pct.toFixed(1) + '%"></i></i></div>' +
      (prev ? '<div class="er-preview-tag">PRÉVIA // ' + E((eqItem(hoverId) || {}).name || '') + '</div>' : '');
  }

  /* arquivo: cartões arrastáveis e selo "em uso" */
  function decorateInventory() {
    var q = eq(); if (!q) return;
    document.querySelectorAll('#equipmentInventory .eq-item').forEach(function (card) {
      var b = card.querySelector('[data-eq-quick]'); if (!b) return;
      var id = b.dataset.eqQuick, it = eqItem(id);
      card.dataset.erId = id; card.draggable = true;
      var worn = slots().filter(function (s) { return q.slots[s.key] === id; });
      card.classList.toggle('is-worn', worn.length > 0);
      if (worn.length && !card.querySelector('.er-stamp')) card.insertAdjacentHTML('afterbegin', '<span class="er-stamp">EM USO · ' + worn.map(function (s) { return s.serial[0]; }).join('/') + '</span>');
      if (it && !card.querySelector('.er-card-chips')) {
        var top = card.querySelector('.eq-item-top');
        if (top) top.insertAdjacentHTML('afterend', '<div class="er-card-chips er-chips">' + chips(it) + '</div>');
      }
    });
  }

  function render() {
    if (!built && !build()) return;
    var coll = $('#eqCollection'); if (coll && !coll.open) coll.open = true;
    paintSlots(); paintCenter(); decorateInventory();
    if (picking) paintPicker();
  }
  window.renderEquipRig = render;

  function wrap(name) {
    var o = window[name]; if (typeof o !== 'function' || o.__er) return;
    var w = function () { var r = o.apply(this, arguments); try { render(); } catch (e) { console.warn(e); } return r; };
    w.__er = true; window[name] = w;
  }
  function init() {
    if (typeof ensureEquipmentState !== 'function' || typeof state === 'undefined' || !state.charSheet || !document.getElementById('sheetEquipmentPage')) { setTimeout(init, 200); return; }
    wrap('renderEquipmentPage'); wrap('renderEquipmentInventory'); wrap('renderCharacterSheet');
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

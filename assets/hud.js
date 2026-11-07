/* ==========================================================
   PERSONA // PHOBIA — hud.js
   Monta a interface HUD em cima do site existente.

   Não reescreve a lógica: os controles que já existem (período,
   camada, busca, lista de distritos, sinais do mestre, fundo do
   mapa, legenda) são MOVIDOS para os painéis do HUD, levando
   junto os eventos que o site já liga neles.

   Também cuida das animações de troca de página, de aba da ficha
   e dos painéis (Web Animations API, só transform/opacity).
   ========================================================== */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,1,.36,1)', BACK = 'cubic-bezier(.34,1.56,.64,1)';
  var reduceQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var WEEK = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  var PERIOD = { morning: 'MANHÃ', afternoon: 'TARDE', night: 'NOITE' };
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="#ffcf59" stroke-width="2.6" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>';
  var DUSK = '<svg viewBox="0 0 24 24" fill="none" stroke="#ff9a5c" stroke-width="2.6" aria-hidden="true"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M5 10l2 2M19 10l-2 2"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="#c7d2ff" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 1 1 8.5 4a7 7 0 0 0 11.5 11.5z"/></svg>';
  var SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>';

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function reduced() { return reduceQ.matches; }
  function anim(node, frames, opts) { if (node && node.animate && !reduced()) return node.animate(frames, opts); return null; }
  function S() { try { return state; } catch (e) { return {}; } }

  var ui = {};

  /* ---------------- cabeçalho ---------------- */
  var TAB_LABEL = { mapPage: 'MAPA', areasPage: 'GUIA', calendarPage: 'AGENDA', hackPage: 'NET//TRACE' };
  var PAGE_TITLE = { areasPage: ['GUIA DE ÁREAS', 'TOKYO POCKET GUIDE'], calendarPage: ['AGENDA', 'TOKYO 2000'], hackPage: ['NET//TRACE', 'REDE PRIVADA'] };
  var SHEET_TITLE = {
    core: ['STATUS', 'FICHA DE PERSONAGEM'], persona: ['PERSONA', 'IDENTIDADE E AFINIDADES'], magic: ['MAGIAS', 'DECK E GRIMÓRIO'],
    social: ['SOCIAL', 'DISCO DE FAMA'],
    awakening: ['DESPERTARES', 'TRAMA E RESSONÂNCIA'], equipment: ['EQUIPAMENTOS', 'ITENS E MOCHILA'], traits: ['VANTAGENS & DEFEITOS', ''],
    bonds: ['VÍNCULOS', 'SOCIAL LINKS'], record: ['DOSSIÊ', 'HISTÓRIA E MEMÓRIAS']
  };

  function buildHeader() {
    var top = $('.topbar');
    if (!top) return;
    ui.title = el('div', 'hud-title', '<span></span><small></small>');
    top.insertBefore(ui.title, top.firstChild);
    document.querySelectorAll('.global-tab[data-page]').forEach(function (b) {
      if (TAB_LABEL[b.dataset.page]) b.textContent = TAB_LABEL[b.dataset.page];
    });
    var notes = $('#openNotesTop'); if (notes) notes.textContent = 'NOTAS';
    var theme = $('#siteThemeButton'); if (theme) theme.setAttribute('aria-label', 'Trocar o tema do site');

    /* celular: tudo do cabeçalho vai para um menu */
    ui.menuBtn = el('button', 'hud-menu-btn', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h12"/></svg>MENU');
    ui.menuBtn.type = 'button';
    ui.menuBtn.setAttribute('aria-expanded', 'false');
    top.appendChild(ui.menuBtn);
    ui.menuExtra = el('div', 'hud-menu-extra');
    top.appendChild(ui.menuExtra);
    ui.menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !document.body.classList.contains('hud-menu-open');
      document.body.classList.toggle('hud-menu-open', open);
      ui.menuBtn.setAttribute('aria-expanded', String(open));
      if (open) anim(top, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE });
    });
    top.addEventListener('click', function (e) {
      if (e.target.closest('.global-tab, .workspace-btn, #siteThemeButton, .hud-opts-btn, .hud-master-btn')) closeMenu();
    });
  }
  function closeMenu() {
    document.body.classList.remove('hud-menu-open');
    if (ui.menuBtn) ui.menuBtn.setAttribute('aria-expanded', 'false');
  }

  /* move camada, botões do canto e ferramentas da barra para o menu no celular */
  var phoneQ = window.matchMedia('(max-width: 700px)');
  function place() {
    if (!ui.menuExtra || !ui.layer) return;
    var phone = phoneQ.matches, shell = $('#mapPage .map-shell'), tools = $('#phobiaDeckBar .deck-tools'), area = $('#phobiaDeckBar .deck-area');
    if (phone) {
      ui.menuExtra.appendChild(ui.layer);
      ui.menuExtra.appendChild(ui.corner);
      if (tools) ui.menuExtra.appendChild(tools);
    } else {
      if (shell) { shell.appendChild(ui.layer); shell.appendChild(ui.corner); }
      if (tools && area) area.appendChild(tools);
      closeMenu();
    }
  }

  function currentSheetPage() {
    var t = $('#characterPage .sheet-page-tab.active');
    return t ? t.dataset.sheetPage : 'core';
  }

  function updateHeader() {
    var st = S(), sheet = st.workspace === 'sheet', page = st.page || 'mapPage';
    var onMap = !sheet && page === 'mapPage';
    document.body.classList.toggle('hud-on-map', onMap);
    if (!ui.title) return;
    var t = sheet ? SHEET_TITLE[currentSheetPage()] || SHEET_TITLE.core : PAGE_TITLE[page] || ['', ''];
    ui.title.firstChild.textContent = t[0];
    ui.title.lastChild.textContent = t[1];
  }

  /* ---------------- HUD do mapa ---------------- */
  function buildMap() {
    var layout = $('#mapPage .map-layout'), shell = $('#mapPage .map-shell');
    if (!layout || !shell) return;
    ui.layout = layout;

    shell.appendChild(el('div', 'hud-corner hud-map-only'));

    /* calendário */
    ui.cal = el('div', 'hud-cal hud-map-only',
      '<div class="hud-cal-day"><small></small><b></b></div>' +
      '<div class="hud-cal-copy"><b>TOKYO</b><span class="hud-cal-chips">' +
      '<span class="hud-cal-week"></span>' +
      '<button type="button" class="hud-period-btn" aria-haspopup="true" aria-expanded="false" title="Trocar o período do dia"></button>' +
      '<span class="hud-cal-year"></span></span></div>');
    shell.appendChild(ui.cal);
    ui.periodBtn = $('.hud-period-btn', ui.cal);

    ui.periodPop = el('div', 'hud-pop hud-period-pop hud-map-only');
    ui.periodPop.hidden = true;
    var timeRow = document.querySelector('#mapPage .sidebar [data-time]');
    if (timeRow) ui.periodPop.appendChild(timeRow.parentElement);
    shell.appendChild(ui.periodPop);
    pop(ui.periodBtn, ui.periodPop);
    ui.periodPop.addEventListener('click', function (e) { if (e.target.closest('[data-time]')) setTimeout(function () { closeAll(); }, 120); });

    /* busca + lista de distritos */
    var input = $('#atlasDistrictSearch');
    ui.search = el('label', 'hud-search hud-map-only', SEARCH);
    if (input) { input.placeholder = 'Onde vamos? Distrito ou local'; ui.search.appendChild(input); }
    ui.count = el('span', 'hud-search-count');
    ui.search.appendChild(ui.count);
    shell.appendChild(ui.search);

    ui.results = el('div', 'hud-pop hud-results hud-map-only');
    ui.results.hidden = true;
    ui.results.setAttribute('role', 'region');
    ui.results.setAttribute('aria-label', 'Distritos');
    var list = $('#districtList');
    if (list) ui.results.appendChild(list);
    shell.appendChild(ui.results);
    if (input) {
      input.addEventListener('focus', function () { openPop(ui.results); });
      input.addEventListener('input', function () { openPop(ui.results); });
    }
    ui.results.addEventListener('click', function (e) {
      if (e.target.closest('[data-atlas-district]')) setTimeout(closeAll, 60);
    });

    /* camada */
    ui.layer = el('div', 'hud-layer hud-map-only');
    var reality = $('#realityBtn');
    if (reality) ui.layer.appendChild(reality.parentElement);
    shell.appendChild(ui.layer);

    /* canto de baixo: mestre + fundo/legenda */
    var corner = el('div', 'hud-corner-btns hud-map-only');
    var masterBtn = el('button', 'hud-master-btn', '◆ MESTRE');
    masterBtn.type = 'button';
    var optsBtn = el('button', 'hud-opts-btn', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>FUNDO E LEGENDA');
    optsBtn.type = 'button';
    corner.appendChild(masterBtn); corner.appendChild(optsBtn);
    shell.appendChild(corner);
    ui.corner = corner;

    ui.masterPop = el('div', 'hud-pop hud-master-pop hud-map-only', '<div class="hud-pop-title">◆ MESTRE<button type="button" aria-label="Fechar">×</button></div>');
    ui.masterPop.hidden = true;
    var cog = $('#cogEditor');
    if (cog) { cog.open = true; ui.masterPop.appendChild(cog); }
    shell.appendChild(ui.masterPop);
    pop(masterBtn, ui.masterPop);

    ui.optsPop = el('div', 'hud-pop hud-opts-pop hud-map-only', '<div class="hud-pop-title">FUNDO E LEGENDA<button type="button" aria-label="Fechar">×</button></div><div class="hud-opts-body"></div>');
    ui.optsPop.hidden = true;
    var body = $('.hud-opts-body', ui.optsPop);
    var vis = $('#mapVisualOptions');
    if (vis) { vis.open = true; body.appendChild(vis); }
    var legend = document.querySelector('#mapPage .sidebar .legend');
    if (legend) { body.appendChild(el('span', 'hud-label', 'LEGENDA')); body.appendChild(legend); }
    var themeBtn = el('button', 'hud-opts-theme', 'Trocar o tema do site');
    themeBtn.type = 'button';
    themeBtn.addEventListener('click', function () { closeAll(); var t = $('#siteThemeButton'); if (t) t.click(); });
    body.appendChild(themeBtn);
    shell.appendChild(ui.optsPop);
    pop(optsBtn, ui.optsPop);

    [ui.masterPop, ui.optsPop].forEach(function (p) {
      $('.hud-pop-title button', p).addEventListener('click', closeAll);
    });

    /* dossiê flutuante */
    var dossier = $('#districtDossierPanel');
    if (dossier) {
      var close = el('button', 'hud-dossier-close', '×');
      close.type = 'button';
      close.setAttribute('aria-label', 'Fechar dossiê');
      close.addEventListener('click', function () { layout.classList.add('hud-dossier-closed'); });
      dossier.insertBefore(close, dossier.firstChild);
    }
  }

  /* ---------------- painéis ---------------- */
  var openPanel = null, openTrigger = null;
  function pop(trigger, panel) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (openPanel === panel) closeAll(); else openPop(panel, trigger);
    });
  }
  function openPop(panel, trigger) {
    if (openPanel === panel) return;
    closeAll();
    closeMenu();
    panel.hidden = false;
    openPanel = panel; openTrigger = trigger || null;
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    anim(panel, [{ opacity: 0, transform: 'translateY(10px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE });
    var items = panel.querySelectorAll('.jump, .time-btn, .map-visual-body > *, .legend > div');
    Array.prototype.slice.call(items, 0, 14).forEach(function (n, i) {
      anim(n, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 40 + i * 22, easing: EASE, fill: 'backwards' });
    });
  }
  function closeAll() {
    if (!openPanel) return;
    openPanel.hidden = true;
    if (openTrigger) openTrigger.setAttribute('aria-expanded', 'false');
    openPanel = null; openTrigger = null;
  }
  document.addEventListener('click', function (e) {
    if (!openPanel) return;
    if (openPanel.contains(e.target) || (openTrigger && openTrigger.contains(e.target)) || (ui.search && ui.search.contains(e.target))) return;
    if (!document.contains(e.target)) return;
    closeAll();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openPanel) { var t = openTrigger; closeAll(); if (t) t.focus(); }
  });

  /* ---------------- atualizações ---------------- */
  var lastDay = '';
  function updateCal() {
    if (!ui.cal) return;
    var st = S(), ymd = st.campaignDate || '2000-04-17', p = ymd.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    $('.hud-cal-day small', ui.cal).textContent = MONTHS[d.getMonth()];
    var dayEl = $('.hud-cal-day b', ui.cal);
    dayEl.textContent = String(d.getDate()).padStart(2, '0');
    $('.hud-cal-week', ui.cal).textContent = WEEK[d.getDay()];
    $('.hud-cal-year', ui.cal).textContent = String(d.getFullYear());
    var t = st.time || 'afternoon';
    ui.periodBtn.innerHTML = (t === 'morning' ? SUN : t === 'night' ? MOON : DUSK) + PERIOD[t];
    if (lastDay && lastDay !== ymd) {
      anim($('.hud-cal-day', ui.cal), [
        { transform: 'rotate(-4deg) rotateX(0)' }, { transform: 'rotate(-4deg) rotateX(90deg)', offset: .45 },
        { transform: 'rotate(-4deg) rotateX(0)' }], { duration: 420, easing: EASE });
    }
    lastDay = ymd;
  }
  function updateCount() {
    if (!ui.count) return;
    var st = S(), ds = st.districts || {}, ids = Object.keys(ds);
    var open = ids.filter(function (k) { return !(st.mode === 'player' && ds[k].state === 'locked'); }).length;
    ui.count.textContent = open + '/' + ids.length;
  }
  var lastSelected = null;
  function onDossier() {
    if (!ui.layout) return;
    var sel = S().selected;
    if (sel !== lastSelected) {
      var wasClosed = ui.layout.classList.contains('hud-dossier-closed');
      ui.layout.classList.remove('hud-dossier-closed');
      if (lastSelected !== null || wasClosed) {
        anim($('#districtDossierPanel'), [{ opacity: 0, transform: 'translateX(40px) rotate(2deg)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: BACK });
      }
      lastSelected = sel;
    }
  }
  function updateAll() { updateHeader(); updateCal(); updateCount(); }

  /* ---------------- animações de página ---------------- */
  var slash = null;
  function sweep() {
    if (reduced()) return;
    if (!slash) { slash = el('div', 'hud-slash'); slash.setAttribute('aria-hidden', 'true'); document.body.appendChild(slash); }
    anim(slash, [
      { transform: 'translateX(-120%) skewX(-14deg)' },
      { transform: 'translateX(520%) skewX(-14deg)' }
    ], { duration: 520, easing: 'cubic-bezier(.7,0,.2,1)' });
  }
  function enterPage(page) {
    if (!page || reduced()) return;
    anim(page, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
  }
  function stagger(root, sel, max) {
    if (!root || reduced()) return;
    var kids = Array.prototype.slice.call(root.querySelectorAll(sel)).filter(function (n) { return n.offsetParent !== null; }).slice(0, max || 12);
    kids.forEach(function (n, i) {
      anim(n, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay: 60 + i * 45, easing: EASE, fill: 'backwards' });
    });
  }
  var lastView = '';
  function onView() {
    var st = S(), key = st.workspace === 'sheet' ? 'sheet:' + currentSheetPage() : (st.page || 'mapPage');
    updateHeader();
    if (!lastView) { lastView = key; return; }
    if (key === lastView) return;
    var changedArea = key.split(':')[0] !== lastView.split(':')[0];
    lastView = key;
    if (changedArea) sweep();
    var active = $('.site > .page.active');
    if (st.workspace === 'sheet') {
      var panel = $('#characterPage .sheet-subpage.active');
      stagger(panel || active, ':scope > *', 10);
      anim(ui.title, [{ opacity: 0, transform: 'translateX(-30px) skewX(-12deg)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
    } else if (active && active.id !== 'mapPage') {
      enterPage(active);
      anim(ui.title, [{ opacity: 0, transform: 'translateX(-30px) skewX(-12deg)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
    }
  }

  /* ---------------- ligações com o site ---------------- */
  function wrap(name, after) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__hud) return;
    var w = function () { var r = orig.apply(this, arguments); try { after.apply(this, arguments); } catch (e) {} return r; };
    w.__hud = true;
    window[name] = w;
  }

  function init() {
    if (document.body.classList.contains('hud')) return;
    document.body.classList.add('hud');
    buildHeader();
    buildMap();

    wrap('updateCompactTaskbar', function () { updateCal(); updateCount(); });
    wrap('setTime', updateCal);
    wrap('setMode', updateCount);
    wrap('renderSidebar', updateCount);
    wrap('renderDossier', onDossier);
    wrap('updateWorkspaceUI', onView);

    document.addEventListener('click', function (e) {
      if (e.target.closest('#characterPage .sheet-page-tab')) setTimeout(onView, 0);
    });

    lastSelected = S().selected || null;
    place();
    /* no celular o mapa abre aproximado no distrito escolhido */
    if (phoneQ.matches) setTimeout(function () {
      try {
        var cam = atlasTokyoCamera, box = DISTRICT_ART_LAYOUT[S().selected];
        if (cam && cam.fitScale && box) { cam.zoomBy(2.6); cam.centerOn(box.cx, box.cy + 110); }
      } catch (e) {}
    }, 400);
    if (phoneQ.addEventListener) phoneQ.addEventListener('change', place); else phoneQ.addListener(place);
    document.addEventListener('click', function (e) {
      if (document.body.classList.contains('hud-menu-open') && !e.target.closest('.topbar') && document.contains(e.target)) closeMenu();
    });
    updateAll();
    onView();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.PhobiaHud = { update: updateAll, close: closeAll };
})();

/* ==========================================================
   PERSONA // PHOBIA — hud-pages.js
   Visual HUD das páginas Guia de Áreas, Agenda e do topo da
   Ficha Base. Lê os mesmos dados e chama as mesmas funções do
   site (selectDistrict, openUnlockGate, setTime, changeCampaignDay,
   customCalendarMarks…), então nada muda no save.
   ========================================================== */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,1,.36,1)';
  var reduceQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function S() { try { return state; } catch (e) { return {}; } }
  function call(name) { var f = window[name]; if (typeof f === 'function') return f.apply(null, Array.prototype.slice.call(arguments, 1)); }
  function anim(n, f, o) { if (n && n.animate && !reduceQ.matches) n.animate(f, o); }
  function enter(list) {
    Array.prototype.slice.call(list, 0, 16).forEach(function (n, i) {
      anim(n, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: getComputedStyle(n).transform === 'none' ? 'none' : getComputedStyle(n).transform }],
        { duration: 440, delay: 40 + i * 40, easing: EASE, fill: 'backwards' });
    });
  }

  var MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  var WEEK = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  var STATUS_LABEL = { discovered: 'DESCOBERTO', visited: 'VISITADO', important: 'IMPORTANTE', danger: 'PERIGOSO', cognitive: 'COGNITIVO', locked: 'BLOQUEADO' };
  var STATUS_COLOR = { discovered: '#fff3d2', visited: '#96ff45', important: '#ef2b97', danger: '#ff4d55', cognitive: '#6ce6ff', locked: '#777' };
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 1 1 8.5 4a7 7 0 0 0 11.5 11.5z"/></svg>';
  var DUSK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M5 10l2 2M19 10l-2 2"/></svg>';

  /* ======================================================
     GUIA DE ÁREAS
     ====================================================== */
  var guide = { filter: 'all', root: null };
  var HEADS = [
    { bg: '#ef2b97', fg: '#0d0c10', stamp: '#0d0c10', shadow: '#ef2b97' },
    { bg: '#2a2e4d', fg: '#6ce6ff', stamp: '#6ce6ff', shadow: '#6ce6ff' },
    { photo: true, shadow: '#ef2b97' }
  ];

  function districtPhoto(id) {
    try {
      var pid = (typeof ATLAS_DISTRICT_PHOTO !== 'undefined') && ATLAS_DISTRICT_PHOTO[id];
      var p = pid && window.PHOBIA_MAP_PHOTOS && window.PHOBIA_MAP_PHOTOS[pid];
      return p ? p.src : '';
    } catch (e) { return ''; }
  }

  function buildGuide() {
    var page = $('#areasPage');
    if (!page || guide.root) return;
    guide.root = el('div', 'hg-root');
    guide.root.innerHTML =
      '<div class="hg-stripe" aria-hidden="true"></div>' +
      '<div class="hg-bar"><div class="hg-chips" role="group" aria-label="Filtrar áreas"></div>' +
      '<label class="hg-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg></label></div>' +
      '<div class="hg-body"><div class="hg-cards"></div><aside class="hg-locked" aria-label="Áreas não reveladas"></aside></div>';
    var search = $('#areaSearch');
    if (search) { search.placeholder = 'Buscar área, local ou tag'; $('.hg-search', guide.root).appendChild(search); }
    page.appendChild(guide.root);

    guide.root.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-hg-filter]');
      if (chip) { guide.filter = chip.dataset.hgFilter; renderGuide(true); return; }
      var lock = e.target.closest('[data-hg-unlock]');
      if (lock) { call('openUnlockGate', 'district', lock.dataset.hgUnlock); return; }
      var add = e.target.closest('[data-hg-add]');
      if (add) { e.stopPropagation(); call('openPlaceModal', add.dataset.hgAdd); return; }
      var card = e.target.closest('[data-hg-open]');
      if (card) { call('selectDistrict', card.dataset.hgOpen); call('switchPage', 'mapPage'); }
    });
  }

  function renderGuide(animate) {
    buildGuide();
    if (!guide.root) return;
    var st = S(), ds = st.districts || {}, places = st.places || {};
    var q = (($('#areaSearch') || {}).value || '').trim().toLowerCase();
    var player = st.mode === 'player';
    var ids = Object.keys(ds);
    var locked = ids.filter(function (id) { return player && ds[id].state === 'locked'; });
    var open = ids.filter(function (id) { return locked.indexOf(id) < 0; });
    var count = function (s) { return open.filter(function (id) { return ds[id].state === s; }).length; };

    var chips = [
      ['all', 'TODOS · ' + ids.length, ''],
      ['visited', 'VISITADOS · ' + count('visited'), '#96ff45'],
      ['discovered', 'DESCOBERTOS · ' + count('discovered'), '#fff3d2'],
      ['locked', 'NÃO REVELADOS · ' + locked.length, '#ef2b97']
    ];
    $('.hg-chips', guide.root).innerHTML = chips.map(function (c) {
      return '<button type="button" class="hg-chip" data-hg-filter="' + c[0] + '" aria-pressed="' + (guide.filter === c[0]) + '"' + (c[2] ? ' style="--c:' + c[2] + '"' : '') + '>' + c[1] + '</button>';
    }).join('');

    var shown = open.filter(function (id) {
      var d = ds[id];
      if (guide.filter === 'locked') return false;
      if (guide.filter !== 'all' && d.state !== guide.filter) return false;
      if (!q) return true;
      var hay = (d.name + ' ' + d.jp + ' ' + (d.summary || '') + ' ' + (d.tags || []).join(' ') + ' ' + (places[id] || []).map(function (p) { return p.name + ' ' + p.type; }).join(' ')).toLowerCase();
      return hay.indexOf(q) >= 0;
    });

    var cards = $('.hg-cards', guide.root);
    cards.innerHTML = shown.length ? shown.map(function (id, i) {
      var d = ds[id], h = HEADS[i % 3], photo = districtPhoto(id), tag = HEADS[i % 2];
      var vis = (places[id] || []).filter(function (p) { return !(player && p.state === 'locked'); });
      var chipsHtml = vis.slice(0, 3).map(function (p) { return '<span>' + E(p.name) + '</span>'; }).join('') + (vis.length > 3 ? '<span>+' + (vis.length - 3) + '</span>' : '');
      var summary = String(d.summary || '').split(/(?<=\.)\s/)[0];
      var head = photo
        ? '<div class="hg-head"><img src="' + E(photo) + '" alt="' + E(d.name) + '" loading="lazy"><span class="hg-kanji-tag" style="background:' + tag.bg + ';color:' + tag.fg + '">' + E(d.jp) + '</span><span class="hg-stamp" style="--s:#fff0d8;background:rgba(13,12,16,.5)">' + E(d.code) + '</span></div>'
        : '<div class="hg-head" style="background:' + (h.bg || '#ef2b97') + '"><span class="hg-kanji" style="color:' + h.fg + '">' + E(d.jp) + '</span><span class="hg-stamp" style="--s:' + h.stamp + '">' + E(d.code) + '</span></div>';
      return '<article class="hg-card" data-hg-open="' + id + '" tabindex="0" role="button" aria-label="Abrir ' + E(d.name) + ' no mapa" style="--sh:' + h.shadow + ';--r:' + [-1.5, 1, -.5][i % 3] + 'deg">' + head +
        '<div class="hg-card-body"><div class="hg-card-title"><h3>' + E(d.name).toUpperCase() + '</h3><span class="hg-badge" style="color:' + (STATUS_COLOR[d.state] || '#fff3d2') + '">' + (STATUS_LABEL[d.state] || '') + '</span></div>' +
        '<p>' + E(summary) + '</p><div class="hg-places">' + chipsHtml + '</div>' +
        (st.mode === 'master' ? '<button type="button" class="hg-add" data-hg-add="' + id + '">+ Local</button>' : '') + '</div></article>';
    }).join('') : '<p class="hg-empty">' + (guide.filter === 'locked' ? 'As áreas bloqueadas ficam ao lado. Toque num ??? para inserir a senha.' : 'Nenhuma área corresponde à busca.') + '</p>';

    var lockBox = $('.hg-locked', guide.root);
    lockBox.innerHTML = locked.length
      ? '<span class="hg-label">NÃO REVELADAS · ' + locked.length + '</span><div class="hg-lock-grid">' +
        locked.map(function () { return ''; }).map(function (_, i) { return '<button type="button" data-hg-unlock="' + locked[i] + '" aria-label="Área não revelada — inserir senha">???</button>'; }).join('') +
        '</div><p>Cada área bloqueada pede uma palavra-senha. Toque num ??? para tentar.</p>'
      : '<span class="hg-label">TODAS AS ÁREAS REVELADAS</span>';

    if (animate) enter(cards.querySelectorAll('.hg-card'));
  }

  /* ======================================================
     AGENDA
     ====================================================== */
  var cal = { root: null, sel: '' };
  function key(y, m, d) { return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function parse(k) { var p = String(k).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function sakura(dt) { var m = dt.getMonth(), d = dt.getDate(); return (m === 2 && d >= 25) || (m === 3 && d <= 7); }
  function dayInfo(k) {
    var h = null, ev = [];
    try { h = holidayFor(k); } catch (e) {}
    try { ev = eventsForKey(k) || []; } catch (e) {}
    return { holiday: h, events: ev, mark: (S().customCalendarMarks || {})[k] || null };
  }
  function getView() {
    var y = 2000, m = 3;
    try { y = calYear; m = calMonth; } catch (e) {}
    return { y: y, m: m };
  }

  function buildCal() {
    var page = $('#calendarPage');
    if (!page || cal.root) return;
    cal.root = el('div', 'ha-root');
    cal.root.innerHTML =
      '<section class="ha-left" aria-label="Dia da história">' +
        '<div class="ha-month"><button type="button" data-ha-month="-1" aria-label="Mês anterior">‹</button><span></span><button type="button" data-ha-month="1" aria-label="Próximo mês">›</button></div>' +
        '<b class="ha-big"></b>' +
        '<div class="ha-tags"><span class="ha-week"></span><span class="ha-period"></span></div>' +
        '<div class="ha-periods" role="group" aria-label="Período do dia"><button type="button" data-ha-time="morning">MANHÃ</button><button type="button" data-ha-time="afternoon">TARDE</button><button type="button" data-ha-time="night">NOITE</button></div>' +
        '<div class="ha-days"><button type="button" data-ha-day="-1">◀ Dia anterior</button><button type="button" data-ha-day="1">Próximo dia ▶</button></div>' +
      '</section>' +
      '<section class="ha-grid-wrap" aria-label="Calendário do mês"><div class="ha-week-head">' + WEEK.map(function (w, i) { return '<span' + (i === 0 ? ' class="sun"' : i === 6 ? ' class="sat"' : '') + '>' + w + '</span>'; }).join('') + '</div><div class="ha-grid"></div>' +
        '<div class="ha-legend"><span><i style="background:#ef2b97"></i>Feriado</span><span><i style="background:#6ce6ff"></i>Evento</span><span><i style="background:#f6c1d9"></i>Sakura</span><span><i class="today"></i>Hoje na história</span><span><i style="background:#ffcf59"></i>Sua marcação</span></div></section>' +
      '<aside class="ha-right" aria-label="Detalhes do dia"><div class="ha-card ha-info"></div><div class="ha-card ha-soon"></div>' +
        '<label class="ha-note-label">MINHA MARCAÇÃO <span></span><textarea class="ha-note" placeholder="Anotar algo para este dia…"></textarea></label></aside>';
    page.appendChild(cal.root);

    cal.root.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-ha-time]'))) { call('setTime', t.dataset.haTime); renderCal(); return; }
      if ((t = e.target.closest('[data-ha-day]'))) { call('changeCampaignDay', +t.dataset.haDay); cal.sel = S().campaignDate; renderCal(); return; }
      if ((t = e.target.closest('[data-ha-month]'))) {
        var v = getView(), m = v.m + +t.dataset.haMonth, y = v.y;
        if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
        if (y < 1999 || y > 2001) return;
        try { calYear = y; calMonth = m; } catch (x) {}
        call('renderCalendar'); renderCal(true); return;
      }
      if ((t = e.target.closest('[data-ha-pin]'))) { call('togglePinnedDate', cal.sel); renderCal(); return; }
      if ((t = e.target.closest('[data-ha-key]'))) {
        cal.sel = t.dataset.haKey;
        var d = parse(cal.sel);
        call('showCalendarDetail', d.getFullYear(), d.getMonth(), d.getDate());
        renderCal();
        var cell = cal.root.querySelector('[data-ha-key="' + cal.sel + '"]');
        anim(cell, [{ transform: 'scale(1)' }, { transform: 'scale(1.1) rotate(-2deg)' }, { transform: 'scale(1)' }], { duration: 360, easing: EASE });
      }
    });

    var timer = 0;
    $('.ha-note', cal.root).addEventListener('input', function () {
      var area = this;
      clearTimeout(timer);
      timer = setTimeout(function () { saveNote(area.value); }, 400);
    });
  }

  function saveNote(text) {
    var st = S(), k = cal.sel || st.campaignDate;
    if (!k) return;
    st.customCalendarMarks = st.customCalendarMarks || {};
    var t = String(text || '').trim();
    if (!t) delete st.customCalendarMarks[k];
    else {
      var lines = t.split('\n');
      var prev = st.customCalendarMarks[k] || {};
      st.customCalendarMarks[k] = { name: lines[0].slice(0, 48), type: prev.type || 'personal', note: lines.slice(1).join('\n').trim() };
    }
    call('saveState', true);
    renderCalGrid();
    $('.ha-note-label span', cal.root).textContent = t ? '· SALVO' : '';
  }

  function upcoming(fromKey, n) {
    var out = [], d = parse(fromKey);
    for (var i = 1; i <= 120 && out.length < n; i++) {
      var dt = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i), k = key(dt.getFullYear(), dt.getMonth(), dt.getDate()), info = dayInfo(k);
      if (info.holiday) out.push({ dt: dt, name: info.holiday.name + (info.holiday.jp ? ' · ' + info.holiday.jp : ''), c: '#ef2b97' });
      info.events.forEach(function (ev) { if (out.length < n) out.push({ dt: dt, name: ev.name, c: '#6ce6ff' }); });
      if (info.mark && out.length < n) out.push({ dt: dt, name: info.mark.name, c: '#ffcf59' });
    }
    return out;
  }

  function renderCalGrid() {
    var st = S(), v = getView(), story = st.campaignDate || '2000-04-17';
    var first = new Date(v.y, v.m, 1), days = new Date(v.y, v.m + 1, 0).getDate(), off = first.getDay();
    var html = '';
    for (var i = 0; i < off; i++) html += '<span class="ha-cell empty"></span>';
    for (var d = 1; d <= days; d++) {
      var k = key(v.y, v.m, d), dt = new Date(v.y, v.m, d), info = dayInfo(k), dow = dt.getDay();
      var cls = 'ha-cell', tag = '';
      if (info.holiday) { cls += ' hol'; tag = info.holiday.name; }
      else if (info.events.length) { cls += ' ev'; tag = info.events[0].name; }
      else if (sakura(dt)) { cls += ' sak'; tag = 'SAKURA'; }
      if (info.mark) { cls += ' mark'; if (!tag) tag = info.mark.name; }
      if (dow === 0) cls += ' sun'; if (dow === 6) cls += ' sat';
      if (k === story) cls += ' today';
      if (k === cal.sel) cls += ' sel';
      if (k === st.pinnedDate) cls += ' pin';
      html += '<button type="button" class="' + cls + '" data-ha-key="' + k + '" aria-label="' + d + ' de ' + MONTHS[v.m].toLowerCase() + (tag ? ', ' + E(tag) : '') + '"><b>' + d + '</b><small>' + E(tag) + '</small></button>';
    }
    $('.ha-grid', cal.root).innerHTML = html;
  }

  function renderCal(animate) {
    buildCal();
    if (!cal.root) return;
    var st = S(), v = getView(), story = st.campaignDate || '2000-04-17', sd = parse(story);
    if (!cal.sel) cal.sel = story;
    $('.ha-month span', cal.root).textContent = MONTHS[v.m] + ' ' + v.y;
    $('.ha-big', cal.root).textContent = sd.getDate() + '/' + (sd.getMonth() + 1);
    $('.ha-week', cal.root).textContent = WEEK[sd.getDay()];
    var t = st.time || 'afternoon';
    $('.ha-period', cal.root).innerHTML = (t === 'morning' ? SUN : t === 'night' ? MOON : DUSK) + { morning: 'MANHÃ', afternoon: 'TARDE', night: 'NOITE' }[t];
    cal.root.querySelectorAll('[data-ha-time]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.haTime === t)); });
    renderCalGrid();

    var sel = cal.sel, sdt = parse(sel), info = dayInfo(sel), seasonal = [];
    try { seasonal = MONTH_SEASONAL_EVENTS[sdt.getMonth()] || []; } catch (e) {}
    var infoHtml;
    var dayLabel = String(sdt.getDate()).padStart(2, '0') + ' ' + MONTHS[sdt.getMonth()].slice(0, 3) + ' ' + sdt.getFullYear();
    if (info.holiday) infoHtml = '<span class="ha-k">FERIADO · ' + dayLabel + '</span><b>' + E(info.holiday.name) + '</b><p>' + E(info.holiday.desc || '') + '</p>';
    else if (info.events.length) infoHtml = '<span class="ha-k">' + (info.events[0].kind === 'history' ? 'NA HISTÓRIA' : 'EVENTO') + ' · ' + dayLabel + '</span><b>' + E(info.events[0].name) + '</b><p>' + E(info.events[0].desc || '') + '</p>';
    else if (seasonal.length) infoHtml = '<span class="ha-k">ESTAÇÃO</span><b>' + E(seasonal[0].title) + '</b><p>' + E(seasonal[0].desc) + '</p>';
    else infoHtml = '<span class="ha-k">' + dayLabel + '</span><b>Dia comum</b><p>Nenhum feriado ou evento registrado para esta data.</p>';
    infoHtml += '<button type="button" class="ha-pin" data-ha-pin aria-pressed="' + (st.pinnedDate === sel) + '">' + (st.pinnedDate === sel ? 'Data fixada' : 'Fixar este dia') + '</button>';
    $('.ha-info', cal.root).innerHTML = infoHtml;

    var soon = upcoming(story, 3);
    $('.ha-soon', cal.root).innerHTML = '<span class="ha-k">EM BREVE</span>' + (soon.length ? soon.map(function (s) {
      return '<div class="ha-soon-row"><b style="color:' + s.c + '">' + s.dt.getDate() + '/' + (s.dt.getMonth() + 1) + '</b><span>' + E(s.name) + '</span></div>';
    }).join('') : '<p>Nada marcado nas próximas semanas.</p>');

    var area = $('.ha-note', cal.root);
    if (document.activeElement !== area) {
      var m = info.mark;
      area.value = m ? m.name + (m.note ? '\n' + m.note : '') : '';
    }
    $('.ha-note-label span', cal.root).textContent = sel === story ? '· HOJE' : '· ' + dayLabel;

    if (animate) enter(cal.root.querySelectorAll('.ha-cell:not(.empty)'));
  }

  /* ======================================================
     FICHA BASE — topo de status
     ====================================================== */
  var hero = { root: null };
  var ATTR = ['FOR', 'AGI', 'MAG', 'VIT', 'TEC', 'SOR'];
  var SOCIAL = ['Conhecimento', 'Disciplina', 'Empatia', 'Charme', 'Coragem', 'Expressão'];
  var ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];

  function txt(id) { var n = document.getElementById(id); return n ? (n.textContent || n.value || '').trim() : ''; }
  function num(s) { var m = String(s).match(/-?\d+/); return m ? +m[0] : 0; }

  function buildHero() {
    var panel = $('#sheet-panel-core');
    if (!panel || hero.root) return;
    hero.root = el('section', 'hs-root');
    hero.root.setAttribute('aria-label', 'Status do personagem');
    hero.root.innerHTML =
      '<div class="hs-stripes" aria-hidden="true"><i></i><i></i></div>' +
      '<div class="hs-id"><button type="button" class="hs-portrait" aria-label="Trocar o retrato"><span class="hs-ph"><svg viewBox="0 0 130 170" aria-hidden="true"><circle cx="65" cy="52" r="34"/><path d="M8 170c0-40 25-66 57-66s57 26 57 66z"/></svg></span><img alt=""><small>TOQUE PARA TROCAR O RETRATO</small></button>' +
        '<div class="hs-name"><b></b><span></span></div><div class="hs-tools"></div></div>' +
      '<div class="hs-main">' +
        '<div class="hs-levels"></div>' +
        '<div class="hs-res">' +
          '<div class="hs-bar pv"><div class="hs-bar-top"><b>PV</b><span class="hs-cur"></span><small class="hs-max"></small></div><div class="hs-track"><i></i></div></div>' +
          '<div class="hs-bar pm"><div class="hs-bar-top"><b>PM</b><span class="hs-cur"></span><small class="hs-max"></small></div><div class="hs-track"><i></i></div></div>' +
        '</div>' +
        '<div class="hs-attrs">' + ATTR.map(function (a) { return '<label class="hs-attr" data-a="' + a + '"><small>' + a + '</small><em class="hs-eq" hidden></em></label>'; }).join('') + '</div>' +
        '<div class="hs-derived-wrap"></div>' +
        '<div class="hs-integ"><div class="hs-integ-top"><span>INTEGRIDADE</span><b></b></div><div class="hs-integ-track"><i></i><i></i><i></i><i></i><i></i><i></i><span class="hs-needle"></span></div>' +
          '<div class="hs-integ-labels">' +
            [[0, 'Morte'], [1, 'Ruína'], [25, 'Fraturado'], [50, 'Estável'], [75, 'Íntegro'], [100, 'Plenitude']].map(function (z) { return '<button type="button" data-integrity-stage="' + z[0] + '">' + z[1] + '</button>'; }).join('') +
          '</div></div>' +
        '<div class="hs-social">' + SOCIAL.map(function (s) {
          var pips = ''; for (var t = 1; t <= 5; t++) pips += '<button type="button" data-hs-tier="' + t + '" aria-label="' + s + ' Tier ' + ROMAN[t] + '"></button>';
          return '<div class="hs-skill" data-s="' + s + '"><div><span>' + s + '</span><b></b></div><div class="hs-pips">' + pips + '</div></div>';
        }).join('') + '</div>' +
        '<details class="hs-extra"><summary>Recursos, combate e efeitos de integridade</summary><div class="hs-res"><div class="hs-res-meta"></div><div class="hs-res-meta"></div></div><div class="hs-derived-wrap"><div class="hs-more-combat"></div></div><p class="hs-integ-flavor"></p><div class="hs-integ-effects"></div></details>' +
      '</div>';
    panel.insertBefore(hero.root, panel.firstChild);

    /* move os campos verdadeiros para o novo topo (mesmos eventos e cálculos) */
    var mv = function (sel, into) { var n = typeof sel === 'string' ? $(sel, panel) : sel; if (n && into) into.appendChild(n); return n; };
    var levels = $('.hs-levels', hero.root);
    mv('.level-unit.cnv', levels); mv('.level-unit.pnv', levels);
    mv('#sheetAppearanceBtn', $('.hs-tools', hero.root));
    var pv = $('.hs-bar.pv', hero.root), pm = $('.hs-bar.pm', hero.root);
    mv('[data-sheet="resources.pvCurrent"]', $('.hs-cur', pv));
    mv('[data-sheet="resources.pmCurrent"]', $('.hs-cur', pm));
    var metas = panel.querySelectorAll('.resources-game-panel .resource-meta');
    var targetMetas=hero.root.querySelectorAll('.hs-res-meta');
    if (metas[0]) mv(metas[0], targetMetas[0]);
    if (metas[1]) mv(metas[1], targetMetas[1]);
    ATTR.forEach(function (a) { mv('[data-sheet="attrs.' + a + '"]', $('.hs-attr[data-a="' + a + '"]', hero.root)); });
    var dw = $('.hs-derived-wrap', hero.root);
    mv('.derived-ribbon', dw); mv('.combat-status-pods', $('.hs-more-combat',hero.root));
    var range = mv('.integrity-game-range', $('.hs-integ-track', hero.root));
    if (range) range.setAttribute('aria-label', 'Integridade');
    mv('#sheetIntegrityEffects', $('.hs-integ-effects', hero.root));
    mv('#socialTierMonitorSection', $('#socialMonitorSlot'));

    panel.classList.add('hs-ready');
    $('.hs-portrait', hero.root).addEventListener('click', function () { var i = $('#sheetPhotoInput'); if (i) i.click(); });
    $('.hs-social', hero.root).addEventListener('click', function (e) {
      var b = e.target.closest('[data-hs-tier]'); if (!b) return;
      var skill = b.closest('.hs-skill').dataset.s, t = +b.dataset.hsTier, cur = 0;
      try { cur = socialEffectiveTier(skill); } catch (x) {}
      var next = cur === t ? t - 1 : t;
      try { setSocialEffectiveTier(skill, next); } catch (x) { return; }
      document.querySelectorAll('[data-social]').forEach(function (s) { if (s.dataset.social === skill) s.value = String(next); });
      call('renderCharacterSheet'); call('saveState', true);
    });
  }

  function renderHero(animate) {
    buildHero();
    if (!hero.root) return;
    var st = S(), cs = st.charSheet || {}, pr = cs.profile || {};
    var img = $('.hs-portrait img', hero.root);
    if (cs.photoData) { img.src = cs.photoData; img.hidden = false; $('.hs-ph', hero.root).hidden = true; }
    else { img.removeAttribute('src'); img.hidden = true; $('.hs-ph', hero.root).hidden = false; }
    $('.hs-name b', hero.root).textContent = (pr.name || pr.codename || 'SEU PERSONAGEM').toUpperCase();
    $('.hs-name span', hero.root).textContent = 'Arcana: ' + (pr.arcana || '—') + ' · Persona: ' + (pr.persona || '—');

    [['pv', 'sheetPVMaxText', 'pvCurrent'], ['pm', 'sheetPMMaxText', 'pmCurrent']].forEach(function (r) {
      var max = num(txt(r[1])) || 0, res = cs.resources || {}, cur = res[r[2]] == null ? max : +res[r[2]];
      var box = $('.hs-bar.' + r[0], hero.root);
      $('.hs-max', box).textContent = '/ ' + max;
      $('.hs-track i', box).style.transform = 'scaleX(' + (max ? Math.max(0, Math.min(1, cur / max)) : 0) + ')';
    });

    var calc = null;
    try { calc = calculateSheet(); } catch (e) {}
    ATTR.forEach(function (a) {
      var eq = calc && calc.equipmentModifiers && calc.equipmentModifiers.attrs ? (calc.equipmentModifiers.attrs[a] || 0) : 0;
      var tb = calc && calc.socialTierStats && calc.socialTierStats.attrs ? (calc.socialTierStats.attrs[a] || 0) : 0;
      var tag = $('.hs-attr[data-a="' + a + '"] .hs-eq', hero.root), sg = function (n) { return (n > 0 ? '+' : '') + n; };
      tag.hidden = !(eq || tb);
      tag.textContent = (eq || tb) ? [eq ? sg(eq) + ' EQP' : '', tb ? sg(tb) + ' TIER' : ''].filter(Boolean).join(' ') + ' = ' + calc[a] : '';
    });

    var integ = Math.max(0, Math.min(100, +cs.integrity || 0));
    $('.hs-integ-top b', hero.root).innerHTML = E((txt('sheetIntegrityState') || '').toUpperCase()) + ' <span>' + integ + '%</span>';
    $('.hs-needle', hero.root).style.left = integ + '%';
    $('.hs-integ-flavor', hero.root).textContent = txt('sheetIntegrityFlavor');

    SOCIAL.forEach(function (s) {
      var t = 0, bonus = '';
      try { t = socialEffectiveTier(s); bonus = '+' + socialEffectiveBonus(s); } catch (e) {}
      var box = $('.hs-skill[data-s="' + s + '"]', hero.root);
      $('b', box).textContent = 'Tier ' + ROMAN[t] + (bonus ? ' · ' + bonus : '');
      box.querySelectorAll('.hs-pips button').forEach(function (p, i) { p.classList.toggle('on', i < t); p.setAttribute('aria-pressed', String(i < t)); });
    });

    if (animate) enter(hero.root.querySelectorAll('.hs-portrait, .hs-name, .hs-levels, .hs-bar, .hs-attr, .derived-editor, .combat-status-pod, .hs-integ, .hs-skill'));
  }

  /* ======================================================
     PERSONA — linhas equilibradas + habilidades no padrão novo
     ====================================================== */
  var persona = { done: false };
  var EMAIL = /^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*$/;

  function layoutPersona() {
    if (persona.done) return;
    var hero = $('#sheet-panel-persona .persona-v2-hero');
    var section = $('#personaAffinitySection');
    var inst = $('#personaInstrumentPane');
    var secondary = $('#sheet-panel-persona .persona-secondary');
    if (!hero || !section || !inst || !secondary) return;
    persona.done = true;
    /* instrumentos sobem para a coluna da direita, ao lado da carta */
    section.appendChild(inst);
    /* Dissonante + consulta rápida viram uma linha inteira abaixo */
    secondary.classList.add('hp-dissonant-row');
    hero.parentNode.insertBefore(secondary, hero.nextSibling);
    buildAbilities();
  }

  var ABIL = [
    { key: 'naturalAbility', sel: '.exclusive-ability-card.natural', label: 'HABILIDADE NATURAL', fallback: '✦', extra: ['uses'] },
    { key: 'combatAbility', sel: '.exclusive-ability-card.combat', label: 'HABILIDADE DE COMBATE', fallback: '✹', extra: ['cost', 'uses'] }
  ];
  function buildAbilities() {
    ABIL.forEach(function (a) {
      var card = $(a.sel);
      if (!card || card.dataset.hpReady) return;
      card.dataset.hpReady = '1';
      card.classList.add('hp-ability');
      var sum = card.querySelector(':scope > summary');
      if (!sum) return;
      sum.innerHTML =
        '<span class="hp-ab-sigil" aria-hidden="true"></span>' +
        '<span class="hp-ab-copy"><small>' + a.label + '</small><b></b></span>' +
        '<span class="hp-ab-chips"></span>' +
        '<span class="hp-ab-chev" aria-hidden="true"></span>';
      card.addEventListener('input', function () { renderAbility(a); });
      renderAbility(a);
    });
  }
  function field(a, f) { var n = document.querySelector('[data-sheet="' + a.key + '.' + f + '"]'); return n ? n.value.trim() : ''; }
  function renderAbility(a) {
    var card = $(a.sel); if (!card) return;
    var name = field(a, 'name'), sig = field(a, 'sigil') || a.fallback, tag = field(a, 'tag');
    $('.hp-ab-sigil', card).textContent = sig;
    var b = $('.hp-ab-copy b', card);
    b.textContent = name || 'Sem nome ainda';
    b.classList.toggle('is-empty', !name);
    var chips = [tag].concat(a.extra.map(function (f) { return field(a, f); })).filter(Boolean).slice(0, 3);
    $('.hp-ab-chips', card).innerHTML = chips.map(function (c) { return '<i>' + E(c) + '</i>'; }).join('');
  }

  /* o navegador preenchia campos da ficha com o e-mail salvo */
  function noAutofill() {
    document.querySelectorAll('#characterPage input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), #characterPage textarea').forEach(function (n) {
      n.setAttribute('autocomplete', 'off');
      if (n.type === 'text' || !n.type || n.tagName === 'TEXTAREA') n.setAttribute('data-lpignore', 'true');
    });
    var cs = S().charSheet, changed = false;
    if (!cs) return;
    ['naturalAbility', 'combatAbility'].forEach(function (k) {
      var o = cs[k]; if (!o) return;
      ['tag', 'uses', 'trigger', 'cost', 'name'].forEach(function (f) {
        if (typeof o[f] === 'string' && EMAIL.test(o[f])) { o[f] = ''; changed = true; var n = document.querySelector('[data-sheet="' + k + '.' + f + '"]'); if (n) n.value = ''; }
      });
    });
    var q = document.querySelector('#backpackSection input[type=search], #bpSearch');
    if (q && EMAIL.test(q.value)) { q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); }
    if (changed) { call('saveState', true); ABIL.forEach(renderAbility); }
  }

  /* ======================================================
     LIGAÇÕES
     ====================================================== */
  function wrap(name, after) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__hudp) return;
    var w = function () { var r = orig.apply(this, arguments); try { after.apply(this, arguments); } catch (e) { console.warn('hud-pages', name, e); } return r; };
    w.__hudp = true; w.__hud = orig.__hud;
    window[name] = w;
  }

  function onPage() {
    var st = S();
    if (st.workspace === 'sheet') renderHero(true);
    else if (st.page === 'areasPage') renderGuide(true);
    else if (st.page === 'calendarPage') renderCal(true);
  }

  function init() {
    document.body.classList.add('hud-pages');
    renderGuide(false); renderCal(false); renderHero(false);
    layoutPersona(); noAutofill();
    setTimeout(noAutofill, 1500);
    wrap('renderSummaries', function () { renderGuide(false); });
    wrap('renderCalendar', function () { if (cal.root) renderCal(false); });
    wrap('setCampaignDate', function () { cal.sel = S().campaignDate; renderCal(false); });
    wrap('setTime', function () { renderCal(false); });
    wrap('renderCharacterSheet', function () { renderHero(false); layoutPersona(); ABIL.forEach(renderAbility); });
    wrap('hydrateCharacterSheet', function () { ABIL.forEach(renderAbility); noAutofill(); });
    wrap('renderDistricts', function () { if (guide.root) renderGuide(false); });
    wrap('updateWorkspaceUI', function () { setTimeout(onPage, 0); });
    var search = $('#areaSearch');
    if (search) search.addEventListener('input', function () { renderGuide(false); });
    document.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('#characterPage')) setTimeout(function () { renderHero(false); }, 0); });
    document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#characterPage') && !e.target.closest('.hs-root')) { clearTimeout(init.t); init.t = setTimeout(function () { renderHero(false); }, 120); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.PhobiaHudPages = { guide: renderGuide, calendar: renderCal, status: renderHero };
})();

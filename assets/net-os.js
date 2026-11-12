/* ==========================================================
   PERSONA // PHOBIA — net-os.js   (NET//TRACE como Phobia OS 2000)
   A página NET//TRACE vira a área de trabalho do mesmo PC
   do Quadro de Investigação: monitor bege, papel de parede,
   ícones, janelas estilo 2000, barra de tarefas com relógio
   e balão de aviso quando um nó é desbloqueado.
   Os puzzles e seus botões continuam os originais (mesmos ids);
   aqui só muda a moldura.
   ========================================================== */
(function () {
  'use strict';
  if (window.__netOs) return; window.__netOs = true;

  var NODES = {
    script: { file: 'signal.js', app: 'Bloco de notas', ico: 'n-js', name: 'NODE_01 · Saída do script' },
    route: { file: 'Rota de pacotes', app: 'Roteador', ico: 'n-route', name: 'NODE_02 · Rota de pacotes' },
    hex: { file: 'CHECKSUM.DAT', app: 'Editor hex', ico: 'n-hex', name: 'NODE_03 · Checksum hex' },
    signal: { file: 'Buffer de sinal', app: 'Osciloscópio', ico: 'n-sig', name: 'NODE_04 · Buffer de sinal' }
  };
  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function sfx(k) { try { window.PhobiaSfx && PhobiaSfx.play(k, 0); } catch (e) {} }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function win(id, title, ico, body, opts) {
    opts = opts || {};
    var w = el('section', 'nos-win' + (opts.cls ? ' ' + opts.cls : ''));
    w.dataset.win = id;
    w.innerHTML = '<header class="nos-tb"><i class="nos-ic ' + ico + '"></i><b>' + E(title) + '</b>' +
      '<span class="nos-tb-btns"><button type="button" data-nos-min aria-label="Minimizar">_</button><button type="button" data-nos-max aria-label="Maximizar">□</button><button type="button" data-nos-x aria-label="Fechar" class="x">×</button></span></header>' +
      (opts.menu ? '<nav class="nos-menu">' + opts.menu.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</nav>' : '') +
      '<div class="nos-body"></div>' +
      (opts.status !== false ? '<footer class="nos-status"><span class="nos-st">' + (opts.status || '') + '</span><span class="nos-st2"></span></footer>' : '');
    if (body) w.querySelector('.nos-body').appendChild(body);
    return w;
  }

  var page, desk, taskApps, clock, balloon, built = false;
  function build() {
    page = document.getElementById('hackPage'); if (!page || built) return !!built;
    var shell = $('.hack-shell', page), head = $('.hack-head', page), grid = $('.puzzle-grid', page), ledger = $('.hack-ledger', page);
    if (!shell || !head || !grid || !ledger) return false;
    built = true;
    page.classList.add('nos');

    /* monitor + tela */
    var mon = el('div', 'nos-mon');
    mon.innerHTML = '<div class="nos-bezel"><div class="nos-screen"><div class="nos-wall" aria-hidden="true"><b>PHOBIA</b><small>OS 2000 · NET//TRACE</small></div>' +
      '<div class="nos-desk"><aside class="nos-icons" aria-label="Área de trabalho"></aside><div class="nos-wins"></div></div>' +
      '<div class="nos-taskbar"><button type="button" class="nos-start" data-nos-start><i></i>INICIAR</button><span class="nos-apps"></span>' +
      '<span class="nos-tray"><i class="nos-modem" title="Conectado a 56.000 bps"></i><time></time></span></div>' +
      '<div class="nos-balloon" hidden role="status"></div>' +
      '<div class="nos-startmenu" hidden></div>' +
      '</div></div><div class="nos-chin"><span>PHOBIA</span><i></i></div>';
    shell.appendChild(mon);
    desk = $('.nos-wins', mon); taskApps = $('.nos-apps', mon); clock = $('.nos-tray time', mon); balloon = $('.nos-balloon', mon);

    /* janela de conexão (o antigo cabeçalho) */
    var dial = el('div', 'nos-dial');
    dial.innerHTML = '<div class="nos-dial-art" aria-hidden="true"><i class="pc a"></i><span><b></b><b></b><b></b><b></b><b></b></span><i class="pc b"></i></div>';
    var info = el('div', 'nos-dial-info');
    info.appendChild(head);
    dial.appendChild(info);
    desk.appendChild(win('dial', 'Conexão discada — NET//TRACE', 'n-dial', dial, { cls: 'nos-wide', status: 'Conectado a 56.000 bps', menu: ['Arquivo', 'Conexões', 'Ajuda'] }));

    /* puzzles */
    Array.prototype.slice.call(grid.querySelectorAll('.puzzle-card')).forEach(function (card) {
      var k = card.dataset.puzzleCard, n = NODES[k] || { file: k, app: 'NET//TRACE', ico: 'n-js', name: k };
      var w = win(k, n.file + ' — ' + n.app, n.ico, card, { menu: ['Arquivo', 'Editar', 'Exibir', 'Ajuda'] });
      w.dataset.node = k;
      desk.appendChild(w);
    });
    /* registro (explorer com painel lateral) */
    var exp = el('div', 'nos-exp');
    var side = el('div', 'nos-side');
    Array.prototype.slice.call(ledger.querySelectorAll('.ledger-note')).forEach(function (n) { side.appendChild(n); });
    var list = el('div', 'nos-list');
    list.appendChild(ledger);
    exp.appendChild(side); exp.appendChild(list);
    desk.appendChild(win('ledger', 'C:\\TRACE\\Registro de desbloqueios', 'n-folder', exp, { cls: 'nos-tall', menu: ['Arquivo', 'Editar', 'Exibir', 'Favoritos', 'Ferramentas', 'Ajuda'], status: '' }));
    grid.remove();

    /* ícones da área de trabalho */
    var icons = $('.nos-icons', mon);
    var ic = [['dial', 'n-dial', 'Conexão discada']].concat(Object.keys(NODES).map(function (k) { return [k, NODES[k].ico, NODES[k].file]; })).concat([['ledger', 'n-folder', 'Registro'], ['board', 'n-board', 'Quadro de Investigação'], ['trash', 'n-trash', 'Lixeira']]);
    icons.innerHTML = ic.map(function (a) { return '<button type="button" class="nos-icon" data-nos-open="' + a[0] + '"><i class="nos-ic big ' + a[1] + '"></i><span>' + E(a[2]) + '</span></button>'; }).join('');

    page.addEventListener('click', onClick);
    page.addEventListener('pointerdown', function (e) { var w = e.target.closest('.nos-win'); if (w) focus(w); var sm = $('.nos-startmenu', page); if (!sm.hidden && !e.target.closest('.nos-startmenu,[data-nos-start]')) sm.hidden = true; }, true);
    tick(); setInterval(tick, 15000);
    paint();
    var first = page.querySelector('.nos-win[data-node]:not(.solved)') || page.querySelector('.nos-win'); if (first) focus(first);
    return true;
  }
  function tick() { if (!clock) return; var d = new Date(); clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  var zTop = 10;
  function focus(w) { page.querySelectorAll('.nos-win.active').forEach(function (x) { x.classList.remove('active'); }); w.classList.add('active'); w.style.zIndex = ++zTop; paintTask(); }
  function openWin(id) {
    var w = page.querySelector('.nos-win[data-win="' + id + '"]'); if (!w) return;
    w.classList.remove('min', 'closed'); focus(w);
    w.classList.remove('pop'); void w.offsetWidth; w.classList.add('pop');
    w.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    paintTask();
  }
  function paintTask() {
    if (!taskApps) return;
    var u = state.hackUnlocks || {};
    taskApps.innerHTML = Array.prototype.slice.call(page.querySelectorAll('.nos-win')).filter(function (w) { return !w.classList.contains('closed'); }).map(function (w) {
      var t = $('.nos-tb b', w).textContent, k = w.dataset.win;
      return '<button type="button" data-nos-task="' + k + '" class="' + (w.classList.contains('active') && !w.classList.contains('min') ? 'on' : '') + (w.classList.contains('min') ? ' min' : '') + '"><i class="nos-ic ' + ($('.nos-tb .nos-ic', w).className.split(' ').pop()) + '"></i><span>' + E(t.split(' — ')[0]) + '</span>' + (NODES[k] && u[k] ? '<em>✓</em>' : '') + '</button>';
    }).join('');
  }
  function onClick(e) {
    var b = e.target.closest('button'); if (!b) return;
    var d = b.dataset, w = b.closest('.nos-win');
    if (d.nosMin != null && w) { w.classList.add('min'); w.classList.remove('active'); paintTask(); sfx('back'); return; }
    if (d.nosX != null && w) { w.classList.add('closed'); w.classList.remove('active', 'max'); paintTask(); sfx('back'); return; }
    if (d.nosMax != null && w) { w.classList.toggle('max'); focus(w); return; }
    if (d.nosTask) { var t = page.querySelector('.nos-win[data-win="' + d.nosTask + '"]'); if (!t) return; if (t.classList.contains('active') && !t.classList.contains('min')) { t.classList.add('min'); t.classList.remove('active'); paintTask(); } else openWin(d.nosTask); return; }
    if (d.nosOpen) {
      if (d.nosOpen === 'trash') { tray('Lixeira', 'A Lixeira está vazia.'); return; }
      if (d.nosOpen === 'board') { try { PhobiaCaseBoard.open(); } catch (x) {} return; }
      openWin(d.nosOpen); return;
    }
    if (d.nosStart != null) {
      var sm = $('.nos-startmenu', page), u = state.hackUnlocks || {};
      if (!sm.hidden) { sm.hidden = true; return; }
      var done = Object.keys(NODES).filter(function (k) { return u[k]; }).length;
      sm.innerHTML = '<div class="nos-sm-head"><i></i><b>' + E((state.charSheet && state.charSheet.profile && state.charSheet.profile.name) || 'Convidado') + '</b></div>' +
        '<div class="nos-sm-body">' + Object.keys(NODES).map(function (k) { return '<button type="button" data-nos-open="' + k + '"><i class="nos-ic ' + NODES[k].ico + '"></i><span>' + E(NODES[k].name) + '</span>' + (u[k] ? '<em>✓</em>' : '') + '</button>'; }).join('') +
        '<hr><button type="button" data-nos-open="ledger"><i class="nos-ic n-folder"></i><span>Registro de desbloqueios</span></button><button type="button" data-nos-open="board"><i class="nos-ic n-board"></i><span>Quadro de Investigação</span></button></div>' +
        '<div class="nos-sm-foot">' + done + ' de 4 nós desbloqueados</div>';
      sm.hidden = false; return;
    }
  }
  var bt = 0;
  function tray(title, text) {
    if (!balloon) return;
    balloon.innerHTML = '<b>' + E(title) + '</b><p>' + E(text) + '</p><button type="button" aria-label="Fechar aviso">×</button>';
    balloon.hidden = false; balloon.classList.remove('in'); void balloon.offsetWidth; balloon.classList.add('in');
    balloon.querySelector('button').onclick = function () { balloon.hidden = true; };
    clearTimeout(bt); bt = setTimeout(function () { balloon.hidden = true; }, 5200);
  }

  /* estado: status da janela e balão quando algo é desbloqueado */
  var seen = null;
  var LABEL = { script: 'Endereço comercial recuperado', route: 'Rota subterrânea reconstruída', hex: 'Nó privado de Akihabara recuperado', signal: 'Assinatura NET//TRACE' };
  function paint() {
    if (!built) return;
    var u = state.hackUnlocks || {};
    Object.keys(NODES).forEach(function (k) {
      var w = page.querySelector('.nos-win[data-win="' + k + '"]'); if (!w) return;
      w.classList.toggle('solved', !!u[k]);
      $('.nos-st', w).innerHTML = u[k] ? '<i class="ok"></i>Desbloqueado' : '<i class="lock"></i>Bloqueado';
      var rw = $('.puzzle-reward', w); $('.nos-st2', w).textContent = rw ? rw.textContent.replace(/^REWARD\s*\/\/\s*/i, 'Recompensa: ') : '';
    });
    var n = Object.keys(NODES).filter(function (k) { return u[k]; }).length;
    var lw = page.querySelector('.nos-win[data-win="ledger"] .nos-st'); if (lw) lw.textContent = n + ' de 4 objeto(s) desbloqueado(s)';
    if (seen) Object.keys(NODES).forEach(function (k) { if (u[k] && !seen[k]) { tray('Nó desbloqueado!', NODES[k].name + ' — ' + LABEL[k] + '.'); sfx('rankup'); } });
    seen = Object.assign({}, u);
    page.classList.toggle('nos-clear', !!u.signal);
    paintTask();
  }

  function init() {
    if (typeof renderHackCenter !== 'function' || typeof state === 'undefined' || !document.getElementById('hackPage')) { setTimeout(init, 200); return; }
    if (!build()) return;
    var o = window.renderHackCenter;
    if (!o.__nos) { var w = function () { var r = o.apply(this, arguments); try { paint(); } catch (e) {} return r; }; w.__nos = true; window.renderHackCenter = w; }
    try { renderHackCenter(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

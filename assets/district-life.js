/* ==========================================================
   PERSONA // PHOBIA — district-life.js
   Deixa os mapas internos dos distritos vivos:
   • carros nas avenidas, ruas e via expressa (faróis à noite)
   • pedestres nas calçadas, trem no trilho
   • janelas e postes acesos à noite, luz de manhã/tarde
   • nuvens em pixel art passando por cima
   • clima pela estação: pétalas (primavera), chuva (verão),
     folhas (outono), neve (inverno)
   Não mexe no district-local.js: decora o SVG depois que ele
   é desenhado.
   ========================================================== */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var CAR_COLORS = ['#f4f1e8', '#e8344a', '#2f6fdf', '#f5c542', '#1d1b22', '#9aa3ad', '#2fbf71', '#ff8a3d'];
  var seed = 1;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function el(tag, a) { var n = document.createElementNS(NS, tag); for (var k in a) n.setAttribute(k, a[k]); return n; }
  function reduced() { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('hs-calm'); }
  function season() {
    var sh = document.querySelector('.map-shell'), m = sh && sh.className.match(/season-(\w+)/);
    return m ? m[1] : 'spring';
  }
  function tod() { var b = document.body.classList; return b.contains('time-night') ? 'night' : b.contains('time-morning') ? 'morning' : 'afternoon'; }

  /* "M x y V y2 M x y H x2" → segmentos retos */
  function segments(d) {
    var out = [], re = /M\s*(-?[\d.]+)\s+(-?[\d.]+)\s*([VH])\s*(-?[\d.]+)/g, m;
    while ((m = re.exec(d))) {
      var x = +m[1], y = +m[2];
      out.push(m[3] === 'V' ? [x, y, x, +m[4]] : [x, y, +m[4], y]);
    }
    return out;
  }
  function car(color, night) {
    var g = el('g', { 'class': 'dlf-car' });
    if (night) g.appendChild(el('path', { 'class': 'dlf-beam', d: 'M7 -3 L34 -11 L34 11 L7 3Z' }));
    g.appendChild(el('rect', { x: -8, y: -4.5, width: 16, height: 9, rx: 2.5, fill: color, 'class': 'dlf-body' }));
    g.appendChild(el('rect', { x: 1, y: -3.2, width: 4, height: 6.4, rx: 1, 'class': 'dlf-glass' }));
    g.appendChild(el('rect', { x: -6, y: -3.2, width: 3, height: 6.4, rx: 1, 'class': 'dlf-glass' }));
    if (night) { g.appendChild(el('rect', { x: -8.5, y: -4, width: 1.6, height: 2, 'class': 'dlf-tail' })); g.appendChild(el('rect', { x: -8.5, y: 2, width: 1.6, height: 2, 'class': 'dlf-tail' })); }
    return g;
  }
  function move(node, d, dur, delay, reverse, extra) {
    var a = el('animateMotion', Object.assign({ path: d, dur: dur.toFixed(1) + 's', begin: '-' + delay.toFixed(1) + 's', repeatCount: 'indefinite', rotate: reverse ? 'auto-reverse' : 'auto' },
      reverse ? { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' } : {}, extra || {}));
    node.appendChild(a);
    return node;
  }
  function len(d) { try { var p = el('path', { d: d }); var s = el('svg', {}); s.appendChild(p); document.body.appendChild(s); var L = p.getTotalLength(); s.remove(); return L; } catch (e) { return 600; } }

  function decorate(svg) {
    svg.dataset.life = '1';
    var night = tod() === 'night', id = (document.querySelector('#subDistrictMap [data-district]') || {}).dataset;
    seed = 7 + (svg.innerHTML.length % 9973);
    var life = el('g', { 'class': 'dlf-life' });

    /* janelas acesas (só aparecem à noite, via CSS) */
    var win = el('g', { 'class': 'dlf-windows' });
    svg.querySelectorAll('.dl-block, .dl-tower').forEach(function (b) {
      var x = +b.getAttribute('x'), y = +b.getAttribute('y'), w = +b.getAttribute('width'), h = +b.getAttribute('height');
      var k = Math.floor(w * h / 900);
      for (var i = 0; i < k; i++) if (rnd() > .45) win.appendChild(el('rect', { x: (x + 4 + rnd() * (w - 10)).toFixed(1), y: (y + 4 + rnd() * (h - 9)).toFixed(1), width: 3.4, height: 3.4, 'class': 'dlf-win', style: 'animation-delay:-' + (rnd() * 9).toFixed(1) + 's' }));
    });
    var cityG = svg.querySelector('.dl-block, .dl-tower');
    if (cityG && cityG.parentNode) cityG.parentNode.appendChild(win);

    /* ruas da grade: carros pequenos e pedestres */
    var street = svg.querySelector('.dl-street');
    if (street) {
      var segs = segments(street.getAttribute('d')), host = street.parentNode;
      var traffic = el('g', { 'class': 'dlf-traffic' }), walkers = el('g', { 'class': 'dlf-walkers' });
      segs.forEach(function (s, i) {
        var d = 'M' + s[0] + ' ' + s[1] + 'L' + s[2] + ' ' + s[3], L = Math.hypot(s[2] - s[0], s[3] - s[1]);
        if (rnd() > .55) {
          var c = car(CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)], night);
          c.setAttribute('transform', 'scale(.82)');
          var w = el('g', {}); w.appendChild(c);
          var off = rnd() > .5 ? 1 : -1, dd = s[0] === s[2] ? 'M' + (s[0] + 4 * off) + ' ' + s[1] + 'L' + (s[2] + 4 * off) + ' ' + s[3] : 'M' + s[0] + ' ' + (s[1] + 4 * off) + 'L' + s[2] + ' ' + (s[3] + 4 * off);
          traffic.appendChild(move(w, dd, L / (38 + rnd() * 30), rnd() * 20, off < 0));
        }
        for (var p = 0; p < 2; p++) if (rnd() > .55) {
          var side = rnd() > .5 ? 11 : -11, wd = s[0] === s[2] ? 'M' + (s[0] + side) + ' ' + s[1] + 'L' + (s[2] + side) + ' ' + s[3] : 'M' + s[0] + ' ' + (s[1] + side) + 'L' + s[2] + ' ' + (s[3] + side);
          var dot = el('circle', { r: 2.3, 'class': 'dlf-walker', style: '--h:' + Math.floor(rnd() * 360) });
          walkers.appendChild(move(dot, wd, L / (6 + rnd() * 5), rnd() * 120, rnd() > .5));
        }
      });
      host.appendChild(walkers); host.appendChild(traffic);
    }

    /* avenidas, ligações e via expressa: mais carros, nos dois sentidos */
    svg.querySelectorAll('.dl-road .r-inner, .dl-highway .h-deck').forEach(function (p) {
      var d = p.getAttribute('d'), L = len(d), avenue = p.closest('.is-avenue, .dl-highway');
      var n = Math.max(1, Math.round(L / (avenue ? 120 : 260))), host = p.parentNode;
      var g = el('g', { 'class': 'dlf-traffic is-main' });
      for (var i = 0; i < n; i++) {
        var rev = i % 2 === 1, c = car(CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)], night), w = el('g', {});
        var lane = el('g', { transform: 'translate(0 ' + (rev ? 5 : -5) + ')' });
        lane.appendChild(c); w.appendChild(lane);
        g.appendChild(move(w, d, L / (avenue ? 70 + rnd() * 40 : 45 + rnd() * 25), rnd() * 40, rev));
      }
      host.appendChild(g);
      /* postes de luz (brilham à noite) */
      if (avenue) for (var t = 30; t < L; t += 90) {
        try { var pt = p.getPointAtLength(t); host.appendChild(el('circle', { cx: pt.x.toFixed(1), cy: (pt.y - 15).toFixed(1), r: 16, 'class': 'dlf-lamp' })); } catch (e) {}
      }
    });

    /* trem no trilho */
    var rail = svg.querySelector('.dl-rail .t-steel');
    if (rail) {
      var rd = rail.getAttribute('d'), RL = len(rd), train = el('g', { 'class': 'dlf-train' });
      for (var k = 0; k < 4; k++) train.appendChild(el('rect', { x: -k * 30 - 14, y: -7, width: 27, height: 14, rx: 4 }));
      train.appendChild(el('rect', { x: 10, y: -5, width: 4, height: 10, rx: 1.5, 'class': 'dlf-train-nose' }));
      move(train, rd, Math.max(6, RL / 160) * 2.4, rnd() * 10, false, { keyPoints: '0;1;1', keyTimes: '0;.45;1', calcMode: 'linear' });
      rail.parentNode.appendChild(train);
    }
    svg.appendChild(life);
  }

  /* ---------- céu: nuvens em pixel art + clima (canvas) ---------- */
  function cloudSVG(w) {
    var px = 6, rows = [
      '....XXXX........',
      '..XXXXXXXX..XX..',
      '.XXXXXXXXXXXXXX.',
      'XXXXXXXXXXXXXXXX',
      '.XXXXXXXXXXXXX..'
    ], r = '';
    rows.forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === 'X') r += '<rect x="' + x * px + '" y="' + y * px + '" width="' + px + '" height="' + px + '"/>'; });
    return '<svg viewBox="0 0 ' + 16 * px + ' ' + 5 * px + '" width="' + w + '" shape-rendering="crispEdges">' + r + '</svg>';
  }
  function sky(surface) {
    var s = surface.querySelector('.dlf-sky');
    if (!s) {
      s = document.createElement('div'); s.className = 'dlf-sky'; s.setAttribute('aria-hidden', 'true');
      var html = '<i class="dlf-tint"></i>';
      for (var i = 0; i < 6; i++) {
        var w = 110 + Math.random() * 150, top = Math.random() * 85, dur = 50 + Math.random() * 50;
        html += '<span class="dlf-cloud" style="top:' + top.toFixed(0) + '%;width:' + w.toFixed(0) + 'px;animation-duration:' + dur.toFixed(0) + 's;animation-delay:-' + (Math.random() * dur).toFixed(0) + 's">' +
          '<b class="dlf-cloud-shadow">' + cloudSVG(w) + '</b>' + cloudSVG(w) + '</span>';
      }
      s.innerHTML = html + '<canvas class="dlf-weather"></canvas>';
      var vp = surface.querySelector('.dl-viewport');
      if (vp && vp.nextSibling) surface.insertBefore(s, vp.nextSibling); else surface.appendChild(s);
    }
    surface.dataset.season = season(); surface.dataset.tod = tod();
    weather(s.querySelector('canvas'), surface);
  }

  var wx = null;
  function weather(cv, surface) {
    if (wx && wx.cv === cv) { wx.kind = season(); return; }
    if (wx) cancelAnimationFrame(wx.raf);
    var ctx = cv.getContext('2d'), parts = [];
    wx = { cv: cv, kind: season(), raf: 0 };
    var me = wx;
    function size() { var r = cv.getBoundingClientRect(); cv.width = Math.max(1, Math.round(r.width / 3)); cv.height = Math.max(1, Math.round(r.height / 3)); }
    size();
    function spawn(top) {
      var k = me.kind;
      return { x: Math.random() * cv.width, y: top ? -4 : Math.random() * cv.height, v: k === 'summer' ? 3 + Math.random() * 2 : k === 'winter' ? .25 + Math.random() * .35 : .35 + Math.random() * .4,
        sw: Math.random() * 6.28, c: k === 'spring' ? (Math.random() > .5 ? '#ffc2d9' : '#ff9cc0') : k === 'autumn' ? ['#e8743b', '#c9452f', '#f2b134'][Math.floor(Math.random() * 3)] : k === 'winter' ? '#ffffff' : '#bfe3ff' };
    }
    (function loop() {
      if (me !== wx) return;
      if (!cv.isConnected) { wx = null; return; }
      if (cv.width !== Math.round(cv.getBoundingClientRect().width / 3)) size();
      var k = me.kind, target = k === 'summer' ? 110 : k === 'winter' ? 90 : k === 'spring' ? 40 : 34;
      if (reduced()) target = 0;
      while (parts.length < target) parts.push(spawn(false));
      if (parts.length > target) parts.length = target;
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(function (p, i) {
        p.sw += .03; p.y += p.v;
        if (k === 'summer') { p.x -= p.v * .25; ctx.fillStyle = 'rgba(190,225,255,.55)'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 3); }
        else {
          p.x += Math.sin(p.sw) * (k === 'winter' ? .3 : .6) + (k === 'winter' ? 0 : .15);
          ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), k === 'winter' ? 1 : 2, k === 'autumn' ? 2 : 1 + (k === 'winter' ? 0 : (Math.sin(p.sw) > 0 ? 1 : 0)));
        }
        if (p.y > cv.height + 4 || p.x < -6 || p.x > cv.width + 6) parts[i] = spawn(true);
      });
      me.raf = requestAnimationFrame(loop);
    })();
  }

  function tick() {
    var svg = document.querySelector('#subDistrictMap svg.dl-scene');
    if (!svg) return;
    var surface = svg.closest('.dl-surface');
    if (!svg.dataset.life || svg.dataset.lifeTod !== tod()) {
      if (svg.dataset.life) svg.querySelectorAll('.dlf-traffic, .dlf-walkers, .dlf-windows, .dlf-lamp, .dlf-train, .dlf-life').forEach(function (n) { n.remove(); });
      svg.dataset.lifeTod = tod();
      if (!reduced()) decorate(svg); else svg.dataset.life = '1';
    }
    if (surface) sky(surface);
  }
  setInterval(tick, 700);
})();

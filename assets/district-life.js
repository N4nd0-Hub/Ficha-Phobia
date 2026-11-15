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
  /* ---------- tráfego desenhado num canvas por cima do SVG ----------
     (o SVG fica parado; só o canvas é redesenhado → bem mais leve) */
  function polyPts(d) { var a = [], re = /(-?[\d.]+)[ ,]+(-?[\d.]+)/g, m; while ((m = re.exec(d))) a.push([+m[1], +m[2]]); return a; }
  function track(pts, m) {
    var P = pts.map(function (p) { return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]; }), cum = [0];
    for (var i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { P: P, cum: cum, L: cum[cum.length - 1] };
  }
  function at(t, d) {
    d = ((d % t.L) + t.L) % t.L;
    var i = 1; while (i < t.cum.length - 1 && t.cum[i] < d) i++;
    var a = t.P[i - 1], b = t.P[i], seg = (t.cum[i] - t.cum[i - 1]) || 1, k = (d - t.cum[i - 1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  function matrixOf(svg, node) { try { return svg.getScreenCTM().inverse().multiply(node.getScreenCTM()); } catch (e) { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; } }

  var LIFE = null;
  function decorate(svg) {
    svg.dataset.life = '1';
    var night = tod() === 'night';
    seed = 7 + (svg.innerHTML.length % 9973);
    var movers = [];

    /* janelas acesas (estáticas, só à noite via CSS) */
    var win = el('g', { 'class': 'dlf-windows' });
    svg.querySelectorAll('.dl-block, .dl-tower').forEach(function (b) {
      var x = +b.getAttribute('x'), y = +b.getAttribute('y'), w = +b.getAttribute('width'), h = +b.getAttribute('height');
      var k = Math.floor(w * h / 1100);
      for (var i = 0; i < k; i++) if (rnd() > .45) win.appendChild(el('rect', { x: (x + 4 + rnd() * (w - 10)).toFixed(1), y: (y + 4 + rnd() * (h - 9)).toFixed(1), width: 3.4, height: 3.4, 'class': rnd() > .8 ? 'dlf-win dim' : 'dlf-win' }));
    });
    var cityB = svg.querySelector('.dl-block, .dl-tower');
    if (cityB && cityB.parentNode) cityB.parentNode.appendChild(win);

    /* linhas da grade que já têm pista/avenida/ligação por cima */
    var busy = {};
    svg.querySelectorAll('.dl-road .r-inner').forEach(function (p) {
      var q = polyPts(p.getAttribute('d'));
      for (var i = 1; i < q.length; i++) {
        if (Math.abs(q[i][0] - q[i - 1][0]) < .5) busy['V' + Math.round(q[i][0])] = 1;
        if (Math.abs(q[i][1] - q[i - 1][1]) < .5) busy['H' + Math.round(q[i][1])] = 1;
      }
    });

    /* ruas da grade */
    var street = svg.querySelector('.dl-street');
    if (street) {
      var m0 = matrixOf(svg, street);
      segments(street.getAttribute('d')).forEach(function (s) {
        var vert = s[0] === s[2];
        if (busy[vert ? 'V' + Math.round(s[0]) : 'H' + Math.round(s[1])]) return;
        if (rnd() > .55) {
          var off = rnd() > .5 ? 4 : -4, pts = vert ? [[s[0] + off, s[1]], [s[2] + off, s[3]]] : [[s[0], s[1] + off], [s[2], s[3] + off]];
          movers.push({ k: 'car', t: track(pts, m0), d: rnd() * 2000, v: (38 + rnd() * 30) * (off < 0 ? -1 : 1), c: CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)], sc: .82 });
        }
        for (var p = 0; p < 2; p++) if (rnd() > .55) {
          var side = rnd() > .5 ? 11 : -11, wp = vert ? [[s[0] + side, s[1]], [s[2] + side, s[3]]] : [[s[0], s[1] + side], [s[2], s[3] + side]];
          movers.push({ k: 'walk', t: track(wp, m0), d: rnd() * 2000, v: (6 + rnd() * 5) * (rnd() > .5 ? 1 : -1), c: 'hsl(' + Math.floor(rnd() * 360) + ' 70% 62%)' });
        }
      });
    }

    /* avenidas, ligações e via expressa */
    var spurSeen = {};
    svg.querySelectorAll('.dl-road.is-avenue .r-inner, .dl-road.is-spur .r-inner, .dl-highway .h-deck').forEach(function (p) {
      var avenue = p.closest('.is-avenue, .dl-highway'), m = matrixOf(svg, p), pts = polyPts(p.getAttribute('d'));
      if (pts.length < 2) return;
      var key = pts.map(function (q) { return Math.round(q[0]) + ',' + Math.round(q[1]); }).join(';');
      if (spurSeen[key]) return; spurSeen[key] = 1;
      var t0 = track(pts, m), n = Math.max(1, Math.round(t0.L / (avenue ? 150 : 320)));
      for (var i = 0; i < n; i++) {
        var rev = i % 2 === 1;
        /* espalha os carros por igual ao longo da via */
        movers.push({ k: 'car', t: t0, d: (t0.L * i / n + rnd() * 20), v: (avenue ? 70 + rnd() * 30 : 45 + rnd() * 20) * (rev ? -1 : 1), c: CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)], sc: 1, lane: rev ? 5 : -5 });
      }
      if (avenue) for (var tt = 30; tt < t0.L; tt += 90) {
        var q = at(t0, tt); svg.appendChild(el('circle', { cx: q.x.toFixed(1), cy: (q.y - 12).toFixed(1), r: 16, 'class': 'dlf-lamp' }));
      }
    });
    if (!svg.querySelector('#dlfLampGrad')) {
      var defs = svg.querySelector('defs') || svg.insertBefore(el('defs', {}), svg.firstChild);
      defs.insertAdjacentHTML('beforeend', '<radialGradient id="dlfLampGrad"><stop offset="0" stop-color="#ffe08c" stop-opacity=".55"/><stop offset="1" stop-color="#ffe08c" stop-opacity="0"/></radialGradient>');
    }

    /* trem */
    var rail = svg.querySelector('.dl-rail .t-steel');
    if (rail) { var rp = polyPts(rail.getAttribute('d')); if (rp.length > 1) { var rt = track(rp, matrixOf(svg, rail)); movers.push({ k: 'train', t: rt, d: -rt.L * .6, v: 170, cycle: rt.L * 2.2 }); } }

    /* canvas no mesmo "mundo" do mapa (anda e dá zoom junto) */
    var world = svg.parentNode, cv = world.querySelector('canvas.dlf-traffic');
    if (!cv) { cv = document.createElement('canvas'); cv.className = 'dlf-traffic'; svg.insertAdjacentElement('afterend', cv); }
    var vb = svg.viewBox.baseVal, R = 1.5;
    cv.width = Math.round(vb.width * R); cv.height = Math.round(vb.height * R);
    var acc = (getComputedStyle(svg).getPropertyValue('--dl-a') || '').trim() || '#ef2b97';
    /* filas: carros na mesma via e no mesmo sentido mantêm distância */
    var qmap = new Map(), queues = [];
    movers.forEach(function (m) { if (m.k !== 'car') return; var k = m.t; if (!qmap.has(k)) qmap.set(k, { a: [], b: [] }); qmap.get(k)[m.v > 0 ? 'a' : 'b'].push(m); m.q = 1; });
    qmap.forEach(function (o) { if (o.a.length) queues.push(o.a); if (o.b.length) queues.push(o.b); });
    LIFE = { queues: queues, cv: cv, ctx: cv.getContext('2d'), movers: movers, night: night, R: R, last: 0, acc: acc };
  }

  function drawCar(ctx, c, night) {
    ctx.fillStyle = c.c; ctx.strokeStyle = '#141217'; ctx.lineWidth = 1.2;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-8, -4.5, 16, 9, 2.5); else ctx.rect(-8, -4.5, 16, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(159,214,255,.85)'; ctx.fillRect(1, -3.2, 4, 6.4); ctx.fillRect(-6, -3.2, 3, 6.4);
    if (night) {
      ctx.fillStyle = 'rgba(255,240,180,.28)'; ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(32, -10); ctx.lineTo(32, 10); ctx.lineTo(8, 3); ctx.fill();
      ctx.fillStyle = '#ff3344'; ctx.fillRect(-8.6, -4, 1.6, 2); ctx.fillRect(-8.6, 2, 1.6, 2);
    }
  }
  function frame(now) {
    var L = LIFE;
    if (L && L.cv.isConnected && !document.hidden && L.cv.offsetWidth && !reduced()) {
      if (now - L.last >= 33) {                 // ~30 fps é suficiente e bem mais leve
        var dt = Math.min(.1, (now - (L.last || now)) / 1000); L.last = now;
        var ctx = L.ctx; ctx.setTransform(L.R, 0, 0, L.R, 0, 0); ctx.clearRect(0, 0, L.cv.width, L.cv.height);
        for (var g = 0; g < L.queues.length; g++) {
          var Q = L.queues[g], sg = Q[0].v > 0 ? 1 : -1, TL = Q[0].t.L;
          for (var qi = 0; qi < Q.length; qi++) Q[qi].d += Q[qi].v * dt;
          if (Q.length > 1) {
            Q.sort(function (a, b) { return (((a.d * sg) % TL) + TL) % TL - (((b.d * sg) % TL) + TL) % TL; });
            for (var qj = 0; qj < Q.length; qj++) {
              var me = Q[qj], ah = Q[(qj + 1) % Q.length], gap = ((((ah.d - me.d) * sg) % TL) + TL) % TL;
              if (gap < 30) me.d = ah.d - 30 * sg;
            }
          }
        }
        for (var i = 0; i < L.movers.length; i++) {
          var m = L.movers[i]; if (!m.q) m.d += m.v * dt;
          if (m.k === 'train') {
            var dd = ((m.d % m.cycle) + m.cycle) % m.cycle; if (dd > m.t.L + 130) continue;
            for (var k = 0; k < 4; k++) {
              var q = at(m.t, Math.max(0, Math.min(m.t.L - .01, dd - k * 31)));
              ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.ang);
              ctx.fillStyle = k % 2 ? '#f4f1e8' : L.acc;
              ctx.strokeStyle = '#141217'; ctx.lineWidth = 2; ctx.fillRect(-14, -7, 27, 14); ctx.strokeRect(-14, -7, 27, 14); ctx.restore();
            }
            continue;
          }
          var p = at(m.t, m.d);
          if (m.k === 'walk') { ctx.fillStyle = m.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.3, 0, 6.283); ctx.fill(); continue; }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang + (m.v < 0 ? Math.PI : 0));
          if (m.lane) ctx.translate(0, m.v < 0 ? -m.lane : m.lane);
          if (m.sc !== 1) ctx.scale(m.sc, m.sc);
          drawCar(ctx, m, L.night); ctx.restore();
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

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
    var lastT = 0;
    (function loop(now) {
      if (me !== wx) return;
      if (!cv.isConnected) { wx = null; return; }
      if (document.hidden || (now && now - lastT < 33)) { me.raf = requestAnimationFrame(loop); return; }
      lastT = now || 0;
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
      if (svg.dataset.life) svg.querySelectorAll('.dlf-windows, .dlf-lamp').forEach(function (n) { n.remove(); });
      svg.dataset.lifeTod = tod();
      if (!reduced()) decorate(svg); else svg.dataset.life = '1';
    }
    if (surface) sky(surface);
  }
  setInterval(tick, 700);
})();

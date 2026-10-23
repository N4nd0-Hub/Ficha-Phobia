/* Shared camera for Tokyo and district maps. Coordinates stay in map units. */
(function (root) {
  'use strict';
  function constrain(view, size) {
    const w = size.width * view.k, h = size.height * view.k;
    return {
      k: view.k,
      x: w <= size.vw ? (size.vw - w) / 2 : Math.min(0, Math.max(size.vw - w, view.x)),
      y: h <= size.vh ? (size.vh - h) / 2 : Math.min(0, Math.max(size.vh - h, view.y))
    };
  }
  function anchoredZoom(view, k, from, to = from) {
    return {k, x: to.x - (from.x - view.x) * k / view.k, y: to.y - (from.y - view.y) * k / view.k};
  }
  class Camera {
    constructor(viewport, content, options = {}) {
      this.viewport = viewport; this.content = content; this.options = options;
      this.width = options.width || 1000; this.height = options.height || 700;
      this.view = {x: 0, y: 0, k: 1}; this.points = new Map();
      this.fitScale = 0; this.suppressUntil = 0; this.abort = new AbortController();
      content.style.width = this.width + 'px'; content.style.height = this.height + 'px';
      const on = (type, fn, extra = {}) => viewport.addEventListener(type, fn, {signal: this.abort.signal, ...extra});
      const point = e => { const r = viewport.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; };
      on('wheel', e => {
        if (this.options.disabled?.() || e.target.closest('[data-camera-ignore]')) return;
        e.preventDefault(); e.stopPropagation();
        const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.vh : 1);
        this.zoomBy(Math.exp(-Math.max(-100, Math.min(100, delta)) * .0025), point(e));
      }, {passive: false});
      on('pointerdown', e => {
        if (e.button !== 0 || this.options.disabled?.() || e.target.closest('[data-camera-ignore],.cog-manual-handle')) return;
        const p = point(e); this.points.set(e.pointerId, {...p, startX: p.x, startY: p.y});
        this.lastPair = this.pair();
        if (this.points.size > 1) { this.dragged = true; this.suppressUntil = Date.now() + 450; }
      });
      on('pointermove', e => {
        const old = this.points.get(e.pointerId); if (!old) return;
        const next = {...old, ...point(e)};
        if (!this.dragged && this.points.size === 1 && Math.hypot(next.x - old.startX, next.y - old.startY) < 5) return;
        this.dragged = true; this.suppressUntil = Date.now() + 450;
        viewport.setPointerCapture(e.pointerId); viewport.classList.add('is-panning');
        this.points.set(e.pointerId, next);
        const pair = this.pair();
        if (pair && this.lastPair) {
          const k = this.limitScale(this.view.k * pair.distance / Math.max(1, this.lastPair.distance));
          this.view = anchoredZoom(this.view, k, this.lastPair.center, pair.center);
        } else { this.view.x += next.x - old.x; this.view.y += next.y - old.y; }
        this.lastPair = pair; this.paint(); e.preventDefault();
      });
      const release = e => {
        this.points.delete(e.pointerId); this.lastPair = this.pair();
        if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
        if (!this.points.size) { this.dragged = false; viewport.classList.remove('is-panning'); }
      };
      on('pointerup', release); on('pointercancel', release); on('lostpointercapture', release);
      on('pointerleave', e => { if (!viewport.hasPointerCapture(e.pointerId)) release(e); });
      on('click', e => {
        if (Date.now() < this.suppressUntil) { e.preventDefault(); e.stopImmediatePropagation(); }
      }, {capture: true});
      on('keydown', e => {
        if (e.target !== viewport || this.options.disabled?.()) return;
        if (e.key === '+' || e.key === '=') this.zoomBy(1.25);
        else if (e.key === '-') this.zoomBy(.8);
        else if (e.key === '0' || e.key === 'Home') this.fit();
        else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
          this.view.x += e.key === 'ArrowLeft' ? 60 : e.key === 'ArrowRight' ? -60 : 0;
          this.view.y += e.key === 'ArrowUp' ? 60 : e.key === 'ArrowDown' ? -60 : 0;
          this.paint();
        } else return;
        e.preventDefault();
      });
      this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(viewport);
      this.resize();
    }
    pair() {
      if (this.points.size < 2) return null;
      const [a,b] = [...this.points.values()];
      return {center: {x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y)};
    }
    limitScale(k) { return Math.max(this.fitScale, Math.min(this.fitScale * 4, k)); }
    resize() {
      const vw = this.viewport.clientWidth, vh = this.viewport.clientHeight;
      if (!vw || !vh) return;
      const fit = Math.min(vw / this.width, vh / this.height);
      const relative = this.fitScale ? this.view.k / this.fitScale : 1;
      const center = this.fitScale ? {x:(this.vw/2-this.view.x)/this.view.k,y:(this.vh/2-this.view.y)/this.view.k} : {x:this.width/2,y:this.height/2};
      this.vw = vw; this.vh = vh; this.fitScale = fit;
      const k = this.limitScale(relative * fit);
      this.view = {k,x:vw/2-center.x*k,y:vh/2-center.y*k}; this.paint();
    }
    paint() {
      if (!this.fitScale) return;
      this.view = constrain(this.view, {width:this.width,height:this.height,vw:this.vw,vh:this.vh});
      const {x,y,k} = this.view;
      this.content.style.transform = `translate(${x}px,${y}px) scale(${k})`;
      this.options.onChange?.(Math.round(k / this.fitScale * 100), this.view);
    }
    zoomBy(factor, point = {x:this.vw/2,y:this.vh/2}) {
      if (!this.fitScale) return;
      this.view = anchoredZoom(this.view, this.limitScale(this.view.k * factor), point); this.paint();
    }
    fit() { if (!this.fitScale) return; this.view = {k:this.fitScale,x:0,y:0}; this.paint(); }
    centerOn(x,y) { this.view.x=this.vw/2-x*this.view.k; this.view.y=this.vh/2-y*this.view.k; this.paint(); }
    destroy() { this.abort.abort(); this.observer.disconnect(); this.points.clear(); }
  }
  const api = {Camera, constrain, anchoredZoom};
  if (typeof module !== 'undefined') module.exports = api;
  else root.PhobiaMapCamera = api;
})(typeof window !== 'undefined' ? window : globalThis);

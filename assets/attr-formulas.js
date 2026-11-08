/* ==========================================================
   PERSONA // PHOBIA — attr-formulas.js
   Fórmulas com atributos viram números do personagem:
     1d20+MAG  → 1d20+8      MAGd8 → 8d8      MAG×2 → 8×2
   Vale para os textos de Equipamentos, Persona (habilidades)
   e Modo de Combate. O texto original continua salvo; só a
   exibição troca. Passe o mouse para ver a fórmula original.
   ========================================================== */
(function () {
  'use strict';
  if (window.PhobiaFormulas) return;

  var A = '(FOR|MAG|TEC|AGI|VIT|SOR)';
  var RE_TEST = /\b(FOR|MAG|TEC|AGI|VIT|SOR)(?:d\d+\b|(?=[x×]\d)|\b)/;
  var T = '\\b' + A + '(?:d\\d+\\b|(?=[x×]\\d)|\\b)';
  var SCOPES = '#sheetEquipmentPage, #sheet-panel-persona, #combatMode';
  var SKIP = 'input,textarea,select,option,script,style,svg,.fx-calc,[contenteditable],.bp-dashboard-split,.eq-editor-form label';

  function vals() {
    try { var c = calculateSheet(); return { FOR: c.FOR, MAG: c.MAG, TEC: c.TEC, AGI: c.AGI, VIT: c.VIT, SOR: c.SOR }; } catch (e) { return null; }
  }
  /* devolve [{t:'texto'}|{f:'original', v:'resolvido'}] ou null se não houver fórmula */
  function parse(text, v) {
    if (!RE_TEST.test(text)) return null;
    var re = new RegExp(
      '(?:\\d*d\\d+|\\d+|' + T + ')' +                                  /* termo inicial */
      '(?:\\s*[+\\-×x*/]\\s*(?:\\d*d\\d+|\\d+|' + T + '))+' +              /* operadores */
      '|\\b' + A + 'd\\d+\\b', 'g');                                         /* MAGd8 sozinho */
    var out = [], last = 0, m, hit = false;
    while ((m = re.exec(text))) {
      var f = m[0];
      if (!new RegExp(T).test(f)) continue;     /* só fórmulas com atributo */
      if (/^\s*x\s/i.test(f)) continue;
      var r = f.replace(new RegExp('\\b' + A + 'd(\\d+)\\b', 'g'), function (_, k, d) { return Math.max(0, v[k]) + 'd' + d; })
               .replace(new RegExp(T, 'g'), function (_, k) { return String(v[k]); })
               .replace(/\s*([+\-×*\/])\s*/g, '$1').replace(/\+-/g, '-');
      r = simplify(r);
      if (m.index > last) out.push({ t: text.slice(last, m.index) });
      out.push({ f: f, v: r }); last = m.index + f.length; hit = true;
    }
    if (!hit) return null;
    if (last < text.length) out.push({ t: text.slice(last) });
    return out;
  }
  /* soma os números soltos: 1d20+1+2 → 1d20+3 ; 10+8 → 18 (só quando há apenas + e -) */
  function simplify(r) {
    if (/[×x*\/()]/.test(r.replace(/\d*d\d+/g, ''))) return r;
    var terms = r.match(/[+\-]?[^+\-]+/g); if (!terms) return r;
    var dice = [], n = 0, nums = 0;
    terms.forEach(function (t) { if (/d/.test(t)) dice.push(t); else { n += Number(t); nums++; } });
    if (nums < 2 && dice.length) return r;
    var out = dice.join('').replace(/^\+/, '');
    if (n || !out) out += (out && n >= 0 ? '+' : '') + n;
    return out;
  }
  function attrsIn(f, v) {
    var seen = {}, list = [];
    f.replace(new RegExp('\\b' + A, 'g'), function (_, k) { if (!seen[k]) { seen[k] = 1; list.push(k + ' ' + v[k]); } return _; });
    return list.join(' · ');
  }
  function makeSpan(f, r, v) {
    var s = document.createElement('span');
    s.className = 'fx-calc'; s.dataset.f = f;
    s.title = f + '  (' + attrsIn(f, v) + ')';
    s.textContent = r;
    return s;
  }
  function processNode(tn, v) {
    var parts = parse(tn.nodeValue, v); if (!parts) return;
    var frag = document.createDocumentFragment();
    parts.forEach(function (p) { frag.appendChild(p.t != null ? document.createTextNode(p.t) : makeSpan(p.f, p.v, v)); });
    tn.parentNode.replaceChild(frag, tn);
  }
  var busy = false;
  function scan(root) {
    var v = vals(); if (!v) return;
    busy = true;
    try {
      var roots = root ? [root] : document.querySelectorAll(SCOPES);
      Array.prototype.forEach.call(roots, function (r) {
        /* atualiza números já trocados (atributos podem ter mudado) */
        r.querySelectorAll('.fx-calc').forEach(function (s) {
          var p = parse(s.dataset.f, v); if (!p) return;
          var nv = p.filter(function (x) { return x.v; }).map(function (x) { return x.v; }).join('');
          if (s.textContent !== nv) s.textContent = nv;
          s.title = s.dataset.f + '  (' + attrsIn(s.dataset.f, v) + ')';
        });
        var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, {
          acceptNode: function (n) {
            if (!RE_TEST.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
            var el = n.parentElement; if (!el || el.closest(SKIP)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        var list = []; while (w.nextNode()) list.push(w.currentNode);
        list.forEach(function (tn) { processNode(tn, v); });
      });
    } finally { busy = false; }
  }
  var pending = 0;
  function schedule() { if (busy || pending) return; pending = requestAnimationFrame(function () { pending = 0; scan(); }); }

  /* editor: prévia do valor ao digitar Acerto / Dano */
  document.addEventListener('input', function (e) {
    var f = e.target.closest && e.target.closest('[data-eq-field="accuracy"],[data-eq-field="damage"],[data-eq-field="range"]');
    if (!f) return; preview(f);
  });
  function preview(f) {
    var v = vals(); if (!v) return;
    var label = f.closest('label'); if (!label) return;
    var hint = label.querySelector('.fx-hint');
    var p = parse(f.value, v);
    if (!p) { if (hint) hint.remove(); return; }
    if (!hint) { hint = document.createElement('small'); hint.className = 'fx-hint'; label.appendChild(hint); }
    hint.textContent = '= ' + p.map(function (x) { return x.t != null ? x.t : x.v; }).join('');
  }

  window.PhobiaFormulas = { parse: parse, scan: scan };

  function init() {
    if (typeof calculateSheet !== 'function' || !document.getElementById('characterPage')) { setTimeout(init, 250); return; }
    var mo = new MutationObserver(function () { if (!busy) schedule(); });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    var o = window.openEquipmentEditor;
    if (typeof o === 'function' && !o.__fx) {
      var w = function () { var r = o.apply(this, arguments); try { document.querySelectorAll('[data-eq-field="accuracy"],[data-eq-field="damage"],[data-eq-field="range"]').forEach(preview); } catch (e) {} return r; };
      w.__fx = true; window.openEquipmentEditor = w;
    }
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

'use strict';
/* Loads the browser modules into a Node vm context with a minimal fake DOM. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ORDER = [
  'util', 'save', 'packs', 'difficulty', 'input', 'audio', 'items', 'rooms', 'enemies', 'entities', 'combat', 'player',
  'attacks', 'bosses', 'minibosses', 'keys', 'generator', 'specials', 'flow', 'render', 'ui', 'menus', 'debug', 'main',
];

function fakeCtx() {
  const grad = { addColorStop() {} };
  const target = {
    canvas: null,
    // honest text measure: Courier New / Menlo / monospace advance 0.6 x the font size per character (the real browser's numbers), whatever size 'c.font' says
    measureText: s => { const f = typeof target.font === 'string' ? target.font : ''; const m = /(\d+(?:\.\d+)?)px/.exec(f); const px = m ? parseFloat(m[1]) : 10; return { width: String(s).length * 0.6 * px }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  return new Proxy(target, {
    get(t, k) { if (k in t) return t[k]; return function () {}; },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function fakeCanvas(w, h) {
  const c = { width: w || 960, height: h || 640, style: {}, getContext() { return fakeCtx(); }, addEventListener() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 640 }; } };
  return c;
}

/** the load order comes from index.html itself, so the test run proves the real page's script order works */
function htmlOrder(dir) {
  try {
    const html = fs.readFileSync(path.join(dir || path.join(__dirname, '..'), 'index.html'), 'utf8');
    const out = []; const re = /<script\s+src="js\/([a-z0-9_]+)\.js"/gi; let m;
    while ((m = re.exec(html))) out.push(m[1]);
    return out.length ? out : ORDER;
  } catch (e) { return ORDER; }
}
function load(opts) {
  opts = opts || {};
  const base = opts.dir || path.join(__dirname, '..');        // opts.dir lets the parity test load the frozen v1 snapshot
  const root = path.join(base, 'js');
  // deterministic Math.random inside the sandbox => failures are reproducible
  let ra = (opts.randSeed || 12345) >>> 0;
  const seededMath = Object.create(Math);
  seededMath.random = function () { ra = (ra + 0x6D2B79F5) | 0; let t = Math.imul(ra ^ (ra >>> 15), 1 | ra); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const sandbox = {
    console, Math: seededMath, Date, JSON, Object, Array, Map, Set, WeakMap, Promise, Uint8Array, Uint8ClampedArray, Float32Array, Int32Array,
    setTimeout, clearTimeout, setInterval, clearInterval, performance: { now: () => Date.now() },
    document: {
      createElement: (t) => (t === 'canvas' ? fakeCanvas() : { style: {}, addEventListener() {} }),
      getElementById: () => null, addEventListener() {}, body: { appendChild() {} },
    },
    addEventListener() {}, requestAnimationFrame() {}, navigator: { clipboard: null },
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  sandbox.AudioContext = undefined; sandbox.webkitAudioContext = undefined;
  vm.createContext(sandbox);
  const loaded = [];
  for (const name of (opts.only || htmlOrder(base))) {
    const file = path.join(root, name + '.js');
    if (!fs.existsSync(file)) continue;
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: name + '.js' });
    loaded.push(name);
  }
  sandbox.__loaded = loaded;
  // ED_PACKS=none|all|v2,v4 pins the active version for every tool built on the harness
  const want = opts.dir ? null : (opts.packs || process.env.ED_PACKS);
  if (want && sandbox.ED && sandbox.ED.packs) sandbox.ED.packs.force(sandbox.ED.packs.parse(want));
  return sandbox;
}
module.exports = { load, fakeCtx, fakeCanvas, ORDER, htmlOrder };

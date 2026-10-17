'use strict';
/* Render parity: the classic renderer must draw exactly the same canvas calls whatever has been added around it.
 *   node test/render-parity.js [frames] [dirA] [packsA] [packsB]
 * Loads two builds (A = a frozen snapshot, default versions/v22; B = the working tree) with a RECORDING canvas, plays the same scripted scenes (menus, floors, a boss fight, pause, death)
 * with the same seeded Math.random, and compares a hash of every call + property set.  With the art pack (v23) switched off the two must be identical.
 * Exit code 1 on any difference. */
const path = require('path');
const { load } = require('./harness');
const { Bot } = require('./bot');

function recorder() {
  const rec = { h: 2166136261 >>> 0, n: 0, last: [] };
  const add = (s) => { for (let i = 0; i < s.length; i++) { rec.h ^= s.charCodeAt(i); rec.h = Math.imul(rec.h, 16777619) >>> 0; } rec.n++; if (process.env.RP_DEBUG) { rec.last.push(s); if (rec.last.length > 60) rec.last.shift(); } };
  const fmt = (a) => typeof a === 'number' ? (Math.round(a * 1000) / 1000) : typeof a === 'string' ? a : typeof a === 'boolean' ? a : (a && a.__grad) ? 'G' + a.__grad : (a && a.__cv) ? 'CV' : a === null || a === undefined ? '' + a : typeof a;
  let gid = 0;
  function ctx() {
    const state = { font: '10px sans-serif' };
    const target = {
      canvas: null,
      measureText: (s) => { const m = /(\d+(?:\.\d+)?)px/.exec(state.font || ''); return { width: String(s).length * 0.6 * (m ? parseFloat(m[1]) : 10) }; },
      createLinearGradient: (...a) => { add('LG' + a.map(fmt).join(',')); const id = ++gid; return { __grad: id, addColorStop: (...b) => add('stop' + b.map(fmt).join(',')) }; },
      createRadialGradient: (...a) => { add('RG' + a.map(fmt).join(',')); const id = ++gid; return { __grad: id, addColorStop: (...b) => add('stop' + b.map(fmt).join(',')) }; },
      createPattern: () => ({ __grad: 'pat' }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    };
    return new Proxy(target, {
      get(t, k) { if (k in t) return t[k]; if (k in state) return state[k]; return function (...a) { if (k === 'fillText' || k === 'strokeText') a = a.slice(1); add(String(k) + '(' + a.map(fmt).join(',') + ')'); }; },          // (the words themselves are not compared: an update's name in the edition stamp is not a drawing difference)
      set(t, k, v) { state[k] = v; add('=' + String(k) + ':' + fmt(v)); return true; },
    });
  }
  function canvas(w, h) { const cv = { __cv: 1, width: w || 960, height: h || 640, style: {}, addEventListener() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 640 }; } }; const cx = ctx(); cv.getContext = () => cx; return cv; }
  return { rec, ctx, canvas };
}

function play(sb, rec, canvas, frames) {
  const ED = sb.ED;
  sb.document.createElement = (t) => (t === 'canvas' ? canvas() : { style: {}, addEventListener() {} });
  ED.input.sim = { held: {}, edge: {} };
  const g = ED.createGame(canvas(), { headless: true }); ED.game = g;
  const shot = (label) => { try { g.render(); } catch (e) { throw new Error('render threw in ' + label + ': ' + e.stack); } };
  for (const sc of ['title', 'select', 'collection', 'help', 'settings', 'keys']) { g.scene = sc; ED.ui.tab = 1; for (let i = 0; i < 3; i++) { g.step(); shot(sc); } }
  g.startRun('RENDERPARITY', 'knight'); g.scene = 'play'; g.god = true;
  const bot = new Bot(ED, g, { god: true });
  const run = (n, every) => { for (let i = 0; i < n; i++) { bot.tick(); g.step(); if (g.scene === 'intro' && g.introT > 20) { shot('intro'); g.introT = 999; } if (g.scene !== 'play' && g.scene !== 'intro') g.scene = 'play'; if (g.modal) g.modal = null; if (i % every === 0) shot('play'); } };
  g.introT = 999; g.scene = 'play'; run(Math.floor(frames * 0.4), 2);
  for (const fl of [2, 4, 7, 10, 12]) {
    ED.debug.jumpFloor(g, fl); g.scene = 'play'; g.god = true; const nr = g.floor.rooms.filter(r => r.type === 'normal' && r.id !== g.floor.startId); if (nr.length) { ED.debug.goto(g, nr[0], 480, 420); g.scene = 'play'; run(Math.floor(frames * 0.2), 3); }
    if (nr.length > 1) { ED.debug.goto(g, nr[nr.length - 1], 480, 420); g.scene = 'play'; run(Math.floor(frames * 0.1), 3); }
    ED.debug.skipToBoss(g); g.scene = 'play'; run(Math.floor(frames * 0.2), 3);
  }
  g.shakeAmp = 0; g.scene = 'paused'; shot('paused'); g.scene = 'play';
  g.scene = 'dead'; g.deadT = 60; shot('dead');
  return { h: rec.h, n: rec.n, last: rec.last };
}

function once(dir, packs, frames) {
  const R = recorder();
  const sb = dir ? load({ dir }) : load();
  const want = packs; if (sb.ED && sb.ED.packs) sb.ED.packs.force(sb.ED.packs.parse(want));
  // the same seeded Math.random in both builds
  let ra = 424242; sb.Math.random = function () { ra = (ra + 0x6D2B79F5) | 0; let t = Math.imul(ra ^ (ra >>> 15), 1 | ra); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return play(sb, R.rec, R.canvas, frames);
}

if (require.main === module) {
  const frames = +process.argv[2] || 900, dirA = process.argv[3] ? path.resolve(process.argv[3]) : path.join(__dirname, '..', 'versions', 'v22'), pa = process.argv[4] || 'all';
  const upTo22 = () => { const sb = load(); return sb.ED.packs.LIST.map(p => p.id).filter(id => id !== 'v1' && +id.slice(1) <= 22).join(','); };
  const pb = process.argv[5] || upTo22();
  const a = once(dirA, pa, frames), b = once(null, pb, frames);
  const same = a.h === b.h && a.n === b.n;
  console.log((same ? 'render parity: IDENTICAL' : 'render parity: DIFFERENT') + '  — ' + a.n + ' canvas calls vs ' + b.n + '  (packs A=' + pa + ' B=' + pb + ')');
  if (!same && process.env.RP_DEBUG) { console.log('A last:', a.last.slice(-8)); console.log('B last:', b.last.slice(-8)); }
  process.exit(same ? 0 : 1);
}
module.exports = { once, recorder };

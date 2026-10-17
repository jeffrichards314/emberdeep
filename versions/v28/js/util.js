/* EMBERDEEP — util.js
 * Namespace, constants, seeded RNG, math helpers.  No dependencies.
 */
(function (root) {
  'use strict';
  const ED = root.ED = root.ED || {};

  // ------------------------------------------------------------------ constants
  ED.C = {
    FPS: 60, DT: 1 / 60,
    TILE: 32, COLS: 30, ROWS: 18,
    W: 960, H: 640, HUD: 64,
    ROOM_W: 960, ROOM_H: 576,
  };
  // Tile codes
  ED.T = {
    FLOOR: 0, WALL: 1, ROCK: 2, PIT: 3, SPIKE: 4, WATER: 5,
    DOOR: 6,   // door slot (state decided by the room's door object)
    CRACK: 7,  // bombable wall segment (state decided by edge)
    RUG: 8,    // decorative floor
    LAVA: 9,   // damaging floor (lava), passable but burns
    ICE: 10,
  };
  ED.DIRS = ['N', 'E', 'S', 'W'];
  ED.DIR_V = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  ED.OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };

  // ------------------------------------------------------------------ hashing + RNG
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  ED.hash = function (str) { return xmur3(String(str))(); };

  const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  /** Seeded PRNG (mulberry32). All generation goes through this. */
  function RNG(seed) {
    if (!(this instanceof RNG)) return new RNG(seed);
    this.seedStr = String(seed);
    this.seed = (typeof seed === 'number') ? (seed >>> 0) : ED.hash(this.seedStr);
    this.a = this.seed;
  }
  RNG.prototype = {
    next() {
      let a = (this.a = (this.a + 0x6D2B79F5) | 0);
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** integer in [a,b] inclusive */
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); },
    range(a, b) { return a + this.next() * (b - a); },
    chance(p) { return this.next() < p; },
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
    sign() { return this.next() < 0.5 ? -1 : 1; },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    /** weighted pick: items are objects, w = fn(item) or key name */
    weighted(items, w) {
      const get = typeof w === 'function' ? w : (it => it[w || 'weight']);
      let total = 0;
      for (const it of items) total += Math.max(0, get(it));
      if (total <= 0) return items.length ? items[Math.floor(this.next() * items.length)] : null;
      let r = this.next() * total;
      for (const it of items) { r -= Math.max(0, get(it)); if (r < 0) return it; }
      return items[items.length - 1];
    },
    /** deterministic child stream, independent of how much the parent consumed */
    fork(label) { return new RNG(this.seedStr + '/' + label); },
    /** round a float count: 2.4 -> 2 (60%) or 3 (40%) */
    stochRound(v) { const f = Math.floor(v); return f + (this.next() < v - f ? 1 : 0); },
  };
  ED.RNG = RNG;
  ED.randomSeed = function () {
    let s = '';
    for (let i = 0; i < 6; i++) s += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
    return s;
  };
  ED.normalizeSeed = function (s) {
    s = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    return s || ED.randomSeed();
  };
  ED.dailySeed = function () {
    const d = new Date();
    return 'D' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  };

  // ------------------------------------------------------------------ math
  const TAU = Math.PI * 2;
  // cosmetic randomness for DRAWING only (screen shake, flicker, title embers, ambient particles): a tiny LCG of its own.  Rendering must never touch Math.random or the gameplay RNG,
  // so that drawing a frame (or not) can never change what the simulation does or shift a seeded test stream.
  let crandState = 0x2545F491;
  const U = ED.U = {
    crand() { crandState = (Math.imul(crandState, 1664525) + 1013904223) >>> 0; return crandState / 4294967296; },
    crandSeed(n) { crandState = (n >>> 0) || 1; },
    TAU,
    clamp: (v, a, b) => v < a ? a : (v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    dist2: (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay),
    angle: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
    angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; },
    approach(v, target, step) { return v < target ? Math.min(target, v + step) : Math.max(target, v - step); },
    approachAngle(a, target, step) { const d = U.angDiff(a, target); return Math.abs(d) <= step ? target : a + Math.sign(d) * step; },
    easeOut: t => 1 - Math.pow(1 - t, 3),
    easeIn: t => t * t * t,
    easeInOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    pulse: (t, speed) => 0.5 + 0.5 * Math.sin(t * speed),
    rnd: (a, b) => a + Math.random() * (b - a),             // visual-only randomness
    rndi: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    rpick: arr => arr[Math.floor(Math.random() * arr.length)],
    isNum: v => typeof v === 'number' && isFinite(v),
    pad: (n, w) => String(n).padStart(w, '0'),
    fmtTime(frames) {
      const s = Math.floor(frames / 60), m = Math.floor(s / 60);
      return m + ':' + String(s % 60).padStart(2, '0');
    },
    cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); },
    /** hex "#rrggbb" blend */
    mix(c1, c2, t) {
      const a = U.hex(c1), b = U.hex(c2);
      const r = Math.round(a[0] + (b[0] - a[0]) * t), g = Math.round(a[1] + (b[1] - a[1]) * t), bl = Math.round(a[2] + (b[2] - a[2]) * t);
      return 'rgb(' + r + ',' + g + ',' + bl + ')';
    },
    hex(c) {
      if (c[0] === '#') {
        if (c.length === 4) return [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16)];
        return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
      }
      return [255, 255, 255];
    },
    rgba(c, a) { const h = U.hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + a + ')'; },
    // point-in-shape tests
    circleHit: (ax, ay, ar, bx, by, br) => { const dx = bx - ax, dy = by - ay, r = ar + br; return dx * dx + dy * dy <= r * r; },
    /** distance from point to segment, plus closest t */
    segDist(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
    },
    deepClone: o => JSON.parse(JSON.stringify(o)),
    /** remove dead items in-place (swap-free, order preserving) */
    compact(arr, keep) {
      let j = 0;
      for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (keep(v)) arr[j++] = v; }
      arr.length = j;
    },
  };
  ED.id = (function () { let n = 0; return () => ++n; })();
  ED.stats = { caches: 0 };
  ED.mixins = ED.mixins || [];

  // tile helpers
  ED.tileX = px => Math.floor(px / ED.C.TILE);
  ED.tileY = py => Math.floor(py / ED.C.TILE);

  // Safe localStorage wrapper (falls back to memory in tests / private mode)
  ED.storage = (function () {
    const mem = {};
    let ls = null;
    try { ls = root.localStorage || null; if (ls) { ls.setItem('__t', '1'); ls.removeItem('__t'); } } catch (e) { ls = null; }
    return {
      get(k) { try { return ls ? ls.getItem(k) : (k in mem ? mem[k] : null); } catch (e) { return mem[k] || null; } },
      set(k, v) { try { if (ls) ls.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } },
      remove(k) { try { if (ls) ls.removeItem(k); else delete mem[k]; } catch (e) { delete mem[k]; } },
    };
  })();
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

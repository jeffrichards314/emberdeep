/* EMBERDEEP — generator.js
 * Procedural floor graph: start room, 6-10 normal rooms, 2-4 special rooms, 1-3 mini boss
 * rooms, 1 boss room far from the start (behind a rest room on mega floors).
 * Every floor is validated (connectivity, overlap, door symmetry, layouts, keys + solver);
 * generation retries on failure and finally falls back to a hand-built safe layout.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, DIRS = ED.DIRS, DV = ED.DIR_V, OPP = ED.OPP;

  const cellKey = (x, y) => x + ',' + y;

  function newFloor(num, seed, attempt) {
    let nid = 0;
    return {
      num, seed: String(seed), attempt,
      rooms: [], edges: [], grid: new Map(),
      startId: 0, bossId: -1, bossKeyHolder: -1,
      bombSupply: 0, keyLog: [], solution: null,
      isMega: num % 5 === 0,
      theme: ED.rooms.themeFor(num),
      nextId() { return ++nid; },
    };
  }

  function addRoom(f, x, y, type) {
    const r = {
      id: f.rooms.length, gx: x, gy: y, type, dist: 0,
      doors: { N: null, E: null, S: null, W: null },
      holds: [], puzzle: null,
      tiles: null, template: 'open',
      visited: false, discovered: false, revealed: false, cleared: false,
      mini: null, bossDef: null,
    };
    f.rooms.push(r); f.grid.set(cellKey(x, y), r);
    return r;
  }
  function connect(f, a, b, hidden) {
    const dx = b.gx - a.gx, dy = b.gy - a.gy;
    const dir = dx === 1 ? 'E' : dx === -1 ? 'W' : dy === 1 ? 'S' : 'N';
    const e = { id: f.edges.length, a: a.id, b: b.id, dirAB: dir, lock: null, hidden: !!hidden, revealed: false };
    a.doors[dir] = e; b.doors[OPP[dir]] = e;
    f.edges.push(e);
    return e;
  }
  function neighbors(f, r) {
    const out = [];
    for (const d of DIRS) { const e = r.doors[d]; if (e) out.push({ dir: d, edge: e, room: f.rooms[e.a === r.id ? e.b : e.a] }); }
    return out;
  }
  function occupiedNeighborCount(f, x, y) {
    let n = 0;
    for (const d of DIRS) if (f.grid.has(cellKey(x + DV[d][0], y + DV[d][1]))) n++;
    return n;
  }
  function computeDist(f) {
    for (const r of f.rooms) r.dist = -1;
    const q = [f.rooms[f.startId]]; q[0].dist = 0;
    for (let h = 0; h < q.length; h++) {
      const r = q[h];
      for (const n of neighbors(f, r)) if (n.room.dist < 0) { n.room.dist = r.dist + 1; q.push(n.room); }
    }
  }

  /** candidate (host,dir) slots for a leaf room, preferring cells that touch nothing else */
  function leafSlots(f, hosts, strict) {
    const out = [];
    for (const h of hosts) for (const d of DIRS) {
      if (h.doors[d]) continue;
      const x = h.gx + DV[d][0], y = h.gy + DV[d][1];
      if (f.grid.has(cellKey(x, y))) continue;
      const occ = occupiedNeighborCount(f, x, y);
      if (occ > (strict ? 1 : 2)) continue;
      out.push({ host: h, dir: d, x, y, occ });
    }
    return out;
  }
  function attachLeaf(f, rng, type, hosts, opts) {
    opts = opts || {};
    let slots = leafSlots(f, hosts, true);
    if (!slots.length) slots = leafSlots(f, hosts, false);
    if (!slots.length) return null;
    const s = rng.weighted(slots, q => (q.occ === 1 ? 1.4 : 0.6));
    const r = addRoom(f, s.x, s.y, type);
    connect(f, s.host, r, opts.hidden);
    return r;
  }

  // ------------------------------------------------------------------ structure
  function buildStructure(f, rng) {
    const F = f.num;
    const start = addRoom(f, 0, 0, 'start');
    const nNormal = D.normalRooms(F, rng);
    const normals = [];
    let guard = 0;
    while (normals.length < nNormal && guard++ < 4000) {
      const pool = [start].concat(normals);
      // bias toward recent rooms so the floor snakes outward instead of blobbing
      const host = pool[Math.min(pool.length - 1, Math.floor(Math.pow(rng.next(), 0.55) * pool.length))];
      const d = rng.pick(DIRS);
      if (host.doors[d]) continue;
      const x = host.gx + DV[d][0], y = host.gy + DV[d][1];
      if (f.grid.has(cellKey(x, y))) continue;
      const occ = occupiedNeighborCount(f, x, y);
      if (occ > 1 && !(occ === 2 && rng.chance(0.12))) continue;
      const r = addRoom(f, x, y, 'normal');
      connect(f, host, r);
      normals.push(r);
      // sometimes close a loop with another adjacent room
      if (occ >= 2) {
        for (const dd of DIRS) {
          const o = f.grid.get(cellKey(x + DV[dd][0], y + DV[dd][1]));
          if (o && o !== host && !r.doors[dd] && !o.doors[OPP[dd]] && (o.type === 'normal' || o.type === 'start') && rng.chance(0.7)) { connect(f, r, o); break; }
        }
      }
    }
    if (normals.length < 6) return 'not enough normal rooms';
    // a few extra loops between adjacent rooms
    let loops = 0;
    for (const r of [start].concat(normals)) for (const d of ['E', 'S']) {
      const o = f.grid.get(cellKey(r.gx + DV[d][0], r.gy + DV[d][1]));
      if (o && !r.doors[d] && (o.type === 'normal' || o.type === 'start') && loops < 2 && rng.chance(0.18)) { connect(f, r, o); loops++; }
    }
    computeDist(f);

    // ---- boss room: far from the start (attach to the farthest normal room)
    const far = normals.slice().sort((a, b) => b.dist - a.dist || rng.next() - 0.5);
    let boss = null, rest = null;
    for (const host of far.slice(0, 5)) {
      if (f.isMega) {
        const rr = attachLeaf(f, rng, 'rest', [host]);
        if (!rr) continue;
        const bb = attachLeaf(f, rng, 'boss', [rr]);
        if (!bb) { // undo rest
          removeLeaf(f, rr); continue;
        }
        rest = rr; boss = bb; break;
      } else {
        const bb = attachLeaf(f, rng, 'boss', [host]);
        if (bb) { boss = bb; break; }
      }
    }
    if (!boss) return 'no boss slot';
    f.bossId = boss.id;
    computeDist(f);

    // ---- mini bosses at random non-start positions (leaf rooms hanging off normal rooms)
    const nMini = D.minibossCount(F, rng);
    for (let i = 0; i < nMini; i++) {
      const hosts = normals.filter(r => r.id !== start.id);
      const m = attachLeaf(f, rng, 'miniboss', hosts);
      if (!m) { if (i === 0) return 'no mini boss slot'; break; }
    }
    // ---- special rooms (2-4)
    const nSpecial = D.specialCount(F, rng);
    const picked = [];
    const hostsSpecial = normals.concat(rng.chance(0.25) ? [start] : []);
    let tries = 0;
    while (picked.length < nSpecial && tries++ < 60) {
      const avail = Object.keys(ED.D.ROOM_WEIGHTS).filter(t => !picked.includes(t) && D.roomWeight(t, F) > 0);
      if (!avail.length) break;
      // guarantee one clearly-positive room early
      let type;
      if (picked.length === 0 && rng.chance(0.75)) {
        const pos = avail.filter(t => ED.D.ROOM_WEIGHTS[t].cat === 'positive' && t !== 'secret');
        type = pos.length ? rng.weighted(pos, t => D.roomWeight(t, F)) : null;
      }
      if (!type) type = rng.weighted(avail, t => D.roomWeight(t, F));
      const r = attachLeaf(f, rng, type, hostsSpecial, { hidden: type === 'secret' });
      if (!r) continue;
      picked.push(type);
    }
    if (picked.length < 2) return 'not enough special rooms';
    computeDist(f);
    return null;
  }

  function removeLeaf(f, r) {
    // only valid for the most recently added room
    const e = f.edges.pop();
    const a = f.rooms[e.a];
    a.doors[e.dirAB] = null;
    f.grid.delete(cellKey(r.gx, r.gy));
    f.rooms.pop();
  }

  // ------------------------------------------------------------------ content picking + layouts
  function decorate(f, rng) {
    const F = f.num;
    const usedMini = [];
    for (const r of f.rooms) {
      const dirs = DIRS.filter(d => r.doors[d]);
      const rr = rng.fork('layout' + r.id);
      let opts = {};
      if (r.type === 'miniboss') {
        const m = ED.minibosses.pick(F, rr, usedMini);
        usedMini.push(m.defId);
        r.mini = m;
        opts.arena = ED.minibosses.defs[m.defId].arena;
      } else if (r.type === 'boss') {
        r.bossDef = ED.bosses.forFloor(F, rr);
        opts.arena = r.bossDef.arena;
      } else if (ED.roomTypes[r.type] && ED.roomTypes[r.type].layouts) {
        opts.template = rr.pick(ED.roomTypes[r.type].layouts);
      } else if (r.type === 'normal') {
        // puzzle rooms stay roomy so the plates/braziers always have space
        if (r.puzzle) opts.allow = ['open', 'pillars4', 'hall', 'scatter', 'cross', 'bunkers'];
      }
      const b = ED.rooms.buildTiles(dirs, rr, F, opts);
      r.tiles = b.tiles; r.template = b.template; r.freeTiles = b.free;
      r.seed = f.seed + ':f' + F + ':r' + r.id;
    }
  }

  // ------------------------------------------------------------------ validation
  function validate(f) {
    const errs = [];
    const R = f.rooms;
    if (!R.length) return ['empty floor'];
    // overlap / grid
    const seen = new Set();
    for (const r of R) {
      const k = cellKey(r.gx, r.gy);
      if (seen.has(k)) errs.push('overlap at ' + k);
      seen.add(k);
      if (f.grid.get(k) !== r) errs.push('grid mismatch');
    }
    // door symmetry + adjacency
    for (const e of f.edges) {
      const a = R[e.a], b = R[e.b];
      if (!a || !b) { errs.push('dangling edge'); continue; }
      if (Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy) !== 1) errs.push('edge between non-adjacent rooms');
      if (a.doors[e.dirAB] !== e || b.doors[OPP[e.dirAB]] !== e) errs.push('door asymmetry');
    }
    for (const r of R) for (const d of DIRS) {
      const e = r.doors[d];
      if (e && e.a !== r.id && e.b !== r.id) errs.push('door points to foreign edge');
    }
    // counts
    const cnt = t => R.filter(r => r.type === t).length;
    const nNormal = cnt('normal'), nMini = cnt('miniboss'), nBoss = cnt('boss'), nStart = cnt('start');
    const specials = R.filter(r => ED.D.ROOM_WEIGHTS[r.type]).length;
    if (nStart !== 1) errs.push('start count ' + nStart);
    if (nBoss !== 1) errs.push('boss count ' + nBoss);
    if (nNormal < 6 || nNormal > 10) errs.push('normal count ' + nNormal);
    if (nMini < 1 || nMini > 3) errs.push('mini count ' + nMini);
    if (specials < 2 || specials > 4) errs.push('special count ' + specials);
    if (f.isMega && cnt('rest') !== 1) errs.push('mega floor without rest room');
    if (!f.isMega && cnt('rest') > 0) errs.push('rest room on a non-mega floor');
    // full reachability (all locks open + secrets revealed)
    const all = new Set(R.map(r => r.id));
    const openL = new Set(ED.keys.allLocks(f).map(l => l.id));
    const openH = new Set(f.edges.filter(e => e.hidden).map(e => e.id));
    const reach = ED.keys.reach(f, openL, openH);
    if (reach.size !== all.size) errs.push('unreachable rooms: ' + (all.size - reach.size));
    if (!reach.has(f.bossId)) errs.push('boss unreachable');
    // dead-end rule: locked rooms hang off leaves (no room is trapped behind a lock)
    const reach0 = ED.keys.reach(f, new Set(), new Set());
    for (const r of R) {
      if (r.type === 'normal' || r.type === 'start') { if (!reach0.has(r.id)) errs.push('normal room behind a lock'); }
      if (r.type === 'rest' && !reach0.has(r.id)) errs.push('rest room behind a lock');
    }
    // boss far from the start
    const maxNormal = Math.max.apply(null, R.filter(r => r.type === 'normal').map(r => r.dist));
    if (R[f.bossId].dist < maxNormal) errs.push('boss not far from start');
    // layouts
    for (const r of R) {
      if (!r.tiles) { errs.push('room without tiles'); continue; }
      if (r.freeTiles < 140) errs.push('room too cramped (' + r.freeTiles + ')');
      for (const d of DIRS) if (r.doors[d]) {
        const [tx, ty] = ED.rooms.DOOR_TILES[d][0];
        if (!ED.rooms.isPassable(r.tiles[ty * ED.C.COLS + tx])) errs.push('door slot blocked');
      }
    }
    // keys / locks / solver
    for (const e of errs.length ? [] : [1]) {
      const ke = ED.keys.validateKeys(f);
      for (const k of ke) errs.push(k);
    }
    return errs;
  }

  // ------------------------------------------------------------------ fallback layout
  /** deterministic, always-valid floor used only if every random attempt fails */
  function buildFallback(num, seed) {
    const f = newFloor(num, seed, -1);
    f.fallback = true;
    const rng = new ED.RNG(seed + ':fallback' + num);
    const start = addRoom(f, 0, 0, 'start');
    const normals = [];
    let prev = start;
    for (let i = 1; i <= 6; i++) { const r = addRoom(f, i, 0, 'normal'); connect(f, prev, r); normals.push(r); prev = r; }
    // boss (+ rest) off the last room
    let host = prev;
    if (f.isMega) { const rr = addRoom(f, 6, -1, 'rest'); connect(f, host, rr); host = rr; const b = addRoom(f, 6, -2, 'boss'); connect(f, host, b); f.bossId = b.id; }
    else { const b = addRoom(f, 6, -1, 'boss'); connect(f, host, b); f.bossId = b.id; }
    const m = addRoom(f, 2, 1, 'miniboss'); connect(f, normals[1], m);
    const t1 = addRoom(f, 3, -1, 'treasure'); connect(f, normals[2], t1);
    const s1 = addRoom(f, 4, 1, 'shop'); connect(f, normals[3], s1);
    computeDist(f);
    // boss must be farther than every normal room
    // assignment: small key held by an enemy in a normal room
    for (const r of f.rooms) { r.holds = []; r.puzzle = null; }
    const mand = m; f.bossKeyHolder = mand.id;
    mand.holds.push({ id: 'K' + f.nextId(), key: 'boss', via: 'miniboss', got: false });
    const bossEdge = f.rooms[f.bossId].doors[DIRS.find(d => f.rooms[f.bossId].doors[d])];
    bossEdge.lock = { id: 'L' + f.nextId(), type: 'boss', opened: false, params: {} };
    const mEdge = m.doors[DIRS.find(d => m.doors[d])];
    mEdge.lock = { id: 'L' + f.nextId(), type: 'small', opened: false, params: {}, room: m.id };
    normals[3].holds.push({ id: 'K' + f.nextId(), key: 'small', via: 'enemy', got: false, forLock: mEdge.lock.id });
    f.keyLog.push({ lock: mEdge.lock.id, key: 'small', via: 'enemy', room: normals[3].id });
    decorate(f, rng);
    return f;
  }

  // ------------------------------------------------------------------ public API
  const stats = { floors: 0, attempts: 0, fallbacks: 0 };
  ED.gen = {
    stats, validate,
    /** generate a validated floor. Same (num, seed) always yields the same floor. */
    generate(num, seed) {
      seed = String(seed);
      let lastErr = '';
      const MAX = 80;
      for (let attempt = 0; attempt < MAX; attempt++) {
        const rng = new ED.RNG(seed + ':floor' + num + ':a' + attempt);
        const f = newFloor(num, seed, attempt);
        const e1 = buildStructure(f, rng.fork('struct'));
        if (e1) { lastErr = e1; continue; }
        const ka = ED.keys.assignValid(f, rng.fork('keys'), 16);
        if (!ka.ok) { lastErr = 'keys: ' + (ka.errors || []).join('; '); continue; }
        decorate(f, rng.fork('deco'));
        const errs = validate(f);
        if (errs.length) { lastErr = errs.join('; '); continue; }
        stats.floors++; stats.attempts += attempt + 1;
        f.id = ED.id();
        f.startRoom = f.rooms[f.startId];
        return f;
      }
      stats.floors++; stats.fallbacks++; stats.attempts += MAX;
      const f = buildFallback(num, seed);
      const errs = validate(f);
      if (errs.length) throw new Error('fallback floor invalid: ' + errs.join('; ') + ' (last: ' + lastErr + ')');
      f.id = ED.id(); f.startRoom = f.rooms[f.startId];
      return f;
    },
    buildFallback,
    neighbors, otherEnd: (e, r) => (e.a === r.id ? e.b : e.a),
    /** compact text dump of the graph for the debug overlay and tests */
    ascii(f) {
      let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (const r of f.rooms) { minx = Math.min(minx, r.gx); maxx = Math.max(maxx, r.gx); miny = Math.min(miny, r.gy); maxy = Math.max(maxy, r.gy); }
      const G = { start: 'S', normal: '.', boss: 'B', miniboss: 'M', rest: 'R' };
      const lines = [];
      for (let y = miny; y <= maxy; y++) {
        let l = '';
        for (let x = minx; x <= maxx; x++) {
          const r = f.grid.get(cellKey(x, y));
          l += r ? (G[r.type] || r.type[0].toUpperCase()) : ' ';
        }
        lines.push(l);
      }
      return lines.join('\n');
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

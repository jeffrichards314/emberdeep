/* EMBERDEEP — keys.js
 * Lock-requirement table, key-source table, softlock-proof assignment, the SOLVER that
 * proves every lock (and the Boss Key chain) is satisfiable, and the live hint system.
 *
 * Model
 *   edge.lock = { id, type, opened, params }       (one per mini boss door + boss door)
 *   room.holds = [ { id, key:'small'|'mb'|'boss', via, got } ]   key sources placed in rooms
 *   room.puzzle = { kind, n, lockId }              switch/brazier puzzle in a normal room
 *   edge.hidden (secret rooms) behaves like a bomb lock for the solver.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D;

  // --------------------------------------------------------------- data tables
  /** requirement table for mini boss doors. Add a row = add a new lock type. */
  const LOCKS = {
    small:     { id: 'small',     name: 'Small Key',      color: '#f2c94c', icon: 'key',   weight: 4,   from: 1, key: 'small', desc: 'Needs a Small Key.' },
    mb:        { id: 'mb',        name: 'Mini Boss Key',  color: '#4aa3ff', icon: 'key',   weight: 3,   from: 2, key: 'mb',    desc: 'Needs a Mini Boss Key.' },
    switch:    { id: 'switch',    name: 'Switch Seal',    color: '#5be37d', icon: 'switch',weight: 2.5, from: 2, puzzle: true,  desc: 'Sealed — solve the puzzle elsewhere on the floor.' },
    sacrifice: { id: 'sacrifice', name: 'Blood Pact',     color: '#c05cff', icon: 'altar', weight: 1.5, from: 3, desc: 'Demands a sacrifice: gold or max HP.' },
    bomb:      { id: 'bomb',      name: 'Cracked Wall',   color: '#ff8a3c', icon: 'bomb',  weight: 2,   from: 2, bombs: 1,     desc: 'A cracked wall — blow it open.' },
    boss:      { id: 'boss',      name: 'Boss Key',       color: '#ff3b4a', icon: 'bosskey', weight: 0, from: 1, key: 'boss',  desc: 'The Boss Key opens this door.' },
  };
  /** key types the player can carry */
  const KEYTYPES = {
    small: { id: 'small', name: 'Small Key',     color: '#f2c94c' },
    mb:    { id: 'mb',    name: 'Mini Boss Key', color: '#4aa3ff' },
    boss:  { id: 'boss',  name: 'Boss Key',      color: '#ff3b4a' },
  };
  /** where each key type may be hidden.  needs = a room type that must exist on the floor */
  const SOURCES = {
    small: [
      { via: 'enemy',    w: 5,   room: 'normal',   label: 'dropped by an enemy' },
      { via: 'chest',    w: 3,   room: 'normal',   label: 'in a chest' },
      { via: 'shop',     w: 2.2, room: 'shop',     label: 'sold in the shop' },
      { via: 'miniboss', w: 1.1, room: 'miniboss', label: 'guarded by another mini boss' },
    ],
    mb: [
      { via: 'enemy',    w: 4,   room: 'normal',   label: 'held by an elite enemy' },
      { via: 'mystery',  w: 3,   room: 'mystery',  label: 'in a mystery chest' },
      { via: 'secret',   w: 3,   room: 'secret',   label: 'in a secret room' },
      { via: 'treasure', w: 3,   room: 'treasure', label: 'in a treasure room' },
      { via: 'miniboss', w: 1.1, room: 'miniboss', label: 'guarded by another mini boss' },
    ],
  };
  // rooms that may NEVER hold a key (negative / gamble rooms) — validator enforces
  const KEY_HOST_OK = { normal: true, treasure: true, secret: true, mystery: true, shop: true, miniboss: true };

  // --------------------------------------------------------------- helpers
  function otherEnd(edge, room) { return edge.a === room.id ? edge.b : edge.a; }
  function allLocks(floor) { return floor.edges.filter(e => e.lock).map(e => e.lock); }

  function passable(edge, openedLocks, openedHidden) {
    if (edge.lock && !openedLocks.has(edge.lock.id)) return false;
    if (edge.hidden && !openedHidden.has(edge.id)) return false;
    return true;
  }
  function reach(floor, openedLocks, openedHidden) {
    const seen = new Set([floor.startId]);
    const q = [floor.startId];
    while (q.length) {
      const r = floor.rooms[q.pop()];
      for (const d of ED.DIRS) {
        const e = r.doors[d];
        if (!e || !passable(e, openedLocks, openedHidden)) continue;
        const o = otherEnd(e, r);
        if (!seen.has(o)) { seen.add(o); q.push(o); }
      }
    }
    return seen;
  }

  // --------------------------------------------------------------- the solver
  /**
   * Static solver.  Starting with NOTHING it explores every reachable "opened locks" state:
   * the player may open any currently-openable lock in any order, and keys are fungible, so a
   * key spent on the wrong door must never strand the floor.  A floor is
   *   ok   = some order opens every lock and reaches the boss
   *   safe = EVERY reachable state can still be completed (no order-dependent softlock)
   * Returns {ok, safe, order, reason}.
   */
  function solve(floor) {
    const locks = allLocks(floor);
    const hiddenEdges = floor.edges.filter(e => e.hidden);
    const lockById = {}; for (const l of locks) lockById[l.id] = l;
    const bombSupply = floor.bombSupply || 0;
    const total = locks.length + hiddenEdges.length;
    const states = new Map();                       // key -> {L, H, succ:[{key,id}], full}
    const skey = (L, H) => [...L].sort().join(',') + '|' + [...H].sort().join(',');

    function visit(L, H) {
      const key = skey(L, H);
      if (states.has(key)) return key;
      const R = reach(floor, L, H);
      const have = { small: 0, mb: 0, boss: 0, bombs: R.has(floor.startId) ? bombSupply : 0 };
      for (const id of R) for (const h of floor.rooms[id].holds || []) have[h.key]++;
      const spent = { small: 0, mb: 0, boss: 0, bombs: H.size };
      for (const id of L) { const t = LOCKS[lockById[id].type]; if (t.key) spent[t.key]++; if (t.bombs) spent.bombs += t.bombs; }
      const entry = { L, H, succ: [], full: L.size + H.size >= total && R.has(floor.bossId) };
      states.set(key, entry);
      for (const e of floor.edges) {
        const a = R.has(e.a), b = R.has(e.b);
        if (a === b) continue;                          // both inside (already open) or both outside
        if (e.lock && !L.has(e.lock.id)) {
          const t = LOCKS[e.lock.type];
          let can;
          if (t.key) can = have[t.key] - spent[t.key] > 0;
          else if (t.bombs) can = have.bombs - spent.bombs >= t.bombs;
          else if (t.puzzle) can = R.has(e.lock.params.puzzleRoom);
          else can = true;                              // sacrifice: always payable (never-lethal blood option)
          if (can) { const L2 = new Set(L); L2.add(e.lock.id); entry.succ.push({ key: visit(L2, H), id: e.lock.id }); }
        } else if (e.hidden && !H.has(e.id)) {
          if (have.bombs - spent.bombs >= 1) { const H2 = new Set(H); H2.add(e.id); entry.succ.push({ key: visit(L, H2), id: e.id }); }
        }
      }
      return key;
    }
    const startKey = visit(new Set(), new Set());
    // a state is "good" if completion is still reachable from it
    const good = new Set();
    for (const [k, st] of states) if (st.full) good.add(k);
    let changed = true;
    while (changed) { changed = false; for (const [k, st] of states) if (!good.has(k) && st.succ.some(x => good.has(x.key))) { good.add(k); changed = true; } }
    const ok = good.has(startKey);
    const bad = [];
    for (const [k, st] of states) if (!good.has(k)) bad.push(k);
    // one concrete solution order
    let order = [];
    if (ok) { let cur = startKey, guard = 0; while (!states.get(cur).full && guard++ < 40) { const nx = states.get(cur).succ.find(x => good.has(x.key)); order.push(nx.id); cur = nx.key; } }
    let reason = '';
    if (!ok) reason = 'stuck: no order opens every lock (' + locks.map(l => l.type).join('/') + ')';
    else if (bad.length) { const k = bad[0], st = states.get(k); reason = 'order-dependent softlock: after opening [' + [...st.L].map(id => lockById[id].type).join(',') + '] the floor cannot be finished'; }
    return { ok, safe: ok && bad.length === 0, order, reason, states: states.size };
  }

  // --------------------------------------------------------------- assignment
  function rollLockType(floor, rng, used) {
    const cands = Object.values(LOCKS).filter(l => l.weight > 0 && floor >= l.from);
    // don't stack three identical requirements
    return rng.weighted(cands, l => l.weight * (used[l.id] ? 0.55 : 1)).id;
  }

  /** attempt a full lock/key assignment on a freshly laid-out floor. Mutates floor. */
  function assign(floor, rng) {
    const F = floor.num;
    // reset
    for (const r of floor.rooms) { r.holds = []; r.puzzle = null; }
    for (const e of floor.edges) e.lock = null;
    floor.bombSupply = 0;
    floor.keyLog = [];

    const minis = floor.rooms.filter(r => r.type === 'miniboss');
    const mandatory = rng.pick(minis);
    floor.bossKeyHolder = mandatory.id;
    mandatory.holds.push({ id: 'K' + floor.nextId(), key: 'boss', via: 'miniboss', got: false });

    // boss door lock
    const bossRoom = floor.rooms[floor.bossId];
    const bossEdge = bossRoom.doors[ED.DIRS.find(d => bossRoom.doors[d])];
    bossEdge.lock = { id: 'L' + floor.nextId(), type: 'boss', opened: false, params: {} };

    const usedTypes = {};
    const normals = floor.rooms.filter(r => r.type === 'normal');
    const byType = t => floor.rooms.filter(r => r.type === t);

    for (const m of minis) {
      const edge = m.doors[ED.DIRS.find(d => m.doors[d])];
      const type = rollLockType(F, rng, usedTypes);
      usedTypes[type] = (usedTypes[type] || 0) + 1;
      const lock = { id: 'L' + floor.nextId(), type, opened: false, params: {}, room: m.id };
      edge.lock = lock;
      const def = LOCKS[type];
      if (def.key) {
        const opts = SOURCES[def.key].filter(s => {
          if (s.via === 'miniboss') return minis.some(o => o !== m);
          return (s.room === 'normal' ? normals.length > 0 : byType(s.room).length > 0);
        });
        const src = rng.weighted(opts, 'w');
        let host;
        if (src.via === 'miniboss') host = rng.pick(minis.filter(o => o !== m));
        else if (src.room === 'normal') host = rng.pick(normals.filter(r => r.id !== floor.startId));
        else host = rng.pick(byType(src.room));
        host.holds.push({ id: 'K' + floor.nextId(), key: def.key, via: src.via, got: false, forLock: lock.id });
        floor.keyLog.push({ lock: lock.id, key: def.key, via: src.via, room: host.id });
      } else if (def.puzzle) {
        const cand = normals.filter(r => r.id !== floor.startId && !r.puzzle);
        const pr = rng.pick(cand);
        const kind = rng.chance(0.5) ? 'plates' : 'braziers';
        const n = rng.int(2, Math.min(4, 2 + Math.floor(F / 4)));
        pr.puzzle = { kind, n, lockId: lock.id, done: false };
        lock.params = { puzzleRoom: pr.id, kind, n };
        floor.keyLog.push({ lock: lock.id, key: 'switch', via: kind, room: pr.id });
      } else if (def.id === 'sacrifice') {
        lock.params = { gold: Math.round((22 + 5 * F) * D.at(F).priceMult / 5) * 5, hp: 4 };
      } else if (def.bombs) {
        floor.bombSupply += def.bombs;
      }
    }
    // each secret room needs a bomb too
    for (const e of floor.edges) if (e.hidden) floor.bombSupply += 1;
    return true;
  }

  /** Find the first wiring that the solver accepts. */
  function assignValid(floor, rng, tries) {
    let last = null;
    for (let i = 0; i < (tries || 24); i++) {
      assign(floor, rng.fork('assign' + i));
      const v = validateKeys(floor);
      if (!v.length) return { ok: true, tries: i + 1 };
      last = v;
    }
    return { ok: false, errors: last };
  }

  // --------------------------------------------------------------- validation (keys only)
  function validateKeys(floor) {
    const errs = [];
    const minis = floor.rooms.filter(r => r.type === 'miniboss');
    // boss key
    let bossKeys = 0, holder = null;
    for (const r of floor.rooms) for (const h of r.holds || []) if (h.key === 'boss') { bossKeys++; holder = r; }
    if (bossKeys !== 1) errs.push('boss key count ' + bossKeys);
    else if (holder.type !== 'miniboss') errs.push('boss key not on a mini boss');
    // hosts
    for (const r of floor.rooms) for (const h of r.holds || []) {
      if (!KEY_HOST_OK[r.type]) errs.push('key hosted in forbidden room type ' + r.type);
      if (r.type === 'start' || r.id === floor.startId) errs.push('key in start room');
      if (h.via === 'shop' && r.type !== 'shop') errs.push('shop key outside shop');
    }
    // counts per type
    const need = { small: 0, mb: 0 }, have = { small: 0, mb: 0 };
    for (const l of allLocks(floor)) { const t = LOCKS[l.type]; if (t.key && need[t.key] !== undefined) need[t.key]++; }
    for (const r of floor.rooms) for (const h of r.holds || []) if (have[h.key] !== undefined) have[h.key]++;
    for (const k in need) if (have[k] < need[k]) errs.push('not enough ' + k + ' keys');
    // puzzles
    for (const l of allLocks(floor)) {
      if (LOCKS[l.type].puzzle) {
        const pr = floor.rooms[l.params.puzzleRoom];
        if (!pr || pr.type !== 'normal' || !pr.puzzle || pr.puzzle.lockId !== l.id) errs.push('switch lock without puzzle room');
      }
    }
    // the solver
    const s = solve(floor);
    if (!s.ok || !s.safe) errs.push('solver: ' + s.reason); else floor.solution = s.order;
    return errs;
  }

  // --------------------------------------------------------------- live state helpers (runtime)
  function liveReach(floor) {
    const opened = new Set(), hid = new Set();
    for (const e of floor.edges) {
      if (e.lock && e.lock.opened) opened.add(e.lock.id);
      if (e.hidden && e.revealed) hid.add(e.id);
    }
    return reach(floor, opened, hid);
  }
  /**
   * Hint: after most of the reachable floor is cleared, point at the room that holds the
   * thing the player still needs.  `player.keys` = {small, mb, boss}.
   */
  function hintRoom(floor, keys, force) {
    const R = liveReach(floor);
    const reachableCombat = floor.rooms.filter(r => R.has(r.id) && (r.type === 'normal' || r.type === 'start'));
    const cleared = reachableCombat.filter(r => r.cleared || r.type === 'start').length;
    const frac = reachableCombat.length ? cleared / reachableCombat.length : 1;
    if (!force && frac < 0.7) return null;
    const findHolder = (keyType, forLock) => {
      for (const r of floor.rooms) for (const h of r.holds || [])
        if (h.key === keyType && !h.got && R.has(r.id)) return r.id;
      return null;
    };
    // walk locks that guard rooms still unfinished, boss chain first
    const order = [];
    const bh = floor.rooms[floor.bossKeyHolder];
    const bossEdge = floor.edges.find(e => e.lock && e.lock.type === 'boss');
    if (bossEdge && !bossEdge.lock.opened && (keys.boss | 0) <= 0) {
      const mEdge = bh.doors[ED.DIRS.find(d => bh.doors[d])];
      order.push(mEdge.lock);
    }
    for (const e of floor.edges) if (e.lock && !e.lock.opened && e.lock.type !== 'boss' && !order.includes(e.lock)) order.push(e.lock);
    for (const lock of order) {
      if (lock.opened) continue;
      const def = LOCKS[lock.type];
      if (def.key) {
        if ((keys[def.key] | 0) > 0) { const mid = lock.room; return mid !== undefined ? floor.rooms[mid].id : null; }
        const h = findHolder(def.key);
        if (h !== null) return h;
      } else if (def.puzzle) {
        const pr = floor.rooms[lock.params.puzzleRoom];
        if (pr && !pr.puzzle.done) return pr.id;
      } else if (def.bombs) {
        // the cracked wall itself (host room of the lock)
        const e = floor.edges.find(x => x.lock === lock);
        return e ? e.a : null;
      } else if (def.id === 'sacrifice') {
        const e = floor.edges.find(x => x.lock === lock);
        return e ? e.a : null;
      }
    }
    // secret rooms with unclaimed keys
    return null;
  }

  ED.keys = {
    LOCKS, KEYTYPES, SOURCES, KEY_HOST_OK,
    solve, assign, assignValid, validateKeys, reach, liveReach, hintRoom, otherEnd, allLocks,
    lockColor(type) { return (LOCKS[type] || LOCKS.small).color; },
    describeSources(floor) {
      return floor.keyLog.map(k => {
        const l = floor.edges.map(e => e.lock).find(x => x && x.id === k.lock);
        return (l ? l.type : '?') + ' lock -> ' + k.key + ' via ' + k.via + ' in room ' + k.room;
      });
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

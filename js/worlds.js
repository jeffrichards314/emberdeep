/* EMBERDEEP — worlds.js : the WORLD registry and resolver.  Core, and inert on its own.
 *
 *  A world is a five-floor "tier" with its own palette, rule, foes, elite trait and mini boss(es).  Which world a floor belongs to is a
 *  function of (floor, run.route): with no route choice recorded it is exactly the old straight line — v3's six worlds in a cycle, or no
 *  world at all when v3 is off — so v1 and v3-alone play as before.  Update packs register worlds with ED.worlds.add(); the route system
 *  (v17 CROSSROADS) records the player's choices in run.route = { tierIndex: worldId }; a way found inside a tier (v21) is run.mid = { tierIndex: { from, world } }.
 *
 *  Everything that used to ask "is v3 on?" before applying a world (foe pools, elite traits, palettes, mini bosses) now asks
 *  "does this floor have a world?" through this module, so any pack's worlds work the same way.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, P = ED.packs;
  const TIER = 5;
  const ALL = [], BY = {}, SPINE = [], memo = new Map();
  let cur = null;                                        // the run whose route is consulted (startRun binds it)

  const firstFloor = (tier) => tier * TIER + 1;
  /** the world the current run chose for this tier (null: no choice recorded, or its update is switched off) */
  function routed(tier) { const r = cur && cur.route, id = r ? r[tier] : undefined, w = id ? BY[id] : null; return w && P.ok(w) ? w : null; }
  /** the straight line: v3's cycle of six (nothing while v3 is off) */
  function spineAt(tier) { const n = SPINE.length; if (!n) return null; const w = SPINE[tier % n]; return P.ok(w) ? w : null; }

  /** a way down found INSIDE a tier (v21's trapdoors): { from: first floor of the new land, world: id }, kept in run.mid[tier] */
  function mid(tier) { const m = cur && cur.mid, e = m ? m[tier] : null, w = e ? BY[e.world] : null; return w && P.ok(w) ? e : null; }

  function at(floor) {
    floor = Math.max(1, Math.floor(floor || 1));
    const tier = Math.floor((floor - 1) / TIER), md = mid(tier);
    let w = routed(tier), r = !!w, switched = false; if (md && floor >= md.from) { w = BY[md.world]; r = true; switched = true; }
    if (!w) w = spineAt(tier); if (!w) return null;
    const key = floor + (r ? 'r' : 's') + w.id + (switched ? 'm' : '');
    let o = memo.get(key);
    if (!o) { const depth = (floor - 1) % TIER; memo.set(key, o = { w, idx: SPINE.indexOf(w), loop: Math.floor(tier / (SPINE.length || 6)), depth, first: depth === 0 || (switched && floor === md.from), last: depth === TIER - 1, number: tier + 1, tier, routed: r, mid: switched }); }
    return o;
  }
  /** may this foe appear on this floor?  In its own place on the line: its minFloor.  Placed EARLIER by a route: its introduction moves with the world. */
  function eligible(def, wi, floor) {
    if (!wi.routed) return def.minFloor <= floor;
    const native = wi.w.native || (wi.idx >= 0 ? firstFloor(wi.idx) : 1), rel = Math.max(0, def.minFloor - native);
    return floor >= Math.min(def.minFloor, firstFloor(wi.tier) + rel);
  }

  const W = ED.worlds = {
    TIER, ALL, byId: BY, LIST: SPINE, firstFloor,
    /** register a world; spine = true puts it in the straight-line cycle */
    add(def, spine) {
      if (BY[def.id]) return BY[def.id];
      ALL.push(def); BY[def.id] = def; if (spine) { def.spine = true; SPINE.push(def); } memo.clear(); return def;
    },
    /** bind the run whose route decides worlds (startRun) */
    use(run) { cur = run; memo.clear(); },
    run() { return cur; },
    tierOf(floor) { return Math.floor((Math.max(1, floor) - 1) / TIER); },
    routed, spineAt, at, mid,
    /** the world at a tier right now: what was chosen, else the straight line */
    worldOfTier(tier) { const md = mid(tier); return (md && BY[md.world]) || routed(tier) || spineAt(tier); },
    has(floor) { return !!at(floor); },
    themeFor(floor) { const wi = at(floor); return wi ? wi.w.theme : null; },
    enemiesFor(floor) { const wi = at(floor); if (!wi) return []; return wi.w.enemies.filter(id => { const d = ED.enemyTypes[id]; return d && P.ok(d) && eligible(d, wi, floor); }); },
    modsFor(floor) { const wi = at(floor); if (!wi) return []; const L = wi.w.mods || (wi.w.mod ? [wi.w.mod] : []); return L.filter(id => ED.mods[id] && P.ok(ED.mods[id])); },
    /** the mini boss this world favours on this floor (a world may list several: the pick is seeded) */
    miniFor(floor, rng) {
      const wi = at(floor); if (!wi) return null; const w = wi.w;
      if (w.minis && w.minis.length) { const L = w.minis.filter(id => ED.minibosses.defs[id] && P.ok(ED.minibosses.defs[id])); return L.length ? (rng ? rng.pick(L) : L[0]) : null; }
      return w.mini || null;
    },
    /** extra danger of a routed side world, in floors (0 on the straight line) */
    riskOf(floor) { const wi = at(floor); return wi && wi.routed ? (wi.w.risk | 0) : 0; },
    flavorFor(floor) { const wi = at(floor); return wi && wi.w.music || null; },
    eligible,
    /** worlds that can be offered as the next tier's side exits (registered, switched on, allowed at that tier) */
    candidates(tier) { return ALL.filter(w => P.ok(w) && !(w.tiers && (tier < w.tiers[0] || tier > w.tiers[1])) && tier >= 1); },
  };
  P.track('worlds', ALL);

  // ------------------------------------------------------------------ helpers world hazards share (v3 keeps its own copies)
  const idx = (tx, ty) => ty * C.COLS + tx;
  /** paint n blobs of a tile type on plain floor, clear of doors and the middle of the room; returns the painted tile indices */
  W.paintBlobs = function (g, room, rt, rng, type, n, wmin, wmax, hmin, hmax) {
    const dirs = rt.dirs || [], painted = [];
    for (let a = 0, done = 0; a < 60 && done < n; a++) {
      const w = rng.int(wmin, wmax), h = rng.int(hmin, hmax), x0 = rng.int(3, 26 - w), y0 = rng.int(3, 15 - h), cx = x0 + w / 2, cy = y0 + h / 2;
      if (Math.abs(cx - 15) < 4.5 && Math.abs(cy - 9) < 3.2) continue;                     // keep the middle clear (drops land there)
      let bad = false;
      for (const d of dirs) { const z = ED.rooms.DOOR_CLEAR[d]; if (x0 <= z[2] + 2 && x0 + w - 1 >= z[0] - 2 && y0 <= z[3] + 2 && y0 + h - 1 >= z[1] - 2) bad = true; }
      for (let y = y0; y < y0 + h && !bad; y++) for (let x = x0; x < x0 + w; x++) if (room.tiles[idx(x, y)] !== ED.T.FLOOR) { bad = true; break; }
      if (bad) continue;
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { room.tiles[idx(x, y)] = type; painted.push(idx(x, y)); }
      done++;
    }
    return painted;
  };
  /** n spread-out spawn-tile positions away from the middle of the room */
  W.spots = function (rt, rng, n, minGap) {
    const out = [], cand = rt.spawnTiles.filter(t => Math.hypot(t.x - 480, t.y - 288) > 110);
    for (let a = 0; a < 80 && out.length < n && cand.length; a++) { const t = cand[rng.int(0, cand.length - 1)]; if (out.every(o => Math.hypot(o.x - t.x, o.y - t.y) > minGap)) out.push({ x: t.x, y: t.y }); }
    return out;
  };
  /** the plain floor tiles whose centres lie inside a rectangle / a circle */
  W.tilesIn = function (g, x, y, w, h) { const out = []; for (let ty = 1; ty < C.ROWS - 1; ty++) for (let tx = 1; tx < C.COLS - 1; tx++) { const cx = tx * 32 + 16, cy = ty * 32 + 16; if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) { const t = g.room.tiles[idx(tx, ty)]; if (t === ED.T.FLOOR || t === ED.T.RUG) out.push(idx(tx, ty)); } } return out; };
  W.tilesNear = function (g, x, y, r) { const out = []; for (let ty = 1; ty < C.ROWS - 1; ty++) for (let tx = 1; tx < C.COLS - 1; tx++) { const cx = tx * 32 + 16, cy = ty * 32 + 16; if (Math.hypot(cx - x, cy - y) <= r) { const t = g.room.tiles[idx(tx, ty)]; if (t === ED.T.FLOOR || t === ED.T.RUG) out.push(idx(tx, ty)); } } return out; };

  // ------------------------------------------------------------------ the generic world runtime: hazards, HUD tag and floor card for worlds that are not v3's own
  // (v3 keeps its own hooks for its six; a world from another pack hands its hazard object in as `hz` and gets the same treatment)
  const own = (g) => { const wi = g.floor && at(g.floorNum); return wi && wi.w.pack !== 'v3' ? wi : null; };
  ED.hook('roomEnter', 'v1', (g, room) => {
    const rt = g.rt; if (!rt || rt.hzDone) return; const wi = own(g); if (!wi || !wi.w.hz) return; rt.hzDone = true;
    if (room.type !== 'normal' && room.type !== 'challenge' && room.type !== 'haunted') return;
    rt.hzOn = true; if (wi.w.hz.setup) { wi.w.hz.setup(g, room, rt, rt.rng.fork('world'), wi); g.refreshCollision(); }
  });
  ED.hook('tick', 'v1', (g) => { const rt = g.rt; if (!rt || !rt.hzOn || !g.room) return; const wi = own(g); if (wi && wi.w.hz && wi.w.hz.tick) wi.w.hz.tick(g, rt, wi); });
  ED.hook('under', 'v1', (g, c, t) => { const rt = g.rt; if (!rt || !rt.hzOn) return; const wi = own(g); if (wi && wi.w.hz && wi.w.hz.under) wi.w.hz.under(g, c, t, rt, wi); });
  ED.hook('draw', 'v1', (g, c, t) => { const rt = g.rt; if (!rt || !rt.hzOn) return; const wi = own(g); if (wi && wi.w.hz && wi.w.hz.draw) wi.w.hz.draw(g, c, t, rt, wi); });
  ED.hook('hud', 'v1', (g, c) => { const wi = own(g); if (wi) ED.ui.text(c, wi.w.short, 728, 63, 9, wi.w.color, 'left', false); });
  ED.hook('intro', 'v1', (g, c) => {
    const wi = own(g); if (!wi) return; const UI = ED.ui, w = wi.w;
    if (wi.first) UI.shadow(c, 'WORLD ' + wi.number, C.W / 2, 112, 16, w.color, 'center');
    const rule = w.rule, cut = rule.length > 118 ? rule.lastIndexOf(' ', Math.floor(rule.length / 2) + 8) : -1, ry = g.floor.isMega ? 236 : 206;           // a long rule goes on two lines instead of off the screen
    (cut > 0 ? [rule.slice(0, cut), rule.slice(cut + 1)] : [rule]).forEach((ln, i) => UI.text(c, ln, C.W / 2, ry + i * 15 - (cut > 0 ? 8 : 0), 12, wi.first ? '#e8e8f4' : '#8a8aa8', 'center', false));
    if (wi.first) { const nf = w.enemies.filter(id => ED.enemyTypes[id] && P.ok(ED.enemyTypes[id])).map(id => ED.enemyTypes[id].name); if (nf.length) UI.text(c, 'Foes of this land: ' + nf.join(', '), C.W / 2, 388, 14, '#ffd24a', 'center'); }
  });
  // ------------------------------------------------------------------ temporary terrain: water, spikes, a plank that falls away.  Any land may swap tiles for a while; they drain back by themselves.
  const T = ED.T;
  function settle(g) {                                         // somebody standing where the floor just became a pit / rock is moved out (the player pays for the fall)
    const p = g.player;
    for (const e of g.enemies) if (!e.big && !e.dead && ED.phys.blocked(g, e.x, e.y, e.r * 0.8, !!e.flying, false)) ED.phys.unstick(g, e);
    if (p && ED.phys.blocked(g, p.x, p.y, p.cr, false, false)) { ED.phys.unstick(g, p); g.hurtPlayer(Math.round(3 * g.dif.enemyDmg), p.x, p.y, { zone: true, noKnock: true }); }
  }
  /** put `type` over these tiles of the current room for `dur` frames; they return to what they were */
  W.swapTiles = function (g, rt, idx, type, dur) {
    const room = g.room, use = idx.filter(i => room.tiles[i] !== type); if (!use.length) return null;
    const orig = use.map(i => room.tiles[i]); for (const i of use) room.tiles[i] = type;
    g.refreshCollision(); if (type === T.PIT || type === T.ROCK) settle(g);
    const f = { idx: use, orig, t: dur, room, type, done: false }; (rt.swaps = rt.swaps || []).push(f); return f;
  };
  function drain(g, f) { f.done = true; for (let k = 0; k < f.idx.length; k++) if (f.room.tiles[f.idx[k]] === f.type) f.room.tiles[f.idx[k]] = f.orig[k]; if (g.room === f.room) g.refreshCollision(); }
  ED.hook('tick', 'v1', (g) => {
    const rt = g.rt; if (!rt || !rt.swaps || !rt.swaps.length) return;
    for (const f of rt.swaps) { f.t -= g.ts; if (f.t <= 0 && !f.done) drain(g, f); }
    U.compact(rt.swaps, f => !f.done);
  });
  ED.hook('roomEnter', 'v1', (g, room) => { const rt = g.rt; if (!rt || !rt.swaps || !rt.swaps.length) return; for (const f of rt.swaps) if (!f.done) drain(g, f); rt.swaps.length = 0; });      // a room you come back to has put itself right again

  /** interactables a pack draws itself: type -> (c, it, t, g) */
  ED.interDraw = ED.interDraw || {};
})(typeof globalThis !== 'undefined' ? globalThis : this);

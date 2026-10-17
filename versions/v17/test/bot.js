'use strict';
/* A headless "player" used by the test suite: path-finds on the tile grid, fights, loots,
 * opens locks (keys / bombs / sacrifice / puzzles) and clears floors.  It uses a little
 * oracle knowledge (key holders) so it can finish floors reliably for regression testing. */
class Bot {
  constructor(ED, g, opts) {
    this.ED = ED; this.g = g; this.opts = Object.assign({ careful: true, god: false }, opts || {});
    this.wait = 0; this.path = null; this.pathT = 0; this.goal = null; this.bombT = 0; this.stuck = 0; this.lastPos = null; this.log = [];
    this.visitedGoals = new Set(); this.noGo = new Map();
  }
  press(a) { const s = this.ED.input.sim; s.held[a] = true; s.edge[a] = true; }
  hold(a) { this.ED.input.sim.held[a] = true; }
  steerTo(x, y, tol) {
    const g = this.g, p = g.player;
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d < (tol || 6)) return true;
    const t = 8;
    if (dx > t) this.hold('right'); else if (dx < -t) this.hold('left');
    if (dy > t) this.hold('down'); else if (dy < -t) this.hold('up');
    return false;
  }
  /** BFS over free tiles; returns next waypoint (pixel) or null */
  nextWaypoint(tx, ty, avoidHaz) {
    if (avoidHaz === undefined) { if (!this.brute) { const r = this.nextWaypoint(tx, ty, true); if (r) return r; } avoidHaz = false; }
    const g = this.g, C = this.ED.C, p = g.player, T = this.ED.T;
    const hazTile = j => { const t = g.room.tiles[j]; return t === T.SPIKE || t === T.LAVA; };
    const sx = Math.floor(p.x / 32), sy = Math.floor(p.y / 32);
    if (sx === tx && sy === ty) return { x: tx * 32 + 16, y: ty * 32 + 16 };
    const W = C.COLS, H = C.ROWS, prev = new Int16Array(W * H).fill(-1), q = [sy * W + sx]; prev[q[0]] = q[0];
    const blockedProp = new Set(); for (const pr of g.props) if (!pr.dead && pr.solid) blockedProp.add(Math.floor(pr.y / 32) * W + Math.floor(pr.x / 32));
    let found = false;
    for (let h = 0; h < q.length && !found; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (prev[j] >= 0) continue;
        const c = g.col[j]; if (c === 1 || c === 2) continue;
        if (avoidHaz && hazTile(j) && !(nx === tx && ny === ty)) continue;
        if (blockedProp.has(j) && !(nx === tx && ny === ty)) continue;
        prev[j] = i; q.push(j); if (nx === tx && ny === ty) { found = true; break; }
      }
    }
    if (!found) return null;
    let j = ty * W + tx; const chain = [];
    while (j !== sy * W + sx) { chain.push(j); j = prev[j]; }
    const nxt = chain[chain.length - 1 - Math.min(1, chain.length - 1)];
    return { x: (nxt % W) * 32 + 16, y: ((nxt / W) | 0) * 32 + 16 };
  }
  /** nearest walkable tile centre to (x,y) (the requested point may be inside a rock / prop) */
  snapFree(x, y) {
    const g = this.g, W = 30, H = 18, tx0 = Math.floor(x / 32), ty0 = Math.floor(y / 32);
    const props = new Set(); for (const pr of g.props) if (!pr.dead && pr.solid) props.add(Math.floor(pr.y / 32) * W + Math.floor(pr.x / 32));
    const free = (tx, ty) => tx > 0 && ty > 0 && tx < W - 1 && ty < H - 1 && g.col[ty * W + tx] === 0 && !props.has(ty * W + tx);
    if (free(tx0, ty0)) return { x, y };
    for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (free(tx0 + dx, ty0 + dy)) return { x: (tx0 + dx) * 32 + 16, y: (ty0 + dy) * 32 + 16 }; }
    return { x, y };
  }
  goTo(x, y, tol) {
    const sp = this.snapFree(x, y); x = sp.x; y = sp.y;
    const pl = this.g.player;
    if (Math.floor(pl.x / 32) === Math.floor(x / 32) && Math.floor(pl.y / 32) === Math.floor(y / 32)) return this.steerTo(x, y, tol || 6);
    const wp = this.nextWaypoint(Math.floor(x / 32), Math.floor(y / 32));
    if (!wp) { return this.steerTo(x, y, tol); }
    const last = Math.hypot(x - this.g.player.x, y - this.g.player.y) < (tol || 10);
    if (last) return true;
    this.steerTo(wp.x, wp.y, 4);
    return false;
  }
  // ---------------------------------------------------------------- floor graph
  canPass(e) {
    const g = this.g, p = g.player, L = this.ED.keys.LOCKS;
    if (e.hidden && !e.revealed) return false;
    if (e.lock && !e.lock.opened) {
      const d = L[e.lock.type];
      if (d.key) return (p.keys[d.key] | 0) > 0;
      if (d.bombs) return p.bombs > 0;
      if (d.puzzle) return false;
      return true;
    }
    return true;
  }
  routeTo(targetId) {
    const g = this.g, f = g.floor, cur = g.room.id;
    const prev = new Map([[cur, null]]), q = [cur];
    for (let h = 0; h < q.length; h++) {
      const id = q[h]; if (id === targetId) break;
      for (const d of this.ED.DIRS) {
        const e = f.rooms[id].doors[d]; if (!e) continue;
        const o = e.a === id ? e.b : e.a; if (prev.has(o)) continue;
        if (!this.canPass(e)) continue;
        prev.set(o, { from: id, dir: d, edge: e }); q.push(o);
      }
    }
    if (!prev.has(targetId)) return null;
    let id = targetId, step = null;
    while (prev.get(id)) { step = prev.get(id); if (step.from === cur) break; id = step.from; }
    return cur === targetId ? null : step;
  }
  chooseGoal() {
    const g = this.g, f = g.floor, p = g.player, ED = this.ED;
    const rooms = f.rooms, cur = g.room;
    const reachable = r => r.id === cur.id || this.routeTo(r.id);
    const cand = [];
    // switch puzzles first
    for (const r of rooms) if (r.puzzle && !r.puzzle.done && reachable(r)) cand.push([0, r]);
    // rooms holding uncollected keys (oracle)
    for (const r of rooms) if ((r.holds || []).some(h => !h.got && h.key !== 'boss') && !r.cleared && r.type !== 'miniboss' && reachable(r)) cand.push([1, r]);
    for (const r of rooms) if ((r.holds || []).some(h => !h.got && h.key !== 'boss') && r.type !== 'miniboss' && (r.cleared || r.type === 'treasure' || r.type === 'secret' || r.type === 'shop') && reachable(r) && r.visited) cand.push([1.5, r]);
    // bomb a hidden room that holds a key
    for (const e of f.edges) if (e.hidden && !e.revealed && (f.rooms[e.b].holds || []).some(h => !h.got) && p.bombs > 0) cand.push([1.2, f.rooms[e.a], e]);
    // unvisited normal/special rooms
    for (const r of rooms) if (!r.visited && r.type !== 'miniboss' && r.type !== 'boss' && r.type !== 'secret' && reachable(r)) cand.push([2 + (r.type === 'normal' ? 0.2 : 0), r]);
    // mini bosses
    for (const r of rooms) if (r.type === 'miniboss' && !r.cleared && reachable(r)) cand.push([3, r]);
    // boss
    const boss = rooms[f.bossId];
    if (!boss.cleared && reachable(boss)) cand.push([4, boss]);
    // rest room (full heal) before mega
    if (!cand.length) return null;
    cand.sort((a, b) => a[0] - b[0] || (a[1].dist - b[1].dist));
    const live = cand.filter(c => !(this.skip && this.skip.room === c[1].id && g.frame < this.skip.until));     // a room we just failed to finish here is deferred
    return live[0] || cand[0];
  }
  // ---------------------------------------------------------------- combat
  hostile() { return this.g.enemies.filter(e => !e.dead && !(e.intro > 0)); }
  fight(en) {
    const g = this.g, p = g.player, ED = this.ED;
    const w = ED.items.WEAPONS[p.weapon.type], kind = w.kind;
    const ranged = !!w.ranged || kind === 'bow' || kind === 'staff' || kind === 'boomerang';
    // choose target hurtbox
    let best = null, bd = 1e9;
    for (const e of en) {
      if (e.invuln && !e.parts) continue;
      for (const hb of g.hurtboxes(e)) {
        if (hb.part && !ED.bosses.partVulnerable(e, hb.part)) continue;
        const d = Math.hypot(hb.x - p.x, hb.y - p.y) - (e.minion ? 25 : 0);
        if (d < bd) { bd = d; best = { x: hb.x, y: hb.y, r: hb.r, e }; }
      }
    }
    if (!best) { best = en[0] && { x: en[0].x, y: en[0].y, r: en[0].r, e: en[0] }; }
    if (!best) return;
    // never hang around inside a big body (boss / mini boss): step out of it first
    if (ranged || !this.opts.god) for (const e of en) if (e.boss && !e.bdef.mega && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 30) {     // (only a god-mode MELEE bot may stay: it takes no contact damage, and a short weapon has to stand inside that radius to reach a core)
      let ax = p.x - e.x, ay = p.y - e.y; const l = Math.hypot(ax, ay); if (l < 5) { ax = 480 - p.x; ay = 288 - p.y; }
      const n = Math.hypot(ax, ay) || 1; this.steerTo(p.x + ax / n * 80, p.y + ay / n * 80, 3);
      if (p.dashCd <= 0 && l < e.r) this.press('dash');
      return;
    }
    const m = ED.input.mouse; m.aim = true; m.x = best.x; m.y = best.y + ED.C.HUD;
    const d = Math.hypot(best.x - p.x, best.y - p.y);
    const reach = ranged ? 230 + best.r * 0.5 : p.wrange * 0.9 + best.r * 0.95;      // swing hits the target's edge, so fight from just outside its body
    // dodge: step out of telegraphed zones (nearest safe point) and sidestep incoming bullets
    const dz = this.dodge();
    if (dz) { if (dz.dash && p.dashCd <= 0 && !this.opts.god) this.press('dash'); this.steerTo(dz.x, dz.y, 3); if (d < reach + 40) this.hold('attack'); return; }
    const guardUp = best.e.shieldArc && best.e.guardBreak <= 0 && best.e.state !== 'wind' && best.e.state !== 'bash' && !((this.fightT || 0) > 60 * 30);
    if (ranged && guardUp) {
      const back = best.e.face + Math.PI * 0.85, px = best.x + Math.cos(back) * 150, py = best.y + Math.sin(back) * 150;
      this.goTo(px, py, 12);
      const front = Math.abs(this.ED.U.angDiff(best.e.face, Math.atan2(p.y - best.y, p.x - best.x))) < best.e.shieldArc / 2 + 0.1;
      if (!front) this.hold('attack');
      return;
    }
    if (ranged && !this.los(p.x, p.y, best.x, best.y)) this.repoT = 50;
    if (ranged && this.repoT > 0) { this.repoT--; this.goTo(best.x, best.y, 10); this.hold('attack'); return; }     // no line of fire: commit to repositioning (hysteresis)
    if (ranged) {
      const lo = this.opts.god ? 80 : 140, hi = this.opts.god ? 150 : 225;      // a two-shot fan (boomerangs, arrows) straddles a small target at long range: the stall hunt shoots from closer
      if (d < lo) { let ax = p.x - best.x, ay = p.y - best.y; const l = Math.hypot(ax, ay); if (l < 6) { ax = 480 - p.x; ay = 288 - p.y; } this.awayStep(ax, ay); if (d < 30 && p.dashCd <= 0 && g.frame % 12 === 0) this.press('dash'); }      // (a foe hugging us — a Wraith, or a magnetic one pulling us in — is shaken off with a dash: shots cannot start inside its body)
      else if (d > hi) this.goTo(best.x, best.y, 10);
      else { const a = Math.atan2(best.y - p.y, best.x - p.x) + Math.PI / 2; this.steerTo(p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40, 3); }
      this.hold('attack');
    } else {
      const guardDown = best.e.state === 'wind' || best.e.state === 'bash';
      const desperate = (this.fightT || 0) > 60 * 30;       // fight dragging on: stop being clever, just brawl (+ bombs)
      if (desperate && d < 90 && g.frame % 70 === 0 && p.bombs > 0) this.press('bomb');
      const sh = !desperate && best.e.shieldArc && best.e.guardBreak <= 0 && !guardDown;
      if (sh && p.active && p.active.charges > 0 && ['bash', 'bomb', 'fire'].includes(p.active.item.id) && d < 110) { this.press('active'); }
      if (sh) {
        const front = Math.abs(this.ED.U.angDiff(best.e.face, Math.atan2(p.y - best.y, p.x - best.x))) < best.e.shieldArc / 2;
        if (d > 105) { this.goTo(best.x, best.y, 8); return; }                       // close the distance (it will lower its guard to lunge)
        if (front) { const a = Math.atan2(p.y - best.y, p.x - best.x) + 0.9; this.steerTo(best.x + Math.cos(a) * 62, best.y + Math.sin(a) * 62, 4); return; }   // slip around to the flank
        this.goTo(best.x, best.y, 8); if (d < reach + 14) this.hold('attack'); return;
      }
      if (d > reach * 0.92) { if (!this.goTo(best.x, best.y, 8)) { /* walking */ } }
      else if (d < best.r + 22 && best.e.def && best.e.def.contact !== false) { const a = Math.atan2(p.y - best.y, p.x - best.x); this.steerTo(p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40, 3); }
      if (d < reach + 12) this.hold('attack');
    }
    // abilities
    const a = p.active;
    if (a && a.charges > 0 && (en.length >= 3 || en.some(e => e.boss)) && g.frame % 50 === 0 && a.item.id !== 'heal' && a.item.id !== 'blink') this.press('active');
    if (a && a.item.id === 'heal' && a.charges > 0 && p.hp < p.maxHp * 0.45) this.press('active');
    if (p.dashCd <= 0 && d < 70 && g.frame % 37 === 0 && !this.opts.god) this.press('dash');
  }
  /** step roughly in direction (ax, ay), bending around whatever blocks it (a rock behind us used to pin the bot against it while a foe hugged it) */
  awayStep(ax, ay) {
    const g = this.g, p = g.player, ED = this.ED, base = Math.atan2(ay, ax); let use = base;
    for (const off of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, Math.PI]) {
      const a = base + off, x = p.x + Math.cos(a) * 36, y = p.y + Math.sin(a) * 36;
      if (x < 50 || y < 50 || x > 910 || y > 526 || ED.phys.blocked(g, x, y, 10, false, false) || g.props.some(pr => !pr.dead && pr.solid && Math.hypot(pr.x - x, pr.y - y) < pr.r + 12)) continue;
      use = a; break;
    }
    this.steerTo(p.x + Math.cos(use) * 60, p.y + Math.sin(use) * 60, 3);
  }
  /** clear line of fire for the player's projectiles: walls/rocks AND solid props (arrows break pots) */
  los(x1, y1, x2, y2) {
    const g = this.g, U = this.ED.U;
    for (const pr of g.props) if (!pr.dead && pr.solid && U.segDist(pr.x, pr.y, x1, y1, x2, y2) < pr.r + 7) return false;
    return this.ED.ai.clear(g, x1, y1, x2, y2, true);
  }
  /** returns {x,y,dash} when the player should move to avoid zones / bullets, else null */
  dodge() {
    const g = this.g, p = g.player, ED = this.ED, X = ED.zoneHits;
    if (this.opts.god) return null;
    const zones = g.zones.filter(z => !z.dead && (z.hurts !== false || z.shape === 'tiles') && (z.dmg > 0 || z.beam || z.shape === 'tiles') && (z.kind === 'tele' || z.kind === 'hazard' || z.kind === 'ring'));
    const T = ED.T, traps = (g.rt && g.rt.traps) || [];
    const unsafeAt = (x, y, pad) => {
      const tt = g.room.tiles[Math.floor(y / 32) * 30 + Math.floor(x / 32)]; if (tt === T.SPIKE || tt === T.LAVA) return true;
      for (const t of traps) {
        if (t.kind === 'spikes' && t.state >= 1 && Math.abs(x - t.x) < t.w / 2 + pad && Math.abs(y - t.y) < t.h / 2 + pad) return true;
        if (t.kind === 'saw' && Math.hypot(x - t.x, y - t.y) < t.r + pad + 12) return true;
        if (t.kind === 'turret' && t.charging && Math.abs(y - t.y) < 22) return true;
      }
      for (const z of zones) {
        if (z.shape === 'screen') { let safe = false; for (const s of z.safe || []) if (Math.hypot(s.x - x, s.y - y) < s.r - 12) safe = true; if (!safe && z.t > z.dur * 0.2) return true; continue; }
        const zz = z.shape === 'ring' ? Object.assign({}, z, { w: (z.w || 20) + pad * 2 }) : z.shape === 'line' ? Object.assign({}, z, { w: (z.w || 20) + pad * 2 }) : Object.assign({}, z, { r: (z.r || 0) + pad });
        if (z.kind === 'tele' && z.t < z.dur - 40 && z.shape !== 'screen' && z.dur > 50 && Math.hypot((z.x || 0) - x, (z.y || 0) - y) > (z.r || 0) + 200) continue;
        if (X(zz, x, y, p.hr + 2)) return true;
      }
      return false;
    };
    // bullets heading our way
    let bdanger = null, bd = 1e9;
    for (const b of g.eproj) {
      if (b.friendly || b.dead) continue;
      const dx = p.x - b.x, dy = p.y - b.y, dist = Math.hypot(dx, dy); if (dist > 150) continue;
      const sp = Math.hypot(b.vx, b.vy) || 1, t = (dx * b.vx + dy * b.vy) / (sp * sp);          // frames until closest approach
      if (t < 0 || t > 40) continue;
      const cx = b.x + b.vx * t, cy = b.y + b.vy * t, miss = Math.hypot(p.x - cx, p.y - cy);
      if (miss < b.r + 16 && t < bd) { bd = t; bdanger = { b, cx, cy }; }
    }
    const here = unsafeAt(p.x, p.y, 10);
    if (!here && !bdanger) return null;
    let best = null, bc = 1e9;
    for (let r = 30; r <= 170; r += 28) for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (x < 50 || y < 50 || x > 910 || y > 526) continue;
      if (ED.phys.blocked(g, x, y, 9, false, false)) continue;
      if (unsafeAt(x, y, 14)) continue;
      let cost = r;
      if (bdanger) { const vx = bdanger.b.vx, vy = bdanger.b.vy, sp = Math.hypot(vx, vy) || 1; const lat = Math.abs((x - bdanger.b.x) * vy - (y - bdanger.b.y) * vx) / sp; if (lat < bdanger.b.r + 18) cost += 120; }
      if (cost < bc) { bc = cost; best = { x, y }; }
    }
    if (!best) return here ? { x: 480, y: 288, dash: true } : null;
    return { x: best.x, y: best.y, dash: here && bc > 60 };
  }
  // ---------------------------------------------------------------- one tick
  tick() {
    const g = this.g, ED = this.ED, inp = ED.input, p = g.player;
    inp.sim = inp.sim || { held: {}, edge: {} };
    inp.sim.held = {};
    if (g.scene === 'intro') { this.press('confirm'); return; }
    if (g.scene !== 'play') return;
    if (g.modal) { this.handleModal(); return; }
    if (g.trans || g.transFloor) return;
    if (this.opts.god) { g.god = true; }
    const m = inp.mouse; m.aim = false;
    if (this.roomOf !== g.room.id) { this.roomOf = g.room.id; this.roomT = 0; this.brute = false; } else if (++this.roomT > 60 * 45) this.brute = true;
    this.stuck = this.lastPos && Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y) < 0.5 ? this.stuck + 1 : 0; this.lastPos = { x: p.x, y: p.y };
    const en = this.hostile();
    const room = g.room, rt = g.rt;
    // unstick: if we have not moved for a while, path to the room centre (dashing) for a moment
    // pinned against a pot or a rock the bot jitters by a pixel or two, which resets the exact-position counter above: while it is walking somewhere with nothing to fight, also measure real displacement
    if (!en.length && !g.spawns.length && this.goal) { if (!this.anchor || Math.hypot(p.x - this.anchor.x, p.y - this.anchor.y) > 8) { this.anchor = { x: p.x, y: p.y }; this.navStuck = 0; } else this.navStuck = (this.navStuck || 0) + 1; } else { this.anchor = null; this.navStuck = 0; }
    if ((this.stuck > 70 || this.navStuck > 100) && !this.unstickT) { this.unstickT = 50; this.navStuck = 0; }
    if (this.unstickT > 0) {
      this.unstickT--; if (this.unstickT === 0) { this.stuck = 0; this.goal = null; }
      if (this.unstickT % 20 === 0 && p.dashCd <= 0) this.press('dash');
      this.goTo(480, 288, 20);
      if (en.length) this.hold('attack');
      return;
    }
    this.fightT = (en.length ? (this.fightT || 0) + 1 : 0);
    if (en.length || g.spawns.length) { if (en.length) this.fight(en); else { /* wait for spawns: keep distance from centre */ } return; }
    if (rt.enc && (rt.enc.state === 'warm' || rt.enc.state === 'gap' || rt.enc.state === 'fight') && !room.cleared) { return; }
    if (room.type === 'boss' || room.type === 'miniboss') { if (rt.bossStarted && !room.cleared) { return; } }
    // heal when hurt and a healer is around
    // pickups
    // (a pickup it gave up on must not shadow the next-nearest one, and the current target is kept while it is still wanted: three loose coins at equal distance used to make the bot shuffle between them forever)
    const want = k => !k.dead && !(k.type === 'heart' && p.hp >= p.maxHp) && (this.noGo.get(k) || 0) < 9999;
    let best = this.pickTarget && want(this.pickTarget) && g.pickups.indexOf(this.pickTarget) >= 0 ? this.pickTarget : null, bd = 1e9;
    if (!best) for (const k of g.pickups) {
      if (!want(k)) continue;
      const d = Math.hypot(k.x - p.x, k.y - p.y); if (d < bd) { bd = d; best = k; }
    }
    this.pickTarget = best;
    if (best) { if (this.stuck > 40 || (this.noGo.get(best) || 0) > 600) { this.noGo.set(best, 9999); this.pickTarget = null; } else { this.noGo.set(best, (this.noGo.get(best) || 0) + 1); this.goTo(best.x, best.y, 6); return; } }
    // interactables
    const inter = this.pickInter();
    if (inter) {
      if (Math.hypot(inter.x - p.x, inter.y - p.y) < 40) { if (g.frame % 8 === 0) this.press('interact'); }
      else this.goTo(inter.x, inter.y + (inter.type === 'pedestal' ? 22 : 24), 8);
      this.noGo.set(inter, (this.noGo.get(inter) || 0) + 1); return;
    }
    // doors that need work (bomb / sacrifice)
    if (g.doorHint) {
      const dh = g.doorHint;
      if (dh.lock && dh.lock.type === 'sacrifice' && g.frame % 10 === 0) { this.press('interact'); return; }
    }
    // navigate
    if (!this.goal || g.frame - this.goalT > 30 || this.goal[1].id === room.id && !this.goal[2]) { this.goal = this.chooseGoal(); this.goalT = g.frame; }
    if (!this.goal) { return this.finish(); }
    const [, target, hiddenEdge] = this.goal;
    if (hiddenEdge && room.id === target.id) { this.bombWall(this.ED.rooms.doorCenter(hiddenEdge.dirAB), hiddenEdge.dirAB); return; }
    if (target.id === room.id) {
      // puzzle work or waiting on loot — handled by pickups/inters/puzzle helper
      if (room.puzzle && !room.puzzle.done) { this.solvePuzzle(); return; }
      this.skip = { room: room.id, until: g.frame + 60 * 40 };     // nothing more to do here right now (e.g. cannot afford the reserved key yet)
      this.goal = null; return;
    }
    const step = this.routeTo(target.id);
    if (!step) { this.goal = null; return; }
    const e = step.edge, d = step.dir;
    if (e.lock && !e.lock.opened) {
      const t = this.ED.keys.LOCKS[e.lock.type];
      const c = ED.rooms.doorCenter(d);
      if (t.bombs) { this.bombWall(c, d); return; }
    }
    const [[tx, ty]] = ED.rooms.DOOR_TILES[d];
    const c = ED.rooms.doorCenter(d);
    const dist = Math.hypot(c.x - p.x, c.y - p.y);
    const inward = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] }[d];
    const doorOpen = this.g.doorState(this.g.room, d) === 'open';
    if (dist > 70) { if (doorOpen) this.goTo(c.x, c.y, 12); else this.goTo(c.x + inward[0] * 44, c.y + inward[1] * 44, 8); }
    else {
      // push through
      const out = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[d];
      this.steerTo(c.x + out[0] * 40, c.y + out[1] * 40, 2);
      if (e.lock && !e.lock.opened) { /* near a locked door: auto-use key or pact */ }
    }
  }
  pickInter() {
    const g = this.g, p = g.player, ED = this.ED;
    let best = null, bd = 1e9;
    for (const it of g.inters) {
      if (it.dead || it.disabled) continue;
      if ((this.noGo.get(it) || 0) > 900) continue;
      let want = false;
      switch (it.type) {
        case 'pedestal': {
          if (it.loot || it.devil) { want = false; break; }
          if (it.price && !(it.price.gold !== undefined && p.gold >= it.price.gold + 30)) { want = false; break; }
          if (it.item.curse && !this.opts.takeCurses) { want = false; break; }
          const v = this.value(it.item);
          const peers = g.inters.filter(o => o.type === 'pedestal' && !o.dead && !o.disabled && (it.group ? o.group === it.group : o === it));
          const bestV = Math.max.apply(null, peers.map(o => this.value(o.item)));
          want = v > 0 && v >= bestV;
          break;
        }
        case 'chest': want = true; break;
        case 'keyaltar': want = true; break;
        case 'fountain': case 'camp': want = it.uses > 0 && p.hp < p.maxHp * 0.7; break;
        case 'healfont': want = p.hp < p.maxHp * 0.9 || it.color === '#ff4a6a'; break;
        case 'stairs': want = g.room.cleared; break;
        case 'altar': want = false; break;
        case 'service': want = it.hold ? (it.price() <= p.gold) : (it.name === 'Healing Draught' && p.hp < p.maxHp * 0.5 && p.gold > it.price()); break;
        case 'plate': want = !it.pressed; break;
        default: want = false;
      }
      if (!want) continue;
      const d = Math.hypot(it.x - p.x, it.y - p.y) - (it.type === 'stairs' ? -1000 : 0);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }
  value(item) {
    const p = this.g.player, ED = this.ED;
    if (item.cat === 'relic') { const r = ED.items.relic(item.id); return 40 + ED.items.RARITY[r.rarity].rank * 10 - (r.tag === 'risk' ? 12 : 0); }
    if (item.cat === 'armor') { const cur = p.armor[item.slot]; return cur ? (item.def - cur.def) * 12 + (Object.keys(item.mods).length - Object.keys(cur.mods).length) * 2 : 45; }
    if (item.cat === 'weapon') { const a = ED.items.weaponStats(item), b = ED.items.weaponStats(p.weapon); return (a.dps - b.dps) * 4; }
    if (item.cat === 'active') return 10;
    return 0;
  }
  solvePuzzle() {
    const g = this.g, p = g.player, rt = g.rt;
    const pz = g.room.puzzle;
    const objs = (rt.puzzleObjs || []).filter(o => !(o.pressed || o.lit));
    if (!objs.length) return;
    const o = objs[0];
    if (pz.kind === 'plates') this.goTo(o.x, o.y, 6);
    else {
      // braziers: walk to a spot within the weapon's reach with a CLEAR line of fire (a rock corner stops an orb dead; standing "close enough" next to one never lit anything), then attack
      const wd = this.ED.items.WEAPONS[p.weapon.type], w = wd.kind, ranged = !!wd.ranged || w === 'bow' || w === 'staff' || w === 'boomerang';
      const reach = ranged ? Math.min(p.wrange * 0.8, 120) : p.wrange + 8;       // close enough that a two-shot fan (boomerangs, arrows) still straddles a 13px brazier
      if (!this.fireSpot || this.fireSpot.o !== o || g.frame - this.fireSpot.t > 240) this.fireSpot = { o, t: g.frame, at: this.firingSpot(o, ranged ? 40 : o.r + 14, ranged ? reach : p.wrange + o.r * 0.6) };
      const sp = this.fireSpot.at || { x: o.x, y: o.y };
      if (Math.hypot(sp.x - p.x, sp.y - p.y) > 12) this.goTo(sp.x, sp.y, 8);
      else { const m = this.ED.input.mouse; m.aim = true; m.x = o.x; m.y = o.y + this.ED.C.HUD; this.hold('attack'); }
    }
  }
  /** nearest standing point (by straight distance) within [minR, maxR] of a prop with a clear line to it for a projectile or a swing: free ground, no rock or other solid prop in the way */
  firingSpot(o, minR, maxR) {
    const g = this.g, p = g.player, ED = this.ED, U = ED.U; let best = null, bd = 1e9;
    for (let r = minR; r <= Math.max(minR, maxR); r += 6) for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12, x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
      if (x < 50 || y < 50 || x > 910 || y > 526 || ED.phys.blocked(g, x, y, 10, false, false)) continue;
      let ok = true;
      for (const pr of g.props) if (!pr.dead && pr.solid && (Math.hypot(pr.x - x, pr.y - y) < pr.r + 14 || (pr !== o && U.segDist(pr.x, pr.y, x, y, o.x, o.y) < pr.r + 7))) { ok = false; break; }
      for (let i = 1; ok && i < r / 8; i++) { const t = i * 8 / r; if (ED.phys.blocked(g, x + (o.x - x) * t, y + (o.y - y) * t, 6, true, false)) ok = false; }
      if (!ok) continue;
      const d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; best = { x, y }; }
    }
    return best;
  }
  bombWall(c, dir) {
    const g = this.g, p = g.player;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    const inward = dir ? { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] }[dir] : [0, 0];
    if (d > 55) { this.goTo(c.x + inward[0] * 40, c.y + inward[1] * 40, 8); return; }
    if (this.bombT <= 0 && p.bombs > 0) { this.press('bomb'); this.bombT = 120; }
    else if (this.bombT > 0) { this.bombT--; const a = Math.atan2(p.y - c.y, p.x - c.x); this.steerTo(p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70, 4); }
  }
  handleModal() {
    const g = this.g, m = g.modal;
    if (m.type === 'sacrifice') { g.paySacrifice(g.player.gold >= m.lock.params.gold + 40 ? 'gold' : 'hp'); }
    else if (m.type === 'milestone') { g.modal = null; }
    else if (m.type === 'talent') { this.ED.modalImpl.talent.update(g, m, 'pick:0', this.ED.input); }       // v12: take the first talent offered
  }
  finish() { /* nothing left to do on this floor */ this.done = true; }
}
module.exports = { Bot };

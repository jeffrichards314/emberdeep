/* EMBERDEEP — enemies.js
 * Enemy type table (12 behaviours + minions), elite modifier table, AI helpers.
 * An enemy = one entry in ENEMIES; a modifier = one entry in MODS.
 * AI runs in world-time: use g.ts (time scale) for every movement/timer.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D;
  const TAU = U.TAU;

  // ------------------------------------------------------------------ AI helpers
  const COLS = ED.C.COLS, ROWS = ED.C.ROWS, TILE = ED.C.TILE;
  const A = ED.ai = {
    /** BFS distance field from the player's tile (cached ~8 frames). air=true lets flyers cross pits. */
    field(g, air) {
      const p = g.player, tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      const key = air ? '_pfA' : '_pfG';
      let f = g[key];
      if (f && f.room === g.room && f.tx === tx && f.ty === ty && g.frame - f.frame < 8) return f;
      if (!f || f.room !== g.room) f = g[key] = { dist: new Int16Array(COLS * ROWS), room: g.room, tx: -1, ty: -1, frame: -99 };
      const dist = f.dist; dist.fill(-1);
      const q = new Int16Array(COLS * ROWS); let h = 0, t = 0;
      const start = Math.max(0, Math.min(ROWS - 1, ty)) * COLS + Math.max(0, Math.min(COLS - 1, tx)); dist[start] = 0; q[t++] = start;
      const col = g.col;
      // solid props (pots / crates / braziers) block walkers just like rocks
      const blockedTile = new Uint8Array(COLS * ROWS);
      for (const pr of g.props) if (!pr.dead && pr.solid) blockedTile[Math.floor(pr.y / TILE) * COLS + Math.floor(pr.x / TILE)] = 1;
      if (blockedTile[start]) blockedTile[start] = 0;
      while (h < t) {
        const i = q[h++], x = i % COLS, y = (i / COLS) | 0, d = dist[i] + 1;
        if (x > 0) { const j = i - 1; if (dist[j] < 0 && col[j] !== 1 && !blockedTile[j] && (air || col[j] !== 2)) { dist[j] = d; q[t++] = j; } }
        if (x < COLS - 1) { const j = i + 1; if (dist[j] < 0 && col[j] !== 1 && !blockedTile[j] && (air || col[j] !== 2)) { dist[j] = d; q[t++] = j; } }
        if (y > 0) { const j = i - COLS; if (dist[j] < 0 && col[j] !== 1 && !blockedTile[j] && (air || col[j] !== 2)) { dist[j] = d; q[t++] = j; } }
        if (y < ROWS - 1) { const j = i + COLS; if (dist[j] < 0 && col[j] !== 1 && !blockedTile[j] && (air || col[j] !== 2)) { dist[j] = d; q[t++] = j; } }
      }
      f.tx = tx; f.ty = ty; f.frame = g.frame;
      return f;
    },
    /** is the straight line between two points free of walls / rocks (and pits, for walkers)? */
    clear(g, x1, y1, x2, y2, air) {
      if (!air) for (const pr of g.props) { if (pr.dead || !pr.solid) continue; if (U.segDist(pr.x, pr.y, x1, y1, x2, y2) < pr.r + 9) return false; }
      const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 14);
      for (let i = 1; i < n; i++) {
        const t = i / n, c = ED.phys.tileCode(g, Math.floor((x1 + (x2 - x1) * t) / TILE), Math.floor((y1 + (y2 - y1) * t) / TILE));
        if (c === 1 || (c === 2 && !air)) return false;
      }
      return true;
    },
    /** heading for e to reach the player: straight when visible, otherwise down the flow field */
    heading(g, e, directAng) {
      const p = g.player, air = !!e.flying;
      if (A.clear(g, e.x, e.y, p.x, p.y, air)) return directAng;
      const f = A.field(g, air), ex = Math.floor(e.x / TILE), ey = Math.floor(e.y / TILE);
      const i0 = Math.max(0, Math.min(ROWS - 1, ey)) * COLS + Math.max(0, Math.min(COLS - 1, ex));
      let best = f.dist[i0] < 0 ? 99999 : f.dist[i0], bx = -1, by = -1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = ex + dx, ny = ey + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const dd = f.dist[ny * COLS + nx]; if (dd < 0) continue;
        if (dx && dy && (f.dist[ey * COLS + nx] < 0 || f.dist[ny * COLS + ex] < 0)) continue;     // no corner cutting
        const cost = dd + (dx && dy ? 0.4 : 0);
        if (cost < best) { best = cost; bx = nx; by = ny; }
      }
      if (bx < 0) return directAng;
      return Math.atan2(by * TILE + 16 - e.y, bx * TILE + 16 - e.x);
    },
    /** walk toward the player, navigating around obstacles (wobble only applies in the open) */
    chase(g, e, i, speed, wobble) {
      const direct = i.ang + (wobble || 0);
      const open = A.clear(g, e.x, e.y, g.player.x, g.player.y, !!e.flying);
      return A.walk(g, e, open ? direct : A.heading(g, e, i.ang), speed);
    },
    info(g, e) {
      const p = g.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 0.001;
      return { dx, dy, d, ang: Math.atan2(dy, dx) };
    },
    walk(g, e, ang, speed) {
      return ED.phys.move(g, e, Math.cos(ang) * speed * g.ts, Math.sin(ang) * speed * g.ts);
    },
    /** keep roughly `ideal` distance and strafe; returns nothing */
    kite(g, e, i, ideal, speed, strafe) {
      if (e.rush) { A.chase(g, e, i, speed * 1.15, 0); return; }          // desperate survivors charge
      let ang = i.ang;
      if (i.d >= ideal - 40 && !A.clear(g, e.x, e.y, g.player.x, g.player.y, !!e.flying)) { A.walk(g, e, A.heading(g, e, i.ang), speed); return; }
      if (i.d > ideal + 30) ang = A.heading(g, e, i.ang);
      if (i.d < ideal - 40) ang += Math.PI;                     // back off
      else if (i.d < ideal + 30) ang += Math.PI / 2 * (e.strafeDir || 1);      // strafe
      if (i.d >= ideal - 40 && i.d < ideal + 30 && (e.t | 0) % 140 === 0) e.strafeDir = -(e.strafeDir || 1);
      const blocked = A.walk(g, e, ang, speed * (i.d < ideal + 30 && i.d > ideal - 40 ? (strafe || 0.7) : 1));
      if (blocked.bx || blocked.by) e.strafeDir = -(e.strafeDir || 1);
    },
    /** fire a pattern of enemy bullets depending on the difficulty pattern tier */
    patternVolley(g, e, tier, ang, speed, dmg, color) {
      const vol = e.volley || 0;
      const fan = (n, spread, s, off) => {
        for (let k = 0; k < n; k++) g.eShot(e, ang + off + (k - (n - 1) / 2) * spread, s, { dmg, color });
      };
      const ring = (n, s, off) => { for (let k = 0; k < n; k++) g.eShot(e, off + k * TAU / n, s, { dmg: dmg * 0.8, color, r: 4 }); };
      switch (Math.min(tier, 5)) {
        case 0: fan(1 + vol, 0.22, speed, 0); break;
        case 1: fan(3 + vol, 0.3, speed, 0); break;
        case 2: fan(3 + vol, 0.3, speed, 0); e.later = { t: 18, fn() { ring(6, speed * 0.7, ang + 0.3); } }; break;
        case 3: fan(5 + vol, 0.24, speed, 0);
          e.later = { t: 16, fn() { fan(4, 0.4, speed * 0.85, 0.2); } }; break;
        case 4: fan(5 + vol, 0.22, speed, 0); e.later = { t: 14, fn() { ring(8, speed * 0.75, ang); } }; break;
        default: fan(7 + vol, 0.2, speed, 0); e.later = { t: 12, fn() { ring(10, speed * 0.8, ang + 0.15); } };
      }
    },
  };

  // ------------------------------------------------------------------ enemy types
  /* fields: r hp speed dmg(contact) shot(base shot dmg) cost weight minFloor group noElite
   *         shape color  contact(bool)  flying  update(e,g)  onDeath(e,g)  draw(ctx,e,t) */
  const ENEMIES = {
    chaser: {
      id: 'chaser', name: 'Gloomling', shape: 'circle', color: '#d9534f', r: 12, hp: 10, speed: 1.3, dmg: 3, cost: 1, weight: 10, minFloor: 1, contact: true,
      desc: 'A hungry shade that runs straight at you. Deeper ones lunge.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'lunge') {
          A.walk(g, e, e.lungeAng, 4.4 * e.spdMul);
          if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 90 / e.rate; }
          return;
        }
        if (e.state === 'wind') {
          e.windup -= g.ts; e.lungeAng = i.ang;
          if (e.windup <= 0) { e.state = 'lunge'; e.sT = 16; g.sfx('lunge'); }
          return;
        }
        const wob = Math.sin(e.t * 0.08 + e.seed) * 0.6;
        A.chase(g, e, i, e.curSpeed, wob);
        if (g.dif.patternTier >= 1 && (e.cd -= g.ts) <= 0 && i.d < 190) { e.state = 'wind'; e.windup = g.tele(26); }
      },
      draw(c, e) { eyes(c, e, 0.4); },
    },

    shooter: {
      id: 'shooter', name: 'Bonewatcher', shape: 'tri', color: '#e8b04a', r: 12, hp: 8, speed: 1.0, dmg: 2, shot: 3, cost: 1.3, weight: 9, minFloor: 1, contact: true,
      desc: 'Keeps its distance and fires bolts. Patterns grow denser with depth.',
      init(e, g) { e.cd = 60 + g.rng.int(0, 80); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'aim') {
          e.windup -= g.ts;
          if (e.windup <= 0) {
            A.patternVolley(g, e, g.dif.patternTier, i.ang, 2.8, 1, '#ffd24a');
            g.sfx('shoot'); e.state = null; e.cd = (95 + g.rng.int(0, 45)) / e.rate;
          }
          return;
        }
        A.kite(g, e, i, 215, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0) { e.state = 'aim'; e.windup = g.tele(26); }
      },
      draw(c, e) { eyes(c, e, 0.5); },
    },

    charger: {
      id: 'charger', name: 'Tusker', shape: 'diamond', color: '#a569d6', r: 14, hp: 16, speed: 0.85, dmg: 4, cost: 1.6, weight: 7, minFloor: 2, contact: true,
      desc: 'Telegraphs a line, then charges. Stunned if it hits a wall.',
      init(e, g) { e.cd = 60; },
      update(e, g) {
        const i = A.info(g, e);
        if (e.state === 'wind') {
          e.windup -= g.ts;
          if (e.windup > 10) e.face = e.cAng = i.ang;
          if (e.windup <= 0) { e.state = 'dash'; e.sT = 40; g.sfx('lunge'); }
          return;
        }
        if (e.state === 'dash') {
          const b = A.walk(g, e, e.cAng, 6.6 * e.spdMul);
          g.trailFx(e.x, e.y, e.color, 0.6);
          if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 70 / e.rate; }
          else if (b.bx || b.by) { e.state = 'stun'; e.sT = 60; g.shake(5); g.burst(e.x, e.y, 10, '#fff', 3, 20); g.sfx('thud'); }
          return;
        }
        if (e.state === 'stun') { e.sT -= g.ts; e.vuln = 1.3; if (e.sT <= 0) { e.state = null; e.vuln = 1; e.cd = 60 / e.rate; } return; }
        e.face = i.ang;
        A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 330 && i.d > 80 && A.clear(g, e.x, e.y, g.player.x, g.player.y, false)) { e.state = 'wind'; e.windup = g.tele(42); e.cAng = i.ang; }
      },
      draw(c, e) { eyes(c, e, 0.45); },
    },

    swarm: {
      id: 'swarm', name: 'Gnat', shape: 'circle', color: '#c8e04a', r: 7, hp: 3, speed: 1.9, dmg: 1.5, cost: 0.35, weight: 6, minFloor: 2, group: 5, contact: true, flying: true,
      desc: 'Fast, fragile and always in a crowd.',
      init(e, g) { e.seed = g.rng.next() * 100; },
      update(e, g) {
        const i = A.info(g, e);
        A.chase(g, e, i, e.curSpeed * (0.8 + 0.4 * Math.sin(e.t * 0.2 + e.seed)), Math.sin(e.t * 0.12 + e.seed) * 1.1);
      },
    },

    shielded: {
      id: 'shielded', name: 'Bulwark', shape: 'hex', color: '#6f8fb8', r: 14, hp: 18, speed: 0.85, dmg: 3, cost: 1.8, weight: 6, minFloor: 3, contact: true,
      shield: 2.4,
      desc: 'Frontal shield blocks everything — but it drops its guard to lunge. Flank it, or break the guard with a hammer slam / shield bash.',
      init(e, g) { e.face = 0; e.cd = 90; e.guardBreak = 0; },
      update(e, g) {
        const i = A.info(g, e);
        if (e.guardBreak > 0) e.guardBreak -= g.ts;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = 'bash'; e.sT = 14; g.sfx('lunge'); } return; }
        if (e.state === 'bash') { A.walk(g, e, e.face, 5.2 * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 110 / e.rate; } return; }
        const tgt = A.clear(g, e.x, e.y, g.player.x, g.player.y, false) ? i.ang : A.heading(g, e, i.ang);
        e.face = U.approachAngle(e.face, tgt, 0.024 * g.ts * (e.spdMul || 1));
        A.walk(g, e, e.face, e.curSpeed);
        if ((e.cd -= g.ts) <= 0 && i.d < 120) { e.state = 'wind'; e.windup = g.tele(30); }
      },
    },

    bomber: {
      id: 'bomber', name: 'Bombardier', shape: 'circle', color: '#e0803a', r: 12, hp: 10, speed: 1.0, dmg: 2, shot: 5, cost: 1.7, weight: 6, minFloor: 4, contact: true,
      desc: 'Lobs bombs onto your position. Run, don\'t stand.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 50); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'throw') {
          e.windup -= g.ts;
          if (e.windup <= 0) {
            const p = g.player, lead = 14;
            const tx = p.x + (p.vx || 0) * lead, ty = p.y + (p.vy || 0) * lead;
            const tier = g.dif.patternTier;
            const n = tier >= 3 ? 3 : 1;
            for (let k = 0; k < n; k++) {
              const ox = k === 0 ? 0 : (k === 1 ? 70 : -70) * (g.rng.chance(0.5) ? 1 : -1), oy = k === 0 ? 0 : g.rng.range(-50, 50);
              g.bombZone(e, tx + ox, ty + oy, 52, g.tele(70), e.shotDmg, { shrapnel: tier >= 2 ? 6 : 0 });
            }
            e.state = null; e.cd = 150 / e.rate; g.sfx('shoot');
          }
          return;
        }
        A.kite(g, e, i, 230, e.curSpeed, 0.6);
        if ((e.cd -= g.ts) <= 0) { e.state = 'throw'; e.windup = g.tele(22); }
      },
      onDeath(e, g) { g.zoneCircle(e, e.x, e.y, 50, g.tele(26), e.shotDmg, { color: '#ff8a2a', burst: true }); },
      draw(c, e) {
        c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(e.x, e.y - 14, 4, 0, TAU); c.fill();
        c.strokeStyle = '#ffd24a'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x, e.y - 18); c.lineTo(e.x + 4, e.y - 24 + Math.sin(e.t * 0.3) * 2); c.stroke();
        eyes(c, e, 0.4);
      },
    },

    summoner: {
      id: 'summoner', name: 'Hexweaver', shape: 'tri', color: '#4ad07a', r: 13, hp: 14, speed: 0.75, dmg: 2, shot: 3, cost: 2.2, weight: 5, minFloor: 5, contact: true,
      desc: 'Calls minions from the shadows. Kill it first.',
      init(e, g) { e.cd = 110; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'cast') {
          e.windup -= g.ts;
          if (e.windup <= 0) {
            const n = Math.min(4, 2 + Math.floor(g.floorNum / 8));
            for (let k = 0; k < n; k++) g.queueSpawn('imp', e.x + Math.cos(e.castAng + k * TAU / n) * 52, e.y + Math.sin(e.castAng + k * TAU / n) * 52, { minion: true, quick: true });
            e.state = null; e.cd = 240 / e.rate; g.sfx('summon');
          }
          return;
        }
        A.kite(g, e, i, 270, e.curSpeed, 0.6);
        e.cd -= g.ts;
        const alive = g.enemies.filter(x => x.minion && !x.dead).length;
        if (e.cd <= 0 && alive < 5 + Math.floor(g.floorNum / 6)) { e.state = 'cast'; e.windup = g.tele(34); e.castAng = g.rng.next() * TAU; g.burst(e.x, e.y, 10, '#4ad07a', 2, 24); }
        else if (e.cd <= 0) e.cd = 60;
        if (g.dif.patternTier >= 2 && e.t % 190 === 0 && e.state == null) g.eShot(e, i.ang, 2.2, { dmg: 1, color: '#6bffa0', r: 6, homing: 0.012 });
      },
      draw(c, e) { c.fillStyle = '#1b5a35'; c.beginPath(); c.arc(e.x, e.y - 18, 3, 0, TAU); c.fill(); eyes(c, e, 0.5); },
    },

    teleporter: {
      id: 'teleporter', name: 'Blinkling', shape: 'diamond', color: '#4ad8ff', r: 11, hp: 9, speed: 0, dmg: 2, shot: 3, cost: 1.8, weight: 5, minFloor: 6, contact: false,
      desc: 'Vanishes and reappears next to you, firing as it arrives.',
      init(e, g) { e.cd = 60; e.vis = 1; },
      update(e, g) {
        const i = A.info(g, e);
        e.face = i.ang;
        if (e.state === 'fade') {
          e.windup -= g.ts; e.vis = Math.max(0, e.windup / e.windup0); e.invuln = e.vis < 0.5;
          if (e.windup <= 0) {
            const spot = g.findSpot(g.player.x, g.player.y, 130, 230, 14);
            e.tx = spot.x; e.ty = spot.y; e.state = 'gone'; e.windup = g.tele(34); e.windup0 = e.windup; e.invuln = true;
            g.zoneRing(e, e.tx, e.ty, 16, 26, e.windup, 0, { color: '#4ad8ff', hurts: false });
          }
          return;
        }
        if (e.state === 'gone') {
          e.windup -= g.ts;
          if (e.windup <= 0) {
            e.x = e.tx; e.y = e.ty; e.state = 'appear'; e.windup = 14; e.invuln = false; e.vis = 1;
            g.burst(e.x, e.y, 14, '#4ad8ff', 3, 24);
            const ii = A.info(g, e);
            A.patternVolley(g, e, Math.min(2, g.dif.patternTier), ii.ang, 3.0, 1, '#7fe8ff');
            if (g.dif.patternTier >= 3) { e.later = { t: 20, fn() { const q = A.info(g, e); A.patternVolley(g, e, 1, q.ang, 3.2, 1, '#7fe8ff'); } }; }
          }
          return;
        }
        if (e.state === 'appear') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 55 / e.rate; } return; }
        e.vis = 1;
        if ((e.cd -= g.ts) <= 0) { e.state = 'fade'; e.windup = g.tele(22); e.windup0 = e.windup; }
      },
      draw(c, e) { eyes(c, e, 0.45); },
    },

    spinner: {
      id: 'spinner', name: 'Spiral Idol', shape: 'star', color: '#e060d0', r: 14, hp: 22, speed: 0, dmg: 3, shot: 2.5, cost: 2.1, weight: 4, minFloor: 7, contact: true, noElite: false,
      desc: 'Stationary idol that sprays spiralling bullet patterns.',
      init(e, g) { e.cd = 90; e.rot = g.rng.next() * TAU; },
      update(e, g) {
        const i = A.info(g, e);
        if (e.state === 'spin') {
          e.sT -= g.ts; e.rot += 0.045 * g.ts * e.dir;
          e.fT -= g.ts;
          if (e.fT <= 0) {
            e.fT = 6 / e.rate;
            const arms = e.arms;
            for (let k = 0; k < arms; k++) g.eShot(e, e.rot + k * TAU / arms, 2.3, { dmg: 1, color: '#ff80ec', r: 4.5 });
          }
          if (e.sT <= 0) { e.state = null; e.cd = 150 / e.rate; }
          return;
        }
        if (e.state === 'wind') { e.windup -= g.ts; e.rot += 0.2; if (e.windup <= 0) { e.state = 'spin'; e.sT = 110; e.fT = 0; e.dir = g.rng.chance(0.5) ? 1 : -1; e.arms = 2 + Math.min(4, Math.floor(g.dif.patternTier)); g.sfx('summon'); } return; }
        if ((e.cd -= g.ts) <= 0) { e.state = 'wind'; e.windup = g.tele(30); }
        e.face = i.ang;
      },
      draw(c, e) {
        c.save(); c.translate(e.x, e.y); c.rotate(e.rot || 0);
        c.strokeStyle = '#ffd0f8'; c.lineWidth = 2;
        for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(6, 0); c.lineTo(e.r + 4, 0); c.stroke(); }
        c.restore();
      },
    },

    splitter: {
      id: 'splitter', name: 'Jelloid', shape: 'blob', color: '#7ae06a', r: 16, hp: 16, speed: 1.0, dmg: 3, cost: 1.7, weight: 5, minFloor: 8, contact: true,
      desc: 'Hops after you. Splits into smaller jellets when killed.',
      init(e, g) { e.cd = 30; e.gen = e.gen || 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'hop') { A.walk(g, e, e.hopAng, 3.0 * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 38 / e.rate; } return; }
        if ((e.cd -= g.ts) <= 0) { e.state = 'hop'; e.sT = 20; e.hopAng = A.heading(g, e, i.ang); }
      },
      onDeath(e, g) {
        if ((e.gen || 0) >= 1 + (g.floorNum >= 16 ? 1 : 0)) return;
        for (let k = 0; k < 2; k++) {
          const a = k * Math.PI + g.rng.next();
          g.spawnEnemy('splitter', e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14, { gen: (e.gen || 0) + 1, hpMul: 0.45, scale: 0.7, minion: true, noXp: true, quick: true });
        }
      },
    },

    phantom: {
      id: 'phantom', name: 'Wraith', shape: 'ghost', color: '#b8c4ff', r: 12, hp: 14, speed: 1.1, dmg: 3, cost: 1.9, weight: 5, minFloor: 9, contact: true, ghost: true, flying: true,
      desc: 'Flickers in and out of reality. Only vulnerable while solid.',
      init(e, g) { e.t = g.rng.int(0, 80); e.flick = true; },
      update(e, g) {
        const i = A.info(g, e);
        const cyc = (e.t % 100);
        e.solid = cyc < 58; e.invuln = !e.solid; e.vis = e.solid ? 1 : 0.28;
        e.noContact = !e.solid;
        A.walk(g, e, i.ang, e.curSpeed * (e.solid ? 0.8 : 1.4));
        if (cyc === 57 && g.dif.patternTier >= 2) A.patternVolley(g, e, 1, i.ang, 2.8, 1, '#c8d0ff');
      },
    },

    lancer: {
      id: 'lancer', name: 'Pikeguard', shape: 'tri', color: '#d0d8e8', r: 13, hp: 22, speed: 1.2, dmg: 4, shot: 4, cost: 2.5, weight: 5, minFloor: 10, contact: true,
      desc: 'Telegraphs a long piercing thrust that fires bolts along its path.',
      init(e, g) { e.cd = 80; },
      update(e, g) {
        const i = A.info(g, e);
        if (e.state === 'wind') {
          e.windup -= g.ts;
          if (e.windup > 8) e.lAng = i.ang;
          e.face = e.lAng;
          if (e.windup <= 0) { e.state = 'thrust'; e.sT = 14; e.fT = 0; g.sfx('lunge'); }
          return;
        }
        if (e.state === 'thrust') {
          A.walk(g, e, e.lAng, 9 * e.spdMul);
          g.trailFx(e.x, e.y, '#d0d8e8', 0.7);
          if ((e.fT -= g.ts) <= 0) { e.fT = 5; g.eShot(e, e.lAng + Math.PI / 2, 2.2, { dmg: 0.7, r: 4, color: '#e8f0ff' }); g.eShot(e, e.lAng - Math.PI / 2, 2.2, { dmg: 0.7, r: 4, color: '#e8f0ff' }); }
          if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 120 / e.rate; }
          return;
        }
        e.face = i.ang;
        A.kite(g, e, i, 190, e.curSpeed, 0.9);
        if ((e.cd -= g.ts) <= 0) { e.state = 'wind'; e.windup = g.tele(36); e.lAng = i.ang; }
      },
    },

    mimic: {
      id: 'mimic', name: 'Mimic', shape: 'square', color: '#b0703a', r: 17, hp: 30, speed: 1.5, dmg: 4, cost: 4, weight: 0, minFloor: 99, contact: true, noElite: false,
      desc: 'A chest with teeth.',
      init(e, g) { e.cd = 60; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'leap') { A.walk(g, e, e.lAng, 5.5 * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 70 / e.rate; g.shake(3); } return; }
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = 'leap'; e.sT = 16; e.lAng = i.ang; } return; }
        A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 260 && A.clear(g, e.x, e.y, g.player.x, g.player.y, false)) { e.state = 'wind'; e.windup = g.tele(26); }
      },
      draw(c, e) { c.fillStyle = '#ffd24a'; c.fillRect(e.x - 4, e.y - 3, 8, 7); c.fillStyle = '#fff'; for (let k = -1; k <= 1; k += 2) { c.beginPath(); c.moveTo(e.x + k * 10, e.y + 2); c.lineTo(e.x + k * 6, e.y + 9); c.lineTo(e.x + k * 3, e.y + 2); c.fill(); } },
    },
    // ---- minions (not in the intro table; spawned by others)
    imp: {
      id: 'imp', name: 'Imp', shape: 'circle', color: '#8ae06a', r: 8, hp: 4, speed: 1.7, dmg: 2, cost: 0.4, weight: 0, minFloor: 99, contact: true, noElite: true,
      desc: 'A summoned minion.',
      update(e, g) { const i = A.info(g, e); A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.1 + e.seed) * 0.5); },
      draw(c, e) { eyes(c, e, 0.4); },
    },
    spider: {
      id: 'spider', name: 'Spiderling', shape: 'circle', color: '#8a5a8a', r: 8, hp: 5, speed: 2.1, dmg: 2, cost: 0.5, weight: 0, minFloor: 99, contact: true, noElite: true, flying: false,
      desc: 'A skittering brood.',
      update(e, g) { const i = A.info(g, e); A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.25 + e.seed) * 0.9); },
      draw(c, e) { c.strokeStyle = '#3a1a3a'; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { if (!k) continue; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + k * 5, e.y + 8); c.stroke(); c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + k * 5, e.y - 8); c.stroke(); } eyes(c, e, 0.4); },
    },
    bonesoldier: {
      id: 'bonesoldier', name: 'Bone Soldier', shape: 'square', color: '#e8e0c8', r: 11, hp: 8, speed: 1.15, dmg: 3, cost: 0.8, weight: 0, minFloor: 99, contact: true, noElite: true,
      desc: 'A raised skeleton.',
      update(e, g) { const i = A.info(g, e); A.chase(g, e, i, e.curSpeed, 0); e.face = i.ang; },
      draw(c, e) { eyes(c, e, 0.45); },
    },
  };

  function eyes(c, e, spread) {
    const a = e.face || 0, d = e.r * 0.35, s = Math.max(1.5, e.r * 0.2);
    for (const sg of [-1, 1]) {
      const ex = e.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * sg * e.r * spread;
      const ey = e.y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * sg * e.r * spread;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, s, 0, TAU); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.arc(ex + Math.cos(a) * s * 0.4, ey + Math.sin(a) * s * 0.4, s * 0.5, 0, TAU); c.fill();
    }
  }
  for (const id in ENEMIES) { const t = ENEMIES[id]; if (t.weight === undefined) t.weight = 1; }

  // ------------------------------------------------------------------ elite modifiers
  const MODS = {
    swift:    { id: 'swift', name: 'Swift', color: '#7fe0ff', glyph: '»', desc: '+40% speed', apply(e) { e.speed *= 1.4; } },
    brutal:   { id: 'brutal', name: 'Brutal', color: '#ff5a4a', glyph: '!', desc: '+50% damage', apply(e) { e.dmg *= 1.5; e.shotDmg *= 1.5; } },
    hardened: { id: 'hardened', name: 'Hardened', color: '#c0c8d8', glyph: '■', desc: '+80% HP, takes 15% less', apply(e) { e.maxHp *= 1.8; e.hp = e.maxHp; e.armor = 0.15; } },
    vampiric: { id: 'vampiric', name: 'Vampiric', color: '#c02a5a', glyph: '♥', desc: 'Heals when it hurts you',
                onHitPlayer(e, g, dmg) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.15); g.addText(e.x, e.y - 16, '+', '#c02a5a', 12); } },
    volatile: { id: 'volatile', name: 'Volatile', color: '#ff8a2a', glyph: '*', desc: 'Explodes on death',
                onDeath(e, g) { g.zoneCircle(e, e.x, e.y, 74, g.tele(34), 5, { color: '#ff8a2a', burst: true }); } },
    splitting:{ id: 'splitting', name: 'Splitting', color: '#7ae06a', glyph: '÷', desc: 'Splits into imps',
                onDeath(e, g) { for (let k = 0; k < 2; k++) g.spawnEnemy('imp', e.x + (k ? 12 : -12), e.y, { minion: true, quick: true, hpMul: 1 }); } },
    frenzied: { id: 'frenzied', name: 'Frenzied', color: '#ff4a9a', glyph: '‼', desc: 'Faster when wounded',
                update(e, g) { const f = e.hp < e.maxHp * 0.5; e.spdMul *= f ? 1.5 : 1; e.rate = (e.rate0 || 1) * (f ? 1.5 : 1); e.enraged = f; } },
    regen:    { id: 'regen', name: 'Regenerating', color: '#8ae06a', glyph: '+', desc: 'Heals over time',
                update(e, g) { if (e.hp < e.maxHp && e.t % 30 === 0) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02); } },
    warded:   { id: 'warded', name: 'Warded', color: '#9fc4ff', glyph: '○', desc: 'Magic barrier absorbs damage', apply(e) { e.ward = e.maxHp * 0.5; } },
    volley:   { id: 'volley', name: 'Volley', color: '#ffd24a', glyph: '≡', desc: 'Fires extra projectiles', apply(e) { e.volley = 2; } },
    thorned:  { id: 'thorned', name: 'Thorned', color: '#d06a9a', glyph: '^', desc: 'Reflects melee damage',
                onHurt(e, g, dmg, o) { if (o && o.melee) g.hurtPlayer(Math.max(1, Math.round(e.dmg * 0.5)), e.x, e.y, { src: e, noThorns: true, reflect: true }); } },
    ghostly:  { id: 'ghostly', name: 'Ghostly', color: '#b8c4ff', glyph: '~', desc: 'Phases in and out',
                update(e, g) { const c = e.t % 120; e.invuln = c > 80; e.vis = c > 80 ? 0.3 : 1; if (c > 80) e.noContact = true; else e.noContact = false; } },
    magnetic: { id: 'magnetic', name: 'Magnetic', color: '#4a7aff', glyph: 'U', desc: 'Drags you toward it',
                update(e, g) { const i = A.info(g, e); if (i.d < 230 && i.d > 30) { const p = g.player; ED.phys.move(g, p, -Math.cos(i.ang) * 0.9 * g.ts, -Math.sin(i.ang) * 0.9 * g.ts); } } },
    burning:  { id: 'burning', name: 'Burning', color: '#ff6a2a', glyph: '^', desc: 'Leaves flames behind',
                update(e, g) { if (e.t % 34 === 0 && !e.flying) g.hazardCircle(e, e.x, e.y, 22, 150, 2, { color: '#ff6a2a', tick: 24 }); } },
  };

  // ------------------------------------------------------------------ encounters
  /** Build an encounter spec for a room: list of waves (each a list of spawn entries). */
  function planRoom(g, room, rng, floor) {
    const opts = {};
    const t = room.type;
    if (t === 'ambush') { opts.waveBonus = 0; }
    return D.composeWaves(floor, rng, opts);
  }

  ED.enemyTypes = ENEMIES;
  ED.mods = MODS;
  ED.packs.track('enemies', ENEMIES); ED.packs.track('mods', MODS);
  ED.encounter = { planRoom };
  for (const id in ENEMIES) ENEMIES[id].id = id;
  for (const id in MODS) MODS[id].id = id;
})(typeof globalThis !== 'undefined' ? globalThis : this);

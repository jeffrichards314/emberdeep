/* EMBERDEEP — entities.js
 * Physics/collision, and the "world" mixin for Game: spawning, enemy loop, projectiles,
 * telegraph zones / hazards / shock rings, bombs + explosions, pickups, props, particles.
 * Everything runs in world time (g.ts) so Time Slow works uniformly.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, C = ED.C, T = ED.T;
  const TAU = U.TAU, TILE = C.TILE;
  ED.mixins = ED.mixins || [];

  // ------------------------------------------------------------------ physics
  function tileCode(g, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= C.COLS || ty >= C.ROWS) return 1;
    return g.col[ty * C.COLS + tx];
  }
  /** is a circle at (x,y) blocked?  col: 1 solid, 2 pit (blocks ground units) */
  function blocked(g, x, y, r, flying, dashing) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = tileCode(g, tx, ty);
      if (c === 1) return true;
      if (c === 2 && !flying && !dashing) return true;
    }
    return false;
  }
  const phys = ED.phys = {
    blocked, tileCode,
    move(g, e, dx, dy, opts) {
      const res = { bx: false, by: false };
      if (!dx && !dy) return res;
      if (e.big || e.ghost) {                                     // arena-bounds only
        e.x += dx; e.y += dy;
        const m = e.big ? Math.min(e.r * 0.45, 80) : 0, lo = TILE + 4 + m;
        e.x = U.clamp(e.x, lo, C.ROOM_W - lo);
        e.y = U.clamp(e.y, lo, C.ROOM_H - lo);
        return res;
      }
      const r = e.cr !== undefined ? e.cr : e.r * 0.82;
      const fly = !!e.flying, dash = !!e.dashing;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 5));
      const sx = dx / n, sy = dy / n;
      for (let i = 0; i < n; i++) {
        if (sx) { if (!blocked(g, e.x + sx, e.y, r, fly, dash)) e.x += sx; else res.bx = true; }
        if (sy) { if (!blocked(g, e.x, e.y + sy, r, fly, dash)) e.y += sy; else res.by = true; }
      }
      // solid props (pots) — push out
      if (g.props.length && !e.noProps) {
        for (const p of g.props) {
          if (p.dead || !p.solid) continue;
          const ddx = e.x - p.x, ddy = e.y - p.y, rr = r + p.r, d2 = ddx * ddx + ddy * ddy;
          if (d2 < rr * rr && d2 > 0.0001) {
            const d = Math.sqrt(d2), push = rr - d;
            const nx = e.x + ddx / d * push, ny = e.y + ddy / d * push;
            if (!blocked(g, nx, e.y, r, fly, dash)) e.x = nx;
            if (!blocked(g, e.x, ny, r, fly, dash)) e.y = ny;
            res.bx = res.by = true;
          }
        }
      }
      return res;
    },
    /** if an entity ended up in a blocked cell (arena change, dash over pit) find the nearest free spot */
    unstick(g, e) {
      const r = e.cr !== undefined ? e.cr : e.r * 0.82;
      if (!blocked(g, e.x, e.y, r, !!e.flying, false)) return false;
      for (let rad = 8; rad < 400; rad += 8) {
        for (let k = 0; k < 16; k++) {
          const a = k * TAU / 16, x = e.x + Math.cos(a) * rad, y = e.y + Math.sin(a) * rad;
          if (!blocked(g, x, y, r, !!e.flying, false)) { e.x = x; e.y = y; return true; }
        }
      }
      return false;
    },
    lineClear(g, x1, y1, x2, y2) {
      const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 12);
      for (let i = 1; i < n; i++) { const t = i / n; if (tileCode(g, Math.floor((x1 + (x2 - x1) * t) / TILE), Math.floor((y1 + (y2 - y1) * t) / TILE)) === 1) return false; }
      return true;
    },
  };

  // ------------------------------------------------------------------ zone geometry
  function zoneHits(z, px, py, pr) {
    switch (z.shape) {
      case 'circle': return U.dist2(z.x, z.y, px, py) <= (z.r + pr) * (z.r + pr);
      case 'ring': {
        const d = Math.hypot(px - z.x, py - z.y);
        if (Math.abs(d - z.r) > z.w / 2 + pr) return false;
        if (z.gaps && z.gaps.length) {
          const a = Math.atan2(py - z.y, px - z.x);
          for (const gp of z.gaps) if (Math.abs(U.angDiff(gp.a, a)) < gp.w / 2) return false;
        }
        return true;
      }
      case 'line': return U.segDist(px, py, z.x, z.y, z.x2, z.y2) <= z.w / 2 + pr;
      case 'cone': {
        const d = Math.hypot(px - z.x, py - z.y);
        if (d > z.r + pr) return false;
        if (d < 14) return true;
        const a = Math.atan2(py - z.y, px - z.x);
        return Math.abs(U.angDiff(z.ang, a)) <= z.arc / 2 + Math.atan2(pr, d);
      }
      case 'tiles': return z.set.has(Math.floor(py / TILE) * C.COLS + Math.floor(px / TILE));
      case 'rect': return px + pr > z.x && px - pr < z.x + z.w && py + pr > z.y && py - pr < z.y + z.h;
      case 'screen': {
        for (const s of z.safe || []) if (U.dist2(s.x, s.y, px, py) < s.r * s.r) return false;
        return true;
      }
    }
    return false;
  }
  ED.zoneHits = zoneHits;

  // ------------------------------------------------------------------ world mixin
  const W = {
    // ------------------------------------------------ fx / feedback
    shake(a) { const m = ED.save.meta.settings.shake; this.shakeAmp = Math.min(22, Math.max(this.shakeAmp, a * m)); },
    hitstop(n) { this.hitstopT = Math.max(this.hitstopT, n); },
    sfx(name, o) { ED.audio && ED.audio.play(name, o); },
    flashScreen(color, a) { if (ED.save.meta.settings.flash > 0) { this.flash = { color, a: a * ED.save.meta.settings.flash }; } },
    tele(frames) { return Math.max(8, Math.round(frames * this.dif.tele)); },
    burst(x, y, n, color, speed, life, o) {
      o = o || {};
      const cap = D.CAPS.fx;
      for (let i = 0; i < n; i++) {
        if (this.fx.length >= cap) this.fx.shift();
        const a = (o.dir !== undefined ? o.dir + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * TAU);
        const s = speed * (0.35 + Math.random() * 0.75);
        this.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.7), max: life, size: o.size || (1.6 + Math.random() * 2.6), color, drag: o.drag || 0.92, grav: o.grav || 0, shape: o.shape || 'sq' });
      }
    },
    trailFx(x, y, color, alpha) {
      if (this.fx.length >= D.CAPS.fx) return;
      this.fx.push({ x, y, vx: 0, vy: 0, life: 10, max: 10, size: 6, color, drag: 1, grav: 0, shape: 'ghost', alpha: alpha || 0.5 });
    },
    ringFx(x, y, r0, r1, color, life, w) {
      this.fx.push({ x, y, vx: 0, vy: 0, life, max: life, size: r0, r1, color, drag: 1, grav: 0, shape: 'ring', w: w || 3 });
    },
    addText(x, y, str, color, size) {
      if (!ED.save.meta.settings.damageNumbers) return;
      if (this.texts.length > 70) this.texts.shift();
      this.texts.push({ x: x + U.rnd(-6, 6), y, vy: -0.9, life: 46, max: 46, str: String(str), color: color || '#fff', size: size || 12 });
    },
    toast(msg, color, dur) { this.toasts.push({ msg, color: color || '#fff', t: 0, dur: dur || 150 }); if (this.toasts.length > 5) this.toasts.shift(); },

    // ------------------------------------------------ spawning enemies
    spawnEnemy(typeId, x, y, o) {
      o = o || {};
      const def = o.def || ED.enemyTypes[typeId];
      if (!def) throw new Error('unknown enemy ' + typeId);
      const d = this.dif, p = this.player;
      const hpMul = (o.hpMul || 1) * (1 + (p ? p.st.enemyHp : 0));
      const e = {
        kind: 'enemy', id: ED.id(), type: typeId, def, x, y, vx: 0, vy: 0, kx: 0, ky: 0,
        r: (o.r || def.r) * (o.scale || 1), t: 0, seed: this.rng.next() * 100, face: 0, vis: 1, flash: 0, stun: 0, hitCd: 0, spdMul: 1,
        maxHp: (o.hp || def.hp * d.enemyHp) * hpMul, hp: 0,
        speed: def.speed * d.enemySpeed * (o.speedMul || 1), curSpeed: 0,
        dmg: (def.dmg || 0) * d.enemyDmg, shotDmg: (def.shot || def.dmg || 1) * d.enemyDmg,
        rate0: d.fireRate, rate: d.fireRate, projMul: 1,
        status: {}, mods: [], elite: false, color: def.color, flying: !!def.flying, ghost: !!def.ghost,
        minion: !!o.minion, gen: o.gen || 0, holdId: o.holdId || null, armor: 0, shieldArc: def.shield || 0, vuln: 1, dead: false, carriesKey: o.carriesKey || null,
        guardBreak: 0, haunt: !!o.haunt, ward: 0,
      };
      e.hp = e.maxHp;
      if (o.scale) e.speed *= 1 / Math.sqrt(o.scale);
      if (def.init) def.init(e, this);
      if (o.elite) {
        e.elite = true; e.maxHp *= 1.25; e.hp = e.maxHp; e.dmg *= 1.1; e.shotDmg *= 1.1;
        for (const mid of o.mods || []) {
          const m = ED.mods[mid]; if (!m) continue;
          e.mods.push(m); if (m.apply) m.apply(e, this);
        }
        e.rate0 = e.rate = d.fireRate;
        e.maxHp = Math.max(1, e.maxHp); e.hp = Math.min(e.hp, e.maxHp) || e.maxHp;
        if (e.mods.some(m => m.id === 'hardened')) e.hp = e.maxHp;
      }
      if (o.haunt) { e.ghosty = true; e.mods.push(ED.mods.ghostly); }
      if (o.extra) Object.assign(e, o.extra);
      this.enemies.push(e);
      if (!e.big && !e.ghost && this.col && phys.blocked(this, e.x, e.y, e.r * 0.7, !!e.flying, false)) phys.unstick(this, e);     // never spawn embedded in a wall
      if (!e.big && !e.ghost && this.props.length) this.clearBraziers(e);
      if (!o.silent) { this.burst(x, y, e.elite ? 16 : 9, e.color, 2.4, 22); }
      ED.save.see('enemies', typeId);
      ED.runHooks('spawn', this, e);
      return e;
    },
    /** a foe must not spawn inside a brazier: player shots stop at the prop (it never breaks), so a foe that never moves — an idol — could not be hit by anything that shoots */
    clearBraziers(e) {
      const r = e.r * 0.82;
      for (const pr of this.props) {
        if (pr.dead || pr.type !== 'brazier') continue;
        const rr = r + pr.r + 4; if (U.dist2(e.x, e.y, pr.x, pr.y) >= rr * rr) continue;
        const base = this.player ? Math.atan2(this.player.y - pr.y, this.player.x - pr.x) : 0;
        for (let k = 0; k < 16; k++) {                                                   // toward the player first, then alternately around the prop
          const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (TAU / 16), nx = pr.x + Math.cos(a) * (rr + 2), ny = pr.y + Math.sin(a) * (rr + 2);
          if (blocked(this, nx, ny, e.r * 0.7, !!e.flying, false) || this.props.some(o => o !== pr && !o.dead && o.solid && U.dist2(nx, ny, o.x, o.y) < (r + o.r) * (r + o.r))) continue;
          e.x = nx; e.y = ny; break;
        }
      }
    },
    /** spawn with a telegraphed indicator first */
    queueSpawn(typeId, x, y, o) {
      o = o || {};
      this.spawns.push({ type: typeId, x, y, t: 0, dur: o.quick ? 26 : this.tele(54), o, elite: !!o.elite });
    },
    updateSpawns() {
      const ts = this.ts;
      for (const s of this.spawns) {
        s.t += ts;
        if (s.t >= s.dur) {
          s.done = true;
          if (!blocked(this, s.x, s.y, 8, true, false) || s.o.flyer) this.spawnEnemy(s.type, s.x, s.y, s.o);
          else { const sp = this.findSpot(s.x, s.y, 0, 60, 14); this.spawnEnemy(s.type, sp.x, sp.y, s.o); }
        }
      }
      if (this.spawns.length) U.compact(this.spawns, s => !s.done);
    },
    /** find an open spot near (x,y) between minD and maxD */
    findSpot(x, y, minD, maxD, r) {
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * TAU, d = U.rnd(minD, maxD);
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (px < 64 || py < 64 || px > C.ROOM_W - 64 || py > C.ROOM_H - 64) continue;
        if (!blocked(this, px, py, r || 12, false, false)) return { x: px, y: py };
      }
      const tiles = this.room.rt.spawnTiles;
      const t = tiles.length ? tiles[Math.floor(Math.random() * tiles.length)] : { x: 480, y: 288 };
      return { x: t.x, y: t.y };
    },
    nearestEnemy(x, y, maxD, filter) {
      let best = null, bd = (maxD || 1e9) * (maxD || 1e9);
      for (const e of this.enemies) {
        if (e.dead || e.invuln && !filter) continue;
        if (filter && !filter(e)) continue;
        const d = U.dist2(x, y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },
    aliveEnemies() { let n = 0; for (const e of this.enemies) if (!e.dead && !e.minionNoCount) n++; return n; },

    // ------------------------------------------------ enemy projectiles
    eShot(src, ang, speed, o) {
      o = o || {};
      if (this.eproj.length >= D.CAPS.eproj) return null;
      const spd = Math.min(7.5, speed * (src.projMul || 1) * this.dif.projSpeed);
      const pr = {
        x: o.x !== undefined ? o.x : src.x, y: o.y !== undefined ? o.y : src.y,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: o.r || 5,
        dmg: (o.dmg !== undefined ? o.dmg : 1) * (src.shotDmg || 2), life: o.life || 260, color: o.color || '#ffd24a',
        kind: o.kind || 'bullet', homing: o.homing || 0, accel: o.accel || 0, wave: o.wave || 0, waveT: Math.random() * 6,
        bounce: o.bounce || 0, ghost: !!o.ghost, src, t: 0, spd, ang, friendly: false, dead: false, trail: !!o.trail,
        onDie: o.onDie, slow: o.slow || 0,
      };
      this.eproj.push(pr);
      return pr;
    },
    ringShot(src, n, speed, off, o) { for (let k = 0; k < n; k++) this.eShot(src, off + k * TAU / n, speed, o); },
    updateEProj() {
      const ts = this.ts, p = this.player;
      for (const b of this.eproj) {
        if (b.dead) continue;
        b.t += ts; b.life -= ts;
        if (b.accel) { b.spd = Math.min(7, b.spd + b.accel * ts); b.vx = Math.cos(b.ang) * b.spd; b.vy = Math.sin(b.ang) * b.spd; }
        if (b.homing && !b.friendly) {
          const want = Math.atan2(p.y - b.y, p.x - b.x), a = U.approachAngle(Math.atan2(b.vy, b.vx), want, b.homing * ts);
          const s = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; b.ang = a;
        }
        let vx = b.vx, vy = b.vy;
        if (b.wave) { const a = Math.atan2(b.vy, b.vx) + Math.PI / 2; const w = Math.sin((b.t + b.waveT) * 0.18) * b.wave; vx += Math.cos(a) * w; vy += Math.sin(a) * w; }
        b.x += vx * ts; b.y += vy * ts;
        if (b.life <= 0) { b.dead = true; if (b.onDie) b.onDie(this, b); continue; }
        if (!b.ghost) {
          const c = tileCode(this, Math.floor(b.x / TILE), Math.floor(b.y / TILE));
          if (c === 1) {
            if (b.bounce > 0) {
              b.bounce--;
              const hx = tileCode(this, Math.floor((b.x - b.vx * ts) / TILE), Math.floor(b.y / TILE)) !== 1;
              if (hx) b.vy = -b.vy; else b.vx = -b.vx;
              b.ang = Math.atan2(b.vy, b.vx); b.x += b.vx * ts; b.y += b.vy * ts;
            } else { b.dead = true; this.burst(b.x, b.y, 3, b.color, 1.5, 10); if (b.onDie) b.onDie(this, b); continue; }
          }
        }
        if (b.friendly) {                                           // reflected bullet
          for (const e of this.enemies) {
            if (e.dead || e.invuln) continue;
            if (U.circleHit(b.x, b.y, b.r, e.x, e.y, e.r)) { this.damageEnemy(e, b.dmg * 1.5 + 4, { src: 'reflect', x: b.x, y: b.y, kb: 2, noProc: true }); b.dead = true; break; }
          }
          continue;
        }
        if (U.circleHit(b.x, b.y, b.r, p.x, p.y, p.hr)) {
          if (this.hurtPlayer(b.dmg, b.x - vx * 3, b.y - vy * 3, { src: b.src, proj: true })) {
            b.dead = true; this.burst(b.x, b.y, 4, b.color, 2, 12);
            if (b.slow) p.slowT = Math.max(p.slowT || 0, b.slow);
            if (b.onDie) b.onDie(this, b);
          }
        }
      }
      U.compact(this.eproj, b => !b.dead);
    },

    // ------------------------------------------------ zones (telegraphs, hazards, shock rings)
    _zone(z) {
      if (this.zones.length >= D.CAPS.zones) this.zones.shift();
      Object.assign(z, { t: 0, dead: false, hurts: z.hurts !== false, hit: false, id: ED.id() });
      if (!z.color) z.color = '#ff4a4a';
      this.zones.push(z);
      return z;
    },
    zoneCircle(src, x, y, r, dur, dmg, o) { return this._zone(Object.assign({ kind: 'tele', shape: 'circle', x, y, r, dur, dmg, src }, o)); },
    zoneRing(src, x, y, r, w, dur, dmg, o) { return this._zone(Object.assign({ kind: 'tele', shape: 'ring', x, y, r, w, dur, dmg, src }, o)); },
    zoneLine(src, x1, y1, x2, y2, w, dur, dmg, o) { return this._zone(Object.assign({ kind: 'tele', shape: 'line', x: x1, y: y1, x2, y2, w, dur, dmg, src }, o)); },
    zoneCone(src, x, y, ang, arc, r, dur, dmg, o) { return this._zone(Object.assign({ kind: 'tele', shape: 'cone', x, y, ang, arc, r, dur, dmg, src }, o)); },
    zoneRect(src, x, y, w, h, dur, dmg, o) { return this._zone(Object.assign({ kind: 'tele', shape: 'rect', x, y, w, h, dur, dmg, src }, o)); },
    zoneScreen(src, safe, dur, dmg, o) { return this._zone(Object.assign({ kind: 'tele', shape: 'screen', x: 480, y: 288, safe, dur, dmg, src }, o)); },
    /** lingering damage area (fire, poison cloud); optionally preceded by a telegraph */
    hazardCircle(src, x, y, r, life, dmg, o) {
      o = o || {};
      return this._zone(Object.assign({ kind: o.warn ? 'tele' : 'hazard', shape: 'circle', x, y, r, dur: o.warn || 0, life, dmg, tick: o.tick || 30, tickT: 0, src, linger: o.warn ? life : 0 }, o));
    },
    /** expanding ring (gaps = safe angular windows [{a, w}]) */
    shockRing(src, x, y, speed, width, maxR, dmg, o) {
      o = o || {};
      return this._zone(Object.assign({ kind: 'ring', shape: 'ring', x, y, r: o.r0 || 8, w: width, speed, maxR, dmg, src, gaps: o.gaps || [] }, o));
    },
    /** bomb that lands after a fuse: circle telegraph then explosion */
    bombZone(src, x, y, r, dur, dmg, o) {
      o = o || {};
      return this.zoneCircle(src, x, y, r, dur, dmg, {
        color: o.color || '#ff8a2a', bomb: true, burst: true,
        onEnd: (g, z) => { g.explodeFx(z.x, z.y, z.r, o.color || '#ff8a2a'); if (o.shrapnel) g.ringShot(src, o.shrapnel, 2.2, Math.random() * TAU, { dmg: 0.5, r: 4, color: '#ffb04a' }); },
      });
    },
    /** player-owned damaging zones: hurts enemies instead of the player */
    zoneEnemies(x, y, r, dmg, o) {
      o = o || {};
      return this._zone(Object.assign({ kind: 'ring', shape: 'ring', x, y, r: 6, w: 22, speed: o.speed || 6, maxR: r, dmg, src: this.player, hurts: false, hurtsEnemies: true, color: o.color || '#ff7a3a', gaps: [] }, o));
    },
    updateZones() {
      const ts = this.ts, p = this.player;
      for (const z of this.zones) {
        if (z.dead) continue;
        z.t += ts;
        if (z.upd) z.upd(this, z);
        if (z.kind === 'tele') {
          if (z.follow && z.src && !z.src.dead) { z.x = z.src.x + (z.fx || 0); z.y = z.src.y + (z.fy || 0); }
          if (z.t >= z.dur) {
            this.zoneFire(z);
            if (z.linger) { z.kind = 'hazard'; z.t = 0; z.life = z.linger; z.tickT = 0; z.hit = false; }
            else z.dead = true;
          }
        } else if (z.kind === 'hazard') {
          z.tickT -= ts;
          if (z.tickT <= 0) {
            z.tickT = z.tick || 30;
            if (z.hurts && zoneHits(z, p.x, p.y, p.hr)) { this.hurtPlayer(z.dmg, z.x, z.y, { src: z.src, zone: true, fire: z.color === '#ff6a2a', noKnock: true }); if (z.slow) p.slowT = 60; }
            if (z.hurtsEnemies && this.zoneHurtEnemies) this.zoneHurtEnemies(z);
          }
          if (z.t >= z.life) z.dead = true;
        } else if (z.kind === 'ring') {
          z.r += z.speed * ts;
          if (z.hurts && !z.hit && zoneHits(z, p.x, p.y, p.hr)) { if (this.hurtPlayer(z.dmg, z.x, z.y, { src: z.src, zone: true })) z.hit = true; }
          if (z.hurtsEnemies) {
            z.hitSet = z.hitSet || new Set();
            for (const e of this.enemies) {
              if (e.dead || z.hitSet.has(e.id)) continue;
              const d = Math.hypot(e.x - z.x, e.y - z.y);
              if (Math.abs(d - z.r) <= z.w / 2 + e.r) {
                z.hitSet.add(e.id);
                this.damageEnemy(e, z.dmg, { src: 'zone', x: z.x, y: z.y, kb: 4, noProc: !z.ignite, pierceShield: true });
                if (z.ignite) this.applyStatus(e, 'burn', { t: 180, dps: z.dmg * 0.12 });
              }
            }
          }
          if (z.r >= z.maxR) z.dead = true;
        } else if (z.kind === 'pull') {              // gravity well (player)
          const life = z.life;
          for (const e of this.enemies) {
            if (e.dead || e.boss) continue;
            const d = Math.hypot(z.x - e.x, z.y - e.y);
            if (d < z.r && d > 6) { const f = 2.4 * ts; phys.move(this, e, (z.x - e.x) / d * f, (z.y - e.y) / d * f); }
          }
          if (Math.floor(z.t) % 20 === 0) for (const e of this.enemies) if (!e.dead && U.dist2(z.x, z.y, e.x, e.y) < z.r * z.r * 0.5) this.damageEnemy(e, z.dmg, { src: 'zone', x: z.x, y: z.y, kb: 0, noProc: true, noFlashText: true });
          if (z.t >= life) z.dead = true;
        }
      }
      if (this.zones.length) U.compact(this.zones, z => !z.dead);
    },
    zoneFire(z) {
      const p = this.player;
      if (z.screenFlash) this.flashScreen('#fff', 0.5);
      if (z.hurts && z.dmg > 0 && !z.noInstant && zoneHits(z, p.x, p.y, p.hr)) this.hurtPlayer(z.dmg, z.x, z.y, { src: z.src, zone: true, big: z.big });
      if (z.burst) { this.burst(z.x, z.y, 14, z.color, 4, 24); this.shake(3); this.sfx('boom', { vol: 0.5 }); }
      if (z.onEnd) z.onEnd(this, z);
    },
    explodeFx(x, y, r, color) {
      this.burst(x, y, 22, color || '#ff8a2a', 5, 30, { size: 3.5 });
      this.burst(x, y, 10, '#fff', 3, 14);
      this.ringFx(x, y, 8, r, color || '#ff8a2a', 16, 4);
      this.shake(Math.min(10, 3 + r / 25)); this.sfx('boom', { vol: 0.7 });
    },

    // ------------------------------------------------ bombs & explosions
    placeBomb(x, y, o) {
      o = o || {};
      const b = { x, y, t: 0, fuse: o.fuse || 70, r: o.r || 78, dmg: o.dmg || 18, owner: o.owner || 'player', color: o.color || '#ff9a3c', dead: false };
      this.bombs.push(b);
      this.sfx('fuse');
      ED.runHooks('bomb', this, b);                 // packs may count the fuses a run lights (v17: a deed)
    },
    updateBombs() {
      for (const b of this.bombs) {
        b.t += this.ts;
        if (b.t >= b.fuse) { b.dead = true; this.explode(b.x, b.y, b.r, b.dmg, { owner: b.owner, bomb: true }); }
      }
      if (this.bombs.length) U.compact(this.bombs, b => !b.dead);
    },
    /** area damage; o.owner 'player' (hurts enemies) | 'enemy' (hurts player).  Also breaks pots/cracked walls. */
    explode(x, y, r, dmg, o) {
      o = o || {}; const p = this.player;
      this.explodeFx(x, y, r, o.fire ? '#ff6a2a' : '#ffa040');
      if (o.owner !== 'enemy') {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (U.circleHit(x, y, r, e.x, e.y, e.r * (e.big ? 0.6 : 1))) {
            this.damageEnemy(e, dmg, { src: 'explosion', x, y, kb: 5, noProc: true, stun: o.bomb ? 20 : 0, pierceShield: true });
            if (o.fire) this.applyStatus(e, 'burn', { t: 150, dps: Math.max(1, dmg * 0.1) });
          }
        }
      }
      if (o.owner === 'enemy' || (p.st.selfBlast && o.owner === 'player') || o.hurtPlayer) {
        if (U.circleHit(x, y, r * 0.9, p.x, p.y, p.hr)) this.hurtPlayer(o.owner === 'enemy' ? dmg : Math.max(1, Math.round(dmg * 0.4)), x, y, { zone: true });
      }
      for (const pr of this.props) if (!pr.dead && U.circleHit(x, y, r, pr.x, pr.y, pr.r)) this.breakProp(pr);
      for (const b of this.bombs) if (!b.dead && b.t < b.fuse - 6 && U.circleHit(x, y, r, b.x, b.y, 8)) b.t = b.fuse - 6;
      this.crackWallsNear(x, y, r + 20);
      if (this.room && this.room.rt && this.room.rt.onExplode) this.room.rt.onExplode(this, x, y, r);
    },

    // ------------------------------------------------ props (pots) and pickups
    makeProp(type, x, y) { const pr = { kind: 'prop', type, x, y, r: 11, hp: 1, solid: true, dead: false, flash: 0, seed: Math.random() }; this.props.push(pr); return pr; },
    breakProp(pr) {
      if (pr.dead) return;
      if (pr.type === 'brazier') { if (!pr.lit) { pr.lit = true; this.burst(pr.x, pr.y, 16, '#ff9a3c', 3.5, 24); this.sfx('zap'); this.addText(pr.x, pr.y - 22, 'lit!', '#ff9a3c', 12); } return; }
      pr.dead = true; this.burst(pr.x, pr.y, 8, pr.type === 'crate' ? '#a07a4a' : '#b0703a', 2.6, 20); this.sfx('pot');
      const rng = this.rng, luck = this.player.st.luck;
      const r = rng.next();
      if (r < 0.34) this.dropPickup('gold', pr.x, pr.y, 1 + rng.int(0, 2));
      else if (r < 0.34 + 0.07 + luck * 0.01) this.dropPickup('heart', pr.x, pr.y, 2);
      else if (r < 0.46 + luck * 0.015) this.dropPickup('bomb', pr.x, pr.y, 1);
      if (pr.holds) this.dropPickup(pr.holds.type, pr.x, pr.y, pr.holds.val);
    },
    dropPickup(type, x, y, val, o) {
      o = o || {};
      if (this.col && ED.phys.blocked(this, x, y, 7, true, false)) { const sp = this.freeSpot(x, y, 10); x = sp.x; y = sp.y; }
      const a = Math.random() * TAU, s = o.still ? 0 : U.rnd(1.2, 3.2);
      const pk = { kind: 'pickup', type, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, val: val || 1, t: 0, r: 9, dead: false, mag: false, bob: Math.random() * 6, keyType: o.keyType };
      this.pickups.push(pk);
      return pk;
    },
    dropGold(x, y, amount) {
      amount = Math.max(1, Math.round(amount));
      // split into coins (1, 5, 20) so big drops look big but stay cheap
      let n = 0;
      while (amount > 0 && n < 14) {
        const v = amount >= 60 && n < 3 ? 20 : amount >= 12 ? 5 : 1;
        this.dropPickup('gold', x, y, Math.min(v, amount)); amount -= v; n++;
      }
      if (amount > 0) this.dropPickup('gold', x, y, amount);
    },
    updatePickups() {
      const p = this.player, ts = this.ts;
      const magR = 72 * p.st.magnet;
      for (const k of this.pickups) {
        if (k.dead) continue;
        k.t += ts; k.bob += 0.1 * ts;
        k.x += k.vx * ts; k.y += k.vy * ts; k.vx *= 0.92; k.vy *= 0.92;
        if (blocked(this, k.x, k.y, 5, true, false)) { k.x -= k.vx * ts * 2; k.y -= k.vy * ts * 2; k.vx *= -0.5; k.vy *= -0.5; }
        const d = Math.hypot(p.x - k.x, p.y - k.y);
        const magnetic = (k.type === 'gold' && d < magR) || k.type === 'orb' || (k.type.startsWith('key') && d < 140) || (k.type === 'heart' && d < 40 && p.hp < p.maxHp);
        if (magnetic && k.t > 18) { k.mag = true; }
        if (k.mag) { const sp = Math.min(6.5, 2 + (k.t - 18) * 0.08) * ts; k.x += (p.x - k.x) / (d || 1) * sp; k.y += (p.y - k.y) / (d || 1) * sp; }
        if (d < p.r + k.r + 3 && k.t > 10) this.collectPickup(k);
      }
      if (this.pickups.length) U.compact(this.pickups, k => !k.dead);
    },
    collectPickup(k) {
      const p = this.player;
      switch (k.type) {
        case 'gold': this.giveGold(k.val); this.sfx('coin'); break;
        case 'heart': if (p.hp >= p.maxHp) return; this.healPlayer(k.val || 4); this.sfx('heal'); break;
        case 'bomb': p.bombs += k.val; this.addText(p.x, p.y - 18, '+' + k.val + ' bomb', '#ff9a3c', 12); this.sfx('pickup'); break;
        case 'key': this.giveKey(k.keyType, false); break;
        case 'container': p.st.maxHp; p.bonusHp = (p.bonusHp || 0) + 4; ED.items.recalc(p); this.healPlayer(4); this.toast('Heart container! +1 max HP', '#ff7a8a'); this.sfx('levelup'); break;
        default: { const f = ED.pickupImpl[k.type]; if (f && f.collect(this, k) === false) return; }
      }
      k.dead = true;
    },

    // ------------------------------------------------ fx update
    updateFx() {
      for (const f of this.fx) {
        f.life -= 1; f.x += f.vx; f.y += f.vy; f.vx *= f.drag; f.vy *= f.drag; f.vy += f.grav;
      }
      U.compact(this.fx, f => f.life > 0);
      for (const t of this.texts) { t.life--; t.y += t.vy; t.vy *= 0.96; }
      U.compact(this.texts, t => t.life > 0);
      for (const t of this.toasts) t.t++;
      U.compact(this.toasts, t => t.t < t.dur);
    },

    // ------------------------------------------------ enemy loop
    updateEnemies() {
      const ts = this.ts, p = this.player;
      for (const e of this.enemies) {
        if (e.dead) continue;
        e.t += ts;
        if (e.flash > 0) e.flash -= 1;
        if (e.hitCd > 0) e.hitCd -= ts;
        // status effects
        let slow = 1;
        const st = e.status;
        if (st.burn) { st.burn.t -= ts; if (st.burn.tick === undefined) st.burn.tick = 0; st.burn.tick -= ts;
          if (st.burn.tick <= 0) { st.burn.tick = 22; this.damageEnemy(e, st.burn.dps, { src: 'burn', noProc: true, color: '#ff8a2a', noKb: true });
            if (p.syn.wildfire && !e.dead) for (const o of this.enemies) if (o !== e && !o.dead && !o.status.burn && U.dist2(e.x, e.y, o.x, o.y) < 70 * 70 && this.rng.chance(0.3)) this.applyStatus(o, 'burn', { t: 120, dps: st.burn.dps }); }
          if (st.burn && st.burn.t <= 0) delete st.burn; if (e.t % 6 < ts) this.burst(e.x, e.y - e.r * 0.4, 1, '#ff8a2a', 0.8, 14, { dir: -Math.PI / 2, spread: 0.8, size: 2 }); }
        if (st.poison) { st.poison.t -= ts; st.poison.tick -= ts; if (st.poison.tick <= 0) { st.poison.tick = 30; this.damageEnemy(e, st.poison.dps, { src: 'poison', noProc: true, color: '#8ae06a', noKb: true }); } if (st.poison.t <= 0) delete st.poison; }
        if (st.slow) { st.slow.t -= ts; slow = st.slow.f; if (st.slow.t <= 0) delete st.slow; }
        if (e.dead) continue;
        if (e.stun > 0) { e.stun -= ts; }
        if (e.hexT > 0) e.hexT -= ts;
        e.spdMul = slow; e.rate = e.rate0; e.noContact = false;
        for (const m of e.mods) if (m.update) m.update(e, this);
        e.curSpeed = e.speed * e.spdMul;
        if (e.later) { e.later.t -= ts; if (e.later.t <= 0) { const fn = e.later.fn; e.later = null; fn(); } }
        if (e.stun <= 0 && !e.hold) e.def.update && e.def.update(e, this);
        else if (e.stun > 0) e.state = e.state === 'dash' || e.state === 'lunge' ? null : e.state;
        // safety: an enemy wedged inside terrain (arena rewrites, odd spawns) is freed so a locked room can always be cleared
        if (!e.big && !e.ghost && (this.frame + e.id) % 45 === 0 && phys.blocked(this, e.x, e.y, e.r * 0.7, !!e.flying, false)) phys.unstick(this, e);
        // knockback
        if (Math.abs(e.kx) > 0.05 || Math.abs(e.ky) > 0.05) {
          phys.move(this, e, e.kx * ts, e.ky * ts); e.kx *= 0.84; e.ky *= 0.84;
        }
        // contact damage
        if (e.def.contact !== false && !e.noContact && e.stun <= 0 && e.hitCd <= 0 && e.dmg > 0 && !e.ghosting) {
          if (U.circleHit(e.x, e.y, e.r * 0.92, p.x, p.y, p.hr)) {
            let dmgNow;
            if (e.boss) dmgNow = e.state === 'dash' ? e.shotDmg * (e.contactMul || 1.4) : e.dmg * 0.5;       // ramming ~ one telegraphed attack; a brush is minor
            else dmgNow = e.dmg * ((e.state === 'dash' || e.state === 'bash' || e.state === 'thrust') ? 1.4 : 1) * (e.contactMul || 1);
            if (this.hurtPlayer(dmgNow, e.x, e.y, { src: e, contact: true })) {
              e.hitCd = 36;
              for (const m of e.mods) if (m.onHitPlayer) m.onHitPlayer(e, this, e.dmg);
            }
          }
        }
        if (!isFinite(e.x) || !isFinite(e.y)) { e.x = 480; e.y = 288; }
      }
      // separate overlapping enemies slightly (cheap pairwise nudge)
      const n = this.enemies.length;
      if (n > 1 && n < 40) for (let i = 0; i < n; i++) {
        const a = this.enemies[i]; if (a.dead || a.big || a.boss) continue;
        for (let j = i + 1; j < n; j++) {
          const b = this.enemies[j]; if (b.dead || b.big || b.boss) continue;
          const dx = b.x - a.x, dy = b.y - a.y, rr = (a.r + b.r) * 0.8, d2 = dx * dx + dy * dy;
          if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), f = (rr - d) * 0.25 / d; phys.move(this, a, -dx * f, -dy * f); phys.move(this, b, dx * f, dy * f); }
        }
      }
      if (this.enemies.length > 0) U.compact(this.enemies, e => !e.dead);
    },
    applyStatus(e, kind, o) {
      if (e.dead || e.boss && kind === 'stun') return;
      if (kind === 'stun' && e.invuln) return;           // an untouchable foe (a vanished Blinkling, a submerged lurker) cannot be stunlocked in that state — a hammer could freeze it there forever
      const st = e.status;
      if (kind === 'burn') { st.burn = Object.assign(st.burn || { tick: 0 }, { t: Math.max(st.burn ? st.burn.t : 0, o.t), dps: Math.max(st.burn ? st.burn.dps : 0, o.dps) }); }
      else if (kind === 'slow') st.slow = { t: o.t, f: o.f || 0.5 };
      else if (kind === 'poison') st.poison = { t: o.t, dps: Math.max(st.poison ? st.poison.dps : 0, o.dps), tick: 10 };
      else if (kind === 'stun') e.stun = Math.max(e.stun, o.t);
      else if (kind === 'hex') e.hexT = Math.max(e.hexT || 0, o.t);
    },
  };
  ED.mixins.push(W);
})(typeof globalThis !== 'undefined' ? globalThis : this);

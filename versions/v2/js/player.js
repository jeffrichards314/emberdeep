/* EMBERDEEP — player.js
 * Player creation + per-frame update: movement, dash (i-frames), 7 weapon behaviours,
 * 8 actives, orbit blades / wisps, equipment swapping and relic events.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, C = ED.C;
  const TAU = U.TAU;
  const I = () => ED.input;

  function critRoll(g, p) { const c = g.rng.chance(p.st.crit + (p.tempCrit || 0)); return c; }

  const P = {
    // ------------------------------------------------ creation
    makePlayer(classId) {
      const cls = ED.items.CLASSES[classId] || ED.items.CLASSES.knight;
      const p = {
        classId: cls.id, x: 480, y: 288, r: 10, hr: 7, cr: 8, vx: 0, vy: 0, kx: 0, ky: 0, face: 0, aim: 0,
        hp: undefined, maxHp: undefined, inv: 0, flash: 0, hurtT: 0, dead: false,
        dashT: 0, dashCd: 0, dashAng: 0, dashIframes: 0, dashing: false, dashHit: null,
        atkCd: 0, swingN: 0, combo: 0, comboT: 0, side: 1, hammerT: 0, hammerAng: 0, bashT: 0, bashAng: 0, echoQ: null,
        weapon: null, armor: { helmet: null, chest: null, boots: null }, active: null,
        relics: {}, buffs: [], curses: [], keys: { small: 0, mb: 0, boss: 0 }, gold: 0, bombs: 2, bonusHp: 0,
        st: null, syn: {}, buffT: {}, slowT: 0, regenT: 0, lastLeech: -99, phoenixUsed: false,
        orbA: 0, orbPos: [], wispA: 0, wisps: [], wispT: 0, tempWisp: 0, wcd: 20, wdmg: 5, wrange: 48, wkb: 3,
        trail: 0, bounceT: 0, anim: 0, step: 0,
      };
      const w = ED.items.rollWeapon(g_rngStub(), 1, { type: cls.weapon, rarity: 'common' });
      w.name = ED.items.WEAPONS[cls.weapon].starterName || { sword: "Soldier's Sword", spear: "Traveler's Spear", hammer: 'Iron Maul', daggers: 'Twin Daggers', bow: 'Hunting Bow', boomerang: 'Wooden Boomerang', staff: 'Oak Staff' }[cls.weapon];
      w.dmg = ED.items.WEAPONS[cls.weapon].dmg; w.cd = ED.items.WEAPONS[cls.weapon].cd; w.range = ED.items.WEAPONS[cls.weapon].range; w.lvl = 1; w.affixes = [];
      p.weapon = w;
      if (cls.passive) p.relics[cls.passive] = 1;        // class passives are hidden relics (so every hook + stat path just works)
      p.active = this.newActiveState({ cat: 'active', id: cls.active, rarity: 'common', lvl: 1, uid: ED.id(), name: ED.items.ACTIVES[cls.active].name, upg: 0 });
      ED.items.recalc(p);
      p.hp = p.maxHp;
      return p;
    },
    newActiveState(item) {
      const s = ED.items.activeStats(item);
      return { item, charges: s.charges, max: s.charges, timers: [], roomProg: 0 };
    },
    recalcPlayer() { const p = this.player; ED.items.recalc(p); },

    // ------------------------------------------------ helpers
    aimAngle() {
      const p = this.player, m = I().mouse, av = I().aimVec;
      if (av) return Math.atan2(av.y, av.x);
      if (m.aim) return Math.atan2(m.y - C.HUD - p.y, m.x - p.x);
      let a = p.face, best = null, bd = 1e9;
      for (const e of this.enemies) {
        if (e.dead || e.invuln) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d > 300) continue;
        const ang = Math.atan2(e.y - p.y, e.x - p.x), df = Math.abs(U.angDiff(p.face, ang));
        if (df < 0.6 && d + df * 120 < bd) { bd = d + df * 120; best = ang; }
      }
      if (best !== null) a = best;
      return a;
    },
    hurtboxes(e) {
      return e.hurtboxes ? e.hurtboxes(this) : [{ x: e.x, y: e.y, r: e.r, e }];
    },
    relicEvent(name, a, b) {
      const p = this.player;
      for (const id in p.relics) { const r = ED.items.relic(id); if (r && r.on && r.on[name]) r.on[name](this, p, p.relics[id], a, b); }
    },

    // ------------------------------------------------ equipment
    equipItem(it, silent) {
      const p = this.player;
      if (it.cat === 'relic') {
        const before = Object.assign({}, p.syn);
        p.relics[it.id] = (p.relics[it.id] || 0) + 1;
        this.run.relicOrder.push(it.id);
        ED.save.see('items', it.id);
        ED.items.recalc(p);
        const r = ED.items.relic(it.id);
        if (r.on && r.on.pickup) r.on.pickup(this, p, p.relics[it.id]);
        if (!silent) this.toast('Relic: ' + r.name + (p.relics[it.id] > 1 ? ' x' + p.relics[it.id] : ''), ED.items.itemColor(it));
        for (const s of ED.items.SYNERGIES) if (p.syn[s.id] && !before[s.id]) { this.toast('SYNERGY: ' + s.name + ' — ' + s.desc, '#ffd24a', 260); this.sfx('levelup'); }
        this.sfx('pickup'); this.burst(p.x, p.y, 16, ED.items.itemColor(it), 4, 28);
        return null;
      }
      let old = null;
      if (it.cat === 'weapon') { old = p.weapon; p.weapon = it; p.atkCd = 10; }
      else if (it.cat === 'armor') { old = p.armor[it.slot]; p.armor[it.slot] = it; }
      else if (it.cat === 'active') { old = p.active ? p.active.item : null; p.active = this.newActiveState(it); }
      this.run.itemsTaken++;
      ED.items.recalc(p);
      if (!silent) this.toast('Equipped: ' + ED.items.itemName(it), ED.items.itemColor(it));
      this.sfx('pickup'); this.burst(p.x, p.y, 12, ED.items.itemColor(it), 3, 22);
      return old;
    },
    buffPlayer(b) { const p = this.player; p.buffs.push(b); ED.items.recalc(p); },
    cursePlayer(c) { const p = this.player; p.curses.push(c); ED.items.recalc(p); },

    // ------------------------------------------------ main update
    updatePlayer() {
      const p = this.player, st = p.st, inp = I(), ts = 1;       // the player runs in real time
      if (p.dead) return;
      p.anim++;
      if (p.inv > 0) p.inv--;
      if (p.flash > 0) p.flash--;
      if (p.hurtT > 0) p.hurtT--;
      if (p.slowT > 0) p.slowT--;
      if (p.dashCd > 0) p.dashCd--;
      if (p.dashIframes > 0) p.dashIframes--;
      if (p.atkCd > 0) p.atkCd--;
      if (p.comboT > 0) { p.comboT--; if (p.comboT <= 0) p.combo = 0; }
      for (const k in p.buffT) if (p.buffT[k] > 0) p.buffT[k]--;
      // regen
      if (st.regen > 0) { p.regenT++; if (p.regenT >= 3600 / st.regen) { p.regenT = 0; if (p.hp < p.maxHp) this.healPlayer(1, true); } }
      // active recharge (real time)
      this.updateActiveTimers();

      const ax = inp.axis();
      let spd = 2.85 * st.speed;
      if (p.slowT > 0) spd *= 0.6;
      if (p.buffT.haste > 0) spd *= 1.3;
      if (p.tempSpd) spd *= 1 + p.tempSpd;
      if (p.hammerT > 0) spd *= 0.35;
      if (this.room && this.room.rt && this.room.rt.iceFloor) spd *= 1;
      const inWater = ED.phys.tileCode(this, Math.floor(p.x / 32), Math.floor(p.y / 32)) === 0 && this.tileAt(p.x, p.y) === ED.T.WATER;
      if (inWater) spd *= 0.65;

      if (p.dashT > 0) {
        p.dashT--;
        p.dashing = true;
        const sp = 8.4 * st.dashDist;
        ED.phys.move(this, p, Math.cos(p.dashAng) * sp, Math.sin(p.dashAng) * sp);
        this.trailFx(p.x, p.y, '#9fd8ff', 0.55);
        if (st.dashDmg > 0) {
          for (const e of this.enemies) {
            if (e.dead || p.dashHit.has(e.id) || e.invuln) continue;
            if (U.circleHit(p.x, p.y, p.r + 6, e.x, e.y, e.r)) { p.dashHit.add(e.id); this.damageEnemy(e, st.dashDmg * this.itemPow() * 0.6 + 2, { src: 'dash', x: p.x, y: p.y, kb: 5, noProc: true, color: '#9fd8ff' }); }
          }
        }
        if (p.dashT <= 0) { p.dashing = false; if (ED.phys.unstick(this, p)) { this.hurtPlayer(2, p.x, p.y, { noKnock: true, inv: 40 }); this.addText(p.x, p.y - 20, 'fell!', '#9a9ab0', 12); } }
      } else {
        p.dashing = false;
        const tx = ax.x * spd, ty = ax.y * spd;
        const acc = this.tileAt(p.x, p.y) === ED.T.ICE ? 0.07 : 0.4;
        p.vx += (tx - p.vx) * acc; p.vy += (ty - p.vy) * acc;
        ED.phys.move(this, p, p.vx, p.vy);
        if (ax.x || ax.y) { p.face = Math.atan2(ax.y, ax.x); p.step += 0.3; }
      }
      // player knockback
      if (Math.abs(p.kx) > 0.05 || Math.abs(p.ky) > 0.05) { ED.phys.move(this, p, p.kx, p.ky); p.kx *= 0.8; p.ky *= 0.8; }
      this.hazardCheck();

      // dash input
      if (inp.consume('dash') && p.dashCd <= 0 && p.dashT <= 0 && p.hammerT <= 0 && p.bashT <= 0) this.startDash(ax);
      // aim + attack
      p.aim = this.aimAngle();
      if (p.hammerT > 0) { p.hammerT--; if (p.hammerT === 0) this.hammerSlam(); }
      if (p.bashT > 0) this.updateBash();
      if (p.echoQ) { p.echoQ.t--; if (p.echoQ.t <= 0) { const a = p.echoQ.ang; p.echoQ = null; this.fireWeapon(a, true); } }
      if (inp.held('attack') && p.atkCd <= 0 && p.dashT <= 0 && p.hammerT <= 0 && p.bashT <= 0 && !this.uiBlocksInput()) this.attack();
      // interact / bomb / active
      if (inp.consume('interact')) this.tryInteract();
      if (inp.consume('bomb') && p.bombs > 0) { p.bombs--; this.placeBomb(p.x + Math.cos(p.aim) * 14, p.y + Math.sin(p.aim) * 14, { r: 80, dmg: 20 * this.itemPow() * 0.7 + 8, owner: 'player' }); }
      if (inp.consume('active')) this.useActive();
      // passives
      this.updateFamiliars();
      // time dilation relic
      p.syncTime = p.relics.timedilation && p.hp <= p.maxHp * 0.3;
    },
    uiBlocksInput() { return !!this.modal; },
    tileAt(x, y) {
      const tx = Math.floor(x / 32), ty = Math.floor(y / 32);
      if (tx < 0 || ty < 0 || tx >= C.COLS || ty >= C.ROWS || !this.room) return 0;
      return this.room.tiles[ty * C.COLS + tx];
    },
    /** spikes / lava under the player */
    hazardCheck() {
      const p = this.player;
      if (p.dashT > 0 || p.inv > 0) return;
      const t = this.tileAt(p.x, p.y + 4);
      if (t === ED.T.SPIKE) { if (this.hurtPlayer(Math.round(3 * this.dif.enemyDmg), p.x, p.y, { zone: true, noKnock: true, inv: 50 })) { p.vy -= 1; } }
      else if (t === ED.T.LAVA) this.hurtPlayer(Math.round(4 * this.dif.enemyDmg), p.x, p.y, { zone: true, noKnock: true, inv: 50 });
    },

    startDash(ax) {
      const p = this.player, st = p.st;
      p.dashAng = (ax.x || ax.y) ? Math.atan2(ax.y, ax.x) : p.face;
      p.dashT = Math.round(11 * Math.min(1.8, st.dashDist)); p.dashCd = Math.round(40 * st.dashCd);
      p.dashIframes = Math.round(st.dashI); p.dashHit = new Set();
      this.sfx('dash'); this.burst(p.x, p.y, 6, '#bfe4ff', 2.5, 14);
      this.relicEvent('dash');
      if (p.syn.quickdraw) p.atkCd = 0;
    },

    // ------------------------------------------------ attacking
    attack() {
      const p = this.player;
      const ang = p.aim;
      const kind = ED.items.WEAPONS[p.weapon.type].kind;
      if (kind === 'boomerang' && this.pproj.some(b => b.kind === 'boom')) return;
      const wi = ED.weaponImpl[kind]; if (wi && wi.canFire && !wi.canFire(this)) return;
      this.fireWeapon(ang, false);
      let cd = p.wcd;
      if (kind === 'daggers') cd *= 1 - Math.min(0.35, p.combo * 0.035);
      if (p.buffT.overclock > 0) cd /= 1.3;
      if (p.tempAtk) cd /= 1 + p.tempAtk;
      p.atkCd = Math.max(3, cd);
      this.run.attacks++;
      this.relicEvent('attack');
      if (p.relics.echoring && !p.echoQ && this.rng.chance(0.14)) p.echoQ = { t: 9, ang };
    },
    fireWeapon(ang, echo) {
      const p = this.player, st = p.st, w = p.weapon, base = ED.items.WEAPONS[w.type];
      const crit = critRoll(this, p);
      const dmg = p.wdmg * (p.tempDmg ? 1 + p.tempDmg : 1) * (crit ? st.critMult : 1);
      const color = base.color;
      this.sfx(base.kind === 'hammer' ? 'heavy' : 'swing', { pitch: base.kind === 'daggers' ? 1.4 : 1 });
      const proj = st.proj;
      switch (base.kind) {
        case 'sword': {
          p.swingN++; const spin = p.swingN % 3 === 0;
          this.swings.push({ kind: 'arc', t: 0, dur: spin ? 13 : 9, ang, arc: Math.min(5.8, (spin ? 4.2 : 2.0) + proj * 0.45), range: p.wrange * (spin ? 1.28 : 1) + proj * 7, dmg: dmg * (spin ? 1.15 : 1), kb: p.wkb, crit, hit: new Set(), color, spin, sweep: p.swingN % 2 ? 1 : -1 });
          p.kx += Math.cos(ang) * 1.6; p.ky += Math.sin(ang) * 1.6; break;
        }
        case 'spear': {
          const n = 1 + Math.min(2, proj);
          for (let k = 0; k < n; k++) this.swings.push({ kind: 'line', t: 0, dur: 10, ang: ang + (k - (n - 1) / 2) * 0.36, len: p.wrange, w: 15, dmg: dmg * (k ? 0.7 : 1), kb: p.wkb, crit, hit: new Set(), color });
          p.kx += Math.cos(ang) * 2.4; p.ky += Math.sin(ang) * 2.4; break;
        }
        case 'hammer': {
          if (!echo) { p.hammerT = 15; p.hammerAng = ang; p.hammerCrit = crit; p.hammerDmg = dmg; } else { p.hammerAng = ang; p.hammerCrit = crit; p.hammerDmg = dmg; this.hammerSlam(); }
          break;
        }
        case 'daggers': {
          p.side = -p.side;
          this.swings.push({ kind: 'arc', t: 0, dur: 6, ang: ang + p.side * 0.18, arc: Math.min(4, 1.55 + proj * 0.4), range: p.wrange + proj * 5, dmg, kb: p.wkb, crit, hit: new Set(), color, sweep: p.side });
          p.kx += Math.cos(ang) * 1.1; p.ky += Math.sin(ang) * 1.1; break;
        }
        case 'bow': {
          const n = 1 + proj, spread = 0.13;
          for (let k = 0; k < n; k++) this.pShot({ kind: 'arrow', ang: ang + (k - (n - 1) / 2) * spread, speed: base.speed, dmg, kb: p.wkb, crit, pierce: st.pierce, life: p.wrange / base.speed, r: 5, color });
          p.kx -= Math.cos(ang) * 0.8; p.ky -= Math.sin(ang) * 0.8; break;
        }
        case 'boomerang': {
          const n = 1 + proj;
          for (let k = 0; k < n; k++) this.pShot({ kind: 'boom', ang: ang + (k - (n - 1) / 2) * 0.28, speed: base.speed, dmg, kb: p.wkb, crit, pierce: 99, life: 400, r: 8, color, range: p.wrange, ox: p.x, oy: p.y, phase: 0 });
          break;
        }
        case 'staff': {
          const n = 1 + proj;
          for (let k = 0; k < n; k++) this.pShot({ kind: 'orb', ang: ang + (k - (n - 1) / 2) * 0.22, speed: base.speed, dmg, kb: p.wkb, crit, pierce: st.pierce, life: p.wrange / base.speed, r: 8, color, homing: 0.035, aoe: 44 });
          break;
        }
        default: { const wi = ED.weaponImpl[base.kind]; if (wi) wi.fire(this, ang, dmg, crit, color, echo); }
      }
    },
    pShot(o) {
      const g = this;
      const b = Object.assign({ x: this.player.x, y: this.player.y, hit: new Set(), dead: false, t: 0, pierce: 0, homing: 0, aoe: 0 }, o);
      b.x = o.x !== undefined ? o.x : this.player.x + Math.cos(o.ang) * 12; b.y = o.y !== undefined ? o.y : this.player.y + Math.sin(o.ang) * 12;
      b.vx = Math.cos(o.ang) * o.speed; b.vy = Math.sin(o.ang) * o.speed;
      if (this.player.st.bounce && !b.bounce) b.bounce = this.player.st.bounce;
      this.pproj.push(b);
      return b;
    },
    hammerSlam() {
      const p = this.player, a = p.hammerAng;
      const x = p.x + Math.cos(a) * 46, y = p.y + Math.sin(a) * 46;
      const r = p.wrange + p.st.proj * 8;
      this.swings.push({ kind: 'circle', t: 0, dur: 8, x, y, r, dmg: p.hammerDmg || p.wdmg, kb: p.wkb, crit: p.hammerCrit, hit: new Set(), color: '#ffb070', stagger: true, heavy: true });
      this.shake(8); this.hitstop(3); this.sfx('thud');
      this.ringFx(x, y, 10, r, '#ffb070', 14, 5);
      this.burst(x, y, 16, '#d0a070', 4.5, 22);
      this.crackWallsNear(x, y, r * 0.8);
    },
    updateBash() {
      const p = this.player;
      p.bashT--;
      ED.phys.move(this, p, Math.cos(p.bashAng) * 7, Math.sin(p.bashAng) * 7);
      this.trailFx(p.x, p.y, '#8fc4ff', 0.6);
      if (p.bashT === 6) {
        const s = ED.items.activeStats(p.active.item);
        const cx = p.x + Math.cos(p.bashAng) * 30, cy = p.y + Math.sin(p.bashAng) * 30;
        this.ringFx(cx, cy, 10, s.radius, '#8fc4ff', 14, 6);
        for (const e of this.enemies) {
          if (e.dead) continue;
          for (const hb of this.hurtboxes(e)) {
            if (Math.hypot(hb.x - cx, hb.y - cy) < s.radius * 0.9 + hb.r) {
              this.damageEnemy(e, s.dmg * 0.9, { src: 'bash', x: p.x, y: p.y, kb: 9, stun: 70, stagger: true, hb, noProc: true }); break;
            }
          }
        }
        for (const b of this.eproj) if (!b.dead && Math.hypot(b.x - cx, b.y - cy) < s.radius * 1.1) { b.friendly = true; b.vx *= -1.4; b.vy *= -1.4; b.ang += Math.PI; b.life = 120; b.color = '#8fc4ff'; }
        this.shake(6); this.sfx('thud');
      }
    },

    // ------------------------------------------------ swings + projectiles
    updateSwings() {
      const p = this.player;
      for (const s of this.swings) {
        s.t++;
        if (s.kind === 'arc' || s.kind === 'line') { s.x = p.x; s.y = p.y; }
        if (s.t <= 3) this.swingHit(s);
      }
      U.compact(this.swings, s => s.t < s.dur);
    },
    swingHit(s) {
      const p = this.player;
      let hitAny = false;
      const test = (hx, hy, hr) => {
        const dx = hx - s.x, dy = hy - s.y, d = Math.hypot(dx, dy);
        if (s.kind === 'arc') {
          if (d > s.range + hr) return false;
          if (d < hr + 10) return true;
          return Math.abs(U.angDiff(s.ang, Math.atan2(dy, dx))) <= s.arc / 2 + Math.atan2(hr, d);
        }
        if (s.kind === 'line') {
          const ex = s.x + Math.cos(s.ang) * s.len, ey = s.y + Math.sin(s.ang) * s.len;
          return U.segDist(hx, hy, s.x, s.y, ex, ey) <= s.w / 2 + hr;
        }
        return d <= s.r + hr;
      };
      for (const e of this.enemies) {
        if (e.dead) continue;
        for (const hb of this.hurtboxes(e)) {
          const key = e.id + ':' + (hb.part ? hb.part.id : 0);
          if (s.hit.has(key)) continue;
          if (!test(hb.x, hb.y, hb.r)) continue;
          s.hit.add(key);
          let dmg = s.dmg;
          if (s.kind === 'line') { const d = Math.hypot(hb.x - s.x, hb.y - s.y); if (d > s.len * 0.7) { dmg *= 1.5; } }
          const got = this.damageEnemy(e, dmg, { src: 'melee', x: p.x, y: p.y, kb: s.kb, crit: s.crit, stagger: s.stagger, heavy: s.heavy, hb });
          hitAny = true;
          if (s.stagger && !e.boss) this.applyStatus(e, 'stun', { t: 45 });
          if (got > 0) { p.combo = Math.min(10, p.combo + 1); p.comboT = 50; }
          break;
        }
      }
      for (const pr of this.props) {
        if (pr.dead) continue;
        if (test(pr.x, pr.y, pr.r)) { s.hit.add('p' + pr.x); this.breakProp(pr); hitAny = true; }
      }
      if (s.kind !== 'circle') {
        // sword/dagger deflect weak bullets? no — but cracked walls are hit by hammer only
      }
      return hitAny;
    },
    updatePProj() {
      const p = this.player, ts = 1;
      for (const b of this.pproj) {
        if (b.dead) continue;
        b.t++; b.life--;
        if (b.upd) { b.upd(this, b); }
        else if (b.kind === 'boom') {
          if (b.phase === 0) {
            b.x += b.vx; b.y += b.vy;
            if (Math.hypot(b.x - b.ox, b.y - b.oy) >= b.range || ED.phys.blocked(this, b.x, b.y, 3, true, false)) { b.phase = 1; b.hit.clear(); }
          } else {
            const a = Math.atan2(p.y - b.y, p.x - b.x), s = b.speed * 1.25;
            b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; b.x += b.vx; b.y += b.vy;
            if (Math.hypot(p.x - b.x, p.y - b.y) < 16) { b.dead = true; p.atkCd = Math.min(p.atkCd, 4); continue; }
          }
          b.spin = (b.spin || 0) + 0.5;
        } else {
          if (b.homing) {
            const t = this.homingTarget(b.x, b.y, 220);        // nearest VULNERABLE hurtbox (parts of multi-part bosses, not their armoured core)
            if (t) { const want = Math.atan2(t.y - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx), a = U.approachAngle(cur, want, b.homing * 1.4); const s = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; }
          }
          b.x += b.vx; b.y += b.vy;
          if (b.life <= 0) { b.dead = true; if (b.aoe) this.orbBurst(b); continue; }
          if (ED.phys.blocked(this, b.x, b.y, 2, true, false)) {
            if (b.bounce > 0 && ED.projBounce && ED.projBounce(this, b)) { /* ricocheted */ }
            else { b.dead = true; this.burst(b.x, b.y, 3, b.color, 1.5, 10); if (b.aoe) this.orbBurst(b); continue; }
          }
        }
        if (b.dead || b.noHit) continue;
        if (b.kind !== 'boom' || b.t % 1 === 0) {
          for (const pr of this.props) if (!pr.dead && U.circleHit(b.x, b.y, b.r, pr.x, pr.y, pr.r)) { this.breakProp(pr); if (b.kind !== 'boom' && !b.persist) b.dead = true; }
          for (const e of this.enemies) {
            if (e.dead || b.dead) continue;
            for (const hb of this.hurtboxes(e)) {
              if (!U.circleHit(b.x, b.y, b.r, hb.x, hb.y, hb.r)) continue;
              const key = e.id + ':' + (hb.part ? hb.part.id : 0);
              if (b.hit.has(key)) break;
              b.hit.add(key);
              const got = this.damageEnemy(e, b.dmg, { src: 'proj', x: b.x - b.vx * 2, y: b.y - b.vy * 2, kb: b.kb * 0.8, crit: b.crit, hb });
              if (got <= 0 && !e.invuln) { b.dead = b.kind !== 'boom' && !b.persist; }
              if (b.kind !== 'boom' && !b.persist) {
                if (b.pierce > 0) b.pierce--; else { b.dead = true; if (b.aoe) this.orbBurst(b, e); }
              }
              break;
            }
          }
        }
      }
      U.compact(this.pproj, b => !b.dead);
    },
    homingTarget(x, y, maxD) {
      let best = null, bd = maxD * maxD;
      for (const e of this.enemies) {
        if (e.dead || e.invuln) continue;
        for (const hb of this.hurtboxes(e)) {
          if (hb.part && !ED.bosses.partVulnerable(e, hb.part)) continue;
          const d = U.dist2(x, y, hb.x, hb.y); if (d < bd) { bd = d; best = hb; }
        }
      }
      return best;
    },
    orbBurst(b, skip) {
      this.burst(b.x, b.y, 10, b.color, 3.5, 18); this.ringFx(b.x, b.y, 6, b.aoe, b.color, 10, 3);
      for (const e of this.enemies) {
        if (e.dead || e === skip) continue;
        if (U.circleHit(b.x, b.y, b.aoe, e.x, e.y, e.r * (e.big ? 0.5 : 1))) this.damageEnemy(e, b.dmg * 0.55, { src: 'proj', x: b.x, y: b.y, kb: 2, noProc: true });
      }
    },

    // ------------------------------------------------ actives
    updateActiveTimers() {
      const a = this.player.active; if (!a) return;
      for (let i = a.timers.length - 1; i >= 0; i--) { a.timers[i]--; if (a.timers[i] <= 0) { a.timers.splice(i, 1); if (a.charges < a.max) a.charges++; } }
    },
    activeOnRoomClear() {
      const a = this.player.active; if (!a) return;
      const s = ED.items.activeStats(a.item);
      if (s.rooms) { a.roomProg++; if (a.roomProg >= s.rooms) { a.roomProg = 0; if (a.charges < a.max) { a.charges++; this.toast(s.def.name + ' recharged', s.def.color); } } }
    },
    useActive() {
      const p = this.player, a = p.active;
      if (!a || a.charges <= 0 || p.dead) { if (a) this.sfx('deny'); return; }
      const s = ED.items.activeStats(a.item), id = a.item.id, pow = this.itemPow();
      const aim = p.aim;
      let used = true;
      switch (id) {
        case 'bomb': this.placeBomb(p.x, p.y, { r: s.radius, dmg: s.dmg * Math.pow(pow, 0.9) * 0.8 + 6, owner: 'player', fuse: 55 }); break;
        case 'bash': p.bashT = 14; p.bashAng = aim; p.inv = Math.max(p.inv, 24); this.sfx('lunge'); break;
        case 'fire': this.zoneEnemies(p.x, p.y, s.radius, s.dmg * Math.pow(pow, 0.9) * 0.9, { ignite: true, speed: 5.5, color: '#ff6a2a' }); this.shake(5); this.sfx('boom', { vol: 0.6 }); this.flashScreen('#ff6a2a', 0.18); break;
        case 'time': this.slowT = Math.round(s.dur * 60); this.flashScreen('#7fd8ff', 0.25); this.sfx('shrine'); break;
        case 'heal': if (p.hp >= p.maxHp) { used = false; this.toast('Already at full health', '#9a9ab0', 80); } else { this.healPlayer(Math.ceil(p.maxHp * 0.3)); this.ringFx(p.x, p.y, 8, 70, '#ff7aa0', 22, 4); this.sfx('heal'); } break;
        case 'blink': {
          let d = 0; const nx = Math.cos(aim), ny = Math.sin(aim);
          for (let k = 8; k <= 170; k += 6) { if (ED.phys.blocked(this, p.x + nx * k, p.y + ny * k, p.cr, false, false)) break; d = k; }
          if (d < 20) { used = false; this.sfx('deny'); break; }
          this.burst(p.x, p.y, 14, '#d9a8ff', 4, 22);
          this.explode(p.x, p.y, s.radius, s.dmg * Math.pow(pow, 0.9), { owner: 'player' });
          p.x += nx * d; p.y += ny * d; p.inv = Math.max(p.inv, 20);
          this.burst(p.x, p.y, 14, '#d9a8ff', 4, 22); this.ringFx(p.x, p.y, 6, 50, '#d9a8ff', 12, 3); this.sfx('dash'); break;
        }
        case 'gravity': this._zone({ kind: 'pull', shape: 'circle', x: p.x + Math.cos(aim) * 90, y: p.y + Math.sin(aim) * 90, r: s.radius, dmg: s.dmg * pow, life: 200, hurts: false, color: '#8a6aff', dur: 0 }); this.sfx('summon'); break;
        case 'wisp': p.tempWisp = 480; p.wispT = 0; this.sfx('summon'); this.toast('Spirits answer your call!', '#9ff3ff'); break;
        default: { const f = ED.activeImpl[id]; if (f && f(this, s, aim, pow) === false) used = false; }
      }
      if (!used) return;
      a.charges--;
      if (s.def.cd > 0) a.timers.push(Math.round(s.cd * 60 * p.st.activeCd));
      this.run.activesUsed++;
    },

    // ------------------------------------------------ orbit blades + wisps
    updateFamiliars() {
      const p = this.player, st = p.st;
      // orbit blades
      const n = st.orbit; p.orbPos.length = 0;
      if (n > 0) {
        p.orbA += 0.075;
        for (let k = 0; k < n; k++) {
          const a = p.orbA + k * TAU / n, x = p.x + Math.cos(a) * 46, y = p.y + Math.sin(a) * 46;
          p.orbPos.push({ x, y, a });
          for (const e of this.enemies) {
            if (e.dead || e.invuln) continue;
            if ((e.orbCd || 0) > this.frame) continue;
            for (const hb of this.hurtboxes(e)) {
              if (U.circleHit(x, y, 9, hb.x, hb.y, hb.r)) {
                e.orbCd = this.frame + 22;
                this.damageEnemy(e, Math.max(1, p.wdmg * 0.6), { src: 'orbit', x: p.x, y: p.y, kb: 2.5, noProc: true, hb });
                break;
              }
            }
          }
        }
      }
      // wisps
      const wn = st.wisp + (p.tempWisp > 0 ? 3 : 0); p.wisps.length = 0;
      if (p.tempWisp > 0) p.tempWisp--;
      if (wn > 0) {
        p.wispA += 0.035; p.wispT++;
        for (let k = 0; k < wn; k++) {
          const a = p.wispA * (k % 2 ? -1 : 1) + k * TAU / wn, x = p.x + Math.cos(a) * 62, y = p.y + Math.sin(a) * 62 - 6;
          p.wisps.push({ x, y });
          if ((p.wispT + k * 17) % 56 === 0) {
            const t = this.nearestEnemy(x, y, 280);
            if (t) this.pShot({ kind: 'wispshot', x, y, ang: Math.atan2(t.y - y, t.x - x), speed: 6.2, dmg: Math.max(1, p.wdmg * 0.55), kb: 1.5, crit: false, pierce: 0, life: 60, r: 5, color: '#9ff3ff', homing: 0.05 });
          }
        }
      }
    },
  };
  function g_rngStub() { return new ED.RNG('starter'); }
  ED.mixins.push(P);
})(typeof globalThis !== 'undefined' ? globalThis : this);

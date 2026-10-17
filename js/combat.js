/* EMBERDEEP — combat.js
 * Damage resolution for enemies and the player: shields, crits, on-hit procs (burn, chill,
 * poison, chain lightning, explosions, lifesteal), kills + loot, hurtPlayer with armor,
 * thorns, per-hit fairness cap and the Phoenix revive.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D;
  const TAU = U.TAU;

  const M = {
    // ------------------------------------------------ enemy damage
    damageEnemy(e, dmg, o) {
      o = o || {};
      if (e.dead) return 0;
      const p = this.player;
      if (e.invuln && !o.ignoreInvuln) { if (!o.noFlashText) this.addText(e.x, e.y - e.r, 'immune', '#99a0c8', 9); return 0; }
      if (e.takeHit) {                                    // multi-part bosses
        dmg = e.takeHit(this, o.hb || null, dmg, o);
        if (!dmg) return 0;
      }
      // frontal shield
      if (e.shieldArc && !o.pierceShield && e.guardBreak <= 0 && e.state !== 'wind' && e.state !== 'bash' && o.x !== undefined) {   // guard drops while it attacks
        const toSrc = Math.atan2(o.y - e.y, o.x - e.x);
        if (Math.abs(U.angDiff(e.face, toSrc)) < e.shieldArc / 2) {
          if (o.stagger) {
            e.guardBreak = 210; e.stun = Math.max(e.stun, 50);
            this.addText(e.x, e.y - e.r - 6, 'GUARD BREAK', '#ffd24a', 12); this.shake(5); this.sfx('crack');
            this.burst(e.x, e.y, 12, '#9fc4ff', 4, 22);
          } else {
            this.burst(e.x + Math.cos(toSrc) * e.r, e.y + Math.sin(toSrc) * e.r, 4, '#cfe4ff', 3, 10);
            this.addText(e.x, e.y - e.r, 'blocked', '#9fb8d8', 9); this.sfx('block');
            if (e.def.onBlock) e.def.onBlock(e, this, o, dmg);                       // a foe may answer a blocked blow (v18: a silvered shield sends a shot back)
            if (o.src === 'melee' && o.kb && !e.boss) { e.kx -= Math.cos(toSrc) * 0.6; e.ky -= Math.sin(toSrc) * 0.6; }   // only melee clangs shove; blocked arrows don't pin it
            return 0;
          }
        }
      }
      const melee = o.src === 'melee';
      if (o.src === 'melee' || o.src === 'proj') {
        if (p.st.execute && e.hp < e.maxHp * 0.3) dmg *= 1 + p.st.execute;
        if (p.st.opener && e.hp >= e.maxHp * 0.999) dmg *= 1 + p.st.opener;
        if (p.syn.shatter && e.status.slow) dmg *= 1.4;
      }
      dmg *= (e.vuln || 1) * (1 - (e.armor || 0));
      if (e.hexT > 0) dmg *= 1.25;
      if (p.st.chillVuln && e.status.slow) dmg *= 1 + p.st.chillVuln;
      if (e.dmgTakenMul) dmg *= e.dmgTakenMul;
      if (e.dmgFilter) dmg = e.dmgFilter(this, e, dmg, o);          // (v24) a land may rewrite what a foe takes (the Footlights' shroud)
      if (e.ward > 0) {
        const ab = Math.min(e.ward, dmg); e.ward -= ab; dmg -= ab;
        this.addText(e.x, e.y - e.r, Math.round(ab), '#9fc4ff', 10);
        if (e.ward <= 0) this.burst(e.x, e.y, 10, '#9fc4ff', 3, 20);
        if (dmg <= 0) return 0;
      }
      dmg = Math.max(0.1, dmg);
      e.hp -= dmg; e.flash = 6;
      this.runDamageDealt = (this.runDamageDealt || 0) + dmg;
      if (!o.noFlashText) {
        this.addText(e.x, e.y - e.r - 4, dmg >= 10 ? Math.round(dmg) : dmg.toFixed(dmg < 3 ? 1 : 0), o.color || (o.crit ? '#ffd24a' : '#ffffff'), o.crit ? 17 : dmg > 30 ? 14 : 11);
      }
      if (o.src !== 'burn' && o.src !== 'poison') {
        this.burst(e.x, e.y, o.crit ? 8 : 4, o.crit ? '#ffd24a' : e.color, o.crit ? 4 : 2.6, 14);
        this.sfx(o.crit ? 'crit' : 'hit', { pitch: 0.9 + Math.random() * 0.25 });
      }
      if (o.crit) { this.hitstop(3); this.shake(3); }
      else if (o.heavy) { this.hitstop(4); this.shake(4); }
      // knockback / stun
      if (!o.noKb && !e.boss && !e.noKnock && o.x !== undefined) {
        const a = Math.atan2(e.y - o.y, e.x - o.x), k = (o.kb || 0) * (1 - (e.kbRes || 0));
        e.kx += Math.cos(a) * k; e.ky += Math.sin(a) * k;
      }
      if (o.stun && !e.boss) this.applyStatus(e, 'stun', { t: o.stun });
      for (const m of e.mods) if (m.onHurt) m.onHurt(e, this, dmg, { melee, o });
      // proc effects
      if (!o.noProc && (o.src === 'melee' || o.src === 'proj') && !e.dead) this.procHit(e, dmg, o);
      if (e.hp <= 0) this.killEnemy(e, o);
      return dmg;
    },

    procHit(e, dmg, o) {
      const p = this.player, st = p.st, rng = this.rng;
      const base = Math.max(1, p.wdmg || 4);
      if (st.burn && rng.chance(st.burn)) this.applyStatus(e, 'burn', { t: 180, dps: Math.max(1, base * 0.18) });
      if (st.freeze && rng.chance(st.freeze)) { this.applyStatus(e, 'slow', { t: 130, f: 0.45 }); this.burst(e.x, e.y, 5, '#9fe4ff', 2, 16); }
      if (st.hex && rng.chance(st.hex)) this.applyStatus(e, 'hex', { t: 360 });
      if (st.poison && rng.chance(st.poison)) this.applyStatus(e, 'poison', { t: 240, dps: Math.max(1, base * 0.14) });
      if (st.lifesteal && rng.chance(st.lifesteal) && this.frame - (p.lastLeech || -99) > 10) { p.lastLeech = this.frame; this.healPlayer(1, true); }
      if (st.chain && rng.chance(st.chain)) this.chainLightning(e, dmg * 0.65, 2 + (p.syn.tempest ? 1 : 0), o);
      if (st.explode && !o.noExplode && rng.chance(st.explode * 0.7)) this.explode(e.x, e.y, 56, Math.max(2, base * 0.7), { owner: 'player', fire: !!p.syn.pyre });
      for (const id in p.relics) { const r = ED.items.relic(id); if (r && r.on && r.on.hit) r.on.hit(this, p, e, dmg, o, p.relics[id]); }
    },
    chainLightning(from, dmg, n, o) {
      const hit = new Set([from.id]);
      let cur = from;
      for (let i = 0; i < n; i++) {
        let best = null, bd = 160 * 160;
        for (const e of this.enemies) { if (e.dead || hit.has(e.id) || e.invuln) continue; const d = U.dist2(cur.x, cur.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
        if (!best) break;
        hit.add(best.id);
        this.fx.push({ x: cur.x, y: cur.y, x2: best.x, y2: best.y, vx: 0, vy: 0, life: 9, max: 9, color: '#ffe14a', shape: 'bolt', drag: 1, grav: 0, size: 2 });
        this.damageEnemy(best, dmg, { src: 'chain', x: cur.x, y: cur.y, kb: 1, noProc: true, color: '#ffe14a' });
        if (this.player.syn.bloodstorm && this.rng.chance(0.22)) this.healPlayer(1, true);
        cur = best;
      }
      this.sfx('zap');
    },

    // ------------------------------------------------ kills + loot
    killEnemy(e, o) {
      if (e.dead) return;
      o = o || {};
      e.dead = true; e.hp = 0; e.lastSrc = o.src;
      const p = this.player, rng = this.rng;
      if (!e.minion || e.carriesKey) this.run.kills++;
      else this.run.kills++;
      this.run.killsByType[e.type] = (this.run.killsByType[e.type] || 0) + 1;
      if (e.def.onDeath) e.def.onDeath(e, this);
      for (const m of e.mods) if (m.onDeath) m.onDeath(e, this);
      if (p.syn.shatter && e.status.slow) this.explode(e.x, e.y, 70, Math.max(3, p.wdmg * 0.8), { owner: 'player' });
      if (e.onDeath) e.onDeath(this, e);
      // juice
      const big = e.boss ? 40 : e.elite ? 18 : 10;
      this.burst(e.x, e.y, big, e.color, e.boss ? 7 : 4, e.boss ? 40 : 22, { size: e.boss ? 5 : 3 });
      this.burst(e.x, e.y, Math.round(big / 2), '#fff', 3, 14);
      this.sfx(e.boss ? 'bossdie' : 'kill', { pitch: 0.85 + Math.random() * 0.3 });
      if (e.elite) { this.shake(4); this.hitstop(4); }
      // relic hooks
      for (const id in p.relics) { const r = ED.items.relic(id); if (r && r.on && r.on.kill) r.on.kill(this, p, e, p.relics[id]); }
      ED.runHooks('kill', this, e);
      if (e.boss || e.noLoot) return;
      // loot
      const cost = e.def.cost || 1;
      let gold = cost * 1.7 * (0.7 + rng.next() * 0.6) * (e.elite ? 2.6 : 1) * (e.minion ? 0.3 : 1);
      if (gold > 0.35 && (gold >= 1 || rng.chance(gold))) this.dropGold(e.x, e.y, Math.max(1, Math.round(gold)));
      const luck = p.st.luck;
      const hp = (e.elite ? 0.2 : 0.045) + luck * 0.006;
      if (!e.minion && rng.chance(hp)) this.dropPickup('heart', e.x, e.y, 4);
      else if (!e.minion && rng.chance(0.03 + luck * 0.004)) this.dropPickup('bomb', e.x, e.y, 1);
      if (e.carriesKey) {
        this.dropPickup('key', e.x, e.y, 1, { keyType: e.carriesKey, still: true });
        this.toast('A key drops!', ED.keys.KEYTYPES[e.carriesKey].color);
        this.sfx('keydrop');
        const hd = (this.room.holds || []).find(h => h.id === e.holdId); if (hd) hd.got = true;
      }
    },

    // ------------------------------------------------ player damage
    /** returns true if the hit connected */
    hurtPlayer(dmg, sx, sy, o) {
      o = o || {};
      const p = this.player;
      if (p.dead || p.inv > 0 || this.god || this.transT > 0) return false;
      if (p.dashT > 0 && p.dashIframes > 0) return false;
      if (p.bashT > 0) return false;
      if (p.guard > 0 && !o.noGuard) {                    // a Guard absorbs one whole hit
        p.guard--; p.guardT = 0; p.inv = Math.max(p.inv, 42); p.flash = 8;
        this.addText(p.x, p.y - 22, 'GUARD', '#a8c8ff', 13); this.ringFx(p.x, p.y, 8, 40, '#a8c8ff', 14, 4); this.burst(p.x, p.y, 10, '#cfe4ff', 3.5, 18); this.sfx('block'); this.shake(3);
        ED.runHooks('guardBreak', this);
        return true;
      }
      const st = p.st, fl = this.dif;
      let d = dmg * st.dmgTaken;
      if ((o.fire || o.lava) && p.fireMul) d *= p.fireMul;                            // (v28) Cooled Blood: fire and lava hurt half as much
      const K = 20 + 1.3 * this.floorNum;
      d *= 1 - U.clamp(st.def / (st.def + K), 0, 0.8);
      d = Math.max(1, Math.round(d));
      const capFrac = o.big ? 0.62 : D.CAPS.maxHitFrac;
      d = Math.min(d, Math.max(2, Math.ceil(p.maxHp * capFrac)));
      this.run.lastHitBy = o.src ? (o.src.bossName || (o.src.def && o.src.def.name) || (o.src.name) || 'a foe') : (o.fire ? 'fire' : o.zone ? 'a hazard' : 'a trap');
      this.run.lastHitId = o.src ? (o.src.spec ? (o.src.spec.revenant ? 'revenant' : o.src.bdef && o.src.bdef.id) : o.src.type) : null;       // what hit you last (v4's Revenants remember it)
      p.hp -= d; p.inv = o.inv || 72; p.flash = 12; p.hurtT = 18;
      this.run.damageTaken += d; this.run.hitsTaken++;
      this.addText(p.x, p.y - 22, '-' + d, '#ff5a5a', 16);
      this.burst(p.x, p.y, 10, '#ff4a4a', 4, 20);
      this.shake(o.zone ? 6 : 7 + Math.min(5, d / 3)); this.hitstop(4); this.sfx('hurt');
      this.flashScreen('#ff0000', Math.min(0.35, 0.12 + d / 40));
      if (!o.noKnock && sx !== undefined) {
        const a = Math.atan2(p.y - sy, p.x - sx);
        p.kx = Math.cos(a) * 5.2 * (p.kbMul || 1); p.ky = Math.sin(a) * 5.2 * (p.kbMul || 1);       // (v28) Plumb Line halves it
      }
      // thorns
      if (o.contact && o.src && !o.noThorns && !o.src.dead) {
        let th = st.thorns;
        if (th > 0) this.damageEnemy(o.src, th * this.itemPow() * 0.7, { src: 'thorns', x: p.x, y: p.y, kb: 3, noProc: true, color: '#d06a9a' });
      }
      for (const id in p.relics) { const r = ED.items.relic(id); if (r && r.on && r.on.hurt) r.on.hurt(this, p, d, p.relics[id]); }
      ED.runHooks('hurt', this, o.src || null, d);                            // packs may watch who hurt you (v9: the Hunt remembers its killers)
      if (p.hp <= 0) this.killPlayer();
      else if (p.hp <= p.maxHp * 0.25) this.sfx('lowhp');
      return true;
    },
    killPlayer() {
      const p = this.player;
      if (p.relics.phoenix && !p.phoenixUsed) {
        p.phoenixUsed = true; p.hp = Math.ceil(p.maxHp * 0.5); p.inv = 150;
        this.explode(p.x, p.y, 200, 40 * this.itemPow(), { owner: 'player', fire: true });
        this.toast('PHOENIX FEATHER! You rise from the ashes.', '#ffb02a', 220);
        this.flashScreen('#ffb02a', 0.6); this.sfx('revive');
        return;
      }
      p.hp = 0; p.dead = true; this.run.killedBy = this.run.lastHitBy || 'something unseen';
      this.onPlayerDeath();
    },
    healPlayer(n, quiet) {
      const p = this.player;
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + n);
      const got = p.hp - before;
      if (got > 0 && !quiet) { this.addText(p.x, p.y - 22, '+' + got, '#6ee07a', 14); this.burst(p.x, p.y, 6, '#6ee07a', 2, 18, { dir: -Math.PI / 2, spread: 1.5 }); }
      else if (got > 0) this.addText(p.x, p.y - 22, '+' + got, '#6ee07a', 10);
      return got;
    },
    itemPow() { return D.at(this.floorNum).itemPower; },
    giveGold(val) {
      const p = this.player;
      const amt = Math.max(1, Math.round(val * this.dif.goldMult * p.st.gold));
      p.gold += amt; this.run.goldEarned += amt;
      this.goldPulse = 12;
      return amt;
    },
    giveKey(type, silent) {
      const p = this.player;
      p.keys[type] = (p.keys[type] || 0) + 1;
      const kt = ED.keys.KEYTYPES[type];
      if (!silent) { this.toast('Picked up: ' + kt.name, kt.color); this.sfx('keypick'); }
      else this.toast(kt.name + ' granted', kt.color);
      this.keyFlash = { type, t: 0 };
      return true;
    },
  };
  ED.mixins.push(M);
})(typeof globalThis !== 'undefined' ? globalThis : this);

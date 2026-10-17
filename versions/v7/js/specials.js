/* EMBERDEEP — specials.js
 * Runtime logic for every special room type (positive / negative / gamble), plus the
 * switch + brazier puzzles used by switch-locked mini boss doors.
 * A room type = one entry: { setup, onEnter, update, onClear }.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, C = ED.C, T = ED.T;
  const TAU = U.TAU;
  const S = ED.specials = {};
  const gp = (g, base) => Math.max(5, Math.round(base * g.dif.priceMult * g.player.st.price / 5) * 5);

  const BLESSINGS = [
    { name: 'Might', mods: { dmg: 0.15 }, desc: '+15% damage' },
    { name: 'Swiftness', mods: { speed: 0.10, dashCd: -0.10 }, desc: '+10% speed, -10% dash cooldown' },
    { name: 'Fortune', mods: { luck: 2, gold: 0.2 }, desc: 'Luckier loot, +20% gold' },
    { name: 'Ward', mods: { def: 2 }, desc: '+2 defense' },
    { name: 'Fury', mods: { atkSpd: 0.12, crit: 0.05 }, desc: '+12% attack speed, +5% crit' },
    { name: 'Vigor', mods: { maxHp: 4 }, desc: '+1 heart container', heal: 4 },
    { name: 'Embers', mods: { burn: 0.2 }, desc: '+20% ignite chance' },
    { name: 'Rime', mods: { freeze: 0.16 }, desc: '+16% chill chance' },
    { name: 'Lifegrace', mods: { lifesteal: 0.06, regen: 2 }, desc: 'Heal on hit, slow regen' },
    { name: 'Clarity', mods: { activeCd: -0.25 }, desc: 'Active recharges 25% faster' },
  ];
  const CURSES = [
    { id: 'frail', name: 'Curse of Frailty', mods: { maxHp: -8 }, desc: '-2 heart containers' },
    { id: 'sluggish', name: 'Curse of Sloth', mods: { speed: -0.12, dashCd: 0.3 }, desc: '-12% speed, dash recharges 30% slower' },
    { id: 'brittle', name: 'Curse of Brittleness', mods: { def: -3, dmgTaken: 0.15 }, desc: '-3 defense, +15% damage taken' },
    { id: 'weak', name: 'Curse of Weakness', mods: { dmg: -0.12 }, desc: '-12% damage' },
    { id: 'hexed', name: 'Curse of the Horde', mods: { enemyHp: 0.18 }, desc: 'Enemies have 18% more HP' },
    { id: 'greed', name: 'Curse of Greed', mods: { price: 0.3, gold: -0.2 }, desc: 'Shops +30%, gold -20%' },
    { id: 'clumsy', name: 'Curse of Clumsiness', mods: { atkSpd: -0.15, crit: -0.05 }, desc: '-15% attack speed, -5% crit' },
  ];
  S.BLESSINGS = BLESSINGS; S.CURSES = CURSES;
  function rollCurse(rng, floor) { const c = Object.assign({}, rng.pick(CURSES)); if (floor >= 8) { for (const k in c.mods) c.mods[k] *= 1.0 + Math.min(1, (floor - 8) * 0.04); } return c; }

  function weightedTable(rng, table) {
    const keys = Object.keys(table); let tot = 0; for (const k of keys) tot += table[k];
    let r = rng.next() * tot; for (const k of keys) { r -= table[k]; if (r < 0) return k; } return keys[0];
  }

  /** one altar per key placed in this room (several keys can share a host room) */
  function keyAltars(g, room, y) {
    const holds = (room.holds || []).filter(h => !h.got);
    holds.forEach((hold, i) => g.addInter({ type: 'keyaltar', x: 480 + (i - (holds.length - 1) / 2) * 80, y, r: 18, color: ED.keys.KEYTYPES[hold.key].color, hold, prompt: () => 'Take the ' + ED.keys.KEYTYPES[hold.key].name, use: (gg, it) => { hold.got = true; it.dead = true; gg.dropPickup('key', it.x, it.y, 1, { keyType: hold.key, still: true }); gg.sfx('keydrop'); } }));
  }
  // ------------------------------------------------------------------ positive rooms
  S.treasure = {
    setup(g, room, rt) {
      const rng = rt.rng.fork('treasure');
      const offers = ED.items.rollOffers(rng, g.floorNum, 3, { luck: g.player.st.luck, relics: g.player.relics });
      g.offerChoice(offers, 480, 250);
      room.cleared = rt.cleared = true;
      keyAltars(g, room, 420);
    },
    onEnter(g) { g.toast('Treasure! Choose ONE.', '#ffd24a', 120); },
  };
  S.fountain = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      g.addInter({ type: 'fountain', x: 480, y: 270, r: 30, range: 70, uses: 1, color: '#5fd4ff',
        prompt: (gg, it) => it.uses > 0 ? 'Drink (heal 60%, wash away a curse)' : 'The water is spent',
        use(gg, it) {
          if (it.uses <= 0) return; const p = gg.player;
          it.uses--; gg.healPlayer(Math.ceil(p.maxHp * 0.6)); gg.ringFx(it.x, it.y, 10, 120, '#5fd4ff', 30, 5); gg.sfx('heal');
          if (p.curses.length) { const c = p.curses.pop(); ED.items.recalc(p); gg.toast('Cleansed: ' + c.name, '#5fd4ff'); }
          if (it.uses <= 0) it.disabledLook = true;
        } });
    },
    onEnter(g) { g.toast('A healing fountain. Drink deeply.', '#5fd4ff', 120); },
  };
  S.rest = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      const spec = g.floor.rooms[g.floor.bossId].bossDef;
      const def = ED.bosses.def(spec.defId);
      g.addInter({ type: 'camp', x: 480, y: 280, r: 26, range: 70, uses: 1, color: '#9bf08a',
        prompt: (gg, it) => it.uses > 0 ? 'Rest by the fire (full heal + recharge)' : 'You feel ready.',
        use(gg, it) {
          if (it.uses <= 0) return; const p = gg.player; it.uses--;
          gg.healPlayer(p.maxHp); if (p.active) { p.active.charges = p.active.max; p.active.timers.length = 0; }
          p.bombs = Math.max(p.bombs, 3); gg.ringFx(it.x, it.y, 10, 140, '#9bf08a', 30, 5); gg.sfx('heal'); gg.toast('Rested. Bombs restocked.', '#9bf08a');
        } });
      rt.restInfo = { name: spec.name, teaches: def.teaches };
    },
    onEnter(g, room, rt) { g.toast('A quiet place. The MEGA BOSS awaits beyond: ' + rt.restInfo.name, '#ff9a6a', 240); g.after(150, () => g.toast(rt.restInfo.teaches, '#cfd8ff', 260)); },
  };

  S.shop = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      const rng = rt.rng.fork('shop'), F = g.floorNum;
      rt.shop = { rerolls: 0, rng };
      this.stock(g, rt, true);
      // services row
      const y = 380;
      const svc = (x, o) => g.addInter(Object.assign({ type: 'service', x, y, r: 16, range: 50 }, o));
      svc(300, { name: 'Healing Draught', color: '#ff7aa0', desc: 'Restore 50% of your health', price: () => gp(g, 22), use(gg, it) { if (!gg.buy(it)) return; gg.healPlayer(Math.ceil(gg.player.maxHp * 0.5)); } });
      svc(390, { name: 'Bomb Pouch (x3)', color: '#ff9a3c', desc: 'Three bombs', price: () => gp(g, 15), use(gg, it) { if (!gg.buy(it)) return; gg.player.bombs += 3; } });
      svc(480, { name: 'Small Key', color: '#f2c94c', desc: 'Opens a Small Key lock', price: () => gp(g, 40), use(gg, it) { if (!gg.buy(it)) return; gg.giveKey('small'); } });
      svc(570, { name: 'Sell a spare key', color: '#c8c8d8', desc: 'Sells a key you do not need on this floor', price: () => 0, sell: true,
        use(gg, it) {
          const spare = g.spareKeys(); const type = spare.small > 0 ? 'small' : spare.mb > 0 ? 'mb' : null;
          if (!type) { gg.sfx('deny'); gg.toast('You have no spare keys (keys needed for this floor are not for sale)', '#ff9a6a', 160); return; }
          gg.player.keys[type]--; const v = gp(g, 22); gg.player.gold += v; gg.run.goldEarned += 0; gg.addText(gg.player.x, gg.player.y - 20, '+' + v, '#ffd24a', 14); gg.sfx('coin'); gg.toast('Sold a spare key', '#ffd24a');
        }, prompt: () => { const s = g.spareKeys(); return (s.small > 0 || s.mb > 0) ? 'Sell a spare key (+' + gp(g, 22) + 'g)' : 'Sell spare keys (none spare)'; } });
      svc(660, { name: 'Re-roll stock', color: '#b8a8ff', desc: 'Replace the items on offer', price: () => gp(g, 25 * (1 + rt.shop.rerolls * 0.7)), use(gg, it) { if (!gg.buy(it)) return; rt.shop.rerolls++; S.shop.stock(gg, rt, false); } });
      // the reserved key (if this shop holds a floor key)
      const shopHolds = (room.holds || []).filter(h => h.via === 'shop' && !h.got);
      shopHolds.forEach((hold, hi) => g.addInter({ type: 'service', x: 480 + (hi - (shopHolds.length - 1) / 2) * 120, y: 470, r: 16, range: 50, name: ED.keys.KEYTYPES[hold.key].name + ' (reserved)', color: ED.keys.KEYTYPES[hold.key].color, hold,
        desc: 'The shopkeeper held this one back for you. Free once the floor is cleared.',
        price: () => g.floorCleared() ? 0 : gp(g, 12), use(gg, it) { if (!gg.buy(it)) return; hold.got = true; it.dead = true; gg.giveKey(hold.key); } }));
    },
    stock(g, rt, first) {
      for (const it of rt.inters) if (it.shopItem) it.dead = true;
      const F = g.floorNum, rng = rt.shop.rng.fork('stock' + rt.shop.rerolls);
      const offers = ED.items.rollOffers(rng, F, 4, { luck: g.player.st.luck, relics: g.player.relics, minRank: 0, kinds: { weapon: 2.4, armor: 2.4, relic: 4.4, active: 1.2 } });
      offers.forEach((o, i) => {
        const x = 300 + i * 120;
        const it = g.pedestal(o, x, 250, { shopItem: true, price: { gold: ED.items.price(o, F, g.player) }, update(gg, self) { self.price.gold = ED.items.price(self.item, F, gg.player); } });
      });
    },
    onEnter(g) { g.toast('Welcome to the shop!', '#6fe08a', 100); },
  };

  S.blacksmith = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      const F = g.floorNum, pm = () => g.dif.priceMult * g.player.st.price;
      const pr = (base, n) => Math.max(5, Math.round(base * Math.pow(1.45, n) * pm() / 5) * 5);
      g.addInter({ type: 'anvil', x: 300, y: 270, r: 20, range: 56, name: 'Sharpen Weapon', color: '#ff9a3c',
        desc: () => '+10% damage, +3% speed per tier.  Tier now: ' + g.player.weapon.upg, price: () => pr(30, g.player.weapon.upg || 0),
        use(gg, it) { if (!gg.buy(it)) return; gg.player.weapon.upg = (gg.player.weapon.upg || 0) + 1; ED.items.recalc(gg.player); gg.burst(it.x, it.y, 20, '#ffb04a', 4, 24); gg.shake(4); gg.sfx('thud'); gg.toast('Weapon sharpened to +' + gg.player.weapon.upg, '#ffb04a'); } });
      g.addInter({ type: 'anvil', x: 480, y: 270, r: 20, range: 56, name: 'Reforge Weapon', color: '#c78bff',
        desc: () => 'Re-roll your weapon\'s special properties.', price: () => pr(38, (g.player.weapon.reforged || 0) * 0.8),
        use(gg, it) {
          if (!gg.buy(it)) return; const w = gg.player.weapon; w.reforged = (w.reforged || 0) + 1;
          const nw = ED.items.rollWeapon(new ED.RNG(gg.run.seed + ':reforge' + gg.frame), Math.max(gg.floorNum, w.lvl || 1), { type: w.type, rarity: w.rarity });
          w.affixes = nw.affixes; w.name = nw.name; ED.items.recalc(gg.player); gg.burst(it.x, it.y, 24, '#c78bff', 4, 26); gg.sfx('shrine'); gg.toast('Reforged: ' + w.name, '#c78bff');
        } });
      g.addInter({ type: 'anvil', x: 660, y: 270, r: 20, range: 56, name: 'Temper Armor', color: '#8fc4ff',
        desc: () => '+12% defense on every equipped piece.', price: () => pr(28, ['helmet', 'chest', 'boots'].reduce((s, k) => s + ((g.player.armor[k] || {}).upg || 0), 0) / 2),
        use(gg, it) {
          const eq = ['helmet', 'chest', 'boots'].map(k => gg.player.armor[k]).filter(Boolean);
          if (!eq.length) { gg.sfx('deny'); gg.toast('You wear no armor to temper', '#ff9a6a'); return; }
          if (!gg.buy(it)) return; for (const a of eq) { a.upg = (a.upg || 0) + 1; a.def *= 1.12; }
          ED.items.recalc(gg.player); gg.burst(it.x, it.y, 20, '#8fc4ff', 4, 24); gg.sfx('thud'); gg.toast('Armor tempered', '#8fc4ff');
        } });
    },
    onEnter(g) { g.toast('The blacksmith will improve your gear — for a price.', '#ff9a3c', 120); },
  };

  S.secret = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      const rng = rt.rng.fork('secret');
      const o = ED.items.rollOffers(rng, g.floorNum, 1, { luck: g.player.st.luck + 2, relics: g.player.relics, minRank: 2 })[0];
      g.pedestal(o, 480, 250, {});
      g.dropGold(480, 340, 14 + g.floorNum * 2);
      g.dropPickup('heart', 420, 340, 4, { still: true }); g.dropPickup('bomb', 540, 340, 1, { still: true });
      keyAltars(g, room, 420);
    },
    onEnter(g) { g.toast('A secret stash!', '#c78bff', 120); },
  };

  // ------------------------------------------------------------------ negative rooms
  S.ambush = {
    setup(g, room, rt) {
      g.addInter({ type: 'chest', x: 480, y: 270, r: 22, range: 60, color: '#e8c24a', decoy: true, prompt: () => 'Open chest', use(gg, it) {
        it.dead = true; rt.ambushRevealed = true; room.revealedType = 'ambush';
        gg.toast('IT\'S AN AMBUSH!', '#ff3b3b', 140); gg.shake(10); gg.sfx('bossroar'); gg.flashScreen('#ff0000', 0.3);
        const F = gg.floorNum, rng = rt.rng.fork('ambush');
        const waves = D.composeWaves(F, rng, { eliteMult: 0, noElite: true, budgetMult: 0.85, waveBonus: 0 });
        const nEl = Math.round(D.at(F).ambushElites);
        const flat = waves[0]; while (flat.length < nEl) flat.push({ type: rng.pick(D.enemyPool(F).filter(t => !ED.enemyTypes[t].group)), elite: false, mods: [] });
        let made = 0; for (const e of flat) { if (made < nEl && !ED.enemyTypes[e.type].noElite) { D.makeElite(e, Math.max(F, 3), rng); made++; } }
        rt.enc = { state: 'warm', waves: [flat].concat(waves.length > 1 ? [waves[1]] : []), idx: 0, t: 0 };
      } });
    },
    onClear(g, room, rt) {
      const rng = rt.rng.fork('ambushreward');
      const o = ED.items.rollOffers(rng, g.floorNum, 1, { luck: g.player.st.luck + 2, relics: g.player.relics, minRank: 2 })[0];
      g.pedestal(o, 480, 270, {}); g.dropGold(480, 330, 10 + g.floorNum * 2); g.toast('The ambush is over. Take your due.', '#ffd24a');
      return false;
    },
  };
  S.trap = {
    setup(g, room, rt) {
      const F = g.floorNum, rng = rt.rng.fork('trap'), dens = D.at(F).trapDensity;
      const n = Math.min(20, Math.round(5 * dens));
      rt.traps = [];
      const doorDir = rt.dirs[0];
      const chestX = doorDir === 'W' ? 860 : doorDir === 'E' ? 100 : 480, chestY = doorDir === 'N' ? 500 : doorDir === 'S' ? 90 : 288;
      rt.chestPos = { x: chestX, y: chestY };
      const avoid = (x, y) => U.dist2(x, y, chestX, chestY) < 70 * 70 || (rt.dirs.some(d => { const c = ED.rooms.doorCenter(d); return Math.hypot(c.x - x, c.y - y) < 130; }));
      for (let i = 0; i < n; i++) {
        const kind = i % 3 === 0 ? 'saw' : i % 3 === 1 ? 'spikes' : 'turret';
        let x, y, tries = 0;
        do { x = rng.range(110, 850); y = rng.range(100, 480); tries++; } while (avoid(x, y) && tries < 30);
        if (kind === 'spikes') rt.traps.push({ kind, x, y, w: 64, h: 64, period: 150, ph: rng.int(0, 149), state: 0 });
        else if (kind === 'saw') rt.traps.push({ kind, x, y, x0: Math.max(80, x - 160), x1: Math.min(880, x + 160), v: 1.6 + Math.min(2, F * 0.08), dir: 1, r: 16 });
        else { const left = rng.chance(0.5); rt.traps.push({ kind, x: left ? 40 : 920, y: U.clamp(y, 90, 490), dirx: left ? 1 : -1, period: 110 - Math.min(40, F * 2), ph: rng.int(0, 99) }); }
      }
      g.addInter({ type: 'chest', x: chestX, y: chestY, r: 22, range: 60, color: '#e8c24a', prompt: () => 'Open the trapped treasure', use(gg, it) {
        it.dead = true; gg.sfx('pickup'); gg.burst(it.x, it.y, 24, '#ffd24a', 4, 26); room.cleared = rt.cleared = true;
        const o = ED.items.rollOffers(rt.rng.fork('trapr'), gg.floorNum, 2, { luck: gg.player.st.luck + 1, relics: gg.player.relics, minRank: 1 });
        gg.offerChoice(o, it.x, it.y + (chestY > 288 ? -60 : 60)); gg.dropGold(it.x, it.y, 12 + gg.floorNum * 2);
      } });
    },
    onEnter(g) { g.toast('A TRAP ROOM! Time your dashes.', '#ff7a3a', 130); },
    update(g, room, rt) {
      const p = g.player, ts = g.ts;
      for (const t of rt.traps) {
        if (t.kind === 'spikes') {
          const c = (g.frame + t.ph) % t.period; t.state = c < 70 ? 0 : c < 110 ? 1 : 2;
          if (t.state === 2 && p.x > t.x - t.w / 2 - 6 && p.x < t.x + t.w / 2 + 6 && p.y > t.y - t.h / 2 - 6 && p.y < t.y + t.h / 2 + 6) g.hurtPlayer(Math.round(3.5 * g.dif.enemyDmg), p.x, p.y - 12, { zone: true, noKnock: true, inv: 50 });
        } else if (t.kind === 'saw') {
          t.x += t.v * t.dir * ts; if (t.x > t.x1) t.dir = -1; if (t.x < t.x0) t.dir = 1; t.a = (t.a || 0) + 0.3;
          if (U.circleHit(t.x, t.y, t.r, p.x, p.y, p.hr)) g.hurtPlayer(Math.round(4 * g.dif.enemyDmg), t.x, t.y, { zone: true });
        } else {
          const c = (g.frame + t.ph) % t.period; t.charging = c > t.period - 28;
          if (c === 0) g.eShot({ x: t.x, y: t.y, shotDmg: 3 * g.dif.enemyDmg, projMul: 1 }, t.dirx > 0 ? 0 : Math.PI, 3.4, { r: 6, color: '#ffb04a', kind: 'bolt' });
        }
      }
    },
  };
  S.cursed = {
    setup(g, room, rt) {
      const F = g.floorNum, rng = rt.rng.fork('cursed');
      const o = ED.items.rollOffers(rng, F, 1, { luck: g.player.st.luck + 3, relics: g.player.relics, minRank: 3, kinds: { weapon: 3, armor: 3, relic: 4 } })[0];
      o.curse = rollCurse(rng, F);
      g.pedestal(o, 480, 270, { cursedItem: true });
      rt.dark = false;
    },
    onEnter(g) { g.toast('A CURSED room: great power, a price attached.', '#c040a0', 150); },
  };
  S.haunted = {
    setup(g, room, rt) {
      const F = g.floorNum, rng = rt.rng.fork('haunt');
      rt.dark = true;
      rt.enc = { state: 'idle', waves: D.composeWaves(F, rng, { budgetMult: 0.9, eliteMult: 0.5 }), idx: 0, t: 0, haunt: true };
    },
    onEnter(g, room, rt) { if (!room.cleared) g.toast('The room is haunted... foes flicker in and out.', '#b8c4ff', 160); },
    onClear(g, room, rt) {
      const rng = rt.rng.fork('hreward');
      const o = ED.items.rollOffers(rng, g.floorNum, 2, { luck: g.player.st.luck + 1, relics: g.player.relics, minRank: 1 });
      g.offerChoice(o, 480, 280); g.dropGold(480, 340, 12 + g.floorNum * 2);
      g.toast('The spirits leave their offering.', '#b8c4ff'); return false;
    },
  };

  // ------------------------------------------------------------------ gamble / mixed rooms
  const SHRINES = [
    { id: 'blood', name: 'Altar of Blood', color: '#ff4a5a', x: 300, table: { Blessing: 55, Relic: 8, Nothing: 27, Curse: 10 },
      cost: g => ({ hp: Math.max(4, Math.ceil(g.player.hp * 0.3)) }), costText: c => 'Sacrifice ' + c.hp + ' HP' },
    { id: 'gold', name: 'Altar of Gold', color: '#ffd24a', x: 480, table: { Blessing: 62, Relic: 10, Nothing: 18, Curse: 10 },
      cost: g => ({ gold: gp(g, 38) }), costText: c => 'Offer ' + c.gold + ' gold' },
    { id: 'life', name: 'Altar of Life', color: '#c05cff', x: 660, table: { Blessing: 58, Relic: 30, Nothing: 6, Curse: 6 },
      cost: g => ({ maxHp: 4 }), costText: c => 'Sacrifice 1 max heart' },
  ];
  S.shrine = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      for (const s of SHRINES) {
        g.addInter({ type: 'shrine', x: s.x, y: 260, r: 22, range: 60, color: s.color, def: s, used: false,
          name: s.name, odds: s.table, costObj: () => s.cost(g), costText: () => s.costText(s.cost(g)),
          use(gg, it) {
            if (it.used) return; const c = s.cost(gg), p = gg.player;
            if (c.gold !== undefined && p.gold < c.gold) { gg.sfx('deny'); gg.toast('Not enough gold', '#ff6a6a'); return; }
            if (c.hp !== undefined && p.hp <= c.hp) { gg.sfx('deny'); gg.toast('Too weak to bleed for the shrine', '#ff6a6a'); return; }
            if (c.maxHp !== undefined && p.maxHp - c.maxHp < 8) { gg.sfx('deny'); gg.toast('You have too little life to give', '#ff6a6a'); return; }
            if (c.gold !== undefined) p.gold -= c.gold; if (c.hp !== undefined) { p.hp -= c.hp; gg.addText(p.x, p.y - 20, '-' + c.hp, '#ff4a5a', 14); }
            if (c.maxHp !== undefined) { p.bonusHp -= c.maxHp; ED.items.recalc(p); }
            it.used = true; it.disabledLook = true; gg.sfx('shrine'); gg.ringFx(it.x, it.y, 10, 90, s.color, 28, 4);
            const out = weightedTable(rt.rng, s.table);
            if (out === 'Blessing') { const b = rt.rng.pick(BLESSINGS); gg.buffPlayer({ name: b.name, mods: b.mods }); if (b.heal) gg.healPlayer(b.heal); gg.toast('BLESSING: ' + b.name + ' — ' + b.desc, '#6ee07a', 200); gg.burst(p.x, p.y, 24, '#6ee07a', 4, 30); }
            else if (out === 'Relic') { const r = ED.items.rollRelic(rt.rng, gg.floorNum, { relics: p.relics, luck: p.st.luck, minRank: 1, noRisk: true }); gg.equipItem(r); gg.toast('The shrine grants a relic!', '#ffd24a', 160); }
            else if (out === 'Curse') { const cu = rollCurse(rt.rng, gg.floorNum); gg.cursePlayer(cu); gg.toast('CURSED: ' + cu.name + ' — ' + cu.desc, '#c040a0', 200); gg.sfx('curse'); gg.flashScreen('#6000a0', 0.3); }
            else { gg.toast('The shrine is silent. Nothing happens.', '#9a9ab0', 150); }
          } });
      }
    },
    onEnter(g) { g.toast('A shrine. Costs and odds are shown. Choose wisely.', '#4de0c8', 150); },
  };

  S.mystery = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      const hold = (room.holds || []).find(h => !h.got);
      const rng = rt.rng.fork('mystery'), F = g.floorNum;
      rt.chestState = { opened: false };
      g.addInter({ type: 'chest', mystery: true, x: 480, y: 270, r: 26, range: 64, color: '#e070ff', prompt: () => 'Open the mystery chest (?)', use(gg, it) {
        if (rt.chestState.opened) return; rt.chestState.opened = true; it.dead = true;
        const w = { great: 38, empty: hold ? 0 : 30, mimic: 28 + Math.min(14, F) };
        const out = weightedTable(rng, w);
        gg.sfx('pickup'); gg.burst(it.x, it.y, 24, '#e070ff', 4, 28);
        const reward = () => {
          const o = ED.items.rollOffers(rng.fork('mr'), F, 2, { luck: gg.player.st.luck + 2, relics: gg.player.relics, minRank: 2 });
          gg.offerChoice(o, 480, 270); gg.dropGold(480, 340, 14 + F * 2);
          (room.holds || []).filter(h => !h.got).forEach((h, i) => { h.got = true; gg.dropPickup('key', 460 + i * 40, 330, 1, { keyType: h.key, still: true }); gg.sfx('keydrop'); });
        };
        if (out === 'great') { gg.toast('JACKPOT! The chest overflows!', '#ffd24a', 150); reward(); }
        else if (out === 'empty') { gg.toast('The chest is empty... just dust.', '#9a9ab0', 150); gg.sfx('deny'); }
        else {
          gg.toast('MIMIC!', '#ff3b3b', 150); gg.shake(10); gg.sfx('bossroar'); gg.lockRoom(true);
          const m = gg.spawnEnemy('mimic', it.x, it.y, { elite: F >= 3, mods: F >= 3 ? ['brutal'] : [], hpMul: 1 + F * 0.05, silent: false });
          rt.mimic = m; rt.mimicReward = reward;
        }
      } });
    },
    update(g, room, rt) {
      if (rt.mimic && rt.mimic.dead && !rt.mimicDone) { rt.mimicDone = true; g.lockRoom(false); rt.mimicReward(); g.toast('The mimic drops its loot!', '#ffd24a'); }
    },
    onEnter(g) { g.toast('A mystery chest... great fortune, nothing, or teeth.', '#e070ff', 150); },
  };

  S.devil = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      const F = g.floorNum, rng = rt.rng.fork('devil');
      const o = ED.items.rollOffers(rng, F, 2, { luck: g.player.st.luck + 3, relics: g.player.relics, minRank: 3, kinds: { weapon: 3, armor: 2, relic: 5, active: 1 } });
      g.pedestal(o[0], 400, 270, { price: { maxHp: 4 }, devil: true });
      if (o[1]) g.pedestal(o[1], 560, 270, { price: { maxHp: F >= 8 ? 8 : 4 }, devil: true });
    },
    onEnter(g) { g.toast("The Devil's Deal: power for a piece of your life.", '#ff2a3a', 150); },
  };

  S.challenge = {
    setup(g, room, rt) {
      const F = g.floorNum, rng = rt.rng.fork('challenge');
      rt.cleared = false; rt.dark = false;
      g.addInter({ type: 'altar', x: 480, y: 270, r: 24, range: 64, color: '#ffb02a', used: false, name: 'Challenge Altar',
        prompt: (gg, it) => it.used ? '' : 'Accept the challenge (tougher foes, +1 wave, big reward)',
        use(gg, it) {
          if (it.used) return; it.used = true; it.dead = true;
          const waves = D.composeWaves(F, rng, { waveBonus: 1, budgetMult: 1.35, eliteMult: 2.6 });
          rt.enc = { state: 'warm', waves, idx: 0, t: 0 };
          gg.toast('CHALLENGE ACCEPTED!', '#ffb02a', 120); gg.shake(8); gg.sfx('bossroar');
        } });
    },
    onEnter(g, room) { if (!room.cleared) g.toast('A challenge room. The fight is harder — the reward is richer.', '#ffb02a', 160); },
    onClear(g, room, rt) {
      const rng = rt.rng.fork('chreward');
      const o = ED.items.rollOffers(rng, g.floorNum, 3, { luck: g.player.st.luck + 2, relics: g.player.relics, minRank: 2 });
      g.offerChoice(o, 480, 270); g.dropGold(480, 340, 25 + g.floorNum * 3); g.dropPickup('heart', 380, 340, 4);
      g.toast('Challenge complete! Choose a reward.', '#ffd24a', 160); return false;
    },
  };

  S.gambling = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      const rng = rt.rng.fork('gamble');
      rt.gamble = { rolls: 0, max: 7 };
      const OUT = [{ n: 'Bust', m: 0, w: 50, c: '#ff6a6a' }, { n: 'Push', m: 1, w: 22, c: '#c8c8d8' }, { n: 'Double', m: 2, w: 20, c: '#6ee07a' }, { n: 'Triple', m: 3, w: 6, c: '#4aa3ff' }, { n: 'JACKPOT x8', m: 8, w: 2, c: '#ffd24a' }];
      rt.odds = OUT;
      [10, 25, 55].forEach((b, i) => {
        g.addInter({ type: 'dice', x: 340 + i * 140, y: 280, r: 22, range: 60, color: '#f0f0f0', bet: b, name: 'Bet ' + gp(g, b) + ' gold', odds: OUT,
          price: () => gp(g, b),
          use(gg, it) {
            const p = gg.player, bet = gp(gg, b);
            if (rt.gamble.rolls >= rt.gamble.max) { gg.toast('The table is closed.', '#9a9ab0'); return; }
            if (p.gold < bet) { gg.sfx('deny'); gg.toast('Not enough gold', '#ff6a6a'); return; }
            p.gold -= bet; rt.gamble.rolls++; gg.sfx('gamble');
            let r = rng.next() * 100, out = OUT[0]; for (const o of OUT) { r -= o.w; if (r < 0) { out = o; break; } }
            const win = bet * out.m; if (win > 0) { p.gold += win; gg.sfx('coin'); gg.burst(it.x, it.y, out.m >= 3 ? 30 : 12, '#ffd24a', 4, 28); }
            gg.toast(out.n + (win ? '  +' + win + ' gold' : '  -' + bet + ' gold'), out.c, 140);
            gg.addText(it.x, it.y - 30, out.n, out.c, 16);
            if (out.m >= 8) { gg.flashScreen('#ffd24a', 0.3); gg.sfx('levelup'); }
          } });
      });
    },
    onEnter(g) { g.toast('The gambling table. Odds are posted. The house is... close to fair.', '#f0f0f0', 160); },
  };

  // ------------------------------------------------------------------ mini boss + boss rooms (flavour)
  S.miniboss = { onEnter(g, room, rt) { if (!room.cleared) g.toast('Mini boss! The doors seal behind you.', '#e0523a', 100); } };
  S.boss = { onEnter(g, room, rt) { if (!room.cleared) g.toast('The doors seal. There is no turning back.', '#ff3b4a', 120); } };

  // ------------------------------------------------------------------ puzzles (switch locks)
  S.setupPuzzle = function (g, room, rt) {
    const pz = room.puzzle, rng = rt.rng.fork('puzzle');
    const spots = [];
    const cand = rt.spawnTiles.filter(t => t.tx > 3 && t.tx < 26 && t.ty > 3 && t.ty < 14 && !rt.props.some(pr => !pr.dead && Math.hypot(pr.x - t.x, pr.y - t.y) < 44));   // never under a pot
    let guard = 0;
    while (spots.length < pz.n && guard++ < 200 && cand.length) {
      const t = cand[rng.int(0, cand.length - 1)];
      if (spots.every(s => U.dist2(s.x, s.y, t.x, t.y) > 150 * 150)) spots.push(t);
    }
    if (spots.length < pz.n) { for (const t of cand) { if (spots.length >= pz.n) break; if (!spots.includes(t)) spots.push(t); } }
    pz.n = Math.min(pz.n, spots.length);
    const lock = g.floor.edges.map(e => e.lock).find(l => l && l.id === pz.lockId);
    if (lock) lock.params.n = pz.n;
    rt.puzzleObjs = [];
    for (const s of spots) {
      if (pz.kind === 'plates') rt.puzzleObjs.push(g.addInter({ type: 'plate', x: s.x, y: s.y, r: 18, range: 0, pressed: false, color: '#5be37d', update(gg, it) { if (it.pressed) return; const p = gg.player; if (Math.hypot(p.x - it.x, p.y - it.y) < 20 || gg.enemies.some(e => !e.dead && Math.hypot(e.x - it.x, e.y - it.y) < 18)) { it.pressed = true; gg.sfx('unlockdoor'); gg.burst(it.x, it.y, 10, '#5be37d', 3, 18); } } }));
      else { const pr = { kind: 'prop', type: 'brazier', x: s.x, y: s.y, r: 13, hp: 1, solid: true, dead: false, lit: false, seed: Math.random() }; g.props.push(pr); rt.puzzleObjs.push(pr); }
    }
  };
  S.updatePuzzle = function (g, room, rt) {
    const pz = room.puzzle; if (pz.done || !rt.puzzleObjs) return;
    const n = rt.puzzleObjs.filter(o => o.pressed || o.lit).length;
    pz.progress = n;
    if (n >= pz.n) {
      pz.done = true;
      const lock = g.floor.edges.map(e => e.lock).find(l => l && l.id === pz.lockId);
      if (lock) { lock.opened = true; const mr = g.floor.rooms[lock.room]; if (mr) mr.discovered = true; }
      g.toast('A distant door unseals!', '#5be37d', 180); g.sfx('unlockdoor'); g.shake(5); g.flashScreen('#5be37d', 0.2);
    }
  };

  // ------------------------------------------------------------------ Game helpers used by rooms
  const H = {
    buy(it) {
      const price = typeof it.price === 'function' ? it.price() : (it.price && it.price.gold) || 0;
      if (this.player.gold < price) { this.sfx('deny'); this.toast('Not enough gold (' + price + ')', '#ff6a6a'); return false; }
      this.player.gold -= price; this.sfx('buy'); this.burst(it.x, it.y, 10, '#ffd24a', 3, 20);
      return true;
    },
    /** keys beyond what this floor still needs (those may be sold) */
    spareKeys() {
      const p = this.player, need = { small: 0, mb: 0 };
      for (const e of this.floor.edges) if (e.lock && !e.lock.opened) { const t = ED.keys.LOCKS[e.lock.type]; if (t.key && need[t.key] !== undefined) need[t.key]++; }
      return { small: Math.max(0, p.keys.small - need.small), mb: Math.max(0, p.keys.mb - need.mb) };
    },
    floorCleared() { return this.floor.rooms.every(r => (r.type !== 'normal' && r.type !== 'start') || r.cleared || r.type === 'start'); },
  };
  ED.mixins.push(H);
})(typeof globalThis !== 'undefined' ? globalThis : this);

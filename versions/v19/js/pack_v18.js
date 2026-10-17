/* EMBERDEEP — pack_v18.js : v18 "WORLDS II" — five more lands behind the doors of v17.
 *
 *  THE CLOCKWORK ORRERY   crushers fall on the beat, time wells slow everything that wanders in          door: a brass sigil (Gear)
 *  THE GILDED VAULT       bait coins that bite, a toll for a door, foes that live on your gold            door: a toll of gold
 *  THORNWOOD HOLLOW       briars creep over the floor while you fight; fire clears them                    door: you must carry an Ember Seed
 *  THE MIRROR HALLS       your own shade walks a little behind you and hurts whatever it touches          door: a flawless guardian fight
 *  THE SKY BRIDGE         planks that give way, gusts, and things that carry you off                      door: you must carry a Storm Feather
 *  Each land has its own palette, rule, four foes with behaviours the game did not have, an elite trait, a mini boss with a signature relic and a mood in the music.
 *  They are reached through the roads of v17 (the registry is core: js/worlds.js) — without v17 they have no door.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds, A = ED.ai;
  const TAU = U.TAU, V = 'v18';
  const L = (name, o) => [name, o];

  P.define({
    id: 'v18', name: 'WORLDS II', tag: 'five more lands, five more doors', color: '#e8c060',
    blurb: 'Five new lands behind the doors of v17 (it needs v17 to be reachable): the Clockwork Orrery, the Gilded Vault, Thornwood Hollow, the Mirror Halls and the Sky Bridge — each with a rule, four new foes, an elite trait, a mini boss and a signature relic.',
  });

  const dmgOf = (g, k) => k * g.dif.enemyDmg;
  const eyes = (c, e, spread) => {
    const a = e.face || 0, d = e.r * 0.35, s = Math.max(1.5, e.r * 0.2);
    for (const sg of [-1, 1]) {
      const ex = e.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * sg * e.r * spread, ey = e.y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * sg * e.r * spread;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, s, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(ex + Math.cos(a) * s * 0.4, ey + Math.sin(a) * s * 0.4, s * 0.5, 0, TAU); c.fill();
    }
  };
  const glow = (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); };
  const mk = (world) => (o) => Object.assign({ pack: V, contact: true, world }, o);
  const clash = (what, id) => (ED.collisions = ED.collisions || []).push(what + ' ' + id);
  const register = (table) => { for (const id in table) { if (ED.enemyTypes[id]) clash('foe', id); table[id].id = id; ED.enemyTypes[id] = table[id]; } };
  const relic = (key, def) => I.addRelic(key, Object.assign({ pack: V, mods: {} }, def));
  const mini = (def) => { if (ED.minibosses.defs[def.id]) clash('mini boss', def.id); ED.minibosses.defs[def.id] = Object.assign({ pack: V, contact: 4 }, def); };
  const mod = (def) => { if (ED.mods[def.id]) clash('elite trait', def.id); ED.mods[def.id] = Object.assign({ pack: V }, def); };
  /** inside any radius of a list of discs? */
  const within = (list, x, y, pad) => list.some(w => Math.hypot(x - w.x, y - w.y) < w.r + (pad || 0));

  // ==================================================================== 1. THE CLOCKWORK ORRERY
  //  Gears keep the hour.  Crusher lanes slam on a beat (they hurt foes too: lure them); time wells slow everything inside — you, and your enemies.
  const ORR = {
    setup(g, room, rt, rng, wi) {
      rt.wells = W.spots(rt, rng, wi.depth >= 3 ? 2 : 1, 280).map(s => ({ x: s.x, y: s.y, r: 78 }));
      const horiz = rng.chance(0.5), n = wi.depth >= 2 ? 2 : 1; rt.lanes = [];
      for (let k = 0; k < n; k++) rt.lanes.push({ horiz, c: (horiz ? (n === 1 ? 288 : 176 + k * 232) : (n === 1 ? 480 : 300 + k * 360)) + rng.int(-22, 22), t: 160 + k * 125 });
    },
    tick(g, rt, wi) {
      const p = g.player;
      if (within(rt.wells, p.x, p.y)) p.slowT = Math.max(p.slowT || 0, 3);
      if (g.frame % 4 === 0) for (const e of g.enemies) if (!e.dead && !e.boss && !e.big && within(rt.wells, e.x, e.y, e.r)) g.applyStatus(e, 'slow', { t: 10, f: 0.5 });
      if (!rt.lockdown) return;
      for (const Ln of rt.lanes) {
        if (--Ln.t > 0) continue; Ln.t = 250 - wi.depth * 14;
        const th = 56, x = Ln.horiz ? 34 : Ln.c - th / 2, y = Ln.horiz ? Ln.c - th / 2 : 58, w = Ln.horiz ? 892 : th, h = Ln.horiz ? th : 460;
        g.zoneRect(null, x, y, w, h, g.tele(58), dmgOf(g, 1.7), { color: '#e8c060', burst: false, onEnd: (gg) => {
          gg.shake(5); gg.sfx('thud', { vol: 0.6 }); gg.burst(x + w / 2, y + h / 2, 10, '#e8c060', 3, 20);
          for (const e of gg.enemies) if (!e.dead && !e.boss && !e.big && e.x + e.r > x && e.x - e.r < x + w && e.y + e.r > y && e.y - e.r < y + h) gg.damageEnemy(e, e.maxHp * 0.35, { src: 'zone', x: e.x, y: e.y, noProc: true, noKb: true, color: '#e8c060' });
        } });
      }
    },
    under(g, c, t, rt) {
      c.save();
      for (const Ln of rt.lanes || []) { c.strokeStyle = 'rgba(232,192,96,0.22)'; c.lineWidth = 2; c.setLineDash && c.setLineDash([10, 8]); c.beginPath(); if (Ln.horiz) { c.moveTo(34, Ln.c); c.lineTo(926, Ln.c); } else { c.moveTo(Ln.c, 58); c.lineTo(Ln.c, 518); } c.stroke(); c.setLineDash && c.setLineDash([]); }
      for (const w of rt.wells || []) {
        c.fillStyle = 'rgba(120,150,255,0.10)'; c.beginPath(); c.arc(w.x, w.y, w.r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(160,190,255,0.5)'; c.lineWidth = 2; c.beginPath(); c.arc(w.x, w.y, w.r, 0, TAU); c.stroke();
        for (let k = 0; k < 12; k++) { const a = k * TAU / 12; c.beginPath(); c.moveTo(w.x + Math.cos(a) * (w.r - 8), w.y + Math.sin(a) * (w.r - 8)); c.lineTo(w.x + Math.cos(a) * w.r, w.y + Math.sin(a) * w.r); c.stroke(); }
        const a1 = t * 0.01, a2 = t * 0.0008; c.lineWidth = 3; c.beginPath(); c.moveTo(w.x, w.y); c.lineTo(w.x + Math.cos(a1) * w.r * 0.8, w.y + Math.sin(a1) * w.r * 0.8); c.stroke(); c.beginPath(); c.moveTo(w.x, w.y); c.lineTo(w.x + Math.cos(a2) * w.r * 0.5, w.y + Math.sin(a2) * w.r * 0.5); c.stroke();
      }
      c.restore();
    },
  };
  const f1 = mk('orrery');
  register({
    cogwalker: f1({ name: 'Cogwalker', shape: 'hex', color: '#d8b050', r: 12, hp: 15, speed: 2.3, dmg: 3, shot: 3.5, cost: 1.8, weight: 12, minFloor: 6, group: 2,
      desc: 'Moves in ratcheting steps — a burst, a pause, a burst. When it locks onto you it winds, then grinds: step out of the circle.',
      init(e) { e.cd = 40; e.ph = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 70 / e.rate; } return; }
        e.ph = (e.ph + g.ts) % 30; if (e.ph < 9) A.chase(g, e, i, e.curSpeed * 1.9, 0);
        if (i.d < 46 && (e.cd -= g.ts) <= 0) { e.state = 'wind'; e.windup = g.tele(26); g.zoneCircle(e, e.x, e.y, 56, e.windup, e.shotDmg * 1.2, { color: '#e8c060', burst: true, follow: true }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e, t) { c.strokeStyle = '#6a5018'; c.lineWidth = 2; const a0 = Math.floor((t || 0) / 10) * 0.4; for (let k = 0; k < 6; k++) { const a = a0 + k * TAU / 6; c.beginPath(); c.moveTo(e.x + Math.cos(a) * e.r * 0.4, e.y + Math.sin(a) * e.r * 0.4); c.lineTo(e.x + Math.cos(a) * e.r * 0.95, e.y + Math.sin(a) * e.r * 0.95); c.stroke(); } c.fillStyle = '#3a2a08'; c.beginPath(); c.arc(e.x, e.y, e.r * 0.28, 0, TAU); c.fill(); } }),
    pendulum: f1({ name: 'Pendulum Post', shape: 'square', color: '#b89a58', r: 12, hp: 26, speed: 0, dmg: 2, shot: 3, cost: 2.4, weight: 8, minFloor: 7,
      desc: 'A post that cannot move and a weight on a chain that cannot stop swinging. The arc is steady: time your crossing, or break the post.',
      init(e, g) { e.base = Math.atan2(288 - e.y, 480 - e.x); e.ph = g.rng.next() * 6; e.len = 78; e.bcd = 0; e.bx = e.x; e.by = e.y; },
      update(e, g) {
        e.ph += 0.05 * g.ts; const a = e.base + Math.sin(e.ph) * 1.35, p = g.player; e.bx = e.x + Math.cos(a) * e.len; e.by = e.y + Math.sin(a) * e.len; e.face = a;
        if (e.bcd > 0) e.bcd -= g.ts; else if (!p.dead && U.circleHit(e.bx, e.by, 11, p.x, p.y, p.hr) && g.hurtPlayer(e.shotDmg, e.bx, e.by, { src: e, zone: true })) e.bcd = 36;
      },
      draw(c, e) { c.strokeStyle = '#5a4818'; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.bx, e.by); c.stroke(); c.fillStyle = '#c8a040'; c.beginPath(); c.arc(e.bx, e.by, 11, 0, TAU); c.fill(); c.strokeStyle = '#3a2a08'; c.lineWidth = 2; c.stroke(); } }),
    escapement: f1({ name: 'Escapement', shape: 'diamond', color: '#c8a040', r: 13, hp: 21, speed: 0, dmg: 2, shot: 2.6, cost: 2.2, weight: 8, minFloor: 7,
      desc: 'A turret that keeps time: tick, tick, tick — and on the fourth a fan of bolts at where you were standing. Move on the third.',
      init(e) { e.beat = 0; e.cd = 50; e.aim = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; if ((e.cd -= g.ts) > 0) return;
        e.cd = 38 / e.rate; e.beat = (e.beat + 1) % 6;
        if (e.beat === 3) { e.aim = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(e.aim) * 280, e.y + Math.sin(e.aim) * 280, 8, g.tele(30), 0, { color: '#e8c060', hurts: false }); g.sfx('telegraph', { vol: 0.4 }); }
        else if (e.beat === 4) { const n = 3 + Math.min(2, Math.floor(g.dif.patternTier / 2)); for (let k = 0; k < n; k++) g.eShot(e, e.aim + (k - (n - 1) / 2) * 0.2, 3, { dmg: 1, color: '#ffd24a', r: 5 }); g.sfx('shoot'); }
        else g.sfx('ui', { vol: 0.2 });
      },
      draw(c, e) { for (let k = 0; k < 6; k++) { c.fillStyle = k <= e.beat ? '#ffd24a' : '#4a3a10'; c.fillRect(e.x - 15 + k * 5.5, e.y + e.r + 5, 4, 4); } } }),
    mainspring: f1({ name: 'Mainspring', shape: 'hex', color: '#d0a030', r: 14, hp: 30, speed: 0.9, dmg: 3.5, shot: 4, cost: 3.0, weight: 7, minFloor: 8,
      desc: 'Winds itself click by click — four turns of the key — then lets go: a roll that ricochets off the walls. Dash aside; it is dizzy afterwards.',
      init(e) { e.cd = 100; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; e.clicks = Math.min(4, Math.floor((1 - e.windup / e.windMax) * 4) + 1); if (e.windup > 14) e.rAng = i.ang; if (e.windup <= 0) { e.state = 'dash'; e.vx2 = Math.cos(e.rAng) * 7; e.vy2 = Math.sin(e.rAng) * 7; e.bounces = 0; e.sT = 150; g.sfx('lunge'); } return; }
        if (e.state === 'dash') { const m = ED.phys.move(g, e, e.vx2 * g.ts, e.vy2 * g.ts); if (m.bx) { e.vx2 = -e.vx2; e.bounces++; g.shake(2); } if (m.by) { e.vy2 = -e.vy2; e.bounces++; g.shake(2); } g.trailFx(e.x, e.y, '#e0b040', 0.5); if ((e.sT -= g.ts) <= 0 || e.bounces >= 3) { e.state = 'tired'; e.sT = 60; e.vuln = 1.4; g.burst(e.x, e.y, 10, '#e0b040', 3, 18); } return; }
        if (e.state === 'tired') { e.sT -= g.ts; if (e.sT <= 0) { e.state = null; e.vuln = 1; e.cd = 120 / e.rate; } return; }
        A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 300) { e.state = 'wind'; e.windMax = e.windup = g.tele(56); e.rAng = i.ang; e.clicks = 0; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 560, e.y + Math.sin(i.ang) * 560, 26, e.windup, 0, { color: '#e0b040', hurts: false }); g.sfx('telegraph', { vol: 0.5 }); }
      },
      draw(c, e, t) { if (e.state === 'wind') { c.strokeStyle = '#fff2b0'; c.lineWidth = 3; const a = (e.clicks || 0) * 1.57; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + Math.cos(a) * e.r * 0.8, e.y + Math.sin(a) * e.r * 0.8); c.stroke(); } else if (e.state === 'tired') { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('DIZZY', e.x, e.y - e.r - 6); } eyes(c, e, 0.4); } }),
  });
  mod({ id: 'overwound', name: 'Overwound', color: '#ffd24a', glyph: '⟳', desc: 'Every few seconds it runs at double time',
    update(e, g) { const on = (e.t % 270) > 205; e.spdMul *= on ? 1.8 : 1; e.rate = (e.rate0 || 1) * (on ? 1.8 : 1); e.overwound = on; } });
  mini({ id: 'clockmaker', name: 'The Clockmaker', title: 'Who Winds the Hours', color: '#e8c060', r: 26, hp: 205, arena: 'arena_grid', shape: 'sentry', minFloor: 6, unlockText: 'Brass Cog',
    attacks: { gears: L('spiral', { arms: 4, frames: 80, speed: 2.2, color: '#ffd24a' }), tick: L('radial', { n: 14, reps: 3, gap: 12, speed: 2.4, rot: 0.2, color: '#ffd24a' }), crush: L('bars', { n: 3, thick: 46, gapW: 160, warn: 66, color: '#e8c060' }), crushV: L('bars', { n: 3, thick: 46, gapW: 160, warn: 66, vertical: true, color: '#e8c060' }),
      springs: L('rain', { n: 8, r: 44, warn: 46, interval: 7, aimed: 0.7, color: '#ffd24a' }), cogs: L('summon', { types: ['cogwalker'], n: 2, max: 4, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'Escapement', attacks: ['tick', 'gears', 'cogs'], idle: [32, 52] }, { at: 0.5, name: 'Mainspring', attacks: ['crush', 'crushV', 'gears', 'springs', 'cogs'], idle: [24, 42] }] });
  relic('brasscog', { id: 'brasscog', name: 'Brass Cog', rarity: 'rare', color: '#e8c060', mods: { atkSpd: 0.1, dashCd: -0.1 }, max: 2, unlock: 'mini:clockmaker', desc: 'Quicker hands, a quicker dash. (Unlockable)' });
  W.add({ id: 'orrery', name: 'The Clockwork Orrery', short: 'CLOCKWORK ORRERY', color: '#e8c060', pack: V, native: 6, tiers: [1, 99], risk: 0, gate: { kind: 'sigil', id: 'gear' },
    rule: 'Gears keep the hour. Crushers fall on the beat, and the time wells slow everything that wanders in — you, and whoever you are fighting.',
    enemies: ['cogwalker', 'pendulum', 'escapement', 'mainspring'], mod: 'overwound', minis: ['clockmaker'], hz: ORR, music: { scale: 3, root: 43, bpm: 10, prog: [0, 3, 5, 3] },
    theme: { name: 'The Clockwork Orrery', floorA: '#2a2620', floorB: '#302b24', wall: '#5a4a30', wallTop: '#c8a850', accent: '#e8c060', glow: '#fff0a0', fog: '#14100a' } });

  // ==================================================================== 2. THE GILDED VAULT
  //  Gold lies in the open and every coin is a lie: a pile with a red ring pays triple, then the floor under it bites.  Foes here live on what you carry.
  ED.pickupImpl.baitcoin = {
    collect(g, k) { g.giveGold(k.val * 3); g.sfx('coin'); g.zoneCircle(null, k.x, k.y, 52, g.tele(30), dmgOf(g, 1.5), { color: '#ffd24a', burst: true }); g.addText(k.x, k.y - 24, 'TRAPPED!', '#ff6a4a', 13); return true; },
    draw(c, k, t, bob) { glow(c, k.x, k.y, 20, '#ffd24a', 0.25); c.fillStyle = '#ffd24a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(k.x + (i - 1.5) * 4, k.y + bob + (i % 2) * 3, 5, 3, 0, 0, TAU); c.fill(); } c.strokeStyle = 'rgba(255,90,60,' + (0.3 + 0.25 * Math.sin(t * 0.12)) + ')'; c.lineWidth = 1.6; c.beginPath(); c.arc(k.x, k.y, 15, 0, TAU); c.stroke(); },
  };
  const VAULT = {
    setup(g, room, rt, rng, wi) { rt.baits = W.spots(rt, rng, 3 + (wi.depth > 2 ? 1 : 0), 130); for (const s of rt.baits) g.dropPickup('baitcoin', s.x, s.y, 6 + Math.round(g.floorNum * 0.6), { still: true }); },
  };
  const f2 = mk('vault');
  register({
    trapsmith: f2({ name: 'Trapsmith', shape: 'tri', color: '#c8b070', r: 11, hp: 16, speed: 1.0, dmg: 2, shot: 3, cost: 2.0, weight: 11, minFloor: 6,
      desc: 'Keeps its distance and sets spike patches at your feet — they arm after a heartbeat and stay a while. Keep moving.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 50); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'set') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 150 / e.rate; if (g.rt && g.room.rt === g.rt) W.swapTiles(g, g.rt, W.tilesNear(g, e.tx, e.ty, 46), T.SPIKE, 560); g.sfx('crack', { vol: 0.4 }); g.burst(e.tx, e.ty, 10, '#c8b070', 3, 18); } return; }
        A.kite(g, e, i, 230, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0) { e.state = 'set'; e.windup = g.tele(36); e.tx = U.clamp(p.x + (p.vx || 0) * 9, 70, 890); e.ty = U.clamp(p.y + (p.vy || 0) * 9, 70, 506); g.zoneCircle(e, e.tx, e.ty, 46, e.windup, 0, { color: '#ff6a4a', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      }, draw(c, e) { eyes(c, e, 0.45); } }),
    tollkeeper: f2({ name: 'Tollkeeper', shape: 'square', color: '#d8b64a', r: 15, hp: 34, speed: 0, dmg: 3, shot: 3, cost: 3.0, weight: 8, minFloor: 7,
      desc: 'Stands its ground and sends out a ring that takes a tenth of your gold instead of your health — if you have any. Kill it and the toll comes back with interest.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); e.bank = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') {
          e.windup -= g.ts;
          if (e.windup <= 0) {
            e.state = null; e.cd = 190 / e.rate; g.sfx('lunge', { vol: 0.5 });
            g._zone({ kind: 'ring', shape: 'ring', x: e.x, y: e.y, r: e.r, w: 22, speed: 3, maxR: 340, dmg: 0, hurts: false, src: e, color: '#ffd24a', gaps: [{ a: i.ang + Math.PI * (g.rng.chance(0.5) ? 0.5 : -0.5), w: 0.8 }],
              upd(gg, z) { const p = gg.player; if (z.taxed || p.dead || p.inv > 0 || (p.dashT > 0 && p.dashIframes > 0) || !ED.zoneHits(z, p.x, p.y, p.hr)) return; z.taxed = true;
                if (p.gold >= 6) { const n = U.clamp(Math.round(p.gold * 0.1), 6, 60); p.gold -= n; e.bank += n; p.inv = Math.max(p.inv, 24); gg.addText(p.x, p.y - 24, '-' + n + 'g', '#ffd24a', 15); gg.sfx('deny'); gg.burst(p.x, p.y, 8, '#ffd24a', 3, 18); }
                else gg.hurtPlayer(e.shotDmg * 0.8, e.x, e.y, { src: e, zone: true }); } });
          }
          return;
        }
        if (e.rush) A.chase(g, e, i, 0.9 * g.dif.enemySpeed * e.spdMul, 0);
        if ((e.cd -= g.ts) <= 0) { e.state = 'wind'; e.windup = g.tele(34); g.zoneCircle(e, e.x, e.y, 60, e.windup, 0, { color: '#ffd24a', hurts: false, burst: false, follow: true }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      onDeath(e, g) { if (e.bank > 0) { const n = Math.round(e.bank * 1.25); g.dropGold(e.x, e.y, n); g.toast('The toll comes back: ' + n + ' gold!', '#ffd24a', 120); } },
      draw(c, e) { c.fillStyle = '#3a2a08'; c.fillRect(e.x - e.r * 0.5, e.y - e.r * 0.15, e.r, e.r * 0.3); c.fillStyle = '#ffd24a'; c.fillRect(e.x - e.r * 0.35, e.y - e.r * 0.07, e.r * 0.7, e.r * 0.14); if (e.bank) { c.fillStyle = '#ffd24a'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText(e.bank + 'g', e.x, e.y - e.r - 5); } } }),
    gleaner: f2({ name: 'Gleaner', shape: 'diamond', color: '#e8d890', r: 8, hp: 8, speed: 1.9, dmg: 2, cost: 1.3, weight: 12, minFloor: 6, group: 2, flying: true,
      desc: 'A magpie of a thing: it eats the gold you have not picked up yet and grows on it. Kill it and everything it swallowed spills out.',
      init(e) { e.ate = 0; e.baseHp = e.maxHp; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; let tgt = null, bd = 1e9;
        for (const k of g.pickups) if (!k.dead && k.type === 'gold') { const d = U.dist2(e.x, e.y, k.x, k.y); if (d < bd) { bd = d; tgt = k; } }
        if (tgt && bd < 420 * 420) {
          A.walk(g, e, Math.atan2(tgt.y - e.y, tgt.x - e.x), e.curSpeed * 1.2);
          if (bd < 14 * 14) { tgt.dead = true; e.ate += tgt.val; if (e.maxHp < e.baseHp * 1.8) { e.maxHp *= 1.05; e.hp += e.maxHp * 0.05; } g.addText(e.x, e.y - e.r - 6, '+', '#ffd24a', 12); g.sfx('coin', { vol: 0.3 }); }
        } else A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.12 + e.seed) * 0.7);
      },
      onDeath(e, g) { if (e.ate > 0) g.dropGold(e.x, e.y, e.ate); },
      draw(c, e) { if (e.ate) { c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(e.x, e.y + 2, Math.min(5, 2 + e.ate * 0.08), 0, TAU); c.fill(); } } }),
    gildedbrute: f2({ name: 'Gilded Brute', shape: 'circle', color: '#e0b840', r: 16, hp: 40, speed: 0.85, dmg: 4, shot: 4, cost: 3.2, weight: 7, minFloor: 8,
      desc: 'Gold-plated and slow. Its plating grows back every time you pick up a coin: fight it with your pockets shut, or finish it before the floor is picked clean.',
      init(e, g) { e.ward = e.maxHp * 0.5; e.lg = g.run.goldEarned; e.cd = 110; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; const gain = g.run.goldEarned - e.lg;
        if (gain > 0) { e.lg = g.run.goldEarned; e.ward = Math.min(e.maxHp * 0.6, e.ward + gain * 0.8 + 2); }
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 170 / e.rate; g.shockRing(e, e.x, e.y, 3, 20, 300, e.shotDmg * 0.7, { color: '#ffd24a', r0: e.r }); g.shake(4); g.sfx('thud'); } return; }
        A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 190) { e.state = 'wind'; e.windup = g.tele(34); g.zoneCircle(e, e.x, e.y, 64, e.windup, 0, { color: '#ffd24a', hurts: false, burst: false, follow: true }); g.sfx('telegraph', { vol: 0.4 }); }
      }, draw(c, e) { eyes(c, e, 0.4); } }),
  });
  mod({ id: 'covetous', name: 'Covetous', color: '#ffd24a', glyph: '$', desc: 'Hits harder the more gold you carry (up to +40%)',
    update(e, g) { if (e.cv0 === undefined) { e.cv0 = e.dmg; e.cv1 = e.shotDmg; } const k = 1 + Math.min(0.4, g.player.gold / 1500); e.dmg = e.cv0 * k; e.shotDmg = e.cv1 * k; } });
  mini({ id: 'vaultkeeper', name: 'The Vault Keeper', title: 'Who Counts What You Carry', color: '#ffd24a', r: 28, hp: 220, arena: 'arena_cross', shape: 'golem', minFloor: 7, unlockText: "Appraiser's Loupe",
    attacks: { grid: L('bars', { n: 3, thick: 46, gapW: 165, warn: 66, color: '#ffd24a' }), coins: L('rain', { n: 9, r: 42, warn: 48, interval: 7, aimed: 0.7, color: '#ffd24a' }), slam: L('slamRing', { r: 90, tele: 36, rings: 2, speed: 3, color: '#ffd24a' }), thieves: L('summon', { types: ['gleaner'], n: 2, max: 4, hpMul: 0.8 }), vol: L('fan', { n: 5, spread: 0.26, reps: 2, speed: 2.8, color: '#ffe070' }) },
    phases: [{ at: 1, name: 'Audit', attacks: ['slam', 'vol', 'thieves'], idle: [32, 54] }, { at: 0.5, name: 'Foreclosure', attacks: ['grid', 'coins', 'slam', 'thieves', 'vol'], idle: [24, 42] }] });
  relic('loupe', { id: 'loupe', name: "Appraiser's Loupe", rarity: 'rare', color: '#ffd24a', mods: { gold: 0.15, luck: 1, crit: 0.03 }, max: 2, unlock: 'mini:vaultkeeper', desc: 'Gold counts for more, luck smiles a little, a keener eye for weak points. (Unlockable)' });
  W.add({ id: 'vault', name: 'The Gilded Vault', short: 'GILDED VAULT', color: '#ffd24a', pack: V, native: 6, tiers: [2, 99], risk: 3, gate: { kind: 'cost', gold: 90, goldPer: 9 },
    rule: 'Gold lies in the open and every coin is a lie. The Vault takes more than it gives — and what it gives, it gives richly.',
    enemies: ['trapsmith', 'tollkeeper', 'gleaner', 'gildedbrute'], mod: 'covetous', minis: ['vaultkeeper'], hz: VAULT, music: { scale: 1, root: 41, bpm: -4, prog: [0, 4, 5, 3] },
    theme: { name: 'The Gilded Vault', floorA: '#1c1a16', floorB: '#221f1a', wall: '#4a3f22', wallTop: '#d8b64a', accent: '#ffd24a', glow: '#fff0a0', fog: '#0e0c06' } });

  // ==================================================================== 3. THORNWOOD HOLLOW
  //  Briars creep over the floor while you fight: they slow and cut whoever lingers.  Bombs (and an Ember Seed in your pocket) burn them away.  They are never walls, so a room can always be finished.
  const BRIAR_CAP = 110;
  const briarsOf = (rt) => rt.briars || (rt.briars = new Set());
  const okBriar = (g, rt, i) => {
    const tx = i % C.COLS, ty = (i / C.COLS) | 0; if (tx < 2 || ty < 2 || tx > C.COLS - 3 || ty > C.ROWS - 3) return false;
    const t = g.room.tiles[i]; if (t !== T.FLOOR && t !== T.RUG) return false;
    for (const d of rt.dirs || []) { const z = ED.rooms.DOOR_CLEAR[d]; if (tx >= z[0] - 1 && tx <= z[2] + 1 && ty >= z[1] - 1 && ty <= z[3] + 1) return false; }
    return !(Math.abs(tx - 15) < 3.5 && Math.abs(ty - 9) < 2.5);
  };
  const growBriar = (g, rt, i) => { const B = briarsOf(rt); if (B.size >= BRIAR_CAP || B.has(i) || !okBriar(g, rt, i)) return false; B.add(i); return true; };
  const burnBriars = (g, rt, x, y, r) => { const B = briarsOf(rt); let n = 0; for (const i of Array.from(B)) { const bx = (i % C.COLS) * 32 + 16, by = ((i / C.COLS) | 0) * 32 + 16; if (Math.hypot(bx - x, by - y) < r) { B.delete(i); n++; if (n % 3 === 0) g.burst(bx, by, 4, '#ff8a4a', 2, 14); } } return n; };
  const THORN = {
    setup(g, room, rt, rng, wi) {
      for (let patch = 0, tries = 0; patch < 2 && tries < 80 && rt.spawnTiles.length; tries++) {
        const s = rt.spawnTiles[rng.int(0, rt.spawnTiles.length - 1)], cx = s.tx, cy = s.ty; if (!okBriar(g, rt, cy * C.COLS + cx)) continue; let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (rng.chance(0.8) && growBriar(g, rt, (cy + dy) * C.COLS + cx + dx)) n++;
        if (n >= 4) patch++;
      }
      rt.briarT = 380; const prev = rt.onExplode; rt.onExplode = (g2, x, y, r) => { if (prev) prev(g2, x, y, r); burnBriars(g2, rt, x, y, r + 22); };
    },
    tick(g, rt, wi) {
      const p = g.player, B = briarsOf(rt), here = (x, y) => B.has(Math.floor(y / 32) * C.COLS + Math.floor(x / 32));
      if (!p.dead && p.dashT <= 0 && here(p.x, p.y + 4)) { p.slowT = Math.max(p.slowT || 0, 5); rt.pt = (rt.pt || 0) + 1; if (rt.pt >= 50) { rt.pt = 0; g.hurtPlayer(dmgOf(g, 0.8), p.x, p.y, { zone: true, noKnock: true, inv: 34 }); } } else rt.pt = 0;
      if (g.frame % 4 === 0) for (const e of g.enemies) if (!e.dead && !e.boss && !e.big && !e.flying && !e.thorny && here(e.x, e.y)) g.applyStatus(e, 'slow', { t: 10, f: 0.7 });
      if (g.run.cross && g.run.cross.carry.emberseed && g.frame % 6 === 0) burnBriars(g, rt, p.x, p.y, 52);       // the seed in your pocket: thorns recoil from it
      if (!rt.lockdown || B.size === 0) return;
      if (--rt.briarT <= 0) { rt.briarT = 300 - wi.depth * 24; const arr = Array.from(B), step = [1, -1, C.COLS, -C.COLS]; for (let k = 0; k < 2; k++) growBriar(g, rt, arr[(g.rng.next() * arr.length) | 0] + step[(g.rng.next() * 4) | 0]); }
    },
    under(g, c, t, rt) {
      const B = rt.briars; if (!B || !B.size) return; c.save(); c.lineCap = 'round';
      for (const i of B) {
        const x = (i % C.COLS) * 32, y = ((i / C.COLS) | 0) * 32; c.fillStyle = 'rgba(20,34,10,0.55)'; c.fillRect(x, y, 32, 32); c.strokeStyle = 'rgba(138,208,74,0.75)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + 3, y + 28); c.quadraticCurveTo(x + 14, y + 4 + (i % 5), x + 29, y + 24); c.moveTo(x + 5, y + 8); c.quadraticCurveTo(x + 16, y + 30 - (i % 4), x + 28, y + 6); c.stroke();
        c.fillStyle = '#c8e090'; c.fillRect(x + 9 + (i % 3) * 3, y + 12, 2, 4); c.fillRect(x + 20, y + 9 + (i % 4) * 3, 2, 4);
      }
      c.restore();
    },
  };
  const f3 = mk('thornwood');
  register({
    bramblehound: f3({ name: 'Bramble Hound', shape: 'circle', color: '#8a6a3a', r: 11, hp: 12, speed: 1.9, dmg: 3, cost: 1.6, weight: 12, minFloor: 6, group: 2, thorny: true,
      desc: 'Fast, and it brings the briars with it: every stride sows thorns. Keep to the clear ground — or burn the pack of them out.',
      update(e, g) { const i = A.info(g, e); e.face = i.ang; A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.14 + e.seed) * 0.5); if (g.rt && g.rt.hzOn && (e.t % 22) < g.ts) growBriar(g, g.rt, Math.floor(e.y / 32) * C.COLS + Math.floor(e.x / 32)); },
      draw(c, e) { c.strokeStyle = '#c8e090'; c.lineWidth = 1.5; for (let k = 0; k < 5; k++) { const a = e.face + Math.PI + (k - 2) * 0.5; c.beginPath(); c.moveTo(e.x + Math.cos(a) * e.r * 0.7, e.y + Math.sin(a) * e.r * 0.7); c.lineTo(e.x + Math.cos(a) * e.r * 1.25, e.y + Math.sin(a) * e.r * 1.25); c.stroke(); } eyes(c, e, 0.45); } }),
    rootling: f3({ name: 'Rootling', shape: 'hex', color: '#6a8a3a', r: 12, hp: 22, speed: 0, dmg: 2.5, shot: 3, cost: 2.2, weight: 9, minFloor: 7,
      desc: 'Planted in the ground. Roots race along the floor toward your feet; they bruise and tangle you into a crawl. Leave the line before it erupts.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'cast') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 160 / e.rate; } return; }
        if (e.rush) A.chase(g, e, i, 0.9 * g.dif.enemySpeed * e.spdMul, 0);
        if ((e.cd -= g.ts) <= 0) { e.state = 'cast'; e.windup = g.tele(40); const a = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(a) * 300, e.y + Math.sin(a) * 300, 24, e.windup, e.shotDmg, { color: '#8ad04a', burst: false, onEnd: (gg, z) => { for (let k = 1; k < 8; k++) gg.burst(z.x + (z.x2 - z.x) * k / 8, z.y + (z.y2 - z.y) * k / 8, 3, '#8ad04a', 2.5, 16); if (ED.zoneHits(z, gg.player.x, gg.player.y, gg.player.hr)) gg.player.slowT = Math.max(gg.player.slowT || 0, 150); } }); g.sfx('telegraph', { vol: 0.4 }); }
      }, draw(c, e) { c.strokeStyle = '#3a5a1a'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + Math.cos(a) * e.r * 1.5, e.y + Math.sin(a) * e.r * 1.5); c.stroke(); } eyes(c, e, 0.4); } }),
    vinelasher: f3({ name: 'Vinelasher', shape: 'tri', color: '#5a9a3a', r: 12, hp: 18, speed: 1.0, dmg: 3, shot: 3, cost: 2.3, weight: 8, minFloor: 8,
      desc: 'Lashes a vine across the room and reels you in. A dash breaks the grip — then it is yours to punish.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 60); e.pull = 0; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.pull > 0) {
          e.pull -= g.ts; e.px = p.x; e.py = p.y;
          if (p.dashT > 0 || p.dead) { e.pull = 0; g.toast('You tear free!', '#8ad04a', 60); }
          else { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d > e.r + p.r + 4) ED.phys.move(g, p, (e.x - p.x) / d * 5 * g.ts, (e.y - p.y) / d * 5 * g.ts); if (e.pull <= 0 || d <= e.r + p.r + 8) { e.pull = 0; g.zoneCircle(e, e.x, e.y, 46, g.tele(16), e.shotDmg * 1.1, { color: '#8ad04a', burst: true }); } }
          return;
        }
        if (e.state === 'lash') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 190 / e.rate; if (p.dashT <= 0 && !p.dead && U.segDist(p.x, p.y, e.x, e.y, e.lx, e.ly) < 20) { e.pull = 26; g.sfx('lunge'); g.addText(p.x, p.y - 26, 'GRABBED', '#8ad04a', 13); } } return; }
        A.kite(g, e, i, 190, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0 && i.d < 270 && i.d > 80 && A.clear(g, e.x, e.y, p.x, p.y, false)) { e.state = 'lash'; e.windup = g.tele(30); e.lx = e.x + Math.cos(i.ang) * 290; e.ly = e.y + Math.sin(i.ang) * 290; g.zoneLine(e, e.x, e.y, e.lx, e.ly, 18, e.windup, 0, { color: '#8ad04a', hurts: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { if (e.pull > 0) { c.strokeStyle = '#6ab04a'; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.px, e.py); c.stroke(); } eyes(c, e, 0.45); } }),
    thornback: f3({ name: 'Thornback', shape: 'blob', color: '#7a6a3a', r: 15, hp: 36, speed: 0.8, dmg: 4, shot: 2.5, cost: 3.0, weight: 7, minFloor: 8, thorny: true,
      desc: 'Slow and spined. Hit it hard in one blow and it answers with a fan of thorns; hit it often and lightly and it never notices.',
      init(e) { e.lastHp = e.hp; },
      update(e, g) { const i = A.info(g, e); e.face = i.ang; A.chase(g, e, i, e.curSpeed, 0); if (e.hp < e.lastHp - e.maxHp * 0.12 && !e.dead) { for (let k = 0; k < 5; k++) g.eShot(e, i.ang + (k - 2) * 0.28, 3, { dmg: 0.9, color: '#a0c050', r: 4 }); g.sfx('shoot', { vol: 0.5 }); } e.lastHp = e.hp; },
      draw(c, e) { c.strokeStyle = '#d8e8a0'; c.lineWidth = 1.5; for (let k = 0; k < 9; k++) { const a = e.face + Math.PI + (k - 4) * 0.4; c.beginPath(); c.moveTo(e.x + Math.cos(a) * e.r * 0.8, e.y + Math.sin(a) * e.r * 0.8); c.lineTo(e.x + Math.cos(a) * e.r * 1.35, e.y + Math.sin(a) * e.r * 1.35); c.stroke(); } eyes(c, e, 0.4); } }),
  });
  mod({ id: 'sowing', name: 'Sowing', color: '#8ad04a', glyph: '✿', desc: 'Dies in a patch of briars',
    onDeath(e, g) { const rt = g.rt; if (!rt || !rt.hzOn) return; const cx = Math.floor(e.x / 32), cy = Math.floor(e.y / 32); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) growBriar(g, rt, (cy + dy) * C.COLS + cx + dx); } });
  mini({ id: 'heartwood', name: 'The Heartwood', title: 'What the Hollow Grew Around', color: '#8ad04a', r: 30, hp: 215, arena: 'arena_round', shape: 'heartwood', minFloor: 6, unlockText: 'Thornwood Crown',
    attacks: { roots: L('vines', { n: 4, spread: 0.5, w: 40, tele: 44, color: '#8ad04a' }), spores: L('clouds', { n: 3, r: 58, life: 300, warn: 44, dmg: 0.6, color: '#b6e85a' }), slam: L('slamRing', { r: 84, tele: 36, rings: 2, speed: 3, color: '#8ad04a' }), saplings: L('summon', { types: ['rootling'], n: 1, max: 3, hpMul: 0.7 }), thorns: L('fan', { n: 7, spread: 0.2, reps: 2, speed: 2.8, color: '#c8e090' }) },
    phases: [{ at: 1, name: 'Sapling', attacks: ['roots', 'slam', 'saplings'], idle: [34, 56] }, { at: 0.5, name: 'Heartwood', attacks: ['roots', 'spores', 'thorns', 'saplings', 'slam'], idle: [26, 44] }] });
  ED.bossDraw.heartwood = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#4a3418'; c.beginPath(); c.moveTo(x - r * 0.55, y + r); c.lineTo(x - r * 0.3, y - r * 0.3); c.lineTo(x + r * 0.3, y - r * 0.3); c.lineTo(x + r * 0.55, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col; for (const [dx, dy, k] of [[-0.55, -0.55, 0.55], [0.55, -0.5, 0.55], [0, -0.85, 0.6], [-0.1, -0.35, 0.5]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, r * k, 0, TAU); c.fill(); }
    c.strokeStyle = '#2a4a10'; c.lineWidth = 2; c.beginPath(); c.arc(x, y - r * 0.5, r * 1.0, 0.3, 2.8); c.stroke();
    c.fillStyle = '#1a2a08'; c.fillRect(x - r * 0.3, y - r * 0.15, r * 0.2, r * 0.28); c.fillRect(x + r * 0.1, y - r * 0.15, r * 0.2, r * 0.28); c.fillStyle = '#ffe070'; c.fillRect(x - r * 0.26, y - r * 0.06, r * 0.12, r * 0.1); c.fillRect(x + r * 0.14, y - r * 0.06, r * 0.12, r * 0.1);
  };
  relic('woodcrown', { id: 'woodcrown', name: 'Thornwood Crown', rarity: 'rare', color: '#8ad04a', mods: { thorns: 3, regen: 1 }, max: 2, unlock: 'mini:heartwood', desc: 'Thorns for whoever touches you, and a slow knitting of wounds. (Unlockable)' });
  W.add({ id: 'thornwood', name: 'Thornwood Hollow', short: 'THORNWOOD HOLLOW', color: '#8ad04a', pack: V, native: 6, tiers: [1, 99], risk: 0, gate: { kind: 'carry', id: 'emberseed' },
    rule: 'Briars creep across the floor while you fight; they cut and they cling. Fire clears them — a bomb, or the Ember Seed that opened the way.',
    enemies: ['bramblehound', 'rootling', 'vinelasher', 'thornback'], mod: 'sowing', minis: ['heartwood'], hz: THORN, music: { scale: 0, root: 38, bpm: -8, prog: [0, 2, 5, 4] },
    theme: { name: 'Thornwood Hollow', floorA: '#1a2416', floorB: '#1f2a1a', wall: '#3a2e1a', wallTop: '#6a8a3a', accent: '#8ad04a', glow: '#b6f060', fog: '#080e06' } });

  // ==================================================================== 4. THE MIRROR HALLS
  //  Your own shade follows your path two and a half seconds behind you.  It hurts you — and everything else it touches, so lead it through the room.
  const SHADE_DELAY = 150;
  const MIRROR = {
    setup(g, room, rt) { rt.trail = []; rt.shade = null; },
    tick(g, rt, wi) {
      const p = g.player; if (!rt.lockdown) { if (rt.trail.length) rt.trail.length = 0; rt.shade = null; return; }
      rt.trail.push(p.x, p.y); if (rt.trail.length > 2 * 420) rt.trail.splice(0, 2);
      if (rt.trail.length < 2 * SHADE_DELAY) { rt.shade = null; return; }
      const k = rt.trail.length - 2 * SHADE_DELAY, s = rt.shade = { x: rt.trail[k], y: rt.trail[k + 1] };
      if (!p.dead && U.circleHit(s.x, s.y, 12, p.x, p.y, p.hr)) g.hurtPlayer(dmgOf(g, 1.4), s.x, s.y, { zone: true, noKnock: true, inv: 40 });
      if (g.frame % 30 === 0) for (const e of g.enemies) if (!e.dead && !e.boss && !e.big && U.circleHit(s.x, s.y, 12, e.x, e.y, e.r)) g.damageEnemy(e, e.maxHp * 0.12 + 3, { src: 'zone', x: s.x, y: s.y, noProc: true, noKb: true, color: '#d8e8ff' });
    },
    under(g, c, t, rt) { const tr = rt.trail; if (!tr || tr.length < 2 * SHADE_DELAY) return; c.save(); c.fillStyle = 'rgba(216,232,255,0.18)'; for (let k = tr.length - 2 * SHADE_DELAY; k < tr.length; k += 16) { c.beginPath(); c.arc(tr[k], tr[k + 1], 2.2, 0, TAU); c.fill(); } c.restore(); },
    draw(g, c, t, rt) {
      const s = rt.shade; if (!s) return; c.save(); c.globalAlpha = 0.55 + 0.15 * Math.sin(t * 0.2);
      c.fillStyle = '#d8e8ff'; c.strokeStyle = '#8aa0c8'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, 11, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#10182a'; c.fillRect(s.x - 5, s.y - 3, 3, 3); c.fillRect(s.x + 2, s.y - 3, 3, 3); c.restore();
    },
  };
  const f4 = mk('mirrorhall');
  register({
    reflection: f4({ name: 'Reflection', shape: 'circle', color: '#c8d8f0', r: 12, hp: 15, speed: 2.4, dmg: 3, cost: 1.9, weight: 11, minFloor: 6,
      desc: 'It goes where your mirror image would go — the far side of the room, always a step behind you. Stand in the middle and it meets you there.',
      update(e, g) {
        const p = g.player, i = A.info(g, e); e.face = i.ang;
        if (e.rush) { A.chase(g, e, i, e.curSpeed * 1.1, 0); return; }
        const tx = C.ROOM_W - p.x, ty = p.y, d = Math.hypot(tx - e.x, ty - e.y); if (d > 6) A.walk(g, e, Math.atan2(ty - e.y, tx - e.x), Math.min(e.curSpeed * 1.5, d));
      },
      draw(c, e) { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x - e.r * 0.5, e.y - e.r * 0.5); c.lineTo(e.x + e.r * 0.2, e.y - e.r * 0.9); c.stroke(); eyes(c, e, 0.4); } }),
    glassknight: f4({ name: 'Glass Knight', shape: 'tri', color: '#e0f0ff', r: 13, hp: 8, speed: 1.0, dmg: 4.5, shot: 3, cost: 2.0, weight: 10, minFloor: 6,
      desc: 'Brittle and quick to anger: it charges in a straight, telegraphed line, and shatters into razor shards when it falls. Kill it from range, or be ready to dash.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup > 10) e.cAng = i.ang; if (e.windup <= 0) { e.state = 'dash'; e.sT = 22; g.sfx('lunge'); } return; }
        if (e.state === 'dash') { const m = A.walk(g, e, e.cAng, 8.2 * e.spdMul); g.trailFx(e.x, e.y, '#e0f0ff', 0.6); if ((e.sT -= g.ts) <= 0 || m.bx || m.by) { e.state = null; e.cd = 120 / e.rate; } return; }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.1 + e.seed) * 0.4);
        if ((e.cd -= g.ts) <= 0 && i.d < 300) { e.state = 'wind'; e.windup = g.tele(30); e.cAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 280, e.y + Math.sin(i.ang) * 280, 22, e.windup, 0, { color: '#e0f0ff', hurts: false, follow: false }); }
      },
      onDeath(e, g) { g.ringShot(e, 8, 2.6, Math.PI / 8, { dmg: 0.7, color: '#e0f0ff', r: 4 }); g.burst(e.x, e.y, 14, '#e0f0ff', 5, 26); g.sfx('crack', { vol: 0.5 }); },
      draw(c, e) { c.strokeStyle = 'rgba(80,110,160,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(e.x - e.r * 0.4, e.y - e.r * 0.3); c.lineTo(e.x + e.r * 0.1, e.y + e.r * 0.2); c.lineTo(e.x + e.r * 0.5, e.y - e.r * 0.1); c.stroke(); eyes(c, e, 0.4); } }),
    refractor: f4({ name: 'Refractor', shape: 'diamond', color: '#d8e8ff', r: 12, hp: 18, speed: 0, dmg: 2, shot: 3, cost: 2.4, weight: 8, minFloor: 7,
      desc: 'A crystal that throws one beam and its reflection. Read both lines before the flash: it is the second leg that catches you.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'aim') {
          e.windup -= g.ts;
          if (e.windup <= 0) { e.state = null; e.cd = 170 / e.rate; for (const s of e.seg) g.zoneLine(e, s[0], s[1], s[2], s[3], 14, 6, e.shotDmg * 1.1, { color: '#e8f4ff', burst: false, linger: 20, tick: 8, noInstant: false }); g.sfx('zap', { vol: 0.6 }); g.shake(3); }
          return;
        }
        if (e.rush) A.chase(g, e, i, 0.9 * g.dif.enemySpeed * e.spdMul, 0);
        if ((e.cd -= g.ts) <= 0) {
          e.state = 'aim'; e.windup = g.tele(46); e.seg = beamPath(e.x, e.y, i.ang);
          for (const s of e.seg) g.zoneLine(e, s[0], s[1], s[2], s[3], 12, e.windup, 0, { color: '#bfe0ff', hurts: false }); g.sfx('telegraph', { vol: 0.4 });
        }
      } }),
    silvered: f4({ name: 'Silvered', shape: 'hex', color: '#e8f0ff', r: 14, hp: 26, speed: 0.85, dmg: 3, shot: 3, cost: 2.6, weight: 8, minFloor: 8, shield: 2.4,
      desc: 'Walks at you behind a silvered shield. Arrows and bolts are thrown back at their owner; step to its flank, or break the guard.',
      init(e) { e.rcd = 0; },
      update(e, g) { const i = A.info(g, e); e.face = i.ang; if (e.rcd > 0) e.rcd -= g.ts; A.chase(g, e, i, e.curSpeed, 0); },
      onBlock(e, g, o) { if (o.src !== 'proj' || e.rcd > 0) return; e.rcd = 40; const p = g.player; g.eShot(e, Math.atan2(p.y - e.y, p.x - e.x), 3.4, { dmg: 0.9, color: '#e8f4ff', r: 5 }); g.addText(e.x, e.y - e.r - 12, 'reflected', '#e8f4ff', 10); },
      draw(c, e) { eyes(c, e, 0.35); } }),
  });
  /** a beam from (x,y) along angle a to the wall, and its single reflection: [[x1,y1,x2,y2], ...] */
  function beamPath(x, y, a) {
    const X = ED.attacks, t = X.rayLen(x, y, a, 0), hx = x + Math.cos(a) * t, hy = y + Math.sin(a) * t, out = [[x, y, hx, hy]];
    let dx = Math.cos(a), dy = Math.sin(a); if (hx <= X.B.x0 + 1 || hx >= X.B.x1 - 1) dx = -dx; else dy = -dy;
    const a2 = Math.atan2(dy, dx), t2 = Math.min(380, X.rayLen(hx, hy, a2, 0)); if (t2 > 20) out.push([hx, hy, hx + Math.cos(a2) * t2, hy + Math.sin(a2) * t2]);
    return out;
  }
  mod({ id: 'reflective', name: 'Reflective', color: '#d8e8ff', glyph: '◈', desc: 'Its shots rebound off the walls once', update(e) { e.projBounce = 1; } });
  /** the Duelist copies the way YOU fight: whatever weapon you carry decides its attacks */
  function* mimic(e, g) {
    const k = (I.WEAPONS[g.player.weapon.type] || {}).kind, lib = ED.attacks.lib, col = '#d8e8ff';
    if (['bow', 'crossbow', 'boomerang', 'chakram', 'blunderbuss'].includes(k)) yield* lib.fan(e, g, { n: 5, spread: 0.24, reps: 3, gap: 14, speed: 3.2, color: col });
    else if (['staff', 'scepter', 'flask'].includes(k)) { yield* lib.homing(e, g, { n: 4, speed: 1.7, color: col }); yield* lib.spiral(e, g, { arms: 3, frames: 60, speed: 2.1, color: col }); }
    else if (k === 'hammer') yield* lib.slamRing(e, g, { r: 96, tele: 34, rings: 2, speed: 3, color: col });
    else if (k === 'spear') yield* lib.charge(e, g, { tele: 30, speed: 9.5, dmg: 1.5, ring: 6, color: col });
    else yield* lib.coneSlash(e, g, { arc: 1.9, r: 100, tele: 26, dmg: 1.4, times: 2, gap: 8, color: col });
  }
  mini({ id: 'duelist', name: 'The Looking-Glass Duelist', title: 'Who Fights As You Fight', color: '#d8e8ff', r: 25, hp: 200, arena: 'arena_pillars', shape: 'knight', minFloor: 7, unlockText: 'Silver Shard',
    attacks: { mimic, mimic2: mimic, shards: L('radial', { n: 12, reps: 2, gap: 14, speed: 2.5, color: '#d8e8ff' }), step: L('blink', { where: 'behind', fan: 5, color: '#d8e8ff' }), rings: L('hazardRings', { n: 3, spacing: 32, speed: 2.4, color: '#d8e8ff' }) },
    phases: [{ at: 1, name: 'Your Likeness', attacks: ['mimic', 'mimic2', 'shards'], idle: [30, 50] }, { at: 0.5, name: 'Shattered Glass', attacks: ['mimic', 'step', 'shards', 'rings'], idle: [22, 40] }] });
  relic('silvershard', { id: 'silvershard', name: 'Silver Shard', rarity: 'rare', color: '#d8e8ff', mods: { crit: 0.08, def: 1 }, max: 2, unlock: 'mini:duelist', desc: 'A keener edge and a little armour. (Unlockable)' });
  W.add({ id: 'mirrorhall', name: 'The Mirror Halls', short: 'MIRROR HALLS', color: '#d8e8ff', pack: V, native: 6, tiers: [2, 99], risk: 2, gate: { kind: 'deed', id: 'flawless' },
    rule: 'Your reflection walks a little behind you, and it is not on your side. Keep moving — or lead it through your enemies.',
    enemies: ['reflection', 'glassknight', 'refractor', 'silvered'], mod: 'reflective', minis: ['duelist'], hz: MIRROR, music: { scale: 2, root: 44, bpm: 4, prog: [0, 6, 4, 2] },
    theme: { name: 'The Mirror Halls', floorA: '#222834', floorB: '#283040', wall: '#566684', wallTop: '#c8d8f0', accent: '#d8e8ff', glow: '#ffffff', fog: '#0c1018' } });

  // ==================================================================== 5. THE SKY BRIDGE
  //  Old planks give way a moment after you step on them and come back later; the wind has no floor to catch; things here carry you off.  Planks never block a door and always return.
  const okPlank = (g, rt, i) => {
    const tx = i % C.COLS, ty = (i / C.COLS) | 0; if (tx < 2 || ty < 2 || tx > C.COLS - 3 || ty > C.ROWS - 3 || g.room.tiles[i] !== T.FLOOR) return false;
    for (const d of rt.dirs || []) { const z = ED.rooms.DOOR_CLEAR[d]; if (tx >= z[0] - 1 && tx <= z[2] + 1 && ty >= z[1] - 1 && ty <= z[3] + 1) return false; }
    return !(Math.abs(tx - 15) < 2.5 && Math.abs(ty - 9) < 1.5);
  };
  const SKY = {
    setup(g, room, rt, rng, wi) {
      rt.planks = new Set(); rt.cracking = []; rt.sN = 0; rt.sI = -1;
      for (const s of W.spots(rt, rng, 4 + (wi.depth > 1 ? 1 : 0), 120)) { const cx = Math.floor(s.x / 32), cy = Math.floor(s.y / 32); for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) if (rng.chance(0.85)) { const i = (cy + dy) * C.COLS + cx + dx; if (okPlank(g, rt, i)) rt.planks.add(i); } }
    },
    tick(g, rt, wi) {
      const p = g.player, i = Math.floor((p.y + 4) / 32) * C.COLS + Math.floor(p.x / 32);
      if (!p.dead && p.dashT <= 0 && rt.planks.has(i) && g.room.tiles[i] === T.FLOOR && !rt.cracking.some(c => c.i === i)) { if (rt.sI !== i) { rt.sI = i; rt.sN = 0; } if (++rt.sN >= 24) { rt.cracking.push({ i, t: 36 }); rt.sN = 0; g.sfx('crack', { vol: 0.3 }); } } else if (rt.sI !== -1 && rt.sI !== i) { rt.sI = -1; rt.sN = 0; }
      for (const c of rt.cracking) if (--c.t <= 0) { c.done = true; W.swapTiles(g, rt, [c.i], T.PIT, 420); g.burst((c.i % C.COLS) * 32 + 16, ((c.i / C.COLS) | 0) * 32 + 16, 8, '#c8b890', 3, 20); }
      if (rt.cracking.length) U.compact(rt.cracking, c => !c.done);
    },
    under(g, c, t, rt) {
      c.save();
      for (const i of rt.planks || []) {
        if (g.room.tiles[i] !== T.FLOOR) continue; const x = (i % C.COLS) * 32, y = ((i / C.COLS) | 0) * 32, ck = (rt.cracking || []).find(q => q.i === i);
        c.fillStyle = ck ? 'rgba(160,110,60,0.55)' : 'rgba(150,120,80,0.28)'; c.fillRect(x + 1, y + 1, 30, 30); c.strokeStyle = ck ? 'rgba(255,170,90,0.9)' : 'rgba(90,70,40,0.55)'; c.lineWidth = ck ? 2 : 1.2; c.strokeRect(x + 3 + (ck ? Math.sin(t * 1.3) : 0), y + 3, 26, 26);
        c.beginPath(); c.moveTo(x + 4, y + 11); c.lineTo(x + 28, y + 11); c.moveTo(x + 4, y + 21); c.lineTo(x + 28, y + 21); c.stroke(); if (ck) { c.beginPath(); c.moveTo(x + 8, y + 4); c.lineTo(x + 15, y + 17); c.lineTo(x + 11, y + 28); c.stroke(); }
      }
      c.restore();
    },
  };
  /** a wind that pushes whatever stands in it (the player unless dashing, ground foes, bullets) */
  const pushIn = (g, x, y, r, vx, vy, k) => {
    const p = g.player; if (!p.dead && p.dashT <= 0 && Math.hypot(p.x - x, p.y - y) < r) ED.phys.move(g, p, vx * k, vy * k);
    for (const e of g.enemies) if (!e.dead && !e.boss && !e.big && !e.noWind && Math.hypot(e.x - x, e.y - y) < r) ED.phys.move(g, e, vx * k * 0.6, vy * k * 0.6);
    for (const b of g.eproj) if (!b.dead && !b.friendly && Math.hypot(b.x - x, b.y - y) < r) { b.x += vx * k * 0.5; b.y += vy * k * 0.5; }
  };
  const f5 = mk('skybridge');
  register({
    gustweaver: f5({ name: 'Gust Weaver', shape: 'star', color: '#bfe0ff', r: 10, hp: 12, speed: 1.1, dmg: 2, shot: 2, cost: 1.9, weight: 11, minFloor: 6, flying: true, contact: false, noWind: true,
      desc: 'Hangs back and weaves a gust where you are about to be. Stand in it and you slide away from the weaver — toward whatever is behind you. Dash out.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'cast') {
          e.windup -= g.ts;
          if (e.windup <= 0) { e.state = null; e.cd = Math.max(150, 190 / e.rate); const gx = e.tx, gy = e.ty, a = Math.atan2(gy - e.y, gx - e.x), vx = Math.cos(a), vy = Math.sin(a); g.sfx('shoot', { vol: 0.4 });
            g._zone({ kind: 'hazard', shape: 'circle', x: gx, y: gy, r: 72, life: 90, dmg: 0, hurts: false, tick: 9999, tickT: 0, src: e, gust: true, color: '#bfe0ff', upd(gg, z) { pushIn(gg, z.x, z.y, z.r, vx, vy, 1.8); if (gg.frame % 3 === 0) gg.fx.push({ x: z.x + (Math.random() - 0.5) * 100 - vx * 30, y: z.y + (Math.random() - 0.5) * 100 - vy * 30, vx: vx * 5, vy: vy * 5, life: 10, max: 10, size: 2, color: '#e8f4ff', drag: 1, grav: 0, shape: 'sq' }); } }); }
          return;
        }
        A.kite(g, e, i, 225, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0) {
          if (g.zones.some(z => z.gust)) { e.cd = 24; return; }                                  // one gust in the room at a time: there is always a gap to walk out of
          e.state = 'cast'; e.windup = g.tele(44); e.tx = U.clamp(p.x + (p.vx || 0) * 10, 90, 870); e.ty = U.clamp(p.y + (p.vy || 0) * 10, 90, 490); g.zoneCircle(e, e.tx, e.ty, 72, e.windup, 0, { color: '#bfe0ff', hurts: false, burst: false, gust: true }); g.sfx('telegraph', { vol: 0.4 }); }
      } }),
    harpy: f5({ name: 'Harpy', shape: 'tri', color: '#c8a8d8', r: 11, hp: 18, speed: 1.7, dmg: 3, shot: 3, cost: 2.6, weight: 8, minFloor: 7, flying: true, noWind: true,
      desc: 'Swoops, seizes you and flies you somewhere worse before letting go. A dash breaks its grip; so does killing it.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'carry') {
          if (p.dead || p.dashT > 0) { e.state = null; e.cd = 160 / e.rate; g.toast('You break free!', '#c8a8d8', 60); return; }
          const d = Math.hypot(e.dx - e.x, e.dy - e.y); if (d > 6) A.walk(g, e, Math.atan2(e.dy - e.y, e.dx - e.x), 3.2 * e.spdMul);
          p.x = e.x; p.y = e.y + 12; p.vx = p.vy = 0; p.inv = Math.max(p.inv, 3);
          if ((e.cT -= g.ts) <= 0) { e.state = null; e.cd = 190 / e.rate; if (ED.phys.blocked(g, p.x, p.y, p.cr, false, false)) ED.phys.unstick(g, p); p.inv = 0; g.hurtPlayer(dmgOf(g, 1.8), p.x, p.y, { src: e, noKnock: true }); g.burst(p.x, p.y, 10, '#c8a8d8', 3, 20); g.sfx('thud'); }
          return;
        }
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup > 10) e.sAng = i.ang; if (e.windup <= 0) { e.state = 'swoop'; e.sT = 26; g.sfx('lunge'); } return; }
        if (e.state === 'swoop') {
          A.walk(g, e, e.sAng, 8.5 * e.spdMul); g.trailFx(e.x, e.y, '#c8a8d8', 0.5);
          if (!p.dead && p.dashT <= 0 && p.inv <= 0 && U.circleHit(e.x, e.y, e.r, p.x, p.y, p.hr)) { e.state = 'carry'; e.cT = 70; const a = g.rng.next() * TAU; e.dx = U.clamp(e.x + Math.cos(a) * 300, 110, 850); e.dy = U.clamp(e.y + Math.sin(a) * 220, 110, 466); g.addText(p.x, p.y - 28, 'SEIZED', '#c8a8d8', 14); g.sfx('deny'); return; }
          if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 120 / e.rate; } return;
        }
        A.kite(g, e, i, 200, e.curSpeed, 0.9);
        if ((e.cd -= g.ts) <= 0 && i.d < 330) { e.state = 'wind'; e.windup = g.tele(30); e.sAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 260, e.y + Math.sin(i.ang) * 260, 22, e.windup, 0, { color: '#c8a8d8', hurts: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { c.fillStyle = 'rgba(200,168,216,0.7)'; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + sg * e.r * 1.8, e.y - e.r * 0.8 + Math.sin(e.t * 0.5) * 3); c.lineTo(e.x + sg * e.r * 1.2, e.y + e.r * 0.4); c.closePath(); c.fill(); } eyes(c, e, 0.4); } }),
    windmill: f5({ name: 'Windmill Idol', shape: 'star', color: '#a8c0e0', r: 13, hp: 26, speed: 0, dmg: 2, shot: 2.6, cost: 2.4, weight: 8, minFloor: 7, noWind: true,
      desc: 'A rooted idol with four vanes. It breathes a steady wind in one direction, then turns a quarter and breathes again; every fourth breath it spits a cross of bolts.',
      init(e, g) { e.k0 = g.rng.int(0, 3); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; const beat = Math.floor(e.t / 100), k = (beat + e.k0) % 4, a = k * Math.PI / 2; e.wa = a;
        pushIn(g, e.x, e.y, 250, Math.cos(a), Math.sin(a), 1.15);
        if ((e.t % 100) < g.ts && beat > 0 && k === 3) { for (let q = 0; q < 4; q++) g.eShot(e, q * Math.PI / 2 + 0.4, 2.8, { dmg: 0.9, color: '#c8d8f0', r: 4 }); g.sfx('shoot', { vol: 0.5 }); }
        if (e.rush) A.chase(g, e, i, 0.9 * g.dif.enemySpeed * e.spdMul, 0);
      },
      draw(c, e, t) { c.strokeStyle = '#e8f4ff'; c.lineWidth = 3; for (let q = 0; q < 4; q++) { const a = (t || 0) * 0.04 + q * Math.PI / 2; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + Math.cos(a) * e.r * 1.6, e.y + Math.sin(a) * e.r * 1.6); c.stroke(); } c.fillStyle = '#e8f4ff'; const a = e.wa || 0; c.beginPath(); c.moveTo(e.x + Math.cos(a) * (e.r + 14), e.y + Math.sin(a) * (e.r + 14)); c.lineTo(e.x + Math.cos(a + 0.5) * (e.r + 5), e.y + Math.sin(a + 0.5) * (e.r + 5)); c.lineTo(e.x + Math.cos(a - 0.5) * (e.r + 5), e.y + Math.sin(a - 0.5) * (e.r + 5)); c.closePath(); c.fill(); } }),
    nimbus: f5({ name: 'Nimbus', shape: 'blob', color: '#8a98b8', r: 12, hp: 16, speed: 0.75, dmg: 2, shot: 3, cost: 2.1, weight: 10, minFloor: 6, flying: true, contact: false, noWind: true,
      desc: 'A drifting stormcloud with its own rain: stand inside the grey ring and it hammers you. Drift away from it, or burst it quickly.',
      init(e) { e.aura = 64; e.ac = 0; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang; A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.05 + e.seed) * 0.6);
        if ((e.ac -= g.ts) <= 0) { e.ac = 30; if (!p.dead && i.d < e.aura + p.hr) { g.hurtPlayer(e.shotDmg * 0.55, e.x, e.y, { src: e, zone: true, noKnock: true, inv: 22 }); p.slowT = Math.max(p.slowT || 0, 40); } }
      },
      draw(c, e, t) { c.strokeStyle = 'rgba(150,170,210,' + (0.35 + 0.15 * Math.sin((t || 0) * 0.1)) + ')'; c.lineWidth = 2; c.setLineDash && c.setLineDash([6, 5]); c.beginPath(); c.arc(e.x, e.y, e.aura, 0, TAU); c.stroke(); c.setLineDash && c.setLineDash([]); c.fillStyle = 'rgba(190,210,255,0.8)'; for (let k = 0; k < 6; k++) c.fillRect(e.x - 20 + k * 7 + Math.sin((t || 0) * 0.3 + k) * 2, e.y + e.r + 4 + ((t || 0) * 1.5 + k * 9) % 16, 1.6, 6); eyes(c, e, 0.4); } }),
  });
  mod({ id: 'buffeting', name: 'Buffeting', color: '#bfe0ff', glyph: '≫', desc: 'Its blows hurl you across the room',
    onHitPlayer(e, g) { const p = g.player, a = Math.atan2(p.y - e.y, p.x - e.x); p.kx += Math.cos(a) * 16; p.ky += Math.sin(a) * 16; g.ringFx(p.x, p.y, 6, 30, '#bfe0ff', 12, 3); } });
  const lib = ED.attacks.lib;
  if (!lib.crosswind) lib.crosswind = function* (e, g, o) {           // a wind from one side of the room: warned, then it shoves you for a while
    o = Object.assign({ warn: 60, dur: 80, push: 1.2 }, o); const d = g.rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), p = g.player;
    g.toast('CROSSWIND!', '#bfe0ff', 80); g.sfx('telegraph'); e.gust = { dx: d[0], dy: d[1], st: 'warn' };
    try { for (let i = 0; i < o.warn; i++) yield 1; e.gust.st = 'blow'; for (let i = 0; i < o.dur; i++) { if (p.dashT <= 0 && !p.dead) ED.phys.move(g, p, d[0] * o.push, d[1] * o.push); for (const b of g.eproj) if (!b.dead && !b.friendly) { b.x += d[0] * 0.6; b.y += d[1] * 0.6; } yield 1; } } finally { e.gust = null; }
  };
  mini({ id: 'matriarch', name: 'The Spire Matriarch', title: 'Mother of the Updraft', color: '#bfe0ff', r: 25, hp: 195, arena: 'arena_open', shape: 'hawk', minFloor: 6, unlockText: 'Roc Feather',
    attacks: { dive: L('charge', { tele: 28, speed: 11, dmg: 1.5, stun: 30, color: '#bfe0ff' }), feathers: L('fan', { n: 7, spread: 0.16, reps: 2, speed: 3.2, color: '#e8f4ff' }), wind: L('crosswind', {}), hail: L('rain', { n: 8, r: 40, warn: 40, interval: 6, aimed: 0.7, color: '#bfe0ff' }), brood: L('summon', { types: ['harpy'], n: 1, max: 2, hpMul: 0.7 }) },
    phases: [{ at: 1, name: 'Updraft', attacks: ['dive', 'feathers', 'wind'], idle: [28, 48] }, { at: 0.5, name: 'Whiteout', attacks: ['dive', 'feathers', 'wind', 'hail', 'brood'], idle: [20, 38] }] });
  relic('rocfeather', { id: 'rocfeather', name: 'Roc Feather', rarity: 'rare', color: '#bfe0ff', mods: { speed: 0.06, dashCd: -0.08, dashDist: 0.1 }, max: 2, unlock: 'mini:matriarch', desc: 'Lighter on your feet; the dash goes further and comes back sooner. (Unlockable)' });
  W.add({ id: 'skybridge', name: 'The Sky Bridge', short: 'SKY BRIDGE', color: '#bfe0ff', pack: V, native: 6, tiers: [2, 99], risk: 1, gate: { kind: 'carry', id: 'feather' },
    rule: 'The planks are older than the bridge: they give way a moment after you step on them and return when they are ready. Mind the wind, and what carries you off.',
    enemies: ['gustweaver', 'harpy', 'windmill', 'nimbus'], mod: 'buffeting', minis: ['matriarch'], hz: SKY, music: { scale: 1, root: 46, bpm: 6, prog: [0, 4, 2, 5] },
    theme: { name: 'The Sky Bridge', floorA: '#2a3448', floorB: '#303c52', wall: '#6a7aa0', wallTop: '#d0e0ff', accent: '#bfe0ff', glow: '#ffffff', fog: '#0a1220' } });
})(typeof globalThis !== 'undefined' ? globalThis : this);

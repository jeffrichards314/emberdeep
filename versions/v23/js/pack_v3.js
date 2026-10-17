/* EMBERDEEP — pack_v3.js : v3 "WORLDS" — five floors at a time, six lands, each with its own rule.
 *
 *  Floors 1-5 The Hollow Crypts · 6-10 The Mirewood · 11-15 The Glacial Spire · 16-20 The Cinder Foundry ·
 *  21-25 The Gloam Void · 26-30 The Storm Reach · then the cycle repeats ever harder.
 *  Each world: its own palette, an environmental rule you must play around, two exclusive foes, an elite trait,
 *  and (worlds 2-5) a mini boss that drops a signature relic.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, A = ED.ai;
  const TAU = U.TAU, V = 'v3';
  const L = (name, o) => [name, o];

  P.define({
    id: 'v3', name: 'WORLDS', tag: 'six lands, six rules', color: '#8bd95c',
    blurb: 'Six worlds, five floors each, each with its own rule — mud and spores, ice and gusts, lava and steam, darkness and gravity, lightning — plus 11 new foes and 4 mini bosses.',
  });

  // new tile: mud (slows everyone who wades through it)
  T.MUD = 11; ED.rooms.PASS.add(T.MUD);

  // ------------------------------------------------------------------ the worlds
  const WORLDS = [
    { id: 'crypts', name: 'The Hollow Crypts', short: 'CRYPTS', color: '#9a8cff', rule: 'The dead sleep lightly. Nothing here wants to be fair.', enemies: ['tombrat', 'gravemoth'], mod: null, mini: 'gravewarden',
      theme: { name: 'The Hollow Crypts', floorA: '#2b2736', floorB: '#302b3d', wall: '#4a4560', wallTop: '#6a6485', accent: '#9a8cff', glow: '#8a7bff', fog: '#14101e' } },
    { id: 'mirewood', name: 'The Mirewood', short: 'MIREWOOD', color: '#a0d84a', rule: 'Mud drags at your boots; poison spores drift where you stand.', enemies: ['boglurker', 'sporecap'], mod: 'mired', mini: 'bogtyrant',
      theme: { name: 'The Mirewood', floorA: '#1f2a1c', floorB: '#25311f', wall: '#3d4a2c', wallTop: '#5f7a3c', accent: '#a0d84a', glow: '#b6e85a', fog: '#0a1208' } },
    { id: 'glacial', name: 'The Glacial Spire', short: 'GLACIAL SPIRE', color: '#bff0ff', rule: 'Ice slides underfoot. Blizzard gusts shove everything — mind the pits.', enemies: ['frostarcher', 'rimegolem'], mod: null, mini: 'rimeknight',
      theme: { name: 'The Glacial Spire', floorA: '#2a3a52', floorB: '#31445f', wall: '#5a7a9f', wallTop: '#a8d0f0', accent: '#bff0ff', glow: '#d8f8ff', fog: '#0c1624' } },
    { id: 'foundry', name: 'The Cinder Foundry', short: 'CINDER FOUNDRY', color: '#ff7a2a', rule: 'Lava pools and steam vents that scald whoever stands over them.', enemies: ['magmaslug', 'slaghurler'], mod: 'molten', mini: 'slagsmelter',
      theme: { name: 'The Cinder Foundry', floorA: '#2e1f1c', floorB: '#35231f', wall: '#5a3228', wallTop: '#8a4a30', accent: '#ff7a2a', glow: '#ffa040', fog: '#160806' } },
    { id: 'void', name: 'The Gloam Void', short: 'GLOAM VOID', color: '#c070ff', rule: 'Light fails. Slow gravity wells wander the dark and drag you in.', enemies: ['voidleech', 'shadestalker'], mod: null, mini: 'gloamweaver',
      theme: { name: 'The Gloam Void', floorA: '#14121e', floorB: '#191626', wall: '#2c2542', wallTop: '#5a3fa0', accent: '#c070ff', glow: '#d890ff', fog: '#05040a' } },
    { id: 'storm', name: 'The Storm Reach', short: 'STORM REACH', color: '#ffe14a', rule: 'Lightning is aimed where you are going, not where you are.', enemies: ['stormling', 'thunderroc'], mod: 'stormcharged', mini: 'thunderkin',
      theme: { name: 'The Storm Reach', floorA: '#262a36', floorB: '#2c3140', wall: '#4a5268', wallTop: '#8892b0', accent: '#ffe14a', glow: '#fff08a', fog: '#0e1018' } },
  ];
  // the six join the core world registry (js/worlds.js) as its straight line: ED.worlds.at(floor) is still floor 1-5 Crypts, 6-10 Mirewood ... unless a route (v17) says otherwise
  for (const w of WORLDS) { w.pack = V; ED.worlds.add(w, true); }

  // ------------------------------------------------------------------ enemies
  const eyes = (c, e, spread) => {
    const a = e.face || 0, d = e.r * 0.35, s = Math.max(1.5, e.r * 0.2);
    for (const sg of [-1, 1]) {
      const ex = e.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * sg * e.r * spread, ey = e.y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * sg * e.r * spread;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, s, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(ex + Math.cos(a) * s * 0.4, ey + Math.sin(a) * s * 0.4, s * 0.5, 0, TAU); c.fill();
    }
  };
  const bg = (o) => Object.assign({ pack: V, contact: true }, o);
  const ENEMIES = {
    // ---- Hollow Crypts
    tombrat: bg({ id: 'tombrat', name: 'Tomb Rat', shape: 'circle', color: '#9a8a78', r: 9, hp: 7, speed: 1.5, dmg: 2.5, cost: 0.9, weight: 14, minFloor: 2, group: 2, world: 'crypts',
      desc: 'Burrows to dodge your blows, then erupts at your feet.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'sink') { e.windup -= g.ts; e.vis = Math.max(0.2, e.windup / 16); if (e.windup <= 0) { e.state = 'dig'; e.sT = 36; } return; }
        if (e.state === 'dig') {
          e.invuln = true; e.noContact = true; e.vis = 0.12; A.chase(g, e, i, e.curSpeed * 2.3, 0);
          if (e.t % 5 < g.ts) g.burst(e.x, e.y, 1, '#8a7a68', 1, 12);
          e.sT -= g.ts; if (e.sT <= 0 || i.d < 26) { e.state = 'rise'; e.windup = g.tele(20); g.zoneRing(e, e.x, e.y, 10, 18, e.windup, 0, { color: '#b8a890', hurts: false }); }
          return;
        }
        if (e.state === 'rise') { e.windup -= g.ts; e.invuln = true; e.noContact = true; e.vis = 0.4; if (e.windup <= 0) { e.state = null; e.invuln = false; e.vis = 1; e.cd = 170 / e.rate; g.burst(e.x, e.y, 8, '#b8a890', 3, 18); } return; }
        e.invuln = false; e.vis = 1; A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.1 + e.seed) * 0.4);
        if ((e.cd -= g.ts) <= 0 && i.d < 260) { e.state = 'sink'; e.windup = 16; }
      }, draw(c, e) { eyes(c, e, 0.45); } }),
    gravemoth: bg({ id: 'gravemoth', name: 'Grave Moth', shape: 'diamond', color: '#c8c0d8', r: 8, hp: 5, speed: 1.3, dmg: 1.5, shot: 3, cost: 0.8, weight: 12, minFloor: 3, group: 3, flying: true, world: 'crypts',
      desc: 'Flutters overhead and drops dust bombs. Come in threes.',
      init(e, g) { e.cd = 60 + g.rng.int(0, 120); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; A.kite(g, e, i, 170, e.curSpeed, 0.9);
        if ((e.cd -= g.ts) <= 0) { e.cd = 170 / e.rate; g.bombZone(e, e.x, e.y, 34, g.tele(56), e.shotDmg, { color: '#c8c0d8' }); }
      } }),
    // ---- Mirewood
    boglurker: bg({ id: 'boglurker', name: 'Bog Lurker', shape: 'blob', color: '#6f8a3a', r: 15, hp: 22, speed: 1.1, dmg: 4, cost: 2.0, weight: 14, minFloor: 6, world: 'mirewood',
      desc: 'Waits submerged and untouchable until you wander close, then lunges from the muck.',
      init(e, g) { e.state = 'sub'; e.invuln = true; e.vis = 0.18; e.cd = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'sub') { e.invuln = true; e.noContact = true; e.vis = 0.18; if (i.d < 150 || e.t > 330) { e.state = 'wind'; e.windup = g.tele(26); g.zoneCircle(e, e.x, e.y, e.r + 14, e.windup, 0, { color: '#9ac84a', hurts: false }); } return; }
        if (e.state === 'wind') { e.windup -= g.ts; e.lungeAng = i.ang; if (!e.surfaced) { e.invuln = true; e.noContact = true; e.vis = 0.5; } if (e.windup <= 0) { e.state = 'lunge'; e.sT = 18; e.invuln = false; e.surfaced = true; e.vis = 1; g.sfx('lunge'); } return; }
        if (e.state === 'lunge') { A.walk(g, e, e.lungeAng, 5 * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 100 / e.rate; } return; }
        e.invuln = false; e.vis = 1; A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 210) { e.state = 'wind'; e.windup = g.tele(24); }
      }, draw(c, e) { eyes(c, e, 0.5); } }),
    sporecap: bg({ id: 'sporecap', name: 'Sporecap', shape: 'hex', color: '#b8d870', r: 13, hp: 20, speed: 0, dmg: 2, shot: 2, cost: 1.8, weight: 12, minFloor: 6, world: 'mirewood',
      desc: 'A rooted fungus that lobs clinging spores and bursts into a poison cloud when it dies.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'aim') {
          e.windup -= g.ts;
          if (e.windup <= 0) { const n = g.dif.patternTier >= 2 ? 3 : 1; for (let k = 0; k < n; k++) g.eShot(e, i.ang + (k - (n - 1) / 2) * 0.35, 1.8, { dmg: 1, color: '#b8d870', r: 6, homing: 0.018, slow: 90, life: 300 }); e.state = null; e.cd = 150 / e.rate; g.sfx('shoot'); }
          return;
        }
        if (e.rush) A.chase(g, e, i, 0.9 * g.dif.enemySpeed * e.spdMul, 0);             // the last survivors creep toward you, so a locked room can always be finished
        if ((e.cd -= g.ts) <= 0) { e.state = 'aim'; e.windup = g.tele(30); }
      },
      onDeath(e, g) { g.hazardCircle(e, e.x, e.y, 50, 170, e.shotDmg * 0.5, { color: '#8ae06a', tick: 26, warn: g.tele(20), slow: true, noInstant: true }); } }),
    // ---- Glacial Spire
    frostarcher: bg({ id: 'frostarcher', name: 'Rime Archer', shape: 'tri', color: '#9fe4ff', r: 12, hp: 14, speed: 1.0, dmg: 2, shot: 3, cost: 1.9, weight: 14, minFloor: 11, world: 'glacial',
      desc: 'Keeps its distance and fires shards of ice that chill you to the bone.',
      init(e, g) { e.cd = 60 + g.rng.int(0, 80); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'aim') {
          e.windup -= g.ts;
          if (e.windup <= 0) { const n = 1 + Math.min(2, Math.floor(g.dif.patternTier / 2)); for (let k = 0; k < n; k++) g.eShot(e, i.ang + (k - (n - 1) / 2) * 0.24, 3.2, { dmg: 1, color: '#bff0ff', r: 4, slow: 100 }); g.sfx('shoot'); e.state = null; e.cd = (100 + g.rng.int(0, 40)) / e.rate; }
          return;
        }
        A.kite(g, e, i, 235, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0) { e.state = 'aim'; e.windup = g.tele(28); }
      }, draw(c, e) { eyes(c, e, 0.5); } }),
    rimegolem: bg({ id: 'rimegolem', name: 'Rime Golem', shape: 'hex', color: '#8ab8e0', r: 17, hp: 42, speed: 0.7, dmg: 5, shot: 3, cost: 3.2, weight: 10, minFloor: 11, world: 'glacial',
      desc: 'A slow glacier on legs. Its ground-slam sends a freezing shockwave across the room — dash through it.',
      init(e, g) { e.cd = 110; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 190 / e.rate; g.shockRing(e, e.x, e.y, 4, 18, 260, e.shotDmg * 0.7, { color: '#bfeaff' }); g.shake(5); g.sfx('thud'); } return; }
        A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 240) { e.state = 'wind'; e.windup = g.tele(44); g.zoneCircle(e, e.x, e.y, 70, e.windup, e.shotDmg, { color: '#bfeaff', burst: true, follow: true }); }
      }, draw(c, e) { eyes(c, e, 0.4); } }),
    // ---- Cinder Foundry
    magmaslug: bg({ id: 'magmaslug', name: 'Magma Slug', shape: 'blob', color: '#ff7a2a', r: 13, hp: 24, speed: 0.8, dmg: 3, shot: 3, cost: 1.9, weight: 14, minFloor: 16, world: 'foundry',
      desc: 'Crawls toward you, leaving a trail of molten ground. Bursts into lava when slain.',
      init(e, g) { e.cd = 20; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.06 + e.seed) * 0.3);
        if ((e.cd -= g.ts) <= 0 && g.zones.length < 30) { e.cd = 26; g.hazardCircle(e, e.x, e.y, 15, 140, e.shotDmg * 0.4, { color: '#ff6a2a', tick: 24 }); }
      },
      onDeath(e, g) { g.hazardCircle(e, e.x, e.y, 38, 170, e.shotDmg * 0.45, { color: '#ff6a2a', tick: 24, warn: g.tele(16) }); },
      draw(c, e) { eyes(c, e, 0.45); } }),
    slaghurler: bg({ id: 'slaghurler', name: 'Slag Hurler', shape: 'square', color: '#d05a2a', r: 13, hp: 16, speed: 0.9, dmg: 2, shot: 4, cost: 2.2, weight: 12, minFloor: 16, world: 'foundry',
      desc: 'Lobs molten slag at where you are going; every impact leaves a pool of fire.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'throw') {
          e.windup -= g.ts;
          if (e.windup <= 0) {
            const n = g.dif.patternTier >= 3 ? 2 : 1;
            for (let k = 0; k < n; k++) {
              const tx = U.clamp(p.x + (p.vx || 0) * 16 + k * 60 * (g.rng.chance(0.5) ? 1 : -1), 60, 900), ty = U.clamp(p.y + (p.vy || 0) * 16 + k * 40, 60, 520);
              g.zoneCircle(e, tx, ty, 44, g.tele(62), e.shotDmg, { color: '#ff6a2a', burst: true, bomb: true, onEnd: (g2, z) => { g2.explodeFx(z.x, z.y, z.r, '#ff6a2a'); if (g2.zones.length < 40) g2.hazardCircle(e, z.x, z.y, 36, 170, e.shotDmg * 0.35, { color: '#ff6a2a', tick: 24 }); } });
            }
            e.state = null; e.cd = 160 / e.rate; g.sfx('shoot');
          }
          return;
        }
        A.kite(g, e, i, 240, e.curSpeed, 0.6);
        if ((e.cd -= g.ts) <= 0) { e.state = 'throw'; e.windup = g.tele(24); }
      }, draw(c, e) { eyes(c, e, 0.45); } }),
    // ---- Gloam Void
    voidleech: bg({ id: 'voidleech', name: 'Void Leech', shape: 'ghost', color: '#a060d8', r: 9, hp: 12, speed: 1.7, dmg: 2.5, cost: 1.6, weight: 14, minFloor: 21, flying: true, contact: false, world: 'void',
      desc: 'Clings to you and drains your life and speed. Dash to shake it off — or kill it fast.',
      init(e, g) { e.cd = 0; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'latch') {
          e.x = p.x + Math.cos(e.latchA) * 9; e.y = p.y + Math.sin(e.latchA) * 9; p.slowT = Math.max(p.slowT || 0, 6);
          if ((e.drainT -= g.ts) <= 0) { e.drainT = 55; if (g.hurtPlayer(Math.max(1, e.dmg * 0.7), e.x, e.y, { src: e, noKnock: true, inv: 24 })) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.1); g.addText(e.x, e.y - 14, 'drain', '#c070ff', 10); } }
          if (p.dashT > 0 || p.dead) { e.state = null; e.cd = 110; e.kx = Math.cos(e.latchA) * 7; e.ky = Math.sin(e.latchA) * 7; g.toast('Shook it off!', '#c070ff', 60); }
          return;
        }
        e.cd = Math.max(0, (e.cd || 0) - g.ts);
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.15 + e.seed) * 0.8);
        if (e.cd <= 0 && i.d < e.r + p.hr + 5 && !p.dead) { e.state = 'latch'; e.latchA = g.rng.next() * TAU; e.drainT = 28; g.sfx('summon'); if (!g.run.leechTip) { g.run.leechTip = true; g.toast('A Void Leech clings to you! DASH to shake it off.', '#c070ff', 160); } }
      } }),
    shadestalker: bg({ id: 'shadestalker', name: 'Shade Stalker', shape: 'tri', color: '#6a4aa8', r: 11, hp: 16, speed: 1.6, dmg: 4, cost: 2.0, weight: 12, minFloor: 21, world: 'void',
      desc: 'Almost invisible until it strikes. Listen for the flare before the slash.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 50); e.vis = 0.1; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; e.vis = 1; if (e.windup > 8) e.sAng = i.ang; if (e.windup <= 0) { e.state = 'dash'; e.sT = 16; g.sfx('lunge'); } return; }
        if (e.state === 'dash') { A.walk(g, e, e.sAng, 8 * e.spdMul); g.trailFx(e.x, e.y, '#8a5ad8', 0.6); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 110 / e.rate; } return; }
        e.vis = i.d < 110 ? 0.55 : 0.1; A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.1 + e.seed) * 0.5);
        if ((e.cd -= g.ts) <= 0 && i.d < 250) { e.state = 'wind'; e.windup = g.tele(28); e.sAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 200, e.y + Math.sin(i.ang) * 200, 22, e.windup, 0, { color: '#8a5ad8', hurts: false }); }
      }, draw(c, e) { eyes(c, e, 0.45); } }),
    // ---- Storm Reach
    stormling: bg({ id: 'stormling', name: 'Stormling', shape: 'star', color: '#ffe14a', r: 10, hp: 14, speed: 1.2, dmg: 2, shot: 3.5, cost: 2.0, weight: 14, minFloor: 26, flying: true, world: 'storm',
      desc: 'Circles you at a distance, then calls a bolt of lightning down the line to where you stand.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); e.orb = g.rng.next() * TAU; e.dirO = g.rng.chance(0.5) ? 1 : -1; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 130 / e.rate; g.sfx('zap'); } return; }
        if (e.rush) A.chase(g, e, i, e.curSpeed * 1.15, 0);                       // desperate survivors close in (keeps locked rooms winnable)
        else { e.orb += 0.018 * e.dirO * g.ts; const tx = p.x + Math.cos(e.orb) * 175, ty = p.y + Math.sin(e.orb) * 175; const d = Math.hypot(tx - e.x, ty - e.y); if (d > 4) A.walk(g, e, Math.atan2(ty - e.y, tx - e.x), Math.min(e.curSpeed * 1.4, d)); }
        if ((e.cd -= g.ts) <= 0) { e.state = 'wind'; e.windup = g.tele(42); const a = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(a) * 720, e.y + Math.sin(a) * 720, 18, e.windup, e.shotDmg * 1.1, { color: '#ffe14a', burst: false, onEnd: (g2, z) => { g2.fx.push({ x: z.x, y: z.y, x2: z.x2, y2: z.y2, vx: 0, vy: 0, life: 9, max: 9, color: '#fff6a0', shape: 'bolt', drag: 1, grav: 0, size: 2 }); } }); }
      } }),
    thunderroc: bg({ id: 'thunderroc', name: 'Thunder Roc', shape: 'diamond', color: '#d8d890', r: 14, hp: 22, speed: 1.4, dmg: 3.5, cost: 2.6, weight: 10, minFloor: 26, flying: true, world: 'storm',
      desc: 'Rears back, then screams across the room along a glowing line. It is winded and vulnerable right after.',
      init(e, g) { e.cd = 90; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup > 14) { e.cAng = i.ang; if (e.line) { e.line.x = e.x; e.line.y = e.y; e.line.x2 = e.x + Math.cos(e.cAng) * 900; e.line.y2 = e.y + Math.sin(e.cAng) * 900; } } if (e.windup <= 0) { e.state = 'dash'; e.sT = 52; g.sfx('lunge'); } return; }
        if (e.state === 'dash') { const b = A.walk(g, e, e.cAng, 9.5 * e.spdMul); g.trailFx(e.x, e.y, '#fff6a0', 0.6); if ((e.sT -= g.ts) <= 0 || b.bx || b.by) { e.state = 'tired'; e.sT = 55; g.burst(e.x, e.y, 8, '#fff6a0', 3, 18); } return; }
        if (e.state === 'tired') { e.vuln = 1.35; e.sT -= g.ts; if (e.sT <= 0) { e.state = null; e.vuln = 1; e.cd = 110 / e.rate; } return; }
        A.kite(g, e, i, 230, e.curSpeed, 0.9);
        if ((e.cd -= g.ts) <= 0) { e.state = 'wind'; e.windup = g.tele(50); e.cAng = i.ang; e.line = g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 900, e.y + Math.sin(i.ang) * 900, 28, e.windup, 0, { color: '#ffe14a', hurts: false, follow: false }); }
      } }),
  };
  for (const id in ENEMIES) { ENEMIES[id].id = id; ED.enemyTypes[id] = ENEMIES[id]; }
  // stationary foes must always be able to finish a locked room: the AI only needs the player alive, so no extra handling.

  // ------------------------------------------------------------------ elite traits
  Object.assign(ED.mods, {
    mired: { id: 'mired', pack: V, name: 'Mired', color: '#8ae06a', glyph: '≈', desc: 'Leaves a slowing poison trail',
      update(e, g) { if (!e.flying && e.t % 30 < g.ts && g.zones.length < 30) g.hazardCircle(e, e.x, e.y, 18, 120, e.shotDmg * 0.3, { color: '#8ae06a', tick: 26, slow: true }); } },
    molten: { id: 'molten', pack: V, name: 'Molten', color: '#ff7a2a', glyph: '◆', desc: 'Dies in a pool of lava',
      onDeath(e, g) { g.hazardCircle(e, e.x, e.y, 44, 200, e.shotDmg * 0.5, { color: '#ff6a2a', tick: 24, warn: g.tele(18) }); } },
    stormcharged: { id: 'stormcharged', pack: V, name: 'Stormcharged', color: '#ffe14a', glyph: 'ϟ', desc: 'Calls lightning on your position',
      update(e, g) { e.stormT = (e.stormT === undefined ? 120 : e.stormT) - g.ts; if (e.stormT <= 0) { e.stormT = 240; const p = g.player; g.zoneCircle(e, p.x, p.y, 34, g.tele(50), e.shotDmg, { color: '#ffe14a', burst: true }); } } },
  });
  for (const id of ['mired', 'molten', 'stormcharged']) ED.mods[id].id = id;

  // ------------------------------------------------------------------ mini bosses (one per world 2-5) + signature relics
  const MINI = {
    bogtyrant: { id: 'bogtyrant', pack: V, name: 'Bog Tyrant', title: 'Lord of the Mire', color: '#7a9a3a', r: 30, hp: 210, arena: 'arena_round', shape: 'blob', contact: 4, minFloor: 6, unlockText: 'Bog Heart',
      attacks: { hop: L('leap', { r: 72, tele: 40, bullets: 8, color: '#9ac84a', times: 2 }), spores: L('clouds', { n: 3, r: 58, life: 300, warn: 44, dmg: 0.6, color: '#8ae06a' }),
        spit: L('fan', { n: 5, spread: 0.3, reps: 2, speed: 2.3, color: '#b8d870' }), brood: L('summon', { types: ['sporecap'], n: 1, max: 2, hpMul: 0.7 }) },
      phases: [{ at: 1, name: 'Wallow', attacks: ['hop', 'spit'], idle: [34, 56] }, { at: 0.5, name: 'Rot', attacks: ['hop', 'spores', 'spit', 'brood'], idle: [26, 46] }] },
    rimeknight: { id: 'rimeknight', pack: V, name: 'Rimeknight', title: 'Warden of the Spire', color: '#9fe4ff', r: 27, hp: 215, arena: 'arena_pillars', shape: 'knight', contact: 4, minFloor: 11, unlockText: 'Glacier Shard',
      attacks: { slash: L('coneSlash', { arc: 1.8, r: 86, tele: 30, dmg: 1.4 }), dash: L('charge', { tele: 30, speed: 9.5, dmg: 1.5, ring: 6, stun: 40 }),
        shards: L('fan', { n: 7, spread: 0.2, reps: 2, speed: 3.2, color: '#bff0ff' }), frost: L('radial', { n: 14, reps: 2, gap: 14, speed: 2.5, color: '#bff0ff' }) },
      phases: [{ at: 1, name: 'Frostguard', attacks: ['slash', 'dash'], idle: [30, 50] }, { at: 0.5, name: 'Whiteout', attacks: ['slash', 'dash', 'shards', 'frost'], idle: [22, 40] }] },
    slagsmelter: { id: 'slagsmelter', pack: V, name: 'Slag Smelter', title: 'Keeper of the Crucible', color: '#ff7a2a', r: 29, hp: 225, arena: 'arena_pits', shape: 'furnace', contact: 5, minFloor: 16, unlockText: 'Slag Core',
      attacks: { stomp: L('slamRing', { r: 76, tele: 34, rings: 2, speed: 3, color: '#ff7a2a' }), rain: L('rain', { n: 8, r: 48, warn: 46, interval: 7, aimed: 0.7, color: '#ff6a2a' }),
        ember: L('spiral', { arms: 3, frames: 80, speed: 2.2, color: '#ff8a3a' }), pool: L('clouds', { n: 3, r: 52, life: 300, warn: 44, dmg: 0.7, color: '#ff6a2a' }) },
      phases: [{ at: 1, name: 'Stoke', attacks: ['stomp', 'rain'], idle: [32, 54] }, { at: 0.5, name: 'Meltdown', attacks: ['stomp', 'rain', 'ember', 'pool'], idle: [24, 42] }] },
    gloamweaver: { id: 'gloamweaver', pack: V, name: 'Gloamweaver', title: 'Who Spins the Dark', color: '#c070ff', r: 24, hp: 190, arena: 'arena_round', shape: 'wraith', contact: 3, minFloor: 21, unlockText: 'Void Lens',
      attacks: { vanish: L('blink', { where: 'random', ring: 10, color: '#c070ff' }), orbs: L('homing', { n: 4, speed: 1.7, dmg: 1, color: '#d890ff' }),
        helix: L('spiral', { arms: 3, frames: 80, speed: 2.2, color: '#c070ff' }), pillars: L('rain', { n: 7, r: 44, warn: 44, interval: 8, aimed: 0.75, color: '#c070ff' }) },
      phases: [{ at: 1, name: 'Spinning', attacks: ['vanish', 'orbs'], idle: [28, 48] }, { at: 0.5, name: 'Unravel', attacks: ['vanish', 'orbs', 'helix', 'pillars'], idle: [20, 38] }] },
  };
  Object.assign(ED.minibosses.defs, MINI);
  const relic = (key, def) => I.addRelic(key, Object.assign({ pack: V, mods: {} }, def));
  relic('bogheart', { id: 'bogheart', name: 'Bog Heart', rarity: 'rare', color: '#7a9a3a', mods: { regen: 3, poison: 0.15 }, max: 3, unlock: 'mini:bogtyrant', desc: 'Regenerate and poison what you hit. Mud no longer slows you. (Unlockable)' });
  relic('glaciershard', { id: 'glaciershard', name: 'Glacier Shard', rarity: 'rare', color: '#bff0ff', mods: { freeze: 0.15, def: 1, iceWalk: 1 }, max: 3, unlock: 'mini:rimeknight', desc: 'Chill foes, +1 defense, ice no longer makes you slide. (Unlockable)' });
  relic('slagcore', { id: 'slagcore', name: 'Slag Core', rarity: 'epic', color: '#ff7a2a', mods: { burn: 0.2, thorns: 2, lavaWalk: 1 }, max: 3, unlock: 'mini:slagsmelter', desc: 'Ignite foes, thorns, and lava and steam cannot hurt you. (Unlockable)' });
  relic('voidlens', { id: 'voidlens', name: 'Void Lens', rarity: 'epic', color: '#c070ff', mods: { crit: 0.1, luck: 1, speed: 0.04 }, max: 3, unlock: 'mini:gloamweaver', desc: 'Gravity wells pull you half as hard; sharper eyes and a little luck. (Unlockable)' });

  // ------------------------------------------------------------------ hazard systems
  const tileIdx = (tx, ty) => ty * C.COLS + tx;
  /** paint n blobs of a tile type on plain floor, clear of doors and the middle of the room */
  function paintBlobs(g, room, rt, rng, type, n, wmin, wmax, hmin, hmax) {
    const dirs = rt.dirs || [], painted = [];
    for (let a = 0, done = 0; a < 60 && done < n; a++) {
      const w = rng.int(wmin, wmax), h = rng.int(hmin, hmax), x0 = rng.int(3, 26 - w), y0 = rng.int(3, 15 - h);
      const cx = x0 + w / 2, cy = y0 + h / 2;
      if (Math.abs(cx - 15) < 4.5 && Math.abs(cy - 9) < 3.2) continue;                     // keep the middle clear (drops land there)
      let bad = false;
      for (const d of dirs) { const z = ED.rooms.DOOR_CLEAR[d]; if (x0 <= z[2] + 2 && x0 + w - 1 >= z[0] - 2 && y0 <= z[3] + 2 && y0 + h - 1 >= z[1] - 2) bad = true; }
      for (let y = y0; y < y0 + h && !bad; y++) for (let x = x0; x < x0 + w; x++) if (room.tiles[tileIdx(x, y)] !== T.FLOOR) { bad = true; break; }
      if (bad) continue;
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { room.tiles[tileIdx(x, y)] = type; painted.push(tileIdx(x, y)); }
      done++;
    }
    return painted;
  }
  function spots(rt, rng, n, minGap) {
    const out = [], cand = rt.spawnTiles.filter(t => Math.hypot(t.x - 480, t.y - 288) > 110);
    for (let a = 0; a < 80 && out.length < n && cand.length; a++) { const t = cand[rng.int(0, cand.length - 1)]; if (out.every(o => Math.hypot(o.x - t.x, o.y - t.y) > minGap)) out.push({ x: t.x, y: t.y }); }
    return out;
  }
  const dmgOf = (g, k) => k * g.dif.enemyDmg;
  const near = (g, x, y) => g.tileAt(x, y);
  const HZ = {
    mirewood: {
      setup(g, room, rt, rng, wi) { rt.mud = paintBlobs(g, room, rt, rng, T.MUD, 3 + (wi.depth > 1 ? 1 : 0), 3, 5, 2, 3); },
      tick(g, rt, wi) {
        const p = g.player;
        if (near(g, p.x, p.y) === T.MUD && !p.relics.bogheart && p.dashT <= 0) p.slowT = Math.max(p.slowT || 0, 4);
        if (g.frame % 4 === 0) for (const e of g.enemies) if (!e.dead && !e.boss && !e.big && !e.flying && near(g, e.x, e.y) === T.MUD) g.applyStatus(e, 'slow', { t: 10, f: 0.6 });
        if (rt.lockdown) {
          rt.sporeT = (rt.sporeT === undefined ? 150 : rt.sporeT) - 1;
          if (rt.sporeT <= 0) {
            rt.sporeT = Math.round((330 - wi.depth * 22) * (0.8 + g.rng.next() * 0.5));
            const a = g.rng.next() * TAU, d = 60 + g.rng.next() * 150;
            const x = U.clamp(p.x + Math.cos(a) * d, 90, 870), y = U.clamp(p.y + Math.sin(a) * d, 90, 486);
            const dx = (g.rng.next() - 0.5) * 0.3, dy = (g.rng.next() - 0.5) * 0.3;
            const z = g.hazardCircle(null, x, y, 46, 300, dmgOf(g, 1.0), { warn: g.tele(50), tick: 28, color: '#8ae06a', noInstant: true, slow: true });
            z.upd = (g2, zz) => { zz.x = U.clamp(zz.x + dx, 70, 890); zz.y = U.clamp(zz.y + dy, 70, 506); };
          }
        }
      },
      under(g, c, t, rt) { for (const i of rt.mud || []) { const x = (i % C.COLS) * 32, y = Math.floor(i / C.COLS) * 32; c.fillStyle = 'rgba(70,52,26,0.88)'; c.fillRect(x, y, 32, 32); c.fillStyle = 'rgba(120,96,50,0.4)'; c.fillRect(x + 4, y + 6 + Math.sin(t * 0.05 + i) * 2, 14, 3); if ((i * 7 + Math.floor(t / 20)) % 9 === 0) { c.strokeStyle = 'rgba(180,150,90,0.5)'; c.beginPath(); c.arc(x + 20, y + 20, 3 + (t % 20) / 8, 0, TAU); c.stroke(); } } },
    },
    glacial: {
      setup(g, room, rt, rng, wi) { rt.ice = paintBlobs(g, room, rt, rng, T.ICE, 2 + (wi.depth > 2 ? 1 : 0), 4, 7, 3, 4); },
      tick(g, rt, wi) {
        const p = g.player;
        if (!rt.lockdown) { rt.gust = null; return; }
        let gu = rt.gust;
        if (!gu) { rt.gust = gu = { state: 'idle', t: (rt.gustT0 = rt.gustT0 || 200) }; }
        if (gu.state === 'idle') {
          if (--gu.t <= 0) { const dir = g.rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); gu.state = 'warn'; gu.t = 70; gu.dx = dir[0]; gu.dy = dir[1]; g.sfx('telegraph'); g.addText(p.x, p.y - 34, 'GUST!', '#bff0ff', 14); }
        } else if (gu.state === 'warn') { if (--gu.t <= 0) { gu.state = 'blow'; gu.t = 80; } }
        else if (gu.state === 'blow') {
          const f = 1.5 + wi.depth * 0.12;
          if (p.dashT <= 0 && !p.dead) ED.phys.move(g, p, gu.dx * f, gu.dy * f);
          for (const e of g.enemies) if (!e.dead && !e.boss && !e.big) ED.phys.move(g, e, gu.dx * f * 0.7, gu.dy * f * 0.7);
          for (const b of g.eproj) if (!b.dead && !b.friendly) { b.x += gu.dx * 0.5; b.y += gu.dy * 0.5; }
          if (--gu.t <= 0) { gu.state = 'idle'; gu.t = Math.round((420 - wi.depth * 25) * (0.8 + g.rng.next() * 0.5)); }
        }
      },
      draw(g, c, t, rt) {
        const gu = rt.gust; if (!gu || gu.state === 'idle') return;
        c.save();
        if (gu.state === 'warn') { c.fillStyle = 'rgba(230,248,255,' + (0.35 + 0.25 * Math.sin(t * 0.4)) + ')'; c.font = 'bold 20px monospace'; c.textAlign = 'center'; c.fillText(gu.dx > 0 ? 'GUST  »»»' : gu.dx < 0 ? '«««  GUST' : gu.dy > 0 ? 'GUST  ▼ ▼ ▼' : 'GUST  ▲ ▲ ▲', 480, 70); }
        else {
          c.strokeStyle = 'rgba(230,248,255,0.4)'; c.lineWidth = 2; const adv = (t * 16) % 1100;
          for (let k = 0; k < 28; k++) { let x = (k * 173) % 960 + gu.dx * adv, y = (k * 97) % 576 + gu.dy * adv; x = ((x % 960) + 960) % 960; y = ((y % 576) + 576) % 576; c.beginPath(); c.moveTo(x, y); c.lineTo(x + gu.dx * 36, y + gu.dy * 36); c.stroke(); }
        }
        c.restore();
      },
    },
    foundry: {
      setup(g, room, rt, rng, wi) {
        rt.lava = paintBlobs(g, room, rt, rng, T.LAVA, 2, 2, 3, 2, 3);
        rt.spawnTiles = rt.spawnTiles.filter(t => room.tiles[tileIdx(t.tx, t.ty)] !== T.LAVA);
        rt.vents = spots(rt, rng, 3, 150).filter(s => room.tiles[tileIdx(Math.floor(s.x / 32), Math.floor(s.y / 32))] === T.FLOOR).map((s, k) => ({ x: s.x, y: s.y, t: 60 + k * 70 }));
      },
      tick(g, rt, wi) {
        const p = g.player;
        if (g.frame % 30 === 0) for (const pk of g.pickups) if (!pk.dead && g.tileAt(pk.x, pk.y) === T.LAVA) { pk.x = 480 + U.rnd(-30, 30); pk.y = 300 + U.rnd(-20, 20); }
        if (!rt.lockdown) return;
        for (const v of rt.vents || []) {
          if (--v.t <= 0) {
            v.t = Math.round((230 - wi.depth * 12) * (0.85 + g.rng.next() * 0.3));
            g.zoneCircle(null, v.x, v.y, 38, g.tele(46), p.relics.slagcore ? 0 : dmgOf(g, 2.0), { color: '#f0f0ff', burst: true, steam: true });
          }
        }
      },
      under(g, c, t, rt) { for (const v of rt.vents || []) { const hot = v.t < 50; c.fillStyle = '#1a1210'; c.beginPath(); c.arc(v.x, v.y, 11, 0, TAU); c.fill(); c.strokeStyle = hot ? '#ffd0a0' : '#5a3a2a'; c.lineWidth = 2; c.beginPath(); c.arc(v.x, v.y, 11, 0, TAU); c.stroke(); if (hot) { c.fillStyle = 'rgba(240,240,255,' + (0.15 + 0.2 * Math.sin(t * 0.5)) + ')'; c.beginPath(); c.arc(v.x, v.y - 6, 14, 0, TAU); c.fill(); } } },
    },
    void: {
      setup(g, room, rt, rng, wi) {
        if (rng.chance(0.55 + wi.depth * 0.08)) rt.dark = true;
        rt.wells = spots(rt, rng, wi.depth >= 3 ? 2 : 1, 260).map(s => ({ x: s.x, y: s.y, vx: (rng.next() - 0.5) * 0.9, vy: (rng.next() - 0.5) * 0.9, hit: 0 }));
      },
      tick(g, rt, wi) {
        if (!rt.lockdown) return;
        const p = g.player;
        for (const w of rt.wells || []) {
          w.x += w.vx; w.y += w.vy; if (w.x < 100 || w.x > 860) w.vx *= -1; if (w.y < 100 || w.y > 480) w.vy *= -1;
          const d = Math.hypot(w.x - p.x, w.y - p.y), lens = p.relics.voidlens ? 0.5 : 1;
          if (d < 140 && d > 4 && p.dashT <= 0 && !p.dead) { const f = (0.35 + 0.65 * (1 - d / 140)) * 1.15 * lens; ED.phys.move(g, p, (w.x - p.x) / d * f, (w.y - p.y) / d * f); }
          for (const e of g.enemies) if (!e.dead && !e.boss && !e.big && !e.flying) { const de = Math.hypot(w.x - e.x, w.y - e.y); if (de < 120 && de > 4) ED.phys.move(g, e, (w.x - e.x) / de * 0.5, (w.y - e.y) / de * 0.5); }
          if (d < 17 && (w.hit -= 1) <= 0) { w.hit = 40; g.hurtPlayer(dmgOf(g, 1.5), w.x, w.y, { zone: true, noKnock: true }); }
          if (w.hit > 0) w.hit--;
        }
      },
      draw(g, c, t, rt) { if (!rt.lockdown) return; for (const w of rt.wells || []) { c.save(); c.translate(w.x, w.y); for (let k = 0; k < 3; k++) { c.rotate(t * 0.04 + k); c.strokeStyle = 'rgba(190,100,255,' + (0.5 - k * 0.12) + ')'; c.lineWidth = 3 - k; c.beginPath(); c.arc(0, 0, 40 + k * 22 + Math.sin(t * 0.1 + k) * 4, 0.2, 4.4); c.stroke(); } c.fillStyle = '#05020c'; c.beginPath(); c.arc(0, 0, 15, 0, TAU); c.fill(); c.restore(); } },
    },
    storm: {
      setup() {},
      tick(g, rt, wi) {
        if (!rt.lockdown) return;
        rt.stormT = (rt.stormT === undefined ? 100 : rt.stormT) - 1;
        if (rt.stormT <= 0) {
          rt.stormT = Math.round((190 - wi.depth * 12) * (0.8 + g.rng.next() * 0.4));
          const p = g.player, lead = 20, x = U.clamp(p.x + (p.vx || 0) * lead + (g.rng.next() - 0.5) * 70, 60, 900), y = U.clamp(p.y + (p.vy || 0) * lead + (g.rng.next() - 0.5) * 70, 60, 516);
          g.zoneCircle(null, x, y, 38, g.tele(54), dmgOf(g, 2.0), { color: '#ffe14a', burst: true, onEnd: (g2, z) => { g2.fx.push({ x: z.x + U.rnd(-14, 14), y: 0, x2: z.x, y2: z.y, vx: 0, vy: 0, life: 10, max: 10, color: '#fff6a0', shape: 'bolt', drag: 1, grav: 0, size: 2 }); g2.flashScreen('#ffffff', 0.1); } });
        }
      },
    },
  };

  const mine = (g) => { const wi = ED.worlds.at(g.floorNum); return wi && wi.w.pack === V ? wi : null; };
  ED.hook('roomEnter', V, (g, room) => {
    const rt = g.rt; if (!rt || rt.worldDone) return; rt.worldDone = true;
    if (room.type !== 'normal' && room.type !== 'challenge' && room.type !== 'haunted') return;
    const wi = mine(g); if (!wi) return; rt.worldOn = true;
    const H = HZ[wi.w.id]; if (!H || !H.setup) return;
    H.setup(g, room, rt, rt.rng.fork('world'), wi);
    g.refreshCollision();
  });
  ED.hook('tick', V, (g) => {
    const rt = g.rt; if (!rt || !g.room) return;
    if (!rt.worldOn) return;
    const wi = mine(g), H = wi && HZ[wi.w.id]; if (H && H.tick) H.tick(g, rt, wi);
  });
  ED.hook('under', V, (g, c, t) => { const rt = g.rt; const wi = rt && rt.worldOn && mine(g), H = wi && HZ[wi.w.id]; if (H && H.under) H.under(g, c, t, rt); });
  ED.hook('draw', V, (g, c, t) => { const rt = g.rt; const wi = rt && rt.worldOn && mine(g), H = wi && HZ[wi.w.id]; if (H && H.draw) H.draw(g, c, t, rt); });
  ED.hook('hud', V, (g, c) => { const wi = mine(g); if (wi) ED.ui.text(c, wi.w.short, 728, 63, 9, wi.w.color, 'left', false); });
  ED.hook('intro', V, (g, c) => {
    const wi = mine(g), UI = ED.ui; if (!wi) return;
    if (wi.first) UI.shadow(c, 'WORLD ' + wi.number, C.W / 2, 112, 16, wi.w.color, 'center');
    UI.text(c, wi.w.rule, C.W / 2, g.floor.isMega ? 236 : 206, 12, wi.first ? '#e8e8f4' : '#8a8aa8', 'center', false);
    if (wi.first) { const nf = wi.w.enemies.filter(id => ED.enemyTypes[id].minFloor <= g.floorNum + 5).map(id => ED.enemyTypes[id].name); if (nf.length) UI.text(c, 'New foes: ' + nf.join(', '), C.W / 2, 388, 14, '#ffd24a', 'center'); }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

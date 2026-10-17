/* EMBERDEEP — pack_v25.js : v25 "WORLDS IV" — four more lands, one of them hidden.
 *
 *  THE HUSHED ARCHIVE    most foes sleep; noise wakes them; a blow struck on a sleeper counts for three (four in melee)               door: a memory (a run won)
 *  THE ASHEN CALDERA     vents erupt into lava lanes that cool into obsidian walls which stay — until a bomb or a hammer shatters them  door: the Obsidian sigil
 *  THE MIRAGE FLATS      decoy treasure, decoy foes, quicksand, sandstorms; bombs dispel mirages                                    door: a toll (gold or a heart)
 *  THE ABYSSAL BAZAAR    (hidden) stalls everywhere: pay — or steal, and the vendors turn on you                                    door: a memory (floor 20) — or a trapdoor in the Gilded Vault
 *  Reached through v17's roads (the Bazaar's trapdoor needs v21's machinery too); every land works with every other update off.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds, A = ED.ai, K = ED.landkit;
  const TAU = U.TAU, V = 'v25', { L, dmgOf, eyes } = K;
  const glow = K.glow, mk = (w) => K.mk(w, V), register = K.register, relic = K.relic(V), mini = K.mini(V), mod = K.mod(V);
  const idx = (tx, ty) => ty * C.COLS + tx, tileOf = (x, y) => idx(Math.floor(x / 32), Math.floor(y / 32));

  P.define({
    id: 'v25', name: 'WORLDS IV', tag: 'quiet, ash, mirages, a black market', color: '#c8a0ff',
    blurb: 'Four more lands (v17 gives them doors): the Hushed Archive (most foes sleep; strike one unseen for triple damage), the Ashen Caldera (lava lanes cool into obsidian walls that stay), the Mirage Flats (decoy treasure and decoy foes) and — hidden — the Abyssal Bazaar, a market where you may pay or steal. Four foes, a trait, a mini boss and a relic each; a second trapdoor hides in the Gilded Vault.',
  });

  // ==================================================================== the doors: a memory (a victory), the Obsidian sigil, a toll, a memory (floor 20) and a trapdoor
  const R_ = ED.route;
  if (R_) {
    R_.addSigil({ id: 'obsidian', pack: V, name: 'Obsidian', color: '#b08aff', mini: 'ironhorn', gain: 'It is black, cold and sharp, and it does not show your face.', door: 'A shard of black glass is wedged into the keystone.', rumour: 'a shard of black glass, broken from the Raging Bull' });
    R_.GLYPHS.sigil.obsidian = (c, r) => { c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.55, -r * 0.1); c.lineTo(r * 0.3, r * 0.9); c.lineTo(-r * 0.4, r * 0.7); c.lineTo(-r * 0.6, -r * 0.2); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.1, r * 0.8); c.moveTo(-r * 0.6, -r * 0.2); c.lineTo(r * 0.55, -r * 0.1); c.stroke(); };
  }
  const here = (g) => { const wi = g.floor && W.at(g.floorNum); return wi || null; };
  const isLand = (g, id) => { const wi = here(g); return !!(wi && wi.w.id === id); };

  // ==================================================================== 1. THE HUSHED ARCHIVE
  //  Foes are born asleep (7 in 10).  Noise wakes them: a dash (200px), a shot (170), a blast or a hammer (340), a wound (280), a kill that was not a sneak kill (150).  A woken foe SHOUTS (wakes sleepers within 150).
  //  A blow on a sleeper counts x3 (x4 in melee) — and that kill is silent.  Sleepers wake by themselves after 40 s, so nothing can stall; a sleeping foe still counts for the room and carries its key.
  const SLEEP = { id: 'sleeping', pack: V, hidden: true, name: 'Asleep', color: '#8a8aa8', glyph: 'z', desc: '',
    update(e, g) { if (e.asleep) { e.hold = true; e.noContact = true; e.sleepT -= g.ts; if (e.sleepT <= 0) wake(g, e, true); } else if (e.dormant) { e.hold = true; e.noContact = true; } } };
  ED.mods.sleeping = SLEEP;
  function wake(g, e, quiet) {
    if (!e.asleep || e.dead) return; e.asleep = false; e.hold = false; e.noContact = false; g.addText(e.x, e.y - e.r - 10, '!', '#ffd24a', 14); g.burst(e.x, e.y, 5, '#ffd24a', 2, 12);
    if (!quiet && !e.shouted) { e.shouted = true; for (const o of g.enemies) if (o !== e && o.asleep && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 150 * (o.lightSleeper ? 1.5 : 1)) wake(g, o, true); }
  }
  function noise(g, x, y, r) { if (!g.rt || !g.rt.arch) return; for (const e of g.enemies) if (e.asleep && !e.dead && Math.hypot(e.x - x, e.y - y) < r * (e.lightSleeper ? 2 : 1) * (e.deaf ? 0 : 1)) wake(g, e, false); }
  function archFilter(g, e, dmg, o) {
    if (e.asleep) {
      if (o.src === 'burn' || o.src === 'poison') e.wakeSoon = 2;                                                    // a slow burn wakes it but is no sneak attack
      else { dmg *= e.lightSleeper ? 1.2 : (o.src === 'melee' ? 4 : 3); e.sneakHit = true; if (!(e.hp - dmg <= 0)) e.wakeSoon = 2; }
    }
    if (e.def && e.def.onBigHit && dmg >= e.maxHp * 0.3 && e.hp - dmg > 0) e.def.onBigHit(e, g, dmg);
    return dmg;
  }
  const ARCH = {
    setup(g, room, rt, rng) { rt.arch = { sleepRng: rng.fork('sleep'), shotN: 0, dash0: false, swing0: 0 }; rt.onCrack = (gg, x, y, r) => noise(gg, x, y, 340); },
    tick(g, rt) {
      const a = rt.arch, p = g.player; if (!a) return;
      const dashing = p.dashT > 0; if (dashing && !a.dash0 && !(p.relics.softsoles | 0)) noise(g, p.x, p.y, 200); a.dash0 = dashing;
      if (g.pproj.length > a.shotN) { noise(g, p.x, p.y, 170); } a.shotN = g.pproj.length;
      for (const e of g.enemies) if (e.wakeSoon && --e.wakeSoon <= 0 && e.asleep && !e.dead) { e.wakeSoon = 0; wake(g, e, false); }
    },
    draw(g, c, t, rt) { for (const e of g.enemies) if (e.asleep && !e.dead) { c.fillStyle = 'rgba(8,6,20,0.28)'; c.beginPath(); c.arc(e.x, e.y, e.r + 1, 0, TAU); c.fill(); c.fillStyle = '#cfd0f0'; c.font = 'bold 11px monospace'; c.textAlign = 'center'; const k = (t * 0.04 + e.seed) % 3; c.fillText('z', e.x + 8 + k * 3, e.y - e.r - 4 - k * 4); c.fillText('Z', e.x + 14 + k * 3, e.y - e.r - 12 - k * 4); } if (g.player.stampT > 0) { const p = g.player; c.strokeStyle = 'rgba(255,90,80,' + (0.5 + 0.3 * Math.sin(t * 0.3)) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 20, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,90,80,0.8)'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText('STAMPED', p.x, p.y - 28); } },
  };
  ED.hook('spawn', V, (g, e) => {
    const rt = g.rt; if (!rt || !rt.arch || e.boss || e.nem || e.def.noSleep || !g.room || g.room.type !== 'normal' || !isLand(g, 'archive')) return;
    e.dmgFilter = archFilter; if (e.minion) return;
    if (rt.arch.sleepRng.chance(0.7)) { e.asleep = true; e.sleepT = 2400; e.hold = true; e.noContact = true; if (!e.mods.some(m => m.id === 'sleeping')) e.mods.push(SLEEP); }
  });
  ED.hook('kill', V, (g, e) => { const rt = g.rt; if (!rt || !rt.arch || e.asleep || e.dormant) return; noise(g, e.x, e.y, 150); });
  ED.hook('hurt', V, (g) => { const rt = g.rt; if (rt && rt.arch) noise(g, g.player.x, g.player.y, 280); });
  ED.hook('tick', V, (g) => { const p = g.player; if (p && p.stampT > 0) p.stampT--; });
  const f5 = mk('archive');
  register({
    cataloguer: f5({ name: 'Cataloguer', shape: 'square', color: '#9a8aa8', r: 14, hp: 30, speed: 0, dmg: 2, shot: 3, cost: 2.6, weight: 8, minFloor: 6, noSleep: true,
      desc: 'A hulking press that never sleeps. Every few seconds it slams a stamp where you stand: if the ink finds you, you are STAMPED for eight seconds — every sleeper in the room wakes and every foe moves faster. Step out of the circle.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); e.anchored = true; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if ((e.cd -= g.ts) <= 0) { e.cd = 230 / e.rate; const tx = U.clamp(p.x + (p.vx || 0) * 8, 70, 890), ty = U.clamp(p.y + (p.vy || 0) * 8, 70, 506); g.zoneCircle(e, tx, ty, 42, g.tele(50), 0, { color: '#c05050', burst: false, hurts: false, onEnd: (gg, z) => { gg.shake(4); gg.sfx('thud', { vol: 0.5 }); if (!p.dead && Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.hr * 0.5) { p.stampT = 480; gg.addText(p.x, p.y - 30, 'STAMPED', '#ff5a50', 13); for (const o of gg.enemies) if (!o.dead && !o.boss) { if (o.asleep) wake(gg, o, true); K.haste(o, 480, 1.2); } } } }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { c.fillStyle = '#4a3a58'; c.fillRect(e.x - e.r * 0.5, e.y + e.r * 0.2, e.r, e.r * 0.5); c.fillStyle = '#c05050'; c.fillRect(e.x - e.r * 0.3, e.y + e.r * 0.45, e.r * 0.6, e.r * 0.2); eyes(c, e, 0.35); } }),
    inkblot: f5({ name: 'Inkblot', shape: 'blob', color: '#2a2a48', r: 13, hp: 24, speed: 1.2, dmg: 3, cost: 2.0, weight: 11, minFloor: 6,
      desc: 'A pool of living ink. A blow that takes a third of its life at once is a loud one: it splits in two (once), and the crash wakes the room. Many small cuts leave it whole.',
      init(e, g) { e.cd = 70; },
      onBigHit(e, g) { if ((e.gen | 0) >= 1 || e.splitNow) return; e.splitNow = true; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.splitNow && !e.dead) { e.splitNow = false; for (const sg of [-1, 1]) { const m = g.spawnEnemy('inkblot', e.x + sg * 16, e.y, { silent: true, minion: true, gen: (e.gen | 0) + 1, scale: 0.75, hp: Math.max(4, e.hp * 0.5) }); m.maxHp = m.hp; m.asleep = false; } g.burst(e.x, e.y, 14, '#2a2a48', 3, 22); g.sfx('crack', { vol: 0.5 }); noise(g, e.x, e.y, 220); e.hp = 0; e.noLoot = true; e.minion = true; g.killEnemy(e); return; }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.1 + e.seed) * 0.5);
      },
      draw(c, e) { c.fillStyle = 'rgba(160,160,255,0.35)'; c.beginPath(); c.ellipse(e.x - e.r * 0.3, e.y - e.r * 0.35, e.r * 0.3, e.r * 0.18, -0.5, 0, TAU); c.fill(); eyes(c, e, 0.35); } }),
    pagewraith: f5({ name: 'Page Wraith', shape: 'ghost', color: '#e0d8c0', r: 11, hp: 14, speed: 1.3, dmg: 2, shot: 3, cost: 2.2, weight: 9, minFloor: 7, flying: true,
      desc: 'A sheet of paper with a grudge: it flits from shelf to shelf, rustling — every flit wakes sleepers within reach — and slices at you with a fan of paper cuts between hops.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); e.flit = 90 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 150 / e.rate; for (let k = -1; k <= 1; k++) g.eShot(e, e.aim + k * 0.2, 3.2, { dmg: 1, color: '#f0e8d0', r: 4 }); g.sfx('shoot', { vol: 0.4 }); } return; }
        if ((e.flit -= g.ts) <= 0) { e.flit = 170 / e.rate; let best = null; for (let k = 0; k < 6; k++) { const a = g.rng.next() * TAU, d = 200 + g.rng.next() * 150, nx = U.clamp(p.x + Math.cos(a) * d, 70, 890), ny = U.clamp(p.y + Math.sin(a) * d, 70, 506); if (!ED.phys.blocked(g, nx, ny, 10, true, false)) { best = [nx, ny]; break; } } if (best) { g.burst(e.x, e.y, 8, '#f0e8d0', 2.5, 16); e.x = best[0]; e.y = best[1]; g.burst(e.x, e.y, 8, '#f0e8d0', 2.5, 16); noise(g, e.x, e.y, 170); g.sfx('ui', { vol: 0.25 }); } }
        A.kite(g, e, i, 230, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0 && i.d < 360) { e.state = 'wind'; e.windup = g.tele(22); e.aim = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 260, e.y + Math.sin(i.ang) * 260, 10, e.windup, 0, { color: '#f0e8d0', hurts: false, burst: false }); }
      },
      draw(c, e) { c.strokeStyle = 'rgba(40,30,20,0.6)'; c.lineWidth = 1; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(e.x - e.r * 0.5, e.y - e.r * 0.2 + k * 4); c.lineTo(e.x + e.r * 0.4, e.y - e.r * 0.2 + k * 4); c.stroke(); } eyes(c, e, 0.3); } }),
    bookwyrm: f5({ name: 'Bookwyrm', shape: 'square', color: '#7a5a3a', r: 12, hp: 34, speed: 1.4, dmg: 4, shot: 3, cost: 3.0, weight: 8, minFloor: 8, noSleep: true,
      desc: 'A stack of old books that is not a stack of old books. It lies dormant — stone-deaf, easy to hurt — until you come within a few steps or hit it; then it bursts and gives chase. A blow from the dark counts for much.',
      init(e, g) { e.dormant = true; e.hold = true; e.noContact = true; e.deaf = true; e.sleepT = 2400; e.asleep = false; e.cd = 60; if (!e.mods.some(m => m.id === 'sleeping')) e.mods.push(SLEEP); },
      onBigHit() {},
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.dormant) return;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = 'dash'; e.sT = 14; g.sfx('lunge'); } return; }
        if (e.state === 'dash') { A.walk(g, e, e.dAng, 5.0 * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 110 / e.rate; } return; }
        A.chase(g, e, i, e.curSpeed, 0); if ((e.cd -= g.ts) <= 0 && i.d < 190) { e.state = 'wind'; e.windup = g.tele(24); e.dAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 200, e.y + Math.sin(i.ang) * 200, 22, e.windup, 0, { color: '#c89a5a', hurts: false, burst: false }); }
      },
      draw(c, e) { if (e.dormant) { c.fillStyle = '#5a3a1a'; c.fillRect(e.x - e.r * 0.8, e.y - e.r * 0.2, e.r * 1.6, e.r * 0.4); c.fillStyle = '#3a5a8a'; c.fillRect(e.x - e.r * 0.7, e.y - e.r * 0.7, e.r * 1.4, e.r * 0.45); c.fillStyle = '#8a2a2a'; c.fillRect(e.x - e.r * 0.5, e.y + e.r * 0.2, e.r, e.r * 0.4); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(e.x - e.r * 0.7, e.y - e.r * 0.62, e.r * 0.5, 2); } else { c.fillStyle = '#f0e0b0'; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r); c.lineTo(e.x + Math.cos(e.face + sg * 0.5) * e.r * 1.5, e.y + Math.sin(e.face + sg * 0.5) * e.r * 1.5); c.lineTo(e.x + Math.cos(e.face + sg * 0.9) * e.r, e.y + Math.sin(e.face + sg * 0.9) * e.r); c.fill(); } eyes(c, e, 0.35); } } }),
  });
  // a dormant Bookwyrm bursts when you come near or hit it
  ED.hook('tick', V, (g) => { for (const e of g.enemies) if (e.type === 'bookwyrm' && e.dormant && !e.dead) { const near = Math.hypot(e.x - g.player.x, e.y - g.player.y) < 64, hit = e.hp < e.maxHp - 0.01; e.sleepT -= g.ts; if (near || hit || e.sleepT <= 0) { e.dormant = false; e.hold = false; e.noContact = false; e.deaf = false; g.burst(e.x, e.y, 16, '#f0e0b0', 3.5, 24); g.shake(4); g.sfx('crack'); g.addText(e.x, e.y - e.r - 8, '!', '#ffd24a', 15); } } });
  // sleeping foes take triple damage even the dormant lump (it counts as asleep for the sneak rule)
  ED.hook('spawn', V, (g, e) => { if (e.type === 'bookwyrm' && g.rt && g.rt.arch) { e.dmgFilter = (gg, x, dmg, o) => { if (x.dormant) { dmg *= (o.src === 'melee' ? 4 : 3); } return dmg; }; } });
  mod({ id: 'lightsleeper', name: 'Light sleeper', color: '#c8c0ff', glyph: 'z', desc: 'Wakes at half the noise and takes almost nothing extra from a sneak attack',
    apply(e) { e.lightSleeper = true; } });
  const librarian = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#3a2a4a'; c.beginPath(); c.moveTo(x - r * 0.85, y + r); c.lineTo(x - r * 0.4, y - r * 0.4); c.lineTo(x + r * 0.4, y - r * 0.4); c.lineTo(x + r * 0.85, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(x, y - r * 0.6, r * 0.42, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = '#c8a860'; c.lineWidth = 2; c.beginPath(); c.arc(x - r * 0.16, y - r * 0.62, r * 0.12, 0, TAU); c.arc(x + r * 0.16, y - r * 0.62, r * 0.12, 0, TAU); c.moveTo(x - r * 0.04, y - r * 0.62); c.lineTo(x + r * 0.04, y - r * 0.62); c.stroke(); c.lineWidth = 3; c.strokeStyle = dk;
    c.fillStyle = '#e8dcc0'; c.fillRect(x - r * 0.9, y + r * 0.1, r * 0.5, r * 0.6); c.fillStyle = '#8a2a2a'; c.fillRect(x - r * 0.9, y + r * 0.1, r * 0.1, r * 0.6); c.fillStyle = '#f0e8d0'; c.beginPath(); c.arc(x, y - r * 1.0, r * 0.16, Math.PI, 0); c.fill();
  };
  ED.bossDraw.librarian = librarian;
  mini({ id: 'librarian', name: 'The Librarian', title: 'Who Keeps the Silence', color: '#d8b878', r: 25, hp: 205, arena: 'arena_pillars', shape: 'librarian', minFloor: 6, unlockText: 'Soft Soles',
    attacks: { shh: L('radial', { n: 14, reps: 3, gap: 12, speed: 2.4, rot: 0.2, color: '#d8b878' }), stack: L('bars', { n: 3, thick: 44, gapW: 170, warn: 66, color: '#d8b878' }), pages: L('fan', { n: 6, spread: 0.22, reps: 2, speed: 3, color: '#f0e8d0' }), slam: L('slamRing', { r: 84, tele: 36, rings: 2, speed: 3, color: '#d8b878' }), hush: L('summon', { types: ['pagewraith'], n: 2, max: 3, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'Silence, Please', attacks: ['shh', 'pages', 'slam'], idle: [34, 56] }, { at: 0.5, name: 'Overdue', attacks: ['stack', 'shh', 'pages', 'hush', 'slam'], idle: [24, 44] }] });
  relic('softsoles', { id: 'softsoles', name: 'Soft Soles', rarity: 'rare', color: '#d8b878', mods: { speed: 0.05, dashCd: -0.08, luck: 1 }, max: 1, unlock: 'mini:librarian', desc: 'Quicker feet, a quicker dash — and in the Hushed Archive your dash makes no sound at all. (Unlockable)' });
  W.add({ id: 'archive', name: 'The Hushed Archive', short: 'HUSHED ARCHIVE', color: '#d8b878', pack: V, native: 6, tiers: [1, 99], risk: 0, gate: { kind: 'legacy', id: 'victor' },
    rule: 'Most foes sleep. A dash, a shot, a blast or a wound wakes those near it; a blow on a sleeper counts triple (quadruple in melee) and a clean kill is silent.',
    enemies: ['cataloguer', 'inkblot', 'pagewraith', 'bookwyrm'], mod: 'lightsleeper', minis: ['librarian'], hz: ARCH, music: { scale: 2, root: 36, bpm: -20, prog: [0, 3, 0, 4] },
    theme: { name: 'The Hushed Archive', floorA: '#2e2622', floorB: '#352a24', wall: '#4a3a2c', wallTop: '#8a6a48', accent: '#d8b878', glow: '#f0d8a0', fog: '#100b08', skin: { pattern: 'parquet', wall: 'shelves', ambience: 'motes', ambient: '#d8c0a0', dim: 0.12 } } });

  // ==================================================================== 2. THE ASHEN CALDERA
  //  Vents erupt (a 1.2 s warning).  A lava lane burns for six seconds and then cools into OBSIDIAN: walls that stay, block movement and shots both ways, and shatter to a bomb or a hammer.
  //  A lane never seals a door, a pickup, a foe you must reach or you: a lane that would is left as floor.
  const OBS_MAX = 30;
  function walkable(g, tiles, i) { const t = tiles[i]; return t !== T.WALL && t !== T.ROCK && t !== T.PIT; }
  /** the walkable tiles reachable from `start` (the hero's tile), optionally pretending the tiles in `skip` are walls */
  function reach(g, start, skip) {
    const tiles = g.room.tiles, seen = new Uint8Array(C.COLS * C.ROWS), q = [start]; seen[start] = 1;
    while (q.length) { const i = q.pop(), x = i % C.COLS, y = (i / C.COLS) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C.COLS || ny >= C.ROWS) continue; const j = idx(nx, ny); if (seen[j] || (skip && skip.has(j)) || !walkable(g, tiles, j)) continue; seen[j] = 1; q.push(j); } }
    return seen;
  }
  /** would turning `cand` (tile indices) into walls cut anything off?  Nothing that the hero can reach now may become unreachable (no new pockets: a foe that spawns in one could never be killed) */
  function stillConnected(g, rt, cand) {
    const set = new Set(cand), start = tileOf(g.player.x, g.player.y); if (set.has(start)) return false;
    const a = reach(g, start, null), b = reach(g, start, set);
    for (let i = 0; i < a.length; i++) if (a[i] && !b[i] && !set.has(i)) return false;
    return true;
  }
  /** is this tile in the clear zone in front of one of the room's doors? (`pad` widens the zone) */
  const inDoorZone = (rt, x, y, pad) => (rt.dirs || []).some(d => { const z = ED.rooms.DOOR_CLEAR[d]; return x >= z[0] - pad && x <= z[2] + pad && y >= z[1] - pad && y <= z[3] + pad; });
  /** something stands on (or lies on, or is the point of) this tile: it must never be walled over */
  function entityOn(g, i) {
    const x = (i % C.COLS) * 32 + 16, y = ((i / C.COLS) | 0) * 32 + 16; if (Math.hypot(g.player.x - x, g.player.y - y) < 34) return true; if (Math.abs(x - 480) < 100 && Math.abs(y - 288) < 70) return true;       // the middle of the room is where rewards and stairs appear
    for (const e of g.enemies) if (!e.dead && !e.flying && Math.hypot(e.x - x, e.y - y) < e.r + 20) return true;
    for (const k of g.pickups) if (!k.dead && Math.hypot(k.x - x, k.y - y) < 26) return true; for (const it of g.inters) if (!it.dead && Math.hypot(it.x - x, it.y - y) < 30) return true; for (const q of g.props) if (!q.dead && Math.hypot(q.x - x, q.y - y) < q.r + 20) return true;
    return false;
  }
  function laneTiles(g, rt, rng, v) {
    const horiz = rng.chance(0.5), len = rng.int(5, 7), tx = Math.floor(v.x / 32), ty = Math.floor(v.y / 32), out = [];
    for (let a = 0; a < len; a++) for (let b = 0; b < 2; b++) { const x = tx + (horiz ? a - Math.floor(len / 2) : b), y = ty + (horiz ? b : a - Math.floor(len / 2)); if (x < 2 || y < 2 || x > C.COLS - 3 || y > C.ROWS - 3) continue; const px = x * 32 + 16, py = y * 32 + 16; if (Math.abs(px - 480) < 100 && Math.abs(py - 288) < 70) continue; if (inDoorZone(rt, x, y, 2)) continue; const t = g.room.tiles[idx(x, y)]; if (t === T.FLOOR || t === T.RUG) out.push(idx(x, y)); }
    return { tiles: out, horiz };
  }
  function lava(g, rt, tiles, life) { const room = g.room, use = tiles.filter(i => room.tiles[i] === T.FLOOR || room.tiles[i] === T.RUG); if (!use.length) return; for (const i of use) room.tiles[i] = T.LAVA; g.refreshCollision(); rt.cal.lanes.push({ idx: use, t: life || 360 }); }
  function cool(g, rt, L) {
    const room = g.room, s = rt.cal, now = L.idx.filter(i => room.tiles[i] === T.LAVA); if (!now.length) return;
    for (const i of now) room.tiles[i] = T.FLOOR;                                              // the lava goes out first
    let cand = now.filter(i => !entityOn(g, i)).slice(0, Math.max(0, OBS_MAX - s.obs.size));        // a room never fills with glass
    if (cand.length && !stillConnected(g, rt, cand)) { const half = cand.filter((i, k) => k % 2 === 0); cand = stillConnected(g, rt, half) ? half : []; }
    for (const i of cand) { room.tiles[i] = T.WALL; s.obs.add(i); }
    g.refreshCollision(); if (cand.length) { g.sfx('crack', { vol: 0.4 }); for (const i of cand) g.burst((i % C.COLS) * 32 + 16, ((i / C.COLS) | 0) * 32 + 16, 3, '#2a2040', 2, 12); }
  }
  function shatter(g, rt, x, y, r) {
    const s = rt.cal; if (!s || !s.obs.size) return; const room = g.room; let n = 0;
    for (const i of [...s.obs]) { const px = (i % C.COLS) * 32 + 16, py = ((i / C.COLS) | 0) * 32 + 16; if (Math.hypot(px - x, py - y) < r + 20) { room.tiles[i] = T.FLOOR; s.obs.delete(i); n++; g.burst(px, py, 8, '#6a5a8a', 3, 18); } }
    if (n) { g.refreshCollision(); g.sfx('crack'); g.shake(3); g.addText(x, y - 20, 'SHATTERED', '#b08aff', 11); }
  }
  function pillar(g, x, y) { const rt = g.rt; if (!rt || !rt.cal) return false; const i = tileOf(x, y), t = g.room.tiles[i]; if ((t !== T.FLOOR && t !== T.RUG) || inDoorZone(rt, i % C.COLS, (i / C.COLS) | 0, 0) || entityOn(g, i) || !stillConnected(g, rt, [i])) return false; g.room.tiles[i] = T.WALL; rt.cal.obs.add(i); g.refreshCollision(); g.burst(x, y, 8, '#6a5a8a', 3, 16); return true; }
  const CAL = {
    setup(g, room, rt, rng, wi) { rt.cal = { vents: (room.type === 'normal' || room.type === 'challenge' ? W.spots(rt, rng, 3, 200) : []).map(s => ({ x: s.x, y: s.y, t: 150 + rng.int(0, 180) })), obs: new Set(), lanes: [], rng: rng.fork('eruption') }; rt.onCrack = (gg, x, y, r) => shatter(gg, rt, x, y, r + 20); },
    tick(g, rt) {
      const s = rt.cal; if (!s) return; const stoked = g.enemies.some(e => e.type === 'ventwarden' && !e.dead);
      if (rt.lockdown) for (const v of s.vents) { v.t -= g.ts; if (v.t > 0) continue; v.t = (stoked ? 170 : 360) + s.rng.int(0, 80); const ln = laneTiles(g, rt, s.rng, v); if (!ln.tiles.length) continue; const xs = ln.tiles.map(i => (i % C.COLS) * 32), ys = ln.tiles.map(i => ((i / C.COLS) | 0) * 32), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) + 32 - x0, h = Math.max(...ys) + 32 - y0; g.zoneRect(null, x0, y0, w, h, g.tele(72), dmgOf(g, 1.8), { color: '#ff6a2a', burst: true, onEnd: (gg) => { gg.shake(5); gg.sfx('boom', { vol: 0.4 }); lava(gg, rt, ln.tiles, 360); } }); g.sfx('telegraph', { vol: 0.5 }); }
      for (const L of s.lanes) if ((L.t -= g.ts) <= 0 && !L.done) { L.done = true; cool(g, rt, L); } U.compact(s.lanes, L => !L.done);
    },
    under(g, c, t, rt) {
      const s = rt.cal; if (!s) return; c.save();
      for (const v of s.vents) { c.fillStyle = '#120a08'; c.beginPath(); c.ellipse(v.x, v.y, 15, 10, 0, 0, TAU); c.fill(); const hot = v.t < 70; c.strokeStyle = hot ? 'rgba(255,140,60,' + (0.5 + 0.4 * Math.sin(t * 0.5)) + ')' : 'rgba(255,100,40,0.35)'; c.lineWidth = hot ? 3 : 2; c.beginPath(); c.ellipse(v.x, v.y, 15, 10, 0, 0, TAU); c.stroke(); if (hot) glow(c, v.x, v.y, 36, '#ff7a2a', 0.5); }
      for (const i of s.obs) { const x = (i % C.COLS) * 32, y = ((i / C.COLS) | 0) * 32, gr = c.createLinearGradient(x, y, x + 32, y + 32); gr.addColorStop(0, '#4a3c6a'); gr.addColorStop(1, '#120c20'); c.fillStyle = gr; c.fillRect(x, y, 32, 32); c.fillStyle = 'rgba(190,170,255,0.35)'; c.fillRect(x + 2, y + 2, 12, 2); c.fillRect(x + 2, y + 2, 2, 12); c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1.5; c.strokeRect(x + 0.5, y + 0.5, 31, 31); c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.moveTo(x + 8, y + 28); c.lineTo(x + 20, y + 10); c.lineTo(x + 24, y + 14); c.lineTo(x + 14, y + 28); c.fill(); }
      c.restore();
    },
  };
  const f6 = mk('caldera');
  register({
    slagback: f6({ name: 'Slagback', shape: 'blob', color: '#8a4a2a', r: 14, hp: 30, speed: 0.9, dmg: 3.5, shot: 4, cost: 3.0, weight: 8, minFloor: 7,
      desc: 'A heap of cooling slag that curls into a ball and rolls at you down a telegraphed line, bouncing off walls and leaving a molten trail behind it. The trail cools into obsidian: it also leaves you walls.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt; e.face = i.ang;
        if (e.state === 'roll') { const m = A.walk(g, e, e.rAng, 3.3 * e.spdMul); if (m.bx) { e.rAng = Math.PI - e.rAng; e.bounces++; g.shake(2); } if (m.by) { e.rAng = -e.rAng; e.bounces++; g.shake(2); } if ((e.trailT = (e.trailT || 0) + g.ts) >= 5) { e.trailT = 0; if (rt && rt.cal) lava(g, rt, [tileOf(e.x, e.y)], 300); else g.hazardCircle(e, e.x, e.y, 16, 200, dmgOf(g, 0.8), { color: '#ff7a2a', tick: 24 }); } if ((e.sT -= g.ts) <= 0 || e.bounces >= 3) { e.state = 'tired'; e.sT = 50; e.vuln = 1.4; } return; }
        if (e.state === 'tired') { e.sT -= g.ts; if (e.sT <= 0) { e.state = null; e.vuln = 1; e.cd = 140 / e.rate; } return; }
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup > 10) e.rAng = i.ang; if (e.windup <= 0) { e.state = 'roll'; e.sT = 70; e.bounces = 0; e.trailT = 0; g.sfx('lunge'); } return; }
        A.chase(g, e, i, e.curSpeed, 0); if ((e.cd -= g.ts) <= 0 && i.d < 320) { e.state = 'wind'; e.windup = g.tele(40); e.rAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 420, e.y + Math.sin(i.ang) * 420, 26, e.windup, 0, { color: '#ff8a3a', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { c.fillStyle = e.state === 'roll' ? '#ffb04a' : '#3a1a10'; for (let k = 0; k < 4; k++) { const a = k * 1.7 + e.t * (e.state === 'roll' ? 0.4 : 0.02); c.fillRect(e.x + Math.cos(a) * e.r * 0.5 - 2, e.y + Math.sin(a) * e.r * 0.5 - 2, 4, 4); } if (e.state === 'tired') { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('SPENT', e.x, e.y - e.r - 6); } eyes(c, e, 0.35); } }),
    rockhurler: f6({ name: 'Rockhurler', shape: 'hex', color: '#7a6a6a', r: 13, hp: 26, speed: 0.85, dmg: 3, shot: 3.5, cost: 2.6, weight: 9, minFloor: 7,
      desc: 'Keeps its distance and hurls boulders that bounce twice off the walls. A boulder that finds nothing to hit comes to rest as an obsidian pillar, and a pillar stops a shot as well as a wall does.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; e.aim = i.ang; if (e.windup <= 0) { e.state = null; e.cd = 170 / e.rate; const b = g.eShot(e, e.aim, 2.2, { dmg: 1.3, color: '#a89898', r: 9, kind: 'orb', bounce: 2, life: 170, onDie: (gg, bb) => { if (K.hitPlayer(gg, bb)) return; pillar(gg, bb.x, bb.y); } }); g.sfx('shoot', { vol: 0.5 }); } return; }
        A.kite(g, e, i, 250, e.curSpeed, 0.8); if ((e.cd -= g.ts) <= 0 && i.d < 380 && A.clear(g, e.x, e.y, g.player.x, g.player.y, false)) { e.state = 'wind'; e.windup = g.tele(34); e.aim = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 300, e.y + Math.sin(i.ang) * 300, 14, e.windup, 0, { color: '#c8b8b8', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { c.fillStyle = '#5a4a4a'; c.beginPath(); c.arc(e.x + Math.cos(e.face) * e.r * 0.8, e.y + Math.sin(e.face) * e.r * 0.8, e.r * 0.4, 0, TAU); c.fill(); eyes(c, e, 0.35); } }),
    cindermoth: f6({ name: 'Cinder Moth', shape: 'diamond', color: '#a8a0a0', r: 8, hp: 6, speed: 1.8, dmg: 2, cost: 1.1, weight: 12, minFloor: 6, group: 4, flying: true,
      desc: 'A swarm of ash-grey moths that wheel around you and dive in turns. Each one that dies bursts into a small cloud of hot ash that stings for a few seconds.',
      init(e, g) { e.ang0 = g.rng.next() * TAU; e.cd = 40 + g.rng.int(0, 100); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'dive') { A.walk(g, e, e.dAng, 4.2 * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 120 / e.rate; } return; }
        e.ang0 += 0.03 * g.ts; const tx = p.x + Math.cos(e.ang0) * 120, ty = p.y + Math.sin(e.ang0) * 100; A.walk(g, e, Math.atan2(ty - e.y, tx - e.x), Math.min(e.curSpeed * 1.2, Math.hypot(tx - e.x, ty - e.y)));
        if ((e.cd -= g.ts) <= 0 && i.d < 260) { e.state = 'dive'; e.sT = 16; e.dAng = i.ang; g.sfx('lunge', { vol: 0.2 }); }
      },
      onDeath(e, g) { g.hazardCircle(e, e.x, e.y, 24, 150, dmgOf(g, 0.5), { color: '#9a9090', tick: 30 }); },
      draw(c, e) { c.fillStyle = 'rgba(200,190,190,0.5)'; for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(e.x + sg * e.r * 0.8, e.y, e.r * 0.8, e.r * 0.35, sg * (0.6 + Math.sin(e.t * 1.2) * 0.35), 0, TAU); c.fill(); } } }),
    ventwarden: f6({ name: 'Vent Warden', shape: 'square', color: '#9a5a3a', r: 14, hp: 36, speed: 0, dmg: 3, shot: 3, cost: 3.2, weight: 7, minFloor: 8,
      desc: 'Tends the vents from a stone seat and keeps them boiling: while it lives they erupt twice as often. Kill it and the caldera sulks into a slow, heavy rhythm.',
      init(e, g) { e.cd = 100 + g.rng.int(0, 60); e.anchored = true; },
      update(e, g) { const i = A.info(g, e); e.face = i.ang; if ((e.cd -= g.ts) <= 0) { e.cd = 160 / e.rate; const n = 8, off = g.rng.next() * TAU; for (let k = 0; k < n; k++) g.eShot(e, off + k * TAU / n, 2.2, { dmg: 0.9, color: '#ff9a4a', r: 5 }); g.sfx('shoot', { vol: 0.4 }); } },
      draw(c, e) { c.fillStyle = '#1a0a06'; c.fillRect(e.x - e.r * 0.5, e.y - e.r * 0.2, e.r, e.r * 0.5); c.fillStyle = '#ff8a3a'; c.fillRect(e.x - e.r * 0.4, e.y - e.r * 0.1, e.r * 0.8, e.r * 0.2 + Math.sin(e.t * 0.2) * 2); eyes(c, e, 0.4); } }),
  });
  mod({ id: 'magmatic', name: 'Magmatic', color: '#ff8a3a', glyph: '♨', desc: 'Leaves lava where it walks and a pool where it falls',
    update(e, g) { const rt = g.rt; if (!rt || !rt.cal) return; if ((e.lavaT = (e.lavaT || 0) + g.ts) >= 28) { e.lavaT = 0; lava(g, rt, [tileOf(e.x, e.y)], 240); } },
    onDeath(e, g) { const rt = g.rt; if (rt && rt.cal) lava(g, rt, W.tilesNear(g, e.x, e.y, 40), 240); else g.hazardCircle(e, e.x, e.y, 36, 200, dmgOf(g, 0.8), { color: '#ff7a2a', tick: 24 }); } });
  const ashensmith = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#3a2a24'; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.95, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#d8b090'; c.beginPath(); c.arc(x, y - r * 0.5, r * 0.45, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#1a1210'; c.fillRect(x - r * 0.5, y - r * 0.75, r, r * 0.22);
    c.fillStyle = '#6a4a38'; c.fillRect(x - r * 0.6, y + r * 0.1, r * 1.2, r * 0.6); c.save(); c.translate(x, y); c.rotate(face); c.fillStyle = '#5a5a68'; c.fillRect(r * 0.5, -r * 0.08, r * 1.0, r * 0.16); c.fillStyle = '#7a7a8a'; c.fillRect(r * 1.3, -r * 0.4, r * 0.5, r * 0.8); c.fillStyle = 'rgba(255,140,60,0.8)'; c.fillRect(r * 1.3, -r * 0.4, r * 0.5, r * 0.18); c.restore();
    glow(c, x, y + r * 0.3, r * 0.6, '#ff7a2a', 0.15);
  };
  ED.bossDraw.ashensmith = ashensmith;
  mini({ id: 'ashensmith', name: 'The Ashen Smith', title: 'Who Tempers the Dark', color: '#ff8a3a', r: 27, hp: 215, arena: 'arena_cross', shape: 'ashensmith', minFloor: 8, unlockText: 'Tongs of Ash',
    attacks: { hammer: L('slamRing', { r: 90, tele: 36, rings: 2, speed: 3, color: '#ff8a3a' }), sparks: L('rain', { n: 9, r: 44, warn: 48, interval: 7, aimed: 0.7, color: '#ffb04a' }), bars: L('bars', { n: 3, thick: 46, gapW: 165, warn: 66, color: '#ff8a3a' }), fan: L('fan', { n: 5, spread: 0.24, reps: 2, speed: 2.8, color: '#ffb04a' }), moths: L('summon', { types: ['cindermoth'], n: 3, max: 5, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'At the Anvil', attacks: ['hammer', 'fan', 'moths'], idle: [32, 54] }, { at: 0.5, name: 'White Heat', attacks: ['hammer', 'sparks', 'bars', 'fan', 'moths'], idle: [22, 40] }] });
  relic('tongsofash', { id: 'tongsofash', name: 'Tongs of Ash', rarity: 'rare', color: '#ff8a3a', mods: { burn: 0.12, dmg: 0.05 }, max: 2, unlock: 'mini:ashensmith', desc: 'Your blows ignite what they strike, and hit a little harder. (Unlockable)' });
  W.add({ id: 'caldera', name: 'The Ashen Caldera', short: 'ASHEN CALDERA', color: '#ff8a3a', pack: V, native: 6, tiers: [2, 99], risk: 2, gate: { kind: 'sigil', id: 'obsidian' },
    rule: 'Vents erupt into lava lanes. They burn for six seconds, then cool into obsidian walls that stay — until a bomb or a hammer shatters them.',
    enemies: ['slagback', 'rockhurler', 'cindermoth', 'ventwarden'], mod: 'magmatic', minis: ['ashensmith'], hz: CAL, music: { scale: 3, root: 34, bpm: 4, prog: [0, 5, 3, 2] },
    theme: { name: 'The Ashen Caldera', floorA: '#2c1d1a', floorB: '#342320', wall: '#3a2a2a', wallTop: '#7a4a38', accent: '#ff8a3a', glow: '#ffa060', fog: '#140806', skin: { pattern: 'scorch', wall: 'cave', ambience: 'embers', ambient: '#c89070', dim: 0.06, liquid: 'lava' } } });

  // ==================================================================== 3. THE MIRAGE FLATS
  //  A pile of gold that shimmers is a lie (touch it and an ambush springs); some of the foes are not there either (harmless, they only soak your shots).  Quicksand drags toward its centre (a dash escapes); sandstorms hide the shimmer; a bomb dispels mirages in a radius.
  ED.pickupImpl.mirage = {
    collect(g, k) { const rt = g.rt; g.sfx('deny'); g.addText(k.x, k.y - 18, 'A MIRAGE!', '#ffd070', 13); g.burst(k.x, k.y, 14, '#ffd070', 3, 22); const ids = (W.byId.mirage && W.byId.mirage.enemies) || [], n = 2; for (let q = 0; q < n; q++) { const a = (q / n) * TAU + 0.6, id = ids[q % ids.length] || 'chaser'; g.queueSpawn(id, U.clamp(k.x + Math.cos(a) * 70, 80, 880), U.clamp(k.y + Math.sin(a) * 70, 80, 490), { quick: true, flyer: !!(ED.enemyTypes[id] && ED.enemyTypes[id].flying) }); } return true; },
    draw(c, k, t, bob) { const hide = ED.game && ED.game.rt && ED.game.rt.mirage && ED.game.rt.mirage.hide; c.save(); c.globalAlpha = 0.85; glow(c, k.x, k.y, 20, '#ffd24a', 0.25); c.fillStyle = '#ffd24a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(k.x + (i - 1.5) * 4, k.y + bob + (i % 2) * 3, 5, 3, 0, 0, TAU); c.fill(); } if (!hide) { c.strokeStyle = 'rgba(255,255,255,' + (0.25 + 0.25 * Math.sin(t * 0.2 + k.bob)) + ')'; c.lineWidth = 1; c.beginPath(); c.moveTo(k.x - 12, k.y + 9 + Math.sin(t * 0.3) * 1.4); c.lineTo(k.x + 12, k.y + 9 - Math.sin(t * 0.3) * 1.4); c.stroke(); c.beginPath(); c.moveTo(k.x - 10, k.y + 13); c.lineTo(k.x + 10, k.y + 13); c.stroke(); } c.restore(); },
  };
  const MIR = {
    setup(g, room, rt, rng, wi) {
      rt.mirage = { hide: false, stormT: 1500 + rng.int(0, 400), storm: 0 }; rt.copies = []; const live = room.type === 'normal' || room.type === 'challenge';
      rt.sand = live ? W.spots(rt, rng, wi.depth >= 2 ? 2 : 1, 240).map(s => ({ x: s.x, y: s.y, r: 58 })) : []; rt.sun = live ? W.spots(rt, rng, 2, 300).map(s => ({ x: s.x, y: s.y, r: 80 })) : [];
      if (live) { for (const s of W.spots(rt, rng, wi.depth >= 3 ? 3 : 2, 130)) if (!within4(rt.sand, s.x, s.y, 60)) g.dropPickup('mirage', s.x, s.y, 1, { still: true });
        for (const s of W.spots(rt, rng, 2, 160)) { const e = g.spawnEnemy('miragedecoy', s.x, s.y, { silent: true }); e.hold = false; } }
      rt.onCrack = (gg, x, y, r) => dispel(gg, rt, x, y, r + 40);
    },
    tick(g, rt) {
      const m = rt.mirage; if (!m) return; const p = g.player;
      m.stormT -= g.ts; if (m.storm > 0) { m.storm -= g.ts; m.hide = true; if (m.storm <= 0) m.hide = false; } else if (m.stormT <= 0) { m.storm = 360; m.stormT = 1800 + (g.frame % 300); g.toast('A sandstorm rolls in...', '#e8c888', 100); }
      for (const q of rt.sand) { if (!p.dead && p.dashT <= 0 && Math.hypot(p.x - q.x, p.y - q.y) < q.r) { const d = Math.hypot(q.x - p.x, q.y - p.y) || 1; ED.phys.move(g, p, (q.x - p.x) / d * 0.85 * g.ts * (p.forceMul || 1), (q.y - p.y) / d * 0.85 * g.ts * (p.forceMul || 1)); } for (const e of g.enemies) if (!e.dead && !e.flying && !e.boss && !e.big && e.type !== 'dunewurm' && Math.hypot(e.x - q.x, e.y - q.y) < q.r) { const d = Math.hypot(q.x - e.x, q.y - e.y) || 1; ED.phys.move(g, e, (q.x - e.x) / d * 0.6 * g.ts, (q.y - e.y) / d * 0.6 * g.ts); } }
      p.inSun = rt.sun.some(s => Math.hypot(p.x - s.x, p.y - s.y) < s.r);
      for (const cp of rt.copies) { cp.t -= g.ts; cp.x += (p.x + cp.ox - cp.x) * 0.12; cp.y += (p.y + cp.oy - cp.y) * 0.12; } U.compact(rt.copies, cp => cp.t > 0);
    },
    under(g, c, t, rt) {
      c.save(); for (const s of rt.sun) { const gr = c.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r); gr.addColorStop(0, 'rgba(255,240,170,0.34)'); gr.addColorStop(1, 'rgba(255,230,140,0.04)'); c.fillStyle = gr; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,236,150,0.4)'; c.lineWidth = 1.5; c.setLineDash([5, 6]); c.stroke(); c.setLineDash([]); }
      for (const q of rt.sand) { c.fillStyle = 'rgba(40,28,10,0.5)'; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); for (let k = 0; k < 4; k++) { c.strokeStyle = 'rgba(210,170,100,' + (0.5 - k * 0.1) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, q.r - 6 - k * 11, t * 0.03 * (k % 2 ? -1 : 1) + k, t * 0.03 * (k % 2 ? -1 : 1) + k + 3.4); c.stroke(); } }
      c.restore();
    },
    draw(g, c, t, rt) {
      for (const cp of rt.copies) { c.save(); c.globalAlpha = 0.5; ED.render.drawPlayer(g, c, Object.assign({}, g.player, { x: cp.x, y: cp.y, orbPos: [], wisps: [], dashCd: 0, inv: 0, flash: 0, dashIframes: 0, bashT: 0 }), t); c.restore(); }
      const m = rt.mirage; if (m && m.storm > 0) { const a = Math.min(1, m.storm / 40, (360 - m.storm) / 40) * 0.34; c.fillStyle = 'rgba(210,170,100,' + a + ')'; c.fillRect(0, 0, 960, 576); c.strokeStyle = 'rgba(240,210,150,' + a * 1.6 + ')'; c.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const y = (i * 53 + t * 3) % 576, x = (i * 131 + t * 9) % 1100 - 100; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60, y + 3); c.stroke(); } }
    },
  };
  const within4 = (list, x, y, pad) => list.some(w => Math.hypot(x - w.x, y - w.y) < w.r + pad);
  function dispel(g, rt, x, y, r) { let n = 0; for (const k of g.pickups) if (!k.dead && k.type === 'mirage' && Math.hypot(k.x - x, k.y - y) < r) { k.dead = true; n++; g.burst(k.x, k.y, 10, '#ffd070', 3, 18); } for (const e of g.enemies) if (!e.dead && e.type === 'miragedecoy' && Math.hypot(e.x - x, e.y - y) < r) { e.noLoot = true; e.hp = 0; g.killEnemy(e); n++; } for (const cp of rt.copies) if (Math.hypot(cp.x - x, cp.y - y) < r) { cp.t = 0; n++; } if (n) { g.addText(x, y - 24, 'the mirage dissolves', '#ffd070', 11); g.sfx('ui', { vol: 0.4 }); } }
  const f7 = mk('mirage');
  register({
    miragedecoy: f7({ name: 'Mirage', shape: 'ghost', color: '#e8c888', r: 12, hp: 6, speed: 0.6, dmg: 0, cost: 99, weight: 0, minFloor: 99, noElite: true, contact: false, noSleep: true,
      desc: 'Not there at all: a shimmer in the shape of a foe. It cannot hurt you, but it stands in the way of your shots. A single blow, or a blast, ends it.',
      init(e, g) { e.minionNoCount = true; e.noLoot = true; e.decoy = true; e.cd = 0; },
      update(e, g) { e.face = Math.sin(e.t * 0.02 + e.seed) * 0.8; if ((e.cd -= g.ts) <= 0) { e.cd = 80; A.walk(g, e, g.rng.next() * TAU, 0.8); } },
      draw(c, e) { c.fillStyle = 'rgba(255,240,200,0.25)'; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.2, e.r * 0.9, e.r * (0.6 + Math.sin(e.t * 0.2) * 0.1), 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 1; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(e.x - e.r, e.y - e.r * 0.4 + k * 6 + Math.sin(e.t * 0.3 + k) * 1.5); c.lineTo(e.x + e.r, e.y - e.r * 0.4 + k * 6 - Math.sin(e.t * 0.3 + k) * 1.5); c.stroke(); } } }),
    dunewurm: f7({ name: 'Dunewurm', shape: 'blob', color: '#c8a060', r: 14, hp: 28, speed: 1.4, dmg: 3, shot: 3.5, cost: 3.0, weight: 9, minFloor: 7,
      desc: 'Swims under the sand, unseen and untouchable. When it is close it marks a ring for about a second and then bursts up inside it. For a couple of seconds afterwards it lies winded on the surface: that is when to strike.',
      init(e, g) { e.mode = 'under'; e.cd = 90 + g.rng.int(0, 60); e.vis = 0.0; e.invuln = true; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.mode === 'under') { e.vis = 0.04; e.invuln = true; e.flash = 0; A.chase(g, e, i, e.curSpeed * 1.35, 0); if ((e.cd -= g.ts) <= 0 && i.d < 150) { e.mode = 'tell'; e.windup = g.tele(48); g.zoneCircle(e, e.x, e.y, 50, e.windup, 0, { color: '#e8b868', hurts: false, burst: false, follow: true }); g.sfx('telegraph', { vol: 0.4 }); } return; }
        if (e.mode === 'tell') { e.vis = 0.1 + 0.2 * Math.sin(e.t * 0.5); e.invuln = true; e.windup -= g.ts; if (e.windup <= 0) { e.mode = 'up'; e.sT = 130; e.vis = 1; e.invuln = false; e.vuln = 1.3; g.zoneCircle(e, e.x, e.y, 50, 6, dmgOf(g, 1.8), { color: '#e8b868', burst: true }); g.shake(5); g.sfx('thud', { vol: 0.6 }); } return; }
        if (e.mode === 'up') { e.vis = 1; e.invuln = false; e.sT -= g.ts; if (e.sT <= 0) { e.mode = 'under'; e.vis = 0.04; e.invuln = true; e.vuln = 1; e.cd = 140 / e.rate; g.burst(e.x, e.y, 10, '#c8a060', 3, 16); } }
      },
      draw(c, e) { if (e.mode === 'up') { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('WINDED', e.x, e.y - e.r - 6); } c.strokeStyle = '#6a4a20'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(e.x, e.y, e.r * (0.35 + k * 0.22), 0.3, 2.4); c.stroke(); } eyes(c, e, 0.35); } }),
    scabroller: f7({ name: 'Scarab Roller', shape: 'hex', color: '#4a5a3a', r: 12, hp: 24, speed: 1.0, dmg: 3, shot: 3, cost: 2.8, weight: 9, minFloor: 7,
      desc: 'Pushes a great ball of dung before it. The ball hurts to touch and swallows every shot that passes through it — a shield and a weapon at once. Get to the beetle\'s flanks and the ball is only a ball.',
      init(e, g) { e.ball = { x: e.x + 24, y: e.y, r: 14 }; },
      update(e, g) {
        const i = A.info(g, e), p = g.player, b = e.ball; e.face = i.ang;
        const ba = Math.atan2(i.dy, i.dx); const tx = e.x + Math.cos(ba) * 26, ty = e.y + Math.sin(ba) * 26; b.x += (tx - b.x) * 0.25; b.y += (ty - b.y) * 0.25;
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.1) * 0.3);
        for (const q of g.pproj) if (!q.dead && !q.friendly && Math.hypot(q.x - b.x, q.y - b.y) < b.r + q.r) { q.dead = true; g.burst(q.x, q.y, 3, '#6a5a3a', 2, 10); }
        if (!p.dead && Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.hr && (e.ballCd = (e.ballCd || 0) - g.ts) <= 0) { if (g.hurtPlayer(e.shotDmg * 0.9, b.x, b.y, { src: e, contact: true })) e.ballCd = 40; else e.ballCd = 10; }
      },
      draw(c, e) { const b = e.ball; if (b) { c.fillStyle = '#5a4a28'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); c.strokeStyle = '#2a1e0a'; c.lineWidth = 2; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.arc(b.x - 4, b.y - 4, 4, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(b.x, b.y, b.r * 0.6, e.t * 0.15, e.t * 0.15 + 2.4); c.stroke(); } c.strokeStyle = '#2a3a18'; c.lineWidth = 2; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(e.x + sg * e.r * 0.6, e.y); c.lineTo(e.x + sg * e.r * 1.3, e.y + e.r * 0.6); c.stroke(); } eyes(c, e, 0.4); } }),
    miragewisp: f7({ name: 'Mirage Wisp', shape: 'ghost', color: '#f0e0b0', r: 11, hp: 13, speed: 1.1, dmg: 2, shot: 3.2, cost: 2.4, weight: 9, minFloor: 8, flying: true,
      desc: 'Conjures two shimmering copies of you that drift where you drift. Then it marks all three of you and fires at one of them. Learn which is yours by where the lines begin, not by where you see yourself.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player, rt = g.rt; e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 200 / e.rate; const t = e.targets[e.pick]; g.eShot(e, Math.atan2(t.y - e.y, t.x - e.x), 3.4, { dmg: 1.3, color: '#f0e0b0', r: 6, homing: 0 }); g.sfx('shoot', { vol: 0.5 }); } return; }
        A.kite(g, e, i, 260, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0 && i.d < 420) {
          if (rt && rt.copies) { rt.copies.length = 0; for (const [ox, oy] of [[-90, -50], [80, 70]]) rt.copies.push({ x: p.x + ox, y: p.y + oy, ox, oy, t: 260 }); }
          e.targets = [{ x: p.x, y: p.y }].concat((rt && rt.copies || []).map(cp => ({ x: cp.x, y: cp.y }))); e.pick = g.rng.chance(0.5) ? 0 : g.rng.int(0, e.targets.length - 1); e.state = 'wind'; e.windup = g.tele(40);
          for (const t of e.targets) g.zoneLine(e, e.x, e.y, e.x + (t.x - e.x) * 2, e.y + (t.y - e.y) * 2, 8, e.windup, 0, { color: '#f0e0b0', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.3 });
        }
      },
      draw(c, e) { c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(e.x, e.y - 2, e.r * 0.55, 0, TAU); c.fill(); eyes(c, e, 0.3); } }),
    sunstalker: f7({ name: 'Sunstalker', shape: 'tri', color: '#ffb040', r: 12, hp: 20, speed: 1.1, dmg: 3, shot: 3, cost: 2.4, weight: 10, minFloor: 7,
      desc: 'A lizard that lives on the light: it fires its fans of bolts only while you stand in a patch of sun. In the shade it is a plain biter — fight it there.',
      init(e, g) { e.cd = 70; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'aim') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 70 / e.rate; for (let k = -1; k <= 1; k++) g.eShot(e, i.ang + k * 0.24, 3.1, { dmg: 1, color: '#ffd070', r: 5 }); g.sfx('shoot', { vol: 0.5 }); } return; }
        if (p.inSun) { A.kite(g, e, i, 240, e.curSpeed, 0.8); if ((e.cd -= g.ts) <= 0 && i.d < 380 && A.clear(g, e.x, e.y, p.x, p.y, false)) { e.state = 'aim'; e.windup = g.tele(22); g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 280, e.y + Math.sin(i.ang) * 280, 10, e.windup, 0, { color: '#ffd070', hurts: false, burst: false }); } }
        else A.chase(g, e, i, e.curSpeed, 0);
      },
      draw(c, e) { c.fillStyle = 'rgba(255,230,140,0.5)'; c.beginPath(); c.moveTo(e.x - Math.cos(e.face) * e.r, e.y - Math.sin(e.face) * e.r); c.lineTo(e.x - Math.cos(e.face + 0.4) * e.r * 1.9, e.y - Math.sin(e.face + 0.4) * e.r * 1.9); c.lineTo(e.x - Math.cos(e.face - 0.4) * e.r * 1.9, e.y - Math.sin(e.face - 0.4) * e.r * 1.9); c.fill(); eyes(c, e, 0.3); } }),
  });
  mod({ id: 'shimmering', name: 'Shimmering', color: '#f0e0b0', glyph: '≈', desc: 'Throws off shimmering doubles when hurt (up to four)',
    onHurt(e, g) { e.doubles = e.doubles || []; e.doubles = e.doubles.filter(d => !d.dead); if (e.doubles.length >= 4 || (e.dbT && g.frame - e.dbT < 24)) return; e.dbT = g.frame; for (let k = 0; k < 2 && e.doubles.length < 4; k++) { const a = g.rng.next() * TAU, d = g.spawnEnemy('miragedecoy', U.clamp(e.x + Math.cos(a) * 40, 80, 880), U.clamp(e.y + Math.sin(a) * 40, 80, 490), { silent: true, def: Object.assign({}, ED.enemyTypes.miragedecoy, { shape: e.def.shape, color: e.color, r: e.r }), minion: true }); d.color = e.color; e.doubles.push(d); } } });
  const caravanner = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#8a5a30'; c.beginPath(); c.ellipse(x, y + r * 0.35, r * 1.05, r * 0.7, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#c8a870'; c.beginPath(); c.arc(x - r * 0.1, y - r * 0.35, r * 0.4, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#e8d8b0'; c.beginPath(); c.moveTo(x - r * 0.6, y - r * 0.5); c.lineTo(x - r * 0.1, y - r * 1.0); c.lineTo(x + r * 0.4, y - r * 0.5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#6a8a9a'; c.beginPath(); c.ellipse(x + r * 0.85, y + r * 0.1, r * 0.3, r * 0.45, 0.2, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#d8c8a0'; c.fillRect(x + r * 0.78, y - r * 0.4, r * 0.14, r * 0.15);
  };
  ED.bossDraw.caravanner = caravanner;
  mini({ id: 'caravanner', name: 'The Caravanner', title: 'Who Sells the Road', color: '#e8c888', r: 26, hp: 205, arena: 'arena_open', shape: 'caravanner', minFloor: 7, unlockText: 'Waterskin',
    attacks: { sands: L('rain', { n: 8, r: 44, warn: 48, interval: 7, aimed: 0.7, color: '#e8c888' }), mirage: L('blink', { where: 'random', ring: 8, color: '#f0e0b0' }), slam: L('slamRing', { r: 86, tele: 36, rings: 2, speed: 3, color: '#e8c888' }), caravan: L('bars', { n: 3, thick: 44, gapW: 165, warn: 64, color: '#e8c888' }), wurms: L('summon', { types: ['dunewurm'], n: 1, max: 2, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'Haggling', attacks: ['sands', 'mirage', 'slam'], idle: [32, 54] }, { at: 0.5, name: 'Sold Out', attacks: ['sands', 'caravan', 'mirage', 'wurms', 'slam'], idle: [22, 40] }] });
  relic('waterskin', { id: 'waterskin', name: 'Waterskin', rarity: 'rare', color: '#8ac0d8', mods: { regen: 2, def: 1 }, max: 1, unlock: 'mini:caravanner', desc: 'A slow, steady mending, and a little more staying power. (Unlockable)' });
  W.add({ id: 'mirage', name: 'The Mirage Flats', short: 'MIRAGE FLATS', color: '#e8c888', pack: V, native: 6, tiers: [1, 99], risk: 0, gate: { kind: 'cost', gold: 80, goldPer: 8, hp: 1 },
    rule: 'Not everything shimmering is there. Decoy gold springs an ambush, decoy foes soak your shots, quicksand drags at you (dash out), sandstorms hide the tells — and a bomb dispels mirages around it.',
    enemies: ['dunewurm', 'scabroller', 'miragewisp', 'sunstalker'], mod: 'shimmering', minis: ['caravanner'], hz: MIR, music: { scale: 1, root: 40, bpm: -2, prog: [0, 2, 5, 3] },
    theme: { name: 'The Mirage Flats', floorA: '#4e402a', floorB: '#564830', wall: '#7a6040', wallTop: '#c8a468', accent: '#ffd070', glow: '#ffe0a0', fog: '#201808', skin: { pattern: 'sand', wall: 'block', ambience: 'sandblow', ambient: '#f0d8a8', dim: 0.0, lift: 0.95 } } });

  // ==================================================================== 4. THE ABYSSAL BAZAAR (hidden)
  //  Stalls with fair prices — or stand on the red mat beside one and take it without paying: the vendors turn into Bouncers and the Heat rises.  Half of the ordinary rooms are MARKETS (no combat at all);
  //  the others are back alleys with the land's foes.  A Bouncer may hold an exit shut until you pay or kill him.  An Appraiser takes your best relic for the room only.
  const marketRng = (room) => new ED.RNG(room.seed + ':market');
  const exitDirs = (g, room) => ED.DIRS.filter(d => room.doors[d]);
  function convertRoom(g, room) {
    const rt = g.rt; if (rt.bz || !isLand(g, 'bazaar') || room.type !== 'normal') return; const rng = marketRng(room);
    const carrier = (room.holds || []).some(h => h.via === 'enemy' && !h.got), market = rng.chance(0.55) && !carrier && !room.puzzle;
    rt.bz = { market, thefts: 0, rng: rng.fork('stalls') };
    if (!market) return;
    rt.enc = null; rt.dare = undefined; g.clearRoom(); g.toast('A market room — no fighting here. Pay, or take what you dare.', '#ffb86a', 160);
    const F = g.floorNum, prng = rt.bz.rng, offers = I.rollOffers(prng, F + 1, 3, { luck: g.player.st.luck, relics: g.player.relics, minRank: 1 }); rt.bz.stalls = [];
    offers.forEach((o, k) => { const x = 300 + k * 180, y = 170, ped = g.pedestal(o, x, y, { shopItem: true, stall: true, price: { gold: Math.max(8, Math.round(I.price(o, F, g.player) * 0.9)) } }), pad = g.addInter({ type: 'stealpad', x, y: y + 54, r: 14, range: 30, color: '#ff4a4a', ped, prompt: () => ped.dead ? null : 'Take it and run', use: (gg, it) => steal(gg, it) }); rt.bz.stalls.push({ ped, pad }); });
    // a bouncer holds one exit shut until you pay him (or kill him)
    const free = exitDirs(g, room).filter(d => { const c = ED.rooms.doorCenter(d); return Math.hypot(c.x - g.player.x, c.y - g.player.y) > 140; }); if (free.length >= 1 && rng.chance(0.75)) {
      const d = rng.pick(free), c = ED.rooms.doorCenter(d), v = ED.DIR_V[d], px = c.x - v[0] * 56, py = c.y - v[1] * 56, b = g.spawnEnemy('bouncer', px, py, { silent: true }); b.docile = true; b.hold = true; b.noContact = true; b.guardDir = d; if (!b.mods.includes(STAND)) b.mods.push(STAND); rt.doorBlock = rt.doorBlock || {}; rt.doorBlock[d] = true; g.refreshCollision();
      const fee = 14 + 2 * F; g.addInter({ type: 'service', x: px - v[1] * 40 + (v[1] ? 0 : -v[0] * 0), y: py + v[0] * 40, r: 14, range: 44, name: 'Pay the Bouncer', color: '#ffb86a', desc: 'He will step aside — for a price.', price: () => fee, prompt: () => b.dead || !rt.doorBlock[d] ? null : 'Pay ' + fee + 'g to pass', use: (gg, it) => { if (!rt.doorBlock[d]) return; if (gg.player.gold < fee) { gg.sfx('deny'); gg.toast('Not enough gold — or you could make him move.', '#ff6a6a'); return; } gg.player.gold -= fee; gg.sfx('buy'); delete rt.doorBlock[d]; b.hold = false; b.docile = false; b.leaving = true; gg.refreshCollision(); gg.toast('"Pleasure doing business."', '#ffb86a', 120); it.dead = true; } });
    }
  }
  function steal(g, pad) {
    const ped = pad.ped, rt = g.rt; if (!ped || ped.dead || !rt.bz) return;
    if (ped.item.curse && ped.item.cat === 'relic') g.cursePlayer(ped.item.curse); const old = g.equipItem(ped.item); if (old) g.dropLoot(old, g.player.x + 22, g.player.y + 18); ped.dead = true; pad.dead = true; g.sfx('curse'); g.toast('THIEF! The vendors reach for their cudgels.', '#ff4a4a', 200); g.flashScreen('#a00020', 0.25);
    rt.bz.thefts++; g.run.thefts = (g.run.thefts | 0) + 1;
    if (ED.heat && g.run.heatLevel !== undefined && ED.heat.scoreMul) { g.run.heatLevel += 1; g.run.heatMul = ED.heat.scoreMul(g.run.heatLevel); g.toast('Heat rises.', '#ff8a4a', 120); }
    rt.lockdown = true; rt.bz.fight = true; g.refreshCollision();
    for (const b of g.enemies) if (b.type === 'bouncer' && !b.dead) { b.docile = false; b.hold = false; b.noContact = false; b.leaving = false; }
    const dirs = exitDirs(g, g.room), n = 1 + Math.min(2, rt.bz.thefts);
    for (let k = 0; k < n; k++) { const d = dirs[k % Math.max(1, dirs.length)], c = d ? ED.rooms.doorCenter(d) : { x: 480, y: 500 }, v = d ? ED.DIR_V[d] : [0, 0]; g.queueSpawn('bouncer', c.x - v[0] * 70, c.y - v[1] * 70, { quick: true }); }
    for (const o of g.inters) if (o.type === 'stealpad') o.dead = true;
  }
  // the vendors stand down when the last Bouncer falls: the doors open again, and nothing is cleared twice
  ED.hook('tick', V, (g) => { const rt = g.rt; if (rt && rt.bz && rt.bz.fight && !g.spawns.length && !g.enemies.some(e => !e.dead)) { rt.bz.fight = false; rt.lockdown = false; g.refreshCollision(); g.toast('The market is quiet again.', '#ffb86a', 100); } });
  const STAND = { id: 'standing', pack: V, hidden: true, name: 'Standing', color: '#8a8aa8', glyph: '', desc: '',
    update(e, g) { if (!e.docile) return; e.hold = true; e.noContact = true; if (e.hp < e.maxHp - 0.01) { e.docile = false; e.hold = false; e.noContact = false; g.toast('The Bouncer cracks his knuckles.', '#ff8a6a', 100); } } };
  ED.interDraw.stealpad = (c, it, t) => { c.fillStyle = 'rgba(180,20,30,' + (0.45 + 0.15 * Math.sin(t * 0.1)) + ')'; c.fillRect(it.x - 22, it.y - 8, 44, 16); c.strokeStyle = '#ff5a5a'; c.lineWidth = 1.5; c.strokeRect(it.x - 22, it.y - 8, 44, 16); c.fillStyle = '#ffd0d0'; c.font = 'bold 8px monospace'; c.textAlign = 'center'; c.fillText('TAKE', it.x, it.y + 3); };
  ED.hook('roomEnter', V, (g, room) => { if (g.rt && room.type === 'normal') convertRoom(g, room); });
  const BAZ = { setup(g, room, rt) { /* the room is converted on entry (convertRoom): the hazard object only marks the land */ }, under(g, c, t, rt) { if (!rt.bz) return; const x0 = 200, y0 = 130; if (rt.bz.market) { c.fillStyle = 'rgba(255,184,106,0.05)'; c.fillRect(x0, y0, 560, 120); c.strokeStyle = 'rgba(255,184,106,0.22)'; c.setLineDash([6, 6]); c.strokeRect(x0, y0, 560, 120); c.setLineDash([]); for (let k = 0; k < 6; k++) { c.fillStyle = 'rgba(255,170,90,' + (0.5 + 0.2 * Math.sin(t * 0.07 + k)) + ')'; c.beginPath(); c.arc(220 + k * 104, 70, 5, 0, TAU); c.fill(); glow(c, 220 + k * 104, 70, 38, '#ffb06a', 0.3); } } } };
  const f8 = mk('bazaar');
  register({
    cutpurse: f8({ name: 'Cutpurse', shape: 'tri', color: '#5a4a7a', r: 10, hp: 14, speed: 2.1, dmg: 2, cost: 1.8, weight: 11, minFloor: 8,
      desc: 'Quick fingers: it touches you, takes a slice of your gold and bolts for the nearest door with a bulging bag. Catch it and the gold comes back with a bonus. A cutpurse that carries a key never runs — it fights.',
      init(e, g) { e.cd = 0; e.stolen = 0; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'flee') { e.fleeT -= g.ts; const door = e.exit; A.walk(g, e, Math.atan2(door.y - e.y, door.x - e.x), e.curSpeed * 1.5); if (e.fleeT <= 0 || Math.hypot(door.x - e.x, door.y - e.y) < 30) { if (!e.carriesKey) { e.fled = true; e.noLoot = true; e.hp = 0; g.addText(e.x, e.y - 14, 'GONE', '#9a8ab8', 12); e.dead = true; } else { e.state = null; } } return; }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.2 + e.seed) * 0.4);
        if (!p.dead && Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.hr + 2 && !e.carriesKey && p.inv <= 0 && p.gold >= 6 && !(p.dashT > 0)) { const n = U.clamp(Math.round(p.gold * 0.12), 6, 70); p.gold -= n; e.stolen = n; e.state = 'flee'; e.fleeT = 420; const dirs = ED.DIRS.filter(d => g.room.doors[d]), dd = dirs.length ? dirs.reduce((b, d) => { const c = ED.rooms.doorCenter(d); const dist = Math.hypot(c.x - e.x, c.y - e.y); return !b || dist < b.dist ? { dist, x: c.x, y: c.y } : b; }, null) : { x: 480, y: 288 }; e.exit = dd; g.addText(p.x, p.y - 24, '-' + n + 'g', '#ffd24a', 14); g.sfx('deny'); p.inv = Math.max(p.inv, 20); }
      },
      onDeath(e, g) { if (e.stolen > 0 && !e.fled) { g.dropGold(e.x, e.y, Math.round(e.stolen * 1.25)); g.toast('The gold comes back with interest!', '#ffd24a', 100); } },
      draw(c, e) { c.fillStyle = '#1a1030'; c.fillRect(e.x - e.r * 0.6, e.y - e.r * 0.4, e.r * 1.2, e.r * 0.3); if (e.stolen) { c.fillStyle = '#c8a050'; c.beginPath(); c.arc(e.x - Math.cos(e.face) * e.r * 0.8, e.y - Math.sin(e.face) * e.r * 0.8 + 2, 5, 0, TAU); c.fill(); } eyes(c, e, 0.3); } }),
    appraiser: f8({ name: 'Appraiser', shape: 'diamond', color: '#d8c890', r: 12, hp: 24, speed: 0.9, dmg: 2, shot: 3, cost: 3.0, weight: 8, minFloor: 8,
      desc: 'Weighs what you carry and finds it wanting: while it lives, your best relic is struck off your list — for this room only. Kill it, or leave the room, and the relic is yours again, whole.',
      init(e, g) { e.cd = 60; e.apr = null; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (!e.apr) { e.apr = true; const best = bestRelic(g); if (best) { (g.run.appraised = g.run.appraised || []).push({ by: e.id, id: best.id, n: p.relics[best.id] }); delete p.relics[best.id]; I.recalc(p); g.addText(p.x, p.y - 30, 'APPRAISED: ' + best.name, '#d8c890', 12); g.sfx('curse', { vol: 0.4 }); } }
        A.kite(g, e, i, 240, e.curSpeed, 0.8);
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 150 / e.rate; for (let k = -1; k <= 1; k++) g.eShot(e, i.ang + k * 0.25, 3.0, { dmg: 1, color: '#e8d8a0', r: 5 }); g.sfx('shoot', { vol: 0.4 }); } return; }
        if ((e.cd -= g.ts) <= 0 && i.d < 360) { e.state = 'wind'; e.windup = g.tele(28); g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 260, e.y + Math.sin(i.ang) * 260, 10, e.windup, 0, { color: '#e8d8a0', hurts: false, burst: false }); }
      },
      onDeath(e, g) { restoreRelics(g, e.id); },
      draw(c, e) { c.strokeStyle = '#6a5a28'; c.lineWidth = 2; c.beginPath(); c.arc(e.x + Math.cos(e.face) * e.r * 0.4, e.y + Math.sin(e.face) * e.r * 0.4 - 2, e.r * 0.35, 0, TAU); c.stroke(); eyes(c, e, 0.3); } }),
    bouncer: f8({ name: 'Bouncer', shape: 'square', color: '#4a4a6a', r: 20, hp: 60, speed: 1.0, dmg: 4, shot: 4, cost: 4.0, weight: 6, minFloor: 8, noElite: true,
      desc: 'Wide, patient and expensive. In a market room he stands before an exit and wants paying — or killing. Provoke him, or rob a stall, and he stops being patient: slow, heavy slams you can see coming.',
      init(e, g) { e.cd = 80; e.docile = false; },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt; e.face = i.ang;
        if (e.docile) return;
        if (e.leaving) { const d = e.guardDir, c = ED.rooms.doorCenter(d), v = ED.DIR_V[d]; const tx = c.x - v[0] * 56 - v[1] * 90, ty = c.y - v[1] * 56 + v[0] * 90; A.walk(g, e, Math.atan2(ty - e.y, tx - e.x), 1.2); e.noContact = true; if (Math.hypot(tx - e.x, ty - e.y) < 20) { e.leaving = false; e.docile = true; e.hold = true; } return; }
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 150 / e.rate; g.zoneCircle(e, e.x + Math.cos(i.ang) * 30, e.y + Math.sin(i.ang) * 30, 60, 6, dmgOf(g, 1.6), { color: '#ff7a5a', burst: true }); g.shake(5); g.sfx('thud', { vol: 0.6 }); } return; }
        A.chase(g, e, i, e.curSpeed, 0); if ((e.cd -= g.ts) <= 0 && i.d < 110) { e.state = 'wind'; e.windup = g.tele(38); g.zoneCircle(e, e.x + Math.cos(i.ang) * 30, e.y + Math.sin(i.ang) * 30, 60, e.windup, 0, { color: '#ff7a5a', hurts: false, burst: false, follow: true, fx: Math.cos(i.ang) * 30, fy: Math.sin(i.ang) * 30 }); g.sfx('telegraph', { vol: 0.5 }); }
      },
      onDeath(e, g) { const rt = g.rt; if (rt && rt.doorBlock && e.guardDir) { delete rt.doorBlock[e.guardDir]; g.refreshCollision(); g.toast('The way is open.', '#ffb86a', 100); } },
      draw(c, e) { c.fillStyle = '#1a1a2a'; c.fillRect(e.x - e.r * 0.7, e.y - e.r * 0.15, e.r * 1.4, e.r * 0.25); c.fillStyle = '#ff6a5a'; c.fillRect(e.x - e.r * 0.45, e.y - e.r * 0.1, e.r * 0.25, e.r * 0.12); c.fillRect(e.x + e.r * 0.2, e.y - e.r * 0.1, e.r * 0.25, e.r * 0.12); if (e.docile) { c.fillStyle = '#ffd24a'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText('PAY OR FIGHT', e.x, e.y - e.r - 6); } } }),
    auctioneer: f8({ name: 'Auctioneer', shape: 'hex', color: '#b04a6a', r: 14, hp: 32, speed: 0, dmg: 2, shot: 3, cost: 3.2, weight: 7, minFloor: 9,
      desc: 'On its podium it calls bids that nobody made: every few seconds "SOLD!" and a pair of bidders — small, fast, paddle in hand — run in at you. No more than four at once, and after four rounds the bidding closes. Silence the crier.',
      init(e, g) { e.cd = 90; e.anchored = true; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if ((e.cd -= g.ts) <= 0) { e.cd = 230 / e.rate; if ((e.calls | 0) >= 4) { if (e.calls === 4) { e.calls = 5; g.addText(e.x, e.y - e.r - 12, 'GOING ONCE...', '#ffd24a', 12); } return; } const n = g.enemies.filter(o => o.type === 'bidder' && !o.dead).length; if (n < 4) { e.calls = (e.calls | 0) + 1; g.addText(e.x, e.y - e.r - 12, 'SOLD!', '#ffd24a', 15); g.sfx('summon', { vol: 0.5 }); for (let k = 0; k < Math.min(2, 4 - n); k++) { const a = (k ? 1 : -1) * 1.2 + i.ang; g.queueSpawn('bidder', U.clamp(e.x + Math.cos(a) * 60, 80, 880), U.clamp(e.y + Math.sin(a) * 60, 80, 490), { quick: true, minion: true }); } } }
      },
      draw(c, e) { c.fillStyle = '#6a3a18'; c.fillRect(e.x - e.r, e.y + e.r * 0.5, e.r * 2, e.r * 0.5); c.strokeStyle = '#e8d8a0'; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x + e.r * 0.8, e.y + e.r * 0.2); c.lineTo(e.x + e.r * 1.4, e.y - e.r * 0.5); c.stroke(); c.fillStyle = '#e8d8a0'; c.fillRect(e.x + e.r * 1.2, e.y - e.r * 0.7, e.r * 0.5, e.r * 0.3); eyes(c, e, 0.35); } }),
    bidder: f8({ name: 'Bidder', shape: 'circle', color: '#c07a8a', r: 8, hp: 5, speed: 2.2, dmg: 2, cost: 99, weight: 0, minFloor: 99, noElite: true, noSleep: true,
      desc: 'A small, desperate bidder with a numbered paddle. One good hit and it is out of the running.',
      update(e, g) { const i = A.info(g, e); e.face = i.ang; A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.2 + e.seed) * 0.5); },
      draw(c, e) { c.fillStyle = '#f0e8d0'; c.fillRect(e.x + e.r * 0.4, e.y - e.r * 1.6, e.r * 0.9, e.r * 0.9); c.fillStyle = '#10101c'; c.font = 'bold 7px monospace'; c.textAlign = 'center'; c.fillText(String(1 + (e.id % 9)), e.x + e.r * 0.85, e.y - e.r * 0.95); eyes(c, e, 0.35); } }),
  });
  const bestRelic = (g) => { const p = g.player, order = I.RARITY_ORDER || []; let best = null, br = -1; for (const id of Object.keys(p.relics)) { const r = I.relic(id); if (!r || r.talent || r.hidden) continue; const rk = order.indexOf(r.rarity); if (rk > br || (rk === br && id < (best ? best.id : 'zzz'))) { br = rk; best = r; } } return best; };
  /** hand back what the Appraisers took: those of `by` (an enemy id), or all of them */
  function restoreRelics(g, by) {
    const list = g.run && g.run.appraised; if (!list || !list.length) return; const p = g.player; let n = 0;
    for (const a of list) if (!a.done && (by === undefined || by === null || a.by === by)) { a.done = true; p.relics[a.id] = (p.relics[a.id] || 0) + a.n; n++; }
    g.run.appraised = list.filter(a => !a.done); if (n) { I.recalc(p); g.addText(p.x, p.y - 28, 'relic returned', '#9ae870', 11); }
  }
  // the relic comes back the moment its Appraiser dies, the room is cleared, you enter another room, or the run ends — never permanent
  ED.hook('roomClear', V, (g) => restoreRelics(g, null));
  ED.hook('roomEnter', V, (g) => restoreRelics(g, null));
  ED.hook('tick', V, (g) => { const list = g.run && g.run.appraised; if (!list || !list.length) return; for (const a of list) if (!a.done && !g.enemies.some(e => e.id === a.by && !e.dead)) restoreRelics(g, a.by); });
  ED.hook('floorStart', V, (g) => { const wi = here(g); if (wi && wi.w.id === 'bazaar' && wi.mid && wi.first && R_) { const M = R_.meta(); M.discovered.bazaar = true; M.seen.bazaar = true; M.visits.bazaar = (M.visits.bazaar | 0) + 1; ED.save.save(); } });
  ED.hook('runEnd', V, (g) => restoreRelics(g, null));
  mod({ id: 'licensed', name: 'Licensed', color: '#d8c890', glyph: '§', desc: 'Its blows take a slice of your gold as well; it keeps the gold until it dies',
    onHitPlayer(e, g) { const p = g.player; if (p.gold >= 6) { const n = Math.max(3, Math.round(p.gold * 0.04)); p.gold -= n; e.bank = (e.bank || 0) + n; g.addText(p.x, p.y - 22, '-' + n + 'g', '#d8c890', 12); } }, onDeath(e, g) { if (e.bank) g.dropGold(e.x, e.y, e.bank); } });
  const broker = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#2a1a4a'; c.beginPath(); c.moveTo(x - r * 0.9, y + r); c.lineTo(x - r * 0.5, y - r * 0.3); c.lineTo(x + r * 0.5, y - r * 0.3); c.lineTo(x + r * 0.9, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#d8c0a0'; c.beginPath(); c.arc(x, y - r * 0.6, r * 0.42, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#10081c'; c.fillRect(x - r * 0.46, y - r * 0.72, r * 0.92, r * 0.16); c.fillStyle = '#ffb86a'; c.fillRect(x - r * 0.3, y - r * 0.7, r * 0.2, r * 0.1); c.fillRect(x + r * 0.1, y - r * 0.7, r * 0.2, r * 0.1);
    c.strokeStyle = '#ffd24a'; c.lineWidth = 2; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * r * 0.45, y + r * 0.1); c.lineTo(x + k * r * 0.45, y + r * 0.6); c.stroke(); c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(x + k * r * 0.45, y + r * 0.7, r * 0.12, 0, TAU); c.fill(); } c.lineWidth = 3; c.strokeStyle = dk;
  };
  ED.bossDraw.broker = broker;
  mini({ id: 'broker', name: 'The Broker', title: 'Who Prices Everything', color: '#ffb86a', r: 26, hp: 220, arena: 'arena_cross', shape: 'broker', minFloor: 9, unlockText: "Broker's Ledger",
    attacks: { coins: L('rain', { n: 9, r: 42, warn: 48, interval: 7, aimed: 0.7, color: '#ffd24a' }), ledger: L('bars', { n: 3, thick: 46, gapW: 165, warn: 66, color: '#ffb86a' }), fee: L('slamRing', { r: 88, tele: 36, rings: 2, speed: 3, color: '#ffb86a' }), offer: L('fan', { n: 5, spread: 0.24, reps: 2, speed: 2.9, color: '#ffd070' }), bids: L('summon', { types: ['cutpurse', 'bidder'], n: 2, max: 4, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'Opening Offer', attacks: ['fee', 'offer', 'bids'], idle: [32, 54] }, { at: 0.5, name: 'Final Price', attacks: ['ledger', 'coins', 'fee', 'offer', 'bids'], idle: [22, 40] }] });
  relic('brokerledger', { id: 'brokerledger', name: "Broker's Ledger", rarity: 'rare', color: '#ffb86a', mods: { price: -0.15, gold: 0.15, luck: 1 }, max: 2, unlock: 'mini:broker', desc: 'Shops charge less, gold is worth more, luck is kinder. (Unlockable)' });
  W.add({ id: 'bazaar', name: 'The Abyssal Bazaar', short: 'ABYSSAL BAZAAR', color: '#ffb86a', pack: V, native: 8, tiers: [2, 99], risk: 3, hidden: true, gate: { kind: 'legacy', id: 'deep20' },
    rule: 'Stalls with fair prices in the markets — or take what you dare: the vendors turn on you and the Heat rises. Half the rooms are markets (no fighting); the rest are back alleys.',
    enemies: ['cutpurse', 'appraiser', 'bouncer', 'auctioneer'], mod: 'licensed', minis: ['broker'], hz: BAZ, music: { scale: 0, root: 37, bpm: -2, prog: [0, 3, 5, 4] },
    theme: { name: 'The Abyssal Bazaar', floorA: '#1c1830', floorB: '#221c38', wall: '#2e2650', wallTop: '#5a4a9a', accent: '#ffb86a', glow: '#ffd8a0', fog: '#0a0814', skin: { pattern: 'carpet', wall: 'velvet', ambience: 'glints', ambient: '#b0a0d0', dim: 0.1, lift: 1.5 } } });
  // the Vault hides a second trapdoor: it leads to the Bazaar (the Court's own rule is untouched)
  if (ED.hollow21 && ED.hollow21.TARGETS) ED.hollow21.TARGETS.push((g) => { const bz = W.byId.bazaar; if (!P.on(V) || !bz || !P.ok(bz)) return null; const wi = W.at(g.floorNum); if (!wi || !wi.routed || wi.w.id !== 'vault') return null; return new ED.RNG(g.run.seed + ':trapb:' + g.floorNum).chance(0.3) ? 'bazaar' : null; });
  ED.v25 = { wake, noise, stillConnected, lava, cool, shatter, pillar, dispel, convertRoom, steal, bestRelic, restoreRelics };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* EMBERDEEP — pack_v20.js : v20 "SOVEREIGNS" — every land you enter by a road has its own boss line.
 *
 *  In a land reached by a door (all the new lands of v17/v18 are; any older land is too when a road leads there), the second and fourth floors keep their guardian to that land (a new boss, and a re-dressed
 *  older one), and the MEGA floor that ends the land is that land's own MEGA boss.  The straight line down (the stairs) keeps the old rotation untouched, and these bosses never join it (they are flagged landOnly).
 *    OSSUARY      Maelor, the Drowned Cantor (a wave with a dry lane) · Ser Oriel, the Sunken Knight · THALASSA, the Sunken Bell (buoys, drowned hands, the bell)
 *    ORRERY       Kairos, the Metronome (every attack on a beat) · Ormolu, the Brass Sentinel · PERIHELION, the Brass Heavens (planets, armillary arcs, the sun)
 *    VAULT        Mammon, the Tollbaron (his toll takes gold and heals him) · Auric, the Molten Mint · AURELIUS, the Vault Door (four locks, two bolts, the dial)
 *    THORNWOOD    Verdane, the Thorn Mother (seeds that root) · Lady Brier, the Bramble Queen · THE HOLLOW TREE (boughs, roots, the heartwood)
 *    MIRROR HALLS Specula, the First Reflection (every pattern doubled) · Argent, the Counterfeit Knight · THE GREAT LOOKING-GLASS (panes, the frame, the silvering)
 *    SKY BRIDGE   Zephra, the Windcaller · Cirrus, the Cloud Regent · TEMPUS, the Cyclone (vanes, wings, the eye)
 *    the six older lands (crypts, mirewood, glacial, foundry, void, storm) get re-dressed guardians when a road leads there: world colours, their own foes, one swapped attack, and a re-dressed MEGA.
 *  Each original boss drops a signature relic the first time it falls.  Bosses are data: parts, phases, attacks from the shared library; art is plain shapes.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds;
  const X = ED.attacks, lib = X.lib, N = X.N, ang = X.ang, clampArena = X.clampArena, sc = X.sc;
  const TAU = U.TAU, V = 'v20';
  const L = (name, o) => [name, o];
  const darker = (c, k) => ED.render.darker(c, k), lighter = (c, k) => ED.render.lighter(c, k);
  const glow = (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); };
  const rateOf = e => Math.max(0.5, e.rate || 1);

  P.define({
    id: 'v20', name: 'SOVEREIGNS', tag: 'a boss line for every land', color: '#ff8a6a',
    blurb: 'Every land you enter by a road gets its own guardians: a new boss and a re-dressed older one on its second and fourth floors, and its own MEGA boss to end it — twelve lands, thirty-six bosses, each built on that land\'s rule. The stairs keep the old rotation. (The new lands need v17 and v18 to be reachable.)',
  });

  // ------------------------------------------------------------------ attacks the lands' bosses share
  /** heal a boss by a fixed amount (a multi-part body mends its most wounded part) */
  function healBoss(e, amt) {
    if (e.parts) { const part = e.parts.filter(p => !p.dead && p.hp < p.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (part) { part.hp = Math.min(part.maxHp, part.hp + amt); e.hp = e.parts.reduce((s, p) => s + Math.max(0, p.hp), 0); } }
    else e.hp = Math.min(e.maxHp, e.hp + amt);
  }
  /** a wall of water sweeps the arena from the top; one lane (marked green first) stays dry */
  lib.tideSurge = function* (e, g, o) {
    o = Object.assign({ warn: 58, thick: 76, gap: 150, speed: 4.2, dmg: 1.2, color: '#4de0c8', n: 1 }, o);
    for (let k = 0; k < N(e, o.n); k++) {
      const gx = U.clamp(g.player.x + g.rng.range(-170, 170), 150, 810) - o.gap / 2, dur = g.tele(o.warn);
      g.zoneRect(e, gx, 58, o.gap, 460, dur, 0, { color: '#6ee07a', hurts: false, burst: false }); g.zoneRect(e, 34, 40, 892, 22, dur, 0, { color: o.color, hurts: false, burst: false }); g.sfx('telegraph');
      yield dur;
      const speed = o.speed * sc(e).spd;
      const mk = (x, w) => { if (w > 20) g._zone({ kind: 'hazard', shape: 'rect', x, y: 30 - o.thick, w, h: o.thick, life: 300, dmg: e.shotDmg * o.dmg, tick: 8, tickT: 0, src: e, color: o.color, noInstant: true, upd(gg, z) { z.y += speed * gg.ts; if (z.y > 546) z.dead = true; } }); };
      mk(34, gx - 34); mk(gx + o.gap, 926 - gx - o.gap); g.sfx('boom', { vol: 0.4 }); g.shake(4);
      yield Math.ceil(580 / speed) + 8;
    }
  };
  /** beats: a ring pulses each beat; named beats run an attack (which delays the next beat) */
  lib.metronome = function* (e, g, o) {
    o = Object.assign({ beats: 6, period: 26, fire: {}, color: '#ffd24a' }, o);
    for (let b = 0; b < o.beats; b++) {
      g.ringFx(e.x, e.y, e.r * 0.8, e.r + 44, o.color, 14, 3); g.sfx('ui', { vol: 0.3 });
      const f = o.fire[b]; if (f && lib[f[0]]) yield* lib[f[0]](e, g, f[1] || {});
      yield o.period / rateOf(e);
    }
  };
  /** a ring that takes gold instead of health — and feeds the boss with it */
  lib.tollRing = function* (e, g, o) {
    o = Object.assign({ tele: 40, speed: 3, color: '#ffd24a', heal: 0.012 }, o); const dur = g.tele(o.tele);
    g.zoneCircle(e, e.x, e.y, 60 + e.r, dur, 0, { color: o.color, hurts: false, burst: false, follow: true }); g.sfx('telegraph'); yield dur;
    const gap = ang(e, g) + (g.rng.chance(0.5) ? 1.4 : -1.4);
    g._zone({ kind: 'ring', shape: 'ring', x: e.x, y: e.y, r: e.r, w: 24, speed: o.speed * sc(e).spd, maxR: 700, dmg: 0, hurts: false, src: e, color: o.color, gaps: [{ a: gap, w: 0.9 }],
      upd(gg, z) {
        const p = gg.player; if (z.taxed || p.dead || p.inv > 0 || p.bashT > 0 || (p.dashT > 0 && p.dashIframes > 0) || !ED.zoneHits(z, p.x, p.y, p.hr)) return; z.taxed = true;
        if (p.gold >= 8) { const n = U.clamp(Math.round(p.gold * 0.12), 8, 90); p.gold -= n; p.inv = Math.max(p.inv, 24); healBoss(e, e.maxHp * o.heal * Math.min(3, n / 30)); gg.addText(p.x, p.y - 24, '-' + n + 'g', '#ffd24a', 15); gg.sfx('deny'); gg.burst(p.x, p.y, 8, '#ffd24a', 3, 18); gg.addText(e.x, e.y - e.r, '+', '#ffd24a', 16); }
        else gg.hurtPlayer(e.shotDmg * 0.9, e.x, e.y, { src: e, zone: true });
      } });
    yield 36;
  };
  /** the pattern is fired from the boss AND from its mirror image across the middle of the arena */
  lib.mirrorFan = function* (e, g, o) {
    o = Object.assign({ n: 5, spread: 0.24, reps: 3, gap: 14, speed: 3.1, dmg: 0.9, color: '#d8e8ff', tele: 24 }, o);
    const dur = g.tele(o.tele), mx = C.ROOM_W - e.x, p = g.player, a0 = ang(e, g), b0 = Math.atan2(p.y - e.y, p.x - mx);
    g.zoneLine(e, e.x, e.y, e.x + Math.cos(a0) * 200, e.y + Math.sin(a0) * 200, 10, dur, 0, { color: o.color, hurts: false });
    g.zoneLine(e, mx, e.y, mx + Math.cos(b0) * 200, e.y + Math.sin(b0) * 200, 10, dur, 0, { color: o.color, hurts: false }); g.sfx('telegraph'); yield dur;
    for (let r = 0; r < o.reps; r++) {
      const n = N(e, o.n), a1 = ang(e, g), a2 = Math.atan2(g.player.y - e.y, g.player.x - (C.ROOM_W - e.x)), s = o.speed * sc(e).spd;
      for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * o.spread; g.eShot(e, a1 + off, s, { dmg: o.dmg, color: o.color }); g.eShot(e, a2 - off, s, { dmg: o.dmg, color: o.color, x: C.ROOM_W - e.x, y: e.y }); }
      g.sfx('shoot'); yield o.gap / rateOf(e);
    }
  };
  /** slow patches (time wells, shallows) the boss drops around you */
  lib.wells = function* (e, g, o) {
    o = Object.assign({ n: 3, r: 62, life: 420, warn: 46, dmg: 0.55, color: '#9ab0ff', spread: 200 }, o); const n = N(e, o.n), p = g.player;
    for (let i = 0; i < n; i++) { const a = g.rng.next() * TAU, d = i === 0 ? 0 : 70 + g.rng.next() * o.spread, c = clampArena(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, o.r * 0.5); g.hazardCircle(e, c.x, c.y, o.r, o.life, e.shotDmg * o.dmg, { warn: g.tele(o.warn), tick: 24, color: o.color, noInstant: true, slow: true }); yield 10; }
    g.sfx('telegraph'); yield g.tele(o.warn) + 14;
  };
  /** seeds fly out and take root where they land: each leaves a bed of briars that cuts and clings */
  lib.seedfall = function* (e, g, o) {
    o = Object.assign({ n: 7, speed: 2.5, dmg: 0.5, color: '#9ad04a', min: 55, max: 105, r: 44, life: 400, aim: 0, tele: 20 }, o);
    const dur = g.tele(o.tele); g.zoneCircle(e, e.x, e.y, e.r + 24, dur, 0, { color: o.color, follow: true, hurts: false }); yield dur;
    const n = N(e, o.n), a0 = o.aim ? ang(e, g) : g.rng.next() * TAU;
    for (let k = 0; k < n; k++) {
      const a = o.aim ? a0 + (k - (n - 1) / 2) * 0.3 : a0 + k * TAU / n, life = o.min + g.rng.next() * (o.max - o.min);
      g.eShot(e, a, o.speed * sc(e).spd, { dmg: o.dmg, color: o.color, r: 6, life, kind: 'orb', onDie(gg, b) { if (b.x < 70 || b.x > 890 || b.y < 70 || b.y > 506) return; gg.hazardCircle(e, b.x, b.y, o.r, o.life, e.shotDmg * 0.55, { warn: gg.tele(26), tick: 26, color: o.color, noInstant: true, slow: true }); } });
    }
    g.sfx('shoot'); yield 30 / rateOf(e);
  };

  // ------------------------------------------------------------------ the machinery that puts a land's boss on the right floor
  const clash = (what, id) => (ED.collisions = ED.collisions || []).push(what + ' ' + id);
  const LANDS = {};                                                 // land id -> { bosses: {depth: id}, mega: id }
  const roman = ED.bosses.roman;
  /** a re-dressed older boss: same body and phases, the land's colours and name, one or two attacks swapped (o.tint recolours every attack, o.add puts more attacks into a phase, o.enter replaces a phase's arena rewrite) */
  function variant(baseId, o) {
    const b = ED.bosses.DEFS[baseId] || ED.bosses.MEGAS[baseId], attacks = Object.assign({}, b.attacks);
    if (o.tint) for (const k in attacks) { const a = attacks[k]; if (Array.isArray(a) && a[1] && a[1].color) attacks[k] = [a[0], Object.assign({}, a[1], { color: o.tint })]; }      // recolour every attack that has a colour
    Object.assign(attacks, o.swap || {});
    const phases = b.phases.map((p, i) => Object.assign({}, p, { attacks: p.attacks.concat((o.add && o.add[i]) || []), name: (o.phaseNames && o.phaseNames[p.name]) || p.name, enter: (o.enter && o.enter[i]) || p.enter }));
    return Object.assign({}, b, { id: o.id, pack: V, landOnly: true, megaIndex: undefined, name: o.name, title: o.title, color: o.color, accent: o.accent || b.accent, teaches: o.teaches, unlock: { boss: o.id }, attacks, phases, arena: o.arena || b.arena, base: baseId });
  }
  function addBoss(def) { const t = def.mega ? ED.bosses.MEGAS : ED.bosses.DEFS; if (t[def.id]) clash('boss', def.id); def.pack = V; def.landOnly = true; t[def.id] = def; return def; }
  function land(id, boss1, boss3, mega) { LANDS[id] = { bosses: { 1: boss1, 3: boss3 }, mega }; }
  const nameOf = (spec, def, partner) => {
    let name = def.name + ', ' + def.title; if (partner && !spec.fused) name = def.name + ' & ' + partner.name; if (spec.fused && partner) name = def.name + '-' + partner.name + ', the Fused'; if (spec.tier > 1) name += ' — Tier ' + roman(spec.tier); return name;
  };
  ED.specMods.push((spec) => {
    if (!P.on(V) || spec.final) return; const wi = W.at(spec.floor), L_ = wi && wi.routed && LANDS[wi.w.id]; if (!L_) return;          // only a land you chose to enter has its own line: the straight line down keeps the old rotation
    const id = spec.mega ? L_.mega : (L_.bosses[wi.depth] || null); if (!id) return;
    const defs = spec.mega ? ED.bosses.MEGAS : ED.bosses.DEFS, def = defs[id]; if (!def) return;
    const partner = spec.partnerId ? defs[spec.partnerId] : null; spec.defId = id; spec.color = def.color; spec.arena = def.arena || spec.arena; spec.name = nameOf(spec, def, partner); spec.land = wi.w.id;
  });
  const relic = (key, def) => I.addRelic(key, Object.assign({ pack: V, mods: {} }, def));
  // part geometry + art (plain shapes): `part` registers a kind's position and its drawing
  const part = (kind, pos, draw) => { if (ED.partPos[kind] || ED.partDraw[kind]) clash('part kind', kind); ED.partPos[kind] = pos; ED.partDraw[kind] = draw; };
  /** parts that circle the body: each part may carry its own radius factor (def.rad), speed factor (def.spd) and direction (def.dir) */
  const orbit = (speed, rad, sq) => (e, p, g, t) => { const d = p.def || {}, a = p.ang + t * speed * (d.spd || 1) * (d.dir || 1), rr = e.r * (d.rad || rad); return [e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr * (sq || 1)]; };
  /** parts hung on one side of the body */
  const flank = (dx, dy, sway) => (e, p, g, t) => [e.x + p.side * e.r * dx, e.y + e.r * dy + Math.sin(t * 0.03 + p.side) * sway];
  /** parts fixed at an angle round the body, swaying a little */
  const hung = (rx, ry, sway) => (e, p, g, t) => [e.x + Math.cos(p.ang) * e.r * rx, e.y + Math.sin(p.ang) * e.r * ry + Math.sin(t * 0.03 + p.ang * 2) * sway];
  const BD = ED.bossDraw;
  const slit = (c, x, y, r, col) => { c.fillStyle = '#10101c'; c.fillRect(x - r * 0.4, y - r * 0.08, r * 0.8, r * 0.2); c.fillStyle = col; c.fillRect(x - r * 0.3, y - r * 0.04, r * 0.2, r * 0.1); c.fillRect(x + r * 0.1, y - r * 0.04, r * 0.2, r * 0.1); };
  ED.v20 = { LANDS, variant, addBoss, land, part, orbit, flank, hung, nameOf, healBoss };

  // ==================================================================== THE SUNKEN OSSUARY — water, and what it keeps
  addBoss({ id: 'maelor', name: 'Maelor', title: 'the Drowned Cantor', color: '#8fe8d8', accent: '#e8fff8', r: 44, hp: 470, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'cantor', contact: 5,
    teaches: 'His hymn keeps the tide: a wall of water sweeps the arena and one lane stays dry — it glows green first. Cross through the gap.', unlock: { boss: 'maelor' },
    attacks: { verse: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, color: '#cfeee8' }), dirge: L('radial', { n: 16, reps: 3, gap: 14, speed: 2.2, rot: 0.17, color: '#bfe8e0' }), surge: L('tideSurge', {}), surge2: L('tideSurge', { n: 2, speed: 5 }),
      drown: L('flood', { ring: 1 }), choir: L('summon', { types: ['ossicle', 'drowner'], n: 3, max: 6, hpMul: 0.8 }),
      hymn: L('metronome', { beats: 5, period: 24, color: '#8fe8d8', fire: { 2: ['radial', { n: 12, reps: 1, speed: 2.4, color: '#8fe8d8' }], 4: ['fan', { n: 7, spread: 0.2, reps: 1, speed: 3, color: '#cfeee8' }] } }) },
    phases: [
      { at: 1.0, name: 'Opening Verse', attacks: ['verse', 'dirge', 'choir'], idle: [38, 66] },
      { at: 0.62, name: 'Rising Tide', attacks: ['verse', 'surge', 'drown', 'dirge', 'hymn'], idle: [28, 52], enter: [L('flood', { ring: 1 })] },
      { at: 0.32, name: 'Drowning Chorus', attacks: ['surge', 'dirge', 'choir', 'drown', 'hymn'], idle: [22, 42], enter: [L('flood', { ring: 2 })] },
      { at: 0.12, minTier: 2, name: 'Last Hymn', attacks: ['surge2', 'dirge', 'verse', 'hymn'], idle: [16, 32] },
    ] });
  addBoss(variant('vael', { id: 'oriel', name: 'Ser Oriel', title: 'the Sunken Knight', color: '#7ad0c0', accent: '#e8fff8', arena: 'arena_pillars',
    teaches: 'A knight who fell in with the tide: his blades come slower and wetter, and a wave sweeps the room as he fights — find the dry lane.',
    swap: { blades: L('fan', { n: 5, spread: 0.24, reps: 2, gap: 20, speed: 2.7, dmg: 0.9, color: '#9fe8da' }), surge: L('tideSurge', { speed: 3.8 }), phantoms: L('summon', { types: ['drowner', 'ossicle'], n: 2, max: 5, hpMul: 0.8 }) },
    add: { 1: ['surge'], 2: ['surge'] }, phaseNames: { 'The Duelist': 'The Drowned Duelist', Fury: 'Undertow' } }));
  addBoss({ id: 'thalassa', name: 'Thalassa', title: 'the Sunken Bell', color: '#6fd0c0', accent: '#d8fff4', r: 104, hp: 1320, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'sunkenbell', mega: true, contact: 6,
    teaches: 'The bell tolls the tide. Cut the buoys that carry its voice, break the drowned hands that ring it, then crack the bell itself.', unlock: { boss: 'thalassa' },
    parts: [
      { id: 'b0', kind: 'buoy', r: 28, hp: 0.07, group: 0, ang: 0.5 }, { id: 'b1', kind: 'buoy', r: 28, hp: 0.07, group: 0, ang: 2.07 }, { id: 'b2', kind: 'buoy', r: 28, hp: 0.07, group: 0, ang: 3.64 }, { id: 'b3', kind: 'buoy', r: 28, hp: 0.07, group: 0, ang: 5.21 },
      { id: 'handL', kind: 'arm', r: 46, hp: 0.12, group: 1, side: -1 }, { id: 'handR', kind: 'arm', r: 46, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 56, hp: 0.48, group: 2 },
    ],
    attacks: { toll: L('beams', { n: 3, len: 720, w: 24, warn: 52, life: 110, rot: 0.02, dmg: 0.85, color: '#8fe8d8', anchorParts: 'buoy' }), surge: L('tideSurge', {}), surge2: L('tideSurge', { n: 2, speed: 5.2 }), fists: L('fists', {}), fists3: L('fists', { n: 3 }),
      dirge: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.3, rot: 0.16, color: '#bfe8e0' }), drown: L('flood', { ring: 1 }), rise: L('summon', { types: ['ossicle', 'drowner', 'brinewisp'], n: 3, max: 8, hpMul: 0.8, radius: 190 }),
      peal: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#6fd0c0' }),
      hymn: L('metronome', { beats: 6, period: 22, color: '#8fe8d8', fire: { 2: ['radial', { n: 14, reps: 1, speed: 2.4, color: '#8fe8d8' }], 5: ['fan', { n: 9, spread: 0.18, reps: 1, speed: 3, color: '#cfeee8' }] } }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'The Buoys Sing', attacks: ['toll', 'dirge', 'surge'], idle: [36, 62] },
      { name: 'Drowned Hands', attacks: ['fists', 'surge', 'rise', 'drown', 'hymn'], idle: [30, 54], enter: [L('flood', { ring: 1 })] },
      { name: 'Tolling', attacks: ['fists3', 'surge2', 'toll', 'dirge', 'hymn'], idle: [26, 46], enter: [L('flood', { ring: 2 }), L('pillars', { n: 3, max: 8 })] },
      { name: 'Deep Water', attacks: ['surge2', 'spiral', 'rise', 'hymn', 'dirge'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE LAST TOLL', attacks: ['peal', 'surge2', 'spiral', 'hymn', 'fists3'], idle: [14, 28], enter: [L('flood', { ring: 3 })] },
    ],
    phaseOf(e) {
      const buoys = e.parts.filter(p => p.kind === 'buoy' && !p.dead).length, hands = e.parts.filter(p => p.kind === 'arm' && !p.dead).length;
      if (buoys) return 0; if (hands) return 1; const core = e.parts.find(p => p.id === 'core'), f = core.hp / core.maxHp; return f > 0.6 ? 2 : f > 0.28 ? 3 : 4;
    } });
  land('ossuary', 'maelor', 'oriel', 'thalassa');
  part('buoy', orbit(0.013, 1.32, 0.95), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#e8fff8' : '#5a8a8a'); c.beginPath(); c.moveTo(p.x, p.y - p.r * 1.1); c.quadraticCurveTo(p.x + p.r, p.y, p.x, p.y + p.r * 0.9); c.quadraticCurveTo(p.x - p.r, p.y, p.x, p.y - p.r * 1.1); c.fill(); c.stroke();
    c.fillStyle = '#c0392b'; c.fillRect(p.x - p.r * 0.5, p.y - p.r * 0.1, p.r, p.r * 0.28); if (vul) glow(c, p.x, p.y - p.r * 0.6, p.r, '#8fe8d8', 0.3 + 0.1 * Math.sin(t * 0.3)); });
  BD.cantor = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.45); c.beginPath(); c.moveTo(x - r * 0.95, y + r); c.lineTo(x - r * 0.5, y - r * 0.6); c.lineTo(x + r * 0.5, y - r * 0.6); c.lineTo(x + r * 0.95, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.6, r * 0.52, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#0a1c1a'; c.beginPath(); c.ellipse(x, y - r * 0.5, r * 0.22, r * 0.2 + Math.sin(t * 0.2) * 3, 0, 0, TAU); c.fill();
    c.fillStyle = '#d8fff4'; c.fillRect(x - r * 0.4, y - r * 0.78, r * 0.18, r * 0.1); c.fillRect(x + r * 0.22, y - r * 0.78, r * 0.18, r * 0.1);
    c.save(); c.strokeStyle = 'rgba(143,232,216,0.55)'; c.lineWidth = 3; for (let k = 0; k < 3; k++) { c.beginPath(); for (let i = 0; i <= 14; i++) { const px = x - r + i * r / 7, py = y + r * (0.35 + k * 0.2) + Math.sin(i * 0.9 + t * 0.07 + k) * 4; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); } c.restore(); };
  BD.sunkenbell = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.4); c.beginPath(); c.arc(x, y - r * 0.15, r * 0.95, Math.PI, 0); c.lineTo(x + r * 1.05, y + r * 0.7); c.lineTo(x - r * 1.05, y + r * 0.7); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.15, r * 0.78, Math.PI, 0); c.lineTo(x + r * 0.85, y + r * 0.6); c.lineTo(x - r * 0.85, y + r * 0.6); c.closePath(); c.fill();
    c.save(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * r * 0.3, y - r * 0.8); c.lineTo(x + k * r * 0.34, y + r * 0.6); c.stroke(); } c.restore();
    c.fillStyle = '#e8d890'; c.beginPath(); c.arc(x + Math.sin(t * 0.04) * r * 0.1, y + r * 0.78, r * 0.18, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#10201e'; c.fillRect(x - r * 0.3, y - r * 0.4, r * 0.18, r * 0.2); c.fillRect(x + r * 0.12, y - r * 0.4, r * 0.18, r * 0.2); c.fillStyle = '#d8fff4'; c.fillRect(x - r * 0.26, y - r * 0.35, r * 0.1, r * 0.08); c.fillRect(x + r * 0.16, y - r * 0.35, r * 0.1, r * 0.08); };
  relic('tidalpearl', { id: 'tidalpearl', name: 'Tidal Pearl', rarity: 'legendary', color: '#8fe8d8', mods: { waterWalk: 1, regen: 2, def: 1 }, unique: true, unlock: 'boss:maelor', desc: 'Water no longer slows you, wounds knit slowly, +1 defense. (Unlockable)' });
  relic('sunkenbell', { id: 'sunkenbell', name: 'The Sunken Bell', rarity: 'legendary', color: '#6fd0c0', mods: { maxHp: 4, def: 1 }, unique: true, unlock: 'boss:thalassa', on: { clear(g) { if (g.player.hp < g.player.maxHp) g.healPlayer(2, true); } }, desc: 'A heart container and +1 defense; clearing a room heals half a heart. (Unlockable)' });

  // ==================================================================== THE CLOCKWORK ORRERY — everything keeps time
  addBoss({ id: 'kairos', name: 'Kairos', title: 'the Metronome', color: '#ffd24a', accent: '#fff6c0', r: 46, hp: 480, rScale: 1.0, hpScale: 1.0, arena: 'arena_grid', shape: 'metronome', contact: 5,
    teaches: 'Kairos keeps strict time: every attack lands on a beat you can count. Move between the beats — and keep out of the slow time wells.', unlock: { boss: 'kairos' },
    attacks: { tick: L('radial', { n: 12, reps: 4, gap: 10, speed: 2.4, rot: 0.3, color: '#ffd24a' }),
      beat: L('metronome', { beats: 6, period: 24, color: '#ffd24a', fire: { 2: ['radial', { n: 10, reps: 1, speed: 2.4, color: '#ffd24a' }], 5: ['fan', { n: 7, spread: 0.2, reps: 1, speed: 3, color: '#fff0b0' }] } }),
      beat2: L('metronome', { beats: 8, period: 18, color: '#ffd24a', fire: { 1: ['radial', { n: 10, reps: 1, speed: 2.5, color: '#ffd24a' }], 3: ['fan', { n: 7, spread: 0.2, reps: 1, speed: 3.1, color: '#fff0b0' }], 5: ['radial', { n: 12, reps: 1, speed: 2.5, color: '#ffd24a' }], 7: ['fan', { n: 9, spread: 0.17, reps: 1, speed: 3.2, color: '#fff0b0' }] } }),
      pendulum: L('beams', { n: 1, len: 780, w: 34, warn: 40, life: 140, rot: 0.032, dmg: 1.0, color: '#ffd24a' }), pendulum2: L('beams', { n: 2, len: 780, w: 30, warn: 44, life: 140, rot: 0.028, dmg: 1.0, color: '#ffd24a' }),
      crush: L('bars', { n: 3, thick: 54, gapW: 150, warn: 64, color: '#ffb04a' }), crushV: L('bars', { n: 3, thick: 54, gapW: 150, warn: 62, vertical: true, color: '#ffb04a' }),
      wells: L('wells', { n: 3, r: 64, life: 420, color: '#9ab0ff' }), cogs: L('summon', { types: ['cogwalker', 'escapement'], n: 2, max: 4, hpMul: 0.8 }) },
    phases: [
      { at: 1.0, name: 'Andante', attacks: ['beat', 'tick', 'wells'], idle: [38, 64] },
      { at: 0.64, name: 'Allegro', attacks: ['beat', 'pendulum', 'crush', 'wells', 'cogs'], idle: [28, 52] },
      { at: 0.34, name: 'Presto', attacks: ['beat2', 'pendulum', 'crush', 'crushV', 'tick', 'cogs'], idle: [22, 42], enter: [L('wells', { n: 4 })] },
      { at: 0.12, minTier: 2, name: 'Fermata', attacks: ['beat2', 'pendulum2', 'crush', 'crushV', 'wells'], idle: [16, 32] },
    ] });
  addBoss(variant('aegis', { id: 'ormolu', name: 'Ormolu', title: 'the Brass Sentinel', color: '#d8b04a', accent: '#fff0b0', tint: '#ffd24a', arena: 'arena_cross',
    teaches: 'Brass shards guard the core, and the pulse now comes on a beat. Break the shards, then punish the core before they reform; keep out of the slow wells.',
    swap: { pulse: L('metronome', { beats: 5, period: 22, color: '#ffd24a', fire: { 1: ['radial', { n: 14, reps: 1, speed: 2.4, color: '#ffd24a' }], 3: ['radial', { n: 14, reps: 1, speed: 2.4, color: '#ffd24a' }] } }), wells: L('wells', { n: 3, r: 60, life: 380, color: '#9ab0ff' }) },
    add: { 1: ['wells'], 2: ['wells'] }, phaseNames: { 'Prismatic Guard': 'Brass Guard', Refraction: 'Escapement', 'Total Spectrum': 'Full Chime', 'Shattered Light': 'Stopped Clock' } }));
  addBoss({ id: 'perihelion', name: 'Perihelion', title: 'the Brass Heavens', color: '#e8c060', accent: '#fff0b0', r: 100, hp: 1350, rScale: 1.0, hpScale: 1.02, arena: 'arena_round', shape: 'perihelion', mega: true, contact: 6,
    teaches: 'A model of the heavens, made to run on time. Break the planets that carry its beams, then the armillary arcs, then the sun at its heart.', unlock: { boss: 'perihelion' },
    parts: [
      { id: 'p0', kind: 'planet', r: 26, hp: 0.07, group: 0, ang: 0, rad: 1.25, spd: 1.5 }, { id: 'p1', kind: 'planet', r: 30, hp: 0.07, group: 0, ang: 2.1, rad: 1.62, dir: -1, spd: 1.1 }, { id: 'p2', kind: 'planet', r: 24, hp: 0.07, group: 0, ang: 4.2, rad: 1.95, spd: 0.8 },
      { id: 'arcL', kind: 'armillary', r: 46, hp: 0.14, group: 1, side: -1 }, { id: 'arcR', kind: 'armillary', r: 46, hp: 0.14, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 54, hp: 0.51, group: 2 },
    ],
    attacks: { align: L('beams', { n: 3, len: 740, w: 24, warn: 54, life: 120, rot: 0.018, dmg: 0.85, color: '#ffd24a', anchorParts: 'planet' }), align2: L('beams', { n: 4, len: 740, w: 22, warn: 56, life: 120, rot: 0.016, dmg: 0.85, color: '#fff0b0', anchorParts: 'planet' }),
      tick: L('radial', { n: 12, reps: 5, gap: 10, speed: 2.4, rot: 0.26, color: '#ffd24a' }), tock: L('hazardRings', { n: 4, spacing: 30, speed: 2.7, color: '#ffd24a' }), comet: L('homing', { n: 4, speed: 1.8, color: '#fff0b0' }),
      crush: L('bars', { n: 4, thick: 48, gapW: 150, warn: 70, color: '#ffb04a' }), crushV: L('bars', { n: 4, thick: 48, gapW: 150, warn: 70, vertical: true, color: '#ffb04a' }), wells: L('wells', { n: 3, r: 66, life: 440, color: '#9ab0ff' }),
      beat: L('metronome', { beats: 6, period: 22, color: '#ffd24a', fire: { 2: ['radial', { n: 14, reps: 1, speed: 2.5, color: '#ffd24a' }], 5: ['fan', { n: 9, spread: 0.18, reps: 1, speed: 3.1, color: '#fff0b0' }] } }),
      eclipse: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), spiral: L('spiral', { arms: 5, frames: 100, speed: 2.1, color: '#ffd24a' }), pillars: L('pillars', { n: 3, max: 8 }), gearsum: L('summon', { types: ['cogwalker', 'mainspring'], n: 2, max: 4, hpMul: 0.7 }) },
    phases: [
      { name: 'Planets Align', attacks: ['align', 'tick', 'tock', 'comet'], idle: [34, 60] },
      { name: 'Armillary', attacks: ['crush', 'tick', 'comet', 'wells', 'gearsum', 'beat'], idle: [28, 50], enter: [L('shrink', { ring: 1, tile: T.PIT })] },
      { name: 'The Sun Wakes', attacks: ['align2', 'crushV', 'tock', 'spiral', 'comet', 'beat'], idle: [24, 44], enter: [L('shrink', { ring: 2, tile: T.PIT }), L('pillars', { n: 3, max: 8 })] },
      { name: 'SOLSTICE', attacks: ['eclipse', 'align2', 'crush', 'crushV', 'spiral', 'tick'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.LAVA })] },
    ],
    phaseOf(e) {
      const planets = e.parts.filter(p => p.kind === 'planet' && !p.dead).length, arcs = e.parts.filter(p => p.kind === 'armillary' && !p.dead).length;
      if (planets) return 0; if (arcs) return 1; const core = e.parts.find(p => p.id === 'core'); return core.hp / core.maxHp > 0.3 ? 2 : 3;
    } });
  land('orrery', 'kairos', 'ormolu', 'perihelion');
  part('planet', orbit(0.02, 1.4, 0.62), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#ffe9a0' : '#9a7a3a'); c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.stroke();
    c.save(); c.beginPath(); c.arc(p.x, p.y, p.r - 1, 0, TAU); c.clip(); c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(p.x - p.r, p.y - p.r * 0.2, p.r * 2, p.r * 0.35); c.restore();
    c.strokeStyle = 'rgba(255,240,176,0.7)'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y, p.r * 1.5, p.r * 0.4, -0.35, 0, TAU); c.stroke();
    c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(p.x + Math.cos(t * 0.05 + p.ang) * p.r * 1.45, p.y + Math.sin(t * 0.05 + p.ang) * p.r * 0.7, p.r * 0.2, 0, TAU); c.fill();
    if (vul) glow(c, p.x, p.y, p.r * 1.5, '#ffd24a', 0.25); });
  part('armillary', flank(1.45, 0.05, 8), (c, e, p, vul, fl, t) => {
    c.strokeStyle = fl ? '#fff' : (vul ? '#ffe9a0' : '#8a6a2a'); c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.arc(p.x - p.side * p.r * 0.5, p.y, p.r * 1.15, p.side > 0 ? -1.15 : Math.PI - 1.15, p.side > 0 ? 1.15 : Math.PI + 1.15); c.stroke();
    c.strokeStyle = '#3a2a10'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#fff0b0'; for (const k of [-0.8, 0, 0.8]) { c.beginPath(); c.arc(p.x - p.side * p.r * 0.5 + Math.cos((p.side > 0 ? 0 : Math.PI) + k) * p.r * 1.15, p.y + Math.sin((p.side > 0 ? 0 : Math.PI) + k) * p.r * 1.15, 4, 0, TAU); c.fill(); }
    if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffd24a', 0.2); });
  BD.metronome = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.45); c.beginPath(); c.moveTo(x - r * 0.98, y + r); c.lineTo(x - r * 0.42, y - r * 1.05); c.lineTo(x + r * 0.42, y - r * 1.05); c.lineTo(x + r * 0.98, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.moveTo(x - r * 0.72, y + r * 0.86); c.lineTo(x - r * 0.3, y - r * 0.86); c.lineTo(x + r * 0.3, y - r * 0.86); c.lineTo(x + r * 0.72, y + r * 0.86); c.closePath(); c.fill();
    c.save(); c.translate(x, y + r * 0.72); c.rotate(Math.sin(t * 0.09) * 0.55); c.strokeStyle = '#3a2a10'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r * 1.75); c.stroke(); c.fillStyle = '#fff0b0'; c.fillRect(-r * 0.22, -r * 1.3, r * 0.44, r * 0.3); c.strokeRect(-r * 0.22, -r * 1.3, r * 0.44, r * 0.3); c.restore();
    c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(x, y + r * 0.18, r * 0.34, 0, TAU); c.fill(); c.stroke(); c.save(); c.strokeStyle = '#3a2a10'; c.lineWidth = 2; for (let k = 0; k < 12; k++) { const a = k * TAU / 12; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.27, y + r * 0.18 + Math.sin(a) * r * 0.27); c.lineTo(x + Math.cos(a) * r * 0.32, y + r * 0.18 + Math.sin(a) * r * 0.32); c.stroke(); }
    c.beginPath(); c.moveTo(x, y + r * 0.18); c.lineTo(x + Math.cos(t * 0.09) * r * 0.24, y + r * 0.18 + Math.sin(t * 0.09) * r * 0.24); c.stroke(); c.restore(); slit(c, x, y - r * 0.5, r, '#ffe9a0'); };
  BD.perihelion = (c, e, x, y, r, col, dk, t) => {
    c.save(); c.strokeStyle = 'rgba(255,224,150,0.25)'; c.lineWidth = 2; for (const k of [1.25, 1.62, 1.95]) { c.beginPath(); c.ellipse(x, y, r * k, r * k * 0.62, 0, 0, TAU); c.stroke(); } c.restore();
    c.fillStyle = darker(col, 0.5); c.beginPath(); c.arc(x, y, r * 0.98, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = darker(col, 0.25); c.beginPath(); c.arc(x, y, r * 0.78, 0, TAU); c.fill();
    c.save(); c.translate(x, y); c.rotate(t * 0.006); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3; for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(Math.cos(k * TAU / 8) * r * 0.3, Math.sin(k * TAU / 8) * r * 0.3); c.lineTo(Math.cos(k * TAU / 8) * r * 0.95, Math.sin(k * TAU / 8) * r * 0.95); c.stroke(); } c.restore();
    glow(c, x, y, r * 0.8, '#ffd24a', 0.18 + 0.05 * Math.sin(t * 0.1)); };
  relic('pocketbeat', { id: 'pocketbeat', name: 'Pocket Metronome', rarity: 'legendary', color: '#ffd24a', mods: { atkSpd: 0.1, dashCd: -0.12 }, unique: true, unlock: 'boss:kairos', desc: 'Everything you do comes a beat sooner: +10% attack speed, a faster dash recharge. (Unlockable)' });
  relic('brassplanet', { id: 'brassplanet', name: 'Brass Planet', rarity: 'legendary', color: '#e8c060', mods: { orbit: 2, dmg: 0.05 }, unique: true, unlock: 'boss:perihelion', desc: 'Two brass worlds circle you like orbiting blades; +5% damage. (Unlockable)' });

  // ==================================================================== THE GILDED VAULT — everything has a price
  addBoss({ id: 'mammon', name: 'Mammon', title: 'the Tollbaron', color: '#ffcc40', accent: '#fff2b0', r: 48, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_throne', shape: 'tollbaron', contact: 5,
    teaches: 'His toll rings take your gold, not your health — and every coin feeds him. Slip through the gap, dash through it, or keep your purse light.', unlock: { boss: 'mammon' },
    attacks: { toll: L('tollRing', {}), toll2: L('tollRing', { tele: 30, speed: 3.6, heal: 0.014 }),
      coinfall: L('rain', { n: 9, r: 44, interval: 8, warn: 48, aimed: 0.5, color: '#ffd24a', shrapnel: 4 }), ledger: L('fan', { n: 5, spread: 0.24, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, color: '#ffe9a0' }),
      bounce: L('radial', { n: 12, reps: 3, gap: 14, speed: 2.6, rot: 0.2, color: '#ffd24a', bounce: 1 }), guards: L('summon', { types: ['gildedbrute', 'tollkeeper'], n: 2, max: 4, hpMul: 0.8 }),
      audit: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), shutter: L('bars', { n: 3, thick: 50, gapW: 150, warn: 66, color: '#ffd24a' }) },
    phases: [
      { at: 1.0, name: 'Open for Business', attacks: ['ledger', 'coinfall', 'toll'], idle: [38, 64] },
      { at: 0.64, name: 'Hostile Takeover', attacks: ['toll', 'coinfall', 'bounce', 'guards', 'ledger'], idle: [28, 52] },
      { at: 0.32, name: 'Bankruptcy', attacks: ['toll2', 'bounce', 'shutter', 'coinfall', 'guards'], idle: [22, 42], enter: [L('guards', null)] },
      { at: 0.12, minTier: 2, name: 'Liquidation', attacks: ['audit', 'toll2', 'shutter', 'bounce'], idle: [16, 32] },
    ] });
  addBoss(variant('pyrax', { id: 'auric', name: 'Auric', title: 'the Molten Mint', color: '#ffc040', accent: '#fff2b0', tint: '#ffd24a', arena: 'arena_round',
    teaches: 'The furnace has learned to mint: its breath is gold-hot and coins rain and ricochet. The molten edge still creeps in — keep to the middle.',
    swap: { meteors: L('rain', { n: 9, r: 56, interval: 8, shrapnel: 5, aimed: 0.5, warn: 56, color: '#ffd24a' }), bounce: L('radial', { n: 12, reps: 3, gap: 14, speed: 2.6, rot: 0.2, color: '#ffd24a', bounce: 1 }) },
    add: { 1: ['bounce'], 2: ['bounce'] }, phaseNames: { Smoulder: 'Warming the Press', 'Molten Edge': 'Minting', Inferno: 'Overstrike', Supernova: 'Recall' } }));
  addBoss({ id: 'aurelius', name: 'Aurelius', title: 'the Vault Door', color: '#d8c070', accent: '#fff2b0', r: 108, hp: 1400, rScale: 1.0, hpScale: 1.03, arena: 'arena_throne', shape: 'vaultdoor', mega: true, contact: 6,
    teaches: 'Four locks, two bolts, one dial. The Door takes your gold to mend itself — keep your purse light, and break what holds it shut.', unlock: { boss: 'aurelius' },
    parts: [
      { id: 'k0', kind: 'lock', r: 26, hp: 0.065, group: 0, ang: -2.35 }, { id: 'k1', kind: 'lock', r: 26, hp: 0.065, group: 0, ang: -0.79 }, { id: 'k2', kind: 'lock', r: 26, hp: 0.065, group: 0, ang: 0.79 }, { id: 'k3', kind: 'lock', r: 26, hp: 0.065, group: 0, ang: 2.35 },
      { id: 'boltL', kind: 'bolt', r: 42, hp: 0.12, group: 1, side: -1 }, { id: 'boltR', kind: 'bolt', r: 42, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 54, hp: 0.5, group: 2 },
    ],
    attacks: { lockBeams: L('beams', { n: 3, len: 720, w: 24, warn: 52, life: 110, rot: 0.02, dmg: 0.85, color: '#ffd24a', anchorParts: 'lock' }), dial: L('beams', { n: 2, len: 740, w: 26, warn: 54, life: 120, rot: 0.02, dmg: 0.9, color: '#fff2b0' }),
      toll: L('tollRing', {}), toll2: L('tollRing', { tele: 30, speed: 3.6, heal: 0.014 }), shutter: L('bars', { n: 3, thick: 52, gapW: 150, warn: 66, color: '#ffd24a' }), shutterV: L('bars', { n: 3, thick: 52, gapW: 150, warn: 64, vertical: true, color: '#ffd24a' }),
      coinstorm: L('rain', { n: 12, r: 40, interval: 6, warn: 46, aimed: 0.5, shrapnel: 4, color: '#ffd24a' }), guards: L('summon', { types: ['gildedbrute', 'trapsmith', 'tollkeeper'], n: 3, max: 6, hpMul: 0.8, radius: 200 }),
      audit: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), slam: L('slamRing', { r: 120, tele: 44, rings: 2, speed: 3, gaps: 2, gapW: 0.75, color: '#ffd24a', ringSpacing: 34 }), bounce: L('radial', { n: 14, reps: 3, gap: 12, speed: 2.6, rot: 0.2, color: '#ffd24a', bounce: 1 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Locked', attacks: ['lockBeams', 'toll', 'coinstorm', 'guards', 'bounce'], idle: [36, 62] },
      { name: 'Bolted', attacks: ['slam', 'shutter', 'toll', 'bounce', 'guards'], idle: [30, 54], enter: [L('guards', null)] },
      { name: 'The Dial Turns', attacks: ['dial', 'shutterV', 'toll2', 'bounce', 'coinstorm'], idle: [26, 46], enter: [L('shrink', { ring: 1, tile: T.SPIKE }), L('pillars', { n: 3, max: 8 })] },
      { name: 'Tumblers', attacks: ['shutter', 'shutterV', 'coinstorm', 'toll2', 'guards', 'slam'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.SPIKE })] },
      { name: 'OPEN SESAME', attacks: ['audit', 'shutterV', 'toll2', 'coinstorm', 'bounce'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.SPIKE })] },
    ],
    phaseOf(e) {
      const locks = e.parts.filter(p => p.kind === 'lock' && !p.dead).length, bolts = e.parts.filter(p => p.kind === 'bolt' && !p.dead).length;
      if (locks) return 0; if (bolts) return 1; const core = e.parts.find(p => p.id === 'core'), f = core.hp / core.maxHp; return f > 0.6 ? 2 : f > 0.28 ? 3 : 4;
    } });
  land('vault', 'mammon', 'auric', 'aurelius');
  part('lock', hung(0.8, 0.8, 3), (c, e, p, vul, fl, t) => {
    c.strokeStyle = fl ? '#fff' : '#cfcfdc'; c.lineWidth = 5; c.beginPath(); c.arc(p.x, p.y - p.r * 0.35, p.r * 0.5, Math.PI, 0); c.stroke(); c.strokeStyle = '#1a1a22'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = fl ? '#fff' : (vul ? '#ffe9a0' : '#8a7a3a'); c.fillRect(p.x - p.r * 0.75, p.y - p.r * 0.35, p.r * 1.5, p.r * 1.1); c.strokeRect(p.x - p.r * 0.75, p.y - p.r * 0.35, p.r * 1.5, p.r * 1.1);
    c.fillStyle = '#1a1a22'; c.beginPath(); c.arc(p.x, p.y + p.r * 0.05, p.r * 0.17, 0, TAU); c.fill(); c.fillRect(p.x - p.r * 0.07, p.y + p.r * 0.05, p.r * 0.14, p.r * 0.3); if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffd24a', 0.25 + 0.08 * Math.sin(t * 0.25)); });
  part('bolt', flank(1.12, 0.05, 6), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#e8e8f4' : '#7a7a8c'); c.fillRect(p.x - p.r * 1.1, p.y - p.r * 0.38, p.r * 2.2, p.r * 0.76); c.strokeRect(p.x - p.r * 1.1, p.y - p.r * 0.38, p.r * 2.2, p.r * 0.76);
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = -2; k <= 2; k++) c.fillRect(p.x + k * p.r * 0.4 - 2, p.y - p.r * 0.38, 4, p.r * 0.76); c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(p.x - p.side * p.r * 0.8, p.y, p.r * 0.18, 0, TAU); c.fill(); if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffd24a', 0.2); });
  BD.tollbaron = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.45); c.beginPath(); c.ellipse(x, y + r * 0.35, r * 1.0, r * 0.85, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y + r * 0.42, r * 0.68, r * 0.58, 0, 0, TAU); c.fill(); c.fillStyle = '#5a4010'; c.font = 'bold ' + Math.round(r * 0.62) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', x, y + r * 0.44);
    c.fillStyle = '#f4e4c0'; c.beginPath(); c.arc(x, y - r * 0.42, r * 0.42, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#1a1a22'; c.fillRect(x - r * 0.52, y - r * 0.84, r * 1.04, r * 0.12); c.fillRect(x - r * 0.32, y - r * 1.3, r * 0.64, r * 0.5); c.fillStyle = col; c.fillRect(x - r * 0.32, y - r * 0.95, r * 0.64, r * 0.1);
    c.fillStyle = '#1a1a22'; c.beginPath(); c.arc(x - r * 0.15, y - r * 0.46, r * 0.05, 0, TAU); c.arc(x + r * 0.15, y - r * 0.46, r * 0.05, 0, TAU); c.fill(); c.save(); c.strokeStyle = '#ffd24a'; c.lineWidth = 2; c.beginPath(); c.arc(x + r * 0.15, y - r * 0.46, r * 0.12, 0, TAU); c.stroke(); c.strokeStyle = '#3a2a10'; c.beginPath(); c.moveTo(x - r * 0.3, y - r * 0.24); c.quadraticCurveTo(x, y - r * 0.12, x + r * 0.3, y - r * 0.24); c.stroke(); c.restore();
    for (const s of [-1, 1]) { const hy = y + r * 0.1 + Math.sin(t * 0.08 + s) * 5; c.fillStyle = '#c8c8d4'; c.beginPath(); c.ellipse(x + s * r * 1.1, hy, r * 0.28, r * 0.08, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#ffd24a'; for (let k = 0; k < 3; k++) c.fillRect(x + s * r * 1.1 - r * 0.1, hy - 4 - k * 4, r * 0.2, 3); } };
  BD.vaultdoor = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#3a3a44'; c.beginPath(); c.arc(x, y, r * 1.03, 0, TAU); c.fill(); c.stroke(); c.fillStyle = darker(col, 0.35); c.beginPath(); c.arc(x, y, r * 0.93, 0, TAU); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.8, 0, TAU); c.fill();
    c.fillStyle = darker(col, 0.5); for (let k = 0; k < 16; k++) { c.beginPath(); c.arc(x + Math.cos(k * TAU / 16) * r * 0.87, y + Math.sin(k * TAU / 16) * r * 0.87, r * 0.035, 0, TAU); c.fill(); }
    c.save(); c.translate(x, y); c.rotate(t * 0.004); c.strokeStyle = 'rgba(40,30,10,0.55)'; c.lineWidth = 6; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(Math.cos(k * TAU / 6) * r * 0.22, Math.sin(k * TAU / 6) * r * 0.22); c.lineTo(Math.cos(k * TAU / 6) * r * 0.64, Math.sin(k * TAU / 6) * r * 0.64); c.stroke(); } c.beginPath(); c.arc(0, 0, r * 0.64, 0, TAU); c.stroke(); c.restore(); };
  relic('ledger', { id: 'ledger', name: "Tollbaron's Ledger", rarity: 'legendary', color: '#ffcc40', mods: { gold: 0.25, price: -0.1, luck: 1 }, unique: true, unlock: 'boss:mammon', desc: '+25% gold, shops charge 10% less, +1 luck. (Unlockable)' });
  relic('vaultring', { id: 'vaultring', name: 'Vault Key Ring', rarity: 'legendary', color: '#d8c070', mods: { luck: 1, gold: 0.15 }, unique: true, unlock: 'boss:aurelius', on: { floorStart(g) { g.giveKey('small', true); } }, desc: 'A small key on every floor, +15% gold, +1 luck. (Unlockable)' });

  // ==================================================================== THORNWOOD HOLLOW — it grows back
  addBoss({ id: 'verdane', name: 'Verdane', title: 'the Thorn Mother', color: '#8ad04a', accent: '#e8ffb0', r: 48, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'thornmother', contact: 5,
    teaches: 'Her seeds take root where they land: each leaves a bed of briars that cuts and clings. Keep to open ground, keep moving, and watch where the seeds fall.', unlock: { boss: 'verdane' },
    attacks: { seeds: L('seedfall', {}), seeds2: L('seedfall', { n: 10, speed: 2.8, min: 60, max: 120 }), aimed: L('seedfall', { n: 5, aim: 1, speed: 3.0, min: 70, max: 110 }),
      vines: L('vines', { n: 3, spread: 0.62, w: 44, tele: 46, color: '#7ae06a' }), vines2: L('vines', { n: 4, spread: 0.5, w: 40, tele: 40, waves: 2, color: '#7ae06a' }),
      brood: L('summon', { types: ['rootling', 'bramblehound'], n: 2, max: 5, hpMul: 0.8 }), spores: L('radial', { n: 14, reps: 3, gap: 16, speed: 1.9, wave: 0.9, color: '#9be86a', rot: 0.16 }),
      thornring: L('slamRing', { r: 92, tele: 38, rings: 2, speed: 3, gaps: 1, gapW: 0.9, color: '#8ad04a', bullets: 10 }), hail: L('rain', { n: 9, r: 46, interval: 9, warn: 52, aimed: 0.5, color: '#8ad04a', shrapnel: 4 }),
      helix: L('spiral', { arms: 3, frames: 84, speed: 1.9, color: '#9be86a', rot: 0.06 }) },
    phases: [
      { at: 1.0, name: 'Spring', attacks: ['seeds', 'vines', 'brood'], idle: [36, 64] },
      { at: 0.64, name: 'Overgrowth', attacks: ['seeds', 'aimed', 'vines2', 'brood', 'spores', 'thornring'], idle: [28, 50], enter: [L('seedfall', { n: 8 })] },
      { at: 0.32, name: 'Thorn Crown', attacks: ['seeds2', 'vines2', 'hail', 'thornring', 'helix', 'brood'], idle: [22, 42], enter: [L('shrink', { ring: 1, tile: T.SPIKE })] },
      { at: 0.12, minTier: 2, name: 'Withering', attacks: ['seeds2', 'aimed', 'hail', 'helix', 'vines2'], idle: [16, 34] },
    ] });
  addBoss(variant('mycelia', { id: 'brier', name: 'Lady Brier', title: 'the Bramble Queen', color: '#6aa83a', accent: '#ffd0e0', arena: 'arena_ruins',
    teaches: 'Her court is briar: thorn-hounds and rootlings answer her call, and her seeds leave beds of thorns. Kill the adds, dodge the beds, keep moving.',
    swap: { shrooms: L('summon', { types: ['rootling', 'bramblehound'], n: 3, max: 6, hpMul: 0.9 }), spores: L('fan', { n: 7, spread: 0.2, reps: 2, gap: 16, speed: 2.8, dmg: 0.9, color: '#c8e090' }), seeds: L('seedfall', { n: 6 }) },
    add: { 1: ['seeds'], 2: ['seeds'] }, phaseNames: { Bloom: 'Budding', 'Spore Storm': 'Brambles', Rot: 'Blight', Deathcap: 'Thorn Throne' } }));
  addBoss({ id: 'hollowtree', name: 'The Hollow Tree', title: 'Heart of the Thornwood', color: '#7a9a3a', accent: '#d8ff9a', r: 108, hp: 1380, rScale: 1.0, hpScale: 1.02, arena: 'arena_round', shape: 'hollowtree', mega: true, contact: 6,
    teaches: 'Strip the boughs, cut the roots that lash the floor, then burn out the heartwood. Its seeds root where they fall — and it only gets thornier.', unlock: { boss: 'hollowtree' },
    parts: [
      { id: 'b0', kind: 'bough', r: 30, hp: 0.065, group: 0, ang: -2.6 }, { id: 'b1', kind: 'bough', r: 30, hp: 0.065, group: 0, ang: -1.95 }, { id: 'b2', kind: 'bough', r: 30, hp: 0.065, group: 0, ang: -1.2 }, { id: 'b3', kind: 'bough', r: 30, hp: 0.065, group: 0, ang: -0.55 },
      { id: 'rootL', kind: 'root', r: 44, hp: 0.12, group: 1, side: -1 }, { id: 'rootR', kind: 'root', r: 44, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 56, hp: 0.5, group: 2 },
    ],
    attacks: { leaffall: L('rain', { n: 10, r: 44, interval: 7, aimed: 0.45, warn: 52, shrapnel: 4, color: '#8ad04a' }), thornfan: L('fan', { n: 7, spread: 0.18, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, color: '#c8e090' }),
      lash: L('vines', { n: 4, spread: 0.5, w: 40, tele: 42, color: '#7ae06a' }), lash2: L('vines', { n: 5, spread: 0.4, w: 38, tele: 38, waves: 2, color: '#7ae06a' }), seeds: L('seedfall', { n: 9 }), seeds2: L('seedfall', { n: 12, speed: 2.8, min: 60, max: 125 }),
      brood: L('summon', { types: ['rootling', 'vinelasher', 'bramblehound'], n: 3, max: 6, hpMul: 0.8, radius: 190 }), blight: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }),
      crown: L('slamRing', { r: 130, tele: 44, rings: 2, speed: 3, gaps: 2, gapW: 0.75, color: '#8ad04a', ringSpacing: 34 }), helix: L('spiral', { arms: 4, frames: 90, speed: 2.0, color: '#9be86a' }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Canopy', attacks: ['leaffall', 'thornfan', 'seeds', 'brood'], idle: [36, 62] },
      { name: 'Roots', attacks: ['lash', 'seeds', 'brood', 'crown', 'thornfan'], idle: [30, 54], enter: [L('brood', null)] },
      { name: 'The Hollow', attacks: ['lash2', 'seeds2', 'crown', 'thornfan', 'brood'], idle: [26, 46], enter: [L('shrink', { ring: 1, tile: T.SPIKE }), L('pillars', { n: 3, max: 8 })] },
      { name: 'Heartwood', attacks: ['lash2', 'helix', 'leaffall', 'seeds2', 'crown'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.SPIKE })] },
      { name: 'THE LAST RING', attacks: ['blight', 'lash2', 'helix', 'seeds2', 'leaffall'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.SPIKE })] },
    ],
    phaseOf(e) {
      const boughs = e.parts.filter(p => p.kind === 'bough' && !p.dead).length, roots = e.parts.filter(p => p.kind === 'root' && !p.dead).length;
      if (boughs) return 0; if (roots) return 1; const core = e.parts.find(p => p.id === 'core'), f = core.hp / core.maxHp; return f > 0.6 ? 2 : f > 0.28 ? 3 : 4;
    } });
  land('thornwood', 'verdane', 'brier', 'hollowtree');
  part('bough', hung(1.15, 0.95, 5), (c, e, p, vul, fl, t) => {
    c.strokeStyle = '#4a3418'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(e.x + Math.cos(p.ang) * e.r * 0.5, e.y + Math.sin(p.ang) * e.r * 0.45); c.lineTo(p.x, p.y); c.stroke();
    c.fillStyle = fl ? '#fff' : (vul ? '#c8ff7a' : '#5a7a2a'); for (const [dx, dy, k] of [[-0.45, 0.1, 0.62], [0.45, 0.05, 0.62], [0, -0.35, 0.7]]) { c.beginPath(); c.arc(p.x + dx * p.r, p.y + dy * p.r, p.r * k, 0, TAU); c.fill(); }
    c.strokeStyle = '#1a2a08'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#3a2a10'; for (let k = 0; k < 4; k++) { const a = -0.5 - k * 0.7; c.beginPath(); c.moveTo(p.x + Math.cos(a) * p.r * 0.9, p.y + Math.sin(a) * p.r * 0.9); c.lineTo(p.x + Math.cos(a) * p.r * 1.35, p.y + Math.sin(a) * p.r * 1.35); c.lineTo(p.x + Math.cos(a + 0.25) * p.r * 0.9, p.y + Math.sin(a + 0.25) * p.r * 0.9); c.fill(); }
    if (vul) glow(c, p.x, p.y, p.r * 1.3, '#c8ff7a', 0.25); });
  part('root', flank(1.1, 0.78, 5), (c, e, p, vul, fl, t) => {
    c.strokeStyle = fl ? '#fff' : '#4a3418'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(e.x + p.side * e.r * 0.35, e.y + e.r * 0.85); c.quadraticCurveTo(e.x + p.side * e.r * 0.9, e.y + e.r * 1.05 + Math.sin(t * 0.05 + p.side) * 8, p.x, p.y); c.stroke();
    c.fillStyle = fl ? '#fff' : (vul ? '#c8a060' : '#6a4a22'); c.beginPath(); c.arc(p.x, p.y, p.r * 0.85, 0, TAU); c.fill(); c.strokeStyle = '#1a1208'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#2a1a08'; for (let k = 0; k < 5; k++) { const a = k * 1.25 + 0.3; c.beginPath(); c.moveTo(p.x + Math.cos(a) * p.r * 0.7, p.y + Math.sin(a) * p.r * 0.7); c.lineTo(p.x + Math.cos(a) * p.r * 1.15, p.y + Math.sin(a) * p.r * 1.15); c.lineTo(p.x + Math.cos(a + 0.3) * p.r * 0.7, p.y + Math.sin(a + 0.3) * p.r * 0.7); c.fill(); }
    if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffd080', 0.2); });
  BD.thornmother = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.5); c.beginPath(); c.moveTo(x - r * 1.0, y + r); c.lineTo(x - r * 0.45, y - r * 0.5); c.lineTo(x + r * 0.45, y - r * 0.5); c.lineTo(x + r * 1.0, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = darker(col, 0.25); for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(x + k * r * 0.28 - 5, y + r * 0.95); c.lineTo(x + k * r * 0.28, y + r * 1.25 + (k % 2) * 4); c.lineTo(x + k * r * 0.28 + 5, y + r * 0.95); c.fill(); }
    c.save(); c.strokeStyle = darker(col, 0.15); c.lineWidth = 6; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * r * 0.4, y - r * 0.2); c.quadraticCurveTo(x + s * r * 1.2, y - r * 0.2 + Math.sin(t * 0.05 + s) * 10, x + s * r * 1.3, y + r * 0.5); c.stroke(); } c.restore();
    c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.46, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#3a2a10'; for (let k = 0; k < 7; k++) { const a = -2.8 + k * 0.38; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.42, y - r * 0.55 + Math.sin(a) * r * 0.42); c.lineTo(x + Math.cos(a + 0.12) * r * 0.78, y - r * 0.55 + Math.sin(a + 0.12) * r * 0.78); c.lineTo(x + Math.cos(a + 0.24) * r * 0.42, y - r * 0.55 + Math.sin(a + 0.24) * r * 0.42); c.fill(); }
    slit(c, x, y - r * 0.5, r, '#ffe070'); };
  BD.hollowtree = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#4a3418'; c.beginPath(); c.moveTo(x - r * 0.55, y + r * 0.95); c.quadraticCurveTo(x - r * 0.36, y + r * 0.1, x - r * 0.42, y - r * 0.6); c.lineTo(x + r * 0.42, y - r * 0.6); c.quadraticCurveTo(x + r * 0.36, y + r * 0.1, x + r * 0.55, y + r * 0.95); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#1a1208'; c.beginPath(); c.ellipse(x, y + r * 0.05, r * 0.27, r * 0.38, 0, 0, TAU); c.fill();
    c.fillStyle = col; for (const [dx, dy, k] of [[-0.62, -0.82, 0.5], [0.62, -0.82, 0.5], [0, -1.08, 0.6], [-0.98, -0.42, 0.38], [0.98, -0.42, 0.38]]) { c.beginPath(); c.arc(x + dx * r + Math.sin(t * 0.02 + dx) * 3, y + dy * r, r * k, 0, TAU); c.fill(); }
    c.save(); c.strokeStyle = '#4a3418'; c.lineWidth = 9; c.lineCap = 'round'; for (const s of [-1, 1]) for (const k of [0, 1]) { c.beginPath(); c.moveTo(x + s * r * 0.4, y + r * 0.9); c.quadraticCurveTo(x + s * r * (0.8 + k * 0.4), y + r * 1.05, x + s * r * (1.1 + k * 0.45), y + r * (0.8 - k * 0.15)); c.stroke(); } c.restore(); };
  relic('motherbriar', { id: 'motherbriar', name: "Mother's Briar", rarity: 'legendary', color: '#8ad04a', mods: { thorns: 3, poison: 0.12, maxHp: 2 }, unique: true, unlock: 'boss:verdane', desc: 'Thorns for whoever touches you, +12% poison, half a heart more. (Unlockable)' });
  relic('heartseed', { id: 'heartseed', name: 'Heartwood Seed', rarity: 'legendary', color: '#7a9a3a', mods: { maxHp: 4, regen: 3, thorns: 2 }, unique: true, unlock: 'boss:hollowtree', desc: 'A heart container, slow regeneration and a little thorn. (Unlockable)' });

  // ==================================================================== THE MIRROR HALLS — everything twice
  const mirrorOf = (e) => ({ get x() { return C.ROOM_W - e.x; }, get y() { return e.y; } });          // the boss's reflection across the middle of the room (an anchor for beams)
  const mirrored = (o) => (e, g) => lib.beams(e, g, Object.assign({ len: 760, life: 110, color: '#e8f4ff', anchors: () => [e, mirrorOf(e)] }, o));
  addBoss({ id: 'specula', name: 'Specula', title: 'the First Reflection', color: '#d8e8ff', accent: '#ffffff', r: 46, hp: 480, rScale: 1.0, hpScale: 1.0, arena: 'arena_cross', shape: 'specula', contact: 5,
    teaches: 'Everything she throws comes twice: once from her and once from her reflection across the room. Look for the space between the two fans.', unlock: { boss: 'specula' },
    attacks: { mfan: L('mirrorFan', {}), mfan2: L('mirrorFan', { n: 7, reps: 4, speed: 3.3, spread: 0.2 }),
      mbeam: mirrored({ n: 2, w: 26, warn: 50, rot: 0.02, dmg: 0.9 }), mbeam2: mirrored({ n: 4, w: 22, warn: 56, rot: 0.016, dmg: 0.85 }),
      blink: L('blink', { where: 'behind', fan: 5, color: '#d8e8ff' }), decoys: L('summon', { types: ['reflection'], n: 2, max: 3, hpMul: 0.7 }),
      radial: L('radial', { n: 16, reps: 3, gap: 14, speed: 2.4, rot: 0.17, color: '#e8f4ff', bounce: 1 }), spiral: L('spiral', { arms: 3, frames: 84, speed: 2.0, color: '#d8e8ff' }), shatter: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }) },
    phases: [
      { at: 1.0, name: 'First Glance', attacks: ['mfan', 'blink', 'radial'], idle: [36, 62] },
      { at: 0.62, name: 'Reflection', attacks: ['mfan', 'mbeam', 'decoys', 'blink', 'spiral'], idle: [28, 50] },
      { at: 0.32, name: 'Shatter', attacks: ['mfan2', 'mbeam', 'decoys', 'spiral', 'blink'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Infinite Regress', attacks: ['mfan2', 'mbeam2', 'blink', 'shatter'], idle: [16, 32] },
    ] });
  addBoss(variant('vael', { id: 'argent', name: 'Argent', title: 'the Counterfeit Knight', color: '#d8e8ff', accent: '#ffffff', tint: '#e8f4ff', arena: 'arena_cross',
    teaches: 'A knight made of silvered glass: his blades come from two places at once, and his doubles walk where you would. Fight in the middle.',
    swap: { blades: L('mirrorFan', { n: 5, spread: 0.24, reps: 2, gap: 18, speed: 2.9 }), phantoms: L('summon', { types: ['reflection', 'glassknight'], n: 2, max: 4, hpMul: 0.8 }) },
    phaseNames: { 'The Duelist': 'The Counterfeit', Fury: 'Reversal', 'Phantom Knight': 'Doubles', 'Hollow Fury': 'Hall of Mirrors' } }));
  addBoss({ id: 'lookingglass', name: 'The Great Looking-Glass', title: 'Every Room, Twice', color: '#c8d8f0', accent: '#ffffff', r: 106, hp: 1380, rScale: 1.0, hpScale: 1.02, arena: 'arena_grid', shape: 'lookingglass', mega: true, contact: 6,
    teaches: 'Break the panes that carry its beams, then the frame, then the silvering behind it all. Everything it fires is doubled — look for the seam between.', unlock: { boss: 'lookingglass' },
    parts: [
      { id: 'n0', kind: 'pane', r: 30, hp: 0.065, group: 0, ang: 0.4 }, { id: 'n1', kind: 'pane', r: 30, hp: 0.065, group: 0, ang: 1.97 }, { id: 'n2', kind: 'pane', r: 30, hp: 0.065, group: 0, ang: 3.54 }, { id: 'n3', kind: 'pane', r: 30, hp: 0.065, group: 0, ang: 5.11 },
      { id: 'frameL', kind: 'frame', r: 44, hp: 0.12, group: 1, side: -1 }, { id: 'frameR', kind: 'frame', r: 44, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 56, hp: 0.5, group: 2 },
    ],
    attacks: { paneBeams: L('beams', { n: 4, len: 740, w: 22, warn: 54, life: 110, rot: 0.018, dmg: 0.85, color: '#e8f4ff', anchorParts: 'pane' }), mfan: L('mirrorFan', {}), mfan2: L('mirrorFan', { n: 7, reps: 4, speed: 3.3, spread: 0.2 }),
      mbeam: mirrored({ n: 2, w: 26, warn: 50, rot: 0.02, dmg: 0.9 }), mbeam2: mirrored({ n: 4, w: 22, warn: 56, rot: 0.016, dmg: 0.85 }), shardrain: L('rain', { n: 10, r: 40, interval: 7, warn: 48, aimed: 0.5, shrapnel: 5, color: '#d8e8ff' }),
      reflections: L('summon', { types: ['reflection', 'glassknight'], n: 2, max: 4, hpMul: 0.7, radius: 200 }), shatter: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), spiral: L('spiral', { arms: 4, frames: 96, speed: 2.1, color: '#d8e8ff' }),
      bars: L('bars', { n: 3, thick: 50, gapW: 150, warn: 66, color: '#e8f4ff' }) },
    phases: [
      { name: 'Panes', attacks: ['paneBeams', 'mfan', 'shardrain', 'reflections'], idle: [36, 62] },
      { name: 'The Frame', attacks: ['mfan', 'mbeam', 'reflections', 'shardrain', 'bars'], idle: [30, 54], enter: [L('reflections', null)] },
      { name: 'The Silvering', attacks: ['mfan2', 'mbeam', 'spiral', 'reflections', 'bars'], idle: [26, 46], enter: [L('shrink', { ring: 1, tile: T.PIT })] },
      { name: 'Seven Years', attacks: ['mfan2', 'mbeam2', 'spiral', 'shardrain', 'reflections'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'SHATTER', attacks: ['shatter', 'mfan2', 'mbeam2', 'spiral', 'bars'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf(e) {
      const panes = e.parts.filter(p => p.kind === 'pane' && !p.dead).length, frames = e.parts.filter(p => p.kind === 'frame' && !p.dead).length;
      if (panes) return 0; if (frames) return 1; const core = e.parts.find(p => p.id === 'core'), f = core.hp / core.maxHp; return f > 0.6 ? 2 : f > 0.28 ? 3 : 4;
    } });
  land('mirrorhall', 'specula', 'argent', 'lookingglass');
  part('pane', orbit(0.008, 1.38, 0.8), (c, e, p, vul, fl, t) => {
    c.save(); c.translate(p.x, p.y); c.rotate(Math.sin(t * 0.02 + p.ang) * 0.12); c.fillStyle = fl ? '#fff' : (vul ? 'rgba(232,244,255,0.95)' : 'rgba(150,170,205,0.9)'); c.beginPath(); c.moveTo(-p.r * 0.7, -p.r * 1.1); c.lineTo(p.r * 0.75, -p.r * 0.9); c.lineTo(p.r * 0.6, p.r * 1.1); c.lineTo(-p.r * 0.8, p.r * 0.95); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.65)'; c.beginPath(); c.moveTo(-p.r * 0.45, -p.r * 0.8); c.lineTo(-p.r * 0.1, -p.r * 0.75); c.lineTo(-p.r * 0.5, p.r * 0.5); c.lineTo(-p.r * 0.62, p.r * 0.5); c.fill(); c.restore();
    if (vul) glow(c, p.x, p.y, p.r * 1.4, '#e8f4ff', 0.3); });
  part('frame', flank(1.18, 0.0, 6), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#e8d080' : '#7a6a3a'); c.fillRect(p.x - p.r * 0.35, p.y - p.r * 1.5, p.r * 0.7, p.r * 3); c.strokeRect(p.x - p.r * 0.35, p.y - p.r * 1.5, p.r * 0.7, p.r * 3);
    c.fillStyle = '#fff0b0'; for (const k of [-1.3, 0, 1.3]) { c.beginPath(); c.arc(p.x, p.y + k * p.r, p.r * 0.28, 0, TAU); c.fill(); c.stroke(); } if (vul) glow(c, p.x, p.y, p.r * 1.5, '#ffe9a0', 0.2); });
  BD.specula = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#8a7a4a'; c.beginPath(); c.ellipse(x, y, r * 0.8, r * 1.06, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r * 0.66, r * 0.92, 0, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.ellipse(x, y, r * 0.66, r * 0.92, 0, 0, TAU); c.clip(); c.fillStyle = 'rgba(255,255,255,0.6)'; const gx = x - r * 0.9 + ((t * 0.8) % (r * 2.2)); c.beginPath(); c.moveTo(gx, y - r); c.lineTo(gx + r * 0.25, y - r); c.lineTo(gx - r * 0.2, y + r); c.lineTo(gx - r * 0.45, y + r); c.fill(); c.restore();
    c.fillStyle = '#3a4a6a'; c.fillRect(x - r * 0.34, y - r * 0.22, r * 0.22, r * 0.1); c.fillRect(x + r * 0.12, y - r * 0.22, r * 0.22, r * 0.1); c.fillRect(x - r * 0.18, y + r * 0.2, r * 0.36, r * 0.05); };
  BD.lookingglass = (c, e, x, y, r, col, dk, t) => {
    const arch = (s) => { c.beginPath(); c.moveTo(x - r * 0.88 * s, y + r * 1.0); c.lineTo(x - r * 0.88 * s, y - r * 0.4); c.quadraticCurveTo(x - r * 0.88 * s, y - r * 1.18 * s, x, y - r * 1.22 * s); c.quadraticCurveTo(x + r * 0.88 * s, y - r * 1.18 * s, x + r * 0.88 * s, y - r * 0.4); c.lineTo(x + r * 0.88 * s, y + r * 1.0); c.closePath(); };
    c.fillStyle = '#7a6a3a'; arch(1); c.fill(); c.stroke(); c.fillStyle = col; arch(0.84); c.fill();
    c.save(); arch(0.84); c.clip(); c.fillStyle = 'rgba(255,255,255,0.5)'; const gx = x - r * 1.1 + ((t * 0.9) % (r * 2.6)); c.beginPath(); c.moveTo(gx, y - r * 1.3); c.lineTo(gx + r * 0.3, y - r * 1.3); c.lineTo(gx - r * 0.25, y + r); c.lineTo(gx - r * 0.55, y + r); c.fill();
    const cr = Math.max(0, e.phaseIdx || 0); c.strokeStyle = 'rgba(30,40,70,0.7)'; c.lineWidth = 2; for (let k = 0; k < cr * 2; k++) { const s = k % 2 ? 1 : -1; c.beginPath(); c.moveTo(x + s * r * 0.05, y - r * 0.5 + k * r * 0.18); c.lineTo(x + s * r * (0.3 + k * 0.05), y - r * 0.25 + k * r * 0.2); c.lineTo(x + s * r * (0.15 + k * 0.08), y + k * r * 0.2); c.stroke(); } c.restore();
    c.fillStyle = '#fff0b0'; for (const k of [-0.7, -0.35, 0, 0.35, 0.7]) { c.beginPath(); c.arc(x + k * r, y - r * 1.12 + Math.abs(k) * r * 0.4, r * 0.05, 0, TAU); c.fill(); } };
  relic('silverglass', { id: 'silverglass', name: 'Silvered Glass', rarity: 'legendary', color: '#d8e8ff', mods: { crit: 0.08, luck: 1, dmgTaken: -0.06 }, unique: true, unlock: 'boss:specula', desc: '+8% crit, +1 luck, and 6% less damage taken. (Unlockable)' });
  relic('trueglass', { id: 'trueglass', name: 'The Looking-Glass Shard', rarity: 'legendary', color: '#c8d8f0', mods: { proj: 1, crit: 0.08, luck: 1 }, unique: true, unlock: 'boss:lookingglass', desc: 'One more projectile, +8% crit, +1 luck: everything you fire is doubled. (Unlockable)' });

  // ==================================================================== THE SKY BRIDGE — the wind has opinions
  addBoss({ id: 'zephra', name: 'Zephra', title: 'the Windcaller', color: '#bfe0ff', accent: '#ffffff', r: 44, hp: 470, rScale: 1.0, hpScale: 1.0, arena: 'arena_pits', shape: 'windcaller', contact: 5,
    teaches: 'She calls the wind: a gale from one side shoves you and every bolt she has fired — read the arrows and lean against it. The bridge gives way as the storm grows.', unlock: { boss: 'zephra' },
    attacks: { gale: L('crosswind', { warn: 60, dur: 90 }), gale2: L('crosswind', { warn: 50, dur: 110, push: 1.4 }), feathers: L('fan', { n: 7, spread: 0.17, reps: 3, gap: 14, speed: 3.2, dmg: 0.85, color: '#e8f4ff' }),
      dive: L('charge', { tele: 30, speed: 11, dmg: 1.5, stun: 30, color: '#bfe0ff' }), cyclone: L('spiral', { arms: 3, frames: 90, speed: 2.1, rot: 0.08, color: '#bfe0ff' }), hail: L('rain', { n: 9, r: 40, interval: 6, warn: 42, aimed: 0.6, color: '#bfe0ff' }),
      brood: L('summon', { types: ['harpy'], n: 2, max: 4, hpMul: 0.7 }), swoop: L('chain', { seq: [['blink', { where: 'behind', fan: 5, color: '#e8f4ff' }], ['coneSlash', { tele: 24, r: 110, color: '#bfe0ff' }]] }) },
    phases: [
      { at: 1.0, name: 'Breeze', attacks: ['feathers', 'dive', 'gale'], idle: [34, 60] },
      { at: 0.64, name: 'Gale', attacks: ['feathers', 'dive', 'cyclone', 'gale', 'brood'], idle: [26, 48], enter: [L('shrink', { ring: 1, tile: T.PIT })] },
      { at: 0.32, name: 'Tempest', attacks: ['cyclone', 'hail', 'swoop', 'dive', 'gale2'], idle: [20, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { at: 0.12, minTier: 2, name: 'Eye of the Storm', attacks: ['hail', 'cyclone', 'swoop', 'gale2', 'feathers'], idle: [16, 32] },
    ] });
  addBoss(variant('mycelia', { id: 'cirrus', name: 'Cirrus', title: 'the Cloud Regent', color: '#c8e0ff', accent: '#ffffff', tint: '#bfe0ff', arena: 'arena_round',
    teaches: 'A court of weather: harpies answer him, storm clouds hang over the floor, and a crosswind shoves everything in the room. Kill the adds, lean into the wind.',
    swap: { shrooms: L('summon', { types: ['harpy'], n: 2, max: 5, hpMul: 0.8 }), gale: L('crosswind', { warn: 60, dur: 80 }) }, add: { 1: ['gale'], 2: ['gale'] }, phaseNames: { Bloom: 'Overcast', 'Spore Storm': 'Downpour', Rot: 'Thunderhead', Deathcap: 'Anvil' } }));
  addBoss({ id: 'tempus', name: 'Tempus', title: 'the Cyclone', color: '#a8c8f0', accent: '#ffffff', r: 100, hp: 1360, rScale: 1.0, hpScale: 1.02, arena: 'arena_round', shape: 'cyclone', mega: true, contact: 6,
    teaches: 'Cut the vanes that whip the wind into beams, tear off the wings that hold it together, then strike the still eye at its heart. The bridge gives way as it spins.', unlock: { boss: 'tempus' },
    parts: [
      { id: 'v0', kind: 'vane', r: 26, hp: 0.065, group: 0, ang: 0 }, { id: 'v1', kind: 'vane', r: 26, hp: 0.065, group: 0, ang: 1.57 }, { id: 'v2', kind: 'vane', r: 26, hp: 0.065, group: 0, ang: 3.14 }, { id: 'v3', kind: 'vane', r: 26, hp: 0.065, group: 0, ang: 4.71 },
      { id: 'wingL', kind: 'wing', r: 46, hp: 0.12, group: 1, side: -1 }, { id: 'wingR', kind: 'wing', r: 46, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 54, hp: 0.5, group: 2 },
    ],
    attacks: { vaneBeams: L('beams', { n: 3, len: 720, w: 24, warn: 52, life: 120, rot: 0.024, dmg: 0.85, color: '#e8f4ff', anchorParts: 'vane' }), gale: L('crosswind', {}), gale2: L('crosswind', { warn: 50, dur: 110, push: 1.4 }),
      feathers: L('fan', { n: 9, spread: 0.15, reps: 3, gap: 14, speed: 3.2, dmg: 0.85, color: '#e8f4ff' }), cyclone: L('spiral', { arms: 5, frames: 100, speed: 2.1, rot: 0.09, color: '#bfe0ff' }), hail: L('rain', { n: 11, r: 42, interval: 6, warn: 44, aimed: 0.6, color: '#bfe0ff' }),
      swoop: L('chain', { seq: [['blink', { where: 'behind', fan: 7, color: '#e8f4ff' }], ['slamRing', { r: 90, tele: 30, rings: 1, speed: 3.2, color: '#bfe0ff' }]] }), brood: L('summon', { types: ['harpy', 'gustweaver'], n: 2, max: 4, hpMul: 0.7, radius: 190 }),
      blast: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), spin: L('hazardRings', { n: 4, spacing: 32, speed: 2.7, color: '#bfe0ff' }) },
    phases: [
      { name: 'Vanes', attacks: ['vaneBeams', 'feathers', 'gale', 'hail'], idle: [34, 60] },
      { name: 'Wings', attacks: ['feathers', 'cyclone', 'gale', 'swoop', 'brood'], idle: [28, 50], enter: [L('shrink', { ring: 1, tile: T.PIT })] },
      { name: 'The Eye', attacks: ['cyclone', 'gale2', 'spin', 'hail', 'swoop'], idle: [24, 44], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'Spinning Down', attacks: ['cyclone', 'gale2', 'hail', 'spin', 'swoop', 'brood'], idle: [20, 38], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
      { name: 'STILLNESS', attacks: ['blast', 'cyclone', 'gale2', 'spin', 'hail'], idle: [14, 28] },
    ],
    phaseOf(e) {
      const vanes = e.parts.filter(p => p.kind === 'vane' && !p.dead).length, wings = e.parts.filter(p => p.kind === 'wing' && !p.dead).length;
      if (vanes) return 0; if (wings) return 1; const core = e.parts.find(p => p.id === 'core'), f = core.hp / core.maxHp; return f > 0.6 ? 2 : f > 0.28 ? 3 : 4;
    } });
  land('skybridge', 'zephra', 'cirrus', 'tempus');
  part('vane', orbit(0.03, 1.38, 0.9), (c, e, p, vul, fl, t) => {
    c.save(); c.translate(p.x, p.y); c.rotate(t * 0.12 + p.ang); c.fillStyle = fl ? '#fff' : (vul ? '#f4faff' : '#7a90b0'); for (let k = 0; k < 3; k++) { c.rotate(TAU / 3); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(p.r * 0.9, -p.r * 0.2, p.r * 1.05, -p.r * 0.75); c.quadraticCurveTo(p.r * 0.3, -p.r * 0.6, 0, 0); c.fill(); c.stroke(); } c.restore();
    c.fillStyle = '#2a3448'; c.beginPath(); c.arc(p.x, p.y, p.r * 0.22, 0, TAU); c.fill(); if (vul) glow(c, p.x, p.y, p.r * 1.4, '#e8f4ff', 0.3); });
  BD.windcaller = (c, e, x, y, r, col, dk, t) => {
    const flap = Math.sin(t * 0.12) * 0.35;
    c.fillStyle = darker(col, 0.35); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * r * 0.4, y - r * 0.1); c.quadraticCurveTo(x + s * r * 1.5, y - r * (1.1 + flap), x + s * r * 1.9, y + r * (0.2 - flap * 0.4)); c.quadraticCurveTo(x + s * r * 1.2, y + r * 0.35, x + s * r * 0.5, y + r * 0.5); c.closePath(); c.fill(); c.stroke(); }
    c.fillStyle = '#ffffff'; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + s * r * (0.9 + k * 0.28), y - r * (0.35 + flap * 0.3) + k * r * 0.1); c.lineTo(x + s * r * (1.15 + k * 0.28), y - r * 0.1 + k * r * 0.18); c.lineTo(x + s * r * (0.8 + k * 0.28), y - r * 0.05 + k * r * 0.14); c.fill(); }
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y + r * 0.15, r * 0.6, r * 0.85, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#f4faff'; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.38, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#e8c060'; c.beginPath(); c.moveTo(x - r * 0.12, y - r * 0.5); c.lineTo(x + r * 0.12, y - r * 0.5); c.lineTo(x, y - r * 0.28); c.fill(); slit(c, x, y - r * 0.62, r * 0.8, '#8ad0ff'); };
  BD.cyclone = (c, e, x, y, r, col, dk, t) => {
    c.save(); c.translate(x, y); for (let k = 0; k < 4; k++) { c.rotate(t * 0.01 * (k % 2 ? -1 : 1) + k); c.strokeStyle = darker(col, 0.2 + k * 0.08); c.lineWidth = r * (0.22 - k * 0.03); c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, r * (0.95 - k * 0.17), 0.3, 3.3); c.stroke(); } c.restore();
    c.fillStyle = darker(col, 0.55); c.beginPath(); c.arc(x, y, r * 0.38, 0, TAU); c.fill(); c.stroke(); glow(c, x, y, r * 0.5, '#e8f4ff', 0.2 + 0.05 * Math.sin(t * 0.1)); };
  relic('windwhistle', { id: 'windwhistle', name: "Windcaller's Whistle", rarity: 'legendary', color: '#bfe0ff', mods: { proj: 1, atkSpd: 0.08, kb: 0.15 }, unique: true, unlock: 'boss:zephra', desc: 'One more projectile, +8% attack speed, and your blows push harder. (Unlockable)' });
  relic('cycloneye', { id: 'cycloneye', name: 'Eye of the Cyclone', rarity: 'legendary', color: '#a8c8f0', mods: { dmgTaken: -0.1, speed: 0.06, luck: 1 }, unique: true, unlock: 'boss:tempus', desc: '10% less damage taken, a little faster, +1 luck: the calm at the heart of the storm. (Unlockable)' });

  // the wind a boss calls (v18's crosswind, here and in the Sky Bridge's own fights) is drawn as streaks of chevrons: pale while it gathers, bright while it blows
  ED.hook('draw', V, (g, c, t) => {
    const e = g.enemies.find(x => x.gust && !x.dead); if (!e) return;
    const d = e.gust, warn = d.st === 'warn';
    c.save(); c.globalAlpha = warn ? 0.2 + 0.1 * Math.sin(t * 0.3) : 0.4; c.strokeStyle = '#e8f4ff'; c.lineWidth = 3; c.lineCap = 'round';
    for (let k = 0; k < 16; k++) {
      const u = ((t * (warn ? 0.5 : 3.2) + k * 57) % 900) / 900, v = ((k * 97) % 100) / 100;
      const x = d.dx ? (d.dx > 0 ? 50 + u * 860 : 910 - u * 860) : 70 + v * 820, y = d.dy ? (d.dy > 0 ? 50 + u * 480 : 530 - u * 480) : 70 + v * 440;
      c.beginPath(); c.moveTo(x - d.dx * 16 - d.dy * 8, y - d.dy * 16 + d.dx * 8); c.lineTo(x, y); c.lineTo(x - d.dx * 16 + d.dy * 8, y - d.dy * 16 - d.dx * 8); c.stroke();
    }
    c.restore();
  });

  // ==================================================================== THE SIX OLDER LANDS — re-dressed guardians
  //  (the land's colours and name, its own foes, one swapped attack; the bodies and phases are those of the older bosses they come from)
  const OLD = {
    crypts: [
      ['vael', { id: 'corvane', name: 'Marshal Corvane', title: 'the Barrow Marshal', color: '#9a8cff', accent: '#ece8ff', tint: '#c8c0ff', teaches: 'The dead answer his call: tomb rats and grave moths rise as he is wounded. Clear the adds, then punish the Marshal.',
        swap: { phantoms: L('summon', { types: ['tombrat', 'gravemoth'], n: 3, max: 6, hpMul: 0.8 }) }, phaseNames: { 'The Duelist': 'The Barrow Guard', Fury: 'Grave Fury', 'Phantom Knight': 'Muster', 'Hollow Fury': 'Last Muster' } }],
      ['aegis', { id: 'nacre', name: 'Nacre', title: 'the Pale Sentinel', color: '#c8c0e8', accent: '#ffffff', tint: '#d8d0f0', teaches: 'A sentinel of grave-pearl: break the shards to expose the core — and mind the slow spirits that drift after you.',
        swap: { orbs: L('homing', { n: 4, speed: 1.3, turn: 0.02, life: 420, color: '#c8c0e8' }) }, phaseNames: { 'Prismatic Guard': 'Pearl Guard', Refraction: 'Wake', 'Total Spectrum': 'Full Haunting', 'Shattered Light': 'Last Light' } }],
      ['colossus', { id: 'ozymar', name: 'Ozymar', title: 'the Entombed King', color: '#9a8cff', accent: '#ece8ff', tint: '#c8c0ff', teaches: 'A king of stone who raised his own court: tomb rats and moths pour out of the walls. Break the plates, topple the arms, crack the core.',
        swap: { golems: L('summon', { types: ['tombrat', 'gravemoth'], n: 4, max: 8, hpMul: 0.8, radius: 200 }) }, phaseNames: { Stoneskin: 'Sealed', 'Shattered Guard': 'The Lid Slides', 'Exposed Core': 'Unwrapped', 'Molten Heart': 'Curse Rising', CATACLYSM: 'THE KING WAKES' } }],
    ],
    mirewood: [
      ['mycelia', { id: 'murkmaw', name: 'Murkmaw', title: 'the Fen Mother', color: '#7a9a3a', accent: '#e8ffb0', tint: '#a0d84a', teaches: 'The bog answers her: lurkers and spore-caps grow out of the mud. Keep out of the clouds, kill the adds.',
        swap: { shrooms: L('summon', { types: ['boglurker', 'sporecap'], n: 3, max: 6, hpMul: 0.9 }) }, phaseNames: { Bloom: 'Mire', 'Spore Storm': 'Murk', Rot: 'Bog Rot', Deathcap: 'Fen Throne' } }],
      ['vael', { id: 'reedwraith', name: 'Reedwraith', title: 'the Hollow Hunter', color: '#8aa84a', accent: '#e8ffb0', tint: '#b6e85a', teaches: 'His arrows drift in waves like reeds in a current: time your dodge between the sways.',
        swap: { blades: L('fan', { n: 5, spread: 0.24, reps: 2, gap: 18, speed: 2.9, dmg: 0.9, wave: 0.8, color: '#b6e85a' }) }, phaseNames: { 'The Duelist': 'The Stalk', Fury: 'Bog Fury', 'Phantom Knight': 'Reed Wraiths', 'Hollow Fury': 'Last Stalk' } }],
      ['hydra', { id: 'sloughmaw', name: 'Sloughmaw', title: 'the Mire Hydra', color: '#7a9a3a', accent: '#e8ffb0', tint: '#a0d84a', teaches: 'Three heads rise from the slough, and the mire breeds its own: sever them in order while the bog lurkers multiply.',
        swap: { spawn: L('summon', { types: ['boglurker', 'sporecap', 'swarm'], n: 4, max: 8, hpMul: 0.8 }) }, phaseNames: { 'Three Heads': 'Three Maws', 'Two Heads': 'Two Maws', 'Last Head': 'Last Maw', 'Tidal Fury': 'Bog Fury', MAELSTROM: 'THE SLOUGH' } }],
    ],
    glacial: [
      ['pyrax', { id: 'cryolith', name: 'Cryolith', title: 'the Cold Forge', color: '#9fe4ff', accent: '#ffffff', tint: '#bff0ff', teaches: 'A forge that burns cold: its breath is rime and its hail cracks the floor into pits. Keep to the middle as the ice gives way.',
        swap: { meteors: L('rain', { n: 9, r: 56, interval: 8, shrapnel: 5, aimed: 0.5, warn: 56, color: '#bff0ff' }) }, enter: { 1: [L('shrink', { ring: 1, tile: T.PIT })], 2: [L('shrink', { ring: 2, tile: T.PIT })], 3: [L('shrink', { ring: 3, tile: T.PIT })] },
        phaseNames: { Smoulder: 'Rime', 'Molten Edge': 'Cracking Ice', Inferno: 'Whiteout', Supernova: 'Absolute Zero' } }],
      ['vael', { id: 'frostmarch', name: 'Frostmarch', title: 'the Winter Marshal', color: '#9fe4ff', accent: '#ffffff', tint: '#bff0ff', teaches: 'A marshal of the Spire: slower, colder blades, and a blink out of the whiteout. Dash through the wide swings.',
        swap: { blades: L('fan', { n: 5, spread: 0.24, reps: 2, gap: 20, speed: 2.6, dmg: 0.9, color: '#bff0ff' }) }, phaseNames: { 'The Duelist': 'Frostguard', Fury: 'Whiteout', 'Phantom Knight': 'Rime Wraiths', 'Hollow Fury': 'Deep Winter' } }],
      ['seraph', { id: 'aurora', name: 'Aurora', title: 'the Frozen Seraph', color: '#bff0ff', accent: '#ffffff', tint: '#d8f8ff', teaches: 'A clock of ice: gears time its beams. Break the gears, then the wings, then the frozen heart — the floor cracks into pits as it thaws.',
        enter: { 3: [L('shrink', { ring: 3, tile: T.PIT })] }, phaseNames: { Escapement: 'Frost Escapement', Wingspan: 'Ice Wings', 'Heart of the Clock': 'Frozen Heart', MIDNIGHT: 'POLAR NIGHT' } }],
    ],
    foundry: [
      ['aegis', { id: 'anvil', name: 'Anvil', title: 'the Iron Sentinel', color: '#ff9a4a', accent: '#ffe0a0', tint: '#ffb04a', teaches: 'A sentinel of the forge: shards of hot iron guard its core, and slag falls where the orbs were. Break the shards, then the core.',
        swap: { orbs: L('rain', { n: 9, r: 50, interval: 8, shrapnel: 4, aimed: 0.5, warn: 54, color: '#ff9a3c' }) }, phaseNames: { 'Prismatic Guard': 'Heat Guard', Refraction: 'Forging', 'Total Spectrum': 'White Heat', 'Shattered Light': 'Quench' } }],
      ['vael', { id: 'cinder', name: 'Ser Cinder', title: 'the Ashen Knight', color: '#e86a2a', accent: '#ffe0a0', tint: '#ffb04a', teaches: 'A knight half burnt away: embers fan off his blade in a wide spray. Dash through the swings, not away from them.',
        swap: { blades: L('fan', { n: 6, spread: 0.2, reps: 2, gap: 18, speed: 3.0, dmg: 0.9, color: '#ffb04a' }) }, phaseNames: { 'The Duelist': 'The Ashen Duelist', Fury: 'Cinder Fury', 'Phantom Knight': 'Ash Wraiths', 'Hollow Fury': 'Last Ember' } }],
      ['colossus', { id: 'kilnroar', name: 'Kilnroar', title: 'the Molten Colossus', color: '#d05a2a', accent: '#ffe0a0', tint: '#ff9a4a', teaches: 'A kiln that learned to walk: slag falls in sheets and the floor melts away in rings. Break the plates, topple the arms, crack the core.',
        swap: { rockfall: L('rain', { n: 10, r: 46, interval: 7, aimed: 0.4, color: '#ff7a2a', warn: 52, shrapnel: 4 }) }, phaseNames: { Stoneskin: 'Cold Kiln', 'Shattered Guard': 'Slag Fall', 'Exposed Core': 'The Fire Lit', 'Molten Heart': 'Meltdown', CATACLYSM: 'THE KILN BURSTS' } }],
    ],
    void: [
      ['aegis', { id: 'umbral', name: 'Umbral', title: 'the Dim Prism', color: '#a060d8', accent: '#e8d0ff', tint: '#c070ff', teaches: 'A prism that drinks the light: dark orbs chase through the gloom. Break the shards, then the core, and keep out of the wells.',
        swap: { orbs: L('homing', { n: 5, speed: 1.6, color: '#c070ff' }) }, phaseNames: { 'Prismatic Guard': 'Dim Guard', Refraction: 'Dark Spectrum', 'Total Spectrum': 'Total Eclipse', 'Shattered Light': 'Last Light' } }],
      ['vael', { id: 'nox', name: 'Nox', title: 'the Gloam Duelist', color: '#7a4ac0', accent: '#e8d0ff', tint: '#c070ff', teaches: 'A duelist of the dark: he steps out of nowhere, anywhere in the room. Watch the ring on the floor — that is where he lands.',
        swap: { step: L('chain', { seq: [['blink', { where: 'random', fan: 5, color: '#c070ff' }], ['coneSlash', { tele: 22, r: 118, color: '#c070ff' }]] }) }, phaseNames: { 'The Duelist': 'The Gloam Duelist', Fury: 'Dusk', 'Phantom Knight': 'Umbra', 'Hollow Fury': 'Midnight' } }],
      ['seraph', { id: 'umbra', name: 'Umbra', title: 'the Black Seraph', color: '#6a4aa8', accent: '#e8d0ff', tint: '#c070ff', teaches: 'A clock that tells no time: beams from gears and wings in the dark. Break the gears, then the wings, then the heart of the Void.',
        phaseNames: { Escapement: 'Black Escapement', Wingspan: 'Dark Wings', 'Heart of the Clock': 'Void Heart', MIDNIGHT: 'NO HOUR' } }],
    ],
    storm: [
      ['vael', { id: 'volt', name: 'Volt', title: 'the Stormbound Knight', color: '#ffe14a', accent: '#ffffff', tint: '#fff08a', teaches: 'A knight in a cage of lightning: his bolts are quick, narrow and aimed ahead of you. Keep moving, never in a straight line.',
        swap: { blades: L('fan', { n: 3, spread: 0.12, reps: 4, gap: 10, speed: 4.0, dmg: 0.9, color: '#fff08a' }) }, phaseNames: { 'The Duelist': 'Static', Fury: 'Live Wire', 'Phantom Knight': 'Afterimage', 'Hollow Fury': 'Superconductor' } }],
      ['aegis', { id: 'thunderhead', name: 'Thunderhead', title: 'the Storm Prism', color: '#d8d890', accent: '#ffffff', tint: '#ffe14a', teaches: 'A prism of storm-glass: its shots fly fast. Break the shards to expose the core, then punish it before they reform.',
        swap: { refract: L('fan', { n: 3, spread: 0.2, reps: 3, gap: 12, speed: 3.8, dmg: 0.9, color: '#ffe14a' }) }, phaseNames: { 'Prismatic Guard': 'Gathering', Refraction: 'Forked', 'Total Spectrum': 'Full Storm', 'Shattered Light': 'Last Strike' } }],
      ['hydra', { id: 'stormcrown', name: 'Stormcrown', title: 'the Thunder Hydra', color: '#d8c040', accent: '#ffffff', tint: '#ffe14a', teaches: 'Three heads crowned in lightning: sever them in order — and the storm brings its own flock when it flaps.',
        swap: { spawn: L('summon', { types: ['stormling', 'thunderroc'], n: 3, max: 7, hpMul: 0.8 }) }, phaseNames: { 'Three Heads': 'Three Crowns', 'Two Heads': 'Two Crowns', 'Last Head': 'Last Crown', 'Tidal Fury': 'Thunder Fury', MAELSTROM: 'THE TEMPEST' } }],
    ],
  };
  for (const id in OLD) { const [a, b, m] = OLD[id]; for (const [base, o] of OLD[id]) addBoss(variant(base, o)); land(id, a[1].id, b[1].id, m[1].id); }

  /** every boss this update adds, floor bosses first (the tests and the Guide walk this list) */
  ED.v20.ids = () => { const out = []; for (const t of [ED.bosses.DEFS, ED.bosses.MEGAS]) for (const id in t) if (t[id].pack === V) out.push(id); return out; };
})(typeof globalThis !== 'undefined' ? globalThis : this);

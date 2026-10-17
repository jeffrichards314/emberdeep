/* EMBERDEEP — pack_v27.js : v27 "SOVEREIGNS II" — a boss line for each of the twelve lands of v24-v26 (pack_v27b.js and pack_v27c.js carry the later lands).
 *
 *  Like v20 and v21: in a land reached by a road, the second floor keeps its guardian to that land (a NEW boss built on the land's rule), the fourth a re-dressed older one, and the MEGA floor that ends the land is that land's own MEGA.
 *  The stairs keep the old rotation; these bosses never join it (landOnly).  Each original (the second-floor boss and the MEGA) drops a signature relic the first time it falls.
 *    FOOTLIGHTS     Lumen, the Stage Director (a follow-spot: he is shrouded outside it) · Ser Harlan, the Understudy Knight · THE GRAND CURTAIN (curtains, chandeliers, the prompter's box)
 *    ROARING PIT    Brakka, the Champion (the crowd throws bottles where you stand) · Ravager, the Pit Beast · KORAX, THE ROARING GATE (chains, two beast heads, the heart)
 *    STARFALL REACH Perse, the Falling Star (meteors leave craters) · Polaris, the Frozen Star · THE BLACK COMET (four moons, two tails, the head)
 *    GALLEON        Captain Tarn, the Foundered Captain (the deck lists) · Mate Dray, the Boarding Knight · THE FIGUREHEAD (sails, cannons, the carved heart)
 *  Everything is switchable: with v27 off every land keeps whatever it had (v20's line, or the plain rotation).  A boss needs its land (v24-v26) and a road (v17) to be met at all.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds;
  const X = ED.attacks, lib = X.lib, N = X.N, ang = X.ang, clampArena = X.clampArena, sc = X.sc;
  const TAU = U.TAU, V = 'v27', L = (name, o) => [name, o];
  const darker = (c, k) => ED.render.darker(c, k), lighter = (c, k) => ED.render.lighter(c, k);
  const glow = (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); };
  const rateOf = e => Math.max(0.5, e.rate || 1);
  const V20 = ED.v20, BD = ED.bossDraw, K = ED.landkit;

  P.define({
    id: 'v27', name: 'SOVEREIGNS II', tag: 'a boss line for the new lands', color: '#ff9a8a',
    blurb: 'Every land of v24-v26 gets its own guardians: a new boss on its second floor built on the land\'s rule, a re-dressed older one on its fourth, and its own MEGA to end it: twelve lands, thirty-six bosses, twenty-four signature relics. The stairs keep the old rotation. (The lands need v24-v26 and v17 to be reached.)',
  });

  // ------------------------------------------------------------------ the machinery (the same as v20 and v21: a land's line is looked up from the world the floor belongs to)
  const addBoss = (def) => { const b = V20.addBoss(def); b.pack = V; return b; };
  const variant = (base, o) => { const d = V20.variant(base, o); d.pack = V; return d; };
  const LANDS = {};
  const land = (id, b1, b3, mega) => { LANDS[id] = { bosses: { 1: b1, 3: b3 }, mega }; };
  ED.specMods.push((spec) => {
    if (!P.on(V) || spec.final) return; const wi = W.at(spec.floor), L_ = wi && wi.routed && LANDS[wi.w.id]; if (!L_) return;
    const id = spec.mega ? L_.mega : (L_.bosses[wi.depth] || null); if (!id) return;
    const defs = spec.mega ? ED.bosses.MEGAS : ED.bosses.DEFS, def = defs[id]; if (!def) return;
    const partner = spec.partnerId ? defs[spec.partnerId] : null; spec.defId = id; spec.color = def.color; spec.arena = def.arena || spec.arena; spec.name = V20.nameOf(spec, def, partner); spec.land = wi.w.id;
  });
  const relic = (key, def) => I.addRelic(key, Object.assign({ pack: V, rarity: 'legendary', unique: true, mods: {} }, def));
  const part = V20.part, orbit = V20.orbit, flank = V20.flank, hung = V20.hung;
  /** a MEGA's phase follows its groups: the outermost parts first, then the next, then the core's health */
  const groupPhase = (e) => { const alive = (gr) => e.parts.some(p => p.group === gr && !p.dead); if (alive(0)) return 0; if (alive(1)) return 1; const core = e.parts.find(p => p.id === 'core'), f = core.hp / core.maxHp; return f > 0.6 ? 2 : f > 0.28 ? 3 : 4; };
  const hit = (g, e, dmg, x, y) => g.hurtPlayer(e.shotDmg * dmg, x === undefined ? e.x : x, y === undefined ? e.y : y, { src: e, zone: true });
  const eyes2 = (c, x, y, r, col) => { c.fillStyle = '#10101c'; c.beginPath(); c.arc(x - r * 0.15, y, r * 0.07, 0, TAU); c.arc(x + r * 0.15, y, r * 0.07, 0, TAU); c.fill(); if (col) { c.fillStyle = col; c.beginPath(); c.arc(x - r * 0.15, y, r * 0.03, 0, TAU); c.arc(x + r * 0.15, y, r * 0.03, 0, TAU); c.fill(); } };
  const bodyOf = (c, x, y, r, col, dk, w, h) => { c.fillStyle = darker(col, 0.5); c.beginPath(); c.moveTo(x - r * w, y + r); c.lineTo(x - r * w * 0.5, y - r * 0.3); c.lineTo(x + r * w * 0.5, y - r * 0.3); c.lineTo(x + r * w, y + r); c.closePath(); c.fill(); c.stroke(); c.fillStyle = darker(col, 0.15); c.beginPath(); c.moveTo(x - r * w * 0.6, y + r); c.lineTo(x - r * w * 0.3, y - r * 0.2); c.lineTo(x + r * w * 0.3, y - r * 0.2); c.lineTo(x + r * w * 0.6, y + r); c.closePath(); c.fill(); };
  const face = (c, x, y, r, tone) => { c.fillStyle = tone || '#f0e0d0'; c.beginPath(); c.arc(x, y, r * 0.42, 0, TAU); c.fill(); c.stroke(); };
  const spotlightOn = (e) => e.light && !e.dead;

  // ==================================================================== 1. THE FOOTLIGHTS
  //  Lumen keeps a follow-spot: it drifts after you, and he takes only a third of the harm anywhere else (a little extra inside it).  Walk the light onto him.
  const limelightInit = (e, g) => { e.light = { x: 480, y: 330, r: 92 }; e.dmgFilter = (gg, x, dmg) => { const Lm = x.light; if (!Lm) return dmg; return Math.hypot(x.x - Lm.x, x.y - Lm.y) < Lm.r + x.r * 0.4 ? dmg * 1.15 : dmg * 0.35; }; };
  const limelightTick = (e, g) => { const Lm = e.light; if (!Lm || e.dead) return; const p = g.player, d = Math.hypot(p.x - Lm.x, p.y - Lm.y), s = Math.min(d, 1.3 * sc(e).spd * g.ts); if (d > 1) { Lm.x += (p.x - Lm.x) / d * s; Lm.y += (p.y - Lm.y) / d * s; } };
  ED.hook('under', V, (g, c, t) => { for (const e of g.enemies) if (e.boss && spotlightOn(e)) { const Lm = e.light, gr = c.createRadialGradient(Lm.x, Lm.y, 6, Lm.x, Lm.y, Lm.r); gr.addColorStop(0, 'rgba(255,236,160,0.5)'); gr.addColorStop(1, 'rgba(255,220,120,0.08)'); c.save(); c.fillStyle = gr; c.beginPath(); c.arc(Lm.x, Lm.y, Lm.r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,240,170,0.65)'; c.lineWidth = 2; c.setLineDash([6, 6]); c.stroke(); c.setLineDash([]); c.restore(); } });
  if (ED.skin) { ED.skin.extraLights = ED.skin.extraLights || []; ED.skin.extraLights.push((g) => { const out = []; for (const e of g.enemies) if (e.boss && spotlightOn(e) && P.on(V)) out.push({ x: e.light.x, y: e.light.y, r: e.light.r * 2.2, color: '#fff0b8', a: 0.9 }); return out; }); }
  /** the cue: circles marked where you stand, one after another, each bursting when its mark is full */
  lib.cue = function* (e, g, o) {
    o = Object.assign({ n: 3, r: 62, tele: 56, gap: 20, dmg: 1.2, color: '#ffd070' }, o); const n = N(e, o.n), gp = o.gap / rateOf(e);
    for (let k = 0; k < n; k++) { const p = g.player, c = clampArena(p.x + (p.vx || 0) * (k ? 22 : 0), p.y + (p.vy || 0) * (k ? 22 : 0), o.r * 0.5); g.zoneCircle(e, c.x, c.y, o.r, g.tele(o.tele), e.shotDmg * o.dmg, { color: o.color, burst: true }); g.sfx('telegraph', { vol: 0.35 }); yield gp; }
    yield Math.max(8, g.tele(o.tele) - n * gp + 10);
  };
  addBoss({ id: 'lumen', name: 'Lumen', title: 'the Stage Director', color: '#ffd070', accent: '#fff0c0', r: 44, hp: 480, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'director', contact: 5,
    teaches: 'He plays to the house: outside his follow-spot he takes a third of the harm, inside it a little extra. The light trails you — lead it onto him, then strike.', unlock: { boss: 'lumen' },
    onSpawn: limelightInit, tick: limelightTick,
    attacks: { bow: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, color: '#ffe4a0' }), cue: L('cue', {}), cue2: L('cue', { n: 5, tele: 48, gap: 14 }), dolly: L('bars', { n: 3, thick: 50, gapW: 150, warn: 64, color: '#ffd070' }),
      encore: L('radial', { n: 14, reps: 3, gap: 14, speed: 2.3, rot: 0.17, color: '#ffd070' }), troupe: L('summon', { types: ['understudy', 'stagehand'], n: 2, max: 5, hpMul: 0.8 }), curtain: L('slamRing', { r: 92, tele: 38, rings: 2, speed: 3, gaps: 1, gapW: 0.9, color: '#e8506a' }) },
    phases: [
      { at: 1.0, name: 'Overture', attacks: ['bow', 'cue', 'troupe'], idle: [38, 66] },
      { at: 0.62, name: 'Act Two', attacks: ['bow', 'cue', 'dolly', 'encore', 'troupe'], idle: [28, 52], enter: [L('cue', { n: 3 })] },
      { at: 0.32, name: 'Act Three', attacks: ['cue2', 'dolly', 'encore', 'curtain', 'troupe'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Curtain Call', attacks: ['cue2', 'curtain', 'bow', 'encore'], idle: [16, 32] },
    ] });
  addBoss(Object.assign(variant('vael', { id: 'harlan', name: 'Ser Harlan', title: 'the Understudy Knight', color: '#e8506a', accent: '#fff0c0', tint: '#ff8a9a', arena: 'arena_pillars',
    teaches: 'He learnt every role by heart and plays them badly: his blades, his cues and his stand-ins come from the wings, and the light is on him only when it likes.',
    swap: { blades: L('fan', { n: 5, spread: 0.24, reps: 2, gap: 20, speed: 2.7, dmg: 0.9, color: '#ff9aa8' }), cue: L('cue', { n: 3, tele: 54 }), phantoms: L('summon', { types: ['understudy', 'stagehand'], n: 2, max: 5, hpMul: 0.8 }) },
    add: { 1: ['cue'], 2: ['cue'] }, phaseNames: { 'The Duelist': 'The Rehearsal', Fury: 'Improvised', 'Phantom Knight': 'The Wings', 'Hollow Fury': 'No Script' } }), { onSpawn: limelightInit, tick: limelightTick }));
  addBoss({ id: 'grandcurtain', name: 'The Grand Curtain', title: 'Every Seat Taken', color: '#c8404a', accent: '#ffe0a0', r: 104, hp: 1340, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'grandcurtain', mega: true, contact: 6,
    teaches: 'Cut the two curtains that close on you, shatter the chandeliers that light the house, then break the prompter\'s box at the heart of the stage.', unlock: { boss: 'grandcurtain' },
    parts: [
      { id: 'curL', kind: 'curtain', r: 40, hp: 0.1, group: 0, side: -1 }, { id: 'curR', kind: 'curtain', r: 40, hp: 0.1, group: 0, side: 1 },
      { id: 'lamp0', kind: 'lamp', r: 26, hp: 0.09, group: 1, ang: -2.4 }, { id: 'lamp1', kind: 'lamp', r: 28, hp: 0.09, group: 1, ang: -1.57 }, { id: 'lamp2', kind: 'lamp', r: 26, hp: 0.09, group: 1, ang: -0.74 },
      { id: 'core', kind: 'core', r: 56, hp: 0.53, group: 2 },
    ],
    attacks: { spots: L('beams', { n: 3, len: 720, w: 24, warn: 54, life: 110, rot: 0.02, dmg: 0.85, color: '#ffd070', anchorParts: 'lamp' }), cue: L('cue', { n: 4 }), cue2: L('cue', { n: 6, tele: 46, gap: 12 }), close: L('bars', { n: 3, thick: 54, gapW: 150, warn: 64, vertical: true, color: '#c8404a' }),
      troupe: L('summon', { types: ['understudy', 'stagehand', 'heckler'], n: 3, max: 7, hpMul: 0.8, radius: 190 }), applause: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.4, rot: 0.16, color: '#ffd070' }), fists: L('fists', {}), fists3: L('fists', { n: 3 }),
      finale: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#e8506a' }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'The Curtain Rises', attacks: ['close', 'cue', 'applause'], idle: [36, 62] },
      { name: 'House Lights', attacks: ['spots', 'cue', 'troupe', 'close', 'applause'], idle: [30, 54] },
      { name: 'The Prompter\'s Box', attacks: ['fists', 'cue2', 'troupe', 'applause', 'close'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'Encore', attacks: ['fists3', 'cue2', 'spiral', 'troupe', 'applause'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE FINAL BOW', attacks: ['finale', 'cue2', 'spiral', 'close', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('footlights', 'lumen', 'harlan', 'grandcurtain');
  part('curtain', flank(1.15, 0.0, 8), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#ff7a8a' : '#8a2a34'); c.beginPath(); c.moveTo(p.x - p.r * 0.7, p.y - p.r * 1.2); c.quadraticCurveTo(p.x + p.side * p.r * 0.7, p.y - p.r * 0.2, p.x - p.r * 0.7 * p.side, p.y + p.r * 1.2); c.lineTo(p.x + p.r * 0.7, p.y + p.r * 1.2); c.lineTo(p.x + p.r * 0.7, p.y - p.r * 1.2); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(p.x + k * p.r * 0.28, p.y - p.r * 1.1); c.lineTo(p.x + k * p.r * 0.28, p.y + p.r * 1.1); c.stroke(); } c.fillStyle = '#ffd070'; c.beginPath(); c.arc(p.x, p.y - p.r * 1.15, p.r * 0.14, 0, TAU); c.fill(); if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffd070', 0.22); });
  part('lamp', hung(1.12, 0.96, 5), (c, e, p, vul, fl, t) => {
    c.strokeStyle = '#6a5a30'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x, p.y - p.r * 1.6); c.lineTo(p.x, p.y - p.r * 0.5); c.stroke(); c.fillStyle = fl ? '#fff' : (vul ? '#fff0b0' : '#9a8a4a'); c.beginPath(); c.moveTo(p.x - p.r * 0.9, p.y + p.r * 0.7); c.lineTo(p.x - p.r * 0.5, p.y - p.r * 0.5); c.lineTo(p.x + p.r * 0.5, p.y - p.r * 0.5); c.lineTo(p.x + p.r * 0.9, p.y + p.r * 0.7); c.closePath(); c.fill(); c.stroke(); c.fillStyle = vul ? '#ffe880' : '#7a6a30'; c.beginPath(); c.arc(p.x, p.y + p.r * 0.7, p.r * 0.45, 0, Math.PI); c.fill(); if (vul) glow(c, p.x, p.y + p.r * 0.5, p.r * 1.8, '#ffe070', 0.3 + 0.1 * Math.sin(t * 0.2)); });
  BD.director = (c, e, x, y, r, col, dk, t) => {
    bodyOf(c, x, y, r, col, dk, 1.0, 0); face(c, x, y - r * 0.6, r); c.fillStyle = '#10101c'; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.86); c.lineTo(x + r * 0.5, y - r * 0.86); c.lineTo(x + r * 0.34, y - r * 1.22); c.lineTo(x - r * 0.34, y - r * 1.22); c.closePath(); c.fill(); c.stroke(); eyes2(c, x, y - r * 0.6, r, '#ffd070');
    c.save(); c.strokeStyle = '#ffd070'; c.lineWidth = 3; c.lineCap = 'round'; const w = Math.sin(t * 0.06) * 0.25; c.beginPath(); c.moveTo(x + r * 0.9, y + r * 0.3); c.lineTo(x + r * 1.4 * Math.cos(-0.9 + w), y + r * 0.3 + r * 1.4 * Math.sin(-0.9 + w)); c.stroke(); c.restore();
    c.fillStyle = '#ffd070'; c.beginPath(); c.arc(x - r * 0.95, y + r * 0.4, r * 0.22, 0, TAU); c.fill(); c.stroke(); };
  BD.grandcurtain = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#2a1018'; c.beginPath(); c.arc(x, y, r * 1.02, Math.PI, 0); c.lineTo(x + r * 1.02, y + r); c.lineTo(x - r * 1.02, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#4a1a20'; c.fillRect(x - r * 0.62, y - r * 0.2, r * 1.24, r * 1.2); c.fillStyle = '#e8c870'; c.fillRect(x - r * 0.62, y + r * 0.78, r * 1.24, r * 0.18);
    c.fillStyle = darker(col, 0.15); for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(x + sg * r * 0.98, y - r * 0.4); c.quadraticCurveTo(x + sg * r * 0.4, y + r * 0.2, x + sg * r * 0.75, y + r); c.lineTo(x + sg * r * 1.0, y + r); c.closePath(); c.fill(); c.stroke(); }
    c.fillStyle = '#e8c870'; c.beginPath(); c.arc(x, y - r * 0.5, r * 0.3, Math.PI, 0); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,240,170,' + (0.2 + 0.1 * Math.sin(t * 0.08)) + ')'; c.beginPath(); c.moveTo(x, y - r * 0.8); c.lineTo(x - r * 0.5, y + r * 0.8); c.lineTo(x + r * 0.5, y + r * 0.8); c.closePath(); c.fill(); };
  relic('limelightlens', { id: 'limelightlens', name: 'Limelight Lens', rarity: 'legendary', color: '#ffd070', mods: { crit: 0.08, luck: 1 }, unique: true, unlock: 'boss:lumen', desc: 'Critical hits come far more often, and the house is kinder: +1 luck. (Unlockable)' });
  relic('houselights', { id: 'houselights', name: 'House Lights', rarity: 'legendary', color: '#fff0b0', mods: { maxHp: 4, dmg: 0.05 }, unique: true, unlock: 'boss:grandcurtain', on: { clear(g) { if (g.player.hp < g.player.maxHp) g.healPlayer(1, true); } }, desc: 'A heart container, +5% damage; every cleared room mends a little. (Unlockable)' });

  // ==================================================================== 2. THE ROARING PIT
  //  The crowd throws bottles at the spot you are standing on: stand still and they find you.
  lib.bottles = function* (e, g, o) {
    o = Object.assign({ n: 5, r: 44, tele: 52, gap: 28, dmg: 1.1, color: '#ffb070' }, o); const n = N(e, o.n), gp = o.gap / rateOf(e);
    for (let k = 0; k < n; k++) { const p = g.player, c = clampArena(p.x, p.y, 22); g.zoneCircle(e, c.x, c.y, o.r, g.tele(o.tele), e.shotDmg * o.dmg, { color: o.color, burst: true }); g.sfx('telegraph', { vol: 0.3 }); yield gp; }
    yield Math.max(8, g.tele(o.tele) - n * gp + 10);
  };
  /** a thrown net: a marked line, then a bolt that roots you for about a second if it finds you (a dash tears free) */
  lib.net = function* (e, g, o) {
    o = Object.assign({ tele: 40, speed: 3.6, dmg: 0.8, root: 54, color: '#d8c8a0', n: 1 }, o);
    for (let k = 0; k < N(e, o.n); k++) { const a = ang(e, g), dur = g.tele(o.tele); g.zoneLine(e, e.x, e.y, e.x + Math.cos(a) * 600, e.y + Math.sin(a) * 600, 14, dur, 0, { color: o.color, hurts: false, burst: false }); g.sfx('telegraph'); yield dur;
      g.eShot(e, a, o.speed * sc(e).spd, { dmg: o.dmg, color: o.color, r: 9, kind: 'orb', onDie: (gg, b) => { if (K.hitPlayer(gg, b)) K.rootPlayer(gg, o.root, o.color); } }); g.sfx('shoot'); yield 26; }
  };
  addBoss({ id: 'brakka', name: 'Brakka', title: 'the Champion', color: '#ff7a4a', accent: '#ffe0c0', r: 46, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'champion', contact: 6,
    teaches: 'The crowd throws bottles at the spot where you are standing: keep moving. He throws a net now and then — a dash tears free — and charges when you are rooted.', unlock: { boss: 'brakka' },
    attacks: { trident: L('coneSlash', { arc: 1.7, r: 150, tele: 44, dmg: 1.6, color: '#ffb070' }), trident2: L('coneSlash', { arc: 1.7, r: 160, tele: 34, dmg: 1.6, times: 2, gap: 10, color: '#ffb070' }), bottles: L('bottles', {}), bottles2: L('bottles', { n: 8, tele: 46, gap: 18 }),
      net: L('net', {}), rush: L('charge', { tele: 40, speed: 10, dmg: 1.6, stun: 30, color: '#ff7a4a' }), roar: L('radial', { n: 14, reps: 3, gap: 14, speed: 2.4, rot: 0.2, color: '#ffb070' }), gate: L('bars', { n: 3, thick: 56, gapW: 150, warn: 64, color: '#ff7a4a' }),
      fighters: L('summon', { types: ['gadfly', 'retiarius'], n: 2, max: 5, hpMul: 0.8 }) },
    phases: [
      { at: 1.0, name: 'Opening Bout', attacks: ['trident', 'bottles', 'net', 'fighters'], idle: [36, 62] },
      { at: 0.62, name: 'The Crowd Stands', attacks: ['trident2', 'bottles', 'net', 'rush', 'gate'], idle: [28, 50], enter: [L('bottles', { n: 4 })] },
      { at: 0.32, name: 'Blood in the Sand', attacks: ['trident2', 'bottles2', 'rush', 'roar', 'net', 'fighters'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'No Mercy', attacks: ['bottles2', 'rush', 'trident2', 'roar'], idle: [16, 32] },
    ] });
  addBoss(variant('karsk', { id: 'ravager', name: 'Ravager', title: 'the Pit Beast', color: '#c85a3a', accent: '#ffe0c0', tint: '#ff8a5a', arena: 'arena_pits',
    teaches: 'Kept hungry below the sand: it bites, it charges, and the crowd pelts the spot you stand on while you dodge. Keep moving; it tires after a rush.',
    swap: { bottles: L('bottles', { n: 4 }) }, add: { 1: ['bottles'], 2: ['bottles'] }, phaseNames: {} }));
  addBoss({ id: 'korax', name: 'Korax', title: 'the Roaring Gate', color: '#d8643a', accent: '#ffe0c0', r: 106, hp: 1360, rScale: 1.0, hpScale: 1.02, arena: 'arena_round', shape: 'roaringgate', mega: true, contact: 6,
    teaches: 'Cut the chains that hold the gate, then silence the two iron beast heads that roar from it, then break the heart behind the bars. The crowd throws bottles.', unlock: { boss: 'korax' },
    parts: [
      { id: 'ch0', kind: 'chainlink', r: 26, hp: 0.06, group: 0, ang: 0.4 }, { id: 'ch1', kind: 'chainlink', r: 26, hp: 0.06, group: 0, ang: 1.97 }, { id: 'ch2', kind: 'chainlink', r: 26, hp: 0.06, group: 0, ang: 3.54 }, { id: 'ch3', kind: 'chainlink', r: 26, hp: 0.06, group: 0, ang: 5.11 },
      { id: 'headL', kind: 'gatehead', r: 42, hp: 0.13, group: 1, side: -1 }, { id: 'headR', kind: 'gatehead', r: 42, hp: 0.13, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 56, hp: 0.5, group: 2 },
    ],
    attacks: { chains: L('beams', { n: 4, len: 700, w: 22, warn: 56, life: 120, rot: 0.018, dmg: 0.85, color: '#ffb070', anchorParts: 'chainlink' }), bottles: L('bottles', { n: 6 }), bottles2: L('bottles', { n: 9, tele: 46, gap: 16 }), net: L('net', { n: 2 }), rush: L('charge', { tele: 38, speed: 10, dmg: 1.6, stun: 30, color: '#ff7a4a' }),
      roar: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.4, rot: 0.16, color: '#ffb070' }), gates: L('bars', { n: 3, thick: 56, gapW: 150, warn: 62, color: '#ff7a4a' }), beasts: L('summon', { types: ['pithound', 'gadfly', 'retiarius'], n: 3, max: 7, hpMul: 0.8, radius: 190 }),
      fists: L('fists', {}), fists3: L('fists', { n: 3 }), spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#ff7a4a' }), verdict: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'The Gate Holds', attacks: ['chains', 'bottles', 'roar'], idle: [36, 62] },
      { name: 'Two Heads', attacks: ['fists', 'bottles', 'net', 'beasts', 'gates'], idle: [30, 54] },
      { name: 'Open the Gate', attacks: ['fists3', 'bottles2', 'rush', 'beasts', 'roar'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'The Roaring', attacks: ['bottles2', 'spiral', 'net', 'rush', 'beasts'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE LAST BOUT', attacks: ['verdict', 'bottles2', 'spiral', 'rush', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('roaringpit', 'brakka', 'ravager', 'korax');
  part('chainlink', orbit(0.012, 1.3, 0.95), (c, e, p, vul, fl, t) => {
    c.strokeStyle = fl ? '#fff' : (vul ? '#ffd8b0' : '#7a6a60'); c.lineWidth = 5; c.beginPath(); c.ellipse(p.x, p.y, p.r * 0.9, p.r * 0.55, p.ang + t * 0.01, 0, TAU); c.stroke(); c.lineWidth = 3; c.strokeStyle = vul ? '#ff9a5a' : '#4a3a30'; c.beginPath(); c.ellipse(p.x + p.r * 0.7, p.y, p.r * 0.5, p.r * 0.32, p.ang + t * 0.01 + 1.2, 0, TAU); c.stroke(); if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ff9a5a', 0.22); });
  part('gatehead', flank(1.18, 0.15, 6), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#e8a070' : '#6a4a3a'); c.beginPath(); c.moveTo(p.x - p.side * p.r * 0.9, p.y + p.r * 0.9); c.lineTo(p.x - p.side * p.r * 0.7, p.y - p.r * 0.6); c.lineTo(p.x + p.side * p.r * 0.1, p.y - p.r * 1.1); c.lineTo(p.x + p.side * p.r * 1.0, p.y - p.r * 0.3); c.lineTo(p.x + p.side * p.r * 0.9, p.y + p.r * 0.6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#10101c'; c.beginPath(); c.arc(p.x + p.side * p.r * 0.3, p.y - p.r * 0.2, p.r * 0.14, 0, TAU); c.fill(); c.fillStyle = '#ffe0c0'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(p.x + p.side * (p.r * 0.5 + k * 5), p.y + p.r * 0.45); c.lineTo(p.x + p.side * (p.r * 0.6 + k * 5), p.y + p.r * 0.8); c.lineTo(p.x + p.side * (p.r * 0.7 + k * 5), p.y + p.r * 0.45); c.fill(); } if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ff7a4a', 0.25); });
  BD.champion = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.45); c.beginPath(); c.ellipse(x, y + r * 0.35, r * 1.0, r * 0.8, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = darker(col, 0.15); c.beginPath(); c.ellipse(x, y + r * 0.42, r * 0.7, r * 0.58, 0, 0, TAU); c.fill();
    face(c, x, y - r * 0.4, r, '#e8c8a8'); c.fillStyle = '#6a6a78'; c.beginPath(); c.arc(x, y - r * 0.5, r * 0.46, Math.PI, 0); c.fill(); c.stroke(); c.fillRect(x - r * 0.06, y - r * 0.95, r * 0.12, r * 0.45); c.fillStyle = col; c.fillRect(x - r * 0.04, y - r * 1.15, r * 0.08, r * 0.3); c.fillStyle = '#10101c'; c.fillRect(x - r * 0.34, y - r * 0.42, r * 0.68, r * 0.1); eyes2(c, x, y - r * 0.37, r, '#ff7a4a');
    c.save(); c.strokeStyle = '#a8a8b8'; c.lineWidth = 3; c.lineCap = 'round'; const s = Math.sin(t * 0.07) * 0.2; c.beginPath(); c.moveTo(x + r * 0.95, y + r * 0.9); c.lineTo(x + r * 1.25, y - r * 1.1 + s * r); c.stroke(); for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(x + r * 1.25 + k * r * 0.2, y - r * 1.1 + s * r); c.lineTo(x + r * 1.25 + k * r * 0.2, y - r * 1.4 + s * r); c.stroke(); } c.restore(); c.fillStyle = '#8a8a98'; c.beginPath(); c.arc(x - r * 0.95, y + r * 0.35, r * 0.4, 0, TAU); c.fill(); c.stroke(); };
  BD.roaringgate = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#3a2a28'; c.beginPath(); c.arc(x, y, r * 1.03, Math.PI, 0); c.lineTo(x + r * 1.03, y + r); c.lineTo(x - r * 1.03, y + r); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#10101c'; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.72, Math.PI, 0); c.lineTo(x + r * 0.72, y + r); c.lineTo(x - r * 0.72, y + r); c.closePath(); c.fill();
    c.strokeStyle = '#7a6a60'; c.lineWidth = 5; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(x + k * r * 0.2, y - r * 0.6 + Math.abs(k) * 4); c.lineTo(x + k * r * 0.2, y + r); c.stroke(); } c.lineWidth = 4; c.beginPath(); c.moveTo(x - r * 0.72, y + r * 0.2); c.lineTo(x + r * 0.72, y + r * 0.2); c.moveTo(x - r * 0.72, y + r * 0.6); c.lineTo(x + r * 0.72, y + r * 0.6); c.stroke();
    c.fillStyle = 'rgba(255,120,60,' + (0.25 + 0.15 * Math.sin(t * 0.1)) + ')'; c.beginPath(); c.arc(x, y + r * 0.5, r * 0.3, 0, TAU); c.fill(); };
  relic('crowdbreaker', { id: 'crowdbreaker', name: 'Crowdbreaker Helm', rarity: 'legendary', color: '#ff7a4a', mods: { def: 1, maxHp: 2, thorns: 0.3 }, unique: true, unlock: 'boss:brakka', desc: 'A dented champion\'s helm: +1 defense, half a heart more, and what strikes you is struck back. (Unlockable)' });
  relic('roaringgate', { id: 'roaringgate', name: 'Iron Roar', rarity: 'legendary', color: '#d8643a', mods: { dmg: 0.08, kb: 0.2 }, unique: true, unlock: 'boss:korax', on: { kill(g, p, e) { if (e && !e.boss && g.rng.chance(0.06)) g.healPlayer(1, true); } }, desc: '+8% damage, harder shoves; the odd kill brings the crowd to its feet and mends a little. (Unlockable)' });

  // ==================================================================== 3. STARFALL REACH
  //  Meteors mark circles and fall; each leaves a crater that burns for a few seconds.
  lib.meteors = function* (e, g, o) {
    o = Object.assign({ n: 6, r: 54, tele: 58, gap: 10, dmg: 1.2, aimed: 0.5, crater: 200, color: '#bfa8ff' }, o); const n = N(e, o.n), p = g.player, gp = o.gap / rateOf(e);
    for (let k = 0; k < n; k++) { const aim = g.rng.chance(o.aimed), c = aim ? clampArena(p.x + g.rng.range(-70, 70), p.y + g.rng.range(-70, 70), 30) : clampArena(g.rng.range(90, 870), g.rng.range(90, 486), 30);
      g.zoneCircle(e, c.x, c.y, o.r, g.tele(o.tele), e.shotDmg * o.dmg, { color: o.color, burst: true, onEnd: (gg, z) => { gg.hazardCircle(e, z.x, z.y, o.r * 0.8, o.crater, e.shotDmg * 0.4, { tick: 26, color: '#ffd8ff' }); } }); yield gp; }
    g.sfx('telegraph'); yield g.tele(o.tele) + 12;
  };
  addBoss({ id: 'perse', name: 'Perse', title: 'the Falling Star', color: '#bfa8ff', accent: '#f0e8ff', r: 44, hp: 480, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'fallingstar', contact: 5,
    teaches: 'Her meteors mark a circle for a second and fall; each leaves a crater that burns for a few seconds. Read the marks, cross the craters only when you must.', unlock: { boss: 'perse' },
    attacks: { sparks: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, color: '#d8c8ff' }), meteors: L('meteors', {}), meteors2: L('meteors', { n: 9, tele: 50, gap: 7, aimed: 0.6 }), nova: L('radial', { n: 16, reps: 3, gap: 14, speed: 2.3, rot: 0.17, color: '#bfa8ff' }),
      streak: L('charge', { tele: 40, speed: 10, dmg: 1.5, stun: 30, color: '#d8c8ff' }), constellation: L('beams', { n: 3, len: 700, w: 22, warn: 56, life: 110, rot: 0.02, dmg: 0.8, color: '#bfa8ff' }), dust: L('summon', { types: ['cometling', 'dustmite'], n: 2, max: 5, hpMul: 0.8 }), ring: L('slamRing', { r: 90, tele: 38, rings: 2, speed: 3, color: '#bfa8ff' }) },
    phases: [
      { at: 1.0, name: 'First Light', attacks: ['sparks', 'meteors', 'nova'], idle: [38, 64] },
      { at: 0.62, name: 'Shower', attacks: ['sparks', 'meteors', 'streak', 'dust', 'ring'], idle: [28, 52], enter: [L('meteors', { n: 4 })] },
      { at: 0.32, name: 'Constellation', attacks: ['meteors2', 'constellation', 'nova', 'dust', 'streak'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Falling Star', attacks: ['meteors2', 'streak', 'constellation', 'ring'], idle: [16, 32] },
    ] });
  addBoss(variant('aegis', { id: 'polaris', name: 'Polaris', title: 'the Frozen Star', color: '#a8b8ff', accent: '#f0e8ff', tint: '#c8d0ff', arena: 'arena_cross',
    teaches: 'A star that never moved and never fell: its shards ring true, and the sky around it keeps dropping stones. Break the shards, and watch the marks.',
    swap: { rain: L('meteors', { n: 6, tele: 54 }) }, add: { 1: ['rain'], 2: ['rain'] }, phaseNames: {} }));
  addBoss({ id: 'blackcomet', name: 'The Black Comet', title: 'Which Does Not Return', color: '#6a58b8', accent: '#d8c8ff', r: 104, hp: 1330, rScale: 1.0, hpScale: 1.02, arena: 'arena_round', shape: 'comet', mega: true, contact: 6,
    teaches: 'Four small moons circle it: break them, then the two tails that trail its path, then the head. Craters burn for seconds; meteors mark first.', unlock: { boss: 'blackcomet' },
    parts: [
      { id: 'm0', kind: 'moon', r: 26, hp: 0.07, group: 0, ang: 0.3 }, { id: 'm1', kind: 'moon', r: 26, hp: 0.07, group: 0, ang: 1.87 }, { id: 'm2', kind: 'moon', r: 26, hp: 0.07, group: 0, ang: 3.44 }, { id: 'm3', kind: 'moon', r: 26, hp: 0.07, group: 0, ang: 5.01 },
      { id: 'tailL', kind: 'tail', r: 44, hp: 0.12, group: 1, side: -1 }, { id: 'tailR', kind: 'tail', r: 44, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 56, hp: 0.48, group: 2 },
    ],
    attacks: { orbits: L('beams', { n: 3, len: 720, w: 24, warn: 54, life: 110, rot: 0.02, dmg: 0.85, color: '#bfa8ff', anchorParts: 'moon' }), meteors: L('meteors', { n: 7 }), meteors2: L('meteors', { n: 11, tele: 48, gap: 6, aimed: 0.6 }), nova: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.4, rot: 0.16, color: '#bfa8ff' }),
      streak: L('charge', { tele: 38, speed: 10, dmg: 1.6, stun: 30, color: '#d8c8ff' }), fists: L('fists', {}), fists3: L('fists', { n: 3 }), swarm: L('summon', { types: ['cometling', 'gloamwing', 'dustmite'], n: 3, max: 7, hpMul: 0.8, radius: 190 }),
      spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#6a58b8' }), void: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Four Moons', attacks: ['orbits', 'meteors', 'nova'], idle: [36, 62] },
      { name: 'The Tails', attacks: ['fists', 'meteors', 'swarm', 'streak'], idle: [30, 54] },
      { name: 'Perihelion', attacks: ['fists3', 'meteors2', 'streak', 'swarm', 'nova'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'The Long Dark', attacks: ['meteors2', 'spiral', 'swarm', 'streak', 'nova'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE DEEP SKY', attacks: ['void', 'meteors2', 'spiral', 'streak', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('starfall', 'perse', 'polaris', 'blackcomet');
  part('moon', orbit(0.014, 1.3, 0.95), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#e8e0ff' : '#7a70a8'); c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(p.x - p.r * 0.3, p.y - p.r * 0.2, p.r * 0.22, 0, TAU); c.arc(p.x + p.r * 0.35, p.y + p.r * 0.3, p.r * 0.16, 0, TAU); c.fill(); if (vul) glow(c, p.x, p.y, p.r * 1.5, '#bfa8ff', 0.3 + 0.1 * Math.sin(t * 0.2)); });
  part('tail', flank(1.12, 0.4, 7), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#c8b8ff' : '#5a4a98'); c.beginPath(); c.moveTo(p.x, p.y - p.r * 1.1); c.quadraticCurveTo(p.x + p.side * p.r * 1.2, p.y, p.x + p.side * p.r * 0.4, p.y + p.r * 1.5); c.quadraticCurveTo(p.x - p.side * p.r * 0.3, p.y + p.r * 0.2, p.x, p.y - p.r * 1.1); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(p.x + p.side * (k * 4 + Math.sin(t * 0.1 + k) * 2), p.y + p.r * (0.2 + k * 0.3), 3 - k * 0.5, 0, TAU); c.fill(); } if (vul) glow(c, p.x, p.y + p.r * 0.2, p.r * 1.4, '#bfa8ff', 0.25); });
  BD.fallingstar = (c, e, x, y, r, col, dk, t) => {
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * 0.02) * 0.1); c.fillStyle = darker(col, 0.4); c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.55 : r * 1.12; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.stroke();
    c.fillStyle = darker(col, 0.1); c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.4 : r * 0.82; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore();
    face(c, x, y, r * 0.8, '#f0e8ff'); eyes2(c, x, y + r * 0.02, r, '#bfa8ff'); c.strokeStyle = 'rgba(210,190,255,0.5)'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x - r * 0.4 - k * 7, y - r * 1.3 - k * 9); c.lineTo(x - r * 0.1 - k * 7, y - r * 0.95 - k * 9); c.stroke(); } };
  BD.comet = (c, e, x, y, r, col, dk, t) => {
    for (let k = 3; k >= 1; k--) { c.fillStyle = 'rgba(' + (60 + k * 20) + ',' + (50 + k * 15) + ',' + (140 + k * 20) + ',' + (0.18 + 0.06 * (4 - k)) + ')'; c.beginPath(); c.ellipse(x, y - r * k * 0.36, r * (1.1 - k * 0.2), r * 0.7, 0, 0, TAU); c.fill(); }
    c.fillStyle = darker(col, 0.4); c.beginPath(); c.arc(x, y + r * 0.1, r * 0.98, 0, TAU); c.fill(); c.stroke(); c.fillStyle = darker(col, 0.1); c.beginPath(); c.arc(x - r * 0.1, y, r * 0.8, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,0.25)'; for (const [dx, dy, k] of [[-0.3, -0.2, 0.2], [0.35, 0.3, 0.16], [0.1, -0.5, 0.12]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, k * r, 0, TAU); c.fill(); }
    c.fillStyle = '#e8e0ff'; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.2, 0, TAU); c.fill(); c.fillStyle = '#10101c'; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.1, 0, TAU); c.fill(); };
  relic('stardustvial', { id: 'stardustvial', name: 'Vial of Stardust', rarity: 'legendary', color: '#bfa8ff', mods: { gold: 0.3, luck: 1 }, unique: true, unlock: 'boss:perse', desc: 'Gold glitters: +30% from every source, and +1 luck. (Unlockable)' });
  relic('cometcore', { id: 'cometcore', name: 'Comet Core', rarity: 'legendary', color: '#6a58b8', mods: { burn: 0.1, explode: 0.1 }, unique: true, unlock: 'boss:blackcomet', desc: 'Your blows ignite what they strike, and the odd one lands like a falling star. (Unlockable)' });

  // ==================================================================== 4. THE FOUNDERED GALLEON
  //  The deck lists: for a couple of seconds you slide toward the low side while cannons fire down marked lanes (step across them).
  lib.listing = function* (e, g, o) {
    o = Object.assign({ frames: 150, force: 1.0, warn: 64, color: '#7ad0e0', cannons: 2, dmg: 1.2 }, o);
    const side = g.rng.int(0, 3), dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][side], rect = [[926 - 80, 40, 80, 500], [34, 40, 80, 500], [34, 546 - 70, 892, 70], [34, 40, 892, 70]][side], dur = g.tele(o.warn);
    g.zoneRect(e, rect[0], rect[1], rect[2], rect[3], dur, 0, { color: o.color, hurts: false, burst: false }); g.toast('THE DECK LISTS!', o.color, 70); g.sfx('telegraph'); yield dur;
    const cn = N(e, o.cannons), p0 = g.player;
    for (let k = 0; k < cn; k++) { const horiz = dir[0] !== 0, pos = horiz ? U.clamp(p0.y + (k - (cn - 1) / 2) * 90, 80, 496) : U.clamp(p0.x + (k - (cn - 1) / 2) * 90, 80, 880); g.zoneRect(e, horiz ? 34 : pos - 24, horiz ? pos - 24 : 40, horiz ? 892 : 48, horiz ? 48 : 506, g.tele(50), e.shotDmg * o.dmg, { color: '#ffd070', burst: true }); }
    g._zone({ kind: 'hazard', shape: 'circle', x: -200, y: -200, r: 1, life: o.frames, dmg: 0, hurts: false, tick: 9999, tickT: 0, src: e, color: o.color, upd(gg, z) { const p = gg.player; if (!p.dead && p.dashT <= 0) ED.phys.move(gg, p, dir[0] * o.force * gg.ts * (p.forceMul || 1), dir[1] * o.force * gg.ts * (p.forceMul || 1)); } });
    g.sfx('thud', { vol: 0.5 }); yield o.frames;
  };
  addBoss({ id: 'tarn', name: 'Captain Tarn', title: 'the Foundered Captain', color: '#6fc8d8', accent: '#e0f8ff', r: 46, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_cross', shape: 'captain', contact: 5,
    teaches: 'He still steers a sinking deck: now and then it lists and you slide toward the low side while cannons fire down marked lanes. Step across the lanes, not along them.', unlock: { boss: 'tarn' },
    attacks: { broadside: L('fan', { n: 7, spread: 0.2, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, color: '#9ae0f0' }), list: L('listing', {}), list2: L('listing', { cannons: 3, force: 1.3, frames: 170 }), grapple: L('charge', { tele: 40, speed: 10, dmg: 1.5, stun: 30, color: '#6fc8d8' }),
      kegs: L('rain', { n: 9, r: 46, interval: 8, warn: 52, aimed: 0.5, shrapnel: 4, color: '#ffb04a' }), crew: L('summon', { types: ['deckhand', 'powdermonkey'], n: 2, max: 5, hpMul: 0.8 }), swell: L('slamRing', { r: 92, tele: 38, rings: 2, speed: 3, color: '#6fc8d8' }), sabre: L('coneSlash', { arc: 1.7, r: 150, tele: 42, dmg: 1.6, color: '#9ae0f0' }) },
    phases: [
      { at: 1.0, name: 'Full Sail', attacks: ['broadside', 'list', 'crew'], idle: [38, 64] },
      { at: 0.62, name: 'Taking Water', attacks: ['broadside', 'list', 'grapple', 'kegs', 'sabre'], idle: [28, 52], enter: [L('listing', { cannons: 2 })] },
      { at: 0.32, name: 'Abandon Ship', attacks: ['list2', 'grapple', 'kegs', 'swell', 'crew'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Down With the Ship', attacks: ['list2', 'kegs', 'sabre', 'broadside'], idle: [16, 32] },
    ] });
  addBoss(variant('vael', { id: 'dray', name: 'Mate Dray', title: 'the Boarding Knight', color: '#4fa8b8', accent: '#e0f8ff', tint: '#8ae0f0', arena: 'arena_pillars',
    teaches: 'The captain\'s first mate fights with the tide: his blades come in volleys, his crew boards, and every so often the deck lists under you.',
    swap: { blades: L('fan', { n: 5, spread: 0.24, reps: 2, gap: 20, speed: 2.7, dmg: 0.9, color: '#8ae0f0' }), list: L('listing', { cannons: 2 }), phantoms: L('summon', { types: ['deckhand', 'powdermonkey'], n: 2, max: 5, hpMul: 0.8 }) },
    add: { 1: ['list'], 2: ['list'] }, phaseNames: { 'The Duelist': 'The Boarding', Fury: 'Heeling Over' } }));
  addBoss({ id: 'figurehead', name: 'The Figurehead', title: 'Who Watches the Waves', color: '#5ab0c0', accent: '#e0f8ff', r: 106, hp: 1350, rScale: 1.0, hpScale: 1.02, arena: 'arena_cross', shape: 'figurehead', mega: true, contact: 6,
    teaches: 'Tear down the two sails, silence the three cannons, then break the carved heart. The deck lists; the cannons fire down marked lanes.', unlock: { boss: 'figurehead' },
    parts: [
      { id: 'sailL', kind: 'sail', r: 42, hp: 0.09, group: 0, side: -1 }, { id: 'sailR', kind: 'sail', r: 42, hp: 0.09, group: 0, side: 1 },
      { id: 'gun0', kind: 'cannon', r: 26, hp: 0.08, group: 1, ang: -2.4 }, { id: 'gun1', kind: 'cannon', r: 28, hp: 0.08, group: 1, ang: -1.57 }, { id: 'gun2', kind: 'cannon', r: 26, hp: 0.08, group: 1, ang: -0.74 },
      { id: 'core', kind: 'core', r: 56, hp: 0.58, group: 2 },
    ],
    attacks: { broadsides: L('beams', { n: 3, len: 720, w: 24, warn: 54, life: 110, rot: 0.02, dmg: 0.85, color: '#ffd070', anchorParts: 'cannon' }), list: L('listing', {}), list2: L('listing', { cannons: 3, force: 1.3, frames: 170 }), kegs: L('rain', { n: 11, r: 46, interval: 7, warn: 50, aimed: 0.5, shrapnel: 4, color: '#ffb04a' }),
      crew: L('summon', { types: ['deckhand', 'powdermonkey', 'bilgeswarm'], n: 3, max: 8, hpMul: 0.8, radius: 190 }), swell: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.4, rot: 0.16, color: '#6fc8d8' }), fists: L('fists', {}), fists3: L('fists', { n: 3 }),
      spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#5ab0c0' }), maelstrom: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Under Sail', attacks: ['list', 'kegs', 'swell'], idle: [36, 62] },
      { name: 'Gun Deck', attacks: ['broadsides', 'list', 'crew', 'kegs'], idle: [30, 54] },
      { name: 'The Carved Heart', attacks: ['fists', 'list2', 'crew', 'swell', 'kegs'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'Foundering', attacks: ['fists3', 'list2', 'spiral', 'crew', 'swell'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE LAST WAVE', attacks: ['maelstrom', 'list2', 'spiral', 'kegs', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('galleon', 'tarn', 'dray', 'figurehead');
  part('sail', flank(1.2, -0.1, 9), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#f4f0e0' : '#9a9888'); c.beginPath(); c.moveTo(p.x - p.side * p.r * 0.1, p.y - p.r * 1.3); c.quadraticCurveTo(p.x + p.side * p.r * 1.2, p.y - p.r * 0.2, p.x - p.side * p.r * 0.1, p.y + p.r * 1.1); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#5a3a20'; c.lineWidth = 4; c.beginPath(); c.moveTo(p.x - p.side * p.r * 0.1, p.y - p.r * 1.5); c.lineTo(p.x - p.side * p.r * 0.1, p.y + p.r * 1.3); c.stroke(); c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2; for (let k = 1; k <= 3; k++) { c.beginPath(); c.moveTo(p.x - p.side * p.r * 0.1, p.y - p.r * 1.3 + k * p.r * 0.6); c.lineTo(p.x + p.side * p.r * (0.7 - k * 0.1), p.y - p.r * 1.0 + k * p.r * 0.55); c.stroke(); } if (vul) glow(c, p.x, p.y, p.r * 1.3, '#e0f8ff', 0.2); });
  part('cannon', hung(1.1, 0.95, 5), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#b8b8c8' : '#5a5a68'); c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(e.y - p.y, e.x - p.x) + Math.PI); c.fillRect(-p.r * 0.2, -p.r * 0.38, p.r * 1.4, p.r * 0.76); c.strokeRect(-p.r * 0.2, -p.r * 0.38, p.r * 1.4, p.r * 0.76); c.fillStyle = '#2a2a34'; c.beginPath(); c.arc(p.r * 1.2, 0, p.r * 0.26, 0, TAU); c.fill(); c.restore(); c.fillStyle = '#5a3a20'; c.beginPath(); c.arc(p.x, p.y + p.r * 0.2, p.r * 0.5, 0, TAU); c.fill(); c.stroke(); if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffd070', 0.25); });
  BD.captain = (c, e, x, y, r, col, dk, t) => {
    bodyOf(c, x, y, r, col, dk, 1.05, 0); face(c, x, y - r * 0.55, r, '#d8c0a0'); c.fillStyle = '#1a2a38'; c.beginPath(); c.moveTo(x - r * 0.62, y - r * 0.82); c.lineTo(x + r * 0.62, y - r * 0.82); c.lineTo(x + r * 0.4, y - r * 1.22); c.lineTo(x, y - r * 1.05); c.lineTo(x - r * 0.4, y - r * 1.22); c.closePath(); c.fill(); c.stroke(); eyes2(c, x, y - r * 0.55, r, '#6fc8d8');
    c.strokeStyle = '#a8a8b8'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + r * 0.9, y + r * 0.8); c.lineTo(x + r * 1.4, y - r * 0.6); c.stroke(); c.fillStyle = '#e8c860'; for (let k = 0; k < 3; k++) c.fillRect(x - r * 0.3 + k * r * 0.3, y + r * 0.1, r * 0.14, r * 0.14); c.strokeStyle = 'rgba(160,220,240,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - r, y + r * 0.9); c.quadraticCurveTo(x, y + r * (0.6 + Math.sin(t * 0.1) * 0.1), x + r, y + r * 0.9); c.stroke(); };
  BD.figurehead = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#4a3a28'; c.beginPath(); c.moveTo(x - r * 1.0, y + r); c.lineTo(x - r * 0.7, y - r * 0.2); c.quadraticCurveTo(x - r * 0.5, y - r * 0.95, x, y - r * 1.0); c.quadraticCurveTo(x + r * 0.5, y - r * 0.95, x + r * 0.7, y - r * 0.2); c.lineTo(x + r * 1.0, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = darker(col, 0.2); c.beginPath(); c.arc(x, y - r * 0.35, r * 0.5, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#e8f4f0'; c.beginPath(); c.arc(x - r * 0.18, y - r * 0.4, r * 0.1, 0, TAU); c.arc(x + r * 0.18, y - r * 0.4, r * 0.1, 0, TAU); c.fill(); c.fillStyle = 'rgba(111,200,216,' + (0.5 + 0.3 * Math.sin(t * 0.08)) + ')'; c.beginPath(); c.arc(x - r * 0.18, y - r * 0.4, r * 0.05, 0, TAU); c.arc(x + r * 0.18, y - r * 0.4, r * 0.05, 0, TAU); c.fill();
    c.strokeStyle = '#2a3a40'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - r * 0.2, y - r * 0.05); c.quadraticCurveTo(x, y + r * 0.1, x + r * 0.2, y - r * 0.05); c.stroke(); c.strokeStyle = darker(col, 0.4); c.lineWidth = 4; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * r * 0.14, y - r * 0.8); c.quadraticCurveTo(x + k * r * 0.4, y - r * 0.1, x + k * r * 0.5, y + r * 0.6 + Math.sin(t * 0.05 + k) * 4); c.stroke(); } };
  relic('captainsspyglass', { id: 'captainsspyglass', name: "Captain's Spyglass", rarity: 'legendary', color: '#6fc8d8', mods: { range: 0.2, crit: 0.05, magnet: 0.2 }, unique: true, unlock: 'boss:tarn', desc: 'You see farther, strike from farther and gather what lies about: +20% reach, more critical hits, a stronger magnet. (Unlockable)' });
  relic('carvedheart', { id: 'carvedheart', name: 'Carved Heart', rarity: 'legendary', color: '#5ab0c0', mods: { maxHp: 4, def: 1, regen: 1 }, unique: true, unlock: 'boss:figurehead', desc: 'A heart of old oak: a heart container, +1 defense, and a slow mending. (Unlockable)' });

  ED.v27 = { LANDS, addBoss, variant, land, relic, groupPhase, limelightInit, limelightTick, helpers: { bodyOf, face, eyes2, rateOf, hit } };
})(typeof globalThis !== 'undefined' ? globalThis : this);

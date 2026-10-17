/* EMBERDEEP — pack_v27b.js : v27 "SOVEREIGNS II", part two — the lands of v25 (the Archive, the Caldera, the Mirage Flats, the Bazaar).  Pack v27's framework lives in pack_v27.js.
 *    HUSHED ARCHIVE   Vellum, the Head Archivist (he dozes: ×2.2 harm while he sleeps) · Foxing, the Mould of Pages · THE UNREAD (shelves, tomes, the silence)
 *    ASHEN CALDERA    Calder, the Vent Keeper (lanes erupt and keep burning) · Basalt, the Cooled Tyrant · THE SLEEPING MOUNTAIN (vents, crags, the magma heart)
 *    MIRAGE FLATS     Sirocco, the Sand King (every pattern from three places) · Fata, the Mirage Knight · THE ENDLESS DUNE (crests, idols, the buried one)
 *    ABYSSAL BAZAAR   Mercatus, the Haggler (bids close in faster) · Tarif, the Customs Sentinel · THE VAULT BELOW (lockboxes, ledgers, the strongbox)
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, I = ED.items, P = ED.packs, W = ED.worlds;
  const X = ED.attacks, lib = X.lib, N = X.N, ang = X.ang, clampArena = X.clampArena, sc = X.sc;
  const TAU = U.TAU, V = 'v27', L = (name, o) => [name, o];
  const darker = (c, k) => ED.render.darker(c, k);
  const glow = (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); };
  const V27 = ED.v27, V20 = ED.v20, BD = ED.bossDraw, { addBoss, variant, land, relic, groupPhase } = V27, { bodyOf, face, eyes2, rateOf } = V27.helpers;
  const part = V20.part, orbit = V20.orbit, flank = V20.flank, hung = V20.hung;

  // ==================================================================== 5. THE HUSHED ARCHIVE
  //  Vellum reads himself to sleep: for a few seconds he does nothing and takes more than double the harm; he wakes with a shush that rolls outward as a ring.
  lib.doze = function* (e, g, o) {
    o = Object.assign({ frames: 150, mul: 2.2, color: '#d8b878' }, o); const before = e.dmgTakenMul;
    try {
      e.dozing = true; e.dmgTakenMul = (before || 1) * o.mul; g.addText(e.x, e.y - e.r - 10, 'zzz...', '#cfd0f0', 14); g.sfx('ui', { vol: 0.3 });
      for (let i = 0; i < o.frames; i++) { if (i % 36 === 0) g.addText(e.x + 12, e.y - e.r - 16, 'Z', '#cfd0f0', 13); yield 1; }
    } finally { e.dmgTakenMul = before; e.dozing = false; }
    g.addText(e.x, e.y - e.r - 10, 'SHHH', '#ffd24a', 15); g.shockRing(e, e.x, e.y, 3.0, 16, 520, e.shotDmg * 0.9, { color: o.color }); g.sfx('thud', { vol: 0.5 }); yield 22;
  };
  addBoss({ id: 'vellum', name: 'Vellum', title: 'the Head Archivist', color: '#d8b878', accent: '#fff4d0', r: 44, hp: 480, rScale: 1.0, hpScale: 1.0, arena: 'arena_pillars', shape: 'archivist', contact: 5,
    teaches: 'He reads himself to sleep between volleys: while he dozes he takes more than twice the harm — strike then. He wakes with a ring that rolls out from him; step over it.', unlock: { boss: 'vellum' },
    attacks: { pages: L('fan', { n: 6, spread: 0.22, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, wave: 0.5, color: '#f0e8d0' }), stack: L('bars', { n: 3, thick: 52, gapW: 150, warn: 64, color: '#d8b878' }), shh: L('radial', { n: 16, reps: 3, gap: 14, speed: 2.2, rot: 0.17, color: '#d8b878' }), doze: L('doze', {}), doze2: L('doze', { frames: 120, mul: 2.0 }),
      index: L('rain', { n: 9, r: 44, interval: 8, warn: 52, aimed: 0.5, color: '#d8b878' }), tomes: L('summon', { types: ['pagewraith', 'inkblot'], n: 2, max: 5, hpMul: 0.8 }), overdue: L('charge', { tele: 40, speed: 10, dmg: 1.5, stun: 30, color: '#d8b878' }), hush: L('slamRing', { r: 90, tele: 38, rings: 2, speed: 3, color: '#d8b878' }) },
    phases: [
      { at: 1.0, name: 'Quiet, Please', attacks: ['pages', 'shh', 'doze', 'tomes'], idle: [38, 64] },
      { at: 0.62, name: 'Overdue', attacks: ['pages', 'stack', 'doze', 'index', 'overdue'], idle: [28, 52], enter: [L('radial', { n: 12, reps: 1, speed: 2.2, color: '#d8b878' })] },
      { at: 0.32, name: 'Lock the Stacks', attacks: ['stack', 'doze2', 'index', 'hush', 'tomes', 'shh'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Last Reader', attacks: ['doze2', 'stack', 'overdue', 'shh'], idle: [16, 32] },
    ] });
  addBoss(variant('mycelia', { id: 'foxing', name: 'Foxing', title: 'the Mould of Pages', color: '#b89a5a', accent: '#fff4d0', tint: '#d8b878', arena: 'arena_ruins',
    teaches: 'Mould that took the library and learnt to read: it blooms in the dark, and now and then it nods off — while it does, it is soft. Strike then.',
    swap: { doze: L('doze', { frames: 130, mul: 2.0 }) }, add: { 1: ['doze'], 2: ['doze'] }, phaseNames: {} }));
  addBoss({ id: 'unread', name: 'The Unread', title: 'Whose Silence Is Total', color: '#c8a868', accent: '#fff4d0', r: 104, hp: 1340, rScale: 1.0, hpScale: 1.02, arena: 'arena_pillars', shape: 'unread', mega: true, contact: 6,
    teaches: 'Topple the four shelves that hold the library up, tear the two great tomes, then break the closed book at its heart. It dozes now and then: strike then.', unlock: { boss: 'unread' },
    parts: [
      { id: 'sh0', kind: 'shelf', r: 28, hp: 0.06, group: 0, ang: -2.6 }, { id: 'sh1', kind: 'shelf', r: 28, hp: 0.06, group: 0, ang: -2.0 }, { id: 'sh2', kind: 'shelf', r: 28, hp: 0.06, group: 0, ang: -1.14 }, { id: 'sh3', kind: 'shelf', r: 28, hp: 0.06, group: 0, ang: -0.54 },
      { id: 'tomeL', kind: 'tome', r: 44, hp: 0.12, group: 1, side: -1 }, { id: 'tomeR', kind: 'tome', r: 44, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 56, hp: 0.52, group: 2 },
    ],
    attacks: { catalogue: L('beams', { n: 4, len: 700, w: 22, warn: 56, life: 120, rot: 0.016, dmg: 0.85, color: '#d8b878', anchorParts: 'shelf' }), doze: L('doze', {}), doze2: L('doze', { frames: 120, mul: 2.0 }), pages: L('fan', { n: 9, spread: 0.18, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, wave: 0.5, color: '#f0e8d0' }),
      stack: L('bars', { n: 3, thick: 52, gapW: 150, warn: 62, color: '#d8b878' }), shh: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.3, rot: 0.16, color: '#d8b878' }), readers: L('summon', { types: ['pagewraith', 'bookwyrm', 'inkblot'], n: 3, max: 7, hpMul: 0.8, radius: 190 }),
      fists: L('fists', {}), fists3: L('fists', { n: 3 }), spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#c8a868' }), silence: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'The Stacks', attacks: ['catalogue', 'pages', 'shh'], idle: [36, 62] },
      { name: 'Two Great Tomes', attacks: ['fists', 'doze', 'stack', 'readers', 'pages'], idle: [30, 54] },
      { name: 'The Closed Book', attacks: ['fists3', 'doze2', 'pages', 'readers', 'shh'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'The Long Hush', attacks: ['doze2', 'spiral', 'readers', 'stack', 'shh'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE LAST PAGE', attacks: ['silence', 'doze2', 'spiral', 'stack', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('archive', 'vellum', 'foxing', 'unread');
  part('shelf', hung(1.1, 0.98, 4), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#e8c890' : '#6a4a2a'); c.fillRect(p.x - p.r * 0.8, p.y - p.r * 1.1, p.r * 1.6, p.r * 2.2); c.strokeRect(p.x - p.r * 0.8, p.y - p.r * 1.1, p.r * 1.6, p.r * 2.2); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; for (const k of [-0.37, 0.37]) { c.beginPath(); c.moveTo(p.x - p.r * 0.8, p.y + k * p.r); c.lineTo(p.x + p.r * 0.8, p.y + k * p.r); c.stroke(); }
    const cols = ['#a83a3a', '#3a5a9a', '#4a7a3a', '#c8a030']; for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) { c.fillStyle = cols[(k + row) % 4]; c.fillRect(p.x - p.r * 0.7 + k * p.r * 0.36, p.y - p.r * 0.95 + row * p.r * 0.72, p.r * 0.28, p.r * 0.52); } if (vul) glow(c, p.x, p.y, p.r * 1.4, '#ffe0a0', 0.22); });
  part('tome', flank(1.18, 0.1, 7), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#e8d0a0' : '#7a5a38'); c.beginPath(); c.moveTo(p.x - p.r * 1.0, p.y - p.r * 0.8); c.lineTo(p.x + p.r * 1.0, p.y - p.r * 0.8); c.lineTo(p.x + p.r * 1.0, p.y + p.r * 0.9); c.lineTo(p.x - p.r * 1.0, p.y + p.r * 0.9); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#e8dcc0'; c.fillRect(p.x - p.r * 0.85, p.y - p.r * 0.65, p.r * 1.7, p.r * 1.3); c.strokeStyle = 'rgba(40,30,20,0.5)'; c.lineWidth = 1.5; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(p.x - p.r * 0.7, p.y - p.r * 0.45 + k * p.r * 0.26); c.lineTo(p.x + p.r * 0.7, p.y - p.r * 0.45 + k * p.r * 0.26); c.stroke(); } c.strokeStyle = '#2a1a0a'; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x, p.y - p.r * 0.8); c.lineTo(p.x, p.y + p.r * 0.9); c.stroke(); if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffe0a0', 0.2); });
  BD.archivist = (c, e, x, y, r, col, dk, t) => {
    bodyOf(c, x, y, r, col, dk, 1.05, 0); face(c, x, y - r * 0.58, r, '#e8d8c0'); c.fillStyle = '#e8e0d0'; c.beginPath(); c.arc(x, y - r * 0.4, r * 0.4, 0.3, Math.PI - 0.3); c.fill(); c.fillStyle = '#8a7a6a'; c.beginPath(); c.arc(x, y - r * 0.82, r * 0.36, Math.PI, 0); c.fill(); c.strokeStyle = '#c8a030'; c.lineWidth = 2; c.beginPath(); c.arc(x - r * 0.17, y - r * 0.62, r * 0.11, 0, TAU); c.arc(x + r * 0.17, y - r * 0.62, r * 0.11, 0, TAU); c.moveTo(x - r * 0.06, y - r * 0.62); c.lineTo(x + r * 0.06, y - r * 0.62); c.stroke(); eyes2(c, x, y - r * 0.62, r, null);
    c.fillStyle = '#7a3a2a'; c.fillRect(x - r * 1.1, y + r * 0.1, r * 0.6, r * 0.8); c.fillStyle = '#e8dcc0'; c.fillRect(x - r * 1.04, y + r * 0.16, r * 0.5, r * 0.68); if (e.dozing) { c.fillStyle = '#cfd0f0'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText('z', x + r * 0.7, y - r * 1.0 - Math.sin(t * 0.1) * 3); } };
  BD.unread = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#3a2a1a'; c.beginPath(); c.moveTo(x - r * 1.0, y + r); c.lineTo(x - r * 0.9, y - r * 0.9); c.lineTo(x + r * 0.9, y - r * 0.9); c.lineTo(x + r * 1.0, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = darker(col, 0.2); c.fillRect(x - r * 0.62, y - r * 0.7, r * 1.24, r * 1.5); c.strokeRect(x - r * 0.62, y - r * 0.7, r * 1.24, r * 1.5); c.fillStyle = '#e8d8a8'; c.fillRect(x - r * 0.52, y - r * 0.6, r * 1.04, r * 1.3);
    c.fillStyle = '#7a3a2a'; c.fillRect(x - r * 0.62, y - r * 0.7, r * 0.12, r * 1.5); c.strokeStyle = '#c8a030'; c.lineWidth = 4; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.2, 0, TAU); c.stroke(); c.fillStyle = '#c8a030'; c.fillRect(x - r * 0.05, y + r * 0.3, r * 0.1, r * 0.5);
    c.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.08 * Math.sin(t * 0.07)) + ')'; c.beginPath(); c.arc(x, y - r * 0.1, r * 0.8, 0, TAU); c.fill(); };
  relic('silentbookmark', { id: 'silentbookmark', name: 'Silent Bookmark', rarity: 'legendary', color: '#d8b878', mods: { atkSpd: 0.08, dashCd: -0.12, luck: 1 }, unique: true, unlock: 'boss:vellum', desc: 'You keep your place: +8% attack speed, a quicker dash, +1 luck. (Unlockable)' });
  relic('unreadvolume', { id: 'unreadvolume', name: 'The Unread Volume', rarity: 'legendary', color: '#c8a868', mods: { maxHp: 4, luck: 2 }, unique: true, unlock: 'boss:unread', desc: 'A heart container and two luck: a book whose every page is still to come. (Unlockable)' });

  // ==================================================================== 6. THE ASHEN CALDERA
  //  Lanes of the arena erupt after a warning and then keep burning for a few seconds.
  lib.eruption = function* (e, g, o) {
    o = Object.assign({ n: 3, w: 64, tele: 62, dmg: 1.3, life: 220, color: '#ff8a3a' }, o); const n = N(e, o.n), p = g.player;
    for (let k = 0; k < n; k++) {
      const horiz = k % 2 === 0 ? g.rng.chance(0.5) : g.rng.chance(0.5), cx = k === 0 ? p.x : g.rng.range(120, 840), cy = k === 0 ? p.y : g.rng.range(120, 456), rect = horiz ? [58, U.clamp(cy - o.w / 2, 58, 518 - o.w), 844, o.w] : [U.clamp(cx - o.w / 2, 58, 902 - o.w), 58, o.w, 460];
      g.zoneRect(e, rect[0], rect[1], rect[2], rect[3], g.tele(o.tele), e.shotDmg * o.dmg, { color: o.color, burst: true, onEnd: (gg, z) => { gg._zone({ kind: 'hazard', shape: 'rect', x: z.x, y: z.y, w: z.w, h: z.h, life: o.life, dmg: e.shotDmg * 0.4, tick: 26, tickT: 0, src: e, color: '#ff6a2a' }); } }); g.sfx('telegraph', { vol: 0.4 }); yield 16 / rateOf(e);
    }
    yield g.tele(o.tele) + 10;
  };
  addBoss({ id: 'calder', name: 'Calder', title: 'the Vent Keeper', color: '#ff8a3a', accent: '#ffe0b0', r: 46, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_cross', shape: 'ventkeeper', contact: 6,
    teaches: 'He opens the vents of the arena: a lane is marked for a second and erupts, and then it keeps burning. The first lane always crosses where you stand.', unlock: { boss: 'calder' },
    attacks: { slag: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 2.9, dmg: 0.9, color: '#ffb04a' }), erupt: L('eruption', {}), erupt2: L('eruption', { n: 5, tele: 54, life: 260 }), hammer: L('slamRing', { r: 92, tele: 38, rings: 2, speed: 3, color: '#ff8a3a' }), sparks: L('radial', { n: 16, reps: 3, gap: 14, speed: 2.3, rot: 0.17, color: '#ffb04a' }),
      bellows: L('coneSlash', { arc: 1.8, r: 150, tele: 44, dmg: 1.6, color: '#ff8a3a' }), crew: L('summon', { types: ['cindermoth', 'slagback'], n: 2, max: 5, hpMul: 0.8 }), rush: L('charge', { tele: 40, speed: 10, dmg: 1.5, stun: 30, color: '#ff6a2a' }) },
    phases: [
      { at: 1.0, name: 'Banked Fires', attacks: ['slag', 'erupt', 'hammer', 'crew'], idle: [38, 66] },
      { at: 0.62, name: 'Vents Open', attacks: ['slag', 'erupt', 'bellows', 'sparks', 'crew'], idle: [28, 52], enter: [L('eruption', { n: 2 })] },
      { at: 0.32, name: 'Eruption', attacks: ['erupt2', 'bellows', 'hammer', 'rush', 'crew'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Caldera Floor', attacks: ['erupt2', 'rush', 'sparks', 'bellows'], idle: [16, 32] },
    ] });
  addBoss(variant('pyrax', { id: 'basalt', name: 'Basalt', title: 'the Cooled Tyrant', color: '#8a5a4a', accent: '#ffe0b0', tint: '#ff9a5a', arena: 'arena_round',
    teaches: 'A tyrant of cooled stone: slow to heat and slower to fall, with a vent of its own — a lane erupts now and then, then keeps burning. Move before it opens.',
    swap: { erupt: L('eruption', { n: 3 }) }, add: { 1: ['erupt'], 2: ['erupt'] }, phaseNames: {} }));
  addBoss({ id: 'sleepingmountain', name: 'The Sleeping Mountain', title: 'Whose Dream Is Fire', color: '#e8703a', accent: '#ffe0b0', r: 108, hp: 1380, rScale: 1.0, hpScale: 1.03, arena: 'arena_round', shape: 'sleepingmountain', mega: true, contact: 6,
    teaches: 'Cap the four vents that spout beams, break the two crags that shoulder it, then the magma heart beneath. Lanes erupt and keep burning: read the marks.', unlock: { boss: 'sleepingmountain' },
    parts: [
      { id: 'v0', kind: 'vent', r: 26, hp: 0.07, group: 0, ang: -2.5 }, { id: 'v1', kind: 'vent', r: 26, hp: 0.07, group: 0, ang: -1.85 }, { id: 'v2', kind: 'vent', r: 26, hp: 0.07, group: 0, ang: -1.29 }, { id: 'v3', kind: 'vent', r: 26, hp: 0.07, group: 0, ang: -0.64 },
      { id: 'cragL', kind: 'crag', r: 46, hp: 0.12, group: 1, side: -1 }, { id: 'cragR', kind: 'crag', r: 46, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 58, hp: 0.48, group: 2 },
    ],
    attacks: { spouts: L('beams', { n: 4, len: 720, w: 24, warn: 54, life: 110, rot: 0.02, dmg: 0.85, color: '#ff8a3a', anchorParts: 'vent' }), erupt: L('eruption', { n: 4 }), erupt2: L('eruption', { n: 6, tele: 52, life: 260 }), fists: L('fists', {}), fists3: L('fists', { n: 3 }),
      ash: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.4, rot: 0.16, color: '#ffb04a' }), brood: L('summon', { types: ['slagback', 'cindermoth', 'rockhurler'], n: 3, max: 7, hpMul: 0.8, radius: 190 }), rain: L('rain', { n: 11, r: 46, interval: 7, warn: 50, aimed: 0.5, shrapnel: 4, color: '#ff8a3a' }),
      spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#e8703a' }), blast: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Four Vents', attacks: ['spouts', 'erupt', 'ash'], idle: [36, 62] },
      { name: 'The Shoulders', attacks: ['fists', 'erupt', 'brood', 'rain', 'ash'], idle: [30, 54] },
      { name: 'Magma Heart', attacks: ['fists3', 'erupt2', 'brood', 'rain', 'ash'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'Awakening', attacks: ['erupt2', 'spiral', 'brood', 'rain', 'ash'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE ERUPTION', attacks: ['blast', 'erupt2', 'spiral', 'rain', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('caldera', 'calder', 'basalt', 'sleepingmountain');
  part('vent', hung(1.08, 0.98, 4), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#d8a070' : '#5a3a30'); c.beginPath(); c.moveTo(p.x - p.r * 1.0, p.y + p.r * 0.9); c.lineTo(p.x - p.r * 0.5, p.y - p.r * 0.7); c.lineTo(p.x + p.r * 0.5, p.y - p.r * 0.7); c.lineTo(p.x + p.r * 1.0, p.y + p.r * 0.9); c.closePath(); c.fill(); c.stroke(); c.fillStyle = vul ? '#ffb04a' : '#8a3a1a'; c.beginPath(); c.ellipse(p.x, p.y - p.r * 0.7, p.r * 0.5, p.r * 0.2, 0, 0, TAU); c.fill(); if (vul) glow(c, p.x, p.y - p.r * 0.5, p.r * 1.6, '#ff8a3a', 0.35 + 0.1 * Math.sin(t * 0.3)); });
  part('crag', flank(1.18, 0.15, 6), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#a89080' : '#4a3a38'); c.beginPath(); c.moveTo(p.x - p.r * 0.9, p.y + p.r * 0.9); c.lineTo(p.x - p.r * 0.6, p.y - p.r * 0.2); c.lineTo(p.x - p.r * 0.1, p.y - p.r * 1.1); c.lineTo(p.x + p.r * 0.5, p.y - p.r * 0.4); c.lineTo(p.x + p.r * 0.9, p.y + p.r * 0.9); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = vul ? '#ff8a3a' : '#7a3a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - p.r * 0.2, p.y - p.r * 0.8); c.lineTo(p.x, p.y); c.lineTo(p.x - p.r * 0.3, p.y + p.r * 0.7); c.stroke(); if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ff8a3a', 0.2); });
  BD.ventkeeper = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.5); c.beginPath(); c.ellipse(x, y + r * 0.35, r * 1.0, r * 0.82, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = darker(col, 0.15); c.beginPath(); c.ellipse(x, y + r * 0.42, r * 0.66, r * 0.55, 0, 0, TAU); c.fill(); c.fillStyle = '#ff8a3a'; c.beginPath(); c.ellipse(x, y + r * 0.55, r * 0.34, r * 0.24 + Math.sin(t * 0.2) * 2, 0, 0, TAU); c.fill();
    face(c, x, y - r * 0.4, r, '#c8a080'); c.fillStyle = '#2a1a14'; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.46, Math.PI, 0); c.fill(); c.fillStyle = '#6a6a78'; c.fillRect(x - r * 0.5, y - r * 0.62, r, r * 0.18); eyes2(c, x, y - r * 0.38, r, '#ff8a3a');
    c.strokeStyle = '#5a5a68'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + r * 1.0, y + r * 0.9); c.lineTo(x + r * 1.2, y - r * 0.9); c.stroke(); c.fillStyle = '#ff8a3a'; c.beginPath(); c.arc(x + r * 1.2, y - r * 1.0, r * 0.2, 0, TAU); c.fill(); };
  BD.sleepingmountain = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#3a2a28'; c.beginPath(); c.moveTo(x - r * 1.05, y + r); c.lineTo(x - r * 0.55, y - r * 0.55); c.lineTo(x - r * 0.25, y - r * 0.95); c.lineTo(x + r * 0.25, y - r * 0.95); c.lineTo(x + r * 0.55, y - r * 0.55); c.lineTo(x + r * 1.05, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#5a4038'; c.beginPath(); c.moveTo(x - r * 0.7, y + r); c.lineTo(x - r * 0.35, y - r * 0.4); c.lineTo(x + r * 0.35, y - r * 0.4); c.lineTo(x + r * 0.7, y + r); c.closePath(); c.fill();
    c.fillStyle = '#ff8a3a'; c.beginPath(); c.ellipse(x, y - r * 0.92, r * 0.28, r * 0.1, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,138,58,' + (0.5 + 0.3 * Math.sin(t * 0.1)) + ')'; c.beginPath(); c.moveTo(x - r * 0.1, y - r * 0.9); c.lineTo(x - r * 0.18, y - r * 0.2); c.lineTo(x - r * 0.04, y + r * 0.3); c.lineTo(x + r * 0.04, y - r * 0.1); c.lineTo(x + r * 0.12, y - r * 0.9); c.closePath(); c.fill();
    c.fillStyle = '#1a0a08'; c.beginPath(); c.arc(x - r * 0.2, y - r * 0.1, r * 0.1, 0, TAU); c.arc(x + r * 0.2, y - r * 0.1, r * 0.1, 0, TAU); c.fill(); };
  relic('ventkey', { id: 'ventkey', name: 'Vent Key', rarity: 'legendary', color: '#ff8a3a', mods: { burn: 0.12, dmg: 0.06 }, unique: true, unlock: 'boss:calder', desc: 'Your blows ignite what they strike, and hit a little harder. (Unlockable)' });
  relic('mountainheart', { id: 'mountainheart', name: 'Mountain\'s Heart', rarity: 'legendary', color: '#e8703a', mods: { maxHp: 4, explode: 0.1, def: 1 }, unique: true, unlock: 'boss:sleepingmountain', desc: 'A heart container, +1 defense, and a chance that your blows burst like a vent. (Unlockable)' });

  // ==================================================================== 7. THE MIRAGE FLATS
  //  Sirocco is in three places: every pattern is fired from the king and from two reflections, a mirror across and a mirror down.
  lib.threefold = function* (e, g, o) {
    o = Object.assign({ n: 4, spread: 0.26, reps: 3, gap: 16, speed: 2.9, dmg: 0.85, color: '#f0e0b0', tele: 30 }, o); const dur = g.tele(o.tele), org = () => [[e.x, e.y], [C.ROOM_W - e.x, e.y], [e.x, C.ROOM_H - e.y]];
    for (const [ox, oy] of org()) { const a = Math.atan2(g.player.y - oy, g.player.x - ox); g.zoneLine(e, ox, oy, ox + Math.cos(a) * 220, oy + Math.sin(a) * 220, 10, dur, 0, { color: o.color, hurts: false }); } g.sfx('telegraph'); yield dur;
    for (let r = 0; r < o.reps; r++) { const n = N(e, o.n), s = o.speed * sc(e).spd; for (const [ox, oy] of org()) { const a = Math.atan2(g.player.y - oy, g.player.x - ox); for (let k = 0; k < n; k++) g.eShot(e, a + (k - (n - 1) / 2) * o.spread, s, { dmg: o.dmg, color: o.color, x: ox, y: oy }); } g.sfx('shoot'); yield o.gap / rateOf(e); }
  };
  addBoss({ id: 'sirocco', name: 'Sirocco', title: 'the Sand King', color: '#e8c888', accent: '#fff4d0', r: 46, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_open', shape: 'sandking', contact: 5,
    teaches: 'Every pattern comes from three places at once: the king and two reflections, one across and one below him. Each marks its line first; watch all three, not only him.', unlock: { boss: 'sirocco' },
    attacks: { grains: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, color: '#f0e0b0' }), three: L('threefold', {}), three2: L('threefold', { n: 5, reps: 4, gap: 12 }), dunes: L('bars', { n: 3, thick: 52, gapW: 150, warn: 64, color: '#e8c888' }), storm: L('rain', { n: 10, r: 44, interval: 8, warn: 52, aimed: 0.5, color: '#e8c888' }),
      sinks: L('wells', { n: 3, r: 62, life: 420, warn: 46, dmg: 0.55, color: '#c8a868' }), wurms: L('summon', { types: ['dunewurm', 'scabroller'], n: 2, max: 4, hpMul: 0.8 }), shift: L('blink', { where: 'random', ring: 8, color: '#f0e0b0' }), crown: L('slamRing', { r: 90, tele: 38, rings: 2, speed: 3, color: '#e8c888' }) },
    phases: [
      { at: 1.0, name: 'Heat Haze', attacks: ['grains', 'three', 'dunes', 'wurms'], idle: [38, 66] },
      { at: 0.62, name: 'Three Kings', attacks: ['grains', 'three', 'storm', 'sinks', 'shift'], idle: [28, 52], enter: [L('threefold', { reps: 2 })] },
      { at: 0.32, name: 'Sandstorm', attacks: ['three2', 'storm', 'dunes', 'crown', 'wurms'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Last Mirage', attacks: ['three2', 'storm', 'shift', 'crown'], idle: [16, 32] },
    ] });
  addBoss(variant('vael', { id: 'fata', name: 'Fata', title: 'the Mirage Knight', color: '#d8b878', accent: '#fff4d0', tint: '#f0e0b0', arena: 'arena_pillars',
    teaches: 'A knight of heat and shimmer: his blades come from where he stands and from two places he does not. Mark all three lines before you move.',
    swap: { three: L('threefold', { n: 3, reps: 3 }), phantoms: L('summon', { types: ['dunewurm', 'scabroller'], n: 2, max: 4, hpMul: 0.8 }) }, add: { 1: ['three'], 2: ['three'] }, phaseNames: { 'The Duelist': 'The Shimmer', Fury: 'Sun Strike' } }));
  addBoss({ id: 'endlessdune', name: 'The Endless Dune', title: 'Which Is Never Crossed', color: '#d8b070', accent: '#fff4d0', r: 104, hp: 1330, rScale: 1.0, hpScale: 1.02, arena: 'arena_open', shape: 'endlessdune', mega: true, contact: 6,
    teaches: 'Level the three crests that move across it, shatter the two idols half-buried in the sand, then dig out the one who sleeps beneath. All of it fired from three places.', unlock: { boss: 'endlessdune' },
    parts: [
      { id: 'c0', kind: 'crest', r: 30, hp: 0.08, group: 0, ang: -2.4 }, { id: 'c1', kind: 'crest', r: 32, hp: 0.08, group: 0, ang: -1.57 }, { id: 'c2', kind: 'crest', r: 30, hp: 0.08, group: 0, ang: -0.74 },
      { id: 'idolL', kind: 'idol', r: 42, hp: 0.12, group: 1, side: -1 }, { id: 'idolR', kind: 'idol', r: 42, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 56, hp: 0.52, group: 2 },
    ],
    attacks: { crests: L('beams', { n: 3, len: 720, w: 24, warn: 54, life: 110, rot: 0.02, dmg: 0.85, color: '#e8c888', anchorParts: 'crest' }), three: L('threefold', { n: 5 }), three2: L('threefold', { n: 6, reps: 4, gap: 12 }), storm: L('rain', { n: 11, r: 46, interval: 7, warn: 50, aimed: 0.5, color: '#e8c888' }),
      sinks: L('wells', { n: 4, r: 62, life: 420, warn: 46, dmg: 0.55, color: '#c8a868' }), nest: L('summon', { types: ['dunewurm', 'scabroller', 'miragewisp'], n: 3, max: 7, hpMul: 0.8, radius: 190 }), fists: L('fists', {}), fists3: L('fists', { n: 3 }),
      dunes: L('bars', { n: 3, thick: 54, gapW: 150, warn: 62, color: '#e8c888' }), spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#d8b070' }), simoom: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Three Crests', attacks: ['crests', 'three', 'dunes'], idle: [36, 62] },
      { name: 'Buried Idols', attacks: ['fists', 'three', 'sinks', 'nest', 'storm'], idle: [30, 54] },
      { name: 'The Sleeper Wakes', attacks: ['fists3', 'three2', 'storm', 'nest', 'dunes'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'Sandstorm', attacks: ['three2', 'spiral', 'nest', 'storm', 'sinks'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE SIMOOM', attacks: ['simoom', 'three2', 'spiral', 'storm', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('mirage', 'sirocco', 'fata', 'endlessdune');
  part('crest', hung(1.1, 0.98, 6), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#f0d8a0' : '#9a8050'); c.beginPath(); c.moveTo(p.x - p.r * 1.2, p.y + p.r * 0.7); c.quadraticCurveTo(p.x - p.r * 0.3, p.y - p.r * 1.2, p.x + p.r * 0.2, p.y - p.r * 0.5); c.quadraticCurveTo(p.x + p.r * 0.9, p.y, p.x + p.r * 1.2, p.y + p.r * 0.7); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - p.r * 0.6, p.y + p.r * 0.1); c.quadraticCurveTo(p.x, p.y - p.r * 0.4, p.x + p.r * 0.5, p.y + p.r * 0.2); c.stroke(); if (vul) glow(c, p.x, p.y, p.r * 1.4, '#ffe0a0', 0.22); });
  part('idol', flank(1.18, 0.15, 5), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#d8c090' : '#7a6a48'); c.fillRect(p.x - p.r * 0.55, p.y - p.r * 0.9, p.r * 1.1, p.r * 1.8); c.strokeRect(p.x - p.r * 0.55, p.y - p.r * 0.9, p.r * 1.1, p.r * 1.8); c.fillStyle = '#10101c'; c.fillRect(p.x - p.r * 0.35, p.y - p.r * 0.5, p.r * 0.25, p.r * 0.14); c.fillRect(p.x + p.r * 0.1, p.y - p.r * 0.5, p.r * 0.25, p.r * 0.14); c.fillRect(p.x - p.r * 0.25, p.y + p.r * 0.05, p.r * 0.5, p.r * 0.12); c.fillStyle = '#e8c888'; c.fillRect(p.x - p.r * 0.7, p.y + p.r * 0.7, p.r * 1.4, p.r * 0.3); if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffe0a0', 0.22); });
  BD.sandking = (c, e, x, y, r, col, dk, t) => {
    bodyOf(c, x, y, r, col, dk, 1.0, 0); c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.95, 0, TAU); c.fill(); face(c, x, y - r * 0.55, r, '#d8b890'); c.fillStyle = '#e8e0d0'; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.3); c.lineTo(x + r * 0.5, y - r * 0.3); c.lineTo(x + r * 0.3, y - r * 0.05); c.lineTo(x - r * 0.3, y - r * 0.05); c.closePath(); c.fill(); eyes2(c, x, y - r * 0.6, r, '#c89030');
    c.fillStyle = '#c89030'; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.85); for (let k = 0; k < 5; k++) { c.lineTo(x - r * 0.5 + k * r * 0.25 + r * 0.125, y - r * (1.2 + (k % 2 ? 0.1 : 0))); c.lineTo(x - r * 0.5 + (k + 1) * r * 0.25, y - r * 0.85); } c.closePath(); c.fill(); c.stroke(); };
  BD.endlessdune = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#7a6038'; c.beginPath(); c.moveTo(x - r * 1.1, y + r); c.quadraticCurveTo(x - r * 0.6, y - r * 0.8, x, y - r * 0.5); c.quadraticCurveTo(x + r * 0.6, y - r * 0.8, x + r * 1.1, y + r); c.closePath(); c.fill(); c.stroke(); c.fillStyle = darker(col, 0.2); c.beginPath(); c.moveTo(x - r * 0.8, y + r); c.quadraticCurveTo(x - r * 0.3, y - r * 0.1, x, y); c.quadraticCurveTo(x + r * 0.3, y - r * 0.1, x + r * 0.8, y + r); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x - r * 0.9, y + r * (0.2 + k * 0.2)); c.quadraticCurveTo(x, y + r * (0.05 + k * 0.2 + Math.sin(t * 0.05 + k) * 0.04), x + r * 0.9, y + r * (0.2 + k * 0.2)); c.stroke(); }
    c.fillStyle = '#10101c'; c.beginPath(); c.arc(x - r * 0.2, y + r * 0.1, r * 0.1, 0, TAU); c.arc(x + r * 0.2, y + r * 0.1, r * 0.1, 0, TAU); c.fill(); c.fillStyle = '#e8c888'; c.beginPath(); c.arc(x - r * 0.2, y + r * 0.1, r * 0.04, 0, TAU); c.arc(x + r * 0.2, y + r * 0.1, r * 0.04, 0, TAU); c.fill(); };
  relic('sandkingsignet', { id: 'sandkingsignet', name: "Sand King's Signet", rarity: 'legendary', color: '#e8c888', mods: { speed: 0.08, dashDist: 0.15, luck: 1 }, unique: true, unlock: 'boss:sirocco', desc: 'Light on the sand: +8% speed, a longer dash, +1 luck. (Unlockable)' });
  relic('duneglass', { id: 'duneglass', name: 'Dune Glass', rarity: 'legendary', color: '#d8b070', mods: { luck: 2, regen: 1, gold: 0.15 }, unique: true, unlock: 'boss:endlessdune', desc: 'Sand fused to glass at the heart of the dune: two luck, a slow mending, +15% gold. (Unlockable)' });

  // ==================================================================== 8. THE ABYSSAL BAZAAR
  //  The bids close in: three rings, one after the other, and each one is marked for a shorter time than the last.
  lib.auction = function* (e, g, o) {
    o = Object.assign({ n: 3, r: 58, tele: 72, step: 14, dmg: 1.2, color: '#ffd070' }, o); const n = N(e, o.n), words = ['BID!', 'GOING...', 'SOLD!'];
    for (let k = 0; k < n; k++) { const p = g.player, c = clampArena(p.x + (k ? g.rng.range(-80, 80) : 0), p.y + (k ? g.rng.range(-80, 80) : 0), o.r * 0.5), tele = Math.max(44, o.tele - k * o.step); g.addText(c.x, c.y - o.r - 8, words[Math.min(k, 2)], '#ffd24a', 14); g.zoneCircle(e, c.x, c.y, o.r, g.tele(tele), e.shotDmg * o.dmg, { color: o.color, burst: true }); g.sfx('telegraph', { vol: 0.35 }); yield 24 / rateOf(e); }
    yield g.tele(o.tele) + 6;
  };
  addBoss({ id: 'mercatus', name: 'Mercatus', title: 'the Haggler', color: '#ffb86a', accent: '#ffe8c0', r: 46, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_throne', shape: 'haggler', contact: 5,
    teaches: 'He auctions you: rings are marked one after another, and each is marked for a shorter time than the one before. Keep stepping; do not wait for the last bid.', unlock: { boss: 'mercatus' },
    attacks: { coins: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, wave: 0.4, color: '#ffd070' }), auction: L('auction', {}), auction2: L('auction', { n: 5, tele: 66, step: 8 }), ledger: L('bars', { n: 3, thick: 52, gapW: 150, warn: 64, color: '#ffb86a' }), fee: L('slamRing', { r: 90, tele: 38, rings: 2, speed: 3, color: '#ffb86a' }),
      hired: L('summon', { types: ['cutpurse', 'bouncer'], n: 2, max: 4, hpMul: 0.8 }), shower: L('rain', { n: 9, r: 44, interval: 8, warn: 52, aimed: 0.5, shrapnel: 4, color: '#ffd070' }), rush: L('charge', { tele: 40, speed: 10, dmg: 1.5, stun: 30, color: '#ffb86a' }) },
    phases: [
      { at: 1.0, name: 'Opening Offer', attacks: ['coins', 'auction', 'fee', 'hired'], idle: [38, 66] },
      { at: 0.62, name: 'Going Once', attacks: ['coins', 'auction', 'ledger', 'shower', 'hired'], idle: [28, 52], enter: [L('auction', { n: 2 })] },
      { at: 0.32, name: 'Going Twice', attacks: ['auction2', 'ledger', 'fee', 'rush', 'hired'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'SOLD', attacks: ['auction2', 'rush', 'shower', 'fee'], idle: [16, 32] },
    ] });
  addBoss(variant('aegis', { id: 'tarif', name: 'Tarif', title: 'the Customs Sentinel', color: '#d8964a', accent: '#ffe8c0', tint: '#ffb86a', arena: 'arena_cross',
    teaches: 'Nothing passes him unassessed: his shards ring true, and every so often he calls bids on you, each one closing faster. Break the shards, mind the rings.',
    swap: { auction: L('auction', { n: 3 }) }, add: { 1: ['auction'], 2: ['auction'] }, phaseNames: {} }));
  addBoss({ id: 'vaultbelow', name: 'The Vault Below', title: 'Where the Bazaar Banks', color: '#c8964a', accent: '#ffe8c0', r: 108, hp: 1380, rScale: 1.0, hpScale: 1.03, arena: 'arena_throne', shape: 'vaultbelow', mega: true, contact: 6,
    teaches: 'Break the four lockboxes that guard the vault door, then the two ledgers that keep its accounts, then the strongbox itself. Every bid closes faster than the last.', unlock: { boss: 'vaultbelow' },
    parts: [
      { id: 'lb0', kind: 'lockbox', r: 28, hp: 0.07, group: 0, ang: -2.5 }, { id: 'lb1', kind: 'lockbox', r: 28, hp: 0.07, group: 0, ang: -1.85 }, { id: 'lb2', kind: 'lockbox', r: 28, hp: 0.07, group: 0, ang: -1.29 }, { id: 'lb3', kind: 'lockbox', r: 28, hp: 0.07, group: 0, ang: -0.64 },
      { id: 'ledL', kind: 'ledger', r: 44, hp: 0.12, group: 1, side: -1 }, { id: 'ledR', kind: 'ledger', r: 44, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 58, hp: 0.48, group: 2 },
    ],
    attacks: { audit: L('beams', { n: 4, len: 720, w: 24, warn: 54, life: 110, rot: 0.02, dmg: 0.85, color: '#ffd070', anchorParts: 'lockbox' }), auction: L('auction', { n: 4 }), auction2: L('auction', { n: 6, tele: 62, step: 8 }), fists: L('fists', {}), fists3: L('fists', { n: 3 }),
      staff: L('summon', { types: ['cutpurse', 'bouncer', 'appraiser'], n: 3, max: 7, hpMul: 0.8, radius: 190 }), coins: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.4, rot: 0.16, color: '#ffd070' }), ledger: L('bars', { n: 3, thick: 54, gapW: 150, warn: 62, color: '#ffb86a' }),
      shower: L('rain', { n: 11, r: 46, interval: 7, warn: 50, aimed: 0.5, shrapnel: 4, color: '#ffd070' }), spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#c8964a' }), foreclose: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Four Locks', attacks: ['audit', 'auction', 'coins'], idle: [36, 62] },
      { name: 'The Ledgers', attacks: ['fists', 'auction', 'staff', 'ledger', 'shower'], idle: [30, 54] },
      { name: 'The Strongbox', attacks: ['fists3', 'auction2', 'staff', 'coins', 'ledger'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'Compound Interest', attacks: ['auction2', 'spiral', 'staff', 'shower', 'coins'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'FORECLOSURE', attacks: ['foreclose', 'auction2', 'spiral', 'shower', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('bazaar', 'mercatus', 'tarif', 'vaultbelow');
  part('lockbox', hung(1.08, 0.98, 4), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#e8c880' : '#7a6a40'); c.fillRect(p.x - p.r * 0.85, p.y - p.r * 0.6, p.r * 1.7, p.r * 1.3); c.strokeRect(p.x - p.r * 0.85, p.y - p.r * 0.6, p.r * 1.7, p.r * 1.3); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(p.x - p.r * 0.85, p.y - p.r * 0.1, p.r * 1.7, p.r * 0.14); c.fillStyle = '#1a1a22'; c.beginPath(); c.arc(p.x, p.y + p.r * 0.15, p.r * 0.2, 0, TAU); c.fill(); c.fillRect(p.x - p.r * 0.07, p.y + p.r * 0.15, p.r * 0.14, p.r * 0.35); c.strokeStyle = '#c8c8d4'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y - p.r * 0.6, p.r * 0.4, Math.PI, 0); c.stroke(); if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffd070', 0.25); });
  part('ledger', flank(1.18, 0.12, 6), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#e8c090' : '#6a4a30'); c.fillRect(p.x - p.r * 0.9, p.y - p.r * 0.9, p.r * 1.8, p.r * 1.8); c.strokeRect(p.x - p.r * 0.9, p.y - p.r * 0.9, p.r * 1.8, p.r * 1.8); c.fillStyle = '#f0e4c8'; c.fillRect(p.x - p.r * 0.75, p.y - p.r * 0.75, p.r * 1.5, p.r * 1.5); c.strokeStyle = 'rgba(40,30,20,0.5)'; c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(p.x - p.r * 0.6, p.y - p.r * 0.55 + k * p.r * 0.22); c.lineTo(p.x + p.r * 0.2, p.y - p.r * 0.55 + k * p.r * 0.22); c.stroke(); c.fillStyle = '#7a3a2a'; c.fillRect(p.x + p.r * 0.32, p.y - p.r * 0.6 + k * p.r * 0.22, p.r * 0.3, p.r * 0.1); } if (vul) glow(c, p.x, p.y, p.r * 1.3, '#ffd070', 0.2); });
  BD.haggler = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.45); c.beginPath(); c.ellipse(x, y + r * 0.35, r * 1.02, r * 0.85, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = darker(col, 0.1); c.beginPath(); c.ellipse(x, y + r * 0.42, r * 0.7, r * 0.6, 0, 0, TAU); c.fill(); c.fillStyle = '#ffd070'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.arc(x + k * r * 0.3, y + r * 0.5, r * 0.1, 0, TAU); c.fill(); }
    face(c, x, y - r * 0.4, r, '#e8c8a0'); c.fillStyle = '#6a3a1a'; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.7); c.lineTo(x + r * 0.5, y - r * 0.7); c.lineTo(x + r * 0.34, y - r * 1.15); c.lineTo(x - r * 0.34, y - r * 1.15); c.closePath(); c.fill(); c.stroke(); eyes2(c, x, y - r * 0.42, r, '#ffb86a'); c.strokeStyle = '#3a2a10'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - r * 0.3, y - r * 0.2); c.quadraticCurveTo(x, y - r * 0.05, x + r * 0.3, y - r * 0.2); c.stroke();
    c.save(); c.strokeStyle = '#c8c8d4'; c.lineWidth = 3; c.lineCap = 'round'; const tilt = Math.sin(t * 0.05) * 0.2; c.translate(x + r * 1.15, y - r * 0.1); c.rotate(tilt); c.beginPath(); c.moveTo(-r * 0.4, 0); c.lineTo(r * 0.4, 0); c.moveTo(0, 0); c.lineTo(0, r * 0.5); c.stroke(); for (const sg of [-1, 1]) { c.beginPath(); c.arc(sg * r * 0.4, r * 0.18, r * 0.16, 0, Math.PI); c.stroke(); } c.restore(); };
  BD.vaultbelow = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#2a2a34'; c.beginPath(); c.moveTo(x - r * 1.0, y + r); c.lineTo(x - r * 1.0, y - r * 0.6); c.lineTo(x - r * 0.6, y - r * 1.0); c.lineTo(x + r * 0.6, y - r * 1.0); c.lineTo(x + r * 1.0, y - r * 0.6); c.lineTo(x + r * 1.0, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = darker(col, 0.3); c.beginPath(); c.arc(x, y, r * 0.78, 0, TAU); c.fill(); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.64, 0, TAU); c.fill(); c.strokeStyle = 'rgba(60,40,10,0.6)'; c.lineWidth = 5; c.save(); c.translate(x, y); c.rotate(-t * 0.006); for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(k * TAU / 5) * r * 0.55, Math.sin(k * TAU / 5) * r * 0.55); c.stroke(); } c.restore(); c.fillStyle = '#ffd070'; c.beginPath(); c.arc(x, y, r * 0.14, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#10101c'; c.font = 'bold ' + Math.round(r * 0.3) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', x, y - r * 0.82); };
  relic('hagglersscales', { id: 'hagglersscales', name: "Haggler's Scales", rarity: 'legendary', color: '#ffb86a', mods: { price: -0.15, gold: 0.2, luck: 1 }, unique: true, unlock: 'boss:mercatus', desc: 'Shops charge 15% less, gold is worth 20% more, and +1 luck. (Unlockable)' });
  relic('strongboxkey', { id: 'strongboxkey', name: 'Strongbox Key', rarity: 'legendary', color: '#c8964a', mods: { luck: 1, gold: 0.15, maxHp: 4 }, unique: true, unlock: 'boss:vaultbelow', on: { floorStart(g) { g.giveKey('small', true); } }, desc: 'A small key on every floor, a heart container, +15% gold, +1 luck. (Unlockable)' });

  ED.v27b = {};
})(typeof globalThis !== 'undefined' ? globalThis : this);

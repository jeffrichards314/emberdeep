/* EMBERDEEP — pack_v27c.js : v27 "SOVEREIGNS II", part three — the lands of v26 (the Gambit Hall, the Counterweight Keep, the Hollow Rite, the Eclipse Orchard).
 *    GAMBIT HALL       The Black Rook (the board bites one colour at a time) · Alfil, the White Bishop · THE PALE QUEEN (pawns, the board itself, the queen)
 *    COUNTERWEIGHT     The Keeper (counterweights swing through marked sectors) · Plumb, the Iron Sentinel · THE GREAT BALANCE (weights, two pans, the beam)
 *    HOLLOW RITE       The Confessor (a rite he must be staggered out of) · Brother Thurible, the Smoke Warden · THE BLACK ALTAR (candles, hands, the altar)
 *    ECLIPSE ORCHARD   The Gardener (fruit that heals you — or rots into a bomb) · Ser Scion, the Grafted Knight · THE ECLIPSE TREE (boughs, hanging fruit, the heartwood)
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, I = ED.items, P = ED.packs, W = ED.worlds;
  const X = ED.attacks, lib = X.lib, N = X.N, ang = X.ang, clampArena = X.clampArena, sc = X.sc;
  const TAU = U.TAU, V = 'v27', L = (name, o) => [name, o];
  const darker = (c, k) => ED.render.darker(c, k);
  const glow = (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); };
  const V27 = ED.v27, V20 = ED.v20, BD = ED.bossDraw, K = ED.landkit, { addBoss, variant, land, relic, groupPhase } = V27, { bodyOf, face, eyes2, rateOf } = V27.helpers;
  const part = V20.part, orbit = V20.orbit, flank = V20.flank, hung = V20.hung;

  // ==================================================================== 9. THE GAMBIT HALL
  //  The board bites one colour at a time: a colour glows for a couple of seconds, then its squares strike (one step to the other colour is always enough).
  const onSq = (x, y) => ((Math.floor(x / 32) + Math.floor(y / 32)) & 1);
  lib.checker = function* (e, g, o) {
    o = Object.assign({ warn: 112, bite: 26, dmg: 1.4, rounds: 1, color: '#e8d8a0' }, o);
    for (let r = 0; r < o.rounds; r++) {
      const dur = g.tele(o.warn), B = e.board = { lit: g.rng.chance(0.5) ? 0 : 1, phase: 'glow', t0: g.frame, dur }; g.toast('THE BOARD TURNS', o.color, 60); g.sfx('telegraph'); yield dur;
      B.phase = 'bite'; g.shake(4); g.sfx('thud', { vol: 0.5 }); let done = false;
      for (let i = 0; i < o.bite; i++) { const p = g.player; if (!done && !p.dead && onSq(p.x, p.y) === B.lit && g.hurtPlayer(e.shotDmg * o.dmg, p.x, p.y, { src: e, zone: true, noKnock: true })) done = true; yield 1; }
      e.board = null; yield 18;
    }
  };
  ED.hook('under', V, (g, c, t) => {
    for (const e of g.enemies) {
      if (!e.boss || e.dead || !e.board) continue; const B = e.board, bite = B.phase === 'bite', k = bite ? 1 : Math.min(1, (g.frame - B.t0) / B.dur), room = g.room; c.save();
      for (let ty = 1; ty < C.ROWS - 1; ty++) for (let tx = 1; tx < C.COLS - 1; tx++) {
        if (((tx + ty) & 1) !== B.lit) continue; const tl = room.tiles[ty * C.COLS + tx]; if (tl === T.WALL || tl === T.ROCK || tl === T.PIT || tl === T.DOOR) continue; const x = tx * 32, y = ty * 32;
        if (bite) { c.fillStyle = 'rgba(255,70,60,' + (0.4 + 0.3 * Math.sin(t * 0.8)) + ')'; c.fillRect(x, y, 32, 32); } else { c.fillStyle = 'rgba(255,190,70,' + (0.10 + 0.24 * k) + ')'; c.fillRect(x, y, 32, 32); c.strokeStyle = 'rgba(255,214,120,' + (0.25 + 0.45 * k) + ')'; c.lineWidth = 1.5; c.strokeRect(x + 2.5, y + 2.5, 27, 27); }
      }
      c.restore();
    }
  });
  addBoss({ id: 'blackrook', name: 'The Black Rook', title: 'Who Holds the File', color: '#8a7ab0', accent: '#f0e8c0', r: 48, hp: 520, rScale: 1.0, hpScale: 1.0, arena: 'arena_grid', shape: 'blackrook', contact: 6,
    teaches: 'The board turns under you: one colour glows for two seconds and then bites — one step to the other colour is always enough. He charges along rows and files he has marked.', unlock: { boss: 'blackrook' },
    attacks: { check: L('checker', {}), check2: L('checker', { rounds: 2, warn: 100 }), rank: L('bars', { n: 3, thick: 52, gapW: 150, warn: 64, color: '#8a7ab0' }), file: L('bars', { n: 3, thick: 52, gapW: 150, warn: 64, vertical: true, color: '#8a7ab0' }), castle: L('charge', { tele: 42, speed: 10, dmg: 1.6, stun: 30, color: '#8a7ab0' }),
      pawns: L('summon', { types: ['pawn', 'knight'], n: 2, max: 4, hpMul: 0.8 }), siege: L('slamRing', { r: 92, tele: 38, rings: 2, speed: 3, color: '#e8d8a0' }), volley: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 2.9, dmg: 0.9, color: '#e8d8a0' }) },
    phases: [
      { at: 1.0, name: 'Opening', attacks: ['volley', 'check', 'rank', 'pawns'], idle: [38, 66] },
      { at: 0.62, name: 'Middlegame', attacks: ['check', 'rank', 'file', 'castle', 'pawns'], idle: [28, 52], enter: [L('checker', {})] },
      { at: 0.32, name: 'Endgame', attacks: ['check2', 'castle', 'file', 'siege', 'pawns'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Zugzwang', attacks: ['check2', 'castle', 'rank', 'siege'], idle: [16, 32] },
    ] });
  addBoss(variant('mycelia', { id: 'alfil', name: 'Alfil', title: 'the White Bishop', color: '#d8d0e8', accent: '#f0e8c0', tint: '#e8e0f8', arena: 'arena_grid',
    teaches: 'He moves on the diagonals and the board moves with him: a colour of the floor glows, then bites. Keep to the other colour and he is only a tired old man in a tall hat.',
    swap: { check: L('checker', {}) }, add: { 1: ['check'], 2: ['check'] }, phaseNames: {} }));
  addBoss({ id: 'palequeen', name: 'The Pale Queen', title: 'Who Moves As She Pleases', color: '#e8e0f0', accent: '#fff4d0', r: 106, hp: 1380, rScale: 1.0, hpScale: 1.03, arena: 'arena_grid', shape: 'palequeen', mega: true, contact: 6,
    teaches: 'Take her four pawns, then the board itself — the squares she bites with — then the queen. The colours of the floor turn, glow and bite: stay on the quiet one.', unlock: { boss: 'palequeen' },
    parts: [
      { id: 'pw0', kind: 'pawnpart', r: 24, hp: 0.05, group: 0, ang: 0.4 }, { id: 'pw1', kind: 'pawnpart', r: 24, hp: 0.05, group: 0, ang: 1.97 }, { id: 'pw2', kind: 'pawnpart', r: 24, hp: 0.05, group: 0, ang: 3.54 }, { id: 'pw3', kind: 'pawnpart', r: 24, hp: 0.05, group: 0, ang: 5.11 },
      { id: 'board', kind: 'boardsq', r: 60, hp: 0.2, group: 1 },
      { id: 'core', kind: 'core', r: 56, hp: 0.6, group: 2 },
    ],
    attacks: { lines: L('beams', { n: 4, len: 700, w: 22, warn: 56, life: 120, rot: 0.016, dmg: 0.85, color: '#e8d8a0', anchorParts: 'pawnpart' }), check: L('checker', {}), check2: L('checker', { rounds: 2, warn: 96 }), rank: L('bars', { n: 3, thick: 54, gapW: 150, warn: 62, color: '#e8e0f0' }), file: L('bars', { n: 3, thick: 54, gapW: 150, warn: 62, vertical: true, color: '#e8e0f0' }),
      court: L('summon', { types: ['pawn', 'knight', 'bishop', 'rook'], n: 3, max: 7, hpMul: 0.8, radius: 190 }), volley: L('fan', { n: 9, spread: 0.18, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, color: '#e8d8a0' }), siege: L('slamRing', { r: 96, tele: 38, rings: 2, speed: 3, color: '#e8e0f0' }),
      spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#e8d8a0' }), mate: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }), castle: L('charge', { tele: 40, speed: 10, dmg: 1.6, stun: 30, color: '#e8e0f0' }) },
    phases: [
      { name: 'Four Pawns', attacks: ['lines', 'check', 'rank'], idle: [36, 62] },
      { name: 'The Board', attacks: ['check', 'file', 'court', 'volley', 'siege'], idle: [30, 54] },
      { name: 'The Queen Moves', attacks: ['check2', 'castle', 'court', 'rank', 'volley'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'Overextended', attacks: ['check2', 'spiral', 'court', 'file', 'siege'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'CHECKMATE', attacks: ['mate', 'check2', 'spiral', 'castle', 'rank'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('gambit', 'blackrook', 'alfil', 'palequeen');
  part('pawnpart', orbit(0.012, 1.3, 0.95), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#f0e8f8' : '#8a82a0'); c.beginPath(); c.arc(p.x, p.y - p.r * 0.45, p.r * 0.5, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.moveTo(p.x - p.r * 0.35, p.y); c.lineTo(p.x - p.r * 0.7, p.y + p.r * 0.8); c.lineTo(p.x + p.r * 0.7, p.y + p.r * 0.8); c.lineTo(p.x + p.r * 0.35, p.y); c.closePath(); c.fill(); c.stroke(); c.fillRect(p.x - p.r * 0.8, p.y + p.r * 0.8, p.r * 1.6, p.r * 0.25); if (vul) glow(c, p.x, p.y, p.r * 1.4, '#e8d8a0', 0.22); });
  part('boardsq', () => [480, 412], (c, e, p, vul, fl, t) => {
    c.save(); c.translate(p.x, p.y); c.fillStyle = fl ? '#fff' : (vul ? '#e8e0f0' : '#6a6480'); c.fillRect(-p.r * 1.7, -p.r * 0.7, p.r * 3.4, p.r * 1.4); c.strokeRect(-p.r * 1.7, -p.r * 0.7, p.r * 3.4, p.r * 1.4);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) if ((i + j) & 1) { c.fillStyle = vul ? '#2a2640' : '#3a3650'; c.fillRect(-p.r * 1.7 + i * p.r * 0.567, -p.r * 0.7 + j * p.r * 0.467, p.r * 0.567, p.r * 0.467); } c.restore(); if (vul) glow(c, p.x, p.y, p.r * 2, '#e8d8a0', 0.18); });
  BD.blackrook = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.5); c.fillRect(x - r * 0.9, y + r * 0.7, r * 1.8, r * 0.3); c.strokeRect(x - r * 0.9, y + r * 0.7, r * 1.8, r * 0.3);
    c.fillStyle = darker(col, 0.2); c.beginPath(); c.moveTo(x - r * 0.75, y + r * 0.7); c.lineTo(x - r * 0.55, y - r * 0.6); c.lineTo(x + r * 0.55, y - r * 0.6); c.lineTo(x + r * 0.75, y + r * 0.7); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col; for (const k of [-1, 0, 1]) { c.fillRect(x + k * r * 0.44 - r * 0.15, y - r * 1.0, r * 0.3, r * 0.45); c.strokeRect(x + k * r * 0.44 - r * 0.15, y - r * 1.0, r * 0.3, r * 0.45); } c.fillRect(x - r * 0.7, y - r * 0.62, r * 1.4, r * 0.16);
    c.fillStyle = '#10101c'; c.fillRect(x - r * 0.4, y - r * 0.28, r * 0.8, r * 0.14); c.fillStyle = '#e8d8a0'; c.fillRect(x - r * 0.3, y - r * 0.26, r * 0.16, r * 0.1); c.fillRect(x + r * 0.14, y - r * 0.26, r * 0.16, r * 0.1); };
  BD.palequeen = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.5); c.beginPath(); c.moveTo(x - r * 1.0, y + r); c.lineTo(x - r * 0.4, y - r * 0.4); c.lineTo(x + r * 0.4, y - r * 0.4); c.lineTo(x + r * 1.0, y + r); c.closePath(); c.fill(); c.stroke(); c.fillStyle = darker(col, 0.15); c.beginPath(); c.moveTo(x - r * 0.6, y + r); c.lineTo(x - r * 0.28, y - r * 0.3); c.lineTo(x + r * 0.28, y - r * 0.3); c.lineTo(x + r * 0.6, y + r); c.closePath(); c.fill();
    face(c, x, y - r * 0.6, r, '#f0e4e0'); eyes2(c, x, y - r * 0.62, r, '#8a7ab0'); c.fillStyle = '#e8d8a0'; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.9); for (let k = 0; k < 5; k++) { c.lineTo(x - r * 0.5 + k * r * 0.25 + r * 0.125, y - r * (1.3 + (k % 2 ? 0.05 : 0.18))); c.lineTo(x - r * 0.5 + (k + 1) * r * 0.25, y - r * 0.9); } c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#8a7ab0'; c.beginPath(); c.arc(x, y - r * 1.36, r * 0.09, 0, TAU); c.fill(); };
  relic('zugzwang', { id: 'zugzwang', name: 'Zugzwang Pin', rarity: 'legendary', color: '#8a7ab0', mods: { dashDist: 0.15, dashCd: -0.12, speed: 0.04 }, unique: true, unlock: 'boss:blackrook', desc: 'Every move is yours: a longer, quicker dash and a little more speed. (Unlockable)' });
  relic('palecrown', { id: 'palecrown', name: 'Pale Crown', rarity: 'legendary', color: '#e8e0f0', mods: { maxHp: 4, def: 1, dmg: 0.05 }, unique: true, unlock: 'boss:palequeen', desc: 'A heart container, +1 defense and +5% damage: she moves as she pleases, and now so do you. (Unlockable)' });

  // ==================================================================== 10. THE COUNTERWEIGHT KEEP
  //  Weights swing from the keeper: the whole sector each one will sweep is marked first, then the weights swing in it.
  lib.pendulum = function* (e, g, o) {
    o = Object.assign({ n: 2, len: 520, w: 28, tele: 60, life: 210, swing: 0.55, speed: 0.05, dmg: 1.0, color: '#b8bcc8' }, o); const n = N(e, o.n), base = ang(e, g), dur = g.tele(o.tele), cx = e.x, cy = e.y;
    for (let k = 0; k < n; k++) g.zoneCone(e, cx, cy, base + k * TAU / n, o.swing * 2 + 0.16, o.len, dur, 0, { color: o.color, hurts: false, burst: false });
    g.sfx('telegraph'); yield dur;
    for (let k = 0; k < n; k++) { const center = base + k * TAU / n, ph = k * 0.7; g._zone({ kind: 'hazard', shape: 'line', x: e.x, y: e.y, x2: e.x + Math.cos(center) * o.len, y2: e.y + Math.sin(center) * o.len, w: o.w, life: o.life, dmg: e.shotDmg * o.dmg, tick: 14, tickT: 0, src: e, color: o.color,
      upd(gg, z) { const a = center + o.swing * Math.sin(z.t * o.speed + ph); z.x = e.x; z.y = e.y; z.x2 = e.x + Math.cos(a) * o.len; z.y2 = e.y + Math.sin(a) * o.len; } }); }
    g.sfx('boom', { vol: 0.3 }); yield o.life;
  };
  addBoss({ id: 'keeper', name: 'The Keeper', title: 'Who Weighs the Keep', color: '#b8bcc8', accent: '#eef0f8', r: 46, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_grid', shape: 'keeper', contact: 5,
    teaches: 'He swings iron weights through sectors he marks first: stay out of the marked wedge and wait for them to swing back. Falling weights are marked too.', unlock: { boss: 'keeper' },
    attacks: { swing: L('pendulum', {}), swing2: L('pendulum', { n: 3, speed: 0.06, tele: 54 }), drop: L('slamRing', { r: 94, tele: 38, rings: 2, speed: 3, color: '#b8bcc8' }), weights: L('rain', { n: 8, r: 54, interval: 9, warn: 56, aimed: 0.5, color: '#b8bcc8', shrapnel: 4 }), keys: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 2.9, dmg: 0.9, color: '#d8dce8' }),
      rats: L('summon', { types: ['winchrat', 'pistoneer'], n: 2, max: 4, hpMul: 0.8 }), rams: L('bars', { n: 3, thick: 54, gapW: 150, warn: 64, color: '#b8bcc8' }), rush: L('charge', { tele: 42, speed: 10, dmg: 1.5, stun: 30, color: '#b8bcc8' }) },
    phases: [
      { at: 1.0, name: 'Even Scales', attacks: ['keys', 'swing', 'drop', 'rats'], idle: [38, 66] },
      { at: 0.62, name: 'Tipping', attacks: ['keys', 'swing', 'weights', 'rams', 'rats'], idle: [28, 52], enter: [L('pendulum', {})] },
      { at: 0.32, name: 'Overweight', attacks: ['swing2', 'weights', 'rams', 'drop', 'rush'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Counterpoise', attacks: ['swing2', 'weights', 'rush', 'drop'], idle: [16, 32] },
    ] });
  addBoss(variant('voltaris', { id: 'plumb', name: 'Plumb', title: 'the Iron Sentinel', color: '#8a8ea0', accent: '#eef0f8', tint: '#b8bcc8', arena: 'arena_pillars',
    teaches: 'A machine that always hangs true: its parts take the hits, and iron weights swing through marked sectors while it runs. Read the wedge, then strike a part.',
    swap: { swing: L('pendulum', { n: 2 }) }, add: { 1: ['swing'], 2: ['swing'] }, phaseNames: {} }));
  addBoss({ id: 'greatbalance', name: 'The Great Balance', title: 'Which Weighs Every Hero', color: '#c8ccd8', accent: '#eef0f8', r: 106, hp: 1370, rScale: 1.0, hpScale: 1.02, arena: 'arena_grid', shape: 'greatbalance', mega: true, contact: 6,
    teaches: 'Cut the four weights that hang from the beam, then the two great pans, then break the beam itself. Weights swing through marked wedges; watch the wedge, not the weight.', unlock: { boss: 'greatbalance' },
    parts: [
      { id: 'w0', kind: 'weight', r: 26, hp: 0.07, group: 0, ang: -2.5 }, { id: 'w1', kind: 'weight', r: 26, hp: 0.07, group: 0, ang: -1.85 }, { id: 'w2', kind: 'weight', r: 26, hp: 0.07, group: 0, ang: -1.29 }, { id: 'w3', kind: 'weight', r: 26, hp: 0.07, group: 0, ang: -0.64 },
      { id: 'panL', kind: 'pan', r: 46, hp: 0.12, group: 1, side: -1 }, { id: 'panR', kind: 'pan', r: 46, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 58, hp: 0.48, group: 2 },
    ],
    attacks: { hang: L('beams', { n: 4, len: 720, w: 24, warn: 54, life: 110, rot: 0.02, dmg: 0.85, color: '#c8ccd8', anchorParts: 'weight' }), swing: L('pendulum', { n: 2 }), swing2: L('pendulum', { n: 4, speed: 0.06, tele: 52 }), drop: L('slamRing', { r: 98, tele: 38, rings: 2, speed: 3, color: '#c8ccd8' }), fists: L('fists', {}), fists3: L('fists', { n: 3 }),
      rats: L('summon', { types: ['winchrat', 'pistoneer', 'gargoyle'], n: 3, max: 7, hpMul: 0.8, radius: 190 }), weights: L('rain', { n: 11, r: 54, interval: 8, warn: 52, aimed: 0.5, shrapnel: 4, color: '#c8ccd8' }), rams: L('bars', { n: 3, thick: 54, gapW: 150, warn: 62, color: '#c8ccd8' }),
      spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#c8ccd8' }), verdict: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Four Weights', attacks: ['hang', 'swing', 'drop'], idle: [36, 62] },
      { name: 'Two Pans', attacks: ['fists', 'swing', 'rats', 'rams', 'weights'], idle: [30, 54] },
      { name: 'The Beam', attacks: ['fists3', 'swing2', 'rats', 'weights', 'drop'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'Out of True', attacks: ['swing2', 'spiral', 'rats', 'rams', 'weights'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE FINAL WEIGHING', attacks: ['verdict', 'swing2', 'spiral', 'weights', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('counterweight', 'keeper', 'plumb', 'greatbalance');
  part('weight', hung(1.08, 0.98, 6), (c, e, p, vul, fl, t) => {
    c.strokeStyle = '#8a8a98'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x, p.y - p.r * 1.7); c.lineTo(p.x, p.y - p.r * 0.6); c.stroke(); c.fillStyle = fl ? '#fff' : (vul ? '#d8dce8' : '#6a6a78'); c.beginPath(); c.moveTo(p.x - p.r * 0.5, p.y - p.r * 0.6); c.lineTo(p.x + p.r * 0.5, p.y - p.r * 0.6); c.lineTo(p.x + p.r * 0.95, p.y + p.r * 0.8); c.lineTo(p.x - p.r * 0.95, p.y + p.r * 0.8); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.font = 'bold ' + Math.round(p.r * 0.8) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('K', p.x, p.y + p.r * 0.2); if (vul) glow(c, p.x, p.y, p.r * 1.4, '#e8ecf8', 0.22); });
  part('pan', flank(1.22, 0.3, 8), (c, e, p, vul, fl, t) => {
    c.strokeStyle = '#8a8a98'; c.lineWidth = 3; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(p.x + k * p.r * 0.8, p.y - p.r * 0.2); c.lineTo(p.x, p.y - p.r * 1.7); c.stroke(); } c.fillStyle = fl ? '#fff' : (vul ? '#e8ecf8' : '#7a7a88'); c.beginPath(); c.ellipse(p.x, p.y, p.r * 1.05, p.r * 0.4, 0, 0, Math.PI); c.fill(); c.stroke(); c.beginPath(); c.ellipse(p.x, p.y, p.r * 1.05, p.r * 0.2, 0, 0, TAU); c.fillStyle = vul ? '#f8fcff' : '#9a9aa8'; c.fill(); c.stroke(); if (vul) glow(c, p.x, p.y, p.r * 1.5, '#e8ecf8', 0.2); });
  BD.keeper = (c, e, x, y, r, col, dk, t) => {
    bodyOf(c, x, y, r, col, dk, 1.05, 0); face(c, x, y - r * 0.58, r, '#d8d0c8'); c.fillStyle = '#4a4a58'; c.beginPath(); c.arc(x, y - r * 0.72, r * 0.44, Math.PI, 0); c.fill(); c.stroke(); eyes2(c, x, y - r * 0.56, r, '#b8bcc8');
    c.strokeStyle = '#c8b870'; c.lineWidth = 3; c.beginPath(); c.arc(x - r * 0.1, y + r * 0.35, r * 0.65, 0.2, Math.PI - 0.2); c.stroke(); c.fillStyle = '#c8b870'; for (let k = 0; k < 5; k++) { const a = 0.4 + k * 0.58; c.beginPath(); c.arc(x - r * 0.1 + Math.cos(a) * r * 0.65, y + r * 0.35 + Math.sin(a) * r * 0.65, r * 0.07, 0, TAU); c.fill(); }
    for (const sg of [-1, 1]) { const sw = Math.sin(t * 0.05 + sg) * 0.3; c.strokeStyle = '#8a8a98'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + sg * r * 0.9, y - r * 0.1); c.lineTo(x + sg * (r * 1.1 + sw * r), y + r * 0.8); c.stroke(); c.fillStyle = '#5a5a68'; c.beginPath(); c.arc(x + sg * (r * 1.1 + sw * r), y + r * 0.95, r * 0.22, 0, TAU); c.fill(); c.stroke(); } };
  BD.greatbalance = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#4a4a58'; c.fillRect(x - r * 0.18, y - r * 0.6, r * 0.36, r * 1.6); c.strokeRect(x - r * 0.18, y - r * 0.6, r * 0.36, r * 1.6); c.fillRect(x - r * 0.7, y + r * 0.85, r * 1.4, r * 0.18);
    c.save(); c.translate(x, y - r * 0.55); c.rotate(Math.sin(t * 0.03) * 0.06); c.fillStyle = darker(col, 0.2); c.fillRect(-r * 1.1, -r * 0.1, r * 2.2, r * 0.2); c.strokeRect(-r * 1.1, -r * 0.1, r * 2.2, r * 0.2); c.restore();
    c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.22, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#10101c'; c.beginPath(); c.arc(x - r * 0.07, y - r * 0.57, r * 0.045, 0, TAU); c.arc(x + r * 0.07, y - r * 0.57, r * 0.045, 0, TAU); c.fill(); };
  relic('keepersring', { id: 'keepersring', name: "Keeper's Key Ring", rarity: 'legendary', color: '#c8b870', mods: { luck: 1, def: 1, kb: 0.15 }, unique: true, unlock: 'boss:keeper', on: { floorStart(g) { g.giveKey('small', true); } }, desc: 'A small key on every floor, +1 defense, +1 luck, harder shoves. (Unlockable)' });
  relic('trueweight', { id: 'trueweight', name: 'True Weight', rarity: 'legendary', color: '#c8ccd8', mods: { maxHp: 4, def: 1, kb: 0.3 }, unique: true, unlock: 'boss:greatbalance', desc: 'A heart container, +1 defense, and blows that move what they strike. (Unlockable)' });

  // ==================================================================== 11. THE HOLLOW RITE
  //  The Confessor begins a rite in a marked circle: if you do not stagger him (a twentieth of his life) before it fills, the whole hall is struck — except the safe circles.
  lib.ritual = function* (e, g, o) {
    o = Object.assign({ frames: 230, r: 150, interrupt: 0.05, dmg: 1.6, safe: 2, color: '#c08aff' }, o); const hp0 = e.hp, need = Math.max(1, e.maxHp * o.interrupt); let cut = false;
    const z = g.zoneCircle(e, e.x, e.y, o.r, o.frames, 0, { color: o.color, hurts: false, burst: false, follow: true }); g.toast('THE RITE BEGINS — STAGGER HIM!', o.color, 110); g.sfx('curse', { vol: 0.5 });
    try { for (let i = 0; i < o.frames; i++) { yield 1; if (hp0 - e.hp >= need) { cut = true; break; } if (i % 40 === 20) g.burst(e.x, e.y, 6, o.color, 2, 22); } } finally { z.dead = true; }
    if (cut) { g.addText(e.x, e.y - e.r - 10, 'INTERRUPTED', '#ffd24a', 15); g.sfx('block'); g.burst(e.x, e.y, 16, o.color, 4, 26); yield 40; return; }
    yield* lib.screenBlast(e, g, { safe: o.safe, warn: 76, dmg: o.dmg, color: o.color });
  };
  addBoss({ id: 'confessor', name: 'The Confessor', title: 'Who Hears Every Rite', color: '#c08aff', accent: '#f0e0ff', r: 46, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'confessor', contact: 5,
    teaches: 'He begins a rite in a ring that fills over four seconds: stagger him — a twentieth of his life — before it is full, or the hall is struck, all but two safe circles.', unlock: { boss: 'confessor' },
    attacks: { litany: L('spiral', { arms: 3, frames: 84, speed: 2.0, color: '#c08aff', rot: 0.06 }), chains: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 2.9, dmg: 0.9, color: '#b8a8d8' }), rite: L('ritual', {}), rite2: L('ritual', { frames: 190, safe: 3 }), slam: L('slamRing', { r: 92, tele: 38, rings: 2, speed: 3, color: '#c08aff' }), choir: L('summon', { types: ['acolyte', 'chanter'], n: 2, max: 4, hpMul: 0.8 }),
      penance: L('rain', { n: 9, r: 44, interval: 8, warn: 52, aimed: 0.5, color: '#c08aff' }), bars: L('bars', { n: 3, thick: 52, gapW: 150, warn: 64, color: '#c08aff' }) },
    phases: [
      { at: 1.0, name: 'Confession', attacks: ['chains', 'litany', 'rite', 'choir'], idle: [38, 66] },
      { at: 0.62, name: 'Absolution', attacks: ['chains', 'rite', 'slam', 'penance', 'choir'], idle: [28, 52] },
      { at: 0.32, name: 'Penance', attacks: ['rite2', 'penance', 'bars', 'slam', 'choir'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Last Rites', attacks: ['rite2', 'litany', 'penance', 'slam'], idle: [16, 32] },
    ] });
  addBoss(variant('skarn', { id: 'thurible', name: 'Brother Thurible', title: 'the Smoke Warden', color: '#a898c8', accent: '#f0e0ff', tint: '#c8b8e8', arena: 'arena_round',
    teaches: 'A censer-bearer of the rite: he guards the circle with smoke and, now and then, begins a rite of his own. Stagger him before it fills, or find a safe circle.',
    swap: { rite: L('ritual', { frames: 210 }) }, add: { 1: ['rite'], 2: ['rite'] }, phaseNames: {} }));
  addBoss({ id: 'blackaltar', name: 'The Black Altar', title: 'Where the Rite Ends', color: '#8a5ac8', accent: '#f0e0ff', r: 106, hp: 1370, rScale: 1.0, hpScale: 1.02, arena: 'arena_round', shape: 'blackaltar', mega: true, contact: 6,
    teaches: 'Snuff the four candles that feed the flame, break the two hands that hold the offering, then the altar itself. The rite fills: stagger the altar before it does.', unlock: { boss: 'blackaltar' },
    parts: [
      { id: 'cd0', kind: 'candle', r: 24, hp: 0.06, group: 0, ang: 0.4 }, { id: 'cd1', kind: 'candle', r: 24, hp: 0.06, group: 0, ang: 1.97 }, { id: 'cd2', kind: 'candle', r: 24, hp: 0.06, group: 0, ang: 3.54 }, { id: 'cd3', kind: 'candle', r: 24, hp: 0.06, group: 0, ang: 5.11 },
      { id: 'handL', kind: 'arm', r: 46, hp: 0.12, group: 1, side: -1 }, { id: 'handR', kind: 'arm', r: 46, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 58, hp: 0.5, group: 2 },
    ],
    attacks: { flames: L('beams', { n: 4, len: 700, w: 22, warn: 56, life: 120, rot: 0.018, dmg: 0.85, color: '#c08aff', anchorParts: 'candle' }), rite: L('ritual', { interrupt: 0.04 }), rite2: L('ritual', { frames: 190, safe: 3, interrupt: 0.04 }), fists: L('fists', {}), fists3: L('fists', { n: 3 }),
      choir: L('summon', { types: ['acolyte', 'chanter', 'penitent'], n: 3, max: 7, hpMul: 0.8, radius: 190 }), litany: L('spiral', { arms: 3, frames: 84, speed: 2.0, color: '#c08aff', rot: 0.06 }), penance: L('rain', { n: 11, r: 46, interval: 7, warn: 50, aimed: 0.5, shrapnel: 4, color: '#c08aff' }),
      slam: L('slamRing', { r: 98, tele: 38, rings: 2, speed: 3, color: '#c08aff' }), spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#8a5ac8' }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Four Candles', attacks: ['flames', 'litany', 'rite'], idle: [36, 62] },
      { name: 'The Offering Hands', attacks: ['fists', 'rite', 'choir', 'penance', 'slam'], idle: [30, 54] },
      { name: 'The Altar', attacks: ['fists3', 'rite2', 'choir', 'penance', 'litany'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'The Black Flame', attacks: ['rite2', 'spiral', 'choir', 'penance', 'slam'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE LAST RITE', attacks: ['rite2', 'spiral', 'litany', 'penance', 'fists3'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('rite', 'confessor', 'thurible', 'blackaltar');
  part('candle', orbit(0.012, 1.3, 0.95), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#f0e8f8' : '#8a82a0'); c.fillRect(p.x - p.r * 0.32, p.y - p.r * 0.2, p.r * 0.64, p.r * 1.2); c.strokeRect(p.x - p.r * 0.32, p.y - p.r * 0.2, p.r * 0.64, p.r * 1.2); c.fillStyle = vul ? '#c08aff' : '#6a4a98'; const fy = p.y - p.r * 0.2; c.beginPath(); c.moveTo(p.x, fy - p.r * (0.9 + Math.sin(t * 0.3) * 0.1)); c.quadraticCurveTo(p.x + p.r * 0.4, fy - p.r * 0.2, p.x, fy); c.quadraticCurveTo(p.x - p.r * 0.4, fy - p.r * 0.2, p.x, fy - p.r * 0.9); c.fill(); if (vul) glow(c, p.x, p.y - p.r * 0.6, p.r * 1.6, '#c08aff', 0.3 + 0.1 * Math.sin(t * 0.3)); });
  BD.confessor = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.55); c.beginPath(); c.moveTo(x - r * 1.0, y + r); c.lineTo(x - r * 0.55, y - r * 0.4); c.lineTo(x + r * 0.55, y - r * 0.4); c.lineTo(x + r * 1.0, y + r); c.closePath(); c.fill(); c.stroke(); c.fillStyle = darker(col, 0.25); c.beginPath(); c.moveTo(x - r * 0.6, y + r); c.lineTo(x - r * 0.3, y - r * 0.3); c.lineTo(x + r * 0.3, y - r * 0.3); c.lineTo(x + r * 0.6, y + r); c.closePath(); c.fill();
    c.fillStyle = darker(col, 0.5); c.beginPath(); c.arc(x, y - r * 0.55, r * 0.5, Math.PI, 0); c.lineTo(x + r * 0.5, y - r * 0.2); c.lineTo(x - r * 0.5, y - r * 0.2); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#10101c'; c.beginPath(); c.ellipse(x, y - r * 0.45, r * 0.32, r * 0.28, 0, 0, TAU); c.fill(); c.fillStyle = '#e8d0ff'; c.beginPath(); c.arc(x - r * 0.12, y - r * 0.47, r * 0.05, 0, TAU); c.arc(x + r * 0.12, y - r * 0.47, r * 0.05, 0, TAU); c.fill();
    c.strokeStyle = '#d8c8a0'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + r * 0.85, y + r * 0.7); c.lineTo(x + r * 0.85, y - r * 0.2); c.stroke(); c.fillStyle = '#c08aff'; c.beginPath(); c.moveTo(x + r * 0.85, y - r * 0.2 - r * (0.35 + Math.sin(t * 0.3) * 0.05)); c.quadraticCurveTo(x + r * 1.05, y - r * 0.2, x + r * 0.85, y - r * 0.15); c.quadraticCurveTo(x + r * 0.65, y - r * 0.2, x + r * 0.85, y - r * 0.55); c.fill(); };
  BD.blackaltar = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#1a1226'; c.fillRect(x - r * 1.0, y + r * 0.35, r * 2.0, r * 0.65); c.strokeRect(x - r * 1.0, y + r * 0.35, r * 2.0, r * 0.65); c.fillStyle = '#2a1a3a'; c.fillRect(x - r * 0.8, y - r * 0.2, r * 1.6, r * 0.6); c.strokeRect(x - r * 0.8, y - r * 0.2, r * 1.6, r * 0.6);
    c.strokeStyle = 'rgba(192,138,255,' + (0.5 + 0.3 * Math.sin(t * 0.08)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.35, 0, TAU); c.stroke(); for (let k = 0; k < 5; k++) { const a = -t * 0.01 + k * TAU / 5, a2 = a + TAU * 2 / 5; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.35, y + r * 0.1 + Math.sin(a) * r * 0.35); c.lineTo(x + Math.cos(a2) * r * 0.35, y + r * 0.1 + Math.sin(a2) * r * 0.35); c.stroke(); }
    c.fillStyle = '#e8d0ff'; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.22, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#10101c'; c.beginPath(); c.arc(x - r * 0.07, y - r * 0.57, r * 0.05, 0, TAU); c.arc(x + r * 0.07, y - r * 0.57, r * 0.05, 0, TAU); c.fill(); };
  relic('confessorsbeads', { id: 'confessorsbeads', name: "Confessor's Beads", rarity: 'legendary', color: '#c08aff', mods: { regen: 1, luck: 1, def: 1 }, unique: true, unlock: 'boss:confessor', desc: 'A slow mending, +1 luck, +1 defense: what is confessed is forgiven. (Unlockable)' });
  relic('blackflame', { id: 'blackflame', name: 'The Black Flame', rarity: 'legendary', color: '#8a5ac8', mods: { burn: 0.12, dmg: 0.06, maxHp: 4 }, unique: true, unlock: 'boss:blackaltar', desc: 'Your blows ignite what they strike, harder, and a heart container beside. (Unlockable)' });

  // ==================================================================== 12. THE ECLIPSE ORCHARD
  //  The Gardener ripens fruit in marked places: pluck it (+3 hp) or leave it, and after three seconds it rots into a bomb that bursts where it hangs.
  ED.pickupImpl.bossfruit = {
    collect(g, k) { const p = g.player; if (p.hp >= p.maxHp) return false; g.healPlayer(3); g.sfx('heal'); g.burst(k.x, k.y, 8, '#ffb85a', 2, 16); return true; },
    draw(c, k, t, bob) { const age = Math.min(1, (k.t || 0) / 170); c.fillStyle = age > 0.65 ? '#8a7a2a' : '#e8803a'; c.beginPath(); c.arc(k.x, k.y + bob, 7, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(k.x - 2.5, k.y + bob - 2.5, 2.4, 0, TAU); c.fill(); c.strokeStyle = '#5a8a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(k.x, k.y + bob - 7); c.lineTo(k.x + 3, k.y + bob - 11); c.stroke(); if (age > 0.65) { c.strokeStyle = 'rgba(200,190,60,' + (0.4 + 0.4 * Math.sin(t * 0.6)) + ')'; c.lineWidth = 1.5; c.beginPath(); c.arc(k.x, k.y + bob, 11, 0, TAU); c.stroke(); } },
  };
  lib.harvest = function* (e, g, o) {
    o = Object.assign({ n: 4, ripen: 50, rot: 170, r: 52, dmg: 1.2, color: '#e8a85a' }, o); const n = N(e, o.n), rt = g.rt;
    for (let k = 0; k < n; k++) {
      const c = clampArena(g.rng.range(110, 850), g.rng.range(110, 470), 24), dur = g.tele(o.ripen); g.zoneCircle(e, c.x, c.y, 22, dur, 0, { color: '#8ac06a', hurts: false, burst: false });
      g.after(dur, () => { if (g.rt !== rt || e.dead) return; const pk = g.dropPickup('bossfruit', c.x, c.y, 1, { still: true }); if (!pk) return; g.after(o.rot, () => { if (!pk.dead && g.rt === rt) { pk.dead = true; g.zoneCircle(e, pk.x, pk.y, o.r, g.tele(48), e.shotDmg * o.dmg, { color: '#a89a3a', burst: true }); } }); });
      yield 12;
    }
    g.sfx('telegraph'); yield g.tele(o.ripen) + 10;
  };
  addBoss({ id: 'gardener', name: 'The Gardener', title: 'Who Prunes What Grows', color: '#e8a85a', accent: '#fff0c0', r: 46, hp: 500, rScale: 1.0, hpScale: 1.0, arena: 'arena_ruins', shape: 'gardener', contact: 5,
    teaches: 'He ripens fruit in marked places: pluck it to mend (+3 hp), but leave it for three seconds and it rots into a bomb. Thorns and roots mark their lanes first.', unlock: { boss: 'gardener' },
    attacks: { seeds: L('fan', { n: 5, spread: 0.26, reps: 3, gap: 14, speed: 2.9, dmg: 0.9, color: '#a8d86a' }), harvest: L('harvest', {}), harvest2: L('harvest', { n: 6, ripen: 44, rot: 150 }), thorns: L('vines', { n: 3, spread: 0.6, w: 42, tele: 46, color: '#8ac06a' }), thorns2: L('vines', { n: 4, spread: 0.5, w: 40, tele: 40, waves: 2, color: '#8ac06a' }),
      prune: L('coneSlash', { arc: 1.7, r: 150, tele: 44, dmg: 1.6, color: '#e8a85a' }), bloom: L('radial', { n: 16, reps: 3, gap: 14, speed: 2.3, rot: 0.17, color: '#e8a85a' }), crew: L('summon', { types: ['orchardmoth', 'scarecrow'], n: 2, max: 5, hpMul: 0.8 }) },
    phases: [
      { at: 1.0, name: 'Spring Planting', attacks: ['seeds', 'harvest', 'thorns', 'crew'], idle: [38, 66] },
      { at: 0.62, name: 'Summer Growth', attacks: ['seeds', 'harvest', 'thorns', 'prune', 'bloom'], idle: [28, 52], enter: [L('harvest', { n: 3 })] },
      { at: 0.32, name: 'Autumn Rot', attacks: ['harvest2', 'thorns2', 'prune', 'bloom', 'crew'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Winter Pruning', attacks: ['harvest2', 'thorns2', 'prune', 'bloom'], idle: [16, 32] },
    ] });
  addBoss(variant('vael', { id: 'scion', name: 'Ser Scion', title: 'the Grafted Knight', color: '#c8944a', accent: '#fff0c0', tint: '#e8c07a', arena: 'arena_pillars',
    teaches: 'A knight grafted onto the old stock: his blades are bark-hard and the garden answers him — fruit ripens in marked places and rots into bombs if you leave it.',
    swap: { harvest: L('harvest', { n: 3 }), phantoms: L('summon', { types: ['orchardmoth', 'scarecrow'], n: 2, max: 5, hpMul: 0.8 }) }, add: { 1: ['harvest'], 2: ['harvest'] }, phaseNames: { 'The Duelist': 'The Graft', Fury: 'Sap Rising' } }));
  addBoss({ id: 'eclipsetree', name: 'The Eclipse Tree', title: 'Whose Fruit Is the Sun', color: '#d8a050', accent: '#fff0c0', r: 108, hp: 1380, rScale: 1.0, hpScale: 1.03, arena: 'arena_round', shape: 'eclipsetree', mega: true, contact: 6,
    teaches: 'Cut the three great boughs, then the hanging fruit that feeds it, then break the heartwood. Fruit ripens in marked places: pluck it to mend, or it rots into a bomb.', unlock: { boss: 'eclipsetree' },
    parts: [
      { id: 'bo0', kind: 'bough', r: 34, hp: 0.08, group: 0, ang: -2.5 }, { id: 'bo1', kind: 'bough', r: 34, hp: 0.08, group: 0, ang: -1.57 }, { id: 'bo2', kind: 'bough', r: 34, hp: 0.08, group: 0, ang: -0.64 },
      { id: 'fr0', kind: 'hangfruit', r: 28, hp: 0.07, group: 1, ang: 0.6 }, { id: 'fr1', kind: 'hangfruit', r: 28, hp: 0.07, group: 1, ang: 2.1 }, { id: 'fr2', kind: 'hangfruit', r: 28, hp: 0.07, group: 1, ang: 3.6 }, { id: 'fr3', kind: 'hangfruit', r: 28, hp: 0.07, group: 1, ang: 5.1 },
      { id: 'core', kind: 'core', r: 58, hp: 0.48, group: 2 },
    ],
    attacks: { boughs: L('beams', { n: 3, len: 720, w: 24, warn: 54, life: 110, rot: 0.02, dmg: 0.85, color: '#d8a050', anchorParts: 'bough' }), harvest: L('harvest', { n: 5 }), harvest2: L('harvest', { n: 7, ripen: 44, rot: 150 }), thorns: L('vines', { n: 4, spread: 0.55, w: 42, tele: 44, color: '#8ac06a' }),
      roots: L('bars', { n: 3, thick: 54, gapW: 150, warn: 62, color: '#8ac06a' }), brood: L('summon', { types: ['orchardmoth', 'scarecrow', 'graftbeast'], n: 3, max: 7, hpMul: 0.8, radius: 190 }), bloom: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.4, rot: 0.16, color: '#e8a85a' }),
      spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#d8a050' }), eclipse: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'Three Boughs', attacks: ['boughs', 'harvest', 'bloom'], idle: [36, 62] },
      { name: 'Hanging Fruit', attacks: ['harvest', 'thorns', 'brood', 'roots', 'bloom'], idle: [30, 54] },
      { name: 'Heartwood', attacks: ['harvest2', 'thorns', 'brood', 'roots', 'bloom'], idle: [26, 46], enter: [L('pillars', { n: 3, max: 8 })] },
      { name: 'Total Eclipse', attacks: ['harvest2', 'spiral', 'brood', 'thorns', 'bloom'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE LONG NIGHT', attacks: ['eclipse', 'harvest2', 'spiral', 'roots', 'thorns'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf: groupPhase });
  land('orchard', 'gardener', 'scion', 'eclipsetree');
  part('hangfruit', orbit(0.012, 1.25, 0.95), (c, e, p, vul, fl, t) => {
    c.strokeStyle = '#5a8a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x, p.y - p.r * 1.3); c.lineTo(p.x, p.y - p.r * 0.7); c.stroke(); c.fillStyle = fl ? '#fff' : (vul ? '#ff9a4a' : '#9a5a2a'); c.beginPath(); c.arc(p.x, p.y, p.r * 0.9, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, 0, TAU); c.fill(); c.fillStyle = '#5a8a3a'; c.beginPath(); c.ellipse(p.x + p.r * 0.3, p.y - p.r * 1.0, p.r * 0.35, p.r * 0.16, -0.5, 0, TAU); c.fill(); if (vul) glow(c, p.x, p.y, p.r * 1.6, '#ffb04a', 0.3 + 0.1 * Math.sin(t * 0.2)); });
  BD.gardener = (c, e, x, y, r, col, dk, t) => {
    bodyOf(c, x, y, r, col, dk, 1.0, 0); face(c, x, y - r * 0.58, r, '#d8b890'); c.fillStyle = '#c8a050'; c.beginPath(); c.ellipse(x, y - r * 0.82, r * 0.78, r * 0.2, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(x, y - r * 0.92, r * 0.34, Math.PI, 0); c.fill(); c.stroke(); eyes2(c, x, y - r * 0.58, r, '#8ac06a');
    c.strokeStyle = '#8a8a98'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + r * 0.8, y + r * 0.9); c.lineTo(x + r * 1.4, y - r * 0.5); c.stroke(); c.beginPath(); c.moveTo(x + r * 1.1, y - r * 0.5); c.lineTo(x + r * 1.7, y - r * 0.9); c.moveTo(x + r * 1.1, y - r * 0.5); c.lineTo(x + r * 1.7, y - r * 0.1); c.stroke(); c.fillStyle = '#8ac06a'; c.beginPath(); c.ellipse(x - r * 0.95, y + r * 0.3, r * 0.4, r * 0.22, 0.4, 0, TAU); c.fill(); c.stroke(); };
  BD.eclipsetree = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#3a2818'; c.beginPath(); c.moveTo(x - r * 0.45, y + r); c.quadraticCurveTo(x - r * 0.3, y, x - r * 0.25, y - r * 0.5); c.lineTo(x + r * 0.25, y - r * 0.5); c.quadraticCurveTo(x + r * 0.3, y, x + r * 0.45, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#2a5a2a'; for (const [dx, dy, k] of [[0, -0.75, 0.62], [-0.55, -0.45, 0.45], [0.55, -0.45, 0.45], [-0.25, -1.0, 0.4], [0.3, -1.0, 0.4]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, k * r, 0, TAU); c.fill(); }
    c.fillStyle = '#0a0a14'; c.beginPath(); c.arc(x, y - r * 0.8, r * 0.4, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,200,120,' + (0.55 + 0.3 * Math.sin(t * 0.06)) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(x, y - r * 0.8, r * 0.44, 0, TAU); c.stroke();
    c.fillStyle = '#10101c'; c.beginPath(); c.ellipse(x - r * 0.12, y - r * 0.02, r * 0.07, r * 0.12, 0, 0, TAU); c.ellipse(x + r * 0.12, y - r * 0.02, r * 0.07, r * 0.12, 0, 0, TAU); c.fill(); };
  relic('prunerslove', { id: 'prunerslove', name: "Gardener's Glove", rarity: 'legendary', color: '#e8a85a', mods: { regen: 1, magnet: 0.3, dmg: 0.05 }, unique: true, unlock: 'boss:gardener', desc: 'Green fingers: a slow mending, a stronger magnet, +5% damage. (Unlockable)' });
  relic('eclipseseed', { id: 'eclipseseed', name: 'Eclipse Seed', rarity: 'legendary', color: '#d8a050', mods: { maxHp: 4, luck: 1, regen: 1 }, unique: true, unlock: 'boss:eclipsetree', desc: 'A heart container, +1 luck, a slow mending: something dark that will grow. (Unlockable)' });

  ED.v27c = {};
})(typeof globalThis !== 'undefined' ? globalThis : this);

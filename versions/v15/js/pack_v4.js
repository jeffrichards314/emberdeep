/* EMBERDEEP — pack_v4.js : v4 "TITANS" — new bosses, new MEGA bosses, and the Revenant (Nemesis) system.
 *
 *  Floor bosses : Skarn the Frostwarden (ice floors) · Karsk the Dune Wyrm (dive & punish) · Voltaris the Storm Engine (pylons)
 *  MEGA bosses  : Tempestra the Thunder Titan (rods, clouds, gales) · Morrow the Ossuary King (skulls, hands, an undead court)
 *  Revenants    : when a run ends in death, the next run can meet your own echo in a mini boss room, carrying what you lost.
 *  Each boss drops a signature relic the first time it falls.  The boss roster simply grows (4+3 → 7+5): tier pacing is unchanged.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs;
  const X = ED.attacks, lib = X.lib, N = X.N, ang = X.ang, clampArena = X.clampArena, sc = X.sc;
  const TAU = U.TAU, V = 'v4';
  const L = (name, o) => [name, o];
  const rateOf = e => Math.max(0.5, e.rate || 1);

  P.define({
    id: 'v4', name: 'TITANS', tag: 'bigger bosses, haunted by your past', color: '#ff6a5a',
    blurb: 'Three new floor bosses, two new multi-part MEGA bosses with signature relics — and Revenants: die, and your next run may meet an echo of you carrying the gear you lost.',
  });

  // ------------------------------------------------------------------ new attack primitives
  /** ice patches creep over the arena floor (slippery: dash is your brake) */
  lib.iceFloor = function* (e, g, o) {
    o = Object.assign({ n: 3, w: 6, h: 4, warn: 54 }, o);
    const idx = [], seen = new Set();
    for (let k = 0, n = N(e, o.n); k < n; k++) {
      const x0 = g.rng.int(3, 26 - o.w), y0 = g.rng.int(3, 15 - o.h);
      for (let y = y0; y < y0 + o.h; y++) for (let x = x0; x < x0 + o.w; x++) { const i = y * C.COLS + x, t = g.room.tiles[i]; if ((t === T.FLOOR || t === T.RUG) && !seen.has(i)) { seen.add(i); idx.push(i); } }
    }
    if (!idx.length) return;
    g.zoneTiles(e, idx, g.tele(o.warn), T.ICE); g.toast('The floor is freezing over!', '#bfeaff', 90); g.sfx('crack');
    yield g.tele(o.warn) + 18;
  };
  /** dive under the floor (untouchable), surface under the player's feet after a warning, then it is winded and takes extra damage */
  lib.burrow = function* (e, g, o) {
    o = Object.assign({ times: 1, tele: 46, r: 86, bullets: 8, winded: 80, dmg: 1.5, color: '#d8b070' }, o);
    try {
      for (let k = 0; k < o.times; k++) {
        e.invuln = true;
        for (let i = 0; i < 16; i++) { e.vis = 1 - i / 16; yield 1; }
        e.vis = 0; g.burst(e.x, e.y, 18, o.color, 4, 26); g.sfx('thud');
        const p = g.player, c = clampArena(p.x + (p.vx || 0) * 14, p.y + (p.vy || 0) * 14, e.r * 0.5), dur = g.tele(o.tele), sx = e.x, sy = e.y;
        g.zoneCircle(e, c.x, c.y, o.r, dur, e.shotDmg * o.dmg, { color: o.color, burst: true, big: true, onEnd: (gg, z) => { gg.shake(10); gg.burst(z.x, z.y, 26, o.color, 5, 30); } });
        for (let i = 0; i < dur; i++) { if (i % 5 === 0) g.burst(U.lerp(sx, c.x, i / dur), U.lerp(sy, c.y, i / dur), 2, o.color, 1.5, 16); yield 1; }
        e.x = c.x; e.y = c.y; e.vis = 1; e.invuln = false; e.vuln = 1.4;
        g.ringShot(e, N(e, o.bullets), 2.6 * sc(e).spd, g.rng.next() * TAU, { dmg: 0.8, color: o.color, r: 5 });
        g.addText(e.x, e.y - e.r - 12, 'WINDED', '#ffd24a', 13);
        yield o.winded / rateOf(e);
        e.vuln = 1;
      }
    } finally { e.invuln = false; e.vis = 1; e.vuln = 1; }
  };
  /** a gale shoves the player (and bullets) in one direction after a warning */
  lib.gale = function* (e, g, o) {
    o = Object.assign({ warn: 60, dur: 80, push: 1.1 }, o);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], d = g.rng.pick(dirs), p = g.player;
    try {
      g.toast('GALE!', '#ffe14a', 80); g.sfx('telegraph');
      e.gale = { dx: d[0], dy: d[1], st: 'warn' };
      for (let i = 0; i < o.warn; i++) yield 1;
      e.gale.st = 'blow';
      for (let i = 0; i < o.dur; i++) {
        if (p.dashT <= 0 && !p.dead) ED.phys.move(g, p, d[0] * o.push, d[1] * o.push);
        for (const b of g.eproj) if (!b.dead && !b.friendly) { b.x += d[0] * 0.6; b.y += d[1] * 0.6; }
        yield 1;
      }
    } finally { e.gale = null; }
  };

  // ------------------------------------------------------------------ floor bosses
  const FDEFS = {
    skarn: { id: 'skarn', pack: V, name: 'Skarn', title: 'the Frostwarden', color: '#9fe4ff', accent: '#e8f8ff', r: 44, hp: 450, rScale: 1.0, hpScale: 1.0, arena: 'arena_cross', shape: 'frostwarden', contact: 5,
      teaches: 'Ice is slippery: your dash is your brake. Keep off the white and punish the Warden between volleys.', unlock: { boss: 'skarn' },
      attacks: {
        shards: L('fan', { n: 7, spread: 0.2, reps: 2, gap: 16, speed: 3.1, dmg: 0.9, color: '#bff0ff' }), lance: L('charge', { tele: 34, speed: 9.5, dmg: 1.5, ring: 6, stun: 40 }),
        hail: L('rain', { n: 9, r: 44, warn: 48, interval: 8, aimed: 0.6, color: '#9fe4ff' }), glacier: L('slamRing', { r: 90, tele: 36, rings: 2, speed: 3, gaps: 2, gapW: 0.7, color: '#bff0ff' }),
        blizzard: L('radial', { n: 14, reps: 3, gap: 12, speed: 2.3, rot: 0.18, color: '#bff0ff' }), freeze: L('iceFloor', { n: 3 }), freeze2: L('iceFloor', { n: 5, w: 7, h: 5 }),
        step: L('chain', { seq: [['blink', { where: 'behind', fan: 5, color: '#bff0ff' }], ['coneSlash', { tele: 22, r: 110 }]] }),
      },
      phases: [
        { at: 1.0, name: 'Chill', attacks: ['shards', 'lance', 'hail'], idle: [40, 70] },
        { at: 0.64, name: 'Blizzard', attacks: ['shards', 'lance', 'glacier', 'hail', 'freeze'], idle: [28, 52], enter: [L('freeze', null)] },
        { at: 0.32, name: 'Absolute Zero', attacks: ['blizzard', 'glacier', 'step', 'hail', 'freeze2'], idle: [20, 40], enter: [L('freeze2', null)] },
        { at: 0.12, minTier: 2, name: 'Permafrost', attacks: ['blizzard', 'step', 'glacier', 'shards'], idle: [14, 30] },
      ] },
    karsk: { id: 'karsk', pack: V, name: 'Karsk', title: 'the Dune Wyrm', color: '#d8b070', accent: '#fff0c8', r: 46, hp: 470, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'wyrm', contact: 5,
      teaches: 'When it dives it cannot be hurt. Watch the ring on the floor — then punish the winded wyrm.', unlock: { boss: 'karsk' },
      attacks: {
        spit: L('fan', { n: 5, spread: 0.26, reps: 2, gap: 16, speed: 3, dmg: 0.9, color: '#e8c890' }), quake: L('slamRing', { r: 84, tele: 34, rings: 2, speed: 3, gaps: 1, gapW: 1.0, color: '#d8b070' }),
        dive: L('burrow', { times: 1 }), dive2: L('burrow', { times: 2, winded: 64 }), dive3: L('burrow', { times: 3, winded: 50, tele: 38 }),
        sandrain: L('rain', { n: 9, r: 46, warn: 50, interval: 8, aimed: 0.55, color: '#d8b070' }), storm: L('radial', { n: 16, reps: 3, gap: 12, speed: 2.3, rot: 0.2, color: '#e8c890' }),
        brood: L('summon', { types: ['swarm'], n: 4, max: 8, hpMul: 0.8 }),
      },
      phases: [
        { at: 1.0, name: 'Surface', attacks: ['spit', 'quake', 'dive'], idle: [40, 70] },
        { at: 0.62, name: 'Tunnels', attacks: ['dive2', 'quake', 'sandrain', 'spit', 'brood'], idle: [28, 50] },
        { at: 0.30, name: 'Sandstorm', attacks: ['dive3', 'storm', 'sandrain', 'quake'], idle: [20, 38] },
        { at: 0.12, minTier: 2, name: 'Wyrmfury', attacks: ['dive3', 'storm', 'sandrain'], idle: [14, 28] },
      ] },
    voltaris: { id: 'voltaris', pack: V, name: 'Voltaris', title: 'the Storm Engine', color: '#ffe14a', accent: '#fff6b0', r: 40, hp: 480, rScale: 1.0, hpScale: 1.0, arena: 'arena_open', shape: 'engine', contact: 4,
      teaches: 'Four pylons feed it. Smash them — each one silences a lightning beam — then crack the engine.', unlock: { boss: 'voltaris' },
      parts: [
        { id: 'py0', kind: 'pylon', r: 26, hp: 0.11, group: 0, ang: 0 }, { id: 'py1', kind: 'pylon', r: 26, hp: 0.11, group: 0, ang: 1 },
        { id: 'py2', kind: 'pylon', r: 26, hp: 0.11, group: 0, ang: 2 }, { id: 'py3', kind: 'pylon', r: 26, hp: 0.11, group: 0, ang: 3 },
        { id: 'core', kind: 'core', r: 40, hp: 0.56, group: 1 },
      ],
      attacks: {
        arcs: L('beams', { n: 2, len: 700, w: 22, warn: 50, life: 100, rot: 0.02, dmg: 0.85, color: '#ffe14a', anchorParts: 'pylon' }), tick: L('radial', { n: 12, reps: 3, gap: 12, speed: 2.3, rot: 0.2, color: '#ffe14a' }),
        strikes: L('rain', { n: 10, r: 40, warn: 46, interval: 7, aimed: 0.7, color: '#ffe14a' }), fence: L('bars', { n: 3, thick: 46, gapW: 160, warn: 66, color: '#ffe14a' }),
        fenceV: L('bars', { n: 3, thick: 46, gapW: 160, warn: 66, vertical: true, color: '#ffe14a' }), drones: L('summon', { types: ['shooter', 'teleporter'], n: 2, max: 4, hpMul: 0.7 }),
        overload: L('screenBlast', { safe: 3, warn: 96, dmg: 1.6 }), orbs: L('homing', { n: 4, speed: 1.8, color: '#ffe14a' }),
      },
      phases: [
        { name: 'Charged', attacks: ['arcs', 'tick', 'strikes'], idle: [38, 66] },
        { name: 'Flickering', attacks: ['arcs', 'fence', 'strikes', 'drones'], idle: [30, 54] },
        { name: 'Overload', attacks: ['fenceV', 'strikes', 'orbs', 'tick'], idle: [24, 44], enter: [L('shrink', { ring: 1, tile: T.PIT })] },
        { name: 'MELTDOWN', attacks: ['overload', 'fence', 'fenceV', 'orbs'], idle: [16, 32], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      ],
      phaseOf(e) {
        const alive = e.parts.filter(p => p.kind === 'pylon' && !p.dead).length;
        if (alive >= 3) return 0; if (alive >= 1) return 1;
        const core = e.parts.find(p => p.id === 'core'); return core.hp / core.maxHp > 0.45 ? 2 : 3;
      } },
  };
  // ------------------------------------------------------------------ MEGA bosses
  const MDEFS = {
    tempestra: { id: 'tempestra', pack: V, name: 'Tempestra', title: 'the Thunder Titan', color: '#c8d0ff', accent: '#ffe14a', r: 108, hp: 1300, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'tempestra', mega: true, contact: 6, megaIndex: 3,
      teaches: 'Rods call the lightning, clouds shove you with gales. Break the rods, then the clouds, then the eye of the storm.', unlock: { boss: 'tempestra', mega: 3 },
      parts: [
        { id: 'r0', kind: 'rod', r: 30, hp: 0.07, group: 0, ang: 0.4 }, { id: 'r1', kind: 'rod', r: 30, hp: 0.07, group: 0, ang: 1.97 }, { id: 'r2', kind: 'rod', r: 30, hp: 0.07, group: 0, ang: 3.54 }, { id: 'r3', kind: 'rod', r: 30, hp: 0.07, group: 0, ang: 5.1 },
        { id: 'cloudL', kind: 'cloud', r: 50, hp: 0.1, group: 1, side: -1 }, { id: 'cloudR', kind: 'cloud', r: 50, hp: 0.1, group: 1, side: 1 },
        { id: 'core', kind: 'core', r: 56, hp: 0.42, group: 2 },
      ],
      attacks: {
        strikes: L('rain', { n: 12, r: 42, warn: 48, interval: 6, aimed: 0.7, color: '#ffe14a' }), bolts: L('beams', { n: 3, len: 720, w: 24, warn: 52, life: 110, rot: 0.02, dmg: 0.85, color: '#ffe14a', anchorParts: 'rod' }),
        gale: L('gale', {}), gale2: L('gale', { dur: 100, push: 1.3 }), wall: L('bars', { n: 3, thick: 48, gapW: 160, warn: 70, color: '#ffe14a' }), wallV: L('bars', { n: 3, thick: 48, gapW: 160, warn: 70, vertical: true, color: '#ffe14a' }),
        sparks: L('radial', { n: 16, reps: 3, gap: 12, speed: 2.4, rot: 0.2, color: '#fff6a0' }), clap: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), spiral: L('spiral', { arms: 4, frames: 90, speed: 2.1, color: '#ffe14a' }),
        drones: L('summon', { types: ['shooter', 'bomber'], n: 2, max: 4, hpMul: 0.7 }), pillars: L('pillars', { n: 3, max: 8 }),
      },
      phases: [
        { name: 'Lightning Rods', attacks: ['strikes', 'bolts', 'sparks'], idle: [36, 62] },
        { name: 'Thunderheads', attacks: ['strikes', 'gale', 'wall', 'bolts', 'drones'], idle: [30, 54], enter: [L('drones', null)] },
        { name: 'Eye of the Storm', attacks: ['bolts', 'gale', 'wallV', 'spiral', 'strikes'], idle: [26, 46], enter: [L('shrink', { ring: 1, tile: T.PIT }), L('pillars', { n: 3, max: 8 })] },
        { name: 'Tempest', attacks: ['gale2', 'wall', 'wallV', 'spiral', 'sparks', 'strikes'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
        { name: 'THUNDERGOD', attacks: ['clap', 'gale2', 'bolts', 'wallV', 'spiral'], idle: [15, 30], enter: [L('shrink', { ring: 3, tile: T.LAVA })] },
      ],
      phaseOf(e) {
        const rods = e.parts.filter(p => p.kind === 'rod' && !p.dead).length, clouds = e.parts.filter(p => p.kind === 'cloud' && !p.dead).length;
        if (rods) return 0; if (clouds) return 1;
        const core = e.parts.find(p => p.id === 'core'); const f = core.hp / core.maxHp; return f > 0.58 ? 2 : f > 0.25 ? 3 : 4;
      } },
    morrow: { id: 'morrow', pack: V, name: 'Morrow', title: 'the Ossuary King', color: '#d8d0b8', accent: '#c8a8ff', r: 104, hp: 1350, rScale: 1.0, hpScale: 1.01, arena: 'arena_throne', shape: 'ossuary', mega: true, contact: 6, megaIndex: 4,
      teaches: 'His skulls chant the beams, his hands crush, his court never ends. Silence the skulls, break the hands, shatter the crown.', unlock: { boss: 'morrow', mega: 4 },
      parts: [
        { id: 's0', kind: 'skull', r: 30, hp: 0.065, group: 0, ang: 0.8 }, { id: 's1', kind: 'skull', r: 30, hp: 0.065, group: 0, ang: 2.37 }, { id: 's2', kind: 'skull', r: 30, hp: 0.065, group: 0, ang: 3.94 }, { id: 's3', kind: 'skull', r: 30, hp: 0.065, group: 0, ang: 5.51 },
        { id: 'handL', kind: 'arm', r: 46, hp: 0.12, group: 1, side: -1 }, { id: 'handR', kind: 'arm', r: 46, hp: 0.12, group: 1, side: 1 },
        { id: 'core', kind: 'core', r: 54, hp: 0.45, group: 2 },
      ],
      attacks: {
        raise: L('summon', { types: ['bonesoldier', 'bonesoldier', 'chaser'], n: 3, max: 8, hpMul: 0.8, radius: 190 }), chant: L('beams', { n: 3, len: 720, w: 24, warn: 52, life: 110, rot: 0.02, dmg: 0.85, color: '#c8a8ff', anchorParts: 'skull' }),
        fists: L('fists', {}), fists3: L('fists', { n: 3 }), souls: L('rain', { n: 11, r: 44, warn: 50, interval: 7, aimed: 0.5, color: '#c8a8ff' }),
        wall: L('bars', { n: 3, thick: 48, gapW: 160, warn: 70, color: '#c8a8ff' }), wallV: L('bars', { n: 3, thick: 48, gapW: 160, warn: 70, vertical: true, color: '#c8a8ff' }),
        dirge: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.3, rot: 0.16, color: '#d8d0b8' }), curse: L('clouds', { n: 4, r: 62, life: 360, warn: 48, dmg: 0.7, color: '#a070ff' }),
        blast: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), pillars: L('pillars', { n: 3, max: 8 }), orbs: L('homing', { n: 5, speed: 1.7, color: '#c8a8ff' }),
      },
      phases: [
        { name: 'The Court', attacks: ['raise', 'chant', 'souls'], idle: [36, 62] },
        { name: 'Reaching Hands', attacks: ['fists', 'raise', 'curse', 'souls', 'wall'], idle: [30, 54], enter: [L('raise', null)] },
        { name: 'Crown of Bone', attacks: ['fists3', 'orbs', 'wallV', 'dirge', 'curse'], idle: [26, 46], enter: [L('shrink', { ring: 1, tile: T.PIT }), L('pillars', { n: 3, max: 8 })] },
        { name: 'Hollow Throne', attacks: ['fists3', 'orbs', 'souls', 'dirge', 'wall', 'raise'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
        { name: 'REQUIEM', attacks: ['blast', 'fists3', 'orbs', 'dirge', 'wallV'], idle: [15, 30], enter: [L('shrink', { ring: 3, tile: T.LAVA })] },
      ],
      phaseOf(e) {
        const skulls = e.parts.filter(p => p.kind === 'skull' && !p.dead).length, hands = e.parts.filter(p => p.kind === 'arm' && !p.dead).length;
        if (skulls) return 0; if (hands) return 1;
        const core = e.parts.find(p => p.id === 'core'); const f = core.hp / core.maxHp; return f > 0.58 ? 2 : f > 0.25 ? 3 : 4;
      } },
  };
  Object.assign(ED.bosses.DEFS, FDEFS); Object.assign(ED.bosses.MEGAS, MDEFS);
  P.track('bosses', ED.bosses.DEFS); P.track('megas', ED.bosses.MEGAS);

  // ------------------------------------------------------------------ part geometry + art (plain shapes, cheap)
  const POS = {
    pylon(e, p) { return [[170, 150], [790, 150], [170, 430], [790, 430]][p.ang | 0]; },
    rod(e, p, g, t) { const a = p.ang + t * 0.012; return [e.x + Math.cos(a) * e.r * 1.32, e.y + Math.sin(a) * e.r * 1.05]; },
    cloud(e, p, g, t) { return [e.x + p.side * e.r * 1.55, e.y - e.r * 0.3 + Math.sin(t * 0.04 + p.side) * 12]; },
    skull(e, p, g, t) { const a = p.ang + t * 0.01; return [e.x + Math.cos(a) * e.r * 1.28, e.y + Math.sin(a) * e.r * 1.0 + Math.sin(t * 0.06 + p.ang) * 6]; },
  };
  Object.assign(ED.partPos, POS);
  const PD = ED.partDraw, R = () => ED.render;
  PD.pylon = (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : '#3a3a4a'; c.fillRect(p.x - p.r * 0.5, p.y - p.r * 0.2, p.r, p.r * 1.1); c.strokeRect(p.x - p.r * 0.5, p.y - p.r * 0.2, p.r, p.r * 1.1);
    c.fillStyle = fl ? '#fff' : (vul ? '#ffe14a' : '#8a7a2a'); c.beginPath(); c.moveTo(p.x, p.y - p.r * 1.1); c.lineTo(p.x + p.r * 0.45, p.y - p.r * 0.2); c.lineTo(p.x - p.r * 0.45, p.y - p.r * 0.2); c.closePath(); c.fill(); c.stroke();
    if (vul) R().glow(c, p.x, p.y - p.r * 0.6, p.r * 1.2, '#ffe14a', 0.25 + 0.15 * Math.sin(t * 0.3));
  };
  PD.rod = (c, e, p, vul, fl, t) => {
    c.translate(p.x, p.y); c.rotate(Math.sin(t * 0.03 + p.ang) * 0.2); c.fillStyle = fl ? '#fff' : (vul ? '#fff6a0' : '#6a6a8a');
    c.beginPath(); c.moveTo(0, -p.r * 1.2); c.lineTo(p.r * 0.5, p.r * 0.6); c.lineTo(-p.r * 0.5, p.r * 0.6); c.closePath(); c.fill(); c.stroke();
    if (vul) R().glow(c, 0, -p.r * 0.9, p.r, '#ffe14a', 0.3);
  };
  PD.cloud = (c, e, p, vul, fl) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#dfe4ff' : '#8a90b0');
    for (const [dx, dy, k] of [[-0.6, 0.15, 0.7], [0, -0.2, 0.95], [0.6, 0.1, 0.75], [0.1, 0.35, 0.7]]) { c.beginPath(); c.arc(p.x + dx * p.r, p.y + dy * p.r, p.r * k * 0.7, 0, TAU); c.fill(); }
  };
  PD.skull = (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#f4ecd0' : '#a8a088'); c.beginPath(); c.arc(p.x, p.y - 2, p.r * 0.85, 0, TAU); c.fill(); c.stroke(); c.fillRect(p.x - p.r * 0.5, p.y + p.r * 0.45, p.r, p.r * 0.45);
    c.fillStyle = '#1a1020'; c.beginPath(); c.arc(p.x - p.r * 0.32, p.y - 2, p.r * 0.22, 0, TAU); c.arc(p.x + p.r * 0.32, p.y - 2, p.r * 0.22, 0, TAU); c.fill();
    if (vul) { c.fillStyle = '#c8a8ff'; c.fillRect(p.x - p.r * 0.38, p.y - 4, p.r * 0.12, p.r * 0.12); c.fillRect(p.x + p.r * 0.26, p.y - 4, p.r * 0.12, p.r * 0.12); }
  };
  const BD = ED.bossDraw;
  BD.frostwarden = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.45); c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 - Math.PI / 2; c.lineTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05); } c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 - Math.PI / 2; c.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7); } c.closePath(); c.fill();
    c.fillStyle = '#e8f8ff'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * r * 0.95, y - r * 0.2); c.lineTo(x + s * r * 1.55, y - r * 0.9 + Math.sin(t * 0.05) * 4); c.lineTo(x + s * r * 1.1, y + r * 0.25); c.closePath(); c.fill(); c.stroke(); }
    c.fillStyle = '#10243a'; c.fillRect(x - r * 0.4, y - r * 0.15, r * 0.8, r * 0.2); c.fillStyle = '#9ff0ff'; c.fillRect(x - r * 0.3, y - r * 0.1, r * 0.2, r * 0.1); c.fillRect(x + r * 0.1, y - r * 0.1, r * 0.2, r * 0.1);
  };
  BD.wyrm = (c, e, x, y, r, col, dk, t, face) => {
    const bx = -Math.cos(face), by = -Math.sin(face);
    for (let k = 4; k >= 1; k--) { c.fillStyle = darker(col, 0.15 + k * 0.06); c.beginPath(); c.arc(x + bx * r * 0.7 * k, y + by * r * 0.7 * k + Math.sin(t * 0.08 + k) * 4, r * (0.95 - k * 0.12), 0, TAU); c.fill(); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
    c.save(); c.translate(x, y); c.rotate(face); c.fillStyle = '#fff0c8'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(r * 0.6, s * r * 0.3); c.lineTo(r * 1.35, s * r * 0.55); c.lineTo(r * 0.9, s * r * 0.05); c.closePath(); c.fill(); c.stroke(); } c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(r * 0.35, -r * 0.3, r * 0.14, 0, TAU); c.arc(r * 0.35, r * 0.3, r * 0.14, 0, TAU); c.fill(); c.restore();
  };
  BD.engine = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#34343f'; c.fillRect(x - r * 0.9, y - r * 0.6, r * 1.8, r * 1.4); c.strokeRect(x - r * 0.9, y - r * 0.6, r * 1.8, r * 1.4);
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.5, 0, TAU); c.fill(); c.fillStyle = '#fffbd0'; c.beginPath(); c.arc(x, y, r * 0.25 + Math.sin(t * 0.3) * 2, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,225,74,0.8)'; c.lineWidth = 2;
    for (const p of e.parts || []) if (p.kind === 'pylon' && !p.dead) { c.beginPath(); c.moveTo(x, y); for (let k = 1; k <= 5; k++) c.lineTo(x + (p.x - x) * k / 5 + U.rnd(-6, 6), y + (p.y - y) * k / 5 + U.rnd(-6, 6)); c.stroke(); }
  };
  BD.tempestra = (c, e, x, y, r, col, dk, t) => {
    for (const [dx, dy, k] of [[-0.55, 0.2, 0.62], [0.55, 0.2, 0.62], [0, -0.1, 0.8], [-0.25, 0.45, 0.5], [0.25, 0.45, 0.5]]) { c.fillStyle = darker(col, 0.3 + k * 0.1); c.beginPath(); c.arc(x + dx * r, y + dy * r, r * k, 0, TAU); c.fill(); }
    c.strokeStyle = 'rgba(255,225,74,0.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - r * 0.4, y - r * 0.5); c.lineTo(x - r * 0.1, y - r * 0.1); c.lineTo(x - r * 0.3, y + r * 0.1); c.lineTo(x, y + r * 0.5); c.stroke();
    c.fillStyle = '#1a1a30'; c.fillRect(x - r * 0.4, y - r * 0.25, r * 0.8, r * 0.2); c.fillStyle = '#ffe14a'; c.fillRect(x - r * 0.3, y - r * 0.2, r * 0.18, r * 0.1); c.fillRect(x + r * 0.12, y - r * 0.2, r * 0.18, r * 0.1);
    if (e.gale) { c.strokeStyle = 'rgba(230,240,255,0.5)'; c.lineWidth = 2; const adv = (t * 16) % 1100, g = e.gale; for (let k = 0; k < 24; k++) { let px = (k * 173) % 960 + (g.st === 'blow' ? g.dx * adv : 0), py = (k * 97) % 576 + (g.st === 'blow' ? g.dy * adv : 0); px = ((px % 960) + 960) % 960; py = ((py % 576) + 576) % 576; c.beginPath(); c.moveTo(px, py); c.lineTo(px + g.dx * 34, py + g.dy * 34); c.stroke(); } }
  };
  BD.ossuary = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.4); for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(x + k * r * 0.28, y + r * 0.45, r * 0.12, r * 0.55, k * 0.12, 0, TAU); c.fill(); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y - r * 0.15, r * 0.82, r * 0.8, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#1a1020'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.2, r * 0.2, r * 0.25, 0, 0, TAU); c.ellipse(x + r * 0.3, y - r * 0.2, r * 0.2, r * 0.25, 0, 0, TAU); c.fill();
    c.fillStyle = '#c8a8ff'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.2, r * 0.07 + Math.sin(t * 0.2) * 1.5, 0, TAU); c.arc(x + r * 0.3, y - r * 0.2, r * 0.07 + Math.sin(t * 0.2) * 1.5, 0, TAU); c.fill();
    c.fillStyle = '#ffd24a'; c.beginPath(); for (let k = 0; k < 5; k++) { c.lineTo(x - r * 0.5 + k * r * 0.25, y - r * 0.95); c.lineTo(x - r * 0.38 + k * r * 0.25, y - r * 1.3 + (k % 2) * 6); } c.lineTo(x + r * 0.5, y - r * 0.95); c.closePath(); c.fill(); c.stroke();
  };
  function darker(col, k) { return ED.render.darker(col, k); }

  // gale streaks for floor-boss-less contexts are drawn by the boss art above; draw hook shows the warning arrow
  ED.hook('draw', V, (g, c, t) => {
    for (const e of g.enemies) if (e.gale && e.gale.st === 'warn') { const d = e.gale; c.save(); c.fillStyle = 'rgba(230,240,255,' + (0.4 + 0.25 * Math.sin(t * 0.4)) + ')'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText(d.dx > 0 ? 'GALE  »»»' : d.dx < 0 ? '«««  GALE' : d.dy > 0 ? 'GALE  ▼ ▼ ▼' : 'GALE  ▲ ▲ ▲', 480, 80); c.restore(); }
  });

  // ------------------------------------------------------------------ signature relics (first kill unlocks)
  const relic = (key, def) => I.addRelic(key, Object.assign({ pack: V, mods: {} }, def));
  relic('frostcrest', { id: 'frostcrest', name: "Frostwarden's Crest", rarity: 'legendary', color: '#bff0ff', mods: { chillVuln: 0.3, freeze: 0.1 }, unique: true, unlock: 'boss:skarn', desc: 'Chilled enemies take 30% more damage; +10% chance to chill. (Unlockable)' });
  relic('wyrmfang', { id: 'wyrmfang', name: 'Dune Wyrm Fang', rarity: 'legendary', color: '#d8b070', mods: { dashI: 6, dashDmg: 6, crit: 0.05 }, unique: true, unlock: 'boss:karsk', desc: 'Longer dash invulnerability, dashes cut foes, +5% crit. (Unlockable)' });
  relic('enginecore', { id: 'enginecore', name: 'Storm Engine Core', rarity: 'legendary', color: '#ffe14a', unique: true, unlock: 'boss:voltaris', desc: 'Every 8th hit calls a bolt of lightning that chains through 3 foes. (Unlockable)',
    on: { hit(g, p, e, dmg) { p.zapN = (p.zapN || 0) + 1; if (p.zapN >= 8) { p.zapN = 0; g.chainLightning(e, Math.max(3, dmg * 1.4), 3, {}); } } } });
  relic('galecharm', { id: 'galecharm', name: 'Gale Charm', rarity: 'epic', color: '#c8d0ff', unique: true, unlock: 'boss:tempestra', desc: 'Dashing releases a shockwave that hurls enemies back. (Unlockable)',
    on: { dash(g, p) { g.zoneEnemies(p.x, p.y, 105, Math.max(3, p.wdmg * 0.9), { speed: 8, color: '#c8d0ff' }); } } });
  relic('deathlesscrown', { id: 'deathlesscrown', name: 'Deathless Crown', rarity: 'legendary', color: '#c8a8ff', unique: true, unlock: 'boss:morrow', desc: 'Once per floor, a killing blow leaves you at 1 HP instead. (Unlockable)',
    on: { hurt(g, p) { if (p.hp <= 0 && p.deathFloor !== g.floorNum) { p.deathFloor = g.floorNum; p.hp = 1; p.inv = Math.max(p.inv, 100); g.toast('DEATHLESS!', '#c8a8ff', 110); g.ringFx(p.x, p.y, 8, 100, '#c8a8ff', 24, 6); g.sfx('revive'); } } } });

  // ------------------------------------------------------------------ Revenants: your echo returns
  const REV = {
    revenant_melee: { id: 'revenant_melee', pack: V, special: true, name: 'Revenant', title: 'Echo of a Fallen Hero', color: '#c8c8e8', r: 27, hp: 205, arena: 'arena_pillars', shape: 'knight', contact: 4, minFloor: 99, unlockText: 'your echo',
      attacks: { slash: L('coneSlash', { arc: 1.8, r: 86, tele: 28, dmg: 1.4 }), dash: L('charge', { tele: 30, speed: 9, dmg: 1.5, ring: 6, stun: 40 }), fan: L('fan', { n: 5, spread: 0.24, reps: 2, speed: 3, color: '#c8c8e8' }), ring: L('radial', { n: 12, reps: 2, gap: 14, speed: 2.5, color: '#c8c8e8' }) },
      phases: [{ at: 1, name: 'Echo', attacks: ['slash', 'dash'], idle: [30, 50] }, { at: 0.5, name: 'Rebound', attacks: ['slash', 'dash', 'fan', 'ring'], idle: [22, 40] }] },
    revenant_ranged: { id: 'revenant_ranged', pack: V, special: true, name: 'Revenant', title: 'Echo of a Fallen Hero', color: '#c8e8d0', r: 24, hp: 175, arena: 'arena_pits', shape: 'archer', contact: 3, minFloor: 99, unlockText: 'your echo',
      attacks: { volley: L('fan', { n: 5, spread: 0.2, reps: 3, gap: 14, speed: 3.5, color: '#c8e8d0' }), snipe: L('chain', { seq: [['blink', { where: 'random', fan: 5, color: '#c8e8d0' }]] }), ring: L('radial', { n: 12, reps: 2, gap: 14, speed: 2.6, color: '#c8e8d0' }), rain: L('rain', { n: 7, r: 40, warn: 46, interval: 8, aimed: 0.7, color: '#c8e8d0' }) },
      phases: [{ at: 1, name: 'Echo', attacks: ['volley', 'snipe'], idle: [30, 50] }, { at: 0.5, name: 'Rebound', attacks: ['volley', 'snipe', 'ring', 'rain'], idle: [22, 40] }] },
    revenant_arcane: { id: 'revenant_arcane', pack: V, special: true, name: 'Revenant', title: 'Echo of a Fallen Hero', color: '#e0c8ff', r: 24, hp: 180, arena: 'arena_round', shape: 'witch', contact: 3, minFloor: 99, unlockText: 'your echo',
      attacks: { orbs: L('homing', { n: 4, speed: 1.7, dmg: 1, color: '#e0c8ff' }), helix: L('spiral', { arms: 3, frames: 80, speed: 2.1, color: '#e0c8ff' }), vanish: L('blink', { where: 'random', ring: 8, color: '#e0c8ff' }), pillars: L('rain', { n: 7, r: 44, warn: 44, interval: 8, aimed: 0.75, color: '#e0c8ff' }) },
      phases: [{ at: 1, name: 'Echo', attacks: ['orbs', 'vanish'], idle: [30, 50] }, { at: 0.5, name: 'Rebound', attacks: ['orbs', 'vanish', 'helix', 'pillars'], idle: [22, 40] }] },
  };
  Object.assign(ED.minibosses.defs, REV);
  const kitOf = (classId) => { const c = I.CLASSES[classId], k = c && I.WEAPONS[c.weapon] && I.WEAPONS[c.weapon].kind; return ['bow', 'boomerang', 'flask', 'chakram'].includes(k) ? 'revenant_ranged' : k === 'staff' ? 'revenant_arcane' : 'revenant_melee'; };
  const rankOf = r => (I.RARITY[r] || I.RARITY.common).rank;
  const RANK_NAMES = ['Echo', 'Wraith', 'Shade', 'Nemesis', 'Dread Nemesis'];
  const RANK_MODS = [[], [], ['hasted'], ['hasted', 'armored'], ['hasted', 'armored', 'relentless']];
  ED.nemesis = { kitOf, REV, RANK_NAMES, rankLabel: (n) => RANK_NAMES[(n.rank || 1) - 1] + ' of the ' + I.CLASSES[n.cls].name };

  // --- it remembers: record the death. If YOUR ECHO is what killed you, it ranks up instead (keeping its grudge).
  ED.hook('runEnd', V, (g, victory) => {
    const r = g.run, p = g.player, M = ED.save.meta; if (victory || !r || r.floorNum < 2 || !p) return;
    const old = M.nemesis;
    if (r.lastHitId === 'revenant' && old && I.CLASSES[old.cls]) { old.rank = Math.min(5, (old.rank || 1) + 1); old.slain = (old.slain || 0) + 1; ED.save.save(); return; }
    const relics = Object.keys(p.relics).filter(id => { const d = I.relic(id); return d && !d.passive && !d.hidden; }).sort((a, b) => rankOf(I.relic(b).rarity) - rankOf(I.relic(a).rarity)).slice(0, 3);
    M.nemesis = { cls: r.classId, floor: r.floorNum, killer: r.killedBy || 'the dark', killerId: r.lastHitId || null, weaponType: p.weapon.type, rarity: p.weapon.rarity, relics, seed: r.seed, rank: 1, slain: 0 };
    ED.save.save();
  });

  /** build the echo's mini boss spec: its class kit + a signature move borrowed from whatever killed you + rank scaling */
  function revenantSpec(g, n, base) {
    const rank = Math.max(1, Math.min(5, n.rank || 1)), spec = { defId: kitOf(n.cls), floor: base.floor, tier: base.tier, mods: RANK_MODS[rank - 1].slice(), duo: false, adds: false, name: ED.nemesis.rankLabel(n), title: 'Slain on floor ' + n.floor + ' by ' + n.killer, isMini: true, revenant: true, nemesis: n, hpMul: 1 + 0.4 * (rank - 1), attacks: {}, extraAttacks: [], extraAll: rank >= 4 };
    const kid = n.killerId, bd = kid && ED.bosses.def(kid);
    if (bd && !bd.parts && !bd.mega && P.ok(bd) && bd.phases) {                       // killed by a boss: it learned that boss's moves
      const names = bd.phases[0].attacks.map(a => (Array.isArray(a) ? a[0] : a)).filter(nm => bd.attacks[nm]).slice(0, 2);
      for (const nm of names) spec.extraAttacks.push(['@' + bd.id + ':' + nm, null]);
      spec.learned = bd.name;
    } else if (kid && ED.enemyTypes[kid] && kid !== 'boss' && P.ok(ED.enemyTypes[kid]) && !ED.enemyTypes[kid].noElite) {      // killed by a foe: it brings that foe along
      spec.attacks.legion = L('summon', { types: [kid], n: 2, max: 4, hpMul: 0.8 }); spec.extraAttacks.push('legion'); spec.learned = ED.enemyTypes[kid].name;
    } else { spec.attacks.fall = L('rain', { n: 8, r: 44, warn: 46, interval: 7, aimed: 0.7, color: '#c8c8e8' }); spec.extraAttacks.push('fall'); spec.learned = 'the dark'; }
    return spec;
  }
  ED.nemesis.revenantSpec = revenantSpec;

  ED.hook('floorStart', V, (g) => {
    const n = ED.save.meta.nemesis; if (!n || g.run.nemesisDone || !I.CLASSES[n.cls]) return;
    const rng = new ED.RNG(g.run.seed + ':nemesis'), lo = (n.rank || 1) >= 3 ? 2 : 3, target = lo + rng.int(0, 3);      // a stronger grudge finds you earlier
    if (g.floorNum !== target) return;
    const room = g.floor.rooms.find(r => r.type === 'miniboss' && r.mini && !r.mini.revenant); if (!room) return;
    room.mini = revenantSpec(g, n, room.mini); g.run.nemesisDone = true;
  });
  ED.hook('selectUI', V, (g, c) => { const n = ED.save.meta.nemesis; if (n && I.CLASSES[n.cls]) ED.ui.text(c, '☠ ' + ED.nemesis.rankLabel(n) + ' stalks you (slain on floor ' + n.floor + ' by ' + n.killer + ')' + ((n.rank || 1) > 1 ? ' — it has beaten you ' + (n.slain || 0) + 'x' : ''), C.W / 2, 592, 11, '#c8c8e8', 'center', false); });
  ED.hook('roomEnter', V, (g, room) => { if (room.type === 'miniboss' && room.mini && room.mini.revenant && !g.rt.revTold) { g.rt.revTold = true; const m = room.mini; g.after(30, () => g.toast((m.nemesis.rank || 1) > 1 ? 'The ' + m.name.split(' of ')[0] + ' remembers you. It has learned from ' + m.learned + '.' : 'A familiar presence waits here... (it carries ' + m.learned + ')', '#c8c8e8', 200)); } });
  ED.hook('miniDefeated', V, (g, spec) => {
    if (!spec.revenant) return;
    const n = spec.nemesis, rank = n.rank || 1, rng = g.rt.rng.fork('rev'), items = [];
    if (I.WEAPONS[n.weaponType] && P.ok(I.WEAPONS[n.weaponType])) { const rk = Math.min(3, rankOf(n.rarity) + (rank >= 3 ? 1 : 0)); items.push(I.rollWeapon(rng, g.floorNum, { type: n.weaponType, rarity: I.RARITY_ORDER[Math.max(1, rk)] })); }
    for (const id of n.relics || []) { const d = I.relic(id); if (d && P.ok(d)) items.push({ cat: 'relic', id, uid: ED.id() }); }
    if (items.length) { g.offerChoice(items.slice(0, 3), 480, 170); g.toast('Your echo gives back what you lost — choose one.', '#c8c8e8', 200); }
    if (rank >= 3) g.addInter({ type: 'healfont', x: 330, y: 400, r: 18, color: '#ff4a6a', prompt: () => 'Echo\'s Gift: +1 Heart Container', use: (gg, it) => { gg.player.bonusHp += 4; I.recalc(gg.player); gg.healPlayer(4); it.dead = true; gg.sfx('levelup'); gg.ringFx(gg.player.x, gg.player.y, 10, 90, '#ff4a6a', 24, 5); } });
    if (rank >= 4) { const offers = []; for (let i = 0; i < 3; i++) offers.push(I.rollRelic(rng, g.floorNum + 2, { relics: g.player.relics, minRank: 3, noRisk: true, exclude: offers.map(o => o.id) })); g.after(40, () => { g.offerChoice(offers, 480, 330); g.toast('A Dread Nemesis falls — claim a legendary spoil.', '#ffd24a', 200); }); }
    if (P.on('v6')) { const M = ED.save.meta; M.embers = (M.embers || 0) + 15 * rank; g.toast('+' + 15 * rank + ' embers', '#ffb04a', 120); }
    ED.save.meta.nemesis = null; ED.save.save(); g.run.nemesisBeaten = true;
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

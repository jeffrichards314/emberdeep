/* EMBERDEEP — bosses.js
 * Boss runtime (shared with mini bosses): phase manager, generator-script runner, multi-part
 * bodies with ordered vulnerability, tier scaling (modifiers, pairs, fusions), enrage timers,
 * plus the data for 4 floor bosses and 3 MEGA bosses (floors 5, 10, 15, ...).
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, C = ED.C, T = ED.T;
  const TAU = U.TAU;
  const X = () => ED.attacks;
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const roman = n => ROMAN[n] || String(n);

  // ================================================================= boss modifiers (tier 3+)
  const BOSS_MODS = {
    hasted:     { id: 'hasted', name: 'Hasted', color: '#7fe0ff', desc: 'Attacks 25% faster', apply(e) { e.rate0 *= 1.25; e.sc.spd *= 1.08; } },
    armored:    { id: 'armored', name: 'Armored', color: '#c0c8d8', desc: 'Takes 18% less damage', apply(e) { e.armor = 0.18; } },
    vampiric:   { id: 'vampiric', name: 'Vampiric', color: '#c02a5a', desc: 'Heals when it wounds you', onHitPlayer(e, g) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.012); } },
    volatile:   { id: 'volatile', name: 'Volatile', color: '#ff8a2a', desc: 'Detonates between phases', onPhase(e, g) { g.ringShot(e, 18, 2.8, 0, { dmg: 0.7, color: '#ff8a2a' }); g.shake(8); } },
    relentless: { id: 'relentless', name: 'Relentless', color: '#ff4a9a', desc: 'Barely pauses between attacks', apply(e) { e.idleMul = 0.5; } },
    regenerating:{ id: 'regenerating', name: 'Regenerating', color: '#8ae06a', desc: 'Slowly recovers HP', update(e, g) { if (e.hp < e.maxHp && g.frame % 20 === 0 && !e.parts) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.0007); } },
  };

  // ================================================================= floor boss definitions
  const L = (name, o) => [name, o];
  const DEFS = {
    vael: {
      id: 'vael', name: 'Vael', title: 'the Hollow Knight', color: '#9aa6ff', accent: '#e8ecff', r: 42, hp: 430, rScale: 1.0, hpScale: 0.97, arena: 'arena_pillars', shape: 'knight', contact: 5,
      teaches: 'Read the telegraphs. Dash THROUGH wide swings, not away from them.',
      unlock: { boss: 'vael' },
      attacks: {
        cleave:   L('coneSlash', { arc: 1.9, r: 118, tele: 38, dmg: 1.3 }),
        cleave2:  L('coneSlash', { arc: 1.9, r: 128, tele: 30, dmg: 1.5, times: 2, gap: 6 }),
        lunge:    L('charge', { tele: 40, speed: 9.2, dmg: 1.45 }),
        blades:   L('fan', { n: 5, spread: 0.24, reps: 2, gap: 18, speed: 3.2, dmg: 0.9, color: '#cfd8ff' }),
        spin:     L('slamRing', { r: 72, tele: 30, rings: 1, speed: 3.4, gapW: 1.0, color: '#cfd8ff', bullets: 10 }),
        step:     L('chain', { seq: [['blink', { where: 'behind', fan: 5, color: '#cfd8ff' }], ['coneSlash', { tele: 22, r: 118 }]] }),
        phantoms: L('summon', { types: ['bonesoldier'], n: 2, max: 5, hpMul: 0.8 }),
        storm:    L('radial', { n: 16, reps: 3, gap: 14, speed: 2.4, rot: 0.17, color: '#cfd8ff' }),
      },
      phases: [
        { at: 1.0,  name: 'The Duelist', attacks: ['cleave', 'lunge', 'blades'], idle: [44, 74] },
        { at: 0.62, name: 'Fury', attacks: ['cleave2', 'lunge', 'blades', 'spin'], idle: [26, 50] },
        { at: 0.30, name: 'Phantom Knight', attacks: ['cleave2', 'lunge', 'step', 'spin', 'phantoms'], idle: [20, 42], enter: [L('summon', { types: ['bonesoldier'], n: 2, max: 5, hpMul: 0.8 })] },
        { at: 0.13, minTier: 2, name: 'Hollow Fury', attacks: ['cleave2', 'step', 'storm', 'lunge', 'spin'], idle: [16, 34] },
      ],
    },
    mycelia: {
      id: 'mycelia', name: 'Mycelia', title: 'Queen of Spores', color: '#9be86a', accent: '#e8ffd0', r: 46, hp: 480, rScale: 1.0, hpScale: 0.99, arena: 'arena_round', shape: 'mushroom', contact: 4,
      teaches: 'Kill the adds, avoid the spore clouds, and keep moving.',
      unlock: { boss: 'mycelia' },
      attacks: {
        clouds:   L('clouds', { n: 3, r: 64, life: 380, color: '#8ae06a' }),
        vines:    L('vines', { n: 3, spread: 0.62, w: 44, tele: 46, color: '#7ae06a' }),
        shrooms:  L('summon', { types: ['imp'], n: 3, max: 7, hpMul: 0.9 }),
        spores:   L('radial', { n: 14, reps: 3, gap: 16, speed: 1.8, wave: 0.9, color: '#9be86a', rot: 0.16 }),
        sporeRain:L('rain', { n: 9, r: 52, interval: 9, color: '#8ae06a', warn: 54, aimed: 0.5 }),
        leap:     L('leap', { r: 92, ring: 1, bullets: 8, color: '#8ae06a' }),
        helix:    L('spiral', { arms: 3, frames: 84, speed: 1.9, color: '#9be86a', rot: 0.06 }),
        vines2:   L('vines', { n: 4, spread: 0.5, w: 40, tele: 40, waves: 2, color: '#7ae06a' }),
      },
      phases: [
        { at: 1.0,  name: 'Bloom', attacks: ['clouds', 'vines', 'shrooms'], idle: [36, 66] },
        { at: 0.64, name: 'Spore Storm', attacks: ['clouds', 'spores', 'leap', 'vines', 'shrooms'], idle: [28, 52] },
        { at: 0.32, name: 'Rot', attacks: ['clouds', 'sporeRain', 'helix', 'vines2', 'leap'], idle: [22, 44], enter: [L('clouds', { n: 4, r: 70, life: 520 })] },
        { at: 0.12, minTier: 2, name: 'Deathcap', attacks: ['sporeRain', 'helix', 'vines2', 'spores', 'shrooms'], idle: [16, 34] },
      ],
    },
    pyrax: {
      id: 'pyrax', name: 'Pyrax', title: 'the Forge Tyrant', color: '#ff7a2a', accent: '#ffe0a0', r: 50, hp: 540, rScale: 1.01, hpScale: 1.01, arena: 'arena_round', shape: 'furnace', contact: 5,
      teaches: 'The arena is part of the fight: the molten edge keeps creeping inward.',
      unlock: { boss: 'pyrax' },
      attacks: {
        breath:   L('beams', { n: 1, len: 360, w: 66, warn: 42, life: 96, rot: 0.03, dmg: 1.15, color: '#ff7a2a' }),
        breath2:  L('beams', { n: 2, len: 380, w: 60, warn: 44, life: 100, rot: 0.026, dmg: 1.15, color: '#ff7a2a' }),
        meteors:  L('rain', { n: 9, r: 56, interval: 8, shrapnel: 5, aimed: 0.5, warn: 56 }),
        stomp:    L('leap', { r: 100, ring: 1, bullets: 10, color: '#ff7a2a' }),
        slam:     L('slamRing', { r: 96, tele: 36, rings: 2, speed: 3, gaps: 1, gapW: 0.9, color: '#ff9a4a' }),
        charge:   L('charge', { tele: 38, speed: 9, dmg: 1.8, ring: 8 }),
        fireRing: L('hazardRings', { n: 4, spacing: 34, speed: 2.5, color: '#ff7a2a' }),
        ember:    L('radial', { n: 14, reps: 4, gap: 12, speed: 2.3, rot: 0.2, color: '#ffb04a' }),
      },
      phases: [
        { at: 1.0,  name: 'Smoulder', attacks: ['breath', 'meteors', 'stomp'], idle: [34, 62] },
        { at: 0.66, name: 'Molten Edge', attacks: ['breath', 'slam', 'charge', 'meteors'], idle: [28, 52], enter: [L('shrink', { ring: 1, tile: T.LAVA })] },
        { at: 0.33, name: 'Inferno', attacks: ['breath2', 'fireRing', 'stomp', 'meteors', 'ember'], idle: [22, 44], enter: [L('shrink', { ring: 2, tile: T.LAVA })] },
        { at: 0.12, minTier: 2, name: 'Supernova', attacks: ['breath2', 'fireRing', 'charge', 'ember', 'slam'], idle: [16, 34], enter: [L('shrink', { ring: 3, tile: T.LAVA })] },
      ],
    },
    aegis: {
      id: 'aegis', name: 'Aegis', title: 'the Prism Sentinel', color: '#bfe8ff', accent: '#ffffff', r: 50, hp: 400, rScale: 1.02, hpScale: 1.03, arena: 'arena_cross', shape: 'prism', contact: 5, shielded: true,
      teaches: 'Shatter the prism shards to expose the core — then punish it.',
      unlock: { boss: 'aegis' },
      parts: [
        { id: 's0', kind: 'shard', r: 22, hp: 0.07, group: 0, ang: 0 }, { id: 's1', kind: 'shard', r: 22, hp: 0.07, group: 0, ang: 1 },
        { id: 's2', kind: 'shard', r: 22, hp: 0.07, group: 0, ang: 2 }, { id: 's3', kind: 'shard', r: 22, hp: 0.07, group: 0, ang: 3 },
        { id: 'core', kind: 'core', r: 38, hp: 0.72, group: 1 },
      ],
      attacks: {
        refract:  L('fan', { n: 3, spread: 0.2, reps: 3, gap: 14, speed: 3.2, dmg: 0.9, color: '#bfe8ff', homing: 0 }),
        prism:    L('beams', { n: 2, len: 700, w: 24, warn: 48, life: 110, rot: 0.02, dmg: 0.85, color: '#9fe4ff' }),
        prism4:   L('beams', { n: 4, len: 700, w: 22, warn: 52, life: 110, rot: 0.016, dmg: 0.85, color: '#bfe8ff' }),
        pulse:    L('radial', { n: 14, reps: 3, gap: 14, speed: 2.4, rot: 0.2, color: '#bfe8ff' }),
        orbs:     L('homing', { n: 4, speed: 1.7, color: '#d070ff' }),
        lance:    L('charge', { tele: 36, speed: 10, dmg: 1.6, stun: 24 }),
        grid:     L('bars', { n: 3, thick: 50, gapW: 160, warn: 70, color: '#9fe4ff' }),
        grid2:    L('bars', { n: 3, thick: 50, gapW: 150, warn: 64, vertical: true, color: '#9fe4ff' }),
        blast:    L('screenBlast', { safe: 3, warn: 100, dmg: 1.6 }),
      },
      phases: [
        { at: 1.0,  name: 'Prismatic Guard', attacks: ['refract', 'prism', 'pulse'], idle: [34, 60] },
        { at: 0.66, name: 'Refraction', attacks: ['refract', 'prism4', 'grid', 'orbs'], idle: [28, 52] },
        { at: 0.33, name: 'Total Spectrum', attacks: ['prism4', 'grid', 'grid2', 'pulse', 'lance', 'orbs'], idle: [22, 44] },
        { at: 0.1, minTier: 2, name: 'Shattered Light', attacks: ['blast', 'prism4', 'grid2', 'lance'], idle: [16, 34] },
      ],
    },
  };
  // order of floor bosses (floor n uses ORDER[n % 4])
  const ORDER = ['vael', 'mycelia', 'pyrax', 'aegis'];

  // ================================================================= MEGA bosses
  // parts: group = destroy order (lower first); a part is hittable once every lower group is dead.
  const MEGAS = {
    colossus: {
      id: 'colossus', name: 'Gorrak', title: 'the Stone Colossus', color: '#a09a8a', accent: '#ffd9a0', r: 112, hp: 1150, rScale: 1.0, hpScale: 0.97, arena: 'arena_open', shape: 'colossus', mega: true, contact: 6, megaIndex: 0,
      teaches: 'Break the plates, topple the arms, then crack the core. The floor will not stay still.',
      unlock: { boss: 'colossus', mega: 0 },
      parts: [
        { id: 'p0', kind: 'plate', r: 34, hp: 0.10, group: 0, ang: -2.4 }, { id: 'p1', kind: 'plate', r: 34, hp: 0.10, group: 0, ang: -1.57 }, { id: 'p2', kind: 'plate', r: 34, hp: 0.10, group: 0, ang: -0.74 },
        { id: 'armL', kind: 'arm', r: 48, hp: 0.14, group: 1, side: -1 }, { id: 'armR', kind: 'arm', r: 48, hp: 0.14, group: 1, side: 1 },
        { id: 'core', kind: 'core', r: 56, hp: 0.42, group: 2 },
      ],
      attacks: {
        fists:    L('fists', {}), fists3: L('fists', { n: 3 }),
        rockfall: L('rain', { n: 10, r: 46, interval: 7, aimed: 0.4, color: '#a09a8a', warn: 52 }),
        pound:    L('slamRing', { r: 130, tele: 44, rings: 2, speed: 3, gaps: 2, gapW: 0.75, color: '#ffb070', ringSpacing: 34 }),
        pounds:   L('pounds', {}),
        golems:   L('summon', { types: ['shielded', 'chaser'], n: 3, max: 6, hpMul: 0.8, radius: 200 }),
        eyes:     L('beams', { n: 2, len: 760, w: 30, warn: 50, life: 110, rot: 0.02, dmg: 0.9, color: '#ffb04a' }),
        eyes3:    L('beams', { n: 3, len: 760, w: 28, warn: 52, life: 120, rot: 0.018, dmg: 0.9, color: '#ffb04a' }),
        rings:    L('hazardRings', { n: 4, spacing: 36, speed: 2.4, color: '#ffb070' }),
        pillars:  L('pillars', { n: 3, max: 8 }),
        blast:    L('screenBlast', { safe: 3, warn: 104, dmg: 1.7 }),
        debris:   L('radial', { n: 18, reps: 3, gap: 14, speed: 2.3, rot: 0.14, color: '#d0c0a0' }),
      },
      phases: [
        { name: 'Stoneskin', attacks: ['fists', 'rockfall', 'golems'], idle: [38, 66] },
        { name: 'Shattered Guard', attacks: ['fists', 'pound', 'rockfall', 'golems', 'debris'], idle: [30, 54], enter: [L('golems', null)] },
        { name: 'Exposed Core', attacks: ['eyes', 'pound', 'fists3', 'rings'], idle: [26, 46], enter: [L('shrink', { ring: 1, tile: T.PIT }), L('pillars', { n: 3, max: 8 })] },
        { name: 'Molten Heart', attacks: ['eyes3', 'rings', 'rockfall', 'pounds', 'pillars'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.LAVA })] },
        { name: 'CATACLYSM', attacks: ['blast', 'eyes3', 'rings', 'rockfall', 'pound'], idle: [16, 30], enter: [L('shrink', { ring: 3, tile: T.LAVA })] },
      ],
      phaseOf(e) {
        const alive = id => e.parts.find(p => p.id === id && !p.dead);
        const plates = e.parts.filter(p => p.kind === 'plate' && !p.dead).length;
        const arms = e.parts.filter(p => p.kind === 'arm' && !p.dead).length;
        if (plates) return 0; if (arms) return 1;
        const core = e.parts.find(p => p.id === 'core'); const f = core.hp / core.maxHp;
        return f > 0.58 ? 2 : f > 0.25 ? 3 : 4;
      },
    },
    hydra: {
      id: 'hydra', name: 'Nethys', title: 'the Tidal Hydra', color: '#4de0c8', accent: '#d0fff4', r: 100, hp: 1250, rScale: 1.0, hpScale: 1.0, arena: 'arena_round', shape: 'hydra', mega: true, contact: 6, megaIndex: 1,
      teaches: 'Three heads, three breaths. Sever them in order — the tide is rising.',
      unlock: { boss: 'hydra', mega: 1 },
      parts: [
        { id: 'headL', kind: 'head', elem: 'fire', r: 40, hp: 0.16, group: 0, off: [-190, -70] }, { id: 'headR', kind: 'head', elem: 'frost', r: 40, hp: 0.16, group: 1, off: [190, -70] },
        { id: 'headC', kind: 'head', elem: 'venom', r: 44, hp: 0.18, group: 2, off: [0, -150] }, { id: 'core', kind: 'core', r: 60, hp: 0.5, group: 3 },
      ],
      attacks: {
        flame:    L('beams', { n: 1, len: 640, w: 52, warn: 46, life: 100, rot: 0.022, dmg: 1.0, color: '#ff7a2a', anchorPart: 'headL' }),
        frost:    L('fan', { n: 5, spread: 0.22, reps: 3, gap: 16, speed: 2.6, dmg: 0.9, color: '#9fe4ff' }),
        venom:    L('chain', { seq: [['radial', { n: 12, reps: 2, gap: 14, speed: 2, color: '#8ae06a', wave: 0.8 }], ['clouds', { n: 3, r: 60, life: 360 }]] }),
        tide:     L('hazardRings', { n: 4, spacing: 34, speed: 2.6, color: '#4de0c8' }),
        sweep:    L('bars', { n: 3, thick: 54, gapW: 170, warn: 74, color: '#4de0c8' }),
        sweepV:   L('bars', { n: 3, thick: 54, gapW: 160, warn: 70, vertical: true, color: '#4de0c8' }),
        spawn:    L('summon', { types: ['swarm', 'chaser'], n: 4, max: 8, hpMul: 0.8 }),
        flood:    L('flood', {}),
        crash:    L('leap', { r: 120, ring: 1, bullets: 12, color: '#4de0c8', tele: 50 }),
        spiral:   L('spiral', { arms: 4, frames: 96, speed: 2.0, color: '#4de0c8' }),
        blast:    L('screenBlast', { safe: 3, warn: 104, dmg: 1.7 }),
      },
      phases: [
        { name: 'Three Heads', attacks: [['flame', 'headL'], ['frost', 'headR'], ['venom', 'headC'], 'tide'], idle: [36, 62] },
        { name: 'Two Heads', attacks: [['frost', 'headR'], ['venom', 'headC'], 'tide', 'spawn', 'sweep'], idle: [30, 54], enter: [L('flood', { ring: 1 })] },
        { name: 'Last Head', attacks: [['venom', 'headC'], 'tide', 'sweepV', 'sweep', 'spawn'], idle: [26, 46], enter: [L('flood', { ring: 2 })] },
        { name: 'Tidal Fury', attacks: ['crash', 'spiral', 'tide', 'sweep', 'sweepV'], idle: [22, 40], enter: [L('flood', { ring: 3 }), L('pillars', { n: 4, max: 8 })] },
        { name: 'MAELSTROM', attacks: ['blast', 'crash', 'spiral', 'tide', 'sweepV'], idle: [14, 28], minHp: 0.25 },
      ],
      phaseOf(e) {
        const dead = e.parts.filter(p => p.kind === 'head' && p.dead).length;
        if (dead < 3) return dead;
        const core = e.parts.find(p => p.id === 'core'); return core.hp / core.maxHp > 0.3 ? 3 : 4;
      },
    },
    seraph: {
      id: 'seraph', name: 'Orrery', title: 'the Clockwork Seraph', color: '#d8b04a', accent: '#fff0b0', r: 96, hp: 1400, rScale: 1.01, hpScale: 1.03, arena: 'arena_round', shape: 'seraph', mega: true, contact: 6, megaIndex: 2,
      teaches: 'Gears time its beams. Break the gears, then the wings, then the heart of the clock.',
      unlock: { boss: 'seraph', mega: 2 },
      parts: [
        { id: 'g0', kind: 'gear', r: 32, hp: 0.07, group: 0, ang: 0 }, { id: 'g1', kind: 'gear', r: 32, hp: 0.07, group: 0, ang: 2.09 }, { id: 'g2', kind: 'gear', r: 32, hp: 0.07, group: 0, ang: 4.19 },
        { id: 'wingL', kind: 'wing', r: 46, hp: 0.13, group: 1, side: -1 }, { id: 'wingR', kind: 'wing', r: 46, hp: 0.13, group: 1, side: 1 },
        { id: 'core', kind: 'core', r: 54, hp: 0.53, group: 2 },
      ],
      attacks: {
        gearBeams: L('beams', { n: 3, len: 700, w: 24, warn: 52, life: 130, rot: 0.02, dmg: 0.85, color: '#ffd24a', anchorParts: 'gear' }),
        tick:      L('radial', { n: 12, reps: 5, gap: 10, speed: 2.4, rot: 0.26, color: '#ffd24a' }),
        tock:      L('hazardRings', { n: 4, spacing: 30, speed: 2.7, color: '#ffd24a' }),
        feathers:  L('fan', { n: 7, spread: 0.18, reps: 3, gap: 14, speed: 3.2, dmg: 0.85, color: '#fff0b0' }),
        grid:      L('bars', { n: 4, thick: 48, gapW: 150, warn: 70, color: '#ffd24a' }),
        gridV:     L('bars', { n: 4, thick: 48, gapW: 150, warn: 70, vertical: true, color: '#ffd24a' }),
        orbs:      L('homing', { n: 5, speed: 1.8, color: '#ffd24a' }),
        halo:      L('beams', { n: 4, len: 720, w: 22, warn: 56, life: 130, rot: 0.015, dmg: 0.85, color: '#fff0b0' }),
        blast:     L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }),
        spiral:    L('spiral', { arms: 5, frames: 100, speed: 2.1, color: '#ffd24a' }),
        pillars:   L('pillars', { n: 3, max: 8 }),
        gearsum:   L('summon', { types: ['spinner', 'teleporter'], n: 2, max: 4, hpMul: 0.7 }),
      },
      phases: [
        { name: 'Escapement', attacks: ['gearBeams', 'tick', 'tock'], idle: [34, 60] },
        { name: 'Wingspan', attacks: ['feathers', 'grid', 'tick', 'orbs', 'gearsum'], idle: [28, 50], enter: [L('shrink', { ring: 1, tile: T.PIT })] },
        { name: 'Heart of the Clock', attacks: ['halo', 'gridV', 'tock', 'spiral', 'orbs'], idle: [24, 44], enter: [L('shrink', { ring: 2, tile: T.PIT }), L('pillars', { n: 3, max: 8 })] },
        { name: 'MIDNIGHT', attacks: ['blast', 'halo', 'grid', 'gridV', 'spiral', 'tick'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.LAVA })] },
      ],
      phaseOf(e) {
        const gears = e.parts.filter(p => p.kind === 'gear' && !p.dead).length;
        const wings = e.parts.filter(p => p.kind === 'wing' && !p.dead).length;
        if (gears) return 0; if (wings) return 1;
        const core = e.parts.find(p => p.id === 'core'); return core.hp / core.maxHp > 0.3 ? 2 : 3;
      },
    },
  };
  const MEGA_ORDER = ['colossus', 'hydra', 'seraph'];

  // ================================================================= custom attack library additions
  const lib = () => X().lib;
  // arm fists (Gorrak)
  X().lib.fists = function* (e, g, o) {
    o = Object.assign({ n: 2, r: 82, tele: 50, dmg: 1.5 }, o);
    const n = X().N(e, o.n);
    for (let k = 0; k < n; k++) {
      const side = k % 2 ? 'R' : 'L';
      const arm = e.parts.find(p => p.kind === 'arm' && (p.side === (side === 'L' ? -1 : 1)) && !p.dead) || e.parts.find(p => p.kind === 'arm' && !p.dead);
      const p = g.player; const tx = U.clamp(p.x + (p.vx || 0) * 8, 70, 890), ty = U.clamp(p.y + (p.vy || 0) * 8, 70, 506);
      const dur = g.tele(o.tele);
      g.zoneCircle(e, tx, ty, o.r, dur, e.shotDmg * o.dmg, { color: '#ffb070', burst: true, big: true, onEnd: (gg, z) => { gg.shake(9); gg.ringShot(e, 8, 2.4, Math.random() * TAU, { dmg: 0.5, color: '#d0c0a0', r: 4 }); gg.burst(z.x, z.y, 18, '#a09a8a', 5, 26); gg.sfx('thud'); if (arm) arm.slam = null; } });
      if (arm) arm.slam = { x: tx, y: ty, t: 0, dur };
      g.sfx('telegraph');
      yield dur + 10;
    }
    yield 16 / (e.rate || 1);
  };
  X().lib.pounds = function* (e, g, o) { yield* X().lib.slamRing(e, g, { r: 130, tele: 40, rings: 3, speed: 3.1, gaps: 2, gapW: 0.7, color: '#ffb070', ringSpacing: 30 }); };
  // flood: water tiles creep in (slows the player), rewriting the arena
  X().lib.flood = function* (e, g, o) {
    o = Object.assign({ ring: 1 }, o);
    yield* X().lib.shrink(e, g, { ring: o.ring, tile: T.WATER, warn: 60, color: '#4de0c8' });
  };

  // ================================================================= runtime
  const RUNTIME_DEF = { id: 'boss', name: 'Boss', shape: 'boss', color: '#fff', r: 40, hp: 100, speed: 0, dmg: 4, shot: 4, cost: 14, weight: 0, minFloor: 99, contact: true, noElite: true, update: bossUpdate };

  /** Decide which boss appears on a floor (deterministic from floor number) */
  function forFloor(floor, rng) {
    const tier = D.bossTier(floor), mega = floor % 5 === 0;
    let defId, partnerId = null, fused = false;
    if (mega) {
      const mi = D.bossIndex(floor); defId = MEGA_ORDER[mi];
      if (tier >= 4) { fused = true; partnerId = MEGA_ORDER[(mi + 1) % 3]; }
    } else {
      const i = D.bossIndex(floor); defId = ORDER[i];
      if (tier === 4) partnerId = ORDER[(i + 2) % 4];
      else if (tier >= 5) { fused = true; partnerId = ORDER[(i + 2) % 4]; }
    }
    const def = (mega ? MEGAS : DEFS)[defId];
    const partner = partnerId ? (mega ? MEGAS : DEFS)[partnerId] : null;
    const nMods = tier >= 3 ? Math.min(4, tier - 2) : 0;
    const mods = [];
    const bag = Object.keys(BOSS_MODS);
    const r = rng || new ED.RNG('boss' + floor);
    for (let i = 0; i < nMods && bag.length; i++) mods.push(bag.splice(r.int(0, bag.length - 1), 1)[0]);
    let name = def.name + ', ' + def.title;
    if (partner && !fused) name = def.name + ' & ' + partner.name;
    if (fused) name = def.name + '-' + partner.name + ', the Fused';
    if (tier > 1) name += ' — Tier ' + roman(tier);
    const arena = fused && partner && !mega ? (r.chance(0.5) ? def.arena : partner.arena) : def.arena;
    return { defId, partnerId, fused, tier, floor, mega, name, arena: arena || 'arena_round', mods, color: def.color };
  }

  /** body radius: (linear growth x per-boss scale) clamped to the cap, so the late plateau is flat for every boss */
  function radiusOf(row, F, def) { return Math.min(row.cap, (row.base + row.lin * (F - 1)) * (def.rScale || 1)); }

  function scaleFor(spec) {
    const tier = spec.tier, f = spec.floor;
    return { cnt: Math.min(2.1, 1 + 0.12 * (tier - 1) + 0.012 * (f - 1)), spd: Math.min(1.25, 1 + 0.035 * (tier - 1) + 0.004 * (f - 1)) };
  }

  /** build the boss entity (or entities, for tier-4 pairs) in the current room */
  function spawn(g, spec) {
    const out = [];
    const defs = spec.mega ? MEGAS : DEFS;
    const main = spawnOne(g, spec, defs[spec.defId], 480, 200, spec.partnerId && !spec.fused ? 0.62 : 1, 0, defs[spec.partnerId]);
    out.push(main);
    if (spec.partnerId && !spec.fused) {
      const p = spawnOne(g, spec, defs[spec.partnerId], 480, 400, 0.62, 1, null);
      out.push(p);
      main.partner = p; p.partner = main;
    }
    g.bossCard = { name: spec.name, title: '', color: spec.color, t: 0, dur: 190, mega: spec.mega, tier: spec.tier, mods: spec.mods.map(m => BOSS_MODS[m].name), teaches: defs[spec.defId].teaches };
    return out;
  }

  function spawnOne(g, spec, def, x, y, hpShare, idx, fuseWith) {
    const d = g.dif, F = spec.floor;
    // body size + HP are strict functions of the floor (small per-boss scale) => every boss is bigger & tougher than the last
    let r, hp;
    if (spec.isMini) { r = Math.min(36, def.r * Math.min(1.3, 1 + 0.015 * (F - 1))); hp = def.hp * d.miniHp * (1 + 0.1 * (spec.tier - 1)) * hpShare; }
    else if (spec.mega) { r = radiusOf(D.CURVES.megaRadius, F, def) * (hpShare < 1 ? 0.92 : 1); hp = D.BOSS_BASE.megaHp * (def.hpScale || 1) * d.bossHp * (1 + 0.1 * (spec.tier - 1)) * hpShare; }
    else { r = radiusOf(D.CURVES.bossRadius, F, def) * (hpShare < 1 ? 0.92 : 1); hp = D.BOSS_BASE.hp * (def.hpScale || 1) * d.bossHp * (1 + 0.1 * (spec.tier - 1)) * hpShare; }
    const sc = scaleFor(spec);
    const e = g.spawnEnemy('boss', x, y, {
      def: Object.assign({}, RUNTIME_DEF, { name: def.name, color: def.color }), hp, r, silent: true, extra: {
        boss: true, big: true, bdef: def, spec, tier: spec.tier, phaseIdx: -1, intro: 170, sc, co: null, wait: 0, idleT: 60, fightT: 0, lastAtk: null,
        color: def.color, shotDmg: (spec.isMini ? 2.8 : (spec.mega ? 3.7 : 3.4)) * d.bossDmg, dmg: (def.contact || 5) * d.bossDmg * (spec.isMini ? 0.8 : 1), bossName: spec.name, mini: !!spec.isMini, idleMul: 1, enraged: false, bmods: [], noKnock: true, kbRes: 1,
        invuln: true, vis: 0, noLoot: true, pidx: idx, hold: false, jump: 0, exposed: 0,
      },
    });
    e.rate0 = e.rate = d.fireRate * (1 + 0.03 * (spec.tier - 1));
    e.phases = buildPhases(def, spec, fuseWith);
    for (const m of spec.mods) { const bm = BOSS_MODS[m]; e.bmods.push(bm); if (bm.apply) bm.apply(e, g); }
    e.rate = e.rate0;
    if (def.parts) buildParts(e, def);
    e.hurtboxes = def.parts ? hurtboxesOf : null;
    if (def.parts) e.takeHit = takeHitParts;
    e.onDeath = bossDeath;
    e.maxHpTotal = e.maxHp;
    if (spec.fused && fuseWith) { e.fuse = fuseWith; }
    ED.save.see('bosses', def.id);
    return e;
  }

  function buildPhases(def, spec, fuseWith) {
    let ph = def.phases.filter(p => !p.minTier || p.minTier <= spec.tier);
    ph = ph.map(p => Object.assign({}, p, { attacks: p.attacks.slice() }));
    if (fuseWith) {                      // fused: borrow another boss's attacks (as [name, owner])
      for (let i = 0; i < ph.length; i++) {
        const src = fuseWith.phases[Math.min(i, fuseWith.phases.length - 1)];
        for (const a of src.attacks.slice(0, 3)) { const nm = typeof a === 'string' ? a : a[0]; ph[i].attacks.push(['@' + fuseWith.id + ':' + nm, null]); }
        ph[i].idle = [Math.round(ph[i].idle[0] * 0.8), Math.round(ph[i].idle[1] * 0.8)];
      }
    }
    return ph;
  }

  // ------------------------------------------------ multi-part bodies
  function buildParts(e, def) {
    e.parts = def.parts.map(pd => ({ id: pd.id, def: pd, kind: pd.kind, group: pd.group, r: pd.r * Math.max(1, e.r / def.r) * (def.mega ? 0.92 : 1), maxHp: pd.hp * e.maxHp, hp: pd.hp * e.maxHp, baseMax: pd.hp * e.maxHp, dead: false, x: e.x, y: e.y, flash: 0, side: pd.side, ang: pd.ang, elem: pd.elem, off: pd.off, slam: null }));
    e.hp = e.parts.reduce((s, p) => s + p.hp, 0); e.maxHp = e.hp;
    e.exposed = 0;
  }
  function partVulnerable(e, part) {
    if (e.invuln) return false;
    if (e.bdef.shielded) return part.kind === 'shard' || (part.kind === 'core' && e.exposed > 0);
    for (const p of e.parts) if (!p.dead && p.group < part.group) return false;
    return true;
  }
  function targetPart(e) { return e.parts.filter(p => !p.dead).sort((a, b) => a.group - b.group || b.maxHp - a.maxHp)[0]; }
  function positionParts(e, g) {
    const t = e.t, def = e.bdef;
    for (const p of e.parts) {
      if (p.dead) continue;
      let x = e.x, y = e.y;
      switch (p.kind) {
        case 'plate': { const a = p.ang + Math.sin(t * 0.02) * 0.08; x = e.x + Math.cos(a) * e.r * 0.82; y = e.y + Math.sin(a) * e.r * 0.74; break; }
        case 'arm': {
          x = e.x + p.side * e.r * 1.42; y = e.y + e.r * 0.28 + Math.sin(t * 0.03 + p.side) * 8;
          if (p.slam) { p.slam.t += g.ts; const k = U.clamp(p.slam.t / (p.slam.dur * 0.8), 0, 1); const ke = U.easeOut(k); x = U.lerp(x, p.slam.x, ke); y = U.lerp(y, p.slam.y, ke); }
          break;
        }
        case 'core': x = e.x; y = e.y + (def.shape === 'colossus' ? -e.r * 0.05 : 0); break;
        case 'head': {
          const bx = e.x + p.off[0] * (e.r / 100), by = e.y + p.off[1] * (e.r / 100);
          x = bx + Math.sin(t * 0.03 + p.off[0]) * 16; y = by + Math.cos(t * 0.04 + p.off[0]) * 12; break;
        }
        case 'gear': { const a = p.ang + t * 0.018; x = e.x + Math.cos(a) * e.r * 1.35; y = e.y + Math.sin(a) * e.r * 1.1; break; }
        case 'wing': { x = e.x + p.side * e.r * 1.5; y = e.y - e.r * 0.2 + Math.sin(t * 0.05 + p.side) * 14; break; }
        case 'shard': { const a = p.ang * Math.PI / 2 + t * 0.03; x = e.x + Math.cos(a) * (e.r + 40); y = e.y + Math.sin(a) * (e.r + 40); break; }
      }
      p.x = x; p.y = y; if (p.flash > 0) p.flash--;
    }
  }
  function hurtboxesOf(g) {
    const e = this, out = [];
    for (const p of e.parts) if (!p.dead) out.push({ x: p.x, y: p.y, r: p.r, e, part: p });
    return out;
  }
  function takeHitParts(g, hb, dmg, o) {
    const e = this;
    let part = hb && hb.part;
    if (!part) { part = targetPart(e); if (!part || !partVulnerable(e, part)) return 0; }
    if (!partVulnerable(e, part)) {
      g.addText(part.x, part.y - part.r, e.invuln ? 'immune' : 'armored', '#9aa0c0', 9); g.sfx('block');
      g.burst(part.x, part.y, 3, '#cfe4ff', 2.5, 10);
      return 0;
    }
    dmg *= (1 - (e.armor || 0)) * (e.vuln || 1);
    if (o.src === 'melee' || o.src === 'proj') { if (g.player.st.execute && part.hp < part.maxHp * 0.3) dmg *= 1 + g.player.st.execute; }
    part.hp -= dmg; part.flash = 6; e.flash = 4;
    g.addText(part.x, part.y - part.r, dmg >= 10 ? Math.round(dmg) : dmg.toFixed(1), o.crit ? '#ffd24a' : '#fff', o.crit ? 17 : 12);
    g.burst(part.x, part.y, o.crit ? 8 : 4, part.kind === 'core' ? '#ffd24a' : e.color, 3, 14);
    g.sfx(o.crit ? 'crit' : 'hit');
    if (o.crit) g.hitstop(3);
    e.hp = e.parts.reduce((s, p) => s + Math.max(0, p.hp), 0);
    for (const m of e.bmods) if (m.onHurt) m.onHurt(e, g);
    if (part.hp <= 0) destroyPart(e, g, part);
    return 0;
  }
  function destroyPart(e, g, part) {
    part.dead = true; part.hp = 0;
    g.explodeFx(part.x, part.y, part.r * 2, e.color);
    g.burst(part.x, part.y, 24, e.color, 6, 30, { size: 4 });
    g.hitstop(8); g.shake(10); g.sfx('bossdie', { vol: 0.5 });
    g.addText(part.x, part.y - part.r - 12, part.kind === 'core' ? 'CORE DESTROYED' : (part.kind + ' destroyed').toUpperCase(), '#ffd24a', 14);
    g.dropPickup('heart', part.x, part.y, 4);
    if (part.kind === 'core') { e.hp = 0; g.killEnemy(e, { src: 'part' }); return; }
    if (e.bdef.shielded && e.parts.filter(p => p.kind === 'shard' && !p.dead).length === 0) {
      e.exposed = 280; e.co = null; e.wait = 0; e.vuln = 1.35;
      g.toast('SHIELDS DOWN — hit the core!', '#9fe4ff', 120); g.flashScreen('#9fe4ff', 0.3);
    }
  }

  // ------------------------------------------------ the update loop
  function pickAttack(e, g) {
    const ph = e.phases[Math.max(0, e.phaseIdx)];
    let pool = ph.attacks.filter(a => {
      const need = Array.isArray(a) ? a[1] : null;
      if (typeof need === 'string' && e.parts && !e.parts.find(p => p.id === need && !p.dead)) return false;
      return true;
    });
    if (!pool.length) pool = ph.attacks;
    let pick, guard = 0;
    do { pick = pool[Math.floor(g.rng.next() * pool.length)]; guard++; } while (guard < 6 && pool.length > 1 && keyOf(pick) === e.lastAtk);
    e.lastAtk = keyOf(pick);
    const name = Array.isArray(pick) ? pick[0] : pick;
    return makeAttack(e, g, name, Array.isArray(pick) ? pick[1] : null);
  }
  const keyOf = a => (Array.isArray(a) ? a[0] : a);
  function resolveEntry(e, name) {
    if (name[0] === '@') { const [id, nm] = name.slice(1).split(':'); const d = e.fuse && e.fuse.id === id ? e.fuse : (DEFS[id] || MEGAS[id]); return d && d.attacks[nm]; }
    return e.bdef.attacks[name];
  }
  function makeAttack(e, g, name, need) {
    const entry = resolveEntry(e, name);
    if (!entry) return (function* () { yield 20; })();
    return runEntry(e, g, entry);
  }
  function runEntry(e, g, entry) {
    if (typeof entry === 'function') return entry(e, g);
    let [lname, params] = entry;
    const f = X().lib[lname];
    if (!f) return (function* () { yield 20; })();
    params = Object.assign({}, params);
    // anchored beams (parts of the body)
    if (params.anchorPart) { const pid = params.anchorPart; params.anchors = () => [e.parts.find(p => p.id === pid && !p.dead) || e]; }
    if (params.anchorParts) { const k = params.anchorParts; params.anchors = () => { const l = e.parts.filter(p => p.kind === k && !p.dead); return l.length ? l : [e]; }; }
    return f(e, g, params);
  }

  function phaseFor(e) {
    if (e.bdef.phaseOf) return e.bdef.phaseOf(e);
    let f = e.hp / e.maxHp;
    if (e.bdef.shielded && e.parts) { const core = e.parts.find(q => q.kind === 'core'); if (core) f = core.hp / core.maxHp; }      // shielded bosses progress by their core
    let idx = 0;
    for (let i = 0; i < e.phases.length; i++) if (f <= (e.phases[i].at === undefined ? 1 : e.phases[i].at)) idx = i;
    return idx;
  }
  function startPhase(e, g, idx) {
    const first = e.phaseIdx < 0;
    e.phaseIdx = Math.min(idx, e.phases.length - 1);
    const ph = e.phases[e.phaseIdx];
    if (e.co) { try { e.co.return(); } catch (x) { /* ignore */ } e.co = null; }
    e.state = null; e.contactMul = 1; e.jump = 0;
    if (!first) {
      for (const z of g.zones) if (z.src === e && z.kind !== 'hazard') z.dead = true;
      for (const b of g.eproj) if (b.src === e) b.dead = true;
      g.toast('PHASE ' + (e.phaseIdx + 1) + ': ' + ph.name.toUpperCase(), e.color, 120);
      for (const m of e.bmods) if (m.onPhase) m.onPhase(e, g);
      g.dropPickup('heart', e.x, e.y + e.r * 0.7, 4);
    }
    e.invuln = true; e.entering = true;
    const gen = (function* () {
      if (!first) yield* X().lib.roar(e, g, { frames: 36 });
      for (const en of ph.enter || []) {
        const entry = en[1] === null ? e.bdef.attacks[en[0]] : en;
        if (entry) yield* runEntry(e, g, entry);
      }
      e.invuln = false; e.entering = false;
    })();
    e.co = gen; e.wait = 0; e.idleT = 20;
  }

  function bossUpdate(e, g) {
    const def = e.bdef, ts = g.ts;
    e.fightT += ts;
    if (e.parts) positionParts(e, g);
    for (const m of e.bmods) if (m.update) m.update(e, g);
    // ---- intro
    if (e.intro > 0) {
      e.intro -= ts; e.invuln = true; e.vis = U.clamp(1 - e.intro / 130, 0, 1);
      if (e.intro <= 0) { e.invuln = false; e.vis = 1; startPhase(e, g, 0); g.fightStarted = true; g.sfx('bossroar'); }
      return;
    }
    if (e.exposed > 0) { e.exposed -= ts; if (e.exposed <= 0) { e.vuln = 1; reviveShards(e, g); } else { e.vis = 1; return; } }
    // ---- enrage (floor 10+)
    const enr = g.dif.enrageFrames;
    if (enr && !e.enraged && !e.partner) {
      const left = enr - e.fightT;
      if (left < 600 && !e.warned) { e.warned = true; g.toast('The boss grows restless...', '#ff9a6a', 120); }
      if (left <= 0) { e.enraged = true; e.rate0 *= 1.35; e.sc = { cnt: e.sc.cnt * 1.25, spd: e.sc.spd * 1.1 }; g.toast('ENRAGED!', '#ff3b3b', 160); g.shake(12); g.sfx('bossroar'); g.flashScreen('#ff0000', 0.35); }
    }
    if (e.enraged && g.frame % 90 === 0) g.eShot(e, Math.atan2(g.player.y - e.y, g.player.x - e.x), 2.6, { dmg: 0.8, color: '#ff4a4a' });
    // ---- phase change
    const want = phaseFor(e);
    if (want > e.phaseIdx && e.phaseIdx >= 0 && !e.entering) startPhase(e, g, e.phaseIdx + 1);      // one phase at a time (never skip an arena rewrite)
    // ---- scripts
    if (e.co) {
      e.wait -= ts;
      let guard = 0;
      while (e.wait <= 0 && e.co && guard++ < 6) {
        let r;
        try { r = e.co.next(); } catch (err) { console.error('boss script error', err); e.co = null; break; }
        if (r.done) { e.co = null; e.idleT = U.rnd(...(e.phases[e.phaseIdx].idle || [30, 50])) * e.idleMul / Math.max(0.6, e.rate); e.state = null; break; }
        e.wait = typeof r.value === 'number' && isFinite(r.value) ? Math.max(0.05, r.value) : 1;
      }
    } else {
      e.idleT -= ts;
      idleMove(e, g);
      if (e.idleT <= 0) { e.co = pickAttack(e, g); e.wait = 0; }
    }
    e.face = Math.atan2(g.player.y - e.y, g.player.x - e.x);
    if (e.hp <= 0 && !e.dead && !e.parts) g.killEnemy(e);
  }
  function reviveShards(e, g) {
    // shards reform at their ORIGINAL strength (+15% per phase, never compounding)
    for (const p of e.parts) if (p.kind === 'shard') { p.dead = false; p.maxHp = p.baseMax * (1 + 0.15 * Math.max(0, e.phaseIdx)); p.hp = p.maxHp; }
    e.hp = e.parts.reduce((s2, q) => s2 + Math.max(0, q.hp), 0);
    g.toast('The shards reform!', '#bfe8ff', 90); g.sfx('shrine');
  }
  function idleMove(e, g) {
    if (e.hold) return;
    const p = g.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    const want = e.bdef.mega ? 0 : 150;
    let sp = (e.bdef.mega ? 0.25 : 0.9) * e.sc.spd;
    if (e.bdef.mega) { const tx = 480 + Math.sin(e.fightT * 0.01) * 80, ty = 250 + Math.cos(e.fightT * 0.013) * 30; ED.phys.move(g, e, (tx - e.x) * 0.02 * g.ts, (ty - e.y) * 0.02 * g.ts); return; }
    const dir = d > want ? 1 : -0.4;
    ED.phys.move(g, e, dx / d * sp * dir * g.ts, dy / d * sp * dir * g.ts);
  }

  // ------------------------------------------------ death
  function bossDeath(g, e) {
    if (e.partner && !e.partner.dead) return;            // pairs: the fight ends when both fall
    g.onBossKilled(e);
  }

  ED.bosses = {
    DEFS, MEGAS, ORDER, MEGA_ORDER, BOSS_MODS, RUNTIME_DEF, roman,
    forFloor, spawn, spawnOne, scaleFor,
    /** body radius of the main boss body on a floor (pairs shrink each body slightly) */
    radiusFor(floor) { const m = floor % 5 === 0, def = (m ? MEGAS : DEFS)[(m ? MEGA_ORDER : ORDER)[D.bossIndex(floor)]]; return radiusOf(m ? D.CURVES.megaRadius : D.CURVES.bossRadius, floor, def); },
    hpFor(floor) { const m = floor % 5 === 0, def = (m ? MEGAS : DEFS)[(m ? MEGA_ORDER : ORDER)[D.bossIndex(floor)]]; return (m ? D.BOSS_BASE.megaHp : D.BOSS_BASE.hp) * (def.hpScale || 1) * D.at(floor).bossHp * (1 + 0.1 * (D.bossTier(floor) - 1)); }, bossUpdate, startPhase, positionParts, destroyPart, partVulnerable,
    def(id) { return DEFS[id] || MEGAS[id]; },
    allIds() { return ORDER.concat(MEGA_ORDER); },
  };
  ED.enemyTypes.boss = RUNTIME_DEF;
  // boss runtime also used by mini bosses
  ED.bossRuntime = { bossUpdate, startPhase, buildPhases, scaleFor, positionParts, pickAttack, runEntry, BOSS_MODS };
})(typeof globalThis !== 'undefined' ? globalThis : this);

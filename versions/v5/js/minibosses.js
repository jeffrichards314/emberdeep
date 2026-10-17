/* EMBERDEEP — minibosses.js
 * 11 unique mini bosses (data table).  They share the boss runtime (phases, telegraphed
 * scripts, enrage) but are smaller: 1-2 phases, 2-3 attacks, themed arena, own health bar.
 * Deeper floors add tiers, modifiers, adds, enrage timers and duo fights.
 * First kill of each one permanently adds items to the global pool ("UNLOCKED").
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, T = ED.T;
  const L = (name, o) => [name, o];

  const DEFS = {
    gravewarden: {
      id: 'gravewarden', name: 'Gravewarden', title: 'Keeper of Bones', color: '#e8e0c8', r: 26, hp: 170, arena: 'arena_ruins', shape: 'skull', contact: 4, minFloor: 1,
      unlockText: 'Bone Charm + Gravity Well',
      attacks: {
        slash: L('coneSlash', { arc: 1.7, r: 80, tele: 30, dmg: 1.4 }), lunge: L('charge', { tele: 34, speed: 8, dmg: 1.5, stun: 40 }),
        bones: L('fan', { n: 3, spread: 0.3, reps: 2, speed: 2.8, color: '#e8e0c8' }), raise: L('summon', { types: ['bonesoldier'], n: 2, max: 4, hpMul: 0.8 }),
      },
      phases: [{ at: 1, name: 'Warden', attacks: ['slash', 'lunge'], idle: [36, 60] }, { at: 0.5, name: 'Grave Call', attacks: ['slash', 'lunge', 'bones'], idle: [28, 50], enter: [L('raise', null)] }],
    },
    slimeking: {
      id: 'slimeking', name: 'Gelatinous Regent', title: 'The Slime King', color: '#7ae06a', r: 28, hp: 190, arena: 'arena_round', shape: 'blob', contact: 4, minFloor: 1,
      unlockText: 'Gel Core',
      attacks: {
        hop: L('leap', { r: 66, tele: 40, bullets: 6, color: '#7ae06a', times: 2 }), spit: L('fan', { n: 5, spread: 0.3, reps: 2, speed: 2.4, color: '#9fff8a' }),
        split: L('summon', { types: ['imp'], n: 3, max: 6, hpMul: 0.9 }),
      },
      phases: [{ at: 1, name: 'Squelch', attacks: ['hop', 'spit'], idle: [34, 56] }, { at: 0.5, name: 'Overflow', attacks: ['hop', 'spit', 'split'], idle: [26, 46] }],
    },
    hawkeye: {
      id: 'hawkeye', name: 'Hawkeye', title: 'the Unerring', color: '#e0c08a', r: 22, hp: 140, arena: 'arena_pillars', shape: 'archer', contact: 3, minFloor: 3,
      unlockText: "Hunter's Mark",
      attacks: {
        volley: L('fan', { n: 5, spread: 0.2, reps: 3, gap: 14, speed: 3.6, color: '#e0c08a' }), snipe: L('chain', { seq: [['blink', { where: 'random', fan: 5, color: '#e0c08a' }]] }),
        ring: L('radial', { n: 12, reps: 2, gap: 14, speed: 2.6, color: '#e0c08a' }), arrows: L('rain', { n: 6, r: 38, warn: 44, interval: 8, aimed: 0.7, color: '#e0c08a' }),
      },
      phases: [{ at: 1, name: 'Marksman', attacks: ['volley', 'snipe'], idle: [30, 50] }, { at: 0.5, name: 'Rain of Arrows', attacks: ['volley', 'snipe', 'ring', 'arrows'], idle: [22, 40] }],
    },
    ironhorn: {
      id: 'ironhorn', name: 'Ironhorn', title: 'the Raging Bull', color: '#d0a070', r: 30, hp: 200, arena: 'arena_open', shape: 'bull', contact: 5, minFloor: 3,
      unlockText: 'Bull Horn',
      attacks: {
        charge: L('charge', { tele: 36, speed: 10, dmg: 1.6, ring: 6, stun: 46 }), charge2: L('charge', { tele: 28, speed: 11, dmg: 1.6, times: 2, stun: 34 }),
        stomp: L('slamRing', { r: 70, tele: 34, rings: 1, speed: 3, color: '#d0a070' }),
      },
      phases: [{ at: 1, name: 'Charge!', attacks: ['charge', 'stomp'], idle: [30, 52] }, { at: 0.5, name: 'Stampede', attacks: ['charge2', 'stomp', 'charge'], idle: [22, 40] }],
    },
    cinderwitch: {
      id: 'cinderwitch', name: 'Cinder Witch', title: 'Mistress of Flame', color: '#ff6a2a', r: 24, hp: 160, arena: 'arena_round', shape: 'witch', contact: 3, minFloor: 3,
      unlockText: 'Cinder Heart + Spirit Call',
      attacks: {
        pillars: L('rain', { n: 7, r: 46, warn: 46, interval: 7, aimed: 0.7, color: '#ff6a2a' }), helix: L('spiral', { arms: 2, frames: 70, speed: 2.1, color: '#ff8a3a' }),
        vanish: L('blink', { where: 'random', ring: 8, color: '#ff6a2a' }),
      },
      phases: [{ at: 1, name: 'Kindling', attacks: ['pillars', 'vanish'], idle: [30, 50] }, { at: 0.5, name: 'Wildfire', attacks: ['pillars', 'helix', 'vanish'], idle: [22, 40] }],
    },
    broodmother: {
      id: 'broodmother', name: 'Brood Mother', title: 'Weaver of Webs', color: '#a06aa0', r: 28, hp: 180, arena: 'arena_ruins', shape: 'spider', contact: 4, minFloor: 4,
      unlockText: 'Web-Spun Cloak',
      attacks: {
        web: L('clouds', { n: 3, r: 56, life: 340, color: '#d0d8e8', warn: 40, dmg: 0.5 }), brood: L('summon', { types: ['spider'], n: 4, max: 8, hpMul: 0.9 }),
        pounce: L('leap', { r: 66, tele: 38, bullets: 6, color: '#a06aa0' }),
      },
      phases: [{ at: 1, name: 'Weaving', attacks: ['web', 'brood'], idle: [32, 54] }, { at: 0.5, name: 'Brood Swarm', attacks: ['web', 'brood', 'pounce'], idle: [24, 42] }],
    },
    rimewraith: {
      id: 'rimewraith', name: 'Rimewraith', title: 'the Winter Shade', color: '#9fe4ff', r: 24, hp: 160, arena: 'arena_cross', shape: 'wraith', contact: 3, minFloor: 4,
      unlockText: 'Rime Crown',
      attacks: {
        shards: L('fan', { n: 7, spread: 0.2, reps: 2, speed: 3.3, color: '#9fe4ff' }), frostRing: L('hazardRings', { n: 3, spacing: 36, speed: 2.5, color: '#9fe4ff' }),
        drift: L('chain', { seq: [['blink', { where: 'behind', color: '#9fe4ff' }], ['coneSlash', { arc: 1.8, r: 90, tele: 24, color: '#9fe4ff' }]] }),
      },
      phases: [{ at: 1, name: 'Chill', attacks: ['shards', 'drift'], idle: [30, 50] }, { at: 0.5, name: 'Whiteout', attacks: ['shards', 'frostRing', 'drift'], idle: [22, 42] }],
    },
    lichacolyte: {
      id: 'lichacolyte', name: 'Lich Acolyte', title: 'Bound to the Phylactery', color: '#a8ff9a', r: 24, hp: 170, arena: 'arena_throne', shape: 'lich', contact: 3, minFloor: 5,
      unlockText: 'Phylactery Shard',
      attacks: {
        raise: L('summon', { types: ['bonesoldier'], n: 3, max: 6, hpMul: 0.8 }), orbs: L('homing', { n: 3, speed: 1.7, color: '#a8ff9a' }), helix: L('spiral', { arms: 2, frames: 70, speed: 2.0, color: '#a8ff9a' }),
      },
      phases: [{ at: 1, name: 'Necromancy', attacks: ['raise', 'orbs'], idle: [32, 54] }, { at: 0.5, name: 'Dark Rite', attacks: ['raise', 'orbs', 'helix'], idle: [24, 42] }],
    },
    rockjaw: {
      id: 'rockjaw', name: 'Rockjaw', title: 'Cub of the Mountain', color: '#a09a8a', r: 30, hp: 210, arena: 'arena_grid', shape: 'golem', contact: 5, minFloor: 5,
      unlockText: 'Rock Heart',
      attacks: {
        rockfall: L('rain', { n: 7, r: 46, warn: 50, interval: 8, aimed: 0.5, color: '#a09a8a' }), pound: L('slamRing', { r: 78, tele: 36, rings: 2, speed: 3, color: '#a09a8a' }),
        roll: L('charge', { tele: 34, speed: 7.5, dmg: 1.5, times: 2, stun: 40 }),
      },
      phases: [{ at: 1, name: 'Rockslide', attacks: ['rockfall', 'pound'], idle: [32, 54] }, { at: 0.5, name: 'Avalanche', attacks: ['rockfall', 'pound', 'roll'], idle: [24, 42] }],
    },
    thunderkin: {
      id: 'thunderkin', name: 'Thunderkin', title: 'Storm Hawk', color: '#ffe14a', r: 22, hp: 150, arena: 'arena_open', shape: 'hawk', contact: 3, minFloor: 7,
      unlockText: 'Storm Feather',
      attacks: {
        strikes: L('rain', { n: 8, r: 40, warn: 38, interval: 6, aimed: 0.7, color: '#ffe14a' }), dive: L('charge', { tele: 28, speed: 12, dmg: 1.5, stun: 30 }),
        feathers: L('fan', { n: 7, spread: 0.16, reps: 2, speed: 3.4, color: '#ffe14a' }), bolts: L('bars', { n: 2, thick: 40, gapW: 170, warn: 60, color: '#ffe14a' }),
      },
      phases: [{ at: 1, name: 'Gathering Storm', attacks: ['strikes', 'dive', 'feathers'], idle: [26, 46] }, { at: 0.5, name: 'Tempest', attacks: ['strikes', 'dive', 'feathers', 'bolts'], idle: [18, 36] }],
    },
    sentry: {
      id: 'sentry', name: 'Clockwork Sentry', title: 'Tireless Guardian', color: '#d8b04a', r: 26, hp: 180, arena: 'arena_grid', shape: 'sentry', contact: 4, minFloor: 6,
      unlockText: 'Clockwork Heart',
      attacks: {
        lasers: L('beams', { n: 2, len: 620, w: 22, warn: 48, life: 100, rot: 0.02, dmg: 0.8, color: '#ffd24a' }), grid: L('bars', { n: 2, thick: 44, gapW: 170, warn: 64, color: '#ffd24a' }),
        tick: L('radial', { n: 12, reps: 3, gap: 12, speed: 2.4, rot: 0.2, color: '#ffd24a' }),
      },
      phases: [{ at: 1, name: 'Patrol', attacks: ['lasers', 'tick'], idle: [30, 50] }, { at: 0.5, name: 'Lockdown', attacks: ['lasers', 'grid', 'tick'], idle: [22, 40] }],
    },
  };
  const allIds = () => Object.keys(DEFS).filter(id => ED.packs.ok(DEFS[id]) && !DEFS[id].special);      // edition-aware (v3 adds mini bosses)

  /**
   * Choose a mini boss for a room: rotates by seed + depth, avoids repeats on the floor.
   * Tiers: floor 6+ = tier 2 (extra attack scaling), 12+ = tier 3 (modifier), 20+ = tier 4 (2 modifiers).
   */
  function pick(floor, rng, used) {
    const IDS = allIds();
    const pool = IDS.filter(id => DEFS[id].minFloor <= floor + 1 && !(used || []).includes(id));
    const from = pool.length ? pool : IDS.filter(id => !(used || []).includes(id));
    let defId = rng.pick(from.length ? from : IDS);
    if (ED.worlds && ED.packs.on('v3')) { const wm = ED.worlds.miniFor(floor); if (wm && pool.includes(wm) && rng.chance(0.55)) defId = wm; }      // each world favours its own mini boss
    const tier = floor >= 20 ? 4 : floor >= 12 ? 3 : floor >= 6 ? 2 : 1;
    const nMods = floor >= 20 ? 2 : floor >= 12 ? 1 : 0;
    const bag = Object.keys(ED.bosses ? ED.bosses.BOSS_MODS : { hasted: 1, armored: 1, vampiric: 1, volatile: 1 });
    const mods = [];
    for (let i = 0; i < nMods && bag.length; i++) mods.push(bag.splice(rng.int(0, bag.length - 1), 1)[0]);
    const duo = floor >= 10 && rng.chance(Math.min(0.6, 0.18 + 0.02 * (floor - 10)));
    const adds = floor >= 10;
    let name = DEFS[defId].name + (tier > 1 ? ' — Tier ' + ED.bosses.roman(tier) : '');
    if (duo) name = DEFS[defId].name + ' & Twin' + (tier > 1 ? ' — Tier ' + ED.bosses.roman(tier) : '');
    return { defId, floor, tier, mods, duo, adds, name, isMini: true };
  }

  /** spawn the mini boss (and its twin) in the current room */
  function spawn(g, spec) {
    const def = DEFS[spec.defId];
    const out = [];
    const share = spec.duo ? 0.62 : 1;
    const s = Object.assign({}, spec, { mega: false, partnerId: null, fused: false, color: def.color });
    const a = ED.bosses.spawnOne(g, s, def, spec.duo ? 340 : 480, 220, share, 0, null);
    out.push(a);
    if (spec.duo) {
      const b = ED.bosses.spawnOne(g, s, def, 620, 220, share, 1, null);
      a.partner = b; b.partner = a; out.push(b);
    }
    for (const e of out) {
      e.intro = 110;
      if (spec.adds) e.phases[e.phases.length - 1].enter = (e.phases[e.phases.length - 1].enter || []).concat([L('summon', { types: ['imp', 'swarm'], n: 3, max: 5, hpMul: 0.8 })]);
    }
    g.bossCard = { name: spec.name, title: def.title, color: def.color, t: 0, dur: 130, mega: false, tier: spec.tier, mods: spec.mods.map(m => ED.bosses.BOSS_MODS[m].name), mini: true };
    return out;
  }

  ED.packs.track('minis', DEFS);
  ED.minibosses = {
    defs: DEFS, get ids() { return allIds(); }, pick, spawn,
    def(id) { return DEFS[id]; },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

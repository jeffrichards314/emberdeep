/* EMBERDEEP — difficulty.js
 * ALL floor scaling lives in the tables below.  Every curve is a pure function of the
 * floor number: value = clamp(base + lin*x + quad*x^2, ..cap) with x = floor-1.
 * Curves marked dir:-1 fall instead of rise (telegraph time).  Nothing here can overflow:
 * every row has a hard cap, so the climb is endless but bounded.
 */
(function (root) {
  'use strict';
  const ED = root.ED;
  const U = ED.U;

  // ---------------------------------------------------------------- the data table
  const CURVES = {
    // ---- enemy stats (rise every floor until their cap)
    enemyHp:     { base: 1.0, lin: 0.30,  quad: 0.014,   cap: 90 },
    enemyDmg:    { base: 1.0, lin: 0.15,  quad: 0.0045,  cap: 9 },
    enemySpeed:  { base: 1.0, lin: 0.020, quad: 0.00025, cap: 1.7 },
    projSpeed:   { base: 1.0, lin: 0.028, quad: 0.0004,  cap: 1.75 },
    fireRate:    { base: 1.0, lin: 0.025, quad: 0.0003,  cap: 1.9 },     // enemy attack-rate cap (fairness)
    // ---- encounter size
    spawnBudget: { base: 3.2, lin: 0.34,  quad: 0.004,   cap: 13 },      // "threat points" per wave
    waves:       { base: 2.0, lin: 0.085, quad: 0,       cap: 3.0 },     // waves in a normal room (2 -> 3)
    eliteChance: { base: 0.0, lin: 0.024, quad: 0.0003,  cap: 0.5 },
    modCount:    { base: 1.0, lin: 0.055, quad: 0,       cap: 3.5 },     // avg modifiers on an elite
    // ---- telegraph time multiplier (FALLS: faster telegraphs deeper)
    telegraph:   { base: 1.3, lin: -0.022, quad: -0.0002, cap: 0.5, dir: -1 },
    // ---- bosses / mini bosses
    bossHp:      { base: 1.0, lin: 0.26,  quad: 0.009,   cap: 70 },
    bossDmg:     { base: 0.72, lin: 0.15, quad: 0.003,   cap: 7 },        // x boss shot base (3.4)
    bossSize:    { base: 1.0, lin: 0.035, quad: 0,       cap: 1.6 },
    bossRadius:  { base: 40,  lin: 2.2,   quad: 0,       cap: 82 },      // floor boss body radius (px) — strictly grows with floor
    megaRadius:  { base: 98,  lin: 2.4,   quad: 0,       cap: 176 },     // MEGA boss body radius — strictly grows with floor
    miniHp:      { base: 1.0, lin: 0.27,  quad: 0.011,   cap: 70 },
    // ---- hazards
    trapDensity: { base: 1.0, lin: 0.12,  quad: 0.001,   cap: 3.2 },
    ambushElites:{ base: 2.0, lin: 0.30,  quad: 0,       cap: 8 },
    // ---- economy / rewards (rise with floor)
    itemPower:   { base: 1.0, lin: 0.18,  quad: 0.002,   cap: 16 },      // weapon/armor stat level
    priceMult:   { base: 1.0, lin: 0.10,  quad: 0.0015,  cap: 12 },
    goldMult:    { base: 1.0, lin: 0.09,  quad: 0.001,   cap: 10 },
  };

  // base HP of a floor boss / mega boss at floor 1 (x bossHp curve x per-boss hpScale)
  const BOSS_BASE = { hp: 440, megaHp: 1250 };

  // enemy behaviour introductions: floor at which each becomes eligible
  const ENEMY_INTRO = {
    chaser: 1, shooter: 1, swarm: 2, charger: 2, shielded: 3, bomber: 4,
    summoner: 5, teleporter: 6, spinner: 7, splitter: 8, phantom: 9, lancer: 10,
  };
  // elite modifier introductions
  const MOD_INTRO = {
    swift: 2, brutal: 3, hardened: 3, vampiric: 4, volatile: 5, splitting: 6, frenzied: 6,
    regen: 7, warded: 7, volley: 8, thorned: 9, ghostly: 10, magnetic: 11, burning: 12,
  };

  // projectile pattern tier (patterned enemy fire) — stepwise table
  const PATTERN_TIERS = [
    { floor: 1,  tier: 0 },   // single aimed shots
    { floor: 4,  tier: 1 },   // 3-way fans
    { floor: 7,  tier: 2 },   // fans + ring bursts
    { floor: 10, tier: 3 },   // alternating arcs, spirals
    { floor: 15, tier: 4 },   // double patterns, tight telegraphs
    { floor: 22, tier: 5 },
  ];

  // special room weights: w = base * clamp(1 + slope*x, min, max); `from` = first floor
  const ROOM_WEIGHTS = {
    treasure:  { w: 10, slope: -0.012, min: 0.55, max: 1, from: 1, cat: 'positive' },
    fountain:  { w: 8,  slope: -0.012, min: 0.5,  max: 1, from: 1, cat: 'positive' },
    shop:      { w: 9,  slope: 0.010,  min: 0.8,  max: 1.6, from: 1, cat: 'positive' },
    blacksmith:{ w: 6,  slope: 0.020,  min: 0.8,  max: 2, from: 2, cat: 'positive' },
    secret:    { w: 5,  slope: 0,      min: 1,    max: 1, from: 2, cat: 'positive' },
    shrine:    { w: 7,  slope: 0.020,  min: 1,    max: 2, from: 2, cat: 'mixed' },
    mystery:   { w: 6,  slope: 0.010,  min: 1,    max: 1.6, from: 2, cat: 'mixed' },
    gambling:  { w: 4,  slope: 0.010,  min: 1,    max: 1.6, from: 3, cat: 'mixed' },
    challenge: { w: 4,  slope: 0.050,  min: 1,    max: 3.5, from: 3, cat: 'mixed' },
    devil:     { w: 3,  slope: 0.080,  min: 1,    max: 4, from: 3, cat: 'mixed' },
    ambush:    { w: 4,  slope: 0.080,  min: 1,    max: 4, from: 2, cat: 'negative' },
    trap:      { w: 4,  slope: 0.070,  min: 1,    max: 3.5, from: 2, cat: 'negative' },
    cursed:    { w: 3,  slope: 0.100,  min: 1,    max: 4.5, from: 3, cat: 'negative' },
    haunted:   { w: 3,  slope: 0.080,  min: 1,    max: 3.5, from: 4, cat: 'negative' },
  };

  // rarity weights vs floor.  w = clamp(base + slope*x, min, max); `from` = first floor
  const RARITY_WEIGHTS = {
    common:    { base: 72, slope: -3.2, min: 8,  max: 100, from: 1 },
    uncommon:  { base: 22, slope: 0.6,  min: 10, max: 32,  from: 1 },
    rare:      { base: 5,  slope: 1.6,  min: 0,  max: 34,  from: 1 },
    epic:      { base: 0.5, slope: 0.9, min: 0,  max: 28,  from: 3 },
    legendary: { base: 0,  slope: 0.35, min: 0,  max: 12,  from: 5 },
  };

  // hard simulation caps (60fps safety + fairness)
  const CAPS = { enemies: 16, eproj: 280, fx: 650, zones: 60, maxHitFrac: 0.5 };

  // danger names by level
  const DANGER_NAMES = [
    [0, 'Gentle', '#7ed957'], [3, 'Cautious', '#c8e04a'], [6, 'Dangerous', '#f5c542'],
    [10, 'Perilous', '#f59a42'], [16, 'Brutal', '#ef5b3d'], [26, 'Nightmare', '#d93a8a'],
    [41, 'Hellish', '#a43ae0'], [61, 'Mythic', '#5a7bff'], [90, 'Impossible', '#ffffff'],
  ];

  // ---------------------------------------------------------------- evaluator
  function curve(row, floor) {
    const x = Math.max(0, floor - 1);
    let v = row.base + row.lin * x + (row.quad || 0) * x * x;
    if (row.dir === -1) v = Math.max(row.cap, v); else v = Math.min(row.cap, v);
    return v;
  }
  function atCap(row, floor) {
    const v = curve(row, floor);
    return row.dir === -1 ? v <= row.cap + 1e-9 : v >= row.cap - 1e-9;
  }

  const cache = new Map(), assistMemo = new WeakMap();
  const D = ED.D = {
    CURVES, BOSS_BASE, ENEMY_INTRO, MOD_INTRO, PATTERN_TIERS, ROOM_WEIGHTS, RARITY_WEIGHTS, CAPS,
    curve, atCap,

    /** every scaled value for a floor */
    /** every scaled value for a floor (v6 Heat pacts, when chosen for the run, adjust a copy of it) */
    at(floor) { let o = D.atBase(floor); if (ED.heat && ED.heat.live()) o = ED.heat.apply(o); return D.assistLevel ? D.assistRow(o) : o; },
    /** Assist (Options): 0 off, 1 Gentle, 2 Easy — set when a run starts.  Scales a COPY of the row (cached per row), never the base table. */
    assistLevel: 0,
    ASSIST: [null, { name: 'Gentle', dmg: 0.8, tele: 1.15, hp: 1 }, { name: 'Easy', dmg: 0.6, tele: 1.3, hp: 0.85 }],
    assistRow(o) {
      let m = assistMemo.get(o); if (!m) assistMemo.set(o, m = {}); const lv = D.assistLevel; if (m[lv]) return m[lv];
      const f = D.ASSIST[lv], r = Object.assign({}, o);
      r.enemyDmg = o.enemyDmg * f.dmg; r.dmg = r.enemyDmg; r.telegraph = o.telegraph * f.tele; r.tele = r.telegraph; r.enemyHp = o.enemyHp * f.hp; r.hp = r.enemyHp;
      r.bossHp = o.bossHp * f.hp; r.miniHp = o.miniHp * f.hp;
      r.composite = Math.sqrt(r.enemyHp * r.enemyDmg) * Math.sqrt(r.enemySpeed); r.danger = Math.max(1, Math.round(r.composite * 4 - 3)); r.dangerName = D.dangerName(r.danger); r.dangerColor = D.dangerColor(r.danger);
      return (m[lv] = r);
    },
    atBase(floor) {
      floor = Math.max(1, Math.floor(floor || 1));
      let o = cache.get(floor);
      if (o) return o;
      o = { floor };
      for (const k in CURVES) o[k] = curve(CURVES[k], floor);
      o.hp = o.enemyHp; o.dmg = o.enemyDmg; o.speed = o.enemySpeed;
      o.tele = o.telegraph;
      o.patternTier = 0;
      for (const p of PATTERN_TIERS) if (floor >= p.floor) o.patternTier = p.tier;
      // fairness: bounded combined danger of fire rate and projectile speed
      o.pressure = Math.min(3.2, o.fireRate * o.projSpeed);
      o.composite = Math.sqrt(o.enemyHp * o.enemyDmg) * Math.sqrt(o.enemySpeed);
      o.danger = Math.max(1, Math.round(o.composite * 4 - 3));
      o.dangerName = D.dangerName(o.danger);
      o.dangerColor = D.dangerColor(o.danger);
      o.maxEnemies = CAPS.enemies;
      o.enrageFrames = floor >= 10 ? Math.max(2700, 6300 - 130 * (floor - 10)) : 0;
      o.tier = D.bossTier(floor);
      o.isMega = floor % 5 === 0;
      cache.set(floor, o);
      return o;
    },
    dangerName(level) { let n = DANGER_NAMES[0][1]; for (const d of DANGER_NAMES) if (level >= d[0]) n = d[1]; return n; },
    dangerColor(level) { let n = DANGER_NAMES[0][2]; for (const d of DANGER_NAMES) if (level >= d[0]) n = d[2]; return n; },

    // ------------------------------------------------------------ progression helpers
    /** which enemy types may spawn on this floor */
    enemyPool(floor) {
      const out = Object.keys(ENEMY_INTRO).filter(k => ENEMY_INTRO[k] <= floor);
      if (ED.worlds && ED.packs.on('v3')) for (const id of ED.worlds.enemiesFor(floor)) out.push(id);      // the current world's own foes
      return out;
    },
    modPool(floor) {
      const out = Object.keys(MOD_INTRO).filter(k => MOD_INTRO[k] <= floor);
      if (ED.worlds && ED.packs.on('v3')) for (const id of ED.worlds.modsFor(floor)) if (floor >= 8) out.push(id);
      return out;
    },
    /** how many modifiers does an elite roll on this floor (1.0 -> 3.5 avg) */
    rollModCount(floor, rng) { return Math.max(1, rng.stochRound(D.at(floor).modCount)); },
    waveCount(floor, rng, bonus) { return Math.min(5, rng.stochRound(D.at(floor).waves) + (bonus || 0)); },

    /** number of normal combat rooms on a floor: 6-10, slowly growing */
    normalRooms(floor, rng) {
      const v = Math.min(10, 6 + 0.3 * (floor - 1));
      let n = rng.stochRound(v);
      if (rng.chance(0.2)) n++;
      return U.clamp(n, 6, 10);
    },
    specialCount(floor, rng) { return 2 + (rng.chance(0.55) ? 1 : 0) + (rng.chance(Math.min(0.45, 0.1 + 0.03 * floor)) ? 1 : 0); },
    /** 1-3 mini boss rooms, trending higher with depth */
    minibossCount(floor, rng) {
      const p3 = U.clamp(0.02 * floor, 0, 0.4);
      const p2 = U.clamp(0.22 + 0.03 * floor, 0.22, 0.52);
      const r = rng.next();
      return r < p3 ? 3 : r < p3 + p2 ? 2 : 1;
    },
    roomWeight(type, floor) {
      const r = ROOM_WEIGHTS[type];
      if (!r || floor < r.from || !ED.packs.ok(r)) return 0;
      const x = floor - 1;
      return r.w * U.clamp(1 + r.slope * x, r.min, r.max);
    },
    rarityWeights(floor, luck) {
      const out = {}; const x = floor - 1; let i = 0;
      for (const k of ['common', 'uncommon', 'rare', 'epic', 'legendary']) {
        const r = RARITY_WEIGHTS[k];
        let w = floor < r.from ? 0 : U.clamp(r.base + r.slope * x, r.min, r.max);
        if (luck) w *= 1 + luck * 0.12 * i;
        out[k] = w; i++;
      }
      return out;
    },

    // ------------------------------------------------------------ boss tiers
    /** index among non-mega floors / mega floors; tier counts how many times the roster looped */
    bossTier(floor) {
      if (floor % 5 === 0) { const m = floor / 5 - 1; return Math.floor(m / 3) + 1; }
      const n = floor - Math.floor(floor / 5) - 1;
      return Math.floor(n / 4) + 1;
    },
    bossIndex(floor) {
      const mega = floor % 5 === 0, size = ED.bosses ? ED.bosses.rosterSize(mega) : (mega ? 3 : 4);       // packs can enlarge the roster; v1 = 3 / 4
      if (mega) return (floor / 5 - 1) % size;
      const n = floor - Math.floor(floor / 5) - 1;
      return n % size;
    },
    /** how many phases a boss has: bigger/more complex each tier */
    bossPhases(base, floor) { return Math.min(6, base + Math.floor((D.bossTier(floor) - 1) * 0.8) + (floor >= 15 ? 1 : 0)); },

    /** wave composition for a normal-ish room.  returns [ [{type, elite, mods:[]}, ...], ... ] */
    composeWaves(floor, rng, opts) {
      opts = opts || {};
      const d = D.at(floor);
      const waves = [];
      const nWaves = D.waveCount(floor, rng, opts.waveBonus || 0);
      const pool = D.enemyPool(floor);
      const types = pool.map(k => ED.enemyTypes[k]).filter(Boolean);
      for (let w = 0; w < nWaves; w++) {
        let budget = d.spawnBudget * (opts.budgetMult || 1) * (0.78 + 0.22 * (w + 1) / nWaves + rng.range(-0.08, 0.1));
        const wave = [];
        // mixed-type waves deeper: choose a "theme" pair so waves feel composed, not random
        const themeA = rng.weighted(types, t => t.weight * (t.minFloor === floor ? 2.2 : 1));
        const themeB = floor >= 4 ? rng.weighted(types, t => t.weight) : themeA;
        let guard = 0;
        while (budget > 0.35 && wave.length < CAPS.enemies - 2 && guard++ < 60) {
          let t;
          const r = rng.next();
          t = r < 0.5 ? themeA : r < 0.8 ? themeB : rng.weighted(types, q => q.weight);
          if (t.cost > budget + 0.9 && guard < 40) continue;
          const group = t.group ? Math.min(t.group, Math.max(1, Math.floor(budget / t.cost))) : 1;
          for (let i = 0; i < group && wave.length < CAPS.enemies; i++) {
            wave.push({ type: t.id, elite: false, mods: [] });
            budget -= t.cost;
          }
        }
        if (!wave.length) wave.push({ type: pool[0], elite: false, mods: [] });
        // elites
        if (!opts.noElite) {
          for (const e of wave) {
            const et = ED.enemyTypes[e.type];
            if (et.noElite) continue;
            if (rng.chance(d.eliteChance * (opts.eliteMult || 1))) D.makeElite(e, floor, rng);
          }
        }
        waves.push(wave);
      }
      return waves;
    },
    makeElite(entry, floor, rng, nMods) {
      const pool = D.modPool(floor);
      if (!pool.length) return entry;
      const n = Math.min(pool.length, nMods || D.rollModCount(floor, rng));
      const mods = [];
      const bag = pool.slice();
      for (let i = 0; i < n && bag.length; i++) mods.push(bag.splice(rng.int(0, bag.length - 1), 1)[0]);
      entry.elite = true; entry.mods = mods;
      return entry;
    },

    /** score + labels used by UI */
    describe(floor) {
      const d = D.at(floor);
      return {
        danger: d.danger, name: d.dangerName, color: d.dangerColor,
        lines: [
          'Foes: HP x' + d.enemyHp.toFixed(1) + '  DMG x' + d.enemyDmg.toFixed(1),
          'Speed x' + d.enemySpeed.toFixed(2) + '  Shots x' + d.projSpeed.toFixed(2),
          'Elites ' + Math.round(d.eliteChance * 100) + '%  Telegraph x' + d.telegraph.toFixed(2),
        ],
      };
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

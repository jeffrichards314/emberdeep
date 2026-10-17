/* EMBERDEEP — items.js
 * Data tables + generators for weapons, armor, actives, relics, classes, synergies,
 * and the stat aggregation (recalc) that turns an inventory into player stats.
 * Adding content = adding one entry to a table below.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D;

  // ------------------------------------------------------------------ rarity
  const RARITY = {
    common:    { id: 'common',    name: 'Common',    color: '#c8ccd6', mult: 1.00, affixes: [0, 0], defMult: 1.0, price: 22,  rank: 0 },
    uncommon:  { id: 'uncommon',  name: 'Uncommon',  color: '#5be37d', mult: 1.12, affixes: [1, 1], defMult: 1.2, price: 38,  rank: 1 },
    rare:      { id: 'rare',      name: 'Rare',      color: '#4aa3ff', mult: 1.30, affixes: [1, 2], defMult: 1.5, price: 65,  rank: 2 },
    epic:      { id: 'epic',      name: 'Epic',      color: '#b86bff', mult: 1.55, affixes: [2, 2], defMult: 1.9, price: 105, rank: 3 },
    legendary: { id: 'legendary', name: 'Legendary', color: '#ffa534', mult: 1.90, affixes: [3, 3], defMult: 2.4, price: 170, rank: 4 },
  };
  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const CURSE_COLOR = '#ff3355';

  // ------------------------------------------------------------------ weapons
  // kind decides which combat routine (entities.js) runs.  cd = frames between attacks.
  const WEAPONS = {
    sword:     { id: 'sword', name: 'Sword', kind: 'sword', color: '#d8e4ff', dmg: 6, cd: 20, range: 48, arc: 2.0, kb: 3.5, basic: true,
                 desc: 'Fast arc. Every third swing is a wide spin.' },
    spear:     { id: 'spear', name: 'Spear', kind: 'spear', color: '#ffe9a8', dmg: 8, cd: 28, range: 92, arc: 0.3, kb: 2.5, basic: true,
                 desc: 'Long thrust that pierces a line. Tip hits deal 50% more.' },
    hammer:    { id: 'hammer', name: 'Hammer', kind: 'hammer', color: '#ffb070', dmg: 16, cd: 54, range: 62, arc: 6.3, kb: 6.5, class: 'brute',
                 desc: 'Slow, heavy slam. Area damage, staggers enemies and breaks shields.' },
    daggers:   { id: 'daggers', name: 'Daggers', kind: 'daggers', color: '#b8ffd8', dmg: 2.8, cd: 8, range: 34, arc: 1.5, kb: 1.2, class: 'rogue',
                 desc: 'Blindingly fast, short reach. Chain hits to build tempo.' },
    bow:       { id: 'bow', name: 'Bow', kind: 'bow', color: '#e0c08a', dmg: 6, cd: 24, range: 440, arc: 0, kb: 2, speed: 9.5, basic: true,
                 desc: 'Fires arrows at range. Extra projectiles fan out.' },
    boomerang: { id: 'boomerang', name: 'Boomerang', kind: 'boomerang', color: '#9be8ff', dmg: 6, cd: 16, range: 230, arc: 0, kb: 2, speed: 7.2, class: 'trickster',
                 desc: 'Thrown out and returns, hitting on both legs.' },
    staff:     { id: 'staff', name: 'Staff', kind: 'staff', color: '#d9a8ff', dmg: 6.5, cd: 28, range: 400, arc: 0, kb: 1.5, speed: 5.4, class: 'mage',
                 desc: 'Slow arcane orb that homes slightly and bursts on impact.' },
  };

  // affixes: stat is merged into the player's stats additively
  const AFFIXES = {
    sharp:   { id: 'sharp',   prefix: 'Keen',      suffix: '',                stat: 'dmg',      v: [0.08, 0.12], text: v => '+' + pct(v) + ' damage' },
    swift:   { id: 'swift',   prefix: 'Swift',     suffix: '',                stat: 'atkSpd',   v: [0.08, 0.12], text: v => '+' + pct(v) + ' attack speed' },
    crit:    { id: 'crit',    prefix: 'Deadly',    suffix: 'of Precision',    stat: 'crit',     v: [0.06, 0.1],  text: v => '+' + pct(v) + ' crit chance' },
    burn:    { id: 'burn',    prefix: 'Blazing',   suffix: 'of Embers',       stat: 'burn',     v: [0.18, 0.26], text: v => pct(v) + ' chance to ignite' },
    frost:   { id: 'frost',   prefix: 'Frostbound',suffix: 'of the Glacier',  stat: 'freeze',   v: [0.14, 0.2],  text: v => pct(v) + ' chance to chill' },
    poison:  { id: 'poison',  prefix: 'Venomous',  suffix: 'of the Viper',    stat: 'poison',   v: [0.16, 0.24], text: v => pct(v) + ' chance to poison' },
    vamp:    { id: 'vamp',    prefix: 'Vampiric',  suffix: 'of the Leech',    stat: 'lifesteal',v: [0.05, 0.08], text: v => pct(v) + ' chance to heal 1 on hit' },
    heavy:   { id: 'heavy',   prefix: 'Crushing',  suffix: '',                stat: 'kb',       v: [0.2, 0.3],   text: v => '+' + pct(v) + ' knockback' },
    reach:   { id: 'reach',   prefix: 'Reaching',  suffix: '',                stat: 'range',    v: [0.1, 0.16],  text: v => '+' + pct(v) + ' range' },
    chain:   { id: 'chain',   prefix: 'Stormcalled',suffix: 'of Thunder',     stat: 'chain',    v: [0.12, 0.18], text: v => pct(v) + ' chance to chain lightning' },
    blast:   { id: 'blast',   prefix: 'Blasting',  suffix: 'of Ruin',         stat: 'explode',  v: [0.1, 0.16],  text: v => pct(v) + ' chance to explode on hit' },
    multi:   { id: 'multi',   prefix: 'Twinned',   suffix: 'of Echoes',       stat: 'proj',     v: [1, 1],       text: v => '+' + v + ' projectile / wider arc', rarityMin: 2 },
    pierce:  { id: 'pierce',  prefix: 'Piercing',  suffix: '',                stat: 'pierce',   v: [1, 1],       text: v => 'pierces ' + v + ' more', ranged: true },
    fortune: { id: 'fortune', prefix: 'Gilded',    suffix: 'of Fortune',      stat: 'gold',     v: [0.15, 0.25], text: v => '+' + pct(v) + ' gold found' },
  };
  function pct(v) { return Math.round(v * 100) + '%'; }

  const LEGEND_NAMES = {
    sword: ['Dawnbreaker', 'Emberfang', 'Oathkeeper'], spear: ['Skypiercer', 'Wyrmthorn', 'The Long Dusk'],
    hammer: ['Worldsplitter', 'Gravemaker', 'Tremor'], daggers: ['Whisper & Hush', 'Twin Eclipse', 'Needlestorm'],
    bow: ['Stormstring', 'Last Light', 'Hawk of Dusk'], boomerang: ['Returning Tide', 'Moonarc', 'Halo of Knives'],
    staff: ['Starcaller', 'Voidlantern', 'The Quiet Flame'],
  };
  const COMMON_ADJ = { common: ['Rusty', 'Worn', 'Plain', 'Dull'], uncommon: ['Fine', 'Sturdy', 'Honed'], rare: ['Tempered', 'Gleaming', 'Knight\'s'], epic: ['Runed', 'Ancient', 'Mythic'] };

  // ------------------------------------------------------------------ armor
  // slot bases.  def = base * rarity.defMult * power^0.55.  mods use the same stat keys as relics.
  const ARMOR = {
    helmet: [
      { id: 'ironHelm',   name: 'Iron Helm',        def: 1.0, mods: {},                          desc: 'Plain protection.' },
      { id: 'hood',       name: "Hunter's Hood",    def: 0.6, mods: { crit: 0.05 },              desc: 'Sharper eyes: +crit.' },
      { id: 'circlet',    name: "Scholar's Circlet",def: 0.5, mods: { range: 0.08, luck: 1 },    desc: 'Longer reach and better luck.' },
      { id: 'horned',     name: 'Horned Helm',      def: 0.8, mods: { thorns: 2 },               desc: 'Attackers take thorn damage.' },
      { id: 'lamp',       name: "Miner's Lamp",     def: 0.6, mods: { magnet: 0.5, gold: 0.1 },  desc: 'Pulls gold in; slightly richer drops.' },
      { id: 'warcrown',   name: 'War Crown',        def: 0.7, mods: { dmg: 0.07 },               desc: '+damage.' },
    ],
    chest: [
      { id: 'jerkin',     name: 'Leather Jerkin',   def: 1.2, mods: { speed: 0.04 },             desc: 'Light and quick.' },
      { id: 'chain',      name: 'Chainmail',        def: 2.0, mods: {},                          desc: 'Solid defense.' },
      { id: 'thornmail',  name: 'Thorn Mail',       def: 1.4, mods: { thorns: 4 },               desc: 'Heavy thorns reflect melee hits.' },
      { id: 'emberplate', name: 'Ember Plate',      def: 1.5, mods: { burn: 0.12 },              desc: 'Your strikes ignite foes.' },
      { id: 'vest',       name: 'Vitality Vest',    def: 1.0, mods: { maxHp: 4 },                desc: '+1 heart container.' },
      { id: 'robe',       name: 'Mage Robe',        def: 0.8, mods: { activeCd: -0.18 },         desc: 'Your active ability recharges faster.' },
    ],
    boots: [
      { id: 'swiftBoots', name: 'Swift Boots',      def: 0.6, mods: { speed: 0.10 },             desc: '+move speed.' },
      { id: 'dashGreaves',name: 'Dash Greaves',     def: 0.7, mods: { dashCd: -0.2 },            desc: 'Dash recharges faster.' },
      { id: 'spiked',     name: 'Spiked Sabatons',  def: 0.8, mods: { dashDmg: 5 },              desc: 'Dashing through enemies hurts them.' },
      { id: 'phase',      name: 'Phase Treads',     def: 0.5, mods: { dashI: 6 },                desc: 'Longer dash invulnerability.' },
      { id: 'heavy',      name: 'Iron Greaves',     def: 1.6, mods: { speed: -0.04 },            desc: 'Heavy, very protective.' },
      { id: 'windSandals',name: 'Wind Sandals',     def: 0.5, mods: { dashDist: 0.22 },          desc: 'Dash travels further.' },
    ],
  };

  // ------------------------------------------------------------------ actives
  // charges = max stored; cd = seconds per charge; rooms = also regains 1 charge every N rooms cleared
  const ACTIVES = {
    bomb:    { id: 'bomb',    name: 'Powder Keg',  color: '#ff9a3c', charges: 2, cd: 14, dmg: 24, radius: 96,
               desc: 'Drop a bomb that detonates after a moment. Cracks weak walls.' },
    bash:    { id: 'bash',    name: 'Shield Bash', color: '#8fc4ff', charges: 1, cd: 8,  dmg: 12, radius: 80,
               desc: 'Lunge forward: knock back and stun enemies, reflect bullets. Briefly invulnerable.' },
    fire:    { id: 'fire',    name: 'Fire Burst',  color: '#ff6a2a', charges: 1, cd: 11, dmg: 16, radius: 150,
               desc: 'Expanding ring of fire that ignites everything it touches.' },
    time:    { id: 'time',    name: 'Time Slow',   color: '#7fd8ff', charges: 1, cd: 24, dmg: 0, radius: 0, dur: 4.5,
               desc: 'Slows the world to a crawl for a few seconds. You stay at full speed.' },
    heal:    { id: 'heal',    name: 'Heal Pulse',  color: '#ff7aa0', charges: 1, cd: 0,  rooms: 3, dmg: 0, radius: 0,
               desc: 'Restore 30% of your max HP. Recharges as you clear rooms.' },
    blink:   { id: 'blink',   name: 'Blink',       color: '#d9a8ff', charges: 2, cd: 6,  dmg: 8, radius: 60,
               desc: 'Teleport a short distance with brief invulnerability. Damages where you land.' },
    gravity: { id: 'gravity', name: 'Gravity Well',color: '#8a6aff', charges: 1, cd: 15, dmg: 4, radius: 190, unlock: 'mini:gravemaw',
               desc: 'A singularity drags foes inward and crushes them. (Unlockable)' },
    wisp:    { id: 'wisp',    name: 'Spirit Call', color: '#9ff3ff', charges: 1, cd: 18, dmg: 6, radius: 0, unlock: 'mini:cinderwitch',
               desc: 'Summon spirit wisps that hunt nearby enemies for 8s. (Unlockable)' },
  };

  // ------------------------------------------------------------------ relics
  // mods: stat keys (see STAT_KINDS).  max: stack cap (omit = unlimited).  unique = only once.
  // on: hooks   hit(g,p,e,dmg,ctx,n)  kill(g,p,e,n)  hurt(g,p,dmg,n)  clear(g,p,n)  dash(g,p,n)  enter(g,p,n)  pickup(g,p,n)
  const RELICS = {
    whetstone:   { id: 'whetstone', name: 'Whetstone', rarity: 'common', color: '#c0c8d8', mods: { dmg: 0.08 }, desc: '+8% damage.' },
    featherstep: { id: 'featherstep', name: 'Featherstep Charm', rarity: 'common', color: '#9ff0b0', mods: { speed: 0.06 }, max: 8, desc: '+6% movement speed.' },
    vitalshard:  { id: 'vitalshard', name: 'Vital Shard', rarity: 'common', color: '#ff7a8a', mods: { maxHp: 4 }, desc: '+1 heart container.',
                   on: { pickup(g, p) { g.healPlayer(4); } } },
    clover:      { id: 'clover', name: 'Lucky Clover', rarity: 'common', color: '#5be37d', mods: { crit: 0.05, luck: 0.5 }, max: 12, desc: '+5% crit chance, slightly luckier loot.' },
    embercore:   { id: 'embercore', name: 'Ember Core', rarity: 'uncommon', color: '#ff8a3c', mods: { burn: 0.12 }, desc: '+12% chance to ignite enemies on hit.' },
    leechfang:   { id: 'leechfang', name: 'Leech Fang', rarity: 'uncommon', color: '#c02a4a', mods: { lifesteal: 0.04 }, max: 8, desc: '+4% chance to heal 1 HP on hit.' },
    echoshard:   { id: 'echoshard', name: 'Echo Shard', rarity: 'rare', color: '#b8a8ff', mods: { proj: 1 }, max: 4, desc: '+1 projectile (ranged) or a wider, longer swing (melee).' },
    magnetstone: { id: 'magnetstone', name: 'Magnet Stone', rarity: 'common', color: '#e8c24a', mods: { magnet: 0.5, gold: 0.1 }, max: 6, desc: 'Gold flies to you; +10% gold.' },
    quickpulse:  { id: 'quickpulse', name: 'Quick Pulse', rarity: 'uncommon', color: '#7fd8ff', mods: { dashCd: -0.10 }, max: 5, desc: '-10% dash cooldown.' },
    ironbark:    { id: 'ironbark', name: 'Iron Bark', rarity: 'common', color: '#9a7a4a', mods: { def: 1 }, desc: '+1 defense.' },
    barbedthorn: { id: 'barbedthorn', name: 'Barbed Thorn', rarity: 'uncommon', color: '#8a3a5a', mods: { thorns: 3 }, desc: 'Melee attackers take 3 damage.' },
    frostshard:  { id: 'frostshard', name: 'Frost Shard', rarity: 'uncommon', color: '#9fe4ff', mods: { freeze: 0.10 }, max: 8, desc: '+10% chance to chill enemies (slow).' },
    powder:      { id: 'powder', name: 'Powder Charge', rarity: 'uncommon', color: '#ff7a2a', mods: { explode: 0.10 }, max: 6, desc: 'Killed enemies have 10% chance to explode.',
                   on: { kill(g, p, e, n) { if (g.rng.chance(p.st.explode)) g.explode(e.x, e.y, 62 + n * 6, 8 * g.itemPow(), { owner: 'player', fire: !!p.syn.pyre }); } } },
    stormcoil:   { id: 'stormcoil', name: 'Storm Coil', rarity: 'rare', color: '#ffe14a', mods: { chain: 0.08 }, max: 6, desc: '8% chance for hits to arc lightning to nearby foes.' },
    vitalityseed:{ id: 'vitalityseed', name: 'Vitality Seed', rarity: 'uncommon', color: '#8ae06a', mods: { regen: 2 }, max: 6, desc: 'Regenerate 2 HP per minute.' },
    knuckle:     { id: 'knuckle', name: "Giant's Knuckle", rarity: 'uncommon', color: '#d09a6a', mods: { kb: 0.2, dmg: 0.03 }, max: 6, desc: '+20% knockback, +3% damage.' },
    executioner: { id: 'executioner', name: 'Executioner Token', rarity: 'rare', color: '#d8d8e8', mods: { execute: 0.35 }, max: 3, desc: '+35% damage against wounded (<30% HP) enemies.' },
    adrenaline:  { id: 'adrenaline', name: 'Adrenaline Gland', rarity: 'uncommon', color: '#ff5a5a', mods: {}, max: 4, desc: 'Kills grant a burst of speed.',
                   on: { kill(g, p, e, n) { p.buffT.haste = Math.max(p.buffT.haste || 0, 60 + 30 * n); } } },
    scavenger:   { id: 'scavenger', name: "Scavenger's Satchel", rarity: 'uncommon', color: '#b08a5a', mods: { luck: 1 }, max: 5, desc: 'More pickups (hearts, bombs, keys) from foes and pots.' },
    orbitblade:  { id: 'orbitblade', name: 'Orbiting Blade', rarity: 'rare', color: '#d8e8ff', mods: { orbit: 1 }, max: 5, desc: 'A blade circles you, cutting anything it touches.' },
    wisp:        { id: 'wispc', name: 'Wisp Lantern', rarity: 'rare', color: '#9ff3ff', mods: { wisp: 1 }, max: 4, desc: 'A friendly wisp zaps the nearest foe.' },
    // ---- risk / reward (an upside AND a downside)
    glassheart:  { id: 'glassheart', name: 'Glass Heart', rarity: 'rare', color: '#ff9ac0', mods: { dmg: 0.35, maxHp: -4 }, max: 3, tag: 'risk',
                   desc: '+35% damage, but -1 heart container.' },
    berserker:   { id: 'berserker', name: "Berserker's Mask", rarity: 'rare', color: '#e04a3a', mods: { atkSpd: 0.25, dmgTaken: 0.2 }, max: 3, tag: 'risk',
                   desc: '+25% attack speed, but you take 20% more damage.' },
    greedypurse: { id: 'greedypurse', name: 'Greedy Purse', rarity: 'uncommon', color: '#ffd24a', mods: { gold: 0.5, price: 0.2 }, max: 3, tag: 'risk',
                   desc: '+50% gold, but shops charge 20% more.' },
    leaden:      { id: 'leaden', name: 'Leaden Anklets', rarity: 'uncommon', color: '#6a7a8a', mods: { def: 2, speed: -0.10 }, max: 3, tag: 'risk',
                   desc: '+2 defense, but -10% move speed.' },
    bloodpact:   { id: 'bloodpact', name: 'Blood Pact', rarity: 'epic', color: '#a01030', mods: { lifesteal: 0.12 }, max: 2, tag: 'risk',
                   desc: '+12% heal-on-hit chance, but entering a new room costs 1 HP (never lethal).',
                   on: { enter(g, p, n) { if (p.hp > 1 + n) { p.hp -= n; g.addText(p.x, p.y - 20, '-' + n, '#a01030', 14); } } } },
    reckless:    { id: 'reckless', name: 'Reckless Spirit', rarity: 'rare', color: '#ff8a4a', mods: { dashDmg: 8, dashCd: 0.25 }, max: 3, tag: 'risk',
                   desc: 'Dashes slash through enemies, but the dash recharges 25% slower.' },
    cursedcoin:  { id: 'cursedcoin', name: 'Cursed Coin', rarity: 'epic', color: '#d4b02a', mods: { luck: 2, enemyHp: 0.12 }, max: 3, tag: 'risk',
                   desc: 'Much better loot — but every enemy has 12% more HP.' },
    volatile:    { id: 'volatile', name: 'Volatile Core', rarity: 'epic', color: '#ff5a2a', mods: { explode: 0.16, selfBlast: 1 }, max: 2, tag: 'risk',
                   desc: 'Hits can detonate (+16%), but explosions hurt you too.' },
    overclock:   { id: 'overclock', name: 'Overclock Gear', rarity: 'rare', color: '#7aa8ff', mods: { def: -1 }, max: 3, tag: 'risk',
                   desc: 'Dashing makes you attack 30% faster for 3s, but -1 defense.',
                   on: { dash(g, p, n) { p.buffT.overclock = 180; } } },
    // ---- unique / legendary (one each)
    phoenix:     { id: 'phoenix', name: 'Phoenix Feather', rarity: 'legendary', color: '#ffb02a', mods: {}, unique: true,
                   desc: 'Once per run, death instead restores you to half health in a burst of flame.' },
    thirdeye:    { id: 'thirdeye', name: 'Third Eye', rarity: 'legendary', color: '#c78bff', mods: {}, unique: true,
                   desc: 'Reveals secret rooms and the true nature of every room on the map.' },
    midas:       { id: 'midas', name: 'Midas Touch', rarity: 'legendary', color: '#ffd24a', mods: { gold: 0.8 }, unique: true,
                   desc: '+80% gold from every source.' },
    timedilation:{ id: 'timedilation', name: 'Hourglass of Dusk', rarity: 'legendary', color: '#7fd8ff', mods: {}, unique: true,
                   desc: 'When below 30% HP, time slows around you.' },
    echoring:    { id: 'echoring', name: 'Ring of Echoes', rarity: 'legendary', color: '#e0b8ff', mods: {}, unique: true,
                   desc: 'Attacks have a 14% chance to strike twice.' },
    skeletonkey: { id: 'skeletonkey', name: 'Skeleton Key', rarity: 'epic', color: '#f2c94c', mods: {}, unique: true,
                   desc: 'Start every floor with a free Small Key.',
                   on: { floorStart(g, p) { g.giveKey('small', true); } } },
    // ---- unlockable via first mini-boss kills / boss kills
    gravemaw:    { id: 'bonecharm', name: 'Bone Charm', rarity: 'uncommon', color: '#e8e0c8', mods: { def: 1, maxHp: 2 }, max: 6, unlock: 'mini:gravewarden',
                   desc: 'A grim keepsake: +1 defense, +half a heart. (Unlockable)' },
    slimecore:   { id: 'slimecore', name: 'Gel Core', rarity: 'uncommon', color: '#7ae06a', mods: { regen: 3, speed: 0.03 }, max: 5, unlock: 'mini:slimeking',
                   desc: 'Regenerate and move a little quicker. (Unlockable)' },
    huntermark:  { id: 'huntermark', name: "Hunter's Mark", rarity: 'rare', color: '#e0c08a', mods: { crit: 0.08, pierce: 1 }, max: 3, unlock: 'mini:hawkeye',
                   desc: '+8% crit and projectiles pierce one more foe. (Unlockable)' },
    bullhorn:    { id: 'bullhorn', name: 'Bull Horn', rarity: 'rare', color: '#d0a070', mods: { dashDmg: 6, kb: 0.15, dashDist: 0.1 }, max: 4, unlock: 'mini:ironhorn',
                   desc: 'Dashes hit harder and farther. (Unlockable)' },
    cinderheart: { id: 'cinderheart', name: 'Cinder Heart', rarity: 'rare', color: '#ff6a2a', mods: { burn: 0.18, dmg: 0.05 }, max: 4, unlock: 'mini:cinderwitch',
                   desc: '+18% ignite chance and +5% damage. (Unlockable)' },
    webweave:    { id: 'webweave', name: 'Web-Spun Cloak', rarity: 'rare', color: '#d0d8e8', mods: { freeze: 0.12, speed: 0.04, def: 1 }, max: 4, unlock: 'mini:broodmother',
                   desc: 'Slows foes, speeds you, +1 defense. (Unlockable)' },
    rimecrown:   { id: 'rimecrown', name: 'Rime Crown', rarity: 'rare', color: '#9fe4ff', mods: { freeze: 0.16, def: 1 }, max: 4, unlock: 'mini:rimewraith',
                   desc: '+16% chill chance, +1 defense. (Unlockable)' },
    lichphylactery: { id: 'lichphylactery', name: 'Phylactery Shard', rarity: 'epic', color: '#a8ff9a', mods: { lifesteal: 0.06, chain: 0.06 }, max: 3, unlock: 'mini:lichacolyte',
                   desc: 'Hits may drain life and arc lightning. (Unlockable)' },
    rockheart:   { id: 'rockheart', name: 'Rock Heart', rarity: 'rare', color: '#a09a8a', mods: { maxHp: 4, kb: 0.1, speed: -0.03 }, max: 4, unlock: 'mini:rockjaw',
                   desc: '+1 heart container, +10% knockback. (Unlockable)' },
    stormfeather:{ id: 'stormfeather', name: 'Storm Feather', rarity: 'epic', color: '#ffe14a', mods: { chain: 0.1, atkSpd: 0.08 }, max: 3, unlock: 'mini:thunderkin',
                   desc: '+10% lightning chain, +8% attack speed. (Unlockable)' },
    clockwork:   { id: 'clockwork', name: 'Clockwork Heart', rarity: 'epic', color: '#d8b04a', mods: { dashCd: -0.15, atkSpd: 0.06 }, max: 3, unlock: 'mini:sentry',
                   desc: 'Dash cooldown -15%, +6% attack speed. (Unlockable)' },
    // boss unlocks
    kingscrown:  { id: 'kingscrown', name: "Hollow King's Crown", rarity: 'legendary', color: '#c8c8ff', mods: { dmg: 0.12, def: 1 }, unique: true, unlock: 'boss:vael',
                   desc: '+12% damage, +1 defense. (Unlockable)' },
    sporeheart:  { id: 'sporeheart', name: 'Spore Heart', rarity: 'legendary', color: '#9be86a', mods: { poison: 0.25, regen: 4 }, unique: true, unlock: 'boss:mycelia',
                   desc: '+25% poison chance, +4 regen. (Unlockable)' },
    forgecore:   { id: 'forgecore', name: 'Forge Core', rarity: 'legendary', color: '#ff9a3c', mods: { burn: 0.25, explode: 0.1 }, unique: true, unlock: 'boss:pyrax',
                   desc: '+25% ignite, +10% explosive kills. (Unlockable)' },
    prism:       { id: 'prism', name: 'Prism Shard', rarity: 'legendary', color: '#e8f8ff', mods: { proj: 1, pierce: 1, crit: 0.1 }, unique: true, unlock: 'boss:aegis',
                   desc: '+1 projectile, +1 pierce, +10% crit. (Unlockable)' },
  };
  // keys inside RELICS are only table keys; the real ids are .id (gravemaw -> bonecharm etc.)
  const RELIC_BY_ID = {};
  for (const k in RELICS) RELIC_BY_ID[RELICS[k].id] = RELICS[k];

  // ------------------------------------------------------------------ synergies (relic combos)
  const SYNERGIES = [
    { id: 'pyre',      name: 'Pyre',          needs: ['embercore', 'powder'],      desc: 'Explosions ignite everything they touch.' },
    { id: 'tempest',   name: 'Tempest',       needs: ['stormcoil', 'echoshard'],   desc: 'Lightning arcs one extra time.' },
    { id: 'bloodstorm',name: 'Bloodstorm',    needs: ['leechfang', 'stormcoil'],   desc: 'Lightning bolts can heal you.' },
    { id: 'shatter',   name: 'Shatterfrost',  needs: ['frostshard', 'powder'],     desc: 'Chilled enemies take 40% more damage and burst on death.' },
    { id: 'bulwark',   name: 'Bulwark',       needs: ['ironbark', 'barbedthorn'],  desc: 'Thorns also scale with your defense.' },
    { id: 'recklessGlass', name: 'Reckless Edge', needs: ['glassheart', 'berserker'], desc: '+15% crit chance... and nowhere to hide.' },
    { id: 'quickdraw', name: 'Quickdraw',     needs: ['quickpulse', 'overclock'],  desc: 'Dashing instantly resets your attack cooldown.' },
    { id: 'wildfire',  name: 'Wildfire',      needs: ['embercore', 'frostshard'],  desc: 'Burning enemies spread fire to their neighbors.' },
  ];

  // ------------------------------------------------------------------ classes
  const CLASSES = {
    knight:    { id: 'knight', name: 'Knight', weapon: 'sword', hearts: 6, active: 'bash', color: '#8fb4ff', unlock: null,
                 mods: {}, desc: 'Balanced and sturdy. Starts with a Sword and Shield Bash.' },
    lancer:    { id: 'lancer', name: 'Lancer', weapon: 'spear', hearts: 5, active: 'blink', color: '#ffe9a8', unlock: 'boss:vael',
                 mods: { range: 0.05 }, desc: 'Reach and finesse. Starts with a Spear and Blink.' },
    brute:     { id: 'brute', name: 'Brute', weapon: 'hammer', hearts: 8, active: 'bomb', color: '#ffb070', unlock: 'boss:mycelia',
                 mods: { speed: -0.05, kb: 0.15 }, desc: 'Slow but massive. Starts with a Hammer and Powder Keg.' },
    rogue:     { id: 'rogue', name: 'Rogue', weapon: 'daggers', hearts: 4, active: 'blink', color: '#b8ffd8', unlock: 'boss:pyrax',
                 mods: { dashCd: -0.25, crit: 0.08, speed: 0.06 }, desc: 'Fragile and lightning fast. Starts with Daggers.' },
    ranger:    { id: 'ranger', name: 'Ranger', weapon: 'bow', hearts: 5, active: 'bomb', color: '#e0c08a', unlock: 'boss:aegis',
                 mods: { crit: 0.05 }, desc: 'Kite from afar. Starts with a Bow and Powder Keg.' },
    mage:      { id: 'mage', name: 'Mage', weapon: 'staff', hearts: 4, active: 'fire', color: '#d9a8ff', unlock: 'mega:0',
                 mods: { activeCd: -0.15 }, desc: 'Arcane glass cannon. Starts with a Staff and Fire Burst.' },
    trickster: { id: 'trickster', name: 'Trickster', weapon: 'boomerang', hearts: 5, active: 'time', color: '#9be8ff', unlock: 'mega:1',
                 mods: { dashI: 3 }, desc: 'Fancy footwork. Starts with a Boomerang and Time Slow.' },
  };

  // ------------------------------------------------------------------ stats
  // how a stat combines: 'pct' => final = base*(1+sum) ; otherwise additive
  const PCT_STATS = new Set(['speed', 'dmg', 'atkSpd', 'range', 'gold', 'dashCd', 'dashDist', 'magnet', 'kb', 'dmgTaken', 'price', 'activeCd', 'enemyHp']);
  const STAT_NAMES = {
    dmg: 'Damage', speed: 'Move speed', atkSpd: 'Attack speed', crit: 'Crit chance', range: 'Range', gold: 'Gold', def: 'Defense',
    maxHp: 'Max HP', dashCd: 'Dash cooldown', dashDist: 'Dash distance', dashI: 'Dash i-frames', dashDmg: 'Dash damage', luck: 'Luck',
    kb: 'Knockback', proj: 'Projectiles', pierce: 'Pierce', burn: 'Ignite', freeze: 'Chill', poison: 'Poison', chain: 'Chain lightning',
    explode: 'Explode', lifesteal: 'Heal on hit', thorns: 'Thorns', regen: 'Regen', magnet: 'Magnet', dmgTaken: 'Damage taken',
    price: 'Shop prices', activeCd: 'Active cooldown', execute: 'Execute', orbit: 'Orbit blades', wisp: 'Wisps', enemyHp: 'Enemy HP',
  };
  function baseStats() {
    return {
      maxHp: 24, speed: 1, dmg: 1, atkSpd: 1, crit: 0.05, critMult: 1.7, range: 1, dashCd: 1, dashDist: 1, dashI: 14, dashDmg: 0,
      def: 0, luck: 0, gold: 1, magnet: 1, kb: 1, proj: 0, pierce: 0, burn: 0, freeze: 0, poison: 0, chain: 0, explode: 0,
      lifesteal: 0, thorns: 0, regen: 0, dmgTaken: 1, price: 1, activeCd: 1, execute: 0, orbit: 0, wisp: 0, enemyHp: 0, selfBlast: 0,
    };
  }
  function addMods(st, mods, n) {
    n = n || 1;
    for (const k in mods) {
      const v = mods[k] * n;
      if (PCT_STATS.has(k)) st[k] += v; else st[k] = (st[k] || 0) + v;
    }
  }
  /** Rebuild p.st from class base + weapon + armor + relics + buffs + curses. */
  function recalc(p) {
    const st = baseStats();
    const cls = CLASSES[p.classId] || CLASSES.knight;
    st.maxHp = cls.hearts * 4 + (p.bonusHp || 0);
    addMods(st, cls.mods || {}, 1);
    // weapon
    if (p.weapon) for (const a of p.weapon.affixes || []) addMods(st, { [AFFIXES[a.id].stat]: a.val }, 1);
    if (p.weapon && p.weapon.curse) addMods(st, p.weapon.curse.mods, 1);
    if (p.weapon && p.weapon.upg) { st.dmg += 0.0; }
    // armor
    for (const slot of ['helmet', 'chest', 'boots']) {
      const a = p.armor[slot];
      if (!a) continue;
      st.def += a.def;
      addMods(st, a.mods || {}, 1);
      if (a.curse) addMods(st, a.curse.mods, 1);
    }
    // relics
    const counts = p.relics;
    for (const id in counts) {
      const r = RELIC_BY_ID[id]; if (!r) continue;
      addMods(st, r.mods, counts[id]);
    }
    // buffs (shrine blessings) & curses
    for (const b of p.buffs || []) addMods(st, b.mods, 1);
    for (const c of p.curses || []) addMods(st, c.mods, 1);
    // synergies
    p.syn = {};
    for (const s of SYNERGIES) if (ED.packs.ok(s) && s.needs.every(n => counts[n] > 0)) p.syn[s.id] = true;
    if (p.syn.recklessGlass) st.crit += 0.15;
    if (p.syn.bulwark) st.thorns += Math.floor(st.def * 0.5);
    if (p.syn.tempest) st.chain += 0;
    // caps / derived
    st.maxHp = Math.max(8, Math.round(st.maxHp));
    st.speed = U.clamp(st.speed, 0.45, 1.9);
    st.atkSpd = U.clamp(st.atkSpd, 0.4, 3.2);
    st.dashCd = U.clamp(st.dashCd, 0.25, 3);
    st.dashDist = U.clamp(st.dashDist, 0.5, 2);
    st.crit = U.clamp(st.crit, 0, 0.85);
    st.burn = U.clamp(st.burn, 0, 0.9); st.freeze = U.clamp(st.freeze, 0, 0.8); st.poison = U.clamp(st.poison, 0, 0.8);
    st.chain = U.clamp(st.chain, 0, 0.7); st.explode = U.clamp(st.explode, 0, 0.6); st.lifesteal = U.clamp(st.lifesteal, 0, 0.45);
    st.range = U.clamp(st.range, 0.5, 2.2);
    st.kb = U.clamp(st.kb, 0.3, 3);
    st.def = Math.max(-5, st.def);
    st.dmgTaken = U.clamp(st.dmgTaken, 0.3, 3);
    st.activeCd = U.clamp(st.activeCd, 0.3, 2);
    st.proj = Math.max(0, Math.floor(st.proj));
    st.pierce = Math.max(0, Math.floor(st.pierce));
    st.orbit = Math.min(8, Math.floor(st.orbit)); st.wisp = Math.min(6, Math.floor(st.wisp));
    st.luck = U.clamp(st.luck, -3, 14);
    p.st = st;
    const oldMax = p.maxHp;
    p.maxHp = st.maxHp;
    if (p.hp === undefined) p.hp = p.maxHp;
    if (oldMax !== undefined && p.maxHp < oldMax) p.hp = Math.min(p.hp, p.maxHp);
    p.hp = Math.min(p.hp, p.maxHp);
    // the weapon's own numbers
    if (p.weapon) {
      const w = p.weapon, base = WEAPONS[w.type];
      const upg = w.upg || 0;
      p.wdmg = w.dmg * (1 + upg * 0.10) * st.dmg;
      p.wcd = Math.max(4, w.cd / st.atkSpd / (1 + upg * 0.03));
      p.wrange = w.range * st.range;
      p.wkb = w.kb * st.kb;
    }
    return st;
  }

  // ------------------------------------------------------------------ rolling helpers
  const weaponUnlocked = (def) => def.basic || !def.class || ED.save.isClassUnlocked(def.class);
  function isUnlocked(def) { return !def.unlock || ED.save.isItemUnlocked(def.unlock) || ED.save.isItemUnlocked(def.id); }

  function rollRarity(rng, floor, luck, minRank, maxRank) {
    const w = D.rarityWeights(floor, luck || 0);
    const list = RARITY_ORDER.filter(r => RARITY[r].rank >= (minRank || 0) && RARITY[r].rank <= (maxRank === undefined ? 9 : maxRank));
    const pick = rng.weighted(list, r => w[r]);
    return pick || list[list.length - 1];
  }
  function itemPow(floor) { return D.at(floor).itemPower; }

  function rollWeapon(rng, floor, opts) {
    opts = opts || {};
    const types = Object.values(WEAPONS).filter(w => ED.packs.ok(w) && weaponUnlocked(w) && (!opts.types || opts.types.includes(w.id)));
    const base = opts.type ? WEAPONS[opts.type] : rng.pick(types);
    const rar = opts.rarity || rollRarity(rng, floor, opts.luck, opts.minRank, opts.maxRank);
    const R = RARITY[rar];
    const pow = itemPow(floor);
    const w = {
      cat: 'weapon', type: base.id, rarity: rar, lvl: floor, upg: 0, uid: ED.id(),
      dmg: +(base.dmg * R.mult * pow * rng.range(0.93, 1.07)).toFixed(2),
      cd: +(base.cd * rng.range(0.95, 1.05) / (rar === 'legendary' ? 1.1 : 1)).toFixed(1),
      range: +(base.range * rng.range(0.97, 1.08)).toFixed(1),
      kb: base.kb, affixes: [], name: '',
    };
    const n = rng.int(R.affixes[0], R.affixes[1]);
    const ranged = ['bow', 'boomerang', 'staff'].includes(base.id) || !!base.ranged;
    const pool = Object.values(AFFIXES).filter(a => ED.packs.ok(a) && (!a.ranged || ranged) && (!a.rarityMin || R.rank >= a.rarityMin));
    const bag = pool.slice();
    for (let i = 0; i < n && bag.length; i++) {
      const a = bag.splice(rng.int(0, bag.length - 1), 1)[0];
      const val = a.v[0] === a.v[1] ? a.v[0] : +(rng.range(a.v[0], a.v[1]) * (1 + R.rank * 0.12)).toFixed(3);
      w.affixes.push({ id: a.id, val });
    }
    w.name = nameWeapon(rng, base, rar, w.affixes);
    return w;
  }
  function nameWeapon(rng, base, rar, affixes) {
    if (rar === 'legendary') return rng.pick(LEGEND_NAMES[base.id]);
    const adj = (COMMON_ADJ[rar] || COMMON_ADJ.common);
    let name = '';
    const a0 = affixes[0] && AFFIXES[affixes[0].id];
    name = (a0 && a0.prefix ? a0.prefix : rng.pick(adj)) + ' ' + base.name;
    const a1 = affixes[1] && AFFIXES[affixes[1].id];
    if (a1 && a1.suffix) name += ' ' + a1.suffix;
    else if (a0 && a0.suffix && !a0.prefix) name += ' ' + a0.suffix;
    return name;
  }

  function rollArmor(rng, floor, opts) {
    opts = opts || {};
    const slot = opts.slot || rng.pick(['helmet', 'chest', 'boots']);
    const base = rng.pick(ED.packs.filter(ARMOR[slot]));
    const rar = opts.rarity || rollRarity(rng, floor, opts.luck, opts.minRank, opts.maxRank);
    const R = RARITY[rar];
    const pow = Math.pow(itemPow(floor), 0.62);
    const a = {
      cat: 'armor', slot, base: base.id, rarity: rar, lvl: floor, uid: ED.id(), upg: 0,
      def: +(base.def * R.defMult * pow * rng.range(0.92, 1.08)).toFixed(2),
      mods: {}, name: '',
    };
    // effect magnitude scales mildly with rarity
    const k = 1 + R.rank * 0.18;
    for (const m in base.mods) {
      const v = base.mods[m];
      a.mods[m] = (m === 'maxHp' || m === 'luck' || m === 'thorns' || m === 'dashDmg' || m === 'dashI') ? Math.round(v * k) || v : +(v * k).toFixed(3);
    }
    a.name = (R.rank >= 2 ? rng.pick(['Runed', 'Gilded', 'Ancient', 'Glorious', 'Dread']) + ' ' : R.rank === 1 ? 'Fine ' : '') + base.name;
    return a;
  }

  function rollActive(rng, floor, opts) {
    opts = opts || {};
    const pool = Object.values(ACTIVES).filter(a => ED.packs.ok(a) && isUnlocked(a) && (!opts.exclude || a.id !== opts.exclude));
    const base = opts.id ? ACTIVES[opts.id] : rng.pick(pool);
    const rar = opts.rarity || rollRarity(rng, floor, opts.luck, 0, 3);
    return { cat: 'active', id: base.id, rarity: rar, lvl: floor, uid: ED.id(), name: base.name, upg: 0 };
  }

  /** stats of an active at a given item level */
  function activeStats(a) {
    const def = ACTIVES[a.id], R = RARITY[a.rarity];
    const pow = Math.pow(itemPow(a.lvl || 1), 0.8);
    return {
      def, charges: def.charges + (R.rank >= 3 ? 1 : 0), cd: def.cd * (1 - R.rank * 0.05), rooms: def.rooms || 0,
      dmg: def.dmg * (1 + R.rank * 0.12) * pow, radius: def.radius * (1 + R.rank * 0.05), dur: (def.dur || 0) * (1 + R.rank * 0.1),
    };
  }

  /** Pick a relic respecting unlocks, stack caps, uniques and rarity */
  function rollRelic(rng, floor, ctx) {
    ctx = ctx || {};
    const owned = ctx.relics || {};
    const w = D.rarityWeights(floor, ctx.luck || 0);
    const cand = Object.values(RELICS).filter(r => {
      if (r.hidden || !ED.packs.ok(r)) return false;
      if (!isUnlocked(r)) return false;
      const n = owned[r.id] || 0;
      if (r.unique && n > 0) return false;
      if (r.max !== undefined && n >= r.max) return false;
      if (ctx.exclude && ctx.exclude.includes(r.id)) return false;
      if (ctx.minRank !== undefined && RARITY[r.rarity].rank < ctx.minRank) return false;
      if (ctx.noRisk && r.tag === 'risk') return false;
      return true;
    });
    if (!cand.length) return { cat: 'relic', id: 'whetstone', uid: ED.id() };      // never dry: stackable fallback
    const pick = rng.weighted(cand, r => Math.max(0.2, w[r.rarity] || 0.2) * (owned[r.id] ? 0.55 : 1) * (r.tag === 'risk' ? 0.8 : 1) * (floor < RARITY_FIRST[r.rarity] ? 0.05 : 1));
    return { cat: 'relic', id: pick.id, uid: ED.id() };
  }
  const RARITY_FIRST = { common: 1, uncommon: 1, rare: 2, epic: 4, legendary: 6 };

  /**
   * roll `n` distinct offers (treasure room / boss rewards / shops).
   * opts: kinds {weapon:w, armor:w, relic:w, active:w}, minRank, luck, relics(owned), player
   */
  function rollOffers(rng, floor, n, opts) {
    opts = opts || {};
    const kinds = opts.kinds || { weapon: 3, armor: 3, relic: 4.5, active: 1 };
    const out = [];
    const used = {};
    let guard = 0;
    while (out.length < n && guard++ < 60) {
      const kind = rng.weighted(Object.keys(kinds), k => kinds[k]);
      let it;
      const ro = { luck: opts.luck, minRank: opts.minRank, maxRank: opts.maxRank };
      if (kind === 'weapon') it = rollWeapon(rng, floor, ro);
      else if (kind === 'armor') it = rollArmor(rng, floor, ro);
      else if (kind === 'active') it = rollActive(rng, floor, { luck: opts.luck, exclude: opts.activeId });
      else it = rollRelic(rng, floor, { relics: opts.relics, luck: opts.luck, minRank: opts.minRank, exclude: Object.keys(used) });
      const key = it.cat + ':' + (it.id || it.type + it.slot);
      if (it.cat === 'relic' || it.cat === 'active') { if (used[key]) continue; used[key] = true; }
      out.push(it);
    }
    return out;
  }

  // ------------------------------------------------------------------ presentation
  function itemName(it) {
    if (it.cat === 'relic') return (RELIC_BY_ID[it.id] || { name: it.id }).name;
    if (it.cat === 'active') return ACTIVES[it.id].name;
    return it.name + (it.upg ? ' +' + it.upg : '');
  }
  function itemColor(it) {
    if (it.cat === 'relic') return RARITY[(RELIC_BY_ID[it.id] || {}).rarity || 'common'].color;
    return RARITY[it.rarity || 'common'].color;
  }
  function weaponStats(w, st) {
    const base = WEAPONS[w.type];
    const upg = w.upg || 0;
    const dmg = w.dmg * (1 + upg * 0.1);
    const cd = Math.max(4, w.cd / (1 + upg * 0.03));
    return { dmg, rate: 60 / cd, range: w.range, dps: dmg * 60 / cd };
  }
  /** lines of {t,c} for tooltip; `cmp` = currently equipped item of same slot (for deltas) */
  function describe(it, cmp, p) {
    const L = [];
    const col = '#e8e8f0', good = '#6ee07a', bad = '#ff6a6a', dim = '#9a9ab0';
    const delta = (name, a, b, fmt, higherBetter) => {
      let t = name + ': ' + fmt(a), c = col;
      if (b !== undefined && b !== null) {
        const d = a - b;
        if (Math.abs(d) > 1e-6) { t += '  (' + (d > 0 ? '+' : '') + fmt(d) + ')'; c = (d > 0) === higherBetter ? good : bad; }
      }
      L.push({ t, c });
    };
    if (it.cat === 'weapon') {
      const s = weaponStats(it), o = cmp ? weaponStats(cmp) : null;
      L.push({ t: U.cap1(it.rarity) + ' ' + WEAPONS[it.type].name, c: itemColor(it) });
      delta('Damage', s.dmg, o && o.dmg, v => v.toFixed(1), true);
      delta('Attacks/sec', s.rate, o && o.rate, v => v.toFixed(2), true);
      delta('Range', s.range, o && o.range, v => Math.round(v), true);
      delta('DPS', s.dps, o && o.dps, v => v.toFixed(1), true);
      for (const a of it.affixes) L.push({ t: '• ' + AFFIXES[a.id].text(a.val), c: '#9ad0ff' });
      if (it.curse) L.push({ t: 'CURSE: ' + it.curse.desc, c: CURSE_COLOR });
      L.push({ t: WEAPONS[it.type].desc, c: dim });
    } else if (it.cat === 'armor') {
      const o = cmp;
      L.push({ t: U.cap1(it.rarity) + ' ' + U.cap1(it.slot), c: itemColor(it) });
      delta('Defense', it.def, o && o.def, v => v.toFixed(1), true);
      for (const m in it.mods) L.push({ t: '• ' + modText(m, it.mods[m]), c: (isBadMod(m, it.mods[m]) ? bad : '#9ad0ff') });
      if (it.curse) L.push({ t: 'CURSE: ' + it.curse.desc, c: CURSE_COLOR });
      const base = ARMOR[it.slot].find(b => b.id === it.base);
      if (base) L.push({ t: base.desc, c: dim });
    } else if (it.cat === 'active') {
      const s = activeStats(it);
      L.push({ t: U.cap1(it.rarity) + ' Active', c: itemColor(it) });
      L.push({ t: 'Charges: ' + s.charges + (s.rooms ? '  (+1 per ' + s.rooms + ' rooms)' : '  Cooldown: ' + s.cd.toFixed(1) + 's'), c: col });
      if (s.dmg) L.push({ t: 'Power: ' + Math.round(s.dmg), c: col });
      L.push({ t: s.def.desc, c: dim });
    } else if (it.cat === 'relic') {
      const r = RELIC_BY_ID[it.id];
      const n = p ? (p.relics[it.id] || 0) : 0;
      L.push({ t: U.cap1(r.rarity) + ' Relic' + (r.unique ? ' (unique)' : '') + (r.tag === 'risk' ? ' — RISK/REWARD' : ''), c: itemColor(it) });
      L.push({ t: r.desc, c: col });
      if (n) L.push({ t: 'You own ' + n + (r.max ? ' / ' + r.max : '') + ' — stacks!', c: '#ffd24a' });
      for (const s of SYNERGIES) if (ED.packs.ok(s) && s.needs.includes(it.id) && p) {
        const others = s.needs.filter(x => x !== it.id);
        if (others.every(o => p.relics[o] > 0)) L.push({ t: 'SYNERGY: ' + s.name + ' — ' + s.desc, c: '#ffd24a' });
        else L.push({ t: 'Combos with ' + others.map(o => RELIC_BY_ID[o].name).join(', '), c: dim });
      }
    }
    return L;
  }
  function isBadMod(m, v) {
    if (m === 'dmgTaken' || m === 'price') return v > 0;
    return v < 0 && m !== 'dashCd' && m !== 'activeCd';
  }
  function modText(m, v) {
    const nm = STAT_NAMES[m] || m;
    if (PCT_STATS.has(m)) {
      const good = (m === 'dashCd' || m === 'activeCd') ? v < 0 : (m === 'dmgTaken' || m === 'price') ? v < 0 : v > 0;
      return nm + ' ' + (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
    }
    if (['crit', 'burn', 'freeze', 'poison', 'chain', 'explode', 'lifesteal'].includes(m)) return nm + ' ' + (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
    return nm + ' ' + (v > 0 ? '+' : '') + (Math.abs(v) < 10 && v % 1 ? v.toFixed(1) : Math.round(v));
  }

  function price(it, floor, p) {
    const d = D.at(floor);
    let base;
    if (it.cat === 'relic') base = { common: 30, uncommon: 48, rare: 78, epic: 125, legendary: 190 }[(RELIC_BY_ID[it.id] || {}).rarity || 'common'];
    else if (it.cat === 'active') base = 36 + RARITY[it.rarity].price * 0.8;
    else base = RARITY[it.rarity].price;
    return Math.max(5, Math.round(base * d.priceMult * (p ? p.st.price : 1) / 5) * 5);
  }

  ED.packs.track('weapons', WEAPONS); ED.packs.track('affixes', AFFIXES); ED.packs.track('armor', ARMOR); ED.packs.track('actives', ACTIVES); ED.packs.track('relics', RELICS); ED.packs.track('classes', CLASSES); ED.packs.track('synergies', SYNERGIES);
  ED.items = {
    RARITY, RARITY_ORDER, CURSE_COLOR, WEAPONS, AFFIXES, ARMOR, ACTIVES, RELICS, RELIC_BY_ID, SYNERGIES, CLASSES, STAT_NAMES, PCT_STATS,
    baseStats, recalc, addMods,
    rollRarity, rollWeapon, rollArmor, rollActive, rollRelic, rollOffers, activeStats, weaponStats,
    itemName, itemColor, describe, price, modText, isUnlocked, weaponUnlocked,
    relic(id) { return RELIC_BY_ID[id]; },
    LEGEND_NAMES,
    /** classes available in the active edition */
    classList() { return Object.values(CLASSES).filter(c => ED.packs.ok(c)); },
    /** register a relic from a pack file (also indexes it by id) */
    addRelic(key, def) { RELICS[key] = def; RELIC_BY_ID[def.id] = def; return def; },
    /** relics the player actually collected (class passives don't count) */
    relicCount(p) { let n = 0; for (const id in p.relics) { const r = RELIC_BY_ID[id]; if (r && !r.passive) n++; } return n; },
    /** every unlock key of the form floor:N / kills:N / victory used by content in the active edition */
    milestoneKeys() {
      const ks = new Set();
      for (const t of [CLASSES, RELICS, ACTIVES]) for (const d of Object.values(t)) if (d.unlock && ED.packs.ok(d) && /^(floor|kills|victory)/.test(d.unlock)) ks.add(d.unlock);
      return [...ks];
    },
    /** every item definition that can be unlocked, for the collection screen */
    unlockables() {
      const out = [];
      for (const r of Object.values(RELICS)) if (r.unlock && ED.packs.ok(r)) out.push({ kind: 'relic', def: r, unlock: r.unlock });
      for (const a of Object.values(ACTIVES)) if (a.unlock && ED.packs.ok(a)) out.push({ kind: 'active', def: a, unlock: a.unlock });
      return out;
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

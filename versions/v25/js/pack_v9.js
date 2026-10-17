/* EMBERDEEP — pack_v9.js : v9 "THE HUNT" — named foes who remember you.
 *
 *  THE ROSTER   : a foe that kills you (an elite, a boss's herald, sometimes any foe) is promoted to a NAMED NEMESIS — a name, an epithet, a rank (1-5)
 *                 and a few traits.  Up to six hunt you at once; they live in your save and follow you from run to run.
 *  TRAITS       : 12 strengths and 8 weaknesses, each one small readable rule.  Every nemesis has exactly one weakness.  You learn traits by fighting:
 *                 a trait is revealed when its effect first shows (or on sight, for ones you can see).
 *  AMBUSHES     : from floor 2 up to two nemeses lie in wait in ordinary combat rooms (seeded per floor).  A card names them, they taunt you with your history.
 *  FLIGHT       : elites (and nemeses) that are beaten below 20% HP may flee for a door.  Catch them, or they escape — and return renamed, scarred and stronger.
 *  PAYOFF       : slaying one removes it for good and pays trait-themed spoils; if it kills you it ranks up instead (new epithet, new taunt, a new trait at ranks 3 and 5).
 *  THE HUNT     : title screen roster — portraits, ranks, known and unknown traits, history, and the fallen.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, D = ED.D, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v9', MAXR = 6;

  P.define({
    id: 'v9', name: 'THE HUNT', tag: 'named foes who remember you', color: '#ff6a8a',
    blurb: 'Foes that kill you — or escape you — become named nemeses with ranks and traits. They ambush later runs, taunt you with your own history, flee when beaten and return stronger. Learn their weaknesses, slay them for spoils.',
  });

  // ------------------------------------------------------------------ the save: meta.hunt
  const meta = () => {
    const m = ED.save.meta; let h = m.hunt; if (!h || typeof h !== 'object') h = m.hunt = {};
    if (!Array.isArray(h.roster)) h.roster = []; if (!Array.isArray(h.fallen)) h.fallen = [];
    for (const k of ['nextId', 'slain', 'born', 'escaped']) if (typeof h[k] !== 'number') h[k] = k === 'nextId' ? 1 : 0;
    return h;
  };
  const save = () => ED.save.save();
  const clsName = (id) => (I.CLASSES[id] || { name: 'hero' }).name;

  // ------------------------------------------------------------------ traits (the whole rules table)
  /** extra damage dealt on top of a hit already resolved (runs inside damageEnemy, before the kill check) */
  const bonus = (e, g, amt, col) => { if (amt <= 0 || e.dead) return; e.hp -= amt; g.runDamageDealt = (g.runDamageDealt || 0) + amt; g.addText(e.x + 10, e.y - e.r - 2, '+' + Math.round(amt), col || '#ffd24a', 11); };
  const SRC_HITS = new Set(['melee', 'proj', 'explosion', 'chain', 'dash', 'bash', 'orbit', 'fam', 'thrall', 'part']);
  /** discover a trait (once, saved on the nemesis so it is known next run too) */
  function reveal(e, g, id, quiet) {
    const nem = e.nem; if (!nem || nem.known.indexOf(id) >= 0) return;
    nem.known.push(id); const t = BY_ID[id];
    if (!quiet) { g.addText(e.x, e.y - e.r - 30, t.name.toUpperCase() + '!', t.color, 14); g.toast('Discovered: ' + t.name + ' — ' + t.desc, t.color, 220); g.sfx('unlock'); if (g.huntCard && g.huntCard.nem === nem) g.huntCard.flash = 40; }
    save();
  }
  const moves = (def) => def.speed > 0.1;
  const GUARD_DOWN = new Set(['wind', 'aim', 'throw', 'cast', 'fade', 'lunge', 'dash', 'bash', 'thrust', 'charge']);     // a guard drops while its owner attacks
  const TRAITS = [
    // ---- strengths: the nemesis is better at something
    { id: 'thick', kind: 'S', name: 'Thick-skinned', glyph: '■', color: '#c0c8d8', desc: 'Takes 25% less damage from everything.', hint: 'Bring bigger hits, not more of them.', loot: 'armor', weight: 3, defence: true,
      apply(e) { e.armor = 1 - (1 - (e.armor || 0)) * 0.75; }, onHurt(e, g) { if (e.hurtN >= 3) reveal(e, g, 'thick'); } },
    { id: 'berserker', kind: 'S', name: 'Berserker', glyph: '‼', color: '#ff4a9a', desc: 'The more it bleeds, the faster it moves and strikes (up to +60%).', hint: 'Burst it down before it winds up.', loot: 'weapon', weight: 3,
      update(e, g) { const f = 1 - e.hp / e.maxHp; if (f > 0.02) { e.spdMul *= 1 + 0.6 * f; e.rate = (e.rate0 || 1) * (1 + 0.6 * f); } if (f >= 0.4) reveal(e, g, 'berserker'); } },
    { id: 'bulwark', kind: 'S', name: 'Shielded Front', glyph: '◖', color: '#9fc4ff', desc: 'Blocks everything that hits it from the front. Its guard drops while it attacks.', hint: 'Circle behind it, hit it mid-attack, or break the guard (hammer, bash).', loot: 'armor', weight: 2.5, vis: true, needs: moves, defence: true,
      apply(e) { e.shieldArc = e.baseArc = Math.max(e.shieldArc || 0, 2.1); e.guardBreak = e.guardBreak || 0; },
      update(e) { e.shieldArc = GUARD_DOWN.has(e.state) ? 0 : e.baseArc; } },
    { id: 'regen', kind: 'S', name: 'Regenerating', glyph: '+', color: '#8ae06a', desc: 'Heals 3% of its health every half second unless it was hit in the last 1.5s.', hint: 'Keep up the pressure; burning stops it healing.', loot: 'relic', weight: 2.5, defence: true,
      update(e, g) { if (e.hp < e.maxHp && e.t % 30 < g.ts && e.t - (e.lastHurtT || -999) > 90 && !e.status.burn) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03); g.addText(e.x, e.y - e.r - 6, '+', '#8ae06a', 11); if ((e.regenN = (e.regenN || 0) + 1) >= 2) reveal(e, g, 'regen'); } } },
    { id: 'leech', kind: 'S', name: 'Leech', glyph: '♥', color: '#c02a5a', desc: 'Every time it hurts you it heals 12% of its health.', hint: 'Do not trade blows: dodge and punish.', loot: 'relic', weight: 2.5,
      onHitPlayer(e, g) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.12); g.addText(e.x, e.y - e.r - 6, '+', '#c02a5a', 12); reveal(e, g, 'leech'); } },
    { id: 'warded', kind: 'S', name: 'Spell-warded', glyph: '○', color: '#9fc4ff', desc: 'Starts behind a magic ward worth 40% of its health.', hint: 'Burn through the ward first.', loot: 'relic', weight: 2.5, vis: true, defence: true,
      apply(e) { e.ward = (e.ward || 0) + e.maxHp * 0.4; } },
    { id: 'fleet', kind: 'S', name: 'Fleet', glyph: '»', color: '#7fe0ff', desc: '+30% movement speed.', hint: 'Do not try to out-run it. Dash through its lunge.', loot: 'active', weight: 2.5, needs: moves,
      apply(e) { e.speed *= 1.3; }, update(e, g) { if (e.t === 240) reveal(e, g, 'fleet'); } },
    { id: 'brutal', kind: 'S', name: 'Brutal', glyph: '!', color: '#ff5a4a', desc: '+35% damage.', hint: 'Armor, guards and not getting hit.', loot: 'weapon', weight: 2.5,
      apply(e) { e.dmg *= 1.35; e.shotDmg *= 1.35; }, onHitPlayer(e, g) { reveal(e, g, 'brutal'); } },
    { id: 'warband', kind: 'S', name: 'Warband', glyph: '⚑', color: '#ffb04a', desc: 'Arrives with two followers of its own kind.', hint: 'Thin the followers or fight in the open.', loot: 'gold', weight: 2, vis: true, needs: moves,
      apply(e, g) { for (let k = 0; k < 2; k++) { const a = e.id * 1.7 + k * 3.1; const f = g.spawnEnemy(e.type, e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34, { silent: true, hpMul: 0.5, extra: { nemFollower: true } }); f.hp = f.maxHp; } } },
    { id: 'keg', kind: 'S', name: 'Powder Keg', glyph: '✸', color: '#ff8a2a', desc: 'Explodes when it dies (a clear warning ring first).', hint: 'Finish it from range, or dash out when the ring shows.', loot: 'bombs', weight: 2,
      onDeath(e, g) { g.zoneCircle(e, e.x, e.y, 84, g.tele(36), Math.max(5, e.dmg * 1.6), { color: '#ff8a2a', burst: true }); reveal(e, g, 'keg'); } },
    { id: 'deflector', kind: 'S', name: 'Deflector', glyph: '➶', color: '#d8d8f8', desc: 'Arrows, orbs and thrown weapons do 65% less.', hint: 'Get in close, or use blasts and fire.', loot: 'weapon', weight: 2, defence: true,
      onHurt(e, g, dmg, o) { if (o.src === 'proj') { e.hp = Math.min(e.maxHp, e.hp + dmg * 0.65); g.addText(e.x, e.y - e.r - 4, 'DEFLECT', '#d8d8f8', 10); reveal(e, g, 'deflector'); } } },
    { id: 'fireproof', kind: 'S', name: 'Fireproof', glyph: '◆', color: '#e8a070', desc: 'Immune to burning.', hint: 'Use steel, poison and blasts instead.', loot: 'relic', weight: 1.5, defence: true,
      update(e, g) { if (e.status.burn) { delete e.status.burn; g.addText(e.x, e.y - e.r - 4, 'immune', '#e8a070', 10); reveal(e, g, 'fireproof'); } },
      onHurt(e, g, dmg, o) { if (o.src === 'burn') e.hp = Math.min(e.maxHp, e.hp + dmg); } },
    // ---- weaknesses: every nemesis has exactly one
    { id: 'fearfire', kind: 'W', name: 'Fears Fire', glyph: '≈', color: '#ff9a4a', desc: 'Burn damage is 2.5x, and being set alight stuns it for 0.8s.', hint: 'Burning weapons, fire scrolls and flasks.', loot: 'relic', weight: 2,
      update(e, g) { if (e.status.burn && !(e.panicT > e.t)) { e.panicT = e.t + 300; g.applyStatus(e, 'stun', { t: 48 }); g.addText(e.x, e.y - e.r - 14, 'PANIC!', '#ff9a4a', 13); reveal(e, g, 'fearfire'); } },
      onHurt(e, g, dmg, o) { if (o.src === 'burn') { bonus(e, g, dmg * 1.5, '#ff9a4a'); reveal(e, g, 'fearfire'); } } },
    { id: 'fearblast', kind: 'W', name: 'Hates Blasts', glyph: '✦', color: '#ffd24a', desc: 'Explosions deal 60% more and stun it for 1.2s.', hint: 'Bombs. Always bombs.', loot: 'relic', weight: 3,
      onHurt(e, g, dmg, o) { if (o.src === 'explosion') { bonus(e, g, dmg * 0.6); g.applyStatus(e, 'stun', { t: 72 }); reveal(e, g, 'fearblast'); } } },
    { id: 'brittle', kind: 'W', name: 'Brittle', glyph: '◇', color: '#bff0ff', desc: 'Critical hits deal 70% more.', hint: 'Crit builds, the Opener, anything that hits hard and rarely.', loot: 'weapon', weight: 2,
      onHurt(e, g, dmg, o) { if (o.o && o.o.crit) { bonus(e, g, dmg * 0.7, '#bff0ff'); reveal(e, g, 'brittle'); } } },
    { id: 'chillweak', kind: 'W', name: 'Cold-blooded', glyph: '❄', color: '#9fe4ff', desc: 'Slows on it last 60% longer and bite twice as hard.', hint: 'Frost weapons, chill relics, freezing scrolls.', loot: 'relic', weight: 1.5,
      update(e, g) { const s = e.status.slow; if (s && !s.cw) { s.cw = true; s.f = Math.min(s.f, 0.25); s.t *= 1.6; g.addText(e.x, e.y - e.r - 14, 'FROZEN STIFF', '#9fe4ff', 12); reveal(e, g, 'chillweak'); } } },
    { id: 'dazed', kind: 'W', name: 'Dizzy', glyph: '✧', color: '#ffe14a', desc: 'Stuns on it last nearly twice as long.', hint: 'Hammers, shield bashes, guard breaks — stun it and unload.', loot: 'armor', weight: 2,
      update(e) { if (e.stun <= 0) e.stunBuffed = false; },
      onHurt(e, g) { if (e.stun > 0 && !e.stunBuffed) { e.stunBuffed = true; e.stun *= 1.9; reveal(e, g, 'dazed'); } } },
    { id: 'venom', kind: 'W', name: 'Thin-blooded', glyph: '☣', color: '#8ae06a', desc: 'Poison deals 2.8x damage.', hint: 'Poison weapons and relics.', loot: 'relic', weight: 1.5,
      onHurt(e, g, dmg, o) { if (o.src === 'poison') { bonus(e, g, dmg * 1.8, '#8ae06a'); reveal(e, g, 'venom'); } } },
    { id: 'glassjaw', kind: 'W', name: 'Glass Jaw', glyph: '⌇', color: '#ffb0c8', desc: 'The first blow it takes lands for 2.5x.', hint: 'Open with your biggest hit: a charged attack or a crit.', loot: 'weapon', weight: 3,
      onHurt(e, g, dmg, o) { if (e.hurtN === 1 && SRC_HITS.has(o.src)) { bonus(e, g, dmg * 1.5, '#ffb0c8'); reveal(e, g, 'glassjaw'); } } },
    { id: 'lumbering', kind: 'W', name: 'Lumbering', glyph: '⌛', color: '#a8a8c8', desc: '28% slower, and attacks 20% less often.', hint: 'Kite it. It cannot keep up.', loot: 'armor', weight: 2, needs: moves,
      apply(e) { e.speed *= 0.72; e.rate0 *= 0.8; e.rate = e.rate0; }, update(e, g) { if (e.t === 240) reveal(e, g, 'lumbering'); } },
  ];
  const BY_ID = {}; for (const t of TRAITS) { t.pack = V; BY_ID[t.id] = t; }
  P.track('traits', TRAITS);
  const STR_AT = [1, 1, 2, 2, 3];                 // strengths a nemesis of rank r carries
  const RANKS = ['Upstart', 'Veteran', 'Champion', 'Warlord', 'Dread Lord'];
  const RANK_COL = ['#9aa0b8', '#7fd8ff', '#ffd24a', '#ff9a4a', '#ff4a6a'];

  // ------------------------------------------------------------------ names
  const FIRST = ['Vask', 'Ormund', 'Grix', 'Hollis', 'Brannoch', 'Sable', 'Ketch', 'Ulric', 'Tarn', 'Drazk', 'Isolde', 'Nym', 'Corvane', 'Hask', 'Pell', 'Ravic', 'Ysolt', 'Dunmar', 'Fenwick', 'Gall', 'Harrow', 'Jorun', 'Kess', 'Lorn', 'Maddoc', 'Nessa', 'Orrin', 'Pyke', 'Quill', 'Rook', 'Sigrun', 'Urrak', 'Vesper', 'Wick', 'Yarrow', 'Zephra', 'Bram', 'Cinder', 'Dross', 'Flint', 'Grist', 'Ilsa', 'Jarl', 'Korvo', 'Mabel', 'Nox', 'Oswin', 'Pike', 'Ragna', 'Sorrel'];
  const EPI = [
    ['the Upstart', 'the Lurker', 'the Nipper', 'the Sly', 'the Nameless'],
    ['the Bloodied', 'the Grim', 'the Hardened', 'the Unbowed', 'the Patient'],
    ['the Merciless', 'the Gravecaller', 'the Iron-Willed', 'the Ashen', 'the Cruel'],
    ['the Tyrant', 'the Soul-Eater', 'the Unbroken', 'the Pitiless', 'the Hollow-Eyed'],
    ['the Undying', 'the Hollow King', 'the Abyss-Born', 'Doom of Heroes', 'the Last Hunter']];
  const SCAR = {
    burn: ['the Charred', 'Cinderhide', 'the Smoldering'], proj: ['the Pierced', 'Arrow-Scarred', 'Quillback'], explosion: ['the Shattered', 'Half-Blown', 'Powderburn'],
    melee: ['the Scarred', 'One-Eyed', 'the Notched'], poison: ['the Sallow', 'Venomblood'], chain: ['the Branded', 'Stormtouched'], other: ['the Survivor', 'the Limping', 'the Lucky'],
  };
  const pickDistinct = (rng, arr, avoid) => { const f = arr.filter(x => !avoid.includes(x)); return rng.pick(f.length ? f : arr); };
  const takenNames = () => { const h = meta(); return h.roster.concat(h.fallen).map(n => n.name); };
  const epiFor = (rng, nem, scarKey) => scarKey ? pickDistinct(rng, SCAR[scarKey] || SCAR.other, [nem.epi]) : pickDistinct(rng, EPI[Math.min(4, nem.rank - 1)], [nem.epi]);

  // ------------------------------------------------------------------ taunts that use your history
  const LINES = {
    beat: ['You fell to me on floor {floor}.', 'Floor {floor}, {oldcls}. I still remember the sound you made.', 'I still carry the dents from that {wpn}. You still lost.', 'I put you down on floor {floor}. I will do it again.'],
    many: ['{n} times I have buried you. Why keep coming?', 'Back for number {n1}?', "{n} kills and counting. You are my favourite habit."],
    cls: ['A {cls} now? I buried a {oldcls} before.', 'New face, same ending, {cls}.'],
    escape: ['You left me breathing on floor {esc}. A mistake.', 'I crawled out of floor {esc} alive. Thanks to you, I am better.', 'These scars? Your work. Let me return the favour.'],
    boss: ['{boss} taught me to hunt. Kneel.', '{boss} sends me to finish what it started.'],
    fresh: ['Remember me?', 'You have made an enemy today.'],
    half: ['Is that all you have?', 'Hurts, does it not? Good.', 'Do not stop now.'],
    low: ['Your heart is slowing...', 'Almost there, {cls}.', 'Stay down this time.'],
    flee: ['This is not over!', 'I will remember this!', 'Next time, {cls}!'],
    slain: ['...not... again...', 'Remember... my name...', 'You win. This once.'],
  };
  function fill(s, nem, curCls) {
    const t = { floor: nem.floor, cls: clsName(curCls || nem.cls), oldcls: clsName(nem.cls), wpn: nem.wpn || 'weapon', n: nem.kills, n1: nem.kills + 1, esc: nem.escFloor || nem.floor, boss: nem.boss || 'the dark' };
    return s.replace(/\{(\w+)\}/g, (m, k) => (t[k] !== undefined ? t[k] : m));
  }
  const line = (nem, kind, curCls, salt) => { const L = LINES[kind]; return fill(L[(nem.id * 7 + nem.kills * 3 + nem.escapes + (nem.seen || 0) + (salt || 0)) % L.length], nem, curCls); };
  function introLine(nem, curCls) {
    if (nem.kills === 0 && nem.escapes > 0) return line(nem, 'escape', curCls);
    if (nem.boss && nem.kills <= 1 && (nem.id + nem.seen) % 2 === 0) return line(nem, 'boss', curCls);
    if (nem.kills >= 2) return line(nem, 'many', curCls);
    if (nem.kills >= 1 && nem.cls !== curCls && (nem.id + nem.seen) % 2 === 1) return line(nem, 'cls', curCls);
    return nem.kills >= 1 ? line(nem, 'beat', curCls) : line(nem, 'fresh', curCls);
  }

  // ------------------------------------------------------------------ the roster
  const traitsOf = (nem) => nem.str.map(id => BY_ID[id]).concat([BY_ID[nem.weak]]).filter(Boolean);
  const defOk = (id) => { const d = ED.enemyTypes[id]; return d && P.ok(d); };
  /** give a nemesis the traits its rank calls for (seeded by its id, so a rank-up is reproducible) */
  function ensureTraits(nem) {
    const def = ED.enemyTypes[nem.type] || {}, rng = new ED.RNG('hunt:traits:' + nem.id + ':' + nem.rank);
    const ok = (t) => (!t.needs || t.needs(def)) && !(t.id === 'bulwark' && def.shield) && !(t.id === 'fireproof' && nem.weak === 'fearfire');
    if (!nem.weak || !BY_ID[nem.weak]) { const bag = TRAITS.filter(t => t.kind === 'W' && ok(t) && !(t.id === 'fearfire' && nem.str.includes('fireproof'))); nem.weak = rng.weighted(bag, t => t.weight).id; }
    while (nem.str.length < STR_AT[nem.rank - 1]) {
      const defs = nem.str.filter(id => BY_ID[id].defence).length;               // never more than two defensive strengths: a rank-5 foe always has a way to be hurt
      const bag = TRAITS.filter(t => t.kind === 'S' && !nem.str.includes(t.id) && ok(t) && !(t.defence && defs >= 2) && !(t.id === 'fireproof' && nem.weak === 'fearfire'));
      if (!bag.length) break; nem.str.push(rng.weighted(bag, t => t.weight).id);
    }
    return nem;
  }
  /** a base enemy for a nemesis: the killer's own kind where sensible, otherwise something that belongs on this floor */
  function pickType(rng, floor, wanted) {
    const good = (id) => { const d = ED.enemyTypes[id]; return d && P.ok(d) && !d.noElite && d.weight > 0 && d.cost >= 0.8; };
    if (wanted && good(wanted)) return wanted;
    const pool = D.enemyPool(Math.max(1, floor)).filter(good); const bag = pool.length ? pool : ['chaser'];
    return rng.weighted(bag, id => ED.enemyTypes[id].cost);
  }
  function makeNem(o) {
    const h = meta(), rng = new ED.RNG('hunt:born:' + o.seed + ':' + h.nextId);
    const nem = { id: h.nextId++, name: pickDistinct(rng, FIRST, takenNames()), epi: '', type: pickType(rng, o.floor, o.type), rank: o.rank || 1, str: [], weak: '', known: [], cls: o.cls, floor: o.floor, from: o.from, wpn: o.wpn || '',
      killer: o.killer || '', kills: o.kills || 0, escapes: o.escapes || 0, escFloor: o.escFloor || 0, seen: 0, origin: o.origin, boss: o.boss || '', status: 'hunting' };
    ensureTraits(nem); nem.epi = epiFor(rng, nem, o.scar);
    h.born++; return nem;
  }
  /** make room: a new killer replaces the weakest hunter; a mere survivor never pushes anyone out */
  function admit(nem, force) {
    const h = meta(); let evicted = null;
    if (h.roster.length >= MAXR) {
      if (!force) return { ok: false };
      const weak = h.roster.slice().sort((a, b) => a.rank - b.rank || a.kills - b.kills || a.id - b.id)[0];
      h.roster.splice(h.roster.indexOf(weak), 1); evicted = weak;
    }
    h.roster.push(nem); save(); return { ok: true, evicted };
  }
  function rankUp(nem, how, scarKey) {
    const rng = new ED.RNG('hunt:rank:' + nem.id + ':' + nem.kills + ':' + nem.escapes);
    if (nem.rank < 5) nem.rank++; ensureTraits(nem);
    nem.epi = epiFor(rng, nem, how === 'escape' ? (scarKey || 'other') : null);
    return nem;
  }
  const slainEntry = (nem, floor, cls) => ({ name: nem.name, epi: nem.epi, rank: nem.rank, type: nem.type, floor, cls, kills: nem.kills });
  function retire(nem, g) {
    const h = meta(), i = h.roster.indexOf(nem); if (i >= 0) h.roster.splice(i, 1);
    nem.status = 'slain'; h.fallen.unshift(slainEntry(nem, g ? g.floorNum : nem.floor, g && g.run ? g.run.classId : nem.cls)); if (h.fallen.length > 12) h.fallen.length = 12; h.slain++; save();
  }
  /** who may hunt on this floor (they only show up once you are in the depth they beat you at) */
  const hunters = (floor) => meta().roster.filter(n => n.status === 'hunting' && floor >= Math.max(2, n.from || 2));

  ED.hunt = { TRAITS, BY_ID, STR_AT, RANKS, LINES, meta, traitsOf, ensureTraits, makeNem, admit, rankUp, retire, hunters, introLine, line, fill, pickType, MAXR, reveal, lootKinds,
    killerOf: (run) => run && run.huntKiller, clsName };

  // ------------------------------------------------------------------ the dispatcher mod: runs every trait + flight for named / fleeing foes
  const NAMED = {
    id: 'hunted', pack: V, hidden: true, name: 'Named', color: '#ff6a8a', glyph: '☠', desc: 'A foe from The Hunt',
    update(e, g) {
      if (e.fleeing) return fleeStep(e, g);
      if (e.nem) for (const t of e.trs) if (t.update) t.update(e, g);
      if (e.fleeRoll && !e.fled && e.hp > 0 && e.hp <= e.maxHp * 0.2 && !e.invuln && g.rt && g.rt.lockdown && !e.boss && e.stun <= 0 && g.rt.enc && !e.carriesKey) beginFlee(e, g);       // a key carrier never runs: its key would leave with it
      if (e.nem && e.say) { e.say.t += g.ts; if (e.say.t > 170) e.say = null; }
      if (e.nem && !e.spoke50 && e.hp < e.maxHp * 0.5) { e.spoke50 = true; speak(e, g, 'half'); }
      if (e.nem && !e.spokeLow && g.player.hp <= g.player.maxHp * 0.3) { e.spokeLow = true; speak(e, g, 'low'); }
    },
    onHurt(e, g, dmg, info) {
      e.hurtN = (e.hurtN || 0) + 1; e.lastHurtT = e.t; const o = Object.assign({}, info.o || {}, { o: info.o });
      if (info.o && info.o.src) e.lastSrcKind = info.o.src;
      if (e.nem) for (const t of e.trs) if (t.onHurt) t.onHurt(e, g, dmg, o);
    },
    onDeath(e, g) { if (e.nem && !e.escaped) for (const t of e.trs) if (t.onDeath) t.onDeath(e, g); },
  };
  ED.mods.hunted = NAMED;
  function speak(e, g, kind) { const nem = e.nem; if (!nem) return; const s = kind === 'intro' ? introLine(nem, g.run.classId) : line(nem, kind, g.run.classId, e.hurtN || 0); e.say = { str: s, t: 0 }; }

  // ------------------------------------------------------------------ flight
  function beginFlee(e, g) {
    const rt = g.rt, dirs = rt.dirs || []; if (!dirs.length) return;
    const p = g.player; let best = null, bd = -1;
    for (const d of dirs) { const c = ED.rooms.doorCenter(d), dd = U.dist2(c.x, c.y, p.x, p.y); if (dd > bd) { bd = dd; best = c; } }
    if (!best) return;
    if (!e.nem) { if (g.floor.huntFled >= 1) return; g.floor.huntFled++; }          // one panicking plain elite per floor
    e.fled = true; e.fleeing = { t: 0, x: best.x, y: best.y, speed: Math.max(2.5, (e.def.speed || 1) * 1.8) }; e.hold = true; e.dmgTakenMul = (e.dmgTakenMul || 1) * 1.4; e.state = null;
    g.addText(e.x, e.y - e.r - 18, 'FLEEING!', '#ffd24a', 15); g.sfx('telegraph');
    if (e.nem) speak(e, g, 'flee'); else e.say = { str: ['I will be back!', 'You have not seen the last of me!', 'Remember my face!'][e.id % 3], t: 0 };
    e.noContact = true; g.burst(e.x, e.y, 10, '#c8a0ff', 3, 18);
  }
  function fleeStep(e, g) {
    const f = e.fleeing; e.noContact = true; e.hold = true;
    if (e.stun > 0) return;
    f.t += g.ts; const dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy);
    if (d < 28 || f.t > 330) return escape(e, g);
    ED.phys.move(g, e, dx / d * f.speed * g.ts, dy / d * f.speed * g.ts);
    if (e.t % 5 < g.ts) g.burst(e.x, e.y, 1, '#c8a0ff', 1, 12);
  }
  function escape(e, g) {
    if (e.carriesKey) { g.killEnemy(e, { src: 'flee' }); return; }          // (cannot happen: carriers never flee) — but never lose a key
    e.dead = true; e.escaped = true; e.noLoot = true; g.burst(e.x, e.y, 22, '#c8a0ff', 4, 24); g.sfx('door');
    const h = meta(), run = g.run, cls = run.classId;
    run.hunt = run.hunt || { slain: [], escaped: [] };
    if (e.nem) {                                        // a nemesis slips away: scarred, stronger, renamed
      const nem = e.nem; nem.escapes++; nem.escFloor = g.floorNum; nem.from = g.floorNum + 1; h.escaped++;
      if (nem.escRun !== run.seed) { nem.escRun = run.seed; rankUp(nem, 'escape', SCAR[e.lastSrcKind] ? e.lastSrcKind : 'other'); }
      else nem.epi = epiFor(new ED.RNG('hunt:scar:' + nem.id + ':' + nem.escapes), nem, SCAR[e.lastSrcKind] ? e.lastSrcKind : 'other');
      save(); run.hunt.escaped.push(nem.name); g.toast(nem.name + ' ' + nem.epi + ' escapes — and returns stronger (rank ' + nem.rank + ')', '#ff9a6a', 260);
    } else {                                            // a plain elite survives: it becomes a nemesis only while there is room on the roster
      const n = makeNem({ seed: run.seed + ':' + g.floorNum + ':' + e.id, floor: g.floorNum, from: g.floorNum + 1, type: e.type, cls, wpn: '', origin: 'survivor', escapes: 1, escFloor: g.floorNum, scar: SCAR[e.lastSrcKind] ? e.lastSrcKind : 'other' });
      const a = admit(n, false);
      if (a.ok) { h.escaped++; run.hunt.escaped.push(n.name); g.toast(n.name + ' ' + n.epi + ' escaped! It will remember you.', '#ff9a6a', 260); } else { h.born--; h.nextId--; g.toast('The wounded foe slips away.', '#c8a0ff', 140); }
    }
  }

  // ------------------------------------------------------------------ dressing a named foe when it appears
  const trsOf = (nem) => traitsOf(nem);
  function dress(g, e) {
    const nem = e.nem, k = nem.rank - 1; e.nemDressed = true;
    e.maxHp = Math.max(e.maxHp, 24 * g.dif.enemyHp) * (1 + 0.28 * k); e.hp = e.maxHp;
    e.dmg *= 1 + 0.06 * k; e.shotDmg *= 1 + 0.06 * k; e.speed *= 1 + 0.025 * k;
    e.trs = trsOf(nem);
    const m = Object.create(NAMED, { color: { value: RANK_COL[nem.rank - 1] }, glyph: { value: '☠' } }); e.mods.unshift(m);
    for (const t of e.trs) if (t.apply) t.apply(e, g, nem);
    e.def.speed > 0.1 && (e.fleeRoll = new ED.RNG(g.run.seed + ':flee:' + nem.id + ':' + g.floorNum).chance(Math.min(0.7, 0.42 + 0.06 * nem.rank + 0.1 * Math.min(2, nem.escapes))));
    nem.seen++; for (const t of e.trs) if (t.vis) reveal(e, g, t.id, true);
    speak(e, g, 'intro');
    g.huntCard = { nem, t: 0, dur: 280, flash: 0, str: e.say.str };
    g.sfx('summon'); g.ringFx(e.x, e.y, 10, 90, RANK_COL[nem.rank - 1], 26, 6); g.shake(4);
    save();
  }
  ED.hook('spawn', V, (g, e) => {
    if (e.nem && !e.nemDressed) return dress(g, e);
    // ordinary elites in combat rooms may panic when beaten
    if (!e.elite || e.boss || e.minion || e.nemFollower || e.nem || e.fleeRoll !== undefined || !g.rt || !g.rt.enc || !ED.enemyTypes[e.type] || e.def.speed <= 0.1) return;
    const fl = g.floor; if (!fl || fl.huntFled >= 1) return;
    const rng = new ED.RNG(g.run.seed + ':fl:' + g.floorNum + ':' + g.room.id + ':' + (g.rt.huntSp = (g.rt.huntSp || 0) + 1));
    e.fleeRoll = rng.chance(0.2);
    if (e.fleeRoll) { e.mods.push(Object.create(NAMED, { color: { value: '#c8a0ff' }, glyph: { value: '' } })); }
  });

  // ------------------------------------------------------------------ ambushes: who waits where (decided when the floor is built)
  ED.hook('floorStart', V, (g) => {
    const f = g.floorNum, fl = g.floor; fl.hunt = null; fl.huntFled = 0; if (f < 2) return;
    const list = hunters(f); if (!list.length) return;
    const rooms = fl.rooms.filter(r => r.type === 'normal' && r.id !== fl.startId); if (!rooms.length) return;
    const rng = new ED.RNG(g.run.seed + ':hunt:floor:' + f), order = list.map(nm => [nm, nm.rank + rng.next() * 1.5]).sort((a, b) => b[1] - a[1] || a[0].id - b[0].id).map(x => x[0]), out = {}; let n = 0;
    for (const nem of order) {
      if (n >= 2) break;
      if (!rng.chance(Math.min(0.92, 0.5 + 0.08 * nem.rank))) continue;
      const r = rng.pick(rooms), cur = out[r.id] || (out[r.id] = []);
      if (cur.length >= 1 && !(f >= 6 && cur.length < 2)) continue;       // two in one room only from floor 6
      cur.push(nem.id); n++;
    }
    fl.hunt = n ? out : null;
  });
  ED.hook('roomEnter', V, (g, room) => {
    const rt = g.rt; if (!rt || rt.huntDone) return; rt.huntDone = true;
    const ids = g.floor.hunt && g.floor.hunt[room.id]; if (!ids || !rt.enc || room.cleared || !rt.enc.waves.length) return;
    const h = meta(), wave = rt.enc.waves[rt.enc.waves.length - 1];
    for (const id of ids) {
      const nem = h.roster.find(n => n.id === id && n.status === 'hunting'); if (!nem || wave.length >= D.CAPS.enemies) continue;
      const rng = new ED.RNG(g.run.seed + ':hunt:amb:' + id + ':' + g.floorNum);
      if (!defOk(nem.type)) nem.type = pickType(rng, g.floorNum, null);
      wave.push({ type: nem.type, elite: true, mods: [], extra: { nem } }); rt.huntAmbush = true;
    }
  });

  // ------------------------------------------------------------------ what hurt you last, what happens when it kills you
  ED.hook('hurt', V, (g, src, dmg) => {
    const run = g.run; if (!run) return;
    if (!src || src.kind !== 'enemy') { run.huntKiller = null; return; }
    const mini = !!(src.spec && src.spec.isMini), rev = !!(src.spec && src.spec.revenant);
    run.huntKiller = { nemId: src.nem ? src.nem.id : null, type: src.type, elite: !!src.elite, boss: !!src.boss && !mini, mini, rev, minion: !!src.minion || !!src.nemFollower, name: src.bossName || (src.def && src.def.name) || 'a foe', bossDef: src.bdef ? src.bdef.name : '' };
    if (src.nem && !src.dead) for (const t of src.trs || []) if (t.onHitPlayer) t.onHitPlayer(src, g);        // leech heals, brutal reveals — on any hit, contact or shot
  });
  ED.hook('runEnd', V, (g, victory) => {
    const run = g.run, p = g.player, h = meta(); run.huntReport = null; if (victory || !run || !p) return;
    const k = run.huntKiller; if (!k || k.rev || k.minion && !k.nemId) return;
    const wpn = p.weapon && I.WEAPONS[p.weapon.type] ? I.WEAPONS[p.weapon.type].name : 'weapon', floor = run.floorNum;
    const named = k.nemId && h.roster.find(n => n.id === k.nemId);
    if (named) {                                                       // it beat you again: promoted
      named.kills++; named.floor = floor; named.cls = run.classId; named.wpn = wpn; named.from = Math.max(2, floor - 3); named.killer = k.name;
      const before = named.rank; rankUp(named, 'kill'); save(); run.huntReport = { kind: 'ranked', name: named.name, epi: named.epi, rank: named.rank, up: named.rank > before, traits: named.str.length + 1 }; return;
    }
    let origin = null, rank = 1, boss = '';
    if (k.boss || k.mini) { origin = 'herald'; rank = 2; boss = k.bossDef || k.name; }
    else if (k.elite) origin = 'elite';
    else if (new ED.RNG(run.seed + ':hunt:promote:' + floor).chance(0.35)) origin = 'foe';
    if (!origin) return;
    const nem = makeNem({ seed: run.seed + ':' + floor, floor, from: Math.max(2, floor - 3), type: k.boss || k.mini ? null : k.type, cls: run.classId, wpn, killer: k.name, kills: 1, origin, rank, boss });
    const a = admit(nem, true); run.huntReport = { kind: 'born', name: nem.name, epi: nem.epi, rank: nem.rank, origin, evicted: a.evicted ? a.evicted.name : '' };
  });

  // ------------------------------------------------------------------ slaying one
  const LOOT_W = { weapon: 2, armor: 2, relic: 3, active: 0.6 };
  function lootKinds(nem) { const k = Object.assign({}, LOOT_W); for (const t of traitsOf(nem)) if (t.kind === 'S' && k[t.loot] !== undefined) k[t.loot] *= 3; return k; }
  ED.hook('kill', V, (g, e) => {
    if (!e.nem || e.escaped) return;
    const nem = e.nem, run = g.run, rank = nem.rank;
    e.say = null; for (const t of e.trs) reveal(e, g, t.id, true);
    retire(nem, g); run.hunt = run.hunt || { slain: [], escaped: [] }; run.hunt.slain.push(nem.name);
    g.toast(nem.name + ' ' + nem.epi + ' is SLAIN!', '#ffd24a', 260); g.sfx('bossdie'); g.shake(6); g.ringFx(e.x, e.y, 14, 140, '#ffd24a', 30, 7);
    g.addText(e.x, e.y - e.r - 20, line(nem, 'slain', run.classId), '#ffd8a0', 12);
    g.dropGold(e.x, e.y, 10 + 8 * rank + g.floorNum);
    if (rank >= 2) g.dropPickup('heart', e.x + 18, e.y, 4);
    g.rt.huntLoot = { nem, floor: g.floorNum };
    if (P.on('v6')) { const M = ED.save.meta; M.embers = (M.embers || 0) + 8 * rank; g.toast('+' + 8 * rank + ' embers', '#ffb04a', 120); }
    if (g.huntCard && g.huntCard.nem === nem) g.huntCard = null;
  });
  ED.hook('roomClear', V, (g, room) => {
    const L = g.rt && g.rt.huntLoot; if (!L || L.done) return; L.done = true;
    const nem = L.nem, rank = nem.rank, p = g.player, rng = g.rt.rng.fork('hunt' + nem.id);
    const offers = I.rollOffers(rng, g.floorNum + rank - 1, 3, { luck: p.st.luck + rank, relics: p.relics, minRank: rank >= 4 ? 2 : 1, kinds: lootKinds(nem) });
    if (offers.length) { const cx = 480, gid = ED.id(); offers.forEach((it, i) => g.pedestal(it, cx + (i - (offers.length - 1) / 2) * 90, 190, { group: gid })); g.toast('A nemesis falls — choose its spoils.', '#ffd24a', 220); }
    const ts = traitsOf(nem).filter(t => t.kind === 'S');
    if (ts.some(t => t.loot === 'bombs')) g.dropPickup('bomb', 440, 300, 2, { still: true });
    if (ts.some(t => t.loot === 'gold')) g.dropGold(520, 300, 14 + 4 * rank);
  });

  // ------------------------------------------------------------------ drawing: name tags, speech, the intro card
  ED.hook('tick', V, (g) => {
    const k = g.huntCard; if (!k) return; k.t++; if (k.flash > 0) k.flash--; if (k.t > k.dur) g.huntCard = null;
  });
  ED.hook('draw', V, (g, c, t) => {
    for (const e of g.enemies) {
      if (e.dead || !e.nem) continue;
      const nem = e.nem, y = e.y - e.r - 26, col = RANK_COL[nem.rank - 1];
      c.save(); c.textAlign = 'center'; c.font = 'bold 11px monospace';
      const label = nem.name + ' ' + nem.epi, w = c.measureText(label).width + 10;
      c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(e.x - w / 2, y - 11, w, 14); c.fillStyle = col; c.fillText(label, e.x, y);
      for (let i = 0; i < nem.rank; i++) { c.fillStyle = col; c.beginPath(); c.moveTo(e.x + (i - (nem.rank - 1) / 2) * 8, y - 18); c.lineTo(e.x + (i - (nem.rank - 1) / 2) * 8 + 3, y - 14); c.lineTo(e.x + (i - (nem.rank - 1) / 2) * 8, y - 11); c.lineTo(e.x + (i - (nem.rank - 1) / 2) * 8 - 3, y - 14); c.closePath(); c.fill(); }
      if (e.fleeing) { c.fillStyle = '#ffd24a'; c.font = 'bold 12px monospace'; c.fillText('FLEEING', e.x, e.y + e.r + 16); }
      if (e.say) {
        const a = U.clamp(e.say.t < 10 ? e.say.t / 10 : e.say.t > 140 ? (170 - e.say.t) / 30 : 1, 0, 1); c.globalAlpha = a; c.font = 'italic 12px monospace';
        const sw = Math.min(330, c.measureText(e.say.str).width + 16), sx = U.clamp(e.x, sw / 2 + 4, C.ROOM_W - sw / 2 - 4), sy = Math.max(26, y - 34);
        c.fillStyle = 'rgba(14,10,24,0.88)'; c.fillRect(sx - sw / 2, sy - 12, sw, 18); c.strokeStyle = col; c.lineWidth = 1.5; c.strokeRect(sx - sw / 2, sy - 12, sw, 18);
        c.fillStyle = '#f0e0ff'; c.fillText(e.say.str, sx, sy + 1);
      }
      c.restore();
    }
    for (const e of g.enemies) if (!e.dead && e.fleeRoll && e.elite && !e.nem && e.fleeing) { c.save(); c.fillStyle = '#ffd24a'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('FLEEING', e.x, e.y + e.r + 16); if (e.say) { c.font = 'italic 11px monospace'; c.fillStyle = '#e0d0f0'; c.fillText(e.say.str, e.x, e.y - e.r - 26); } c.restore(); }
  });
  ED.hook('hud', V, (g, c) => {
    const k = g.huntCard; if (!k) return;
    const nem = k.nem, a = U.clamp(k.t < 14 ? k.t / 14 : k.t > k.dur - 30 ? (k.dur - k.t) / 30 : 1, 0, 1), col = RANK_COL[nem.rank - 1], x = C.W / 2 - 270, y = C.H - 132, w = 540, h = 104, u = ED.ui;
    c.save(); c.globalAlpha = a; u.panel(c, x, y, w, h, col, 0.94);
    if (k.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + 0.12 * k.flash / 40 + ')'; c.fillRect(x, y, w, h); }
    const def = ED.enemyTypes[nem.type] || { shape: 'circle', color: '#d9534f' };
    c.fillStyle = def.color; c.strokeStyle = col; c.lineWidth = 3; ED.render.shape(c, def.shape, x + 44, y + 52, 24, 0, g.frameAll); c.fill(); c.stroke();
    u.shadow(c, nem.name + ' ' + nem.epi, x + 86, y + 26, 20, col, 'left');
    u.text(c, 'RANK ' + nem.rank + ' · ' + RANKS[nem.rank - 1].toUpperCase() + (nem.kills ? '  ·  has beaten you ' + nem.kills + 'x' : '') + (nem.escapes ? '  ·  escaped ' + nem.escapes + 'x' : ''), x + 86, y + 44, 11, '#c8c8e0', 'left', false);
    let tx = x + 86; const all = traitsOf(nem).sort((p, q) => (p.kind === 'S' ? 0 : 1) - (q.kind === 'S' ? 0 : 1));
    for (const t of all) { const known = nem.known.indexOf(t.id) >= 0, lab = known ? t.glyph + ' ' + t.name : '? ? ?'; c.font = 'bold 11px monospace'; const tw = c.measureText(lab).width + 12; c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(tx, y + 52, tw, 17); c.strokeStyle = known ? t.color : '#4a4a68'; c.lineWidth = 1; c.strokeRect(tx + 0.5, y + 52.5, tw - 1, 16); u.text(c, lab, tx + 6, y + 65, 11, known ? t.color : '#7a7a98'); tx += tw + 6; }
    u.text(c, '“' + k.str + '”', x + 86, y + 90, 12, '#f0e0ff', 'left', false);
    c.restore();
  });

  // ------------------------------------------------------------------ title / class select / end screen
  const UI = () => ED.ui;
  ED.hook('titleUI', V, (g, c) => {
    const n = meta().roster.length;
    UI().button(c, 'hunt', 'THE HUNT  ·  ' + (n ? n + ' hunting you' : 'no one yet'), C.W - 262, 134, 246, 32, { size: 12, color: '#ff6a8a' });
  });
  ED.hook('selectUI', V, (g, c) => {
    const r = meta().roster; if (!r.length) return; const top = r.slice().sort((a, b) => b.rank - a.rank)[0];
    UI().text(c, '☠ ' + r.length + ' nemes' + (r.length > 1 ? 'es' : 'is') + ' hunt' + (r.length > 1 ? '' : 's') + ' you — the worst: ' + top.name + ' ' + top.epi + ' (rank ' + top.rank + ')', C.W / 2, 626, 11, '#ff8aa8', 'center', false);
  });
  ED.hook('endUI', V, (g, c) => {
    const r = g.run, rep = r.huntReport, u = UI(), x = 480, y = 328, sl = r.hunt && r.hunt.slain.length ? r.hunt.slain.length : 0; if (!rep && !sl) return;
    const parts = [];
    if (rep && rep.kind === 'ranked') parts.push('☠ ' + rep.name + ' ' + rep.epi + ' beat you again — rank ' + rep.rank + (rep.up ? ' (promoted)' : ''));
    else if (rep && rep.kind === 'born') parts.push('☠ ' + rep.name + ' ' + rep.epi + ' rises' + (rep.origin === 'herald' ? ' (boss herald)' : '') + ' and will hunt you' + (rep.evicted ? ' · ' + rep.evicted + ' lost your trail' : ''));
    if (sl) parts.push('⚔ ' + sl + ' slain');
    u.text(c, parts.join('   ·   '), x, y, 10, rep ? '#ff8aa8' : '#ffd24a', 'center');
  });

  // ------------------------------------------------------------------ THE HUNT screen
  let sel = null;
  ED.sceneImpl.hunt = {
    draw(g, c) {
      const h = meta(), u = UI();
      u.shadow(c, 'THE HUNT', C.W / 2, 50, 34, '#ff6a8a', 'center');
      u.text(c, 'Foes that beat you come back with a name. Slay them for spoils — or they grow stronger.', C.W / 2, 72, 12, '#a8a8c8', 'center', false);
      if (!h.roster.length) {
        u.text(c, 'No one hunts you yet.', C.W / 2, 250, 20, '#8a8aa8', 'center'); u.text(c, 'Die to an elite or a boss, or let a wounded elite slip away, and it will remember you.', C.W / 2, 282, 13, '#6a6a88', 'center', false);
      }
      if (!sel || !h.roster.find(n => n.id === sel)) sel = h.roster.length ? h.roster[0].id : null;
      h.roster.forEach((nem, i) => {
        const y = 92 + i * 56, on = nem.id === sel, col = RANK_COL[nem.rank - 1], def = ED.enemyTypes[nem.type] || { shape: 'circle', color: '#d9534f' };
        u.button(c, 'sel:' + nem.id, '', 40, y, 400, 52, { color: col, selected: on });
        c.fillStyle = def.color; c.strokeStyle = col; c.lineWidth = 2; ED.render.shape(c, def.shape, 70, y + 26, 15, 0, u.t); c.fill(); c.stroke();
        u.text(c, nem.name + ' ' + nem.epi, 96, y + 21, 14, on ? '#fff' : '#e0e0f0');
        u.text(c, 'Rank ' + nem.rank + ' ' + RANKS[nem.rank - 1] + '  ·  beat you ' + nem.kills + 'x' + (nem.escapes ? '  ·  escaped ' + nem.escapes + 'x' : '') + '  ·  F' + nem.floor, 96, y + 40, 10, '#9a9ab8', 'left', false);
        let gx = 428; for (const t of traitsOf(nem).reverse()) { const known = nem.known.indexOf(t.id) >= 0; u.text(c, known ? t.glyph : '?', gx, y + 21, 14, known ? t.color : '#5a5a78', 'right'); gx -= 18; }
      });
      const nem = h.roster.find(n => n.id === sel);
      u.panel(c, 460, 92, 460, 484, nem ? RANK_COL[nem.rank - 1] : '#4a4a68', 0.9);
      if (nem) {
        const col = RANK_COL[nem.rank - 1], def = ED.enemyTypes[nem.type] || { shape: 'circle', color: '#d9534f', name: '?' };
        c.fillStyle = def.color; c.strokeStyle = col; c.lineWidth = 4; ED.render.shape(c, def.shape, 516, 150, 34, 0, u.t); c.fill(); c.stroke();
        u.shadow(c, nem.name, 566, 134, 24, col, 'left'); u.text(c, nem.epi, 566, 156, 15, '#e0d0f0', 'left', false);
        for (let i = 0; i < 5; i++) { c.fillStyle = i < nem.rank ? col : '#2a2a3c'; c.beginPath(); c.moveTo(580 + i * 18, 166); c.lineTo(588 + i * 18, 176); c.lineTo(580 + i * 18, 186); c.lineTo(572 + i * 18, 176); c.closePath(); c.fill(); }
        u.text(c, 'RANK ' + nem.rank + ' · ' + RANKS[nem.rank - 1].toUpperCase(), 676, 181, 11, col);
        let y = 214;
        u.text(c, 'A ' + (def.name || nem.type) + (nem.boss ? ' sworn to ' + nem.boss : '') + ' · ' + ({ elite: 'rose from an elite that killed you', herald: 'a herald of a boss that killed you', foe: 'a foe that killed you and was promoted', survivor: 'a survivor you let get away' }[nem.origin] || ''), 480, y, 11, '#a8a8c8', 'left', false); y += 18;
        u.text(c, 'Last beat a ' + clsName(nem.cls) + ' on floor ' + nem.floor + (nem.wpn ? ' (' + nem.wpn + ')' : '') + ' · hunts from floor ' + Math.max(2, nem.from || 2), 480, y, 11, '#a8a8c8', 'left', false); y += 26;
        const row = (t) => {
          const known = nem.known.indexOf(t.id) >= 0, tip = known && t.kind === 'W', hh = known ? 22 + u.wrapHeight(c, t.desc, 380, 12, 10) + (tip ? u.wrapHeight(c, 'Tip: ' + t.hint, 380, 12, 10) : 0) : 22;
          c.fillStyle = known ? U.rgba(t.color, 0.14) : 'rgba(255,255,255,0.04)'; c.fillRect(476, y - 14, 428, hh);
          u.text(c, known ? t.glyph : '?', 492, y + 2, 15, known ? t.color : '#5a5a78', 'center');
          u.text(c, known ? t.name : 'Unknown ' + (t.kind === 'S' ? 'strength' : 'weakness') + ' — fight it to find out', 510, y + 2, 12, known ? '#fff' : '#7a7a98', 'left', known);
          if (known) { const y2 = u.wrap(c, t.desc, 510, y + 16, 380, 12, 10, '#c8c8e0'); if (tip) u.wrap(c, 'Tip: ' + t.hint, 510, y2 + 1, 380, 12, 10, '#9ad0ff'); }
          y += hh + 6;
        };
        u.text(c, 'STRENGTHS', 480, y, 11, '#ff8a6a'); y += 20; for (const id of nem.str) row(BY_ID[id]); if (!nem.str.length) { u.text(c, 'none yet', 510, y, 11, '#6a6a88', 'left', false); y += 24; }
        u.text(c, 'WEAKNESS', 480, y + 2, 11, '#6ee07a'); y += 24; row(BY_ID[nem.weak]);
        u.text(c, '“' + introLine(nem, g.run ? g.run.classId : ED.save.meta.lastClass) + '”', 690, 560, 11, '#f0e0ff', 'center', false);
      }
      u.text(c, 'THE FALLEN' + (h.slain ? '  —  ' + h.slain + ' slain in all' : ''), 40, 478, 11, '#8a8aa8');
      if (!h.fallen.length) u.text(c, 'None yet.', 40, 496, 11, '#5a5a78', 'left', false);
      h.fallen.slice(0, 4).forEach((f, i) => u.text(c, '☠ ' + f.name + ' ' + f.epi + '  ·  rank ' + f.rank + '  ·  slain on floor ' + f.floor + ' as a ' + clsName(f.cls), 40, 496 + i * 17, 11, '#a0a0b8', 'left', false));
      u.button(c, 'back', 'Back', C.W / 2 - 100, 592, 200, 34, { size: 14 });
    },
    update(g, a, inp) {
      if (a === 'back' || inp.consume('back')) { ED.menus.go(g, 'title'); return; }
      if (a && a.indexOf('sel:') === 0) { sel = +a.slice(4); g.sfx('ui'); }
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

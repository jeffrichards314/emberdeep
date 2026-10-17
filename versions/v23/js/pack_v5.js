/* EMBERDEEP — pack_v5.js : v5 "FATE" — fateful encounters and companions.
 *
 *  A new room type, the Fateful Encounter: someone (or something) offers you a choice.  Like every gamble in EMBERDEEP the
 *  costs and odds are written on the buttons before you commit.  Seventeen encounters; several lead to fights, relics, curses or a
 *  companion.  Six familiars follow you from floor to floor and each does something different.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, D = ED.D, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v5';

  P.define({
    id: 'v5', name: 'FATE', tag: 'choices, bargains and companions', color: '#ff9aff',
    blurb: 'A new room type — the Fateful Encounter — with 17 choose-your-fate events whose costs and odds are always shown, plus six familiars that follow you and fight, shield or heal.',
  });

  // ------------------------------------------------------------------ room type
  ED.roomTypes.event = { id: 'event', name: 'Fateful Encounter', cat: 'mixed', color: '#ff9aff', icon: 'q', keyHost: false, layouts: ['open', 'ring', 'pillars4'], pack: V };
  D.ROOM_WEIGHTS.event = { w: 10, slope: 0.004, min: 1, max: 1.3, from: 2, cat: 'mixed', pack: V };

  // ------------------------------------------------------------------ helpers
  const wtable = (rng, table) => { const keys = Object.keys(table); let tot = 0; for (const k of keys) tot += table[k]; let r = rng.next() * tot; for (const k of keys) { r -= table[k]; if (r < 0) return k; } return keys[0]; };
  const pctText = (t) => { let tot = 0; for (const k in t) tot += t[k]; return Object.keys(t).filter(k => t[k] > 0).map(k => Math.round(100 * t[k] / tot) + '% ' + k).join(' · '); };
  const BLESSINGS = [
    { name: 'Fury', mods: { dmg: 0.12 }, desc: '+12% damage' }, { name: 'Haste', mods: { speed: 0.07, atkSpd: 0.08 }, desc: '+7% speed, +8% attack speed' },
    { name: 'Warding', mods: { def: 2 }, desc: '+2 defense' }, { name: 'Fortune', mods: { luck: 2, gold: 0.15 }, desc: 'luckier loot, +15% gold' },
  ];
  const CURSES = [
    { name: 'Brittle Bones', mods: { dmgTaken: 0.15 }, desc: '+15% damage taken' }, { name: 'Heavy Limbs', mods: { speed: -0.08, dashCd: 0.12 }, desc: '-8% speed, slower dash' },
    { name: 'Dull Edge', mods: { dmg: -0.1 }, desc: '-10% damage' }, { name: 'Hollow Purse', mods: { gold: -0.2 }, desc: '-20% gold found' },
  ];
  const bless = (g, rng) => { const b = rng.pick(BLESSINGS); g.buffPlayer({ name: b.name, mods: b.mods }); g.sfx('shrine'); return 'BLESSING of ' + b.name + ': ' + b.desc + '.'; };
  const curse = (g, rng) => { const c = Object.assign({}, rng.pick(CURSES)); g.cursePlayer(c); g.sfx('curse'); g.flashScreen('#6000a0', 0.25); return 'CURSED — ' + c.name + ': ' + c.desc + '.'; };
  const price = (g, k) => Math.max(10, Math.round((18 + 4 * g.floorNum) * k / 5) * 5);
  const ownedRelics = (p) => Object.keys(p.relics).filter(id => { const r = I.relic(id); return r && !r.passive && !r.hidden; });
  const gold = (g, n) => { g.player.gold -= n; g.sfx('buy'); };

  /** lock the room and spawn a fight; onWin runs when the last foe falls */
  function startFight(g, entries, onWin) {
    const rt = g.rt, p = g.player; rt.evFight = { onWin, t: 0 }; g.lockRoom(true);
    for (const en of entries) { const s = g.findSpot(p.x, p.y, 190, 330, 16); g.queueSpawn(en.type, s.x, s.y, { elite: en.elite, mods: en.mods }); }
    g.toast('To arms!', '#ff9a6a', 90);
  }
  function eliteEntries(g, rng, n, mods) { const pool = D.enemyPool(g.floorNum).filter(t => !ED.enemyTypes[t].group && !ED.enemyTypes[t].noElite); const out = []; for (let i = 0; i < n; i++) out.push(D.makeElite({ type: rng.pick(pool), elite: false, mods: [] }, g.floorNum, rng, mods)); return out; }

  // ------------------------------------------------------------------ the seventeen encounters
  const EV = [
    { id: 'merchant', title: 'The Hooded Merchant', color: '#6fe08a', npc: 'Hooded Merchant', from: 2, weight: 1,
      setup(g, rng) { return { relic: I.rollRelic(rng, g.floorNum + 2, { relics: g.player.relics, luck: g.player.st.luck, minRank: 1, noRisk: true }) }; },
      text: (g, st) => 'A merchant beckons from the shadows. "Rare things for rare folk," he whispers, and shows you a ' + I.RARITY[I.relic(st.relic.id).rarity].name.toLowerCase() + ' relic: ' + I.relic(st.relic.id).name + ' — "' + I.relic(st.relic.id).desc + '"',
      choices: [
        { label: 'Buy it', sub: (g, st) => price(g, 4) + ' gold', can: (g) => g.player.gold >= price(g, 4), run: (g, st) => { gold(g, price(g, 4)); g.equipItem(st.relic); return 'The merchant vanishes with your coin. The relic is yours.'; } },
        { label: 'Barter: trade one random relic for TWO unknown ones', sub: () => 'lose a random relic · gain two of equal-or-better quality', can: (g) => ownedRelics(g.player).length >= 1,
          run: (g, st, rng) => { const p = g.player, id = rng.pick(ownedRelics(p)), rk = Math.max(0, I.RARITY[I.relic(id).rarity].rank - 1); p.relics[id]--; if (p.relics[id] <= 0) delete p.relics[id]; I.recalc(p); const a = I.rollRelic(rng, g.floorNum, { relics: p.relics, minRank: rk, noRisk: true }), b = I.rollRelic(rng, g.floorNum, { relics: p.relics, minRank: rk, noRisk: true, exclude: [a.id] }); g.equipItem(a, true); g.equipItem(b, true); return 'You hand over the ' + I.relic(id).name + '. He returns the ' + I.relic(a.id).name + ' and the ' + I.relic(b.id).name + '.'; } },
        { label: 'Walk away', sub: () => 'nothing happens', run: () => 'You leave him to his business.', leaves: false },
      ] },
    { id: 'bloodaltar', title: 'The Bleeding Altar', color: '#ff4a5a', npc: 'Bleeding Altar', from: 2, weight: 1,
      text: () => 'A stone basin brims with old blood. A voice from nowhere: "Give, and be given."',
      choices: [
        { label: 'Open a vein', sub: (g) => 'lose 30% of current HP (never lethal) · gain a random blessing', can: (g) => g.player.hp > 4, run: (g, st, rng) => { const p = g.player, n = Math.min(p.hp - 1, Math.max(1, Math.round(p.hp * 0.3))); p.hp -= n; g.addText(p.x, p.y - 20, '-' + n, '#ff4a5a', 14); return 'The basin drinks. ' + bless(g, rng); } },
        { label: 'Offer gold instead', sub: (g) => price(g, 2.5) + ' gold · 60% blessing · 40% nothing', can: (g) => g.player.gold >= price(g, 2.5), run: (g, st, rng) => { gold(g, price(g, 2.5)); return rng.chance(0.6) ? bless(g, rng) : 'The basin is unmoved. The coins sink out of sight.'; } },
        { label: 'Leave', sub: () => '', run: () => 'You back away from the altar.', leaves: false },
      ] },
    { id: 'beggar', title: 'The Beggar', color: '#c8b090', npc: 'Beggar', from: 2, weight: 1,
      text: () => 'A thin figure in rags holds out a bowl. "Anything, traveller. The dark takes everything eventually."',
      choices: [
        { label: 'Give a few coins', sub: (g) => price(g, 1) + ' gold · 45% a blessing, 55% a thank-you', can: (g) => g.player.gold >= price(g, 1), run: (g, st, rng) => { gold(g, price(g, 1)); return rng.chance(0.45) ? 'Their eyes clear for a moment. ' + bless(g, rng) : '"Bless you." Nothing more.'; } },
        { label: 'Give generously', sub: (g) => price(g, 3) + ' gold · a blessing — and a relic 30% of the time', can: (g) => g.player.gold >= price(g, 3), run: (g, st, rng) => { gold(g, price(g, 3)); let s = bless(g, rng); if (rng.chance(0.3)) { const r = I.rollRelic(rng, g.floorNum, { relics: g.player.relics, minRank: 1, noRisk: true }); g.equipItem(r, true); s += ' From beneath the rags: the ' + I.relic(r.id).name + '.'; } return s; } },
        { label: 'Walk past', sub: () => '', run: () => 'You walk on. The bowl stays empty.', leaves: false },
      ] },
    { id: 'library', title: 'The Forbidden Library', color: '#b090ff', npc: 'Lectern', from: 3, weight: 1,
      text: () => 'Dust, silence, and three open books on a lectern. Each hums faintly. You may read only one.',
      choices: [
        { label: 'Tome of Fury', sub: () => '+12% damage · but -1 defense', run: (g) => { g.buffPlayer({ name: 'Tome of Fury', mods: { dmg: 0.12, def: -1 } }); return 'The words burn into you. You hit harder, and guard worse.'; } },
        { label: 'Tome of Warding', sub: () => '+2 defense · but -7% speed', run: (g) => { g.buffPlayer({ name: 'Tome of Warding', mods: { def: 2, speed: -0.07 } }); return 'Runes settle on your skin like armor.'; } },
        { label: 'The Forbidden Tome', sub: () => '50% a rare+ relic · 50% a curse', run: (g, st, rng) => { if (rng.chance(0.5)) { const r = I.rollRelic(rng, g.floorNum, { relics: g.player.relics, minRank: 2, noRisk: true }); g.equipItem(r); return 'The book rewrites itself around you. Gained: ' + I.relic(r.id).name + '.'; } return curse(g, rng); } },
      ] },
    { id: 'well', title: 'The Whispering Well', color: '#7fd8ff', npc: 'Whispering Well', from: 2, weight: 1,
      text: () => 'A well breathes cold air. Coins glitter at the bottom. "Cast a wish," it murmurs, "and I will weigh it."',
      choices: [
        { label: 'Toss a small coin', sub: (g) => price(g, 1) + ' gold · ' + pctText({ nothing: 55, 'a heart': 35, 'two bombs': 10 }), can: (g) => g.player.gold >= price(g, 1), run: (g, st, rng) => { gold(g, price(g, 1)); const o = wtable(rng, { nothing: 55, heart: 35, bombs: 10 }); if (o === 'heart') { g.healPlayer(8); return 'Warmth floods through you. (+2 hearts)'; } if (o === 'bombs') { g.player.bombs += 2; return 'Two bombs bob up in the water.'; } return 'The well is silent.'; } },
        { label: 'Toss a gold piece', sub: (g) => price(g, 2.5) + ' gold · ' + pctText({ nothing: 40, 'an uncommon+ relic': 40, 'a heart container': 20 }), can: (g) => g.player.gold >= price(g, 2.5), run: (g, st, rng) => { gold(g, price(g, 2.5)); const o = wtable(rng, { nothing: 40, relic: 40, hc: 20 }); if (o === 'relic') { const r = I.rollRelic(rng, g.floorNum, { relics: g.player.relics, minRank: 1, noRisk: true }); g.equipItem(r); return 'The water glows. The ' + I.relic(r.id).name + ' rises.'; } if (o === 'hc') { g.player.bonusHp += 4; I.recalc(g.player); g.healPlayer(4); return 'Your very life deepens. (+1 heart container)'; } return 'Ripples. Nothing more.'; } },
        { label: 'Pour in a fortune', sub: (g) => price(g, 6) + ' gold · ' + pctText({ nothing: 25, 'a rare+ relic': 45, 'an epic+ relic': 30 }), can: (g) => g.player.gold >= price(g, 6), run: (g, st, rng) => { gold(g, price(g, 6)); const o = wtable(rng, { nothing: 25, rare: 45, epic: 30 }); if (o === 'nothing') return 'The well swallows it all and says nothing.'; const r = I.rollRelic(rng, g.floorNum + 3, { relics: g.player.relics, minRank: o === 'epic' ? 3 : 2, noRisk: true }); g.equipItem(r); return 'The well trembles and gives up the ' + I.relic(r.id).name + '.'; } },
        { label: 'Step back', sub: () => '', run: () => 'You let the well keep its secrets.', leaves: false },
      ] },
    { id: 'corpse', title: 'A Fallen Adventurer', color: '#a09a8a', npc: 'Fallen Adventurer', from: 3, weight: 1,
      text: () => 'An adventurer lies against the wall, pack still strapped on. Too still. Too convenient?',
      choices: [
        { label: 'Search the body', sub: () => pctText({ 'good loot': 55, 'it was a trap (a fight, then loot)': 30, nothing: 15 }), run: (g, st, rng) => {
            const o = wtable(rng, { loot: 55, trap: 30, none: 15 });
            if (o === 'loot') { const it = I.rollOffers(rng, g.floorNum + 2, 1, { luck: g.player.st.luck, relics: g.player.relics, minRank: 2 })[0]; g.dropLoot(it, 480, 330); return 'You find something worth the risk.'; }
            if (o === 'trap') { startFight(g, eliteEntries(g, rng, 2, 1), (gg) => { const it = I.rollOffers(rng, gg.floorNum + 2, 1, { luck: gg.player.st.luck, relics: gg.player.relics, minRank: 2 })[0]; gg.dropLoot(it, 480, 330); gg.toast('The pack was real after all.', '#ffd24a', 140); }); return 'The corpse sits up. It was bait — and you are not alone!'; }
            return 'Just bones and an empty pack.'; } },
        { label: 'Say a quiet word and move on', sub: () => '', run: () => 'You pay your respects.', leaves: false },
      ] },
    { id: 'duelist', title: 'The Duelist', color: '#ffb02a', npc: 'Duelist', from: 4, weight: 1,
      text: () => 'A masked fighter bows. "One round. If you win, take your pick of my spoils. If you lose..." He shrugs.',
      choices: [
        { label: 'Accept the duel', sub: () => 'one tough elite · win: choose 1 of 3 rare+ relics', run: (g, st, rng) => { const en = eliteEntries(g, rng, 1, 2); startFight(g, en, (gg) => { const offers = []; for (let i = 0; i < 3; i++) offers.push(I.rollRelic(rng, gg.floorNum + 1, { relics: gg.player.relics, minRank: 2, noRisk: true, exclude: offers.map(o => o.id) })); gg.offerChoice(offers, 480, 300); gg.toast('Well fought. Choose your prize.', '#ffd24a', 160); }); return '"En garde!"'; } },
        { label: 'Decline', sub: () => '', run: () => 'He tips his mask and fades back into the dark.', leaves: false },
      ] },
    { id: 'forge', title: 'The Forge Spirit', color: '#ff7a2a', npc: 'Forge Spirit', from: 3, weight: 1,
      text: (g) => 'A restless flame hovers over a cold anvil. "Your ' + g.player.weapon.name + ' is dull. I can fix that — for a price."',
      choices: [
        { label: 'Reforge for gold (+2 weapon levels)', sub: (g) => price(g, 5) + ' gold', can: (g) => g.player.gold >= price(g, 5), run: (g) => { gold(g, price(g, 5)); g.player.weapon.upg = (g.player.weapon.upg || 0) + 2; I.recalc(g.player); return 'The flame sinks into the blade. It sings. (+2)'; } },
        { label: 'Reforge in blood (+3 weapon levels)', sub: () => 'lose one heart container permanently', can: (g) => g.player.maxHp >= 16, run: (g) => { const p = g.player; p.bonusHp -= 4; p.weapon.upg = (p.weapon.upg || 0) + 3; I.recalc(p); g.sfx('curse'); return 'The spirit takes its due. Your weapon blazes. (+3)'; } },
        { label: 'Decline', sub: () => '', run: () => '"Your loss," it crackles.', leaves: false },
      ] },
    { id: 'cage', title: 'The Caged Creature', color: '#9bf08a', npc: 'Iron Cage', from: 2, weight: 1.8,
      setup(g, rng) { return { fam: rng.pick(Object.keys(FAM)) }; },
      text: (g, st) => 'Something small and bright paces behind rusted bars: a ' + FAM[st.fam].name + '. ' + FAM[st.fam].desc,
      choices: [
        { label: 'Open the cage', sub: () => 'it joins you (replaces your current companion)', run: (g, st) => { giveFamiliar(g, st.fam, 1); return 'It leaps to your shoulder. ' + FAM[st.fam].name + ' joins you.'; } },
        { label: 'Feed it first — it will be stronger', sub: (g) => price(g, 2) + ' gold · companion level 2', can: (g) => g.player.gold >= price(g, 2), run: (g, st) => { gold(g, price(g, 2)); giveFamiliar(g, st.fam, 2); return 'It devours the coins and grows. A level 2 ' + FAM[st.fam].name + ' joins you.'; } },
        { label: 'Leave it', sub: () => '', run: () => 'You leave it in the dark.', leaves: false },
      ] },
    { id: 'dice', title: 'The Dice of Fate', color: '#f0f0f0', npc: 'Dice of Fate', from: 2, weight: 1,
      text: () => 'Four ivory dice sit on a mossy table, each carved with a different face. "Roll," they seem to say. "Every outcome is shown. Every one is real."',
      choices: [
        { label: 'Roll once', sub: () => pctText({ '+1 heart container': 25, '-1 heart container': 25, '+gold': 25, 'full heal': 25 }), run: (g, st, rng) => { const o = wtable(rng, { up: 25, down: 25, gold: 25, heal: 25 }), p = g.player; if (o === 'up') { p.bonusHp += 4; I.recalc(p); g.healPlayer(4); return 'A heart container! (+1)'; } if (o === 'down') { if (p.maxHp > 12) { p.bonusHp -= 4; I.recalc(p); return 'The dice take a heart container. (-1)'; } return 'The dice reach for a heart container, but you have none to spare.'; } if (o === 'gold') { const n = 40 + g.floorNum * 6; g.giveGold(n); return 'Gold spills across the table. (+' + n + ')'; } g.healPlayer(p.maxHp); return 'Warm light. You are whole again.'; } },
        { label: 'Leave the dice', sub: () => '', run: () => 'You resist the urge.', leaves: false },
      ] },
    { id: 'mirror', title: 'The Mirror of Truth', color: '#c0e8ff', npc: 'Tall Mirror', from: 2, weight: 1,
      text: () => 'A tall mirror shows this floor as it truly is: every room, every door, laid bare.',
      choices: [
        { label: 'Gaze deeply', sub: () => 'reveals every room on this floor', run: (g) => { for (const r of g.floor.rooms) r.discovered = true; return 'The map blooms in your mind. Every room is known.'; } },
        { label: 'Shatter it', sub: () => '2 bombs and 25 gold · but 7 years of bad luck (-1 luck for the run)', run: (g) => { g.player.bombs += 2; g.giveGold(25); g.buffPlayer({ name: 'Broken Mirror', mods: { luck: -1 } }); g.sfx('crack'); return 'It bursts into glittering shards. You pocket what you can.'; } },
        { label: 'Look away', sub: () => '', run: () => 'You avert your eyes.', leaves: false },
      ] },
    { id: 'campfire', title: 'A Lonely Campfire', color: '#ff9a4a', npc: 'Campfire', from: 2, weight: 1.6, fightReward: false,        // its ambush is the price of resting: no spoils
      text: () => 'Someone left a fire burning in the dark: warm, unattended, a bedroll beside it, a whetstone on a flat rock.',
      choices: [
        { label: 'Rest by the fire', sub: () => 'heal 60% of your health · 30% chance the light draws attackers', can: (g) => g.player.hp < g.player.maxHp,
          run: (g, st, rng) => { g.healPlayer(Math.ceil(g.player.maxHp * 0.6)); g.sfx('heal'); if (rng.chance(0.3)) { startFight(g, eliteEntries(g, rng, 1, 1), (gg) => gg.toast('Quiet again. The fire still burns.', '#ffd24a', 120)); return 'Warmth, then a shadow at the edge of the light — you are not alone!'; } return 'You sleep an hour without dreams. Your wounds close.'; } },
        { label: 'Sharpen your weapon', sub: () => '+1 weapon level · 15% chance of company', run: (g, st, rng) => { g.player.weapon.upg = (g.player.weapon.upg || 0) + 1; I.recalc(g.player); g.sfx('block'); if (rng.chance(0.15)) { startFight(g, eliteEntries(g, rng, 1, 1), (gg) => gg.toast('The edge held.', '#ffd24a', 120)); return 'Your whetstone rings out — and something answers. (+1)'; } return 'The edge takes a better line. (+1)'; } },
        { label: 'Sit with the embers', sub: () => 'a random blessing · 25% chance of a curse instead', run: (g, st, rng) => (rng.chance(0.25) ? curse(g, rng) : bless(g, rng)) },
        { label: 'Move on', sub: () => '', run: () => 'You leave the fire to the dark.', leaves: false },
      ] },
    { id: 'font', title: 'The Cleansing Font', color: '#9fe8ff', npc: 'Cleansing Font', from: 3, weight: 1.6, when: (g) => g.player.curses.length > 0,
      text: (g) => 'Clear water wells from a cracked basin and the weight on your shoulders eases. You carry ' + g.player.curses.length + ' curse' + (g.player.curses.length > 1 ? 's' : '') + '. "Pay, and be unburdened."',
      choices: [
        { label: 'Wash one curse away', sub: (g) => price(g, 2) + ' gold · removes the oldest curse', can: (g) => g.player.gold >= price(g, 2) && g.player.curses.length > 0, run: (g) => { gold(g, price(g, 2)); const c = g.player.curses.shift(); I.recalc(g.player); g.sfx('heal'); return 'The water carries ' + c.name + ' away.'; } },
        { label: 'Immerse yourself', sub: () => 'lose 25% of current HP (never lethal) · removes EVERY curse', can: (g) => g.player.curses.length > 0 && g.player.hp > 4, run: (g) => { const p = g.player, n = Math.min(p.hp - 1, Math.max(1, Math.round(p.hp * 0.25))); p.hp -= n; g.addText(p.x, p.y - 20, '-' + n, '#9fe8ff', 14); const k = p.curses.length; p.curses.length = 0; I.recalc(p); g.sfx('heal'); return 'Cold, then clean. ' + k + ' curse' + (k > 1 ? 's' : '') + ' dissolve.'; } },
        { label: 'Leave', sub: () => '', run: () => 'You step back from the water.', leaves: false },
      ] },
    { id: 'lockbox', title: 'The Locked Strongbox', color: '#c89a5a', npc: 'Strongbox', from: 2, weight: 1.2,
      text: () => 'An iron strongbox, bolted to the floor and heavy with promise. The lock is old but cunning.',
      choices: [
        { label: 'Open it with a small key', sub: () => 'spend 1 small key · an uncommon+ relic, guaranteed', can: (g) => g.player.keys.small > 0, run: (g, st, rng) => { g.player.keys.small--; const r = I.rollRelic(rng, g.floorNum + 1, { relics: g.player.relics, luck: g.player.st.luck, minRank: 1, noRisk: true }); g.equipItem(r); return 'The lock turns with a satisfying click. Gained: ' + I.relic(r.id).name + '.'; } },
        { label: 'Blast it open', sub: () => 'spend 2 bombs · ' + pctText({ 'a rare+ relic': 65, 'splinters and some gold': 35 }), can: (g) => g.player.bombs >= 2, run: (g, st, rng) => { g.player.bombs -= 2; g.explodeFx(480, 250, 60, '#ffa040'); g.sfx('boom'); if (rng.chance(0.65)) { const r = I.rollRelic(rng, g.floorNum + 2, { relics: g.player.relics, luck: g.player.st.luck, minRank: 2, noRisk: true }); g.equipItem(r); return 'The lid flies off and so does your hearing. Gained: ' + I.relic(r.id).name + '.'; } g.giveGold(20 + g.floorNum * 2); return 'Too much powder: the contents are scorched. Only coins survive.'; } },
        { label: 'Pick it by hand', sub: () => pctText({ 'a relic': 55, 'a needle trap (lose 25% of current HP, never lethal)': 45 }), run: (g, st, rng) => { if (rng.chance(0.55)) { const r = I.rollRelic(rng, g.floorNum + 1, { relics: g.player.relics, luck: g.player.st.luck, minRank: 1, noRisk: true }); g.equipItem(r); return 'Click. Gained: ' + I.relic(r.id).name + '.'; } const p = g.player, n = Math.min(p.hp - 1, Math.max(1, Math.round(p.hp * 0.25))); p.hp -= n; g.addText(p.x, p.y - 20, '-' + n, '#ff4a5a', 14); g.sfx('hurt'); return 'A needle in the dark. The box stays shut.'; } },
        { label: 'Leave it', sub: () => '', run: () => 'You leave the strongbox to its lock.', leaves: false },
      ] },
    { id: 'mimic', title: 'The Chest That Breathes', color: '#d0a050', npc: 'Breathing Chest', from: 4, weight: 1,
      text: () => 'A fine chest sits in the middle of the room. Its lid rises and falls, ever so slightly, as if asleep.',
      choices: [
        { label: 'Open it', sub: () => pctText({ 'a rare+ relic': 50, 'a Mimic (fight) · win: the relic': 50 }), run: (g, st, rng) => { const grant = (gg) => { const r = I.rollRelic(rng, gg.floorNum + 1, { relics: gg.player.relics, luck: gg.player.st.luck, minRank: 2, noRisk: true }); gg.equipItem(r); }; if (rng.chance(0.5)) { grant(g); return 'Only a chest, after all. Gained a relic.'; } startFight(g, [{ type: 'mimic', elite: false, mods: [] }], (gg) => { grant(gg); gg.toast('The Mimic held a relic in its belly.', '#ffd24a', 140); }); return 'It has TEETH!'; } },
        { label: 'Kick it first', sub: () => 'it wakes: a Mimic fight · win: a rare+ relic AND gold', run: (g, st, rng) => { startFight(g, [{ type: 'mimic', elite: false, mods: [] }], (gg) => { const r = I.rollRelic(rng, gg.floorNum + 1, { relics: gg.player.relics, luck: gg.player.st.luck, minRank: 2, noRisk: true }); gg.equipItem(r); gg.dropGold(480, 300, 25 + 3 * gg.floorNum); gg.toast('Spoils of a fair fight.', '#ffd24a', 140); }); return 'The lid snaps open and it lunges!'; } },
        { label: 'Back away slowly', sub: () => '', run: () => 'The lid keeps rising and falling. You keep walking.', leaves: false },
      ] },
    { id: 'giant', title: 'The Sleeping Giant', color: '#a0b080', npc: 'Sleeping Giant', from: 6, weight: 0.9,
      text: () => 'A colossus sleeps against the far wall, one hand curled around a heap of treasure. Each breath rattles dust from the ceiling onto your shoulders.',
      choices: [
        { label: 'Sneak a few coins', sub: () => pctText({ 'safe: 30 gold': 70, 'it stirs: a fight, then the gold': 30 }), run: (g, st, rng) => { if (rng.chance(0.7)) { g.giveGold(30 + g.floorNum * 2); return 'You pocket the coins without a sound.'; } startFight(g, eliteEntries(g, rng, 1, 2), (gg) => { gg.dropGold(480, 300, 50 + gg.floorNum * 4); gg.toast('The hoard is yours.', '#ffd24a', 140); }); return 'A great eye opens. It is not pleased.'; } },
        { label: 'Steal the relic from its hand', sub: () => pctText({ 'an epic+ relic': 45, 'it wakes: a deadly fight · win: the relic': 55 }), run: (g, st, rng) => { const grant = (gg) => { const r = I.rollRelic(rng, gg.floorNum + 3, { relics: gg.player.relics, luck: gg.player.st.luck, minRank: 3, noRisk: true }); gg.equipItem(r); }; if (rng.chance(0.45)) { grant(g); return 'Fingers off, relic out, breath held. Gained an epic relic.'; } startFight(g, eliteEntries(g, rng, 2, 2), (gg) => { grant(gg); gg.toast('It fell. The relic is yours.', '#ffd24a', 140); }); return 'The fist closes. The giant wakes — and it brought friends.'; } },
        { label: 'Tiptoe away', sub: () => '', run: () => 'Some things are best left asleep.', leaves: false },
      ] },
    { id: 'armsmaster', title: "The Armsmaster's Wager", color: '#d8d8f0', npc: 'Armsmaster', from: 3, weight: 1,
      text: (g) => 'A veteran leans on a rack of weapons. "That ' + g.player.weapon.name + ' has seen better days. Care to trade up?"',
      choices: [
        { label: 'Trade for a surprise', sub: () => 'your weapon is swapped for a random one of HIGHER rarity — you do not see it first', run: (g, st, rng) => { const p = g.player, rk = Math.min(3, I.RARITY[p.weapon.rarity].rank + 1), w = I.rollWeapon(rng, g.floorNum + 1, { minRank: rk, luck: p.st.luck }); g.equipItem(w, true); return 'He slides it across the table: ' + I.itemName(w) + '.'; } },
        { label: 'Pay to choose', sub: (g) => price(g, 5) + ' gold · pick one of three weapons of your rarity or better', can: (g) => g.player.gold >= price(g, 5), run: (g, st, rng) => { gold(g, price(g, 5)); const rk = I.RARITY[g.player.weapon.rarity].rank, offers = []; for (let i = 0; i < 3; i++) offers.push(I.rollWeapon(rng, g.floorNum + 1, { minRank: rk, luck: g.player.st.luck })); g.offerChoice(offers, 480, 300); return 'He lays three weapons on the stones. Choose one.'; } },
        { label: 'Keep yours', sub: () => '', run: () => '"Suit yourself," he shrugs.', leaves: false },
      ] },
  ];
  const EV_BY_ID = {}; for (const e of EV) EV_BY_ID[e.id] = e;

  // ------------------------------------------------------------------ the room
  const S = ED.specials;
  S.event = {
    setup(g, room, rt) {
      room.cleared = rt.cleared = true;
      const rng = rt.rng.fork('event'), pool = EV.filter(e => e.from <= g.floorNum && (!e.when || e.when(g)));
      const ev = rng.weighted(pool.length ? pool : EV, 'weight'), st = ev.setup ? ev.setup(g, rng.fork('st')) : {};
      rt.ev = { ev, st, done: false };
      g.addInter({ type: 'altar', x: 480, y: 250, r: 24, range: 76, color: ev.color, name: ev.npc, prompt: () => 'Approach the ' + ev.npc, use(gg, it) { if (!rt.ev.done) openEvent(gg, it); }, used: false });
    },
    onEnter(g) { g.toast('A fateful encounter. Costs and odds are always shown.', '#ff9aff', 150); },
    update(g, room, rt) {
      const f = rt.evFight; if (!f) return;
      f.t++;
      const alive = g.aliveEnemies();
      if (f.t > 40 && g.spawns.length === 0 && alive === 0) { rt.evFight = null; g.lockRoom(false); f.onWin(g); g.sfx('unlockdoor'); }
      else if (alive > 0 && alive <= 2 && g.spawns.length === 0) { f.surv = (f.surv || 0) + 1; if (f.surv === 60 * 22) for (const e of g.enemies) if (!e.boss) e.rush = true; } else f.surv = 0;
    },
  };
  function openEvent(g, it) { const rt = g.rt; g.modal = { type: 'event', ev: rt.ev.ev, st: rt.ev.st, stage: 'choose', rng: rt.rng.fork('roll'), inter: it, result: '' }; g.sfx('shrine'); }
  ED.events = { LIST: EV, BY_ID: EV_BY_ID, open: (g, id) => { const rt = g.rt; rt.ev = { ev: EV_BY_ID[id], st: EV_BY_ID[id].setup ? EV_BY_ID[id].setup(g, rt.rng.fork('st')) : {}, done: false }; const it = { dead: false }; g.modal = { type: 'event', ev: rt.ev.ev, st: rt.ev.st, stage: 'choose', rng: rt.rng.fork('roll'), inter: it, result: '' }; return g.modal; } };
  P.track('events', EV.map(e => Object.assign({ pack: V }, { id: e.id })));

  ED.modalImpl.event = {
    draw(g, c, m) {
      const UI = ED.ui, ev = m.ev, w = 720, h = 400, x = (C.W - w) / 2, y = 90;
      UI.panel(c, x, y, w, h, ev.color, 0.97);
      UI.shadow(c, ev.title.toUpperCase(), C.W / 2, y + 42, 26, ev.color, 'center');
      UI.wrap(c, m.stage === 'result' ? m.result : ev.text(g, m.st), x + 36, y + 76, w - 72, 19, 14, m.stage === 'result' ? '#fff4c8' : '#dcdcec');
      if (m.stage === 'choose') {
        const many = ev.choices.length > 3;       // four choices must still leave room for the hint line below them
        ev.choices.forEach((ch, i) => { const dis = ch.can && !ch.can(g, m.st), by = y + (many ? 160 : 172) + i * (many ? 49 : 56); UI.button(c, 'ch:' + i, '', x + 40, by, w - 80, many ? 44 : 50, { color: ev.color, disabled: !!dis }); UI.text(c, ch.label, x + w / 2, by + (many ? 18 : 21), 14, dis ? '#6a6a80' : '#ffffff', 'center'); const sub = ch.sub ? ch.sub(g, m.st) : ''; if (sub) UI.text(c, sub, x + w / 2, by + (many ? 35 : 39), 11, dis ? '#5a5a70' : '#ffd8a0', 'center', false); });
        UI.text(c, 'Esc to step away (the choice stays open)', C.W / 2, y + h - 12, 10, '#7a7a98', 'center', false);
      } else UI.button(c, 'done', 'Continue', x + 230, y + h - 72, w - 460, 46, { size: 16, color: '#6ee07a' });
      UI.text(c, 'Gold ' + g.player.gold + ' · HP ' + g.player.hp + '/' + g.player.maxHp, x + w - 16, y + 24, 11, '#9a9ab8', 'right', false);
    },
    update(g, m, act, inp) {
      if (m.stage === 'choose') {
        if (act && act.indexOf('ch:') === 0) {
          const ch = m.ev.choices[+act.slice(3)];
          if (!ch || (ch.can && !ch.can(g, m.st))) { g.sfx('deny'); return; }
          m.result = ch.run(g, m.st, m.rng) || ''; m.stage = 'result'; m.used = ch.leaves !== false; g.sfx('uiok');
        } else if (inp.consume('back') || inp.consume('pause')) g.modal = null;
      } else if (act === 'done' || inp.consume('back') || inp.consume('confirm')) {
        const used = m.used, it = m.inter; g.modal = null;
        if (used) { if (g.rt.ev) g.rt.ev.done = true; if (it) { it.used = true; it.disabled = true; } }
      }
    },
  };

  // ------------------------------------------------------------------ familiars
  const FAM = {
    ember: { id: 'ember', name: 'Ember Sprite', color: '#ff8a3c', desc: 'Hurls fireballs at the nearest foe.',
      tick(g, f, p, lv) { if (--f.cd > 0) return; const t = g.nearestEnemy(f.x, f.y, 340); if (!t) { f.cd = 20; return; } f.cd = Math.round(95 / lv); g.pShot({ kind: 'wispshot', x: f.x, y: f.y, ang: Math.atan2(t.y - f.y, t.x - f.x), speed: 5.5, dmg: Math.max(2, p.wdmg * 0.55 * lv), kb: 1.5, crit: false, pierce: 0, life: 70, r: 5, color: '#ff8a3c', homing: 0.04 }); } },
    moss: { id: 'moss', name: 'Moss Cub', color: '#8ae06a', desc: 'Swallows an enemy bullet aimed at you every few seconds.',
      tick(g, f, p, lv) { if (f.cd > 0) { f.cd--; return; } for (const b of g.eproj) if (!b.dead && !b.friendly && Math.hypot(b.x - p.x, b.y - p.y) < 64) { b.dead = true; f.cd = Math.round(300 / lv); g.burst(b.x, b.y, 8, '#8ae06a', 3, 16); g.addText(f.x, f.y - 14, 'gulp', '#8ae06a', 10); return; } } },
    magpie: { id: 'magpie', name: 'Gilded Magpie', color: '#ffd24a', desc: 'Fetches coins, hearts and bombs from across the room; +10% gold.',
      tick(g, f, p, lv) { for (const k of g.pickups) if (!k.dead && (k.type === 'gold' || k.type === 'heart' || k.type === 'bomb') && k.t > 18 && Math.hypot(k.x - p.x, k.y - p.y) < 260 + 110 * lv) k.mag = true; } },
    frostmoth: { id: 'frostmoth', name: 'Frost Moth', color: '#9fe4ff', desc: 'Chills every foe that gets close to you.',
      tick(g, f, p, lv) { if (g.frame % 8) return; for (const e of g.enemies) if (!e.dead && !e.boss && Math.hypot(e.x - p.x, e.y - p.y) < 105 + 25 * lv) g.applyStatus(e, 'slow', { t: 16, f: lv > 1 ? 0.55 : 0.7 }); } },
    lampmoth: { id: 'lampmoth', name: 'Lamp Moth', color: '#ffe9a8', desc: 'Its glow mends you a little every time a room is cleared.', tick() {}, clear(g, f, p, lv) { g.healPlayer(2 * lv); } },
    shadowcat: { id: 'shadowcat', name: 'Shadow Cat', color: '#b8a0ff', desc: 'Pounces on a nearby foe every few seconds, stunning it.',
      tick(g, f, p, lv) { if (--f.cd > 0) return; const t = g.nearestEnemy(p.x, p.y, 300); if (!t) { f.cd = 30; return; } f.cd = Math.round(230 / lv); f.x = t.x; f.y = t.y; g.damageEnemy(t, Math.max(4, p.wdmg * 1.7 * lv), { src: 'fam', x: p.x, y: p.y, kb: 4, stun: 40, noProc: true, color: '#b8a0ff' }); g.burst(t.x, t.y, 10, '#b8a0ff', 4, 18); } },
  };
  for (const id in FAM) FAM[id].pack = V;
  function giveFamiliar(g, id, lv) {
    const p = g.player; p.buffs = p.buffs.filter(b => !b.fam);
    p.fam = { id, lv, x: p.x, y: p.y, t: 0, cd: 60 };
    if (id === 'magpie') p.buffs.push({ name: 'Magpie', mods: { gold: 0.1 * lv }, fam: true });
    I.recalc(p); g.sfx('levelup'); g.ringFx(p.x, p.y, 8, 60, FAM[id].color, 20, 4);
  }
  ED.familiars = { FAM, give: giveFamiliar };
  P.track('familiars', FAM);

  ED.hook('runStart', V, (g) => { g.player.fam = null; });
  ED.hook('tick', V, (g) => {
    const p = g.player, f = p && p.fam; if (!f || p.dead) return;
    f.t++; const tx = p.x - Math.cos(p.face || 0) * 20 + Math.sin(f.t * 0.05) * 12, ty = p.y - 20 + Math.cos(f.t * 0.07) * 6;
    if (!f.leap) { f.x += (tx - f.x) * 0.1; f.y += (ty - f.y) * 0.1; }
    FAM[f.id].tick(g, f, p, f.lv);
    if (FAM[f.id] && Math.hypot(f.x - tx, f.y - ty) > 90) { f.x += (tx - f.x) * 0.2; f.y += (ty - f.y) * 0.2; }
  });
  ED.hook('roomClear', V, (g) => { const f = g.player.fam; if (f && FAM[f.id].clear) FAM[f.id].clear(g, f, g.player, f.lv); });
  ED.hook('draw', V, (g, c, t) => {
    const f = g.player.fam; if (!f) return; const F = FAM[f.id], bob = Math.sin(t * 0.15 + f.t) * 2;
    c.save(); ED.render.glow(c, f.x, f.y + bob, 14, F.color, 0.3);
    c.fillStyle = F.color; c.strokeStyle = '#10101c'; c.lineWidth = 1.5; c.beginPath(); c.arc(f.x, f.y + bob, 6 + (f.lv > 1 ? 1.5 : 0), 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(f.x - 5, f.y + bob - 4); c.lineTo(f.x - 7, f.y + bob - 10); c.lineTo(f.x - 2, f.y + bob - 6); c.moveTo(f.x + 5, f.y + bob - 4); c.lineTo(f.x + 7, f.y + bob - 10); c.lineTo(f.x + 2, f.y + bob - 6); c.fill();
    c.fillStyle = '#10101c'; c.fillRect(f.x - 3, f.y + bob - 1, 2, 2); c.fillRect(f.x + 1, f.y + bob - 1, 2, 2); c.restore();
  });
  ED.hook('hud', V, (g, c) => { const f = g.player.fam; if (f) ED.ui.text(c, '♦ ' + FAM[f.id].name + (f.lv > 1 ? ' Lv' + f.lv : ''), 14, 60, 9, FAM[f.id].color, 'left', false); });
})(typeof globalThis !== 'undefined' ? globalThis : this);

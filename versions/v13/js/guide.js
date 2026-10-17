/* EMBERDEEP — guide.js : the in-game GUIDE (Controls -> Guide).
 * One page per update that is switched on, plus the basics.  Plain text, written to match what the game actually does — the tests check every active update has a page that fits. */
(function (root) {
  'use strict';
  const ED = root.ED, C = ED.C, P = ED.packs;

  const PAGES = {
    v1: ['Clear a room\'s enemies to open its doors. Some doors also need a KEY: small keys, mini-boss keys and the boss key. The minimap marks every lock and where its key comes from.',
      'Mini bosses hold the Boss Key; the floor boss opens the stairs down. Every fifth floor is a MEGA boss and the descent never ends — each floor is harder than the last.',
      'DASH (K / Shift) has invincibility frames: dash THROUGH red telegraphed attacks, not away from them. Bombs (B) hurt foes and open cracked walls.',
      'Special rooms: shops, treasure, blacksmith, shrines, fountains, secret rooms, traps and gambles. Anything that costs you something shows the cost before you commit.',
      'Relics stack into synergies. Elite foes carry a glyph per modifier; danger rises every floor. Your best floors, unlocks and settings are saved in this browser (Options can export them).',
      'Options: Assist mode (softer, slower foes for learning — no personal bests), key bindings, volume, shake and flash. Pause shows your whole build.'],
    v2: ['Four new classes with real passives: NECROMANCER (slain foes rise as thralls), ALCHEMIST (flasks leave puddles; two elements react), MONK (every hit builds Flow: faster attack and movement) and WARDEN (a Guard that blocks a whole hit, back after 10s).',
      'They unlock through play: reach floor 6, slay 400 foes, defeat certain mini bosses. Five new weapons (Scythe, Flasks, Gauntlets, Bulwark, Chakram), four actives and twenty relics in four archetypes: thrall, guard, hex and tempo.',
      'Armor and weapon affixes add small stat lines, and four synergies reward matching relics.'],
    v3: ['Every five floors a new WORLD with its own look and RULE: Hollow Crypts, Mirewood (mud slows you, spores drift), Glacial Spire (ice and gusts), Cinder Foundry (lava, steam vents), Void Reaches (darkness, gravity wells), Storm Coast (lightning).',
      'Each world has its own foes, an elite trait and a mini boss. Hazards only run in combat rooms, and every one is telegraphed before it hurts.'],
    v4: ['Three new floor bosses (Skarn, Karsk, Voltaris) and two new MEGA bosses (Tempestra, Morrow) join the rotation, each with a signature relic the first time it falls.',
      'REVENANTS: when a run ends in death, your next run may meet an echo of you in a mini-boss room, carrying what you lost. It remembers what killed you and ranks up if it beats you again; beat it to win your gear back.'],
    v5: ['A new room type, the FATEFUL ENCOUNTER (a "?" room): approach the figure and choose. Costs and odds are always printed on the buttons — merchants, altars, duels, a campfire, a strongbox, a chest that might bite, a sleeping giant and more.',
      'Familiars (Ember Sprite, Moss Cub, Gilded Magpie, Frost Moth, Lamp Moth, Shadow Cat) follow you from floor to floor and each does something different.'],
    v6: ['PACTS OF HEAT: before a run pick optional rules (tougher foes, fewer hearts, darkness...). Each adds Heat; Heat multiplies your score and the Embers you earn. The Daily Descent comes with two fixed pacts.',
      'EMBERS are a permanent currency: spend them at THE HEARTH on small permanent upgrades (hearts, damage, luck, a Phoenix start...). RUN RECORDS lists your last 20 runs by edition, class, Heat and result.'],
    v7: ['A three-slot BELT (Z, X, C) holds single-use PROVISIONS: potions, scrolls and tricks — healing, smoke bomb, tonics, lightning / frost / fire scrolls, a lockpick, dash powder, mapping.',
      'They drop from foes, hide in rooms, come as mini-boss prizes and sell in shops (two per shop). A full belt leaves the item on the floor until you free a slot.'],
    v8: ['THE EMBERDEEP HEART waits on floor 50 (and every 50th floor after it): a six-phase final boss. Beat it and choose — claim the true victory, or descend into the Abyss.',
      'From floor 31 every floor carries an ABYSSAL RULE announced on the floor card (darkness, bloodtide, armoured foes, storms...) that twists the fight and pays extra gold and spoils.'],
    v9: ['When a foe KILLS you — an elite, a boss\'s herald, sometimes any foe — it becomes a named NEMESIS with a rank (1-5) and traits. Up to six hunt you at once and they follow you from run to run (see THE HUNT on the title).',
      'Each has one WEAKNESS and some strengths; you discover them by fighting (a trait shows when its effect first appears). Up to two ambush ordinary combat rooms per floor with a name card and a taunt that uses your history.',
      'Elites beaten under 20% HP may flee for a door — catch them or they escape, scarred and stronger. Slay a nemesis for good and it pays trait-themed spoils; if it kills you it ranks up instead.'],
    v10: ['Records of who you were. FEATS earn titles you can wear (shown on the title, class select and run end). The BESTIARY tracks kills and deaths for every foe and boss. MASTERY grows with every run per class.',
      'Mastery levels unlock SKINS (class levels 1, 3, 5, 7, 10) and total mastery unlocks movement TRAILS. All cosmetic: it never changes how the game plays.'],
    v11: ['Choose a MODE on class select. BOSS RUSH: every floor drops you into its boss room (floor 1 offers a relic first; each boss pays its spoils plus a bonus relic cache). GAUNTLET: one reinforced arena per floor — clear it for a relic AND a gear pick, a heal and the stairs.',
      'CHAOS KIT: a normal run that starts with a random weapon, active, armour piece and two relics. In Rush and Gauntlet the rest of the floor is sealed; the best floor per mode is kept.'],
    v13: ['Fourteen new relics join the loot pools. Status chains: PLAGUE MASK (poisoned foes burst and poison their neighbours) and CINDER CLOAK (burning foes spread the fire). OVERKILL CHARM sends wasted damage on to the next foe; LIGHTNING BOOTS arc lightning when you dash; the ECHOING BELL stuns the room every 10th kill.',
      "HUNTER'S TROPHY (+35% vs elites, elite kills pay gold) and MISER'S EDGE (carried gold becomes up to +20% damage) reward a style. SILVER TONGUE, LODESTONE and BANDOLIER help the thrifty; the FIELD MEDIC'S KIT heals after a flawless room; the SURVEYOR'S LENS maps the whole floor; THORN CROWN and LOADED DICE round out the set."],
    v12: ['After every floor or MEGA boss choose ONE of three TALENTS from your class (six per class). Most add a stat; about a fifth ACT — a shockwave when you are hurt, a heal every few kills, a free Guard in every room.',
      'Talents are permanent for the run, never drop as loot, and are listed on the pause screen. Which three you see is decided by the run seed.'],
  };
  for (const id in PAGES) { const p = P.BY_ID[id]; if (p) p.guide = PAGES[id]; }

  // ------------------------------------------------------------------ the scene
  let sel = 'v1';
  const pages = () => P.LIST.filter(p => p.guide && P.on(p.id));
  ED.sceneImpl.guide = {
    draw(g, c) {
      const u = ED.ui, list = pages();
      if (!list.find(p => p.id === sel)) sel = 'v1';
      u.shadow(c, 'GUIDE', C.W / 2, 50, 32, '#7fd8ff', 'center');
      u.text(c, 'How the game and each update you have switched on works.', C.W / 2, 74, 12, '#a8a8c8', 'center', false);
      const rowH = Math.min(40, Math.floor(470 / list.length));
      list.forEach((p, i) => { const y = 92 + i * rowH; u.button(c, 'pg:' + p.id, p.base ? 'THE BASICS' : p.id.toUpperCase() + ' · ' + p.name, 40, y, 250, rowH - 4, { size: 12, color: p.color, selected: sel === p.id }); });
      const cur = list.find(p => p.id === sel), x = 310, w = 610;
      u.panel(c, x, 92, w, 470, cur.color, 0.9);
      u.shadow(c, cur.base ? 'The Basics' : cur.name, x + 20, 128, 22, cur.color, 'left');
      if (!cur.base) u.text(c, cur.tag, x + 20, 148, 12, '#a8a8c8', 'left', false);
      let y = 178; for (const para of cur.guide) { y = u.wrap(c, para, x + 20, y, w - 40, 17, 13, '#e0e0f0') + 10; }
      u.button(c, 'back', 'Back', C.W / 2 - 80, 584, 160, 36, { size: 14 });
    },
    update(g, a, inp) {
      if (a === 'back' || inp.consume('back')) { ED.menus.go(g, 'help'); return; }
      if (a && a.indexOf('pg:') === 0) { sel = a.slice(3); g.sfx('ui'); }
    },
  };
  ED.guide = { PAGES, pages, fits(c, id) { const p = P.BY_ID[id]; let h = 0; for (const t of p.guide) h += ED.ui.wrapHeight(c, t, 570, 17, 13) + 10; return h; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);

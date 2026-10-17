# EMBERDEEP — an endless roguelike descent

A Zelda-style, room-by-room dungeon crawler that never ends. Procedural floors, locked doors and
colour-coded keys, bosses that return as ever-larger tiers, **MEGA bosses** with multi-part bodies every 5th floor,
and — since the updates — six distinct worlds, 11 classes, 95 relics, event encounters, companions, Pacts of Heat and a
permanent Hearth. Built with plain HTML5 Canvas + vanilla JavaScript — no frameworks, no external assets, no build step.
Every sprite is a coloured shape; every sound is synthesised; the soundtrack is generated live.

**It ships as v1 plus nineteen switchable updates (v2–v20) — see [Versions](#versions-the-update-toggle).**

```
~13900 lines of game code · 45 JS modules (19 of them are the updates) · 11 classes · 16 weapons · 113 droppable relics · 7 floor bosses + 5 MEGA bosses in the rotation, plus 36 land bosses
24 mini bosses · 20 room types · 12 lands · 82 enemy types · 30 elite traits · 11 event encounters · 6 familiars · 13 pacts of heat (every update on)
```

## Run it

Pick any one:

```bash
open index.html                 # just double-click / open the file — it works straight from file://
python3 serve.py 8000           # tiny no-cache dev server → http://localhost:8000/
npx serve .                     # or any static server
```

The game uses classic `<script>` tags (no ES modules), so it needs nothing but a modern browser.
Progress (unlocks, best floors, settings) is saved in `localStorage`.

## Versions (the update toggle)

EMBERDEEP ships as **v1 plus switchable content updates**. Open **VERSIONS** (top-right of the title screen) to turn each update on or off
for your next run, or use the presets (`v1 only`, `→ v2`, `→ v3` …, `EVERYTHING`). Every update is independent, so any mix works
(for example v1 + v3 without v2). Progress, unlocks and the Collection are shared; each combination also tracks its own deepest floor.

| Update | Theme |
|---|---|
| **v1 EMBERDEEP** | The original game (always on). |
| **v2 ARSENAL** | 4 classes with real passives, 5 weapons, 4 actives, 20 relics, armor, affixes, synergies. |
| **v3 WORLDS** | Six lands, five floors each, each with its own palette and environmental rule (mud + spores, ice + gusts, lava + steam vents, darkness + gravity wells, lightning), 11 exclusive foes, 3 elite traits, 4 mini bosses with signature relics. |
| **v4 TITANS** | 3 new floor bosses (Skarn the Frostwarden, Karsk the Dune Wyrm, Voltaris the Storm Engine), 2 new MEGA bosses (Tempestra the Thunder Titan, Morrow the Ossuary King) with new multi-part bodies, a signature relic each, and **Revenants**: die, and your next run can meet an echo of you carrying the gear you lost. |
| **v5 FATE** | A new room type, the Fateful Encounter: 17 choose-your-fate events (merchant, bleeding altar, wishing well, duelist, forge spirit, caged creature, dice of fate, campfire, strongbox, the chest that breathes, sleeping giant…) with costs and odds shown on the buttons, and 6 familiars that follow you from floor to floor. |
| **v6 HEAT** | 13 opt-in **Pacts of Heat** (score & ember multipliers), a permanent **Embers** currency with **Hearth** upgrades, fixed pacts on the **Daily Descent**, and a **Run Records** screen for comparing editions. |
| **v7 PROVISIONS** | A 3-slot belt (`Z` `X` `C`) of single-use tools: 12 potions, scrolls and tricks (healing, smoke, tonics, lightning/frost/fire scrolls, lockpick, dash powder…) found as drops, room finds, mini boss prizes and in shops. |
| **v8 ABYSS** | A true final boss — **The Emberdeep Heart** — on floor 50 (and every 50th floor after) with an ending choice (claim the victory, or descend), plus an **Abyssal Rule** on every floor from 31 on (darkness, bloodtide, ironclad foes, storms, withering…) paid back in gold. |
| **v9 THE HUNT** | A persistent **nemesis roster**: elites, boss heralds and sometimes plain foes that kill you — or escape you — become *named* nemeses with a rank (1–5), 20 readable traits (12 strengths, 8 weaknesses you discover by fighting), ambushes in later runs, history-aware taunts, flight when beaten, ranks gained when they win, spoils when you slay them, and a **THE HUNT** roster screen on the title. |
| **v10 LEGACY** | A record of who you were: 27 **feats** that earn wearable titles, a **bestiary** of every foe and boss (kills, how often each killed you, stats, studied marks), and **class mastery** (levels 1–10) that unlocks five skins per class and five trails. Pure record and cosmetics — it never changes how the game plays. |
| **v11 TRIALS** | Pick a **mode** on class select: **Boss Rush** (every floor drops you into its boss room; spoils plus a bonus relic cache), **Gauntlet** (one reinforced arena per floor; choose a relic and a piece of gear, heal, descend) or **Chaos Kit** (a random weapon, active, armour and two relics instead of your class kit). The rest of a Rush / Gauntlet floor is sealed; best floor is kept per mode; four feats. |
| **v12 TALENTS** | Beat a floor boss and choose one of **three talents** from your class (six per class, 66 in all): stat upgrades in the spirit of the class (tougher skin, deeper reach, venom, a bigger host of thralls) and about a fifth that act (a shockwave when you are hurt, a heal every few kills, a free Guard in every room). The pause screen lists them. |
| **v13 CURIOS** | Fourteen new relics with tricks the older ones do not have: poisoned / burning foes that spread their fate when they die, overkill that jumps to the next foe, a dash that arcs lightning, a bell that stuns the room, trophies for elite hunters, cheaper shops, a flawless-room heal, a full-map lens and more. |
| **v14 ARMORY** | Four more weapons that drop like any other: a long cracking **Whip**, a heavy piercing **Crossbow**, a **Scepter** that fans five homing orbs and a point-blank **Blunderbuss** — line, far, fan and cone. |
| **v15 MENAGERIE** | Four foes that change who you hit first: a gold-stealing **Pilferer** (catch it and the gold returns with interest), a **Mender** and a **Warder** that heal and shield their friends, and a leaping **Hopper** whose landing you can dodge — then punish. |
| **v16 DARES** | Optional challenges on ordinary combat rooms: take **no damage**, beat a **clock**, never **dash**, keep a **kill chain** alive, or kill the **marked** foe first. Win for gold, a heart or bomb (every fourth win also puts a relic cache on pedestals); fail and nothing is lost. |
| **v17 CROSSROADS** | The descent stops being a straight line. After a MEGA boss the plain stairs are joined by **side doors** — sealed, or not there at all until you have earned them. Six kinds of gate (a secret wall to bomb, **sigils** kept for good, an item you must still carry, a deed done on the way, a memory of an earlier run, a toll), a **ROUTES** page that remembers only what you have found, a rumour-selling wanderer, and the first new land: the **Sunken Ossuary** (tides, drowners, bones that stand again). |
| **v18 WORLDS II** | Five more lands behind v17's doors (it needs v17 to be reachable): the **Clockwork Orrery** (crushers on a beat, time wells), the **Gilded Vault** (bait coins, a gold toll, foes that live on your purse), **Thornwood Hollow** (creeping briars, fire clears them), the **Mirror Halls** (your own shade hunts you) and the **Sky Bridge** (brittle planks, gusts, a Harpy that carries you off). Each has four new foes, an elite trait, a mini boss with a signature relic and its own music. |
| **v19 BESTIARY** | Eighteen new foes for any land — each with a behaviour the game did not have (a tracking laser, a pair on one thread, foes that raise the dead, a lodestone that eats arrows, a wail that strips your dash, a shell that only opens to strike...) — six twists on the oldest foes that join the v3 lands, and six elite traits (Plated, Leaping, Vengeful, Rallying, Draining, Echoing). |
| **v20 SOVEREIGNS** | Every land you enter by a door gets its own boss line: a **new boss** on its second floor, a **re-dressed older one** on its fourth and its **own MEGA boss** to end it — thirty-six in all, each built on that land's rule. A wave with one dry lane (Maelor), a boss that fights on a beat (Kairos), a toll that takes your gold and heals him (Mammon), seeds that root where they land (Verdane), every pattern doubled by a reflection (Specula), a gale that shoves you and every bolt (Zephra) — and six multi-part MEGA bodies (the Sunken Bell, the Brass Heavens, the Vault Door, the Hollow Tree, the Great Looking-Glass, the Cyclone), each dropping a signature relic. The stairs keep the old rotation. |

### What each update adds

* **v2 ARSENAL** — *Necromancer* (thralls rise from kills), *Alchemist* (lobbed flasks leave fire/poison/frost puddles; doubly-afflicted foes trigger a Reaction),
  *Monk* (Flow: hits build attack and move speed), *Warden* (a Guard that absorbs a whole hit). New weapons: Scythe, Flasks, Gauntlets, Bulwark and the
  bouncing **Chakram**. New actives: Frost Nova, Bulwark Dome, Raise Dead, Overcharge. Twenty relics in four archetypes (thrall · guard · hex · tempo), armor,
  weapon affixes and four synergies. New classes unlock through milestones (reach floor 6, 400 lifetime kills, two mini bosses).
* **v3 WORLDS** — every five floors a new world with its own palette and **rule**: *Hollow Crypts* (burrowing rats, bomb-dropping moths), *Mirewood* (mud + drifting spores),
  *Glacial Spire* (ice + blizzard gusts), *Cinder Foundry* (lava + steam vents), *Gloam Void* (darkness + gravity wells), *Storm Reach* (lightning aimed ahead of you).
  Each has two exclusive foes, an elite trait, and (worlds 2–5) a mini boss whose first kill unlocks a signature relic.
* **v4 TITANS** — floor bosses *Skarn the Frostwarden* (ice floors), *Karsk the Dune Wyrm* (dives, untouchable until it surfaces winded), *Voltaris the Storm Engine*
  (four pylons); MEGA bosses *Tempestra the Thunder Titan* (rods, clouds, gales) and *Morrow the Ossuary King* (skulls, hands, an undead court). A signature relic each.
  **Revenants:** die, and a later run can host an *echo of you* in a mini boss room — beat it to reclaim your old weapon and relics.
* **v5 FATE** — the **Fateful Encounter** room: a merchant, bleeding altar, beggar, forbidden library, wishing well, fallen adventurer, duelist, forge spirit,
  caged creature, dice of fate, mirror, plus a lonely **campfire** (rest, sharpen or sit with the embers — with a risk of company), a **cleansing font** (only offered to the cursed), a locked **strongbox** (spend a key or bombs, or pick it by hand), **the chest that breathes** (it may be a Mimic), the **sleeping giant** (steal from its hoard or its hand) and the **armsmaster's wager** (trade your weapon up, blind or paid). Costs and odds are always on the buttons. Six **familiars** (Ember Sprite, Moss Cub, Gilded Magpie, Frost Moth, Lamp Moth, Shadow Cat).
* **v6 HEAT** — 13 opt-in **Pacts of Heat** (each is one clear rule; Heat multiplies score and embers), the **Embers** currency, **The Hearth** (permanent upgrades),
  fixed pacts on the **Daily Descent**, and **Run Records** (last 20 runs with edition, class, Heat, floor, score, killer).
* **v7 PROVISIONS** — a three-slot belt (`Z` `X` `C`) of single-use tools: twelve potions, scrolls and tricks (healing, smoke bomb, tonics, lightning / frost / fire
  scrolls, lockpick, dash powder, mapping…), found as drops, in shops and as mini-boss prizes.
* **v8 ABYSS** — **The Emberdeep Heart**, a six-phase final boss on floor 50 (and every 50th floor after) with an ending choice (bank the victory or descend), and from
  floor 31 an **Abyssal Rule** on every floor (Lightless, Bloodtide, Echoing Fire, Ironclad, Quicksilver, Reinforced, Stormborn, Withering) paid back in gold and spoils.
* **v9 THE HUNT** — a roster of up to six **named nemeses** saved with your game.
  *Birth:* an elite that kills you becomes a rank-1 nemesis of its own kind; a boss or mini boss that kills you leaves a rank-2 *herald*; an ordinary foe rises about a third of the time;
  an elite beaten below 20% HP may *flee* (about one in five do) and, if it gets away, returns as a *survivor* named for its wound. A summoned minion or v4's Revenant never joins.
  *Traits:* every nemesis has exactly one weakness and 1/1/2/2/3 strengths at ranks 1–5 (never more than two defensive ones). Strengths — Thick-skinned, Berserker, Shielded Front,
  Regenerating, Leech, Spell-warded, Fleet, Brutal, Warband, Powder Keg, Deflector, Fireproof. Weaknesses — Fears Fire, Hates Blasts, Brittle (crits), Cold-blooded, Dizzy (stuns),
  Thin-blooded (poison), Glass Jaw (first hit 2.5x), Lumbering. A trait is *revealed* when its effect first shows (or on sight for shields, wards and warbands), is remembered across runs,
  and the screen explains it with a tip.
  *Ambushes:* from floor 2, up to two hunters lie in wait in ordinary combat rooms (decided from the seed when the floor is built, only at depths they beat you at). A card names them,
  shows what you know, and they taunt you with your own history ("You fell to me on floor 7, Knight.").
  *Flight and rank:* a nemesis beaten under 20% HP may run for a door — catch it (it takes +40% damage while running) or it escapes: +1 rank (once per run), a new epithet scarred by what hurt it,
  and it is back from the next floor. When a nemesis kills you it ranks up instead; ranks 3 and 5 add a strength.
  *Payoff:* slaying one removes it for good (it joins *The Fallen*), drops gold and a heart, three trait-themed spoils to choose from (armour for Thick-skinned, weapons for Berserker/Brutal, relics for the
  rest, bombs for a Powder Keg…) and Embers if v6 is on. The title's **THE HUNT** screen lists the roster with portraits, ranks, known and unknown traits, history and the fallen; class select shows who is hunting you.
* **v10 LEGACY** — three tabs on the title's **LEGACY** screen.
  *Feats* (27): depth (floors 5/10/20/31/50, a swift floor 6), combat (25 / 200 elites, 1,000 kills, a floor boss, a MEGA boss, 10 mini bosses, five clean rooms in a row, a room cleared at one heart),
  collection (12 relics, 500 gold), runs (10 / 50 runs, a win, five classes, the Daily Descent to floor 5) and ones that need another update (Heat 6, the Heart, nemesis slayer ×3, 25 provisions).
  Each earns a **title**; click an earned feat to wear it (shown on the title, class select and run end).
  *Bestiary*: every foe (grouped by the depth it appears) and every floor / MEGA / mini boss — kills, deaths to it, stats and description, and a studied mark at 10 / 50 / 250 kills.
  *Mastery*: each run adds mastery to its class (10 per floor, 40 per boss, 15 per mini boss, kills/10, +200 for a win); level *n* needs 50·n·(n+1). Class levels 1/3/5/7/10 unlock the Ember / Frost / Verdant / Shadow / Gilded
  skin (a tint plus a small accent: sparks, ice shards, leaves, an aura, a crown); your total levels (2/5/9/14/20) unlock the Ember / Frost / Verdant / Void / Golden movement trail. The end screen shows what you earned.
* **v11 TRIALS** — a **MODE** button on class select opens the mode screen (it applies to your next run; class, seed, pacts and every other update still apply).
  *Boss Rush:* each floor you start in its boss room (floor 1 first offers a relic pick; mega bosses on every fifth floor). A boss pays twice — the normal spoils (three picks, both heart fonts, the stairs) plus a bonus **relic cache**.
  *Gauntlet:* each floor is a single arena (a normal combat room chosen from the seed, rebuilt as five waves with more elites; a hunter planned for it keeps its place). Clear it for **a relic pick, a gear pick**, a 60% heal and the stairs.
  In both the rest of the floor is sealed — a door into any other room just sends you back. *Chaos Kit:* a normal run that starts with a seeded random weapon, active, armour piece and two relics (your class passive stays).
  The HUD shows a mode badge (bosses down / arenas cleared), the end screen reports a new best, and the mode screen shows the best floor and edition per mode. Four feats (Rush Contender / Champion, Arena Veteran, Embrace the Chaos) appear on the LEGACY screen when both updates are on.
* **v12 TALENTS** — after every **boss** (floor or MEGA; not mini bosses) a card choice appears: pick **one of three** talents from your class's list of six. Offers are seeded (same seed + floor + talent count = same three), never repeat a talent you own, and the strongest ones only appear from floor 2–3.
  Talents are hidden relics, so every stat and hook path just works; they never drop from chests, they do not clutter the relic grid or the HUD bar, and they are listed on the **pause screen** (TALENTS) and recapped on the end screen. If another choice is already pending (the floor-5 milestone, v8's ending, the boss rewards) the talent waits its turn.
  *Knight* — Iron Resolve, Stalwart, Valor, Riposte (shockwave when hurt), Cleaving Arc (every 4th hit), Shield Wall (a Guard each room). *Lancer* — Long Reach, Skewer, Phase Step, Impaler's Eye, Duelist's Focus, Whirling Retreat. *Brute* — Thick Hide, Giant's Heart, Rage, Keg Mastery, Aftershock, Bloodlust.
  *Rogue* — Nimble, Venomed Blades, Backstab, Assassin's Edge, Shadow Veil, Pickpocket. *Ranger* — Deep Quiver, Piercing Shot, Eagle Eye, Fleet-footed, Windrunner, Hunter's Mark. *Mage* — Arcane Surge, Kindling, Static Charge, Frostbite, Overcharge, Recovery.
  *Trickster* — Twin Throw, Ricochet, Sleight of Hand, Lucky Break, Time Dilation, Quickdraw. *Necromancer* — A Larger Host, Quick Raise, Bone Armor, Death's Embrace, Dark Pact, Soul Harvest. *Alchemist* — Volatile Mix, Thorough Brewer, Scavenger, Quick Hands, Catalyst Rush, Burst Vial.
  *Monk* — Inner Peace, Swift Fists, Iron Body, Wind Step, Ki Surge, Palm Strike. *Warden* — Reinforced Guard, Bastion, Retributive Shield, Fortitude, Dome Mastery, Healing Ward. (The v2 classes' talents only matter when v2 is on.)
* **v13 CURIOS** — fourteen relics that join the normal loot pools (shops, chests, boss spoils). *Status chains:* **Plague Mask** (a poisoned foe bursts and poisons everything within 80px), **Cinder Cloak** (a burning foe spreads the fire within 90px). *Wasted damage:* **Overkill Charm** (the excess beyond a foe's last HP jumps, at 80%, to the nearest other foe).
  *Movement:* **Lightning Boots** (every dash arcs lightning through the 3 nearest foes), **Echoing Bell** (every 10th kill stuns every non-boss foe in the room for 1.5s). *Hunting:* **Hunter's Trophy** (+35% damage to elites; an elite kill drops gold), **Miser's Edge** (+1% damage per 25 gold carried, up to +20%).
  *Economy:* **Silver Tongue** (-25% prices, stacks to 2), **Lodestone** (loot flies in from much farther, +10% gold, stacks to 2), **Bandolier** (+3 bombs now, +1 every floor). *Care:* **Field Medic's Kit** (clearing a room without being hit heals half a heart), **Surveyor's Lens** (the whole map at the start of every floor).
  *Pain:* **Thorn Crown** (+4 thorns, and being hurt bursts thorns around you, at most every 2s), **Loaded Dice** (15% of room entries roll a small gift). Only instant effects are used, so none can disagree with the stat sheet.
* **v14 ARMORY** — four weapons, all *basic* (they drop in chests, shops and boss spoils without needing a class) with legendary names and held-weapon art. **Whip**: a long thin lash through everything in its line — the far third cracks for +50% (the spear's tip rule) and every 4th lash cracks again at the tip with a stagger. **Crossbow**: one heavy bolt, slow reload, pierces three foes, shoves hard.
  **Scepter**: a fan of five slow homing orbs — one or two land at range, all five point-blank. **Blunderbuss**: a cone of seven pellets with heavy knockback and a little recoil — devastating up close, nearly useless beyond ~150px. Echo Shard-style projectile bonuses add one orb / two pellets / a second lash or bolt.
  The tests fire each weapon against a stationary dummy at two ranges and require it to land within 0.3x-2.4x of the sword's damage per second (measured: whip 34-48, crossbow 31, scepter 43-45, blunderbuss 29-48 against a sword's 40 at floor-6 item power).
* **v15 MENAGERIE** — four foes added to the ordinary spawn pools (never as elites, with their own bestiary entries). **Pilferer** (from floor 3): fast; if it touches you with gold in your purse it steals 12 + 3/floor gold and runs for 7s (carrying a visible bag) — kill it and the gold drops back with a 25% bonus, let it escape and it is gone. It never steals through your invulnerability frames.
* **v16 DARES** — from floor 2 up to three ordinary combat rooms per floor carry a dare (chosen from the run seed when the floor is built, never by exploration order; none on floor 1, in the Gauntlet / Boss Rush modes, in Hunt ambushes or in non-combat rooms). It is announced on entry and shown on a strip at the bottom of the screen with its prize; failing it costs nothing and never blocks the doors. **UNTOUCHED** (no damage taken; a Guard that absorbs a blow does not count) pays gold ×1.2 + a bomb. **SWIFT** (clear before the clock ends: 10s + 2.2s per foe + 2s per wave, 20–75s, running only while the fight is on) pays gold ×1.7. **NO DASH** pays gold ×1.3 + a heart. **CHAIN** (once the first foe falls, never 3.5s without a kill; the clock pauses between waves and while every foe is untouchable) pays gold ×1.3 + a heart. **MARKED** (after the first wave arrives one plain foe — never an elite, boss, minion or key carrier — gets a gold ring and diamond; kill it before any other foe) pays gold ×2 on the spot where it falls. Gold is (6 + 1.6 × floor) × the multiplier. Every fourth win in a run also offers a relic cache (three relics, take one) when the room is cleared. Wins are tallied per run and across runs (`meta.dares`); three feats appear on the LEGACY screen when v10 is on (3 or 12 dares in a run, 50 in all). Strip, mark and end-screen line only.
  **Mender** (floor 4): kites at range and heals the most wounded non-boss ally within 260px for 10% of that ally's health every 1.5s (never itself). **Warder** (floor 6): kites at range and gives the largest unwarded ally a ward worth 35% of its health every 3.5s. **Hopper** (floor 5): marks the floor where you stand (a telegraphed circle), leaps there untouchable and lands with a shockwave; afterwards it is *winded* for ~1s and takes 40% more damage.
  **A key carrier can never flee or escape** (a vanished carrier would take its key with it and softlock the floor) — this also fixed v9's fleeing elites.
* **v17 CROSSROADS** — the world is now `f(floor, run.route)`. Every five floors form a *land*; the choice is made after the MEGA boss that ends it, and the plain stairs (no key, no gate, no cost) are always one of the exits. Which side doors a seed offers comes from `seed + ':route:' + tier` (never the shared RNG): at most one visible side door and one hidden one per boundary.
  *Gates (every one opens differently, none says what it wants):* **a secret wall** — a hairline crack in the boss room; bomb it (a stray bomb lies there if you have none); **a sigil** — a permanent mark taken from certain mini bosses (Slime King, Clockwork Sentry, Brood Mother, Cinder Witch, Rimewraith) or an altar in secret rooms, kept in your save; the door shows its glyph; **a carried item** — a Hooded Lantern / Ember Seed / Storm Feather hidden in an ordinary room on floors 2–4 of the land before it, which you must still hold; **a deed** — no fuse lit in the whole land, the guardian felled untouched, the land crossed in 13 minutes, two dares won (v16); **a memory** — a record in your save (a fallen titan, floor 20, three sigils, a win): the door does not exist until it is true; **a toll** — an altar that wants gold or a heart. A wanderer in the rest room sometimes sells a rumour that names a land and what its door wants.
  *Side lands are harder and richer (some, not all):* a routed land can carry `risk` (its foes read the row of a deeper floor: the Ossuary +2 floors, ~+3 danger) and pays an extra relic cache after its boss. v3's six lands are side doors too (the Foundry, Void and Storm are the harsh ones) when v3 is on. Sealed modes (Boss Rush, Gauntlet) have no roads.
  *The ROUTES page* (title button) lists lands entered, roads taken and the six sigils; lands you have not found stay silhouettes, a bought rumour shows a name. The end screen shows the route; four feats join LEGACY (Off the Road, Sigilbearer, Wallbreaker, Cartographer).
  *The Sunken Ossuary* (floors of any tier ≥ 1, gate: the secret wall, risk +2): **the tide** floods a telegraphed band of every combat room for ~7s (water slows you, as ever); **Drowner** swims twice as fast in water; **Ossicle** leaves a **Bone Heap** that stands again (weaker, once) unless you smash it; **Brinewisp** floods a patch under your feet; **Chain Warden** whirls an anchor through a full circle; elite trait **Brined**; mini boss **Hollow Reeve** (first kill unlocks **Reeve's Lamp**: water no longer slows you).
  *Under the hood:* `js/worlds.js` is a small core registry (inert unless a pack adds a world): `ED.worlds.at(floor)` resolves the straight line (v3's six) or the routed world; foe pools, elite traits, palettes, mini bosses and the risk rows all ask it. New core hooks: `stairs` (after a boss) and `bomb`.
* **v18 WORLDS II** — five lands, all reached through the doors of v17 (each names its own gate; side lands are harder and pay richer, the plain stairs never change).
  **The Clockwork Orrery** *(door: the Gear sigil · risk 0)* — rooms hold **time wells** (a clock-face circle: you and every foe inside move at 60% / 50%) and **crusher lanes** that slam on a beat after a telegraph — they hurt foes too (35% of their health), so lure them. Foes: **Cogwalker** (moves in ratcheting bursts, winds, then grinds a circle), **Pendulum Post** (a post and a swinging weight), **Escapement** (a turret with a six-beat cycle: aim line on the third, bolts on the fourth), **Mainspring** (winds four clicks, then rolls and ricochets off the walls; dizzy afterwards). Trait **Overwound** (double time in bursts); mini boss **The Clockmaker** → **Brass Cog**.
  **The Gilded Vault** *(door: a toll of 90 gold + 9 per floor · risk 3)* — **bait coin** piles pay triple and spring a telegraphed trap where they lay (step away in time and it costs nothing). Foes: **Trapsmith** (spike patches at your feet that lift again), **Tollkeeper** (a ring that takes 10% of your gold instead of health; kill it for the toll back +25%), **Gleaner** (eats gold on the floor, spills it when it dies), **Gilded Brute** (a ward that re-grows each time you pick up a coin). Trait **Covetous** (up to +40% damage with a full purse); mini boss **The Vault Keeper** → **Appraiser's Loupe**.
  **Thornwood Hollow** *(door: carry an Ember Seed · risk 0)* — **briars** (never walls) slow and cut whoever lingers, creep over the floor while you fight (cap 110 tiles) and are burned away by bombs — or by the Ember Seed in your pocket. Foes: **Bramble Hound** (sows briars as it runs), **Rootling** (roots race along the floor and tangle you), **Vinelasher** (reels you in; a dash tears free), **Thornback** (answers one heavy blow with a fan of thorns). Trait **Sowing**; mini boss **The Heartwood** → **Thornwood Crown**.
  **The Mirror Halls** *(door: fell the MEGA guardian untouched · risk 2)* — your **shade** walks your own path 2.5 s behind you; it hurts you, and hurts whatever else it touches. Foes: **Reflection** (stands where your mirror image would), **Glass Knight** (charges, shatters into eight shards), **Refractor** (a beam and its one reflection), **Silvered** (throws arrows back at their owner). Trait **Reflective** (its bolts rebound once); mini boss **The Looking-Glass Duelist** — its attacks follow whatever weapon you carry — → **Silver Shard**.
  **The Sky Bridge** *(door: carry a Storm Feather · risk 1)* — **brittle planks**: linger on one and it cracks, then falls away (you pay for the fall) for 7 s; a plank never sits in a doorway and a re-entered room is put right at once. Foes: **Gust Weaver** (one gust at a time, it shoves you away from it; a dash ignores it), **Harpy** (seizes you and flies you somewhere worse; a dash or its death frees you), **Windmill Idol** (a wind that turns a quarter every 1.7 s), **Nimbus** (a drifting stormcloud with its own rain ring). Trait **Buffeting**; mini boss **The Spire Matriarch** → **Roc Feather**.
  Every land plugs into `ED.worlds` (js/worlds.js): `ED.worlds.add(def)` with `theme`, `rule`, `enemies`, `mod`, `minis`, `hz` (setup/tick/under/draw), `gate`, `risk`, `music`; `ED.worlds.swapTiles(g, rt, idx, type, dur)` does temporary terrain for any hazard.
* **v19 BESTIARY** — foes that join the ordinary spawn pools by floor (`ED.freeFoes`; none leaves a room alive, so a key carrier can never be lost) and elite traits that join the elite pool (`ED.freeMods`, from floor 10). Every foe has a bestiary entry through `ED.enemyTypes`.
  *Telegraphed shooters and trick-shots:* **Lamplighter** (floor 5; a thin line tracks you, locks red in its last 0.4s, then a fast bolt flies along the *locked* line), **Capacitor** (15; charges while you keep your distance, discharges a ring of 14 bolts; standing within 100px drains it), **Ricochet Orb** (8; rebounds off every wall, faster each time; after six bounces it rests, vulnerable).
  *Pairs, packs and the dead:* **Twin Husk** (7; a linked pair — when one falls the other heals 40%, hits 50% harder and runs faster for 3s), **Fuse Imp** (6; packs of four that light a fuse when near; killed before it burns down it is harmless; one blast shortens the next fuse), **Gravedigger** (10; raises the foes you killed in this room, once each, at half health; never a key carrier), **Signal Brazier** (11; its ring fills in 8s and it calls three more foes, once).
  *Foes that change how you fight:* **Orbit Idol** (12; untouchable until its three moons are killed — they return after ~9s of peace), **Lodestone** (14; bends and swallows arrows and bolts — not sword blows, not boomerangs or chakrams), **Hexer** (13; while it sees you your attack cooldown runs a third slower), **Banshee** (14; her wail strips your dash for ~1.8s inside 300px), **Leech Idol** (11; a tether slows you and heals it; a dash cuts the line for 2s), **Carapace** (13; sealed and untouchable except for ~1.3s after its slam).
  *Foes that change the floor:* **Rime Weaver** (9; freezes a patch of floor under you), **Sapper** (9; lays up to seven proximity mines that arm after a second), **Strandspinner** (10; lays stinging thread between wall points, up to five lines), **Drummer** (16; foes within 190px move and act 35% faster), **Fencer** (5; darts in, thrusts, withdraws).
  *Twists on the oldest foes (v3's lands, only while v19 is on):* **Restless Gloomling** (Crypts; rises once as a Wraith), **Mire Gloomling** (Mirewood; poison trail), **Rime Watcher** (Glacial; chilling bolts), **Cinder Tusker** (Foundry; fire along its charge), **Flicker Gnat** (Void; half there), **Thunder Watcher** (Storm; a bolt after each volley).
  *Elite traits:* **Plated** (its first three hits do nothing; a crit breaks two plates; burning/poison go through), **Leaping** (telegraphed leap to your spot, lands with a ring), **Vengeful** (death: neighbours hit 35% harder for 6s), **Rallying** (neighbours act a third faster), **Draining** (each blow adds 1.5s to your dash cooldown), **Echoing** (rings of slow bolts on a beat and at death).
* **v20 SOVEREIGNS** — `ED.specMods` rewrites the boss of a floor when `ED.worlds.at(floor)` is a land you *entered by a road* (`routed`): depth 1 (the second floor of the land) and depth 3 get the land's two guardians, depth 4 its MEGA; depths 0 and 2, the stairs-only line and the final boss floor keep the old rotation. Land bosses are flagged `landOnly` in `ED.bosses.DEFS/MEGAS` (never in `rosterF/rosterM`, always in `allIds()`), pair up at tier 4 and fuse at tier 5 like any boss, and carry `unlock: {boss: id}`; the twelve originals drop a legendary signature relic. The boss intro card wraps a long tip over up to three lines.
  *The Sunken Ossuary* — **Maelor, the Drowned Cantor** (a wall of water sweeps the room from the top, one lane glows green first: *tideSurge*; a choir of drowners; a hymn on a beat) · **Ser Oriel, the Sunken Knight** (the Hollow Knight with slow wet blades and the wave) · **THALASSA, the Sunken Bell** (four buoys carry its beams, two drowned hands, then the bell; five phases, the sea rising ring by ring) → *Tidal Pearl* (walk on water), *The Sunken Bell*.
  *The Clockwork Orrery* — **Kairos, the Metronome** (every attack lands on a counted beat; time wells; a swinging beam; crusher lanes) · **Ormolu, the Brass Sentinel** · **PERIHELION, the Brass Heavens** (three planets on three orbits carry its beams, two armillary arcs, the sun) → *Pocket Metronome*, *Brass Planet* (two orbiting worlds).
  *The Gilded Vault* — **Mammon, the Tollbaron** (his toll ring takes your gold instead of health — and heals him with it; no gold, it takes blood; the gap is free) · **Auric, the Molten Mint** (the Forge Tyrant minting ricocheting coins) · **AURELIUS, the Vault Door** (four locks, two bolts, the dial; spikes creep in as it opens) → *Tollbaron's Ledger*, *Vault Key Ring*.
  *Thornwood Hollow* — **Verdane, the Thorn Mother** (*seedfall*: every seed roots where it lands and leaves a bed of briars) · **Lady Brier, the Bramble Queen** · **THE HOLLOW TREE** (boughs, roots that lash the floor, the heartwood) → *Mother's Briar*, *Heartwood Seed*.
  *The Mirror Halls* — **Specula, the First Reflection** (*mirrorFan*: every volley is fired again from her reflection across the room; beams from both) · **Argent, the Counterfeit Knight** · **THE GREAT LOOKING-GLASS** (four panes, a gilded frame, the silvering; the glass cracks as it breaks) → *Silvered Glass*, *The Looking-Glass Shard*.
  *The Sky Bridge* — **Zephra, the Windcaller** (a gale from one side shoves you and every bolt, drawn as streaks of chevrons; the bridge gives way ring by ring) · **Cirrus, the Cloud Regent** · **TEMPUS, the Cyclone** (four spinning vanes, two wings, the eye) → *Windcaller's Whistle*, *Eye of the Cyclone*.
  *The six older lands* (Crypts, Mirewood, Glacial Spire, Cinder Foundry, Gloam Void, Storm Reach — only when a door leads there) get re-dressed guardians in their own colours with their own foes and one swapped attack (Marshal Corvane, Nacre, Ozymar; Murkmaw, Reedwraith, Sloughmaw; Cryolith, Frostmarch, Aurora; Anvil, Ser Cinder, Kilnroar; Umbral, Nox, Umbra; Volt, Thunderhead, Stormcrown).
  *New attack primitives* (`ED.attacks.lib`): `tideSurge`, `metronome`, `tollRing`, `mirrorFan`, `wells`, `seedfall`; ten new part kinds with their own art and orbits (`ED.partPos` / `ED.partDraw`); beams anchored to any part kind (`anchorParts`) or to a reflection.


* **v1 only is the original game** — same seeds give the same dungeons, loot, bosses and bot-played runs. `node test/parity.js` proves it against the frozen copy in `versions/v1/`. (Two latent v1 bugs were fixed along the way and do not affect parity: relic event hooks received their stack count in the wrong argument, so Blood Pact's HP cost never applied; and a hammer could stunlock a vanished Blinkling forever.)
* URL override (not saved): `index.html?packs=v1`, `?packs=v2,v4`, `?packs=all`.
* Frozen, runnable copies of earlier states live in `versions/` (`versions/v1/index.html`, …); `./snapshot.sh v3` makes a new one.
* Tests take `--packs=none|all|v2,v3` (or env `ED_PACKS`); `node test/matrix.js` runs the whole matrix (v1, every update alone, everything).

## Controls

| Action | Keys |
|---|---|
| Move | `W A S D` / arrow keys |
| Attack | `Space` / `J` (aims where you face, with soft aim-assist) — or **left click** to aim with the mouse |
| Dash (i-frames) | `K` / `Shift` |
| Interact / buy / take | `E` |
| Active ability | `Q` |
| Place bomb | `B` |
| Big map + lock legend | hold `Tab` |
| Belt items (v7) | `Z` / `X` / `C` |
| Pause (relics & stats) | `Esc` / `P` |
| Mute / Fullscreen | `M` / `F` |
| Debug mode | `` ` `` (backtick) |

**Guide:** the title's *Controls & Guide* screen has a **Guide ▸** button: one page for the basics plus one for every update you have switched on (what the new mechanics do and how they interact), written to match the game and checked by the tests.

**Rebinding:** Options → *Key bindings…* lists the twelve gameplay actions (move ×4, attack, dash, interact, active, bomb, belt ×3) with two slots each. Click a slot and press the key you want; `Esc` cancels, `Backspace` clears it. A key does one job, so binding one that another action uses moves it (and tells you). `Esc`, `Enter`, `Tab`, `P`, `M`, `F` and `` ` `` are reserved. On-screen hints (`[E] Buy`, the HUD, the tutorial, the Controls screen) follow your bindings; bindings are saved with the game and *Reset to defaults* restores the table above.

**Assist (Options):** *Gentle* (foes hit 20% softer, warn 15% longer) and *Easy* (40% softer, warn 30% longer, 15% less HP — bosses too) for learning the game. It is fixed for the whole run, shown in the HUD, still earns unlocks and counts kills, but an assisted run never sets a personal best (floor, seed or edition). Off is exactly the normal game.

**Save safety (Options):** *Export save* copies your whole save (unlocks, bests, settings, bindings, rosters, mastery) as text; *Import save* replaces the current save from pasted text (junk is refused, nothing unsafe is applied). Progress lives in this browser's localStorage, so export before clearing site data.

Gamepad (standard mapping): sticks/D-pad move, right stick aims, X/RT attack, A/RB dash, B interact,
Y/LB active, LT bomb, Start pause. *(Implemented but untested on real hardware — see limitations.)*

## How a run works

* **Floors** are procedural graphs: 1 start room, 6–10 combat rooms, 2–4 special rooms, 1–3 mini boss
  rooms and a boss room far from the start. Enter a combat room and the doors lock; 2–3 waves spawn
  from telegraphed spawn markers; clear them to open the doors and collect rewards.
* The **boss door needs the Boss Key**, which is always carried by one specific mini boss. Each mini boss
  door has its own randomly assigned requirement (small key, mini boss key, switch/brazier puzzle,
  blood pact, or a cracked wall to bomb). Locks and keys are colour-coded on doors, HUD and minimap.
* Beating a boss gives a guaranteed item choice, a heal option, and the stairway down. **Floor 5**
  ends with the first mega boss and the choice **Continue into Endless** or **Cash Out** (a victory).
  Later mega bosses leave a Cash Out altar next to the stairs. The run ends only on death or cash-out.
* Every 5th floor is a **MEGA BOSS** floor, with a safe rest room right before the boss.

### Rooms (the gamble is the hook)

| Positive | Negative | Gamble / mixed |
|---|---|---|
| Treasure (pick 1 of 3) · Healing fountain · Shop (sells *and* buys spare keys) · Blacksmith (unlimited, scaling tiers) · Secret room (bomb the cracked wall) · Rest chamber | Ambush (looks like a treasure room) · Trap room (saws, spikes, arrow turrets) · Cursed room (great item + a curse, shown up front) · Haunted room (dark, flickering foes) | Shrine (3 altars, **odds and costs shown**) · Mystery chest (great / empty / mimic — hidden) · Devil's deal (strong item for max HP) · Challenge room (harder fight, bigger reward) · Gambling table (posted odds) |

Room icons appear on doors and the minimap once a room is adjacent or revealed.

### Difficulty

Everything scales from one table, `CURVES` in `js/difficulty.js`. HP, damage, speed, projectile speed,
fire rate, spawn budget, wave count, elite chance, modifiers-per-elite, boss HP/size/damage, trap density
and rewards are all functions of the floor number with hard caps (so it climbs forever but never overflows
and 60 fps holds). Telegraphs get *faster* with depth. New enemy types and elite modifiers unlock floor by
floor (`ENEMY_INTRO`, `MOD_INTRO`), enemy fire patterns escalate through `PATTERN_TIERS`, and from floor 10
bosses enrage, bring adds, and mini bosses come in duos. The current **Danger Level** is on the HUD and the
floor-intro card.

Rough shape: floors 1–3 are learnable (no elites, gentle mini bosses), 4–8 demand dodging and build synergy,
9+ is a real test.

### Bosses

* **Floor bosses** (one per early floor, each teaching a mechanic): *Vael, the Hollow Knight* (read telegraphs),
  *Mycelia, Queen of Spores* (adds + area denial), *Pyrax, the Forge Tyrant* (the arena itself creeps with lava),
  *Aegis, the Prism Sentinel* (break the shield shards to expose the core).
* **MEGA bosses** — *Gorrak, the Stone Colossus*, *Nethys, the Tidal Hydra*, *Orrery, the Clockwork Seraph* — have
  separate hitboxes (plates/arms/core, three heads/core, gears/wings/core) that must be destroyed **in a set order**,
  4–5 phases, arena rewrites (shrinking floor, rising water, pillars, hazard rings), summoned adds, screen-wide
  "take cover" blasts, and a dramatic intro.
* After the roster is used, bosses return in **upgraded tiers**: Tier II adds phases and attacks, Tier III adds boss
  modifiers (Hasted, Armored, Vampiric, Volatile, Relentless, Regenerating), Tier IV pairs two bosses in one arena
  ("Vael & Pyrax — Tier IV"), Tier V+ fuses attack sets ("Vael-Pyrax, the Fused").

### Unlocks

First boss kills unlock new **classes** (Lancer, Brute, Rogue, Ranger, Mage, Trickster) and add items to the pool;
the first kill of each of the 11 mini bosses adds relics/actives, and every mini boss kill has a chance at a bonus
unlock. An **UNLOCKED** banner appears and everything is browsable in **Collection** on the title screen.

## Debug mode (backtick)

Shows seed, room graph (locks + key holders), FPS and entity counts. Hotkeys while it is on:

`1` god mode · `2` all keys + bombs · `3` skip to boss room · `4` spawn mini boss here · `5` reveal key
locations (and print them to the console) · `6`/`7` floor ±1 · `8` jump to floor N · `9` spawn item ·
`0` clear room · `-` full heal + gold · `=` spawn this floor's boss · `[` reveal map · `]` unlock all meta
· `\` teleport to the next mini boss.

## Tests

```bash
node test/matrix.js                           # parity + v1 alone + each update alone + everything  (~1 min)
node --expose-gc test/run-tests.js            # full suite for the currently saved/forced edition (~45 s)
node --expose-gc test/run-tests.js --quick --packs=none|all|v2,v4   # smaller counts; pick the edition
node test/parity.js [N]                       # is "all updates off" identical to the frozen v1 in versions/v1 ?
```

The suite loads the game in Node (script order from `index.html`, fake canvas, seeded `Math.random`, so failures reproduce) and checks, for the active edition:
generated floors (connectivity, boss reachability, counts, determinism) · the **key solver** (every lock satisfiable and safe in every unlock order) · the difficulty
table (finite, capped, monotonic) · content tables and item pools · 100 simulated floors with a bot (no NaN, bounded entities, no heap growth) · boss, MEGA boss and
mini boss fights · every weapon/active/lock/room type · whole floors cleared by a bot · random-input fuzzing. `test/pack-tests.js` adds a section per update
(only when it is on): v2 mechanics and class play, v3 world rules and every foe, v4 every boss fight and Revenants, v5 every choice of every encounter and each familiar,
v6 pacts, embers, the Hearth and the screens, v7 every provision and where they come from, v8 the final boss, its ending and every Abyssal Rule, v9 every trait, the roster, ambush planning, flight and escape, promotion on death and the screens, v10 every feat, the bestiary, mastery maths, skins, trails and the screens, v11 the three modes (floor-by-floor Rush and Gauntlet flows, sealing, Chaos Kits for every class, records, feats and screens), v12 the talent table, every talent applying exactly what it says, offers and the trigger, each acting talent, and a 25-second bot fight per class with all six, v13 each curio's exact effect (and no leaks when off), v14 every weapon's exact pattern and a damage-per-second band against the sword, v15 every foe's behaviour, its pool gating and a mixed room that must always be clearable, v16 the room selection (cap, seed-determinism, no random-stream use), each dare's win/lose rule, the purses, the relic cache and a bot run with dares live, v20 the boss on every floor of every land (pairs, fusions, the final-boss floor, the plain stairs untouched), every land boss beaten by the bot with its phases, the six new attacks (the dry lane, the toll that feeds the boss, the doubled volley, the beat, the briar beds), each MEGA body's parts in order, every relic, and the off-block; v19 content integrity, pool entry floors, every foe fighting alone and in a full room (key carrier included), each foe's signature rule, the six twists and six traits, whole floors with three classes; v18 content integrity for every land, each foe's signature behaviour, every hazard (wells, lanes, baits, briars, the shade, brittle planks), the Duelist copying each weapon, a whole floor and a MEGA fight in every land with the bot; v17 the world resolver, the offers (pure in seed + tier), an oracle per kind of gate (it is closed before and open after, with the real bomb / mini boss / item / toll), the plain stairs with an empty pocket, the whole detour flow (records, intro, end screen), sigils, curios, the wanderer, and every Ossuary foe, the tide, the bone heap, the Warden's sweep and the Reeve.

Helper scripts: `node test/botplay.js SEED 6 [mortal]` (watch a bot play), `node test/battery.js 80 1 0 deep` (many-seed stall hunt — `ED_PACKS=all` hunts the updates),
`ED_PACKS=all node test/route-battery.js 30 0 [worldId]` (v17+: forces a route into every land and lets the bot clear a floor of it, any of a land's five floors — the guardian floors and the MEGA included — reporting stalls), `ED_PACKS=all node test/trials-battery.js 22 16 0` (v11: plays Boss Rush and Gauntlet floors with the god bot — fights, takes every reward, descends — and reports stalls; a Rogue or Trickster losing a long boss fight to low damage is expected, not a bug), `ED_PACKS=all node test/hunt-battery.js 40 0` (v9: seeds a roster, lets the bot clear deep floors and reports stalls plus how long each nemesis rank takes to fall), `node test/balance.js 10 [class]` (mortal-bot balance probe: median death on floor ~5-7), `node test/hitlog.js 3` (what hurt the bot).

## Architecture

All modules attach to one global `ED` namespace, loaded in order by `index.html`. Generation, simulation and
rendering are separate: `generator`/`keys`/`rooms` build data, `entities`/`combat`/`player`/`flow`/`enemies`/
`bosses` simulate it (everything runs in world time via `g.ts`, so Time Slow works uniformly), and
`render`/`ui`/`menus` only read state.

| File | Role |
|---|---|
| `util.js` | namespace, constants, **seeded RNG** (`ED.RNG`, forkable), math |
| `packs.js` | **the version system** (`ED.packs`) + the extension points updates use (`ED.hook`, `weaponImpl`, `activeImpl`, `bossDraw`, `modalImpl`, `sceneImpl`…) |
| `worlds.js` | **the world registry** (`ED.worlds`): which land a floor belongs to is `f(floor, run.route)`; inert unless a pack adds a world or a run records a route |
| `pack_v2.js` … `pack_v20.js` | one file per update; every entry is tagged `pack: 'vN'` and is invisible when that update is off |
| `guide.js` | the in-game Guide pages (one per update) and their scene |
| `save.js` | persistent meta: unlocks, best floors, per-seed bests, settings |
| `difficulty.js` | **the** scaling table + wave composer, room/rarity weights, boss tiers |
| `input.js` · `audio.js` | keyboard/mouse/gamepad → actions · WebAudio SFX + reactive generative music |
| `items.js` | weapons, affixes, armor, actives, relics, synergies, classes, stat aggregation |
| `rooms.js` | tile layouts (19 templates, 10 boss arenas), door geometry, themes, room-type registry |
| `specials.js` | runtime behaviour of every special room + switch/brazier puzzles |
| `enemies.js` | enemy types, elite modifiers, AI helpers incl. obstacle-aware pathing |
| `entities.js` | collision, projectiles, telegraph zones, explosions, pickups, enemy loop |
| `combat.js` · `player.js` | damage resolution/loot/armor · movement, dash, 7 weapon behaviours, actives |
| `attacks.js` | reusable boss attack primitives (generator-based scripts) |
| `bosses.js` · `minibosses.js` | boss runtime (phases, parts, tiers, modifiers) + all boss data |
| `keys.js` | lock/key tables, assignment, the **solver**, the minimap hint logic |
| `generator.js` | floor graph generation + validation + fallback layout |
| `flow.js` | floors, rooms, doors, encounters, arena rewrites, rewards, unlocks |
| `render.js` · `ui.js` · `menus.js` | world renderer + icons · HUD/minimap/tooltips/modals · title/select/collection/pause/end |
| `debug.js` · `main.js` | debug mode · Game object, 60 fps fixed-timestep loop, scene state machine |

## Adding content (one table entry each)

> **In an update** (not v1): tag the entry `pack: 'vN'` and register it from `js/pack_vN.js` — core pools filter with `ED.packs.ok(def)`, so it only exists while that update is on.
> Never consume RNG for update content while it is off, or v1 parity breaks (`node test/parity.js` will tell you).

**An enemy** — add to `ENEMIES` in `enemies.js`, and an intro floor in `ENEMY_INTRO` (`difficulty.js`):
```js
leech: { id: 'leech', name: 'Leech', shape: 'blob', color: '#c02a4a', r: 11, hp: 9, speed: 1.4, dmg: 3,
         cost: 1.1, weight: 6, minFloor: 5, contact: true,
         update(e, g) { const i = ED.ai.info(g, e); ED.ai.chase(g, e, i, e.curSpeed, 0); } },
```
**An elite modifier** — add to `MODS` (`apply`, `update`, `onHurt`, `onDeath`, `onHitPlayer` hooks) and `MOD_INTRO`.

**A relic** — add to `RELICS` in `items.js`: `mods: {dmg: 0.1}` (stat keys are listed in `STAT_NAMES`), optional
`max`, `unique`, `tag: 'risk'`, `unlock: 'mini:rockjaw'`, and `on: { hit, kill, hurt, clear, dash, enter, pickup }` hooks.
Combos: add a row to `SYNERGIES`. **Weapons/affixes/armor/actives/classes** are the same pattern (`WEAPONS`,
`AFFIXES`, `ARMOR`, `ACTIVES`, `CLASSES`).

**A mini boss or boss** — add to `DEFS` in `minibosses.js` / `bosses.js`. Attacks are data:
```js
attacks: { slam: ['slamRing', { r: 90, rings: 2, gaps: 1 }], rain: ['rain', { n: 8, r: 46 }] },
phases:  [ { at: 1.0, name: 'Calm', attacks: ['slam'], idle: [34, 60] },
           { at: 0.5, name: 'Rage', attacks: ['slam', 'rain'], idle: [24, 44],
             enter: [['summon', { types: ['imp'], n: 3 }]] } ],
```
A new attack primitive is a generator function in `attacks.js` (`yield n` waits n frames). Multi-part bodies
(mega bosses) declare `parts` with a destroy `group` order and a `phaseOf(e)` function.

**A room type** — add its metadata to `TYPES` in `rooms.js`, spawn weight to `ROOM_WEIGHTS`
(`difficulty.js`), and `{ setup, onEnter, update, onClear }` in `specials.js`.

**A shrine altar** — add to `SHRINES` in `specials.js` (odds table + cost function; odds are drawn from the table so
they always match). **A layout** — add a painter to `TEMPLATES`/`ARENAS` in `rooms.js`; a validator carves door
clearance and fills any unreachable pocket, so a bad template cannot break connectivity.

## Tuning difficulty and key rules

* **Difficulty**: edit rows of `CURVES` (`base + lin·x + quad·x²`, clamped to `cap`, `x = floor-1`). Change `PATTERN_TIERS`
  for projectile-pattern escalation, `ROOM_WEIGHTS` to shift how many negative/gamble rooms appear with depth,
  `RARITY_WEIGHTS` for loot quality, `CAPS` for the hard simulation limits (enemy count, bullets, per-hit damage cap).
  Re-run `node test/balance.js` to see where a bot dies.
* **Locks**: `LOCKS` in `keys.js` is the requirement table (`weight`, first floor `from`). Add a row + handle it in
  `flow.updateDoors` and the solver (`solve`) to add a new kind of lock.
* **Key sources**: `SOURCES` lists where each key may be hidden (enemy drop, chest, shop, mystery chest, secret room,
  treasure room, another mini boss). `KEY_HOST_OK` is the whitelist of rooms allowed to hold a key —
  ambush/trap/cursed/haunted/shrine/devil/challenge/gambling rooms can **never** hold a key.

### Why keys cannot softlock

1. After layout, `keys.assignValid` wires locks and keys and runs the **solver**: it explores the full state graph of
   "which locks are open" starting with nothing, and requires that the floor can be finished from *every* reachable state
   (not just one lucky order — keys are fungible, so a player may spend one on the wrong door). A key behind its own lock,
   behind a lock that needs it, in an unreachable room, or an order-dependent trap fails and the floor is re-wired / regenerated.
2. Locked rooms are always dead-end leaves; nothing required sits behind a lock except via a validated chain.
3. Every key *hold* materialises at runtime (each carrier enemy, chest or altar exists — bots caught a bug where a second
   key in the same room did not spawn, now fixed and tested).
4. Runtime guards: pickups/chests/pedestals snap to reachable floor; a **bomb is provided** if a cracked wall still needs one
   and none are left; a **hammer slam** also breaks cracked walls; the sacrifice door always has a never-lethal blood option;
   the shop's reserved key is free once the floor is clear; spare-key selling can never sell a key the floor still needs;
   and a **hint** (gold glow on the minimap, `Tab` map) points at the missing key's room once most of the floor is cleared.

## Known limitations / honest notes

* **Balance is bot-tuned, not human-tuned.** I probed difficulty with automated bots (and tightened telegraphs, boss contact
  damage, early mini boss pools and enemy pathing based on what they showed — a deliberately mediocre dodging bot dies around
  floor 3–5, so skilled humans should reach 10–15), but nobody has playtested for fun. Expect to tweak `CURVES` to taste.
* **Audio** is fully synthesised and verified to run without errors, but I could not *listen* to it: mix levels are a guess
  (volume/music sliders are in Options).
* **Gamepad** support is implemented against the standard mapping but untested on a physical controller.
* Rooms are single-screen (no scrolling) — mega bosses are huge on purpose; at very deep floors they approach the arena size.
* Hidden secret rooms are found by bombing a subtly cracked wall; there is no other hint besides the *Third Eye* relic
  (which highlights them) and the debug reveal.
* Keyboard-only aiming is 8-way facing + soft aim-assist; mouse (or a right stick) gives free aim.
* `localStorage` can be unavailable (private windows / some `file://` configurations) — the game then runs normally but
  progress is not saved.
* No key rebinding, no touch controls.
* The updates were tuned with the same bots (and a handful of mortal-bot balance probes per class); expect to tweak Heat pacts, hazard frequencies (`HZ` in `pack_v3.js`) and boss numbers to taste.
* **Balance (mortal-bot probe, `node test/balance.js 20 <class>`; the bot dodges mediocrely, so read medians, not absolutes):** with everything on, most classes die around floor 5 (target 5–7), Warden has a long right tail (mean ~7) and Necromancer / Alchemist / Lancer / Mage / Ranger / Brute sit at 5. The v1 **Rogue** (4 hearts, short-range daggers) is the hardest class — the bot dies to the first boss in almost every run — and the v1 **Trickster** is weak too; both are left alone on purpose because the v1 edition is frozen. The v2 **Monk** was the weakest update class, so Gauntlets now hit for 3.8 (was 3.4) and Flow lingers 1.8s (was 1.3s): v2-only median floor 3 → 4.
* **Error safety:** the browser loop re-arms itself before doing anything and catches every exception (a toast says something went wrong and the console has the details; if it repeats every frame the game pauses so you can leave). In the browser a failing update hook is isolated: it is reported, and after 3 errors that one hook is switched off while the run goes on. The test suite runs with this off (`ED.hooksSafe = false`) so real bugs still throw.
* A few bot-only stalls remain in the stall hunt (the bot cannot aim a fan of staff orbs at a brazier, or reposition around an edge-hugging Aegis): a human does not get stuck there.
* Two items are cosmetic-only complexity I chose not to expand: boss "fusions" reuse the first three attacks of the partner
  boss per phase, and shop stock never restocks except via the paid re-roll.

Nothing from the brief was cut; where a rule needed a judgement call (e.g. mystery chests that hold a required key are
"rigged" to never roll *empty*, so a key can never be gambled away) it is documented in the code and tested.

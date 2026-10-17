# EMBERDEEP — an endless roguelike descent

A Zelda-style, room-by-room dungeon crawler that never ends. Procedural floors, locked doors and
colour-coded keys, bosses that return as ever-larger tiers, **MEGA bosses** with multi-part bodies every 5th floor,
and — since the updates — six distinct worlds, 11 classes, 80 relics, event encounters, companions, Pacts of Heat and a
permanent Hearth. Built with plain HTML5 Canvas + vanilla JavaScript — no frameworks, no external assets, no build step.
Every sprite is a coloured shape; every sound is synthesised; the soundtrack is generated live.

**It ships as v1 plus nine switchable updates (v2–v10) — see [Versions](#versions-the-update-toggle).**

```
~10700 lines of game code · 33 JS modules (9 of them are the updates) · 11 classes · 12 weapons · 80 relics · 7 floor bosses + 5 MEGA bosses
15 mini bosses · 20 room types · 6 worlds · 29 enemy types · 17 elite traits · 11 event encounters · 6 familiars · 13 pacts of heat
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
| **v5 FATE** | A new room type, the Fateful Encounter: 11 choose-your-fate events (merchant, bleeding altar, wishing well, duelist, forge spirit, caged creature, dice of fate…) with costs and odds shown on the buttons, and 6 familiars that follow you from floor to floor. |
| **v6 HEAT** | 13 opt-in **Pacts of Heat** (score & ember multipliers), a permanent **Embers** currency with **Hearth** upgrades, fixed pacts on the **Daily Descent**, and a **Run Records** screen for comparing editions. |
| **v7 PROVISIONS** | A 3-slot belt (`Z` `X` `C`) of single-use tools: 12 potions, scrolls and tricks (healing, smoke, tonics, lightning/frost/fire scrolls, lockpick, dash powder…) found as drops, room finds, mini boss prizes and in shops. |
| **v8 ABYSS** | A true final boss — **The Emberdeep Heart** — on floor 50 (and every 50th floor after) with an ending choice (claim the victory, or descend), plus an **Abyssal Rule** on every floor from 31 on (darkness, bloodtide, ironclad foes, storms, withering…) paid back in gold. |
| **v9 THE HUNT** | A persistent **nemesis roster**: elites, boss heralds and sometimes plain foes that kill you — or escape you — become *named* nemeses with a rank (1–5), 20 readable traits (12 strengths, 8 weaknesses you discover by fighting), ambushes in later runs, history-aware taunts, flight when beaten, ranks gained when they win, spoils when you slay them, and a **THE HUNT** roster screen on the title. |
| **v10 LEGACY** | A record of who you were: 27 **feats** that earn wearable titles, a **bestiary** of every foe and boss (kills, how often each killed you, stats, studied marks), and **class mastery** (levels 1–10) that unlocks five skins per class and five trails. Pure record and cosmetics — it never changes how the game plays. |

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
  caged creature, dice of fate, mirror. Costs and odds are always on the buttons. Six **familiars** (Ember Sprite, Moss Cub, Gilded Magpie, Frost Moth, Lamp Moth, Shadow Cat).
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

**Rebinding:** Options → *Key bindings…* lists the twelve gameplay actions (move ×4, attack, dash, interact, active, bomb, belt ×3) with two slots each. Click a slot and press the key you want; `Esc` cancels, `Backspace` clears it. A key does one job, so binding one that another action uses moves it (and tells you). `Esc`, `Enter`, `Tab`, `P`, `M`, `F` and `` ` `` are reserved. On-screen hints (`[E] Buy`, the HUD, the tutorial, the Controls screen) follow your bindings; bindings are saved with the game and *Reset to defaults* restores the table above.

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
v6 pacts, embers, the Hearth and the screens, v7 every provision and where they come from, v8 the final boss, its ending and every Abyssal Rule, v9 every trait, the roster, ambush planning, flight and escape, promotion on death and the screens, v10 every feat, the bestiary, mastery maths, skins, trails and the screens.

Helper scripts: `node test/botplay.js SEED 6 [mortal]` (watch a bot play), `node test/battery.js 80 1 0 deep` (many-seed stall hunt — `ED_PACKS=all` hunts the updates),
`ED_PACKS=all node test/hunt-battery.js 40 0` (v9: seeds a roster, lets the bot clear deep floors and reports stalls plus how long each nemesis rank takes to fall), `node test/balance.js 10 [class]` (mortal-bot balance probe: median death on floor ~5-7), `node test/hitlog.js 3` (what hurt the bot).

## Architecture

All modules attach to one global `ED` namespace, loaded in order by `index.html`. Generation, simulation and
rendering are separate: `generator`/`keys`/`rooms` build data, `entities`/`combat`/`player`/`flow`/`enemies`/
`bosses` simulate it (everything runs in world time via `g.ts`, so Time Slow works uniformly), and
`render`/`ui`/`menus` only read state.

| File | Role |
|---|---|
| `util.js` | namespace, constants, **seeded RNG** (`ED.RNG`, forkable), math |
| `packs.js` | **the version system** (`ED.packs`) + the extension points updates use (`ED.hook`, `weaponImpl`, `activeImpl`, `bossDraw`, `modalImpl`, `sceneImpl`…) |
| `pack_v2.js` … `pack_v10.js` | one file per update; every entry is tagged `pack: 'vN'` and is invisible when that update is off |
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
* A few bot-only stalls remain in the stall hunt (the bot cannot aim a fan of staff orbs at a brazier, or reposition around an edge-hugging Aegis): a human does not get stuck there.
* Two items are cosmetic-only complexity I chose not to expand: boss "fusions" reuse the first three attacks of the partner
  boss per phase, and shop stock never restocks except via the paid re-roll.

Nothing from the brief was cut; where a rule needed a judgement call (e.g. mystery chests that hold a required key are
"rigged" to never roll *empty*, so a key can never be gambled away) it is documented in the code and tested.

# EMBERDEEP — an endless roguelike descent

A Zelda-style, room-by-room dungeon crawler that never ends. Procedural floors, locked doors and
colour-coded keys, 11 mini bosses, 4 floor bosses that return as ever-larger tiers, and **MEGA
bosses** with multi-part bodies every 5th floor. Built with plain HTML5 Canvas + vanilla JavaScript —
no frameworks, no external assets, no build step. Every sprite is a coloured shape; every sound is
synthesised; the soundtrack is generated live.

```
~7,800 lines of game code · 23 JS modules · 12 enemy behaviours (+ minions, elites with 14 modifiers) · 51 relics · 11 mini bosses · 7 bosses · 19 room types
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

* **v1 only is the original game, bit for bit** — same seeds give the same dungeons, loot and fights. `node test/parity.js` proves it against the frozen copy in `versions/v1/`.
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
| Pause (relics & stats) | `Esc` / `P` |
| Mute / Fullscreen | `M` / `F` |
| Debug mode | `` ` `` (backtick) |

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
node --expose-gc test/run-tests.js            # full suite (~35 s, ~49,000 assertions)
node --expose-gc test/run-tests.js --quick    # ~8 s
```

The suite loads the game in Node (using the script order from `index.html`, with a fake canvas) and checks:

1. **800 generated floors** (random seeds and floor numbers, 1–120): connectivity, boss reachability, no overlaps,
   door symmetry, counts (6–10 normal / 2–4 special / 1–3 mini), mega floors have a rest room, determinism.
2. **Key solver**: every lock and the Boss Key chain is satisfiable from nothing — **and safe in every unlock order**
   (keys are fungible, so spending one on the "wrong" door must never strand the floor); deliberately sabotaged floors
   (key behind its own lock, missing keys, Boss Key in the boss room, order-dependent traps…) are all rejected.
3. **Difficulty table** floors 1–400: finite, capped, monotonic (rising curves rise strictly until their cap,
   telegraph falls), enemies only appear on/after their intro floor, waves/budgets within caps.
4. **Content tables**: item pool never runs dry, every boss attack resolves, boss tiers/pairs/fusions exist.
5. **Floors 1–100 simulated** headlessly with a bot: no exceptions, no NaN/∞ in entities or stats, bounded entity
   counts, **no heap growth**, old floors are garbage-collected, tile caches freed.
6. **Boss fights** at floors 1–12, 15–17, 20, 21, 25, 30, 40, 55 (including **mega bosses at 5, 10 and 25**,
   tier-IV pairs and tier-V fusions) and all 11 mini bosses (plus duos and enrage) are fought and defeated.
7. **Mechanics**: all 7 weapons and 8 actives, every lock type opening for real (key, pact, bomb, hammer,
   plates, braziers), secret rooms, shop/shrine/devil/cursed/gambling/mystery/ambush/challenge/haunted/trap/
   blacksmith/fountain, hint system, softlock guards.
8. **Bot clears 90 whole floors** (fresh runs and deep jumps) — every key, lock, puzzle and bomb wall was
   obtainable *in practice*, not just on paper. Plus a **random-input fuzz** run.

Helper scripts: `node test/botplay.js SEED 6 [mortal]` (watch a bot play), `node test/battery.js 80 1 0 deep`
(many-seed stall hunt — this is what found most of the late bugs), `node test/balance.js 10` (mortal-bot balance probe:
median death on floor ~5 for a mediocre bot, best runs reach floor 9+), `node test/hitlog.js 3` (what hurt the bot).

## Architecture

All modules attach to one global `ED` namespace, loaded in order by `index.html`. Generation, simulation and
rendering are separate: `generator`/`keys`/`rooms` build data, `entities`/`combat`/`player`/`flow`/`enemies`/
`bosses` simulate it (everything runs in world time via `g.ts`, so Time Slow works uniformly), and
`render`/`ui`/`menus` only read state.

| File | Role |
|---|---|
| `util.js` | namespace, constants, **seeded RNG** (`ED.RNG`, forkable), math |
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
* Two items are cosmetic-only complexity I chose not to expand: boss "fusions" reuse the first three attacks of the partner
  boss per phase, and shop stock never restocks except via the paid re-roll.

Nothing from the brief was cut; where a rule needed a judgement call (e.g. mystery chests that hold a required key are
"rigged" to never roll *empty*, so a key can never be gambled away) it is documented in the code and tested.

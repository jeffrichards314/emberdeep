# EMBERDEEP — next big update: BRANCHING WORLDS, MORE FOES, MORE BOSSES (a Dead Cells–style route)

*Handoff brief for a fresh chat. The previous chat was very long; everything you need is here or in the files it points to. Written 2026-10-14 after v16 shipped (matrix green).*

> **STATUS (2026-10-14, end of the build chat): DONE — phases A–D shipped as v17 CROSSROADS, v18 WORLDS II, v19 BESTIARY, v20 SOVEREIGNS, plus a part of phase E as v21 HIDDEN DEPTHS (the hidden Hollow King's Court + hidden trapdoors).** The user chose "bigger than the default", mixed risk, choices after each MEGA boss (+ hidden mid-tier trapdoors), original names + plain shapes. See `HANDOFF.md` (the DONE block) for what exists and the gotchas found. **Still open from this brief:** a second hidden land (the Abyssal Bazaar, `deep20` gate), more trapdoor targets, sigils that grant small in-world abilities. **The follow-up brief is `NEXT_UPDATE_WORLDS_2.md` (more lands, gallery, sigil arts).** Everything below is the original brief, kept for reference.

## 0. Do this first (10 minutes)
1. Read `/Users/xkineiko/abc/HANDOFF.md` (the **LATEST STATE** block + the rules at the top), then the **Versions** and **What each update adds** sections of `README.md`, then the memory notes in `~/.claude/projects/-Users-xkineiko-abc/memory/` (`emberdeep-project.md`, `emberdeep-versions-roadmap.md`).
2. Run `cd /Users/xkineiko/abc && node test/matrix.js` — it must be green (parity vs frozen v1 + v1 + each of v2..v16 alone + everything, ~3 min). Never start building on a red matrix.
3. Skim the code you will touch (section 3). Then ask the user the few questions in section 6 (once), and start with the vertical slice in section 4, phase A.

## 1. What the user asked for (their words, then what it means)
> "due to the scale of the game I feel like expanding of worlds/general enemies and bosses and stuff would be a good idea, with like the different areas being unlocked different ways, not explicitly said. I really like the way the game Dead Cells handles it, and I really like the scale too so maybe since the rest of the game is so big this would be a good addition / couple of additions so it wouldn't feel so repetitive."

- **The descent stops being a straight line of worlds.** At the end of each world you choose between several exits to different next worlds (a *route graph*, like Dead Cells' biome branching), so two runs rarely look alike.
- **Some exits are hidden or gated, and the game never says how.** Every gate is unlocked a *different* way (a secret you find, a permanent token you collect, something you carry, something you did on the way, something you beat in an earlier run). The UI gives at most a hint — an odd door, a glow, one line of flavour text. A Route/Codex page records only what the player has already discovered (silhouettes for the rest). The Guide must not spell conditions out.
- **Much more content so cycles feel fresh:** more worlds, each with its own palette + rule + exclusive foes + elite trait + mini boss(es) + boss line; more *general* foes (behaviours the game does not have yet); more bosses (including hidden ones behind hidden exits).
- **Scale matters to them** ("I really like the scale"). Think dozens of things, but every one must be *intentional* (distinct behaviour / identity), never padding. Cheap graphics (plain shapes) are fine.
- Dead Cells is inspiration for the *structure* (branching biomes, discovery-gated paths, per-biome identity) — use original names, art and mechanics, do not copy its content.

## 2. Hard rules (carry over unchanged — the user cares about these)
- v1 is frozen in `versions/v1`. All new content is **packs**: `js/pack_vN.js`, entries tagged `pack:'vN'`, switchable on the in-game VERSIONS screen (also `?packs=v2,v17` / `ED_PACKS=`). **With every pack OFF the game must equal v1** (`node test/parity.js`), and a pack that is off must not change behaviour or consume RNG. Packs must be **independent** (any subset must be playable): `node test/combos.js 40 <seed> 4`.
- After each update: `node test/matrix.js` green (and `--full` once per update), `./snapshot.sh vN`, README (table row + bullet + stats), `HANDOFF.md` LATEST STATE, a Guide page in `js/guide.js` (**every active pack needs one**, test P0f), memory notes, tests in `test/pack-tests.js` (sections go before the `// ----- runs last on purpose` marker; play-frame sections near the end because the shared `Math.random` stream makes earlier layout-sensitive tests flaky).
- Keep going until the work is genuinely done; keep `HANDOFF.md` current after every milestone (a usage limit once cut a session mid-pack). Final message to the user: short — what was added, how to toggle it, what is verified.
- Ask few questions. The user is often away; if unanswered, take the recommended defaults in section 6 and write them into HANDOFF.

## 3. How the code works today (the parts this update touches)
Scale today (all packs on): **33 enemy types** (17 v1 + 12 v3 world foes + 4 v15), **7 floor bosses** (4 v1 + 3 v4), **6 mega bosses** (3 v1 + 2 v4 + v8's final Heart), **18 mini bosses** (11 v1 + 4 v3 + 3 v4), **6 worlds** (v3), 18 elite modifiers, 95 droppable relics (+70 hidden class/talent relics), 11 classes, 19 room templates, 10 boss arenas.

- **Worlds (`js/pack_v3.js`).** `WORLDS` table (palette `theme`, `rule`, two exclusive foes, `mod`, `mini`) and hazards `HZ` per world. `ED.worlds.at(floor)` is a **pure function of the floor number**: `Math.floor((floor-1)/5) % 6`. Callers: `difficulty.js` `enemyPool` / `modPool` (via `enemiesFor` / `modsFor`), `rooms.js` `themeFor(floor)` (called inside `ED.gen.generate(n, seed)` — **no run object exists there**; parity also calls `generate` directly), `minibosses.js` (`miniFor`, 55% swap), and v3's own hooks (hazards, HUD tag at (728,63), floor-intro card). Without v3, v1 uses `THEMES[Math.floor((floor-1)/2) % 7]`.
  - **This is the biggest structural change:** the world must become `f(floor, run.route)` while still equalling today's linear mapping when no route exists (v3 alone must behave exactly as now — its tests pin that).
- **Floors and bosses.** Every floor has a boss room; every 5th floor is a MEGA floor (rest room first). `ED.bosses.forFloor(floor, rng)` picks from a rotation by `D.bossIndex(floor)` (`ORDER = vael, mycelia, pyrax, aegis` + v4's three; `MEGA_ORDER = colossus, hydra, seraph` + v4's two); fused/partnered bosses at higher tiers; v8 puts the final boss on floor 50. Bosses are data (`DEFS`/`MEGAS`: parts, phases, attacks from the shared `lib`: fan, radial, beams, bars, charge, rain, slamRing, hazardRings, summon, screenBlast, shrink…), drawn with plain shapes (`ED.bossDraw`), each with `arena`, `unlock:{boss:id}` and a signature relic. **`pack_v4.js` is the template for adding bosses.**
- **Descending.** `flow.js` boss-clear block (~lines 515–525) drops pedestals, heal fonts and a single `stairs` interactable ("Descend to floor N+1" → `g.nextFloor()` → `startFloor(n+1)`, which calls `ED.gen.generate`). Mega bosses also add a cash-out altar. **The exit choice belongs here** (the mega boss room = world boundary).
- **Enemies.** `js/enemies.js` (17 v1 types) + the registry `ED.enemyTypes[id]`; v1 intro floors in `difficulty.js ENEMY_INTRO`; `D.enemyPool(floor)` adds world foes (`ED.worlds.enemiesFor`) and world-free pack foes (`ED.freeFoes`, v15). Def shape: `{id,name,shape,color,r,hp,speed,dmg,shot,cost,weight,minFloor,group,noElite,contact,init,update,onDeath,draw}`; helpers `ED.ai` (info/chase/kite/walk/heading), `g.zoneCircle`, `ED.mods` (elite modifiers). `ED.encounter.planRoom` builds waves from the pool under a cost budget. **Read `ED.enemyTypes` before designing foes so you do not duplicate a behaviour.**
- **Generator.** `js/generator.js` (room graph + key/lock solver `ED.keys.solve`), `js/rooms.js` (templates, arenas, `THEMES`), `js/render.js` (palette-driven plain-shape tiles), `js/audio.js` (procedural music: `ED.audio.music.set({floor, boss, intensity})`).
- **Machinery already there that can host *hidden* gates:** hidden edges / cracked walls (bombs), `room.type 'secret'`, lock types in `js/keys.js` (small / miniboss / boss / bomb / switch / sacrifice), special rooms (`specials.js`), v5 "?" encounters, v7 provisions, v9 nemeses, v10 feats + bestiary + mastery (`meta.legacy`), v4 revenants, v6 embers/Hearth, v16 dares, `ED.save.meta` (merge-safe) and `ED.save.unlockItem`.
- **Pack API:** `ED.packs` (`P.define/on/ok/values/track/content`), `ED.hook(name, pack, fn)` — names: tick, runStart, floorStart, roomEnter, roomClear, kill, spawn, hurt, draw, hud, under, intro, guardBreak, selectUI, titleUI, endUI, runEnd, miniDefeated, pauseUI. `ED.runHooks` forwards only **two** extra args (pass an object for more). Registries: `ED.sceneImpl`, `ED.modalImpl`, `ED.weaponImpl`, `ED.activeImpl`, `ED.bossDraw`, `ED.partDraw`, `ED.freeFoes`. Study these as templates: `pack_v3` (worlds, hazards, foes, minis), `pack_v4` (bosses, mega, unlocks), `pack_v15` (generic foes), `pack_v9` (seed-keyed `floorStart` planning), `pack_v11` (modes, sealing, warp), `pack_v16` (seed-chosen rooms, HUD strip, feats registered into `ED.legacy.FEATS`).

## 4. Proposed plan — separate packs, in this order (each: own file, tests, Guide page, README, snapshot)
**Start with a vertical slice** (phase A + ONE new world end to end) to prove the pipeline before adding breadth.

### Phase A — v17 CROSSROADS (the route system)
- `ED.route` resolver. `ED.worlds.at(floor)` (and everything that calls it) asks `ED.route.worldAt(floor)`; with no run / pack off / no choice made it returns exactly today's linear world. Decide the route for a tier **before** generating that tier's first floor; store `run.route` (array, one world id per tier). Everything about what is *offered* derives from `new ED.RNG(seed + ':route:' + tier)` — **never the shared RNG**.
- **Independence:** the node list is built from the *active* packs (v1 baseline themes, v3's six, later packs' worlds). If a tier has only one node, there is no choice UI (silently linear). `at()` currently indexes `WORLDS[wi % 6]` with no pack filtering — it must filter by `P.ok(world)` once other packs add worlds, and the `ED.packs.on('v3')` checks in difficulty/rooms/minibosses need to become "does this floor have a world" checks.
- **Exit doors** in the mega-boss room replace/augment the single `stairs`: 1–3 plain-shape portals; the label is the world's name only once discovered, otherwise a glyph/"???". Walking into one commits. **A default exit with no gate always exists** (never strand the player; never gate the only way down).
- **Gate engine** (data-driven: `{id, hint, visible(g), open(g)}`) with **6–8 gates, each unlocked differently**:
  1. *Secret door:* a hidden edge / cracked wall in the last rooms (bomb) opens a side exit this run.
  2. *Sigils* (permanent, in `meta`, like Dead Cells' runes): 4–6 tokens found in secret rooms or dropped by specific optional mini bosses; each is the key to certain exits in later runs (optionally also a small in-world ability: break cracked walls with a dash, cross a pit once, see in the dark). Never labelled with what they open.
  3. *Carry gate:* arrive holding a particular item (a relic/provision picked up in an optional spot — e.g. a lantern for a dark path).
  4. *Deed gate:* something done in the world: N dares won (v16), an optional mini boss killed, a floor cleared untouched, the world finished quickly, a bomb never used…
  5. *Legacy gate:* needs a record in `meta` (a boss slain in an earlier run, a feat, a bestiary tier) — appears from the next run on.
  6. *Cost gate:* an altar exit that opens for a price (max heart / relic / gold).
  7. *Rumour:* a rare wanderer sells a hint that reveals what one gate needs.
- **Records & screens:** `meta.route = { discovered:{nodeId:true}, seenEdges:{}, sigils:{}, taken:{} }` (merge-safe defaults); a **ROUTES** page (Collection/Guide area) showing discovered nodes/edges with silhouettes for the rest; the end screen shows the route taken; HUD + floor-intro card show the world; new Legacy feats ("discover 3 routes", "take every exit of a tier"…) via `ED.legacy.FEATS` as v11/v16 do.
- **Interplay:** difficulty stays floor-based (`D.at(floor)`); v8's abyssal rules (floor ≥ 31) and the floor-50 Heart stay tied to the *floor*, not the route; v11 sealed modes (Rush/Gauntlet) disable routing; Daily seed has a fixed route; Assist unaffected.

### Phase B — v18 new worlds (3 first, more later; each a full identity)
Each world = palette, a telegraphed **rule/hazard**, 4–6 exclusive foes with *different behaviours*, an elite trait, 1–2 mini bosses, props/decor in plain shapes, a music flavour, which tiers it can appear on and **which gate hides it** (so players meet every kind of discovery). Ideas (original — refine with the user, drop weak ones): **Sunken Ossuary** (tides rise/fall, drowners, bones that reassemble), **Clockwork Orrery** (rotating platforms, timed crushers, slow-time fields), **Gilded Vault** (trap-heavy, mimics, greed economy; its gate is a gold sacrifice), **Thornwood Hollow** (briars regrow and block paths until burned), **Mirror Halls** (reflections; a mini boss that copies YOUR weapon), **Ashen Caldera** (eruption telegraphs, thrown rock), **Sky Bridge** (wind, pits, fliers), **Abyssal Bazaar** (a hidden "shop world" guarded by vendors; high risk/high reward), **the Hollow King's Court** (hidden late world behind several sigils).

### Phase C — v19 BESTIARY (general foes + traits)
20–30 foes that appear in *any* world via `ED.freeFoes` (or world-tagged), each adding a **new behaviour**: e.g. sniper with a visible laser tell, grappler that drags you, linked pairs (kill both), reflective shield, corpse-reviver, terrain-changer (makes pits/ice), ambusher from walls, kamikaze packs, order-puzzle foes… (check the list first!). Cheap multiplier: **world variants** of existing foes (palette + one twist, e.g. Mirewood chaser leaves a poison trail) and new elite traits. Also give each world a *signature pairing* of foes that synergise.

### Phase D — v20 SOVEREIGNS (bosses)
Per-world boss lines: 2–3 floor bosses + 1 mega each, plus **hidden bosses** behind hidden exits. `forFloor` consults the route's world (`world.bosses` / `world.mega`) and falls back to the existing rotation when no route/pack. Compose attacks from the shared `lib`; plain-shape draw functions; arena choice; signature relic via `unlock:{boss:id}`; Guide + bestiary entries. Cheap multiplier: **boss variants** (world palette + one swapped attack) of the existing 13 bosses.

### Phase E (optional) — more worlds, a hidden endgame world, route-aware relics/feats.

## 5. Pitfalls we already paid for (do not repeat)
- **Softlock class 1:** anything that makes a foe leave without dying (flee/escape/despawn/teleport away) must skip `e.carriesKey` carriers — the key is lost and the floor can never finish (route through `g.killEnemy`).
- **Softlock class 2:** a foe that never moves spawned *inside an unbreakable prop* (a brazier) cannot be hit by anything that shoots; `G.clearBraziers` fixes spawns. Any new stationary foe / prop / hazard must be checked for unreachable or unhittable states, on every world's templates.
- **Gates must be discoverable and solvable:** write an *oracle* test per gate (a scripted run satisfies it and the exit appears) and a test that a plain bot run always finds the default exit. Add `test/route-battery.js` (force each route and gate, run the bot through the world) next to `test/battery.js`.
- `test/battery.js` calls a floor STALLED only after 5 game-minutes with no progress (`BATT_VERBOSE=1` prints each seed's longest floor/idle). Triage a stall by replicating the battery loop in a scratch script (bot.tick + g.step; dump enemies/props/held keys). Real bugs so far were game bugs above; the rest were bot weaknesses (fix the bot, not the game).
- Tests: `hurtPlayer()` starts a hitstop — step ≥ 6 frames before asserting; `ED.runHooks` passes only two args; **never `P.track('relics', …)`** (replaces the shared table); don't edit files while `matrix --full` / batteries run (they load `js/` per process); deterministic content must not use `Math.random` (spawn positions do, so keep layout-sensitive tests early/robust); with 16+ packs the UI lists were overflowing — re-check Versions, Collection, Pause, Legacy, Guide when content grows (screens adapt, but verify in the browser pane).
- Performance: floor generation must stay in milliseconds; drawing stays cheap (plain shapes).
- Save safety: new meta keys get merge-safe defaults; pasted/damaged saves must not break (`merge` skips `__proto__/constructor/prototype`).

## 6. Ask the user first (once; use AskUserQuestion; defaults in bold)
1. First pass size? **Route system + 3 new worlds + one hidden world** (more worlds later) / route system only / bigger.
2. Where do choices happen? **End of each world (after the mega boss), plus 1–2 hidden mid-world side exits in later phases** / end of world only.
3. Do side/hidden routes differ? **Hidden/side worlds hit ~half a danger tier harder and pay richer boss spoils; main progress is never gated** / identical difficulty.
4. Names/art: **original names and plain-shape art, Dead Cells only as structural inspiration** / OK to echo its tone more closely.

## 7. Definition of done (per phase)
`node test/matrix.js` green and `--full` green once · `node test/combos.js 40 <seed> 4` all pass with the new pack included · deep all-packs battery ≥ 500 fresh seeds (`ED_PACKS=all BATT_VERBOSE=1 node test/battery.js 100 1 <offset> deep`, run in parallel chunks) with no real stalls + the route battery · parity exact · browser-pane check of every new screen (preview server: launch config `emberdeep`, `serve.py 8138`; drive with `ED.game.step()/render()`, clear `localStorage['emberdeep.save.v1']` afterwards) · README, Guide page, HANDOFF, memory updated · `./snapshot.sh vN`.

## 8. Useful commands
```
cd /Users/xkineiko/abc
node test/matrix.js            # quick: parity + v1 + each pack alone + everything   (add --full for the long run)
node --expose-gc test/run-tests.js [--quick] [--packs=none|all|v2,v17]
node test/parity.js            # v1 parity against versions/v1
node test/combos.js 40 7 4     # random pack subsets
ED_PACKS=all BATT_VERBOSE=1 node test/battery.js 100 1 5000 deep      # stall hunt (seeds 5000-5099)
node test/hunt-battery.js 80 0 ; node test/trials-battery.js 22 16 11 # pack-specific hunts
./snapshot.sh v17              # after the matrix is green
```

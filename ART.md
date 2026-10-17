# EMBERDEEP — art style guide and final inventory ("polished shapes", v23 POLISH + the art finish of v22–v28)

Everything is still **shapes drawn by code** (Canvas 2D, no sprites, no files, no libraries). v23 replaces the *finish*, not the vocabulary.
The classic renderer is untouched and reachable: with v23 off (or `POLISH: off` in the gallery) the game draws exactly what it always drew.

## 1. The rules every drawing follows
1. **One light.** From the top-left (≈ −135°). Highlights top-left, shade bottom-right, cast shadows fall down-right. Never mix.
2. **Ink, shade, rim.** Every creature / object is drawn flat first, then goes through the *ink pipeline* (`skin.ink`): a dark **outline** (2px, `darker(color, .6)`), a **shading** gradient (light → shade along the light axis) and a thin **rim light** on the lit edge. That is what makes classic art (a circle with eyes) read as a crafted vector illustration, and it makes everything cohesive: foes, bosses, parts, props and the player all get the same treatment.
3. **Readability beats beauty.** Priority: player + incoming damage > foes > pickups / interactables > decor. Decor is calmer (lower contrast, lower saturation) than gameplay objects. Never red-vs-green only: pair colours with shape / pattern cues.
4. **Telegraph language.** A telegraph is the damage colour at low alpha + a diagonal hatch + a bright rim that closes in as the hit approaches. Hazards (always damaging) get a pulsing rim and no hatch. Safe zones are drawn green with a ring.
5. **Light is a pass, not decoration.** Each room has an ambient colour per land; light sources (torches, braziers, lava, fire, spells, the player, projectiles, lanterns) add soft discs; the result is multiplied over the room. The "dark room" fog is just a very dark ambient with the player's light.
6. **Life in every idle.** Breathing (±3% over ~0.8 s), walk bob / squash tied to velocity, anticipation before attacks (lean back + grow), recoil on hit, death = shards + puff, spawn-in = grow from 0 with a ring. Eyes look at the player and blink.
7. **Motion is cosmetic.** All cosmetic randomness comes from `U.crand` (never `Math.random`, never the game RNG). Rendering never mutates game state. Everything on a baked sprite is keyed by (type, size, colour, state) and cached with an LRU cap.

## 2. Palette
* Each land has a `theme` {floorA, floorB, wall, wallTop, accent, glow, fog} (registered by the land) plus a v23 **style** (`ED.skin.STYLES[theme.name]`): `pattern` (flagstone, brick, plank, sand, ice, scorch, glass, felt, checker, marble, moss, void…), `ambient` (light-pass colour), `ambience` (particle kind), `liquid`.
* Gameplay colours (always readable on every floor): player blue-white `#bfe0ff`/class colour, hostile damage red-orange `#ff5a4a`, magic cyan `#7fe8ff`, gold `#ffd24a`, heal pink `#ff7aa0`, safe green `#6ee07a`.
* Contrast rule (test): a telegraph / hazard / projectile colour keeps ≥ 3:1 luminance contrast against each land's `floorA` and `floorB`.

## 3. Text
* Body text: Courier New / Menlo monospace (the tests measure 0.6 × px per character). Headings may use the same stack at large sizes. Panel text areas: ≤ 376px of height on the Guide.

## 4. Adding things in the style
* **A foe:** give it `shape`, `color`, `r`; the generic finish does the rest. Add `draw(c, e, t)` only for extras (horns, a lamp, a tail) in absolute coordinates; do not draw your own eyes unless the foe has an unusual face (the finish adds tracking eyes to foes without `draw`). Optional `skinArt` hooks are described in `js/pack_v23.js`.
* **A boss:** `ED.bossDraw[shape]` or a part kind in `ED.partDraw` as before — the boss pipeline inks and shades the whole body and every part together, so draw flat shapes in 2–3 tones.
* **A land:** put `pattern`, `ambient`, `ambience` in `ED.skin.STYLES[<theme name>]` (or in the theme object itself as `skin: {…}`), and give hazards an `under`/`draw` that uses `ED.skin.fx` helpers (hatch, telegraph, glow) so they match.


---

# Final inventory (end of the v22–v28 art phase)

## 5. Where the art lives (files and the seams that reach them)
| File | What it draws | Entry points |
|---|---|---|
| `js/art_core.js` | the **ink pipeline** (`skin.ink`: outline + shade + rim), baked sprite cache (`bake/slot/baked`, LRU), shadows / glows, particle parts (`addPart/burstFx`), the player and the four classes (`CLASS_ART`, `WEAPON_ART`), every foe (`drawFoe`, `foeSprite`, `poseOf`: breathing, walk bob, anticipation, recoil, tracking eyes) and every boss (`drawBoss`: body + parts inked together) | `ED.render.drawEnemy` / `drawPlayer` call `ED.skin.drawEnemy` / `drawPlayer` when POLISH is on |
| `js/art_world.js` | **styles per land** (`skin.STYLES`, a land may carry `theme.skin`), 17 floor patterns (`skin.patterns`), 10 wall styles (`WALLFX`), ambient occlusion, decor scatter (`DECOR`), the **light pass** (`lightPass`, `lightsOf`, `skin.ambientOf`, `skin.extraLights`), animated liquids (`dynTile` + neighbour masks `rt.dynNb`: rounded pools, shore bands) | `ED.render.world` → `skin.world`; `buildTileCache` → `skin.buildTiles` |
| `js/art_scene.js` | props, doors (crack glint via `p.glintMul`), interactables (`skin.interArt`: portal, sigil altar, wanderer, trapdoor), pickups, zones (telegraph / hazard / safe), enemy and player projectiles, swings, fx, ambience particles (12 kinds in `skin.AMBIENCE`), the frame timer behind the **Effects ladder** | `skin.world`, `skin.draw.*` |
| `js/art_ui.js` | panel, button (idle / hover / selected / disabled / nav marker), HUD bar and hearts, low-HP vignette, minimap frame, boss bars and boss card, popups, toasts, menu backdrop, icons (`skin.IC`: coin, bomb, key, lock, skull, chest, stairs, drop, boss key, big skull, mystery), item glyphs, the Effects option, screen flashes | `ED.ui.panel/button`, `ED.icons.draw`, `ED.ui.hudTop` … |
| `js/pack_v22.js` | **GALLERY**: the practice / showcase screen (lands, foes, bosses with a POLISH on/off toggle and an art-contrast readout) | title menu → GALLERY, `ED.gallery.smoke` |
| `js/pack_v2x.js` (v24–v27c) | per-land hazards (`hz.under/draw`), boss shapes (`ED.bossDraw`, 38 `ED.partDraw` kinds, 61 `bossDraw` shapes in all), relic icons | each file's `BD` / `part()` tables |

Rule of the seams: a polished-only change is wrapped in `if (ED.skin.on())` so the classic canvas calls stay identical (`test/render-parity.js` compares the call log with `versions/v22`: 550,002 calls, identical).

## 6. Lands (32 themes: 7 base dungeon themes + 25 world lands)
Colours are the theme's own `floorA / wall / accent / glow` (see the land's pack); the style columns are what the art engine adds. Every telegraph / hazard / projectile colour keeps ≥ 3:1 luminance contrast against floorA/floorB (tested).

| Land (pack) | Floor pattern / wall | Ambient light · ambience | Signature props & hazards |
|---|---|---|---|
| Sunken Crypt, Mossy Ruins, Frozen Halls, Cinder Vaults, Drowned Temple, Obsidian Void, Crimson Cathedral (base) | flagstone·block, moss·block, ice·ice, scorch·brick, brick·block, void·block, marble·brick | each lands' tinted ambient (e.g. `#9ab08a` moss, `#a8c0e0` ice); dust / spores / snow / embers / bubbles / stars | torches, braziers, pits, spikes, lava (cinder), water (temple) |
| Hollow Crypts (v3) | flagstone·brick | `#8c88a4` · dust | tombs, grave dust, restless dead |
| Mirewood (v3) | moss·cave, mud pools | `#8aa27a` · spores | poison spore clouds, mud drag |
| Glacial Spire (v3) | ice·ice | `#a0bcdc` · snow | sliding ice, blizzard shove, pits |
| Cinder Foundry (v3) | scorch·metal, lava | `#b88a68` · embers | lava pools, scalding steam vents |
| Gloam Void (v3) | void·block | `#5a4c78` · stars | slow gravity wells, light falls off |
| Storm Reach (v3) | slate·cave | `#7e90a8` · rain | aimed lightning (yellow telegraph ring) |
| Sunken Ossuary (v17) | brick·brick, water | `#7ea0a2` · bubbles | rising tide floods low ground |
| Clockwork Orrery (v18) | brass·metal | `#c0a870` · motes | falling crushers on the beat, time wells |
| Gilded Vault (v18) | gilded·marble | `#c8b070` · glints | coins that lie, traps, toll doors |
| Thornwood Hollow (v18) | moss·cave | `#7a9c62` · fireflies | creeping briars (fire clears them) |
| Mirror Halls (v18) | glass·marble | `#a8b4cc` · glints | your reflection, glass panes |
| Sky Bridge (v18) | plank·cloud | `#b4c4e0` · clouds | planks that give way, wind |
| Hollow King's Court (v21, hidden) | checker·marble | `#9a7a8a` · dust | heirs, decrees, trapdoor from guardian floors |
| Footlights (v24) | plank·velvet | `#e0c0a0` · glints | drifting spotlight, stage lamps, curtains |
| Roaring Pit (v24) | sand·block | `#e8c898` · dust | crowd favour, thrown bottles, gate |
| Starfall Reach (v24) | starry·block | `#9aa8e0` · stars | meteor circles, craters, stardust |
| Foundered Galleon (v24) | plank·timber | `#a8c4c0` · bubbles | listing deck (`p.forceMul`), rolling kegs, cannon lanes |
| Hushed Archive (v25) | parquet·shelves | `#d8c0a0` · motes | sleeping foes (Zzz), ink, noise rings |
| Ashen Caldera (v25) | scorch·cave, lava | `#c89070` · embers | vents → lava lanes → obsidian pillars |
| Mirage Flats (v25) | sand·block | `#f0d8a8` · sandblow | decoy gold/foes, quicksand, sandstorm |
| Abyssal Bazaar (v25, hidden) | carpet·velvet | `#b0a0d0` · glints | market stalls (pedestals), back alleys, lockdown |
| Gambit Hall (v26) | checker·marble | `#c8c0e0` · dust | board squares that glow then strike |
| Counterweight Keep (v26) | brick·metal | `#c0c4d8` · dust | cage, portcullis, plates, blocks, lever |
| Hollow Rite (v26) | slate·block | `#b098d8` · motes | ritual circle, censers, vigil altar |
| Eclipse Orchard (v26) | moss·timber | `#d8d0b0` · fireflies | 64 s day/night clock (ambient shifts), fruit, rot-bombs |

## 7. Foes and bosses
* **Foes** (138 enemy types with every pack on): every foe is a `shape + color + r` and gets the generic finish (ink, shade, rim, shadow, breathing, blinking eyes). Foes with their own `draw` (horns, lamps, tails…) keep it and are inked on top. Elite traits add a coloured aura + glyph; `ED.skin.tag` draws the trait tag. Telegraphs always use the damage colour (§1.4).
* **Bosses** (57 definitions + 31 MEGAs): `ED.bossDraw[shape]` + part kinds in `ED.partDraw`; parts (`part(kind,pos,draw)`) are inked with the body, so draw flat shapes in 2–3 tones. The 36 land bosses of v27 (12 lands × D1 boss, D3 variant, MEGA) are listed below; their MEGAs have extra phase layers (curtain, comet tail, vault door, …).

| Land | D1 boss | D3 boss | MEGA |
|---|---|---|---|
| Footlights | Lumen (director) | Ser Harlan (knight) | The Grand Curtain |
| Roaring Pit | Brakka (champion) | Ravager (wyrm) | Korax |
| Starfall Reach | Perse (fallingstar) | Polaris (prism) | The Black Comet |
| Foundered Galleon | Captain Tarn | Mate Dray | The Figurehead |
| Hushed Archive | Vellum (archivist) | Foxing (mushroom) | The Unread |
| Ashen Caldera | Calder (ventkeeper) | Basalt (furnace) | The Sleeping Mountain |
| Mirage Flats | Sirocco (sandking) | Fata (knight) | The Endless Dune |
| Abyssal Bazaar | Mercatus (haggler) | Tarif (prism) | The Vault Below |
| Gambit Hall | The Black Rook | Alfil (mushroom) | The Pale Queen |
| Counterweight Keep | The Keeper | Plumb (engine) | The Great Balance |
| Hollow Rite | The Confessor | Brother Thurible (frostwarden) | The Black Altar |
| Eclipse Orchard | The Gardener | Ser Scion (knight) | The Eclipse Tree |

## 8. Screens (every one gets the panel / button / icon finish through the seams in `ui.js` / `menus.js` / `render.js`)
Title · Versions (28 packs fit in two columns) · Guide (pages per pack, ≤ 376 px of text height) · Options (Effects ladder: OFF / LOW / NORMAL, plus an automatic ceiling that only drops) · Controls / rebinding · Collection (bosses, bestiary, items; page buttons x = W−500 / label W−358 / next W−300) · Gallery (lands, foes, bosses; info bar under the last row) · ROUTES screen (25 lands as cards; Sigils tab two rows when more than 7 sigils) · Pause with the ROUTE panel and HUD chips · floor-intro card (land rule ≤ 2 lines; the longest, Counterweight, is 233 characters and fits) · boss card (the longest boss name was checked) · death / victory · shop / market / altar pop-ups · toasts.
All text is monospace (Courier New / Menlo); the floor-intro rule text is the smallest body size. A polished-only size change must stay under `ED.skin.on()` (e.g. the Options label, the Collection pager, the dare banner).

## 9. Effects ladder and performance
* `skin.level()`: **2 NORMAL** = everything (light pass, soft glows, ambience particles, liquid sparkle, full bursts). **1 LOW** = soft lights and glows stay, ambience particles and liquid sparkle go. **0 OFF** = ink + shading only (no light pass, no glows; bursts cut to a third). The automatic ceiling (`skin.auto`) drops one level when a 60-frame average exceeds 15 ms and never rises on its own; `prefers-reduced-motion` starts at LOW.
* Measured in the Browser pane: ≈ 0.4–0.5 ms per frame in normal rooms and in a MEGA fight at every Effects level; sheet bake 8–11 ms once per room.

## 10. How to add something and keep the style
1. **A land**: register the world (`ED.worlds.add`) with a `theme` that carries `skin: {pattern, wall, ambient, ambience, liquid?, decor?}`; pick a pattern from §5 or `skin.registerPattern(name, fn)` / `skin.registerWall(name, fn)`; hazards draw through `g.zoneCircle/zoneLine/zoneRect/zoneCone` (generic telegraph) or `g._zone({kind:'hazard', …})`, and static pieces through `hz.under(c, …)` using `ED.skin.fx` helpers; extra lights go in `ED.skin.extraLights`. Make sure `ED.gallery.smoke` still passes and add a Guide page.
2. **A boss**: `ED.landkit.mk` / `addBoss` + `ED.bossDraw[shape]` + `part(kind,pos,draw)`; keep ≥ 3 tones, no thin 1px detail, no hard-coded red/green pairs.
3. **A screen**: use `UI.panel/button/text`; never draw your own frame colours; test at 800×600.
4. **Checks that must stay green**: `test/render-parity.js` (classic calls identical), P23d (contrast against every land, old and new), P0j (rendering is pure: no `Math.random`, no simulation change) and P23b (every foe, boss, class, weapon and screen draws), P23c (Effects ladder and frame cost), `ED.gallery.smoke`.

## 11. Known limits (not verifiable here)
Real-GPU frame rate on other machines, the *feel* of the new fights and the new lands' balance beyond the bot batteries, colour-vision variants beyond the contrast / shape-cue rules above, and audio (none was added).

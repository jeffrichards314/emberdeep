/* EMBERDEEP — pack_v22.js : v22 "GALLERY" — see and fight anything you have met.
 *
 *  A title-screen GALLERY with four tabs (LANDS · FOES · BOSSES · MINIS): a grid of what the save has discovered (or, with "reveal everything", every entry of the updates that are on),
 *  a CONTACT SHEET that tiles a whole tab on one screen, an INSPECT view (zoom 1x-4x, animation states idle / move / attack / hurt / death, silhouette, lighting, polish on/off, palette swatches)
 *  and a PRACTICE ARENA: a sealed room with the thing you picked, a kit scaled to the floor you chose, retry / back to the gallery.
 *  A practice session is never a run: the whole gallery works on a throw-away copy of the save (ED.save.sandbox), nothing is stored, finishRun is never reached.
 *  It is also the art-review tool of v23 POLISH: a contact sheet shows 40+ foes on one screen.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds;
  const TAU = U.TAU, V = 'v22';

  P.define({
    id: 'v22', name: 'GALLERY', tag: 'see and fight anything', color: '#9ad0ff',
    blurb: 'A GALLERY on the title screen: every land, foe, boss and mini boss you have met (or everything, if you ask) on a contact sheet, an inspect view with zoom, animation states, silhouette and lighting, and a practice arena where you can fight any of it with a kit scaled to the floor you pick. Practice never touches your save.',
  });

  const real = () => ED.save.real();
  const gmeta = () => { const m = real(); let o = m.gallery; if (!o || typeof o !== 'object' || Array.isArray(o)) o = m.gallery = {}; o.reveal = !!o.reveal; if (!['lands', 'foes', 'bosses', 'minis'].includes(o.tab)) o.tab = 'foes'; return o; };
  const noop = function () {};
  const TABS = [{ id: 'lands', name: 'LANDS' }, { id: 'foes', name: 'FOES' }, { id: 'bosses', name: 'BOSSES' }, { id: 'minis', name: 'MINIS' }];

  // ==================================================================== what is in the gallery
  const landLine = (id) => { const L = ED.v20 && ED.v20.LANDS && ED.v20.LANDS[id]; return L || null; };
  function discoveredLand(w) { const r = real().route; if (r && r.discovered && r.discovered[w.id]) return true; return !!(w.spine && real().bestFloor >= W.firstFloor(W.ALL.indexOf(w) >= 0 ? Math.max(0, W.LIST.indexOf(w)) : 0)); }
  /** entries of a tab: {tab, id, name, color, found, sub, def}.  `reveal` shows everything the switched-on updates define. */
  function entries(tab, reveal) {
    const m = real(), out = [];
    if (tab === 'lands') {
      for (const w of W.ALL.filter(P.ok)) out.push({ tab, id: w.id, name: w.name, color: w.color || '#9a9ab8', found: discoveredLand(w), sub: w.hidden || w.secret ? 'hidden' : (w.spine ? 'spine' : 'road'), def: w });
    } else if (tab === 'foes') {
      for (const e of P.values(ED.enemyTypes)) { if (e.id === 'boss') continue; out.push({ tab, id: e.id, name: e.name, color: e.color, found: !!m.seen.enemies[e.id], sub: e.world ? (W.byId[e.world] ? W.byId[e.world].short || W.byId[e.world].name : e.world) : 'floor ' + (D.ENEMY_INTRO[e.id] || '—'), def: e }); }
    } else if (tab === 'bosses') {
      for (const id of ED.bosses.allIds()) { const d = ED.bosses.def(id); if (d) out.push({ tab, id, name: d.name, color: d.color, found: !!(m.unlocked.bosses[id] || m.seen.bosses[id]), sub: d.mega ? 'MEGA' : d.landOnly ? 'land boss' : 'boss', def: d }); }
    } else {
      for (const id of ED.minibosses.ids) { const d = ED.minibosses.def(id); out.push({ tab, id, name: d.name, color: d.color, found: !!m.unlocked.minis[id], sub: 'mini boss', def: d }); }
    }
    return reveal ? out : out.filter(x => x.found);
  }
  const allEntries = (tab) => entries(tab, true);
  const shown = (S, tab) => entries(tab, gmeta().reveal);

  // ==================================================================== the stage: a real (headless) Game that holds one room
  /** a Game that is never drawn by itself and never stepped as a whole: the gallery steps its enemies, zones and hazards by hand (stageStep) and draws it with the real renderer */
  /** run fn on a throw-away copy of the save and put the real one back (nested-safe) */
  function withSandbox(fn) { const had = !!ED.save._real; if (!had) ED.save.sandbox(); try { return fn(); } finally { if (!had) ED.save.unsandbox(); } }
  /** hold a sandbox for as long as an inspect view or a practice session is open */
  function ensureSandbox() { if (!ED.save._real) ED.save.sandbox(); S.sandboxed = true; }
  function release() { if (S.sandboxed) { ED.save.unsandbox(); S.sandboxed = false; } }
  function newStage(g) { const st = ED.createGame(g.canvas, { headless: true }); st.sfx = noop; st.toast = noop; st.stage = true; return st; }
  function stageStep(st) {
    st.frame++; st.frameAll++; st.ts = 1; if (st.shakeAmp > 0) st.shakeAmp *= 0.86; if (st.flash) { st.flash.a *= 0.9; if (st.flash.a < 0.01) st.flash = null; }
    if (st.hitstopT > 0) { st.hitstopT--; st.updateFx(); return; }
    st.updateSwings(); st.updatePProj(); st.updateSpawns(); st.updateEnemies(); st.updateEProj(); st.updateZones(); st.updateBombs(); st.updatePickups(); st.updateFx(); st.updateTimers();
    if (st.rt && st.room) { if (st.room.type === 'boss' || st.room.type === 'miniboss') { if (st.rt.bossSpawned) { /* the boss is alive: nothing else to do */ } } }
    ED.runHooks('tick', st);
    for (const z of st.zones) if (z.dead) z.done = true;
  }
  /** reset a stage room to empty (no foes, shots, zones, pickups), keeping its tiles and hazards */
  function empty(st) { st.enemies.length = 0; st.zones.length = 0; st.eproj.length = 0; st.pproj.length = 0; st.fx.length = 0; st.texts.length = 0; st.spawns.length = 0; st.bombs.length = 0; st.swings.length = 0; st.timers.length = 0; if (st.rt) { st.rt.pickups.length = 0; st.rt.inters.length = 0; } st.pickups = st.rt ? st.rt.pickups : []; st.inters = st.rt ? st.rt.inters : []; st.bossCard = null; st.modal = null; st.dying = null; }
  function parkPlayer(st, S) { const p = st.player; if (!p) return; p.hp = p.maxHp; p.inv = 999; p.dead = false; const a = S.t * 0.012, R = S.kind === 'foe' ? 150 : 230; p.x = U.clamp(480 + Math.cos(a) * R, 70, 890); p.y = U.clamp(272 + Math.sin(a) * R * 0.55, 70, 470); p.vx = p.vy = 0; }

  /** choose where an entry lives: the floor number, the land (route) and the kind of room */
  function placeOf(ent, depth) {
    const o = { floor: 4, land: null, tier: 0 };
    if (ent.tab === 'lands') { const w = ent.def; o.land = w.id; o.tier = Math.max(1, (w.tiers && w.tiers[0]) || 1); o.floor = W.firstFloor(o.tier) + (depth == null ? 1 : depth); }
    else if (ent.tab === 'foes') { const w = ent.def.world && W.byId[ent.def.world]; if (w) { o.land = w.id; o.tier = Math.max(1, (w.tiers && w.tiers[0]) || 1); o.floor = W.firstFloor(o.tier) + 1; } else o.floor = Math.max(3, Math.min(30, ent.def.minFloor || 3)); }
    else if (ent.tab === 'bosses') { const d = ent.def, id = ent.id; o.floor = d.mega ? 5 : 4; for (const lid in (ED.v20 && ED.v20.LANDS) || {}) { const L = ED.v20.LANDS[lid]; if (L.mega === id || L.bosses[1] === id || L.bosses[3] === id) { const w = W.byId[lid]; if (w) { o.land = lid; o.tier = Math.max(1, (w.tiers && w.tiers[0]) || 1); o.floor = W.firstFloor(o.tier) + (L.mega === id ? 4 : L.bosses[1] === id ? 1 : 3); } } } }
    else { o.floor = Math.max(4, Math.min(20, (ent.def.minFloor || 5) + 1)); }
    return o;
  }
  function bossSpec(ent, floor) {
    const d = ent.def, mega = !!d.mega || !!ED.bosses.MEGAS[ent.id], tier = Math.max(1, D.bossTier(floor));
    return { defId: ent.id, partnerId: null, fused: false, tier, floor, mega, name: d.name + ', ' + d.title + (tier > 1 ? ' — Tier ' + ED.bosses.roman(tier) : ''), arena: d.arena || 'arena_round', mods: [], color: d.color };
  }
  function miniSpec(ent, floor) { const d = ent.def, tier = floor >= 20 ? 4 : floor >= 12 ? 3 : floor >= 6 ? 2 : 1; return { defId: ent.id, floor, tier, mods: [], duo: false, adds: false, name: d.name + (tier > 1 ? ' — Tier ' + ED.bosses.roman(tier) : ''), isMini: true }; }

  /** (re)build the stage for an entry; returns the live entity (foe / boss) or null (lands) */
  function build(S, g, ent) {
    const st = S.st || (S.st = newStage(g)), pl = placeOf(ent, S.depth);
    st.startRun('GALLERY', 'knight'); st.scene = 'play'; st.god = true; st.introT = 999; st.sfx = noop; st.toast = noop; st.run.practice = { stage: true };
    if (pl.land) { st.run.route = { [W.tierOf(pl.floor)]: pl.land }; W.use(st.run); }
    ED.debug.jumpFloor(st, pl.floor); st.scene = 'play'; st.god = true; st.introT = 999;
    const fl = st.floor, want = ent.tab === 'bosses' ? 'boss' : ent.tab === 'minis' ? 'miniboss' : 'normal';
    const room = fl.rooms.find(r => r.type === want && r.id !== fl.startId) || fl.rooms[fl.startId];
    ED.debug.goto(st, room, 480, 440); st.god = true;
    empty(st); st.player.x = 480; st.player.y = 440;
    S.floorNum = pl.floor; S.land = pl.land; S.e = null; S.dead = 0; S.home = { x: 480, y: 250 };
    if (ent.tab === 'lands') { st.rt.lockdown = true; st.rt.hzOn = st.rt.hzOn || !!(W.at(pl.floor) && W.at(pl.floor).w.hz); S.home = { x: 480, y: 272 }; }
    spawnIn(S, st, ent, pl);
    return S.e;
  }
  function spawnIn(S, st, ent, pl) {
    pl = pl || placeOf(ent, S.depth); empty(st); S.e = null;
    if (ent.tab === 'foes') {
      const e = st.spawnEnemy(ent.id, S.home.x, S.home.y, { silent: true, elite: !!S.elite, mods: S.elite ? eliteMods(ent) : [] }); S.e = e; e.hold = S.anim !== 'attack';
    } else if (ent.tab === 'bosses' || ent.tab === 'minis') {
      const spec = ent.tab === 'bosses' ? bossSpec(ent, pl.floor) : miniSpec(ent, pl.floor), out = ent.tab === 'bosses' ? ED.bosses.spawn(st, spec) : ED.minibosses.spawn(st, spec);
      const e = S.e = out[0]; e.intro = 1; e.vis = 1; e.x = S.home.x; e.y = S.home.y; if (e.parts) ED.bossRuntime.positionParts(e, st); st.bossCard = null; e.idleT = S.anim === 'attack' ? 20 : 99999;
      st.rt.bossSpawned = true; st.rt.bossStarted = true;
    }
  }
  const eliteMods = (ent) => { const w = ent.def.world && W.byId[ent.def.world]; const L = w ? (w.mods || (w.mod ? [w.mod] : [])) : []; const ok = L.filter(id => ED.mods[id]); return ok.length ? [ok[0]] : (ED.mods.hardened ? ['hardened'] : []); };

  /** per-frame life of the stage: the animation state machine of the inspect view */
  function tickStage(S, g, ent) {
    const st = S.st; if (!st) return; S.t++; parkPlayer(st, S);
    const e = S.e;
    if (e && !e.dead) {
      e.t = (e.t || 0) + 1; if (e.parts) ED.bossRuntime.positionParts(e, st);
      switch (S.anim) {
        case 'idle': e.hold = ent.tab === 'foes'; e.vx = e.vy = 0; if (ent.tab === 'foes') { e.x = S.home.x; e.y = S.home.y; e.face = Math.sin(S.t * 0.015) * 0.9; e.state = null; } else e.idleT = 99999; e.flash = 0; break;
        case 'move': { e.hold = true; const a = S.t * 0.03, R = ent.tab === 'foes' ? 110 : 60; const nx = S.home.x + Math.cos(a) * R, ny = S.home.y + Math.sin(a) * R * 0.5; e.vx = nx - e.x; e.vy = ny - e.y; e.x = nx; e.y = ny; e.face = Math.atan2(e.vy, e.vx); e.step = (e.step || 0) + 0.3; break; }
        case 'attack': e.hold = false; if (ent.tab !== 'foes') e.idleT = Math.min(e.idleT, 40); break;
        case 'hurt': e.hold = ent.tab === 'foes'; if (ent.tab !== 'foes') e.idleT = 99999; if (S.t % 50 === 1) { e.flash = 7; e.kx = (e.kx || 0) - 3; st.burst(e.x, e.y, 6, e.color, 3, 14); st.shake(3); } break;
        case 'death': e.hold = ent.tab === 'foes'; if (ent.tab !== 'foes') e.idleT = 99999; if (S.t - (S.deathAt || 0) > 150) { S.deathAt = S.t; e.noLoot = true; e.hp = 0; if (e.parts) for (const p of e.parts) p.hp = 0; try { st.killEnemy(e); } catch (err) { S.errors = (S.errors || 0) + 1; } } break;
      }
    }
    if (e && e.dead) { S.dead++; if (S.dead > (ent.tab === 'foes' ? 70 : 230)) spawnIn(S, st, ent); } else S.dead = 0;
    stageStep(st);
    if (S.anim === 'attack' && !(S.e && !S.e.dead) && ent.tab !== 'lands') { /* wait for the respawn above */ }
  }

  // ==================================================================== thumbnails (grid and contact sheet)
  /** one cached enemy per foe / boss / mini boss, kept in a quiet stage so a whole tab can be drawn at once */
  function makeSheetEnt(S, g, ent) {
    const key = ent.tab + ':' + ent.id; if (S.cache[key] !== undefined) return S.cache[key];
    let e = null;
    withSandbox(() => {
      try {
        const st = S.sst || (S.sst = (function () { const s = newStage(g); s.startRun('SHEET', 'knight'); s.scene = 'play'; s.god = true; ED.debug.jumpFloor(s, 8); s.scene = 'play'; s.god = true; return s; })());
        if (ent.tab === 'foes') { e = st.spawnEnemy(ent.id, 0, 0, { silent: true }); e.hold = true; }
        else if (ent.tab === 'bosses' || ent.tab === 'minis') { const spec = ent.tab === 'bosses' ? bossSpec(ent, 8) : miniSpec(ent, 8); e = (ent.tab === 'bosses' ? ED.bosses.spawn(st, spec) : ED.minibosses.spawn(st, spec))[0]; e.intro = 0; e.vis = 1; e.invuln = false; e.hold = true; }
        st.enemies.length = 0; st.bossCard = null;
      } catch (err) { S.errors = (S.errors || 0) + 1; e = null; }
    });
    return (S.cache[key] = e);
  }
  const sheetEnt = (S, g, ent) => S.cache[ent.tab + ':' + ent.id];          // (drawing only looks things up: the update step builds them, so a frame never runs game code that could touch a random stream)
  const extentOf = (e) => { let m = e.r * (e.boss ? 1.25 : 1.15); if (e.parts) for (const p of e.parts) m = Math.max(m, Math.min(e.r * 2.2, Math.hypot(p.x - e.x, p.y - e.y)) + p.r * 0.8); return Math.max(8, Math.min(m, e.r * 3)); };
  function drawEntThumb(S, g, c, ent, cx, cy, box) {
    const e = sheetEnt(S, g, ent); if (!e) { UI().text(c, e === null ? '?' : '…', cx, cy + 4, 12, '#5a5a78', 'center', false); return; }
    const st = S.sst, x0 = e.x, y0 = e.y; e.x = 0; e.y = 0; e.t = S.t; e.face = Math.sin(S.t * 0.02 + ent.id.length) * 0.7; e.vis = 1;
    if (e.parts) ED.bossRuntime.positionParts(e, st);
    const ext = extentOf(e), sc = Math.min(3, box / (2 * ext));
    c.save(); c.translate(cx, cy); c.scale(sc, sc); st.frameAll = S.t;
    try { ED.render.drawEnemy(st, c, e, S.t); } catch (err) { S.errors = (S.errors || 0) + 1; }
    c.restore(); e.x = x0; e.y = y0;
  }
  /** a land's room as a small picture: the tile layer of a generated room painted with that land's theme */
  function makeLandThumb(S, w) {
    if (S.land[w.id] !== undefined) return S.land[w.id];
    let cv = null;
    withSandbox(() => {
      try {
        const keep = W.run(), tier = Math.max(1, (w.tiers && w.tiers[0]) || 1), run = { route: { [tier]: w.id }, seed: 'THUMB' }; W.use(run);
        const f = ED.gen.generate(W.firstFloor(tier) + 1, 'THUMB'), room = f.rooms.find(r => r.type === 'normal') || f.rooms[f.startId];
        room.rt = { dirty: true }; room.type = 'normal'; room.bossDef = null; ED.render.buildTileCache({ theme: f.theme, floor: f }, room); cv = room.cache; W.use(keep);
      } catch (err) { S.errors = (S.errors || 0) + 1; }
    });
    return (S.land[w.id] = cv);
  }
  const landThumb = (S, w) => S.land[w.id];
  /** called from update(): build what the visible page needs (a few per frame) */
  function prepare(g) {
    const tab = tabNow(), list = shown(S, tab), { items } = pageOf(list); let n = 0;
    for (const ent of items) { if (n >= 6) break; if (tab === 'lands') { if (S.land[ent.def.id] === undefined) { makeLandThumb(S, ent.def); n++; } } else if (S.cache[ent.tab + ':' + ent.id] === undefined) { makeSheetEnt(S, g, ent); n++; } }
  }

  // ==================================================================== the scene
  const S = { mode: 'grid', page: 0, sheet: false, sel: null, kind: 'foe', t: 0, zoom: 2, anim: 'idle', sil: false, light: true, polish: 'auto', depth: 1, elite: false, cache: {}, land: {}, st: null, e: null, cam: { x: 480, y: 272 }, cls: 'knight', floor: 5, count: 3, god: false, errors: 0, sandboxed: false, ent: null, setup: null };
  const open = (g) => { S.cache = {}; S.land = {}; S.sst = null; S.st = null; S.t = 0; };
  const close = (g) => { release(); S.st = null; S.sst = null; S.cache = {}; S.land = {}; S.e = null; S.mode = 'grid'; ED.skin && ED.skin.flags && (ED.skin.flags.preview = null); };
  const tabNow = () => gmeta().tab;
  const kindOf = (tab) => tab === 'lands' ? 'land' : tab === 'foes' ? 'foe' : tab === 'bosses' ? 'boss' : 'mini';
  const flagsOn = (fn) => { const f = ED.skin && ED.skin.flags; if (!f) return fn(); const keep = { light: f.light, polish: f.polish, preview: f.preview }; f.light = S.light; f.polish = S.polish === 'on' ? true : S.polish === 'off' ? false : null; f.preview = true; try { return fn(); } finally { f.light = keep.light; f.polish = keep.polish; f.preview = keep.preview; } };

  const PER = { grid: { cols: 10, cw: 88, ch: 72, box: 46, rows: 6 }, sheet: { cols: 16, cw: 55, ch: 62, box: 36, rows: 7 } }, PERL = { grid: { cols: 5, cw: 176, ch: 110, box: 46, rows: 4 }, sheet: { cols: 7, cw: 125, ch: 84, box: 36, rows: 5 } };
  function pageOf(list) { const L = (tabNow() === 'lands' ? PERL : PER)[S.sheet ? 'sheet' : 'grid'], rows = L.rows, per = L.cols * rows, pages = Math.max(1, Math.ceil(list.length / per)); S.page = U.clamp(S.page | 0, 0, pages - 1); return { L, per, pages, items: list.slice(S.page * per, (S.page + 1) * per) }; }

  const UI = () => ED.ui;
  function drawGrid(g, c) {
    const u = UI(), m = ED.input.mouse, tab = tabNow(), list = shown(S, tab), { L, pages, items } = pageOf(list), x0 = (C.W - L.cols * L.cw) / 2, y0 = 96;
    const total = allEntries(tab).length, found = allEntries(tab).filter(x => x.found).length;
    let hov = null;
    items.forEach((ent, i) => {
      const x = x0 + (i % L.cols) * L.cw, y = y0 + Math.floor(i / L.cols) * L.ch, cx = x + L.cw / 2, cy = y + (S.sheet ? 24 : 28);
      u.button(c, 'ent:' + ent.id, '', x + 1, y, L.cw - 2, L.ch - 4, { color: ent.color, size: 10 });
      c.fillStyle = ent.found ? U.rgba(ent.color, 0.1) : 'rgba(0,0,0,0.3)'; c.fillRect(x + 3, y + 2, L.cw - 6, L.ch - 8);
      const landTab = tab === 'lands', clipH = landTab ? L.ch - 24 : (S.sheet ? 44 : 50), okk = ent.found || gmeta().reveal;
      c.save(); c.beginPath(); c.rect(x + 3, y + 2, L.cw - 6, clipH); c.clip();
      if (landTab) { const cv = landThumb(S, ent.def); if (cv) { const k = Math.min((L.cw - 8) / 960, (clipH - 2) / 544); c.globalAlpha = okk ? 1 : 0.3; c.drawImage(cv, x + 4, y + 3, 960 * k, 544 * k); } }
      else { c.globalAlpha = okk ? 1 : 0.5; drawEntThumb(S, g, c, ent, cx, y + 2 + clipH / 2, L.box); }
      c.restore();
      const nm = ent.found || gmeta().reveal ? ent.name : '???', max = Math.floor((L.cw - 4) / (S.sheet ? 3.9 : landTab ? 6.4 : 5.2));
      u.text(c, nm.length > max ? nm.slice(0, max - 1) + '…' : nm, cx, y + L.ch - (S.sheet ? 14 : 16), S.sheet ? 7 : landTab ? 11 : 9, okk ? '#e8e8f8' : '#8a8aa0', 'center', false);
      if (!S.sheet) u.text(c, ent.sub.length > 16 ? ent.sub.slice(0, 15) + '…' : ent.sub, cx, y + L.ch - 6, 8, okk ? '#9a9ab8' : '#6a6a80', 'center', false);
      if (u.navSel === 'ent:' + ent.id || (m.x >= x && m.x <= x + L.cw && m.y >= y && m.y <= y + L.ch)) hov = ent;
    });
    if (!items.length) u.text(c, tab === 'lands' ? 'No land found yet. Turn on "reveal everything" to see them all.' : 'Nothing here yet — meet one in a run, or turn on "reveal everything".', C.W / 2, 300, 14, '#8a8aa8', 'center', false);
    if (pages > 1) { u.button(c, 'pg:prev', '◂ Prev', 40, 600, 90, 28, { size: 12, disabled: S.page === 0 }); u.text(c, 'page ' + (S.page + 1) + ' / ' + pages, 190, 619, 12, '#a8a8c8', 'center', false); u.button(c, 'pg:next', 'Next ▸', 250, 600, 90, 28, { size: 12, disabled: S.page >= pages - 1 }); }
    u.text(c, found + ' / ' + total + ' discovered' + (gmeta().reveal ? '  ·  showing everything' : ''), 360, 619, ED.skin.on() ? 14 : 12, '#ffd24a', 'left');
    if (hov) { u.panel(c, 40, 548, 880, 44, hov.color, 0.94); u.text(c, (hov.found || gmeta().reveal ? hov.name : '???'), 54, 568, 14, hov.color); const d = hov.def, desc = hov.tab === 'foes' ? d.desc : hov.tab === 'lands' ? d.rule : (d.title || '') + (d.teaches ? ' — ' + d.teaches : ''); if (hov.found || gmeta().reveal) u.wrap(c, desc || '', 54, 584, 850, 13, 10, '#d8d8ee'); else u.text(c, 'Not met yet.', 54, 584, 11, '#8a8aa8', 'left', false); }
  }

  const ANIMS = [['idle', 'IDLE'], ['move', 'MOVE'], ['attack', 'ATTACK'], ['hurt', 'HURT'], ['death', 'DEATH']];
  const ZOOMS = [1, 2, 3, 4];
  function drawInspect(g, c) {
    const u = UI(), ent = S.ent, SX = 40, SY = 96, SW = 580, SH = 430, st = S.st, tab = ent.tab, kind = kindOf(tab);
    u.panel(c, SX - 4, SY - 4, SW + 8, SH + 8, ent.color, 0.9);
    c.save(); c.beginPath(); c.rect(SX, SY, SW, SH); c.clip();
    if (S.sil && (tab === 'foes' || tab === 'bosses' || tab === 'minis') && S.e) {
      c.fillStyle = '#d8d8e4'; c.fillRect(SX, SY, SW, SH);
      if (!S.silCv) { S.silCv = document.createElement('canvas'); S.silCv.width = SW; S.silCv.height = SH; }
      const d = S.silCv.getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, SW, SH);
      const base = tab === 'foes' ? 1.6 : 0.62, sc = base * S.zoom / (tab === 'foes' ? 1 : 1);
      d.save(); d.translate(SW / 2, SH / 2); d.scale(sc, sc); d.translate(-S.cam.x, -S.cam.y);
      flagsOn(() => { try { ED.render.drawEnemy(st, d, S.e, st.frameAll); } catch (err) { S.errors++; } }); d.restore();
      d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-in'; d.fillStyle = '#10101c'; d.fillRect(0, 0, SW, SH); d.globalCompositeOperation = 'source-over';
      c.drawImage(S.silCv, SX, SY);
    } else {
      const base = tab === 'foes' ? 1.6 : tab === 'lands' ? 0.6 : 0.6, sc = base * (tab === 'lands' ? 1 + (S.zoom - 1) * 0.5 : S.zoom);
      c.translate(SX + SW / 2, SY + SH / 2); c.scale(sc, sc); c.translate(-S.cam.x, -S.cam.y - C.HUD);
      flagsOn(() => { try { ED.render.world(st, c); } catch (err) { S.errors++; } });
    }
    c.restore();
    // the right-hand panel
    const px = 636, pw = 284; u.panel(c, px, SY - 4, pw, SH + 8, ent.color, 0.92);
    const d = ent.def; u.shadow(c, ent.name.length > 22 ? ent.name.slice(0, 21) + '…' : ent.name, px + 12, SY + 22, ent.name.length > 18 ? 15 : 18, ent.color);
    const sub = tab === 'foes' ? (d.world && W.byId[d.world] ? (W.byId[d.world].short || W.byId[d.world].name) + ' · ' : '') + d.shape + ' · ' + (d.pack || 'v1') : tab === 'lands' ? 'land · ' + (d.pack || 'v1') + ' · risk ' + (d.risk | 0) : (d.title || '') + ' · ' + (d.pack || 'v1');
    u.text(c, sub.length > 40 ? sub.slice(0, 39) + '…' : sub, px + 12, SY + 40, 10, '#9a9ab8', 'left', false);
    const found = ent.found || gmeta().reveal;
    const desc = tab === 'foes' ? d.desc : tab === 'lands' ? d.rule : (d.teaches || d.title || '');
    let y = u.wrap(c, found ? (desc || '') : 'Not met yet.', px + 12, SY + 60, pw - 24, 13, 10, '#d8d8ee') + 4;
    if (tab === 'foes') { u.text(c, 'HP ' + d.hp + '   SPD ' + d.speed + '   DMG ' + (d.dmg || 0) + (d.minFloor ? '   from floor ' + d.minFloor : ''), px + 12, y + 8, 10, '#c8c8e0', 'left', false); y += 18; }
    else if (tab === 'lands') { const fo = (d.enemies || []).filter(id => ED.enemyTypes[id]); u.text(c, 'Foes: ' + fo.map(id => ED.enemyTypes[id].name).join(', '), px + 12, y + 8, 9, '#ffd24a', 'left', false); y += 16; if (ED.route && real().route && real().route.discovered && real().route.discovered[d.id] && ED.route.gateOf) { const gt = ED.route.gateOf(d); if (gt) { u.text(c, 'Door: ' + (ED.route.KINDS[gt.kind] ? ED.route.KINDS[gt.kind].name : gt.kind), px + 12, y + 8, 9, '#9ad0ff', 'left', false); y += 14; } } }
    // controls
    let cy = Math.max(y + 8, SY + 150);
    u.text(c, 'ZOOM', px + 12, cy + 12, 10, '#8a8aa8', 'left', false);
    ZOOMS.forEach((z, i) => u.button(c, 'zoom:' + z, z + '×', px + 56 + i * 54, cy, 50, 20, { size: 11, selected: S.zoom === z, color: '#9ad0ff' })); cy += 28;
    if (tab !== 'lands') { u.text(c, 'STATE', px + 12, cy + 12, 10, '#8a8aa8', 'left', false); ANIMS.forEach(([id, lab], i) => u.button(c, 'anim:' + id, lab, px + 56 + (i % 3) * 74, cy + Math.floor(i / 3) * 24, 70, 20, { size: 10, selected: S.anim === id, color: '#9ad0ff' })); cy += 56; }
    else { u.text(c, 'DEPTH', px + 12, cy + 12, 10, '#8a8aa8', 'left', false); for (let k = 0; k < 5; k++) u.button(c, 'depth:' + k, String(k + 1), px + 56 + k * 44, cy, 40, 20, { size: 11, selected: S.depth === k, color: '#9ad0ff' }); cy += 28; }
    u.button(c, 'sil', 'SILHOUETTE ' + (S.sil ? 'ON' : 'off'), px + 12, cy, 128, 22, { size: 10, selected: S.sil, disabled: tab === 'lands' });
    u.button(c, 'light', 'LIGHTING ' + (S.light ? 'ON' : 'off'), px + 146, cy, 126, 22, { size: 10, selected: S.light }); cy += 28;
    u.button(c, 'polish', 'POLISH: ' + S.polish.toUpperCase(), px + 12, cy, 128, 22, { size: 10, selected: S.polish === 'on', disabled: !P.on('v23') });
    if (tab === 'foes') u.button(c, 'elite', 'ELITE ' + (S.elite ? 'ON' : 'off'), px + 146, cy, 126, 22, { size: 10, selected: S.elite }); else if (tab === 'lands') u.button(c, 'depthfoes', 'LAND FOES ▸', px + 146, cy, 126, 22, { size: 10 });
    cy += 30;
    // palette
    u.text(c, 'PALETTE', px + 12, cy + 10, 10, '#8a8aa8', 'left', false); const pal = paletteOf(ent); pal.forEach((col, i) => { c.fillStyle = col; c.fillRect(px + 72 + i * 26, cy, 22, 14); c.strokeStyle = '#000'; c.lineWidth = 1; c.strokeRect(px + 72.5 + i * 26, cy + 0.5, 21, 13); });
    u.button(c, 'practice', 'PRACTICE  ▸', px + 12, SY + SH - 58, pw - 24, 34, { size: 15, color: '#6ee07a' });
    // footer
    u.button(c, 'prev', '◂ Prev', 40, 540, 90, 28, { size: 12 }); u.button(c, 'next', 'Next ▸', 136, 540, 90, 28, { size: 12 }); u.button(c, 'tolist', 'Back to list', 232, 540, 130, 28, { size: 12 });
    const list = shown(S, tab), idx = list.findIndex(x => x.id === ent.id); u.text(c, (idx + 1) + ' / ' + list.length, 380, 559, 11, '#a8a8c8', 'left', false);
  }
  function paletteOf(ent) {
    const d = ent.def; if (ent.tab === 'lands') { const t = d.theme || {}; return [t.floorA, t.floorB, t.wall, t.wallTop, t.accent, t.glow, d.color].filter(Boolean).slice(0, 8); }
    const col = d.color || '#888'; return [col, U.mix(col, '#000000', 0.5), U.mix(col, '#ffffff', 0.4), U.mix(col, '#000000', 0.75), d.accent || '#ffffff'].map(x => x.indexOf('rgb') === 0 ? rgbHex(x) : x);
  }
  function rgbHex(s) { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(s); if (!m) return '#888888'; return '#' + [1, 2, 3].map(i => (+m[i]).toString(16).padStart(2, '0')).join(''); }

  // ---- practice setup
  function drawSetup(g, c) {
    const u = UI(), ent = S.ent, tab = ent.tab, sp = S.setup, x = 190, y = 110, w = 580, h = 400;
    u.panel(c, x, y, w, h, ent.color, 0.95);
    u.shadow(c, 'PRACTICE', x + 24, y + 38, 26, '#6ee07a'); u.text(c, ent.name, x + 24, y + 62, 15, ent.color);
    u.wrap(c, 'A sealed room, a kit scaled to the floor you choose. It is never a run: nothing is recorded, nothing is unlocked, nothing is saved.', x + 24, y + 84, w - 48, 14, 11, '#a8a8c8');
    const row = (i, label, value, a1, a2, extra) => { const yy = y + 128 + i * 40; u.text(c, label, x + 24, yy + 18, 13, '#cfd0e0'); u.button(c, a1, '◂', x + 200, yy, 36, 28, { size: 14 }); u.text(c, value, x + 300, yy + 19, 14, '#ffd24a', 'center'); u.button(c, a2, '▸', x + 364, yy, 36, 28, { size: 14 }); if (extra) u.text(c, extra, x + 416, yy + 18, 10, '#8a8aa8', 'left', false); };
    const cl = I.classList(), cur = I.CLASSES[sp.cls] || I.CLASSES.knight;
    row(0, 'Class', cur.name, 'cls:-', 'cls:+', '');
    row(1, tab === 'lands' ? 'Depth in the land' : 'Floor', tab === 'lands' ? String(sp.depth + 1) : String(sp.floor), 'floor:-', 'floor:+', tab === 'lands' ? 'floors 1-5 of the land; 2 and 4 hold its guardians' : 'tougher foes, better kit');
    if (tab === 'foes') row(2, 'How many', String(sp.count), 'count:-', 'count:+', 'one wave, all at once');
    u.button(c, 'god', 'GOD MODE: ' + (sp.god ? 'ON' : 'off'), x + 24, y + (tab === 'foes' ? 262 : 222), 200, 30, { size: 12, selected: sp.god, color: '#ffd24a' });
    if (tab === 'foes') u.button(c, 'pelite', 'ELITE: ' + (sp.elite ? 'ON' : 'off'), x + 240, y + 262, 160, 30, { size: 12, selected: sp.elite, color: '#ff9a6a' });
    u.button(c, 'go', 'ENTER THE ARENA', x + 24, y + h - 70, w - 48, 40, { size: 17, color: '#6ee07a' });
    u.button(c, 'tosetupback', 'Cancel', x + w - 124, y + 24, 100, 26, { size: 11 });
  }

  ED.sceneImpl.gallery = {
    draw(g, c) {
      const u = UI(); S.t++;
      const meta = gmeta(), tab = meta.tab, sk = ED.skin.on() && ED.skin.kit;               // (polished: bigger controls, Back in the corner every screen has it)
      u.shadow(c, 'GALLERY', C.W / 2, 40, 30, '#9ad0ff', 'center');
      if (S.mode === 'inspect' && S.ent) drawInspect(g, c);
      else if (S.mode === 'setup' && S.ent) { drawInspect(g, c); c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, C.W, C.H); drawSetup(g, c); return; }
      else {
        TABS.forEach((t2, i) => u.button(c, 'tab:' + t2.id, t2.name, 40 + i * (sk ? 108 : 104), 54, sk ? 104 : 100, sk ? 34 : 28, { size: sk ? 15 : 13, selected: tab === t2.id, color: '#9ad0ff' }));
        u.button(c, 'reveal', 'Reveal all: ' + (meta.reveal ? 'ON' : 'off'), sk ? 500 : 480, 54, sk ? 200 : 170, sk ? 34 : 28, { size: sk ? 14 : 11, selected: meta.reveal, color: '#ffd24a' });
        u.button(c, 'sheet', S.sheet ? 'Grid' : 'Contact sheet', sk ? 712 : 658, 54, sk ? 208 : 150, sk ? 34 : 28, { size: sk ? 14 : 11, selected: S.sheet });
        drawGrid(g, c);
      }
      if (sk) u.button(c, 'back', S.mode === 'grid' ? '‹  Back' : '‹  Close', 24, 4, 116, 38, { size: 15, ghost: true }); else u.button(c, 'back', 'Back', C.W - 140, 604, 100, 28, { size: 13 });
      if (S.errors) u.text(c, S.errors + ' drawing error(s)', 20, 14, 9, '#ff6a6a', 'left', false);
    },
    update(g, a, inp) {
      const meta = gmeta();
      if (S.mode === 'inspect' || S.mode === 'setup') { if (S.st && S.ent) { try { tickStage(S, g, S.ent); } catch (err) { S.errors++; if (S.errors > 50) { S.mode = 'grid'; } } const e = S.e; if (e) { const k = S.ent.tab === 'foes' ? 0.18 : 0.08; S.cam.x += ((S.ent.tab === 'foes' ? e.x : 480) - S.cam.x) * k; S.cam.y += ((S.ent.tab === 'foes' ? e.y : 272) - S.cam.y) * k; } else { S.cam.x = 480; S.cam.y = 272; } } }
      if (S.mode === 'setup') { setupUpdate(g, a, inp); return; }
      if (S.mode === 'grid') prepare(g);
      if (a === 'back' || inp.consume('back')) {
        if (S.mode === 'inspect') { S.mode = 'grid'; S.st = null; release(); g.sfx('uiback'); return; }
        close(g); ED.menus.go(g, 'title'); return;
      }
      if (S.mode === 'inspect') { inspectUpdate(g, a, inp); return; }
      if (!a) return;
      if (a.indexOf('tab:') === 0) { meta.tab = a.slice(4); S.page = 0; ED.save.saveReal(); g.sfx('ui'); }
      else if (a === 'reveal') { meta.reveal = !meta.reveal; S.page = 0; ED.save.saveReal(); g.sfx('ui'); }
      else if (a === 'sheet') { S.sheet = !S.sheet; S.page = 0; g.sfx('ui'); }
      else if (a === 'pg:prev') S.page = Math.max(0, S.page - 1); else if (a === 'pg:next') S.page++;
      else if (a.indexOf('ent:') === 0) { const ent = allEntries(meta.tab).find(x => x.id === a.slice(4)); if (ent && (ent.found || meta.reveal)) inspect(g, ent); else g.toast('You have not met that yet — "reveal all" shows everything.', '#9ad0ff', 120); }
    },
  };
  function inspect(g, ent) {
    ensureSandbox(); S.ent = ent; S.mode = 'inspect'; S.zoom = ent.tab === 'lands' ? 1 : ent.tab === 'foes' ? 3 : 1; S.anim = 'idle'; S.sil = false; S.t = 0; S.depth = 1; S.dead = 0; S.deathAt = 0; S.cam = { x: 480, y: 272 }; S.silCv = null;
    try { build(S, g, ent); } catch (err) { S.errors++; S.mode = 'grid'; if (typeof console !== 'undefined') console.error('[gallery] could not build', ent.id, err); }
    g.sfx('ui');
  }
  function inspectUpdate(g, a, inp) {
    const ent = S.ent, list = shown(S, ent.tab), idx = list.findIndex(x => x.id === ent.id);
    if (inp.consume('right') && list.length) a = 'next'; else if (inp.consume('left') && list.length) a = 'prev';
    if (!a) return;
    if (a === 'next' || a === 'prev') { const n = list[(idx + (a === 'next' ? 1 : list.length - 1)) % list.length]; if (n) inspect(g, n); }
    else if (a === 'tolist') { S.mode = 'grid'; S.st = null; release(); }
    else if (a.indexOf('zoom:') === 0) S.zoom = +a.slice(5);
    else if (a.indexOf('anim:') === 0) { S.anim = a.slice(5); S.t = 0; S.deathAt = 0; if (S.e && !S.e.dead) { S.e.hold = S.anim !== 'attack' && ent.tab === 'foes'; if (S.anim === 'attack' || S.anim === 'idle') { S.e.x = S.home.x; S.e.y = S.home.y; } } if (S.e && S.e.dead) spawnIn(S, S.st, ent); }
    else if (a === 'sil') S.sil = !S.sil; else if (a === 'light') S.light = !S.light;
    else if (a === 'polish') S.polish = S.polish === 'auto' ? 'on' : S.polish === 'on' ? 'off' : 'auto';
    else if (a === 'elite') { S.elite = !S.elite; spawnIn(S, S.st, ent); }
    else if (a.indexOf('depth:') === 0) { S.depth = +a.slice(6); try { build(S, g, ent); } catch (err) { S.errors++; } }
    else if (a === 'depthfoes') { const d = ent.def, fo = (d.enemies || []).filter(id => ED.enemyTypes[id] && P.ok(ED.enemyTypes[id])); if (fo.length) { const e2 = allEntries('foes').find(x => x.id === fo[0]); if (e2) { meta_set_tab('foes'); inspect(g, e2); } } }
    else if (a === 'practice') { S.setup = { cls: S.cls, floor: Math.max(1, S.floorNum || 4), depth: 1, count: 3, god: false, elite: false }; if (ent.tab === 'foes') S.setup.floor = Math.max(1, S.floorNum || 4); S.mode = 'setup'; g.sfx('ui'); }
  }
  const meta_set_tab = (t) => { gmeta().tab = t; };
  function setupUpdate(g, a, inp) {
    const sp = S.setup, ent = S.ent, cl = I.classList().map(x => x.id);
    if (a === 'tosetupback' || inp.consume('back')) { S.mode = 'inspect'; return; }
    if (!a) return;
    if (a === 'cls:-' || a === 'cls:+') { const i = cl.indexOf(sp.cls); sp.cls = cl[(i + (a === 'cls:+' ? 1 : cl.length - 1)) % cl.length]; S.cls = sp.cls; }
    else if (a === 'floor:-') { if (ent.tab === 'lands') sp.depth = Math.max(0, sp.depth - 1); else sp.floor = Math.max(1, sp.floor - 1); } else if (a === 'floor:+') { if (ent.tab === 'lands') sp.depth = Math.min(4, sp.depth + 1); else sp.floor = Math.min(99, sp.floor + 1); }
    else if (a === 'count:-') sp.count = Math.max(1, sp.count - 1); else if (a === 'count:+') sp.count = Math.min(8, sp.count + 1);
    else if (a === 'god') sp.god = !sp.god; else if (a === 'pelite') sp.elite = !sp.elite;
    else if (a === 'go') {
      const spec = { kind: ent.tab, id: ent.id, name: ent.name, color: ent.color, cls: sp.cls, floor: sp.floor, depth: sp.depth, count: sp.count, god: sp.god, elite: sp.elite };
      S.st = null; S.mode = 'inspect'; ED.practice.begin(g, spec, ent);
    }
  }

  // ==================================================================== the practice arena
  /** a kit that suits a floor (the same recipe the tests give their bots: relics, a rare/epic weapon, three armour pieces, hearts) */
  function kit(g, F) {
    const p = g.player, rng = new ED.RNG('practice:kit:' + F), target = 2 + Math.min(F * 1.1, 22); let n = 0;
    while (Object.keys(p.relics).reduce((s, k) => s + p.relics[k], 0) < target && n++ < 80) g.equipItem(I.rollRelic(rng, F, { relics: p.relics, noRisk: true, minRank: 0 }), true);
    p.weapon = I.rollWeapon(rng, F, { type: p.weapon && p.weapon.type, rarity: F >= 12 ? 'epic' : F >= 4 ? 'rare' : 'uncommon' });
    for (const s of ['helmet', 'chest', 'boots']) p.armor[s] = I.rollArmor(rng, F, { slot: s, rarity: F >= 8 ? 'epic' : F >= 3 ? 'rare' : 'uncommon' });
    p.bonusHp = 4 * Math.min(14, Math.floor(F / 2)); p.bombs = 6; p.gold = 120; I.recalc(p); p.hp = p.maxHp;
  }
  const PR = ED.practice = {
    active: (g) => !!(g && g.run && g.run.practice && !g.run.practice.stage),
    kit,
    /** start (or restart) a practice session on the main game object; `ent` is the gallery entry */
    begin(g, spec, ent) {
      ent = ent || allEntries(spec.kind).find(x => x.id === spec.id);
      ensureSandbox(); ED.input.sim = ED.input.sim || { held: {}, edge: {} };
      const m = ED.save.meta; if (m.trials) m.trials.mode = 'normal'; m.settings = m.settings || {}; m.settings.assist = 0;
      g.startRun('PRACTICE', spec.cls || 'knight');
      const run = g.run; run.practice = spec; run.milestoneShown = true; run.talentPending = 0;
      const pl = placeOf(ent, spec.depth);
      let F = spec.kind === 'lands' ? W.firstFloor(pl.tier || 1) + (spec.depth | 0) : (spec.floor || pl.floor);
      if (pl.land && spec.kind !== 'lands') { /* a land's own foe / boss: its land, at the chosen floor or the land's first tier */ }
      const landId = pl.land; if (landId) { run.route = run.route || {}; run.route[W.tierOf(F)] = landId; W.use(run); }
      spec.floorNum = F; g.god = !!spec.god; kit(g, F);
      ED.debug.jumpFloor(g, F); g.scene = 'play'; g.introT = 999; g.god = !!spec.god; g.toasts.length = 0;
      const fl = g.floor; fl.dareRooms = {}; fl.hunt = {};
      if (spec.kind === 'lands') { g.toast('PRACTICE — ' + ent.name + ', floor ' + (F), '#6ee07a', 200); return; }
      const want = spec.kind === 'bosses' ? 'boss' : spec.kind === 'minis' ? 'miniboss' : 'normal';
      const room = fl.rooms.find(r => r.type === want && r.id !== fl.startId && !r.puzzle) || fl.rooms.find(r => r.type === want) || fl.rooms[fl.startId];
      ED.debug.goto(g, room, 480, 440); g.god = !!spec.god; g.toasts.length = 0;
      if (spec.kind === 'bosses') g.rt.bossSpec = bossSpec(ent, F); else if (spec.kind === 'minis') g.rt.bossSpec = miniSpec(ent, F);
      else {
        const rt = g.rt, n = spec.count || 3, mods = spec.elite ? eliteMods(ent) : [], wave = []; for (let i = 0; i < n; i++) wave.push({ type: ent.id, elite: !!spec.elite, mods: mods.slice() });
        rt.enc = { state: 'warm', waves: [wave], idx: 0, t: 0 }; room.cleared = false; rt.cleared = false; room.holds = []; rt.keyChests = [];
      }
      g.toast('PRACTICE — ' + ent.name, '#6ee07a', 200);
    },
    /** the session ended (death, clear, abandon): show the choice instead of the run-end screen; nothing is recorded */
    over(g, victory) {
      g.dying = null; g.player.dead = false; g.player.hp = Math.max(1, g.player.hp); g.scene = 'play';
      g.modal = { type: 'practice_over', won: !!victory || !!g.run.practiceWon };
    },
    leave(g) {
      const had = g.run; g.modal = null; g.dying = null; g.scene = 'gallery'; ED.ui.navSel = null; ED.ui.action = null;
      if (g.freeFloor) g.freeFloor(); g.run = null; g.floor = null; g.room = null; g.rt = null; g.player = null; S.mode = 'inspect'; S.st = null; S.e = null; S.sandboxed = true;
      try { if (S.ent) build(S, g, S.ent); } catch (err) { S.errors++; S.mode = 'grid'; }
      ED.audio && ED.audio.music.set({ intensity: 0.1, boss: false });
    },
  };
  // a practice fight ends when its room is cleared (a boss: after its rewards appear)
  ED.hook('roomClear', V, (g, room) => {
    const run = g.run, sp = run && run.practice; if (!sp || sp.stage || sp.kind === 'lands') return;
    if (g.rt && g.rt.enc && sp.kind === 'foes' || room.type === 'boss' || room.type === 'miniboss') { run.practiceWon = true; g.after(room.type === 'normal' ? 70 : 170, () => { if (g.run === run && !g.modal) { g.modal = { type: 'practice_over', won: true }; } }); }
  });
  // practice never opens the dialogs a real run opens after a boss (milestone, talent, ending...): they would record or branch
  ED.hook('tick', V, (g) => {
    const run = g.run, sp = run && run.practice; if (!sp || sp.stage) return;
    run.talentPending = 0; run.milestoneShown = true; if (g.popups.length) g.popups.length = 0;          // feats and unlocks earned in a sandbox are not shown: they would not be kept
    if (g.modal && g.modal.type !== 'practice_over' && g.modal.type !== 'sacrifice' && g.modal.type !== 'route_cost' && g.modal.type !== 'choice' && ED.modalImpl[g.modal.type] && /^(milestone|talent|ending|abyss|victory)/.test(g.modal.type)) { g.modal = null; }
  });
  ED.modalImpl.practice_over = {
    draw(g, c, m) {
      const u = UI(), sp = g.run.practice, w = 460, h = 250, x = (C.W - w) / 2, y = 170;
      u.panel(c, x, y, w, h, m.won ? '#6ee07a' : '#ff6a6a', 0.97);
      u.shadow(c, m.won ? 'CLEARED' : 'DOWN', C.W / 2, y + 46, 30, m.won ? '#6ee07a' : '#ff6a6a', 'center');
      u.text(c, 'Practice · ' + (sp.name || '') + ' · floor ' + (sp.floorNum || sp.floor), C.W / 2, y + 72, 14, '#a8a8c8', 'center', false);
      u.button(c, 'retry', 'Retry', x + 40, y + 96, w - 80, 38, { size: 15, color: '#6ee07a' });
      u.button(c, 'gallery', 'Back to the Gallery', x + 40, y + 142, w - 80, 38, { size: 14, color: '#9ad0ff' });
      if (m.won || sp.kind === 'lands') u.button(c, 'keep', 'Keep exploring', x + 40, y + 188, w - 80, 34, { size: 14 });
    },
    update(g, m, act, inp) {
      const sp = g.run.practice;
      if (act === 'retry') { const spec = Object.assign({}, sp); g.modal = null; PR.begin(g, spec); }
      else if (act === 'gallery' || inp.consume('back')) PR.leave(g);
      else if (act === 'keep') g.modal = null;
    },
  };
  ED.hook('hud', V, (g, c) => { const sp = g.run && g.run.practice; if (!sp || sp.stage || g.scene === 'intro') return; UI().text(c, 'PRACTICE · ' + (sp.name || '') + (g.god ? ' · GOD' : ''), 14, C.HUD + 16, 11, '#6ee07a', 'left', true); });
  ED.hook('titleUI', V, (g, c) => { UI().button(c, 'gallery', 'GALLERY  ·  see & fight anything', C.W - 262, 282, 246, 32, { size: 12, color: '#9ad0ff' }); });

  /** no sandbox may outlive the gallery or a practice session: called every frame by the main loop */
  ED.sandboxGuard = function (g) { if (S.sandboxed && g.scene !== 'gallery' && !PR.active(g)) close(g); };

  // ==================================================================== test / art-review API
  ED.gallery = {
    TABS, entries, allEntries, S, open, close, build, spawnIn, tickStage, stageStep, newStage, empty, placeOf, bossSpec, miniSpec, sheetEnt, landThumb, kit, kindOf,
    /** build the stage for an entry, run it `frames` frames and return what happened (used by the all-content smoke test and for art review) */
    smoke(g, ent, frames) {
      const out = { ok: true, why: '' }; S.anim = 'attack'; S.depth = 1; S.t = 0; S.errors = 0;
      try {
        build(S, g, ent); const st = S.st;
        for (let i = 0; i < (frames || 120); i++) { tickStage(S, g, ent); st.player.hp = st.player.maxHp; }
        for (const e of st.enemies) if (!isFinite(e.x) || !isFinite(e.y) || !isFinite(e.hp)) { out.ok = false; out.why = 'non-finite state in ' + e.type; }
        if (ent.tab !== 'lands' && S.e) { const e = S.e; if (!e.dead) { e.noLoot = true; e.hp = 0; if (e.parts) for (const p of e.parts) p.hp = 0; st.killEnemy(e); } for (let i = 0; i < 40; i++) stageStep(st); }
        if (S.errors) { out.ok = false; out.why = out.why || 'errors'; }
      } catch (err) { out.ok = false; out.why = String(err && err.stack || err).split('\n').slice(0, 3).join(' | '); }
      return out;
    },
  };
  ED.packs.track('gallery', []);
})(typeof globalThis !== 'undefined' ? globalThis : this);

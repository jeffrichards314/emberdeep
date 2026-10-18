/* EMBERDEEP — pack_v10.js : v10 "LEGACY" — a record of who you were.  No power creep: it is knowledge, bragging rights and looks.
 *
 *  FEATS     : 27 things worth doing (depth, elites, bosses, flawless rooms, hoards, runs, and a few that need other updates).  Each one earns a TITLE you can wear.
 *  BESTIARY  : every foe and boss you have met — kills, how often it killed you, its stats and a studied-tier mark at 10 / 50 / 250 kills.
 *  MASTERY   : every class earns mastery from your runs (floors, bosses, victories).  Levels 1-10 unlock five SKINS per class; your total mastery unlocks five TRAILS.
 *  LEGACY    : a title-screen scene with the three tabs; the equipped title shows on the title and end screens.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v10';

  P.define({
    id: 'v10', name: 'LEGACY', tag: 'feats, bestiary, mastery', color: '#c8a0ff',
    blurb: 'Feats that earn titles, a bestiary of every foe and boss you have faced, and class mastery that unlocks skins and trails. Pure record and cosmetics: it never changes how the game plays.',
  });

  // ------------------------------------------------------------------ the save: meta.legacy
  const meta = () => {
    const m = ED.save.meta; let l = m.legacy; if (!l || typeof l !== 'object') l = m.legacy = {};
    for (const k of ['feats', 'bestiary', 'mastery', 'skin', 'counters', 'played']) if (!l[k] || typeof l[k] !== 'object') l[k] = {};
    if (typeof l.title !== 'string') l.title = ''; if (typeof l.trail !== 'string') l.trail = ''; if (typeof l.runs !== 'number') l.runs = 0;
    return l;
  };
  const save = () => ED.save.save();
  const bump = (key, n) => { const c = meta().counters; c[key] = (c[key] || 0) + (n === undefined ? 1 : n); return c[key]; };

  // ------------------------------------------------------------------ feats
  const mega = (id) => { const d = ED.bosses.def(id); return !!(d && d.mega); };
  const FEATS = [
    // depth
    { id: 'd5', name: 'First Descent', desc: 'Reach floor 5.', title: 'the Delver', test: x => x.run.floorNum >= 5, prog: x => [x.run.floorNum, 5] },
    { id: 'd10', name: 'Deep Diver', desc: 'Reach floor 10.', title: 'the Deep Diver', test: x => x.run.floorNum >= 10, prog: x => [x.run.floorNum, 10] },
    { id: 'd20', name: 'Into the Dark', desc: 'Reach floor 20.', title: 'of the Dark', test: x => x.run.floorNum >= 20, prog: x => [x.run.floorNum, 20] },
    { id: 'd31', name: 'Beyond the Veil', desc: 'Reach floor 31.', title: 'Veilwalker', test: x => x.run.floorNum >= 31, prog: x => [x.run.floorNum, 31] },
    { id: 'd50', name: 'The Bottom of Everything', desc: 'Reach floor 50.', title: 'the Unfathomable', test: x => x.run.floorNum >= 50, prog: x => [x.run.floorNum, 50] },
    { id: 'speed6', name: 'Swift Descent', desc: 'Reach floor 6 in under 8 minutes.', title: 'the Swift', test: x => x.run.floorNum >= 6 && x.run.fast6 === true },
    // combat
    { id: 'elite25', name: 'Elite Hunter', desc: 'Slay 25 elite foes (all runs).', title: 'the Hunter', test: x => x.L.counters.elites >= 25, prog: x => [x.L.counters.elites || 0, 25] },
    { id: 'elite200', name: 'Elite Bane', desc: 'Slay 200 elite foes (all runs).', title: 'Bane of Elites', test: x => x.L.counters.elites >= 200, prog: x => [x.L.counters.elites || 0, 200] },
    { id: 'kills1k', name: 'A Thousand Cuts', desc: 'Slay 1,000 foes (all runs).', title: 'the Reaper', test: x => x.m.totalKills + (x.live ? x.run.kills : 0) >= 1000, prog: x => [Math.min(1000, x.m.totalKills + (x.live ? x.run.kills : 0)), 1000] },
    { id: 'boss1', name: 'Giant-Killer', desc: 'Defeat a floor boss.', title: 'Giant-Killer', test: x => x.run.bossesKilled.length >= 1 },
    { id: 'mega1', name: 'Titan-Slayer', desc: 'Defeat a MEGA boss.', title: 'Titan-Slayer', test: x => x.run.bossesKilled.some(mega) },
    { id: 'mini10', name: 'Mini Menace', desc: 'Defeat 10 mini bosses (all runs).', title: 'the Menace', test: x => x.L.counters.minis >= 10, prog: x => [x.L.counters.minis || 0, 10] },
    { id: 'flaw5', name: 'Untouchable', desc: 'Clear 5 combat rooms in a row without being hit.', title: 'the Untouchable', test: x => (x.run.lgFlaw || 0) >= 5 },
    { id: 'close', name: 'Close Call', desc: 'Clear a combat room with one heart or less.', title: 'the Lucky', test: x => !!x.run.lgClose },
    // collection
    { id: 'relic12', name: 'Magpie', desc: 'Hold 12 relics at once.', title: 'the Magpie', test: x => !!x.p && Object.keys(x.p.relics).length >= 12 },
    { id: 'gold500', name: "Dragon's Hoard", desc: 'Carry 500 gold at once.', title: 'Hoardmaster', test: x => !!x.p && x.p.gold >= 500 },
    // runs
    { id: 'runs10', name: 'Persistent', desc: 'Finish 10 runs.', title: 'the Persistent', test: x => x.L.runs >= 10, prog: x => [x.L.runs, 10] },
    { id: 'runs50', name: 'Obsessed', desc: 'Finish 50 runs.', title: 'the Obsessed', test: x => x.L.runs >= 50, prog: x => [x.L.runs, 50] },
    { id: 'win1', name: 'Cashed Out', desc: 'Win a run.', title: 'the Victorious', test: x => !!x.run.victory },
    { id: 'class5', name: 'Versatile', desc: 'Play 5 different classes.', title: 'the Versatile', test: x => Object.keys(x.L.played).length >= 5, prog: x => [Object.keys(x.L.played).length, 5] },
    { id: 'daily5', name: 'Daily Devotee', desc: 'Reach floor 5 on the Daily Descent.', title: 'Daily Devotee', test: x => x.run.seed === ED.dailySeed() && x.run.floorNum >= 5 },
    // other updates
    { id: 'heat6', name: 'The Defiant', desc: 'Reach floor 8 with Heat 6 or more.', title: 'the Defiant', need: 'v6', test: x => (x.run.heatLevel || 0) >= 6 && x.run.floorNum >= 8 },
    { id: 'heart', name: 'Heartbreaker', desc: 'Defeat The Emberdeep Heart.', title: 'Heartbreaker', need: 'v8', test: x => (x.run.finalBoss || 0) >= 1 },
    { id: 'hunt1', name: 'Avenger', desc: 'Slay a nemesis.', title: 'the Avenger', need: 'v9', test: x => x.L.counters.nemSlain >= 1 },
    { id: 'hunt5', name: 'Dread Hunter', desc: 'Slay a rank 4 or 5 nemesis.', title: 'Dread Hunter', need: 'v9', test: x => x.L.counters.dread >= 1 },
    { id: 'hunt10', name: 'Scourge of Names', desc: 'Slay 10 nemeses (all runs).', title: 'Scourge of Names', need: 'v9', test: x => x.L.counters.nemSlain >= 10, prog: x => [x.L.counters.nemSlain || 0, 10] },
    { id: 'prov', name: 'Well Provisioned', desc: 'Use 25 provisions (all runs).', title: 'the Provisioned', need: 'v7', test: x => (x.L.counters.prov || 0) + (x.live ? (x.run.provsUsed || 0) : 0) >= 25, prog: x => [(x.L.counters.prov || 0) + (x.run.provsUsed || 0), 25] },
  ];
  const FEAT = {}; for (const f of FEATS) { f.pack = V; FEAT[f.id] = f; }
  P.track('feats', FEATS);
  const ctxOf = (g, live) => ({ g, m: ED.save.meta, L: meta(), run: g.run, p: g.player, live });
  /** earn any feat whose test now passes; returns the new ones */
  function check(g, live) {
    const out = [], x = ctxOf(g, live), L = x.L; if (!g.run) return out;
    for (const f of FEATS) {
      if (L.feats[f.id] !== undefined || (f.need && !P.on(f.need))) continue;
      let pass = false; try { pass = !!f.test(x); } catch (e) { pass = false; }
      if (!pass) continue;
      L.feats[f.id] = L.runs; out.push(f); if (!L.title) L.title = f.id;
      if (g.popups && live) { g.popups.push({ title: 'FEAT', lines: [f.name, 'Title: ' + f.title], t: 0, dur: 300 }); g.sfx('unlock'); }
      (g.run.legacyFeats = g.run.legacyFeats || []).push(f.id);
    }
    if (out.length) save();
    return out;
  }

  // ------------------------------------------------------------------ mastery, skins, trails
  const SKINS = [
    { id: 'ember', name: 'Ember', col: '#ff8a3a', lvl: 1, desc: 'Orbiting sparks' },
    { id: 'frost', name: 'Frost', col: '#8fe4ff', lvl: 3, desc: 'A ring of ice shards' },
    { id: 'verdant', name: 'Verdant', col: '#6ee07a', lvl: 5, desc: 'Drifting leaves' },
    { id: 'shadow', name: 'Shadow', col: '#7a5aa8', lvl: 7, desc: 'A dark aura' },
    { id: 'gilded', name: 'Gilded', col: '#ffd24a', lvl: 10, desc: 'Golden ring and crown' },
  ];
  const TRAILS = [
    { id: 'ember', name: 'Ember Trail', col: '#ff8a3a', total: 2 }, { id: 'frost', name: 'Frost Trail', col: '#8fe4ff', total: 5 }, { id: 'verdant', name: 'Verdant Trail', col: '#6ee07a', total: 9 },
    { id: 'void', name: 'Void Trail', col: '#a070ff', total: 14 }, { id: 'gold', name: 'Golden Trail', col: '#ffd24a', total: 20 },
  ];
  for (const s of SKINS) s.pack = V; for (const t of TRAILS) t.pack = V; P.track('skins', SKINS); P.track('trails', TRAILS);
  const SK = {}, TR = {}; for (const s of SKINS) SK[s.id] = s; for (const t of TRAILS) TR[t.id] = t;
  const MAXL = 10, need = (lvl) => 50 * lvl * (lvl + 1);                 // xp for level n: 100, 300, 600 ... 5500
  const levelOf = (xp) => { let l = 0; while (l < MAXL && xp >= need(l + 1)) l++; return l; };
  const levelFor = (cls) => levelOf(meta().mastery[cls] || 0);
  const totalLevels = () => { const L = meta(); let n = 0; for (const c of Object.keys(L.mastery)) if (I.CLASSES[c]) n += levelOf(L.mastery[c]); return n; };
  const xpOf = (run, victory) => Math.round(run.floorNum * 10 + run.bossesKilled.length * 40 + run.minisKilled.length * 15 + run.kills / 10 + (victory ? 200 : 0));
  const skinOpen = (cls, id) => !!SK[id] && levelFor(cls) >= SK[id].lvl;
  const trailOpen = (id) => !!TR[id] && totalLevels() >= TR[id].total;
  const skinColor = (cls, id) => U.mix((I.CLASSES[cls] || { color: '#ffffff' }).color, SK[id].col, 0.55);

  // ------------------------------------------------------------------ run lifecycle
  ED.hook('runStart', V, (g) => {
    const L = meta(), p = g.player, cls = g.run.classId; L.played[cls] = (L.played[cls] || 0) + 1;
    const sk = L.skin[cls]; if (sk && skinOpen(cls, sk)) { p.skinId = sk; p.skinCol = skinColor(cls, sk); }
    if (L.trail && trailOpen(L.trail)) p.trailCol = TR[L.trail].col;
    g.run.lgFlaw = 0;
  });
  ED.hook('floorStart', V, (g) => { if (g.floorNum === 6 && g.run.frames < 8 * 3600) g.run.fast6 = true; check(g, true); });
  ED.hook('hurt', V, (g) => { if (g.run) g.run.lgFlaw = 0; if (g.rt) g.rt.lgHit = true; });
  ED.hook('roomEnter', V, (g, room) => { if (g.rt) g.rt.lgHit = false; });
  ED.hook('roomClear', V, (g, room) => {
    if (room.type === 'normal' || room.type === 'ambush' || room.type === 'challenge') { if (!g.rt.lgHit) g.run.lgFlaw = (g.run.lgFlaw || 0) + 1; if (g.player.hp > 0 && g.player.hp <= 4) g.run.lgClose = true; }
    check(g, true);
  });
  ED.hook('kill', V, (g, e) => {
    if (e.elite && !e.minion && !e.boss) bump('elites');
    if (e.nem && !e.escaped) { bump('nemSlain'); if (e.nem.rank >= 4) bump('dread'); }
    if (e.boss || e.elite) check(g, true);
  });
  ED.hook('miniDefeated', V, (g, spec) => { if (!spec.revenant) bump('minis'); check(g, true); });
  ED.hook('tick', V, (g) => {
    const p = g.player; if (!p || p.dead) return;
    if (g.frame % 90 === 0) check(g, true);
    if (p.trailCol && g.frame % 4 === 0 && (Math.abs(p.vx) + Math.abs(p.vy) > 0.6)) g.trailFx(p.x, p.y + 5, p.trailCol, 0.5);
  });
  ED.hook('runEnd', V, (g, victory) => {
    const L = meta(), run = g.run, cls = run.classId; if (!run) return;
    L.runs++; if (run.provsUsed) bump('prov', run.provsUsed); const b = L.bestiary, add = (id, k, d) => { const r = b[id] || (b[id] = { k: 0, d: 0 }); r.k += k; r.d += d; };
    for (const id in run.killsByType) add(id, run.killsByType[id], 0);
    for (const id of run.bossesKilled) add(id, 1, 0); for (const id of run.minisKilled) add(id, 1, 0);
    if (!victory && run.lastHitId) add(run.lastHitId, 0, 1);
    const before = levelFor(cls), xp = xpOf(run, victory); L.mastery[cls] = (L.mastery[cls] || 0) + xp; const after = levelFor(cls);
    const sumBefore = totalLevels() - (after - before);
    const gained = [];
    for (const s of SKINS) if (s.lvl > before && s.lvl <= after) gained.push((I.CLASSES[cls] || { name: cls }).name + ' skin: ' + s.name);
    for (const t of TRAILS) if (t.total > sumBefore && t.total <= totalLevels()) gained.push(t.name);
    check(g, false);
    run.legacyReport = { cls, xp, before, after, gained, feats: (run.legacyFeats || []).slice() };
    save();
  });

  // ------------------------------------------------------------------ drawing: skin accents on the player
  ED.hook('draw', V, (g, c, t) => {
    const p = g.player; if (!p || !p.skinId || (p.dead && g.dying && g.dying.t > 30)) return;
    const s = SK[p.skinId], x = p.x, y = p.y; c.save(); c.globalAlpha = p.inv > 0 && p.dashIframes <= 0 ? 0.5 : 1;
    if (s.id === 'ember') { for (let k = 0; k < 3; k++) { const a = t * 0.07 + k * TAU / 3; c.fillStyle = k % 2 ? '#ffd24a' : '#ff8a3a'; c.fillRect(x + Math.cos(a) * 17 - 1.5, y + Math.sin(a) * 15 - 1.5, 3, 3); } }
    else if (s.id === 'frost') { c.fillStyle = 'rgba(190,240,255,0.9)'; for (let k = 0; k < 5; k++) { const a = t * 0.03 + k * TAU / 5; c.save(); c.translate(x + Math.cos(a) * 18, y + Math.sin(a) * 16); c.rotate(a); c.beginPath(); c.moveTo(0, -3); c.lineTo(2, 0); c.lineTo(0, 3); c.lineTo(-2, 0); c.closePath(); c.fill(); c.restore(); } }
    else if (s.id === 'verdant') { c.fillStyle = '#6ee07a'; for (let k = 0; k < 4; k++) { const a = -t * 0.025 + k * TAU / 4, r = 17 + Math.sin(t * 0.08 + k) * 2; c.beginPath(); c.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, 3.4, 1.8, a, 0, TAU); c.fill(); } }
    else if (s.id === 'shadow') { const gr = c.createRadialGradient(x, y, 6, x, y, 26); gr.addColorStop(0, 'rgba(60,30,100,0)'); gr.addColorStop(1, 'rgba(60,30,100,0.5)'); c.fillStyle = gr; c.beginPath(); c.arc(x, y, 26, 0, TAU); c.fill(); }
    else if (s.id === 'gilded') { c.strokeStyle = 'rgba(255,210,74,0.9)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, p.r + 3, 0, TAU); c.stroke(); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(x - 6, y - p.r - 2); c.lineTo(x - 6, y - p.r - 8); c.lineTo(x - 3, y - p.r - 4); c.lineTo(x, y - p.r - 10); c.lineTo(x + 3, y - p.r - 4); c.lineTo(x + 6, y - p.r - 8); c.lineTo(x + 6, y - p.r - 2); c.closePath(); c.fill(); }
    c.restore();
  });

  // ------------------------------------------------------------------ title / end screen lines
  const UI = () => ED.ui;
  const titleOf = () => { const L = meta(); return L.title && FEAT[L.title] ? FEAT[L.title].title : ''; };
  const earned = () => Object.keys(meta().feats).filter(id => FEAT[id]).length;
  ED.hook('titleUI', V, (g, c) => {
    UI().button(c, 'legacy', 'LEGACY  ·  ' + earned() + '/' + FEATS.length + ' feats', C.W - 262, 172, 246, 32, { size: 12, color: '#c8a0ff' });
    const t = titleOf(); if (t) UI().text(c, '★ ' + t, C.W - 139, 222, 11, '#c8a0ff', 'center', false);
  });
  ED.hook('endUI', V, (g, c) => {
    const r = g.run.legacyReport; if (!r) return; const u = UI(), x = 480, y = 382, cl = I.CLASSES[r.cls] || { name: r.cls };
    u.text(c, '✦ ' + cl.name + ' mastery +' + r.xp + (r.after > r.before ? '  ·  LEVEL ' + r.after + '!' : '  ·  level ' + r.after) + (r.feats.length ? '   ·   FEAT: ' + r.feats.map(id => FEAT[id].name).join(', ') : ''), x, y, 11, '#c8a0ff', 'center', false);
    if (r.gained.length) u.text(c, 'Unlocked: ' + r.gained.join(', '), x, y + 13, 11, '#ffd24a', 'center', false);
  });
  ED.hook('selectUI', V, (g, c) => { const t = titleOf(), cls = ED.ui.selClass, lv = levelFor(cls); UI().text(c, (t ? '★ ' + t + '   ·   ' : '') + (I.CLASSES[cls] ? I.CLASSES[cls].name : '') + ' mastery ' + lv + (lv >= MAXL ? ' (max)' : ''), 950, 574, 11, '#c8a0ff', 'right', false); });

  // ------------------------------------------------------------------ the LEGACY scene
  let tab = 'feats', beSub = 'foes', bePage = 0, beSel = null, fpage = 0, maSel = null;     // (fpage / maSel: the polished layout's feat page and chosen class)
  const tier = (k) => k >= 250 ? 3 : k >= 50 ? 2 : k >= 10 ? 1 : 0, TIER_COL = ['#5a5a78', '#c08a5a', '#c8d0e0', '#ffd24a'];
  const foeList = () => Object.values(ED.enemyTypes).filter(d => d.id !== 'boss' && P.ok(d) && (d.weight > 0 || ED.save.meta.seen.enemies[d.id])).sort((a, b) => (a.minFloor || 0) - (b.minFloor || 0) || a.name.localeCompare(b.name));
  const bossList = () => { const out = []; for (const id of ED.bosses.allIds()) { const d = ED.bosses.def(id); if (d && P.ok(d)) out.push({ id, name: d.name, title: d.title || '', color: d.color, mega: !!d.mega, teaches: d.teaches || '', kind: d.mega ? 'MEGA BOSS' : 'FLOOR BOSS' }); }
    for (const id of Object.keys(ED.minibosses.defs)) { const d = ED.minibosses.defs[id]; if (d && !d.special && P.ok(d)) out.push({ id, name: d.name, title: d.title || '', color: d.color, mega: false, teaches: d.teaches || '', kind: 'MINI BOSS' }); } return out; };
  ED.legacyLists = { foeList, bossList };
  ED.sceneImpl.legacy = {
    draw(g, c) {
      const u = UI(), L = meta();
      u.shadow(c, 'LEGACY', C.W / 2, 44, 32, '#c8a0ff', 'center');
      [['feats', 'FEATS'], ['bestiary', 'BESTIARY'], ['mastery', 'MASTERY']].forEach(([id, lab], i) => u.button(c, 'tab:' + id, lab, 250 + i * 150, 62, 140, 30, { size: 13, color: '#c8a0ff', selected: tab === id }));
      if (tab === 'feats') {
        u.text(c, earned() + ' of ' + FEATS.length + ' feats  ·  click an earned feat to wear its title' + (titleOf() ? '  ·  wearing: ' + titleOf() : ''), C.W / 2, 108, 11, '#a8a8c8', 'center', false);
        const x = ctxOf(g, false); if (!x.run) x.run = { floorNum: 0, kills: 0, bossesKilled: [], minisKilled: [], seed: '' };
        const rowH = Math.min(34, Math.floor(480 / Math.ceil(FEATS.length / 2))), tall = rowH >= 33;       // other updates add feats: the rows tighten instead of running off the screen
        FEATS.forEach((f, i) => {
          const col = i % 2, row = Math.floor(i / 2), px = 30 + col * 460, py = 118 + row * rowH, got = L.feats[f.id] !== undefined, locked = !!(f.need && !P.on(f.need)), wear = L.title === f.id;
          u.button(c, got ? 'wear:' + f.id : 'x:' + f.id, '', px, py, 450, rowH - 4, { color: wear ? '#ffd24a' : '#c8a0ff', selected: wear, disabled: !got, nav: got });
          c.fillStyle = got ? '#c8a0ff' : '#2a2a3c'; c.beginPath(); c.arc(px + 16, py + (rowH - 4) / 2, 7, 0, TAU); c.fill(); if (got) { c.fillStyle = '#10101c'; c.fillRect(px + 13, py + (rowH - 4) / 2 - 3, 6, 6); }
          u.text(c, f.name, px + 34, py + (tall ? 13 : 11), 12, got ? '#fff' : locked ? '#5a5a70' : '#8a8aa8');
          let line = f.desc; if (!got && f.prog) { const pr = f.prog(x); line += '  (' + pr[0] + '/' + pr[1] + ')'; } if (locked) line += '  [needs ' + P.BY_ID[f.need].name + ']';
          u.text(c, line, px + 34, py + (tall ? 26 : 22), 9, got ? '#c8c8e0' : '#6a6a88', 'left', false);
          if (got) u.text(c, '★ ' + f.title, px + 440, py + (tall ? 13 : 11), 10, wear ? '#ffd24a' : '#c8a0ff', 'right', false);
        });
      } else if (tab === 'bestiary') {
        [['foes', 'FOES'], ['bosses', 'BOSSES']].forEach(([id, lab], i) => u.button(c, 'sub:' + id, lab, 30 + i * 100, 100, 90, 24, { size: 11, color: '#9ad0ff', selected: beSub === id }));
        const list = beSub === 'foes' ? foeList() : bossList(), per = 20, pages = Math.max(1, Math.ceil(list.length / per)); if (bePage >= pages) bePage = 0;
        if (pages > 1) u.button(c, 'page', 'Page ' + (bePage + 1) + '/' + pages, 240, 100, 110, 24, { size: 11 });
        const seen = ED.save.meta.seen, B = L.bestiary;
        list.slice(bePage * per, bePage * per + per).forEach((d, i) => {
          const col = i % 2, row = Math.floor(i / 2), px = 30 + col * 224, py = 130 + row * 44, rec = B[d.id] || { k: 0, d: 0 }, known = beSub === 'foes' ? !!(seen.enemies[d.id] || rec.k) : !!(rec.k || ED.save.meta.unlocked.bosses[d.id] || ED.save.meta.unlocked.minis[d.id]), sel = beSel === d.id;
          u.button(c, 'be:' + d.id, '', px, py, 218, 40, { color: '#9ad0ff', selected: sel });
          if (known) { c.fillStyle = d.color; c.strokeStyle = '#10101c'; c.lineWidth = 2; if (beSub === 'foes') ED.render.shape(c, d.shape, px + 20, py + 20, Math.min(13, d.r), 0, u.t); else { c.beginPath(); c.arc(px + 20, py + 20, 12, 0, TAU); } c.fill(); c.stroke(); }
          else { c.fillStyle = '#2a2a3c'; c.beginPath(); c.arc(px + 20, py + 20, 12, 0, TAU); c.fill(); u.text(c, '?', px + 20, py + 25, 13, '#5a5a78', 'center'); }
          u.text(c, known ? d.name : '???', px + 40, py + 17, 12, known ? '#fff' : '#6a6a88');
          u.text(c, known ? rec.k + ' slain' + (rec.d ? '  ·  killed you ' + rec.d + 'x' : '') : 'not yet met', px + 40, py + 32, 9, '#9a9ab8', 'left', false);
          for (let k = 0; k < 3; k++) { c.fillStyle = k < tier(rec.k) ? TIER_COL[tier(rec.k)] : '#2a2a3c'; c.fillRect(px + 200 - k * 8, py + 8, 6, 6); }
        });
        const d = list.find(x => x.id === beSel); u.panel(c, 490, 130, 440, 440, '#5a7a9a', 0.9);
        if (!d) u.text(c, 'Pick an entry.  Studied marks: 10 / 50 / 250 kills.', 710, 350, 12, '#7a7a98', 'center', false);
        else { const rec = B[d.id] || { k: 0, d: 0 }, known = beSub === 'foes' ? !!(seen.enemies[d.id] || rec.k) : !!(rec.k || ED.save.meta.unlocked.bosses[d.id] || ED.save.meta.unlocked.minis[d.id]);
          if (!known) u.text(c, 'You have not met this one yet.', 710, 350, 13, '#7a7a98', 'center', false);
          else if (beSub === 'foes') { c.fillStyle = d.color; c.strokeStyle = '#10101c'; c.lineWidth = 3; ED.render.shape(c, d.shape, 540, 180, 28, 0, u.t); c.fill(); c.stroke(); u.shadow(c, d.name, 585, 176, 22, d.color, 'left');
            u.text(c, 'HP ' + d.hp + '  ·  speed ' + d.speed + '  ·  contact ' + (d.dmg || 0) + (d.shot ? '  ·  shot ' + d.shot : '') + '  ·  from floor ' + d.minFloor + (d.world ? '  ·  ' + d.world : ''), 585, 198, 10, '#a8a8c8', 'left', false);
            u.wrap(c, d.desc || '', 510, 240, 400, 16, 13, '#d8d8ee'); u.text(c, 'Slain ' + rec.k + '   ·   killed you ' + rec.d + ' time' + (rec.d === 1 ? '' : 's'), 510, 330, 14, '#fff'); u.text(c, ['Not studied yet (10 kills)', 'Studied (next mark at 50)', 'Well studied (next mark at 250)', 'Mastered'][tier(rec.k)], 510, 352, 11, TIER_COL[tier(rec.k)], 'left', false); }
          else { u.shadow(c, d.name, 510, 176, 22, d.color, 'left'); u.text(c, d.kind + (d.title ? '  ·  ' + d.title : ''), 510, 198, 11, '#a8a8c8', 'left', false); u.wrap(c, d.teaches || '', 510, 240, 400, 16, 13, '#d8d8ee'); u.text(c, 'Defeated ' + rec.k + ' time' + (rec.k === 1 ? '' : 's') + '   ·   killed you ' + rec.d + ' time' + (rec.d === 1 ? '' : 's'), 510, 330, 14, '#fff'); } }
      } else {
        u.text(c, 'Mastery grows with every run (floors, bosses, victories). Skins unlock per class; trails unlock from your total mastery (' + totalLevels() + ').', C.W / 2, 108, 11, '#a8a8c8', 'center', false);
        const classes = I.classList(); classes.forEach((cl, i) => {
          const py = 118 + i * 36, xp = L.mastery[cl.id] || 0, lv = levelOf(xp), cur = L.skin[cl.id] || '';
          c.fillStyle = cur && skinOpen(cl.id, cur) ? skinColor(cl.id, cur) : cl.color; c.strokeStyle = '#10101c'; c.lineWidth = 2; c.beginPath(); c.arc(50, py + 15, 11, 0, TAU); c.fill(); c.stroke();
          u.text(c, cl.name, 72, py + 13, 13, '#fff'); u.text(c, 'LV ' + lv + (lv >= MAXL ? ' MAX' : '  ·  ' + (xp - (lv ? need(lv) : 0)) + '/' + (need(lv + 1) - (lv ? need(lv) : 0))), 72, py + 27, 9, '#9a9ab8', 'left', false);
          c.fillStyle = '#1a1a2a'; c.fillRect(180, py + 8, 120, 8); c.fillStyle = '#c8a0ff'; c.fillRect(180, py + 8, 120 * (lv >= MAXL ? 1 : (xp - (lv ? need(lv) : 0)) / (need(lv + 1) - (lv ? need(lv) : 0))), 8);
          u.button(c, 'skin:' + cl.id + ':', 'none', 320, py + 3, 52, 26, { size: 10, selected: !cur });
          SKINS.forEach((s, k) => { const open = lv >= s.lvl; u.button(c, 'skin:' + cl.id + ':' + s.id, open ? s.name : 'LV ' + s.lvl, 378 + k * 90, py + 3, 84, 26, { size: 10, color: s.col, disabled: !open, selected: cur === s.id, textColor: open ? s.col : undefined }); });
        });
        const ty = 118 + classes.length * 36 + 6; u.text(c, 'TRAIL', 50, ty + 18, 12, '#c8a0ff');
        u.button(c, 'trail:', 'none', 110, ty + 3, 60, 26, { size: 10, selected: !L.trail });
        TRAILS.forEach((t, k) => { const open = totalLevels() >= t.total; u.button(c, 'trail:' + t.id, open ? t.name : 'total ' + t.total, 178 + k * 148, ty + 3, 142, 26, { size: 10, color: t.col, disabled: !open, selected: L.trail === t.id, textColor: open ? t.col : undefined }); });
      }
      u.button(c, 'back', 'Back', C.W / 2 - 80, 600, 160, 32, { size: 13 });
    },
    update(g, a, inp) {
      const L = meta();
      if (a === 'back' || inp.consume('back')) { ED.menus.go(g, 'title'); return; }
      if (!a) return;
      if (a.indexOf('tab:') === 0) { tab = a.slice(4); g.sfx('ui'); }
      else if (a.indexOf('wear:') === 0) { L.title = a.slice(5); save(); g.sfx('ui'); }
      else if (a.indexOf('sub:') === 0) { beSub = a.slice(4); bePage = 0; beSel = null; g.sfx('ui'); }
      else if (a === 'page') { bePage++; g.sfx('ui'); }
      else if (a === 'fp:prev' || a === 'fp:next') { fpage += a === 'fp:next' ? 1 : -1; g.sfx('ui'); }
      else if (a === 'bp:prev' || a === 'bp:next') { bePage += a === 'bp:next' ? 1 : -1; g.sfx('ui'); }
      else if (a.indexOf('ms:') === 0) { maSel = a.slice(3); g.sfx('ui'); }
      else if (a.indexOf('be:') === 0) { beSel = a.slice(3); g.sfx('ui'); }
      else if (a.indexOf('skin:') === 0) { const [, cls, id] = a.split(':'); if (!id) L.skin[cls] = ''; else if (skinOpen(cls, id)) L.skin[cls] = id; else { g.sfx('deny'); return; } save(); g.sfx('ui'); }
      else if (a.indexOf('trail:') === 0) { const id = a.slice(6); if (!id) L.trail = ''; else if (trailOpen(id)) L.trail = id; else { g.sfx('deny'); return; } save(); g.sfx('ui'); }
    },
  };

  // polished layout (v23 POLISH): the same ids and update() as the classic scene above, plus feat / bestiary pages (fp:, bp:) and a class list on the mastery tab (ms:)
  (ED.skin.screens = ED.skin.screens || {}).legacy = function (g, c) {
    const K = ED.skin.kit, COL = K.COL, u = UI(), L = meta(), VI = '#c8a0ff'; u.navMode = 'spatial';
    K.head(c, 'LEGACY', { y: 50, color: VI, rule: 220 });
    [['feats', 'Feats'], ['bestiary', 'Bestiary'], ['mastery', 'Mastery']].forEach(([id, lab], i) => u.button(c, 'tab:' + id, lab, 240 + i * 176, 80, 168, 40, { size: 16, color: VI, selected: tab === id }));
    const pager = (idp, page, pages, y) => { u.button(c, idp + ':prev', '‹ Prev', 640, y, 96, 32, { size: 14, disabled: page <= 0 }); K.text(c, 'page ' + (page + 1) + ' / ' + pages, 790, y + 21, 15, COL.mute, 'center'); u.button(c, idp + ':next', 'Next ›', 844, y, 68, 32, { size: 14, disabled: page >= pages - 1 }); };
    if (tab === 'feats') {
      const x = ctxOf(g, false); if (!x.run) x.run = { floorNum: 0, kills: 0, bossesKilled: [], minisKilled: [], seed: '' };
      const per = 12, pages = Math.max(1, Math.ceil(FEATS.length / per)); fpage = U.clamp(fpage, 0, pages - 1);
      FEATS.slice(fpage * per, fpage * per + per).forEach((f, i) => {
        const px = 48 + (i % 2) * 440, py = 136 + Math.floor(i / 2) * 62, got = L.feats[f.id] !== undefined, locked = !!(f.need && !P.on(f.need)), wear = L.title === f.id;
        u.button(c, got ? 'wear:' + f.id : 'x:' + f.id, '', px, py, 424, 54, { color: wear ? COL.gold : VI, selected: false, disabled: !got, nav: got, ghost: !got });
        c.fillStyle = got ? VI : 'rgba(255,255,255,0.14)'; c.beginPath(); c.arc(px + 22, py + 27, 8, 0, TAU); c.fill(); if (got) { c.strokeStyle = '#14101e'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(px + 18, py + 27); c.lineTo(px + 21, py + 30); c.lineTo(px + 27, py + 23); c.stroke(); }
        u.text(c, K.fit(c, f.name, 15, got ? 226 : 380, true), px + 42, py + 23, 15, got ? '#fff' : locked ? '#5a5a70' : '#9a9ab4', 'left');
        let line = f.desc; if (!got && f.prog) { const pr = f.prog(x); line += '  (' + pr[0] + '/' + pr[1] + ')'; } if (locked) line += '  [needs ' + P.BY_ID[f.need].name + ']';
        K.text(c, K.fit(c, line, 13, 372, false), px + 42, py + 43, 13, got ? '#cfcfe6' : COL.dim);
        if (got) u.text(c, K.fit(c, '★ ' + f.title, 13, 140, false), px + 410, py + 23, 13, wear ? COL.gold : VI, 'right', false);
      });
      K.text(c, earned() + ' of ' + FEATS.length + ' feats' + (titleOf() ? '  ·  wearing ' + titleOf() : ''), 48, 596, 15, VI);
      K.text(c, 'Tap an earned feat to wear its title.', 48, 618, 13, COL.dim); if (pages > 1) pager('fp', fpage, pages, 584);
    } else if (tab === 'bestiary') {
      [['foes', 'Foes'], ['bosses', 'Bosses']].forEach(([id, lab], i) => u.button(c, 'sub:' + id, lab, 48 + i * 112, 136, 104, 34, { size: 14, color: '#9ad0ff', selected: beSub === id }));
      const list = beSub === 'foes' ? foeList() : bossList(), per = 48, pages = Math.max(1, Math.ceil(list.length / per)); bePage = U.clamp(bePage, 0, pages - 1);
      const seen = ED.save.meta.seen, B = L.bestiary, isKnown = (d, rec) => beSub === 'foes' ? !!(seen.enemies[d.id] || rec.k) : !!(rec.k || ED.save.meta.unlocked.bosses[d.id] || ED.save.meta.unlocked.minis[d.id]);
      list.slice(bePage * per, bePage * per + per).forEach((d, i) => {
        const x = 48 + (i % 8) * 62, y = 184 + Math.floor(i / 8) * 62, rec = B[d.id] || { k: 0, d: 0 }, known = isKnown(d, rec), on = beSel === d.id;
        u.button(c, 'be:' + d.id, '', x, y, 56, 56, { color: known ? d.color : '#5a5a78', selected: on, ghost: !known });
        if (!known) u.text(c, '?', x + 28, y + 36, 20, '#5a5a78', 'center'); else if (beSub === 'foes') { c.fillStyle = d.color; c.strokeStyle = '#10101c'; c.lineWidth = 2; ED.render.shape(c, d.shape, x + 28, y + 28, Math.min(14, d.r), 0, u.t); c.fill(); c.stroke(); } else ED.icons.draw(c, 'skull', x + 28, y + 28, 12, d.color);
        for (let k = 0; k < tier(rec.k); k++) { c.fillStyle = TIER_COL[tier(rec.k)]; c.fillRect(x + 8 + k * 8, y + 46, 6, 4); }
      });
      if (pages > 1) pager('bp', bePage, pages, 584);
      K.text(c, list.filter(d => isKnown(d, B[d.id] || { k: 0 })).length + ' of ' + list.length + ' met', 48, 604, 15, '#9ad0ff');
      const px = 568, py = 136, pw = 344, ph = 430, d = list.find(x => x.id === beSel); K.glass(c, px, py, pw, ph, { a: 0.82, accent: d ? d.color : null });
      if (!d) K.wrap(c, 'Pick an entry.  Studied marks come at 10, 50 and 250 kills.', px + 30, py + 190, pw - 60, 22, 16, COL.dim);
      else { const rec = B[d.id] || { k: 0, d: 0 }, known = isKnown(d, rec);
        if (!known) K.text(c, 'You have not met this one yet.', px + pw / 2, py + 200, 16, COL.dim, 'center');
        else if (beSub === 'foes') {
          c.fillStyle = d.color; c.strokeStyle = '#10101c'; c.lineWidth = 3; ED.render.shape(c, d.shape, px + 50, py + 56, 26, 0, u.t); c.fill(); c.stroke(); u.shadow(c, K.fit(c, d.name, 22, pw - 120, true), px + 92, py + 50, 22, d.color, 'left');
          K.text(c, 'from floor ' + d.minFloor + (d.world ? '  ·  ' + d.world : ''), px + 92, py + 72, 13, COL.mute);
          let y = py + 112; for (const [k, v] of [['HP', d.hp], ['Speed', d.speed], ['Contact', d.dmg || 0]].concat(d.shot ? [['Shot', d.shot]] : [])) { K.text(c, k, px + 30, y, 15, COL.mute); u.text(c, String(v), px + pw - 30, y, 16, COL.ink, 'right'); y += 26; }
          y = K.wrap(c, d.desc || '', px + 30, y + 14, pw - 60, 20, 14, '#dcdcf0') + 10; K.rule(c, px + 30, y, pw - 60); y += 28;
          u.text(c, 'Slain ' + rec.k + '   ·   killed you ' + rec.d + 'x', px + 30, y, 15, '#fff', 'left'); K.text(c, ['Not studied yet (10 kills)', 'Studied (next mark at 50)', 'Well studied (next mark at 250)', 'Mastered'][tier(rec.k)], px + 30, y + 24, 13, TIER_COL[tier(rec.k)]);
        } else {
          u.shadow(c, K.fit(c, d.name, 22, pw - 60, true), px + 30, py + 50, 22, d.color, 'left'); K.text(c, K.fit(c, d.kind + (d.title ? '  ·  ' + d.title : ''), 13, pw - 60, false), px + 30, py + 74, 13, COL.mute);
          let y = K.wrap(c, d.teaches || '', px + 30, py + 112, pw - 60, 20, 14, '#dcdcf0') + 14; K.rule(c, px + 30, y, pw - 60); y += 28; u.text(c, 'Defeated ' + rec.k + 'x   ·   killed you ' + rec.d + 'x', px + 30, y, 15, '#fff', 'left');
        } }
    } else {
      const classes = I.classList(); if (!maSel || !classes.find(x => x.id === maSel)) maSel = classes[0].id;
      K.text(c, 'Mastery grows with every run.  Skins unlock per class; trails unlock from your total mastery (' + totalLevels() + ').', C.W / 2, 148, 14, COL.mute, 'center');
      classes.forEach((cl, i) => {
        const y = 164 + i * 36, xp = L.mastery[cl.id] || 0, lv = levelOf(xp), on = cl.id === maSel;
        u.button(c, 'ms:' + cl.id, '', 48, y, 300, 32, { color: cl.color, selected: on, ghost: !on });
        c.fillStyle = cl.color; c.strokeStyle = '#10101c'; c.lineWidth = 2; c.beginPath(); c.arc(70, y + 16, 9, 0, TAU); c.fill(); c.stroke();
        u.text(c, cl.name, 90, y + 21, 15, '#fff', 'left'); u.text(c, 'LV ' + lv + (lv >= MAXL ? ' MAX' : ''), 334, y + 21, 14, lv >= MAXL ? COL.gold : VI, 'right');
      });
      const cl = classes.find(x => x.id === maSel), xp = L.mastery[cl.id] || 0, lv = levelOf(xp), cur = L.skin[cl.id] || '', px = 368, py = 164, pw = 544, ph = 392; K.glass(c, px, py, pw, ph, { a: 0.82, accent: cl.color });
      u.shadow(c, cl.name, px + 28, py + 44, 26, cl.color, 'left'); const span = lv >= MAXL ? 1 : need(lv + 1) - (lv ? need(lv) : 0), have = lv >= MAXL ? 1 : xp - (lv ? need(lv) : 0);
      K.text(c, 'level ' + lv + (lv >= MAXL ? ' (max)' : '   ·   ' + have + ' / ' + span + ' to the next'), px + 28, py + 70, 15, COL.mute); K.rr(c, px + 28, py + 82, pw - 56, 10, 5); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fill(); if (have > 0) { K.rr(c, px + 28, py + 82, Math.max(10, (pw - 56) * have / span), 10, 5); c.fillStyle = VI; c.fill(); }
      K.label(c, 'SKIN', px + 28, py + 128, pw - 56, VI);
      u.button(c, 'skin:' + cl.id + ':', 'None', px + 28, py + 142, 92, 38, { size: 14, selected: !cur });
      SKINS.forEach((s, k) => { const open = lv >= s.lvl; u.button(c, 'skin:' + cl.id + ':' + s.id, open ? s.name : 'LV ' + s.lvl, px + 128 + (k % 3) * 126, py + 142 + Math.floor(k / 3) * 46, 118, 38, { size: 13, color: s.col, disabled: !open, selected: cur === s.id, textColor: open ? s.col : undefined }); });
      K.label(c, 'TRAIL  (total mastery ' + totalLevels() + ')', px + 28, py + 262, pw - 56, VI);
      u.button(c, 'trail:', 'None', px + 28, py + 276, 92, 38, { size: 14, selected: !L.trail });
      TRAILS.forEach((t, k) => { const open = totalLevels() >= t.total; u.button(c, 'trail:' + t.id, open ? t.name.replace(/ Trail$/, '') : 'total ' + t.total, px + 128 + (k % 3) * 126, py + 276 + Math.floor(k / 3) * 46, 118, 38, { size: 13, color: t.col, disabled: !open, selected: L.trail === t.id, textColor: open ? t.col : undefined }); });
    }
    K.back(c, 'back', 'Back');
  };

  ED.legacy = { FEATS, FEAT, SKINS, TRAILS, SK, TR, meta, check, levelOf, levelFor, totalLevels, need, xpOf, skinOpen, trailOpen, skinColor, titleOf, bump, MAXL, tier };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* EMBERDEEP — pack_v11.js : v11 "TRIALS" — three ways to play that skip the dungeon crawl.
 *
 *  A MODE is picked on the class-select screen (MODE button) and applies to the next run:
 *    BOSS RUSH : every floor drops you straight into its boss room.  Win and you are paid twice (the usual boss spoils + a bonus relic cache), then you descend.
 *    GAUNTLET  : every floor is ONE reinforced arena fight (5 waves, more elites).  Clear it, choose a relic and a piece of gear, heal, descend.
 *    CHAOS KIT : an ordinary run, but you start with a random weapon, active, armour piece and two relics instead of your class kit.
 *  The rest of the floor is sealed off in Rush / Gauntlet: wander out and you are sent back.  Best floor per mode is kept.
 *  It owns four feats (they appear on the v10 LEGACY screen when both updates are on).
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, D = ED.D, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v11';

  P.define({
    id: 'v11', name: 'TRIALS', tag: 'boss rush, gauntlet, chaos kit', color: '#7fe0c0',
    blurb: 'Pick a mode before a run: BOSS RUSH (a boss every floor, no dungeon), GAUNTLET (one brutal arena per floor with a relic and gear pick), or CHAOS KIT (a random weapon, active, armour and relics). Best floor is kept per mode.',
  });

  // ------------------------------------------------------------------ the save: meta.trials
  const meta = () => {
    const m = ED.save.meta; let t = m.trials; if (!t || typeof t !== 'object') t = m.trials = {};
    if (typeof t.mode !== 'string') t.mode = 'normal'; if (!t.best || typeof t.best !== 'object') t.best = {}; if (!t.runs || typeof t.runs !== 'object') t.runs = {};
    return t;
  };
  const MODES = [
    { id: 'normal', name: 'Normal Descent', color: '#ffd24a', desc: 'The classic run: explore the floor, find keys, fight, descend.', base: true },
    { id: 'rush', name: 'Boss Rush', color: '#ff6a5a', pack: V, desc: 'No dungeon: each floor drops you into its boss room. Pick a relic before the first fight; after every boss you get the usual spoils plus a bonus relic cache.' },
    { id: 'gauntlet', name: 'Gauntlet', color: '#ffb04a', pack: V, desc: 'One arena per floor, five waves with extra elites. Clear it to choose a relic AND a piece of gear, restore some health and descend.' },
    { id: 'chaos', name: 'Chaos Kit', color: '#c8a0ff', pack: V, desc: 'A normal run with a random start: a random weapon, active, armour piece and two relics replace your class kit (your class passive stays).' },
  ];
  const BY = {}; for (const m of MODES) BY[m.id] = m;
  P.track('modes', MODES);
  const modeId = () => { const t = ED.save.meta.trials, id = t && t.mode; return BY[id] && P.ok(BY[id]) ? id : 'normal'; };      // read-only: nothing is written to the save while the pack is off
  ED.trials = { MODES, BY, meta, mode: modeId, set(id) { if (BY[id] && P.ok(BY[id])) { meta().mode = id; ED.save.save(); return true; } return false; } };
  const arenaMode = (g) => g.run && (g.run.mode === 'rush' || g.run.mode === 'gauntlet');

  // ------------------------------------------------------------------ run start: remember the mode, build the Chaos Kit
  function chaosKit(g) {
    const p = g.player, rng = new ED.RNG(g.run.seed + ':chaos'), names = [];
    const w = I.rollWeapon(rng, 3, { rarity: 'uncommon' }); p.weapon = w; names.push(I.itemName(w));
    const a = I.rollActive(rng, 3, {}); p.active = g.newActiveState(a); names.push(I.itemName(a));
    const slot = rng.pick(['helmet', 'chest', 'boots']), ar = I.rollArmor(rng, 3, { slot }); p.armor[slot] = ar; names.push(I.itemName(ar));
    for (let i = 0; i < 2; i++) { const r = I.rollRelic(rng, 4, { relics: p.relics, noRisk: true, exclude: Object.keys(p.relics) }); p.relics[r.id] = (p.relics[r.id] || 0) + 1; g.run.relicOrder.push(r.id); ED.save.see('items', r.id); names.push(I.relic(r.id).name); }
    I.recalc(p); p.hp = p.maxHp; g.run.chaosKit = names;
    g.toast('CHAOS KIT: ' + names.join(' · '), '#c8a0ff', 330);
  }
  ED.hook('runStart', V, (g) => {
    g.run.mode = modeId(); g.run.trial = {};
    if (g.run.mode === 'chaos') chaosKit(g);
    else if (arenaMode(g)) g.toast((g.run.mode === 'rush' ? 'BOSS RUSH' : 'GAUNTLET') + ' — the dungeon is sealed. Fight, choose, descend.', MODES.find(m => m.id === g.run.mode).color, 260);
  });

  // ------------------------------------------------------------------ Rush / Gauntlet: choose the arena when the floor is built, warp the player into it
  /** the room a floor's trial is fought in */
  function pickArena(g) {
    const fl = g.floor;
    if (g.run.mode === 'rush') return fl.rooms[fl.bossId];
    const rng = new ED.RNG(g.run.seed + ':gauntlet:' + g.floorNum), normals = fl.rooms.filter(r => r.type === 'normal' && r.id !== fl.startId);
    const clean = normals.filter(r => !r.puzzle && !(r.holds && r.holds.length));
    const pool = clean.length ? clean : normals; return pool.length ? rng.pick(pool) : fl.rooms[fl.bossId];
  }
  ED.hook('floorStart', V, (g) => { if (!arenaMode(g)) return; const room = pickArena(g); g.floor.trial = { room: room.id, warped: false }; });
  /** move the player to a room without a door transition (same steps the debug jump uses) */
  function warp(g, room, x, y) {
    g.trans = null; g.transT = 0; g.modal = null;
    for (const e of g.floor.edges) if (e.a === room.id || e.b === room.id) e.revealed = true;
    g.enterRoom(room, null); g.player.x = x; g.player.y = y; g.player.vx = g.player.vy = 0;
  }
  ED.hook('tick', V, (g) => {
    if (!arenaMode(g) || !g.floor || !g.floor.trial || g.floor.trial.warped || g.modal || g.player.dead || !g.room || g.room.id !== g.floor.startId) return;
    const t = g.floor.trial, room = g.floor.rooms[t.room]; t.warped = true;
    warp(g, room, 480, g.run.mode === 'rush' ? 440 : 420);
    if (g.run.mode === 'rush' && g.floorNum === 1) {                                   // a first pick before the first fight
      const rng = new ED.RNG(g.run.seed + ':rushstart'), offers = []; for (let i = 0; i < 3; i++) offers.push(I.rollRelic(rng, 2, { relics: g.player.relics, noRisk: true, exclude: offers.map(o => o.id) }));
      g.offerChoice(offers, 480, 330); g.toast('Take a relic before the first boss.', '#7fe0c0', 200);
    }
  });
  // the rest of the floor is sealed: a door transition into any other room sends you straight back
  ED.hook('roomEnter', V, (g, room) => {
    const t = g.floor && g.floor.trial; if (!t || !t.warped) return;
    if (room.id !== t.room) { g.after(1, () => { if (g.room && g.room.id !== t.room) { warp(g, g.floor.rooms[t.room], 480, 410); g.toast('The way out is sealed — finish the trial, then descend.', '#7fe0c0', 150); } }); return; }
    // Gauntlet: replace the room's encounter with a long, hard one (named foes from the Hunt keep their place)
    const rt = g.rt; if (g.run.mode !== 'gauntlet' || rt.gauntlet || !rt.enc) return; rt.gauntlet = true;
    const keep = [].concat(...rt.enc.waves).filter(e => e.extra), rng = new ED.RNG(g.run.seed + ':gwaves:' + g.floorNum);
    const waves = D.composeWaves(g.floorNum, rng, { waveBonus: 3, budgetMult: 1.2, eliteMult: 1.6 });
    for (const e of keep) waves[waves.length - 1].push(e);
    rt.enc.waves = waves; rt.enc.idx = 0;
  });

  // ------------------------------------------------------------------ rewards
  const spoils = (g, kinds, y, label, minRank) => {
    const p = g.player, rng = g.rt.rng.fork('trial' + g.floorNum + label), offers = I.rollOffers(rng, g.floorNum + 1, 3, { luck: p.st.luck + 1, relics: p.relics, minRank: minRank || 1, kinds });
    if (offers.length) g.offerChoice(offers, 480, y); return offers.length;
  };
  ED.hook('roomClear', V, (g, room) => {
    const t = g.floor && g.floor.trial; if (!t || !t.warped || room.id !== t.room) return;
    if (g.run.mode === 'rush') { if (room.type === 'boss') { spoils(g, { relic: 1 }, 150, 'cache', 2); g.toast('Rush cache: choose a bonus relic.', '#7fe0c0', 200); } return; }
    // Gauntlet: a relic, a piece of gear, some health, the stairs
    const F = g.floorNum, p = g.player;
    spoils(g, { relic: 1 }, 120, 'relic', 1); spoils(g, { weapon: 3, armor: 3, active: 1 }, 250, 'gear', 1);
    g.addInter({ type: 'healfont', x: 330, y: 400, r: 18, color: '#ff7aa0', prompt: () => 'Restore 60% health', use: (gg, it) => { gg.healPlayer(Math.ceil(p.maxHp * 0.6)); it.dead = true; gg.ringFx(p.x, p.y, 10, 90, '#ff7aa0', 24, 5); gg.sfx('heal'); } });
    g.addInter({ type: 'stairs', x: 480, y: 430, r: 24, range: 46, color: '#cfd8ff', prompt: () => 'Descend to floor ' + (F + 1), use: (gg) => gg.nextFloor() });
    g.toast('Arena cleared! Choose a relic and a piece of gear.', '#7fe0c0', 220);
  });

  // ------------------------------------------------------------------ records, feats
  ED.hook('runEnd', V, (g, victory) => {
    const r = g.run, T = meta(), id = r.mode || 'normal'; if (!r) return;
    T.runs[id] = (T.runs[id] || 0) + 1; const prev = T.best[id] || { floor: 0 };
    if (r.floorNum > prev.floor) { T.best[id] = { floor: r.floorNum, edition: P.stamp(), cls: r.classId, victory: !!victory }; r.trialBest = id; }
    ED.save.save();
  });
  if (ED.legacy) {
    const F = ED.legacy.FEATS, M = ED.legacy.FEAT;
    const add = (f) => { f.pack = V; f.need = V; F.push(f); M[f.id] = f; };
    add({ id: 'rush3', name: 'Rush Contender', desc: 'Defeat 3 bosses in one Boss Rush.', title: 'the Contender', test: x => x.run.mode === 'rush' && x.run.bossesKilled.length >= 3, prog: x => [x.run.mode === 'rush' ? x.run.bossesKilled.length : 0, 3] });
    add({ id: 'rush7', name: 'Rush Champion', desc: 'Defeat 7 bosses in one Boss Rush.', title: 'Rush Champion', test: x => x.run.mode === 'rush' && x.run.bossesKilled.length >= 7, prog: x => [x.run.mode === 'rush' ? x.run.bossesKilled.length : 0, 7] });
    add({ id: 'gaunt5', name: 'Arena Veteran', desc: 'Clear 5 arenas in one Gauntlet.', title: 'Arena Veteran', test: x => x.run.mode === 'gauntlet' && x.run.roomsCleared >= 5, prog: x => [x.run.mode === 'gauntlet' ? x.run.roomsCleared : 0, 5] });
    add({ id: 'chaos8', name: 'Embrace the Chaos', desc: 'Reach floor 8 with a Chaos Kit.', title: 'the Unpredictable', test: x => x.run.mode === 'chaos' && x.run.floorNum >= 8, prog: x => [x.run.mode === 'chaos' ? x.run.floorNum : 0, 8] });
  }

  // ------------------------------------------------------------------ drawing: HUD badge, mode button, mode scene, end line
  const UI = () => ED.ui;
  ED.hook('hud', V, (g, c) => {
    const id = g.run && g.run.mode; if (!id || id === 'normal' || g.scene === 'intro') return; const m = BY[id];
    UI().text(c, m.name.toUpperCase() + (id === 'rush' ? '  ·  ' + g.run.bossesKilled.length + ' down' : id === 'gauntlet' ? '  ·  ' + g.run.roomsCleared + ' cleared' : ''), 14, C.HUD + 16, 11, m.color, 'left', true);
  });
  ED.hook('selectUI', V, (g, c) => {
    const id = modeId(), m = BY[id], b = meta().best[id];
    UI().button(c, 'mode', 'MODE: ' + m.name.toUpperCase(), C.W - 300, 484, 210, 44, { size: 13, color: m.color });
    if (id !== 'normal' && b) UI().text(c, 'best: floor ' + b.floor, C.W - 195, 544, 10, '#9a9ab8', 'center', false);
  });
  ED.hook('endUI', V, (g, c) => {
    const r = g.run; if (!r.mode || r.mode === 'normal') return; const m = BY[r.mode], b = meta().best[r.mode];
    UI().text(c, m.name + (r.trialBest ? ' — NEW BEST: floor ' + b.floor : b ? ' — best floor ' + b.floor : ''), 480, 160 + 150, 12, m.color, 'center');
  });
  ED.sceneImpl.mode = {
    draw(g, c) {
      const u = UI(), T = meta(), cur = modeId();
      u.shadow(c, 'CHOOSE A MODE', C.W / 2, 56, 32, '#7fe0c0', 'center');
      u.text(c, 'Applies to your next run. Your class, seed, pacts and every update you have switched on still apply.', C.W / 2, 80, 12, '#a8a8c8', 'center', false);
      MODES.filter(m => P.ok(m)).forEach((m, i) => {
        const y = 108 + i * 108, on = cur === m.id, b = T.best[m.id];
        u.button(c, 'pick:' + m.id, '', 90, y, 780, 98, { color: m.color, selected: on });
        c.fillStyle = on ? m.color : '#2a2a3c'; c.beginPath(); c.arc(130, y + 49, 14, 0, TAU); c.fill(); c.strokeStyle = '#10101c'; c.lineWidth = 3; c.stroke(); if (on) { c.fillStyle = '#10101c'; c.beginPath(); c.arc(130, y + 49, 6, 0, TAU); c.fill(); }
        u.text(c, m.name, 166, y + 34, 22, on ? m.color : '#e0e0f0');
        u.wrap(c, m.desc, 166, y + 58, 560, 16, 12, on ? '#e8e8f8' : '#a8a8c8');
        u.text(c, b ? 'Best: floor ' + b.floor : 'No run yet', 850, y + 40, 14, b ? m.color : '#6a6a88', 'right');
        u.text(c, (T.runs[m.id] || 0) + ' run' + ((T.runs[m.id] || 0) === 1 ? '' : 's') + (b ? '  ·  ' + b.edition : ''), 850, y + 62, 10, '#8a8aa8', 'right', false);
      });
      u.button(c, 'back', 'Done', C.W / 2 - 100, 560, 200, 40, { size: 15, color: '#6ee07a' });
    },
    update(g, a, inp) {
      if (a === 'back' || inp.consume('back')) { ED.menus.go(g, 'select'); return; }
      if (a && a.indexOf('pick:') === 0 && ED.trials.set(a.slice(5))) g.sfx('ui');
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

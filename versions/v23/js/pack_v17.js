/* EMBERDEEP — pack_v17.js : v17 "CROSSROADS" — the descent stops being a straight line.
 *
 *  After a MEGA boss the road forks.  The plain way down always exists; beside it there may be a SEALED door, and sometimes a way that is
 *  not there at all until you have done something.  Nothing says what a door wants — only a glyph, a line of flavour, an odd wall.
 *  Every gate is opened a different way:
 *    SECRET WALL   a hairline crack in the boss room: bomb it.
 *    SIGIL         a permanent mark, taken from certain mini bosses or secret altars; it opens that door in every later run.
 *    CARRIED ITEM  something found earlier in the same land (a lantern, a seed, a feather) that you must still be holding.
 *    DEED          something you did on the way: lit no fuse, took no wound in the boss fight, did not linger, dared.
 *    MEMORY        a record from an earlier run (a fallen titan, a deep floor, three sigils): the door simply appears.
 *    TOLL          an altar that wants gold or blood.
 *  Which worlds are offered where comes from the run seed (never the shared RNG).  A ROUTES page on the title screen remembers every
 *  world you have entered, every road you have taken and every sigil you carry — the rest stay silhouettes.
 *  The first new land, THE SUNKEN OSSUARY (tides that flood the floor, drowners, bones that stand again), ships in this pack.
 *  The world registry itself is core (js/worlds.js): worlds from other updates plug into the same doors.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds, A = ED.ai;
  const TAU = U.TAU, V = 'v17';
  const L = (name, o) => [name, o];

  P.define({
    id: 'v17', name: 'CROSSROADS', tag: 'more than one way down', color: '#7fd8c0',
    blurb: 'After a MEGA boss the road forks: the plain way, a sealed door, sometimes a wall that has to be broken or a way that is simply not there until you have earned it. Sigils, carried relics, deeds and memories open new lands — starting with the Sunken Ossuary — and a ROUTES page remembers every door you have found.',
  });

  // ------------------------------------------------------------------ the save: meta.route (everything merge-safe)
  const KEYS = ['discovered', 'seen', 'edges', 'sigils', 'learned', 'rumours', 'counters', 'visits'];
  const meta = () => {
    const m = ED.save.meta; let r = m.route; if (!r || typeof r !== 'object' || Array.isArray(r)) r = m.route = {};
    for (const k of KEYS) if (!r[k] || typeof r[k] !== 'object' || Array.isArray(r[k])) r[k] = {};
    return r;
  };
  /** what this run has done toward its doors (never saved) */
  const cross = (g) => { const r = g.run; return r.cross || (r.cross = { exits: {}, carry: {}, cracked: {}, paid: {}, tierStart: {}, bombs: {}, dares0: {}, curio: {}, bossDmg0: {}, log: [], detours: 0, sigilsNow: [] }); };
  const sealed = (g) => !!g.run && (g.run.mode === 'rush' || g.run.mode === 'gauntlet');       // Boss Rush / Gauntlet seal the dungeon: no roads there
  const BASE = { id: 'deep', name: 'The Deep Halls', short: 'DEEP HALLS', color: '#9a8cff', rule: 'The dungeon as it always was.', enemies: [], pack: 'v1' };
  const worldOf = (w) => w || BASE;

  // ------------------------------------------------------------------ sigils: permanent marks (meta.route.sigils)
  const SIGILS = [
    { id: 'tide', name: 'Tide', color: '#6fd8e8', mini: 'slimeking', gain: 'Cold water runs along its lines.', door: 'Wave-like grooves are cut into the stone.', rumour: 'a mark of rolling water, kept by the Slime King' },
    { id: 'gear', name: 'Gear', color: '#e8c060', mini: 'sentry', gain: 'It ticks, very faintly.', door: 'A ring of brass teeth is set into the arch.', rumour: 'a brass cog, worn by the Clockwork Sentry' },
    { id: 'thorn', name: 'Thorn', color: '#8ad06a', mini: 'broodmother', gain: 'It pricks back.', door: 'Sharp little spines frame the doorway.', rumour: 'a crown of spines, taken from the Brood Mother' },
    { id: 'ash', name: 'Ash', color: '#ff8a4a', mini: 'cinderwitch', gain: 'It is warm, and never stops being warm.', door: 'A scorched flame-mark blackens the keystone.', rumour: 'a black flame, carried by the Cinder Witch' },
    { id: 'glass', name: 'Glass', color: '#bfe8ff', mini: 'rimewraith', gain: 'You can see your own eye in it.', door: 'A cold facet, polished like a mirror, is set in the door.', rumour: 'a polished facet, lifted from the Rimewraith' },
    { id: 'crown', name: 'Crown', color: '#ffd24a', mini: null, gain: 'It is heavier than it looks.', door: 'A crown of nine points is carved above the lintel.', rumour: 'a crown of nine points, left on an altar in a secret room' },
  ];
  const SIG = {}; for (const s of SIGILS) SIG[s.id] = s;
  const SIG_OF_MINI = {}; for (const s of SIGILS) if (s.mini) SIG_OF_MINI[s.mini] = s;
  const sigilCount = () => SIGILS.filter(s => meta().sigils[s.id]).length;

  // ------------------------------------------------------------------ carried items (this run only)
  const CURIOS = {
    lantern: { name: 'Hooded Lantern', color: '#ffd24a', gain: 'A hooded lantern, still warm. Some darkness would flee from it.', door: 'It is too dark here to see where this leads.', rumour: 'a lantern that was lit long ago' },
    emberseed: { name: 'Ember Seed', color: '#ff8a4a', gain: 'A seed that glows like a coal. Things that grow would fear it.', door: 'Thorns have grown across the way. They would burn.', rumour: 'a seed that glows like a coal' },
    feather: { name: 'Storm Feather', color: '#bfe0ff', gain: 'It never quite falls when you let go of it.', door: 'A wind blows through the arch, and it pulls toward something light.', rumour: 'a feather that does not fall' },
  };

  // ------------------------------------------------------------------ deeds: things done on the way
  const DEEDS = {
    bombless: { name: 'No fuse lit', door: 'The air is still. Nothing that was lit may enter.', rumour: 'a whole land crossed without lighting a single fuse', test: (g, T_) => ((cross(g).bombs[T_ - 1] | 0) === 0) },
    flawless: { name: 'Untouched', door: 'No wound may be carried through.', rumour: 'the last guardian felled without taking a single wound', test: (g, T_) => { const c = cross(g).bossDmg0[T_ - 1]; return c !== undefined && g.run.damageTaken === c; } },
    swift: { name: 'Swift', door: 'The way is open to those who did not linger.', rumour: 'a land crossed in under thirteen minutes', test: (g, T_) => { const s = cross(g).tierStart[T_ - 1]; return s !== undefined && g.run.frames - s <= 13 * 3600; } },
    daring: { name: 'Daring', need: 'v16', door: 'It favours those who have courted danger.', rumour: 'two dares won on the way', test: (g, T_) => ((g.run.dares && g.run.dares.won) || 0) - (cross(g).dares0[T_ - 1] | 0) >= 2 },
  };

  // ------------------------------------------------------------------ memories: records from earlier runs
  const LEGACY = {
    titan: { name: 'a fallen titan', rumour: 'a titan of the deep, slain in some earlier life', test: () => Object.keys(ED.save.meta.unlocked.bosses || {}).some(id => { const d = ED.bosses.def(id); return !!(d && d.mega); }) },
    deep20: { name: 'the twentieth floor', rumour: 'the twentieth floor, once reached', test: () => ED.save.meta.bestFloor >= 20 },
    sigils3: { name: 'three sigils', rumour: 'three sigils carried at once', test: () => sigilCount() >= 3 },
    victor: { name: 'a victory', rumour: 'a run won and cashed out', test: () => ED.save.meta.victories >= 1 },
  };

  // ------------------------------------------------------------------ the gate kinds
  const KINDS = {
    crack: { name: 'a crack in the wall', secret: true, color: '#d8c8a0' },
    sigil: { name: 'a sigil door', color: '#9ad8ff' },
    carry: { name: 'a carried item', color: '#ffd24a' },
    deed: { name: 'a deed', color: '#7fe0a0' },
    legacy: { name: 'a memory', secret: true, color: '#c8a0ff' },
    cost: { name: 'a toll', color: '#ffb04a' },
  };
  // the six lands of v3 can be side exits too (when v3 is on); other updates' worlds name their own door in `gate`
  const V3_GATES = {
    crypts: { kind: 'cost', hp: 1 }, mirewood: { kind: 'deed', id: 'bombless' }, glacial: { kind: 'sigil', id: 'glass' },
    foundry: { kind: 'sigil', id: 'ash' }, void: { kind: 'carry', id: 'lantern' }, storm: { kind: 'deed', id: 'swift' },
  };
  const V3_RISK = { crypts: 0, mirewood: 0, glacial: 1, foundry: 2, void: 3, storm: 2 };
  for (const id in V3_RISK) if (W.byId[id] && W.byId[id].risk === undefined) W.byId[id].risk = V3_RISK[id];       // read only for a ROUTED world: the straight line never feels it
  const gateOf = (w) => (w && (w.gate || V3_GATES[w.id])) || null;
  const gateNeed = (s) => s.need || (s.kind === 'deed' && DEEDS[s.id] && DEEDS[s.id].need) || (s.kind === 'legacy' && LEGACY[s.id] && LEGACY[s.id].need) || null;
  const gateUsable = (s) => { if (!s || !KINDS[s.kind]) return false; if (s.kind === 'sigil' && !SIG[s.id]) return false; if (s.kind === 'carry' && !CURIOS[s.id]) return false; if (s.kind === 'deed' && !DEEDS[s.id]) return false; if (s.kind === 'legacy' && !LEGACY[s.id]) return false; const n = gateNeed(s); return !n || P.on(n); };

  /** the state of one door right now: visible? open? and the flavour line a sealed one gives */
  function gateState(g, ex) {
    const s = ex.gate; if (!s) return { visible: true, open: true, hint: '' };
    const cr = cross(g), T_ = ex.T;
    switch (s.kind) {
      case 'crack': { const o = !!cr.cracked[T_]; return { visible: o, open: o, hint: '' }; }
      case 'sigil': return { visible: true, open: !!meta().sigils[s.id], hint: SIG[s.id].door };
      case 'carry': return { visible: true, open: !!cr.carry[s.id], hint: CURIOS[s.id].door };
      case 'deed': { const d = DEEDS[s.id]; return { visible: true, open: !!d.test(g, T_), hint: d.door }; }
      case 'legacy': { const o = !!LEGACY[s.id].test(g); return { visible: o, open: o, hint: '' }; }
      case 'cost': return { visible: true, open: !!cr.paid[T_], hint: 'An offering bowl waits beside the arch. [E] to make an offering.' };
    }
    return { visible: false, open: false, hint: '' };
  }
  /** what a rumour reveals about a door */
  function rumourText(w) {
    const s = gateOf(w), n = w.name; if (!s) return n + ': the way down is plain.';
    switch (s.kind) {
      case 'crack': return n + ': the door is a wall. Break it where the last guardian fell.';
      case 'sigil': return n + ': sealed with ' + SIG[s.id].rumour + '.';
      case 'carry': return n + ': you must still be carrying ' + CURIOS[s.id].rumour + '.';
      case 'deed': return n + ': it opens for ' + DEEDS[s.id].rumour + '.';
      case 'legacy': return n + ': it opens for ' + LEGACY[s.id].rumour + ' — and for no one else.';
      case 'cost': return n + ': an altar by the door wants ' + (s.gold ? s.gold + ' gold' : '') + (s.gold && s.hp ? ' or ' : '') + (s.hp ? 'a heart of your own' : '') + '.';
    }
    return n;
  }

  // ------------------------------------------------------------------ the graph: which doors this seed offers after a MEGA floor
  /** exits for the road after the tier that floor belongs to: the plain way, maybe one visible side door, maybe one hidden one.  Pure in (seed, tier, switched-on updates). */
  function exitsFor(g, floor) {
    const cr = cross(g), T_ = W.tierOf(floor) + 1; if (cr.exits[T_]) { const at = W.worldOfTier(T_ - 1), list = cr.exits[T_]; return list.some(e => e.id !== 'default' && e.world === at) ? list.filter(e => e.id === 'default' || e.world !== at) : list; }          // (offers are cached when the land begins; a way found inside the land (v21) may have made the land you end in one of them: it is not offered again)
    const base = W.spineAt(T_), here = W.worldOfTier(T_ - 1), rng = new ED.RNG(g.run.seed + ':route:' + T_);
    const pool = W.candidates(T_).filter(w => w !== base && w !== here && gateUsable(gateOf(w)) && (gateOf(w).kind !== 'legacy' || LEGACY[gateOf(w).id].test(g)));          // a memory door that cannot exist yet does not take the hidden slot from one that can
    const vis = rng.shuffle(pool.filter(w => !KINDS[gateOf(w).kind].secret)), hid = rng.shuffle(pool.filter(w => KINDS[gateOf(w).kind].secret));
    const r1 = rng.next(), r2 = rng.next();                      // always drawn, so a pool change never shifts the other roll
    const out = [{ id: 'default', world: base, gate: null, T: T_ }];
    if (vis.length && r1 < 0.8) out.push({ id: vis[0].id, world: vis[0], gate: gateOf(vis[0]), T: T_ });
    if (hid.length && r2 < 0.55) out.push({ id: hid[0].id, world: hid[0], gate: gateOf(hid[0]), T: T_ });
    return (cr.exits[T_] = out);
  }
  /** is the road system live for this run right now? */
  const live = (g) => !!g.run && !!g.floor && !sealed(g);

  // ------------------------------------------------------------------ plain-shape glyphs (the only "art" a door needs)
  const glow = (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); };
  function glyphSigil(c, id, x, y, r, col) {
    c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(1.5, r * 0.16); c.lineCap = 'round'; c.lineJoin = 'round';
    switch (id) {
      case 'tide': for (let k = -1; k <= 1; k++) { c.beginPath(); for (let i = 0; i <= 12; i++) { const px = -r + i * r / 6, py = k * r * 0.5 + Math.sin(i * 0.9) * r * 0.22; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); } break;
      case 'gear': c.beginPath(); c.arc(0, 0, r * 0.55, 0, TAU); c.stroke(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.stroke(); } c.beginPath(); c.arc(0, 0, r * 0.18, 0, TAU); c.fill(); break;
      case 'thorn': for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(k * r * 0.6 - r * 0.22, r * 0.8); c.lineTo(k * r * 0.6, -r * (k ? 0.5 : 0.95)); c.lineTo(k * r * 0.6 + r * 0.22, r * 0.8); c.closePath(); c.stroke(); } break;
      case 'ash': c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(r * 0.9, -r * 0.1, 0, r * 0.9); c.quadraticCurveTo(-r * 0.9, -r * 0.1, 0, -r); c.stroke(); c.beginPath(); c.moveTo(0, -r * 0.1); c.quadraticCurveTo(r * 0.3, r * 0.3, 0, r * 0.6); c.quadraticCurveTo(-r * 0.3, r * 0.3, 0, -r * 0.1); c.fill(); break;
      case 'glass': c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.7, 0); c.lineTo(0, r); c.lineTo(-r * 0.7, 0); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(-r * 0.7, 0); c.lineTo(r * 0.7, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); break;
      case 'crown': c.beginPath(); c.moveTo(-r, r * 0.6); c.lineTo(-r, -r * 0.5); c.lineTo(-r * 0.5, 0); c.lineTo(0, -r * 0.8); c.lineTo(r * 0.5, 0); c.lineTo(r, -r * 0.5); c.lineTo(r, r * 0.6); c.closePath(); c.stroke(); break;
    }
    c.restore();
  }
  function glyphCurio(c, id, x, y, r, col) {
    c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(1.5, r * 0.14); c.lineCap = 'round';
    if (id === 'lantern') { c.beginPath(); c.arc(0, -r * 0.55, r * 0.4, Math.PI, 0); c.stroke(); c.fillRect(-r * 0.5, -r * 0.35, r, r * 0.25); c.strokeRect(-r * 0.5, -r * 0.1, r, r * 0.85); c.fillStyle = 'rgba(255,240,170,0.9)'; c.fillRect(-r * 0.28, r * 0.05, r * 0.56, r * 0.55); }
    else if (id === 'emberseed') { c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(r * 0.8, 0, 0, r * 0.9); c.quadraticCurveTo(-r * 0.8, 0, 0, -r); c.fill(); c.fillStyle = '#fff2c0'; c.beginPath(); c.arc(0, r * 0.1, r * 0.25, 0, TAU); c.fill(); }
    else if (id === 'feather') { c.beginPath(); c.moveTo(-r * 0.7, r * 0.8); c.quadraticCurveTo(r * 0.2, r * 0.2, r * 0.8, -r * 0.9); c.stroke(); for (let k = 0; k < 4; k++) { const t = 0.15 + k * 0.2, px = -r * 0.7 + r * 1.5 * t, py = r * 0.8 - r * 1.7 * t; c.beginPath(); c.moveTo(px, py); c.lineTo(px - r * 0.45, py - r * 0.1); c.stroke(); c.beginPath(); c.moveTo(px, py); c.lineTo(px + r * 0.3, py + r * 0.28); c.stroke(); } }
    c.restore();
  }
  /** the mark a door wears: a sigil, a carried thing, a crack, a star (deed), a coin (toll), an open eye (memory) */
  function glyphGate(c, s, x, y, r, col) {
    if (!s) return;
    if (s.kind === 'sigil') return glyphSigil(c, s.id, x, y, r, SIG[s.id].color);
    if (s.kind === 'carry') return glyphCurio(c, s.id, x, y, r, CURIOS[s.id].color);
    c.save(); c.translate(x, y); c.strokeStyle = KINDS[s.kind].color; c.fillStyle = KINDS[s.kind].color; c.lineWidth = Math.max(1.5, r * 0.15); c.lineCap = 'round'; c.lineJoin = 'round';
    if (s.kind === 'crack') { c.beginPath(); c.moveTo(-r * 0.2, -r); c.lineTo(r * 0.25, -r * 0.4); c.lineTo(-r * 0.3, 0); c.lineTo(r * 0.3, r * 0.5); c.lineTo(0, r); c.stroke(); }
    else if (s.kind === 'deed') { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * TAU / 10, rr = k % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.stroke(); }
    else if (s.kind === 'cost') { c.beginPath(); c.arc(0, 0, r * 0.85, 0, TAU); c.stroke(); c.fillRect(-r * 0.12, -r * 0.5, r * 0.24, r); }
    else { c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(0, -r * 0.9, r, 0); c.quadraticCurveTo(0, r * 0.9, -r, 0); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.32, 0, TAU); c.fill(); }
    c.restore();
  }
  ED.route = { SIGILS, SIG, CURIOS, DEEDS, LEGACY, KINDS, V3_GATES, BASE, meta, cross, exitsFor, gateState, gateOf, rumourText, live, glyphSigil, glyphCurio, glyphGate };

  // ------------------------------------------------------------------ taking a road
  /** commit to an exit: the choice is written into the run (the world of the next five floors becomes f(floor, run.route)), the road into the records */
  function commit(g, ex) {
    const cr = cross(g), M = meta(), T_ = ex.T, from = W.worldOfTier(T_ - 1), fromId = (from || BASE).id, toId = worldOf(ex.world).id;
    g.run.route = g.run.route || {};
    if (ex.id !== 'default') { g.run.route[T_] = ex.world.id; cr.detours++; M.counters.detours = (M.counters.detours | 0) + 1; M.learned[toId] = true; }
    else delete g.run.route[T_];
    const ek = fromId + '>' + toId; M.edges[ek] = (M.edges[ek] | 0) + 1;
    cr.log.push({ T: T_, from: fromId, to: toId, gate: ex.gate ? ex.gate.kind : null });
    ED.save.save();
    g.toast(ex.id === 'default' ? 'The plain way down.' : 'You take the road to ' + worldOf(ex.world).name + '.', worldOf(ex.world).color, 150); g.sfx('door');
    g.nextFloor();
  }
  function usePortal(g, it) {
    const ex = it.exit, st = gateState(g, ex); if (!st.visible) return;
    if (!st.open) {
      if (ex.gate.kind === 'cost') { g.modal = { type: 'route_cost', ex, sel: 0 }; return; }
      g.toast(st.hint, KINDS[ex.gate.kind].color, 230); g.sfx('deny'); return;
    }
    commit(g, ex);
  }
  function portalPrompt(g, it) {
    const ex = it.exit, st = it.st || gateState(g, ex), w = worldOf(ex.world), known = !!meta().discovered[w.id];
    if (!st.open) return ex.gate.kind === 'cost' ? 'Make an offering' : 'A sealed way';
    if (ex.id === 'default') return 'Descend to floor ' + (g.floorNum + 1) + (known ? ' — ' + w.name : '');
    return 'Take the road' + (known ? ' to ' + w.name : '');
  }
  function updatePortal(g, it) {
    const was = it.st && it.st.visible, st = it.st = gateState(g, it.exit); it.disabled = !st.visible;
    if (st.visible && !was) { const id = worldOf(it.exit.world).id, M = meta(); if (!M.seen[id]) { M.seen[id] = true; ED.save.save(); } if (it.exit.gate && it.exit.gate.kind === 'legacy') { g.toast('A door you did not see before stands open.', KINDS.legacy.color, 200); g.sfx('crack'); } }
  }
  ED.interDraw.portal = (c, it, t, g, near) => {
    const ex = it.exit, st = it.st; if (!st || !st.visible) return;
    const w = worldOf(ex.world), M = meta(), known = !!M.discovered[w.id], open = st.open, col = known ? w.color : '#aab0d0', x = it.x, y = it.y, pulse = 0.5 + 0.5 * Math.sin(t * 0.08 + it.id);
    glow(c, x, y, open ? 46 : 30, col, open ? 0.16 + 0.1 * pulse : 0.07);
    c.fillStyle = open ? '#10101c' : '#15131c'; c.beginPath(); c.arc(x, y, 26, 0, TAU); c.fill();
    if (open) for (let k = 0; k < 5; k++) { c.strokeStyle = U.rgba(col, 0.85 - k * 0.15); c.lineWidth = 3; c.beginPath(); c.arc(x, y, 22 - k * 4, k * 0.8 + t * 0.03, k * 0.8 + t * 0.03 + 3.8); c.stroke(); }
    else { c.strokeStyle = U.rgba(col, 0.5); c.lineWidth = 3; c.beginPath(); c.arc(x, y, 24, 0, TAU); c.stroke(); glyphGate(c, ex.gate, x, y, 11, col); }
    const UI = ED.ui; UI.text(c, known ? w.name : '???', x, y - 38, 11, open ? col : '#8a8aa8', 'center');
    if (known && w.risk > 0 && ex.id !== 'default') for (let k = 0; k < Math.min(4, w.risk); k++) ED.icons.draw(c, 'skull', x + (k - (Math.min(4, w.risk) - 1) / 2) * 11, y - 52, 4, '#ff6a6a');
    UI.text(c, ex.id === 'default' ? 'FLOOR ' + (g.floorNum + 1) : open ? 'OPEN' : 'SEALED', x, y + 46, 9, '#9a9ab8', 'center', false);
  };

  /** the plain stairs of a MEGA floor stay exactly what they were — the way down that never needs a key — and the doors this seed offers stand beside them */
  ED.hook('stairs', V, (g, stairs) => {
    if (!live(g) || !g.floor.isMega) return;
    const exs = exitsFor(g, g.floorNum); if (exs.length < 2) return;                    // nothing to choose: the stairs are all there is
    const rt = g.rt, slots = [[300, 458], [660, 458]]; let vi = 0;
    stairs.exit = exs[0]; stairs.st = { visible: true, open: true, hint: '' }; stairs.prompt = () => portalPrompt(g, stairs); stairs.use = (g2) => commit(g2, exs[0]);
    for (const ex of exs.slice(1)) {
      let pos;
      if (ex.gate.kind === 'crack') { const k = rt.crack; if (k && k.T === ex.T) pos = [k.px, k.py]; else { cross(g).cracked[ex.T] = true; pos = slots[1]; } }
      else if (KINDS[ex.gate.kind].secret) pos = slots[1];
      else pos = slots[vi++ % 2];
      const it = g.addInter({ type: 'portal', x: pos[0], y: pos[1], r: 26, range: 50, color: worldOf(ex.world).color, exit: ex, prompt: () => portalPrompt(g, it), use: usePortal, update: updatePortal });
      it.st = gateState(g, ex); it.disabled = !it.st.visible;
    }
  });
  // the plain stairs say where they lead once you know the land
  ED.hook('draw', V, (g, c) => {
    for (const it of g.inters) if (it.type === 'stairs' && it.exit && !it.dead) {
      const w = worldOf(it.exit.world), known = !!meta().discovered[w.id]; ED.ui.text(c, known ? w.name : '???', it.x, it.y - 38, 11, known ? w.color : '#8a8aa8', 'center');
    }
  });

  // ------------------------------------------------------------------ the secret wall (a bomb in the boss room opens it)
  const sideOf = (dir) => { const d = ED.rooms.DOOR_TILES[dir], x0 = d[0][0] * 32, y0 = d[0][1] * 32; return { x0, y0, w: (d[1][0] - d[0][0] + 1) * 32, h: (d[1][1] - d[0][1] + 1) * 32 }; };
  function armCrack(g, room) {
    const rt = g.rt, ex = exitsFor(g, g.floorNum).find(e => e.gate && e.gate.kind === 'crack'); if (!ex || cross(g).cracked[ex.T]) return;
    const free = ED.DIRS.filter(d => !room.doors[d]), rng = new ED.RNG(g.run.seed + ':route:crack:' + g.floorNum); rng.shuffle(free);
    for (const dir of free) {
      const c = ED.rooms.doorCenter(dir), v = ED.DIR_V[dir], px = c.x - v[0] * 46, py = c.y - v[1] * 46;
      if (ED.phys.blocked(g, px, py, 16, false, false) || ED.phys.blocked(g, px - v[0] * 0, py, 8, false, false)) continue;
      rt.crack = { dir, x: c.x, y: c.y, px, py, T: ex.T };
      const prev = rt.onExplode;
      rt.onExplode = (g2, x, y, r) => { if (prev) prev(g2, x, y, r); const k = g2.rt.crack; if (k && g2.room.cleared && !cross(g2).cracked[k.T] && Math.hypot(x - k.x, y - k.y) < r + 40) openCrack(g2, k); };
      return;
    }
  }
  function openCrack(g, k) {
    cross(g).cracked[k.T] = true; g.burst(k.x, k.y, 34, '#8a7a6a', 5, 34, { size: 4 }); g.shake(8); g.sfx('crack'); g.flashScreen('#d8c8a0', 0.18);
    g.toast('A secret passage crumbles open!', KINDS.crack.color, 200);
  }
  ED.hook('under', V, (g, c, t) => {
    const rt = g.rt, k = rt && rt.crack; if (!k || !g.room.cleared) return;
    const s = sideOf(k.dir), open = cross(g).cracked[k.T];
    c.save();
    if (open) { c.fillStyle = '#07070d'; c.fillRect(s.x0, s.y0, s.w, s.h); c.fillStyle = '#6a5a4a'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(k.px + Math.sin(i * 2.3) * 22, k.py + Math.cos(i * 1.7) * 26, 4 + (i % 3) * 2, 0, TAU); c.fill(); } }
    else {
      c.strokeStyle = 'rgba(216,200,160,' + (0.55 + 0.25 * Math.sin(t * 0.05)) + ')'; c.lineWidth = 2; c.lineJoin = 'round';
      const horiz = k.dir === 'N' || k.dir === 'S', cx = s.x0 + s.w / 2, cy = s.y0 + s.h / 2;
      for (const off of [-1, 0, 1]) { c.beginPath(); for (let i = 0; i <= 6; i++) { const u = (i / 6 - 0.5) * (horiz ? s.w : s.h), v = ((i * 37 + off * 11) % 9 - 4) * 1.6; if (horiz) { if (i) c.lineTo(cx + u, cy + v + off * 4); else c.moveTo(cx + u, cy + v + off * 4); } else { if (i) c.lineTo(cx + v + off * 4, cy + u); else c.moveTo(cx + v + off * 4, cy + u); } } c.stroke(); }
    }
    c.restore();
  });
  // a bomb must be to hand: if the boss is down, a crack waits and the player has none, one lies where the guardian fell
  ED.hook('roomClear', V, (g, room) => {
    const rt = g.rt, k = rt && rt.crack; if (!k || room.type !== 'boss' || cross(g).cracked[k.T]) return;
    const p = g.player; if (p.bombs > 0 || g.pickups.some(x => x.type === 'bomb' && !x.dead)) return;
    g.after(60, () => { g.dropPickup('bomb', 480, 330, 1, { still: true }); g.toast('A stray bomb lies here...', '#ff9a3c', 140); });
  });

  // ------------------------------------------------------------------ sigils: taken from certain mini bosses (and one altar), kept for good
  function grantSigil(g, s) {
    const M = meta(); if (M.sigils[s.id]) return false;
    M.sigils[s.id] = true; cross(g).sigilsNow.push(s.id); ED.save.save();
    g.popups.push({ title: 'SIGIL', lines: ['Sigil of ' + s.name, s.gain], t: 0, dur: 330 }); g.sfx('unlock'); g.flashScreen(s.color, 0.2);
    return true;
  }
  ED.hook('miniDefeated', V, (g, spec) => { const s = !spec.revenant && SIG_OF_MINI[spec.defId]; if (s) grantSigil(g, s); });
  /** the one sigil no mini boss holds lies on an altar, in some secret rooms */
  function maybeAltar(g, room) {
    if (g.floorNum < 3 || meta().sigils.crown || !new ED.RNG(g.run.seed + ':route:altar:' + g.floorNum + ':' + room.id).chance(0.35)) return;
    const it = g.addInter({ type: 'sigilaltar', x: 480, y: 270, r: 18, range: 56, color: SIG.crown.color, prompt: () => it.used ? null : 'Touch the altar', use: (g2, i2) => { if (!i2.used) { i2.used = true; grantSigil(g2, SIG.crown); } } });
  }
  ED.interDraw.sigilaltar = (c, it, t) => {
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(it.x, it.y + 16, 24, 8, 0, 0, TAU); c.fill();
    c.fillStyle = it.used ? '#3a3a44' : '#5a5a70'; c.fillRect(it.x - 18, it.y - 4, 36, 20); c.fillStyle = it.used ? '#2a2a34' : '#7a7a96'; c.fillRect(it.x - 14, it.y - 14, 28, 12);
    if (!it.used) { glow(c, it.x, it.y - 26, 26, it.color, 0.3 + 0.1 * Math.sin(t * 0.1)); glyphSigil(c, 'crown', it.x, it.y - 28 + Math.sin(t * 0.07) * 2, 11, it.color); }
  };

  // ------------------------------------------------------------------ carried items: one is hidden in an ordinary room of the land, on floor 2-4 of it
  ED.pickupImpl.curio = {
    collect(g, k) { const cr = cross(g); cr.carry[k.curio] = true; const d = CURIOS[k.curio]; g.toast(d.gain, d.color, 280); g.sfx('pickup'); g.burst(k.x, k.y, 14, d.color, 3, 22); return true; },
    draw(c, k, t, bob) { const d = CURIOS[k.curio]; if (!d) return; glow(c, k.x, k.y, 22, d.color, 0.3 + 0.1 * Math.sin(t * 0.2)); glyphCurio(c, k.curio, k.x, k.y + bob, 9, d.color); },
  };
  ED.hook('floorStart', V, (g) => {
    const cr = cross(g), f = g.floorNum, tier = W.tierOf(f), wi = W.at(f), M = meta(), fl = g.floor; fl.curioRoom = null;
    if (cr.curTier !== tier) {                                                           // a new land: count it, start its clocks
      cr.curTier = tier; cr.tierStart[tier] = g.run.frames; cr.bombs[tier] = 0; cr.dares0[tier] = (g.run.dares && g.run.dares.won) || 0;
      const wid = worldOf(wi && wi.w).id; M.discovered[wid] = true; M.seen[wid] = true; M.visits[wid] = (M.visits[wid] | 0) + 1; ED.save.save();
      if (live(g)) { const ex = exitsFor(g, f).find(e => e.gate && e.gate.kind === 'carry'); if (ex) cr.curio[tier] = { id: ex.gate.id, floor: W.firstFloor(tier) + 1 + new ED.RNG(g.run.seed + ':route:curio:' + tier).int(0, 2) }; }
    }
    const cu = cr.curio[tier];
    if (cu && cu.floor === f && !cu.dropped) { const rooms = fl.rooms.filter(r => r.type === 'normal' && r.id !== fl.startId), near = rooms.filter(r => r.dist <= 4), pool = near.length ? near : rooms; if (pool.length) fl.curioRoom = new ED.RNG(g.run.seed + ':route:curior:' + f).pick(pool).id; }
  });
  ED.hook('roomClear', V, (g, room) => {
    const fl = g.floor, tier = W.tierOf(g.floorNum), cr = cross(g), cu = cr.curio[tier];
    if (cu && !cu.dropped && fl.curioRoom === room.id) { cu.dropped = true; const k = g.dropPickup('curio', 480, 290, 1, { still: true }); k.curio = cu.id; g.toast('Something glints among the wreckage...', CURIOS[cu.id].color, 170); g.sfx('keydrop'); }
    // a side road that bites harder pays for it: more gold and a relic cache after its boss
    const wi = W.at(g.floorNum);
    if (room.type === 'boss' && wi && wi.routed && wi.w.risk >= 2 && !g.rt.detourSpoils) {
      g.rt.detourSpoils = true; g.dropGold(480, 300, Math.round((8 + 2.5 * g.floorNum) * wi.w.risk));
      const p = g.player, offers = I.rollOffers(g.rt.rng.fork('detour'), g.floorNum + 1, 3, { luck: p.st.luck + 1, relics: p.relics, minRank: 1, kinds: { relic: 1 } });
      if (offers.length) { g.offerChoice(offers, 480, 150); g.toast('A harder road, a richer prize — choose a relic.', wi.w.color, 240); }
    }
  });

  // ------------------------------------------------------------------ the wanderer (a rumour for gold) — rare, in the rest room before a MEGA boss
  function maybeWanderer(g, room) {
    if (!new ED.RNG(g.run.seed + ':route:wanderer:' + g.floorNum).chance(0.3)) return;
    const price = 20 + 6 * g.floorNum;
    const it = g.addInter({ type: 'wanderer', x: 300, y: 300, r: 16, range: 60, color: '#b8a8d8', prompt: () => it.used ? null : 'Hear a rumour (' + price + 'g)',
      use: (g2, i2) => {
        const p = g2.player, M = meta(); if (i2.used) return;
        if (p.gold < price) { g2.sfx('deny'); g2.toast('Not enough gold', '#ff6a6a'); return; }
        const T_ = W.tierOf(g2.floorNum) + 1, offered = exitsFor(g2, g2.floorNum).filter(e => e.gate).map(e => e.world), rest = W.candidates(T_).filter(w => gateUsable(gateOf(w)));
        const pick = offered.concat(rest).find(w => !M.rumours[w.id] && !M.learned[w.id]);
        if (!pick) { g2.toast('"Nothing I have not told you already."', '#b8a8d8', 160); return; }
        p.gold -= price; i2.used = true; M.rumours[pick.id] = true; M.seen[pick.id] = true; ED.save.save(); g2.sfx('buy'); g2.toast('"' + rumourText(pick) + '"', '#b8a8d8', 420);
      } });
  }
  ED.interDraw.wanderer = (c, it, t) => {
    const x = it.x, y = it.y + Math.sin(t * 0.05) * 1.5;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(it.x, it.y + 16, 14, 5, 0, 0, TAU); c.fill();
    c.fillStyle = it.used ? '#4a4660' : '#6a5a98'; c.beginPath(); c.moveTo(x - 14, y + 16); c.lineTo(x - 6, y - 10); c.lineTo(x + 6, y - 10); c.lineTo(x + 14, y + 16); c.closePath(); c.fill();
    c.fillStyle = '#2a2040'; c.beginPath(); c.arc(x, y - 12, 8, 0, TAU); c.fill(); c.fillStyle = it.used ? '#7a7a98' : '#ffe9a0'; c.fillRect(x - 4, y - 13, 3, 2); c.fillRect(x + 1, y - 13, 3, 2);
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 14, y + 16); c.lineTo(x + 12, y - 14); c.stroke();
  };

  // ------------------------------------------------------------------ the toll (an altar by the door wants gold or blood)
  const tollGold = (g, s) => s.gold ? Math.round(s.gold + (s.goldPer || 0) * g.floorNum) : 0;
  function payToll(g, ex, kind) {
    const p = g.player, s = ex.gate, cr = cross(g);
    if (kind === 'gold') { const n = tollGold(g, s); if (p.gold < n) { g.sfx('deny'); g.toast('Not enough gold', '#ff6a6a'); return; } p.gold -= n; g.sfx('buy'); }
    else { if (p.maxHp > 12) { p.bonusHp -= 4; I.recalc(p); g.toast('Max HP reduced by 1 heart', '#c05cff'); } else g.hurtPlayerPure(4); g.sfx('curse'); }
    cr.paid[ex.T] = true; g.modal = null; g.burst(p.x, p.y, 22, KINDS.cost.color, 4, 28); g.toast('The toll is paid. The way opens.', KINDS.cost.color, 180);
  }
  ED.modalImpl.route_cost = {
    draw(g, c, m) {
      const s = m.ex.gate, u = ED.ui, w = 520, h = 250, x = (C.W - w) / 2, y = 160, p = g.player, n = tollGold(g, s);
      u.panel(c, x, y, w, h, KINDS.cost.color, 0.97); u.shadow(c, 'AN ALTAR OF TOLLS', C.W / 2, y + 40, 26, KINDS.cost.color, 'center');
      u.text(c, 'A bowl is set beside the door. It waits to be filled.', C.W / 2, y + 68, 13, '#cfd0e0', 'center', false);
      let by = y + 90;
      if (n) { u.button(c, 'gold', 'Pay ' + n + ' gold  (you have ' + p.gold + ')', x + 40, by, w - 80, 40, { disabled: p.gold < n, color: '#ffd24a' }); by += 50; }
      if (s.hp) { u.button(c, 'hp', p.maxHp > 12 ? 'Give up 1 max heart container' : 'Offer your blood (4 HP, never lethal)', x + 40, by, w - 80, 40, { color: '#ff4a5a' }); by += 50; }
      u.button(c, 'cancel', 'Walk away', x + 40, by, w - 80, 34, {});
    },
    update(g, m, act, inp) { if (act === 'gold') payToll(g, m.ex, 'gold'); else if (act === 'hp') payToll(g, m.ex, 'hp'); else if (act === 'cancel' || inp.consume('back') || inp.consume('pause')) g.modal = null; },
  };

  // ------------------------------------------------------------------ the run's own bookkeeping
  ED.hook('runStart', V, (g) => { g.run.route = {}; g.run.cross = null; cross(g); });
  ED.hook('roomEnter', V, (g, room) => {
    const rt = g.rt; if (!rt || rt.v17done || !live(g)) return; rt.v17done = true;
    if (room.type === 'boss' && g.floor.isMega) armCrack(g, room); else if (room.type === 'rest') maybeWanderer(g, room); else if (room.type === 'secret') maybeAltar(g, room);
  });
  ED.hook('tick', V, (g) => {
    const rt = g.rt; if (!rt || !g.room || g.room.type !== 'boss' || !rt.bossSpawned || !g.floor.isMega) return;
    const cr = cross(g), tier = W.tierOf(g.floorNum); if (cr.bossDmg0[tier] === undefined) cr.bossDmg0[tier] = g.run.damageTaken;      // the "untouched" deed is measured from the first moment the guardian can fight
  });
  ED.hook('bomb', V, (g, b) => { if (b.owner === 'player' && g.run) { const cr = cross(g), tier = W.tierOf(g.floorNum); cr.bombs[tier] = (cr.bombs[tier] | 0) + 1; } });
  ED.hook('runEnd', V, (g) => { if (g.run && g.run.cross) ED.save.save(); });

  // ------------------------------------------------------------------ HUD, floor card, end screen
  ED.hook('hud', V, (g, c) => {
    const cr = g.run && g.run.cross; if (!cr || g.scene === 'intro') return; let x = 14;
    for (const id of Object.keys(cr.carry)) { const d = CURIOS[id]; if (!d || !cr.carry[id]) continue; glyphCurio(c, id, x + 7, C.HUD + 52, 6, d.color); ED.ui.text(c, d.name, x + 18, C.HUD + 56, 10, d.color, 'left', false); x += 26 + d.name.length * 6.2; }
  });
  ED.hook('intro', V, (g, c) => {
    const wi = W.at(g.floorNum); if (!wi || !wi.routed || !wi.first) return;
    ED.ui.text(c, 'A DIFFERENT ROAD' + (wi.w.risk > 0 ? '   ' + '☠'.repeat(Math.min(4, wi.w.risk)) : ''), C.W / 2, 94, 13, '#7fd8c0', 'center');
  });
  const wname = (id) => id === 'deep' ? BASE.name : (W.byId[id] ? W.byId[id].name : id);
  ED.hook('endUI', V, (g, c) => {
    const cr = g.run && g.run.cross; if (!cr || !cr.log.length) return;
    const first = W.worldOfTier(0), path = [wname((first || BASE).id)].concat(cr.log.map(e => wname(e.to))); let s = path.join('  ›  ');
    if (s.length > 96) s = '…' + s.slice(s.length - 95);
    ED.ui.text(c, '⇢ ' + s + (cr.detours ? '   (' + cr.detours + ' detour' + (cr.detours > 1 ? 's' : '') + ')' : ''), C.W / 2, 154, 11, '#7fd8c0', 'center', false);
  });
  ED.hook('titleUI', V, (g, c) => { const n = Object.keys(meta().discovered).length; ED.ui.button(c, 'routes', 'ROUTES  ·  ' + n + ' land' + (n === 1 ? '' : 's') + ' found', C.W - 262, 244, 246, 32, { size: 12, color: '#7fd8c0' }); });

  // ------------------------------------------------------------------ feats (they appear on the v10 LEGACY screen when both updates are on)
  if (ED.legacy) {
    const F = ED.legacy.FEATS, FM = ED.legacy.FEAT, add = (f) => { f.pack = V; f.need = V; F.push(f); FM[f.id] = f; };
    add({ id: 'road1', name: 'Off the Road', desc: 'Take a side road after a MEGA boss.', title: 'the Wayfarer', test: x => !!(x.run.cross && x.run.cross.detours >= 1) });
    add({ id: 'sigil3', name: 'Sigilbearer', desc: 'Carry three sigils.', title: 'the Sigilbearer', test: () => sigilCount() >= 3, prog: () => [Math.min(3, sigilCount()), 3] });
    add({ id: 'wall1', name: 'Wallbreaker', desc: 'Break a secret wall open.', title: 'Wallbreaker', test: x => !!(x.run.cross && Object.keys(x.run.cross.cracked).length) });
    add({ id: 'lands5', name: 'Cartographer', desc: 'Enter 5 different lands.', title: 'the Cartographer', test: () => Object.keys(meta().discovered).length >= 5, prog: () => [Math.min(5, Object.keys(meta().discovered).length), 5] });
  }

  // ------------------------------------------------------------------ the ROUTES screen (title button)
  let tab = 'worlds';
  const lands = () => W.ALL.filter(w => P.ok(w) && (!w.hidden || meta().discovered[w.id] || meta().seen[w.id]));
  const gateLine = (w) => { const s = gateOf(w), M = meta(); if (!s) return ''; if (M.learned[w.id]) return 'opened by: ' + KINDS[s.kind].name; if (M.rumours[w.id]) return rumourText(w); return ''; };
  ED.sceneImpl.routes = {
    draw(g, c) {
      const u = ED.ui, M = meta(), m = ED.input.mouse, cards = [];
      if (!W.spineAt(0) || M.discovered.deep) cards.push(BASE);
      for (const w of lands()) cards.push(w);
      const roads = Object.values(M.edges).reduce((a, b) => a + b, 0), found = cards.filter(w => M.discovered[w.id]).length;
      u.shadow(c, 'ROUTES', C.W / 2, 44, 32, '#7fd8c0', 'center');
      u.text(c, found + ' of ' + cards.length + ' lands entered  ·  ' + roads + ' road' + (roads === 1 ? '' : 's') + ' taken  ·  ' + sigilCount() + ' of ' + SIGILS.length + ' sigils  ·  what you have not found stays dark', C.W / 2, 68, 12, '#a8c8c0', 'center', false);
      [['worlds', 'LANDS'], ['roads', 'ROADS'], ['sigils', 'SIGILS']].forEach(([id, lab], i) => u.button(c, 'tab:' + id, lab, 330 + i * 106, 80, 100, 26, { size: 12, color: '#7fd8c0', selected: tab === id }));
      let hov = null;
      if (tab === 'worlds') {
        const cols = 4, gap = 8, cw = Math.floor((880 - gap * (cols - 1)) / cols), rows = Math.max(1, Math.ceil(cards.length / cols)), ch = Math.max(46, Math.min(92, Math.floor(410 / rows) - gap));
        cards.forEach((w, i) => {
          const x = 40 + (i % cols) * (cw + gap), y = 118 + Math.floor(i / cols) * (ch + gap), disc = !!M.discovered[w.id], seen = !!M.seen[w.id], col = disc ? w.color : '#4a4a62';
          u.button(c, 'card:' + i, '', x, y, cw, ch, { color: col });
          c.fillStyle = disc ? U.rgba(w.color, 0.10) : 'rgba(0,0,0,0.35)'; c.fillRect(x + 3, y + 3, cw - 6, ch - 6); c.fillStyle = col; c.fillRect(x + 3, y + 3, 4, ch - 6);
          if (disc) {
            u.text(c, w.name, x + 16, y + 20, 13, w.color); u.text(c, 'entered ' + (M.visits[w.id] | 0) + '×' + (w.risk > 0 && w !== BASE ? '    ' + '☠'.repeat(Math.min(4, w.risk)) : ''), x + 16, y + 36, 10, '#a8a8c8', 'left', false);
            if (ch >= 70) { const gl = gateLine(w); if (gl) u.wrap(c, gl.length > 64 ? gl.slice(0, 63) + '…' : gl, x + 16, y + 52, cw - 26, 12, 9, '#c8c8e0'); }
          } else {
            const rum = !!M.rumours[w.id];
            c.strokeStyle = '#3a3a52'; c.lineWidth = 2; c.setLineDash && c.setLineDash([4, 4]); c.beginPath(); c.arc(x + 34, y + ch / 2, Math.min(18, ch / 2 - 8), 0, TAU); c.stroke(); c.setLineDash && c.setLineDash([]);
            u.text(c, rum ? w.name : '???', x + 66, y + ch / 2 - 2, rum ? 12 : 14, rum ? '#9a9ab8' : '#6a6a88'); u.text(c, rum ? 'a rumour' : seen ? 'a way you have glimpsed' : 'not yet found', x + 66, y + ch / 2 + 14, 10, '#5a5a78', 'left', false);
          }
          if (UI_sel('card:' + i) || (m.x >= x && m.x <= x + cw && m.y >= y && m.y <= y + ch)) hov = { w, disc, seen };
        });
        u.panel(c, 40, 562, 880, 44, hov && hov.disc ? hov.w.color : '#4a4a68', 0.9);
        if (hov && hov.disc) u.wrap(c, hov.w.rule + (gateLine(hov.w) ? '   ·   ' + gateLine(hov.w) : ''), 54, 580, 850, 14, 12, '#d8d8ee');
        else if (hov && M.rumours[hov.w.id]) u.wrap(c, rumourText(hov.w), 54, 580, 850, 14, 12, '#d8d8ee');
        else if (hov) u.text(c, hov.seen ? 'You have seen a way here, but not walked it.' : 'Nothing is known of this land.', 54, 589, 12, '#8a8aa8', 'left', false);
        else u.text(c, 'Point at a land to read what you know of it.', 54, 589, 12, '#6a6a88', 'left', false);
      } else if (tab === 'roads') {
        const rows = Object.keys(M.edges).sort((a, b) => M.edges[b] - M.edges[a]).slice(0, 18);
        u.panel(c, 70, 118, 820, 430, '#4a4a68', 0.8);
        if (!rows.length) u.text(c, 'No roads taken yet. Beat a MEGA boss and choose a door.', C.W / 2, 330, 14, '#8a8aa8', 'center', false);
        rows.forEach((k, i) => { const [a, b] = k.split('>'), y = 148 + i * 23; u.text(c, wname(a), 100, y, 13, (W.byId[a] || BASE).color); u.text(c, '›', 420, y, 13, '#6a6a88', 'center'); u.text(c, wname(b), 450, y, 13, (W.byId[b] || BASE).color); u.text(c, '×' + M.edges[k], 860, y, 13, '#c8c8e0', 'right'); });
      } else {
        SIGILS.forEach((s, i) => {
          const x = 40 + i * 148, y = 130, have = !!M.sigils[s.id];
          u.panel(c, x, y, 140, 300, have ? s.color : '#3a3a52', 0.85);
          if (have) { glow(c, x + 70, y + 70, 56, s.color, 0.2); glyphSigil(c, s.id, x + 70, y + 70, 34, s.color); u.text(c, 'Sigil of ' + s.name, x + 70, y + 140, 12, s.color, 'center'); u.wrap(c, s.gain, x + 12, y + 170, 118, 14, 11, '#c8c8e0'); const src = s.mini && ED.minibosses.def(s.mini); u.wrap(c, src ? 'Taken from ' + src.name + '.' : 'Left on an altar in a secret room.', x + 12, y + 240, 118, 13, 10, '#8a8aa8'); }
          else { glyphSigil(c, s.id, x + 70, y + 70, 34, '#34344a'); u.text(c, '???', x + 70, y + 140, 14, '#5a5a78', 'center'); u.text(c, 'not found', x + 70, y + 160, 11, '#5a5a78', 'center', false); }
        });
        u.text(c, 'A sigil is kept for good. Some doors know them.', C.W / 2, 470, 13, '#a8c8c0', 'center', false);
      }
      u.button(c, 'back', 'Back', C.W / 2 - 80, 614, 160, 22, { size: 13 });
    },
    update(g, a, inp) {
      if (a === 'back' || inp.consume('back')) { ED.menus.go(g, 'title'); return; }
      if (a && a.indexOf('tab:') === 0) { tab = a.slice(4); g.sfx('ui'); }
    },
  };
  const UI_sel = (id) => ED.ui.navSel === id;

  // ==================================================================== THE SUNKEN OSSUARY — the first new land
  //  A drowned charnel house.  The tide comes in on a schedule you can learn: a band of the room flashes, then floods, then drains.  Water slows you
  //  (as it always has) — and quickens the Drowners that live in it.  Bones do not stay down: smash the heap before it stands.  Gate: a crack in the wall.
  const eyes = (c, e, spread) => {
    const a = e.face || 0, d = e.r * 0.35, s = Math.max(1.5, e.r * 0.2);
    for (const sg of [-1, 1]) {
      const ex = e.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * sg * e.r * spread, ey = e.y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * sg * e.r * spread;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, s, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(ex + Math.cos(a) * s * 0.4, ey + Math.sin(a) * s * 0.4, s * 0.5, 0, TAU); c.fill();
    }
  };
  /** water over these floor tiles for `dur` frames, then they drain back to what they were */
  const floodNow = (g, rt, idx, dur) => W.swapTiles(g, rt, idx, T.WATER, dur);
  const OSS = {
    setup(g, room, rt, rng, wi) { rt.pools = W.paintBlobs(g, room, rt, rng, T.WATER, 2 + (wi.depth > 2 ? 1 : 0), 3, 5, 2, 3); rt.tideT = 150 + rng.int(0, 90); },
    tick(g, rt, wi) {
      if (!rt.lockdown || --rt.tideT > 0) return;
      rt.tideT = Math.round((380 - wi.depth * 26) * (0.8 + g.rng.next() * 0.5));
      const p = g.player, horiz = g.rng.chance(0.5), th = 96, room = g.room;
      let x, y, w, h;
      if (horiz) { w = 900; h = th; x = 30; y = U.clamp(Math.round((p.y + g.rng.range(-120, 120) - th / 2) / 32) * 32, 64, 448 - th); }
      else { w = th; h = 460; y = 58; x = U.clamp(Math.round((p.x + g.rng.range(-160, 160) - th / 2) / 32) * 32, 64, 896 - th); }
      g.zoneRect(null, x, y, w, h, g.tele(64), 0, { color: '#4de0c8', hurts: false, burst: false, onEnd: (gg) => { if (gg.room === room) { floodNow(gg, rt, W.tilesIn(gg, x, y, w, h), 400); gg.sfx('crack', { vol: 0.4 }); gg.shake(3); } } });
      g.addText(p.x, p.y - 36, 'THE TIDE RISES', '#4de0c8', 13); g.sfx('telegraph');
    },
  };
  const foe = (o) => Object.assign({ pack: V, contact: true, world: 'ossuary' }, o);
  const FOES = {
    drowner: foe({ id: 'drowner', name: 'Drowner', shape: 'ghost', color: '#7fc4bc', r: 11, hp: 13, speed: 0.9, dmg: 3, cost: 1.5, weight: 12, minFloor: 6, group: 2,
      desc: 'Drags itself across dry floor, but in water it swims twice as fast as you can wade. The tide is its hunting hour.',
      init(e) { e.sw = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; const wet = g.tileAt(e.x, e.y) === T.WATER; e.sw += ((wet ? 1 : 0) - e.sw) * 0.2;
        A.chase(g, e, i, e.curSpeed * (1 + e.sw * 1.5), Math.sin(e.t * 0.1 + e.seed) * 0.35);
        if (wet && e.t % 14 < g.ts) g.ringFx(e.x, e.y + e.r * 0.6, 4, 15, '#bff4ec', 12, 2);
      }, draw(c, e) { eyes(c, e, 0.4); } }),
    ossicle: foe({ id: 'ossicle', name: 'Ossicle', shape: 'square', color: '#e0d8c0', r: 10, hp: 10, speed: 1.25, dmg: 2.5, cost: 1.3, weight: 11, minFloor: 6, group: 3,
      desc: 'A skeleton that stands up again. Smash the heap it falls into before the bones pull together.',
      update(e, g) { const i = A.info(g, e); e.face = i.ang; A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.12 + e.seed) * 0.5); },
      onDeath(e, g) { if (!e.reborn) g.spawnEnemy('boneheap', e.x, e.y, { silent: true, minion: true }); },
      draw(c, e) { c.fillStyle = '#2a2430'; c.fillRect(e.x - 4, e.y - 3, 3, 3); c.fillRect(e.x + 1, e.y - 3, 3, 3); if (e.reborn) { c.strokeStyle = '#8fe8d8'; c.lineWidth = 1.5; c.strokeRect(e.x - e.r + 1, e.y - e.r + 1, e.r * 2 - 2, e.r * 2 - 2); } } }),
    boneheap: foe({ id: 'boneheap', name: 'Bone Heap', hidden: true, shape: 'blob', color: '#bdb59a', r: 9, hp: 3, speed: 0, dmg: 0, cost: 0, weight: 0, minFloor: 99, contact: false, noElite: true,
      desc: 'What is left of an Ossicle. Break it, or it stands again with a stronger grudge.',
      init(e) { e.heapT = 200; },
      update(e, g) {
        e.heapT -= g.ts; e.vis = 0.55 + 0.45 * Math.min(1, e.heapT / 200); if (e.heapT > 0) return;
        e.dead = true; e.noLoot = true; g.burst(e.x, e.y, 12, '#e0d8c0', 3, 20); g.sfx('summon');
        g.spawnEnemy('ossicle', e.x, e.y, { silent: false, minion: true, hpMul: 0.6, extra: { reborn: true } });
      } }),
    brinewisp: foe({ id: 'brinewisp', name: 'Brinewisp', shape: 'star', color: '#7fe0f0', r: 9, hp: 9, speed: 1.1, dmg: 1.5, shot: 2, cost: 1.7, weight: 10, minFloor: 7, group: 2, flying: true, contact: false,
      desc: 'Hangs back and floods the floor beneath your feet. Water slows you and speeds up everything that swims — dash out of the ring.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); e.n = 0; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'cast') {
          e.windup -= g.ts;
          if (e.windup <= 0) { e.state = null; e.cd = 150 / e.rate; if (g.rt && g.room.rt === g.rt) { floodNow(g, g.rt, W.tilesNear(g, e.tx, e.ty, 54), 330); g.burst(e.tx, e.ty, 12, '#4de0c8', 3, 22); g.sfx('crack', { vol: 0.4 }); } }
          return;
        }
        if (e.rush) A.chase(g, e, i, e.curSpeed * 1.15, 0); else A.kite(g, e, i, 215, e.curSpeed, 0.9);
        if ((e.cd -= g.ts) <= 0) {
          if (++e.n % 3 === 0) { g.eShot(e, i.ang, 2.4, { dmg: 1, color: '#7fe0f0', r: 4, slow: 60 }); g.sfx('shoot', { vol: 0.5 }); e.cd = 110 / e.rate; }
          else { e.state = 'cast'; e.windup = g.tele(42); e.tx = U.clamp(p.x + (p.vx || 0) * 10, 70, 890); e.ty = U.clamp(p.y + (p.vy || 0) * 10, 70, 506); g.zoneCircle(e, e.tx, e.ty, 54, e.windup, 0, { color: '#4de0c8', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.5 }); }
        }
      } }),
    chainwarden: foe({ id: 'chainwarden', name: 'Chain Warden', shape: 'hex', color: '#8a9aa8', r: 15, hp: 30, speed: 0.75, dmg: 4, shot: 3.5, cost: 2.9, weight: 8, minFloor: 8,
      desc: 'Whirls an anchor on a long chain through a full circle. The sweep is slow and telegraphed: step in behind it, or dash through.',
      init(e, g) { e.cd = 120; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') {
          e.windup -= g.ts;
          if (e.windup <= 0) {
            e.state = 'sweep'; e.sT = 0; const a0 = i.ang, dir = e.dir, R = 128; g.sfx('lunge');
            g._zone({ kind: 'hazard', shape: 'line', x: e.x, y: e.y, x2: e.x, y2: e.y, w: 18, life: 74, dmg: e.shotDmg, tick: 8, tickT: 0, src: e, color: '#9fb4c4', noInstant: true,
              upd(gg, z) { const k = Math.min(1, z.t / 74), a = a0 + dir * k * TAU; z.x = e.x; z.y = e.y; z.x2 = e.x + Math.cos(a) * R; z.y2 = e.y + Math.sin(a) * R; if (e.dead) z.dead = true; } });
          }
          return;
        }
        if (e.state === 'sweep') { e.sT += g.ts; if (e.sT >= 74) { e.state = null; e.cd = 190 / e.rate; } return; }
        A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 250) { e.state = 'wind'; e.windup = g.tele(34); e.dir = g.rng.chance(0.5) ? 1 : -1; g.zoneCircle(e, e.x, e.y, 128, e.windup, 0, { color: '#9fb4c4', hurts: false, burst: false, follow: true }); g.sfx('telegraph', { vol: 0.5 }); }
      }, draw(c, e) { eyes(c, e, 0.4); } }),
  };
  for (const id in FOES) { if (ED.enemyTypes[id]) (ED.collisions = ED.collisions || []).push('foe ' + id); FOES[id].id = id; ED.enemyTypes[id] = FOES[id]; }
  ED.mods.brined = { id: 'brined', pack: V, name: 'Brined', color: '#4de0c8', glyph: '≋', desc: 'Its blows soak you through: slowed for a while',
    onHitPlayer(e, g) { g.player.slowT = Math.max(g.player.slowT || 0, 90); g.ringFx(g.player.x, g.player.y, 6, 26, '#4de0c8', 14, 3); } };

  // the mini boss: Hollow Reeve, who keeps the low water.  Its signature relic lets you wade freely.
  ED.minibosses.defs.reeve = { id: 'reeve', pack: V, name: 'Hollow Reeve', title: 'Warden of the Low Water', color: '#8fe8d8', r: 29, hp: 215, arena: 'arena_pillars', shape: 'reeve', contact: 4, minFloor: 6, unlockText: "Reeve's Lamp",
    attacks: { anchor: L('slamRing', { r: 88, tele: 36, rings: 2, speed: 3, color: '#9fb4c4' }), drift: L('hazardRings', { n: 3, spacing: 32, speed: 2.4, color: '#4de0c8' }), bones: L('summon', { types: ['ossicle'], n: 2, max: 4, hpMul: 0.8 }),
      tide: L('bars', { n: 2, thick: 48, gapW: 170, warn: 60, color: '#4de0c8' }), lantern: L('homing', { n: 3, speed: 1.6, dmg: 0.9, color: '#bffff0' }) },
    phases: [{ at: 1, name: 'Low Tide', attacks: ['anchor', 'drift', 'bones'], idle: [34, 56] }, { at: 0.5, name: 'Rising Water', attacks: ['tide', 'anchor', 'drift', 'lantern', 'bones'], idle: [26, 44], enter: [L('flood', { ring: 1 })] }] };
  ED.bossDraw.reeve = (c, e, x, y, r, col, dk, t) => {
    const dark = ED.render.darker(col, 0.5);
    c.fillStyle = dark; c.beginPath(); c.moveTo(x - r * 0.95, y + r); c.lineTo(x - r * 0.45, y - r * 0.55); c.lineTo(x + r * 0.45, y - r * 0.55); c.lineTo(x + r * 0.95, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.5, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#10201e'; c.fillRect(x - r * 0.33, y - r * 0.62, r * 0.66, r * 0.2); c.fillStyle = '#bffff0'; c.fillRect(x - r * 0.22, y - r * 0.58, r * 0.14, r * 0.1); c.fillRect(x + r * 0.08, y - r * 0.58, r * 0.14, r * 0.1);
    c.strokeStyle = '#6a5a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + r * 1.0, y + r * 0.9); c.lineTo(x + r * 0.9, y - r * 1.3); c.stroke(); c.beginPath(); c.arc(x + r * 0.7, y - r * 1.35, r * 0.22, Math.PI * 0.2, Math.PI * 1.5); c.stroke();
    const lx = x - r * 0.95 + Math.sin(t * 0.06) * 5, ly = y + r * 0.1; c.strokeStyle = '#4a4a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - r * 0.8, y - r * 0.2); c.lineTo(lx, ly); c.stroke();
    glow(c, lx, ly + 6, r * 0.6, '#ffe9a0', 0.35); c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(lx, ly + 6, r * 0.14, 0, TAU); c.fill();
  };
  I.addRelic('reevelamp', { id: 'reevelamp', name: "Reeve's Lamp", pack: V, rarity: 'rare', color: '#8fe8d8', mods: { waterWalk: 1, def: 1, luck: 1 }, max: 2, unlock: 'mini:reeve', desc: 'Water no longer slows you; +1 defense and a little luck. (Unlockable)' });

  W.add({ id: 'ossuary', name: 'The Sunken Ossuary', short: 'SUNKEN OSSUARY', color: '#8fe8d8', pack: V, native: 6, tiers: [1, 99], risk: 2, gate: { kind: 'crack' },
    rule: 'The tide keeps its own hours: when it rises the low ground floods, and the drowned swim faster than you can wade.',
    enemies: ['drowner', 'ossicle', 'brinewisp', 'chainwarden'], mod: 'brined', minis: ['reeve'], hz: OSS, music: { scale: 2, root: 40, bpm: -10 },
    theme: { name: 'The Sunken Ossuary', floorA: '#1b2a2c', floorB: '#203235', wall: '#35585a', wallTop: '#7ab0aa', accent: '#8fe8d8', glow: '#b0fff0', fog: '#06100f' } });

  ED.route.OSS = OSS; ED.route.floodNow = floodNow; ED.route.commit = commit; ED.route.grantSigil = grantSigil; ED.route.armCrack = armCrack; ED.route.openCrack = openCrack; ED.route.payToll = payToll; ED.route.usePortal = usePortal; ED.route.usable = gateUsable;
})(typeof globalThis !== 'undefined' ? globalThis : this);

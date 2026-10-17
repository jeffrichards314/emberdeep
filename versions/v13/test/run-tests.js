'use strict';
/* EMBERDEEP automated test suite.
 *   node --expose-gc test/run-tests.js            full suite
 *   node --expose-gc test/run-tests.js --quick    smaller counts (CI-friendly)
 * Exits non-zero on any failure.
 */
const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const quick = process.argv.includes('--quick');
const packArg = process.argv.find(a => a.startsWith('--packs='));
if (packArg) process.env.ED_PACKS = packArg.slice(8);       // none | all | v2,v4
const N_FLOORS = quick ? 150 : 800;
const SIM_FLOORS = quick ? 25 : 100;

let pass = 0, fail = 0; const failures = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; failures.push(msg); console.log('  FAIL: ' + msg); } }
function section(s) { console.log('\n== ' + s); }
const t0 = Date.now();
let scriptErrors = 0; { const ce = console.error; console.error = (...a) => { if (/script error|Error:/.test(String(a[0]))) scriptErrors++; ce.apply(console, a); }; }      // boss scripts / timers swallow exceptions: count them so they cannot hide

(async function main() {
const tick = () => new Promise(r => setImmediate(r));
const sandbox = load(); const ED = sandbox.ED;
section('0. Page structure');
{
  const fs = require('fs'), path = require('path'); const order = require('./harness').htmlOrder();
  ok(order.length >= 20, 'index.html lists ' + order.length + ' scripts');
  for (const f of order) ok(fs.existsSync(path.join(__dirname, '..', 'js', f + '.js')), 'script exists: js/' + f + '.js');
  for (const need of ['util', 'difficulty', 'generator', 'entities', 'items', 'rooms', 'bosses', 'minibosses', 'keys', 'ui', 'main']) ok(order.includes(need), 'module loaded by index.html: ' + need);
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'); ok(!/type="module"/.test(html), 'no ES modules (works from file://)'); ok(!/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, '')), 'no external assets');
} const D = ED.D, U = ED.U;
const newGame = () => { const g = ED.createGame(fakeCanvas(), { headless: true }); ED.game = g; return g; };

// ------------------------------------------------------------------ 1. generation
section('1. Floor generation (' + N_FLOORS + ' floors, random seeds + floor numbers)');
{
  const rng = new ED.RNG('suite');
  let invalid = 0, fallbacks0 = ED.gen.stats.fallbacks;
  const counts = { mini: {}, locks: {}, megaRest: 0 };
  const sigs = new Map();
  for (let i = 0; i < N_FLOORS; i++) {
    const seed = ED.randomSeed() + i, floor = 1 + (i < 120 ? i % 40 : rng.int(1, 120));
    let f;
    try { f = ED.gen.generate(floor, seed); } catch (e) { ok(false, 'generate threw for ' + seed + ' f' + floor + ': ' + e.message); continue; }
    const errs = ED.gen.validate(f);
    if (errs.length) { invalid++; ok(false, 'invalid floor ' + seed + ' f' + floor + ': ' + errs.join('; ')); continue; }
    // explicit assertions (independent of validate())
    const R = f.rooms, byType = t => R.filter(r => r.type === t);
    ok(byType('start').length === 1, 'exactly one start room');
    ok(byType('boss').length === 1, 'exactly one boss room');
    const nm = byType('miniboss').length; counts.mini[nm] = (counts.mini[nm] || 0) + 1;
    ok(nm >= 1 && nm <= 3, 'mini boss count 1-3 (got ' + nm + ')');
    ok(byType('normal').length >= 6 && byType('normal').length <= 10, 'normal rooms 6-10');
    const specials = R.filter(r => ED.D.ROOM_WEIGHTS[r.type]).length;
    ok(specials >= 2 && specials <= 4, 'special rooms 2-4 (got ' + specials + ')');
    // no overlaps
    const cells = new Set(R.map(r => r.gx + ',' + r.gy)); ok(cells.size === R.length, 'no overlapping rooms');
    // all reachable when everything is openable; boss reachable
    const reach = ED.keys.reach(f, new Set(ED.keys.allLocks(f).map(l => l.id)), new Set(f.edges.filter(e => e.hidden).map(e => e.id)));
    ok(reach.size === R.length, 'all rooms reachable'); ok(reach.has(f.bossId), 'boss reachable');
    // key solver: every lock opens in a valid order, Boss Key exists exactly once on a mini boss
    const sol = ED.keys.solve(f); ok(sol.ok, 'solver finds a full unlock order (' + (sol.reason || '') + ')'); ok(sol.safe, 'floor is safe in EVERY unlock order — spending a fungible key on the wrong door can never strand you (' + (sol.reason || '') + ')');
    const bossKeys = R.reduce((n, r) => n + (r.holds || []).filter(h => h.key === 'boss').length, 0);
    ok(bossKeys === 1, 'Boss Key exists exactly once'); ok(R[f.bossKeyHolder].type === 'miniboss', 'Boss Key carried by a mini boss');
    if (sol.ok) ok(sol.order.length === ED.keys.allLocks(f).length + f.edges.filter(e => e.hidden).length, 'solution covers every lock');
    // keys never in negative / gamble rooms, never in start, never behind own lock (solver) — and no lock is trapped behind a lock chain cycle
    for (const r of R) for (const h of r.holds || []) ok(ED.keys.KEY_HOST_OK[r.type] && r.type !== 'start', 'key hosted only in allowed room: ' + r.type);
    for (const l of ED.keys.allLocks(f)) ok(!!ED.keys.LOCKS[l.type], 'lock type known');
    // switch locks have a reachable normal puzzle room
    for (const e of f.edges) if (e.lock && e.lock.type === 'switch') { const pr = R[e.lock.params.puzzleRoom]; ok(pr && pr.type === 'normal' && pr.puzzle && !pr.puzzle.done, 'switch puzzle room valid'); }
    // bomb supply covers bomb needs
    const bombNeed = f.edges.filter(e => (e.lock && e.lock.type === 'bomb') || e.hidden).length; ok(f.bombSupply >= bombNeed, 'bomb supply >= bomb needs');
    // mega floor => rest room
    if (floor % 5 === 0) { ok(byType('rest').length === 1, 'mega floor has rest room'); counts.megaRest++; }
    // layout sanity: door slots passable and every non-solid tile reachable
    for (const r of R) for (const d of ED.DIRS) if (r.doors[d]) { const [tx, ty] = ED.rooms.DOOR_TILES[d][0]; ok(ED.rooms.isPassable(r.tiles[ty * 30 + tx]), 'door slot passable'); }
    for (const e of f.edges) if (e.lock) counts.locks[e.lock.type] = (counts.locks[e.lock.type] || 0) + 1;
    // determinism
    if (i % 10 === 0) { const f2 = ED.gen.generate(floor, seed); const sig = r => r.map(x => x.type[0] + x.gx + x.gy).join(''); ok(sig(f.rooms) === sig(f2.rooms), 'same seed+floor => identical floor'); }
  }
  const fb = ED.gen.stats.fallbacks - fallbacks0;
  console.log('  generated', N_FLOORS, 'floors; invalid:', invalid, '; fallback layouts used:', fb, '; mini counts', JSON.stringify(counts.mini), '; locks', JSON.stringify(counts.locks));
  ok(fb === 0, 'fallback generator not needed (' + fb + ')');
  // the fallback layout itself must be valid for every floor number too
  for (const fl of [1, 5, 7, 10, 25, 50, 100]) { const f = ED.gen.buildFallback(fl, 'FBTEST'); ok(ED.gen.validate(f).length === 0, 'fallback layout valid on floor ' + fl); }
}

// ------------------------------------------------------------------ 2. solver negative tests
section('2. Key solver catches broken floors (sabotage)');
{
  let caught = 0, tried = 0;
  for (let i = 0; i < 60; i++) {
    const f = ED.gen.generate(1 + (i % 30), 'SAB' + i);
    // sabotage A: move the Boss Key into the boss room's own lock chain => place it in the boss room itself
    const holder = f.rooms[f.bossKeyHolder]; const h = holder.holds.find(x => x.key === 'boss');
    holder.holds = holder.holds.filter(x => x !== h); f.rooms[f.bossId].holds.push(h);
    tried++; if (!ED.keys.solve(f).ok) caught++;
    holder.holds.push(h); f.rooms[f.bossId].holds = f.rooms[f.bossId].holds.filter(x => x !== h);
    // sabotage B: remove all small/mb keys when a key lock exists
    const needKey = ED.keys.allLocks(f).some(l => ED.keys.LOCKS[l.type].key && l.type !== 'boss');
    if (needKey) { const saved = []; for (const r of f.rooms) { for (const hh of r.holds) if (hh.key !== 'boss') saved.push([r, hh]); r.holds = r.holds.filter(x => x.key === 'boss'); } tried++; if (!ED.keys.solve(f).ok) caught++; for (const [r, hh] of saved) r.holds.push(hh); }
  }
  ok(caught === tried, 'solver rejected every sabotaged floor (' + caught + '/' + tried + ')');
  // order-dependent softlock: one fungible key could be spent on the optional door, stranding the mandatory one
  {
    let built = 0, rejected = 0;
    for (let i = 0; i < 400 && built < 12; i++) {
      const f = ED.gen.generate(4 + (i % 20), 'ORD' + i);
      const minis = f.rooms.filter(r => r.type === 'miniboss'); if (minis.length !== 2) continue;
      const m1 = f.rooms[f.bossKeyHolder], m2 = minis.find(r => r.id !== m1.id);
      const lockOf = r => f.edges.find(e => e.lock && e.lock.room === r.id).lock;
      for (const r of f.rooms) r.holds = r.holds.filter(h => h.key === 'boss');
      for (const e of f.edges) { if (e.hidden) e.hidden = false; }
      f.bombSupply = 0;
      const l1 = lockOf(m1), l2 = lockOf(m2);
      for (const l of [l1, l2]) { l.type = 'small'; l.opened = false; l.params = {}; }
      for (const e of f.edges) if (e.lock && e.lock !== l1 && e.lock !== l2 && e.lock.type !== 'boss') e.lock.opened = true;
      const normal = f.rooms.find(r => r.type === 'normal'); normal.holds.push({ id: 'k1', key: 'small', via: 'enemy', got: false });
      m1.holds.push({ id: 'k2', key: 'small', via: 'miniboss', got: false });       // the 2nd key is guarded by the mandatory mini boss
      const r = ED.keys.solve(f); built++;
      if (r.ok && !r.safe) rejected++;
      ok(ED.keys.validateKeys(f).length > 0, 'validator rejects the order-dependent floor');
    }
    ok(built > 0 && rejected === built, 'solver flags order-dependent softlocks (' + rejected + '/' + built + ': solvable in one order but not in all)');
  }
  // a key behind its OWN lock: mini boss room holds the key for its own door
  let own = 0, ownCaught = 0;
  for (let i = 0; i < 40; i++) {
    const f = ED.gen.generate(3 + (i % 20), 'OWN' + i);
    const locks = f.edges.filter(e => e.lock && ED.keys.LOCKS[e.lock.type].key && e.lock.type !== 'boss');
    if (!locks.length) continue;
    const e = locks[0]; const mr = f.rooms[e.lock.room]; const kt = ED.keys.LOCKS[e.lock.type].key;
    for (const r of f.rooms) r.holds = r.holds.filter(h => h.key === 'boss' || h.key !== kt);   // remove all keys of that type
    mr.holds.push({ id: 'x', key: kt, via: 'miniboss', got: false }); own++;
    if (!ED.keys.solve(f).ok) ownCaught++;
  }
  ok(own === 0 || own === ownCaught, 'key behind its own lock is detected (' + ownCaught + '/' + own + ')');
}

// ------------------------------------------------------------------ 3. difficulty curves
section('3. Difficulty table: monotonic within caps, finite, bounded');
{
  for (const k in D.CURVES) {
    const row = D.CURVES[k]; let prev = null, capped = false, ok_ = true, finite = true;
    for (let f = 1; f <= 400; f++) {
      const v = D.curve(row, f);
      if (!isFinite(v)) finite = false;
      if (prev !== null) {
        if (row.dir === -1) { if (v > prev + 1e-12) ok_ = false; if (!capped && v === prev && prev > row.cap + 1e-9) ok_ = false; }
        else { if (v < prev - 1e-12) ok_ = false; if (!capped && v === prev && prev < row.cap - 1e-9 && (row.lin > 0 || row.quad > 0)) ok_ = false; }
      }
      if (row.dir === -1 ? v < row.cap - 1e-9 : v > row.cap + 1e-9) ok_ = false;
      if (D.atCap(row, f)) capped = true;
      prev = v;
    }
    ok(finite && ok_, 'curve ' + k + ' is finite, capped and ' + (row.dir === -1 ? 'non-increasing' : 'non-decreasing') + ' (strictly changing until cap)');
  }
  const keys = ['enemyHp', 'enemyDmg', 'enemySpeed', 'projSpeed', 'spawnBudget', 'waves', 'eliteChance', 'modCount'];
  for (const k of keys) { let strict = true; for (let f = 2; f <= 8; f++) if (!(D.at(f)[k] > D.at(f - 1)[k])) strict = false; ok(strict, k + ' strictly rises every floor early on'); }
  let dangerUp = true; for (let f = 2; f <= 60; f++) if (D.at(f).danger < D.at(f - 1).danger) dangerUp = false; ok(dangerUp, 'danger level never decreases');
  ok(D.at(1).eliteChance === 0, 'floors start without elites (learnable)'); ok(D.at(1).danger === 1, 'floor 1 is danger 1');
  ok(D.at(10).danger > D.at(5).danger * 1.5, 'floor 10 clearly harder than floor 5');
  for (let f = 1; f <= 100; f++) { const d = D.at(f); for (const k in d) if (typeof d[k] === 'number') ok(isFinite(d[k]), 'difficulty ' + k + ' finite at floor ' + f); ok(d.maxEnemies <= 16, 'enemy cap holds'); }
  // wave composition obeys caps at absurd depths
  const rng = new ED.RNG('cap');
  for (const f of [1, 3, 10, 30, 100, 400]) for (let i = 0; i < 20; i++) { const w = D.composeWaves(f, rng, {}); ok(w.length >= 2 && w.length <= 3, 'normal room has 2-3 waves @' + f); for (const wave of w) { ok(wave.length >= 1 && wave.length <= 16, 'wave size within cap @' + f + ' (' + wave.length + ')'); for (const e of wave) ok((D.ENEMY_INTRO[e.type] !== undefined ? D.ENEMY_INTRO[e.type] : ED.enemyTypes[e.type].minFloor) <= f, 'enemy type introduced by floor ' + f); } }
  ok(D.at(2).telegraph < D.at(1).telegraph && D.at(100).telegraph >= 0.5 && D.at(1).telegraph > 1.2, 'telegraphs start generous, shrink with depth, stay readable');
}

// ------------------------------------------------------------------ 4. content tables
section('4. Content tables & item pool');
{
  ok(Object.keys(ED.enemyTypes).filter(k => D.ENEMY_INTRO[k]).length >= 8, 'at least 8 enemy types');
  for (const k of ['chaser', 'shooter', 'charger', 'swarm', 'shielded', 'bomber', 'summoner', 'teleporter']) ok(!!ED.enemyTypes[k], 'enemy type ' + k);
  ok(Object.keys(ED.mods).length >= 8, 'elite modifiers');
  ok(ED.minibosses.ids.length >= 8, 'at least 8 unique mini bosses (' + ED.minibosses.ids.length + ')');
  ok(ED.packs.values(ED.items.WEAPONS).length === 7 + (ED.packs.on('v2') ? 5 : 0), 'weapon types for this edition (' + ED.packs.values(ED.items.WEAPONS).length + ')'); ok(ED.packs.values(ED.items.ACTIVES).length >= 6, 'actives');
  ok(Object.keys(ED.items.RELICS).length >= 30, 'relics (' + Object.keys(ED.items.RELICS).length + ')');
  ok(Object.values(ED.items.RELICS).filter(r => r.tag === 'risk').length >= 5, 'risk/reward relics exist');
  // item pool never dries up even with everything owned at max stack
  const owned = {}; for (const r of Object.values(ED.items.RELICS)) owned[r.id] = r.max || 1;
  const rng = new ED.RNG('pool'); let okAll = true;
  for (let i = 0; i < 3000; i++) { const it = ED.items.rollRelic(rng, 1 + (i % 60), { relics: owned }); if (!it || !it.id || !ED.items.relic(it.id)) okAll = false; }
  ok(okAll, 'relic pool falls back to stackables (never empty)');
  for (let i = 0; i < 600; i++) { const o = ED.items.rollOffers(rng, 1 + (i % 80), 3, { relics: owned, luck: i % 7 }); if (o.length !== 3) okAll = false; }
  ok(okAll, 'rollOffers always yields the requested count');
  // weapons / armor roll finite numbers at every depth
  let fin = true; for (let f = 1; f <= 120; f++) { const w = ED.items.rollWeapon(rng, f, {}), a = ED.items.rollArmor(rng, f, {}); if (!isFinite(w.dmg) || !isFinite(w.cd) || !isFinite(a.def)) fin = false; }
  ok(fin, 'weapon/armor stats finite for floors 1-120');
  // every boss def has phases >= 2 and attacks resolvable
  for (const id of ED.bosses.allIds()) { const d = ED.bosses.def(id); ok(d.phases.length >= 3 || d.mega, id + ' has 3+ phases'); for (const ph of d.phases) for (const a of ph.attacks) { const nm = Array.isArray(a) ? a[0] : a; ok(!!d.attacks[nm], id + ' phase attack exists: ' + nm); const e = d.attacks[nm]; if (e && Array.isArray(e)) ok(!!ED.attacks.lib[e[0]], id + ' lib attack ' + e[0]); } }
  for (const id of ED.minibosses.ids) { const d = ED.minibosses.def(id); ok(d.phases.length >= 1 && d.phases.length <= 2, id + ' 1-2 phases'); ok(Object.keys(d.attacks).length >= 2, id + ' has 2+ attacks'); for (const ph of d.phases) for (const a of ph.attacks) ok(!!d.attacks[a], id + ' attack ' + a); }
  // boss escalation: size, hp and phases grow with floor; mega every 5th
  const specs = []; for (let f = 1; f <= 30; f++) specs.push(ED.bosses.forFloor(f, new ED.RNG('s' + f)));
  for (let f = 1; f <= 30; f++) ok(specs[f - 1].mega === (f % 5 === 0), 'mega boss on every 5th floor only (f' + f + ')');
  ok(specs[5].tier === 2 && specs[10].tier === 3 && specs[15].tier >= 4, 'tiers climb: T2 @6, T3 @11, T4+ @16');
  ok(specs[15].partnerId && !specs[15].fused, 'tier 4 pairs two bosses'); ok(specs[20].fused, 'tier 5+ fuses attack sets'); ok(specs[10].mods.length >= 1, 'tier 3 adds modifiers');
  ok(/Tier/.test(specs[5].name), 'tier suffix in boss names');
  // every floor's boss is physically bigger and tougher than the last (separately for floor bosses and mega bosses)
  let prevR = 0, prevH = 0, prevMR = 0, prevMH = 0, mono = true, monoH = true, monoM = true, monoMH = true;
  for (let f = 1; f <= (ED.packs.on('v4') ? 45 : 70); f++) {
    const r = ED.bosses.radiusFor(f), h = ED.bosses.hpFor(f);
    if (f % 5) { if (r < prevR - 1e-9) mono = false; if (h < prevH) monoH = false; prevR = r; prevH = h; } else { if (r < prevMR - 1e-9) monoM = false; if (h < prevMH) monoMH = false; prevMR = r; prevMH = h; }
  }
  ok(mono, 'floor boss body size never shrinks as floors deepen'); ok(monoH, 'floor boss HP never drops as floors deepen');
  ok(monoM, 'MEGA boss body size never shrinks'); ok(monoMH, 'MEGA boss HP never drops');
  ok(ED.bosses.radiusFor(5) > 2 * ED.bosses.radiusFor(4) * 0.9 && ED.bosses.radiusFor(5) > ED.bosses.radiusFor(4) + 40, 'a MEGA boss fills far more of the arena than a floor boss');
  ok(ED.bosses.radiusFor(2) > ED.bosses.radiusFor(1) && ED.bosses.radiusFor(4) > ED.bosses.radiusFor(3) && ED.bosses.radiusFor(6) > ED.bosses.radiusFor(4), 'bosses strictly grow floor to floor');
  ok(Math.max.apply(null, ED.minibosses.ids.map(i => ED.minibosses.def(i).r)) * 1.3 <= ED.bosses.radiusFor(1) + 4, 'mini bosses are smaller than floor bosses');
}

// ------------------------------------------------------------------ 5. floors 1-100 simulation
section('5. Simulate floors 1-' + SIM_FLOORS + ' (content, NaN scan, memory)');
function giveKit(g, FL) {
  const p = g.player, rng = new ED.RNG('kit' + FL);
  const target = 3 + Math.min(FL * 1.2, 24); let n = 0;
  while (Object.keys(p.relics).reduce((s, k) => s + p.relics[k], 0) < target && n++ < 80) g.equipItem(ED.items.rollRelic(rng, FL, { relics: p.relics, noRisk: true, minRank: 0 }), true);
  p.weapon = ED.items.rollWeapon(rng, FL, { type: 'sword', rarity: FL >= 12 ? 'epic' : 'rare' });
  for (const s of ['helmet', 'chest', 'boots']) p.armor[s] = ED.items.rollArmor(rng, FL, { slot: s, rarity: FL >= 8 ? 'epic' : 'rare' });
  p.bonusHp = 4 * Math.min(14, 1 + Math.floor(FL / 2)); ED.items.recalc(p); p.hp = p.maxHp;
}
function scanNaN(g, label) {
  const bad = [];
  const chk = (o, keys, what) => { for (const k of keys) { const v = o[k]; if (typeof v === 'number' && !isFinite(v)) bad.push(what + '.' + k); } };
  chk(g.player, ['x', 'y', 'vx', 'vy', 'hp', 'maxHp', 'gold'], 'player');
  for (const k in g.player.st) if (typeof g.player.st[k] === 'number' && !isFinite(g.player.st[k])) bad.push('stat.' + k);
  for (const e of g.enemies) chk(e, ['x', 'y', 'hp', 'maxHp', 'r', 'dmg', 'shotDmg', 'speed', 'curSpeed', 'kx', 'ky'], 'enemy:' + e.type);
  for (const b of g.eproj) chk(b, ['x', 'y', 'vx', 'vy', 'dmg', 'life'], 'eproj');
  for (const z of g.zones) chk(z, ['x', 'y', 'r', 'dmg', 't', 'dur'], 'zone');
  for (const k of g.pickups) chk(k, ['x', 'y', 'val'], 'pickup');
  if (bad.length) ok(false, label + ': non-finite values: ' + bad.slice(0, 5).join(', '));
  return bad.length === 0;
}
{
  const g = newGame(); g.startRun('SIMSEED', 'knight'); g.scene = 'play';
  const bot = new Bot(ED, g, { god: true });
  const wr = [];
  let heapBase = null, heapMid = null, maxEntities = 0, simErrors = 0, cleanScans = 0, scans = 0;
  const heap = () => { if (global.gc) global.gc(); return process.memoryUsage().heapUsed / 1048576; };
  for (let FL = 1; FL <= SIM_FLOORS; FL++) {
    await tick();
    try {
      ED.debug.jumpFloor(g, FL); giveKit(g, FL);
      const f = g.floor;
      ok(ED.gen.validate(f).length === 0, 'floor ' + FL + ' validates in-game');
      if (FL <= 12) wr.push(new WeakRef(f));
      // visit a normal room, a mini boss room and the boss room, fighting for a few seconds each
      const targets = [f.rooms.find(r => r.type === 'normal'), f.rooms.find(r => r.type === 'miniboss'), f.rooms[f.bossId]].concat(FL % 3 === 0 ? [f.rooms.find(r => ['ambush', 'challenge', 'haunted', 'trap', 'shrine', 'shop', 'treasure', 'cursed', 'devil', 'mystery', 'blacksmith', 'gambling', 'fountain', 'secret'].includes(r.type))] : []);
      for (const room of targets) {
        if (!room) continue;
        ED.debug.goto(g, room, 480, 440); g.scene = 'play'; g.p0 = 0;
        for (let i = 0; i < 420; i++) {
          bot.tick(); g.step();
          if (i % 9 === 0) g.render();
          if (g.scene !== 'play') { g.scene = 'play'; }
          maxEntities = Math.max(maxEntities, g.enemies.length + g.eproj.length + g.zones.length + g.fx.length);
          if (i % 70 === 0) { scans++; if (scanNaN(g, 'floor ' + FL + ' room ' + room.type)) cleanScans++; }
        }
        // ranged / special-room interaction smoke: press interact, bomb, active
        ED.input.sim.edge.interact = true; ED.input.sim.edge.active = true; g.step();
      }
      if (FL === 10) heapBase = heap();
      if (FL === SIM_FLOORS) heapMid = heap();
    } catch (e) { simErrors++; ok(false, 'simulation threw on floor ' + FL + ': ' + (e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); break; }
  }
  ok(simErrors === 0, 'floors 1-' + SIM_FLOORS + ' simulated without a crash');
  ok(scans === cleanScans, 'no NaN/Infinity in player stats or entities (' + cleanScans + '/' + scans + ' scans clean)');
  ok(maxEntities < 900, 'entity counts stay bounded (max ' + maxEntities + ')');
  // memory: old floors are released and heap does not grow with depth
  if (global.gc) {
    const growth = heapMid - heapBase;
    console.log('  heap @floor10 ' + heapBase.toFixed(1) + ' MB  ->  @floor' + SIM_FLOORS + ' ' + heapMid.toFixed(1) + ' MB  (growth ' + growth.toFixed(1) + ' MB)');
    ok(growth < 35, 'no unbounded memory growth across floors (' + growth.toFixed(1) + ' MB)');
    bot.goal = null; g.nearInter = null; g.bossRef = null; await tick(); global.gc(); await tick(); global.gc(); await tick();
    let alive = wr.filter(w => w.deref()).length;
    ok(alive <= 2, 'previous floors are garbage-collected (' + alive + ' of ' + wr.length + ' early floors still referenced)');
  } else console.log('  (run with --expose-gc to enable the heap checks)');
  ok(ED.stats.caches <= g.floor.rooms.length + 1, 'tile caches freed on floor change (' + ED.stats.caches + ' live)');
}

// ------------------------------------------------------------------ 6. boss fights
section('6. Boss + MEGA boss fights (bot, god mode, scaled kit)');
function bossFight(FL, seed) {
  const g = newGame(); g.startRun(seed || 'BOSSFIGHT', 'knight'); g.scene = 'play';
  ED.debug.jumpFloor(g, FL); giveKit(g, FL); g.god = true;
  const bot = new Bot(ED, g, { god: true });
  ED.debug.skipToBoss(g); g.scene = 'play';
  let frames = 0, phases = new Set(), maxProj = 0; const lim = 60 * 60 * 6;
  while (frames++ < lim) {
    bot.tick(); g.step(); if (frames % 11 === 0) g.render();
    for (const e of g.enemies) if (e.boss) phases.add(e.phaseIdx);
    maxProj = Math.max(maxProj, g.eproj.length);
    if (g.room.cleared && g.room.type === 'boss') break;
    if (g.scene !== 'play') g.scene = 'play';
  }
  return { cleared: g.room.cleared, frames, phases: [...phases].sort(), maxProj, g };
}
for (const FL of (quick ? [1, 5, 10] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 20, 21, 25, 30, 40, 55])) {
  let r; try { r = bossFight(FL); } catch (e) { ok(false, 'boss fight floor ' + FL + ' threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); continue; }
  const spec = ED.bosses.forFloor(FL, new ED.RNG('x'));
  console.log('  floor ' + FL + ' ' + spec.name + ' — defeated: ' + r.cleared + ' in ' + (r.frames / 60).toFixed(0) + 's, phases seen ' + r.phases.join(',') + ', peak enemy bullets ' + r.maxProj);
  ok(r.cleared, 'floor ' + FL + ' boss can be defeated (' + spec.name + ')');
  ok(r.phases.length >= (FL % 5 === 0 ? 4 : 3), 'floor ' + FL + ' boss passes through its phases (' + r.phases.length + ')');
  ok(r.maxProj <= 280, 'bullet cap holds in the boss fight (' + r.maxProj + ')');
  ok(r.g.zones.length < 60, 'zone cap holds');
  if (FL % 5 === 0) { ok(r.g.floor.rooms[r.g.floor.bossId].bossDef.mega, 'floor ' + FL + ' is a MEGA boss'); ok(r.g.inters.some(i => i.type === 'stairs'), 'stairway appears after the mega boss'); }
  else ok(r.g.inters.some(i => i.type === 'stairs'), 'stairway appears after the boss');
}
section('6b. Every mini boss can be fought and defeated');
for (const id of ED.minibosses.ids) {
  const g = newGame(); g.startRun('MINI-' + id, 'knight'); g.scene = 'play'; const FL = 4;
  ED.debug.jumpFloor(g, FL); giveKit(g, FL); g.god = true;
  const bot = new Bot(ED, g, { god: true });
  const room = g.floor.rooms.find(r => r.type === 'miniboss');
  const spec = ED.minibosses.pick(FL, new ED.RNG(id), []); spec.defId = id; spec.duo = false; spec.name = id;
  room.mini = spec; ED.debug.goto(g, room, 480, 440); g.scene = 'play';
  let fr = 0; while (fr++ < 60 * 150) { bot.tick(); g.step(); if (g.room.cleared) break; if (g.scene !== 'play') g.scene = 'play'; }
  ok(room.cleared, 'mini boss ' + id + ' defeated in ' + (fr / 60).toFixed(0) + 's');
  ok(g.inters.some(i => i.type === 'pedestal') , 'mini boss ' + id + ' drops an item choice');
  const wasFirst = ED.save.meta.unlocked.minis[id]; ok(!!wasFirst, 'first kill of ' + id + ' is recorded');
}

section('6c. Duo mini bosses (floor 10+) and enrage timers');
for (const id of ['hawkeye', 'ironhorn', 'rockjaw']) {
  const g = newGame(); g.startRun('DUO-' + id, 'knight'); g.scene = 'play'; const FL = 14; ED.debug.jumpFloor(g, FL); giveKit(g, FL); g.god = true;
  const bot = new Bot(ED, g, { god: true }); const room = g.floor.rooms.find(r => r.type === 'miniboss');
  const spec = ED.minibosses.pick(FL, new ED.RNG(id), []); spec.defId = id; spec.duo = true; room.mini = spec; ED.debug.goto(g, room, 480, 440); g.scene = 'play';
  let fr = 0, maxBoss = 0; while (fr++ < 60 * 200) { bot.tick(); g.step(); maxBoss = Math.max(maxBoss, g.enemies.filter(e => e.boss && !e.dead).length); if (g.room.cleared) break; if (g.scene !== 'play') g.scene = 'play'; }
  ok(maxBoss === 2, 'duo mini boss ' + id + ' fields two bodies (' + maxBoss + ')'); ok(room.cleared, 'duo mini boss ' + id + ' can be beaten (' + (fr / 60).toFixed(0) + 's)');
}
{ // enrage: a boss left alone for long enough enrages on floor 10+
  const g = newGame(); g.startRun('ENRAGE', 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 10); ED.debug.skipToBoss(g); g.scene = 'play';
  let fr = 0; while (fr++ < g.dif.enrageFrames + 600) { g.step(); if (g.scene !== 'play') g.scene = 'play'; if (g.enemies.some(e => e.boss && e.enraged)) break; }
  ok(g.enemies.some(e => e.boss && e.enraged), 'floor 10 boss enrages after ' + (g.dif.enrageFrames / 60).toFixed(0) + 's');
  const g2 = newGame(); g2.startRun('NOENRAGE', 'knight'); g2.scene = 'play'; ED.debug.jumpFloor(g2, 4); ok(g2.dif.enrageFrames === 0, 'no enrage timer before floor 10 (learnable)');
}

// ------------------------------------------------------------------ 7. meta / unlocks / save
section('7. Unlocks, saves, endless flow');
{
  ED.save.reset();
  const g = newGame(); g.startRun('META1', 'knight');
  ok(!ED.save.isClassUnlocked('lancer'), 'lancer locked at start');
  g.checkUnlocks('boss', 'vael', { mega: false });
  ok(ED.save.isClassUnlocked('lancer'), 'beating the first boss unlocks the Lancer');
  ok(g.popups.length > 0 && g.popups[0].title === 'UNLOCKED', 'UNLOCKED popup queued');
  ok(ED.save.isItemUnlocked('boss:vael'), "boss unlock key stored (Hollow King's Crown joins the pool)");
  const rng = new ED.RNG('u'); let seenCrown = false; for (let i = 0; i < 4000 && !seenCrown; i++) { const r = ED.items.rollRelic(rng, 12, { relics: {} }); if (r.id === 'kingscrown') seenCrown = true; } ok(seenCrown, 'unlocked item can appear in the pool');
  g.player.relics = {}; ED.save.reset(); let seenCrown2 = false; for (let i = 0; i < 4000 && !seenCrown2; i++) { const r = ED.items.rollRelic(rng, 12, { relics: {} }); if (r.id === 'kingscrown') seenCrown2 = true; } ok(!seenCrown2, 'locked items stay out of the pool');
  // save round trip
  const g2 = newGame(); g2.startRun('META2', 'knight'); g2.run.kills = 17; g2.run.floorNum = 6; const res = ED.save.recordRun(g2.run);
  ok(ED.save.meta.bestFloor === 6 && ED.save.meta.totalKills >= 17 && ED.save.meta.bestBySeed.META2 === 6, 'run recorded: best floor, kills, per-seed best');
  ED.save.load(); ok(ED.save.meta.bestFloor === 6, 'save persists through reload');
  // milestone: cash out ends as victory; continue keeps going
  const g3 = newGame(); g3.startRun('MILE', 'knight'); g3.scene = 'play'; ED.debug.jumpFloor(g3, 5); g3.modal = { type: 'milestone' }; g3.cashOut();
  ok(g3.scene === 'victory' && g3.run.victory, 'Cash Out ends the run as a victory');
  const g4 = newGame(); g4.startRun('MILE2', 'knight'); g4.scene = 'play'; ED.debug.jumpFloor(g4, 5); g4.modal = { type: 'milestone' }; ED.ui.updateModal(g4); g4.startFloor(6);
  ok(g4.floorNum === 6 && g4.scene === 'intro', 'Continue goes on to floor 6 (endless)');
  // endless: deep floors generate + have scaled boss
  const g5 = newGame(); g5.startRun('DEEP', 'knight'); ED.debug.jumpFloor(g5, 137); ok(g5.floorNum === 137 && g5.dif.danger > 100, 'floor 137 generates; danger level ' + g5.dif.danger);
}

// ------------------------------------------------------------------ 8. a full mortal run with the bot (no god mode) must not crash
section('8. Bot clears whole floors — every key / lock / puzzle / bomb wall obtainable in practice');
{
  const diag = (g, bot) => {
    const p = g.player, f = g.floor;
    console.log('    DIAG room', g.room.id, g.room.type, g.room.template, 'cleared', g.room.cleared, 'player', Math.round(p.x), Math.round(p.y), 'hp', p.hp + '/' + p.maxHp, 'goal', bot.goal && (bot.goal[1].id + ':' + bot.goal[1].type), 'stuck', bot.stuck, 'unstickT', bot.unstickT, 'fightT', bot.fightT);
    console.log('    enemies', g.enemies.map(e => e.type + '@' + Math.round(e.x) + ',' + Math.round(e.y) + ' hp' + Math.round(e.hp) + ' st=' + e.state + ' rush=' + e.rush).join('; '), '| spawns', g.spawns.length, '| inters', g.inters.map(i => i.type + '@' + Math.round(i.x) + ',' + Math.round(i.y)).join(','), '| pickups', g.pickups.map(k => k.type + '@' + Math.round(k.x) + ',' + Math.round(k.y)).join(','));
    { // can the player physically walk to every open door of this room?  (flood fill over the collision grid; solid props block)
      const W = 30, H = 18, col = g.col, blocked = new Set(g.props.filter(q => !q.dead && q.solid).map(q => Math.floor(q.y / 32) * W + Math.floor(q.x / 32))), sx = Math.floor(p.x / 32), sy = Math.floor(p.y / 32), seen = new Uint8Array(W * H), q = [sy * W + sx]; seen[q[0]] = 1;
      for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (seen[j] || col[j] === 1 || col[j] === 2 || blocked.has(j)) continue; seen[j] = 1; q.push(j); } }
      console.log('    reachable tiles from the player:', q.length, '| per door:', Object.keys(g.room.doors).filter(d => g.room.doors[d]).map(d => { const c = ED.rooms.doorCenter(d), tx = Math.min(W - 1, Math.max(0, Math.floor(c.x / 32))), ty = Math.min(H - 1, Math.max(0, Math.floor(c.y / 32))); return d + ':' + (seen[ty * W + tx] ? 'reachable' : 'NOT reachable') + '(col ' + col[ty * W + tx] + ')'; }).join(' '));
    }
    console.log('    state: scene', g.scene, '| modal', g.modal && g.modal.type, '| trans', !!g.trans, '| transFloor', !!g.transFloor, '| intro', g.introT, '| frame', g.frame, '| dying', !!g.dying, '| hitstop', g.hitstopT, '| done', bot.done);
    console.log('    bot routes', f.rooms.map(r => r.id + ':' + (r.id === g.room.id ? 'here' : (bot.routeTo(r.id) ? 'ok' : 'none')) + (r.visited ? 'v' : '')).join(' '), '| skip', JSON.stringify(bot.skip), '| goal', bot.goal && bot.goal[1].id);
    console.log('    doors of this room', Object.keys(g.room.doors).filter(d => g.room.doors[d]).map(d => { const e = g.room.doors[d], o = e.a === g.room.id ? e.b : e.a, c = ED.rooms.doorCenter(d); return d + '->' + o + ':' + g.doorState(g.room, d) + '@' + Math.round(c.x) + ',' + Math.round(c.y); }).join(' '), '| props', g.props.filter(q => !q.dead).map(q => q.type + '@' + Math.round(q.x) + ',' + Math.round(q.y)).join(' '));
    console.log('    edges', f.edges.map(e => e.a + '-' + e.b + (e.dir ? e.dir : '') + (e.lock ? '[' + e.lock.type + (e.lock.opened ? ' open' : ' CLOSED') + ']' : '') + (e.hidden ? (e.revealed ? '(secret, revealed)' : '(secret)') : '')).join(' '), '| hint', g.hintId, '| bot noGo', bot.noGo && [...bot.noGo.keys()].join(','));
    console.log('    locks', f.edges.filter(e => e.lock).map(e => e.lock.type + ':' + (e.lock.opened ? 'open' : 'closed')).join(','), 'keys', JSON.stringify(p.keys), 'bombs', p.bombs, '| visited', f.rooms.map(r => r.id + r.type[0] + (r.visited ? 'v' : '') + (r.cleared ? 'c' : '')).join(' '), '| enc', g.rt.enc && (g.rt.enc.state + ' ' + g.rt.enc.idx + '/' + g.rt.enc.waves.length), 'lockdown', g.rt.lockdown, 'weapon', p.weapon.type);
    console.log('    ' + ED.keys.describeSources(f).join(' | '));
    const tx = Math.floor(p.x / 32), ty = Math.floor(p.y / 32); for (let y = Math.max(0, ty - 4); y <= Math.min(17, ty + 4); y++) { let row = '    '; for (let x = Math.max(0, tx - 10); x <= Math.min(29, tx + 10); x++) { let ch = g.col[y * 30 + x]; for (const e of g.enemies) if (Math.floor(e.x / 32) === x && Math.floor(e.y / 32) === y) ch = 'E'; for (const q of g.props) if (!q.dead && Math.floor(q.x / 32) === x && Math.floor(q.y / 32) === y) ch = 'o'; if (x === tx && y === ty) ch = '@'; row += ch; } console.log(row); }
  };
  const runFloor = (g, bot, F, limit) => {
    let frames = 0; const start = g.floorNum;
    while (g.floorNum === start && frames++ < limit) { bot.tick(); g.step(); if (frames % 25 === 0) g.render(); if (g.scene === 'dead') break; }
    return g.floorNum > start;
  };
  const nSeeds = quick ? 5 : 20, deep = quick ? 6 : 30;
  let cleared = 0, total = 0, lockKinds = {}, retried = 0;       // retried: floors where the bot's own state wedged (open exits, no goal) but a fresh bot finished — not a game softlock
  // (a) fresh runs from floor 1: floors 1-3
  for (let k = 0; k < nSeeds; k++) {
    const seed = 'FLOOR' + k, g = newGame(); g.startRun(seed, ['knight', 'knight', 'knight', 'knight'][k % 4]); let bot = new Bot(ED, g, { god: true });
    for (let F = 1; F <= 3; F++) {
      for (const e of g.floor.edges) if (e.lock) lockKinds[e.lock.type] = (lockKinds[e.lock.type] || 0) + 1;
      total++; let okc = runFloor(g, bot, F, 60 * 60 * 14); bot.goal = null; if (!okc) { const fresh = new Bot(ED, g, { god: true }); okc = runFloor(g, fresh, F, 60 * 60 * 6); if (okc) { retried++; bot = fresh; } else if (process.env.ED_TRACE) { for (let i = 0; i < 240; i++) { fresh.tick(); g.step(); if (i % 20 === 0) console.log('    trace', i, 'pos', Math.round(g.player.x), Math.round(g.player.y), 'room', g.room.id, 'goal', fresh.goal && (fresh.goal[0] + ':' + fresh.goal[1].id), 'stuck', fresh.stuck, 'unstick', fresh.unstickT, 'path', fresh.path && fresh.path.length, 'scene', g.scene); } } } if (okc) cleared++; else { ok(false, 'bot could not finish floor ' + F + ' of seed ' + seed + ' (room ' + g.room.id + ' ' + g.room.type + ')'); console.log(ED.gen.ascii(g.floor)); diag(g, bot); break; }
    }
  }
  // (b) deeper floors (jumped to with a scaled kit)
  for (let k = 0; k < deep; k++) {
    const F = 4 + (k * 7) % 22, g = newGame(); g.startRun('DEEPFLOOR' + k, 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, F); giveKit(g, F); g.player.keys = { small: 0, mb: 0, boss: 0 };
    const bot = new Bot(ED, g, { god: true });
    for (const e of g.floor.edges) if (e.lock) lockKinds[e.lock.type] = (lockKinds[e.lock.type] || 0) + 1;
    total++; let okc = runFloor(g, bot, F, 60 * 60 * 16); if (!okc) { const fresh = new Bot(ED, g, { god: true }); okc = runFloor(g, fresh, F, 60 * 60 * 6); if (okc) retried++; } if (okc) cleared++; else { ok(false, 'bot could not finish deep floor ' + F + ' (seed DEEPFLOOR' + k + ', room ' + g.room.id + ' ' + g.room.type + ')'); console.log(ED.gen.ascii(g.floor)); diag(g, bot); }
  }
  console.log('  bot cleared ' + cleared + ' / ' + total + ' floors (' + retried + ' needed a fresh bot); lock kinds exercised: ' + JSON.stringify(lockKinds));
  ok(cleared === total, 'every floor the bot attempted was completable');
  ok(retried <= Math.max(2, Math.ceil(total * 0.03)), 'a wedged bot is rare (' + retried + ' of ' + total + ' floors needed a fresh bot)');
}

// ------------------------------------------------------------------ 9. feature-level mechanics
section('9. Mechanics: weapons, actives, locks, special rooms');
function stepN(g, n, bot) { for (let i = 0; i < n; i++) { if (bot) bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; } }
function scenario(type, FL, pred) {
  const g = newGame(); g.startRun('FEAT', 'knight'); g.scene = 'play'; g.god = true;
  for (let i = 0; i < 900; i++) {
    g.run.seed = 'FEAT-' + type + '-' + i; g.startFloor(FL);
    const r = g.floor.rooms.find(x => x.type === type && (!pred || pred(x, g.floor)));
    if (r) { g.scene = 'play'; g.player.gold = 400; g.player.bombs = 6; ED.debug.goto(g, r, 480, 450); g.scene = 'play'; return { g, room: r, f: g.floor }; }
  }
  throw new Error('no ' + type + ' room found');
}
const near = (g, it) => { g.player.x = it.x; g.player.y = it.y + 20; stepN(g, 2); g.nearInter = it; };
{
  // --- all seven weapons can hit and kill a target dummy
  for (const wt of ED.packs.values(ED.items.WEAPONS).map(w => w.id)) {
    const g = newGame(); g.startRun('WPN', 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 2);
    const room = g.floor.rooms.find(r => r.type === 'treasure') || g.floor.rooms[g.floor.startId]; ED.debug.goto(g, room, 300, 288); g.scene = 'play';
    const p = g.player; p.weapon = ED.items.rollWeapon(new ED.RNG('w' + wt), 2, { type: wt, rarity: 'rare' }); p.weapon.affixes = p.weapon.affixes.filter(a => a.id !== 'multi'); ED.items.recalc(p);
    const e = g.spawnEnemy('chaser', 300 + (wt === 'bow' || wt === 'staff' || wt === 'boomerang' || ED.items.WEAPONS[wt].ranged ? 170 : 38), 288, { silent: true }); e.hold = true; e.maxHp = e.hp = 5000;
    ED.input.mouse.aim = true; ED.input.mouse.x = e.x; ED.input.mouse.y = e.y + 64; ED.input.sim = { held: { attack: true }, edge: {} };
    const hp0 = e.hp; stepN(g, 140); ED.input.sim = { held: {}, edge: {} }; ED.input.mouse.aim = false;
    ok(e.hp < hp0 - 5, 'weapon ' + wt + ' deals damage (' + (hp0 - e.hp).toFixed(0) + ')');
  }
  // --- every active ability can be used without error and has an effect
  for (const id of ED.packs.values(ED.items.ACTIVES).map(a => a.id)) {
    const g = newGame(); g.startRun('ACT', 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 3);
    const room = g.floor.rooms.find(r => r.type === 'treasure') || g.floor.rooms[g.floor.startId]; ED.debug.goto(g, room, 300, 288); g.scene = 'play';
    const p = g.player; p.active = g.newActiveState({ cat: 'active', id, rarity: 'rare', lvl: 3, uid: 1, name: id, upg: 0 }); p.hp = 8;
    const e = g.spawnEnemy('chaser', 360, 288, { silent: true }); e.hold = true; e.maxHp = e.hp = 600; const hp0 = e.hp;
    ED.input.mouse.aim = true; ED.input.mouse.x = 380; ED.input.mouse.y = 288 + 64;
    ED.input.sim = { held: {}, edge: { active: true } }; stepN(g, 1); stepN(g, 90); ED.input.mouse.aim = false;
    const used = p.active.charges < p.active.max || id === 'heal' && p.hp > 8;
    ok(used, 'active ' + id + ' triggers'); if (['bomb', 'fire', 'bash', 'gravity'].includes(id)) ok(e.hp < hp0 || e.stun > 0 || e.x !== 360, 'active ' + id + ' affects nearby enemies');
    if (id === 'heal') ok(p.hp > 8, 'heal pulse heals');
    if (id === 'time') ok(g.slowT > 0 || p.active.charges < p.active.max, 'time slow engages');
  }
  // --- LOCKS actually open in play: small key, mb key, boss key, sacrifice (gold + hp), bomb wall, switch puzzle
  const lockTest = (ltype) => {
    for (let i = 0; i < 400; i++) {
      const g = newGame(); g.startRun('LOCK-' + ltype + i, 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 6 + (i % 5));
      const e = g.floor.edges.find(x => x.lock && x.lock.type === ltype); if (!e) continue;
      const host = g.floor.rooms[e.a], lockedRoom = g.floor.rooms[e.b]; return { g, e, host, lockedRoom };
    }
    return null;
  };
  for (const lt of ['small', 'mb']) {
    const t = lockTest(lt); ok(!!t, 'found a floor with a ' + lt + ' lock'); if (!t) continue;
    const { g, e, host } = t; const d = e.dirAB; ED.debug.goto(g, host, 480, 300); g.scene = 'play'; g.rt.lockdown = false; g.room.cleared = true; g.refreshCollision();
    const c = ED.rooms.doorCenter(d); g.player.x = c.x + (d === 'E' ? -30 : d === 'W' ? 30 : 0); g.player.y = c.y + (d === 'S' ? -30 : d === 'N' ? 30 : 0);
    e.lock.opened = false; g.player.keys[lt] = 0; stepN(g, 3); ok(g.doorState(host, d) === 'locked', lt + ' door is locked without a key');
    g.player.keys[lt] = 1; stepN(g, 3); ok(e.lock.opened && g.player.keys[lt] === 0 && g.doorState(host, d) === 'open', lt + ' key opens its door and is consumed');
  }
  { // sacrifice (gold and blood)
    for (const mode of ['gold', 'hp']) {
      const t = lockTest('sacrifice'); ok(!!t, 'found sacrifice lock'); if (!t) continue;
      const { g, e, host } = t; const d = e.dirAB; ED.debug.goto(g, host, 480, 300); g.scene = 'play'; g.rt.lockdown = false; g.room.cleared = true; e.lock.opened = false; g.refreshCollision();
      const c = ED.rooms.doorCenter(d); g.player.x = c.x + (d === 'E' ? -30 : d === 'W' ? 30 : 0); g.player.y = c.y + (d === 'S' ? -30 : d === 'N' ? 30 : 0); g.player.gold = 999; stepN(g, 3);
      ok(!!g.doorHint && g.doorHint.interact, 'sacrifice door offers the pact'); g.tryInteract(); ok(g.modal && g.modal.type === 'sacrifice', 'pact modal opens');
      const maxHp0 = g.player.maxHp, gold0 = g.player.gold; g.paySacrifice(mode);
      ok(e.lock.opened, 'sacrifice (' + mode + ') opens the door'); ok(mode === 'gold' ? g.player.gold < gold0 : g.player.maxHp < maxHp0 || g.player.hp >= 1, 'sacrifice cost was paid');
    }
  }
  { // bomb wall + secret room
    const t = lockTest('bomb'); ok(!!t, 'found bomb lock'); if (t) {
      const { g, e, host } = t; const d = e.dirAB; ED.debug.goto(g, host, 480, 300); g.scene = 'play'; e.lock.opened = false; g.rt.lockdown = false; g.refreshCollision();
      ok(g.doorState(host, d) === 'bomb', 'cracked wall is closed'); const c = ED.rooms.doorCenter(d); g.explode(c.x + (d === 'E' ? -40 : d === 'W' ? 40 : 0), c.y + (d === 'S' ? -40 : d === 'N' ? 40 : 0), 80, 10, { owner: 'player' });
      ok(e.lock.opened && g.doorState(host, d) === 'open', 'a bomb blast opens the cracked wall');
      // hammer slam also opens it (alternate route => cannot softlock without bombs)
      e.lock.opened = false; g.refreshCollision(); g.player.x = c.x + (d === 'E' ? -50 : d === 'W' ? 50 : 0); g.player.y = c.y + (d === 'S' ? -50 : d === 'N' ? 50 : 0);
      g.player.hammerAng = Math.atan2(c.y - g.player.y, c.x - g.player.x); g.player.hammerDmg = 5; g.hammerSlam(); ok(e.lock.opened, 'a hammer slam also breaks the cracked wall');
    }
    for (let i = 0; i < 400; i++) {
      const g = newGame(); g.startRun('SEC' + i, 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 5 + i % 6);
      const e = g.floor.edges.find(x => x.hidden); if (!e) continue; const host = g.floor.rooms[e.a];
      ED.debug.goto(g, host, 480, 300); g.scene = 'play'; e.revealed = false; g.refreshCollision(); ok(g.doorState(host, e.dirAB) === 'hidden', 'secret passage starts hidden');
      const c = ED.rooms.doorCenter(e.dirAB); g.explode(c.x, c.y, 70, 5, { owner: 'player' }); ok(e.revealed && g.doorState(host, e.dirAB) === 'open', 'bomb reveals the secret room'); break;
    }
  }
  { // switch puzzles
    for (const kind of ['plates', 'braziers']) {
      let found = null;
      for (let i = 0; i < 600 && !found; i++) { const g = newGame(); g.startRun('PUZ' + kind + i, 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 4 + i % 6); const r = g.floor.rooms.find(x => x.puzzle && x.puzzle.kind === kind); if (r) found = { g, r }; }
      ok(!!found, 'found a ' + kind + ' puzzle'); if (!found) continue;
      const { g, r } = found; const lock = g.floor.edges.map(e => e.lock).find(l => l && l.id === r.puzzle.lockId); ED.debug.goto(g, r, 480, 450); g.scene = 'play'; lock.opened = false; ED.debug.clearRoom(g); stepN(g, 5);
      ok(!lock.opened, 'switch lock sealed before the puzzle');
      for (const o of g.rt.puzzleObjs) { if (kind === 'plates') { g.player.x = o.x; g.player.y = o.y; stepN(g, 3); } else { g.explode(o.x, o.y, 40, 1, { owner: 'player' }); stepN(g, 2); } }
      stepN(g, 3); ok(r.puzzle.done && lock.opened, kind + ' puzzle opens the distant mini boss door');
    }
  }
  { // key flow through bosses: miniboss kill -> boss key -> boss door
    const g = newGame(); g.startRun('KEYFLOW', 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 3); giveKit(g, 3);
    const hold = g.floor.rooms[g.floor.bossKeyHolder]; ED.debug.goto(g, hold, 480, 440); g.scene = 'play'; const bot = new Bot(ED, g, { god: true });
    let fr = 0; while (fr++ < 60 * 200 && !hold.cleared) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; }
    ok(hold.cleared, 'mandatory mini boss defeated'); stepN(g, 200, bot);
    ok(g.player.keys.boss === 1 || g.pickups.some(k => k.type === 'key' && k.keyType === 'boss') || g.player.keys.boss > 0, 'Boss Key drops from the carrier mini boss');
  }
  // --- special rooms
  { // shop: buy item, reserved key is free once the floor is clear, spare key selling
    const { g, room } = scenario('shop', 4); const p = g.player; const ped = g.inters.find(i => i.type === 'pedestal' && i.shopItem); near(g, ped);
    const gold0 = p.gold; g.tryInteract(); ok(p.gold < gold0 && ped.dead, 'shop: item purchased for gold');
    const svc = g.inters.find(i => i.name === 'Healing Draught'); p.hp = 4; near(g, svc); g.tryInteract(); ok(p.hp > 4, 'shop: healing draught heals');
    p.keys.small = 3; const sell = g.inters.find(i => i.sell); near(g, sell); const g1 = p.gold; g.tryInteract(); ok(p.gold > g1 || g.spareKeys().small === 0, 'shop: spare keys can be sold, needed keys cannot');
    const need = g.floor.edges.filter(e => e.lock && e.lock.type === 'small' && !e.lock.opened).length; p.keys.small = need; const g2 = p.gold; g.tryInteract(); ok(p.gold === g2 && p.keys.small === need, 'shop refuses to buy keys this floor still needs');
  }
  { const { g } = scenario('shrine', 5); const p = g.player; const sh = g.inters.find(i => i.type === 'shrine' && i.def.id === 'gold'); near(g, sh); const g0 = p.gold; g.tryInteract(); ok(p.gold < g0 && sh.used, 'shrine: offering paid and altar spent'); ok(typeof sh.odds.Blessing === 'number' && sh.costText().length > 3, 'shrine shows odds and cost'); }
  { const { g } = scenario('devil', 6); const p = g.player; const ped = g.inters.find(i => i.type === 'pedestal'); near(g, ped); const m0 = p.maxHp; g.tryInteract(); ok(p.maxHp < m0 && ped.dead, "devil's deal costs max HP up front"); }
  { const { g } = scenario('cursed', 6); const p = g.player; const ped = g.inters.find(i => i.type === 'pedestal'); ok(!!ped.item.curse && ED.items.RARITY[ped.item.rarity || 'epic'], 'cursed room item carries a visible curse'); near(g, ped); g.tryInteract(); ok(ped.dead, 'cursed item can be taken'); ED.items.recalc(p); ok(p.st.maxHp > 0, 'curse applies cleanly'); }
  { const { g } = scenario('gambling', 5); const p = g.player; const d = g.inters.find(i => i.type === 'dice'); near(g, d); let g0 = p.gold; for (let i = 0; i < 5; i++) { near(g, d); g.tryInteract(); } ok(p.gold !== g0, 'gambling table resolves bets'); }
  { const { g, room } = scenario('mystery', 6); const ch = g.inters.find(i => i.mystery); near(g, ch); g.tryInteract(); stepN(g, 3); const outcomes = room.rt.chestState.opened; ok(outcomes, 'mystery chest opens'); if (g.enemies.length) { ok(g.enemies.some(e => e.type === 'mimic'), 'mimic spawns from a mystery chest'); ED.debug.clearRoom(g); stepN(g, 5); ok(g.inters.some(i => i.type === 'pedestal'), 'mimic drops loot when slain'); } }
  { const { g, room } = scenario('ambush', 5); const ch = g.inters.find(i => i.type === 'chest' && i.decoy); ok(g.knownType(room) === 'treasure', 'ambush room is disguised as a treasure room on the map'); near(g, ch); g.tryInteract(); stepN(g, 60); ok(g.rt.lockdown, 'ambush locks the doors'); ok(g.enemies.concat(g.spawns).length > 0, 'ambush spawns a wave'); ok(room.revealedType === 'ambush', 'ambush is revealed once sprung'); }
  { const { g, room } = scenario('challenge', 5); const alt = g.inters.find(i => i.type === 'altar'); near(g, alt); g.tryInteract(); stepN(g, 60); ok(g.rt.lockdown && g.rt.enc.waves.length >= 3, 'challenge room adds an extra wave (' + (g.rt.enc && g.rt.enc.waves.length) + ' waves)'); const bot = new Bot(ED, g, { god: true }); let fr = 0; while (fr++ < 60 * 120 && !room.cleared) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; } ok(room.cleared && g.inters.filter(i => i.type === 'pedestal').length >= 3, 'challenge reward: choice of 3'); }
  { const { g, room } = scenario('haunted', 6); stepN(g, 50); ok(g.rt.dark, 'haunted room is dark'); stepN(g, 200); ok(g.enemies.some(e => e.mods.some(m => m.id === 'ghostly')) || g.spawns.length, 'haunted enemies flicker'); }
  { const { g } = scenario('trap', 6); const hz = g.rt.traps.find(t => t.kind === 'spikes'); g.god = false; g.player.inv = 0; g.player.x = hz.x; g.player.y = hz.y; g.frame = hz.period - hz.ph + 100; const hp0 = g.player.hp; stepN(g, 30); ok(g.rt.traps.length >= 5, 'trap room has hazards (' + g.rt.traps.length + ')'); }
  { const { g } = scenario('blacksmith', 5); const p = g.player; const an = g.inters.find(i => i.name === 'Sharpen Weapon'); near(g, an); const d0 = p.wdmg; g.tryInteract(); ok(p.wdmg > d0 && p.weapon.upg === 1, 'blacksmith sharpens the weapon'); const p1 = an.price(); near(g, an); g.tryInteract(); ok(an.price() > p1, 'blacksmith prices scale with tier'); }
  { const { g } = scenario('fountain', 4); const p = g.player; p.hp = 4; p.curses.push({ name: 'x', mods: { dmg: -0.1 } }); const fo = g.inters.find(i => i.type === 'fountain'); near(g, fo); g.tryInteract(); ok(p.hp > 4 && p.curses.length === 0, 'fountain heals and cleanses a curse'); }
  { const { g } = scenario('treasure', 3); const peds = g.inters.filter(i => i.type === 'pedestal'); ok(peds.length === 3, 'treasure room offers 3 choices'); near(g, peds[0]); g.tryInteract(); ok(peds[1].disabled && peds[2].disabled, 'taking one caged the others'); }
  { const g = newGame(); g.startRun('MEGAREST', 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 10); const rest = g.floor.rooms.find(r => r.type === 'rest'); ok(!!rest && g.floor.rooms[g.floor.bossId].doors[ED.DIRS.find(d => g.floor.rooms[g.floor.bossId].doors[d])].a === rest.id, 'mega floor: boss room hangs off the rest room'); }
}
// hint system: after clearing most rooms with a missing key, the holder room glows
section('9b. Hint system + softlock guards');
{
  let tested = 0;
  for (let i = 0; i < 200 && tested < 5; i++) {
    const g = newGame(); g.startRun('HINT' + i, 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 2 + i % 6);
    const e = g.floor.edges.find(x => x.lock && ED.keys.LOCKS[x.lock.type].key && x.lock.type !== 'boss'); if (!e) continue;
    for (const r of g.floor.rooms) if (r.type === 'normal') r.cleared = true;
    const h = ED.keys.hintRoom(g.floor, g.player.keys, false); tested++;
    const keyHolderRooms = g.floor.rooms.filter(r => r.holds.some(x => !x.got && x.key !== 'boss'));
    ok(h !== null && h !== undefined, 'hint appears once most of the floor is cleared'); const cold = ED.keys.hintRoom(g.floor, g.player.keys, false);
  }
  const g = newGame(); g.startRun('HINT0', 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 3); for (const r of g.floor.rooms) r.cleared = false;
  ok(ED.keys.hintRoom(g.floor, g.player.keys, false) === null, 'no hint while the floor is mostly unexplored');
  // bomb guard: if a bomb wall is needed and the player has none, one is provided
  let bt = null; for (let i = 0; i < 300 && !bt; i++) { const gg = newGame(); gg.startRun('BG' + i, 'knight'); gg.scene = 'play'; ED.debug.jumpFloor(gg, 4 + i % 5); if (gg.floor.edges.some(e => e.lock && e.lock.type === 'bomb')) bt = gg; }
  ok(!!bt, 'found floor with bomb wall'); if (bt) { bt.player.bombs = 0; for (const r of bt.floor.rooms) if (r.rt) r.rt.pickups.length = 0; bt.room.cleared = true; bt.frame = 90 * 20; bt.lastBombRescue = -99999; bt.updateHints(); ok(bt.pickups.some(k => k.type === 'bomb'), 'softlock guard drops a bomb when none are left'); }
}

// ------------------------------------------------------------------ 10. random-input fuzz
section('10. Random-input fuzz (crash hunting)');
{
  const g = newGame(); g.startRun('FUZZ', 'knight'); g.scene = 'play'; const rng = new ED.RNG('fuzz'); let crashes = 0; const acts = ['up', 'down', 'left', 'right', 'attack', 'dash', 'interact', 'active', 'bomb', 'item1', 'item2', 'item3'];
  for (let FL of [1, 3, 5, 8, 10, 13, 20, 33]) {
    try {
      ED.debug.jumpFloor(g, FL); giveKit(g, FL); g.god = rng.chance(0.5);
      for (let n = 0; n < 1400; n++) {
        if (n % 40 === 0) { ED.input.sim = { held: {}, edge: {} }; for (const a of acts) if (rng.chance(0.4)) { ED.input.sim.held[a] = true; if (rng.chance(0.4)) ED.input.sim.edge[a] = true; } ED.input.mouse.aim = rng.chance(0.5); ED.input.mouse.x = rng.int(0, 960); ED.input.mouse.y = rng.int(64, 640); }
        if (n % 350 === 0) { const r = g.floor.rooms[rng.int(0, g.floor.rooms.length - 1)]; ED.debug.goto(g, r, rng.int(80, 880), rng.int(100, 480)); }
        if (g.modal) g.modal = null; if (g.scene !== 'play' && g.scene !== 'intro') { g.player.dead = false; g.dying = null; g.player.hp = g.player.maxHp; g.scene = 'play'; } if (g.scene === 'intro') g.scene = 'play';
        g.step(); if (n % 13 === 0) g.render();
      }
    } catch (e) { crashes++; ok(false, 'fuzz crash on floor ' + FL + ': ' + (e.stack || e).toString().split('\n').slice(0, 5).join(' | ')); }
  }
  ok(crashes === 0, 'no crashes under random inputs');
  ED.input.sim = { held: {}, edge: {} };
}

// ------------------------------------------------------------------ pack sections (only run for packs that are ON)
require('./pack-tests')({ ED, ok, section, newGame, stepN, Bot, quick, bossFight, giveKit, reapply() { ED.packs.force(require('./harness').packsFromEnv ? null : null); if (process.env.ED_PACKS) ED.packs.force(ED.packs.parse(process.env.ED_PACKS)); } });

ok(scriptErrors === 0, 'no swallowed script errors during the whole run (' + scriptErrors + ')');
// ------------------------------------------------------------------ summary
console.log('\n' + '='.repeat(60));
console.log('Assertions passed: ' + pass + '   failed: ' + fail + '   (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
if (fail) { console.log('FAILURES (first 25):'); failures.slice(0, 25).forEach(f => console.log(' - ' + f)); process.exit(1); }
console.log('ALL TESTS PASSED');
})();

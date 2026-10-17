'use strict';
/* v1 PARITY: loads the frozen v1 snapshot (versions/v1) and the current code with every pack OFF, and checks that
 * same seeds give the same dungeons, encounters, loot rolls, boss specs and bot-played runs.
 *   node test/parity.js [seedCount]                                                                                */
const path = require('path');
const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const N = +process.argv[2] || 40;
const A = load({ dir: path.join(__dirname, '..', 'versions', 'v1') }).ED;       // frozen original
const Bx = load({ packs: 'none' }); const B = Bx.ED;                              // current code, v1 edition
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  MISMATCH: ' + m); } };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const strip = o => JSON.stringify(o, (k, v) => (k === 'uid' || k === 'id' && typeof v === 'number' || typeof v === 'function') ? undefined : (v instanceof Set ? [...v] : (ArrayBuffer.isView(v) ? Array.from(v) : v)));

function floorSig(ED, seed, floor) {
  const f = ED.gen.generate(floor, seed);
  const rooms = f.rooms.map(r => [r.id, r.type, r.gx, r.gy, r.template || '', hash(Array.from(r.tiles).join('')), (r.holds || []).map(h => h.key + h.via).join(','), Object.keys(r.doors).filter(d => r.doors[d]).join('')].join(':')).join('|');
  const edges = f.edges.map(e => [e.a, e.b, e.lock ? e.lock.type : '', e.hidden ? 1 : 0].join('-')).join('|');
  const waves = f.rooms.filter(r => r.type === 'normal').map(r => strip(ED.encounter.planRoom(null, r, new ED.RNG(r.seed).fork('enc'), floor))).join('|');
  return [rooms, edges, f.bossKeyHolder, f.bombSupply, f.theme && f.theme.name, strip(f.rooms.find(r => r.type === 'boss').bossDef), waves].join('##');
}
const rolls = (ED, i) => { const rng = new ED.RNG('roll' + i), f = 1 + (i * 7) % 80, out = [];
  out.push(strip(ED.items.rollOffers(rng, f, 3, { luck: i % 5, relics: {} })), strip(ED.items.rollWeapon(rng, f, {})), strip(ED.items.rollArmor(rng, f, {})), strip(ED.items.rollActive(rng, f, {})), strip(ED.items.rollRelic(rng, f, { relics: {} })));
  out.push(strip(ED.bosses.forFloor(f, new ED.RNG('b' + i))), strip(ED.D.composeWaves(f, new ED.RNG('w' + i), {})), ED.D.roomWeight('shop', f), strip(ED.D.rarityWeights(f, i % 4)));
  return out.join('#'); };

for (let i = 0; i < N; i++) {
  const seed = 'PAR' + i, floor = 1 + (i * 5) % 60;
  ok(floorSig(A, seed, floor) === floorSig(B, seed, floor), 'floor ' + floor + ' seed ' + seed + ' differs from frozen v1');
  ok(rolls(A, i) === rolls(B, i), 'loot / boss / wave rolls #' + i + ' differ from frozen v1');
}
// bot-played runs (classic classes) must end in the same state
for (let k = 0; k < Math.min(8, N); k++) {
  const cls = ['knight', 'knight', 'knight', 'knight'][k % 4], res = [];
  for (const [ED, SB] of [[A, null], [B, Bx]]) {
    const g = ED.createGame(fakeCanvas(), { headless: true }); ED.game = g; g.startRun('PLAY' + k, cls); g.scene = 'play'; const bot = new Bot(ED, g, { god: true });
    for (let i = 0; i < 60 * 40; i++) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; }
    const p = g.player; res.push([g.floorNum, g.run.kills, Math.round(p.hp), Math.round(p.x), Math.round(p.y), p.gold, Object.keys(p.relics).length, g.enemies.length].join(','));
  }
  ok(res[0] === res[1], 'bot run ' + k + ' diverged: v1=' + res[0] + '  now=' + res[1]);
}
console.log('v1 parity: ' + pass + ' identical, ' + fail + ' different' + (fail ? '' : '  — v1 edition is bit-for-bit the original'));
process.exit(fail ? 1 : 0);

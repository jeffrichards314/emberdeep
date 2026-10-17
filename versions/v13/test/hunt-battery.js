'use strict';
/* v9 stall + feel hunt: seeds a roster of nemeses, then lets the god-mode bot clear one deep floor per seed.
 *   ED_PACKS=all node test/hunt-battery.js [seeds] [offset]
 * Prints STALL lines (a floor that took > 14 minutes) and, per rank, how long the bot needed to put a nemesis down / see it escape. */
const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const nSeeds = +process.argv[2] || 40, off = +process.argv[3] || 0;
const stats = {}; let stalls = 0, ran = 0, met = 0;
for (let k = off; k < off + nSeeds; k++) {
  const sb = load({ randSeed: 777 + k }), ED = sb.ED, H = ED.hunt; if (!H) { console.log('v9 is off — set ED_PACKS=all or v9'); process.exit(1); }
  const g = ED.createGame(fakeCanvas(), { headless: true }); ED.game = g;
  const F = 3 + (k * 5) % 24, rng = new ED.RNG('hb' + k);
  H.meta().roster.length = 0; const NOHUNT = !!process.env.NOHUNT;
  const types = ED.D.enemyPool(F).filter(id => ED.enemyTypes[id].weight > 0 && !ED.enemyTypes[id].noElite);
  for (let i = 0; i < (NOHUNT ? 0 : 4); i++) H.admit(H.makeNem({ seed: 'HB' + k + ':' + i, floor: F + 2, from: 2, type: rng.pick(types), cls: 'knight', origin: 'elite', kills: 1, rank: 1 + (k + i) % 5 }), true);
  g.startRun('HUNT' + k, ['knight', 'ranger', 'mage', 'rogue'][k % 4]); g.scene = 'play'; ED.debug.jumpFloor(g, F);
  const p = g.player;
  for (let i = 0; i < 4 + Math.min(F, 22); i++) g.equipItem(ED.items.rollRelic(rng, F, { relics: p.relics, noRisk: true }), true);
  p.weapon = ED.items.rollWeapon(rng, F, { type: ['sword', 'spear', 'bow', 'daggers', 'hammer', 'staff', 'boomerang'][k % 7], rarity: F >= 12 ? 'epic' : 'rare' });
  for (const sl of ['helmet', 'chest', 'boots']) p.armor[sl] = ED.items.rollArmor(rng, F, { slot: sl, rarity: F >= 8 ? 'epic' : 'rare' });
  p.bonusHp = 4 * Math.min(14, 1 + Math.floor(F / 2)); ED.items.recalc(p); p.hp = p.maxHp; p.keys = { small: 0, mb: 0, boss: 0 };
  const bot = new Bot(ED, g, { god: true }), appear = new Map(); let steps = 0, floorStart = g.run.frames, failed = false;
  const planned = g.floor.hunt ? [].concat(...Object.values(g.floor.hunt)).length : 0;
  while (g.floorNum === F && steps++ < 60 * 60 * 40) {
    bot.tick(); g.step();
    for (const e of g.enemies) if (e.nem && !appear.has(e.nem.id)) { appear.set(e.nem.id, { t: g.run.frames, rank: e.nem.rank, type: e.type, hp: e.maxHp, tr: H.traitsOf(e.nem).map(t => t.id).join('+') }); met++; }
    for (const [id, a] of appear) if (!a.done) { const nem = H.meta().roster.find(n => n.id === id), alive = g.enemies.some(e => e.nem && e.nem.id === id && !e.dead);
      if (!alive && !a.done) { a.done = true; a.secs = (g.run.frames - a.t) / 60; if (a.secs > 20) console.log('  long fight', a.secs.toFixed(0) + 's', 'seed HUNT' + k, 'floor', F, a.type, 'rank', a.rank, 'traits', a.tr, 'hp', Math.round(a.hp), 'weapon', p.weapon.type); a.out = nem ? 'escaped' : 'slain'; const s = stats[a.rank] = stats[a.rank] || { n: 0, t: [], slain: 0, esc: 0 }; s.n++; s.t.push(a.secs); if (nem) s.esc++; else s.slain++; } }
    if (g.run.frames - floorStart > 60 * 60 * 14) { failed = true; console.log('STALL seed HUNT' + k, 'floor', g.floorNum, 'room', g.room.id, g.room.type, 'cleared', g.room.cleared, 'enemies', g.enemies.map(e => e.type + (e.nem ? '[' + e.nem.name + ']' : '')).join(',')); break; }
    if (g.scene === 'dead') break;
  }
  ran++; if (failed) stalls++;
  if (planned && !appear.size) console.log('note: HUNT' + k + ' planned ' + planned + ' ambush(es) but none appeared (floor ended first?)');
}
console.log('hunt battery: seeds', ran, 'stalled', stalls, 'nemeses met', met);
for (const r of Object.keys(stats).sort()) { const s = stats[r], t = s.t.sort((a, b) => a - b); console.log('  rank ' + r + ': n=' + s.n + '  slain ' + s.slain + '  escaped ' + s.esc + '  fight median ' + t[t.length >> 1].toFixed(1) + 's  p90 ' + t[Math.floor(t.length * 0.9)].toFixed(1) + 's  max ' + t[t.length - 1].toFixed(1) + 's'); }
process.exit(stalls ? 1 : 0);

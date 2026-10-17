'use strict';
/* Large bot battery: many seeds, floors 1..N each.  node test/battery.js [seeds] [floorsPerSeed] [offset] */
const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const nSeeds = +process.argv[2] || 40, nFloors = +process.argv[3] || 3, off = +process.argv[4] || 0, deep = process.argv[5] === 'deep';
let ok = 0, bad = 0;
for (let k = off; k < off + nSeeds; k++) {
  const g0 = load({ randSeed: 4242 + k }); const ED = g0.ED;
  const game = ED.createGame(fakeCanvas(), { headless: true }); ED.game = game;
  game.startRun('BATT' + k, 'knight'); const bot = new Bot(ED, game, { god: true });
  if (deep) {   // jump to a deep floor with a scaled kit, then clear just that floor
    const F = 4 + (k * 7) % 28; game.scene = 'play'; ED.debug.jumpFloor(game, F);
    const p = game.player, rng = new ED.RNG('kit' + k);
    for (let i = 0; i < 4 + Math.min(F, 26); i++) game.equipItem(ED.items.rollRelic(rng, F, { relics: p.relics, noRisk: true }), true);
    p.weapon = ED.items.rollWeapon(rng, F, { type: ['sword', 'spear', 'bow', 'daggers', 'hammer', 'staff', 'boomerang'][k % 7], rarity: F >= 12 ? 'epic' : 'rare' });
    for (const sl of ['helmet', 'chest', 'boots']) p.armor[sl] = ED.items.rollArmor(rng, F, { slot: sl, rarity: F >= 8 ? 'epic' : 'rare' });
    p.bonusHp = 4 * Math.min(14, 1 + Math.floor(F / 2)); ED.items.recalc(p); p.hp = p.maxHp; p.keys = { small: 0, mb: 0, boss: 0 };
  }
  let steps = 0, floorStart = 0, lastFloor = 1, failed = false;
  const stopAt = deep ? game.floorNum + 1 : nFloors + 1;
  while (game.floorNum < stopAt && steps++ < 60 * 60 * 60) {
    bot.tick(); game.step();
    if (game.floorNum !== lastFloor) { lastFloor = game.floorNum; floorStart = game.run.frames; bot.goal = null; }
    if (game.run.frames - floorStart > 60 * 60 * 14) {
      failed = true; const g = game;
      console.log('STALL seed BATT' + k, 'floor', g.floorNum, 'room', g.room.id, g.room.type, 'cleared', g.room.cleared, 'goal', bot.goal && (bot.goal[1].id + ':' + bot.goal[1].type), 'enemies', g.enemies.map(e => e.type + '@' + Math.round(e.x) + ',' + Math.round(e.y) + ' hp' + Math.round(e.hp)).join(';'), 'pickups', g.pickups.length, 'inters', g.inters.map(i => i.type).join(','), 'player', Math.round(g.player.x), Math.round(g.player.y));
      console.log(ED.gen.ascii(g.floor), '\n', ED.keys.describeSources(g.floor).join(' | '), '\n locks', g.floor.edges.filter(e => e.lock).map(e => e.lock.type + ':' + (e.lock.opened ? 'open' : 'closed')).join(','), 'keys', JSON.stringify(g.player.keys), 'bombs', g.player.bombs);
      break;
    }
    if (game.scene === 'dead') break;
  }
  if (failed) bad++; else ok++;
}
console.log('battery: ok', ok, 'stalled', bad);

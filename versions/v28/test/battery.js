'use strict';
/* Large bot battery: many seeds, floors 1..N each.  node test/battery.js [seeds] [floorsPerSeed] [offset] [deep]
 * A floor counts as STALLED when nothing at all progresses for five game-minutes (SLOW: 45 minutes on one floor). */
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
  let steps = 0, floorStart = 0, lastFloor = 1, failed = false, sig = '', lastProgress = 0, maxIdle = 0, slowest = 0;
  const stopAt = deep ? game.floorNum + 1 : nFloors + 1;
  while (game.floorNum < stopAt && steps++ < 60 * 60 * 60) {
    bot.tick(); game.step();
    if (game.floorNum !== lastFloor) { lastFloor = game.floorNum; floorStart = game.run.frames; lastProgress = floorStart; bot.goal = null; }
    if (game.run.frames % 30 === 0) {                     // progress = any room entered or cleared, key gained, lock opened, foe killed, coin collected: a slow floor is not a stuck floor
      const g = game, kk = g.player.keys; let vis = 0, clr = 0, opened = 0;
      for (const r of g.floor.rooms) { if (r.visited) vis++; if (r.cleared) clr++; } for (const e of g.floor.edges) if (e.lock && e.lock.opened) opened++;
      const now = [vis, clr, kk.small + kk.mb + kk.boss, opened, g.run.kills, Math.floor(g.player.gold), g.pickups.length].join();
      if (now !== sig) { sig = now; lastProgress = g.run.frames; }
    }
    const idle = game.run.frames - lastProgress, onFloor = game.run.frames - floorStart; if (idle > maxIdle) maxIdle = idle; if (onFloor > slowest) slowest = onFloor;
    if (idle > 60 * 60 * 5 || onFloor > 60 * 60 * 45) {       // five minutes of nothing, or three quarters of an hour on one floor
      failed = true; const g = game;
      console.log((idle > 60 * 60 * 5 ? 'STALL' : 'SLOW'), 'seed BATT' + k, 'floor', g.floorNum, 'idle', Math.round(idle / 60) + 's', 'on floor', Math.round(onFloor / 60) + 's', 'room', g.room.id, g.room.type, 'cleared', g.room.cleared, 'goal', bot.goal && (bot.goal[1].id + ':' + bot.goal[1].type), 'enemies', g.enemies.map(e => e.type + '@' + Math.round(e.x) + ',' + Math.round(e.y) + ' hp' + Math.round(e.hp)).join(';'), 'pickups', g.pickups.length, 'inters', g.inters.map(i => i.type).join(','), 'player', Math.round(g.player.x), Math.round(g.player.y));
      console.log(ED.gen.ascii(g.floor), '\n', ED.keys.describeSources(g.floor).join(' | '), '\n locks', g.floor.edges.filter(e => e.lock).map(e => e.lock.type + ':' + (e.lock.opened ? 'open' : 'closed')).join(','), 'keys', JSON.stringify(g.player.keys), 'bombs', g.player.bombs);
      break;
    }
    if (game.scene === 'dead') break;
  }
  if (process.env.BATT_VERBOSE) console.log('BATT' + k, failed ? 'FAILED' : 'ok', 'floor now', game.floorNum, 'longest floor', Math.round(slowest / 60) + 's', 'longest idle', Math.round(maxIdle / 60) + 's');
  if (failed) bad++; else ok++;
}
console.log('battery: ok', ok, 'stalled', bad);

'use strict';
/* Route battery: force a route into every registered world (and a gate door for it), then let the bot play floors of that world.
 *   node test/route-battery.js [seeds] [offset] [worldId|all]       (ED_PACKS=all is the default here)
 * Each seed picks a world, a tier it may appear on and a floor of that tier (any of its five: the guardian floors of v20 are the 2nd and 4th, the MEGA is the 5th), jumps there with a scaled kit and clears
 * that floor with the bot.  A floor is STALLED only after five game-minutes with no progress at all (same rule as test/battery.js).  Mega floors also have the
 * bot take the plain stairs, then (for floors with a side door) satisfy the door and take it — so both ends of every route are exercised. */
const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const nSeeds = +process.argv[2] || 30, off = +process.argv[3] || 0, only = process.argv[4] && process.argv[4] !== 'all' ? process.argv[4] : null;
process.env.ED_PACKS = process.env.ED_PACKS || 'all';
let ok = 0, bad = 0; const perWorld = {};
for (let k = off; k < off + nSeeds; k++) {
  const sb = load({ randSeed: 9100 + k }), ED = sb.ED, W = ED.worlds;
  const worlds = W.ALL.filter(w => ED.packs.ok(w) && (!only || w.id === only)); if (!worlds.length) continue;
  const w = worlds[k % worlds.length], lo = Math.max(1, w.tiers ? w.tiers[0] : 1), hi = Math.min(w.tiers ? w.tiers[1] : 9, 9), T = lo + (Math.floor(k / worlds.length) * 3) % (hi - lo + 1);
  const pos = [0, 1, 2, 3, 4][Math.floor(k / worlds.length) % 5], F = T * 5 + 1 + pos, mega = F % 5 === 0;
  const game = ED.createGame(fakeCanvas(), { headless: true }); ED.game = game; game.startRun('RB' + k, 'knight'); game.scene = 'play';
  game.run.route = { [T]: w.id };
  ED.debug.jumpFloor(game, F);
  const p = game.player, rng = new ED.RNG('rkit' + k);
  for (let i = 0; i < 4 + Math.min(F, 26); i++) game.equipItem(ED.items.rollRelic(rng, F, { relics: p.relics, noRisk: true }), true);
  p.weapon = ED.items.rollWeapon(rng, F, { type: ['sword', 'spear', 'bow', 'daggers', 'hammer', 'staff', 'boomerang'][k % 7], rarity: F >= 12 ? 'epic' : 'rare' });
  for (const sl of ['helmet', 'chest', 'boots']) p.armor[sl] = ED.items.rollArmor(rng, F, { slot: sl, rarity: F >= 8 ? 'epic' : 'rare' });
  p.bonusHp = 4 * Math.min(14, 1 + Math.floor(F / 2)); ED.items.recalc(p); p.hp = p.maxHp; p.keys = { small: 0, mb: 0, boss: 0 };
  const bot = new Bot(ED, game, { god: true });
  let steps = 0, floorStart = 0, failed = false, sig = '', lastProgress = 0, maxIdle = 0, slowest = 0; const stopAt = F + 1;
  while (game.floorNum < stopAt && steps++ < 60 * 60 * 60) {
    bot.tick(); game.step(); if (game.scene !== 'play' && game.scene !== 'dead') game.scene = 'play'; if (game.modal && game.modal.type === 'route_cost') game.modal = null;
    if (game.run.frames % 30 === 0) {
      const g = game, kk = g.player.keys; let vis = 0, clr = 0, opened = 0;
      for (const r of g.floor.rooms) { if (r.visited) vis++; if (r.cleared) clr++; } for (const e of g.floor.edges) if (e.lock && e.lock.opened) opened++;
      const now = [vis, clr, kk.small + kk.mb + kk.boss, opened, g.run.kills, Math.floor(g.player.gold), g.pickups.length, g.run.floorNum].join();
      if (now !== sig) { sig = now; lastProgress = g.run.frames; }
    }
    const idle = game.run.frames - lastProgress, onFloor = game.run.frames - floorStart; if (idle > maxIdle) maxIdle = idle; if (onFloor > slowest) slowest = onFloor;
    if (idle > 60 * 60 * 5 || onFloor > 60 * 60 * 45) {
      failed = true; const g = game;
      console.log((idle > 60 * 60 * 5 ? 'STALL' : 'SLOW'), 'seed RB' + k, 'world', w.id, 'floor', g.floorNum, 'idle', Math.round(idle / 60) + 's', 'room', g.room.id, g.room.type, 'cleared', g.room.cleared, 'enemies', g.enemies.map(e => e.type + '@' + Math.round(e.x) + ',' + Math.round(e.y) + ' hp' + Math.round(e.hp)).join(';'), 'inters', g.inters.map(i => i.type).join(','), 'player', Math.round(g.player.x), Math.round(g.player.y));
      console.log(ED.gen.ascii(g.floor), '\n', ED.keys.describeSources(g.floor).join(' | '), '\n locks', g.floor.edges.filter(e => e.lock).map(e => e.lock.type + ':' + (e.lock.opened ? 'open' : 'closed')).join(','), 'keys', JSON.stringify(g.player.keys));
      break;
    }
    if (game.scene === 'dead') break;
  }
  // the far end of the road: the plain stairs of a MEGA floor were taken by the bot (it only knows stairs); the next floor must be a floor of the straight line
  if (!failed && mega && game.floorNum === F + 1) { const wi = W.at(game.floorNum); if (wi && wi.routed) { failed = true; console.log('WRONG ROAD seed RB' + k + ': the plain stairs led into a routed world', wi.w.id); } }
  perWorld[w.id] = perWorld[w.id] || { ok: 0, bad: 0 }; perWorld[w.id][failed ? 'bad' : 'ok']++;
  if (process.env.BATT_VERBOSE) console.log('RB' + k, w.id, 'tier', T, 'floor', F, failed ? 'FAILED' : 'ok', 'longest floor', Math.round(slowest / 60) + 's', 'longest idle', Math.round(maxIdle / 60) + 's', 'dead', game.scene === 'dead');
  if (failed) bad++; else ok++;
}
console.log('route battery: ok', ok, 'stalled', bad, JSON.stringify(perWorld));
process.exit(bad ? 1 : 0);

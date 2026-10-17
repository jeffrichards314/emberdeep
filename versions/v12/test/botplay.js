'use strict';
const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const args = process.argv.slice(2);
const seed = args[0] || 'BOT1', maxFloor = +args[1] || 3, god = args[2] !== 'mortal', cls = args[3] || 'knight';
const g0 = load(); const ED = g0.ED;
const game = ED.createGame(fakeCanvas(), { headless: true }); ED.game = game;
if (process.env.UNLOCK) ED.debug.unlockAll({ toast() {} });
game.startRun(seed, cls);
const bot = new Bot(ED, game, { god });
let lastFloor = 1, floorStart = 0, steps = 0;
const MAX_FLOOR_FRAMES = 60 * 60 * 14;
let log = [];
const t0 = Date.now();
while (steps < 60 * 60 * 60) {
  steps++;
  try {
    bot.tick();
    game.step();
    if (steps % 6 === 0) game.render();
  } catch (e) { console.log('EXCEPTION at frame', game.frame, 'floor', game.floorNum, 'room', game.room && game.room.type); console.log(e.stack); process.exit(1); }
  if (game.scene === 'dead' || game.scene === 'victory') { console.log('RUN ENDED', game.scene, 'floor', game.floorNum, 'kills', game.run.kills, 'frames', game.run.frames); break; }
  if (game.floorNum !== lastFloor) { console.log('floor', lastFloor, 'done in', ((game.run.frames - floorStart) / 60).toFixed(0), 's; hp', game.player.hp + '/' + game.player.maxHp, 'relics', Object.keys(game.player.relics).length, 'gold', game.player.gold); lastFloor = game.floorNum; floorStart = game.run.frames; bot.goal = null; if (game.floorNum > maxFloor) break; }
  if (game.run.frames - floorStart > MAX_FLOOR_FRAMES) {
    const f = game.floor;
    console.log('TIMEOUT on floor', game.floorNum, 'room', game.room.id, game.room.type, 'goal', bot.goal && bot.goal[1].id + ':' + bot.goal[1].type);
    console.log(ED.gen.ascii(f)); console.log(ED.keys.describeSources(f));
    console.log('locks', f.edges.filter(e => e.lock).map(e => e.lock.type + ':' + (e.lock.opened ? 'open' : 'closed') + '@' + e.a + '-' + e.b).join(' '));
    console.log('player', Math.round(game.player.x), Math.round(game.player.y), 'room', game.room.template, 'enemies:', game.enemies.map(e => e.type + '@' + Math.round(e.x) + ',' + Math.round(e.y) + ' hp' + Math.round(e.hp) + '/' + Math.round(e.maxHp) + ' st=' + e.state + ' inv=' + e.invuln + ' stun=' + e.stun + ' fly=' + e.flying + ' vis=' + e.vis + ' carries=' + e.carriesKey).join('; '), 'spawns', game.spawns.length);
    console.log('keys', JSON.stringify(game.player.keys), 'bombs', game.player.bombs, 'enemies', game.enemies.length, 'scene', game.scene, 'modal', game.modal && game.modal.type);
    console.log('rooms visited', f.rooms.map(r => r.id + r.type[0] + (r.visited ? 'v' : '') + (r.cleared ? 'c' : '')).join(' '));
    console.log('INTERS', game.inters.map(i => i.type + '@' + Math.round(i.x) + ',' + Math.round(i.y) + (i.dead ? ' dead' : '') + (i.disabled ? ' dis' : '') + ' ng=' + (bot.noGo.get(i) || 0)).join(' | '), 'keyChests', JSON.stringify(game.rt.keyChests), 'holds', JSON.stringify(game.room.holds));
    const en = game.enemies.find(e => !e.dead);
    if (en) {
      const p = game.player, x0 = en.x, y0 = en.y; const i = ED.ai.info(game, en);
      console.log('ENEMY', en.type, 'r', en.r, 'face', en.face.toFixed(2), 'state', en.state, 'cd', en.cd, 'curSpeed', en.curSpeed.toFixed(2), 'stun', en.stun, 'd', i.d.toFixed(0), 'clear', ED.ai.clear(game, en.x, en.y, p.x, p.y, !!en.flying), 'heading', ED.ai.heading(game, en, i.ang).toFixed(2), 'direct', i.ang.toFixed(2));
      if (process.env.TRACE) { for (let k = 0; k < 12; k++) { const bx = en.x, by = en.y; const r = ED.ai.walk(game, en, en.face, 0.88); console.log('manual walk', bx.toFixed(2), by.toFixed(2), '->', en.x.toFixed(2), en.y.toFixed(2), JSON.stringify(r), 'ts', game.ts, 'cr', en.cr, 'r', en.r, 'big', en.big, 'ghost', en.ghost, 'props', game.props.filter(q => Math.hypot(q.x - en.x, q.y - en.y) < 60).map(q => q.type + '@' + Math.round(q.x) + ',' + Math.round(q.y)).join(',')); } }
      if (process.env.TRACE2) { for (let k = 0; k < 20; k++) { const bx = en.x, by = en.y; bot.tick(); game.step(); console.log('f', k, 'e', en.x.toFixed(2), en.y.toFixed(2), 'face', en.face.toFixed(2), 'kx', en.kx.toFixed(2), 'ky', en.ky.toFixed(2), 'spdMul', en.spdMul, 'curSpeed', en.curSpeed.toFixed(2), 'status', JSON.stringify(en.status), 'ts', game.ts, 'hitstop', game.hitstopT, 'scene', game.scene, 'frame', game.frame); } }
      for (let k = 0; k < 180; k++) { bot.tick(); game.step(); }
      console.log('after 180 frames: enemy moved', (en.x - x0).toFixed(1), (en.y - y0).toFixed(1), 'dead', en.dead, 'hp', Math.round(en.hp), 'player', Math.round(p.x), Math.round(p.y), 'held', JSON.stringify(ED.input.sim.held), 'bot.stuck', bot.stuck);
      const ex = Math.floor(en.x / 32), ey = Math.floor(en.y / 32);
      for (let y = Math.max(0, ey - 4); y <= Math.min(17, ey + 4); y++) { let row = ''; for (let x = Math.max(0, ex - 8); x <= Math.min(29, ex + 8); x++) row += (x === ex && y === ey) ? 'E' : (x === Math.floor(p.x / 32) && y === Math.floor(p.y / 32)) ? '@' : game.col[y * 30 + x]; console.log(row); }
    }
    process.exit(2);
  }
}
console.log('OK seed', seed, 'floors reached', game.floorNum, 'steps', steps, 'ms', Date.now() - t0);

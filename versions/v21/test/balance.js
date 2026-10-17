'use strict';
/* Balance probe: mortal bot (mediocre dodging) plays whole runs.  node test/balance.js [runs] [class] */
const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const runs = +process.argv[2] || 10, cls = process.argv[3] || 'knight';
const res = [];
for (let k = 0; k < runs; k++) {
  const g0 = load({ randSeed: 777 + k }); const ED = g0.ED;
  const game = ED.createGame(fakeCanvas(), { headless: true }); ED.game = game;
  game.startRun('BAL' + k, cls); const bot = new Bot(ED, game, { god: false });
  let steps = 0, lastFloor = 1, floorStartFrame = 0, reported = false; const t = [];
  while (steps++ < 60 * 60 * 90) {
    bot.tick(); game.step();
    if (game.scene === 'dead' || game.scene === 'victory') break;
    if (game.floorNum !== lastFloor) { t.push(Math.round(game.run.frames / 3600) + 'm'); lastFloor = game.floorNum; floorStartFrame = game.run.frames; }
    if (game.run.frames - floorStartFrame > 60 * 60 * 25 && !reported) { reported = true; const g = game; console.log('  STALL?', 'floor', g.floorNum, 'room', g.room.id, g.room.type, 'cleared', g.room.cleared, 'scene', g.scene, 'modal', g.modal && g.modal.type, 'enemies', g.enemies.map(e => e.type + ':' + Math.round(e.hp)).join(','), 'boss', g.enemies.filter(e => e.boss).map(e => e.bdef.id + ' ph' + e.phaseIdx + ' inv=' + e.invuln + ' parts=' + (e.parts ? e.parts.map(q => q.id + ':' + (q.dead ? 'X' : Math.round(q.hp))).join(',') : '-') + ' enter=' + e.entering + ' co=' + !!e.co).join(';'), 'player', Math.round(g.player.x), Math.round(g.player.y), 'inters', g.inters.map(i => i.type).join(','), 'goal', bot.goal && bot.goal[1].type); }
  }
  const p = game.player;
  res.push({ seed: 'BAL' + k, floor: game.floorNum, killedBy: game.run.killedBy || '-', kills: game.run.kills, relics: Object.keys(p.relics).length, maxHp: p.maxHp, minutes: Math.round(game.run.frames / 3600), dmgTaken: game.run.damageTaken, scene: game.scene });
  console.log(JSON.stringify(res[res.length - 1]));
}
const fl = res.map(r => r.floor).sort((a, b) => a - b);
console.log('floors reached:', fl.join(','), ' median', fl[fl.length >> 1], ' mean', (fl.reduce((a, b) => a + b, 0) / fl.length).toFixed(1));

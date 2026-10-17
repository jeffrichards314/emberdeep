const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const seedN = +process.argv[2] || 1, cls = process.argv[3] || 'knight';
const g0 = load({ randSeed: 777 + seedN }); const ED = g0.ED;
const game = ED.createGame(fakeCanvas(), { headless: true }); ED.game = game;
game.startRun('BAL' + seedN, cls); const bot = new Bot(ED, game, { god: false });
const orig = game.hurtPlayer; const log = [];
game.hurtPlayer = function (dmg, sx, sy, o) { const hp0 = this.player.hp; const r = orig.call(this, dmg, sx, sy, o); if (r) log.push({ room: this.room.type, who: (o && o.src && (o.src.bossName || (o.src.def && o.src.def.name))) || '-', kind: o ? (o.proj ? 'proj' : o.contact ? 'contact' : o.zone ? 'zone' : 'other') : 'other', dmg: hp0 - this.player.hp, atk: this.enemies.find(e => e.boss) ? (this.enemies.find(e => e.boss).lastAtk || '') : '' }); return r; };
let steps = 0;
while (steps++ < 60 * 60 * 30 && game.scene !== 'dead') { bot.tick(); game.step(); }
const by = {}; for (const l of log) { const k = l.room + '|' + l.who + '|' + l.kind + '|' + l.atk; by[k] = (by[k] || 0) + l.dmg; }
console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => v + '  ' + k).join('\n'));
console.log('total hits', log.length, 'floor', game.floorNum);

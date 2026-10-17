'use strict';
/* Trapdoor battery (v21): for many seeds find a guardian floor that hides a trapdoor, let the god bot beat the guardian, bomb the crack, climb down, and play on through the rest of the
 * tier — the Court's floors and its MEGA — then take the plain stairs out.      ED_PACKS=all node test/trap-battery.js [seeds] [offset]
 * A floor is STALLED only after five game-minutes with no progress at all (same rule as test/battery.js). */
const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const nSeeds = +process.argv[2] || 20, off = +process.argv[3] || 0;
process.env.ED_PACKS = process.env.ED_PACKS || 'all';
let ok = 0, bad = 0, noTrap = 0;
for (let k = off; k < off + nSeeds; k++) {
  const sb = load({ randSeed: 8800 + k }), ED = sb.ED, W = ED.worlds, H = ED.hollow21;
  if (!H || !W.byId.court || !ED.packs.ok(W.byId.court)) { console.log('v21 is off — set ED_PACKS=all or v21'); process.exit(1); }
  const g = ED.createGame(fakeCanvas(), { headless: true }); ED.game = g;
  const tier = 3 + (k % 5), depth = 1 + (k % 3), F = tier * 5 + 1 + depth;
  let found = false; for (let i = 0; i < 60 && !found; i++) { g.startRun('TB' + k + '_' + i, ['knight', 'ranger', 'mage', 'rogue'][k % 4]); g.scene = 'play'; ED.debug.jumpFloor(g, F); found = H.trapHere(g); }
  if (!found) { noTrap++; console.log('TB' + k, 'no seed with a trapdoor on floor', F); continue; }
  const p = g.player, rng = new ED.RNG('tkit' + k);
  for (let i = 0; i < 4 + Math.min(F, 26); i++) g.equipItem(ED.items.rollRelic(rng, F, { relics: p.relics, noRisk: true }), true);
  p.weapon = ED.items.rollWeapon(rng, F, { type: ['sword', 'spear', 'bow', 'daggers', 'hammer', 'staff', 'boomerang'][k % 7], rarity: F >= 12 ? 'epic' : 'rare' });
  for (const sl of ['helmet', 'chest', 'boots']) p.armor[sl] = ED.items.rollArmor(rng, F, { slot: sl, rarity: F >= 8 ? 'epic' : 'rare' });
  p.bonusHp = 4 * Math.min(14, 1 + Math.floor(F / 2)); ED.items.recalc(p); p.hp = p.maxHp; p.keys = { small: 0, mb: 0, boss: 0 }; p.bombs = 3;
  const bot = new Bot(ED, g, { god: true }), tierEnd = tier * 5 + 5; let steps = 0, fell = false, failed = false, sig = '', lastProgress = 0, maxIdle = 0, why = '';
  // phase 1: beat the guardian (the bot walks the floor); phase 2: crack, door, then play to the end of the tier and one step beyond
  while (g.floorNum <= tierEnd && steps++ < 60 * 60 * 90) {
    bot.tick(); g.step(); if (g.scene !== 'play' && g.scene !== 'dead') g.scene = 'play'; if (g.modal && g.modal.type === 'route_cost') g.modal = null;          // (the bot answers the rest itself: a sacrifice door, a talent, the milestone)
    if (!fell && g.floorNum === F && g.room.type === 'boss' && g.room.cleared && g.rt.trap && !g.rt.trap.open) { g.explode(g.rt.trap.x, g.rt.trap.y, 80, 5, { owner: 'player', bomb: true }); }
    if (!fell && g.rt && g.rt.trap && g.rt.trap.open && g.floorNum === F) { const it = g.inters.find(i => i.type === 'trapdoor'); if (it) { g.player.x = it.x; g.player.y = it.y; it.use(g, it); fell = true; lastProgress = g.run.frames; } }
    if (g.run.frames % 30 === 0) {
      let vis = 0, clr = 0; for (const r of g.floor.rooms) { if (r.visited) vis++; if (r.cleared) clr++; } const kk = g.player.keys;
      const now = [g.floorNum, vis, clr, kk.small + kk.mb + kk.boss, g.run.kills, Math.floor(g.player.gold), g.pickups.length].join(); if (now !== sig) { sig = now; lastProgress = g.run.frames; }
    }
    const idle = g.run.frames - lastProgress; if (idle > maxIdle) maxIdle = idle;
    if (idle > 60 * 60 * 5) { failed = true; why = 'STALL floor ' + g.floorNum + ' room ' + g.room.id + ' ' + g.room.type + ' cleared ' + g.room.cleared + ' enemies ' + g.enemies.map(e => e.type + '@' + Math.round(e.x) + ',' + Math.round(e.y)).join('|') + ' player ' + Math.round(g.player.x) + ',' + Math.round(g.player.y) + ' keys ' + JSON.stringify(g.player.keys) + ' inters ' + g.inters.map(i => i.type).join(',') + '\n' + ED.gen.ascii(g.floor) + '\n ' + ED.keys.describeSources(g.floor).join(' | ') + '\n locks ' + g.floor.edges.filter(e => e.lock).map(e => e.lock.type + ':' + (e.lock.opened ? 'open' : 'closed')).join(','); break; }
    if (g.scene === 'dead') { failed = true; why = 'died (god bot) on floor ' + g.floorNum; break; }
  }
  if (!failed && !fell) { failed = true; why = 'never found the way down'; }
  if (!failed && g.floorNum !== tierEnd + 1) { failed = true; why = 'ended on floor ' + g.floorNum + ' (wanted ' + (tierEnd + 1) + ')'; }
  if (!failed) { const inCourt = []; for (let f = F + 1; f <= tierEnd; f++) inCourt.push(W.at(f).w.id); if (inCourt.some(id => id !== 'court')) { failed = true; why = 'a floor below the trapdoor was not the Court: ' + inCourt.join(); } }
  if (!failed && W.at(tierEnd + 1) && W.at(tierEnd + 1).routed) { failed = true; why = 'the plain stairs led into a routed land: ' + W.at(tierEnd + 1).w.id; }
  if (process.env.BATT_VERBOSE || failed) console.log('TB' + k, 'floor', F, 'tier', tier, failed ? 'FAILED ' + why : 'ok', 'longest idle', Math.round(maxIdle / 60) + 's');
  if (failed) bad++; else ok++;
}
console.log('trap battery: ok', ok, 'failed', bad, 'no-trap-seeds', noTrap);
process.exit(bad ? 1 : 0);

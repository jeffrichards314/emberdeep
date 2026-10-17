'use strict';
/* v11 liveness hunt: plays Boss Rush / Gauntlet floors with the god bot (fights only), takes every reward group, heals, descends.
 *   ED_PACKS=all node test/trials-battery.js [seeds] [floors] [offset]
 * Prints a STALL line for any floor that takes > 6 simulated minutes, and per-mode timing stats. */
const { load, fakeCanvas } = require('./harness');
const { Bot } = require('./bot');
const nSeeds = +process.argv[2] || 8, nFloors = +process.argv[3] || 8, off = +process.argv[4] || 0;
const CLASSES = ['knight', 'lancer', 'brute', 'rogue', 'ranger', 'mage', 'trickster', 'necromancer', 'alchemist', 'monk', 'warden'];
const stats = { rush: [], gauntlet: [] }; let stalls = 0, runs = 0, errors = 0;
for (const mode of ['rush', 'gauntlet']) for (let k = off; k < off + nSeeds; k++) {
  const sb = load({ randSeed: 31337 + k }), ED = sb.ED; if (!ED.trials) { console.log('v11 is off — set ED_PACKS=all or v11'); process.exit(1); }
  const cls = CLASSES[k % CLASSES.length]; if (!ED.packs.ok(ED.items.CLASSES[cls])) continue;
  ED.save.meta.trials = null; ED.trials.meta(); ED.trials.set(mode);
  const g = ED.createGame(fakeCanvas(), { headless: true }); ED.game = g; g.startRun('TRIAL' + mode + k, cls); g.scene = 'play'; g.god = true; g.introT = 999;
  const bot = new Bot(ED, g, { god: true }); runs++;
  try {
    for (let fl = 1; fl <= nFloors; fl++) {
      const t0 = g.run.frames; let steps = 0;
      // fight until the arena is cleared and the stairs exist
      while (steps++ < 60 * 60 * 6) {
        if (g.scene !== 'play') g.scene = 'play'; g.hitstopT = 0;
        if (g.floor.trial && g.floor.trial.warped && g.room.id === g.floor.trial.room) bot.tick(); g.step();
        if (g.room.cleared && g.room.id === (g.floor.trial && g.floor.trial.room) && g.inters.some(i => i.type === 'stairs')) break;
        if (g.modal && g.modal.type === 'milestone') { g.modal = null; }
      }
      if (!(g.room.cleared && g.inters.some(i => i.type === 'stairs'))) { stalls++; console.log('STALL', mode, 'seed', k, cls, 'floor', g.floorNum, 'room', g.room.type, 'cleared', g.room.cleared, 'enemies', g.enemies.map(e => e.type).join(','), 'boss', g.enemies.filter(e => e.boss).map(e => e.bdef && e.bdef.id).join(',')); break; }
      stats[mode].push((g.run.frames - t0) / 60);
      // rewards: first free pedestal of every group, heal, then the stairs
      const seen = new Set(); for (const it of g.inters.slice()) if (it.type === 'pedestal' && !it.caged && !it.dead && it.group && !seen.has(it.group)) { seen.add(it.group); g.player.x = it.x; g.player.y = it.y + 20; g.usePedestal(it); }
      for (const it of g.inters.slice()) if (it.type === 'healfont' && !it.dead && it.prompt() && /health/.test(it.prompt())) { it.use(g, it); break; }
      for (const it of g.inters) if (it.type === 'pedestal') { const bad = ED.phys.blocked(g, it.x, it.y, 6, true, false); if (bad && !it.dead) console.log('note: pedestal in a wall', mode, 'seed', k, 'floor', g.floorNum, Math.round(it.x), Math.round(it.y)); }
      for (let k = 0; k < 6; k++) { g.hitstopT = 0; g.step(); if (g.scene !== 'play') g.scene = 'play'; if (g.modal && g.modal.type === 'talent') ED.modalImpl.talent.update(g, g.modal, 'pick:0', ED.input); }       // v12 asks for a talent after a boss
      const F = g.floorNum; g.inters.find(i => i.type === 'stairs').use(g);
      let w = 0; while (g.floorNum === F && w++ < 400) { g.hitstopT = 0; g.step(); if (g.scene !== 'play') g.scene = 'play'; }
      if (g.floorNum === F) { stalls++; console.log('STALL (stairs) ', mode, 'seed', k); break; }
      let z = 0; while (!(g.floor.trial && g.floor.trial.warped) && z++ < 60) { g.step(); if (g.scene !== 'play') g.scene = 'play'; }
      if (g.player.dead) { console.log('(died?)', mode, 'seed', k); break; }
    }
  } catch (e) { errors++; console.log('ERROR', mode, 'seed', k, cls, (e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); }
}
console.log('trials battery: runs', runs, 'stalls', stalls, 'errors', errors);
for (const m in stats) { const t = stats[m].sort((a, b) => a - b); if (t.length) console.log('  ' + m + ': floors ' + t.length + '  median ' + t[t.length >> 1].toFixed(0) + 's  p90 ' + t[Math.floor(t.length * 0.9)].toFixed(0) + 's  max ' + t[t.length - 1].toFixed(0) + 's'); }
process.exit(stalls || errors ? 1 : 0);

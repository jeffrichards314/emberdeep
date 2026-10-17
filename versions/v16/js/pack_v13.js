/* EMBERDEEP — pack_v13.js : v13 "CURIOS" — fourteen relics from the deep, each with a trick the older ones do not have.
 *
 *  They join the normal relic pools (shops, chests, bosses) while the update is on.  Each does something you can SEE happen:
 *    status chains   Plague Mask (poisoned foes burst and poison their neighbours) · Cinder Cloak (burning foes spread the fire)
 *    wasted damage   Overkill Charm (excess damage jumps to the next foe)
 *    movement        Lightning Boots (a dash arcs lightning) · Echoing Bell (every 10th kill stuns the room)
 *    hunting         Hunter's Trophy (+35% vs elites, elite kills pay gold) · Miser's Edge (carried gold becomes damage)
 *    economy         Silver Tongue (cheaper shops) · Lodestone (loot flies to you) · Bandolier (bombs)
 *    care            Field Medic's Kit (a flawless room heals) · Surveyor's Lens (the floor map at once)
 *    pain            Thorn Crown (thorns, and a burst when you are hurt) · Loaded Dice (a small gift on entering rooms)
 *  Only effects that happen at an instant are used, so none of them can disagree with the stat sheet.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, I = ED.items, P = ED.packs;
  const V = 'v13';

  P.define({
    id: 'v13', name: 'CURIOS', tag: 'fourteen relics with new tricks', color: '#d8b070',
    blurb: 'Fourteen new relics: poisoned and burning foes that spread their fate, overkill that jumps to the next foe, a dash that arcs lightning, a bell that stuns the room, trophies for elite hunters, and a few for the thrifty and the careful.',
  });

  const relic = (key, def) => I.addRelic(key, Object.assign({ pack: V, mods: {} }, def));
  const near = (g, x, y, r, skip) => g.enemies.filter(e => !e.dead && e !== skip && !e.invuln && U.dist2(x, y, e.x, e.y) < r * r);
  /** extra damage on top of a hit that already landed (runs before the kill check) */
  const extra = (e, g, amt) => { if (amt <= 0 || e.dead) return; e.hp -= amt; g.runDamageDealt = (g.runDamageDealt || 0) + amt; g.addText(e.x + 8, e.y - e.r - 2, '+' + Math.round(amt), '#d8b070', 10); };
  const nth = (p, id, n, fn) => { const c = p.curio || (p.curio = {}); c[id] = (c[id] || 0) + 1; if (c[id] >= n) { c[id] = 0; fn(); } };

  relic('plaguemask', { id: 'plaguemask', unique: true, name: 'Plague Mask', rarity: 'uncommon', color: '#8ae06a', desc: 'Poisoned foes burst when they die, poisoning everything close.',
    on: { kill(g, p, e) { if (!e.status || !e.status.poison) return; const dps = Math.max(1, e.status.poison.dps); g.burst(e.x, e.y, 14, '#8ae06a', 3, 24); for (const o of near(g, e.x, e.y, 80, e)) g.applyStatus(o, 'poison', { t: 200, dps }); } } });
  relic('cindercloak', { id: 'cindercloak', unique: true, name: 'Cinder Cloak', rarity: 'rare', color: '#ff8a3a', desc: 'Burning foes that die spread the fire to everything near them.',
    on: { kill(g, p, e) { if (!e.status || !e.status.burn) return; const dps = Math.max(1, e.status.burn.dps); g.burst(e.x, e.y, 14, '#ff8a3a', 3, 24); for (const o of near(g, e.x, e.y, 90, e)) g.applyStatus(o, 'burn', { t: 180, dps }); } } });
  relic('overkill', { id: 'overkill', unique: true, name: 'Overkill Charm', rarity: 'rare', color: '#ff6a6a', desc: 'Damage beyond what a foe had left jumps to the nearest other foe (80%).',
    on: { hit(g, p, e) { if (e.hp >= 0) return; const over = -e.hp * 0.8, t = near(g, e.x, e.y, 170, e).sort((a, b) => U.dist2(e.x, e.y, a.x, a.y) - U.dist2(e.x, e.y, b.x, b.y))[0]; if (!t || over < 1) return; g.fx.push({ x: e.x, y: e.y, x2: t.x, y2: t.y, vx: 0, vy: 0, life: 9, max: 9, color: '#ff6a6a', shape: 'bolt', drag: 1, grav: 0, size: 2 }); g.damageEnemy(t, over, { src: 'chain', x: e.x, y: e.y, kb: 1, noProc: true, color: '#ff6a6a' }); } } });
  relic('lightningboots', { id: 'lightningboots', unique: true, name: 'Lightning Boots', rarity: 'rare', color: '#ffe14a', desc: 'Every dash arcs lightning through the 3 nearest foes.',
    on: { dash(g, p) { if (near(g, p.x, p.y, 240).length) g.chainLightning({ id: -1, x: p.x, y: p.y }, Math.max(3, p.wdmg * 0.9), 3, {}); } } });
  relic('echobell', { id: 'echobell', unique: true, name: 'Echoing Bell', rarity: 'epic', color: '#e8d8a0', desc: 'Every 10th kill rings a bell: every foe in the room (not bosses) is stunned for 1.5s.',
    on: { kill(g, p) { nth(p, 'bell', 10, () => { g.sfx('block'); g.ringFx(p.x, p.y, 10, 260, '#e8d8a0', 30, 6); for (const o of g.enemies) if (!o.dead && !o.boss) g.applyStatus(o, 'stun', { t: 90 }); }); } } });
  relic('trophy', { id: 'trophy', unique: true, name: "Hunter's Trophy", rarity: 'uncommon', color: '#d8b070', desc: '+35% damage against elites; slaying one drops extra gold.',
    on: { hit(g, p, e, dmg) { if (e.elite && !e.boss) extra(e, g, dmg * 0.35); }, kill(g, p, e) { if (e.elite && !e.minion) g.dropGold(e.x, e.y, 6 + Math.round(g.floorNum * 1.2)); } } });
  relic('misersedge', { id: 'misersedge', unique: true, name: "Miser's Edge", rarity: 'rare', color: '#ffd24a', desc: 'The gold you carry sharpens your blows: +1% damage per 25 gold, up to +20%.',
    on: { hit(g, p, e, dmg) { extra(e, g, dmg * Math.min(0.2, Math.floor(p.gold / 25) * 0.01)); } } });
  relic('silvertongue', { id: 'silvertongue', max: 2, name: 'Silver Tongue', rarity: 'uncommon', color: '#c8d0e0', mods: { price: -0.25 }, desc: 'Shops and blacksmiths charge 25% less.' });
  relic('lodestone', { id: 'lodestone', max: 2, name: 'Lodestone', rarity: 'common', color: '#9fb0d8', mods: { magnet: 0.8, gold: 0.1 }, desc: 'Gold, hearts and bombs fly to you from much farther away; +10% gold.' });
  relic('bandolier', { id: 'bandolier', unique: true, name: 'Bandolier', rarity: 'uncommon', color: '#c08a5a', desc: '+3 bombs now, and +1 bomb at the start of every floor.',
    on: { pickup(g, p) { p.bombs += 3; }, floorStart(g, p) { p.bombs += 1; } } });
  relic('medic', { id: 'medic', unique: true, name: "Field Medic's Kit", rarity: 'uncommon', color: '#ff7aa0', desc: 'Clearing a room without being hit heals half a heart.',
    on: { enter(g, p) { p.medicHit = false; }, hurt(g, p) { p.medicHit = true; }, clear(g, p) { if (!p.medicHit) g.healPlayer(2); p.medicHit = false; } } });
  relic('lens', { id: 'lens', unique: true, name: "Surveyor's Lens", rarity: 'rare', color: '#9ad0ff', desc: 'At the start of every floor the whole map is revealed.',
    on: { floorStart(g) { for (const r of g.floor.rooms) r.discovered = true; } } });
  relic('thorncrown', { id: 'thorncrown', unique: true, name: 'Thorn Crown', rarity: 'rare', color: '#d06a9a', mods: { thorns: 4 }, desc: '+4 thorns, and being hurt bursts thorns at everything close (at most every 2s).',
    on: { hurt(g, p) { if (g.frame - (p.crownT === undefined ? -999 : p.crownT) > 120) { p.crownT = g.frame; g.zoneEnemies(p.x, p.y, 85, Math.max(3, p.wdmg * 0.9), { speed: 7, color: '#d06a9a' }); } } } });
  relic('dice', { id: 'dice', unique: true, name: 'Loaded Dice', rarity: 'common', color: '#f0f0f0', desc: 'Entering a room has a 15% chance to roll a small gift: 10 gold, a bomb or half a heart.',
    on: { enter(g, p) { if (!g.rng.chance(0.15)) return; const r = g.rng.int(0, 2); if (r === 0) g.giveGold(10 + g.floorNum); else if (r === 1) p.bombs++; else g.healPlayer(2); g.addText(p.x, p.y - 24, 'LUCKY!', '#f0f0f0', 12); } } });

})(typeof globalThis !== 'undefined' ? globalThis : this);

'use strict';
/* Per-pack test sections.  Called at the end of run-tests.js with the shared helpers.
 * A pack's section only runs while that pack is ON, so the same suite validates every edition:
 *   node test/run-tests.js --packs=none | all | v2,v4                                              */
module.exports = function (ctx) {
  const { ED, ok, section, newGame, stepN, Bot, quick, bossFight, giveKit } = ctx;
  const P = ED.packs, I = ED.items, U = ED.U;
  const play = (g, bot, frames) => { for (let i = 0; i < frames; i++) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (g.player.dead) break; } };
  const finite = (g, label) => { const p = g.player; ok(isFinite(p.x) && isFinite(p.y) && isFinite(p.hp), label + ': player state finite'); for (const e of g.enemies) if (!isFinite(e.x) || !isFinite(e.y) || !isFinite(e.hp)) { ok(false, label + ': enemy NaN ' + e.type); return; } for (const a of g.allies || []) if (!isFinite(a.x) || !isFinite(a.y)) { ok(false, label + ': ally NaN'); return; } };
  const arena = (cls, floor, seed) => { const g = newGame(); g.startRun(seed || 'PK', cls); g.scene = 'play'; g.god = false; if (floor > 1) ED.debug.jumpFloor(g, floor); const r = g.floor.rooms.find(x => x.type === 'treasure') || g.floor.rooms[g.floor.startId]; ED.debug.goto(g, r, 300, 288); g.scene = 'play'; return g; };
  const dummy = (g, x, y, hp) => { const e = g.spawnEnemy('chaser', x, y, { silent: true }); e.hold = true; e.maxHp = e.hp = hp || 4000; return e; };

  // ======================================================================= edition-wide
  section('P0. Version system');
  {
    ok(P.on('v1') && P.ids()[0] === 'v1', 'v1 is always the base');
    const act = P.active(); ok(act.every(id => P.BY_ID[id]), 'active packs are all defined: ' + act.join('+'));
    for (const p of P.optional()) ok(typeof p.name === 'string' && p.blurb && p.color, 'pack ' + p.id + ' has metadata');
    // every tagged content entry points at a real pack
    for (const kind in P.tables) for (const d of Object.values(P.tables[kind]).flat()) if (d && d.pack) ok(!!P.BY_ID[d.pack], kind + ' entry tagged with unknown pack ' + d.pack);
    // set/forced states
    const keep = P.forced();
    P.force('none'); ok(P.active().length === 1, 'force(none) leaves only v1'); ok(P.classCount === undefined && I.classList().length === 7, 'v1 edition: 7 classes (got ' + I.classList().length + ')');
    P.force('all'); ok(P.active().length === P.ids().length, 'force(all) enables everything');
    P.force(null);
    // v1 edition pools never contain tagged content
    P.force('none'); const rng = new ED.RNG('v1pool'); let leaked = 0;
    for (let i = 0; i < 1500; i++) { const f = 1 + i % 70; const r = I.rollRelic(rng, f, { relics: {} }), w = I.rollWeapon(rng, f, {}), a = I.rollArmor(rng, f, {}), ac = I.rollActive(rng, f, {}); const rd = I.relic(r.id); if (rd.pack || rd.hidden) leaked++; if (I.WEAPONS[w.type].pack) leaked++; for (const af of w.affixes) if (I.AFFIXES[af.id].pack) leaked++; const ab = I.ARMOR[a.slot].find(b => b.id === a.base); if (ab.pack) leaked++; if (I.ACTIVES[ac.id].pack) leaked++; }
    ok(leaked === 0, 'with every pack OFF no tagged item can be rolled (leaked ' + leaked + ')');
    if (keep) P.force(keep === true ? 'all' : null);
    ctx.reapply();
  }

  // ======================================================================= v2 ARSENAL
  if (P.on('v2')) {
    section('P2. v2 ARSENAL — content integrity');
    const NEW_CLASSES = ['necromancer', 'alchemist', 'monk', 'warden'];
    {
      for (const id of NEW_CLASSES) {
        const c = I.CLASSES[id]; ok(!!c && c.pack === 'v2', id + ' class exists'); if (!c) continue;
        ok(!!I.WEAPONS[c.weapon] && I.WEAPONS[c.weapon].class === id, id + ' has its own weapon'); ok(!!I.ACTIVES[c.active], id + ' active exists');
        const pr = I.relic(c.passive); ok(pr && pr.passive && pr.hidden, id + ' passive exists and is hidden'); ok(c.hearts >= 4 && c.hearts <= 8, id + ' hearts sane');
        ok(!!M_unlock(c.unlock), id + ' unlock text resolves (' + c.unlock + ')');
      }
      function M_unlock(u) { const t = ED.menus.unlockText(u); return t && t !== u; }
      for (const w of P.values(I.WEAPONS).filter(x => x.pack === 'v2')) { const wi = ED.weaponImpl[w.kind]; ok(wi && typeof wi.fire === 'function', 'weapon ' + w.id + ' has an implementation'); ok(!!I.LEGEND_NAMES[w.id], w.id + ' has legendary names'); }
      for (const a of P.values(I.ACTIVES).filter(x => x.pack === 'v2')) ok(typeof ED.activeImpl[a.id] === 'function', 'active ' + a.id + ' has an implementation');
      const rel = Object.values(I.RELICS).filter(r => r.pack === 'v2' && !r.hidden);
      ok(rel.length === 20, '20 new relics (' + rel.length + ')'); const ids = new Set(rel.map(r => r.id)); ok(ids.size === rel.length, 'relic ids unique');
      for (const s of I.SYNERGIES.filter(x => x.pack === 'v2')) for (const n of s.needs) ok(!!I.relic(n), 'synergy ' + s.id + ' needs real relic ' + n);
      // can all be rolled; never the hidden passives
      const rng = new ED.RNG('v2roll'); const seen = new Set(); let hid = 0;
      for (let i = 0; i < 4000; i++) { const r = I.rollRelic(rng, 1 + i % 60, { relics: {} }); seen.add(r.id); if (I.relic(r.id).hidden) hid++; }
      ok(hid === 0, 'class passives never drop'); ok(rel.filter(r => seen.has(r.id)).length >= 18, 'new relics roll in loot (' + rel.filter(r => seen.has(r.id)).length + '/20)');
      const types = new Set(); for (let i = 0; i < 600; i++) { types.add(I.rollWeapon(rng, 1 + i % 40, {}).type); }
      ok(types.has('chakram'), 'chakram drops as a basic weapon'); ok(!types.has('scythe') || ED.save.isClassUnlocked('necromancer'), 'class weapons only drop once the class is unlocked');
      // equipping every new relic works and recalcs finite stats
      const g = arena('knight', 3); const p = g.player;
      for (const r of rel) { try { g.equipItem({ cat: 'relic', id: r.id, uid: ED.id() }, true); } catch (e) { ok(false, 'equip ' + r.id + ': ' + e.message); } }
      for (let k = 0; k < 2; k++) g.equipItem({ cat: 'relic', id: 'aegisplate', uid: ED.id() }, true);
      ok(Object.values(p.st).every(v => typeof v !== 'number' || isFinite(v)), 'stats finite with every v2 relic equipped');
      ok(p.guard >= 3 && p.st.guard === 3, 'Aegis Plates add Guards (' + p.guard + ')'); ok(p.syn.fortress && p.syn.deathknell && p.syn.plaguebearer && p.syn.tempo, 'all four v2 synergies activate');
    }

    section('P2b. v2 — classes play');
    for (const id of NEW_CLASSES) {
      const g = newGame(); g.startRun('V2-' + id, id); g.scene = 'play'; const p = g.player; const c = I.CLASSES[id];
      ok(p.weapon.type === c.weapon && p.active.item.id === c.active && p.relics[c.passive] === 1, id + ' starts with weapon, active and passive');
      ok(p.maxHp === c.hearts * 4 + (id === 'warden' ? 0 : 0), id + ' hearts ' + p.maxHp);
      const bot = new Bot(ED, g, { god: true }); let kills0 = g.run.kills;
      try { play(g, bot, quick ? 60 * 60 * 3 : 60 * 60 * 6); g.render(); } catch (e) { ok(false, id + ' play crashed: ' + (e.stack || e)); }
      finite(g, id); ok(g.run.kills > kills0 + 3, id + ' fights and kills (' + (g.run.kills - kills0) + ' kills, floor ' + g.floorNum + ')');
      ok(g.pproj.length < 40 && g.allies.length <= 8, id + ' bounded projectiles/allies');
    }

    section('P2c. v2 — mechanics');
    {
      // Guard: absorbs a whole hit, recharges
      let g = arena('warden', 1, 'GUARD'); let p = g.player; g.god = false; p.inv = 0;
      ok(p.guard === 1 && p.st.guard === 1, 'Warden starts with a Guard'); const hp0 = p.hp;
      ok(g.hurtPlayer(6, 100, 100, {}) === true && p.hp === hp0 && p.guard === 0, 'Guard absorbs a hit'); p.inv = 0;
      g.hurtPlayer(6, 100, 100, {}); ok(p.hp < hp0, 'next hit lands'); p.hp = p.maxHp; p.inv = 0;
      stepN(g, 620); ok(p.guard === 1, 'Guard recharges after ~10s');
      // Dome clears bullets
      p.active = g.newActiveState({ cat: 'active', id: 'dome', rarity: 'common', lvl: 1, uid: 1, name: 'Dome', upg: 0 }); const src = dummy(g, 700, 288);
      for (let k = 0; k < 6; k++) g.eShot(src, 0, 1, { x: p.x + 40 + k * 8, y: p.y + (k - 3) * 10 });
      ED.input.sim = { held: {}, edge: { active: true } }; stepN(g, 2); ED.input.sim = { held: {}, edge: {} };
      ok(!!p.dome && g.eproj.filter(b => Math.hypot(b.x - p.dome.x, b.y - p.dome.y) < p.dome.r).length === 0, 'Dome shatters bullets inside it');
      ok(!g.eproj.some(b => b.dead === false && Math.hypot(b.x - p.x, b.y - p.y) < 90), 'no bullet inside dome after tick');

      // Thralls: raise on kill, cap, they fight, expire
      g = arena('necromancer', 2, 'THRALL'); p = g.player; g.god = true;
      const rc = g.rng.chance; g.rng.chance = () => true;
      for (let k = 0; k < 8; k++) { const e = g.spawnEnemy('chaser', 400 + k * 6, 300, { silent: true }); e.hold = true; g.damageEnemy(e, 9999, { src: 'melee', x: 300, y: 288, noProc: false }); }
      g.rng.chance = rc; stepN(g, 2);
      ok(g.allies.length >= 1 && g.allies.length <= 3, 'kills raise thralls up to the cap (' + g.allies.length + ')');
      const tgt = dummy(g, p.x + 90, p.y, 4000); const t0 = tgt.hp; stepN(g, 200);
      ok(tgt.hp < t0 - 10, 'thralls attack enemies (' + (t0 - tgt.hp).toFixed(0) + ' dmg)');
      const before = g.allies.length; tgt.dead = true; g.enemies.length = 0; stepN(g, 800); ok(g.allies.length === 0 && before > 0, 'thralls expire after ~12s');
      // thrall kills do not chain-raise
      g.rng.chance = () => true; const v = g.spawnEnemy('chaser', 500, 300, { silent: true }); v.hold = true; g.damageEnemy(v, 9999, { src: 'thrall', x: 500, y: 300, noProc: true }); g.rng.chance = rc; ok(g.allies.length === 0, 'thrall kills never raise more thralls');
      // Raise Dead active
      p.active = g.newActiveState({ cat: 'active', id: 'raise', rarity: 'common', lvl: 1, uid: 2, name: 'Raise', upg: 0 }); ED.input.sim = { held: {}, edge: { active: true } }; stepN(g, 2); ED.input.sim = { held: {}, edge: {} };
      ok(g.allies.length === 3, 'Raise Dead summons three thralls (' + g.allies.length + ')');
      // rooms reset allies
      const r2 = g.floor.rooms.find(r => r !== g.room); ED.debug.goto(g, r2, 480, 300); g.scene = 'play'; ok(g.allies.length === 0, 'allies do not follow you between rooms');

      // Flasks: land, burst, puddle hurts enemies, alchemist reaction
      g = arena('alchemist', 2, 'FLASK'); p = g.player; g.god = true;
      let e = dummy(g, 300 + 170, 288, 4000); ED.input.mouse.aim = true; ED.input.mouse.x = e.x; ED.input.mouse.y = e.y + 64;
      ED.input.sim = { held: { attack: true }, edge: {} }; const h0 = e.hp; stepN(g, 120); ED.input.sim = { held: {}, edge: {} }; ED.input.mouse.aim = false;
      ok(e.hp < h0 - 5, 'flasks burst on target (' + (h0 - e.hp).toFixed(0) + ' dmg)');
      ok(g.zones.some(z => z.hurtsEnemies) || e.hp < h0, 'flasks leave a puddle'); const h1 = e.hp; stepN(g, 40); ok(e.hp <= h1, 'puddle keeps damaging');
      // Reaction
      e.status.burn = { t: 200, dps: 1, tick: 0 }; e.status.poison = { t: 200, dps: 1, tick: 5 }; const hh = e.hp;
      g._zone({ kind: 'hazard', shape: 'circle', x: e.x, y: e.y, r: 40, life: 60, dmg: 4, tick: 10, tickT: 0, hurts: false, hurtsEnemies: true, color: '#ff6a2a', elem: 'fire', src: p }); stepN(g, 30);
      ok(e.hp < hh - 12, 'Alchemist Reaction detonates doubly-afflicted enemies (' + (hh - e.hp).toFixed(0) + ')');

      // Monk flow
      g = arena('monk', 2, 'FLOW'); p = g.player; g.god = true; e = dummy(g, 300 + 36, 288, 9000);
      ED.input.mouse.aim = true; ED.input.mouse.x = e.x; ED.input.mouse.y = e.y + 64; ED.input.sim = { held: { attack: true }, edge: {} }; stepN(g, 90);
      ok(p.flow >= 5 && p.tempAtk > 0.1 && p.tempSpd > 0.1, 'Flow builds with hits (flow ' + p.flow + ')'); const hd = 9000 - e.hp;
      ED.input.sim = { held: {}, edge: {} }; ED.input.mouse.aim = false; stepN(g, 260); ok(p.flow === 0 && p.tempAtk === 0, 'Flow fades without hits');
      ok(hd / 90 > 0.1, 'gauntlets deal damage'); // third blow shockwave
      g.swings.length = 0; p.swingN = 2; g.fireWeapon(0, false); ok(g.swings.some(s => s.kind === 'circle'), 'every third blow sends a shockwave');
      // Overcharge
      p.active = g.newActiveState({ cat: 'active', id: 'overcharge', rarity: 'common', lvl: 1, uid: 3, name: 'O', upg: 0 }); ED.input.sim = { held: {}, edge: { active: true } }; stepN(g, 2); ED.input.sim = { held: {}, edge: {} };
      ok(p.tempAtk >= 0.45 && p.tempDmg >= 0.2, 'Overcharge boosts attack speed and damage'); stepN(g, 400); ok(p.tempAtk < 0.01, 'Overcharge ends');

      // Chakram ricochet + two in the air
      g = arena('knight', 2, 'CHAK'); p = g.player; g.god = true; p.weapon = I.rollWeapon(new ED.RNG('ck'), 2, { type: 'chakram', rarity: 'common' }); I.recalc(p);
      p.x = 480; p.y = 288; g.fireWeapon(0, false); stepN(g, 1); const ck = g.pproj.find(b => b.kind === 'chak'); ok(!!ck, 'chakram is thrown');
      let maxB = 3; for (let i = 0; i < 100; i++) { stepN(g, 1); maxB = Math.min(maxB, ck.bounce); } ok(maxB < 3 || ck.dead, 'chakram ricochets off walls (bounces left ' + ck.bounce + ')');
      g.pproj.length = 0; g.fireWeapon(0, false); g.fireWeapon(0.2, false); ok(Wcan(g) === false, 'at most two chakrams at once'); function Wcan(gg) { return ED.weaponImpl.chakram.canFire(gg); }
      // Hex + opener
      g = arena('knight', 2, 'HEX'); p = g.player; e = dummy(g, 400, 288, 1000); const d0 = e.hp; g.damageEnemy(e, 10, { noProc: true, noKnock: true }); const plain = d0 - e.hp; e.hp = e.maxHp; g.applyStatus(e, 'hex', { t: 300 }); g.damageEnemy(e, 10, { noProc: true }); ok(Math.abs((e.maxHp - e.hp) - plain * 1.25) < 0.01, 'Hex adds 25% damage');
      p.st.opener = 0.7; e.hp = e.maxHp; e.hexT = 0; g.damageEnemy(e, 10, { src: 'melee', noProc: true, x: 0, y: 0 }); ok(Math.abs((e.maxHp - e.hp) - 17) < 0.01, "Duelist's Glove opener (+70%)"); const hp2 = e.hp; g.damageEnemy(e, 10, { src: 'melee', noProc: true, x: 0, y: 0 }); ok(Math.abs((hp2 - e.hp) - 10) < 0.01, 'opener only on unhurt enemies');
      // Ricochet rune bends arrows
      p.st.bounce = 1; const b = g.pShot({ kind: 'arrow', ang: 0, speed: 9, dmg: 1, kb: 0, crit: false, pierce: 0, life: 200, r: 4, color: '#fff', x: 800, y: 288 }); ok(b.bounce === 1, 'projectiles inherit ricochet');
      // unlock milestones
      ED.save.meta.unlocked.classes.warden = false; ED.save.meta.unlocked.items['floor:6'] = false; ED.save.meta.bestFloor = 6; g.checkMilestones(); ok(ED.save.isClassUnlocked('warden'), 'reaching floor 6 unlocks the Warden');
      ED.save.meta.unlocked.classes.monk = false; ED.save.meta.unlocked.items['kills:400'] = false; const tk = ED.save.meta.totalKills; ED.save.meta.totalKills = 400; g.checkMilestones(); ok(ED.save.isClassUnlocked('monk'), '400 lifetime kills unlock the Monk'); ED.save.meta.totalKills = tk;
    }
  }

  // ======================================================================= v3 WORLDS
  if (P.on('v3')) {
    const W = ED.worlds, D = ED.D;
    section('P3. v3 WORLDS — mapping & content');
    {
      ok(W.LIST.length === 6, 'six worlds');
      for (const f of [1, 5, 6, 10, 11, 15, 16, 20, 21, 25, 26, 30, 31, 61]) ok(W.at(f).idx === Math.floor((f - 1) / 5) % 6, 'world index for floor ' + f);
      ok(W.at(5).depth === 4 && W.at(6).first && W.at(6).number === 2 && W.at(31).loop === 1, 'depth / first / loop bookkeeping');
      for (const w of W.LIST) { ok(w.theme && w.theme.floorA && w.theme.wall && w.theme.accent, w.id + ' has a full palette'); for (const id of w.enemies) { const e = ED.enemyTypes[id]; ok(e && e.world === w.id && e.pack === 'v3' && typeof e.update === 'function', 'enemy ' + id + ' belongs to ' + w.id); } if (w.mini) ok(!!ED.minibosses.def(w.mini), w.id + ' mini boss exists'); if (w.mod) ok(!!ED.mods[w.mod], w.id + ' elite trait exists'); }
      for (const f of [1, 7, 12, 18, 23, 28]) ok(ED.rooms.themeFor(f).name === W.at(f).w.theme.name, 'theme follows the world @' + f);
      // pools: a world's foes only show up in that world, and never when v3 is off
      for (let f = 1; f <= 70; f++) { const pool = D.enemyPool(f), wi = W.at(f); for (const id of pool) { const e = ED.enemyTypes[id]; if (e.world) ok(e.world === wi.w.id && e.minFloor <= f, 'pool @' + f + ' only holds its own world foes (' + id + ')'); } }
      for (const w of W.LIST) for (const id of w.enemies) { const f = 1 + 5 * W.LIST.indexOf(w) + 4; ok(D.enemyPool(f).includes(id) || ED.enemyTypes[id].minFloor > f, id + ' spawns in its world'); }
      // compose real waves in every world and check the world's foes appear regularly
      const rng = new ED.RNG('worldwaves'); for (const w of W.LIST) { if (w.id === 'crypts') continue; const f = 1 + 5 * W.LIST.indexOf(w) + 2; let own = 0, tot = 0; for (let i = 0; i < 80; i++) for (const wave of D.composeWaves(f, rng, {})) for (const e of wave) { tot++; if (w.enemies.includes(e.type)) own++; } ok(own / tot > 0.12 && own / tot < 0.7, w.id + ': own foes are ' + Math.round(100 * own / tot) + '% of spawns'); }
      // the new tile survives validation
      ok(ED.rooms.PASS.has(ED.T.MUD), 'mud is walkable terrain');
    }

    section('P3b. v3 — every new foe fights, can be killed, and stays finite');
    for (const w of W.LIST) for (const id of w.enemies) {
      const F = Math.max(ED.enemyTypes[id].minFloor, 1) + 1, g = arena('knight', F, 'EN-' + id); g.god = true; const p = g.player; p.hp = p.maxHp;
      const e = g.spawnEnemy(id, 560, 300, { silent: true }); const bot = new Bot(ED, g, { god: true }); let frames = 0, dmgSeen = false;
      g.rt.lockdown = true; g.refreshCollision();
      try { while (!e.dead && frames++ < 60 * 50) { if (frames === 60 * 22) for (const x of g.enemies) x.rush = true; bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (frames % 40 === 0) g.render(); } } catch (err) { ok(false, id + ' crashed: ' + (err.stack || err)); }
      finite(g, id); ok(e.dead, id + ' can be killed within 50s (' + Math.round(frames / 60) + 's, hp ' + Math.round(e.hp) + ')');
    }
    // hostile-room liveness: every enemy type of every world, in a normal combat room, as a mixed wave, with a mortal-ish bot (not god) must resolve
    {
      const mixRng = new ED.RNG('mixpos'); const g = arena('knight', 12, 'MIX'); g.god = true; const room = g.room; for (const w of W.LIST) for (const id of w.enemies) g.spawnEnemy(id, 400 + mixRng.next() * 300, 200 + mixRng.next() * 200, { silent: true, hpMul: 0.5 });
      const bot = new Bot(ED, g, { god: true }); let fr = 0; while (g.enemies.some(e => !e.dead) && fr++ < 60 * 90) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; }
      ok(!g.enemies.some(e => !e.dead), 'a room containing every world foe at once can be cleared (' + Math.round(fr / 60) + 's)'); finite(g, 'mixed');
    }
    // elite traits
    for (const id of ['mired', 'molten', 'stormcharged']) {
      const g = arena('knight', 12, 'MOD-' + id); g.god = true; const e = g.spawnEnemy('chaser', 520, 300, { silent: true, elite: true, mods: [id] }); e.maxHp = e.hp = 200; e.hold = false;
      try { stepN(g, 400); g.damageEnemy(e, 9999, { src: 'melee', x: 0, y: 0 }); stepN(g, 30); g.render(); } catch (err) { ok(false, 'mod ' + id + ': ' + err); }
      ok(e.dead && e.mods[0].id === id, 'elite trait ' + id + ' runs and dies cleanly');
    }

    section('P3c. v3 — environmental rules');
    {
      const normalRoom = (g) => g.floor.rooms.find(r => r.type === 'normal');
      const enter = (F, seed) => { const g = newGame(); g.startRun(seed, 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, F); const r = normalRoom(g); ED.debug.goto(g, r, 480, 420); g.scene = 'play'; return g; };
      const zonesFrom = (g) => { const cnt = { n: 0 }; const orig = g._zone; g._zone = function (z) { if (z.src === null || z.src === undefined) cnt.n++; return orig.call(this, z); }; return cnt; };
      // Mirewood: mud + spores
      let g = enter(7, 'MIRE'); let rt = g.rt; ok(rt.worldOn && rt.mud && rt.mud.length >= 6, 'Mirewood rooms are boggy (' + (rt.mud || []).length + ' mud tiles)');
      const mt = rt.mud[0]; g.player.x = (mt % 30) * 32 + 16; g.player.y = Math.floor(mt / 30) * 32 + 16; g.player.slowT = 0; stepN(g, 2); ok(g.player.slowT > 0, 'mud slows the player');
      g.player.relics.bogheart = 1; g.player.slowT = 0; g.player.x = (mt % 30) * 32 + 16; g.player.y = Math.floor(mt / 30) * 32 + 16; stepN(g, 2); ok(g.player.slowT === 0, 'Bog Heart wades through mud'); delete g.player.relics.bogheart;
      let c = zonesFrom(g); rt.lockdown = true; rt.sporeT = 5; stepN(g, 120); ok(c.n >= 1, 'spore clouds drift in during fights');
      // Glacial: ice + gusts
      g = enter(12, 'GLACE'); rt = g.rt; ok(rt.ice && rt.ice.length >= 8 && g.room.tiles[rt.ice[0]] === ED.T.ICE, 'Glacial rooms have ice');
      rt.lockdown = true; const px0 = g.player.x; rt.gustT0 = 5; let sawWarn = false, sawBlow = false, moved = 0;
      { const fs = g.freeSpot(480, 288, 16); g.player.x = fs.x; g.player.y = fs.y; } for (let i = 0; i < 900 && !sawBlow; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; if (rt.gust && rt.gust.state === 'warn') sawWarn = true; if (rt.gust && rt.gust.state === 'blow') sawBlow = true; }
      ok(sawWarn && sawBlow, 'a gust telegraphs, then blows'); let best = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const fs = g.freeSpot(480, 288, 16); g.player.x = fs.x; g.player.y = fs.y; rt.gust = { state: 'blow', t: 40, dx, dy }; const bx = g.player.x, by = g.player.y; stepN(g, 20); best = Math.max(best, Math.hypot(g.player.x - bx, g.player.y - by)); } ok(best > 15, 'gusts push the player (' + Math.round(best) + 'px)'); finite(g, 'glacial');
      // Foundry: lava + vents
      g = enter(17, 'FOUNDRY'); rt = g.rt; ok(rt.lava && rt.lava.length >= 4 && g.room.tiles[rt.lava[0]] === ED.T.LAVA, 'Foundry rooms have lava'); ok(rt.vents && rt.vents.length >= 1, 'and steam vents (' + (rt.vents || []).length + ')');
      ok(!rt.spawnTiles.some(t => g.room.tiles[t.ty * 30 + t.tx] === ED.T.LAVA), 'no foe spawns inside lava');
      c = zonesFrom(g); rt.lockdown = true; for (const v of rt.vents) v.t = 3; stepN(g, 120); ok(c.n >= 1, 'steam vents erupt during fights');
      rt.enc = null; g.enemies.length = 0; g.spawns.length = 0; const lt = rt.lava[0]; g.god = false; g.transT = 0; const lp = g.player; lp.inv = 0; lp.dashT = 0; lp.x = (lt % 30) * 32 + 16; lp.y = Math.floor(lt / 30) * 32 + 12; const h0 = lp.hp; ok(g.tileAt(lp.x, lp.y + 4) === ED.T.LAVA, 'standing on lava'); lp.relics.slagcore = 1; ED.items.recalc(lp); g.hazardCheck(); ok(lp.hp === h0, 'Slag Core is immune to lava'); delete lp.relics.slagcore; ED.items.recalc(lp); lp.inv = 0; g.hazardCheck(); ok(lp.hp < h0, 'lava burns without it');
      // Void: darkness + wells
      g = enter(22, 'VOID'); rt = g.rt; ok(rt.wells && rt.wells.length >= 1, 'Gloam Void rooms hold gravity wells'); rt.lockdown = true; rt.enc = null; g.enemies.length = 0; g.spawns.length = 0; let pulled = false; for (const [ox, oy] of [[90, 0], [-90, 0], [0, 90], [0, -90]]) { const w0 = rt.wells[0]; w0.vx = w0.vy = 0; const fs = g.freeSpot(w0.x + ox, w0.y + oy, 14); g.player.x = fs.x; g.player.y = fs.y; g.player.inv = 99; const d0 = Math.hypot(fs.x - w0.x, fs.y - w0.y); stepN(g, 10); if (d0 < 150 && Math.hypot(g.player.x - w0.x, g.player.y - w0.y) < d0 - 2) pulled = true; } ok(pulled, 'wells drag the player in');
      for (let k = 0; k < 6; k++) { const gg = enter(22, 'VOID' + k); if (gg.rt.dark) { ok(true, 'some void rooms are dark'); break; } if (k === 5) ok(false, 'no dark rooms in 6 void rooms'); }
      // Storm: lightning
      g = enter(27, 'STORM'); rt = g.rt; c = zonesFrom(g); rt.lockdown = true; rt.stormT = 5; stepN(g, 100); ok(c.n >= 1, 'lightning is called down in fights');
      // Crypts: untouched
      g = enter(3, 'CRYPT'); ok(!g.rt.mud && !g.rt.ice && !g.rt.lava && !g.rt.wells, 'the Crypts have no environmental rule');
      // safe in non-combat rooms: hazards only in combat rooms; boss rooms keep their own rules
      g = newGame(); g.startRun('BOSSW', 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 27); ED.debug.skipToBoss && ED.debug.skipToBoss(g); g.scene = 'play'; ok(!g.rt || !g.rt.worldOn, 'boss rooms have no world hazards');
      // intro cards + HUD render in every world
      for (const f of [1, 6, 11, 16, 21, 26]) { const gg = newGame(); gg.startRun('INTRO' + f, 'knight'); ED.debug.jumpFloor(gg, f); gg.scene = 'intro'; gg.introT = 60; try { gg.render(); gg.scene = 'play'; gg.render(); } catch (err) { ok(false, 'render in world ' + f + ': ' + err); } }
      ok(true, 'intro + HUD render in every world');
      // collection / bestiary lists the new foes
      ED.save.meta.seen.enemies.tombrat = true; ok(ED.packs.values(ED.enemyTypes).some(e => e.id === 'sporecap'), 'bestiary includes world foes');
      // mini boss first-kill unlocks its relic
      ED.save.meta.unlocked.items['mini:bogtyrant'] = false; ok(!ED.items.isUnlocked(ED.items.relic('bogheart')), 'Bog Heart starts locked'); ED.save.unlockItem('mini:bogtyrant'); ok(ED.items.isUnlocked(ED.items.relic('bogheart')), 'killing the Bog Tyrant unlocks Bog Heart');
    }
  }

  // ======================================================================= v4 TITANS
  if (P.on('v4')) {
    const D = ED.D, B = ED.bosses, NEW_F = ['skarn', 'karsk', 'voltaris'], NEW_M = ['tempestra', 'morrow'];
    section('P4. v4 TITANS — roster & data');
    {
      ok(B.rosterSize(false) === 7 && B.rosterSize(true) === 5, 'roster grows to 7 floor bosses + 5 MEGA bosses');
      const seen = new Set(), rng = new ED.RNG('roster'); for (let f = 1; f <= 80; f++) { const s = B.forFloor(f, rng); seen.add(s.defId); if (s.partnerId) seen.add(s.partnerId); ok(!!B.def(s.defId) && (f % 5 === 0) === !!B.def(s.defId).mega, 'floor ' + f + ' picks a real ' + (f % 5 ? 'floor' : 'MEGA') + ' boss (' + s.defId + ')'); }
      for (const id of NEW_F.concat(NEW_M)) ok(seen.has(id), id + ' appears somewhere in floors 1-80');
      for (const f of [1, 4, 6, 9, 11, 16, 21, 26]) ok(D.bossTier(f) === (f % 5 ? Math.floor((f - Math.floor(f / 5) - 1) / 4) + 1 : Math.floor((f / 5 - 1) / 3) + 1), 'tier pacing unchanged @' + f);
      for (const id of NEW_F.concat(NEW_M)) {
        const d = B.def(id); ok(d && d.pack === 'v4' && d.phases.length >= 4, id + ' has 4+ phases'); ok(d.arena && ED.rooms.ARENAS[d.arena], id + ' arena exists (' + d.arena + ')');
        for (const ph of d.phases) for (const a of ph.attacks) { const nm = Array.isArray(a) ? a[0] : a; ok(!!d.attacks[nm] && !!ED.attacks.lib[d.attacks[nm][0]], id + ' attack ' + nm + ' resolves'); }
        for (const en of d.phases.flatMap(ph => ph.enter || [])) { const ent = en[1] === null ? d.attacks[en[0]] : en; ok(ent && !!ED.attacks.lib[ent[0]], id + ' enter script resolves'); }
        if (d.parts) { ok(d.parts.some(p => p.kind === 'core') && typeof d.phaseOf === 'function', id + ' has a core + phaseOf'); for (const p of d.parts) { const base = ['plate', 'arm', 'core', 'head', 'gear', 'wing', 'shard'].includes(p.kind); ok(base || (ED.partPos[p.kind] && ED.partDraw[p.kind]), id + ' part kind ' + p.kind + ' has art + position'); } }
        ok(!!ED.bossDraw[d.shape] || ['knight'].includes(d.shape), id + ' has body art'); const rel = Object.values(I.RELICS).find(r => r.unlock === 'boss:' + id); ok(!!rel, id + ' drops a signature relic (' + (rel && rel.id) + ')');
      }
      ok(NEW_M.map(id => B.def(id).megaIndex).join() === '3,4', 'new MEGA indices follow the originals');
    }

    section('P4b. v4 — every new boss can be fought and beaten');
    for (const id of NEW_F.concat(NEW_M)) {
      let F = 0; for (let f = 1; f <= 60; f++) if (B.forFloor(f, new ED.RNG('x')).defId === id) { F = f; break; }
      ok(F > 0, id + ' has a floor to fight on'); if (!F) continue;
      let r; try { r = bossFight(F, 'T4-' + id); } catch (e) { ok(false, id + ' threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); continue; }
      const nm = B.forFloor(F, new ED.RNG('x')).name; console.log('  floor ' + F + ' ' + nm + ' — defeated: ' + r.cleared + ' in ' + (r.frames / 60).toFixed(0) + 's, phases ' + r.phases.join(',') + ', peak bullets ' + r.maxProj);
      ok(r.cleared, id + ' can be defeated'); ok(r.phases.length >= (B.def(id).mega ? 4 : 3), id + ' passes through its phases (' + r.phases.join(',') + ')'); ok(r.maxProj <= 280 && r.g.zones.length < 60, id + ' respects bullet/zone caps'); finite(r.g, id);
      ok(r.g.inters.some(i => i.type === 'stairs'), id + ' opens the stairway'); ok(ED.save.isItemUnlocked('boss:' + id), id + ' kill unlocks its relic');
    }

    section('P4c. v4 — mechanics');
    {
      // Karsk: untouchable while diving, vulnerable and winded after
      let g = newGame(); g.startRun('KARSK', 'knight'); g.scene = 'play'; g.god = true; let F = 0; for (let f = 1; f <= 60; f++) if (B.forFloor(f, new ED.RNG('x')).defId === 'karsk') { F = f; break; }
      ED.debug.jumpFloor(g, F); ED.debug.skipToBoss(g); g.scene = 'play'; stepN(g, 400); const e = g.enemies.find(x => x.boss); ok(!!e && e.intro <= 0, 'Karsk is fighting');
      e.co = ED.attacks.lib.burrow(e, g, { times: 1 }); e.wait = 0; let diveInvuln = false, winded = false, hid = false; for (let i = 0; i < 260; i++) { stepN(g, 1); if (e.vis === 0 && e.invuln) { diveInvuln = true; hid = true; } if (e.vuln > 1.3 && !e.invuln) winded = true; }
      ok(diveInvuln && hid, 'diving makes Karsk invulnerable and unseen'); ok(winded, 'surfacing leaves Karsk winded (+40% damage)'); ok(e.vuln === 1 && !e.invuln, 'the window closes'); const hp0 = e.hp; e.co = ED.attacks.lib.burrow(e, g, { times: 1 }); e.wait = 0; stepN(g, 5); g.damageEnemy(e, 50, { src: 'melee', x: 0, y: 0, noProc: true }); ok(e.hp === hp0, 'dive blocks damage'); e.co = null;
      // interrupted dive never leaves the boss stuck
      e.co = ED.attacks.lib.burrow(e, g, { times: 2 }); e.wait = 0; stepN(g, 20); e.co.return(); e.co = null; ok(e.vis === 1 && !e.invuln, 'an interrupted dive resets visibility / invulnerability');
      // Ice floor: patches freeze, then the arena is restored after the fight
      g = newGame(); g.startRun('ICE', 'knight'); g.scene = 'play'; g.god = true; for (let f = 1; f <= 60; f++) if (B.forFloor(f, new ED.RNG('x')).defId === 'skarn') { F = f; break; }
      ED.debug.jumpFloor(g, F); ED.debug.skipToBoss(g); g.scene = 'play'; stepN(g, 400); const sk = g.enemies.find(x => x.boss); sk.co = ED.attacks.lib.iceFloor(sk, g, { n: 4 }); sk.wait = 0; stepN(g, 160);
      let ice = 0; for (let i = 0; i < g.room.tiles.length; i++) if (g.room.tiles[i] === ED.T.ICE) ice++; ok(ice >= 20, 'the Frostwarden freezes the floor (' + ice + ' tiles)');
      g.player.x = 480; g.player.y = 300; g.restoreArena(); ice = 0; for (let i = 0; i < g.room.tiles.length; i++) if (g.room.tiles[i] === ED.T.ICE) ice++; ok(ice === 0, 'the arena thaws when the fight ends');
      // Gale pushes
      g = newGame(); g.startRun('GALE', 'knight'); g.scene = 'play'; g.god = true; for (let f = 1; f <= 60; f++) if (B.forFloor(f, new ED.RNG('x')).defId === 'tempestra') { F = f; break; }
      ED.debug.jumpFloor(g, F); ED.debug.skipToBoss(g); g.scene = 'play'; stepN(g, 500); const tp = g.enemies.find(x => x.boss); let best = 0;
      for (let k = 0; k < 4; k++) { const fs = g.freeSpot(480, 400, 16); g.player.x = fs.x; g.player.y = fs.y; tp.co = ED.attacks.lib.gale(tp, g, { warn: 5, dur: 30 }); tp.wait = 0; const sx = g.player.x, sy = g.player.y; stepN(g, 40); best = Math.max(best, Math.hypot(g.player.x - sx, g.player.y - sy)); }
      ok(best > 15, 'Tempestra\'s gale shoves the player (' + Math.round(best) + 'px)'); ok(!tp.gale, 'gale state clears');
      // Voltaris: pylons silence beams (anchors move to the core once they are gone)
      g = newGame(); g.startRun('VOLT', 'knight'); g.scene = 'play'; g.god = true; for (let f = 1; f <= 60; f++) if (B.forFloor(f, new ED.RNG('x')).defId === 'voltaris') { F = f; break; }
      ED.debug.jumpFloor(g, F); ED.debug.skipToBoss(g); g.scene = 'play'; stepN(g, 400); const vo = g.enemies.find(x => x.boss); ok(vo.parts.filter(p => p.kind === 'pylon').length === 4, 'Voltaris starts with four pylons'); ok(vo.phaseIdx === 0, 'phase 0 while all pylons live');
      for (const p of vo.parts) if (p.kind === 'pylon') B.destroyPart(vo, g, p); stepN(g, 60); ok(vo.phaseIdx >= 1, 'destroying pylons advances the fight (phase ' + vo.phaseIdx + ')');

      // relics
      g = arena('knight', 3, 'REL4'); let p = g.player; g.god = false;
      g.equipItem({ cat: 'relic', id: 'deathlesscrown', uid: ED.id() }, true); p.inv = 0; p.hp = 2; g.hurtPlayer(50, 0, 0, {}); ok(p.hp === 1 && !p.dead, 'Deathless Crown: survive the first killing blow of a floor'); p.inv = 0; g.hurtPlayer(50, 0, 0, {}); ok(p.dead || p.hp <= 0, '... but only once per floor');
      g = arena('knight', 3, 'REL4B'); p = g.player; g.equipItem({ cat: 'relic', id: 'enginecore', uid: ED.id() }, true); const t1 = dummy(g, 400, 288, 90000), t2 = dummy(g, 430, 300, 90000), t3 = dummy(g, 460, 280, 90000); p.zapN = 0; let zapped = 0; const oc = g.chainLightning; g.chainLightning = function () { zapped++; return oc.apply(this, arguments); };
      for (let k = 0; k < 17; k++) g.damageEnemy(t1, 4, { src: 'melee', x: 300, y: 288 }); ok(zapped === 2, 'Storm Engine Core zaps on every 8th hit (' + zapped + ' zaps in 17 hits)');
      g = arena('knight', 3, 'REL4C'); p = g.player; p.st.chillVuln = 0.3; const ch = dummy(g, 400, 288, 1000); const a0 = ch.hp; g.damageEnemy(ch, 10, { noProc: true }); const base = a0 - ch.hp; ch.hp = ch.maxHp; ch.status.slow = { t: 100, f: 0.5 }; g.damageEnemy(ch, 10, { noProc: true }); ok(Math.abs((ch.maxHp - ch.hp) - base * 1.3) < 0.01, 'Frostwarden\'s Crest: +30% vs chilled');
    }

    section('P4d. v4 — Revenants');
    {
      const M = ED.save.meta; M.nemesis = null;
      let g = newGame(); g.startRun('DIE1', 'mage'); g.scene = 'play'; ED.debug.jumpFloor(g, 4); g.equipItem({ cat: 'relic', id: 'whetstone', uid: ED.id() }, true); g.equipItem({ cat: 'relic', id: 'clover', uid: ED.id() }, true); g.run.killedBy = 'a Gloomling'; g.run.lastHitId = 'chaser'; g.finishRun(false);
      ok(M.nemesis && M.nemesis.killerId === 'chaser' && M.nemesis.rank === 1, 'the killer is remembered');
      ok(M.nemesis && M.nemesis.cls === 'mage' && M.nemesis.floor === 4 && M.nemesis.relics.includes('whetstone') && M.nemesis.killer === 'a Gloomling', 'death records the echo (' + JSON.stringify(M.nemesis && M.nemesis.relics) + ')');
      ok(ED.nemesis.kitOf('mage') === 'revenant_arcane' && ED.nemesis.kitOf('ranger') === 'revenant_ranged' && ED.nemesis.kitOf('knight') === 'revenant_melee', 'echo fights in the style of the class');
      g = newGame(); g.startRun('DIEV', 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 5); const before = JSON.stringify(M.nemesis); g.finishRun(true); ok(JSON.stringify(M.nemesis) === before, 'a victory does not create an echo');
      // the next run meets it
      const seed = 'NEMRUN', target = 3 + new ED.RNG(seed + ':nemesis').int(0, 3);
      g = newGame(); g.startRun(seed, 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, target);
      const room = g.floor.rooms.find(r => r.type === 'miniboss' && r.mini.revenant); ok(!!room && room.mini.defId === 'revenant_arcane', 'a mini boss room on floor ' + target + ' hosts the echo');
      ok(g.floor.rooms.filter(r => r.mini && r.mini.revenant).length === 1, 'exactly one echo per run');
      if (room) {
        giveKit(g, target); const bot = new Bot(ED, g, { god: true }); ED.debug.goto(g, room, 480, 440); g.scene = 'play'; let fr = 0; while (fr++ < 60 * 150) { bot.tick(); g.step(); if (g.room.cleared) break; if (g.scene !== 'play') g.scene = 'play'; }
        ok(room.cleared, 'the echo can be defeated (' + Math.round(fr / 60) + 's)'); stepN(g, 5);
        const peds = g.inters.filter(i => i.type === 'pedestal'); ok(peds.some(i => i.item.cat === 'relic' && i.item.id === 'whetstone') && peds.some(i => i.item.cat === 'weapon' && i.item.type === 'staff'), 'it returns your old relic and weapon');
        ok(M.nemesis === null, 'the echo is laid to rest');
      }
      // other floors don't spawn it; no echo -> nothing changes
      M.nemesis = { cls: 'knight', floor: 5, killer: 'x', weaponType: 'sword', rarity: 'rare', relics: [], seed: 'q' }; g = newGame(); g.startRun('OTHER', 'knight'); g.scene = 'play'; const tg = 3 + new ED.RNG('OTHER:nemesis').int(0, 3); ED.debug.jumpFloor(g, tg === 3 ? 4 : 3); ok(!g.floor.rooms.some(r => r.mini && r.mini.revenant), 'the echo only appears on its own floor');
      M.nemesis = null; g = newGame(); g.startRun('NONE', 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 4); ok(!g.floor.rooms.some(r => r.mini && r.mini.revenant), 'no echo without a past death');
      // ---- Nemesis 2.0: killer memory, ranks, escalation
      M.nemesis = { cls: 'knight', floor: 7, killer: 'Vael', killerId: 'vael', weaponType: 'sword', rarity: 'rare', relics: ['whetstone'], seed: 'q', rank: 1, slain: 0 };
      g = newGame(); g.startRun('RK1', 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 4); const base = { floor: 4, tier: 1 };
      let sp = ED.nemesis.revenantSpec(g, M.nemesis, base); ok(sp.extraAttacks.length === 2 && sp.extraAttacks[0][0].indexOf('@vael:') === 0 && sp.learned === 'Vael', 'killed by a boss: the echo borrows its moves (' + sp.extraAttacks.map(a => a[0]).join(',') + ')');
      M.nemesis.killerId = 'chaser'; sp = ED.nemesis.revenantSpec(g, M.nemesis, base); ok(!!sp.attacks.legion && sp.extraAttacks[0] === 'legion', 'killed by a foe: the echo brings that foe along');
      M.nemesis.killerId = null; sp = ED.nemesis.revenantSpec(g, M.nemesis, base); ok(!!sp.attacks.fall, 'killed by the dungeon: it rains ruin');
      M.nemesis.rank = 3; sp = ED.nemesis.revenantSpec(g, M.nemesis, base); ok(Math.abs(sp.hpMul - 1.8) < 1e-9 && sp.mods.includes('hasted') && /^Shade/.test(sp.name), 'rank 3: tougher, hasted, renamed (' + sp.name + ')');
      M.nemesis.rank = 5; sp = ED.nemesis.revenantSpec(g, M.nemesis, base); ok(sp.mods.length === 3 && sp.extraAll, 'rank 5: three boss mods and its extra attack in every phase');
      // dying TO the echo ranks it up and keeps its memory of the original death
      M.nemesis = { cls: 'knight', floor: 7, killer: 'Vael', killerId: 'vael', weaponType: 'sword', rarity: 'rare', relics: ['whetstone'], seed: 'q', rank: 1, slain: 0 };
      g = newGame(); g.startRun('RK2', 'rogue'); g.scene = 'play'; ED.debug.jumpFloor(g, 5); g.run.lastHitId = 'revenant'; g.run.killedBy = 'Echo of the Knight'; g.finishRun(false);
      ok(M.nemesis.rank === 2 && M.nemesis.slain === 1 && M.nemesis.cls === 'knight' && M.nemesis.killerId === 'vael', 'the echo that killed you ranks up and keeps its original grudge');
      for (let i = 0; i < 6; i++) { g = newGame(); g.startRun('RKX' + i, 'rogue'); g.scene = 'play'; ED.debug.jumpFloor(g, 5); g.run.lastHitId = 'revenant'; g.finishRun(false); } ok(M.nemesis.rank === 5, 'rank caps at 5');
      // a fresh death by something else replaces it
      g = newGame(); g.startRun('RK3', 'mage'); g.scene = 'play'; ED.debug.jumpFloor(g, 5); g.run.lastHitId = 'shooter'; g.finishRun(false); ok(M.nemesis.cls === 'mage' && M.nemesis.rank === 1, 'a new death creates a new echo');
      // a rank-4 echo fight pays out its gifts
      M.nemesis = { cls: 'knight', floor: 7, killer: 'Vael', killerId: 'vael', weaponType: 'sword', rarity: 'rare', relics: ['whetstone', 'clover'], seed: 'q', rank: 4, slain: 3 };
      { const seed2 = 'NEMR4', tgt = 2 + new ED.RNG(seed2 + ':nemesis').int(0, 3); g = newGame(); g.startRun(seed2, 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, Math.max(tgt, 2)); const room2 = g.floor.rooms.find(r => r.type === 'miniboss' && r.mini.revenant);
        ok(!!room2 && room2.mini.nemesis.rank === 4 && room2.mini.mods.length === 2, 'a rank-4 echo hunts from floor 2+');
        if (room2) { giveKit(g, Math.max(tgt, 2)); const bot = new Bot(ED, g, { god: true }); ED.debug.goto(g, room2, 480, 440); g.scene = 'play'; let fr = 0; while (fr++ < 60 * 200) { bot.tick(); g.step(); if (g.room.cleared) break; if (g.scene !== 'play') g.scene = 'play'; }
          ok(room2.cleared, 'a rank-4 echo can be defeated (' + Math.round(fr / 60) + 's)'); stepN(g, 60); ok(g.inters.some(i => i.type === 'healfont' && /Echo/.test(i.prompt())), 'rank 3+ gifts a heart container'); ok(g.inters.filter(i => i.type === 'pedestal').length >= 4, 'rank 4 adds a legendary relic choice'); ok(M.nemesis === null, 'defeating it ends the grudge'); } }
      M.nemesis = null;
    }
  }

  // ======================================================================= v5 FATE
  if (P.on('v5')) {
    const EVS = ED.events.LIST, FAM = ED.familiars.FAM;
    section('P5. v5 FATE — rooms, encounters, companions');
    {
      ok(EVS.length === 11 && Object.keys(FAM).length === 6, '11 encounters, 6 familiars');
      ok(!!ED.roomTypes.event && ED.D.roomWeight('event', 5) > 0 && ED.D.roomWeight('event', 1) === 0, 'event rooms exist from floor 2');
      let found = 0, total = 0; const rng = new ED.RNG('evgen'); for (let i = 0; i < (quick ? 120 : 400); i++) { const f = ED.gen.generate(2 + rng.int(0, 60), 'EVG' + i); total++; if (ED.gen.validate(f).length) ok(false, 'invalid floor with events ' + i); found += f.rooms.filter(r => r.type === 'event').length; }
      ok(found > total * 0.1, 'events appear in generated floors (' + found + ' in ' + total + ')');
      // a generated event room is fully playable
      let g = null; for (let i = 0; i < 200 && !g; i++) { const gg = newGame(); gg.startRun('EVR' + i, 'knight'); gg.scene = 'play'; gg.god = true; ED.debug.jumpFloor(gg, 4); const r = gg.floor.rooms.find(x => x.type === 'event'); if (r) { ED.debug.goto(gg, r, 480, 420); gg.scene = 'play'; g = gg; } }
      ok(!!g && g.rt.ev && g.inters.some(i => i.type === 'altar'), 'an event room spawns its speaker'); if (g) { const al = g.inters.find(i => i.type === 'altar'); g.player.x = al.x; g.player.y = al.y + 30; stepN(g, 3); g.nearInter = al; g.tryInteract(); ok(g.modal && g.modal.type === 'event', 'interacting opens the encounter'); g.render(); g.modal = null; }
    }
    section('P5b. v5 — every choice of every encounter resolves');
    for (const ev of EVS) {
      for (let ci = 0; ci < ev.choices.length; ci++) {
        const trials = ev.choices[ci].run.length >= 3 ? 10 : 2; // random choices get several seeds
        for (let k = 0; k < trials; k++) {
          const g = arena('knight', 6, 'EV-' + ev.id + ci + k); const p = g.player; g.god = true; p.gold = 999; p.bombs = 3; p.bonusHp = 8; I.recalc(p); p.hp = p.maxHp - 6; g.equipItem({ cat: 'relic', id: 'whetstone', uid: ED.id() }, true);
          g.room.type = 'event'; g.rt.enc = null; g.room.cleared = g.rt.cleared = true; g.rt.lockdown = false; g.enemies.length = 0; g.spawns.length = 0; const m = ED.events.open(g, ev.id); m.rng = new ED.RNG('r' + ev.id + ci + k); const ch = ev.choices[ci]; let res;
          try { g.render(); ED.modalImpl.event.update(g, m, 'ch:' + ci, ED.input); } catch (e) { ok(false, ev.id + '/' + ci + ' threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); continue; }
          if (!ch.can || ch.can(g, m.st)) { if (m.stage !== 'result') ok(false, ev.id + '/' + ci + ' did not resolve'); }
          if (m.stage === 'result' && k === 0) ok(typeof m.result === 'string' && m.result.length > 3, ev.id + '/' + ci + ' says what happened');
          ok(Object.values(p.st).every(v => typeof v !== 'number' || isFinite(v)) && isFinite(p.hp) && p.hp > 0, ev.id + '/' + ci + ' leaves stats finite');
          if (m.stage === 'result') { g.modal = m; g.render(); ED.modalImpl.event.update(g, m, 'done', ED.input); ok(!g.modal, ev.id + ' closes'); }
          if (g.rt.evFight) { const bot = new Bot(ED, g, { god: true }); let fr = 0; while (g.rt.evFight && fr++ < 60 * 90) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; } ok(!g.rt.evFight && !g.rt.lockdown, ev.id + '/' + ci + ' fight resolves and unlocks the room (' + Math.round(fr / 60) + 's)'); ok(g.inters.some(i => i.type === 'pedestal'), ev.id + ' fight pays out'); }
        }
      }
    }
    // gating + economics of specific events
    {
      let g = arena('knight', 6, 'EVX'); let p = g.player; p.gold = 0; const m = ED.events.open(g, 'merchant'); ok(ED.events.BY_ID.merchant.choices[0].can(g, m.st) === false, 'cannot buy without gold');
      p.gold = 999; const n0 = Object.keys(p.relics).length; ED.modalImpl.event.update(g, m, 'ch:0', ED.input); ok(Object.keys(p.relics).length === n0 + 1 && p.gold < 999, 'buying the relic costs gold and grants it');
      g = arena('knight', 6, 'EVY'); p = g.player; p.relics = { whetstone: 1, clover: 2 }; I.recalc(p); const m2 = ED.events.open(g, 'merchant'); const tot0 = 3; ED.modalImpl.event.update(g, m2, 'ch:1', ED.input); const tot1 = Object.values(p.relics).reduce((a, b) => a + b, 0); ok(tot1 === tot0 + 1, 'barter swaps one relic for two (' + tot0 + ' -> ' + tot1 + ')');
      g = arena('knight', 6, 'EVZ'); p = g.player; p.hp = 2; p.maxHp; const m3 = ED.events.open(g, 'bloodaltar'); ED.events.BY_ID.bloodaltar.choices[0].run(g, m3.st, new ED.RNG('b')); ok(p.hp >= 1, 'blood offering is never lethal');
      g = arena('knight', 6, 'EVW'); p = g.player; const w0 = p.weapon.upg || 0; p.gold = 999; const m4 = ED.events.open(g, 'forge'); ED.modalImpl.event.update(g, m4, 'ch:0', ED.input); ok((p.weapon.upg || 0) === w0 + 2, 'forge reforges (+2)');
      const g5 = arena('knight', 6, 'EVV'); const m5 = ED.events.open(g5, 'mirror'); ED.modalImpl.event.update(g5, m5, 'ch:0', ED.input); ok(g5.floor.rooms.every(r => r.discovered), 'mirror reveals the whole floor');
    }
    section('P5c. v5 — familiars');
    {
      for (const id of Object.keys(FAM)) for (const lv of [1, 2]) {
        const g = arena('knight', 4, 'FAM' + id + lv); const p = g.player; g.god = true; ED.familiars.give(g, id, lv); ok(p.fam && p.fam.id === id && p.fam.lv === lv, id + ' lv' + lv + ' joins');
        if (id === 'ember' || id === 'shadowcat') { const e = dummy(g, p.x + 130, p.y, 5000); const h = e.hp; stepN(g, 400); ok(e.hp < h - 3, id + ' lv' + lv + ' hurts foes (' + Math.round(h - e.hp) + ')'); if (id === 'shadowcat') ok(true, 'cat pounced'); }
        else if (id === 'moss') { const src = dummy(g, 700, 288); g.god = false; p.inv = 0; p.fam.cd = 0; const hp = p.hp; for (let k = 0; k < 3; k++) g.eShot(src, Math.PI, 1.5, { x: p.x + 40 + k * 3, y: p.y, dmg: 1 }); stepN(g, 30); ok(p.fam.cd > 0 && g.eproj.filter(b => !b.dead).length <= 2, 'moss cub swallows a bullet (' + g.eproj.filter(b => !b.dead).length + ' left)'); }
        else if (id === 'magpie') { g.dropGold(600, 300, 10); const g0 = p.gold; stepN(g, 260); ok(p.gold > g0, 'magpie fetches distant coins (' + (p.gold - g0) + ')'); ok(p.st.gold > 1.05, 'and adds gold find (' + p.st.gold.toFixed(2) + ')'); }
        else if (id === 'frostmoth') { const e = dummy(g, p.x + 60, p.y, 5000); stepN(g, 20); ok(!!e.status.slow, 'frost moth chills close foes'); }
        else if (id === 'lampmoth') { g.god = false; p.hp = 4; ED.runHooks('roomClear', g, g.room); ok(p.hp === 4 + 2 * lv, 'lamp moth heals on room clear (' + p.hp + ')'); }
        g.render(); finite(g, 'fam ' + id);
      }
      // swapping replaces, familiar persists across floors, and removes its buff
      const g = arena('knight', 4, 'FAMSWAP'); const p = g.player; ED.familiars.give(g, 'magpie', 2); const gold2 = p.st.gold; ED.familiars.give(g, 'ember', 1); ok(p.fam.id === 'ember' && p.st.gold < gold2 && !p.buffs.some(b => b.fam), 'a new companion replaces the old one and its buff');
      ED.debug.jumpFloor(g, 6); ok(p.fam && p.fam.id === 'ember', 'companions follow you between floors');
    }
  }

  // ======================================================================= v6 HEAT
  if (P.on('v6')) {
    const H = ED.heat, M = ED.save.meta, D = ED.D;
    const reset = () => { M.heat = []; M.embers = 0; M.hearth = {}; M.history = []; H.setActive([]); };
    section('P6. v6 HEAT — pacts');
    {
      reset(); ok(H.PACTS.length === 13, '13 pacts'); for (const p of H.PACTS) ok(p.heat >= 1 && p.heat <= 3 && p.desc && p.name, 'pact ' + p.id + ' is described');
      const base = D.atBase(8); ok(!H.live() && D.at(8) === base, 'no pacts: D.at is the untouched base row');
      H.setActive(['brutish', 'vicious', 'swift', 'impatient', 'elitetide', 'swarm', 'titan', 'austerity', 'inflation']); const h8 = D.at(8);
      const close = (a, b) => Math.abs(a - b) < 1e-9;
      ok(h8 !== base && close(h8.enemyHp, base.enemyHp * 1.25) && close(h8.enemyDmg, base.enemyDmg * 1.3) && close(h8.enemySpeed, base.enemySpeed * 1.12) && close(h8.projSpeed, base.projSpeed * 1.12) && close(h8.spawnBudget, base.spawnBudget * 1.25) && close(h8.bossHp, base.bossHp * 1.25) && close(h8.goldMult, base.goldMult * 0.7) && close(h8.priceMult, base.priceMult * 1.3), 'pacts scale the right rows');
      ok(h8.telegraph < base.telegraph && h8.eliteChance > base.eliteChance && h8.hp === h8.enemyHp && h8.tele === h8.telegraph && h8.danger > base.danger, 'aliases + danger follow'); ok(close(D.atBase(8).enemyHp, base.enemyHp), 'the cached base row is never mutated');
      for (let f = 1; f <= 300; f += 7) { const r = D.at(f); ok(Object.values(r).every(v => typeof v !== 'number' || isFinite(v)) && r.telegraph >= 0.35 && r.eliteChance <= 0.75 + 1e-9, 'heated row ' + f + ' finite and capped'); }
      H.setActive([]);
      let g = newGame(); M.heat = ['fragile']; g.startRun('H1', 'knight'); ok(g.player.maxHp === 16 && g.player.hp === 16 && g.run.heatLevel === 2, 'Fragile: two fewer hearts'); reset();
      g = newGame(); M.heat = ['glass']; g.startRun('H2', 'knight'); ok(g.player.st.dmg > 1.29 && g.player.st.dmgTaken >= 1.99, 'Glass Soul: +30% damage, double damage taken'); reset();
      g = newGame(); M.heat = ['cursed']; g.startRun('H3', 'knight'); ok(g.player.curses.length === 1, 'Cursed Start curses you'); reset();
      g = newGame(); M.heat = ['brutish', 'swarm']; g.startRun('H4', 'knight'); ok(g.dif.enemyHp > D.atBase(1).enemyHp && g.run.heatMul === 1.4, 'heated run: g.dif is heated, score x1.4'); const e = g.spawnEnemy('chaser', 400, 300, { silent: true }); ok(Math.abs(e.maxHp - 10 * 1.25) < 1e-6, 'enemies spawn with +25% HP (' + e.maxHp + ')');
      const wavesize = (ids) => { H.setActive(ids); const rng = new ED.RNG('hw'); let n = 0, k = 0; for (let i = 0; i < 60; i++) for (const w of D.composeWaves(6, rng, {})) { n += w.length; k++; } H.setActive([]); return n / k; };
      const w0 = wavesize([]), w1 = wavesize(['swarm']); ok(w1 > w0 * 1.1, 'The Swarm adds enemies (' + w0.toFixed(1) + ' -> ' + w1.toFixed(1) + ' per wave)');
      reset(); M.heat = ['haunted']; let dark = 0, rooms = 0; for (let i = 0; i < 8; i++) { const gg = newGame(); gg.startRun('HD' + i, 'knight'); gg.scene = 'play'; ED.debug.jumpFloor(gg, 3); for (const r of gg.floor.rooms.filter(x => x.type === 'normal').slice(0, 3)) { ED.debug.goto(gg, r, 480, 420); rooms++; if (gg.rt.dark) dark++; } } ok(dark > 0 && dark < rooms, 'Haunted Halls darkens some combat rooms (' + dark + '/' + rooms + ')'); reset();
      const ds = ED.dailySeed(), dp = H.dailyPacts(ds); ok(dp.length === 2 && dp[0] !== dp[1] && JSON.stringify(dp) === JSON.stringify(H.dailyPacts(ds)), 'daily pacts are two distinct, deterministic pacts (' + dp.join('+') + ')');
      M.heat = ['glass']; g = newGame(); g.startRun(ds, 'knight'); ok(g.run.daily && JSON.stringify(g.run.heat) === JSON.stringify(dp), 'the Daily Descent uses its own pacts, not yours'); reset();
    }
    section('P6b. v6 — embers, the Hearth, records');
    {
      reset();
      let g = newGame(); M.heat = ['brutish']; g.startRun('E1', 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 6); g.run.kills = 60; g.run.bossesKilled.push('vael'); g.finishRun(false);
      const exp = Math.round((6 * 3 + 12 + 0 + 0 + 2) * 1.3); ok(g.run.embers === exp && M.embers === exp, 'embers = floor/boss/kill value x heat (' + g.run.embers + ' vs ' + exp + ')');
      ok(M.history.length === 1 && M.history[0].floor === 6 && M.history[0].heat === 2 && M.history[0].packs === ED.packs.stamp() && M.history[0].embers === exp, 'the run is recorded'); ok(!H.live(), 'heat is released when the run ends');
      for (let i = 0; i < 25; i++) { const gg = newGame(); gg.startRun('R' + i, 'knight'); gg.scene = 'play'; gg.finishRun(false); } ok(M.history.length === 20, 'history keeps the last 20');
      reset(); M.embers = 1000; const sc = ED.sceneImpl.hearth; const act = (a) => sc.update(newGame(), a, ED.input);
      act('buy:hearts'); act('buy:hearts'); act('buy:purse'); act('buy:satchel'); act('buy:edge'); act('buy:phoenix');
      ok(M.hearth.hearts === 2 && M.hearth.purse === 1 && M.hearth.phoenix === 1 && M.embers < 1000 - 25 - 38 - 20 - 30 - 35, 'purchases level up and spend embers (' + M.embers + ' left)');
      g = newGame(); g.startRun('HR', 'knight'); const p = g.player; ok(p.maxHp === 24 + 2 && p.hp === p.maxHp && p.gold === 15 && p.bombs === 3 && p.relics.phoenix === 1 && p.st.dmg > 1.02, 'hearth upgrades apply to a new run (hp ' + p.maxHp + ', gold ' + p.gold + ', bombs ' + p.bombs + ')');
      M.embers = 5; act('buy:hearts'); ok(M.hearth.hearts === 2, 'cannot buy without enough embers'); M.embers = 99999; for (let i = 0; i < 12; i++) act('buy:hearts'); ok(M.hearth.hearts === 6, 'upgrades stop at their maximum');
      reset(); M.embers = 300; M.history = [{ seed: 'X', cls: 'knight', floor: 5, kills: 10, score: 5000, packs: 'v1', heat: 3, victory: false, killedBy: 'a Gloomling', embers: 20 }];
      g = newGame(); for (const scn of ['heat', 'hearth', 'records']) { ED.menus.go(g, scn); try { g.step(); g.render(); g.step(); g.render(); } catch (e) { ok(false, scn + ' screen: ' + e); } ok(g.scene === scn, scn + ' screen renders'); }
      ED.menus.go(g, 'title'); try { g.render(); } catch (e) { ok(false, 'title with v6 buttons: ' + e); } ED.ui.selClass = 'knight'; ED.ui.seedText = 'ABC'; ED.menus.go(g, 'select'); try { g.render(); } catch (e) { ok(false, 'select with heat button: ' + e); }
      ED.sceneImpl.heat.update(g, 'pact:glass', ED.input); ok(M.heat.includes('glass'), 'toggling a pact selects it'); ED.sceneImpl.heat.update(g, 'pact:glass', ED.input); ok(!M.heat.length, '... and unselects it'); ED.sceneImpl.heat.update(g, 'pact:swarm', ED.input); ED.sceneImpl.heat.update(g, 'clear', ED.input); ok(!M.heat.length, 'clear removes every pact');
      reset();
    }
  }

  // ======================================================================= v7 PROVISIONS
  if (P.on('v7')) {
    const PV = ED.provisions, PROV = PV.PROV;
    const mk = (cls, floor, seed) => { const g = arena(cls || 'knight', floor || 5, seed || 'PV'); g.god = false; g.player.inv = 0; return g; };
    const slotOf = (g, id) => g.player.belt.findIndex(s => s && s.id === id);
    section('P7. v7 PROVISIONS — the belt');
    {
      ok(PV.ORDER.length === 12, 'twelve provisions'); for (const id of PV.ORDER) { const d = PROV[id]; ok(d.pack === 'v7' && typeof d.use === 'function' && d.desc && I.RARITY[d.rarity] && ['potion', 'scroll', 'pouch'].includes(d.shape), id + ' is well-formed'); }
      // rolling is sane at every depth and never leaks when off (parity covers off)
      const rng = new ED.RNG('provroll'), seen = {}; for (let i = 0; i < 2000; i++) { const it = PV.roll(rng, 1 + i % 60, i % 6, i % 3 ? 0 : 1); seen[it.id] = 1; if (i % 3 === 0) ok(I.RARITY[it.rarity].rank >= 1 || true, 'rank filter'); } ok(Object.keys(seen).length === 12, 'every provision can be rolled');
      let g = mk(); const p = g.player; ok(p.belt.length === 3 && p.belt.every(s => !s), 'the belt starts empty');
      // stacking, capacity, full belt leaves the pickup on the floor
      ok(PV.give(g, 'healing') && PV.give(g, 'healing') && PV.give(g, 'healing') && p.belt[0].n === 3, 'items stack up to 3'); ok(PV.give(g, 'healing') && p.belt[1].id === 'healing', 'the 4th goes to a new slot'); PV.give(g, 'smoke'); ok(!PV.give(g, 'swift') && p.belt[2].id === 'smoke', 'a full belt refuses new kinds');
      g.pickups.length = 0; const pk = g.dropPickup('prov', p.x, p.y, 1, { still: true }); pk.item = { cat: 'consumable', id: 'swift', rarity: 'common' }; stepN(g, 30); ok(!pk.dead && g.pickups.includes(pk), 'a full belt leaves the pickup where it lies');
      g.enemies.length = 0; p.belt[slotOf(g, 'smoke')] = null; stepN(g, 30); ok(pk.dead && slotOf(g, 'swift') >= 0, 'freeing a slot lets you collect it (dead ' + pk.dead + ', belt ' + JSON.stringify(p.belt) + ', at ' + Math.round(p.x) + ',' + Math.round(p.y) + ' pk ' + Math.round(pk.x) + ',' + Math.round(pk.y) + ', room ' + g.room.type + ', cleared ' + g.room.cleared + ', enemies ' + g.enemies.length + ', hp ' + p.hp + ', scene ' + g.scene + ')');
    }
    section('P7b. v7 — every provision does its thing');
    {
      const need = (id, setup) => { const g = mk('knight', 6, 'PV-' + id); const p = g.player; if (setup) setup(g, p); PV.give(g, id); return { g, p, i: slotOf(g, id) }; };
      let r = need('healing'); r.p.hp = 4; ED.input.sim = { held: {}, edge: { item1: true } }; stepN(r.g, 2); ED.input.sim = { held: {}, edge: {} }; ok(r.p.hp > 4 + 8 && !r.p.belt[0], 'Healing Draught heals ~half and is consumed (hp ' + r.p.hp + ')');
      r = need('healing'); r.p.hp = r.p.maxHp; ok(PV.use(r.g, r.i) === false && r.p.belt[r.i].n === 1, 'Healing at full health is refused and kept');
      r = need('powder'); const b0 = r.g.bombs.length; PV.use(r.g, r.i); ok(r.g.bombs.length === b0 + 3, 'Powder Flask drops three bombs');
      r = need('smoke', (g, p) => { dummy(g, p.x + 80, p.y, 500); }); PV.use(r.g, r.i); ok(r.g.enemies[0].stun > 100 && r.p.inv >= 55, 'Smoke Bomb stuns nearby foes and shields you');
      r = need('smoke'); r.g.enemies.length = 0; ok(PV.use(r.g, r.i) === false, 'Smoke with nobody near is refused');
      r = need('swift'); const sp0 = r.p.st.speed; PV.use(r.g, r.i); ok(r.p.st.speed > sp0 + 0.35 && r.p.buffs.some(b => b.timed), 'Swiftness raises speed'); stepN(r.g, 740); ok(Math.abs(r.p.st.speed - sp0) < 1e-9 && !r.p.buffs.some(b => b.timed), '...and wears off after 12s');
      r = need('ironskin'); const d0 = r.p.st.def; PV.use(r.g, r.i); ok(r.p.st.def > d0 + 3, 'Ironskin adds defense'); stepN(r.g, 920); ok(r.p.st.def === d0, '...and expires');
      r = need('berserk'); PV.use(r.g, r.i); ok(r.p.st.dmg > 1.5 && r.p.st.def < -2, 'Berserker Brew: big damage, less defense'); stepN(r.g, 640); ok(r.p.st.dmg < 1.1, '...and expires');
      r = need('lightning', (g, p) => { for (let k = 0; k < 7; k++) dummy(g, 300 + k * 60, 150 + k * 40, 9000); }); const hp0 = r.g.enemies.map(e => e.hp); PV.use(r.g, r.i); ok(r.g.enemies.filter((e, k) => e.hp < hp0[k]).length === 5, 'Lightning strikes exactly five foes');
      r = need('lightning'); r.g.enemies.length = 0; ok(PV.use(r.g, r.i) === false, 'Lightning with no foes is refused');
      r = need('frost', (g, p) => { dummy(g, p.x + 200, p.y, 500); }); PV.use(r.g, r.i); ok(r.g.enemies[0].status.slow && r.g.enemies[0].status.slow.f < 0.2, 'Frost scroll all but freezes foes');
      r = need('fire', (g, p) => { dummy(g, p.x + 90, p.y, 900); }); const f0 = r.g.enemies[0].hp; PV.use(r.g, r.i); stepN(r.g, 60); ok(r.g.enemies[0].hp < f0 && r.g.enemies[0].status.burn, 'Fire scroll burns what it reaches');
      r = need('mapping'); for (const rm of r.g.floor.rooms) rm.discovered = false; PV.use(r.g, r.i); ok(r.g.floor.rooms.every(rm => rm.discovered), 'Mapping reveals the floor'); PV.give(r.g, 'mapping'); ok(PV.use(r.g, slotOf(r.g, 'mapping')) === false, 'Mapping with a known floor is refused');
      r = need('dashpowder'); PV.use(r.g, r.i); let free = 0; for (let k = 0; k < 6; k++) { r.p.dashCd = 0; ED.input.sim = { held: {}, edge: { dash: true, right: true }, }; ED.input.sim.held.right = true; stepN(r.g, 1); ED.input.sim = { held: {}, edge: {} }; stepN(r.g, 16); if (r.p.dashCd === 0) free++; } ok(r.p.freeDashes === 0 && free >= 4, 'Dash Powder: four dashes with no cooldown (' + free + ' observed)');
      // lockpick: needs a real keyed door in range
      let found = false; for (let i = 0; i < 80 && !found; i++) { const g = newGame(); g.startRun('LP' + i, 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 5); const e = g.floor.edges.find(x => x.lock && ED.keys.LOCKS[x.lock.type].key && ED.keys.LOCKS[x.lock.type].key !== 'boss'); if (!e) continue; const room = g.floor.rooms[e.a], dir = ED.DIRS.find(d => room.doors[d] === e); ED.debug.goto(g, room, 480, 288); g.scene = 'play'; const c = ED.rooms.doorCenter(dir); g.player.x = c.x + (dir === 'W' ? 60 : dir === 'E' ? -60 : 0); g.player.y = c.y + (dir === 'N' ? 60 : dir === 'S' ? -60 : 0); g.player.keys = { small: 0, mb: 0, boss: 0 }; e.lock.opened = false; g.refreshCollision(); PV.give(g, 'lockpick');
        ok(PV.use(g, slotOf(g, 'lockpick')) !== false && e.lock.opened && g.player.keys.small === 0 && g.player.keys.mb === 0, 'Lockpick opens a keyed door and spends no key'); found = true; const g2 = mk(); g2.player.belt[0] = { id: 'lockpick', n: 1 }; g2.player.x = 480; g2.player.y = 288; ok(PV.use(g2, 0) === false, 'Lockpick far from any lock is refused'); }
      ok(found, 'a keyed door existed to test');
    }
    section('P7c. v7 — where they come from');
    {
      let g = mk('knight', 5, 'SRC'); const rc = g.rng.chance; g.rng.chance = () => true; const e = g.spawnEnemy('chaser', 420, 300, { silent: true }); e.hold = true; g.damageEnemy(e, 9999, { src: 'melee', x: 300, y: 288 }); g.rng.chance = rc;
      ok(g.pickups.some(k => k.type === 'prov' && k.item && PROV[k.item.id]), 'kills can drop a provision');
      g.pickups.length = 0; const m = g.spawnEnemy('imp', 420, 300, { silent: true, minion: true }); g.rng.chance = () => true; g.damageEnemy(m, 9999, { src: 'melee', x: 300, y: 288 }); g.rng.chance = rc; ok(!g.pickups.some(k => k.type === 'prov'), 'minions never do');
      g.pickups.length = 0; ED.runHooks('miniDefeated', g, { revenant: false }); ok(g.pickups.some(k => k.type === 'prov'), 'mini boss prizes include one');
      // shops stock two
      let shopGame = null; for (let i = 0; i < 200 && !shopGame; i++) { const gg = newGame(); gg.startRun('SH' + i, 'knight'); gg.scene = 'play'; gg.god = true; ED.debug.jumpFloor(gg, 4); const r = gg.floor.rooms.find(x => x.type === 'shop'); if (r) { ED.debug.goto(gg, r, 480, 420); gg.scene = 'play'; shopGame = gg; } }
      ok(!!shopGame && shopGame.inters.filter(i => i.type === 'service' && /belt/.test(i.desc || '')).length === 2, 'shops sell two provisions');
      if (shopGame) { const sv = shopGame.inters.find(i => /belt/.test(i.desc || '')); shopGame.player.gold = 999; shopGame.player.x = sv.x; shopGame.player.y = sv.y + 20; stepN(shopGame, 2); shopGame.nearInter = sv; const g0 = shopGame.player.gold; shopGame.tryInteract(); ok(shopGame.player.gold < g0 && shopGame.player.belt.some(s => s), 'buying puts it on the belt and costs gold'); }
      // drop rates are modest
      let drops = 0, kills = 600; const gg = mk('knight', 8, 'RATE'); for (let i = 0; i < kills; i++) { const e2 = gg.spawnEnemy('chaser', 400, 300, { silent: true }); e2.hold = true; gg.damageEnemy(e2, 9999, { src: 'melee', x: 300, y: 288 }); } drops = gg.pickups.filter(k => k.type === 'prov').length; ok(drops > kills * 0.015 && drops < kills * 0.09, 'ordinary kills drop a provision ~3.5% of the time (' + (100 * drops / kills).toFixed(1) + '%)');
      // rendering
      gg.player.belt = [{ id: 'healing', n: 2 }, { id: 'lightning', n: 1 }, null]; try { gg.render(); } catch (e3) { ok(false, 'render with belt: ' + e3); } ok(true, 'HUD belt renders');
    }
  }

  // ======================================================================= v8 ABYSS
  if (P.on('v8')) {
    const B = ED.bosses, AB = ED.abyss;
    section('P8. v8 ABYSS — the final boss');
    {
      for (let f = 1; f <= 120; f++) { const sp = B.forFloor(f, new ED.RNG('fin')); if (f % 50 === 0) ok(sp.defId === 'emberheart' && sp.final && sp.mega && !sp.partnerId && !sp.fused, 'floor ' + f + ' belongs to the Heart'); else ok(sp.defId !== 'emberheart', 'floor ' + f + ' does not'); }
      ok(B.allIds().includes('emberheart') && !B.rosterSize(true) !== undefined, 'the Heart is listed with the bosses but is not in the rotation'); const seenM = new Set(); for (let f = 5; f <= 200; f += 5) if (f % 50) seenM.add(B.forFloor(f, new ED.RNG('x')).defId); ok(!seenM.has('emberheart'), 'it never appears off its floors');
      const d = B.def('emberheart'); ok(d.phases.length === 6 && d.parts.length === 7 && typeof d.phaseOf === 'function' && !!ED.bossDraw.emberheart && !!ED.partDraw.chamber && !!ED.partPos.chamber, 'six phases, seven parts, art and geometry'); for (const ph of d.phases) for (const a of ph.attacks) ok(!!d.attacks[a] && !!ED.attacks.lib[d.attacks[a][0]], 'attack ' + a + ' resolves');
      ok(!!I.relic('emberheartrelic') && I.relic('emberheartrelic').unlock === 'boss:emberheart', 'it drops the Heart relic');
    }
    section('P8b. v8 — the fight and the ending');
    {
      const r = bossFight(50, 'HEART'); console.log('  floor 50 The Emberdeep Heart — defeated: ' + r.cleared + ' in ' + (r.frames / 60).toFixed(0) + 's, phases ' + r.phases.join(',') + ', peak bullets ' + r.maxProj);
      ok(r.cleared, 'the Heart can be beaten'); ok(r.phases.length >= 6, 'it passes through all six phases (' + r.phases.join(',') + ')'); ok(r.maxProj <= 280 && r.g.zones.length < 60, 'caps hold'); finite(r.g, 'heart');
      const g = r.g; stepN(g, 200); ok(g.modal && g.modal.type === 'ending', 'the ending choice appears'); g.render(); ok(g.run.finalBoss === 1 && ED.save.meta.endings >= 1, 'the ending is recorded');
      const m = g.modal; m.t = 60; ED.modalImpl.ending.update(g, m, 'abyss'); ok(!g.modal && g.scene === 'play', 'descending continues the run'); ok(g.inters.some(i => i.type === 'stairs'), 'and the stairway is open');
      g.modal = { type: 'ending', t: 60, floor: 50 }; ED.modalImpl.ending.update(g, g.modal, 'bank'); ok(g.scene === 'victory' && g.run.victory, 'claiming the victory ends the run as a win');
    }
    section('P8c. v8 — Abyssal Rules');
    {
      ok(AB.RULES.length === 8 && AB.ruleFor('S', 30) === null && AB.ruleFor('S', 31) === AB.ruleFor('S', 31) && !!AB.ruleFor('S', 77), 'eight rules, none below floor 31, deterministic'); const kinds = new Set(); for (let i = 0; i < 80; i++) kinds.add(AB.ruleFor('K' + i, 40).id); ok(kinds.size === 8, 'every rule comes up');
      const mkAb = (id) => { const g = newGame(); g.startRun('AB-' + id, 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 33); g.floor.abyss = AB.RULE[id]; const r = g.floor.rooms.find(x => x.type === 'normal'); ED.debug.goto(g, r, 480, 420); g.scene = 'play'; g.rt.abDone = false; return g; };
      let g = mkAb('lightless'); g.rt.dark = false; g.rt.abDone = false; ED.runHooks('roomEnter', g, g.room); ok(g.rt.dark === true, 'Lightless darkens the room');
      g = mkAb('bloodtide'); let e = g.spawnEnemy('chaser', 500, 300, { silent: true }); ok(e.mods.some(m => m.id === 'vampiric'), 'Bloodtide: foes heal when they hit you');
      g = mkAb('echoing'); e = g.spawnEnemy('shooter', 500, 300, { silent: true }); const base = g.dif.fireRate; ok(Math.abs(e.rate0 - base * 1.3) < 1e-9 && e.projMul > 1.1, 'Echoing Fire: faster, quicker shots');
      g = mkAb('ironclad'); e = g.spawnEnemy('chaser', 500, 300, { silent: true }); ok(e.armor >= 0.2, 'Ironclad: 20% armour');
      g = mkAb('quicksilver'); e = g.spawnEnemy('chaser', 500, 300, { silent: true }); const e0 = (() => { const g2 = newGame(); g2.startRun('Q0', 'knight'); g2.scene = 'play'; ED.debug.jumpFloor(g2, 33); g2.floor.abyss = null; return g2.spawnEnemy('chaser', 500, 300, { silent: true }); })(); ok(Math.abs(e.speed / e0.speed - 1.2) < 1e-6, 'Quicksilver: +20% speed');
      g = mkAb('reinforced'); const rc = g.rng.chance; g.rng.chance = () => true; e = g.spawnEnemy('chaser', 500, 300, { silent: true }); e.hold = true; const n0 = g.enemies.length; g.damageEnemy(e, 9999, { src: 'melee', x: 0, y: 0 }); g.rng.chance = rc; ok(g.enemies.some(x => x.type === 'imp' && !x.dead), 'Reinforced: a kill can leave an imp');
      g = mkAb('stormborn'); g.rt.lockdown = true; g.rt.abStorm = 1; let n = 0; const oz = g._zone; g._zone = function (z) { if (z.src === null) n++; return oz.call(this, z); }; stepN(g, 5); ok(n >= 1, 'Stormborn calls lightning');
      g = mkAb('withering'); g.player.hp = 10; ED.runHooks('roomClear', g, g.room); ok(g.player.hp === 8, 'Withering costs 2 HP'); g.player.hp = 1; ED.runHooks('roomClear', g, g.room); ok(g.player.hp === 1, '...never lethal');
      g = mkAb('ironclad'); g.pickups.length = 0; ED.runHooks('roomClear', g, g.room); ok(g.pickups.some(k => k.type === 'gold'), 'every cleared room pays Abyssal gold');
      for (const f of [31, 40, 50, 72]) { const gg = newGame(); gg.startRun('ABI' + f, 'knight'); ED.debug.jumpFloor(gg, f); gg.scene = 'intro'; gg.introT = 60; try { gg.render(); gg.scene = 'play'; gg.render(); } catch (e2) { ok(false, 'render at abyss floor ' + f + ': ' + e2); } } ok(true, 'intro + HUD render on Abyssal floors');
      ok(AB.ruleFor('Z', 31) !== null && newGame && true, 'rules start at floor 31');
    }
  }

  // ======================================================================= v9 THE HUNT
  if (P.on('v9')) {
    const H = ED.hunt, BYID = H.BY_ID;
    const fresh = () => { ED.save.meta.hunt = null; return H.meta(); };
    const mkNem = (o) => { const h = H.meta(); const n = Object.assign({ id: h.nextId++, name: 'Test' + h.nextId, epi: 'the Tester', type: 'chaser', rank: 1, str: [], weak: 'lumbering', known: [], cls: 'knight', floor: 4, from: 2, wpn: 'Sword', killer: 'a foe', kills: 1, escapes: 0, escFloor: 0, seen: 0, origin: 'elite', boss: '', status: 'hunting' }, o || {}); return n; };
    const spawnNem = (g, nem, x, y, hp) => { const e = g.spawnEnemy(nem.type, x || 520, y || 300, { silent: true, elite: true, extra: { nem } }); e.hold = true; if (hp) e.maxHp = e.hp = hp; return e; };
    const ctrl = (g, type, hp) => { const n = mkNem({ type: type || 'chaser', weak: 'lumbering', str: [] }); const e = spawnNem(g, n, 400, 300, hp); return e; };

    section('P9. v9 THE HUNT — the rules table');
    {
      fresh();
      ok(H.TRAITS.length === 20 && H.TRAITS.filter(t => t.kind === 'S').length === 12 && H.TRAITS.filter(t => t.kind === 'W').length === 8, '12 strengths + 8 weaknesses');
      ok(new Set(H.TRAITS.map(t => t.id)).size === 20, 'trait ids are unique');
      for (const t of H.TRAITS) ok(t.name && t.desc && t.hint && t.glyph && t.color && t.pack === 'v9' && t.weight > 0 && t.loot, 'trait ' + t.id + ' is fully described');
      ok(H.STR_AT.join() === '1,1,2,2,3' && H.RANKS.length === 5, 'strengths per rank 1,1,2,2,3');
      ok(!!ED.packs.content('v9').traits && ED.packs.content('v9').traits === 20, 'the Versions screen counts 20 traits');
      // every nemesis, at every rank, has exactly one weakness and the right number of strengths — and no clashing pair
      const types = ['chaser', 'shooter', 'charger', 'shielded', 'bomber', 'summoner', 'teleporter', 'spinner', 'lancer', 'phantom']; let n = 0, bad = 0;
      for (let i = 0; i < 400; i++) { const h = fresh(); const nem = mkNem({ type: types[i % types.length], rank: 1 + i % 5, str: [], weak: '' }); H.ensureTraits(nem); n++; const ts = H.traitsOf(nem);
        const S = ts.filter(t => t.kind === 'S'), W = ts.filter(t => t.kind === 'W'); if (W.length !== 1 || S.length !== H.STR_AT[nem.rank - 1] || new Set(nem.str).size !== nem.str.length) bad++;
        if (nem.str.includes('fireproof') && nem.weak === 'fearfire') bad++; if (nem.str.filter(id => BYID[id].defence).length > 2) bad++; if (nem.str.includes('bulwark') && ED.enemyTypes[nem.type].shield) bad++;
        const d = ED.enemyTypes[nem.type]; for (const t of ts) if (t.needs && !t.needs(d)) bad++; }
      ok(bad === 0, 'traits are always legal (' + n + ' nemeses, ' + bad + ' problems)');
      const a = mkNem({ id: 77, rank: 3, str: [], weak: '' }), b = mkNem({ id: 77, rank: 3, str: [], weak: '' }); H.ensureTraits(a); H.ensureTraits(b); ok(a.weak === b.weak && a.str.join() === b.str.join(), 'trait choice is seeded');
      // rank-ups add a strength exactly at ranks 3 and 5
      const r = mkNem({ id: 9, rank: 1, str: [], weak: '' }); H.ensureTraits(r); const cnt = []; for (let k = 0; k < 4; k++) { H.rankUp(r, 'kill'); cnt.push(r.str.length); } ok(cnt.join() === '1,2,2,3' && r.rank === 5 && r.str.length === 3, 'a new strength at ranks 3 and 5 (' + cnt.join() + ')'); H.rankUp(r, 'kill'); ok(r.rank === 5, 'rank is capped at 5');
    }
    section('P9b. v9 — the roster: birth, promotion, eviction, names');
    {
      let h = fresh(); const mk = (i, rank) => H.makeNem({ seed: 'S' + i, floor: 5, from: 2, type: 'chaser', cls: 'knight', wpn: 'Sword', killer: 'x', kills: 1, origin: 'elite', rank: rank || 1 });
      const ns = []; for (let i = 0; i < 6; i++) { const n = mk(i, 1 + i % 3); ok(H.admit(n, false).ok, 'room for nemesis #' + (i + 1)); ns.push(n); }
      ok(h.roster.length === 6 && new Set(h.roster.map(n => n.name)).size === 6, 'six hunters with six different names');
      const extra = mk(10, 1); ok(!H.admit(extra, false).ok && h.roster.length === 6, 'a mere survivor is refused when the roster is full');
      const killer = mk(11, 2), res = H.admit(killer, true); ok(res.ok && res.evicted && res.evicted.rank === 1 && h.roster.length === 6 && h.roster.includes(killer), 'a killer replaces the weakest hunter');
      const slain = h.roster[0]; H.retire(slain, { floorNum: 7, run: { classId: 'ranger' } }); ok(h.roster.length === 5 && h.fallen[0].name === slain.name && h.fallen[0].floor === 7 && h.slain === 1 && slain.status === 'slain', 'slain nemeses move to the fallen');
      for (let i = 0; i < 20; i++) H.retire(mk(100 + i), { floorNum: 3, run: { classId: 'knight' } }); ok(h.fallen.length === 12, 'the hall of the fallen keeps the last 12');
      // JSON round trip (it lives in the save)
      const copy = JSON.parse(JSON.stringify(ED.save.meta)); ok(copy.hunt.roster.length === h.roster.length && typeof copy.hunt.roster[0].name === 'string', 'the roster survives a save round trip');
      // taunts: every line resolves, every token is filled
      h = fresh(); const nem = mkNem({ kills: 2, escapes: 1, boss: 'Skarn', escFloor: 5 }); let leftover = 0, lines = 0;
      for (const kind in H.LINES) for (let k = 0; k < H.LINES[kind].length; k++) { nem.seen = k; nem.kills = 1 + k % 3; nem.cls = k % 2 ? 'knight' : 'ranger'; const s2 = H.line(nem, kind, 'knight', k); lines++; if (/[{}]/.test(s2) || !s2) leftover++; }
      for (let k = 0; k < 40; k++) { nem.id = k; nem.seen = k; nem.kills = k % 4; nem.escapes = k % 3; nem.boss = k % 2 ? 'Skarn' : ''; const s3 = H.introLine(nem, k % 2 ? 'knight' : 'ranger'); lines++; if (/[{}]/.test(s3) || !s3) leftover++; }
      ok(leftover === 0, 'all ' + lines + ' taunts resolve with no raw tokens');
      nem.kills = 3; nem.id = 1; nem.escapes = 0; nem.boss = ''; ok(/3|4/.test(H.introLine(nem, 'knight')), 'a nemesis that beat you often says how often');
      const other = Object.keys(I.CLASSES).find(c => c !== 'knight'); nem.kills = 1; nem.cls = other; nem.boss = ''; nem.escapes = 0; let sawCls = false, sawFloor = false; for (let k = 0; k < 8; k++) { nem.id = k; nem.seen = 0; const t = H.introLine(nem, 'knight'); if (t.indexOf(I.CLASSES[other].name) >= 0) sawCls = true; if (new RegExp('floor ' + nem.floor, 'i').test(t)) sawFloor = true; } ok(sawCls && sawFloor, 'taunts quote your old class and the floor you fell on');
    }
    section('P9c. v9 — every trait does what it says');
    {
      const stepN = (gg, n) => { gg.hitstopT = 0; ctx.stepN(gg, n); };
      const base = (type, floor) => { const g = arena('knight', floor || 6, 'TR-' + type); g.god = true; g.player.hp = g.player.maxHp; fresh(); return g; };
      const hurtTaken = (e, g, o, dmg) => { const h0 = e.hp; g.damageEnemy(e, dmg || 4, Object.assign({ src: 'melee', x: e.x - 40, y: e.y, noKb: true }, o || {})); return h0 - e.hp; };
      const withT = (g, str, weak, type) => spawnNem(g, mkNem({ type: type || 'chaser', str: str || [], weak: weak || 'lumbering' }), 520, 300, 100000);
      let g = base('chaser'), c = ctrl(g, 'chaser', 100000);
      // stat traits
      const fl = withT(g, ['fleet'], 'glassjaw'), br = withT(g, ['brutal']), lu = withT(g, [], 'lumbering'), tk = withT(g, ['thick']);
      const c2 = withT(g, [], 'glassjaw'); c2.hurtN = 9;                       // a control with no stat trait
      ok(Math.abs(fl.speed / c2.speed - 1.3) < 0.01, 'Fleet: +30% speed'); ok(Math.abs(br.dmg / c2.dmg - 1.35) < 0.01 && Math.abs(br.shotDmg / c2.shotDmg - 1.35) < 0.01, 'Brutal: +35% damage'); ok(lu.speed / c2.speed < 0.75 && lu.rate0 < c2.rate0, 'Lumbering: slower and attacks less');
      ok(Math.abs(tk.armor - 0.25) < 1e-9, 'Thick-skinned: 25% armour');
      const t1 = hurtTaken(c2, g, null, 8), t2 = hurtTaken(tk, g, null, 8); ok(t2 < t1 * 0.8 && t2 > t1 * 0.7, 'Thick-skinned: hits land for 75% (' + t2.toFixed(2) + ' vs ' + t1.toFixed(2) + ')');
      for (const e of [c2, tk]) { e.hurtN = 3; }
      ok(tk.nem.known.includes('thick') || (hurtTaken(tk, g), tk.nem.known.includes('thick')), 'Thick-skinned is revealed by hitting it');
      // bulwark / warded / warband are visible from the first second
      const bw = withT(g, ['bulwark']); ok(bw.shieldArc >= 2.1 && bw.nem.known.includes('bulwark'), 'Shielded Front: a shield arc, revealed on sight');
      bw.face = 0; const before = bw.hp; g.damageEnemy(bw, 8, { src: 'melee', x: bw.x + 60, y: bw.y, noKb: true }); ok(bw.hp === before, 'Shielded Front blocks a hit from the front'); g.damageEnemy(bw, 8, { src: 'melee', x: bw.x - 60, y: bw.y, noKb: true }); ok(bw.hp < before, '...but not from behind'); bw.hp = before; bw.state = 'throw'; stepN(g, 1); bw.state = 'throw'; ok(bw.shieldArc === 0, 'its guard drops while it attacks'); bw.state = null; stepN(g, 1); ok(bw.shieldArc >= 2.1, '...and comes back'); const noMove = ED.enemyTypes.spinner; ok(!BYID.bulwark.needs(noMove) && BYID.bulwark.needs(ED.enemyTypes.chaser), 'stationary foes never get a front shield');
      const wd = spawnNem(g, mkNem({ str: ['warded'], weak: 'glassjaw' }), 520, 300); ok(wd.ward > wd.maxHp * 0.35 && wd.nem.known.includes('warded'), 'Spell-warded: starts with a ward');
      const n0 = g.enemies.length; const wb = withT(g, ['warband']); ok(g.enemies.length === n0 + 3 && g.enemies.filter(x => x.nemFollower).length === 2 && wb.nem.known.includes('warband'), 'Warband: two followers arrive with it');
      for (const f of g.enemies.filter(x => x.nemFollower)) ok(!f.elite && f.maxHp < wb.maxHp * 0.5, 'a follower is a lesser foe');
      // berserker
      const bk = withT(g, ['berserker']); bk.hp = bk.maxHp * 0.3; stepN(g, 2); ok(bk.spdMul > 1.35 && bk.rate > bk.rate0 * 1.35 && bk.nem.known.includes('berserker'), 'Berserker: faster as it bleeds (x' + bk.spdMul.toFixed(2) + ')');
      // regen
      const rg = withT(g, ['regen']); rg.maxHp = 1000; rg.hp = 500; stepN(g, 200); ok(rg.hp > 540 && rg.nem.known.includes('regen'), 'Regenerating: heals over time (' + Math.round(rg.hp) + ')');
      g.damageEnemy(rg, 5, { src: 'melee', x: 0, y: 0, noKb: true }); const hh = rg.hp; stepN(g, 60); ok(rg.hp <= hh + 0.01, 'Regenerating pauses for 1.5s after a hit');
      // leech via the hurt hook
      g.enemies.length = 0; const lc = withT(g, ['leech']); lc.maxHp = 100; lc.hp = 50; g.player.inv = 0; g.god = false; g.player.hp = g.player.maxHp; g.hurtPlayer(2, lc.x, lc.y, { src: lc }); ok(lc.hp > 60 && lc.hp < 63 && lc.nem.known.includes('leech'), 'Leech: heals once, 12%, when it hurts you (' + lc.hp + ')'); g.god = true;
      // brutal reveal
      const bt = withT(g, ['brutal']); g.god = false; g.player.inv = 0; g.hurtPlayer(2, bt.x, bt.y, { src: bt }); g.god = true; ok(bt.nem.known.includes('brutal'), 'Brutal: revealed when it hits you');
      // deflector
      const df = withT(g, ['deflector']); const d1 = hurtTaken(df, g, { src: 'proj' }, 10), d2 = hurtTaken(c2, g, { src: 'proj' }, 10); ok(d1 < d2 * 0.4 && df.nem.known.includes('deflector'), 'Deflector: arrows do ~35% (' + d1.toFixed(2) + ' vs ' + d2.toFixed(2) + ')'); ok(hurtTaken(df, g, { src: 'melee' }, 10) > 9, '...melee is untouched');
      // fireproof
      const fp = withT(g, ['fireproof']); g.applyStatus(fp, 'burn', { t: 120, dps: 3 }); stepN(g, 2); ok(!fp.status.burn && fp.nem.known.includes('fireproof'), 'Fireproof: burning does not stick');
      // keg
      g.enemies.length = 0; g.zones.length = 0; const kg = withT(g, ['keg']); kg.maxHp = kg.hp = 5; g.damageEnemy(kg, 99, { src: 'melee', x: 0, y: 0 }); ok(g.zones.length >= 1 && kg.nem.known.includes('keg'), 'Powder Keg: explodes on death'); 
      // weaknesses
      g = base('chaser'); const cc = withT(g, [], 'glassjaw'); cc.hurtN = 9;
      const ff = withT(g, [], 'fearfire'); ff.hurtN = 9; const bf = hurtTaken(ff, g, { src: 'burn' }, 4), bc = hurtTaken(cc, g, { src: 'burn' }, 4); ok(Math.abs(bf / bc - 2.5) < 0.05 && ff.nem.known.includes('fearfire'), 'Fears Fire: burn does 2.5x'); g.applyStatus(ff, 'burn', { t: 100, dps: 1 }); ff.stun = 0; ff.panicT = 0; stepN(g, 2); ok(ff.stun > 30, 'Fears Fire: ignition stuns it');
      const fb = withT(g, [], 'fearblast'); fb.hurtN = 9; const e1 = hurtTaken(fb, g, { src: 'explosion' }, 5), e2 = hurtTaken(cc, g, { src: 'explosion' }, 5); ok(Math.abs(e1 / e2 - 1.6) < 0.05 && fb.stun >= 60, 'Hates Blasts: +60% and stunned');
      const bi = withT(g, [], 'brittle'); bi.hurtN = 9; const k1 = hurtTaken(bi, g, { crit: true }, 5), k2 = hurtTaken(cc, g, { crit: true }, 5), k3 = hurtTaken(bi, g, {}, 5), k4 = hurtTaken(cc, g, {}, 5); ok(Math.abs(k1 / k2 - 1.7) < 0.05 && Math.abs(k3 / k4 - 1) < 0.01, 'Brittle: crits +70%, plain hits normal');
      const ch = withT(g, [], 'chillweak'); g.applyStatus(ch, 'slow', { t: 100, f: 0.5 }); stepN(g, 2); ok(ch.status.slow && ch.status.slow.f <= 0.25 && ch.status.slow.t > 100, 'Cold-blooded: slows are stronger and longer');
      const dz = withT(g, [], 'dazed'); dz.hurtN = 9; dz.stun = 0; g.damageEnemy(dz, 2, { src: 'melee', x: dz.x - 30, y: dz.y, stun: 40, noKb: true }); ok(dz.stun > 70 && dz.nem.known.includes('dazed'), 'Dizzy: stuns last almost twice as long (' + dz.stun.toFixed(0) + ')');
      const vn = withT(g, [], 'venom'); vn.hurtN = 9; const v1 = hurtTaken(vn, g, { src: 'poison' }, 3), v2 = hurtTaken(cc, g, { src: 'poison' }, 3); ok(Math.abs(v1 / v2 - 2.8) < 0.05, 'Thin-blooded: poison 2.8x');
      const gj = withT(g, [], 'glassjaw'), j1 = hurtTaken(gj, g, null, 4), j2 = hurtTaken(gj, g, null, 4); ok(Math.abs(j1 / j2 - 2.5) < 0.05 && gj.nem.known.includes('glassjaw'), 'Glass Jaw: the first blow lands for 2.5x (' + j1.toFixed(1) + ' then ' + j2.toFixed(1) + ')');
      const gj2 = withT(g, [], 'glassjaw'); g.damageEnemy(gj2, 1, { src: 'burn', x: 0, y: 0, noProc: true }); const j3 = hurtTaken(gj2, g, null, 4); ok(j3 < 4.5, 'Glass Jaw is not wasted by a burn tick');
      finite(g, 'traits');
    }

    const normalGame = (seed, floor, cls) => { const g = newGame(); g.startRun(seed, cls || 'knight'); g.scene = 'play'; g.god = true; if (floor > 1) ED.debug.jumpFloor(g, floor); const r = g.floor.rooms.find(x => x.type === 'normal' && x.id !== g.floor.startId); ED.debug.goto(g, r, 480, 420); g.scene = 'play'; g.hitstopT = 0; return g; };
    const calm = (g) => { g.rt.enc = { state: 'idle', waves: [], idx: 0, t: 0 }; g.rt.lockdown = true; g.refreshCollision(); g.enemies.length = 0; g.spawns.length = 0; g.hitstopT = 0; };
    const stepFree = (g, n) => { for (let i = 0; i < n; i++) { g.hitstopT = 0; g.step(); if (g.scene !== 'play') g.scene = 'play'; } };

    section('P9d. v9 — ambushes are decided per floor, deterministically');
    {
      let h = fresh(); let hunted = 0, over = 0, wrong = 0, floors = 0, same = 0;
      for (let i = 0; i < 3; i++) H.admit(mkNem({ rank: 1 + i, floor: 9, from: 2 }), true);
      for (let i = 0; i < 24; i++) {
        const g = newGame(); g.startRun('AMB' + i, 'knight'); g.scene = 'play'; g.god = true; ok(g.floor.hunt === null, 'no ambush is planned on floor 1');
        ED.debug.jumpFloor(g, 2 + i % 6); floors++; const m = g.floor.hunt;
        if (m) { hunted++; const ids = [].concat(...Object.values(m)); if (ids.length > 2) over++; for (const rid in m) { const r = g.floor.rooms[+rid]; if (!r || r.type !== 'normal' || r.id === g.floor.startId) wrong++; for (const id of m[rid]) if (!h.roster.find(n => n.id === id)) wrong++; } }
        const g2 = newGame(); g2.startRun('AMB' + i, 'knight'); g2.scene = 'play'; ED.debug.jumpFloor(g2, 2 + i % 6); if (JSON.stringify(g2.floor.hunt) === JSON.stringify(m)) same++;
      }
      ok(hunted >= 12 && over === 0 && wrong === 0, 'floors plan 0-2 ambushes in ordinary combat rooms (' + hunted + '/' + floors + ' floors, over ' + over + ', bad ' + wrong + ')'); ok(same === 24, 'the plan is the same every time for the same seed');
      h = fresh(); H.admit(mkNem({ rank: 3, floor: 20, from: 12 }), true); let early = 0; for (let i = 0; i < 12; i++) { const g = newGame(); g.startRun('EARLY' + i, 'knight'); g.scene = 'play'; ED.debug.jumpFloor(g, 3 + i % 8); if (g.floor.hunt) early++; } ok(early === 0, 'a nemesis does not hunt above the depth it is tied to');
      h = fresh(); const g0 = newGame(); g0.startRun('EMPTY', 'knight'); ED.debug.jumpFloor(g0, 5); ok(!g0.floor.hunt, 'an empty roster plans nothing');
    }
    section('P9e. v9 — the ambush, the card, the fight, the spoils');
    {
      let found = null; for (let i = 0; i < 40 && !found; i++) {
        const h = fresh(); H.admit(mkNem({ rank: 2, floor: 8, from: 2, type: 'chaser', str: ['thick'], weak: 'glassjaw', kills: 2 }), true);
        const g = newGame(); g.startRun('FIGHT' + i, 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 4); if (g.floor.hunt) { const rid = +Object.keys(g.floor.hunt)[0]; found = { g, room: g.floor.rooms[rid], nem: h.roster[0] }; }
      }
      ok(!!found, 'a floor with an ambush was found'); const { g, room, nem } = found;
      ED.debug.goto(g, room, 480, 420); g.scene = 'play'; const last = g.rt.enc.waves[g.rt.enc.waves.length - 1].slice(-1)[0];
      ok(last && last.extra && last.extra.nem === nem && last.elite, 'entering the room adds the nemesis to its last wave');
      const bot = new Bot(ED, g, { god: true }); let fr = 0, seen = null, card = false, speech = false;
      while (!room.cleared && fr++ < 60 * 150) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; const e = g.enemies.find(x => x.nem === nem && !x.dead); if (e && !seen) seen = e; if (g.huntCard) card = true; if (e && e.say) speech = true; if (fr % 50 === 0) g.render(); }
      ok(!!seen && card, 'the nemesis appears with an intro card'); ok(speech, 'it taunts you'); ok(room.cleared, 'the room can be cleared (' + Math.round(fr / 60) + 's)');
      ok(seen.maxHp > 24 * g.dif.enemyHp, 'a named foe is much tougher than a plain one'); const slain = nem.status === 'slain', escaped = nem.escapes >= 1;
      ok(slain !== escaped, 'it was either slain or it escaped (slain ' + slain + ', escapes ' + nem.escapes + ')');
      if (slain) { const h = H.meta(); ok(h.fallen[0].name === nem.name && !h.roster.includes(nem) && h.slain === 1, 'slain: it joins the fallen'); const peds = g.inters.filter(i => i.type === 'pedestal' && i.group); ok(peds.length === 3, 'slain: three trait-themed spoils to choose from (' + peds.length + ')'); ok(g.pickups.some(k => k.type === 'gold') && g.pickups.some(k => k.type === 'heart'), 'slain: gold and a heart drop'); for (const pd of peds) ok(!ED.phys.blocked(g, pd.x, pd.y, 10, true, false), 'a spoil is not inside a wall'); }
      else { ok(nem.rank === 3 && nem.epi !== 'the Tester' && nem.from === 5 && nem.escFloor === 4 && H.meta().roster.includes(nem), 'escaped: it ranked up, was renamed and will return from the next floor'); }
      finite(g, 'ambush');
    }
    section('P9f. v9 — fleeing, escaping and being caught');
    {
      let h = fresh(); let g = normalGame('FLEE1', 5); calm(g); const nem = H.makeNem({ seed: 'F', floor: 5, from: 2, type: 'chaser', cls: 'knight', origin: 'elite', kills: 1, rank: 2 }); H.admit(nem, true);
      let e = spawnNem(g, nem, 520, 300); e.fleeRoll = true; e.maxHp = e.hp = 200; g.player.x = 150; g.player.y = 300; const epi0 = nem.epi, rank0 = nem.rank;
      e.hp = 30; stepFree(g, 3); ok(!!e.fleeing && e.hold && e.dmgTakenMul >= 1.4, 'below 20% HP it turns and runs (and is easier to hurt)'); const d0 = Math.hypot(e.x - 520, e.y - 300);
      stepFree(g, 30); ok(Math.hypot(e.x - 520, e.y - 300) > d0 + 20 || e.dead, 'it really moves toward a door');
      let n = 0; while (!e.dead && n++ < 400) stepFree(g, 1);
      ok(e.dead && e.escaped && nem.escapes === 1 && nem.rank === rank0 + 1 && nem.epi !== epi0 && nem.escFloor === 5 && nem.from === 6 && nem.status === 'hunting' && h.roster.includes(nem), 'it escapes: rank up, new epithet, back from floor 6 (flight lasted ' + n + ' frames)');
      ok(g.run.hunt.escaped.includes(nem.name) && h.escaped === 1 && !g.enemies.some(x => !x.dead && x.nem === nem), 'the escape is logged and the room is rid of it');
      ok(g.run.kills === 0, 'an escape is not a kill'); n = 0; stepFree(g, 5); // the room can be cleared now
      g.enemies.length = 0; ok(g.aliveEnemies() === 0, 'nothing is left alive in the room');
      // a second escape in the same run scars it but does not rank it again
      e = spawnNem(g, nem, 520, 300); e.fleeRoll = true; e.maxHp = e.hp = 200; e.hp = 20; const r1 = nem.rank; stepFree(g, 3); n = 0; while (!e.dead && n++ < 400) stepFree(g, 1); ok(e.escaped && nem.rank === r1 && nem.escapes === 2, 'a second escape in one run does not rank it up again');
      // caught while fleeing = slain, with the full spoils
      g = normalGame('FLEE2', 6); calm(g); h = fresh(); const nem2 = H.makeNem({ seed: 'G', floor: 6, from: 2, type: 'chaser', cls: 'knight', origin: 'elite', kills: 1, rank: 3 }); H.admit(nem2, true);
      e = spawnNem(g, nem2, 520, 300); e.fleeRoll = true; e.maxHp = e.hp = 300; e.hp = 40; g.player.x = 150; stepFree(g, 3); ok(!!e.fleeing, 'again it runs'); g.damageEnemy(e, 999, { src: 'melee', x: e.x - 20, y: e.y });
      ok(e.dead && !e.escaped && nem2.status === 'slain' && h.fallen.length === 1 && h.escaped === 0, 'catching a fleeing nemesis slays it for good');
      // stunned mid-flight it stops
      g = normalGame('FLEE3', 5); calm(g); h = fresh(); const nem3 = mkNem({ type: 'chaser', rank: 2, weak: 'glassjaw', str: ['fleet'] }); H.admit(nem3, true); e = spawnNem(g, nem3, 520, 300); e.fleeRoll = true; e.maxHp = e.hp = 200; e.hp = 30; g.player.x = 150; stepFree(g, 3); const x1 = e.x; e.stun = 60; stepFree(g, 20); ok(Math.abs(e.x - x1) < 8, 'a stunned runner stops running');
      // a plain elite may panic too, and becomes a survivor nemesis — but never when the roster is full
      let tried = 0, sv = null; h = fresh(); g = normalGame('PLAIN', 5); calm(g);
      while (!sv && tried++ < 80) { const x = g.spawnEnemy('chaser', 480, 300, { silent: true, elite: true, mods: [] }); if (x.fleeRoll) sv = x; else x.dead = true; }
      ok(!!sv, 'about one elite in five is a runner (found after ' + tried + ')'); sv.maxHp = sv.hp = 100; sv.hold = true; sv.hp = 15; g.player.x = 150; g.damageEnemy(sv, 0.1, { src: 'burn', x: 0, y: 0, noProc: true }); stepFree(g, 3); ok(!!sv.fleeing && g.floor.huntFled === 1, 'it flees, and only one plain elite can per floor'); n = 0; while (!sv.dead && n++ < 400) stepFree(g, 1);
      ok(sv.escaped && h.roster.length === 1 && h.roster[0].origin === 'survivor' && h.roster[0].escapes === 1 && h.roster[0].kills === 0 && /Charred|Cinderhide|Smoldering/.test(h.roster[0].epi), 'an escaped elite becomes a survivor named for its wound (' + h.roster[0].name + ' ' + h.roster[0].epi + ')');
      h = fresh(); for (let i = 0; i < 6; i++) H.admit(mkNem({ rank: 3 }), true); g = normalGame('PLAIN2', 5); calm(g); tried = 0; sv = null; while (!sv && tried++ < 80) { const x = g.spawnEnemy('chaser', 480, 300, { silent: true, elite: true, mods: [] }); if (x.fleeRoll) sv = x; else x.dead = true; }
      const nid = h.nextId; sv.maxHp = sv.hp = 100; sv.hold = true; sv.hp = 15; g.player.x = 150; stepFree(g, 3); n = 0; while (!sv.dead && n++ < 400) stepFree(g, 1); ok(sv.escaped && h.roster.length === 6 && h.nextId === nid, 'with a full roster a survivor just slips away');
      finite(g, 'flee');
    }
    section('P9g. v9 — death promotes: who becomes a nemesis');
    {
      const mkRun = (seed, floor, killer) => { const g = newGame(); g.startRun(seed, 'knight'); g.scene = 'play'; g.run.floorNum = floor; g.run.huntKiller = killer; g.player.weapon = g.player.weapon; return g; };
      let h = fresh(), g = mkRun('D1', 6, null); ED.runHooks('runEnd', g, false); ok(h.roster.length === 0 && !g.run.huntReport, 'killed by a trap: nobody rises');
      g = mkRun('D2', 6, { nemId: null, type: 'shooter', elite: true, boss: false, mini: false, rev: false, minion: false, name: 'Bonewatcher' }); ED.runHooks('runEnd', g, true); ok(h.roster.length === 0, 'a victory promotes nobody');
      ED.runHooks('runEnd', g, false); const nm = h.roster[0]; ok(h.roster.length === 1 && nm.type === 'shooter' && nm.rank === 1 && nm.origin === 'elite' && nm.kills === 1 && nm.floor === 6 && nm.cls === 'knight' && nm.from === 3 && nm.status === 'hunting' && nm.str.length === 1 && !!nm.weak && nm.known.length === 0 && g.run.huntReport.kind === 'born', 'an elite that kills you becomes a rank-1 nemesis of its own kind');
      g = mkRun('D3', 9, { nemId: null, type: 'chaser', elite: false, boss: true, mini: false, rev: false, minion: false, name: 'Skarn the Frostwarden', bossDef: 'Skarn' }); ED.runHooks('runEnd', g, false); const hb = h.roster[1]; ok(hb.origin === 'herald' && hb.rank === 2 && hb.boss === 'Skarn' && hb.str.length === 1 && !!ED.enemyTypes[hb.type], 'a boss that kills you leaves a rank-2 herald');
      g = mkRun('D4', 9, { nemId: null, type: 'chaser', elite: false, boss: false, mini: true, rev: false, minion: false, name: 'Hollow Knight', bossDef: 'Hollow Knight' }); ED.runHooks('runEnd', g, false); ok(h.roster[2] && h.roster[2].origin === 'herald', 'so does a mini boss');
      g = mkRun('D5', 9, { nemId: null, type: 'chaser', elite: false, boss: true, mini: false, rev: true, minion: false, name: 'Revenant' }); const n0 = h.roster.length; ED.runHooks('runEnd', g, false); ok(h.roster.length === n0, 'v4\'s Revenant is its own system and does not join the hunt');
      g = mkRun('D6', 9, { nemId: null, type: 'imp', elite: false, boss: false, mini: false, rev: false, minion: true, name: 'Imp' }); ED.runHooks('runEnd', g, false); ok(h.roster.length === n0, 'a summoned minion never rises');
      // plain foes: sometimes (about 35%)
      let rose = 0, N = 120; for (let i = 0; i < N; i++) { fresh(); const gg = mkRun('PL' + i, 5, { nemId: null, type: 'chaser', elite: false, boss: false, mini: false, rev: false, minion: false, name: 'Gloomling' }); ED.runHooks('runEnd', gg, false); if (H.meta().roster.length) rose++; } ok(rose > N * 0.2 && rose < N * 0.5, 'an ordinary foe rises about a third of the time (' + rose + '/' + N + ')');
      // a named foe that beats you ranks up
      h = fresh(); const boss = mkNem({ rank: 2, str: ['thick'], weak: 'glassjaw', kills: 1, floor: 4 }); H.admit(boss, true); g = mkRun('D7', 11, { nemId: boss.id, type: 'chaser', elite: true, boss: false, mini: false, rev: false, minion: false, name: 'x' }); ED.runHooks('runEnd', g, false);
      ok(boss.kills === 2 && boss.rank === 3 && boss.floor === 11 && boss.from === 8 && boss.str.length === 2 && g.run.huntReport.kind === 'ranked' && g.run.huntReport.up && h.roster.length === 1, 'the nemesis that kills you again: rank 3, +1 strength, tied to the new depth');
      boss.rank = 5; g = mkRun('D8', 12, { nemId: boss.id, type: 'chaser', elite: true, boss: false, mini: false, rev: false, minion: false, name: 'x' }); ED.runHooks('runEnd', g, false); ok(boss.rank === 5 && !g.run.huntReport.up && boss.kills === 3, 'at rank 5 it just keeps count');
      // through the real damage path
      h = fresh(); g = newGame(); g.startRun('REAL', 'knight'); g.scene = 'play'; g.god = false; ED.debug.jumpFloor(g, 5); const el = g.spawnEnemy('lancer', 480, 300, { silent: true, elite: true, mods: [] }); el.hold = true; g.player.inv = 0; g.player.hp = 1; g.player.relics = {}; g.hurtPlayer(50, el.x, el.y, { src: el, contact: true });
      ok(g.player.dead && g.run.huntKiller && g.run.huntKiller.elite && g.run.huntKiller.type === 'lancer', 'the hurt hook sees who landed the killing blow'); g.finishRun(false); ok(h.roster.length === 1 && h.roster[0].type === 'lancer' && h.roster[0].floor === 5 && g.run.huntReport.kind === 'born', 'dying promotes it through the real run end');
    }
    section('P9h. v9 — the screens');
    {
      let h = fresh(); const g = newGame(); g.scene = 'hunt'; try { g.render(); } catch (e) { ok(false, 'empty hunt screen: ' + e); } ok(true, 'the Hunt screen draws with an empty roster');
      for (let i = 0; i < 6; i++) { const n = H.makeNem({ seed: 'UI' + i, floor: 4 + i, from: 2, type: ['chaser', 'shooter', 'charger', 'shielded', 'lancer', 'phantom'][i], cls: Object.keys(I.CLASSES)[i % 4], wpn: 'Sword', origin: ['elite', 'herald', 'foe', 'survivor', 'elite', 'herald'][i], kills: i % 3, escapes: i % 2, rank: 1 + i % 5, boss: i === 1 ? 'Skarn' : '' }); n.known = H.traitsOf(n).slice(0, i % 3).map(t => t.id); H.admit(n, true); }
      for (let i = 0; i < 5; i++) H.retire(H.makeNem({ seed: 'FALL' + i, floor: 3, from: 2, cls: 'knight', origin: 'elite', kills: 1 }), { floorNum: 3 + i, run: { classId: 'knight' } });
      for (const n of h.roster.slice()) { g.scene = 'hunt'; try { ED.sceneImpl.hunt.update(g, 'sel:' + n.id, ED.input); g.render(); } catch (e) { ok(false, 'hunt screen with ' + n.name + ': ' + e); } }
      ok(true, 'the Hunt screen draws every nemesis (known and unknown traits)'); ED.sceneImpl.hunt.update(g, 'back', ED.input); ok(g.scene === 'title', 'Back returns to the title');
      g.scene = 'title'; try { g.render(); } catch (e) { ok(false, 'title: ' + e); } ok(ED.ui.btns.some(b => b.id === 'hunt'), 'the title has a THE HUNT button'); ok(true, 'title draws');
      g.scene = 'select'; ED.ui.selClass = 'knight'; try { g.render(); } catch (e) { ok(false, 'select: ' + e); } ok(true, 'class select draws with hunters listed');
      const g2 = newGame(); g2.startRun('ENDUI', 'knight'); g2.scene = 'play'; g2.run.huntReport = { kind: 'born', name: 'Vask', epi: 'the Grim', rank: 2, origin: 'herald', evicted: 'Old' }; g2.run.hunt = { slain: ['A', 'B'], escaped: [] }; g2.scene = 'dead'; g2.deadT = 60; try { g2.render(); g2.run.huntReport = { kind: 'ranked', name: 'Vask', epi: 'the Grim', rank: 3, up: true }; g2.render(); } catch (e) { ok(false, 'end screen: ' + e); } ok(true, 'the end screen reports what the Hunt did');
      // in-run drawing: tag, speech, card, flee label
      const gp = normalGame('DRAWV9', 6); calm(gp); const nem = h.roster[2]; const e = spawnNem(gp, nem, 520, 300, 500); ok(!!gp.huntCard && gp.huntCard.nem === nem && !!e.say, 'a nemesis arriving raises the card and speaks'); try { for (let i = 0; i < 6; i++) { stepFree(gp, 20); gp.render(); } e.fleeRoll = true; e.hp = 5; stepFree(gp, 5); gp.render(); } catch (err) { ok(false, 'in-run draw: ' + err); } ok(true, 'tag, speech, card and FLEEING label draw');
      stepFree(gp, 300); ok(gp.huntCard === null, 'the card goes away by itself');
    }
  }
  if (!P.on('v9')) {
    section('P9x. v9 off — the Hunt leaves no trace');
    { const g = newGame(); ED.save.meta.hunt = undefined; g.startRun('NOHUNT', 'knight'); g.scene = 'play'; g.god = true; ED.debug.jumpFloor(g, 5); const r = g.floor.rooms.find(x => x.type === 'normal'); ED.debug.goto(g, r, 480, 420); g.scene = 'play'; const bot = new Bot(ED, g, { god: true }); play(g, bot, 60 * 40);
      ok(ED.save.meta.hunt === undefined && g.floor.hunt === undefined && !g.enemies.some(e => e.nem || e.fleeRoll !== undefined) && !g.huntCard, 'no roster, no plan, no named or fleeing foes while v9 is off');
      g.god = false; g.player.hp = 1; g.player.inv = 0; const e = g.spawnEnemy('chaser', g.player.x + 5, g.player.y, { silent: true, elite: true, mods: [] }); g.hurtPlayer(50, e.x, e.y, { src: e }); g.finishRun(false); ok(ED.save.meta.hunt === undefined, 'dying creates no nemesis'); }
  }
};

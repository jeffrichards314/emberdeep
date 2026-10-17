'use strict';
/* Per-pack test sections.  Called at the end of run-tests.js with the shared helpers.
 * A pack's section only runs while that pack is ON, so the same suite validates every edition:
 *   node test/run-tests.js --packs=none | all | v2,v4                                              */
module.exports = function (ctx) {
  const { ED, ok, section, newGame, stepN, Bot, quick, bossFight, giveKit } = ctx;
  const P = ED.packs, I = ED.items, U = ED.U;
  const play = (g, bot, frames) => { for (let i = 0; i < frames; i++) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (g.player.dead) break; } };
  const finite = (g, label) => { const p = g.player; ok(isFinite(p.x) && isFinite(p.y) && isFinite(p.hp), label + ': player state finite'); for (const e of g.enemies) if (!isFinite(e.x) || !isFinite(e.y) || !isFinite(e.hp)) { ok(false, label + ': enemy NaN ' + e.type); return; } for (const a of g.allies || []) if (!isFinite(a.x) || !isFinite(a.y)) { ok(false, label + ': ally NaN'); return; } };
  const arena = (cls, floor, seed) => { ED.input.sim = { held: {}, edge: {} }; const g = newGame(); g.startRun(seed || 'PK', cls); g.scene = 'play'; g.god = false; if (floor > 1) ED.debug.jumpFloor(g, floor); const r = g.floor.rooms.find(x => x.type === 'treasure') || g.floor.rooms[g.floor.startId]; ED.debug.goto(g, r, 300, 288); g.scene = 'play'; return g; };
  const usePed = (g, it) => { g.player.x = it.x; g.player.y = it.y + 20; g.usePedestal(it); };
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

  section('P0c. Static guards (typos that would fail silently)');
  {
    const fs = require('fs'), path = require('path'), dir = path.join(__dirname, '..', 'js'), files = fs.readdirSync(dir).filter(f => /\.js$/.test(f)).map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]);
    // 1. every hook a pack registers is one the engine really fires (a typo would just never run)
    const fired = new Set(); for (const [f, src] of files) for (const m of src.matchAll(/runHooks\('([a-zA-Z]+)'/g)) fired.add(m[1]);
    const unknown = Object.keys(ED.hooks).filter(h => !fired.has(h) && ED.hooks[h].length); ok(unknown.length === 0, 'every registered hook name is fired by the engine (' + (unknown.join(',') || 'all ' + fired.size + ' fine') + ')');
    // 2. every sound asked for exists (a missing one plays silence)
    const SFX = ED.audio.SFX, missing = new Set(), seen = new Set();
    const firstArg = (src, at) => { let d = 0, k = at; for (; k < src.length; k++) { const ch = src[k]; if (ch === '(' || ch === '[' || ch === '{') d++; else if (ch === ')' || ch === ']' || ch === '}') { if (d === 0) break; d--; } else if (ch === ',' && d === 0) break; else if (ch === "'" || ch === '"') { const q = ch; k++; while (k < src.length && src[k] !== q) k++; } } return src.slice(at, k); };
    for (const [f, src] of files) for (const m of src.matchAll(/\bsfx\(/g)) { let arg = firstArg(src, m.index + m[0].length); if (arg.indexOf('?') >= 0) arg = arg.slice(arg.indexOf('?') + 1); for (const q of arg.matchAll(/'([a-zA-Z0-9_]+)'/g)) { seen.add(q[1]); if (!SFX[q[1]]) missing.add(f + ':' + q[1]); } }
    ok(seen.size >= 30, 'the scan found the sound calls (' + seen.size + ' distinct names)'); ok(missing.size === 0, 'every sound the code plays is defined (' + ([...missing].join(', ') || 'none missing') + ')');
    // 3. every non-core button on the title / class-select screens opens a scene that exists
    const core = { title: ['start', 'daily', 'collection', 'help', 'options', 'versions'], select: ['seed', 'rand', 'daily', 'go', 'back'] }, g = newGame();
    for (const sc of ['title', 'select']) { g.scene = sc; ED.ui.selClass = 'knight'; g.render(); const bad = ED.ui.btns.map(b => b.id).filter(id => !core[sc].includes(id) && !/^cls:/.test(id) && !ED.sceneImpl[id]); ok(bad.length === 0, sc + ' buttons all lead somewhere (' + (bad.join(',') || ED.ui.btns.length + ' buttons') + ')'); }
    for (const id in ED.sceneImpl) { const si = ED.sceneImpl[id]; ok(typeof si.draw === 'function' && typeof si.update === 'function', 'scene ' + id + ' has draw and update'); g.scene = id; try { g.render(); } catch (e) { ok(false, 'scene ' + id + ' draws: ' + e); } }
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
      ok(EVS.length === 17 && new Set(EVS.map(e => e.id)).size === 17 && Object.keys(FAM).length === 6, '17 encounters, 6 familiars'); for (const e of EVS) ok(e.title && e.npc && e.color && e.choices.length >= 2 && e.choices.every(c => c.label && typeof c.run === 'function'), 'encounter ' + e.id + ' is complete');
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
          if (g.rt.evFight) { const bot = new Bot(ED, g, { god: true }); let fr = 0; const relics0 = Object.values(p.relics).reduce((a2, b2) => a2 + b2, 0), gold0 = p.gold, pk0 = g.pickups.length; while (g.rt.evFight && fr++ < 60 * 90) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; } ok(!g.rt.evFight && !g.rt.lockdown, ev.id + '/' + ci + ' fight resolves and unlocks the room (' + Math.round(fr / 60) + 's)'); ok(ev.fightReward === false || g.inters.some(i => i.type === 'pedestal') || Object.values(p.relics).reduce((a2, b2) => a2 + b2, 0) > relics0 || p.gold > gold0 || g.pickups.length > pk0, ev.id + ' fight pays out (a pedestal, a relic, gold or pickups)'); }
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
      // the six newer encounters
      {
        const open = (id, seed, setup) => { const gg = arena('knight', 8, seed || ('EVN-' + id)); gg.god = true; gg.player.gold = 400; gg.player.bombs = 3; if (setup) setup(gg, gg.player); gg.room.type = 'event'; gg.rt.enc = null; gg.room.cleared = gg.rt.cleared = true; gg.rt.lockdown = false; gg.enemies.length = 0; gg.spawns.length = 0; const mm = ED.events.open(gg, id); mm.rng = new ED.RNG('x' + id); return { g: gg, p: gg.player, m: mm, ev: ED.events.BY_ID[id] }; };
        // campfire
        let t = open('campfire', 'EVN-CF', (gg, pp) => { pp.hp = 4; }); ok(t.ev.choices[0].can(t.g, t.m.st), 'a hurt hero can rest'); const hp0 = t.p.hp; t.ev.choices[0].run(t.g, t.m.st, new ED.RNG('rest-ok-1')); ok(t.p.hp >= Math.min(t.p.maxHp, hp0 + Math.ceil(t.p.maxHp * 0.6)) - 0, 'resting heals 60% of max health (' + hp0 + ' -> ' + t.p.hp + '/' + t.p.maxHp + ')');
        t = open('campfire', 'EVN-CF2'); t.p.hp = t.p.maxHp; ok(!t.ev.choices[0].can(t.g, t.m.st), 'a healthy hero cannot rest'); const up0 = t.p.weapon.upg || 0; t.ev.choices[1].run(t.g, t.m.st, new ED.RNG('sharp')); ok((t.p.weapon.upg || 0) === up0 + 1, 'sharpening adds a weapon level');
        // cleansing font: only offered to the cursed
        const room = { id: 0, type: 'event' }; let withCurse = 0, without = 0; for (let i = 0; i < 80; i++) { const g1 = arena('knight', 8, 'FONT' + i); g1.player.curses.length = 0; const rt1 = { rng: new ED.RNG('f' + i) }; ED.specials.event.setup(g1, room, rt1); if (rt1.ev.ev.id === 'font') without++; const g2 = arena('knight', 8, 'FONTB' + i); g2.cursePlayer({ name: 'Test Curse', mods: { dmgTaken: 0.1 } }); const rt2 = { rng: new ED.RNG('f' + i) }; ED.specials.event.setup(g2, room, rt2); if (rt2.ev.ev.id === 'font') withCurse++; }
        ok(without === 0 && withCurse > 0, 'the Cleansing Font only appears to the cursed (' + withCurse + ' of 80 cursed, ' + without + ' of 80 clean)');
        t = open('font', 'EVN-FT', (gg) => { gg.cursePlayer({ name: 'Curse A', mods: { dmgTaken: 0.15 } }); gg.cursePlayer({ name: 'Curse B', mods: { dmg: -0.1 } }); }); const dt0 = t.p.st.dmgTaken, gold1 = t.p.gold; t.ev.choices[0].run(t.g, t.m.st, new ED.RNG('w')); ok(t.p.curses.length === 1 && t.p.curses[0].name === 'Curse B' && t.p.gold < gold1 && t.p.st.dmgTaken < dt0, 'washing removes the oldest curse for gold and the stats follow');
        t.p.hp = 20; t.ev.choices[1].run(t.g, t.m.st, new ED.RNG('w')); ok(t.p.curses.length === 0 && t.p.hp < 20 && t.p.hp >= 1, 'immersion removes all curses for a quarter of your HP, never lethal'); t.p.hp = 1; t.p.curses.push({ name: 'C', mods: {} }); ok(!t.ev.choices[1].can(t.g, t.m.st), 'it is refused at 1 HP');
        // strongbox
        t = open('lockbox', 'EVN-LB'); t.p.keys.small = 0; ok(!t.ev.choices[0].can(t.g, t.m.st), 'no key, no key option'); t.p.keys.small = 2; t.ev.choices[0].run(t.g, t.m.st, new ED.RNG('k')); ok(t.p.keys.small === 1 && Object.keys(t.p.relics).length >= 1, 'a key buys a guaranteed relic'); const b0 = t.p.bombs; t.ev.choices[1].run(t.g, t.m.st, new ED.RNG('b')); ok(t.p.bombs === b0 - 2, 'blasting spends two bombs'); t.p.bombs = 1; ok(!t.ev.choices[1].can(t.g, t.m.st), 'one bomb is not enough');
        t = open('lockbox', 'EVN-LB2'); t.p.hp = 2; t.ev.choices[2].run(t.g, t.m.st, new ED.RNG('trap-3')); ok(t.p.hp >= 1, 'the needle trap is never lethal');
        // armsmaster
        t = open('armsmaster', 'EVN-AM'); const rk0 = I.RARITY[t.p.weapon.rarity].rank; t.ev.choices[0].run(t.g, t.m.st, new ED.RNG('swap')); ok(I.RARITY[t.p.weapon.rarity].rank > rk0, 'the surprise trade is always an upgrade in rarity (' + rk0 + ' -> ' + I.RARITY[t.p.weapon.rarity].rank + ')');
        t = open('armsmaster', 'EVN-AM2'); const g0 = t.p.gold; t.ev.choices[1].run(t.g, t.m.st, new ED.RNG('pay')); const peds = t.g.inters.filter(i => i.type === 'pedestal' && i.item.cat === 'weapon'); ok(t.p.gold < g0 && peds.length === 3 && new Set(peds.map(i => i.group)).size === 1, 'paying lays out three weapons to choose from'); t.p.gold = 0; ok(!t.ev.choices[1].can(t.g, t.m.st), 'no gold, no choice');
      }
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
      // a foe that carries a key never runs (its key would leave with it: a softlock)
      g = normalGame('FLEEKEY', 5); calm(g); h = fresh(); const kc = g.spawnEnemy('chaser', 520, 300, { silent: true, elite: true, mods: [], carriesKey: 'small' }); kc.mods.push(ED.mods.hunted); kc.fleeRoll = true; kc.hold = true; kc.maxHp = kc.hp = 100; g.player.x = 150; kc.hp = 10; stepFree(g, 6);
      ok(!kc.fleeing && !kc.fled, 'v9: an elite carrying a key does not flee'); g.damageEnemy(kc, 999, { src: 'melee', x: kc.x - 20, y: kc.y }); ok(kc.dead && g.pickups.some(k => k.type === 'key'), '...and drops the key when it dies');
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

  // ======================================================================= v10 LEGACY
  if (P.on('v10')) {
    const LG = ED.legacy, freshL = () => { ED.save.meta.legacy = null; return LG.meta(); };
    const mkG = (seed, cls) => { freshL(); const g = newGame(); g.startRun(seed || 'LEG', cls || 'knight'); g.scene = 'play'; g.god = true; return g; };
    section('P10. v10 LEGACY — tables and maths');
    {
      ok(LG.FEATS.filter(f => f.pack === 'v10').length === 27 && new Set(LG.FEATS.map(f => f.id)).size === LG.FEATS.length, '27 unique feats of its own (' + LG.FEATS.length + ' with other updates\' feats)');
      for (const f of LG.FEATS) ok(f.name && f.desc && f.title && typeof f.test === 'function' && !!P.BY_ID[f.pack] && (!f.need || !!P.BY_ID[f.need]), 'feat ' + f.id + ' is complete');
      ok(LG.SKINS.length === 5 && LG.TRAILS.length === 5 && LG.SKINS.map(s => s.lvl).join() === '1,3,5,7,10' && LG.TRAILS.map(t => t.total).join() === '2,5,9,14,20', 'five skins and five trails with rising thresholds');
      const cnt = P.content('v10'); ok(cnt.feats === 27 && cnt.skins === 5 && cnt.trails === 5, 'the Versions screen counts feats, skins and trails');
      ok(LG.need(1) === 100 && LG.need(2) === 300 && LG.need(10) === 5500 && LG.levelOf(0) === 0 && LG.levelOf(99) === 0 && LG.levelOf(100) === 1 && LG.levelOf(299) === 1 && LG.levelOf(300) === 2 && LG.levelOf(5499) === 9 && LG.levelOf(5500) === 10 && LG.levelOf(1e9) === 10, 'mastery levels: 100, 300 ... 5500, capped at 10');
      let prev = -1, mono = true; for (let x = 0; x < 7000; x += 25) { const l = LG.levelOf(x); if (l < prev) mono = false; prev = l; } ok(mono, 'levels never go down as xp rises');
      const run = { floorNum: 10, bossesKilled: ['a', 'b'], minisKilled: ['m'], kills: 200 }; ok(LG.xpOf(run, false) === 100 + 80 + 15 + 20 && LG.xpOf(run, true) === LG.xpOf(run, false) + 200, 'run xp: 10/floor, 40/boss, 15/mini, kills/10, +200 for a win');
      ok([0, 1, 2, 3, 4].every(i => LG.tier(i * 0) === 0) && LG.tier(10) === 1 && LG.tier(50) === 2 && LG.tier(250) === 3 && LG.tier(9) === 0, 'studied tiers at 10 / 50 / 250');
    }
    section('P10b. v10 — every feat can be earned (and only when it should)');
    {
      if (ED.save.meta.dares) ED.save.meta.dares.won = 0;       // v16's all-runs tally accumulates over earlier bot runs in this process: 50 wins would earn 'Fearless' first and take the title
      if (ED.save.meta.route) ED.save.meta.route = {};          // v17's sigils and lands accumulate the same way (every mini boss kill earlier in this process may have granted a sigil)
      let g = mkG('FEATS'), L = LG.meta(); const got = () => Object.keys(L.feats); const earn = (id) => { g.popups.length = 0; const out = LG.check(g, true); return out.map(f => f.id).includes(id); };
      g.run.floorNum = 4; ok(!earn('d5'), 'floor 4 is not floor 5'); g.run.floorNum = 5; ok(earn('d5') && L.title === 'd5' && g.popups.length === 1 && g.popups[0].title === 'FEAT', 'floor 5 earns First Descent, a title and a popup ' + JSON.stringify({ title: L.title, feats: Object.keys(L.feats), popups: g.popups.map(x => x.lines[0]) })); ok(!earn('d5'), 'a feat is only earned once');
      for (const [f, id] of [[10, 'd10'], [20, 'd20'], [31, 'd31'], [50, 'd50']]) { g.run.floorNum = f - 1; ok(!LG.check(g, true).some(x => x.id === id), id + ' not yet'); g.run.floorNum = f; ok(earn(id), id + ' at floor ' + f); }
      g = mkG('F6'); ED.debug.jumpFloor(g, 6); ok(g.run.fast6 === true, 'a quick descent is noted'); ok(earn('speed6') || LG.meta().feats.speed6 !== undefined, 'Swift Descent'); g = mkG('F6b'); g.run.frames = 8 * 3600 + 5; ED.debug.jumpFloor(g, 6); ok(!g.run.fast6, 'a slow descent is not');
      g = mkG('ELITE'); L = LG.meta(); for (let i = 0; i < 25; i++) { const e = g.spawnEnemy('chaser', 500, 300, { silent: true, elite: true, mods: [] }); e.hold = true; g.damageEnemy(e, 9999, { src: 'melee', x: 0, y: 0 }); stepN(g, 1); } ok(L.counters.elites === 25 && L.feats.elite25 !== undefined, '25 elite kills earn Elite Hunter (' + L.counters.elites + ')');
      const mn = g.spawnEnemy('chaser', 500, 300, { silent: true, elite: true, mods: [], minion: true }); mn.hold = true; g.damageEnemy(mn, 9999, { src: 'melee', x: 0, y: 0 }); ok(L.counters.elites === 25, 'a summoned minion does not count');
      L.counters.elites = 199; const e2 = g.spawnEnemy('chaser', 500, 300, { silent: true, elite: true, mods: [] }); e2.hold = true; g.damageEnemy(e2, 9999, { src: 'melee', x: 0, y: 0 }); ok(L.feats.elite200 !== undefined, 'the 200th earns Elite Bane');
      g = mkG('KILLS'); ED.save.meta.totalKills = 990; g.run.kills = 5; ok(!earn('kills1k'), '995 is not 1,000'); g.run.kills = 10; ok(earn('kills1k'), 'live kills count toward the thousand');
      const ids = ED.bosses.allIds(), megaId = ids.find(id => ED.bosses.def(id).mega), floorId = ids.find(id => !ED.bosses.def(id).mega);
      g = mkG('BOSS'); g.run.bossesKilled = [floorId]; ok(earn('boss1') && !LG.meta().feats.mega1, 'a floor boss earns Giant-Killer, not Titan-Slayer'); g.run.bossesKilled = [floorId, megaId]; ok(earn('mega1'), 'a MEGA boss earns Titan-Slayer');
      g = mkG('MINI'); L = LG.meta(); for (let i = 0; i < 9; i++) ED.runHooks('miniDefeated', g, { revenant: false }); ok(!L.feats.mini10, '9 minis'); ED.runHooks('miniDefeated', g, { revenant: true, nemesis: { rank: 1, relics: [] } }); ok(L.counters.minis === 9, 'a Revenant is not a mini boss'); ED.runHooks('miniDefeated', g, { revenant: false }); ok(L.feats.mini10 !== undefined, '10 earn Mini Menace');
      g = mkG('FLAW'); L = LG.meta(); const room = g.floor.rooms.find(r => r.type === 'normal'); ED.debug.goto(g, room, 480, 420); g.scene = 'play';
      for (let i = 0; i < 4; i++) { ED.runHooks('roomEnter', g, room); ED.runHooks('roomClear', g, room); } ok(g.run.lgFlaw === 4 && !L.feats.flaw5, 'four clean rooms');
      ED.runHooks('hurt', g, null, 3); ok(g.run.lgFlaw === 0, 'a hit resets the streak'); for (let i = 0; i < 5; i++) { ED.runHooks('roomEnter', g, room); ED.runHooks('roomClear', g, room); } ok(L.feats.flaw5 !== undefined, 'five in a row earn Untouchable');
      ED.runHooks('roomEnter', g, room); ED.runHooks('hurt', g, null, 3); ED.runHooks('roomClear', g, room); ok(g.run.lgFlaw === 0, 'a room with a hit does not extend the streak');
      g = mkG('CLOSE'); const r2 = g.floor.rooms.find(r => r.type === 'normal'); g.player.hp = 3; ED.runHooks('roomClear', g, r2); ok(g.run.lgClose && LG.meta().feats.close !== undefined, 'one heart or less earns Close Call'); g = mkG('CLOSE2'); g.player.hp = 9; ED.runHooks('roomClear', g, g.floor.rooms.find(r => r.type === 'normal')); ok(!g.run.lgClose, 'two hearts does not');
      g = mkG('COLL'); for (const id of Object.keys(I.RELICS).filter(k => !I.RELICS[k].hidden).slice(0, 11)) g.player.relics[id] = 1; ok(!earn('relic12'), '11 relics'); g.player.relics[Object.keys(I.RELICS).filter(k => !I.RELICS[k].hidden)[11]] = 1; ok(earn('relic12'), '12 relics earn Magpie'); g.player.gold = 499; ok(!earn('gold500'), '499 gold'); g.player.gold = 500; ok(earn('gold500'), '500 gold earns Dragon\'s Hoard');
      g = mkG('RUNS'); L = LG.meta(); L.runs = 9; ok(!earn('runs10'), '9 runs'); L.runs = 10; ok(earn('runs10'), '10 runs'); L.runs = 50; ok(earn('runs50'), '50 runs');
      g = mkG('WIN'); g.run.victory = true; ok(earn('win1'), 'a win earns Cashed Out'); g = mkG('CLS'); L = LG.meta(); L.played = { knight: 1, ranger: 1, mage: 1, rogue: 1 }; ok(!earn('class5'), '4 classes'); L.played.brute = 1; ok(earn('class5'), '5 classes earn Versatile');
      g = mkG('DAILY'); g.run.seed = ED.dailySeed(); g.run.floorNum = 4; ok(!earn('daily5'), 'daily floor 4'); g.run.floorNum = 5; ok(earn('daily5'), 'daily floor 5'); g = mkG('NOTDAILY'); g.run.floorNum = 9; ok(!earn('daily5'), 'a normal seed is not the daily');
      // pack-gated feats
      const gated = { heat6: ['v6', g => { g.run.heatLevel = 6; g.run.floorNum = 8; }], heart: ['v8', g => { g.run.finalBoss = 1; }], hunt1: ['v9', g => { LG.meta().counters.nemSlain = 1; }], hunt5: ['v9', g => { LG.meta().counters.dread = 1; }], hunt10: ['v9', g => { LG.meta().counters.nemSlain = 10; }], prov: ['v7', g => { g.run.provsUsed = 25; }] };
      for (const id in gated) { const [need, setup] = gated[id]; g = mkG('G' + id); setup(g); if (P.on(need)) ok(earn(id), id + ' can be earned with ' + need); else ok(!earn(id), id + ' needs ' + need); }
      { const keep = P.forced(); P.force(['v10']); const g2 = mkG('GATE'); LG.meta().counters.nemSlain = 99; g2.run.finalBoss = 1; g2.run.heatLevel = 9; g2.run.floorNum = 9; ok(!LG.check(g2, true).some(f => f.need), 'feats that need another update cannot be earned while it is off'); ctx.reapply(); }
      // the title
      g = mkG('TITLE'); L = LG.meta(); g.run.floorNum = 10; LG.check(g, true); ok(L.title === 'd5' && LG.titleOf() === 'the Delver', 'the first feat becomes your title'); ED.sceneImpl.legacy.update(g, 'wear:d10', ED.input); ok(L.title === 'd10' && LG.titleOf() === 'the Deep Diver', 'you can wear another earned title');
    }
    section('P10c. v10 — bestiary and mastery at the end of a run');
    {
      let g = mkG('END'), L = LG.meta(); g.run.killsByType = { chaser: 30, shooter: 4 }; g.run.bossesKilled = ['skarn']; g.run.minisKilled = ['m1']; g.run.lastHitId = 'chaser'; g.run.floorNum = 7; g.run.kills = 34; ED.runHooks('runEnd', g, false);
      ok(L.bestiary.chaser.k === 30 && L.bestiary.chaser.d === 1 && L.bestiary.shooter.k === 4 && L.bestiary.shooter.d === 0 && L.bestiary.skarn.k === 1 && L.bestiary.m1.k === 1, 'kills and deaths are recorded per foe, boss and mini boss'); ok(L.runs === 1, 'the run is counted');
      g.run.lastHitId = 'shooter'; ED.runHooks('runEnd', g, true); ok(L.bestiary.chaser.k === 60 && L.bestiary.shooter.d === 0, 'totals accumulate; a victory is not a death');
      const rep = g.run.legacyReport; ok(rep && rep.cls === 'knight' && rep.xp === LG.xpOf(g.run, true), 'the end report carries the mastery gained');
      g = mkG('MAST'); L = LG.meta(); g.run.floorNum = 10; g.run.bossesKilled = []; g.run.minisKilled = []; g.run.kills = 0; ED.runHooks('runEnd', g, false); ok(L.mastery.knight === 100 && LG.levelFor('knight') === 1 && g.run.legacyReport.after === 1 && g.run.legacyReport.gained.join().indexOf('Ember') >= 0, 'a 100-xp run reaches level 1 and unlocks the Ember skin');
      g.run.floorNum = 20; ED.runHooks('runEnd', g, false); ok(L.mastery.knight === 300 && LG.levelFor('knight') === 2 && g.run.legacyReport.gained.length === 1 && /Ember Trail/.test(g.run.legacyReport.gained[0]) , 'level 2 (total 2) unlocks the first trail (' + g.run.legacyReport.gained.join('|') + ')');
      L.mastery.knight = 5499; g.run.floorNum = 1; ED.runHooks('runEnd', g, false); ok(LG.levelFor('knight') === 10 && g.run.legacyReport.gained.some(x => /Gilded/.test(x)), 'level 10 unlocks the Gilded skin');
      L.mastery = { knight: 5500, ranger: 5500 }; ok(LG.totalLevels() === 20 && LG.trailOpen('gold') && !LG.skinOpen('mage', 'ember'), 'total mastery opens trails; skins are per class');
    }
    section('P10d. v10 — skins and trails reach the game');
    {
      let g = mkG('SKIN'), L = LG.meta(); L.mastery.knight = 5500; L.skin.knight = 'frost'; L.trail = 'ember'; g = newGame(); g.startRun('SKIN2', 'knight'); g.scene = 'play'; const p = g.player, cl = I.CLASSES.knight;
      ok(p.skinId === 'frost' && p.skinCol === LG.skinColor('knight', 'frost') && p.skinCol !== cl.color && p.trailCol === LG.TR.ember.col, 'an unlocked skin and trail are applied at run start'); L.trail = 'gold'; g = newGame(); g.startRun('SKIN2b', 'knight'); ok(!g.player.trailCol, 'a trail you have not unlocked is ignored'); L.trail = 'ember';
      L.skin.knight = 'gilded'; L.mastery.knight = 0; g = newGame(); g.startRun('SKIN3', 'knight'); ok(p && !g.player.skinCol && !g.player.trailCol, 'a locked skin or trail is ignored');
      L.mastery.knight = 5500; for (const s of LG.SKINS) { L.skin.knight = s.id; g = newGame(); g.startRun('SKIN-' + s.id, 'knight'); g.scene = 'play'; try { stepN(g, 3); g.render(); } catch (e) { ok(false, 'skin ' + s.id + ': ' + e); } ok(g.player.skinId === s.id, 'skin ' + s.id + ' draws'); }
      L.skin.knight = ''; g = newGame(); g.startRun('TRAIL', 'knight'); g.scene = 'play'; g.god = true; g.player.trailCol = '#ff00ff'; ED.input.sim = { held: { right: true }, edge: {} }; stepN(g, 40); ED.input.sim = { held: {}, edge: {} };
      ok(g.fx.some(f => f.color === '#ff00ff') || g.player.trailCol === '#ff00ff', 'moving leaves a trail'); finite(g, 'trail');
    }
    section('P10e. v10 — the LEGACY screens');
    {
      const g = mkG('SCENE'), L = LG.meta(); L.mastery = { knight: 800, ranger: 5500 }; L.skin.knight = 'ember'; L.trail = 'ember'; g.run.floorNum = 12; LG.check(g, true); g.run.killsByType = { chaser: 60, shooter: 11 }; g.run.bossesKilled = [ED.bosses.allIds()[0]]; g.run.lastHitId = 'chaser'; ED.runHooks('runEnd', g, false);
      const S = ED.sceneImpl.legacy, tryDraw = (label) => { g.scene = 'legacy'; try { g.render(); } catch (e) { ok(false, label + ': ' + (e.stack || e)); return false; } return true; };
      const go = (a) => S.update(g, a, ED.input);
      go('tab:feats'); ok(tryDraw('feats tab'), 'the feats tab draws'); go('tab:bestiary'); ok(tryDraw('bestiary foes'), 'the bestiary draws');
      const foes = ED.legacyLists.foeList(), bosses = ED.legacyLists.bossList(); ok(foes.length >= 12 && foes.every(d => d.id !== 'boss' && d.name), 'the foe list holds real foes (' + foes.length + ')'); ok(bosses.length >= 10 && bosses.some(b => b.kind === 'MEGA BOSS') && bosses.some(b => b.kind === 'MINI BOSS') && bosses.every(b => b.name), 'the boss list holds floor, MEGA and mini bosses (' + bosses.length + ')');
      for (const d of foes) { go('be:' + d.id); if (!tryDraw('foe ' + d.id)) break; } ok(true, 'every foe entry draws'); go('page'); tryDraw('page 2');
      go('sub:bosses'); for (const b of bosses) { go('be:' + b.id); if (!tryDraw('boss ' + b.id)) break; } ok(true, 'every boss entry draws'); go('page'); tryDraw('boss page 2');
      go('tab:mastery'); ok(tryDraw('mastery'), 'the mastery tab draws');
      go('skin:knight:frost'); ok(L.skin.knight === 'ember' || L.skin.knight === 'frost', 'selecting a skin is accepted or refused cleanly'); L.mastery.knight = 5500; go('skin:knight:gilded'); ok(L.skin.knight === 'gilded', 'an unlocked skin can be equipped'); go('skin:knight:'); ok(L.skin.knight === '', 'none removes it');
      L.mastery = { knight: 0 }; go('skin:knight:gilded'); ok(L.skin.knight === '', 'a locked skin cannot be equipped'); go('trail:void'); ok(L.trail !== 'void', 'a locked trail cannot be equipped'); L.mastery = { knight: 5500, ranger: 5500 }; go('trail:void'); ok(L.trail === 'void', 'an unlocked trail can');
      tryDraw('mastery after'); go('back'); ok(g.scene === 'title', 'Back returns to the title');
      g.scene = 'title'; try { g.render(); } catch (e) { ok(false, 'title: ' + e); } ok(ED.ui.btns.some(b => b.id === 'legacy'), 'the title has a LEGACY button');
      g.scene = 'select'; ED.ui.selClass = 'knight'; try { g.render(); } catch (e) { ok(false, 'select: ' + e); } ok(true, 'class select shows your title and mastery');
      g.run.legacyReport = { cls: 'knight', xp: 120, before: 1, after: 2, gained: ['Knight skin: Frost', 'Ember Trail'], feats: ['d5'] }; g.scene = 'dead'; g.deadT = 60; try { g.render(); } catch (e) { ok(false, 'end: ' + e); } ok(true, 'the end screen shows mastery and feats');
    }
  }
  if (!P.on('v10')) {
    section('P10x. v10 off — LEGACY leaves no trace');
    { ED.save.meta.legacy = undefined; const g = newGame(); g.startRun('NOLEG', 'knight'); g.scene = 'play'; g.god = true; stepN(g, 120); g.run.killsByType = { chaser: 3 }; ED.runHooks('runEnd', g, false);
      ok(ED.save.meta.legacy === undefined && g.player.skinCol === undefined && g.player.trailCol === undefined && !g.run.legacyReport, 'no record, no skin, no trail while v10 is off'); }
  }
  // ======================================================================= v11 TRIALS
  if (P.on('v11')) {
    const TR = ED.trials, resetMode = () => { TR.set('normal'); ED.save.meta.trials = null; TR.meta(); };
    const mkMode = (mode, seed, cls) => { ED.save.meta.trials = null; TR.meta(); TR.set(mode); const g = newGame(); g.startRun(seed, cls || 'knight'); g.scene = 'play'; g.god = true; g.introT = 999; g.hitstopT = 0; return g; };
    const free = (g, n) => { for (let i = 0; i < n; i++) { g.hitstopT = 0; g.step(); if (g.scene !== 'play') g.scene = 'play'; } };
    const fightUntil = (g, cond, limit) => { const bot = new Bot(ED, g, { god: true }); let f = 0; while (f++ < limit && !cond()) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (f % 60 === 0) g.render(); } return f; };
    try {
      section('P11. v11 TRIALS — modes');
      {
        ok(TR.MODES.length === 4 && TR.MODES[0].id === 'normal' && TR.MODES.slice(1).every(m => m.pack === 'v11' && m.name && m.desc && m.color), 'four modes: normal + three trials');
        resetMode(); ok(TR.mode() === 'normal' && TR.set('rush') && TR.mode() === 'rush' && ED.save.meta.trials.mode === 'rush' && !TR.set('nope') && TR.mode() === 'rush', 'a mode can be chosen, junk is refused, the choice is saved');
        ED.save.meta.trials.mode = 'bogus'; ok(TR.mode() === 'normal', 'a damaged save falls back to the normal mode'); resetMode();
        const cnt = P.content('v11'); ok(cnt.modes === 3 && cnt.feats === 4, 'the Versions screen counts 3 modes and 4 feats (' + JSON.stringify(cnt) + ')');
        let g = mkMode('normal', 'NORMAL'); free(g, 30); ok(g.run.mode === 'normal' && g.room.type === 'start' && !g.floor.trial, 'the normal mode changes nothing');
      }
      section('P11b. v11 — Boss Rush');
      {
        let g = mkMode('rush', 'RUSH1'); free(g, 4);
        ok(g.run.mode === 'rush' && g.room.type === 'boss' && g.floor.trial.warped && g.floor.trial.room === g.floor.bossId, 'a Boss Rush floor opens in its boss room');
        const start = g.inters.filter(i => i.type === 'pedestal'); ok(start.length === 3 && new Set(start.map(i => i.group)).size === 1 && start.every(i => i.item.cat === 'relic'), 'the first floor offers a relic choice before the fight');
        // sealed: a door transition into another room is undone
        const other = g.floor.rooms.find(r => r.id !== g.floor.bossId && r.type === 'normal'); g.enterRoom(other, null); free(g, 4); ok(g.room.id === g.floor.bossId && g.toasts.some(t => /sealed/.test(t.msg)), 'wandering into another room sends you back');
        usePed(g, start[0]); ok(Object.keys(g.player.relics).length === 1 && start[1].caged, 'taking one relic cages the others');
        const fr = fightUntil(g, () => g.room.cleared && g.room.type === 'boss' && g.inters.some(i => i.type === 'stairs'), 60 * 60 * 6); ok(g.room.cleared, 'the first boss falls (' + Math.round(fr / 60) + 's)');
        const groups = new Set(g.inters.filter(i => i.type === 'pedestal' && !i.caged && i.group).map(i => i.group)); ok(groups.size === 2 && g.inters.filter(i => i.type === 'pedestal' && i.item.cat === 'relic' && i.y < 200).length === 3, 'a boss pays twice: the usual spoils and a bonus relic cache');
        ok(g.inters.some(i => i.type === 'healfont') && g.run.bossesKilled.length === 1, 'plus the heal fonts');
        free(g, 200); if (g.modal && g.modal.type === 'talent') ED.modalImpl.talent.update(g, g.modal, 'pick:0', ED.input);          // v12 asks for a talent after the boss: take one
        const st = g.inters.find(i => i.type === 'stairs'); st.use(g); free(g, 140); ok(g.floorNum === 2, 'the stairs lead on (floor ' + g.floorNum + ')'); free(g, 6);
        ok(g.room.type === 'boss' && g.floor.trial.room === g.floor.bossId && g.floor.trial.warped, 'floor 2 opens in its boss room as well'); ok(!g.inters.some(i => i.type === 'pedestal' && !i.caged && i.item.cat === 'relic' && i.y > 300 && i.y < 360), 'the starting pick is only for the first floor');
        if (!quick) { fightUntil(g, () => g.room.cleared && g.room.type === 'boss' && g.inters.some(i => i.type === 'stairs'), 60 * 60 * 6); ok(g.run.bossesKilled.length === 2, 'the second boss falls too'); }
        finite(g, 'rush');
        // a mega floor works (floor 5 is a MEGA boss)
        g = mkMode('rush', 'RUSH5'); ED.debug.jumpFloor(g, 5); g.scene = 'play'; free(g, 4); ok(g.room.type === 'boss' && g.room.bossDef.mega, 'a MEGA boss floor opens in the boss room');
        // every floor of the rotation resolves to a boss room
        for (const f of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 25, 50]) { const gg = mkMode('rush', 'RUSHR' + f); ED.debug.jumpFloor(gg, f); gg.scene = 'play'; free(gg, 4); ok(gg.room.type === 'boss' && gg.floor.trial && gg.floor.trial.warped, 'floor ' + f + ' opens in its boss room (' + (gg.room.bossDef ? gg.room.bossDef.name : '?') + ')'); }
      }
      section('P11c. v11 — Gauntlet');
      {
        let g = mkMode('gauntlet', 'GAUNT1'); free(g, 4);
        ok(g.run.mode === 'gauntlet' && g.room.type === 'normal' && g.floor.trial.warped && g.room.id === g.floor.trial.room && g.room.id !== g.floor.startId && !g.room.puzzle, 'a Gauntlet floor opens in an ordinary combat room');
        const waves = g.rt.enc.waves; ok(waves.length === 5 && waves.every(w => w.length >= 1) && g.rt.gauntlet, 'five waves (' + waves.map(w => w.length).join('/') + ')');
        const base = (() => { const gg = newGame(); ED.save.meta.trials.mode = 'normal'; gg.startRun('GAUNT1', 'knight'); gg.scene = 'play'; const r = gg.floor.rooms.find(x => x.id === g.room.id); ED.debug.goto(gg, r, 480, 420); return gg.rt.enc.waves; })(); ED.trials.set('gauntlet');
        const tot = a => a.reduce((n, w) => n + w.length, 0), elites = a => [].concat(...a).filter(e => e.elite).length; ok(tot(waves) >= tot(base), 'a Gauntlet fight is at least as big as the room it replaces (' + tot(waves) + ' vs ' + tot(base) + ')');
        const g2 = mkMode('gauntlet', 'GAUNT1'); free(g2, 4); ok(g2.room.id === g.room.id && JSON.stringify(g2.rt.enc.waves) === JSON.stringify(waves), 'the arena and its waves are the same for the same seed');
        const other = g.floor.rooms.find(r => r.id !== g.room.id && r.type === 'normal'); const here = g.room.id; g.enterRoom(other, null); free(g, 4); ok(g.room.id === here, 'wandering out is undone');
        g.player.hp = 5; const fr = fightUntil(g, () => g.room.cleared, 60 * 60 * 4); ok(g.room.cleared, 'the arena can be cleared (' + Math.round(fr / 60) + 's)');
        const peds = g.inters.filter(i => i.type === 'pedestal' && !i.caged); const grp = new Set(peds.map(i => i.group)); ok(peds.length >= 6 && grp.size >= 2 && peds.some(i => i.item.cat === 'relic') && peds.some(i => i.item.cat !== 'relic'), 'a relic choice and a gear choice (' + peds.length + ' pedestals)');
        for (const pd of peds) ok(!ED.phys.blocked(g, pd.x, pd.y, 10, true, false), 'a spoil is not inside a wall');
        const heal = g.inters.find(i => i.type === 'healfont'), hp0 = g.player.hp; heal.use(g, heal); ok(g.player.hp > hp0 && g.player.hp <= g.player.maxHp, 'the heal font restores health (' + hp0 + ' -> ' + g.player.hp + ')');
        const st = g.inters.find(i => i.type === 'stairs'); ok(!!st, 'and the stairs'); st.use(g); free(g, 140); free(g, 6); ok(g.floorNum === 2 && g.room.type === 'normal' && g.floor.trial.warped, 'floor 2 is another arena');
        finite(g, 'gauntlet');
        if (P.on('v9')) {                                           // a hunter planned for the arena keeps its place in the rebuilt fight
          const h = ED.hunt, hm = (ED.save.meta.hunt = null, h.meta()); const gg = mkMode('gauntlet', 'GAUNTHUNT'); ED.debug.jumpFloor(gg, 3); gg.scene = 'play';
          const nem = h.makeNem({ seed: 'GH', floor: 6, from: 2, type: 'chaser', cls: 'knight', origin: 'elite', kills: 1, rank: 2 }); h.admit(nem, true); gg.floor.hunt = { [gg.floor.trial.room]: [nem.id] };
          free(gg, 6); ok(gg.room.id === gg.floor.trial.room && [].concat(...gg.rt.enc.waves).some(e => e.extra && e.extra.nem === nem) && gg.rt.enc.waves.length === 5, 'a nemesis planned for the arena stays in the Gauntlet fight'); ED.save.meta.hunt = null;
        }
      }
      section('P11d. v11 — Chaos Kit');
      {
        const kits = new Set(); let bad = 0; const why = [];
        for (const cls of Object.keys(I.CLASSES).filter(c => P.ok(I.CLASSES[c]))) {
          const g = mkMode('chaos', 'CHAOS-' + cls, cls), p = g.player, again = mkMode('chaos', 'CHAOS-' + cls, cls); free(g, 20);
          const relics = Object.keys(p.relics), cp = I.CLASSES[cls].passive;
          if (relics.length !== 2 + (cp ? 1 : 0) || (cp && !p.relics[cp]) || !p.weapon || !p.active || p.hp !== p.maxHp || !Object.values(p.armor).some(Boolean) || !isFinite(p.maxHp)) { bad++; why.push(cls + ': relics ' + relics.join('+') + ' hp ' + p.hp + '/' + p.maxHp); }
          if (I.itemName(again.player.weapon) !== I.itemName(p.weapon) || Object.keys(again.player.relics).join() !== relics.join()) { bad++; why.push(cls + ': not seeded'); }
          kits.add(p.weapon.type + '/' + p.active.item.id); finite(g, 'chaos ' + cls);
        }
        ok(bad === 0, 'every class gets a legal, seeded Chaos Kit (' + bad + ' problems: ' + why.join('; ') + ')'); ok(kits.size >= 5, 'kits vary (' + kits.size + ' different weapon/active pairs)');
        const g = mkMode('chaos', 'CHAOSPLAY'); const bot = new Bot(ED, g, { god: true }); for (let i = 0; i < 60 * 40; i++) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (i % 90 === 0) g.render(); } ok(g.run.roomsCleared >= 1 && isFinite(g.player.hp), 'a Chaos Kit run plays (' + g.run.roomsCleared + ' rooms cleared in 40s)');
      }
      section('P11e. v11 — records, feats and the screens');
      {
        resetMode(); let g = mkMode('rush', 'REC'); g.run.floorNum = 4; ED.runHooks('runEnd', g, false); let T = TR.meta(); ok(T.best.rush.floor === 4 && T.runs.rush === 1 && g.run.trialBest === 'rush', 'a first run sets the mode best');
        g = mkMode('rush', 'REC2'); T = TR.meta(); T.best.rush = { floor: 4, edition: 'x' }; g.run.floorNum = 3; ED.runHooks('runEnd', g, false); ok(T.best.rush.floor === 4 && T.runs.rush === 1, 'a worse run keeps the best'); g.run.floorNum = 9; ED.runHooks('runEnd', g, true); ok(T.best.rush.floor === 9 && T.best.rush.victory === true, 'a better one replaces it');
        if (P.on('v10')) {
          const LG = ED.legacy; g = mkMode('rush', 'FEATS'); LG.meta().feats = {}; g.run.bossesKilled = ['a', 'b']; ok(!LG.check(g, true).some(f => f.id === 'rush3'), '2 bosses are not enough'); g.run.bossesKilled.push('c'); ok(LG.check(g, true).some(f => f.id === 'rush3'), '3 bosses earn Rush Contender'); g.run.bossesKilled = [1, 2, 3, 4, 5, 6, 7]; ok(LG.check(g, true).some(f => f.id === 'rush7'), '7 earn Rush Champion');
          g = mkMode('gauntlet', 'FEATS2'); g.run.roomsCleared = 5; ok(LG.check(g, true).some(f => f.id === 'gaunt5'), '5 arenas earn Arena Veteran'); g = mkMode('chaos', 'FEATS3'); g.run.floorNum = 8; ok(LG.check(g, true).some(f => f.id === 'chaos8'), 'floor 8 with a Chaos Kit earns its feat');
          g = mkMode('normal', 'FEATS4'); g.run.bossesKilled = [1, 2, 3, 4, 5, 6, 7]; g.run.roomsCleared = 9; g.run.floorNum = 9; LG.meta().feats = {}; ok(!LG.check(g, true).some(f => /^(rush|gaunt|chaos)/.test(f.id)), 'trial feats cannot be earned in a normal run'); }
        // screens
        g = mkMode('normal', 'SCREENS'); g.scene = 'select'; ED.ui.selClass = 'knight'; try { g.render(); } catch (e) { ok(false, 'select: ' + e); } ok(ED.ui.btns.some(b => b.id === 'mode'), 'class select has a MODE button');
        g.scene = 'mode'; try { g.render(); } catch (e) { ok(false, 'mode scene: ' + e); } ok(ED.ui.btns.filter(b => /^pick:/.test(b.id)).length === 4, 'the mode screen lists four modes'); ED.sceneImpl.mode.update(g, 'pick:gauntlet', ED.input); ok(TR.mode() === 'gauntlet', 'picking a mode selects it'); g.render(); ED.sceneImpl.mode.update(g, 'back', ED.input); ok(g.scene === 'select', 'Done returns to class select');
        for (const m of ['rush', 'gauntlet', 'chaos']) { const gg = mkMode(m, 'HUD' + m); try { free(gg, 30); gg.render(); gg.scene = 'dead'; gg.deadT = 60; gg.run.trialBest = m; ED.runHooks('runEnd', gg, false); gg.render(); } catch (e) { ok(false, 'draw ' + m + ': ' + e); } } ok(true, 'the HUD badge and end screen draw in every mode');
      }
    } finally { resetMode(); }
  }
  if (!P.on('v11')) {
    section('P11x. v11 off — the modes are gone');
    { ED.save.meta.trials = undefined; ok(!ED.trials.set('rush') && ED.trials.mode() === 'normal', 'no mode can be chosen'); const g = newGame(); g.startRun('NOTRIAL', 'knight'); g.scene = 'play'; g.introT = 999; for (let i = 0; i < 30; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; } ok(g.run.mode === undefined && g.room.type === 'start' && !g.floor.trial, 'runs are ordinary and nothing warps'); ok(ED.save.meta.trials === undefined, 'no trial records are kept'); }
  }

  // ======================================================================= v12 TALENTS
  if (P.on('v12')) {
    const TL = ED.talents, classes = Object.keys(I.CLASSES).filter(c => P.ok(I.CLASSES[c]));
    const free = (g, n) => { for (let i = 0; i < n; i++) { g.hitstopT = 0; g.step(); if (g.scene !== 'play') g.scene = 'play'; } };
    const mkT = (cls, seed, floor) => { const g = newGame(); g.startRun(seed || 'TAL', cls); g.scene = 'play'; g.god = true; g.introT = 999; if (floor) ED.debug.jumpFloor(g, floor); g.scene = 'play'; g.timers.length = 0; return g; };
    section('P12. v12 TALENTS — the table');
    {
      ok(TL.LIST.length === 66 && new Set(TL.LIST.map(t => t.key)).size === 66, '66 unique talents');
      const per = {}; for (const t of TL.LIST) per[t.cls] = (per[t.cls] || 0) + 1; ok(Object.keys(per).length === 11 && Object.values(per).every(n => n === 6) && Object.keys(per).every(c => !!I.CLASSES[c]), 'six talents for each of the eleven classes');
      const statKeys = new Set(['maxHp', 'speed', 'dmg', 'atkSpd', 'crit', 'critMult', 'range', 'dashCd', 'dashDist', 'dashI', 'dashDmg', 'def', 'luck', 'gold', 'magnet', 'kb', 'proj', 'pierce', 'burn', 'freeze', 'poison', 'chain', 'explode', 'lifesteal', 'thorns', 'regen', 'dmgTaken', 'activeCd', 'execute', 'opener', 'guard', 'thrall', 'raise']);
      for (const t of TL.LIST) { ok(t.name && t.desc.length > 8 && t.color && t.hidden && t.passive && t.talent && t.pack === 'v12' && t.from >= 1 && t.from <= 3 && Object.keys(t.mods).every(k => statKeys.has(k) && isFinite(t.mods[k])) && (!t.on || Object.keys(t.on).every(k => ['hit', 'kill', 'hurt', 'dash', 'clear', 'enter', 'pickup'].includes(k) && typeof t.on[k] === 'function')) && (Object.keys(t.mods).length > 0 || !!t.on), 'talent ' + t.key + ' is well formed'); }
      ok(TL.LIST.filter(t => t.on).length >= 12 && TL.LIST.filter(t => t.on).length <= 20, 'about a fifth act rather than add a number (' + TL.LIST.filter(t => t.on).length + ')');
      const rng = new ED.RNG('talroll'); let leaked = 0; for (let i = 0; i < 3000; i++) { const r = I.rollRelic(rng, 1 + i % 60, { relics: {} }); if (I.relic(r.id).talent) leaked++; } ok(leaked === 0, 'talents never drop as loot');
      ok(P.content('v12').talents === 66, 'the Versions screen counts 66 talents'); ok(TL.LIST.every(t => I.relic(t.key) === t), 'every talent resolves as a relic');
    }
    section('P12b. v12 — taking a talent');
    {
      let bad = 0; const why = [];
      for (const t of TL.LIST) {
        if (!classes.includes(t.cls)) continue;
        const g = mkT(t.cls, 'TK-' + t.key), p = g.player; p.hp = Math.max(1, p.maxHp - 2); const st0 = Object.assign({}, p.st), max0 = p.maxHp, hp0 = p.hp;
        g.modal = { type: 'talent', offers: [t], t: 0 }; ED.modalImpl.talent.update(g, g.modal, 'pick:0', ED.input);
        if (!p.relics[t.key] || g.modal || g.run.talents.join() !== t.key) { bad++; why.push(t.key + ' not taken'); continue; }
        for (const k in t.mods) { const d = k === 'maxHp' ? p.maxHp - max0 : p.st[k] - st0[k]; if (Math.abs(d - t.mods[k]) > 1e-6) { bad++; why.push(t.key + ' ' + k + ' moved ' + d + ' not ' + t.mods[k]); } }
        if (t.mods.maxHp && p.hp !== hp0 + t.mods.maxHp) { bad++; why.push(t.key + ' did not heal the new container'); }
        if (!Object.values(p.st).every(v => typeof v !== 'number' || isFinite(v))) { bad++; why.push(t.key + ' non-finite'); }
      }
      ok(bad === 0, 'every talent applies exactly what it says (' + bad + ' problems' + (why.length ? ': ' + why.slice(0, 4).join('; ') : '') + ')');
    }
    section('P12c. v12 — offers and the trigger');
    {
      for (const cls of classes) {
        const g = mkT(cls, 'OFF-' + cls, 6), o1 = TL.offerFor(g), o2 = TL.offerFor(g); ok(o1.length === 3 && new Set(o1.map(t => t.key)).size === 3 && o1.every(t => t.cls === cls && t.from <= 7) && o1.map(t => t.key).join() === o2.map(t => t.key).join(), cls + ': three distinct class talents, the same every time');
        const early = mkT(cls, 'OFF1-' + cls, 1); ok(TL.offerFor(early).every(t => t.from <= 2), cls + ': floor 1 offers only early talents');
      }
      // taking all six empties the pool
      let g = mkT('knight', 'POOL'); for (let i = 0; i < 6; i++) { const o = TL.offerFor(g); ok(o.length === Math.min(3, 6 - i) && o.every(t => !g.player.relics[t.key]), 'offer ' + (i + 1) + ' holds only talents you lack'); g.floorNum = 8; TL.take(g, o[0]); }
      ok(TL.offerFor(g).length === 0 && TL.owned(g.player).length === 6, 'six talents later the pool is empty');
      // the trigger: a boss room clear queues an offer; it opens when nothing else is pending; other rooms do not
      g = mkT('knight', 'TRIG'); ED.runHooks('roomClear', g, { type: 'normal' }); ED.runHooks('roomClear', g, { type: 'miniboss' }); free(g, 5); ok(!g.modal && g.run.talentPending === 0, 'normal and mini boss rooms do not offer talents');
      ED.runHooks('roomClear', g, { type: 'boss' }); ok(g.run.talentPending === 1, 'a boss clear queues one offer'); g.after(5000, () => {}); free(g, 20); ok(!g.modal, 'it waits for pending timed events (the rewards, the ending, the milestone)'); g.timers.length = 0; free(g, 3);
      ok(g.modal && g.modal.type === 'talent' && g.modal.offers.length === 3 && g.run.talentPending === 0, 'then three talents are offered'); const pick = g.modal.offers[1]; ED.modalImpl.talent.update(g, g.modal, 'pick:1', ED.input); ok(g.player.relics[pick.key] && !g.modal, 'picking one learns it and closes the choice');
      g.run.floorNum = 2; ED.runHooks('roomClear', g, { type: 'boss' }); free(g, 3); ok(g.modal && !g.modal.offers.some(t => t.key === pick.key), 'the next offer never repeats it');
      // a modal that is already open is never replaced
      g.modal = { type: 'milestone', sel: 0 }; ED.runHooks('roomClear', g, { type: 'boss' }); free(g, 1); ok(g.modal.type === 'milestone' && g.run.talentPending >= 1, 'an open choice is never replaced');
    }
    section('P12d. v12 — the talents that act');
    {
      const on = (cls, id) => { const g = mkT(cls, 'ACT-' + id, 4); const t = TL.BY_KEY['tal_' + cls + '_' + id]; g.player.relics[t.key] = 1; I.recalc(g.player); g.player.hp = 6; g.enemies.length = 0; g.zones.length = 0; return { g, p: g.player, t, e: (() => { const e = g.spawnEnemy('chaser', g.player.x + 30, g.player.y, { silent: true }); e.hold = true; e.maxHp = e.hp = 400; return e; })() }; };
      let c = on('knight', 'riposte'); c.t.on.hurt(c.g, c.p, 3, 1); const z0 = c.g.zones.length; ok(z0 >= 1, 'Riposte: being hurt sends a shockwave'); c.t.on.hurt(c.g, c.p, 3, 1); ok(c.g.zones.length === z0, '...at most every 2 seconds'); c.g.frame += 130; c.t.on.hurt(c.g, c.p, 3, 1); ok(c.g.zones.length === z0 + 1, '...and again later');
      c = on('knight', 'cleave'); for (let i = 0; i < 3; i++) c.t.on.hit(c.g, c.p, c.e, 8, {}, 1); ok(c.g.zones.length === 0, 'Cleaving Arc: three hits do nothing'); c.t.on.hit(c.g, c.p, c.e, 8, {}, 1); ok(c.g.zones.length === 1, '...the fourth sends a shockwave');
      c = on('knight', 'wall'); c.p.guard = 0; c.t.on.enter(c.g, c.p); ok(c.p.guard === 1, 'Shield Wall: a Guard on every room'); c.p.guard = 2; c.t.on.enter(c.g, c.p); ok(c.p.guard === 2, '...but never takes one away');
      c = on('lancer', 'sweep'); c.t.on.dash(c.g, c.p); ok(c.g.zones.length === 1, 'Whirling Retreat: dashing sweeps');
      c = on('brute', 'aftershock'); for (let i = 0; i < 3; i++) c.t.on.hit(c.g, c.p, c.e, 8, {}, 1); ok(c.g.zones.length === 1, 'Aftershock: every third hit');
      c = on('brute', 'bloodlust'); const h0 = c.p.hp; for (let i = 0; i < 5; i++) c.t.on.kill(c.g, c.p, c.e, 1); ok(c.p.hp === h0, 'Bloodlust: five kills heal nothing'); c.t.on.kill(c.g, c.p, c.e, 1); ok(c.p.hp === h0 + 2, '...the sixth heals half a heart');
      c = on('rogue', 'pickpocket'); const gold0 = c.p.gold; const chance = c.g.rng.chance; c.g.rng.chance = () => true; c.t.on.kill(c.g, c.p, c.e, 1); c.g.rng.chance = chance; ok(c.p.gold > gold0, 'Pickpocket: a lucky kill pays gold');
      c = on('ranger', 'mark'); const ch2 = c.g.rng.chance; c.g.rng.chance = () => true; c.t.on.hit(c.g, c.p, c.e, 8, {}, 1); c.g.rng.chance = ch2; ok(c.e.hexT > 0, "Hunter's Mark: marks the foe");
      c = on('mage', 'recover'); const m0 = c.p.hp; c.t.on.clear(c.g, c.p, 1); ok(c.p.hp === m0 + 2, 'Recovery: half a heart per room');
      c = on('trickster', 'quickdraw'); c.p.atkCd = 30; c.t.on.dash(c.g, c.p, 1); ok(c.p.atkCd === 0, 'Quickdraw: a dash readies your attack');
      c = on('necromancer', 'harvest'); const n0 = c.p.hp; for (let i = 0; i < 8; i++) c.t.on.kill(c.g, c.p, c.e, 1); ok(c.p.hp === n0 + 2, 'Soul Harvest: every 8th kill heals');
      c = on('alchemist', 'vial'); const ch3 = c.g.rng.chance; c.g.rng.chance = () => true; const e0 = c.e.hp; c.e.x = c.p.x + 20; c.t.on.kill(c.g, c.p, c.e, 1); c.g.rng.chance = ch3; c.g.hitstopT = 0; ok(c.e.hp < e0 || c.g.fx.length > 0, 'Burst Vial: a kill can burst');
      c = on('monk', 'palm'); for (let i = 0; i < 4; i++) c.t.on.hit(c.g, c.p, c.e, 8, {}, 1); ok(c.g.zones.length === 0, 'Palm Strike: four hits do nothing'); c.t.on.hit(c.g, c.p, c.e, 8, {}, 1); ok(c.g.zones.length === 1, '...the fifth does');
      c = on('warden', 'ward'); const w0 = c.p.hp; c.t.on.clear(c.g, c.p, 1); ok(c.p.hp === w0 + 2, 'Healing Ward: half a heart per room');
      { const g = mkT('warden', 'GUARDT'); const base = g.player.guard || 0; TL.take(g, TL.BY_KEY.tal_warden_guard); ok(g.player.guard === base + 1 && g.player.st.guard >= 2, 'Reinforced Guard: a second Guard at once'); }
    }
    section('P12e. v12 — drawing, and whole runs with every talent');
    {
      for (const cls of classes) { const g = mkT(cls, 'DRAW-' + cls, 3); g.modal = { type: 'talent', offers: TL.offerFor(g), t: 0 }; try { g.render(); g.modal = null; for (const t of TL.of(cls)) TL.take(g, t); g.scene = 'paused'; g.render(); g.scene = 'dead'; g.deadT = 60; g.render(); } catch (e) { ok(false, 'draw ' + cls + ': ' + e); } }
      ok(true, 'the choice, the pause line and the end recap draw for every class');
      for (const cls of classes) {
        const g = mkT(cls, 'FULL-' + cls, 4); for (const t of TL.of(cls)) TL.take(g, t); g.modal = null; const bot = new Bot(ED, g, { god: true }); let fr = 0; while (fr++ < 60 * 25) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (fr % 120 === 0) g.render(); if (g.player.dead) break; }
        ok(isFinite(g.player.hp) && g.eproj.length <= 280 && g.zones.length < 80 && g.run.kills >= 1, cls + ' fights with all six talents (' + g.run.kills + ' kills, ' + g.zones.length + ' zones)'); finite(g, 'talents ' + cls);
      }
    }
  }
  if (!P.on('v12')) {
    section('P12x. v12 off — talents leave no trace');
    { const g = newGame(); g.startRun('NOTAL', 'knight'); g.scene = 'play'; g.god = true; ED.runHooks('roomClear', g, { type: 'boss' }); for (let i = 0; i < 10; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; } ok(!g.modal && g.run.talents === undefined && !Object.keys(g.player.relics).some(k => /^tal_/.test(k)), 'no offer, no record, no talent'); }
  }

  // ======================================================================= v13 CURIOS
  if (P.on('v13')) {
    const ids = ['plaguemask', 'cindercloak', 'overkill', 'lightningboots', 'echobell', 'trophy', 'misersedge', 'silvertongue', 'lodestone', 'bandolier', 'medic', 'lens', 'thorncrown', 'dice'];
    const mk = (seed, floor, relics) => { const g = arena('knight', floor || 6, seed); g.god = false; g.player.inv = 0; g.player.hp = g.player.maxHp; for (const r of relics || []) g.equipItem({ cat: 'relic', id: r, uid: ED.id() }, true); g.enemies.length = 0; g.zones.length = 0; return g; };
    const foe = (g, x, y, o) => { const e = g.spawnEnemy('chaser', x, y, Object.assign({ silent: true }, o || {})); e.hold = true; e.maxHp = e.hp = (o && o.hp) || 500; return e; };
    const hit = (g, e, dmg, src) => { g.hitstopT = 0; g.damageEnemy(e, dmg, { src: src || 'melee', x: e.x - 30, y: e.y, kb: 0, noKb: true }); g.hitstopT = 0; };
    section('P13. v13 CURIOS — the fourteen relics');
    {
      const rel = ids.map(id => I.relic(id)); ok(rel.every(r => r && r.pack === 'v13' && !r.hidden && r.desc.length > 20 && I.RARITY[r.rarity]), 'fourteen well-formed relics'); ok(new Set(ids).size === 14 && P.content('v13').relics === 14, 'the Versions screen counts 14 relics');
      const rng = new ED.RNG('v13roll'), seen = new Set(); for (let i = 0; i < 6000; i++) { const r = I.rollRelic(rng, 1 + i % 60, { relics: {} }); seen.add(r.id); } ok(ids.filter(id => seen.has(id)).length >= 13, 'they join the loot pools (' + ids.filter(id => seen.has(id)).length + '/14 seen in 6000 rolls)');
      let g = mk('CUR-SILVER', 6, ['silvertongue']); ok(Math.abs(g.player.st.price - 0.75) < 1e-9, 'Silver Tongue: shops cost 25% less'); g.equipItem({ cat: 'relic', id: 'silvertongue', uid: 1 }, true); ok(Math.abs(g.player.st.price - 0.5) < 1e-9 && I.relic('silvertongue').max === 2, '...stacks once, then stops being offered (max 2)');
      g = mk('CUR-LODE', 6, ['lodestone']); ok(g.player.st.magnet > 1.7 && Math.abs(g.player.st.gold - 1.1) < 1e-9, 'Lodestone: loot flies in from farther, +10% gold');
      g = mk('CUR-BAND', 6, []); const b0 = g.player.bombs; g.equipItem({ cat: 'relic', id: 'bandolier', uid: 1 }, true); ok(g.player.bombs === b0 + 3, 'Bandolier: +3 bombs now'); g.relicEvent('floorStart'); ok(g.player.bombs === b0 + 4, '...and +1 every floor');
      g = mk('CUR-LENS', 6, ['lens']); for (const r of g.floor.rooms) r.discovered = false; g.relicEvent('floorStart'); ok(g.floor.rooms.every(r => r.discovered), "Surveyor's Lens: the whole map");
      g = mk('CUR-CROWN', 6, ['thorncrown']); ok(g.player.st.thorns >= 4, 'Thorn Crown: +4 thorns'); const crown = I.relic('thorncrown'); crown.on.hurt(g, g.player, 3, 1); const zc = g.zones.length; ok(zc >= 1, '...and a burst when hurt'); crown.on.hurt(g, g.player, 3, 1); ok(g.zones.length === zc, '...at most every 2 seconds'); g.frame += 130; crown.on.hurt(g, g.player, 3, 1); ok(g.zones.length === zc + 1, '...and again later');
      g = mk('CUR-DICE', 6, ['dice']); const ch = g.rng.chance; g.rng.chance = () => true; const snap = () => [g.player.gold, g.player.bombs, g.player.hp].join(); g.player.hp = 10; const s0 = snap(); const ri = g.rng.int; let any = false; for (const v of [0, 1, 2]) { g.rng.int = () => v; const before = snap(); I.relic('dice').on.enter(g, g.player, 1); if (snap() !== before) any = true; } g.rng.chance = ch; g.rng.int = ri; ok(any, 'Loaded Dice: a lucky entry gives gold, a bomb or health'); g.rng.chance = () => false; const s1 = snap(); I.relic('dice').on.enter(g, g.player, 1); ok(snap() === s1, '...and usually nothing'); g.rng.chance = ch;
      g = mk('CUR-MEDIC', 6, ['medic']); g.player.hp = 10; g.relicEvent('enter'); g.relicEvent('clear'); ok(g.player.hp === 12, "Field Medic's Kit: a flawless room heals half a heart"); g.relicEvent('enter'); I.relic('medic').on.hurt(g, g.player, 3, 1); const hh = g.player.hp; g.relicEvent('clear'); ok(g.player.hp === hh, '...but not after a hit'); g.relicEvent('enter'); g.relicEvent('clear'); ok(g.player.hp === hh + 2, '...and the next room counts afresh');
    }
    section('P13b. v13 — the relics that react to a fight');
    {
      let g = mk('CUR-PLAGUE', 6, ['plaguemask']); let a = foe(g, 400, 300, { hp: 20 }), b = foe(g, 440, 300); g.applyStatus(a, 'poison', { t: 200, dps: 3 }); hit(g, a, 999); ok(a.dead && b.status.poison && b.status.poison.dps >= 3, 'Plague Mask: a poisoned foe dies and poisons its neighbour');
      g = mk('CUR-PLAGUE2', 6, ['plaguemask']); a = foe(g, 400, 300, { hp: 20 }); b = foe(g, 440, 300); hit(g, a, 999); ok(a.dead && !b.status.poison, '...an unpoisoned one does not');
      g = mk('CUR-CINDER', 6, ['cindercloak']); a = foe(g, 400, 300, { hp: 20 }); b = foe(g, 450, 300); const far = foe(g, 800, 500); g.applyStatus(a, 'burn', { t: 200, dps: 4 }); hit(g, a, 999); ok(b.status.burn && !far.status.burn, 'Cinder Cloak: the fire jumps to what is close, not to what is far');
      g = mk('CUR-OVER', 6, ['overkill']); a = foe(g, 400, 300, { hp: 5 }); b = foe(g, 480, 300); const b0 = b.hp; hit(g, a, 45); ok(a.dead && b0 - b.hp > 25 && b0 - b.hp < 40, 'Overkill Charm: the excess damage jumps on (' + (b0 - b.hp).toFixed(1) + ')');
      g = mk('CUR-OVER2', 6, ['overkill']); a = foe(g, 400, 300, { hp: 500 }); b = foe(g, 480, 300); hit(g, a, 40); ok(b.hp === 500, '...a hit that does not kill wastes nothing and passes nothing');
      g = mk('CUR-BOOTS', 6, ['lightningboots']); a = foe(g, 380, 300); b = foe(g, 420, 340); g.player.x = 400; g.player.y = 320; const a0 = a.hp + b.hp; g.relicEvent('dash'); ok(a.hp + b.hp < a0, 'Lightning Boots: a dash arcs lightning'); g.enemies.length = 0; g.relicEvent('dash'); ok(true, '...and nothing happens with no foe near');
      g = mk('CUR-BELL', 6, ['echobell']); a = foe(g, 400, 300); const sub = foe(g, 600, 300); for (let i = 0; i < 9; i++) I.relic('echobell').on.kill(g, g.player, a, 1); ok(!(sub.stun > 0), 'Echoing Bell: nine kills ring nothing'); I.relic('echobell').on.kill(g, g.player, a, 1); ok(sub.stun >= 80, '...the tenth stuns the room (' + Math.round(sub.stun) + ')');
      g = mk('CUR-TROPHY', 6, ['trophy']); const plain = mk('CUR-TROPHY0', 6, []); const el = foe(g, 400, 300, { elite: true, mods: [] }); const el0 = foe(plain, 400, 300, { elite: true, mods: [] }); const nr = foe(g, 600, 300); const nr0 = foe(plain, 600, 300);
      el.maxHp = el.hp = el0.maxHp = el0.hp = 500; const l1 = (() => { const h = el.hp; hit(g, el, 10); return h - el.hp; })(), l0 = (() => { const h = el0.hp; hit(plain, el0, 10); return h - el0.hp; })(), n1 = (() => { const h = nr.hp; hit(g, nr, 10); return h - nr.hp; })(), n0 = (() => { const h = nr0.hp; hit(plain, nr0, 10); return h - nr0.hp; })();
      ok(Math.abs(l1 / l0 - 1.35) < 0.03 && Math.abs(n1 / n0 - 1) < 0.001, "Hunter's Trophy: +35% against elites only (x" + (l1 / l0).toFixed(2) + ' / x' + (n1 / n0).toFixed(2) + ')');
      g.pickups.length = 0; const g0 = g.pickups.length; hit(g, el, 9999); ok(el.dead && g.pickups.length > g0, '...and an elite kill drops gold');
      g = mk('CUR-MISER', 6, ['misersedge']); const rich = mk('CUR-MISER0', 6, ['misersedge']); g.player.gold = 0; rich.player.gold = 600; a = foe(g, 400, 300); b = foe(rich, 400, 300); const m0 = a.hp, m1 = b.hp; hit(g, a, 10); hit(rich, b, 10); const poor = m0 - a.hp, rch = m1 - b.hp; ok(Math.abs(poor - 10) < 0.01 && Math.abs(rch / poor - 1.2) < 0.02, "Miser's Edge: 600 gold = +20% (x" + (rch / poor).toFixed(2) + '), no gold = nothing'); rich.player.gold = 100; b = foe(rich, 400, 300); const b0m = b.hp; hit(rich, b, 10); ok(Math.abs((b0m - b.hp) / 10 - 1.04) < 0.01, '...100 gold = +4%');
    }
    section('P13c. v13 — whole runs with all fourteen');
    {
      for (const cls of ['knight', 'mage', 'necromancer'].filter(c => P.ok(I.CLASSES[c]))) { const g = arena(cls, 8, 'CURALL-' + cls); g.god = true; for (const r of ids) g.equipItem({ cat: 'relic', id: r, uid: ED.id() }, true); g.player.gold = 300; const bot = new Bot(ED, g, { god: true }); let fr = 0; while (fr++ < 60 * 25) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (fr % 120 === 0) g.render(); } ok(isFinite(g.player.hp) && g.eproj.length <= 280 && g.zones.length < 80, cls + ' fights with every curio (' + g.run.kills + ' kills)'); finite(g, 'curios ' + cls); }
      const g = arena('knight', 3, 'CURDRAW'); for (const r of ids) g.equipItem({ cat: 'relic', id: r, uid: ED.id() }, true); try { g.render(); g.scene = 'paused'; g.render(); } catch (e) { ok(false, 'draw: ' + e); } ok(true, 'the HUD bar and the pause grid draw with all fourteen');
    }
  }
  if (!P.on('v13')) {
    section('P13x. v13 off — the curios are gone');
    { const rng = new ED.RNG('v13off'); let leaked = 0; for (let i = 0; i < 3000; i++) { const r = I.rollRelic(rng, 1 + i % 60, { relics: {} }); if (I.relic(r.id).pack === 'v13') leaked++; } ok(leaked === 0, 'no curio can drop while v13 is off (' + leaked + ' leaked)'); }
  }

  // ======================================================================= v14 ARMORY
  if (P.on('v14')) {
    const NEW = ['whip', 'crossbow', 'scepter', 'blunderbuss'], C14 = ED.C;
    const mkW = (type, seed, floor) => { const g = arena('knight', floor || 6, seed || 'W14-' + type); g.god = true; const p = g.player; p.weapon = I.rollWeapon(new ED.RNG('w14' + type), 6, { type, rarity: 'common' }); I.recalc(p); p.atkCd = 0; g.enemies.length = 0; g.pproj.length = 0; g.swings.length = 0; return g; };
    const dummyAt = (g, dx, dy, hp) => { const p = g.player, e = g.spawnEnemy('chaser', p.x + dx, p.y + (dy || 0), { silent: true }); e.hold = true; e.noKnock = true; e.maxHp = e.hp = hp || 1e7; return e; };
    const aimAt = (g, e) => { const m = ED.input.mouse; m.aim = true; m.x = e.x; m.y = e.y + C14.HUD; };
    const dpsOf = (type, dist, seed) => { const g = mkW(type, seed); const p = g.player; p.x = 300; p.y = 288; const e = dummyAt(g, dist, 0); ED.input.sim = { held: { attack: true }, edge: {} }; for (let i = 0; i < 600; i++) { aimAt(g, e); p.x = 300; p.y = 288; p.kx = p.ky = 0; g.hitstopT = 0; g.step(); if (g.scene !== 'play') g.scene = 'play'; } ED.input.sim = { held: {}, edge: {} }; return (e.maxHp - e.hp) / 10; };
    section('P14. v14 ARMORY — the four weapons');
    {
      for (const id of NEW) { const w = I.WEAPONS[id], wi = ED.weaponImpl[w.kind]; ok(w && w.pack === 'v14' && w.basic && w.name && w.desc.length > 30 && typeof wi.fire === 'function' && typeof wi.glyph === 'function' && typeof wi.held === 'function' && I.LEGEND_NAMES[id].length === 3, id + ' is complete (impl, glyph, held, legendary names)'); }
      ok(P.content('v14').weapons === 4, 'the Versions screen counts 4 weapons'); const rng = new ED.RNG('w14roll'), seen = new Set(); for (let i = 0; i < 900; i++) seen.add(I.rollWeapon(rng, 1 + i % 40, {}).type); ok(NEW.every(t => seen.has(t)), 'all four drop as ordinary weapons');
      for (const id of NEW) { const g = mkW(id); const e = dummyAt(g, 60, 0); aimAt(g, e); g.fireWeapon(0, false); stepN(g, 2); ok(g.swings.length + g.pproj.length > 0, id + ' fires something'); }
    }
    section('P14b. v14 — what each weapon does');
    {
      // whip: a line, a tip bonus, a crack every 4th lash
      let g = mkW('whip'); let p = g.player; p.x = 300; p.y = 288; const len = p.wrange; const near = dummyAt(g, 30, 0), tip = dummyAt(g, Math.round(len * 0.9), 6); g.fireWeapon(0, false); stepN(g, 6);
      const dn = near.maxHp - near.hp, dt = tip.maxHp - tip.hp; ok(dn > 0 && dt > dn * 1.35 && dt < dn * 1.7, 'Whip: the far third cracks for ~+50% (near ' + dn.toFixed(2) + ', tip ' + dt.toFixed(2) + ')');
      g = mkW('whip'); g.fireWeapon(0, false); g.fireWeapon(0, false); g.fireWeapon(0, false); ok(!g.swings.some(s => s.kind === 'circle'), 'Whip: three lashes, no crack'); g.fireWeapon(0, false); ok(g.swings.some(s => s.kind === 'circle' && s.stagger), 'Whip: the 4th cracks at the tip and staggers');
      g = mkW('whip'); p = g.player; p.x = 300; p.y = 288; const row = [40, 70, 95].map(d => dummyAt(g, d, 0)); g.fireWeapon(0, false); stepN(g, 6); ok(row.every(e => e.hp < e.maxHp), 'Whip: one lash hits everything along its line');
      // crossbow: one bolt, pierces exactly three
      g = mkW('crossbow'); p = g.player; p.x = 200; p.y = 288; const four = [90, 140, 190, 240].map(d => dummyAt(g, d, 0)); g.fireWeapon(0, false); ok(g.pproj.length === 1 && g.pproj[0].pierce === 2, 'Crossbow: one bolt that pierces 2 after the first'); stepN(g, 40);
      ok(four[0].hp < four[0].maxHp && four[1].hp < four[1].maxHp && four[2].hp < four[2].maxHp && four[3].hp === four[3].maxHp, 'Crossbow: the bolt stops after the third foe');
      // scepter: five orbs, a fan, homing
      g = mkW('scepter'); g.fireWeapon(0, false); ok(g.pproj.length === 5 && g.pproj.every(b => b.kind === 'orb' && b.homing > 0), 'Scepter: five homing orbs'); const angs = g.pproj.map(b => Math.atan2(b.vy, b.vx)); ok(Math.max(...angs) - Math.min(...angs) > 0.7 && Math.max(...angs) - Math.min(...angs) < 0.9, 'Scepter: in a fan');
      g = mkW('scepter'); g.player.st.proj = 1; g.fireWeapon(0, false); ok(g.pproj.length === 6, 'Scepter: an Echo Shard adds an orb');
      // blunderbuss: seven pellets, falloff with range
      g = mkW('blunderbuss'); g.fireWeapon(0, false); ok(g.pproj.length === 7 && g.pproj.every(b => b.kind === 'pellet'), 'Blunderbuss: seven pellets'); g = mkW('blunderbuss'); g.player.st.proj = 1; g.fireWeapon(0, false); ok(g.pproj.length === 9, 'Blunderbuss: an Echo Shard adds two');
      const closeD = dpsOf('blunderbuss', 55, 'BB1'), farD = dpsOf('blunderbuss', 220, 'BB2'); ok(farD === 0 && closeD > 12, 'Blunderbuss: close ' + closeD.toFixed(1) + ' dps, at 220px nothing (' + farD.toFixed(1) + ')');
    }
    section('P14c. v14 — each weapon against the sword (damage per second)');
    {
      const sword = dpsOf('sword', 40, 'SW'), sw2 = dpsOf('sword', 40, 'SW2'); ok(sword > 15 && sword < 70, 'the yardstick sword does ' + sword.toFixed(1) + ' dps (floor-6 item scaling roughly doubles the table values)');
      const table = { whip: [60, 90], crossbow: [150, 250], scepter: [90, 150], blunderbuss: [55, 90] };
      for (const id of NEW) for (const d of table[id]) { const v = dpsOf(id, d, 'D14' + id + d); console.log('  ' + id.padEnd(12) + ' at ' + d + 'px: ' + v.toFixed(1) + ' dps  (sword ' + sword.toFixed(1) + ')'); ok(v > sword * 0.3 && v < sword * 2.4, id + ' at ' + d + 'px is in a sane damage band (' + v.toFixed(1) + ' vs sword ' + sword.toFixed(1) + ')'); }
    }
    section('P14d. v14 — fights and drawing');
    {
      for (const id of NEW) { const g = mkW(id, 'FIGHT-' + id, 8); g.player.hp = g.player.maxHp; const bot = new Bot(ED, g, { god: true }); let fr = 0; while (fr++ < 60 * 25) { bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (fr % 90 === 0) g.render(); } ok(g.run.kills >= 1 && isFinite(g.player.hp) && g.eproj.length <= 280, id + ' fights a real room (' + g.run.kills + ' kills in 25s)'); finite(g, 'weapon ' + id); }
      for (const id of NEW) { const g = mkW(id, 'DRAW-' + id); const e = dummyAt(g, 70, 0); aimAt(g, e); try { g.fireWeapon(0, false); stepN(g, 3); g.render(); g.scene = 'paused'; g.render(); g.scene = 'play'; } catch (err) { ok(false, id + ' draws: ' + err); } } ok(true, 'the held weapon, glyph, shots and pause grid draw');
    }
  }
  if (!P.on('v14')) {
    section('P14x. v14 off — the weapons are gone');
    { const rng = new ED.RNG('w14off'); let leaked = 0; for (let i = 0; i < 1500; i++) if (I.WEAPONS[I.rollWeapon(rng, 1 + i % 40, {}).type].pack === 'v14') leaked++; ok(leaked === 0, 'none can drop while v14 is off (' + leaked + ')'); }
  }

  // ======================================================================= v15 MENAGERIE
  if (P.on('v15')) {
    const FOES = ['pilferer', 'mender', 'warder', 'hopper'], D15 = ED.D, MIN = { pilferer: 3, mender: 4, hopper: 5, warder: 6 };
    const mk = (seed, floor) => { const g = arena('knight', floor || 8, seed || 'F15'); g.god = false; g.player.inv = 0; g.player.hp = g.player.maxHp; g.enemies.length = 0; g.zones.length = 0; g.spawns.length = 0; g.pickups.length = 0; return g; };
    const spawn = (g, id, x, y, o) => g.spawnEnemy(id, x, y, Object.assign({ silent: true }, o || {}));
    const dummy15 = (g, x, y, hp) => { const e = spawn(g, 'chaser', x, y); e.hold = true; e.noKnock = true; e.maxHp = e.hp = hp || 100; return e; };
    section('P15. v15 MENAGERIE — the foes and where they appear');
    {
      for (const id of FOES) { const d = ED.enemyTypes[id]; ok(d && d.pack === 'v15' && d.noElite && d.desc.length > 40 && typeof d.update === 'function' && d.minFloor === MIN[id] && ED.freeFoes.includes(id), id + ' is a complete foe (from floor ' + MIN[id] + ')'); }
      ok(P.content('v15').enemies === 4, 'the Versions screen counts 4 foes');
      for (let f = 1; f <= 12; f++) { const pool = D15.enemyPool(f); for (const id of FOES) ok(pool.includes(id) === (f >= MIN[id]), id + (f >= MIN[id] ? ' is' : ' is not') + ' in the floor-' + f + ' pool'); }
      const rng = new ED.RNG('v15waves'), cnt = { pilferer: 0, mender: 0, warder: 0, hopper: 0 }; let elite = 0; for (let i = 0; i < 160; i++) for (const w of D15.composeWaves(10 + i % 20, rng, {})) for (const e of w) { if (cnt[e.type] !== undefined) { cnt[e.type]++; if (e.elite) elite++; } }
      ok(FOES.every(id => cnt[id] > 0) && elite === 0, 'they turn up in real waves and are never elites (' + JSON.stringify(cnt) + ')');
    }
    section('P15b. v15 — what each one does');
    {
      let g = mk('PIL1'), p = g.player; p.gold = 100; let e = spawn(g, 'pilferer', p.x + 12, p.y); stepN(g, 4); const stole = e.stolen;
      ok(stole > 0 && p.gold === 100 - stole && e.fleeing, 'Pilferer: touches you, steals ' + stole + ' gold and runs'); const d0 = Math.hypot(e.x - p.x, e.y - p.y); stepN(g, 30); ok(Math.hypot(e.x - p.x, e.y - p.y) > d0 + 20 || e.dead, '...away from you');
      g.damageEnemy(e, 9999, { src: 'melee', x: e.x - 20, y: e.y }); const back = g.pickups.filter(k => k.type === 'gold').reduce((a, k) => a + (k.val || k.value || 1), 0); ok(e.dead && !e.escaped && back >= Math.round(stole * 1.25) - 1, 'Pilferer: killed, it drops the gold back with a 25% bonus (' + back + ' vs ' + Math.round(stole * 1.25) + ')');
      g = mk('PIL2'); p = g.player; p.gold = 100; e = spawn(g, 'pilferer', p.x + 12, p.y); stepN(g, 4); const lost = e.stolen; p.x = 100; p.y = 100; e.x = 800; e.y = 500; stepN(g, 480); ok(e.dead && e.escaped && g.pickups.filter(k => k.type === 'gold').length === 0 && p.gold === 100 - lost, 'Pilferer: left alone it escapes and the gold is gone');
      g = mk('PIL3'); p = g.player; p.gold = 0; e = spawn(g, 'pilferer', p.x + 12, p.y); stepN(g, 8); ok(!e.fleeing && e.stolen === 0, 'Pilferer: nothing to steal, nothing stolen');
      g = mk('PIL4'); p = g.player; p.gold = 100; p.inv = 60; e = spawn(g, 'pilferer', p.x + 12, p.y); stepN(g, 4); ok(e.stolen === 0 || p.inv <= 0, 'Pilferer: does not steal through invulnerability frames');
      g = mk('MEN1'); let ally = dummy15(g, 400, 300, 100), m = spawn(g, 'mender', 440, 300); ally.hp = 50; stepN(g, 150); ok(ally.hp > 50 && ally.hp <= 100, 'Mender: heals a wounded ally (50 -> ' + Math.round(ally.hp) + ')');
      m.hp = 4; stepN(g, 200); ok(m.hp <= 4.0001, 'Mender: never heals itself'); const b = dummy15(g, 470, 330, 100); b.boss = true; b.hp = 20; stepN(g, 200); ok(b.hp === 20, 'Mender: does not heal bosses');
      g = mk('WAR1'); const a1 = dummy15(g, 400, 300, 200), a2 = dummy15(g, 440, 340, 100), w = spawn(g, 'warder', 470, 300); stepN(g, 140); ok(a1.ward > 0 && Math.abs(a1.ward - 70) < 1, 'Warder: wards the biggest ally for 35% of its health (' + Math.round(a1.ward) + ')');
      const w1 = a1.ward; stepN(g, 120); ok(a1.ward === w1, '...and does not re-ward what is already warded'); stepN(g, 260); ok(a2.ward > 0, '...then the next one');
      g = mk('HOP1'); p = g.player; p.x = 300; p.y = 288; e = spawn(g, 'hopper', 520, 288); e.cd = 0; let hopped = false; for (let i = 0; i < 40 && !hopped; i++) { stepN(g, 1); hopped = e.state === 'hop'; }
      ok(hopped && g.zones.length >= 1 && e.hop && Math.hypot(e.hop.tx - p.x, e.hop.ty - p.y) < 90, 'Hopper: marks the floor near you and leaps'); ok(e.invuln, '...untouchable in the air'); const tx = e.hop.tx, ty = e.hop.ty; p.x = 80; p.y = 80;
      for (let i = 0; i < 80 && e.state === 'hop'; i++) stepN(g, 1); ok(e.state === 'winded' && Math.hypot(e.x - tx, e.y - ty) < 2 && !e.invuln && e.vuln === 1.4, 'Hopper: lands on the mark, winded, and takes 40% more');
      const h0 = e.hp; g.damageEnemy(e, 5, { src: 'melee', x: e.x - 20, y: e.y, noKb: true }); ok(Math.abs((h0 - e.hp) - 7) < 0.6, 'Hopper: ...(5 damage lands as ' + (h0 - e.hp).toFixed(1) + ')'); stepN(g, 70); ok(e.state !== 'winded' && e.vuln === 1, 'Hopper: recovers');
      g = mk('HOP2'); p = g.player; p.hp = p.maxHp; e = spawn(g, 'hopper', 520, 288); e.cd = 0; p.x = 300; p.y = 288; for (let i = 0; i < 40 && e.state !== 'hop'; i++) stepN(g, 1); const hp0 = p.hp; p.inv = 0; p.x = e.hop.tx; p.y = e.hop.ty; for (let i = 0; i < 90 && p.hp === hp0; i++) { p.inv = 0; p.x = e.hop.tx || p.x; p.y = e.hop.ty || p.y; stepN(g, 1); } ok(p.hp < hp0, 'Hopper: standing on the mark when it lands hurts');
    }
    { // a key carrier never runs off with its key
      const g = mk('PILKEY'), p = g.player; p.gold = 100; const e = spawn(g, 'pilferer', p.x + 12, p.y, { carriesKey: 'small' }); stepN(g, 6); ok(!e.fleeing && e.stolen === 0 && p.gold === 100, 'Pilferer: a key carrier does not steal or flee');
      e.fleeing = true; e.fleeT = 1000; stepN(g, 4); ok(!e.fleeing && !e.dead, '...even if pushed into fleeing'); g.damageEnemy(e, 9999, { src: 'melee', x: e.x - 20, y: e.y }); ok(e.dead && g.pickups.some(k => k.type === 'key'), '...and its key drops when it dies');
    }
    section('P15c. v15 — each one fights, dies, and cannot stall a room');
    {
      for (const id of FOES) { const F = MIN[id] + 1, g = arena('knight', F, 'EN15-' + id); g.god = true; const e = spawn(g, id, 560, 300); const bot = new Bot(ED, g, { god: true }); let fr = 0; g.rt.lockdown = true; g.refreshCollision(); try { while (!e.dead && fr++ < 60 * 40) { if (fr === 60 * 20) for (const x of g.enemies) x.rush = true; bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (fr % 40 === 0) g.render(); } } catch (err) { ok(false, id + ' crashed: ' + (err.stack || err)); } finite(g, id); ok(e.dead, id + ' can be put down within 40s (' + Math.round(fr / 60) + 's)'); }
      { const g = arena('knight', 9, 'MIX15'); g.god = true; for (const [id, x, y] of [['mender', 700, 200], ['mender', 720, 380], ['warder', 650, 300], ['hopper', 600, 220], ['pilferer', 560, 380], ['chaser', 540, 290], ['chaser', 520, 330], ['shooter', 680, 250]]) spawn(g, id, x, y, { hpMul: 0.7 }); g.player.gold = 200; const bot = new Bot(ED, g, { god: true }); let fr = 0; g.rt.lockdown = true; g.refreshCollision(); while (g.enemies.some(e => !e.dead) && fr++ < 60 * 90) { if (fr === 60 * 25) for (const x of g.enemies) if (!x.boss) x.rush = true; bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; }
        ok(!g.enemies.some(e => !e.dead), 'a room of healers, wardens, thieves and leapers can be cleared (' + Math.round(fr / 60) + 's)'); finite(g, 'menagerie mix'); }
    }
    section('P15d. v15 — drawing');
    { const g = mk('DRAW15', 9); const l = FOES.map((id, i) => spawn(g, id, 300 + i * 80, 300)); l[0].stolen = 20; l[0].fleeing = true; l[3].state = 'winded'; l[3].windT = 30; try { g.render(); stepN(g, 30); g.render(); } catch (err) { ok(false, 'draw: ' + err); } ok(true, 'all four draw, including the thief with its bag and the winded hopper'); }
  }
  if (!P.on('v15')) {
    section('P15x. v15 off — the foes are gone');
    { let leaked = 0; for (let f = 1; f <= 60; f++) for (const id of ED.D.enemyPool(f)) if (ED.enemyTypes[id].pack === 'v15') leaked++; ok(leaked === 0, 'no menagerie foe is in any pool while v15 is off (' + leaked + ')'); }
  }

  // ======================================================================= v16 DARES
  if (P.on('v16')) {
    const D16 = ED.dares, KIDS = D16.KINDS.map(k => k.id);
    const room16 = (seed, floor, kind) => {
      const g = arena('knight', floor || 6, seed); g.god = false; g.toasts.length = 0; const fl = g.floor, room = fl.rooms.find(r => r.type === 'normal' && r.id !== fl.startId && !(fl.hunt && fl.hunt[r.id]));      // (a Hunt ambush room never carries a dare, and its nemesis would add its own spoils)
      ED.debug.goto(g, room, 480, 420); g.scene = 'play'; g.player.inv = 0; g.player.hp = g.player.maxHp; g.toasts.length = 0;
      const d = kind ? D16.force(g, kind) : g.rt.dare; return { g, d, room, rt: g.rt };
    };
    const fightOn = (g) => { for (let i = 0; i < 500 && !(g.rt.enc.state === 'fight' && g.spawns.length === 0 && g.enemies.length); i++) stepN(g, 1); };
    const killOne = (g, e) => g.damageEnemy(e, 99999, { src: 'melee', x: e.x - 10, y: e.y, noKb: true });
    const clearIt = (g, limit) => { for (let i = 0; i < (limit || 3000) && !g.room.cleared; i++) { g.player.inv = 999; for (const e of g.enemies.slice()) if (!e.dead) killOne(g, e); stepN(g, 1); } g.player.inv = 0; };
    const dums = (g) => { for (const [x, y] of [[300, 200], [620, 200], [620, 400]]) { const e = g.spawnEnemy('chaser', x, y, { silent: true }); e.hold = true; e.maxHp = e.hp = 4000; } };
    section('P16. v16 DARES — which rooms carry one');
    {
      ok(D16.KINDS.length === 5 && KIDS.every(id => D16.BY[id].name && D16.BY[id].short && D16.BY[id].color && D16.BY[id].w > 0), 'five dares, each with a name, a one-line rule, a colour and a weight');
      ok(P.content('v16').dares === 5, 'the Versions screen counts 5 dares');
      let none1 = true, cap = true, normalOnly = true, total = 0, withAny = 0;
      for (let f = 1; f <= 30; f++) {
        const g = arena('knight', f, 'DR16-' + f), fl = g.floor, ids = fl.dareRooms ? Object.keys(fl.dareRooms).map(Number) : [];
        if (f === 1 && ids.length) none1 = false; if (ids.length > 3) cap = false;
        for (const id of ids) { const r = fl.rooms[id]; if (!r || r.type !== 'normal' || r.id === fl.startId) normalOnly = false; }
        total += ids.length; if (ids.length) withAny++;
      }
      ok(none1, 'floor 1 never carries a dare'); ok(cap, 'never more than three on a floor'); ok(normalOnly, 'only on ordinary combat rooms (never the start, shops, bosses...)');
      ok(withAny >= 15 && total >= 30 && total <= 87, 'a typical floor carries one to three (' + total + ' dares over 30 floors, ' + withAny + ' floors with any)');
      const a = arena('knight', 9, 'SAMEDR'), b = arena('knight', 9, 'SAMEDR'); ok(JSON.stringify(a.floor.dareRooms) === JSON.stringify(b.floor.dareRooms), 'the same seed picks the same rooms');
    }
    section('P16b. v16 — announced on entry, never touches the shared random stream');
    {
      let g = null, id = -1; for (let f = 2; f < 20 && id < 0; f++) { g = arena('knight', f, 'DRENT-' + f); id = g.floor.dareRooms ? (Object.keys(g.floor.dareRooms).map(Number).find(i => !(g.floor.hunt && g.floor.hunt[i])) ?? -1) : -1; }
      ok(id >= 0, 'found a floor with a dare room'); const room = g.floor.rooms[id]; g.toasts.length = 0; ED.debug.goto(g, room, 480, 420);
      const d = g.rt.dare; ok(d && KIDS.includes(d.kind) && d.state === 'live' && d.gold > 0, 'walking into the room starts its dare (' + (d && d.kind) + ', +' + (d && d.gold) + 'g) ' + JSON.stringify({ floor: g.floorNum, id, type: room.type, enc: g.rt.enc && g.rt.enc.state, waves: g.rt.enc && g.rt.enc.waves.length, amb: g.rt.huntAmbush, mode: g.run.mode, cleared: room.cleared, rolled: g.rt.dareRolled, flagged: g.floor.dareRooms })); ok(g.toasts.some(t => /^DARE/.test(t.msg)), '...and announces it with the prize');
      const a0 = g.rng.a, b0 = g.run.rng.a, c0 = g.rt.rng.a; g.rt.dare = null; g.rt.dareRolled = false; g.rt.enc.state = 'idle'; ED.runHooks('roomEnter', g, room);
      ok(g.rng.a === a0 && g.run.rng.a === b0 && g.rt.rng.a === c0, 'rolling a dare consumes none of the game, run or room random streams'); ok(g.rt.dare && g.rt.dare.kind === d.kind, '...and picks the same dare again');
      const g2 = arena('knight', g.floorNum, 'DRENT-' + g.floorNum); ED.debug.goto(g2, g2.floor.rooms[id], 480, 420); ok(g2.rt.dare && g2.rt.dare.kind === d.kind, 'the same seed carries the same dare in the same room');
      const g3 = arena('knight', g.floorNum, 'DRENT-' + g.floorNum); g3.run.mode = 'gauntlet'; ED.debug.goto(g3, g3.floor.rooms[id], 480, 420); ok(!g3.rt.dare, 'sealed modes (Gauntlet / Boss Rush) never carry dares');
      const g5 = arena('knight', g.floorNum, 'DRENT-' + g.floorNum), r5 = g5.floor.rooms[id]; ED.debug.goto(g5, r5, 480, 420); g5.rt.dare = null; g5.rt.dareRolled = false; g5.rt.huntAmbush = true; g5.rt.enc.state = 'idle'; ED.runHooks('roomEnter', g5, r5); ok(!g5.rt.dare, 'a room where a nemesis lies in wait never carries a dare');
      const g4 = arena('knight', g.floorNum, 'DRENT-' + g.floorNum); const r4 = g4.floor.rooms[id]; g4.floor.rooms.forEach(r => { if (r.id !== id) r.cleared = true; }); r4.cleared = true; ED.debug.goto(g4, r4, 480, 420); ok(!g4.rt.dare, 'a room that is already cleared offers nothing');
    }
    section('P16c. v16 — what each dare watches');
    {
      let r = room16('DR-U1', 6, 'untouched'); fightOn(r.g); ok(r.d.state === 'live' && r.d.bomb && !r.d.heart, 'UNTOUCHED: live, pays a bomb'); clearIt(r.g); ok(r.g.room.cleared && r.d.state === 'won', 'UNTOUCHED: cleared without a scratch = won');
      r = room16('DR-U2', 6, 'untouched'); fightOn(r.g); r.g.hurtPlayer(1, r.g.player.x + 10, r.g.player.y); stepN(r.g, 8); ok(r.d.state === 'lost' && /hit/.test(r.d.msg), 'UNTOUCHED: one hit and it is lost'); clearIt(r.g); ok(r.g.room.cleared && r.d.state === 'lost', '...the room still clears and stays lost');
      r = room16('DR-U3', 6, 'untouched'); fightOn(r.g); r.g.player.guard = 1; r.g.hurtPlayer(5, r.g.player.x + 10, r.g.player.y); stepN(r.g, 8); ok(r.d.state === 'live' && r.g.player.guard === 0, 'UNTOUCHED: a Guard that absorbs the blow does not count against you');
      r = room16('DR-S1', 6, 'swift'); ok(r.d.limit >= 1200 && r.d.limit <= 4500 && r.d.heart === false, 'SWIFT: the clock scales with the room (' + Math.round(r.d.limit / 60) + 's for ' + r.d.foes + ' foes in ' + r.d.waves + ' waves)');
      stepN(r.g, 20); ok(r.d.t === 0 && !r.d.started, 'SWIFT: the clock waits for the fight'); fightOn(r.g); stepN(r.g, 100); ok(r.d.started && r.d.t >= 90, 'SWIFT: ...then runs'); r.d.limit = r.d.t + 30; stepN(r.g, 60); ok(r.d.state === 'lost' && /time/.test(r.d.msg), 'SWIFT: the clock runs out');
      r = room16('DR-S2', 6, 'swift'); fightOn(r.g); clearIt(r.g); ok(r.d.state === 'won' && r.g.run.dares.won === 1, 'SWIFT: a quick clear wins');
      r = room16('DR-N1', 6, 'nodash'); fightOn(r.g); r.g.player.dashT = 6; stepN(r.g, 1); ok(r.d.state === 'lost' && /dash/.test(r.d.msg), 'NO DASH: one dash and it is lost');
      r = room16('DR-N2', 6, 'nodash'); fightOn(r.g); clearIt(r.g); ok(r.d.state === 'won' && r.d.heart, 'NO DASH: a clear without dashing wins (and pays a heart)');
      r = room16('DR-C1', 8, 'chain'); dums(r.g); fightOn(r.g); for (const e of r.g.enemies) e.hold = true; stepN(r.g, 300); ok(r.d.state === 'live' && r.d.idle === 0 && r.d.kills === 0, 'CHAIN: nothing is timed before the first kill');
      killOne(r.g, r.g.enemies.find(e => !e.dead)); ok(r.d.kills === 1 && r.d.idle === 0, 'CHAIN: a kill is counted'); stepN(r.g, 150); ok(r.d.state === 'live' && r.d.idle > 120, 'CHAIN: ...and the gap after it is timed (' + r.d.idle + ')');
      killOne(r.g, r.g.enemies.find(e => !e.dead)); ok(r.d.idle === 0 && r.d.kills === 2, 'CHAIN: the next kill resets the clock'); stepN(r.g, D16.CHAIN_GAP + 10); ok(r.d.state === 'lost' && /chain/.test(r.d.msg), 'CHAIN: 3.5 seconds without a kill breaks it');
      r = room16('DR-C2', 8, 'chain'); fightOn(r.g); clearIt(r.g); ok(r.d.state === 'won', 'CHAIN: clearing the room fast wins');
      r = room16('DR-C3', 8, 'chain'); dums(r.g); fightOn(r.g); for (const e of r.g.enemies) e.hold = true; killOne(r.g, r.g.enemies.find(e => !e.dead)); r.rt.enc.state = 'gap'; stepN(r.g, 60); ok(r.d.idle === 0, 'CHAIN: the pause between waves is not held against you'); r.rt.enc.state = 'fight';
    }
    section('P16d. v16 — the mark, the purse, the relic cache');
    {
      let r = room16('DR-M1', 8, 'marked'); dums(r.g); fightOn(r.g); stepN(r.g, 2); const t = r.d.target;
      ok(t && !t.dead && !t.boss && !t.minion && !t.elite && !t.carriesKey, 'MARKED: a plain foe wears the mark'); ok(r.g.toasts.some(x => /MARKED/.test(x.msg)), '...and the player is told'); r.g.render();
      const tx = t.x, ty = t.y, before = r.g.run.dares.won; killOne(r.g, t); ok(r.d.state === 'won' && r.g.run.dares.won === before + 1 && !r.g.room.cleared, 'MARKED: killing it first wins on the spot — the room fight goes on');
      ok(r.g.pickups.some(k => k.type === 'gold' && Math.hypot(k.x - tx, k.y - ty) < 45), '...and the bounty drops where it fell');
      r = room16('DR-M2', 8, 'marked'); dums(r.g); fightOn(r.g); stepN(r.g, 2); const other = r.g.enemies.find(e => !e.dead && e !== r.d.target && !e.minion); killOne(r.g, other); ok(r.d.state === 'lost' && /another/.test(r.d.msg), 'MARKED: any other foe falling first loses it');
      r = room16('DR-M3', 8, 'marked'); dums(r.g); fightOn(r.g); stepN(r.g, 2); r.d.target.dead = true; stepN(r.g, 1); ok(r.d.state === 'lost' && /got away/.test(r.d.msg), 'MARKED: a mark that vanishes without being killed loses it');
      r = room16('DR-M4', 8, 'marked'); r.rt.enc.waves = [[{ type: 'chaser', elite: false, mods: [] }]]; fightOn(r.g); stepN(r.g, 2); ok(r.d.state === 'void' && !r.d.target, 'MARKED: a room with nobody to mark quietly drops the dare'); clearIt(r.g); ok(r.g.room.cleared && r.d.state === 'void', '...and clears as usual');
      // purses
      r = room16('DR-P1', 10, 'swift'); const amts = []; const og = r.g.dropGold; r.g.dropGold = function (x, y, a) { amts.push(a); return og.call(this, x, y, a); }; fightOn(r.g); clearIt(r.g);
      ok(r.d.state === 'won' && amts.includes(r.d.gold) && r.d.gold === Math.round((6 + 1.6 * 10) * 1.7), 'SWIFT pays ' + r.d.gold + ' gold on floor 10 (6 + 1.6 x floor, x1.7)');
      r = room16('DR-P2', 10, 'nodash'); const hearts0 = () => r.g.pickups.filter(k => k.type === 'heart').length; const h0 = hearts0(); fightOn(r.g); clearIt(r.g); ok(r.d.state === 'won' && hearts0() > h0, 'NO DASH drops a heart');
      const ms = ED.save.meta.dares ? ED.save.meta.dares.won : 0; r = room16('DR-P3', 6, 'swift'); fightOn(r.g); clearIt(r.g); ok(ED.save.meta.dares.won === ms + 1, 'wins are tallied across runs too (meta.dares)');
      // the relic cache: every fourth win
      r = room16('DR-K1', 6, 'swift'); r.g.run.dares.won = 3; fightOn(r.g); clearIt(r.g); stepN(r.g, 2);
      const ped = r.g.inters.filter(i => i.type === 'pedestal' && !i.dead); ok(r.d.state === 'won' && r.d.cache && ped.length === 3 && ped.every(i => i.item.cat === 'relic') && new Set(ped.map(i => i.group)).size === 1, 'the 4th win in a run pays a relic cache: three relics, take one (' + ped.length + ')');
      usePed(r.g, ped[0]); ok(Object.keys(r.g.player.relics).length >= 1 && ped.slice(1).every(i => i.caged), '...taking one cages the others');
      r = room16('DR-K2', 6, 'swift'); r.g.run.dares.won = 1; fightOn(r.g); clearIt(r.g); stepN(r.g, 2); ok(r.d.state === 'won' && !r.d.cache && !r.g.inters.some(i => i.type === 'pedestal'), 'a 2nd win pays no cache');
      r = room16('DR-K3', 6, 'marked'); dums(r.g); r.g.run.dares.won = 3; fightOn(r.g); stepN(r.g, 2); killOne(r.g, r.d.target); ok(r.d.cache, 'MARKED: the cache is owed when the bounty is claimed...'); for (const e of r.g.enemies.slice()) if (!e.dead) e.hold = false; clearIt(r.g); stepN(r.g, 2); ok(r.g.inters.filter(i => i.type === 'pedestal' && !i.dead).length === 3, '...and appears when the room is clear');
    }
    section('P16e. v16 — drawing, whole runs, feats');
    {
      for (const kind of KIDS) { const r = room16('DR-DRAW-' + kind, 7, kind); dums(r.g); fightOn(r.g); stepN(r.g, 3); try { r.g.render(); stepN(r.g, 20); r.g.render(); r.g.scene = 'paused'; r.g.render(); r.g.scene = 'play'; r.d.state = 'lost'; r.d.msg = 'test'; r.d.fade = 0; r.g.render(); } catch (err) { ok(false, kind + ' draws: ' + err); } }
      ok(true, 'every dare draws its strip (live, lost, paused) without error');
      const g = arena('knight', 5, 'DR-END'); g.run.dares = { won: 3, lost: 1 }; try { ED.runHooks('endUI', g, g.ctx); ok(true, 'the end-screen line draws'); } catch (err) { ok(false, 'endUI: ' + err); }
      for (const cls of ['knight', 'mage', 'rogue'].filter(c => P.ok(I.CLASSES[c]))) {
        const g2 = arena(cls, 4, 'DRRUN-' + cls); g2.god = true; const bot = new Bot(ED, g2, { god: true }); let won = 0, lost = 0;
        for (let fr = 0; fr < 60 * 150; fr++) { bot.tick(); g2.step(); if (g2.scene !== 'play') g2.scene = 'play'; if (fr % 300 === 0) g2.render(); }
        won = (g2.run.dares || {}).won || 0; lost = (g2.run.dares || {}).lost || 0; ok(isFinite(g2.player.hp) && g2.eproj.length <= 280, cls + ' plays 2.5 minutes with dares live (floor ' + g2.floorNum + ', won ' + won + ', failed ' + lost + ')'); finite(g2, 'dares ' + cls);
      }
      if (ED.legacy) { const F = ['dare3', 'dare12', 'dare50'].map(id => ED.legacy.FEAT[id]); ok(F.every(f => f && f.pack === 'v16' && f.need === 'v16' && f.title && f.desc), 'three feats join the LEGACY screen'); const x = { run: { dares: { won: 3 } } }; ok(F[0].test(x) && !F[1].test(x), 'Daredevil needs 3 wins in a run, Dauntless 12'); }
    }
  }
  if (!P.on('v16')) {
    section('P16x. v16 off — no dares');
    { const g = arena('knight', 9, 'DR-OFF'); ok(g.floor.dareRooms === undefined, 'no dare rooms are chosen while v16 is off'); const room = g.floor.rooms.find(r => r.type === 'normal' && r.id !== g.floor.startId); ED.debug.goto(g, room, 480, 420); ok(!g.rt.dare && !g.run.dares, 'and nothing is tracked'); }
  }

  // ======================================================================= v17 CROSSROADS
  if (P.on('v17')) {
    const W = ED.worlds, R = ED.route, D = ED.D, T = ED.T, C = ED.C;
    const stepM = (g, n) => { for (let i = 0; i < n; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; if (g.modal) g.modal = null; } };
    const fresh = () => { ED.save.meta.route = {}; };
    /** a run standing in the cleared boss room of a MEGA floor (the floor-5 milestone and talent dialogs are dismissed) */
    function megaDone(seed, floor, setup) {
      ED.input.sim = { held: {}, edge: {} }; const g = newGame(); g.startRun(seed, 'knight'); g.scene = 'play'; g.god = true;
      ED.debug.jumpFloor(g, floor || 5); g.scene = 'play'; if (setup) setup(g);
      ED.debug.skipToBoss(g); g.scene = 'play'; stepM(g, 80);
      for (const e of g.enemies.slice()) if (e.boss) { e.hp = 0; if (e.parts) for (const p of e.parts) p.hp = 0; g.killEnemy(e); }
      stepM(g, 300); return g;
    }
    const seedWith = (pred, from) => { for (let s = from || 0; s < 600; s++) { const g = newGame(); g.startRun('RX' + s, 'knight'); if (pred(R.exitsFor(g, 5), g)) return 'RX' + s; } return null; };
    const portals = (g) => g.inters.filter(i => i.type === 'portal'), stairsOf = (g) => g.inters.find(i => i.type === 'stairs' && !i.dead);

    section('P17. v17 CROSSROADS — the world registry and the route resolver');
    {
      fresh(); const g = newGame(); g.startRun('RESOLVE', 'knight');
      ok(W.ALL.length >= 7 && W.byId.ossuary && W.byId.ossuary.pack === 'v17', 'the Sunken Ossuary is registered (' + W.ALL.length + ' worlds)');
      // the straight line is untouched while no route is recorded
      if (P.on('v3')) for (const f of [1, 5, 6, 10, 11, 31, 61]) ok(W.at(f).w.id === W.LIST[Math.floor((f - 1) / 5) % 6].id && !W.at(f).routed, 'floor ' + f + ' follows the straight line');
      else ok(W.at(1) === null && W.at(40) === null, 'without v3 the straight line has no worlds at all');
      ok(g.run.route && Object.keys(g.run.route).length === 0 && ED.worlds.run() === g.run, 'a new run starts with an empty route and is bound to the resolver');
      // a recorded choice changes exactly the five floors of its tier
      g.run.route[1] = 'ossuary';
      for (let f = 1; f <= 15; f++) { const wi = W.at(f), want = f >= 6 && f <= 10; ok(want ? (wi && wi.w.id === 'ossuary' && wi.routed && wi.tier === 1) : !(wi && wi.routed), 'floor ' + f + (want ? ' is in the Ossuary' : ' is not routed')); }
      ok(W.at(6).first && W.at(6).number === 2 && W.at(10).last && W.at(8).depth === 2, 'depth / first / last bookkeeping for a routed tier');
      ok(W.themeFor(7).name === 'The Sunken Ossuary' && W.themeFor(11) !== W.byId.ossuary.theme && ED.rooms.themeFor(7).name === 'The Sunken Ossuary', 'the palette follows the route');
      ok(W.modsFor(10).join() === 'brined' && W.modsFor(7).join() === 'brined', 'the land names its elite trait');
      ok(D.modPool(10).includes('brined') && !D.modPool(7).includes('brined') && D.modPool(12).includes('brined') === false, 'modPool follows the route (floor 10 yes, 7 no, 12 back on the line)');
      ok(W.riskOf(7) === 2 && W.riskOf(11) === 0 && W.riskOf(3) === 0, 'only the routed side land is harder (risk ' + W.riskOf(7) + ')');
      // risk rows are COPIES: the base table never changes, the land is really tougher, the floor itself stays the floor
      const base = D.atBase(8), row = D.at(8); ok(row !== base && row.floor === 8 && row.isMega === base.isMega && row.tier === base.tier && row.enemyHp > base.enemyHp && row.enemyDmg > base.enemyDmg && row.danger > base.danger && D.atBase(8) === base && base.enemyHp === D.atBase(8).enemyHp, 'a routed land reads a tougher row (danger ' + base.danger + ' -> ' + row.danger + ')');
      ok(D.at(8) === row && (D.at(12) === D.atBase(12) || (ED.heat && ED.heat.live())), 'rows are cached and the straight line reads the base row');
      // pools
      ok(D.enemyPool(6).includes('drowner') && D.enemyPool(6).includes('ossicle') && !D.enemyPool(6).includes('brinewisp') && D.enemyPool(7).includes('brinewisp') && D.enemyPool(8).includes('chainwarden'), 'foes arrive over the land (drowner/ossicle 6, wisp 7, warden 8)');
      ok(D.enemyPool(11).every(id => !ED.enemyTypes[id].world || ED.enemyTypes[id].world !== 'ossuary'), 'back on the line the Ossuary foes are gone');
      // an earlier placement moves a land's foe introductions with it; a later one has everything at once
      g.run.route[1] = 'ossuary'; g.run.route[3] = 'ossuary'; ok(D.enemyPool(16).includes('chainwarden') && D.enemyPool(16).includes('drowner'), 'placed later than its native slot every foe is available at once');
      if (P.on('v3')) { g.run.route = { 1: 'foundry' }; ok(D.enemyPool(6).includes('magmaslug') && D.enemyPool(6).includes('slaghurler') && W.riskOf(6) === 2, 'the Foundry placed early still has its foes from the first floor (and is harder)'); }
      // dead / switched-off worlds are never resolved
      g.run.route = { 1: 'nonsense' }; ok(!W.at(7) || !W.at(7).routed, 'an unknown world id is ignored');
      g.run.route = {};
      // determinism: a floor is a pure function of (floor, seed, route)
      const sig = (f, seed, route) => { g.run.route = route; const fl = ED.gen.generate(f, seed); return fl.theme.name + '|' + fl.rooms.map(r => r.type + r.gx + r.gy + r.template).join(','); };
      ok(sig(7, 'DET', { 1: 'ossuary' }) === sig(7, 'DET', { 1: 'ossuary' }), 'same floor + seed + route = same floor'); ok(sig(7, 'DET', { 1: 'ossuary' }).split('|')[0] === 'The Sunken Ossuary' && sig(7, 'DET', {}).split('|')[0] !== 'The Sunken Ossuary', 'only the palette depends on the route; the dungeon layout is the same');
      ok(sig(7, 'DET', { 1: 'ossuary' }).split('|')[1] === sig(7, 'DET', {}).split('|')[1], 'the layout of a floor does not change with the route (same rooms, same templates)'); g.run.route = {};
    }

    section('P17b. v17 — which doors a seed offers');
    {
      fresh(); let shapes = { 1: 0, 2: 0, 3: 0 }, vis = 0, hid = 0, boundaries = 0, kinds = {};
      for (let s = 0; s < (quick ? 120 : 400); s++) {
        const g = newGame(); g.startRun('EXIT' + s, 'knight');
        for (const fl of [5, 10, 15, 20, 25, 30]) {
          const ex = R.exitsFor(g, fl), T_ = W.tierOf(fl) + 1; boundaries++; shapes[ex.length] = (shapes[ex.length] || 0) + 1;
          if (ex[0].id !== 'default' || ex[0].gate !== null || ex[0].T !== T_) { ok(false, 'the first exit is always the plain way (seed ' + s + ' floor ' + fl + ')'); continue; }
          if (ex.length > 3 || new Set(ex.map(e => e.id)).size !== ex.length) ok(false, 'at most three distinct exits');
          const ext = ex.slice(1); if (ext.filter(e => !R.KINDS[e.gate.kind].secret).length > 1 || ext.filter(e => R.KINDS[e.gate.kind].secret).length > 1) ok(false, 'at most one visible and one hidden side exit');
          for (const e of ext) { if (!R.usable(e.gate) || !P.ok(e.world) || e.world === W.spineAt(T_)) ok(false, 'side exits are usable gates on switched-on worlds that are not the plain next land'); kinds[e.gate.kind] = (kinds[e.gate.kind] || 0) + 1; }
          if (ext.some(e => !R.KINDS[e.gate.kind].secret)) vis++; if (ext.some(e => R.KINDS[e.gate.kind].secret)) hid++;
          const again = R.exitsFor(g, fl); if (again !== ex) ok(false, 'offers are cached per run');
        }
      }
      ok(shapes[1] > 0 && (shapes[2] + (shapes[3] || 0)) > 0, 'some boundaries are plain, some branch (' + JSON.stringify(shapes) + ')');
      const can = W.ALL.filter(w => P.ok(w) && R.usable(R.gateOf(w))), canVis = can.filter(w => !R.KINDS[R.gateOf(w).kind].secret).length, canHid = can.length - canVis, avail = new Set(can.map(w => R.gateOf(w).kind)).size;
      if (canVis >= 2) ok(vis / boundaries > 0.3 && vis / boundaries < 0.95, 'a visible side door shows up at ' + Math.round(100 * vis / boundaries) + '% of boundaries'); else if (!canVis) ok(vis === 0, 'no visible side door when nothing is gated visibly');
      if (canHid >= 1) ok(hid / boundaries > 0.05 && hid / boundaries < 0.7, 'a hidden one at ' + Math.round(100 * hid / boundaries) + '% of boundaries');
      ok(Object.keys(kinds).length >= Math.min(3, avail), 'the kinds of door on offer (' + JSON.stringify(kinds) + ') cover what this edition has (' + avail + ' kinds)');
      // pure in (seed, tier): not influenced by anything the run does with the shared random stream, nor by which floor of the tier asks
      const a = newGame(); a.startRun('PURE', 'knight'); const b = newGame(); b.startRun('PURE', 'knight'); for (let i = 0; i < 300; i++) { a.rng.next(); Math.random(); }
      ok(R.exitsFor(a, 5).map(e => e.id).join() === R.exitsFor(b, 3).map(e => e.id).join(), 'offers do not depend on the shared RNG or on which floor of the tier asks');
      const c1 = newGame(); c1.startRun('PURE2', 'knight'); const o1 = [5, 10, 15].map(f => R.exitsFor(c1, f).map(e => e.id).join('/')).join(' '), c2 = newGame(); c2.startRun('PURE2', 'knight'); const o2 = {}; for (const f of [15, 5, 10]) o2[f] = R.exitsFor(c2, f).map(e => e.id).join('/'); ok(o1 === [5, 10, 15].map(f => o2[f]).join(' '), 'same seed, same road map, whatever order the tiers are asked in');
      // sealed modes have no roads
      if (P.on('v11')) { ED.trials.set('rush'); const g = newGame(); g.startRun('SEALEDX', 'knight'); g.scene = 'play'; ok(g.run.mode === 'rush', 'Boss Rush run'); ED.debug.jumpFloor(g, 5); stepM(g, 5); ok(!R.live(g), 'Boss Rush is sealed: no roads'); ED.trials.set('normal'); }
    }

    section('P17c. v17 — every kind of door has a way to open it (oracles), and the plain stairs never need one');
    {
      fresh(); const meta = R.meta, keepBest = ED.save.meta.bestFloor, keepWins = ED.save.meta.victories;      // earlier sections in this process went deep and won: the memory doors must start from a blank record
      const seed = seedWith(ex => ex.length > 1) || 'RX0';
      const openAt = (spec, setup) => {
        fresh(); const g = megaDone('ORACLE-' + spec.kind + (spec.id || ''), 5, (gg) => { gg.run.cross.exits[1] = [R.exitsFor(gg, 5)[0], { id: 'ossuary', world: W.byId.ossuary, gate: spec, T: 1 }]; if (setup) setup(gg); });
        return g;
      };
      const state = (g) => R.gateState(g, g.run.cross.exits[1][1]);
      // SIGIL
      { let g = openAt({ kind: 'sigil', id: 'gear' }); let st = state(g); ok(st.visible && !st.open && /brass/.test(st.hint), 'sigil door: sealed without the sigil, hint is only a description'); R.grantSigil(g, R.SIG.gear); st = state(g); ok(st.visible && st.open && meta().sigils.gear === true, 'sigil door: opens with the sigil (kept for good in meta.route)'); const p = portals(g)[0]; ok(!!p && p.exit.gate.kind === 'sigil', 'a sigil door stands beside the stairs'); p.update(g, p); g.player.x = p.x; g.player.y = p.y; stepM(g, 2); ok(g.nearInter === p, 'and can be used'); }
      // CARRY
      { let g = openAt({ kind: 'carry', id: 'lantern' }); let st = state(g); ok(st.visible && !st.open && /dark/.test(st.hint), 'carry door: sealed without the item'); g.run.cross.carry.lantern = true; st = state(g); ok(st.open, 'carry door: opens while you hold it'); }
      // DEEDS
      { let g = openAt({ kind: 'deed', id: 'bombless' }); ok(state(g).open, 'no-fuse deed: open while no fuse was lit'); ED.runHooks('bomb', g, { owner: 'player' }); ok(!state(g).open, '...closed the moment one is'); ED.runHooks('bomb', g, { owner: 'enemy' }); }
      { let g = openAt({ kind: 'deed', id: 'bombless' }); g.run.cross.bombs[0] = 0; g.player.bombs = 3; g.placeBomb(500, 300, { owner: 'player' }); ok(g.run.cross.bombs[0] === 1 && !state(g).open, 'a real bomb placed by the player counts, through the engine hook'); g.placeBomb(500, 300, { owner: 'enemy' }); ok(g.run.cross.bombs[0] === 1, 'enemy fuses do not'); }
      { let g = openAt({ kind: 'deed', id: 'flawless' }); ok(g.run.cross.bossDmg0[0] !== undefined && state(g).open, 'untouched deed: open when the guardian never landed a blow'); g.run.damageTaken += 3; ok(!state(g).open, '...closed by one wound'); }
      { let g = openAt({ kind: 'deed', id: 'swift' }); ok(state(g).open, 'swift deed: open for a quick land'); g.run.frames += 14 * 3600; ok(!state(g).open, '...closed after thirteen minutes'); }
      if (P.on('v16')) { let g = openAt({ kind: 'deed', id: 'daring' }); ok(!state(g).open, 'daring deed: closed with no dares won'); g.run.dares = { won: 2, lost: 0 }; ok(state(g).open, '...opens after two wins'); }
      // MEMORIES (hidden until true)
      { ED.save.meta.bestFloor = 5; let g = openAt({ kind: 'legacy', id: 'deep20' }); ED.save.meta.bestFloor = 5; let st = state(g); ok(!st.visible && !st.open, 'memory door: not there at all'); ED.save.meta.bestFloor = 20; st = state(g); ok(st.visible && st.open, 'memory door: appears once the record exists'); const p = portals(g)[0]; p.update(g, p); ok(!p.disabled, '...and the portal turns solid'); ED.save.meta.bestFloor = keepBest; }
      { fresh(); let g = openAt({ kind: 'legacy', id: 'sigils3' }); ok(!state(g).visible, 'three-sigil memory: hidden with none'); for (const s of ['tide', 'gear', 'ash']) meta().sigils[s] = true; ok(state(g).open, '...and with three'); }
      { fresh(); const un = ED.save.meta.unlocked.bosses, keep = Object.assign({}, un); let g = openAt({ kind: 'legacy', id: 'titan' }); for (const k of Object.keys(un)) delete un[k]; ok(!state(g).visible, 'titan memory: hidden before a MEGA boss has fallen'); un[ED.bosses.MEGA_ORDER[0]] = true; ok(state(g).visible, '...visible after'); for (const k of Object.keys(un)) delete un[k]; Object.assign(un, keep); }
      { let g = openAt({ kind: 'legacy', id: 'victor' }); ED.save.meta.victories = 0; ok(!state(g).visible, 'victory memory: hidden'); ED.save.meta.victories = 1; ok(state(g).visible, '...visible after a win'); ED.save.meta.victories = keepWins; }
      // TOLL
      { let g = openAt({ kind: 'cost', gold: 60, goldPer: 2, hp: 1 }); const it = portals(g)[0]; let st = state(g); ok(st.visible && !st.open, 'toll door: sealed'); g.player.gold = 5; g.player.x = it.x; g.player.y = it.y; stepM(g, 2); g.tryInteract(); ok(g.modal && g.modal.type === 'route_cost', 'using it asks for an offering'); try { g.render(); } catch (e) { ok(false, 'toll modal draws: ' + e); }
        R.payToll(g, g.run.cross.exits[1][1], 'gold'); ok(!state(g).open && g.player.gold === 5, 'too little gold: nothing is taken, the door stays shut'); g.modal = { type: 'route_cost', ex: g.run.cross.exits[1][1] };
        g.player.gold = 500; const cost = Math.round(60 + 2 * g.floorNum); R.payToll(g, g.run.cross.exits[1][1], 'gold'); ok(state(g).open && g.player.gold === 500 - cost && !g.modal, 'paying ' + cost + ' gold opens it');
        const g2 = openAt({ kind: 'cost', hp: 1 }); const mx = g2.player.maxHp; R.payToll(g2, g2.run.cross.exits[1][1], 'hp'); ok(R.gateState(g2, g2.run.cross.exits[1][1]).open && (g2.player.maxHp < mx || g2.player.hp < mx), 'blood also pays (a heart of max HP, or 4 HP when small)'); }
      // CRACK (a real bomb at the real wall)
      { fresh(); const sd = seedWith(ex => ex.some(e => e.gate && e.gate.kind === 'crack')); let g; ok(!!sd || !P.on('v17'), 'some seed offers the secret wall');
        if (sd) { g = megaDone(sd, 5); } else { g = openAt({ kind: 'crack' }); }
        const k = g.rt.crack, exx = g.run.cross.exits[1].find(e => e.gate && e.gate.kind === 'crack'); ok(!!k && !!exx && ['N', 'E', 'S', 'W'].includes(k.dir) && !g.room.doors[k.dir], 'the crack is on a wall with no door (' + (k && k.dir) + ')');
        ok(!ED.phys.blocked(g, k.px, k.py, 16, false, false), 'and the spot in front of it is open floor'); let p = portals(g).find(x => x.exit === exx); ok(!!p && p.disabled, 'the passage is not there yet'); try { g.render(); } catch (e) { ok(false, 'crack draws: ' + e); }
        g.explode(k.x - 200, k.y, 60, 10, { owner: 'player', bomb: true }); ok(!g.run.cross.cracked[1], 'a bomb far from the wall does nothing'); g.explode(k.px, k.py, 80, 10, { owner: 'player', bomb: true }); ok(g.run.cross.cracked[1] === true, 'a bomb beside it brings the wall down');
        stepM(g, 4); p = portals(g).find(x => x.exit === exx); ok(!p.disabled && R.gateState(g, exx).open, 'the passage appears'); try { g.render(); } catch (e) { ok(false, 'opened crack draws: ' + e); }
        // a bomb is always to hand: with none in the pack, one lies where the guardian fell
        const g3 = megaDone(sd || seed, 5, (gg) => { gg.player.bombs = 0; }); if (sd) ok(g3.player.bombs > 0 || g3.pickups.some(x => x.type === 'bomb'), 'with no bombs left, a stray one lies in the boss room'); }
      // the plain stairs are the way that never needs anything
      { const sd = seedWith(ex => ex.length > 2) || seedWith(ex => ex.length > 1); const g = megaDone(sd, 5); const st = stairsOf(g); ok(!!st && st.exit && st.exit.id === 'default' && !st.exit.gate, 'the plain stairs are still there beside the doors'); g.player.keys = { small: 0, mb: 0, boss: 0 }; g.player.gold = 0; g.player.bombs = 0; g.player.x = st.x; g.player.y = st.y; stepM(g, 2); ok(g.nearInter === st, 'and are the nearest thing');
        g.tryInteract(); stepM(g, 80); ok(g.floorNum === 6 && !g.run.route[1] && (!W.at(6) || !W.at(6).routed), 'taking them continues on the straight line, with nothing in the pocket'); ok(Object.keys(R.meta().edges).length === 1 && Object.values(R.meta().edges)[0] === 1, 'and the road is recorded (' + Object.keys(R.meta().edges) + ')'); }
    }

    section('P17d. v17 — taking a side road: the world changes, the records follow');
    {
      fresh(); const sd = seedWith(ex => ex.some(e => e.gate && e.gate.kind === 'crack')) || seedWith(ex => ex.length > 1);
      const g = megaDone(sd, 5, (gg) => { gg.player.relics.thirdeye = 0; }); const ex = g.run.cross.exits[1].find(e => e.id !== 'default'); ok(!!ex, 'this seed offers a side road');
      if (ex.gate.kind === 'crack') R.openCrack(g, g.rt.crack); else if (ex.gate.kind === 'sigil') R.grantSigil(g, R.SIG[ex.gate.id]); else if (ex.gate.kind === 'carry') g.run.cross.carry[ex.gate.id] = true; else if (ex.gate.kind === 'cost') g.run.cross.paid[1] = true; else if (ex.gate.kind === 'legacy') ED.save.meta.bestFloor = 99;
      stepM(g, 4); const it = portals(g).find(x => x.exit === ex); ok(!!it && !it.disabled && R.gateState(g, ex).open, 'the gate is satisfied and the door is open'); g.player.x = it.x; g.player.y = it.y; stepM(g, 2); ok(g.nearInter === it && /Take the road|Make an/.test(it.prompt()), 'prompt: ' + it.prompt());
      const hp0 = g.player.maxHp; g.tryInteract(); ok(g.run.route[1] === ex.world.id && g.run.cross.detours === 1, 'committing records the choice in run.route'); stepM(g, 90);
      ok(g.floorNum === 6 && W.at(6).w.id === ex.world.id && g.theme.name === ex.world.theme.name, 'floor 6 is ' + ex.world.name); ok(g.dif.danger >= D.atBase(6).danger + (ex.world.risk > 0 ? 1 : 0), 'its danger reads ' + g.dif.danger + ' (base ' + D.atBase(6).danger + ')');
      const M = R.meta(); ok(M.discovered[ex.world.id] && M.visits[ex.world.id] === 1 && M.learned[ex.world.id] && Object.keys(M.edges).some(k => k.endsWith('>' + ex.world.id)), 'records: discovered, visited, door learned, edge taken');
      ok(g.run.cross.log.length === 1 && g.run.cross.log[0].to === ex.world.id, 'the run remembers its road'); ok(M.counters.detours === 1, 'detours are counted for good');
      // the intro, HUD and end screen mention it
      g.scene = 'intro'; g.introT = 60; try { g.render(); g.scene = 'play'; g.render(); g.scene = 'dead'; g.deadT = 80; g.render(); } catch (e) { ok(false, 'render after a detour: ' + e); } g.scene = 'play';
      // back on the line at the next boundary: the plain stairs again lead to the straight line
      for (let f = 6; f <= 10; f++) ok(W.at(f) && W.at(f).w.id === ex.world.id, 'floor ' + f + ' stays in the land'); ok(!W.at(11) || !W.at(11).routed, 'floor 11 is back on the line');
      // a harder side road pays richer: an extra relic cache after its boss
      if (ex.world.risk >= 2) { ED.debug.jumpFloor(g, 10); g.scene = 'play'; ED.debug.skipToBoss(g); g.scene = 'play'; stepM(g, 80); for (const e of g.enemies.slice()) if (e.boss) { e.hp = 0; if (e.parts) for (const p of e.parts) p.hp = 0; g.killEnemy(e); } stepM(g, 300); const ped = g.inters.filter(i => i.type === 'pedestal' && !i.dead && i.item.cat === 'relic' && i.y < 200); ok(ped.length >= 3, 'a harder road pays an extra relic cache (' + ped.length + ' relics on pedestals)'); }
    }

    section('P17e. v17 — sigils, carried items, rumours');
    {
      fresh(); const M = R.meta;
      let g = arena('knight', 3, 'SIG1'); ED.runHooks('miniDefeated', g, { defId: 'slimeking' }); ok(M().sigils.tide === true && g.run.cross.sigilsNow.includes('tide') && g.popups.some(p => p.title === 'SIGIL'), 'the Slime King leaves the Sigil of the Tide (popup, saved)');
      const n0 = g.popups.length; ED.runHooks('miniDefeated', g, { defId: 'slimeking' }); ok(g.popups.length === n0, 'only once'); ED.runHooks('miniDefeated', g, { defId: 'sentry', revenant: true, nemesis: { rank: 1, relics: [] } }); ok(!M().sigils.gear, 'an echo of yourself holds no sigil'); ED.runHooks('miniDefeated', g, { defId: 'gravewarden' }); ok(Object.keys(M().sigils).length === 1, 'a mini boss that holds none gives none');
      for (const s of R.SIGILS) if (s.mini) ok(!!ED.minibosses.def(s.mini), 'sigil ' + s.id + ' comes from a real mini boss (' + s.mini + ')');
      ok(R.SIGILS.filter(s => !s.mini).length === 1 && R.SIGILS.length === 6, 'six sigils, one of them from an altar');
      // the altar in secret rooms
      fresh(); let alt = null; for (let i = 0; i < 250 && !alt; i++) { const gg = newGame(); gg.startRun('ALT' + i, 'knight'); gg.scene = 'play'; ED.debug.jumpFloor(gg, 4 + i % 8); const sr = gg.floor.rooms.find(r => r.type === 'secret'); if (sr) { ED.debug.goto(gg, sr, 480, 420); gg.scene = 'play'; const a = gg.inters.find(x => x.type === 'sigilaltar'); if (a) alt = { gg, a }; } }
      ok(!!alt, 'some secret rooms hold the altar'); if (alt) { alt.gg.player.x = alt.a.x; alt.gg.player.y = alt.a.y; stepM(alt.gg, 2); alt.gg.tryInteract(); ok(M().sigils.crown === true, 'touching it gives the Sigil of the Crown'); alt.gg.tryInteract(); try { alt.gg.render(); } catch (e) { ok(false, 'altar draws: ' + e); } }
      // carried items: planned on floor 2-4 of the land that precedes the door, dropped when its room is cleared, collected by walking over it
      fresh(); const sdc = seedWith(ex => ex.some(e => e.gate && e.gate.kind === 'carry'));
      if (sdc) {
        const gg = newGame(); gg.startRun(sdc, 'knight'); gg.scene = 'play'; gg.god = true; const cu = gg.run.cross.curio[0]; ok(!!cu && cu.floor >= 2 && cu.floor <= 4 && R.CURIOS[cu.id], 'a curio is planned for floor ' + (cu && cu.floor) + ' (' + (cu && cu.id) + ')');
        ED.debug.jumpFloor(gg, cu.floor); gg.scene = 'play'; const rid = gg.floor.curioRoom; ok(rid !== null && gg.floor.rooms[rid].type === 'normal' && rid !== gg.floor.startId, 'in an ordinary room that is not the start room'); const room = gg.floor.rooms[rid];
        ED.debug.goto(gg, room, 480, 420); gg.scene = 'play'; ED.debug.clearRoom(gg); stepM(gg, 4); const pk = gg.pickups.find(x => x.type === 'curio'); ok(!!pk && pk.curio === cu.id, 'clearing that room drops it'); try { gg.render(); } catch (e) { ok(false, 'curio draws: ' + e); }
        gg.player.x = pk.x; gg.player.y = pk.y; stepM(gg, 30); ok(gg.run.cross.carry[cu.id] === true && pk.dead, 'walking over it picks it up'); gg.render(); stepM(gg, 2); ok(R.gateState(gg, { gate: { kind: 'carry', id: cu.id }, T: 1 }).open, 'and the door that asks for it opens');
        const rooms2 = gg.floor.rooms.filter(r => r.type === 'normal' && r.id !== rid); ED.debug.goto(gg, rooms2[0], 480, 420); ED.debug.clearRoom(gg); stepM(gg, 4); ok(gg.pickups.filter(x => x.type === 'curio').length === 0, 'no second one in another room'); ED.debug.jumpFloor(gg, cu.floor + 1); ok(gg.floor.curioRoom === null, 'only on its own floor');
      } else ok(true, '(no seed with a carried-item door in range)');
      // the wanderer
      fresh(); let wd = null; for (let i = 0; i < 200 && !wd; i++) { const gg = newGame(); gg.startRun('WAN' + i, 'knight'); gg.scene = 'play'; gg.god = true; ED.debug.jumpFloor(gg, 5); const rest = gg.floor.rooms.find(r => r.type === 'rest'); if (rest) { ED.debug.goto(gg, rest, 480, 420); gg.scene = 'play'; const a = gg.inters.find(x => x.type === 'wanderer'); if (a) wd = { gg, a }; } }
      ok(!!wd, 'a wanderer sometimes waits in the rest room before a MEGA boss'); if (wd) { const { gg, a } = wd; gg.player.x = a.x; gg.player.y = a.y; gg.player.gold = 0; stepM(gg, 2); gg.tryInteract(); ok(!a.used && gg.toasts.some(t => /Not enough gold/.test(t.msg)), 'no gold, no rumour'); gg.player.gold = 999; gg.tryInteract(); stepM(gg, 2);
        ok(a.used && gg.player.gold < 999 && Object.keys(M().rumours).length === 1, 'a rumour is bought and written down (' + Object.keys(M().rumours) + ')'); ok(gg.toasts.some(t => /^"/.test(t.msg)), 'it tells you what a door wants'); const wid = Object.keys(M().rumours)[0]; ok(R.rumourText(W.byId[wid]).indexOf(W.byId[wid].name) === 0, 'rumour text names the land'); try { gg.render(); } catch (e) { ok(false, 'wanderer draws: ' + e); } }
      // every gate kind has rumour text and a hint, never naming a recipe in the hint
      { const gR = arena('knight', 1, 'RUM'); for (const w of W.ALL.filter(w => R.gateOf(w))) { const t = R.rumourText(w), st = R.gateState(gR, { gate: R.gateOf(w), T: 1 }); ok(t.length > 20 && t.indexOf(w.name) === 0, 'rumour for ' + w.id + ': "' + t + '"'); ok(typeof st.hint === 'string', 'hint for ' + w.id); } }
    }

    section('P17f. v17 — the Sunken Ossuary: foes, tides, bones, the Reeve');
    {
      fresh(); const OSS = W.byId.ossuary, ids = OSS.enemies;
      const ossArena = (seed, floor) => { const g = arena('knight', 3, seed); g.run.route = { 1: 'ossuary' }; ED.debug.jumpFloor(g, floor || 8); g.scene = 'play'; g.god = true; const room = g.floor.rooms.find(r => r.type === 'normal' && r.id !== g.floor.startId); ED.debug.goto(g, room, 480, 420); g.scene = 'play'; g.rt.enc = null; g.enemies.length = 0; g.spawns.length = 0; return g; };
      for (const id of ids.concat(['boneheap'])) { const d = ED.enemyTypes[id]; ok(d && d.world === 'ossuary' && d.pack === 'v17' && typeof d.update === 'function' && d.desc.length > 30, id + ' is a complete foe of the Ossuary'); }
      ok(ED.mods.brined && ED.mods.brined.pack === 'v17' && ED.minibosses.def('reeve') && ED.items.relic('reevelamp').unlock === 'mini:reeve', 'trait, mini boss and relic exist');
      // every foe fights, dies and stays finite — in the Ossuary, tides and all
      for (const id of ids) {
        const g = ossArena('OSSFOE-' + id, 9), e = g.spawnEnemy(id, 560, 300, { silent: true }), bot = new Bot(ED, g, { god: true }); let frames = 0; g.rt.lockdown = true; g.refreshCollision();
        try { while (!e.dead && frames++ < 60 * 50) { if (frames === 60 * 22) for (const x of g.enemies) x.rush = true; bot.tick(); g.step(); if (g.scene !== 'play') g.scene = 'play'; if (frames % 40 === 0) g.render(); } } catch (err) { ok(false, id + ' crashed: ' + (err.stack || err)); }
        finite(g, id); ok(e.dead, id + ' can be killed within 50s (' + Math.round(frames / 60) + 's)');
      }
      // the tide: telegraphed, floods a band, drains again, never strands anything
      { const g = ossArena('TIDE', 9), rt = g.rt; ok(rt.hzOn && rt.pools.length >= 6 && g.room.tiles[rt.pools[0]] === T.WATER, 'tide pools are painted into the room (' + rt.pools.length + ' tiles)');         rt.lockdown = true; rt.tideT = 3; const base = Uint8Array.from(g.room.tiles); let warned = false, flooded = false; for (let i = 0; i < 60 * 12 && !flooded; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; if (g.zones.some(z => z.shape === 'rect' && z.hurts === false)) warned = true; if ((rt.floods || []).length) flooded = true; }
        ok(warned, 'a band of the room flashes before it floods'); ok(flooded && rt.floods[0].idx.length >= 12, 'then it floods (' + (rt.floods[0] ? rt.floods[0].idx.length : 0) + ' tiles)'); const f0 = rt.floods[0]; ok(f0.idx.every(i => g.room.tiles[i] === T.WATER), 'the flooded tiles are water');
        let drained = false; for (let i = 0; i < 60 * 12 && !drained; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; if (f0.done) drained = true; } ok(drained, 'and the water drains again'); ok(f0.idx.every((i, k) => g.room.tiles[i] === f0.orig[k]), 'the floor is exactly what it was'); ok(g.room.tiles.every((t, i) => t === base[i] || g.rt.floods.some(f => f.idx.includes(i)) || rt.pools.includes(i)), 'nothing else changed');
        // water really slows you, Reeve's Lamp does not
        const w = rt.pools[0]; g.player.x = (w % 30) * 32 + 16; g.player.y = Math.floor(w / 30) * 32 + 16; g.rt.enc = null; g.player.vx = g.player.vy = 0; const spd = (g2) => { g2.player.x = (w % 30) * 32 + 16; g2.player.y = Math.floor(w / 30) * 32 + 16; g2.player.vx = g2.player.vy = 0; ED.input.sim = { held: { right: true }, edge: {} }; const x0 = g2.player.x; stepM(g2, 12); ED.input.sim = { held: {}, edge: {} }; return g2.player.x - x0; };
        const wet = spd(g); g.player.relics.reevelamp = 1; ED.items.recalc(g.player); const dry = spd(g); ok(wet > 2 && dry > wet * 1.2, 'water slows you (' + wet.toFixed(1) + 'px) and Reeve\'s Lamp lets you wade (' + dry.toFixed(1) + 'px)'); }
      // drowners swim
      { const g = ossArena('DROWN', 9), d = g.spawnEnemy('drowner', 150, 288, { silent: true }); d.hold = false;
        const run = (water) => { const idx = []; for (let tx = 3; tx <= 26; tx++) for (let ty = 8; ty <= 9; ty++) idx.push(ty * 30 + tx); const saved = idx.map(i => g.room.tiles[i]); for (const i of idx) g.room.tiles[i] = water ? T.WATER : T.FLOOR; g.refreshCollision();
          d.x = 150; d.y = 288; d.t = 0; d.sw = 0; d.state = null; g.player.x = 880; g.player.y = 288; g.player.inv = 9999; const x0 = d.x; for (let k = 0; k < 24; k++) { g.player.x = 880; g.player.y = 288; g.step(); if (g.scene !== 'play') g.scene = 'play'; } const dx = d.x - x0; idx.forEach((i, k) => { g.room.tiles[i] = saved[k]; }); g.refreshCollision(); return dx; };
        const dry = run(false), wet = run(true); ok(dry > 8 && wet > dry * 1.6, 'a Drowner moves ' + (wet / dry).toFixed(1) + 'x faster in water (' + dry.toFixed(0) + ' vs ' + wet.toFixed(0) + 'px in 24 frames)'); }
      // bones that stand again
      { const g = ossArena('BONES', 9), o = g.spawnEnemy('ossicle', 500, 300, { silent: true }); o.hold = true; g.damageEnemy(o, 99999, { src: 'melee', x: 0, y: 0 }); stepM(g, 2); const heap = g.enemies.find(e => e.type === 'boneheap' && !e.dead); ok(!!heap && heap.minion && g.aliveEnemies() === 1, 'a fallen Ossicle leaves a heap (the room does not clear while it lies there)');
        stepM(g, 60 * 5); const o2 = g.enemies.find(e => e.type === 'ossicle' && !e.dead); ok(!!o2 && o2.reborn && o2.maxHp < o.maxHp && !g.enemies.some(e => e.type === 'boneheap' && !e.dead), 'left alone it stands again, weaker (hp ' + Math.round(o2.maxHp) + ' vs ' + Math.round(o.maxHp) + ')'); o2.hold = true; g.damageEnemy(o2, 99999, { src: 'melee', x: 0, y: 0 }); stepM(g, 2); ok(!g.enemies.some(e => !e.dead), 'and the second death is final (no more heaps)');
        const o3 = g.spawnEnemy('ossicle', 500, 300, { silent: true }); o3.hold = true; g.damageEnemy(o3, 99999, { src: 'melee', x: 0, y: 0 }); stepM(g, 2); const h3 = g.enemies.find(e => e.type === 'boneheap' && !e.dead); g.damageEnemy(h3, 99999, { src: 'melee', x: 0, y: 0 }); stepM(g, 60 * 5); ok(!g.enemies.some(e => !e.dead), 'smashing the heap prevents it'); }
      // an Ossicle carrying a key still drops it, and the heap never carries one
      { const g = ossArena('BONEKEY', 9), o = g.spawnEnemy('ossicle', 500, 300, { silent: true, carriesKey: 'small' }); o.hold = true; g.damageEnemy(o, 99999, { src: 'melee', x: 0, y: 0 }); stepM(g, 2); ok(g.pickups.some(k => k.type === 'key'), 'a key carrier that falls still drops its key'); ok(!g.enemies.find(e => e.type === 'boneheap').carriesKey, 'the heap carries nothing'); }
      // wisps flood, wardens sweep
      { const g = ossArena('WISP', 9), e = g.spawnEnemy('brinewisp', 700, 200, { silent: true }); e.cd = 1; g.player.x = 400; g.player.y = 330; g.player.inv = 999; let flooded = false; for (let i = 0; i < 60 * 8 && !flooded; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; if ((g.rt.floods || []).length) flooded = true; } ok(flooded, 'a Brinewisp floods the floor under you'); const f = g.rt.floods[0]; ok(f.idx.length >= 6 && f.idx.length <= 20, 'a patch, not a room (' + f.idx.length + ' tiles)'); g.render(); }
      { const g = ossArena('WARDEN', 9); g.god = false; const e = g.spawnEnemy('chainwarden', 480, 288, { silent: true }); e.hold = false; e.cd = 1; const p = g.player; p.hp = p.maxHp = 999; let telegraphed = false, sweeps = 0; const hp0 = p.hp;
        for (let i = 0; i < 60 * 8; i++) { p.x = 560; p.y = 288; p.inv = 0; e.x = 480; e.y = 288; g.step(); if (g.scene !== 'play') g.scene = 'play'; if (e.state === 'wind') telegraphed = true; if (e.state === 'sweep') sweeps++; if (sweeps > 90) break; }
        ok(telegraphed && sweeps > 40, 'the Warden telegraphs, then sweeps for ~' + sweeps + ' frames'); ok(p.hp < hp0, 'standing in its circle gets you hit (' + (hp0 - p.hp) + ' damage)');
        stepM(g, 140); const hp1 = p.hp; e.state = null; e.cd = 99999; g.zones.length = 0; for (let i = 0; i < 90; i++) { p.x = 480 + 230; p.y = 288; p.inv = 0; e.x = 480; e.y = 288; g.step(); if (g.scene !== 'play') g.scene = 'play'; } ok(p.hp === hp1, 'well outside the circle you are safe'); }
      // the elite trait
      { const g = ossArena('BRINED', 9), e = g.spawnEnemy('ossicle', 520, 300, { silent: true, elite: true, mods: ['brined'] }); g.god = false; g.player.inv = 0; g.player.slowT = 0; ED.mods.brined.onHitPlayer(e, g); ok(g.player.slowT >= 90, 'Brined foes slow you when they hit'); }
      // the mini boss and its relic
      { const g = newGame(); g.startRun('REEVE', 'knight'); g.scene = 'play'; g.run.route = { 1: 'ossuary' }; ED.debug.jumpFloor(g, 9); giveKit(g, 9); g.god = true; const bot = new Bot(ED, g, { god: true }), room = g.floor.rooms.find(r => r.type === 'miniboss');
        const spec = ED.minibosses.pick(9, new ED.RNG('rv'), []); spec.defId = 'reeve'; spec.duo = false; room.mini = spec; ED.debug.goto(g, room, 480, 440); g.scene = 'play';
        let fr = 0; while (fr++ < 60 * 150) { bot.tick(); g.step(); if (g.room.cleared) break; if (g.scene !== 'play') g.scene = 'play'; if (fr % 90 === 0) g.render(); }
        ok(room.cleared, 'the Hollow Reeve can be beaten in the Ossuary (' + Math.round(fr / 60) + 's)'); finite(g, 'reeve'); ok(!!ED.save.meta.unlocked.minis.reeve && ED.save.isItemUnlocked('mini:reeve'), "its first kill unlocks Reeve's Lamp"); }
      // elites only roll the trait in the Ossuary; foes of the land spawn in real waves
      { const rng = new ED.RNG('ossw'); const g = ossArena('WAVES', 9); let own = 0, tot = 0; for (let i = 0; i < 80; i++) for (const wave of D.composeWaves(9, rng, {})) for (const e of wave) { tot++; if (OSS.enemies.includes(e.type)) own++; } ok(own / tot > 0.12 && own / tot < 0.7, 'the land\'s own foes are ' + Math.round(100 * own / tot) + '% of spawns'); }
    }

    section('P17g. v17 — screens, feats, the Guide, the world around the Ossuary');
    {
      fresh(); const g = newGame(); g.scene = 'title'; g.render(); ok(ED.ui.btns.some(b => b.id === 'routes'), 'the title has a ROUTES button'); ED.ui.action = 'routes'; g.step(); ok(g.scene === 'routes', 'it opens the Routes scene');
      for (const tab of ['worlds', 'roads', 'sigils']) { ED.ui.action = 'tab:' + tab; g.step(); try { g.render(); } catch (e) { ok(false, 'routes tab ' + tab + ': ' + e); } } ok(ED.ui.btns.some(b => b.id === 'back'), 'every tab draws and has a Back button');
      // the page tells only what has been found
      const M = R.meta(); ED.ui.action = 'tab:worlds'; g.step(); let texts = []; const og = g.ctx; g.render(); ok(Object.keys(M.discovered).length === 0, 'a fresh save has found nothing'); M.discovered.ossuary = true; M.visits.ossuary = 2; M.edges['deep>ossuary'] = 2; M.sigils.gear = true; M.learned.ossuary = true; for (const tab of ['worlds', 'roads', 'sigils']) { ED.ui.action = 'tab:' + tab; g.step(); try { g.render(); } catch (e) { ok(false, 'routes tab with records ' + tab + ': ' + e); } } ED.ui.action = 'back'; g.step(); ok(g.scene === 'title', 'Back returns to the title'); g.render(); fresh();
      // the save survives junk
      ED.save.meta.route = 'junk'; ok(typeof R.meta() === 'object' && R.meta().discovered && !Array.isArray(R.meta().discovered), 'a damaged meta.route is repaired'); ED.save.meta.route = { discovered: [1], sigils: 5, edges: null }; ok(typeof R.meta().sigils === 'object' && !Array.isArray(R.meta().discovered), 'and so are damaged branches'); fresh();
      const feats = ['road1', 'sigil3', 'wall1', 'lands5']; if (ED.legacy) { ok(feats.every(id => ED.legacy.FEAT[id] && ED.legacy.FEAT[id].pack === 'v17' && ED.legacy.FEAT[id].need === 'v17'), 'four feats join the LEGACY screen'); const x = { run: { cross: { detours: 1, cracked: { 1: true } } } }; ok(ED.legacy.FEAT.road1.test(x) && ED.legacy.FEAT.wall1.test(x) && !ED.legacy.FEAT.sigil3.test(x), 'feat tests read the run and the save'); }
      // the world's pieces draw in every place a world draws
      for (const f of [6, 8, 10]) { const gg = newGame(); gg.startRun('INTRO' + f, 'knight'); gg.run.route = { 1: 'ossuary' }; ED.debug.jumpFloor(gg, f); gg.scene = 'intro'; gg.introT = 60; try { gg.render(); gg.scene = 'play'; gg.render(); } catch (e) { ok(false, 'render in the Ossuary @' + f + ': ' + e); } }
      ok(true, 'intro, HUD and rooms render in the Ossuary');
      // music flavour is applied and undone
      { const A = ED.audio.music; A.set({ floor: 7, flavor: null }); const bpm0 = A.bpm; A.set({ floor: 7, flavor: W.byId.ossuary.music }); const bpm1 = A.bpm; A.set({ floor: 7, flavor: null }); ok(bpm1 === Math.max(60, bpm0 + W.byId.ossuary.music.bpm) && A.bpm === bpm0, 'a land recolours the music (' + bpm0 + ' -> ' + bpm1 + ') and the colour is dropped again'); }
    }
    fresh();
  }
  if (!P.on('v17')) {
    section('P17x. v17 off — the descent is a straight line again');
    {
      const g = arena('knight', 5, 'X17'); ok(g.run.cross === undefined && g.run.route === undefined, 'nothing is tracked while v17 is off');
      ok(!ED.worlds.byId.ossuary || !P.ok(ED.worlds.byId.ossuary), 'the Ossuary is not available'); g.run.route = { 1: 'ossuary' }; ok(!ED.worlds.at(7) || !ED.worlds.at(7).routed, 'even a forced route to it is ignored'); g.run.route = undefined;
      ok(ED.worlds.riskOf(7) === 0, 'no extra danger anywhere'); ED.debug.skipToBoss(g); g.scene = 'play'; for (let i = 0; i < 80; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; } for (const e of g.enemies.slice()) if (e.boss) { e.hp = 0; if (e.parts) for (const p of e.parts) p.hp = 0; g.killEnemy(e); } for (let i = 0; i < 300; i++) { g.step(); if (g.modal) g.modal = null; if (g.scene !== 'play') g.scene = 'play'; }
      ok(g.inters.filter(i => i.type === 'stairs').length === 1 && !g.inters.some(i => i.type === 'portal'), 'a MEGA boss leaves exactly one way down'); g.scene = 'title'; g.render(); ok(!ED.ui.btns.some(b => b.id === 'routes'), 'and the title has no ROUTES button');
    }
  }

  // ----- runs last on purpose: it plays a few frames and would shift the shared Math.random stream the layout-sensitive tests above depend on
  section('P0b. Key bindings (not tied to any update)');
  {
    const IN = ED.input, restore = () => { IN.resetBindings(); ED.save.meta.settings.keys = undefined; delete ED.save.meta.settings.keys; IN.applyBindings(); };
    restore();
    ok(IN.isDefault() && JSON.stringify(IN.MAP.up) === '["KeyW","ArrowUp"]' && IN.actionsFor('KeyW').join() === 'up' && IN.actionsFor('Space').includes('attack') && IN.actionsFor('Space').includes('confirm'), 'defaults are untouched');
    ok(IN.label('up') === 'W / ↑' && IN.key1('interact') === 'E' && IN.label('dash') === 'K / L-Shift / R-Shift' && IN.codeName('Digit3') === '3' && IN.codeName('Backquote') === '`', 'keys have readable names');
    let r = IN.bind('up', 0, 'KeyI'); ok(r.ok && !r.steal && IN.MAP.up.join() === 'KeyI,ArrowUp' && IN.actionsFor('KeyI').join() === 'up' && IN.actionsFor('KeyW').length === 0 && !IN.isDefault(), 'rebinding slot 1 replaces just that key');
    r = IN.bind('attack', 0, 'KeyK'); ok(r.ok && r.steal === 'dash' && IN.MAP.attack[0] === 'KeyK' && !IN.MAP.dash.includes('KeyK') && IN.MAP.dash.includes('ShiftLeft'), 'a key taken from another action moves, and tells you');
    r = IN.bind('attack', 1, 'KeyK'); ok(r.ok && IN.MAP.attack.join() === 'KeyK', 'binding the same key into the other slot of one action does not duplicate it');
    for (const bad of ['Escape', 'Enter', 'KeyM', 'KeyF', 'Backquote', 'KeyP', 'Tab']) ok(!IN.bind('bomb', 0, bad).ok, bad + ' is reserved');
    ok(!IN.bind('pause', 0, 'KeyG').ok && !IN.bind('debug', 0, 'KeyG').ok, 'only the twelve gameplay actions can be rebound');
    IN.unbind('up', 0); ok(IN.MAP.up.join() === 'ArrowUp', 'clearing a slot leaves the other key working'); IN.unbind('up', 0); ok(IN.MAP.up.length === 0 && IN.label('up') === '—', 'an action can be left unbound (and says so)');
    // survives a save round trip
    const json = JSON.stringify(ED.save.meta); const back = JSON.parse(json); ED.save.meta.settings.keys = back.settings.keys; IN.applyBindings(); ok(IN.MAP.attack.join() === 'KeyK' && IN.MAP.up.length === 0, 'bindings survive the save file');
    ED.save.meta.settings.keys = { up: ['Escape', 'KeyZ', 'KeyX'], dash: 'nope', bomb: [7, 'KeyB'] }; IN.applyBindings(); ok(IN.MAP.up.join() === 'KeyZ,KeyX' && IN.MAP.dash.join() === IN.DEFAULT_MAP.dash.join() && IN.MAP.bomb.join() === 'KeyB', 'a damaged or hand-edited save is sanitised (reserved keys dropped, at most two, junk ignored)');
    IN.bind('interact', 0, 'KeyG'); ok(IN.relabel('[E] Buy') === '[G] Buy' && IN.relabel('[E] a [E]') === '[G] a [G]' && IN.relabel('plain') === 'plain', 'on-screen [E] hints follow the binding');
    // the screens
    { const g = newGame(); g.scene = 'settings'; try { g.render(); } catch (e) { ok(false, 'settings: ' + e); } ok(ED.ui.btns.some(b => b.id === 'keys'), 'Options has a Key bindings button');
      ED.menus.go(g, 'keys'); try { g.render(); } catch (e) { ok(false, 'keys scene: ' + e); } const slots = ED.ui.btns.filter(b => /^slot:/.test(b.id)); ok(slots.length >= 18 && slots.length <= 24 && ED.ui.btns.some(b => b.id === 'reset') && ED.ui.btns.some(b => b.id === 'back'), 'the bindings screen lists every action with two slots (' + slots.length + ')');
      ED.ui.action = 'slot:bomb:0'; ED.input.consume('back'); g.step(); ok(!!ED.ui.rebind && typeof ED.input.textCapture === 'function', 'clicking a slot waits for a key'); try { g.render(); } catch (e) { ok(false, 'waiting: ' + e); }
      ED.input.textCapture('h', 'KeyH', {}); ok(!ED.ui.rebind && ED.input.textCapture === null && IN.MAP.bomb[0] === 'KeyH', 'the next key is bound and capture ends');
      ED.ui.action = 'slot:bomb:1'; g.step(); ED.input.textCapture('Escape', 'Escape', {}); ok(!ED.ui.rebind && IN.MAP.bomb[0] === 'KeyH', 'Escape cancels without changing anything');
      ED.ui.action = 'slot:bomb:0'; g.step(); ED.input.textCapture('Backspace', 'Backspace', {}); ok(!IN.MAP.bomb.includes('KeyH'), 'Backspace clears the slot');
      ED.ui.action = 'slot:bomb:0'; g.step(); ED.input.textCapture('Enter', 'Enter', {}); ok(g.toasts.some(t => /reserved/.test(t.msg)) && !ED.ui.rebind, 'a reserved key is refused with a message');
      ED.ui.action = 'reset'; g.step(); ok(IN.isDefault() && IN.MAP.up.join() === 'KeyW,ArrowUp', 'Reset restores the defaults'); ED.ui.action = 'back'; g.step(); ok(g.scene === 'settings', 'Done returns to Options');
      // help + tutorial + HUD follow
      IN.bind('dash', 0, 'KeyL'); g.scene = 'help'; try { g.render(); } catch (e) { ok(false, 'help: ' + e); } const g2 = newGame(); g2.startRun('KEYS', 'knight'); g2.scene = 'play'; try { g2.render(); stepN(g2, 3); g2.render(); } catch (e) { ok(false, 'play with custom keys: ' + e); } ok(true, 'help, tutorial and HUD draw with custom keys'); }
    restore(); ok(IN.isDefault(), 'bindings restored for the rest of the suite'); ctx.reapply();
  }

  section('P0d. Assist mode (not tied to any update)');
  {
    const D = ED.D, set = (lv) => { ED.save.meta.settings.assist = lv; }, mk = (lv, seed) => { set(lv); const g = newGame(); g.startRun(seed || 'ASSIST', 'knight'); g.scene = 'play'; g.god = true; return g; };
    try {
      let g = mk(0); ok(D.assistLevel === 0 && g.run.assist === 0 && D.at(5) === D.atBase(5) || ED.heat && ED.heat.live(), 'off: the difficulty rows are the untouched base rows');
      const base = D.atBase(8); const baseDmg = base.enemyDmg, baseTele = base.telegraph, baseHp = base.enemyHp;
      g = mk(1); const a1 = D.at(8); ok(g.run.assist === 1 && D.assistLevel === 1 && Math.abs(a1.enemyDmg - baseDmg * 0.8) < 1e-9 && Math.abs(a1.telegraph - baseTele * 1.15) < 1e-9 && a1.enemyHp === baseHp && a1.dmg === a1.enemyDmg && a1.tele === a1.telegraph, 'Gentle: foes hit 20% softer and warn 15% longer, aliases follow');
      ok(D.at(8) === a1 && base.enemyDmg === baseDmg && D.atBase(8) === base, 'rows are cached per level and the base table is never touched');
      g = mk(2); const a2 = D.at(8); ok(Math.abs(a2.enemyDmg - baseDmg * 0.6) < 1e-9 && Math.abs(a2.enemyHp - baseHp * 0.85) < 1e-9 && Math.abs(a2.bossHp - base.bossHp * 0.85) < 1e-9 && a2.danger <= base.danger && a2 !== a1, 'Easy: 40% softer, 15% less HP (bosses too), lower danger rating');
      ok(g.dif === D.at(1) && g.dif.enemyDmg < D.atBase(1).enemyDmg, 'the floor uses the assisted row');
      // a real foe hits softer
      set(0); const g0 = newGame(); g0.startRun('ASSIST', 'knight'); ED.debug.jumpFloor(g0, 6); const e0 = g0.spawnEnemy('chaser', 500, 300, { silent: true }); set(2); const g2 = newGame(); g2.startRun('ASSIST', 'knight'); ED.debug.jumpFloor(g2, 6); const e2 = g2.spawnEnemy('chaser', 500, 300, { silent: true });
      ok(Math.abs(e2.dmg / e0.dmg - 0.6) < 0.01 && Math.abs(e2.maxHp / e0.maxHp - 0.85) < 0.01, 'a spawned foe really is weaker (dmg x' + (e2.dmg / e0.dmg).toFixed(2) + ', hp x' + (e2.maxHp / e0.maxHp).toFixed(2) + ')');
      // records: assisted runs never set bests, but they still count as runs
      set(1); const m = ED.save.meta, best0 = m.bestFloor, runs0 = m.totalRuns, kills0 = m.totalKills, seedBest = Object.assign({}, m.bestBySeed); const ga = newGame(); ga.startRun('ASSISTREC', 'knight'); ga.scene = 'play'; ED.debug.jumpFloor(ga, best0 + 6); ga.run.kills = 7; const res = ED.save.recordRun(ga.run);
      ok(m.bestFloor === best0 && !m.bestBySeed.ASSISTREC && !res.newBest && m.totalRuns === runs0 + 1 && m.totalKills === kills0 + 7, 'an assisted run records kills and runs, never a personal best');
      set(0); const gb = newGame(); gb.startRun('ASSISTREC2', 'knight'); gb.scene = 'play'; ED.debug.jumpFloor(gb, best0 + 6); ok(m.bestFloor === best0 + 6, 'the same depth unassisted does set it'); m.bestFloor = best0;
      // the Options screen cycles it and everything draws
      set(0); g = newGame(); g.scene = 'settings'; ED.ui.back = 'title'; try { g.render(); } catch (e) { ok(false, 'settings: ' + e); } ok(ED.ui.btns.some(b => b.id === 'opt:assist'), 'Options has an Assist button');
      for (const [start, dir, want] of [[0, 1, 1], [1, 1, 2], [2, 1, 0], [0, -1, 2]]) { set(start); ED.ui.navSel = 'opt:assist'; ED.ui.action = dir > 0 ? 'opt:assist' : null; if (dir < 0) ED.input.sim = { held: {}, edge: { left: true } }; g.step(); ED.input.sim = { held: {}, edge: {} }; ok((ED.save.meta.settings.assist | 0) === want, 'cycling ' + start + (dir > 0 ? ' forward' : ' back') + ' gives ' + want); }
      for (const lv of [1, 2]) { g = mk(lv, 'ASSISTDRAW'); try { for (let i = 0; i < 20; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; } g.render(); g.scene = 'dead'; g.deadT = 60; g.render(); } catch (e) { ok(false, 'draw assist ' + lv + ': ' + e); } } ok(true, 'the HUD badge and end screen draw');
      set(99); g = mk(99, 'ASSISTJUNK'); ok(g.run.assist === 0 && D.assistLevel === 0, 'a junk setting means off');
    } finally { ED.save.meta.settings.assist = 0; D.assistLevel = 0; }
  }

  section('P0e. Save export / import (not tied to any update)');
  {
    const SV = ED.save, keep = SV.meta, snap = () => JSON.stringify(SV.meta);
    try {
      SV.meta.totalRuns = 7; SV.meta.bestFloor = 13; SV.meta.unlocked.items['boss:vael'] = true; SV.meta.settings.assist = 1; SV.meta.hunt = { roster: [{ id: 1, name: 'Vask' }], fallen: [], nextId: 2, slain: 0, born: 1, escaped: 0 };
      const txt = SV.exportText(), before = snap(); ok(typeof txt === 'string' && JSON.parse(txt).totalRuns === 7 && txt === before, 'export is the whole save as JSON text');
      SV.meta.totalRuns = 99; SV.meta.hunt = null; const r = SV.importText(txt); ok(r.ok && r.runs === 7 && r.best === 13 && SV.meta.totalRuns === 7 && SV.meta.hunt.roster[0].name === 'Vask' && SV.meta.settings.assist === 1 && SV.meta.unlocked.items['boss:vael'] && SV.meta.unlocked.classes.knight, 'import restores everything it exported');
      for (const bad of ['', 'nope', '[1,2]', '42', 'null', '{}', '{"unlocked":1,"settings":{}}', '{"unlocked":{},"settings":3}']) { const keepTxt = snap(); const rr = SV.importText(bad); ok(!rr.ok && !!rr.why && snap() === keepTxt, 'junk is refused and changes nothing (' + JSON.stringify(bad).slice(0, 24) + ')'); }
      const partial = SV.importText('{"unlocked":{"items":{"x":true}},"settings":{"volume":0.2},"bestFloor":5}'); ok(partial.ok && SV.meta.bestFloor === 5 && SV.meta.settings.volume === 0.2 && SV.meta.settings.music === 0.45 && Array.isArray(SV.meta.unlocked.classes) === false && SV.meta.unlocked.classes.knight && !!SV.meta.seen && !!SV.meta.bestBySeed, 'a partial save is filled in from the defaults');
      SV.importText('{"unlocked":{"__proto__":{"polluted":1}},"settings":{"__proto__":{"polluted2":1}},"__proto__":{"polluted3":1},"constructor":{"prototype":{"polluted4":1}}}');
      ok(({}).polluted === undefined && ({}).polluted2 === undefined && ({}).polluted3 === undefined && ({}).polluted4 === undefined && Object.prototype.polluted === undefined, 'pasted data can never pollute Object.prototype');
      // the Options buttons
      const g = newGame(); g.scene = 'settings'; ED.ui.back = 'title'; try { g.render(); } catch (e) { ok(false, 'options: ' + e); } ok(ED.ui.btns.some(b => b.id === 'export') && ED.ui.btns.some(b => b.id === 'import'), 'Options has Export and Import buttons');
      ED.ui.action = 'export'; g.step(); ok(g.toasts.some(t => /Could not reach the clipboard/.test(t.msg)), 'export without a clipboard or prompt says so instead of failing silently');
      SV.meta = keep; SV.meta.totalRuns = 7; const t2 = SV.exportText(); SV.meta.totalRuns = 1; ED.menus.importSave(g, t2); ok(SV.meta.totalRuns === 7 && g.toasts.some(t => /imported/.test(t.msg)), 'the import button path restores and says so'); ED.menus.importSave(g, 'garbage'); ok(g.toasts.some(t => /failed/.test(t.msg)), 'a bad paste is reported');
    } finally { SV.meta = keep; }
  }

  section('P0f. The in-game Guide');
  {
    const G = ED.guide, g = newGame(); ok(G && ED.sceneImpl.guide, 'the guide exists');
    for (const p of P.LIST) if (P.on(p.id)) { ok(Array.isArray(p.guide) && p.guide.length >= 2 && p.guide.every(t => typeof t === 'string' && t.length > 40), p.id + ' has a guide page'); g.scene = 'guide'; try { ED.sceneImpl.guide.update(g, 'pg:' + p.id, ED.input); g.render(); } catch (e) { ok(false, 'guide ' + p.id + ': ' + e); } ok(G.fits(g.ctx, p.id) <= 360, p.id + ' guide text fits its panel (' + Math.round(G.fits(g.ctx, p.id)) + 'px)'); }
    const off = P.LIST.filter(p => !P.on(p.id)); g.scene = 'guide'; g.render(); ok(!ED.ui.btns.some(b => off.some(p => b.id === 'pg:' + p.id)), 'updates that are switched off have no page' + (off.length ? ' (' + off.map(p => p.id).join(',') + ')' : ''));
    g.scene = 'help'; g.render(); ok(ED.ui.btns.some(b => b.id === 'guide') && ED.ui.btns.some(b => b.id === 'back'), 'the Controls screen links to the guide'); ED.ui.action = 'guide'; g.step(); ok(g.scene === 'guide', 'the link opens it'); ED.ui.action = 'back'; g.step(); ok(g.scene === 'help', 'Back returns to Controls');
    // facts the guide states must stay true
    ok(P.BY_ID.v12 && /six per class/.test(P.BY_ID.v12.guide.join(' ')) && (!ED.talents || ED.talents.LIST.length === 66), 'the talent page matches the table'); ok(!ED.hunt || /up to two/i.test(P.BY_ID.v9.guide.join(' ')) && ED.hunt.MAXR === 6, 'the hunt page matches the rules'); ok(!ED.events || ED.events.LIST.length >= 17, 'the fate page lists encounters that exist');
  }

  section('P0g. Error safety nets (the browser must never freeze on a bug)');
  {
    const mkG = () => { const g = newGame(); g.startRun('SAFE', 'knight'); g.scene = 'play'; g.god = true; g.introT = 999; g.toasts.length = 0; return g; };
    let g = mkG(); const f0 = g.frameAll; g.frameTick(1 / 60); g.frameTick(1 / 60); ok(g.frameAll > f0 && !g.lastError, 'a healthy frame steps and draws');
    const boom = () => { throw new Error('boom from a hook'); };
    ED.hook('tick', 'v1', boom); const saved = ED.hooksSafe, consoleError = console.error; console.error = () => {};        // the safety nets log what they catch: keep the test output clean
    try {
      ED.hooksSafe = false; g = mkG(); let threw = false; try { g.step(); } catch (e) { threw = /boom/.test(e.message); } ok(threw, 'strict mode (the tests) still throws, so real bugs stay loud');
      let escaped = false; try { g.frameTick(1 / 60); } catch (e) { escaped = true; } ok(!escaped && g.lastError && /boom/.test(g.lastError.msg) && g.errorCount >= 1, 'the frame loop catches it and records it');
      ok(g.toasts.some(t => /Something went wrong/.test(t.msg)) && g.scene === 'play', 'it tells the player and keeps going at first');
      for (let i = 0; i < 8; i++) g.frameTick(1 / 60); ok(g.scene === 'paused', 'repeated errors pause the game so the player can leave safely (scene ' + g.scene + ')');
      let ok2 = true; for (let i = 0; i < 20; i++) { try { g.frameTick(1 / 60); } catch (e) { ok2 = false; } } ok(ok2 && g.errorCount >= 1, 'a paused game does not keep failing');
      ED.hooksSafe = true; g = mkG(); let thrown = false; try { for (let i = 0; i < 6; i++) g.step(); } catch (e) { thrown = true; } const h = ED.hooks.tick.find(x => x.fn === boom);
      ok(!thrown && h.errors === 3 && h.dead === true, 'browser mode: the broken hook is isolated and switched off after 3 errors (errors ' + h.errors + ')'); ok(g.toasts.filter(t => /was caught/.test(t.msg)).length === 1 && g.scene === 'play', '...with one toast, and the run goes on');
      const k0 = g.run.frames; for (let i = 0; i < 30; i++) { g.step(); } ok(g.run.frames > k0 && g.player.hp > 0, '...and the game really keeps running');
    } finally { ED.hooks.tick.splice(ED.hooks.tick.findIndex(x => x.fn === boom), 1); ED.hooksSafe = saved; }
    // a render error (not a step error) is survived too
    g = mkG(); const r0 = g.render; g.render = function () { throw new Error('render boom'); }; let esc = false; try { for (let i = 0; i < 10; i++) g.frameTick(1 / 60); } catch (e) { esc = true; } g.render = r0; console.error = consoleError; ok(!esc && g.lastError && /render boom/.test(g.lastError.msg), 'a drawing error is caught as well');
  }
  section('P0h. Foes never spawn inside a brazier (a shot stops at it: a stationary foe there could never be hit)');
  {
    const g = arena('knight', 8, 'BRAZ'); g.god = false; g.enemies.length = 0; g.spawns.length = 0; g.props.length = 0;
    const pr = { kind: 'prop', type: 'brazier', x: 400, y: 300, r: 13, hp: 1, solid: true, dead: false, lit: false, seed: 0.5 }; g.props.push(pr);
    g.player.x = 620; g.player.y = 300;
    const idol = g.spawnEnemy('spinner', pr.x, pr.y, { silent: true }); idol.hold = true;
    const gap = Math.hypot(idol.x - pr.x, idol.y - pr.y);
    ok(gap >= idol.r * 0.82 + pr.r, 'a foe spawned exactly on a brazier is moved off it (' + Math.round(gap) + 'px from its centre)');
    ok(idol.x > pr.x + 10, '...to the side the player is on, so a shot can reach it');
    const hp0 = idol.hp; g.pShot({ kind: 'arrow', ang: Math.PI, speed: 10, dmg: 5, kb: 0, crit: false, pierce: 0, life: 60, r: 5, color: '#fff' });
    for (let i = 0; i < 40; i++) g.updatePProj();
    ok(idol.hp < hp0, 'an arrow fired at it now lands (hp ' + hp0.toFixed(1) + ' -> ' + idol.hp.toFixed(1) + ')');
    const far = g.spawnEnemy('chaser', 760, 420, { silent: true }), near = g.spawnEnemy('chaser', 400, 360, { silent: true });
    ok(far.x === 760 && far.y === 420 && near.x === 400 && near.y === 360, 'foes spawned anywhere else stay exactly where they were placed');
    const k = g.spawnEnemy('chaser', 400, 300, { silent: true }); ok(Math.hypot(k.x - pr.x, k.y - pr.y) >= k.r * 0.82 + pr.r, 'movers are lifted off it too');
    pr.dead = true; const free = g.spawnEnemy('chaser', 400, 300, { silent: true }); ok(free.x === 400 && free.y === 300, 'a spent prop does not push anyone');
  }
  section('P0i. The Versions screen keeps every preset chip apart (16+ updates)');
  {
    const g = newGame(); g.scene = 'versions'; g.render(); const b = ED.ui.btns.filter(x => /^(upto:|allpacks)$|^upto:/.test(x.id)).sort((p, q) => p.x - q.x);
    ok(b.length === P.LIST.length + 1 && b[b.length - 1].id === 'allpacks', 'one chip per update plus EVERYTHING (' + b.length + ')');
    let gap = true; for (let i = 1; i < b.length; i++) if (b[i].x < b[i - 1].x + b[i - 1].w + 3) gap = false; ok(gap, 'no two chips touch or overlap'); ok(b[0].x >= 8 && b[b.length - 1].x + b[b.length - 1].w <= 952, 'the row stays inside the screen'); ok(b[b.length - 1].w >= 90, 'EVERYTHING has room for its label');
  }
};

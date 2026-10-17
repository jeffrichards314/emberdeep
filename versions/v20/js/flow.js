/* EMBERDEEP — flow.js
 * Game flow mixin: runs, floors, rooms, doors + locks, encounters (waves), arena rewrites,
 * interactables, boss / mini boss rewards, permanent unlocks, key hints and softlock guards.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, C = ED.C, T = ED.T, DIRS = ED.DIRS;
  const TAU = U.TAU;

  const F = {
    // ================================================================= runs + floors
    startRun(seed, classId) {
      seed = ED.normalizeSeed(seed);
      const meta = ED.save.meta;
      meta.lastSeed = seed; meta.lastClass = classId; ED.save.save();
      this.run = {
        seed, classId, rng: new ED.RNG(seed + ':run'), kills: 0, killsByType: {}, damageTaken: 0, hitsTaken: 0, goldEarned: 0, attacks: 0,
        activesUsed: 0, itemsTaken: 0, relicOrder: [], frames: 0, floorNum: 1, victory: false, bossesKilled: [], minisKilled: [], unlockedNow: [],
        roomsCleared: 0, startedAt: Date.now(), milestoneShown: false, cashedOut: false,
        packs: ED.packs.stamp(), packSet: ED.packs.active(),
      };
      this.rng = this.run.rng;
      if (ED.worlds) ED.worlds.use(this.run);          // the run whose route (if any packs record one) decides which world a floor belongs to
      ED.D.assistLevel = this.run.assist = (meta.settings.assist | 0) > 0 && ED.D.ASSIST[meta.settings.assist | 0] ? meta.settings.assist | 0 : 0;      // Assist: chosen in Options, fixed for the whole run
      this.player = this.makePlayer(classId);
      this.god = false; this.slowT = 0; this.slowmoT = 0; this.timers = []; this.popups = []; this.toasts = [];
      this.modal = null; this.bossCard = null; this.doorHint = null;
      this.allies = [];
      ED.runHooks('runStart', this);
      this.startFloor(1);
    },
    freeFloor() {
      if (this.floor) {
        for (const r of this.floor.rooms) { r.cache = null; r.rt = null; r.tiles = null; r.holds = null; }
        ED.stats.caches = 0;
      }
      this.floor = null; this.room = null; this.rt = null;
      this.enemies = []; this.pproj = []; this.eproj = []; this.zones = []; this.pickups = []; this.inters = []; this.props = [];
      this.fx = []; this.texts = []; this.swings = []; this.spawns = []; this.bombs = []; this.timers = []; this.allies = [];
    },
    startFloor(n) {
      this.freeFloor();
      this.floorNum = n; this.run.floorNum = Math.max(this.run.floorNum, n);
      this.dif = D.at(n);
      this.floor = ED.gen.generate(n, this.run.seed);
      this.theme = this.floor.theme;
      this.pillarCount = 0; this.fightStarted = false; this.hintId = null; this.bossCard = null;
      const p = this.player;
      p.keys = { small: 0, mb: 0, boss: 0 };       // keys never carry between floors
      this.relicEvent('floorStart');
      ED.runHooks('floorStart', this);
      this.checkMilestones();
      if (n > ED.save.meta.bestFloor && !this.run.assist) { ED.save.meta.bestFloor = n; ED.save.save(); }
      this.scene = 'intro'; this.introT = 0;
      this.enterRoom(this.floor.rooms[this.floor.startId], null, true);
      this.clearFloorLists();
      this.floor.rooms[this.floor.startId].discovered = true;
      ED.audio && ED.audio.music.set({ floor: n, boss: false, intensity: 0.15, flavor: ED.worlds ? ED.worlds.flavorFor(n) : null });
      this.sfx('door');
    },
    clearFloorLists() { this.fx.length = 0; this.texts.length = 0; this.eproj.length = 0; },
    nextFloor() {
      this.transFloor = { t: 0, dur: 40 };
    },
    after(frames, fn) { this.timers.push({ t: frames, fn }); },
    updateTimers() {
      for (const t of this.timers) { t.t--; if (t.t <= 0) { t.done = true; try { t.fn(); } catch (e) { console.error(e); } } }
      if (this.timers.length) U.compact(this.timers, t => !t.done);
    },

    // ================================================================= room runtime
    initRuntime(room) {
      const rng = new ED.RNG(room.seed);
      const dirs = DIRS.filter(d => room.doors[d]);
      const rt = {
        rng, pickups: [], inters: [], props: [], lockdown: false, enc: null, spawnTiles: ED.rooms.spawnTiles(room.tiles, dirs), dirs,
        dirty: true, special: null, dark: false, cleared: room.type === 'start' || room.type === 'rest' ? true : false, visitedCount: 0, torches: [],
        keyHolder: null, traps: null, plates: null,
      };
      room.rt = rt;
      // decorative torches
      for (let i = 0; i < 6; i++) rt.torches.push({ x: 90 + rng.int(0, 780), y: rng.chance(0.5) ? 20 : 556, ph: rng.next() * 6 });
      return rt;
    },
    /** one-time content creation (pots, encounters, specials) when the room is first entered */
    setupRoom(room) {
      const rt = room.rt, rng = rt.rng, F_ = this.floorNum;
      const saveInters = this.inters, savePk = this.pickups, saveProps = this.props;
      this.inters = rt.inters; this.pickups = rt.pickups; this.props = rt.props;
      const dc = this.dif;
      if (room.type === 'start') {
        const bs = this.floor.bombSupply;
        if (bs > 0) for (let i = 0; i < bs; i++) this.dropPickup('bomb', 400 + i * 40, 230, 1, { still: true });
        if (F_ === 1) rt.tutorial = true;
        this.scatterProps(rt, rng.int(2, 4));
      } else if (room.type === 'normal' || room.type === 'haunted' || room.type === 'challenge') {
        if (room.type === 'normal') {
          this.scatterProps(rt, rng.int(0, 5));
          rt.enc = { state: 'idle', waves: ED.encounter.planRoom(this, room, rng.fork('enc'), F_), idx: 0, t: 0 };
          // key holders: EVERY hold in this room needs its own carrier / chest (several keys can share a room)
          const holds = (room.holds || []).filter(h => h.via === 'enemy' && !h.got);
          holds.forEach((hold, k) => {
            const wi = rt.enc.waves.length - 1 - (k % rt.enc.waves.length);       // spread across the last waves
            const wave = rt.enc.waves[wi];
            let ent = wave.find(x => !x.carriesKey);
            if (!ent) { ent = { type: wave[0].type, elite: false, mods: [] }; wave.push(ent); }
            ent.carriesKey = hold.key; ent.holdId = hold.id;
            if (hold.key === 'mb' && !ent.elite) D.makeElite(ent, Math.max(F_, 2), rng);
          });
          rt.keyChests = (room.holds || []).filter(h => h.via === 'chest' && !h.got);
          if (room.puzzle) ED.specials.setupPuzzle(this, room, rt);
        }
      } else if (room.type === 'miniboss' || room.type === 'boss') {
        this.scatterProps(rt, 0);
        rt.bossSpec = room.type === 'miniboss' ? room.mini : room.bossDef;
      }
      const sp = ED.specials[room.type];
      if (sp && sp.setup) sp.setup(this, room, rt);
      this.inters = saveInters; this.pickups = savePk; this.props = saveProps;
    },
    scatterProps(rt, n) {
      const tiles = rt.spawnTiles.filter(t => (t.tx < 5 || t.tx > 24 || t.ty < 4 || t.ty > 13) && t.tx > 2 && t.tx < 27 && t.ty > 2 && t.ty < 15);
      for (let i = 0; i < n && tiles.length; i++) {
        const k = rt.rng.int(0, tiles.length - 1), t = tiles.splice(k, 1)[0];
        const pr = { kind: 'prop', type: rt.rng.chance(0.2) ? 'crate' : 'pot', x: t.x, y: t.y, r: 11, hp: 1, solid: true, dead: false, flash: 0, seed: rt.rng.next() };
        rt.props.push(pr);
      }
    },
    doorState(room, dir) {
      const e = room.doors[dir];
      if (!e) return 'wall';
      if (e.hidden && !e.revealed) return 'hidden';
      if (e.lock && !e.lock.opened) return e.lock.type === 'bomb' ? 'bomb' : 'locked';
      if (room.rt && room.rt.lockdown) return 'closed';
      return 'open';
    },
    refreshCollision() {
      const room = this.room;
      if (!this.col) this.col = new Uint8Array(C.COLS * C.ROWS);
      const col = this.col, tiles = room.tiles;
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        col[i] = (t === T.WALL || t === T.ROCK) ? 1 : t === T.PIT ? 2 : 0;
      }
      for (const d of DIRS) {
        const st = this.doorState(room, d);
        for (const [x, y] of ED.rooms.DOOR_TILES[d]) col[y * C.COLS + x] = st === 'open' ? 0 : 1;
      }
      if (room.rt) room.rt.dirty = true;
    },
    setTile(tx, ty, t) {
      if (tx < 1 || ty < 1 || tx >= C.COLS - 1 || ty >= C.ROWS - 1) return;
      this.room.tiles[ty * C.COLS + tx] = t; this.refreshCollision();
      const p = this.player;
      if (ED.phys.blocked(this, p.x, p.y, p.cr, false, false)) { ED.phys.unstick(this, p); if (t === T.PIT) this.hurtPlayer(Math.round(3 * this.dif.enemyDmg), p.x, p.y, { zone: true, noKnock: true }); }
      for (const e of this.enemies) if (!e.big && !e.dead && ED.phys.blocked(this, e.x, e.y, e.r * 0.8, !!e.flying, false)) ED.phys.unstick(this, e);
    },
    zoneTiles(src, tiles, dur, type) {
      const color = type === T.LAVA ? '#ff5a2a' : type === T.WATER ? '#4de0c8' : type === T.ICE ? '#9fe4ff' : '#aa88ff';
      return this._zone({ kind: 'tele', shape: 'tiles', tiles, set: new Set(tiles), dur, dmg: 0, hurts: false, src, color, x: 480, y: 288, onEnd: (g, z) => {
        if (!g.room.rt.baseTiles) g.room.rt.baseTiles = Uint8Array.from(g.room.tiles);
        for (const i of z.tiles) { g.room.tiles[i] = type; }
        g.refreshCollision(); g.shake(8); g.sfx('crack');
        const p = g.player;
        if (ED.phys.blocked(g, p.x, p.y, p.cr, false, false)) { ED.phys.unstick(g, p); g.hurtPlayer(Math.round(3 * g.dif.enemyDmg), p.x, p.y, { zone: true, noKnock: true }); }
        for (const e of g.enemies) if (!e.big && !e.dead && ED.phys.blocked(g, e.x, e.y, e.r * 0.8, !!e.flying, false)) ED.phys.unstick(g, e);
      } });
    },
    restoreArena() {
      const rt = this.room && this.room.rt;
      if (!rt) return;
      if (rt.baseTiles) { this.room.tiles.set(rt.baseTiles); rt.baseTiles = null; }
      // pillars made via setTile: rebuild from the generator's original tiles if present
      if (rt.origTiles) this.room.tiles.set(rt.origTiles);
      this.pillarCount = 0; this.refreshCollision();
      ED.phys.unstick(this, this.player);
    },
    crackWallsNear(x, y, r) {
      const room = this.room; if (!room) return;
      for (const d of DIRS) {
        const e = room.doors[d]; if (!e) continue;
        const c = ED.rooms.doorCenter(d);
        if (Math.hypot(c.x - x, c.y - y) > r + 36) continue;
        if (e.hidden && !e.revealed) { e.revealed = true; this.onWallOpened(room, d, e, 'A secret passage crumbles open!'); }
        else if (e.lock && e.lock.type === 'bomb' && !e.lock.opened) { e.lock.opened = true; this.onWallOpened(room, d, e, 'The cracked wall explodes open!'); }
      }
    },
    onWallOpened(room, d, e, msg) {
      const other = this.floor.rooms[e.a === room.id ? e.b : e.a];
      other.discovered = true;
      this.toast(msg, '#ff9a3c', 140); this.sfx('crack'); this.shake(6);
      const c = ED.rooms.doorCenter(d); this.burst(c.x, c.y, 30, '#8a7a6a', 5, 30, { size: 4 });
      this.refreshCollision(); this.run.secretsFound = (this.run.secretsFound || 0) + 1;
    },

    // ================================================================= entering rooms
    enterRoom(room, fromDir, silent) {
      const prev = this.room;
      this.room = room;
      room.visited = true; room.discovered = true;
      for (const d of DIRS) {
        const e = room.doors[d]; if (!e) continue;
        if (e.hidden && !e.revealed && !this.player.relics.thirdeye) continue;
        const o = this.floor.rooms[e.a === room.id ? e.b : e.a]; o.discovered = true;
      }
      const first = !room.rt;
      if (first) { this.initRuntime(room); this.rt = room.rt; this.refreshCollision(); this.props = room.rt.props; this.setupRoom(room); }
      this.rt = room.rt;
      this.pickups = this.rt.pickups; this.inters = this.rt.inters; this.props = this.rt.props;
      this.enemies = []; this.pproj = []; this.eproj = []; this.zones = []; this.swings = []; this.spawns = []; this.bombs = []; this.fx = []; this.texts.length = 0;
      this.refreshCollision();
      if (!this.rt.origTiles) this.rt.origTiles = Uint8Array.from(room.tiles);
      const p = this.player;
      if (fromDir) { const pos = ED.rooms.entryPos(ED.OPP[fromDir]); p.x = pos.x; p.y = pos.y; p.vx = p.vy = 0; p.kx = p.ky = 0; }
      else { p.x = 480; p.y = 340; }
      p.dashT = 0; p.hammerT = 0; p.bashT = 0; p.echoQ = null;
      this.rt.visitedCount++;
      this.bossCard = null;
      this.allies = [];
      this.relicEvent('enter');
      ED.runHooks('roomEnter', this, room);
      if (!silent || first) this.onEnterRoom(room, first);
      this.updateMusic();
    },
    onEnterRoom(room, first) {
      const rt = this.rt;
      const sp = ED.specials[room.type];
      if (rt.enc && rt.enc.state === 'idle' && !room.cleared) { rt.enc.state = 'warm'; rt.enc.t = 0; }
      if (room.type === 'miniboss' || room.type === 'boss') {
        if (!room.cleared && !rt.bossStarted) {
          rt.bossStarted = true; rt.bossT = 0; rt.lockdown = true; this.refreshCollision(); this.sfx('door');
        }
      }
      if (sp && sp.onEnter) sp.onEnter(this, room, rt, first);
    },
    /** door transition */
    transition(dir) {
      const e = this.room.doors[dir]; if (!e) return;
      const to = this.floor.rooms[e.a === this.room.id ? e.b : e.a];
      this.trans = { t: 0, dur: 22, dir, to, did: false };
      this.transT = 22;
    },

    // ================================================================= update helpers for rooms
    updateRoom() {
      const room = this.room, rt = this.rt, p = this.player;
      // door contact + locks
      this.updateDoors();
      // encounter
      if (rt.enc) this.updateEncounter();
      const sp = ED.specials[room.type];
      if (sp && sp.update) sp.update(this, room, rt);
      if (room.puzzle) ED.specials.updatePuzzle(this, room, rt);
      // boss rooms
      if ((room.type === 'miniboss' || room.type === 'boss') && rt.bossStarted && !room.cleared) this.updateBossRoom();
      // interactables: nearest in range
      let best = null, bd = 1e9;
      for (const it of this.inters) {
        if (it.dead || it.disabled) continue;
        const d = Math.hypot(it.x - p.x, it.y - p.y);
        if (d < (it.range || 52) && d < bd) { bd = d; best = it; }
      }
      this.nearInter = best;
      for (const it of this.inters) if (it.update) it.update(this, it);
      U.compact(this.inters, it => !it.dead);
    },
    updateDoors() {
      const room = this.room, p = this.player;
      this.doorHint = null;
      for (const d of DIRS) {
        const st = this.doorState(room, d);
        if (st === 'wall' || st === 'hidden') continue;
        const c = ED.rooms.doorCenter(d);
        const near = Math.hypot(c.x - p.x, c.y - p.y) < 62;
        if (st === 'open') {
          // walked into the doorway?
          const inX = Math.abs(p.x - c.x) < 34, inY = Math.abs(p.y - c.y) < 34;
          if ((d === 'N' && p.y < 22 && inX) || (d === 'S' && p.y > C.ROOM_H - 22 && inX) || (d === 'W' && p.x < 22 && inY) || (d === 'E' && p.x > C.ROOM_W - 22 && inY)) {
            if (!this.trans && p.dashT <= 0 || (!this.trans)) this.transition(d);
          }
        } else if (st === 'locked' && near) {
          const e = room.doors[d], lock = e.lock, def = ED.keys.LOCKS[lock.type];
          if (def.key) {
            if ((p.keys[def.key] | 0) > 0) { this.unlockDoor(room, d, e); }
            else this.doorHint = { dir: d, text: 'Locked — needs ' + ED.keys.KEYTYPES[def.key].name, color: def.color, lock };
          } else if (lock.type === 'switch') this.doorHint = { dir: d, text: 'Sealed — activate ' + lock.params.n + ' ' + (lock.params.kind === 'plates' ? 'pressure plates' : 'braziers') + ' elsewhere on this floor', color: def.color, lock };
          else if (lock.type === 'sacrifice') this.doorHint = { dir: d, text: '[E] Blood Pact: ' + lock.params.gold + ' gold or 1 max heart', color: def.color, lock, interact: true };
        } else if (st === 'bomb' && near) {
          this.doorHint = { dir: d, text: 'Cracked wall — bomb it (B)', color: '#ff8a3c', lock: room.doors[d].lock };
        }
      }
    },
    unlockDoor(room, d, e) {
      const lock = e.lock, def = ED.keys.LOCKS[lock.type];
      if (def.key) this.player.keys[def.key]--;
      lock.opened = true;
      const other = this.floor.rooms[e.a === room.id ? e.b : e.a]; other.discovered = true;
      this.refreshCollision(); this.sfx('unlockdoor'); this.shake(3);
      const c = ED.rooms.doorCenter(d); this.burst(c.x, c.y, 18, def.color, 3.5, 24);
      this.toast('Unlocked!', def.color);
      this.run.locksOpened = (this.run.locksOpened || 0) + 1;
    },
    /** E near a sacrifice door */
    trySacrificeDoor() {
      const h = this.doorHint;
      if (!h || !h.interact) return false;
      this.modal = { type: 'sacrifice', lock: h.lock, dir: h.dir, sel: 0 };
      return true;
    },
    paySacrifice(kind) {
      const p = this.player, m = this.modal, lock = m.lock;
      if (kind === 'gold') { if (p.gold < lock.params.gold) { this.sfx('deny'); this.toast('Not enough gold', '#ff6a6a'); return; } p.gold -= lock.params.gold; }
      else if (kind === 'hp') {
        if (p.maxHp > 12) { p.bonusHp -= 4; ED.items.recalc(p); this.toast('Max HP reduced by 1 heart', '#c05cff'); }
        else { this.hurtPlayerPure(4); }
      }
      this.modal = null;
      const e = this.room.doors[m.dir];
      lock.opened = true; this.refreshCollision(); this.sfx('curse'); this.burst(p.x, p.y, 24, '#c05cff', 4, 30);
      this.toast('The pact is sealed. The door opens.', '#c05cff');
    },
    /** non-lethal self damage used for the always-available blood option */
    hurtPlayerPure(n) { const p = this.player; p.hp = Math.max(1, p.hp - n); this.addText(p.x, p.y - 20, '-' + n, '#c05cff', 14); this.shake(4); },

    // ================================================================= encounters
    spawnWave(enc) {
      const wave = enc.waves[enc.idx], rt = this.rt, p = this.player;
      const used = [];
      for (const ent of wave) {
        const def = ED.enemyTypes[ent.type];
        let pos = null;
        for (let k = 0; k < 24 && !pos; k++) {
          const t = rt.spawnTiles[Math.floor(Math.random() * rt.spawnTiles.length)];
          if (!t) break;
          if (U.dist2(t.x, t.y, p.x, p.y) < 150 * 150) continue;
          if (used.some(u => U.dist2(u.x, u.y, t.x, t.y) < 38 * 38)) continue;
          pos = t;
        }
        if (!pos) { const t = rt.spawnTiles[Math.floor(Math.random() * rt.spawnTiles.length)] || { x: 480, y: 288 }; pos = t; }
        used.push(pos);
        this.queueSpawn(ent.type, pos.x, pos.y, { elite: ent.elite, mods: ent.mods, carriesKey: ent.carriesKey, holdId: ent.holdId, haunt: enc.haunt, flyer: def && def.flying, extra: ent.extra });
      }
      this.sfx('summon');
    },
    updateEncounter() {
      const enc = this.rt.enc, room = this.room;
      if (!enc || room.cleared) return;
      if (enc.state === 'warm') { if (++enc.t >= 40) { this.lockRoom(true); enc.state = 'fight'; enc.t = 0; this.spawnWave(enc); } }
      else if (enc.state === 'fight') {
        // the last survivors get desperate: kiters stop kiting so a fight can never stall
        const alive = this.aliveEnemies();
        if (alive > 0 && alive <= 2 && this.spawns.length === 0) {
          enc.survT = (enc.survT || 0) + 1;
          if (enc.survT === 60 * 22) { for (const e of this.enemies) if (!e.boss) e.rush = true; this.toast('The survivors grow desperate!', '#ff9a6a', 100); }
        } else enc.survT = 0;
        if (this.spawns.length === 0 && this.aliveEnemies() === 0) {
          enc.idx++;
          if (enc.idx >= enc.waves.length) { enc.state = 'done'; this.clearRoom(); }
          else { enc.state = 'gap'; enc.t = 0; }
        }
      } else if (enc.state === 'gap') { if (++enc.t >= 46) { enc.state = 'fight'; this.spawnWave(enc); } }
    },
    lockRoom(on) {
      this.rt.lockdown = on; this.refreshCollision();
      this.sfx('door'); this.shake(2);
      this.updateMusic();
    },
    clearRoom(opts) {
      opts = opts || {};
      const room = this.room, rt = this.rt, p = this.player;
      room.cleared = true; rt.cleared = true;
      this.lockRoom(false);
      this.run.roomsCleared++;
      this.activeOnRoomClear();
      this.relicEvent('clear');
      ED.runHooks('roomClear', this, room);
      this.sfx('unlockdoor');
      if (opts.quiet) return;
      const spc = ED.specials[room.type];
      if (spc && spc.onClear && spc.onClear(this, room, rt) === false) { this.toast('Room cleared', '#cfd8ff', 70); return; }
      // rewards
      const rng = rt.rng, luck = p.st.luck;
      const gold = (4 + rng.int(0, 5)) * (room.type === 'challenge' ? 3 : 1);
      this.dropGold(480, 300, gold);
      if (rng.chance(0.22 + luck * 0.02) || p.hp <= p.maxHp * 0.3 && rng.chance(0.5)) this.dropPickup('heart', 440 + rng.int(0, 80), 300, 4);
      if (rng.chance(0.14 + luck * 0.01)) this.dropPickup('bomb', 440 + rng.int(0, 80), 320, 1);
      const pending = (rt.keyChests || []).filter(h => !h.got);
      pending.forEach((h, i) => this.spawnKeyChest(h, 480 + (i - (pending.length - 1) / 2) * 70));
      if (!pending.length && room.type === 'normal' && rng.chance(0.09 + luck * 0.01)) this.spawnLootChest(480, 280);
      this.toast('Room cleared', '#cfd8ff', 70);
    },
    spawnKeyChest(hold, x) {
      this.addInter({ type: 'chest', x: x === undefined ? 480 : x, y: 270, r: 20, label: 'Open chest', color: '#f2c94c', hold, prompt: () => 'Open chest', use: (g, it) => { it.dead = true; hold.got = true; g.dropPickup('key', it.x, it.y, 1, { keyType: hold.key, still: true }); g.toast('A key was inside!', ED.keys.KEYTYPES[hold.key].color); g.sfx('keydrop'); g.burst(it.x, it.y, 20, '#f2c94c', 4, 26); g.dropGold(it.x, it.y, 6); } });
      this.toast('A chest appears!', '#f2c94c');
    },
    spawnLootChest(x, y) {
      this.addInter({ type: 'chest', x, y, r: 20, label: 'Open chest', color: '#c89a5a', prompt: () => 'Open chest', use: (g, it) => {
        it.dead = true; g.sfx('pickup'); g.burst(it.x, it.y, 20, '#ffd24a', 4, 26);
        const rng = g.rt.rng;
        const r = rng.next();
        if (r < 0.5) g.dropGold(it.x, it.y, 10 + rng.int(0, 10));
        else { const o = ED.items.rollOffers(rng.fork('chest' + g.frame), g.floorNum, 1, { luck: g.player.st.luck, relics: g.player.relics })[0]; g.dropLoot(o, it.x, it.y + 16, true); }
      } });
    },

    // ================================================================= interactables
    addInter(def) {
      const it = Object.assign({ kind: 'inter', id: ED.id(), x: 480, y: 288, r: 18, range: 56, t: 0 }, def);
      if (it.type !== 'plate') { const s = this.freeSpot(it.x, it.y, 20); it.x = s.x; it.y = s.y; }   // never inside rocks / pits
      this.inters.push(it); return it;
    },
    /** nearest ground position (r = clearance) that is not inside a wall, rock, pit or solid prop */
    freeSpot(x, y, r) {
      const free = (px, py) => {
        if (ED.phys.blocked(this, px, py, r, false, false)) return false;
        for (const pr of this.props) if (!pr.dead && pr.solid && Math.hypot(pr.x - px, pr.y - py) < pr.r + r * 0.7) return false;
        return true;
      };
      if (free(x, y)) return { x, y };
      for (let rad = 12; rad < 420; rad += 12) {
        const n = Math.max(8, Math.round(rad / 6));
        for (let k = 0; k < n; k++) {
          const a = k * TAU / n, px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
          if (px > 60 && px < C.ROOM_W - 60 && py > 60 && py < C.ROOM_H - 60 && free(px, py)) return { x: px, y: py };
        }
      }
      return { x, y };
    },
    /** item on the floor / pedestal */
    dropLoot(item, x, y, free) {
      return this.addInter({ type: 'pedestal', loot: true, item, x, y, r: 14, free: true, price: null });
    },
    pedestal(item, x, y, o) {
      return this.addInter(Object.assign({ type: 'pedestal', item, x, y, r: 16 }, o));
    },
    tryInteract() {
      if (this.trySacrificeDoor()) return;
      const it = this.nearInter;
      if (!it) return;
      if (it.type === 'pedestal') return this.usePedestal(it);
      if (it.use) it.use(this, it);
    },
    canAfford(price) {
      const p = this.player; if (!price) return true;
      if (price.gold !== undefined && p.gold < price.gold) return false;
      if (price.maxHp !== undefined && p.maxHp - price.maxHp < 8) return false;
      return true;
    },
    usePedestal(it) {
      const p = this.player;
      if (!this.canAfford(it.price)) { this.sfx('deny'); this.toast(it.price && it.price.gold !== undefined ? 'Not enough gold' : 'Not enough life to pay', '#ff6a6a'); return; }
      if (it.price) {
        if (it.price.gold !== undefined) { p.gold -= it.price.gold; this.sfx('buy'); }
        if (it.price.maxHp !== undefined) { p.bonusHp -= it.price.maxHp; ED.items.recalc(p); this.sfx('curse'); this.flashScreen('#a00020', 0.3); this.toast('You trade life for power...', '#ff3a4a'); }
      }
      if (it.item.curse && it.item.cat === 'relic') this.cursePlayer(it.item.curse);
      const old = this.equipItem(it.item);
      if (it.item.curse && it.item.cat === 'relic') this.sfx('curse');
      it.dead = true;
      if (old) this.dropLoot(old, p.x + 22, p.y + 18);
      if (it.group) for (const o of this.inters) if (o !== it && o.group === it.group) { o.disabled = true; o.caged = true; this.burst(o.x, o.y, 8, '#888', 2, 18); }
      if (it.onTake) it.onTake(this, it);
    },

    // ================================================================= bosses
    updateBossRoom() {
      const room = this.room, rt = this.rt;
      rt.bossT++;
      if (rt.bossT === 50 && !rt.bossSpawned) {
        rt.bossSpawned = true;
        const bosses = room.type === 'boss' ? ED.bosses.spawn(this, rt.bossSpec) : ED.minibosses.spawn(this, rt.bossSpec);
        this.sfx('bossroar'); this.shake(14);
        ED.audio && ED.audio.music.set({ boss: true, intensity: 0.95 });
        this.bossRef = bosses;
      }
    },
    onBossKilled(e) {
      const room = this.room, rt = this.rt, mini = !!e.mini;
      this.zones.length = 0; this.eproj.length = 0; this.spawns.length = 0;       // no late spawns after the kill
      for (const o of this.enemies) if (!o.dead && o !== e) { o.noLoot = true; o.dead = true; this.burst(o.x, o.y, 10, o.color, 3, 20); }
      this.slowmoT = 110; this.flashScreen('#ffffff', 0.6); this.hitstop(10); this.shake(16);
      if (this.player.relics) for (let i = 0; i < 7; i++) this.after(i * 12, () => this.explodeFx(e.x + U.rnd(-e.r, e.r) * 0.7, e.y + U.rnd(-e.r, e.r) * 0.7, 60, e.color));
      this.restoreArena();
      ED.audio && ED.audio.music.set({ boss: false, intensity: 0.2 });
      this.after(120, () => { this.bossRewards(e, mini); });
    },
    bossRewards(e, mini) {
      const room = this.room, rt = this.rt, p = this.player, rng = rt.rng, F_ = this.floorNum;
      room.cleared = true; rt.cleared = true; rt.lockdown = false; this.refreshCollision();
      this.run.roomsCleared++; this.activeOnRoomClear(); this.relicEvent('clear'); ED.runHooks('roomClear', this, room);
      this.bossCard = null;
      const cx = 480, cy = 288;
      this.sfx('unlockdoor');
      const spec = rt.bossSpec;
      if (mini) {
        this.run.minisKilled.push(spec.defId);
        const first = ED.save.markMini(spec.defId);
        this.dropGold(cx, cy, 12 + rng.int(0, 8) + Math.floor(F_ * 1.5));
        this.dropPickup('heart', cx - 70, cy + 40, 4);
        // guaranteed item / relic choice (better than rooms)
        const offers = ED.items.rollOffers(rng.fork('mini'), F_, 3, { luck: p.st.luck + 1, relics: p.relics, minRank: 1, kinds: { weapon: 2.5, armor: 2.5, relic: 5, active: 0.8 } });
        this.offerChoice(offers, cx, cy - 40);
        // boss key
        const hold = (room.holds || []).find(h => h.key === 'boss');
        if (hold) this.dropBossKeyPickup(hold, cx, cy);
        for (const h of room.holds || []) if (h.key !== 'boss' && !h.got) { h.got = true; this.dropPickup('key', cx + 60, cy + 30, 1, { keyType: h.key, still: true }); this.toast('A key drops!', ED.keys.KEYTYPES[h.key].color); }
        if (first) this.checkUnlocks('mini', spec.defId);
        else {
          this.dropGold(cx, cy, 8);
          if (rng.chance(0.18)) this.bonusUnlock();          // a chance at a permanent unlock on every mini boss kill
        }
        this.toast('Mini boss defeated!', '#ffd24a', 140);
        ED.runHooks('miniDefeated', this, spec);
      } else {
        const def = ED.bosses.def(spec.defId);
        this.run.bossesKilled.push(spec.defId);
        if (spec.partnerId) this.run.bossesKilled.push(spec.partnerId);
        this.dropGold(cx, cy, 25 + 3 * F_);
        const offers = ED.items.rollOffers(rng.fork('boss'), F_, 3, { luck: p.st.luck + 2, relics: p.relics, minRank: 2, kinds: { weapon: 3, armor: 3, relic: 5, active: 1 } });
        this.offerChoice(offers, cx, cy - 70);
        // heal option
        this.addInter({ type: 'healfont', x: cx - 150, y: cy + 90, r: 18, color: '#ff7aa0', prompt: () => 'Restore full health', use: (g, it) => { g.healPlayer(p.maxHp); it.dead = true; g.ringFx(p.x, p.y, 10, 90, '#ff7aa0', 24, 5); g.sfx('heal'); } });
        this.addInter({ type: 'healfont', x: cx + 150, y: cy + 90, r: 18, color: '#ff4a6a', prompt: () => '+1 Heart Container (and heal 4)', use: (g, it) => { p.bonusHp += 4; ED.items.recalc(p); g.healPlayer(4); it.dead = true; g.sfx('levelup'); g.ringFx(p.x, p.y, 10, 90, '#ff4a6a', 24, 5); } });
        const stairs = this.addInter({ type: 'stairs', x: cx, y: cy + 100, r: 24, range: 46, color: '#cfd8ff', prompt: () => 'Descend to floor ' + (F_ + 1), use: (g) => g.nextFloor() });
        ED.runHooks('stairs', this, stairs);           // packs may turn the way down into several exits (v17: the route choice after a MEGA boss)
        this.toast(spec.mega ? 'MEGA BOSS DEFEATED!' : 'Boss defeated!', '#ffd24a', 180);
        this.checkUnlocks('boss', spec.defId, spec);
        // milestone at floor 5, cash-out altar on later megas
        if (spec.mega && F_ === 5 && !this.run.milestoneShown) { this.run.milestoneShown = true; this.after(100, () => { this.modal = { type: 'milestone', sel: 0 }; this.sfx('win'); }); }
        else if (spec.mega) this.addInter({ type: 'cashout', x: cx + 280, y: cy + 100, r: 18, color: '#ffd24a', prompt: () => 'Cash Out — end the run as a victory', use: (g) => { g.modal = { type: 'milestone', sel: 0 }; } });
      }
      this.updateMusic();
    },
    dropBossKeyPickup(hold, x, y) {
      hold.got = true;
      const k = this.dropPickup('key', x, y - 30, 1, { keyType: 'boss', still: true });
      this.toast('You obtained the BOSS KEY!', ED.keys.KEYTYPES.boss.color, 200); this.sfx('keypick');
      this.flashScreen('#ff3b4a', 0.25);
    },
    /** a "pick one of N" set of pedestals (others cage when one is taken) */
    offerChoice(offers, cx, cy) {
      const n = offers.length, gid = ED.id();
      offers.forEach((it, i) => this.pedestal(it, cx + (i - (n - 1) / 2) * 90, cy, { group: gid }));
    },
    /** permanent unlocks on first kills. kind 'mini'|'boss' */
    checkUnlocks(kind, id, spec) {
      const lines = [];
      const keys = kind === 'mini' ? ['mini:' + id] : ['boss:' + id];
      if (kind === 'boss') {
        const first = ED.save.markBoss(id);
        const def = ED.bosses.def(id);
        if (def && def.megaIndex !== undefined) keys.push('mega:' + def.megaIndex);
        if (!first) return;
      }
      for (const k of keys) {
        if (ED.save.unlockItem(k)) {
          for (const u of ED.items.unlockables()) if (u.unlock === k) lines.push((u.kind === 'relic' ? 'Relic: ' : 'Active: ') + u.def.name);
          for (const r of Object.values(ED.items.RELICS)) if (r.unlock === k && !lines.some(l => l.endsWith(r.name))) lines.push('Relic: ' + r.name);
        }
        for (const c of ED.items.classList()) if (c.unlock === k && ED.save.unlockClass(c.id)) lines.push('New class: ' + c.name + ' (' + ED.items.WEAPONS[c.weapon].name + ')');
      }
      if (lines.length) { this.popups.push({ title: 'UNLOCKED', lines, t: 0, dur: 360 }); this.sfx('unlock'); this.run.unlockedNow.push(...lines); }
    },

    /** generic unlock (milestones such as floor:6 / kills:400 / victory): items + classes tied to that key */
    unlockKey(k) {
      if (!ED.save.unlockItem(k)) return;
      const lines = [];
      for (const u of ED.items.unlockables()) if (u.unlock === k) lines.push((u.kind === 'relic' ? 'Relic: ' : 'Active: ') + u.def.name);
      for (const c of ED.items.classList()) if (c.unlock === k && ED.save.unlockClass(c.id)) lines.push('New class: ' + c.name + ' (' + ED.items.WEAPONS[c.weapon].name + ')');
      if (lines.length) { this.popups.push({ title: 'UNLOCKED', lines, t: 0, dur: 360 }); this.sfx('unlock'); if (this.run) this.run.unlockedNow.push(...lines); }
    },
    checkMilestones(final) {
      const m = ED.save.meta, r = this.run; if (!r) return;
      for (const k of ED.items.milestoneKeys()) {
        const [kind, v] = k.split(':'), n = +v;
        if (kind === 'floor' && Math.max(r.floorNum, m.bestFloor) >= n) this.unlockKey(k);
        else if (kind === 'kills' && m.totalKills + (final ? 0 : r.kills) >= n) this.unlockKey(k);
        else if (kind === 'victory' && r.victory) this.unlockKey(k);
      }
    },

    /** unlock one random still-locked item (relic/active) permanently */
    bonusUnlock() {
      const pool = ED.items.unlockables().filter(u => !ED.save.isItemUnlocked(u.unlock));
      if (!pool.length) return;
      const u = this.rng.pick(pool); ED.save.unlockItem(u.unlock);
      const names = ED.items.unlockables().filter(x => x.unlock === u.unlock).map(x => (x.kind === 'relic' ? 'Relic: ' : 'Active: ') + x.def.name);
      this.popups.push({ title: 'UNLOCKED', lines: names, t: 0, dur: 360 }); this.sfx('unlock'); this.run.unlockedNow.push(...names);
    },
    // ================================================================= hints / guards
    updateHints() {
      if (this.frame % 90 !== 0 || !this.floor) return;
      this.hintId = ED.keys.hintRoom(this.floor, this.player.keys, false);
      // bomb softlock guard
      const p = this.player;
      if (p.bombs <= 0 && this.room && (this.room.type === 'normal' || this.room.type === 'start') && (this.room.cleared || this.room.type === 'start') && this.bombNeeded()) {
        const have = (r) => r.rt && r.rt.pickups.some(k => k.type === 'bomb' && !k.dead);
        if (!this.floor.rooms.some(have) && (this.frame - (this.lastBombRescue || -9999)) > 600) {
          this.lastBombRescue = this.frame;
          const t = this.rt.spawnTiles[Math.floor(Math.random() * this.rt.spawnTiles.length)] || { x: 480, y: 288 };
          this.dropPickup('bomb', t.x, t.y, 1, { still: true });
          this.toast('A stray bomb lies here...', '#ff9a3c', 120);
        }
      }
    },
    bombNeeded() {
      for (const e of this.floor.edges) {
        if (e.lock && e.lock.type === 'bomb' && !e.lock.opened) return true;
        if (e.hidden && !e.revealed) { const r = this.floor.rooms[e.b]; if ((r.holds || []).some(h => !h.got)) return true; }
      }
      return false;
    },
    updateMusic() {
      if (!ED.audio || !this.room) return;
      const combat = this.rt && this.rt.lockdown;
      const dn = Math.min(1, this.dif.danger / 40);
      ED.audio.music.set({ intensity: combat ? Math.min(0.95, 0.55 + dn * 0.3) : 0.12 + dn * 0.1, boss: !!(this.room.type === 'boss' && this.rt.lockdown) });
    },
    // ================================================================= run end
    onPlayerDeath() {
      if (this.dying) return;
      this.dying = { t: 0 };
      this.slowmoT = 120; this.flashScreen('#ff0000', 0.5); this.sfx('bossdie');
      this.burst(this.player.x, this.player.y, 40, '#ff4a4a', 6, 40, { size: 4 });
    },
    finishRun(victory) {
      const run = this.run; run.victory = !!victory; run.frames = run.frames;
      const res = ED.save.recordRun(run);
      this.runResult = res;
      ED.runHooks('runEnd', this, !!victory);
      this.checkMilestones(true);
      this.scene = victory ? 'victory' : 'dead';
      this.deadT = 0; this.dying = null;
      ED.audio && ED.audio.music.set({ intensity: 0.1, boss: false });
      if (victory) this.sfx('win');
    },
    cashOut() { this.modal = null; this.run.cashedOut = true; this.finishRun(true); },
  };
  ED.mixins.push(F);
})(typeof globalThis !== 'undefined' ? globalThis : this);

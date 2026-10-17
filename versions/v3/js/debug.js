/* EMBERDEEP — debug.js : backtick debug mode (overlay + hotkeys). Also a scriptable API for tests. */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, D = ED.D;
  const HOTKEYS = [
    ['1', 'God mode'], ['2', 'Give all keys'], ['3', 'Skip to BOSS room'], ['4', 'Spawn mini boss here'], ['5', 'Reveal key locations'],
    ['6', 'Floor +1'], ['7', 'Floor -1'], ['8', 'Jump to floor N'], ['9', 'Spawn random item'], ['0', 'Clear room'],
    ['-', 'Full heal + 500 gold'], ['=', 'Spawn this floor\'s boss here'], ['[', 'Reveal whole map'], [']', 'Unlock everything (meta)'], ['\\', 'Go to next mini boss room'],
  ];
  const X = ED.debug = {
    on: false, log: [],
    init(g) {
      if (typeof window === 'undefined' || !window.addEventListener) return;
      window.addEventListener('keydown', e => {
        if (!X.on || ED.input.textCapture) return;
        if (e.repeat) return;
        const k = e.key; if (!'1234567890-=[]\\'.includes(k) || k.length !== 1) return;
        e.preventDefault(); X.hotkey(g, k);
      });
    },
    toggle(g) { X.on = !X.on; g.toast && g.toast('Debug mode ' + (X.on ? 'ON' : 'OFF'), '#7fd8ff'); },
    update(g) { /* nothing per frame; hotkeys are event driven */ },

    hotkey(g, k) {
      if (!g.run || !g.floor) { if (k === '1') g.god = !g.god; return; }
      switch (k) {
        case '1': X.god(g); break; case '2': X.giveKeys(g); break; case '3': X.skipToBoss(g); break; case '4': X.spawnMini(g); break;
        case '5': X.revealKeys(g); break; case '6': X.jumpFloor(g, g.floorNum + 1); break; case '7': X.jumpFloor(g, Math.max(1, g.floorNum - 1)); break;
        case '8': { const v = typeof prompt === 'function' ? parseInt(prompt('Jump to floor:', String(g.floorNum + 5)), 10) : NaN; if (v > 0) X.jumpFloor(g, v); break; }
        case '9': X.spawnItem(g); break; case '0': X.clearRoom(g); break; case '-': X.heal(g); break; case '=': X.spawnBoss(g); break;
        case '[': X.revealAll(g); break; case ']': X.unlockAll(g); break; case '\\': X.gotoMini(g); break;
      }
    },
    // ---------------------------------------------------------------- actions (also used by tests)
    god(g) { g.god = !g.god; g.toast('God mode ' + (g.god ? 'ON' : 'OFF'), '#7fd8ff'); },
    giveKeys(g) { const p = g.player; p.keys.small += 3; p.keys.mb += 3; p.keys.boss += 1; p.bombs += 5; g.toast('All keys granted', '#7fd8ff'); },
    heal(g) { g.healPlayer(g.player.maxHp); g.player.gold += 500; },
    goto(g, room, x, y) {
      g.trans = null; g.transT = 0; g.modal = null;
      for (const e of g.floor.edges) if (e.a === room.id || e.b === room.id) { if (e.lock && e.lock.type !== 'boss') e.lock.opened = true; e.revealed = true; }
      g.enterRoom(room, null);
      g.player.x = x || 480; g.player.y = y || 410;
    },
    skipToBoss(g) { const r = g.floor.rooms[g.floor.bossId]; X.goto(g, r, 480, 460); },
    gotoMini(g) { const ms = g.floor.rooms.filter(r => r.type === 'miniboss' && !r.cleared); if (ms.length) X.goto(g, ms[0], 480, 460); },
    jumpFloor(g, n) { g.startFloor(n); g.scene = 'play'; g.introT = 999; g.toast('Floor ' + n, '#7fd8ff'); },
    spawnMini(g) {
      const spec = ED.minibosses.pick(g.floorNum, new ED.RNG('dbg' + g.frame), []);
      X.arm(g, spec); ED.minibosses.spawn(g, spec);
    },
    spawnBoss(g) { const spec = ED.bosses.forFloor(g.floorNum, new ED.RNG('dbgb' + g.floorNum)); X.arm(g, spec); ED.bosses.spawn(g, spec); },
    arm(g, spec) { const rt = g.rt; rt.bossSpec = spec; rt.bossStarted = true; rt.bossSpawned = true; rt.bossT = 99; g.lockRoom(true); },
    spawnItem(g) {
      const rng = new ED.RNG('item' + g.frame + Math.random());
      const it = ED.items.rollOffers(rng, g.floorNum, 1, { luck: 5, relics: g.player.relics, minRank: 1 })[0];
      g.dropLoot(it, g.player.x + 40, g.player.y); g.toast('Spawned: ' + ED.items.itemName(it), ED.items.itemColor(it));
    },
    clearRoom(g) {
      for (const e of g.enemies) if (!e.dead) { e.noLoot = true; e.hp = 0; g.killEnemy(e); }
      g.spawns.length = 0;
      if (!g.room.cleared && g.rt.enc) { g.rt.enc.idx = g.rt.enc.waves.length; g.rt.enc.state = 'done'; g.clearRoom(); }
    },
    revealAll(g) { for (const r of g.floor.rooms) { r.discovered = true; } for (const e of g.floor.edges) if (e.hidden) e.revealed = true; g.refreshCollision(); },
    revealKeys(g) {
      const f = g.floor; X.revealAll(g);
      const lines = ED.keys.describeSources(f);
      g.hintId = ED.keys.hintRoom(f, g.player.keys, true);
      g.toast('Key locations: ' + lines.join(' | '), '#7fd8ff', 420);
      for (const l of lines) console.log('[debug] ' + l);
    },
    unlockAll(g) {
      for (const u of ED.items.unlockables()) ED.save.unlockItem(u.unlock);
      for (const r of Object.values(ED.items.RELICS)) if (r.unlock) ED.save.unlockItem(r.unlock);
      for (const c of Object.values(ED.items.CLASSES)) ED.save.unlockClass(c.id);
      g.toast('Everything unlocked (meta)', '#7fd8ff');
    },

    // ---------------------------------------------------------------- overlay
    draw(g, c) {
      c.save(); c.font = '11px ' + ED.ui.FONT; c.textAlign = 'left';
      const w = 300, x = 6, y = 70;
      c.fillStyle = 'rgba(0,0,0,0.78)'; c.fillRect(x, y, w, 330); c.strokeStyle = '#7fd8ff'; c.strokeRect(x + 0.5, y + 0.5, w - 1, 329);
      let yy = y + 14; const line = (s, col) => { c.fillStyle = col || '#bfe8ff'; c.fillText(s, x + 8, yy); yy += 13; };
      line('DEBUG  fps ' + g.fps + '  frame ' + g.frame, '#7fd8ff');
      if (g.run) {
        line('seed ' + g.run.seed + '  floor ' + g.floorNum + '  danger ' + g.dif.danger + '  tier ' + g.dif.tier + (g.god ? '  GOD' : ''));
        line('room ' + g.room.id + ' ' + g.room.type + ' [' + g.room.template + '] ' + (g.room.cleared ? 'cleared' : 'active') + (g.floor.fallback ? ' FALLBACK' : ''));
        line('enemies ' + g.enemies.length + '  eproj ' + g.eproj.length + '  zones ' + g.zones.length + '  fx ' + g.fx.length + '  pk ' + g.pickups.length);
        line('hp ' + g.player.hp + '/' + g.player.maxHp + ' gold ' + g.player.gold + ' keys ' + JSON.stringify(g.player.keys));
        const f = g.floor;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const r of f.rooms) { x0 = Math.min(x0, r.gx); x1 = Math.max(x1, r.gx); y0 = Math.min(y0, r.gy); y1 = Math.max(y1, r.gy); }
        const cw = Math.min(30, 280 / (x1 - x0 + 1)), ch = 18, ox = x + 10, oy = yy + 4;
        const pos = r => [ox + (r.gx - x0) * cw + cw / 2, oy + (r.gy - y0) * ch + ch / 2];
        for (const e of f.edges) { const a = pos(f.rooms[e.a]), b = pos(f.rooms[e.b]); c.strokeStyle = e.hidden ? '#c78bff' : '#556'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); if (e.lock) { c.fillStyle = ED.keys.LOCKS[e.lock.type].color; c.fillRect((a[0] + b[0]) / 2 - 3, (a[1] + b[1]) / 2 - 3, 6, 6); } }
        for (const r of f.rooms) { const p = pos(r); c.fillStyle = r === g.room ? '#fff' : (ED.roomTypes[r.type].color); c.fillRect(p[0] - cw / 2 + 3, p[1] - ch / 2 + 2, cw - 6, ch - 4); c.fillStyle = '#000'; c.font = '9px monospace'; c.fillText(r.type[0].toUpperCase() + r.id, p[0] - cw / 2 + 5, p[1] + 3); for (const h of r.holds || []) { c.fillStyle = h.got ? '#555' : ED.keys.KEYTYPES[h.key].color; c.fillRect(p[0] + cw / 2 - 8, p[1] - ch / 2, 5, 5); } }
        yy = oy + (y1 - y0 + 1) * ch + 14; c.font = '11px ' + ED.ui.FONT;
        for (const l of ED.keys.describeSources(f).slice(0, 4)) line(l.slice(0, 48), '#ffd24a');
      }
      yy = y + 340; c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(x, yy - 12, w, 12 + Math.ceil(HOTKEYS.length / 2) * 13);
      HOTKEYS.forEach((h, i) => { c.fillStyle = '#9ad'; c.fillText('[' + h[0] + '] ' + h[1], x + 8 + (i % 2) * 150, yy + Math.floor(i / 2) * 13); });
      c.restore();
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

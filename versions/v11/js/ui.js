/* EMBERDEEP — ui.js : HUD, minimap, tooltips, boss bar, popups, floor intro, in-run overlays + modals.
 * (Menus / collection / settings live in menus.js.)  Immediate-mode: draw registers buttons,
 * the next update handles hover/click/keyboard.  Rendering only — no simulation side effects
 * except explicit menu actions. */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, C = ED.C, T = ED.T, DIRS = ED.DIRS;
  const TAU = U.TAU;
  const FONT = '"Courier New", Menlo, Consolas, monospace';

  const UI = ED.ui = {
    FONT, sel: 0, btns: [], prevBtns: [], tab: 0, scroll: 0, hover: null, tip: null, seedEdit: false, selClass: 'knight', seedText: '', t: 0, confirm: null,
    create(g) { return {}; },

    // ============================================================== text + widgets
    text(c, s, x, y, size, color, align, bold) {
      c.font = (bold === false ? '' : 'bold ') + size + 'px ' + FONT; c.textAlign = align || 'left'; c.textBaseline = 'alphabetic';
      c.fillStyle = color || '#fff'; c.fillText(s, x, y);
    },
    shadow(c, s, x, y, size, color, align, bold) {
      UI.text(c, s, x + 1.5, y + 1.5, size, 'rgba(0,0,0,0.7)', align, bold); UI.text(c, s, x, y, size, color, align, bold);
    },
    panel(c, x, y, w, h, border, alpha) {
      c.fillStyle = 'rgba(10,10,20,' + (alpha === undefined ? 0.88 : alpha) + ')'; c.fillRect(x, y, w, h);
      c.strokeStyle = border || '#5a5a78'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2);
    },
    wrap(c, s, x, y, w, lh, size, color) {
      c.font = size + 'px ' + FONT; c.textAlign = 'left'; c.fillStyle = color || '#cfd0e0';
      const words = String(s).split(' '); let line = '', yy = y;
      for (const wd of words) {
        const t2 = line ? line + ' ' + wd : wd;
        if (c.measureText(t2).width > w && line) { c.fillText(line, x, yy); line = wd; yy += lh; } else line = t2;
      }
      if (line) { c.fillText(line, x, yy); yy += lh; }
      return yy;
    },
    wrapHeight(c, s, w, lh, size) {
      c.font = size + 'px ' + FONT; const words = String(s).split(' '); let line = '', n = 1;
      for (const wd of words) { const t2 = line ? line + ' ' + wd : wd; if (c.measureText(t2).width > w && line) { line = wd; n++; } else line = t2; }
      return n * lh;
    },
    /** register + draw a button; returns true if currently selected */
    button(c, id, label, x, y, w, h, o) {
      o = o || {};
      const idx = UI.btns.length; UI.btns.push({ id, x, y, w, h, nav: o.nav !== false && !o.disabled, disabled: !!o.disabled, o });
      const m = ED.input.mouse; const hov = m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
      const sel = !o.disabled && (o.selected || (UI.navSel === id));
      c.fillStyle = o.disabled ? 'rgba(30,30,44,0.8)' : sel || hov ? 'rgba(80,70,130,0.95)' : 'rgba(30,28,56,0.92)'; c.fillRect(x, y, w, h);
      c.strokeStyle = o.disabled ? '#3a3a4a' : sel || hov ? (o.color || '#ffd24a') : '#5a5a80'; c.lineWidth = sel || hov ? 3 : 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2);
      UI.text(c, label, x + w / 2, y + h / 2 + (o.size || 16) * 0.35, o.size || 16, o.disabled ? '#6a6a80' : (sel || hov) ? '#fff' : (o.textColor || '#cfd0ee'), 'center');
      if (o.sub) UI.text(c, o.sub, x + w / 2, y + h - 6, 10, '#9a9ab8', 'center', false);
      return sel;
    },
    beginFrame() { UI.prevBtns = UI.btns; UI.btns = []; },

    // ============================================================== HUD
    drawHud(g, c) {
      if (g.scene === 'intro' && g.introT < 40) return;
      const p = g.player, t = g.frameAll, st = p.st;
      // top bar
      c.fillStyle = 'rgba(8,8,16,0.96)'; c.fillRect(0, 0, C.W, C.HUD);
      c.fillStyle = g.dif.dangerColor; c.fillRect(0, C.HUD - 2, C.W, 2);
      // hearts
      const nH = Math.ceil(p.maxHp / 4), perRow = nH > 24 ? 14 : 10, sz = nH > 30 ? 4.2 : nH > 20 ? 5.2 : 6.4, dx = sz * 2.7;
      for (let i = 0; i < nH; i++) {
        const row = Math.floor(i / perRow), col = i % perRow, x = 14 + sz + col * dx, y = 12 + sz + row * (sz * 2.5);
        const fill = U.clamp((p.hp - i * 4) / 4, 0, 1), full = Math.min(4, p.maxHp - i * 4) / 4;
        ED.render.heart(c, x, y, sz); c.fillStyle = '#2a1520'; c.fill();
        if (fill > 0) { c.save(); c.beginPath(); c.rect(x - sz * 1.6, y - sz * 1.4, sz * 3.2 * fill, sz * 3); c.clip(); ED.render.heart(c, x, y, sz); c.fillStyle = p.hp <= p.maxHp * 0.25 && Math.floor(t / 14) % 2 ? '#ffffff' : '#ff3a5a'; c.fill(); c.restore(); }
        ED.render.heart(c, x, y, sz); c.strokeStyle = '#7a3040'; c.lineWidth = 1; c.stroke();
        if (full < 1) { c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(x + sz * 1.6 * full * 2 - sz * 1.6, y - sz * 1.4, 0, 0); }
      }
      // resources
      const rx = 238;
      ED.icons.draw(c, 'coin', rx + 8, 16, 7, g.goldPulse > 0 ? '#fff6a0' : '#ffd24a'); UI.text(c, String(p.gold), rx + 22, 21, 15, g.goldPulse > 0 ? '#fff6a0' : '#ffd24a');
      ED.icons.draw(c, 'bomb', rx + 84, 16, 7, '#ff9a3c'); UI.text(c, String(p.bombs), rx + 97, 21, 15, '#ff9a3c');
      let kx = rx;
      for (const k of ['small', 'mb', 'boss']) {
        const kt = ED.keys.KEYTYPES[k], n = p.keys[k] | 0, flash = g.keyFlash && g.keyFlash.type === k;
        c.fillStyle = n ? U.rgba(kt.color, 0.28) : 'rgba(255,255,255,0.05)'; c.fillRect(kx, 33, 38, 22); c.strokeStyle = n ? kt.color : '#3a3a50'; c.lineWidth = flash ? 3 : 1.5; c.strokeRect(kx + 0.5, 33.5, 37, 21);
        (k === 'boss' ? ED.icons.ICONS.bosskey : ED.icons.ICONS.key)(c, kx + 12, 44, 7, n ? kt.color : '#4a4a5a'); UI.text(c, 'x' + n, kx + 33, 49, 12, n ? '#fff' : '#555', 'right');
        kx += 44;
      }
      // weapon
      const wx = 392, w = p.weapon;
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(wx - 8, 6, 188, 52);
      ED.render.itemGlyph(c, w, wx + 12, 30, 11, t);
      UI.text(c, ED.items.itemName(w).slice(0, 20), wx + 30, 20, 12, ED.items.itemColor(w));
      UI.text(c, 'DMG ' + p.wdmg.toFixed(1) + '  SPD ' + (60 / p.wcd).toFixed(1) + '/s', wx + 30, 36, 11, '#c8c8d8', 'left', false);
      UI.text(c, 'CRIT ' + Math.round(st.crit * 100) + '%  DEF ' + st.def.toFixed(1), wx + 30, 51, 11, '#9a9ab8', 'left', false);
      // active ability
      const ax = 580, a = p.active;
      if (a) {
        const s = ED.items.activeStats(a.item), def = s.def;
        c.fillStyle = '#10101c'; c.beginPath(); c.arc(ax + 22, 31, 22, 0, TAU); c.fill();
        if (a.charges < a.max && a.timers.length) {
          const tot = Math.max(1, s.cd * 60 * st.activeCd), prog = 1 - (Math.min.apply(null, a.timers) / tot);
          c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(ax + 22, 31); c.arc(ax + 22, 31, 21, -Math.PI / 2, -Math.PI / 2 + TAU * prog); c.closePath(); c.fill();
        }
        c.strokeStyle = a.charges > 0 ? def.color : '#4a4a5a'; c.lineWidth = 3; c.beginPath(); c.arc(ax + 22, 31, 21, 0, TAU); c.stroke();
        ED.render.itemGlyph(c, a.item, ax + 22, 31, 11, t);
        for (let i = 0; i < a.max; i++) { c.fillStyle = i < a.charges ? def.color : '#2a2a3a'; c.fillRect(ax + 50 + i * 9, 14, 7, 7); }
        UI.text(c, ED.input.key1('active') + ' ' + def.name, ax + 50, 34, 9, a.charges > 0 ? '#fff' : '#888');
        if (s.rooms) UI.text(c, 'rooms ' + a.roomProg + '/' + s.rooms, ax + 50, 46, 9, '#9a9ab8', 'left', false);
      }
      // dash cooldown
      const dcd = p.dashCd > 0 ? 1 - p.dashCd / Math.max(1, 40 * st.dashCd) : 1;
      c.fillStyle = '#1a1a2a'; c.fillRect(ax + 50, 52, 56, 4); c.fillStyle = dcd >= 1 ? '#7fd8ff' : '#4a6a88'; c.fillRect(ax + 50, 52, 56 * dcd, 4);
      UI.text(c, 'DASH', ax + 50, 63, 8, '#8a8aa8', 'left', false);
      // floor + danger
      const fx = 728;
      UI.text(c, 'FLOOR ' + g.floorNum, fx, 22, 18, g.floor && g.floor.isMega ? '#ff9a6a' : '#ffffff');
      UI.text(c, 'DANGER ' + g.dif.danger, fx, 38, 12, g.dif.dangerColor);
      UI.text(c, g.dif.dangerName, fx, 52, 11, g.dif.dangerColor, 'left', false);
      // skulls pips
      const pips = Math.min(8, 1 + Math.floor(g.dif.danger / 4));
      for (let i = 0; i < pips; i++) ED.icons.draw(c, 'skull', fx + 84 + (i % 4) * 10, 14 + Math.floor(i / 4) * 11, 3.6, g.dif.dangerColor);
      UI.text(c, UI.timeStr(g.run.frames), 866, 58, 10, '#8a8aa8', 'right', false);
      if (g.run.assist) UI.text(c, 'ASSIST: ' + ED.D.ASSIST[g.run.assist].name.toUpperCase(), 14, C.HUD + 32, 10, '#ffb04a', 'left', true);
      UI.text(c, g.run.kills + ' kills', 950, 58, 10, '#8a8aa8', 'right', false);

      UI.drawMinimap(g, c);
      ED.runHooks('hud', g, c);
      UI.drawRelicBar(g, c);
      UI.drawBossBars(g, c);
      UI.drawToasts(g, c);
      UI.drawInterPanel(g, c);
      UI.drawBossCard(g, c);
      UI.drawPopups(g, c);
      // low hp vignette
      if (p.hp <= p.maxHp * 0.25 && !p.dead) { c.fillStyle = 'rgba(255,0,0,' + (0.05 + 0.04 * Math.sin(g.frameAll * 0.2)) + ')'; c.fillRect(0, C.HUD, C.W, C.ROOM_H); }
      // seed (small)
      UI.text(c, 'seed ' + g.run.seed, 8, C.H - 5, 10, 'rgba(255,255,255,0.35)', 'left', false);
      if (g.floorNum === 1 && g.rt && g.rt.tutorial && g.room.type === 'start' && g.run.frames < 60 * 40) UI.drawTutorial(g, c);
      if (ED.input.held('tab')) UI.drawBigMap(g, c);
    },
    timeStr(f) { const s = Math.floor(f / 60), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); },
    drawTutorial(g, c) {
      const I = ED.input, lines = I.isDefault() ? ['WASD / Arrows: move     Space / J: attack     K / Shift: dash (i-frames!)', 'E: interact     Q: active ability     B: place bomb     Esc: pause', 'Clear rooms to open doors. Find the Boss Key — carried by a mini boss.']
        : [['up', 'left', 'down', 'right'].map(a => I.key1(a)).join(' ') + ': move     ' + I.label('attack') + ': attack     ' + I.label('dash') + ': dash (i-frames!)', I.label('interact') + ': interact     ' + I.label('active') + ': active ability     ' + I.label('bomb') + ': place bomb     Esc: pause', 'Clear rooms to open doors. Find the Boss Key — carried by a mini boss.'];
      UI.panel(c, 150, 420 + C.HUD - 10, 660, 78, '#6a6a90', 0.7);
      lines.forEach((l, i) => UI.text(c, l, 480, 450 + C.HUD + i * 18 - 14, 13, '#e0e0f0', 'center', false));
    },

    // ============================================================== minimap
    drawMinimap(g, c) {
      const f = g.floor; if (!f) return;
      const vis = f.rooms.filter(r => r.visited || r.discovered || g.player.relics.thirdeye);
      if (!vis.length) return;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const r of vis) { x0 = Math.min(x0, r.gx); x1 = Math.max(x1, r.gx); y0 = Math.min(y0, r.gy); y1 = Math.max(y1, r.gy); }
      const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
      const W = 168, H = 118, cw = Math.min(26, Math.floor((W - 12) / cols)), ch = Math.min(18, Math.floor((H - 12) / rows)), gx = Math.max(3, Math.floor(cw * 0.22)), gy = Math.max(3, Math.floor(ch * 0.25));
      const px = C.W - W - 8, py = C.HUD + 6;
      c.fillStyle = 'rgba(6,6,14,0.72)'; c.fillRect(px, py, W, H); c.strokeStyle = '#4a4a68'; c.lineWidth = 1.5; c.strokeRect(px + 0.5, py + 0.5, W - 1, H - 1);
      const ox = px + (W - cols * cw) / 2, oy = py + (H - rows * ch) / 2;
      const cx = r => ox + (r.gx - x0) * cw + cw / 2, cy = r => oy + (r.gy - y0) * ch + ch / 2;
      const seen = r => r.visited || r.discovered || g.player.relics.thirdeye;
      // edges + locks
      for (const e of f.edges) {
        const a = f.rooms[e.a], b = f.rooms[e.b];
        if (!(a.visited || b.visited || g.player.relics.thirdeye)) continue;
        if (!seen(a) || !seen(b)) continue;
        if (e.hidden && !e.revealed && !g.player.relics.thirdeye) continue;
        c.strokeStyle = e.hidden && !e.revealed ? 'rgba(199,139,255,0.6)' : '#6a6a88'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx(a), cy(a)); c.lineTo(cx(b), cy(b)); c.stroke();
        if (e.lock && !e.lock.opened) {
          const mx = (cx(a) + cx(b)) / 2, my = (cy(a) + cy(b)) / 2, col = ED.keys.LOCKS[e.lock.type].color;
          c.fillStyle = '#0a0a14'; c.beginPath(); c.arc(mx, my, 5.2, 0, TAU); c.fill(); ED.icons.draw(c, 'lock', mx, my, 3.8, col);
        }
      }
      for (const r of vis) {
        const rx = ox + (r.gx - x0) * cw + gx / 2, ry = oy + (r.gy - y0) * ch + gy / 2, rw = cw - gx, rh = ch - gy;
        const tp = g.knownType(r), info = ED.roomTypes[tp];
        let fill = r.visited ? '#54587c' : '#2a2d44';
        if (r.visited && r.cleared) fill = '#3c4a5e';
        if (r.visited && !r.cleared && (r.type === 'normal')) fill = '#6a4a4a';
        c.fillStyle = fill; c.fillRect(rx, ry, rw, rh);
        if (info && info.icon && (r.discovered || r.visited || g.player.relics.thirdeye)) ED.icons.draw(c, info.icon, rx + rw / 2, ry + rh / 2, Math.min(rw, rh) * 0.38, r.visited ? info.color : U.rgba(info.color, 0.75));
        c.strokeStyle = r.visited ? '#8a8ab0' : '#4a4a68'; c.lineWidth = 1; c.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        if (g.hintId === r.id) { c.strokeStyle = 'rgba(255,230,120,' + (0.5 + 0.5 * Math.sin(g.frameAll * 0.12)) + ')'; c.lineWidth = 2; c.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4); }
        if (g.room === r) { c.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(g.frameAll * 0.2)) + ')'; c.lineWidth = 2; c.strokeRect(rx - 1, ry - 1, rw + 2, rh + 2); }
      }
      UI.text(c, 'MAP', px + 5, py + H - 5, 8, '#6a6a88', 'left', false);
    },

    /** hold Tab: large floor map + legend of lock colours and room icons */
    drawBigMap(g, c) {
      const f = g.floor; c.fillStyle = 'rgba(4,4,12,0.9)'; c.fillRect(0, C.HUD, C.W, C.ROOM_H);
      const vis = f.rooms.filter(r => r.visited || r.discovered || g.player.relics.thirdeye);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const r of vis) { x0 = Math.min(x0, r.gx); x1 = Math.max(x1, r.gx); y0 = Math.min(y0, r.gy); y1 = Math.max(y1, r.gy); }
      const cols = x1 - x0 + 1, rows = y1 - y0 + 1, cw = Math.min(88, Math.floor(560 / cols)), ch = Math.min(60, Math.floor(400 / rows));
      const ox = 40 + (560 - cols * cw) / 2, oy = C.HUD + 60 + (400 - rows * ch) / 2;
      UI.shadow(c, 'FLOOR ' + g.floorNum + ' — ' + g.theme.name, 40, C.HUD + 36, 20, '#ffd24a');
      const cx = r => ox + (r.gx - x0) * cw + cw / 2, cy = r => oy + (r.gy - y0) * ch + ch / 2;
      const seen = r => r.visited || r.discovered || g.player.relics.thirdeye;
      for (const e of f.edges) { const a = f.rooms[e.a], b = f.rooms[e.b]; if (!seen(a) || !seen(b) || !(a.visited || b.visited || g.player.relics.thirdeye)) continue; if (e.hidden && !e.revealed && !g.player.relics.thirdeye) continue;
        c.strokeStyle = '#6a6a88'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx(a), cy(a)); c.lineTo(cx(b), cy(b)); c.stroke();
        if (e.lock && !e.lock.opened) { const mx = (cx(a) + cx(b)) / 2, my = (cy(a) + cy(b)) / 2, col = ED.keys.LOCKS[e.lock.type].color; c.fillStyle = '#0a0a14'; c.beginPath(); c.arc(mx, my, 13, 0, TAU); c.fill(); c.strokeStyle = col; c.lineWidth = 2; c.stroke(); ED.icons.draw(c, 'lock', mx, my, 9, col); } }
      for (const r of vis) {
        const rx = cx(r) - cw * 0.36, ry = cy(r) - ch * 0.36, rw = cw * 0.72, rh = ch * 0.72, tp = g.knownType(r), info = ED.roomTypes[tp];
        c.fillStyle = r.visited ? (r.cleared ? '#3c4a5e' : '#54587c') : '#2a2d44'; c.fillRect(rx, ry, rw, rh);
        if (info && info.icon) ED.icons.draw(c, info.icon, cx(r), cy(r), Math.min(rw, rh) * 0.3, info.color);
        c.strokeStyle = g.room === r ? '#fff' : '#6a6a90'; c.lineWidth = g.room === r ? 3 : 1.5; c.strokeRect(rx, ry, rw, rh);
        if (g.hintId === r.id) { c.strokeStyle = 'rgba(255,230,120,' + (0.5 + 0.5 * Math.sin(g.frameAll * 0.12)) + ')'; c.lineWidth = 3; c.strokeRect(rx - 4, ry - 4, rw + 8, rh + 8); }
      }
      // legend
      const lx = 640; let ly = C.HUD + 50;
      UI.text(c, 'LOCKS', lx, ly, 13, '#ffd24a'); ly += 8;
      for (const k in ED.keys.LOCKS) { const L = ED.keys.LOCKS[k]; ly += 24; c.fillStyle = '#0a0a14'; c.beginPath(); c.arc(lx + 10, ly - 4, 10, 0, TAU); c.fill(); ED.icons.draw(c, 'lock', lx + 10, ly - 4, 7, L.color); UI.text(c, L.name, lx + 28, ly, 12, L.color); }
      ly += 28; UI.text(c, 'ROOMS', lx, ly, 13, '#ffd24a'); ly += 6;
      const types = ['treasure', 'shop', 'fountain', 'blacksmith', 'shrine', 'mystery', 'devil', 'challenge', 'gambling', 'trap', 'cursed', 'haunted', 'miniboss', 'boss'];
      types.forEach((t, i) => { const info = ED.roomTypes[t], xx = lx + (i % 2) * 150, yy = ly + 20 + Math.floor(i / 2) * 22; ED.icons.draw(c, info.icon, xx + 8, yy - 4, 6, info.color); UI.text(c, info.name.replace(' Room', ''), xx + 22, yy, 10, '#c8c8e0', 'left', false); });
      UI.text(c, 'Hold TAB — gold glow = where the key you need is probably hidden', 40, C.H - 14, 11, '#8a8aa8', 'left', false);
    },
    // ============================================================== relics + tooltips
    drawRelicBar(g, c) {
      const p = g.player, ids = Object.keys(p.relics); if (!ids.length) return;
      const m = ED.input.mouse; let x = 10, y = C.H - 30; const s = 22; UI.tip = null;
      for (const id of ids) {
        const r = ED.items.relic(id), n = p.relics[id];
        c.fillStyle = 'rgba(8,8,16,0.8)'; c.fillRect(x, y, s, s); c.strokeStyle = ED.items.RARITY[r.rarity].color; c.lineWidth = 1.5; c.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
        ED.render.itemGlyph(c, { cat: 'relic', id }, x + s / 2, y + s / 2, 7, 0);
        if (n > 1) UI.text(c, 'x' + n, x + s - 1, y + s + 0, 9, '#fff', 'right');
        if (r.tag === 'risk') { c.fillStyle = '#ff4a5a'; c.fillRect(x + 1, y + 1, 4, 4); }
        if (m.x >= x && m.x <= x + s && m.y >= y && m.y <= y + s) UI.tip = { x: x + s / 2, y, item: { cat: 'relic', id } };
        x += s + 4; if (x > 560) { x = 10; y -= s + 4; }
      }
      for (const s2 of ED.items.SYNERGIES) if (p.syn[s2.id]) { UI.text(c, '◆ ' + s2.name, 10, y - 6, 10, '#ffd24a'); y -= 12; }
      if (UI.tip) UI.drawItemTip(g, c, UI.tip.item, UI.tip.x, UI.tip.y, true);
    },
    drawItemTip(g, c, item, x, y, above) {
      const p = g.player;
      const cmp = item.cat === 'weapon' ? p.weapon : item.cat === 'armor' ? p.armor[item.slot] : item.cat === 'active' ? null : null;
      const lines = ED.items.describe(item, cmp, p);
      const name = ED.items.itemName(item);
      UI.drawLinesPanel(c, name, ED.items.itemColor(item), lines, x, y, above);
    },
    drawLinesPanel(c, title, tcol, lines, x, y, above, extra) {
      const w = 276, pad = 10;
      let h = 30 + pad;
      const heights = lines.map(l => UI.wrapHeight(c, l.t, w - pad * 2, 14, 12));
      for (const hh of heights) h += hh + 2;
      if (extra) h += extra.length * 15 + 4;
      let px = U.clamp(x - w / 2, 6, C.W - w - 6), py = above ? y - h - 8 : y + 8;
      py = U.clamp(py, C.HUD + 4, C.H - h - 4);
      UI.panel(c, px, py, w, h, tcol, 0.94);
      UI.text(c, title, px + pad, py + 21, 14, tcol);
      let yy = py + 40;
      lines.forEach((l, i) => { yy = UI.wrap(c, l.t, px + pad, yy, w - pad * 2, 14, 12, l.c) + 2; });
      if (extra) for (const e of extra) { UI.text(c, e.t, px + pad, yy + 8, 12, e.c); yy += 15; }
    },
    drawInterPanel(g, c) {
      const it = g.nearInter; if (!it || g.modal) return;
      const p = g.player, X = it.x, Y = it.y + C.HUD;
      let prompt = null;
      if (it.type === 'pedestal') {
        const cmp = it.item.cat === 'weapon' ? p.weapon : it.item.cat === 'armor' ? p.armor[it.item.slot] : null;
        const lines = ED.items.describe(it.item, cmp, p);
        const extra = [];
        if (it.price) {
          if (it.price.gold !== undefined) extra.push({ t: 'PRICE: ' + it.price.gold + ' gold' + (p.gold >= it.price.gold ? '' : '  (need ' + (it.price.gold - p.gold) + ' more)'), c: p.gold >= it.price.gold ? '#ffd24a' : '#ff6a6a' });
          if (it.price.maxHp !== undefined) extra.push({ t: 'COST: ' + it.price.maxHp / 4 + ' max heart container' + (it.price.maxHp > 4 ? 's' : '') + '!', c: '#ff4a5a' });
        }
        if (it.group) extra.push({ t: 'Choose ONE — the others will be sealed.', c: '#9ad0ff' });
        UI.drawLinesPanel(c, ED.items.itemName(it.item), ED.items.itemColor(it.item), lines, X, Y - 34, true, extra);
        prompt = it.devil ? '[E] Make the deal' : it.price ? '[E] Buy' : (it.loot ? '[E] Swap / take' : '[E] Take');
      } else if (it.type === 'shrine') {
        const lines = [{ t: it.costText(), c: '#ffd24a' }];
        for (const k in it.odds) lines.push({ t: it.odds[k] + '%  ' + k, c: k === 'Curse' ? '#ff6a8a' : k === 'Relic' ? '#ffd24a' : k === 'Blessing' ? '#6ee07a' : '#9a9ab8' });
        if (it.used) lines.length = 0, lines.push({ t: 'The altar is spent.', c: '#9a9ab8' });
        UI.drawLinesPanel(c, it.name, it.color, lines, X, Y - 34, true); prompt = it.used ? null : '[E] Make the offering';
      } else if (it.type === 'dice') {
        const lines = [{ t: 'Pay ' + it.price() + ' gold. Odds:', c: '#ffd24a' }];
        for (const o of it.odds) lines.push({ t: o.w + '%  ' + o.n + (o.m ? ' (x' + o.m + ')' : ''), c: o.c });
        UI.drawLinesPanel(c, 'Gambling Table', '#f0f0f0', lines, X, Y - 34, true); prompt = '[E] Roll';
      } else if (it.type === 'service' || it.type === 'anvil') {
        const price = typeof it.price === 'function' ? it.price() : 0;
        const lines = [{ t: typeof it.desc === 'function' ? it.desc() : it.desc, c: '#cfd0e0' }];
        if (!it.sell) lines.push({ t: price === 0 ? 'FREE' : 'PRICE: ' + price + ' gold', c: p.gold >= price ? '#ffd24a' : '#ff6a6a' });
        UI.drawLinesPanel(c, it.name, it.color || '#fff', lines, X, Y - 34, true); prompt = it.prompt ? it.prompt(g, it) : '[E] ' + (it.sell ? 'Sell' : 'Buy');
        if (prompt && prompt.indexOf('[E]') !== 0) prompt = '[E] ' + prompt;
      } else if (it.prompt) { const s = it.prompt(g, it); if (s) prompt = '[E] ' + s; }
      if (prompt) { prompt = ED.input.relabel(prompt); c.font = 'bold 13px ' + FONT; const w = c.measureText(prompt).width + 16; c.fillStyle = 'rgba(0,0,0,0.75)'; c.fillRect(X - w / 2, Y + 24, w, 20); c.strokeStyle = '#ffd24a'; c.lineWidth = 1.5; c.strokeRect(X - w / 2, Y + 24, w, 20); UI.text(c, prompt, X, Y + 39, 13, '#ffd24a', 'center'); }
    },

    // ============================================================== boss bars + cards + popups + toasts
    drawBossBars(g, c) {
      const bs = g.enemies.filter(e => e.boss && !e.dead && e.intro <= 0);
      if (!bs.length) return;
      let y = C.H - 62;
      bs.slice().reverse().forEach(e => {
        const w = bs.length > 1 ? 420 : 560, x = (C.W - w) / 2;
        let f = U.clamp(e.hp / e.maxHp, 0, 1);
        if (e.bdef.shielded && e.parts) { const core = e.parts.find(q => q.kind === 'core'); if (core) f = U.clamp(core.hp / core.maxHp, 0, 1); }
        c.fillStyle = 'rgba(0,0,0,0.78)'; c.fillRect(x - 6, y - 22, w + 12, 40);
        const col = e.enraged ? '#ff3b3b' : e.color;
        UI.text(c, e.bossName.length > 56 ? e.bossName.slice(0, 54) + '…' : e.bossName, C.W / 2, y - 7, 13, col, 'center');
        c.fillStyle = '#1a1020'; c.fillRect(x, y, w, 12);
        const ph = e.phases ? e.phases.length : 1;
        c.fillStyle = col; c.fillRect(x, y, w * f, 12);
        c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x, y, w * f, 4);
        if (e.parts && !e.bdef.shielded) { // segment markers for each part
          let acc = 0; for (const p of e.parts) { acc += p.maxHp; const mx = x + w * (acc / e.maxHp); c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(mx - 1, y, 2, 12); }
        } else if (e.phases && !e.bdef.phaseOf) { for (const p of e.phases) { if (p.at < 1) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x + w * p.at - 1, y - 1, 2, 14); } } }
        c.strokeStyle = '#6a6a88'; c.lineWidth = 1.5; c.strokeRect(x + 0.5, y + 0.5, w - 1, 11);
        const phName = e.phases && e.phaseIdx >= 0 ? e.phases[Math.min(e.phaseIdx, e.phases.length - 1)].name : '';
        UI.text(c, 'PHASE ' + (e.phaseIdx + 1) + '/' + ph + ' — ' + phName, x, y + 28 - 2, 10, '#b0b0c8', 'left', false);
        if (e.bmods && e.bmods.length) UI.text(c, e.bmods.map(m => m.name).join(' · '), x + w, y + 26, 10, '#ffb04a', 'right', false);
        const enr = g.dif.enrageFrames;
        if (enr && !e.enraged && !e.partner) { const left = U.clamp(1 - e.fightT / enr, 0, 1); c.fillStyle = '#ff6a3a'; c.fillRect(x, y + 14, w * left, 2); }
        if (e.exposed > 0) UI.text(c, 'EXPOSED!', C.W / 2, y + 12, 11, '#ffffff', 'center');
        y -= 54;
      });
    },
    drawBossCard(g, c) {
      const b = g.bossCard; if (!b) return;
      const k = b.t / b.dur, a = k < 0.12 ? k / 0.12 : k > 0.82 ? (1 - k) / 0.18 : 1;
      if (a <= 0) return;
      c.save(); c.globalAlpha = U.clamp(a, 0, 1);
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 150, C.W, b.mega ? 200 : 150);
      c.fillStyle = b.color; c.fillRect(0, 150, C.W, 3); c.fillRect(0, 150 + (b.mega ? 200 : 150) - 3, C.W, 3);
      const sc = 1 + (1 - Math.min(1, k * 4)) * 0.25;
      c.translate(C.W / 2, 210); c.scale(sc, sc);
      if (b.mega) UI.shadow(c, '— MEGA BOSS —', 0, -12, 14, '#ff9a6a', 'center');
      else if (b.mini) UI.shadow(c, '— MINI BOSS —', 0, -12, 13, '#ffb090', 'center');
      else UI.shadow(c, '— FLOOR BOSS —', 0, -12, 13, '#cfd8ff', 'center');
      const nm = b.name.length > 34 ? b.name.slice(0, 34) : b.name;
      UI.shadow(c, nm, 0, 30, b.mega ? 40 : 32, b.color, 'center');
      c.restore(); c.save(); c.globalAlpha = U.clamp(a, 0, 1);
      if (b.title) UI.text(c, b.title, C.W / 2, 262, 17, '#e0e0f0', 'center', false);
      if (b.mods && b.mods.length) UI.text(c, 'Modifiers: ' + b.mods.join(', '), C.W / 2, 286, 13, '#ffb04a', 'center');
      if (b.teaches) UI.text(c, b.teaches.length > 90 ? b.teaches.slice(0, 90) : b.teaches, C.W / 2, b.mega ? 330 : 312, 12, '#9ad0ff', 'center', false);
      c.restore();
    },
    drawPopups(g, c) {
      g.popups.forEach((pu, i) => {
        const k = pu.t / pu.dur, a = k < 0.08 ? k / 0.08 : k > 0.88 ? (1 - k) / 0.12 : 1, w = 380, h = 54 + pu.lines.length * 20;
        const x = (C.W - w) / 2, y = 110 + i * (h + 10);
        c.save(); c.globalAlpha = U.clamp(a, 0, 1);
        UI.panel(c, x, y, w, h, '#ffd24a', 0.95);
        c.fillStyle = 'rgba(255,210,74,' + (0.08 + 0.06 * Math.sin(g.frameAll * 0.2)) + ')'; c.fillRect(x, y, w, h);
        UI.shadow(c, '★ ' + pu.title + ' ★', C.W / 2, y + 30, 22, '#ffd24a', 'center');
        pu.lines.forEach((l, j) => UI.text(c, l, C.W / 2, y + 54 + j * 20, 14, '#fff', 'center'));
        c.restore();
      });
    },
    drawToasts(g, c) {
      let y = C.HUD + 24;
      for (const t of g.toasts.slice(-4)) {
        const a = t.t < 10 ? t.t / 10 : t.t > t.dur - 25 ? (t.dur - t.t) / 25 : 1;
        c.font = 'bold 14px ' + FONT; const w = Math.min(C.W - 40, c.measureText(t.msg).width + 24);
        c.save(); c.globalAlpha = U.clamp(a, 0, 1);
        c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect((C.W - w) / 2, y - 15, w, 22); c.fillStyle = t.color; c.fillRect((C.W - w) / 2, y - 15, 3, 22);
        UI.text(c, t.msg, C.W / 2, y, 14, t.color, 'center'); c.restore();
        y += 26;
      }
    },

    // ============================================================== floor intro
    drawFloorIntro(g, c) {
      const t = g.introT, a = U.clamp(t < 20 ? t / 20 : t > 128 ? (150 - t) / 22 : 1, 0, 1);
      c.fillStyle = 'rgba(4,4,10,' + (0.88 * a) + ')'; c.fillRect(0, 0, C.W, C.H);
      c.save(); c.globalAlpha = a;
      const d = g.dif, th = g.theme;
      UI.shadow(c, 'FLOOR ' + g.floorNum, C.W / 2, 150, 54, g.floor.isMega ? '#ff9a6a' : '#ffffff', 'center');
      UI.text(c, th.name, C.W / 2, 184, 20, th.accent, 'center');
      if (g.floor.isMega) UI.shadow(c, '☠ MEGA BOSS FLOOR ☠', C.W / 2, 220, 20, '#ff6a4a', 'center');
      // danger meter
      const bx = C.W / 2 - 220, by = 250;
      UI.text(c, 'DANGER LEVEL', C.W / 2, by - 8, 13, '#9a9ab8', 'center');
      c.fillStyle = '#1a1a28'; c.fillRect(bx, by, 440, 18); c.fillStyle = d.dangerColor; c.fillRect(bx, by, 440 * U.clamp(d.danger / 60, 0.04, 1), 18);
      c.strokeStyle = '#6a6a88'; c.lineWidth = 2; c.strokeRect(bx + 1, by + 1, 438, 16);
      UI.shadow(c, d.danger + ' — ' + d.dangerName.toUpperCase(), C.W / 2, by + 48, 26, d.dangerColor, 'center');
      D.describe(g.floorNum).lines.forEach((l, i) => UI.text(c, l, C.W / 2, by + 78 + i * 20, 14, '#c8c8e0', 'center', false));
      // what's new
      const news = [];
      for (const k in D.ENEMY_INTRO) if (D.ENEMY_INTRO[k] === g.floorNum) news.push('New foe: ' + ED.enemyTypes[k].name);
      for (const k in D.MOD_INTRO) if (D.MOD_INTRO[k] === g.floorNum) news.push('New elite trait: ' + ED.mods[k].name);
      const pt = D.PATTERN_TIERS.find(p => p.floor === g.floorNum && p.floor > 1); if (pt) news.push('Enemy fire patterns grow more complex!');
      if (d.enrageFrames && g.floorNum === 10) news.push('Bosses now ENRAGE if the fight drags on.');
      news.forEach((l, i) => UI.text(c, '▲ ' + l, C.W / 2, by + 150 + i * 20, 14, '#ffd24a', 'center'));
      UI.text(c, 'Seed ' + g.run.seed + '   ·   ' + ED.items.CLASSES[g.run.classId].name, C.W / 2, C.H - 40, 12, '#6a6a88', 'center', false);
      if (t > 38) UI.text(c, 'press any key', C.W / 2, C.H - 18, 12, 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(t * 0.15)) + ')', 'center', false);
      ED.runHooks('intro', g, c);
      c.restore();
    },

    // ============================================================== in-run overlays
    drawOverlay(g, c) {
      UI.beginFrame();
      if (g.modal) return UI.drawModal(g, c);
      if (g.scene === 'paused') return ED.menus.drawPause(g, c);
      if (g.scene === 'dead' || g.scene === 'victory') return ED.menus.drawEnd(g, c);
      UI.prevBtns = []; UI.btns = [];
    },
    drawModal(g, c) {
      const m = g.modal;
      c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(0, 0, C.W, C.H);
      if (m.type === 'sacrifice') {
        const lock = m.lock, w = 520, h = 250, x = (C.W - w) / 2, y = 160;
        UI.panel(c, x, y, w, h, '#c05cff', 0.97);
        UI.shadow(c, 'BLOOD PACT', C.W / 2, y + 40, 28, '#c05cff', 'center');
        UI.text(c, 'The door demands a sacrifice. Choose what you give.', C.W / 2, y + 68, 13, '#cfd0e0', 'center', false);
        const goldOk = g.player.gold >= lock.params.gold;
        UI.button(c, 'gold', 'Pay ' + lock.params.gold + ' gold  (you have ' + g.player.gold + ')', x + 40, y + 90, w - 80, 40, { disabled: !goldOk, color: '#ffd24a' });
        UI.button(c, 'hp', g.player.maxHp > 12 ? 'Sacrifice 1 max heart container' : 'Offer your blood (4 HP, never lethal)', x + 40, y + 140, w - 80, 40, { color: '#ff4a5a' });
        UI.button(c, 'cancel', 'Cancel', x + 40, y + 190, w - 80, 36, {});
      } else if (m.type === 'milestone') {
        const w = 580, h = 300, x = (C.W - w) / 2, y = 150;
        UI.panel(c, x, y, w, h, '#ffd24a', 0.97);
        UI.shadow(c, g.floorNum === 5 ? 'THE COLOSSUS FALLS!' : 'MEGA BOSS SLAIN!', C.W / 2, y + 48, 30, '#ffd24a', 'center');
        UI.text(c, 'You have reached a milestone on floor ' + g.floorNum + '.', C.W / 2, y + 80, 14, '#e0e0f0', 'center', false);
        UI.text(c, 'Beyond lies the Endless: floors without end, each more dangerous than the last.', C.W / 2, y + 102, 12, '#9a9ab8', 'center', false);
        UI.button(c, 'continue', 'Continue into Endless', x + 50, y + 130, w - 100, 50, { color: '#6ee07a', size: 20, sub: 'The run goes on until you fall' });
        UI.button(c, 'cashout', 'Cash Out (end run as a victory)', x + 50, y + 195, w - 100, 50, { color: '#ffd24a', size: 18, sub: 'Bank your victory — score ' + ED.menus.score(g) });
        if (m.type === 'milestone' && g.floorNum !== 5) UI.button(c, 'cancel', 'Not yet', x + 50, y + 255, w - 100, 30, {});
      } else if (ED.modalImpl[m.type]) ED.modalImpl[m.type].draw(g, c, m);
    },
    updateModal(g) {
      const inp = ED.input, m = g.modal;
      ED.menus.navigate(g);
      const act = ED.menus.pollAction(g);
      if (m.type === 'sacrifice') {
        if (act === 'gold') g.paySacrifice('gold'); else if (act === 'hp') g.paySacrifice('hp'); else if (act === 'cancel' || inp.consume('back') || inp.consume('pause')) g.modal = null;
      } else if (m.type === 'milestone') {
        if (act === 'continue' || act === 'cancel') { g.modal = null; g.sfx('uiok'); g.toast('Into the Endless... the stairway awaits.', '#6ee07a', 160); }
        else if (act === 'cashout') g.cashOut();
        else if (inp.consume('back') && g.floorNum !== 5) g.modal = null;
      } else if (ED.modalImpl[m.type]) ED.modalImpl[m.type].update(g, m, act, inp);
    },
  };
  // generic "what type does the player believe this room is" (disguises + hidden)
  const GM = { knownType(room) {
    if (this.player.relics.thirdeye) return room.type;
    if (room.type === 'ambush' && !room.revealedType) return 'treasure';
    return room.type;
  } };
  ED.mixins.push(GM);
})(typeof globalThis !== 'undefined' ? globalThis : this);

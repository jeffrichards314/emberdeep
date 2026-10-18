/* EMBERDEEP — art_ui.js : v23 POLISH, the chrome: one panel style (dark glass, 2px border, corner brackets), buttons with states, a glossy HUD, the boss bar and card, popups, toasts,
 * the menu backdrop, the item and room icons.  Everything goes through ED.ui.panel / ED.ui.button / ED.icons.draw, so every screen of every update gets it for free. */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, R = ED.render, skin = ED.skin;
  const TAU = U.TAU, FONT = '"Courier New", Menlo, Consolas, monospace';
  const { mixc, dark, lite, rgba } = skin.color, glow = skin.glow, bake = skin.bake;
  const ui = skin.ui = skin.ui || {};
  const UI = () => ED.ui;
  const K2 = () => skin.kit;

  // ==================================================================== panel: dark glass, rounded, a hairline edge (art_kit.js has the pieces)
  ui.panel = function (c, x, y, w, h, border, alpha) {
    skin.kit.glass(c, x, y, w, h, { a: alpha === undefined ? 0.88 : Math.max(alpha, 0.55), accent: border, r: h < 44 ? 6 : 10, shadow: w * h > 9000 });
  };

  // ==================================================================== buttons: idle / hover / selected / disabled.   o: {color, size, sub, disabled, primary, ghost, textColor}
  ui.button = function (c, label, x, y, w, h, o, sel, hov, nav) {
    const K = skin.kit, col = o.color || '#ffc65a', dis = !!o.disabled, strong = !dis && !!sel, on = !dis && (sel || hov), r = Math.min(10, h * 0.28), u = UI();
    K.rr(c, x, y, w, h, r);
    if (o.primary && !dis) { const gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, lite(col, 0.2)); gr.addColorStop(1, dark(col, 0.1)); c.fillStyle = gr; }
    else if (dis) c.fillStyle = 'rgba(255,255,255,0.025)';
    else if (strong) { const gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, rgba(mixc('#3a3468', col, 0.26), 0.98)); gr.addColorStop(1, rgba(mixc('#1f1b3d', col, 0.13), 0.98)); c.fillStyle = gr; }
    else if (hov) c.fillStyle = rgba(mixc('#2b2652', col, 0.1), 0.95);
    else c.fillStyle = o.ghost ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.065)';
    c.fill();
    if (strong || (o.primary && !dis)) glow(c, x + w / 2, y + h / 2, Math.max(w, h) * 0.8, col, o.primary ? 0.12 : 0.09);
    if (!dis) { c.fillStyle = o.primary ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'; c.fillRect(x + r, y + 1, w - 2 * r, 1); }
    K.rr(c, x + 0.5, y + 0.5, w - 1, h - 1, r); c.lineWidth = strong ? 2 : 1;
    c.strokeStyle = dis ? 'rgba(255,255,255,0.06)' : strong ? col : on ? rgba(col, 0.7) : o.primary ? lite(col, 0.3) : 'rgba(255,255,255,0.17)'; c.stroke();
    // the label: shrinks a little before it is cut
    let size = o.size || 16; const room = w - 18;
    c.font = 'bold ' + size + 'px ' + K.FONT; while (size > Math.max(12, (o.size || 16) - 4) && c.measureText(label).width > room) { size--; c.font = 'bold ' + size + 'px ' + K.FONT; }
    const text = K.fit(c, label, size, room, true), ty = y + h / 2 + size * 0.35 - (o.sub ? 7 : 0);
    u.text(c, text, x + w / 2, ty, size, dis ? '#62627c' : o.primary ? '#1c1226' : on ? '#ffffff' : (o.textColor || '#e0e0f6'), 'center');
    if (o.sub) u.text(c, K.fit(c, o.sub, 13, room, false), x + w / 2, y + h - 9, 13, dis ? '#555570' : '#a8a8c8', 'center', false);
  };

  // ==================================================================== the HUD bar and the hearts
  const dangerGrad = (c, col) => { const g = c.createLinearGradient(0, 0, C.W, 0); g.addColorStop(0, rgba(col, 0.15)); g.addColorStop(0.5, col); g.addColorStop(1, rgba(col, 0.15)); return g; };
  ui.hudTop = function (g, c, p) {
    const K = skin.kit, COL = K.COL, u = UI(), I = ED.items, st = p.st, t = g.frameAll;
    const gr = c.createLinearGradient(0, 0, 0, C.HUD); gr.addColorStop(0, '#171428'); gr.addColorStop(1, '#0a0914'); c.fillStyle = gr; c.fillRect(0, 0, C.W, C.HUD);
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(0, 0, C.W, 2); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, C.HUD - 5, C.W, 3);
    c.fillStyle = dangerGrad(c, g.dif.dangerColor); c.fillRect(0, C.HUD - 2, C.W, 2);
    // hearts
    const nH = Math.ceil(p.maxHp / 4), perRow = nH > 24 ? 14 : 10, sz = nH > 30 ? 4.2 : nH > 20 ? 5.2 : 6.4, dx = sz * 2.7, low = p.hp <= p.maxHp * 0.25;
    for (let i = 0; i < nH; i++) {
      const row = Math.floor(i / perRow), col = i % perRow, x = 14 + sz + col * dx, y = 12 + sz + row * (sz * 2.5), fill = U.clamp((p.hp - i * 4) / 4, 0, 1);
      R.heart(c, x, y, sz); c.fillStyle = '#1c1020'; c.fill();
      if (fill > 0) { c.save(); c.beginPath(); c.rect(x - sz * 1.6, y - sz * 1.4, sz * 3.2 * fill, sz * 3); c.clip(); const flash = low && Math.floor(t / 14) % 2, gg = c.createLinearGradient(x - sz, y - sz, x + sz, y + sz); gg.addColorStop(0, flash ? '#ffffff' : '#ff7a92'); gg.addColorStop(1, flash ? '#ffd0d8' : '#d41e44'); R.heart(c, x, y, sz); c.fillStyle = gg; c.fill(); c.restore(); }
      R.heart(c, x, y, sz); c.strokeStyle = fill > 0 ? '#2a0612' : '#6a3a4a'; c.lineWidth = 1.3; c.stroke();
      if (fill > 0.5) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(x - sz * 0.5, y - sz * 0.55, sz * 0.3, sz * 0.17, -0.6, 0, TAU); c.fill(); }
    }
    // gold, bombs, keys
    const bx = 270, gp = g.goldPulse > 0, gc = gp ? '#fff6a0' : '#ffd24a';
    ED.icons.draw(c, 'coin', bx + 9, 22, 8, gc); u.text(c, String(p.gold), bx + 26, 28, 18, gc, 'left');
    ED.icons.draw(c, 'bomb', bx + 100, 22, 8, '#ff9a3c'); u.text(c, String(p.bombs), bx + 116, 28, 18, '#ff9a3c', 'left');
    let kx = bx; for (const k of ['small', 'mb', 'boss']) {
      const kt = ED.keys.KEYTYPES[k], n = p.keys[k] | 0, flash = g.keyFlash && g.keyFlash.type === k;
      K.rr(c, kx, 38, 44, 21, 6); c.fillStyle = n ? rgba(kt.color, 0.22) : 'rgba(255,255,255,0.05)'; c.fill(); K.rr(c, kx + 0.5, 38.5, 43, 20, 6); c.strokeStyle = n ? kt.color : 'rgba(255,255,255,0.14)'; c.lineWidth = flash ? 2.5 : 1; c.stroke();
      (k === 'boss' ? ED.icons.ICONS.bosskey : ED.icons.ICONS.key)(c, kx + 12, 48.5, 6.5, n ? kt.color : '#4a4a5a'); u.text(c, 'x' + n, kx + 40, 54, 13, n ? '#fff' : '#66667a', 'right'); kx += 48;
    }
    // the weapon
    const wx = 424, w = p.weapon; K.rr(c, wx, 6, 190, 52, 8); c.fillStyle = 'rgba(255,255,255,0.05)'; c.fill();
    ED.render.itemGlyph(c, w, wx + 24, 32, 11, t); u.text(c, K.fit(c, I.itemName(w), 15, 138, true), wx + 46, 26, 15, I.itemColor(w), 'left');
    K.text(c, 'DMG ' + p.wdmg.toFixed(1) + '  ·  ' + (60 / p.wcd).toFixed(1) + '/s', wx + 46, 46, 13, COL.mute);
    // the active ability and the dash
    const ax = 628, a = p.active;
    if (a) {
      const s2 = I.activeStats(a.item), def = s2.def;
      c.fillStyle = '#10101c'; c.beginPath(); c.arc(ax + 24, 32, 22, 0, TAU); c.fill();
      if (a.charges < a.max && a.timers.length) { const tot = Math.max(1, s2.cd * 60 * st.activeCd), prog = 1 - (Math.min.apply(null, a.timers) / tot); c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.moveTo(ax + 24, 32); c.arc(ax + 24, 32, 21, -Math.PI / 2, -Math.PI / 2 + TAU * prog); c.closePath(); c.fill(); }
      c.strokeStyle = a.charges > 0 ? def.color : '#4a4a5a'; c.lineWidth = 3; c.beginPath(); c.arc(ax + 24, 32, 21, 0, TAU); c.stroke(); R.itemGlyph(c, a.item, ax + 24, 32, 11, t);
      u.text(c, K.fit(c, def.name, 14, 96, true), ax + 54, 26, 14, a.charges > 0 ? '#ffffff' : '#8a8aa2', 'left');
      if (s2.rooms) K.text(c, 'rooms ' + a.roomProg + '/' + s2.rooms, ax + 54, 42, 13, COL.mute); else for (let i = 0; i < a.max; i++) { K.rr(c, ax + 54 + i * 11, 34, 9, 9, 2); c.fillStyle = i < a.charges ? def.color : 'rgba(255,255,255,0.14)'; c.fill(); }
    }
    const dcd = p.dashCd > 0 ? 1 - p.dashCd / Math.max(1, 40 * st.dashCd) : 1; K.rr(c, ax + 54, 50, 66, 5, 2.5); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fill(); K.rr(c, ax + 54, 50, Math.max(5, 66 * dcd), 5, 2.5); c.fillStyle = dcd >= 1 ? '#7fd8ff' : '#4a6a88'; c.fill();
    // the floor and its danger
    const fx = 792, mega = g.floor && g.floor.isMega;
    u.text(c, 'FLOOR ' + g.floorNum, fx, 25, 19, mega ? '#ff9a6a' : '#ffffff', 'left');
    const pips = Math.min(8, 1 + Math.floor(g.dif.danger / 4)); for (let i = 0; i < pips; i++) ED.icons.draw(c, 'skull', 922 + (i % 4) * 8, 14 + Math.floor(i / 4) * 8, 3.4, g.dif.dangerColor);
    u.text(c, K.fit(c, 'DANGER ' + g.dif.danger + '  ' + g.dif.dangerName, 13, 154, true), fx, 43, 13, g.dif.dangerColor, 'left');
    u.text(c, u.timeStr(g.run.frames), 946, 59, 13, '#8a8aa8', 'right', false);
    return true;
  };
  /** the updates' hud hooks, run with their small texts captured: the ones that belong in the top bar are set there at a readable size, the rest are drawn where they asked */
  ui.hudHooks = function (g, c) {
    const K = skin.kit, COL = K.COL, u = UI(), cap = K.capture('hud', g, c), notes = [], rest = []; let world = null, rule = null;
    for (const t of cap.texts) {
      if (t.size <= 10 && t.y >= 58 && t.y <= 64 && t.x >= 700) { if (t.x >= 800) rule = t; else world = t; }
      else if (t.size <= 10 && t.x === 190 && t.y >= 26 && t.y <= 62) notes.push(t);
      else if (t.size <= 10 && t.x === 14 && t.y === 60) notes.push(t);
      else rest.push(t);
    }
    if (g.run && g.run.assist) notes.push({ s: 'ASSIST: ' + ED.D.ASSIST[g.run.assist].name.toUpperCase(), color: COL.ember });
    notes.slice(0, 6).forEach((t, i) => K.chip(c, 14 + Math.floor(i / 2) * 150, C.HUD + 10 + (i % 2) * 26, K.fit(c, t.s, 13, 136, true), t.color || COL.mute, { size: 13, h: 22 }));
    if (world) u.text(c, K.fit(c, world.s, 13, rule ? 64 : 100, true), 792, 59, 13, world.color, 'left');
    if (rule) u.text(c, K.fit(c, rule.s, 13, 76, true), 792 + (world ? 68 : 0), 59, 13, rule.color || '#ff5a3a', 'left');
    for (const t of rest) { if (t.wrap) u.wrap(c, t.s, t.x, t.y, t.wrap, t.lh, t.size, t.color); else u.text(c, t.s, t.x, t.y, t.size, t.color, t.align, t.bold); }
    for (const b of cap.buttons) u.button(c, b.id, b.label, b.x, b.y, b.w, b.h, b.o);
  };
  ui.minimapFrame = function (c, px, py, W, H) { ui.panel(c, px, py, W, H, '#4a4a70', 0.8); };
  ui.lowHp = function (g, c) {
    const a = 0.18 + 0.1 * Math.sin(g.frameAll * 0.16), v = bake('lowhp', C.ROOM_W, C.ROOM_H, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62); gr.addColorStop(0, 'rgba(255,0,20,0)'); gr.addColorStop(1, 'rgba(255,0,20,0.9)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
    c.globalAlpha = a; c.drawImage(v.cv, 0, C.HUD); c.globalAlpha = 1;
  };

  // ==================================================================== boss bars and the boss card
  ui.bossBars = function (g, c, bs) {
    let y = C.H - 62; const u = UI(), t = g.frameAll;
    bs.slice().reverse().forEach(e => {
      const w = bs.length > 1 ? 420 : 560, x = (C.W - w) / 2; let f = U.clamp(e.hp / e.maxHp, 0, 1);
      if (e.bdef.shielded && e.parts) { const core = e.parts.find(q => q.kind === 'core'); if (core) f = U.clamp(core.hp / core.maxHp, 0, 1); }
      const col = e.enraged ? '#ff4040' : e.color;
      c.fillStyle = 'rgba(6,4,14,0.82)'; c.fillRect(x - 10, y - 24, w + 20, 52); c.strokeStyle = rgba(col, 0.55); c.lineWidth = 1.5; c.strokeRect(x - 9.5, y - 23.5, w + 19, 45);
      u.text(c, e.bossName.length > 56 ? e.bossName.slice(0, 54) + '…' : e.bossName, C.W / 2 + 1, y - 6, 13, 'rgba(0,0,0,0.7)', 'center'); u.text(c, e.bossName.length > 56 ? e.bossName.slice(0, 54) + '…' : e.bossName, C.W / 2, y - 7, 13, lite(col, 0.25), 'center');
      c.fillStyle = '#150e1e'; c.fillRect(x, y, w, 12);
      const gr = c.createLinearGradient(0, y, 0, y + 12); gr.addColorStop(0, lite(col, 0.35)); gr.addColorStop(0.5, col); gr.addColorStop(1, dark(col, 0.35)); c.fillStyle = gr; c.fillRect(x, y, w * f, 12); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(x, y + 1, w * f, 3);
      if (e.enraged) { c.fillStyle = 'rgba(255,80,60,' + (0.25 + 0.2 * Math.sin(t * 0.3)) + ')'; c.fillRect(x, y, w * f, 12); }
      const ph = e.phases ? e.phases.length : 1;
      if (e.parts && !e.bdef.shielded) { let acc = 0; for (const p of e.parts) { acc += p.maxHp; const mx = x + w * (acc / e.maxHp); c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(mx - 1, y, 2, 12); } }
      else if (e.phases && !e.bdef.phaseOf) { for (const p of e.phases) if (p.at < 1) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(x + w * p.at - 1, y - 1, 2, 14); } }
      c.strokeStyle = '#7a7aa0'; c.lineWidth = 1.5; c.strokeRect(x + 0.5, y + 0.5, w - 1, 11);
      c.fillStyle = col; for (const sx of [x - 12, x + w + 12]) { c.beginPath(); c.moveTo(sx, y + 6 - 6); c.lineTo(sx + (sx < x ? 6 : -6), y + 6); c.lineTo(sx, y + 6 + 6); c.lineTo(sx + (sx < x ? -2 : 2), y + 6); c.closePath(); c.fill(); }
      const phName = e.phases && e.phaseIdx >= 0 ? e.phases[Math.min(e.phaseIdx, e.phases.length - 1)].name : '';
      u.text(c, 'PHASE ' + (e.phaseIdx + 1) + '/' + ph + ' — ' + phName, x, y + 29, 13, '#b4b4d0', 'left', false);
      if (e.bmods && e.bmods.length) u.text(c, K2().fit(c, e.bmods.map(m => m.name).join(' · '), 13, w * 0.5, false), x + w, y + 29, 13, '#ffb04a', 'right', false);
      const enr = g.dif.enrageFrames; if (enr && !e.enraged && !e.partner) { const left = U.clamp(1 - e.fightT / enr, 0, 1); c.fillStyle = '#ff7a3a'; c.fillRect(x, y + 14, w * left, 2); }
      if (e.exposed > 0) u.text(c, 'EXPOSED!', C.W / 2, y + 10, 13, '#ffffff', 'center');
      y -= 58;
    });
    return true;
  };
  ui.bossCard = function (g, c, b) {
    const u = UI(), k = b.t / b.dur, a = k < 0.12 ? k / 0.12 : k > 0.82 ? (1 - k) / 0.18 : 1; if (a <= 0) return true;
    const tl = u.tipLines(b.teaches), H = b.mega ? 200 + Math.max(0, tl.length - 1) * 16 : 150;
    c.save(); c.globalAlpha = U.clamp(a, 0, 1);
    // letterbox: two black bands slide in from the top and the bottom of the room
    const lb = 34 * U.clamp(a * 1.4, 0, 1); c.fillStyle = '#000'; c.fillRect(0, C.HUD, C.W, lb); c.fillRect(0, C.H - lb, C.W, lb);
    const gr = c.createLinearGradient(0, 150, 0, 150 + H); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.72)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = gr; c.fillRect(0, 150, C.W, H);
    const bg = c.createLinearGradient(0, 0, C.W, 0); bg.addColorStop(0, rgba(b.color, 0)); bg.addColorStop(0.5, b.color); bg.addColorStop(1, rgba(b.color, 0)); c.fillStyle = bg; c.fillRect(0, 150, C.W, 3); c.fillRect(0, 150 + H - 3, C.W, 3);
    glow(c, C.W / 2, 150 + H / 2, 340, b.color, 0.07);
    const sc = 1 + (1 - Math.min(1, k * 4)) * 0.25; c.translate(C.W / 2, 210); c.scale(sc, sc);
    if (b.mega) u.shadow(c, '— MEGA BOSS —', 0, -12, 14, '#ff9a6a', 'center'); else if (b.mini) u.shadow(c, '— MINI BOSS —', 0, -12, 13, '#ffb090', 'center'); else u.shadow(c, '— FLOOR BOSS —', 0, -12, 13, '#cfd8ff', 'center');
    const nm = b.name.length > 70 ? b.name.slice(0, 70) : b.name, fs0 = b.mega ? 40 : 32, fs = Math.max(16, nm.length > 34 ? Math.floor(fs0 * 34 / nm.length) : fs0);
    u.text(c, nm, 0, 30, fs, rgba(b.color, 0.35), 'center'); c.translate(0, -1); u.shadow(c, nm, 0, 30, fs, lite(b.color, 0.1), 'center');
    c.restore(); c.save(); c.globalAlpha = U.clamp(a, 0, 1);
    if (b.title) u.text(c, b.title, C.W / 2, 262, 17, '#e4e4f4', 'center', false);
    if (b.mods && b.mods.length) u.text(c, 'Modifiers: ' + b.mods.join(', '), C.W / 2, 286, 14, '#ffb04a', 'center');
    tl.forEach((ln, i) => u.text(c, ln, C.W / 2, (b.mega ? 330 : 312) + i * 19, 14, '#9ad0ff', 'center', false));
    c.restore(); return true;
  };
  ui.popups = function (g, c) {
    const u = UI(); let y = 100;
    g.popups.slice(0, 4).forEach((pu) => {                                      // (stacked one below the other; a fifth waits its turn on screen only)
      const k = pu.t / pu.dur, a = k < 0.08 ? k / 0.08 : k > 0.88 ? (1 - k) / 0.12 : 1, w = 400, h = 58 + pu.lines.length * 22, x = (C.W - w) / 2;
      c.save(); c.globalAlpha = U.clamp(a, 0, 1); u.panel(c, x, y, w, h, '#ffd24a', 0.96); glow(c, C.W / 2, y + h / 2, w * 0.6, '#ffd24a', 0.07 + 0.04 * Math.sin(g.frameAll * 0.2));
      u.shadow(c, '★ ' + pu.title + ' ★', C.W / 2, y + 34, 22, '#ffd24a', 'center'); pu.lines.forEach((l, j) => u.text(c, skin.kit.fit(c, l, 15, w - 24, true), C.W / 2, y + 62 + j * 22, 15, '#fff', 'center')); c.restore();
      y += h + 8;
    });
    return true;
  };
  ui.toasts = function (g, c) {
    const u = UI(); let y = C.HUD + 24;
    for (const t of g.toasts.slice(-4)) {
      const a = t.t < 10 ? t.t / 10 : t.t > t.dur - 25 ? (t.dur - t.t) / 25 : 1; c.font = 'bold 14px ' + FONT; const w = Math.min(C.W - 40, c.measureText(t.msg).width + 30), x = (C.W - w) / 2;
      c.save(); c.globalAlpha = U.clamp(a, 0, 1); const gr = c.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, 'rgba(8,6,18,0.9)'); gr.addColorStop(0.5, 'rgba(18,14,36,0.9)'); gr.addColorStop(1, 'rgba(8,6,18,0.9)'); c.fillStyle = gr; c.fillRect(x, y - 15, w, 22);
      c.fillStyle = t.color; c.fillRect(x, y - 15, 3, 22); c.fillRect(x + w - 3, y - 15, 3, 22); c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(x, y - 15, w, 2);
      u.text(c, t.msg, C.W / 2, y, 14, t.color, 'center'); c.restore(); y += 26;
    }
    return true;
  };

  // ==================================================================== the menu backdrop: a dungeon silhouette, a warm glow, and embers that rise on their own (a pure function of time)
  ui.backdrop = function (g, c) {
    const t = UI().t, gr = c.createLinearGradient(0, 0, 0, C.H); gr.addColorStop(0, '#0a0818'); gr.addColorStop(0.6, '#150f24'); gr.addColorStop(1, '#241220'); c.fillStyle = gr; c.fillRect(0, 0, C.W, C.H);
    const hg = c.createRadialGradient(C.W / 2, C.H + 40, 40, C.W / 2, C.H + 40, 520); hg.addColorStop(0, 'rgba(255,120,50,0.16)'); hg.addColorStop(1, 'rgba(255,120,50,0)'); c.fillStyle = hg; c.fillRect(0, 0, C.W, C.H);
    for (let layer = 0; layer < 2; layer++) { c.fillStyle = layer ? '#150e20' : '#0f0a19'; for (let i = 0; i < 10; i++) { const w = 90 + (i * 37 + layer * 21) % 70, h = 110 + (i * 53 + layer * 40) % 160 - layer * 30, x = i * 112 - 30 + layer * 50; c.fillRect(x, C.H - h, w, h); c.fillRect(x + w / 2 - 7, C.H - h - 20, 14, 20); c.beginPath(); c.moveTo(x - 4, C.H - h); c.lineTo(x + w / 2, C.H - h - 36); c.lineTo(x + w + 4, C.H - h); c.fill(); } }
    for (let i = 0; i < 6; i++) { const wx = 80 + i * 150, wy = C.H - 70 - (i % 3) * 40; c.fillStyle = 'rgba(255,170,70,' + (0.35 + 0.2 * Math.sin(t * 0.05 + i * 2)) + ')'; c.fillRect(wx, wy, 5, 8); glow(c, wx + 2, wy + 4, 26, '#ffa040', 0.22); }
    for (let i = 0; i < 70; i++) { const h1 = skin.hash(i, 1, 1), h2 = skin.hash(i, 2, 2), h3 = skin.hash(i, 3, 3), y = (h2 * C.H * 1.2 - t * (0.3 + h1 * 1.1) + C.H * 2) % (C.H + 20), x = h1 * C.W + Math.sin(t * 0.02 + h3 * 9) * 12; c.fillStyle = 'rgba(255,' + (120 + Math.floor(h3 * 90)) + ',60,' + (0.25 + 0.45 * Math.abs(Math.sin(t * 0.05 + h3 * 6))) + ')'; c.fillRect(x, y, 1.4 + h3 * 1.8, 1.4 + h3 * 1.8); }
    return true;
  };

  // ==================================================================== icons
  const IC = {
    coin(c, x, y, s, col) { const gr = c.createLinearGradient(x - s, y - s, x + s, y + s); gr.addColorStop(0, lite(col, 0.5)); gr.addColorStop(1, dark(col, 0.25)); c.fillStyle = gr; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); c.strokeStyle = dark(col, 0.6); c.lineWidth = Math.max(1, s * 0.16); c.stroke(); c.strokeStyle = rgba(dark(col, 0.45), 0.7); c.lineWidth = Math.max(0.8, s * 0.1); c.beginPath(); c.arc(x, y, s * 0.62, 0, TAU); c.stroke(); c.fillStyle = dark(col, 0.5); c.font = 'bold ' + Math.round(s * 1.1) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', x, y + 1); },
    bomb(c, x, y, s, col) { const gr = c.createRadialGradient(x - s * 0.3, y - s * 0.2, s * 0.1, x, y + s * 0.15, s); gr.addColorStop(0, '#6a6a80'); gr.addColorStop(1, '#14141c'); c.fillStyle = gr; c.beginPath(); c.arc(x, y + s * 0.15, s * 0.75, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(x - s * 0.28, y - s * 0.12, s * 0.2, s * 0.12, -0.6, 0, TAU); c.fill(); c.strokeStyle = '#a08a5a'; c.lineWidth = Math.max(1.4, s * 0.22); c.beginPath(); c.moveTo(x + s * 0.3, y - s * 0.5); c.quadraticCurveTo(x + s * 0.6, y - s, x + s * 0.9, y - s * 0.8); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(x + s * 0.9, y - s * 0.8, s * 0.22, 0, TAU); c.fill(); c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(x + s * 0.9, y - s * 0.8, s * 0.1, 0, TAU); c.fill(); },
    key(c, x, y, s, col) { c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = 'rgba(8,5,18,0.85)'; c.lineWidth = Math.max(3, s * 0.55); c.beginPath(); c.arc(x - s * 0.5, y, s * 0.5, 0, TAU); c.moveTo(x, y); c.lineTo(x + s, y); c.moveTo(x + s * 0.6, y); c.lineTo(x + s * 0.6, y + s * 0.5); c.moveTo(x + s, y); c.lineTo(x + s, y + s * 0.5); c.stroke(); c.strokeStyle = col; c.lineWidth = Math.max(1.5, s * 0.3); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = Math.max(0.8, s * 0.1); c.beginPath(); c.arc(x - s * 0.5, y, s * 0.5, Math.PI * 1.1, Math.PI * 1.7); c.stroke(); c.lineJoin = 'miter'; c.lineCap = 'butt'; },
    lock(c, x, y, s, col) { c.strokeStyle = 'rgba(8,5,18,0.85)'; c.lineWidth = Math.max(3, s * 0.5); c.beginPath(); c.arc(x, y - s * 0.1, s * 0.5, Math.PI, 0); c.stroke(); c.strokeStyle = lite(col, 0.2); c.lineWidth = Math.max(1.5, s * 0.28); c.stroke(); const gr = c.createLinearGradient(x - s * 0.7, y, x + s * 0.7, y + s); gr.addColorStop(0, lite(col, 0.35)); gr.addColorStop(1, dark(col, 0.3)); c.fillStyle = gr; c.fillRect(x - s * 0.7, y - s * 0.1, s * 1.4, s * 0.9); c.strokeStyle = 'rgba(8,5,18,0.85)'; c.lineWidth = 1.2; c.strokeRect(x - s * 0.7, y - s * 0.1, s * 1.4, s * 0.9); c.fillStyle = 'rgba(8,5,18,0.8)'; c.beginPath(); c.arc(x, y + s * 0.25, s * 0.14, 0, TAU); c.fill(); c.fillRect(x - s * 0.05, y + s * 0.25, s * 0.1, s * 0.3); },
    skull(c, x, y, s, col) { const gr = c.createRadialGradient(x - s * 0.3, y - s * 0.4, s * 0.1, x, y, s); gr.addColorStop(0, lite(col, 0.4)); gr.addColorStop(1, dark(col, 0.2)); c.fillStyle = gr; c.beginPath(); c.arc(x, y - s * 0.15, s * 0.9, 0, TAU); c.fill(); c.fillRect(x - s * 0.5, y + s * 0.4, s, s * 0.6); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#1a0a14'; c.beginPath(); c.arc(x - s * 0.35, y - s * 0.2, s * 0.25, 0, TAU); c.arc(x + s * 0.35, y - s * 0.2, s * 0.25, 0, TAU); c.fill(); c.fillRect(x - s * 0.18, y + s * 0.48, s * 0.1, s * 0.4); c.fillRect(x + s * 0.08, y + s * 0.48, s * 0.1, s * 0.4); },
    chest(c, x, y, s, col) { const gr = c.createLinearGradient(x - s, y - s * 0.5, x + s, y + s * 0.8); gr.addColorStop(0, lite(col, 0.3)); gr.addColorStop(1, dark(col, 0.3)); c.fillStyle = gr; c.fillRect(x - s, y - s * 0.5, s * 2, s * 1.3); c.fillStyle = dark(col, 0.45); c.fillRect(x - s, y - s * 0.5, s * 2, s * 0.45); c.strokeStyle = 'rgba(8,5,18,0.85)'; c.lineWidth = 1.2; c.strokeRect(x - s, y - s * 0.5, s * 2, s * 1.3); c.fillStyle = '#ffd24a'; c.fillRect(x - s * 0.18, y - s * 0.2, s * 0.36, s * 0.5); },
    stairs(c, x, y, s, col) { for (let i = 0; i < 4; i++) { const gr = c.createLinearGradient(0, y - s + i * s * 0.5, 0, y - s + i * s * 0.5 + s * 0.5); gr.addColorStop(0, lite(col, 0.3)); gr.addColorStop(1, dark(col, 0.2)); c.fillStyle = gr; c.fillRect(x - s + i * s * 0.5, y - s + i * s * 0.5, s * 2 - i * s * 0.5, s * 0.5); } c.strokeStyle = 'rgba(8,5,18,0.7)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) c.strokeRect(x - s + i * s * 0.5, y - s + i * s * 0.5, s * 2 - i * s * 0.5, s * 0.5); },
    drop(c, x, y, s, col) { const gr = c.createLinearGradient(x - s, y - s, x + s, y + s); gr.addColorStop(0, lite(col, 0.5)); gr.addColorStop(1, dark(col, 0.2)); c.fillStyle = gr; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x + s, y + s * 0.2, x, y + s); c.quadraticCurveTo(x - s, y + s * 0.2, x, y - s); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.75)'; c.lineWidth = 1; c.stroke(); },
  };
  IC.bosskey = function (c, x, y, s, col) { IC.skull(c, x - s * 0.55, y, s * 0.7, col); c.fillStyle = col; c.fillRect(x, y - s * 0.15, s * 1.1, s * 0.3); c.fillRect(x + s * 0.6, y, s * 0.28, s * 0.6); c.fillRect(x + s * 1.0, y, s * 0.2, s * 0.45); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1; c.strokeRect(x, y - s * 0.15, s * 1.1, s * 0.3); };
  IC.bigskull = function (c, x, y, s, col) { IC.skull(c, x, y + s * 0.15, s * 1.15, col); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(x - s, y - s * 0.7); c.lineTo(x - s * 0.5, y - s * 1.35); c.lineTo(x, y - s * 0.8); c.lineTo(x + s * 0.5, y - s * 1.35); c.lineTo(x + s, y - s * 0.7); c.closePath(); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1; c.stroke(); };
  IC.mystery = function (c, x, y, s, col) { IC.chest(c, x, y, s, col); c.fillStyle = '#10081a'; c.font = 'bold ' + Math.round(s * 1.4) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', x, y + s * 0.2); };
  skin.icon = function (c, name, x, y, s, col) { const f = IC[name]; if (!f) return false; f(c, x, y, s, col); return true; };
  skin.IC = IC;

  // ==================================================================== item glyphs (pedestals, shop, HUD, pause): gradients and outlines instead of flat fills
  skin.itemGlyph = function (c, it, x, y, s, t) {
    const col = ED.items.itemColor(it);
    if (it.cat === 'weapon') { const wd = ED.items.WEAPONS[it.type], wa = skin.WEAPON_ART[wd.kind]; if (!wa) return false; c.save(); c.translate(x, y); c.rotate(-Math.PI / 4); const k = s / 11; c.scale(k, k); c.translate(-14, 0); if (wd.kind === 'boomerang') c.rotate((t || 0) * 0.05); wa(c, wd.color); c.restore(); return true; }
    if (it.cat === 'armor') {
      const gr = c.createLinearGradient(x - s, y - s, x + s, y + s); gr.addColorStop(0, lite(col, 0.4)); gr.addColorStop(1, dark(col, 0.3)); c.fillStyle = gr; c.beginPath();
      if (it.slot === 'helmet') { c.arc(x, y, s * 0.8, Math.PI, 0); c.lineTo(x + s * 0.8, y + s * 0.5); c.lineTo(x - s * 0.8, y + s * 0.5); } else if (it.slot === 'chest') { c.moveTo(x - s * 0.8, y - s * 0.7); c.lineTo(x + s * 0.8, y - s * 0.7); c.lineTo(x + s * 0.6, y + s * 0.8); c.lineTo(x - s * 0.6, y + s * 0.8); } else { c.moveTo(x - s * 0.6, y - s * 0.7); c.lineTo(x + s * 0.2, y - s * 0.7); c.lineTo(x + s * 0.2, y + s * 0.1); c.lineTo(x + s * 0.8, y + s * 0.4); c.lineTo(x + s * 0.8, y + s * 0.8); c.lineTo(x - s * 0.6, y + s * 0.8); }
      c.closePath(); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.85)'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x - s * 0.5, y - s * 0.55, s * 0.3, s * 0.12); return true;
    }
    if (it.cat === 'active') { const def = ED.items.ACTIVES[it.id], gr = c.createRadialGradient(x - s * 0.3, y - s * 0.3, 1, x, y, s); gr.addColorStop(0, lite(def.color, 0.5)); gr.addColorStop(1, dark(def.color, 0.3)); c.fillStyle = gr; c.beginPath(); c.arc(x, y, s * 0.75, 0, TAU); c.fill(); c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, y, s * 0.95, 0, TAU); c.stroke(); c.fillStyle = 'rgba(0,0,0,0.55)'; c.font = 'bold ' + Math.round(s) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Q', x, y + 1); return true; }
    if (it.cat === 'consumable' && ED.consumableGlyph) return false;
    const r = ED.items.relic(it.id), rc = r ? r.color : col, gr = c.createLinearGradient(x - s, y - s, x + s, y + s); gr.addColorStop(0, lite(rc, 0.45)); gr.addColorStop(1, dark(rc, 0.3));
    c.fillStyle = gr; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.8, y - s * 0.1); c.lineTo(x, y + s); c.lineTo(x - s * 0.8, y - s * 0.1); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.3, y - s * 0.1); c.lineTo(x, y + s * 0.2); c.lineTo(x - s * 0.3, y - s * 0.1); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.moveTo(x, y + s * 0.2); c.lineTo(x + s * 0.3, y - s * 0.1); c.lineTo(x + s * 0.8, y - s * 0.1); c.lineTo(x, y + s); c.closePath(); c.fill();
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.8, y - s * 0.1); c.lineTo(x, y + s); c.lineTo(x - s * 0.8, y - s * 0.1); c.closePath(); c.stroke(); c.strokeStyle = 'rgba(8,5,18,0.7)'; c.lineWidth = 1; c.stroke();
    return true;
  };

  // ==================================================================== the Effects option
  skin.effectsButton = function (c, x, y, w, h) { const s = ED.save.meta.settings, lv = s.effects === undefined ? (skin.reduced ? 1 : 2) : s.effects | 0; UI().button(c, 'opt:effects', 'Effects: ' + ['OFF', 'LOW', 'NORMAL'][U.clamp(lv, 0, 2)] + (skin.auto < lv ? ' (auto ' + ['off', 'low', 'normal'][skin.auto] + ')' : ''), x, y, w, h, { size: 14, color: '#ffb06a' }); };

  // ==================================================================== screen-space effects: a vignette that flares when you are hurt
  skin.screenFx = function (g, c, t) {
    const p = g.player; if (!p || g.scene === 'intro') return; const lv = skin.level(); if (lv < 1) return;
    const k = skin.hurtK(g, p); if (k > 0.02) { const v = bake('hurtvig', C.ROOM_W, C.ROOM_H, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, h * 0.36, w / 2, h / 2, w * 0.62); gr.addColorStop(0, 'rgba(180,0,20,0)'); gr.addColorStop(1, 'rgba(180,0,20,0.95)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }); c.globalAlpha = Math.min(0.75, k * 0.8) * (ED.save.meta.settings.flash === 0 ? 0.3 : 1); c.drawImage(v.cv, 0, C.HUD); c.globalAlpha = 1; }
  };
  const hurt = new WeakMap();
  skin.hurtK = function (g, p) { let o = hurt.get(p); if (!o) { o = { hp: p.hp, k: 0 }; hurt.set(p, o); } if (p.hp < o.hp) o.k = 1; o.hp = p.hp; o.k *= 0.94; return o.k; };
})(typeof globalThis !== 'undefined' ? globalThis : this);

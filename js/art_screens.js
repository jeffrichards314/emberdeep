/* EMBERDEEP — art_screens.js : v23 POLISH, the main menus redone on the kit (art_kit.js): title, hero select, options, pause and the end screens.
 *  Each screen registers the same button ids as its classic twin in menus.js, so keyboard, mouse and touch behave exactly as before; only where things are and how they look changes.
 *  menus.js asks ED.skin.screens[scene] first while the polished look is on and falls back to the classic drawing when there is none. */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, skin = ED.skin, TAU = U.TAU;
  const { mixc, dark, lite, rgba } = skin.color;
  const K = skin.kit, COL = K.COL, SZ = K.SZ;
  const SC = skin.screens = skin.screens || {};
  const UI = () => ED.ui;

  // ==================================================================== TITLE
  const SIDE_LEFT = { hearth: 1, legacy: 1, records: 1, routes: 1 };
  const SIDE_NOTE = { records: 'your last runs' };
  SC.title = function (g, c) {
    const u = UI(), t = u.t, meta = ED.save.meta, P = ED.packs, M = ED.menus; u.navMode = 'spatial';
    // the logo: a glow, then the word in three passes (shadow, ember, light)
    c.save(); c.translate(C.W / 2, 150);
    for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(255,' + (90 + i * 40) + ',40,' + (0.11 - i * 0.03) + ')'; c.beginPath(); c.arc(0, 8, 150 + i * 30 + Math.sin(t * 0.04) * 6, 0, TAU); c.fill(); }
    u.text(c, 'EMBERDEEP', 4, 6, 80, '#3a0f08', 'center'); u.text(c, 'EMBERDEEP', 0, 0, 80, '#ffb04a', 'center'); u.text(c, 'EMBERDEEP', -1, -2, 80, '#ffe0a0', 'center');
    c.restore();
    K.text(c, 'an endless descent', C.W / 2, 204, 20, '#d6b4a4', 'center');
    K.text(c, P.stamp() === 'v1' ? 'v1 · the original edition' : 'edition ' + P.stamp(), C.W / 2, 228, SZ.tiny, '#8d7d9c', 'center');
    // the main column
    const bx = C.W / 2 - 180, bw = 360; let y = 256;
    u.button(c, 'start', 'START RUN', bx, y, bw, 62, { size: 24, color: COL.ember, primary: true }); y += 74;
    u.button(c, 'daily', 'Daily Descent', bx, y, bw, 46, { size: 17 }); K.text(c, ED.dailySeed(), bx + bw - 14, y + 28, SZ.tiny, COL.dim, 'right'); y += 56;
    u.button(c, 'collection', 'Collection & Unlocks', bx, y, bw, 46, { size: 17 }); y += 56;
    u.button(c, 'help', 'Controls & Guide', bx, y, bw, 46, { size: 17 }); y += 56;
    u.button(c, 'options', 'Options', bx, y, bw, 46, { size: 17 });
    // the updates' own entries (hearth, hunt, legacy ...) land in two quiet columns on either side
    const cap = K.capture('titleUI', g, c), items = cap.buttons.map(b => { const p = K.splitLabel(b.label); return { id: b.id, name: K.nice(p[0]), note: p[1] || SIDE_NOTE[b.id] || '', color: b.o.color || COL.cyan }; });
    items.push({ id: 'versions', name: 'Versions', note: P.stamp(), color: COL.cyan });
    const left = items.filter(i => SIDE_LEFT[i.id]), right = items.filter(i => !SIDE_LEFT[i.id]), IH = 54, GAP = 10;
    const col = (list, x) => list.forEach((it, i) => { const yy = 256 + i * (IH + GAP); u.button(c, it.id, '', x, yy, 212, IH, { color: it.color, ghost: true }); u.text(c, it.name, x + 16, yy + 23, 16, '#eeeefc', 'left'); if (it.note) u.text(c, K.fit(c, it.note, SZ.tiny, 180, false), x + 16, yy + 43, SZ.tiny, lite(it.color, 0.25), 'left', false); });
    col(left, 44); col(right, C.W - 44 - 212);
    // the numbers, then the hints
    const unl = Object.keys(meta.unlocked.items).length + Object.keys(meta.unlocked.classes).length - 1, bf = (meta.bestByPacks && meta.bestByPacks[P.key()]) || 0;
    const segs = cap.texts.slice(0, 1).map(tx => [K.fit(c, tx.s, SZ.small, 200, true), tx.color || COL.violet, true]);
    segs.push(['Deepest floor ' + meta.bestFloor + (bf !== meta.bestFloor ? ' (this edition ' + bf + ')' : ''), meta.bestFloor ? '#ffd98a' : COL.mute, true], [meta.totalRuns + (meta.totalRuns === 1 ? ' run' : ' runs'), COL.mute, false], [meta.victories + (meta.victories === 1 ? ' win' : ' wins'), COL.mute, false], [unl + ' unlocks', COL.mute, false]);
    K.segs(c, C.W / 2, 606, segs, SZ.small);
    if (meta.bestRun) K.text(c, K.fit(c, 'Best run: floor ' + meta.bestRun.floor + ' as ' + (ED.items.CLASSES[meta.bestRun.cls] || { name: '?' }).name + ' (seed ' + meta.bestRun.seed + ')', SZ.tiny, 560, false), C.W / 2, 627, SZ.tiny, COL.dim, 'center');
  };

  // ==================================================================== HERO SELECT
  const lockedCol = '#7a7a92';
  SC.select = function (g, c) {
    const u = UI(), M = ED.menus, meta = ED.save.meta, I = ED.items, hearts = ED.render.heart; u.navMode = 'spatial';
    K.head(c, 'CHOOSE YOUR HERO', { y: 50, rule: 260 });
    const ids = I.classList().map(x => x.id), perRow = Math.ceil(ids.length / 2), cw = 128, ch = 92, gap = 12;
    ids.forEach((id, i) => {
      const cls = I.CLASSES[id], row = i < perRow ? 0 : 1, col = row ? i - perRow : i, inRow = row ? ids.length - perRow : perRow;
      const x = (C.W - (inRow * cw + (inRow - 1) * gap)) / 2 + col * (cw + gap), y = 84 + row * (ch + gap), un = ED.save.isClassUnlocked(id), sel = u.selClass === id;
      u.button(c, 'cls:' + id, '', x, y, cw, ch, { selected: sel, color: cls.color });
      c.save(); if (!un) c.globalAlpha = 0.5;
      c.fillStyle = un ? cls.color : '#555566'; c.beginPath(); c.arc(x + cw / 2 - 6, y + 34, 19, 0, TAU); c.fill(); c.strokeStyle = '#10101c'; c.lineWidth = 3; c.stroke();
      ED.render.itemGlyph(c, { cat: 'weapon', type: cls.weapon, rarity: 'common' }, x + cw / 2 + 20, y + 44, 10, u.t);
      c.restore(); if (!un) ED.icons.draw(c, 'lock', x + cw / 2 - 6, y + 34, 10, '#e4e4f0');
      u.text(c, K.fit(c, cls.name, 16, cw - 12, true), x + cw / 2, y + ch - 14, 16, un ? '#ffffff' : lockedCol, 'center');
    });
    // the chosen hero
    const sc = I.CLASSES[u.selClass], un = ED.save.isClassUnlocked(u.selClass), px = 66, py = 294, pw = 828, ph = 148;
    K.glass(c, px, py, pw, ph, { accent: sc.color, a: 0.82 });
    c.save(); if (!un) c.globalAlpha = 0.5; c.fillStyle = un ? sc.color : '#555566'; c.beginPath(); c.arc(px + 60, py + 62, 34, 0, TAU); c.fill(); c.strokeStyle = '#10101c'; c.lineWidth = 4; c.stroke();
    ED.render.itemGlyph(c, { cat: 'weapon', type: sc.weapon, rarity: 'common' }, px + 92, py + 90, 17, u.t); c.restore(); if (!un) ED.icons.draw(c, 'lock', px + 60, py + 62, 18, '#e4e4f0');
    u.shadow(c, sc.name, px + 118, py + 46, 28, un ? lite(sc.color, 0.3) : lockedCol, 'left');
    K.text(c, I.WEAPONS[sc.weapon].name, px + 118, py + 70, SZ.small, COL.mute);
    for (let k = 0; k < sc.hearts; k++) { hearts(c, px + 124 + k * 18, py + 92, 5.2); c.fillStyle = un ? '#ff4a6a' : '#5a5a6a'; c.fill(); }
    K.chip(c, px + 118, py + 108, I.ACTIVES[sc.active].name, I.ACTIVES[sc.active].color);
    const dx = px + 330, dw = pw - 330 - 28, text = sc.desc + '  ' + I.WEAPONS[sc.weapon].desc + (sc.passive ? '  Passive — ' + I.relic(sc.passive).name + ': ' + I.relic(sc.passive).desc : '');
    let top = py + 34; if (!un) { K.chip(c, px + pw - 28, py + 14, K.fit(c, 'LOCKED  ·  ' + M.unlockText(sc.unlock), 13, dw - 18, true), '#ff9a6a', { align: 'right' }); top = py + 56; }
    let fs = 15, lh = 20; if (K.lines(c, text, dw, fs) * lh > py + ph - 12 - top) { fs = 14; lh = 18; } if (K.lines(c, text, dw, fs) * lh > py + ph - 12 - top) { fs = 13; lh = 16; }
    K.wrap(c, text, dx, top + 4, dw, lh, fs, un ? COL.text : '#9a9ab0');
    // the updates' selectUI hooks: pacts, mode, and the lines of news
    const cap = K.capture('selectUI', g, c), btn = id => cap.buttons.find(b => b.id === id);
    const news = cap.texts.filter(t => t.s.trim()).sort((p, q) => (/mastery/.test(q.s) ? 1 : 0) - (/mastery/.test(p.s) ? 1 : 0));
    // the seed
    const sy = 456, best = meta.bestBySeed[ED.normalizeSeed(u.seedText || 'x')];
    u.text(c, 'SEED', 66, sy + 27, SZ.tiny, COL.mute, 'left', true);
    u.button(c, 'seed', u.seedEdit ? u.seedText + (Math.floor(u.t / 20) % 2 ? '_' : ' ') : (u.seedText || '(random)'), 126, sy, 230, 42, { size: 20, color: COL.cyan, selected: u.seedEdit });
    u.button(c, 'rand', 'Random', 368, sy, 104, 42, { size: 15 }); u.button(c, 'daily', 'Daily', 482, sy, 88, 42, { size: 15 });
    if (u.seedEdit) K.text(c, 'type letters and numbers · Enter', 894, sy + 27, SZ.tiny, COL.mute, 'right');
    else if (best) u.text(c, 'best on this seed: floor ' + best, 894, sy + 27, SZ.small, COL.gold, 'right');
    // begin
    const ay = 516, heat = btn('heat'), mode = btn('mode');
    u.button(c, 'go', 'BEGIN DESCENT', C.W / 2 - 160, ay - 4, 320, 64, { size: 24, color: COL.ember, primary: true });
    if (heat) u.button(c, 'heat', K.nice(heat.label).replace('Pacts Of Heat', 'Pacts of Heat').replace('Daily Pacts', 'Daily pacts'), 66, ay, 232, 56, { size: 15, color: heat.o.color || COL.ember, disabled: !!heat.o.disabled });
    if (mode) u.button(c, 'mode', K.nice(mode.label).replace(' Descent', ''), C.W - 66 - 232, ay, 232, 56, { size: 15, color: mode.o.color || COL.cyan });
    // news: the echo of your last death, who hunts you ...
    news.slice(0, 2).forEach((t, i) => u.text(c, K.fit(c, t.s, SZ.tiny, 860, false), C.W / 2, 598 + i * 20, SZ.tiny, /mastery/.test(t.s) ? COL.violet : t.color || COL.mute, 'center', false));
    K.back(c, 'back', 'Back');
  };

  // ==================================================================== OPTIONS
  SC.settings = function (g, c) {
    const u = UI(), s = ED.save.meta.settings, M = ED.menus, x = 180, w = 600; u.navMode = 'vert';
    K.head(c, 'OPTIONS', { y: 50, rule: 240 });
    const slider = (id, label, v, max, y) => {
      u.button(c, 'opt:' + id, '', x, y, w, 42, { size: 16 }); u.text(c, label, x + 18, y + 27, 17, '#e6e6f8', 'left', false);
      const bx = x + 300, bw = 210, f = U.clamp(v / max, 0, 1); K.rr(c, bx, y + 17, bw, 8, 4); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fill();
      if (f > 0) { K.rr(c, bx, y + 17, Math.max(8, bw * f), 8, 4); const gr = c.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#ff9a3a'); gr.addColorStop(1, '#ffd070'); c.fillStyle = gr; c.fill(); }
      u.text(c, Math.round(v * 100) + '%', x + w - 18, y + 27, 16, '#ffffff', 'right');
    };
    K.label(c, 'SOUND', x, 106, w); slider('volume', 'Master volume', s.volume, 1, 118); slider('music', 'Music', s.music, 1, 166);
    K.label(c, 'DISPLAY', x, 236, w); slider('shake', 'Screen shake', s.shake, 1.5, 248); slider('flash', 'Screen flashes', s.flash, 1, 296);
    const hw = (w - 12) / 2;
    if (ED.skin.effectsButton && ED.packs.on('v23')) { u.button(c, 'opt:dmg', 'Damage numbers: ' + (s.damageNumbers ? 'ON' : 'OFF'), x, 344, hw, 42, { size: 15 }); ED.skin.effectsButton(c, x + hw + 12, 344, hw, 42); }
    else u.button(c, 'opt:dmg', 'Damage numbers: ' + (s.damageNumbers ? 'ON' : 'OFF'), x, 344, w, 42, { size: 15 });
    K.label(c, 'GAMEPLAY', x, 416, w); const al = s.assist | 0, AS = ED.D.ASSIST;
    u.button(c, 'opt:assist', 'Assist: ' + (al ? AS[al].name.toUpperCase() : 'OFF'), x, 428, w, 62, { size: 17, color: al ? COL.ember : COL.cyan,
      sub: al ? 'Foes hit ' + Math.round((1 - AS[al].dmg) * 100) + '% softer, warn ' + Math.round((AS[al].tele - 1) * 100) + '% longer' + (AS[al].hp < 1 ? ', 15% less HP' : '') + ' · no personal bests' : 'Gentle and Easy make foes softer and slower, for learning the game' });
    const touch = ED.touch && ED.touch.available(), kl = 'Key bindings' + (ED.input.isDefault() ? '' : ' *');
    if (touch) { u.button(c, 'keys', kl, x, 502, hw, 42, { size: 15 }); u.button(c, 'touchopts', 'Touch controls', x + hw + 12, 502, hw, 42, { size: 15 }); } else u.button(c, 'keys', kl, x, 502, w, 42, { size: 15 });
    K.label(c, 'YOUR SAVE', x, 574, w); const tw = (w - 24) / 3;
    u.button(c, 'export', 'Export', x, 586, tw, 38, { size: 14, color: COL.cyan }); u.button(c, 'import', 'Import', x + tw + 12, 586, tw, 38, { size: 14, color: COL.cyan });
    u.button(c, 'reset', u.confirm === 'reset' ? 'Erase? tap again' : 'Reset all', x + 2 * (tw + 12), 586, tw, 38, { size: 14, color: COL.red });
    K.back(c, 'back', 'Back');
  };

  // ==================================================================== PAUSE
  const statRows = (p) => { const st = p.st; return [['HP', p.hp + ' / ' + p.maxHp], ['Defence', st.def.toFixed(1)], ['Damage', 'x' + st.dmg.toFixed(2)], ['Attack speed', 'x' + st.atkSpd.toFixed(2)], ['Crit', Math.round(st.crit * 100) + '%  (x' + st.critMult.toFixed(1) + ')'], ['Move speed', 'x' + st.speed.toFixed(2)], ['Luck', st.luck.toFixed(1)], ['Thorns', String(st.thorns || 0)]]; };
  SC.paused = function (g, c) {
    const u = UI(), I = ED.items, p = g.player, M = ED.menus, m = ED.input.mouse, practice = g.run && g.run.practice; u.navMode = 'vert';
    c.fillStyle = 'rgba(6,4,14,0.9)'; c.fillRect(0, 0, C.W, C.H);
    K.head(c, 'PAUSED', { y: 54, rule: 220 });
    const lx = 48, lw = 250;
    u.button(c, 'resume', 'Resume', lx, 100, lw, 56, { size: 21, color: COL.ember, primary: true });
    u.button(c, 'options', 'Options', lx, 168, lw, 46, { size: 17 });
    u.button(c, 'abandon', u.confirm === 'abandon' ? 'Tap again to abandon' : 'Abandon run', lx, 224, lw, 46, { size: 16, color: COL.red });
    u.button(c, 'title', practice ? 'Back to the Gallery' : 'Quit to title', lx, 280, lw, 46, { size: 16 });
    K.glass(c, lx, 352, lw, 156, { a: 0.7 });
    u.shadow(c, 'FLOOR ' + g.floorNum, lx + 20, 388, 24, COL.gold, 'left');
    const row = (i, k, v, col) => { K.text(c, k, lx + 20, 418 + i * 24, SZ.small, COL.mute); u.text(c, v, lx + lw - 20, 418 + i * 24, SZ.small, col || COL.ink, 'right', true); };
    row(0, 'time', u.timeStr(g.run.frames)); row(1, 'kills', String(g.run.kills)); row(2, 'seed', g.run.seed, COL.cyan);
    K.text(c, K.fit(c, 'edition ' + (g.run.packs || 'v1'), SZ.tiny, lw - 40, false), lx + 20, 494, SZ.tiny, COL.dim);
    // the right panel: two tabs
    const px = 322, py = 96, pw = 590, ph = 508, route = !!(ED.v28 && ED.v28.overview && ED.route), tab = route && u.ptab === 'route' ? 'route' : 'build';
    K.glass(c, px, py, pw, ph, { a: 0.8 });
    u.button(c, 'ptab:build', 'Build', px + 16, py + 14, 120, 38, { size: 16, selected: tab === 'build', color: COL.ember });
    if (route) u.button(c, 'ptab:route', 'Route', px + 144, py + 14, 120, 38, { size: 16, selected: tab === 'route', color: '#7fd8c0' });
    u.text(c, ED.items.CLASSES[p.classId].name, px + pw - 24, py + 40, 20, COL.ember, 'right');
    if (tab === 'route') { routeTab(g, c, px, py + 66, pw); return; }
    const ct = py + 70;
    K.label(c, 'EQUIPMENT', px + 24, ct + 6, 320);
    [['Weapon', p.weapon], ['Helmet', p.armor.helmet], ['Chest', p.armor.chest], ['Boots', p.armor.boots], ['Active', p.active && p.active.item]].forEach((r, i) => {
      const yy = ct + 38 + i * 32; K.text(c, r[0], px + 24, yy, SZ.small, COL.mute);
      if (r[1]) { ED.render.itemGlyph(c, r[1], px + 122, yy - 5, 9, 0); u.text(c, K.fit(c, I.itemName(r[1]), 16, 190, true), px + 142, yy, 16, I.itemColor(r[1]), 'left'); } else u.text(c, '—', px + 142, yy, 16, COL.dim, 'left', false);
    });
    K.label(c, 'STATS', px + 380, ct + 6, 186);
    statRows(p).forEach((r, i) => { const yy = ct + 38 + i * 24; K.text(c, r[0], px + 380, yy, SZ.small, COL.mute); u.text(c, r[1], px + pw - 24, yy, SZ.small, COL.ink, 'right', true); });
    // relics: the tiles shrink as the haul grows, so the grid never runs into the chips below
    const ids = Object.keys(p.relics).filter(id => !(I.relic(id) || {}).talent), gy = ct + 282, extras = [];
    for (const t of (ED.talents && ED.talents.owned ? ED.talents.owned(p) : [])) extras.push([t.name, COL.cyan]);
    for (const b of p.buffs) extras.push(['+ ' + b.name, COL.green]); for (const b of p.curses) extras.push(['− ' + b.name, '#ff7a9a']);
    K.label(c, 'RELICS' + (ids.length ? '  ' + ids.length : ''), px + 24, gy - 8, pw - 48);
    const availH = (py + ph - (extras.length ? 70 : 24)) - (gy + 4); let step = 40; while (step > 24 && Math.ceil(ids.length / Math.floor((pw - 48) / step)) * step > availH) step -= 4;
    const per = Math.floor((pw - 48) / step), tile = step - 4; let tip = null;
    ids.forEach((id, i) => {
      const rx = px + 24 + (i % per) * step, ry = gy + 4 + Math.floor(i / per) * step, r = I.relic(id), hov = m.x >= rx && m.x <= rx + tile && m.y >= ry && m.y <= ry + tile;
      K.rr(c, rx, ry, tile, tile, 6); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fill(); K.rr(c, rx + 0.5, ry + 0.5, tile - 1, tile - 1, 6); c.strokeStyle = hov ? '#ffffff' : rgba(I.RARITY[r.rarity].color, 0.75); c.lineWidth = hov ? 2 : 1.2; c.stroke();
      ED.render.itemGlyph(c, { cat: 'relic', id }, rx + tile / 2, ry + tile / 2, tile * 0.3, 0); if (p.relics[id] > 1) u.text(c, 'x' + p.relics[id], rx + tile - 2, ry + tile - 3, 11, '#fff', 'right');
      if (hov) tip = { id, rx, ry };
    });
    if (!ids.length) K.text(c, 'None yet — find them in treasure rooms, shops and shrines.', px + 24, gy + 30, SZ.small, COL.dim);
    let ex = px + 24, ey = py + ph - 52; for (const [t, col] of extras) { c.font = 'bold 13px ' + K.FONT; const w = Math.ceil(c.measureText(K.fit(c, t, 13, 200, true)).width) + 18; if (ex + w > px + pw - 24) { ex = px + 24; ey += 28; if (ey > py + ph - 28) break; } ex += K.chip(c, ex, ey, K.fit(c, t, 13, 200, true), col) + 8; }
    if (tip) u.drawItemTip(g, c, { cat: 'relic', id: tip.id }, tip.rx + 17, tip.ry + 40, false);
  };

  /** the ROUTE tab of the pause screen: the lands walked so far, the doors seen, the sigils held (data from update v28) */
  function routeTab(g, c, px, y, pw) {
    const u = UI(), o = ED.v28.overview(g), R = ED.route, tc = '#7fd8c0';
    K.label(c, 'THE WAY SO FAR', px + 24, y + 6, pw - 48, tc);
    let yy = u.wrap(c, o.lands.join('   ›   '), px + 24, y + 34, pw - 48, 24, 17, '#d6f2ea'); K.text(c, 'you are in  ' + o.now, px + 24, yy + 2, SZ.small, COL.mute);
    yy += 40; K.label(c, 'DOORS SEEN', px + 24, yy, pw - 48, tc); yy += 28;
    if (!o.doors.length) { K.text(c, 'none yet', px + 24, yy, SZ.small, COL.dim); yy += 26; }
    for (const d of o.doors.slice(0, 5)) { u.text(c, (d.open ? '◆ ' : '◇ ') + K.fit(c, d.name + ' — ' + d.kind, SZ.body, pw - 80, false), px + 24, yy, SZ.body, d.open ? '#a8e8c0' : '#d8b8b0', 'left', false); yy += 28; }
    yy += 14; K.label(c, 'SIGILS  ' + o.sigils.length, px + 24, yy, pw - 48, tc); yy += 30;
    if (!o.sigils.length) K.text(c, 'none yet', px + 24, yy, SZ.small, COL.dim);
    o.sigils.slice(0, 12).forEach((s, i) => { const cx = px + 40 + (i % 2) * 280, cy = yy + Math.floor(i / 2) * 34; R.glyphSigil(c, s.id, cx, cy - 5, 9, s.color); u.text(c, K.fit(c, s.art ? s.art.name : s.name, SZ.body, 240, true), cx + 20, cy, SZ.body, s.color, 'left'); });
  }

  // ==================================================================== THE END OF A RUN
  SC.ended = function (g, c) {
    const u = UI(), I = ED.items, r = g.run, p = g.player, t = g.deadT, v = g.scene === 'victory', a = U.clamp(t / 40, 0, 1), meta = ED.save.meta, res = g.runResult || {};
    c.fillStyle = 'rgba(' + (v ? '10,12,4' : '14,2,6') + ',' + 0.88 * a + ')'; c.fillRect(0, 0, C.W, C.H);
    c.save(); c.globalAlpha = a;
    skin.glow(c, C.W / 2, 70, 300, v ? '#ffd24a' : '#ff3b4a', 0.14);
    u.shadow(c, v ? 'VICTORY' : 'YOU DIED', C.W / 2, 84, 58, v ? COL.gold : '#ff4a58', 'center');
    K.text(c, K.fit(c, v ? 'You cashed out with your treasures on floor ' + r.floorNum : 'Slain by ' + (r.killedBy || 'the dark') + ' on floor ' + r.floorNum + '  —  ' + g.dif.dangerName + ' danger', 17, 840, false), C.W / 2, 118, 17, '#d4d4ec', 'center');
    if (res.newBest) K.chip(c, C.W / 2, 134, '★  NEW PERSONAL BEST  ★', COL.gold, { align: 'center', solid: true, size: 14, h: 28 });
    else if (r.assist) K.text(c, 'assisted run (' + ED.D.ASSIST[r.assist].name + ') — personal bests are not recorded', C.W / 2, 154, SZ.small, COL.ember, 'center');
    else K.text(c, 'deepest floor so far: ' + meta.bestFloor, C.W / 2, 154, SZ.small, COL.gold, 'center');
    // the numbers
    const cy = 176, ch = 292, lx = 48, lw = 542, rx = 610, rw = 302;
    K.glass(c, lx, cy, lw, ch, { a: 0.82 }); K.label(c, 'THIS RUN', lx + 24, cy + 30, lw - 48);
    const L = [['Deepest floor', r.floorNum], ['Enemies slain', r.kills], ['Rooms cleared', r.roomsCleared], ['Gold collected', r.goldEarned], ['Items collected', r.itemsTaken + Object.keys(p.relics).reduce((s, k) => s + p.relics[k], 0)], ['Damage taken', r.damageTaken], ['Time', u.timeStr(r.frames)], ['Bosses slain', r.bossesKilled.length], ['Mini bosses slain', r.minisKilled.length], ['Locks opened', r.locksOpened || 0]];
    L.forEach((row, i) => { const x = lx + 24 + (i % 2) * 252, y = cy + 64 + Math.floor(i / 2) * 32; K.text(c, row[0], x, y, SZ.small, COL.mute); u.text(c, String(row[1]), x + 226, y, 18, COL.ink, 'right'); });
    K.rule(c, lx + 24, cy + 236, lw - 48); K.text(c, 'SCORE', lx + 24, cy + 270, SZ.small, COL.mute); u.shadow(c, String(ED.menus.score(g)), lx + lw - 24, cy + 272, 34, COL.gold, 'right');
    K.glass(c, rx, cy, rw, ch, { a: 0.82 }); K.label(c, 'THE BUILD', rx + 20, cy + 30, rw - 40);
    u.text(c, K.fit(c, I.CLASSES[r.classId].name, 22, rw - 40, true), rx + 20, cy + 64, 22, COL.ember, 'left'); K.text(c, K.fit(c, I.itemName(p.weapon), SZ.small, rw - 40, false), rx + 20, cy + 88, SZ.small, COL.text);
    const rl = Object.keys(p.relics); rl.slice(0, 32).forEach((id, i) => { const x = rx + 32 + (i % 11) * 24, y = cy + 120 + Math.floor(i / 11) * 26; ED.render.itemGlyph(c, { cat: 'relic', id }, x, y, 8, 0); });
    if (rl.length > 32) K.text(c, '+' + (rl.length - 32) + ' more', rx + rw - 20, cy + 212, SZ.tiny, COL.dim, 'right');
    K.text(c, 'seed', rx + 20, cy + 244, SZ.tiny, COL.dim); u.text(c, r.seed, rx + 64, cy + 246, 22, COL.cyan, 'left');
    K.text(c, K.fit(c, 'best on this seed: floor ' + (meta.bestBySeed[r.seed] || r.floorNum) + '   ·   ' + (r.packs || 'v1'), SZ.tiny, rw - 40, false), rx + 20, cy + 272, SZ.tiny, COL.mute);
    // what the updates have to report (embers, mastery, feats, the hunt ...)
    const cap = K.capture('endUI', g, c), lines = cap.texts.filter(x => x.s.trim()).slice(0, 4); if (r.unlockedNow.length) lines.push({ s: 'Unlocked this run: ' + r.unlockedNow.slice(0, 3).join(', '), color: COL.gold });
    lines.slice(0, 4).forEach((x, i) => u.text(c, K.fit(c, x.s, SZ.small, 860, false), C.W / 2, cy + ch + 28 + i * 22, SZ.small, x.color || COL.mute, 'center', false));
    c.restore();
    u.btns = [];
    if (t >= 25) {
      const by = 574, bh = 52; u.button(c, 'retry', 'Retry this seed', 62, by, 232, bh, { size: 17, color: COL.green, primary: true }); u.button(c, 'new', 'New run', 306, by, 190, bh, { size: 17, color: COL.ember });
      u.button(c, 'title', 'Title screen', 508, by, 190, bh, { size: 17 }); u.button(c, 'copy', 'Copy summary', 710, by, 188, bh, { size: 15, ghost: true });
    }
  };

  // ==================================================================== COLLECTION
  const TABS = ['Classes', 'Relics', 'Actives', 'Bestiary', 'Bosses'];
  SC.collection = function (g, c) {
    const u = UI(), M = ED.menus, m = ED.input.mouse; u.navMode = 'spatial';
    K.head(c, 'COLLECTION', { y: 50, rule: 260 });
    TABS.forEach((t, i) => u.button(c, 'tab:' + i, t, 54 + i * 172, 80, 164, 40, { size: 16, selected: u.tab === i, color: COL.cyan }));
    const all = M.collectionCells(c, u.tab), total = all.length, got = all.filter(x => x.unlocked).length;
    // the grid: few entries get big cells with names, many get small icon-only cells (the name is in the panel below); more than fits goes to pages
    const mode = total <= 16 ? 'big' : total <= 40 ? 'mid' : 'small', S = { big: { w: 116, h: 108, gap: 12, k: 2.1 }, mid: { w: 72, h: 72, gap: 8, k: 1.6 }, small: { w: 52, h: 52, gap: 6, k: 1.25 } }[mode];
    const gx = 48, gy = 138, gw = 864, gh = 348, cols = Math.floor((gw + S.gap) / (S.w + S.gap)), rows = Math.max(1, Math.floor((gh + S.gap) / (S.h + S.gap))), per = cols * rows, pages = Math.max(1, Math.ceil(total / per));
    u.page = U.clamp(u.page | 0, 0, pages - 1); const cells = all.slice(u.page * per, (u.page + 1) * per), used = Math.min(cols, cells.length), x0 = Math.round((C.W - (used * (S.w + S.gap) - S.gap)) / 2);
    let hov = null;
    cells.forEach((cl, i) => {
      const x = x0 + (i % cols) * (S.w + S.gap), y = gy + Math.floor(i / cols) * (S.h + S.gap), on = u.navSel === 'cell:' + i || (m.x >= x && m.x <= x + S.w && m.y >= y && m.y <= y + S.h);
      u.button(c, 'cell:' + i, '', x, y, S.w, S.h, { color: cl.color, ghost: !cl.unlocked });
      if (cl.unlocked) { K.rr(c, x + 3, y + 3, S.w - 6, S.h - 6, 6); c.fillStyle = rgba(cl.color, on ? 0.2 : 0.11); c.fill(); }
      c.save(); c.translate(x + S.w / 2, y + (mode === 'big' ? 40 : S.h / 2)); c.scale(S.k, S.k); cl.draw(0, 0); c.restore();
      if (mode === 'big') { u.text(c, K.fit(c, cl.name, 15, S.w - 12, true), x + S.w / 2, y + S.h - 28, 15, cl.unlocked ? '#fff' : lockedCol, 'center'); K.text(c, K.fit(c, cl.sub || '', SZ.tiny, S.w - 12, false), x + S.w / 2, y + S.h - 9, SZ.tiny, cl.rar ? ED.items.RARITY[cl.rar].color : COL.dim, 'center'); }
      if (on) hov = cl;
    });
    // the page row and the count
    const py = 494;
    u.text(c, got + ' / ' + total + ' unlocked', 54, py + 21, 16, COL.gold, 'left');
    if (pages > 1) { u.button(c, 'pg:prev', '‹ Prev', 640, py, 96, 32, { size: 14, disabled: u.page === 0 }); K.text(c, 'page ' + (u.page + 1) + ' / ' + pages, 790, py + 21, SZ.small, COL.mute, 'center'); u.button(c, 'pg:next', 'Next ›', 844, py, 68, 32, { size: 14, disabled: u.page >= pages - 1 }); }
    // the one under the mouse / the keys / the finger
    const dy = 536; K.glass(c, 48, dy, 864, 92, { a: 0.8, accent: hov ? hov.color : null });
    if (hov) {
      u.shadow(c, hov.name, 70, dy + 32, 20, hov.color, 'left'); if (hov.sub && mode !== 'big') K.chip(c, 890, dy + 14, hov.sub, hov.rar ? ED.items.RARITY[hov.rar].color : COL.mute, { align: 'right' });
      const lines = K.lines(c, hov.desc, 820, 15); K.wrap(c, hov.desc, 70, dy + 56, 820, lines > 2 ? 18 : 22, 15, COL.text);
    } else K.text(c, 'Point at an entry, or tap it, to read about it.', C.W / 2, dy + 52, SZ.small, COL.dim, 'center');
    K.back(c, 'back', 'Back');
  };

  // ==================================================================== VERSIONS
  SC.versions = function (g, c) {
    const u = UI(), M = ED.menus, P = ED.packs, L = P.LIST, m = ED.input.mouse; u.navMode = 'spatial';
    K.head(c, 'VERSIONS', { y: 50, color: COL.cyan, rule: 240, sub: P.forced() ? 'Opened with ?packs=…  The first change you make here replaces that pin (and is saved).' : 'Switch any update on or off for your NEXT run.  v1 alone is the untouched original.' });
    // the checklist: two columns, seven rows to a page
    const per = 10, pages = Math.max(1, Math.ceil(L.length / per)); u.vpage = U.clamp(u.vpage | 0, 0, pages - 1);
    const colW = 424, rowH = 46, pitch = 52, y0 = 166; let over = null, picked = null;
    L.slice(u.vpage * per, (u.vpage + 1) * per).forEach((p, i) => {
      const col = i < 5 ? 0 : 1, x = 48 + col * (colW + 16), y = y0 + (i % 5) * pitch, on = P.on(p.id);
      u.button(c, 'pack:' + p.id, '', x, y, colW, rowH, { nav: !p.base, color: p.color, ghost: !on });
      if (m.x >= x && m.x <= x + colW && m.y >= y && m.y <= y + rowH) over = p; if (u.navSel === 'pack:' + p.id) picked = p;
      const sx = x + 14, sy = y + (rowH - 28) / 2;                                                     // the switch
      K.rr(c, sx, sy, 68, 28, 14); c.fillStyle = on ? p.color : 'rgba(255,255,255,0.12)'; c.fill();
      c.fillStyle = on ? '#14101e' : '#8a8aa4'; c.beginPath(); c.arc(on ? sx + 68 - 14 : sx + 14, sy + 14, 9, 0, TAU); c.fill();
      u.text(c, p.base ? 'BASE' : on ? 'ON' : 'OFF', on ? sx + 22 : sx + 46, sy + 19, 13, on ? '#14101e' : '#8a8aa4', 'center');
      u.text(c, p.id.toUpperCase() + '  ' + p.name, sx + 88, y + 29, 17, on ? lite(p.color, 0.15) : '#8f8fa8', 'left');
    });
    // the presets: a strip of numbers; the filled ones are on
    u.text(c, 'SWITCH ON EVERYTHING UP TO', 48, 124, SZ.tiny, COL.mute, 'left', true);
    const sw = 28; let chip = null, chipSel = null;
    L.forEach((p, i) => {
      const x = 48 + i * sw, y = 132, on = P.on(p.id); u.button(c, 'upto:' + p.id, '', x, y, sw - 2, 26, { color: p.color, ghost: true });
      K.rr(c, x + 2, y + 2, sw - 6, 22, 4); c.fillStyle = on ? rgba(p.color, 0.6) : 'rgba(255,255,255,0.04)'; c.fill();
      u.text(c, i === 0 ? '1' : p.id.slice(1), x + (sw - 2) / 2, y + 18, 13, on ? '#ffffff' : '#7a7a94', 'center');
      const hint = i === 0 ? ['V1 ONLY', 'The untouched original game: every update switched off.'] : ['UP TO ' + p.id.toUpperCase() + ' · ' + p.name, 'Switches on every update from v2 up to ' + p.id.toUpperCase() + ' and switches the later ones off.'];
      if (m.x >= x && m.x <= x + sw - 2 && m.y >= y && m.y <= y + 26) chip = hint; if (u.navSel === 'upto:' + p.id) chipSel = hint;
    });
    u.button(c, 'allpacks', 'ALL', 48 + L.length * sw + 6, 132, 912 - (48 + L.length * sw + 6), 26, { size: 14, color: COL.green });
    if (m.x >= 48 + L.length * sw + 6 && m.y >= 132 && m.y <= 158 && m.x <= 912) chip = ['EVERYTHING', 'Every update switched on.']; if (u.navSel === 'allpacks') chipSel = ['EVERYTHING', 'Every update switched on.'];
    // pages
    if (pages > 1) { u.button(c, 'vpg:prev', '‹ Prev', 312, 434, 100, 32, { size: 14, disabled: u.vpage === 0 }); K.text(c, 'page ' + (u.vpage + 1) + ' / ' + pages, C.W / 2, 455, SZ.small, COL.mute, 'center'); u.button(c, 'vpg:next', 'Next ›', 548, 434, 100, 32, { size: 14, disabled: u.vpage >= pages - 1 }); }
    // the details of what you point at
    const hint = over ? null : chip || (picked ? null : chipSel), cur = over || (hint ? null : picked), dy = 474, dh = 154;
    const blurb = (text, col) => { let fs = 14, lh = 20; if (K.lines(c, text, 820, fs) > 5) { fs = 13; lh = 18; } K.wrap(c, text, 70, dy + 66, 820, lh, fs, col); };
    if (hint) { K.glass(c, 48, dy, 864, dh, { a: 0.8, accent: COL.green }); u.shadow(c, hint[0], 70, dy + 34, 22, COL.green, 'left'); blurb(hint[1] + '  It applies to your next run.', COL.text); }
    else if (cur) {
      const on = P.on(cur.id), cnt = P.content(cur.id), parts = []; for (const k in cnt) parts.push('+' + cnt[k] + ' ' + (M.COUNT_NAMES[k] || k));
      K.glass(c, 48, dy, 864, dh, { a: 0.8, accent: on ? cur.color : null });
      u.shadow(c, cur.id.toUpperCase() + '  ' + cur.name, 70, dy + 34, 22, on ? cur.color : '#a8a8c0', 'left');
      if (parts.length) K.text(c, K.fit(c, parts.join('  ·  '), 14, 440, false), 890, dy + 32, 14, COL.gold, 'right');
      blurb(cur.blurb, on ? COL.text : COL.mute);
    } else { K.glass(c, 48, dy, 864, dh, { a: 0.6 }); u.shadow(c, 'Edition ' + P.stamp(), 70, dy + 34, 22, COL.mute, 'left'); blurb('Unlocks are shared between editions; each edition keeps its own best floor.  Point at an update (or tap it) to read about it.', COL.dim); }
    K.back(c, 'back', 'Back');
  };

  // ==================================================================== CONTROLS
  SC.help = function (g, c) {
    const u = UI(), M = ED.menus; K.head(c, 'CONTROLS', { y: 50, rule: 240 });
    const rows = M.helpRows(), px = 48, py = 96, pw = 528, ph = 460;
    K.glass(c, px, py, pw, ph, { a: 0.8 }); K.label(c, ED.touch && ED.touch.active() ? 'TOUCH' : 'KEYBOARD AND MOUSE', px + 24, py + 32, pw - 48);
    rows.forEach((r, i) => { const y = py + 72 + i * 41; K.text(c, r[0], px + 24, y, SZ.body, COL.mute); { let vs = SZ.body; c.font = 'bold ' + vs + 'px ' + K.FONT; while (vs > 14 && c.measureText(r[1]).width > 330) { vs--; c.font = 'bold ' + vs + 'px ' + K.FONT; } u.text(c, K.fit(c, r[1], vs, 340, true), px + pw - 24, y, vs, COL.gold, 'right'); } if (i) K.rule(c, px + 24, y - 27, pw - 48, 'rgba(255,255,255,0.07)'); });
    const tx = 596, tw = 316; K.glass(c, tx, py, tw, ph, { a: 0.8 }); K.label(c, 'GOOD TO KNOW', tx + 24, py + 32, tw - 48);
    let y = py + 66; for (const tip of M.HELP_TIPS) { u.text(c, '◆', tx + 24, y, 13, COL.ember, 'left'); y = K.wrap(c, tip, tx + 46, y, tw - 70, 21, 15, COL.text) + 12; }
    u.button(c, 'guide', 'Guide  ›', C.W / 2 - 110, 574, 220, 50, { size: 18, color: COL.cyan });
    K.back(c, 'back', 'Back');
  };

  // ==================================================================== KEY BINDINGS
  SC.keys = function (g, c) {
    const u = UI(), I = ED.input, M = ED.menus, rows = I.REBIND.filter(a => ED.packs.on('v7') || !/^item/.test(a)), rb = u.rebind;
    K.head(c, 'KEY BINDINGS', { y: 50, color: COL.cyan, rule: 260, sub: rb ? 'Press a key for “' + M.KEYLABEL[rb.action] + '”   ·   Esc cancels   ·   Backspace clears the slot' : 'Pick a slot, then press the key you want.  A key only does one job.' });
    const half = Math.ceil(rows.length / 2), cw = 424, sy = 156;
    rows.forEach((a, i) => {
      const col = i < half ? 0 : 1, x = 48 + col * (cw + 16), y = sy + (i % half) * 58;
      K.glass(c, x, y, cw, 50, { a: 0.55, shadow: false }); K.text(c, M.KEYLABEL[a], x + 16, y + 31, SZ.small, COL.text);
      for (let k = 0; k < 2; k++) { const wait = rb && rb.action === a && rb.slot === k, nm = I.names(a)[k]; u.button(c, 'slot:' + a + ':' + k, wait ? 'press a key…' : nm || '—', x + 228 + k * 98, y + 6, 92, 38, { size: 15, color: wait ? COL.gold : COL.cyan, selected: wait, textColor: nm ? '#ffffff' : '#6c6c88' }); }
    });
    u.button(c, 'reset', 'Reset to defaults', 48, 560, 250, 46, { size: 15, color: COL.red, disabled: I.isDefault() }); u.button(c, 'back', 'Done', C.W - 48 - 250, 560, 250, 46, { size: 17, color: COL.green, primary: true });
    K.hint(c, 'Fixed keys:  Esc pause / back  ·  P pause  ·  Enter confirm  ·  M mute  ·  F fullscreen  ·  Tab map  ·  ` debug', { y: 628 });
  };

  // ==================================================================== GUIDE
  SC.guide = function (g, c) {
    const u = UI(), G = ED.guide, list = G.pages(), m = ED.input.mouse; u.navMode = 'spatial';
    let sel = G.selected(); if (!list.find(p => p.id === sel)) sel = 'v1'; const cur = list.find(p => p.id === sel), at = list.indexOf(cur);
    K.head(c, 'GUIDE', { y: 50, color: COL.cyan, rule: 240, sub: 'How the game, and each update you have switched on, works.' });
    // the pages: a strip of numbers (the first is the basics)
    const sw = Math.min(30, Math.floor(864 / list.length));
    list.forEach((p, i) => { const x = 48 + i * sw, y = 122, on = p.id === sel; u.button(c, 'pg:' + p.id, '', x, y, sw - 2, 30, { color: p.color, selected: on, ghost: !on });
      u.text(c, i === 0 ? '★' : p.id.slice(1), x + (sw - 2) / 2, y + 21, 13, on ? '#ffffff' : '#9a9ab6', 'center'); });
    // the page itself
    const px = 48, py = 170, pw = 864, ph = 392; K.glass(c, px, py, pw, ph, { accent: cur.color, a: 0.82 });
    u.shadow(c, cur.base ? 'The Basics' : cur.id.toUpperCase() + '  ' + cur.name, px + 28, py + 44, 26, cur.color, 'left'); if (!cur.base) K.text(c, cur.tag, px + 28, py + 68, SZ.small, COL.mute);
    K.rule(c, px + 28, py + 84, pw - 56);
    let size = 16; const room = ph - 110; const hOf = (sz) => cur.guide.reduce((t, para) => t + K.lines(c, para, pw - 56, sz) * (sz + 6) + 12, 0);
    while (size > 13 && hOf(size) > room) size--; let y = py + 112; for (const para of cur.guide) y = K.wrap(c, para, px + 28, y, pw - 56, size + 6, size, '#e2e2f2') + 12;
    // page by page
    if (at > 0) u.button(c, 'pg:' + list[at - 1].id, '‹  ' + (list[at - 1].base ? 'The Basics' : list[at - 1].id.toUpperCase()), 48, 578, 220, 46, { size: 15 });
    if (at < list.length - 1) u.button(c, 'pg:' + list[at + 1].id, list[at + 1].id.toUpperCase() + '  ›', C.W - 48 - 220, 578, 220, 46, { size: 15 });
    K.text(c, (at + 1) + ' / ' + list.length, C.W / 2, 607, SZ.small, COL.dim, 'center');
    K.back(c, 'back', 'Back');
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

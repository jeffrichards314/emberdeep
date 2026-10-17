/* EMBERDEEP — menus.js : title, class + seed select, collection, controls, options, pause, end screens */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, C = ED.C;
  const UI = ED.ui, TAU = U.TAU;
  const TABS = ['Classes', 'Relics', 'Actives', 'Bestiary', 'Bosses'];
  let embers = null;

  const M = ED.menus = {
    score(g) {
      const r = g.run; return Math.round((r.floorNum * 1000 + r.kills * 8 + r.goldEarned + ED.items.relicCount(g.player) * 50 + (r.victory || r.cashedOut ? 2500 : 0)) * (r.heatMul || 1));
    },
    // ============================================================ navigation core
    navigate(g) {
      const inp = ED.input, m = inp.mouse, all = UI.prevBtns, btns = all.filter(b => b.nav);
      if (UI.seedEdit) return;
      if (btns.length) {
        let idx = btns.findIndex(b => b.id === UI.navSel);
        if (m.moved) for (let i = 0; i < btns.length; i++) { const b = btns[i]; if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) { if (UI.navSel !== b.id) UI.navSel = b.id; idx = i; } }
        if (idx < 0) { idx = 0; UI.navSel = btns[0].id; }
        const vert = UI.navMode === 'vert', spatial = UI.navMode === 'spatial';
        let d = 0, dir = null;
        if (spatial) dir = inp.consume('down') ? [0, 1] : inp.consume('up') ? [0, -1] : inp.consume('right') ? [1, 0] : inp.consume('left') ? [-1, 0] : null;      // (screens laid out as a grid: the arrows move to the neighbour on that side)
        else if (inp.consume('down')) d = 1; else if (inp.consume('up')) d = -1;
        else if (!vert) { if (inp.consume('right')) d = 1; else if (inp.consume('left')) d = -1; }
        if (dir) { const nb = M.neighbour(btns, btns[idx], dir); if (nb) { idx = btns.indexOf(nb); UI.navSel = nb.id; g.sfx('ui'); } }
        if (d) { idx = (idx + d + btns.length) % btns.length; UI.navSel = btns[idx].id; g.sfx('ui'); }
        if (m.clicked) { for (const b of all) if (!b.disabled && m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) { UI.action = b.id; g.sfx('uiok'); inp.mouse.clicked = false; break; } }
        if (inp.consume('confirm')) { const b = btns[idx]; if (b) { UI.action = b.id; g.sfx('uiok'); } }
      }
    },
    /** the button next to `cur` in direction `dir` ([dx, dy]): the nearest one beyond it, preferring those that face it (their spans overlap sideways) so a column stays a column and a wide cell is reached from any chip above it */
    neighbour(btns, cur, dir, far) {
      if (!cur) return null;
      const ccx = cur.x + cur.w / 2, ccy = cur.y + cur.h / 2; let best = null, bs = Infinity;
      for (const b of btns) {
        if (b === cur) continue;
        const along = dir[0] > 0 ? b.x - (cur.x + cur.w) : dir[0] < 0 ? cur.x - (b.x + b.w) : dir[1] > 0 ? b.y - (cur.y + cur.h) : cur.y - (b.y + b.h);          // gap between the two boxes in the direction of travel
        if (along < -2) continue;
        const across = dir[0] ? Math.max(0, b.y - (cur.y + cur.h), cur.y - (b.y + b.h)) : Math.max(0, b.x - (cur.x + cur.w), cur.x - (b.x + b.w));                // gap between their spans sideways (0 when they face each other)
        if (across > (far ? 1e9 : 44)) continue;
        const centre = dir[0] ? Math.abs(b.y + b.h / 2 - ccy) : Math.abs(b.x + b.w / 2 - ccx);
        const score = Math.max(0, along) + across * 20 + centre * 0.02; if (score < bs) { bs = score; best = b; }
      }
      if (!best && !far && dir[1] && UI.navMode === 'spatial') return M.neighbour(btns, cur, dir, true);          // a vertical move with nothing facing it (the left-hand column of a 3-column list, down to a centred Back button) goes to the nearest button below / above anyway
      return best;
    },
    pollAction(g) { const a = UI.action; UI.action = null; return a; },
    go(g, scene) { if (scene === 'title' || scene === 'select' || scene === 'collection') g.toasts.length = 0; g.scene = scene; UI.navSel = null; UI.action = null; UI.navMode = 'all'; UI.prevBtns = []; UI.btns = []; g.sfx('ui'); },

    // ============================================================ update dispatcher
    updateMenu(g) {
      UI.t++;
      for (const t of g.toasts) t.t++; U.compact(g.toasts, t => t.t < t.dur);
      const inp = ED.input;
      const sc = g.scene;
      if (sc === 'title') {
        M.navigate(g); const a = M.pollAction(g);
        if (a === 'start' || a === 'daily') ED.save.syncClasses();
        if (a === 'start') { UI.seedText = UI.seedText || ED.save.meta.lastSeed || ED.randomSeed(); UI.selClass = ED.save.isClassUnlocked(ED.save.meta.lastClass) ? ED.save.meta.lastClass : 'knight'; M.go(g, 'select'); }
        else if (a === 'daily') { UI.seedText = ED.dailySeed(); UI.selClass = 'knight'; M.go(g, 'select'); }
        else if (a === 'collection') { UI.tab = 0; M.go(g, 'collection'); }
        else if (a === 'help') M.go(g, 'help');
        else if (a && ED.sceneImpl[a]) M.go(g, a);
        else if (a === 'versions') { UI.navMode = 'spatial'; M.go(g, 'versions'); UI.navMode = 'spatial'; }
        else if (a === 'options') { UI.back = 'title'; UI.navMode = 'vert'; M.go(g, 'settings'); UI.navMode = 'vert'; }
      } else if (sc === 'versions') {
        UI.navMode = 'spatial'; M.navigate(g); const a = M.pollAction(g);
        if (a === 'back' || inp.consume('back')) { M.go(g, 'title'); return; }
        // a page opened with ?packs=... pins the switches; the first change made here replaces that pin with the choice you see (saved like any other)
        const unpin = () => { if (ED.packs.forced()) { const shown = ED.packs.active(); ED.packs.force(null); ED.packs.use(shown); } };
        if (a && a.indexOf('pack:') === 0) { const id = a.slice(5); if (ED.packs.BY_ID[id] && !ED.packs.BY_ID[id].base) { unpin(); ED.packs.toggle(id); g.sfx(ED.packs.on(id) ? 'unlock' : 'uiback'); } else g.sfx('deny'); }
        else if (a && a.indexOf('upto:') === 0) { unpin(); ED.packs.upTo(a.slice(5)); g.sfx('unlock'); }
        else if (a === 'allpacks') { unpin(); ED.packs.use('all'); g.sfx('unlock'); }
        UI.navMode = 'spatial';
      } else if (sc === 'select') {
        if (UI.seedEdit) return;
        M.navigate(g); const a = M.pollAction(g);
        if (inp.consume('back')) { M.go(g, 'title'); return; }
        if (a && a.indexOf('cls:') === 0) { const id = a.slice(4); if (ED.save.isClassUnlocked(id)) UI.selClass = id; else g.sfx('deny'); }
        else if (a === 'seed') M.editSeed(g);
        else if (a === 'rand') UI.seedText = ED.randomSeed();
        else if (a === 'daily') UI.seedText = ED.dailySeed();
        else if (a && ED.sceneImpl[a]) M.go(g, a);
        else if (a === 'go') { const seed = ED.normalizeSeed(UI.seedText); UI.seedText = seed; g.startRun(seed, UI.selClass); }
        else if (a === 'back') M.go(g, 'title');
      } else if (sc === 'collection') {
        M.navigate(g); const a = M.pollAction(g);
        if (inp.consume('back')) { M.go(g, 'title'); return; }
        if (a && a.indexOf('tab:') === 0) { UI.tab = +a.slice(4); UI.page = 0; }
        else if (a === 'pg:prev') UI.page = Math.max(0, (UI.page | 0) - 1);
        else if (a === 'pg:next') UI.page = (UI.page | 0) + 1;                 // (clamped when drawn)
        else if (a === 'back') M.go(g, 'title');
        if (inp.consume('tab')) { UI.tab = (UI.tab + 1) % TABS.length; UI.page = 0; }
      } else if (sc === 'help') {
        M.navigate(g); const a = M.pollAction(g);
        if (a === 'back' || inp.consume('back')) M.go(g, 'title'); else if (a && ED.sceneImpl[a]) M.go(g, a);
      } else if (sc === 'settings') {
        UI.navMode = 'vert'; M.navigate(g); const a = M.pollAction(g);
        const s = ED.save.meta.settings, sel = UI.navSel;
        const adj = (k, step, lo, hi) => { let d = 0; if (inp.consume('left')) d = -step; else if (inp.consume('right')) d = step; if (a === 'opt:' + k) d = step; if (d) { s[k] = U.clamp(Math.round((s[k] + d) * 100) / 100, lo, hi); ED.save.save(); ED.audio.applyVolume(); g.sfx('ui'); } };
        if (sel === 'opt:volume') adj('volume', 0.1, 0, 1); else if (sel === 'opt:music') adj('music', 0.1, 0, 1); else if (sel === 'opt:shake') adj('shake', 0.25, 0, 1.5); else if (sel === 'opt:flash') adj('flash', 0.25, 0, 1);
        else if (sel === 'opt:dmg') { if (a === 'opt:dmg' || inp.consume('left') || inp.consume('right')) { s.damageNumbers = s.damageNumbers ? 0 : 1; ED.save.save(); } }
        else if (sel === 'opt:assist') { const d = inp.consume('left') ? -1 : inp.consume('right') ? 1 : a === 'opt:assist' ? 1 : 0; if (d) { s.assist = (((s.assist | 0) + d) % 3 + 3) % 3; ED.save.save(); g.sfx('ui'); } }
        if (a === 'keys') { UI.confirm = null; M.go(g, 'keys'); return; }
        if (a === 'export') M.exportSave(g); else if (a === 'import') M.importSave(g);
        if (a === 'reset') { if (UI.confirm === 'reset') { ED.save.reset(); UI.confirm = null; g.toast && g.toast('Save data erased', '#ff6a6a'); } else UI.confirm = 'reset'; }
        if (a === 'back' || inp.consume('back')) { const to = UI.back || 'title'; UI.confirm = null; if (to === 'paused') { g.scene = 'paused'; UI.navSel = null; } else M.go(g, to); }
      } else if (sc === 'keys') {
        UI.navMode = 'vert'; M.navigate(g); const a = M.pollAction(g), I = ED.input;
        if (UI.rebind) { if (a && a.indexOf('slot:') !== 0) M.cancelRebind(); }
        else if (a === 'back' || inp.consume('back')) { M.go(g, 'settings'); return; }
        if (a === 'reset') { I.resetBindings(); g.sfx('ui'); }
        else if (a && a.indexOf('slot:') === 0) { const p = a.split(':'); M.startRebind(g, p[1], +p[2]); }
        UI.navMode = 'vert';
      } else if (sc === 'paused') {
        UI.navMode = 'vert'; M.navigate(g); const a = M.pollAction(g);
        if (inp.consume('pause') || inp.consume('back') || a === 'resume') { g.scene = 'play'; UI.navSel = null; g.sfx('uiback'); return; }
        if (a === 'options') { UI.back = 'paused'; g.scene = 'settings'; UI.navSel = null; }
        else if (a === 'abandon') { if (UI.confirm === 'abandon') { UI.confirm = null; g.finishRun(false); } else UI.confirm = 'abandon'; }
        else if (a === 'title') { UI.confirm = null; if (g.run && g.run.practice && ED.practice) ED.practice.leave(g); else { M.go(g, 'title'); g.scene = 'title'; } }
        UI.navMode = 'all';
      } else if (sc === 'dead' || sc === 'victory') {
        g.deadT++;
        UI.navMode = 'vert'; M.navigate(g); const a = M.pollAction(g);
        if (g.deadT < 25) return;
        if (a === 'retry') { g.startRun(g.run.seed, g.run.classId); }
        else if (a === 'new') { UI.seedText = ED.randomSeed(); UI.selClass = ED.save.isClassUnlocked(g.run.classId) ? g.run.classId : 'knight'; M.go(g, 'select'); }
        else if (a === 'title') M.go(g, 'title');
        else if (a === 'copy') M.copySummary(g);
        UI.navMode = 'all';
      }
      else if (ED.sceneImpl[sc]) { UI.navMode = 'vert'; M.navigate(g); const a = M.pollAction(g); ED.sceneImpl[sc].update(g, a, inp); UI.navMode = 'all'; }
      if (g.scene === 'settings' && g.run && UI.back === 'paused') { /* keep world frozen */ }
    },
    editSeed(g) {
      UI.seedEdit = true;
      ED.input.textCapture = (key, code, ev) => {
        if (code === 'Enter' || code === 'Escape' || code === 'Tab') { UI.seedEdit = false; ED.input.textCapture = null; UI.seedText = ED.normalizeSeed(UI.seedText); return true; }
        if (code === 'Backspace') { UI.seedText = UI.seedText.slice(0, -1); return true; }
        if (key && key.length === 1 && /[a-zA-Z0-9]/.test(key) && UI.seedText.length < 12) { UI.seedText += key.toUpperCase(); return true; }
        return true;
      };
      UI.seedText = '';
    },
    KEYLABEL: { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', attack: 'Attack', dash: 'Dash', interact: 'Interact / Buy / Take', active: 'Active ability', bomb: 'Place bomb', item1: 'Belt slot 1', item2: 'Belt slot 2', item3: 'Belt slot 3' },
    /** wait for the next key press and give it to (action, slot): Esc cancels, Backspace clears the slot */
    startRebind(g, action, slot) {
      const I = ED.input; UI.rebind = { action, slot }; g.sfx('ui');
      I.textCapture = (key, code) => {
        if (code !== 'Escape') {
          if (code === 'Backspace' || code === 'Delete') I.unbind(action, slot);
          else { const r = I.bind(action, slot, code); if (!r.ok) g.toast(r.reason, '#ff9a6a', 120); else { g.sfx('uiok'); if (r.steal) g.toast(I.codeName(code) + ' moved here from "' + M.KEYLABEL[r.steal] + '"', '#ffd24a', 150); } }
        }
        M.cancelRebind(); return true;
      };
    },
    cancelRebind() { UI.rebind = null; ED.input.textCapture = null; },
    exportSave(g) {
      const txt = ED.save.exportText();
      try { if (root.navigator && root.navigator.clipboard) { root.navigator.clipboard.writeText(txt); g.toast('Save copied to the clipboard (' + Math.round(txt.length / 1024 * 10) / 10 + ' KB) — keep it somewhere safe', '#6ee07a', 220); g.sfx('uiok'); return; } } catch (e) { /* fall through */ }
      if (typeof root.prompt === 'function') { root.prompt('Copy your save data (Ctrl/Cmd+C):', txt); return; }
      g.toast('Could not reach the clipboard here', '#ff9a6a', 160);
    },
    importSave(g, text) {                       // `text` lets tests (and a future paste box) skip the browser prompt
      if (text === undefined && typeof root.prompt !== 'function') { g.toast('Import needs a browser that can show a prompt', '#ff9a6a', 160); return; }
      const t = text !== undefined ? text : root.prompt('Paste your exported EMBERDEEP save data. This REPLACES the save you have now:'); if (!t) return;
      const r = ED.save.importText(t);
      if (r.ok) { g.toast('Save imported — ' + r.runs + ' runs, deepest floor ' + r.best, '#6ee07a', 220); g.sfx('unlock'); ED.audio && ED.audio.applyVolume(); ED.input.applyBindings(); } else { g.toast('Import failed: ' + r.why, '#ff6a6a', 200); g.sfx('deny'); }
    },
    copySummary(g) {
      const r = g.run, p = g.player;
      const txt = 'EMBERDEEP — ' + (r.victory ? 'VICTORY' : 'died') + ' on floor ' + r.floorNum + ' | ' + ED.items.CLASSES[r.classId].name + ' | ' + r.kills + ' kills | seed ' + r.seed + ' | ' + ED.items.relicCount(p) + ' relics | score ' + M.score(g);
      try { if (root.navigator && root.navigator.clipboard) root.navigator.clipboard.writeText(txt); } catch (e) { /* ignore */ }
      g.toast('Run summary copied!', '#6ee07a'); g.sfx('uiok');
    },

    // ============================================================ drawing
    drawMenu(g, c) {
      UI.beginFrame();
      M.drawBackdrop(g, c);
      switch (g.scene) {
        case 'title': M.drawTitle(g, c); break;
        case 'select': M.drawSelect(g, c); break;
        case 'collection': M.drawCollection(g, c); break;
        case 'help': M.drawHelp(g, c); break;
        case 'settings': M.drawSettings(g, c); break;
        case 'versions': M.drawVersions(g, c); break;
        case 'keys': M.drawKeys(g, c); break;
        default: if (ED.sceneImpl[g.scene]) ED.sceneImpl[g.scene].draw(g, c);
      }
      UI.drawToasts(g, c);
    },
    drawBackdrop(g, c) {
      const t = UI.t;
      const gr = c.createLinearGradient(0, 0, 0, C.H); gr.addColorStop(0, '#0a0814'); gr.addColorStop(1, '#1a0f1c'); c.fillStyle = gr; c.fillRect(0, 0, C.W, C.H);
      if (!embers) { embers = []; for (let i = 0; i < 70; i++) embers.push({ x: U.crand() * C.W, y: U.crand() * C.H, s: 0.3 + U.crand() * 1.2, r: 1 + U.crand() * 2.2, p: U.crand() * 6 }); }
      // distant dungeon silhouettes
      c.fillStyle = '#120c1a'; for (let i = 0; i < 9; i++) { const w = 90 + (i * 37) % 60, h = 120 + (i * 53) % 150; c.fillRect(i * 118 - 20, C.H - h, w, h); c.fillRect(i * 118 - 20 + w / 2 - 6, C.H - h - 18, 12, 18); }
      for (const e of embers) { e.y -= e.s; e.x += Math.sin(t * 0.02 + e.p) * 0.3; if (e.y < -5) { e.y = C.H + 5; e.x = U.crand() * C.W; } c.fillStyle = 'rgba(255,' + (120 + Math.floor(e.s * 60)) + ',60,' + (0.25 + 0.4 * Math.sin(t * 0.05 + e.p) * Math.sin(t * 0.05 + e.p)) + ')'; c.fillRect(e.x, e.y, e.r, e.r); }
    },
    drawTitle(g, c) {
      const t = UI.t, meta = ED.save.meta;
      // logo
      c.save(); c.translate(C.W / 2, 128);
      for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(255,' + (90 + i * 40) + ',40,' + (0.12 - i * 0.03) + ')'; c.beginPath(); c.arc(0, 8, 150 + i * 30 + Math.sin(t * 0.04) * 6, 0, TAU); c.fill(); }
      UI.text(c, 'EMBERDEEP', 4, 6, 76, '#3a0f08', 'center'); UI.text(c, 'EMBERDEEP', 0, 0, 76, '#ffb04a', 'center'); UI.text(c, 'EMBERDEEP', -1, -2, 76, '#ffe0a0', 'center');
      c.restore();
      UI.text(c, 'an endless descent', C.W / 2, 172, 18, '#c8a090', 'center', false);
      UI.text(c, ED.packs.stamp() === 'v1' ? 'v1 · original edition' : 'edition ' + ED.packs.stamp(), C.W / 2, 192, 11, '#8a7a98', 'center', false);
      const bx = C.W / 2 - 150; let y = 215;
      UI.button(c, 'start', 'START RUN', bx, y, 300, 44, { size: 20, color: '#ffb04a' }); y += 54;
      UI.button(c, 'daily', 'Daily Descent  (' + ED.dailySeed() + ')', bx, y, 300, 36, { size: 14 }); y += 44;
      UI.button(c, 'collection', 'Collection & Unlocks', bx, y, 300, 36, { size: 14 }); y += 44;
      UI.button(c, 'help', 'Controls & Guide', bx, y, 300, 36, { size: 14 }); y += 44;
      UI.button(c, 'options', 'Options', bx, y, 300, 36, { size: 14 }); y += 52;
      // stats
      const unl = Object.keys(meta.unlocked.items).length + Object.keys(meta.unlocked.classes).length - 1;
      UI.panel(c, C.W / 2 - 240, y, 480, 78, '#4a4a68', 0.6);
      const bf = (meta.bestByPacks && meta.bestByPacks[ED.packs.key()]) || 0;
      UI.text(c, 'DEEPEST FLOOR  ' + meta.bestFloor + (ED.packs.stamp() !== 'v1' || bf !== meta.bestFloor ? '   (' + ED.packs.stamp() + ': ' + bf + ')' : ''), C.W / 2, y + 26, 18, meta.bestFloor ? '#ffd24a' : '#8a8aa8', 'center');
      UI.text(c, 'Runs ' + meta.totalRuns + '   ·   Kills ' + meta.totalKills + '   ·   Victories ' + meta.victories + '   ·   Unlocks ' + unl, C.W / 2, y + 48, 12, '#a8a8c8', 'center', false);
      if (meta.bestRun) UI.text(c, 'Best run: floor ' + meta.bestRun.floor + ' as ' + (ED.items.CLASSES[meta.bestRun.cls] || { name: '?' }).name + ' (seed ' + meta.bestRun.seed + ')', C.W / 2, y + 66, 11, '#8a8aa8', 'center', false);
      UI.text(c, 'M mute · F fullscreen · ` debug', C.W / 2, C.H - 12, 11, '#5a5a78', 'center', false);
      UI.button(c, 'versions', 'VERSIONS  ▸  ' + ED.packs.stamp(), C.W - 262, 16, 246, 36, { size: 13, color: '#7fd8ff' });
      ED.runHooks('titleUI', g, c);
    },
    drawSelect(g, c) {
      const meta = ED.save.meta;
      UI.shadow(c, 'CHOOSE YOUR HERO', C.W / 2, 56, 32, '#ffd24a', 'center');
      const ids = ED.items.classList().map(c => c.id), compact = ids.length > 7;
      const perRow = compact ? Math.ceil(ids.length / 2) : ids.length, cw = compact ? 118 : 108, gap = 10, ch = compact ? 104 : 214;
      ids.forEach((id, i) => {
        const cls = ED.items.CLASSES[id], row = compact ? Math.floor(i / perRow) : 0, col = compact ? i % perRow : i;
        const inRow = compact ? (row === 0 ? perRow : ids.length - perRow) : ids.length, x0 = (C.W - (inRow * cw + (inRow - 1) * gap)) / 2;
        const x = x0 + col * (cw + gap), y = compact ? 70 + row * (ch + 8) : 82, unlocked = ED.save.isClassUnlocked(id), sel = UI.selClass === id;
        UI.button(c, 'cls:' + id, '', x, y, cw, ch, { selected: sel, color: cls.color, disabled: false });
        c.save();
        if (!unlocked) c.globalAlpha = 0.45;
        const cy = compact ? y + 26 : y + 44, wr = compact ? 15 : 22;
        c.fillStyle = unlocked ? cls.color : '#555'; c.beginPath(); c.arc(x + cw / 2, cy, wr, 0, TAU); c.fill(); c.strokeStyle = '#10101c'; c.lineWidth = 3; c.stroke();
        ED.render.itemGlyph(c, { cat: 'weapon', type: cls.weapon, rarity: 'common' }, x + cw / 2 + (compact ? 18 : 24), cy + (compact ? 14 : 26), compact ? 9 : 12, UI.t);
        UI.text(c, cls.name, x + cw / 2, compact ? y + 58 : y + 100, compact ? 13 : 15, unlocked ? '#fff' : '#888', 'center');
        UI.text(c, ED.items.WEAPONS[cls.weapon].name, x + cw / 2, compact ? y + 71 : y + 116, compact ? 10 : 11, unlocked ? '#c8c8e0' : '#777', 'center', false);
        if (compact) {
          UI.text(c, '♥ ' + cls.hearts, x + cw / 2 - 28, y + 86, 11, unlocked ? '#ff6a8a' : '#666', 'center');
          UI.text(c, ED.items.ACTIVES[cls.active].name, x + cw / 2 + 14, y + 86, 9, unlocked ? ED.items.ACTIVES[cls.active].color : '#777', 'center', false);
        } else {
          for (let k = 0; k < cls.hearts; k++) { ED.render.heart(c, x + 10 + (k % 5) * 18 + 6, y + 134 + Math.floor(k / 5) * 14, 4.5); c.fillStyle = unlocked ? '#ff3a5a' : '#555'; c.fill(); }
          UI.text(c, ED.items.ACTIVES[cls.active].name, x + cw / 2, y + 172, 10, unlocked ? ED.items.ACTIVES[cls.active].color : '#777', 'center', false);
        }
        c.restore();
        if (!unlocked) {
          ED.icons.draw(c, 'lock', x + cw / 2, cy, compact ? 9 : 12, '#ddd'); const what = M.unlockText(cls.unlock);
          if (compact) UI.text(c, what.slice(0, 20), x + cw / 2, y + 98, 8, '#ff9a6a', 'center', false);
          else { UI.text(c, what.slice(0, 16), x + cw / 2, y + 196, 9, '#ff9a6a', 'center', false); UI.text(c, what.slice(16, 32), x + cw / 2, y + 207, 9, '#ff9a6a', 'center', false); }
        }
      });
      const sc = ED.items.CLASSES[UI.selClass];
      UI.panel(c, 70, compact ? 300 : 306, 820, 62, '#4a4a68', 0.7);
      UI.wrap(c, sc.desc + '  ' + (ED.items.WEAPONS[sc.weapon].desc) + (sc.passive ? '  PASSIVE — ' + ED.items.relic(sc.passive).name + ': ' + ED.items.relic(sc.passive).desc : ''), 86, 326, 790, 14, 12, '#d8d8ee');
      // seed
      const best = meta.bestBySeed[ED.normalizeSeed(UI.seedText || 'x')];
      UI.text(c, 'SEED', 90, 402, 14, '#9a9ab8');
      UI.button(c, 'seed', UI.seedEdit ? UI.seedText + (Math.floor(UI.t / 20) % 2 ? '_' : ' ') : (UI.seedText || '(random)'), 150, 380, 280, 36, { size: 18, color: '#7fd8ff', selected: UI.seedEdit });
      UI.button(c, 'rand', 'Random', 440, 380, 110, 36, { size: 14 });
      UI.button(c, 'daily', 'Daily', 560, 380, 90, 36, { size: 14 });
      UI.text(c, UI.seedEdit ? 'Type letters/numbers, Enter to confirm' : 'Click the seed (or press Enter on it) to type your own. Same seed = same dungeon.', 90, 440, 12, '#8a8aa8', 'left', false);
      if (best) UI.text(c, 'Best on this seed: floor ' + best, 690, 404, 14, '#ffd24a', 'left');
      UI.button(c, 'go', 'BEGIN DESCENT', C.W / 2 - 160, 480, 320, 54, { size: 22, color: '#ffb04a' });
      UI.button(c, 'back', 'Back', C.W / 2 - 160, 546, 320, 34, { size: 14 });
      UI.text(c, ED.save.meta.bestFloor ? 'Deepest floor: ' + meta.bestFloor : '', C.W / 2, 610, 13, '#8a8aa8', 'center', false);
      ED.runHooks('selectUI', g, c);
    },
    unlockText(u) {
      if (!u) return '';
      const [k, id] = u.split(':');
      if (k === 'boss') { const d = ED.bosses.def(id); return 'Defeat ' + (d ? d.name : id); }
      if (k === 'mega') { const id2 = ED.bosses.MEGA_ORDER[+id]; const d = ED.bosses.def(id2); return 'Defeat ' + (d ? d.name : 'a MEGA boss'); }
      if (k === 'mini') { const d = ED.minibosses.def(id); return 'Defeat ' + (d ? d.name : id); }
      if (k === 'floor') return 'Reach floor ' + id;
      if (k === 'kills') return 'Slay ' + id + ' foes (all runs)';
      if (k === 'victory') return 'Win a run (cash out)';
      return u;
    },
    drawHelp(g, c) {
      UI.shadow(c, 'CONTROLS', C.W / 2, 70, 34, '#ffd24a', 'center');
      const I = ED.input, def = I.isDefault();
      const rows = [['Move', def ? 'WASD / Arrow keys' : ['up', 'left', 'down', 'right'].map(a => I.label(a)).join('  ·  ')], ['Attack', def ? 'Space / J / Left click (mouse aims)' : I.label('attack') + ' / Left click (mouse aims)'], ['Dash (i-frames)', def ? 'K / Shift' : I.label('dash')], ['Interact / Buy / Take', def ? 'E' : I.label('interact')], ['Active ability', def ? 'Q' : I.label('active')], ['Place bomb', def ? 'B' : I.label('bomb')], ['Pause', 'Esc / P'], ['Mute / Fullscreen', 'M / F'], ['Debug mode', '` (backtick)']];
      rows.forEach((r, i) => { UI.text(c, r[0], 230, 130 + i * 30, 17, '#cfd0ee'); UI.text(c, r[1], 520, 130 + i * 30, 17, '#ffd24a'); });
      const tips = ['Doors lock while enemies live. Telegraphed attacks glow red: dash THROUGH them or away.', 'The Boss Key is carried by a mini boss. Find the right key for each locked door (colored by type).', 'Bomb cracked walls (B). Cursed, devil and shrine rooms show costs up front — mystery chests do not.', 'Every 5th floor is a MEGA BOSS. A rest room appears before it.'];
      tips.forEach((t2, i) => UI.text(c, '• ' + t2, 70, 428 + i * 24, 13, '#a8a8c8', 'left', false));
      UI.button(c, 'back', 'Back', C.W / 2 - 220, 560, 200, 40, {}); UI.button(c, 'guide', 'Guide  ▸', C.W / 2 + 20, 560, 200, 40, { color: '#7fd8ff' });
    },
    drawKeys(g, c) {
      const I = ED.input, rows = I.REBIND.filter(a => ED.packs.on('v7') || !/^item/.test(a)), rb = UI.rebind;
      UI.shadow(c, 'KEY BINDINGS', C.W / 2, 50, 32, '#7fd8ff', 'center');
      UI.text(c, rb ? 'Press a key for "' + M.KEYLABEL[rb.action] + '"   ·   Esc cancels   ·   Backspace clears the slot' : 'Click a slot, then press the key you want. Each action takes two keys; a key only does one job.', C.W / 2, 74, 12, rb ? '#ffd24a' : '#a8a8c8', 'center', false);
      rows.forEach((a, i) => {
        const y = 90 + i * 33; UI.text(c, M.KEYLABEL[a], 200, y + 22, 15, '#cfd0ee');
        for (let s = 0; s < 2; s++) { const wait = rb && rb.action === a && rb.slot === s, nm = I.names(a)[s]; UI.button(c, 'slot:' + a + ':' + s, wait ? 'press a key…' : nm || '—', 430 + s * 170, y, 160, 28, { size: 13, color: wait ? '#ffd24a' : '#7fd8ff', selected: wait, textColor: nm ? '#ffffff' : '#7a7a98' }); }
      });
      UI.button(c, 'reset', 'Reset to defaults', 250, 530, 220, 36, { size: 13, color: '#ff6a6a', disabled: I.isDefault() });
      UI.button(c, 'back', 'Done', 490, 530, 220, 36, { size: 14, color: '#6ee07a' });
      UI.text(c, 'Fixed: Esc pause/back  ·  P pause  ·  Enter confirm  ·  M mute  ·  F fullscreen  ·  Tab  ·  ` debug', C.W / 2, 590, 11, '#7a7a98', 'center', false);
    },
    drawSettings(g, c) {
      const s = ED.save.meta.settings;
      UI.shadow(c, 'OPTIONS', C.W / 2, 90, 34, '#ffd24a', 'center');
      const bar = (id, label, v, max, y) => {
        UI.button(c, 'opt:' + id, label, 230, y, 500, 44, { size: 16 });
        c.fillStyle = '#1a1a2a'; c.fillRect(530, y + 14, 180, 16); c.fillStyle = '#ffb04a'; c.fillRect(530, y + 14, 180 * v / max, 16);
        UI.text(c, Math.round(v * 100) + '%', 700, y + 28, 12, '#fff', 'right');
      };
      bar('volume', '', s.volume, 1, 130); UI.text(c, 'Master volume', 250, 158, 16, '#cfd0ee');
      bar('music', '', s.music, 1, 184); UI.text(c, 'Music', 250, 212, 16, '#cfd0ee');
      bar('shake', '', s.shake, 1.5, 238); UI.text(c, 'Screen shake', 250, 266, 16, '#cfd0ee');
      bar('flash', '', s.flash, 1, 292); UI.text(c, 'Screen flashes (accessibility)', 250, 320, 16, '#cfd0ee');
      UI.button(c, 'opt:dmg', 'Damage numbers: ' + (s.damageNumbers ? 'ON' : 'OFF'), 230, 346, 500, 44, { size: 16 });
      const al = s.assist | 0, AS = ED.D.ASSIST;
      UI.button(c, 'opt:assist', 'Assist: ' + (al ? AS[al].name.toUpperCase() : 'OFF'), 230, 396, 500, 62, { size: 16, color: al ? '#ffb04a' : '#8a8aa8',
        sub: al ? 'Foes hit ' + Math.round((1 - AS[al].dmg) * 100) + '% softer, warn ' + Math.round((AS[al].tele - 1) * 100) + '% longer' + (AS[al].hp < 1 ? ', have 15% less HP' : '') + ' · next run · no personal bests' : 'Gentle / Easy: softer, slower foes for learning the game' });
      UI.button(c, 'keys', 'Key bindings…' + (ED.input.isDefault() ? '' : '  (customised)'), 230, 464, 500, 34, { size: 14, color: '#7fd8ff' });
      UI.button(c, 'export', 'Export save', 230, 502, 246, 32, { size: 13, color: '#9ad0ff' }); UI.button(c, 'import', 'Import save', 484, 502, 246, 32, { size: 13, color: '#9ad0ff' });
      UI.button(c, 'reset', UI.confirm === 'reset' ? 'Really erase ALL save data? (click again)' : 'Reset save data', 230, 538, 500, 32, { size: 13, color: '#ff6a6a' });
      UI.button(c, 'back', 'Back', 230, 576, 500, 38, { size: 16 });
      UI.text(c, 'Use ←/→ to change values', C.W / 2, 118, 11, '#8a8aa8', 'center', false);
    },

    // ============================================================ versions (the update toggles)
    drawVersions(g, c) {
      const L = ED.packs.LIST, mouse = ED.input.mouse, x0 = 40, W = C.W - 2 * x0;
      UI.shadow(c, 'VERSIONS', C.W / 2, 44, 32, '#7fd8ff', 'center');
      UI.text(c, ED.packs.forced() ? 'This page was opened with ?packs=...  The switches show that choice; the first change you make here replaces it (and is saved).' : 'Each update is independent: switch any on or off for your NEXT run (v1 alone is the untouched original).', C.W / 2, 64, 12, ED.packs.forced() ? '#ffd24a' : '#a8a8c8', 'center', false);
      // the checklist: one cell per update, filled column by column (at most 10 to a column, so 20-30 updates stay readable); the cells come first so the arrow keys start on them
      const perCol = 10, cols = Math.ceil(L.length / perCol), rows = Math.ceil(L.length / cols), gap = 14, cw = Math.floor((W - (cols - 1) * gap) / cols), y0 = 110, pitch = Math.min(46, Math.floor(396 / rows)), ch = pitch - 4;
      const NAMES = { classes: 'classes', weapons: 'weapons', actives: 'actives', relics: 'relics', armor: 'armor', affixes: 'affixes', enemies: 'enemies', mods: 'elite mods', minis: 'mini bosses', bosses: 'bosses', megas: 'mega bosses', rooms: 'room types', worlds: 'worlds', events: 'events', familiars: 'familiars', heat: 'heat rules', shrines: 'shrine altars' };
      let over = null, picked = null;
      L.forEach((p, i) => {
        const x = x0 + Math.floor(i / rows) * (cw + gap), y = y0 + (i % rows) * pitch, on = ED.packs.on(p.id);
        UI.button(c, 'pack:' + p.id, '', x, y, cw, ch, { nav: !p.base, color: p.color, selected: false });
        if (mouse.x >= x && mouse.x <= x + cw && mouse.y >= y && mouse.y <= y + ch) over = p;
        if (UI.navSel === 'pack:' + p.id) picked = p;
        c.fillStyle = on ? U.rgba(p.color, 0.12) : 'rgba(0,0,0,0.35)'; c.fillRect(x + 3, y + 3, cw - 6, ch - 6);
        const sw = 48, sx = x + 10, sy = y + Math.floor((ch - 18) / 2), tx = sx + sw + 12;                                  // the switch: the word sits on the track, the knob at the other end
        c.fillStyle = on ? p.color : '#3a3a4a'; c.fillRect(sx, sy, sw, 18); c.fillStyle = '#10101c'; c.fillRect(on ? sx + sw - 20 : sx + 3, sy + 3, 17, 12);
        UI.text(c, p.base ? 'BASE' : on ? 'ON' : 'OFF', on ? sx + 14 : sx + sw - 15, sy + 13, 9, on ? '#10101c' : '#8a8aa0', 'center');
        UI.text(c, p.id.toUpperCase() + ' · ' + p.name, tx, y + Math.round(ch * 0.46), 13, on ? p.color : '#8a8aa4');
        UI.text(c, p.tag, tx, y + Math.round(ch * 0.83), p.tag.length * 6 > cw - (tx - x) - 8 ? 9 : 10, on ? '#b8b8d4' : '#74748e', 'left', false);
      });
      // the presets: switch on everything up to an update (the first chip is the untouched original, the last one every update)
      UI.text(c, 'Quick presets: switch on everything up to', x0, 79, 10, '#8a8aa8', 'left', false);
      const pg = 4, fw = 58, aw = 96, n = L.length - 1, bw = Math.max(22, Math.min(60, Math.floor((W - fw - aw - (n + 1) * pg) / n))), fs = bw < 40 ? 10 : 12;
      let chip = null, chipSel = null;
      const addChip = (id, label, x, w, size, color, hint) => { UI.button(c, id, label, x, 84, w, 22, { size, color }); if (mouse.x >= x && mouse.x <= x + w && mouse.y >= 84 && mouse.y <= 106) chip = hint; if (UI.navSel === id) chipSel = hint; };
      L.forEach((p, i) => addChip('upto:' + p.id, i === 0 ? 'v1 only' : p.id, x0 + (i === 0 ? 0 : fw + pg + (i - 1) * (bw + pg)), i === 0 ? fw : bw, i === 0 ? 10 : fs, p.color,
        i === 0 ? ['V1 ONLY', 'The untouched original game: every update switched off.'] : [p.id.toUpperCase() + ' AND EARLIER', 'Switches on every update from v2 up to ' + p.id.toUpperCase() + ' · ' + p.name + ' and switches the later ones off.']));
      addChip('allpacks', 'EVERYTHING', x0 + fw + pg + n * (bw + pg), aw, 12, '#6ee07a', ['EVERYTHING', 'Every update switched on.']);
      // the details of the update under the mouse / the arrow keys (or the edition note)
      const hint = over ? null : chip || (picked ? null : chipSel), cur = over || (hint ? null : picked), py = y0 + rows * pitch + 4, ph = 80;
      if (hint) {
        UI.panel(c, x0, py, W, ph, '#6ee07a', 0.94);
        UI.shadow(c, 'PRESET · ' + hint[0], x0 + 14, py + 22, 15, '#6ee07a');
        UI.wrap(c, hint[1] + '  It applies to your next run.', x0 + 14, py + 42, W - 28, 14, 11, '#c8c8e0');
      } else if (cur) {
        const on = ED.packs.on(cur.id), cnt = ED.packs.content(cur.id), parts = [];
        for (const k in cnt) parts.push('+' + cnt[k] + ' ' + (NAMES[k] || k));
        UI.panel(c, x0, py, W, ph, on ? cur.color : '#5a5a78', 0.94);
        UI.shadow(c, cur.id.toUpperCase() + ' · ' + cur.name, x0 + 14, py + 22, 15, on ? cur.color : '#a0a0b8');
        if (parts.length) UI.text(c, parts.join('  ·  '), x0 + W - 14, py + 21, 10, on ? '#ffd24a' : '#8a8a60', 'right', false);
        const tw = W - 28, fsz = UI.wrapHeight(c, cur.blurb, tw, 14, 11) > 42 ? 10 : 11;
        UI.wrap(c, cur.blurb, x0 + 14, py + 42, tw, fsz === 10 ? 13 : 14, fsz, on ? '#c8c8e0' : '#8a8aa0');
      } else {
        UI.panel(c, x0, py, W, ph, '#5a5a78', 0.7);
        UI.text(c, 'Edition ' + ED.packs.stamp(), C.W / 2, py + 32, 14, '#9a9ab8', 'center');
        UI.text(c, 'Unlocks and best floors are shared; each edition tracks its own best floor.  Point at an update to read about it.', C.W / 2, py + 54, 11, '#8a8aa8', 'center', false);
      }
      UI.text(c, 'Arrows select  ·  Enter switches  ·  Esc back', x0, 618, 10, '#6a6a88', 'left', false);
      UI.button(c, 'back', 'Back', C.W / 2 - 100, 596, 200, 34, { size: 14 });
    },

    // ============================================================ collection
    drawCollection(g, c) {
      const meta = ED.save.meta, m = ED.input.mouse;
      UI.shadow(c, 'COLLECTION', C.W / 2, 50, 32, '#ffd24a', 'center');
      TABS.forEach((t2, i) => UI.button(c, 'tab:' + i, t2, 70 + i * 160, 68, 150, 32, { size: 14, selected: UI.tab === i, color: '#7fd8ff' }));
      UI.button(c, 'back', 'Back', C.W - 160, 600, 120, 30, { size: 13 });
      let cells = [];
      const tab = UI.tab;
      if (tab === 0) for (const cls of ED.items.classList()) { const un = ED.save.isClassUnlocked(cls.id); cells.push({ name: un ? cls.name : '???', color: un ? cls.color : '#555', unlocked: un, desc: un ? cls.desc : M.unlockText(cls.unlock), draw: (x, y) => { c.fillStyle = un ? cls.color : '#444'; c.beginPath(); c.arc(x, y, 12, 0, TAU); c.fill(); }, sub: un ? ED.items.WEAPONS[cls.weapon].name : 'LOCKED' }); }
      else if (tab === 1) for (const r of ED.packs.values(ED.items.RELICS).filter(x => !x.hidden)) { const un = ED.items.isUnlocked(r); const seen = !!meta.seen.items[r.id]; cells.push({ name: un ? r.name : '???', color: un ? ED.items.RARITY[r.rarity].color : '#555', unlocked: un, desc: un ? r.desc : 'Locked. ' + M.unlockText(r.unlock), draw: (x, y) => { if (un) ED.render.itemGlyph(c, { cat: 'relic', id: r.id }, x, y, 11, 0); else ED.icons.draw(c, 'lock', x, y, 9, '#777'); }, sub: un ? (seen ? 'found' : 'unfound') : 'LOCKED', rar: r.rarity }); }
      else if (tab === 2) for (const a of ED.packs.values(ED.items.ACTIVES)) { const un = ED.items.isUnlocked(a); cells.push({ name: un ? a.name : '???', color: un ? a.color : '#555', unlocked: un, desc: un ? a.desc : 'Locked. ' + M.unlockText(a.unlock), draw: (x, y) => { if (un) ED.render.itemGlyph(c, { cat: 'active', id: a.id, rarity: 'common' }, x, y, 11, 0); else ED.icons.draw(c, 'lock', x, y, 9, '#777'); }, sub: un ? 'active' : 'LOCKED' }); }
      else if (tab === 3) for (const e of ED.packs.values(ED.enemyTypes)) { if (e.id === 'boss') continue; const seen = !!meta.seen.enemies[e.id]; cells.push({ name: seen ? e.name : '???', color: seen ? e.color : '#555', unlocked: seen, desc: seen ? e.desc + (e.world && ED.worlds ? '  (found in ' + ED.worlds.byId[e.world].name + ')' : '  (appears from floor ' + (D.ENEMY_INTRO[e.id] || '—') + ')') : 'Not yet encountered.', draw: (x, y) => { c.fillStyle = seen ? e.color : '#333'; ED.render.shape(c, e.shape, x, y, 11, 0, 0); c.fill(); }, sub: seen ? 'seen' : '' }); }
      else {
        for (const id of ED.minibosses.ids) { const d = ED.minibosses.def(id), un = !!meta.unlocked.minis[id]; cells.push({ name: un ? d.name : '???', color: un ? d.color : '#555', unlocked: un, desc: un ? d.title + ' — mini boss. Unlocked: ' + d.unlockText : 'Defeat it once to unlock: ' + d.unlockText, draw: (x, y) => { ED.icons.draw(c, un ? 'skull' : 'lock', x, y, 10, un ? d.color : '#777'); }, sub: 'mini' }); }
        for (const id of ED.bosses.allIds()) { const d = ED.bosses.def(id), un = !!meta.unlocked.bosses[id]; cells.push({ name: un ? d.name : '???', color: un ? d.color : '#555', unlocked: un, desc: un ? d.name + ', ' + d.title + (d.mega ? ' (MEGA BOSS). ' : '. ') + d.teaches : (d.mega ? 'MEGA BOSS. ' : 'Boss. ') + 'Defeat it to unlock its rewards.', draw: (x, y) => { ED.icons.draw(c, un ? 'bigskull' : 'lock', x, y, 11, un ? d.color : '#777'); }, sub: d.mega ? 'MEGA' : 'boss' }); }
      }
      // the grid adapts to how much there is to show (81+ relics with every update): more columns first, then tighter rows, so it never runs under the tooltip / footer
      let cols = 12, cs = 74, rh = 76; const y0 = 112, maxH = 412;
      while (Math.ceil(cells.length / cols) * rh > maxH) { if (cols < 16) { cols++; cs = Math.floor(888 / cols); } else if (rh > 56) rh -= 4; else break; }
      // too many for one screen even at the tightest size (the bestiary and boss tabs with 25+ lands): split into pages
      const perPage = cols * Math.max(1, Math.floor(maxH / rh)), pages = Math.max(1, Math.ceil(cells.length / perPage)); UI.page = U.clamp(UI.page | 0, 0, pages - 1);
      const total = cells.length, got = cells.filter(x => x.unlocked).length; cells = cells.slice(UI.page * perPage, (UI.page + 1) * perPage);
      if (pages > 1) { UI.button(c, 'pg:prev', '◂ Prev', C.W - 430, 600, 100, 30, { size: 12, disabled: UI.page === 0 }); UI.text(c, 'page ' + (UI.page + 1) + ' / ' + pages, C.W - 310, 620, 12, '#a8a8c8', 'center', false); UI.button(c, 'pg:next', 'Next ▸', C.W - 290, 600, 100, 30, { size: 12, disabled: UI.page >= pages - 1 }); }
      const x0 = (C.W - cols * cs) / 2, nameMax = Math.max(6, Math.floor((cs - 8) / 5.6));
      let hov = null;
      cells.forEach((cl, i) => {
        const x = x0 + (i % cols) * cs, y = y0 + Math.floor(i / cols) * rh;
        UI.button(c, 'cell:' + i, '', x + 2, y, cs - 4, rh - 6, { color: cl.color, size: 12 });
        c.fillStyle = cl.unlocked ? U.rgba(cl.color, 0.12) : 'rgba(0,0,0,0.3)'; c.fillRect(x + 4, y + 2, cs - 8, rh - 10);
        cl.draw(x + cs / 2, y + 24);
        UI.text(c, cl.name.length > nameMax ? cl.name.slice(0, nameMax - 1) + '…' : cl.name, x + cs / 2, y + Math.min(52, rh - 24), 9, cl.unlocked ? '#fff' : '#777', 'center');
        UI.text(c, cl.sub || '', x + cs / 2, y + Math.min(64, rh - 12), 8, cl.rar ? ED.items.RARITY[cl.rar].color : '#8a8aa8', 'center', false);
        if (UI.navSel === 'cell:' + i || (m.x >= x && m.x <= x + cs && m.y >= y && m.y <= y + rh - 4)) hov = cl;
      });
      UI.text(c, got + ' / ' + total + ' unlocked', 70, 616, 13, '#ffd24a');
      if (hov) { UI.panel(c, 70, 530, 720, 66, hov.color, 0.94); UI.text(c, hov.name, 86, 552, 16, hov.color); UI.wrap(c, hov.desc, 86, 572, 690, 15, 12, '#d8d8ee'); }
    },

    // ============================================================ pause + end
    drawPause(g, c) {
      c.fillStyle = 'rgba(0,0,0,0.72)'; c.fillRect(0, 0, C.W, C.H);
      UI.shadow(c, 'PAUSED', C.W / 2, 90, 44, '#ffd24a', 'center');
      UI.button(c, 'resume', 'Resume', 90, 130, 260, 44, { size: 18, color: '#6ee07a' });
      UI.button(c, 'options', 'Options', 90, 184, 260, 40, { size: 16 });
      UI.button(c, 'abandon', UI.confirm === 'abandon' ? 'Really abandon? (click again)' : 'Abandon Run', 90, 234, 260, 40, { size: 14, color: '#ff6a6a' });
      UI.button(c, 'title', g.run && g.run.practice ? 'Back to the Gallery' : 'Quit to Title', 90, 284, 260, 40, { size: 14 });
      // build panel
      const p = g.player, x = 400, y = 120;
      UI.panel(c, x, y, 520, 440, '#4a4a68', 0.85);
      UI.text(c, 'YOUR BUILD  —  ' + ED.items.CLASSES[p.classId].name, x + 14, y + 26, 15, '#ffd24a');
      UI.text(c, 'Floor ' + g.floorNum + ' · ' + g.run.kills + ' kills · ' + UI.timeStr(g.run.frames) + ' · seed ' + g.run.seed + ' · ' + (g.run.packs || 'v1'), x + 14, y + 46, 11, '#9a9ab8', 'left', false);
      const rows = [['Weapon', p.weapon], ['Helmet', p.armor.helmet], ['Chest', p.armor.chest], ['Boots', p.armor.boots], ['Active', p.active && p.active.item]];
      rows.forEach((r, i) => { const yy = y + 76 + i * 28; UI.text(c, r[0], x + 14, yy, 11, '#8a8aa8', 'left', false); if (r[1]) { ED.render.itemGlyph(c, r[1], x + 84, yy - 4, 8, 0); UI.text(c, ED.items.itemName(r[1]), x + 100, yy, 12, ED.items.itemColor(r[1])); } else UI.text(c, '—', x + 100, yy, 12, '#555'); });
      const st = p.st;
      const stats = ['HP ' + p.hp + '/' + p.maxHp, 'DEF ' + st.def.toFixed(1), 'DMG x' + st.dmg.toFixed(2), 'ATK SPD x' + st.atkSpd.toFixed(2), 'CRIT ' + Math.round(st.crit * 100) + '% (x' + st.critMult.toFixed(1) + ')', 'MOVE x' + st.speed.toFixed(2), 'LUCK ' + st.luck.toFixed(1), 'THORNS ' + st.thorns];
      stats.forEach((s2, i) => UI.text(c, s2, x + 330 + (i % 2) * 90, y + 82 + Math.floor(i / 2) * 22, 10, '#c8c8e0', 'left', false));
      UI.text(c, 'RELICS', x + 14, y + 236, 12, '#ffd24a');
      const ids = Object.keys(p.relics).filter(id => !(ED.items.relic(id) || {}).talent), m = ED.input.mouse; let tip = null;
      // big hauls shrink the tiles (13 per row up to 39 relics, then 16, then 19) so the grid never reaches the buff / curse lists below it
      const per = ids.length > 64 ? 19 : ids.length > 39 ? 16 : 13, step = Math.floor(494 / per), tile = step - 4, rowsUsed = Math.ceil(ids.length / per), relicEnd = y + 246 + rowsUsed * step;
      ids.forEach((id, i) => { const rx = x + 14 + (i % per) * step, ry = y + 246 + Math.floor(i / per) * step; const r = ED.items.relic(id); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(rx, ry, tile, tile); c.strokeStyle = ED.items.RARITY[r.rarity].color; c.strokeRect(rx + 0.5, ry + 0.5, tile - 1, tile - 1); ED.render.itemGlyph(c, { cat: 'relic', id }, rx + tile / 2, ry + tile / 2, Math.round(tile * 0.3), 0); if (p.relics[id] > 1) UI.text(c, 'x' + p.relics[id], rx + tile - 2, ry + tile - 2, 9, '#fff', 'right'); if (m.x >= rx && m.x <= rx + tile && m.y >= ry && m.y <= ry + tile) tip = { id, rx, ry }; });
      if (!ids.length) UI.text(c, 'None yet — find them in treasure rooms, shops, shrines...', x + 14, y + 266, 11, '#6a6a88', 'left', false);
      const by = Math.max(y + 380, relicEnd + 14), cy2 = by + Math.ceil(p.buffs.length / 3) * 14 + (p.buffs.length ? 6 : 0);
      p.buffs.forEach((b, i) => UI.text(c, '+ ' + b.name, x + 14 + (i % 3) * 160, by + Math.floor(i / 3) * 14, 10, '#6ee07a', 'left', false));
      p.curses.forEach((b, i) => UI.text(c, '- ' + b.name, x + 14 + (i % 3) * 160, Math.max(y + 410, cy2) + Math.floor(i / 3) * 14, 10, '#ff6a8a', 'left', false));
      ED.runHooks('pauseUI', g, c, { x, y });
      if (tip) UI.drawItemTip(g, c, { cat: 'relic', id: tip.id }, tip.rx + 17, tip.ry + 40, false);
    },
    drawEnd(g, c) {
      const v = g.scene === 'victory', r = g.run, p = g.player, t = g.deadT;
      const a = U.clamp(t / 40, 0, 1);
      c.fillStyle = 'rgba(' + (v ? '10,12,4' : '14,2,4') + ',' + 0.82 * a + ')'; c.fillRect(0, 0, C.W, C.H);
      c.save(); c.globalAlpha = a;
      UI.shadow(c, v ? 'VICTORY' : 'YOU DIED', C.W / 2, 82, 56, v ? '#ffd24a' : '#ff3b4a', 'center');
      UI.text(c, v ? 'You cashed out with your treasures on floor ' + r.floorNum : 'Slain by ' + (r.killedBy || 'the dark') + ' on floor ' + r.floorNum + ' — ' + g.dif.dangerName + ' danger', C.W / 2, 112, 15, '#d0d0e8', 'center', false);
      const meta = ED.save.meta, res = g.runResult || {};
      if (res.newBest) UI.shadow(c, '★ NEW PERSONAL BEST ★', C.W / 2, 140, 18, '#ffd24a', 'center');
      else if (r.assist) UI.text(c, 'ASSISTED RUN (' + ED.D.ASSIST[r.assist].name + ') — personal bests are not recorded', C.W / 2, 140, 14, '#ffb04a', 'center');
      else UI.text(c, 'Deepest floor: ' + meta.bestFloor, C.W / 2, 140, 15, '#ffd24a', 'center');
      const x = 110, y = 160;
      UI.panel(c, x, y, 740, 300, '#4a4a68', 0.8);
      const L = [['Deepest floor', r.floorNum], ['Enemies slain', r.kills], ['Rooms cleared', r.roomsCleared], ['Gold collected', r.goldEarned], ['Items collected', r.itemsTaken + Object.keys(p.relics).reduce((s, k) => s + p.relics[k], 0)], ['Damage taken', r.damageTaken], ['Time', UI.timeStr(r.frames)], ['Bosses slain', r.bossesKilled.length], ['Mini bosses slain', r.minisKilled.length], ['Locks opened', r.locksOpened || 0]];
      L.forEach((row, i) => { const cx = x + 24 + (i % 2) * 360, cy = y + 36 + Math.floor(i / 2) * 30; UI.text(c, row[0], cx, cy, 14, '#9a9ab8', 'left', false); UI.text(c, String(row[1]), cx + 240, cy, 16, '#fff', 'right'); });
      UI.text(c, 'SCORE ' + M.score(g), x + 370, y + 206, 26, '#ffd24a', 'center');
      UI.text(c, 'SEED', x + 24, y + 250, 13, '#9a9ab8'); UI.text(c, r.seed, x + 74, y + 252, 24, '#7fd8ff'); UI.text(c, 'edition ' + (r.packs || 'v1'), x + 24, y + 290, 11, '#8a8aa8', 'left', false);
      UI.text(c, 'best on this seed: floor ' + (meta.bestBySeed[r.seed] || r.floorNum), x + 24, y + 274, 11, '#8a8aa8', 'left', false);
      UI.text(c, ED.items.CLASSES[r.classId].name + ' · ' + ED.items.itemName(p.weapon), x + 716, y + 252, 13, '#c8c8e0', 'right');
      const rl = Object.keys(p.relics);
      rl.slice(0, 28).forEach((id, i) => ED.render.itemGlyph(c, { cat: 'relic', id }, x + 400 + (i % 14) * 22, y + 262 + Math.floor(i / 14) * 22, 7, 0));
      ED.runHooks('endUI', g, c);
      if (r.unlockedNow.length) UI.text(c, 'Unlocked this run: ' + r.unlockedNow.slice(0, 3).join(', '), C.W / 2, 478, 12, '#ffd24a', 'center', false);
      c.restore();
      UI.btns = [];
      if (t >= 25) {
        UI.button(c, 'retry', 'Retry this seed', 120, 500, 220, 44, { size: 16, color: '#6ee07a' });
        UI.button(c, 'new', 'New run', 370, 500, 220, 44, { size: 16, color: '#ffb04a' });
        UI.button(c, 'title', 'Title screen', 620, 500, 220, 44, { size: 16 });
        UI.button(c, 'copy', 'Copy run summary', 370, 552, 220, 34, { size: 13 });
      }
    },
  };
  // let ui.js call updateMenu / drawMenu through ED.ui
  UI.updateMenu = M.updateMenu; UI.drawMenu = M.drawMenu; UI.drawPause = M.drawPause;
})(typeof globalThis !== 'undefined' ? globalThis : this);

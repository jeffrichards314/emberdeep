/* EMBERDEEP — input.js : keyboard + mouse -> abstract actions (also scriptable for tests) */
(function (root) {
  'use strict';
  const ED = root.ED;
  const MAP = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    attack: ['Space', 'KeyJ'], dash: ['KeyK', 'ShiftLeft', 'ShiftRight'], interact: ['KeyE'], active: ['KeyQ'],
    bomb: ['KeyB'], pause: ['Escape', 'KeyP'], debug: ['Backquote'], mute: ['KeyM'], confirm: ['Enter', 'Space', 'KeyE'], back: ['Escape'],
    tab: ['Tab'], fullscreen: ['KeyF'], item1: ['KeyZ'], item2: ['KeyX'], item3: ['KeyC'],       // item1-3: belt slots (v7 Provisions)
  };
  const KEYFALLBACK = { '`': 'Backquote', '~': 'Backquote', ' ': 'Space', 'Enter': 'Enter', 'Escape': 'Escape', 'Tab': 'Tab' };
  const codeOf = e => e.code || KEYFALLBACK[e.key] || (e.key && e.key.length === 1 ? 'Key' + e.key.toUpperCase() : e.key);
  const codeToAct = {};
  const rebuild = () => { for (const k in codeToAct) delete codeToAct[k]; for (const a in MAP) for (const c of MAP[a]) (codeToAct[c] = codeToAct[c] || []).push(a); };
  rebuild();
  // ---- rebinding: the defaults above stay the source of truth; the player's overrides live in settings.keys (action -> up to two codes)
  const DEFAULT_MAP = JSON.parse(JSON.stringify(MAP));
  const REBIND = ['up', 'down', 'left', 'right', 'attack', 'dash', 'interact', 'active', 'bomb', 'item1', 'item2', 'item3'];
  const RESERVED = new Set(['Escape', 'Enter', 'Backquote', 'Tab', 'KeyM', 'KeyF', 'KeyP', 'Backspace', 'Delete']);      // menus, pause, debug, mute, fullscreen
  const NAMES = { Space: 'Space', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab', Backspace: 'Backspace' };
  const codeName = (c) => NAMES[c] || (/^Key[A-Z]$/.test(c) ? c.slice(3) : /^Digit\d$/.test(c) ? c.slice(5) : /^Numpad/.test(c) ? 'Num' + c.slice(6) : c);

  const I = ED.input = {
    MAP,
    keys: {},            // code -> bool
    acts: {},            // action -> bool (held)
    edge: {},            // action -> bool (pressed this frame)
    mouse: { x: 480, y: 320, down: false, clicked: false, moved: false, aim: false, rclicked: false },
    textCapture: null,   // fn(key, code) while typing a seed
    sim: null,           // test scripting: {held:{}, edge:{}}
    hasFocus: true,
    init(canvas) {
      if (typeof window === 'undefined' || !window.addEventListener || !canvas || !canvas.addEventListener) return;
      const rect = () => canvas.getBoundingClientRect();
      window.addEventListener('keydown', e => {
        const code = codeOf(e);
        if (I.textCapture) { if (I.textCapture(e.key, code, e)) { e.preventDefault(); return; } }
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backquote'].includes(code)) e.preventDefault();
        if (e.repeat) return;
        I.keys[code] = true;
        const acts = codeToAct[code];
        if (acts) for (const a of acts) { I.acts[a] = true; I.edge[a] = true; }
        if (acts && acts.indexOf('attack') >= 0) I.mouse.aim = false;
      });
      window.addEventListener('keyup', e => {
        const code = codeOf(e);
        I.keys[code] = false;
        const acts = codeToAct[code];
        if (acts) for (const a of acts) { I.acts[a] = ED.input._anyDown(a); }
      });
      window.addEventListener('blur', () => { I.keys = {}; I.acts = {}; I.mouse.down = false; });
      canvas.addEventListener('mousemove', e => {
        const r = rect(); I.mouse.x = (e.clientX - r.left) * (960 / r.width); I.mouse.y = (e.clientY - r.top) * (640 / r.height); I.mouse.moved = true;
      });
      canvas.addEventListener('mousedown', e => {
        const r = rect(); I.mouse.x = (e.clientX - r.left) * (960 / r.width); I.mouse.y = (e.clientY - r.top) * (640 / r.height);
        if (e.button === 0) { I.mouse.down = true; I.mouse.clicked = true; I.mouse.aim = true; }
        if (e.button === 2) { I.mouse.rclicked = true; }
        if (ED.audio) ED.audio.unlock();
      });
      window.addEventListener('mouseup', e => { if (e.button === 0) I.mouse.down = false; });
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      window.addEventListener('keydown', () => { if (ED.audio) ED.audio.unlock(); }, { once: true });
    },
    REBIND, RESERVED, DEFAULT_MAP, codeName,
    /** read settings.keys into MAP (call after load / after any change) */
    applyBindings() {
      const k = ED.save && ED.save.meta && ED.save.meta.settings && ED.save.meta.settings.keys;
      for (const a of REBIND) { const v = k && Array.isArray(k[a]) ? k[a].filter(c => typeof c === 'string' && c && !RESERVED.has(c)).slice(0, 2) : null; MAP[a] = v ? v : DEFAULT_MAP[a].slice(); }
      rebuild();
    },
    isDefault() { return !(ED.save.meta.settings.keys && Object.keys(ED.save.meta.settings.keys).length); },
    /** put `code` in slot 0/1 of an action; a key can only do one job, so it is taken from whichever action had it */
    bind(action, slot, code) {
      if (REBIND.indexOf(action) < 0) return { ok: false, reason: 'not rebindable' };
      if (!code || RESERVED.has(code)) return { ok: false, reason: codeName(code || '?') + ' is reserved' };
      const s = ED.save.meta.settings, keys = s.keys = s.keys || {}; let steal = null;
      for (const a of REBIND) { const cur = (keys[a] || MAP[a]).slice(); if (a !== action && cur.indexOf(code) >= 0) { steal = a; keys[a] = cur.filter(c => c !== code); } }
      const cur = (keys[action] || MAP[action]).slice(), slots = [cur[0] || null, cur[1] || null]; for (let i = 0; i < 2; i++) if (slots[i] === code) slots[i] = null; slots[slot ? 1 : 0] = code; keys[action] = slots.filter(Boolean);
      ED.save.save(); I.applyBindings(); return { ok: true, steal };
    },
    /** empty a slot (the other key keeps working) */
    unbind(action, slot) { if (REBIND.indexOf(action) < 0) return false; const s = ED.save.meta.settings, keys = s.keys = s.keys || {}, cur = (keys[action] || MAP[action]).slice(); cur.splice(slot, 1); keys[action] = cur; ED.save.save(); I.applyBindings(); return true; },
    resetBindings() { delete ED.save.meta.settings.keys; ED.save.save(); I.applyBindings(); },
    actionsFor(code) { return (codeToAct[code] || []).slice(); },
    names(a) { return (MAP[a] || []).map(codeName); },
    label(a) { const n = I.names(a); return n.length ? n.join(' / ') : '—'; },
    key1(a) { const n = I.names(a); return n.length ? n[0] : '—'; },
    /** on-screen hints written as "[E] Buy" follow the rebinding */
    relabel(str) { return typeof str === 'string' && str.indexOf('[E]') >= 0 ? str.split('[E]').join('[' + I.key1('interact') + ']') : str; },
    _anyDown(a) { for (const c of MAP[a]) if (I.keys[c]) return true; return false; },
    padHeld: {}, padEdge: {}, padAxis: { x: 0, y: 0 }, aimVec: null, padName: null,
    held(a) { return !!(I.acts[a] || I.edge[a] || (I.sim && I.sim.held[a]) || I.padHeld[a] || (a === 'attack' && (I.mouse.down || I.mouse.clicked))); },   // a tap shorter than one frame still counts for that frame
    pressed(a) { return !!(I.edge[a] || (I.sim && I.sim.edge[a]) || I.padEdge[a] || (a === 'attack' && I.mouse.clicked)); },
    /** gamepad (standard mapping): sticks/dpad move, X/RT attack, A/RB dash, B interact, Y/LB active, LT bomb, Start pause */
    poll() {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      let gp = null; try { const pads = navigator.getGamepads(); for (const q of pads) if (q && q.connected) { gp = q; break; } } catch (e) { return; }
      const prev = I.padHeld, cur = {};
      I.padAxis = { x: 0, y: 0 }; I.aimVec = null; I.padName = gp ? gp.id : null;
      if (gp) {
        const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
        const lx = gp.axes[0] || 0, ly = gp.axes[1] || 0, rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
        cur.left = lx < -0.5 || b(14); cur.right = lx > 0.5 || b(15); cur.up = ly < -0.5 || b(12); cur.down = ly > 0.5 || b(13);
        cur.attack = b(2) || b(7); cur.dash = b(0) || b(5); cur.interact = b(1); cur.active = b(3) || b(4); cur.bomb = b(6); cur.pause = b(9); cur.confirm = b(0); cur.back = b(1) && false;
        const dz = 0.22; if (Math.hypot(lx, ly) > dz) { I.padAxis = { x: lx, y: ly }; }
        if (Math.hypot(rx, ry) > 0.4) { I.aimVec = { x: rx, y: ry }; I.mouse.aim = false; }
      }
      I.padEdge = {};
      for (const a in cur) if (cur[a] && !prev[a]) I.padEdge[a] = true;
      I.padHeld = cur;
    },
    /** movement axis -1..1 (normalised) */
    axis() {
      let x = 0, y = 0;
      if (I.held('left')) x -= 1; if (I.held('right')) x += 1; if (I.held('up')) y -= 1; if (I.held('down')) y += 1;
      if (x && y) { x *= 0.7071; y *= 0.7071; }
      if (!x && !y && (I.padAxis.x || I.padAxis.y)) return { x: I.padAxis.x, y: I.padAxis.y };
      return { x, y };
    },
    /** call at the end of every fixed update */
    endFrame() { I.edge = {}; I.mouse.clicked = false; I.mouse.rclicked = false; I.mouse.moved = false; if (I.sim) I.sim.edge = {}; },
    consume(a) { const v = I.pressed(a); I.edge[a] = false; I.padEdge[a] = false; if (I.sim) I.sim.edge[a] = false; if (a === 'attack') I.mouse.clicked = false; return v; },
    clear() { I.edge = {}; I.mouse.clicked = false; },
  };
  I.applyBindings();
})(typeof globalThis !== 'undefined' ? globalThis : this);

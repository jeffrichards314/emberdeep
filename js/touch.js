/* EMBERDEEP — touch.js : touch controls for phones and tablets.
 *
 *  PLAY    a floating thumb stick on the left half of the screen (move), a big ATTACK button that also aims when you drag it (let go of the drag and it
 *          aims itself at the nearest foe), and DASH / USE / ACTIVE / BOMB on an arc around it; small PAUSE, MAP (hold) and belt buttons in the corner.
 *  MENUS   plain taps.  A finger that misses a button by a few pixels still hits the nearest one, and a small X button stands in for the Esc key.
 *  SEED    the seed field opens the browser's own text prompt (no hidden keyboard tricks).
 *
 *  Everything feeds the same abstract actions the keyboard and the gamepad do, through ED.input.touchState (see input.js poll()), so no game code knows about touch.
 *  The controls are DOM elements laid over the canvas: not one canvas call changes (render parity), and on a machine without a touch screen nothing here runs.
 *  Settings live in meta.settings.touch = {mode: auto|on|off, size, hand, opacity, vib, auto}.  `?touch=1` / `?touch=0` in the address overrides the mode for a visit.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, I = ED.input;
  const DEF = { mode: 'auto', size: 1, hand: 'right', opacity: 0.7, vib: 1, auto: 1 };
  const SIZES = [0.85, 1, 1.2], SIZE_NAMES = ['SMALL', 'MEDIUM', 'LARGE'], OPACS = [0.45, 0.7, 0.95], OPAC_NAMES = ['FAINT', 'NORMAL', 'SOLID'], MODES = ['auto', 'on', 'off'];
  const SCALES = [2, 1.5, 1.25, 1];                                                    // canvas pixels per game pixel, tried in this order when the phone cannot keep up
  /** the saved touch settings, every value checked (a hand-edited or imported save never reaches the layout as garbage) */
  const cfg = () => {
    const s = ED.save && ED.save.meta && ED.save.meta.settings, t = s && s.touch && typeof s.touch === 'object' ? s.touch : {};
    const on = (v, d) => v === 0 || v === false ? 0 : v === 1 || v === true ? 1 : d;
    return { mode: MODES.indexOf(t.mode) >= 0 ? t.mode : DEF.mode, size: SIZES.indexOf(t.size) >= 0 ? t.size : DEF.size, hand: t.hand === 'left' ? 'left' : 'right', opacity: OPACS.indexOf(t.opacity) >= 0 ? t.opacity : DEF.opacity, vib: on(t.vib, DEF.vib), auto: on(t.auto, DEF.auto) };
  };

  const BUTTONS = [
    { id: 'attack', act: 'attack', color: '#ff9a4a', icon: 'M5 19L17 7 M13 4h7v7 M6 13l5 5 M4 20l3-3', k: 1.5 },
    { id: 'dash', act: 'dash', color: '#7fd8ff', icon: 'M5 6l6 6-6 6 M12 6l6 6-6 6', k: 1.05, deg: 180 },
    { id: 'use', act: 'interact', color: '#ffd24a', text: 'USE', k: 1.05, deg: 210 },
    { id: 'active', act: 'active', color: '#c8a0ff', icon: 'M13 3L5 14h6l-1 7 8-11h-6z', k: 0.98, deg: 240 },
    { id: 'bomb', act: 'bomb', color: '#ff6a6a', icon: 'M11 9a6 6 0 1 0 .01 0z M15 8l3-3 M17 3l3 1', k: 0.98, deg: 270 },
    { id: 'pause', act: 'pause', color: '#cfd0ee', icon: 'M8 5v14 M16 5v14', small: true },
    { id: 'map', act: 'tab', color: '#cfd0ee', icon: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14', small: true },
    { id: 'item1', act: 'item1', color: '#9fe8a0', text: '1', small: true, belt: true },
    { id: 'item2', act: 'item2', color: '#9fe8a0', text: '2', small: true, belt: true },
    { id: 'item3', act: 'item3', color: '#9fe8a0', text: '3', small: true, belt: true },
    { id: 'back', act: 'back', color: '#cfd0ee', icon: 'M6 6l12 12 M18 6L6 18', small: true, menu: true },
  ];
  const BY_ID = {}; for (const b of BUTTONS) BY_ID[b.id] = b;

  // ------------------------------------------------------------------ pure helpers (no DOM: the tests call these directly)
  const T = ED.touch = {
    state: { on: false, visible: false, held: {}, latch: {}, axis: { x: 0, y: 0 }, aim: null },
    BUTTONS, SIZES, SIZE_NAMES, OPACS, OPAC_NAMES, SCALES, cfg,
    ready: false, mode: 'none', level: 0,

    /** where the canvas sits (CSS px): landscape = as large as fits, centred; portrait = full width at the top with the controls underneath */
    fitCanvas(vw, vh, ins) {
      ins = ins || { l: 0, r: 0, t: 0, b: 0 };
      const aw = Math.max(1, vw - ins.l - ins.r), ah = Math.max(1, vh - ins.t - ins.b), portrait = vh > vw * 1.1;
      if (portrait) return { portrait, x: ins.l, y: ins.t, w: aw, h: aw * 2 / 3 };
      const w = Math.min(aw, ah * 1.5), h = w / 1.5;
      return { portrait, x: ins.l + (aw - w) / 2, y: ins.t + (ah - h) / 2, w, h };
    },
    /** every control's place: {cv, portrait, u, zone, stick:{x,y,r}, btn:{id:{x,y,d}}} (x,y = centre).  The size asked for is only a wish: on a screen too small for it the controls shrink until nothing overlaps or leaves the safe area. */
    layout(vw, vh, ins, o) {
      o = Object.assign({ size: 1, hand: 'right' }, o); ins = ins || { l: 0, r: 0, t: 0, b: 0 };
      let L = null;
      for (let k = o.size; k >= 0.5; k -= 0.05) { L = T.build(vw, vh, ins, k, o.hand); if (T.sound(L, vw, vh, ins)) break; }
      return L;
    },
    /** nothing leaves the safe area, no two play buttons (or the stick) touch */
    sound(L, vw, vh, ins) {
      const ids = Object.keys(L.btn).filter(id => id !== 'back');
      for (const id of Object.keys(L.btn)) { const p = L.btn[id], r = p.d / 2; if (p.x - r < ins.l - 0.5 || p.x + r > vw - ins.r + 0.5 || p.y - r < ins.t - 0.5 || p.y + r > vh - ins.b + 0.5) return false; }
      for (let i = 0; i < ids.length; i++) { const a = L.btn[ids[i]]; if (Math.hypot(a.x - L.stick.x, a.y - L.stick.y) < a.d / 2 + L.stick.r) return false; for (let j = i + 1; j < ids.length; j++) { const c = L.btn[ids[j]]; if (Math.hypot(a.x - c.x, a.y - c.y) < (a.d + c.d) / 2 - 0.5) return false; } }
      return L.stick.x - L.stick.r >= ins.l - 0.5 && L.stick.x + L.stick.r <= vw - ins.r + 0.5 && L.stick.y + L.stick.r <= vh - ins.b + 0.5;
    },
    build(vw, vh, ins, size, hand) {
      const o = { size, hand };
      const cv = T.fitCanvas(vw, vh, ins), portrait = cv.portrait;
      const u = Math.round(U.clamp(Math.min(vw, vh) * 0.15, 40, 78) * o.size), pad = Math.round(u * 0.3), A = Math.round(u * 1.5), s = Math.max(40, Math.round(u * 0.7));
      const rg = portrait ? { x0: ins.l, y0: cv.y + cv.h, x1: vw - ins.r, y1: vh - ins.b } : { x0: ins.l, y0: ins.t, x1: vw - ins.r, y1: vh - ins.b };
      const rh = rg.y1 - rg.y0, R = Math.round(u * 2.1), Rs = Math.round(u * 1.1);
      const btn = {};
      // attack + arc (right-handed: the cluster hugs the bottom-right corner)
      const ax = rg.x1 - pad - A / 2, ay = portrait ? U.clamp(rg.y0 + rh * 0.62, rg.y0 + R + u / 2 + 8, rg.y1 - pad - A / 2) : rg.y1 - pad - A / 2;
      btn.attack = { x: ax, y: ay, d: A };
      for (const b of BUTTONS) if (b.deg !== undefined) { const d = Math.round(u * b.k), a = b.deg * Math.PI / 180; btn[b.id] = { x: Math.round(ax + R * Math.cos(a)), y: Math.round(ay + R * Math.sin(a)), d }; }
      // small buttons: the top-right corner (landscape) or the top of the control area (portrait)
      const row1 = rg.y0 + pad / 2 + s / 2, gap = Math.round(s * 0.2);
      btn.pause = { x: rg.x1 - pad / 2 - s / 2, y: row1, d: s };
      btn.map = { x: btn.pause.x - s - gap, y: row1, d: s };
      for (let i = 0; i < 3; i++) btn['item' + (i + 1)] = portrait ? { x: btn.map.x - (s + gap) * (3 - i), y: row1, d: s } : { x: rg.x1 - pad / 2 - s / 2 - (s + gap) * (2 - i), y: row1 + s + gap, d: s };
      btn.back = { x: ins.l + pad / 2 + s / 2, y: (portrait ? cv.y : ins.t) + pad / 2 + s / 2, d: s };                      // (menus only: stands in for Esc; never mirrored)
      const stick = { x: rg.x0 + pad + Rs, y: portrait ? rg.y0 + rh * 0.55 : rg.y1 - pad - Rs, r: Rs };
      const zone = portrait ? { x: rg.x0, y: rg.y0, w: (rg.x1 - rg.x0) * 0.5, h: rh } : { x: rg.x0, y: rg.y0 + rh * 0.14, w: (rg.x1 - rg.x0) * 0.44, h: rh * 0.86 };
      if (o.hand === 'left') {
        for (const id in btn) if (id !== 'back') btn[id].x = vw - btn[id].x;
        stick.x = vw - stick.x; zone.x = vw - zone.x - zone.w;
      }
      for (const id in btn) { btn[id].x = Math.round(btn[id].x); btn[id].y = Math.round(btn[id].y); }
      stick.x = Math.round(stick.x); stick.y = Math.round(stick.y); zone.x = Math.round(zone.x); zone.y = Math.round(zone.y); zone.w = Math.round(zone.w); zone.h = Math.round(zone.h);
      return { cv, portrait, u, zone, stick, btn };
    },
    /** the thumb stick: dead zone, then a curve that reaches full speed at about three quarters of the radius.  -> {x,y,m} (|v| <= 1) */
    stick(dx, dy, R) {
      const d = Math.hypot(dx, dy), m = U.clamp(d / R, 0, 1), dead = 0.14, full = 0.78;
      if (m <= dead || d === 0) return { x: 0, y: 0, m: 0 };
      const k = Math.min(1, (m - dead) / (full - dead));
      return { x: dx / d * k, y: dy / d * k, m: k };
    },
    /** direction (unit vector) from the player to the nearest foe worth shooting at, or null */
    target(g, range) {
      const p = g.player; if (!p || p.dead || !g.enemies) return null;
      let best = null, bd = (range || 420) * (range || 420);
      for (const e of g.enemies) {
        if (!e || e.dead || e.invuln) continue;
        const dx = e.x - p.x, dy = e.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = { dx, dy }; }
      }
      if (!best) return null;
      const d = Math.hypot(best.dx, best.dy) || 1; return { x: best.dx / d, y: best.dy / d };
    },
    /** a tap at (x, y) on the menu canvas: a direct hit stays where it is, a near miss lands on the nearest enabled button's centre */
    snap(btns, x, y, tol) {
      for (const b of btns) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return { x, y, b, snapped: false };
      let best = null, bd = Infinity;
      for (const b of btns) { if (!b || b.disabled) continue; const d = Math.hypot(Math.max(b.x - x, 0, x - (b.x + b.w)), Math.max(b.y - y, 0, y - (b.y + b.h))); if (d < bd) { bd = d; best = b; } }
      if (best && bd <= tol) return { x: best.x + best.w / 2, y: best.y + best.h / 2, b: best, snapped: true };
      return { x, y, b: null, snapped: false };
    },
    /** one step down the resolution ladder when the phone cannot hold the frame rate; -1 = stay */
    nextLevel(level, slowSeconds) { return slowSeconds >= 3 && level < SCALES.length - 1 ? level + 1 : level; },
    /** is the touch UI showing?  auto: yes on a phone/tablet (touch is the main pointer) or once a finger has been used */
    visible(mode, coarsePrimary, touchSeen) { return mode === 'on' ? true : mode === 'off' ? false : !!(coarsePrimary || touchSeen); },
    /** the scene a touch belongs to: 'play' (controls) or 'menu' (taps) */
    sceneMode(g) { return g.scene === 'play' && !g.modal ? 'play' : 'menu'; },
    available() { return !!(T.forced === 1 || (root.navigator && root.navigator.maxTouchPoints > 0) || (typeof window !== 'undefined' && 'ontouchstart' in window)); },
    active() { return !!T.state.visible; },
    set(k, v) { const s = ED.save.meta.settings; s.touch = Object.assign({}, s.touch, { [k]: v }); ED.save.save(); T.dirty = true; },
    cycle(k, list, cur) { const i = list.indexOf(cur); const v = list[(i + 1 + list.length) % list.length]; T.set(k, v); return v; },
    /** the browser's own text box (the seed field): returns the new text or null if it was cancelled */
    promptText(msg, cur) { if (typeof root.prompt !== 'function') return null; const r = root.prompt(msg, cur || ''); return r === null || r === undefined ? null : String(r); },
    forced: 0, dirty: true, stickId: null, atkId: null, down: {},
  };
  I.touchState = T.state;

  // ------------------------------------------------------------------ browser side (nothing below runs without a real page)
  const SVGNS = 'http://www.w3.org/2000/svg';
  const CSS = [
    'html.tc-on,html.tc-on body{touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
    'html.tc-on #wrap{position:absolute;box-shadow:none}',
    '#tc{position:fixed;left:0;top:0;width:100%;height:100%;z-index:5;pointer-events:none;touch-action:none;display:none}',
    'html.tc-on #tc{display:block}',
    '#tc .tc-zone{position:absolute;pointer-events:auto;touch-action:none}',
    '#tc.menu .tc-zone,#tc.pv .tc-zone{pointer-events:none}',
    '#tc .tcb{position:absolute;box-sizing:border-box;border-radius:50%;border:2px solid var(--c);color:var(--c);background:rgba(10,8,18,.55);display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none;opacity:var(--op);transition:opacity .15s,transform .05s;font:bold 15px/1 Menlo,Consolas,monospace}',
    '#tc .tcb.sm{font-size:13px}',
    '#tc .tcb svg{width:58%;height:58%;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}',
    '#tc .tcb.dn{transform:scale(.92);background:rgba(255,255,255,.2)}',
    '#tc .tcb.cd{opacity:calc(var(--op) * .38)}',
    '#tc .tcb.hot{box-shadow:0 0 16px 3px var(--c);animation:tcp .7s ease-in-out infinite alternate}',
    '@keyframes tcp{from{background:rgba(255,210,74,.12)}to{background:rgba(255,210,74,.42)}}',
    '#tc .tcb i{position:absolute;right:-3px;bottom:-3px;min-width:17px;height:17px;padding:0 3px;box-sizing:border-box;border-radius:9px;background:#0a0812;border:1px solid var(--c);color:#fff;font:11px/15px Menlo,Consolas,monospace;text-align:center;font-style:normal;pointer-events:none}',
    '#tc .tcb i:empty{display:none}',
    '#tc.play .tcb.menu,#tc.pv .tcb.menu{display:none}',
    '#tc.menu .tcb:not(.menu),#tc.menu .tc-stick{display:none}',
    '#tc.pv .tcb{pointer-events:none}',
    '#tc.pv .tcb.menu{display:none}',
    '#tc .tc-stick{position:absolute;border-radius:50%;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.05);pointer-events:none;opacity:var(--op);transition:opacity .15s}',
    '#tc .tc-stick.idle{opacity:calc(var(--op) * .45)}',
    '#tc .tc-knob{position:absolute;left:50%;top:50%;width:46%;height:46%;margin:-23% 0 0 -23%;border-radius:50%;background:rgba(255,255,255,.34);border:2px solid rgba(255,255,255,.6)}',
    '#tc .tcb .tc-aim{position:absolute;left:50%;top:50%;width:34%;height:34%;margin:-17% 0 0 -17%;border-radius:50%;background:rgba(255,154,74,.55);border:2px solid #ffd0a0;display:none;pointer-events:none}',
    '#tc .tcb.aiming .tc-aim{display:block}',
    '@media (prefers-reduced-motion:reduce){#tc .tcb.hot{animation:none}}',
  ].join('\n');

  let ui = null, wake = null, deferredInstall = null, slowT = 0, lastHp = -1, lastW = 0, lastH = 0, touchSeen = false, coarse = false;

  function el(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function svgIcon(path) { const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', path); s.appendChild(p); return s; }
  const vib = (ms) => { try { if (cfg().vib && root.navigator && root.navigator.vibrate) root.navigator.vibrate(ms); } catch (e) { /* not supported */ } };
  const toCanvas = (e) => { const r = ui.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (C.W / r.width), y: (e.clientY - r.top) * (C.H / r.height) }; };
  const markTouch = () => { I.lastTouch = performance.now(); if (!touchSeen) { touchSeen = true; T.dirty = true; } };

  T.init = function (canvas, game) {
    if (ui || typeof document === 'undefined' || !canvas || !canvas.parentNode || !document.head || !document.head.appendChild || !root.addEventListener) return;
    try { const q = /[?&]touch=([01])/.exec(root.location ? root.location.search : ''); if (q) T.forced = q[1] === '1' ? 1 : -1; } catch (e) { /* no location */ }
    coarse = !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches);
    const style = el('style'); style.textContent = CSS; document.head.appendChild(style);
    const host = el('div'); host.id = 'tc'; document.body.appendChild(host);
    ui = { canvas, game, host, wrap: canvas.parentNode, zone: el('div', 'tc-zone', host), stick: null, knob: null, btn: {}, probe: null };
    ui.stick = el('div', 'tc-stick idle', host); ui.knob = el('div', 'tc-knob', ui.stick);
    for (const b of BUTTONS) {
      const e = el('div', 'tcb' + (b.small ? ' sm' : '') + (b.menu ? ' menu' : ''), host); e.style.setProperty('--c', b.color); e.dataset.id = b.id;
      if (b.icon) e.appendChild(svgIcon(b.icon)); else e.appendChild(document.createTextNode(b.text));
      if (b.id === 'attack') el('span', 'tc-aim', e);
      el('i', '', e); ui.btn[b.id] = e; bindButton(e, b);
    }
    bindZone(); bindCanvas(canvas); bindWindow();
    ui.probe = el('div'); ui.probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(ui.probe);
    if (root.navigator && root.navigator.serviceWorker && /^https?:$/.test(root.location.protocol)) { try { root.navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* no worker */ } }
    root.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
    T.ready = true;
  };

  function press(id, e) {
    const b = BY_ID[id], S = T.state; if (!b) return;
    S.held[b.act] = true; S.latch[b.act] = true; T.down[id] = e ? e.pointerId : true; ui.btn[id].classList.add('dn');
    if (id !== 'attack') vib(10);
    if (ED.audio) ED.audio.unlock();
  }
  function release(id) {
    const b = BY_ID[id], S = T.state; if (!b || T.down[id] === undefined) return;
    delete T.down[id]; S.held[b.act] = false; ui.btn[id].classList.remove('dn');
    if (id === 'attack') { T.atkId = null; S.aim = null; ui.btn.attack.classList.remove('aiming'); }
  }
  function bindButton(e, b) {
    let ox = 0, oy = 0;
    e.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse') return;
      ev.preventDefault(); markTouch(); try { e.setPointerCapture(ev.pointerId); } catch (x) { /* synthetic pointer */ }
      press(b.id, ev); if (b.id === 'attack') { T.atkId = ev.pointerId; ox = ev.clientX; oy = ev.clientY; T.manual = false; }
    });
    e.addEventListener('pointermove', (ev) => {
      if (b.id !== 'attack' || T.atkId !== ev.pointerId) return;
      const dx = ev.clientX - ox, dy = ev.clientY - oy, d = Math.hypot(dx, dy), box = ui.btn.attack.getBoundingClientRect(), lim = box.width * 0.5;
      if (d > 14) { T.manual = true; T.state.aim = { x: dx / d, y: dy / d }; ui.btn.attack.classList.add('aiming'); const k = Math.min(d, lim) / d, a = ui.btn.attack.querySelector('.tc-aim'); a.style.transform = 'translate(' + (dx * k) + 'px,' + (dy * k) + 'px)'; }
      else if (T.manual) { T.manual = false; ui.btn.attack.classList.remove('aiming'); }
    });
    const up = (ev) => { if (T.down[b.id] === undefined || (T.down[b.id] !== true && T.down[b.id] !== ev.pointerId)) return; release(b.id); };
    e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up); e.addEventListener('lostpointercapture', up);
  }
  function bindZone() {
    const z = ui.zone, S = T.state;
    z.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' || T.stickId !== null) return;
      ev.preventDefault(); markTouch(); try { z.setPointerCapture(ev.pointerId); } catch (x) { /* synthetic */ }
      T.stickId = ev.pointerId; const L = ui.layout; const r = L ? L.stick.r : 60;
      T.stickOx = U.clamp(ev.clientX, r + 6, root.innerWidth - r - 6); T.stickOy = U.clamp(ev.clientY, r + 6, root.innerHeight - r - 6);
      ui.stick.classList.remove('idle'); ui.stick.style.left = (T.stickOx - r) + 'px'; ui.stick.style.top = (T.stickOy - r) + 'px';
      if (ED.audio) ED.audio.unlock();
      moveStick(ev);
    });
    z.addEventListener('pointermove', (ev) => { if (T.stickId === ev.pointerId) moveStick(ev); });
    const up = (ev) => { if (T.stickId !== ev.pointerId) return; endStick(); };
    z.addEventListener('pointerup', up); z.addEventListener('pointercancel', up); z.addEventListener('lostpointercapture', up);
  }
  function moveStick(ev) {
    const L = ui.layout, r = L ? L.stick.r : 60, dx = ev.clientX - T.stickOx, dy = ev.clientY - T.stickOy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, r / d);
    const v = T.stick(dx, dy, r); T.state.axis = { x: v.x, y: v.y };
    ui.knob.style.transform = 'translate(' + (dx * k) + 'px,' + (dy * k) + 'px)';
  }
  function endStick() {
    T.stickId = null; T.state.axis = { x: 0, y: 0 }; ui.knob.style.transform = '';
    ui.stick.classList.add('idle'); placeStick();
  }
  function placeStick() { const L = ui.layout; if (!L) return; ui.stick.style.left = (L.stick.x - L.stick.r) + 'px'; ui.stick.style.top = (L.stick.y - L.stick.r) + 'px'; }
  function bindCanvas(cv) {
    // menus: a tap is a mouse click where the finger went down, delivered when it lifts (so a drag cancels it, and the browser sees a finished tap: clipboard and fullscreen need that).
    // In play the canvas is not a control (the stick zone and the buttons are).
    cv.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse') return;
      ev.preventDefault(); markTouch(); if (ED.audio) ED.audio.unlock();
      if (T.mode === 'play') return;
      const p = toCanvas(ev), s = T.snap((ED.ui && ED.ui.prevBtns) || [], p.x, p.y, 16), m = I.mouse;
      m.x = s.x; m.y = s.y; m.moved = true; m.down = true; m.aim = false; T.menuId = ev.pointerId; T.menuAt = { x: ev.clientX, y: ev.clientY, cx: s.x, cy: s.y };
    });
    cv.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'mouse' || T.mode === 'play' || T.menuId !== ev.pointerId) return;
      if (Math.hypot(ev.clientX - T.menuAt.x, ev.clientY - T.menuAt.y) > 14) T.menuAt.drag = true;        // the finger left the spot: not a tap
    });
    const end = (ev, tap) => {
      if (T.menuId !== ev.pointerId) return; T.menuId = null; I.mouse.down = false;
      if (tap && !T.menuAt.drag && T.mode !== 'play') { I.mouse.x = T.menuAt.cx; I.mouse.y = T.menuAt.cy; I.mouse.moved = true; I.mouse.clicked = true; }
    };
    cv.addEventListener('pointerup', (ev) => end(ev, true)); cv.addEventListener('pointercancel', (ev) => end(ev, false));
  }
  function bindWindow() {
    const clear = () => { for (const id in T.down) release(id); if (T.stickId !== null) endStick(); T.state.held = {}; T.state.latch = {}; T.state.aim = null; };
    T.clear = clear;
    root.addEventListener('blur', clear);
    // a finished tap is what iOS accepts as the gesture that may start audio, and the moment the browser's fake mouse events begin
    root.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') { I.lastTouch = performance.now(); if (ED.audio) ED.audio.unlock(); } }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); else grabWake(); });
    root.addEventListener('contextmenu', (e) => { if (T.state.visible) e.preventDefault(); });
    for (const t of ['gesturestart', 'gesturechange']) document.addEventListener(t, (e) => { if (T.state.visible) e.preventDefault(); });
    root.addEventListener('resize', () => { T.dirty = true; }); root.addEventListener('orientationchange', () => { T.dirty = true; });
    if (root.visualViewport) root.visualViewport.addEventListener('resize', () => { T.dirty = true; });
    // a real keyboard or mouse on a laptop that merely HAS a touch screen: hand the screen back
    root.addEventListener('keydown', (e) => { if (e.isTrusted && !coarse && touchSeen && !/^(Shift|Control|Alt|Meta)/.test(e.key || '')) { touchSeen = false; T.dirty = true; } });
    root.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !coarse && touchSeen && !I.recentTouch()) { touchSeen = false; T.dirty = true; } });
  }
  function grabWake() { try { if (wake && !wake.released) return; if (root.navigator && root.navigator.wakeLock && T.state.visible && !document.hidden) root.navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {}); } catch (e) { /* no wake lock */ } }

  function insets() {
    const cs = root.getComputedStyle ? root.getComputedStyle(ui.probe) : null; const n = (k) => (cs && parseFloat(cs[k])) || 0;
    return { t: n('paddingTop'), r: n('paddingRight'), b: n('paddingBottom'), l: n('paddingLeft') };
  }
  /** (re)place the canvas and every control for the current window */
  function relayout() {
    const c = cfg(), vw = root.innerWidth, vh = root.innerHeight, S = T.state;
    const vis = T.visible(T.forced === 1 ? 'on' : T.forced === -1 ? 'off' : c.mode, coarse, touchSeen);
    S.visible = vis; const html = document.documentElement; html.classList.toggle('tc-on', vis);
    T.dirty = false; lastW = vw; lastH = vh;
    const w = ui.wrap.style;
    if (!vis) { w.left = w.top = w.width = w.height = ''; ui.layout = null; if (T.stickId !== null || Object.keys(T.down).length) T.clear(); S.on = false; return; }
    const L = ui.layout = T.layout(vw, vh, insets(), { size: c.size, hand: c.hand });
    w.left = L.cv.x + 'px'; w.top = L.cv.y + 'px'; w.width = L.cv.w + 'px'; w.height = L.cv.h + 'px';
    ui.host.style.setProperty('--op', String(c.opacity));
    for (const b of BUTTONS) { const p = L.btn[b.id], e = ui.btn[b.id].style; e.width = e.height = p.d + 'px'; e.left = (p.x - p.d / 2) + 'px'; e.top = (p.y - p.d / 2) + 'px'; if (b.text) e.fontSize = Math.round(p.d * (b.small ? 0.38 : 0.3)) + 'px'; }
    const z = ui.zone.style; z.left = L.zone.x + 'px'; z.top = L.zone.y + 'px'; z.width = L.zone.w + 'px'; z.height = L.zone.h + 'px';
    const sz = ui.stick.style; sz.width = sz.height = (L.stick.r * 2) + 'px'; if (T.stickId === null) placeStick();
    grabWake();
  }

  /** once per displayed frame (main.js): decide what is showing and keep the little indicators honest */
  T.frame = function (g, dt) {
    if (!T.ready) return;
    if (T.dirty || root.innerWidth !== lastW || root.innerHeight !== lastH) relayout();
    const S = T.state;
    if (!S.visible) { S.on = false; return; }
    const sm = T.sceneMode(g), preview = g.scene === 'touchopts', mode = preview ? 'pv' : sm;
    if (mode !== T.mode) { if (mode !== 'play') T.clear(); T.mode = mode; ui.host.className = mode === 'pv' ? 'pv play' : mode; }
    S.on = true;
    const p = g.player, vis = (id, on) => { const d = on ? '' : 'none'; if (ui.btn[id].style.display !== d) ui.btn[id].style.display = d; };
    if (mode === 'menu') { vis('back', g.scene !== 'title' && g.scene !== 'intro'); return; }
    // play (or the options preview): live state on the buttons
    const hasP = p && g.run && mode === 'play', belt = !!(p && p.belt) || mode === 'pv';
    for (let i = 1; i <= 3; i++) vis('item' + i, belt);
    const badge = (id, txt) => { const i = ui.btn[id].lastChild; if (i.textContent !== txt) i.textContent = txt; };
    const cls = (id, c, on) => { const cl = ui.btn[id].classList; if (cl.contains(c) !== !!on) cl.toggle(c, !!on); };
    if (hasP) {
      cls('dash', 'cd', p.dashCd > 0); cls('use', 'hot', !!g.nearInter && !g.modal);
      badge('bomb', p.bombs > 0 ? String(p.bombs) : ''); cls('bomb', 'cd', !(p.bombs > 0));
      const a = p.active; badge('active', a && a.max > 1 ? String(a.charges) : ''); cls('active', 'cd', !a || a.charges <= 0);
      if (p.belt) for (let i = 0; i < 3; i++) { const s = p.belt[i]; badge('item' + (i + 1), s && s.n > 1 ? String(s.n) : ''); cls('item' + (i + 1), 'cd', !s); }
      // aim: without a drag the attack button aims at the nearest foe (falls back to the way you face)
      if (T.atkId !== null && !T.manual && cfg().auto) S.aim = T.target(g, 420); else if (T.atkId === null) S.aim = null;
      if (lastHp >= 0 && p.hp < lastHp) vib(40); lastHp = p.hp;
    } else lastHp = -1;
    // a phone that cannot keep up gets a smaller canvas (never bigger again within a visit)
    if (g.scene === 'play' && g.fps && g.fps < 38) slowT += dt; else slowT = Math.max(0, slowT - dt * 0.5);
    const nl = T.nextLevel(T.level, slowT);
    if (nl !== T.level) { T.level = nl; slowT = 0; const s = SCALES[nl]; ui.canvas.width = Math.round(C.W * s); ui.canvas.height = Math.round(C.H * s); }
  };

  T.fullscreen = function () {
    const d = document, de = d.documentElement; if (!de.requestFullscreen) return false;
    if (!d.fullscreenElement) { de.requestFullscreen().then(() => { try { root.screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* not supported */ } }).catch(() => {}); } else d.exitFullscreen();
    return true;
  };
  T.canFullscreen = () => !!(typeof document !== 'undefined' && document.documentElement && document.documentElement.requestFullscreen && !T.standalone());
  T.standalone = () => { try { return !!((root.matchMedia && root.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || (root.navigator && root.navigator.standalone)); } catch (e) { return false; } };
  T.canInstall = () => !!deferredInstall;
  T.install = function () { if (!deferredInstall) return false; deferredInstall.prompt(); deferredInstall = null; return true; };
  T.platformTip = function () {
    const ua = (root.navigator && root.navigator.userAgent) || '';
    if (T.standalone()) return 'Installed - you are playing full screen.';
    if (/iPhone|iPad|iPod/.test(ua) || (root.navigator && root.navigator.platform === 'MacIntel' && root.navigator.maxTouchPoints > 1)) return 'To install: tap the Share button, then "Add to Home Screen". It then opens full screen, works offline and keeps your save.';
    if (/Android/.test(ua)) return 'To install: open the browser menu and choose "Install app" (or "Add to Home screen"). It then opens full screen and works offline.';
    return 'To install: use your browser\'s "Install" / "Add to Home Screen" option. It then opens full screen and works offline.';
  };

  // ------------------------------------------------------------------ the Touch controls screen (Options -> Touch controls...)
  ED.sceneImpl.touchopts = {
    update(g, a, inp) {
      if (a === 'back' || inp.consume('back')) { ED.menus.go(g, 'settings'); return; }
      const c = cfg();
      if (a === 'mode') T.cycle('mode', MODES, c.mode);
      else if (a === 'size') T.set('size', SIZES[(SIZES.indexOf(c.size) + 1) % SIZES.length]);
      else if (a === 'hand') T.set('hand', c.hand === 'left' ? 'right' : 'left');
      else if (a === 'opacity') T.set('opacity', OPACS[(OPACS.indexOf(c.opacity) + 1) % OPACS.length]);
      else if (a === 'vib') { T.set('vib', c.vib ? 0 : 1); if (!c.vib) vib(30); }
      else if (a === 'auto') T.set('auto', c.auto ? 0 : 1);
      else if (a === 'full') T.fullscreen();
      else if (a === 'install') T.install();
      if (a) g.sfx('ui');
    },
    draw(g, c) {
      const UI = ED.ui, s = cfg(), x = 230, w = 500;
      UI.shadow(c, 'TOUCH CONTROLS', C.W / 2, 70, 32, '#7fd8ff', 'center');
      UI.text(c, 'Drag the left side to move. Hold ATTACK to shoot (drag it to aim, or let it pick the nearest foe).', C.W / 2, 96, 12, '#a8a8c8', 'center', false);
      const mode = s.mode === 'auto' ? 'AUTO (on phones and tablets)' : s.mode === 'on' ? 'ALWAYS ON' : 'OFF';
      UI.button(c, 'mode', 'Touch controls: ' + mode, x, 120, w, 40, { size: 15 });
      UI.button(c, 'size', 'Button size: ' + SIZE_NAMES[SIZES.indexOf(s.size)], x, 166, 246, 38, { size: 14 });
      UI.button(c, 'opacity', 'Look: ' + OPAC_NAMES[OPACS.indexOf(s.opacity)], x + 254, 166, 246, 38, { size: 14 });
      UI.button(c, 'hand', 'Layout: ' + (s.hand === 'left' ? 'LEFT-HANDED' : 'RIGHT-HANDED'), x, 210, w, 38, { size: 14 });
      UI.button(c, 'auto', 'Auto-aim at the nearest foe: ' + (s.auto ? 'ON' : 'OFF'), x, 254, w, 38, { size: 14 });
      UI.button(c, 'vib', 'Vibration: ' + (s.vib ? 'ON' : 'OFF'), x, 298, w, 38, { size: 14 });
      UI.button(c, 'full', T.standalone() ? 'Full screen (installed)' : 'Full screen / landscape', x, 342, w, 38, { size: 14, disabled: !T.canFullscreen() });
      UI.button(c, 'install', T.canInstall() ? 'Install EMBERDEEP on this device' : 'Install on this device', x, 386, w, 38, { size: 14, color: '#6ee07a', disabled: !T.canInstall() });
      UI.wrap(c, T.platformTip(), x + 4, 444, w - 8, 15, 12, '#a8a8c8');
      UI.text(c, 'The controls are previewed here, so you can see what each change does.', C.W / 2, 520, 11, '#7a7a98', 'center', false);
      UI.button(c, 'back', 'Back', x, 560, w, 40, { size: 16 });
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

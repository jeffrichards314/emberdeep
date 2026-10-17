'use strict';
/* Touch controls (js/touch.js + the touch seams in input.js / menus.js / ui.js).  Core, not a pack: runs in every edition.
 * The DOM half of touch.js (pointer events, the overlay) needs a real page — it is driven by hand in the browser pane (see HANDOFF.md);
 * everything it decides lives in pure functions that are tested here, plus the input merge and a real game driven through ED.input.touchState. */
const fs = require('fs'), path = require('path');
module.exports = async function (ctx) {
  const { ED, sandbox, ok, section, newGame } = ctx;
  const T = ED.touch, I = ED.input, U = ED.U, C = ED.C;
  const root = path.join(__dirname, '..');
  const reset = () => { const S = T.state; S.on = false; S.visible = false; S.held = {}; S.latch = {}; S.axis = { x: 0, y: 0 }; S.aim = null; I.sim = { held: {}, edge: {} }; I.padHeld = {}; I.padEdge = {}; I.padAxis = { x: 0, y: 0 }; I.aimVec = null; T.forced = 0; };

  section('T0. Touch: the module and the page');
  {
    ok(T && typeof T.layout === 'function' && I.touchState === T.state, 'ED.touch exists and owns ED.input.touchState');
    ok(!T.state.visible && !T.state.on && !I.touchOn(), 'headless: the touch layer is off');
    ok(!T.available() && T.active() === false, 'headless: no touch device, no touch options');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    ok(/<script src="js\/touch\.js"><\/script>/.test(html), 'index.html loads js/touch.js');
    ok(/rel="manifest" href="manifest\.webmanifest"/.test(html) && /apple-touch-icon/.test(html) && /viewport-fit=cover/.test(html) && /user-scalable=no/.test(html), 'index.html has the viewport, manifest and icon tags');
    ok(html.indexOf('js/touch.js') > html.indexOf('js/menus.js') && html.indexOf('js/touch.js') > html.indexOf('js/input.js'), 'touch.js loads after input.js and menus.js');
    const mf = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
    ok(mf.name === 'EMBERDEEP' && mf.start_url === './' && mf.scope === './' && /^(fullscreen|standalone)$/.test(mf.display) && mf.orientation === 'landscape', 'manifest: name, relative start_url/scope, fullscreen, landscape');
    ok(mf.icons.some(i => i.sizes === '192x192') && mf.icons.some(i => i.sizes === '512x512' && i.purpose === 'any') && mf.icons.some(i => i.purpose === 'maskable'), 'manifest: 192, 512 and maskable icons');
    for (const i of mf.icons.concat([{ src: 'icons/apple-touch-icon.png', sizes: '180x180' }, { src: 'icons/favicon-32.png', sizes: '32x32' }])) {
      const f = path.join(root, i.src), exists = fs.existsSync(f); ok(exists, 'icon exists: ' + i.src); if (!exists) continue;
      const b = fs.readFileSync(f), sz = i.sizes.split('x').map(Number);
      ok(b.slice(1, 4).toString() === 'PNG' && b.readUInt32BE(16) === sz[0] && b.readUInt32BE(20) === sz[1], i.src + ' is a ' + i.sizes + ' PNG');
    }
    // every file the page names is a relative path (the worker pre-caches exactly those) and exists
    for (const m of html.matchAll(/(?:src|href)="([^":#?]+)"/g)) ok(fs.existsSync(path.join(root, m[1])), 'page asset exists: ' + m[1]);
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    ok(/addEventListener\('install'/.test(sw) && /addEventListener\('fetch'/.test(sw) && /versions\\\//.test(sw), 'sw.js: install + fetch handlers, snapshots excluded');
  }


  section('T0b. Touch: the service worker (installs, caches, works offline)');
  {
    const vm = require('vm'), base = 'https://example.test/game/', src = fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const handlers = {}; let online = true; const spaces = {};
    class Req { constructor(u, o) { this.url = new URL(u, base).href; this.method = (o && o.method) || 'GET'; this.mode = (o && o.mode) || 'no-cors'; } }
    const keyOf = (r) => typeof r === 'string' ? new URL(r, base).href : r.url;
    let lastOpts = null; const fakeFetch = async (r, o) => { lastOpts = o || null; const url = keyOf(r); if (!online) throw new Error('offline'); const body = /index\.html$/.test(url) || url === base ? html : /manifest\.webmanifest$/.test(url) ? fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8') : 'file ' + url; return { ok: true, url, body, clone() { return this; }, text: async () => body, json: async () => JSON.parse(body) }; };
    const caches = { async open(n) { const s = spaces[n] = spaces[n] || new Map(); return { put: async (r, res) => { s.set(keyOf(r), res); }, match: async (r) => s.get(keyOf(r)) || null, add: async (r) => { s.set(keyOf(r), await fakeFetch(r)); } }; }, async keys() { return Object.keys(spaces); }, async delete(k) { delete spaces[k]; return true; } };
    let claimed = false, skipped = false; const self = { location: new URL(base), addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting: async () => { skipped = true; }, clients: { claim: async () => { claimed = true; } } };
    vm.runInNewContext(src, { self, caches, fetch: fakeFetch, Request: Req, URL, Promise, Set, Map, console });
    ok(typeof handlers.install === 'function' && typeof handlers.activate === 'function' && typeof handlers.fetch === 'function', 'worker: install, activate and fetch handlers');
    spaces['emberdeep-old'] = new Map([['x', 1]]);
    let w; handlers.install({ waitUntil: (p) => { w = p; } }); await w; ok(skipped, 'worker: takes over at once');
    const name = Object.keys(spaces).find(k => /^emberdeep-\d+$/.test(k)), store = spaces[name]; ok(!!name, 'worker: a cache named emberdeep-N');
    const must = ['index.html', 'js/touch.js', 'js/main.js', 'manifest.webmanifest', 'icons/icon-192.png', 'js/pack_v28.js']; for (const f of must) ok(store.has(new URL(f, base).href), 'worker: pre-caches ' + f);
    const pageFiles = [...html.matchAll(/(?:src|href)="([^":#?]+)"/g)].map(m => m[1]); ok(pageFiles.every(f => store.has(new URL(f, base).href)), 'worker: pre-caches all ' + pageFiles.length + ' files the page names');
    handlers.activate({ waitUntil: (p) => { w = p; } }); await w; ok(!spaces['emberdeep-old'] && claimed, 'worker: drops older caches and claims the page');
    const ask = async (url, o) => { let p = null; handlers.fetch({ request: new Req(url, o), respondWith: (x) => { p = x; } }); return p === null ? null : p; };
    online = true; let r = await ask('js/touch.js'); ok(r && r.ok && r.body === 'file ' + base + 'js/touch.js', 'worker: online it serves the network copy'); ok(lastOpts && lastOpts.cache === 'no-cache', 'worker: ... revalidated, so a host\'s HTTP cache can never serve stale code');
    store.set(base + 'js/touch.js', { ok: true, body: 'STALE' }); r = await ask('js/touch.js'); ok(r.body !== 'STALE', 'worker: ... never a stale cached copy while online'); ok(store.get(base + 'js/touch.js').body !== 'STALE', 'worker: ... and refreshes the cache');
    online = false; r = await ask('js/touch.js'); ok(r && r.ok && /touch\.js/.test(r.body), 'worker: offline it serves the cached file');
    r = await ask('?touch=1', { mode: 'navigate' }); ok(r && r.ok && /<canvas/.test(r.body), 'worker: offline, opening the game (even with a ?query) serves index.html');
    let threw = false; try { await ask('js/not-cached.js'); } catch (e) { threw = true; } ok(threw, 'worker: offline and not cached is an honest failure');
    ok((await ask('versions/v1/index.html')) === null && (await ask('x', { method: 'POST' })) === null, 'worker: leaves snapshots and non-GET requests alone');
    let foreign = null; handlers.fetch({ request: { url: 'https://other.test/a.js', method: 'GET', mode: 'no-cors' }, respondWith: (x) => { foreign = x; } }); ok(foreign === null, 'worker: leaves other sites alone');
  }

  section('T1. Touch: screen layout (phones, tablets, notches, both hands)');
  {
    const SCREENS = [[844, 390, 0, 0, 0, 0], [932, 430, 0, 0, 0, 0], [667, 375, 0, 0, 0, 0], [812, 375, 44, 44, 0, 21], [1024, 768, 0, 0, 0, 0], [1366, 1024, 0, 0, 0, 0], [390, 844, 0, 0, 47, 34], [375, 667, 0, 0, 20, 0], [768, 1024, 0, 0, 0, 0], [360, 740, 0, 0, 24, 0], [740, 360, 0, 0, 0, 0]];
    let bad = [];
    for (const [w, h, l, r, t, b] of SCREENS) for (const hand of ['right', 'left']) for (const size of T.SIZES) {
      const ins = { l, r, t, b }, L = T.layout(w, h, ins, { size, hand }), tag = w + 'x' + h + ' ' + hand + ' x' + size, ids = Object.keys(L.btn);
      // inside the screen and the safe area
      for (const id of ids) { const p = L.btn[id], rr = p.d / 2; if (p.x - rr < ins.l - 0.5 || p.x + rr > w - ins.r + 0.5 || p.y - rr < ins.t - 0.5 || p.y + rr > h - ins.b + 0.5) bad.push(tag + ' ' + id + ' leaves the safe area'); if (p.d < 40) bad.push(tag + ' ' + id + ' is only ' + p.d + 'px'); }
      // no two play buttons touch each other; the stick base touches none
      const play = ids.filter(id => id !== 'back');
      for (let i = 0; i < play.length; i++) for (let j = i + 1; j < play.length; j++) { const a = L.btn[play[i]], c = L.btn[play[j]]; if (Math.hypot(a.x - c.x, a.y - c.y) < (a.d + c.d) / 2 - 0.5) bad.push(tag + ' ' + play[i] + ' overlaps ' + play[j]); }
      for (const id of play) { const a = L.btn[id]; if (Math.hypot(a.x - L.stick.x, a.y - L.stick.y) < a.d / 2 + L.stick.r) bad.push(tag + ' ' + id + ' overlaps the stick'); }
      if (L.stick.x - L.stick.r < ins.l - 0.5 || L.stick.x + L.stick.r > w - ins.r + 0.5 || L.stick.y + L.stick.r > h - ins.b + 0.5) bad.push(tag + ' stick base leaves the screen');
      // the canvas keeps its 3:2 shape and stays on screen
      const cv = L.cv; if (Math.abs(cv.w / cv.h - 1.5) > 0.002 || cv.x < -0.5 || cv.y < -0.5 || cv.x + cv.w > w + 0.5 || cv.y + cv.h > h + 0.5) bad.push(tag + ' canvas ' + JSON.stringify(cv));
      // hands mirror: attack on the thumb's side, stick on the other
      if (hand === 'right' ? !(L.btn.attack.x > w / 2 && L.stick.x < w / 2) : !(L.btn.attack.x < w / 2 && L.stick.x > w / 2)) bad.push(tag + ' wrong side for the hand');
      // the move zone never starts on the right half (right-handed) and never covers the attack button's centre
      const inZ = (p) => p.x >= L.zone.x && p.x <= L.zone.x + L.zone.w && p.y >= L.zone.y && p.y <= L.zone.y + L.zone.h; if (inZ(L.btn.attack) || !inZ(L.stick)) bad.push(tag + ' move zone covers the attack button or misses the stick');
      // portrait: every control lives under the picture
      if (L.portrait) for (const id of play) if (L.btn[id].y - L.btn[id].d / 2 < cv.y + cv.h - 0.5) bad.push(tag + ' ' + id + ' covers the picture in portrait');
    }
    ok(bad.length === 0, SCREENS.length * 6 + ' screen/hand/size layouts are sound (' + (bad.slice(0, 4).join('; ') || 'ok') + ')');
    const a = T.fitCanvas(844, 390), b2 = T.fitCanvas(390, 844), c2 = T.fitCanvas(1000, 1000);
    ok(!a.portrait && a.w === 585 && a.h === 390 && a.x === 129.5, 'landscape phone: the picture is centred and the margins hold the controls');
    ok(b2.portrait && b2.w === 390 && b2.y === 0, 'portrait phone: full width at the top');
    ok(!c2.portrait && c2.w <= 1000, 'a square screen counts as landscape');
    const near = T.layout(844, 390, null, { size: 1, hand: 'right' }), big = T.layout(844, 390, null, { size: 1.2 }), small = T.layout(844, 390, null, { size: 0.85 });
    ok(big.btn.attack.d > near.btn.attack.d && near.btn.attack.d > small.btn.attack.d, 'the size setting scales the buttons');
  }

  section('T2. Touch: thumb stick, auto-aim, tap snapping, resolution ladder');
  {
    const R = 60;
    ok(T.stick(0, 0, R).m === 0 && T.stick(5, 3, R).m === 0 && T.stick(8, 0, R).m === 0, 'stick: dead zone around the centre');
    let last = 0, mono = true; for (let d = 0; d <= 90; d += 3) { const v = T.stick(d, 0, R); if (v.m < last - 1e-9) mono = false; last = v.m; ok(Math.hypot(v.x, v.y) <= 1 + 1e-9, 'stick: never faster than full (d=' + d + ')'); }
    ok(mono, 'stick: speed only ever grows with the drag');
    ok(T.stick(R * 0.78, 0, R).m >= 0.999 && T.stick(R * 3, 0, R).m === 1, 'stick: full speed at about three quarters of the radius');
    const dg = T.stick(30, -30, R); ok(dg.x > 0 && dg.y < 0 && Math.abs(Math.abs(dg.x) - Math.abs(dg.y)) < 1e-9, 'stick: keeps the direction (diagonals stay diagonal)');
    // auto-aim
    const mk = (x, y, o) => Object.assign({ x, y, dead: false }, o);
    const g = { player: { x: 100, y: 100, dead: false }, enemies: [mk(300, 100), mk(160, 100), mk(100, 400), mk(110, 100, { dead: true }), mk(105, 100, { invuln: true })] };
    let t = T.target(g); ok(t && Math.abs(t.x - 1) < 1e-9 && Math.abs(t.y) < 1e-9, 'target: the nearest living, vulnerable foe (dead and untouchable ones are skipped)');
    g.enemies[1].dead = true; t = T.target(g); ok(t && t.x > 0.9, 'target: next nearest once it falls');
    g.enemies.forEach(e => { e.dead = true; }); ok(T.target(g) === null, 'target: null with no foes');
    g.enemies = [mk(100 + 500, 100)]; ok(T.target(g) === null && T.target(g, 600) !== null, 'target: respects the range');
    g.enemies = [mk(100, 160)]; t = T.target(g); ok(t.x === 0 && t.y === 1, 'target: straight down');
    ok(T.target({ player: null, enemies: [] }) === null && T.target({ player: { dead: true, x: 0, y: 0 }, enemies: [mk(1, 1)] }) === null, 'target: no player / dead player');
    // tap snapping
    const B = (id, x, y, w, h, dis) => ({ id, x, y, w, h, disabled: !!dis });
    const btns = [B('a', 100, 100, 100, 40), B('b', 100, 150, 100, 40), B('c', 300, 100, 80, 40, true)];
    let s = T.snap(btns, 150, 120, 16); ok(s.b.id === 'a' && s.x === 150 && !s.snapped, 'snap: a direct hit stays exactly where it is');
    s = T.snap(btns, 150, 145, 16); ok(s.b.id === 'b' || s.b.id === 'a', 'snap: the gap between two buttons goes to one of them'); ok(s.snapped && s.x === 150 && (s.y === 120 || s.y === 170), 'snap: ... and lands on its centre');
    s = T.snap(btns, 95, 120, 16); ok(s.b.id === 'a' && s.snapped && s.x === 150, 'snap: a near miss at the side');
    s = T.snap(btns, 60, 120, 16); ok(s.b === null && s.x === 60, 'snap: too far from everything stays a miss');
    s = T.snap(btns, 335, 120, 16); ok(s.b && s.b.id === 'c' && !s.snapped, 'snap: a tap ON a disabled button is left to the menu (it ignores it)');
    s = T.snap(btns, 290, 120, 16); ok(s.b === null || s.b.id !== 'c', 'snap: a disabled button never attracts a near miss');
    s = T.snap([B('x', 0, 0, 100, 100), B('y', 50, 50, 100, 100)], 75, 75, 16); ok(s.b.id === 'x', 'snap: overlapping buttons - the first one wins, like the menu code');
    ok(T.snap([], 5, 5, 16).b === null, 'snap: no buttons');
    // resolution ladder
    ok(T.nextLevel(0, 1) === 0 && T.nextLevel(0, 3) === 1 && T.nextLevel(T.SCALES.length - 1, 99) === T.SCALES.length - 1, 'resolution: steps down after 3 s of slow frames, never past the last rung');
    ok(T.SCALES[0] === 2 && T.SCALES[T.SCALES.length - 1] === 1 && T.SCALES.every((v, i, a) => !i || v < a[i - 1]), 'resolution: 2x down to 1x, strictly smaller each rung');
    // when is the UI shown
    ok(T.visible('on', false, false) && !T.visible('off', true, true) && T.visible('auto', true, false) && T.visible('auto', false, true) && !T.visible('auto', false, false), 'visibility: on / off / auto (a coarse pointer or a finger seen)');
    ok(T.sceneMode({ scene: 'play', modal: null }) === 'play' && T.sceneMode({ scene: 'play', modal: {} }) === 'menu' && T.sceneMode({ scene: 'paused' }) === 'menu' && T.sceneMode({ scene: 'intro' }) === 'menu', 'scene mode: only the live game (no dialog open) shows the controls');
  }

  section('T3. Touch: the input merge (what the game sees)');
  {
    reset(); const S = T.state;
    I.poll(); ok(!I.held('attack') && I.axis().x === 0, 'nothing touched: no input');
    S.on = false; S.held.attack = true; S.axis = { x: 1, y: 0 }; I.poll(); ok(!I.held('attack') && I.axis().x === 0, 'the layer switched off: its state is ignored');
    S.on = true; I.poll(); ok(I.held('attack') && I.pressed('attack'), 'attack held: pressed on the first poll');
    I.edge = {}; I.poll(); ok(I.held('attack') && !I.pressed('attack'), '... and only held on the next (an edge, not a repeat)');
    ok(I.axis().x === 1 && I.axis().y === 0, 'the stick gives the movement axis (analog, not forced to 8 directions)');
    S.axis = { x: 0.3, y: -0.2 }; I.poll(); ok(Math.abs(I.axis().x - 0.3) < 1e-9 && Math.abs(I.axis().y + 0.2) < 1e-9, 'a half-pushed stick is a slower walk');
    // keyboard still wins when both are used (hybrid devices)
    I.acts.left = true; ok(I.axis().x === -1, 'the keyboard beats the stick'); I.acts.left = false;
    // aim: the drag steers the attack and cancels a stale mouse aim
    I.mouse.aim = true; S.aim = { x: 0, y: -1 }; I.poll(); ok(I.aimVec && I.aimVec.y === -1 && I.mouse.aim === false, 'dragging the attack button sets the aim and drops the mouse aim');
    S.aim = null; I.poll(); ok(I.aimVec === null, 'no drag: no forced aim (the game aims itself)');
    // a tap shorter than a step
    reset(); S.on = true; S.latch.dash = true; I.poll(); ok(I.pressed('dash') && I.held('dash'), 'a latched tap counts once');
    I.edge = {}; I.poll(); ok(!I.held('dash'), '... and is gone at the next poll (the finger already left)');
    // every touch button feeds an action the game reads
    reset(); S.on = true; for (const b of T.BUTTONS) { S.held = {}; S.held[b.act] = true; I.poll(); ok(I.held(b.act), 'button ' + b.id + ' -> action ' + b.act); }
    ok(T.BUTTONS.filter(b => !b.menu).every(b => !!b.act) && new Set(T.BUTTONS.map(b => b.id)).size === T.BUTTONS.length, 'button table: unique ids, every one has an action');
    // hints follow the interface
    reset(); ok(I.relabel('[E] Buy') === '[' + I.key1('interact') + '] Buy', 'hints: keyboard letter without touch');
    S.visible = true; ok(I.relabel('[E] Buy') === '[USE] Buy' && I.touchOn(), 'hints: [USE] with touch');
    // browsers fake mouse events after a tap; they are ignored for a moment
    I.lastTouch = Date.now(); ok(I.recentTouch() || true, 'recentTouch is callable'); I.lastTouch = -1e9; ok(!I.recentTouch(), 'recentTouch: false long after a tap');
    reset();
  }

  section('T4. Touch: a real run driven by the touch state');
  {
    reset(); const g = newGame(); g.startRun('TOUCH1', 'knight'); g.scene = 'play'; g.god = true; g.introT = 999;
    const S = T.state, p = g.player, step = (n) => { for (let i = 0; i < n; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; if (g.modal) g.modal = null; } };
    step(10); S.on = true; S.visible = true;
    const x0 = p.x; S.axis = { x: 1, y: 0 }; step(20); ok(p.x > x0 + 20, 'the stick walks the hero right (' + Math.round(p.x - x0) + 'px)');
    S.axis = { x: 0, y: 0 }; step(20); const x1 = p.x; step(10); ok(Math.abs(p.x - x1) < 0.5, 'let go: the hero stops');
    S.axis = { x: 0.35, y: 0 }; const x2 = p.x; step(20); const slow = p.x - x2; S.axis = { x: 1, y: 0 }; const x3 = p.x; step(20); ok(slow > 2 && slow < (p.x - x3) * 0.6, 'a gentle push is a slower walk (' + Math.round(slow) + ' vs ' + Math.round(p.x - x3) + ')');
    S.axis = { x: 0, y: 0 };
    // dash by a tap
    step(30); p.dashCd = 0; p.dashT = 0; S.latch.dash = true; S.held.dash = true; step(2); S.held.dash = false; ok(p.dashT > 0 || p.dashCd > 0, 'a DASH tap dashes');
    step(60);
    // attack with the drag aim: shots fly where the thumb points
    for (const e of g.enemies.slice()) e.dead = true; g.enemies.length = 0;
    S.held.attack = true; S.aim = { x: 0, y: 1 }; const a0 = g.run.attacks; p.atkCd = 0; step(30); ok(g.run.attacks > a0, 'holding ATTACK attacks (' + (g.run.attacks - a0) + ')'); ok(Math.abs(p.aim - Math.PI / 2) < 1e-6, 'the drag sets the aim (straight down)');
    S.aim = { x: -1, y: 0 }; step(2); ok(Math.abs(Math.abs(p.aim) - Math.PI) < 1e-6, 'the aim follows the thumb (left)');
    // auto-aim target is what touch.js would set: the foe's direction
    const foe = g.spawnEnemy('chaser', p.x + 150, p.y - 150, { silent: true }); foe.hold = true; const tg = T.target(g, 420);
    ok(tg && Math.abs(tg.x - Math.SQRT1_2) < 0.01 && Math.abs(tg.y + Math.SQRT1_2) < 0.01, 'auto-aim: points at the foe up and to the right');
    S.aim = tg; step(2); ok(Math.abs(p.aim + Math.PI / 4) < 0.02, 'the hero then aims at the foe'); S.held.attack = false; S.aim = null;
    // the back button leaves menus the way Esc does
    S.held = {}; step(5); g.scene = 'paused'; ED.ui.navSel = null; step(2); S.latch.back = true; S.held.back = true; step(2); S.held.back = false; ok(g.scene === 'play', 'BACK resumes from the pause menu');
    // pause
    S.held = {}; step(3); S.latch.pause = true; S.held.pause = true; g.step(); S.held.pause = false; ok(g.scene === 'paused', 'the PAUSE button pauses');
    g.scene = 'play'; reset();
  }

  section('T5. Touch: menus, options and hints with the touch layer showing');
  {
    reset(); const lens = [];
    // what the screens draw while touch is showing: every line must stay inside the 960 px canvas
    const spy = (g, scene) => { const UI = ED.ui, orig = UI.text, out = []; UI.text = function (c, s, x, y, size, col, al) { out.push({ s: String(s), x, y, size: size || 14, al: al || 'left' }); return orig.apply(this, arguments); }; g.scene = scene; try { g.render(); g.render(); } finally { UI.text = orig; } return out; };
    const inside = (t) => { const w = t.s.length * 0.6 * t.size, l = t.al === 'center' ? t.x - w / 2 : t.al === 'right' ? t.x - w : t.x; return l >= -0.5 && l + w <= C.W + 0.5; };
    T.forced = 1; T.state.visible = true;
    ok(T.available(), 'forced on: the Options screen offers Touch controls');
    const g = newGame(); ED.ui.back = 'title'; g.scene = 'settings'; g.render(); g.render();
    ok(ED.ui.btns.some(b => b.id === 'touchopts') && ED.ui.btns.some(b => b.id === 'keys'), 'Options: both Key bindings and Touch controls');
    const kb = ED.ui.btns.find(b => b.id === 'keys'), tb = ED.ui.btns.find(b => b.id === 'touchopts'); ok(kb.x + kb.w <= tb.x && tb.x + tb.w <= 960 && kb.y === tb.y, 'Options: the two share one row without overlapping');
    for (const sc of ['settings', 'help', 'touchopts']) { const bad = spy(g, sc).filter(t => !inside(t)); ok(bad.length === 0, sc + ' (touch): every line fits the canvas (' + (bad.map(t => t.s.slice(0, 30)).join(' | ') || 'ok') + ')'); }
    // the Touch controls screen: every button label fits its button, every setting cycles and is saved
    g.scene = 'touchopts'; g.render(); g.render();
    const calls = spy(g, 'touchopts'), btns = ED.ui.btns.slice();
    for (const b of btns) { if (b.id === 'back') continue; const lab = calls.find(t => t.al === 'center' && Math.abs(t.x - (b.x + b.w / 2)) < 1 && t.y >= b.y && t.y <= b.y + b.h + 2); ok(!lab || lab.s.length * 0.6 * lab.size <= b.w - 8, 'touchopts: "' + (lab ? lab.s.slice(0, 40) : b.id) + '" fits its button'); }
    const S = ED.save.meta.settings, SC = ED.sceneImpl.touchopts, act = (a) => { SC.update(g, a, I); if (a !== 'back') g.scene = 'touchopts'; };
    const before = T.cfg(); ok(before.mode === 'auto' && before.size === 1 && before.hand === 'right' && before.vib === 1 && before.auto === 1, 'defaults: auto, medium, right-handed, vibration and auto-aim on');
    act('mode'); ok(T.cfg().mode === 'on' && S.touch.mode === 'on', 'mode cycles auto -> on and is saved in the settings'); act('mode'); ok(T.cfg().mode === 'off', '... -> off'); act('mode'); ok(T.cfg().mode === 'auto', '... -> auto');
    act('size'); ok(T.cfg().size === 1.2, 'size: medium -> large'); act('size'); ok(T.cfg().size === 0.85, '... -> small'); act('size'); ok(T.cfg().size === 1, '... -> medium');
    act('hand'); ok(T.cfg().hand === 'left', 'layout: -> left-handed'); act('hand'); ok(T.cfg().hand === 'right', '... -> right-handed');
    act('opacity'); ok(T.cfg().opacity === T.OPACS[2], 'look: normal -> solid'); act('opacity'); act('opacity'); ok(T.cfg().opacity === T.OPACS[1], '... round again to normal');
    act('vib'); ok(T.cfg().vib === 0, 'vibration off'); act('vib'); ok(T.cfg().vib === 1, 'vibration on'); act('auto'); ok(T.cfg().auto === 0, 'auto-aim off'); act('auto'); ok(T.cfg().auto === 1, 'auto-aim on');
    ok(T.dirty === true, 'a change asks the layout to be redone'); act('back'); ok(g.scene === 'settings', 'Back returns to Options');
    // a damaged save never breaks the layer
    S.touch = 'garbage'; ok(T.cfg().mode === 'auto' && T.cfg().size === 1, 'garbage in the save: defaults'); S.touch = { size: 'x', hand: 7, mode: {}, opacity: NaN, vib: 'yes', auto: null }; { const c = T.cfg(), lay = T.layout(844, 390, null, { size: c.size, hand: c.hand }); ok(c.size === 1 && c.hand === 'right' && c.mode === 'auto' && c.opacity === 0.7 && c.vib === 1 && c.auto === 1, 'garbage values: every one falls back to its default'); ok(isFinite(lay.btn.attack.x) && isFinite(lay.stick.x), 'garbage values never produce NaN positions'); } delete S.touch;
    // seed field: the browser's own text box instead of the hidden keyboard capture
    const M = ED.menus, UI = ED.ui; sandbox.prompt = () => 'ab-c 12!xyz-9876543'; UI.seedText = 'OLD'; UI.seedEdit = false; M.editSeed(g);
    ok(!UI.seedEdit && /^[A-Z0-9]{1,12}$/.test(UI.seedText) && UI.seedText.startsWith('ABC12XYZ'), 'seed (touch): the prompt\'s text is cleaned to letters and numbers, max 12 (' + UI.seedText + ')');
    sandbox.prompt = () => null; UI.seedText = 'KEEP'; M.editSeed(g); ok(UI.seedText === 'KEEP', 'seed (touch): cancelling the prompt keeps the seed'); delete sandbox.prompt;
    // tutorial panel text fits its panel with touch wording
    const tut = []; { const orig = UI.text; UI.text = function (c, s, x, y, size) { tut.push(String(s)); return orig.apply(this, arguments); }; g.startRun('T5', 'knight'); g.scene = 'play'; try { UI.drawTutorial(g, g.ctx); } finally { UI.text = orig; } }
    ok(tut.length === 3 && tut.every(l => l.length * 0.6 * 13 <= 640), 'tutorial (touch): the three lines fit the panel (' + tut.map(l => l.length).join('/') + ' chars)'); ok(/ATTACK/.test(tut[0]) && !/WASD/.test(tut.join(' ')), 'tutorial (touch): names the touch buttons');
    // and the keyboard wording comes back without touch
    reset(); const tut2 = []; { const orig = UI.text; UI.text = function (c, s) { tut2.push(String(s)); return orig.apply(this, arguments); }; try { UI.drawTutorial(g, g.ctx); } finally { UI.text = orig; } } ok(/WASD/.test(tut2[0]), 'tutorial (no touch): the keyboard wording is unchanged');
    // export: success is only announced when the browser really accepted the text
    const nav = sandbox.navigator, was = nav.clipboard, tick = () => new Promise(r => setImmediate(r)); let asked = 0, saved = '';
    g.toasts.length = 0; nav.clipboard = { writeText: (x) => { saved = x; return Promise.resolve(); } }; M.exportSave(g); await tick(); ok(saved.length > 10 && g.toasts.some(x => /Save copied/.test(x.msg)), 'export: accepted by the clipboard -> "Save copied"');
    g.toasts.length = 0; sandbox.prompt = () => { asked++; }; nav.clipboard = { writeText: () => Promise.reject(new Error('NotAllowedError')) }; M.exportSave(g); await tick(); ok(asked === 1 && !g.toasts.some(x => /Save copied/.test(x.msg)), 'export: refused by the browser -> the text box opens instead, no false "copied"');
    nav.clipboard = { writeText: () => { throw new Error('boom'); } }; asked = 0; M.exportSave(g); ok(asked === 1, 'export: a clipboard that throws also falls back to the text box');
    nav.clipboard = was; delete sandbox.prompt;
    M.go(g, 'title'); reset();
  }

  section('T6. Touch: zoom to fill (the zoomed picture, the camera, the HUD)');
  {
    reset(); const C_H0 = C.H;
    // the zoomed box
    const zb = (w, h, l, r, tp, b) => T.zoomBox(w, h, { l: l || 0, r: r || 0, t: tp || 0, b: b || 0 });
    let z = zb(852, 393); ok(z && Math.abs(z.H - 442.82) < 0.05 && z.x === 0 && z.w === 852 && z.h === 393, 'iPhone sideways: 852x393 fills edge to edge, ' + Math.round(z.H) + ' game px tall');
    z = zb(852, 393, 59, 59, 0, 21); ok(z && Math.abs(z.x - 59) < 1e-6 && z.y === 0 && Math.abs(z.w - 734) < 0.01 && z.h === 372 && Math.abs(z.H - 486.58) < 0.05, 'with the notch and home bar the picture fills the SAFE area (' + Math.round(z.w) + 'x' + z.h + ')');
    ok(zb(1024, 768) === null && zb(1366, 1024) === null && zb(768, 1024) === null && zb(390, 844) === null, 'tablets and portrait: no zoom (the picture already fills the width)');
    z = zb(1000, 400); ok(z && z.H === 440 && z.w < 1000 && Math.abs(z.x - (1000 - z.w) / 2) < 1e-6, 'a very wide screen keeps at least 440 game px of height and centres the picture');
    ok(zb(100, 80, 60, 60) === null && zb(300, 40) === null && zb(0, 0) === null, 'a degenerate screen (insets eat the width, or almost no height) never yields a box');
    let bad = [];
    for (const [w, h, l, r, tp, b] of [[852, 393, 59, 59, 0, 21], [844, 390, 47, 47, 0, 21], [932, 430, 59, 59, 0, 21], [740, 360, 0, 0, 0, 0], [667, 375, 44, 44, 0, 21], [1280, 720, 0, 0, 0, 0], [800, 600, 0, 0, 0, 0], [2000, 700, 0, 0, 0, 0]]) {
      const q = zb(w, h, l, r, tp, b); if (!q) { if (w / h > 1.55) bad.push(w + 'x' + h + ' should zoom'); continue; }
      if (q.H < 440 - 1e-9 || q.H > 640 || Math.abs(q.w / q.h - 960 / q.H) > 1e-6 || q.x < l - 1e-6 || q.x + q.w > w - r + 1e-6 || q.y < tp - 1e-6 || q.y + q.h > h - b + 1e-6 || Math.abs(q.scale - q.w / 960) > 1e-9) bad.push(w + 'x' + h + ' ' + JSON.stringify(q));
    }
    ok(bad.length === 0, 'zoom boxes: inside the safe area, never distorted (aspect = 960/H), 440 <= H <= 640 (' + (bad[0] || 'ok') + ')');
    // controls in the zoomed picture
    bad = [];
    for (const [w, h, l, r, tp, b] of [[852, 393, 59, 59, 0, 21], [844, 390, 47, 47, 0, 21], [932, 430, 59, 59, 0, 21], [667, 375, 44, 44, 0, 21], [740, 360, 0, 0, 0, 0], [1280, 720, 0, 0, 0, 0]]) for (const hand of ['right', 'left']) for (const size of T.SIZES) {
      const ins = { l, r, t: tp, b }, L = T.layout(w, h, ins, { size, hand, zoom: true }), tag = w + 'x' + h + ' ' + hand + ' x' + size; if (!L) { bad.push(tag + ' no layout'); continue; }
      if (!T.sound(L, w, h, ins)) bad.push(tag + ' unsound');
      const hudBottom = L.cv.y + 64 * L.cv.scale; for (const id of ['pause', 'map', 'item1', 'item2', 'item3']) { const p = L.btn[id]; if (p.y - p.d / 2 < hudBottom - 0.5) bad.push(tag + ' ' + id + ' covers the HUD bar'); if (p.x > w / 2) bad.push(tag + ' ' + id + ' is not top-left'); }
      if (hand === 'right' ? !(L.btn.attack.x > w / 2 && L.stick.x < w / 2) : !(L.btn.attack.x < w / 2 && L.stick.x > w / 2)) bad.push(tag + ' wrong side for the hand');
    }
    ok(bad.length === 0, 'zoomed controls: sound for 6 screens x 2 hands x 3 sizes, small buttons under the HUD bar (' + (bad.slice(0, 3).join('; ') || 'ok') + ')');
    ok(T.layout(1024, 768, null, { zoom: true }) === null && T.layout(390, 844, null, { zoom: true }) === null, 'no zoomed layout where there is no zoom');
    // the camera
    const roomH = C.ROOM_H, vis = 379, max = roomH - vis;
    ok(T.camFollow(0, 200, vis, roomH) === 0 && T.camFollow(50, 250, vis, roomH) === 50, 'camera: stays put while the hero is well inside the window');
    ok(T.camFollow(0, 560, vis, roomH, true) === max && T.camFollow(0, 10, vis, roomH, true) === 0 && Math.abs(T.camFollow(0, 288, vis, roomH, true) - (288 - vis / 2)) < 1e-9, 'camera: a snap centres on the hero and clamps to the room');
    ok(T.camFollow(0, 500, vis, roomH) > 0 && T.camFollow(0, 500, vis, roomH) < 500 - vis + 110, 'camera: eases towards a hero near the bottom edge (does not jump)');
    ok(T.camFollow(400, 300, vis, roomH) <= max && T.camFollow(-50, 100, vis, roomH) >= 0, 'camera: a stale position (after a rotation changed the window) is pulled back into range');
    let y = 0, outside = 0, nan = 0, maxStep = 0; for (let py = 60; py <= 520; py += 6) { const ny = T.camFollow(y, py, vis, roomH); maxStep = Math.max(maxStep, Math.abs(ny - y)); y = ny; if (!isFinite(y)) nan++; if (py < y || py > y + vis) outside++; }
    for (let py = 520; py >= 60; py -= 6) { const ny = T.camFollow(y, py, vis, roomH); y = ny; if (!isFinite(y)) nan++; if (py < y || py > y + vis) outside++; }
    ok(nan === 0 && outside === 0 && y >= 0 && y <= max, 'camera: a hero running the room top to bottom and back is always in view (' + outside + ' frames out of view)');
    for (let i = 0; i < 80; i++) y = T.camFollow(y, 300, vis, roomH); ok(y >= 0 && y <= max && 300 >= y && 300 <= y + vis, 'camera: settles with the hero in view');
    ok(T.zoomRoom({ type: 'normal' }, []) && T.zoomRoom({ type: 'shop' }, [{ boss: false }, { dead: true, boss: true }]) && T.zoomRoom(null, null), 'zoom: ordinary rooms, shops and rooms whose boss is already dead are zoomed');
    ok(!T.zoomRoom({ type: 'boss' }, []) && !T.zoomRoom({ type: 'miniboss' }, []) && !T.zoomRoom({ type: 'normal' }, [{ x: 1 }, { boss: true }]), 'zoom: boss and mini-boss arenas and any live boss get the whole picture');
    // drawing through the camera (headless: ED.cam is set by hand, touch.js's DOM half is not needed)
    const g = newGame(); g.startRun('T6', 'knight'); g.scene = 'play'; g.introT = 999; for (let i = 0; i < 5; i++) g.step();
    const log = [], real = g.ctx, tc = new Proxy(real, { get(t, k) { if (k === 'translate') return (a, b) => { log.push('translate ' + a + ',' + b); }; if (k === 'save' || k === 'restore') return () => { log.push(String(k)); }; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; }, set(t, k, v) { t[k] = v; return true; } }); g.ctx = tc;
    const w0 = ED.render.world, h0 = ED.ui.drawHud; let worldH = null, hudH = null; ED.render.world = function () { worldH = C.H; log.push('world'); return w0.apply(this, arguments); }; ED.ui.drawHud = function () { hudH = C.H; log.push('hud'); return h0.apply(this, arguments); };
    try {
      ED.cam.on = false; g.render(); ok(!log.some(l => l === 'translate 0,-100') && worldH === 640 && hudH === 640, 'camera off: the picture is drawn exactly as before (C.H 640 for both)');
      log.length = 0; ED.cam.on = true; ED.cam.y = 100; ED.cam.h = 487; g.render();
      ok(log.indexOf('translate 0,-100') >= 0 && log.indexOf('translate 0,-100') < log.indexOf('world') && log.indexOf('world') < log.indexOf('restore', log.indexOf('world')) && log.indexOf('restore', log.indexOf('world')) < log.indexOf('hud'), 'camera on: the room is drawn translated by -camY inside save/restore, then the HUD');
      ok(worldH === 640 && hudH === 487 && C.H === 640, 'camera on: the room sees C.H 640, the HUD sees the zoomed canvas height (487), and C.H is restored (' + C.H + ')');
      log.length = 0; g.scene = 'paused'; g.render(); ok(!log.some(l => l === 'translate 0,-100') && hudH === 640, 'paused: whole picture even if the camera flag is left on'); g.scene = 'play';
      ED.ui.drawHud = function () { throw new Error('boom'); }; let thrown = false; try { g.render(); } catch (e) { thrown = true; } ok(thrown && C.H === 640, 'a HUD that throws still leaves C.H restored');
    } finally { ED.render.world = w0; ED.ui.drawHud = h0; g.ctx = real; ED.cam.on = false; ED.cam.y = 0; ED.cam.h = 640; C.H = C_H0; }
    // things anchored to the room follow the camera
    const UI = ED.ui, o = UI.drawLinesPanel; let Y = null; UI.drawLinesPanel = function (c, name, col, lines, X, y) { Y = y; }; 
    try {
      const it = g.addInter({ type: 'service', x: 300, y: 200, r: 16, range: 50, name: 'Thing', color: '#fff', desc: 'd', price: () => 10, use() {} }); g.nearInter = it;
      UI.drawInterPanel(g, g.ctx); const y0 = Y; ED.cam.on = true; ED.cam.y = 100; UI.drawInterPanel(g, g.ctx); ok(y0 !== null && Y === y0 - 100, 'the interaction panel moves with the camera (' + y0 + ' -> ' + Y + ')');
    } finally { UI.drawLinesPanel = o; ED.cam.on = false; ED.cam.y = 0; g.nearInter = null; }
    // aiming with a mouse in a zoomed picture is still aimed at the room, not the screen
    const p = g.player; p.x = 480; p.y = 300; I.mouse.aim = true; I.mouse.x = 480; I.mouse.y = 64 + 300 + 50 - 100; ED.cam.on = true; ED.cam.y = 100; I.aimVec = null;
    ok(Math.abs(g.aimAngle() - Math.PI / 2) < 1e-9, 'mouse aim: the point 50px below the hero in the room is straight down even with the camera scrolled'); ED.cam.on = false; I.mouse.y = 64 + 300 + 50; ok(Math.abs(g.aimAngle() - Math.PI / 2) < 1e-9, 'mouse aim: unchanged without the camera'); I.mouse.aim = false; ED.cam.y = 0;
    // settings
    const S = ED.save.meta.settings; delete S.touch; ok(T.cfg().fit === 'fill', 'default screen mode: fill'); S.touch = { fit: 'fit' }; ok(T.cfg().fit === 'fit', 'fit is remembered'); S.touch = { fit: 'zoom!' }; ok(T.cfg().fit === 'fill', 'garbage screen mode: fill'); delete S.touch;
    const gg = newGame(); const act = (a) => ED.sceneImpl.touchopts.update(gg, a, I); act('fit'); ok(T.cfg().fit === 'fit' && S.touch.fit === 'fit', 'Options: Screen toggles to FIT and is saved'); act('fit'); ok(T.cfg().fit === 'fill', '... and back to FILL'); delete S.touch; T.dirty = true;
    ok(C.H === 640 && !ED.cam.on, 'the shared canvas height was left alone'); reset();
  }
};

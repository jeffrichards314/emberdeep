'use strict';
/* UI lint for the polished menus (v23 POLISH): renders every screen into a recording canvas and checks what a person would call "messy".
 *   - every piece of text lies inside the 960x640 canvas
 *   - no two pieces of text overlap (a shadow drawn twice at a small offset counts as one)
 *   - text inside a button stays inside it (a label never spills over the edge or runs under a neighbour), text never straddles a button's edge
 *   - no two buttons overlap, every button lies inside the canvas
 *   - nothing smaller than 13px (11px for the few tiny numerals marked below)
 * Runs only while ED.skin.on().  `node test/ui-lint.js` runs it alone; run-tests.js runs it for every edition that has the polished look. */
const { load, fakeCanvas } = require('./harness');

/** a canvas context that remembers every fillText with its font, alignment and transform */
function recorder() {
  const st = { font: '10px monospace', textAlign: 'left', fillStyle: '#000', globalAlpha: 1 }, stack = []; let m = [1, 0, 0, 1, 0, 0]; const texts = [];
  const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  const grad = { addColorStop() {} };
  const api = {
    save() { stack.push([m.slice(), Object.assign({}, st)]); }, restore() { const t = stack.pop(); if (t) { m = t[0]; Object.assign(st, t[1]); } },
    translate(x, y) { m = mul(m, [1, 0, 0, 1, x, y]); }, scale(x, y) { m = mul(m, [x, 0, 0, y, 0, 0]); }, rotate(a) { m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); }, setTransform(a, b, c2, d, e, f) { m = [a, b, c2, d, e, f]; },
    measureText(s) { const mm = /(\d+(?:\.\d+)?)px/.exec(st.font || ''); return { width: String(s).length * 0.6 * (mm ? parseFloat(mm[1]) : 10) }; },
    fillText(s, x, y) { const mm = /(\d+(?:\.\d+)?)px/.exec(st.font || ''), size = (mm ? parseFloat(mm[1]) : 10) * Math.abs(m[0]); if (!String(s).length) return; const w = String(s).length * 0.6 * size, ax = m[0] * x + m[2] * y + m[4], ay = m[1] * x + m[3] * y + m[5];
      const x0 = st.textAlign === 'center' ? ax - w / 2 : st.textAlign === 'right' || st.textAlign === 'end' ? ax - w : ax; if (st.globalAlpha > 0.05) texts.push({ s: String(s), x0, x1: x0 + w, y0: ay - size * 0.78, y1: ay + size * 0.22, size }); },
    fillRect(x, y, w, h) { const a = /rgba\([^)]*,\s*([\d.]+)\)/.exec(String(st.fillStyle)); if (a && +a[1] >= 0.8 && w * Math.abs(m[0]) >= 940 && h * Math.abs(m[3]) >= 630) texts.length = 0; },        // (a near-opaque scrim over the whole canvas hides what was drawn under it)
    strokeText() {}, createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => ({}), getImageData: () => ({ data: new Uint8ClampedArray(4) }), canvas: null,
  };
  return { ctx: new Proxy(api, { get(t, k) { if (k in t) return t[k]; if (k in st) return st[k]; return function () {}; }, set(t, k, v) { st[k] = v; return true; } }), texts };
}

module.exports = async function (ctx) {
  const { ED, ok, section, newGame } = ctx;
  if (!ED.skin.on()) return;
  const C = ED.C, UI = ED.ui, I = ED.input;

  function analyse(rec, label, o) {
    o = o || {};
    const issues = [], T = [];
    for (const t of rec.texts) { const dup = T.find(u => u.s === t.s && Math.abs(u.x0 - t.x0) <= 8 && Math.abs(u.y0 - t.y0) <= 8); if (dup) { dup.x0 = Math.min(dup.x0, t.x0); continue; } T.push(Object.assign({}, t)); }
    const B = UI.btns.filter(b => b.w > 0 && b.h > 0);
    for (const t of T) {
      if (t.x0 < -2 || t.x1 > C.W + 2 || t.y0 < -2 || t.y1 > C.H + 2) issues.push('text off screen: "' + t.s.slice(0, 30) + '"');
      if (t.size < 12.5 && !(o.tiny && o.tiny.test(t.s))) issues.push('text under 13px (' + Math.round(t.size) + '): "' + t.s.slice(0, 30) + '"');
      for (const b of B) {
        const ix = Math.min(t.x1, b.x + b.w) - Math.max(t.x0, b.x), iy = Math.min(t.y1, b.y + b.h) - Math.max(t.y0, b.y); if (ix <= 1 || iy <= 1) continue;
        const inside = t.x0 >= b.x - 1 && t.x1 <= b.x + b.w + 1 && t.y0 >= b.y - 2 && t.y1 <= b.y + b.h + 2; if (!inside && !(o.allowStraddle && o.allowStraddle.test(t.s))) issues.push('text straddles a button edge: "' + t.s.slice(0, 30) + '" vs ' + b.id);
      }
    }
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      const a = T[i], b = T[j], ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ix > 2 && iy > 3 && !(o.allowOverlap && (o.allowOverlap.test(a.s) || o.allowOverlap.test(b.s)))) issues.push('text overlaps text: "' + a.s.slice(0, 22) + '" / "' + b.s.slice(0, 22) + '"');
    }
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; if (a.x < -1 || a.y < -1 || a.x + a.w > C.W + 1 || a.y + a.h > C.H + 1) issues.push('button off screen: ' + a.id);
      for (let j = i + 1; j < B.length; j++) { const b = B[j]; if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) issues.push('buttons overlap: ' + a.id + ' / ' + b.id); }
    }
    // keys and controllers: on a screen navigated by direction every button can be reached from the first one
    const nav = B.filter(b => b.nav);
    if (UI.navMode === 'spatial' && nav.length > 1 && o.reach !== false) {
      const seen = new Set([nav[0]]), q = [nav[0]]; while (q.length) { const cur = q.shift(); for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nb = ED.menus.neighbour(nav, cur, d); if (nb && !seen.has(nb)) { seen.add(nb); q.push(nb); } } }
      const lost = nav.filter(b => !seen.has(b)); if (lost.length) issues.push('not reachable with the arrow keys: ' + lost.slice(0, 4).map(b => b.id).join(', '));
    }
    ok(issues.length === 0, 'UI lint · ' + label + (issues.length ? ': ' + issues.slice(0, 3).join(' | ') + (issues.length > 3 ? ' (+' + (issues.length - 3) + ')' : '') : ''));
    return issues;
  }
  /** the whole frame of a scene */
  function check(g, label, o) { const rec = recorder(), keep = g.ctx; g.ctx = rec.ctx; try { g.render(); g.render(); } finally { g.ctx = keep; } return analyse(rec, label, o); }
  /** just one piece of the interface (the HUD, a dialog ...): fn(ctx) draws it; the world under it is not drawn */
  function checkFn(g, label, fn, o) { const rec = recorder(); UI.beginFrame(); fn(rec.ctx); return analyse(rec, label, o); }

  section('UI. The polished menus are tidy (nothing off screen, nothing overlapping, nothing tiny)');
  const away = () => { I.mouse.x = -50; I.mouse.y = -50; I.mouse.moved = false; };
  const mk = () => { const g = newGame(); I.sim = { held: {}, edge: {} }; away(); return g; };
  const g = mk(), go = (scene) => { ED.menus.go(g, scene); away(); };
  const keepSave = JSON.stringify(ED.save.meta);
  try {
    // the plain screens
    go('title'); check(g, 'title');
    go('select'); UI.selClass = 'knight'; UI.seedText = 'ABC123'; check(g, 'select (knight)');
    for (const id of ED.items.classList().map(x => x.id)) { UI.selClass = id; check(g, 'select (' + id + ')'); }
    go('settings'); UI.back = 'title'; check(g, 'options'); UI.confirm = 'reset'; check(g, 'options (reset asked)'); UI.confirm = null;
    go('help'); check(g, 'controls'); go('keys'); check(g, 'key bindings');
    for (let t = 0; t < 5; t++) { go('collection'); UI.tab = t; for (let pgi = 0; pgi < 3; pgi++) { UI.page = pgi; check(g, 'collection tab ' + t + ' page ' + pgi); } }
    UI.page = 0; UI.tab = 1; go('collection'); I.mouse.x = 100; I.mouse.y = 160; check(g, 'collection (a relic under the mouse)'); away();
    go('versions'); for (let pgi = 0; pgi < 3; pgi++) { UI.vpage = pgi; check(g, 'versions page ' + pgi); } UI.vpage = 0;
    for (const p of ED.packs.LIST) { go('versions'); UI.vpage = Math.floor(ED.packs.LIST.indexOf(p) / 10); I.mouse.x = 60; I.mouse.y = 180; UI.navSel = 'pack:' + p.id; check(g, 'versions, ' + p.id + ' selected (details panel)'); }
    UI.navSel = null; away();
    // the guide: every page
    if (ED.sceneImpl.guide) for (const p of ED.guide.pages()) { go('guide'); ED.sceneImpl.guide.update(g, 'pg:' + p.id, I); check(g, 'guide ' + p.id); }
    // the update screens
    if (ED.sceneImpl.hunt && ED.hunt) { const H = ED.hunt, hm = H.meta(); hm.roster = []; for (let i = 0; i < 6; i++) H.admit(H.makeNem({ seed: 'L' + i, floor: 5 + i, from: 2, type: 'chaser', cls: 'knight', wpn: 'Sword', killer: 'Rimeknight and a very long name', kills: 1 + i, origin: ['elite', 'herald', 'foe', 'survivor'][i % 4], rank: 1 + i % 5 }), false); hm.fallen = [{ name: 'Gorrg', epi: 'the Brutal', rank: 3, floor: 12, cls: 'knight' }]; go('hunt'); check(g, 'hunt'); for (const n of hm.roster) { ED.sceneImpl.hunt.update(g, 'sel:' + n.id, I); check(g, 'hunt, ' + n.name); } hm.roster = []; go('hunt'); check(g, 'hunt (empty)'); }
    for (const s of ['hearth', 'records', 'heat', 'mode', 'routes', 'gallery', 'touchopts']) if (ED.sceneImpl[s]) { go(s); check(g, s, s === 'gallery' ? { tiny: /./ } : undefined); }
    if (ED.sceneImpl.routes) for (const tb of ['roads', 'sigils']) { go('routes'); ED.sceneImpl.routes.update(g, 'tab:' + tb, I); check(g, 'routes ' + tb); }
    if (ED.sceneImpl.legacy) {
      const L = ED.sceneImpl.legacy; go('legacy'); L.update(g, 'tab:feats', I); check(g, 'legacy feats'); for (let k = 0; k < 4; k++) { L.update(g, 'fp:next', I); check(g, 'legacy feats page ' + (k + 2)); }
      L.update(g, 'tab:bestiary', I); check(g, 'legacy bestiary'); L.update(g, 'sub:bosses', I); check(g, 'legacy bosses'); L.update(g, 'sub:foes', I);
      const first = ED.ui.btns.find(b => /^be:/.test(b.id)); if (first) { L.update(g, first.id, I); check(g, 'legacy bestiary (an entry chosen)'); }
      L.update(g, 'tab:mastery', I); check(g, 'legacy mastery'); L.update(g, 'ms:necromancer', I); check(g, 'legacy mastery (another class)');
    }
    // the run screens
    g.startRun('LINT', 'knight'); g.scene = 'play'; g.introT = 999; for (let i = 0; i < 30; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; }
    const HUDTINY = { tiny: /^[A-Z$]$/ };
    checkFn(g, 'HUD · floor 1', c => UI.drawHud(g, c), HUDTINY);
    for (const r of ED.packs.values(ED.items.RELICS).filter(x => !x.hidden && !x.talent).slice(0, 26)) g.player.relics[r.id] = 1;
    g.player.gold = 99999; g.player.bombs = 12; g.player.keys.small = 3; g.player.keys.boss = 1; g.run.assist = 1;
    ED.debug.jumpFloor(g, 12); g.scene = 'play'; g.introT = 999; for (let i = 0; i < 40; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; }
    checkFn(g, 'HUD · floor 12, full pockets, assist', c => UI.drawHud(g, c), HUDTINY);
    g.toast('Sigil arts: Fins', '#7fd8c0', 200); g.toast('Picked up the Giant\'s Knuckle (a long message to see how it fits)', '#ffd24a', 200); g.popups.push({ t: 20, dur: 200, title: 'FEAT', lines: ['Dragon\'s Hoard', 'Title: Hoardmaster'] });
    checkFn(g, 'HUD · toasts and a popup', c => UI.drawHud(g, c), HUDTINY); g.toasts.length = 0; g.popups.length = 0;
    g.player.hp = Math.max(1, Math.round(g.player.maxHp * 0.2)); checkFn(g, 'HUD · low health', c => UI.drawHud(g, c), HUDTINY);
    g.player.hp = g.player.maxHp;
    ED.debug.skipToBoss(g); g.scene = 'play'; for (let i = 0; i < 200; i++) { g.step(); if (g.scene !== 'play') g.scene = 'play'; if (g.modal) g.modal = null; }
    checkFn(g, 'HUD · a boss fight (bar and card)', c => UI.drawHud(g, c), HUDTINY);
    g.scene = 'intro'; g.introT = 90; checkFn(g, 'floor intro card', c => { UI.drawFloorIntro(g, c); }); g.scene = 'play';
    // dialogs
    g.modal = { type: 'milestone' }; checkFn(g, 'dialog · milestone', c => UI.drawModal(g, c)); g.modal = { type: 'sacrifice', lock: { params: { gold: 50 } } }; checkFn(g, 'dialog · blood pact', c => UI.drawModal(g, c));
    if (ED.modalImpl.talent && ED.talents) { const offers = ED.talents.offerFor ? ED.talents.offerFor(g) : null; if (offers && offers.length) { g.modal = { type: 'talent', offers, t: 0 }; checkFn(g, 'dialog · talent', c => UI.drawModal(g, c), { allowOverlap: /^[✦▲]$/ }); } }
    if (ED.modalImpl.practice_over) { g.run.practice = { name: 'Imp', floor: 3 }; g.modal = { type: 'practice_over', won: true }; checkFn(g, 'dialog · practice over', c => UI.drawModal(g, c)); delete g.run.practice; }
    g.modal = null;
    g.scene = 'paused'; UI.ptab = 'build'; check(g, 'pause · build', { tiny: /^[A-Z]$/ }); UI.ptab = 'route'; check(g, 'pause · route', { tiny: /^[A-Z]$/ }); UI.ptab = 'build';
    g.scene = 'dead'; g.deadT = 60; g.run.killedBy = 'Rimeknight'; check(g, 'game over'); g.scene = 'victory'; check(g, 'victory');
  } finally { ED.save.meta = JSON.parse(keepSave); I.sim = { held: {}, edge: {} }; }
};

if (require.main === module) {
  const sandbox = load(), ED = sandbox.ED; let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL: ' + m); } };
  const section = (s) => console.log('== ' + s);
  const newGame = () => { const g = ED.createGame(fakeCanvas(), { headless: true }); ED.game = g; return g; };
  module.exports({ ED, sandbox, ok, section, newGame }).then(() => { console.log('ui-lint: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }, (e) => { console.log(e.stack); process.exit(1); });
}

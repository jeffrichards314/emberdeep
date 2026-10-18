/* EMBERDEEP — pack_v28.js : v28 "SIGIL ARTS" — every sigil you carry lends a small art, a route overview on the pause screen, and the two v3 lands that had no mini boss of their own get one.
 *
 *  Sigils are permanent marks (v17).  v28 gives each one a small, readable art that never decides a run:
 *    tide FINS · gear CLOCKWORK KNUCKLES · thorn BRIAR-SKIN · ash EMBER EYES · glass GLINT · crown OLD MAPS · obsidian COOLED BLOOD
 *    and six new sigils from the mini bosses of v24-v26:  mask (the Critic) OPENING NIGHT · star (the Stargazer) STARDUST PULL · anchor (the Bosun) SEA LEGS · rook (the Arbiter) OPENING MOVE · scale (the Warden of Weights) PLUMB LINE · graft (the Grafter) GREEN THUMB
 *  The pause screen gains a ROUTE panel (lands visited, doors seen, sigils held — only what you have found).  The Hollow Crypts and the Storm Reach gain a mini boss each (the Sexton, the Stormcaller) and a relic.
 *  Everything is switchable and needs v17 (the sigils); without it the update is harmless.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, I = ED.items, P = ED.packs, W = ED.worlds, K = ED.landkit;
  const TAU = U.TAU, V = 'v28', { L, eyes } = K;
  const relic = K.relic(V), mini = K.mini(V);
  const glow = (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); };
  const R_ = ED.route;

  P.define({
    id: 'v28', name: 'SIGIL ARTS', tag: 'a small art for every sigil', color: '#7fd8c0',
    blurb: 'Every sigil you carry (v17) lends a small art: fins, a dash that breaks cracked walls, eyes for the dark, a map that reaches two doors... Six new sigils come from the mini bosses of the new lands. The pause screen shows your route so far, and the Hollow Crypts and the Storm Reach gain a mini boss of their own.',
  });

  // ==================================================================== the arts
  const ARTS = {
    tide: { name: 'Fins', text: 'Water and mud no longer slow you.' },
    gear: { name: 'Clockwork Knuckles', text: 'A dash into a cracked or secret wall breaks it open.' },
    thorn: { name: 'Briar-skin', text: 'Slowing patches wear off twice as fast.' },
    ash: { name: 'Ember Eyes', text: 'In the dark you see half as far again.' },
    glass: { name: 'Glint', text: 'Secret seams in the walls glint much more often.' },
    crown: { name: 'Old Maps', text: 'Entering a room draws the rooms two doors away on your map.' },
    obsidian: { name: 'Cooled Blood', text: 'Fire and lava hurt you half as much.' },
    mask: { name: 'Opening Night', text: 'Entering a room with foes in it quickens you for four seconds.' },
    star: { name: 'Stardust Pull', text: 'Gold and loose pickups are drawn to you from 40% farther.' },
    anchor: { name: 'Sea Legs', text: 'Slides, drags and gales move you at half strength.' },
    rook: { name: 'Opening Move', text: 'The first dash in every room has no cooldown.' },
    scale: { name: 'Plumb Line', text: 'The knockback of the blows you take is halved.' },
    graft: { name: 'Green Thumb', text: 'Clearing a room mends a quarter heart.' },
  };
  if (R_) {
    const add = (s, glyph) => { R_.addSigil(Object.assign({ pack: V }, s)); R_.GLYPHS.sigil[s.id] = glyph; };
    add({ id: 'mask', name: 'Mask', color: '#ffb0c0', mini: 'critic', gain: 'It smiles whichever way you hold it.', door: 'A smiling mask is carved above the lintel.', rumour: 'a mask that smiles from both sides, left by the Critic' },
      (c, r) => { c.beginPath(); c.ellipse(0, 0, r * 0.62, r * 0.85, 0, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-r * 0.4, -r * 0.2); c.lineTo(-r * 0.12, -r * 0.1); c.moveTo(r * 0.4, -r * 0.2); c.lineTo(r * 0.12, -r * 0.1); c.moveTo(-r * 0.3, r * 0.35); c.quadraticCurveTo(0, r * 0.65, r * 0.3, r * 0.35); c.stroke(); });
    add({ id: 'star', name: 'Star', color: '#cfc0ff', mini: 'stargazer', gain: 'A pinprick of cold light you cannot put out.', door: 'A small star is pricked into the keystone.', rumour: 'a star that fell and did not go out, kept by the Stargazer' },
      (c, r) => { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.stroke(); });
    add({ id: 'anchor', name: 'Anchor', color: '#8ad8e8', mini: 'bosun', gain: 'It pulls toward the floor and holds you there.', door: 'An anchor is cut into the arch, cable and all.', rumour: 'a small anchor, worn by the Bosun' },
      (c, r) => { c.beginPath(); c.arc(0, -r * 0.7, r * 0.18, 0, TAU); c.moveTo(0, -r * 0.52); c.lineTo(0, r * 0.8); c.moveTo(-r * 0.4, -r * 0.2); c.lineTo(r * 0.4, -r * 0.2); c.moveTo(-r * 0.7, r * 0.25); c.quadraticCurveTo(-r * 0.6, r * 0.85, 0, r * 0.8); c.quadraticCurveTo(r * 0.6, r * 0.85, r * 0.7, r * 0.25); c.stroke(); });
    add({ id: 'rook', name: 'Rook', color: '#e0d0a0', mini: 'arbiter', gain: 'A tiny tower, black on one side and white on the other.', door: 'A little tower stands carved in the lintel.', rumour: 'a rook with two colours, held by the Arbiter' },
      (c, r) => { c.beginPath(); c.moveTo(-r * 0.6, r * 0.8); c.lineTo(-r * 0.5, -r * 0.3); c.lineTo(-r * 0.6, -r * 0.3); c.lineTo(-r * 0.6, -r * 0.85); c.lineTo(-r * 0.25, -r * 0.85); c.lineTo(-r * 0.25, -r * 0.6); c.lineTo(r * 0.25, -r * 0.6); c.lineTo(r * 0.25, -r * 0.85); c.lineTo(r * 0.6, -r * 0.85); c.lineTo(r * 0.6, -r * 0.3); c.lineTo(r * 0.5, -r * 0.3); c.lineTo(r * 0.6, r * 0.8); c.closePath(); c.stroke(); });
    add({ id: 'scale', name: 'Scale', color: '#c8ccd8', mini: 'weightwarden', gain: 'One pan is always a little lower than the other.', door: 'A pair of scales hangs above the door, level.', rumour: 'a small brass scale, hung on the Warden of Weights' },
      (c, r) => { c.beginPath(); c.moveTo(0, -r * 0.8); c.lineTo(0, r * 0.8); c.moveTo(-r * 0.8, -r * 0.5); c.lineTo(r * 0.8, -r * 0.5); c.moveTo(-r * 0.4, r * 0.8); c.lineTo(r * 0.4, r * 0.8); c.stroke(); for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * r * 0.8, -r * 0.5); c.lineTo(sg * r * 0.55, r * 0.1); c.lineTo(sg * r * 1.05, r * 0.1); c.closePath(); c.stroke(); } });
    add({ id: 'graft', name: 'Graft', color: '#a8d86a', mini: 'grafter', gain: 'Two kinds of bark, grown into one.', door: 'A twig bearing two kinds of leaf is carved on the arch.', rumour: 'a graft that took, tied up by the Grafter' },
      (c, r) => { c.beginPath(); c.moveTo(0, r * 0.9); c.lineTo(0, -r * 0.1); c.moveTo(0, r * 0.3); c.lineTo(-r * 0.5, -r * 0.2); c.moveTo(0, 0); c.lineTo(r * 0.5, -r * 0.4); c.stroke(); c.beginPath(); c.ellipse(-r * 0.6, -r * 0.35, r * 0.28, r * 0.14, -0.6, 0, TAU); c.ellipse(r * 0.6, -r * 0.55, r * 0.28, r * 0.14, 0.6, 0, TAU); c.ellipse(0, -r * 0.35, r * 0.2, r * 0.32, 0, 0, TAU); c.stroke(); });
    for (const id in ARTS) if (R_.SIG[id]) R_.SIG[id].art = ARTS[id];          // the Sigils tab and the pause screen read the art from the sigil itself
  }
  /** the sigils in your save whose update is on */
  const heldSet = () => { const out = {}; if (!R_ || !P.on(V) || !P.on('v17')) return out; const M = R_.meta(); for (const s of R_.SIGILS) if (M.sigils[s.id] && (!s.pack || P.on(s.pack)) && ARTS[s.id]) out[s.id] = true; return out; };

  // ==================================================================== the arts at work
  ED.hook('tick', V, (g) => {
    const p = g.player; if (!p || !g.run || !g.room || g.scene === 'title') return; const H = heldSet();
    p.lightMul = H.ash ? 1.5 : 1; p.glintMul = H.glass ? 2.4 : 1; p.fireMul = H.obsidian ? 0.5 : 1; p.forceMul = H.anchor ? 0.5 : 1; p.kbMul = H.scale ? 0.5 : 1;
    if (p.dead) return;
    if (H.tide) p.st.waterWalk = 1;
    if (H.thorn && p.slowT > 0) p.slowT = Math.max(0, p.slowT - 1);
    if (H.star && !p.st._star) { p.st.magnet *= 1.4; p.st._star = true; }
    const dashing = p.dashT > 0;
    if (H.gear && dashing) { const room = g.room; for (const d of ED.DIRS) { const e = room.doors[d]; if (!e) continue; const hidden = e.hidden && !e.revealed, bomb = e.lock && e.lock.type === 'bomb' && !e.lock.opened; if (!hidden && !bomb) continue; const dc = ED.rooms.doorCenter(d); if (Math.hypot(dc.x - p.x, dc.y - p.y) < 64) { g.crackWallsNear(p.x, p.y, 48); g.addText(p.x, p.y - 26, 'Clockwork Knuckles', '#e8c060', 11); } } }
    if (H.rook && dashing && !p._dashPrev && g.rt && !g.rt.openingMove) { g.rt.openingMove = true; p.dashCd = 0; g.addText(p.x, p.y - 26, 'OPENING MOVE', '#e0d0a0', 11); }
    p._dashPrev = dashing;
  });
  ED.hook('roomEnter', V, (g, room) => {
    const H = heldSet(), p = g.player; if (!p) return;
    if (H.mask && !room.cleared && g.rt && g.rt.enc) { p.buffT.haste = Math.max(p.buffT.haste || 0, 240); g.addText(p.x, p.y - 26, 'OPENING NIGHT', '#ffb0c0', 11); }
    if (H.crown) {                                                // the rooms within two doors (not through secret walls) are drawn on the map
      const f = g.floor, dist = new Map([[room.id, 0]]), q = [room.id];
      while (q.length) { const a = q.shift(), d = dist.get(a); if (d >= 2) continue; for (const e of f.edges) { if (e.hidden && !e.revealed) continue; const b = e.a === a ? e.b : e.b === a ? e.a : -1; if (b >= 0 && !dist.has(b)) { dist.set(b, d + 1); q.push(b); } } }
      for (const id of dist.keys()) f.rooms[id].discovered = true;
    }
  });
  ED.hook('roomClear', V, (g) => { const H = heldSet(), p = g.player; if (H.graft && p && p.hp < p.maxHp) { g.healPlayer(1, true); g.addText(p.x, p.y - 26, 'Green Thumb', '#a8d86a', 11); } });
  ED.hook('floorStart', V, (g) => { const H = heldSet(), names = Object.keys(H).map(id => ARTS[id].name); if (names.length && g.floorNum === 1) g.toast('Sigil arts: ' + names.slice(0, 5).join(' · ') + (names.length > 5 ? ' · ...' : ''), '#7fd8c0', 200); });

  // ==================================================================== the HUD chips and the route overview
  ED.hook('hud', V, (g, c) => {
    if (g.scene === 'intro' || !R_) return; const list = R_.SIGILS.filter(s => heldSet()[s.id]); if (!list.length) return;
    list.forEach((s, i) => { const x = 20 + i * 19, y = C.H - 16; c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); R_.glyphSigil(c, s.id, x, y, 6.5, s.color); });
  });
  const wname = (id) => id === 'deep' ? 'The Deep Halls' : (W.byId[id] ? W.byId[id].name : id);
  /** what the pause screen's ROUTE panel says: pure in the run and the save */
  function overview(g) {
    const out = { lands: [], doors: [], sigils: [] }; if (!R_ || !g.run) return out; const cr = g.run.cross, M = R_.meta();
    const first = W.worldOfTier(0); out.lands.push(wname(first ? first.id : 'deep')); if (cr) for (const e of cr.log) out.lands.push(wname(e.to));
    const now = W.at(g.floorNum); out.now = now ? now.w.name : 'The Deep Halls';
    if (cr) { const keys = Object.keys(cr.exits).map(Number).sort((a, b) => a - b); const last = keys[keys.length - 1]; if (last !== undefined && cr.exits[last]) for (const ex of cr.exits[last]) { if (ex.id === 'default') continue; const st = R_.gateState(g, ex); if (!st.visible) continue; out.doors.push({ name: M.discovered[ex.world.id] ? ex.world.name : '???', kind: R_.KINDS[ex.gate.kind].name, open: !!st.open }); } }
    for (const s of R_.SIGILS) if (M.sigils[s.id] && (!s.pack || P.on(s.pack))) out.sigils.push({ id: s.id, name: s.name, color: s.color, art: ARTS[s.id] && P.on(V) ? ARTS[s.id] : null });
    return out;
  }
  ED.hook('pauseUI', V, (g, c) => {
    if (!R_ || !g.run || (ED.skin.on() && ED.skin.screens && ED.skin.screens.paused)) return; const u = ED.ui, o = overview(g), x = 90, y = 338, w = 270;
    u.panel(c, x, y, w, 282, '#3a5a58', 0.85); u.text(c, 'ROUTE', x + 12, y + 20, 13, '#7fd8c0');
    let yy = y + 40; const path = o.lands.join('  ›  ');
    yy = u.wrap(c, path, x + 12, yy, w - 24, 13, 10, '#c8e8e0') || yy + 13; yy += 6;
    u.text(c, 'now: ' + o.now, x + 12, yy, 10, '#9ab8b0', 'left', false); yy += 18;
    u.text(c, 'DOORS SEEN', x + 12, yy, 10, '#7fd8c0'); yy += 14;
    if (!o.doors.length) { u.text(c, 'none yet', x + 14, yy, 10, '#6a8a84', 'left', false); yy += 14; }
    for (const d of o.doors.slice(0, 3)) { u.text(c, (d.open ? '· ' : '× ') + d.name + ' — ' + d.kind, x + 14, yy, 10, d.open ? '#a8e8c0' : '#c8a8a0', 'left', false); yy += 14; }
    yy += 6; u.text(c, 'SIGILS (' + o.sigils.length + ')', x + 12, yy, 10, '#7fd8c0'); yy += 14;
    if (!o.sigils.length) u.text(c, 'none yet', x + 14, yy, 10, '#6a8a84', 'left', false);
    const per = 2; o.sigils.slice(0, 10).forEach((s, i) => { const cx = x + 20 + (i % per) * 128, cy = yy + 6 + Math.floor(i / per) * 18; R_.glyphSigil(c, s.id, cx, cy, 6, s.color); u.text(c, s.art ? s.art.name : s.name, cx + 12, cy + 4, 9, s.color, 'left', false); });
  });
  ED.v28 = { ARTS, heldSet, overview };

  // ==================================================================== mini bosses for the Hollow Crypts and the Storm Reach (they only exist while this update is on)
  const sexton = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#2a2420'; c.beginPath(); c.moveTo(x - r * 0.95, y + r); c.lineTo(x - r * 0.5, y - r * 0.4); c.lineTo(x + r * 0.5, y - r * 0.4); c.lineTo(x + r * 0.95, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8e0c8'; c.beginPath(); c.arc(x, y - r * 0.6, r * 0.42, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#10101c'; c.beginPath(); c.arc(x - r * 0.15, y - r * 0.62, r * 0.1, 0, TAU); c.arc(x + r * 0.15, y - r * 0.62, r * 0.1, 0, TAU); c.fill(); c.fillRect(x - r * 0.12, y - r * 0.4, r * 0.24, r * 0.1);
    c.fillStyle = '#3a3030'; c.beginPath(); c.moveTo(x - r * 0.6, y - r * 0.82); c.lineTo(x + r * 0.6, y - r * 0.82); c.lineTo(x + r * 0.4, y - r * 1.1); c.lineTo(x - r * 0.4, y - r * 1.1); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#8a7a5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + r * 0.9, y + r * 0.9); c.lineTo(x + r * 1.1, y - r * 0.4); c.stroke(); c.fillStyle = '#a8a8b0'; c.beginPath(); c.moveTo(x + r * 0.95, y - r * 0.4); c.lineTo(x + r * 1.35, y - r * 0.5); c.lineTo(x + r * 1.2, y - r * 0.05); c.closePath(); c.fill(); c.stroke();
  };
  ED.bossDraw.sexton = sexton;
  mini({ id: 'sexton', name: 'The Sexton', title: 'Who Digs for the Dead', color: '#b8b090', r: 25, hp: 190, arena: 'arena_ruins', shape: 'sexton', minFloor: 6, unlockText: "Sexton's Spade",
    attacks: { spade: L('coneSlash', { arc: 1.7, r: 140, tele: 42, dmg: 1.5, color: '#b8b090' }), bones: L('rain', { n: 8, r: 42, warn: 48, interval: 7, aimed: 0.6, color: '#e8e0c8' }), toll: L('radial', { n: 14, reps: 3, gap: 14, speed: 2.3, rot: 0.2, color: '#b8b090' }), graves: L('summon', { types: ['tombrat', 'gravemoth'], n: 2, max: 4, hpMul: 0.8 }), slam: L('slamRing', { r: 86, tele: 36, rings: 2, speed: 3, color: '#b8b090' }) },
    phases: [{ at: 1, name: 'Digging', attacks: ['spade', 'bones', 'graves'], idle: [34, 56] }, { at: 0.5, name: 'Burying', attacks: ['spade', 'toll', 'bones', 'graves', 'slam'], idle: [24, 44] }] });
  relic('sextonsspade', { id: 'sextonsspade', name: "Sexton's Spade", rarity: 'rare', color: '#b8b090', mods: { gold: 0.15, luck: 1, magnet: 0.2 }, max: 1, unlock: 'mini:sexton', desc: 'Gold from the ground: +15% gold, a stronger magnet, +1 luck. (Unlockable)' });
  const stormcaller = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#4a4a68'; c.beginPath(); c.moveTo(x - r * 0.9, y + r); c.lineTo(x - r * 0.45, y - r * 0.3); c.lineTo(x + r * 0.45, y - r * 0.3); c.lineTo(x + r * 0.9, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#d8d0c0'; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.4, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#ffe14a'; c.beginPath(); c.moveTo(x - r * 0.45, y - r * 0.8); c.lineTo(x, y - r * 1.5); c.lineTo(x + r * 0.45, y - r * 0.8); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#ffe14a'; c.lineWidth = 3; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x + r * 0.9, y - r * 0.9); c.lineTo(x + r * 0.7, y - r * 0.2); c.lineTo(x + r * 1.0, y - r * 0.25); c.lineTo(x + r * 0.8, y + r * 0.5); c.stroke(); glow(c, x + r * 0.85, y - r * 0.2, r * 0.8, '#ffe14a', 0.25 + 0.1 * Math.sin(t * 0.3));
  };
  ED.bossDraw.stormcaller = stormcaller;
  mini({ id: 'stormcaller', name: 'The Stormcaller', title: 'Who Calls the Rain Down', color: '#ffe14a', r: 24, hp: 175, arena: 'arena_open', shape: 'stormcaller', minFloor: 7, unlockText: "Stormcaller's Bell",
    attacks: { bolts: L('rain', { n: 9, r: 40, warn: 46, interval: 7, aimed: 0.8, color: '#ffe14a' }), arc: L('fan', { n: 5, spread: 0.24, reps: 3, gap: 14, speed: 3.2, dmg: 0.9, color: '#ffe14a' }), dive: L('charge', { tele: 40, speed: 10, dmg: 1.4, stun: 30, color: '#ffe14a' }), flock: L('summon', { types: ['stormling', 'thunderroc'], n: 2, max: 4, hpMul: 0.8 }), ring: L('radial', { n: 16, reps: 3, gap: 14, speed: 2.4, rot: 0.2, color: '#ffe14a' }) },
    phases: [{ at: 1, name: 'Clouds Gather', attacks: ['bolts', 'arc', 'flock'], idle: [34, 56] }, { at: 0.5, name: 'Downpour', attacks: ['bolts', 'dive', 'ring', 'arc', 'flock'], idle: [24, 44] }] });
  relic('stormcallersbell', { id: 'stormcallersbell', name: "Stormcaller's Bell", rarity: 'rare', color: '#ffe14a', mods: { chain: 0.1, speed: 0.05, atkSpd: 0.06 }, max: 1, unlock: 'mini:stormcaller', desc: 'Your blows sometimes leap to a second foe, and you are quicker. (Unlockable)' });
  // the two lands pick between their old mini boss and the new one only while v28 is on (off, `minis` does not exist and nothing about the old choice changes)
  for (const [land, extra] of [['crypts', 'sexton'], ['storm', 'stormcaller']]) { const w = W.byId[land]; if (w && !('minis' in w)) { const old = w.mini; Object.defineProperty(w, 'minis', { configurable: true, enumerable: false, get() { return P.on(V) ? [old, extra] : undefined; } }); } }
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* EMBERDEEP — landkit.js : the small toolbox the land packs of v24-v26 share.  Not a pack and not content: helpers only, inert on its own (so any of those packs works without the others).
 *   ED.landkit = { eyes, glow, mk, register, relic, mini, mod, within, dmgOf, L, rootPlayer, pushBody, sweep, bossShape, ... } */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, I = ED.items;
  const TAU = U.TAU;
  const clash = (what, id) => (ED.collisions = ED.collisions || []).push(what + ' ' + id);
  const K = ED.landkit = {
    L: (name, o) => [name, o],
    clash,
    dmgOf: (g, k) => k * g.dif.enemyDmg,
    glow: (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); },
    /** two eyes on the foe's facing side (extras for foes that draw their own face) */
    eyes(c, e, spread) {
      const a = e.face || 0, d = e.r * 0.35, s = Math.max(1.5, e.r * 0.2);
      for (const sg of [-1, 1]) {
        const ex = e.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * sg * e.r * spread, ey = e.y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * sg * e.r * spread;
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, s, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(ex + Math.cos(a) * s * 0.4, ey + Math.sin(a) * s * 0.4, s * 0.5, 0, TAU); c.fill();
      }
    },
    /** foe definition factory: mk('footlights', 'v24')({...}) */
    mk: (world, pack) => (o) => Object.assign({ pack, contact: true, world }, o),
    register(table) { for (const id in table) { if (ED.enemyTypes[id]) clash('foe', id); table[id].id = id; ED.enemyTypes[id] = table[id]; } },
    relic: (pack) => (key, def) => I.addRelic(key, Object.assign({ pack, mods: {} }, def)),
    mini: (pack) => (def) => { if (ED.minibosses.defs[def.id]) clash('mini boss', def.id); ED.minibosses.defs[def.id] = Object.assign({ pack, contact: 4 }, def); },
    mod: (pack) => (def) => { if (ED.mods[def.id]) clash('elite trait', def.id); ED.mods[def.id] = Object.assign({ pack }, def); },
    within: (list, x, y, pad) => list.some(w => Math.hypot(x - w.x, y - w.y) < w.r + (pad || 0)),
    /** a net, a root, a grip: the player cannot walk for `frames` (a dash tears free) */
    rootPlayer(g, frames, color) { const p = g.player; if (p.dead) return; p.rootT = Math.max(p.rootT || 0, frames); if (g.addText) g.addText(p.x, p.y - 26, 'ROOTED', color || '#c8b070', 12); },
    /** shove something along a vector with the usual collision rules (walls stop it) */
    pushBody(g, e, dx, dy) { return ED.phys.move(g, e, dx, dy); },
    /** a cosmetic-safe seeded pick for a room: pure in (seed, label) */
    seeded: (g, label) => new ED.RNG((g.rt && g.room ? g.room.seed : g.run.seed) + ':' + label),
    /** did this enemy projectile die ON the hero (the engine calls `onDie` for a hit, a wall and a timeout alike)? */
    hitPlayer: (g, b) => Math.hypot(b.x - g.player.x, b.y - g.player.y) <= b.r + g.player.hr + 6,
    /** is the player standing in a given disc? */
    inDisc: (g, x, y, r) => Math.hypot(g.player.x - x, g.player.y - y) < r + g.player.hr * 0.5,
  };
  // a net holds until the player dashes (or the clock runs out): one shared rule for every land that roots
  ED.hook('tick', 'v1', (g) => { const p = g.player; if (p && p.rootT > 0 && (p.dashT > 0 || p.dead)) p.rootT = 0; });
  // a hidden elite-style modifier any foe may carry to be hurried by someone else (v24's Prompter, v26's drums): while `e.hasteT` runs it moves and acts faster
  ED.mods.quickened = { id: 'quickened', name: 'Quickened', color: '#ffe070', glyph: '»', hidden: true, desc: '',
    update(e, g) { if (e.hasteT > 0) { e.hasteT -= g.ts; e.spdMul *= e.hasteMul || 1.45; e.rate = e.rate0 * (e.hasteMul || 1.45); } } };
  K.haste = function (e, frames, mul) { if (!e || e.dead || e.boss) return; if (!e.mods.some(m => m.id === 'quickened')) e.mods.push(ED.mods.quickened); e.hasteT = Math.max(e.hasteT || 0, frames); e.hasteMul = mul || 1.45; };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* EMBERDEEP — pack_v14.js : v14 "ARMORY" — four weapons, four different ways to stand in a room.
 *
 *  WHIP         a long thin lash that hits everything along its line; the far third of it cracks for +50% (the spear's tip rule) and every 4th lash cracks again at the tip, staggering.
 *  CROSSBOW     one heavy bolt that pierces three foes, hits hard, shoves hard, and takes its time reloading.
 *  SCEPTER      a fan of five slow homing orbs: weak at range (one or two land), brutal point-blank where all five do.
 *  BLUNDERBUSS  a cone of seven pellets with real knockback: devastating up close, nearly useless far away.
 *  They drop like any other basic weapon (chests, shops, bosses) and have legendary names.  `st.proj` (Echo Shard etc.) adds to each.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v14';

  P.define({
    id: 'v14', name: 'ARMORY', tag: 'four more weapons', color: '#d8a070',
    blurb: 'Four new weapons that drop like any other: a long cracking Whip, a heavy piercing Crossbow, a Scepter that fans five homing orbs and a point-blank Blunderbuss. Each plays differently — close, far, line, cone.',
  });

  Object.assign(I.WEAPONS, {
    whip:        { id: 'whip', name: 'Whip', kind: 'whip', color: '#d8a070', dmg: 4.0, cd: 17, range: 104, kb: 1.2, basic: true, pack: V, desc: 'A long lash through everything in a line. The far third cracks for +50%, and every 4th lash cracks again at the tip.' },
    crossbow:    { id: 'crossbow', name: 'Crossbow', kind: 'crossbow', color: '#b8c4d8', dmg: 12, cd: 44, range: 380, kb: 5, speed: 10, ranged: true, basic: true, pack: V, desc: 'One heavy bolt that pierces three foes. Slow to reload.' },
    scepter:     { id: 'scepter', name: 'Scepter', kind: 'scepter', color: '#ff9ae0', dmg: 2.0, cd: 28, range: 180, kb: 1.5, speed: 3.6, ranged: true, basic: true, pack: V, desc: 'Fans out five slow homing orbs. At range one or two land; point-blank, all five do.' },
    blunderbuss: { id: 'blunderbuss', name: 'Blunderbuss', kind: 'blunderbuss', color: '#c8a070', dmg: 2.2, cd: 38, range: 150, kb: 4.5, speed: 8.5, ranged: true, basic: true, pack: V, desc: 'A cone of seven pellets with heavy knockback. Devastating up close, useless far away.' },
  });
  Object.assign(I.LEGEND_NAMES, {
    whip: ["Serpent's Kiss", 'Stormlash', 'The Long Regret'], crossbow: ['Siege-Breaker', 'Quiet Doom', 'Ironquill'],
    scepter: ['Starfall Regalia', 'Court of Sparks', "Magpie's Wand"], blunderbuss: ['Thunderjaw', "Grandmother's Mouth", 'Brass Apocalypse'],
  });

  const W = ED.weaponImpl;
  W.whip = {
    fire(g, ang, dmg, crit, color) {
      const p = g.player, st = p.st; p.swingN++;
      const n = 1 + Math.min(2, st.proj), len = p.wrange + st.proj * 6;
      for (let k = 0; k < n; k++) g.swings.push({ kind: 'line', t: 0, dur: 8, ang: ang + (k - (n - 1) / 2) * 0.32, len, w: 11, dmg: dmg * (k ? 0.7 : 1), kb: p.wkb, crit, hit: new Set(), color });
      if (p.swingN % 4 === 0) {                                                    // the crack at the tip
        const x = p.x + Math.cos(ang) * len * 0.92, y = p.y + Math.sin(ang) * len * 0.92;
        g.swings.push({ kind: 'circle', t: 0, dur: 7, x, y, r: 34, dmg: dmg * 1.3, kb: p.wkb * 1.6, crit, hit: new Set(), color: '#fff0b0', stagger: true, heavy: true });
        g.ringFx(x, y, 4, 34, '#fff0b0', 10, 3); g.sfx('crack');
      }
      p.kx += Math.cos(ang) * 0.9; p.ky += Math.sin(ang) * 0.9;
    },
    glyph(c, s) { c.beginPath(); c.moveTo(-s * 0.75, s * 0.65); c.bezierCurveTo(-s * 0.3, -s * 0.3, s * 0.3, s * 0.95, s * 0.75, -s * 0.55); c.stroke(); },
    held(c) { c.beginPath(); c.moveTo(6, 2); c.quadraticCurveTo(22, -12, 34, 8); c.stroke(); },
  };
  W.crossbow = {
    fire(g, ang, dmg, crit, color) {
      const p = g.player, st = p.st, base = I.WEAPONS.crossbow, n = 1 + Math.min(2, st.proj);
      for (let k = 0; k < n; k++) g.pShot({ kind: 'arrow', ang: ang + (k - (n - 1) / 2) * 0.1, speed: base.speed, dmg: dmg * (k ? 0.7 : 1), kb: p.wkb, crit, pierce: 2 + st.pierce, life: p.wrange / base.speed, r: 6, color });
      p.kx -= Math.cos(ang) * 1.2; p.ky -= Math.sin(ang) * 1.2; g.shake(1.5); g.sfx('thud', { vol: 0.5 });
    },
    glyph(c, s) { c.fillRect(-s * 0.75, -s * 0.1, s * 1.5, s * 0.2); c.beginPath(); c.arc(s * 0.35, 0, s * 0.7, -1.3, 1.3); c.stroke(); },
    held(c) { c.fillRect(6, -2, 20, 4); c.beginPath(); c.arc(20, 0, 10, -1.3, 1.3); c.stroke(); },
  };
  W.scepter = {
    fire(g, ang, dmg, crit, color) {
      const p = g.player, st = p.st, base = I.WEAPONS.scepter, n = 5 + st.proj;
      for (let k = 0; k < n; k++) g.pShot({ kind: 'orb', ang: ang + (k - (n - 1) / 2) * 0.2, speed: base.speed, dmg, kb: p.wkb, crit, pierce: st.pierce, life: p.wrange / base.speed, r: 6, color, homing: 0.022, aoe: 0 });
      g.sfx('zap', { vol: 0.5 });
    },
    glyph(c, s) { c.fillRect(-s * 0.08, -s * 0.2, s * 0.16, s * 1.1); c.beginPath(); c.arc(0, -s * 0.45, s * 0.38, 0, TAU); c.fill(); },
    held(c) { c.fillRect(4, -1, 22, 2); c.beginPath(); c.arc(28, 0, 5, 0, TAU); c.fill(); },
  };
  W.blunderbuss = {
    fire(g, ang, dmg, crit, color) {
      const p = g.player, st = p.st, base = I.WEAPONS.blunderbuss, n = 7 + st.proj * 2;
      for (let k = 0; k < n; k++) { const a = ang + (g.rng.next() - 0.5) * 0.56, sp = base.speed * (0.85 + g.rng.next() * 0.3); g.pShot({ kind: 'pellet', ang: a, speed: sp, dmg, kb: p.wkb, crit, pierce: st.pierce, life: p.wrange / sp, r: 3.5, color }); }
      p.kx -= Math.cos(ang) * 1.6; p.ky -= Math.sin(ang) * 1.6; g.shake(3); g.sfx('heavy', { vol: 0.7 });
      g.burst(p.x + Math.cos(ang) * 22, p.y + Math.sin(ang) * 22, 7, '#ffd890', 3.5, 10, { dir: ang, spread: 0.5, size: 3 });
    },
    glyph(c, s) { c.beginPath(); c.moveTo(-s * 0.8, -s * 0.1); c.lineTo(s * 0.2, -s * 0.1); c.lineTo(s * 0.8, -s * 0.5); c.lineTo(s * 0.8, s * 0.5); c.lineTo(s * 0.2, s * 0.1); c.lineTo(-s * 0.8, s * 0.1); c.closePath(); c.fill(); },
    held(c) { c.beginPath(); c.moveTo(6, -2); c.lineTo(18, -2); c.lineTo(28, -7); c.lineTo(28, 7); c.lineTo(18, 2); c.lineTo(6, 2); c.closePath(); c.fill(); },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

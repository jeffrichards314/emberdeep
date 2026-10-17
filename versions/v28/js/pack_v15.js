/* EMBERDEEP — pack_v15.js : v15 "MENAGERIE" — four foes that change WHO you hit first.
 *
 *  PILFERER  fast and greedy: touches you, steals gold, and runs.  Kill it before it escapes and the gold comes back with a 25% bonus.
 *  MENDER    keeps its distance and heals the most wounded ally in reach (10% of its health every 1.5s).  Kill it first.
 *  WARDER    keeps its distance and wraps an ally in a ward (35% of its health) every few seconds.  Break the caster, not the shield.
 *  HOPPER    marks the floor where you stand, leaps there and lands with a shockwave — then it is winded and takes 40% more damage.
 *  They join the ordinary spawn pools by floor (3 / 4 / 6 / 5), never as elites, with their own bestiary entries.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, D = ED.D, P = ED.packs, A = ED.ai;
  const TAU = U.TAU, V = 'v15';

  P.define({
    id: 'v15', name: 'MENAGERIE', tag: 'foes that change your priorities', color: '#c87ae0',
    blurb: 'Four new foes: a gold-stealing Pilferer you must catch, a Mender and a Warder that support their friends (kill them first) and a leaping Hopper whose landing you can dodge — and then punish.',
  });

  const eyes = (c, e, spread) => {
    const a = e.face || 0, d = e.r * 0.35, s = Math.max(1.5, e.r * 0.2);
    for (const sg of [-1, 1]) {
      const ex = e.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * sg * e.r * spread, ey = e.y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * sg * e.r * spread;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, s, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(ex + Math.cos(a) * s * 0.4, ey + Math.sin(a) * s * 0.4, s * 0.5, 0, TAU); c.fill();
    }
  };
  const allies = (g, e, r) => g.enemies.filter(x => x !== e && !x.dead && !x.boss && !x.invuln && U.dist2(e.x, e.y, x.x, x.y) < r * r);
  const beam = (g, a, b, col) => g.fx.push({ x: a.x, y: a.y, x2: b.x, y2: b.y, vx: 0, vy: 0, life: 12, max: 12, color: col, shape: 'bolt', drag: 1, grav: 0, size: 2 });
  const foe = (o) => Object.assign({ pack: V, contact: true, noElite: true }, o);

  const ENEMIES = {
    pilferer: foe({ id: 'pilferer', name: 'Pilferer', shape: 'tri', color: '#d8c050', r: 9, hp: 9, speed: 2.0, dmg: 1, cost: 1.4, weight: 4, minFloor: 3,
      desc: 'Fast and greedy. If it touches you it steals your gold and runs; kill it before it escapes and the gold comes back with interest.',
      init(e, g) { e.stolen = 0; e.fleeT = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = e.fleeing ? i.ang + Math.PI : i.ang; const p = g.player;
        if (e.fleeing && e.carriesKey) e.fleeing = false;                                   // a key carrier never runs off: its key would leave with it
        if (e.fleeing) {                                                                    // running with the bag
          e.fleeT += g.ts; e.noContact = true; A.walk(g, e, i.ang + Math.PI + Math.sin(e.t * 0.12) * 0.6, e.speed * 1.5 * e.spdMul);      // straight away from you, sliding along walls: a cornered thief is a caught thief
          if (e.fleeT > 420) { if (e.carriesKey) { g.killEnemy(e, { src: 'flee' }); return; } e.dead = true; e.escaped = true; e.noLoot = true; g.burst(e.x, e.y, 14, '#d8c050', 3, 22); g.toast('A Pilferer got away with ' + e.stolen + ' gold!', '#d8c050', 140); g.sfx('door'); }
          return;
        }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.15 + e.seed) * 0.5);
        if (i.d < e.r + p.hr + 5 && p.gold > 0 && !p.dead && p.inv <= 0 && !e.carriesKey) {
          e.stolen = Math.min(p.gold, 12 + 3 * g.floorNum); p.gold -= e.stolen; e.fleeing = true; g.addText(p.x, p.y - 22, '-' + e.stolen + 'g', '#d8c050', 15); g.sfx('deny'); g.burst(p.x, p.y, 8, '#d8c050', 3, 18);
          g.toast('Thief! Catch the Pilferer before it escapes!', '#d8c050', 150);
        }
      },
      onDeath(e, g) { if (e.stolen && !e.escaped) { g.dropGold(e.x, e.y, Math.round(e.stolen * 1.25)); g.toast('You recovered ' + Math.round(e.stolen * 1.25) + ' gold!', '#ffd24a', 120); } },
      draw(c, e) { eyes(c, e, 0.45); if (e.stolen) { c.fillStyle = '#b8902a'; c.beginPath(); c.arc(e.x, e.y - e.r - 6, 5, 0, TAU); c.fill(); c.strokeStyle = '#4a3a10'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#ffe070'; c.fillRect(e.x - 1, e.y - e.r - 8, 2, 5); } } }),
    mender: foe({ id: 'mender', name: 'Mender', shape: 'circle', color: '#8af0b0', r: 11, hp: 12, speed: 0.9, dmg: 1, cost: 2.0, weight: 3, minFloor: 4,
      desc: 'Keeps its distance and mends the most wounded ally in reach. Kill it first.',
      init(e, g) { e.cd = 70; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; A.kite(g, e, i, 300, e.curSpeed, 0.7);
        if ((e.cd -= g.ts) > 0) return;
        const hurt = allies(g, e, 260).filter(x => x.hp < x.maxHp * 0.85).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (!hurt) { e.cd = 30; return; }
        hurt.hp = Math.min(hurt.maxHp, hurt.hp + hurt.maxHp * 0.1); e.cd = 90 / e.rate; beam(g, e, hurt, '#8af0b0'); g.addText(hurt.x, hurt.y - hurt.r - 6, '+', '#8af0b0', 14); g.burst(hurt.x, hurt.y, 6, '#8af0b0', 2, 16); g.sfx('heal', { vol: 0.35 });
      },
      draw(c, e) { c.fillStyle = '#fff'; c.fillRect(e.x - 1.5, e.y - 6, 3, 12); c.fillRect(e.x - 6, e.y - 1.5, 12, 3); } }),
    warder: foe({ id: 'warder', name: 'Warder', shape: 'hex', color: '#7fb8ff', r: 12, hp: 14, speed: 0.8, dmg: 1, cost: 2.0, weight: 3, minFloor: 6,
      desc: 'Keeps its distance and wraps an ally in a ward that soaks up damage. Break the caster, not the shield.',
      init(e, g) { e.cd = 100; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; A.kite(g, e, i, 290, e.curSpeed, 0.7);
        if ((e.cd -= g.ts) > 0) return;
        const t = allies(g, e, 260).filter(x => !(x.ward > 0)).sort((a, b) => b.maxHp - a.maxHp)[0];
        if (!t) { e.cd = 40; return; }
        t.ward = t.maxHp * 0.35; e.cd = 210 / e.rate; beam(g, e, t, '#7fb8ff'); g.ringFx(t.x, t.y, 6, t.r + 12, '#7fb8ff', 18, 4); g.sfx('block', { vol: 0.4 });
      },
      draw(c, e) { c.strokeStyle = '#e8f4ff'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, e.r * 0.5, 0, TAU); c.stroke(); eyes(c, e, 0.4); } }),
    hopper: foe({ id: 'hopper', name: 'Hopper', shape: 'blob', color: '#c87ae0', r: 13, hp: 18, speed: 1.1, dmg: 3, shot: 3, cost: 1.9, weight: 4, minFloor: 5,
      desc: 'Marks the floor where you stand, leaps there and lands with a shockwave. Dodge the circle, then punish it while it is winded.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'hop') {                                                              // airborne: untouchable, sliding toward the marked spot
          const h = e.hop; h.t += g.ts; const k = Math.min(1, h.t / h.dur);
          e.x = U.lerp(h.sx, h.tx, k); e.y = U.lerp(h.sy, h.ty, k); e.vis = 0.35 + 0.3 * Math.sin(k * Math.PI); e.invuln = true; e.noContact = true;
          if (k >= 1) { e.state = 'winded'; e.windT = 55; e.invuln = false; e.noContact = false; e.vis = 1; e.vuln = 1.4; g.burst(e.x, e.y, 14, '#c87ae0', 4, 22); g.shake(4); g.sfx('thud'); e.hop = null; }
          return;
        }
        if (e.state === 'winded') { e.windT -= g.ts; if (e.windT <= 0) { e.state = null; e.vuln = 1; e.cd = 140 / e.rate; } return; }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.1 + e.seed) * 0.4);
        if ((e.cd -= g.ts) <= 0 && i.d < 280 && i.d > 70) {
          const p = g.player; let t = ED.attacks.clampArena(p.x + (p.vx || 0) * 8, p.y + (p.vy || 0) * 8, 22);
          if (ED.phys.blocked(g, t.x, t.y, 12, false, false)) t = g.findSpot(p.x, p.y, 0, 50, 12);
          const dur = g.tele(46); g.zoneCircle(e, t.x, t.y, 54, dur, e.shotDmg, { color: '#c87ae0', burst: true });
          e.state = 'hop'; e.invuln = true; e.noContact = true; e.hop = { sx: e.x, sy: e.y, tx: t.x, ty: t.y, t: 0, dur }; g.sfx('lunge'); g.burst(e.x, e.y, 8, '#c87ae0', 3, 16);
        } else if (e.cd <= 0) e.cd = 30;
      },
      draw(c, e) { eyes(c, e, 0.5); if (e.state === 'winded') { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('WINDED', e.x, e.y - e.r - 6); } } }),
  };
  for (const id in ENEMIES) { ENEMIES[id].id = id; ED.enemyTypes[id] = ENEMIES[id]; }
  ED.freeFoes = ED.freeFoes || []; for (const id in ENEMIES) ED.freeFoes.push(id);
})(typeof globalThis !== 'undefined' ? globalThis : this);

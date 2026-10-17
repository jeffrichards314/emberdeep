/* EMBERDEEP — attacks.js
 * Reusable boss / mini boss attack primitives.  Each is a generator: `yield n` waits n
 * frames of world time.  Bosses reference them by name + params in their data tables, so a
 * new attack = one line of data.  Every telegraph time goes through g.tele() so deeper
 * floors get faster warnings.  e.sc = {cnt, spd} scales counts / speeds with tier + floor.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T;
  const TAU = U.TAU;
  const B = { x0: 58, y0: 58, x1: 902, y1: 518 };

  const ang = (e, g) => Math.atan2(g.player.y - e.y, g.player.x - e.x);
  const sc = e => e.sc || { cnt: 1, spd: 1 };
  const N = (e, n) => Math.max(1, Math.round(n * sc(e).cnt));
  const rate = e => Math.max(0.5, e.rate || 1);
  function rayLen(x, y, a, pad) {
    const dx = Math.cos(a), dy = Math.sin(a); let t = 1e9; pad = pad || 0;
    if (dx > 1e-6) t = Math.min(t, (B.x1 - pad - x) / dx); else if (dx < -1e-6) t = Math.min(t, (B.x0 + pad - x) / dx);
    if (dy > 1e-6) t = Math.min(t, (B.y1 - pad - y) / dy); else if (dy < -1e-6) t = Math.min(t, (B.y0 + pad - y) / dy);
    return Math.max(0, t);
  }
  function clampArena(x, y, m) { m = m || 0; return { x: U.clamp(x, B.x0 + m, B.x1 - m), y: U.clamp(y, B.y0 + m, B.y1 - m) }; }
  const D = o => (o.dmg === undefined ? 1 : o.dmg);

  const lib = {};

  // ---------------------------------------------------------------- melee style
  /** telegraphed cone swing(s) centred on the boss */
  lib.coneSlash = function* (e, g, o) {
    o = Object.assign({ arc: 1.9, r: 130, tele: 38, dmg: 1.5, times: 1, gap: 14, color: '#ff5a4a', ring: 0, lunge: 0 }, o);
    for (let k = 0; k < o.times; k++) {
      const a = ang(e, g); e.face = a;
      const dur = g.tele(o.tele);
      g.zoneCone(e, e.x, e.y, a, o.arc, o.r + e.r, dur, e.shotDmg * o.dmg, { color: o.color, follow: true, big: true });
      g.sfx('telegraph');
      yield dur;
      if (o.lunge) U.rnd; g.burst(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, 12, o.color, 4, 18, { dir: a, spread: o.arc });
      g.shake(5); g.sfx('thud');
      if (o.ring) g.ringShot(e, N(e, o.ring), 2.6 * sc(e).spd, a, { dmg: 0.6, color: o.color });
      yield o.gap / rate(e);
    }
  };
  /** telegraphed straight charge (boss dashes across the arena, then is briefly exposed) */
  lib.charge = function* (e, g, o) {
    o = Object.assign({ tele: 40, speed: 9, dmg: 1.6, stun: 50, color: '#ff5a4a', width: 1.5, times: 1, ring: 0 }, o);
    for (let k = 0; k < o.times; k++) {
      const a = ang(e, g); e.face = a;
      const len = Math.max(60, rayLen(e.x, e.y, a, e.r * 0.5));
      const dur = g.tele(o.tele);
      g.zoneLine(e, e.x, e.y, e.x + Math.cos(a) * len, e.y + Math.sin(a) * len, e.r * o.width, dur, 0, { color: o.color, follow: true, fx: 0, fy: 0 });
      g.sfx('telegraph');
      yield dur;
      e.state = 'dash'; e.contactMul = o.dmg; g.sfx('lunge');
      let moved = 0; const sp = o.speed * sc(e).spd;
      while (moved < len - 4) {
        const step = Math.min(sp * g.ts, len - moved);
        ED.phys.move(g, e, Math.cos(a) * step, Math.sin(a) * step); moved += step;
        g.trailFx(e.x, e.y, e.color, 0.5); yield 1;
      }
      e.state = null; e.contactMul = 1; g.shake(7); g.sfx('thud');
      if (o.ring) g.ringShot(e, N(e, o.ring), 2.8 * sc(e).spd, a + Math.PI, { dmg: 0.6, color: o.color });
      e.vuln = 1.25; yield o.stun; e.vuln = 1;
    }
  };
  /** leap to where the player is: shadow telegraph then crash with an optional shock ring */
  lib.leap = function* (e, g, o) {
    o = Object.assign({ tele: 46, r: 85, dmg: 1.6, ring: 0, ringSpeed: 3, bullets: 0, times: 1, color: '#ff8a2a' }, o);
    for (let k = 0; k < o.times; k++) {
      const p = g.player;
      const tp = clampArena(p.x + (p.vx || 0) * 10, p.y + (p.vy || 0) * 10, e.r * 0.4);
      const dur = g.tele(o.tele);
      g.zoneCircle(e, tp.x, tp.y, o.r + e.r * 0.3, dur, e.shotDmg * o.dmg, { color: o.color, big: true, burst: true });
      g.sfx('telegraph');
      const pre = Math.max(1, dur - 14);
      yield pre;
      const sx = e.x, sy = e.y;
      for (let i = 1; i <= 14; i++) { const t = i / 14; e.x = U.lerp(sx, tp.x, t); e.y = U.lerp(sy, tp.y, t); e.jump = Math.sin(t * Math.PI) * 60; yield 1; }
      e.jump = 0; g.shake(8); g.sfx('thud');
      if (o.ring) g.shockRing(e, e.x, e.y, o.ringSpeed * sc(e).spd, 24, 620, e.shotDmg * 0.8, { gaps: randomGaps(g, 1, 0.8), color: o.color });
      if (o.bullets) g.ringShot(e, N(e, o.bullets), 2.6 * sc(e).spd, Math.random() * TAU, { dmg: 0.6, color: o.color });
      yield 22 / rate(e);
    }
  };
  function randomGaps(g, n, w) {
    const out = [], a0 = g.rng.next() * TAU;
    for (let i = 0; i < n; i++) out.push({ a: a0 + i * TAU / n, w });
    return out;
  }
  /** ground pound: circle telegraph around the boss then an expanding ring with a safe gap */
  lib.slamRing = function* (e, g, o) {
    o = Object.assign({ tele: 40, r: 110, dmg: 1.4, rings: 1, ringSpacing: 28, speed: 3, gaps: 1, gapW: 0.85, color: '#ffb070', bullets: 0 }, o);
    const dur = g.tele(o.tele);
    g.zoneCircle(e, e.x, e.y, o.r + e.r, dur, e.shotDmg * o.dmg, { color: o.color, follow: true, big: true, burst: true });
    g.sfx('telegraph');
    yield dur;
    g.shake(8); g.sfx('thud');
    const rings = Math.max(1, Math.round(o.rings * (sc(e).cnt > 1.4 ? 1.3 : 1)));
    for (let i = 0; i < rings; i++) {
      g.shockRing(e, e.x, e.y, o.speed * sc(e).spd, 24, 640, e.shotDmg * 0.8, { gaps: randomGaps(g, o.gaps, o.gapW), color: o.color, r0: e.r });
      if (i < rings - 1) yield o.ringSpacing;
    }
    if (o.bullets) g.ringShot(e, N(e, o.bullets), 2.4 * sc(e).spd, Math.random() * TAU, { dmg: 0.6, color: o.color });
    yield 20 / rate(e);
  };
  /** a set of expanding rings, each with a differently placed gap (dash through the gap) */
  lib.hazardRings = function* (e, g, o) {
    o = Object.assign({ n: 4, spacing: 36, speed: 2.5, dmg: 1.0, gapW: 0.95, color: '#ff6a9a', aimed: true }, o);
    const n = N(e, o.n);
    for (let i = 0; i < n; i++) {
      const a = o.aimed && i % 2 === 0 ? ang(e, g) + (g.rng.next() - 0.5) * 0.8 : g.rng.next() * TAU;
      g.shockRing(e, e.x, e.y, o.speed * sc(e).spd, 22, 700, e.shotDmg * o.dmg, { gaps: [{ a, w: o.gapW }], color: o.color, r0: e.r * 0.7 });
      g.sfx('telegraph');
      yield o.spacing / rate(e);
    }
    yield 24;
  };

  // ---------------------------------------------------------------- bullet patterns
  lib.radial = function* (e, g, o) {
    o = Object.assign({ n: 12, reps: 1, gap: 14, speed: 2.5, rot: 0.2, dmg: 0.8, color: '#ffd24a', r: 5, tele: 18, from: null, wave: 0, bounce: 0 }, o);
    const dur = g.tele(o.tele);
    if (dur > 0) { g.zoneCircle(e, e.x, e.y, e.r + 30, dur, 0, { color: o.color, follow: true, hurts: false }); yield dur; }
    let a0 = g.rng.next() * TAU;
    for (let r = 0; r < o.reps; r++) {
      g.ringShot(e, N(e, o.n), o.speed * sc(e).spd, a0, { dmg: o.dmg, color: o.color, r: o.r, wave: o.wave, bounce: o.bounce });
      g.sfx('shoot'); a0 += o.rot; yield o.gap / rate(e);
    }
  };
  lib.fan = function* (e, g, o) {
    o = Object.assign({ n: 5, spread: 0.26, reps: 2, gap: 16, speed: 3, dmg: 0.9, color: '#ffd24a', r: 5, tele: 20, homing: 0, wave: 0, aimLead: 0 }, o);
    for (let r = 0; r < o.reps; r++) {
      const a = ang(e, g); e.face = a;
      if (r === 0) { const dur = g.tele(o.tele); g.zoneLine(e, e.x, e.y, e.x + Math.cos(a) * 160, e.y + Math.sin(a) * 160, 10, dur, 0, { color: o.color, hurts: false, follow: true }); yield dur; }
      const n = N(e, o.n);
      for (let k = 0; k < n; k++) g.eShot(e, a + (k - (n - 1) / 2) * o.spread, o.speed * sc(e).spd, { dmg: o.dmg, color: o.color, r: o.r, homing: o.homing, wave: o.wave });
      g.sfx('shoot'); yield o.gap / rate(e);
    }
  };
  lib.spiral = function* (e, g, o) {
    o = Object.assign({ arms: 3, frames: 90, interval: 4, speed: 2.4, rot: 0.07, dmg: 0.7, color: '#ff80ec', r: 4.5, tele: 24, dir: 1 }, o);
    const dur = g.tele(o.tele); g.zoneCircle(e, e.x, e.y, e.r + 24, dur, 0, { color: o.color, follow: true, hurts: false }); yield dur;
    let a = g.rng.next() * TAU; const arms = N(e, o.arms), dirn = o.dir * (g.rng.chance(0.5) ? 1 : -1);
    for (let f = 0; f < o.frames; f += o.interval) {
      for (let k = 0; k < arms; k++) g.eShot(e, a + k * TAU / arms, o.speed * sc(e).spd, { dmg: o.dmg, color: o.color, r: o.r });
      a += o.rot * o.interval * dirn; if (f % 12 === 0) g.sfx('shoot', { vol: 0.4 });
      yield o.interval / rate(e);
    }
  };
  lib.homing = function* (e, g, o) {
    o = Object.assign({ n: 4, speed: 1.7, dmg: 1.0, color: '#d070ff', r: 7, turn: 0.022, life: 320, tele: 22 }, o);
    const dur = g.tele(o.tele); g.zoneCircle(e, e.x, e.y, e.r + 20, dur, 0, { color: o.color, follow: true, hurts: false }); yield dur;
    const n = N(e, o.n);
    for (let k = 0; k < n; k++) { g.eShot(e, ang(e, g) + (k - (n - 1) / 2) * 0.9, o.speed * sc(e).spd, { dmg: o.dmg, color: o.color, r: o.r, homing: o.turn, life: o.life, kind: 'orb' }); yield 6; }
    yield 30 / rate(e);
  };

  // ---------------------------------------------------------------- area control
  lib.rain = function* (e, g, o) {
    o = Object.assign({ n: 8, interval: 9, r: 46, warn: 50, dmg: 1.3, aimed: 0.45, spread: 260, color: '#ff8a2a', shrapnel: 0 }, o);
    const n = N(e, o.n), p = g.player;
    for (let i = 0; i < n; i++) {
      let x, y;
      if (g.rng.chance(o.aimed)) { x = p.x + (p.vx || 0) * 8; y = p.y + (p.vy || 0) * 8; }
      else { const a = g.rng.next() * TAU, d = g.rng.next() * o.spread; x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d; }
      const c = clampArena(x, y, 20);
      g.bombZone(e, c.x, c.y, o.r, g.tele(o.warn), e.shotDmg * o.dmg, { shrapnel: o.shrapnel, color: o.color });
      yield o.interval / rate(e);
    }
    yield 24;
  };
  lib.clouds = function* (e, g, o) {
    o = Object.assign({ n: 3, r: 62, life: 360, warn: 44, dmg: 0.7, color: '#8ae06a', spread: 190, tick: 28 }, o);
    const n = N(e, o.n), p = g.player;
    for (let i = 0; i < n; i++) {
      const a = g.rng.next() * TAU, d = i === 0 ? 0 : 60 + g.rng.next() * o.spread;
      const c = clampArena(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, o.r * 0.5);
      g.hazardCircle(e, c.x, c.y, o.r, o.life, e.shotDmg * o.dmg, { warn: g.tele(o.warn), tick: o.tick, color: o.color, noInstant: true, slow: true });
      yield 12;
    }
    g.sfx('telegraph'); yield 26;
  };
  /** eruptions along lines fanning from the boss */
  lib.vines = function* (e, g, o) {
    o = Object.assign({ n: 3, spread: 0.55, w: 40, tele: 46, dmg: 1.4, color: '#7ae06a', waves: 1 }, o);
    for (let wv = 0; wv < o.waves; wv++) {
      const n = N(e, o.n), a0 = ang(e, g) + (wv % 2 ? 0.25 : 0);
      for (let k = 0; k < n; k++) {
        const a = a0 + (k - (n - 1) / 2) * o.spread, len = rayLen(e.x, e.y, a, 10);
        g.zoneLine(e, e.x, e.y, e.x + Math.cos(a) * len, e.y + Math.sin(a) * len, o.w, g.tele(o.tele), e.shotDmg * o.dmg, { color: o.color, burst: false, onEnd: (gg, z) => { for (let i = 1; i < 8; i++) gg.burst(z.x + (z.x2 - z.x) * i / 8, z.y + (z.y2 - z.y) * i / 8, 4, o.color, 2.5, 16); gg.shake(3); } });
      }
      g.sfx('telegraph'); yield g.tele(o.tele) + 16;
    }
  };
  /** full-width bars with a single gap each */
  lib.bars = function* (e, g, o) {
    o = Object.assign({ n: 3, thick: 54, gapW: 150, warn: 70, dmg: 1.3, vertical: false, color: '#ff5a7a' }, o);
    const n = N(e, o.n), horizontal = !o.vertical;
    const span = horizontal ? (B.y1 - B.y0) : (B.x1 - B.x0);
    for (let i = 0; i < n; i++) {
      const c = B.y0 + (horizontal ? 0 : 0) + (i + 0.5) * span / n;
      const lenSpan = horizontal ? (B.x1 - B.x0) : (B.y1 - B.y0);
      const gapStart = g.rng.range(0.1, 0.9 - o.gapW / lenSpan) * lenSpan;
      const dur = g.tele(o.warn);
      if (horizontal) {
        g.zoneRect(e, B.x0 - 20, (horizontal ? c : 0) - o.thick / 2, gapStart + 20, o.thick, dur, e.shotDmg * o.dmg, { color: o.color, burst: false });
        g.zoneRect(e, B.x0 + gapStart + o.gapW, c - o.thick / 2, lenSpan - gapStart - o.gapW + 20, o.thick, dur, e.shotDmg * o.dmg, { color: o.color, burst: false });
      } else {
        const x = B.x0 + (i + 0.5) * (B.x1 - B.x0) / n;
        g.zoneRect(e, x - o.thick / 2, B.y0 - 20, o.thick, gapStart + 20, dur, e.shotDmg * o.dmg, { color: o.color, burst: false });
        g.zoneRect(e, x - o.thick / 2, B.y0 + gapStart + o.gapW, o.thick, (B.y1 - B.y0) - gapStart - o.gapW + 20, dur, e.shotDmg * o.dmg, { color: o.color, burst: false });
      }
      yield 6;
    }
    g.sfx('telegraph'); yield g.tele(o.warn) + 14; g.shake(4);
  };
  /** screen-wide blast: only the marked safe circles protect you */
  lib.screenBlast = function* (e, g, o) {
    o = Object.assign({ safe: 3, safeR: 62, warn: 96, dmg: 1.8, color: '#ffffff' }, o);
    const p = g.player, safe = [];
    safe.push(clampArena(p.x + g.rng.range(-110, 110), p.y + g.rng.range(-80, 80), 40));
    for (let i = 1; i < o.safe; i++) safe.push({ x: g.rng.range(B.x0 + 60, B.x1 - 60), y: g.rng.range(B.y0 + 50, B.y1 - 50) });
    for (const s of safe) s.r = o.safeR;
    g.zoneScreen(e, safe, g.tele(o.warn), e.shotDmg * o.dmg, { color: o.color, screenFlash: true, big: true });
    g.toast('TAKE COVER!', '#ffd24a', 80); g.sfx('telegraph');
    yield g.tele(o.warn) + 6; g.shake(10); g.sfx('boom');
    yield 30;
  };
  /** beams that sweep around the boss (or from custom anchors) */
  lib.beams = function* (e, g, o) {
    o = Object.assign({ n: 2, len: 760, w: 26, warn: 46, life: 120, rot: 0.022, dmg: 0.9, color: '#ff4a6a', anchors: null }, o);
    const n = N(e, o.n), a0 = ang(e, g), dirn = g.rng.chance(0.5) ? 1 : -1;
    const anchors = o.anchors ? o.anchors(e, g) : null;
    const zs = [];
    for (let k = 0; k < n; k++) {
      const ak = a0 + k * TAU / n;
      const z = g.zoneLine(e, e.x, e.y, e.x, e.y, o.w, g.tele(o.warn), e.shotDmg * o.dmg, {
        color: o.color, noInstant: true, linger: o.life, tick: 9, beam: true, ang: ak,
        upd(gg, zz) {
          zz.ang += o.rot * dirn * sc(e).spd * gg.ts * (zz.kind === 'tele' ? 0.25 : 1);
          const an = anchors ? anchors[k % anchors.length] : e;
          zz.x = an.x; zz.y = an.y; zz.x2 = zz.x + Math.cos(zz.ang) * o.len; zz.y2 = zz.y + Math.sin(zz.ang) * o.len;
        },
      });
      zs.push(z);
    }
    g.sfx('telegraph'); yield g.tele(o.warn) + o.life + 4;
  };
  // ---------------------------------------------------------------- movement
  lib.blink = function* (e, g, o) {
    o = Object.assign({ where: 'behind', fade: 14, shots: 0, fan: 0, dmg: 0.9, color: '#c8d0ff', ring: 0 }, o);
    const p = g.player;
    for (let i = 0; i < o.fade; i++) { e.vis = 1 - i / o.fade; e.invuln = true; yield 1; }
    e.vis = 0;
    let tx, ty;
    if (o.where === 'behind') { const a = ang(e, g); const c = clampArena(p.x + Math.cos(a) * 110, p.y + Math.sin(a) * 110, e.r * 0.4); tx = c.x; ty = c.y; }
    else if (o.where === 'center') { tx = 480; ty = 288; }
    else { const c = clampArena(g.rng.range(B.x0 + 100, B.x1 - 100), g.rng.range(B.y0 + 80, B.y1 - 80), e.r * 0.4); tx = c.x; ty = c.y; }
    g.zoneRing(e, tx, ty, e.r * 0.9, 18, g.tele(24), 0, { color: o.color, hurts: false });
    yield g.tele(24);
    e.x = tx; e.y = ty;
    for (let i = 0; i < o.fade; i++) { e.vis = i / o.fade; yield 1; }
    e.vis = 1; e.invuln = false; g.burst(e.x, e.y, 16, o.color, 4, 22);
    if (o.fan) { const a = ang(e, g); for (let k = 0; k < N(e, o.fan); k++) g.eShot(e, a + (k - (N(e, o.fan) - 1) / 2) * 0.28, 3.1 * sc(e).spd, { dmg: o.dmg, color: o.color }); g.sfx('shoot'); }
    if (o.ring) g.ringShot(e, N(e, o.ring), 2.6 * sc(e).spd, 0, { dmg: o.dmg * 0.7, color: o.color });
    yield 16 / rate(e);
  };
  lib.moveTo = function* (e, g, o) {
    o = Object.assign({ x: 480, y: 288, frames: 40 }, o);
    const sx = e.x, sy = e.y;
    for (let i = 1; i <= o.frames; i++) { const t = U.easeInOut(i / o.frames); e.x = U.lerp(sx, o.x, t); e.y = U.lerp(sy, o.y, t); yield 1; }
  };
  lib.wait = function* (e, g, o) { yield (o && o.frames || 30) / rate(e); };
  lib.roar = function* (e, g, o) {
    o = Object.assign({ frames: 50, ring: true }, o);
    g.sfx('bossroar'); g.shake(10); g.flashScreen('#ffffff', 0.25);
    if (o.ring) g.ringFx(e.x, e.y, e.r, 520, e.color, 36, 6);
    yield o.frames;
  };

  // ---------------------------------------------------------------- adds + arena rewrites
  lib.summon = function* (e, g, o) {
    o = Object.assign({ types: ['imp'], n: 3, hpMul: 1, max: 8, radius: 150, elite: false, quick: false }, o);
    const alive = g.enemies.filter(x => x.minion && !x.dead).length;
    let n = Math.min(N(e, o.n), Math.max(0, o.max - alive));
    if (n <= 0) { yield 20; return; }
    g.sfx('summon'); g.ringFx(e.x, e.y, e.r, e.r + 60, '#8a6aff', 24, 4);
    for (let k = 0; k < n; k++) {
      const a = k * TAU / n + g.rng.next(), d = o.radius * (0.6 + g.rng.next() * 0.6);
      const c = clampArena(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 20);
      const spot = ED.phys.blocked(g, c.x, c.y, 10, false, false) ? g.findSpot(e.x, e.y, 80, 200, 12) : c;
      const type = g.rng.pick(o.types);
      g.queueSpawn(type, spot.x, spot.y, { minion: true, hpMul: o.hpMul, quick: o.quick, elite: o.elite, mods: o.elite ? [g.rng.pick(ED.D.modPool(g.floorNum).concat(['swift']))] : [] });
    }
    yield g.tele(54) + 20;
  };
  /** drop stone pillars onto random tiles (telegraphed) */
  lib.pillars = function* (e, g, o) {
    o = Object.assign({ n: 3, warn: 56, max: 9, dmg: 1.2, color: '#a09a8a' }, o);
    const n = N(e, o.n), p = g.player;
    for (let i = 0; i < n && g.pillarCount < o.max; i++) {
      let tx, ty, tries = 0;
      do { tx = g.rng.int(3, C.COLS - 4); ty = g.rng.int(3, C.ROWS - 4); tries++; }
      while (tries < 20 && (U.dist2(tx * 32 + 16, ty * 32 + 16, p.x, p.y) < 90 * 90 || U.dist2(tx * 32 + 16, ty * 32 + 16, e.x, e.y) < (e.r + 30) * (e.r + 30) || g.col[ty * C.COLS + tx] !== 0));
      if (tries >= 20) continue;
      g.pillarCount++;
      const cx = tx * 32 + 16, cy = ty * 32 + 16;
      g.zoneCircle(e, cx, cy, 34, g.tele(o.warn), e.shotDmg * o.dmg, { color: o.color, burst: false, onEnd: (gg) => { gg.setTile(tx, ty, T.ROCK); gg.burst(cx, cy, 14, '#a09a8a', 3.5, 24); gg.shake(5); gg.sfx('crack'); } });
      yield 10;
    }
    yield g.tele(o.warn) + 10;
  };
  /** the floor crumbles: tiles in ring `ring` (1 = outermost) become pit/lava after a warning */
  lib.shrink = function* (e, g, o) {
    o = Object.assign({ ring: 1, tile: T.PIT, warn: 90, dmg: 1.0, color: '#ff4a4a' }, o);
    const tiles = [];
    for (let y = 1; y < C.ROWS - 1; y++) for (let x = 1; x < C.COLS - 1; x++) {
      const d = Math.min(x - 1, C.COLS - 2 - x, y - 1, C.ROWS - 2 - y) + 1;
      if (d !== o.ring) continue;
      const cur = g.room.tiles[y * C.COLS + x];
      if (cur === T.FLOOR || cur === T.RUG || cur === T.SPIKE || cur === T.WATER) tiles.push(y * C.COLS + x);
    }
    if (!tiles.length) return;
    g.zoneTiles(e, tiles, g.tele(o.warn), o.tile);
    g.toast('The floor is crumbling!', '#ff9a6a', 100); g.sfx('crack');
    yield g.tele(o.warn) + 20;
  };

  // ---------------------------------------------------------------- composition
  lib.chain = function* (e, g, o) {
    for (const [name, p] of o.seq) { yield* lib[name](e, g, p); }
  };
  lib.sequence = lib.chain;

  ED.attacks = { lib, B, ang, rayLen, clampArena, N, sc };
})(typeof globalThis !== 'undefined' ? globalThis : this);

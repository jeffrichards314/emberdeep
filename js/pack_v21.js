/* EMBERDEEP — pack_v21.js : v21 "HIDDEN DEPTHS" — the Hollow King's Court, and the ways down that are on no map.
 *
 *  THE HOLLOW KING'S COURT is a land that is not offered to anyone: its door does not exist until you carry three sigils (the memory gate of v17), and there is a second way in — a hairline crack in the
 *  room of a guardian on the 2nd-4th floor of a late land.  Bomb it once the guardian is down and a trapdoor opens: the rest of that land is the Court's (the way down from the MEGA boss that ends it too).
 *    rule      nothing in the Court dies alone: every foe leaves an heir (a smaller copy, once, never an heir of an heir)
 *    foes      JESTER (two rings close: you and it trade places), HEADSMAN (the axe falls on a marked line), HERALD (a horn mends and quickens everything near it)
 *    trait     REGAL (a crown that takes the first killing blow)           mini boss  THE CHANCELLOR (decrees)  →  Chancellor's Seal
 *    bosses    Queen Vesper, the Last Heir · Sir Gaunt, the Headsman · THE HOLLOW KING (five crown spires, two sceptre hands, the empty heart)   →  Heir's Signet, The Hollow Crown
 *    decrees   a new boss attack: "KNEEL" (do not move) · "DANCE" (do not stand still) · "HUSH" (do not dash) — break one and the boss strikes
 *  Everything is switchable: with v21 off the Court does not exist and no floor hides a trapdoor.  It needs v17 (the doors) to be reachable.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds, A = ED.ai;
  const X = ED.attacks, lib = X.lib, N = X.N, sc = X.sc;
  const TAU = U.TAU, V = 'v21';
  const L = (name, o) => [name, o];
  const darker = (c, k) => ED.render.darker(c, k);
  const glow = (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); };
  const ROSE = '#e0607a';

  P.define({
    id: 'v21', name: 'HIDDEN DEPTHS', tag: 'a court no map shows', color: ROSE,
    blurb: 'The Hollow King\'s Court: a land whose door does not exist until you carry three sigils — or whose trapdoor opens under a guardian\'s room, if you bomb the crack. Every foe there leaves an heir; a jester swaps your place for its own; a headsman keeps an appointment; and the King and his queen make decrees you must obey. (Needs v17 for the doors; the guardians of its own come with it.)',
  });

  const eyes = (c, e, spread) => {
    const a = e.face || 0, d = e.r * 0.35, s = Math.max(1.5, e.r * 0.2);
    for (const sg of [-1, 1]) {
      const ex = e.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * sg * e.r * spread, ey = e.y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * sg * e.r * spread;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, s, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(ex + Math.cos(a) * s * 0.4, ey + Math.sin(a) * s * 0.4, s * 0.5, 0, TAU); c.fill();
    }
  };
  const clash = (what, id) => (ED.collisions = ED.collisions || []).push(what + ' ' + id);
  const register = (table) => { for (const id in table) { if (ED.enemyTypes[id]) clash('foe', id); table[id].id = id; ED.enemyTypes[id] = table[id]; } };
  const relic = (key, def) => I.addRelic(key, Object.assign({ pack: V, mods: {} }, def));
  const mini = (def) => { if (ED.minibosses.defs[def.id]) clash('mini boss', def.id); ED.minibosses.defs[def.id] = Object.assign({ pack: V, contact: 4 }, def); };
  const mod = (def) => { if (ED.mods[def.id]) clash('elite trait', def.id); ED.mods[def.id] = Object.assign({ pack: V }, def); };
  const near = (g, e, r, f) => g.enemies.filter(x => x !== e && !x.dead && !x.boss && !x.big && U.dist2(e.x, e.y, x.x, x.y) < r * r && (!f || f(x)));
  const here = (g) => { const wi = g.floor && W.at(g.floorNum); return wi && wi.w.id === 'court' ? wi : null; };
  /** survivors that never close the distance are told to charge after a while (a locked room must always be finishable) */
  const rushed = (e, g, i, k) => { if (!e.rush) return false; A.chase(g, e, i, (k || 0.9) * g.dif.enemySpeed * e.spdMul, 0); return true; };

  // ------------------------------------------------------------------ DECREES: a boss attack that is a rule — break it and the throne strikes
  const DECREES = {
    kneel: { name: 'KNEEL', hint: 'do not move', shout: 'KNEEL!', broken: (p, s) => s.moved > 1.1 && s.knock < 0.6 },
    dance: { name: 'DANCE', hint: 'do not stand still', shout: 'DANCE!', broken: (p, s) => s.still >= 26 },
    hush: { name: 'HUSH', hint: 'do not dash', shout: 'HUSH!', broken: (p) => p.dashT > 0 },
  };
  lib.decree = function* (e, g, o) {
    o = Object.assign({ kinds: ['kneel', 'dance', 'hush'], warn: 70, live: 190, dmg: 0.85, color: ROSE }, o);
    const kind = g.rng.pick(o.kinds), Dc = DECREES[kind], p = g.player, warn = g.tele(o.warn);
    e.decree = { kind, st: 'warn', t: 0, dur: warn, name: Dc.name, hint: Dc.hint, color: o.color };
    g.toast('DECREE: ' + Dc.name + ' — ' + Dc.hint, o.color, warn + 50); g.sfx('telegraph');
    try {
      for (let i = 0; i < warn; i++) { e.decree.t = i; yield 1; }
      e.decree.st = 'live'; e.decree.dur = o.live;
      let last = { x: p.x, y: p.y }, still = 0, cool = 0;
      for (let i = 0; i < o.live; i++) {
        e.decree.t = i; const moved = Math.hypot(p.x - last.x, p.y - last.y); last = { x: p.x, y: p.y };
        still = moved < 0.35 ? still + 1 : 0; if (cool > 0) cool--;
        if (!p.dead && cool <= 0 && Dc.broken(p, { moved, still, knock: Math.hypot(p.kx || 0, p.ky || 0) })) {
          cool = 40; still = 0; g.hurtPlayer(e.shotDmg * o.dmg, e.x, e.y, { src: e, zone: true, noKnock: true }); g.addText(p.x, p.y - 26, Dc.shout, o.color, 14); g.burst(p.x, p.y, 8, o.color, 3, 16); g.ringFx(p.x, p.y, 6, 40, o.color, 14, 3); g.sfx('deny');
        }
        yield 1;
      }
    } finally { e.decree = null; }
    yield 20;
  };
  ED.hook('draw', V, (g, c, t) => {
    const e = g.enemies.find(x => x.decree && !x.dead); if (!e) return; const d = e.decree, live = d.st === 'live', k = U.clamp(d.t / Math.max(1, d.dur), 0, 1);
    c.save(); c.textAlign = 'center';
    const fm = ED.save.meta.settings.flash; if (live && fm > 0) { c.fillStyle = 'rgba(224,96,122,' + (0.05 + 0.03 * Math.sin(t * 0.2)) * Math.min(1, fm) + ')'; c.fillRect(0, 0, C.W, C.H); }          // (the tint follows the screen-flash setting)
    c.fillStyle = 'rgba(10,6,12,0.78)'; c.fillRect(C.W / 2 - 170, 100, 340, 38); c.strokeStyle = d.color; c.lineWidth = 2; c.strokeRect(C.W / 2 - 170, 100, 340, 38);
    ED.ui.text(c, 'DECREE: ' + d.name + (live ? '' : ' (soon)'), C.W / 2, 114, 15, live ? '#ffffff' : '#c0a0a8', 'center'); ED.ui.text(c, d.hint, C.W / 2, 129, 10, d.color, 'center', false);
    c.fillStyle = '#2a1a22'; c.fillRect(C.W / 2 - 160, 134, 320, 3); c.fillStyle = d.color; c.fillRect(C.W / 2 - 160, 134, 320 * (live ? 1 - k : k), 3);
    c.restore();
  });

  // ------------------------------------------------------------------ THE RULE: every foe leaves an heir
  ED.hook('kill', V, (g, e) => {
    const rt = g.rt, wi = rt && rt.hzOn && here(g); if (!wi) return;
    if (e.heir || e.minion || e.boss || e.big || e.noHeir || !e.def || e.def.weight === 0 || (rt.heirs | 0) >= (rt.heirCap | 0)) return;
    rt.heirs = (rt.heirs | 0) + 1;
    g.queueSpawn(e.type, e.x, e.y, { minion: true, hpMul: 0.4, scale: 0.85, extra: { heir: true, noLoot: true } });
    g.ringFx(e.x, e.y, 6, 34, ROSE, 18, 3); g.addText(e.x, e.y - e.r - 8, 'an heir', ROSE, 11);
  });
  const crown = (c, x, y, s, col) => { c.fillStyle = col; c.strokeStyle = '#3a2008'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - s, y + s * 0.6); c.lineTo(x - s, y - s * 0.4); c.lineTo(x - s * 0.5, y + s * 0.1); c.lineTo(x, y - s * 0.7); c.lineTo(x + s * 0.5, y + s * 0.1); c.lineTo(x + s, y - s * 0.4); c.lineTo(x + s, y + s * 0.6); c.closePath(); c.fill(); c.stroke(); };
  ED.hook('draw', V, (g, c, t) => { for (const e of g.enemies) { if (e.dead) continue; if (e.heir) crown(c, e.x, e.y - e.r - 6 + Math.sin(t * 0.1 + e.id) * 1.5, 5, ROSE); else if (e.crowned) crown(c, e.x, e.y - e.r - 8, 6, '#ffd24a'); } });
  // the herald's horn quickens what it mends (kept separate from v19's own haste so each works alone)
  ED.hook('tick', V, (g) => {
    for (const e of g.enemies) {
      if (e.rally > 0) { e.rally -= g.ts; if (!e.rallied) { e.rallied = true; e.sp1 = e.speed; e.rt1 = e.rate0; e.speed *= 1.35; e.rate0 *= 1.35; } }
      else if (e.rallied) { e.rallied = false; e.speed = e.sp1; e.rate0 = e.rt1; }
    }
  });

  // ------------------------------------------------------------------ the court's foes
  const f21 = (o) => Object.assign({ pack: V, contact: true, world: 'court' }, o);
  register({
    jester: f21({ name: 'Jester', shape: 'tri', color: ROSE, r: 11, hp: 15, speed: 1.9, dmg: 2, shot: 2.6, cost: 2.0, weight: 11, minFloor: 16, group: 2,
      desc: 'Keeps its distance and flicks cards at you. Now and then two rings open — one under you, one under it — and when they close the two of you trade places. Dash through, or step out of your ring and it only takes the empty spot.',
      init(e, g) { e.cd = 100 + g.rng.int(0, 70); e.sh = 70; e.sw = null; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.sw) {                                                                                   // standing still while the rings close
          const s = e.sw; s.t += g.ts;
          if (s.t >= s.dur) {
            e.sw = null; e.cd = 320;
            if (!p.dead && p.dashT <= 0 && U.dist2(p.x, p.y, s.ax, s.ay) < 52 * 52) {
              const px = p.x, py = p.y; p.x = e.x; p.y = e.y; e.x = px; e.y = py; p.inv = Math.max(p.inv, 26); p.kx = p.ky = 0;
              g.burst(e.x, e.y, 10, ROSE, 3, 18); g.burst(p.x, p.y, 10, ROSE, 3, 18); g.sfx('dash'); g.addText(p.x, p.y - 22, 'traded places!', ROSE, 12);
            } else if (U.dist2(p.x, p.y, s.ax, s.ay) > 64 * 64 && !ED.phys.blocked(g, s.ax, s.ay, e.r * 0.82, false, false)) { e.x = s.ax; e.y = s.ay; g.burst(e.x, e.y, 8, ROSE, 2, 14); }
          }
          return;
        }
        if (!rushed(e, g, i, 1.0)) A.kite(g, e, i, 170, e.curSpeed, 0.8);
        if ((e.sh -= g.ts) <= 0) { e.sh = 105 / e.rate; for (let k = -1; k <= 1; k++) g.eShot(e, i.ang + k * 0.24, 2.7, { dmg: 0.8, color: ROSE, r: 4 }); }
        if ((e.cd -= g.ts) <= 0 && i.d > 80 && i.d < 330 && !p.dead) {
          const dur = g.tele(46); e.sw = { ax: p.x, ay: p.y, dur, t: 0 };
          g.zoneCircle(e, p.x, p.y, 50, dur, 0, { color: ROSE, hurts: false, burst: false }); g.zoneCircle(e, e.x, e.y, 34, dur, 0, { color: ROSE, hurts: false, burst: false, follow: true }); g.sfx('telegraph', { vol: 0.4 });
        }
      },
      draw(c, e, t) {
        if (e.sw) { c.strokeStyle = U.rgba(ROSE, 0.55); c.lineWidth = 2; c.setLineDash && c.setLineDash([5, 5]); c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.sw.ax, e.sw.ay); c.stroke(); c.setLineDash && c.setLineDash([]); }
        c.fillStyle = '#ffd8a0'; for (const s of [-1, 1]) { c.beginPath(); c.arc(e.x + s * e.r * 0.8, e.y - e.r * 0.9 + Math.sin(t * 0.2 + s) * 2, 2.6, 0, TAU); c.fill(); } eyes(c, e, 0.35);
      } }),
    headsman: f21({ name: 'Headsman', shape: 'square', color: '#a8344a', r: 17, hp: 54, speed: 0.8, dmg: 4, shot: 4, cost: 4.2, weight: 6, minFloor: 17, group: 1,
      desc: 'A slow giant with an appointment. Every few seconds the axe goes up and a long line of floor is marked; when it falls, anything on the line is struck. It rests after — that is your chance. It does not hurry.',
      init(e, g) { e.cd = 140 + g.rng.int(0, 90); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = 'rest'; e.restT = 55; e.vuln = 1.3; } return; }
        if (e.state === 'rest') { e.restT -= g.ts; if (e.restT <= 0) { e.state = null; e.vuln = 1; e.cd = 230 / e.rate; } return; }
        A.chase(g, e, i, e.curSpeed * (e.rush ? 1.4 : 1), 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 340 && !g.player.dead) {
          const a = i.ang, len = Math.max(120, Math.min(380, X.rayLen(e.x, e.y, a, 8))); e.state = 'wind'; e.windup = g.tele(54); e.axe = a;
          g.zoneLine(e, e.x, e.y, e.x + Math.cos(a) * len, e.y + Math.sin(a) * len, 30, e.windup, e.shotDmg * 1.7, { color: '#ff4a4a', burst: true, onEnd: (gg) => { gg.shake(6); gg.sfx('thud'); } }); g.sfx('telegraph', { vol: 0.5 });
        }
      },
      draw(c, e, t) {
        const raised = e.state === 'wind', a = raised ? (e.axe || 0) : (e.face || 0), s = e.r;
        c.save(); c.translate(e.x, e.y - (raised ? 6 : 0)); c.rotate(a); c.strokeStyle = '#3a2008'; c.lineWidth = 4; c.beginPath(); c.moveTo(s * 0.4, 0); c.lineTo(s * 1.6, 0); c.stroke();
        c.fillStyle = '#c8c8d8'; c.strokeStyle = '#10101c'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(s * 1.3, -s * 0.15); c.lineTo(s * 1.75, -s * 0.7); c.lineTo(s * 1.9, s * 0.1); c.lineTo(s * 1.55, s * 0.55); c.closePath(); c.fill(); c.stroke(); c.restore();
        c.fillStyle = '#10101c'; c.fillRect(e.x - s * 0.55, e.y - s * 0.7, s * 1.1, s * 0.5);       // the hood
        c.fillStyle = '#ff6a6a'; c.fillRect(e.x - s * 0.3, e.y - s * 0.52, s * 0.18, s * 0.1); c.fillRect(e.x + s * 0.12, e.y - s * 0.52, s * 0.18, s * 0.1);
      } }),
    herald: f21({ name: 'Herald', shape: 'diamond', color: '#ffd8a0', r: 11, hp: 17, speed: 1.2, dmg: 1.5, shot: 2.6, cost: 2.4, weight: 8, minFloor: 16, group: 1,
      desc: 'Stays well back and sounds a horn: every foe in the ring mends by a sixth and runs a third faster for three seconds. The ring shows the reach of the horn. Silence it first.',
      init(e, g) { e.cd = 170 + g.rng.int(0, 90); e.sh = 100; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'horn') {
          e.windup -= g.ts; if (e.windup > 0) return; e.state = null; e.cd = 340;
          g.ringFx(e.x, e.y, 10, 180, '#ffd8a0', 24, 4); g.sfx('summon', { vol: 0.5 });
          for (const o of near(g, e, 180)) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.16); o.rally = 190; g.addText(o.x, o.y - o.r - 6, '+', '#ffd8a0', 12); }
          return;
        }
        if (!rushed(e, g, i, 1.0)) A.kite(g, e, i, 210, e.curSpeed, 0.6);
        if ((e.sh -= g.ts) <= 0) { e.sh = 130 / e.rate; g.eShot(e, i.ang, 2.4, { dmg: 0.8, color: '#ffd8a0', r: 4 }); }
        if ((e.cd -= g.ts) <= 0 && near(g, e, 180).length) { e.state = 'horn'; e.windup = g.tele(38); g.zoneCircle(e, e.x, e.y, 180, e.windup, 0, { color: '#ffd8a0', hurts: false, burst: false, follow: true }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e, t) {
        const a = e.face || 0, k = e.state === 'horn' ? 1 + 0.15 * Math.sin(t * 0.8) : 1; c.save(); c.translate(e.x, e.y); c.rotate(a); c.fillStyle = '#e8c060'; c.strokeStyle = '#3a2808'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(e.r * 0.5, -2); c.lineTo(e.r * 1.4 * k, -e.r * 0.65 * k); c.lineTo(e.r * 1.4 * k, e.r * 0.65 * k); c.lineTo(e.r * 0.5, 2); c.closePath(); c.fill(); c.stroke(); c.restore(); eyes(c, e, 0.35);
      } }),
  });

  // ------------------------------------------------------------------ elite trait
  mod({ id: 'regal', name: 'Regal', color: ROSE, glyph: '♛', desc: 'Wears a crown that takes the first killing blow: it is left on a sliver, and mends a quarter of itself a moment later',
    apply(e) {
      e.crowned = true;
      e.takeHit = function (g, hb, dmg) { if (this.crowned && this.hp - dmg <= 0) { this.crowned = false; this.regalT = 42; g.addText(this.x, this.y - this.r - 8, 'THE CROWN FALLS', ROSE, 11); g.ringFx(this.x, this.y, 6, 40, ROSE, 16, 3); g.sfx('block'); return Math.max(0, this.hp - 1); } return dmg; };
    },
    update(e, g) { if (e.regalT > 0 && (e.regalT -= g.ts) <= 0) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.25); g.burst(e.x, e.y, 8, ROSE, 3, 18); g.addText(e.x, e.y - e.r - 8, '+', ROSE, 12); } },
  });

  // ------------------------------------------------------------------ the mini boss and its relic
  mini({ id: 'chancellor', name: 'The Chancellor', title: "Keeper of the King's Ear", color: '#d8a0b0', r: 28, hp: 215, arena: 'arena_throne', shape: 'chancellor', minFloor: 16, unlockText: "Chancellor's Seal",
    attacks: { decree: L('decree', { warn: 62, live: 150 }), scroll: L('fan', { n: 5, spread: 0.22, reps: 2, gap: 16, speed: 2.9, color: '#e8d0b0' }), bow: L('radial', { n: 12, reps: 2, gap: 18, speed: 2.2, color: ROSE }), heralds: L('summon', { types: ['herald'], n: 1, max: 2, hpMul: 0.7 }) },
    phases: [{ at: 1, name: 'Audience', attacks: ['scroll', 'bow', 'decree'], idle: [34, 56] }, { at: 0.5, name: 'In Council', attacks: ['scroll', 'decree', 'heralds', 'bow'], idle: [26, 44] }] });
  ED.bossDraw.chancellor = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.5); c.beginPath(); c.moveTo(x - r * 0.95, y + r); c.lineTo(x - r * 0.55, y - r * 0.4); c.lineTo(x + r * 0.55, y - r * 0.4); c.lineTo(x + r * 0.95, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f0e0d0'; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.46, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#2a1018'; c.beginPath(); c.moveTo(x - r * 0.62, y - r * 0.78); c.lineTo(x - r * 0.28, y - r * 1.55); c.lineTo(x + r * 0.28, y - r * 1.55); c.lineTo(x + r * 0.62, y - r * 0.78); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#10101c'; c.fillRect(x - r * 0.3, y - r * 0.6, r * 0.18, r * 0.08); c.fillRect(x + r * 0.12, y - r * 0.6, r * 0.18, r * 0.08);
    c.fillStyle = '#f4ecd8'; c.strokeStyle = '#6a5a4a'; c.lineWidth = 1.5; const sw = Math.sin(t * 0.06) * 0.1; c.save(); c.translate(x + r * 0.75, y + r * 0.1); c.rotate(0.3 + sw); c.fillRect(-r * 0.14, -r * 0.5, r * 0.28, r * 0.9); c.strokeRect(-r * 0.14, -r * 0.5, r * 0.28, r * 0.9); c.fillStyle = ROSE; c.fillRect(-r * 0.14, -r * 0.1, r * 0.28, r * 0.08); c.restore();
  };
  relic('chancellorseal', { id: 'chancellorseal', name: "Chancellor's Seal", rarity: 'rare', color: '#d8a0b0', mods: { def: 1, luck: 1, gold: 0.1 }, max: 2, unlock: 'mini:chancellor', desc: "A little defense, a little luck, a little more gold from everything. (Unlockable)" });

  // ------------------------------------------------------------------ the land
  const COURT = {
    setup(g, room, rt, rng, wi) {
      for (let x = 2; x <= 27; x++) for (const y of [8, 9]) { const i = y * C.COLS + x; if (room.tiles[i] === T.FLOOR) room.tiles[i] = T.RUG; }          // the red runner (only a floor)
      rt.heirs = 0; rt.heirCap = 3 + Math.min(4, wi.depth);
    },
  };
  W.add({ id: 'court', name: "The Hollow King's Court", short: 'HOLLOW COURT', color: ROSE, pack: V, native: 16, tiers: [3, 99], risk: 4, hidden: true, gate: { kind: 'legacy', id: 'sigils3' },
    rule: 'Every foe leaves an heir. Mind the jester\'s swap, the headsman\'s axe and the herald\'s horn — and obey the decree.',
    enemies: ['jester', 'headsman', 'herald'], mod: 'regal', minis: ['chancellor'], hz: COURT, music: { scale: 3, root: 36, bpm: -6, prog: [0, 3, 5, 2] },
    theme: { name: "The Hollow King's Court", floorA: '#221418', floorB: '#281a1e', wall: '#4a2a32', wallTop: '#8a4a5a', accent: ROSE, glow: '#ff8aa0', fog: '#0c0608' } });

  // ------------------------------------------------------------------ the Court's boss line (built with v20's machinery, tagged v21 so it works with v20 off)
  const V20 = ED.v20, BD = ED.bossDraw;
  const addBoss = (def) => { const b = V20.addBoss(def); b.pack = V; return b; };
  const LANDS = { court: { bosses: { 1: 'vesper', 3: 'gaunt' }, mega: 'hollowking' } };
  ED.specMods.push((spec) => {
    if (!P.on(V) || spec.final) return; const wi = W.at(spec.floor), L_ = wi && wi.routed && LANDS[wi.w.id]; if (!L_) return;
    const id = spec.mega ? L_.mega : (L_.bosses[wi.depth] || null); if (!id) return;
    const defs = spec.mega ? ED.bosses.MEGAS : ED.bosses.DEFS, def = defs[id]; if (!def) return;
    const partner = spec.partnerId ? defs[spec.partnerId] : null; spec.defId = id; spec.color = def.color; spec.arena = def.arena || spec.arena; spec.name = V20.nameOf(spec, def, partner); spec.land = wi.w.id;
  });
  addBoss({ id: 'vesper', name: 'Vesper', title: 'the Last Heir', color: ROSE, accent: '#ffe0e8', r: 46, hp: 500, rScale: 1.0, hpScale: 1.01, arena: 'arena_throne', shape: 'queen', contact: 5,
    teaches: 'She rules by decree: when the banner turns bright, do exactly what it says — stand still, keep moving, or keep off the dash — or the throne strikes you.', unlock: { boss: 'vesper' },
    attacks: { decree: L('decree', {}), decree2: L('decree', { warn: 54, live: 230, dmg: 1.0 }), courtly: L('fan', { n: 7, spread: 0.2, reps: 3, gap: 14, speed: 3.0, dmg: 0.9, color: '#ffd0da' }), curtsey: L('radial', { n: 14, reps: 3, gap: 14, speed: 2.3, rot: 0.2, color: ROSE }),
      heirs: L('summon', { types: ['jester', 'herald'], n: 2, max: 4, hpMul: 0.8 }), shards: L('rain', { n: 9, r: 44, interval: 8, warn: 52, aimed: 0.5, shrapnel: 4, color: '#ffc0d0' }), riposte: L('charge', { tele: 34, speed: 10, dmg: 1.5, stun: 30, color: ROSE }) },
    phases: [
      { at: 1.0, name: 'Audience', attacks: ['courtly', 'curtsey', 'heirs'], idle: [38, 64] },
      { at: 0.64, name: 'Decree', attacks: ['decree', 'courtly', 'heirs', 'shards'], idle: [28, 52] },
      { at: 0.34, name: 'Succession', attacks: ['decree2', 'shards', 'riposte', 'heirs', 'curtsey'], idle: [22, 42] },
      { at: 0.12, minTier: 2, name: 'Abdication', attacks: ['decree2', 'riposte', 'shards', 'courtly'], idle: [16, 32] },
    ] });
  addBoss(V20.variant('vael', { id: 'gaunt', name: 'Sir Gaunt', title: 'the Headsman', color: '#a8344a', accent: '#ffe0e8', tint: '#ff7a8a', arena: 'arena_throne',
    teaches: 'His axe is wide and slow: read the marked cone, dash THROUGH it, strike while he recovers. Heralds and jesters answer his call, and now and then the court gives a decree.',
    swap: { cleave: L('coneSlash', { arc: 1.7, r: 150, tele: 46, dmg: 1.7 }), cleave2: L('coneSlash', { arc: 1.7, r: 160, tele: 34, dmg: 1.7, times: 2, gap: 10 }), phantoms: L('summon', { types: ['jester', 'herald'], n: 2, max: 4, hpMul: 0.8 }), decree: L('decree', {}) },
    add: { 1: ['decree'], 2: ['decree'] }, phaseNames: { 'The Duelist': 'The Block', Fury: 'The Falling Axe', 'Phantom Knight': 'The Court Attends', 'Hollow Fury': 'No Mercy' } }));
  addBoss({ id: 'hollowking', name: 'The Hollow King', title: 'Who Wears the Crown Last', color: '#c8506a', accent: '#ffe0e8', r: 110, hp: 1450, rScale: 1.0, hpScale: 1.04, arena: 'arena_throne', shape: 'hollowking', mega: true, contact: 6,
    teaches: 'Break the five spires of the crown, then the two hands that hold the sceptre, then the empty heart. He issues decrees; his court answers.', unlock: { boss: 'hollowking' },
    parts: [
      { id: 's0', kind: 'spire', r: 24, hp: 0.05, group: 0, ang: -2.6 }, { id: 's1', kind: 'spire', r: 24, hp: 0.05, group: 0, ang: -2.05 }, { id: 's2', kind: 'spire', r: 27, hp: 0.06, group: 0, ang: -1.57 }, { id: 's3', kind: 'spire', r: 24, hp: 0.05, group: 0, ang: -1.1 }, { id: 's4', kind: 'spire', r: 24, hp: 0.05, group: 0, ang: -0.54 },
      { id: 'handL', kind: 'arm', r: 46, hp: 0.12, group: 1, side: -1 }, { id: 'handR', kind: 'arm', r: 46, hp: 0.12, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 56, hp: 0.5, group: 2 },
    ],
    attacks: { crownBeams: L('beams', { n: 5, len: 700, w: 22, warn: 56, life: 120, rot: 0.016, dmg: 0.85, color: ROSE, anchorParts: 'spire' }), decree: L('decree', {}), decree2: L('decree', { warn: 52, live: 240, dmg: 1.05 }), fists: L('fists', {}), fists3: L('fists', { n: 3 }),
      courtly: L('fan', { n: 9, spread: 0.18, reps: 3, gap: 14, speed: 3.1, dmg: 0.9, color: '#ffd0da' }), curtsey: L('radial', { n: 18, reps: 3, gap: 12, speed: 2.4, rot: 0.16, color: ROSE }), heirs: L('summon', { types: ['jester', 'herald', 'headsman'], n: 3, max: 6, hpMul: 0.8, radius: 200 }),
      shards: L('rain', { n: 11, r: 44, interval: 7, warn: 50, aimed: 0.5, shrapnel: 4, color: '#ffc0d0' }), proclaim: L('screenBlast', { safe: 3, warn: 100, dmg: 1.7 }), spiral: L('spiral', { arms: 5, frames: 96, speed: 2.1, color: ROSE }), pillars: L('pillars', { n: 3, max: 8 }) },
    phases: [
      { name: 'The Crown', attacks: ['crownBeams', 'decree', 'courtly', 'heirs'], idle: [34, 60] },
      { name: 'The Sceptre', attacks: ['fists', 'decree', 'shards', 'heirs', 'curtsey'], idle: [28, 52], enter: [L('heirs', null)] },
      { name: 'The Court Rises', attacks: ['fists3', 'decree2', 'courtly', 'shards', 'heirs'], idle: [24, 44], enter: [L('shrink', { ring: 1, tile: T.PIT }), L('pillars', { n: 3, max: 8 })] },
      { name: 'Hollow Heart', attacks: ['decree2', 'spiral', 'shards', 'fists3', 'heirs'], idle: [22, 40], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'THE LAST HEIR', attacks: ['proclaim', 'decree2', 'spiral', 'courtly', 'shards'], idle: [14, 28], enter: [L('shrink', { ring: 3, tile: T.PIT })] },
    ],
    phaseOf(e) {
      const spires = e.parts.filter(p => p.kind === 'spire' && !p.dead).length, hands = e.parts.filter(p => p.kind === 'arm' && !p.dead).length;
      if (spires) return 0; if (hands) return 1; const core = e.parts.find(p => p.id === 'core'), f = core.hp / core.maxHp; return f > 0.6 ? 2 : f > 0.28 ? 3 : 4;
    } });
  V20.part('spire', V20.hung(1.08, 0.98, 4), (c, e, p, vul, fl, t) => {
    c.fillStyle = fl ? '#fff' : (vul ? '#ffe9a0' : '#9a7a3a'); c.strokeStyle = '#3a2008'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x, p.y - p.r * 1.5); c.lineTo(p.x + p.r * 0.75, p.y + p.r * 0.9); c.lineTo(p.x - p.r * 0.75, p.y + p.r * 0.9); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = vul ? '#ff6a8a' : '#7a2a3a'; c.beginPath(); c.arc(p.x, p.y + p.r * 0.2, p.r * 0.28, 0, TAU); c.fill(); if (vul) glow(c, p.x, p.y - p.r * 0.3, p.r * 1.3, '#ffd24a', 0.28 + 0.08 * Math.sin(t * 0.25)); });
  BD.queen = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = darker(col, 0.5); c.beginPath(); c.moveTo(x - r * 1.05, y + r); c.lineTo(x - r * 0.4, y - r * 0.35); c.lineTo(x + r * 0.4, y - r * 0.35); c.lineTo(x + r * 1.05, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = darker(col, 0.2); c.beginPath(); c.moveTo(x - r * 0.62, y + r); c.lineTo(x - r * 0.3, y - r * 0.2); c.lineTo(x + r * 0.3, y - r * 0.2); c.lineTo(x + r * 0.62, y + r); c.closePath(); c.fill();
    c.fillStyle = '#f0e0d8'; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.44, 0, TAU); c.fill(); c.stroke();
    crown(c, x, y - r * 1.05 + Math.sin(t * 0.05) * 1.5, r * 0.5, '#ffd24a');
    c.fillStyle = '#10101c'; c.fillRect(x - r * 0.3, y - r * 0.6, r * 0.18, r * 0.08); c.fillRect(x + r * 0.12, y - r * 0.6, r * 0.18, r * 0.08);
    c.save(); c.strokeStyle = '#ffd24a'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + r * 0.9, y + r * 0.7); c.lineTo(x + r * 0.7, y - r * 0.5 + Math.sin(t * 0.05) * 3); c.stroke(); c.fillStyle = ROSE; c.beginPath(); c.arc(x + r * 0.7, y - r * 0.6 + Math.sin(t * 0.05) * 3, r * 0.14, 0, TAU); c.fill(); c.restore();
  };
  BD.hollowking = (c, e, x, y, r, col, dk, t) => {
    c.fillStyle = '#2a1018'; c.beginPath(); c.moveTo(x - r * 1.0, y + r); c.lineTo(x - r * 0.85, y - r * 0.9); c.lineTo(x + r * 0.85, y - r * 0.9); c.lineTo(x + r * 1.0, y + r); c.closePath(); c.fill(); c.stroke();       // the throne
    c.fillStyle = darker(col, 0.45); c.beginPath(); c.moveTo(x - r * 0.6, y + r * 0.9); c.lineTo(x - r * 0.5, y - r * 0.35); c.lineTo(x + r * 0.5, y - r * 0.35); c.lineTo(x + r * 0.6, y + r * 0.9); c.closePath(); c.fill();          // the robe
    c.fillStyle = '#e8dccb'; c.beginPath(); c.arc(x, y - r * 0.62, r * 0.38, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#10101c'; c.beginPath(); c.arc(x - r * 0.14, y - r * 0.64, r * 0.1, 0, TAU); c.arc(x + r * 0.14, y - r * 0.64, r * 0.1, 0, TAU); c.fill(); c.fillRect(x - r * 0.06, y - r * 0.5, r * 0.12, r * 0.14);
    c.strokeStyle = '#e8dccb'; c.lineWidth = 3; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x - r * 0.32, y - r * 0.15 + k * r * 0.2); c.lineTo(x + r * 0.32, y - r * 0.15 + k * r * 0.2); c.stroke(); }          // the ribs round the empty heart
    glow(c, x, y + r * 0.05, r * 0.5, ROSE, 0.14 + 0.05 * Math.sin(t * 0.1));
  };
  relic('heirsignet', { id: 'heirsignet', name: "Heir's Signet", rarity: 'legendary', color: ROSE, mods: { luck: 1, dmgTaken: -0.08, regen: 1 }, unique: true, unlock: 'boss:vesper', desc: 'A little luck, 8% less damage taken, a slow knitting of wounds. (Unlockable)' });
  relic('hollowcrown', { id: 'hollowcrown', name: 'The Hollow Crown', rarity: 'legendary', color: '#c8506a', mods: { dmg: 0.12, def: 1, maxHp: 4 }, unique: true, unlock: 'boss:hollowking', desc: '+12% damage, +1 defense and a heart container: it is heavy, and it fits. (Unlockable)' });

  // ------------------------------------------------------------------ THE TRAPDOOR: a hairline crack in a guardian's room, found once the guardian is down
  const TRAP_P = 0.2, sealed = (g) => !!g.run && (g.run.mode === 'rush' || g.run.mode === 'gauntlet');
  /** does this floor hide a trapdoor?  Pure in (seed, floor): the guardian's room on the 2nd-4th floor of a late tier, never inside the Court, never twice in a tier */
  function courtTrap(g) {
    const cw = W.byId.court; if (!P.on(V) || !cw || !P.ok(cw) || !g.run || !g.floor || g.floor.isMega || sealed(g)) return false;
    const F = g.floorNum, T_ = W.tierOf(F), d = (F - 1) % 5; if (d < 1 || d > 3 || T_ < cw.tiers[0] || T_ > cw.tiers[1] || here(g) || W.mid(T_)) return false;
    return new ED.RNG(g.run.seed + ':trap:' + F).chance(TRAP_P);
  }
  /** other updates may hide a trapdoor of their own (v25's Bazaar, in the Gilded Vault): TARGETS is a list of (g) => world id | null, asked after the Court's own rule (which is untouched) */
  const TARGETS = [];
  function trapTarget(g) { if (courtTrap(g)) return 'court'; if (!P.on(V) || !g.run || !g.floor || g.floor.isMega || sealed(g)) return null; const F = g.floorNum, d = (F - 1) % 5; if (d < 1 || d > 3 || W.mid(W.tierOf(F))) return null; for (const f of TARGETS) { const id = f(g); if (id) return id; } return null; }
  const trapHere = (g) => !!trapTarget(g);
  const sideOf = (dir) => { const d = ED.rooms.DOOR_TILES[dir], x0 = d[0][0] * 32, y0 = d[0][1] * 32; return { x0, y0, w: (d[1][0] - d[0][0] + 1) * 32, h: (d[1][1] - d[0][1] + 1) * 32 }; };
  function armTrap(g, room) {
    const rt = g.rt; if (rt.trap || !trapHere(g)) return;
    const free = ED.DIRS.filter(d => !room.doors[d]), rng = new ED.RNG(g.run.seed + ':trap:crack:' + g.floorNum); rng.shuffle(free);
    for (const dir of free) {
      const c = ED.rooms.doorCenter(dir), v = ED.DIR_V[dir], px = c.x - v[0] * 46, py = c.y - v[1] * 46;
      if (ED.phys.blocked(g, px, py, 16, false, false)) continue;
      rt.trap = { dir, x: c.x, y: c.y, px, py, open: false, target: trapTarget(g) };
      const prev = rt.onExplode;
      rt.onExplode = (g2, x, y, r) => { if (prev) prev(g2, x, y, r); const k = g2.rt.trap; if (k && !k.open && g2.room.cleared && Math.hypot(x - k.x, y - k.y) < r + 40) openTrap(g2, k); };
      return;
    }
  }
  function openTrap(g, k) {
    k.open = true; g.burst(k.x, k.y, 34, '#8a7a6a', 5, 34, { size: 4 }); g.shake(8); g.sfx('crack'); g.flashScreen('#d8c8a0', 0.18);
    g.toast('The wall gives way — a dark stair goes down.', ROSE, 200);
    k.it = g.addInter({ type: 'trapdoor', x: k.px, y: k.py, r: 24, range: 48, color: ROSE, prompt: () => 'Climb down the crack', use: fall });
  }
  /** the rest of this tier is the Court's: the floors below resolve through run.mid (worlds.js) */
  function fall(g, it) {
    const F = g.floorNum, T_ = W.tierOf(F), target = (g.rt && g.rt.trap && g.rt.trap.target) || 'court'; g.run.mid = g.run.mid || {}; g.run.mid[T_] = { from: F + 1, world: target || 'court' }; W.use(g.run); g.run.trapdoors = (g.run.trapdoors | 0) + 1;
    if (ED.route && ED.route.meta) { const M = ED.route.meta(); M.counters.trapdoors = (M.counters.trapdoors | 0) + 1; ED.save.save(); }
    g.toast('You climb down. This is on no map.', ROSE, 220); g.sfx('door'); g.nextFloor();
  }
  ED.hook('roomEnter', V, (g, room) => { if (room.type === 'boss' && g.rt && !g.rt.trap) armTrap(g, room); });
  ED.hook('under', V, (g, c, t) => {
    const rt = g.rt, k = rt && rt.trap; if (!k || !g.room.cleared) return; const s = sideOf(k.dir);
    c.save();
    if (k.open) { c.fillStyle = '#07070d'; c.fillRect(s.x0, s.y0, s.w, s.h); c.fillStyle = '#6a5a4a'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(k.px + Math.sin(i * 2.3) * 22, k.py + Math.cos(i * 1.7) * 26, 4 + (i % 3) * 2, 0, TAU); c.fill(); } }
    else {
      c.strokeStyle = 'rgba(216,200,160,' + (0.55 + 0.25 * Math.sin(t * 0.05)) + ')'; c.lineWidth = 2; c.lineJoin = 'round';
      const horiz = k.dir === 'N' || k.dir === 'S', cx = s.x0 + s.w / 2, cy = s.y0 + s.h / 2;
      for (const off of [-1, 0, 1]) { c.beginPath(); for (let i = 0; i <= 6; i++) { const u = (i / 6 - 0.5) * (horiz ? s.w : s.h), v = ((i * 37 + off * 11) % 9 - 4) * 1.6; const px = horiz ? cx + u : cx + v + off * 4, py = horiz ? cy + v + off * 4 : cy + u; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); }
    }
    c.restore();
  });
  ED.hook('roomClear', V, (g, room) => {            // a bomb must be to hand: if the guardian is down, a crack waits and the player has none, one lies where it fell
    const rt = g.rt, k = rt && rt.trap; if (!k || room.type !== 'boss' || k.open) return;
    const p = g.player; if (p.bombs > 0 || g.pickups.some(x => x.type === 'bomb' && !x.dead)) return;
    g.after(60, () => { g.dropPickup('bomb', 480, 330, 1, { still: true }); g.toast('A stray bomb lies here...', '#ff9a3c', 140); });
  });
  ED.interDraw.trapdoor = (c, it, t) => {
    const x = it.x, y = it.y; glow(c, x, y, 40, ROSE, 0.12 + 0.06 * Math.sin(t * 0.08));
    c.fillStyle = '#05050a'; c.beginPath(); c.ellipse(x, y, 26, 20, 0, 0, TAU); c.fill(); c.strokeStyle = ROSE; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(224,96,122,0.5)'; c.lineWidth = 2; for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(x, y + k * 3, 22 - k * 5, 16 - k * 4, 0, 0, TAU); c.stroke(); }
    for (let k = 0; k < 4; k++) ED.icons.draw(c, 'skull', x + (k - 1.5) * 11, y - 34, 4, '#ff6a6a');          // as every road that bites harder shows its skulls
    ED.ui.text(c, 'DOWN', x, y + 36, 9, '#9a9ab8', 'center', false);
  };
  // the Court is a land of its own: entering it through the floor counts as finding it
  ED.hook('floorStart', V, (g) => {
    const wi = here(g); if (!wi) return; g.run.courtSeen = true;
    if (wi.mid && wi.first && ED.route && ED.route.meta) { const M = ED.route.meta(); M.discovered.court = true; M.seen.court = true; M.visits.court = (M.visits.court | 0) + 1; ED.save.save(); }
  });

  // ------------------------------------------------------------------ feats (they appear on the v10 LEGACY screen when both updates are on)
  if (ED.legacy) {
    const F = ED.legacy.FEATS, FM = ED.legacy.FEAT, add = (f) => { f.pack = V; f.need = V; F.push(f); FM[f.id] = f; };
    add({ id: 'court1', name: 'Heir Apparent', desc: "Set foot in the Hollow King's Court.", title: 'the Heir', test: x => !!x.run.courtSeen });
    add({ id: 'trap1', name: 'Hairline', desc: 'Find a trapdoor behind a crack and take it.', title: 'Hairline', test: x => (x.run.trapdoors | 0) >= 1 });
    add({ id: 'king1', name: 'Regicide', desc: 'Fell the Hollow King.', title: 'Kingslayer', test: x => !!(x.run.bossesKilled && x.run.bossesKilled.includes('hollowking')) });
  }
  ED.hollow21 = { LANDS, DECREES, COURT, trapHere, trapTarget, TARGETS, armTrap, openTrap, fall, TRAP_P };
})(typeof globalThis !== 'undefined' ? globalThis : this);

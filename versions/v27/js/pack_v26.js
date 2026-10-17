/* EMBERDEEP — pack_v26.js : v26 "WORLDS V" — four more lands that lean on new mechanics.  Every puzzle and objective is optional or resolves itself: stairs and keys never wait on one.
 *
 *  THE GAMBIT HALL         a checkerboard that bites one colour at a time; foes move like chess pieces, one telegraphed square at a time       door: a deed (a guardian felled on your last heart)
 *  THE COUNTERWEIGHT KEEP  pressure plates, portcullises and stone blocks: a cage of treasure opens while something heavy stands on a plate     door: a carried plumb bob
 *  THE HOLLOW RITE         a ritual circle charges while chanters chant and calls a Herald when full; some rooms ask for a vigil              door: an offering (gold or a heart)
 *  THE ECLIPSE ORCHARD     one 64-second clock — dawn, noon, dusk, night — that heals, ripens, rots and haunts                                 door: a hairline crack (bomb it)
 *  Reached through v17's roads; every land works with every other update off.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds, A = ED.ai, K = ED.landkit;
  const TAU = U.TAU, V = 'v26', { L, dmgOf, eyes } = K;
  const glow = K.glow, mk = (w) => K.mk(w, V), register = K.register, relic = K.relic(V), mini = K.mini(V), mod = K.mod(V);
  const idx = (tx, ty) => ty * C.COLS + tx, tileOf = (x, y) => idx(Math.floor(x / 32), Math.floor(y / 32)), tc = (v) => Math.floor(v / 32) * 32 + 16;
  const live = (room) => room.type === 'normal' || room.type === 'challenge';        // the land's rule runs in ordinary combat rooms only (a boss's arena is its own)

  P.define({
    id: 'v26', name: 'WORLDS V', tag: 'a chessboard, plates, a rite, a clock', color: '#ffd8a0',
    blurb: 'Four more lands behind v17\'s doors: the Gambit Hall (a board that bites one colour at a time; foes move like pieces), the Counterweight Keep (plates, portcullises and blocks guard optional treasure), the Hollow Rite (a ritual circle that calls a Herald) and the Eclipse Orchard (a day-and-night clock). Four foes, a trait, a mini boss and a relic each; every puzzle is optional.',
  });

  // ==================================================================== the doors: a deed (a guardian felled on your last heart), a plumb bob to carry, a toll, a crack
  const R_ = ED.route;
  if (R_) {
    R_.DEEDS.gambit = { name: 'Gambit', door: 'It is open to those who played a piece they could not afford.', rumour: 'a guardian felled with one heart left', test: (g, T_) => { const cr = R_.cross(g); return !!(cr.gambit && cr.gambit[T_ - 1]); } };
    ED.hook('kill', V, (g, e) => { if (!(e.boss && !e.mini) || !R_.live || !R_.live(g) || g.player.dead || g.player.hp > 4) return; const cr = R_.cross(g), tier = W.tierOf(g.floorNum); if (!(cr.gambit && cr.gambit[tier])) { (cr.gambit = cr.gambit || {})[tier] = true; g.toast('GAMBIT! You won it with one heart to spare.', '#e8d8a0', 200); g.sfx('unlock'); } });
    R_.CURIOS.plumb = { name: 'Plumb Bob', color: '#b8c8d8', gain: 'A lead weight on a string. It always knows which way is down.', door: 'A string hangs from the lintel, with nothing tied to it.', rumour: 'a plumb bob, hanging straight' };
    R_.GLYPHS.curio.plumb = (c, r) => { c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r * 0.2); c.stroke(); c.beginPath(); c.moveTo(0, r * 0.2); c.lineTo(r * 0.45, r * 0.7); c.lineTo(0, r); c.lineTo(-r * 0.45, r * 0.7); c.closePath(); c.stroke(); };
  }
  const here = (g) => (g.floor ? W.at(g.floorNum) : null);
  const isLand = (g, id) => { const wi = here(g); return !!(wi && wi.w.id === id); };

  // ==================================================================== 9. THE GAMBIT HALL
  //  Every six seconds one colour of the board glows; two seconds later those squares bite (stand on the other colour: one step is always enough).  Foes are PIECES: they move one telegraphed square at a time.
  const lit = (g, rt) => (rt.board && rt.board.phase !== 'rest') ? rt.board.lit : -1;
  const onSquare = (x, y) => ((Math.floor(x / 32) + Math.floor(y / 32)) & 1);
  const BOARD = {
    setup(g, room, rt, rng) { rt.board = { phase: 'rest', t: 200 + rng.int(0, 140), lit: 0, hit: false, rng: rng.fork('board'), on: live(room) }; },
    tick(g, rt) {
      const b = rt.board; if (!b || !b.on || !rt.lockdown) return; const p = g.player; b.t -= g.ts;
      if (b.phase === 'rest' && b.t <= 0) { b.phase = 'glow'; b.lit = b.rng.chance(0.5) ? 0 : 1; b.t = 120; b.hit = false; g.sfx('telegraph', { vol: 0.4 }); }
      else if (b.phase === 'glow' && b.t <= 0) { b.phase = 'bite'; b.t = 26; g.shake(3); g.sfx('thud', { vol: 0.5 }); }
      else if (b.phase === 'bite') {
        if (!b.hit && !p.dead && onSquare(p.x, p.y) === b.lit && g.hurtPlayer(dmgOf(g, 1.3), p.x, p.y, { zone: true, noKnock: true })) b.hit = true;
        if (b.t <= 0) { b.phase = 'rest'; b.t = 330 + b.rng.int(0, 60); }
      }
    },
    under(g, c, t, rt) {
      const b = rt.board; if (!b || !b.on || b.phase === 'rest') return; const room = g.room, bite = b.phase === 'bite', k = bite ? 1 : 1 - b.t / 120;
      c.save();
      for (let ty = 1; ty < C.ROWS - 1; ty++) for (let tx = 1; tx < C.COLS - 1; tx++) {
        if (((tx + ty) & 1) !== b.lit) continue; const tl = room.tiles[idx(tx, ty)]; if (tl === T.WALL || tl === T.ROCK || tl === T.PIT || tl === T.DOOR) continue; const x = tx * 32, y = ty * 32;
        if (bite) { c.fillStyle = 'rgba(255,70,60,' + (0.4 + 0.3 * Math.sin(t * 0.8)) + ')'; c.fillRect(x, y, 32, 32); c.strokeStyle = 'rgba(255,230,200,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 6, y + 26); c.lineTo(x + 16, y + 6); c.lineTo(x + 26, y + 26); c.stroke(); }
        else { c.fillStyle = 'rgba(255,190,70,' + (0.10 + 0.22 * k) + ')'; c.fillRect(x, y, 32, 32); c.strokeStyle = 'rgba(255,214,120,' + (0.25 + 0.45 * k) + ')'; c.lineWidth = 1.5; c.strokeRect(x + 2.5, y + 2.5, 27, 27); c.beginPath(); c.moveTo(x + 4, y + 28); c.lineTo(x + 28, y + 4); c.stroke(); }
      }
      c.restore();
    },
  };
  // pieces move one square at a time, always to the centre of a tile
  const advance = (g, e) => { const m = e.mv; if (!m) return false; const sp = (e.rate || 1) / (e.rate0 || 1); m.t += g.ts * sp; const k = Math.min(1, m.t / m.dur), nx = U.lerp(m.sx, m.tx, k), ny = U.lerp(m.sy, m.ty, k); if (m.air || !ED.phys.blocked(g, nx, ny, e.r * 0.7, !!e.flying, false)) { e.x = nx; e.y = ny; } else if (k < 1) { e.mv = null; e.state = e.state === 'air' ? null : e.state; return false; } if (k >= 1) { e.mv = null; if (m.done) m.done(); } return true; };
  const goTo = (e, tx, ty, dur, air, done) => { e.mv = { sx: e.x, sy: e.y, tx: tx * 32 + 16, ty: ty * 32 + 16, t: 0, dur, air, done }; };
  const snap = (g, e) => { const nx = tc(e.x), ny = tc(e.y); if (!ED.phys.blocked(g, nx, ny, e.r * 0.7, false, false)) { e.x = nx; e.y = ny; } };
  const free = (g, tx, ty, r) => tx >= 1 && ty >= 1 && tx < C.COLS - 1 && ty < C.ROWS - 1 && !ED.phys.blocked(g, tx * 32 + 16, ty * 32 + 16, r || 12, false, false);
  const tcell = (v) => Math.floor(v / 32);
  const f9 = mk('gambit');
  register({
    pawn: f9({ name: 'Pawn', shape: 'circle', color: '#d8d0e0', r: 12, hp: 22, speed: 0, dmg: 2, shot: 3, cost: 1.6, weight: 12, minFloor: 6, group: 3,
      desc: 'Marches one square at a time toward you and strikes only on the diagonal: stand beside it, not across the corner. Mind the clock: a pawn that has crossed the board is promoted by its trait.',
      init(e, g) { e.cd = 30 + g.rng.int(0, 50); snap(g, e); },
      update(e, g) {
        const i = A.info(g, e), sp = (e.rate || 1) / (e.rate0 || 1); e.face = i.ang; if (advance(g, e)) return;
        const px = tcell(g.player.x), py = tcell(g.player.y), ex = tcell(e.x), ey = tcell(e.y), dx = px - ex, dy = py - ey;
        if (Math.abs(dx) === 1 && Math.abs(dy) === 1) { if ((e.cd -= g.ts * sp) <= 0) { e.cd = 90; g.zoneCircle(e, px * 32 + 16, py * 32 + 16, 26, g.tele(34), e.shotDmg * 1.1, { color: '#e8e0f0', burst: true }); g.sfx('telegraph', { vol: 0.3 }); } return; }
        if ((e.cd -= g.ts * sp) > 0) return; e.cd = 40;
        const opts = Math.abs(dx) >= Math.abs(dy) ? [[Math.sign(dx), 0], [0, Math.sign(dy)]] : [[0, Math.sign(dy)], [Math.sign(dx), 0]];
        for (const [sx, sy] of opts) if ((sx || sy) && free(g, ex + sx, ey + sy, e.r * 0.7) && !(ex + sx === px && ey + sy === py)) { goTo(e, ex + sx, ey + sy, 22); break; }
      },
      draw(c, e) { c.fillStyle = '#f0e8f8'; c.beginPath(); c.arc(e.x, e.y - e.r * 0.45, e.r * 0.38, 0, TAU); c.fill(); c.fillRect(e.x - e.r * 0.45, e.y + e.r * 0.45, e.r * 0.9, e.r * 0.22); eyes(c, e, 0.3); } }),
    knight: f9({ name: 'Knight', shape: 'diamond', color: '#b8b0d8', r: 14, hp: 34, speed: 0, dmg: 3, shot: 4, cost: 2.8, weight: 8, minFloor: 7,
      desc: 'Leaps in an L — two squares and one — and lands with a shockwave. The landing square is marked for a moment; while it is in the air it cannot be touched. Step out and strike when it lands.',
      init(e, g) { e.cd = 60 + g.rng.int(0, 60); snap(g, e); },
      update(e, g) {
        const i = A.info(g, e), sp = (e.rate || 1) / (e.rate0 || 1); e.face = i.ang;
        if (e.state === 'air') { if (!advance(g, e) || !e.mv) { e.state = null; e.invuln = false; e.noContact = false; e.cd = 120; g.zoneCircle(e, e.x, e.y, 62, 3, e.shotDmg * 1.0, { color: '#c8c0f0', burst: true }); g.shake(4); g.sfx('thud', { vol: 0.5 }); } else e.noContact = true; return; }
        if (e.state === 'tell') { e.windup -= g.ts * sp; if (e.windup <= 0) { e.state = 'air'; e.invuln = true; e.noContact = true; goTo(e, e.dest[0], e.dest[1], 20, true); g.sfx('lunge', { vol: 0.5 }); } return; }
        if (advance(g, e)) return; if ((e.cd -= g.ts * sp) > 0) return;
        const ex = tcell(e.x), ey = tcell(e.y), px = tcell(g.player.x), py = tcell(g.player.y); let best = null, bd = 1e9;
        for (const [a, b] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const tx = ex + a, ty = ey + b; if (!free(g, tx, ty, e.r * 0.7)) continue; const d = Math.hypot(tx - px, ty - py); if (d < bd) { bd = d; best = [tx, ty]; } }
        if (!best) { e.cd = 30; return; } e.dest = best; e.state = 'tell'; e.windup = g.tele(42); g.zoneCircle(e, best[0] * 32 + 16, best[1] * 32 + 16, 62, e.windup, 0, { color: '#c8c0f0', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 });
      },
      draw(c, e) { c.fillStyle = 'rgba(30,24,50,0.8)'; c.beginPath(); c.moveTo(e.x - e.r * 0.5, e.y + e.r * 0.5); c.lineTo(e.x - e.r * 0.2, e.y - e.r * 0.6); c.lineTo(e.x + e.r * 0.35, e.y - e.r * 0.5); c.lineTo(e.x + e.r * 0.6, e.y - e.r * 0.1); c.lineTo(e.x + e.r * 0.2, e.y); c.lineTo(e.x + e.r * 0.3, e.y + e.r * 0.5); c.closePath(); c.fill(); eyes(c, e, 0.3); } }),
    bishop: f9({ name: 'Bishop', shape: 'tri', color: '#e0c8a8', r: 13, hp: 28, speed: 0, dmg: 3, shot: 3.5, cost: 2.6, weight: 9, minFloor: 7,
      desc: 'Slides along the diagonals of the board. It chooses a diagonal, marks the whole line for a moment, then dashes the length of it. Leave the line and it is only a tired old man in a tall hat.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); snap(g, e); },
      update(e, g) {
        const i = A.info(g, e), sp = (e.rate || 1) / (e.rate0 || 1); e.face = i.ang;
        if (e.state === 'dash') { const m = A.walk(g, e, e.dAng, 5.4 * e.spdMul); e.sT -= g.ts; if (m.bx || m.by || e.sT <= 0) { e.state = 'spent'; e.sT = 40; e.vuln = 1.3; snap(g, e); } return; }
        if (e.state === 'spent') { e.sT -= g.ts; if (e.sT <= 0) { e.state = null; e.vuln = 1; e.cd = 110; } return; }
        if (e.state === 'wind') { e.windup -= g.ts * sp; if (e.windup <= 0) { e.state = 'dash'; e.sT = 60; g.sfx('lunge', { vol: 0.5 }); } return; }
        if (advance(g, e)) return;
        const px = tcell(g.player.x), py = tcell(g.player.y), ex = tcell(e.x), ey = tcell(e.y);
        if ((e.cd -= g.ts * sp) > 0) { if ((g.frame + e.id) % 50 === 0) { const dx = Math.sign(px - ex) || 1, dy = Math.sign(py - ey) || 1; if (free(g, ex + dx, ey + dy, e.r * 0.7)) goTo(e, ex + dx, ey + dy, 24); } return; }
        let best = 0, bd = 1e9; for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a); const t = Math.abs((g.player.x - e.x) * uy - (g.player.y - e.y) * ux); if (t < bd) { bd = t; best = a; } }
        e.dAng = best; e.state = 'wind'; e.windup = g.tele(44); let L2 = 0; for (let s = 24; s < 900; s += 16) { if (ED.phys.blocked(g, e.x + Math.cos(best) * s, e.y + Math.sin(best) * s, e.r * 0.6, false, false)) break; L2 = s; }
        g.zoneLine(e, e.x, e.y, e.x + Math.cos(best) * L2, e.y + Math.sin(best) * L2, 24, e.windup, 0, { color: '#e8d0a8', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 });
      },
      draw(c, e) { c.fillStyle = 'rgba(40,30,20,0.7)'; c.beginPath(); c.moveTo(e.x, e.y - e.r * 0.9); c.lineTo(e.x + e.r * 0.3, e.y - e.r * 0.2); c.lineTo(e.x - e.r * 0.3, e.y - e.r * 0.2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(40,30,20,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x - e.r * 0.1, e.y - e.r * 0.65); c.lineTo(e.x + e.r * 0.1, e.y - e.r * 0.45); c.stroke(); if (e.state === 'spent') { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('SPENT', e.x, e.y - e.r - 6); } eyes(c, e, 0.25); } }),
    rook: f9({ name: 'Rook', shape: 'square', color: '#9a96b0', r: 15, hp: 40, speed: 0, dmg: 4, shot: 4.5, cost: 3.2, weight: 7, minFloor: 8,
      desc: 'Holds a row or a column and waits for you to step into it, then marks the whole line and charges the length of the room. It cannot turn. Be somewhere else.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); snap(g, e); },
      update(e, g) {
        const i = A.info(g, e), sp = (e.rate || 1) / (e.rate0 || 1); e.face = i.ang;
        if (e.state === 'dash') { const m = A.walk(g, e, e.dAng, 6.0 * e.spdMul); e.sT -= g.ts; if (m.bx || m.by || e.sT <= 0) { e.state = 'spent'; e.sT = 46; e.vuln = 1.35; g.shake(4); snap(g, e); } return; }
        if (e.state === 'spent') { e.sT -= g.ts; if (e.sT <= 0) { e.state = null; e.vuln = 1; e.cd = 120; } return; }
        if (e.state === 'wind') { e.windup -= g.ts * sp; if (e.windup <= 0) { e.state = 'dash'; e.sT = 90; g.sfx('lunge', { vol: 0.6 }); } return; }
        if (advance(g, e)) return;
        const px = tcell(g.player.x), py = tcell(g.player.y), ex = tcell(e.x), ey = tcell(e.y);
        if ((e.cd -= g.ts * sp) > 0) { if ((g.frame + e.id) % 70 === 0 && Math.abs(px - ex) > 1 && Math.abs(py - ey) > 1) { const sx = Math.abs(px - ex) < Math.abs(py - ey) ? Math.sign(px - ex) : 0, sy = sx ? 0 : Math.sign(py - ey); if (free(g, ex + sx, ey + sy, e.r * 0.7)) goTo(e, ex + sx, ey + sy, 26); } return; }
        const inCol = Math.abs(px - ex) <= 1, inRow = Math.abs(py - ey) <= 1; if (!inCol && !inRow) { e.cd = 20; return; }
        e.dAng = inRow && (!inCol || Math.abs(px - ex) > Math.abs(py - ey)) ? (px > ex ? 0 : Math.PI) : (py > ey ? Math.PI / 2 : -Math.PI / 2); e.state = 'wind'; e.windup = g.tele(48);
        let L2 = 0; for (let s = 24; s < 1000; s += 16) { if (ED.phys.blocked(g, e.x + Math.cos(e.dAng) * s, e.y + Math.sin(e.dAng) * s, e.r * 0.7, false, false)) break; L2 = s; }
        g.zoneLine(e, e.x, e.y, e.x + Math.cos(e.dAng) * L2, e.y + Math.sin(e.dAng) * L2, 36, e.windup, 0, { color: '#ff7a6a', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.5 });
      },
      draw(c, e) { c.fillStyle = 'rgba(30,26,44,0.8)'; for (const k of [-1, 0, 1]) c.fillRect(e.x + k * e.r * 0.55 - e.r * 0.14, e.y - e.r - 2, e.r * 0.28, e.r * 0.3); if (e.state === 'spent') { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('SPENT', e.x, e.y - e.r - 12); } eyes(c, e, 0.28); } }),
  });
  mod({ id: 'promoted', name: 'Promoted', color: '#ffe9a0', glyph: '♛', desc: 'After six squares it is promoted: faster, harder, and gold',
    apply(e) { e.walked = 0; },
    update(e, g) {
      if (e.lx !== undefined) e.walked += Math.hypot(e.x - e.lx, e.y - e.ly); e.lx = e.x; e.ly = e.y;
      if (!e.promoted && e.walked >= 192) { e.promoted = true; e.dmg *= 1.3; e.shotDmg *= 1.3; e.color = '#ffd24a'; g.addText(e.x, e.y - e.r - 14, 'PROMOTED', '#ffd24a', 13); g.sfx('levelup', { vol: 0.4 }); g.burst(e.x, e.y, 14, '#ffd24a', 3, 22); }
      if (e.promoted) { e.spdMul *= 1.6; e.rate = e.rate0 * 1.6; }
    } });
  const arbiter = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#e8e0f0'; c.beginPath(); c.moveTo(x - r * 0.9, y + r); c.lineTo(x - r * 0.45, y - r * 0.3); c.lineTo(x + r * 0.45, y - r * 0.3); c.lineTo(x + r * 0.9, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#10101a'; c.fillRect(x - r * 0.62, y + r * 0.05, r * 0.28, r * 0.9); c.fillRect(x - r * 0.1, y + r * 0.05, r * 0.28, r * 0.9); c.fillRect(x + r * 0.42, y + r * 0.05, r * 0.2, r * 0.9);
    c.fillStyle = '#e8c8a0'; c.beginPath(); c.arc(x, y - r * 0.62, r * 0.4, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#10101a'; c.fillRect(x - r * 0.42, y - r * 0.95, r * 0.84, r * 0.22);
    c.strokeStyle = '#e8d8a0'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + r * 0.9, y - r * 0.9); c.lineTo(x + r * 0.9, y + r * 0.4); c.stroke(); c.fillStyle = '#e8d8a0'; c.fillRect(x + r * 0.7, y - r * 1.05, r * 0.4, r * 0.18); c.lineWidth = 3; c.strokeStyle = dk;
  };
  ED.bossDraw.arbiter = arbiter;
  mini({ id: 'arbiter', name: 'The Arbiter', title: 'Who Calls the Move', color: '#e8d8a0', r: 26, hp: 215, arena: 'arena_grid', shape: 'arbiter', minFloor: 7, unlockText: 'Castling Charm',
    attacks: { ranks: L('bars', { n: 4, thick: 44, gapW: 150, warn: 62, color: '#e8d8a0' }), rule: L('slamRing', { r: 88, tele: 36, rings: 2, speed: 3, color: '#e8d8a0' }), ruling: L('fan', { n: 5, spread: 0.26, reps: 2, speed: 2.9, color: '#f0e8c0' }), pieces: L('summon', { types: ['pawn'], n: 2, max: 4, hpMul: 0.8 }), hail: L('rain', { n: 8, r: 42, warn: 48, interval: 7, aimed: 0.6, color: '#e8d8a0' }) },
    phases: [{ at: 1, name: 'Opening', attacks: ['ruling', 'rule', 'pieces'], idle: [34, 56] }, { at: 0.5, name: 'Endgame', attacks: ['ranks', 'hail', 'rule', 'ruling', 'pieces'], idle: [24, 42] }] });
  relic('castling', { id: 'castling', name: 'Castling Charm', rarity: 'rare', color: '#e8d8a0', mods: { dashDist: 0.15, speed: 0.04, luck: 1 }, max: 1, unlock: 'mini:arbiter', desc: 'A longer dash, quicker feet and a little luck: a move that is not on the board. (Unlockable)' });
  W.add({ id: 'gambit', name: 'The Gambit Hall', short: 'GAMBIT HALL', color: '#e8d8a0', pack: V, native: 6, tiers: [1, 99], risk: 1, gate: { kind: 'deed', id: 'gambit' },
    rule: 'The board bites one colour at a time: a colour glows for two seconds, then its squares strike (one step to the other colour is always enough). Foes are pieces: one telegraphed square at a time.',
    enemies: ['pawn', 'knight', 'bishop', 'rook'], mod: 'promoted', minis: ['arbiter'], hz: BOARD, music: { scale: 1, root: 38, bpm: 6, prog: [0, 5, 3, 4] },
    theme: { name: 'The Gambit Hall', floorA: '#26222e', floorB: '#352f40', wall: '#4a4258', wallTop: '#a898c8', accent: '#e8d8a0', glow: '#f0e8c0', fog: '#0c0a12', skin: { pattern: 'checker', wall: 'marble', ambience: 'dust', ambient: '#c8c0e0', dim: 0.05 } } });

  // ==================================================================== 10. THE COUNTERWEIGHT KEEP
  //  Six in ten ordinary rooms hold a PUZZLE: a walled alcove with a portcullis (and a chest inside), a pressure plate somewhere on the floor, two stone blocks and a lever.  The portcullis is up while anything heavy stands on the plate —
  //  you, a foe on the ground, a block.  PUSH a block with E (one square, away from you); the lever stands them all back at their homes.  Nothing here is ever required; the room clears and the doors open whatever you do.
  const tpos = (i) => ({ x: (i % C.COLS) * 32 + 16, y: ((i / C.COLS) | 0) * 32 + 16 });
  const plateOn = (g, pl) => {
    const p = g.player; if (!p.dead && Math.abs(p.x - pl.x) < 17 && Math.abs(p.y - pl.y) < 17) return true;
    for (const e of g.enemies) if (!e.dead && (!e.flying || e.heavy) && !e.boss && Math.abs(e.x - pl.x) < 18 && Math.abs(e.y - pl.y) < 18) return true;
    const kp = g.rt && g.rt.keep; if (kp) for (const b of kp.blocks) if (b.i === pl.i) return true;
    return false;
  };
  function setGate(g, kp, open) { const gt = kp.gate; if (!gt || gt.open === open) return; if (!open) { const c = tpos(gt.i); if (Math.hypot(g.player.x - c.x, g.player.y - c.y) < 30) return; for (const e of g.enemies) if (!e.dead && !e.flying && Math.hypot(e.x - c.x, e.y - c.y) < e.r + 22) return; } gt.open = open; g.room.tiles[gt.i] = open ? T.FLOOR : T.WALL; g.refreshCollision(); g.sfx(open ? 'door' : 'thud', { vol: 0.4 }); g.burst(tpos(gt.i).x, tpos(gt.i).y, 6, '#b8c0c8', 2, 14); }
  /** move a block one square (dx, dy in {-1,0,1}); false (with a reason) when it must not go */
  function moveBlock(g, rt, b, dx, dy) {
    const kp = rt.keep, room = g.room, tx = (b.i % C.COLS) + dx, ty = ((b.i / C.COLS) | 0) + dy, to = idx(tx, ty);
    if (tx < 2 || ty < 2 || tx > C.COLS - 3 || ty > C.ROWS - 3 || (room.tiles[to] !== T.FLOOR && room.tiles[to] !== T.RUG)) return false;
    if (K.inDoorZone(rt, tx, ty, 1) || K.tileBusy(g, to, true, 26) || (kp.gate && Math.abs(tx - (kp.gate.i % C.COLS)) <= 1 && Math.abs(ty - ((kp.gate.i / C.COLS) | 0)) <= 1)) return false;
    room.tiles[b.i] = T.FLOOR; if (!K.noPockets(g, [to])) { room.tiles[b.i] = T.ROCK; return false; }
    room.tiles[to] = T.ROCK; b.i = to; if (b.it) { const c = tpos(to); b.it.x = c.x; b.it.y = c.y; } g.refreshCollision(); g.sfx('thud', { vol: 0.4 }); g.shake(1); g.burst(tpos(to).x, tpos(to).y, 5, '#9a9aa8', 2, 12); return true;
  }
  function resetBlocks(g, rt) {
    const kp = rt.keep, room = g.room; for (const b of kp.blocks) room.tiles[b.i] = T.FLOOR;
    for (const b of kp.blocks) { let to = b.home; if (K.tileBusy(g, to, true, 26)) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t2 = to + dy * C.COLS + dx; if (room.tiles[t2] === T.FLOOR && !K.tileBusy(g, t2, true, 26) && !kp.blocks.some(o => o !== b && o.i === t2)) { to = t2; break; } } b.i = to; room.tiles[to] = T.ROCK; if (b.it) { const c = tpos(to); b.it.x = c.x; b.it.y = c.y; } }
    g.refreshCollision(); g.sfx('door', { vol: 0.5 }); g.addText(g.player.x, g.player.y - 28, 'the weights settle', '#b8c0c8', 11);
  }
  const KEEP = {
    setup(g, room, rt, rng) {
      const kp = rt.keep = { on: live(room), plates: [], blocks: [], gate: null, cage: null, lever: null, any: false, rng: rng.fork('keep') }; if (!kp.on || !rng.chance(0.6)) return;
      const tiles = room.tiles, cands = []; for (let x0 = 2; x0 <= C.COLS - 6; x0++) { if (Math.abs((x0 + 2) * 32 - 480) < 190) continue; cands.push([x0, 2, 'S']); cands.push([x0, C.ROWS - 6, 'N']); } for (let y0 = 3; y0 <= C.ROWS - 7; y0++) { cands.push([2, y0, 'E']); cands.push([C.COLS - 6, y0, 'W']); } rng.shuffle(cands);
      for (const [x0, y0, side] of cands.slice(0, 40)) {
        const ring = [], inner = []; let bad = false;
        for (let y = y0; y < y0 + 4 && !bad; y++) for (let x = x0; x < x0 + 4; x++) { const i = idx(x, y); if (tiles[i] !== T.FLOOR || K.inDoorZone(rt, x, y, 0) || (Math.abs(x * 32 + 16 - 480) < 130 && Math.abs(y * 32 + 16 - 288) < 100)) { bad = true; break; } (x > x0 && x < x0 + 3 && y > y0 && y < y0 + 3 ? inner : ring).push(i); }
        if (bad || ring.length !== 12) continue;
        const gi = side === 'S' ? idx(x0 + 1, y0 + 3) : side === 'N' ? idx(x0 + 1, y0) : side === 'E' ? idx(x0 + 3, y0 + 1) : idx(x0, y0 + 1), walls = ring.filter(i => i !== gi);
        // blocks and the plate: open floor, away from the cage, the middle and the doors
        const spots = W.spots(rt, kp.rng, 8, 70).filter(s => Math.hypot(s.x - (x0 + 2) * 32, s.y - (y0 + 2) * 32) > 150 && tileOf(s.x, s.y) !== tileOf(g.player.x, g.player.y) && !K.inDoorZone(rt, Math.floor(s.x / 32), Math.floor(s.y / 32), 2) && s.x > 80 && s.x < 880 && s.y > 80 && s.y < 500);
        if (spots.length < 4) continue; const plate = spots[0], bl = spots.slice(1, 3).map(s => tileOf(s.x, s.y)), cand = walls.concat(bl);
        if (!K.noPockets(g, cand, inner.concat([gi]))) continue;
        for (const i of walls) tiles[i] = T.WALL; tiles[gi] = T.WALL; kp.cage = { x0, y0, inner, ring: walls, gate: gi }; kp.gate = { i: gi, open: false };
        const pc = tpos(tileOf(plate.x, plate.y)); kp.plates.push({ i: tileOf(plate.x, plate.y), x: pc.x, y: pc.y, on: false });
        for (const i of bl) { tiles[i] = T.ROCK; const b = { i, home: i, it: null }; const c = tpos(i); b.it = g.addInter({ type: 'keepblock', x: c.x, y: c.y, r: 18, range: 44, color: '#9a9aa8', prompt: () => 'Push', use: (gg, it) => { const p = gg.player, dx = it.x - p.x, dy = it.y - p.y, h = Math.abs(dx) >= Math.abs(dy); if (!moveBlock(gg, rt, b, h ? Math.sign(dx) : 0, h ? 0 : Math.sign(dy))) { gg.sfx('deny', { vol: 0.4 }); gg.addText(it.x, it.y - 22, 'it will not budge', '#b8b8c8', 10); } } }); kp.blocks.push(b); }
        const lv = spots[3]; kp.lever = g.addInter({ type: 'keeplever', x: lv.x, y: lv.y, r: 14, range: 44, color: '#d8c890', prompt: () => 'Pull the lever (stand the blocks back)', use: (gg) => resetBlocks(gg, rt) });
        const cc = { x: (x0 + 2) * 32, y: (y0 + 2) * 32 }; g.spawnLootChest(cc.x, cc.y);
        rt.spawnTiles = rt.spawnTiles.filter(t => Math.abs(t.x - cc.x) > 110 || Math.abs(t.y - cc.y) > 110);
        return;
      }
    },
    tick(g, rt) {
      const kp = rt.keep; if (!kp || !kp.cage) return; let any = false; for (const pl of kp.plates) { const on = plateOn(g, pl); if (on !== pl.on) { pl.on = on; g.sfx('ui', { vol: 0.3 }); g.burst(pl.x, pl.y, on ? 6 : 3, on ? '#ffe8a0' : '#8a8a98', 1.6, 12); } if (on) any = true; }
      kp.any = any; setGate(g, kp, any);
    },
    under(g, c, t, rt) {
      const kp = rt.keep; if (!kp || !kp.cage) return; c.save();
      for (const pl of kp.plates) { const x = pl.x - 15, y = pl.y - 15; c.fillStyle = pl.on ? '#7a7a58' : '#5a5a66'; c.fillRect(x, y + (pl.on ? 2 : 0), 30, 30); c.fillStyle = pl.on ? 'rgba(255,232,160,0.55)' : 'rgba(255,255,255,0.12)'; c.fillRect(x + 3, y + (pl.on ? 5 : 3), 24, 3); c.strokeStyle = pl.on ? '#ffe8a0' : '#3a3a48'; c.lineWidth = 2; c.strokeRect(x + 4, y + 4, 22, 22); c.beginPath(); c.moveTo(pl.x - 6, pl.y); c.lineTo(pl.x + 6, pl.y); c.moveTo(pl.x, pl.y - 6); c.lineTo(pl.x, pl.y + 6); c.stroke(); if (pl.on) glow(c, pl.x, pl.y, 40, '#ffd070', 0.3); }
      const gt = kp.gate, gp = tpos(gt.i), cg = kp.cage; c.strokeStyle = 'rgba(60,64,76,0.9)'; c.lineWidth = 2;
      if (gt.open) { c.fillStyle = 'rgba(255,224,150,0.12)'; c.fillRect(cg.x0 * 32 + 32, cg.y0 * 32 + 32, 64, 64); } else { c.fillStyle = '#3a3e4a'; c.fillRect(gp.x - 16, gp.y - 16, 32, 32); c.strokeStyle = '#a8b0bc'; c.lineWidth = 3; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(gp.x - 12 + k * 8, gp.y - 16); c.lineTo(gp.x - 12 + k * 8, gp.y + 16); c.stroke(); } c.strokeStyle = '#6a7080'; c.lineWidth = 2; c.beginPath(); c.moveTo(gp.x - 16, gp.y - 5); c.lineTo(gp.x + 16, gp.y - 5); c.moveTo(gp.x - 16, gp.y + 7); c.lineTo(gp.x + 16, gp.y + 7); c.stroke(); }
      for (const b of kp.blocks) { const q = tpos(b.i), x = q.x - 16, y = q.y - 16; const gr = c.createLinearGradient(x, y, x + 32, y + 32); gr.addColorStop(0, '#a8aab8'); gr.addColorStop(1, '#5a5c6c'); c.fillStyle = gr; c.fillRect(x, y, 32, 32); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x + 1, y + 1, 30, 3); c.fillRect(x + 1, y + 1, 3, 30); c.strokeStyle = '#2a2c38'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, 30, 30); c.strokeStyle = 'rgba(40,40,56,0.6)'; c.beginPath(); c.moveTo(q.x - 7, q.y); c.lineTo(q.x + 7, q.y); c.moveTo(q.x, q.y - 7); c.lineTo(q.x, q.y + 7); c.stroke(); if (b.i === (kp.plates[0] && kp.plates[0].i)) glow(c, q.x, q.y, 30, '#ffd070', 0.2); }
      c.restore();
    },
  };
  ED.interDraw.keepblock = () => { /* drawn by the room (under) so it can sit on a plate */ };
  ED.interDraw.keeplever = (c, it, t) => { c.fillStyle = '#4a4a56'; c.fillRect(it.x - 12, it.y + 4, 24, 8); c.strokeStyle = '#d8c890'; c.lineWidth = 4; c.beginPath(); c.moveTo(it.x, it.y + 6); c.lineTo(it.x + 8 + Math.sin(t * 0.05) * 1, it.y - 12); c.stroke(); c.fillStyle = '#e8d8a0'; c.beginPath(); c.arc(it.x + 8, it.y - 12, 4, 0, TAU); c.fill(); };
  const f10 = mk('counterweight');
  register({
    pistoneer: f10({ name: 'Pistoneer', shape: 'square', color: '#8a7a6a', r: 15, hp: 36, speed: 0, dmg: 3, shot: 4, cost: 2.8, weight: 8, minFloor: 7,
      desc: 'A ram on a rail. It marks a straight lane toward you and thrusts along it; every few seconds, or twice as fast while any plate in the room is pressed. Leave the lane, then hit it from the side.',
      init(e, g) { e.anchored = true; e.cd = 80 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), kp = g.rt && g.rt.keep; e.face = i.ang; const sp = kp && kp.any ? 2 : 1;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 210; g.sfx('thud', { vol: 0.6 }); g.shake(3); e.rod = 14; } return; }
        if (e.rod > 0) e.rod -= g.ts; if ((e.cd -= g.ts * sp) > 0 || i.d > 520) return;
        const h = Math.abs(i.dx) >= Math.abs(i.dy), sx = h ? Math.sign(i.dx) : 0, sy = h ? 0 : Math.sign(i.dy); e.state = 'wind'; e.windup = g.tele(34); e.lane = [sx, sy]; const x0 = e.x + sx * e.r, y0 = e.y + sy * e.r, L2 = 300;
        g.zoneRect(e, h ? Math.min(x0, x0 + sx * L2) : x0 - 22, h ? y0 - 22 : Math.min(y0, y0 + sy * L2), h ? L2 : 44, h ? 44 : L2, e.windup, e.shotDmg * 1.3, { color: '#c8a888', burst: true }); g.sfx('telegraph', { vol: 0.4 });
      },
      draw(c, e) { const l = e.lane || [1, 0], ext = e.state === 'wind' ? 0 : (e.rod > 0 ? e.rod * 3 : 0); c.fillStyle = '#4a4238'; c.fillRect(e.x - e.r * 0.4 + l[0] * (e.r * 0.8 + ext) - (l[0] ? 0 : 0), e.y - e.r * 0.25 + l[1] * (e.r * 0.8 + ext), e.r * 0.8, e.r * 0.5); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.strokeRect(e.x - e.r * 0.8, e.y - e.r * 0.8, e.r * 1.6, e.r * 1.6); eyes(c, e, 0.3); } }),
    winchrat: f10({ name: 'Winch Rat', shape: 'blob', color: '#8a7a5a', r: 9, hp: 14, speed: 1.9, dmg: 2, shot: 2, cost: 1.6, weight: 12, minFloor: 6, group: 3,
      desc: 'A rope-chewing rat with a hook in its teeth. It snatches at a stone block and drags it a square toward you — which may help, may hurt, and never seals a door. Kill it before the room fills with stone.',
      init(e, g) { e.cd = 120 + g.rng.int(0, 120); },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt, kp = rt && rt.keep; e.face = i.ang;
        if (kp && kp.blocks.length && (e.cd -= g.ts) <= 0) { const b = kp.blocks.map(b => ({ b, d: Math.hypot(tpos(b.i).x - e.x, tpos(b.i).y - e.y) })).sort((a, c) => a.d - c.d)[0]; if (b && b.d < 240) { e.cd = 220; const q = tpos(b.b.i), dx = g.player.x - q.x, dy = g.player.y - q.y, h = Math.abs(dx) >= Math.abs(dy); g.zoneLine(e, e.x, e.y, q.x, q.y, 6, 20, 0, { color: '#c8b080', hurts: false, burst: false }); const bb = b.b, sx = h ? Math.sign(dx) : 0, sy = h ? 0 : Math.sign(dy); g.after(20, () => { if (!e.dead && g.rt === rt) moveBlock(g, rt, bb, sx, sy); }); } else e.cd = 60; }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.2 + e.seed) * 0.5);
      },
      draw(c, e) { c.strokeStyle = '#c8b080'; c.lineWidth = 2; c.beginPath(); c.arc(e.x + Math.cos(e.face) * e.r * 1.2, e.y + Math.sin(e.face) * e.r * 1.2, 4, 0.5, 5.5); c.stroke(); eyes(c, e, 0.35); } }),
    gargoyle: f10({ name: 'Gargoyle Weight', shape: 'hex', color: '#8a8ea0', r: 15, hp: 40, speed: 1.2, dmg: 3, shot: 4, cost: 3.2, weight: 7, minFloor: 8, flying: true,
      desc: 'A winged stone weight. It hovers, marks a circle on the floor — on a pressure plate if it can find one, otherwise on you — and drops. It lies grounded and heavy for two seconds before it can fly again.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), kp = g.rt && g.rt.keep; e.face = i.ang;
        if (e.state === 'rest') { e.sT -= g.ts; e.vuln = 1.3; if (e.sT <= 0) { e.state = null; e.flying = true; e.vuln = 1; e.cd = 140; } return; }
        if (e.state === 'tell') { e.windup -= g.ts; if (e.windup <= 0) { e.state = 'rest'; e.sT = 120; e.flying = false; e.x = e.dest[0]; e.y = e.dest[1]; g.zoneCircle(e, e.x, e.y, 46, 3, e.shotDmg * 1.4, { color: '#c8ccdc', burst: true }); g.shake(5); g.sfx('thud', { vol: 0.7 }); } return; }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.1) * 0.4);
        if ((e.cd -= g.ts) <= 0) { let tx = g.player.x, ty = g.player.y; if (kp && kp.plates.length && g.rng.chance(0.8)) { const pl = kp.plates.filter(q => !q.on)[0]; if (pl) { tx = pl.x; ty = pl.y; } } if (!ED.phys.blocked(g, tx, ty, 14, false, false)) { e.state = 'tell'; e.windup = g.tele(46); e.dest = [tx, ty]; g.zoneCircle(e, tx, ty, 46, e.windup, 0, { color: '#c8ccdc', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); } else e.cd = 40; }
      },
      draw(c, e) { c.fillStyle = 'rgba(40,44,60,0.7)'; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(e.x + sg * e.r * 0.6, e.y - e.r * 0.2); c.lineTo(e.x + sg * e.r * 1.5, e.y - e.r * 0.9); c.lineTo(e.x + sg * e.r * 1.2, e.y + e.r * 0.3); c.closePath(); c.fill(); } if (e.state === 'rest') { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('HEAVY', e.x, e.y - e.r - 6); } eyes(c, e, 0.3); } }),
    keyward: f10({ name: 'Keyward', shape: 'tri', color: '#b0a070', r: 13, hp: 32, speed: 0.8, dmg: 2, shot: 3, cost: 2.6, weight: 9, minFloor: 7,
      desc: 'Stands guard beside a pressure plate and cannot be hurt while that plate is unpressed — stand on it yourself, or put something heavy there. If the room has no plate, or the fight drags on, the ward drops.',
      init(e, g) { e.cd = 70; e.ward0 = 0; },
      update(e, g) {
        const i = A.info(g, e), kp = g.rt && g.rt.keep; e.face = i.ang; e.fT = (e.fT || 0) + g.ts; const pl = kp && kp.plates.filter(q => Math.hypot(q.x - e.x, q.y - e.y) < 190).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
        e.invuln = !!pl && !pl.on && e.fT < 2400; if (pl) { const dg = Math.hypot(pl.x - e.x, pl.y - e.y); if (dg > 70) A.walk(g, e, Math.atan2(pl.y - e.y, pl.x - e.x), e.curSpeed); } else A.chase(g, e, i, e.curSpeed, 0);
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 160 / e.rate; for (let k = -1; k <= 1; k++) g.eShot(e, e.aim + k * 0.22, 3.0, { dmg: 1, color: '#e8d890', r: 5 }); g.sfx('shoot', { vol: 0.4 }); } return; }
        if ((e.cd -= g.ts) <= 0 && i.d < 360 && A.clear(g, e.x, e.y, g.player.x, g.player.y, false)) { e.state = 'wind'; e.windup = g.tele(30); e.aim = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 280, e.y + Math.sin(i.ang) * 280, 10, e.windup, 0, { color: '#e8d890', hurts: false, burst: false }); }
      },
      draw(c, e) { if (e.invuln) { c.strokeStyle = 'rgba(255,230,150,' + (0.5 + 0.2 * Math.sin(e.t * 0.2)) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, e.r + 6, 0, TAU); c.stroke(); } c.strokeStyle = '#6a5a30'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y - e.r * 0.2, e.r * 0.3, 0, TAU); c.moveTo(e.x, e.y + e.r * 0.1); c.lineTo(e.x, e.y + e.r * 0.6); c.stroke(); eyes(c, e, 0.25); } }),
  });
  mod({ id: 'ballasted', name: 'Ballasted', color: '#b8bcc8', glyph: '⚓', desc: 'Weighted with lead: it cannot be knocked back, presses plates even in the air, and is a quarter tougher',
    apply(e) { e.heavy = true; e.kbRes = 1; e.maxHp *= 1.25; e.hp = e.maxHp; } });
  const warden = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#5a5e70'; c.beginPath(); c.moveTo(x - r * 0.9, y + r); c.lineTo(x - r * 0.6, y - r * 0.3); c.lineTo(x + r * 0.6, y - r * 0.3); c.lineTo(x + r * 0.9, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#8a8ea0'; c.beginPath(); c.arc(x, y - r * 0.6, r * 0.42, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#2a2c38'; c.fillRect(x - r * 0.3, y - r * 0.7, r * 0.6, r * 0.14);
    const sw = Math.sin(t * 0.06) * 0.5; for (const sg of [-1, 1]) { c.strokeStyle = '#a8aab8'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + sg * r * 0.8, y - r * 0.3); c.lineTo(x + sg * (r * 1.1 + sw * r * 0.3), y + r * 0.3); c.stroke(); c.fillStyle = '#6a6e80'; c.beginPath(); c.arc(x + sg * (r * 1.1 + sw * r * 0.3), y + r * 0.55, r * 0.3, 0, TAU); c.fill(); c.stroke(); } c.lineWidth = 3; c.strokeStyle = dk;
  };
  ED.bossDraw.warden = warden;
  mini({ id: 'weightwarden', name: 'The Warden of Weights', title: 'Who Keeps the Balance', color: '#b8bcc8', r: 28, hp: 225, arena: 'arena_pillars', shape: 'warden', minFloor: 7, unlockText: 'Iron Ballast',
    attacks: { drop: L('slamRing', { r: 92, tele: 38, rings: 2, speed: 3, color: '#b8bcc8' }), weights: L('rain', { n: 9, r: 46, warn: 50, interval: 7, aimed: 0.7, color: '#b8bcc8' }), bars: L('bars', { n: 3, thick: 46, gapW: 160, warn: 66, color: '#b8bcc8' }), fan: L('fan', { n: 5, spread: 0.24, reps: 2, speed: 2.8, color: '#d8dce8' }), rats: L('summon', { types: ['winchrat'], n: 3, max: 5, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'Even Scales', attacks: ['drop', 'fan', 'rats'], idle: [32, 54] }, { at: 0.5, name: 'Tipped', attacks: ['drop', 'weights', 'bars', 'fan', 'rats'], idle: [22, 40] }] });
  relic('ballast', { id: 'ballast', name: 'Iron Ballast', rarity: 'rare', color: '#b8bcc8', mods: { kb: 0.25, def: 1, dmg: 0.04 }, max: 2, unlock: 'mini:weightwarden', desc: 'Heavier blows that shove harder, a little more staying power. (Unlockable)' });
  W.add({ id: 'counterweight', name: 'The Counterweight Keep', short: 'COUNTERWEIGHT KEEP', color: '#b8bcc8', pack: V, native: 6, tiers: [1, 99], risk: 0, gate: { kind: 'carry', id: 'plumb' },
    rule: 'Pressure plates, portcullises and stone blocks guard optional treasure: a cage opens while something heavy (you, a foe, a block) stands on its plate. Push a block with E; the lever stands them all back. Nothing here is ever required.',
    enemies: ['pistoneer', 'winchrat', 'gargoyle', 'keyward'], mod: 'ballasted', minis: ['weightwarden'], hz: KEEP, music: { scale: 4, root: 40, bpm: -4, prog: [0, 4, 5, 3] },
    theme: { name: 'The Counterweight Keep', floorA: '#2e2e36', floorB: '#35353f', wall: '#4a4a58', wallTop: '#9a9aae', accent: '#b8bcc8', glow: '#d8dcec', fog: '#101016', skin: { pattern: 'brick', wall: 'metal', ambience: 'dust', ambient: '#c0c4d8', dim: 0.08 } } });

  // ==================================================================== 11. THE HOLLOW RITE
  //  A ritual circle charges while CHANTERS chant (20 s for one, 10 s for two...) and at full charge calls a HERALD (at most two a room).  A chanter is warded while any ACOLYTE lives.
  //  Some rooms hold an altar: stand in its ring and the vigil runs — 40 seconds of it, with a pair of cultists at a time — and pays a free relic.  The circle and the vigil only exist while the room is locked.
  const aliveOf = (g, type) => g.enemies.filter(o => o.type === type && !o.dead);
  const RITE = {
    setup(g, room, rt, rng) {
      const on = live(room); rt.rite = { on, charge: 0, heralds: 0, seedT: 0, circle: null, vigil: null, rng: rng.fork('rite'), smoke: [] }; if (!on) return;
      const s = W.spots(rt, rng, 2, 200); rt.rite.circle = { x: (s[0] || { x: 480 }).x, y: (s[0] || { y: 200 }).y, r: 74 };
      if (s[1] && rng.chance(0.35) && Math.hypot(s[1].x - rt.rite.circle.x, s[1].y - rt.rite.circle.y) > 170) rt.rite.vigil = { x: s[1].x, y: s[1].y, r: 78, t: 0, need: 2400, done: false, started: false };
    },
    tick(g, rt) {
      const R = rt.rite; if (!R || !R.on) return; const p = g.player, cir = R.circle;
      for (const sm of R.smoke) { sm.t -= g.ts; if ((sm.h = (sm.h || 0) - g.ts) <= 0) { sm.h = 30; for (const e of g.enemies) if (!e.dead && e.hp < e.maxHp && Math.hypot(e.x - sm.x, e.y - sm.y) < sm.r) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015); } } U.compact(R.smoke, sm => sm.t > 0); R.blur = R.smoke.some(sm => Math.hypot(p.x - sm.x, p.y - sm.y) < sm.r);
      if (!rt.lockdown) return;
      if (R.seedT < 45 && ++R.seedT === 45 && !g.enemies.some(e => e.type === 'chanter' && !e.dead) && !g.spawns.some(s => s.type === 'chanter')) { const a = R.rng.next() * TAU; g.queueSpawn('chanter', cir.x + Math.cos(a) * 40, cir.y + Math.sin(a) * 40, { quick: true }); g.queueSpawn('acolyte', cir.x + Math.cos(a + 2.4) * 90, cir.y + Math.sin(a + 2.4) * 90, { quick: true }); }
      const ch = aliveOf(g, 'chanter').length;
      if (ch && R.heralds < 2) { R.charge = Math.min(100, R.charge + ch * 100 / (60 * 20)); if (R.charge >= 100 && !R.calling) { R.calling = true; R.charge = 0; R.heralds++; g.toast('The circle is full. Something answers.', '#c08aff', 140); g.zoneCircle(null, cir.x, cir.y, 70, g.tele(70), 0, { color: '#c08aff', hurts: false, burst: false }); g.after(g.tele(70), () => { R.calling = false; if (g.rt === rt && !g.room.cleared) { const h = g.spawnEnemy('hollowherald', cir.x, cir.y, { silent: false }); g.shake(6); g.sfx('bossroar', { vol: 0.4 }); } }); g.sfx('curse', { vol: 0.5 }); } }
      else if (!ch) R.charge = Math.max(0, R.charge - 0.5);
      const v = R.vigil; if (v && !v.done) {
        const inRing = !p.dead && Math.hypot(p.x - v.x, p.y - v.y) < v.r; if (inRing) { v.started = true; v.t += g.ts; if (g.aliveEnemies() + g.spawns.length <= 1) { const pool = W.enemiesFor(g.floorNum).filter(id => id !== 'chanter' && id !== 'censer'); for (let k = 0; k < 2; k++) { const a = R.rng.next() * TAU, id = pool.length ? R.rng.pick(pool) : 'acolyte'; g.queueSpawn(id, U.clamp(v.x + Math.cos(a) * 150, 90, 870), U.clamp(v.y + Math.sin(a) * 120, 90, 480), { quick: true }); } } }
        if (v.t >= v.need) { v.done = true; g.toast('THE VIGIL IS KEPT', '#ffd24a', 200); g.sfx('unlock'); g.flashScreen('#ffe8a0', 0.2); const o = I.rollOffers(R.rng, g.floorNum + 1, 1, { luck: p.st.luck, relics: p.relics, minRank: 1 })[0]; if (o) g.pedestal(o, v.x, v.y, { gift: true }); }
      }
    },
    under(g, c, t, rt) {
      const R = rt.rite; if (!R || !R.on) return; const cir = R.circle; c.save();
      if (cir) { const hot = rt.lockdown ? R.charge / 100 : 0; c.strokeStyle = 'rgba(176,120,255,' + (0.3 + 0.5 * hot) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(cir.x, cir.y, cir.r, 0, TAU); c.stroke(); c.beginPath(); c.arc(cir.x, cir.y, cir.r * 0.62, 0, TAU); c.stroke();
        for (let k = 0; k < 5; k++) { const a = t * 0.01 + k * TAU / 5, a2 = a + TAU * 2 / 5; c.beginPath(); c.moveTo(cir.x + Math.cos(a) * cir.r * 0.62, cir.y + Math.sin(a) * cir.r * 0.62); c.lineTo(cir.x + Math.cos(a2) * cir.r * 0.62, cir.y + Math.sin(a2) * cir.r * 0.62); c.stroke(); }
        if (hot > 0) { c.strokeStyle = '#d8a8ff'; c.lineWidth = 5; c.beginPath(); c.arc(cir.x, cir.y, cir.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * hot); c.stroke(); glow(c, cir.x, cir.y, cir.r * 1.4, '#a060ff', 0.25 * hot); } }
      const v = R.vigil; if (v) { c.strokeStyle = v.done ? 'rgba(255,214,120,0.6)' : 'rgba(255,214,120,0.35)'; c.setLineDash([6, 6]); c.lineWidth = 2; c.beginPath(); c.arc(v.x, v.y, v.r, 0, TAU); c.stroke(); c.setLineDash([]); c.fillStyle = '#4a3a58'; c.fillRect(v.x - 14, v.y - 6, 28, 12); c.fillStyle = v.done ? '#ffd24a' : '#c8a0ff'; c.fillRect(v.x - 8, v.y - 18, 16, 12); if (v.t > 0 && !v.done) { c.strokeStyle = '#ffd24a'; c.lineWidth = 4; c.beginPath(); c.arc(v.x, v.y, v.r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * v.t / v.need); c.stroke(); } }
      c.restore();
    },
    draw(g, c, t, rt) {
      const R = rt.rite; if (!R || !R.on) return;
      for (const sm of R.smoke) { const k = Math.min(1, sm.t / 60); c.save(); c.globalAlpha = 0.28 * k; for (let i = 0; i < 6; i++) { const a = t * 0.01 + i * 1.1; c.fillStyle = '#b8a8c8'; c.beginPath(); c.arc(sm.x + Math.cos(a) * sm.r * 0.45, sm.y + Math.sin(a * 1.3) * sm.r * 0.4, sm.r * 0.5, 0, TAU); c.fill(); } c.restore(); }
      if (R.blur) { const gr = c.createRadialGradient(480, 288, 200, 480, 288, 560); gr.addColorStop(0, 'rgba(150,130,170,0)'); gr.addColorStop(1, 'rgba(150,130,170,0.55)'); c.fillStyle = gr; c.fillRect(0, 0, 960, 576); }
      if (rt.lockdown && R.circle && R.charge > 0) { c.fillStyle = '#d8a8ff'; c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.fillText('THE RITE ' + Math.floor(R.charge) + '%', R.circle.x, R.circle.y - R.circle.r - 10); }
    },
  };
  const f11 = mk('rite');
  register({
    chanter: f11({ name: 'Chanter', shape: 'hex', color: '#8a6aa8', r: 13, hp: 30, speed: 0, dmg: 1, shot: 2, cost: 2.4, weight: 9, minFloor: 8, noElite: true, noSleep: true,
      desc: 'Stands still and chants, and the ritual circle fills the louder it gets. Warded — you cannot touch it — while any Acolyte lives. Take the Acolytes first; a second chanter doubles the speed.',
      init(e, g) { e.anchored = true; e.cd = 60 + g.rng.int(0, 60); },
      update(e, g) { const i = A.info(g, e); e.face = i.ang; e.invuln = g.enemies.some(o => o.type === 'acolyte' && !o.dead); if ((e.cd -= g.ts) <= 0) { e.cd = 110; g.burst(e.x, e.y - e.r, 4, '#c8a0ff', 1.5, 22, { dir: -Math.PI / 2, spread: 1, size: 2 }); } },
      draw(c, e) { if (e.invuln) { c.strokeStyle = 'rgba(200,170,255,' + (0.5 + 0.2 * Math.sin(e.t * 0.2)) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, e.r + 7, 0, TAU); c.stroke(); } c.fillStyle = '#1c1228'; c.beginPath(); c.arc(e.x, e.y, e.r * 0.55, 0, TAU); c.fill(); c.fillStyle = '#e8d8ff'; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.15, e.r * 0.18, e.r * 0.26 + Math.sin(e.t * 0.2) * 1.5, 0, 0, TAU); c.fill(); } }),
    acolyte: f11({ name: 'Acolyte', shape: 'tri', color: '#6a5a88', r: 12, hp: 26, speed: 1.1, dmg: 2, shot: 3, cost: 2.2, weight: 11, minFloor: 8, noElite: false,
      desc: 'Guards the chanters and keeps them warded. When you are in the open it throws a binding chain along a marked line: if it finds you, you cannot walk for about a second (a dash tears free).',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt; e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 190 / e.rate; g.eShot(e, e.aim, 3.4, { dmg: 0.9, color: '#b8a8d8', r: 7, kind: 'orb', onDie: (gg, b) => { if (K.hitPlayer(gg, b)) K.rootPlayer(gg, 54, '#b8a8d8'); } }); g.sfx('shoot', { vol: 0.5 }); } return; }
        const ch = g.enemies.filter(o => o.type === 'chanter' && !o.dead).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0], gx = ch ? ch.x : (rt && rt.rite && rt.rite.circle ? rt.rite.circle.x : 480), gy = ch ? ch.y : (rt && rt.rite && rt.rite.circle ? rt.rite.circle.y : 288);
        const dg = Math.hypot(gx - e.x, gy - e.y); if (dg > 120) A.walk(g, e, Math.atan2(gy - e.y, gx - e.x), e.curSpeed); else A.walk(g, e, Math.atan2(gy - e.y, gx - e.x) + Math.PI / 2, e.curSpeed * 0.6);
        if ((e.cd -= g.ts) <= 0 && i.d < 420 && A.clear(g, e.x, e.y, g.player.x, g.player.y, false)) { e.state = 'wind'; e.windup = g.tele(34); e.aim = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 360, e.y + Math.sin(i.ang) * 360, 12, e.windup, 0, { color: '#b8a8d8', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { c.fillStyle = 'rgba(20,14,34,0.7)'; c.beginPath(); c.arc(e.x, e.y - e.r * 0.2, e.r * 0.4, Math.PI, 0); c.fill(); c.strokeStyle = '#b8a8d8'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(e.x + e.r * 0.8, e.y); c.lineTo(e.x + e.r * 1.3, e.y + e.r * 0.4); c.stroke(); eyes(c, e, 0.25); } }),
    censer: f11({ name: 'Censer Bearer', shape: 'circle', color: '#a8988a', r: 13, hp: 34, speed: 0.8, dmg: 2, shot: 3, cost: 2.6, weight: 8, minFloor: 9,
      desc: 'Swings a censer that leaves a cloud of sweet smoke: foes inside it mend slowly, and the edges of your sight blur while you are in it. At most three clouds; they thin away in a few seconds. Fight outside them.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt; e.face = i.ang; A.kite(g, e, i, 210, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0) { e.cd = 230 / e.rate; if (rt && rt.rite && rt.rite.smoke) { rt.rite.smoke.push({ x: e.x, y: e.y, r: 68, t: 420 }); while (rt.rite.smoke.length > 3) rt.rite.smoke.shift(); g.sfx('ui', { vol: 0.3 }); } }
      },
      draw(c, e) { c.strokeStyle = '#6a5a48'; c.lineWidth = 2; const sx = e.x + Math.cos(e.face + 1.2) * e.r * 1.1 + Math.sin(e.t * 0.1) * 3, sy = e.y + Math.sin(e.face + 1.2) * e.r * 1.1; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(sx, sy); c.stroke(); c.fillStyle = '#c8b880'; c.beginPath(); c.arc(sx, sy, e.r * 0.3, 0, TAU); c.fill(); eyes(c, e, 0.3); } }),
    penitent: f11({ name: 'Penitent', shape: 'blob', color: '#b05a5a', r: 12, hp: 36, speed: 1.4, dmg: 3, shot: 3.5, cost: 3.0, weight: 8, minFloor: 8,
      desc: 'Throws itself at you and wounds itself doing it. The lower its life, the faster and harder it hits — but it will not finish itself off. Kill it early, or kill it clean.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); e.dmg0 = e.dmg; e.shot0 = e.shotDmg; },
      update(e, g) {
        const i = A.info(g, e), k = 1 + (1 - e.hp / e.maxHp) * 1.2; e.face = i.ang; e.spdMul *= k; e.rate = e.rate0 * k; e.dmg = e.dmg0 * k;
        if (e.state === 'dash') { const m = A.walk(g, e, e.dAng, 4.2 * e.spdMul); if ((e.sT -= g.ts) <= 0 || m.bx || m.by) { e.state = null; e.cd = 90 / k; } return; }
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = 'dash'; e.sT = 24; const cost = e.maxHp * 0.05; if (e.hp - cost > e.maxHp * 0.12) { e.hp -= cost; g.addText(e.x, e.y - e.r - 6, '-' + Math.round(cost), '#ff6a6a', 11); g.burst(e.x, e.y, 6, '#c03030', 2.5, 16); } g.sfx('lunge', { vol: 0.5 }); } return; }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.2) * 0.4); if ((e.cd -= g.ts) <= 0 && i.d < 260) { e.state = 'wind'; e.windup = g.tele(26); e.dAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 220, e.y + Math.sin(i.ang) * 220, 22, e.windup, 0, { color: '#ff7a7a', hurts: false, burst: false }); }
      },
      draw(c, e) { const k = 1 - e.hp / e.maxHp; c.strokeStyle = 'rgba(120,10,20,' + (0.3 + 0.5 * k) + ')'; c.lineWidth = 2; for (let n = 0; n < 1 + Math.floor(k * 4); n++) { c.beginPath(); c.moveTo(e.x - e.r * 0.5 + n * 5, e.y - e.r * 0.5); c.lineTo(e.x - e.r * 0.2 + n * 5, e.y + e.r * 0.4); c.stroke(); } eyes(c, e, 0.35); } }),
    hollowherald: f11({ name: 'Hollow Herald', shape: 'diamond', color: '#d8b8ff', r: 18, hp: 90, speed: 1.0, dmg: 3, shot: 4, cost: 99, weight: 0, minFloor: 99, noElite: true, noSleep: true,
      desc: 'What the circle calls when it is full: tall, pale and unhurried. It fires fans of light along marked lines and slams the ground in a ring. Two heralds is the most a room will ever call.',
      init(e, g) { e.cd = 60; e.alt = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 120 / e.rate; if (e.alt++ % 2 === 0) { for (let k = -2; k <= 2; k++) g.eShot(e, e.aim + k * 0.2, 3.2, { dmg: 1, color: '#e8d0ff', r: 5 }); g.sfx('shoot', { vol: 0.5 }); } else { g.zoneCircle(e, e.x, e.y, 96, 3, e.shotDmg * 1.3, { color: '#d8b8ff', burst: true }); g.shockRing(e, e.x, e.y, 3.0, 14, 260, e.shotDmg * 0.8, { color: '#d8b8ff' }); g.shake(5); g.sfx('thud', { vol: 0.5 }); } } return; }
        A.kite(g, e, i, 230, e.curSpeed, 0.8); if ((e.cd -= g.ts) <= 0) { e.state = 'wind'; e.windup = g.tele(e.alt % 2 === 0 ? 38 : 44); e.aim = i.ang; if (e.alt % 2 === 0) g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 320, e.y + Math.sin(i.ang) * 320, 14, e.windup, 0, { color: '#e8d0ff', hurts: false, burst: false }); else g.zoneCircle(e, e.x, e.y, 96, e.windup, 0, { color: '#d8b8ff', hurts: false, burst: false, follow: true }); g.sfx('telegraph', { vol: 0.5 }); }
      },
      draw(c, e) { c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.arc(e.x, e.y - e.r * 1.3, e.r * 0.45, 0, TAU); c.stroke(); eyes(c, e, 0.3); } }),
  });
  mod({ id: 'devout', name: 'Devout', color: '#e8d8a0', glyph: '✚', desc: 'Dies praying: every foe near it is warded with a fifth of its own life',
    onDeath(e, g) { for (const o of g.enemies) if (o !== e && !o.dead && !o.boss && Math.hypot(o.x - e.x, o.y - e.y) < 150) { o.ward = (o.ward || 0) + o.maxHp * 0.2; g.burst(o.x, o.y, 6, '#e8d8a0', 2, 16); } g.burst(e.x, e.y, 14, '#e8d8a0', 3, 24); } });
  const celebrant = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#4a2a5a'; c.beginPath(); c.moveTo(x - r * 0.95, y + r); c.lineTo(x - r * 0.45, y - r * 0.35); c.lineTo(x + r * 0.45, y - r * 0.35); c.lineTo(x + r * 0.95, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#d8b878'; c.fillRect(x - r * 0.2, y - r * 0.2, r * 0.4, r * 1.1); c.fillRect(x - r * 0.55, y + r * 0.1, r * 1.1, r * 0.22);
    c.fillStyle = '#e8d0b8'; c.beginPath(); c.arc(x, y - r * 0.62, r * 0.38, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#d8b878'; c.beginPath(); c.moveTo(x - r * 0.42, y - r * 0.85); c.lineTo(x, y - r * 1.55); c.lineTo(x + r * 0.42, y - r * 0.85); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#c8b880'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + r * 0.9, y - r * 0.2); c.lineTo(x + r * 0.9 + Math.sin(t * 0.08) * r * 0.25, y + r * 0.5); c.stroke(); c.fillStyle = '#a89868'; c.beginPath(); c.arc(x + r * 0.9 + Math.sin(t * 0.08) * r * 0.25, y + r * 0.6, r * 0.2, 0, TAU); c.fill(); c.lineWidth = 3; c.strokeStyle = dk;
  };
  ED.bossDraw.celebrant = celebrant;
  mini({ id: 'celebrant', name: 'The High Celebrant', title: 'Who Keeps the Rite', color: '#c08aff', r: 27, hp: 225, arena: 'arena_round', shape: 'celebrant', minFloor: 9, unlockText: 'Penitent\'s Rosary',
    attacks: { chant: L('spiral', { arms: 3, n: 20, speed: 2.4, gap: 4, color: '#c08aff' }), chains: L('fan', { n: 5, spread: 0.24, reps: 2, speed: 3.0, color: '#b8a8d8' }), slam: L('slamRing', { r: 90, tele: 36, rings: 2, speed: 3, color: '#c08aff' }), choir: L('summon', { types: ['acolyte'], n: 2, max: 3, hpMul: 0.8 }), bars: L('bars', { n: 3, thick: 44, gapW: 165, warn: 64, color: '#c08aff' }) },
    phases: [{ at: 1, name: 'Procession', attacks: ['chains', 'slam', 'choir'], idle: [34, 56] }, { at: 0.5, name: 'Rapture', attacks: ['chant', 'bars', 'chains', 'slam', 'choir'], idle: [22, 40] }] });
  relic('rosary', { id: 'rosary', name: "Penitent's Rosary", rarity: 'rare', color: '#c08aff', mods: { regen: 1, luck: 1, dmg: 0.05 }, max: 1, unlock: 'mini:celebrant', desc: 'A slow mending, a little luck and a little more bite. (Unlockable)' });
  W.add({ id: 'rite', name: 'The Hollow Rite', short: 'HOLLOW RITE', color: '#c08aff', pack: V, native: 11, tiers: [2, 99], risk: 2, gate: { kind: 'cost', gold: 70, goldPer: 7, hp: 1 },
    rule: 'A ritual circle charges while chanters chant and calls a Herald when it fills. Kill the acolytes, then the chanters. Some rooms hold an altar: keep a vigil beside it for forty seconds and it pays a relic.',
    enemies: ['chanter', 'acolyte', 'censer', 'penitent'], mod: 'devout', minis: ['celebrant'], hz: RITE, music: { scale: 3, root: 33, bpm: -6, prog: [0, 3, 0, 5] },
    theme: { name: 'The Hollow Rite', floorA: '#241a30', floorB: '#2c2038', wall: '#3a2a4a', wallTop: '#7a5aa8', accent: '#c08aff', glow: '#d8b0ff', fog: '#0c0814', skin: { pattern: 'slate', wall: 'block', ambience: 'motes', ambient: '#b098d8', dim: 0.12 } } });

  // ==================================================================== 12. THE ECLIPSE ORCHARD
  //  One clock for the whole floor, 64 seconds round: DAWN (dew heals near the trees, foes are drowsy) · NOON (fruit ripens: pluck it to heal) · DUSK (what is left rots into a bursting rotbomb; moths come) · NIGHT (shades rise
  //  from the dark and will not enter the firefly pools).  The clock drives the light pass; nothing in it ever blocks a door.
  const CYC = 3840, QUART = 960, PHN = ['DAWN', 'NOON', 'DUSK', 'NIGHT'], PHC = ['#f2b898', '#fff4d8', '#e8905a', '#5a68a8'];
  const clock = (g) => { const t0 = (g.run && g.run.orchT0) || 0, c = Math.max(0, g.frame - t0) % CYC; return { ph: Math.floor(c / QUART), k: (c % QUART) / QUART, c, cycle: Math.floor(Math.max(0, g.frame - t0) / CYC) }; };
  const hexv = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], mixh = (a, b, k) => { const x = hexv(a), y = hexv(b); return '#' + [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * k).toString(16).padStart(2, '0')).join(''); };
  if (ED.skin) {
    const prev = ED.skin.ambientOf;
    ED.skin.ambientOf = (g, t, st) => { if (isLand(g, 'orchard') && P.on(V)) { const k = clock(g), kk = k.k < 0.82 ? 0 : (k.k - 0.82) / 0.18; return mixh(PHC[k.ph], PHC[(k.ph + 1) % 4], kk * kk * (3 - 2 * kk)); } return prev ? prev(g, t, st) : null; };
    ED.skin.extraLights = ED.skin.extraLights || []; ED.skin.extraLights.push((g, t) => { const rt = g.rt; if (!rt || !rt.orch || !rt.orch.on || !P.on(V)) return null; const k = clock(g), out = []; if (k.ph === 3 || (k.ph === 2 && k.k > 0.6)) for (const pl of rt.orch.pools) out.push({ x: pl.x, y: pl.y, r: pl.r * 2.3, color: '#ffe890', a: 0.9 * (k.ph === 3 ? 1 : (k.k - 0.6) / 0.4) }); if (k.ph === 0) for (const tr of rt.orch.trees) out.push({ x: tr.x, y: tr.y, r: 90, color: '#ffd8b0', a: 0.35 }); return out; });
  }
  ED.pickupImpl.fruit = {
    collect(g, k) { const p = g.player; if (p.hp >= p.maxHp) return false; g.healPlayer(3); g.sfx('heal'); g.burst(k.x, k.y, 8, '#ffb85a', 2, 16); return true; },
    draw(c, k, t, bob) { c.fillStyle = '#e8803a'; c.beginPath(); c.arc(k.x, k.y + bob, 7, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(k.x - 2.5, k.y + bob - 2.5, 2.4, 0, TAU); c.fill(); c.strokeStyle = '#5a8a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(k.x, k.y + bob - 7); c.lineTo(k.x + 3, k.y + bob - 11); c.stroke(); },
  };
  const DROWSY = { id: 'drowsy', pack: V, hidden: true, name: 'Drowsy', color: '#c8b0d8', glyph: '', desc: '', update(e, g) { const rt = g.rt; if (rt && rt.orch && clock(g).ph === 0) { e.spdMul *= 0.8; e.rate = e.rate0 * 0.85; } } };
  ED.mods.drowsy = DROWSY;
  ED.hook('spawn', V, (g, e) => { const rt = g.rt; if (rt && rt.orch && rt.orch.on && !e.boss && isLand(g, 'orchard') && !e.mods.includes(DROWSY)) e.mods.push(DROWSY); });
  ED.hook('floorStart', V, (g) => { if (isLand(g, 'orchard')) g.run.orchT0 = g.frame; });
  const ORCH = {
    setup(g, room, rt, rng) {
      const on = live(room), O = rt.orch = { on, trees: [], pools: [], fruits: [], lastPh: -1, dew: 0, mothN: 0, shadeT: 200, rng: rng.fork('orch'), cycle: -1 }; if (!on) return;
      const sp = W.spots(rt, rng, 5, 150); O.trees = sp.slice(0, 3).map(s => ({ x: s.x, y: s.y })); O.pools = sp.slice(3, 5).map(s => ({ x: s.x, y: s.y, r: 62 }));
      if (O.pools.length < 2) { const q = W.spots(rt, rng, 2, 120); for (const s of q) if (O.pools.length < 2 && O.pools.every(o => Math.hypot(o.x - s.x, o.y - s.y) > 130)) O.pools.push({ x: s.x, y: s.y, r: 62 }); }
    },
    tick(g, rt) {
      const O = rt.orch; if (!O || !O.on) return; const k = clock(g), p = g.player;
      if (k.ph !== O.lastPh) {
        O.lastPh = k.ph;
        if (k.ph === 1) { for (const tr of O.trees) { const pk = g.dropPickup('fruit', tr.x + 12, tr.y + 14, 1, { still: true }); if (pk) O.fruits.push(pk); } O.fruits = O.fruits.filter(f => !f.dead); g.toast('Noon: the fruit is ripe.', '#ffd890', 100); }
        else if (k.ph === 2) { g.toast('Dusk: what you do not pluck will rot.', '#e8905a', 120); for (const f of O.fruits) if (!f.dead) { f.dead = true; g.zoneCircle(null, f.x, f.y, 54, 170, dmgOf(g, 1.3), { color: '#a89a3a', burst: true, onEnd: (gg, z) => { gg.burst(z.x, z.y, 14, '#8a7a2a', 3, 24); } }); } O.fruits.length = 0; O.mothN = 0; }
        else if (k.ph === 3) { g.toast('Night: stand in the light.', '#9ab0f0', 120); }
        else if (k.ph === 0) { for (const e of g.enemies) if (e.type === 'nightshade' && !e.dead) { e.noLoot = true; e.hp = 0; g.killEnemy(e); } g.toast('Dawn.', '#f2b898', 90); }
      }
      if (k.ph === 0 && !p.dead && O.trees.some(t => Math.hypot(p.x - t.x, p.y - t.y) < 70)) { O.dew += g.ts; if (O.dew >= 90) { O.dew = 0; if (p.hp < p.maxHp) { g.healPlayer(1, true); g.addText(p.x, p.y - 22, '+dew', '#bfe8ff', 11); } } }
      if (!rt.lockdown) return;
      if (k.ph === 2 && k.k > 0.15 && O.mothN < 1) { O.mothN = 1; for (let i = 0; i < 3; i++) { const a = O.rng.next() * TAU; g.queueSpawn('orchardmoth', U.clamp(p.x + Math.cos(a) * 260, 90, 870), U.clamp(p.y + Math.sin(a) * 200, 90, 480), { quick: true, flyer: true }); } }
      if (k.ph === 3) { O.shadeT -= g.ts; if (O.shadeT <= 0) { O.shadeT = 300; if (g.enemies.filter(e => e.type === 'nightshade' && !e.dead).length < 3) { for (let n = 0; n < 8; n++) { const x = 100 + O.rng.next() * 760, y = 100 + O.rng.next() * 380; if (O.pools.every(pl => Math.hypot(pl.x - x, pl.y - y) > pl.r + 90) && Math.hypot(p.x - x, p.y - y) > 170 && !ED.phys.blocked(g, x, y, 12, true, false)) { g.spawnEnemy('nightshade', x, y, { silent: false, minion: true }); break; } } } } }
    },
    under(g, c, t, rt) {
      const O = rt.orch; if (!O || !O.on) return; const k = clock(g); c.save();
      for (const tr of O.trees) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(tr.x + 6, tr.y + 16, 22, 8, 0, 0, TAU); c.fill(); c.fillStyle = '#4a3624'; c.fillRect(tr.x - 4, tr.y - 4, 8, 22); c.fillStyle = k.ph === 3 ? '#2a4a3a' : '#4a7a3a'; for (const [dx, dy, r] of [[0, -14, 17], [-12, -6, 12], [12, -6, 12]]) { c.beginPath(); c.arc(tr.x + dx, tr.y + dy, r, 0, TAU); c.fill(); } c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(tr.x - 5, tr.y - 18, 9, 0, TAU); c.fill(); }
      if (k.ph === 3 || (k.ph === 2 && k.k > 0.6)) for (const pl of O.pools) { const gr = c.createRadialGradient(pl.x, pl.y, 4, pl.x, pl.y, pl.r); gr.addColorStop(0, 'rgba(255,240,150,0.45)'); gr.addColorStop(1, 'rgba(255,240,150,0.06)'); c.fillStyle = gr; c.beginPath(); c.arc(pl.x, pl.y, pl.r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,236,150,0.5)'; c.lineWidth = 1.5; c.setLineDash([4, 6]); c.stroke(); c.setLineDash([]); for (let i = 0; i < 6; i++) { const a = t * 0.02 * (1 + i * 0.1) + i * 1.05, rr = pl.r * (0.3 + 0.55 * ((i * 0.37) % 1)); c.fillStyle = 'rgba(255,248,170,' + (0.5 + 0.4 * Math.sin(t * 0.15 + i)) + ')'; c.beginPath(); c.arc(pl.x + Math.cos(a) * rr, pl.y + Math.sin(a * 1.3) * rr * 0.8, 1.8, 0, TAU); c.fill(); } }
      c.restore();
    },
    draw(g, c, t, rt) {
      const O = rt.orch; if (!O || !O.on) return; const k = clock(g), x = 880, y = 44; c.save(); c.globalAlpha = 0.9; c.fillStyle = 'rgba(10,10,20,0.6)'; c.beginPath(); c.arc(x, y, 22, 0, TAU); c.fill();
      for (let i = 0; i < 4; i++) { c.strokeStyle = PHC[i]; c.lineWidth = 5; c.beginPath(); c.arc(x, y, 16, -Math.PI / 2 + i * Math.PI / 2 + 0.04, -Math.PI / 2 + (i + 1) * Math.PI / 2 - 0.04); c.stroke(); }
      const a = -Math.PI / 2 + (k.c / CYC) * TAU; c.fillStyle = '#fff'; c.beginPath(); c.arc(x + Math.cos(a) * 16, y + Math.sin(a) * 16, 4, 0, TAU); c.fill(); c.fillStyle = PHC[k.ph]; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText(PHN[k.ph], x, y + 36); c.restore();
    },
  };
  const f12 = mk('orchard');
  register({
    scarecrow: f12({ name: 'Scarecrow', shape: 'tri', color: '#b89a5a', r: 14, hp: 32, speed: 1.0, dmg: 3, shot: 4, cost: 2.6, weight: 9, minFloor: 7,
      desc: 'Hangs on its post as still as a coat until you come within a few steps; then it unhooks itself and lunges along a marked line, again and again. It is made of straw: fire hurts it three times as much.',
      init(e, g) { e.dormant = true; e.cd = 40; e.dmgFilter = (gg, x, dmg, o) => (o.src === 'burn' ? dmg * 3 : dmg); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.dormant) { if (i.d < 130 || e.hp < e.maxHp - 0.01) { e.dormant = false; g.addText(e.x, e.y - e.r - 8, '!', '#ffd24a', 14); g.sfx('lunge', { vol: 0.3 }); } return; }
        if (e.state === 'dash') { const m = A.walk(g, e, e.dAng, 4.6 * e.spdMul); if ((e.sT -= g.ts) <= 0 || m.bx || m.by) { e.state = null; e.cd = 120 / e.rate; } return; }
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = 'dash'; e.sT = 18; g.sfx('lunge', { vol: 0.5 }); } return; }
        A.chase(g, e, i, e.curSpeed * 0.8, 0); if ((e.cd -= g.ts) <= 0 && i.d < 250) { e.state = 'wind'; e.windup = g.tele(28); e.dAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 200, e.y + Math.sin(i.ang) * 200, 22, e.windup, 0, { color: '#e8c070', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { c.strokeStyle = '#6a4a28'; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x - e.r * 1.2, e.y - e.r * 0.2); c.lineTo(e.x + e.r * 1.2, e.y - e.r * 0.2); c.stroke(); c.strokeStyle = '#e8c868'; c.lineWidth = 1.5; for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(e.x + sg * e.r * 1.1, e.y - e.r * 0.2); c.lineTo(e.x + sg * (e.r * 1.4 + k * 2), e.y - e.r * 0.2 + (k - 1) * 4); c.stroke(); } c.fillStyle = '#5a3a1a'; c.beginPath(); c.moveTo(e.x - e.r * 0.5, e.y - e.r * 0.9); c.lineTo(e.x + e.r * 0.5, e.y - e.r * 0.9); c.lineTo(e.x, e.y - e.r * 1.5); c.closePath(); c.fill(); if (e.dormant) { c.fillStyle = 'rgba(255,255,255,0.25)'; c.font = '9px monospace'; c.textAlign = 'center'; c.fillText('...', e.x, e.y - e.r * 1.7); } eyes(c, e, 0.25); } }),
    orchardmoth: f12({ name: 'Orchard Moth', shape: 'diamond', color: '#d8c8a8', r: 8, hp: 7, speed: 1.7, dmg: 2, cost: 1.1, weight: 11, minFloor: 6, group: 4, flying: true,
      desc: 'A swarm of pale moths drawn to light. By day they circle you; at night they flock to the nearest firefly pool and dive at whoever stands in it. Stay out of the pools while they are there, and use the dark to fight them.',
      init(e, g) { e.ang0 = g.rng.next() * TAU; e.cd = 50 + g.rng.int(0, 100); },
      update(e, g) {
        const i = A.info(g, e), p = g.player, rt = g.rt, O = rt && rt.orch, k = clock(g); e.face = i.ang;
        if (e.state === 'dive') { A.walk(g, e, e.dAng, 4.0 * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 120 / e.rate; } return; }
        let tx = p.x, ty = p.y; if (k.ph === 3 && O && O.pools.length) { const pl = O.pools.slice().sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0]; tx = pl.x; ty = pl.y; }
        e.ang0 += 0.035 * g.ts; const cx = tx + Math.cos(e.ang0) * 80, cy = ty + Math.sin(e.ang0) * 64; A.walk(g, e, Math.atan2(cy - e.y, cx - e.x), Math.min(e.curSpeed * 1.2, Math.hypot(cx - e.x, cy - e.y)));
        if ((e.cd -= g.ts) <= 0 && i.d < 240) { e.state = 'dive'; e.sT = 16; e.dAng = i.ang; g.sfx('lunge', { vol: 0.2 }); }
      },
      draw(c, e) { c.fillStyle = 'rgba(245,235,210,0.55)'; for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(e.x + sg * e.r * 0.8, e.y, e.r * 0.8, e.r * 0.4, sg * (0.6 + Math.sin(e.t * 1.2) * 0.35), 0, TAU); c.fill(); } } }),
    graftbeast: f12({ name: 'Grafted Beast', shape: 'hex', color: '#6a8a4a', r: 19, hp: 62, speed: 0.6, dmg: 4, shot: 4.5, cost: 3.6, weight: 6, minFloor: 8,
      desc: 'A beast grafted onto an old trunk: slow, broad and covered in bark. Every few seconds it marks three lanes toward you and throws roots along them; the roots lash the ground for a breath. Stay off the marked lanes and strike its flank.',
      init(e, g) { e.cd = 100 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 210 / e.rate; g.sfx('thud', { vol: 0.5 }); g.shake(3); } return; }
        A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 360) { e.state = 'wind'; e.windup = g.tele(40); for (const o of [-0.34, 0, 0.34]) g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang + o) * 280, e.y + Math.sin(i.ang + o) * 280, 26, e.windup, e.shotDmg * 1.1, { color: '#8ac06a', burst: true }); g.sfx('telegraph', { vol: 0.5 }); }
      },
      draw(c, e) { c.strokeStyle = '#4a3624'; c.lineWidth = 3; for (let k = 0; k < 4; k++) { const a = e.face + Math.PI + (k - 1.5) * 0.7; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + Math.cos(a) * e.r * 1.4, e.y + Math.sin(a) * e.r * 1.4 + 3); c.stroke(); } c.fillStyle = '#3a6a2a'; c.beginPath(); c.arc(e.x - e.r * 0.1, e.y - e.r * 0.8, e.r * 0.55, 0, TAU); c.fill(); eyes(c, e, 0.35); } }),
    heron: f12({ name: 'Night Heron', shape: 'ghost', color: '#9ab0d0', r: 11, hp: 22, speed: 0, dmg: 3, shot: 4, cost: 2.4, weight: 8, minFloor: 7, flying: true,
      desc: 'Roosts motionless all day and is easy to hit. When night falls it wakes: it marks a circle on you from the dark and strikes it from above, then folds back down, winded. Fight it at noon.',
      init(e, g) { e.cd = 60; e.anchored = true; e.home = [e.x, e.y]; },
      update(e, g) {
        const i = A.info(g, e), k = clock(g); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; e.vis = 0.25 + 0.15 * Math.sin(e.t * 0.5); if (e.windup <= 0) { e.vis = 1; e.x = e.dest[0]; e.y = e.dest[1]; if (ED.phys.blocked(g, e.x, e.y, e.r * 0.7, true, false)) ED.phys.unstick(g, e); e.state = 'rest'; e.sT = 90; e.vuln = 1.3; g.burst(e.x, e.y, 8, '#9ab0d0', 3, 18); g.sfx('thud', { vol: 0.4 }); } return; }
        if (e.state === 'rest') { e.sT -= g.ts; if (e.sT <= 0) { e.state = null; e.vuln = 1; e.cd = 100; } return; }
        if (k.ph !== 3) { e.vis = 1; return; }
        if ((e.cd -= g.ts) <= 0 && i.d < 480) { const p = g.player; e.dest = [U.clamp(p.x + (p.vx || 0) * 10, 80, 880), U.clamp(p.y + (p.vy || 0) * 10, 80, 490)]; e.state = 'wind'; e.windup = g.tele(48); g.zoneCircle(e, e.dest[0], e.dest[1], 44, e.windup, e.shotDmg * 1.2, { color: '#9ab0d0', burst: true }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { c.strokeStyle = '#6a7a98'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x, e.y + e.r * 0.4); c.lineTo(e.x, e.y + e.r * 1.1); c.moveTo(e.x - 3, e.y + e.r * 1.1); c.lineTo(e.x + 3, e.y + e.r * 1.1); c.stroke(); c.fillStyle = '#d8b858'; c.beginPath(); c.moveTo(e.x + Math.cos(e.face) * e.r * 0.8, e.y + Math.sin(e.face) * e.r * 0.8); c.lineTo(e.x + Math.cos(e.face) * e.r * 1.8, e.y + Math.sin(e.face) * e.r * 1.8); c.lineTo(e.x + Math.cos(e.face + 0.3) * e.r * 0.8, e.y + Math.sin(e.face + 0.3) * e.r * 0.8); c.fill(); eyes(c, e, 0.25); } }),
    nightshade: f12({ name: 'Shade', shape: 'ghost', color: '#5a6890', r: 10, hp: 10, speed: 1.4, dmg: 2, cost: 99, weight: 0, minFloor: 99, flying: true, noElite: true, noSleep: true,
      desc: 'A shape of the dark that rises at night and fades at dawn. It will not enter a pool of firefly light.',
      init(e, g) { e.minionNoCount = true; e.noLoot = true; },
      update(e, g) {
        const i = A.info(g, e), O = g.rt && g.rt.orch; e.face = i.ang; A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.1) * 0.4);
        if (O) for (const pl of O.pools) { const d = Math.hypot(e.x - pl.x, e.y - pl.y); if (d < pl.r + 6 && clock(g).ph >= 2) { const a = Math.atan2(e.y - pl.y, e.x - pl.x); e.x = pl.x + Math.cos(a) * (pl.r + 6); e.y = pl.y + Math.sin(a) * (pl.r + 6); e.noContact = true; } }
      },
      draw(c, e) { c.fillStyle = 'rgba(20,24,50,0.5)'; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.9, e.r * 0.3, 0, 0, TAU); c.fill(); eyes(c, e, 0.3); } }),
  });
  mod({ id: 'nocturnal', name: 'Nocturnal', color: '#9ab0f0', glyph: '☾', desc: 'Strong and swift at night, sluggish by day',
    update(e, g) { const k = clock(g); if (k.ph === 3) { e.spdMul *= 1.35; e.rate = e.rate0 * 1.3; } else { e.spdMul *= 0.85; e.rate = e.rate0 * 0.9; } } });
  const grafter = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#4a6a3a'; c.beginPath(); c.moveTo(x - r * 0.9, y + r); c.lineTo(x - r * 0.5, y - r * 0.3); c.lineTo(x + r * 0.5, y - r * 0.3); c.lineTo(x + r * 0.9, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#d8b898'; c.beginPath(); c.arc(x, y - r * 0.6, r * 0.4, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#c8a050'; c.beginPath(); c.ellipse(x, y - r * 0.82, r * 0.7, r * 0.18, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(x, y - r * 0.95, r * 0.3, Math.PI, 0); c.fill();
    c.strokeStyle = '#8a8a98'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + r * 0.7, y + r * 0.1); c.lineTo(x + r * 1.5, y - r * 0.5); c.moveTo(x + r * 0.7, y - r * 0.5); c.lineTo(x + r * 1.5, y + r * 0.1); c.stroke(); c.strokeStyle = '#6a8a3a'; c.beginPath(); c.moveTo(x - r * 0.9, y + r * 0.4); c.quadraticCurveTo(x - r * 1.5, y, x - r * 1.2, y - r * 0.6); c.stroke(); c.fillStyle = '#e8803a'; c.beginPath(); c.arc(x - r * 1.2, y - r * 0.6, r * 0.18, 0, TAU); c.fill(); c.lineWidth = 3; c.strokeStyle = dk;
  };
  ED.bossDraw.grafter = grafter;
  mini({ id: 'grafter', name: 'The Grafter', title: 'Who Joins What Should Not Be Joined', color: '#e8a85a', r: 26, hp: 215, arena: 'arena_round', shape: 'grafter', minFloor: 7, unlockText: 'Pruning Shears',
    attacks: { fruit: L('rain', { n: 9, r: 44, warn: 48, interval: 7, aimed: 0.7, color: '#e8803a' }), thorns: L('fan', { n: 6, spread: 0.24, reps: 2, speed: 2.9, color: '#8ac06a' }), roots: L('bars', { n: 3, thick: 44, gapW: 165, warn: 64, color: '#8ac06a' }), slam: L('slamRing', { r: 88, tele: 36, rings: 2, speed: 3, color: '#e8a85a' }), moths: L('summon', { types: ['orchardmoth'], n: 3, max: 5, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'Spring Pruning', attacks: ['thorns', 'slam', 'moths'], idle: [32, 54] }, { at: 0.5, name: 'Overgrown', attacks: ['roots', 'fruit', 'thorns', 'slam', 'moths'], idle: [22, 40] }] });
  relic('shears', { id: 'shears', name: 'Pruning Shears', rarity: 'rare', color: '#e8a85a', mods: { crit: 0.06, dmg: 0.05, luck: 1 }, max: 1, unlock: 'mini:grafter', desc: 'Clean cuts: critical hits come more often, and a little more bite. (Unlockable)' });
  W.add({ id: 'orchard', name: 'The Eclipse Orchard', short: 'ECLIPSE ORCHARD', color: '#e8a85a', pack: V, native: 6, tiers: [1, 99], risk: 1, gate: { kind: 'crack' },
    rule: 'One clock, sixty-four seconds round: dawn (dew heals near the trees), noon (fruit ripens: pluck it), dusk (what is left rots into a bursting rotbomb) and night (shades rise; stand in a firefly pool).',
    enemies: ['scarecrow', 'orchardmoth', 'graftbeast', 'heron'], mod: 'nocturnal', minis: ['grafter'], hz: ORCH, music: { scale: 2, root: 41, bpm: -8, prog: [0, 2, 4, 3] },
    theme: { name: 'The Eclipse Orchard', floorA: '#262f22', floorB: '#2d382a', wall: '#3a4632', wallTop: '#86a860', accent: '#e8a85a', glow: '#ffe0a0', fog: '#0c120c', skin: { pattern: 'moss', wall: 'timber', ambience: 'fireflies', ambient: '#d8d0b0', dim: 0.04 } } });

  ED.v26 = { advance, goTo, snap, free, onSquare, BOARD, RITE, aliveOf, KEEP, moveBlock, resetBlocks, plateOn, setGate, clock, ORCH };
})(typeof globalThis !== 'undefined' ? globalThis : this);

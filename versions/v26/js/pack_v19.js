/* EMBERDEEP — pack_v19.js : v19 "BESTIARY" — foes and elite traits for ANY land, each with a behaviour the game did not have.
 *
 *  LAMPLIGHTER   a laser tell that tracks, locks, then fires          TWIN HUSK      a pair on one thread: kill them together            GRAVEDIGGER  raises the foes you already killed (once each)
 *  RIME WEAVER   freezes the floor under you                          FUSE IMP       a pack of runners with a lit fuse                  SIGNAL BRAZIER calls three more foes if left to burn
 *  ORBIT IDOL    untouchable until its three moons are gone           HEXER          slows your blows while it can see you              RICOCHET ORB  never stops; needs a breath after six bounces
 *  LODESTONE     swallows arrows and bolts                            FENCER         darts in, thrusts, is gone                         CAPACITOR    cannot charge while you stand beside it
 *  SAPPER        lays proximity mines                                 DRUMMER        quickens every foe near it                         BANSHEE      her wail strips your dash
 *  LEECH IDOL    drinks through a tether you must cut                 CARAPACE       open only to strike, then it must breathe           STRANDSPINNER lays stinging thread wall to wall
 *  plus six twists on the oldest foes that join the six lands of v3, and six elite traits (Plated, Leaping, Vengeful, Rallying, Draining, Echoing).
 *  All of them join the ordinary spawn pools by floor (never as key carriers' only escape: nothing here leaves a room alive).  Their bestiary entries come with them.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds, A = ED.ai;
  const TAU = U.TAU, V = 'v19';

  P.define({
    id: 'v19', name: 'BESTIARY', tag: 'foes that change how you fight', color: '#e87ac8',
    blurb: 'Eighteen new foes for any land, each with a behaviour the game did not have (a tracking laser, a pair on one thread, foes that raise the dead, a lodestone that eats arrows, a wail that strips your dash...), six twists on the old foes that join the v3 lands, and six elite traits.',
  });

  const foe = (o) => Object.assign({ pack: V, contact: true }, o);
  const eyes = (c, e, spread) => {
    const a = e.face || 0, d = e.r * 0.35, s = Math.max(1.5, e.r * 0.2);
    for (const sg of [-1, 1]) {
      const ex = e.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * sg * e.r * spread, ey = e.y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * sg * e.r * spread;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, s, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(ex + Math.cos(a) * s * 0.4, ey + Math.sin(a) * s * 0.4, s * 0.5, 0, TAU); c.fill();
    }
  };
  const glow = (c, x, y, r, col, a) => { const R = ED.render; if (R && R.glow) R.glow(c, x, y, r, col, a); };
  /** survivors that never close the distance are told to charge after a while (a locked room must always be finishable) */
  const rushed = (e, g, i, k) => { if (!e.rush) return false; A.chase(g, e, i, (k || 0.9) * g.dif.enemySpeed * e.spdMul, 0); return true; };
  const near = (g, e, r, f) => g.enemies.filter(x => x !== e && !x.dead && !x.boss && U.dist2(e.x, e.y, x.x, x.y) < r * r && (!f || f(x)));
  const dmgOf = (g, k) => k * g.dif.enemyDmg;
  const clash = (what, id) => (ED.collisions = ED.collisions || []).push(what + ' ' + id);
  const register = (table) => { for (const id in table) { if (ED.enemyTypes[id]) clash('foe', id); table[id].id = id; ED.enemyTypes[id] = table[id]; } };

  // ------------------------------------------------------------------ the foes
  const FOES = {
    sniper: foe({ name: 'Lamplighter', shape: 'tri', color: '#e8d890', r: 11, hp: 10, speed: 0.9, dmg: 2, shot: 4.2, cost: 2.4, weight: 3, minFloor: 5,
      desc: 'Keeps far away and paints a thin line on you. The line follows for a moment, then locks and turns red — step off it before the bolt arrives.',
      init(e, g) { e.cd = 100 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'track') {
          e.windup -= g.ts; if (e.windup > 24) e.aim = i.ang; const z = e.line; if (z && !z.dead) { z.x = e.x; z.y = e.y; z.x2 = e.x + Math.cos(e.aim) * 720; z.y2 = e.y + Math.sin(e.aim) * 720; if (e.windup <= 24) z.color = '#ff3a3a'; }
          if (e.windup <= 0) { e.state = null; e.cd = 160 / e.rate; g.eShot(e, e.aim, 7, { dmg: 1.4, color: '#fff0a0', r: 4, life: 120 }); g.sfx('zap', { vol: 0.6 }); }
          return;
        }
        if (rushed(e, g, i)) return; A.kite(g, e, i, 330, e.curSpeed, 0.6);
        if ((e.cd -= g.ts) <= 0 && i.d < 500 && A.clear(g, e.x, e.y, p.x, p.y, false)) { e.state = 'track'; e.windup = g.tele(66); e.aim = i.ang; e.line = g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 720, e.y + Math.sin(i.ang) * 720, 7, e.windup, 0, { color: '#ffd24a', hurts: false }); g.sfx('telegraph', { vol: 0.4 }); }
      }, draw(c, e) { eyes(c, e, 0.45); } }),
    twinhusk: foe({ name: 'Twin Husk', shape: 'square', color: '#a8a8c8', r: 12, hp: 14, speed: 1.3, dmg: 3, cost: 1.6, weight: 3, minFloor: 7, group: 2,
      desc: 'Two bodies on one thread: whichever falls first, the other howls, heals a little and runs faster for a while. Kill them within three seconds of each other.',
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if ((!e.mate || e.mate.dead) && !e.enr) { const m = g.enemies.find(o => o !== e && !o.dead && o.type === 'twinhusk' && !o.mate); if (m) { e.mate = m; m.mate = e; } }
        if (e.enr > 0) { e.enr -= g.ts; if (e.enr <= 0) { e.enr = 0; e.dmg = e.dmg0; } }
        A.chase(g, e, i, e.curSpeed * (e.enr > 0 ? 1.6 : 1), Math.sin(e.t * 0.1 + e.seed) * 0.4);
      },
      onDeath(e, g) { const m = e.mate; if (m && !m.dead && !m.enr) { m.enr = 180; m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.4); m.dmg0 = m.dmg; m.dmg *= 1.5; g.addText(m.x, m.y - m.r - 8, 'HOWL!', '#ff9aa8', 14); g.ringFx(m.x, m.y, 6, 60, '#ff9aa8', 20, 4); g.sfx('bossroar', { vol: 0.3 }); } },
      draw(c, e) { const m = e.mate; if (m && !m.dead && e.id < m.id) { c.strokeStyle = 'rgba(200,200,230,0.55)'; c.lineWidth = 2; c.setLineDash && c.setLineDash([4, 4]); c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(m.x, m.y); c.stroke(); c.setLineDash && c.setLineDash([]); } if (e.enr > 0) { c.strokeStyle = '#ff6a7a'; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, e.r + 4, 0, TAU); c.stroke(); } eyes(c, e, 0.4); } }),
    gravedigger: foe({ name: 'Gravedigger', shape: 'hex', color: '#8a7a6a', r: 13, hp: 18, speed: 0.9, dmg: 2, shot: 2, cost: 2.6, weight: 3, minFloor: 10,
      desc: 'Walks the room behind you and raises the foes you have already killed — once each, and weaker. Kill it first and the dead stay down.',
      init(e) { e.cd = 120; },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt; e.face = i.ang;
        if (e.state === 'raise') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 170 / e.rate; const c = e.target; if (c && g.rt === rt) { g.spawnEnemy(c.type, c.x, c.y, { minion: true, hpMul: 0.5, quick: true, extra: { revived: true } }); g.burst(c.x, c.y, 12, '#a8ff9a', 3, 22); g.sfx('summon', { vol: 0.5 }); } } return; }
        if (rushed(e, g, i)) return; A.kite(g, e, i, 240, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0) { const c = rt && (rt.corpses || []).find(k => !k.used); if (c) { c.used = true; e.state = 'raise'; e.target = c; e.windup = g.tele(44); g.zoneCircle(e, c.x, c.y, 40, e.windup, 0, { color: '#a8ff9a', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); } else e.cd = 40; }
      }, draw(c, e) { c.strokeStyle = '#5a4a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x + e.r, e.y + e.r); c.lineTo(e.x + e.r * 0.4, e.y - e.r * 1.1); c.stroke(); c.fillStyle = '#8a8a9a'; c.fillRect(e.x + e.r * 0.1, e.y - e.r * 1.3, e.r * 0.7, e.r * 0.4); eyes(c, e, 0.4); } }),
    icecaller: foe({ name: 'Rime Weaver', shape: 'diamond', color: '#a8e0ff', r: 11, hp: 13, speed: 1.0, dmg: 2, shot: 2, cost: 2.0, weight: 3, minFloor: 9, flying: true, contact: false,
      desc: 'Freezes the floor under your feet so you slide where it wants. Stay off the white — or dash, which brakes you.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'cast') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 190 / e.rate; if (g.rt && g.room.rt === g.rt) W.swapTiles(g, g.rt, W.tilesNear(g, e.tx, e.ty, 60), T.ICE, 520); g.burst(e.tx, e.ty, 12, '#bff0ff', 3, 22); g.sfx('crack', { vol: 0.4 }); } return; }
        if (rushed(e, g, i, 1.0)) return; A.kite(g, e, i, 230, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0) { e.state = 'cast'; e.windup = g.tele(42); e.tx = U.clamp(p.x + (p.vx || 0) * 10, 70, 890); e.ty = U.clamp(p.y + (p.vy || 0) * 10, 70, 506); g.zoneCircle(e, e.tx, e.ty, 60, e.windup, 0, { color: '#bff0ff', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      } }),
    fuseimp: foe({ name: 'Fuse Imp', shape: 'circle', color: '#ff8a4a', r: 8, hp: 5, speed: 1.9, dmg: 1, shot: 3, cost: 0.9, weight: 4, minFloor: 6, group: 4, noElite: true,
      desc: 'Runs straight at you and lights its own fuse when it is close. Kill it before it burns down — or dash clear of the blast. A blast sets the next imp\'s fuse short.',
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'fuse') {
          e.fuse -= g.ts; e.vis = 0.6 + 0.4 * Math.sin(e.t * 0.7); A.chase(g, e, i, e.curSpeed * 0.35, 0);
          if (e.fuse <= 0 && !e.dead) { const x = e.x, y = e.y; e.noLoot = !e.carriesKey; g.explode(x, y, 58, e.shotDmg * 1.1, { owner: 'enemy', fire: true }); for (const o of near(g, e, 70, q => q.type === 'fuseimp' && q.state === 'fuse')) o.fuse = Math.min(o.fuse, 8); g.killEnemy(e, { src: 'fuse' }); }
          return;
        }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.2 + e.seed) * 0.5);
        if (i.d < 46) { e.state = 'fuse'; e.fuse = g.tele(46); g.sfx('fuse', { vol: 0.4 }); g.zoneCircle(e, e.x, e.y, 58, e.fuse + 2, 0, { color: '#ff8a4a', hurts: false, burst: false, follow: true, upd: (gg, z) => { if (e.dead) z.dead = true; } }); }
      } }),
    beacon: foe({ name: 'Signal Brazier', shape: 'square', color: '#ff9a3a', r: 12, hp: 20, speed: 0, dmg: 1, cost: 2.2, weight: 3, minFloor: 11, contact: false, noElite: true,
      desc: 'A lit brazier that counts: when the ring around it fills it calls three more foes. Put the fire out first.',
      init(e) { e.timer = 0; e.fired = false; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; if (rushed(e, g, i)) return;
        if (e.fired) return; e.timer += g.ts;
        if (e.timer >= 480) {
          e.fired = true; g.toast('A signal fire is lit — reinforcements!', '#ff9a3a', 120); g.sfx('summon'); g.ringFx(e.x, e.y, 6, 120, '#ff9a3a', 24, 5);
          const pool = D.enemyPool(g.floorNum).filter(id => { const d = ED.enemyTypes[id]; return d && !d.boss && id !== 'beacon' && d.cost <= 2.4 && d.weight > 0 && d.speed > 0; });
          for (let k = 0; k < 3 && pool.length; k++) { const a = g.rng.next() * TAU, sp = g.findSpot(e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80, 0, 60, 12); g.queueSpawn(g.rng.pick(pool), sp.x, sp.y, { minion: true }); }
        }
      },
      draw(c, e) { const k = e.fired ? 1 : Math.min(1, e.timer / 480); c.strokeStyle = e.fired ? '#5a3a1a' : '#ffd24a'; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, e.r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke(); c.fillStyle = e.fired ? '#4a3a2a' : '#ff6a2a'; c.beginPath(); c.moveTo(e.x, e.y - e.r * 1.3); c.lineTo(e.x + e.r * 0.5, e.y - e.r * 0.2); c.lineTo(e.x - e.r * 0.5, e.y - e.r * 0.2); c.closePath(); c.fill(); } }),
    satelliter: foe({ name: 'Orbit Idol', shape: 'star', color: '#c8b0ff', r: 13, hp: 24, speed: 0.8, dmg: 2, shot: 2.5, cost: 3.0, weight: 3, minFloor: 12,
      desc: 'Wrapped in three little moons that guard it and bite. It cannot be hurt until the moons are gone — and they come back if it is left alone for long.',
      init(e) { e.sats = []; e.orb = 0; e.regen = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (!e.born) { e.born = true; spawnSats(e, g); }
        e.sats = e.sats.filter(s => !s.dead); e.invuln = e.sats.length > 0; e.orb += 0.05 * g.ts;
        e.sats.forEach((s, k) => { const a = e.orb + k * TAU / 3; s.x = e.x + Math.cos(a) * 52; s.y = e.y + Math.sin(a) * 52; });
        if (!e.sats.length) { e.regen += g.ts; if (e.regen > 520) { e.regen = 0; spawnSats(e, g); } } else e.regen = 0;
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.06 + e.seed) * 0.4);
      },
      onDeath(e, g) { for (const s of e.sats || []) { s.dead = true; s.noLoot = true; g.burst(s.x, s.y, 6, '#c8b0ff', 2.5, 16); } },
      draw(c, e) { if (e.invuln) { c.strokeStyle = 'rgba(200,176,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, e.r + 6, 0, TAU); c.stroke(); } eyes(c, e, 0.4); } }),
    orbitsat: foe({ name: 'Moon', hidden: true, shape: 'circle', color: '#e0d0ff', r: 7, hp: 3, speed: 0, dmg: 2, shot: 2, cost: 0, weight: 0, minFloor: 99, flying: true, noElite: true, noKnock: true,
      desc: 'A small moon that guards its idol and bites.',
      update(e, g) { if (!e.parent || e.parent.dead) { e.dead = true; e.noLoot = true; } } }),
    hexer: foe({ name: 'Hexer', shape: 'tri', color: '#c070ff', r: 11, hp: 15, speed: 0.9, dmg: 1, shot: 2, cost: 2.2, weight: 3, minFloor: 13, contact: false,
      desc: 'Drapes a curse over you while it can see you: your blows come a third slower. Break its line of sight — or break it.',
      update(e, g) { const i = A.info(g, e), p = g.player; e.face = i.ang; if (!rushed(e, g, i)) A.kite(g, e, i, 270, e.curSpeed, 0.8); e.hexing = !p.dead && i.d < 440 && A.clear(g, e.x, e.y, p.x, p.y, true); },
      draw(c, e, t) { if (e.hexing) { c.strokeStyle = 'rgba(192,112,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, e.r + 5 + Math.sin((t || 0) * 0.2) * 2, 0, TAU); c.stroke(); } eyes(c, e, 0.4); } }),
    ricochet: foe({ name: 'Ricochet Orb', shape: 'circle', color: '#ffd0f0', r: 10, hp: 14, speed: 0, dmg: 3, cost: 2.0, weight: 3, minFloor: 8, noElite: true,
      desc: 'Never stops: it rebounds off every wall, a little faster each time. After six bounces it must catch its breath — that is when to hit it.',
      init(e, g) { const a = g.rng.next() * TAU; e.v = 2.4; e.vx2 = Math.cos(a) * e.v; e.vy2 = Math.sin(a) * e.v; e.bn = 0; },
      update(e, g) {
        if (e.state === 'rest') { e.sT -= g.ts; e.vuln = 1.4; if (e.sT <= 0) { e.state = null; e.vuln = 1; const i = A.info(g, e), a = i.ang + (g.rng.next() - 0.5) * 0.8; e.v = 2.6; e.vx2 = Math.cos(a) * e.v; e.vy2 = Math.sin(a) * e.v; e.bn = 0; } return; }
        const m = ED.phys.move(g, e, e.vx2 * g.ts, e.vy2 * g.ts), bounce = m.bx || m.by; if (m.bx) e.vx2 = -e.vx2; if (m.by) e.vy2 = -e.vy2;
        if (bounce) { e.bn++; e.v = Math.min(6.2, e.v * 1.18); const s = Math.hypot(e.vx2, e.vy2) || 1; e.vx2 = e.vx2 / s * e.v; e.vy2 = e.vy2 / s * e.v; g.sfx('block', { vol: 0.3 }); if (e.bn >= 6) { e.state = 'rest'; e.sT = 80; g.addText(e.x, e.y - e.r - 6, 'dizzy', '#ffd24a', 11); } }
        g.trailFx(e.x, e.y, '#ffd0f0', 0.35); e.face = Math.atan2(e.vy2, e.vx2);
      }, draw(c, e) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, e.r * 0.55, 0, TAU); c.stroke(); } }),
    lodestone: foe({ name: 'Lodestone', shape: 'hex', color: '#7a8aa8', r: 14, hp: 26, speed: 0.7, dmg: 2, cost: 2.6, weight: 3, minFloor: 14,
      init(e) { e.swallowed = 0; e.overload = 0; },
      desc: 'A walking magnet. Arrows, bolts and thrown things curve toward it and are swallowed whole — until it has swallowed too many and sparks, open for a moment; swords do not care.',
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; A.chase(g, e, i, e.curSpeed, 0);
        if (e.overload > 0) { e.overload -= g.ts; e.vuln = 1.4; if (e.overload <= 0) e.vuln = 1; if (e.t % 8 < g.ts) g.burst(e.x, e.y, 2, '#ffe14a', 2, 10); return; }          // (spent: no ranged build is ever locked out of a room by one)
        for (const b of g.pproj) {
          if (b.dead || b.kind === 'boom' || b.upd || b.noHit || b.persist) continue; const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy);
          if (d < e.r + 16) { b.dead = true; g.burst(e.x, e.y, 5, '#9ab0d0', 2.5, 14); g.addText(e.x, e.y - e.r - 6, 'absorbed', '#9ab0d0', 9); if (++e.swallowed >= 6) { e.swallowed = 0; e.overload = 200; g.addText(e.x, e.y - e.r - 14, 'OVERLOADED', '#ffe14a', 11); g.ringFx(e.x, e.y, 8, 50, '#ffe14a', 16, 3); g.sfx('zap'); } continue; }
          if (d < 240) { const f = 0.12 + 0.55 * (1 - d / 240), sp = Math.hypot(b.vx, b.vy) || 1; b.vx += dx / d * f; b.vy += dy / d * f; const s2 = Math.hypot(b.vx, b.vy) || 1; b.vx *= sp / s2; b.vy *= sp / s2; }
        }
      },
      draw(c, e) { c.strokeStyle = '#d05a5a'; c.lineWidth = 4; c.beginPath(); c.arc(e.x, e.y - 2, e.r * 0.55, Math.PI, 0); c.stroke(); c.strokeStyle = '#d8d8e8'; c.beginPath(); c.moveTo(e.x - e.r * 0.55, e.y - 2); c.lineTo(e.x - e.r * 0.55, e.y + e.r * 0.4); c.moveTo(e.x + e.r * 0.55, e.y - 2); c.lineTo(e.x + e.r * 0.55, e.y + e.r * 0.4); c.stroke(); eyes(c, e, 0.4); } }),
    fencer: foe({ name: 'Fencer', shape: 'tri', color: '#ff9ab0', r: 11, hp: 12, speed: 1.6, dmg: 3.5, cost: 1.8, weight: 4, minFloor: 5,
      desc: 'Darts in, thrusts, and is gone again before you can answer. Hit it as it commits, not as it leaves.',
      init(e, g) { e.cd = 40 + g.rng.int(0, 40); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup > 4) e.tAng = i.ang; if (e.windup <= 0) { e.state = 'dash'; e.sT = 8; g.sfx('lunge', { vol: 0.5 }); } return; }
        if (e.state === 'dash') { A.walk(g, e, e.tAng, 9.5 * e.spdMul); g.trailFx(e.x, e.y, '#ff9ab0', 0.6); if ((e.sT -= g.ts) <= 0) { e.state = 'back'; e.sT = 46; } return; }
        if (e.state === 'back') { A.walk(g, e, i.ang + Math.PI, 2.6 * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 38 / e.rate; } return; }
        if (rushed(e, g, i, 1.2)) return;
        if (i.d > 100) A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.12 + e.seed) * 0.3);
        if ((e.cd -= g.ts) <= 0 && i.d < 130) { e.state = 'wind'; e.windup = g.tele(14); e.tAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 110, e.y + Math.sin(i.ang) * 110, 16, e.windup, 0, { color: '#ff9ab0', hurts: false }); }
      }, draw(c, e) { c.strokeStyle = '#e8e8f0'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x + Math.cos(e.face) * e.r * 0.8, e.y + Math.sin(e.face) * e.r * 0.8); c.lineTo(e.x + Math.cos(e.face) * e.r * 1.9, e.y + Math.sin(e.face) * e.r * 1.9); c.stroke(); eyes(c, e, 0.4); } }),
    capacitor: foe({ name: 'Capacitor', shape: 'diamond', color: '#7fe0ff', r: 12, hp: 22, speed: 0, dmg: 2, shot: 2.5, cost: 2.4, weight: 3, minFloor: 15,
      desc: 'Charges while you keep your distance and discharges a ring of bolts when full. Stand beside it and it can never charge.',
      init(e) { e.charge = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; if (rushed(e, g, i)) return;
        e.charge = U.clamp(e.charge + (i.d < 100 ? -2.5 : 0.45) * g.ts, 0, 100);
        if (e.charge >= 100) { e.charge = 0; g.ringShot(e, 14, 2.6, g.rng.next() * TAU, { dmg: 0.9, color: '#7fe0ff', r: 4 }); g.sfx('zap', { vol: 0.6 }); g.ringFx(e.x, e.y, 8, 70, '#7fe0ff', 16, 4); }
      }, draw(c, e) { c.fillStyle = '#10243a'; c.fillRect(e.x - 14, e.y + e.r + 5, 28, 5); c.fillStyle = e.charge > 85 ? '#fff' : '#7fe0ff'; c.fillRect(e.x - 14, e.y + e.r + 5, 28 * e.charge / 100, 5); eyes(c, e, 0.4); } }),
    sapper: foe({ name: 'Sapper', shape: 'circle', color: '#9a8a5a', r: 10, hp: 11, speed: 1.1, dmg: 2, shot: 3, cost: 2.0, weight: 3, minFloor: 9,
      desc: 'Scuttles around the edges of the room laying mines. They are quiet, they arm after a second, and they go off when you step near.',
      init(e, g) { e.cd = 60 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt; e.face = i.ang; if (rushed(e, g, i)) return; A.kite(g, e, i, 250, e.curSpeed, 0.9);
        if ((e.cd -= g.ts) <= 0) { e.cd = 110 / e.rate; if (rt) { const m = rt.mines || (rt.mines = []); if (m.length < 7) { m.push({ x: e.x, y: e.y, t: 0, src: e, dmg: e.shotDmg }); g.sfx('ui', { vol: 0.25 }); } } }
      }, draw(c, e) { c.fillStyle = '#5a4a2a'; c.fillRect(e.x - e.r * 0.6, e.y - e.r * 1.1, e.r * 1.2, e.r * 0.4); eyes(c, e, 0.4); } }),
    conductor: foe({ name: 'Drummer', shape: 'square', color: '#e0a050', r: 12, hp: 18, speed: 0.9, dmg: 1, cost: 2.4, weight: 3, minFloor: 16, contact: false,
      desc: 'Beats a drum that quickens every foe near it: a third faster, a third more often. Silence it and the room slows.',
      update(e, g) { const i = A.info(g, e); e.face = i.ang; if (!rushed(e, g, i)) A.kite(g, e, i, 250, e.curSpeed, 0.8); for (const o of near(g, e, 190)) o.haste = 10; if (e.t % 40 < g.ts) g.ringFx(e.x, e.y, 10, 190, '#e0a050', 18, 2); },
      draw(c, e, t) { c.fillStyle = '#6a4020'; c.fillRect(e.x - e.r * 0.7, e.y - e.r * 0.2, e.r * 1.4, e.r * 0.8); c.strokeStyle = '#ffe0a0'; c.lineWidth = 2; const k = Math.sin((t || 0) * 0.5) * 3; c.beginPath(); c.moveTo(e.x - 8, e.y - 12 + k); c.lineTo(e.x - 2, e.y - 3); c.moveTo(e.x + 8, e.y - 12 - k); c.lineTo(e.x + 2, e.y - 3); c.stroke(); } }),
    banshee: foe({ name: 'Banshee', shape: 'ghost', color: '#c8e0ff', r: 11, hp: 15, speed: 1.0, dmg: 2, shot: 2, cost: 2.4, weight: 3, minFloor: 14, flying: true, contact: false,
      desc: 'Wails when you are in range: the cry strips your dash for nearly two seconds. Learn to fight without it — or silence her.',
      init(e, g) { e.cd = 100 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.state === 'wail') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 230 / e.rate; if (!p.dead && Math.hypot(p.x - e.x, p.y - e.y) < 300) { p.dashCd = Math.max(p.dashCd, 110); g.addText(p.x, p.y - 26, 'DASH LOST', '#c8e0ff', 13); } g.ringFx(e.x, e.y, 10, 300, '#c8e0ff', 22, 5); g.sfx('bossroar', { vol: 0.4 }); } return; }
        if (rushed(e, g, i, 1.0)) return; A.kite(g, e, i, 250, e.curSpeed, 0.9);
        if ((e.cd -= g.ts) <= 0 && i.d < 330) { e.state = 'wail'; e.windup = g.tele(42); g.zoneCircle(e, e.x, e.y, 300, e.windup, 0, { color: '#c8e0ff', hurts: false, burst: false, follow: true }); g.sfx('telegraph', { vol: 0.4 }); }
      }, draw(c, e) { c.fillStyle = '#10182a'; c.beginPath(); c.ellipse(e.x, e.y + 1, e.r * 0.3, e.r * 0.4, 0, 0, TAU); c.fill(); eyes(c, e, 0.4); } }),
    siphon: foe({ name: 'Leech Idol', shape: 'blob', color: '#d05a8a', r: 12, hp: 20, speed: 0.8, dmg: 1.5, shot: 2, cost: 2.6, weight: 3, minFloor: 11,
      desc: 'Opens a tether to you and drinks while it holds: it heals and you slow. Break the line behind cover, or dash through it.',
      init(e) { e.cut = 0; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang; if (!rushed(e, g, i)) A.kite(g, e, i, 220, e.curSpeed, 0.7);
        if (e.cut > 0) e.cut -= g.ts;
        e.tether = !p.dead && e.cut <= 0 && i.d < 270 && A.clear(g, e.x, e.y, p.x, p.y, true);
        if (e.tether) { if (p.dashT > 0) { e.cut = 130; e.tether = false; g.addText(p.x, p.y - 24, 'cut!', '#d05a8a', 12); } else { p.slowT = Math.max(p.slowT || 0, 4); e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.0012 * g.ts); } }
        e.px = p.x; e.py = p.y;
      },
      draw(c, e, t) { if (e.tether) { c.strokeStyle = 'rgba(208,90,138,' + (0.5 + 0.2 * Math.sin((t || 0) * 0.3)) + ')'; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.px, e.py); c.stroke(); } eyes(c, e, 0.45); } }),
    carapace: foe({ name: 'Carapace', shape: 'hex', color: '#7a9a8a', r: 15, hp: 32, speed: 0.8, dmg: 3.5, shot: 3.5, cost: 3.0, weight: 3, minFloor: 13,
      desc: 'Sealed in a shell that nothing gets through. It opens only to strike — a slam, then a long breath. Hit it while it breathes.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); e.invuln = true; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = 'open'; e.sT = 80; e.invuln = false; g.shockRing(e, e.x, e.y, 3, 22, 260, e.shotDmg * 0.8, { color: '#a8d8c0', r0: e.r }); g.shake(5); g.sfx('thud'); } return; }
        if (e.state === 'open') { e.sT -= g.ts; e.vuln = 1.3; if (e.sT <= 0) { e.state = null; e.vuln = 1; e.invuln = true; e.cd = 120 / e.rate; } return; }
        e.invuln = true; A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 170) { e.state = 'wind'; e.windup = g.tele(36); e.invuln = true; g.zoneCircle(e, e.x, e.y, 84, e.windup, 0, { color: '#a8d8c0', hurts: false, burst: false, follow: true }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { if (e.invuln) { c.strokeStyle = 'rgba(190,230,210,0.7)'; c.lineWidth = 4; c.beginPath(); c.arc(e.x, e.y, e.r + 3, 0, TAU); c.stroke(); } else { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('OPEN', e.x, e.y - e.r - 6); } eyes(c, e, 0.4); } }),
    strandspinner: foe({ name: 'Strandspinner', shape: 'circle', color: '#b0a0c8', r: 9, hp: 12, speed: 1.5, dmg: 2, shot: 2.5, cost: 2.2, weight: 3, minFloor: 10,
      desc: 'Runs from wall to wall laying thread; the lines sting for a long while. Cut across them quickly, or kill the spinner and wait them out.',
      init(e, g) { e.to = null; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; if (rushed(e, g, i, 1.0)) return;
        if (!e.to) { const horiz = g.rng.chance(0.5); e.to = horiz ? { x: g.rng.chance(0.5) ? 80 : 880, y: g.rng.range(90, 490) } : { x: g.rng.range(90, 870), y: g.rng.chance(0.5) ? 80 : 496 }; e.from = { x: e.x, y: e.y }; }
        const d = Math.hypot(e.to.x - e.x, e.to.y - e.y); e.leg = (e.leg || 0) + g.ts;
        if (d > 10 && e.leg < 360 && (e.blk || 0) < 24) { const m = A.walk(g, e, Math.atan2(e.to.y - e.y, e.to.x - e.x), e.curSpeed * 1.3); e.blk = m.bx || m.by ? (e.blk || 0) + 1 : 0; }
        else {                                                                                         // arrived (or the way is blocked): the thread is laid from where it started to where it stands
          if (Math.hypot(e.x - e.from.x, e.y - e.from.y) > 80 && g.zones.filter(z => z.strand).length < 5) g._zone({ kind: 'hazard', shape: 'line', x: e.from.x, y: e.from.y, x2: e.x, y2: e.y, w: 7, life: 520, dmg: e.shotDmg * 0.5, tick: 18, tickT: 0, src: e, strand: true, noInstant: true, color: '#d8c8f0' });
          e.to = null; e.leg = 0; e.blk = 0;
        }
      }, draw(c, e) { c.strokeStyle = '#6a5a8a'; c.lineWidth = 1.5; for (let k = 0; k < 4; k++) for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + sg * e.r * 1.6, e.y + (k - 1.5) * e.r * 0.6); c.stroke(); } eyes(c, e, 0.45); } }),
  };
  register(FOES);
  ED.freeFoes = ED.freeFoes || []; for (const id in FOES) if (!FOES[id].hidden) ED.freeFoes.push(id);
  function spawnSats(e, g) {
    for (let k = 0; k < 3; k++) { const s = g.spawnEnemy('orbitsat', e.x + Math.cos(k * 2.1) * 52, e.y + Math.sin(k * 2.1) * 52, { silent: true, minion: true }); s.parent = e; e.sats.push(s); }
    g.ringFx(e.x, e.y, 8, 60, '#c8b0ff', 16, 3);
  }

  // ------------------------------------------------------------------ what the foes leave behind: corpses (for the Gravedigger), mines, drums, curses
  const NO_RAISE = new Set(['gravedigger', 'beacon', 'orbitsat', 'fuseimp', 'ricochet', 'boneheap', 'satelliter', 'mimic', 'twinhusk']);
  ED.hook('kill', V, (g, e) => {
    const rt = g.rt; if (!rt || e.boss || e.minion || e.revived || NO_RAISE.has(e.type) || e.carriesKey) return;
    const c = rt.corpses || (rt.corpses = []); if (c.length < 6) c.push({ x: e.x, y: e.y, type: e.type, used: false });
  });
  ED.hook('tick', V, (g) => {
    const rt = g.rt, p = g.player;
    if (rt && rt.mines && rt.mines.length) {
      for (const m of rt.mines) { m.t += g.ts; if (!m.armed && m.t > 70) m.armed = true; if (m.armed && !p.dead && Math.hypot(p.x - m.x, p.y - m.y) < 32) { m.dead = true; g.explode(m.x, m.y, 60, m.dmg * 1.1, { owner: 'enemy' }); } else if (m.t > 900) m.dead = true; }
      U.compact(rt.mines, m => !m.dead);
    }
    for (const e of g.enemies) {                                                    // the Drummer's beat (and Rallying foes): faster and more often while the beat lasts
      if (e.haste > 0) { e.haste -= g.ts; if (!e.hasted) { e.hasted = true; e.sp0 = e.speed; e.rt0 = e.rate0; e.speed *= 1.35; e.rate0 *= 1.35; } }
      else if (e.hasted) { e.hasted = false; e.speed = e.sp0; e.rate0 = e.rt0; }
    }
    const hexed = !p.dead && g.enemies.some(e => e.type === 'hexer' && e.hexing && !e.dead); p.hexed = hexed; if (hexed) p.atkCd += 0.34;         // a third slower to swing, shoot or throw
  });
  ED.hook('draw', V, (g, c, t) => {
    const rt = g.rt; if (rt && rt.mines) for (const m of rt.mines) { c.strokeStyle = m.armed ? 'rgba(255,120,70,' + (0.35 + 0.2 * Math.sin(t * 0.2)) + ')' : 'rgba(180,170,120,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.arc(m.x, m.y, 7, 0, TAU); c.stroke(); c.fillStyle = m.armed ? 'rgba(255,120,70,0.5)' : 'rgba(180,170,120,0.3)'; c.fillRect(m.x - 1.5, m.y - 1.5, 3, 3); }
    const p = g.player; if (p.hexed) { c.strokeStyle = 'rgba(192,112,255,0.85)'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y - 26, 7, 0, TAU); c.stroke(); c.beginPath(); c.arc(p.x, p.y - 26, 2.5, 0, TAU); c.stroke(); }
  });
  ED.hook('endUI', V, () => {});

  // ------------------------------------------------------------------ twists on the oldest foes, one for each of v3's lands (they only join those pools while this update is on)
  const variant = (baseId, o, extra) => {
    const b = ED.enemyTypes[baseId], d = Object.assign({}, b, { pack: V, weight: 6, group: b.group }, o);
    d.update = function (e, g) { b.update.call(this, e, g); if (extra) extra(e, g); };
    return d;
  };
  const VARIANTS = {
    restless: variant('chaser', { name: 'Restless Gloomling', color: '#b8b0d8', minFloor: 3, world: 'crypts', desc: 'Does not stay down: the first time it dies it rises again as a Wraith.',
      onDeath(e, g) { if (!e.revived) g.spawnEnemy('phantom', e.x, e.y, { minion: true, hpMul: 0.4, quick: true, extra: { revived: true } }); } }),
    mirechaser: variant('chaser', { name: 'Mire Gloomling', color: '#8aa84a', minFloor: 7, world: 'mirewood', desc: 'Wades through the bog and leaves a slowing, poisonous trail behind it.' },
      (e, g) => { if (!e.flying && e.t % 30 < g.ts && g.zones.length < 30) g.hazardCircle(e, e.x, e.y, 18, 120, e.shotDmg * 0.3, { color: '#8ae06a', tick: 26, slow: true }); }),
    frostshooter: variant('shooter', { name: 'Rime Watcher', color: '#9fe4ff', minFloor: 11, world: 'glacial', desc: 'A Bonewatcher grown cold: every bolt it fires chills you to a crawl.' },
      (e, g) => { for (const b of g.eproj) if (b.src === e && !b.v19) { b.v19 = true; b.slow = 100; b.color = '#bff0ff'; } }),
    embercharger: variant('charger', { name: 'Cinder Tusker', color: '#e0703a', minFloor: 16, world: 'foundry', desc: 'Charges like a Tusker and leaves a line of fire where it ran.' },
      (e, g) => { if (e.state === 'dash' && e.t % 10 < g.ts && g.zones.length < 40) g.hazardCircle(e, e.x, e.y, 16, 110, e.shotDmg * 0.3, { color: '#ff6a2a', tick: 24 }); }),
    flickergnat: variant('swarm', { name: 'Flicker Gnat', color: '#a888d8', minFloor: 21, world: 'void', desc: 'Gnats that blink in and out of the dark; you only see half of them at any moment.' },
      (e, g) => { e.vis = (e.t + e.seed * 20) % 110 < 55 ? 1 : 0.14; }),
    stormshooter: variant('shooter', { name: 'Thunder Watcher', color: '#ffe14a', minFloor: 26, world: 'storm', desc: 'After every volley it calls a bolt down on where you are standing.' },
      (e, g) => { if (e.state === 'aim') e.wasAim = true; else if (e.wasAim) { e.wasAim = false; const p = g.player; g.zoneCircle(e, p.x + (p.vx || 0) * 14, p.y + (p.vy || 0) * 14, 34, g.tele(50), e.shotDmg * 1.1, { color: '#ffe14a', burst: true }); } }),
  };
  register(VARIANTS);
  for (const id in VARIANTS) { const w = W.byId[VARIANTS[id].world]; if (w && !w.enemies.includes(id)) w.enemies.push(id); }

  // ------------------------------------------------------------------ elite traits for any land (they join the elite pool through ED.freeMods)
  const MODS = {
    plated: { name: 'Plated', color: '#c0c8d8', glyph: '▣', minFloor: 10, desc: 'Its first three hits do nothing at all (a critical breaks two plates)',
      apply(e) { e.plates = 3; e.takeHit = function (g, hb, dmg, o) { if (this.plates > 0 && (o.src === 'melee' || o.src === 'proj' || o.src === 'explosion')) { this.plates = Math.max(0, this.plates - (o.crit ? 2 : 1)); g.addText(this.x, this.y - this.r - 6, 'PLATE', '#c0c8d8', 11); g.sfx('block', { vol: 0.5 }); g.burst(this.x, this.y, 5, '#c0c8d8', 3, 14); return 0; } return dmg; }; } },
    leaping: { name: 'Leaping', color: '#ff9a3a', glyph: '⤴', minFloor: 11, desc: 'Leaps to where you stand — telegraphed — and lands with a shockwave',
      update(e, g) {
        const p = g.player; if (e.boss || e.big) return;
        if (e.lp) { const h = e.lp; h.t += g.ts; const k = Math.min(1, h.t / h.dur); e.x = U.lerp(h.sx, h.tx, k); e.y = U.lerp(h.sy, h.ty, k); e.invuln = true; e.noContact = true; e.hold = true; if (k >= 1) { e.lp = null; e.invuln = false; e.hold = false; e.leapCd = 280; g.shockRing(e, e.x, e.y, 3.2, 20, 200, e.shotDmg * 0.7, { color: '#ff9a3a', r0: e.r }); g.shake(4); g.sfx('thud'); } return; }
        e.leapCd = (e.leapCd === undefined ? 150 : e.leapCd) - g.ts;
        if (e.leapCd <= 0 && !p.dead && !(e.stun > 0) && Math.hypot(p.x - e.x, p.y - e.y) > 90) {
          let t = ED.attacks.clampArena(p.x + (p.vx || 0) * 8, p.y + (p.vy || 0) * 8, 22); if (ED.phys.blocked(g, t.x, t.y, 12, !!e.flying, false)) t = g.findSpot(p.x, p.y, 0, 50, 12);
          const dur = g.tele(40); g.zoneCircle(e, t.x, t.y, 50, dur, e.shotDmg, { color: '#ff9a3a', burst: true }); e.lp = { sx: e.x, sy: e.y, tx: t.x, ty: t.y, t: 0, dur }; e.leapCd = 99999;
        }
      } },
    vengeful: { name: 'Vengeful', color: '#ff5a4a', glyph: '☠', minFloor: 12, desc: 'When it dies, every foe near it hits 35% harder for six seconds',
      onDeath(e, g) { for (const o of near(g, e, 230)) if (!o.venge) { o.venge = true; o.dmg *= 1.35; o.shotDmg *= 1.35; g.addText(o.x, o.y - o.r - 8, '!', '#ff5a4a', 14); g.after(360, () => { if (!o.dead && o.venge) { o.venge = false; o.dmg /= 1.35; o.shotDmg /= 1.35; } }); } g.ringFx(e.x, e.y, 8, 230, '#ff5a4a', 20, 4); } },
    rallying: { name: 'Rallying', color: '#e0a050', glyph: '♪', minFloor: 12, desc: 'Foes within 160px move and act a third faster',
      update(e, g) { for (const o of near(g, e, 160)) o.haste = 10; } },
    draining: { name: 'Draining', color: '#d05a8a', glyph: '⌛', minFloor: 13, desc: 'Each blow it lands adds a second and a half to your dash cooldown',
      onHitPlayer(e, g) { const p = g.player; p.dashCd = Math.max(p.dashCd, 0) + 90; } },
    echoing: { name: 'Echoing', color: '#c8b0ff', glyph: '≈', minFloor: 14, desc: 'Every few seconds, and when it dies, it throws a slow ring of echoes',
      update(e, g) { if (e.t > 60 && e.t % 330 < g.ts) g.ringShot(e, 8, 1.6, g.rng.next() * TAU, { dmg: 0.6, color: '#c8b0ff', r: 4 }); },
      onDeath(e, g) { g.ringShot(e, 8, 1.8, 0, { dmg: 0.6, color: '#c8b0ff', r: 4 }); } },
  };
  ED.freeMods = ED.freeMods || [];
  for (const id in MODS) { if (ED.mods[id]) clash('elite trait', id); ED.mods[id] = Object.assign({ id, pack: V }, MODS[id]); ED.freeMods.push(id); }
  ED.bestiary19 = { FOES, VARIANTS, MODS };
})(typeof globalThis !== 'undefined' ? globalThis : this);

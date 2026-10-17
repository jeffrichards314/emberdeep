/* EMBERDEEP — pack_v24.js : v24 "WORLDS III" — four more lands behind the doors of v17.
 *
 *  THE FOOTLIGHTS      a spotlight drifts across the stage: foes in the dark take almost no harm, foes in the light take more    door: carry a Playbill
 *  THE ROARING PIT     a crowd's Favor pays for flair and throws bottles when you bore it                                       door: a deed (the Showman)
 *  STARFALL REACH      meteors mark circles; their craters hold stardust that rots in five seconds — and sometimes a second falls  door: a cracked wall
 *  THE FOUNDERED GALLEON  the deck lists: everything not anchored slides; kegs roll and cannons keep the beat                       door: a memory (a fallen titan)
 *  Each land: a telegraphed rule, four exclusive foes with behaviours the game did not have, an elite trait that plays with the rule, a mini boss with a signature relic, music, a palette in the v23 art language.
 *  Reached through v17's roads (without v17 they have no door); everything here works with every other update off.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs, W = ED.worlds, A = ED.ai, K = ED.landkit;
  const TAU = U.TAU, V = 'v24', { L, dmgOf, eyes } = K;
  const glow = K.glow, mk = (w) => K.mk(w, V), register = K.register, relic = K.relic(V), mini = K.mini(V), mod = K.mod(V);

  P.define({
    id: 'v24', name: 'WORLDS III', tag: 'a stage, a pit, stars, a ship', color: '#ff9ad0',
    blurb: 'Four more lands behind the doors of v17 (it needs v17 to be reachable): the Footlights (a drifting spotlight decides who can be hurt), the Roaring Pit (the crowd\'s Favor pays for flair), Starfall Reach (meteors leave stardust that rots) and the Foundered Galleon (the deck lists and everything slides) — each with four foes, an elite trait, a mini boss and a signature relic.',
  });

  // ==================================================================== the doors: a playbill to carry, a deed to do (the Showman), a crack, a memory
  const R_ = ED.route;
  if (R_) {
    R_.CURIOS.playbill = { name: 'Playbill', color: '#ffd890', gain: 'A playbill, creased from many pockets. Some door would want to see it.', door: 'An empty gilt frame hangs on the door, waiting for a poster.', rumour: 'a playbill for tonight\'s performance' };
    R_.GLYPHS.curio.playbill = (c, r, col) => { c.strokeRect(-r * 0.6, -r * 0.85, r * 1.2, r * 1.7); c.beginPath(); c.moveTo(-r * 0.3, -r * 0.4); c.lineTo(r * 0.3, -r * 0.4); c.moveTo(-r * 0.3, 0); c.lineTo(r * 0.3, 0); c.moveTo(-r * 0.3, r * 0.4); c.lineTo(r * 0.1, r * 0.4); c.stroke(); };
    R_.DEEDS.showman = { name: 'Showman', door: 'The crowd roars for those who put on a show.', rumour: 'five foes felled inside ten seconds, in one room', test: (g, T_) => { const cr = R_.cross(g); return !!(cr.showman && cr.showman[T_ - 1]); } };
    // five kills inside ten seconds in one room — anywhere on the way
    ED.hook('kill', V, (g, e) => {
      if (!g.rt) return; const rt = g.rt, L_ = rt.killTimes || (rt.killTimes = []); L_.push(g.frame); while (L_.length > 5) L_.shift();
      if (L_.length === 5 && L_[4] - L_[0] <= 600 && R_.live && R_.live(g)) { const cr = R_.cross(g), tier = W.tierOf(g.floorNum); if (!(cr.showman && cr.showman[tier])) { (cr.showman = cr.showman || {})[tier] = true; g.toast('SHOWMAN! The crowd would remember that.', '#ffb04a', 200); g.sfx('unlock'); } }
    });
  }

  // ==================================================================== 1. THE FOOTLIGHTS
  //  A real lamp drifts along a dotted path.  Foes in its light are EXPOSED (+15% damage taken); foes in the dark are SHROUDED (-70%, no stun, no crit bonus).  Kite them into the light.
  const spotAt = (s, st) => { const px = 480 + Math.cos(s.a) * 300, py = 276 + Math.sin(s.a) * 150; s.x = st ? px + (st.x - px) * s.pullK : px; s.y = st ? py + (st.y - py) * s.pullK : py; };
  function footFilter(g, e, dmg, o) {
    if (e.footIn || (g.frame - (e.footLit || -99)) < 3) return dmg * 1.15;
    const cm = g.player.st.critMult; if (o.crit && cm) dmg /= cm; o.stun = 0; return dmg * 0.3;
  }
  const FOOT = {
    setup(g, room, rt, rng) { rt.spot = { a: rng.next() * TAU, x: 480, y: 276, r: 86, pullK: 0, fightT: 0, house: false }; rt.splats = []; spotAt(rt.spot, null); },
    tick(g, rt) {
      const s = rt.spot; if (!s) return; s.a += 0.0125 * g.ts; s.fightT = rt.lockdown ? s.fightT + g.ts : 0;
      const sh = g.enemies.find(e => e.type === 'stagehand' && !e.dead); s.pullK = sh ? Math.min(0.85, s.pullK + 0.004 * g.ts) : Math.max(0, s.pullK - 0.02 * g.ts); spotAt(s, sh || null);
      s.r = 86 * (s.fightT > 3600 ? 1.7 : 1); s.house = s.fightT > 4200;                                  // a long fight and the house lights come up: nothing can stall in the dark
      for (const e of g.enemies) if (!e.dead && !e.boss && !e.big) { if (!e.dmgFilter) e.dmgFilter = footFilter; e.footIn = e.footForce || s.house || Math.hypot(e.x - s.x, e.y - s.y) < s.r + e.r * 0.5; }
      for (const sp of rt.splats) { sp.t -= g.ts; if (!g.player.dead && Math.hypot(g.player.x - sp.x, g.player.y - sp.y) < sp.r) g.player.slowT = Math.max(g.player.slowT || 0, 4); }
      U.compact(rt.splats, sp => sp.t > 0);
    },
    under(g, c, t, rt) {
      const s = rt.spot; if (!s) return; c.save();
      c.strokeStyle = 'rgba(255,236,170,0.2)'; c.lineWidth = 2; c.setLineDash([3, 9]); c.beginPath(); c.ellipse(480, 276, 300, 150, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      const gr = c.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r); gr.addColorStop(0, 'rgba(255,244,190,0.34)'); gr.addColorStop(0.75, 'rgba(255,236,170,0.18)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); c.fillStyle = gr; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,240,180,0.5)'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.stroke();
      for (const sp of rt.splats) { c.fillStyle = 'rgba(210,70,50,' + Math.min(0.55, sp.t / 120) + ')'; c.beginPath(); c.ellipse(sp.x, sp.y, sp.r * 0.9, sp.r * 0.7, 0.3, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,200,150,0.35)'; c.beginPath(); c.arc(sp.x - 6, sp.y - 5, 5, 0, TAU); c.fill(); }
      c.restore();
    },
    draw(g, c, t, rt) {
      const s = rt.spot; if (!s) return;
      for (const e of g.enemies) { if (e.dead || e.boss || e.big || e.vis === 0) continue; if (e.footIn) { c.strokeStyle = 'rgba(255,224,120,0.6)'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.7, e.r * 1.1, e.r * 0.45, 0, 0, TAU); c.stroke(); } else { c.fillStyle = 'rgba(12,8,24,0.36)'; c.beginPath(); c.arc(e.x, e.y, e.r + 2, 0, TAU); c.fill(); c.strokeStyle = 'rgba(160,150,200,0.45)'; c.lineWidth = 1.4; c.setLineDash([3, 3]); c.beginPath(); c.arc(e.x, e.y, e.r + 3, 0, TAU); c.stroke(); c.setLineDash([]); } }
    },
  };
  if (ED.skin) { ED.skin.extraLights = ED.skin.extraLights || []; ED.skin.extraLights.push((g) => { const rt = g.rt; if (rt && rt.spot && rt.hzOn) return [{ x: rt.spot.x, y: rt.spot.y, r: rt.spot.r * 2, color: '#fff0b8', a: 1 }, { x: 480, y: 560, r: 420, color: '#ffc880', a: 0.35 }]; return null; }); }   // the lamp and the row of footlights along the front of the stage
  const lastKind = (def) => def.flying ? 'swoop' : def.shot ? 'volley' : (def.speed >= 1.5 || def.dmg >= 4) ? 'charge' : 'slam';
  ED.hook('kill', V, (g, e) => { const rt = g.rt; if (rt && rt.spot && !e.minion) rt.lastDead = { kind: lastKind(e.def), color: e.color, id: e.def.id }; });
  const f1 = mk('footlights');
  register({
    understudy: f1({ name: 'Understudy', shape: 'tri', color: '#c9b8e8', r: 12, hp: 15, speed: 1.35, dmg: 3, shot: 3, cost: 2.0, weight: 11, minFloor: 6,
      desc: 'Learns the part from whoever died last in the room and plays it: a volley, a charge, a swoop or a slam. With no one fallen yet it only knows the slam.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 50); },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt, last = rt && rt.lastDead; e.face = i.ang; e.mime = last ? last.kind : 'slam'; if (last) e.color = U.mix(e.def.color, last.color, 0.55);
        if (e.state === 'act') { A.walk(g, e, e.aim, 5.6); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 140 / e.rate; } return; }
        if (e.state === 'wind') {
          e.windup -= g.ts; if (e.kind === 'charge' || e.kind === 'volley') e.aim = e.kind === 'volley' ? i.ang : e.aim;
          if (e.windup <= 0) {
            const k = e.kind; e.state = null; e.cd = 140 / e.rate;
            if (k === 'volley') { for (let q = -1; q <= 1; q++) g.eShot(e, e.aim + q * 0.22, 3.1, { dmg: 1, color: '#d8c8f8', r: 5 }); g.sfx('shoot'); }
            else if (k === 'charge') { e.state = 'act'; e.sT = 18; g.sfx('lunge'); }
            else if (k === 'swoop') { e.x = e.tx; e.y = e.ty; ED.phys.unstick && ED.phys.unstick(g, e); g.shake(3); g.zoneCircle(e, e.x, e.y, 44, 6, dmgOf(g, 1.2), { color: '#c9b8e8', burst: true }); }
            else { g.zoneCircle(e, e.x, e.y, 62, 6, dmgOf(g, 1.3), { color: '#c9b8e8', burst: true }); g.shake(3); }
          }
          return;
        }
        if (i.d > 190) A.chase(g, e, i, e.curSpeed, 0); else if (i.d < 110) A.walk(g, e, i.ang + Math.PI, e.curSpeed * 0.8);
        if ((e.cd -= g.ts) <= 0 && i.d < 380) {
          e.kind = e.mime; e.state = 'wind'; e.aim = i.ang; e.windup = g.tele(e.kind === 'slam' ? 38 : 34);
          if (e.kind === 'volley') g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 300, e.y + Math.sin(i.ang) * 300, 12, e.windup, 0, { color: '#d8c8f8', hurts: false, burst: false });
          else if (e.kind === 'charge') g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 280, e.y + Math.sin(i.ang) * 280, 22, e.windup, 0, { color: '#c9b8e8', hurts: false, burst: false });
          else if (e.kind === 'swoop') { e.tx = U.clamp(g.player.x, 70, 890); e.ty = U.clamp(g.player.y, 70, 506); g.zoneCircle(e, e.tx, e.ty, 44, e.windup, 0, { color: '#c9b8e8', hurts: false, burst: false }); }
          else g.zoneCircle(e, e.x, e.y, 62, e.windup, 0, { color: '#c9b8e8', hurts: false, burst: false, follow: true });
          g.sfx('telegraph', { vol: 0.4 });
        }
      },
      draw(c, e) { c.fillStyle = 'rgba(20,10,30,0.8)'; c.beginPath(); c.ellipse(e.x, e.y - e.r * 0.15, e.r * 0.65, e.r * 0.4, 0, 0, TAU); c.fill(); c.fillStyle = e.state === 'wind' ? '#ffd24a' : '#f0e8ff'; c.fillRect(e.x - e.r * 0.4, e.y - e.r * 0.25, e.r * 0.25, e.r * 0.18); c.fillRect(e.x + e.r * 0.15, e.y - e.r * 0.25, e.r * 0.25, e.r * 0.18); } }),
    stagehand: f1({ name: 'Stagehand', shape: 'square', color: '#a07a4a', r: 12, hp: 22, speed: 1.0, dmg: 2, shot: 3, cost: 2.4, weight: 9, minFloor: 7,
      desc: 'Marks a sandbag drop under your shadow and lets it fall. Ignore it and it winches the spotlight toward itself, leaving the stage dark.',
      init(e, g) { e.cd = 100 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        A.kite(g, e, i, 250, e.curSpeed, 0.8);
        if ((e.cd -= g.ts) <= 0) { e.cd = 170 / e.rate; const tx = U.clamp(p.x + (p.vx || 0) * 10, 70, 890), ty = U.clamp(p.y + (p.vy || 0) * 10, 70, 506); g.zoneCircle(e, tx, ty, 44, g.tele(46), dmgOf(g, 1.6), { color: '#d0a050', burst: true, onEnd: (gg) => { gg.shake(3); gg.sfx('thud', { vol: 0.5 }); } }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { const rt = ED.game && ED.game.rt; if (rt && rt.spot && rt.spot.pullK > 0.05) { c.strokeStyle = 'rgba(255,230,160,' + Math.min(0.6, rt.spot.pullK) + ')'; c.lineWidth = 1.5; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(rt.spot.x, rt.spot.y); c.stroke(); c.setLineDash([]); } c.fillStyle = '#5a3a18'; c.fillRect(e.x - e.r * 0.7, e.y + e.r * 0.2, e.r * 1.4, e.r * 0.28); eyes(c, e, 0.4); } }),
    prompter: f1({ name: 'Prompter', shape: 'ghost', color: '#9a86c0', r: 11, hp: 9, speed: 0.95, dmg: 0, cost: 1.6, weight: 8, minFloor: 8, flying: true, contact: false,
      desc: 'Unseen and untouchable until it whispers. Each whisper hurries the nearest foe for four seconds. It shows itself only when it speaks: strike then.',
      init(e, g) { e.cyc = g.rng.int(0, 200); e.vis = 0.05; e.invuln = true; },
      update(e, g) {
        const i = A.info(g, e); e.cyc += g.ts; const ph = e.cyc % 260, show = ph > 200 && ph < 250; e.vis += ((show ? 1 : 0.05) - e.vis) * 0.2; e.invuln = e.vis < 0.5; e.face = i.ang;
        if (ph > 200) { if (!e.whispered) { e.whispered = true; let best = null, bd = 300 * 300; for (const o of g.enemies) if (o !== e && !o.dead && !o.boss && o.type !== 'prompter') { const d = U.dist2(e.x, e.y, o.x, o.y); if (d < bd) { bd = d; best = o; } } if (best) { K.haste(best, 240, 1.5); g.addText(best.x, best.y - best.r - 10, '»', '#ffe070', 14); g.ringFx && g.ringFx(e.x, e.y, 6, 60, '#b8a0e8', 20, 3); } g.addText(e.x, e.y - 16, '…', '#e0d0ff', 12); g.sfx('ui', { vol: 0.3 }); } } else e.whispered = false;
        A.kite(g, e, i, 270, e.curSpeed, 0.8);
      },
      draw(c, e) { c.fillStyle = '#10081e'; c.fillRect(e.x - e.r * 0.4, e.y - e.r * 0.3, e.r * 0.25, e.r * 0.4); c.fillRect(e.x + e.r * 0.15, e.y - e.r * 0.3, e.r * 0.25, e.r * 0.4); c.strokeStyle = '#e0d0ff'; c.lineWidth = 1.5; c.beginPath(); c.arc(e.x, e.y + e.r * 0.25, e.r * 0.25, 0.2, Math.PI - 0.2); c.stroke(); } }),
    heckler: f1({ name: 'Heckler', shape: 'blob', color: '#d8704a', r: 12, hp: 14, speed: 1.1, dmg: 2, shot: 3, cost: 1.9, weight: 11, minFloor: 6,
      desc: 'Pelts you with rotten fruit from the cheap seats. Every hit leaves a splat that drags at your feet for a few seconds. Stay out of the stickiest patches.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang; A.kite(g, e, i, 280, e.curSpeed, 0.85);
        if ((e.cd -= g.ts) <= 0 && i.d < 420) { e.cd = 150 / e.rate; const tx = U.clamp(p.x + (p.vx || 0) * 14, 70, 890), ty = U.clamp(p.y + (p.vy || 0) * 14, 70, 506), rt = g.rt; g.zoneCircle(e, tx, ty, 34, g.tele(40), dmgOf(g, 1.0), { color: '#e0604a', burst: false, onEnd: (gg) => { (rt.splats = rt.splats || []).push({ x: tx, y: ty, r: 34, t: 360 }); gg.burst(tx, ty, 8, '#e0604a', 3, 16); } }); g.sfx('swing', { vol: 0.4 }); }
      },
      draw(c, e) { eyes(c, e, 0.4); c.fillStyle = '#b02a1a'; c.beginPath(); c.arc(e.x + Math.cos(e.face) * e.r * 0.7, e.y + Math.sin(e.face) * e.r * 0.7 - 3, 3.2, 0, TAU); c.fill(); } }),
  });
  mod({ id: 'spotlit', name: 'Spotlit', color: '#ffe58a', glyph: '✦', desc: 'Carries its own light: always exposed — and it lights the foes beside it too',
    apply(e) { e.footForce = true; }, update(e, g) { e.footForce = true; for (const o of g.enemies) if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 90) o.footLit = g.frame; } });
  const critic = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#4a1a24'; c.beginPath(); c.moveTo(x - r * 0.8, y + r); c.lineTo(x - r * 0.45, y - r * 0.3); c.lineTo(x + r * 0.45, y - r * 0.3); c.lineTo(x + r * 0.8, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#efe6d8'; c.beginPath(); c.arc(x, y - r * 0.55, r * 0.46, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#1a1020'; c.fillRect(x - r * 0.62, y - r * 0.98, r * 1.24, r * 0.12); c.fillRect(x - r * 0.38, y - r * 1.55, r * 0.76, r * 0.62);
    c.strokeStyle = '#ffd24a'; c.lineWidth = 2; c.beginPath(); c.arc(x + r * 0.2, y - r * 0.55, r * 0.15, 0, TAU); c.stroke(); c.fillStyle = '#10101c'; c.fillRect(x - r * 0.26, y - r * 0.6, r * 0.12, r * 0.1);
    c.fillStyle = '#e8e0c8'; c.fillRect(x + r * 0.55, y + r * 0.1, r * 0.5, r * 0.7); c.fillStyle = '#6a5a3a'; c.fillRect(x + r * 0.62, y + r * 0.22, r * 0.36, 2); c.fillRect(x + r * 0.62, y + r * 0.4, r * 0.3, 2);
  };
  ED.bossDraw.critic = critic;
  mini({ id: 'critic', name: 'The Critic', title: 'Who Gives One Star', color: '#e8c070', r: 26, hp: 205, arena: 'arena_pillars', shape: 'critic', minFloor: 6, unlockText: 'Opera Glasses',
    attacks: { tomatoes: L('fan', { n: 5, spread: 0.26, reps: 2, speed: 2.8, color: '#e0604a' }), review: L('rain', { n: 8, r: 42, warn: 46, interval: 7, aimed: 0.7, color: '#e8c070' }), aisle: L('bars', { n: 3, thick: 44, gapW: 170, warn: 64, color: '#e8c070' }), slash: L('coneSlash', { arc: 1.7, r: 90, tele: 34, dmg: 1.4, color: '#e8c070' }), hecklers: L('summon', { types: ['heckler'], n: 2, max: 4, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'First Night', attacks: ['tomatoes', 'slash', 'hecklers'], idle: [32, 54] }, { at: 0.5, name: 'The Pan', attacks: ['aisle', 'review', 'tomatoes', 'hecklers', 'slash'], idle: [24, 42] }] });
  relic('operaglasses', { id: 'operaglasses', name: 'Opera Glasses', rarity: 'rare', color: '#e8c070', mods: { crit: 0.07, range: 0.1, luck: 1 }, max: 2, unlock: 'mini:critic', desc: 'A keener eye and a longer reach. (Unlockable)' });
  W.add({ id: 'footlights', name: 'The Footlights', short: 'FOOTLIGHTS', color: '#ffcf6a', pack: V, native: 6, tiers: [1, 99], risk: 0, gate: { kind: 'carry', id: 'playbill' },
    rule: 'A spotlight drifts across the stage. Foes in the dark take almost no harm; foes in the light take more — lure them in.',
    enemies: ['understudy', 'stagehand', 'prompter', 'heckler'], mod: 'spotlit', minis: ['critic'], hz: FOOT, music: { scale: 2, root: 41, bpm: 6, prog: [0, 4, 5, 3] },
    theme: { name: 'The Footlights', floorA: '#3a2a22', floorB: '#42302a', wall: '#5e2a34', wallTop: '#9c3c48', accent: '#ffcf6a', glow: '#ffd890', fog: '#140a0c', skin: { pattern: 'plank', wall: 'velvet', ambience: 'glints', ambient: '#e0c0a0', dim: 0.06 } } });

  // ==================================================================== 2. THE ROARING PIT
  //  The crowd keeps a number: Favor.  Kills in a chain raise it (+8 each, +4 more inside 3 s), a wound costs 40, boredom drains it.  50: a gift.  100: your next kill drops a relic shard.  Empty for 15 s: bottles.
  const favor = (g) => g.run.favor === undefined ? (g.run.favor = 25) : g.run.favor;
  function armShard(g) { const rt = g.rt, pit = rt && rt.pit; if (pit && !pit.armed && g.run.favor >= 99.5) { pit.armed = true; g.toast('THE CROWD ROARS — your next kill drops a relic shard!', '#ffd24a', 200); g.sfx('levelup'); } }
  function favorAdd(g, n) { const r = g.run; r.favor = U.clamp(favor(g) + n, 0, 100); if (n > 0 && g.addText) g.addText(g.player.x, g.player.y - 30, '+' + Math.round(n) + ' favor', '#ffb04a', 11); if (n > 0) armShard(g); }
  ED.pickupImpl.shard = {
    collect(g, k) { const r = g.run; r.shards = (r.shards | 0) + 1; g.sfx('pickup'); g.burst(k.x, k.y, 12, '#ffb04a', 3, 20); g.addText(k.x, k.y - 16, 'relic shard ' + r.shards + '/3', '#ffb04a', 12);
      if (r.shards >= 3) { r.shards = 0; const p = g.player, offers = I.rollOffers(new ED.RNG(r.seed + ':shards:' + g.frame), g.floorNum + 1, 3, { luck: p.st.luck + 1, relics: p.relics, minRank: 1, kinds: { relic: 1 } }); if (offers.length) { g.offerChoice(offers, 480, 150); g.toast('Three shards make a relic — choose one.', '#ffb04a', 220); } } return true; },
    draw(c, k, t, bob) { glow(c, k.x, k.y, 22, '#ffb04a', 0.5); c.save(); c.translate(k.x, k.y + bob); c.rotate(Math.sin(t * 0.06 + k.bob) * 0.3); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 0); c.lineTo(2, 8); c.lineTo(-5, 4); c.closePath(); c.fill(); c.strokeStyle = '#7a4a08'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(-1, -6, 2, 5); c.restore(); },
  };
  const PIT = {
    setup(g, room, rt) { favor(g); rt.pit = { zeroT: 0, bottleT: 0, gift: false, armed: false }; },
    tick(g, rt) {
      const pit = rt.pit; if (!pit || !rt.lockdown) return; const r = g.run, f0 = favor(g); r.favor = Math.max(0, f0 - 0.05 * g.ts);
      if (r.favor >= 50 && !pit.gift) { pit.gift = true; const p = g.player; g.dropPickup(p.hp < p.maxHp ? 'heart' : 'bomb', p.x + 30, p.y - 20, p.hp < p.maxHp ? 4 : 1); g.toast('The crowd throws a gift!', '#ffb04a', 130); g.sfx('pickup'); } else if (r.favor < 36) pit.gift = false;
      armShard(g);
      if (r.favor <= 0) { pit.zeroT += g.ts; if (pit.zeroT > 900) { pit.bottleT -= g.ts; if (pit.bottleT <= 0) { pit.bottleT = 150; const p = g.player, bx = U.clamp(p.x + U.rnd(-150, 150), 80, 880), by = U.clamp(p.y + U.rnd(-120, 120), 80, 500); g.zoneCircle(null, bx, by, 28, g.tele(44), dmgOf(g, 1.1), { color: '#9ad8c0', burst: true, onEnd: (gg) => gg.burst(bx, by, 8, '#cfeee0', 3, 16) }); g.addText(bx, by - 24, 'BOO!', '#9ad8c0', 11); } } } else { pit.zeroT = 0; pit.bottleT = 0; }
    },
    under(g, c, t, rt) {
      const f = favor(g) / 100; c.save();
      for (let row = 0; row < 2; row++) for (let i = 0; i < 64; i++) { const x = 8 + i * 15, hop = f > 0.5 ? Math.abs(Math.sin(t * 0.12 + i)) * 3 * f : 0, y = (row ? 562 : 17) + (row ? -2 : 2) - hop; c.fillStyle = 'hsl(' + ((i * 53 + row * 90) % 360) + ',28%,' + (24 + f * 14) + '%)'; c.beginPath(); c.arc(x, y, 6.4, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x - 6, y + 4, 12, 4); }
      c.restore();
    },
  };
  ED.hook('hud', V, (g, c) => {
    const rt = g.rt; if (!rt || !rt.pit || g.scene === 'intro') return; const f = U.clamp(favor(g), 0, 100), x = 792, y = 204, w = 160;
    c.fillStyle = 'rgba(6,4,14,0.8)'; c.fillRect(x - 4, y - 14, w + 8, 30); c.fillStyle = '#1c1020'; c.fillRect(x, y, w, 10); const gr = c.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#d04a2a'); gr.addColorStop(0.5, '#ffb04a'); gr.addColorStop(1, '#ffe27a'); c.fillStyle = gr; c.fillRect(x, y, w * f / 100, 10);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(x + w * 0.5 - 1, y - 2, 2, 14); c.fillRect(x + w - 2, y - 2, 2, 14); c.strokeStyle = '#7a6a8a'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, 9); ED.ui.text(c, 'FAVOR ' + Math.round(f) + (rt.pit.armed ? '  ★ SHARD READY' : rt.pit.zeroT > 0 ? '  boos' : ''), x, y - 4, 10, rt.pit.armed ? '#ffd24a' : '#ffb04a', 'left');
  });
  ED.hook('kill', V, (g, e) => {
    const rt = g.rt; if (!rt || !rt.pit || e.minion && e.def.id === 'pithound') return; const now = g.frame, chain = rt.lastKillT !== undefined && now - rt.lastKillT < 180; rt.lastKillT = now;
    favorAdd(g, 8 + (chain ? 4 : 0)); if (rt.pit.armed) { rt.pit.armed = false; favorAdd(g, -40); const k = g.dropPickup('shard', e.x, e.y, 1); g.sfx('keydrop'); }
  });
  ED.hook('hurt', V, (g) => { const rt = g.rt; if (rt && rt.pit && rt.lockdown) g.run.favor = Math.max(0, favor(g) - 40); });
  const f2 = mk('roaringpit');
  register({
    retiarius: f2({ name: 'Retiarius', shape: 'tri', color: '#c8a870', r: 12, hp: 20, speed: 1.15, dmg: 3, shot: 3, cost: 2.4, weight: 10, minFloor: 6,
      desc: 'Keeps its distance and throws a net: if it catches you, you are rooted for a second (a dash tears free). It never closes in — you must.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'wind') { e.windup -= g.ts; e.aim = i.ang; if (e.windup <= 0) { e.state = null; e.cd = 170 / e.rate; const b = g.eShot(e, e.aim, 3.4, { dmg: 0.4, color: '#e8d8a0', r: 9, life: 120, onDie: (gg, bb) => { const p = gg.player; if (bb.net && Math.hypot(bb.x - p.x, bb.y - p.y) < bb.r + p.hr + 8) K.rootPlayer(gg, 60, '#e8d8a0'); } }); if (b) b.net = true; g.sfx('shoot'); } return; }
        A.kite(g, e, i, 240, e.curSpeed, 0.9);
        if ((e.cd -= g.ts) <= 0 && i.d < 360 && A.clear(g, e.x, e.y, g.player.x, g.player.y, false)) { e.state = 'wind'; e.windup = g.tele(34); e.aim = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 330, e.y + Math.sin(i.ang) * 330, 14, e.windup, 0, { color: '#e8d8a0', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { c.strokeStyle = 'rgba(232,216,160,0.8)'; c.lineWidth = 1; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(e.x - e.r, e.y + k * 4); c.lineTo(e.x + e.r, e.y + k * 4); c.stroke(); c.beginPath(); c.moveTo(e.x + k * 4, e.y - e.r); c.lineTo(e.x + k * 4, e.y + e.r); c.stroke(); } eyes(c, e, 0.4); } }),
    shieldwall: f2({ name: 'Shieldwall', shape: 'hex', color: '#8a96a8', r: 13, hp: 26, speed: 0.95, dmg: 3, shot: 3, cost: 3.4, weight: 8, minFloor: 7, shield: 1.7,
      desc: 'Three bodies on one line, shields locked, advancing. Hit them from the sides — or break one: the survivors\' shields shrink and they stagger.',
      init(e, g) { e.cd = 120; e.mates = []; if (!e.minion) for (const sg of [-1, 1]) { const m = g.spawnEnemy('shieldwall', e.x + sg * 44, e.y, { minion: true, silent: true }); m.slot = sg; m.mates = [e]; e.mates.push(m); } else e.slot = 0; e.slot = e.slot || 0; },
      update(e, g) {
        const i = A.info(g, e), grp = [e].concat(e.mates || []).filter(m => !m.dead); e.face = i.ang;
        const lead = grp.reduce((b, m) => (!b || m.id < b.id ? m : b), null), ax = Math.cos(i.ang + Math.PI / 2), ay = Math.sin(i.ang + Math.PI / 2);
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 150 / e.rate; g.zoneCircle(e, e.x + Math.cos(i.ang) * 26, e.y + Math.sin(i.ang) * 26, 46, 6, dmgOf(g, 1.3), { color: '#8a96a8', burst: true }); g.shake(3); g.sfx('thud'); } return; }
        if (e === lead) A.chase(g, e, i, e.curSpeed * 0.9, 0);
        else { const tx = lead.x + ax * (e.slot || 1) * 46, ty = lead.y + ay * (e.slot || 1) * 46, d = Math.hypot(tx - e.x, ty - e.y); if (d > 6) A.walk(g, e, Math.atan2(ty - e.y, tx - e.x), Math.min(e.curSpeed * 1.5, d)); }
        if ((e.cd -= g.ts) <= 0 && i.d < 90) { e.state = 'wind'; e.windup = g.tele(30); g.zoneCircle(e, e.x + Math.cos(i.ang) * 26, e.y + Math.sin(i.ang) * 26, 46, e.windup, 0, { color: '#8a96a8', hurts: false, burst: false, follow: true, fx: Math.cos(i.ang) * 26, fy: Math.sin(i.ang) * 26 }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      onDeath(e, g) { const grp = (e.mates || []).concat((e.mates || []).flatMap(m => m.mates || [])).filter((m, k, a) => m !== e && !m.dead && a.indexOf(m) === k); for (const m of grp) { m.shieldArc = Math.min(m.shieldArc, 0.9); m.stun = Math.max(m.stun, 40); m.broken = true; g.addText(m.x, m.y - m.r - 8, 'LINE BROKEN', '#ffd24a', 10); } },
      draw(c, e) { c.fillStyle = '#d0d8e8'; c.fillRect(e.x - 2, e.y - e.r * 0.5, 4, e.r); eyes(c, e, 0.35); } }),
    beastmaster: f2({ name: 'Beastmaster', shape: 'diamond', color: '#b0703a', r: 13, hp: 24, speed: 1.0, dmg: 3, shot: 3, cost: 3.0, weight: 8, minFloor: 7,
      desc: 'Cracks a whip and keeps a pit hound at its heel. Kill the hound and the master goes wild; kill the master and the hound does. Choose which fury to face.',
      init(e, g) { e.cd = 110; if (!e.minion) { const b = g.spawnEnemy('pithound', e.x + 34, e.y, { minion: true, silent: true }); e.beast = b; b.master = e; } },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; const fr = e.frenzy ? 1.5 : 1;
        if (e.state === 'wind') { e.windup -= g.ts; e.lAng = i.ang; if (e.windup <= 0) { e.state = null; e.cd = 150 / (e.rate * fr); const len = 180; g.zoneLine(e, e.x, e.y, e.x + Math.cos(e.lAng) * len, e.y + Math.sin(e.lAng) * len, 16, 6, dmgOf(g, 1.4), { color: '#e0a060', burst: true }); g.sfx('lunge', { vol: 0.5 }); if (e.beast && !e.beast.dead) K.haste(e.beast, 90, 1.4); } return; }
        A.kite(g, e, i, 210, e.curSpeed * fr, 0.8);
        if ((e.cd -= g.ts) <= 0 && i.d < 230) { e.state = 'wind'; e.windup = g.tele(e.frenzy ? 22 : 32); e.lAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 180, e.y + Math.sin(i.ang) * 180, 16, e.windup, 0, { color: '#e0a060', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      onDeath(e, g) { if (e.beast && !e.beast.dead) { e.beast.frenzy = true; g.addText(e.beast.x, e.beast.y - e.beast.r - 8, 'FRENZY!', '#ff6a4a', 12); g.sfx('bossroar', { vol: 0.4 }); } },
      draw(c, e) { c.strokeStyle = '#6a4a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r); c.quadraticCurveTo(e.x + Math.cos(e.face) * e.r * 2, e.y + Math.sin(e.face) * e.r * 2 - 6, e.x + Math.cos(e.face + 0.5) * e.r * 2.4, e.y + Math.sin(e.face + 0.5) * e.r * 2.4); c.stroke(); if (e.frenzy) { c.fillStyle = '#ff4a2a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('FRENZY', e.x, e.y - e.r - 6); } eyes(c, e, 0.35); } }),
    pithound: f2({ name: 'Pit Hound', shape: 'circle', color: '#8a5a3a', r: 11, hp: 18, speed: 2.0, dmg: 3, cost: 99, weight: 0, minFloor: 99, noElite: true,
      desc: 'A starved hound that follows its master\'s whip. When the master falls it tears loose.',
      init(e, g) { e.cd = 60; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; const fr = e.frenzy ? 1.7 : 1;
        if (e.state === 'lunge') { A.walk(g, e, e.lungeAng, 4.6 * fr * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = (e.frenzy ? 55 : 100) / e.rate; } return; }
        if (e.state === 'wind') { e.windup -= g.ts; e.lungeAng = i.ang; if (e.windup <= 0) { e.state = 'lunge'; e.sT = 14; g.sfx('lunge'); } return; }
        A.chase(g, e, i, e.curSpeed * fr, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 170) { e.state = 'wind'; e.windup = g.tele(e.frenzy ? 18 : 26); }
      },
      onDeath(e, g) { const m = e.master; if (m && !m.dead) { m.frenzy = true; g.addText(m.x, m.y - m.r - 8, 'FRENZY!', '#ff6a4a', 12); g.sfx('bossroar', { vol: 0.4 }); } },
      draw(c, e) { eyes(c, e, 0.4); c.fillStyle = '#e8e0d0'; c.beginPath(); c.moveTo(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r - 2); c.lineTo(e.x + Math.cos(e.face) * e.r * 1.4, e.y + Math.sin(e.face) * e.r * 1.4); c.lineTo(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r + 3); c.fill(); } }),
    gadfly: f2({ name: 'Gadfly', shape: 'diamond', color: '#d8b050', r: 9, hp: 16, speed: 2.0, dmg: 2, shot: 2, cost: 2.2, weight: 9, minFloor: 8, flying: true,
      desc: 'A stinging wasp that slips aside whenever you swing. Swing at it and miss and it drinks the crowd\'s laughter, healing a tenth of its life. Wait for it, then strike.',
      init(e, g) { e.lastHp = e.hp; e.atk0 = g.run.attacks; e.whiff = 0; e.dodge = 0; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; if (e.hp < e.lastHp) e.whiff = 0; e.lastHp = e.hp;
        if (g.run.attacks > e.atk0) { e.atk0 = g.run.attacks; if (i.d < 150) { e.dodge = 14; e.dodgeAng = i.ang + (g.rng.chance(0.5) ? 1 : -1) * Math.PI * 0.6; e.whiff = 22; } }
        if (e.whiff > 0 && (e.whiff -= g.ts) <= 0 && e.hp >= e.lastHp - 0.001 && e.hp < e.maxHp) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.1); g.addText(e.x, e.y - e.r - 8, 'WHIFF +', '#9ae870', 11); g.sfx('heal', { vol: 0.3 }); }
        if (e.dodge > 0) { e.dodge -= g.ts; A.walk(g, e, e.dodgeAng, e.curSpeed * 2.4); return; }
        if (i.d > 70) A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.2 + e.seed) * 0.6); else A.walk(g, e, i.ang + Math.PI * 0.5, e.curSpeed * 0.8);
      },
      draw(c, e) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(e.x - 3, e.y - e.r * 0.9, e.r * 0.8, e.r * 0.28, -0.4 + Math.sin(e.t * 1.3) * 0.2, 0, TAU); c.ellipse(e.x + 3, e.y - e.r * 0.9, e.r * 0.8, e.r * 0.28, 0.4 - Math.sin(e.t * 1.3) * 0.2, 0, TAU); c.fill(); c.fillStyle = '#2a1a08'; c.fillRect(e.x - e.r * 0.3, e.y - 1, e.r * 0.6, 2); } }),
  });
  mod({ id: 'crowdpleaser', name: 'Crowd-pleaser', color: '#ff9a4a', glyph: '♛', desc: 'Strutting and fast: killing it is worth a roar (+30 Favor) and a shower of coins',
    apply(e) { e.speed *= 1.15; }, onDeath(e, g) { if (g.run.favor !== undefined) favorAdd(g, 30); g.dropGold(e.x, e.y, 6 + g.floorNum); } });
  const gladiator = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#8a5a30'; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.95, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.35, r * 0.62, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#1c1020'; c.fillRect(x - r * 0.5, y - r * 0.45, r, r * 0.16);
    c.fillStyle = '#d04a3a'; c.beginPath(); c.moveTo(x - r * 0.1, y - r * 0.95); c.quadraticCurveTo(x + r * 0.7, y - r * 1.5, x + r * 0.55, y - r * 0.6); c.lineTo(x + r * 0.2, y - r * 0.9); c.closePath(); c.fill();
    c.fillStyle = '#c8cde0'; c.beginPath(); c.arc(x - r * 0.95, y + r * 0.2, r * 0.45, 0, TAU); c.fill(); c.stroke(); c.save(); c.translate(x, y); c.rotate(face); c.fillStyle = '#e8ecff'; c.fillRect(r * 0.7, -r * 0.08, r * 1.2, r * 0.16); c.restore();
  };
  ED.bossDraw.gladiator = gladiator;
  mini({ id: 'gladiator', name: 'The Gladiator', title: 'Champion of the Pit', color: '#e0a060', r: 27, hp: 215, arena: 'arena_open', shape: 'gladiator', minFloor: 7, unlockText: 'Laurel',
    attacks: { slash: L('coneSlash', { arc: 1.9, r: 100, tele: 32, dmg: 1.5, times: 2, color: '#e0a060' }), charge: L('charge', { tele: 34, speed: 9, dmg: 1.5, stun: 40 }), spears: L('fan', { n: 5, spread: 0.24, reps: 2, speed: 3.2, color: '#e8d8a0' }), stomp: L('slamRing', { r: 80, tele: 36, rings: 2, speed: 3, color: '#e0a060' }), nets: L('summon', { types: ['retiarius'], n: 1, max: 2, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'Opening Bout', attacks: ['slash', 'charge', 'stomp'], idle: [30, 52] }, { at: 0.5, name: 'Crowd on its Feet', attacks: ['slash', 'charge', 'spears', 'stomp', 'nets'], idle: [22, 40] }] });
  relic('laurel', { id: 'laurel', name: 'Laurel', rarity: 'rare', color: '#8ad04a', mods: { dmg: 0.08, speed: 0.04, gold: 0.1 }, max: 2, unlock: 'mini:gladiator', desc: 'The crowd remembers a winner: harder blows, quicker feet, a little more gold. (Unlockable)' });
  W.add({ id: 'roaringpit', name: 'The Roaring Pit', short: 'ROARING PIT', color: '#ff7a4a', pack: V, native: 6, tiers: [1, 99], risk: 1, gate: { kind: 'deed', id: 'showman' },
    rule: 'The crowd keeps score. Chains of kills raise its Favor (50: a gift, 100: a relic shard); a wound costs 40; bore it for fifteen seconds and it throws bottles.',
    enemies: ['retiarius', 'shieldwall', 'beastmaster', 'gadfly'], mod: 'crowdpleaser', minis: ['gladiator'], hz: PIT, music: { scale: 1, root: 36, bpm: 14, prog: [0, 5, 3, 4] },
    theme: { name: 'The Roaring Pit', floorA: '#4a3d2c', floorB: '#524432', wall: '#6a5238', wallTop: '#a88858', accent: '#ff7a4a', glow: '#ffb070', fog: '#1a120a', skin: { pattern: 'sand', wall: 'block', ambience: 'dust', ambient: '#e8c898', dim: 0.04, lift: 0.95 } } });

  // ==================================================================== 3. STARFALL REACH
  //  Meteors mark a circle for a second, then land; the crater holds STARDUST (worth five times the gold, gone in five seconds).  Sometimes a second one follows into the same spot.
  ED.pickupImpl.stardust = {
    collect(g, k) { g.giveGold(k.val); g.sfx('coin'); g.burst(k.x, k.y, 8, '#ffe27a', 3, 18); g.addText(k.x, k.y - 14, '+' + k.val, '#ffe27a', 12); return true; },
    draw(c, k, t, bob) { const a = Math.min(1, (300 - k.t) / 60); c.save(); c.globalAlpha = Math.max(0.25, a); glow(c, k.x, k.y, 22, '#ffe27a', 0.55); c.translate(k.x, k.y + bob); c.rotate(t * 0.03); c.fillStyle = '#fff2a8'; c.beginPath(); for (let i = 0; i < 8; i++) { const an = i * TAU / 8, rr = i % 2 ? 3 : 8; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath(); c.fill(); c.strokeStyle = '#a07a10'; c.lineWidth = 1; c.stroke(); c.restore(); },
  };
  function meteor(g, rt, x, y, quick) {
    const ast = g.player.relics.astrolabe | 0, dur = Math.round(g.tele(quick ? 28 : 62) * (1 + 0.5 * Math.min(2, ast)));
    g.zoneCircle(null, x, y, 54, dur, dmgOf(g, 2.0), { color: quick ? '#ff5a4a' : '#ffb86a', burst: true, onEnd: (gg) => { gg.shake(6); gg.sfx('thud', { vol: 0.7 }); gg.explodeFx && gg.explodeFx(x, y, 50, '#ffb86a'); rt.craters.push({ x, y, t: 0 }); const v = Math.round(10 + 2 * gg.floorNum); for (let q = 0; q < 2; q++) { const k = gg.dropPickup('stardust', x + (q ? 14 : -14), y + (q ? 8 : -6), v, { still: true }); } } });
    g.sfx('telegraph', { vol: 0.5 });
  }
  const STAR = {
    setup(g, room, rt, rng) { rt.meteor = { t: 150 + rng.int(0, 90), second: null }; rt.craters = []; rt.mrng = rng.fork('meteor'); },
    tick(g, rt, wi) {
      const m = rt.meteor; if (!m) return; for (const k of g.pickups) if (k.type === 'stardust' && k.t > 300) k.dead = true;
      if (m.second) { m.second.t -= g.ts; if (m.second.t <= 0) { meteor(g, rt, m.second.x, m.second.y, true); m.second = null; } }
      if (!rt.lockdown) return; m.t -= g.ts; if (m.t > 0) return;
      m.t = Math.max(170, 330 - (wi.depth || 0) * 18); const p = g.player, r = rt.mrng, near = r.chance(0.6), x = U.clamp(near ? p.x + r.range(-90, 90) : r.range(90, 870), 80, 880), y = U.clamp(near ? p.y + r.range(-80, 80) : r.range(90, 490), 80, 490);
      meteor(g, rt, x, y, false); if (r.chance(0.3)) m.second = { x, y, t: Math.round(g.tele(62)) + 34 };
    },
    under(g, c, t, rt) { for (const k of rt.craters || []) { const gr = c.createRadialGradient(k.x, k.y, 4, k.x, k.y, 40); gr.addColorStop(0, 'rgba(10,6,20,0.7)'); gr.addColorStop(0.6, 'rgba(40,24,50,0.4)'); gr.addColorStop(1, 'rgba(40,24,50,0)'); c.fillStyle = gr; c.beginPath(); c.arc(k.x, k.y, 40, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,178,90,0.35)'; c.lineWidth = 2; c.beginPath(); c.arc(k.x, k.y, 30, 0, TAU); c.stroke(); } },
  };
  const f3 = mk('starfall');
  register({
    cometling: f3({ name: 'Cometling', shape: 'tri', color: '#ffe08a', r: 10, hp: 12, speed: 1.15, dmg: 3, shot: 3, cost: 1.9, weight: 12, minFloor: 6,
      desc: 'A child of the falling stars: it lines you up, charges in a straight telegraphed streak and leaves a burning tail that stays lit for three seconds.',
      init(e, g) { e.cd = 70 + g.rng.int(0, 60); },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang;
        if (e.state === 'dash') { const m = A.walk(g, e, e.cAng, 6.4 * e.spdMul); if ((e.tailT = (e.tailT || 0) + g.ts) >= 4) { e.tailT = 0; g.hazardCircle(e, e.x, e.y, 15, 180, dmgOf(g, 0.7), { color: '#ff9a3a', tick: 24 }); } if ((e.sT -= g.ts) <= 0 || m.bx || m.by) { e.state = null; e.cd = 120 / e.rate; } return; }
        if (e.state === 'wind') { e.windup -= g.ts; if (e.windup > 10) e.cAng = i.ang; if (e.windup <= 0) { e.state = 'dash'; e.sT = 22; e.tailT = 0; g.sfx('lunge'); } return; }
        A.chase(g, e, i, e.curSpeed, 0);
        if ((e.cd -= g.ts) <= 0 && i.d < 330 && i.d > 80) { e.state = 'wind'; e.windup = g.tele(36); e.cAng = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 330, e.y + Math.sin(i.ang) * 330, 20, e.windup, 0, { color: '#ffb04a', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { c.fillStyle = 'rgba(255,170,60,0.55)'; c.beginPath(); const a = e.face + Math.PI; c.moveTo(e.x + Math.cos(a + 0.5) * e.r * 0.8, e.y + Math.sin(a + 0.5) * e.r * 0.8); c.lineTo(e.x + Math.cos(a) * e.r * 2.6, e.y + Math.sin(a) * e.r * 2.6); c.lineTo(e.x + Math.cos(a - 0.5) * e.r * 0.8, e.y + Math.sin(a - 0.5) * e.r * 0.8); c.fill(); eyes(c, e, 0.3); } }),
    constellation: f3({ name: 'Constellation', shape: 'star', color: '#aab8ff', r: 10, hp: 14, speed: 0.9, dmg: 2, shot: 2, cost: 3.2, weight: 8, minFloor: 7, flying: true,
      desc: 'Three stars joined by threads of light. Every few seconds the threads pulse — stay out of them. Kill one star and the thread it held goes dark.',
      init(e, g) { e.cd = 60; e.cid = e.cid || g.rng.int(1, 1e9); if (!e.minion) { e.sibs = []; for (const sg of [-1, 1]) { const m = g.spawnEnemy('constellation', e.x + sg * 70, e.y + (sg > 0 ? 40 : -40), { minion: true, silent: true }); m.cid = e.cid; e.sibs.push(m); m.sibs = [e]; } } },
      update(e, g) {
        const i = A.info(g, e), grp = [e].concat(e.sibs || []).concat((e.sibs || []).flatMap(m => m.sibs || [])).filter((m, k, a) => !m.dead && a.indexOf(m) === k); e.face += 0.02;
        A.kite(g, e, i, 230, e.curSpeed, 0.6); e.grp = grp;
        const lead = grp.reduce((b, m) => (!b || m.id < b.id ? m : b), null); if (e !== lead) return;
        e.beat = ((e.beat || 0) + g.ts) % 200; const warn = e.beat > 140 && e.beat <= 170, hot = e.beat > 170; e.beamWarn = warn; e.beamHot = hot;
        if (hot && grp.length >= 2) { const p = g.player; const segs = []; for (let a = 0; a < grp.length; a++) for (let b = a + 1; b < grp.length; b++) { if (grp.length === 3 || a === 0) segs.push([grp[a], grp[b]]); } for (const [a, b] of segs) if (!p.dead && U.segDist(p.x, p.y, a.x, a.y, b.x, b.y) < 12 && g.hurtPlayer(dmgOf(g, 1.2), a.x, a.y, { src: e, zone: true, noKnock: true })) { g.sfx('zap', { vol: 0.5 }); } }
      },
      draw(c, e) { const lead = (e.grp || []).reduce((b, m) => (!b || m.id < b.id ? m : b), null); if (e === lead || true) { const grp = e.grp || []; if (grp.length >= 2 && e === lead) { const hot = e.beamHot, warn = e.beamWarn; for (let a = 0; a < grp.length; a++) for (let b = a + 1; b < grp.length; b++) { if (grp.length < 3 && a > 0) continue; c.strokeStyle = hot ? 'rgba(255,255,255,0.95)' : warn ? 'rgba(255,200,120,' + (0.5 + 0.4 * Math.sin(e.t * 0.6)) + ')' : 'rgba(170,184,255,0.3)'; c.lineWidth = hot ? 4 : warn ? 2.4 : 1; c.beginPath(); c.moveTo(grp[a].x, grp[a].y); c.lineTo(grp[b].x, grp[b].y); c.stroke(); } } } c.fillStyle = '#10142e'; c.beginPath(); c.arc(e.x, e.y, e.r * 0.3, 0, TAU); c.fill(); } }),
    gloamwing: f3({ name: 'Gloamwing', shape: 'ghost', color: '#7a6ab0', r: 11, hp: 13, speed: 1.5, dmg: 3, shot: 3, cost: 2.2, weight: 9, minFloor: 8, flying: true,
      desc: 'A moth of the dark between stars: all but invisible, it shows itself over stardust and craters — and for a breath before it dives. Burn a lamp, or watch the dust.',
      init(e, g) { e.cd = 80 + g.rng.int(0, 50); e.vis = 0.1; },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt; let lit = e.state === 'wind' || e.state === 'dive' || e.flash > 0;
        if (!lit) { for (const k of g.pickups) if (k.type === 'stardust' && Math.hypot(k.x - e.x, k.y - e.y) < 60) { lit = true; break; } for (const cr of (rt && rt.craters) || []) if (Math.hypot(cr.x - e.x, cr.y - e.y) < 48) { lit = true; break; } }
        e.vis += ((lit ? 1 : 0.1) - e.vis) * 0.15; e.face = i.ang;
        if (e.state === 'dive') { A.walk(g, e, e.dAng, 5.2 * e.spdMul); if ((e.sT -= g.ts) <= 0) { e.state = null; e.cd = 130 / e.rate; } return; }
        if (e.state === 'wind') { e.windup -= g.ts; e.dAng = i.ang; if (e.windup <= 0) { e.state = 'dive'; e.sT = 18; g.sfx('lunge'); } return; }
        A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.15 + e.seed) * 0.7);
        if ((e.cd -= g.ts) <= 0 && i.d < 260) { e.state = 'wind'; e.windup = g.tele(26); g.sfx('telegraph', { vol: 0.3 }); }
      },
      draw(c, e) { c.fillStyle = 'rgba(190,170,255,0.5)'; for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(e.x + sg * e.r * 0.9, e.y - e.r * 0.2, e.r * 0.9, e.r * 0.4, sg * (0.5 + Math.sin(e.t * 0.8) * 0.3), 0, TAU); c.fill(); } c.fillStyle = '#f0e8ff'; c.fillRect(e.x - e.r * 0.4, e.y - e.r * 0.3, e.r * 0.22, e.r * 0.2); c.fillRect(e.x + e.r * 0.18, e.y - e.r * 0.3, e.r * 0.22, e.r * 0.2); } }),
    dustmite: f3({ name: 'Dustmite', shape: 'circle', color: '#c8b890', r: 8, hp: 9, speed: 1.6, dmg: 2, cost: 1.5, weight: 11, minFloor: 6, group: 2,
      desc: 'Eats stardust and grows on it — bigger, tougher and harder-hitting for every grain. Kill it and what it swallowed spills out again.',
      init(e) { e.ate = 0; e.r0 = e.r; e.hp0 = e.maxHp; e.d0 = e.dmg; },
      update(e, g) {
        const i = A.info(g, e); e.face = i.ang; let tgt = null, bd = 1e9; for (const k of g.pickups) if (k.type === 'stardust' && !k.dead) { const d = U.dist2(e.x, e.y, k.x, k.y); if (d < bd) { bd = d; tgt = k; } }
        if (tgt && bd < 380 * 380) { A.walk(g, e, Math.atan2(tgt.y - e.y, tgt.x - e.x), e.curSpeed * 1.25); if (bd < 14 * 14) { tgt.dead = true; e.ate += tgt.val; e.grow = Math.min(2.2, (e.grow || 1) + 0.22); e.r = e.r0 * e.grow; const hpAdd = e.hp0 * 0.18; e.maxHp += hpAdd; e.hp += hpAdd; e.dmg = e.d0 * (1 + (e.grow - 1) * 0.5); g.addText(e.x, e.y - e.r - 6, 'nom', '#ffe27a', 10); g.sfx('coin', { vol: 0.3 }); } }
        else A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.12 + e.seed) * 0.5);
      },
      onDeath(e, g) { if (e.ate > 0) { g.dropPickup('stardust', e.x, e.y, Math.max(5, e.ate), { still: true }); } },
      draw(c, e) { eyes(c, e, 0.35); c.fillStyle = 'rgba(255,226,122,0.8)'; for (let k = 0; k < Math.min(5, Math.round((e.grow || 1) * 2)); k++) { const a = k * 1.3 + e.t * 0.04; c.fillRect(e.x + Math.cos(a) * e.r * 0.6 - 1, e.y + Math.sin(a) * e.r * 0.6 - 1, 2, 2); } } }),
  });
  mod({ id: 'waxing', name: 'Waxing', color: '#ffe27a', glyph: '☾', desc: 'Grows stronger the longer it lives, up to twice as strong',
    update(e, g) { if (e.wx0 === undefined) { e.wx0 = e.dmg; e.wx1 = e.shotDmg; e.wsp = e.speed; } const k = 1 + Math.min(1, e.t / 1800); e.dmg = e.wx0 * k; e.shotDmg = e.wx1 * k; e.spdMul *= 1 + (k - 1) * 0.25; e.waxK = k; } });
  const stargazer = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#1a2250'; c.beginPath(); c.moveTo(x - r * 0.9, y + r); c.lineTo(x, y - r * 0.5); c.lineTo(x + r * 0.9, y + r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8d8b8'; c.beginPath(); c.arc(x, y - r * 0.5, r * 0.4, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#10142e'; c.beginPath(); c.moveTo(x - r * 0.55, y - r * 0.75); c.lineTo(x, y - r * 1.7); c.lineTo(x + r * 0.55, y - r * 0.75); c.closePath(); c.fill();
    c.strokeStyle = '#c8b070'; c.lineWidth = r * 0.16; c.beginPath(); c.moveTo(x + r * 0.2, y); c.lineTo(x + r * 1.5, y - r * 1.2); c.stroke(); c.lineWidth = 3; c.strokeStyle = dk;
    for (let k = 0; k < 4; k++) { const a = t * 0.02 + k * TAU / 4; c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(x + Math.cos(a) * r * 1.4, y - r * 0.2 + Math.sin(a) * r * 0.8, 3.2, 0, TAU); c.fill(); }
  };
  ED.bossDraw.stargazer = stargazer;
  mini({ id: 'stargazer', name: 'The Stargazer', title: 'Who Counts the Falling', color: '#aab8ff', r: 25, hp: 200, arena: 'arena_round', shape: 'stargazer', minFloor: 7, unlockText: 'Astrolabe',
    attacks: { meteors: L('rain', { n: 8, r: 46, warn: 52, interval: 8, aimed: 0.7, color: '#ffb86a' }), constel: L('spiral', { arms: 3, frames: 80, speed: 2.1, color: '#aab8ff' }), nova: L('radial', { n: 14, reps: 3, gap: 12, speed: 2.4, rot: 0.2, color: '#ffe27a' }), vanish: L('blink', { where: 'random', ring: 8, color: '#aab8ff' }), moths: L('summon', { types: ['gloamwing'], n: 2, max: 3, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'Observing', attacks: ['meteors', 'constel', 'vanish'], idle: [30, 50] }, { at: 0.5, name: 'Conjunction', attacks: ['meteors', 'nova', 'constel', 'moths', 'vanish'], idle: [22, 40] }] });
  relic('astrolabe', { id: 'astrolabe', name: 'Astrolabe', rarity: 'rare', color: '#aab8ff', mods: { luck: 1, def: 1, gold: 0.1 }, max: 2, unlock: 'mini:stargazer', desc: 'A little luck, a little gold — and every falling star shows its mark half again as long (in Starfall Reach). (Unlockable)' });
  W.add({ id: 'starfall', name: 'Starfall Reach', short: 'STARFALL REACH', color: '#ffe27a', pack: V, native: 6, tiers: [2, 99], risk: 1, gate: { kind: 'crack' },
    rule: 'Meteors mark a circle for a second, then fall. Their craters hold stardust — gold worth five times as much, gone in five seconds — and sometimes a second star follows the first.',
    enemies: ['cometling', 'constellation', 'gloamwing', 'dustmite'], mod: 'waxing', minis: ['stargazer'], hz: STAR, music: { scale: 4, root: 45, bpm: -6, prog: [0, 2, 4, 3] },
    theme: { name: 'Starfall Reach', floorA: '#1b2038', floorB: '#212844', wall: '#2c3358', wallTop: '#566ab0', accent: '#ffe27a', glow: '#fff2a8', fog: '#070a18', skin: { pattern: 'starry', wall: 'block', ambience: 'stars', ambient: '#9aa8e0', dim: 0.08, lift: 1.3 } } });

  // ==================================================================== 4. THE FOUNDERED GALLEON
  //  Every 8-10 seconds the deck LISTS: a warning (foam on the low side, a creak), then for three seconds you, the foes and the kegs slide toward the low side — you keep about half your control.
  const DIRS4 = [[1, 0, 'E'], [-1, 0, 'W'], [0, 1, 'S'], [0, -1, 'N']];
  function kegBlast(g, x, y, r, dmg) { g.explode(x, y, r, dmg, { owner: 'enemy' }); for (const e of g.enemies) if (!e.dead && U.circleHit(x, y, r, e.x, e.y, e.r)) g.damageEnemy(e, 8 + g.floorNum, { src: 'explosion', x, y, kb: 5, noProc: true, color: '#ff9a4a' }); }
  const GAL = {
    setup(g, room, rt, rng) {
      rt.gal = { t: 420 + rng.int(0, 200), phase: 'calm', low: DIRS4[rng.int(0, 3)], pt: 0, rng: rng.fork('list') }; rt.kegs = []; rt.rollers = [];
      for (const s of W.spots(rt, rng, 2, 220)) rt.kegs.push({ x: s.x, y: s.y, vx: 0, vy: 0, state: 'idle', fuse: 0 });
      rt.cannons = [{ side: 'W', y: 150 + rng.int(0, 80), t: 260 + rng.int(0, 120) }, { side: 'E', y: 340 + rng.int(0, 80), t: 420 + rng.int(0, 120) }];
    },
    tick(g, rt, wi) {
      const s = rt.gal; if (!s) return; const p = g.player, sea = (p.relics.sealegs | 0) > 0 ? 0.5 : 1;
      if (!rt.lockdown) { s.phase = 'calm'; s.t = Math.max(s.t, 300); }
      else { s.t -= g.ts; if (s.phase === 'calm' && s.t <= 0) { s.phase = 'warn'; s.pt = 0; s.low = DIRS4[s.rng.int(0, 3)]; g.sfx('crack', { vol: 0.5 }); g.toast('The deck creaks... it is going to list!', '#5fd4c8', 90); } else if (s.phase === 'warn' && (s.pt += g.ts) >= 60) { s.phase = 'list'; s.pt = 0; } else if (s.phase === 'list' && (s.pt += g.ts) >= 180) { s.phase = 'calm'; s.t = 480 + s.rng.int(0, 120); for (const k of rt.kegs) if (k.state === 'roll') k.fuse = 20; } }
      if (s.phase === 'list') {
        const [dx, dy] = s.low, f = 1.4 * g.ts;
        if (!p.dead && p.dashT <= 0) ED.phys.move(g, p, dx * f * 0.55 * sea, dy * f * 0.55 * sea);
        for (const e of g.enemies) if (!e.dead && !e.boss && !e.big && !e.flying && !e.anchored) ED.phys.move(g, e, dx * f, dy * f);
        for (const k of rt.kegs) if (k.state === 'idle') { k.state = 'roll'; k.vx = dx * 0.4; k.vy = dy * 0.4; }
      }
      // kegs: roll while the deck is tipped, go off when they hit a wall, a foe or you
      for (const k of rt.kegs) {
        if (k.state === 'dead') continue;
        if (k.state === 'roll') { const [dx, dy] = s.phase === 'list' ? s.low : [0, 0]; k.vx = Math.min(4, k.vx + dx * 0.12 * g.ts); k.vy = Math.min(4, k.vy + dy * 0.12 * g.ts); const nx = k.x + k.vx * g.ts, ny = k.y + k.vy * g.ts; let hit = ED.phys.blocked(g, nx, ny, 9, false, false) || (Math.abs(k.vx) + Math.abs(k.vy) > 0.6 && (Math.hypot(p.x - nx, p.y - ny) < 22 || g.enemies.some(e => !e.dead && !e.boss && Math.hypot(e.x - nx, e.y - ny) < e.r + 9))); if (hit) { k.state = 'dead'; kegBlast(g, k.x, k.y, 60, dmgOf(g, 1.8)); g.shake(5); } else { k.x = nx; k.y = ny; if (s.phase !== 'list') { k.vx *= 0.9; k.vy *= 0.9; if (Math.abs(k.vx) + Math.abs(k.vy) < 0.2) { k.state = 'idle'; k.vx = k.vy = 0; } } } }
      }
      if (rt.rollers) U.compact(rt.rollers, z => !z.dead);
      for (const cn of rt.cannons || []) { if (!rt.lockdown) continue; cn.t -= g.ts; if (cn.t <= 0) { cn.t = 360 + (cn.y % 60); const x0 = cn.side === 'W' ? 40 : 920, x1 = cn.side === 'W' ? 920 : 40, y = cn.y; g.zoneLine(null, x0, y, x1, y, 26, g.tele(60), dmgOf(g, 2.0), { color: '#ffa04a', burst: true, onEnd: (gg) => { gg.shake(5); gg.sfx('thud', { vol: 0.6 }); gg.burst(x0 + (x1 > x0 ? 20 : -20), y, 10, '#ffd24a', 4, 16); } }); g.sfx('telegraph', { vol: 0.5 }); } }
    },
    under(g, c, t, rt) {
      const s = rt.gal; if (!s) return; c.save();
      if (s.phase === 'warn' || s.phase === 'list') {
        const [dx, dy] = s.low, a = s.phase === 'warn' ? 0.22 + 0.12 * Math.sin(t * 0.4) : 0.4, x0 = dx > 0 ? 960 : 0, y0 = dy > 0 ? 576 : 0, x1 = dx > 0 ? 800 : dx < 0 ? 160 : 0, y1 = dy > 0 ? 416 : dy < 0 ? 160 : 0;
        const gr = c.createLinearGradient(dx ? x0 : 0, dy ? y0 : 0, dx ? x1 : 0, dy ? y1 : 0); gr.addColorStop(0, 'rgba(95,212,200,' + a + ')'); gr.addColorStop(1, 'rgba(95,212,200,0)'); c.fillStyle = gr; c.fillRect(0, 0, 960, 576);
        c.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 16; i++) { const q = (i * 61 + t * 1.2) % (dx ? 576 : 960), far = 6 + (i % 3) * 7; c.beginPath(); if (dx) c.arc(dx > 0 ? 960 - far : far, q, 2.4, 0, TAU); else c.arc(q, dy > 0 ? 576 - far : far, 2.4, 0, TAU); c.fill(); }
      }
      for (const cn of rt.cannons || []) { const x = cn.side === 'W' ? 30 : 930; c.fillStyle = '#3a3a48'; c.fillRect(x - 12, cn.y - 12, 24, 24); c.fillStyle = '#16121e'; c.beginPath(); c.arc(x + (cn.side === 'W' ? 8 : -8), cn.y, 6, 0, TAU); c.fill(); c.strokeStyle = '#6a6a7a'; c.lineWidth = 2; c.strokeRect(x - 12, cn.y - 12, 24, 24); }
      c.restore();
    },
    draw(g, c, t, rt) {
      for (const k of rt.kegs || []) { if (k.state === 'dead') continue; c.save(); c.translate(k.x, k.y); if (k.state === 'roll') c.rotate(t * 0.15); c.fillStyle = '#7a4a22'; c.fillRect(-9, -8, 18, 16); c.strokeStyle = '#2a1608'; c.lineWidth = 2; c.strokeRect(-9, -8, 18, 16); c.beginPath(); c.moveTo(-9, -3); c.lineTo(9, -3); c.moveTo(-9, 3); c.lineTo(9, 3); c.stroke(); c.restore(); if (k.state === 'roll') { c.strokeStyle = 'rgba(255,138,60,' + (0.4 + 0.3 * Math.sin(t * 0.5)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(k.x, k.y, 17, 0, TAU); c.stroke(); } }
      for (const z of rt.rollers || []) { c.save(); c.translate(z.x, z.y); c.rotate(t * 0.15); c.fillStyle = '#7a4a22'; c.fillRect(-9, -8, 18, 16); c.strokeStyle = '#2a1608'; c.lineWidth = 2; c.strokeRect(-9, -8, 18, 16); c.restore(); }
    },
  };
  const f4 = mk('galleon');
  register({
    deckhand: f4({ name: 'Deckhand', shape: 'square', color: '#6a8aa0', r: 12, hp: 26, speed: 0, dmg: 3, shot: 3, cost: 2.6, weight: 10, minFloor: 6,
      desc: 'Lashed to the deck by its own grapple, it hurls a hook along a telegraphed line. If the hook finds you it hauls you in, hand over hand — a dash cuts the rope.',
      init(e, g) { e.cd = 90 + g.rng.int(0, 60); e.pull = 0; e.anchored = true; },
      update(e, g) {
        const i = A.info(g, e), p = g.player; e.face = i.ang;
        if (e.pull > 0) { e.pull -= g.ts; e.px = p.x; e.py = p.y; if (p.dashT > 0 || p.dead) { e.pull = 0; g.addText(p.x, p.y - 24, 'CUT FREE', '#9ad0e8', 12); } else { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d > e.r + p.r + 6) ED.phys.move(g, p, (e.x - p.x) / d * 4.4 * g.ts, (e.y - p.y) / d * 4.4 * g.ts); else e.pull = 0; if (e.pull <= 0) e.cd = 200 / e.rate; } return; }
        if (e.state === 'wind') { e.windup -= g.ts; e.lAng = i.ang; if (e.windup <= 0) { e.state = null; e.cd = 190 / e.rate; if (!p.dead && p.dashT <= 0 && U.segDist(p.x, p.y, e.x, e.y, e.x + Math.cos(e.lx) * 340, e.y + Math.sin(e.lx) * 340) < 18 + p.hr) { e.pull = 40; g.sfx('lunge'); g.addText(p.x, p.y - 26, 'HOOKED', '#9ad0e8', 13); } } return; }
        if ((e.cd -= g.ts) <= 0 && i.d < 330 && A.clear(g, e.x, e.y, p.x, p.y, true)) { e.state = 'wind'; e.windup = g.tele(34); e.lx = i.ang; g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 340, e.y + Math.sin(i.ang) * 340, 16, e.windup, 0, { color: '#9ad0e8', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.4 }); }
      },
      draw(c, e) { if (e.pull > 0) { c.strokeStyle = '#c8b890'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.px, e.py); c.stroke(); c.fillStyle = '#c8c8d8'; c.beginPath(); c.arc(e.px, e.py, 4, 0, TAU); c.fill(); } c.strokeStyle = '#3a2a18'; c.lineWidth = 2; c.strokeRect(e.x - e.r * 0.7, e.y + e.r * 0.3, e.r * 1.4, e.r * 0.4); eyes(c, e, 0.38); } }),
    powdermonkey: f4({ name: 'Powder Monkey', shape: 'tri', color: '#c07a3a', r: 9, hp: 12, speed: 2.1, dmg: 3, cost: 1.8, weight: 11, minFloor: 6,
      desc: 'Scampers at you with a lit keg on its back. Kill it and the keg slips off, rolls the way it was running and goes off a moment later. Kill it where you can step aside.',
      init(e, g) { e.cd = 60; },
      update(e, g) { const i = A.info(g, e); e.face = i.ang; e.run = i.ang; A.chase(g, e, i, e.curSpeed, Math.sin(e.t * 0.2 + e.seed) * 0.5); },
      onDeath(e, g) {
        const rt = g.rt, a = e.face || 0, z = g.zoneCircle(null, e.x, e.y, 58, g.tele(54), dmgOf(g, 1.8), { color: '#ff8a2a', burst: true, upd: (gg, zz) => { if (zz.t < 28 && !ED.phys.blocked(gg, zz.x + Math.cos(a) * 3.2, zz.y + Math.sin(a) * 3.2, 9, false, false)) { zz.x += Math.cos(a) * 3.2; zz.y += Math.sin(a) * 3.2; } }, onEnd: (gg, zz) => { for (const o of gg.enemies) if (!o.dead && U.circleHit(zz.x, zz.y, zz.r, o.x, o.y, o.r)) gg.damageEnemy(o, 8 + gg.floorNum, { src: 'explosion', x: zz.x, y: zz.y, kb: 5, noProc: true, color: '#ff9a4a' }); gg.explodeFx && gg.explodeFx(zz.x, zz.y, zz.r, '#ff8a2a'); gg.shake(4); } });
        if (rt) (rt.rollers = rt.rollers || []).push(z);
      },
      draw(c, e) { c.fillStyle = '#6a3a18'; c.fillRect(e.x - e.r * 0.5 - Math.cos(e.face) * e.r * 0.4, e.y - e.r * 0.8, e.r, e.r * 0.8); c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(e.x - Math.cos(e.face) * e.r * 0.4 + 2, e.y - e.r * 0.9 + Math.sin(e.t * 0.9), 2, 0, TAU); c.fill(); eyes(c, e, 0.3); } }),
    bilgeswarm: f4({ name: 'Bilge Swarm', shape: 'circle', color: '#4a8a8a', r: 6, hp: 5, speed: 2.0, dmg: 2, cost: 0.9, weight: 12, minFloor: 7, group: 5,
      desc: 'A rush of bilge-rats that pours up from the low side of the deck. Weak alone, a lot together; when the deck lists they surge with it.',
      init(e, g) { const rt = g.rt, s = rt && rt.gal; if (s && !e.minion) { const [dx, dy] = s.low; if (dx) { e.x = dx > 0 ? 920 : 40; e.y = 60 + Math.random() * 450; } else { e.y = dy > 0 ? 540 : 40; e.x = 70 + Math.random() * 820; } } },
      update(e, g) { const i = A.info(g, e), rt = g.rt, s = rt && rt.gal; e.face = i.ang; let sp = e.curSpeed; if (s && s.phase === 'list') { A.walk(g, e, Math.atan2(s.low[1], s.low[0]), 1.2); sp *= 1.3; } A.chase(g, e, i, sp, Math.sin(e.t * 0.25 + e.seed) * 0.6); },
      draw(c, e) { c.fillStyle = '#10181c'; c.fillRect(e.x - 2.5, e.y - 2, 2, 2); c.fillRect(e.x + 0.5, e.y - 2, 2, 2); } }),
    figurehead: f4({ name: 'Figurehead', shape: 'hex', color: '#b8a070', r: 14, hp: 40, speed: 0, dmg: 3, shot: 3, cost: 3.2, weight: 7, minFloor: 8,
      desc: 'A carved maiden bolted to the rail. It only wakes when you stand on the HIGH side of the deck — the side the ship leans away from — and then it fires fans of bolts. Stand low, or finish it fast.',
      init(e, g) { e.cd = 80; e.anchored = true; },
      update(e, g) {
        const i = A.info(g, e), rt = g.rt, low = rt && rt.gal ? rt.gal.low : DIRS4[0], p = g.player; e.face = i.ang;
        const proj = (p.x - 480) * low[0] + (p.y - 288) * low[1], high = proj < -50; e.awake = high;
        if (e.state === 'aim') { e.windup -= g.ts; if (e.windup <= 0) { e.state = null; e.cd = 78 / e.rate; for (let k = -1; k <= 1; k++) g.eShot(e, i.ang + k * 0.24, 3.0, { dmg: 1, color: '#e8d8a0', r: 5 }); g.sfx('shoot'); } return; }
        if (high && (e.cd -= g.ts) <= 0) { e.state = 'aim'; e.windup = g.tele(24); g.zoneLine(e, e.x, e.y, e.x + Math.cos(i.ang) * 260, e.y + Math.sin(i.ang) * 260, 10, e.windup, 0, { color: '#e8d8a0', hurts: false, burst: false }); g.sfx('telegraph', { vol: 0.3 }); }
      },
      draw(c, e) { c.fillStyle = e.awake ? '#ffd24a' : '#3a2a18'; c.fillRect(e.x - e.r * 0.5, e.y - e.r * 0.25, e.r * 0.3, e.r * 0.2); c.fillRect(e.x + e.r * 0.2, e.y - e.r * 0.25, e.r * 0.3, e.r * 0.2); c.strokeStyle = '#6a5a38'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x - e.r * 0.6, e.y + e.r * 0.5); c.quadraticCurveTo(e.x, e.y + e.r * 0.9, e.x + e.r * 0.6, e.y + e.r * 0.5); c.stroke(); } }),
  });
  mod({ id: 'barnacled', name: 'Barnacled', color: '#8ab0a0', glyph: '⚓', desc: 'Anchored (the list cannot move it), armoured and slow',
    apply(e) { e.anchored = true; e.armor = Math.max(e.armor || 0, 0.35); e.speed *= 0.6; } });
  const bosun = (c, e, x, y, r, col, dk, t, face) => {
    c.fillStyle = '#2a4a6a'; c.beginPath(); c.arc(x, y + r * 0.2, r * 0.95, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#e8c8a0'; c.beginPath(); c.arc(x, y - r * 0.45, r * 0.5, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#1a2a40'; c.beginPath(); c.arc(x, y - r * 0.6, r * 0.55, Math.PI, 0); c.fill(); c.fillRect(x - r * 0.7, y - r * 0.62, r * 1.4, r * 0.1); c.fillStyle = '#ffd24a'; c.fillRect(x - 2, y - r * 1.0, 4, r * 0.28);
    c.strokeStyle = '#c8c8d8'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + r * 0.05); c.lineTo(x, y + r * 0.65); c.moveTo(x - r * 0.3, y + r * 0.2); c.lineTo(x + r * 0.3, y + r * 0.2); c.moveTo(x - r * 0.35, y + r * 0.5); c.quadraticCurveTo(x, y + r * 0.85, x + r * 0.35, y + r * 0.5); c.stroke(); c.lineWidth = 3; c.strokeStyle = dk;
    c.strokeStyle = '#c8b890'; c.lineWidth = 2; c.beginPath(); c.arc(x + r * 0.95, y + r * 0.35, r * 0.28, 0, TAU); c.stroke(); c.strokeStyle = dk; c.lineWidth = 3;
  };
  ED.bossDraw.bosun = bosun;
  mini({ id: 'bosun', name: 'The Bosun', title: 'Who Keeps the Ship', color: '#5fd4c8', r: 27, hp: 215, arena: 'arena_open', shape: 'bosun', minFloor: 7, unlockText: 'Sea Legs',
    attacks: { cannons: L('bars', { n: 3, thick: 46, gapW: 160, warn: 66, color: '#ffa04a' }), whistle: L('radial', { n: 12, reps: 3, gap: 12, speed: 2.5, rot: 0.2, color: '#5fd4c8' }), hook: L('charge', { tele: 34, speed: 9, dmg: 1.5, stun: 40 }), swab: L('slamRing', { r: 84, tele: 36, rings: 2, speed: 3, color: '#5fd4c8' }), hands: L('summon', { types: ['deckhand'], n: 1, max: 2, hpMul: 0.8 }), rats: L('summon', { types: ['bilgeswarm'], n: 4, max: 6, hpMul: 0.8 }) },
    phases: [{ at: 1, name: 'All Hands', attacks: ['swab', 'hook', 'whistle', 'hands'], idle: [32, 54] }, { at: 0.5, name: 'Heavy Weather', attacks: ['cannons', 'swab', 'hook', 'whistle', 'rats'], idle: [24, 42] }] });
  relic('sealegs', { id: 'sealegs', name: 'Sea Legs', rarity: 'rare', color: '#5fd4c8', mods: { def: 1, dashCd: -0.06, speed: 0.03 }, max: 1, unlock: 'mini:bosun', desc: 'Steadier on any deck, quicker to dash — and when a deck lists you slide only half as hard. (Unlockable)' });
  W.add({ id: 'galleon', name: 'The Foundered Galleon', short: 'FOUNDERED GALLEON', color: '#5fd4c8', pack: V, native: 6, tiers: [2, 99], risk: 0, gate: { kind: 'legacy', id: 'titan' },
    rule: 'The deck lists every few seconds: you, foes and kegs slide toward the low side. Kegs roll and burst on impact; cannons keep a beat down the lanes. Lean into it, or hold the high side.',
    enemies: ['deckhand', 'powdermonkey', 'bilgeswarm', 'figurehead'], mod: 'barnacled', minis: ['bosun'], hz: GAL, music: { scale: 3, root: 38, bpm: -4, prog: [0, 3, 4, 3] },
    theme: { name: 'The Foundered Galleon', floorA: '#3a2e22', floorB: '#42352a', wall: '#4a3a2c', wallTop: '#86684a', accent: '#5fd4c8', glow: '#8ae8d8', fog: '#08121a', skin: { pattern: 'plank', wall: 'timber', ambience: 'bubbles', ambient: '#a8c4c0', dim: 0.06 } } });
})(typeof globalThis !== 'undefined' ? globalThis : this);

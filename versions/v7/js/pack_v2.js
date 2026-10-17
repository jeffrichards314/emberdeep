/* EMBERDEEP — pack_v2.js : v2 "ARSENAL" — new ways to fight.
 *
 *  4 classes with real passives (Necromancer, Alchemist, Monk, Warden) · 5 weapons (Scythe, Flasks, Gauntlets,
 *  Bulwark, Chakram) · 4 actives · 20 relics in four build archetypes (thralls, guard, hex, tempo) · armor, affixes, synergies.
 *
 *  Everything here is tagged pack:'v2' and wired through the extension points in packs.js, so with v2 switched off
 *  none of it exists (the pools, the select screen and the RNG streams are exactly v1's).
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v2';

  P.define({
    id: 'v2', name: 'ARSENAL', tag: 'new ways to fight', color: '#7fd8ff',
    blurb: 'Four classes with real passives (thralls, reactions, flow, guard), five weapons, four actives and twenty relics that build into thrall, guard, hex and tempo runs.',
  });

  // ------------------------------------------------------------------ stat names (for tooltips)
  Object.assign(I.STAT_NAMES, {
    thrall: 'Max thralls', raise: 'Raise-thrall chance', thrallPow: 'Thrall power', thrallBlast: 'Thrall blast', guard: 'Guard', guardRecharge: 'Guard recharge',
    guardBlast: 'Guard shockwave', hex: 'Hex', hexBlast: 'Hex blast', opener: 'Opening strike', bounce: 'Ricochet',
  });

  // ------------------------------------------------------------------ weapons
  Object.assign(I.WEAPONS, {
    scythe:    { id: 'scythe', name: 'Scythe', kind: 'scythe', color: '#c9b8ff', dmg: 9, cd: 32, range: 64, arc: 3.4, kb: 3, class: 'necromancer', pack: V,
                 starterName: "Gravedigger's Scythe", desc: 'Huge, slow reaping arc that sweeps both ways.' },
    flasks:    { id: 'flasks', name: 'Flasks', kind: 'flask', color: '#9bf08a', dmg: 5.5, cd: 30, range: 260, kb: 1.5, class: 'alchemist', ranged: true, pack: V,
                 starterName: "Brewer's Flasks", desc: 'Lobbed vials burst where you aim and leave a fire, poison or frost puddle.' },
    gauntlets: { id: 'gauntlets', name: 'Gauntlets', kind: 'fists', color: '#ffcf8a', dmg: 3.4, cd: 11, range: 38, arc: 1.7, kb: 2, class: 'monk', pack: V,
                 starterName: 'Iron Knuckles', desc: 'Blistering strikes. Every third blow releases a shockwave.' },
    bulwark:   { id: 'bulwark', name: 'Bulwark', kind: 'shield', color: '#a8c8ff', dmg: 7, cd: 30, range: 52, arc: 2.4, kb: 7, class: 'warden', pack: V,
                 starterName: 'Oak Bulwark', desc: 'Shield bash: heavy knockback, turns bullets in front of you around; every other bash staggers.' },
    chakram:   { id: 'chakram', name: 'Chakram', kind: 'chakram', color: '#ffd88a', dmg: 5.5, cd: 22, range: 300, kb: 2, speed: 8, basic: true, ranged: true, pack: V,
                 starterName: 'Worn Chakram', desc: 'A razor disc that ricochets off walls and cuts everything again on the way back. Two in the air at once.' },
  });
  Object.assign(I.LEGEND_NAMES, {
    scythe: ["Reaper's Due", 'Soulscythe', 'Pale Harvest'], flasks: ['Alembic of Ruin', 'Nine Bright Vials', 'The Last Tincture'],
    gauntlets: ['Hundred-Fist Vow', 'Stormknuckle', 'Quiet Thunder'], bulwark: ['Aegis of the Gate', 'Wall of Dawn', 'Oathshield'],
    chakram: ['Halo of Edges', 'Moonwheel', 'Twin Orbit'],
  });

  // ---- weapon implementations (core calls ED.weaponImpl[kind])
  const Wimpl = ED.weaponImpl;
  Wimpl.scythe = {
    fire(g, ang, dmg, crit, color) {
      const p = g.player, st = p.st; p.swingN++;
      g.swings.push({ kind: 'arc', t: 0, dur: 12, ang, arc: Math.min(5.8, 3.4 + st.proj * 0.5), range: p.wrange + st.proj * 6, dmg, kb: p.wkb, crit, hit: new Set(), color, sweep: p.swingN % 2 ? 1 : -1 });
      p.kx += Math.cos(ang) * 1.2; p.ky += Math.sin(ang) * 1.2;
    },
    glyph(c, s) { c.rotate(-Math.PI / 4); c.fillRect(-s * 0.06, -s * 0.5, s * 0.12, s * 1.6); c.beginPath(); c.arc(s * 0.1, -s * 0.5, s * 0.75, Math.PI * 1.05, Math.PI * 1.85); c.stroke(); },
    held(c) { c.fillRect(4, -1, 22, 2); c.beginPath(); c.arc(24, -9, 11, 0.2, 2.0); c.stroke(); },
  };
  Wimpl.fists = {
    fire(g, ang, dmg, crit, color) {
      const p = g.player, st = p.st; p.swingN++; p.side = -p.side;
      g.swings.push({ kind: 'arc', t: 0, dur: 5, ang: ang + p.side * 0.15, arc: Math.min(3.6, 1.7 + st.proj * 0.4), range: p.wrange + st.proj * 4, dmg, kb: p.wkb, crit, hit: new Set(), color, sweep: p.side });
      p.kx += Math.cos(ang) * 1.4; p.ky += Math.sin(ang) * 1.4;
      if (p.swingN % 3 === 0) {
        const x = p.x + Math.cos(ang) * 34, y = p.y + Math.sin(ang) * 34, r = 44 + p.wrange * 0.4;
        g.swings.push({ kind: 'circle', t: 0, dur: 8, x, y, r, dmg: dmg * 1.5, kb: p.wkb * 2.2, crit, hit: new Set(), color: '#ffcf8a', heavy: true });
        g.ringFx(x, y, 6, r, '#ffcf8a', 12, 4); g.sfx('thud'); g.shake(3);
      }
    },
    glyph(c, s) { c.fillRect(-s * 0.7, -s * 0.2, s * 0.6, s * 0.7); c.fillRect(s * 0.1, -s * 0.2, s * 0.6, s * 0.7); },
    held(c) { c.fillRect(8, -8, 7, 6); c.fillRect(8, 3, 7, 6); },
  };
  Wimpl.shield = {
    fire(g, ang, dmg, crit, color) {
      const p = g.player, st = p.st; p.swingN++;
      const stag = p.swingN % 2 === 0, arc = Math.min(4, 2.4 + st.proj * 0.4);
      g.swings.push({ kind: 'arc', t: 0, dur: 10, ang, arc, range: p.wrange, dmg, kb: p.wkb, crit, hit: new Set(), color, sweep: 1, stagger: stag, heavy: stag });
      for (const b of g.eproj) {                                      // turn bullets around
        if (b.dead || b.friendly) continue;
        const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
        if (d < p.wrange + 22 && Math.abs(U.angDiff(ang, Math.atan2(dy, dx))) < arc / 2 + 0.2) { b.friendly = true; b.vx *= -1.3; b.vy *= -1.3; b.ang += Math.PI; b.life = 120; b.color = '#a8c8ff'; }
      }
      p.kx += Math.cos(ang) * 2.4; p.ky += Math.sin(ang) * 2.4;
    },
    glyph(c, s) { c.beginPath(); c.moveTo(-s * 0.7, -s * 0.8); c.lineTo(s * 0.7, -s * 0.8); c.lineTo(s * 0.6, s * 0.2); c.lineTo(0, s * 0.95); c.lineTo(-s * 0.6, s * 0.2); c.closePath(); c.fill(); },
    held(c) { c.beginPath(); c.moveTo(10, -10); c.lineTo(20, -8); c.lineTo(20, 8); c.lineTo(10, 10); c.closePath(); c.fill(); },
  };
  Wimpl.chakram = {
    canFire(g) { return g.pproj.filter(b => b.kind === 'chak' && !b.dead).length < 2 + g.player.st.proj; },
    fire(g, ang, dmg, crit, color) {
      const p = g.player, st = p.st, base = I.WEAPONS.chakram, n = 1 + Math.min(2, st.proj);
      for (let k = 0; k < n; k++) g.pShot({ kind: 'chak', ang: ang + (k - (n - 1) / 2) * 0.3, speed: base.speed, dmg, kb: p.wkb, crit, pierce: 99, life: 150, r: 9, color, persist: true, bounce: 3 + (st.bounce || 0), upd: chakUpd, draw: chakDraw });
    },
    glyph(c, s, t) { c.rotate((t || 0) * 0.04); c.beginPath(); c.arc(0, 0, s * 0.8, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, s * 0.35, 0, TAU); c.stroke(); },
    held(c) { c.beginPath(); c.arc(14, 0, 6, 0, TAU); c.stroke(); },
  };
  function chakUpd(g, b) {
    b.spin = (b.spin || 0) + 0.6; b.x += b.vx; b.y += b.vy;
    if (b.life <= 0) { b.dead = true; g.burst(b.x, b.y, 4, b.color, 2, 12); return; }
    if (ED.phys.blocked(g, b.x, b.y, 5, true, false)) { if (b.bounce > 0) { ED.projBounce(g, b); g.sfx('block', { vol: 0.4 }); } else b.dead = true; }
    if (b.t % 4 === 0) g.trailFx(b.x, b.y, b.color, 0.35);
  }
  function chakDraw(c, b, t) {
    c.translate(b.x, b.y); c.rotate(b.spin || 0); ED.render.glow(c, 0, 0, 16, b.color, 0.25);
    c.strokeStyle = b.color; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(3, 0); c.lineTo(11, 0); c.stroke(); }
  }

  // flasks ---------------------------------------------------------------
  const ELEMS = { fire: { color: '#ff6a2a', name: 'fire' }, poison: { color: '#8ae06a', name: 'poison' }, frost: { color: '#9fe4ff', name: 'frost' } };
  const ELEM_IDS = ['fire', 'poison', 'frost'];
  Wimpl.flask = {
    fire(g, ang, dmg, crit, color) {
      const p = g.player, st = p.st, m = ED.input.mouse;
      let d = p.wrange * 0.72;
      if (m.aim && !ED.input.aimVec) d = U.clamp(Math.hypot(m.x - p.x, m.y - C.HUD - p.y), 70, p.wrange);
      const n = 1 + Math.min(3, st.proj), px = -Math.sin(ang), py = Math.cos(ang);
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * 42;
        const tx = U.clamp(p.x + Math.cos(ang) * d + px * off, 48, C.ROOM_W - 48), ty = U.clamp(p.y + Math.sin(ang) * d + py * off, 48, C.ROOM_H - 48);
        const elem = ELEM_IDS[g.rng.int(0, 2)];
        const T = Math.round(26 + Math.hypot(tx - p.x, ty - p.y) / 11);
        g.pShot({ kind: 'flask', ang, speed: 0, dmg, kb: p.wkb, crit, life: 9999, r: 5, color: ELEMS[elem].color, elem, sx: p.x, sy: p.y, tx, ty, T, noHit: true, upd: flaskUpd, draw: flaskDraw });
      }
    },
    glyph(c, s) { c.beginPath(); c.arc(0, s * 0.25, s * 0.6, 0, TAU); c.fill(); c.fillRect(-s * 0.18, -s * 0.75, s * 0.36, s * 0.55); },
    held(c) { c.beginPath(); c.arc(14, 4, 6, 0, TAU); c.fill(); c.fillRect(12, -6, 4, 6); },
  };
  function flaskUpd(g, b) {
    const k = Math.min(1, b.t / b.T);
    b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k; b.h = Math.sin(k * Math.PI) * 52;
    if (b.t >= b.T) { flaskLand(g, b); b.dead = true; }
  }
  function flaskDraw(c, b) {
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(b.x, b.y, 6, 3, 0, 0, TAU); c.fill();
    c.translate(b.x, b.y - (b.h || 0)); c.rotate(b.t * 0.25);
    c.fillStyle = b.color; c.beginPath(); c.arc(0, 2, 6, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.fillRect(-2, -7, 4, 6);
  }
  function flaskLand(g, b) {
    const p = g.player, st = p.st, R = 46 * (1 + 0.1 * Math.min(3, st.proj)), el = ELEMS[b.elem];
    g.explodeFx(b.x, b.y, R, el.color);
    for (const e of g.enemies) {
      if (e.dead) continue;
      for (const hb of g.hurtboxes(e)) {
        if (!U.circleHit(b.x, b.y, R, hb.x, hb.y, hb.r)) continue;
        g.damageEnemy(e, b.dmg, { src: 'proj', x: b.x, y: b.y, kb: b.kb * 1.6, crit: b.crit, hb, noExplode: true });
        break;
      }
    }
    for (const pr of g.props) if (!pr.dead && U.circleHit(b.x, b.y, R, pr.x, pr.y, pr.r)) g.breakProp(pr);
    const life = Math.round(150 * (p.relics.p_alch ? 1.6 : 1));
    g._zone({ kind: 'hazard', shape: 'circle', x: b.x, y: b.y, r: R * 0.85, life, dmg: Math.max(1, b.dmg * 0.22), tick: 24, tickT: 0, hurts: false, hurtsEnemies: true, color: el.color, elem: b.elem, src: p });
  }

  // ------------------------------------------------------------------ actives
  Object.assign(I.ACTIVES, {
    frostnova:  { id: 'frostnova', name: 'Frost Nova', color: '#9fe4ff', charges: 1, cd: 12, dmg: 10, radius: 135, pack: V, desc: 'A freezing ring: damages everything it touches and slows it for 3s.' },
    dome:       { id: 'dome', name: 'Bulwark Dome', color: '#a8c8ff', charges: 1, cd: 16, dmg: 0, radius: 105, dur: 5, pack: V, desc: 'Raise a barrier at your feet for 5s that shatters every enemy bullet inside it.' },
    raise:      { id: 'raise', name: 'Raise Dead', color: '#c9b8ff', charges: 1, cd: 15, dmg: 0, radius: 0, pack: V, desc: 'Call three spectral thralls (12s) that hunt your enemies.' },
    overcharge: { id: 'overcharge', name: 'Overcharge', color: '#ffcf8a', charges: 1, cd: 18, dmg: 0, radius: 0, dur: 6, pack: V, desc: 'Six seconds of +45% attack speed and +20% damage.' },
  });
  const A = ED.activeImpl;
  A.frostnova = function (g, s, aim, pow) {
    const p = g.player;
    g.zoneEnemies(p.x, p.y, s.radius, s.dmg * Math.pow(pow, 0.9) * 0.8, { speed: 6, color: '#9fe4ff' });
    for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < s.radius + e.r) g.applyStatus(e, 'slow', { t: 180, f: e.boss ? 0.7 : 0.35 });
    g.ringFx(p.x, p.y, 10, s.radius, '#e8f8ff', 18, 5); g.burst(p.x, p.y, 24, '#bfeaff', 5, 26); g.flashScreen('#9fe4ff', 0.15); g.sfx('shrine');
  };
  A.dome = function (g, s) {
    const p = g.player;
    p.dome = { x: p.x, y: p.y, r: s.radius, t: 0, dur: Math.round(s.dur * 60) };
    g.ringFx(p.x, p.y, 10, s.radius, '#a8c8ff', 20, 5); g.sfx('shrine');
  };
  A.raise = function (g, s) {
    const p = g.player;
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + g.rng.next(); spawnThrall(g, p.x + Math.cos(a) * 32, p.y + Math.sin(a) * 32, true); }
    g.sfx('summon'); g.flashScreen('#c9b8ff', 0.12);
  };
  A.overcharge = function (g, s) {
    const p = g.player;
    p.buffT.ocharge = Math.round(s.dur * 60); g.ringFx(p.x, p.y, 8, 60, '#ffcf8a', 16, 4); g.sfx('levelup'); g.toast('OVERCHARGE!', '#ffcf8a', 80);
  };

  // ------------------------------------------------------------------ class passives = hidden relics (hooks + stats just work)
  const passive = (key, def) => I.addRelic(key, Object.assign({ rarity: 'epic', hidden: true, passive: true, unique: true, pack: V, mods: {} }, def));
  passive('p_necro', { id: 'p_necro', name: 'Deathbound', color: '#c9b8ff', mods: { thrall: 3, raise: 0.2 }, desc: 'Slain enemies have a 20% chance to rise as your thralls (up to 3 at once). Thralls fight for 12s.' });
  passive('p_alch', { id: 'p_alch', name: 'Volatile Brews', color: '#9bf08a', desc: 'Puddles last 60% longer. An enemy standing in a puddle with two different afflictions (burn / poison / chill) triggers a Reaction blast.' });
  passive('p_monk', { id: 'p_monk', name: 'Flow', color: '#ffcf8a', desc: 'Every hit builds Flow (max 10): +2.5% attack speed and +3% move speed per stack. It fades 1.3s after your last hit.',
    on: { hit(g, p) { p.flow = Math.min(10, (p.flow || 0) + 1); p.flowT = 80; } } });
  passive('p_warden', { id: 'p_warden', name: 'Stalwart', color: '#a8c8ff', mods: { guard: 1, def: 1 }, desc: 'You carry a Guard that blocks one hit entirely. It returns 10s after it breaks. +1 defense.' });

  // ------------------------------------------------------------------ classes
  Object.assign(I.CLASSES, {
    necromancer: { id: 'necromancer', name: 'Necromancer', weapon: 'scythe', hearts: 4, active: 'raise', color: '#c9b8ff', unlock: 'mini:gravewarden', passive: 'p_necro', pack: V,
                   mods: {}, desc: 'Fragile reaper who commands the fallen. Starts with a Scythe and Raise Dead.' },
    alchemist:   { id: 'alchemist', name: 'Alchemist', weapon: 'flasks', hearts: 5, active: 'frostnova', color: '#9bf08a', unlock: 'mini:cinderwitch', passive: 'p_alch', pack: V,
                   mods: { luck: 0.5 }, desc: 'Lobs reactive brews and fights from the edge. Starts with Flasks and Frost Nova.' },
    monk:        { id: 'monk', name: 'Monk', weapon: 'gauntlets', hearts: 5, active: 'overcharge', color: '#ffcf8a', unlock: 'kills:400', passive: 'p_monk', pack: V,
                   mods: { dashCd: -0.1 }, desc: 'Never stops moving; the longer a chain of hits, the faster you get. Starts with Gauntlets and Overcharge.' },
    warden:      { id: 'warden', name: 'Warden', weapon: 'bulwark', hearts: 7, active: 'dome', color: '#a8c8ff', unlock: 'floor:6', passive: 'p_warden', pack: V,
                   mods: { speed: -0.03 }, desc: 'Immovable guardian with a blocking Guard. Starts with a Bulwark and Bulwark Dome.' },
  });

  // ------------------------------------------------------------------ relics
  const relic = (key, def) => I.addRelic(key, Object.assign({ pack: V, mods: {} }, def));
  // -- thralls
  relic('soulphial', { id: 'soulphial', name: 'Soul Phial', rarity: 'uncommon', color: '#c9b8ff', mods: { thrall: 1, raise: 0.07 }, max: 4, desc: '+1 max thrall; kills have +7% chance to raise a thrall (any class).' });
  relic('gravecloth', { id: 'gravecloth', name: 'Grave Cloth', rarity: 'rare', color: '#8a7ab8', mods: { thrallPow: 0.4 }, max: 3, desc: 'Thralls hit 40% harder and last 32% longer.' });
  relic('ossuary', { id: 'ossuary', name: 'Ossuary Charm', rarity: 'epic', color: '#e8e0c8', mods: { thrallBlast: 1 }, unique: true, desc: 'Thralls detonate when they expire.' });
  // -- guard
  relic('aegisplate', { id: 'aegisplate', name: 'Aegis Plate', rarity: 'rare', color: '#a8c8ff', mods: { guard: 1 }, max: 3, desc: '+1 Guard: it blocks a whole hit, then recharges.', on: { pickup(g, p) { p.guard = (p.guard || 0) + 1; } } });
  relic('mendingbell', { id: 'mendingbell', name: 'Mending Bell', rarity: 'uncommon', color: '#f0e0a0', mods: { guardRecharge: 0.3 }, max: 3, desc: 'Guards recharge 30% faster.' });
  relic('spikedbuckler', { id: 'spikedbuckler', name: 'Spiked Buckler', rarity: 'rare', color: '#8aa8d8', mods: { guardBlast: 1 }, unique: true, desc: 'Breaking a Guard releases a knockback shockwave.' });
  // -- hex
  relic('hexlantern', { id: 'hexlantern', name: 'Hex Lantern', rarity: 'uncommon', color: '#c05cff', mods: { hex: 0.15 }, max: 4, desc: 'Hits have a 15% chance to Hex: +25% damage taken for 6s.' });
  relic('hexidol', { id: 'hexidol', name: 'Hexbound Idol', rarity: 'epic', color: '#9a3acc', mods: { hexBlast: 1 }, unique: true, desc: 'Hexed enemies explode when they die.' });
  relic('duelistglove', { id: 'duelistglove', name: "Duelist's Glove", rarity: 'rare', color: '#e0c8a0', mods: { opener: 0.7 }, max: 2, desc: 'The first blow against an unhurt enemy deals +70% damage.' });
  // -- tempo
  relic('rage', { id: 'rage', name: 'Rising Wrath', rarity: 'uncommon', color: '#ff5a3a', max: 3, desc: 'Each kill in a room adds a Wrath stack (max 10): +3% attack speed each. Resets when the room ends.',
    on: { kill(g, p) { p.wrath = Math.min(10, (p.wrath || 0) + 1); }, clear(g, p) { p.wrath = 0; }, enter(g, p) { p.wrath = 0; } } });
  relic('momentum', { id: 'momentum', name: 'Momentum Band', rarity: 'uncommon', color: '#7fd8ff', max: 4, desc: 'Every kill shaves a quarter second off your dash cooldown.',
    on: { kill(g, p, e, n) { p.dashCd = Math.max(0, p.dashCd - 15 * n); } } });
  relic('shadowcloak', { id: 'shadowcloak', name: 'Shadowstep Cloak', rarity: 'epic', color: '#6a5aa8', unique: true, desc: 'Dashing grants +50% crit chance for 2 seconds.', on: { dash(g, p) { p.shadowT = 120; } } });
  relic('emberstride', { id: 'emberstride', name: 'Emberstride Sandals', rarity: 'rare', color: '#ff7a3a', max: 2, desc: 'Your dash leaves a trail of burning ground.' });
  relic('sharpshooter', { id: 'sharpshooter', name: "Marksman's Edge", rarity: 'rare', color: '#ffd24a', mods: { critMult: 0.25 }, max: 3, desc: 'Critical hits deal +25% more damage.' });
  relic('ricochetrune', { id: 'ricochetrune', name: 'Ricochet Rune', rarity: 'rare', color: '#9ff0ff', mods: { bounce: 1 }, max: 2, desc: 'Your projectiles bounce off walls once more.' });
  relic('battlehorn', { id: 'battlehorn', name: 'Battle Horn', rarity: 'uncommon', color: '#e8c070', max: 3, desc: '+12% damage during boss and mini boss fights.' });
  // -- sustain & economy
  relic('bloodchalice', { id: 'bloodchalice', name: 'Blood Chalice', rarity: 'uncommon', color: '#c02a4a', max: 3, desc: 'Every 8th kill heals 1 HP (every 6th with two, 4th with three).',
    on: { kill(g, p, e, n) { p.chaliceN = (p.chaliceN || 0) + 1; if (p.chaliceN >= 10 - 2 * n) { p.chaliceN = 0; g.healPlayer(1, true); } } } });
  relic('secondwind', { id: 'secondwind', name: 'Second Wind', rarity: 'epic', color: '#9bf0c8', unique: true, desc: 'Once per floor, a hit that leaves you under 25% HP instead heals 30% of your max HP.',
    on: { hurt(g, p) { if (p.hp > 0 && p.hp <= p.maxHp * 0.25 && p.windFloor !== g.floorNum) { p.windFloor = g.floorNum; g.healPlayer(Math.ceil(p.maxHp * 0.3)); p.inv = Math.max(p.inv, 70); g.toast('SECOND WIND', '#9bf0c8', 100); g.ringFx(p.x, p.y, 8, 80, '#9bf0c8', 20, 5); } } } });
  relic('tithe', { id: 'tithe', name: 'Tithe Collector', rarity: 'uncommon', color: '#ffd24a', max: 3, desc: 'Clearing a room drops bonus gold that grows with depth.',
    on: { clear(g, p, n) { g.dropGold(480, 300, Math.round((3 + g.floorNum * 0.8) * n)); } } });
  relic('catalyst', { id: 'catalyst', name: 'Catalyst Vial', rarity: 'uncommon', color: '#7fe0b8', mods: { burn: 0.1, freeze: 0.1, poison: 0.1 }, max: 3, desc: '+10% chance to ignite, chill and poison on hit.' });

  I.SYNERGIES.push(
    { id: 'deathknell', pack: V, name: 'Death Knell', needs: ['hexlantern', 'soulphial'], desc: 'Anything that dies Hexed always rises as a thrall.' },
    { id: 'fortress', pack: V, name: 'Fortress', needs: ['aegisplate', 'spikedbuckler'], desc: 'A broken Guard also grants 1.5s of invulnerability.' },
    { id: 'plaguebearer', pack: V, name: 'Plaguebearer', needs: ['catalyst', 'hexlantern'], desc: 'Hexed enemies are also poisoned.' },
    { id: 'tempo', pack: V, name: 'Tempo', needs: ['momentum', 'rage'], desc: 'Kills also grant a short burst of haste.' },
  );

  // ------------------------------------------------------------------ armor + affixes
  I.ARMOR.helmet.push(
    { id: 'wardhelm', name: "Warden's Greathelm", def: 1.1, mods: { guardRecharge: 0.15 }, desc: 'Guards recharge faster.', pack: V },
    { id: 'monkband', name: "Monk's Headband", def: 0.5, mods: { atkSpd: 0.1 }, desc: '+attack speed.', pack: V },
  );
  I.ARMOR.chest.push(
    { id: 'bonecuirass', name: 'Bone Cuirass', def: 1.4, mods: { thrall: 1 }, desc: '+1 max thrall.', pack: V },
    { id: 'alchcoat', name: "Alchemist's Coat", def: 0.9, mods: { poison: 0.1, burn: 0.08 }, desc: 'Strikes may poison and ignite.', pack: V },
  );
  I.ARMOR.boots.push({ id: 'shadowboots', name: 'Shadowstep Boots', def: 0.6, mods: { dashCd: -0.12, speed: 0.05 }, desc: 'Quicker dashes and feet.', pack: V });
  Object.assign(I.AFFIXES, {
    hex:    { id: 'hex', prefix: 'Hexing', suffix: 'of Malice', stat: 'hex', v: [0.12, 0.18], text: v => Math.round(v * 100) + '% chance to Hex', pack: V },
    bounce: { id: 'bounce', prefix: 'Ricochet', suffix: '', stat: 'bounce', v: [1, 1], text: v => 'bounces ' + v + ' more', ranged: true, pack: V },
    reaper: { id: 'reaper', prefix: 'Necrotic', suffix: 'of the Grave', stat: 'raise', v: [0.05, 0.09], text: v => Math.round(v * 100) + '% chance for kills to raise a thrall', pack: V },
  });

  // ------------------------------------------------------------------ mixins: puddles that hurt enemies, thralls
  ED.mixins.push({
    zoneHurtEnemies(z) {
      const p = this.player, react = !!p.relics.p_alch;
      for (const e of this.enemies) {
        if (e.dead || e.invuln || e.ghosting) continue;
        if (!ED.zoneHits(z, e.x, e.y, e.r * (e.big ? 0.5 : 1))) continue;
        this.damageEnemy(e, z.dmg, { src: 'zone', x: z.x, y: z.y, kb: 0, noProc: true, noKb: true, noFlashText: true, color: z.color });
        if (e.dead) continue;
        if (z.elem === 'fire') this.applyStatus(e, 'burn', { t: 150, dps: Math.max(1, z.dmg * 0.6) });
        else if (z.elem === 'poison') this.applyStatus(e, 'poison', { t: 180, dps: Math.max(1, z.dmg * 0.6) });
        else if (z.elem === 'frost') this.applyStatus(e, 'slow', { t: 80, f: e.boss ? 0.7 : 0.5 });
        if (react && ((e.status.burn ? 1 : 0) + (e.status.poison ? 1 : 0) + (e.status.slow ? 1 : 0)) >= 2 && (e.reactT || 0) < this.frame) {
          e.reactT = this.frame + 100;
          this.addText(e.x, e.y - e.r - 14, 'REACTION', '#ffe14a', 12);
          this.explode(e.x, e.y, 58, Math.max(4, z.dmg * 5), { owner: 'player', fire: true });
        }
      }
    },
  });

  // thralls ---------------------------------------------------------------
  function thrallCap(p, force) { const st = p.st; return Math.max(force ? 3 : 0, st.thrall || 0, (st.raise || 0) > 0 ? 2 : 0); }
  function spawnThrall(g, x, y, force) {
    const p = g.player, cap = thrallCap(p, force);
    if (!cap) return null;
    const list = g.allies;
    let n = 0; for (const a of list) if (a.type === 'thrall') n++;
    while (n >= cap) { const i = list.findIndex(a => a.type === 'thrall'); if (i < 0) break; list.splice(i, 1); n--; }
    const life = Math.round(720 * (1 + 0.8 * (p.st.thrallPow || 0)));
    const a = { kind: 'ally', type: 'thrall', id: ED.id(), x, y, r: 8, flying: true, noProps: true, vx: 0, vy: 0, t: 0, life, max: life, cd: 10, seed: Math.random() * 6, face: 0 };
    list.push(a);
    g.burst(x, y, 10, '#c9b8ff', 3, 22); g.ringFx(x, y, 4, 22, '#c9b8ff', 12, 3);
    return a;
  }
  function updateThralls(g) {
    const p = g.player, list = g.allies; if (!list.length) return;
    const pow = 1 + (p.st.thrallPow || 0);
    const dmg = Math.max(2, p.wdmg * 0.5 * pow);
    for (const a of list) {
      a.t++; a.life--; if (a.cd > 0) a.cd--;
      const hb = g.homingTarget(a.x, a.y, 520);
      let tx, ty, sp = 3.1;
      if (hb) { tx = hb.x; ty = hb.y; }
      else { const ang = a.seed + a.t * 0.03; tx = p.x + Math.cos(ang) * 46; ty = p.y + Math.sin(ang) * 46; sp = 2.6; }
      const d = Math.hypot(tx - a.x, ty - a.y);
      if (d > 3) { const s = Math.min(sp, d); ED.phys.move(g, a, (tx - a.x) / d * s, (ty - a.y) / d * s); a.face = Math.atan2(ty - a.y, tx - a.x); }
      if (hb && a.cd <= 0 && d < a.r + hb.r + 4) {
        a.cd = 24;
        g.damageEnemy(hb.e, dmg, { src: 'thrall', x: a.x, y: a.y, kb: 3, noProc: true, hb, noFlashText: false, color: '#c9b8ff' });
        g.burst(a.x, a.y, 3, '#c9b8ff', 2, 10);
      }
      if (a.life <= 0) {
        a.dead = true;
        if (p.st.thrallBlast) g.explode(a.x, a.y, 52, Math.max(3, dmg * 2.2), { owner: 'player' });
        else g.burst(a.x, a.y, 8, '#c9b8ff', 2.5, 18);
      }
    }
    U.compact(list, a => !a.dead);
  }
  function drawAllies(g, c, t) {
    for (const a of g.allies) {
      const fade = Math.min(1, a.life / 50) * Math.min(1, a.t / 10);
      c.save(); c.globalAlpha = 0.85 * fade;
      ED.render.glow(c, a.x, a.y, 16, '#c9b8ff', 0.35);
      c.fillStyle = '#d8ccff'; c.beginPath(); c.arc(a.x, a.y - 1 + Math.sin(t * 0.2 + a.seed) * 1.5, a.r, Math.PI, 0); c.lineTo(a.x + a.r, a.y + 7); c.lineTo(a.x + a.r * 0.4, a.y + 4); c.lineTo(a.x, a.y + 8); c.lineTo(a.x - a.r * 0.4, a.y + 4); c.lineTo(a.x - a.r, a.y + 7); c.closePath(); c.fill();
      c.fillStyle = '#2a1a48'; c.beginPath(); c.arc(a.x - 3, a.y - 2, 1.8, 0, TAU); c.arc(a.x + 3, a.y - 2, 1.8, 0, TAU); c.fill();
      c.restore();
    }
  }

  // ------------------------------------------------------------------ per-frame logic
  ED.projBounce = function (g, b) {
    const bl = (x, y) => ED.phys.blocked(g, x, y, 2, true, false);
    const px = b.x - b.vx, py = b.y - b.vy;
    if (!bl(b.x, py)) b.vy = -b.vy; else if (!bl(px, b.y)) b.vx = -b.vx; else { b.vx = -b.vx; b.vy = -b.vy; }
    b.x = px; b.y = py; b.bounce--; if (b.hit) b.hit.clear(); b.ang = Math.atan2(b.vy, b.vx);
    g.burst(b.x, b.y, 3, b.color || '#fff', 2, 10);
    return true;
  };

  ED.hook('runStart', V, (g) => { const p = g.player; p.guard = p.st.guard || 0; p.guardT = 0; p.flow = 0; p.wrath = 0; });
  ED.hook('floorStart', V, (g) => { const p = g.player; p.guard = Math.max(p.guard || 0, p.st.guard || 0); p.dome = null; });
  ED.hook('roomEnter', V, (g) => { const p = g.player; p.dome = null; });
  ED.hook('guardBreak', V, (g) => {
    const p = g.player;
    if (p.st.guardBlast) g.zoneEnemies(p.x, p.y, 125, Math.max(4, p.wdmg * 1.4), { speed: 8, color: '#a8c8ff' });
    if (p.syn.fortress) p.inv = Math.max(p.inv, 90);
  });
  ED.hook('kill', V, (g, e) => {
    const p = g.player, st = p.st;
    if (e.lastSrc !== 'thrall') {
      const knell = p.syn.deathknell && e.hexT > 0;
      if (knell || (st.raise > 0 && g.rng.chance(st.raise))) spawnThrall(g, e.x, e.y, false);
    }
    if (st.hexBlast && e.hexT > 0) g.explode(e.x, e.y, 62, Math.max(3, p.wdmg * 1.2), { owner: 'player' });
    if (p.syn.tempo) p.buffT.haste = Math.max(p.buffT.haste || 0, 70);
  });
  ED.hook('tick', V, (g) => {
    const p = g.player; if (!p || p.dead || !p.st) return;
    const st = p.st;
    // Guard recharge
    const gmax = st.guard || 0;
    if (gmax > 0 && (p.guard || 0) < gmax) {
      p.guardT = (p.guardT || 0) + 1;
      if (p.guardT >= Math.round(600 * (1 - Math.min(0.75, st.guardRecharge || 0)))) { p.guard = (p.guard || 0) + 1; p.guardT = 0; g.addText(p.x, p.y - 24, 'GUARD UP', '#a8c8ff', 11); g.ringFx(p.x, p.y, 6, 30, '#a8c8ff', 12, 3); g.sfx('block', { vol: 0.5 }); }
    }
    // temporary multipliers read by the core attack / move code
    let atk = 0, spd = 0, dmg = 0, crit = 0;
    if (p.flow > 0) { p.flowT--; if (p.flowT <= 0) { p.flow--; p.flowT = 14; } atk += 0.025 * p.flow; spd += 0.03 * p.flow; }
    if (p.wrath > 0 && p.relics.rage) atk += 0.03 * p.wrath * (1 + (p.relics.rage - 1) * 0.5);
    if (p.buffT.ocharge > 0) { atk += 0.45; dmg += 0.2; }
    if (p.shadowT > 0) { p.shadowT--; crit += 0.5; }
    if (p.relics.battlehorn && g.rt && g.rt.bossStarted && !g.room.cleared) dmg += 0.12 * p.relics.battlehorn;
    p.tempAtk = atk; p.tempSpd = spd; p.tempDmg = dmg; p.tempCrit = crit;
    // Emberstride: burning footprints while dashing
    if (p.dashing && p.relics.emberstride && g.frame % 3 === 0) {
      g._zone({ kind: 'hazard', shape: 'circle', x: p.x, y: p.y, r: 22, life: 130, dmg: Math.max(1, p.wdmg * 0.25 * p.relics.emberstride), tick: 20, tickT: 0, hurts: false, hurtsEnemies: true, color: '#ff6a2a', elem: 'fire', src: p });
    }
    // Bulwark Dome
    const d = p.dome;
    if (d) {
      d.t++;
      for (const b of g.eproj) if (!b.dead && !b.friendly && Math.hypot(b.x - d.x, b.y - d.y) < d.r) { b.dead = true; g.burst(b.x, b.y, 4, '#a8c8ff', 2.5, 12); }
      if (d.t >= d.dur) p.dome = null;
    }
    // Plaguebearer
    if (p.syn.plaguebearer && g.frame % 30 === 0) for (const e of g.enemies) if (!e.dead && e.hexT > 0) g.applyStatus(e, 'poison', { t: 120, dps: Math.max(1, p.wdmg * 0.1) });
    updateThralls(g);
  });

  // ------------------------------------------------------------------ drawing + HUD
  ED.hook('draw', V, (g, c, t) => {
    const p = g.player;
    if (p.dome) {
      const d = p.dome, k = d.t / d.dur, a = 0.18 + 0.08 * Math.sin(t * 0.2);
      c.save(); c.fillStyle = U.rgba('#a8c8ff', a * (1 - k * 0.5)); c.strokeStyle = U.rgba('#cfe4ff', 0.8 * (1 - k * 0.6)); c.lineWidth = 3;
      c.beginPath(); c.arc(d.x, d.y, d.r, 0, TAU); c.fill(); c.stroke(); c.restore();
    }
    for (const e of g.enemies) {
      if (e.dead || !(e.hexT > 0)) continue;
      c.save(); c.strokeStyle = 'rgba(190,90,255,' + (0.5 + 0.3 * Math.sin(t * 0.3)) + ')'; c.lineWidth = 2;
      c.beginPath(); c.arc(e.x, e.y, e.r + 5, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(e.x - 4, e.y - e.r - 12); c.lineTo(e.x + 4, e.y - e.r - 6); c.moveTo(e.x + 4, e.y - e.r - 12); c.lineTo(e.x - 4, e.y - e.r - 6); c.stroke(); c.restore();
    }
    drawAllies(g, c, t);
  });
  ED.hook('hud', V, (g, c) => {
    const p = g.player, UI = ED.ui;
    const gmax = p.st.guard || 0;
    for (let i = 0; i < gmax && i < 6; i++) {
      const x = 190 + i * 11, y = 10, on = i < (p.guard || 0);
      c.fillStyle = on ? '#a8c8ff' : '#26263a'; c.strokeStyle = on ? '#e8f4ff' : '#4a4a68'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 9, y); c.lineTo(x + 8, y + 7); c.lineTo(x + 4.5, y + 12); c.lineTo(x + 1, y + 7); c.closePath(); c.fill(); c.stroke();
    }
    let y = 28;
    const line = (txt, col) => { UI.text(c, txt, 190, y, 9, col); y += 11; };
    if (p.flow > 0) line('FLOW ' + p.flow, '#ffcf8a');
    if (p.wrath > 0 && p.relics.rage) line('WRATH ' + p.wrath, '#ff7a5a');
    if (g.allies.length) line('THRALLS ' + g.allies.length, '#c9b8ff');
    if (p.buffT.ocharge > 0) line('OVERCHARGE', '#ffcf8a');
    if (p.dome) line('DOME', '#a8c8ff');
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

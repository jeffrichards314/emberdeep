/* EMBERDEEP — pack_v8.js : v8 "ABYSS" — an ending, and what lies below it.
 *
 *  THE EMBERDEEP HEART : a final MEGA boss on floor 50 (and every 50th floor after, ever angrier).  Four chambers, two tendrils,
 *                        and the heart itself, across six phases.  Beating it opens a choice: bank the true victory, or go on.
 *  ABYSSAL RULES       : from floor 31 every floor carries one rule that twists the fight (darkness, bloodtide, armoured foes…),
 *                        announced on the floor card, paid for with extra gold and spoils.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, D = ED.D, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v8';
  const L = (name, o) => [name, o];

  P.define({
    id: 'v8', name: 'ABYSS', tag: 'an ending, and what lies below it', color: '#ff5a3a',
    blurb: 'A true final boss — the Emberdeep Heart — waits on floor 50 (and every 50th floor after) with an ending choice; from floor 31 every floor carries an Abyssal Rule that twists the fight, paid back in gold and spoils.',
  });

  // ------------------------------------------------------------------ the final boss
  const HEART = { id: 'emberheart', pack: V, final: true, name: 'The Emberdeep Heart', title: 'the Thing Beneath', color: '#ff5a3a', accent: '#ffd0a0', r: 112, hp: 1500, rScale: 1.0, hpScale: 1.5, arena: 'arena_round', shape: 'emberheart', mega: true, contact: 7, megaIndex: 9,
    teaches: 'Everything you have learned. Break the four chambers, sever the tendrils, then silence the heart.', unlock: { boss: 'emberheart' },
    parts: [
      { id: 'c0', kind: 'chamber', r: 32, hp: 0.065, group: 0, ang: 0 }, { id: 'c1', kind: 'chamber', r: 32, hp: 0.065, group: 0, ang: 1 }, { id: 'c2', kind: 'chamber', r: 32, hp: 0.065, group: 0, ang: 2 }, { id: 'c3', kind: 'chamber', r: 32, hp: 0.065, group: 0, ang: 3 },
      { id: 'tendrilL', kind: 'arm', r: 48, hp: 0.09, group: 1, side: -1 }, { id: 'tendrilR', kind: 'arm', r: 48, hp: 0.09, group: 1, side: 1 },
      { id: 'core', kind: 'core', r: 58, hp: 0.58, group: 2 },
    ],
    attacks: {
      surge: L('beams', { n: 3, len: 720, w: 24, warn: 52, life: 110, rot: 0.022, dmg: 0.9, color: '#ff7a3a', anchorParts: 'chamber' }), throb: L('hazardRings', { n: 4, spacing: 32, speed: 2.5, color: '#ff5a3a' }),
      embers: L('rain', { n: 10, r: 44, warn: 48, interval: 7, aimed: 0.65, color: '#ff7a3a' }), clot: L('summon', { types: ['shielded', 'chaser'], n: 3, max: 7, hpMul: 0.8, radius: 200 }),
      crush: L('fists', {}), crush3: L('fists', { n: 3 }), vessel: L('bars', { n: 3, thick: 48, gapW: 160, warn: 70, color: '#ff5a3a' }), vesselV: L('bars', { n: 3, thick: 48, gapW: 160, warn: 70, vertical: true, color: '#ff5a3a' }),
      spiral: L('spiral', { arms: 4, frames: 84, speed: 2.1, color: '#ff7a3a' }), beat: L('radial', { n: 14, reps: 2, gap: 14, speed: 2.4, rot: 0.18, color: '#ffb080' }),
      pulse: L('screenBlast', { safe: 3, warn: 104, dmg: 1.7 }), seek: L('homing', { n: 5, speed: 1.8, color: '#ff9a6a' }), pillars: L('pillars', { n: 3, max: 8 }),
    },
    phases: [
      { name: 'Four Chambers', attacks: ['surge', 'throb', 'embers'], idle: [34, 60] },
      { name: 'Arrhythmia', attacks: ['surge', 'vessel', 'embers', 'clot', 'beat'], idle: [28, 50], enter: [L('clot', null)] },
      { name: 'Severed Tendrils', attacks: ['crush', 'embers', 'vesselV', 'clot', 'throb'], idle: [26, 46] },
      { name: 'The Heart Exposed', attacks: ['crush3', 'seek', 'vessel', 'beat', 'throb'], idle: [22, 40], enter: [L('shrink', { ring: 1, tile: T.PIT }), L('pillars', { n: 3, max: 8 })] },
      { name: 'Cardiac Fury', attacks: ['spiral', 'crush3', 'seek', 'vesselV', 'embers', 'beat'], idle: [18, 34], enter: [L('shrink', { ring: 2, tile: T.PIT })] },
      { name: 'FLATLINE', attacks: ['pulse', 'spiral', 'seek', 'crush3', 'vessel', 'vesselV'], idle: [13, 26], enter: [L('shrink', { ring: 3, tile: T.LAVA })] },
    ],
    phaseOf(e) {
      const ch = e.parts.filter(p => p.kind === 'chamber' && !p.dead).length, td = e.parts.filter(p => p.kind === 'arm' && !p.dead).length;
      if (ch >= 3) return 0; if (ch >= 1) return 1; if (td) return 2;
      const core = e.parts.find(p => p.id === 'core'), f = core.hp / core.maxHp; return f > 0.66 ? 3 : f > 0.33 ? 4 : 5;
    } };
  ED.bosses.MEGAS.emberheart = HEART; P.track('megas', ED.bosses.MEGAS);
  // every 50th floor belongs to the Heart
  ED.specMods.push((spec) => {
    if (!P.on('v8') || spec.floor % 50 !== 0) return;
    spec.defId = 'emberheart'; spec.partnerId = null; spec.fused = false; spec.mods = spec.tier >= 2 ? ['relentless'] : []; spec.final = true; spec.mega = true; spec.arena = 'arena_round'; spec.color = HEART.color;
    spec.name = 'The Emberdeep Heart' + (spec.floor > 50 ? ' — Returned' : '');
  });
  ED.partPos.chamber = (e, p, g, t) => { const c = [[210, 175], [750, 175], [210, 405], [750, 405]][p.ang | 0]; return [c[0] + Math.sin(t * 0.03 + p.ang) * 8, c[1] + Math.cos(t * 0.04 + p.ang) * 6]; };
  ED.partDraw.chamber = (c, e, p, vul, fl, t) => {
    const k = 1 + 0.08 * Math.sin(t * 0.2 + p.ang);
    c.fillStyle = fl ? '#fff' : (vul ? '#ff8a6a' : '#8a3a30'); c.beginPath(); c.arc(p.x, p.y, p.r * k, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = fl ? '#fff' : (vul ? '#ffd0a0' : '#5a2a28'); c.beginPath(); c.arc(p.x - p.r * 0.25, p.y - p.r * 0.2, p.r * 0.35, 0, TAU); c.fill();
    if (vul) ED.render.glow(c, p.x, p.y, p.r * 1.5, '#ff5a3a', 0.28 + 0.1 * Math.sin(t * 0.3));
  };
  ED.bossDraw.emberheart = (c, e, x, y, r, col, dk, t) => {
    const k = 1 + 0.05 * Math.sin(t * 0.18) + (e.enraged ? 0.03 : 0);
    ED.render.glow(c, x, y, r * 1.7, '#ff5a3a', 0.18 + 0.06 * Math.sin(t * 0.18));
    c.strokeStyle = 'rgba(190,40,40,0.8)'; c.lineWidth = 6;
    for (const p of e.parts || []) if (!p.dead && (p.kind === 'chamber' || p.kind === 'arm')) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + p.x) / 2, y - r * 0.45 + Math.sin(t * 0.1 + p.x) * 10, p.x, p.y); c.stroke(); }
    c.lineWidth = 3; c.strokeStyle = dk; c.fillStyle = ED.render.darker(col, 0.15);
    c.beginPath(); c.arc(x - r * 0.42 * k, y - r * 0.25 * k, r * 0.62 * k, Math.PI, TAU * 0.98); c.arc(x + r * 0.42 * k, y - r * 0.25 * k, r * 0.62 * k, Math.PI * 1.02, TAU); c.lineTo(x + r * 1.0 * k, y + r * 0.05 * k); c.lineTo(x, y + r * 1.05 * k); c.lineTo(x - r * 1.0 * k, y + r * 0.05 * k); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x - r * 0.38 * k, y - r * 0.28 * k, r * 0.34 * k, 0, TAU); c.fill();
    c.fillStyle = '#1a0808'; c.beginPath(); c.ellipse(x, y + r * 0.1, r * 0.3, r * 0.17 * (0.6 + 0.4 * Math.abs(Math.sin(t * 0.04))), 0, 0, TAU); c.fill();
    c.fillStyle = '#ffd24a'; c.beginPath(); c.ellipse(x, y + r * 0.1, r * 0.08, r * 0.14, 0, 0, TAU); c.fill();
  };
  I.addRelic('heartrelic', { id: 'emberheartrelic', name: 'Heart of Emberdeep', rarity: 'legendary', color: '#ff5a3a', pack: V, unique: true, unlock: 'boss:emberheart', mods: { maxHp: 8, dmg: 0.1, speed: 0.05, regen: 4 },
    desc: 'You carry the thing that was beating beneath the world: +2 hearts, +10% damage, +5% speed, regeneration. (Unlockable)' });

  // ------------------------------------------------------------------ the ending
  ED.hook('roomClear', V, (g, room) => {
    const spec = g.rt && g.rt.bossSpec; if (room.type !== 'boss' || !spec || !spec.final) return;
    g.run.finalBoss = (g.run.finalBoss || 0) + 1; const M = ED.save.meta; M.endings = (M.endings || 0) + 1; ED.save.save();
    g.after(130, () => { g.modal = { type: 'ending', t: 0, floor: g.floorNum }; g.sfx('win'); });
  });
  ED.modalImpl.ending = {
    draw(g, c, m) {
      const UI = ED.ui, r = g.run; m.t++; const a = U.clamp(m.t / 50, 0, 1);
      c.fillStyle = 'rgba(8,2,2,' + 0.94 * a + ')'; c.fillRect(0, 0, C.W, C.H);
      c.save(); c.globalAlpha = a;
      ED.render.glow(c, C.W / 2, 150, 260, '#ff5a3a', 0.12 + 0.05 * Math.sin(m.t * 0.05));
      UI.shadow(c, 'THE HEART STILLS', C.W / 2, 120, 50, '#ff8a5a', 'center');
      const lines = ['For the first time in an age, the deep is silent.', 'Somewhere far above, a door you never found swings open onto daylight.', 'But the stairs still lead down — and something below has begun to hum your name.'];
      lines.forEach((l, i) => UI.text(c, l, C.W / 2, 180 + i * 26, 15, '#e8d0c0', 'center', false));
      const cls = I.CLASSES[r.classId];
      UI.panel(c, 250, 280, 460, 120, '#6a3a30', 0.85);
      UI.text(c, (cls ? cls.name : '?') + ' · floor ' + g.floorNum + ' · ' + UI.timeStr(r.frames) + ' · ' + r.kills + ' kills', C.W / 2, 312, 14, '#ffd0a0', 'center');
      UI.text(c, 'edition ' + (r.packs || ED.packs.stamp()) + (r.heatLevel ? ' · Heat ' + r.heatLevel : '') + ' · seed ' + r.seed, C.W / 2, 338, 12, '#a88a7a', 'center', false);
      UI.text(c, 'Endings reached: ' + ED.save.meta.endings, C.W / 2, 364, 12, '#a88a7a', 'center', false);
      if (m.t > 40) {
        UI.button(c, 'bank', 'Claim the true victory (end the run)', 250, 430, 460, 46, { size: 16, color: '#ffd24a', sub: 'score ' + ED.menus.score(g) });
        UI.button(c, 'abyss', 'Descend into the Abyss', 250, 486, 460, 46, { size: 16, color: '#ff5a3a', sub: 'the run continues — it only gets worse' });
      }
      c.restore();
    },
    update(g, m, act) {
      if (m.t < 40) return;
      if (act === 'bank') { g.modal = null; g.cashOut(); }
      else if (act === 'abyss') { g.modal = null; g.sfx('uiok'); g.toast('Into the Abyss...', '#ff5a3a', 160); }
    },
  };

  // ------------------------------------------------------------------ Abyssal Rules (floor 31+)
  const RULES = [
    { id: 'lightless', name: 'Lightless', desc: 'Every combat room is plunged into darkness.', roomEnter(g, room, rt) { if (room.type === 'normal') rt.dark = true; } },
    { id: 'bloodtide', name: 'Bloodtide', desc: 'Enemies heal when they hurt you.', spawn(g, e) { if (!e.boss && ED.mods.vampiric) e.mods.push(ED.mods.vampiric); } },
    { id: 'echoing', name: 'Echoing Fire', desc: 'Enemies fire faster and their shots fly quicker.', spawn(g, e) { if (!e.boss) { e.rate0 *= 1.3; e.rate = e.rate0; e.projMul *= 1.15; } } },
    { id: 'ironclad', name: 'Ironclad', desc: 'Every foe takes 20% less damage.', spawn(g, e) { if (!e.boss) e.armor = Math.max(e.armor || 0, 0.2); } },
    { id: 'quicksilver', name: 'Quicksilver', desc: 'Enemies move 20% faster.', spawn(g, e) { if (!e.boss) e.speed *= 1.2; } },
    { id: 'reinforced', name: 'Reinforced', desc: 'Fallen enemies have a 25% chance to leave an imp behind.', kill(g, e) { if (!e.boss && !e.minion && !e.noLoot && g.rng.chance(0.25)) g.spawnEnemy('imp', e.x, e.y, { minion: true, quick: true }); } },
    { id: 'stormborn', name: 'Stormborn', desc: 'Lightning is called down on you during fights.', tick(g, rt) {
      if (!rt.lockdown || g.room.type === 'boss' || g.room.type === 'miniboss') return; rt.abStorm = (rt.abStorm === undefined ? 140 : rt.abStorm) - 1;
      if (rt.abStorm <= 0) { rt.abStorm = 230; const p = g.player; g.zoneCircle(null, p.x + (p.vx || 0) * 16, p.y + (p.vy || 0) * 16, 36, g.tele(52), 2.0 * g.dif.enemyDmg, { color: '#ffe14a', burst: true }); } } },
    { id: 'withering', name: 'Withering', desc: 'Every room you clear costs you 2 HP (never lethal).', roomClear(g) { const p = g.player; p.hp = Math.max(1, p.hp - 2); g.addText(p.x, p.y - 20, '-2', '#9a6a9a', 14); } },
  ];
  const RULE = {}; for (const r of RULES) { r.pack = V; RULE[r.id] = r; }
  ED.abyss = { RULES, RULE, ruleFor: (seed, floor) => floor >= 31 ? RULES[new ED.RNG(seed + ':abyss' + floor).int(0, RULES.length - 1)] : null };
  P.track('rules', RULES);
  const cur = (g) => g.floor && g.floor.abyss;
  ED.hook('floorStart', V, (g) => { g.floor.abyss = ED.abyss.ruleFor(g.run.seed, g.floorNum); if (g.floor.abyss) g.run.abyssFloors = (g.run.abyssFloors || 0) + 1; });
  ED.hook('spawn', V, (g, e) => { const r = cur(g); if (r && r.spawn) r.spawn(g, e); });
  ED.hook('roomEnter', V, (g, room) => { const r = cur(g); if (r && r.roomEnter && !g.rt.abDone) { g.rt.abDone = true; r.roomEnter(g, room, g.rt); } });
  ED.hook('kill', V, (g, e) => { const r = cur(g); if (r && r.kill) r.kill(g, e); });
  ED.hook('tick', V, (g) => { const r = cur(g); if (r && r.tick && g.rt) r.tick(g, g.rt); });
  ED.hook('roomClear', V, (g, room) => {
    const r = cur(g); if (!r || room.type === 'start') return;
    if (r.roomClear) r.roomClear(g);
    const gold = 14 + Math.round(g.floorNum * 0.6); g.dropGold(480, 300, gold);                    // the Abyss pays
  });
  ED.hook('intro', V, (g, c) => { const r = cur(g); if (!r) return; ED.ui.shadow(c, '☠ ABYSSAL RULE: ' + r.name.toUpperCase(), C.W / 2, 408, 16, '#ff5a3a', 'center'); ED.ui.text(c, r.desc + '  (+gold from every room)', C.W / 2, 430, 12, '#e8b0a0', 'center', false); });
  ED.hook('hud', V, (g, c) => { const r = cur(g); if (r) ED.ui.text(c, '☠ ' + r.name, 818, 63, 9, '#ff5a3a', 'left', false); });
  ED.hook('floorStart', V, (g) => { if (g.floorNum % 50 === 0) g.after(30, () => g.toast('Something enormous stirs beneath this floor...', '#ff5a3a', 200)); });
})(typeof globalThis !== 'undefined' ? globalThis : this);

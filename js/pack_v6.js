/* EMBERDEEP — pack_v6.js : v6 "HEAT" — make every run yours.
 *
 *  PACTS OF HEAT : 13 optional, clearly-worded difficulty rules chosen before a run.  Each adds Heat; Heat multiplies your score
 *                  and the Embers you earn.  The Daily Descent comes with two fixed pacts.
 *  EMBERS        : a permanent currency earned from every run (deeper, more bosses, more Heat = more).
 *  THE HEARTH    : spend Embers on small permanent upgrades (hearts, damage, luck, starting gold, a Phoenix start...).
 *  RUN RECORDS   : the last 20 runs with edition, class, Heat, floor, score and what killed you — handy for comparing versions.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, D = ED.D, I = ED.items, P = ED.packs;
  const V = 'v6';

  P.define({
    id: 'v6', name: 'HEAT', tag: 'your difficulty, permanent progress', color: '#ffb04a',
    blurb: 'Opt-in Pacts of Heat, a permanent Embers currency and the Hearth, fixed pacts on the Daily Descent, and a record of your last 20 runs.',
  });
  const meta = () => { const m = ED.save.meta; if (!Array.isArray(m.heat)) m.heat = []; if (typeof m.embers !== 'number') m.embers = 0; if (!m.hearth) m.hearth = {}; if (!Array.isArray(m.history)) m.history = []; return m; };

  // ------------------------------------------------------------------ pacts
  const PACTS = [
    { id: 'brutish', name: 'Brutish Foes', heat: 2, desc: 'Enemies have 25% more HP.', dif(d) { d.enemyHp *= 1.25; } },
    { id: 'vicious', name: 'Vicious Foes', heat: 2, desc: 'Enemies hit 30% harder.', dif(d) { d.enemyDmg *= 1.3; } },
    { id: 'swift', name: 'Swift Foes', heat: 2, desc: 'Enemies and their bullets move 12% faster.', dif(d) { d.enemySpeed *= 1.12; d.projSpeed *= 1.12; } },
    { id: 'impatient', name: 'Impatient Foes', heat: 2, desc: 'Telegraphs give you 20% less warning.', dif(d) { d.telegraph = Math.max(0.35, d.telegraph * 0.8); } },
    { id: 'elitetide', name: 'Elite Tide', heat: 2, desc: '+12% chance for any foe to be an elite.', dif(d) { d.eliteChance = Math.min(0.75, d.eliteChance + 0.12); } },
    { id: 'swarm', name: 'The Swarm', heat: 2, desc: '25% more enemies in every wave.', dif(d) { d.spawnBudget *= 1.25; } },
    { id: 'titan', name: "Titan's Pride", heat: 2, desc: 'Bosses and mini bosses have 25% more HP.', dif(d) { d.bossHp *= 1.25; d.miniHp *= 1.25; } },
    { id: 'austerity', name: 'Austerity', heat: 1, desc: 'You find 30% less gold.', dif(d) { d.goldMult *= 0.7; } },
    { id: 'inflation', name: 'Inflation', heat: 1, desc: 'Shop and blacksmith prices are 30% higher.', dif(d) { d.priceMult *= 1.3; } },
    { id: 'haunted', name: 'Haunted Halls', heat: 1, desc: 'Half of all combat rooms are plunged into darkness.' },
    { id: 'fragile', name: 'Fragile', heat: 2, desc: 'Begin with two fewer hearts.', start(g) { g.player.buffs.push({ name: 'Fragile', mods: { maxHp: -8 } }); } },
    { id: 'glass', name: 'Glass Soul', heat: 3, desc: 'Deal 30% more damage — and take double.', start(g) { g.player.buffs.push({ name: 'Glass Soul', mods: { dmg: 0.3, dmgTaken: 1.0 } }); } },
    { id: 'cursed', name: 'Cursed Start', heat: 1, desc: 'Begin the run under a random curse.', start(g) { const cs = [{ name: 'Brittle Bones', mods: { dmgTaken: 0.15 }, desc: '+15% damage taken' }, { name: 'Dull Edge', mods: { dmg: -0.1 }, desc: '-10% damage' }, { name: 'Heavy Limbs', mods: { speed: -0.08 }, desc: '-8% speed' }]; g.player.curses.push(Object.assign({}, new ED.RNG(g.run.seed + ':curse').pick(cs))); } },
  ];
  const BY_ID = {}; for (const p of PACTS) { p.pack = V; BY_ID[p.id] = p; }
  const heatOf = (ids) => ids.reduce((s, id) => s + (BY_ID[id] ? BY_ID[id].heat : 0), 0);

  let active = [], memo = new WeakMap();
  const H = ED.heat = {
    PACTS, BY_ID, heatOf,
    setActive(ids) { active = ids.filter(id => BY_ID[id]); memo = new WeakMap(); },
    ids() { return active.slice(); },
    live() { return active.length > 0; },
    has(id) { return active.includes(id); },
    /** a heated COPY of a floor's difficulty row (never mutates the cached base row) */
    apply(o) {
      let r = memo.get(o); if (r) return r;
      r = Object.assign({}, o);
      for (const id of active) if (BY_ID[id].dif) BY_ID[id].dif(r);
      r.hp = r.enemyHp; r.dmg = r.enemyDmg; r.speed = r.enemySpeed; r.tele = r.telegraph; r.pressure = Math.min(3.2, r.fireRate * r.projSpeed);
      r.composite = Math.sqrt(r.enemyHp * r.enemyDmg) * Math.sqrt(r.enemySpeed); r.danger = Math.max(1, Math.round(r.composite * 4 - 3) + Math.floor(heatOf(active) / 2));
      r.dangerName = D.dangerName(r.danger); r.dangerColor = D.dangerColor(r.danger);
      memo.set(o, r); return r;
    },
    /** which pacts a run on this seed uses: the Daily Descent has fixed pacts, everything else uses your selection */
    forSeed(seed) { return seed === ED.dailySeed() ? H.dailyPacts(seed) : meta().heat.filter(id => BY_ID[id]); },
    dailyPacts(seed) { const r = new ED.RNG(seed + ':pacts'), pool = PACTS.filter(p => p.id !== 'cursed'), out = []; while (out.length < 2) { const p = r.pick(pool); if (!out.includes(p.id)) out.push(p.id); } return out; },
    toggle(id) { const m = meta(), i = m.heat.indexOf(id); if (i >= 0) m.heat.splice(i, 1); else if (BY_ID[id]) m.heat.push(id); ED.save.save(); },
    scoreMul(h) { return 1 + 0.1 * h; }, emberMul(h) { return 1 + 0.15 * h; },
  };
  P.track('heat', PACTS);

  // ------------------------------------------------------------------ the Hearth
  const UPG = [
    { id: 'hearts', name: 'Tempered Hearts', max: 6, base: 25, desc: l => '+' + l + ' max HP (quarter hearts)', mods: l => ({ maxHp: l }) },
    { id: 'purse', name: 'Deeper Pockets', max: 5, base: 20, desc: l => 'Start with +' + 15 * l + ' gold' },
    { id: 'satchel', name: 'Bomb Satchel', max: 3, base: 30, desc: l => 'Start with +' + l + ' bomb' + (l > 1 ? 's' : '') },
    { id: 'edge', name: 'Keen Edge', max: 5, base: 35, desc: l => '+' + 3 * l + '% damage', mods: l => ({ dmg: 0.03 * l }) },
    { id: 'boots', name: 'Fleet Boots', max: 4, base: 35, desc: l => '+' + (2.5 * l) + '% move speed', mods: l => ({ speed: 0.025 * l }) },
    { id: 'eye', name: "Scavenger's Eye", max: 3, base: 45, desc: l => '+' + l + ' luck (better loot)', mods: l => ({ luck: l }) },
    { id: 'ward', name: 'Ember Ward', max: 3, base: 60, desc: l => '+' + l + ' defense', mods: l => ({ def: l }) },
    { id: 'key', name: "Wayfinder's Key", max: 1, base: 350, desc: () => 'Start with the Skeleton Key: a free Small Key every floor', relic: 'skeletonkey' },
    { id: 'phoenix', name: 'Ember Heart', max: 1, base: 600, desc: () => 'Start every run with the Phoenix Feather (one free revival)', relic: 'phoenix' },
  ];
  const cost = (u, l) => Math.round(u.base * (1 + 0.55 * l) / 5) * 5;
  ED.hearth = { UPG, cost, level: id => meta().hearth[id] || 0 };

  // ------------------------------------------------------------------ run lifecycle
  ED.hook('runStart', V, (g) => {
    const p = g.player, m = meta(), ids = H.forSeed(g.run.seed);
    H.setActive(ids); const heat = heatOf(ids);
    g.run.heat = ids; g.run.heatLevel = heat; g.run.heatMul = H.scoreMul(heat); g.run.daily = g.run.seed === ED.dailySeed();
    for (const id of ids) if (BY_ID[id].start) BY_ID[id].start(g);
    const mods = {};
    for (const u of UPG) {
      const l = m.hearth[u.id] || 0; if (!l) continue;
      if (u.mods) for (const k in u.mods(l)) mods[k] = (mods[k] || 0) + u.mods(l)[k];
      if (u.id === 'purse') p.gold += 15 * l; if (u.id === 'satchel') p.bombs += l;
      if (u.relic) p.relics[u.relic] = 1;
    }
    if (Object.keys(mods).length) p.buffs.push({ name: 'The Hearth', mods, hearth: true });
    I.recalc(p); p.hp = p.maxHp;
    if (heat) g.toast((g.run.daily ? 'DAILY PACTS' : 'HEAT ' + heat) + ' — ' + ids.map(i => BY_ID[i].name).join(', '), '#ffb04a', 300);
  });
  ED.hook('roomEnter', V, (g, room) => {
    if (!H.has('haunted') || room.type !== 'normal' || g.rt.heatDone) return; g.rt.heatDone = true;
    if (g.rt.rng.fork('heatdark').chance(0.5)) g.rt.dark = true;
  });
  ED.hook('runEnd', V, (g, victory) => {
    const r = g.run, m = meta(), h = r.heatLevel || 0;
    let e = r.floorNum * 3 + r.bossesKilled.length * 12 + r.minisKilled.length * 4 + (victory ? 60 : 0) + Math.floor(r.kills / 25);
    e = Math.max(r.floorNum > 1 ? 1 : 0, Math.round(e * H.emberMul(h) * (r.daily ? 1.25 : 1)));
    r.embers = e; m.embers += e; m.emberTotal = (m.emberTotal || 0) + e;
    m.history.unshift({ seed: r.seed, cls: r.classId, floor: r.floorNum, kills: r.kills, score: ED.menus.score(g), packs: r.packs, heat: h, victory: !!victory, killedBy: victory ? '' : (r.killedBy || '?'), embers: e, daily: !!r.daily });
    if (m.history.length > 20) m.history.length = 20;
    ED.save.save(); H.setActive([]);
  });

  // ------------------------------------------------------------------ screens
  const UI = () => ED.ui;
  ED.hook('titleUI', V, (g, c) => {
    const m = meta();
    UI().button(c, 'hearth', 'THE HEARTH  ·  ✦ ' + m.embers + ' embers', C.W - 262, 58, 246, 32, { size: 12, color: '#ffb04a' });
    UI().button(c, 'records', 'RUN RECORDS', C.W - 262, 96, 246, 32, { size: 12, color: '#9ad0ff' });
  });
  ED.hook('selectUI', V, (g, c) => {
    const ids = H.forSeed(ED.normalizeSeed(UI().seedText || 'x')), daily = ED.normalizeSeed(UI().seedText || 'x') === ED.dailySeed(), h = heatOf(ids);
    UI().button(c, 'heat', daily ? 'DAILY PACTS' : 'PACTS OF HEAT: ' + h, 90, 484, 210, 44, { size: 14, color: '#ffb04a', disabled: daily });
    if (ids.length) UI().text(c, (daily ? 'Daily pacts: ' : 'Active: ') + ids.map(i => BY_ID[i].name).join(' · ') + '   (score x' + H.scoreMul(h).toFixed(1) + ', embers x' + H.emberMul(h).toFixed(2) + ')', 90, 470, 11, '#ffb04a', 'left', false);
  });
  ED.hook('endUI', V, (g, c) => { const r = g.run; if (r.embers !== undefined) UI().text(c, '✦ +' + r.embers + ' embers' + (r.heatLevel ? '  (Heat ' + r.heatLevel + ')' : '') + (r.daily ? '  (Daily x1.25)' : '') + '   ·   banked ' + meta().embers, C.W / 2, 466, 13, '#ffb04a', 'center'); });

  ED.sceneImpl.heat = {
    draw(g, c) {
      const m = meta(), h = heatOf(m.heat), u = UI();
      u.shadow(c, 'PACTS OF HEAT', C.W / 2, 56, 32, '#ffb04a', 'center');
      u.text(c, 'Opt-in difficulty. Each pact adds Heat; Heat raises your score and the Embers you earn. (The Daily Descent ignores this and uses its own two.)', C.W / 2, 80, 11, '#a8a8c8', 'center', false);
      PACTS.forEach((p, i) => {
        const col = i % 2, row = Math.floor(i / 2), x = 56 + col * 440, y = 100 + row * 62, on = m.heat.includes(p.id);
        u.button(c, 'pact:' + p.id, '', x, y, 420, 56, { color: on ? '#ffb04a' : '#5a5a80', selected: on });
        c.fillStyle = on ? '#ffb04a' : '#2a2a3c'; c.fillRect(x + 12, y + 16, 22, 22); c.strokeStyle = '#10101c'; c.strokeRect(x + 12, y + 16, 22, 22); if (on) { c.fillStyle = '#10101c'; c.fillRect(x + 17, y + 21, 12, 12); }
        u.text(c, p.name, x + 46, y + 22, 14, on ? '#ffd8a0' : '#e0e0f0'); u.text(c, '+' + p.heat + ' Heat', x + 404, y + 22, 12, '#ff8a5a', 'right');
        u.text(c, p.desc, x + 46, y + 42, 11, on ? '#e8d0b0' : '#9a9ab8', 'left', false);
      });
      u.panel(c, 56, 532, 420, 40, '#ffb04a', 0.8); u.text(c, 'HEAT ' + h + '   ·   score x' + H.scoreMul(h).toFixed(1) + '   ·   embers x' + H.emberMul(h).toFixed(2), 266, 557, 14, '#ffb04a', 'center');
      u.button(c, 'clear', 'Clear all', 496, 532, 160, 40, { size: 13 }); u.button(c, 'back', 'Done', 676, 532, 228, 40, { size: 14, color: '#6ee07a' });
    },
    update(g, a, inp) {
      if (a === 'back' || inp.consume('back')) { ED.menus.go(g, 'select'); return; }
      if (a === 'clear') { meta().heat = []; ED.save.save(); g.sfx('uiback'); }
      else if (a && a.indexOf('pact:') === 0) { H.toggle(a.slice(5)); g.sfx('ui'); }
    },
  };
  ED.sceneImpl.hearth = {
    draw(g, c) {
      const m = meta(), u = UI();
      u.shadow(c, 'THE HEARTH', C.W / 2, 52, 34, '#ffb04a', 'center');
      u.text(c, 'Spend Embers on permanent upgrades. Every run earns more.', C.W / 2, 76, 12, '#a8a8c8', 'center', false);
      u.text(c, '✦ ' + m.embers + ' embers', C.W - 70, 52, 20, '#ffb04a', 'right');
      UPG.forEach((up, i) => {
        const y = 92 + i * 54, l = m.hearth[up.id] || 0, maxed = l >= up.max, cst = cost(up, l), ok = !maxed && m.embers >= cst;
        u.button(c, 'buy:' + up.id, '', 70, y, 820, 48, { color: '#ffb04a', disabled: !ok });
        u.text(c, up.name, 90, y + 22, 15, maxed ? '#6ee07a' : ok ? '#ffffff' : '#8a8aa0');
        u.text(c, l ? up.desc(l) + (maxed ? '' : '   →   next: ' + up.desc(l + 1)) : 'next: ' + up.desc(1), 90, y + 39, 11, '#a8a8c8', 'left', false);
        for (let k = 0; k < up.max; k++) { c.fillStyle = k < l ? '#ffb04a' : '#2a2a3c'; c.fillRect(640 + k * 16, y + 16, 12, 14); }
        u.text(c, maxed ? 'MAX' : '✦ ' + cst, 872, y + 29, 14, maxed ? '#6ee07a' : ok ? '#ffb04a' : '#6a6a80', 'right');
      });
      u.button(c, 'back', 'Back', C.W / 2 - 100, 584, 200, 38, { size: 14 });
    },
    update(g, a, inp) {
      if (a === 'back' || inp.consume('back')) { ED.menus.go(g, 'title'); return; }
      if (a && a.indexOf('buy:') === 0) {
        const up = UPG.find(x => x.id === a.slice(4)), m = meta(), l = m.hearth[up.id] || 0;
        if (l >= up.max || m.embers < cost(up, l)) { g.sfx('deny'); return; }
        m.embers -= cost(up, l); m.hearth[up.id] = l + 1; ED.save.save(); g.sfx('levelup');
      }
    },
  };
  ED.sceneImpl.records = {
    draw(g, c) {
      const m = meta(), u = UI(), cols = [['#', 60], ['EDITION', 100], ['CLASS', 190], ['HEAT', 300], ['FLOOR', 360], ['SCORE', 430], ['EMBERS', 520], ['RESULT', 600]];
      u.shadow(c, 'RUN RECORDS', C.W / 2, 56, 32, '#9ad0ff', 'center');
      u.text(c, 'Your last 20 runs — compare editions, classes and Heat.', C.W / 2, 78, 12, '#a8a8c8', 'center', false);
      cols.forEach(cl => u.text(c, cl[0], cl[1], 112, 11, '#7a7a98'));
      if (!m.history.length) u.text(c, 'No runs yet. Go make some history.', C.W / 2, 300, 16, '#6a6a88', 'center', false);
      m.history.forEach((h, i) => {
        const y = 134 + i * 22, cl = I.CLASSES[h.cls] || { name: h.cls, color: '#fff' };
        if (i % 2) { c.fillStyle = 'rgba(255,255,255,0.03)'; c.fillRect(50, y - 14, 860, 22); }
        u.text(c, String(i + 1), 60, y, 12, '#8a8aa8', 'left', false); u.text(c, h.packs || 'v1', 100, y, 12, '#7fd8ff', 'left', false);
        u.text(c, cl.name + (h.daily ? ' ☼' : ''), 190, y, 12, cl.color, 'left', false); u.text(c, h.heat ? String(h.heat) : '—', 300, y, 12, h.heat ? '#ff8a5a' : '#6a6a88', 'left', false);
        u.text(c, String(h.floor), 360, y, 12, '#ffd24a'); u.text(c, String(h.score), 430, y, 12, '#e0e0f0', 'left', false); u.text(c, '+' + (h.embers || 0), 520, y, 12, '#ffb04a', 'left', false);
        u.text(c, h.victory ? 'VICTORY' : 'slain by ' + String(h.killedBy || '?').slice(0, 24), 600, y, 12, h.victory ? '#6ee07a' : '#c8a0a0', 'left', false);
      });
      u.button(c, 'back', 'Back', C.W / 2 - 100, 592, 200, 34, { size: 14 });
    },
    update(g, a, inp) { if (a === 'back' || inp.consume('back')) ED.menus.go(g, 'title'); },
  };
  // ------------------------------------------------------------------ polished layouts (v23 POLISH): the same ids and update() as above, a calmer page; drawn instead of the classic ones while ED.skin.on()
  const SK = ED.skin.screens = ED.skin.screens || {};
  SK.hearth = function (g, c) {
    const K = ED.skin.kit, COL = K.COL, u = UI(), m = meta();
    K.head(c, 'THE HEARTH', { y: 50, color: COL.ember, rule: 260, sub: 'Spend embers on permanent upgrades. Every run earns more.' });
    K.chip(c, 912, 22, '✦ ' + m.embers + ' embers', COL.ember, { align: 'right', size: 17, h: 34 });
    UPG.forEach((up, i) => {
      const x = 48 + (i < 5 ? 0 : 440), y = 126 + (i % 5) * 96, l = m.hearth[up.id] || 0, maxed = l >= up.max, cst = cost(up, l), ok = !maxed && m.embers >= cst;
      u.button(c, 'buy:' + up.id, '', x, y, 424, 86, { color: COL.ember, disabled: !ok });
      u.text(c, K.fit(c, up.name, 18, 270, true), x + 20, y + 30, 18, maxed ? COL.green : ok ? '#ffffff' : '#8a8aa2', 'left');
      if (maxed) K.chip(c, x + 408, y + 12, 'MAX', COL.green, { align: 'right' }); else K.chip(c, x + 408, y + 12, '✦ ' + cst, ok ? COL.ember : COL.dim, { align: 'right', solid: ok });
      for (let k = 0; k < up.max; k++) { K.rr(c, x + 20 + k * 17, y + 42, 13, 10, 3); c.fillStyle = k < l ? COL.ember : 'rgba(255,255,255,0.12)'; c.fill(); }
      const now = l ? up.desc(l) : '', nxt = maxed ? '' : up.desc(l + 1);
      let line = maxed ? now : l ? now + '  →  ' + nxt : 'next: ' + nxt; c.font = '14px ' + K.FONT; if (c.measureText(line).width > 386) line = maxed ? now : 'next: ' + nxt;
      K.text(c, K.fit(c, line, 14, 386, false), x + 20, y + 74, 14, maxed ? '#9ad8a8' : COL.text);
    });
    K.back(c, 'back', 'Back');
  };
  SK.records = function (g, c) {
    const K = ED.skin.kit, COL = K.COL, u = UI(), m = meta(), cols = [['#', 52], ['EDITION', 90], ['CLASS', 214], ['HEAT', 352], ['FLOOR', 424], ['SCORE', 504], ['EMBERS', 618], ['RESULT', 714]];
    K.head(c, 'RUN RECORDS', { y: 50, color: '#9ad0ff', rule: 260, sub: 'Your last 20 runs — compare editions, classes and Heat.' });
    cols.forEach(cl => u.text(c, cl[0], cl[1], 142, 13, COL.mute, 'left', true)); K.rule(c, 48, 152, 864);
    if (!m.history.length) K.text(c, 'No runs yet. Go make some history.', C.W / 2, 330, 20, COL.dim, 'center');
    m.history.forEach((h, i) => {
      const y = 178 + i * 22, cl = I.CLASSES[h.cls] || { name: h.cls, color: '#fff' };
      if (i % 2 === 0) { c.fillStyle = 'rgba(255,255,255,0.035)'; c.fillRect(44, y - 16, 872, 22); }
      K.text(c, String(i + 1), 52, y, 14, COL.dim); K.text(c, K.fit(c, h.packs || 'v1', 14, 116, false), 90, y, 14, COL.cyan);
      u.text(c, K.fit(c, cl.name + (h.daily ? ' ☼' : ''), 14, 130, true), 214, y, 14, cl.color, 'left'); K.text(c, h.heat ? String(h.heat) : '—', 352, y, 14, h.heat ? '#ff8a5a' : COL.dim);
      u.text(c, String(h.floor), 424, y, 14, COL.gold, 'left'); K.text(c, String(h.score), 504, y, 14, COL.ink); K.text(c, '+' + (h.embers || 0), 618, y, 14, COL.ember);
      K.text(c, K.fit(c, h.victory ? 'VICTORY' : 'slain by ' + String(h.killedBy || '?'), 14, 196, false), 714, y, 14, h.victory ? COL.green : '#d0a8a8');
    });
    K.back(c, 'back', 'Back');
  };
  SK.heat = function (g, c) {
    const K = ED.skin.kit, COL = K.COL, u = UI(), m = meta(), h = heatOf(m.heat);
    K.head(c, 'PACTS OF HEAT', { y: 50, color: COL.ember, rule: 260, sub: 'Each pact adds Heat; Heat raises your score and the embers you earn.' });
    PACTS.forEach((p, i) => {
      const x = 48 + (i % 2) * 440, y = 118 + Math.floor(i / 2) * 64, on = m.heat.includes(p.id);
      u.button(c, 'pact:' + p.id, '', x, y, 424, 56, { color: COL.ember, selected: false, ghost: !on });
      K.rr(c, x + 16, y + 17, 22, 22, 6); c.fillStyle = on ? COL.ember : 'rgba(255,255,255,0.1)'; c.fill(); if (on) { c.strokeStyle = '#1a1020'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 21, y + 28); c.lineTo(x + 26, y + 33); c.lineTo(x + 34, y + 22); c.stroke(); }
      u.text(c, K.fit(c, p.name, 16, 250, true), x + 52, y + 24, 16, on ? '#ffe0b0' : '#e8e8f8', 'left'); K.chip(c, x + 408, y + 7, '+' + p.heat + ' Heat', '#ff8a5a', { align: 'right', size: 13, h: 22 });
      K.text(c, K.fit(c, p.desc, 13, 354, false), x + 52, y + 46, 13, on ? '#ecd8bc' : COL.mute);
    });
    const by = 574; K.glass(c, 48, by, 424, 52, { a: 0.8, accent: COL.ember, shadow: false });
    K.segs(c, 260, by + 32, [['HEAT ' + h, COL.ember, true], ['score x' + H.scoreMul(h).toFixed(1), COL.text, false], ['embers x' + H.emberMul(h).toFixed(2), COL.text, false]], 15);
    u.button(c, 'clear', 'Clear all', 488, by, 150, 52, { size: 15, color: COL.red }); u.button(c, 'back', 'Done', 652, by, 260, 52, { size: 18, color: COL.green, primary: true });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* EMBERDEEP — pack_v12.js : v12 "TALENTS" — your class grows as you do.
 *
 *  After every floor boss you choose ONE of three TALENTS from your class's list (six per class, 66 in all).  A talent is a small, permanent,
 *  clearly-worded upgrade in the spirit of the class: harder skin for the Knight, deeper reach for the Lancer, venom for the Rogue, a larger
 *  host for the Necromancer.  About a fifth do something rather than just add a number (a shockwave when you are hit, a heal every few kills...).
 *  Talents are hidden relics, so every stat and hook path just works — they never drop from chests and never show in the relic grid; the pause
 *  screen lists them and the end screen recaps them.  Which three you are offered is seeded (same seed, same floor, same offer).
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v12';

  P.define({
    id: 'v12', name: 'TALENTS', tag: 'a class talent after every boss', color: '#8ae0ff',
    blurb: 'Beat a floor boss and choose one of three talents from your class (six per class, 66 in all): tougher skin, deeper reach, venom, a bigger host of thralls — and a few that act, like a shockwave when you are hit.',
  });

  // ------------------------------------------------------------------ helpers for the behaviours
  const nth = (id, n, fn) => function (g, p, e, a, b) { const c = p.tc || (p.tc = {}); c[id] = (c[id] || 0) + 1; if (c[id] >= n) { c[id] = 0; fn(g, p, e, a, b); } };
  const shock = (g, x, y, r, dmg, col) => g.zoneEnemies(x, y, r, Math.max(2, dmg), { speed: 7.5, color: col });
  const heal = (g, n) => g.healPlayer(n);
  const guardUp = (g, p) => { p.guard = (p.guard || 0) + 1; };

  // ------------------------------------------------------------------ the talents
  const TALENTS = [], BY_KEY = {}, TRACK = [];
  /** T(class, id, name, description, definition): `mods` are stats, `on` are relic hooks, `from` = first floor it can be offered on */
  function T(cls, id, name, desc, def) {
    const key = 'tal_' + cls + '_' + id;
    const d = Object.assign({ id: key, key, cls, tid: id, name, desc, color: (I.CLASSES[cls] || { color: '#8ae0ff' }).color, rarity: 'epic', hidden: true, passive: true, talent: true, unique: true, pack: V, mods: {}, from: 1 }, def || {});
    I.addRelic(key, d); TALENTS.push(d); BY_KEY[key] = d; TRACK.push({ id: key, pack: V });
  }
  // ---- Knight: sturdy, balanced
  T('knight', 'resolve', 'Iron Resolve', '+2 defense.', { mods: { def: 2 } });
  T('knight', 'stalwart', 'Stalwart', '+1 heart container.', { mods: { maxHp: 4 } });
  T('knight', 'valor', 'Valor', '+8% damage and +4% attack speed.', { mods: { dmg: 0.08, atkSpd: 0.04 } });
  T('knight', 'riposte', 'Riposte', 'When you are hurt, a shockwave shoves foes away (at most every 2s).', { from: 2, on: { hurt(g, p) { if (g.frame - (p.ripT === undefined ? -999 : p.ripT) > 120) { p.ripT = g.frame; shock(g, p.x, p.y, 95, p.wdmg * 1.1, '#a8c8ff'); g.sfx('block'); } } } });
  T('knight', 'cleave', 'Cleaving Arc', 'Every 4th hit sends a shockwave through nearby foes.', { from: 2, on: { hit: nth('cleave', 4, (g, p, e, dmg) => shock(g, e.x, e.y, 75, dmg * 0.8, '#cfe0ff')) } });
  T('knight', 'wall', 'Shield Wall', 'Every room you enter, you begin with a Guard that blocks one hit.', { from: 3, on: { enter(g, p) { p.guard = Math.max(p.guard || 0, 1); } } });
  // ---- Lancer: reach and finesse
  T('lancer', 'reach', 'Long Reach', '+12% range.', { mods: { range: 0.12 } });
  T('lancer', 'skewer', 'Skewer', 'Your strikes pierce one more foe.', { mods: { pierce: 1 } });
  T('lancer', 'phase', 'Phase Step', 'Dash and active recharge 15% / 10% faster.', { mods: { dashCd: -0.15, activeCd: -0.1 } });
  T('lancer', 'impale', "Impaler's Eye", '+8% crit chance.', { mods: { crit: 0.08 } });
  T('lancer', 'focus', "Duelist's Focus", '+25% damage against foes at full health.', { mods: { opener: 0.25 } });
  T('lancer', 'sweep', 'Whirling Retreat', 'Dashing sweeps a ring of force around you.', { from: 3, on: { dash(g, p) { shock(g, p.x, p.y, 80, p.wdmg * 0.7, '#ffe9a8'); } } });
  // ---- Brute: slow and massive
  T('brute', 'hide', 'Thick Hide', 'Take 10% less damage.', { mods: { dmgTaken: -0.1 } });
  T('brute', 'heart', "Giant's Heart", '+2 heart containers.', { mods: { maxHp: 8 } });
  T('brute', 'rage', 'Rage', '+12% damage.', { mods: { dmg: 0.12 } });
  T('brute', 'keg', 'Keg Mastery', '+15% explosion chance on hit; active recharges 15% faster.', { mods: { explode: 0.15, activeCd: -0.15 } });
  T('brute', 'aftershock', 'Aftershock', 'Every 3rd hit sends out a shockwave.', { from: 2, on: { hit: nth('after', 3, (g, p, e, dmg) => shock(g, e.x, e.y, 85, dmg * 0.9, '#ffb070')) } });
  T('brute', 'bloodlust', 'Bloodlust', 'Every 6th kill heals half a heart.', { from: 2, on: { kill: nth('lust', 6, (g) => heal(g, 2)) } });
  // ---- Rogue: fragile and fast
  T('rogue', 'nimble', 'Nimble', 'Dash recharges 15% faster; +4% move speed.', { mods: { dashCd: -0.15, speed: 0.04 } });
  T('rogue', 'venom', 'Venomed Blades', '+20% chance to poison on hit.', { mods: { poison: 0.2 } });
  T('rogue', 'backstab', 'Backstab', '+35% damage against foes at full health.', { mods: { opener: 0.35 } });
  T('rogue', 'edge', "Assassin's Edge", '+10% crit chance, crits hit 30% harder.', { mods: { crit: 0.1, critMult: 0.3 } });
  T('rogue', 'veil', 'Shadow Veil', 'Longer invulnerability while dashing.', { mods: { dashI: 6 } });
  T('rogue', 'pickpocket', 'Pickpocket', '15% of kills drop a little extra gold.', { from: 2, on: { kill(g, p) { if (g.rng.chance(0.15)) g.giveGold(2 + Math.floor(g.floorNum / 2)); } } });
  // ---- Ranger: kites from afar
  T('ranger', 'quiver', 'Deep Quiver', 'Fire one extra projectile.', { mods: { proj: 1 } });
  T('ranger', 'pierce', 'Piercing Shot', 'Your shots pierce one more foe.', { mods: { pierce: 1 } });
  T('ranger', 'eagle', 'Eagle Eye', '+8% crit chance and +10% range.', { mods: { crit: 0.08, range: 0.1 } });
  T('ranger', 'fleet', 'Fleet-footed', '+8% move speed.', { mods: { speed: 0.08 } });
  T('ranger', 'wind', 'Windrunner', '+10% attack speed.', { mods: { atkSpd: 0.1 } });
  T('ranger', 'mark', "Hunter's Mark", '10% chance on hit to mark a foe: it takes 25% more damage for 5s.', { from: 2, on: { hit(g, p, e) { if (g.rng.chance(0.1)) g.applyStatus(e, 'hex', { t: 300 }); } } });
  // ---- Mage: arcane glass cannon
  T('mage', 'surge', 'Arcane Surge', 'Your active recharges 20% faster.', { mods: { activeCd: -0.2 } });
  T('mage', 'kindle', 'Kindling', '+20% chance to ignite on hit.', { mods: { burn: 0.2 } });
  T('mage', 'static', 'Static Charge', '+15% chance to chain lightning on hit.', { mods: { chain: 0.15 } });
  T('mage', 'frost', 'Frostbite', '+20% chance to chill on hit.', { mods: { freeze: 0.2 } });
  T('mage', 'over', 'Overcharge', '+10% damage.', { mods: { dmg: 0.1 } });
  T('mage', 'recover', 'Recovery', 'Clearing a room heals half a heart.', { from: 2, on: { clear(g) { heal(g, 2); } } });
  // ---- Trickster: fancy footwork
  T('trickster', 'twin', 'Twin Throw', 'Throw one extra boomerang.', { mods: { proj: 1 } });
  T('trickster', 'ricochet', 'Ricochet', 'Your throws pierce two more foes.', { mods: { pierce: 2 } });
  T('trickster', 'sleight', 'Sleight of Hand', 'Dash recharges 15% faster, with longer i-frames.', { mods: { dashCd: -0.15, dashI: 4 } });
  T('trickster', 'lucky', 'Lucky Break', '+2 luck and +10% gold.', { mods: { luck: 2, gold: 0.1 } });
  T('trickster', 'dilate', 'Time Dilation', 'Your active recharges 20% faster.', { mods: { activeCd: -0.2 } });
  T('trickster', 'quickdraw', 'Quickdraw', 'Dashing instantly readies your next attack.', { from: 2, on: { dash(g, p) { p.atkCd = 0; } } });
  // ---- Necromancer: commands the fallen
  T('necromancer', 'host', 'A Larger Host', 'Command one more thrall at a time.', { mods: { thrall: 1 } });
  T('necromancer', 'raise', 'Quick Raise', '+10% chance for a kill to raise a thrall.', { mods: { raise: 0.1 } });
  T('necromancer', 'bone', 'Bone Armor', '+2 defense.', { mods: { def: 2 } });
  T('necromancer', 'embrace', "Death's Embrace", '+4% chance to heal on hit.', { mods: { lifesteal: 0.04 } });
  T('necromancer', 'pact', 'Dark Pact', '+15% damage, but take 10% more.', { mods: { dmg: 0.15, dmgTaken: 0.1 } });
  T('necromancer', 'harvest', 'Soul Harvest', 'Every 8th kill heals half a heart.', { from: 2, on: { kill: nth('harvest', 8, (g) => heal(g, 2)) } });
  // ---- Alchemist: reactive brews
  T('alchemist', 'mix', 'Volatile Mix', '+12% chance to explode on hit.', { mods: { explode: 0.12 } });
  T('alchemist', 'brewer', 'Thorough Brewer', '+10% ignite, poison and chill chance.', { mods: { burn: 0.1, poison: 0.1, freeze: 0.1 } });
  T('alchemist', 'scav', 'Scavenger', '+1 luck and +15% gold.', { mods: { luck: 1, gold: 0.15 } });
  T('alchemist', 'hands', 'Quick Hands', '+10% attack speed.', { mods: { atkSpd: 0.1 } });
  T('alchemist', 'catalyst', 'Catalyst Rush', 'Your active recharges 20% faster.', { mods: { activeCd: -0.2 } });
  T('alchemist', 'vial', 'Burst Vial', '12% of kills burst in a small explosion.', { from: 3, on: { kill(g, p, e) { if (g.rng.chance(0.12)) g.explode(e.x, e.y, 52, Math.max(2, p.wdmg * 0.7), { owner: 'player' }); } } });
  // ---- Monk: never stops moving
  T('monk', 'peace', 'Inner Peace', '+1 defense and 5% less damage taken.', { mods: { def: 1, dmgTaken: -0.05 } });
  T('monk', 'fists', 'Swift Fists', '+10% attack speed.', { mods: { atkSpd: 0.1 } });
  T('monk', 'body', 'Iron Body', '+1 heart container.', { mods: { maxHp: 4 } });
  T('monk', 'wind', 'Wind Step', '+6% move speed; dash recharges 12% faster.', { mods: { speed: 0.06, dashCd: -0.12 } });
  T('monk', 'ki', 'Ki Surge', '+8% crit chance; crits hit 20% harder.', { mods: { crit: 0.08, critMult: 0.2 } });
  T('monk', 'palm', 'Palm Strike', 'Every 5th hit sends out a shockwave.', { from: 2, on: { hit: nth('palm', 5, (g, p, e, dmg) => shock(g, e.x, e.y, 70, dmg * 0.9, '#ffcf8a')) } });
  // ---- Warden: immovable guardian
  T('warden', 'guard', 'Reinforced Guard', 'Carry a second Guard.', { mods: { guard: 1 }, on: { pickup: guardUp } });
  T('warden', 'bastion', 'Bastion', '+2 defense.', { mods: { def: 2 } });
  T('warden', 'retort', 'Retributive Shield', 'Foes that touch you take thorn damage (+3).', { mods: { thorns: 3 } });
  T('warden', 'fortitude', 'Fortitude', '+2 heart containers.', { mods: { maxHp: 8 } });
  T('warden', 'dome', 'Dome Mastery', 'Your active recharges 20% faster.', { mods: { activeCd: -0.2 } });
  T('warden', 'ward', 'Healing Ward', 'Clearing a room heals half a heart.', { from: 2, on: { clear(g) { heal(g, 2); } } });

  P.track('talents', TRACK);
  const talentsOf = (cls) => TALENTS.filter(t => t.cls === cls);
  const owned = (p) => TALENTS.filter(t => p.relics[t.key]);

  // ------------------------------------------------------------------ offering and taking
  /** three distinct talents from the hero's class they do not yet have (seeded: same run + floor + count = same offer) */
  function offerFor(g) {
    const p = g.player, n = (g.run.talents || []).length;
    const pool = TALENTS.filter(t => t.cls === p.classId && !p.relics[t.key] && t.from <= g.floorNum + 1);
    const rng = new ED.RNG(g.run.seed + ':talent:' + n + ':' + g.floorNum), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    return out;
  }
  function take(g, t) {
    const p = g.player, before = p.maxHp; p.relics[t.key] = 1; g.run.relicOrder.push(t.key); I.recalc(p);
    if (p.maxHp > before) p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - before));
    if (t.on && t.on.pickup) t.on.pickup(g, p, 1);
    (g.run.talents = g.run.talents || []).push(t.key); g.modal = null;
    g.toast('TALENT: ' + t.name + ' — ' + t.desc, t.color, 260); g.sfx('levelup'); g.ringFx(p.x, p.y, 10, 100, t.color, 26, 6); g.burst(p.x, p.y, 20, t.color, 4, 28);
  }
  ED.hook('runStart', V, (g) => { g.run.talents = []; g.run.talentPending = 0; });
  ED.hook('roomClear', V, (g, room) => { if (room.type === 'boss') g.run.talentPending = (g.run.talentPending || 0) + 1; });
  ED.hook('tick', V, (g) => {
    const r = g.run; if (!r || !(r.talentPending > 0) || g.modal || g.player.dead || g.scene !== 'play') return;
    // timed events that open their own choice (the boss rewards, v8's ending, the floor-5 milestone) go first; the cap means the offer can never be starved
    if (g.timers.length && (r.talentWait = (r.talentWait || 0) + 1) < 900) return;
    r.talentWait = 0; r.talentPending--; const offers = offerFor(g); if (offers.length) { g.modal = { type: 'talent', offers, t: 0 }; g.sfx('shrine'); }
  });

  // ------------------------------------------------------------------ drawing: the choice, the pause line, the recap
  ED.modalImpl.talent = {
    draw(g, c, m) {
      const UI = ED.ui, p = g.player, cls = I.CLASSES[p.classId] || { name: 'hero', color: '#8ae0ff' }; m.t++;
      c.fillStyle = 'rgba(4,4,12,0.78)'; c.fillRect(0, 0, C.W, C.H);
      UI.shadow(c, 'CHOOSE A TALENT', C.W / 2, 86, 34, '#8ae0ff', 'center');
      UI.text(c, cls.name + ' · talent ' + ((g.run.talents || []).length + 1) + ' · your boss fell, your craft grows', C.W / 2, 112, 13, '#a8c8e0', 'center', false);
      m.offers.forEach((t, i) => {
        const w = 270, h = 310, x = C.W / 2 - (m.offers.length * w + (m.offers.length - 1) * 24) / 2 + i * (w + 24), y = 140;
        UI.button(c, 'pick:' + i, '', x, y, w, h, { color: t.color });
        c.fillStyle = U.rgba(t.color, 0.14); c.fillRect(x + 4, y + 4, w - 8, h - 8);
        c.fillStyle = t.color; c.strokeStyle = '#10101c'; c.lineWidth = 3; c.beginPath(); c.arc(x + w / 2, y + 62, 26 + Math.sin((m.t + i * 9) * 0.1) * 1.5, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#10101c'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText(t.on ? '✦' : '▲', x + w / 2, y + 71);
        UI.text(c, t.name, x + w / 2, y + 122, 17, '#ffffff', 'center');
        UI.wrap(c, t.desc, x + 22, y + 160, w - 44, 18, 13, '#d8d8ee');
        UI.text(c, t.on ? 'ACTS (a trigger)' : 'STAT', x + w / 2, y + h - 20, 13, t.on ? '#ffd24a' : '#8aa0c0', 'center', false);
      });
      const have = owned(p); if (have.length) UI.text(c, 'Already learned: ' + have.map(t => t.name).join(' · '), C.W / 2, 482, 13, '#9aaac8', 'center', false);
      UI.text(c, 'Click a card to learn it. You must choose one.', C.W / 2, 508, 13, '#8a9ab8', 'center', false);
    },
    update(g, m, act) { if (act && act.indexOf('pick:') === 0) { const t = m.offers[+act.slice(5)]; if (t) take(g, t); } },
  };
  ED.hook('pauseUI', V, (g, c, o) => {
    if (ED.skin.on() && ED.skin.screens && ED.skin.screens.paused) return;
    const have = owned(g.player); if (!have.length) return; const UI = ED.ui, x = o.x, y = o.y;
    UI.text(c, 'TALENTS', x + 14, y + 206, 11, '#8ae0ff'); UI.wrap(c, have.map(t => t.name).join(' · '), x + 76, y + 206, 430, 14, 11, '#c8e8f8');
  });
  ED.hook('endUI', V, (g, c) => {
    const t = g.run.talents; if (!t || !t.length) return; ED.ui.text(c, '✦ talents: ' + t.map(k => BY_KEY[k].name).join(' · '), 480, 160 + 128, 10, '#8ae0ff', 'center', false);
  });

  ED.talents = { LIST: TALENTS, BY_KEY, of: talentsOf, owned, offerFor, take };
})(typeof globalThis !== 'undefined' ? globalThis : this);

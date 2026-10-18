/* EMBERDEEP — pack_v7.js : v7 "PROVISIONS" — a belt of single-use tools.
 *
 *  Three belt slots (Z / X / C).  Twelve consumables, found as drops, room-clear finds, mini boss prizes and in shops.
 *  The point is the *moment*: a panic button when a fight turns, a lockpick when you are one key short, a tonic before the
 *  boss.  Stacks of up to 3 per slot; you can never hold more than the belt, so spend what you carry.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, D = ED.D, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v7';

  P.define({
    id: 'v7', name: 'PROVISIONS', tag: 'a belt of single-use tools', color: '#9bd8ff',
    blurb: 'Three belt slots (Z/X/C) holding twelve kinds of potions, scrolls and tools — healing, smoke, tonics, lightning and frost scrolls, a lockpick, dash powder — found as drops, room finds, boss prizes and in shops.',
  });

  const timed = (g, name, mods, frames) => { const p = g.player; p.buffs = p.buffs.filter(b => b.name !== name); p.buffs.push({ name, mods, timed: true, until: g.frame + frames }); I.recalc(p); g.toast(name + ' — ' + Math.round(frames / 60) + 's', '#9bd8ff', 90); };
  const pow = (g) => g.itemPow();
  const near = (g, r, f) => g.enemies.filter(e => !e.dead && Math.hypot(e.x - g.player.x, e.y - g.player.y) < r && (!f || f(e)));

  // ------------------------------------------------------------------ the twelve
  const PROV = {
    healing: { id: 'healing', name: 'Healing Draught', rarity: 'common', color: '#ff7aa0', shape: 'potion', w: 10, desc: 'Restore 50% of your max HP.',
      use(g, p) { if (p.hp >= p.maxHp) { g.toast('Already at full health', '#9a9ab0', 70); return false; } g.healPlayer(Math.ceil(p.maxHp * 0.5)); g.ringFx(p.x, p.y, 8, 70, '#ff7aa0', 22, 4); g.sfx('heal'); } },
    powder: { id: 'powder', name: 'Powder Flask', rarity: 'common', color: '#ff9a3c', shape: 'pouch', w: 8, desc: 'Drop three lit bombs around you at once.',
      use(g, p) { for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + g.rng.next(), x = U.clamp(p.x + Math.cos(a) * 52, 50, 910), y = U.clamp(p.y + Math.sin(a) * 52, 50, 526); g.placeBomb(x, y, { r: 80, dmg: 20 * pow(g) * 0.7 + 8, owner: 'player', fuse: 42 }); } g.sfx('fuse'); } },
    smoke: { id: 'smoke', name: 'Smoke Bomb', rarity: 'common', color: '#b8bcc8', shape: 'pouch', w: 8, desc: 'A choking cloud: nearby foes are stunned for 2.5s and you slip free for a second. (Bosses shrug it off.)',
      use(g, p) { const t = near(g, 240); if (!t.length) { g.toast('No one is close enough to bother', '#9a9ab0', 70); return false; } for (const e of t) g.applyStatus(e, 'stun', { t: 150 }); p.inv = Math.max(p.inv, 60); g.ringFx(p.x, p.y, 12, 240, '#b8bcc8', 26, 8); g.burst(p.x, p.y, 30, '#9a9ea8', 4, 40, { size: 6 }); g.sfx('summon'); } },
    swift: { id: 'swift', name: 'Swiftness Tonic', rarity: 'common', color: '#7fe0ff', shape: 'potion', w: 8, desc: '+40% move and attack speed for 12s.',
      use(g, p) { timed(g, 'Swiftness', { speed: 0.4, atkSpd: 0.4 }, 720); g.sfx('levelup'); } },
    mapping: { id: 'mapping', name: 'Scroll of Mapping', rarity: 'common', color: '#cfe8c0', shape: 'scroll', w: 7, desc: 'Reveals every room on this floor.',
      use(g, p) { if (g.floor.rooms.every(r => r.discovered)) { g.toast('You already know this floor', '#9a9ab0', 70); return false; } for (const r of g.floor.rooms) r.discovered = true; g.toast('The map unrolls in your mind.', '#cfe8c0', 120); g.sfx('shrine'); } },
    dashpowder: { id: 'dashpowder', name: 'Dash Powder', rarity: 'common', color: '#e8d8a0', shape: 'pouch', w: 7, desc: 'Your next four dashes have no cooldown.',
      use(g, p) { p.freeDashes = 4; p.dashCd = 0; g.toast('Four free dashes!', '#e8d8a0', 90); g.sfx('dash'); } },
    ironskin: { id: 'ironskin', name: 'Ironskin Elixir', rarity: 'uncommon', color: '#a8b8d8', shape: 'potion', w: 6, desc: '+defense (grows with depth) for 15s.',
      use(g, p) { timed(g, 'Ironskin', { def: 4 + Math.round(g.floorNum * 0.6) }, 900); g.sfx('block'); } },
    berserk: { id: 'berserk', name: 'Berserker Brew', rarity: 'uncommon', color: '#ff5a3a', shape: 'potion', w: 5, desc: 'For 10s: +60% damage, +30% attack speed — but -3 defense.',
      use(g, p) { timed(g, 'Berserk', { dmg: 0.6, atkSpd: 0.3, def: -3 }, 600); g.flashScreen('#ff3a2a', 0.2); g.sfx('bossroar'); } },
    lightning: { id: 'lightning', name: 'Scroll of Lightning', rarity: 'uncommon', color: '#ffe14a', shape: 'scroll', w: 5, desc: 'Calls bolts down on up to five foes, hard.',
      use(g, p) { const t = near(g, 700).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 5); if (!t.length) { g.toast('Nothing to strike', '#9a9ab0', 70); return false; } for (const e of t) { g.fx.push({ x: e.x + U.rnd(-10, 10), y: 0, x2: e.x, y2: e.y, vx: 0, vy: 0, life: 10, max: 10, color: '#fff6a0', shape: 'bolt', drag: 1, grav: 0, size: 2 }); g.damageEnemy(e, Math.max(12, p.wdmg * 4.5 + 8 * pow(g)), { src: 'chain', x: e.x, y: e.y - 40, kb: 3, noProc: true, color: '#ffe14a' }); } g.flashScreen('#ffffff', 0.15); g.shake(7); g.sfx('zap'); } },
    frost: { id: 'frost', name: 'Scroll of Frost', rarity: 'uncommon', color: '#9fe4ff', shape: 'scroll', w: 5, desc: 'Everything in the room is nearly frozen for 4s (bosses slowed).',
      use(g, p) { if (!g.enemies.some(e => !e.dead)) { g.toast('Nothing to freeze', '#9a9ab0', 70); return false; } for (const e of g.enemies) if (!e.dead) g.applyStatus(e, 'slow', { t: 240, f: e.boss ? 0.6 : 0.12 }); g.ringFx(p.x, p.y, 10, 520, '#9fe4ff', 30, 8); g.flashScreen('#9fe4ff', 0.2); g.sfx('shrine'); } },
    fire: { id: 'fire', name: 'Scroll of Fire', rarity: 'uncommon', color: '#ff6a2a', shape: 'scroll', w: 5, desc: 'A ring of flame ignites everything within a short reach.',
      use(g, p) { g.zoneEnemies(p.x, p.y, 230, Math.max(8, p.wdmg * 2 + 6 * pow(g)), { speed: 6.5, color: '#ff6a2a', ignite: true }); g.ringFx(p.x, p.y, 10, 230, '#ff9a4a', 24, 6); g.flashScreen('#ff6a2a', 0.2); g.sfx('boom', { vol: 0.6 }); } },
    lockpick: { id: 'lockpick', name: 'Master Lockpick', rarity: 'rare', color: '#f2c94c', shape: 'pouch', w: 3, desc: 'Opens the nearest ordinary keyed door without a key (not the Boss Key lock).',
      use(g, p) {
        const room = g.room; let best = null, bd = 150;
        for (const d of ED.DIRS) { const e = room.doors[d]; if (!e || !e.lock || e.lock.opened) continue; const def = ED.keys.LOCKS[e.lock.type]; if (!def || !def.key || def.key === 'boss') continue; const c = ED.rooms.doorCenter(d), dist = Math.hypot(c.x - p.x, c.y - p.y); if (dist < bd) { bd = dist; best = { d, e, def }; } }
        if (!best) { g.toast('No ordinary lock within reach', '#9a9ab0', 90); return false; }
        p.keys[best.def.key] = (p.keys[best.def.key] | 0) + 1; g.unlockDoor(room, best.d, best.e);
      } },
  };
  for (const id in PROV) { PROV[id].pack = V; PROV[id].id = id; }
  P.track('provisions', PROV);
  const ORDER = Object.keys(PROV);

  function rollProv(rng, floor, luck, minRank) {
    const w = D.rarityWeights(floor, luck || 0);
    const list = ORDER.map(id => PROV[id]).filter(d => I.RARITY[d.rarity].rank >= (minRank || 0));
    const d = rng.weighted(list, x => x.w * Math.max(0.15, w[x.rarity] || 0.15) * (x.rarity === 'common' ? 1 : 0.8));
    return { cat: 'consumable', id: d.id, rarity: d.rarity, uid: ED.id(), name: d.name };
  }
  ED.provisions = { PROV, ORDER, roll: rollProv };

  // ------------------------------------------------------------------ the belt
  const MAXN = 3;
  const room4 = (p, id) => p.belt.some(s => s && s.id === id && s.n < MAXN) || p.belt.some(s => !s);
  function give(g, id) {
    const p = g.player; const s = p.belt.find(x => x && x.id === id && x.n < MAXN);
    if (s) { s.n++; return true; }
    const i = p.belt.findIndex(x => !x); if (i < 0) return false;
    p.belt[i] = { id, n: 1 }; return true;
  }
  function useSlot(g, i) {
    const p = g.player, s = p.belt[i]; if (!s || p.dead || (p.provCd || 0) > 0) return false;
    const d = PROV[s.id]; if (d.use(g, p) === false) { g.sfx('deny'); return false; }
    s.n--; if (s.n <= 0) p.belt[i] = null; p.provCd = 18; g.run.provsUsed = (g.run.provsUsed || 0) + 1; return true;
  }
  ED.provisions.give = give; ED.provisions.use = useSlot; ED.provisions.roomFor = room4;

  ED.pickupImpl.prov = {
    collect(g, k) {
      if (!give(g, k.item.id)) { if (g.frame - (g._beltWarn || -999) > 150) { g._beltWarn = g.frame; g.toast('Belt full — use something first (Z / X / C)', '#ff9a6a', 100); } return false; }
      g.toast('Picked up: ' + PROV[k.item.id].name, PROV[k.item.id].color, 100); g.sfx('pickup'); g.burst(k.x, k.y, 8, PROV[k.item.id].color, 3, 18);
    },
    draw(c, k, t, bob) { ED.render.glow(c, k.x, k.y, 18, PROV[k.item.id].color, 0.28 + 0.1 * Math.sin(t * 0.2)); ED.consumableGlyph(c, k.item, k.x, k.y + bob, 8, t); },
  };
  function drop(g, x, y, minRank) { const it = rollProv(g.rng, g.floorNum, g.player.st.luck, minRank || 0), pk = g.dropPickup('prov', x, y, 1); pk.item = it; pk.r = 11; return pk; }

  // glyphs (potion / scroll / pouch) — plain shapes
  ED.consumableGlyph = function (c, it, x, y, s) {
    const d = PROV[it.id]; if (!d) return;
    c.save(); c.translate(x, y); c.lineWidth = 1.5; c.strokeStyle = '#10101c';
    if (d.shape === 'potion') { c.fillStyle = '#d8e4f0'; c.fillRect(-s * 0.2, -s * 0.9, s * 0.4, s * 0.5); c.fillStyle = d.color; c.beginPath(); c.arc(0, s * 0.25, s * 0.7, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(-s * 0.35, 0, s * 0.18, s * 0.3); c.fillStyle = '#8a5a3a'; c.fillRect(-s * 0.26, -s * 1.0, s * 0.52, s * 0.18); }
    else if (d.shape === 'scroll') { c.fillStyle = '#efe4c0'; c.fillRect(-s * 0.7, -s * 0.5, s * 1.4, s); c.strokeRect(-s * 0.7, -s * 0.5, s * 1.4, s); c.fillStyle = '#c8b890'; c.fillRect(-s * 0.8, -s * 0.6, s * 0.25, s * 1.2); c.fillRect(s * 0.55, -s * 0.6, s * 0.25, s * 1.2); c.fillStyle = d.color; c.beginPath(); c.arc(0, 0, s * 0.3, 0, TAU); c.fill(); }
    else { c.fillStyle = '#8a6a4a'; c.beginPath(); c.moveTo(-s * 0.6, s * 0.7); c.quadraticCurveTo(-s * 0.9, -s * 0.1, -s * 0.3, -s * 0.5); c.lineTo(s * 0.3, -s * 0.5); c.quadraticCurveTo(s * 0.9, -s * 0.1, s * 0.6, s * 0.7); c.closePath(); c.fill(); c.stroke(); c.fillStyle = d.color; c.fillRect(-s * 0.35, -s * 0.65, s * 0.7, s * 0.25); c.beginPath(); c.arc(0, s * 0.15, s * 0.25, 0, TAU); c.fill(); }
    c.restore();
  };

  // ------------------------------------------------------------------ lifecycle
  ED.hook('runStart', V, (g) => { const p = g.player; p.belt = [null, null, null]; p.provCd = 0; p.freeDashes = 0; });
  ED.hook('tick', V, (g) => {
    const p = g.player; if (!p || p.dead || !p.belt || g.modal) return;
    if (p.provCd > 0) p.provCd--;
    for (let i = 0; i < 3; i++) if (ED.input.consume('item' + (i + 1))) useSlot(g, i);
    if (p.buffs.some(b => b.timed && g.frame >= b.until)) { p.buffs = p.buffs.filter(b => !(b.timed && g.frame >= b.until)); I.recalc(p); }
    // Dash Powder: a dash that starts while powder is active costs nothing
    if (p.dashT > 0 && !p._pdash) { p._pdash = true; if (p.freeDashes > 0) { p.freeDashes--; p.dashCd = 0; } } else if (p.dashT <= 0) p._pdash = false;
  });
  ED.hook('kill', V, (g, e) => {
    if (e.boss || e.noLoot || e.minion || e.carriesKey) return;
    const p = g.player, ch = (e.elite ? 0.16 : 0.035) + p.st.luck * 0.005;
    if (g.rng.chance(ch)) drop(g, e.x, e.y, e.elite ? 1 : 0);
  });
  ED.hook('roomClear', V, (g, room) => {
    const rng = g.rt.rng.fork('provclear');
    if (room.type === 'boss') { drop(g, 440, 330, 1); drop(g, 520, 330, 0); }
    else if (room.type === 'normal' && rng.chance(0.14 + g.player.st.luck * 0.01)) drop(g, 480 + rng.int(-40, 40), 310, 0);
  });
  ED.hook('miniDefeated', V, (g) => { drop(g, 560, 340, 1); });
  ED.hook('roomEnter', V, (g, room) => {
    if (room.type !== 'shop' || g.rt.provShop) return; g.rt.provShop = true;
    const rng = g.rt.rng.fork('provshop'), F = g.floorNum;
    [250, 710].forEach((x, i) => {
      const item = rollProv(rng, F, g.player.st.luck, i ? 1 : 0), d = PROV[item.id], price = Math.max(10, Math.round(I.price(item, F, g.player) * 0.9 / 5) * 5);
      g.addInter({ type: 'service', x, y: 455, r: 16, range: 50, name: d.name, color: d.color, desc: d.desc + ' (goes on your belt)', price: () => price,
        use(gg, it) { if (!room4(gg.player, item.id)) { gg.sfx('deny'); gg.toast('Your belt is full', '#ff9a6a', 90); return; } if (!gg.buy(it)) return; give(gg, item.id); it.dead = true; } });
    });
  });

  // ------------------------------------------------------------------ HUD: the belt (bottom right)
  ED.hook('hud', V, (g, c) => {
    const p = g.player, UI = ED.ui; if (!p.belt) return;
    const x0 = C.W - 3 * 40 - 12, y0 = C.H - 46;
    for (let i = 0; i < 3; i++) {
      const s = p.belt[i], x = x0 + i * 40, d = s && PROV[s.id];
      c.fillStyle = 'rgba(8,8,16,0.85)'; c.fillRect(x, y0, 36, 36); c.strokeStyle = d ? d.color : '#3a3a50'; c.lineWidth = d ? 2 : 1.5; c.strokeRect(x + 0.5, y0 + 0.5, 35, 35);
      if (d) { ED.consumableGlyph(c, { id: s.id }, x + 18, y0 + 18, 9, 0); if (s.n > 1) UI.text(c, 'x' + s.n, x + 34, y0 + 33, ED.skin.on() ? 13 : 10, '#fff', 'right'); if (p.provCd > 0) { c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x, y0, 36, 36 * p.provCd / 18); } }
      UI.text(c, ED.input.key1('item' + (i + 1)), x + 4, y0 + (ED.skin.on() ? 14 : 11), ED.skin.on() ? 13 : 9, d ? '#cfd0ee' : '#5a5a70');
    }
    const m = ED.input.mouse;
    for (let i = 0; i < 3; i++) { const s = p.belt[i], x = x0 + i * 40; if (s && m.x >= x && m.x <= x + 36 && m.y >= y0 && m.y <= y0 + 36) { const d = PROV[s.id]; UI.panel(c, x0 - 150, y0 - 52, 190, 46, d.color, 0.95); UI.text(c, d.name, x0 - 142, y0 - 36, 11, d.color); UI.wrap(c, d.desc, x0 - 142, y0 - 22, 176, 10, 8, '#cfd0e0'); } }
    if (p.freeDashes > 0) UI.text(c, 'FREE DASHES ' + p.freeDashes, x0 + 114, y0 - 6, 9, '#e8d8a0', 'right');
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

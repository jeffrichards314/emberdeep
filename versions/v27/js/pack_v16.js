/* EMBERDEEP — pack_v16.js : v16 "DARES" — optional challenges that turn an ordinary fight into a decision.
 *
 *  From floor 2, up to three ordinary combat rooms per floor carry a DARE, announced when you walk in and shown at the bottom of the screen.
 *  Win it for a bonus; fail it and nothing is lost (the room still has to be cleared the usual way, so a dare can never block a door).
 *    UNTOUCHED  take no damage                        -> gold + a bomb
 *    SWIFT      clear the room before the clock ends  -> gold (the biggest purse)
 *    NO DASH    clear it without dashing              -> gold + a heart
 *    CHAIN      once the first foe falls, never let 3.5s pass without a kill   -> gold + a heart
 *    MARKED     a foe wears a gold mark: kill it before any other foe falls    -> a bounty, paid where it dies
 *  Every fourth dare you win in a run also pays a relic cache (choose 1 of 3).  Which rooms carry a dare is decided by the run seed, not by the order you explore.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, I = ED.items, P = ED.packs;
  const TAU = U.TAU, V = 'v16';

  P.define({
    id: 'v16', name: 'DARES', tag: 'optional challenges for bonuses', color: '#7fd8ff',
    blurb: 'Some combat rooms carry a dare: take no damage, beat a clock, never dash, keep a kill chain going, or kill the marked foe first. Win it for a purse (and a relic cache every fourth win); fail it and nothing is lost.',
  });

  const CHANCE = 0.25, PER_FLOOR = 3, CHAIN_GAP = 210, EVERY = 4;
  const KINDS = [
    { id: 'untouched', name: 'UNTOUCHED', color: '#9ae8a0', w: 3, short: 'take no damage', gold: 1.2, bomb: 1, pack: V },
    { id: 'swift', name: 'SWIFT', color: '#ffd24a', w: 3, short: 'clear it before the clock ends', gold: 1.7, pack: V },
    { id: 'nodash', name: 'NO DASH', color: '#c8a0ff', w: 2, short: 'clear it without dashing', gold: 1.3, heart: 1, pack: V },
    { id: 'chain', name: 'CHAIN', color: '#ff9a6a', w: 2, short: 'a kill every 3.5s once the first falls', gold: 1.3, heart: 1, pack: V },
    { id: 'marked', name: 'MARKED', color: '#ffe070', w: 3, short: 'kill the marked foe first', gold: 2.0, pack: V },
  ];
  const BY = {}; for (const k of KINDS) BY[k.id] = k;
  P.track('dares', KINDS);

  // ------------------------------------------------------------------ the save: meta.dares (all-runs tally)
  const meta = () => { const m = ED.save.meta; let t = m.dares; if (!t || typeof t !== 'object') t = m.dares = {}; if (typeof t.won !== 'number') t.won = 0; if (typeof t.lost !== 'number') t.lost = 0; return t; };
  const tally = (g) => g.run.dares || (g.run.dares = { won: 0, lost: 0 });
  const lootGold = (g, k) => Math.round((6 + 1.6 * g.floorNum) * k.gold);

  // ------------------------------------------------------------------ which rooms carry a dare: decided when the floor is built, from the seed alone
  ED.hook('floorStart', V, (g) => {
    const f = g.floorNum, fl = g.floor; fl.dareRooms = null; if (f < 2) return;
    const rooms = fl.rooms.filter(r => r.type === 'normal' && r.id !== fl.startId); if (!rooms.length) return;
    const rng = new ED.RNG(g.run.seed + ':dare:floor:' + f), order = rooms.map(r => [r, rng.next()]).sort((a, b) => a[1] - b[1] || a[0].id - b[0].id).map(x => x[0]), out = {}; let n = 0;
    for (const r of order) { if (n >= PER_FLOOR) break; if (rng.chance(CHANCE)) { out[r.id] = true; n++; } }
    fl.dareRooms = n ? out : null;
  });
  const sealed = (g) => g.run && (g.run.mode === 'rush' || g.run.mode === 'gauntlet');
  /** build a dare for the room we are standing in */
  function make(g, rt, kind) {
    const waves = rt.enc ? rt.enc.waves : [], foes = waves.reduce((n, w) => n + w.length, 0);
    const d = { kind: kind.id, state: 'live', t: 0, started: false, foes, waves: waves.length, dmg0: g.run.damageTaken, dashing: g.player.dashT > 0, kills: 0, idle: 0, target: null, fade: 0, msg: '', cache: false, cacheDone: false };
    d.limit = U.clamp(Math.round(60 * (10 + 2.2 * foes + 2.0 * waves.length)), 60 * 20, 60 * 75);
    d.gold = lootGold(g, kind); d.heart = !!kind.heart; d.bomb = !!kind.bomb;
    rt.dare = d; return d;
  }
  const rewardText = (d) => '+' + d.gold + 'g' + (d.heart ? '  +heart' : '') + (d.bomb ? '  +bomb' : '');
  ED.hook('roomEnter', V, (g, room) => {
    const rt = g.rt; if (!rt || rt.dareRolled) return; rt.dareRolled = true;
    const fl = g.floor; if (!fl.dareRooms || !fl.dareRooms[room.id] || room.type !== 'normal' || room.cleared || sealed(g)) return;
    if (!rt.enc || rt.enc.state !== 'idle' || !rt.enc.waves.length || rt.huntAmbush) return;
    const rng = new ED.RNG(g.run.seed + ':dare:' + g.floorNum + ':' + room.id), first = rt.enc.waves[0].length;
    const pool = KINDS.filter(k => k.id !== 'marked' || first >= 3); if (!pool.length) return;
    const kind = rng.weighted(pool, k => k.w), d = make(g, rt, kind);
    g.toast('DARE — ' + kind.name + ': ' + kind.short + '   (' + rewardText(d) + ')', kind.color, 260); g.sfx('ui', { vol: 0.5 });
  });

  // ------------------------------------------------------------------ winning, losing, the relic cache
  function win(g, d, x, y) {
    if (d.state !== 'live') return; const K = BY[d.kind], T = tally(g);
    d.state = 'won'; d.fade = 0; T.won++; meta().won++;
    g.dropGold(x, y, d.gold); if (d.heart) g.dropPickup('heart', x + 18, y, 4); if (d.bomb) g.dropPickup('bomb', x - 18, y, 1);
    if (T.won % EVERY === 0) d.cache = true;
    g.toast('DARE COMPLETE — ' + K.name + '!  ' + rewardText(d) + (d.cache ? '  ·  a relic cache awaits' : ''), '#6ee07a', 240); g.sfx('win', { vol: 0.6 }); g.ringFx(g.player.x, g.player.y, 8, 60, '#6ee07a', 20, 4);
  }
  function lose(g, d, why) {
    if (d.state !== 'live') return; d.state = 'lost'; d.msg = why; d.fade = 0; tally(g).lost++; meta().lost++;
    g.toast('Dare failed — ' + why, '#9a9ab8', 160); g.sfx('deny', { vol: 0.5 });
  }
  function cache(g, d) {
    if (!d.cache || d.cacheDone) return; d.cacheDone = true; const p = g.player, rng = g.rt.rng.fork('dare');
    const offers = I.rollOffers(rng, g.floorNum + 1, 3, { luck: p.st.luck, relics: p.relics, kinds: { relic: 1 } });
    if (!offers.length) return; const gid = ED.id();
    offers.forEach((it, i) => g.pedestal(it, 480 + (i - (offers.length - 1) / 2) * 90, 190, { group: gid }));
    g.toast('DARE CACHE — choose a relic.', '#7fd8ff', 240);
  }
  ED.hook('roomClear', V, (g, room) => {
    const d = g.rt && g.rt.dare; if (!d) return;
    if (d.state === 'live' && d.kind !== 'marked') win(g, d, 480, 300);       // the room is clear and nothing broke the dare
    else if (d.state === 'live') { d.state = 'void'; }                         // a mark that never found a target: nothing to claim
    cache(g, d);
  });

  // ------------------------------------------------------------------ what each dare watches, every frame
  ED.hook('tick', V, (g) => {
    const rt = g.rt, d = rt && rt.dare; if (!d) return;
    if (d.state !== 'live') { if (d.fade < 400) d.fade++; return; }
    const p = g.player, enc = rt.enc; if (!enc || g.room.cleared) return;
    const fighting = enc.state === 'fight' || enc.state === 'gap'; if (fighting) d.started = true;
    switch (d.kind) {
      case 'untouched': if (g.run.damageTaken > d.dmg0) lose(g, d, 'you were hit'); break;
      case 'nodash': { const now = p.dashT > 0; if (now && !d.dashing) lose(g, d, 'you dashed'); d.dashing = now; break; }
      case 'swift': if (fighting && ++d.t > d.limit) lose(g, d, 'time ran out'); break;
      case 'chain': if (d.kills > 0 && enc.state === 'fight' && g.spawns.length === 0 && g.enemies.some(e => !e.dead && !e.invuln && !(e.intro > 0)) && ++d.idle > CHAIN_GAP) lose(g, d, 'the chain broke'); break;      // (the clock only runs while there is something you could hit: a submerged or leaping foe does not count)
      case 'marked': {
        if (!d.target && enc.state === 'fight' && g.spawns.length === 0) {                      // the first wave is all here: pick who wears the mark
          const c = g.enemies.filter(e => !e.dead && !e.boss && !e.minion && !e.elite && !e.carriesKey && !e.invuln);
          if (c.length < 2) { d.state = 'void'; break; }
          d.target = new ED.RNG(g.run.seed + ':dare:mark:' + g.floorNum + ':' + g.room.id).pick(c); g.toast('A foe is MARKED — kill it first!', '#ffe070', 160); g.sfx('ui', { vol: 0.5 });
        } else if (d.target && d.target.dead) lose(g, d, 'the mark got away');                // gone without being killed
        break;
      }
    }
  });
  ED.hook('kill', V, (g, e) => {
    const d = g.rt && g.rt.dare; if (!d || d.state !== 'live') return;
    if (d.kind === 'chain') { d.kills++; d.idle = 0; }
    else if (d.kind === 'marked' && d.target) {
      if (e === d.target) win(g, d, e.x, e.y);
      else if (!e.minion && !e.boss) lose(g, d, 'another foe fell first');
    }
  });
  ED.hook('runStart', V, (g) => { g.run.dares = { won: 0, lost: 0 }; });
  ED.hook('runEnd', V, (g) => { if (g.run && g.run.dares && (g.run.dares.won || g.run.dares.lost)) ED.save.save(); });

  // ------------------------------------------------------------------ drawing: the mark on the foe, the dare strip at the bottom of the screen
  ED.hook('draw', V, (g, c, t) => {
    const d = g.rt && g.rt.dare; if (!d || d.kind !== 'marked' || d.state !== 'live' || !d.target || d.target.dead) return;
    const e = d.target, k = 0.5 + 0.5 * Math.sin(g.frameAll * 0.12);
    c.save(); c.strokeStyle = 'rgba(255,224,112,' + (0.5 + 0.4 * k) + ')'; c.lineWidth = 2.5; c.beginPath(); c.arc(e.x, e.y, e.r + 6 + 2 * k, 0, TAU); c.stroke();
    const y = e.y - e.r - 20 - 2 * k; c.fillStyle = '#ffe070'; c.strokeStyle = '#6a5010'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(e.x, y - 8); c.lineTo(e.x + 6, y); c.lineTo(e.x, y + 8); c.lineTo(e.x - 6, y); c.closePath(); c.fill(); c.stroke(); c.restore();
  });
  const label = (d) => {
    const K = BY[d.kind];
    if (d.state === 'won') return 'DARE COMPLETE — ' + K.name;
    if (d.state === 'lost') return 'DARE FAILED — ' + d.msg;
    switch (d.kind) {
      case 'swift': return 'DARE · SWIFT — ' + (d.started ? Math.ceil(Math.max(0, d.limit - d.t) / 60) + 's left' : Math.round(d.limit / 60) + 's once the fight starts');
      case 'chain': return 'DARE · CHAIN — ' + (d.kills ? 'x' + d.kills + ' · next kill within ' + Math.max(0, (CHAIN_GAP - d.idle) / 60).toFixed(1) + 's' : K.short);
      case 'marked': return 'DARE · MARKED — ' + (d.target ? 'kill the ✦ foe first' : 'a foe will be marked');
      default: return 'DARE · ' + K.name + ' — ' + K.short;
    }
  };
  ED.hook('hud', V, (g, c) => {
    const d = g.rt && g.rt.dare; if (!d || d.state === 'void' || g.scene === 'intro' || g.scene === 'paused') return;
    const over = d.state !== 'live'; if (over && d.fade > 220) return;
    const K = BY[d.kind], col = d.state === 'won' ? '#6ee07a' : d.state === 'lost' ? '#8a8aa8' : K.color, w = 460, h = 26, x = (C.W - w) / 2, y = C.H - 44, u = ED.ui;
    c.save(); c.globalAlpha = over ? U.clamp((220 - d.fade) / 40, 0, 1) : 1;
    c.fillStyle = 'rgba(8,8,16,0.84)'; c.fillRect(x, y, w, h); c.fillStyle = col; c.fillRect(x, y, 4, h); c.strokeStyle = U.rgba(col, 0.5); c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const lab = label(d), rw = over ? 0 : rewardText(d).length * 6.6 + 14, fit = Math.floor((w - 24 - rw) / (lab.length * 0.62)); u.text(c, lab, x + 14, y + 17, ED.skin.on() ? Math.max(9, Math.min(12, fit)) : 12, col, 'left'); if (!over) u.text(c, rewardText(d), x + w - 10, y + 17, 11, '#ffd24a', 'right', false);          // (a long dare line shrinks instead of running under its reward)
    c.restore();
  });
  ED.hook('endUI', V, (g, c) => {
    const T = g.run && g.run.dares; if (!T || !(T.won || T.lost)) return;
    ED.ui.text(c, '⚑ dares: ' + T.won + ' won' + (T.lost ? ', ' + T.lost + ' failed' : ''), 480, 346, 11, '#7fd8ff', 'center', false);
  });

  // ------------------------------------------------------------------ feats (they appear on the v10 LEGACY screen when both updates are on)
  if (ED.legacy) {
    const F = ED.legacy.FEATS, M = ED.legacy.FEAT, won = (x) => (x.run.dares && x.run.dares.won) || 0;
    const add = (f) => { f.pack = V; f.need = V; F.push(f); M[f.id] = f; };
    add({ id: 'dare3', name: 'Daredevil', desc: 'Win 3 dares in one run.', title: 'the Daredevil', test: x => won(x) >= 3, prog: x => [Math.min(3, won(x)), 3] });
    add({ id: 'dare12', name: 'Dauntless', desc: 'Win 12 dares in one run.', title: 'the Dauntless', test: x => won(x) >= 12, prog: x => [Math.min(12, won(x)), 12] });
    add({ id: 'dare50', name: 'Fearless', desc: 'Win 50 dares (all runs).', title: 'the Fearless', test: x => meta().won >= 50, prog: x => [Math.min(50, meta().won), 50] });
  }

  /** for tests and the debug console: put a dare of this kind on the room you are standing in */
  function force(g, id) { const k = BY[id], rt = g.rt; if (!k || !rt) return null; const d = make(g, rt, k); rt.dareRolled = true; return d; }
  ED.dares = { KINDS, BY, meta, tally, force, CHAIN_GAP, EVERY };
})(typeof globalThis !== 'undefined' ? globalThis : this);

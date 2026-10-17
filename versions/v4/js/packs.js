/* EMBERDEEP — packs.js : the VERSION system.
 *
 * Every content update is a "pack" (v2, v3 ...).  v1 is the original game and is always the base.
 * A content entry (enemy, relic, class, boss, room type ...) opts in with  pack: 'v3'.
 * Packs are independent of each other, so any combination is playable:  v1 alone  ·  v1+v3  ·  everything.
 * With every pack OFF the game is bit-for-bit the original v1 (same seeds → same dungeons; tested).
 *
 * State lives in the save file (meta.packs[id] === false means OFF; anything else is ON, so a freshly
 * added update is ON by default).  Changing it only affects NEW runs and is done on the Versions screen.
 * Also overridable per page-load:  index.html?packs=v1  /  ?packs=v2,v4  /  ?packs=all
 */
(function (root) {
  'use strict';
  const ED = root.ED;

  // One entry per update.  `adds` is a hand-written highlight list shown on the Versions screen
  // (counts of every tagged table entry are appended automatically).
  const LIST = [
    { id: 'v1', name: 'EMBERDEEP', tag: 'The original descent', color: '#ffb04a', base: true,
      blurb: 'The complete first game: procedural floors, colour-coded keys, 11 mini bosses, bosses that return as bigger tiers, MEGA bosses, 19 room types, 7 classes.',
      adds: [] },
  ];
  const BY_ID = {};
  for (const p of LIST) BY_ID[p.id] = p;

  // tables that hold tagged entries (modules register theirs so the screen can count content)
  const tables = {};
  let override = null;           // Set of ids (or 'all') forced by tests / URL, not saved

  const P = ED.packs = {
    LIST, BY_ID, tables,
    /** register a content table for counting:  ED.packs.track('relics', RELICS) */
    track(kind, table) { tables[kind] = table; },
    /** add (or replace) an update's metadata — each pack file calls this once */
    define(def) { if (BY_ID[def.id]) Object.assign(BY_ID[def.id], def); else { LIST.push(def); BY_ID[def.id] = def; } return def; },

    on(id) {
      if (!id || id === 'v1') return true;
      if (override) return override === 'all' || override.has(id);
      const m = ED.save && ED.save.meta && ED.save.meta.packs;
      return !(m && m[id] === false);
    },
    /** is a content entry (or anything with an optional .pack tag) available right now? */
    ok(def) { return !def || !def.pack || P.on(def.pack); },
    /** filter an array of tagged entries */
    filter(arr) { return arr.filter(P.ok); },
    /** values of a keyed table, tagged-and-disabled entries removed */
    values(obj) { return Object.values(obj).filter(P.ok); },

    ids() { return LIST.map(p => p.id); },
    optional() { return LIST.filter(p => !p.base); },
    active() { return LIST.filter(p => P.on(p.id)).map(p => p.id); },
    /** short label like "v1", "v1+v2+v4" or "v1-v5 (ALL)" */
    stamp() {
      const act = P.active();
      if (act.length === 1) return 'v1';
      if (act.length === LIST.length) return 'ALL v1-' + LIST[LIST.length - 1].id;
      return act.join('+');
    },
    /** compact key for per-version records */
    key() { return P.active().join('+'); },

    /** set one pack (persisted).  Only call between runs. */
    set(id, on) {
      if (!BY_ID[id] || BY_ID[id].base) return;
      const m = ED.save.meta.packs = ED.save.meta.packs || {};
      if (on) delete m[id]; else m[id] = false;
      ED.save.save();
    },
    toggle(id) { P.set(id, !P.on(id)); },
    /** enable exactly these packs (v1 always) */
    use(list) {
      const want = new Set(list === 'all' ? P.ids() : list === 'none' ? ['v1'] : list);
      for (const p of LIST) if (!p.base) P.set(p.id, want.has(p.id));
    },
    /** cumulative preset: v1 + v2 + ... + vN (by order of release) */
    upTo(id) {
      const out = []; for (const p of LIST) { out.push(p.id); if (p.id === id) break; }
      P.use(out);
    },
    /** temporary override that is NOT saved (tests, ?packs= URL) */
    force(list) {
      if (list === null) { override = null; return; }
      override = list === 'all' ? 'all' : new Set(list === 'none' ? ['v1'] : list);
    },
    forced() { return !!override; },
    /** parse "v1" | "all" | "none" | "v2,v4" */
    parse(s) {
      s = String(s || '').toLowerCase().trim();
      if (!s || s === 'all' || s === 'latest') return 'all';
      if (s === 'none' || s === 'v1' || s === 'base') return 'none';
      return s.split(/[ ,+]+/).filter(x => BY_ID[x]);
    },

    /** counts of tagged content per kind for one pack — used by the Versions screen and tests */
    content(id) {
      const out = {};
      for (const kind in tables) {
        const t = tables[kind]; let n = 0;
        const vals = Array.isArray(t) ? t : Object.values(t);
        for (const v of vals) {
          if (Array.isArray(v)) { for (const w of v) if (w && w.pack === id && !w.hidden) n++; }      // e.g. ARMOR slots
          else if (v && v.pack === id && !v.hidden) n++;
        }
        if (n) out[kind] = n;
      }
      return out;
    },
  };

  // ---------------------------------------------------------------- extension points
  // Packs add behaviour through these instead of editing core loops.  A hook only runs while its pack is ON.
  //   tick(g) runStart(g) floorStart(g) roomEnter(g,room) roomClear(g,room) kill(g,enemy) spawn(g,enemy)
  //   draw(g,ctx,t)  hud(g,ctx)  guardBreak(g)
  const HOOKS = ED.hooks = { tick: [], runStart: [], floorStart: [], roomEnter: [], roomClear: [], kill: [], spawn: [], hurt: [], draw: [], hud: [], guardBreak: [] };
  ED.hook = function (name, pack, fn) { (HOOKS[name] = HOOKS[name] || []).push({ pack, fn }); };
  ED.runHooks = function (name, g, a, b) {
    const L = HOOKS[name]; if (!L || !L.length) return;
    for (let i = 0; i < L.length; i++) { const h = L[i]; if (P.on(h.pack)) h.fn(g, a, b); }
  };
  // content implementations keyed by weapon kind / active id (so core switches stay untouched)
  ED.bossDraw = {};        // boss shape  -> (c, e, x, y, r, col, dark, t, face)   custom body art for pack bosses
  ED.partDraw = {};        // part kind   -> (c, e, p, vulnerable, flash, t)
  ED.partPos = {};         // part kind   -> (e, p, g, t) => [x, y]
  ED.weaponImpl = {};      // kind -> { fire(g, ang, dmg, crit, color, echo), canFire?(g), glyph?(c, s, t), held?(c, p) }
  ED.activeImpl = {};      // id   -> function (g, stats, aim, pow) { return false to refuse }

  // optional per-load override from the URL
  try {
    const loc = root.location;
    if (loc && loc.search) {
      const m = /[?&]packs=([^&]*)/.exec(loc.search);
      if (m) P.force(P.parse(decodeURIComponent(m[1])));
    }
  } catch (e) { /* ignore */ }
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* EMBERDEEP — save.js : persistent meta progression (localStorage) */
(function (root) {
  'use strict';
  const ED = root.ED;
  const KEY = 'emberdeep.save.v1';

  function fresh() {
    return {
      v: 1,
      bestFloor: 0, totalKills: 0, totalRuns: 0, totalDeaths: 0, victories: 0, totalGold: 0, playFrames: 0,
      bestRun: null,                 // {floor, kills, seed, cls, frames, victory}
      bestBySeed: {},                // seed -> deepest floor
      bestByPacks: {},               // active-version key (e.g. 'v1+v2') -> deepest floor
      packs: {},                     // id -> false when that update is switched OFF (default ON)
      unlocked: { items: {}, classes: { knight: true }, bosses: {}, minis: {} },
      seen: { enemies: {}, items: {}, bosses: {} },
      settings: { volume: 0.6, music: 0.45, shake: 1, flash: 1, damageNumbers: 1 },
      lastSeed: '', lastClass: 'knight',
      nemesis: null,                 // v4: the echo of your last death (class, floor, killer, weapon, relics)
    };
  }
  function merge(dst, src) {
    for (const k in src) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;           // pasted / damaged save data can never reach Object.prototype
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') merge(dst[k], src[k]);
      else dst[k] = src[k];
    }
    return dst;
  }

  const S = ED.save = {
    meta: fresh(),
    load() {
      try {
        const raw = ED.storage.get(KEY);
        if (raw) S.meta = merge(fresh(), JSON.parse(raw));
      } catch (e) { S.meta = fresh(); }
      S.meta.unlocked.classes.knight = true;
      return S.meta;
    },
    save() { if (S.frozen) return; try { ED.storage.set(KEY, JSON.stringify(S.meta)); } catch (e) { /* ignore */ } },
    /** a throw-away copy of the save for anything that must never leave a mark (v22's practice sessions and gallery stage): reads see the same data, writes go to the copy, nothing is stored until unsandbox() puts the real save back */
    sandbox() { if (S._real) return false; S._real = S.meta; S.meta = JSON.parse(JSON.stringify(S.meta)); S.frozen = true; return true; },
    unsandbox() { if (!S._real) return false; S.meta = S._real; S._real = null; S.frozen = false; return true; },
    /** the real save even while sandboxed (preferences such as the gallery's 'reveal everything' are written there) */
    real() { return S._real || S.meta; },
    saveReal() { try { ED.storage.set(KEY, JSON.stringify(S.real())); } catch (e) { /* ignore */ } },
    /** the whole save as text (Options -> Export) and back (Import): anything missing is filled from the defaults, anything unsafe is dropped */
    exportText() { return JSON.stringify(S.meta); },
    importText(str) {
      let o; try { o = JSON.parse(String(str).trim()); } catch (e) { return { ok: false, why: 'that is not valid save data' }; }
      if (!o || typeof o !== 'object' || Array.isArray(o) || typeof o.unlocked !== 'object' || !o.unlocked || typeof o.settings !== 'object') return { ok: false, why: 'that does not look like an EMBERDEEP save' };
      S.meta = merge(fresh(), o); S.meta.unlocked.classes.knight = true; S.save(); return { ok: true, runs: S.meta.totalRuns, best: S.meta.bestFloor };
    },
    reset() { S.meta = fresh(); S.save(); },

    isItemUnlocked(id) { return !!S.meta.unlocked.items[id]; },
    /** classes whose unlock key was earned while their update was switched off become available once it is on */
    syncClasses() { for (const c of ED.items.classList()) if (c.unlock && S.meta.unlocked.items[c.unlock] && !S.meta.unlocked.classes[c.id]) S.meta.unlocked.classes[c.id] = true; },
    isClassUnlocked(id) { return !!S.meta.unlocked.classes[id]; },
    unlockItem(id) { if (S.meta.unlocked.items[id]) return false; S.meta.unlocked.items[id] = true; S.save(); return true; },
    unlockClass(id) { if (S.meta.unlocked.classes[id]) return false; S.meta.unlocked.classes[id] = true; S.save(); return true; },
    markBoss(id) { const f = !S.meta.unlocked.bosses[id]; S.meta.unlocked.bosses[id] = true; S.save(); return f; },
    markMini(id) { const f = !S.meta.unlocked.minis[id]; S.meta.unlocked.minis[id] = true; S.save(); return f; },
    see(kind, id) { const s = S.meta.seen[kind]; if (s && !s[id]) { s[id] = true; } },

    /** record the end of a run */
    recordRun(run) {
      const m = S.meta;
      m.totalRuns++;
      if (!run.victory) m.totalDeaths++; else m.victories++;
      m.totalKills += run.kills;
      m.totalGold += run.goldEarned || 0;
      m.playFrames += run.frames;
      const floor = run.floorNum;
      if (run.assist) { S.save(); return { newBest: false, seedBest: false, assisted: true }; }          // assisted runs count their kills and deaths (above) but never set a personal best
      const newBest = floor > m.bestFloor;
      if (newBest) m.bestFloor = floor;
      if (ED.packs) { const k = ED.packs.key(); if (floor > (m.bestByPacks[k] || 0)) m.bestByPacks[k] = floor; run.packsKey = k; }
      const prev = m.bestBySeed[run.seed] || 0;
      if (floor > prev) m.bestBySeed[run.seed] = floor;
      // keep the table small
      const keys = Object.keys(m.bestBySeed);
      if (keys.length > 60) delete m.bestBySeed[keys[0]];
      if (!m.bestRun || floor > m.bestRun.floor || (floor === m.bestRun.floor && run.kills > m.bestRun.kills)) {
        m.bestRun = { floor, kills: run.kills, seed: run.seed, cls: run.classId, frames: run.frames, victory: !!run.victory };
      }
      S.save();
      return { newBest, seedBest: floor > prev };
    },
  };
  S.load();
})(typeof globalThis !== 'undefined' ? globalThis : this);

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
      unlocked: { items: {}, classes: { knight: true }, bosses: {}, minis: {} },
      seen: { enemies: {}, items: {}, bosses: {} },
      settings: { volume: 0.6, music: 0.45, shake: 1, flash: 1, damageNumbers: 1 },
      lastSeed: '', lastClass: 'knight',
    };
  }
  function merge(dst, src) {
    for (const k in src) {
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
    save() { try { ED.storage.set(KEY, JSON.stringify(S.meta)); } catch (e) { /* ignore */ } },
    reset() { S.meta = fresh(); S.save(); },

    isItemUnlocked(id) { return !!S.meta.unlocked.items[id]; },
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
      const newBest = floor > m.bestFloor;
      if (newBest) m.bestFloor = floor;
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

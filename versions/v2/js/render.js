/* EMBERDEEP — render.js : world rendering (tiles, doors, entities, zones, fx, lighting) + icon set.
 * Pure rendering — reads game state, never mutates simulation. */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, DIRS = ED.DIRS;
  const TAU = U.TAU, TILE = C.TILE;

  // ================================================================== small drawing helpers
  function shape(c, kind, x, y, r, rot, t) {
    c.beginPath();
    switch (kind) {
      case 'tri': for (let i = 0; i < 3; i++) { const a = rot + i * TAU / 3; const rr = i === 0 ? r * 1.2 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); break;
      case 'diamond': for (let i = 0; i < 4; i++) { const a = rot + i * TAU / 4; const rr = i % 2 ? r * 0.8 : r * 1.15; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); break;
      case 'hex': for (let i = 0; i < 6; i++) { const a = rot + i * TAU / 6; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); break;
      case 'square': { const q = r * 0.9; c.rect(x - q, y - q, q * 2, q * 2); break; }
      case 'star': for (let i = 0; i < 10; i++) { const a = rot + i * TAU / 10 - Math.PI / 2; const rr = i % 2 ? r * 0.55 : r * 1.15; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); break;
      case 'blob': for (let i = 0; i <= 16; i++) { const a = i * TAU / 16; const rr = r * (1 + 0.08 * Math.sin(a * 3 + (t || 0) * 0.15)); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9); } c.closePath(); break;
      case 'ghost': c.arc(x, y - r * 0.1, r, Math.PI, 0); for (let i = 0; i <= 4; i++) c.lineTo(x + r - i * r / 2, y + r * 0.8 + (i % 2 ? -r * 0.3 : 0) + Math.sin((t || 0) * 0.2 + i) * 1.5); c.closePath(); break;
      default: c.arc(x, y, r, 0, TAU);
    }
  }
  const dark = {};
  function darker(col, f) { const k = col + f; return dark[k] || (dark[k] = U.mix(col, '#000000', f)); }
  function lighter(col, f) { const k = col + 'L' + f; return dark[k] || (dark[k] = U.mix(col, '#ffffff', f)); }
  function glow(c, x, y, r, color, a) {
    c.fillStyle = U.rgba(color, a); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = U.rgba(color, a * 0.6); c.beginPath(); c.arc(x, y, r * 0.55, 0, TAU); c.fill();
  }
  function heart(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * 0.9);
    c.bezierCurveTo(x - s * 1.5, y - s * 0.2, x - s * 0.7, y - s * 1.1, x, y - s * 0.4);
    c.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.5, y - s * 0.2, x, y + s * 0.9); c.closePath();
  }

  // ================================================================== icons (room types, keys, locks, items)
  const ICONS = {
    start(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s, y + s * 0.7); c.lineTo(x - s, y + s * 0.7); c.closePath(); c.fill(); },
    chest(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x - s, y - s * 0.5, s * 2, s * 1.3); c.fillStyle = darker(col, 0.45); c.fillRect(x - s, y - s * 0.5, s * 2, s * 0.45); c.fillStyle = '#fff'; c.fillRect(x - s * 0.18, y - s * 0.2, s * 0.36, s * 0.5); },
    drop(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x + s, y + s * 0.2, x, y + s); c.quadraticCurveTo(x - s, y + s * 0.2, x, y - s); c.fill(); },
    coin(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); c.fillStyle = darker(col, 0.55); c.font = 'bold ' + Math.round(s * 1.5) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', x, y + 1); },
    anvil(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x - s, y - s * 0.7, s * 2, s * 0.7); c.fillRect(x - s * 0.5, y, s, s * 0.5); c.fillRect(x - s * 0.9, y + s * 0.5, s * 1.8, s * 0.4); },
    secret(c, x, y, s, col) { c.fillStyle = col; c.font = 'bold ' + Math.round(s * 2.2) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', x, y + 1); },
    camp(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x + s, y, x + s * 0.5, y + s); c.lineTo(x - s * 0.5, y + s); c.quadraticCurveTo(x - s, y, x, y - s); c.fill(); },
    spikes(c, x, y, s, col) { c.fillStyle = col; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * s * 0.7 - s * 0.35, y + s * 0.8); c.lineTo(x + i * s * 0.7, y - s * 0.8); c.lineTo(x + i * s * 0.7 + s * 0.35, y + s * 0.8); c.fill(); } },
    curse(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = Math.max(1.5, s * 0.3); c.beginPath(); c.arc(x, y, s * 0.8, 0, TAU); c.moveTo(x - s * 0.55, y - s * 0.55); c.lineTo(x + s * 0.55, y + s * 0.55); c.stroke(); },
    ghost(c, x, y, s, col) { c.fillStyle = col; shape(c, 'ghost', x, y, s * 0.9, 0, 0); c.fill(); c.fillStyle = '#223'; c.fillRect(x - s * 0.4, y - s * 0.3, s * 0.25, s * 0.3); c.fillRect(x + s * 0.15, y - s * 0.3, s * 0.25, s * 0.3); },
    shrine(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.8, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.8, y); c.closePath(); c.fill(); },
    mystery(c, x, y, s, col) { ICONS.chest(c, x, y, s, col); c.fillStyle = '#000'; c.font = 'bold ' + Math.round(s * 1.4) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', x, y + s * 0.2); },
    devil(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x - s, y - s * 0.7); c.lineTo(x + s, y - s * 0.7); c.lineTo(x, y + s); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x - s, y - s * 0.7); c.lineTo(x - s * 0.7, y - s * 1.2); c.lineTo(x - s * 0.3, y - s * 0.7); c.moveTo(x + s, y - s * 0.7); c.lineTo(x + s * 0.7, y - s * 1.2); c.lineTo(x + s * 0.3, y - s * 0.7); c.fill(); },
    swords(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = Math.max(1.5, s * 0.28); c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y + s); c.moveTo(x + s, y - s); c.lineTo(x - s, y + s); c.stroke(); },
    dice(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x - s * 0.9, y - s * 0.9, s * 1.8, s * 1.8); c.fillStyle = '#222'; for (const [a, b] of [[-0.45, -0.45], [0.45, -0.45], [0, 0], [-0.45, 0.45], [0.45, 0.45]]) { c.beginPath(); c.arc(x + a * s, y + b * s, s * 0.2, 0, TAU); c.fill(); } },
    skull(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y - s * 0.15, s * 0.9, 0, TAU); c.fill(); c.fillRect(x - s * 0.5, y + s * 0.4, s, s * 0.6); c.fillStyle = '#200'; c.beginPath(); c.arc(x - s * 0.35, y - s * 0.2, s * 0.25, 0, TAU); c.arc(x + s * 0.35, y - s * 0.2, s * 0.25, 0, TAU); c.fill(); },
    bigskull(c, x, y, s, col) { ICONS.skull(c, x, y + s * 0.15, s * 1.15, col); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(x - s, y - s * 0.7); c.lineTo(x - s * 0.5, y - s * 1.35); c.lineTo(x, y - s * 0.8); c.lineTo(x + s * 0.5, y - s * 1.35); c.lineTo(x + s, y - s * 0.7); c.closePath(); c.fill(); },
    key(c, x, y, s, col) { c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(1.5, s * 0.3); c.beginPath(); c.arc(x - s * 0.5, y, s * 0.5, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + s, y); c.moveTo(x + s * 0.6, y); c.lineTo(x + s * 0.6, y + s * 0.5); c.moveTo(x + s, y); c.lineTo(x + s, y + s * 0.5); c.stroke(); },
    bosskey(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.arc(x - s * 0.55, y, s * 0.65, 0, TAU); c.fill(); c.fillStyle = '#300'; ICONS.skull(c, x - s * 0.55, y, s * 0.4, '#300'); c.fillStyle = col; c.fillRect(x, y - s * 0.15, s * 1.1, s * 0.3); c.fillRect(x + s * 0.6, y, s * 0.28, s * 0.6); c.fillRect(x + s * 1.0, y, s * 0.2, s * 0.45); },
    switch(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x - s * 0.9, y + s * 0.2, s * 1.8, s * 0.6); c.strokeStyle = col; c.lineWidth = Math.max(1.5, s * 0.3); c.beginPath(); c.moveTo(x, y + s * 0.3); c.lineTo(x + s * 0.6, y - s * 0.8); c.stroke(); },
    altar(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x - s, y, s * 2, s * 0.8); c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.5, y); c.lineTo(x - s * 0.5, y); c.fill(); },
    bomb(c, x, y, s, col) { c.fillStyle = '#222'; c.beginPath(); c.arc(x, y + s * 0.15, s * 0.75, 0, TAU); c.fill(); c.strokeStyle = col; c.lineWidth = Math.max(1.5, s * 0.25); c.beginPath(); c.moveTo(x + s * 0.3, y - s * 0.5); c.quadraticCurveTo(x + s * 0.6, y - s, x + s * 0.9, y - s * 0.8); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(x + s * 0.9, y - s * 0.8, s * 0.2, 0, TAU); c.fill(); },
    lock(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x - s * 0.7, y - s * 0.1, s * 1.4, s * 0.9); c.strokeStyle = col; c.lineWidth = Math.max(1.5, s * 0.3); c.beginPath(); c.arc(x, y - s * 0.1, s * 0.5, Math.PI, 0); c.stroke(); },
    q(c, x, y, s, col) { ICONS.secret(c, x, y, s, col); },
    stairs(c, x, y, s, col) { c.fillStyle = col; for (let i = 0; i < 4; i++) c.fillRect(x - s + i * s * 0.5, y - s + i * s * 0.5, s * 2 - i * s * 0.5, s * 0.5); },
    weapon(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = Math.max(2, s * 0.35); c.beginPath(); c.moveTo(x - s * 0.8, y + s * 0.8); c.lineTo(x + s * 0.8, y - s * 0.8); c.stroke(); },
  };
  ED.icons = { draw(c, name, x, y, s, col) { const f = ICONS[name]; if (f) f(c, x, y, s, col || '#fff'); }, ICONS };

  /** floating glyph for any item (pedestals, shop, HUD) */
  function itemGlyph(c, it, x, y, s, t) {
    const col = ED.items.itemColor(it);
    if (it.cat === 'weapon') {
      const k = ED.items.WEAPONS[it.type].kind, wc = ED.items.WEAPONS[it.type].color;
      c.save(); c.translate(x, y); c.strokeStyle = wc; c.fillStyle = wc; c.lineWidth = Math.max(2, s * 0.22);
      switch (k) {
        case 'sword': c.rotate(-Math.PI / 4); c.fillRect(-s * 0.1, -s * 0.9, s * 0.2, s * 1.4); c.fillRect(-s * 0.4, s * 0.45, s * 0.8, s * 0.14); c.fillRect(-s * 0.1, s * 0.55, s * 0.2, s * 0.35); break;
        case 'spear': c.rotate(-Math.PI / 4); c.fillRect(-s * 0.06, -s * 0.7, s * 0.12, s * 1.7); c.beginPath(); c.moveTo(0, -s * 1.1); c.lineTo(s * 0.25, -s * 0.5); c.lineTo(-s * 0.25, -s * 0.5); c.fill(); break;
        case 'hammer': c.rotate(-Math.PI / 4); c.fillRect(-s * 0.08, -s * 0.4, s * 0.16, s * 1.4); c.fillRect(-s * 0.5, -s * 0.9, s, s * 0.6); break;
        case 'daggers': c.rotate(-0.4); c.fillRect(-s * 0.5, -s * 0.7, s * 0.14, s * 0.9); c.fillRect(s * 0.3, -s * 0.5, s * 0.14, s * 0.9); break;
        case 'bow': c.beginPath(); c.arc(-s * 0.3, 0, s * 0.9, -1.1, 1.1); c.stroke(); c.beginPath(); c.moveTo(-s * 0.3 + Math.cos(1.1) * s * 0.9, Math.sin(1.1) * s * 0.9); c.lineTo(-s * 0.3 + Math.cos(-1.1) * s * 0.9, Math.sin(-1.1) * s * 0.9); c.lineWidth = 1; c.stroke(); break;
        case 'boomerang': c.rotate((t || 0) * 0.05); c.beginPath(); c.moveTo(-s * 0.8, -s * 0.3); c.lineTo(0, s * 0.5); c.lineTo(s * 0.8, -s * 0.3); c.stroke(); break;
        case 'staff': c.rotate(-Math.PI / 4); c.fillRect(-s * 0.06, -s * 0.6, s * 0.12, s * 1.6); c.beginPath(); c.arc(0, -s * 0.8, s * 0.3, 0, TAU); c.fill(); break;
        default: { const wi = ED.weaponImpl[k]; if (wi && wi.glyph) wi.glyph(c, s, t || 0); }
      }
      c.restore();
    } else if (it.cat === 'armor') {
      c.fillStyle = col; c.beginPath();
      if (it.slot === 'helmet') { c.arc(x, y, s * 0.8, Math.PI, 0); c.lineTo(x + s * 0.8, y + s * 0.5); c.lineTo(x - s * 0.8, y + s * 0.5); }
      else if (it.slot === 'chest') { c.moveTo(x - s * 0.8, y - s * 0.7); c.lineTo(x + s * 0.8, y - s * 0.7); c.lineTo(x + s * 0.6, y + s * 0.8); c.lineTo(x - s * 0.6, y + s * 0.8); }
      else { c.moveTo(x - s * 0.6, y - s * 0.7); c.lineTo(x + s * 0.2, y - s * 0.7); c.lineTo(x + s * 0.2, y + s * 0.1); c.lineTo(x + s * 0.8, y + s * 0.4); c.lineTo(x + s * 0.8, y + s * 0.8); c.lineTo(x - s * 0.6, y + s * 0.8); }
      c.closePath(); c.fill(); c.strokeStyle = darker(col, 0.5); c.lineWidth = 1.5; c.stroke();
    } else if (it.cat === 'active') {
      const def = ED.items.ACTIVES[it.id];
      c.fillStyle = def.color; c.beginPath(); c.arc(x, y, s * 0.75, 0, TAU); c.fill(); c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, y, s * 0.95, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.font = 'bold ' + Math.round(s) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Q', x, y + 1);
    } else {
      const r = ED.items.relic(it.id); const rc = r ? r.color : col;
      c.fillStyle = rc; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.8, y - s * 0.1); c.lineTo(x, y + s); c.lineTo(x - s * 0.8, y - s * 0.1); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.3, y - s * 0.1); c.lineTo(x, y + s * 0.2); c.lineTo(x - s * 0.3, y - s * 0.1); c.closePath(); c.fill();
      c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.8, y - s * 0.1); c.lineTo(x, y + s); c.lineTo(x - s * 0.8, y - s * 0.1); c.closePath(); c.stroke();
    }
  }

  // ================================================================== tile layer cache
  function buildTileCache(g, room) {
    const th = g.theme, tiles = room.tiles;
    let cv = room.cache;
    if (!cv) { cv = room.cache = document.createElement('canvas'); cv.width = C.ROOM_W; cv.height = C.ROOM_H; ED.stats.caches++; }
    const c = cv.getContext('2d');
    c.clearRect(0, 0, C.ROOM_W, C.ROOM_H);
    const at = (x, y) => (x < 0 || y < 0 || x >= C.COLS || y >= C.ROWS) ? T.WALL : tiles[y * C.COLS + x];
    const rnd = (x, y, k) => { const h = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); };
    const bossT = room.type === 'boss' ? room.bossDef : null;
    for (let y = 0; y < C.ROWS; y++) for (let x = 0; x < C.COLS; x++) {
      const t = at(x, y), px = x * TILE, py = y * TILE;
      if (t === T.WALL) {
        c.fillStyle = th.wall; c.fillRect(px, py, TILE, TILE);
        const below = at(x, y + 1) !== T.WALL;
        c.fillStyle = th.wallTop; c.fillRect(px, py, TILE, below ? TILE - 10 : TILE);
        if (below) { c.fillStyle = darker(th.wall, 0.25); c.fillRect(px, py + TILE - 10, TILE, 10); c.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 2; k++) c.fillRect(px + (k * 16 + (y % 2) * 8) % TILE, py + TILE - 10, 1, 10); }
        c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(px, py, TILE, 2);
        if (rnd(x, y, 1) > 0.8) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(px + rnd(x, y, 2) * 20, py + rnd(x, y, 3) * 14, 8, 4); }
        continue;
      }
      // floor base
      const base = (x + y) % 2 ? th.floorA : th.floorB;
      c.fillStyle = base; c.fillRect(px, py, TILE, TILE);
      const v = rnd(x, y, 4);
      c.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)'; c.fillRect(px, py, TILE, TILE);
      if (v > 0.93) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(px + 6, py + 10, 10, 2); c.fillRect(px + 12, py + 12, 2, 8); }
      if (v < 0.04) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.arc(px + 16, py + 16, 3 + v * 40, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1; c.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      switch (t) {
        case T.RUG: c.fillStyle = 'rgba(160,40,60,0.55)'; c.fillRect(px, py, TILE, TILE); c.strokeStyle = 'rgba(255,210,100,0.5)'; c.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6); break;
        case T.PIT: {
          c.fillStyle = '#06050a'; c.fillRect(px, py, TILE, TILE);
          const g2 = c.createLinearGradient(px, py, px, py + TILE); g2.addColorStop(0, 'rgba(60,50,90,0.35)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(px, py, TILE, TILE);
          if (at(x, y - 1) !== T.PIT) { c.fillStyle = th.wallTop; c.fillRect(px, py, TILE, 3); }
          if (at(x - 1, y) !== T.PIT) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(px, py, 2, TILE); }
          break;
        }
        case T.SPIKE: c.fillStyle = '#2a2a34'; c.fillRect(px + 2, py + 2, TILE - 4, TILE - 4); c.fillStyle = '#9a9aa8'; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { c.beginPath(); c.moveTo(px + 4 + a * 14, py + 15 + b * 14); c.lineTo(px + 10 + a * 14, py + 3 + b * 14); c.lineTo(px + 16 + a * 14, py + 15 + b * 14); c.fill(); } break;
        case T.ROCK: {
          c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(px + 16, py + 27, 14, 5, 0, 0, TAU); c.fill();
          c.fillStyle = darker(th.wall, 0.3); c.beginPath(); c.roundRect ? c.roundRect(px + 2, py + 4, 28, 24, 7) : c.rect(px + 2, py + 4, 28, 24); c.fill();
          c.fillStyle = th.wallTop; c.beginPath(); c.roundRect ? c.roundRect(px + 2, py + 2, 28, 18, 7) : c.rect(px + 2, py + 2, 28, 18); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(px + 7, py + 5, 10, 3);
          break;
        }
        case T.DOOR: case T.CRACK: c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(px, py, TILE, TILE); break;
      }
    }
    // ambient edge shading
    const gr = c.createLinearGradient(0, 0, 0, C.ROOM_H);
    gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.15, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)');
    c.fillStyle = gr; c.fillRect(0, 0, C.ROOM_W, C.ROOM_H);
    // dynamic tile list
    const dyn = [];
    for (let i = 0; i < tiles.length; i++) { const t = tiles[i]; if (t === T.WATER || t === T.LAVA || t === T.ICE || t === T.SPIKE) dyn.push(i); }
    room.rt.dynTiles = dyn; room.rt.dirty = false;
  }

  // ================================================================== doors
  const DOOR_RECT = { N: [14 * 32, 0, 64, 32], S: [14 * 32, 17 * 32, 64, 32], W: [0, 8 * 32, 32, 64], E: [29 * 32, 8 * 32, 32, 64] };
  function drawDoors(g, c) {
    const room = g.room, t = g.frameAll;
    for (const d of DIRS) {
      const st = g.doorState(room, d);
      if (st === 'wall') continue;
      const [x, y, w, h] = DOOR_RECT[d];
      const e = room.doors[d];
      const other = e ? g.floor.rooms[e.a === room.id ? e.b : e.a] : null;
      const horiz = d === 'N' || d === 'S';
      // doorway recess
      c.fillStyle = '#05040a'; c.fillRect(x, y, w, h);
      if (st === 'open') {
        const gr = horiz ? c.createLinearGradient(0, y, 0, y + h) : c.createLinearGradient(x, 0, x + w, 0);
        const a = (d === 'N' || d === 'W') ? 0 : 1, b = 1 - a; gr.addColorStop(a, 'rgba(120,120,160,0.18)'); gr.addColorStop(b, 'rgba(0,0,0,0.6)');
        c.fillStyle = gr; c.fillRect(x, y, w, h);
        c.strokeStyle = g.theme.wallTop; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      } else if (st === 'closed') {
        c.fillStyle = '#2a2230'; c.fillRect(x, y, w, h); c.strokeStyle = '#8a8aa0'; c.lineWidth = 3;
        for (let k = 1; k < 5; k++) { c.beginPath(); if (horiz) { c.moveTo(x + k * w / 5, y); c.lineTo(x + k * w / 5, y + h); } else { c.moveTo(x, y + k * h / 5); c.lineTo(x + w, y + k * h / 5); } c.stroke(); }
        c.strokeStyle = '#c04040'; c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      } else if (st === 'locked') {
        const def = ED.keys.LOCKS[e.lock.type];
        c.fillStyle = darker(def.color, 0.65); c.fillRect(x, y, w, h);
        c.strokeStyle = def.color; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
        const cx = x + w / 2, cy = y + h / 2;
        c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.arc(cx, cy, 13, 0, TAU); c.fill();
        ICONS.lock(c, cx, cy - 1, 8, def.color);
        if (e.lock.type === 'boss') { c.strokeStyle = 'rgba(255,60,80,' + (0.4 + 0.3 * Math.sin(t * 0.1)) + ')'; c.lineWidth = 2; c.strokeRect(x - 1, y - 1, w + 2, h + 2); }
      } else if (st === 'bomb') {
        c.fillStyle = '#4a3a30'; c.fillRect(x, y, w, h);
        c.strokeStyle = 'rgba(255,138,60,' + (0.5 + 0.4 * Math.sin(t * 0.12)) + ')'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + 4, y + 6); c.lineTo(x + w * 0.5, y + h * 0.4); c.lineTo(x + w * 0.4, y + h * 0.7); c.lineTo(x + w - 6, y + h - 6); c.stroke();
        ICONS.bomb(c, x + w / 2, y + h / 2, 8, '#ff8a3c');
      } else if (st === 'hidden') {
        // wall with a faint suspicious crack
        c.fillStyle = g.theme.wallTop; c.fillRect(x, y, w, h);
        c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + w * 0.2, y + 4); c.lineTo(x + w * 0.5, y + h * 0.45); c.lineTo(x + w * 0.35, y + h * 0.6); c.lineTo(x + w * 0.7, y + h - 4); c.stroke();
        if (g.player.relics.thirdeye) { c.strokeStyle = 'rgba(199,139,255,' + (0.5 + 0.4 * Math.sin(t * 0.1)) + ')'; c.lineWidth = 2; c.strokeRect(x, y, w, h); }
        continue;
      }
      // destination icon (appears once adjacent / revealed)
      if (other && (other.discovered || other.visited) && st !== 'closed') {
        const tp = g.knownType(other);
        const info = ED.roomTypes[tp];
        if (info && info.icon) {
          const cx = x + w / 2 + (horiz ? 0 : (d === 'W' ? 24 : -24)), cy = y + h / 2 + (horiz ? (d === 'N' ? 24 : -24) : 0);
          c.fillStyle = 'rgba(0,0,0,0.55)'; c.beginPath(); c.arc(cx, cy, 11, 0, TAU); c.fill();
          ICONS[info.icon] && ICONS[info.icon](c, cx, cy, 7, info.color);
        }
      }
    }
  }

  // ================================================================== zones (telegraphs)
  function drawZone(c, z, t) {
    const prog = z.kind === 'tele' ? U.clamp(z.t / Math.max(1, z.dur), 0, 1) : 1;
    const col = z.color || '#ff4a4a';
    const harmless = z.hurts === false && !z.hurtsEnemies;
    const fa = z.kind === 'tele' ? (harmless ? 0.1 + 0.15 * prog : 0.12 + 0.3 * prog) : 0.28;
    const pulse = 0.7 + 0.3 * Math.sin(t * 0.4);
    c.save();
    c.fillStyle = U.rgba(col, fa); c.strokeStyle = U.rgba(col, harmless ? 0.5 : 0.9 * pulse); c.lineWidth = 2;
    switch (z.shape) {
      case 'circle':
        c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); c.stroke();
        if (z.kind === 'tele') { c.fillStyle = U.rgba(col, 0.35); c.beginPath(); c.arc(z.x, z.y, z.r * prog, 0, TAU); c.fill(); }
        else if (z.kind === 'hazard') { c.fillStyle = U.rgba(col, 0.12 + 0.1 * Math.sin(t * 0.15)); c.beginPath(); c.arc(z.x, z.y, z.r * 0.8, 0, TAU); c.fill(); }
        break;
      case 'ring': {
        const w = z.w || 20, r = Math.max(1, z.r);
        if (z.gaps && z.gaps.length && z.kind === 'ring') {
          // draw ring as arcs between gaps
          const g0 = z.gaps.map(g => ({ a: ((g.a % TAU) + TAU) % TAU, w: g.w })).sort((a, b) => a.a - b.a);
          c.lineWidth = w; c.strokeStyle = U.rgba(col, 0.75);
          for (let i = 0; i < g0.length; i++) { const s = g0[i].a + g0[i].w / 2, e2 = (g0[(i + 1) % g0.length].a - g0[(i + 1) % g0.length].w / 2) + (i === g0.length - 1 ? TAU : 0); if (e2 > s) { c.beginPath(); c.arc(z.x, z.y, r, s, e2); c.stroke(); } }
          c.lineWidth = 2; c.strokeStyle = U.rgba('#ffffff', 0.5); for (let i = 0; i < g0.length; i++) { const s = g0[i].a + g0[i].w / 2, e2 = (g0[(i + 1) % g0.length].a - g0[(i + 1) % g0.length].w / 2) + (i === g0.length - 1 ? TAU : 0); if (e2 > s) { c.beginPath(); c.arc(z.x, z.y, r, s, e2); c.stroke(); } }
        } else { c.lineWidth = w; c.strokeStyle = U.rgba(col, z.kind === 'ring' ? 0.7 : 0.35 + 0.3 * prog); c.beginPath(); c.arc(z.x, z.y, r, 0, TAU); c.stroke(); }
        break;
      }
      case 'line': {
        const dx = z.x2 - z.x, dy = z.y2 - z.y, len = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
        c.translate(z.x, z.y); c.rotate(a);
        if (z.beam && z.kind === 'hazard') { c.fillStyle = U.rgba(col, 0.55); c.fillRect(0, -z.w / 2, len, z.w); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(0, -z.w / 5, len, z.w / 2.5); }
        else { c.fillRect(0, -z.w / 2, len, z.w); c.strokeRect(0, -z.w / 2, len, z.w); if (z.kind === 'tele') { c.fillStyle = U.rgba(col, 0.35); c.fillRect(0, -z.w / 2, len * prog, z.w); } }
        break;
      }
      case 'cone': {
        c.beginPath(); c.moveTo(z.x, z.y); c.arc(z.x, z.y, z.r, z.ang - z.arc / 2, z.ang + z.arc / 2); c.closePath(); c.fill(); c.stroke();
        if (z.kind === 'tele') { c.fillStyle = U.rgba(col, 0.35); c.beginPath(); c.moveTo(z.x, z.y); c.arc(z.x, z.y, z.r * prog, z.ang - z.arc / 2, z.ang + z.arc / 2); c.closePath(); c.fill(); }
        break;
      }
      case 'rect': c.fillRect(z.x, z.y, z.w, z.h); c.strokeRect(z.x, z.y, z.w, z.h); if (z.kind === 'tele') { c.fillStyle = U.rgba(col, 0.3); c.fillRect(z.x, z.y, z.w, z.h * prog); } break;
      case 'screen':
        c.fillStyle = U.rgba('#ff2a3a', 0.12 + 0.3 * prog * pulse); c.fillRect(0, 0, C.ROOM_W, C.ROOM_H);
        for (const s of z.safe || []) { c.fillStyle = 'rgba(80,255,160,0.28)'; c.strokeStyle = 'rgba(160,255,200,0.95)'; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); c.stroke(); }
        break;
      case 'tiles': {
        c.fillStyle = U.rgba(col, 0.15 + 0.35 * prog * pulse);
        for (const i of z.tiles) c.fillRect((i % C.COLS) * TILE, Math.floor(i / C.COLS) * TILE, TILE, TILE);
        break;
      }
    }
    c.restore();
  }

  // ================================================================== props, inters, pickups
  function drawProp(c, pr, t) {
    if (pr.dead) return;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(pr.x, pr.y + 8, 11, 5, 0, 0, TAU); c.fill();
    if (pr.type === 'crate') { c.fillStyle = '#8a6a3a'; c.fillRect(pr.x - 11, pr.y - 11, 22, 22); c.strokeStyle = '#4a3a1a'; c.lineWidth = 2; c.strokeRect(pr.x - 10, pr.y - 10, 20, 20); c.beginPath(); c.moveTo(pr.x - 10, pr.y - 10); c.lineTo(pr.x + 10, pr.y + 10); c.moveTo(pr.x + 10, pr.y - 10); c.lineTo(pr.x - 10, pr.y + 10); c.stroke(); }
    else if (pr.type === 'brazier') {
      c.fillStyle = '#3a3a48'; c.beginPath(); c.moveTo(pr.x - 12, pr.y - 4); c.lineTo(pr.x + 12, pr.y - 4); c.lineTo(pr.x + 7, pr.y + 10); c.lineTo(pr.x - 7, pr.y + 10); c.closePath(); c.fill();
      c.fillStyle = pr.lit ? '#ff9a3c' : '#222'; c.fillRect(pr.x - 10, pr.y - 7, 20, 5);
      if (pr.lit) { glow(c, pr.x, pr.y - 12, 20 + Math.sin(t * 0.3) * 3, '#ff9a3c', 0.35); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(pr.x, pr.y - 22 - Math.sin(t * 0.4) * 3); c.quadraticCurveTo(pr.x + 8, pr.y - 10, pr.x, pr.y - 6); c.quadraticCurveTo(pr.x - 8, pr.y - 10, pr.x, pr.y - 22); c.fill(); }
      else { c.strokeStyle = 'rgba(255,200,100,' + (0.3 + 0.3 * Math.sin(t * 0.15)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(pr.x, pr.y - 8, 14, 0, TAU); c.stroke(); }
    } else {
      c.fillStyle = '#b0703a'; c.beginPath(); c.ellipse(pr.x, pr.y, 10, 11, 0, 0, TAU); c.fill(); c.fillStyle = '#8a5428'; c.fillRect(pr.x - 6, pr.y - 12, 12, 4); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(pr.x - 6, pr.y - 6, 3, 10);
    }
  }

  function drawInter(g, c, it, t) {
    const near = g.nearInter === it;
    const bob = Math.sin(t * 0.07 + it.id) * 2;
    c.save();
    switch (it.type) {
      case 'pedestal': {
        const col = ED.items.itemColor(it.item);
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(it.x, it.y + 14, 18, 7, 0, 0, TAU); c.fill();
        c.fillStyle = it.disabled ? '#3a3a44' : '#5a5a6c'; c.fillRect(it.x - 15, it.y + 4, 30, 12); c.fillStyle = it.disabled ? '#2a2a34' : '#7a7a90'; c.fillRect(it.x - 12, it.y - 2, 24, 8);
        if (!it.disabled) {
          glow(c, it.x, it.y - 10, 22 + (near ? 4 : 0), col, 0.22 + (it.item.curse ? 0.1 : 0));
          itemGlyph(c, it.item, it.x, it.y - 12 + bob, 10, t);
          if (it.item.curse) { c.strokeStyle = 'rgba(255,50,80,' + (0.5 + 0.3 * Math.sin(t * 0.2)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(it.x, it.y - 12, 17, 0, TAU); c.stroke(); }
          if (it.devil) { c.strokeStyle = 'rgba(255,40,60,0.7)'; c.lineWidth = 2; c.strokeRect(it.x - 17, it.y - 28, 34, 46); }
          // price tag
          if (it.price) {
            const txt = it.price.gold !== undefined ? it.price.gold + 'g' : '-' + (it.price.maxHp / 4) + ' ♥max';
            const afford = g.canAfford(it.price);
            c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(it.x - 22, it.y + 18, 44, 15);
            c.fillStyle = it.price.gold !== undefined ? (afford ? '#ffd24a' : '#ff6a6a') : (afford ? '#ff4a5a' : '#884455'); c.fillText(txt, it.x, it.y + 30);
          }
        } else { c.strokeStyle = '#999'; c.lineWidth = 2; c.beginPath(); for (let k = -2; k <= 2; k++) { c.moveTo(it.x + k * 7, it.y - 28); c.lineTo(it.x + k * 7, it.y + 6); } c.stroke(); }
        break;
      }
      case 'chest': {
        const col = it.color || '#c89a5a';
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(it.x, it.y + 14, 22, 7, 0, 0, TAU); c.fill();
        c.fillStyle = it.mystery ? '#6a2a7a' : '#8a5a2a'; c.fillRect(it.x - 20, it.y - 8, 40, 22);
        c.fillStyle = it.mystery ? '#a050c0' : '#b07a3a'; c.beginPath(); c.moveTo(it.x - 20, it.y - 8); c.quadraticCurveTo(it.x, it.y - 26, it.x + 20, it.y - 8); c.closePath(); c.fill();
        c.fillStyle = col; c.fillRect(it.x - 4, it.y - 6, 8, 10); c.strokeStyle = '#3a2410'; c.lineWidth = 2; c.strokeRect(it.x - 20, it.y - 8, 40, 22);
        if (it.mystery) { c.fillStyle = '#fff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('?', it.x, it.y - 12 + bob); }
        glow(c, it.x, it.y, 28, col, 0.12 + (near ? 0.1 : 0));
        break;
      }
      case 'fountain': {
        c.fillStyle = it.disabledLook ? '#3a4a52' : '#4a6a8a'; c.beginPath(); c.ellipse(it.x, it.y + 6, 34, 16, 0, 0, TAU); c.fill();
        c.fillStyle = it.disabledLook ? '#2a3238' : '#2a4a6a'; c.beginPath(); c.ellipse(it.x, it.y + 4, 28, 12, 0, 0, TAU); c.fill();
        if (!it.disabledLook) { c.fillStyle = 'rgba(120,220,255,0.7)'; for (let k = 0; k < 4; k++) { const a = t * 0.1 + k * 1.6; c.beginPath(); c.arc(it.x + Math.cos(a) * 8, it.y - 14 - Math.abs(Math.sin(a * 1.3)) * 14, 3, 0, TAU); c.fill(); } glow(c, it.x, it.y - 6, 36, '#5fd4ff', 0.15); }
        break;
      }
      case 'camp': {
        c.fillStyle = '#4a3220'; c.fillRect(it.x - 18, it.y + 4, 36, 6); c.fillRect(it.x - 12, it.y - 2, 24, 5);
        if (it.uses > 0) { glow(c, it.x, it.y - 8, 44 + Math.sin(t * 0.2) * 4, '#ff9a3c', 0.22); c.fillStyle = '#ff7a2a'; c.beginPath(); c.moveTo(it.x, it.y - 26 - Math.sin(t * 0.3) * 3); c.quadraticCurveTo(it.x + 14, it.y - 6, it.x, it.y + 2); c.quadraticCurveTo(it.x - 14, it.y - 6, it.x, it.y - 26); c.fill(); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(it.x, it.y - 16); c.quadraticCurveTo(it.x + 7, it.y - 4, it.x, it.y); c.quadraticCurveTo(it.x - 7, it.y - 4, it.x, it.y - 16); c.fill(); }
        else { c.fillStyle = '#6a6a6a'; c.beginPath(); c.arc(it.x, it.y - 2, 6, 0, TAU); c.fill(); }
        break;
      }
      case 'service': case 'anvil': {
        const col = it.color || '#ccc';
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(it.x, it.y + 14, 20, 7, 0, 0, TAU); c.fill();
        c.fillStyle = '#4a4a5c'; c.fillRect(it.x - 17, it.y - 2, 34, 16); c.fillStyle = '#6a6a80'; c.fillRect(it.x - 17, it.y - 4, 34, 6);
        glow(c, it.x, it.y - 14, 16, col, 0.25);
        const nm = it.name || '';
        if (it.type === 'anvil') ICONS.anvil(c, it.x, it.y - 14 + bob, 9, col); else if (nm.indexOf('Heal') === 0) { c.fillStyle = col; heart(c, it.x, it.y - 14 + bob, 6); c.fill(); } else if (nm.indexOf('Bomb') === 0) ICONS.bomb(c, it.x, it.y - 14 + bob, 8, col); else if (nm.indexOf('Sell') === 0) ICONS.coin(c, it.x, it.y - 14 + bob, 8, '#c8c8d8'); else if (nm.indexOf('Re-roll') === 0) { c.fillStyle = col; ICONS.dice(c, it.x, it.y - 14 + bob, 7, col); } else ICONS.key(c, it.x - 2, it.y - 14 + bob, 8, col);
        const price = typeof it.price === 'function' ? it.price() : 0;
        if (it.price && !it.sell) { c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(it.x - 22, it.y + 18, 44, 15); c.fillStyle = g.player.gold >= price ? '#ffd24a' : '#ff6a6a'; c.fillText(price === 0 ? 'FREE' : price + 'g', it.x, it.y + 30); }
        break;
      }
      case 'shrine': case 'altar': {
        const col = it.color, used = it.used || it.disabledLook;
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(it.x, it.y + 16, 24, 8, 0, 0, TAU); c.fill();
        c.fillStyle = used ? '#3a3a44' : '#5a5a70'; c.fillRect(it.x - 18, it.y - 4, 36, 20); c.fillStyle = used ? '#2a2a34' : '#7a7a96'; c.fillRect(it.x - 14, it.y - 14, 28, 12);
        if (!used) { glow(c, it.x, it.y - 24, 20, col, 0.35); c.fillStyle = col; c.beginPath(); c.moveTo(it.x, it.y - 38 + bob); c.lineTo(it.x + 8, it.y - 24 + bob); c.lineTo(it.x, it.y - 12 + bob); c.lineTo(it.x - 8, it.y - 24 + bob); c.closePath(); c.fill(); }
        break;
      }
      case 'dice': {
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(it.x, it.y + 14, 22, 7, 0, 0, TAU); c.fill();
        c.fillStyle = '#2a6a3a'; c.fillRect(it.x - 22, it.y - 4, 44, 18); c.strokeStyle = '#6a4a2a'; c.lineWidth = 3; c.strokeRect(it.x - 22, it.y - 4, 44, 18);
        ICONS.dice(c, it.x + Math.sin(t * 0.1) * 2, it.y - 14 + bob, 8, '#f4f4f4');
        c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(it.x - 22, it.y + 18, 44, 15); c.fillStyle = g.player.gold >= it.price() ? '#ffd24a' : '#ff6a6a'; c.fillText(it.price() + 'g', it.x, it.y + 30);
        break;
      }
      case 'plate': {
        c.fillStyle = it.pressed ? '#1c4a2a' : '#2a6a3a'; c.fillRect(it.x - 16, it.y - 16, 32, 32); c.strokeStyle = it.pressed ? '#3a9a5a' : '#5be37d'; c.lineWidth = 2; c.strokeRect(it.x - 14, it.y - 14, 28, 28);
        if (!it.pressed) { c.fillStyle = 'rgba(91,227,125,' + (0.15 + 0.15 * Math.sin(t * 0.1)) + ')'; c.fillRect(it.x - 14, it.y - 14, 28, 28); } else { c.fillStyle = '#5be37d'; c.beginPath(); c.arc(it.x, it.y, 5, 0, TAU); c.fill(); }
        break;
      }
      case 'stairs': {
        glow(c, it.x, it.y, 46, '#cfd8ff', 0.15 + 0.08 * Math.sin(t * 0.1));
        c.fillStyle = '#1a1a26'; c.beginPath(); c.arc(it.x, it.y, 26, 0, TAU); c.fill();
        for (let k = 0; k < 5; k++) { c.strokeStyle = 'rgba(207,216,255,' + (0.8 - k * 0.14) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(it.x, it.y, 22 - k * 4, k * 0.8 + t * 0.03, k * 0.8 + t * 0.03 + 3.8); c.stroke(); }
        break;
      }
      case 'healfont': { glow(c, it.x, it.y, 26, it.color, 0.25); c.fillStyle = it.color; heart(c, it.x, it.y + bob, 11); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); break; }
      case 'cashout': { glow(c, it.x, it.y, 24, '#ffd24a', 0.25); c.fillStyle = '#ffd24a'; ICONS.coin(c, it.x, it.y + bob, 12, '#ffd24a'); break; }
      case 'keyaltar': { c.fillStyle = '#5a5a70'; c.fillRect(it.x - 14, it.y, 28, 14); glow(c, it.x, it.y - 8, 22, it.color, 0.3); ICONS.key(c, it.x - 2, it.y - 10 + bob, 10, it.color); break; }
      default: break;
    }
    c.restore();
  }

  function drawPickup(c, k, t) {
    const bob = Math.sin(k.bob) * 2;
    if (k.type === 'gold') {
      const w = Math.abs(Math.cos(t * 0.1 + k.bob)) * 5 + 2;
      c.fillStyle = k.val >= 20 ? '#ff9ad0' : k.val >= 5 ? '#c8d8ff' : '#ffd24a'; c.beginPath(); c.ellipse(k.x, k.y + bob, w, 6, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.stroke();
    } else if (k.type === 'heart') { c.fillStyle = '#ff4a6a'; heart(c, k.x, k.y + bob, 6); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); glow(c, k.x, k.y, 14, '#ff4a6a', 0.15); }
    else if (k.type === 'bomb') { ICONS.bomb(c, k.x, k.y + bob, 7, '#ff9a3c'); }
    else if (k.type === 'key') { const kt = ED.keys.KEYTYPES[k.keyType]; glow(c, k.x, k.y, 20, kt.color, 0.3 + 0.1 * Math.sin(t * 0.2)); (k.keyType === 'boss' ? ICONS.bosskey : ICONS.key)(c, k.x - 3, k.y + bob, 9, kt.color); }
    else if (k.type === 'container') { c.fillStyle = '#ff2a5a'; heart(c, k.x, k.y + bob, 10); c.fill(); glow(c, k.x, k.y, 22, '#ff2a5a', 0.25); }
  }

  // ================================================================== enemies
  function drawEnemy(g, c, e, t) {
    if (e.boss) return drawBoss(g, c, e, t);
    const def = e.def;
    const a = e.vis === undefined ? 1 : e.vis;
    if (a <= 0.01) return;
    c.save(); c.globalAlpha = a;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.8, e.r * 0.9, e.r * 0.35, 0, 0, TAU); c.fill();
    const slow = e.status && e.status.slow, burn = e.status && e.status.burn;
    // elite aura
    if (e.elite) {
      const mc = e.mods.length ? e.mods[0].color : '#ffd24a';
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.12);
      glow(c, e.x, e.y, e.r * 1.9, mc, 0.18 + 0.1 * pulse);
      c.strokeStyle = U.rgba(mc, 0.9); c.lineWidth = 2.5; c.beginPath(); c.arc(e.x, e.y, e.r + 4 + pulse * 2, 0, TAU); c.stroke();
    }
    // windup warnings
    if ((e.state === 'wind' || e.state === 'aim' || e.state === 'throw' || e.state === 'cast' || e.state === 'fade') && !e.boss) {
      const ang = e.cAng !== undefined && def.id === 'charger' ? e.cAng : e.lAng !== undefined && def.id === 'lancer' ? e.lAng : null;
      if (ang !== null) {
        const len = def.id === 'charger' ? 300 : 210;
        c.strokeStyle = 'rgba(255,70,70,' + (0.35 + 0.3 * Math.sin(t * 0.5)) + ')'; c.lineWidth = e.r * 1.4; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + Math.cos(ang) * len, e.y + Math.sin(ang) * len); c.stroke();
      }
      c.fillStyle = '#ff4a4a'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.fillText('!', e.x, e.y - e.r - 8);
    }
    const body = e.flash > 0 ? '#ffffff' : (slow ? U.mix(e.color, '#7fd8ff', 0.5) : e.color);
    c.fillStyle = body; c.strokeStyle = darker(e.color, 0.5); c.lineWidth = 2;
    const sc = e.state === 'wind' ? 1 + 0.06 * Math.sin(t * 0.8) : 1;
    shape(c, def.shape, e.x, e.y, e.r * sc, e.face || 0, e.t); c.fill(); c.stroke();
    if (e.flash <= 0) { c.fillStyle = 'rgba(255,255,255,0.18)'; shape(c, def.shape, e.x - e.r * 0.2, e.y - e.r * 0.25, e.r * 0.55, e.face || 0, e.t); c.fill(); }
    if (def.draw && e.flash <= 0) def.draw(c, e, t);
    if (e.shieldArc && e.guardBreak <= 0 && e.state !== 'wind' && e.state !== 'bash') {
      c.strokeStyle = '#cfe4ff'; c.lineWidth = 5; c.beginPath(); c.arc(e.x, e.y, e.r + 5, e.face - e.shieldArc / 2, e.face + e.shieldArc / 2); c.stroke();
      c.strokeStyle = 'rgba(120,160,220,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, e.r + 9, e.face - e.shieldArc / 2, e.face + e.shieldArc / 2); c.stroke();
    } else if (e.shieldArc && e.guardBreak > 0) { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('BROKEN', e.x, e.y - e.r - 6); }
    if (e.ward > 0) { c.strokeStyle = 'rgba(159,196,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, e.r + 7, 0, TAU); c.stroke(); }
    if (burn) { c.fillStyle = 'rgba(255,138,42,0.8)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(e.x + Math.sin(t * 0.3 + k * 2) * e.r * 0.6, e.y - e.r * 0.4 - ((t * 0.8 + k * 7) % 14), 2.5, 0, TAU); c.fill(); } }
    if (e.stun > 0) { c.strokeStyle = '#ffd24a'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { const a2 = t * 0.2 + k * 2.1; c.beginPath(); c.arc(e.x + Math.cos(a2) * e.r * 0.8, e.y - e.r - 4 + Math.sin(a2) * 3, 2.5, 0, TAU); c.stroke(); } }
    c.restore();
    // hp bar for elites / big things
    if ((e.elite || e.maxHp > 80) && e.hp < e.maxHp || e.elite) {
      const w = Math.max(24, e.r * 2); const f = U.clamp(e.hp / e.maxHp, 0, 1);
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(e.x - w / 2, e.y - e.r - 12, w, 4);
      c.fillStyle = e.elite && e.mods.length ? e.mods[0].color : '#ff6a6a'; c.fillRect(e.x - w / 2, e.y - e.r - 12, w * f, 4);
      if (e.elite) { c.font = 'bold 10px monospace'; c.textAlign = 'center'; let x0 = e.x - (e.mods.length - 1) * 5; for (const m of e.mods) { c.fillStyle = m.color; c.fillText(m.glyph, x0, e.y - e.r - 15); x0 += 10; } }
    }
    if (e.carriesKey) { const kt = ED.keys.KEYTYPES[e.carriesKey]; glow(c, e.x, e.y - e.r - 20, 12, kt.color, 0.4); ICONS.key(c, e.x - 2, e.y - e.r - 22 + Math.sin(t * 0.2) * 2, 7, kt.color); }
  }

  // ------------------------------------------------------------------ bosses
  function drawBoss(g, c, e, t) {
    const def = e.bdef, a = e.vis === undefined ? 1 : e.vis;
    c.save(); c.globalAlpha = Math.max(0, a);
    const jump = e.jump || 0;
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(e.x, e.y + e.r * 0.85, e.r * (1 - jump / 140), e.r * 0.3, 0, 0, TAU); c.fill();
    const x = e.x, y = e.y - jump, r = e.r, col = e.flash > 0 ? '#ffffff' : e.color, dk = darker(e.color, 0.5);
    const face = e.face || 0;
    c.lineWidth = 3; c.strokeStyle = dk;
    glow(c, x, y, r * 1.5, e.color, 0.08 + (e.enraged ? 0.12 : 0));
    if (e.enraged) { c.strokeStyle = 'rgba(255,40,40,' + (0.4 + 0.3 * Math.sin(t * 0.3)) + ')'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, r * 1.15, 0, TAU); c.stroke(); c.lineWidth = 3; c.strokeStyle = dk; }
    switch (def.shape) {
      case 'knight': {
        c.fillStyle = darker(e.color, 0.35); c.beginPath(); c.moveTo(x - r * 0.9, y - r * 0.2); c.lineTo(x + r * 0.9, y - r * 0.2); c.lineTo(x + r * 0.6, y + r * 1.05); c.lineTo(x - r * 0.6, y + r * 1.05); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.15, r * 0.82, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#10101c'; c.fillRect(x - r * 0.55, y - r * 0.3, r * 1.1, r * 0.22);
        c.fillStyle = '#ff5a5a'; c.fillRect(x - r * 0.42, y - r * 0.26, r * 0.22, r * 0.12); c.fillRect(x + r * 0.2, y - r * 0.26, r * 0.22, r * 0.12);
        c.fillStyle = e.accent || '#fff'; c.beginPath(); c.moveTo(x, y - r * 1.5); c.lineTo(x + r * 0.2, y - r * 0.85); c.lineTo(x - r * 0.2, y - r * 0.85); c.fill();
        c.save(); c.translate(x, y); c.rotate(face); c.fillStyle = '#e8ecff'; c.fillRect(r * 0.7, -r * 0.1, r * 1.3, r * 0.2); c.fillStyle = '#8a6a3a'; c.fillRect(r * 0.6, -r * 0.3, r * 0.12, r * 0.6); c.restore();
        break;
      }
      case 'mushroom': {
        c.fillStyle = '#e8e0c8'; c.fillRect(x - r * 0.35, y - r * 0.1, r * 0.7, r * 1.05); c.strokeRect(x - r * 0.35, y - r * 0.1, r * 0.7, r * 1.05);
        c.fillStyle = col; c.beginPath(); c.ellipse(x, y - r * 0.2, r * 1.15, r * 0.85, 0, Math.PI, 0); c.lineTo(x + r * 1.15, y - r * 0.1); c.lineTo(x - r * 1.15, y - r * 0.1); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.7)'; for (const [dx, dy, rr] of [[-0.5, -0.65, 0.2], [0.3, -0.8, 0.25], [0.7, -0.4, 0.15], [-0.1, -0.35, 0.14]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); c.fill(); }
        c.fillStyle = '#10201a'; c.beginPath(); c.arc(x - r * 0.18, y + r * 0.25, r * 0.09, 0, TAU); c.arc(x + r * 0.18, y + r * 0.25, r * 0.09, 0, TAU); c.fill();
        break;
      }
      case 'furnace': {
        c.fillStyle = '#3a2a24'; c.fillRect(x - r * 0.95, y - r * 0.7, r * 1.9, r * 1.6); c.strokeRect(x - r * 0.95, y - r * 0.7, r * 1.9, r * 1.6);
        c.fillStyle = col; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.62, 0, TAU); c.fill(); c.fillStyle = '#ffe0a0'; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.34 + Math.sin(t * 0.25) * 2, 0, TAU); c.fill();
        c.fillStyle = '#5a4034'; c.beginPath(); c.moveTo(x - r * 0.95, y - r * 0.7); c.lineTo(x - r * 0.65, y - r * 1.35); c.lineTo(x - r * 0.35, y - r * 0.7); c.moveTo(x + r * 0.95, y - r * 0.7); c.lineTo(x + r * 0.65, y - r * 1.35); c.lineTo(x + r * 0.35, y - r * 0.7); c.fill();
        c.fillStyle = '#ffd24a'; c.fillRect(x - r * 0.55, y - r * 0.45, r * 0.25, r * 0.12); c.fillRect(x + r * 0.3, y - r * 0.45, r * 0.25, r * 0.12);
        break;
      }
      case 'prism': {
        c.fillStyle = col; shape(c, 'diamond', x, y, r, t * 0.01, t); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.5)'; shape(c, 'diamond', x, y, r * 0.55, t * 0.01, t); c.fill();
        c.fillStyle = e.exposed > 0 ? '#ff4a6a' : '#6ad0ff'; c.beginPath(); c.arc(x, y, r * 0.22 + Math.sin(t * 0.2) * 2, 0, TAU); c.fill();
        break;
      }
      case 'colossus': {
        c.fillStyle = darker(e.color, 0.25); c.beginPath(); c.moveTo(x - r * 0.95, y + r * 0.9); c.lineTo(x - r * 0.75, y - r * 0.7); c.lineTo(x - r * 0.3, y - r * 1.0); c.lineTo(x + r * 0.3, y - r * 1.0); c.lineTo(x + r * 0.75, y - r * 0.7); c.lineTo(x + r * 0.95, y + r * 0.9); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.2, r * 0.62, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#ffb04a'; c.fillRect(x - r * 0.38, y - r * 0.32, r * 0.2, r * 0.1); c.fillRect(x + r * 0.18, y - r * 0.32, r * 0.2, r * 0.1);
        c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - r * 0.4, y + r * 0.2); c.lineTo(x - r * 0.1, y + r * 0.5); c.lineTo(x - r * 0.3, y + r * 0.8); c.stroke();
        break;
      }
      case 'hydra': {
        c.fillStyle = darker(e.color, 0.3); c.beginPath(); c.ellipse(x, y + r * 0.3, r * 1.0, r * 0.75, 0, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = col; c.beginPath(); c.ellipse(x, y + r * 0.2, r * 0.8, r * 0.55, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.2)'; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x - r * 0.5 + k * r * 0.2, y + r * 0.35 + Math.sin(t * 0.1 + k) * 3, r * 0.08, 0, TAU); c.fill(); }
        // necks
        for (const p of e.parts || []) if (p.kind === 'head' && !p.dead) { c.strokeStyle = darker(e.color, 0.25); c.lineWidth = r * 0.28; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + p.x) / 2, y - r * 0.5, p.x, p.y); c.stroke(); }
        c.lineCap = 'butt';
        break;
      }
      case 'seraph': {
        c.fillStyle = darker(e.color, 0.35); c.beginPath(); c.arc(x, y, r * 1.05, 0, TAU); c.fill(); c.strokeStyle = dk; c.stroke();
        c.strokeStyle = e.color; c.lineWidth = 3; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x, y, r * (0.5 + k * 0.17), t * 0.01 * (k % 2 ? -1 : 1), t * 0.01 * (k % 2 ? -1 : 1) + 4.2); c.stroke(); }
        c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.3, 0, TAU); c.fill(); c.fillStyle = '#ff5a3a'; c.beginPath(); c.arc(x, y, r * 0.13, 0, TAU); c.fill();
        break;
      }
      case 'skull': c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.15, r * 0.9, 0, TAU); c.fill(); c.stroke(); c.fillRect(x - r * 0.5, y + r * 0.4, r, r * 0.6); c.fillStyle = '#200'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.2, r * 0.25, 0, TAU); c.arc(x + r * 0.35, y - r * 0.2, r * 0.25, 0, TAU); c.fill(); c.fillStyle = '#ff5a5a'; c.fillRect(x - r * 0.38, y - r * 0.24, r * 0.1, r * 0.1); c.fillRect(x + r * 0.28, y - r * 0.24, r * 0.1, r * 0.1); break;
      case 'blob': c.fillStyle = col; shape(c, 'blob', x, y, r, 0, t); c.fill(); c.stroke(); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.8); c.lineTo(x - r * 0.25, y - r * 1.2); c.lineTo(x, y - r * 0.85); c.lineTo(x + r * 0.25, y - r * 1.2); c.lineTo(x + r * 0.5, y - r * 0.8); c.closePath(); c.fill(); c.fillStyle = '#10201a'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.1, r * 0.12, 0, TAU); c.arc(x + r * 0.3, y - r * 0.1, r * 0.12, 0, TAU); c.fill(); break;
      case 'archer': c.fillStyle = col; shape(c, 'tri', x, y, r, face, t); c.fill(); c.stroke(); c.strokeStyle = '#6a4a2a'; c.lineWidth = 3; c.beginPath(); c.arc(x + Math.cos(face) * r * 0.9, y + Math.sin(face) * r * 0.9, r * 0.8, face - 1.2, face + 1.2); c.stroke(); break;
      case 'bull': c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.save(); c.translate(x, y); c.rotate(face); c.beginPath(); c.moveTo(r * 0.6, -r * 0.6); c.lineTo(r * 1.5, -r * 0.9); c.lineTo(r * 0.9, -r * 0.2); c.moveTo(r * 0.6, r * 0.6); c.lineTo(r * 1.5, r * 0.9); c.lineTo(r * 0.9, r * 0.2); c.fill(); c.restore(); c.fillStyle = '#ff5a3a'; c.beginPath(); c.arc(x + Math.cos(face) * r * 0.5 - Math.sin(face) * r * 0.3, y + Math.sin(face) * r * 0.5 + Math.cos(face) * r * 0.3, 3, 0, TAU); c.arc(x + Math.cos(face) * r * 0.5 + Math.sin(face) * r * 0.3, y + Math.sin(face) * r * 0.5 - Math.cos(face) * r * 0.3, 3, 0, TAU); c.fill(); break;
      case 'witch': c.fillStyle = darker(e.color, 0.4); c.beginPath(); c.moveTo(x - r, y + r); c.lineTo(x, y - r * 0.4); c.lineTo(x + r, y + r); c.closePath(); c.fill(); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(x, y - r * 0.3, r * 0.6, 0, TAU); c.fill(); c.fillStyle = '#2a1030'; c.beginPath(); c.moveTo(x - r * 0.95, y - r * 0.5); c.lineTo(x, y - r * 1.9); c.lineTo(x + r * 0.95, y - r * 0.5); c.closePath(); c.fill(); c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(x, y - r * 0.3, r * 0.12, 0, TAU); c.fill(); break;
      case 'spider': c.strokeStyle = '#2a1030'; c.lineWidth = 3; for (let k = 0; k < 4; k++) for (const sgn of [-1, 1]) { const a2 = (k - 1.5) * 0.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sgn * r * 1.4, y + (k - 1.5) * r * 0.6 + Math.sin(t * 0.2 + k) * 3); c.stroke(); } c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r * 0.9, r * 0.75, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#ff3a6a'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x - r * 0.3 + (k % 2) * r * 0.6, y - r * 0.3 + (k >> 1) * r * 0.25, 3, 0, TAU); c.fill(); } break;
      case 'wraith': c.fillStyle = col; shape(c, 'ghost', x, y, r, 0, t); c.fill(); c.stroke(); c.fillStyle = '#103050'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.2, r * 0.18, 0, TAU); c.arc(x + r * 0.3, y - r * 0.2, r * 0.18, 0, TAU); c.fill(); break;
      case 'lich': c.fillStyle = darker(e.color, 0.55); c.beginPath(); c.moveTo(x - r, y + r); c.lineTo(x - r * 0.6, y - r * 0.5); c.lineTo(x + r * 0.6, y - r * 0.5); c.lineTo(x + r, y + r); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#e8e0c8'; c.beginPath(); c.arc(x, y - r * 0.5, r * 0.5, 0, TAU); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(x - r * 0.18, y - r * 0.55, r * 0.1, 0, TAU); c.arc(x + r * 0.18, y - r * 0.55, r * 0.1, 0, TAU); c.fill(); glow(c, x, y + r * 0.2, r * 0.6, e.color, 0.3); break;
      case 'golem': c.fillStyle = col; c.fillRect(x - r, y - r * 0.8, r * 2, r * 1.8); c.strokeRect(x - r, y - r * 0.8, r * 2, r * 1.8); c.fillStyle = darker(e.color, 0.35); c.fillRect(x - r * 0.7, y - r * 1.2, r * 1.4, r * 0.7); c.fillStyle = '#ffb04a'; c.fillRect(x - r * 0.4, y - r * 1.0, r * 0.25, r * 0.15); c.fillRect(x + r * 0.15, y - r * 1.0, r * 0.25, r * 0.15); break;
      case 'hawk': c.fillStyle = col; c.beginPath(); c.moveTo(x + Math.cos(face) * r * 1.3, y + Math.sin(face) * r * 1.3); c.lineTo(x + Math.cos(face + 2.5) * r * 1.8, y + Math.sin(face + 2.5) * r * 1.8); c.lineTo(x + Math.cos(face + Math.PI) * r * 0.5, y + Math.sin(face + Math.PI) * r * 0.5); c.lineTo(x + Math.cos(face - 2.5) * r * 1.8, y + Math.sin(face - 2.5) * r * 1.8); c.closePath(); c.fill(); c.stroke(); glow(c, x, y, r, '#fff6a0', 0.25); break;
      case 'sentry': c.fillStyle = col; shape(c, 'hex', x, y, r, t * 0.01, t); c.fill(); c.stroke(); c.fillStyle = '#2a2010'; c.beginPath(); c.arc(x, y, r * 0.5, 0, TAU); c.fill(); c.fillStyle = '#ff4a4a'; c.beginPath(); c.arc(x + Math.cos(face) * r * 0.2, y + Math.sin(face) * r * 0.2, r * 0.22, 0, TAU); c.fill(); break;
      default: c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
    }
    // multi-part pieces
    if (e.parts) {
      const tp = e.parts.filter(p => !p.dead).sort((a, b) => a.group - b.group)[0];
      for (const p of e.parts) {
        if (p.dead) continue;
        const vul = ED.bosses.partVulnerable(e, p);
        const pc = p.flash > 0 ? '#ffffff' : (p.kind === 'core' ? '#ffd24a' : e.color);
        c.save();
        c.fillStyle = darker(e.color, vul ? 0.1 : 0.35); c.strokeStyle = vul ? '#ffffff' : dk; c.lineWidth = vul ? 3 : 2;
        const fl = p.flash > 0;
        switch (p.kind) {
          case 'plate': c.fillStyle = fl ? '#fff' : (vul ? lighter(e.color, 0.1) : darker(e.color, 0.2)); shape(c, 'hex', p.x, p.y, p.r, 0, t); c.fill(); c.stroke(); break;
          case 'arm': c.fillStyle = fl ? '#fff' : darker(e.color, 0.1); c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = darker(e.color, 0.4); c.beginPath(); c.arc(p.x, p.y, p.r * 0.5, 0, TAU); c.fill(); c.strokeStyle = darker(e.color, 0.2); c.lineWidth = 12; c.beginPath(); c.moveTo(e.x + p.side * e.r * 0.7, e.y); c.lineTo(p.x - p.side * p.r * 0.5, p.y); c.stroke(); break;
          case 'core': c.fillStyle = fl ? '#fff' : (vul ? '#ffd24a' : '#8a7a4a'); c.beginPath(); c.arc(p.x, p.y, p.r * (vul ? 0.55 + 0.05 * Math.sin(t * 0.2) : 0.5), 0, TAU); c.fill(); c.stroke(); if (vul) glow(c, p.x, p.y, p.r * 1.2, '#ffd24a', 0.3); break;
          case 'head': c.fillStyle = fl ? '#fff' : ({ fire: '#e8602a', frost: '#6ac0e8', venom: '#8ae06a' }[p.elem] || e.color); c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#10101c'; c.beginPath(); c.arc(p.x - p.r * 0.3, p.y - p.r * 0.1, p.r * 0.15, 0, TAU); c.arc(p.x + p.r * 0.3, p.y - p.r * 0.1, p.r * 0.15, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(p.x - p.r * 0.5, p.y + p.r * 0.45); c.lineTo(p.x - p.r * 0.3, p.y + p.r * 0.85); c.lineTo(p.x - p.r * 0.1, p.y + p.r * 0.45); c.moveTo(p.x + p.r * 0.5, p.y + p.r * 0.45); c.lineTo(p.x + p.r * 0.3, p.y + p.r * 0.85); c.lineTo(p.x + p.r * 0.1, p.y + p.r * 0.45); c.fill(); break;
          case 'gear': c.fillStyle = fl ? '#fff' : darker(e.color, 0.1); c.translate(p.x, p.y); c.rotate(t * 0.04); c.beginPath(); for (let k = 0; k < 16; k++) { const rr = k % 2 ? p.r * 0.8 : p.r * 1.05; c.lineTo(Math.cos(k * TAU / 16) * rr, Math.sin(k * TAU / 16) * rr); } c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#2a2010'; c.beginPath(); c.arc(0, 0, p.r * 0.3, 0, TAU); c.fill(); break;
          case 'wing': c.fillStyle = fl ? '#fff' : lighter(e.color, 0.15); c.beginPath(); c.moveTo(e.x + p.side * e.r * 0.8, e.y); c.quadraticCurveTo(p.x + p.side * p.r, p.y - p.r * 1.4, p.x + p.side * p.r * 0.6, p.y + p.r * 1.2); c.quadraticCurveTo(p.x, p.y + p.r * 0.2, e.x + p.side * e.r * 0.8, e.y + e.r * 0.3); c.closePath(); c.fill(); c.stroke(); break;
          case 'shard': c.fillStyle = fl ? '#fff' : 'rgba(191,232,255,0.85)'; shape(c, 'diamond', p.x, p.y, p.r, t * 0.05, t); c.fill(); c.stroke(); break;
        }
        c.restore();
        // part HP bar
        if (p.kind !== 'core' || vul) {
          const w = Math.max(26, p.r * 1.6), f = U.clamp(p.hp / p.maxHp, 0, 1);
          c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(p.x - w / 2, p.y - p.r - 10, w, 4); c.fillStyle = vul ? '#ffd24a' : '#777'; c.fillRect(p.x - w / 2, p.y - p.r - 10, w * f, 4);
        }
        if (p === tp && !e.invuln && e.intro <= 0) { c.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(t * 0.2)) + ')'; c.lineWidth = 2; c.setLineDash([6, 5]); c.beginPath(); c.arc(p.x, p.y, p.r + 8, 0, TAU); c.stroke(); c.setLineDash([]); }
      }
    }
    // invulnerable shimmer
    if (e.invuln && e.intro <= 0) { c.strokeStyle = 'rgba(160,200,255,0.5)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r + 6, 0, TAU); c.stroke(); }
    c.restore();
  }

  // ================================================================== player
  function drawPlayer(g, c, p, t) {
    if (p.dead && g.dying && g.dying.t > 30) return;
    const flick = p.inv > 0 && p.dashIframes <= 0 && Math.floor(p.inv / 4) % 2 === 0;
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(p.x, p.y + 9, 10, 4, 0, 0, TAU); c.fill();
    if (flick) c.globalAlpha = 0.4;
    const cls = ED.items.CLASSES[p.classId] || ED.items.CLASSES.knight;
    const col = p.flash > 0 ? '#ffffff' : cls.color;
    const bobY = Math.sin(p.step) * 1.2;
    if (p.dashIframes > 0) { c.strokeStyle = 'rgba(160,220,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 15, 0, TAU); c.stroke(); }
    if (p.bashT > 0) { c.fillStyle = 'rgba(143,196,255,0.4)'; c.beginPath(); c.arc(p.x, p.y, 22, 0, TAU); c.fill(); }
    // armor tints
    c.fillStyle = col; c.strokeStyle = '#10101c'; c.lineWidth = 2;
    c.beginPath(); c.arc(p.x, p.y + bobY, p.r, 0, TAU); c.fill(); c.stroke();
    if (p.armor.chest) { c.strokeStyle = ED.items.itemColor(p.armor.chest); c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y + bobY, p.r - 2, 0.5, 2.6); c.stroke(); }
    if (p.armor.helmet) { c.fillStyle = ED.items.itemColor(p.armor.helmet); c.beginPath(); c.arc(p.x, p.y + bobY - 3, p.r - 3, Math.PI * 1.1, Math.PI * 1.9); c.fill(); }
    if (p.armor.boots) { c.fillStyle = ED.items.itemColor(p.armor.boots); c.fillRect(p.x - 6, p.y + bobY + 6, 4, 3); c.fillRect(p.x + 2, p.y + bobY + 6, 4, 3); }
    const a = p.aim;
    // eyes
    c.fillStyle = '#10101c'; const ex = Math.cos(a) * 4, ey = Math.sin(a) * 4;
    c.beginPath(); c.arc(p.x + ex - Math.sin(a) * 3, p.y + bobY + ey + Math.cos(a) * 3 - 1, 1.8, 0, TAU); c.arc(p.x + ex + Math.sin(a) * 3, p.y + bobY + ey - Math.cos(a) * 3 - 1, 1.8, 0, TAU); c.fill();
    // weapon
    const w = p.weapon, wd = ED.items.WEAPONS[w.type], k = wd.kind;
    const hold = p.hammerT > 0 ? (p.hammerAng) : a;
    c.save(); c.translate(p.x, p.y + bobY); c.rotate(hold);
    c.strokeStyle = wd.color; c.fillStyle = wd.color; c.lineWidth = 3;
    if (k === 'sword') { c.fillRect(8, -2, 16, 3); c.fillRect(8, -5, 3, 9); }
    else if (k === 'spear') { c.fillRect(6, -1, 24, 2); c.beginPath(); c.moveTo(34, 0); c.lineTo(28, -4); c.lineTo(28, 4); c.fill(); }
    else if (k === 'hammer') { const raise = p.hammerT > 0 ? -1.2 * (1 - p.hammerT / 15) : 0; c.rotate(raise); c.fillRect(6, -2, 16, 3); c.fillRect(20, -8, 8, 16); }
    else if (k === 'daggers') { c.fillRect(8, -6, 10, 2); c.fillRect(8, 4, 10, 2); }
    else if (k === 'bow') { c.beginPath(); c.arc(8, 0, 11, -1.2, 1.2); c.stroke(); }
    else if (k === 'boomerang') { c.beginPath(); c.moveTo(10, -7); c.lineTo(16, 0); c.lineTo(10, 7); c.stroke(); }
    else if (k === 'staff') { c.fillRect(6, -1, 20, 2); c.beginPath(); c.arc(28, 0, 4, 0, TAU); c.fill(); }
    else { const wi = ED.weaponImpl[k]; if (wi && wi.held) wi.held(c, p, t); }
    c.restore();
    c.restore();
    // orbit blades
    for (const o of p.orbPos) { c.save(); c.translate(o.x, o.y); c.rotate(o.a + Math.PI / 2); c.fillStyle = '#e8f0ff'; c.beginPath(); c.moveTo(0, -9); c.lineTo(4, 3); c.lineTo(0, 1); c.lineTo(-4, 3); c.closePath(); c.fill(); c.restore(); }
    for (const w2 of p.wisps) { glow(c, w2.x, w2.y, 9, '#9ff3ff', 0.5); c.fillStyle = '#e8ffff'; c.beginPath(); c.arc(w2.x, w2.y, 3, 0, TAU); c.fill(); }
    // dash ready indicator
    if (p.dashCd > 0) { c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(p.x - 10, p.y + 14, 20 * (1 - p.dashCd / Math.max(1, 40 * p.st.dashCd)), 2); }
  }

  // ================================================================== swings + projectiles
  function drawSwing(c, s, t) {
    const k = U.clamp(s.t / s.dur, 0, 1), col = s.crit ? '#ffd24a' : (s.color || '#fff');
    c.save();
    if (s.kind === 'arc') {
      const sweep = s.sweep || 1, a0 = s.ang - s.arc / 2 * sweep, a1 = s.ang + s.arc / 2 * sweep;
      const cur = U.lerp(a0, a1, U.easeOut(Math.min(1, k * 1.8)));
      c.strokeStyle = U.rgba(col, 0.85 * (1 - k)); c.lineWidth = 10 * (1 - k * 0.6);
      c.beginPath(); if (sweep > 0) c.arc(s.x, s.y, s.range * 0.8, a0, cur); else c.arc(s.x, s.y, s.range * 0.8, cur, a0); c.stroke();
      c.strokeStyle = U.rgba('#ffffff', 0.9 * (1 - k)); c.lineWidth = 3; c.beginPath(); if (sweep > 0) c.arc(s.x, s.y, s.range * 0.85, Math.max(a0, cur - 0.5), cur); else c.arc(s.x, s.y, s.range * 0.85, cur, Math.min(a0, cur + 0.5)); c.stroke();
      if (s.spin) { c.strokeStyle = U.rgba(col, 0.4 * (1 - k)); c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, s.range * 0.6, 0, TAU); c.stroke(); }
    } else if (s.kind === 'line') {
      const len = s.len * U.easeOut(Math.min(1, k * 2.2));
      c.translate(s.x, s.y); c.rotate(s.ang); c.fillStyle = U.rgba(col, 0.8 * (1 - k * 0.7));
      c.beginPath(); c.moveTo(10, -3); c.lineTo(len, 0); c.lineTo(10, 3); c.closePath(); c.fill();
      c.fillStyle = U.rgba('#fff', 0.8 * (1 - k)); c.fillRect(len * 0.6, -1.5, len * 0.4, 3);
    } else {
      c.strokeStyle = U.rgba(col, 0.9 * (1 - k)); c.lineWidth = 6 * (1 - k); c.beginPath(); c.arc(s.x, s.y, s.r * U.easeOut(k), 0, TAU); c.stroke();
      c.fillStyle = U.rgba(col, 0.25 * (1 - k)); c.beginPath(); c.arc(s.x, s.y, s.r * U.easeOut(k), 0, TAU); c.fill();
    }
    c.restore();
  }
  function drawEProj(c, b, t) {
    const col = b.color;
    if (b.friendly) { glow(c, b.x, b.y, b.r * 2.2, '#8fc4ff', 0.4); c.fillStyle = '#e8f4ff'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); return; }
    glow(c, b.x, b.y, b.r * 2.1, col, 0.28);
    if (b.kind === 'bolt') { const a = Math.atan2(b.vy, b.vx); c.save(); c.translate(b.x, b.y); c.rotate(a); c.fillStyle = col; c.fillRect(-b.r * 1.6, -b.r * 0.55, b.r * 3.2, b.r * 1.1); c.fillStyle = '#fff'; c.fillRect(-b.r * 0.6, -b.r * 0.25, b.r * 1.6, b.r * 0.5); c.restore(); }
    else if (b.kind === 'orb') { c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y, b.r * (1 + 0.1 * Math.sin(t * 0.3)), 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.4, 0, TAU); c.fill(); }
    else { c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, b.r * 0.45, 0, TAU); c.fill(); }
  }
  function drawPProj(c, b, t) {
    c.save();
    if (b.draw) b.draw(c, b, t);
    else if (b.kind === 'arrow') { const a = Math.atan2(b.vy, b.vx); c.translate(b.x, b.y); c.rotate(a); c.strokeStyle = b.color; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, 0); c.lineTo(7, 0); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(10, 0); c.lineTo(5, -3); c.lineTo(5, 3); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.moveTo(-9, -2); c.lineTo(-13, -4); c.moveTo(-9, 2); c.lineTo(-13, 4); c.stroke(); }
    else if (b.kind === 'orb') { glow(c, b.x, b.y, b.r * 2.4, b.color, 0.35); c.fillStyle = b.color; c.beginPath(); c.arc(b.x, b.y, b.r * (0.9 + 0.1 * Math.sin(t * 0.4)), 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x - 2, b.y - 2, b.r * 0.4, 0, TAU); c.fill(); }
    else if (b.kind === 'boom') { c.translate(b.x, b.y); c.rotate(b.spin || 0); c.strokeStyle = b.color; c.lineWidth = 4; c.beginPath(); c.moveTo(-9, -6); c.lineTo(0, 7); c.lineTo(9, -6); c.stroke(); glow(c, 0, 0, 14, b.color, 0.2); }
    else { glow(c, b.x, b.y, b.r * 2.4, b.color, 0.5); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, b.r * 0.7, 0, TAU); c.fill(); }
    c.restore();
  }
  function drawFx(c, f) {
    const k = f.life / f.max;
    if (f.shape === 'ring') { const r = U.lerp(f.r1, f.size, k); c.strokeStyle = U.rgba(f.color, 0.8 * k); c.lineWidth = f.w * k + 1; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.stroke(); }
    else if (f.shape === 'ghost') { c.fillStyle = U.rgba(f.color, f.alpha * k); c.beginPath(); c.arc(f.x, f.y, f.size * k, 0, TAU); c.fill(); }
    else if (f.shape === 'bolt') { c.strokeStyle = U.rgba(f.color, k); c.lineWidth = 3; c.beginPath(); c.moveTo(f.x, f.y); const n = 5; for (let i = 1; i < n; i++) { const t2 = i / n; c.lineTo(f.x + (f.x2 - f.x) * t2 + U.rnd(-8, 8), f.y + (f.y2 - f.y) * t2 + U.rnd(-8, 8)); } c.lineTo(f.x2, f.y2); c.stroke(); }
    else { c.fillStyle = U.rgba(f.color, Math.min(1, k * 1.4)); const s = f.size * (0.4 + k * 0.6); c.fillRect(f.x - s / 2, f.y - s / 2, s, s); }
  }

  // ================================================================== room-type decor (under entities)
  function drawDecor(g, c, t) {
    const room = g.room, rt = g.rt;
    // type tint rings / rugs
    const info = ED.roomTypes[room.type];
    switch (room.type) {
      case 'shop': c.fillStyle = 'rgba(111,224,138,0.07)'; c.fillRect(220, 170, 520, 270); c.strokeStyle = 'rgba(111,224,138,0.3)'; c.strokeRect(220, 170, 520, 270);
        c.fillStyle = '#8a5a3a'; c.fillRect(440, 70, 80, 26); c.fillStyle = '#e8c090'; c.beginPath(); c.arc(480, 60, 14, 0, TAU); c.fill(); c.fillStyle = '#4a8a5a'; c.fillRect(466, 70, 28, 18); c.fillStyle = '#222'; c.fillRect(473, 55, 4, 4); c.fillRect(483, 55, 4, 4); break;
      case 'treasure': case 'secret': case 'cursed': case 'devil': {
        const col = info.color; c.strokeStyle = U.rgba(col, 0.25 + 0.1 * Math.sin(t * 0.05)); c.lineWidth = 3; c.beginPath(); c.arc(480, 270, 140, 0, TAU); c.stroke(); c.beginPath(); c.arc(480, 270, 100, 0, TAU); c.stroke();
        if (room.type === 'devil' || room.type === 'cursed') { c.fillStyle = U.rgba(col, 0.06); c.beginPath(); c.arc(480, 270, 150, 0, TAU); c.fill(); }
        break;
      }
      case 'shrine': c.strokeStyle = 'rgba(77,224,200,0.2)'; c.lineWidth = 2; c.strokeRect(250, 200, 460, 140); break;
      case 'rest': c.fillStyle = 'rgba(155,240,138,0.06)'; c.beginPath(); c.arc(480, 280, 120, 0, TAU); c.fill(); break;
      case 'fountain': c.fillStyle = 'rgba(95,212,255,0.05)'; c.beginPath(); c.arc(480, 270, 110, 0, TAU); c.fill(); break;
      case 'boss': case 'miniboss': break;
    }
    // traps
    if (rt.traps) for (const tp of rt.traps) {
      if (tp.kind === 'spikes') {
        const st = tp.state; c.fillStyle = st === 2 ? '#d0d0dc' : st === 1 ? 'rgba(255,60,60,0.5)' : 'rgba(80,80,100,0.5)'; c.fillRect(tp.x - tp.w / 2, tp.y - tp.h / 2, tp.w, tp.h);
        c.strokeStyle = st === 1 ? '#ff4a4a' : '#4a4a58'; c.lineWidth = 2; c.strokeRect(tp.x - tp.w / 2, tp.y - tp.h / 2, tp.w, tp.h);
        c.fillStyle = st === 2 ? '#fff' : '#2a2a34'; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const px = tp.x - 24 + a * 24, py = tp.y - 24 + b * 24; c.beginPath(); c.moveTo(px - 5, py + 6); c.lineTo(px, st === 2 ? py - 10 : py - 2); c.lineTo(px + 5, py + 6); c.fill(); }
      } else if (tp.kind === 'saw') {
        c.strokeStyle = 'rgba(90,90,110,0.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(tp.x0, tp.y); c.lineTo(tp.x1, tp.y); c.stroke();
        c.save(); c.translate(tp.x, tp.y); c.rotate(tp.a || 0); c.fillStyle = '#c8c8d8'; c.beginPath(); for (let k = 0; k < 16; k++) { const rr = k % 2 ? tp.r * 0.7 : tp.r * 1.1; c.lineTo(Math.cos(k * TAU / 16) * rr, Math.sin(k * TAU / 16) * rr); } c.closePath(); c.fill(); c.fillStyle = '#4a4a5a'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.restore();
      } else {
        c.fillStyle = tp.charging ? '#ff6a3a' : '#5a5a6a'; c.fillRect(tp.x - 12, tp.y - 12, 24, 24); c.fillStyle = '#222'; c.beginPath(); c.arc(tp.x + tp.dirx * 6, tp.y, 5, 0, TAU); c.fill();
        if (tp.charging) { c.strokeStyle = 'rgba(255,100,60,0.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(tp.x, tp.y); c.lineTo(tp.x + tp.dirx * 900, tp.y); c.stroke(); }
      }
    }
    // key chest hint ring
    if (g.hintId === room.id && !room.cleared) { c.strokeStyle = 'rgba(255,230,120,' + (0.3 + 0.25 * Math.sin(t * 0.1)) + ')'; c.lineWidth = 4; c.strokeRect(36, 36, C.ROOM_W - 72, C.ROOM_H - 72); }
  }

  // ================================================================== main world renderer
  let vignette = null;
  function world(g, ctx) {
    const c = ctx, room = g.room, rt = g.rt, t = g.frameAll;
    if (!room || !rt) return;
    if (!room.cache || rt.dirty) buildTileCache(g, room);
    c.save();
    c.translate(0, C.HUD);
    c.beginPath(); c.rect(0, 0, C.ROOM_W, C.ROOM_H); c.clip();
    if (g.shakeAmp > 0.1) c.translate((Math.random() - 0.5) * g.shakeAmp * 2, (Math.random() - 0.5) * g.shakeAmp * 2);
    c.drawImage(room.cache, 0, 0);
    // animated tiles
    for (const i of rt.dynTiles || []) {
      const tt = room.tiles[i], x = (i % C.COLS) * TILE, y = Math.floor(i / C.COLS) * TILE;
      if (tt === T.WATER) { c.fillStyle = 'rgba(60,140,210,0.55)'; c.fillRect(x, y, TILE, TILE); c.fillStyle = 'rgba(200,240,255,' + (0.12 + 0.1 * Math.sin(t * 0.06 + x * 0.1 + y * 0.07)) + ')'; c.fillRect(x + 4, y + 8 + Math.sin(t * 0.05 + x) * 3, 20, 3); }
      else if (tt === T.LAVA) { c.fillStyle = 'rgba(255,90,30,0.85)'; c.fillRect(x, y, TILE, TILE); c.fillStyle = 'rgba(255,220,100,' + (0.3 + 0.3 * Math.sin(t * 0.08 + x * 0.2 + y * 0.13)) + ')'; c.fillRect(x + 6, y + 6, 18, 16); }
      else if (tt === T.ICE) { c.fillStyle = 'rgba(160,220,255,0.35)'; c.fillRect(x, y, TILE, TILE); }
    }
    drawDecor(g, c, t);
    drawDoors(g, c);
    // lingering / telegraph zones (under entities)
    for (const z of g.zones) if (z.shape !== 'ring' || z.kind !== 'ring') drawZone(c, z, t);
    // props, interactables, pickups
    for (const pr of g.props) drawProp(c, pr, t);
    for (const it of g.inters) if (!it.dead) drawInter(g, c, it, t);
    for (const k of g.pickups) drawPickup(c, k, t);
    // spawn indicators
    for (const s of g.spawns) {
      const k = s.t / s.dur, def = ED.enemyTypes[s.type], col = s.elite ? '#ffd24a' : '#ff4a4a';
      c.strokeStyle = U.rgba(col, 0.4 + 0.5 * k); c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, (def ? def.r : 12) + 10 * (1 - k), 0, TAU); c.stroke();
      c.fillStyle = U.rgba(col, 0.15 + 0.3 * k); c.beginPath(); c.arc(s.x, s.y, (def ? def.r : 12) * k + 2, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(s.x - 6, s.y - 6); c.lineTo(s.x + 6, s.y + 6); c.moveTo(s.x + 6, s.y - 6); c.lineTo(s.x - 6, s.y + 6); c.strokeStyle = U.rgba(col, 0.8); c.stroke();
    }
    // bombs
    for (const b of g.bombs) { const k = b.t / b.fuse; ICONS.bomb(c, b.x, b.y, 9 + Math.sin(k * 40) * 1.5, b.color); c.strokeStyle = U.rgba('#ff4a2a', 0.2 + 0.4 * k); c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, b.r * k, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.stroke(); }
    // creatures sorted by y
    const list = g.enemies.slice().sort((a, b) => a.y - b.y);
    let pDrawn = false;
    for (const e of list) { if (!pDrawn && g.player.y < e.y) { drawPlayer(g, c, g.player, t); pDrawn = true; } drawEnemy(g, c, e, t); }
    if (!pDrawn) drawPlayer(g, c, g.player, t);
    for (const s of g.swings) drawSwing(c, s, t);
    for (const b of g.pproj) drawPProj(c, b, t);
    ED.runHooks('draw', g, c, t);
    for (const z of g.zones) if (z.shape === 'ring' && z.kind === 'ring') drawZone(c, z, t);
    for (const b of g.eproj) drawEProj(c, b, t);
    for (const f of g.fx) drawFx(c, f);
    for (const tx of g.texts) { c.globalAlpha = Math.min(1, tx.life / 18); c.font = 'bold ' + tx.size + 'px monospace'; c.textAlign = 'center'; c.fillStyle = '#000'; c.fillText(tx.str, tx.x + 1, tx.y + 1); c.fillStyle = tx.color; c.fillText(tx.str, tx.x, tx.y); c.globalAlpha = 1; }
    // door hint text
    if (g.doorHint) { const dh = g.doorHint, cc = ED.rooms.doorCenter(dh.dir); c.font = 'bold 12px monospace'; c.textAlign = 'center'; const w = c.measureText(dh.text).width + 14; const hx = U.clamp(cc.x, w / 2 + 6, C.ROOM_W - w / 2 - 6), hy = U.clamp(cc.y + (dh.dir === 'N' ? 54 : dh.dir === 'S' ? -48 : 0), 30, C.ROOM_H - 30); c.fillStyle = 'rgba(0,0,0,0.75)'; c.fillRect(hx - w / 2, hy - 13, w, 20); c.strokeStyle = dh.color; c.lineWidth = 1.5; c.strokeRect(hx - w / 2, hy - 13, w, 20); c.fillStyle = dh.color; c.fillText(dh.text, hx, hy + 1); }
    // lighting
    drawLighting(g, c, t);
    c.restore();
    // screen flash + transitions (screen space)
    if (g.flash) { c.fillStyle = U.rgba(g.flash.color, Math.min(0.8, g.flash.a)); c.fillRect(0, C.HUD, C.W, C.ROOM_H); }
    if (g.trans) { const k = g.trans.t / g.trans.dur; const a = k < 0.5 ? k * 2 : (1 - k) * 2; c.fillStyle = 'rgba(0,0,0,' + U.clamp(a * 1.1, 0, 1) + ')'; c.fillRect(0, C.HUD, C.W, C.ROOM_H); }
    if (g.transFloor) { c.fillStyle = 'rgba(0,0,0,' + U.clamp(g.transFloor.t / 20, 0, 1) + ')'; c.fillRect(0, 0, C.W, C.H); }
    if (g.scene === 'intro') { const a = U.clamp(1 - g.introT / 30, 0, 1); if (a > 0) { c.fillStyle = 'rgba(0,0,0,' + a + ')'; c.fillRect(0, 0, C.W, C.H); } }
  }

  function drawLighting(g, c, t) {
    const rt = g.rt, p = g.player;
    // torches
    for (const tc of rt.torches || []) {
      const fl = 0.7 + 0.3 * Math.sin(t * 0.15 + tc.ph);
      c.fillStyle = U.rgba(g.theme.glow, 0.05 * fl); c.beginPath(); c.arc(tc.x, tc.y, 90, 0, TAU); c.fill();
    }
    // vignette
    const gr = c.createRadialGradient(C.ROOM_W / 2, C.ROOM_H / 2, 200, C.ROOM_W / 2, C.ROOM_H / 2, 620);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.38)');
    c.fillStyle = gr; c.fillRect(0, 0, C.ROOM_W, C.ROOM_H);
    // haunted darkness (fog with a light around the player)
    if (rt.dark && !g.room.cleared) {
      if (!g.darkCv) { g.darkCv = document.createElement('canvas'); g.darkCv.width = C.ROOM_W; g.darkCv.height = C.ROOM_H; }
      const d = g.darkCv.getContext('2d');
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, C.ROOM_W, C.ROOM_H); d.fillStyle = 'rgba(2,2,12,0.9)'; d.fillRect(0, 0, C.ROOM_W, C.ROOM_H);
      d.globalCompositeOperation = 'destination-out';
      const lg = d.createRadialGradient(p.x, p.y, 20, p.x, p.y, 190); lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = lg; d.beginPath(); d.arc(p.x, p.y, 190, 0, TAU); d.fill();
      for (const e of g.enemies) if (!e.dead) { const lg2 = d.createRadialGradient(e.x, e.y, 4, e.x, e.y, 46); lg2.addColorStop(0, 'rgba(0,0,0,0.8)'); lg2.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = lg2; d.beginPath(); d.arc(e.x, e.y, 46, 0, TAU); d.fill(); }
      d.globalCompositeOperation = 'source-over';
      c.drawImage(g.darkCv, 0, 0);
    }
  }

  ED.render = { world, buildTileCache, itemGlyph, shape, glow, heart, drawEnemy, drawPlayer, darker, lighter, ICONS };
})(typeof globalThis !== 'undefined' ? globalThis : this);

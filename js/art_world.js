/* EMBERDEEP — art_world.js : v23 POLISH, the world: tile painter (floor patterns, walls, ambient occlusion, decor), lands' styles, the light pass, ambience, and the world renderer that strings it together.
 * Everything static is painted once per room into room.cache; everything that moves is drawn per frame.  Cosmetic randomness is a hash of the tile (never Math.random). */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, P = ED.packs, R = ED.render, skin = ED.skin;
  const TAU = U.TAU, TILE = C.TILE, V = 'v23', crand = U.crand;
  const { mixc, dark, lite, rgba } = skin.color;

  // ==================================================================== styles: one entry per land (keyed by the theme's name); a land that is not listed gets a style derived from its colours
  const S = skin.STYLES;
  const style = (name, o) => { S[name] = Object.assign({ pattern: 'flagstone', wall: 'block', ambient: null, dim: 0, ambience: 'dust', liquid: 'water', light: 0.5 }, S[name] || {}, o); };
  // the seven base themes of the dungeon
  style('The Sunken Crypt', { pattern: 'flagstone', wall: 'block', ambience: 'dust' });
  style('Mossy Ruins', { pattern: 'moss', wall: 'block', ambience: 'spores', ambient: '#9ab08a' });
  style('Frozen Halls', { pattern: 'ice', wall: 'ice', ambience: 'snow', ambient: '#a8c0e0', liquid: 'ice', lift: 1.0 });
  style('Cinder Vaults', { pattern: 'scorch', wall: 'brick', ambience: 'embers', ambient: '#b8886a' });
  style('The Drowned Temple', { pattern: 'brick', wall: 'block', ambience: 'bubbles', ambient: '#88b0b0' });
  style('Obsidian Void', { pattern: 'void', wall: 'block', ambience: 'stars', ambient: '#6a5a88', dim: 0.15 });
  style('Crimson Cathedral', { pattern: 'marble', wall: 'brick', ambience: 'dust', ambient: '#b08a98' });
  // v3 and v17-v21 lands
  style('The Hollow Crypts', { pattern: 'flagstone', wall: 'brick', ambience: 'dust', ambient: '#8c88a4' });
  style('The Mirewood', { pattern: 'moss', wall: 'cave', ambience: 'spores', ambient: '#8aa27a', liquid: 'mud' });
  style('The Glacial Spire', { pattern: 'ice', wall: 'ice', ambience: 'snow', ambient: '#a0bcdc', liquid: 'ice', lift: 1.0 });
  style('The Cinder Foundry', { pattern: 'scorch', wall: 'metal', ambience: 'embers', ambient: '#b88a68', liquid: 'lava' });
  style('The Gloam Void', { pattern: 'void', wall: 'block', ambience: 'stars', ambient: '#5a4c78', dim: 0.2 });
  style('The Storm Reach', { pattern: 'slate', wall: 'cave', ambience: 'rain', ambient: '#7e90a8' });
  style('The Sunken Ossuary', { pattern: 'brick', wall: 'brick', ambience: 'bubbles', ambient: '#7ea0a2', liquid: 'water' });
  style('The Clockwork Orrery', { pattern: 'brass', wall: 'metal', ambience: 'motes', ambient: '#c0a870' });
  style('The Gilded Vault', { pattern: 'gilded', wall: 'marble', ambience: 'glints', ambient: '#c8b070' });
  style('Thornwood Hollow', { pattern: 'moss', wall: 'cave', ambience: 'fireflies', ambient: '#7a9c62' });
  style('The Mirror Halls', { pattern: 'glass', wall: 'marble', ambience: 'glints', ambient: '#a8b4cc' });
  style('The Sky Bridge', { pattern: 'plank', wall: 'cloud', ambience: 'clouds', ambient: '#b4c4e0', lift: 1.0 });
  style("The Hollow King's Court", { pattern: 'checker', wall: 'marble', ambience: 'dust', ambient: '#9a7a8a', dim: 0.1 });
  skin.styleOf = function (th) {
    if (!th) return S['The Sunken Crypt'];
    let st = S[th.name];
    if (!st) st = S[th.name] = Object.assign({ pattern: 'flagstone', wall: 'block', ambient: null, dim: 0, ambience: 'dust', liquid: 'water', light: 0.5 }, th.skin || {});          // a land's theme may carry its own style: theme.skin = {pattern, wall, ambient, ambience...}
    return st;
  };
  skin.styleName = (th) => th && th.name;

  /** brighten a colour by a factor (the classic palettes are dark: the light pass multiplies them down again) */
  function lift(c, k) { const x = skin.color.rgbOf(c); return skin.color.toHex([x[0] * k, x[1] * k, x[2] * k]); }
  skin.lift = lift;
  /** the two floor colours the painter really uses for a theme (the classic palette brightened, unless the land's style says otherwise) */
  skin.floorsOf = (th) => { const k = (skin.styleOf(th).lift) || 1.22; return [lift(th.floorA, k), lift(th.floorB, k)]; };
  skin.GAMEPLAY = { damage: '#ff5a4a', warn: '#ffb04a', magic: '#7fe8ff' };
  // ==================================================================== deterministic cosmetics
  const hash = (x, y, k) => { const h = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); };
  skin.hash = hash;
  /** a small stable number for a room (its seed is a string like 'SEED:f4:r1') */
  const seedOf = (room) => (typeof room.seed === 'number' ? room.seed : ED.hash(String(room.seed || 0))) % 997;
  skin.seedOf = seedOf;

  // ==================================================================== floor patterns: fn(c, px, py, o) paints one 32x32 tile; o = {x, y, A, B, base, hi, lo, h(k)}
  const PAT = skin.patterns = {};
  const speck = (c, px, py, o, n, col, a) => { c.fillStyle = rgba(col, a); for (let i = 0; i < n; i++) c.fillRect(px + 2 + o.h(20 + i) * 27, py + 2 + o.h(40 + i) * 27, 1 + Math.floor(o.h(60 + i) * 2), 1 + Math.floor(o.h(80 + i) * 2)); };
  const joints = (c, px, py, o, a) => { c.fillStyle = rgba(o.lo, a === undefined ? 0.55 : a); c.fillRect(px, py, TILE, 1.5); c.fillRect(px, py, 1.5, TILE); c.fillStyle = rgba(o.hi, 0.1); c.fillRect(px + 1.5, py + TILE - 1, TILE - 1.5, 1); c.fillRect(px + TILE - 1, py + 1.5, 1, TILE - 1.5); };
  const crack = (c, px, py, o, col) => { if (o.h(5) < 0.82) return; c.strokeStyle = rgba(col || o.lo, 0.55); c.lineWidth = 1; c.beginPath(); let x = px + 4 + o.h(6) * 22, y = py + 3; c.moveTo(x, y); for (let i = 0; i < 4; i++) { x += (o.h(7 + i) - 0.5) * 10; y += 6 + o.h(11 + i) * 4; c.lineTo(Math.max(px + 1, Math.min(px + 31, x)), Math.min(py + 31, y)); } c.stroke(); };
  PAT.flagstone = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE);
    const v = o.h(4), sh = (v - 0.5) * 0.12; c.fillStyle = sh > 0 ? rgba('#ffffff', sh) : rgba('#000000', -sh); c.fillRect(px, py, TILE, TILE);
    const g = c.createLinearGradient(px, py, px + TILE, py + TILE); g.addColorStop(0, rgba(o.hi, 0.07)); g.addColorStop(1, rgba(o.lo, 0.12)); c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
    joints(c, px, py, o); speck(c, px, py, o, 5, o.lo, 0.22); crack(c, px, py, o);
    if (o.h(8) > 0.93) { c.fillStyle = rgba(o.lo, 0.25); c.beginPath(); c.ellipse(px + 16, py + 17, 8 + o.h(9) * 5, 5 + o.h(10) * 3, 0.4, 0, TAU); c.fill(); }
  };
  PAT.brick = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE);
    for (let r = 0; r < 2; r++) {
      const yy = py + r * 16, off = ((o.y * 2 + r) % 2) * 16; c.fillStyle = rgba(o.hi, 0.05 + o.h(30 + r) * 0.05); c.fillRect(px, yy, TILE, 16);
      for (let k = -1; k < 2; k++) { const xx = px + off + k * 32; c.fillStyle = rgba(o.lo, 0.5); c.fillRect(xx, yy, 1.5, 16); }
      c.fillStyle = rgba(o.lo, 0.5); c.fillRect(px, yy, TILE, 1.5); c.fillStyle = rgba(o.hi, 0.1); c.fillRect(px, yy + 15, TILE, 1);
    }
    speck(c, px, py, o, 4, o.lo, 0.2); crack(c, px, py, o);
  };
  PAT.moss = (c, px, py, o) => {
    PAT.flagstone(c, px, py, o);
    c.fillStyle = rgba(o.glow || '#6a9a4a', 0.07 + o.h(3) * 0.06); c.beginPath(); c.ellipse(px + o.h(12) * 20 + 6, py + o.h(13) * 20 + 6, 9 + o.h(14) * 6, 6 + o.h(15) * 4, o.h(16) * 3, 0, TAU); c.fill();
    if (o.h(9) > 0.8) { c.strokeStyle = rgba(lite(o.glow || '#6a9a4a', 0.2), 0.7); c.lineWidth = 1.2; for (let i = 0; i < 4; i++) { const bx = px + 4 + o.h(70 + i) * 24, by = py + 6 + o.h(80 + i) * 22; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + (o.h(90 + i) - 0.5) * 5, by - 4 - o.h(95 + i) * 3); c.stroke(); } }
  };
  PAT.ice = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE);
    const g = c.createLinearGradient(px, py, px + TILE, py + TILE); g.addColorStop(0, rgba('#e8f6ff', 0.12)); g.addColorStop(0.5, rgba('#ffffff', 0.02)); g.addColorStop(1, rgba(o.lo, 0.2)); c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
    joints(c, px, py, o, 0.3);
    if (o.h(5) > 0.55) { c.strokeStyle = rgba('#f4fbff', 0.45); c.lineWidth = 1; c.beginPath(); const x0 = px + o.h(6) * 32, y0 = py; c.moveTo(x0, y0); c.lineTo(x0 + (o.h(7) - 0.5) * 18, py + 12); c.lineTo(x0 + (o.h(8) - 0.5) * 24, py + 32); c.stroke(); }
    if (o.h(2) > 0.9) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(px + 6 + o.h(3) * 16, py + 5 + o.h(4) * 16, 2, 2); }
  };
  PAT.scorch = (c, px, py, o) => {
    PAT.flagstone(c, px, py, o);
    if (o.h(5) > 0.62) { c.strokeStyle = rgba('#ff7a2a', 0.5); c.lineWidth = 1.2; c.beginPath(); let x = px + 3 + o.h(6) * 24, y = py + 1; c.moveTo(x, y); for (let i = 0; i < 4; i++) { x += (o.h(7 + i) - 0.5) * 12; y += 8; c.lineTo(Math.max(px + 1, Math.min(px + 31, x)), Math.min(py + 32, y)); } c.stroke(); c.strokeStyle = rgba('#ffd24a', 0.35); c.lineWidth = 0.6; c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.ellipse(px + 20, py + 14, 9, 6, 0.6, 0, TAU); c.fill();
  };
  PAT.void = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE);
    const g = c.createRadialGradient(px + 10, py + 10, 2, px + 16, py + 16, 26); g.addColorStop(0, rgba(o.glow || '#a070ff', 0.07)); g.addColorStop(1, 'rgba(0,0,0,0.15)'); c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
    joints(c, px, py, o, 0.35);
    if (o.h(3) > 0.7) { c.fillStyle = rgba('#e0d0ff', 0.6); c.fillRect(px + 3 + o.h(4) * 26, py + 3 + o.h(5) * 26, 1.5, 1.5); }
    if (o.h(8) > 0.93) { c.strokeStyle = rgba(o.glow || '#a070ff', 0.3); c.lineWidth = 1; c.beginPath(); c.arc(px + 16, py + 16, 6 + o.h(9) * 6, 0, TAU); c.stroke(); }
  };
  PAT.marble = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE);
    const g = c.createLinearGradient(px, py, px + TILE, py + TILE); g.addColorStop(0, rgba('#ffffff', 0.12)); g.addColorStop(1, rgba('#000000', 0.12)); c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
    c.strokeStyle = rgba('#ffffff', 0.13); c.lineWidth = 1; c.beginPath(); const y0 = py + o.h(3) * 32; c.moveTo(px, y0); c.bezierCurveTo(px + 10, y0 - 8 * o.h(4), px + 20, y0 + 10 * o.h(5), px + 32, y0 + (o.h(6) - 0.5) * 14); c.stroke();
    joints(c, px, py, o, 0.5);
  };
  PAT.checker = (c, px, py, o) => {
    const alt = (o.x + o.y) % 2 === 0; c.fillStyle = alt ? lite(o.base, 0.1) : dark(o.base, 0.12); c.fillRect(px, py, TILE, TILE);
    const g = c.createLinearGradient(px, py, px + TILE, py + TILE); g.addColorStop(0, rgba('#ffffff', alt ? 0.14 : 0.06)); g.addColorStop(1, rgba('#000000', 0.14)); c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
    c.strokeStyle = rgba(alt ? '#ffffff' : o.hi, 0.1); c.lineWidth = 1; c.beginPath(); const y0 = py + o.h(3) * 32; c.moveTo(px, y0); c.bezierCurveTo(px + 10, y0 - 7, px + 20, y0 + 9, px + 32, y0 + (o.h(6) - 0.5) * 12); c.stroke();
    c.fillStyle = rgba(o.lo, 0.5); c.fillRect(px, py, TILE, 1); c.fillRect(px, py, 1, TILE);
  };
  PAT.slate = (c, px, py, o) => { PAT.flagstone(c, px, py, o); c.strokeStyle = rgba(o.hi, 0.08); c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(px, py + 6 + i * 10 + o.h(50 + i) * 4); c.lineTo(px + 32, py + 9 + i * 10 + o.h(55 + i) * 4); c.stroke(); } };
  PAT.brass = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE);
    const g = c.createLinearGradient(px, py, px + TILE, py + TILE); g.addColorStop(0, rgba('#fff0b0', 0.12)); g.addColorStop(1, rgba('#2a1a00', 0.18)); c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
    joints(c, px, py, o, 0.6); c.fillStyle = rgba(o.hi, 0.3); for (const [dx, dy] of [[4, 4], [28, 4], [4, 28], [28, 28]]) { c.beginPath(); c.arc(px + dx, py + dy, 1.4, 0, TAU); c.fill(); }
    if ((o.x + o.y) % 3 === 0) { c.strokeStyle = rgba(o.lo, 0.35); c.lineWidth = 1; c.beginPath(); c.arc(px + 16, py + 16, 9, 0, TAU); c.stroke(); c.beginPath(); c.arc(px + 16, py + 16, 4, 0, TAU); c.stroke(); }
  };
  PAT.gilded = (c, px, py, o) => {
    PAT.marble(c, px, py, o); c.strokeStyle = rgba('#ffd24a', 0.4); c.lineWidth = 1; c.strokeRect(px + 3.5, py + 3.5, 25, 25); c.fillStyle = rgba('#ffe48a', 0.5); c.fillRect(px + 15, py + 15, 2, 2);
  };
  PAT.glass = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE);
    const g = c.createLinearGradient(px, py + TILE, px + TILE, py); g.addColorStop(0, rgba('#ffffff', 0.02)); g.addColorStop(0.5, rgba('#ffffff', 0.12)); g.addColorStop(1, rgba('#ffffff', 0.02)); c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
    c.strokeStyle = rgba('#ffffff', 0.18); c.lineWidth = 1; c.beginPath(); c.moveTo(px + 4, py + 28); c.lineTo(px + 28, py + 4); c.stroke(); c.beginPath(); c.moveTo(px + 10, py + 30); c.lineTo(px + 30, py + 10); c.stroke(); joints(c, px, py, o, 0.4);
  };
  PAT.plank = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE);
    for (let r = 0; r < 4; r++) { const yy = py + r * 8, tone = (o.h(30 + r + (o.y % 2) * 5) - 0.5) * 0.14; c.fillStyle = tone > 0 ? rgba('#ffffff', tone) : rgba('#000000', -tone); c.fillRect(px, yy, TILE, 8); c.fillStyle = rgba(o.lo, 0.6); c.fillRect(px, yy, TILE, 1.2); c.fillStyle = rgba(o.hi, 0.08); c.fillRect(px, yy + 1.2, TILE, 1); }
    c.strokeStyle = rgba(o.lo, 0.2); c.lineWidth = 0.8; for (let i = 0; i < 3; i++) { const gy = py + 2 + o.h(60 + i) * 28; c.beginPath(); c.moveTo(px + 2, gy); c.lineTo(px + 30, gy + (o.h(65 + i) - 0.5) * 2); c.stroke(); }
    if (o.h(9) > 0.8) { c.fillStyle = rgba('#000000', 0.4); c.fillRect(px + 4, py + 3, 1.5, 1.5); c.fillRect(px + 27, py + 3, 1.5, 1.5); }
  };
  PAT.sand = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE); const g = c.createLinearGradient(px, py, px + TILE, py + TILE); g.addColorStop(0, rgba('#fff0c8', 0.1)); g.addColorStop(1, rgba('#000000', 0.12)); c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
    c.strokeStyle = rgba(o.hi, 0.22); c.lineWidth = 1; for (let i = 0; i < 3; i++) { const yy = py + 5 + i * 10 + o.h(10 + i) * 4; c.beginPath(); c.moveTo(px, yy); c.quadraticCurveTo(px + 10, yy - 3 - o.h(14 + i) * 2, px + 20, yy); c.quadraticCurveTo(px + 28, yy + 3, px + 32, yy - 1); c.stroke(); }
    c.strokeStyle = rgba(o.lo, 0.2); c.beginPath(); c.moveTo(px, py + 15); c.quadraticCurveTo(px + 12, py + 12 + o.h(3) * 6, px + 32, py + 16); c.stroke(); speck(c, px, py, o, 6, o.lo, 0.25); if (o.h(9) > 0.95) { c.fillStyle = rgba(o.lo, 0.5); c.beginPath(); c.ellipse(px + 16, py + 20, 5, 3, 0, 0, TAU); c.fill(); }
  };
  PAT.starry = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE); const g = c.createLinearGradient(px, py, px + TILE, py + TILE); g.addColorStop(0, rgba('#8aa0ff', 0.08)); g.addColorStop(1, rgba('#000010', 0.22)); c.fillStyle = g; c.fillRect(px, py, TILE, TILE); joints(c, px, py, o, 0.35);
    for (let i = 0; i < 3; i++) if (o.h(30 + i) > 0.55) { c.fillStyle = rgba('#fff4c8', 0.35 + o.h(40 + i) * 0.5); const sx = px + 3 + o.h(50 + i) * 26, sy = py + 3 + o.h(60 + i) * 26, s2 = o.h(70 + i) > 0.85 ? 2 : 1.2; c.fillRect(sx, sy, s2, s2); }
    if (o.h(5) > 0.9) { c.strokeStyle = rgba('#aab8ff', 0.25); c.lineWidth = 1; c.beginPath(); c.moveTo(px + 4, py + 26); c.lineTo(px + 16, py + 12); c.lineTo(px + 28, py + 18); c.stroke(); }
  };
  PAT.parquet = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE); const horiz = (o.x + o.y) % 2 === 0;
    for (let k = 0; k < 4; k++) { const tone = (o.h(30 + k) - 0.5) * 0.18; c.fillStyle = tone > 0 ? rgba('#ffe0b0', tone) : rgba('#000000', -tone); if (horiz) c.fillRect(px, py + k * 8, TILE, 8); else c.fillRect(px + k * 8, py, 8, TILE); c.fillStyle = rgba(o.lo, 0.55); if (horiz) c.fillRect(px, py + k * 8, TILE, 1.2); else c.fillRect(px + k * 8, py, 1.2, TILE); }
    c.fillStyle = rgba(o.lo, 0.35); c.fillRect(px, py, TILE, 1); c.fillRect(px, py, 1, TILE); c.fillStyle = rgba(o.hi, 0.07); c.fillRect(px + 1, py + TILE - 1, TILE - 1, 1);
  };
  PAT.carpet = (c, px, py, o) => {
    c.fillStyle = o.base; c.fillRect(px, py, TILE, TILE); const g = c.createLinearGradient(px, py, px + TILE, py + TILE); g.addColorStop(0, rgba('#ffffff', 0.05)); g.addColorStop(1, rgba('#000000', 0.18)); c.fillStyle = g; c.fillRect(px, py, TILE, TILE);
    c.strokeStyle = rgba(o.accent || '#ffb86a', 0.2); c.lineWidth = 1; c.beginPath(); c.moveTo(px + 16, py + 2); c.lineTo(px + 30, py + 16); c.lineTo(px + 16, py + 30); c.lineTo(px + 2, py + 16); c.closePath(); c.stroke(); c.fillStyle = rgba(o.accent || '#ffb86a', 0.2); c.fillRect(px + 15, py + 15, 2, 2);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(px, py, TILE, 1);
  };
  skin.registerPattern = (name, fn) => { PAT[name] = fn; };

  // ==================================================================== walls: painted per tile (top surface, edges, front face)
  const WALLFX = {
    block(c, px, py, o) { const k = o.h(21); c.strokeStyle = rgba(o.lo, 0.35); c.lineWidth = 1; c.beginPath(); c.moveTo(px + 16 + (k - 0.5) * 8, py); c.lineTo(px + 16 + (k - 0.5) * 8, py + o.top); c.stroke(); c.beginPath(); c.moveTo(px, py + o.top * 0.5); c.lineTo(px + TILE, py + o.top * 0.5); c.stroke(); },
    brick(c, px, py, o) { c.strokeStyle = rgba(o.lo, 0.4); c.lineWidth = 1; for (let r = 0; r < 2; r++) { const yy = py + r * (o.top / 2), off = ((o.y + r) % 2) * 12 + 4; c.beginPath(); c.moveTo(px, yy); c.lineTo(px + TILE, yy); c.stroke(); c.beginPath(); c.moveTo(px + off, yy); c.lineTo(px + off, yy + o.top / 2); c.stroke(); c.beginPath(); c.moveTo(px + off + 16 > px + 32 ? px + off - 16 : px + off + 16, yy); c.lineTo(px + off + 16 > px + 32 ? px + off - 16 : px + off + 16, yy + o.top / 2); c.stroke(); } },
    cave(c, px, py, o) { c.fillStyle = rgba(o.lo, 0.22); for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(px + 5 + o.h(22 + i) * 22, py + 4 + o.h(26 + i) * (o.top - 6), 4 + o.h(30 + i) * 5, 3 + o.h(34 + i) * 3, o.h(38 + i) * 3, 0, TAU); c.fill(); } c.fillStyle = rgba(o.hi, 0.1); c.fillRect(px + 3 + o.h(40) * 20, py + 2, 8, 2); },
    ice(c, px, py, o) { c.strokeStyle = rgba('#ffffff', 0.35); c.lineWidth = 1; c.beginPath(); c.moveTo(px + 6 + o.h(21) * 20, py + 1); c.lineTo(px + 14 + o.h(22) * 14, py + o.top * 0.6); c.lineTo(px + 8 + o.h(23) * 20, py + o.top); c.stroke(); c.fillStyle = rgba('#ffffff', 0.1); c.fillRect(px, py, TILE, 3); },
    metal(c, px, py, o) { c.fillStyle = rgba(o.hi, 0.25); for (const dx of [4, 28]) { c.beginPath(); c.arc(px + dx, py + 5, 1.3, 0, TAU); c.fill(); c.beginPath(); c.arc(px + dx, py + o.top - 3, 1.3, 0, TAU); c.fill(); } c.strokeStyle = rgba(o.lo, 0.5); c.lineWidth = 1; c.strokeRect(px + 0.5, py + 0.5, TILE - 1, o.top - 1); },
    marble(c, px, py, o) { c.strokeStyle = rgba('#ffffff', 0.16); c.lineWidth = 1; c.beginPath(); c.moveTo(px, py + 5 + o.h(21) * 8); c.bezierCurveTo(px + 10, py + o.h(22) * 12, px + 22, py + 12 + o.h(23) * 6, px + 32, py + 4 + o.h(24) * 10); c.stroke(); },
    velvet(c, px, py, o) { c.strokeStyle = rgba(o.lo, 0.45); c.lineWidth = 1.5; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(px + 4 + k * 8, py); c.quadraticCurveTo(px + 7 + k * 8 + o.h(21 + k) * 3, py + o.top * 0.5, px + 4 + k * 8, py + o.top); c.stroke(); } c.fillStyle = rgba('#ffd890', 0.35); c.fillRect(px, py + o.top - 2, TILE, 2); },
    timber(c, px, py, o) { c.strokeStyle = rgba(o.lo, 0.5); c.lineWidth = 1.2; for (let k = 1; k < 3; k++) { c.beginPath(); c.moveTo(px, py + k * o.top / 3); c.lineTo(px + TILE, py + k * o.top / 3); c.stroke(); } c.fillStyle = rgba(o.lo, 0.5); c.beginPath(); c.arc(px + 5, py + 4, 1.1, 0, TAU); c.arc(px + 27, py + o.top - 4, 1.1, 0, TAU); c.fill(); },
    shelves(c, px, py, o) { for (let r = 0; r < 2; r++) { const yy = py + 2 + r * (o.top / 2); for (let b = 0; b < 8; b++) { const hh = 0.5 + o.h(21 + b + r * 9) * 0.5, col = ['#8a2a2a', '#2a4a8a', '#4a7a3a', '#8a6a2a', '#5a2a6a', '#2a6a6a'][Math.floor(o.h(40 + b + r * 5) * 6)]; c.fillStyle = col; c.fillRect(px + 1 + b * 4, yy + (o.top / 2 - 3) * (1 - hh), 3, (o.top / 2 - 3) * hh); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(px + 1 + b * 4, yy + (o.top / 2 - 3) * (1 - hh), 1, (o.top / 2 - 3) * hh); } c.fillStyle = rgba(o.lo, 0.7); c.fillRect(px, yy + o.top / 2 - 3, TILE, 2); } },
    cloud(c, px, py, o) { c.fillStyle = rgba('#ffffff', 0.18); for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(px + 8 + i * 14 + o.h(21 + i) * 6, py + 8 + o.h(24 + i) * (o.top - 12), 6 + o.h(27 + i) * 4, 0, TAU); c.fill(); } },
  };
  skin.registerWall = (name, fn) => { WALLFX[name] = fn; };

  // ==================================================================== the tile cache
  const BASE_TILE = { WALL: T.WALL };
  function buildTiles(g, room) {
    const tiles = room.tiles, st = skin.styleOf(g.theme); let cv = room.cache;
    if (!cv) { cv = room.cache = document.createElement('canvas'); cv.width = C.ROOM_W; cv.height = C.ROOM_H; ED.stats.caches++; }
    const c = cv.getContext('2d'); c.clearRect(0, 0, C.ROOM_W, C.ROOM_H);
    const fl = skin.floorsOf(g.theme), th = Object.assign({}, g.theme, { floorA: fl[0], floorB: fl[1], wall: lift(g.theme.wall, 1.12), wallTop: lift(g.theme.wallTop, 1.08) });
    const at = (x, y) => (x < 0 || y < 0 || x >= C.COLS || y >= C.ROWS) ? T.WALL : tiles[y * C.COLS + x];
    const seed = seedOf(room), pat = PAT[st.pattern] || PAT.flagstone, wfx = WALLFX[st.wall] || WALLFX.block;
    const lo = dark(th.floorA, 0.5), hi = lite(th.floorB, 0.35);
    const rugCol = th.accent;
    // ---- floor
    for (let y = 0; y < C.ROWS; y++) for (let x = 0; x < C.COLS; x++) {
      const t = at(x, y); if (t === T.WALL) continue; const px = x * TILE, py = y * TILE, h = (k) => hash(x + seed * 0.37, y, k);
      pat(c, px, py, { x, y, A: th.floorA, B: th.floorB, base: (x + y) % 2 ? th.floorA : th.floorB, hi, lo, glow: th.glow, accent: th.accent, h });
      switch (t) {
        case T.RUG: { const g2 = c.createLinearGradient(px, py, px + TILE, py + TILE); g2.addColorStop(0, rgba(lite(rugCol, 0.1), 0.7)); g2.addColorStop(1, rgba(dark(rugCol, 0.4), 0.78)); c.fillStyle = g2; c.fillRect(px, py, TILE, TILE); c.strokeStyle = 'rgba(255,214,120,0.5)'; c.lineWidth = 1; c.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7); c.strokeStyle = 'rgba(255,214,120,0.22)'; c.strokeRect(px + 7.5, py + 7.5, TILE - 15, TILE - 15); c.fillStyle = 'rgba(255,214,120,0.35)'; c.fillRect(px + 15, py + 15, 2, 2); break; }
        case T.PIT: {
          c.fillStyle = '#05040a'; c.fillRect(px, py, TILE, TILE); const g2 = c.createLinearGradient(px, py, px, py + TILE); g2.addColorStop(0, 'rgba(70,56,110,0.35)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(px, py, TILE, TILE);
          if (at(x, y - 1) !== T.PIT) { c.fillStyle = lite(th.wallTop, 0.05); c.fillRect(px, py, TILE, 3); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(px, py + 3, TILE, 5); }
          if (at(x - 1, y) !== T.PIT) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(px, py, 5, TILE); }
          if (at(x, y + 1) !== T.PIT) { c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(px, py + TILE - 2, TILE, 2); }
          break;
        }
        case T.SPIKE: c.fillStyle = '#26262e'; c.fillRect(px + 2, py + 2, TILE - 4, TILE - 4); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.strokeRect(px + 2.5, py + 2.5, TILE - 5, TILE - 5); for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const sx = px + 10 + a * 14, sy = py + 11 + b * 14; const gr = c.createLinearGradient(sx - 6, sy, sx + 6, sy); gr.addColorStop(0, '#d4d4e0'); gr.addColorStop(1, '#6a6a7a'); c.fillStyle = gr; c.beginPath(); c.moveTo(sx - 6, sy + 5); c.lineTo(sx, sy - 8); c.lineTo(sx + 6, sy + 5); c.closePath(); c.fill(); } break;
        case T.ROCK: break;                                                  // drawn after the walls (it stands up out of the floor)
        case T.DOOR: case T.CRACK: c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(px, py, TILE, TILE); break;
      }
    }
    // ---- ambient occlusion on the floor along the walls (the light comes from the top left: shadows fall down and to the right)
    for (let y = 1; y < C.ROWS - 1; y++) for (let x = 1; x < C.COLS - 1; x++) {
      if (at(x, y) === T.WALL) continue; const px = x * TILE, py = y * TILE;
      if (at(x, y - 1) === T.WALL) { const gr = c.createLinearGradient(0, py, 0, py + 14); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(px, py, TILE, 14); }
      if (at(x - 1, y) === T.WALL) { const gr = c.createLinearGradient(px, 0, px + 10, 0); gr.addColorStop(0, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(px, py, 10, TILE); }
      if (at(x + 1, y) === T.WALL) { const gr = c.createLinearGradient(px + TILE, 0, px + TILE - 7, 0); gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(px + TILE - 7, py, 7, TILE); }
      if (at(x, y + 1) === T.WALL) { const gr = c.createLinearGradient(0, py + TILE, 0, py + TILE - 6); gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(px, py + TILE - 6, TILE, 6); }
    }
    // ---- walls: top surface lit from the top left, a shaded face where the floor lies south of it, bevels on the sides that face the light
    for (let y = 0; y < C.ROWS; y++) for (let x = 0; x < C.COLS; x++) {
      if (at(x, y) !== T.WALL) continue; const px = x * TILE, py = y * TILE, h = (k) => hash(x + seed * 0.37, y, k), below = at(x, y + 1) !== T.WALL, top = below ? TILE - 11 : TILE;
      const gr = c.createLinearGradient(px, py, px + TILE, py + top); gr.addColorStop(0, lite(th.wallTop, 0.12)); gr.addColorStop(1, dark(th.wallTop, 0.18)); c.fillStyle = gr; c.fillRect(px, py, TILE, top);
      wfx(c, px, py, { x, y, top, hi: lite(th.wallTop, 0.3), lo: dark(th.wall, 0.55), h });
      if (below) {
        const fg = c.createLinearGradient(0, py + top, 0, py + TILE); fg.addColorStop(0, th.wall); fg.addColorStop(1, dark(th.wall, 0.45)); c.fillStyle = fg; c.fillRect(px, py + top, TILE, TILE - top);
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(px, py + top, TILE, 1.5); c.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 2; k++) c.fillRect(px + ((k * 16 + (y % 2) * 8) % TILE), py + top + 1.5, 1.2, TILE - top);
      }
      if (at(x, y - 1) !== T.WALL) { c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(px, py, TILE, 2); }
      if (at(x - 1, y) !== T.WALL) { c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(px, py, 2, top); }
      if (at(x + 1, y) !== T.WALL) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(px + TILE - 2, py, 2, top); }
      if (h(1) > 0.84) { c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(px + h(2) * 20, py + h(3) * 12, 8, 3); }
    }
    // ---- boulders stand up out of the floor, with a cast shadow
    for (let y = 0; y < C.ROWS; y++) for (let x = 0; x < C.COLS; x++) if (at(x, y) === T.ROCK) rock(c, x * TILE, y * TILE, th, hash(x + seed, y, 2));
    // ---- the room's soft edge shading
    const gr = c.createLinearGradient(0, 0, 0, C.ROOM_H); gr.addColorStop(0, 'rgba(0,0,0,0.2)'); gr.addColorStop(0.12, 'rgba(0,0,0,0)'); gr.addColorStop(0.88, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.26)'); c.fillStyle = gr; c.fillRect(0, 0, C.ROOM_W, C.ROOM_H);
    // ---- scattered decor on plain floor tiles, never near the middle of a doorway
    decorScatter(c, g, room, at, st, th, seed);
    const dyn = [], nbm = new Uint8Array(tiles.length); for (let i = 0; i < tiles.length; i++) { const t = tiles[i]; if (t === T.WATER || t === T.LAVA || t === T.ICE || t === T.SPIKE) { dyn.push(i); const x = i % C.COLS, y = (i / C.COLS) | 0; nbm[i] = (at(x, y - 1) === t ? 1 : 0) | (at(x + 1, y) === t ? 2 : 0) | (at(x, y + 1) === t ? 4 : 0) | (at(x - 1, y) === t ? 8 : 0); } }
    room.rt.dynTiles = dyn; room.rt.dynNb = nbm; room.rt.dirty = false;
  }
  function rock(c, px, py, th, k) {
    c.fillStyle = 'rgba(0,0,0,0.34)'; c.beginPath(); c.ellipse(px + 19, py + 28, 15, 5.5, 0, 0, TAU); c.fill();
    const base = th.wall, cx = px + 16, cy = py + 15, rr = 13;
    const g2 = c.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, 20); g2.addColorStop(0, lite(th.wallTop, 0.3)); g2.addColorStop(0.55, mixc(th.wallTop, base, 0.5)); g2.addColorStop(1, dark(base, 0.5)); c.fillStyle = g2;
    c.beginPath(); for (let i = 0; i <= 10; i++) { const a = i * TAU / 10, r2 = rr * (0.9 + 0.12 * Math.sin(a * 3 + k * 9)); c.lineTo(cx + Math.cos(a) * r2 * 1.12, cy + Math.sin(a) * r2 * 0.92); } c.closePath(); c.fill();
    c.strokeStyle = 'rgba(6,4,14,0.8)'; c.lineWidth = 1.8; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.ellipse(cx - 5, cy - 6, 5, 2.8, -0.5, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 2, cy - 2); c.lineTo(cx + 3, cy + 3); c.lineTo(cx + 1, cy + 8); c.stroke();
  }
  /** rubble, bones, plants, stains: a handful per room, placed from the tile hash (so a room always looks the same) */
  const DECOR = skin.decor = {
    dust: (c, x, y, k, th) => { c.fillStyle = rgba(dark(th.floorA, 0.5), 0.5); for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x + 8 + i * 6, y + 20 + (i % 2) * 3, 2.6 - i * 0.4, 1.7, 0, 0, TAU); c.fill(); } c.fillStyle = rgba(lite(th.wallTop, 0.1), 0.35); c.fillRect(x + 12, y + 18, 3, 2); },
    bones: (c, x, y, k, th) => { c.strokeStyle = 'rgba(224,214,190,0.5)'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + 6, y + 18); c.lineTo(x + 20, y + 24); c.stroke(); c.beginPath(); c.moveTo(x + 8, y + 24); c.lineTo(x + 22, y + 16); c.stroke(); c.lineCap = 'butt'; c.fillStyle = 'rgba(224,214,190,0.55)'; c.beginPath(); c.arc(x + 15, y + 20, 3, 0, TAU); c.fill(); },
    tuft: (c, x, y, k, th) => { c.strokeStyle = rgba(lite(th.accent, 0.1), 0.75); c.lineWidth = 1.4; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x + 8 + i * 4, y + 24); c.quadraticCurveTo(x + 8 + i * 4 + (i - 2) * 2, y + 17, x + 8 + i * 4 + (i - 2) * 3, y + 13 - (i % 2) * 3); c.stroke(); } },
    puddle: (c, x, y, k, th) => { c.fillStyle = rgba(mixc(th.glow, '#4a7a9a', 0.5), 0.22); c.beginPath(); c.ellipse(x + 16, y + 18, 9, 5, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1; c.beginPath(); c.ellipse(x + 14, y + 17, 5, 2.6, 0, 0, TAU); c.stroke(); },
    chip: (c, x, y, k, th) => { c.fillStyle = rgba(dark(th.wall, 0.2), 0.8); c.beginPath(); c.moveTo(x + 8, y + 22); c.lineTo(x + 14, y + 17); c.lineTo(x + 20, y + 21); c.lineTo(x + 17, y + 25); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 12, y + 18, 4, 1.5); },
    crystal: (c, x, y, k, th) => { c.fillStyle = rgba(lite(th.accent, 0.3), 0.8); c.beginPath(); c.moveTo(x + 12, y + 26); c.lineTo(x + 15, y + 12); c.lineTo(x + 19, y + 26); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x + 14, y + 15, 1.6, 7); },
    gear: (c, x, y, k, th) => { c.strokeStyle = rgba(lite(th.accent, 0.1), 0.45); c.lineWidth = 2; c.beginPath(); c.arc(x + 16, y + 18, 6, 0, TAU); c.stroke(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(x + 16 + Math.cos(a) * 6, y + 18 + Math.sin(a) * 6); c.lineTo(x + 16 + Math.cos(a) * 9, y + 18 + Math.sin(a) * 9); c.stroke(); } },
    coin: (c, x, y, k, th) => { c.fillStyle = 'rgba(255,214,90,0.8)'; c.beginPath(); c.ellipse(x + 14, y + 20, 3.4, 2.4, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,214,90,0.6)'; c.beginPath(); c.ellipse(x + 21, y + 23, 2.8, 2, 0, 0, TAU); c.fill(); },
    petal: (c, x, y, k, th) => { c.fillStyle = rgba(lite(th.accent, 0.3), 0.55); for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x + 8 + i * 5, y + 16 + (i % 2) * 6, 2.4, 1.4, i, 0, TAU); c.fill(); } },
  };
  const DECOR_BY = { dust: ['dust', 'chip', 'dust', 'bones'], spores: ['tuft', 'puddle', 'dust', 'tuft'], snow: ['crystal', 'chip', 'puddle', 'dust'], embers: ['chip', 'dust', 'chip', 'bones'], bubbles: ['puddle', 'chip', 'bones', 'puddle'], stars: ['crystal', 'dust', 'crystal', 'chip'], rain: ['puddle', 'chip', 'puddle', 'dust'], motes: ['gear', 'chip', 'gear', 'dust'], glints: ['coin', 'chip', 'dust', 'coin'], fireflies: ['tuft', 'petal', 'tuft', 'chip'], clouds: ['chip', 'dust', 'chip', 'dust'] };
  function decorScatter(c, g, room, at, st, th, seed) {
    const kinds = DECOR_BY[st.ambience] || DECOR_BY.dust, extra = st.decor;
    for (let y = 2; y < C.ROWS - 2; y++) for (let x = 2; x < C.COLS - 2; x++) {
      if (at(x, y) !== T.FLOOR) continue; if (Math.abs(x - 15) < 5 && Math.abs(y - 9) < 3) continue; const k = hash(x + seed * 0.3, y, 91); if (k < 0.972) continue;
      const kind = (extra && extra[Math.floor(hash(x, y, 92) * extra.length)]) || kinds[Math.floor(hash(x, y, 92) * kinds.length)]; (DECOR[kind] || DECOR.dust)(c, x * TILE, y * TILE, k, th);
    }
  }
  skin.buildTiles = buildTiles;
  skin.rock = rock;

  // ==================================================================== liquids and other animated tiles
  /** a tile-sized path whose corners are rounded wherever both of the sides that meet there face dry ground (nb: bit 1 = liquid to the north, 2 east, 4 south, 8 west) */
  function liquidPath(c, x, y, nb, r) {
    const tl = !(nb & 1) && !(nb & 8), tr = !(nb & 1) && !(nb & 2), br = !(nb & 4) && !(nb & 2), bl = !(nb & 4) && !(nb & 8);
    c.beginPath(); c.moveTo(x + (tl ? r : 0), y); c.lineTo(x + TILE - (tr ? r : 0), y); if (tr) c.quadraticCurveTo(x + TILE, y, x + TILE, y + r); c.lineTo(x + TILE, y + TILE - (br ? r : 0)); if (br) c.quadraticCurveTo(x + TILE, y + TILE, x + TILE - r, y + TILE);
    c.lineTo(x + (bl ? r : 0), y + TILE); if (bl) c.quadraticCurveTo(x, y + TILE, x, y + TILE - r); c.lineTo(x, y + (tl ? r : 0)); if (tl) c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  /** a soft band along each side that faces dry ground: `col` at the edge fading to nothing over `w` pixels */
  function shore(c, x, y, nb, w, col0, col1) {
    const side = (gx0, gy0, gx1, gy1, rx, ry, rw, rh) => { const g = c.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, col0); g.addColorStop(1, col1); c.fillStyle = g; c.fillRect(rx, ry, rw, rh); };
    if (!(nb & 1)) side(x, y, x, y + w, x, y, TILE, w); if (!(nb & 4)) side(x, y + TILE, x, y + TILE - w, x, y + TILE - w, TILE, w);
    if (!(nb & 8)) side(x, y, x + w, y, x, y, w, TILE); if (!(nb & 2)) side(x + TILE, y, x + TILE - w, y, x + TILE - w, y, w, TILE);
  }
  function dynTile(c, tt, x, y, t, st, th, nb) {
    nb = nb === undefined ? 15 : nb; const edge = nb !== 15; if (edge && tt !== T.SPIKE) { c.save(); liquidPath(c, x, y, nb, 10); c.clip(); }
    if (tt === T.WATER) {
      const mud = st.liquid === 'mud', base = mud ? '#4a3a22' : '#2f6ea8', g = c.createLinearGradient(x, y, x, y + TILE); g.addColorStop(0, rgba(lite(base, 0.15), 0.78)); g.addColorStop(1, rgba(dark(base, 0.25), 0.82)); c.fillStyle = g; c.fillRect(x - 0.5, y - 0.5, TILE + 1, TILE + 1);
      c.strokeStyle = 'rgba(210,240,255,' + (0.16 + 0.12 * Math.sin(t * 0.06 + x * 0.1 + y * 0.07)) + ')'; c.lineWidth = 1.2; for (let i = 0; i < 2; i++) { const yy = y + 7 + i * 13 + Math.sin(t * 0.05 + x * 0.2 + i) * 2; c.beginPath(); c.moveTo(x + 2, yy); c.quadraticCurveTo(x + 10, yy - 3, x + 18, yy); c.quadraticCurveTo(x + 24, yy + 3, x + 30, yy); c.stroke(); }
      if (edge) { shore(c, x, y, nb, 7, mud ? 'rgba(20,12,4,0.5)' : 'rgba(6,30,60,0.5)', 'rgba(0,0,0,0)'); shore(c, x, y, nb, 3, mud ? 'rgba(150,120,70,0.5)' : 'rgba(225,246,255,' + (0.4 + 0.15 * Math.sin(t * 0.07 + x * 0.1 + y * 0.1)) + ')', 'rgba(255,255,255,0)'); }
      if (!mud && skin.level() >= 2 && ((x * 7 + y * 13) % 5) === 0) { c.fillStyle = 'rgba(255,255,255,0.16)'; const k = (t * 0.04 + x) % 6; c.beginPath(); c.arc(x + 16 + Math.sin(k) * 6, y + 14 - (k % 3) * 2, 1.4, 0, TAU); c.fill(); }
    } else if (tt === T.LAVA) {
      const k = 0.5 + 0.5 * Math.sin(t * 0.02 + x * 0.045 + y * 0.037);             // continuous across the tiles of one pool
      c.fillStyle = 'rgb(' + Math.round(222 + 22 * k) + ',' + Math.round(88 + 44 * k) + ',' + Math.round(22 + 6 * k) + ')'; c.fillRect(x - 0.5, y - 0.5, TILE + 1, TILE + 1);
      c.fillStyle = 'rgba(255,226,120,' + (0.26 + 0.26 * Math.sin(t * 0.08 + x * 0.2 + y * 0.13)) + ')'; c.beginPath(); c.ellipse(x + 16 + Math.sin(t * 0.03 + y) * 4, y + 15, 9, 6, 0.4, 0, TAU); c.fill();
      c.fillStyle = 'rgba(70,16,2,0.4)'; c.beginPath(); c.ellipse(x + 8 + Math.sin(t * 0.021 + x) * 3, y + 24, 7, 3.5, 0, 0, TAU); c.fill();
      if (edge) { shore(c, x, y, nb, 9, 'rgba(40,10,3,0.88)', 'rgba(60,14,4,0)'); shore(c, x, y, nb, 4, 'rgba(255,176,70,' + (0.45 + 0.2 * Math.sin(t * 0.09 + x * 0.1)) + ')', 'rgba(255,200,90,0)'); }
      if (skin.level() >= 2 && ((x * 5 + y * 11) % 7) === 0) { const kk = (t * 0.05 + x * 0.3) % 5; c.fillStyle = 'rgba(255,240,170,' + (0.8 - kk * 0.15) + ')'; c.beginPath(); c.arc(x + 12 + kk * 2, y + 24 - kk * 3, 2.4 - kk * 0.3, 0, TAU); c.fill(); }
    } else if (tt === T.ICE) {
      const g = c.createLinearGradient(x, y, x + TILE, y + TILE); g.addColorStop(0, 'rgba(220,246,255,0.5)'); g.addColorStop(0.5, 'rgba(170,222,255,0.3)'); g.addColorStop(1, 'rgba(120,180,240,0.4)'); c.fillStyle = g; c.fillRect(x - 0.5, y - 0.5, TILE + 1, TILE + 1);
      c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 4, y + 26); c.lineTo(x + 26, y + 5); c.stroke(); const sg = (Math.sin(t * 0.03 + x * 0.1 + y * 0.2) + 1) / 2; c.fillStyle = 'rgba(255,255,255,' + (0.1 + sg * 0.35) + ')'; c.fillRect(x + 20, y + 6, 3, 3);
      if (edge) { shore(c, x, y, nb, 4, 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'); shore(c, x, y, nb, 8, 'rgba(60,110,170,0.3)', 'rgba(60,110,170,0)'); }
    }
    if (edge && tt !== T.SPIKE) c.restore();
  }

  // ==================================================================== the light pass
  const LW = C.ROOM_W / 4, LH = C.ROOM_H / 4;
  function lightCanvas() { const o = skin.slot('light', LW, LH); return o; }
  /** collect the lights of this frame: {x, y, r, color, a} (room coordinates) */
  function lightsOf(g, t, st, lv) {
    const L = [], rt = g.rt, p = g.player;
    for (const tc of rt.torches || []) if (tc.y > 8 && tc.y < C.ROOM_H - 8) L.push({ x: tc.x, y: tc.y, r: 120 + 14 * Math.sin(t * 0.15 + tc.ph), color: '#ffb868', a: 0.55 });
    for (const pr of g.props) if (!pr.dead && pr.type === 'brazier' && pr.lit) L.push({ x: pr.x, y: pr.y - 14, r: 120 + 10 * Math.sin(t * 0.3 + pr.x), color: '#ffa54a', a: 0.8 });
    if (p && !p.dead) L.push({ x: p.x, y: p.y, r: 130 * (p.lightMul || 1), color: '#dfe8ff', a: 0.45 });
    for (const it of g.inters) { if (it.dead) continue; if (it.type === 'stairs') L.push({ x: it.x, y: it.y, r: 90, color: '#bcd0ff', a: 0.6 }); else if (it.type === 'camp' && it.uses > 0) L.push({ x: it.x, y: it.y - 8, r: 120, color: '#ff9a4a', a: 0.7 }); else if (it.type === 'shrine' || it.type === 'altar') { if (!it.used && it.color) L.push({ x: it.x, y: it.y - 20, r: 80, color: it.color, a: 0.5 }); } else if (it.type === 'pedestal' && !it.disabled && it.item) L.push({ x: it.x, y: it.y - 10, r: 70, color: ED.items.itemColor(it.item), a: 0.45 }); else if (it.type === 'fountain' && !it.disabledLook) L.push({ x: it.x, y: it.y - 6, r: 90, color: '#7fd8ff', a: 0.5 }); else if (it.type === 'healfont') L.push({ x: it.x, y: it.y, r: 70, color: it.color, a: 0.5 }); }
    if (lv >= 2) {
      for (const e of g.enemies) if (!e.dead && e.vis !== 0) L.push({ x: e.x, y: e.y, r: e.r * (e.boss ? 3.2 : e.elite ? 3.4 : 3) + 22, color: e.elite && e.mods.length ? e.mods[0].color : e.color, a: e.boss ? 0.55 : e.elite ? 0.45 : 0.3 });
      for (const b of g.eproj) L.push({ x: b.x, y: b.y, r: b.r * 5 + 18, color: b.color || '#ff6a4a', a: 0.5 });
      for (const b of g.pproj) L.push({ x: b.x, y: b.y, r: b.r * 5 + 22, color: b.color || '#bfe8ff', a: 0.5 });
      for (const f of g.fx) if (f.shape === 'ghost' || !f.shape) { if (f.life > f.max * 0.4 && f.size > 3) L.push({ x: f.x, y: f.y, r: f.size * 4, color: f.color, a: 0.3 * (f.life / f.max) }); }
      for (const z of g.zones) if (z.kind !== 'tele' && z.color && (z.shape === 'circle' || z.shape === 'rect')) L.push({ x: z.shape === 'rect' ? z.x + z.w / 2 : z.x, y: z.shape === 'rect' ? z.y + z.h / 2 : z.y, r: (z.r || Math.max(z.w || 40, z.h || 40) / 2) * 1.3, color: z.color, a: 0.35 });
      for (const k of g.pickups) if (k.type === 'key' || k.type === 'container') L.push({ x: k.x, y: k.y, r: 50, color: k.type === 'key' ? ED.keys.KEYTYPES[k.keyType].color : '#ff4a6a', a: 0.4 });
      for (const bm of g.bombs) L.push({ x: bm.x, y: bm.y, r: 56, color: '#ff8a3a', a: 0.35 * (0.6 + 0.4 * Math.sin(t * 0.5)) });
      // lava and fire tiles glow
      const room = g.room; if (room && rt.dynTiles) for (const i of rt.dynTiles) if (room.tiles[i] === T.LAVA && (i % 3) === 0) L.push({ x: (i % C.COLS) * TILE + 16, y: Math.floor(i / C.COLS) * TILE + 16, r: 62, color: '#ff7a2a', a: 0.34 });
    }
    for (const f of skin.extraLights || []) { const l = f(g, t, st); if (l) for (const q of l) L.push(q); }
    return L;
  }
  /** multiply the room by (ambient + lights): the picture darkens away from every light and keeps its colour near them */
  function lightPass(g, c, t, st) {
    const lv = skin.level(); if (lv < 1) return;
    const th = g.theme, dim = st.dim || 0, o = lightCanvas(), l = o.c, amb = (skin.ambientOf && skin.ambientOf(g, t, st)) || (st.ambient ? mixc(st.ambient, '#ffffff', 0.55) : mixc('#e0dcf0', th.glow, 0.1));
    const room = g.room, rt = g.rt, dark_ = rt.dark && !room.cleared;
    l.globalCompositeOperation = 'source-over'; l.fillStyle = dark_ ? '#0c0a18' : mixc(amb, '#000000', dim + 0.12); l.fillRect(0, 0, LW, LH);
    l.globalCompositeOperation = 'lighter';
    const lights = lightsOf(g, t, st, lv);
    for (const L of lights) { const sp = skin.glowSprite(L.color), r = L.r / 4; l.globalAlpha = Math.min(1, L.a * (dark_ ? 1 : 0.9)); l.drawImage(sp.cv, L.x / 4 - r, L.y / 4 - r, r * 2, r * 2); }
    l.globalAlpha = 1; l.globalCompositeOperation = 'source-over';
    const keepS = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true; c.globalCompositeOperation = 'multiply'; c.drawImage(o.cv, 0, 0, LW, LH, 0, 0, C.ROOM_W, C.ROOM_H); c.globalCompositeOperation = 'source-over'; c.imageSmoothingEnabled = keepS;
    // a little bloom on the brightest sources
    if (lv >= 2) { c.globalCompositeOperation = 'lighter'; for (const L of lights) if (L.a >= 0.5 && L.r < 140) { const sp = skin.glowSprite(L.color), r = L.r * 0.5; c.globalAlpha = 0.16 * L.a; c.drawImage(sp.cv, L.x - r, L.y - r, r * 2, r * 2); } c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  }
  skin.lightPass = lightPass; skin.lightsOf = lightsOf;
  skin.dynTile = dynTile;
})(typeof globalThis !== 'undefined' ? globalThis : this);

'use strict';
/* Draws the EMBERDEEP app icons (an ember flame on the dungeon dark) with a tiny software rasteriser and writes PNGs: no dependencies.
 *   node tools/make-icons.js     ->  icons/icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png favicon-32.png
 * The flame stays inside the central 60% so the same artwork serves as a "maskable" icon (the OS may crop the corners to a circle). */
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
// the flame: t runs 0 (tip) .. 1 (base); returns the half width and the sideways bend at that height
const flame = (y, top, bot, lean) => { const t = (y - top) / (bot - top); if (t < 0 || t > 1) return null; return { w: 0.52 * Math.sin(Math.PI * Math.pow(t, 0.95)) * (0.25 + 0.75 * Math.pow(t, 0.8)), c: lean * Math.sin(Math.PI * 1.5 * t) * (1 - t) * (1 - t * 0.2) }; };
const inFlame = (x, y, top, bot, lean, scale) => { const f = flame(y, top, bot, lean); return !!f && Math.abs(x - f.c) < f.w * scale; };

/** colour of one sample at (x, y) in -1..1 */
function shade(x, y) {
  const r = Math.hypot(x, y);
  let col = mix([34, 18, 40], [5, 4, 9], clamp(r / 1.15, 0, 1));                                   // dungeon dark, a little warmer in the middle
  const glow = Math.exp(-Math.pow(Math.hypot(x, y - 0.12) / 0.55, 2)); col = mix(col, [140, 50, 20], glow * 0.55);
  // stone steps at the foot (a descent): three wide dark slabs
  for (let i = 0; i < 3; i++) { const yy = 0.5 + i * 0.1, hw = 0.5 - i * 0.12; if (y > yy && y < yy + 0.075 && Math.abs(x) < hw) col = mix(col, [10, 8, 16], 0.85); }
  if (inFlame(x, y, -0.62, 0.46, 0.2, 1)) { const t = (y + 0.62) / 1.08; col = mix([226, 52, 28], [255, 184, 56], clamp(Math.pow(t, 0.8) * 1.1, 0, 1)); }
  if (inFlame(x, y, -0.2, 0.4, 0.09, 0.62)) { const t = (y + 0.2) / 0.6; col = mix([255, 214, 90], [255, 248, 206], clamp(t * 1.1, 0, 1)); }
  // three sparks drifting up
  for (const [sx, sy, sr] of [[0.36, -0.42, 0.035], [-0.3, -0.55, 0.028], [0.2, -0.7, 0.022]]) if (Math.hypot(x - sx, y - sy) < sr) col = [255, 214, 120];
  return col;
}
function render(size) {
  const px = Buffer.alloc(size * size * 4), SS = 3;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0, g = 0, b = 0;
    for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) { const c = shade(((i + (si + 0.5) / SS) / size) * 2 - 1, ((j + (sj + 0.5) / SS) / size) * 2 - 1); r += c[0]; g += c[1]; b += c[2]; }
    const o = (j * size + i) * 4, n = SS * SS; px[o] = Math.round(r / n); px[o + 1] = Math.round(g / n); px[o + 2] = Math.round(b / n); px[o + 3] = 255;
  }
  return px;
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (buf) => { let c = -1; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let j = 0; j < size; j++) { raw[j * (size * 4 + 1)] = 0; px.copy(raw, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const out = path.join(__dirname, '..', 'icons'); fs.mkdirSync(out, { recursive: true });
const big = render(512);
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512, big));
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), png(512, big));
for (const [name, size] of [['icon-192.png', 192], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) fs.writeFileSync(path.join(out, name), png(size, render(size)));
console.log('icons written to ' + out);

/* EMBERDEEP — art_core.js : the engine of v23 "POLISH" — the same shapes, finished properly.
 *
 *  Same canvas-drawn shapes (no sprites, no files), but shaded from one light, outlined, rim-lit, animated and lit by a light pass.  See ART.md.
 *  This file is the engine + the creatures: switches, colour helpers, canvas pool, baked-sprite cache, the INK pipeline (outline + shading + rim light applied to any flat drawing),
 *  foes (ink + tracking eyes + breathing / walking / anticipation / recoil / spawn-in), the player and the eleven classes, bosses and their parts, projectiles, swings, telegraph zones, fx.
 *  Loaded after render.js (it needs ED.render); the pack itself is declared in pack_v23.js.  art_world.js has tiles, lands and lights; art_scene.js props, doors, zones, fx and the world renderer; art_ui.js the chrome.  The classic renderer in render.js is untouched: ED.skin.on() === false draws exactly what it always drew.
 */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, P = ED.packs, R = ED.render, skin = ED.skin;
  const TAU = U.TAU, V = 'v23', crand = U.crand;


  // ==================================================================== switches
  skin.version = V;
  skin.on = function () { const f = skin.flags.polish; if (f === true) return true; if (f === false) return false; return P.on(V); };
  skin.reduced = false; try { if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) skin.reduced = true; } catch (e) { /* ignore */ }
  skin.auto = 2;                    // the automatic ceiling: drops by one when frames take too long, never rises on its own
  /** 0 = off (ink + shading only), 1 = low (soft lights, no particles), 2 = normal */
  skin.level = function () {
    const s = ED.save && ED.save.meta && ED.save.meta.settings, set = s && s.effects !== undefined ? U.clamp(s.effects | 0, 0, 2) : (skin.reduced ? 1 : 2);
    return Math.min(set, skin.auto);
  };
  skin.STYLES = skin.STYLES || {};

  // ==================================================================== colours (hex in, hex out: chains safely, unlike U.mix)
  const cc = new Map();
  function rgbOf(c) {
    let v = cc.get(c); if (v) return v;
    if (c[0] === '#') { v = c.length === 4 ? [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16)] : [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    else { const m = /(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/.exec(c); v = m ? [+m[1], +m[2], +m[3]] : [255, 255, 255]; }
    if (cc.size > 4000) cc.clear(); cc.set(c, v); return v;
  }
  const hex2 = (n) => { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); };
  const toHex = (a) => '#' + hex2(a[0]) + hex2(a[1]) + hex2(a[2]);
  const mc = new Map();
  /** blend two colours: mixc('#ff0000', '#000000', 0.5) -> '#800000' */
  function mixc(a, b, t) { const k = a + '|' + b + '|' + (Math.round(t * 100)); let v = mc.get(k); if (v) return v; const x = rgbOf(a), y = rgbOf(b); v = toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); if (mc.size > 6000) mc.clear(); mc.set(k, v); return v; }
  const dark = (c, f) => mixc(c, '#07050f', f), lite = (c, f) => mixc(c, '#fff6e4', f);
  const rgba = (c, a) => { const x = rgbOf(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + (Math.round(a * 1000) / 1000) + ')'; };
  /** relative luminance 0..1 (for the contrast tests) */
  function lum(c) { const x = rgbOf(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; }
  const contrast = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  skin.color = { rgbOf, mixc, dark, lite, rgba, lum, contrast, toHex };

  // ==================================================================== canvases: a pool of scratch sheets, and a bounded cache of baked sprites
  const pool = {};
  function mk(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
  /** a scratch canvas (cleared over w x h): the same sheet is reused every frame, so nothing is allocated while playing */
  function slot(name, w, h) {
    let o = pool[name];
    if (!o || o.cv.width < w || o.cv.height < h) { const cv = mk(Math.max(w, o ? o.cv.width : 0), Math.max(h, o ? o.cv.height : 0)); o = pool[name] = { cv, c: cv.getContext('2d') }; }
    const c = o.c; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, w, h); return o;
  }
  const baked = new Map(), BAKE_CAP = 700;
  /** draw once into its own canvas, keep the result under `key` (least recently used goes first) */
  function bake(key, w, h, fn) {
    let b = baked.get(key);
    if (b) { baked.delete(key); baked.set(key, b); return b; }
    const cv = mk(w, h), c = cv.getContext('2d'); fn(c, w, h); b = { cv, w, h };
    baked.set(key, b); if (baked.size > BAKE_CAP) baked.delete(baked.keys().next().value);
    return b;
  }
  skin.bake = bake; skin.slot = slot; skin.baked = baked;
  skin.reset = function () { baked.clear(); for (const k in pool) delete pool[k]; mc.clear(); cc.clear(); skin.fxState = null; };

  // ==================================================================== the INK pipeline: outline + shading + rim light for any flat drawing
  /** `draw(ctx)` paints the flat art on a w x h sheet (origin top-left, leave an `outline` + 2px margin); returns the finished sheet (a pooled canvas: use it at once) */
  function ink(draw, w, h, o) {
    o = o || {}; const ow = o.outline === undefined ? 2 : o.outline, lt = o.light === undefined ? 0.28 : o.light, sh = o.shade === undefined ? 0.36 : o.shade;
    const A = slot('inkA', w, h), a = A.c; draw(a);
    if (lt > 0 || sh > 0) {                                                  // shading: lit from the top left, in shade to the bottom right
      a.globalCompositeOperation = 'source-atop'; const gr = a.createLinearGradient(w * 0.15, h * 0.08, w * 0.85, h * 0.97);
      gr.addColorStop(0, 'rgba(255,248,232,' + lt + ')'); gr.addColorStop(0.42, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(10,4,26,' + sh + ')'); a.fillStyle = gr; a.fillRect(0, 0, w, h); a.globalCompositeOperation = 'source-over';
    }
    const B = slot('inkB', w, h), b = B.c;
    if (ow > 0) {
      const S = slot('inkS', w, h), s = S.c; s.drawImage(A.cv, 0, 0, w, h, 0, 0, w, h); s.globalCompositeOperation = 'source-in'; s.fillStyle = o.outlineColor || 'rgba(8,5,18,0.94)'; s.fillRect(0, 0, w, h); s.globalCompositeOperation = 'source-over';
      const n = ow > 2.5 ? 12 : 8; for (let k = 0; k < n; k++) { const an = k * TAU / n; b.drawImage(S.cv, 0, 0, w, h, Math.cos(an) * ow, Math.sin(an) * ow, w, h); }
    }
    b.drawImage(A.cv, 0, 0, w, h, 0, 0, w, h);
    if (o.rim !== false) {                                                   // rim light: a thin bright edge on the lit (top-left) side only
      const Rm = slot('inkR', w, h), r = Rm.c; r.drawImage(A.cv, 0, 0, w, h, 0, 0, w, h); r.globalCompositeOperation = 'source-in'; r.fillStyle = o.rimColor || 'rgba(255,246,228,0.7)'; r.fillRect(0, 0, w, h);
      r.globalCompositeOperation = 'destination-out'; const d = Math.max(1.4, ow * 0.8); r.drawImage(A.cv, 0, 0, w, h, d, d * 1.1, w, h);
      b.globalCompositeOperation = 'source-atop'; b.drawImage(Rm.cv, 0, 0, w, h, 0, 0, w, h); b.globalCompositeOperation = 'source-over';
    }
    return B;
  }
  skin.ink = ink;

  // ==================================================================== small sprites: soft shadow, soft light disc, glint
  const shadowSprite = () => bake('shadow', 64, 32, (c, w, h) => { c.save(); c.translate(w / 2, h / 2); c.scale(1, 0.5); const g = c.createRadialGradient(0, 0, 1, 0, 0, w / 2); g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(0.55, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(-w / 2, -w / 2, w, w); c.restore(); });
  /** a soft disc of light in a colour (white-hot centre): the light pass and glows scale and tint it */
  function glowSprite(color) { return bake('glow|' + color, 64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, rgba(lite(color, 0.6), 1)); g.addColorStop(0.25, rgba(color, 0.55)); g.addColorStop(0.6, rgba(color, 0.16)); g.addColorStop(1, rgba(color, 0)); c.fillStyle = g; c.fillRect(0, 0, w, h); }); }
  function shadow(c, x, y, rx, a) { const sp = shadowSprite(), ga = c.globalAlpha; c.globalAlpha = ga * (a === undefined ? 1 : a); c.drawImage(sp.cv, x - rx, y - rx * 0.5, rx * 2, rx); c.globalAlpha = ga; }
  /** additive glow: level 0 draws nothing (it is a luxury) */
  function glow(c, x, y, r, color, a) {
    if (skin.level() < 1 || r <= 0 || a <= 0) return; const s = glowSprite(color), keep = c.globalCompositeOperation, ga = c.globalAlpha;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = ga * Math.min(1, a * 1.8); c.drawImage(s.cv, x - r, y - r, r * 2, r * 2); c.globalAlpha = ga; c.globalCompositeOperation = keep;
  }
  skin.shadow = shadow; skin.glow = glow; skin.glowSprite = glowSprite;

  // ==================================================================== render-only state: per-entity animation trackers and cosmetic particles (never read by the simulation)
  const trk = new WeakMap();
  function track(e, t) {
    let k = trk.get(e); if (!k) { k = { px: e.x, py: e.y, sp: 0, step: crand() * 6, t0: t, face: e.face || 0, blink: 0 }; trk.set(e, k); }
    const dx = e.x - k.px, dy = e.y - k.py, sp = Math.hypot(dx, dy); k.sp += (Math.min(sp, 14) - k.sp) * 0.35; k.px = e.x; k.py = e.y; k.step += k.sp * 0.32; if (sp > 0.3) k.head = Math.atan2(dy, dx);
    return k;
  }
  skin.track = track;
  const partsOf = (g) => g.skinParts || (g.skinParts = []);
  /** cosmetic particles: {x,y,vx,vy,life,max,size,color,kind,rot,vr,g} — updated while drawing (so they keep moving in a hitstop), capped */
  function addPart(g, p) { const L = partsOf(g); if (L.length > 260) L.shift(); p.max = p.life; L.push(p); return p; }
  skin.addPart = addPart;
  function burstFx(g, x, y, n, color, speed, life, o) { o = o || {}; if (skin.level() < 1) n = Math.ceil(n / 3); for (let i = 0; i < n; i++) { const a = crand() * TAU, sp = speed * (0.4 + crand() * 0.8); addPart(g, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), life: life * (0.6 + crand() * 0.6), size: (o.size || 3) * (0.6 + crand() * 0.8), color, kind: o.kind || 'spark', rot: crand() * TAU, vr: (crand() - 0.5) * 0.4, g: o.g || 0.06 }); } }
  skin.burstFx = burstFx;
  function updateParts(g) {
    const L = partsOf(g); if (!L.length) return;
    for (const p of L) { p.life--; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.97; p.rot += p.vr; }
    U.compact(L, p => p.life > 0);
  }
  function drawParts(c, g) {
    const L = partsOf(g); if (!L.length) return;
    for (const p of L) {
      const k = p.life / p.max; c.globalAlpha = Math.min(1, k * 1.6);
      if (p.kind === 'shard') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color; c.beginPath(); c.moveTo(-p.size, -p.size * 0.5); c.lineTo(p.size, 0); c.lineTo(-p.size * 0.3, p.size * 0.6); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-p.size * 0.5, -p.size * 0.3, p.size * 0.6, p.size * 0.25); c.restore(); }
      else if (p.kind === 'puff') { const r = p.size * (1.6 - k * 0.6); c.fillStyle = rgba(p.color, 0.5 * k); c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill(); }
      else if (p.kind === 'mote') { c.fillStyle = rgba(p.color, 0.9); c.beginPath(); c.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, TAU); c.fill(); glow(c, p.x, p.y, p.size * 3.2, p.color, 0.35 * k); }
      else { c.fillStyle = rgba(lite(p.color, 0.45), 1); c.beginPath(); c.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, TAU); c.fill(); glow(c, p.x, p.y, p.size * 3, p.color, 0.3 * k); }
    }
    c.globalAlpha = 1;
  }
  skin.updateParts = updateParts; skin.drawParts = drawParts;
  // a death is a burst of shards and a puff; a hit is a few sparks (sim hooks: they only append to a render-only list and use the cosmetic PRNG)
  ED.hook('kill', V, (g, e) => {
    if (!skin.on() || !e || e.boss && e.big) return; const col = e.color || '#ffffff', n = e.boss ? 14 : Math.max(5, Math.min(12, Math.round(e.r / 2.4)));
    burstFx(g, e.x, e.y, n, col, 2.6, 26, { kind: 'shard', size: Math.max(2.5, e.r * 0.28), g: 0.09 }); addPart(g, { x: e.x, y: e.y, vx: 0, vy: -0.3, life: 22, size: e.r * 0.9, color: dark(col, 0.2), kind: 'puff', rot: 0, vr: 0, g: 0 });
  });

  // ==================================================================== foes
  const eyeSpec = (shape) => ({ circle: [0.34, 0.3, 0.2], tri: [0.2, 0.26, 0.17], diamond: [0.22, 0.26, 0.17], hex: [0.3, 0.3, 0.19], square: [0.3, 0.3, 0.2], star: [0.12, 0.2, 0.15], blob: [0.28, 0.32, 0.2], ghost: [0.26, 0.34, 0.2] }[shape] || [0.3, 0.3, 0.2]);
  /** two eyes that look at the player and blink (only for foes that do not draw their own face) */
  function eyes(c, g, e, k, t) {
    const sp = eyeSpec(e.def.shape), p = g.player, face = e.face || 0, near = e.def.shape === 'ghost' || e.def.shape === 'square' || e.def.shape === 'blob';
    const fa = near ? Math.PI / 2 : face, fx = Math.cos(fa), fy = Math.sin(fa), sx = -fy, sy = fx, ex = e.x + fx * e.r * sp[0] + (near ? 0 : 0), ey = e.y + fy * e.r * sp[0] - (near ? e.r * 0.12 : 0), er = Math.max(1.6, e.r * sp[2]);
    const la = p ? Math.atan2(p.y - e.y, p.x - e.x) : face, bl = ((t * 0.7 + (e.seed || 0) * 37) % 230) < 5 || (e.stun > 0);
    for (const sg of [-1, 1]) {
      const x = ex + sx * sg * e.r * sp[1], y = ey + sy * sg * e.r * sp[1];
      if (bl) { c.strokeStyle = 'rgba(10,6,20,0.9)'; c.lineWidth = Math.max(1.2, er * 0.45); c.beginPath(); c.moveTo(x - er, y); c.lineTo(x + er, y); c.stroke(); continue; }
      c.fillStyle = '#f6f2ea'; c.beginPath(); c.arc(x, y, er, 0, TAU); c.fill();
      c.fillStyle = '#120a1e'; c.beginPath(); c.arc(x + Math.cos(la) * er * 0.38, y + Math.sin(la) * er * 0.38, er * 0.58, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(x + Math.cos(la) * er * 0.38 - er * 0.18, y + Math.sin(la) * er * 0.38 - er * 0.2, er * 0.2, 0, TAU); c.fill();
    }
  }
  const WIND = { wind: 1, aim: 1, throw: 1, cast: 1, fade: 1, charge: 1, lash: 1, tele: 1 };
  /** the pose of a foe this frame: scale x / y, vertical bob, lean */
  function poseOf(e, k, t) {
    const age = e.t || 0; let sx = 1, sy = 1, bob = 0, lean = 0;
    const breath = Math.sin(t * 0.075 + (e.seed || 0) * 6) * 0.03; sx += breath * 0.6; sy += breath;
    if (k.sp > 0.25) { const w = Math.min(1, k.sp / 2.2), ph = Math.sin(k.step * 2); bob = -Math.abs(Math.sin(k.step)) * 1.7 * w; sx += ph * 0.05 * w; sy -= ph * 0.05 * w; }
    if (WIND[e.state]) { const pu = 1 + 0.07 * Math.sin(t * 0.7); sx *= pu; sy *= pu; lean = 0.5; }
    if (e.flash > 0) { const f = e.flash / 6; sx *= 1 + 0.12 * f; sy *= 1 - 0.1 * f; }
    if (age < 14) { const q = age / 14, s = q < 1 ? 1 + 2.4 * Math.pow(q - 1, 3) + 1.4 * Math.pow(q - 1, 2) : 1; sx *= Math.max(0.05, s); sy *= Math.max(0.05, s); }
    return { sx, sy, bob, lean };
  }
  const BUCKETS = 16, STATIC_SHAPES = { circle: 1, square: 1, hex: 1, tri: 1, diamond: 1, star: 1 };
  /** the finished picture of a foe at its own origin: {cv, w, h} (baked when it cannot change from frame to frame) */
  function foeSprite(e, def, t, tint, flash) {
    const r = e.r, pad = Math.ceil(r * (def.draw ? 0.8 : 0.35) + 8), w = Math.ceil(2 * r + 2 * pad), h = w, body = flash ? '#ffffff' : tint, ow = Math.max(1.5, Math.min(3, r * 0.14));
    const flat = (c, x, y, rot) => { c.fillStyle = body; R.shape(c, def.shape, x, y, r, rot, e.t); c.fill(); };
    const rot = e.face || 0;
    if (!def.draw && STATIC_SHAPES[def.shape] && !flash) {
      const rb = (def.shape === 'circle' || def.shape === 'square') ? 0 : Math.round(((rot % TAU) + TAU) % TAU / TAU * BUCKETS) % BUCKETS;
      return bake('foe|' + def.shape + '|' + body + '|' + Math.round(r) + '|' + rb, w, h, (c) => { const o = ink((a) => flat(a, w / 2, h / 2, rb * TAU / BUCKETS), w, h, { outline: ow }); c.drawImage(o.cv, 0, 0, w, h, 0, 0, w, h); });
    }
    const o = ink((a) => { a.save(); a.translate(w / 2 - e.x, h / 2 - e.y); flat(a, e.x, e.y, rot); if (def.draw && !flash) { try { def.draw(a, e, t); } catch (err) { /* a bad extra never takes the frame down */ } } a.restore(); }, w, h, { outline: ow, shade: flash ? 0.1 : 0.36, light: flash ? 0 : 0.28 });
    return { cv: o.cv, w, h, live: true };
  }
  function drawFoe(g, c, e, t) {
    const def = e.def, a = e.vis === undefined ? 1 : e.vis; if (a <= 0.01) return;
    const k = track(e, t), pose = poseOf(e, k, t), lv = skin.level();
    c.save(); c.globalAlpha = a;
    shadow(c, e.x + 2, e.y + e.r * 0.78, e.r * 1.05, 0.9);
    if (e.elite) { const mc = e.mods.length ? e.mods[0].color : '#ffd24a', pulse = 0.5 + 0.5 * Math.sin(t * 0.12); glow(c, e.x, e.y, e.r * 2.2, mc, 0.22 + 0.1 * pulse); c.strokeStyle = rgba(mc, 0.9); c.lineWidth = 2.2; c.beginPath(); c.arc(e.x, e.y, e.r + 4 + pulse * 2, 0, TAU); c.stroke(); }
    if (e.state === 'wind' || e.state === 'aim' || e.state === 'throw' || e.state === 'cast' || e.state === 'fade') {
      const ang = e.cAng !== undefined && def.id === 'charger' ? e.cAng : e.lAng !== undefined && def.id === 'lancer' ? e.lAng : null;
      if (ang !== null) { const len = def.id === 'charger' ? 300 : 210; hatchLine(c, e.x, e.y, e.x + Math.cos(ang) * len, e.y + Math.sin(ang) * len, e.r * 1.4, '#ff5a4a', 0.35 + 0.15 * Math.sin(t * 0.5)); }
      c.fillStyle = '#ff5a4a'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.fillText('!', e.x, e.y - e.r - 10 - Math.abs(Math.sin(t * 0.4)) * 2);
    }
    const slow = e.status && e.status.slow, burn = e.status && e.status.burn, tint = slow ? mixc(e.color, '#7fd8ff', 0.5) : e.color, spr = foeSprite(e, def, t, tint, e.flash > 0);
    c.save(); c.translate(Math.round(e.x), Math.round(e.y + pose.bob)); if (pose.lean) c.rotate(Math.sin(t * 0.9) * 0.04); c.scale(pose.sx, pose.sy);
    if (e.flash > 0) c.globalAlpha = a; c.drawImage(spr.cv, 0, 0, spr.w, spr.h, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    c.restore();
    if (!def.draw && e.flash <= 0 && pose.sx > 0.3) { c.save(); c.translate(0, pose.bob); eyes(c, g, e, k, t); c.restore(); }
    if (slow) { c.fillStyle = 'rgba(180,235,255,0.18)'; R.shape(c, def.shape, e.x, e.y, e.r * 1.02, e.face || 0, e.t); c.fill(); c.strokeStyle = 'rgba(200,240,255,0.7)'; c.lineWidth = 1.5; c.stroke(); }
    if (e.shieldArc && e.guardBreak <= 0 && e.state !== 'wind' && e.state !== 'bash') {
      glow(c, e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r, e.r * 1.2, '#9fc4ff', 0.2);
      c.strokeStyle = '#e4f0ff'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(e.x, e.y, e.r + 5, e.face - e.shieldArc / 2, e.face + e.shieldArc / 2); c.stroke();
      c.strokeStyle = 'rgba(120,160,220,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, e.r + 9, e.face - e.shieldArc / 2, e.face + e.shieldArc / 2); c.stroke(); c.lineCap = 'butt';
    } else if (e.shieldArc && e.guardBreak > 0) { c.fillStyle = '#ffd24a'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText('BROKEN', e.x, e.y - e.r - 6); }
    if (e.ward > 0) { c.strokeStyle = 'rgba(180,210,255,0.85)'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, e.r + 7, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(180,210,255,0.3)'; c.lineWidth = 5; c.stroke(); }
    if (burn) { for (let q = 0; q < 3; q++) { const fy = e.y - e.r * 0.3 - ((t * 0.8 + q * 7) % 16), fx = e.x + Math.sin(t * 0.3 + q * 2) * e.r * 0.6; c.fillStyle = 'rgba(255,170,60,0.85)'; c.beginPath(); c.arc(fx, fy, 2.6 - (fy < e.y - e.r ? 1 : 0), 0, TAU); c.fill(); glow(c, fx, fy, 8, '#ff8a2a', 0.3); } }
    if (e.stun > 0) { c.strokeStyle = '#ffd24a'; c.lineWidth = 2; for (let q = 0; q < 3; q++) { const a2 = t * 0.2 + q * 2.1; c.beginPath(); c.arc(e.x + Math.cos(a2) * e.r * 0.8, e.y - e.r - 5 + Math.sin(a2) * 3, 2.5, 0, TAU); c.stroke(); } }
    if (e.t < 14 && e.t >= 0) { const q = e.t / 14; c.strokeStyle = rgba(e.color, 0.7 * (1 - q)); c.lineWidth = 2.5 * (1 - q) + 0.5; c.beginPath(); c.arc(e.x, e.y + e.r * 0.5, e.r * (0.6 + q * 1.8), 0, TAU); c.stroke(); }
    c.restore();
    // health bar for elites and big things; the key a foe carries
    if ((e.elite || e.maxHp > 80) && e.hp < e.maxHp || e.elite) {
      const w = Math.max(26, e.r * 2), f = U.clamp(e.hp / e.maxHp, 0, 1), bx = e.x - w / 2, by = e.y - e.r - 14, bc = e.elite && e.mods.length ? e.mods[0].color : '#ff6a6a';
      c.fillStyle = 'rgba(8,4,16,0.75)'; c.fillRect(bx - 1, by - 1, w + 2, 6); c.fillStyle = dark(bc, 0.55); c.fillRect(bx, by, w, 4); c.fillStyle = bc; c.fillRect(bx, by, w * f, 4); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(bx, by, w * f, 1.4);
      if (e.elite) { c.font = 'bold 10px monospace'; c.textAlign = 'center'; let x0 = e.x - (e.mods.length - 1) * 5; for (const m of e.mods) { c.fillStyle = m.color; c.fillText(m.glyph, x0, by - 3); x0 += 10; } }
    }
    if (e.carriesKey) { const kt = ED.keys.KEYTYPES[e.carriesKey]; glow(c, e.x, e.y - e.r - 22, 14, kt.color, 0.5); R.ICONS.key(c, e.x - 2, e.y - e.r - 24 + Math.sin(t * 0.2) * 2, 7, kt.color); }
  }
  /** telegraph line: hatched band + bright edges (the one visual language for "this will hurt") */
  function hatchLine(c, x1, y1, x2, y2, w, color, a) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
    c.save(); c.translate(x1, y1); c.rotate(ang); c.fillStyle = rgba(color, a * 0.5); c.fillRect(0, -w / 2, len, w);
    c.strokeStyle = rgba(color, a * 1.4); c.lineWidth = 1.3; c.beginPath(); for (let x = 0; x < len; x += 11) { c.moveTo(x, -w / 2); c.lineTo(x + w * 0.5, w / 2); } c.stroke();
    c.strokeStyle = rgba(lite(color, 0.35), Math.min(1, a * 1.7)); c.lineWidth = 2; c.strokeRect(0, -w / 2, len, w); c.restore();
  }
  skin.hatchLine = hatchLine;

  // ==================================================================== bosses: the whole body + every part inked together, then bars and rings on top
  function drawBoss(g, c, e, t) {
    const def = e.bdef, a = e.vis === undefined ? 1 : e.vis; if (a <= 0.01) return;
    const k = track(e, t), jump = e.jump || 0, x = e.x, y = e.y - jump, r = e.r, col = e.flash > 0 ? '#ffffff' : e.color, dk = dark(e.color, 0.5), face = e.face || 0;
    c.save(); c.globalAlpha = Math.max(0, a);
    shadow(c, e.x + 4, e.y + r * 0.82, r * (1.15 - jump / 160), 0.9);
    glow(c, x, y, r * 2.1, e.color, 0.16 + (e.enraged ? 0.18 : 0));
    if (e.enraged) { c.strokeStyle = 'rgba(255,60,50,' + (0.4 + 0.3 * Math.sin(t * 0.3)) + ')'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, r * 1.15, 0, TAU); c.stroke(); }
    // extent of the body and its parts, so the sheet is big enough
    let ext = r * 1.7; if (e.parts) for (const p of e.parts) if (!p.dead) ext = Math.max(ext, Math.hypot(p.x - x, p.y - y) + p.r + 14);
    ext = Math.min(ext + 12, 330); const sc = ext > 230 ? 230 / ext : 1, wh = Math.ceil(2 * ext * sc), cx = wh / 2, bob = Math.sin(t * 0.045 + (e.seed || 0)) * 2.2;
    const o = ink((s) => {
      s.save(); s.translate(cx, cx); s.scale(sc, sc); s.translate(-x, -y);
      s.lineWidth = 3; s.strokeStyle = 'rgba(0,0,0,0)'; R.parts.bossBody(s, e, def, x, y, r, col, 'rgba(0,0,0,0.001)', t, face); R.parts.bossParts(s, e, 'rgba(0,0,0,0.001)', t, true);
      s.restore();
    }, wh, wh, { outline: Math.max(2, Math.min(4, r * 0.035)) / 1, light: 0.3, shade: 0.4 });
    c.save(); c.translate(0, bob); c.drawImage(o.cv, 0, 0, wh, wh, x - cx / sc, y - cx / sc, wh / sc, wh / sc); c.restore();
    // live overlays: part bars, target ring, vulnerable highlights, shimmer
    if (e.parts) {
      const tp = e.parts.filter(p => !p.dead).sort((p, q) => p.group - q.group)[0];
      for (const p of e.parts) {
        if (p.dead) continue; const vul = ED.bosses.partVulnerable(e, p);
        if (vul && p.kind !== 'core') { c.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * Math.sin(t * 0.2)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y + bob, p.r + 1, 0, TAU); c.stroke(); }
        if (p.kind === 'core' && vul) glow(c, p.x, p.y + bob, p.r * 1.8, '#ffd24a', 0.5);
        if (p.flash > 0) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(p.x, p.y + bob, p.r, 0, TAU); c.fill(); }
        if (p.kind !== 'core' || vul) { const w = Math.max(26, p.r * 1.6), f = U.clamp(p.hp / p.maxHp, 0, 1), bc = vul ? '#ffd24a' : '#8a8aa0'; c.fillStyle = 'rgba(8,4,16,0.8)'; c.fillRect(p.x - w / 2 - 1, p.y - p.r - 11 + bob, w + 2, 6); c.fillStyle = dark(bc, 0.6); c.fillRect(p.x - w / 2, p.y - p.r - 10 + bob, w, 4); c.fillStyle = bc; c.fillRect(p.x - w / 2, p.y - p.r - 10 + bob, w * f, 4); }
        if (p === tp && !e.invuln && e.intro <= 0) { c.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(t * 0.2)) + ')'; c.lineWidth = 2; c.setLineDash([6, 5]); c.beginPath(); c.arc(p.x, p.y + bob, p.r + 8, 0, TAU); c.stroke(); c.setLineDash([]); }
      }
    } else if (e.flash > 0) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(x, y + bob, r * 0.95, 0, TAU); c.fill(); }
    if (e.invuln && e.intro <= 0) { c.strokeStyle = 'rgba(170,205,255,0.55)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y + bob, r + 6, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(170,205,255,0.2)'; c.lineWidth = 8; c.stroke(); }
    c.restore();
  }

  // ==================================================================== the player and the eleven classes
  const CLASS_ART = {
    knight: (a, x, y, r, col) => { a.fillStyle = lite(col, 0.12); a.beginPath(); a.arc(x, y - r * 0.35, r * 0.78, Math.PI, 0); a.fill(); a.fillStyle = '#e8e8f4'; a.beginPath(); a.moveTo(x - 2, y - r * 1.55); a.lineTo(x + 2, y - r * 1.55); a.lineTo(x + 5, y - r * 0.75); a.lineTo(x - 5, y - r * 0.75); a.closePath(); a.fill(); a.fillStyle = '#1a1830'; a.fillRect(x - r * 0.55, y - r * 0.38, r * 1.1, r * 0.2); },
    lancer: (a, x, y, r, col) => { a.fillStyle = '#d04a4a'; a.fillRect(x - r * 0.85, y - r * 0.55, r * 1.7, r * 0.3); a.beginPath(); a.moveTo(x + r * 0.7, y - r * 0.45); a.lineTo(x + r * 1.5, y - r * 0.2); a.lineTo(x + r * 0.8, y - r * 0.2); a.fill(); },
    brute: (a, x, y, r, col) => { a.fillStyle = dark(col, 0.25); a.beginPath(); a.ellipse(x - r * 0.95, y + r * 0.1, r * 0.4, r * 0.55, 0, 0, TAU); a.ellipse(x + r * 0.95, y + r * 0.1, r * 0.4, r * 0.55, 0, 0, TAU); a.fill(); a.fillStyle = '#6a4a2a'; a.fillRect(x - r * 0.9, y + r * 0.35, r * 1.8, r * 0.28); },
    rogue: (a, x, y, r, col) => { a.fillStyle = dark(col, 0.55); a.beginPath(); a.arc(x, y - r * 0.15, r * 0.98, Math.PI * 1.02, Math.PI * 1.98); a.lineTo(x + r * 0.7, y - r * 0.2); a.quadraticCurveTo(x, y + r * 0.25, x - r * 0.7, y - r * 0.2); a.closePath(); a.fill(); a.fillStyle = '#a02a3a'; a.fillRect(x - r * 0.7, y + r * 0.35, r * 1.4, r * 0.25); },
    ranger: (a, x, y, r, col) => { a.fillStyle = dark(col, 0.45); a.beginPath(); a.arc(x, y - r * 0.2, r * 0.98, Math.PI * 1.05, Math.PI * 1.95); a.closePath(); a.fill(); a.fillStyle = '#e0c060'; a.beginPath(); a.moveTo(x + r * 0.5, y - r * 0.9); a.quadraticCurveTo(x + r * 1.4, y - r * 1.4, x + r * 1.2, y - r * 0.4); a.quadraticCurveTo(x + r * 0.9, y - r * 0.8, x + r * 0.5, y - r * 0.9); a.fill(); },
    mage: (a, x, y, r, col) => { a.fillStyle = dark(col, 0.45); a.beginPath(); a.moveTo(x - r * 1.1, y - r * 0.35); a.lineTo(x + r * 0.15, y - r * 1.95); a.lineTo(x + r * 1.1, y - r * 0.35); a.closePath(); a.fill(); a.fillStyle = '#ffd24a'; a.fillRect(x - r * 0.95, y - r * 0.5, r * 1.9, r * 0.14); a.beginPath(); a.arc(x + r * 0.15, y - r * 1.9, 1.6, 0, TAU); a.fill(); },
    trickster: (a, x, y, r, col) => { a.fillStyle = '#e8c04a'; for (const sg of [-1, 1]) { a.beginPath(); a.moveTo(x + sg * r * 0.3, y - r * 0.75); a.quadraticCurveTo(x + sg * r * 1.5, y - r * 1.1, x + sg * r * 1.45, y - r * 0.2); a.quadraticCurveTo(x + sg * r * 1.05, y - r * 0.75, x + sg * r * 0.3, y - r * 0.75); a.fill(); } a.fillStyle = '#c04a8a'; a.beginPath(); a.arc(x + r * 1.45, y - r * 0.2, 1.8, 0, TAU); a.arc(x - r * 1.45, y - r * 0.2, 1.8, 0, TAU); a.fill(); },
    necromancer: (a, x, y, r, col) => { a.fillStyle = dark(col, 0.6); a.beginPath(); a.arc(x, y - r * 0.15, r * 0.98, Math.PI, 0); a.lineTo(x + r * 0.75, y + r * 0.3); a.lineTo(x - r * 0.75, y + r * 0.3); a.closePath(); a.fill(); a.fillStyle = '#d8d0b8'; a.beginPath(); a.arc(x, y + r * 0.55, r * 0.22, 0, TAU); a.fill(); a.fillStyle = '#10101c'; a.fillRect(x - r * 0.12, y + r * 0.5, 2, 2); a.fillRect(x + r * 0.05, y + r * 0.5, 2, 2); },
    alchemist: (a, x, y, r, col) => { a.fillStyle = '#3a3a48'; a.fillRect(x - r * 0.85, y - r * 0.5, r * 1.7, r * 0.34); a.fillStyle = '#7fe0ff'; a.beginPath(); a.arc(x - r * 0.4, y - r * 0.33, r * 0.2, 0, TAU); a.arc(x + r * 0.4, y - r * 0.33, r * 0.2, 0, TAU); a.fill(); a.fillStyle = '#8a5a2a'; a.fillRect(x - r * 0.9, y + r * 0.45, r * 1.8, r * 0.22); },
    monk: (a, x, y, r, col) => { a.fillStyle = '#e8a040'; a.fillRect(x - r * 0.95, y - r * 0.6, r * 1.9, r * 0.28); a.fillStyle = dark(col, 0.2); a.beginPath(); a.moveTo(x - r * 0.3, y + r * 0.2); a.lineTo(x + r * 0.3, y + r * 0.2); a.lineTo(x + r * 0.5, y + r * 0.9); a.lineTo(x - r * 0.5, y + r * 0.9); a.closePath(); a.fill(); },
    warden: (a, x, y, r, col) => { a.fillStyle = '#9ab0d0'; for (const sg of [-1, 1]) { a.beginPath(); a.ellipse(x + sg * r * 0.95, y + r * 0.05, r * 0.38, r * 0.5, 0, 0, TAU); a.fill(); } a.fillStyle = lite(col, 0.2); a.beginPath(); a.arc(x, y - r * 0.35, r * 0.75, Math.PI, 0); a.fill(); a.fillStyle = '#1a2038'; a.fillRect(x - r * 0.5, y - r * 0.4, r, r * 0.18); },
  };
  function playerSprite(p, col) {
    const r = p.r, w = Math.ceil(r * 4.4), h = w, cls = p.classId, ar = p.armor || {}, key = 'pl|' + cls + '|' + col + '|' + (ar.chest ? ED.items.itemColor(ar.chest) : '') + '|' + (ar.helmet ? ED.items.itemColor(ar.helmet) : '') + '|' + (ar.boots ? ED.items.itemColor(ar.boots) : '') + '|' + Math.round(r);
    return bake(key, w, h, (c) => {
      const o = ink((a) => {
        const x = w / 2, y = h / 2; a.fillStyle = col; a.beginPath(); a.arc(x, y, r, 0, TAU); a.fill();
        if (ar.chest) { a.strokeStyle = ED.items.itemColor(ar.chest); a.lineWidth = 3.2; a.beginPath(); a.arc(x, y, r - 2.2, 0.35, 2.8); a.stroke(); }
        const art = CLASS_ART[cls]; if (art) art(a, x, y, r, col);
        if (ar.helmet) { a.fillStyle = ED.items.itemColor(ar.helmet); a.beginPath(); a.arc(x, y - 3, r - 3, Math.PI * 1.1, Math.PI * 1.9); a.fill(); }
        if (ar.boots) { a.fillStyle = ED.items.itemColor(ar.boots); a.fillRect(x - 6, y + r - 5, 4.6, 3.4); a.fillRect(x + 1.4, y + r - 5, 4.6, 3.4); }
      }, w, h, { outline: 2, light: 0.3, shade: 0.34 });
      c.drawImage(o.cv, 0, 0, w, h, 0, 0, w, h);
    });
  }
  const WEAPON_ART = {
    sword(c, col) { const gr = c.createLinearGradient(0, -3, 0, 3); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, col); gr.addColorStop(1, dark(col, 0.4)); c.fillStyle = gr; c.beginPath(); c.moveTo(10, -2.4); c.lineTo(25, -1.4); c.lineTo(29, 0); c.lineTo(25, 1.4); c.lineTo(10, 2.4); c.closePath(); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.85)'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = '#c8a050'; c.fillRect(7.5, -6, 3.6, 12); c.fillStyle = '#6a4a2a'; c.fillRect(2, -1.6, 6, 3.2); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1; c.strokeRect(7.5, -6, 3.6, 12); },
    spear(c, col) { c.fillStyle = '#8a6a3a'; c.fillRect(4, -1.2, 26, 2.4); const gr = c.createLinearGradient(0, -4, 0, 4); gr.addColorStop(0, '#fff'); gr.addColorStop(1, dark(col, 0.2)); c.fillStyle = gr; c.beginPath(); c.moveTo(38, 0); c.lineTo(28, -4.5); c.lineTo(30, 0); c.lineTo(28, 4.5); c.closePath(); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1.1; c.stroke(); },
    hammer(c, col) { c.fillStyle = '#8a6a3a'; c.fillRect(6, -1.8, 18, 3.6); const gr = c.createLinearGradient(0, -8, 0, 8); gr.addColorStop(0, lite(col, 0.4)); gr.addColorStop(1, dark(col, 0.35)); c.fillStyle = gr; c.fillRect(21, -9, 10, 18); c.strokeStyle = 'rgba(8,5,18,0.85)'; c.lineWidth = 1.4; c.strokeRect(21, -9, 10, 18); },
    daggers(c, col) { for (const sy of [-5, 5]) { const gr = c.createLinearGradient(0, sy - 2, 0, sy + 2); gr.addColorStop(0, '#fff'); gr.addColorStop(1, dark(col, 0.3)); c.fillStyle = gr; c.beginPath(); c.moveTo(8, sy - 1.8); c.lineTo(18, sy - 1.2); c.lineTo(22, sy); c.lineTo(18, sy + 1.2); c.lineTo(8, sy + 1.8); c.closePath(); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1; c.stroke(); } },
    bow(c, col) { c.strokeStyle = 'rgba(8,5,18,0.9)'; c.lineWidth = 5; c.beginPath(); c.arc(8, 0, 11, -1.2, 1.2); c.stroke(); c.strokeStyle = '#b08a4a'; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(8 + Math.cos(1.2) * 11, Math.sin(1.2) * 11); c.lineTo(8 + Math.cos(-1.2) * 11, Math.sin(-1.2) * 11); c.stroke(); },
    boomerang(c, col) { c.strokeStyle = 'rgba(8,5,18,0.9)'; c.lineWidth = 6; c.lineJoin = 'round'; c.beginPath(); c.moveTo(10, -7); c.lineTo(16, 0); c.lineTo(10, 7); c.stroke(); c.strokeStyle = col; c.lineWidth = 3.4; c.stroke(); c.lineJoin = 'miter'; },
    staff(c, col) { c.fillStyle = '#7a5a30'; c.fillRect(5, -1.3, 22, 2.6); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1; c.strokeRect(5, -1.3, 22, 2.6); skin.glow(c, 29, 0, 11, col, 0.8); const gr = c.createRadialGradient(28, -1, 0.5, 29, 0, 5); gr.addColorStop(0, '#fff'); gr.addColorStop(1, col); c.fillStyle = gr; c.beginPath(); c.arc(29, 0, 4.2, 0, TAU); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1; c.stroke(); },
  };
  function drawPlayer(g, c, p, t) {
    if (p.dead && g.dying && g.dying.t > 30) return;
    const flick = p.inv > 0 && p.dashIframes <= 0 && Math.floor(p.inv / 4) % 2 === 0, cls = ED.items.CLASSES[p.classId] || ED.items.CLASSES.knight, col = p.flash > 0 ? '#ffffff' : (p.skinCol || cls.color);
    const k = track(p, t), bob = Math.sin(p.step) * 1.2, a = p.aim; c.save();
    shadow(c, p.x + 2, p.y + 9.5, 12, 1); if (flick) c.globalAlpha = 0.45;
    if (p.dashIframes > 0) { glow(c, p.x, p.y, 34, '#a0dcff', 0.55); c.strokeStyle = 'rgba(170,225,255,0.7)'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 16, 0, TAU); c.stroke(); if (skin.level() >= 1 && Math.floor(t) !== (k.lastDash || -1)) { k.lastDash = Math.floor(t); addPart(g, { x: p.x, y: p.y, vx: 0, vy: 0, life: 14, size: 10, color: '#a0dcff', kind: 'puff', rot: 0, vr: 0, g: 0 }); } }
    if (p.bashT > 0) { c.fillStyle = 'rgba(143,196,255,0.4)'; c.beginPath(); c.arc(p.x, p.y, 22, 0, TAU); c.fill(); c.strokeStyle = 'rgba(200,225,255,0.7)'; c.lineWidth = 2; c.stroke(); }
    const sq = 1 + (k.sp > 0.5 ? Math.sin(k.step * 2) * 0.04 : Math.sin(t * 0.08) * 0.02);
    if (p.flash > 0) { c.save(); c.translate(p.x, p.y + bob); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, p.r + 1, 0, TAU); c.fill(); c.restore(); }
    else { const sp = playerSprite(p, col); c.save(); c.translate(Math.round(p.x), Math.round(p.y + bob)); c.scale(1 / sq, sq); c.drawImage(sp.cv, 0, 0, sp.w, sp.h, -sp.w / 2, -sp.h / 2, sp.w, sp.h); c.restore(); }
    // eyes follow the aim
    c.fillStyle = '#f6f2ea'; const ex = Math.cos(a) * 4, ey = Math.sin(a) * 4, px = p.x + ex, py = p.y + bob + ey - 1;
    for (const sg of [-1, 1]) { const x = px - Math.sin(a) * 3 * sg * -1, y = py + Math.cos(a) * 3 * sg * -1; c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); c.fillStyle = '#120a1e'; c.beginPath(); c.arc(x + Math.cos(a) * 0.9, y + Math.sin(a) * 0.9, 1.3, 0, TAU); c.fill(); c.fillStyle = '#f6f2ea'; }
    // weapon
    const w = p.weapon, wd = ED.items.WEAPONS[w.type], kind = wd.kind, hold = p.hammerT > 0 ? p.hammerAng : a;
    c.save(); c.translate(p.x, p.y + bob); c.rotate(hold); c.strokeStyle = wd.color; c.fillStyle = wd.color; c.lineWidth = 3;
    if (kind === 'hammer' && p.hammerT > 0) c.rotate(-1.2 * (1 - p.hammerT / 15));
    const wa = WEAPON_ART[kind]; if (wa) wa(c, wd.color); else { const wi = ED.weaponImpl[kind]; if (wi && wi.held) wi.held(c, p, t); }
    c.restore(); c.restore();
    for (const o of p.orbPos) { c.save(); c.translate(o.x, o.y); c.rotate(o.a + Math.PI / 2); glow(c, 0, 0, 14, '#cfe4ff', 0.5); const gr = c.createLinearGradient(0, -9, 0, 3); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#8aa8d0'); c.fillStyle = gr; c.beginPath(); c.moveTo(0, -9); c.lineTo(4, 3); c.lineTo(0, 1); c.lineTo(-4, 3); c.closePath(); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.7)'; c.lineWidth = 1; c.stroke(); c.restore(); }
    for (const w2 of p.wisps) { glow(c, w2.x, w2.y, 14, '#9ff3ff', 0.75); c.fillStyle = '#e8ffff'; c.beginPath(); c.arc(w2.x, w2.y, 3, 0, TAU); c.fill(); }
    if (p.dashCd > 0) { const f = 1 - p.dashCd / Math.max(1, 40 * p.st.dashCd); c.fillStyle = 'rgba(8,5,18,0.5)'; c.fillRect(p.x - 11, p.y + 14, 22, 3); c.fillStyle = 'rgba(190,230,255,0.8)'; c.fillRect(p.x - 10, p.y + 14.5, 20 * f, 2); }
  }
  skin.drawPlayer = drawPlayer; skin.CLASS_ART = CLASS_ART; skin.WEAPON_ART = WEAPON_ART;

  skin.drawEnemy = function (g, c, e, t) { if (e.boss) return drawBoss(g, c, e, t); return drawFoe(g, c, e, t); };
  skin.drawFoe = drawFoe; skin.drawBoss = drawBoss; skin.foeSprite = foeSprite; skin.poseOf = poseOf;
  ED.skin.drawBossBody = drawBoss;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* EMBERDEEP — art_kit.js : v23 POLISH, the menu kit.  One calm look for every screen: dark glass with a hairline edge, one button style, a header with an ornament, chips, a back button
 * in the same corner everywhere, and text that is never smaller than it needs to be.  (The classic menus in menus.js are untouched: this only runs while ED.skin.on().)
 *
 *  Rules the screens follow (test/ui-lint.js checks them on every screen):  text is 13px at the very least, nothing leaves the 960x640 canvas, no two buttons overlap,
 *  no two pieces of text overlap, a label always fits its button.
 *  Hooks of the updates (titleUI / selectUI / endUI / pauseUI) draw by absolute position in the classic layout; K.capture() runs them with drawing switched off and hands back the buttons
 *  and the lines of text they wanted, so a screen can place them itself.  A new update's hook is picked up without touching this file. */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, skin = ED.skin;
  const { mixc, dark, lite, rgba } = skin.color;
  const FONT = '"Courier New", Menlo, Consolas, monospace';
  const UI = () => ED.ui;

  const K = skin.kit = {
    COL: { ink: '#eeeefc', text: '#d2d2ea', mute: '#a2a2c0', dim: '#74748e', ember: '#ffb04a', gold: '#ffd24a', cyan: '#7fd8ff', green: '#6ee07a', red: '#ff6a6a', violet: '#c8a0ff' },
    SZ: { title: 32, h: 22, body: 17, small: 15, tiny: 13 },
    W: C.W, H: C.H, M: 48,                                     // margins: content lives in x 48..912
  };

  /** rounded rectangle path (roundRect is not everywhere) */
  K.rr = function (c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
  };

  /** regular-weight text (the game's own UI.text is bold unless told otherwise) */
  K.text = function (c, s, x, y, size, color, align) { UI().text(c, s, x, y, size, color || K.COL.text, align || 'left', false); };
  K.bold = function (c, s, x, y, size, color, align) { UI().text(c, s, x, y, size, color || K.COL.ink, align || 'left', true); };
  /** text cut with an ellipsis so that it fits `maxW` (measured, not guessed) */
  K.fit = function (c, s, size, maxW, bold) {
    s = String(s); c.font = (bold === false ? '' : 'bold ') + size + 'px ' + FONT; if (c.measureText(s).width <= maxW) return s;
    let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (c.measureText(s.slice(0, m) + '…').width <= maxW) lo = m; else hi = m - 1; } return s.slice(0, lo) + '…';
  };
  /** wrapped paragraph, regular weight; returns the y after the last line */
  K.wrap = function (c, s, x, y, w, lh, size, color) { return UI().wrap(c, s, x, y, w, lh, size, color || K.COL.text); };
  K.lines = function (c, s, w, size) { c.font = size + 'px ' + FONT; const words = String(s).split(' '); let line = '', n = 1; for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (c.measureText(t).width > w && line) { line = wd; n++; } else line = t; } return n; };

  /** dark glass: rounded, a hairline edge, a lit top edge, a soft shadow.  o: {r, a, accent, bar, shadow} */
  K.glass = function (c, x, y, w, h, o) {
    o = o || {}; const r = o.r === undefined ? 10 : o.r, a = o.a === undefined ? 0.86 : o.a;
    c.save();
    if (o.shadow !== false && w * h > 4000) { c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20; c.shadowOffsetY = 6; }
    const gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(32,27,58,' + a + ')'); gr.addColorStop(1, 'rgba(14,12,28,' + a + ')');
    K.rr(c, x, y, w, h, r); c.fillStyle = gr; c.fill(); c.restore();
    K.rr(c, x + 0.5, y + 0.5, w - 1, h - 1, r); c.strokeStyle = o.accent ? rgba(o.accent, 0.5) : 'rgba(255,255,255,0.11)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(x + r, y + 1, w - 2 * r, 1);
    if (o.bar) { c.fillStyle = o.bar; K.rr(c, x + 1, y + 6, 3, h - 12, 1.5); c.fill(); }
  };

  /** the header: the title, a hairline with a diamond, an optional line below.  Returns the y where content may start. */
  K.head = function (c, title, o) {
    o = o || {}; const y = o.y || 58, size = o.size || K.SZ.title, col = o.color || K.COL.gold, u = UI(), cx = C.W / 2;
    u.shadow(c, title, cx, y, size, col, 'center');
    const ly = y + 14, lw = o.rule || 300, g = c.createLinearGradient(cx - lw / 2, 0, cx + lw / 2, 0); g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, 0.7)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.fillRect(cx - lw / 2, ly, lw, 1.5); c.fillStyle = col; c.beginPath(); c.moveTo(cx, ly - 3.5); c.lineTo(cx + 5, ly + 0.75); c.lineTo(cx, ly + 5); c.lineTo(cx - 5, ly + 0.75); c.closePath(); c.fill();
    if (o.sub) K.text(c, K.fit(c, o.sub, K.SZ.small, 800, false), cx, ly + 30, K.SZ.small, K.COL.mute, 'center');
    return ly + (o.sub ? 44 : 22);
  };

  /** the way back: the same place on every screen (top left) */
  K.back = function (c, id, label, o) { return UI().button(c, id || 'back', '‹  ' + (label || 'Back'), 24, 18, 128, 42, Object.assign({ size: 16, ghost: true }, o || {})); };

  /** a small pill; align 'left' | 'center' | 'right' about x; returns its width */
  K.chip = function (c, x, y, text, col, o) {
    o = o || {}; const size = o.size || K.SZ.tiny, h = o.h || 24; c.font = 'bold ' + size + 'px ' + FONT; const w = Math.ceil(c.measureText(text).width) + 18, x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    K.rr(c, x0, y, w, h, h / 2); c.fillStyle = rgba(col, o.solid ? 0.9 : 0.16); c.fill(); K.rr(c, x0 + 0.5, y + 0.5, w - 1, h - 1, h / 2); c.strokeStyle = rgba(col, 0.5); c.lineWidth = 1; c.stroke();
    UI().text(c, text, x0 + w / 2, y + h / 2 + size * 0.35, size, o.solid ? '#1a1020' : lite(col, 0.25), 'center', true); return w;
  };
  /** a small section label: CAPITALS in a muted colour with a rule that runs to the right edge */
  K.label = function (c, text, x, y, w, col) {
    col = col || K.COL.mute; UI().text(c, text, x, y, K.SZ.tiny, col, 'left', true); c.font = 'bold ' + K.SZ.tiny + 'px ' + FONT; const tw = c.measureText(text).width;
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x + tw + 10, y - 4, Math.max(0, w - tw - 10), 1);
  };
  /** a hairline across */
  K.rule = function (c, x, y, w, col) { const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, col || 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, w, 1); };
  /** one centred line made of coloured parts: segs = [[text, color, bold?], ...] with a dim separator between them; returns the width */
  K.segs = function (c, cx, y, segs, size, sep) {
    size = size || 14; sep = sep === undefined ? '   ·   ' : sep; const parts = [];
    segs.forEach((s, i) => { if (i && sep) parts.push([sep, K.COL.dim, false]); parts.push(s); });
    let total = 0; for (const p of parts) { c.font = (p[2] === false ? '' : 'bold ') + size + 'px ' + FONT; p.w = c.measureText(p[0]).width; total += p.w; }
    let x = cx - total / 2; for (const p of parts) { UI().text(c, p[0], x, y, size, p[1], 'left', p[2] !== false); x += p.w; } return total;
  };
  /** a hint line in the footer: keys in the muted colour */
  K.hint = function (c, text, o) { o = o || {}; K.text(c, K.fit(c, text, K.SZ.tiny, o.w || 880, false), o.x === undefined ? C.W / 2 : o.x, o.y || 626, K.SZ.tiny, K.COL.dim, o.align || 'center'); };

  // ==================================================================== running a hook without letting it draw
  /** run an update hook (titleUI / selectUI / endUI / pauseUI) with drawing off: {buttons, texts} are what it asked for, in the order it asked */
  K.capture = function (name, g, c, a, b) {
    const u = UI(), keep = u.cap, cap = u.cap = { buttons: [], texts: [] };
    try { ED.runHooks(name, g, c, a, b); } finally { u.cap = keep; }
    return cap;
  };
  /** "NAME  ·  detail" -> ['NAME', 'detail'] (the hooks write their labels that way) */
  K.splitLabel = function (s) { const i = String(s).indexOf('  ·  '); return i < 0 ? [String(s), ''] : [s.slice(0, i), s.slice(i + 5)]; };
  /** title-case a SHOUTING label: 'THE HEARTH' -> 'The Hearth' */
  K.nice = function (s) { return String(s).toLowerCase().replace(/(^|[ -])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bThe\b/g, 'The'); };
  K.FONT = FONT;
})(typeof globalThis !== 'undefined' ? globalThis : this);

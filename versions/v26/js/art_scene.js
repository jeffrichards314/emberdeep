/* EMBERDEEP — art_scene.js : v23 POLISH, the things standing in a room (props, doors, interactables, pickups), telegraphs, projectiles, swings, fx, ambience — and the world renderer that strings every layer together. */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, C = ED.C, T = ED.T, DIRS = ED.DIRS, R = ED.render, skin = ED.skin;
  const TAU = U.TAU, TILE = C.TILE, crand = U.crand;
  const { mixc, dark, lite, rgba } = skin.color, ink = skin.ink, bake = skin.bake, glow = skin.glow, shadow = skin.shadow, hash = skin.hash;
  const ICONS = R.ICONS;

  /** a finished picture of a small flat drawing (cached): returns the baked sheet; `fn(ctx, cx, cy)` draws around (cx, cy) */
  function sprite(key, w, h, fn, o) { return bake(key, w, h, (c) => { const s = ink((a) => fn(a, w / 2, h / 2), w, h, o || { outline: 1.8 }); c.drawImage(s.cv, 0, 0, w, h, 0, 0, w, h); }); }
  const put = (c, sp, x, y) => c.drawImage(sp.cv, 0, 0, sp.w, sp.h, Math.round(x - sp.w / 2), Math.round(y - sp.h / 2), sp.w, sp.h);
  skin.sprite = sprite; skin.put = put;

  // ==================================================================== props
  function propSprite(type) {
    if (type === 'crate') return sprite('prop|crate', 40, 40, (a, cx, cy) => { a.fillStyle = '#9a7040'; a.fillRect(cx - 12, cy - 12, 24, 24); a.fillStyle = '#7a5428'; a.fillRect(cx - 12, cy - 12, 24, 4); a.fillRect(cx - 12, cy + 8, 24, 4); a.fillRect(cx - 12, cy - 12, 4, 24); a.fillRect(cx + 8, cy - 12, 4, 24); a.strokeStyle = '#5a3a18'; a.lineWidth = 2.4; a.beginPath(); a.moveTo(cx - 9, cy - 9); a.lineTo(cx + 9, cy + 9); a.moveTo(cx + 9, cy - 9); a.lineTo(cx - 9, cy + 9); a.stroke(); a.fillStyle = '#2a1808'; for (const [dx, dy] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) { a.beginPath(); a.arc(cx + dx, cy + dy, 1.2, 0, TAU); a.fill(); } });
    if (type === 'brazier') return sprite('prop|brazier', 44, 44, (a, cx, cy) => { a.fillStyle = '#4a4a5c'; a.beginPath(); a.moveTo(cx - 13, cy - 5); a.lineTo(cx + 13, cy - 5); a.lineTo(cx + 8, cy + 11); a.lineTo(cx - 8, cy + 11); a.closePath(); a.fill(); a.fillStyle = '#34344a'; a.fillRect(cx - 12, cy + 9, 24, 4); a.fillStyle = '#6a6a80'; a.fillRect(cx - 13, cy - 7, 26, 4); });
    return sprite('prop|pot', 36, 40, (a, cx, cy) => { a.fillStyle = '#b8743c'; a.beginPath(); a.ellipse(cx, cy + 1, 10.5, 12, 0, 0, TAU); a.fill(); a.fillStyle = '#8a5428'; a.fillRect(cx - 6, cy - 14, 12, 5); a.fillStyle = '#d99a58'; a.beginPath(); a.ellipse(cx - 4, cy - 2, 2.6, 6, 0.3, 0, TAU); a.fill(); a.strokeStyle = '#6a3c18'; a.lineWidth = 1.4; a.beginPath(); a.ellipse(cx, cy + 3, 10, 3, 0, 0, Math.PI); a.stroke(); });
  }
  function drawProp(c, pr, t) {
    if (pr.dead) return;
    if (pr.type !== 'crate' && pr.type !== 'brazier' && pr.type !== 'pot' && pr.type !== undefined) { R.parts.drawProp(c, pr, t); return; }
    shadow(c, pr.x + 2, pr.y + 9, 13, 0.9);
    const hitK = pr.flash > 0 ? pr.flash / 6 : 0;
    put(c, propSprite(pr.type === 'crate' ? 'crate' : pr.type === 'brazier' ? 'brazier' : 'pot'), pr.x, pr.y - (pr.type === 'brazier' ? 0 : 2));
    if (hitK > 0) { c.fillStyle = 'rgba(255,255,255,' + hitK * 0.5 + ')'; c.fillRect(pr.x - 11, pr.y - 11, 22, 22); }
    if (pr.type === 'brazier') {
      if (pr.lit) { const fl = Math.sin(t * 0.4 + pr.x) * 2.4; glow(c, pr.x, pr.y - 12, 26 + fl, '#ffa24a', 0.55); c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(pr.x, pr.y - 26 - fl); c.quadraticCurveTo(pr.x + 9, pr.y - 12, pr.x + 3, pr.y - 6); c.lineTo(pr.x - 3, pr.y - 6); c.quadraticCurveTo(pr.x - 9, pr.y - 12, pr.x, pr.y - 26 - fl); c.fill(); c.fillStyle = '#ffd860'; c.beginPath(); c.moveTo(pr.x, pr.y - 20 - fl * 0.6); c.quadraticCurveTo(pr.x + 5, pr.y - 11, pr.x + 2, pr.y - 6); c.lineTo(pr.x - 2, pr.y - 6); c.quadraticCurveTo(pr.x - 5, pr.y - 11, pr.x, pr.y - 20 - fl * 0.6); c.fill(); }
      else { c.strokeStyle = 'rgba(255,214,120,' + (0.3 + 0.3 * Math.sin(t * 0.15)) + ')'; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.arc(pr.x, pr.y - 8, 15, t * 0.02, t * 0.02 + TAU); c.stroke(); c.setLineDash([]); }
    }
  }

  // ==================================================================== doors: a stone frame set into the wall, a state in the opening
  function drawDoors(g, c, t) {
    const room = g.room, th = g.theme, st = skin.styleOf(th), frame = lite(th.wallTop, 0.05), shade = dark(th.wall, 0.45);
    for (const d of DIRS) {
      const state = g.doorState(room, d); if (state === 'wall') continue;
      const [x, y, w, h] = R.parts.DOOR_RECT[d], e = room.doors[d], other = e ? g.floor.rooms[e.a === room.id ? e.b : e.a] : null, horiz = d === 'N' || d === 'S';
      // the opening
      c.fillStyle = '#05040a'; c.fillRect(x, y, w, h);
      if (state === 'open') {
        const gr = horiz ? c.createLinearGradient(0, y, 0, y + h) : c.createLinearGradient(x, 0, x + w, 0), a = (d === 'N' || d === 'W') ? 0 : 1; gr.addColorStop(a, 'rgba(150,150,200,0.2)'); gr.addColorStop(1 - a, 'rgba(0,0,0,0.65)'); c.fillStyle = gr; c.fillRect(x, y, w, h);
        c.fillStyle = rgba(th.glow, 0.05 + 0.03 * Math.sin(t * 0.05)); c.fillRect(x, y, w, h);
      } else if (state === 'closed') {
        const bars = 5; c.fillStyle = '#1c1624'; c.fillRect(x, y, w, h);
        for (let k = 0; k < bars; k++) { const bx = horiz ? x + (k + 0.5) * w / bars : x, by = horiz ? y : y + (k + 0.5) * h / bars; const gr = c.createLinearGradient(bx - 3, by, bx + 3, by); gr.addColorStop(0, '#c4c4d8'); gr.addColorStop(1, '#4a4a60'); c.fillStyle = gr; if (horiz) c.fillRect(bx - 3, y, 6, h); else c.fillRect(x, by - 3, w, 6); }
        c.strokeStyle = 'rgba(255,90,80,' + (0.5 + 0.2 * Math.sin(t * 0.12)) + ')'; c.lineWidth = 2; c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      } else if (state === 'locked') {
        const def = ED.keys.LOCKS[e.lock.type], cx = x + w / 2, cy = y + h / 2; c.fillStyle = dark(def.color, 0.7); c.fillRect(x, y, w, h);
        const gr = horiz ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, rgba(lite(def.color, 0.2), 0.35)); gr.addColorStop(1, 'rgba(0,0,0,0.3)'); c.fillStyle = gr; c.fillRect(x, y, w, h);
        c.strokeStyle = def.color; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); glow(c, cx, cy, 30, def.color, 0.4 + 0.12 * Math.sin(t * 0.1));
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.arc(cx, cy, 14, 0, TAU); c.fill(); c.strokeStyle = def.color; c.lineWidth = 1.6; c.stroke(); ICONS.lock(c, cx, cy - 1, 8, def.color);
        if (e.lock.type === 'boss') { c.strokeStyle = 'rgba(255,60,80,' + (0.4 + 0.3 * Math.sin(t * 0.1)) + ')'; c.lineWidth = 2; c.strokeRect(x - 1, y - 1, w + 2, h + 2); }
      } else if (state === 'bomb') {
        c.fillStyle = dark(th.wall, 0.15); c.fillRect(x, y, w, h);
        c.strokeStyle = 'rgba(255,150,70,' + (0.5 + 0.4 * Math.sin(t * 0.12)) + ')'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 4, y + 6); c.lineTo(x + w * 0.5, y + h * 0.4); c.lineTo(x + w * 0.4, y + h * 0.7); c.lineTo(x + w - 6, y + h - 6); c.stroke();
        glow(c, x + w / 2, y + h / 2, 28, '#ff8a3c', 0.3); ICONS.bomb(c, x + w / 2, y + h / 2, 8, '#ff8a3c');
      } else if (state === 'hidden') {
        c.fillStyle = th.wallTop; c.fillRect(x, y, w, h); const gr = c.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); c.fillStyle = gr; c.fillRect(x, y, w, h);
        c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + w * 0.2, y + 4); c.lineTo(x + w * 0.5, y + h * 0.45); c.lineTo(x + w * 0.35, y + h * 0.6); c.lineTo(x + w * 0.7, y + h - 4); c.stroke();
        const gl = (t % 190) / 190; if (gl < 0.18) { const k = Math.sin(gl / 0.18 * Math.PI); c.fillStyle = 'rgba(255,248,210,' + k * 0.7 + ')'; c.beginPath(); c.arc(x + w * 0.5, y + h * 0.45, 2 + k * 2, 0, TAU); c.fill(); }          // a glint every ~3s: findable, not shouting
        if (g.player.relics.thirdeye) { c.strokeStyle = 'rgba(199,139,255,' + (0.5 + 0.4 * Math.sin(t * 0.1)) + ')'; c.lineWidth = 2; c.strokeRect(x, y, w, h); }
        continue;
      }
      // the frame: lit on its top / left edge, shaded on the other
      c.strokeStyle = frame; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); c.fillStyle = 'rgba(255,255,255,0.18)'; if (horiz) c.fillRect(x, y, w, 2); else c.fillRect(x, y, 2, h); c.fillStyle = 'rgba(0,0,0,0.3)'; if (horiz) c.fillRect(x, y + h - 2, w, 2); else c.fillRect(x + w - 2, y, 2, h);
      if (other && (other.discovered || other.visited) && state !== 'closed') {
        const tp = g.knownType(other), info = ED.roomTypes[tp];
        if (info && info.icon) { const cx = x + w / 2 + (horiz ? 0 : (d === 'W' ? 24 : -24)), cy = y + h / 2 + (horiz ? (d === 'N' ? 24 : -24) : 0); c.fillStyle = 'rgba(6,4,14,0.7)'; c.beginPath(); c.arc(cx, cy, 11, 0, TAU); c.fill(); c.strokeStyle = rgba(info.color, 0.7); c.lineWidth = 1.2; c.stroke(); ICONS[info.icon] && ICONS[info.icon](c, cx, cy, 7, info.color); }
      }
    }
  }

  // ==================================================================== interactables
  function pedestalBase(c, x, y, dis) { const gr = c.createLinearGradient(x - 15, y, x + 15, y + 14); gr.addColorStop(0, dis ? '#4a4a56' : '#8a8aa0'); gr.addColorStop(1, dis ? '#2a2a34' : '#4a4a60'); c.fillStyle = gr; c.fillRect(x - 15, y + 4, 30, 12); c.fillStyle = dis ? '#3a3a46' : '#9a9ab4'; c.fillRect(x - 12, y - 2, 24, 7); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x - 12, y - 2, 24, 1.5); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.4; c.strokeRect(x - 15, y + 4, 30, 12); }
  function drawInter(g, c, it, t) {
    const near = g.nearInter === it, bob = Math.sin(t * 0.07 + it.id) * 2.2;
    switch (it.type) {
      case 'pedestal': {
        const col = ED.items.itemColor(it.item); shadow(c, it.x + 2, it.y + 14, 20, 0.9); pedestalBase(c, it.x, it.y, it.disabled);
        if (!it.disabled) {
          glow(c, it.x, it.y - 10, 30 + (near ? 6 : 0), col, 0.4 + (it.item.curse ? 0.15 : 0)); R.itemGlyph(c, it.item, it.x, it.y - 13 + bob, 10, t);
          if (it.item.curse) { c.strokeStyle = 'rgba(255,60,90,' + (0.5 + 0.3 * Math.sin(t * 0.2)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(it.x, it.y - 12, 17, 0, TAU); c.stroke(); }
          if (it.devil) { c.strokeStyle = 'rgba(255,50,70,0.75)'; c.lineWidth = 2; c.strokeRect(it.x - 17, it.y - 28, 34, 46); }
          if (it.price) { const txt = it.price.gold !== undefined ? it.price.gold + 'g' : '-' + (it.price.maxHp / 4) + ' ♥max', afford = g.canAfford(it.price); tag(c, it.x, it.y + 30, txt, it.price.gold !== undefined ? (afford ? '#ffd24a' : '#ff6a6a') : (afford ? '#ff4a5a' : '#a05060')); }
        } else { c.strokeStyle = '#a0a0b0'; c.lineWidth = 2; c.beginPath(); for (let k = -2; k <= 2; k++) { c.moveTo(it.x + k * 7, it.y - 28); c.lineTo(it.x + k * 7, it.y + 6); } c.stroke(); }
        break;
      }
      case 'chest': {
        const col = it.color || '#c89a5a', my = !!it.mystery; shadow(c, it.x + 2, it.y + 14, 24, 0.9); glow(c, it.x, it.y, 34, col, 0.2 + (near ? 0.16 : 0));
        put(c, sprite('inter|chest|' + (my ? 'm' : 'n'), 56, 48, (a, cx, cy) => { a.fillStyle = my ? '#6a2a7a' : '#8a5a2a'; a.fillRect(cx - 20, cy - 8, 40, 22); const gr = a.createLinearGradient(cx - 20, cy - 22, cx + 20, cy - 8); gr.addColorStop(0, my ? '#c070e0' : '#d09a50'); gr.addColorStop(1, my ? '#8a40a8' : '#a07230'); a.fillStyle = gr; a.beginPath(); a.moveTo(cx - 20, cy - 8); a.quadraticCurveTo(cx, cy - 28, cx + 20, cy - 8); a.closePath(); a.fill(); a.fillStyle = '#3a2410'; a.fillRect(cx - 20, cy - 10, 40, 3); a.fillStyle = '#ffd24a'; a.fillRect(cx - 4, cy - 8, 8, 11); a.fillStyle = '#7a5410'; a.fillRect(cx - 1.5, cy - 4, 3, 5); a.strokeStyle = '#3a2410'; a.lineWidth = 1.6; a.strokeRect(cx - 20, cy - 8, 40, 22); }), it.x, it.y - 4);
        if (my) { c.fillStyle = '#fff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('?', it.x, it.y - 14 + bob); }
        break;
      }
      case 'fountain': {
        const dis = it.disabledLook; shadow(c, it.x, it.y + 12, 36, 0.8); put(c, sprite('inter|fountain|' + (dis ? 'd' : 'n'), 84, 52, (a, cx, cy) => { a.fillStyle = dis ? '#4a5a62' : '#6a8aaa'; a.beginPath(); a.ellipse(cx, cy + 6, 35, 17, 0, 0, TAU); a.fill(); a.fillStyle = dis ? '#2a343a' : '#2a5a8a'; a.beginPath(); a.ellipse(cx, cy + 3, 28, 12, 0, 0, TAU); a.fill(); a.fillStyle = dis ? '#7a8a92' : '#9ab8d8'; a.fillRect(cx - 5, cy - 8, 10, 10); }), it.x, it.y + 2);
        if (!dis) { c.fillStyle = 'rgba(150,230,255,0.85)'; for (let k = 0; k < 5; k++) { const a2 = t * 0.1 + k * 1.3; c.beginPath(); c.arc(it.x + Math.cos(a2) * 9, it.y - 12 - Math.abs(Math.sin(a2 * 1.3)) * 16, 2.6, 0, TAU); c.fill(); } glow(c, it.x, it.y - 6, 40, '#5fd4ff', 0.4); c.strokeStyle = 'rgba(200,245,255,0.5)'; c.lineWidth = 1; c.beginPath(); c.ellipse(it.x, it.y + 4, 14 + (t % 40) * 0.35, 6 + (t % 40) * 0.15, 0, 0, TAU); c.stroke(); }
        break;
      }
      case 'camp': {
        c.fillStyle = '#4a3220'; c.fillRect(it.x - 18, it.y + 4, 36, 6); c.fillRect(it.x - 12, it.y - 2, 24, 5); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(it.x - 18, it.y + 4, 36, 1.5);
        if (it.uses > 0) { const fl = Math.sin(t * 0.3) * 3; glow(c, it.x, it.y - 8, 56 + fl, '#ff9a3c', 0.6); c.fillStyle = '#ff7a2a'; c.beginPath(); c.moveTo(it.x, it.y - 28 - fl); c.quadraticCurveTo(it.x + 15, it.y - 6, it.x, it.y + 2); c.quadraticCurveTo(it.x - 15, it.y - 6, it.x, it.y - 28 - fl); c.fill(); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(it.x, it.y - 18); c.quadraticCurveTo(it.x + 8, it.y - 4, it.x, it.y); c.quadraticCurveTo(it.x - 8, it.y - 4, it.x, it.y - 18); c.fill(); c.fillStyle = '#fff4c0'; c.beginPath(); c.arc(it.x, it.y - 4, 3, 0, TAU); c.fill(); }
        else { c.fillStyle = '#5a5a60'; c.beginPath(); c.arc(it.x, it.y - 2, 6, 0, TAU); c.fill(); }
        break;
      }
      case 'service': case 'anvil': {
        const col = it.color || '#ccc'; shadow(c, it.x + 2, it.y + 14, 22, 0.9); pedestalBase(c, it.x, it.y - 2, false); glow(c, it.x, it.y - 14, 22, col, 0.4);
        const nm = it.name || ''; if (it.type === 'anvil') ICONS.anvil(c, it.x, it.y - 14 + bob, 9, col); else if (nm.indexOf('Heal') === 0) { c.fillStyle = col; R.heart(c, it.x, it.y - 14 + bob, 6); c.fill(); } else if (nm.indexOf('Bomb') === 0) ICONS.bomb(c, it.x, it.y - 14 + bob, 8, col); else if (nm.indexOf('Sell') === 0) ICONS.coin(c, it.x, it.y - 14 + bob, 8, '#c8c8d8'); else if (nm.indexOf('Re-roll') === 0) ICONS.dice(c, it.x, it.y - 14 + bob, 7, col); else ICONS.key(c, it.x - 2, it.y - 14 + bob, 8, col);
        const price = typeof it.price === 'function' ? it.price() : 0; if (it.price && !it.sell) tag(c, it.x, it.y + 30, price === 0 ? 'FREE' : price + 'g', g.player.gold >= price ? '#ffd24a' : '#ff6a6a');
        break;
      }
      case 'shrine': case 'altar': {
        const col = it.color, used = it.used || it.disabledLook; shadow(c, it.x + 2, it.y + 16, 26, 0.9);
        put(c, sprite('inter|altar|' + (used ? 'u' : 'n'), 60, 50, (a, cx, cy) => { const gr = a.createLinearGradient(cx - 18, cy - 4, cx + 18, cy + 18); gr.addColorStop(0, used ? '#4a4a58' : '#7a7a98'); gr.addColorStop(1, used ? '#2a2a36' : '#44445e'); a.fillStyle = gr; a.fillRect(cx - 18, cy - 4, 36, 21); a.fillStyle = used ? '#3a3a46' : '#8a8aa8'; a.fillRect(cx - 14, cy - 14, 28, 12); a.fillStyle = 'rgba(0,0,0,0.3)'; a.fillRect(cx - 18, cy + 9, 36, 2); }), it.x, it.y + 3);
        if (!used) { glow(c, it.x, it.y - 24, 30, col, 0.7); c.save(); c.translate(it.x, it.y - 24 + bob); const gr = c.createLinearGradient(-8, -14, 8, 12); gr.addColorStop(0, lite(col, 0.4)); gr.addColorStop(1, dark(col, 0.2)); c.fillStyle = gr; c.beginPath(); c.moveTo(0, -14); c.lineTo(8, 0); c.lineTo(0, 12); c.lineTo(-8, 0); c.closePath(); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1.4; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(0, -12); c.lineTo(3, -2); c.lineTo(0, 1); c.lineTo(-3, -2); c.closePath(); c.fill(); c.restore(); }
        break;
      }
      case 'dice': { shadow(c, it.x + 2, it.y + 14, 24, 0.9); c.fillStyle = '#1e5a30'; c.fillRect(it.x - 22, it.y - 4, 44, 18); const gr = c.createLinearGradient(it.x - 22, it.y - 4, it.x + 22, it.y + 14); gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); c.fillStyle = gr; c.fillRect(it.x - 22, it.y - 4, 44, 18); c.strokeStyle = '#6a4a2a'; c.lineWidth = 3; c.strokeRect(it.x - 22, it.y - 4, 44, 18); ICONS.dice(c, it.x + Math.sin(t * 0.1) * 2, it.y - 14 + bob, 8, '#f4f4f4'); tag(c, it.x, it.y + 30, it.price() + 'g', g.player.gold >= it.price() ? '#ffd24a' : '#ff6a6a'); break; }
      case 'plate': { const gr = c.createLinearGradient(it.x - 16, it.y - 16, it.x + 16, it.y + 16); gr.addColorStop(0, it.pressed ? '#1c4a2a' : '#3a8a50'); gr.addColorStop(1, it.pressed ? '#143a20' : '#1e5a30'); c.fillStyle = gr; c.fillRect(it.x - 16, it.y - 16, 32, 32); c.strokeStyle = it.pressed ? '#3a9a5a' : '#5be37d'; c.lineWidth = 2; c.strokeRect(it.x - 14, it.y - 14, 28, 28); if (!it.pressed) { c.fillStyle = 'rgba(91,227,125,' + (0.15 + 0.15 * Math.sin(t * 0.1)) + ')'; c.fillRect(it.x - 14, it.y - 14, 28, 28); glow(c, it.x, it.y, 28, '#5be37d', 0.25); } else { c.fillStyle = '#5be37d'; c.beginPath(); c.arc(it.x, it.y, 5, 0, TAU); c.fill(); } break; }
      case 'stairs': {
        glow(c, it.x, it.y, 56, '#cfd8ff', 0.5 + 0.12 * Math.sin(t * 0.1)); const gr = c.createRadialGradient(it.x, it.y, 2, it.x, it.y, 28); gr.addColorStop(0, '#02020a'); gr.addColorStop(1, '#1a1a2c'); c.fillStyle = gr; c.beginPath(); c.arc(it.x, it.y, 27, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 2; c.stroke();
        for (let k = 0; k < 6; k++) { c.strokeStyle = 'rgba(207,216,255,' + (0.85 - k * 0.13) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(it.x, it.y, 23 - k * 3.6, k * 0.8 + t * 0.03, k * 0.8 + t * 0.03 + 3.4); c.stroke(); } break;
      }
      case 'healfont': { glow(c, it.x, it.y, 34, it.color, 0.55); c.fillStyle = it.color; R.heart(c, it.x, it.y + bob, 11); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); break; }
      case 'cashout': { glow(c, it.x, it.y, 30, '#ffd24a', 0.5); ICONS.coin(c, it.x, it.y + bob, 12, '#ffd24a'); break; }
      case 'keyaltar': { shadow(c, it.x, it.y + 14, 18, 0.9); pedestalBase(c, it.x, it.y - 2, false); glow(c, it.x, it.y - 8, 28, it.color, 0.6); ICONS.key(c, it.x - 2, it.y - 10 + bob, 10, it.color); break; }
      default: { const f = skin.interArt[it.type]; if (f) f(c, it, t, g, near); else R.parts.drawInter(g, c, it, t); break; }
    }
  }
  /** polished art for the interactables other updates add (type -> (c, it, t, g, near)); a type not listed here keeps its own classic drawing */
  skin.interArt = {
    portal(c, it, t, g, near) {
      const ex = it.exit, st = it.st; if (!st || !st.visible) return; const w = ED.route && ED.route.BASE && (ex.world || ED.route.BASE), known = ED.route && ED.route.meta().discovered[w.id], open = st.open, col = known ? w.color : '#aab0d0', x = it.x, y = it.y, pulse = 0.5 + 0.5 * Math.sin(t * 0.08 + it.id);
      shadow(c, x, y + 26, 30, 0.9); glow(c, x, y, open ? 60 : 36, col, open ? 0.5 + 0.2 * pulse : 0.14);
      put(c, sprite('inter|arch|' + col, 84, 84, (a, cx, cy) => { a.fillStyle = '#6a6a84'; a.fillRect(cx - 32, cy - 6, 10, 38); a.fillRect(cx + 22, cy - 6, 10, 38); a.beginPath(); a.arc(cx, cy - 4, 32, Math.PI, 0); a.lineTo(cx + 22, cy - 4); a.arc(cx, cy - 4, 22, 0, Math.PI, true); a.closePath(); a.fill(); a.fillStyle = col; a.fillRect(cx - 3, cy - 38, 6, 6); }), x, y - 2);
      const gr = c.createRadialGradient(x, y + 2, 2, x, y + 2, 26); gr.addColorStop(0, open ? rgba(lite(col, 0.45), 0.9) : '#0b0912'); gr.addColorStop(1, open ? rgba(dark(col, 0.45), 0.9) : '#15121e'); c.fillStyle = gr; c.beginPath(); c.arc(x, y + 2, 22, Math.PI, 0); c.lineTo(x + 22, y + 30); c.lineTo(x - 22, y + 30); c.closePath(); c.fill();
      if (open) for (let k = 0; k < 4; k++) { c.strokeStyle = rgba(lite(col, 0.4), 0.7 - k * 0.14); c.lineWidth = 2.4; c.beginPath(); c.arc(x, y + 8, 18 - k * 4, k * 0.8 + t * 0.04, k * 0.8 + t * 0.04 + 3.6); c.stroke(); }
      else { ED.route.glyphGate && ED.route.glyphGate(c, ex.gate, x, y + 8, 11, col); const gl = (t % 200) / 200; if (gl < 0.15) { c.fillStyle = 'rgba(255,248,210,' + Math.sin(gl / 0.15 * Math.PI) * 0.8 + ')'; c.beginPath(); c.arc(x + 14, y - 22, 2.4, 0, TAU); c.fill(); } }
      const UI = ED.ui; UI.text(c, known ? w.name : '???', x, y - 46, 11, open ? col : '#9a9ab8', 'center');
      if (known && w.risk > 0 && ex.id !== 'default') for (let k = 0; k < Math.min(4, w.risk); k++) ED.icons.draw(c, 'skull', x + (k - (Math.min(4, w.risk) - 1) / 2) * 11, y - 60, 4, '#ff6a6a');
      UI.text(c, ex.id === 'default' ? 'FLOOR ' + (g.floorNum + 1) : open ? 'OPEN' : 'SEALED', x, y + 48, 9, '#a4a4c0', 'center', false);
    },
    sigilaltar(c, it, t) { shadow(c, it.x + 2, it.y + 16, 26, 0.9); pedestalBase(c, it.x, it.y, it.used); if (!it.used) { glow(c, it.x, it.y - 26, 34, it.color, 0.6 + 0.15 * Math.sin(t * 0.1)); if (ED.route && ED.route.glyphSigil) ED.route.glyphSigil(c, 'crown', it.x, it.y - 28 + Math.sin(t * 0.07) * 2, 11, it.color); } },
    wanderer(c, it, t) { const x = it.x, y = it.y + Math.sin(t * 0.05) * 1.5; shadow(c, x + 2, it.y + 16, 15, 0.9); put(c, sprite('inter|wanderer|' + (it.used ? 'u' : 'n'), 48, 56, (a, cx, cy) => { a.fillStyle = it.used ? '#4a4660' : '#6a5a98'; a.beginPath(); a.moveTo(cx - 14, cy + 16); a.lineTo(cx - 6, cy - 10); a.lineTo(cx + 6, cy - 10); a.lineTo(cx + 14, cy + 16); a.closePath(); a.fill(); a.fillStyle = '#2a2040'; a.beginPath(); a.arc(cx, cy - 12, 8.5, 0, TAU); a.fill(); a.strokeStyle = '#8a6a3a'; a.lineWidth = 2.2; a.beginPath(); a.moveTo(cx + 14, cy + 16); a.lineTo(cx + 12, cy - 14); a.stroke(); }), x, y); c.fillStyle = it.used ? '#7a7a98' : '#ffe9a0'; c.fillRect(x - 4, y - 14, 3, 2.4); c.fillRect(x + 1, y - 14, 3, 2.4); if (!it.used) glow(c, x + 12, y - 14, 10, '#ffd24a', 0.3); },
    trapdoor(c, it, t, g) { const x = it.x, y = it.y, ROSE = '#e0607a'; glow(c, x, y, 50, ROSE, 0.3 + 0.1 * Math.sin(t * 0.08)); const gr = c.createRadialGradient(x, y, 2, x, y, 26); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#14101c'); c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, 26, 20, 0, 0, TAU); c.fill(); c.strokeStyle = ROSE; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(224,96,122,0.5)'; c.lineWidth = 2; for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(x, y + k * 3, 22 - k * 5, 16 - k * 4, 0, 0, TAU); c.stroke(); } for (let k = 0; k < 4; k++) ED.icons.draw(c, 'skull', x + (k - 1.5) * 11, y - 34, 4, '#ff6a6a'); ED.ui.text(c, 'DOWN', x, y + 36, 9, '#9a9ab8', 'center', false); },
  };
  function tag(c, x, y, txt, col) { c.font = 'bold 12px monospace'; c.textAlign = 'center'; const w = Math.max(44, c.measureText(txt).width + 12); c.fillStyle = 'rgba(8,5,18,0.8)'; c.fillRect(x - w / 2, y - 12, w, 16); c.strokeStyle = rgba(col, 0.5); c.lineWidth = 1; c.strokeRect(x - w / 2 + 0.5, y - 11.5, w - 1, 15); c.fillStyle = col; c.fillText(txt, x, y); }
  skin.tag = tag;

  // ==================================================================== pickups
  function drawPickup(c, k, t) {
    const bob = Math.sin(k.bob) * 2;
    if (k.type === 'gold') {
      const col = k.val >= 20 ? '#ff9ad0' : k.val >= 5 ? '#c8d8ff' : '#ffd24a', w = Math.abs(Math.cos(t * 0.1 + k.bob)) * 5 + 2, y = k.y + bob;
      shadow(c, k.x, k.y + 8, 6, 0.8); const gr = c.createLinearGradient(k.x - w, y - 6, k.x + w, y + 6); gr.addColorStop(0, lite(col, 0.55)); gr.addColorStop(1, dark(col, 0.25)); c.fillStyle = gr; c.beginPath(); c.ellipse(k.x, y, w, 6, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(40,24,0,0.7)'; c.lineWidth = 1.2; c.stroke();
      if (Math.floor((t * 0.1 + k.bob) / 3.14) % 2 === 0) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(k.x - 1, y - 4, 2, 2); } glow(c, k.x, y, 14, col, 0.28);
    } else if (k.type === 'heart') { glow(c, k.x, k.y, 20, '#ff4a6a', 0.55); heartGloss(c, k.x, k.y + bob, 6.4); }
    else if (k.type === 'bomb') { shadow(c, k.x, k.y + 8, 8, 0.8); ICONS.bomb(c, k.x, k.y + bob, 7, '#ff9a3c'); glow(c, k.x + 6, k.y - 6 + bob, 8, '#ff8a3c', 0.3); }
    else if (k.type === 'key') { const kt = ED.keys.KEYTYPES[k.keyType]; glow(c, k.x, k.y, 26, kt.color, 0.55 + 0.15 * Math.sin(t * 0.2)); (k.keyType === 'boss' ? ICONS.bosskey : ICONS.key)(c, k.x - 3, k.y + bob, 9, kt.color); }
    else if (k.type === 'container') { glow(c, k.x, k.y, 30, '#ff2a5a', 0.55); heartGloss(c, k.x, k.y + bob, 10, '#ff2a5a'); }
    else R.parts.drawPickup(c, k, t);
  }
  function heartGloss(c, x, y, s, col) { col = col || '#ff4a6a'; const gr = c.createLinearGradient(x - s, y - s, x + s, y + s); gr.addColorStop(0, lite(col, 0.45)); gr.addColorStop(1, dark(col, 0.2)); R.heart(c, x, y, s); c.fillStyle = gr; c.fill(); c.strokeStyle = 'rgba(40,6,16,0.85)'; c.lineWidth = 1.3; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.65)'; c.beginPath(); c.ellipse(x - s * 0.5, y - s * 0.5, s * 0.28, s * 0.16, -0.6, 0, TAU); c.fill(); }
  skin.heartGloss = heartGloss;

  // ==================================================================== telegraph zones: one language — damage colour at low alpha, hatching, a bright closing rim
  const hatchPat = {};
  function hatch(c, col, a) { const k = col + a; let p = hatchPat[k]; if (!p) { const sp = bake('hatch|' + col + '|' + a, 12, 12, (cx) => { cx.strokeStyle = rgba(col, a); cx.lineWidth = 2; cx.beginPath(); cx.moveTo(-2, 14); cx.lineTo(14, -2); cx.moveTo(-2, 8); cx.lineTo(8, -2); cx.moveTo(4, 14); cx.lineTo(14, 4); cx.stroke(); }); p = hatchPat[k] = c.createPattern ? c.createPattern(sp.cv, 'repeat') : null; } return p; }
  function drawZone(c, z, t) {
    const prog = z.kind === 'tele' ? U.clamp(z.t / Math.max(1, z.dur), 0, 1) : 1, col = z.color || '#ff4a4a', harmless = z.hurts === false && !z.hurtsEnemies;
    const fa = z.kind === 'tele' ? (harmless ? 0.1 + 0.14 * prog : 0.14 + 0.28 * prog) : 0.26, pulse = 0.7 + 0.3 * Math.sin(t * 0.4), hp = harmless || z.kind === 'hazard' ? null : hatch(c, col, 0.22 + 0.14 * prog), rim = rgba(lite(col, 0.3), harmless ? 0.55 : 0.95 * pulse);
    c.save(); c.fillStyle = rgba(col, fa); c.strokeStyle = rim; c.lineWidth = 2;
    const fillHatch = () => { if (hp) { c.fillStyle = hp; c.fill(); } };
    switch (z.shape) {
      case 'circle':
        c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); fillHatch(); c.stroke();
        if (z.kind === 'tele') { c.strokeStyle = rgba(lite(col, 0.5), 0.9); c.lineWidth = 3; c.beginPath(); c.arc(z.x, z.y, z.r * prog, 0, TAU); c.stroke(); c.fillStyle = rgba(col, 0.2); c.beginPath(); c.arc(z.x, z.y, z.r * prog, 0, TAU); c.fill(); }
        else if (z.kind === 'hazard') { c.fillStyle = rgba(col, 0.12 + 0.1 * Math.sin(t * 0.15)); c.beginPath(); c.arc(z.x, z.y, z.r * 0.8, 0, TAU); c.fill(); }
        break;
      case 'ring': {
        const w = z.w || 20, r = Math.max(1, z.r);
        if (z.gaps && z.gaps.length && z.kind === 'ring') {
          const g0 = z.gaps.map(g => ({ a: ((g.a % TAU) + TAU) % TAU, w: g.w })).sort((a, b) => a.a - b.a), arcs = [];
          for (let i = 0; i < g0.length; i++) { const s = g0[i].a + g0[i].w / 2, e2 = (g0[(i + 1) % g0.length].a - g0[(i + 1) % g0.length].w / 2) + (i === g0.length - 1 ? TAU : 0); if (e2 > s) arcs.push([s, e2]); }
          c.lineWidth = w; c.strokeStyle = rgba(col, 0.62); for (const [s, e2] of arcs) { c.beginPath(); c.arc(z.x, z.y, r, s, e2); c.stroke(); }
          c.lineWidth = 2.2; c.strokeStyle = rgba(lite(col, 0.55), 0.9); for (const [s, e2] of arcs) { c.beginPath(); c.arc(z.x, z.y, r + w / 2, s, e2); c.stroke(); c.beginPath(); c.arc(z.x, z.y, r - w / 2, s, e2); c.stroke(); }
        } else { c.lineWidth = w; c.strokeStyle = rgba(col, z.kind === 'ring' ? 0.62 : 0.3 + 0.3 * prog); c.beginPath(); c.arc(z.x, z.y, r, 0, TAU); c.stroke(); if (z.kind === 'ring') { c.lineWidth = 2; c.strokeStyle = rgba(lite(col, 0.55), 0.85); c.beginPath(); c.arc(z.x, z.y, r + w / 2, 0, TAU); c.stroke(); } }
        break;
      }
      case 'line': {
        const dx = z.x2 - z.x, dy = z.y2 - z.y, len = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx); c.translate(z.x, z.y); c.rotate(a);
        if (z.beam && z.kind === 'hazard') { const gr = c.createLinearGradient(0, -z.w / 2, 0, z.w / 2); gr.addColorStop(0, rgba(col, 0.2)); gr.addColorStop(0.5, rgba(lite(col, 0.5), 0.9)); gr.addColorStop(1, rgba(col, 0.2)); c.fillStyle = gr; c.fillRect(0, -z.w / 2, len, z.w); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(0, -z.w / 5, len, z.w / 2.5); }
        else { c.fillRect(0, -z.w / 2, len, z.w); if (hp) { c.fillStyle = hp; c.fillRect(0, -z.w / 2, len, z.w); } c.strokeRect(0, -z.w / 2, len, z.w); if (z.kind === 'tele') { c.fillStyle = rgba(col, 0.3); c.fillRect(0, -z.w / 2, len * prog, z.w); c.fillStyle = rgba(lite(col, 0.6), 0.9); c.fillRect(len * prog - 2, -z.w / 2, 3, z.w); } }
        break;
      }
      case 'cone': {
        c.beginPath(); c.moveTo(z.x, z.y); c.arc(z.x, z.y, z.r, z.ang - z.arc / 2, z.ang + z.arc / 2); c.closePath(); c.fill(); fillHatch(); c.stroke();
        if (z.kind === 'tele') { c.fillStyle = rgba(col, 0.3); c.beginPath(); c.moveTo(z.x, z.y); c.arc(z.x, z.y, z.r * prog, z.ang - z.arc / 2, z.ang + z.arc / 2); c.closePath(); c.fill(); c.strokeStyle = rgba(lite(col, 0.55), 0.9); c.lineWidth = 3; c.beginPath(); c.arc(z.x, z.y, z.r * prog, z.ang - z.arc / 2, z.ang + z.arc / 2); c.stroke(); }
        break;
      }
      case 'rect': c.fillRect(z.x, z.y, z.w, z.h); if (hp) { c.fillStyle = hp; c.fillRect(z.x, z.y, z.w, z.h); } c.strokeRect(z.x, z.y, z.w, z.h); if (z.kind === 'tele') { c.fillStyle = rgba(col, 0.28); c.fillRect(z.x, z.y, z.w, z.h * prog); c.fillStyle = rgba(lite(col, 0.55), 0.9); c.fillRect(z.x, z.y + z.h * prog - 2, z.w, 3); } break;
      case 'screen':
        c.fillStyle = rgba('#ff2a3a', 0.1 + 0.26 * prog * pulse); c.fillRect(0, 0, C.ROOM_W, C.ROOM_H);
        for (const s of z.safe || []) { glow(c, s.x, s.y, s.r * 1.6, '#50ffa0', 0.3); c.fillStyle = 'rgba(80,255,160,0.26)'; c.strokeStyle = 'rgba(170,255,210,0.95)'; c.lineWidth = 3; c.setLineDash([8, 5]); c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); c.stroke(); c.setLineDash([]); }
        break;
      case 'tiles': { c.fillStyle = rgba(col, 0.14 + 0.32 * prog * pulse); for (const i of z.tiles) c.fillRect((i % C.COLS) * TILE, Math.floor(i / C.COLS) * TILE, TILE, TILE); if (hp) { c.fillStyle = hp; for (const i of z.tiles) c.fillRect((i % C.COLS) * TILE, Math.floor(i / C.COLS) * TILE, TILE, TILE); } c.strokeStyle = rgba(lite(col, 0.4), 0.5); c.lineWidth = 1; for (const i of z.tiles) c.strokeRect((i % C.COLS) * TILE + 0.5, Math.floor(i / C.COLS) * TILE + 0.5, TILE - 1, TILE - 1); break; }
    }
    c.restore();
  }

  // ==================================================================== projectiles
  const trails = new WeakMap();
  function trailOf(b, x, y, n) { let L = trails.get(b); if (!L) { L = []; trails.set(b, L); } L.push(x, y); if (L.length > n * 2) L.splice(0, 2); return L; }
  function drawEProj(c, b, t) {
    const col = b.color || '#ff6a4a', lv = skin.level();
    if (b.friendly) { glow(c, b.x, b.y, b.r * 3, '#8fc4ff', 0.6); c.fillStyle = '#e8f4ff'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); return; }
    if (lv >= 2) { const L = trailOf(b, b.x, b.y, 7); if (L.length >= 4) { for (let i = 2; i < L.length; i += 2) { const k = i / L.length; c.strokeStyle = rgba(col, 0.38 * k); c.lineWidth = b.r * (0.4 + k); c.lineCap = 'round'; c.beginPath(); c.moveTo(L[i - 2], L[i - 1]); c.lineTo(L[i], L[i + 1]); c.stroke(); } c.lineCap = 'butt'; } }
    glow(c, b.x, b.y, b.r * 3.1, col, 0.62);
    if (b.kind === 'bolt') { const a = Math.atan2(b.vy, b.vx); c.save(); c.translate(b.x, b.y); c.rotate(a); const gr = c.createLinearGradient(0, -b.r, 0, b.r); gr.addColorStop(0, lite(col, 0.4)); gr.addColorStop(1, dark(col, 0.2)); c.fillStyle = gr; c.beginPath(); c.moveTo(-b.r * 1.7, -b.r * 0.55); c.lineTo(b.r * 1.2, -b.r * 0.55); c.lineTo(b.r * 1.9, 0); c.lineTo(b.r * 1.2, b.r * 0.55); c.lineTo(-b.r * 1.7, b.r * 0.55); c.closePath(); c.fill(); c.strokeStyle = 'rgba(10,4,20,0.7)'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#fff'; c.fillRect(-b.r * 0.6, -b.r * 0.22, b.r * 1.6, b.r * 0.44); c.restore(); }
    else { const rr = b.r * (b.kind === 'orb' ? 1 + 0.1 * Math.sin(t * 0.3) : 1), gr = c.createRadialGradient(b.x - rr * 0.3, b.y - rr * 0.3, 0.5, b.x, b.y, rr); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, lite(col, 0.3)); gr.addColorStop(1, dark(col, 0.25)); c.fillStyle = gr; c.beginPath(); c.arc(b.x, b.y, rr, 0, TAU); c.fill(); c.strokeStyle = 'rgba(10,4,20,0.55)'; c.lineWidth = 1; c.stroke(); }
  }
  function drawPProj(c, b, t) {
    const lv = skin.level();
    if (b.draw) { c.save(); b.draw(c, b, t); c.restore(); return; }
    if (lv >= 2 && b.kind !== 'boom') { const L = trailOf(b, b.x, b.y, 6); if (L.length >= 4) { for (let i = 2; i < L.length; i += 2) { const k = i / L.length; c.strokeStyle = rgba(b.color || '#bfe8ff', 0.4 * k); c.lineWidth = 1 + 2.5 * k; c.beginPath(); c.moveTo(L[i - 2], L[i - 1]); c.lineTo(L[i], L[i + 1]); c.stroke(); } } }
    c.save();
    if (b.kind === 'arrow') { const a = Math.atan2(b.vy, b.vx); c.translate(b.x, b.y); c.rotate(a); c.strokeStyle = '#c8b090'; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, 0); c.lineTo(6, 0); c.stroke(); c.fillStyle = b.color || '#fff'; c.beginPath(); c.moveTo(11, 0); c.lineTo(5, -3.4); c.lineTo(5, 3.4); c.closePath(); c.fill(); c.strokeStyle = 'rgba(10,4,20,0.7)'; c.lineWidth = 1; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(-9, -2); c.lineTo(-14, -4.5); c.moveTo(-9, 2); c.lineTo(-14, 4.5); c.stroke(); }
    else if (b.kind === 'boom') { c.translate(b.x, b.y); c.rotate(b.spin || 0); glow(c, 0, 0, 20, b.color, 0.5); c.strokeStyle = 'rgba(10,4,20,0.8)'; c.lineWidth = 6.5; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-9, -6); c.lineTo(0, 7); c.lineTo(9, -6); c.stroke(); c.strokeStyle = b.color; c.lineWidth = 4; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.2; c.stroke(); c.lineJoin = 'miter'; }
    else if (b.kind === 'orb') { glow(c, b.x, b.y, b.r * 3.2, b.color, 0.7); const rr = b.r * (0.9 + 0.1 * Math.sin(t * 0.4)), gr = c.createRadialGradient(b.x - 2, b.y - 2, 0.5, b.x, b.y, rr); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, lite(b.color, 0.3)); gr.addColorStop(1, dark(b.color, 0.2)); c.fillStyle = gr; c.beginPath(); c.arc(b.x, b.y, rr, 0, TAU); c.fill(); }
    else { glow(c, b.x, b.y, b.r * 3.2, b.color, 0.75); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, b.r * 0.7, 0, TAU); c.fill(); c.strokeStyle = rgba(b.color, 0.8); c.lineWidth = 1.2; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.stroke(); }
    c.restore();
  }

  // ==================================================================== swings (weapon arcs)
  function drawSwing(c, s, t) {
    const k = U.clamp(s.t / s.dur, 0, 1), col = s.crit ? '#ffd24a' : (s.color || '#ffffff'); c.save();
    if (s.kind === 'arc') {
      const sweep = s.sweep || 1, a0 = s.ang - s.arc / 2 * sweep, a1 = s.ang + s.arc / 2 * sweep, cur = U.lerp(a0, a1, U.easeOut(Math.min(1, k * 1.8))), rr = s.range * 0.82;
      c.lineCap = 'round'; for (let i = 0; i < 3; i++) { c.strokeStyle = rgba(i === 0 ? col : lite(col, 0.4), (0.25 + 0.2 * i) * (1 - k)); c.lineWidth = (16 - i * 5) * (1 - k * 0.55); c.beginPath(); if (sweep > 0) c.arc(s.x, s.y, rr, a0, cur); else c.arc(s.x, s.y, rr, cur, a0); c.stroke(); }
      c.strokeStyle = rgba('#ffffff', 0.95 * (1 - k)); c.lineWidth = 3; c.beginPath(); if (sweep > 0) c.arc(s.x, s.y, rr + 2, Math.max(a0, cur - 0.55), cur); else c.arc(s.x, s.y, rr + 2, cur, Math.min(a0, cur + 0.55)); c.stroke(); c.lineCap = 'butt';
      if (s.spin) { c.strokeStyle = rgba(col, 0.4 * (1 - k)); c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, s.range * 0.6, 0, TAU); c.stroke(); }
    } else if (s.kind === 'line') {
      const len = s.len * U.easeOut(Math.min(1, k * 2.2)); c.translate(s.x, s.y); c.rotate(s.ang); const gr = c.createLinearGradient(10, 0, len, 0); gr.addColorStop(0, rgba(col, 0.1)); gr.addColorStop(1, rgba(lite(col, 0.4), 0.85 * (1 - k * 0.7))); c.fillStyle = gr; c.beginPath(); c.moveTo(10, -3.5); c.lineTo(len, 0); c.lineTo(10, 3.5); c.closePath(); c.fill(); c.fillStyle = rgba('#fff', 0.85 * (1 - k)); c.fillRect(len * 0.6, -1.5, len * 0.4, 3);
    } else { const rr = s.r * U.easeOut(k); const gr = c.createRadialGradient(s.x, s.y, rr * 0.2, s.x, s.y, rr); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, 0.3 * (1 - k))); c.fillStyle = gr; c.beginPath(); c.arc(s.x, s.y, rr, 0, TAU); c.fill(); c.strokeStyle = rgba(lite(col, 0.4), 0.9 * (1 - k)); c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.arc(s.x, s.y, rr, 0, TAU); c.stroke(); }
    c.restore();
  }

  // ==================================================================== fx (the simulation's particles) and floating text
  function drawFx(c, f) {
    const k = f.life / f.max;
    if (f.shape === 'ring') { const r = U.lerp(f.r1, f.size, k); c.strokeStyle = rgba(lite(f.color, 0.2), 0.85 * k); c.lineWidth = f.w * k + 1; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.stroke(); if (f.w > 3) { c.strokeStyle = rgba(f.color, 0.25 * k); c.lineWidth = f.w * k + 5; c.stroke(); } }
    else if (f.shape === 'ghost') { c.fillStyle = rgba(f.color, f.alpha * k); c.beginPath(); c.arc(f.x, f.y, f.size * k, 0, TAU); c.fill(); }
    else if (f.shape === 'bolt') { glow(c, (f.x + f.x2) / 2, (f.y + f.y2) / 2, Math.hypot(f.x2 - f.x, f.y2 - f.y) * 0.55, f.color, 0.35 * k); c.strokeStyle = rgba(f.color, k); c.lineWidth = 3.4; c.lineJoin = 'round'; c.beginPath(); c.moveTo(f.x, f.y); const n = 5; for (let i = 1; i < n; i++) { const t2 = i / n; c.lineTo(f.x + (f.x2 - f.x) * t2 + crand() * 16 - 8, f.y + (f.y2 - f.y) * t2 + crand() * 16 - 8); } c.lineTo(f.x2, f.y2); c.stroke(); c.strokeStyle = rgba('#ffffff', k); c.lineWidth = 1.2; c.stroke(); c.lineJoin = 'miter'; }
    else { const s = f.size * (0.4 + k * 0.6); c.fillStyle = rgba(lite(f.color, 0.3), Math.min(1, k * 1.4)); c.beginPath(); c.arc(f.x, f.y, Math.max(0.8, s * 0.55), 0, TAU); c.fill(); if (s > 3.5) glow(c, f.x, f.y, s * 2.4, f.color, 0.3 * k); }
  }
  function drawText(c, tx) { c.globalAlpha = Math.min(1, tx.life / 18); c.font = 'bold ' + tx.size + 'px monospace'; c.textAlign = 'center'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(8,4,16,0.9)'; c.lineWidth = 3.5; c.strokeText(tx.str, tx.x, tx.y); c.lineJoin = 'miter'; c.fillStyle = tx.color; c.fillText(tx.str, tx.x, tx.y); c.globalAlpha = 1; }

  // ==================================================================== ambience: a few particles per land, a pure function of time (no state, no RNG)
  const AMB = {
    dust: { n: 26, col: '#e8e0d0', a: 0.35, sz: 1.4, vx: 0.12, vy: 0.04, sway: 8 },
    spores: { n: 30, col: '#c8f08a', a: 0.45, sz: 1.8, vx: 0.05, vy: -0.14, sway: 14 },
    snow: { n: 46, col: '#ffffff', a: 0.7, sz: 1.8, vx: 0.2, vy: 0.55, sway: 10 },
    embers: { n: 30, col: '#ff9a3a', a: 0.8, sz: 1.7, vx: 0.1, vy: -0.5, sway: 8, flick: 1 },
    bubbles: { n: 20, col: '#aef0ff', a: 0.5, sz: 2.6, vx: 0, vy: -0.32, sway: 6, ring: 1 },
    stars: { n: 36, col: '#f0e0ff', a: 0.8, sz: 1.4, vx: 0.02, vy: 0, sway: 2, flick: 1 },
    rain: { n: 70, col: '#a8c8f0', a: 0.4, sz: 1, vx: -0.6, vy: 7, streak: 9 },
    motes: { n: 22, col: '#ffe090', a: 0.5, sz: 1.5, vx: 0.08, vy: -0.06, sway: 10, flick: 1 },
    glints: { n: 20, col: '#ffe48a', a: 0.9, sz: 2, vx: 0, vy: 0, sway: 0, flick: 2 },
    fireflies: { n: 18, col: '#d8ff7a', a: 0.9, sz: 2, vx: 0.05, vy: 0, sway: 26, flick: 1, glow: 1 },
    clouds: { n: 8, col: '#ffffff', a: 0.12, sz: 36, vx: 0.35, vy: 0, sway: 4, blob: 1 },
    sandblow: { n: 42, col: '#e8c888', a: 0.45, sz: 1.2, vx: 3.4, vy: 0.12, sway: 3, hstreak: 9 },
  };
  skin.AMBIENCE = AMB;
  function ambience(c, g, t, st) {
    if (skin.level() < 2 || g.rt && g.rt.dark && !g.room.cleared) return; const a = AMB[st.ambience]; if (!a) return;
    c.save(); const seed = skin.seedOf(g.room);
    for (let i = 0; i < a.n; i++) {
      const h1 = hash(i, seed, 1), h2 = hash(i, seed, 2), h3 = hash(i, seed, 3); let x = (h1 * C.ROOM_W + t * a.vx * (0.6 + h3) + Math.sin(t * 0.01 + h2 * 9) * (a.sway || 0)) % C.ROOM_W, y = (h2 * C.ROOM_H + t * a.vy * (0.6 + h3)) % C.ROOM_H; if (x < 0) x += C.ROOM_W; if (y < 0) y += C.ROOM_H;
      let al = a.a * (a.flick ? (0.35 + 0.65 * Math.abs(Math.sin(t * 0.03 * (0.5 + h3) + h1 * 20))) : 1); if (a.flick === 2) al = Math.max(0, Math.sin(t * 0.02 + h1 * 40) - 0.6) * 2.5 * a.a;
      if (al <= 0.02) continue; c.globalAlpha = al;
      if (a.hstreak) { c.strokeStyle = a.col; c.lineWidth = a.sz; c.beginPath(); c.moveTo(x, y); c.lineTo(x - a.hstreak, y); c.stroke(); }
      else if (a.streak) { c.strokeStyle = a.col; c.lineWidth = a.sz; c.beginPath(); c.moveTo(x, y); c.lineTo(x + a.vx * 1.4, y + a.streak); c.stroke(); }
      else if (a.ring) { c.strokeStyle = a.col; c.lineWidth = 1; c.beginPath(); c.arc(x, y, a.sz * (0.6 + h3), 0, TAU); c.stroke(); }
      else if (a.blob) { c.fillStyle = a.col; c.beginPath(); c.ellipse(x, y, a.sz * (1 + h3), a.sz * 0.42 * (1 + h3), 0, 0, TAU); c.fill(); }
      else { c.fillStyle = a.col; c.beginPath(); c.arc(x, y, a.sz * (0.6 + h3 * 0.8), 0, TAU); c.fill(); if (a.glow) glow(c, x, y, 9, a.col, 0.5); }
    }
    c.restore();
  }

  // ==================================================================== decor under the creatures: room-type marks, traps, the key hint ring
  function drawDecor(g, c, t) {
    const room = g.room, rt = g.rt, info = ED.roomTypes[room.type];
    switch (room.type) {
      case 'shop': c.fillStyle = 'rgba(111,224,138,0.06)'; c.fillRect(220, 170, 520, 270); c.strokeStyle = 'rgba(111,224,138,0.3)'; c.setLineDash([8, 6]); c.strokeRect(220, 170, 520, 270); c.setLineDash([]);
        c.fillStyle = '#8a5a3a'; c.fillRect(440, 70, 80, 26); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(440, 70, 80, 3); c.fillStyle = '#e8c090'; c.beginPath(); c.arc(480, 60, 14, 0, TAU); c.fill(); c.strokeStyle = 'rgba(8,5,18,0.8)'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#4a8a5a'; c.fillRect(466, 70, 28, 18); c.fillStyle = '#222'; c.fillRect(473, 55, 4, 4); c.fillRect(483, 55, 4, 4); break;
      case 'treasure': case 'secret': case 'cursed': case 'devil': { const col = info.color; c.strokeStyle = rgba(col, 0.22 + 0.1 * Math.sin(t * 0.05)); c.lineWidth = 3; c.beginPath(); c.arc(480, 270, 140, 0, TAU); c.stroke(); c.beginPath(); c.arc(480, 270, 100, 0, TAU); c.stroke(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + t * 0.003; c.beginPath(); c.moveTo(480 + Math.cos(a) * 100, 270 + Math.sin(a) * 100); c.lineTo(480 + Math.cos(a) * 140, 270 + Math.sin(a) * 140); c.stroke(); } if (room.type === 'devil' || room.type === 'cursed') { c.fillStyle = rgba(col, 0.06); c.beginPath(); c.arc(480, 270, 150, 0, TAU); c.fill(); } break; }
      case 'shrine': c.strokeStyle = 'rgba(77,224,200,0.22)'; c.lineWidth = 2; c.strokeRect(250, 200, 460, 140); break;
      case 'rest': c.fillStyle = 'rgba(155,240,138,0.06)'; c.beginPath(); c.arc(480, 280, 120, 0, TAU); c.fill(); break;
      case 'fountain': c.fillStyle = 'rgba(95,212,255,0.05)'; c.beginPath(); c.arc(480, 270, 110, 0, TAU); c.fill(); break;
    }
    if (rt.traps) for (const tp of rt.traps) {
      if (tp.kind === 'spikes') {
        const st = tp.state, x = tp.x - tp.w / 2, y = tp.y - tp.h / 2; c.fillStyle = st === 1 ? 'rgba(255,70,60,0.35)' : 'rgba(40,40,52,0.7)'; c.fillRect(x, y, tp.w, tp.h); if (st === 1) { c.fillStyle = hatch(c, '#ff4a3a', 0.4); c.fillRect(x, y, tp.w, tp.h); } c.strokeStyle = st === 1 ? '#ff5a4a' : '#34343e'; c.lineWidth = 2; c.strokeRect(x, y, tp.w, tp.h);
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const px = tp.x - 24 + a * 24, py = tp.y - 24 + b * 24, up = st === 2; const gr = c.createLinearGradient(px - 5, py, px + 5, py); gr.addColorStop(0, up ? '#f0f0fa' : '#5a5a68'); gr.addColorStop(1, up ? '#8a8a9a' : '#2a2a34'); c.fillStyle = gr; c.beginPath(); c.moveTo(px - 5, py + 6); c.lineTo(px, up ? py - 11 : py - 2); c.lineTo(px + 5, py + 6); c.closePath(); c.fill(); }
      } else if (tp.kind === 'saw') {
        c.strokeStyle = 'rgba(70,70,90,0.7)'; c.lineWidth = 5; c.beginPath(); c.moveTo(tp.x0, tp.y); c.lineTo(tp.x1, tp.y); c.stroke(); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5; c.stroke();
        c.save(); c.translate(tp.x, tp.y); c.rotate(tp.a || 0); const gr = c.createRadialGradient(-3, -3, 1, 0, 0, tp.r * 1.1); gr.addColorStop(0, '#f0f0fa'); gr.addColorStop(1, '#8a8a9c'); c.fillStyle = gr; c.beginPath(); for (let k = 0; k < 16; k++) { const rr = k % 2 ? tp.r * 0.7 : tp.r * 1.1; c.lineTo(Math.cos(k * TAU / 16) * rr, Math.sin(k * TAU / 16) * rr); } c.closePath(); c.fill(); c.strokeStyle = 'rgba(10,4,20,0.8)'; c.lineWidth = 1.6; c.stroke(); c.fillStyle = '#4a4a5a'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.restore();
      } else {
        const gr = c.createLinearGradient(tp.x - 12, tp.y - 12, tp.x + 12, tp.y + 12); gr.addColorStop(0, tp.charging ? '#ff9a5a' : '#7a7a8a'); gr.addColorStop(1, tp.charging ? '#c04a1a' : '#3a3a48'); c.fillStyle = gr; c.fillRect(tp.x - 12, tp.y - 12, 24, 24); c.strokeStyle = 'rgba(8,5,18,0.85)'; c.lineWidth = 1.6; c.strokeRect(tp.x - 12, tp.y - 12, 24, 24); c.fillStyle = '#16121e'; c.beginPath(); c.arc(tp.x + tp.dirx * 6, tp.y, 5, 0, TAU); c.fill();
        if (tp.charging) skin.hatchLine(c, tp.x, tp.y, tp.x + tp.dirx * 900, tp.y, 8, '#ff6a3a', 0.35);
      }
    }
    if (g.hintId === room.id && !room.cleared) { c.strokeStyle = 'rgba(255,230,120,' + (0.3 + 0.25 * Math.sin(t * 0.1)) + ')'; c.lineWidth = 4; c.strokeRect(36, 36, C.ROOM_W - 72, C.ROOM_H - 72); }
  }

  // ==================================================================== the world
  let vig = null;
  const frameT = { sum: 0, n: 0 };
  function world(g, ctx) {
    const c = ctx, room = g.room, rt = g.rt, t = g.frameAll; if (!room || !rt) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0, th = g.theme, st = skin.styleOf(th);
    if (!room.cache || rt.dirty) skin.buildTiles(g, room);
    skin.updateParts(g);
    c.save(); c.translate(0, C.HUD); c.beginPath(); c.rect(0, 0, C.ROOM_W, C.ROOM_H); c.clip();
    if (g.shakeAmp > 0.1) c.translate((crand() - 0.5) * g.shakeAmp * 2, (crand() - 0.5) * g.shakeAmp * 2);
    c.drawImage(room.cache, 0, 0);
    for (const i of rt.dynTiles || []) skin.dynTile(c, room.tiles[i], (i % C.COLS) * TILE, Math.floor(i / C.COLS) * TILE, t, st, th);
    drawDecor(g, c, t);
    ED.runHooks('under', g, c, t);
    drawDoors(g, c, t);
    for (const z of g.zones) if (z.shape !== 'ring' || z.kind !== 'ring') drawZone(c, z, t);
    for (const k of g.pickups) drawPickup(c, k, t);
    for (const s of g.spawns) {                                                // spawn indicators: a closing ring and a growing disc in the foe's own colour
      const k = s.t / s.dur, def = ED.enemyTypes[s.type], col = s.elite ? '#ffd24a' : '#ff5a4a', r = def ? def.r : 12;
      c.strokeStyle = rgba(col, 0.4 + 0.5 * k); c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, r + 12 * (1 - k), 0, TAU); c.stroke(); c.fillStyle = rgba(def ? def.color : col, 0.18 + 0.32 * k); c.beginPath(); c.arc(s.x, s.y, r * k + 2, 0, TAU); c.fill();
      c.strokeStyle = rgba(col, 0.75); c.lineWidth = 1.6; c.beginPath(); c.moveTo(s.x - 6, s.y - 6); c.lineTo(s.x + 6, s.y + 6); c.moveTo(s.x + 6, s.y - 6); c.lineTo(s.x - 6, s.y + 6); c.stroke();
    }
    for (const b of g.bombs) { const k = b.t / b.fuse; shadow(c, b.x, b.y + 7, 8, 0.8); ICONS.bomb(c, b.x, b.y, 9 + Math.sin(k * 40) * 1.5, b.color); glow(c, b.x + 8, b.y - 8, 12, '#ff8a3a', 0.45 + 0.3 * Math.sin(k * 60)); c.strokeStyle = rgba('#ff4a2a', 0.25 + 0.4 * k); c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, b.r * k, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.setLineDash([5, 5]); c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.stroke(); c.setLineDash([]); }
    // everything that stands up in the room, back to front
    const list = []; for (const pr of g.props) if (!pr.dead) list.push([pr.y + 6, 0, pr]); for (const it of g.inters) if (!it.dead) list.push([it.y + (it.type === 'plate' || it.type === 'stairs' ? -40 : 10), 1, it]); for (const e of g.enemies) list.push([e.y + (e.boss ? e.r * 0.5 : 0), 2, e]); list.push([g.player.y + 4, 3, g.player]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, kind, o] of list) { if (kind === 0) drawProp(c, o, t); else if (kind === 1) drawInter(g, c, o, t); else if (kind === 2) skin.drawEnemy(g, c, o, t); else skin.drawPlayer(g, c, o, t); }
    for (const s of g.swings) drawSwing(c, s, t);
    for (const b of g.pproj) drawPProj(c, b, t);
    ED.runHooks('draw', g, c, t);
    for (const z of g.zones) if (z.shape === 'ring' && z.kind === 'ring') drawZone(c, z, t);
    for (const b of g.eproj) drawEProj(c, b, t);
    skin.drawParts(c, g);
    for (const f of g.fx) drawFx(c, f);
    ambience(c, g, t, st);
    skin.lightPass(g, c, t, st);
    for (const tx of g.texts) drawText(c, tx);
    if (g.doorHint) { const dh = g.doorHint, cc = ED.rooms.doorCenter(dh.dir), txt = ED.input.relabel(dh.text); c.font = 'bold 12px monospace'; c.textAlign = 'center'; const w = c.measureText(txt).width + 16, hx = U.clamp(cc.x, w / 2 + 6, C.ROOM_W - w / 2 - 6), hy = U.clamp(cc.y + (dh.dir === 'N' ? 54 : dh.dir === 'S' ? -48 : 0), 30, C.ROOM_H - 30); c.fillStyle = 'rgba(8,5,18,0.82)'; c.fillRect(hx - w / 2, hy - 13, w, 20); c.strokeStyle = dh.color; c.lineWidth = 1.5; c.strokeRect(hx - w / 2, hy - 13, w, 20); c.fillStyle = dh.color; c.fillText(txt, hx, hy + 1); }
    vignette(c);
    c.restore();
    if (g.flash) { c.fillStyle = rgba(g.flash.color, Math.min(0.8, g.flash.a)); c.fillRect(0, C.HUD, C.W, C.ROOM_H); }
    skin.screenFx && skin.screenFx(g, c, t);
    if (g.trans) { const k = g.trans.t / g.trans.dur, a = k < 0.5 ? k * 2 : (1 - k) * 2; c.fillStyle = 'rgba(0,0,0,' + U.clamp(a * 1.1, 0, 1) + ')'; c.fillRect(0, C.HUD, C.W, C.ROOM_H); }
    if (g.transFloor) { c.fillStyle = 'rgba(0,0,0,' + U.clamp(g.transFloor.t / 20, 0, 1) + ')'; c.fillRect(0, 0, C.W, C.H); }
    if (g.scene === 'intro') { const a = U.clamp(1 - g.introT / 30, 0, 1); if (a > 0) { c.fillStyle = 'rgba(0,0,0,' + a + ')'; c.fillRect(0, 0, C.W, C.H); } }
    if (t0) { const dt = performance.now() - t0; frameT.sum += dt; if (++frameT.n >= 60) { const avg = frameT.sum / frameT.n; skin.lastAvg = avg; if (avg > 15 && skin.auto > 0 && !skin.noAuto) skin.auto--; frameT.sum = 0; frameT.n = 0; } }
  }
  function vignette(c) {
    if (!vig) vig = bake('vignette', C.ROOM_W, C.ROOM_H, (v, w, h) => { const gr = v.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.66); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.4)'); v.fillStyle = gr; v.fillRect(0, 0, w, h); });
    c.drawImage(vig.cv, 0, 0);
  }
  skin.world = world;
  skin.draw = { prop: drawProp, doors: drawDoors, inter: drawInter, pickup: drawPickup, zone: drawZone, eproj: drawEProj, pproj: drawPProj, swing: drawSwing, fx: drawFx, decor: drawDecor, ambience };
})(typeof globalThis !== 'undefined' ? globalThis : this);

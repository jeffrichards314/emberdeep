/* EMBERDEEP — rooms.js
 * Room geometry, door slots, layout templates (obstacles / pits / pillars / hazards),
 * arena layouts for bosses, floor themes and the room-type registry (metadata only;
 * runtime behaviour of special rooms lives in specials.js).
 */
(function (root) {
  'use strict';
  const ED = root.ED, C = ED.C, T = ED.T;

  // ------------------------------------------------------------------ themes
  const THEMES = [
    { name: 'The Sunken Crypt',  floorA: '#2b2736', floorB: '#302b3d', wall: '#4a4560', wallTop: '#6a6485', accent: '#9a8cff', glow: '#8a7bff', fog: '#14101e' },
    { name: 'Mossy Ruins',       floorA: '#22301f', floorB: '#283826', wall: '#46583a', wallTop: '#6a8a52', accent: '#8bd95c', glow: '#9be86a', fog: '#0e150c' },
    { name: 'Frozen Halls',      floorA: '#243246', floorB: '#2a3a52', wall: '#4b6a8f', wallTop: '#86b1da', accent: '#7fd8ff', glow: '#9fe4ff', fog: '#0b1420' },
    { name: 'Cinder Vaults',     floorA: '#3a2420', floorB: '#42291f', wall: '#6e3d2e', wallTop: '#a85a3c', accent: '#ff8a3c', glow: '#ff9f4a', fog: '#1c0c08' },
    { name: 'The Drowned Temple',floorA: '#1d3236', floorB: '#223b40', wall: '#36656b', wallTop: '#5fa6ad', accent: '#4de0c8', glow: '#6ff0da', fog: '#08171a' },
    { name: 'Obsidian Void',     floorA: '#191622', floorB: '#1e1a2a', wall: '#3a3050', wallTop: '#6d4fb0', accent: '#d070ff', glow: '#e08aff', fog: '#07050c' },
    { name: 'Crimson Cathedral', floorA: '#34202a', floorB: '#3b2430', wall: '#6a2e45', wallTop: '#b04a6e', accent: '#ff5a7a', glow: '#ff7a96', fog: '#17080e' },
  ];
  function themeFor(floor) {
    if (ED.worlds && ED.packs.on('v3')) return ED.worlds.themeFor(floor);          // v3: one palette per five-floor world
    return THEMES[Math.floor((floor - 1) / 2) % THEMES.length];
  }

  // ------------------------------------------------------------------ door geometry
  // door slots: 2 tiles wide, centred on each wall
  const DOOR_TILES = {
    N: [[14, 0], [15, 0]], S: [[14, 17], [15, 17]],
    W: [[0, 8], [0, 9]],   E: [[29, 8], [29, 9]],
  };
  // inside clearance zones (tile rects x0,y0,x1,y1 inclusive)
  const DOOR_CLEAR = {
    N: [12, 1, 17, 4], S: [12, 13, 17, 16], W: [1, 6, 4, 11], E: [25, 6, 28, 11],
  };
  const T32 = C.TILE;
  function doorCenter(dir) {
    const d = DOOR_TILES[dir];
    return { x: (d[0][0] + d[1][0] + 1) * T32 / 2, y: (d[0][1] + d[1][1] + 1) * T32 / 2 };
  }
  /** where the player appears when entering through `dir` (the door they came in by) */
  function entryPos(dir) {
    const c = doorCenter(dir);
    const v = ED.DIR_V[dir];
    return { x: c.x - v[0] * 0 + (dir === 'W' ? 2.1 * T32 : dir === 'E' ? -2.1 * T32 : 0),
             y: c.y + (dir === 'N' ? 2.1 * T32 : dir === 'S' ? -2.1 * T32 : 0) };
  }
  function inDoorSlot(dir, tx, ty) { const d = DOOR_TILES[dir]; return (tx === d[0][0] && ty === d[0][1]) || (tx === d[1][0] && ty === d[1][1]); }

  // ------------------------------------------------------------------ painter
  const idx = (x, y) => y * C.COLS + x;
  function Painter(g, rng) { this.g = g; this.rng = rng; }
  Painter.prototype = {
    set(x, y, t) { if (x > 0 && y > 0 && x < C.COLS - 1 && y < C.ROWS - 1) this.g[idx(x, y)] = t; },
    get(x, y) { return this.g[idx(x, y)]; },
    rect(x, y, w, h, t) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, t); },
    sym(x, y, t) { this.set(x, y, t); this.set(C.COLS - 1 - x, y, t); this.set(x, C.ROWS - 1 - y, t); this.set(C.COLS - 1 - x, C.ROWS - 1 - y, t); },
    symRect(x, y, w, h, t) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.sym(x + i, y + j, t); },
    outline(x, y, w, h, t, gaps) {
      for (let i = 0; i < w; i++) { this.set(x + i, y, t); this.set(x + i, y + h - 1, t); }
      for (let j = 0; j < h; j++) { this.set(x, y + j, t); this.set(x + w - 1, y + j, t); }
    },
  };

  // ------------------------------------------------------------------ layout templates
  // each: { id, w (weight), min (first floor), paint(p, rng, floor) }
  const R = T.ROCK, P = T.PIT, S = T.SPIKE, W = T.WATER;
  const TEMPLATES = [
    { id: 'open', w: 5, min: 1, paint() {} },
    { id: 'pillars4', w: 9, min: 1, paint(p) { p.symRect(6, 4, 2, 2, R); } },
    { id: 'pillars6', w: 6, min: 1, paint(p) { p.symRect(5, 3, 2, 2, R); p.rect(13, 7, 4, 4, R); } },
    { id: 'centerBlock', w: 6, min: 1, paint(p) { p.rect(12, 7, 6, 4, R); } },
    { id: 'ring', w: 6, min: 1, paint(p) {
      p.outline(9, 4, 12, 10, R);
      p.rect(14, 4, 2, 1, T.FLOOR); p.rect(14, 13, 2, 1, T.FLOOR); p.rect(9, 8, 1, 2, T.FLOOR); p.rect(20, 8, 1, 2, T.FLOOR);
    } },
    { id: 'checker', w: 6, min: 1, paint(p) {
      for (let x = 5; x <= 13; x += 3) for (let y = 3; y <= 7; y += 3) if (!(y >= 6 && x >= 12)) p.sym(x, y, R);
    } },
    { id: 'splitWalls', w: 6, min: 1, paint(p) { p.symRect(10, 1, 1, 6, R); } },
    { id: 'cross', w: 5, min: 1, paint(p) { p.symRect(7, 5, 3, 1, R); p.symRect(7, 5, 1, 3, R); } },
    { id: 'hall', w: 6, min: 1, paint(p) {
      for (const x of [6, 10, 19, 23]) for (const y of [4, 12]) p.set(x, y, R);
    } },
    { id: 'bunkers', w: 5, min: 1, paint(p) { p.symRect(5, 4, 3, 1, R); p.symRect(5, 5, 1, 2, R); p.symRect(11, 7, 2, 1, R); } },
    { id: 'scatter', w: 8, min: 1, paint(p, rng) {
      const n = rng.int(5, 9);
      for (let i = 0; i < n; i++) {
        const x = rng.int(3, 13), y = rng.int(2, 7);
        p.sym(x, y, R);
      }
    } },
    { id: 'pitCorners', w: 5, min: 2, paint(p) { p.symRect(2, 2, 4, 3, P); } },
    { id: 'moat', w: 5, min: 2, paint(p) {
      p.outline(8, 3, 14, 12, P);
      p.rect(14, 3, 2, 1, T.FLOOR); p.rect(14, 14, 2, 1, T.FLOOR); p.rect(8, 8, 1, 2, T.FLOOR); p.rect(21, 8, 1, 2, T.FLOOR);
    } },
    { id: 'diamond', w: 4, min: 3, paint(p) {
      for (let y = 1; y < C.ROWS - 1; y++) for (let x = 1; x < C.COLS - 1; x++) {
        const dx = Math.abs(x - 14.5), dy = Math.abs(y - 8.5), d = dx + dy * 1.7;
        if (d > 6.4 && d < 8.1 && dx > 1.6 && dy > 1.6) p.set(x, y, P);
      }
    } },
    { id: 'spikeLanes', w: 5, min: 3, paint(p) {
      p.rect(4, 5, 22, 1, S); p.rect(4, 12, 22, 1, S);
      p.rect(7, 5, 2, 1, T.FLOOR); p.rect(14, 5, 2, 1, T.FLOOR); p.rect(21, 5, 2, 1, T.FLOOR);
      p.rect(7, 12, 2, 1, T.FLOOR); p.rect(14, 12, 2, 1, T.FLOOR); p.rect(21, 12, 2, 1, T.FLOOR);
    } },
    { id: 'spikeCorners', w: 4, min: 4, paint(p) { p.symRect(3, 3, 3, 3, S); p.rect(13, 7, 4, 4, S); } },
    { id: 'waterPools', w: 4, min: 2, paint(p) { p.symRect(4, 3, 4, 3, W); p.rect(12, 7, 6, 4, W); } },
    { id: 'islands', w: 4, min: 5, paint(p) { p.symRect(5, 3, 3, 3, P); p.symRect(10, 6, 2, 2, P); p.rect(13, 8, 4, 2, R); } },
    { id: 'gauntlet', w: 3, min: 6, paint(p) { p.symRect(8, 2, 1, 5, R); p.symRect(12, 5, 1, 5, S); p.symRect(18, 2, 1, 4, P); } },
  ];

  // ------------------------------------------------------------------ arena layouts (boss + mini boss)
  function ellipseCut(p, k, rx, ry) {
    for (let y = 1; y < C.ROWS - 1; y++) for (let x = 1; x < C.COLS - 1; x++) {
      const dx = (x - 14.5) / rx, dy = (y - 8.5) / ry;
      if (dx * dx + dy * dy > k) p.set(x, y, T.WALL);
    }
  }
  const ARENAS = {
    arena_open:    { paint(p) { p.symRect(1, 1, 2, 2, T.WALL); } },
    arena_round:   { paint(p) { ellipseCut(p, 1.0, 14.6, 8.7); } },
    arena_pillars: { paint(p) { ellipseCut(p, 1.0, 14.6, 8.7); p.symRect(7, 4, 2, 2, R); } },
    arena_moat:    { paint(p) { p.outline(2, 2, 26, 14, P); p.rect(3, 3, 1, 12, T.FLOOR); p.rect(26, 3, 1, 12, T.FLOOR); p.rect(14, 2, 2, 1, T.FLOOR); p.rect(14, 15, 2, 1, T.FLOOR); p.rect(2, 8, 1, 2, T.FLOOR); p.rect(27, 8, 1, 2, T.FLOOR); } },
    arena_spikes:  { paint(p) { ellipseCut(p, 1.0, 14.6, 8.7); p.symRect(4, 4, 2, 2, S); p.symRect(10, 3, 2, 1, S); } },
    arena_cross:   { paint(p) { ellipseCut(p, 1.0, 14.6, 8.7); p.symRect(7, 4, 3, 1, R); p.symRect(7, 4, 1, 3, R); } },
    arena_grid:    { paint(p) { for (const x of [7, 22]) for (const y of [4, 13]) p.rect(x, y, 1, 1, R); p.rect(14, 8, 2, 2, T.RUG); } },
    arena_pits:    { paint(p) { ellipseCut(p, 1.0, 14.6, 8.7); p.symRect(5, 4, 3, 2, P); p.symRect(11, 3, 2, 2, P); } },
    arena_ruins:   { paint(p) { p.symRect(4, 3, 1, 3, R); p.symRect(8, 6, 2, 1, R); p.symRect(5, 12, 3, 1, R); } },
    arena_throne:  { paint(p) { ellipseCut(p, 1.0, 14.6, 8.7); p.rect(12, 2, 6, 1, T.RUG); p.symRect(5, 5, 1, 4, R); } },
  };

  // ------------------------------------------------------------------ layout builder
  const PASS = new Set([T.FLOOR, T.SPIKE, T.WATER, T.RUG, T.LAVA, T.ICE, T.DOOR, T.CRACK]);
  function floodCount(g, sx, sy) {
    const seen = new Uint8Array(g.length);
    const q = [idx(sx, sy)]; seen[q[0]] = 1;
    let h = 0;
    while (h < q.length) {
      const i = q[h++], x = i % C.COLS, y = (i / C.COLS) | 0;
      const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= C.COLS || ny >= C.ROWS) continue;
        const j = idx(nx, ny);
        if (seen[j] || !PASS.has(g[j])) continue;
        seen[j] = 1; q.push(j);
      }
    }
    return seen;
  }

  /**
   * Build the base tile grid for a room.  `opts.template` forces a template id,
   * `opts.arena` an arena id.  Door slots are carved for every dir in `dirs`
   * (door objects decide open/closed/locked at runtime).
   */
  function buildTiles(dirs, rng, floor, opts) {
    opts = opts || {};
    const g = new Uint8Array(C.COLS * C.ROWS);
    for (let y = 0; y < C.ROWS; y++) for (let x = 0; x < C.COLS; x++)
      g[idx(x, y)] = (x === 0 || y === 0 || x === C.COLS - 1 || y === C.ROWS - 1) ? T.WALL : T.FLOOR;
    const p = new Painter(g, rng);
    let tid = 'open';
    if (opts.arena && ARENAS[opts.arena]) { ARENAS[opts.arena].paint(p, rng, floor); tid = opts.arena; }
    else {
      let tpl;
      if (opts.template) tpl = TEMPLATES.find(t => t.id === opts.template);
      if (!tpl) {
        const pool = TEMPLATES.filter(t => t.min <= floor && (!opts.allow || opts.allow.includes(t.id)));
        tpl = rng.weighted(pool.length ? pool : [TEMPLATES[0]], 'w');
      }
      tpl.paint(p, rng, floor); tid = tpl.id;
    }
    // carve door slots and clearance zones
    for (const d of dirs) {
      const z = DOOR_CLEAR[d];
      for (let y = z[1]; y <= z[3]; y++) for (let x = z[0]; x <= z[2]; x++) g[idx(x, y)] = T.FLOOR;
      for (const [x, y] of DOOR_TILES[d]) g[idx(x, y)] = T.DOOR;
    }
    // validate: everything passable must be reachable from the first door / centre; fill pockets with rock
    const start = dirs.length ? (() => { const c = DOOR_CLEAR[dirs[0]]; return [c[0] + ((c[2] - c[0]) >> 1), c[1] + ((c[3] - c[1]) >> 1)]; })() : [14, 8];
    let seen = floodCount(g, start[0], start[1]);
    let ok = PASS.has(g[idx(start[0], start[1])]);
    for (const d of dirs) { const [dx, dy] = DOOR_TILES[d][0]; if (!seen[idx(dx, dy)]) ok = false; }
    if (!ok) {   // template broke connectivity: fall back to an open room
      for (let y = 1; y < C.ROWS - 1; y++) for (let x = 1; x < C.COLS - 1; x++) g[idx(x, y)] = T.FLOOR;
      for (const d of dirs) for (const [x, y] of DOOR_TILES[d]) g[idx(x, y)] = T.DOOR;
      tid = 'open';
      seen = floodCount(g, start[0], start[1]);
    }
    let free = 0;
    for (let i = 0; i < g.length; i++) {
      if (PASS.has(g[i]) && !seen[i]) g[i] = R;      // unreachable pocket -> rock
      else if (g[i] === T.FLOOR) free++;
    }
    return { tiles: g, template: tid, free };
  }

  /** cells usable as spawn spots: plain floor, away from door slots */
  function spawnTiles(tiles, dirs) {
    const out = [];
    for (let y = 2; y < C.ROWS - 2; y++) for (let x = 2; x < C.COLS - 2; x++) {
      const t = tiles[idx(x, y)];
      if (t !== T.FLOOR && t !== T.RUG) continue;
      let near = false;
      for (const d of dirs) {
        const c = DOOR_TILES[d][0];
        if (Math.abs(x - c[0]) + Math.abs(y - c[1]) < 5) { near = true; break; }
      }
      if (near) continue;
      out.push({ x: x * T32 + 16, y: y * T32 + 16, tx: x, ty: y });
    }
    return out;
  }

  // ------------------------------------------------------------------ room type registry
  // cat: start|combat|positive|negative|mixed|miniboss|boss.   keyHost: may hold a key source.
  // Runtime hooks (setup/update/draw/onClear) are attached by specials.js.
  const TYPES = {
    start:      { id: 'start',      name: 'Entrance',        cat: 'start',    color: '#cfd8ff', icon: 'start',      keyHost: false, layouts: ['open', 'pillars4', 'scatter'] },
    normal:     { id: 'normal',     name: 'Chamber',         cat: 'combat',   color: '#8a8aa0', icon: null,         keyHost: true,  combat: true },
    treasure:   { id: 'treasure',   name: 'Treasure Room',   cat: 'positive', color: '#ffd24a', icon: 'chest',      keyHost: true,  layouts: ['open', 'pillars4', 'ring'] },
    fountain:   { id: 'fountain',   name: 'Healing Fountain',cat: 'positive', color: '#5fd4ff', icon: 'drop',       keyHost: false, layouts: ['open', 'pillars4', 'ring'] },
    shop:       { id: 'shop',       name: 'Shop',            cat: 'positive', color: '#6fe08a', icon: 'coin',       keyHost: false, layouts: ['open'] },
    blacksmith: { id: 'blacksmith', name: 'Blacksmith',      cat: 'positive', color: '#ff9a3c', icon: 'anvil',      keyHost: false, layouts: ['open', 'pillars4'] },
    secret:     { id: 'secret',     name: 'Secret Room',     cat: 'positive', color: '#c78bff', icon: 'secret',     keyHost: true,  layouts: ['open', 'pillars4'], hidden: true },
    rest:       { id: 'rest',       name: 'Rest Chamber',    cat: 'positive', color: '#9bf08a', icon: 'camp',       keyHost: false, layouts: ['open', 'ring'] },
    ambush:     { id: 'ambush',     name: 'Ambush Room',     cat: 'negative', color: '#ff5a4a', icon: 'chest',      keyHost: false, layouts: ['open', 'pillars4'], disguise: 'treasure' },
    trap:       { id: 'trap',       name: 'Trap Room',       cat: 'negative', color: '#ff7a3a', icon: 'spikes',     keyHost: false, layouts: ['open'] },
    cursed:     { id: 'cursed',     name: 'Cursed Room',     cat: 'negative', color: '#a0328a', icon: 'curse',      keyHost: false, layouts: ['open', 'ring'] },
    haunted:    { id: 'haunted',    name: 'Haunted Room',    cat: 'negative', color: '#b8c4ff', icon: 'ghost',      keyHost: false, layouts: ['pillars6', 'hall', 'scatter'], combat: true },
    shrine:     { id: 'shrine',     name: 'Shrine',          cat: 'mixed',    color: '#4de0c8', icon: 'shrine',     keyHost: false, layouts: ['open', 'ring'] },
    mystery:    { id: 'mystery',    name: 'Mystery Chest',   cat: 'mixed',    color: '#e070ff', icon: 'mystery',    keyHost: true,  layouts: ['open', 'pillars4'] },
    devil:      { id: 'devil',      name: "Devil's Deal",    cat: 'mixed',    color: '#ff2a3a', icon: 'devil',      keyHost: false, layouts: ['open', 'ring'] },
    challenge:  { id: 'challenge',  name: 'Challenge Room',  cat: 'mixed',    color: '#ffb02a', icon: 'swords',     keyHost: false, layouts: ['open', 'pillars4', 'checker'], combat: true },
    gambling:   { id: 'gambling',   name: 'Gambling Table',  cat: 'mixed',    color: '#f0f0f0', icon: 'dice',       keyHost: false, layouts: ['open'] },
    miniboss:   { id: 'miniboss',   name: 'Mini Boss',       cat: 'miniboss', color: '#e0523a', icon: 'skull',      keyHost: true,  boss: true },
    boss:       { id: 'boss',       name: 'Boss Chamber',    cat: 'boss',     color: '#b01030', icon: 'bigskull',   keyHost: false, boss: true },
  };

  ED.packs.track('rooms', TYPES);
  ED.rooms = {
    THEMES, themeFor, TEMPLATES, ARENAS, TYPES,
    DOOR_TILES, DOOR_CLEAR, doorCenter, entryPos, inDoorSlot,
    buildTiles, spawnTiles, idx,
    PASS,
    /** is this tile type walkable by ground creatures (ignoring door state) */
    isSolidTile(t) { return t === T.WALL || t === T.ROCK; },
    isPassable(t) { return PASS.has(t); },
  };
  ED.roomTypes = TYPES;
})(typeof globalThis !== 'undefined' ? globalThis : this);

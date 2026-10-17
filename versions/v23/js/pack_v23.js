/* EMBERDEEP — pack_v23.js : v23 "POLISH" — the same shapes, finished properly (see ART.md).
 * The pack is declared here so it has a page on the Versions screen and in the Guide; the engine is in art_core.js / art_world.js / art_scene.js / art_ui.js, loaded after render.js.
 * With this pack off (or POLISH: off in the gallery) ED.skin.on() is false and render.js draws exactly what it always drew. */
(function (root) {
  'use strict';
  const ED = root.ED, P = ED.packs;
  P.define({
    id: 'v23', name: 'POLISH', tag: 'shaded, lit and alive', color: '#ffb06a',
    blurb: 'The same shapes, finished properly: every creature, boss and object is outlined, shaded from one light and rim-lit; foes breathe, walk, wind up and recoil and their eyes follow you; every land has its own floor, walls and ambient light with real lamps; telegraphs, projectiles and effects share one visual language; every screen gets the same frame. Options adds an Effects setting. Off = the classic look.',
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

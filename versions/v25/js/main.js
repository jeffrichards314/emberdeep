/* EMBERDEEP — main.js : Game object, fixed-timestep loop, scene state machine, bootstrap */
(function (root) {
  'use strict';
  const ED = root.ED, U = ED.U, D = ED.D, C = ED.C;

  function Game(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas; this.headless = !!opts.headless;
    this.ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    this.scene = 'title'; this.frame = 0; this.frameAll = 0; this.ts = 1; this.hitstopT = 0; this.shakeAmp = 0; this.flash = null;
    this.floorNum = 1; this.dif = D.at(1); this.floor = null; this.room = null; this.rt = null; this.player = null; this.run = null;
    this.rng = new ED.RNG('boot');
    this.enemies = []; this.pproj = []; this.eproj = []; this.zones = []; this.pickups = []; this.inters = []; this.props = [];
    this.fx = []; this.texts = []; this.swings = []; this.spawns = []; this.bombs = []; this.toasts = []; this.timers = []; this.popups = []; this.allies = [];
    this.col = new Uint8Array(C.COLS * C.ROWS);
    this.modal = null; this.trans = null; this.transT = 0; this.transFloor = null; this.dying = null; this.slowT = 0; this.slowmoT = 0; this.god = false;
    this.nearInter = null; this.doorHint = null; this.bossCard = null; this.hintId = null; this.goldPulse = 0; this.keyFlash = null;
    this.pillarCount = 0; this.introT = 0; this.deadT = 0; this.fps = 60; this._fpsAcc = 0; this._fpsN = 0;
    this.ui = ED.ui ? ED.ui.create(this) : {};
  }
  let mixed = false;
  function applyMixins() {
    if (mixed) return; mixed = true;
    for (const m of ED.mixins) Object.assign(Game.prototype, m);
  }

  const G = Game.prototype;

  // ------------------------------------------------------------------ main step
  G.step = function () {
    const inp = ED.input;
    inp.poll();
    this.frameAll++;
    if (inp.consume('mute')) { const m = ED.audio.toggleMute(); }
    if (inp.consume('debug') && ED.debug) ED.debug.toggle(this);
    if (inp.consume('fullscreen') && typeof document !== 'undefined' && document.documentElement && document.documentElement.requestFullscreen) {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen();
    }
    switch (this.scene) {
      case 'intro': this.updateIntro(); break;
      case 'play': this.updatePlay(); break;
      default: ED.ui.updateMenu(this);
    }
    if (ED.debug) ED.debug.update(this);
    if (ED.sandboxGuard) ED.sandboxGuard(this);
    inp.endFrame();
  };

  G.updateIntro = function () {
    this.introT++;
    this.updateFx();
    if (this.introT > 38 && (ED.input.consume('confirm') || ED.input.consume('attack') || ED.input.consume('interact'))) this.introT = Math.max(this.introT, 140);
    if (this.introT >= 150) { this.scene = 'play'; this.sfx('door'); this.onEnterRoom && this.updateMusic(); }
  };

  G.updatePlay = function () {
    const inp = ED.input, p = this.player;
    if (this.modal) { ED.ui.updateModal(this); return; }
    if (inp.consume('pause')) { this.scene = 'paused'; ED.ui.sel = 0; this.sfx('ui'); return; }
    if (this.hitstopT > 0) { this.hitstopT--; this.updateFx(); return; }
    this.frame++; this.run.frames++;
    // time scale (time slow active, low-HP relic, cinematic slow-mo)
    let ts = 1;
    if (this.slowT > 0) { this.slowT--; ts = 0.4; }
    if (p.syncTime) ts = Math.min(ts, 0.6);
    if (this.slowmoT > 0) { this.slowmoT--; ts = Math.min(ts, 0.35); }
    this.ts = ts;
    if (this.shakeAmp > 0) this.shakeAmp *= 0.86; if (this.shakeAmp < 0.2) this.shakeAmp = 0;
    if (this.flash) { this.flash.a *= 0.9; if (this.flash.a < 0.01) this.flash = null; }
    if (this.goldPulse > 0) this.goldPulse--;
    for (const pu of this.popups) pu.t++; U.compact(this.popups, pu => pu.t < pu.dur);
    if (this.bossCard) { this.bossCard.t++; if (this.bossCard.t > this.bossCard.dur) this.bossCard = null; }

    // floor transition (stairs): fade out, then the intro card takes over
    if (this.transFloor) {
      const tf = this.transFloor; tf.t++;
      if (tf.t >= 22) { this.transFloor = null; this.startFloor(this.floorNum + 1); }
      return;
    }
    // room transition
    if (this.trans) {
      const t = this.trans; t.t++;
      if (t.t === 11 && !t.did) { t.did = true; this.enterRoom(t.to, t.dir); }
      if (t.t >= t.dur) { this.trans = null; this.transT = 0; }
      return;
    }
    if (this.dying) {
      this.dying.t++;
      if (this.dying.t >= 110) { this.finishRun(false); return; }
    } else if (!p.dead) {
      this.updatePlayer();
    }
    this.updateSwings(); this.updatePProj();
    this.updateSpawns(); this.updateEnemies(); this.updateEProj(); this.updateZones(); this.updateBombs();
    this.updatePickups(); this.updateRoom(); this.updateFx(); this.updateTimers(); this.updateHints(); ED.runHooks('tick', this);
    if (this.keyFlash) { this.keyFlash.t++; if (this.keyFlash.t > 40) this.keyFlash = null; }
    // enemy/boss "later" callbacks & misc handled inside their updates
    if (!isFinite(p.x) || !isFinite(p.y)) { p.x = 480; p.y = 300; }
  };

  // ------------------------------------------------------------------ render
  G.render = function () {
    const ctx = this.ctx; if (!ctx) return;
    const cv = this.canvas;
    const s = cv.width / C.W;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = '#07060c'; ctx.fillRect(0, 0, C.W, C.H);
    switch (this.scene) {
      case 'title': case 'select': case 'collection': case 'help': case 'settings': case 'versions': case 'keys': ED.ui.drawMenu(this, ctx); break;
      case 'intro': ED.render.world(this, ctx); ED.ui.drawFloorIntro(this, ctx); break;
      default: if (ED.sceneImpl[this.scene]) { ED.ui.drawMenu(this, ctx); break; }       // update scenes (Hearth, Records, Hunt, Legacy...) never draw the world of a finished run under themselves
      case 'play': case 'paused': case 'dead': case 'victory':
        if (this.floor) { ED.render.world(this, ctx); ED.ui.drawHud(this, ctx); }
        ED.ui.drawOverlay(this, ctx);
        break;
    }
    if (ED.debug && ED.debug.on) ED.debug.draw(this, ctx);
  };

  // ------------------------------------------------------------------ loop
  /** one display frame: advance the fixed-step simulation by `dt` seconds, then draw.  An exception never escapes: it is reported and, if it repeats, the game is paused so the player can leave safely. */
  G.frameTick = function (dt) {
    try {
      this._acc = (this._acc || 0) + dt;
      let n = 0;
      while (this._acc >= C.DT && n < 5) { this.step(); this._acc -= C.DT; n++; }
      if (n >= 5) this._acc = 0;
      this.render();
      this._fpsAcc += dt; this._fpsN++;
      if (this._fpsAcc >= 0.5) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0; }
    } catch (err) { this._acc = 0; this.crash(err); }
  };
  /** report a caught error: log it, tell the player, and stop the simulation if it keeps happening (every frame would otherwise bury the console and the screen) */
  G.crash = function (err) {
    const now = this.frameAll || 0, L = this.crashes || (this.crashes = []);
    L.push(now); while (L.length && now - L[0] > 180) L.shift();
    this.lastError = { msg: String((err && err.message) || err), stack: String((err && err.stack) || ''), at: now }; this.errorCount = (this.errorCount || 0) + 1;
    try { if (typeof console !== 'undefined') console.error('[EMBERDEEP] caught an error — the game keeps running:', err); } catch (e) { /* ignore */ }
    try { if (this.toasts && L.length <= 2) this.toast('Something went wrong (' + this.lastError.msg.slice(0, 70) + ') — please report it. The game continues.', '#ff6a6a', 260); } catch (e) { /* ignore */ }
    if (L.length > 5) {
      if (this.scene === 'play' || this.scene === 'intro') { this.scene = 'paused'; this.modal = null; this.trans = null; this.transFloor = null; }
      else if (L.length > 40 && this.scene !== 'title') { this.scene = 'title'; this.modal = null; }
    }
  };
  G.start = function () {
    const self = this;
    let last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);                                   // re-arm FIRST: nothing below may stop the loop
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      self.frameTick(dt);
    }
    requestAnimationFrame(frame);
  };

  // ------------------------------------------------------------------ factory + boot
  ED.Game = Game;
  ED.createGame = function (canvas, opts) { applyMixins(); return new Game(canvas, opts); };
  ED.boot = function () {
    const canvas = document.getElementById('game');
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    canvas.width = Math.round(C.W * dpr); canvas.height = Math.round(C.H * dpr);
    ED.input.init(canvas);
    ED.hooksSafe = true;                       // in the browser a failing update hook is isolated and switched off after a few errors; the test suite leaves this off so errors stay loud
    const g = ED.createGame(canvas);
    ED.game = g;
    if (root.addEventListener) root.addEventListener('blur', () => { if (g.scene === 'play' && !g.modal) { g.scene = 'paused'; ED.ui.navSel = null; } });
    if (ED.debug) ED.debug.init(g);
    g.start();
    return g;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

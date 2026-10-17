/* EMBERDEEP — audio.js : procedural WebAudio SFX + a small reactive generative score */
(function (root) {
  'use strict';
  const ED = root.ED;
  const AC = root.AudioContext || root.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  const A = ED.audio = {
    enabled: !!AC, muted: false, ready: false,
    unlock() {
      if (!AC || ctx) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
      try {
        ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.connect(master); musBus = ctx.createGain(); musBus.connect(master);
        const len = ctx.sampleRate; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        A.ready = true; A.applyVolume(); A.music.start();
      } catch (e) { A.enabled = false; }
    },
    applyVolume() {
      if (!ctx) return; const s = ED.save.meta.settings;
      master.gain.value = A.muted ? 0 : 1; sfxBus.gain.value = 0.55 * s.volume; musBus.gain.value = 0.5 * s.music * s.volume;
    },
    toggleMute() { A.muted = !A.muted; A.applyVolume(); return A.muted; },
    // ---- building blocks
    tone(type, f0, f1, dur, vol, delay, bus) {
      if (!ctx) return; const t = ctx.currentTime + (delay || 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol, f0, f1, type, delay, q) {
      if (!ctx) return; const t = ctx.currentTime + (delay || 0);
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.Q.value = q || 0.8;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1 || f0), t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.02);
    },
    play(name, o) {
      if (!ctx || A.muted || ctx.state !== 'running') return;
      const now = ctx.currentTime; A._last = A._last || {};
      if (A._last[name] && now - A._last[name] < 0.035) return;      // anti-spam
      A._last[name] = now;
      const v = (o && o.vol) || 1, p = (o && o.pitch) || 1, r = SFX[name];
      if (r) r(v, p);
    },
  };
  const T = (type, f0, f1, d, v, dl) => A.tone(type, f0, f1, d, v, dl);
  const N = (d, v, f0, f1, t, dl, q) => A.noise(d, v, f0, f1, t, dl, q);
  const SFX = {
    hit: (v, p) => { N(0.07, 0.5 * v, 2400, 500, 'bandpass'); T('square', 240 * p, 110, 0.07, 0.18 * v); },
    crit: (v, p) => { N(0.1, 0.5 * v, 3500, 800, 'bandpass'); T('square', 700 * p, 1100, 0.1, 0.2 * v); T('triangle', 1400, 700, 0.14, 0.15 * v, 0.02); },
    kill: (v, p) => { N(0.18, 0.5 * v, 1800, 200, 'lowpass'); T('sine', 220 * p, 60, 0.18, 0.3 * v); },
    bossdie: () => { for (let i = 0; i < 6; i++) { N(0.4, 0.5, 2000 - i * 200, 80, 'lowpass', i * 0.12); T('sine', 120 - i * 10, 30, 0.5, 0.4, i * 0.12); } },
    hurt: () => { T('sawtooth', 320, 70, 0.28, 0.28); N(0.2, 0.4, 900, 150, 'lowpass'); },
    swing: (v, p) => N(0.09, 0.28 * v, 600 * p, 3200 * p, 'bandpass', 0, 1.2),
    heavy: () => { N(0.2, 0.5, 300, 90, 'lowpass'); T('sine', 90, 40, 0.22, 0.5); },
    dash: () => N(0.13, 0.3, 1200, 5000, 'highpass'),
    shoot: (v, p) => T('square', 520 * p, 190, 0.1, 0.12 * v),
    lunge: () => { T('sawtooth', 150, 400, 0.14, 0.15); N(0.12, 0.2, 400, 2000, 'bandpass'); },
    thud: () => { T('sine', 100, 35, 0.18, 0.45); N(0.1, 0.3, 500, 100, 'lowpass'); },
    coin: () => { T('square', 988, 988, 0.05, 0.1); T('square', 1319, 1319, 0.12, 0.1, 0.05); },
    pickup: () => { T('triangle', 520, 780, 0.1, 0.2); T('triangle', 780, 1040, 0.12, 0.18, 0.08); },
    heal: () => { [523, 659, 784, 1046].forEach((f, i) => T('sine', f, f, 0.14, 0.18, i * 0.06)); },
    keypick: () => { [660, 880, 1320].forEach((f, i) => T('triangle', f, f, 0.2, 0.2, i * 0.07)); },
    keydrop: () => { T('triangle', 1200, 1800, 0.25, 0.2); T('sine', 600, 600, 0.3, 0.12, 0.05); },
    boom: (v) => { N(0.5, 0.7 * v, 1800, 60, 'lowpass'); T('sine', 90, 28, 0.5, 0.55 * v); },
    door: () => { T('square', 110, 55, 0.25, 0.25); N(0.2, 0.3, 400, 80, 'lowpass'); },
    unlockdoor: () => { T('triangle', 400, 800, 0.15, 0.25); T('triangle', 800, 1600, 0.2, 0.2, 0.1); N(0.12, 0.3, 3000, 800, 'bandpass', 0.05); },
    block: () => { T('square', 1400, 900, 0.04, 0.15); N(0.05, 0.3, 4000, 2000, 'highpass'); },
    crack: () => { N(0.2, 0.6, 3000, 300, 'bandpass'); T('square', 200, 60, 0.15, 0.2); },
    summon: () => { T('sawtooth', 120, 360, 0.4, 0.15); T('sine', 240, 720, 0.4, 0.12); },
    zap: () => { N(0.12, 0.35, 5000, 800, 'bandpass'); T('sawtooth', 900, 200, 0.1, 0.12); },
    fuse: () => N(0.5, 0.15, 3000, 6000, 'highpass'),
    pot: () => { N(0.12, 0.35, 2500, 600, 'bandpass'); T('triangle', 300, 150, 0.08, 0.15); },
    levelup: () => { [392, 523, 659, 784, 1046].forEach((f, i) => T('triangle', f, f, 0.22, 0.2, i * 0.07)); },
    revive: () => { for (let i = 0; i < 8; i++) T('triangle', 261 * Math.pow(1.122, i * 2), 261 * Math.pow(1.122, i * 2), 0.3, 0.2, i * 0.06); },
    bossroar: () => { T('sawtooth', 70, 38, 1.2, 0.5); T('sawtooth', 73, 36, 1.2, 0.4); N(1.0, 0.4, 600, 80, 'lowpass'); },
    telegraph: () => { T('sine', 300, 440, 0.12, 0.22); T('triangle', 620, 900, 0.08, 0.08, 0.04); },       // measured at 0.03 peak (a fifth of a hit): this is a warning cue, so it is now ~0.08
    lowhp: () => { T('sine', 60, 50, 0.12, 0.35); T('sine', 60, 50, 0.12, 0.3, 0.16); },
    ui: () => T('square', 660, 660, 0.04, 0.08),
    uiok: () => { T('square', 660, 660, 0.05, 0.1); T('square', 990, 990, 0.08, 0.1, 0.05); },
    uiback: () => T('square', 440, 330, 0.07, 0.1),
    unlock: () => { [523, 659, 784, 988, 1175, 1568].forEach((f, i) => { T('triangle', f, f, 0.35, 0.22, i * 0.09); T('sine', f / 2, f / 2, 0.35, 0.12, i * 0.09); }); },
    buy: () => { T('square', 800, 800, 0.05, 0.12); T('square', 1200, 1200, 0.05, 0.12, 0.05); T('square', 1600, 1600, 0.12, 0.12, 0.1); },
    deny: () => { T('square', 150, 110, 0.15, 0.2); },
    gamble: () => { for (let i = 0; i < 6; i++) T('square', 500 + i * 120, 500 + i * 120, 0.05, 0.1, i * 0.06); },
    win: () => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => T('triangle', f, f, 0.3, 0.22, i * 0.12)); },
    shrine: () => { T('sine', 220, 440, 0.6, 0.2); T('sine', 330, 660, 0.6, 0.15, 0.1); T('triangle', 880, 880, 0.5, 0.1, 0.3); },
    curse: () => { T('sawtooth', 200, 100, 0.6, 0.25); T('sawtooth', 213, 98, 0.6, 0.2); },
  };
  A.SFX = SFX;           // exported so the tests can check every sound the code asks for really exists

  // ------------------------------------------------------------------ reactive music
  const scales = [[0, 2, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 8, 11], [0, 1, 3, 5, 7, 8, 10], [0, 2, 3, 5, 6, 8, 10]];
  const M = A.music = {
    on: false, step: 0, next: 0, intensity: 0, target: 0, root: 45, scale: scales[0], timer: null, bpm: 96, boss: false, prog: [0, 5, 3, 4],
    start() { if (!ctx || M.on) return; M.on = true; M.next = ctx.currentTime + 0.1; M.timer = setInterval(M.tick, 40); },
    set(o) {      // {intensity 0..1, floor, boss}
      if (o.intensity !== undefined) M.target = o.intensity;
      if (o.floor !== undefined && o.floor !== M._floor) { M._floor = o.floor; M.root = 38 + ((o.floor * 5) % 7); M.scale = scales[(o.floor >> 1) % scales.length]; M.bpm = 88 + Math.min(40, o.floor * 2); }
      if (o.boss !== undefined) M.boss = o.boss;
    },
    note(i, oct) { const s = M.scale; const d = ((i % 7) + 7) % 7; return M.root + 12 * (oct || 0) + s[d] + 12 * Math.floor(i / 7); },
    hz(n) { return 440 * Math.pow(2, (n - 69) / 12); },
    tick() {
      if (!ctx || ctx.state !== 'running' || A.muted) { if (ctx) M.next = Math.max(M.next, ctx.currentTime); return; }
      while (M.next < ctx.currentTime + 0.18) { M.play(M.step, M.next); M.next += 60 / M.bpm / 2 * (M.boss ? 0.88 : 1); M.step++; }
    },
    play(step, t) {
      M.intensity += (M.target - M.intensity) * 0.04;
      const bar = Math.floor(step / 8) % 4, st = step % 8, ch = M.prog[bar];
      const I = M.intensity, dur = 60 / M.bpm / 2;
      const voice = (type, freq, d, vol, bus) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(musBus); o.start(t); o.stop(t + d + 0.05);
      };
      if (st === 0) {                                  // pad chord
        for (const k of [0, 2, 4]) voice('triangle', M.hz(M.note(ch + k, 1)), dur * 7.5, 0.05 + I * 0.02);
        voice('sine', M.hz(M.note(ch, -1)), dur * 7, 0.16);
      }
      if (st % 2 === 0 && I > 0.15) voice('sawtooth', M.hz(M.note(ch, 0)) , dur * 1.6, 0.025 + I * 0.05);   // bass pulse
      if (I > 0.3 || M.boss) {                                    // arp
        const pat = [0, 2, 4, 2, 5, 4, 2, 7][st];
        if (st % (I > 0.7 ? 1 : 2) === 0) voice('square', M.hz(M.note(ch + pat, 2)), dur * 0.8, 0.012 + I * 0.025);
      }
      if (I > 0.45 && (st === 0 || st === 4)) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.3 * I, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(musBus); o.start(t); o.stop(t + 0.2); }
      if (I > 0.55 && st % 2 === 1) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = ctx.createGain(); g.gain.setValueAtTime(0.05 * I, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); s.connect(f); f.connect(g); g.connect(musBus); s.start(t); s.stop(t + 0.06); }
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

'use strict';
/* Random pack-combination hunt: the matrix tests v1, each update alone and everything; this runs the quick suite against RANDOM SUBSETS,
 * because the promise is that ANY combination of updates is playable.      node test/combos.js [count=24] [seed=1] [parallel=4]
 * A failing subset prints its pack list and first failures — rerun it with  node --expose-gc test/run-tests.js --quick --packs=v2,v5,v9 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ids = fs.readdirSync(path.join(__dirname, '..', 'js')).map(f => (/^pack_(v\d+)\.js$/.exec(f) || [])[1]).filter(Boolean).sort((a, b) => +a.slice(1) - +b.slice(1));
const count = +process.argv[2] || 24, seed = +process.argv[3] || 1, par = +process.argv[4] || 4;
let st = seed * 2654435761 >>> 0; const rnd = () => { st = (st + 0x6D2B79F5) | 0; let t = Math.imul(st ^ (st >>> 15), 1 | st); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const subsets = [], seen = new Set();
while (subsets.length < count) { const k = 2 + Math.floor(rnd() * (ids.length - 2)); const pick = ids.filter(() => rnd() < k / ids.length); if (pick.length < 2 || pick.length === ids.length) continue; const key = pick.join(','); if (seen.has(key)) continue; seen.add(key); subsets.push(pick); }
let next = 0, bad = 0, done = 0; const started = Date.now();
function run() {
  if (next >= subsets.length) return; const sub = subsets[next++], list = sub.join(',');
  const p = spawn('node', ['--expose-gc', 'test/run-tests.js', '--quick', '--packs=' + list], { cwd: path.join(__dirname, '..') }); let out = '';
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => {
    done++; const line = out.split('\n').filter(l => /Assertions passed/.test(l)).pop() || '(no summary)';
    if (code !== 0) { bad++; console.log('FAIL  ' + list + '\n   ' + line.trim() + '\n' + out.split('\n').filter(l => /FAIL|Error|    at /.test(l)).slice(0, 8).map(l => '   ' + l).join('\n')); }
    else console.log('pass  ' + list.padEnd(60) + line.trim().slice(0, 40));
    if (done === subsets.length) { console.log('combos: ' + (subsets.length - bad) + '/' + subsets.length + ' subsets pass  (' + Math.round((Date.now() - started) / 1000) + 's)'); process.exit(bad ? 1 : 0); } else run();
  });
}
for (let i = 0; i < par; i++) run();

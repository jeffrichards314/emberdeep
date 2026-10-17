'use strict';
/* Runs the suite for every edition: parity, v1 alone, each update alone, everything.   node test/matrix.js [--full] */
const { spawnSync } = require('child_process');
const path = require('path');
const full = process.argv.includes('--full');
const ids = ['v2', 'v3', 'v4', 'v5', 'v6'].filter(id => { try { return require('fs').existsSync(path.join(__dirname, '..', 'js', 'pack_' + id + '.js')); } catch (e) { return false; } });
const runs = [['parity', ['test/parity.js', '30']], ['v1 only', ['--expose-gc', 'test/run-tests.js', full ? '' : '--quick', '--packs=none']]];
for (const id of ids) runs.push(['only ' + id, ['--expose-gc', 'test/run-tests.js', full ? '' : '--quick', '--packs=' + id]]);
runs.push(['everything', ['--expose-gc', 'test/run-tests.js', full ? '' : '--quick', '--packs=all']]);
let bad = 0;
for (const [name, args] of runs) {
  const r = spawnSync('node', args.filter(Boolean), { cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = (r.stdout || '') + (r.stderr || ''), line = out.split('\n').filter(l => /Assertions passed|v1 parity/.test(l)).pop() || '(no summary)';
  const good = r.status === 0; if (!good) bad++;
  console.log((good ? 'PASS  ' : 'FAIL  ') + name.padEnd(12) + line.trim());
  if (!good) console.log(out.split('\n').filter(l => /FAIL|MISMATCH|Error|    at /.test(l)).slice(0, 12).join('\n'));
}
process.exit(bad ? 1 : 0);

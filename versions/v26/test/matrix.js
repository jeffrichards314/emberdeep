'use strict';
/* Runs the suite for every edition: parity, v1 alone, each update alone, everything.   node test/matrix.js [--full] */
const { spawnSync } = require('child_process');
const path = require('path');
const full = process.argv.includes('--full');
const ids = require('fs').readdirSync(path.join(__dirname, '..', 'js')).map(f => (/^pack_(v\d+)\.js$/.exec(f) || [])[1]).filter(Boolean).sort((a, b) => +a.slice(1) - +b.slice(1));
const runs = [['parity', ['test/parity.js', '30']], ['render parity', ['test/render-parity.js', '500']], ['v1 only', ['--expose-gc', 'test/run-tests.js', full ? '' : '--quick', '--packs=none']]];
for (const id of ids) runs.push(['only ' + id, ['--expose-gc', 'test/run-tests.js', full ? '' : '--quick', '--packs=' + id]]);
runs.push(['everything', ['--expose-gc', 'test/run-tests.js', full ? '' : '--quick', '--packs=all']]);
let bad = 0;
for (const [name, args] of runs) {
  const r = spawnSync('node', args.filter(Boolean), { cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = (r.stdout || '') + (r.stderr || ''), line = out.split('\n').filter(l => /Assertions passed|v1 parity|render parity/.test(l)).pop() || '(no summary)';
  const good = r.status === 0; if (!good) bad++;
  console.log((good ? 'PASS  ' : 'FAIL  ') + name.padEnd(12) + line.trim());
  if (!good) console.log(out.split('\n').filter(l => /FAIL|MISMATCH|Error|    at /.test(l)).slice(0, 12).join('\n'));
}
process.exit(bad ? 1 : 0);

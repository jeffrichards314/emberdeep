'use strict';
/* Just the touch-control tests (a few seconds):  node test/touch.js [--packs=none|all|v2,v4]
 * The same section also runs inside test/run-tests.js for every edition. */
const { load, fakeCanvas } = require('./harness');
const packArg = process.argv.find(a => a.startsWith('--packs=')); if (packArg) process.env.ED_PACKS = packArg.slice(8);
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL: ' + m); } };
const section = (s) => console.log('== ' + s);
const sandbox = load(), ED = sandbox.ED;
const newGame = () => { const g = ED.createGame(fakeCanvas(), { headless: true }); ED.game = g; return g; };
require('./touch-tests')({ ED, sandbox, ok, section, newGame }).then(() => { console.log('touch: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }, (e) => { console.log(e.stack); process.exit(1); });

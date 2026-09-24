import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { build } = createRequire(import.meta.resolve('vite'))('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const result = await build({ entryPoints: ['src/features/gamification/level-worlds/components/ActivityProgress.tsx'],
  bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], loader: { '.css': 'empty' } });
const output = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, output, output.exports);
const render = (props) => renderToStaticMarkup(React.createElement(output.exports.ActivityProgress, props));
const initial = render({ completed: 0, total: 1, unit: 'action', buildLevel: 2 });
assert.match(initial, /1 action to go/);
assert.match(initial, /Level 2 of 3/);
assert.equal((initial.match(/<progress /g) ?? []).length, 2);
assert.match(render({ completed: 2, total: 3 }), /1 answer to go/);
assert.match(render({ completed: 3, total: 3 }), /Ready to submit/);
assert.match(render({ completed: 3, total: 3, saved: true }), /Activity saved/);
assert.equal((render({ completed: 0, total: 1 }).match(/<progress /g) ?? []).length, 1);
assert.match(render({ completed: 9, total: 2, buildLevel: 9 }), /Level 3 of 3/);
console.log('PASS activity progress: remaining counts, independent build bar, draft/saved distinction and clamping');

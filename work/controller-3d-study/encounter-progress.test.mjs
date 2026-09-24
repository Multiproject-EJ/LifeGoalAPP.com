import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { build } = createRequire(import.meta.resolve('vite'))('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const result = await build({ entryPoints: ['src/features/gamification/level-worlds/components/EncounterActivityProgress.tsx'],
  bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], loader: { '.css': 'empty' } });
const output = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, output, output.exports);
const render = (type, extra = {}, props = {}) => renderToStaticMarkup(React.createElement(output.exports.EncounterActivityProgress, {
  challenge: { type, durationSeconds: 9, tapsRequired: 5, ...extra }, complete: false, secondsLeft: 4, taps: 2, response: '', ...props,
}));
assert.match(render('quiz'), /1 answer to go/);
assert.match(render('focus'), /1 action to go/);
assert.match(render('breathing'), /4 seconds to go/);
assert.match(render('tap'), /3 taps to go/);
assert.match(render('gratitude', {}, { response: '   ' }), /1 answer to go/);
assert.match(render('gratitude', {}, { response: 'A good day' }), /Ready to submit/);
assert.doesNotMatch(render('gratitude', {}, { response: 'A good day' }), /Activity saved/);
for (const type of ['quiz', 'focus', 'breathing', 'tap', 'gratitude']) {
  const html = render(type, {}, { complete: true });
  assert.match(html, /Activity saved/);
  assert.equal((html.match(/<progress /g) ?? []).length, 1, 'Bonus encounters have no invented construction gate');
}
console.log('PASS encounter progress: five challenge types, true remaining units, drafts and saved state');

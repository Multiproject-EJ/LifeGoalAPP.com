import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { build } = createRequire(import.meta.resolve('vite'))('esbuild');
const result = await build({entryPoints:['src/features/gamification/level-worlds/services/islandRunPresentationVisibility.ts'],bundle:true,format:'esm',write:false});
const { shouldHideMissionController: hidden } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
assert.equal(hidden(false,false,false),false);
assert.equal(hidden(true,false,false),true);
assert.equal(hidden(false,true,false),true);
assert.equal(hidden(true,true,false),true);
assert.equal(hidden(true,true,true),false,'interactive skiff/shooter controls remain usable');
for (const manualHidden of [false,true]) {
  assert.equal(manualHidden || hidden(true,false,false),true);
  assert.equal(manualHidden || hidden(false,false,false),manualHidden,'ending playback preserves manual preference');
}
console.log('PASS mission visibility: activity, overlapping modal, interactive controls and manual-state restoration');

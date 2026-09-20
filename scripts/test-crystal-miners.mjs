import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
mkdirSync('work/crystal-miners-tests',{recursive:true});
await build({stdin:{contents:`import {crystalMinersTests} from './src/features/gamification/level-worlds/services/__tests__/crystalMiners.test.ts'; import {islandRunArenaPreferencesTests} from './src/features/gamification/level-worlds/services/__tests__/islandRunArenaPreferences.test.ts'; let failed=0;for(const test of [...crystalMinersTests,...islandRunArenaPreferencesTests]){try{await test.run();console.log('PASS',test.name)}catch(error){failed++;console.error('FAIL',test.name,error)}}if(failed)process.exitCode=1;`,resolveDir:process.cwd(),sourcefile:'crystal-miners-runner.ts'},bundle:true,platform:'node',format:'esm',target:'node22',packages:'external',define:{'import.meta.env':'{}'},outfile:'work/crystal-miners-tests/runner.mjs'});
await import(pathToFileURL(`${process.cwd()}/work/crystal-miners-tests/runner.mjs`).href);

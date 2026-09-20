import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url), {build}=createRequire(require.resolve('vite'))('esbuild');
const dir=mkdtempSync(path.join(tmpdir(),'habitgame-calibration-'));
await build({entryPoints:[process.argv.includes('--roster') ? 'scripts/creature-roster-diagnostic.ts' : process.argv.includes('--motives') ? 'scripts/creature-motivation-diagnostic.ts' : 'scripts/creature-system-calibration.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'calibration.mjs')});
execFileSync(process.execPath,[path.join(dir,'calibration.mjs')],{stdio:'inherit'});

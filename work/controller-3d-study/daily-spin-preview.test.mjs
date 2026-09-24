import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const result=await build({entryPoints:['src/services/dailySpinDevPreview.ts'],bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.DEV':'false'}});
const compiled=result.outputFiles[0].text;
assert.ok(!compiled.includes('supabase'),'Rehearsal has no database dependency');
let enabled=false,writes=0;
globalThis.localStorage={getItem:()=>enabled?'true':'false',setItem:()=>{writes++;}};
const preview=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
assert.throws(()=>preview.previewDailySpin(),/Developer mode/);
enabled=true;
for(let i=0;i<50;i++){const spin=preview.previewDailySpin();assert.equal(spin.spinsRemaining,1);assert.ok(spin.prize&&Array.isArray(spin.awardedRewards));}
assert.equal(writes,0,'Repeated previews do not persist rewards or eligibility');
enabled=false;assert.throws(()=>preview.previewDailySpin(),/Developer mode/);
delete globalThis.localStorage;
console.log('PASS: repeatable developer spins, access recheck and zero persistence');

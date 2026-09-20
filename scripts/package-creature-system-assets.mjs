import fs from 'node:fs';
import path from 'node:path';
const snapshot=JSON.parse(fs.readFileSync('src/features/creature-system/content.snapshot.json','utf8'));
const references=new Set(snapshot.families.map(f=>f.referenceArt));
for(const name of fs.readdirSync('public/assets/creatures/echo-bloom-evolution-v1')) if(/\.png$/.test(name)) references.add(`/assets/creatures/echo-bloom-evolution-v1/${name}`);
for(const name of fs.readdirSync('public/assets/creatures/progression-batch-two-v1')) if(/\.png$/.test(name)) references.add(`/assets/creatures/progression-batch-two-v1/${name}`);
for(const tier of ['common','rare','mystery']) for(let stage=1;stage<=4;stage++) references.add(`/assets/Eggs/Egg_${tier}_lv${stage}.webp`);
for(const directory of ['public/assets/archetype-masks/candidates','public/assets/creatures/candidates/twilight-seed','public/assets/creatures/candidates/bloom-mite','public/assets/creatures/candidates/echo-phoenix','public/assets/creatures/style-studies/bloom-rounded','public/assets/creatures/comparisons/mature-trio-v2','public/assets/creatures/style-studies/rounded-clay-v1','public/assets/creatures/batch-ten-v1','public/assets/creatures/twilight-evolution-v2','public/assets/creatures/preferred-progressions-v1','public/assets/creatures/creature-first-progressions-v2']) {
  for(const name of fs.readdirSync(directory)) if(/\.png$/.test(name)) references.add('/'+path.join(directory,name).replace(/^public\//,''));
}
for(const reference of references) {
  if(!reference.startsWith('/assets/')||reference.includes('..')) throw new Error('Unsafe asset path');
  const target=path.join('dist-creature-system',reference);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join('public',reference),target);
}
console.log(`Packaged ${references.size} reference/candidate/egg assets. This is a review build, not a production release.`);

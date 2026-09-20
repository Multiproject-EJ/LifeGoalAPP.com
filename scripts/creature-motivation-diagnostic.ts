import fs from 'node:fs';
import { withRefinement, buildEvidenceProfile } from '../src/features/creature-system/personality';
import { MOTIVE_QUESTIONS } from '../src/features/creature-system/refinement';
import { REFINED_CREATURE_TARGETS } from '../src/features/creature-system/targets';
import { rankKindred, rankComplements, REFINED_MATCH_MODEL_VERSION } from '../src/features/creature-system/matching';
let seed=9142026;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const kindredCounts=Object.fromEntries(REFINED_CREATURE_TARGETS.map(t=>[t.id,0]));
const complementCounts={...kindredCounts};
let close=0, exactTies=0, topAffinity=0, margin=0;
for(let i=0;i<2000;i++) {
  const answers=Object.fromEntries(MOTIVE_QUESTIONS.map(q=>[q.id,Math.floor(random()*5)+1]));
  const p=withRefinement(buildEvidenceProfile({}),answers), match=rankKindred(p,REFINED_CREATURE_TARGETS);
  if(match.bestId) {
    kindredCounts[match.bestId]++;
    const complement=rankComplements(p,[match.bestId],REFINED_CREATURE_TARGETS).ranked[0];
    if(complement) complementCounts[complement.id]++;
  }
  if(match.status==='close') close++;
  if(match.margin!==null && match.margin<1e-9) exactTies++;
  topAffinity+=match.ranked[0]?.score??0; margin+=match.margin??0;
}
const fixtures=REFINED_CREATURE_TARGETS.map(t=>{
  let changes=0, trials=0;
  for(const q of MOTIVE_QUESTIONS) for(const rating of [1,2,3,4,5]) {
    if(t.profile.refinement!.answers[q.id]===rating) continue;
    trials++;
    const p=withRefinement(t.profile,{...t.profile.refinement!.answers,[q.id]:rating});
    if(rankKindred(p,REFINED_CREATURE_TARGETS).bestId!==t.id) changes++;
  }
  return {id:t.id,leading:t.profile.archetypes.slice().sort((a,b)=>b.score!-a.score!).slice(0,3).map(a=>a.id),selfMatch:rankKindred(t.profile,REFINED_CREATURE_TARGETS).ranked[0].score,singleRatingChanges:trials,winnerChanges:changes};
});
const represented=new Set(fixtures.flatMap(f=>f.leading));
const report={model:REFINED_MATCH_MODEL_VERSION,method:'2000 seeded, uniformly random complete motivation ratings (seed 9142026). Diagnostic stress inputs, not a population, validation, or a comparison with the differently constructed foundation sample.',kindredCounts,complementCounts,close,exactTies,meanAffinity:topAffinity/2000,meanMargin:margin/2000,representedArchetypes:represented.size,unrepresentedArchetypes:MOTIVE_QUESTIONS.filter(q=>!represented.has(q.archetypeId)).map(q=>q.archetypeId),fixtures,releaseReady:false,
  limitations:['Only one direct self-report statement per archetype; question wording and response bias remain untested.', `Six sparse authored targets leave ${32-represented.size} of 32 archetypes unrepresented in this pilot; broader players can receive low affinity and ties.`, 'Author fixtures self-match by construction, not independent psychological evidence.', 'No match-based currency or progression change is enabled.']};
fs.mkdirSync('docs/qa/creature-system',{recursive:true});
fs.writeFileSync('docs/qa/creature-system/motivation-diagnostic-v1.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

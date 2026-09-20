import fs from 'node:fs';
import { buildEvidenceProfile, withRefinement } from '../src/features/creature-system/personality';
import { MOTIVE_QUESTIONS } from '../src/features/creature-system/refinement';
import { REFINED_CREATURE_TARGETS, ROSTER_CREATURE_TARGETS } from '../src/features/creature-system/targets';
import { rankKindred, rankComplements } from '../src/features/creature-system/matching';
import { rosterCoverage } from '../src/features/creature-system/rosterCoverage';
import { FAMILIES } from '../src/features/creature-system/content';
import { MIXED_EXAMPLES } from '../src/features/creature-system/mixedExamples';
let seed=9142026;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const metrics=()=>({close:0,exactTies:0,meanBestAffinity:0,meanMargin:0});
const before=metrics(),after=metrics();
for(let i=0;i<2000;i++) {
  const p=withRefinement(buildEvidenceProfile({}),Object.fromEntries(MOTIVE_QUESTIONS.map(q=>[q.id,Math.floor(random()*5)+1])));
  for(const [targets,stats] of [[REFINED_CREATURE_TARGETS,before],[ROSTER_CREATURE_TARGETS,after]] as const) {
    const match=rankKindred(p,targets);
    if(match.status==='close')stats.close++;
    if(match.margin!==null&&match.margin<1e-9)stats.exactTies++;
    stats.meanBestAffinity+=(match.ranked[0]?.score??0)/2000;
    stats.meanMargin+=(match.margin??0)/2000;
  }
}
const coverage=rosterCoverage();
const examples=MIXED_EXAMPLES.map(example=>{
  const result=rankKindred(example.profile),complements=rankComplements(example.profile,[result.bestId!]);
  const tied=result.ranked.filter(row=>result.ranked[0].score-row.score<1e-9);
  return {id:example.id,story:example.story,leadingMotives:example.profile.archetypes.slice().sort((a,b)=>b.score!-a.score!).slice(0,8).map(a=>a.id),status:result.status,tiedFirst:tied.map(t=>t.id),topFive:result.ranked.slice(0,5).map(({id,score})=>({id,score})),complementAfterIllustrativeFirst:complements.ranked.slice(0,3),baseline:complements.baseline};
});
const report={version:'roster-draft-1',method:'Same 2000 seeded complete uniform rating vectors compared against six versus fifty targets. Only catalogue changed; scoring unchanged. Synthetic stress diagnostic, not player prevalence or psychological validation.',before,after,coverage:{represented:coverage.represented,dominant:coverage.primaryRepresented,duplicateOrderedMixes:coverage.duplicateMixes,sharedMotiveGroups:coverage.sameMotivesDifferentOrder,rows:coverage.rows.map(r=>({id:r.id,dominant:r.dominant.map(f=>f.id),supporting:r.supporting.map(f=>f.id)}))},examples,releaseReady:false};
fs.mkdirSync('docs/qa/creature-system',{recursive:true});
fs.writeFileSync('docs/qa/creature-system/roster-diagnostic-v1.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/qa/creature-system/roster-diagnostic-v1.md',[
  '# Full-roster draft diagnostic','',report.method,'',
  '| Measure | Six-target control | Fifty-target draft |','|---|---:|---:|',
  `| Archetypes represented | 17/32 | ${coverage.represented}/32 |`,
  `| Mean best affinity | ${before.meanBestAffinity.toFixed(2)} | ${after.meanBestAffinity.toFixed(2)} |`,
  `| Close results / 2000 | ${before.close} | ${after.close} |`,
  `| Exact ties / 2000 | ${before.exactTies} | ${after.exactTies} |`,
  '',`Dominant-motivation coverage: ${coverage.primaryRepresented}/32. Duplicate ordered mixes: ${coverage.duplicateMixes.length}. Shared-motive sets in different orders: ${coverage.sameMotivesDifferentOrder.length}.`,
  '', 'More targets guarantee a nondecreasing best score for the same input; that is not evidence of better psychological accuracy. Three-motive targets remain sparse relative to broad players. Ties are real alternatives; alphabetical ordering only stabilizes rendering, not a scientific preference.',
  '', '## Narrative-first mixed examples','',...examples.flatMap(e=>[`### ${e.id}`,'',e.story,'',`Joint first: ${e.tiedFirst.join(', ')}.`,...e.topFive.map(t=>`- ${t.id}: ${t.score.toFixed(2)} affinity`),'']),
  '## Shared-motive groups needing differentiation review','',...coverage.sameMotivesDifferentOrder.map(([key,ids])=>`- ${ids.join(', ')}: ${key}. Do not merge automatically.`),'', '## Family-to-motivation ledger','', '| Family | Status | Ordered mix | Rationale |','|---|---|---|---|',
  ...FAMILIES.map(f=>`| F${String(f.number).padStart(2,'0')} ${f.name} | ${f.mixStatus} | ${f.mix?.join(', ')} | ${f.mixRationale} |`),
  '', '## Remaining gates','', '- Review the 44 new rationale/mix proposals against character identity and emotional expression.', '- Resolve target breadth and response-scale ties before claiming reliable best-fit recommendations.', '- Validate wording and comprehension with players; there is still only one self-report statement per archetype.', '- Complete distinct creature art, canonical persistence and live workflow QA separately. No rewards or saves changed.',
].join('\n')+'\n');
console.log(JSON.stringify({...report,coverage:{represented:coverage.represented,dominant:coverage.primaryRepresented,duplicateOrderedMixes:coverage.duplicateMixes},examples:examples.map(e=>({id:e.id,tiedFirst:e.tiedFirst,topFive:e.topFive}))},null,2));

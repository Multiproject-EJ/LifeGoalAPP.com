import fs from 'node:fs';
import { buildEvidenceProfile } from '../src/features/creature-system/personality';
import { CREATURE_TARGETS } from '../src/features/creature-system/targets';
import { rankKindred, rankComplements } from '../src/features/creature-system/matching';
import { SCENARIO_QUESTION_BANK } from '../src/features/identity/personalityTestDataV2';
import { getFamily } from '../src/features/creature-system/content';
let seed = 9142026;
const random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0) / 4294967296);
const kindredCounts = Object.fromEntries(CREATURE_TARGETS.map(t=>[t.id,0]));
const complementCounts = {...kindredCounts};
let close=0, margin=0, topAffinity=0;
for(let i=0;i<2000;i++) {
  const answers=Object.fromEntries(SCENARIO_QUESTION_BANK.map(q=>[q.id,q.options[Math.floor(random()*q.options.length)].id]));
  const profile=buildEvidenceProfile(answers), result=rankKindred(profile);
  if(result.bestId) {
    kindredCounts[result.bestId]++;
    const complement=rankComplements(profile,[result.bestId]).ranked[0];
    if(complement) complementCounts[complement.id]++;
  }
  if(result.status==='close') close++;
  margin+=result.margin??0;
  topAffinity+=result.ranked[0]?.score??0;
}
const fixtures=CREATURE_TARGETS.map(t=>{
  let changed=0,total=0;
  for(const q of SCENARIO_QUESTION_BANK) for(const o of q.options) {
    if(t.profile.answers[q.id]===o.id) continue;
    total++;
    if(rankKindred(buildEvidenceProfile({...t.profile.answers,[q.id]:o.id})).bestId!==t.id) changed++;
  }
  const ranked=t.profile.archetypes.slice().sort((a,b)=>(b.score??0)-(a.score??0));
  const intended=getFamily(t.id)?.mix??[];
  return {id:t.id,label:t.label,answers:t.profile.answers,leadingArchetypes:ranked.slice(0,5).map(a=>({id:a.id,score:a.score})), intendedArtMix:intended,
    intendedMixInTop5:intended.filter(id=>ranked.slice(0,5).some(a=>a.id===id)), singleAnswerPerturbations:total, changedWinner:changed,
    nearestOther:rankKindred(t.profile).ranked.find(r=>r.id!==t.id)?.id};
});
const report={version:'kindred-breadth-experimental-2',method:'2000 deterministic uniformly random complete V2 answer sequences, seed 9142026. Synthetic diagnostic, not representative player data or psychometric validation.',total:2000,kindredCounts,complementCounts,close,meanMargin:margin/2000,meanTopAffinity:topAffinity/2000,fixtures,
  releaseReady:false, remaining:['Resolve overlap between intended visual mixes and measured target archetypes.', 'Author and compare remaining 44 targets.', 'Review questionnaire construct coverage before adding new questions.', 'Real-player comprehension and stability testing.']};
fs.mkdirSync('docs/qa/creature-system',{recursive:true});
fs.writeFileSync('docs/qa/creature-system/calibration-v2.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/qa/creature-system/calibration-v2.md',[
  '# Creature matching calibration v2','',report.method,'',
  `Close outcomes: ${close}/2000. Mean margin: ${report.meanMargin.toFixed(2)}. Mean top affinity: ${report.meanTopAffinity.toFixed(2)}.`,
  '', '| Family | Kindred selections | Complement selections |','|---|---:|---:|',
  ...CREATURE_TARGETS.map(t=>`| ${getFamily(t.id)?.name} | ${kindredCounts[t.id]} | ${complementCounts[t.id]} |`),
  '', '## Coherent target checks','', '| Target | Actual leading lenses | Intended art mix in top 5 | Changed winner after one answer |','|---|---|---|---:|',
  ...fixtures.map(f=>`| ${getFamily(f.id)?.name} | ${f.leadingArchetypes.map(a=>a.id).join(', ')} | ${f.intendedMixInTop5.join(', ')||'None'} | ${f.changedWinner}/${f.singleAnswerPerturbations} |`),
  '', 'All six self-match at 100; this is a correctness check, not proof of psychological validity. The targets use actual valid answer sequences and shared measured dimensions. Fixed-budget normalization prevents purchasing additional coverage through globally inflated archetype scores.',
  '', 'The retained archetype definitions are strongly overlapping. A creature visual mix must not be presented as calibrated while its computed leading lenses contradict that mix. No release claim is made.',
  '', '## Before / after','', '- Before: unmeasured trait placeholders participated in matching. Now: only common observed dimensions participate.',
  '- Before: arbitrary independent 32-score targets. Now: six reachable scenario answer prototypes.',
  '- Before: all-high targets could dominate a mean-max coverage score. Now: every profile has one equal representation budget.',
  '- Unchanged: 32 stable archetypes, questionnaire answers, ownership, rewards, eggs and live single-companion effect.',
  '', '## Release gates', '', ...report.remaining.map(x=>'- '+x),
].join('\n')+'\n');
console.log(JSON.stringify({...report,fixtures:undefined},null,2));

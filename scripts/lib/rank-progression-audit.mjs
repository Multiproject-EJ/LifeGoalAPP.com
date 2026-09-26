import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');

/** Execute only the pure exported formula from source, never the service's DB imports. */
function loadActivityXpCurve() {
  const file = 'src/services/gamification.ts';
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'calculateXPForLevel');
  if (!declaration) throw new Error('Activity XP formula not found; audit must be updated');
  const formulaSource = declaration.getText(source);
  const sandbox = { exports: {} };
  runInNewContext(ts.transpileModule(formulaSource, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox,{timeout:1000});
  return { calculate: sandbox.exports.calculateXPForLevel, formulaSource };
}

export function writeRankProgressionAudit(outDir) {
  const journey = require(path.join(outDir,'features/gamification/level-worlds/services/combinedJourneyLevel.js'));
  const { buildJourneyLevelInputFromOverlay } = require(path.join(outDir,'features/gamification/level-worlds/services/dualTrackOverlayAdapter.js'));
  const { EXPANDED_RANK_CANDIDATES } = require(path.join(outDir,'features/rank/rankExpansion.js'));
  const activity = loadActivityXpCurve();
  const arrivals = [1,2,10,20,38,39,40,41,80,120].map(island=>{
    const result=journey.deriveCombinedJourneyLevel(buildJourneyLevelInputFromOverlay({islandNumber:island}));
    return {island,xp:result.xp,level:result.level};
  });
  const rewardReset=[10,0].map(rewardBarProgress=>journey.deriveCombinedJourneyLevel(buildJourneyLevelInputFromOverlay({islandNumber:38,rewardBarProgress,rewardBarThreshold:10})));
  const fullyCompleted120=journey.deriveCombinedJourneyLevel({islandsCompleted:120});
  const afterCycleWrap=journey.deriveCombinedJourneyLevel(buildJourneyLevelInputFromOverlay({
    islandJourneyProgress:{currentIslandNumber:1,cycleIndex:1,completion:{complete:false,percent:0}},
  }));
  const report={
    sourceRevision:'1cf96aec74cbb1bcbc59ef2b304c5a078a2fd82a',
    generatedAt:new Date().toISOString(),
    assumptions:'Local progression-consistency implementation atop the source revision. Island-only examples; no completed goals or habits, zero current island completion on arrival. These are XP calculations, not time-to-rank or measured player outcomes.',
    arrivals, fullyCompleted120,
    level40:{journeyXp:journey.cumulativeXpForLevel(40),activityXp:activity.calculate(40),activityFormulaSource:activity.formulaSource},
    rewardReset:rewardReset.map(s=>({xp:s.xp,level:s.level})),
    cycleWrap:{adapterAcceptsCycleIndex:true,before:{xp:fullyCompleted120.xp,level:fullyCompleted120.level},after:{xp:afterCycleWrap.xp,level:afterCycleWrap.level}},
    ranks:EXPANDED_RANK_CANDIDATES.map(r=>({id:r.ordinal,key:r.key,title:r.title,xp:r.minJourneyXp,level:r.journeyLevelAtThreshold,ageYears:r.minServiceYears??0,status:r.thresholdStatus})),
    implementationStatus:{rank36RuntimeActive:false,portalRuntimeActive:false,pairedProductionAssets:1},
  };
  const dir='docs/investigations/rank-portal-20260926';
  mkdirSync(dir,{recursive:true});
  // Keep the original baseline audit intact for before/after comparison.
  writeFileSync(`${dir}/progression-consistency.json`,JSON.stringify(report,null,2)+'\n');
  const md=[
    '# Executable progression consistency checkpoint',
    '',`Source main: \`${report.sourceRevision}\`. Generated: ${report.generatedAt}.`,
    '',report.assumptions,
    '', '## Three different progress measures',
    '', `- Island 40 arrival: ${arrivals.find(r=>r.island===40).xp} Journey XP / Journey level ${arrivals.find(r=>r.island===40).level}.`,
    `- Journey level 40: ${report.level40.journeyXp} Journey XP. This drives menu rank and the combined ladder.`,
    `- Activity player level 40: ${report.level40.activityXp} activity XP under the CURRENT CODE formula. This separate total feeds useGamification and dice regeneration.`,
    '- The canonical gameplay document instead specifies 150 × (L−1) × L and logarithmic two-hour regeneration. Runtime uses floor(L^1.5 × 1000) and discrete regen bands. This is existing code/contract drift; neither economy is changed by this slice.',
    '', '| Arriving at island | Journey XP | Journey level |','| ---: | ---: | ---: |',
    ...arrivals.map(r=>`| ${r.island} | ${r.xp} | ${r.level} |`),
    '', '## Fixed locally / remaining integration limits',
    '', `1. At Island 38, a full reward bar gives ${rewardReset[0].xp} XP / level ${rewardReset[0].level}; resetting the same bar yields ${rewardReset[1].xp} XP / level ${rewardReset[1].level}. Only canonical island completion contributes progress XP now.`,
    `2. Island 120 completion and the next cycle's Island 1 both retain ${afterCycleWrap.xp} XP / level ${afterCycleWrap.level}. Completion is credited before Travel, with no double credit afterward.`,
    '3. An owner-scoped numeric high-water checkpoint preserves previously recorded XP across deleted/absent real-life items and reloads. It cannot reconstruct historical XP never saved. It is not an event ledger: later milestones first catch up to the retained total.',
    '4. App rank and progress spine share canonical inputs and retained XP. Profile/league writes use atomic lower-or-equal filters, preventing this client from lowering saved scores. Older deployed clients remain capable of regression until a separate server-side policy is implemented. Mock-tested only; no remote DB test or change. Reward claims explicitly ignore the client checkpoint, remain feature-disabled and RPC-quarantined, and still require server eligibility work.',
    '5. Old acknowledged rank ID 12 means Sky Marshal; expanded ID 12 means Navigator III. A versioned acknowledgement migration is mandatory.',
    '', '## Candidate 36-rank requirements',
    '', 'Stage I keeps existing XP/age anchors. II/III subdivide the next family band in thirds. This preserves old families but does NOT solve overall pacing. The two final thresholds deliberately remain undecided; no invisible grind added.',
    '', '| # | Rank | Journey XP | Registered years | Status |','| ---: | --- | ---: | ---: | --- |',
    ...report.ranks.map(r=>`| ${r.id} | ${r.title} | ${r.xp??'TBD'} | ${r.ageYears} | ${r.status} |`),
    '', '## Island 40 portal',
    '', 'User clarified that the portal unlocks the full app / Today, habits and goals, not primarily external services. Existing regular players are gated too; verified developer accounts bypass. Preserve all saved data. Paid Early Access bypasses access only, never island/rank progression. Account/privacy/support stay reachable. Ordinary launch is game-first; earned portal/dev/paid launch is Today.',
    '', 'Current implementation is a tested policy and story brief, not active route gating, purchase provisioning, AI processing or a shipped ceremony. Canonical ownership, entitlement verification, route integration, privacy consent and real runtime/browser tests remain.',
    '', 'Reproduce: `node scripts/run-rank-tests.mjs --audit`.',
  ].join('\n');
  writeFileSync(`${dir}/progression-consistency.md`,md+'\n');
  console.log(`progression audit written to ${dir}; Island 40 = ${arrivals.find(r=>r.island===40).level}, Journey Lv40 = ${report.level40.journeyXp} XP, activity Lv40 = ${report.level40.activityXp} XP`);
}

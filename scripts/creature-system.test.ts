import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceProfile, relativeMix, withRefinement } from '../src/features/creature-system/personality';
import { CREATURE_TARGETS, REFINED_CREATURE_TARGETS, REFINED_TARGET_MIXES, answersFromChoices } from '../src/features/creature-system/targets';
import { MOTIVE_QUESTIONS, scoreRefinement, authorMotiveFixture } from '../src/features/creature-system/refinement';
import { rankKindred, rankComplements, emptyTeam, changeTeam, validateTeam, proposeLegacyTeam } from '../src/features/creature-system/matching';
import { initialLabState, reduceLab } from '../src/features/creature-system/labStore';
import { FAMILIES, MASKS, MASK_FACE_BRIEFS, contentReadiness } from '../src/features/creature-system/content';
import { previewCreatureSystemMigration } from '../src/features/creature-system/migrationPreview';
import { candidateFormArt } from '../src/features/creature-system/artCandidates';
import { ROSTER_CREATURE_TARGETS } from '../src/features/creature-system/targets';
import { rosterCoverage } from '../src/features/creature-system/rosterCoverage';
import { MIXED_EXAMPLES } from '../src/features/creature-system/mixedExamples';
import { matchStatistics,sortMatchRows } from '../src/features/creature-system/matchStatistics';
import { VISUAL_IDENTITIES,ART_PRODUCTION_BATCHES,BODY_PLAN_POLICY,artProductionStatus } from '../src/features/creature-system/visualIdentity';
import {hasStudyModel,BLOOM_STUDY_POSTER} from '../src/features/creature-system/studyEdition';
import {CREATURE_BATCH,TWILIGHT_EVOLUTION} from '../src/features/creature-system/creatureBatch';
import {EVOLUTION_STUDIES} from '../src/features/creature-system/evolutionStudies';
import {existsSync} from 'node:fs';

test('ten distinct new families have separate cinematic and clay assets without claiming models',()=>{
  assert.equal(CREATURE_BATCH.length,10);
  assert.equal(new Set(CREATURE_BATCH.map(entry=>entry.familyId)).size,10);
  const creatureFirstSupersedes=new Set(['common-fern-fox','mythic-nightbloom-drake','mythic-aurora-maned-cat','mythic-cosmos-songbird']);
  for(const entry of CREATURE_BATCH){
    assert.ok(FAMILIES.some(f=>f.id===entry.familyId&&f.forms.some(form=>form.ordinal===entry.form)));
    assert.notEqual(entry.card,entry.clay);
    assert.ok(existsSync('public'+entry.card));assert.ok(existsSync('public'+entry.clay));
    if(creatureFirstSupersedes.has(entry.familyId))assert.ok(candidateFormArt(entry.familyId,entry.form)?.includes('creature-first-progressions-v2'));
    else assert.equal(candidateFormArt(entry.familyId,entry.form),entry.card);
    assert.equal(hasStudyModel(entry.familyId,entry.form),false);
  }
  assert.equal(contentReadiness().approvedForms,0);
});
test('Twilight has every planned form in both interpretations with one stable family ID',()=>{
  assert.deepEqual(TWILIGHT_EVOLUTION.map(e=>e.form),FAMILIES.find(f=>f.id==='common-twilight-seed')!.forms.map(f=>f.ordinal));
  assert.equal(new Set(TWILIGHT_EVOLUTION.map(e=>e.familyId)).size,1);
  for(const e of TWILIGHT_EVOLUTION){assert.ok(existsSync('public'+e.card));assert.ok(existsSync('public'+e.clay));assert.equal(candidateFormArt(e.familyId,e.form),e.card);}
  assert.equal(new Set(TWILIGHT_EVOLUTION.flatMap(e=>[e.card,e.clay])).size,6);
});

test('evolution image studies cover existing forms without inventing levels or approvals',()=>{
  assert.equal(EVOLUTION_STUDIES.length,11);
  const assets:string[]=[];
  for(const line of EVOLUTION_STUDIES){
    const family=FAMILIES.find(f=>f.id===line.familyId)!;
    assert.deepEqual(line.forms.map(f=>f.form),family.forms.map(f=>f.ordinal));
    for(const form of line.forms){
      assert.equal(candidateFormArt(line.familyId,form.form),form.card);
      for(const asset of [form.card,form.clay]){assert.ok(existsSync('public'+asset));assets.push(asset);}
      assert.equal(family.forms.find(f=>f.ordinal===form.form)!.productionAsset,null);
    }
  }
  assert.equal(new Set(assets).size,58);
  assert.equal(FAMILIES.find(f=>f.id==='common-bloom-mite')!.forms.length,2);
  assert.equal(candidateFormArt('common-bloom-mite',3),null);
});

test('3D study is explicit and family/form specific, never a generic roster fallback',()=>{
  assert.ok(hasStudyModel('common-bloom-mite',2));
  for(const family of FAMILIES)for(const form of family.forms)assert.equal(hasStudyModel(family.id,form.ordinal),family.id==='common-bloom-mite'&&form.ordinal===2);
  assert.ok(BLOOM_STUDY_POSTER.includes('/style-studies/'));
  assert.notEqual(candidateFormArt('common-bloom-mite',2),BLOOM_STUDY_POSTER);
  assert.equal(artProductionStatus().approvedForms,0);
});

test('motivation questions cover exactly the 32 stable archetypes, eight per suit', () => {
  assert.equal(MOTIVE_QUESTIONS.length, 32);
  assert.deepEqual(MOTIVE_QUESTIONS.map(q=>q.archetypeId).sort(), MASKS.map(m=>m.id).sort());
  assert.equal(new Set(MOTIVE_QUESTIONS.map(q=>q.statement)).size,32);
  assert.ok(MOTIVE_QUESTIONS.every(q=>q.statement?.length>30));
  for(const suit of ['power','heart','mind','spirit']) assert.equal(MOTIVE_QUESTIONS.filter(q=>q.suit===suit).length,8);
});
test('missing and malformed motive ratings never become low scores or recommendations', () => {
  for(const invalid of [undefined, null, '5', 0, 6, 1.5, NaN, Infinity, true]) {
    const evidence=scoreRefinement({[MOTIVE_QUESTIONS[0].id]:invalid,unknown:5});
    assert.equal(evidence.answeredCount,0);
    assert.ok(evidence.archetypes.every(a=>a.score===null));
  }
  const answers={...REFINED_CREATURE_TARGETS[0].profile.refinement!.answers};
  delete answers[MOTIVE_QUESTIONS[0].id];
  const partial=withRefinement(CREATURE_TARGETS[0].profile,answers);
  assert.equal(partial.refinement!.answeredCount,31);
  assert.equal(rankKindred(partial).status,'needs-refinement');
  assert.equal(rankComplements(partial,[]).baseline,null);
});
test('flat motive ratings retain answers without inventing a winning archetype', () => {
  for(const value of [1,3,5]) {
    const p=withRefinement(CREATURE_TARGETS[0].profile,Object.fromEntries(MOTIVE_QUESTIONS.map(q=>[q.id,value])));
    assert.equal(p.refinement!.status,'undifferentiated');
    assert.equal(rankKindred(p).bestId,null);
    assert.equal(rankComplements(p,[]).baseline,null);
  }
});
test('refined author fixtures encode the intended ordered art mix without changing foundation answers', () => {
  for(const t of REFINED_CREATURE_TARGETS) {
    assert.deepEqual(t.profile.answers,CREATURE_TARGETS.find(base=>base.id===t.id)!.profile.answers);
    const leading=t.profile.archetypes.slice().sort((a,b)=>b.score!-a.score!).slice(0,3).map(a=>a.id);
    assert.deepEqual(leading,REFINED_TARGET_MIXES[t.id]);
    assert.deepEqual(leading,getFamilyMix(t.id));
    assert.equal(rankKindred(t.profile).bestId,t.id);
    assert.ok(Math.abs(rankKindred(t.profile).ranked[0].score-100)<1e-9);
  }
  assert.throws(()=>authorMotiveFixture(['dreamer','dreamer','creator']));
  assert.throws(()=>authorMotiveFixture(['invalid','dreamer','creator']));
});
function getFamilyMix(id:string) { return FAMILIES.find(f=>f.id===id)!.mix; }

test('collection default is owned-first alphabetical; ranking and sorting are read-only', () => {
  const state=initialLabState(),before=JSON.stringify(state),profile=REFINED_CREATURE_TARGETS[0].profile;
  const stats=matchStatistics(profile,state.owned,state.team),originalOrder=stats.rows.map(row=>row.family.id);
  const sorted=sortMatchRows(stats.rows,'owned-name');
  assert.deepEqual(sorted.slice(0,3).map(row=>row.family.name),['Bloom Mite','Celest Pup','Twilight Seed']);
  assert.ok(sorted.slice(3).every(row=>!row.owned));
  const alpha=sortMatchRows(stats.rows,'name');
  assert.equal(alpha[0].family.name,'Astral Titanet');
  assert.equal(sortMatchRows(stats.rows,'affinity')[0].family.id,'common-twilight-seed');
  assert.equal(sortMatchRows(stats.rows,'rarity')[0].family.rarity,'mythic');
  assert.deepEqual(stats.rows.map(row=>row.family.id),originalOrder);
  assert.equal(JSON.stringify(state),before);
});
test('statistics distinguish unavailable from zero and keep catalogue ranks stable', () => {
  const state=initialLabState(),empty=matchStatistics(withRefinement(buildEvidenceProfile({}),{}),state.owned,state.team);
  assert.equal(empty.scored,0);assert.equal(empty.best.length,0);assert.equal(empty.bestOwned.length,0);
  assert.ok(empty.rows.every(row=>row.affinity===null&&row.rank===null&&row.complement===null));
  const stats=matchStatistics(REFINED_CREATURE_TARGETS[0].profile,state.owned,state.team);
  assert.equal(stats.scored,50);assert.equal(stats.ownedScored,3);
  const zero=stats.rows.find(row=>row.affinity===0)!;assert.ok(zero);assert.ok(zero.rank!==null);
  for(const row of stats.rows) for(const other of stats.rows) {
    if(row.affinity!.toFixed(1)===other.affinity!.toFixed(1))assert.equal(row.rank,other.rank);
  }
  const unscored={...stats.rows[0],affinity:null,complement:null};
  assert.equal(sortMatchRows([unscored,zero],'affinity')[1],unscored);
  const emptyOwned=matchStatistics(REFINED_CREATURE_TARGETS[0].profile,{},state.team);
  assert.equal(emptyOwned.bestOwned.length,0);
});
test('statistics measure Complement after Kindred and Favourite and exclude those anchors', () => {
  const state=initialLabState(),team={kindred:'common-twilight-seed',complement:null,favourite:'mythic-celest-pup'};
  const p=REFINED_CREATURE_TARGETS[0].profile,stats=matchStatistics(p,state.owned,team);
  for(const id of [team.kindred,team.favourite]) {
    const row=stats.rows.find(row=>row.family.id===id)!;assert.equal(row.anchor,true);assert.equal(row.complement,null);
  }
  const top=sortMatchRows(stats.rows,'complement')[0];
  const direct=rankComplements(p,[team.kindred,team.favourite]);
  assert.ok(Math.abs(top.complement!-direct.ranked[0].score)<0.051);
  assert.equal(stats.complementBaseline,direct.baseline);
});
test('visual production briefs cover 50 distinct reservations without approving candidate art', () => {
  assert.deepEqual(BODY_PLAN_POLICY,{totalFamilies:50,creatureBodiedMinimum:40,abstractExceptionMaximum:10});
  assert.equal(VISUAL_IDENTITIES.length,50);
  const queued=ART_PRODUCTION_BATCHES.flatMap(batch=>batch.families.map(f=>f.id));
  assert.equal(queued.length,50);assert.equal(new Set(queued).size,50);
  assert.equal(new Set(VISUAL_IDENTITIES.map(b=>b.silhouette)).size,50);
  assert.equal(new Set(VISUAL_IDENTITIES.map(b=>b.matureAttention)).size,50);
  for(const brief of VISUAL_IDENTITIES) {
    assert.equal(brief.palette.length,3);assert.ok(brief.palette.every(color=>/^#[0-9a-f]{6}$/i.test(color)));
    assert.equal(brief.status,'draft');assert.ok(brief.matureRule.includes('Forms 2+'));
  }
  const status=artProductionStatus();
  assert.equal(status.candidateForms,33);assert.equal(status.matureFamilies,13);assert.equal(status.firstForms,12);assert.equal(status.approvedForms,0);
  assert.ok(candidateFormArt('common-bloom-mite',2)?.includes('echo-bloom-evolution-v1/bloom-2-card'));
  assert.ok(candidateFormArt('mythic-echo-phoenix',2)?.includes('echo-bloom-evolution-v1/echo-2-card'));
});
test('refined affinity is symmetric and bounded; direct and inferred models cannot mix', () => {
  for(const a of REFINED_CREATURE_TARGETS) for(const b of REFINED_CREATURE_TARGETS) {
    const score=rankKindred(a.profile).ranked.find(r=>r.id===b.id)!.score;
    assert.ok(score>=-1e-9 && score<=100+1e-9);
    assert.ok(Math.abs(score-rankKindred(b.profile).ranked.find(r=>r.id===a.id)!.score)<1e-9);
  }
  assert.equal(rankKindred(REFINED_CREATURE_TARGETS[0].profile,CREATURE_TARGETS).bestId,null);
  assert.equal(rankKindred(CREATURE_TARGETS[0].profile,REFINED_CREATURE_TARGETS).bestId,null);
  assert.equal(rankComplements(REFINED_CREATURE_TARGETS[0].profile,[],CREATURE_TARGETS).baseline,null);
});
test('editing motives changes matching, while complement remains marginal to the selected team', () => {
  const a=REFINED_CREATURE_TARGETS[0], b=REFINED_CREATURE_TARGETS[1];
  const edited=withRefinement(a.profile,b.profile.refinement!.answers);
  assert.equal(rankKindred(edited).bestId,b.id);
  assert.deepEqual(edited.answers,a.profile.answers);
  const one=withRefinement(a.profile,{...a.profile.refinement!.answers,motive_dreamer:4});
  assert.ok(rankKindred(one).ranked.find(r=>r.id===a.id)!.score<100);
  const first=rankComplements(a.profile,[a.id]);
  assert.ok(Math.abs(first.baseline!-25)<1e-9);
  const second=rankComplements(a.profile,[a.id,first.ranked[0].id]);
  assert.ok(Math.abs(second.baseline!-first.ranked[0].after)<1e-9);
  for(const row of second.ranked) assert.ok(row.score<=first.ranked.find(r=>r.id===row.id)!.score+1e-9);
});
test('an unsupported motivation is a catalogue gap, never a zero-affinity recommendation', () => {
  const answers=Object.fromEntries(MOTIVE_QUESTIONS.map(q=>[q.id,q.archetypeId==='analyst'?5:1]));
  const p=withRefinement(buildEvidenceProfile({}),answers);
  assert.equal(p.refinement!.status,'ready');
  assert.equal(rankKindred(p,REFINED_CREATURE_TARGETS).status,'no-target-overlap');
  assert.equal(rankKindred(p,REFINED_CREATURE_TARGETS).bestId,null);
});

test('full roster has 50 valid distinct ordered mixes covering all 32 archetypes', () => {
  assert.equal(ROSTER_CREATURE_TARGETS.length,50);
  assert.equal(rosterCoverage().represented,32);
  assert.deepEqual(rosterCoverage().duplicateMixes,[]);
  for(const family of FAMILIES) {
    assert.equal(family.mix?.length,3);
    assert.equal(new Set(family.mix).size,3);
    assert.ok(family.mix!.every(id=>MASKS.some(m=>m.id===id)));
    assert.ok(family.mixRationale.length>50);
  }
  assert.equal(FAMILIES.filter(f=>f.mixStatus==='draft').length,44);
});
test('roster targets preserve identity and do not fabricate foundation evidence', () => {
  for(const target of ROSTER_CREATURE_TARGETS) {
    assert.equal(target.profile.answeredCount,0);
    assert.equal(rankKindred(target.profile).bestId,target.id);
    assert.ok(Math.abs(rankKindred(target.profile).ranked[0].score-100)<1e-9);
  }
});
test('every single-motive profile has a positive roster overlap, including former gaps', () => {
  for(const mask of MASKS) {
    const p=withRefinement(buildEvidenceProfile({}),Object.fromEntries(MOTIVE_QUESTIONS.map(q=>[q.id,q.archetypeId===mask.id?5:1])));
    const match=rankKindred(p);
    assert.ok(match.bestId);
    assert.ok(match.ranked[0].score>0);
  }
});
test('mixed examples retain full evidence, stable ordering and marginal complement accounting', () => {
  for(const example of MIXED_EXAMPLES) {
    const p=example.profile, result=rankKindred(p);
    assert.equal(p.refinement!.answeredCount,32);
    assert.equal(p.answeredCount,0);
    assert.ok(result.bestId);
    assert.deepEqual(result,rankKindred(p,[...ROSTER_CREATURE_TARGETS].reverse()));
    const additions=rankComplements(p,[result.bestId!]);
    const chosen=additions.ranked[0];
    assert.ok(chosen.score>0);
    assert.ok(!additions.ranked.some(row=>row.id===result.bestId));
    assert.ok(Math.abs(rankComplements(p,[result.bestId!,chosen.id]).baseline!-chosen.after)<1e-9);
    assert.ok(chosen.after<=100);
    assert.ok(result.ranked[0].score<100,'Mixed example must not be a disguised self-match');
  }
});

test('empty, malformed and partial answers never recommend a confident neutral creature', () => {
  for (const answers of [{}, { nope: 'a' }, { v2_plan_01: 'wrong' }, { v2_plan_01: 'a' }]) {
    const p = buildEvidenceProfile(answers);
    assert.equal(rankKindred(p).bestId, null);
    assert.equal(rankComplements(p, []).baseline, null);
  }
  assert.equal(buildEvidenceProfile({}).archetypes.every(a => a.score === null), true);
});
test('six prototypes are reachable through the unchanged 20-question bank', () => {
  for (const t of CREATURE_TARGETS) {
    assert.equal(t.profile.answeredCount, 20);
    assert.equal(t.profile.status, 'usable');
    assert.equal(rankKindred(t.profile).bestId, t.id);
    assert.ok(Math.abs(rankKindred(t.profile).ranked[0].score - 100) < 1e-9);
    assert.deepEqual(buildEvidenceProfile(t.profile.answers), t.profile);
  }
});
test('unmeasured emotionality and honesty-humility are excluded, not neutral evidence', () => {
  for (const t of CREATURE_TARGETS) {
    assert.equal(t.profile.samples.emotionality, undefined);
    assert.equal(t.profile.samples.honesty_humility, undefined);
    const changed = { ...t.profile, values: { ...t.profile.values, emotionality: 100, honesty_humility: 0 } };
    assert.deepEqual(rankKindred(t.profile), rankKindred(changed));
  }
});
test('each representation has exactly one shared budget', () => {
  for (const t of CREATURE_TARGETS) assert.ok(Math.abs(Object.values(relativeMix(t.profile.archetypes)).reduce((a,b) => a+b, 0) - 1) < 1e-9);
});
test('affinity is symmetric, bounded and explanation reconstructs the score', () => {
  for (const a of CREATURE_TARGETS) for (const b of CREATURE_TARGETS) {
    const forward = rankKindred(a.profile, [b]).ranked[0];
    const reverse = rankKindred(b.profile, [a]).ranked[0];
    assert.ok(Math.abs(forward.score - reverse.score) < 1e-9);
    assert.ok(forward.score >= 0 && forward.score <= 100);
    assert.ok(Math.abs(forward.score - 100 * (1 - forward.breakdown.reduce((s,x) => s+x.distance,0)/2)) < 1e-9);
  }
});
test('ties are explicit and independent of catalogue order', () => {
  const p = CREATURE_TARGETS[0].profile;
  const twins = [{ id:'z', profile:p }, { id:'a', profile:p }];
  assert.equal(rankKindred(p, twins).status, 'close');
  assert.equal(rankKindred(p, twins).bestId, 'a');
  assert.deepEqual(rankKindred(p, twins), rankKindred(p, [...twins].reverse()));
});
test('complement adds marginal breadth, excludes existing members and has diminishing returns', () => {
  const p = CREATURE_TARGETS[0].profile;
  const first = rankComplements(p, [CREATURE_TARGETS[0].id]);
  const best = first.ranked[0];
  const next = rankComplements(p, [CREATURE_TARGETS[0].id, best.id]);
  assert.ok(Math.abs(next.baseline! - best.after) < 1e-9);
  assert.ok(!next.ranked.some(r => r.id === best.id));
  for (const candidate of next.ranked) {
    assert.ok(candidate.score <= first.ranked.find(r => r.id === candidate.id)!.score + 1e-9);
    assert.ok(Math.abs(candidate.score - candidate.contributions.reduce((s,c) => s+c.gain,0)) < 1e-9);
    assert.ok(candidate.after <= 100);
  }
  assert.equal(rankComplements(p, ['unknown']).baseline, null);
  assert.equal(rankComplements(p, CREATURE_TARGETS.slice(0,3).map(t => t.id)).ranked.length, 0);
  assert.equal(rankComplements(p, CREATURE_TARGETS.slice(0,4).map(t => t.id)).baseline, null);
});
test('team roles require owned distinct families; favourite is never auto-replaced', () => {
  const ids = CREATURE_TARGETS.map(t => t.id);
  const original = changeTeam(emptyTeam(), 'favourite', ids[4], ids);
  assert.throws(() => changeTeam(original, 'kindred', ids[4], ids));
  assert.throws(() => changeTeam(original, 'complement', 'unowned', ids));
  rankKindred(CREATURE_TARGETS[2].profile);
  assert.equal(original.favourite, ids[4]);
  assert.deepEqual(validateTeam(emptyTeam(), []), []);
});
test('legacy migration proposal retains owned unknown IDs and quarantines stale pointers', () => {
  const result = proposeLegacyTeam('retired-family', ['retired-family']);
  assert.equal(result.team.favourite, 'retired-family');
  assert.equal(result.gameplayEffect, 'legacy-single-companion-unchanged');
  const stale = proposeLegacyTeam('not-owned', []);
  assert.equal(stale.team.favourite, null);
  assert.equal(stale.legacyActiveCompanionId, 'not-owned');
  assert.equal(stale.requiresReview, true);
});
test('all three egg tiers collect exactly once, including duplicate and retry after serialization', () => {
  for (const egg of initialLabState().eggs) {
    const original = initialLabState();
    const result = reduceLab(original, { type:'collect', eggId:egg.id, now:1 });
    assert.equal(result.owned[egg.familyId].copies, (original.owned[egg.familyId]?.copies ?? 0)+1);
    assert.equal(original.eggs.find(e=>e.id===egg.id)!.status, 'ready');
    const restored = JSON.parse(JSON.stringify(result));
    assert.deepEqual(reduceLab(restored, { type:'collect', eggId:egg.id, now:2 }), result);
    assert.deepEqual(reduceLab(restored, { type:'sell', eggId:egg.id, choice:'dice', now:2 }), result);
  }
});
test('sell uses canonical values, cannot collect afterwards, and leaves ownership intact', () => {
  const original = initialLabState();
  const result = reduceLab(original, { type:'sell', eggId:'fixture-mythic', choice:'dice', now:1 });
  assert.equal(result.eggs[2].reward?.amount, 50);
  assert.deepEqual(result.owned, original.owned);
  assert.strictEqual(reduceLab(result, { type:'collect', eggId:'fixture-mythic', now:2 }), result);
});
test('incubating and mismatched-tier eggs cannot settle', () => {
  const original = initialLabState();
  original.eggs[0].readyAt = 100;
  original.eggs[0].status = 'incubating';
  assert.throws(() => reduceLab(original, { type:'collect', eggId:'fixture-common', now:1 }));
  original.eggs[0].tier = 'mythic';
  assert.throws(() => reduceLab(original, { type:'collect', eggId:'fixture-common', now:101 }));
});
test('all 50 families and 130 forms retain unique stable lineage; all masks have distinct briefs', () => {
  assert.equal(FAMILIES.length, 50);
  assert.equal(MASKS.length, 32);
  assert.equal(new Set(Object.values(MASK_FACE_BRIEFS)).size, 32);
  const ids = new Set();
  for (const f of FAMILIES) f.forms.forEach((form, i) => {
    assert.equal(form.familyId, f.id);
    assert.equal(form.ordinal, i+1);
    assert.equal(form.previousFormId, i ? f.forms[i-1].id : null);
    assert.ok(!ids.has(form.id)); ids.add(form.id);
  });
  assert.equal(ids.size, 130);
  assert.equal(contentReadiness().approvedForms, 0);
  assert.throws(() => answersFromChoices('a'));
});

test('migration dry run preserves all unknown fields, egg timers, bonds and paid rewards', () => {
  const snapshot = { activeCompanionId:'retired-family', runtimeVersion:67, dicePool:99, shards:13,
    perIslandEggs:{'2':{status:'incubating',setAtMs:100,hatchDurationMs:999}},
    creatureCollection:[
      {creatureId:'retired-family',copies:4,formLevel:8,bondLevel:12,bondXp:101,claimedBondMilestones:[3],claimedFormRewards:[2,3]},
      {creatureId:'common-bloom-mite',copies:2,formLevel:3,bondLevel:9,bondXp:62,claimedBondMilestones:[3,6],claimedFormRewards:[2,3]},
    ], futureField:{preserveMe:true} };
  const before=JSON.stringify(snapshot), result=previewCreatureSystemMigration(snapshot);
  assert.strictEqual(result.original,snapshot);
  assert.equal(JSON.stringify(snapshot),before);
  assert.equal(result.canApply,false);
  assert.deepEqual(result.legacyUnknownIds,['retired-family']);
  assert.equal(result.proposal.team.favourite,'retired-family');
  assert.equal(result.formConflicts[0].savedForm,3);
  assert.equal(result.formConflicts[0].proposedCap,2);
});
test('individual form candidates do not mark production assets approved', () => {
  const paths=[1,2,3].map(form=>candidateFormArt('common-twilight-seed',form));
  assert.equal(new Set(paths).size,3);
  assert.ok(paths.every(Boolean));
  assert.ok(candidateFormArt('common-bloom-mite',1)?.includes('bloom-1-card'));
  assert.equal(candidateFormArt('common-stone-hopper',1),null);
  assert.equal(contentReadiness().approvedForms,0);
});

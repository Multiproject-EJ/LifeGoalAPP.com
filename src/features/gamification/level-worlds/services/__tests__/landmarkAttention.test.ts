import { resolveIslandMissionBriefingTrigger, markIslandMissionBriefingSeen } from '../islandRunMissionBriefing';
import { assertEqual, type TestCase } from './testHarness';
import { resolveLandmarkAttention } from '../islandRunLandmarkAttention';
import { habitAlertHealth, habitAlertsAllowed, eggAlerts, nativeAlertId, admitDailyLifeAlerts } from '../../../../../services/nativeNotificationPolicy';
export const landmarkAttentionTests: TestCase[] = [
  { name: 'Island001 mission phone briefing triggers on first throw only', run() {
    const options = { islandNumber: 1, cycleIndex: 0, tileCount: 36, hopSequence: [1,2,3], narrativeSeenState: { episodes: {}, beats: {} } };
    const trigger = resolveIslandMissionBriefingTrigger(options);
    assertEqual(trigger?.triggerTileIndex,3,'first destination, not halfway');
    assertEqual(resolveIslandMissionBriefingTrigger({...options,hopSequence:[]}),null,'no briefing before a throw');
    assertEqual(resolveIslandMissionBriefingTrigger({...options,narrativeSeenState:markIslandMissionBriefingSeen(options.narrativeSeenState,trigger,100)}),null,'no repeat after save');
  }},
  { name: 'landmark attention distinguishes unfinished, actionable, complete and hatchery prerequisite', run() {
    const base = { id: 'habit', level: 2, complete: false, allBuilt: false, actionable: false };
    assertEqual(resolveLandmarkAttention(base), 'soft', 'unfinished construction');
    assertEqual(resolveLandmarkAttention({...base,level:3,actionable:true}), 'blue', 'one actionable activity');
    assertEqual(resolveLandmarkAttention({...base,level:3,complete:true}), 'none', 'completed');
    assertEqual(resolveLandmarkAttention({...base,id:'hatchery',level:3,actionable:true}), 'none', 'other buildings missing');
    assertEqual(resolveLandmarkAttention({...base,id:'hatchery',level:3,actionable:true,allBuilt:true}), 'blue', 'all buildings, no activity prerequisite');
  }},
  { name: 'native habit alerts use canonical Stalled and recover after a fresh completion', run() {
    assertEqual(habitAlertsAllowed(habitAlertHealth('2026-09-01','2026-09-20')), false, 'Stalled is silent');
    assertEqual(habitAlertsAllowed('in_review'), false, 'review stays silent');
    assertEqual(habitAlertsAllowed(habitAlertHealth('2026-09-20','2026-09-20')), true, 're-engaged habit');
  }},
  { name: 'native batch eggs keep independent identities and remove opened or expired eggs', run() {
    const eggs = eggAlerts({a:{status:'incubating',setAtMs:1,hatchAtMs:100},b:{status:'incubating',setAtMs:2,hatchAtMs:100},c:{status:'collected',setAtMs:3,hatchAtMs:100}},50);
    assertEqual(eggs.length,2,'both batch eggs survive');
    assertEqual(nativeAlertId(eggs[0].key) === nativeAlertId(eggs[1].key),false,'distinct native IDs');
    assertEqual(nativeAlertId(eggs[0].key),nativeAlertId(eggs[0].key),'stable reconciliation');
    assertEqual(eggAlerts({a:{status:'ready',setAtMs:1,hatchAtMs:100}},101).length,0,'no late repeats');
  }},
  { name: 'daily native reminder budget survives later refreshes', run() {
    const alert = (key: string) => ({key,at:1,title:'',body:''});
    assertEqual(admitDailyLifeAlerts([alert('a'),alert('d')],{a:'today',b:'today',c:'today'},()=> 'today').length,1,'keep existing only');
    assertEqual(admitDailyLifeAlerts([alert('d')],{a:'yesterday',b:'yesterday',c:'yesterday'},()=> 'today').length,1,'new day has a budget');
  }},
];

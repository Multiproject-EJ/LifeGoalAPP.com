/** Developer-only isolated local fixture. Never writes a player's record. */
import type { Session } from '@supabase/supabase-js';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { resolveStagedRestorationMissionProgress } from './islandRunSignatureMissions';
import { sanitizeTitanAwakening } from './island17Awakening';
export const titanPreviewSession = { user: { id: 'demo-island017-awakening-preview', user_metadata: {} } } as Session;
export async function prepareTitanAwakeningPreview(reset = false) {
  if (!import.meta.env.DEV) return;
  const state=getIslandRunStateSnapshot(titanPreviewSession);
  if(!reset&&state.currentIslandNumber===17&&state.signatureMissionProgressByIsland['0:17']) return;
  const base=resolveStagedRestorationMissionProgress({ledger:{},cycleIndex:0,islandNumber:17})!;
  await commitIslandRunState({session:titanPreviewSession,client:null,record:{...state,currentIslandNumber:17,cycleIndex:0,runtimeVersion:state.runtimeVersion+1,
    signatureMissionProgressByIsland:{'0:17':{...base,activatedStages:8,chargesEarned:8,chargesSpent:8,completedAtMs:Date.now(),titanAwakening:sanitizeTitanAwakening(null)}},
  },triggerSource:'dev_titan_preview'});
}

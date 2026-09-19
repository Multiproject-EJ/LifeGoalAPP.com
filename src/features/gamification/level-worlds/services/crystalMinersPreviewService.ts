import { createCrystalMinersProgress, createMinerBlocks } from './crystalMinersGame';
import type { Session } from '@supabase/supabase-js';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { createCrystalMinersBridge } from './islandRunCrystalMinersActions';

// This identity is independent of every signed-in account. No real auth tokens or remote client.
const course = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('course') : null;
const bossPreview = course === 'boss';
const previewLevel = bossPreview ? Math.max(10,Math.min(40,Math.floor(Number(new URLSearchParams(window.location.search).get('level') || 10)/10)*10 || 10)) : 10;
const rewardPreview = course === 'reward';
const qaSuffix = (bossPreview ? `-guardian-${previewLevel}` : '') + (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('qa') === 'gauntlet3' ? '-gauntlet3' : new URLSearchParams(window.location.search).get('qa') === 'gauntlet2' ? '-gauntlet2' : '');
export const CRYSTAL_PREVIEW_SESSION = { user: { id: (rewardPreview ? 'local-crystal-miners-reward-preview-v1' : bossPreview ? 'local-crystal-miners-boss-preview-v1' : 'local-crystal-miners-preview-v1') + qaSuffix, user_metadata: {} } } as Session;
export const CRYSTAL_PREVIEW_EVENT = (rewardPreview ? 'space_excavator:crystal-miners-reward-preview-v1' : bossPreview ? 'space_excavator:crystal-miners-boss-preview-v1' : 'space_excavator:crystal-miners-preview-v1') + qaSuffix;
export const crystalPreviewBridge = createCrystalMinersBridge({session:CRYSTAL_PREVIEW_SESSION,client:null,eventId:CRYSTAL_PREVIEW_EVENT});
export async function prepareCrystalMinersPreview(refill = false): Promise<void> {
  if (!import.meta.env.DEV) return;
  await withIslandRunActionLock(CRYSTAL_PREVIEW_SESSION.user.id, async()=>{
    const current = getIslandRunStateSnapshot(CRYSTAL_PREVIEW_SESSION);
    if (!refill && current.activeTimedEvent?.eventId === CRYSTAL_PREVIEW_EVENT) return;
    const now = Date.now();
    await commitIslandRunState({session:CRYSTAL_PREVIEW_SESSION,client:null,triggerSource:'crystal_miners_local_preview',record:{
      ...current,runtimeVersion:current.runtimeVersion+1,
      activeTimedEvent:{eventId:CRYSTAL_PREVIEW_EVENT,eventType:'space_excavator',startedAtMs:now,expiresAtMs:now+4*86400000,version:1},
      crystalMinersProgressByEvent: (bossPreview || rewardPreview) && !current.crystalMinersProgressByEvent[CRYSTAL_PREVIEW_EVENT] ? { ...current.crystalMinersProgressByEvent, [CRYSTAL_PREVIEW_EVENT]:{...createCrystalMinersProgress(),level:previewLevel,eventTrack:{levelsCleared:previewLevel-1,claimedMilestones:[]},blocks:createMinerBlocks(previewLevel),ore:200,tools:rewardPreview ? [...Array(10).fill(4),...Array(15).fill(0)] : [5,5,5,5,5,4,4,4,4,4,...Array(15).fill(0)]} } : current.crystalMinersProgressByEvent,
      rewardBarBoundEventId:CRYSTAL_PREVIEW_EVENT,
      minigameTicketsByEvent:{...current.minigameTicketsByEvent,[CRYSTAL_PREVIEW_EVENT]:20},
    }});
  });
}

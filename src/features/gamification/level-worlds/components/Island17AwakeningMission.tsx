import React from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useIslandRunState } from '../hooks/useIslandRunState';
import { resolveStagedRestorationMissionProgress } from '../services/islandRunSignatureMissions';
import { interactWithTitanSkull } from '../services/islandRunSignatureMissionAction';
import type { TitanPuzzleInput } from '../services/island17Awakening';
import { Island17AwakeningModal } from './Island17AwakeningModal';

export function Island17AwakeningMission({session,client,onClose}: {session: Session;client: SupabaseClient|null;onClose:()=>void}) {
  const {state}=useIslandRunState(session,client);
  const [busy,setBusy]=React.useState(false),[feedback,setFeedback]=React.useState('');
  const pending=React.useRef(false);
  const progress=resolveStagedRestorationMissionProgress({ledger:state.signatureMissionProgressByIsland,cycleIndex:state.cycleIndex,islandNumber:state.currentIslandNumber});
  const puzzle=progress?.titanAwakening;
  const interact=async(input:TitanPuzzleInput)=>{
    if(pending.current||!puzzle)return;
    pending.current=true;setBusy(true);
    try {
      const result=await interactWithTitanSkull({session,client,cycleIndex:state.cycleIndex,expectedRevision:puzzle.revision,input});
      setFeedback(result.status==='wrong'?(puzzle.phase===0?'The mixture evaporates. A body must come before a heartbeat.':'Almost. Follow the carving and try another alignment.')
        :result.status==='ok'?(input.kind==='test'?'The mechanism answers.':input.kind==='ingredient'?'The mixture changes…':'')
        :result.status==='stale'?'The mechanism has moved. Try again.':'Restore all eight spine sections first.');
    } catch {setFeedback('Could not save that move. Please try again.');}
    finally {pending.current=false;setBusy(false);}
  };
  if(state.currentIslandNumber!==17||!puzzle||!progress||progress.activatedStages<8)return null;
  return <Island17AwakeningModal progress={puzzle} busy={busy} feedback={feedback} onInput={input=>void interact(input)} onClose={onClose}/>;
}

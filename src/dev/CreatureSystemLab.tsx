import { useMemo, useState, useSyncExternalStore } from 'react';
import { CreatureSystemPanel } from '../features/creature-system/CreatureSystemPanel';
import { createLabStore, type LabAction } from '../features/creature-system/labStore';
import { CREATURE_TARGETS } from '../features/creature-system/targets';
import { buildEvidenceProfile, withRefinement } from '../features/creature-system/personality';
import { REFINED_CREATURE_TARGETS } from '../features/creature-system/targets';
import { RefinementQuestionnaire } from '../features/creature-system/RefinementQuestionnaire';
import { MIXED_EXAMPLES } from '../features/creature-system/mixedExamples';

export default function CreatureSystemLab() {
  const [store] = useState(() => createLabStore());
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [preset, setPreset] = useState('0'), [error, setError] = useState('');
  const [mode, setMode] = useState('motives'), [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState<Record<string, number> | null>(null);
  const profile = useMemo(() => {
    const mixed=MIXED_EXAMPLES.find(example=>preset===`mixed:${example.id}`);
    if(mixed) return mode==='foundation' ? buildEvidenceProfile({}) : withRefinement(mixed.profile, custom ?? mixed.profile.refinement!.answers);
    const foundation = preset === 'empty' ? buildEvidenceProfile({}) : preset === 'partial' ? buildEvidenceProfile({v2_plan_01:'a'}) : CREATURE_TARGETS[Number(preset)].profile;
    if (mode === 'foundation') return foundation;
    const sample = preset === 'empty' || preset === 'partial' ? {} : REFINED_CREATURE_TARGETS[Number(preset)].profile.refinement!.answers;
    return withRefinement(foundation, custom ?? sample);
  }, [preset, mode, custom]);
  const dispatch = (action: LabAction) => { try { store.dispatch(action); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update preview'); } };
  return <main className="cs-lab"><div className="cs-lab-controls"><strong>DEVELOPMENT PREVIEW · synthetic samples · no live saves</strong><label>Matching basis<select value={mode} onChange={e=>setMode(e.target.value)}><option value="motives">Motivation refinement · experimental</option><option value="foundation">Foundation diagnostic · previous model</option></select></label><label>Scenario profile<select value={preset} onChange={e=>{setPreset(e.target.value);setCustom(null);}}>{CREATURE_TARGETS.map((t,i)=><option key={t.id} value={i}>{t.label} · sample</option>)}{MIXED_EXAMPLES.map(example=><option key={example.id} value={`mixed:${example.id}`}>{example.label} · mixed example</option>)}<option value="empty">No answers</option><option value="partial">One answer only</option></select></label><button type="button" onClick={()=>setEditing(true)}>Refine motivations</button><button type="button" onClick={()=>{store.reset();setError('');}}>Reset fixture</button></div>{custom && <p className="cs-lab-example">Edited motivation ratings applied. The selected foundation scenario and your chosen trio are unchanged.</p>}{preset.startsWith("mixed:") && !custom && <p className="cs-lab-example">{MIXED_EXAMPLES.find(example=>preset===`mixed:${example.id}`)?.story} Synthetic example—not a creature target or a personal assessment.</p>}{error && <p className="cs-lab-error" role="alert">{error}</p>}<CreatureSystemPanel profile={profile} owned={state.owned} team={state.team} eggs={state.eggs} notice={state.lastResult}
    onEquip={(role,id)=>dispatch({type:'equip',role,id})} onCollect={eggId=>dispatch({type:'collect',eggId,now:Date.now()})} onSell={(eggId,choice)=>dispatch({type:'sell',eggId,choice,now:Date.now()})} />
    {editing && <RefinementQuestionnaire initial={custom ?? profile.refinement?.answers ?? {}} onClose={()=>setEditing(false)} onApply={answers=>{setCustom(answers);setMode('motives');setEditing(false);}} />}</main>;
}

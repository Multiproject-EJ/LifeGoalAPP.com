import { useMemo, useState } from 'react';
import {
  createSkyboundAcademyEvaluatorSave,
  getSkyboundAcademyEvaluatorLesson,
  type SkyboundAcademyEvaluatorScenario,
} from '../../level-worlds/services/skyboundAcademyEvaluator';
import {
  SKYBOUND_AIRCRAFT_RANKS,
  getSkyboundRank,
  getSkyboundRankLessons,
  type SkyboundAcademyRankId,
  type SkyboundAssemblyLevel,
} from '../../level-worlds/services/skyboundPilotAcademy';
import { getSkyboundLevel } from '../../level-worlds/services/skyboundExpeditionFlight';
import SkyboundExpeditionMinigame from './SkyboundExpeditionMinigame';

/** Development-only in-memory flight lab. It never touches canonical event state. */
export default function SkyboundExpeditionPreview() {
  const params=useMemo(()=>new URLSearchParams(window.location.search),[]);
  const initialRank=params.get('rank') as SkyboundAcademyRankId|null;
  const [rankId,setRankId]=useState<SkyboundAcademyRankId>(SKYBOUND_AIRCRAFT_RANKS.some((rank)=>rank.id===initialRank)?initialRank as SkyboundAcademyRankId:'cadet');
  const [lessonIndex,setLessonIndex]=useState(()=>Math.max(0,Math.min(3,Number(params.get('lesson'))||0)));
  const [assemblyLevel,setAssemblyLevel]=useState<SkyboundAssemblyLevel>(()=>Math.max(0,Math.min(4,Number(params.get('assembly'))||0)) as SkyboundAssemblyLevel);
  const [upgradeLevel,setUpgradeLevel]=useState(()=>Math.max(0,Math.min(5,Number(params.get('upgrades'))||0)));
  const [session, setSession] = useState(0);
  const [open,setOpen]=useState(true);
  const scenario:SkyboundAcademyEvaluatorScenario={rankId,lessonIndex,assemblyLevel,upgradeLevel};
  const save=useMemo(()=>createSkyboundAcademyEvaluatorSave(scenario),[assemblyLevel,lessonIndex,rankId,upgradeLevel]);
  const lesson=getSkyboundAcademyEvaluatorLesson(scenario);
  const rank=getSkyboundRank(rankId);
  const level=getSkyboundLevel(lesson.levelId);
  const applyScenario=(next:Partial<SkyboundAcademyEvaluatorScenario>)=>{
    const resolved={...scenario,...next};
    setRankId(resolved.rankId);setLessonIndex(resolved.lessonIndex);setAssemblyLevel(resolved.assemblyLevel);setUpgradeLevel(resolved.upgradeLevel);setSession((value)=>value+1);
    const nextParams=new URLSearchParams(window.location.search);nextParams.set('rank',resolved.rankId);nextParams.set('lesson',String(resolved.lessonIndex));nextParams.set('assembly',String(resolved.assemblyLevel));nextParams.set('upgrades',String(resolved.upgradeLevel));window.history.replaceState(null,'',`${window.location.pathname}?${nextParams.toString()}`);
  };
  return (
    <div className="skybound-evaluator">
      <SkyboundExpeditionMinigame
        key={`${rankId}-${lessonIndex}-${assemblyLevel}-${upgradeLevel}-${session}`}
        islandNumber={1}
        evaluatorConfig={{initialSave:save,selectedRankId:rankId,selectedLessonId:lesson.id}}
        onComplete={() => setSession((value) => value + 1)}
      />
      <button type="button" className="skybound-evaluator__toggle" onClick={()=>setOpen((value)=>!value)}>{open?'HIDE EVALUATOR':'OPEN EVALUATOR'}</button>
      {open&&<aside className="skybound-evaluator__panel" aria-label="Academy evaluator controls">
        <div className="skybound-evaluator__heading"><span>DEVELOPMENT · NO SAVE</span><strong>Academy Evaluator</strong><small>{level.trainingStage} · {rank.aircraftName} · BUILD {assemblyLevel}/4</small></div>
        <div className="skybound-evaluator__controls">
          <label>RANK<select aria-label="Evaluator rank" value={rankId} onChange={(event)=>applyScenario({rankId:event.target.value as SkyboundAcademyRankId,lessonIndex:0})}>{SKYBOUND_AIRCRAFT_RANKS.map((item)=><option key={item.id} value={item.id}>{item.rank}. {item.title}</option>)}</select></label>
          <label>LESSON<select aria-label="Evaluator lesson" value={lessonIndex} onChange={(event)=>applyScenario({lessonIndex:Number(event.target.value)})}>{getSkyboundRankLessons(rankId).map((item)=><option key={item.id} value={item.index}>{item.index+1}. {item.shortName}</option>)}</select></label>
          <label>AIRCRAFT<select aria-label="Evaluator assembly" value={assemblyLevel} onChange={(event)=>applyScenario({assemblyLevel:Number(event.target.value) as SkyboundAssemblyLevel})}>{[0,1,2,3,4].map((value)=><option key={value} value={value}>BUILD {value}/4</option>)}</select></label>
          <label>UPGRADES<select aria-label="Evaluator upgrades" value={upgradeLevel} onChange={(event)=>applyScenario({upgradeLevel:Number(event.target.value)})}>{[0,1,2,3,4,5].map((value)=><option key={value} value={value}>LV {value}</option>)}</select></label>
        </div>
        <div className="skybound-evaluator__footer"><span>AGL {level.targetAltitudeMin}–{level.targetAltitudeMax}m · {lesson.goalDistance}m course</span><button type="button" onClick={()=>applyScenario({})}>RELOAD STAGE</button></div>
      </aside>}
    </div>
  );
}

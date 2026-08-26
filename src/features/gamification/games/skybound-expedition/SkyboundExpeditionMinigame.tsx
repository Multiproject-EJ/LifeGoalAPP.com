import { useCallback, useEffect, useRef, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import { playIslandRunSound } from '../../level-worlds/services/islandRunAudio';
import {
  SKYBOUND_MAX_UPGRADE_LEVEL, createSkyboundFlight, getSkyboundUpgradeCost,
  scoreSkyboundFlight, stepSkyboundFlight, upgradeSkyboundPart,
  type SkyboundFlightControl, type SkyboundFlightState, type SkyboundUpgradeKind, type SkyboundUpgrades,
} from '../../level-worlds/services/skyboundExpeditionFlight';
import {
  SKYBOUND_AIRCRAFT_RANKS, SKYBOUND_LESSONS, evaluateSkyboundLesson, getSkyboundLesson,
  getSkyboundRank, getSkyboundRankLessons, isSkyboundLessonUnlocked, settleSkyboundAcademyLesson,
  spendSkyboundSortieTicket, type SkyboundAcademyProgress, type SkyboundAcademyRankId,
  type SkyboundLessonEvaluation, type SkyboundLessonId,
} from '../../level-worlds/services/skyboundPilotAcademy';
import { clearSkyboundAcademySave, loadSkyboundAcademySave, saveSkyboundAcademySave } from '../../level-worlds/services/skyboundAcademyStorage';
import type { SkyboundAimView } from './skyboundExpeditionRenderer';
import SkyboundExpeditionThreeStage from './SkyboundExpeditionThreeStage';
import fleetEvolutionStripUrl from './assets/fleet-evolution-strip-v1.png';
import './skyboundExpedition.css';

type Phase = 'aiming' | 'flying' | 'result';
const DEFAULT_AIM:SkyboundAimView={power:0,angleDeg:35,pullX:0,pullY:0,dragging:false};
const DEFAULT_CONTROL:SkyboundFlightControl={pitch:0,steer:0,boost:false,stabilize:false};
const INTEGRITY:Record<SkyboundAcademyRankId,number>={cadet:3,trainee:3,aviator:4,elite:4,ace:5};
const UPGRADE_COPY:Record<SkyboundUpgradeKind,{icon:string;title:string;effect:string}>={
  launcher:{icon:'↗',title:'Launch System',effect:'More opening speed'},
  airframe:{icon:'◇',title:'Flight Controls',effect:'Lift, steering + stability'},
  engine:{icon:'✦',title:'Boost Drive',effect:'Thrust + boost reserve'},
};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export default function SkyboundExpeditionMinigame({onComplete}:IslandRunMinigameProps) {
  const initial=useRef(loadSkyboundAcademySave()).current;
  const flightRef=useRef<SkyboundFlightState|null>(null);
  const controlRef=useRef<SkyboundFlightControl>({...DEFAULT_CONTROL});
  const aimRef=useRef<SkyboundAimView>(DEFAULT_AIM);
  const upgradesRef=useRef<SkyboundUpgrades>(initial.upgrades);
  const academyRef=useRef<SkyboundAcademyProgress>(initial.progress);
  const phaseRef=useRef<Phase>('aiming');
  const dragStartRef=useRef<{x:number;y:number}|null>(null);
  const unlockedAtStart=SKYBOUND_AIRCRAFT_RANKS.filter((rank)=>initial.progress.promotedRankIds.includes(rank.id));
  const latestRank=unlockedAtStart[unlockedAtStart.length-1]??SKYBOUND_AIRCRAFT_RANKS[0];
  const firstOpen=getSkyboundRankLessons(latestRank.id).find((lesson)=>!initial.progress.completedLessonIds.includes(lesson.id))??getSkyboundRankLessons(latestRank.id)[0];
  const [phase,setPhaseState]=useState<Phase>('aiming');
  const [aim,setAimState]=useState(DEFAULT_AIM);
  const [flight,setFlight]=useState<SkyboundFlightState|null>(null);
  const [upgrades,setUpgradesState]=useState(initial.upgrades);
  const [academy,setAcademyState]=useState(initial.progress);
  const [salvage,setSalvage]=useState(initial.salvage);
  const [selectedRankId,setSelectedRankId]=useState<SkyboundAcademyRankId>(latestRank.id);
  const [lessonId,setLessonId]=useState<SkyboundLessonId>(firstOpen.id);
  const [evaluation,setEvaluation]=useState<SkyboundLessonEvaluation|null>(null);
  const [lastReward,setLastReward]=useState(0);
  const [sortieKey,setSortieKey]=useState(0);
  const [showHangar,setShowHangar]=useState(false);
  const [showCertificate,setShowCertificate]=useState(false);
  const [message,setMessage]=useState('Set launch power, release, then fly into the 3D training world.');
  const lesson=getSkyboundLesson(lessonId);
  const rank=getSkyboundRank(lesson.rankId);
  const rankLessons=getSkyboundRankLessons(selectedRankId);

  const setPhase=useCallback((next:Phase)=>{phaseRef.current=next;setPhaseState(next);},[]);
  const setAim=useCallback((next:SkyboundAimView)=>{aimRef.current=next;setAimState(next);},[]);
  const setUpgrades=useCallback((next:SkyboundUpgrades)=>{upgradesRef.current=next;setUpgradesState(next);},[]);
  const setAcademy=useCallback((next:SkyboundAcademyProgress)=>{academyRef.current=next;setAcademyState(next);},[]);

  useEffect(()=>{saveSkyboundAcademySave({progress:academy,upgrades,salvage});},[academy,salvage,upgrades]);

  const launch=useCallback(()=>{
    const currentAim=aimRef.current;
    if(currentAim.power<0.18){setAim(DEFAULT_AIM);setMessage(`Add more ${rank.aircraftId==='toy_glider'?'sling tension':'launch thrust'} before release.`);return;}
    const ticket=spendSkyboundSortieTicket(academyRef.current);
    if(!ticket.ok){setAim(DEFAULT_AIM);setMessage('No sortie tickets remain. Rank exams replenish tickets.');playIslandRunSound('market_insufficient_coins');return;}
    setAcademy(ticket.progress);
    const next=createSkyboundFlight({power:currentAim.power,angleDeg:currentAim.angleDeg,upgrades:upgradesRef.current,levelId:lesson.levelId,goalDistance:lesson.goalDistance,aircraftId:rank.aircraftId});
    flightRef.current=next;setFlight(next);controlRef.current={...DEFAULT_CONTROL};setEvaluation(null);
    setMessage('Drag to bank and climb. Pulse Boost for speed; hold Stabilize through gusts.');setPhase('flying');playIslandRunSound('minigame_open');
  },[lesson.goalDistance,lesson.levelId,rank.aircraftId,setAcademy,setAim,setPhase]);
  const fullPowerLaunch=()=>{
    const charged={...DEFAULT_AIM,power:1,angleDeg:40};
    aimRef.current=charged;
    setAimState(charged);
    window.setTimeout(launch,0);
  };

  useEffect(()=>{
    if(phase!=='flying')return undefined;
    let frameId=0;let previous=performance.now();let lastUi=0;
    const animate=(time:number)=>{
      const current=flightRef.current;if(!current||phaseRef.current!=='flying')return;
      const next=stepSkyboundFlight(current,controlRef.current,upgradesRef.current,time-previous);previous=time;flightRef.current=next;
      if(time-lastUi>50||next.status!=='flying'){setFlight(next);lastUi=time;}
      if(next.status!=='flying'){
        const nextEvaluation=evaluateSkyboundLesson(lessonId,next);const nextAcademy=settleSkyboundAcademyLesson(academyRef.current,nextEvaluation);const reward=scoreSkyboundFlight(next);
        setEvaluation(nextEvaluation);setAcademy(nextAcademy);setLastReward(reward);setSalvage((value)=>value+reward);
        if(nextEvaluation.passed&&lesson.id==='ace_exam'){setMessage('GOLD WINGS EARNED — the Academy final is complete.');setShowCertificate(true);playIslandRunSound('minigame_complete');}
        else if(nextEvaluation.ace){setMessage('ACE SCORE — every standard met.');playIslandRunSound('minigame_complete');}
        else if(nextEvaluation.passed&&lesson.exam){const nextRank=SKYBOUND_AIRCRAFT_RANKS[rank.rank];setMessage(`${rank.title.toUpperCase()} CHECKRIDE PASSED — ${nextRank?.aircraftName??'Gold Wings'} unlocked.`);playIslandRunSound('minigame_complete');}
        else if(nextEvaluation.passed){setMessage('Lesson passed. The next Academy drill is open.');playIslandRunSound('minigame_complete');}
        else setMessage(next.status==='crashed'?'Recovery crew has the pieces. Upgrade and fly again.':'Complete the core flight objective plus one supporting standard.');
        setPhase('result');return;
      }
      frameId=requestAnimationFrame(animate);
    };
    frameId=requestAnimationFrame(animate);return()=>cancelAnimationFrame(frameId);
  },[lesson.exam,lesson.id,lessonId,phase,rank.rank,rank.title,setAcademy,setPhase]);

  useEffect(()=>{
    const down=(event:KeyboardEvent)=>{if(phaseRef.current!=='flying')return;const key=event.key.toLowerCase();if(event.key==='ArrowUp'||key==='w')controlRef.current.pitch=1;if(event.key==='ArrowDown'||key==='s')controlRef.current.pitch=-1;if(event.key==='ArrowLeft'||key==='a')controlRef.current.steer=-1;if(event.key==='ArrowRight'||key==='d')controlRef.current.steer=1;if(event.code==='Space')controlRef.current.boost=true;if(key==='e')controlRef.current.stabilize=true;if(event.code==='Space'||event.key.startsWith('Arrow'))event.preventDefault();};
    const up=(event:KeyboardEvent)=>{const key=event.key.toLowerCase();if(['ArrowUp','ArrowDown'].includes(event.key)||['w','s'].includes(key))controlRef.current.pitch=0;if(['ArrowLeft','ArrowRight'].includes(event.key)||['a','d'].includes(key))controlRef.current.steer=0;if(event.code==='Space')controlRef.current.boost=false;if(key==='e')controlRef.current.stabilize=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[]);

  const updateControl=(canvas:HTMLCanvasElement,clientX:number,clientY:number)=>{const rect=canvas.getBoundingClientRect();const x=clamp((clientX-rect.left)/rect.width,0,1);const y=clamp((clientY-rect.top)/rect.height,0,1);controlRef.current.steer=clamp((x-.5)*2.6,-1,1);controlRef.current.pitch=clamp((.5-y)*2.6,-1,1);};
  const handlePointerDown:React.PointerEventHandler<HTMLCanvasElement>=(event)=>{event.currentTarget.setPointerCapture(event.pointerId);if(phaseRef.current==='aiming'){dragStartRef.current={x:event.clientX,y:event.clientY};setAim({...aimRef.current,dragging:true});setMessage(`Pull down to build ${rank.aircraftId==='toy_glider'?'sling power':'launch thrust'}, then release.`);}else if(phaseRef.current==='flying')updateControl(event.currentTarget,event.clientX,event.clientY);};
  const handlePointerMove:React.PointerEventHandler<HTMLCanvasElement>=(event)=>{if(!event.currentTarget.hasPointerCapture(event.pointerId))return;if(phaseRef.current==='aiming'&&dragStartRef.current){const rect=event.currentTarget.getBoundingClientRect();const pullY=Math.max(0,event.clientY-dragStartRef.current.y);const pullX=dragStartRef.current.x-event.clientX;const power=clamp(Math.hypot(pullX*.55,pullY)/(rect.height*.28),0,1);const angleDeg=clamp(28+(pullY/Math.max(1,rect.height))*48+(pullX/Math.max(1,rect.width))*10,18,56);setAim({power,angleDeg,pullX,pullY,dragging:true});}else if(phaseRef.current==='flying')updateControl(event.currentTarget,event.clientX,event.clientY);};
  const handlePointerUp:React.PointerEventHandler<HTMLCanvasElement>=(event)=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);dragStartRef.current=null;if(phaseRef.current==='aiming')launch();if(phaseRef.current==='flying'){controlRef.current.pitch=0;controlRef.current.steer=0;}};

  const prepareSortie=(nextLessonId:SkyboundLessonId)=>{const nextLesson=getSkyboundLesson(nextLessonId);setSelectedRankId(nextLesson.rankId);setLessonId(nextLessonId);flightRef.current=null;setFlight(null);setEvaluation(null);controlRef.current={...DEFAULT_CONTROL};setAim(DEFAULT_AIM);setSortieKey((value)=>value+1);setMessage(`${getSkyboundRank(nextLesson.rankId).launchMethod}: pull down, release, then fly.`);setPhase('aiming');};
  const selectRank=(rankId:SkyboundAcademyRankId)=>{if(phase==='flying'||!academy.promotedRankIds.includes(rankId))return;setSelectedRankId(rankId);const lessons=getSkyboundRankLessons(rankId);const next=lessons.find((candidate)=>!academy.completedLessonIds.includes(candidate.id))??lessons[0];prepareSortie(next.id);};
  const buyUpgrade=(kind:SkyboundUpgradeKind)=>{const current=upgradesRef.current[kind];const cost=getSkyboundUpgradeCost(kind,current);if(current>=SKYBOUND_MAX_UPGRADE_LEVEL){setMessage(`${UPGRADE_COPY[kind].title} is maxed.`);return;}if(salvage<cost){setMessage(`Need ${cost-salvage} more salvage.`);playIslandRunSound('market_insufficient_coins');return;}setSalvage((value)=>value-cost);setUpgrades(upgradeSkyboundPart(upgradesRef.current,kind));setMessage(`${UPGRADE_COPY[kind].title} upgraded for the whole fleet.`);playIslandRunSound('build_upgrade');};
  const resetCareer=()=>{const fresh=clearSkyboundAcademySave();setAcademy(fresh.progress);setUpgrades(fresh.upgrades);setSalvage(fresh.salvage);setShowHangar(false);prepareSortie('cadet_launch');};
  const nextLesson=SKYBOUND_LESSONS[lesson.globalIndex+1];
  const distance=Math.round(Math.min(flight?.x??0,lesson.goalDistance));const progress=clamp(distance/lesson.goalDistance,0,1);
  const fuel=flight?clamp(flight.fuel/(1+upgrades.engine*.18),0,1):1;const stability=flight?clamp(flight.stabilizer/(1+upgrades.airframe*.12),0,1):1;
  const completed=academy.completedLessonIds.length;

  return <main className={`skybound skybound--${rank.id}`} aria-label="Skybound Pilot Academy full 3D event">
    <section className="skybound__shell">
      <header className="skybound__header">
        <button type="button" className="skybound__close" aria-label="Exit Pilot Academy" onClick={()=>onComplete({completed:academy.certificateAwarded,reward:{xp:academy.academyXp}})}>×</button>
        <button type="button" className="skybound__title-button" onClick={()=>setShowHangar(true)}><span className="skybound__eyebrow">LIMITED EVENT · PILOT SCHOOL</span><h1>Skybound Academy</h1></button>
        <div className="skybound__wallet"><span className="skybound__tickets">🎟 {academy.tickets}</span><span className="skybound__salvage"><b>◆</b>{salvage}</span></div>
      </header>

      <nav className="skybound__ranks" aria-label="Pilot ranks">
        {SKYBOUND_AIRCRAFT_RANKS.map((item)=>{const unlocked=academy.promotedRankIds.includes(item.id);const medal=academy.medalRankIds.includes(item.id);return <button type="button" key={item.id} disabled={!unlocked||phase==='flying'} className={`${unlocked?'is-unlocked':''} ${selectedRankId===item.id?'is-active':''}`} onClick={()=>selectRank(item.id)} title={`${item.title}: ${item.aircraftName}`}><span>{medal?'🏅':unlocked?'✈':'⌁'}</span><b>{item.title}</b><small>{item.aircraftName}</small></button>;})}
      </nav>
      <nav className="skybound__lessons" aria-label={`${getSkyboundRank(selectedRankId).title} lessons`}>
        {rankLessons.map((candidate)=>{const unlocked=isSkyboundLessonUnlocked(academy,candidate.id);const complete=academy.completedLessonIds.includes(candidate.id);const ace=academy.aceLessonIds.includes(candidate.id);return <button type="button" key={candidate.id} disabled={!unlocked||phase==='flying'} className={candidate.id===lessonId?'is-active':''} onClick={()=>prepareSortie(candidate.id)}><span>{ace?'★':complete?'✓':candidate.exam?'E':candidate.index+1}</span>{candidate.shortName}</button>;})}
      </nav>

      <div className="skybound__course-row"><div><strong>{rank.callsign} · {lesson.name}</strong><span>{lesson.briefing}</span></div><strong>{distance} / {lesson.goalDistance}m</strong></div>
      <div className="skybound__progress"><i style={{width:`${progress*100}%`}} /></div>
      <div className={`skybound__stage is-${phase}`}>
        <SkyboundExpeditionThreeStage phase={phase} levelId={lesson.levelId} goalDistance={lesson.goalDistance} aircraftId={rank.aircraftId} flight={flight} aim={aim} sortieKey={sortieKey} boosting={controlRef.current.boost} stabilizing={controlRef.current.stabilize===true} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}/>
        {phase==='aiming'&&<><div className="skybound__aircraft-card"><span>RANK {rank.rank} · {rank.title}</span><strong>{rank.aircraftName}</strong><small>{rank.launchMethod} · {rank.theme}</small></div><div className="skybound__aim-hud"><span><b>{Math.round(aim.power*100)}%</b>{rank.aircraftId==='toy_glider'?'SLING POWER':'LAUNCH THRUST'}</span><span><b>{Math.round(aim.angleDeg)}°</b>DEPARTURE</span></div><button type="button" className="skybound__launch-button" onClick={fullPowerLaunch}>FULL POWER · 1 TICKET</button><div className="skybound__tip">INSTRUCTOR · {lesson.instructorTip}</div></>}
        {phase==='flying'&&<><div className="skybound__flight-stats"><span><b>◆</b> {flight?.salvageCollected??0}</span><span><b>◎</b> {flight?.ringsCleared??0}</span><span className={(flight?.integrity??3)<=1?'has-hits':''}><b>▰</b> {flight?.integrity??INTEGRITY[rank.id]}/{INTEGRITY[rank.id]}</span>{(flight?.currentStreak??0)>1&&<span className="is-streak">×{flight?.currentStreak}</span>}</div><div className="skybound__flight-hud"><div className="skybound__meters"><label>BOOST<i><b style={{width:`${fuel*100}%`}}/></i></label><label>STABILITY<i><b style={{width:`${stability*100}%`}}/></i></label></div><div className="skybound__actions"><button type="button" className="skybound__stabilize" disabled={stability<=0} onPointerDown={(event)=>{event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);controlRef.current.stabilize=true;}} onPointerUp={(event)=>{event.stopPropagation();controlRef.current.stabilize=false;}}>STABILIZE</button><button type="button" className="skybound__boost" disabled={fuel<=0} onPointerDown={(event)=>{event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);controlRef.current.boost=true;}} onPointerUp={(event)=>{event.stopPropagation();controlRef.current.boost=false;}}>BOOST</button></div></div></>}
        {phase==='result'&&flight&&evaluation&&<div className="skybound__result" role="dialog" aria-label="Academy lesson result"><span className={`skybound__result-badge ${evaluation.ace?'is-finished':''}`}>{evaluation.ace?'ACE · 3/3':evaluation.passed?'PASS · 2/3+':'RETRAIN'}</span><strong>{Math.round(flight.x)}m</strong><span>+{lastReward} salvage · +{evaluation.academyXpEarned} XP</span><div className="skybound__result-stats"><span><b>◆</b>{flight.salvageCollected}</span><span><b>◎</b>{flight.ringsCleared}</span><span className={flight.hazardHits>0?'has-hits':''}><b>⚠</b>{flight.hazardHits}</span><span><b>×</b>{flight.bestStreak}</span></div><div className="skybound__standards">{evaluation.standardResults.map((standard)=><span key={standard.id} className={standard.met?'is-met':''}><b>{standard.met?'✓':'○'}</b>{standard.label}</span>)}</div>{evaluation.passed&&lesson.exam&&<div className="skybound__promotion">🏅 {rank.title.toUpperCase()} MEDAL EARNED{nextLesson?` · ${getSkyboundRank(nextLesson.rankId).aircraftName.toUpperCase()} UNLOCKED`:''}</div>}<button type="button" onClick={()=>evaluation.passed&&nextLesson?prepareSortie(nextLesson.id):prepareSortie(lessonId)}>{evaluation.passed&&nextLesson?'NEXT FLIGHT':'FLY AGAIN · 1 TICKET'}</button></div>}
      </div>
      <p className="skybound__message" aria-live="polite">{message}</p>
      <section className="skybound__upgrades" aria-label="Fleet upgrades">{(Object.keys(UPGRADE_COPY) as SkyboundUpgradeKind[]).map((kind)=>{const copy=UPGRADE_COPY[kind];const level=upgrades[kind];const cost=getSkyboundUpgradeCost(kind,level);const maxed=level>=SKYBOUND_MAX_UPGRADE_LEVEL;return <button type="button" key={kind} disabled={phase==='flying'||maxed} className={salvage>=cost&&phase!=='flying'?'can-buy':''} onClick={()=>buyUpgrade(kind)}><span className="skybound__upgrade-icon">{copy.icon}</span><span><strong>{copy.title}</strong><small>{copy.effect}</small></span><span className="skybound__upgrade-price"><b>LV {level}</b><small>{maxed?'MAX':`◆ ${cost}`}</small></span></button>;})}</section>
    </section>

    {showHangar&&<div className="skybound__overlay"><section className="skybound__hangar" role="dialog" aria-label="Academy career"><button className="skybound__overlay-close" onClick={()=>setShowHangar(false)}>×</button><span className="skybound__eyebrow">CADET CAREER RECORD</span><h2>Five aircraft. Twenty flights.</h2><figure className="skybound__fleet-evolution"><img src={fleetEvolutionStripUrl} alt="Toy glider evolving through prop and jet trainers into the Goldwing fighter"/><figcaption><span>CADET</span><span>TRAINEE</span><span>AVIATOR</span><span>ELITE</span><span>ACE</span></figcaption></figure><div className="skybound__career-score"><strong>{completed}<small>/ 20 LESSONS</small></strong><strong>{academy.medalRankIds.length}<small>/ 5 MEDALS</small></strong><strong>{academy.academyXp}<small>ACADEMY XP</small></strong></div><div className="skybound__fleet-list">{SKYBOUND_AIRCRAFT_RANKS.map((item)=><div key={item.id} className={academy.promotedRankIds.includes(item.id)?'is-unlocked':''}><span>{academy.medalRankIds.includes(item.id)?'🏅':academy.promotedRankIds.includes(item.id)?'✈':'⌁'}</span><div><b>{item.rank}. {item.title} · {item.callsign}</b><small>{item.aircraftName} · {item.launchMethod}</small></div></div>)}</div>{academy.certificateAwarded&&<button className="skybound__certificate-button" onClick={()=>setShowCertificate(true)}>VIEW GOLD WINGS CERTIFICATE</button>}<button className="skybound__reset" onClick={resetCareer}>RESET EVENT CAREER</button></section></div>}
    {showCertificate&&<div className="skybound__overlay skybound__overlay--certificate"><section className="skybound__certificate" role="dialog" aria-label="Gold Wings certificate"><button className="skybound__overlay-close" onClick={()=>setShowCertificate(false)}>×</button><span className="skybound__certificate-wings">◁ ★ ▷</span><small>SKYBOUND FLIGHT CORPS</small><h2>Gold Wings Pilot Certificate</h2><p>This certifies that the Academy pilot completed all five aircraft ranks and passed the Final Wings Exam with courage, control, and consistency.</p><div className="skybound__certificate-medal">🏅</div><strong>ACADEMY ACE</strong><span>Certificate No. SB-{String(Math.max(1,academy.sorties)).padStart(4,'0')}</span><button onClick={()=>onComplete({completed:true,reward:{xp:academy.academyXp}})}>COMPLETE EVENT</button></section></div>}
  </main>;
}

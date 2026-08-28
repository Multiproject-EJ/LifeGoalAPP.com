import { useCallback, useEffect, useRef, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import { playIslandRunSound } from '../../level-worlds/services/islandRunAudio';
import {
  SKYBOUND_MAX_UPGRADE_LEVEL, createSkyboundFlight, getSkyboundFlowTargetSpeedKmh, getSkyboundLandingZone, getSkyboundUpgradeCost,
  getSkyboundFlightScoreBreakdown, getSkyboundLevel, scoreSkyboundFlight, stepSkyboundFlight, upgradeSkyboundPart,
  type SkyboundFlightControl, type SkyboundFlightState, type SkyboundUpgradeKind, type SkyboundUpgrades,
} from '../../level-worlds/services/skyboundExpeditionFlight';
import { getSkyboundFlightDirector, getSkyboundFlightStickControl, getSkyboundFlightTelemetry } from '../../level-worlds/services/skyboundFlightFeel';
import {
  SKYBOUND_AIRCRAFT_RANKS, SKYBOUND_LESSONS, evaluateSkyboundLesson, getSkyboundLesson,
  getSkyboundAssemblyLevel, getSkyboundAssemblyPartCost, getSkyboundAssemblyParts, getSkyboundNextAssemblyPart,
  getSkyboundLessonStandardResults, getSkyboundRank, getSkyboundRankLessons, installSkyboundNextAssemblyPart, isSkyboundLessonUnlocked, settleSkyboundAcademyLesson,
  spendSkyboundSortieTicket, type SkyboundAcademyProgress, type SkyboundAcademyRankId,
  type SkyboundLessonEvaluation, type SkyboundLessonId, type SkyboundLessonStandardResult,
} from '../../level-worlds/services/skyboundPilotAcademy';
import { clearSkyboundAcademySave, loadSkyboundAcademySave, saveSkyboundAcademySave, type SkyboundAcademyEventProgress, type SkyboundAcademySave } from '../../level-worlds/services/skyboundAcademyStorage';
import type { SkyboundAimView } from './skyboundExpeditionRenderer';
import SkyboundExpeditionThreeStage from './SkyboundExpeditionThreeStage';
import fleetEvolutionStripUrl from './assets/fleet-evolution-strip-v1.png';
import './skyboundExpedition.css';

type Phase = 'aiming' | 'flying' | 'result';
interface FlightStickView { anchorX:number; anchorY:number; offsetX:number; offsetY:number; magnitude:number; }
const DEFAULT_AIM:SkyboundAimView={power:0,angleDeg:35,pullX:0,pullY:0,dragging:false};
const DEFAULT_CONTROL:SkyboundFlightControl={pitch:0,steer:0,boost:false,stabilize:false};
const INTEGRITY:Record<SkyboundAcademyRankId,number>={cadet:3,trainee:3,aviator:4,elite:4,ace:5};
const TERMINAL_COPY:Record<Exclude<SkyboundFlightState['terminalReason'],null>,{label:string;detail:string}>={
  goal:{label:'EXAM GATE REACHED',detail:'Course complete — energy carried through the final gate.'},
  touchdown:{label:'CONTROLLED RECOVERY',detail:'The aircraft returned to the range in one piece.'},
  hard_impact:{label:'GROUND IMPACT',detail:'The aircraft touched terrain before a safe landing. This sortie is over.'},
  integrity_failure:{label:'AIRFRAME FAILURE',detail:'Repeated impacts exhausted structural integrity.'},
};
const UPGRADE_COPY:Record<SkyboundUpgradeKind,{icon:string;title:string;effect:string}>={
  launcher:{icon:'↗',title:'Launch System',effect:'More opening speed'},
  airframe:{icon:'◇',title:'Flight Controls',effect:'Lift, steering + stability'},
  engine:{icon:'✦',title:'Boost Drive',effect:'Thrust + boost reserve'},
};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const standardProgressCopy=(standard:SkyboundLessonStandardResult)=>standard.kind==='landing'
  ? (standard.met?'TOUCHDOWN':'LAND SAFELY')
  : standard.kind==='hazards'
    ? `${standard.value} / ${standard.target} IMPACT`
    : standard.kind==='flow'
      ? `${standard.value} / ${standard.target}s FLOW`
      : `${standard.value} / ${standard.target}`;

interface SkyboundCanonicalLaunchConfig {
  mode: 'pilot_academy';
  activeEventId: string;
  initialProgress: SkyboundAcademyEventProgress | null;
  getTicketsRemaining: () => number;
  requestSortieStart: (attemptId:string,lessonId:SkyboundLessonId)=>Promise<{ok:boolean;ticketsRemaining:number;progress:SkyboundAcademyEventProgress;failureReason?:string}>;
  requestSortieSettlement: (attemptId:string,flight:SkyboundFlightState)=>Promise<{ok:boolean;alreadySettled:boolean;ticketsRemaining:number;ticketsAwarded:number;rewardBarProgressAdded:number;progress:SkyboundAcademyEventProgress;evaluation:SkyboundLessonEvaluation;salvageAwarded:number;failureReason?:string}>;
  requestUpgrade: (kind:SkyboundUpgradeKind)=>Promise<{ok:boolean;cost:number;progress:SkyboundAcademyEventProgress;failureReason?:string}>;
  requestAssemblyPart: (rankId:SkyboundAcademyRankId)=>Promise<{ok:boolean;cost:number;progress:SkyboundAcademyEventProgress;failureReason?:string}>;
}

interface SkyboundEvaluatorConfig {
  initialSave: SkyboundAcademySave;
  selectedRankId: SkyboundAcademyRankId;
  selectedLessonId: SkyboundLessonId;
}

interface SkyboundExpeditionMinigameProps extends IslandRunMinigameProps {
  evaluatorConfig?: SkyboundEvaluatorConfig;
}

const createAttemptId=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():`skybound-${Date.now()}-${Math.round(performance.now())}`;

export default function SkyboundExpeditionMinigame({onComplete,ticketBudget=0,launchConfig,evaluatorConfig}:SkyboundExpeditionMinigameProps) {
  const canonicalConfig=launchConfig?.mode==='pilot_academy'?launchConfig as unknown as SkyboundCanonicalLaunchConfig:null;
  const initial=useRef(evaluatorConfig?.initialSave??canonicalConfig?.initialProgress??loadSkyboundAcademySave()).current;
  const flightRef=useRef<SkyboundFlightState|null>(null);
  const activeAttemptIdRef=useRef<string|null>(canonicalConfig?.initialProgress?.activeAttemptId??null);
  const controlRef=useRef<SkyboundFlightControl>({...DEFAULT_CONTROL});
  const aimRef=useRef<SkyboundAimView>(DEFAULT_AIM);
  const upgradesRef=useRef<SkyboundUpgrades>(initial.upgrades);
  const academyRef=useRef<SkyboundAcademyProgress>(initial.progress);
  const phaseRef=useRef<Phase>('aiming');
  const dragStartRef=useRef<{x:number;y:number}|null>(null);
  const flightDragRef=useRef<{x:number;y:number}|null>(null);
  const impactSerialRef=useRef(0);
  const nearMissCountRef=useRef(0);
  const flowLockedRef=useRef(false);
  const launchChargeRef=useRef(false);
  const unlockedAtStart=SKYBOUND_AIRCRAFT_RANKS.filter((rank)=>initial.progress.promotedRankIds.includes(rank.id));
  const latestRank=evaluatorConfig?getSkyboundRank(evaluatorConfig.selectedRankId):unlockedAtStart[unlockedAtStart.length-1]??SKYBOUND_AIRCRAFT_RANKS[0];
  const firstOpen=evaluatorConfig?getSkyboundLesson(evaluatorConfig.selectedLessonId):getSkyboundRankLessons(latestRank.id).find((lesson)=>!initial.progress.completedLessonIds.includes(lesson.id))??getSkyboundRankLessons(latestRank.id)[0];
  const [phase,setPhaseState]=useState<Phase>('aiming');
  const [aim,setAimState]=useState(DEFAULT_AIM);
  const [flight,setFlight]=useState<SkyboundFlightState|null>(null);
  const [upgrades,setUpgradesState]=useState(initial.upgrades);
  const [academy,setAcademyState]=useState(initial.progress);
  const [canonicalTickets,setCanonicalTickets]=useState(()=>canonicalConfig?Math.max(0,Math.floor(canonicalConfig.getTicketsRemaining?.()??ticketBudget)):initial.progress.tickets);
  const [salvage,setSalvage]=useState(initial.salvage);
  const [selectedRankId,setSelectedRankId]=useState<SkyboundAcademyRankId>(latestRank.id);
  const [lessonId,setLessonId]=useState<SkyboundLessonId>(firstOpen.id);
  const [evaluation,setEvaluation]=useState<SkyboundLessonEvaluation|null>(null);
  const [lastReward,setLastReward]=useState(0);
  const [sortieKey,setSortieKey]=useState(0);
  const [showHangar,setShowHangar]=useState(false);
  const [showCertificate,setShowCertificate]=useState(false);
  const [flightStick,setFlightStick]=useState<FlightStickView|null>(null);
  const [impactPulse,setImpactPulse]=useState(false);
  const [flowPulse,setFlowPulse]=useState(false);
  const [launchCharging,setLaunchCharging]=useState(false);
  const [message,setMessage]=useState('Set launch power, release, then fly into the 3D training world.');
  const lesson=getSkyboundLesson(lessonId);
  const rank=getSkyboundRank(lesson.rankId);
  const level=getSkyboundLevel(lesson.levelId);
  const rankLessons=getSkyboundRankLessons(selectedRankId);
  const courseProfile=lesson.standards.some((standard)=>standard.kind==='landing')?'landing' as const:'standard' as const;

  const setPhase=useCallback((next:Phase)=>{phaseRef.current=next;setPhaseState(next);},[]);
  const setAim=useCallback((next:SkyboundAimView)=>{aimRef.current=next;setAimState(next);},[]);
  const setUpgrades=useCallback((next:SkyboundUpgrades)=>{upgradesRef.current=next;setUpgradesState(next);},[]);
  const setAcademy=useCallback((next:SkyboundAcademyProgress)=>{academyRef.current=next;setAcademyState(next);},[]);

  useEffect(()=>{if(!canonicalConfig&&!evaluatorConfig)saveSkyboundAcademySave({progress:academy,upgrades,salvage});},[academy,canonicalConfig,evaluatorConfig,salvage,upgrades]);

  const launch=useCallback(async()=>{
    launchChargeRef.current=false;setLaunchCharging(false);
    const currentAim=aimRef.current;
    if(currentAim.power<0.18){setAim(DEFAULT_AIM);setMessage(`Add more ${rank.aircraftId==='toy_glider'?'sling tension':'launch thrust'} before release.`);return;}
    if(canonicalConfig){const attemptId=createAttemptId();const start=await canonicalConfig.requestSortieStart(attemptId,lesson.id);if(!start.ok){setCanonicalTickets(start.ticketsRemaining);setAim(DEFAULT_AIM);setMessage('No sortie tickets remain. Fill the Island Run reward bar or pass a rank exam.');playIslandRunSound('market_insufficient_coins');return;}activeAttemptIdRef.current=attemptId;setCanonicalTickets(start.ticketsRemaining);setAcademy(start.progress.progress);setUpgrades(start.progress.upgrades);setSalvage(start.progress.salvage);}
    else {const ticket=spendSkyboundSortieTicket(academyRef.current);if(!ticket.ok){setAim(DEFAULT_AIM);setMessage('No sortie tickets remain. Rank exams replenish tickets.');playIslandRunSound('market_insufficient_coins');return;}setAcademy(ticket.progress);}
    const next=createSkyboundFlight({power:currentAim.power,angleDeg:currentAim.angleDeg,upgrades:upgradesRef.current,levelId:lesson.levelId,goalDistance:lesson.goalDistance,aircraftId:rank.aircraftId,assemblyLevel:getSkyboundAssemblyLevel(academyRef.current,rank.id),courseProfile});
    flightRef.current=next;setFlight(next);controlRef.current={...DEFAULT_CONTROL};setEvaluation(null);
    setMessage(level.id==='meadow'?'GROUND SCHOOL — stay above the field. Any ground contact ends the sortie.':'Drag to bank and climb. Ground contact ends the sortie; use altitude deliberately.');setPhase('flying');playIslandRunSound('minigame_open');
  },[canonicalConfig,courseProfile,lesson.goalDistance,lesson.id,lesson.levelId,level.id,rank.aircraftId,setAcademy,setAim,setPhase,setUpgrades]);
  const fullPowerLaunch=()=>{
    if(phaseRef.current!=='aiming'||launchChargeRef.current)return;
    launchChargeRef.current=true;setLaunchCharging(true);
    setMessage(`Launch chief charging ${rank.launchMethod.toLowerCase()}…`);
    const departureAngle=courseProfile==='landing'?14:34;
    const departurePower=courseProfile==='landing'?.72:1;
    const chargeSteps=[
      {power:.22,angleDeg:courseProfile==='landing'?18:36,pullX:-8,pullY:32,dragging:true},
      {power:courseProfile==='landing'?.38:.5,angleDeg:courseProfile==='landing'?20:38,pullX:-14,pullY:72,dragging:true},
      {power:courseProfile==='landing'?.58:.78,angleDeg:courseProfile==='landing'?18:40,pullX:-18,pullY:112,dragging:true},
      {power:departurePower,angleDeg:departureAngle,pullX:-20,pullY:150,dragging:true},
    ];
    chargeSteps.forEach((charged,index)=>window.setTimeout(()=>setAim(charged),index*85));
    window.setTimeout(()=>{const charged={...chargeSteps[chargeSteps.length-1],dragging:false};aimRef.current=charged;setAimState(charged);void launch();},390);
  };

  useEffect(()=>{
    if(phase!=='flying')return undefined;
    let frameId=0;let previous=performance.now();let lastUi=0;
    const animate=async(time:number)=>{
      const current=flightRef.current;if(!current||phaseRef.current!=='flying')return;
      const next=stepSkyboundFlight(current,controlRef.current,upgradesRef.current,time-previous);previous=time;flightRef.current=next;
      if(time-lastUi>50||next.status!=='flying'){setFlight(next);lastUi=time;}
      if(next.status!=='flying'){
        const terminalCinematicMs=next.status==='crashed'?1_150:next.status==='finished'?850:550;
        await new Promise<void>((resolve)=>window.setTimeout(resolve,terminalCinematicMs));
        if(phaseRef.current!=='flying')return;
        let nextEvaluation=evaluateSkyboundLesson(lessonId,next);let nextAcademy=settleSkyboundAcademyLesson(academyRef.current,nextEvaluation);let reward=scoreSkyboundFlight(next);
        let settlementFailed=false;let settlementSuffix='';
        if(canonicalConfig&&activeAttemptIdRef.current){const settlement=await canonicalConfig.requestSortieSettlement(activeAttemptIdRef.current,next);if(settlement.ok){activeAttemptIdRef.current=null;nextEvaluation=settlement.evaluation;nextAcademy=settlement.progress.progress;reward=settlement.salvageAwarded;setCanonicalTickets(settlement.ticketsRemaining);setUpgrades(settlement.progress.upgrades);setSalvage(settlement.progress.salvage);settlementSuffix=` · +${settlement.salvageAwarded} salvage${settlement.rewardBarProgressAdded>0?` · +${settlement.rewardBarProgressAdded} event progress`:''}${settlement.ticketsAwarded>0?` · +${settlement.ticketsAwarded} tickets`:''}`;}else settlementFailed=true;}
        else setSalvage((value)=>value+reward);
        setEvaluation(nextEvaluation);setAcademy(nextAcademy);setLastReward(reward);
        if(settlementFailed)setMessage('Flight result could not be banked. Return to the board and reopen the Academy.');
        else if(nextEvaluation.passed&&lesson.id==='ace_exam'){setMessage(`GOLD WINGS EARNED — the Academy final is complete.${settlementSuffix}`);setShowCertificate(true);playIslandRunSound('minigame_complete');}
        else if(nextEvaluation.ace){setMessage(`ACE SCORE — every standard met.${settlementSuffix}`);playIslandRunSound('minigame_complete');}
        else if(nextEvaluation.passed&&lesson.exam){const nextRank=SKYBOUND_AIRCRAFT_RANKS[rank.rank];setMessage(`${rank.title.toUpperCase()} CHECKRIDE PASSED — ${nextRank?.aircraftName??'Gold Wings'} unlocked.${settlementSuffix}`);playIslandRunSound('minigame_complete');}
        else if(nextEvaluation.passed){setMessage(`Lesson passed. The next Academy drill is open.${settlementSuffix}`);playIslandRunSound('minigame_complete');}
        else setMessage(`${next.status==='crashed'?'Recovery crew has the pieces. Upgrade and fly again.':'Complete the core flight objective plus one supporting standard.'}${settlementSuffix}`);
        setPhase('result');return;
      }
      frameId=requestAnimationFrame(animate);
    };
    frameId=requestAnimationFrame(animate);return()=>cancelAnimationFrame(frameId);
  },[canonicalConfig,lesson.exam,lesson.id,lessonId,phase,rank.rank,rank.title,setAcademy,setPhase,setUpgrades]);

  useEffect(()=>{
    const down=(event:KeyboardEvent)=>{if(phaseRef.current!=='flying')return;const key=event.key.toLowerCase();if(event.key==='ArrowUp'||key==='w')controlRef.current.pitch=1;if(event.key==='ArrowDown'||key==='s')controlRef.current.pitch=-1;if(event.key==='ArrowLeft'||key==='a')controlRef.current.steer=-1;if(event.key==='ArrowRight'||key==='d')controlRef.current.steer=1;if(event.code==='Space')controlRef.current.boost=true;if(key==='e')controlRef.current.stabilize=true;if(event.code==='Space'||event.key.startsWith('Arrow'))event.preventDefault();};
    const up=(event:KeyboardEvent)=>{const key=event.key.toLowerCase();if(['ArrowUp','ArrowDown'].includes(event.key)||['w','s'].includes(key))controlRef.current.pitch=0;if(['ArrowLeft','ArrowRight'].includes(event.key)||['a','d'].includes(key))controlRef.current.steer=0;if(event.code==='Space')controlRef.current.boost=false;if(key==='e')controlRef.current.stabilize=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[]);

  useEffect(()=>{
    const serial=flight?.impactSerial??0;
    if(phase!=='flying'||serial<=impactSerialRef.current)return undefined;
    impactSerialRef.current=serial;
    setImpactPulse(true);
    setMessage('AIRFRAME HIT — level the wings, rebuild speed, or hold Stabilize.');
    const timeout=window.setTimeout(()=>setImpactPulse(false),420);
    return()=>window.clearTimeout(timeout);
  },[flight?.impactSerial,phase]);

  useEffect(()=>{
    const nearMisses=flight?.nearMisses??0;
    if(phase!=='flying'||nearMisses<=nearMissCountRef.current)return;
    nearMissCountRef.current=nearMisses;
    setMessage(`NEAR MISS ×${nearMisses} — precise flying added salvage and kept the streak alive.`);
  },[flight?.nearMisses,phase]);

  useEffect(()=>{
    const locked=phase==='flying'&&(flight?.flowCharge??0)>=.62;
    if(locked&&!flowLockedRef.current){
      flowLockedRef.current=true;setFlowPulse(true);
      setMessage('FLOW LOCK — hold this pitch and bank. The aircraft is carrying its own speed.');
      playIslandRunSound('reward_bar_fill');
      const timeout=window.setTimeout(()=>setFlowPulse(false),900);
      return()=>window.clearTimeout(timeout);
    }
    if(!locked)flowLockedRef.current=false;
    return undefined;
  },[flight?.flowCharge,phase]);

  const updateFlightControl=(canvas:HTMLCanvasElement,clientX:number,clientY:number)=>{const rect=canvas.getBoundingClientRect();const anchor=flightDragRef.current;if(!anchor)return;const current={x:clientX-rect.left,y:clientY-rect.top};const control=getSkyboundFlightStickControl(anchor,current,Math.min(86,rect.width*.24));controlRef.current.steer=control.steer;controlRef.current.pitch=control.pitch;setFlightStick({anchorX:anchor.x,anchorY:anchor.y,offsetX:control.displayX,offsetY:control.displayY,magnitude:control.magnitude});};
  const handlePointerDown:React.PointerEventHandler<HTMLCanvasElement>=(event)=>{if(phaseRef.current==='aiming'&&launchChargeRef.current)return;event.currentTarget.setPointerCapture(event.pointerId);if(phaseRef.current==='aiming'){dragStartRef.current={x:event.clientX,y:event.clientY};setAim({...aimRef.current,dragging:true});setMessage(`Pull down to build ${rank.aircraftId==='toy_glider'?'sling power':'launch thrust'}, then release.`);}else if(phaseRef.current==='flying'){const rect=event.currentTarget.getBoundingClientRect();flightDragRef.current={x:event.clientX-rect.left,y:event.clientY-rect.top};controlRef.current.pitch=0;controlRef.current.steer=0;setFlightStick({anchorX:flightDragRef.current.x,anchorY:flightDragRef.current.y,offsetX:0,offsetY:0,magnitude:0});}};
  const handlePointerMove:React.PointerEventHandler<HTMLCanvasElement>=(event)=>{if(!event.currentTarget.hasPointerCapture(event.pointerId))return;if(phaseRef.current==='aiming'&&dragStartRef.current){const rect=event.currentTarget.getBoundingClientRect();const pullY=Math.max(0,event.clientY-dragStartRef.current.y);const pullX=dragStartRef.current.x-event.clientX;const power=clamp(Math.hypot(pullX*.55,pullY)/(rect.height*.28),0,1);const angleDeg=courseProfile==='landing'?clamp(10+(pullY/Math.max(1,rect.height))*24+(pullX/Math.max(1,rect.width))*7,10,32):clamp(28+(pullY/Math.max(1,rect.height))*48+(pullX/Math.max(1,rect.width))*10,18,56);setAim({power,angleDeg,pullX,pullY,dragging:true});}else if(phaseRef.current==='flying')updateFlightControl(event.currentTarget,event.clientX,event.clientY);};
  const handlePointerUp:React.PointerEventHandler<HTMLCanvasElement>=(event)=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);dragStartRef.current=null;flightDragRef.current=null;if(phaseRef.current==='aiming')void launch();if(phaseRef.current==='flying'){controlRef.current.pitch=0;controlRef.current.steer=0;setFlightStick(null);}};

  const prepareSortie=(nextLessonId:SkyboundLessonId)=>{const nextLesson=getSkyboundLesson(nextLessonId);setSelectedRankId(nextLesson.rankId);setLessonId(nextLessonId);flightRef.current=null;setFlight(null);setEvaluation(null);controlRef.current={...DEFAULT_CONTROL};flightDragRef.current=null;setFlightStick(null);impactSerialRef.current=0;nearMissCountRef.current=0;flowLockedRef.current=false;setImpactPulse(false);setFlowPulse(false);launchChargeRef.current=false;setLaunchCharging(false);setAim(DEFAULT_AIM);setSortieKey((value)=>value+1);setMessage(`${getSkyboundRank(nextLesson.rankId).launchMethod}: pull down, release, then fly.`);setPhase('aiming');};
  const selectRank=(rankId:SkyboundAcademyRankId)=>{if(phase==='flying'||!academy.promotedRankIds.includes(rankId))return;setSelectedRankId(rankId);const lessons=getSkyboundRankLessons(rankId);const next=lessons.find((candidate)=>!academy.completedLessonIds.includes(candidate.id))??lessons[0];prepareSortie(next.id);};
  const buyUpgrade=async(kind:SkyboundUpgradeKind)=>{const current=upgradesRef.current[kind];const cost=getSkyboundUpgradeCost(kind,current);if(current>=SKYBOUND_MAX_UPGRADE_LEVEL){setMessage(`${UPGRADE_COPY[kind].title} is maxed.`);return;}if(canonicalConfig){const result=await canonicalConfig.requestUpgrade(kind);if(!result.ok){setMessage(result.failureReason==='insufficient_salvage'?`Need ${Math.max(0,result.cost-result.progress.salvage)} more salvage.`:`${UPGRADE_COPY[kind].title} cannot be upgraded yet.`);playIslandRunSound('market_insufficient_coins');return;}setAcademy(result.progress.progress);setUpgrades(result.progress.upgrades);setSalvage(result.progress.salvage);}else{if(salvage<cost){setMessage(`Need ${cost-salvage} more salvage.`);playIslandRunSound('market_insufficient_coins');return;}setSalvage((value)=>value-cost);setUpgrades(upgradeSkyboundPart(upgradesRef.current,kind));}setMessage(`${UPGRADE_COPY[kind].title} upgraded for the whole fleet.`);playIslandRunSound('build_upgrade');};
  const installNextPart=async()=>{const nextPart=getSkyboundNextAssemblyPart(academyRef.current,rank.id);if(!nextPart){setMessage(`${rank.aircraftName} is flight-ready.`);return;}const cost=getSkyboundAssemblyPartCost(rank.id,nextPart.level);if(canonicalConfig){const result=await canonicalConfig.requestAssemblyPart(rank.id);if(!result.ok){setMessage(result.failureReason==='insufficient_salvage'?`Fly again — need ${Math.max(0,result.cost-result.progress.salvage)} more salvage for ${nextPart.name}.`:`${nextPart.name} cannot be installed yet.`);playIslandRunSound('market_insufficient_coins');return;}setAcademy(result.progress.progress);setUpgrades(result.progress.upgrades);setSalvage(result.progress.salvage);}else{if(salvage<cost){setMessage(`Fly again — need ${cost-salvage} more salvage for ${nextPart.name}.`);playIslandRunSound('market_insufficient_coins');return;}const nextAcademy=installSkyboundNextAssemblyPart(academyRef.current,rank.id);setSalvage((value)=>value-cost);setAcademy(nextAcademy);}setSortieKey((value)=>value+1);setMessage(`${nextPart.name} installed. The aircraft now has stronger lift and control.`);playIslandRunSound('build_upgrade');};
  const resetCareer=()=>{if(canonicalConfig||evaluatorConfig)return;const fresh=clearSkyboundAcademySave();setAcademy(fresh.progress);setUpgrades(fresh.upgrades);setSalvage(fresh.salvage);setShowHangar(false);prepareSortie('cadet_launch');};
  const nextLesson=SKYBOUND_LESSONS[lesson.globalIndex+1];
  const distance=Math.round(Math.min(flight?.x??0,lesson.goalDistance));const progress=clamp(distance/lesson.goalDistance,0,1);
  const fuel=flight?clamp(flight.fuel/(1+upgrades.engine*.18),0,1):1;const stability=flight?clamp(flight.stabilizer/(1+upgrades.airframe*.12),0,1):1;
  const telemetry=flight?getSkyboundFlightTelemetry(flight):null;
  const director=flight?getSkyboundFlightDirector(flight,upgrades):null;
  const liveStandards=flight?getSkyboundLessonStandardResults(lesson.id,flight):[];
  const landingZone=courseProfile==='landing'?getSkyboundLandingZone(lesson.goalDistance):null;
  const landingZoneDistance=flight&&landingZone?Math.max(0,Math.ceil(landingZone.startX-flight.x)):null;
  const landingSpeedKmh=flight?Math.round(Math.hypot(flight.vx,flight.vy)*3.6):0;
  const completed=academy.completedLessonIds.length;
  const assemblyLevel=getSkyboundAssemblyLevel(academy,rank.id);
  const assemblyParts=getSkyboundAssemblyParts(rank.id);
  const nextAssemblyPart=getSkyboundNextAssemblyPart(academy,rank.id);
  const nextAssemblyCost=nextAssemblyPart?getSkyboundAssemblyPartCost(rank.id,nextAssemblyPart.level):0;
  const scoreBreakdown=flight?getSkyboundFlightScoreBreakdown(flight):null;
  const terminalCopy=flight?.terminalReason?TERMINAL_COPY[flight.terminalReason]:null;

  return <main className={`skybound skybound--${rank.id}`} aria-label="Skybound Pilot Academy full 3D event">
    <section className="skybound__shell">
      <header className="skybound__header">
        <button type="button" className="skybound__close" aria-label="Exit Pilot Academy" onClick={()=>onComplete({completed:false})}>×</button>
        <button type="button" className="skybound__title-button" onClick={()=>setShowHangar(true)}><span className="skybound__eyebrow">LIMITED EVENT · PILOT SCHOOL</span><h1>Skybound Academy</h1></button>
        <div className="skybound__wallet"><span className="skybound__tickets">🎟 {canonicalConfig?canonicalTickets:academy.tickets}</span><span className="skybound__salvage"><b>◆</b>{salvage}</span></div>
      </header>

      <nav className="skybound__ranks" aria-label="Pilot ranks">
        {SKYBOUND_AIRCRAFT_RANKS.map((item)=>{const unlocked=academy.promotedRankIds.includes(item.id);const medal=academy.medalRankIds.includes(item.id);return <button type="button" key={item.id} disabled={!unlocked||phase==='flying'} className={`${unlocked?'is-unlocked':''} ${selectedRankId===item.id?'is-active':''}`} onClick={()=>selectRank(item.id)} title={`${item.title}: ${item.aircraftName}`}><span>{medal?'🏅':unlocked?'✈':'⌁'}</span><b>{item.title}</b><small>{item.aircraftName}</small></button>;})}
      </nav>
      <nav className="skybound__lessons" aria-label={`${getSkyboundRank(selectedRankId).title} lessons`}>
        {rankLessons.map((candidate)=>{const unlocked=isSkyboundLessonUnlocked(academy,candidate.id);const complete=academy.completedLessonIds.includes(candidate.id);const ace=academy.aceLessonIds.includes(candidate.id);return <button type="button" key={candidate.id} disabled={!unlocked||phase==='flying'} className={candidate.id===lessonId?'is-active':''} onClick={()=>prepareSortie(candidate.id)}><span>{ace?'★':complete?'✓':candidate.exam?'E':candidate.index+1}</span>{candidate.shortName}</button>;})}
      </nav>

      <div className="skybound__course-row"><div><strong>{rank.callsign} · {lesson.name}</strong><span>{lesson.briefing}</span><em>{level.trainingStage} · AGL {level.targetAltitudeMin}–{level.targetAltitudeMax}m</em></div><strong>{distance} / {lesson.goalDistance}m</strong></div>
      <div className="skybound__progress"><i style={{width:`${progress*100}%`}} /></div>
      <div className={`skybound__stage is-${phase}${telemetry?` is-${telemetry.condition}`:''}${impactPulse?' has-impact':''}${(flight?.flowCharge??0)>=.62?' has-flow-lock':''}`}>
        <SkyboundExpeditionThreeStage phase={phase} levelId={lesson.levelId} goalDistance={lesson.goalDistance} courseProfile={courseProfile} aircraftId={rank.aircraftId} assemblyLevel={assemblyLevel} flight={flight} aim={aim} sortieKey={sortieKey} boosting={controlRef.current.boost} stabilizing={controlRef.current.stabilize===true} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}/>
        {phase==='flying'&&flight&&director&&flight.elapsedMs>=2400&&<div className={`skybound__flight-director is-${director.mode}`} aria-hidden="true"><i className="skybound__director-horizon" style={{transform:`translateY(${clamp(flight.pitchRad*58,-31,31)}px) rotate(${-flight.bankRad}rad)`}}/><em className="skybound__director-gate"><span/><span/></em><b className="skybound__director-marker" style={{transform:`translate(${clamp(flight.bankRad*35,-26,26)}px, ${clamp(-director.velocityAngleRad*72,-29,29)}px)`}}/><strong>{director.cue}</strong><small>{Math.round(director.targetSpeedKmh)} TARGET · {director.speedDeltaKmh>0?'+':''}{director.speedDeltaKmh} km/h</small></div>}
        {phase==='flying'&&flight&&<div className="skybound__mission-progress" aria-label={`${lesson.name} live standards`}><strong>LESSON {lesson.globalIndex+1}/20 · LIVE</strong>{liveStandards.map((standard,index)=><span key={standard.id} className={`${standard.met?'is-met':''}${index===1?' is-core':''}`}><i>{standard.met?'✓':index===1?'★':'○'}</i><b>{standard.label}</b><small>{standardProgressCopy(standard)}</small></span>)}</div>}
        {phase==='flying'&&flight&&landingZone&&landingZoneDistance!==null&&flight.x>=landingZone.startX-170&&<div className={`skybound__landing-coach ${flight.x>=landingZone.startX?'is-zone':''}`}><strong>{flight.x>=landingZone.startX?'TOUCHDOWN ZONE':`RUNWAY · ${landingZoneDistance}m`}</strong><span>{landingSpeedKmh<=58?'SPEED SET · LEVEL WINGS':`SLOW TO 58 km/h · ${landingSpeedKmh} NOW`}</span></div>}
        {phase==='aiming'&&<><div className="skybound__aircraft-card"><span>RANK {rank.rank} · {rank.title} · BUILD {assemblyLevel}/4</span><strong>{assemblyLevel===0?'Fuselage Test Article':rank.aircraftName}</strong><small>{rank.launchMethod} · {rank.theme}</small></div><div className="skybound__aim-hud"><span><b>{Math.round(aim.power*100)}%</b>{rank.aircraftId==='toy_glider'?'SLING POWER':'LAUNCH THRUST'}</span><span><b>{Math.round(aim.angleDeg)}°</b>DEPARTURE</span></div><button type="button" className="skybound__launch-button" disabled={launchCharging||(canonicalConfig?canonicalTickets:academy.tickets)<1} onClick={fullPowerLaunch}>{(canonicalConfig?canonicalTickets:academy.tickets)<1?'EARN A TICKET ON THE REWARD BAR':launchCharging?'CHARGING LAUNCH…':'FLY TEST · 1 TICKET'}</button><div className="skybound__tip">INSTRUCTOR · {assemblyLevel<4?'This incomplete airframe will fight you. Fly far, earn salvage, and build it.':lesson.instructorTip}</div></>}
        {phase==='flying'&&telemetry&&<><div className={`skybound__telemetry is-${telemetry.condition}${(flight?.flowCharge??0)>=.62?' is-flow-locked':''}`}><span>{(flight?.flowCharge??0)>=.62?'✦ FLOW LOCK':telemetry.warning?'⚠ '+telemetry.label:telemetry.label}</span><strong>{Math.round(telemetry.speed*3.6)}<small>km/h</small></strong><div><b>AGL {Math.round(telemetry.clearance)}m</b><b>FLOW {Math.round((flight?.smoothFlightMs??0)/1000)}s</b></div><i className="skybound__flow-meter"><b style={{width:`${(flight?.flowCharge??0)*100}%`}}/></i><small>{(flight?.flowCharge??0)>=.62?'Hold this pitch and bank — speed is carrying itself.':telemetry.instruction}</small></div><div className="skybound__flight-stats"><span><b>◆</b> {flight?.salvageCollected??0}</span><span><b>◎</b> {flight?.ringsCleared??0}</span><span className={(flight?.integrity??3)<=1?'has-hits':''}><b>▰</b> {flight?.integrity??INTEGRITY[rank.id]}/{INTEGRITY[rank.id]}</span>{((flight?.currentStreak??0)>1||(flight?.nearMisses??0)>0)&&<span className="is-streak">{(flight?.nearMisses??0)>0?`◇${flight?.nearMisses} · `:''}×{flight?.currentStreak}</span>}</div>{flowPulse&&<div className="skybound__flow-callout"><b>✦ FLOW LOCK</b><span>{Math.round(getSkyboundFlowTargetSpeedKmh(rank.aircraftId,upgrades))} km/h corridor captured</span></div>}{impactPulse&&<div className="skybound__impact-callout"><b>AIRFRAME HIT</b><span>{flight?.integrity??0} integrity remaining · level the wings</span></div>}{flight?.status==='crashed'&&terminalCopy&&<div className="skybound__crash-callout"><b>{terminalCopy.label}</b><span>{terminalCopy.detail}</span></div>}{flight&&flight.elapsedMs<2200&&!flightStick&&<div className="skybound__stick-coach"><b>PRESS + DRAG ANYWHERE</b><span>{level.id==='meadow'?'Stay above the grass — ground contact ends the sortie':`Find level flight near ${Math.round(getSkyboundFlowTargetSpeedKmh(rank.aircraftId,upgrades))} km/h to lock FLOW`}</span></div>}{flightStick&&<div className="skybound__flight-stick" style={{left:flightStick.anchorX,top:flightStick.anchorY}}><span>FLIGHT STICK</span><i style={{transform:`translate(${flightStick.offsetX}px, ${flightStick.offsetY}px) scale(${.85+flightStick.magnitude*.18})`}}/></div>}<div className="skybound__flight-hud"><div className="skybound__meters"><label>BOOST<i><b style={{width:`${fuel*100}%`}}/></i></label><label>STABILITY<i><b style={{width:`${stability*100}%`}}/></i></label></div><div className="skybound__actions"><button type="button" className="skybound__stabilize" disabled={stability<=0} onPointerDown={(event)=>{event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);controlRef.current.stabilize=true;}} onPointerUp={(event)=>{event.stopPropagation();controlRef.current.stabilize=false;}}>STABILIZE</button><button type="button" className="skybound__boost" disabled={fuel<=0||assemblyLevel<4} onPointerDown={(event)=>{event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);controlRef.current.boost=true;}} onPointerUp={(event)=>{event.stopPropagation();controlRef.current.boost=false;}}>{assemblyLevel<4?'NO DRIVE':'BOOST'}</button></div></div></>}
        {phase==='result'&&flight&&evaluation&&scoreBreakdown&&<div className={`skybound__result ${flight.status==='crashed'?'is-crash':''}`} role="dialog" aria-label="Academy lesson result"><span className={`skybound__result-badge ${evaluation.ace?'is-finished':''}`}>{evaluation.ace?'ACE · 3/3':evaluation.passed?'PASS · 2/3+':terminalCopy?.label??'FLIGHT TEST'}</span><strong>{Math.round(Math.min(flight.x,flight.goalDistance))}m</strong>{terminalCopy&&<p className="skybound__terminal-summary">{terminalCopy.detail}</p>}<span>+{lastReward} salvage · +{evaluation.academyXpEarned} XP · {Math.round(flight.smoothFlightMs/1000)}s flow</span><div className="skybound__score-breakdown"><span>DISTANCE <b>+{scoreBreakdown.distance}</b></span><span>FLOW <b>+{scoreBreakdown.flow}</b></span><span>COURSE <b>+{scoreBreakdown.course}</b></span><span>BONUSES <b>+{scoreBreakdown.finish+scoreBreakdown.landing+scoreBreakdown.altitude}</b></span>{scoreBreakdown.collisionPenalty>0&&<span>IMPACTS <b>-{scoreBreakdown.collisionPenalty}</b></span>}</div><div className="skybound__result-stats"><span><b>◆</b>{flight.salvageCollected}</span><span><b>◎</b>{flight.ringsCleared}</span><span><b>◇</b>{flight.nearMisses}</span><span className={flight.hazardHits+flight.terrainImpacts>0?'has-hits':''}><b>⚠</b>{flight.hazardHits+Math.min(3,flight.terrainImpacts)}</span><span><b>×</b>{flight.bestStreak}</span></div><div className="skybound__standards">{evaluation.standardResults.map((standard)=><span key={standard.id} className={standard.met?'is-met':''}><b>{standard.met?'✓':'○'}</b>{standard.label}</span>)}</div>{evaluation.passed&&lesson.exam&&<div className="skybound__promotion">🏅 {rank.title.toUpperCase()} MEDAL EARNED{nextLesson?` · ${getSkyboundRank(nextLesson.rankId).aircraftName.toUpperCase()} UNLOCKED`:''}</div>}<button type="button" onClick={()=>evaluation.passed&&nextLesson?prepareSortie(nextLesson.id):prepareSortie(lessonId)}>{evaluation.passed&&nextLesson?'NEXT FLIGHT':'FLY AGAIN · 1 TICKET'}</button></div>}
      </div>
      <p className="skybound__message" aria-live="polite">{message}</p>
      <section className={`skybound__assembly ${assemblyLevel===4?'is-complete':''}`} aria-label={`${rank.aircraftName} assembly`}><div className="skybound__assembly-head"><span><b>HANGAR BUILD · {rank.callsign.toUpperCase()}</b><small>{assemblyLevel===4?'FLIGHT READY':`${assemblyLevel}/4 PARTS · fly farther to earn the next part`}</small></span>{nextAssemblyPart&&<button type="button" disabled={phase==='flying'} className={salvage>=nextAssemblyCost?'can-buy':''} onClick={()=>{void installNextPart();}}><b>INSTALL {nextAssemblyPart.shortName}</b><small>◆ {nextAssemblyCost}</small></button>}</div><div className="skybound__assembly-track"><span className="is-built"><i>●</i>BODY</span>{assemblyParts.map((part)=><span key={part.level} className={assemblyLevel>=part.level?'is-built':''}><i>{assemblyLevel>=part.level?'✓':'○'}</i>{part.shortName}</span>)}</div>{nextAssemblyPart&&<p><b>NEXT · {nextAssemblyPart.name}</b>{nextAssemblyPart.effect}</p>}</section>
      <section className="skybound__upgrades" aria-label="Fleet upgrades">{(Object.keys(UPGRADE_COPY) as SkyboundUpgradeKind[]).map((kind)=>{const copy=UPGRADE_COPY[kind];const level=upgrades[kind];const cost=getSkyboundUpgradeCost(kind,level);const maxed=level>=SKYBOUND_MAX_UPGRADE_LEVEL;return <button type="button" key={kind} disabled={phase==='flying'||maxed} className={salvage>=cost&&phase!=='flying'?'can-buy':''} onClick={()=>{void buyUpgrade(kind);}}><span className="skybound__upgrade-icon">{copy.icon}</span><span><strong>{copy.title}</strong><small>{copy.effect}</small></span><span className="skybound__upgrade-price"><b>LV {level}</b><small>{maxed?'MAX':`◆ ${cost}`}</small></span></button>;})}</section>
    </section>

    {showHangar&&<div className="skybound__overlay"><section className="skybound__hangar" role="dialog" aria-label="Academy career"><button className="skybound__overlay-close" onClick={()=>setShowHangar(false)}>×</button><span className="skybound__eyebrow">CADET CAREER RECORD</span><h2>Five aircraft. Twenty flights.</h2><figure className="skybound__fleet-evolution"><img src={fleetEvolutionStripUrl} alt="Toy glider evolving through prop and jet trainers into the Goldwing fighter"/><figcaption><span>CADET</span><span>TRAINEE</span><span>AVIATOR</span><span>ELITE</span><span>ACE</span></figcaption></figure><div className="skybound__career-score"><strong>{completed}<small>/ 20 LESSONS</small></strong><strong>{academy.medalRankIds.length}<small>/ 5 MEDALS</small></strong><strong>{academy.academyXp}<small>ACADEMY XP</small></strong></div><div className="skybound__fleet-list">{SKYBOUND_AIRCRAFT_RANKS.map((item)=><div key={item.id} className={academy.promotedRankIds.includes(item.id)?'is-unlocked':''}><span>{academy.medalRankIds.includes(item.id)?'🏅':academy.promotedRankIds.includes(item.id)?'✈':'⌁'}</span><div><b>{item.rank}. {item.title} · {item.callsign}</b><small>{item.aircraftName} · {item.launchMethod}</small></div></div>)}</div>{academy.certificateAwarded&&<button className="skybound__certificate-button" onClick={()=>setShowCertificate(true)}>VIEW GOLD WINGS CERTIFICATE</button>}{!canonicalConfig&&!evaluatorConfig&&<button className="skybound__reset" onClick={resetCareer}>RESET EVENT CAREER</button>}</section></div>}
    {showCertificate&&<div className="skybound__overlay skybound__overlay--certificate"><section className="skybound__certificate" role="dialog" aria-label="Gold Wings military pilot certificate"><button className="skybound__overlay-close" onClick={()=>setShowCertificate(false)}>×</button><span className="skybound__certificate-wings">◁ ★ ▷</span><small>SKYBOUND FLIGHT CORPS</small><h2>Gold Wings Military Pilot Certificate</h2><p>This certifies that the Academy pilot completed all five aircraft ranks and passed the Final Wings Exam with courage, control, and consistency.</p><div className="skybound__certificate-medal">🏅</div><strong>ACADEMY ACE</strong><span>Certificate No. SB-{String(Math.max(1,academy.sorties)).padStart(4,'0')}</span><button onClick={()=>onComplete({completed:true})}>COMPLETE EVENT</button></section></div>}
  </main>;
}

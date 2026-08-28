import { getIslandRunAudioEnabled } from '../../level-worlds/services/islandRunAudio';
import type { SkyboundFlightState } from '../../level-worlds/services/skyboundExpeditionFlight';
import type { SkyboundAircraftId } from '../../level-worlds/services/skyboundPilotAcademy';

export interface SkyboundEngineAudioProfile {
  frequencyHz:number;
  harmonicHz:number;
  filterHz:number;
  gain:number;
  flutterHz:number;
}

export interface SkyboundEngineAudioController {
  update:(flight:SkyboundFlightState,boosting:boolean,struggling:boolean)=>void;
  stop:()=>void;
}

const AIRCRAFT_AUDIO:Record<SkyboundAircraftId,{baseHz:number;harmonicRatio:number;filterHz:number;gain:number;wave:OscillatorType}>={
  toy_glider:{baseHz:54,harmonicRatio:1.5,filterHz:430,gain:.014,wave:'sine'},
  prop_trainer:{baseHz:68,harmonicRatio:2,filterHz:620,gain:.023,wave:'sawtooth'},
  jet_trainer:{baseHz:112,harmonicRatio:1.48,filterHz:920,gain:.022,wave:'sawtooth'},
  storm_interceptor:{baseHz:138,harmonicRatio:1.62,filterHz:1180,gain:.024,wave:'square'},
  goldwing_fighter:{baseHz:166,harmonicRatio:1.72,filterHz:1480,gain:.026,wave:'sawtooth'},
};

const clamp=(value:number,minimum:number,maximum:number)=>Math.max(minimum,Math.min(maximum,value));

export function getSkyboundEngineAudioProfile(
  aircraftId:SkyboundAircraftId,
  flight:Pick<SkyboundFlightState,'vx'|'vy'|'flowCharge'|'integrity'|'hazardHits'>,
  boosting:boolean,
  struggling:boolean,
):SkyboundEngineAudioProfile {
  const tuning=AIRCRAFT_AUDIO[aircraftId];
  const speedKmh=Math.hypot(flight.vx,flight.vy)*3.6;
  const speedEnergy=clamp(speedKmh/240,.18,1.35);
  const flow=clamp(flight.flowCharge,0,1);
  const integrityCapacity=Math.max(1,flight.integrity+flight.hazardHits);
  const damage=1-clamp(flight.integrity/integrityCapacity,0,1);
  const boostFactor=boosting?1.24:1;
  const frequencyHz=tuning.baseHz*(.72+speedEnergy*.56)*boostFactor;
  return {
    frequencyHz,
    harmonicHz:frequencyHz*tuning.harmonicRatio*(1+flow*.035),
    filterHz:tuning.filterHz+(speedEnergy*520)+(boosting?760:0)+(flow*240),
    gain:tuning.gain*(.68+speedEnergy*.3+(boosting?.34:0)+(flow*.12))*(1-damage*.16),
    flutterHz:struggling?8.4+damage*5.2:flow>0.62?1.35:3.1,
  };
}

function createNoopController():SkyboundEngineAudioController {
  return{update:()=>undefined,stop:()=>undefined};
}

export function startSkyboundEngineAudio(aircraftId:SkyboundAircraftId,forceEnabled=false):SkyboundEngineAudioController {
  const audioAllowed=()=>forceEnabled||getIslandRunAudioEnabled();
  if(typeof window==='undefined'||!audioAllowed())return createNoopController();
  const AudioContextConstructor=window.AudioContext
    ?? (window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!AudioContextConstructor)return createNoopController();

  try{
    const context=new AudioContextConstructor();
    const tuning=AIRCRAFT_AUDIO[aircraftId];
    const master=context.createGain();
    const filter=context.createBiquadFilter();
    const primary=context.createOscillator();
    const harmonic=context.createOscillator();
    const harmonicGain=context.createGain();
    const flutter=context.createOscillator();
    const flutterDepth=context.createGain();

    master.gain.value=.0001;
    filter.type='lowpass';
    filter.Q.value=1.25;
    primary.type=tuning.wave;
    harmonic.type=aircraftId==='toy_glider'?'sine':'triangle';
    harmonicGain.gain.value=.24;
    flutter.type='sine';
    flutter.frequency.value=3.1;
    flutterDepth.gain.value=.003;

    primary.connect(filter);
    harmonic.connect(harmonicGain).connect(filter);
    filter.connect(master).connect(context.destination);
    flutter.connect(flutterDepth).connect(master.gain);
    primary.start();harmonic.start();flutter.start();
    void context.resume().catch(()=>undefined);

    let stopped=false;
    return{
      update:(flight,boosting,struggling)=>{
        if(stopped||!audioAllowed())return;
        const profile=getSkyboundEngineAudioProfile(aircraftId,flight,boosting,struggling);
        const now=context.currentTime;
        primary.frequency.setTargetAtTime(profile.frequencyHz,now,.055);
        harmonic.frequency.setTargetAtTime(profile.harmonicHz,now,.065);
        filter.frequency.setTargetAtTime(profile.filterHz,now,.08);
        master.gain.setTargetAtTime(profile.gain,now,.09);
        flutter.frequency.setTargetAtTime(profile.flutterHz,now,.12);
        flutterDepth.gain.setTargetAtTime(struggling?.0075:(flight.flowCharge>.62?.0012:.003),now,.1);
      },
      stop:()=>{
        if(stopped)return;
        stopped=true;
        const now=context.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(.0001,now,.045);
        window.setTimeout(()=>{
          try{primary.stop();harmonic.stop();flutter.stop();}catch{/* already stopped */}
          void context.close().catch(()=>undefined);
        },180);
      },
    };
  }catch{
    return createNoopController();
  }
}

import {
  SKYBOUND_LEVELS,
  SKYBOUND_MAX_STEP_MS,
  SKYBOUND_STARTER_UPGRADES,
  createSkyboundFlight,
  getSkyboundFlowTargetSpeedKmh,
  getSkyboundCourseObjects,
  getSkyboundGroundHeight,
  getSkyboundLandingZone,
  getSkyboundTouchdownResult,
  getSkyboundUpgradeCost,
  scoreSkyboundFlight,
  stepSkyboundFlight,
  upgradeSkyboundPart,
  type SkyboundFlightState,
  type SkyboundUpgrades,
} from '../skyboundExpeditionFlight';
import { getSkyboundFlightDirector, getSkyboundFlightStickControl, getSkyboundFlightTelemetry } from '../skyboundFlightFeel';
import { SKYBOUND_AIRCRAFT_RANKS, SKYBOUND_LESSONS } from '../skyboundPilotAcademy';
import { getSkyboundLaunchFacility } from '../../../games/skybound-expedition/skyboundLaunchFacilities';
import { getSkyboundWorldPresentation } from '../../../games/skybound-expedition/skyboundWorldPresentation';
import { getSkyboundEngineAudioProfile } from '../../../games/skybound-expedition/skyboundFlightAudio';

type TestCase = { name: string; run: () => void };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function simulate(
  upgrades: SkyboundUpgrades,
  boost: boolean,
  pitch = 0.42,
): SkyboundFlightState {
  let state = createSkyboundFlight({
    power: 1,
    angleDeg: 35,
    upgrades,
    levelId: 'meadow',
  });
  for (let step = 0; step < 2_000 && state.status === 'flying'; step += 1) {
    state = stepSkyboundFlight(state, { pitch, boost }, upgrades, 16);
  }
  return state;
}

export const skyboundExpeditionFlightTests: TestCase[] = [
  {
    name: 'creates the same launch state for the same input',
    run: () => {
      const input = {
        power: 0.83,
        angleDeg: 41,
        upgrades: { launcher: 2, airframe: 1, engine: 3 },
        levelId: 'canyon' as const,
      };
      const first = createSkyboundFlight(input);
      const second = createSkyboundFlight(input);
      assert(JSON.stringify(first) === JSON.stringify(second), 'launch state should be deterministic');
    },
  },
  {
    name: 'makes every launcher level increase throw speed',
    run: () => {
      const speeds = Array.from({ length: 6 }, (_, launcher) => {
        const state = createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: { ...SKYBOUND_STARTER_UPGRADES, launcher },
          levelId: 'meadow',
        });
        return Math.hypot(state.vx, state.vy);
      });
      assert(speeds.every((speed, index) => index === 0 || speed > speeds[index - 1]), 'launch speed must rise at each level');
    },
  },
  {
    name: 'teaches a readable rank-by-rank Flow speed instead of runaway launch velocity',
    run:()=>{
      const targets=SKYBOUND_AIRCRAFT_RANKS.map((rank)=>getSkyboundFlowTargetSpeedKmh(rank.aircraftId,SKYBOUND_STARTER_UPGRADES));
      assert(targets.every((target,index)=>index===0||target>targets[index-1]),'Flow target should rise with aircraft rank');
      assert(targets[0]>=120&&targets[4]<=220,'the unupgraded Academy should teach a human-readable 125–215 km/h Flow ladder');
      const aceTarget=getSkyboundFlowTargetSpeedKmh('goldwing_fighter',{launcher:5,airframe:5,engine:5});
      assert(aceTarget===250,'the fully upgraded Goldwing should crest at a deliberate 250 km/h Flow target');
      let ace=createSkyboundFlight({power:1,angleDeg:35,upgrades:{launcher:5,airframe:5,engine:5},levelId:'stratosphere',aircraftId:'goldwing_fighter',assemblyLevel:4});
      for(let frame=0;frame<60;frame+=1)ace=stepSkyboundFlight(ace,{pitch:0,steer:0,boost:false}, {launcher:5,airframe:5,engine:5},64);
      assert(Math.hypot(ace.vx,ace.vy)*3.6<340,'unassisted Goldwing flight should not create runaway speed above its Flow corridor');
    },
  },
  {
    name: 'clamps long frame gaps to the simulation time budget',
    run: () => {
      const state = createSkyboundFlight({
        power: 1,
        angleDeg: 35,
        upgrades: SKYBOUND_STARTER_UPGRADES,
        levelId: 'meadow',
      });
      const next = stepSkyboundFlight(state, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 2_000);
      assert(next.elapsedMs === SKYBOUND_MAX_STEP_MS, 'large dt should be clamped to 64ms');
    },
  },
  {
    name: 'makes an upgraded pulse drive extend a controlled Ground School flight',
    run: () => {
      const passive = simulate(SKYBOUND_STARTER_UPGRADES, false);
      const boosted = simulate({ launcher: 0, airframe: 0, engine: 3 }, true);
      assert(passive.status !== 'flying' && boosted.status !== 'flying', 'both deterministic training flights should settle');
      assert(boosted.x > passive.x * 1.25, 'pulse drive should create materially more distance before contact or the finish gate');
    },
  },
  {
    name: 'keeps upgrade purchases immutable and progressively more expensive',
    run: () => {
      const starter = { ...SKYBOUND_STARTER_UPGRADES };
      const upgraded = upgradeSkyboundPart(starter, 'airframe');
      assert(starter.airframe === 0, 'source upgrades must not mutate');
      assert(upgraded.airframe === 1, 'selected part should gain one level');
      assert(getSkyboundUpgradeCost('airframe', 1) > getSkyboundUpgradeCost('airframe', 0), 'later upgrades should cost more');
    },
  },
  {
    name: 'increases course goals and awards a completion premium',
    run: () => {
      assert(SKYBOUND_LEVELS[1].goalDistance > SKYBOUND_LEVELS[0].goalDistance, 'canyon should be longer than meadow');
      assert(SKYBOUND_LEVELS[2].goalDistance > SKYBOUND_LEVELS[1].goalDistance, 'storm should be the longest course');
      const finished = {
        ...createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: SKYBOUND_STARTER_UPGRADES,
          levelId: 'meadow',
        }),
        status: 'finished' as const,
        x: SKYBOUND_LEVELS[0].goalDistance,
        maxAltitude: 40,
      };
      const landed = { ...finished, status: 'landed' as const };
      assert(scoreSkyboundFlight(finished) > scoreSkyboundFlight(landed), 'finishing the course should beat an equal-distance landing');
    },
  },
  {
    name: 'progresses from grounded school to high-altitude Ace operations',
    run: () => {
      assert(SKYBOUND_LEVELS[0].startClearance < 2, 'Ground School should launch immediately above the field');
      assert(SKYBOUND_LEVELS[0].targetAltitudeMax <= 22, 'Ground School should remain visibly close to terrain');
      assert(SKYBOUND_LEVELS.every((level, index) => index === 0 || level.targetAltitudeMin > SKYBOUND_LEVELS[index - 1].targetAltitudeMin), 'each world should teach a progressively higher altitude band');
      assert(SKYBOUND_LEVELS.every((level, index) => index === 0 || level.finishAltitude > SKYBOUND_LEVELS[index - 1].finishAltitude), 'finish gates should climb with pilot rank');
      const expectedWorldByRank = { cadet:'meadow',trainee:'coast',aviator:'canyon',elite:'storm',ace:'stratosphere' } as const;
      for (const lesson of SKYBOUND_LESSONS) assert(lesson.levelId === expectedWorldByRank[lesson.rankId], `${lesson.rankId} lessons should stay in their graduated training world`);
      assert(getSkyboundWorldPresentation('meadow').continuousTerrain,'Cadet should launch from continuous terrain');
      assert(getSkyboundWorldPresentation('coast').continuousTerrain,'Trainee should graduate to a real coastal runway');
      assert(getSkyboundWorldPresentation('canyon').continuousTerrain,'Aviator should fly inside a continuous canyon instead of floating islands');
      assert(!getSkyboundWorldPresentation('storm').continuousTerrain&&!getSkyboundWorldPresentation('stratosphere').continuousTerrain,'only advanced ranks should graduate to suspended carrier and stratosphere facilities');
      const meadowObjects = getSkyboundCourseObjects('meadow');
      assert(meadowObjects.every((object) => object.y <= SKYBOUND_LEVELS[0].targetAltitudeMax + 1), 'Ground School objects should remain in the low training corridor');
    },
  },
  {
    name: 'defines an authored deterministic course mix for every level',
    run: () => {
      for (const level of SKYBOUND_LEVELS) {
        const first = getSkyboundCourseObjects(level.id);
        const second = getSkyboundCourseObjects(level.id);
        assert(JSON.stringify(first) === JSON.stringify(second), `${level.id} objects should be deterministic`);
        assert(new Set(first.map((object)=>object.id)).size===first.length,`${level.id} should not contain duplicate course-object identities`);
        assert(first.every((object)=>object.y>=level.targetAltitudeMin&&object.y<=level.targetAltitudeMax),`${level.id} objects should stay inside its taught altitude corridor`);
        assert(first.some((object) => object.kind === 'salvage'), `${level.id} should include salvage`);
        assert(first.some((object) => object.kind === 'wind_ring'), `${level.id} should include a wind ring`);
        assert(first.some((object) => object.kind === 'hazard'), `${level.id} should include a hazard`);
      }
    },
  },
  {
    name: 'clears a descending approach corridor and touchdown zone for landing lessons',
    run: () => {
      const goalDistance=580;
      const zone=getSkyboundLandingZone(goalDistance);
      const approach=getSkyboundCourseObjects('coast',goalDistance,'landing');
      const approachRings=approach.filter((object)=>object.id.includes('landing-approach'));
      assert(zone.startX===520&&zone.endX===580,'Landing Pattern should expose its declared 520–580m runway zone');
      assert(approachRings.length===3,'landing profile should provide three descending approach gates');
      assert(approachRings.every((object,index)=>index===0||object.y<approachRings[index-1].y),'approach gates should descend toward the runway');
      assert(approachRings.every((object)=>object.lateralX===0),'landing approach gates should align with the runway centerline');
      assert(approachRings[2].y<SKYBOUND_LEVELS[1].targetAltitudeMin,'the flare gate should descend below the cruise corridor');
      assert(approach.every((object)=>object.x<zone.startX),'no airborne course object may obstruct the touchdown zone');
      const flight=createSkyboundFlight({power:1,angleDeg:35,upgrades:SKYBOUND_STARTER_UPGRADES,levelId:'coast',goalDistance,aircraftId:'prop_trainer',assemblyLevel:4,courseProfile:'landing'});
      assert(flight.courseProfile==='landing','landing profile should survive in the deterministic flight state');
      const flareGate=approachRings[2];
      const stabilized=stepSkyboundFlight({...flight,x:flareGate.x-1,y:flareGate.y,vx:30,vy:-2,pitchRad:.18}, {pitch:0,steer:0,boost:false,stabilize:false}, SKYBOUND_STARTER_UPGRADES, 50);
      assert(stabilized.ringsCleared===1,'crossing the flare gate should clear it');
      assert(stabilized.vx<=15.5,'the flare gate should bleed speed into the safe touchdown envelope');
    },
  },
  {
    name: 'authors advanced storm and Gold Wings formations instead of repeating the generic course',
    run: () => {
      const storm=getSkyboundCourseObjects('storm',1180,'storm_corridor');
      const stormRings=storm.filter((object)=>object.kind==='wind_ring');
      const stormHazards=storm.filter((object)=>object.kind==='hazard');
      assert(stormRings.length===5,'Storm Corridor should teach an exact five-gate line');
      assert(stormHazards.length===4,'Storm Corridor should place four authored blocking spires');
      assert(new Set(stormRings.map((object)=>object.lateralX)).size>=4,'Storm gates should require deliberate crosswind lane changes');
      assert(storm.every((object)=>object.y>=SKYBOUND_LEVELS[3].targetAltitudeMin&&object.y<=SKYBOUND_LEVELS[3].targetAltitudeMax),'Storm Corridor should stay inside the Elite altitude syllabus');

      const formation=getSkyboundCourseObjects('stratosphere',1540,'gold_formation');
      const crests=formation.filter((object)=>object.kind==='salvage');
      const gates=formation.filter((object)=>object.kind==='wind_ring');
      assert(crests.length===12,'Gold Formation should contain exactly the twelve required ceremonial crests');
      assert(gates.length===4,'four gates should divide the Gold Wings route into readable phrases');
      assert(crests.every((crest,index)=>index===0||crest.x>crests[index-1].x),'every formation crest should be collectable in one forward flight');
      assert(Math.min(...crests.map((crest)=>crest.lateralX??0))<=-15&&Math.max(...crests.map((crest)=>crest.lateralX??0))>=15,'the formation should draw both wings across the full taught lateral corridor');
      assert(JSON.stringify(formation)===JSON.stringify(getSkyboundCourseObjects('stratosphere',1540,'gold_formation')),'the ceremony route should remain deterministic');
    },
  },
  {
    name: 'gives every aircraft a distinct responsive engine voice',
    run: () => {
      const flight=createSkyboundFlight({power:1,angleDeg:35,upgrades:SKYBOUND_STARTER_UPGRADES,levelId:'canyon',aircraftId:'jet_trainer'});
      const profiles=SKYBOUND_AIRCRAFT_RANKS.map((rank)=>getSkyboundEngineAudioProfile(rank.aircraftId,flight,false,false));
      assert(new Set(profiles.map((profile)=>Math.round(profile.frequencyHz))).size===profiles.length,'each aircraft rank should have a distinct engine frequency');
      assert(profiles.every((profile,index)=>index===0||profile.frequencyHz>profiles[index-1].frequencyHz),'engine pitch should progress from glider airflow to Goldwing turbine');
      const cruise=getSkyboundEngineAudioProfile('jet_trainer',flight,false,false);
      const boost=getSkyboundEngineAudioProfile('jet_trainer',flight,true,false);
      const struggle=getSkyboundEngineAudioProfile('jet_trainer',{...flight,integrity:1,hazardHits:3},false,true);
      const flow=getSkyboundEngineAudioProfile('jet_trainer',{...flight,flowCharge:.8},false,false);
      assert(boost.frequencyHz>cruise.frequencyHz&&boost.filterHz>cruise.filterHz,'boost should audibly spool the engine up');
      assert(struggle.flutterHz>cruise.flutterHz,'airframe struggle should introduce faster unstable flutter');
      assert(flow.flutterHz<cruise.flutterHz,'Flow should settle the engine into a steadier tone');
    },
  },
  {
    name: 'gives every level a deterministic world identity with multiple visual anchors',
    run: () => {
      const signatures = SKYBOUND_LEVELS.map((level) => {
        const presentation = getSkyboundWorldPresentation(level.id);
        assert(presentation.landmarks.length >= 3, `${level.id} should expose at least three identity anchors`);
        assert(new Set(presentation.landmarks.map((landmark) => landmark.kind)).size >= 3, `${level.id} should combine distinct landmark families`);
        return presentation.signature;
      });
      assert(new Set(signatures).size === SKYBOUND_LEVELS.length, 'each level should have a unique world signature');
    },
  },
  {
    name: 'gives every aircraft rank a distinct authored launch facility',
    run: () => {
      const facilities=SKYBOUND_AIRCRAFT_RANKS.map((rank)=>getSkyboundLaunchFacility(rank.aircraftId));
      assert(new Set(facilities.map((facility)=>facility.id)).size===facilities.length,'every rank should launch from a unique facility');
      assert(new Set(facilities.map((facility)=>facility.kind)).size===facilities.length,'every facility should teach a distinct launch method');
      assert(facilities.every((facility)=>facility.visualCues.length===3),'every facility should declare three recognizable visual cues');
      assert(facilities.every((facility,index)=>index===0||facility.deckLength>facilities[index-1].deckLength),'launch decks should visibly grow with pilot rank');
    },
  },
  {
    name: 'collects salvage and clears rings once without mutating prior state',
    run: () => {
      const objects = getSkyboundCourseObjects('meadow');
      const salvage = objects.find((object) => object.kind === 'salvage');
      const ring = objects.find((object) => object.kind === 'wind_ring');
      assert(salvage && ring, 'meadow objects should include salvage and a ring');
      const starter = createSkyboundFlight({
        power: 1,
        angleDeg: 35,
        upgrades: SKYBOUND_STARTER_UPGRADES,
        levelId: 'meadow',
      });
      const beforeSalvage = { ...starter, x: salvage.x - 3, y: salvage.y, lateralX: salvage.lateralX ?? 0, vx: 70, vy: 0 };
      const afterSalvage = stepSkyboundFlight(beforeSalvage, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(beforeSalvage.resolvedObjectIds.length === 0, 'prior state must remain immutable');
      assert(afterSalvage.salvageCollected === 1, 'salvage should collect once');
      assert(afterSalvage.currentStreak === 1, 'salvage should start a streak');
      const beforeRing = { ...afterSalvage, x: ring.x - 3, y: ring.y, lateralX: ring.lateralX ?? 0, vx: 70, vy: 0 };
      const afterRing = stepSkyboundFlight(beforeRing, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(afterRing.ringsCleared === 1, 'ring should clear once');
      assert(afterRing.vx > beforeRing.vx, 'ring should provide forward lift');
      const repeated = stepSkyboundFlight({ ...afterRing, x: ring.x - 2, y: ring.y }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(repeated.ringsCleared === 1, 'resolved ring must not pay twice');
    },
  },
  {
    name: 'makes hazards break streaks and reduce forward velocity',
    run: () => {
      const hazard = getSkyboundCourseObjects('meadow').find((object) => object.kind === 'hazard');
      assert(hazard, 'meadow should include a hazard');
      const state = {
        ...createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: SKYBOUND_STARTER_UPGRADES,
          levelId: 'meadow',
        }),
        x: hazard.x - 3,
        y: hazard.y,
        lateralX: hazard.lateralX ?? 0,
        vx: 70,
        vy: 0,
        currentStreak: 5,
        bestStreak: 5,
      };
      const next = stepSkyboundFlight(state, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(next.hazardHits === 1, 'hazard should register once');
      assert(next.currentStreak === 0, 'hazard should break the current streak');
      assert(next.vx < state.vx, 'hazard should produce a readable speed loss');
    },
  },
  {
    name: 'awards a close hazard pass once without also recording a collision',
    run: () => {
      const hazard = getSkyboundCourseObjects('meadow').find((object) => object.kind === 'hazard');
      assert(hazard, 'meadow should include a hazard');
      const state = {
        ...createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: SKYBOUND_STARTER_UPGRADES,
          levelId: 'meadow',
        }),
        x: hazard.x - 3,
        y: hazard.y + 15,
        lateralX: hazard.lateralX ?? 0,
        vx: 70,
        vy: 0,
        currentStreak: 2,
        bestStreak: 2,
      };
      const closePass = stepSkyboundFlight(state, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(closePass.nearMisses === 1, 'passing through the hazard proximity band should award one near-miss');
      assert(closePass.hazardHits === 0, 'a near-miss must not also count as a collision');
      assert(closePass.currentStreak === 3, 'a near-miss should extend the skill streak');
      const repeated = stepSkyboundFlight(closePass, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(repeated.nearMisses === 1, 'the same hazard must not award more than one near-miss');
      const collision = stepSkyboundFlight({ ...state, y: hazard.y }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(collision.hazardHits === 1 && collision.nearMisses === 0, 'a direct hit should remain a collision, not a near-miss');
      assert(scoreSkyboundFlight({ ...closePass, status: 'landed' }) > scoreSkyboundFlight({ ...closePass, status: 'landed', nearMisses: 0 }), 'near-misses should add bounded settlement value');
    },
  },
  {
    name: 'adds course performance to settlement without creating negative rewards',
    run: () => {
      const base = {
        ...createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: SKYBOUND_STARTER_UPGRADES,
          levelId: 'meadow',
        }),
        status: 'landed' as const,
        x: 200,
        maxAltitude: 55,
      };
      const skilled = { ...base, salvageCollected: 5, ringsCleared: 2, bestStreak: 7 };
      const battered = { ...base, hazardHits: 20 };
      assert(scoreSkyboundFlight(skilled) > scoreSkyboundFlight(base), 'course mastery should improve rewards');
      assert(scoreSkyboundFlight(battered) >= 45, 'hazards must not create a negative payout');
    },
  },
  {
    name: 'makes Stabilizer trade speed for damping and wind resistance',
    run: () => {
      const start = {
        ...createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: SKYBOUND_STARTER_UPGRADES,
          levelId: 'canyon',
        }),
        x: 40,
        y: 70,
        vx: 55,
        vy: 18,
      };
      const free = stepSkyboundFlight(start, { pitch: 0, boost: false, stabilize: false }, SKYBOUND_STARTER_UPGRADES, 64);
      const stable = stepSkyboundFlight(start, { pitch: 0, boost: false, stabilize: true }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(stable.vx < free.vx, 'Stabilizer should trade forward speed for control');
      assert(Math.abs(stable.vy) < Math.abs(free.vy), 'Stabilizer should damp vertical velocity');
      assert(stable.stabilizer < start.stabilizer, 'active Stabilizer should consume its bounded meter');
      assert(start.stabilizer === 1, 'Stabilizer must not mutate prior state');
    },
  },
  {
    name: 'gives a descending pilot enough elevator authority to recover before terrain',
    run: () => {
      const start={
        ...createSkyboundFlight({power:.72,angleDeg:14,upgrades:SKYBOUND_STARTER_UPGRADES,levelId:'coast',aircraftId:'prop_trainer',courseProfile:'landing'}),
        x:180,
        y:105,
        vx:34,
        vy:-22,
        pitchRad:-.45,
      };
      let neutral=start;
      let recovering=start;
      for(let step=0;step<8;step+=1){
        neutral=stepSkyboundFlight(neutral,{pitch:0,boost:false},SKYBOUND_STARTER_UPGRADES,50);
        recovering=stepSkyboundFlight(recovering,{pitch:1,boost:false},SKYBOUND_STARTER_UPGRADES,50);
      }
      assert(recovering.vy>neutral.vy+5,'pulling up in a dive should produce a clearly recoverable flight path');
      assert(recovering.status==='flying','recovery authority should not force an artificial terminal state');
    },
  },
  {
    name: 'ends the sortie on the first ground contact even during launch training',
    run: () => {
      const state = {
        ...createSkyboundFlight({ power: .35, angleDeg: 24, upgrades: SKYBOUND_STARTER_UPGRADES, levelId: 'meadow' }),
        x: 20,
        y: 1.25,
        vx: 24,
        vy: -5,
        elapsedMs: 700,
        airborneMs: 640,
      };
      const next = stepSkyboundFlight(state, { pitch: .2, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(next.status === 'crashed', 'any unsafe ground contact should end the attempt immediately');
      assert(next.terminalReason === 'hard_impact', 'unsafe ground contact should explain the terrain impact');
      assert(next.integrity === 0, 'ground impact should make the airframe visibly fail');
    },
  },
  {
    name: 'distinguishes a controlled touchdown from every unsafe ground hit',
    run: () => {
      const base = {
        ...createSkyboundFlight({ power: 1, angleDeg: 35, upgrades: SKYBOUND_STARTER_UPGRADES, levelId: 'meadow' }),
        x: 30,
        y: 1.3,
        elapsedMs: 4_000,
        airborneMs: 3_000,
      };
      const landed = stepSkyboundFlight({ ...base, vx: 7, vy: -2, pitchRad: .12 }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(landed.status === 'landed' && landed.terminalReason === 'touchdown', 'slow level contact should be a controlled touchdown');
      const noseHit = stepSkyboundFlight({ ...base, vx: 10, vy: -3, pitchRad: .75 }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(noseHit.status === 'crashed' && noseHit.terminalReason === 'hard_impact', 'poor attitude should turn even a slow contact into a crash');
      const fastHit = stepSkyboundFlight({ ...base, vx: 26, vy: -10, pitchRad: .2 }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(fastHit.status === 'crashed' && fastHit.terminalReason === 'hard_impact', 'excessive ground speed should crash on first contact');
    },
  },
  {
    name: 'records contact telemetry and grades safe touchdowns without changing the pass boundary',
    run: () => {
      const groundState={
        ...createSkyboundFlight({power:.72,angleDeg:14,upgrades:SKYBOUND_STARTER_UPGRADES,levelId:'coast',goalDistance:580,aircraftId:'prop_trainer',courseProfile:'landing'}),
        x:530,
        y:3.4,
        elapsedMs:8_000,
        airborneMs:7_000,
      };
      const land=(vx:number,vy:number,pitchRad:number,lateralX:number)=>stepSkyboundFlight({...groundState,vx,vy,pitchRad,lateralX,y:getSkyboundGroundHeight('coast',530)+1.3},{pitch:0,boost:false},SKYBOUND_STARTER_UPGRADES,64);
      const gold=land(8,-2,.06,1);
      const silver=land(12,-3.4,.16,5);
      const bronze=land(13,-5,.22,12);
      assert(gold.status==='landed'&&silver.status==='landed'&&bronze.status==='landed','every graded example should remain inside the controlled-touchdown boundary');
      assert(getSkyboundTouchdownResult(gold)?.grade==='gold','soft centred contact should earn a gold touchdown');
      assert(getSkyboundTouchdownResult(silver)?.grade==='silver','a stable minor-offset contact should earn silver');
      assert(getSkyboundTouchdownResult(bronze)?.grade==='bronze','a safe but rough contact should earn bronze');
      assert((gold.touchdownSpeedKmh??0)>0&&gold.vx===0,'contact speed should be recorded before the settled aircraft stops');
      assert(scoreSkyboundFlight(gold)>scoreSkyboundFlight(silver)&&scoreSkyboundFlight(silver)>scoreSkyboundFlight(bronze),'touchdown quality should improve the flight score');
    },
  },
  {
    name: 'maps the virtual flight stick relative to its own anchor with a dead zone',
    run: () => {
      const neutral = getSkyboundFlightStickControl({ x: 100, y: 100 }, { x: 104, y: 97 }, 82);
      assert(neutral.pitch === 0 && neutral.steer === 0, 'small hand movement should remain inside the stick dead zone');
      const climbRight = getSkyboundFlightStickControl({ x: 100, y: 100 }, { x: 158, y: 48 }, 82);
      assert(climbRight.pitch > 0.5, 'dragging upward should command a climb');
      assert(climbRight.steer > 0.5, 'dragging right should command a right bank');
      assert(climbRight.magnitude > 0.8, 'large displacement should visibly approach full stick deflection');
    },
  },
  {
    name: 'classifies smooth flight, stalls, and damaged airframes deterministically',
    run: () => {
      const base = {
        ...createSkyboundFlight({ power: 1, angleDeg: 35, upgrades: SKYBOUND_STARTER_UPGRADES, levelId: 'meadow' }),
        x: 40, y: 52, vx: 34, vy: 0, pitchRad: 0.08, bankRad: 0.1,
      };
      assert(getSkyboundFlightTelemetry(base).condition === 'smooth', 'level energy flight should read as smooth flow');
      assert(getSkyboundFlightTelemetry({ ...base, vx: 13, pitchRad: 0.55 }).condition === 'stall', 'low-speed nose-high flight should warn of a stall');
      assert(getSkyboundFlightTelemetry({ ...base, integrity: 1, hazardHits: 2 }).condition === 'damaged', 'low integrity should read as airframe strain');
    },
  },
  {
    name: 'teaches the pilot how to enter Flow instead of exposing only raw telemetry',
    run: () => {
      const base = {
        ...createSkyboundFlight({ power:1, angleDeg:35, upgrades:SKYBOUND_STARTER_UPGRADES, levelId:'coast', aircraftId:'prop_trainer' }),
        x:80, y:42, vx:getSkyboundFlowTargetSpeedKmh('prop_trainer',SKYBOUND_STARTER_UPGRADES)/3.6, vy:0, pitchRad:.04, bankRad:.03,
      };
      const tracking=getSkyboundFlightDirector(base,SKYBOUND_STARTER_UPGRADES);
      assert(tracking.mode==='tracking'&&tracking.alignment>.8,'an efficient level aircraft should visibly converge on the Flow gate');
      assert(getSkyboundFlightDirector({...base,vx:18},SKYBOUND_STARTER_UPGRADES).mode==='slow','low energy should command the pilot to lower the nose');
      assert(getSkyboundFlightDirector({...base,vx:58},SKYBOUND_STARTER_UPGRADES).mode==='fast','excess energy should teach a shallow climb rather than an arbitrary slowdown');
      assert(getSkyboundFlightDirector({...base,bankRad:.62},SKYBOUND_STARTER_UPGRADES).mode==='banked','excess bank should explicitly block Flow');
      assert(getSkyboundFlightDirector({...base,flowCharge:.72},SKYBOUND_STARTER_UPGRADES).mode==='flow','crossing the charge threshold should lock the flight director');
    },
  },
  {
    name: 'tracks smooth flight as a scored skill and keeps a stall recoverable',
    run: () => {
      const base = {
        ...createSkyboundFlight({ power: 1, angleDeg: 35, upgrades: SKYBOUND_STARTER_UPGRADES, levelId: 'meadow' }),
        x: 25, y: 54, vx: 48, vy: 0, pitchRad: 0.06, bankRad: 0, flowCharge:.72,
      };
      const smooth = stepSkyboundFlight(base, { pitch: 0, steer: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(smooth.smoothFlightMs === 64, 'stable energetic flight should accumulate flow time');
      const stallStart = { ...base, vx: 13, vy: 1, pitchRad: 0.62 };
      const stalled = stepSkyboundFlight(stallStart, { pitch: -1, steer: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(stalled.status === 'flying', 'a low-energy stall should remain recoverable');
      assert(stalled.stallMs > 0, 'a stall should accumulate readable warning time');
      assert(stalled.vy < stallStart.vy, 'stall physics should begin trading altitude for airspeed');
      const ordinaryScore = scoreSkyboundFlight({ ...smooth, status: 'landed', smoothFlightMs: 0 });
      const flowScore = scoreSkyboundFlight({ ...smooth, status: 'landed', smoothFlightMs: 20_000 });
      assert(flowScore > ordinaryScore, 'holding smooth flow should add a bounded settlement bonus');
    },
  },
  {
    name: 'makes a bare fuselage visibly weaker than a completed aircraft',
    run: () => {
      const bare=createSkyboundFlight({power:1,angleDeg:35,upgrades:SKYBOUND_STARTER_UPGRADES,levelId:'meadow',assemblyLevel:0});
      const complete=createSkyboundFlight({power:1,angleDeg:35,upgrades:SKYBOUND_STARTER_UPGRADES,levelId:'meadow',assemblyLevel:4});
      assert(bare.vx<complete.vx*.65,'bare fuselage should leave the sling with much less forward energy');
      const bareStep=stepSkyboundFlight({...bare,x:20,y:48,vx:30,vy:0},{pitch:1,steer:1,boost:true},SKYBOUND_STARTER_UPGRADES,64);
      const completeStep=stepSkyboundFlight({...complete,x:20,y:48,vx:30,vy:0},{pitch:1,steer:1,boost:true},SKYBOUND_STARTER_UPGRADES,64);
      assert(Math.abs(bareStep.vy)<Math.abs(completeStep.vy),'installed wings and controls should produce stronger pitch authority');
      assert(bareStep.fuel===bare.fuel,'the missing propulsion package must make boost unavailable');
    },
  },
];

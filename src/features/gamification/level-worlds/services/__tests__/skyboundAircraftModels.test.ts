import { createSkyboundAircraftModel } from '../../../games/skybound-expedition/skyboundAircraftModels';
import { applySkyboundAircraftMotion, getSkyboundAircraftMotionPose, getSkyboundLaunchPose } from '../../../games/skybound-expedition/skyboundAircraftMotion';
import { SKYBOUND_AIRCRAFT_RANKS } from '../skyboundPilotAcademy';

type TestCase={name:string;run:()=>void};
function assert(condition:unknown,message:string):asserts condition { if(!condition)throw new Error(message); }

export const skyboundAircraftModelsTests:TestCase[]=[
  {
    name:'builds five visually distinct aircraft with the shared damage contract',
    run:()=>{
      const names=new Set<string>();
      for(const rank of SKYBOUND_AIRCRAFT_RANKS){
        const model=createSkyboundAircraftModel(rank.aircraftId);const runtime=model.userData.sculptRuntime;
        names.add(model.name);
        for(const partId of ['left-wing','right-wing','left-tailplane','right-tailplane','tail-fin','canopy','nose-cap']) assert(runtime.nodes[partId],`${rank.aircraftId} is missing breakable ${partId}`);
        assert(runtime.sockets['boost-socket'],`${rank.aircraftId} needs a stable boost socket`);
        for(const controlId of ['left-aileron','right-aileron','left-elevator','right-elevator','rudder']) assert(runtime.nodes[controlId],`${rank.aircraftId} is missing articulated ${controlId}`);
        assert(Object.keys(runtime.meshes).length>=15,`${rank.aircraftId} should retain the detailed action-ready hierarchy`);
      }
      assert(names.size===5,'every rank should have a distinct aircraft identity');
    },
  },
  {
    name:'gives propulsion and elite silhouettes their authored moving/detail parts',
    run:()=>{
      const prop=createSkyboundAircraftModel('prop_trainer');
      const jet=createSkyboundAircraftModel('jet_trainer');
      const elite=createSkyboundAircraftModel('storm_interceptor');
      const ace=createSkyboundAircraftModel('goldwing_fighter');
      assert(prop.userData.sculptRuntime.nodes.propeller,'the Kestrel needs a spinning propeller group');
      assert(jet.userData.sculptRuntime.nodes['intake-1'],'the Vortex needs visible jet intakes');
      assert(elite.userData.sculptRuntime.nodes['storm-coil-1'],'the Tempest needs its storm-drive silhouette');
      assert(ace.userData.sculptRuntime.nodes['gold-wingtip-1'],'the Goldwing needs authored gold wing tips');
    },
  },
  {
    name:'turns launch power into visible travel, tension, and airframe motion',
    run:()=>{
      const resting=getSkyboundLaunchPose(0,0,false);
      const charged=getSkyboundLaunchPose(1,40,true);
      assert(charged.forward<resting.forward-4,'full tension should pull the aircraft visibly backward');
      assert(charged.height<resting.height-1,'full tension should pull the aircraft down into the sling');
      assert(charged.vibration>0,'a held full-power launch should visibly tremble');
      const model=createSkyboundAircraftModel('toy_glider');const runtime=model.userData.sculptRuntime;
      const before=runtime.nodes['left-aileron'].rotation.x;
      const pose=applySkyboundAircraftMotion(runtime,{phase:'flying',timeSeconds:1,dtSeconds:.016,aimPower:0,aimDragging:false,pitchRad:.2,bankRad:.55,speed:44,integrityRatio:1,boosting:false,stabilizing:false});
      assert(pose.mode==='smooth','a healthy, energetic aircraft should report smooth flight');
      assert(runtime.nodes['left-aileron'].rotation.x!==before,'banking should animate the real aileron pivot');
    },
  },
  {
    name:'uses fluttering control surfaces to signal a struggling aircraft',
    run:()=>{
      const pose=getSkyboundAircraftMotionPose({phase:'flying',timeSeconds:.13,dtSeconds:.016,aimPower:0,aimDragging:false,pitchRad:.82,bankRad:.67,speed:12,integrityRatio:.35,boosting:false,stabilizing:false});
      assert(pose.mode==='struggling','low energy, high attitude, and damage should trigger struggle feedback');
      assert(Math.abs(pose.shudder)>0,'struggle feedback should include deterministic airframe shudder');
    },
  },
];

import { createSkyboundAircraftModel } from '../../../games/skybound-expedition/skyboundAircraftModels';
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
];

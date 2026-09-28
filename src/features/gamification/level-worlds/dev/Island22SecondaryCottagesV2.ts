import { populateIsland22SkipperCottageV2 } from './Island22SkipperCottageV2';
import { populateIsland22KeeperCottageV2 } from './Island22KeeperCottageV2';
import { populateIsland22ShellDiverCottageV2 } from './Island22ShellDiverCottageV2';
import { populateIsland22ChartmakerCottageV2 } from './Island22ChartmakerCottageV2';
import { populateIsland22HarborCookCottageV2 } from './Island22HarborCookCottageV2';
import { populateIsland22RopeMakerCottageV2 } from './Island22RopeMakerCottageV2';
import { populateIsland22CooperCottageV2 } from './Island22CooperCottageV2';
import type * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
import { populateIsland22SailmakerCottageV2 } from './Island22SailmakerCottageV2';
export const ISLAND_22_V2_SECONDARY_INDICES: readonly number[] = [3,4,6,7,8,9,10,11];
export function populateIsland22SecondaryCottageV2(groups:{macro:THREE.Group;finish:THREE.Group}, options:{index:number;quality:Island3DQuality;materials:Island22FishermansVillageMaterials}):boolean {
 if(options.index===3){populateIsland22SailmakerCottageV2(groups,options);return true;}
 if(options.index===4){populateIsland22CooperCottageV2(groups,options);return true;}
 if(options.index===6){populateIsland22RopeMakerCottageV2(groups,options);return true;}
 if(options.index===7){populateIsland22HarborCookCottageV2(groups,options);return true;}
 if(options.index===8){populateIsland22ChartmakerCottageV2(groups,options);return true;}
 if(options.index===9){populateIsland22ShellDiverCottageV2(groups,options);return true;}
 if(options.index===10){populateIsland22KeeperCottageV2(groups,options);return true;}
 if(options.index===11){populateIsland22SkipperCottageV2(groups,options);return true;}
 return false;
}

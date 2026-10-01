import * as THREE from 'three';
import { createIsland9V2MacroAmbience, buildIsland9V2MacroLandmark } from './Island9HeartshaftWeldedStructure';
import { applyIsland9BasaltTerraceStructure } from './Island9BasaltTerraceStructure';
import { buildIsland9GreatFuseStructure } from './Island9GreatFuseStructure';
import { buildIsland9MemoryPressMechanism } from './Island9MemoryPressMechanism';
import { buildIsland9BlastglassIncubatorStructure } from './Island9BlastglassIncubatorStructure';
import { buildIsland9SeismicSwitchyardStructure } from './Island9SeismicSwitchyardStructure';
import { applyIsland9OccupiedSuspensionStructure, OCCUPIED_SUSPENSION_FROZEN_OWNERS } from './Island9OccupiedSuspensionStructure';
import { prepareCandidateConstructionPreview, type CandidateMeshConstructionOwnership } from './IslandCandidateConstructionPreview';
import { resolveIsland9CandidateConstructionOwnership } from './Island9CandidateConstructionOwnership';

/** User-authorized publication of the saved prototype; visual approval is separate. */
export function createIsland9ReleasedAmbience(...args: Parameters<typeof createIsland9V2MacroAmbience>) {
  const result = createIsland9V2MacroAmbience(...args);
  applyIsland9BasaltTerraceStructure(result.root, args[1].id);
  result.root.userData.island9Release = 'heartshaft-star-20261001';
  return result;
}
export function buildIsland9ReleasedLandmark(
  definition: Parameters<typeof buildIsland9V2MacroLandmark>[0],
  level: Parameters<typeof buildIsland9V2MacroLandmark>[1],
  quality: Parameters<typeof buildIsland9V2MacroLandmark>[2],
  materials: Parameters<typeof buildIsland9V2MacroLandmark>[3],
  options: Parameters<typeof buildIsland9V2MacroLandmark>[4] = {},
  environment?: THREE.Object3D,
) {
  const factory = definition.id === 'habit' ? buildIsland9GreatFuseStructure
    : definition.id === 'wisdom' ? buildIsland9MemoryPressMechanism
    : definition.id === 'hatchery' ? buildIsland9BlastglassIncubatorStructure
    : definition.id === 'event' ? buildIsland9SeismicSwitchyardStructure : buildIsland9V2MacroLandmark;
  const root = factory(definition, level, quality, materials, options);
  if (definition.id === 'boss') {
    const bore = environment?.getObjectByName('V4_UNCAPPED_VERTICAL_BORE');
    if (!(bore instanceof THREE.Mesh)) throw new Error('Heartshaft release requires its actual bore');
    applyIsland9OccupiedSuspensionStructure(root, bore, quality);
  }
  prepareCandidateConstructionPreview({root,worldSourceNumber:9,landmarkId:definition.id,quality,buildLevel:level,preview:options.constructionPreview,
    resolveOwnership(mesh): CandidateMeshConstructionOwnership {
      if(definition.id === 'habit' || definition.id === 'wisdom') return resolveIsland9CandidateConstructionOwnership(definition.id === 'habit' ? 'great-fuse' : 'memory-press',mesh);
      if(Number.isInteger(mesh.userData.constructionBuildLevel) && Number.isInteger(mesh.userData.constructionStage)) return {buildLevel:mesh.userData.constructionBuildLevel,phase:mesh.userData.constructionStage,preserveObjectIdentity:true};
      for(let node:THREE.Object3D|null=mesh;node;node=node.parent){const allocation=OCCUPIED_SUSPENSION_FROZEN_OWNERS[node.name]??OCCUPIED_SUSPENSION_FROZEN_OWNERS[node.userData.partId];if(allocation)return {buildLevel:allocation.level as 0|1|2|3,phase:allocation.phase as 1|2|3|4|5,preserveObjectIdentity:true};}
      throw new Error('Missing released Heartshaft construction owner: '+mesh.name);
    }});
  root.userData.island9Release='heartshaft-star-20261001';
  return root;
}

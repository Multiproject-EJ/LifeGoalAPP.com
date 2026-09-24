import * as THREE from 'three';
import type { Island2WorldMaterials } from './Island2ThreeWorld';
import type { Island3DQuality } from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';
import { createSunshoreCoastSurface } from './Island5SunshoreV2Landscape';
import { createSunshoreV2Palm } from './Island5SunshoreV2Botany';

/** Static, batched neighbouring islands: scenery only, outside the playable coast. */
export function createSunshoreArchipelago(m: Island2WorldMaterials, quality: Island3DQuality) {
  const root = new THREE.Group(); root.name = 'SUNSHORE_V2_ARCHIPELAGO';
  const sites = [
    {x:-6,z:-22,r:4.4,stretch:1.15,village:false},
    {x:6,z:-29,r:4.8,stretch:.85,village:true},
    {x:-8,z:-45,r:6.3,stretch:.8,village:false},
    {x:28,z:-7,r:4.5,stretch:1.2,village:false},
    {x:-29,z:3,r:5.1,stretch:.8,village:true},
    {x:24,z:27,r:4.2,stretch:1.1,village:true},
    {x:-24,z:30,r:5.4,stretch:1.05,village:false},
  ];
  const sphere = new THREE.IcosahedronGeometry(1, 1);
  const box = (parent: THREE.Object3D, name:string, material:THREE.Material, dimensions:number[], position:number[]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions as [number,number,number]),material);
    mesh.name=name;mesh.position.set(...position as [number,number,number]);parent.add(mesh);return mesh;
  };
  for (const [index, site] of sites.entries()) {
    const island = new THREE.Group(); island.name=`SUNSHORE_NEIGHBOUR_${index}_${site.village?'VILLAGE':'FOREST'}`;
    island.position.set(site.x,0,site.z); island.rotation.y=index*.71; root.add(island);
    const radiusAtAngle = (a: number) => site.r
      * (1 + .14 * Math.sin(a * 3 + index) + .065 * Math.cos(a * 5 - index))
      / Math.sqrt(Math.cos(a) ** 2 + (Math.sin(a) / site.stretch) ** 2);
    const segments = quality === 'low' ? 48 : 80;
    const surfaces: [string, readonly (readonly [number, number])[], boolean, THREE.Material][] = [
      ['SAND_APRON', [[1,.265],[1.035,-.18],[1.05,-.6]], true, m.sand],
      ['UPPER_LIMESTONE', [[1.006,.19],[1.02,.07],[1.012,-.05]], false, m.rock],
      ['LOWER_LIMESTONE', [[1.021,-.12],[1.04,-.3],[1.046,-.48]], false, m.rock],
      ['GRASS_INTERIOR', [[.88,.295],[.91,.282]], true, m.garden],
    ];
    for (const [name, rings, cap, material] of surfaces) {
      const mesh = new THREE.Mesh(createSunshoreCoastSurface(segments, rings, cap, radiusAtAngle), material);
      mesh.name = name; island.add(mesh);
    }
    const rockCount = quality === 'low' ? 24 : 42;
    const cragGeometry = new THREE.DodecahedronGeometry(1, 0);
    for (let i = 0; i < rockCount; i++) {
      const a = i / rockCount * Math.PI * 2 + .015 * Math.sin(i * 7);
      if (site.village && Math.abs(a - Math.PI / 2) < .17) continue;
      const r = radiusAtAngle(a) * (.985 + .028 * Math.sin(i * 3.7));
      const rock = new THREE.Mesh(cragGeometry, i % 5 ? m.rock : m.sand);
      rock.name = 'COASTAL_CRAG';
      rock.position.set(Math.cos(a) * r, -.05 + .12 * Math.sin(i * 2.3), Math.sin(a) * r);
      rock.scale.set(.25 + i % 4 * .09, .26 + i % 3 * .11, .24 + i % 5 * .05);
      rock.rotation.set(i * .14, a, .09 * Math.sin(i)); island.add(rock);
    }
    const treeCount=quality==='low'?12:quality==='medium'?20:29;
    let plantedTrees = 0;
    for(let t=0;t<treeCount;t++) {
      const a=t*2.399963+index, r=Math.sqrt((t+.5)/treeCount)*site.r*.74;
      const x=Math.cos(a)*r + .3*Math.sin(t*1.7),z=Math.sin(a)*r*site.stretch + .22*Math.cos(t*2.3);
      // Keep the settlement's shore-front plaza and buildings free of trees.
      if(site.village&&z>-.5&&Math.abs(x)<site.r*.65)continue;
      if (t % 7 === 5) continue; // Small natural glades within the palm clusters.
      const height=1.1+(Math.sin(t*17+index)+1)*.65;
      // Count after village exclusions so every island retains a palm majority.
      if (plantedTrees++ % 4 !== 3) {
        island.add(createSunshoreV2Palm(x, z, height + .65, m, 'low', a));
        continue;
      }
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.07,.12,height,5),m.teakDark);
      trunk.name='FOREST_TRUNK';trunk.position.set(x,.25+height*.5,z);island.add(trunk);
      for(let crown=0;crown<3;crown++) {
        const canopy=new THREE.Mesh(sphere,[m.leafDark,m.leaf,m.leafLight][(t+crown)%3]);
        canopy.name='BROADLEAF_CANOPY';canopy.scale.set(.6,.65,.65);
        canopy.position.set(x+Math.cos(crown*2.1)*.3,.3+height+crown*.13,z+Math.sin(crown*2.1)*.27);island.add(canopy);
      }
    }
    for(let t=0;t<(quality==='low'?2:4);t++) {
      const a=t*1.9+index;
      const x=Math.cos(a)*site.r*.77,z=Math.sin(a)*site.r*.77*site.stretch;
      if(site.village&&z>-.5&&Math.abs(x)<site.r*.65)continue;
      const palm=createSunshoreV2Palm(x,z,1.8+(t%2)*.4,m,'low',a);
      island.add(palm);
    }
    if(site.village) {
      for(let house=0;house<3;house++) {
        const hut=new THREE.Group();hut.name=`COASTAL_HOME_${house}`;
        hut.position.set((house-1)*1.65,.24,1.2+(house%2)*.65);hut.rotation.y=(house-1)*-.18 + Math.sin(index+house)*.13;
        hut.scale.set(.87+house*.1, .86+(index+house)%3*.13, .9+(house%2)*.18);island.add(hut);
        box(hut,'WALLS',m.teak,[1.05,.9,.85],[0,.55,0]);
        const roof=new THREE.Mesh(new THREE.ConeGeometry(.96,.65,4),m.thatch);roof.name='THATCHED_ROOF';roof.rotation.y=Math.PI/4;roof.scale.z=.9;roof.position.y=1.22;hut.add(roof);
        box(hut,'DOOR',m.teakDark,[.23,.55,.035],[0,.38,.442]);
        for(const x of [-.33,.33])box(hut,'WINDOW',m.oceanCloth,[.18,.22,.04],[x,.67,.445]);
        box(hut,'PORCH',m.teak,[1.23,.12,.45],[0,.12,.6]);
      }
      const dockZ=site.r*site.stretch;
      box(island,'SETTLEMENT_PIER',m.teak,[.65,.14,2.7],[.2,-.15,dockZ+.65]);
      for(const x of [-.14,.54])for(const z of [dockZ-.4,dockZ+1.7])box(island,'PIER_PILE',m.teakDark,[.09,1.1,.09],[x,-.47,z]);
    }
  }
  compactStaticGeometry(root,'SUNSHORE_V2_ARCHIPELAGO');
  root.traverse(object=>{object.castShadow=false;object.receiveShadow=false;});
  return root;
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { sanitizeTitanAwakening, type TitanAwakening } from '../services/island17Awakening';

export const TITAN_SKULL_URL = '/assets/islands/island-017/models/titan-skull-boss-v027.glb';
const smooth = (v: number) => THREE.MathUtils.smoothstep(v, 0, 1);
/** Deterministic endpoints; reduced motion never replays a rise or ambient loop. */
export function titanRevealPose(phase: number, age: number, reduced: boolean) {
  const reveal = reduced ? 1 : smooth((age - 0.8) / 3.6);
  return { visible: phase >= 2, lift: phase >= 2 ? reveal : 0,
    jaw: phase >= 3 ? 1 : 0, crown: phase >= 4 ? 1 : 0, spirit: phase >= 5 };
}

/** Batch only rigid siblings inside a single independently moving mechanism. */
function batchRigidMechanism(group: THREE.Object3D) {
  const buckets = new Map<THREE.Material, Map<string, THREE.Mesh[]>>();
  group.children.forEach(node => {
    if (!(node instanceof THREE.Mesh) || !node.visible || Array.isArray(node.material)) return;
    const signature = Object.keys(node.geometry.attributes).sort().join(',');
    const byLayout = buckets.get(node.material) ?? new Map<string, THREE.Mesh[]>();
    const meshes = byLayout.get(signature) ?? [];
    meshes.push(node); byLayout.set(signature, meshes); buckets.set(node.material, byLayout);
  });
  buckets.forEach((byLayout,material)=>byLayout.forEach(meshes=>{
    if(meshes.length<2)return;
    const geometries=meshes.map(node=>{
      node.updateMatrix();
      return (node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone()).applyMatrix4(node.matrix);
    });
    const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    if(!merged)return;
    meshes.forEach(node=>{group.remove(node);node.geometry.dispose();});
    const batch=new THREE.Mesh(merged,material);batch.name='TITAN_RIGID_MECHANISM_BATCH';batch.userData.keepSeparate=true;group.add(batch);
  }));
}

/** Original procedural mechanisms around the existing shipped sculpt. No new asset dependency. */
export function createTitanAwakeningThree() {
  const root = new THREE.Group(); root.name = 'ISLAND_17_AWAKENING'; root.userData.keepSeparate = true;
  const head = new THREE.Group(); head.name = 'TITAN_SUMMONED_HEAD'; root.add(head);
  const sculpt = new THREE.Group(); head.add(sculpt);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.45, -0.12); sculpt.add(jaw);
  const crowns = [-1, 1].map(side => { const g = new THREE.Group(); g.position.set(side * .68, .65, 0); sculpt.add(g); return g; });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xe4d4a2, roughness: .85 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x9b7745, metalness: .55, roughness: .4 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x87ffec, emissive: 0x29ebca, emissiveIntensity: 1.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x082426, roughness: .8 });
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x=0,y=0,z=0) => {
    const m = new THREE.Mesh(geometry, material); m.userData.keepSeparate=true; m.position.set(x,y,z); parent.add(m); return m;
  };
  const fallback = mesh(new THREE.SphereGeometry(1,24,16), ivory, sculpt,0,.1,0); fallback.scale.set(.88,1.25,.65);
  const fallbackJaw = mesh(new THREE.BoxGeometry(1.05,.35,.6),ivory,jaw,0,-.4,.3);
  [-1,1].forEach(side => mesh(new THREE.SphereGeometry(.25,16,12),dark,fallback,side*.43,0,.78));
  let disposed = false;
  const ownedMaterials = new Set<THREE.Material>([ivory,bronze,glow,dark]);
  const disposeObject = (obj: THREE.Object3D) => obj.traverse(n => {
    if (!(n instanceof THREE.Mesh)) return;
    n.geometry.dispose();
    (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => {
      Object.values(m).forEach(v => { if (v instanceof THREE.Texture) v.dispose(); }); m.dispose();
    });
  });
  if (typeof document !== 'undefined') new GLTFLoader().load(TITAN_SKULL_URL, ({scene}) => {
    if (disposed) { disposeObject(scene); return; }
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const scale = 3 / size.y;
    const normalize = new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-center.y,-center.z));
    // Split the original shell into hinged parts, retaining authored UVs/materials.
    scene.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      const source = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
      source.applyMatrix4(normalize.clone().multiply(node.matrixWorld));
      const positions = source.getAttribute('position');
      const buckets: number[][] = [[],[],[],[]];
      for (let i=0;i<positions.count;i+=3) {
        const y=(positions.getY(i)+positions.getY(i+1)+positions.getY(i+2))/3;
        const x=(positions.getX(i)+positions.getX(i+1)+positions.getX(i+2))/3;
        const part=y < -.48 ? 1 : y > .67 ? (x<0?2:3) : 0;
        buckets[part].push(i,i+1,i+2);
      }
      buckets.forEach((indices,part) => {
        if (!indices.length) return;
        const geometry = new THREE.BufferGeometry();
        Object.entries(source.attributes as Record<string, THREE.BufferAttribute | THREE.InterleavedBufferAttribute>).forEach(([name,attr]) => {
          const values = new Float32Array(indices.length*attr.itemSize);
          indices.forEach((index,i) => { const components=[attr.getX(index),attr.getY(index),attr.getZ(index),attr.getW(index)]; for(let c=0;c<attr.itemSize;c++) values[i*attr.itemSize+c]=components[c]; });
          geometry.setAttribute(name,new THREE.BufferAttribute(values,attr.itemSize));
        });
        const parent = part===1 ? jaw : part>=2 ? crowns[part-2] : sculpt;
        // Use authored rest pivots: the asset can finish loading after a saved
        // jaw/crown is already open. Current animated transforms are not bind poses.
        if (part===1) geometry.translate(0,.45,.12);
        else if (part>=2) geometry.translate(part===2?.68:-.68,-.65,0);
        const piece = new THREE.Mesh(geometry,node.material); piece.userData.keepSeparate=true; piece.name=`${node.name}_hinge_${part}`; parent.add(piece);
        (Array.isArray(node.material)?node.material:[node.material]).forEach(m=>ownedMaterials.add(m));
      });
      source.dispose(); node.geometry.dispose();
    });
    fallback.visible=false; fallbackJaw.visible=false;
    [sculpt,jaw,...crowns].forEach(batchRigidMechanism);
    root.userData.assetState='ready';
  }, undefined, () => { root.userData.assetState='fallback'; });
  root.userData.assetState='loading';

  const eyeRings = [-1,1].map(side => {
    const g = new THREE.Group(); g.position.set(side*.48,.06,.75); head.add(g);
    mesh(new THREE.TorusGeometry(.29,.035,8,32),bronze,head,side*.48,.06,.75);
    const line = mesh(new THREE.BoxGeometry(.055,.22,.03),glow,g,0,.22,.03);
    line.name='EYE_RING_MARKER';
    mesh(new THREE.SphereGeometry(.09,12,8),glow,g,0,0,.01);
    return g;
  });
  const mouth = new THREE.Group(); head.add(mouth); mouth.position.set(0,-.5,.78);
  const mouthCavity=mesh(new THREE.SphereGeometry(.76,24,14),dark,mouth,0,-.1,-.03);
  mouthCavity.name='TITAN_MOUTH_CAVITY'; mouthCavity.scale.set(1,.43,.14);
  const teeth = [-1,0,1].map(x=> {
    const g=new THREE.Group(); mouth.add(g); g.position.set(x*.4,0,.14);
    return g;
  });
  const toothBodies=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.19,.5,8),ivory,3);
  const toothChannels=new THREE.InstancedMesh(new THREE.BoxGeometry(.32,.07,.025),glow,3);
  [toothBodies,toothChannels].forEach(m=>{m.userData.keepSeparate=true;m.frustumCulled=false;mouth.add(m);});
  const toothMatrix=new THREE.Matrix4();
  const chamber = new THREE.Group(); chamber.position.set(0,.7,0); head.add(chamber);
  const lens = mesh(new THREE.TorusGeometry(.55,.05,8,40),bronze,chamber,0,.14,.15); lens.rotation.x=Math.PI/2;
  const stars=new THREE.Group(); chamber.add(stars);
  const constellation = [[-.25,-.16],[-.26,.14],[-.05,.30],[.19,.21],[.27,-.13],[.04,-.05],[-.12,-.31]];
  constellation.forEach(([x,y])=>mesh(new THREE.SphereGeometry(.035,8,6),glow,stars,x,y+.3,.25));
  const etchingMaterial=new THREE.LineBasicMaterial({color:0xa6a07b});ownedMaterials.add(etchingMaterial);
  chamber.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(constellation.map(([x,y])=>new THREE.Vector3(x,y+.3,.22))),etchingMaterial));
  const spirit=new THREE.Group(); spirit.name='TITAN_FREED_SPIRIT'; head.add(spirit);
  const body=mesh(new THREE.SphereGeometry(.2,20,16),glow,spirit); body.scale.set(.8,1.25,.75);
  [-1,1].forEach(side=> { mesh(new THREE.SphereGeometry(.027,10,8),dark,spirit,side*.06,.045,.135); const wing=mesh(new THREE.SphereGeometry(.1,12,8),glow,spirit,side*.22,-.02,0); wing.scale.set(1.6,.35,.7); });
  [stars,spirit,...eyeRings,fallback,head].forEach(batchRigidMechanism);
  const bowl=new THREE.Group(); root.add(bowl); bowl.position.set(0,-1.5,.35);
  mesh(new THREE.SphereGeometry(.55,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),bronze,bowl);
  const potionMaterial=glow.clone();ownedMaterials.add(potionMaterial);
  const liquid=mesh(new THREE.CircleGeometry(.51,32),potionMaterial,bowl,0,-.02,0); liquid.rotation.x=-Math.PI/2;
  const vessels=[-1,0,1].map((x,i)=> { const m=mesh(new THREE.CylinderGeometry(.12,.18,.4,12),i===1?bronze:ivory,root,x*.85,-1.3,-.4); return m; });
  const well=mesh(new THREE.TorusGeometry(.95,.08,12,48),bronze,root,0,-1.95,0);well.rotation.x=Math.PI/2;well.name='TITAN_INSPECTION_WELL_RING';
  const mist=mesh(new THREE.TorusGeometry(.82,.06,8,40),glow,root,0,-1.88,0);mist.rotation.x=Math.PI/2;
  const stream=mesh(new THREE.CylinderGeometry(.035,.065,1.1,10),glow,root,.32,-1.65,.3);
  let state=sanitizeTitanAwakening(null), previousPhase=state.phase, phaseTime=-Infinity, elapsed=0;
  let initial=true, replaySequence=0, riseTime=-Infinity;
  const update=(next: TitanAwakening, replay=0) => {
    if(next.phase!==state.phase || replay!==replaySequence) {
      previousPhase=state.phase; phaseTime=initial?-Infinity:elapsed;
      if(next.phase>=2 && (state.phase<2 || replay!==replaySequence)) riseTime=initial?-Infinity:elapsed;
    }
    if (initial) {
      eyeRings.forEach((g,i)=>g.rotation.z=-next.eyes[i]*Math.PI/2);
      teeth.forEach((g,i)=>g.position.y=(next.teeth[i]-[2,0,1][i])*.12);
    }
    state=next; replaySequence=replay; initial=false;
    root.userData.phase=state.phase;
  };
  const animate=(time:number,reduced=false) => {
    elapsed=time;
    const age=time-phaseTime, riseAge=time-riseTime;
    const pose=titanRevealPose(state.phase,riseAge,reduced);
    head.visible=pose.visible && (reduced || riseAge >= .6);
    head.position.y=-3.4*(1-pose.lift);
    head.scale.setScalar(.68+.32*pose.lift);
    head.rotation.y=reduced?0:Math.sin(time*.35)*.025*pose.lift;
    const t=reduced?1:smooth(age/1.3);
    const sanctuarySettle=state.phase>=6 ? (reduced?1:smooth((age-3.2)/1.1)) : 0;
    const jawOpen=(state.phase>=3 ? (previousPhase<3?t:1):0)*THREE.MathUtils.lerp(1,.18,sanctuarySettle);
    jaw.rotation.x=jawOpen*.42; jaw.position.y=-.45-jawOpen*.28;
    crowns.forEach((g,i)=> { const open=(state.phase>=4?(previousPhase<4?t:1):0)*THREE.MathUtils.lerp(1,.58,sanctuarySettle);g.rotation.z=(i===0?1:-1)*open*.85;g.position.x=(i===0?-1:1)*(.68+open*.15); });
    eyeRings.forEach((g,i)=>{
      const target=-state.eyes[i]*Math.PI/2;
      const turn=Math.atan2(Math.sin(target-g.rotation.z),Math.cos(target-g.rotation.z));
      g.rotation.z=reduced?target:g.rotation.z+turn*.18;
    });
    mouth.visible=state.phase>=3; teeth.forEach((g,i)=>g.position.y=THREE.MathUtils.lerp(g.position.y,(state.teeth[i]-[2,0,1][i])*.12,reduced?1:.18));
    teeth.forEach((g,i)=>{
      toothMatrix.makeTranslation(g.position.x,g.position.y,g.position.z);toothBodies.setMatrixAt(i,toothMatrix);
      toothMatrix.makeTranslation(g.position.x,g.position.y,g.position.z+.085);toothChannels.setMatrixAt(i,toothMatrix);
    });
    toothBodies.instanceMatrix.needsUpdate=true;toothChannels.instanceMatrix.needsUpdate=true;
    chamber.visible=state.phase>=4; stars.rotation.z=(state.lens-4)*Math.PI/4; lens.rotation.z=state.lens*Math.PI/4;
    spirit.visible=pose.spirit;
    const freed=state.phase>=6;
    const flight=freed && !reduced && age<4 ? Math.sin(Math.PI*age/4):0;
    spirit.position.set((Number.isFinite(age)?Math.sin(age*2)*flight*.9:0),1.05+(freed?.4:0)+flight*.75+(reduced?0:Math.sin(time*2)*.045),.1+flight*.4);
    spirit.scale.setScalar(state.phase===5?.6:1);
    bowl.visible=state.phase<2 || (!reduced && riseAge<1.5);
    bowl.rotation.z=state.phase>=2 && !reduced?-smooth(riseAge/1.1)*1.2:0;
    vessels.forEach(v=>v.visible=state.phase<2);
    liquid.scale.setScalar(.65+state.ingredients.length*.11);
    potionMaterial.color.setHex([0x274046,0xddd0a4,0xffb45e,0x87ffec][state.ingredients.length]);
    potionMaterial.emissive.copy(potionMaterial.color);
    stream.visible=state.phase>=2 && !reduced && riseAge<1.2;
    mist.visible=state.phase<2 || (!reduced && riseAge<4.5);
    mist.scale.setScalar(state.phase>=2?1+pose.lift*.7:1);
    root.userData.revealActive=!reduced && riseAge<4.5;
  };
  const dispose=()=> { disposed=true; root.traverse(n=>{if(n instanceof THREE.Mesh || n instanceof THREE.Line)n.geometry.dispose();});ownedMaterials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();}); };
  return {root,update,animate,dispose};
}

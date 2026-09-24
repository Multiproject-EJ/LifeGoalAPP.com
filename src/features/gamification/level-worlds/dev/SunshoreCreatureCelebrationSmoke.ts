import * as THREE from 'three';
import { resolveSunshoreCreatureCelebration } from '../services/islandRunCreatureCelebration';

/** Two pooled billboard batches; textures/materials use the scene's shared cleanup. */
export function createSunshoreCelebrationSmoke() {
  const root = new THREE.Group(); root.name = 'SUNSHORE_CREATURE_CELEBRATION_SMOKE';
  const size=32, data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
    const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.max(0,1-r)**2*255);
  }
  const map=new THREE.DataTexture(data,size,size);map.needsUpdate=true;
  const geometry=new THREE.PlaneGeometry(1,1);
  const batches=[0x79ed91,0xb27aff].map((color,index)=>{
    const material=new THREE.MeshBasicMaterial({color,map,transparent:true,opacity:.8,depthWrite:false});
    const mesh=new THREE.InstancedMesh(geometry,material,24);mesh.name=index?'PURPLE_SMOKE':'GREEN_SMOKE';mesh.frustumCulled=false;root.add(mesh);return mesh;
  });
  const dummy=new THREE.Object3D();root.visible=false;
  function update(seconds:number|null,camera:THREE.Camera,reducedMotion:boolean) {
    root.visible=seconds!==null&&!reducedMotion&&seconds>=2.8&&seconds<7.2;
    if(!root.visible||seconds===null)return;
    for(let color=0;color<2;color++) {
      const batch=batches[color];
      for(let i=0;i<24;i++) {
        const birth=2.8+i/23*2.4, age=seconds-birth, life=1.55;
        const alive=age>=0&&age<life;
        const pose=resolveSunshoreCreatureCelebration(birth,[0,1.45,0],[0,1.45,0]);
        const a=i*2.399+color*Math.PI;
        const spread=.12+Math.max(0,age)*.55;
        dummy.position.set(Math.cos(a)*spread,(pose?.position[1]??1.45)-.45+Math.max(0,age)*.48,Math.sin(a)*spread);
        dummy.quaternion.copy(camera.quaternion);
        dummy.scale.setScalar(alive?(1.1+age*.85)*Math.sin(Math.PI*age/life):0);
        dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
      }
      batch.instanceMatrix.needsUpdate=true;
    }
  }
  return {root,update};
}

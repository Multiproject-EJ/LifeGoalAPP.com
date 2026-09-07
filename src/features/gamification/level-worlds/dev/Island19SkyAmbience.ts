import * as THREE from 'three';

/** Distant, persistent world-space scenery, including above the lift's POV. */
export function createIsland19SkyAmbience(reducedMotion: boolean) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_D020_LIVING_SKY';
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xf1f9ff, roughness: 1,
    emissive: 0xb7d9e9, emissiveIntensity: .32 });
  // Distant lobes need a smooth normal, not near-field mesh density. Saves
  // 13,056 triangles for park detail without removing any cloud volume.
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), cloudMaterial, 48);
  clouds.name = 'ISLAND_19_D020_HIGH_CUMULUS';
  const matrix = new THREE.Matrix4();
  const anchors = [ [-22,31,-18], [-6,36,-14], [11,39,-22], [29,33,-9],
    [-31,43,10], [-10,48,15], [13,44,18], [32,46,9] ];
  anchors.forEach(([x,y,z], cluster) => {
    for (let lobe = 0; lobe < 6; lobe++) {
      const angle = lobe * 2.39996;
      const size = 1.7 + (lobe % 3) * .6;
      matrix.compose(new THREE.Vector3(x + Math.cos(angle)*lobe*.75, y + Math.sin(lobe*2)*.55,
        z + Math.sin(angle)*lobe*.48), new THREE.Quaternion(), new THREE.Vector3(size*1.4,size*.65,size));
      clouds.setMatrixAt(cluster*6+lobe,matrix);
    }
  });
  root.add(clouds);
  const aircraft = new THREE.Group();
  aircraft.name = 'ISLAND_19_D020_DISTANT_SKY_COURIER';
  const red = new THREE.MeshStandardMaterial({color:0xb33427,roughness:.6,emissive:0x451009,emissiveIntensity:.25});
  const cream = new THREE.MeshStandardMaterial({color:0xffe7ab,roughness:.75});
  const dark = new THREE.MeshStandardMaterial({color:0x283d4f,roughness:.5});
  const body = new THREE.Mesh(new THREE.SphereGeometry(1,12,8),red);
  body.scale.set(.32,.32,1.55);
  aircraft.add(body);
  for (const height of [-.18,.58]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(4.3,.08,.65),cream);
    wing.position.set(0,height,.05);
    aircraft.add(wing);
  }
  for(const side of [-1,1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.76,5),red);
    strut.position.set(side*1.55,.2,.05);
    aircraft.add(strut);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.55,.06,.46),cream);
  tail.position.z=-1.12;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(.06,.68,.5),red);
  fin.position.set(0,.28,-1.15);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.3,10,6),dark);
  cockpit.scale.set(.75,.65,1.1);
  cockpit.position.set(0,.28,-.18);
  const propeller = new THREE.Mesh(new THREE.BoxGeometry(.09,1.2,.055),dark);
  propeller.position.z=1.58;
  aircraft.add(tail,fin,cockpit,propeller);
  root.add(aircraft);
  const animate = (seconds: number) => {
    const t = reducedMotion ? 0 : seconds;
    clouds.position.x = Math.sin(t*.015)*2;
    aircraft.position.set(-1+Math.sin(t*.025)*14,43+Math.sin(t*.035)*1.4,-25+Math.cos(t*.025)*8);
    aircraft.rotation.set(0,Math.atan2(14*Math.cos(t*.025),-8*Math.sin(t*.025)),Math.sin(t*.025)*-.06);
    propeller.rotation.z=t*12;
  };
  animate(0);
  root.userData = {worldSpace:true,gameplayAuthority:false,reducedMotion};
  return {root,animate};
}

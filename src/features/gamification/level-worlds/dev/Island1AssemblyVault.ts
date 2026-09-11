import * as THREE from 'three';
import { ISLAND_5_LANDMARKS } from './island5ThreePilotContract';
import { ASSEMBLY_ROOF_HAUNCH_Y, ASSEMBLY_UPPER_CONCOURSE_Y } from './Island1AssemblyLayout';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

/** The cavern and ribs enclose the existing tiered hall without owning its state. */
export function createAssemblyVault(floorY:number) {
  const root=new THREE.Group();root.name='ISLAND_001_CARVED_CAVERN_AND_LIMESTONE_RIBS';
  const limestone=new THREE.MeshStandardMaterial({color:0xe4d7ba,roughness:.68});
  const rock=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.98,side:THREE.DoubleSide});
  const gold=new THREE.MeshStandardMaterial({color:0xb58c45,roughness:.32,metalness:.65});
  const glow=new THREE.MeshStandardMaterial({color:0xffd287,emissive:0xffae45,emissiveIntensity:1.1});
  const near=new THREE.Group(),far=new THREE.Group();root.add(near,far);
  const structuralRibs:THREE.Group[]=[];
  for(const front of [false,true]) {
    const parent=front?near:far,positions:number[]=[],colors:number[]=[];
    const point=(a:number,t:number)=>{const r=2.74+t*4.12;return new THREE.Vector3(Math.sin(a)*r,.16+t*(ASSEMBLY_ROOF_HAUNCH_Y-.16)-.055*Math.sin(a*9+t*17)*t,Math.cos(a)*r);};
    for(let i=0;i<112;i++) {
      const a=i/112*Math.PI*2,b=(i+1)/112*Math.PI*2;if((Math.cos((a+b)/2)>0)!==front)continue;
      for(let j=0;j<8;j++) {
        const p=point(a,j/8),q=point(b,j/8),r=point(b,(j+1)/8),s=point(a,(j+1)/8);
        const shade=.27+.04*Math.sin(i*2.4+j*1.8);
        [p,q,r,p,r,s].forEach(v=>{positions.push(v.x,v.y,v.z);colors.push(shade,shade*.93,shade*.80);});
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
    const shell=new THREE.Mesh(g,rock);shell.name='ASSEMBLY_IRREGULAR_ROCK_VAULT';parent.add(shell);
    // The outward cliff cannot serve as the cavern interior: give the room
    // its own geological lining, interrupted only at deliberate lift portals.
    const wallPositions:number[]=[],wallColors:number[]=[];
    const portals=ISLAND_5_LANDMARKS.filter(d=>d.id!=='boss').map(d=>Math.atan2(d.position[0]+.72,d.position[2]+1.07));
    const wallPoint=(a:number,y:number)=>{const r=6.91+.035*Math.sin(a*19+y*2);return new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r);};
    for(let i=0;i<128;i++) {
      const a=i/128*Math.PI*2,b=(i+1)/128*Math.PI*2,m=(a+b)/2;
      if((Math.cos(m)>0)!==front)continue;
      for(let j=0;j<12;j++) {
        const bottomAnchor=floorY+2.3-2.52*THREE.MathUtils.smoothstep(-Math.cos(m),.1,.65);
        const bottom=bottomAnchor+(ASSEMBLY_ROOF_HAUNCH_Y-bottomAnchor)*j/12;
        const top=bottomAnchor+(ASSEMBLY_ROOF_HAUNCH_Y-bottomAnchor)*(j+1)/12;
        const doorway=portals.some(p=>Math.abs(Math.atan2(Math.sin(m-p),Math.cos(m-p)))<.055)
          && bottom>=ASSEMBLY_UPPER_CONCOURSE_Y-.12 && top<=ASSEMBLY_UPPER_CONCOURSE_Y+.97;
        if(doorway)continue;
        const p=wallPoint(a,bottom),q=wallPoint(b,bottom),r=wallPoint(b,top),t=wallPoint(a,top),shade=.25+.018*Math.sin(i*1.7+j*2.2);
        [p,q,r,p,r,t].forEach(v=>{wallPositions.push(v.x,v.y,v.z);wallColors.push(shade,shade*.89,shade*.70);});
      }
    }
    const wallGeometry=new THREE.BufferGeometry();wallGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wallPositions,3));wallGeometry.setAttribute('color',new THREE.Float32BufferAttribute(wallColors,3));wallGeometry.computeVertexNormals();
    const liner=new THREE.Mesh(wallGeometry,rock);liner.name=front?'ASSEMBLY_FRONT_CAVERN_LINER':'ASSEMBLY_REAR_CAVERN_LINER';liner.receiveShadow=true;parent.add(liner);
    const ribs=new THREE.Group();parent.add(ribs);structuralRibs.push(ribs);
    for(let i=0;i<16;i++) {
      const a=(i+.5)/16*Math.PI*2;if((Math.cos(a)>0)!==front)continue;
      const radial=(r:number,y:number)=>new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r);
      const curve=new THREE.CatmullRomCurve3([radial(6.77,floorY+.2),radial(6.77,floorY+1.4),radial(6.72,-1.1),radial(6.22,-.30),radial(4.92,-.07),radial(3.73,.08),radial(2.75,.18)]);
      const rib=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.19,6,false),limestone);rib.name='ASSEMBLY_SWEPT_LIMESTONE_RIB';rib.receiveShadow=true;ribs.add(rib);
      const inlay=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.018,4,false),gold);inlay.position.set(-Math.sin(a)*.19,0,-Math.cos(a)*.19);ribs.add(inlay);
      const lamp=new THREE.Mesh(new THREE.BoxGeometry(.055,.52,.035),glow);lamp.position.copy(radial(6.66,floorY+1.42));lamp.rotation.y=a;ribs.add(lamp);
    }
    compactStaticGeometry(ribs,front?'ASSEMBLY_FRONT_RIBS':'ASSEMBLY_REAR_RIBS');
  }
  const bowlProfile=[new THREE.Vector2(0,floorY-.22),new THREE.Vector2(1.18,floorY-.22),new THREE.Vector2(2,floorY+.23),new THREE.Vector2(3,floorY+.7),new THREE.Vector2(4,floorY+1.18),new THREE.Vector2(5,floorY+1.66),new THREE.Vector2(6,floorY+2.10),new THREE.Vector2(6.97,floorY+2.5)];
  const bowl=new THREE.Mesh(new THREE.LatheGeometry(bowlProfile,64),new THREE.MeshStandardMaterial({color:0x8d846f,roughness:.96,side:THREE.DoubleSide}));bowl.name='ASSEMBLY_CARVED_ROCK_BOWL_FOUNDATION';
  const bowlVertices=bowl.geometry.attributes.position as THREE.BufferAttribute;
  for(let i=0;i<bowlVertices.count;i++){
    const rear=THREE.MathUtils.smoothstep(-bowlVertices.getZ(i),.8,2.2);
    bowlVertices.setY(i,THREE.MathUtils.lerp(bowlVertices.getY(i),floorY-.22,rear));
  }
  bowlVertices.needsUpdate=true;bowl.geometry.computeVertexNormals();root.add(bowl);
  function update(progress:number) {
    root.visible=progress>0;
    const p=THREE.MathUtils.smoothstep(progress,.12,.66);
    structuralRibs.forEach(ribs=>{ribs.visible=progress>.12;ribs.scale.y=Math.max(.001,p);ribs.position.y=floorY*(1-p);});
  }
  update(0);return{root,update,setCutaway:(active:boolean)=>{near.visible=!active;}};
}

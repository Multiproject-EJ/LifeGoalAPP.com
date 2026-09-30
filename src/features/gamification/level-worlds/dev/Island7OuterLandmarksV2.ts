import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Quality = 'high' | 'medium' | 'low';
type Key = 'pearl' | 'stone' | 'gold' | 'glass' | 'warm' | 'coral' | 'aqua' | 'violet' | 'dark';
/** Original local geometry. Each construction stage is an immutable additive batch. */
export function createIsland7OuterLandmarkV2(id: 'habit' | 'wisdom' | 'event', level: 1 | 2 | 3, quality: Quality, neutral = false, night = 0): THREE.Group {
  const root = new THREE.Group(); root.name = `ISLAND_7_${id.toUpperCase()}_V2`;
  const n = quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
  const tubeSegments = quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
  const standard = (color: number, metalness = 0, roughness = .5, emission = 0, intensity = 0) => new THREE.MeshStandardMaterial({ color: neutral ? 0xa5adb5 : color, metalness: neutral ? 0 : metalness, roughness, emissive: neutral ? 0 : emission, emissiveIntensity: intensity });
  const materials: Record<Key, THREE.Material> = {
    pearl: standard(0xd7e6dc,.22,.3), stone: standard(0x236f79,.2,.65), gold: standard(0xe8b86c,.7,.3),
    glass: neutral ? standard(0xa5adb5) : new THREE.MeshPhysicalMaterial({color:0x239caa,metalness:.2,roughness:.16,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}),
    warm: standard(0xffd995,.1,.3,0xffa83f,1.2), coral: standard(0xc978b8,.1,.45,0x892db0,.45),
    aqua: standard(0x85f5eb,.15,.3,0x35d8db,1.2), violet: standard(0xa08ef4,.1,.3,0x8252e7,1.1),dark:standard(0x17313b,.1,.75),
  };
  if (!neutral) {
    for (const key of ['warm', 'aqua', 'violet', 'coral'] as const) {
      const material = materials[key] as THREE.MeshStandardMaterial;
      material.emissiveIntensity *= THREE.MathUtils.lerp(.45, key === 'coral' ? 2.5 : key === 'warm' ? 1.45 : 2.1, night);
    }
    const coral = materials.coral as THREE.MeshStandardMaterial;
    coral.color.setHex(0x4e9862).lerp(new THREE.Color(0xc978b8), night);
  }
  const stages = [new Map<Key,THREE.BufferGeometry[]>(),new Map<Key,THREE.BufferGeometry[]>(),new Map<Key,THREE.BufferGeometry[]>()];
  const add = (stage:number,key:Key,g:THREE.BufferGeometry,p:number[]=[0,0,0],s:number[]=[1,1,1],r:number[]=[0,0,0]) => {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(p[0],p[1],p[2]),new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0],r[1],r[2])),new THREE.Vector3(s[0],s[1],s[2]));
    g.applyMatrix4(matrix); g.deleteAttribute('uv'); const normalized = g.index ? g.toNonIndexed() : g; if(normalized!==g) g.dispose();
    const bucket = stages[stage-1].get(key) ?? []; bucket.push(normalized); stages[stage-1].set(key,bucket);
  };
  const box=(stage:number,key:Key,p:number[],s:number[],r:number[]=[0,0,0])=>add(stage,key,new THREE.BoxGeometry(1,1,1),p,s,r);
  const ball=(stage:number,key:Key,p:number[],s:number[])=>add(stage,key,new THREE.SphereGeometry(1,n,Math.max(6,n/2)),p,s);
  const cyl=(stage:number,key:Key,p:number[],rt:number,rb:number,h:number)=>add(stage,key,new THREE.CylinderGeometry(rt,rb,h,n),p);
  const path=(stage:number,key:Key,points:number[][],radius:number)=>add(stage,key,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2]))),tubeSegments,radius,5,false));
  const ring=(stage:number,key:Key,p:number[],radius:number,thickness:number,r:number[]=[Math.PI/2,0,0],scale:number[]=[1,1,1])=>add(stage,key,new THREE.TorusGeometry(radius,thickness,5,n*2),p,scale,r);
  // Shallow solid pointed arches sit on the curved facade, not billboard windows.
  const archShape = (width:number,height:number) => { const shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,height*.62);shape.quadraticCurveTo(width/2,height*.86,0,height);shape.quadraticCurveTo(-width/2,height*.86,-width/2,height*.62);shape.closePath();return shape; };
  const facadeArch = (stage:number,a:number,radius:number,y:number,width:number,height:number,centerZ:number,fill:Key) => {
    const x=Math.sin(a)*radius,z=Math.cos(a)*radius+centerZ;
    add(stage,'gold',new THREE.ExtrudeGeometry(archShape(width+.10,height+.07),{depth:.052,bevelEnabled:false,curveSegments:4}),[x,y-.035,z],[1,1,1],[0,a,0]);
    add(stage,fill,new THREE.ExtrudeGeometry(archShape(width,height),{depth:.055,bevelEnabled:false,curveSegments:4}),[x+Math.sin(a)*.06,y,z+Math.cos(a)*.06],[1,1,1],[0,a,0]);
    box(stage,'gold',[x+Math.sin(a)*.12,y+height*.4,z+Math.cos(a)*.12],[.022,height*.76,.025],[0,a,0]);
    box(stage,'gold',[x+Math.sin(a)*.12,y+height*.35,z+Math.cos(a)*.12],[width,.025,.025],[0,a,0]);
  };
  // Every building receives a physically grounded entrance and stepped foundation.
  cyl(1,'stone',[0,.12,0],1.45,1.52,.24); cyl(1,'pearl',[0,.28,0],1.42,1.45,.12);
  ring(1,'gold',[0,.35,0],1.40,.035);
  for(let i=0;i<5;i++) box(1,i%2?'pearl':'stone',[0,.035+i*.055,1.51-i*.13],[.78,.07,.25]);
  const turret=(stage:number,x:number,z:number,h:number) => {
    cyl(stage,'pearl',[x,.4+h*.5,z],.19,.25,h); cyl(stage,'gold',[x,.4+h,z],.25,.24,.07);
    ball(stage,'stone',[x,.53+h,z],[.26,.34,.26]); ring(stage,'gold',[x,.53+h,z],.255,.025);
    ball(stage,'warm',[x,.92+h,z],[.075,.11,.075]);
    for(let k=0;k<4;k++){ const a=k*Math.PI/2;ball(stage,'warm',[x+Math.sin(a)*.205,.72+h*.4,z+Math.cos(a)*.205],[.045,.24,.045]); }
  };
  if(id==='habit') {
    // Open conservatory: eight curved ribs shelter a visible branching living coral.
    cyl(1,'stone',[0,.47,-.12],1.07,1.14,.26);
    for(let i=0;i<8;i++) { const a=i*Math.PI/4,x=Math.cos(a),z=Math.sin(a); 
      path(1,'gold',[[x*1.08,.5,z*1.08-.12],[x*1.08,1.55,z*1.08-.12],[x*.75,2.25,z*.75-.12],[x*.15,2.76,z*.15-.12]],.04);
      if(i>0&&i<7) add(1,'glass',new THREE.SphereGeometry(1,Math.max(3,n/4),8,a+.07,Math.PI/4-.14,0,Math.PI/2),[0,1.45,-.12],[1.05,1.29,1.05]);
    }
    ring(1,'gold',[0,1.45,-.12],1.07,.05); ring(1,'gold',[0,.6,-.12],1.09,.045);
    path(1,'coral',[[0,.6,-.12],[-.14,1.1,-.1],[.05,1.6,-.17],[0,2.24,-.1]],.12);
    for(let i=0;i<7;i++){const a=i*2.4, y=1+i*.14,x=Math.cos(a),z=Math.sin(a);
      path(1,'coral',[[0,y,-.1],[x*.35,y+.2,z*.3-.1],[x*.67,y+.5,z*.55-.1]],.055);
      ball(1,'aqua',[x*.67,y+.5,z*.55-.1],[.11,.12,.1]);
      path(2,'coral',[[x*.32,y+.2,z*.3-.1],[x*.52-.15,y+.46,z*.45],[x*.64-.2,y+.67,z*.5]],.035);
    }
    // Solid shell petals crown the glass rather than obscuring the coral.
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ball(2,'pearl',[Math.cos(a)*.34,2.7,Math.sin(a)*.34-.12],[.25,.12,.55]);}
    cyl(2,'gold',[0,2.83,-.12],.18,.34,.12); ball(2,'aqua',[0,3.04,-.12],[.14,.24,.14]);
    turret(3,-1.03,.63,.9);turret(3,1.03,.63,.9);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;if(i!==0){
      facadeArch(1,a,1.065,.58,.48,.72,-.12,'warm');
      box(1,'pearl',[Math.sin(a)*1.045,.84,Math.cos(a)*1.045-.12],[.64,.59,.10],[0,a,0]);
    }}
    // Broad, asymmetric coral forks make the organism visible through every side.
    for(let i=0;i<9;i++){const a=i*2.4,y=1.03+(i%3)*.28,x=Math.cos(a),z=Math.sin(a);
      for(const fork of [-1,1]){const pts=[[x*.32,y,z*.3-.12],[x*.58+fork*.12,y+.24,z*.5-.12],[x*.68+fork*.15,y+.47,z*.59-.12]];
        add(2,'coral',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],p[1],p[2]))),6,.035,4,false));
        add(2,'aqua',new THREE.OctahedronGeometry(.065),pts[2],[1,1.3,1]);
      }
    }
  } else if(id==='wisdom') {
    cyl(1,'pearl',[0,.96,-.22],1.02,1.10,1.2);
    // Windows wrap the rear and sides seen from the board camera as well as the entrance.
    for(let i=1;i<8;i++){const a=i*Math.PI/4;facadeArch(1,a,1.052,.56,.40,.87,-.22,'warm');
      const b=a+Math.PI/8;box(1,'gold',[Math.sin(b)*1.077,1.02,Math.cos(b)*1.077-.22],[.07,1.0,.09],[0,b,0]);
      box(1,'pearl',[Math.sin(b)*1.087,.58,Math.cos(b)*1.087-.22],[.13,.30,.14],[0,b,0]);
    }
    // Front library cutaway is a dark shallow alcove with four visible book shelves.
    box(1,'dark',[0,1.17,.84],[1.16,1.45,.15]);
    for(let row=0;row<4;row++){box(1,'gold',[0,.58+row*.32,.97],[1.23,.05,.17]);
      for(let col=0;col<9;col++)box(1,col%3===0?'warm':col%3===1?'stone':'coral',[-.49+col*.12,.73+row*.32,1],[.085,.20+(col%3)*.022,.12],[0,0,(col%3-1)*.06]);
    }
    add(1,'stone',new THREE.SphereGeometry(1,n,8,0,Math.PI*2,0,Math.PI/2),[0,1.55,-.22],[1.12,.95,1.12]);
    ring(1,'gold',[0,1.55,-.22],1.12,.055);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4, meridian:number[][]=[];
      for(let step=0;step<=12;step++){
        const t=step/12*Math.PI/2;
        meridian.push([Math.cos(a)*1.132*Math.cos(t),1.55+.962*Math.sin(t),Math.sin(a)*1.132*Math.cos(t)-.22]);
      }
      path(1,'gold',meridian,.026);
    }
    turret(2,-1.08,.3,1.17);turret(2,1.08,.3,1.17);
    cyl(2,'gold',[0,2.54,-.22],.28,.33,.12);ball(2,'pearl',[0,2.8,-.22],[.25,.3,.25]);ball(2,'warm',[0,3.15,-.22],[.07,.13,.07]);
    // A large open book on a grounded lectern gives the archive its unique foreground.
    cyl(1,'gold',[0,.57,1.2],.1,.21,.45);box(1,'gold',[0,.85,1.2],[.69,.08,.43],[.24,0,0]);
    box(1,'pearl',[-.16,.91,1.2],[.31,.045,.37],[.24,0,-.12]);box(1,'pearl',[.16,.91,1.2],[.31,.045,.37],[.24,0,.12]);
    for(let i=0;i<5;i++){box(3,'gold',[-.16,.94,1.08+i*.043],[.23,.009,.01],[.24,0,-.12]);box(3,'gold',[.16,.94,1.08+i*.043],[.23,.009,.01],[.24,0,.12]);}
  } else {
    // Thick shell gate rises from its own masonry feet. The opening remains legible.
    const arch:number[][]=[];for(let i=0;i<=18;i++){const a=i*Math.PI/18;arch.push([Math.cos(a)*.86,1.43+Math.sin(a)*1.02,-.33]);}
    path(1,'pearl',arch,.19);path(1,'gold',arch.map(p=>[p[0]*.92,1.43+(p[1]-1.43)*.91,p[2]+.15]),.035);
    cyl(1,'stone',[-.86,.93,-.33],.2,.3,1.18);cyl(1,'stone',[.86,.93,-.33],.2,.3,1.18);
    for(const x of [-.86,.86]) {ring(1,'gold',[x,.44,-.33],.28,.04);ring(1,'gold',[x,1.42,-.33],.22,.045);}
    if(level>=1){const surface=new THREE.Mesh(new THREE.CircleGeometry(1,n*2), neutral ? standard(0xa5adb5) : new THREE.MeshBasicMaterial({color:0x8567ee,transparent:true,opacity:.86,side:THREE.DoubleSide,depthWrite:false}));surface.name='ISLAND_7_PORTAL_SURFACE';surface.userData.baseOpacity=neutral?.64:.64+night*.30;if(!neutral&&(surface.material instanceof THREE.MeshBasicMaterial))surface.material.color.multiplyScalar(1+night*.65);surface.position.set(0,1.48,-.36);surface.scale.set(.69,.88,1);root.add(surface);}
    const spiral:number[][]=[];for(let i=0;i<=72;i++){const t=i/72,a=t*Math.PI*6,r=.61*(1-t)+.04;spiral.push([Math.cos(a)*r,1.48+Math.sin(a)*r*1.28,-.28]);}add(1,'violet',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral.map(p=>new THREE.Vector3(p[0],p[1],p[2]))),quality==='high'?72:quality==='medium'?54:36,.024,5,false));ball(1,'aqua',[0,1.48,-.25],[.1,.12,.065]);
    for(let i=0;i<7;i++){const a=(i-3)*.28;ball(2,'pearl',[Math.sin(a)*.61,2.41+Math.cos(a)*.29,-.38],[.16,.42,.16]);path(2,'gold',[[Math.sin(a)*.45,2.35,-.19],[Math.sin(a)*.64,2.62,-.2],[Math.sin(a)*.67,2.89,-.27]],.018);}
    ball(2,'aqua',[0,2.59,-.13],[.10,.17,.07]);
    // Grounded armillary in front, not a floating ornament.
    cyl(2,'gold',[0,.52,1.03],.17,.28,.35);ring(2,'gold',[0,.95,1.03],.42,.028,[.3,.25,0]);ring(2,'gold',[0,.95,1.03],.42,.028,[0,Math.PI/2,.6]);ring(2,'gold',[0,.95,1.03],.42,.028,[Math.PI/2,0,0]);ball(2,'warm',[0,.95,1.03],[.10,.10,.10]);
    for(const x of [-1.16,1.16]){cyl(3,'pearl',[x,.57,.33],.16,.22,.46);add(3,'violet',new THREE.OctahedronGeometry(.29),[x,1.05,.33],[.65,1.6,.65]);ring(3,'gold',[x,.79,.33],.15,.025);}
  }
  for(let stage=1;stage<=3;stage++){
    const group=new THREE.Group();group.name=`ISLAND_7_${id.toUpperCase()}_V2_L${stage}`;
    for(const [key,geometries] of stages[stage-1]){if(stage<=level){const merged=mergeGeometries(geometries,false);if(merged){const mesh=new THREE.Mesh(merged,materials[key]);mesh.name=`${group.name}_${key}`;mesh.castShadow=key!=='glass';mesh.receiveShadow=true;mesh.userData.constructionLevel=stage;group.add(mesh);}}geometries.forEach(g=>g.dispose());}
    if(stage<=level)root.add(group);
  }
  // Discard palettes with no resident mesh; resident materials belong to the world disposer.
  const used=new Set<THREE.Material>();root.traverse(node=>{if(node instanceof THREE.Mesh)(Array.isArray(node.material)?node.material:[node.material]).forEach(m=>used.add(m));});Object.values(materials).forEach(m=>{if(!used.has(m))m.dispose();});
  root.userData.authoringRevision='original-outer-landmarks-v002-inhabited-arcades';root.userData.macroApproval='pending';root.updateMatrixWorld(true);return root;
}

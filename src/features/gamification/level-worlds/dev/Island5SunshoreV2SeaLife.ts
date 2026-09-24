import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';

// Seeded encounters vary on every visit; no shared animation clip or scene reset.
const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const ease = (v: number) => { const t = THREE.MathUtils.clamp(v, 0, 1); return t * t * (3 - 2 * t); };
type Species = 'reef-fish' | 'shark' | 'ray' | 'turtle' | 'octopus' | 'jellyfish';
interface Swimmer { root: THREE.Group; limbs: THREE.Group[]; species: Species; school: number; member: number; size: number; }

export function createSunshoreSeaLife(quality: Island3DQuality) {
  const root = new THREE.Group(); root.name = 'SUNSHORE_LIVING_OCEAN';
  const colors = [0xffa637, 0x218eca, 0xf4cf44, 0xaa69ba, 0x46bda5, 0xe96c6b, 0x456878, 0x638955, 0xad6890, 0xcee9d6, 0x183c49];
  const materials = colors.map(color => new THREE.MeshStandardMaterial({ color, roughness: .62, metalness: .02 }));
  const sphere = new THREE.SphereGeometry(1, 10, 7);
  const actors: Swimmer[] = [];
  const ellipsoid = (parent: THREE.Object3D, name: string, material: number, p: number[], s: number[]) => {
    const m = new THREE.Mesh(sphere, materials[material]); m.name = name;
    m.position.set(p[0], p[1], p[2]); m.scale.set(s[0], s[1], s[2]); parent.add(m); return m;
  };
  const fin = (parent: THREE.Object3D, name: string, material: number, points: number[]) => {
    const geometry = new THREE.BufferGeometry();
    // Both faces without transparent/double-sided passes; compact rigid batching owns disposal.
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...points, ...points.slice(6, 9), ...points.slice(3, 6), ...points.slice(0, 3)], 3));
    geometry.computeVertexNormals(); const mesh = new THREE.Mesh(geometry, materials[material]); mesh.name = name; parent.add(mesh); return mesh;
  };
  const create = (species: Species, school: number, member: number, size: number) => {
    const body = new THREE.Group(); body.name = `SUNSHORE_SEALIFE_${species}_${school}_${member}`;
    body.userData.species = species; body.userData.encounter = school;
    const limbs: THREE.Group[] = [];
    const limb = (name: string, x: number, y: number, z: number) => { const g = new THREE.Group(); g.name = name; g.position.set(x,y,z); body.add(g); limbs.push(g); return g; };
    if (species === 'reef-fish' || species === 'shark') {
      const shark = species === 'shark', color = shark ? 6 : school % 6;
      ellipsoid(body, 'BODY', color, [0,0,0], shark ? [.66,.18,.22] : [.22,.12,.065]);
      ellipsoid(body, 'BELLY', 9, [.06,-.075,0], shark ? [.51,.095,.17] : [.15,.045,.058]);
      if (shark) {
        ellipsoid(body, 'SNOUT', 6, [.52,-.025,0], [.27,.1,.15]);
        fin(body,'DORSAL',6,[-.2,.12,0, .08,.12,0, -.1,.52,0]);
        for (const side of [-1,1]) fin(body,'PECTORAL',6,[.2,0,side*.08, -.34,-.05,side*.58, -.24,0,side*.1]);
        for (const side of [-1,1]) for (let g=0;g<3;g++) ellipsoid(body,'GILL',10,[.22-g*.065,.01,side*.204],[.012,.08,.013]);
      } else {
        fin(body,'DORSAL',color,[-.16,.07,0, .09,.07,0, -.09,.23,0]);
        for (let stripe=0;stripe<2;stripe++) ellipsoid(body,'REEF_STRIPE',9,[-.05+stripe*.11,0,0],[.025,.124,.069]);
      }
      const tail=limb('TAIL_PIVOT',shark?-.57:-.2,0,0);
      fin(tail,'TAIL',color,[0,0,0,shark?-.35:-.14,shark?.34:.13,0,shark?-.3:-.14,shark?-.25:-.13,0]);
      for(const side of [-1,1]) ellipsoid(body,'EYE',10,[shark?.59:.15,.035,side*(shark?.13:.054)],[.025,.025,.015]);
    } else if(species === 'ray') {
      ellipsoid(body,'RAY_BODY',6,[0,0,0],[.5,.095,.25]);
      for(const side of [-1,1]) { const wing=limb('WING',0,0,side*.14); fin(wing,'RAY_WING',6,[.4,0,0,-.4,0,0,-.06,.025,side*.72]); }
      ellipsoid(body,'RAY_TAIL',6,[-.68,0,0],[.55,.025,.025]);
    } else if(species === 'turtle') {
      ellipsoid(body,'SHELL',7,[0,0,0],[.37,.17,.28]); ellipsoid(body,'HEAD',7,[.4,0,0],[.14,.095,.1]);
      for(const side of [-1,1]) for(const x of [-.22,.2]) { const flipper=limb('FLIPPER',x,-.04,side*.2); ellipsoid(flipper,'PADDLE',4,[-.07,0,side*.13],[.18,.035,.18]); }
      for(let i=0;i<3;i++) ellipsoid(body,'SHELL_SCUTE',4,[-.18+i*.18,.15,0],[.075,.035,.16]);
    } else if(species === 'octopus') {
      ellipsoid(body,'MANTLE',8,[-.12,.16,0],[.28,.29,.24]); ellipsoid(body,'HEAD',8,[.13,.03,0],[.22,.17,.21]);
      for(const side of [-1,1]) { ellipsoid(body,'EYE_WHITE',9,[.25,.1,side*.15],[.065,.07,.055]); ellipsoid(body,'PUPIL',10,[.29,.11,side*.17],[.025,.04,.025]); }
      for(let i=0;i<8;i++) { const a=i/8*Math.PI*2; const arm=limb('ARM_'+i,Math.cos(a)*.13,-.06,Math.sin(a)*.13); arm.userData.angle=a;
        const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(Math.cos(a)*.28,-.08,Math.sin(a)*.28),new THREE.Vector3(Math.cos(a+.28)*.5,-.1,Math.sin(a+.28)*.5),new THREE.Vector3(Math.cos(a+.6)*.59,.02,Math.sin(a+.6)*.59)]);
        const m=new THREE.Mesh(new THREE.TubeGeometry(curve,9,.036,4,false),materials[8]); m.name='CURLED_ARM';arm.add(m);
      }
    } else {
      ellipsoid(body,'JELLY_BELL',8,[0,.08,0],[.24,.17,.24]);
      for(let i=0;i<5;i++) { const a=i*2.4; const t=limb('TENTACLE',Math.cos(a)*.12,-.07,Math.sin(a)*.12);ellipsoid(t,'FILAMENT',9,[0,-.22,0],[.015,.25,.015]); }
    }
    body.scale.setScalar(size); root.add(body); actors.push({root:body,limbs,species,school,member,size});
  };
  const schools = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  for(let s=0;s<schools;s++) for(let i=0;i<(quality==='high'?8:quality==='medium'?6:4);i++) create('reef-fish',s,i,.85+random(s*31+i)*.45);
  for(let i=0;i<(quality==='low'?2:3);i++) create('shark',10+i,0,1.5+i*.22);
  for(let i=0;i<(quality==='low'?1:3);i++) create('ray',14+i,0,1.05+i*.13);
  for(let i=0;i<(quality==='low'?1:3);i++) create('turtle',18+i,0,1);
  for(let i=0;i<2;i++) create('octopus',22+i,0,1.05);
  for(let i=0;i<(quality==='low'?2:5);i++) create('jellyfish',26,i,.8+random(i)*.4);

  const nextPosition = new THREE.Vector3();
  function samplePosition(actor: Swimmer, elapsed: number, position: THREE.Vector3) {
    const {school, member, species} = actor;
    const duration = 71 + random(school + 51) * 83;
    const clock = elapsed + duration * random(school + 9);
    const visit = Math.floor(clock / duration), phase = clock / duration - visit;
    const seed = school * 179 + visit * 997;
    const presence = ease(phase / .17) * ease((.9 - phase) / .2);
    const direction = random(seed + 3) > .5 ? 1 : -1;
    const angle = random(seed + 1) * Math.PI * 2 + direction * phase * (1.3 + random(seed + 2) * 2.4);
    const near = species === 'shark' ? 11.4 : species === 'octopus' ? 9.3 : 10.1;
    const radius = near + random(seed + 4) * 2.8 + (1 - presence) * 17 + Math.sin(phase * 8 + school) * .6;
    const depth = species === 'octopus' ? -1.5 : species === 'shark' ? -1.12 : species === 'jellyfish' ? -1.3 : -1.12;
    // Unequal spacing plus small independent lateral drift retains school cohesion
    // without arranging the animals into a rigid grid or synchronized formation.
    const spread = species === 'reef-fish' ? .33 : .48;
    const formationAngle = member * 2.399963 + random(school) * 6.28;
    const formationRadius = Math.sqrt(member) * spread;
    const along = Math.cos(formationAngle) * formationRadius + Math.sin(elapsed * .43 + member * 2.1) * .11;
    const across = Math.sin(formationAngle) * formationRadius + Math.sin(elapsed * .31 + member * 1.7) * .09;
    position.set(
      Math.cos(angle) * (radius + across) - Math.sin(angle) * along,
      depth - (1 - presence) * 2.5 + Math.sin(elapsed * .37 + member + school) * .035,
      Math.sin(angle) * (radius + across) + Math.cos(angle) * along,
    );
    return phase < .9;
  }
  function update(elapsed: number) {
    for (const actor of actors) {
      const {school, member, species} = actor;
      actor.root.visible = samplePosition(actor, elapsed, actor.root.position);
      samplePosition(actor, elapsed + .05, nextPosition);
      // Forward tangent includes radial entry/exit, not just the orbit angle.
      actor.root.rotation.y = -Math.atan2(nextPosition.z - actor.root.position.z, nextPosition.x - actor.root.position.x);
      for(let j=0;j<actor.limbs.length;j++) {
        const limb=actor.limbs[j], beat=elapsed*(species==='shark'?1.7:species==='reef-fish'?5.2:1.15)+member*.8+school+j*.7;
        if(species==='reef-fish'||species==='shark') limb.rotation.y=Math.sin(beat)*.3;
        else if(species==='octopus') { limb.rotation.y=Math.sin(beat*.67)*.16;limb.rotation.z=Math.sin(beat)*.13; }
        else limb.rotation.x=Math.sin(beat)*.24;
      }
      if(species==='jellyfish') actor.root.scale.set(actor.size*(1+Math.sin(elapsed*1.3+member)*.08),actor.size,actor.size*(1+Math.sin(elapsed*1.3+member)*.08));
    }
  }
  // A composed still-life also exists before the first frame / in reduced motion.
  update(0);
  root.userData.seaLifePopulation=actors.length;
  return {root,update};
}

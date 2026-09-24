// Decorative chassis parts only: no hit targets, state or gameplay actions.
export function createChassisDetails(THREE,{surface,curvedFace,mergeVertices}){
 const root=new THREE.Group();root.name='chassis-inset-and-visual-shoulders';
 const graphite=new THREE.MeshPhysicalMaterial({color:'#101820',roughness:.52,metalness:.28,clearcoat:.15});
 const trim=new THREE.MeshStandardMaterial({color:'#778d9b',metalness:.8,roughness:.32});
 const shoulderMat=new THREE.MeshPhysicalMaterial({color:'#24343e',metalness:.6,roughness:.32,clearcoat:.2});
 const s=new THREE.Shape();s.moveTo(-2.76,.71);s.quadraticCurveTo(-2.73,1.24,-2.45,1.45);s.quadraticCurveTo(-1.8,1.65,-1.2,1.50);s.lineTo(1.2,1.50);s.quadraticCurveTo(1.8,1.65,2.45,1.45);s.quadraticCurveTo(2.73,1.24,2.76,.71);s.lineTo(2.54,.64);s.lineTo(1.23,.40);s.lineTo(-1.23,.40);s.lineTo(-2.54,.64);s.closePath();
 const g=curvedFace(s,.024);g.deleteAttribute('normal');const smooth=mergeVertices(g);smooth.computeVertexNormals();g.dispose();
 const mountingPlate=new THREE.Mesh(smooth,graphite);mountingPlate.name='recessed-upper-control-carrier';root.add(mountingPlate);
 function line(name,pts,r,mat){const path=new THREE.CatmullRomCurve3(pts.map(([x,y])=>new THREE.Vector3(x,y,surface(x,y)+.032)));const m=new THREE.Mesh(new THREE.TubeGeometry(path,160,r,8,false),mat);m.name=name;root.add(m);}
 // A paired dark groove and narrow metal lip defines the bridge's upper edge.
 const seam=[[-1.32,.38],[-1.18,.36],[-1.0,.35],[0,.35],[1.0,.35],[1.18,.36],[1.32,.38]];
 line('bridge-shadow-gap',seam,.014,graphite);
 line('bridge-machined-lip',seam.map(([x,y])=>[x,y-.025]),.009,trim);
 for(const side of [-1,1]){
  const shape=new THREE.Shape();shape.moveTo(-.52,-.07);shape.lineTo(.52,-.07);shape.quadraticCurveTo(.61,-.07,.61,.01);shape.lineTo(.61,.075);shape.quadraticCurveTo(.61,.15,.51,.15);shape.lineTo(-.51,.15);shape.quadraticCurveTo(-.61,.15,-.61,.075);shape.lineTo(-.61,.01);shape.quadraticCurveTo(-.61,-.07,-.52,-.07);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:16});geometry.computeVertexNormals();
  const bumper=new THREE.Mesh(geometry,shoulderMat);bumper.name=side<0?'visual-left-shoulder':'visual-right-shoulder';bumper.position.set(side*1.94,1.54,-.04);bumper.scale.y=.62;bumper.rotation.z=-side*.08;root.add(bumper);
  // Fine metallic accent, kept dark enough not to compete with Roll.
  const accent=new THREE.Mesh(new THREE.BoxGeometry(.83,.009,.014),trim);accent.position.set(side*1.94,1.595,.222);accent.rotation.z=-side*.08;root.add(accent);
 }
 function setTheme(t){trim.color.set(t.light);shoulderMat.color.set(t.panel);graphite.color.set(t.chassis||(t.iconGlow?'#9ab3c5':'#101820'));}
 return {root,setTheme};
}

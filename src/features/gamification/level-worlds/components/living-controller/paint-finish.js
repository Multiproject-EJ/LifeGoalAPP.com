import {ornamentTexture} from './theme-finishes.js';
// Resolution-independent enamel boundaries and light embedded in the finish.
export function createPaintMaterial(THREE,palette,uniforms){
 const decoration=ornamentTexture(THREE,palette.ornament);
 const mat=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:palette.roughness??.30,metalness:palette.metalness??.22,clearcoat:palette.clearcoat??.6,clearcoatRoughness:palette.clearcoatRoughness??.22,envMapIntensity:palette.ornament==='gold'?.65:.25});
 mat.addEventListener('dispose',()=>decoration.dispose());
 mat.onBeforeCompile=shader=>{
  shader.uniforms.paintTrim={value:palette.trim?new THREE.Color(palette.trim):palette.iconGlow?new THREE.Color('#bdd9eb'):new THREE.Color(.64,.39,.12)};
  Object.assign(shader.uniforms,uniforms,{paintCenter:{value:new THREE.Color(palette.center)},paintGrip:{value:new THREE.Color(palette.shell)},paintAccent:{value:new THREE.Color(palette.light)},ornaments:{value:decoration},finishKind:{value:palette.ornament==='wood'?2:palette.ornament?1:0}});
  shader.vertexShader='varying vec3 paintPosition;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\npaintPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=`varying vec3 paintPosition;
uniform vec3 paintCenter,paintGrip,paintAccent,paintTrim;
uniform sampler2D ornaments;
uniform float finishKind;
uniform float paintTime,paintEnergy,paintPower,paintJackpot;
float paintLine(float phase){float d=abs(fract(phase)-.5);float aa=max(fwidth(phase),.001);return 1.-smoothstep(.018,.018+aa,d);}
`+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 p=paintPosition.xy;
// Carry the centre finish down the inner handles; keep the upper grip boundary fixed.
float lowerExtension=.32*(1.-smoothstep(-1.05,.45,p.y));
float edge=1.25+.8*clamp((.7-p.y)/2.2,0.,1.)+lowerExtension;
float seam=abs(p.x)-edge;
float aa=max(fwidth(seam),.002);
float grip=smoothstep(-aa,aa,seam);
float trim=1.-smoothstep(.010,.010+aa,abs(seam));
float ink=0.;
float decor=texture2D(ornaments,vec2((p.x+3.)/6.,(p.y+1.75)/3.5)).a;
float warp=sin(p.x*1.8+p.y*.5)*2.7+sin(p.x*5.1-p.y*2.3)*.35;
float grainPhase=p.x*76.+sin(p.y*1.6+p.x*2.)*5.+sin(p.y*4.1+p.x)*.85+warp;
float grain=(.5+.5*sin(grainPhase))*.65+(.5+.5*sin(grainPhase*2.73+p.x*7.))*.35;
float pores=paintLine(grainPhase*.57);
if(finishKind>1.5)ink=pores*.35;
else if(finishKind>.5)ink=decor;
vec3 enamel=mix(paintCenter,paintGrip,grip);
enamel=mix(enamel,vec3(.08,.32,.43),ink*.20*(1.-grip));
if(finishKind>1.5){
 float growth=.5+.5*sin(p.x*13.+sin(p.y*.9+p.x)*2.4);
 // Warm heartwood, irregular growth bands and fine open pores, not printed stripes.
 enamel*=.67+grain*.32+growth*.22-pores*.13;
 enamel=mix(enamel,enamel*vec3(1.10,.78,.61),pow(growth,5.)*.32);
}
else if(finishKind>.5)enamel=mix(enamel,vec3(.78,.52,.19),decor*.95);
enamel=mix(enamel,paintTrim,trim*.8);
enamel=mix(enamel,vec3(.78,.44,.065),paintJackpot);
diffuseColor.rgb=enamel;
`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
// Localised light drifting beneath the enamel, not stripes painted on its surface.
float buriedLight=0.;
float supercharge=smoothstep(.82,1.,paintEnergy)*paintPower;
float energyTime=paintTime*(1.+supercharge*.85);
for(int i=0;i<32;i++){
 float seed=float(i);
 vec2 origin=i<10?vec2(sin(seed*127.1)*1.38,.12+cos(seed*73.7)*.16):vec2(sin(seed*127.1)*2.65,cos(seed*73.7)*1.25);
 vec2 drift=vec2(sin(energyTime*.22+seed*2.1)*.18,cos(energyTime*.17+seed*1.7)*.06);
 vec2 d=p-origin-drift;
 float life=pow(.5+.5*sin(energyTime*.9+seed*2.7),4.);
 float core=exp(-dot(d,d)/.0012);
 float haze=exp(-dot(d,d)/.026)*.28;
 float star=exp(-abs(d.x)*260.-abs(d.y)*30.)+exp(-abs(d.y)*260.-abs(d.x)*30.);
 buriedLight+=(core+haze+star*supercharge*.32)*life*(i<16?1.:supercharge);
}
for(int i=0;i<3;i++){
 float seed=float(i);
 vec2 center=vec2(sin(paintTime*.14+seed*2.1)*2.1,cos(paintTime*.19+seed*2.4)*.9);
 vec2 d=p-center;
 buriedLight+=exp(-dot(d,d)/.23)*.12;
}
// Normal power retains the former max sparkle; max adds more stars and a flowing field.
float activity=paintPower*(1.85+supercharge*4.);
float field=(.5+.5*sin(p.x*2.5-p.y*3.+energyTime*.9))*.14*supercharge;
float energyInk=(buriedLight+trim*.10)*(1.-grip*.45);
if(finishKind>1.5)energyInk*=.4;
totalEmissiveRadiance+=mix(paintAccent,vec3(1.,.55,.06),paintJackpot)*activity*(energyInk+field);
// Jackpot shimmer is independent of dice balance and selected multiplier.
totalEmissiveRadiance+=vec3(1.,.78,.28)*buriedLight*paintJackpot*1.7;
`);
  if(palette.ornament==='wood')shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(.65+pores*.20-grain*.06,.58,.86);
`);
  if(palette.ornament==='gold')shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
// Polished bridge versus satin grip metal, with subtle directional brushing.
float brushPhase=paintPosition.y*540.;
float brush=sin(brushPhase)*exp(-fwidth(brushPhase)*.7);
roughnessFactor=mix(.24,.34,grip)+brush*.025;
`);
 };
 mat.customProgramCacheKey=()=> 'controller-enamel-v3-'+(palette.ornament||'plain');return mat;
}

// A single thin-line, monochrome etched-metal family; no sticker outlines.
export function drawEmblem(c,id,ink='#e9faff',metallic=false,glow=null){
 c.save();c.translate(256,256);c.scale(3.8,3.8);
 const metal=c.createLinearGradient(-20,-35,20,38);metal.addColorStop(0,'#fff0c8');metal.addColorStop(.35,'#e2bf7b');metal.addColorStop(.55,'#ac8242');metal.addColorStop(1,'#efcf8e');
 c.strokeStyle=metallic?metal:ink;c.fillStyle=ink;c.lineWidth=metallic?4.8:3;c.lineCap='round';c.lineJoin='round';
 c.shadowColor=glow||'#0005';c.shadowBlur=glow?14:1.5;c.shadowOffsetY=glow?0:1;
 c.beginPath();
 if(id==='concord'){
  c.moveTo(-25,33);c.bezierCurveTo(-33,8,-8,-27,29,-34);c.bezierCurveTo(32,-8,7,23,-19,27);
  c.moveTo(-29,38);c.lineTo(21,-25);
  c.moveTo(-13,18);c.lineTo(-17,2);c.moveTo(-3,6);c.lineTo(15,1);
  c.moveTo(8,-8);c.lineTo(6,-23);
 }else if(id==='build'){
  c.save();c.rotate(-.65);c.roundRect(-5,-10,10,48,3);
  c.moveTo(-23,-31);c.lineTo(22,-31);c.lineTo(26,-17);c.lineTo(-23,-17);c.closePath();c.stroke();c.restore();c.restore();return;
 }else if(id==='creatures'){
  for(const [x,y,rx,ry,a] of [[-23,-14,6,9,-.4],[-8,-27,7,10,-.1],[10,-26,7,10,.1],[25,-11,6,9,.4]]){c.moveTo(x+rx*Math.cos(a),y+rx*Math.sin(a));c.ellipse(x,y,rx,ry,a,0,Math.PI*2);}
  c.moveTo(-22,25);c.bezierCurveTo(-25,15,-11,-2,0,-2);c.bezierCurveTo(11,-2,25,16,23,26);c.bezierCurveTo(21,35,8,29,0,29);c.bezierCurveTo(-8,29,-18,35,-22,25);
 }else{
  c.moveTo(-23,-14);c.lineTo(23,-14);c.lineTo(27,32);c.lineTo(-27,32);c.closePath();
  c.moveTo(-11,-9);c.lineTo(-11,-23);c.bezierCurveTo(-11,-40,11,-40,11,-23);c.lineTo(11,-9);
 }
 c.stroke();c.restore();
}

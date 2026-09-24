export const finishes={
 light:{name:'Default Light',center:'#197dad',shell:'#edf4fa',panel:'#c4e9f5',light:'#53caff',depletedLight:'#ff9255',emptyRoll:['#ffb477','#bf4825','#8c301e','#ed7940'],roll:['#9ae6ff','#298bbd','#155680','#65c7eb'],ink:'#f0fbff',iconInk:'#126da1',iconGlow:'#64d7ff',translucentButtons:true,ornament:'plain',metalness:.12,roughness:.28},
 ice:{name:'Default Day',center:'#086391',shell:'#c9ecfa',panel:'#123448',light:'#78edff',depletedLight:'#ff9255',emptyRoll:['#ffb477','#bf4825','#8c301e','#ed7940'],roll:['#a3efff','#278fc6','#145483','#55c8ed'],ink:'#effaff'},
 dark:{name:'Default Dark Mode',center:'#10263d',shell:'#101e30',panel:'#0b203b',light:'#249fff',trim:'#318ddd',depletedLight:'#204b83',readyLight:'#66dfff',iconInk:'#bceaff',iconGlow:'#258fff',chassis:'#101820',emptyRoll:['#163957','#102942','#09192d','#173857'],roll:['#237cbe','#124b83','#102a50','#258bcc'],ink:'#effaff'},
 christmas:{name:'Christmas — Original',center:'#702c39',shell:'#16463b',panel:'#12372b',light:'#ffe0a0',roll:['#b66858','#7d2535','#471d2e','#b37b43'],ink:'#fff3cd',holiday:true,ornament:'classic'},
 snow:{name:'Christmas — Snow & Gold',center:'#36728c',shell:'#f3eddf',panel:'#234657',light:'#f7d99d',roll:['#c3f3ff','#408fae','#215b7d','#86d9ec'],ink:'#fff1cb',holiday:true,ornament:'snow',metalness:.32,roughness:.28},
 classic:{name:'Christmas — Classic',center:'#073b29',shell:'#9b172e',panel:'#103c2c',light:'#ffda80',roll:['#8aa97a','#1f6142','#103727','#648f57'],ink:'#ffe5a0',holiday:true,ornament:'classic',metalness:.4,roughness:.27},
 gold:{name:'Gold — Satin Champagne',center:'#d0a343',shell:'#e4bc63',panel:'#d4a74d',chassis:'#ac8038',light:'#ffe5a0',trim:'#f2d791',roll:['#fff0bd','#e1bb66','#be9141','#efd18c'],ink:'#382309',iconInk:'#51330e',ornament:'gold',metalness:.92,roughness:.3,panelMetalness:.85,panelRoughness:.32,panelClearcoat:.08},
 wood:{name:'Wood — Satin Teak',center:'#a7653e',shell:'#a7653e',panel:'#915535',chassis:'#68452f',light:'#efc394',trim:'#b78954',roll:['#ca9467','#a56740','#7e452c','#b98050'],ink:'#fff1d7',ornament:'wood',metalness:0,roughness:.72,clearcoat:.035,clearcoatRoughness:.8,panelRoughness:.72,panelMetalness:0,panelClearcoat:.035}
};

export function ornamentTexture(THREE,kind){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1200;const c=canvas.getContext('2d');
 c.strokeStyle='#fff';c.fillStyle='#fff';c.lineWidth=2.5;
 function snow(x,y,r){c.save();c.translate(x,y);for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-r);for(const d of [.45,.7]){c.moveTo(0,-r*d);c.lineTo(-r*.15,-r*(d+.15));c.moveTo(0,-r*d);c.lineTo(r*.15,-r*(d+.15));}c.stroke();c.restore();}c.restore();}
 function branch(x,y,flip){c.save();c.translate(x,y);c.scale(flip,1);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(100,-10,200,35,360,-90);c.stroke();for(let i=1;i<12;i++){const a=i/12,xx=360*a,yy=20*Math.sin(a*3)-90*a*a;c.save();c.translate(xx,yy);c.rotate(-a*.9);c.beginPath();c.ellipse(0,-14,5,17,-.6,0,Math.PI*2);c.ellipse(13,13,5,17,.7,0,Math.PI*2);c.fill();c.restore();}c.restore();}
 if(kind==='snow'||kind==='classic'){
  snow(1024,590,74);
  if(kind==='classic'){branch(1120,600,1);branch(928,600,-1);}else{for(const side of [-1,1]){snow(1024+side*235,605,31);c.beginPath();c.moveTo(1024+side*95,610);c.bezierCurveTo(1024+side*150,545,1024+side*250,710,1024+side*355,575);c.stroke();}}
  for(const [x,y,r] of [[580,700,27],[1450,750,24],[250,850,37],[1770,850,37],[370,1000,26],[1650,1000,26],[750,190,30],[1310,190,30]])snow(x,y,r);
  for(let i=0;i<130;i++){const x=(i*541)%2048,y=(i*337)%1200;c.globalAlpha=.25+(i%4)*.15;c.beginPath();c.arc(x,y,i%9===0?2.6:1,0,Math.PI*2);c.fill();}c.globalAlpha=1;
 }
 // Gold is deliberately unornamented: material contrast instead of floral graphics.
 const tex=new THREE.CanvasTexture(canvas);tex.anisotropy=8;return tex;
}

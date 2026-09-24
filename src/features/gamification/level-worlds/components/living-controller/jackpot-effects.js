// Shared presentation-only jackpot artwork. No gameplay state or random outcomes.
export function drawJackpotButton(c,id,time,reduced=false,backgroundOnly=false){
 const index=Math.max(0,['shop','build','concord','creatures'].indexOf(id));
 const t=reduced?1.1:time,phase=(t+index*.22)%3.4;
 c.save();
 const well=c.createRadialGradient(256,260,25,256,260,240);
 well.addColorStop(0,'#36203bd9');well.addColorStop(.55,'#60351070');well.addColorStop(1,'#45210400');
 c.fillStyle=well;c.fillRect(0,0,512,512);
 // Back layer: two staggered fireworks, with falling curved spark trails.
 c.save();c.globalCompositeOperation='lighter';
 for(let burst=0;burst<2;burst++){
   const age=reduced?.8:(phase+burst*1.65)%3.4;
   if(age>2.5)continue;
   const life=Math.sin(Math.min(1,age/2.5)*Math.PI),cx=burst?329:181,cy=burst?226:177;
   const palette=burst?['#a9f3ff','#fff4c0','#6ad8ff']:['#ffe282','#fffbdc','#ffb54d'];
   for(let i=0;i<22;i++){
     const angle=i/22*Math.PI*2+burst*.17;
     const speed=67+(i%4)*15;
     const point=a=>[cx+Math.cos(angle)*speed*a,cy+Math.sin(angle)*speed*a+a*a*20];
     c.strokeStyle=palette[i%3];c.lineWidth=i%3===0?5:2.8;c.lineCap='round';
     for(let tail=0;tail<4;tail++){
       const a=Math.max(0,age-tail*.07),b=Math.max(0,a-.08),p=point(a),q=point(b);
       c.globalAlpha=life*(1-tail/5)*.8;c.beginPath();c.moveTo(...q);c.lineTo(...p);c.stroke();
     }
     const p=point(age);c.globalAlpha=life;c.fillStyle='#fffce2';c.shadowColor=palette[i%3];c.shadowBlur=12;
     c.beginPath();c.arc(p[0],p[1],i%4===0?3:1.5,0,Math.PI*2);c.fill();c.shadowBlur=0;
   }
 }
 c.restore();
 if(backgroundOnly){c.restore();return;}
 // Raised central jewel: shaded side wall, metallic face and a moving highlight.
 const mode=reduced?index%3:Math.floor(t/3.4)%3;
 const bounce=reduced?0:Math.sin(phase/3.4*Math.PI*2)*10;
 c.save();c.translate(256,264+bounce);c.rotate(reduced?0:Math.sin(t*1.7+index*.25)*.07);
 function glyph(){c.beginPath();
   if(mode===0){for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,r=j%2?48:109;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();}
   else if(mode===1){c.moveTo(0,-110);c.lineTo(100,-24);c.lineTo(0,119);c.lineTo(-100,-24);c.closePath();}
   else{c.moveTo(-104,-56);c.lineTo(-50,-7);c.lineTo(0,-107);c.lineTo(50,-7);c.lineTo(104,-56);c.lineTo(80,90);c.lineTo(-80,90);c.closePath();}
 }
 c.shadowColor='#1c0c23';c.shadowBlur=24;c.shadowOffsetY=17;
 for(let z=9;z>=0;z-=3){c.save();c.translate(0,z);glyph();c.fillStyle=z?'#915016':'#fce5a0';c.fill();c.restore();c.shadowBlur=0;}
 const metal=c.createLinearGradient(-80,-120,70,120);metal.addColorStop(0,'#fffde9');metal.addColorStop(.27,'#ffe8a3');metal.addColorStop(.5,'#e4ac38');metal.addColorStop(.72,'#fff4bb');metal.addColorStop(1,'#bc731a');
 glyph();c.fillStyle=metal;c.fill();c.strokeStyle='#fff3c5';c.lineWidth=3;c.stroke();
 c.save();glyph();c.clip();c.rotate(-.4);
 const sweep=reduced?-35:((t*.3)%1)*360-180;
 const sheen=c.createLinearGradient(sweep-35,0,sweep+35,0);sheen.addColorStop(0,'#ffffff00');sheen.addColorStop(.5,'#fffde6b0');sheen.addColorStop(1,'#ffffff00');c.fillStyle=sheen;c.fillRect(-180,-160,360,320);c.restore();
 if(mode===1){c.strokeStyle='#9e692e';c.lineWidth=3;c.beginPath();c.moveTo(-100,-24);c.lineTo(100,-24);c.moveTo(0,-110);c.lineTo(-35,-24);c.lineTo(0,119);c.lineTo(35,-24);c.lineTo(0,-110);c.stroke();}
 if(mode===2){c.fillStyle='#fff0bd';c.fillRect(-80,100,160,10);}
 c.restore();
 // Foreground: crisp glints at a different depth from the fireworks.
 c.save();c.globalCompositeOperation='lighter';
 for(let i=0;i<10;i++){
   const angle=i*2.399,r=135+(i%3)*30;
   const x=256+Math.cos(angle)*r,y=256+Math.sin(angle)*r;
   const alpha=reduced?.6:Math.pow(.5+.5*Math.sin(t*1.8+i*1.7+index*.3),4);
   const size=5+alpha*13;c.globalAlpha=alpha;c.strokeStyle='#fff7c7';c.lineWidth=2;c.shadowColor='#ffd879';c.shadowBlur=14;
   c.beginPath();c.moveTo(x-size,y);c.lineTo(x+size,y);c.moveTo(x,y-size);c.lineTo(x,y+size);c.stroke();
 }
 c.restore();c.restore();
}

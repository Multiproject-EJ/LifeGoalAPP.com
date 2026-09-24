// Area centroid keeps labels centred inside asymmetric tapered button outlines.
export function outlineCentroid(points){
 let area2=0,x=0,y=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],cross=a.x*b.y-b.x*a.y;
  area2+=cross;x+=(a.x+b.x)*cross;y+=(a.y+b.y)*cross;
 }
 if(Math.abs(area2)<1e-9)throw new Error('Button outline has no area');
 return {x:x/(3*area2),y:y/(3*area2)};
}

const assert=require('node:assert/strict');
const {metrics,outline,project}=require('../app/src/main/assets/shelf-materials.js');
let checks=0;
for(const width of [280,345,520]){
 const m=metrics(width+40,852),body=m.body;
 const shape=outline(m);assert.equal(shape.length,6);assert.ok(shape.every(p=>p.every(Number.isFinite)));assert.ok(Math.max(...shape.map(p=>p[0]))<m.front);checks++;
 let previousRay=0,previousAlpha=1;
 for(const fraction of [0,.1,.25,.5,.6]){
  const lift=body*fraction,cast=project(m,{x:-40,y:70-lift,lift});
  assert.equal(cast.polygon.length,6);assert.ok(cast.polygon.flat().every(Number.isFinite));
  assert.ok(cast.ray[0]<0&&cast.ray[1]>0,'one upper-right light must cast consistently down-left');
  assert.ok(Math.hypot(...cast.ray)>=previousRay);assert.ok(cast.opacity<=previousAlpha);
  const standing=project(m,{x:-40,y:70,lift:0});
  assert.ok(Math.abs(cast.footprint[0][1]-standing.footprint[0][1])<body*.02,'a raised book must not lift its floor shadow into the air');
  previousRay=Math.hypot(...cast.ray);previousAlpha=cast.opacity;checks++;
 }
 const a=project(m,{x:0,y:0,lift:0}),b=project(m,{x:27,y:13,lift:0});
 a.polygon.forEach((point,i)=>{assert.ok(Math.abs(b.polygon[i][0]-point[0]-27)<1e-9);assert.ok(Math.abs(b.polygon[i][1]-point[1]-13)<1e-9);});checks++;
}
console.log('PASS '+checks+' shadow geometry cases (light direction, lifted cast, finite bounds, translation)');

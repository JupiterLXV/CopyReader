const assert=require('node:assert/strict');
const {release,settle}=require('../app/src/main/assets/shelf-motion.js');
let cases=0;
for(const position of [-19.9,-3.51,-.49,0,.1,.49,.9,10.5]){
 for(const velocity of [-100,-40,-8,-4,-1.6,0,.8,1.6,4,8,40,100]){
  const motion=release(position,velocity),sign=Math.sign(motion.target-position);
  assert.ok(Number.isInteger(motion.target));
  assert.ok(Math.abs(motion.sample(0).position-position)<1e-9);
  let previous=position,previousSpeed=Infinity,done=false;
  for(let t=0;t<=2;t+=1/240){
   const s=motion.sample(t);assert.ok(Number.isFinite(s.position)&&Number.isFinite(s.velocity));
   assert.ok((s.position-previous)*sign>=-1e-8,'release reversed direction');
   assert.ok((motion.target-s.position)*sign>=-1e-8,'release overshot its book');
   if(Math.abs(velocity)>=1.5){assert.ok(Math.abs(s.velocity)<=previousSpeed+1e-8,'fling accelerated after release');previousSpeed=Math.abs(s.velocity);}
   previous=s.position;if(s.done){assert.equal(s.position,motion.target);assert.equal(s.velocity,0);done=true;break;}
  }
  assert.ok(done,'motion failed to come to rest');cases++;
 }
}
for(const velocity of [2,5,20,52]){
 const a=release(.23,velocity),b=release(-.23,-velocity);
 for(let t=0;t<1.5;t+=.013){assert.ok(Math.abs(a.sample(t).position+b.sample(t).position)<1e-8);assert.ok(Math.abs(a.sample(t).velocity+b.sample(t).velocity)<1e-8);}
 cases++;
}
for(const hz of [30,60,90,120,144]){
 const motion=release(7.3,38);let sample;
 for(let frame=0;frame<=hz/2;frame++)sample=motion.sample(frame/hz);
 assert.deepEqual(sample,motion.sample(.5));cases++;
}
for(const [p,target,v] of [[0,5,40],[5,-2,40],[.49,0,-9],[-.4,0,0],[1,1,0]]){
 const motion=settle(p,target,v);let previous=p;
 for(let t=0;t<=1.3;t+=.01){const s=motion.sample(t);assert.ok((s.position-previous)*Math.sign(target-p)>=-1e-8);assert.ok((target-s.position)*Math.sign(target-p)>=-1e-8);previous=s.position;}
 assert.deepEqual(motion.sample(1.3),{position:target,velocity:0,done:true});cases++;
}
console.log('PASS '+cases+' deterministic motion cases (monotonic coast, exact landing, direction symmetry, frame rate independence, retargeting)');

const assert=require('node:assert/strict');
const motion=require('../app/src/main/assets/archive-motion.js');
let checks=0;
assert.deepEqual(motion.timing.standard,{enter:420,exit:320,reader:320,sheet:420});checks++;
for(const width of [320,393,768])for(const direction of [-1,1]){
 const frames=motion.plane(width,direction);assert.equal(frames.length,2);assert.ok(frames.every(frame=>!Object.hasOwn(frame,'opacity')));assert.ok(frames[0].clipPath.includes(String(Math.min(180,width*.46))));assert.match(frames[1].transform,/0px,0px/);checks++;
}
for(let i=0;i<20;i++){const [start,end]=motion.interval('row',i);assert.ok(start>=0&&end<=1&&end>start);if(i>8)assert.deepEqual(motion.interval('row',i),motion.interval('row',8));checks++;}
assert.deepEqual(motion.interval('code'),[.16,.88]);assert.deepEqual(motion.interval('feature'),[.18,.84]);assert.deepEqual(motion.interval('rule'),[0,.46]);checks++;
for(const axis of ['horizontal','vertical']){const frames=motion.part(axis,[-8,-6]);assert.equal(frames[1].clipPath,'inset(0 0 0 0)');assert.ok(frames.every(f=>!Object.hasOwn(f,'opacity')));checks++;}
console.log('PASS '+checks+' archive timing, opaque-plane and bounded reveal cases');

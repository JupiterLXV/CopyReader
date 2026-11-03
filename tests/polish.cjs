const assert=require('node:assert/strict');
const {metrics,pose,project,defs}=require('../app/src/main/assets/shelf-materials.js');
const {circle,duration,hapticGate}=require('../app/src/main/assets/app-motion.js');
const {status,caption}=require('../app/src/main/assets/book-metadata.js');
let count=0;
for(const [w,h] of [[320,740],[393,852],[430,932],[768,1024]]){
 const m=metrics(w,h);assert.ok(m.face>60&&m.body>100&&m.stage>200);assert.ok(Object.values(m).every(Number.isFinite));
 for(let d=-12;d<=12;d+=.1){const p=pose(d,m),cast=project(m,p);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(cast.polygon.every(point=>point[1]<m.stage+1));}
 const left=pose(-6,m),right=pose(6,m),centre=pose(2,m);assert.ok(left.y-centre.y>30,'a visibly curved rail must rise at its outer edge');assert.ok(right.y>left.y);count++;
}
assert.match(defs(),/id="paper-spine-light"/);assert.match(defs(),/id="paper-face-light"/);assert.match(defs(),/id="paper-fiber"/);count++;
for(const [x,y,w,h] of [[360,25,393,852],[1,1,320,740],[0,0,768,1024],[999,-12,393,852]]){
 const c=circle(x,y,w,h);for(const [cx,cy] of [[0,0],[w,0],[0,h],[w,h]])assert.ok(Math.hypot(cx-c.x,cy-c.y)<c.radius);count++;
}
assert.equal(duration({motionStyle:'none'}),0);assert.ok(duration({motionStyle:'slide',motionSpeed:'quick'})<duration({motionStyle:'fade',motionSpeed:'standard'}));assert.ok(duration({motionSpeed:'calm'},true)>duration({motionSpeed:'calm'}));count++;
let tick=hapticGate();assert.equal(tick(0,0,true,true),false);assert.equal(tick(1,10,true,true),true);assert.equal(tick(2,20,true,true),false);assert.equal(tick(3,80,true,true),true);assert.equal(tick(4,150,true,false),false);assert.equal(tick(5,240,false,true),false);assert.equal(tick(5,300,true,true),false);assert.equal(tick(6,310,true,true),true);count++;
for(const text of ['已完结','完结','完結','已完結','completed'])assert.equal(status({display:text}).completed,true);
for(const text of ['未完结','连载中','暂停连载'])assert.equal(status({display:text}).completed,false);
assert.equal(status(1),null);assert.equal(status(null),null);count++;
assert.equal(caption({status:{display:'已完结'},author:[],datetime_updated:'2026-11-03'}),'已完结');assert.equal(caption({status:{display:'已完结'},author:[{name:'作者'}],datetime_updated:'2026-11-03'}),'作者 · 已完结');assert.equal(caption({author:[],datetime_updated:'2026-11-03'}),'更新于 11月03日');assert.match(caption({status:'连载中',author:[],datetime_updated:'2026-11-03'}),/^连载中/);count++;
console.log('PASS '+count+' production geometry, status, reveal-radius and haptic-gating checks');

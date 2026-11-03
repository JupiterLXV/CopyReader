'use strict';
// Positions use book pitches; elapsed time uses seconds. No timers or DOM here.
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function settle(position,target,velocity=0){
  const rate=18,distance=target-position;
  velocity=distance*velocity>0?Math.sign(distance)*Math.min(Math.abs(velocity),rate*Math.abs(distance)):0;
  const a=position-target,b=velocity+rate*a;
  return {target,sample(time){
   const t=Math.max(0,time),decay=Math.exp(-rate*t),x=target+(a+b*t)*decay,v=(b-rate*(a+b*t))*decay;
   const done=t>=1.2||Math.abs(x-target)<.001&&Math.abs(v)<.015;
   return {position:done?target:x,velocity:done?0:v,done};
  }};
 }
 function release(position,velocity){
  velocity=clamp(velocity,-52,52);
  if(Math.abs(velocity)<1.5)return settle(position,Math.round(position));
  // Exponential coasting joins a finite, monotonic landing at matching speed.
  const drag=5.8,speed=Math.abs(velocity),sign=Math.sign(velocity);
  let target=Math.round(position+velocity/drag);
  const runway=position+velocity/16;
  if((target-position)*sign<speed/16)target=sign>0?Math.ceil(runway):Math.floor(runway);
  const coast=Math.max(0,Math.log(speed/8)/drag),decay=Math.exp(-drag*coast);
  const handoff=position+velocity*(1-decay)/drag,incoming=velocity*decay;
  const landing=3*(target-handoff)/incoming;
  return {target,sample(time){
   const t=Math.max(0,time);
   if(t<coast){const e=Math.exp(-drag*t);return {position:position+velocity*(1-e)/drag,velocity:velocity*e,done:false};}
   const left=clamp(1-(t-coast)/landing,0,1);
   return {position:left===0?target:target-(target-handoff)*left*left*left,velocity:left===0?0:incoming*left*left,done:left===0};
  }};
 }
 const api=Object.freeze({release,settle});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ShelfMotion=api;
})(typeof window==='object'?window:globalThis);

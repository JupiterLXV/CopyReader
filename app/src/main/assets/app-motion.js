'use strict';
(function(root){
 const speeds={quick:160,standard:240,calm:360};
 function duration(prefs,theme=false){return prefs.motionStyle==='none'?0:(speeds[prefs.motionSpeed]||240)*(theme?1.5:1);}
 function circle(x,y,width,height){
  x=Math.max(0,Math.min(width,Number(x)||0));y=Math.max(0,Math.min(height,Number(y)||0));
  return {x,y,radius:Math.ceil(Math.hypot(Math.max(x,width-x),Math.max(y,height-y)))+2};
 }
 function hapticGate(interval=52){
  let previous=null,last=-Infinity;
  return (index,now,active,enabled)=>{const changed=previous!==null&&previous!==index;previous=index;if(!changed||!active||!enabled||now-last<interval)return false;last=now;return true;};
 }
 let preferences=()=>({motionStyle:'fade',motionSpeed:'standard',themeRipple:true}),routeAnimation=null,clipAnimation=null,transition=null,themeBusy=false,nextTheme=null;
 const reduced=()=>!root.document||root.document.hidden||root.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function configure(get){preferences=get;}
 function sync(){if(!root.document)return;const p=preferences();root.document.documentElement.dataset.motion=p.motionStyle;root.document.documentElement.style.setProperty('--ui-duration',duration(p)+'ms');}
 function enter(element,direction=1){
  routeAnimation?.cancel();routeAnimation=null;
  const p=preferences(),ms=duration(p);if(!element||!ms||reduced()||themeBusy||!element.animate)return;
  const slide=p.motionStyle==='slide'&&!element.classList.contains('reader');
  routeAnimation=element.animate(slide?[{opacity:.35,transform:`translate3d(${direction*16}px,0,0)`},{opacity:1,transform:'translate3d(0,0,0)'}]:[{opacity:.25},{opacity:1}],{duration:ms,easing:'cubic-bezier(.2,.7,.2,1)'});
  routeAnimation.finished.catch(()=>{});
 }
 function reveal(element){
  if(!element||element.dataset.motionRevealed)return;element.dataset.motionRevealed='1';
  if(reduced()||!duration(preferences())||!element.animate)return;
  element.animate([{opacity:0},{opacity:1}],{duration:160,easing:'ease-out'}).finished.catch(()=>{});
 }
 function stop(){routeAnimation?.cancel();clipAnimation?.cancel();transition?.skipTransition();}
 async function runTheme(job){
  const p=preferences(),doc=root.document;let applied=false;
  const apply=()=>{if(applied)return;applied=true;return job.apply();};
  if(reduced()||!p.themeRipple||!duration(p)||!doc.startViewTransition||(root.visualViewport?.scale||1)>1.01){await apply();return;}
  doc.documentElement.classList.add('theme-transitioning');
  try{
   transition=doc.startViewTransition(apply);await transition.ready;
   if(reduced()){transition.skipTransition();return;}
   const c=circle(job.origin.x,job.origin.y,root.innerWidth,root.innerHeight);
   clipAnimation=doc.documentElement.animate({clipPath:[`circle(0px at ${c.x}px ${c.y}px)`,`circle(${c.radius}px at ${c.x}px ${c.y}px)`]},{duration:duration(p,true),easing:'cubic-bezier(.25,.65,.25,1)',pseudoElement:'::view-transition-new(root)',fill:'both'});
   await clipAnimation.finished.catch(()=>{});await transition.finished.catch(()=>{});
  }catch(_){transition?.skipTransition();await apply();}
  finally{clipAnimation?.cancel();clipAnimation=null;transition=null;doc.documentElement.classList.remove('theme-transitioning');}
 }
 async function theme(apply,origin){
  nextTheme={apply,origin};if(themeBusy){stop();return;}
  themeBusy=true;
  try{while(nextTheme){const job=nextTheme;nextTheme=null;await runTheme(job);}}
  finally{themeBusy=false;}
 }
 if(root.document){root.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',stop);root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden)stop();});}
 const api=Object.freeze({duration,circle,hapticGate,configure,sync,enter,reveal,theme,stop});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.AppMotion=api;
})(typeof window==='object'?window:globalThis);

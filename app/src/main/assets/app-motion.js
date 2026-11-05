'use strict';
// A single motion vocabulary. Route, title and first-screen items share one clock.
(function(root){
 const {curves,timing}=root.ArchiveMotion||(typeof require==='function'?require('./archive-motion.js'):{});
 const styles=Object.freeze({unified:'统一转场',none:'关闭动画'});
 let preferences=()=>({motionStyle:'unified',motionSpeed:'standard'}),scene=null,outgoing=null,turn=null,themeBusy=false,nextTheme=null,themeTransition=null,themeAnimation=null;
 const extras=new Set(),gates=new Set(),snapshotHeaders=new WeakMap(),snapshotThemes=new WeakMap();let snapshotStyles='',backdrop=null,swipe=null,sheetDrag=null,skipNextRoute=false,continuing=null,handoff=null;
 const now=()=>root.document?.timeline.currentTime??performance.now();
 const elapsed=session=>session.started===false?0:Number(session.clock?.currentTime??Math.max(0,now()-session.start));
 const reduced=()=>!root.document||root.document.hidden||root.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const enabled=()=>!reduced()&&preferences().motionStyle!=='none';
 function profile(p=preferences()){return timing[p.motionSpeed]||timing.standard;}
 function duration(p,theme=false){return p.motionStyle==='none'?0:(theme?profile(p).exit:profile(p).enter);}
 function circle(x,y,width,height){x=Math.max(0,Math.min(width,Number(x)||0));y=Math.max(0,Math.min(height,Number(y)||0));return {x,y,radius:Math.ceil(Math.hypot(Math.max(x,width-x),Math.max(y,height-y)))+2};}
 function hapticGate(interval=52){let previous=null,last=-Infinity;return (index,now,active,on)=>{const changed=previous!==null&&previous!==index;previous=index;if(!changed||!active||!on||now-last<interval)return false;last=now;return true;};}
 function configure(get){preferences=get;}
 function sync(){if(!root.document)return;const doc=root.document.documentElement;doc.dataset.motion=preferences().motionStyle;doc.style.setProperty('--ui-duration',profile().exit+'ms');doc.style.setProperty('--motion-enter',profile().enter+'ms');}
 function animate(element,frames,options,bucket=extras,elapsed=0){
  if(!element?.animate||!enabled())return null;
  const a=element.animate(frames,{easing:curves.enter,...options});bucket.add(a);a.currentTime=elapsed;
  a.finished.catch(()=>{}).finally(()=>bucket.delete(a));return a;
 }
 function cancel(bucket){for(const a of bucket)a.cancel();bucket.clear();}
 function routeAnimation(session,element,frames,options){
  const a=animate(element,frames,options,session.animations);if(!a)return null;
  // Start every plane and child on the same painted frame, including late data.
  if(session.started&&session.clock?.playState==='paused'){a.pause();a.currentTime=elapsed(session);}else a.startTime=session.start;
  return a;
 }
 function release(gate){clearTimeout(gate.timer);gate.node.inert=gate.inert;if(gate.aria===null)gate.node.removeAttribute('aria-hidden');else gate.node.setAttribute('aria-hidden',gate.aria);gates.delete(gate);}
 function gate(node,delay,session){if(!node)return;const item={node,inert:node.inert,aria:node.getAttribute('aria-hidden'),timer:0,delay,session};node.inert=true;node.setAttribute('aria-hidden','true');gates.add(item);if(session.started!==false)item.timer=setTimeout(()=>release(item),Math.max(0,delay));}
 function clearScene(){if(!scene)return;const old=scene;scene=null;cancelAnimationFrame(old.frame);cancelAnimationFrame(old.geometryFrame);cancel(old.animations);for(const g of [...gates])if(g.session===old)release(g);if(old.element){delete old.element.dataset.motionScene;delete old.element.dataset.motionReturning;}if(old.keepParent&&old.ghost){backdrop?.remove();backdrop=old.ghost;backdrop.remove();}else old.ghost?.remove();}
 function finishRoute(){clearScene();outgoing?.remove();outgoing=null;}
 function discard(){backdrop?.remove();backdrop=null;}
 function prepare(element,options={}){
  swipe?.clean();continuing=null;handoff=null;
  // A second tab tap changes the destination, not the running plane's clock.
  if(scene?.kind==='plane'&&options.kind==='plane'&&!options.returning){continuing=scene;return;}
  if(scene&&!scene.returning&&options.returning&&scene.ghost){handoff={incoming:root.getComputedStyle(scene.ghost).transform};}
  outgoing?.remove();outgoing=null;
  if((!enabled()&&!options.parent)||themeBusy||skipNextRoute||!element?.isConnected){clearScene();return;}
  const rect=element.getBoundingClientRect(),clone=element.cloneNode(true),doc=root.document,dock=doc.getElementById('app-dock'),oldDock=dock?.childElementCount?dock.cloneNode(true):null;
  const wrapper=doc.createElement('div');wrapper.className='motion-outgoing';wrapper.inert=true;wrapper.setAttribute('aria-hidden','true');wrapper.style.width=doc.documentElement.clientWidth+'px';
  if(handoff){wrapper.style.background='transparent';clone.style.background=root.getComputedStyle(element).backgroundColor;}
  const inner=doc.createElement('div');Object.assign(inner.style,{position:'absolute',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px'});
  const originals=[element,...element.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
  const copyOf=new Map(originals.map((node,i)=>[node,copies[i]]));
  // Shadow DOM isolates IDs. Keep SVG gradient/filter references and #id styles.
  originals.forEach((node,i)=>{const copy=copies[i];if(!copy)return;if(node.tagName==='CANVAS'){try{copy.getContext('2d')?.drawImage(node,0,0);}catch(_){}}copy.scrollTop=node.scrollTop;copy.scrollLeft=node.scrollLeft;copy.removeAttribute('data-act');copy.removeAttribute('data-reader-image');copy.removeAttribute('data-cover');});
  for(const a of element.getAnimations({subtree:true})){const node=a.effect?.target,copy=copyOf.get(node);if(!copy||node===element)continue;const style=root.getComputedStyle(node);copy.style.transform=style.transform;copy.style.clipPath=style.clipPath;}
  clearScene();delete clone.dataset.motionScene;delete clone.dataset.motionReturning;
  // Sticky chrome belongs to the new live route, never to the decorative old scene.
  snapshotHeaders.set(wrapper,[...clone.querySelectorAll('.topline,.backhead'),oldDock].filter(Boolean));
  clone.style.margin='0';clone.style.width='100%';clone.style.maxWidth='none';inner.appendChild(clone);
  if(!snapshotStyles)snapshotStyles=Array.from(doc.styleSheets).map(sheet=>{try{return Array.from(sheet.cssRules).map(rule=>rule.cssText).join('\n');}catch(_){return '';}}).join('\n');
  const shadow=wrapper.attachShadow({mode:'closed'}),style=doc.createElement('style'),theme=doc.createElement('div');style.textContent=snapshotStyles+'\n*{animation:none!important;transition:none!important;pointer-events:none!important}';theme.className=doc.body.className;theme.appendChild(inner);if(oldDock)theme.appendChild(oldDock);shadow.append(style,theme);snapshotThemes.set(wrapper,theme);if(options.parent&&!enabled()){backdrop?.remove();backdrop=wrapper;return;}doc.body.appendChild(wrapper);outgoing=wrapper;
 }
 function part(node,session,role='row',index=0,axis='vertical',travel=[-8,-6]){
  if(!node||session.returning||!enabled())return;
  const [start,end]=root.ArchiveMotion.interval(role,index),at=elapsed(session),delay=session.ms*start,duration=session.ms*(end-start);
  const options={duration,delay,easing:curves.enter,fill:'backwards'};
  if(session.route)routeAnimation(session,node,root.ArchiveMotion.part(axis,travel),options);else animate(node,root.ArchiveMotion.part(axis,travel),options,session.animations,at);
  const control=node.closest('button,label')||node;if(at<delay+duration*.02)gate(control,delay+duration*.02-at,session);
 }
 function title(element,session){
  if(!element||session.returning)return;
  for(const node of element.querySelectorAll('.archive-code'))if(!node.dataset.motionTitle){node.dataset.motionTitle='1';part(node,session,'code',0,'horizontal',[0,0]);}
  for(const node of element.querySelectorAll('.archive-rule'))if(!node.dataset.motionTitle){node.dataset.motionTitle='1';part(node,session,'rule',0,'horizontal',[0,0]);}
 }
 function firstScreen(element,session){
  if(session.returning)return;let rank=0;
  const selectors='.feature-entry-content,.settingrow,.settings-field,.bookcard,.historyrow,.continue,.detail-actions,.brief,.comment-entry,.chapterbtn,.gallery-caption,.gallery-pager,.comment-card';
  for(const node of element.querySelectorAll(selectors)){
   if(node.dataset.arrived)continue;node.dataset.arrived='1';const r=node.getBoundingClientRect();if(r.top>root.innerHeight||r.bottom<0||!r.width||rank>=9)continue;
   const feature=node.classList.contains('feature-entry-content');part(node,session,feature?'feature':'row',rank++,feature?'horizontal':'vertical',feature?[0,6]:[-8,-6]);
  }
 }
 function bind(element,session){
  if(!element||!enabled())return;session.element=element;element.dataset.motionScene=session.kind;
  element.dataset.motionReturning=String(session.returning);const direction=session.direction;
  const target=session.kind==='plane'?(element.querySelector('#main-content')||element):element;
  let frames;
  if(session.kind==='plane')frames=planeFrames(target,direction);
  else if(session.returning)frames=[{transform:session.incomingFrom||`translateX(${-session.width*.12}px)`},{transform:'translateX(0)'}];
  else frames=[{transform:`translateX(${session.width}px)`},{transform:'translateX(0)'}];
  const clock=routeAnimation(session,target,frames,{duration:session.ms,easing:session.kind==='plane'?curves.plane:curves.enter,fill:'both'});session.clock=clock;if(clock)clock.finished.then(()=>{if(scene===session&&session.clock===clock)clearScene();}).catch(()=>{});
  title(element,session);firstScreen(element,session);
 }
 function planeFrames(target,direction){const r=target.getBoundingClientRect(),matrix=new DOMMatrixReadOnly(root.getComputedStyle(target).transform);return root.ArchiveMotion.plane(r.width,direction,{top:Math.max(0,matrix.m42-r.top),height:root.innerHeight});}
 function enter(element,options={}){
  if(typeof options==='number')options={direction:options};
  if(!enabled()||themeBusy||!element||skipNextRoute){skipNextRoute=false;outgoing?.remove();outgoing=null;if(!options.keepParent){backdrop?.remove();backdrop=null;}return;}
  if(continuing&&scene===continuing){const current=continuing;continuing=null;current.key=options.key;title(element,current);firstScreen(element,current);cancelAnimationFrame(current.geometryFrame);current.geometryFrame=requestAnimationFrame(()=>{if(scene===current)current.clock?.effect.setKeyframes(planeFrames(current.clock.effect.target,current.direction));});return;}
  clearScene();const p=profile(),ms=options.returning?p.exit:options.kind==='reader'?p.reader:p.enter;
  const current={key:options.key||'',kind:options.kind||'push',direction:options.direction||1,returning:!!options.returning,start:now(),started:false,route:true,ms,width:root.document.documentElement.clientWidth,animations:new Set(),ghost:outgoing,keepParent:!!options.keepParent,incomingFrom:handoff?.incoming,frame:0};handoff=null;
  outgoing=null;scene=current;
  if(!current.keepParent){backdrop?.remove();backdrop=null;}
  if(current.ghost){current.ghost.classList.toggle('motion-returning',current.returning);for(const heading of snapshotHeaders.get(current.ghost)||[])heading.style.visibility=current.kind==='plane'?'hidden':'';const frames=current.returning?[{transform:'translateX(0)'},{transform:`translateX(${current.width}px)`}]:current.kind==='plane'?[{transform:'translate(0px,0px)'},{transform:`translate(${10*current.direction}px,-4px)`}]:[{transform:'translateX(0)'},{transform:`translateX(${-current.width*.12}px)`}];routeAnimation(current,current.ghost,frames,{duration:ms,easing:current.kind==='plane'?curves.plane:curves.enter,fill:'both'});}
  bind(element,current);
  const dock=root.document.getElementById('app-dock');if(current.kind!=='plane'&&dock?.childElementCount)routeAnimation(current,dock,[{transform:current.returning?(current.incomingFrom||`translateX(${-current.width*.12}px)`):`translateX(${current.width}px)`},{transform:'translateX(0)'}],{duration:ms,easing:curves.enter,fill:'both'});
  current.frame=requestAnimationFrame(()=>{if(scene!==current)return;current.frame=0;current.start=now();current.started=true;if(current.kind==='plane')current.clock?.effect.setKeyframes(planeFrames(current.clock.effect.target,current.direction));for(const a of current.animations)a.startTime=current.start;for(const g of gates)if(g.session===current)g.timer=setTimeout(()=>release(g),Math.max(0,g.delay));});
 }
 function refresh(element,key){
  const theme=snapshotThemes.get(backdrop);if(theme)theme.className=root.document.body.className;
  const current=scene;if(!current||current.key!==key||!element||elapsed(current)>=current.ms)return;
  // Network results replace the contents, never the animated surface or clock.
  for(const a of [...current.animations])if(!a.effect?.target?.isConnected){a.cancel();current.animations.delete(a);}
  for(const g of [...gates])if(g.session===current&&!g.node.isConnected)release(g);title(element,current);firstScreen(element,current);
 }
 function preview(element){
  if(!element)return;cancel(extras);for(const g of [...gates])if(g.session?.preview)release(g);
  const session={ms:profile().enter,start:performance.now(),returning:false,animations:extras,preview:true};
  animate(element,root.ArchiveMotion.plane(element.getBoundingClientRect().width,1),{duration:session.ms,easing:curves.plane});title(element,session);
  Array.from(element.querySelectorAll('i')).forEach((node,i)=>part(node,session,'row',i));
 }
 function reveal(element){if(scene||element?.dataset.motionRevealed)return;if(element)element.dataset.motionRevealed='1';animate(element,root.ArchiveMotion.part('horizontal'),{duration:180});}
 function arrive(element){
  if(!element)return;if(scene){firstScreen(element,scene);return;}
  const session={ms:profile().enter,start:performance.now(),returning:false,animations:extras};firstScreen(element,session);
 }
 function sheet(element){
  if(!element)return;const ms=profile().sheet,session={ms,start:performance.now(),returning:false,animations:extras};
  animate(element,[{transform:'translate(-18px,calc(100% + 24px))'},{transform:'translate(0px,0px)'}],{duration:ms,easing:curves.plane});
  animate(element.parentElement,[{backgroundColor:'transparent'},{backgroundColor:'rgba(17,19,14,.4)'}],{duration:ms*.6});
  Array.from(element.querySelectorAll('.about-facts>div')).forEach((node,i)=>part(node,session,'row',i));bindSheetGesture(element);
 }
 function leaveSheet(element){const from=element?root.getComputedStyle(element).transform:'none';const a=animate(element,[{transform:from},{transform:'translate(-18px,calc(100% + 24px))'}],{duration:profile().exit,easing:curves.exit,fill:'both'});return a?a.finished.catch(()=>{}):Promise.resolve();}
 function bindSheetGesture(element){
  const handle=element.querySelector('.modalhandle');if(!handle)return;let drag=null;
  handle.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;element.getAnimations().forEach(a=>a.cancel());drag={id:e.pointerId,y:e.clientY,dy:0,at:performance.now()};sheetDrag={element,reset:()=>{drag=null;element.style.removeProperty('transform');}};handle.setPointerCapture(e.pointerId);});
  handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.dy=Math.max(0,e.clientY-drag.y);element.style.transform=`translateY(${drag.dy}px)`;e.preventDefault();});
  const end=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;if(sheetDrag?.element===element)sheetDrag=null;if(e.type!=='pointercancel'&&(d.dy>96||d.dy>24&&d.dy/Math.max(1,performance.now()-d.at)>.55)){element.querySelector('[data-act="closeModal"]')?.click();return;}const a=animate(element,[{transform:`translateY(${d.dy}px)`},{transform:'translateY(0px)'}],{duration:profile().exit,easing:curves.enter});if(a)a.finished.finally(()=>element.style.removeProperty('transform')).catch(()=>{});else element.style.removeProperty('transform');};
  handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
 }
 function bindBackGesture(element,back){
  let candidate=null;
  const clean=()=>{candidate=null;if(swipe?.element!==element)return;swipe=null;element.style.removeProperty('transform');delete element.dataset.swiping;backdrop?.remove();backdrop?.classList.remove('motion-backdrop');};
  element.addEventListener('pointerdown',e=>{if(!enabled()||!e.isPrimary||e.button!==0||e.clientX>24||root.document.querySelector('[role="dialog"]'))return;finishRoute();candidate={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,at:performance.now(),active:false};});
  element.addEventListener('pointermove',e=>{const c=candidate;if(!c||c.id!==e.pointerId)return;const dx=e.clientX-c.x,dy=e.clientY-c.y;if(!c.active){if(Math.abs(dy)>10&&Math.abs(dy)>dx){candidate=null;return;}if(dx<10)return;c.active=true;element.setPointerCapture(e.pointerId);swipe={element,clean};element.dataset.swiping='true';if(backdrop){backdrop.classList.add('motion-backdrop');root.document.body.appendChild(backdrop);}}c.dx=Math.max(0,Math.min(root.innerWidth,dx));element.style.transform=`translateX(${c.dx}px)`;e.preventDefault();});
  const end=e=>{const c=candidate;if(!c||c.id!==e.pointerId)return;candidate=null;if(!c.active)return;const commit=e.type!=='pointercancel'&&(c.dx>root.innerWidth*.32||c.dx>36&&c.dx/Math.max(1,performance.now()-c.at)>.55),to=commit?root.innerWidth:0;
   const finish=()=>{clean();if(commit){skipNextRoute=true;back();}};const a=animate(element,[{transform:`translateX(${c.dx}px)`},{transform:`translateX(${to}px)`}],{duration:profile().exit*Math.max(.25,Math.abs(to-c.dx)/root.innerWidth),easing:curves.enter,fill:'forwards'});if(a)a.finished.then(finish,clean);else finish();};
  element.addEventListener('pointerup',end);element.addEventListener('pointercancel',end);
 }
 function cancelTurn(){if(!turn)return;const old=turn;turn=null;old.animations.forEach(a=>a?.cancel());clearTimeout(old.timer);old.badge?.remove();old.ghost?.remove();}
 function pageTurn(view,update,direction=1,effect='paper'){
  const held=turn?.ghost?.cloneNode(true);cancelTurn();if(!view||!enabled()||effect==='none'){update();return;}
  const old=view.querySelector('.pagewrap'),image=old?.querySelector('img'),ghost=old&&image?.complete&&image.naturalWidth?old.cloneNode(true):held;
  update();const incoming=view.querySelector('.pagewrap');if(!incoming)return;const imageIn=incoming.querySelector('img'),animations=[];
  if(ghost){ghost.removeAttribute('data-page');ghost.classList.add('reader-turn-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.querySelectorAll('[data-reader-image]').forEach(n=>n.removeAttribute('data-reader-image'));view.appendChild(ghost);}
  const job={ghost,animations,timer:0,badge:null};turn=job;
  const start=()=>{if(turn!==job||!incoming.isConnected)return;clearTimeout(job.timer);job.badge?.remove();const ms=profile().exit;
   animations.push(animate(incoming,[{clipPath:direction>0?'inset(0 100% 0 0)':'inset(0 0 0 100%)'},{clipPath:'inset(0 0 0 0)'}],{duration:ms}));
   if(ghost)animations.push(animate(ghost,[{clipPath:'inset(0 0 0 0)'},{clipPath:direction>0?'inset(0 0 0 100%)':'inset(0 100% 0 0)'}],{duration:ms}));
   Promise.allSettled(animations.filter(Boolean).map(a=>a.finished)).then(()=>{if(turn===job)cancelTurn();});
  };
  if(imageIn&&!imageIn.complete){job.timer=setTimeout(()=>{if(turn!==job)return;const badge=root.document.createElement('span');badge.className='reader-turn-loading';badge.setAttribute('role','status');badge.textContent='加载中…';view.appendChild(badge);job.badge=badge;},180);imageIn.addEventListener('load',start,{once:true});imageIn.addEventListener('error',()=>{if(turn===job)cancelTurn();},{once:true});}
  else if(!imageIn||imageIn.naturalWidth>0)start();else cancelTurn();
 }
 function stop(){sheetDrag?.reset();sheetDrag=null;swipe?.clean();clearScene();for(const g of [...gates])release(g);backdrop?.remove();if(!root.document.querySelector('.page-settings-sub'))backdrop=null;outgoing?.remove();outgoing=null;cancelTurn();cancel(extras);themeAnimation?.cancel();themeTransition?.skipTransition();}
 async function runTheme(job){
  let applied=false;const apply=()=>{if(applied)return;applied=true;return job.apply();};const doc=root.document;
  if(!enabled()||!doc.startViewTransition||(root.visualViewport?.scale||1)>1.01){await apply();return;}
  clearScene();outgoing?.remove();outgoing=null;doc.documentElement.classList.add('theme-transitioning');
  try{themeTransition=doc.startViewTransition(apply);await themeTransition.ready;if(!enabled()){themeTransition.skipTransition();return;}const c=circle(job.origin.x,job.origin.y,root.innerWidth,root.innerHeight);
   themeAnimation=doc.documentElement.animate({clipPath:[`circle(0px at ${c.x}px ${c.y}px)`,`circle(${c.radius}px at ${c.x}px ${c.y}px)`]},{duration:profile().exit,easing:curves.enter,pseudoElement:'::view-transition-new(root)',fill:'both'});
   await themeAnimation.finished.catch(()=>{});await themeTransition.finished.catch(()=>{});
  }catch(_){themeTransition?.skipTransition();await apply();}finally{themeAnimation?.cancel();themeAnimation=null;themeTransition=null;doc.documentElement.classList.remove('theme-transitioning');}
 }
 async function theme(apply,point){nextTheme={apply,origin:point};if(themeBusy){stop();return;}themeBusy=true;try{while(nextTheme){const job=nextTheme;nextTheme=null;await runTheme(job);}}finally{themeBusy=false;}}
 if(root.document){root.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',stop);root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden)stop();});}
 const api=Object.freeze({styles,curves,timing,profile,duration,circle,hapticGate,configure,sync,prepare,enter,refresh,finishRoute,preview,reveal,arrive,bindBackGesture,sheet,leaveSheet,pageTurn,cancelTurn,discard,theme,stop});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.AppMotion=api;
})(typeof window==='object'?window:globalThis);

'use strict';
// A single motion vocabulary. Route, title and first-screen items share one clock.
(function(root){
 const curves=Object.freeze({enter:'cubic-bezier(.2,0,0,1)',title:'cubic-bezier(.16,1,.3,1)',exit:'cubic-bezier(.4,0,1,1)'});
 const timing=Object.freeze({quick:{enter:500,exit:300,reader:280,sheet:400},standard:{enter:700,exit:420,reader:360,sheet:560},calm:{enter:800,exit:450,reader:420,sheet:640}});
 const styles=Object.freeze({unified:'统一转场',none:'关闭动画'});
 let preferences=()=>({motionStyle:'unified',motionSpeed:'standard'}),scene=null,outgoing=null,origin=null,turn=null,themeBusy=false,nextTheme=null,themeTransition=null,themeAnimation=null;
 const extras=new Set(),disclosures=new WeakMap();let snapshotStyles='';
 const reduced=()=>!root.document||root.document.hidden||root.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const enabled=()=>!reduced()&&preferences().motionStyle!=='none';
 function profile(p=preferences()){return timing[p.motionSpeed]||timing.standard;}
 function duration(p,theme=false){return p.motionStyle==='none'?0:(theme?profile(p).exit:profile(p).enter);}
 function circle(x,y,width,height){x=Math.max(0,Math.min(width,Number(x)||0));y=Math.max(0,Math.min(height,Number(y)||0));return {x,y,radius:Math.ceil(Math.hypot(Math.max(x,width-x),Math.max(y,height-y)))+2};}
 function hapticGate(interval=52){let previous=null,last=-Infinity;return (index,now,active,on)=>{const changed=previous!==null&&previous!==index;previous=index;if(!changed||!active||!on||now-last<interval)return false;last=now;return true;};}
 function configure(get){preferences=get;}
 function sync(){if(!root.document)return;const doc=root.document.documentElement;doc.dataset.motion=preferences().motionStyle;doc.style.setProperty('--ui-duration',profile().exit+'ms');}
 function animate(element,frames,options,bucket=extras,elapsed=0){
  if(!element?.animate||!enabled())return null;
  const a=element.animate(frames,{easing:curves.enter,...options});bucket.add(a);if(elapsed)a.currentTime=elapsed;
  a.finished.catch(()=>{}).finally(()=>bucket.delete(a));return a;
 }
 function cancel(bucket){for(const a of bucket)a.cancel();bucket.clear();}
 function clearScene(){if(!scene)return;const old=scene;scene=null;clearTimeout(old.timer);cancel(old.animations);old.ghost?.remove();}
 function finishRoute(){clearScene();outgoing?.remove();outgoing=null;}
 function discard(){origin=null;}
 function prepare(element){
  clearScene();outgoing?.remove();outgoing=null;
  if(!enabled()||themeBusy||!element?.isConnected)return;
  const rect=element.getBoundingClientRect(),clone=element.cloneNode(true),doc=root.document;
  const wrapper=doc.createElement('div');wrapper.className='motion-outgoing';wrapper.inert=true;wrapper.setAttribute('aria-hidden','true');
  const inner=doc.createElement('div');Object.assign(inner.style,{position:'absolute',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px'});
  const originals=[element,...element.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
  originals.forEach((node,i)=>{const copy=copies[i];if(!copy)return;if(node.tagName==='CANVAS'){try{copy.getContext('2d')?.drawImage(node,0,0);}catch(_){}}copy.scrollTop=node.scrollTop;copy.scrollLeft=node.scrollLeft;copy.removeAttribute('id');copy.removeAttribute('data-act');copy.removeAttribute('data-reader-image');copy.removeAttribute('data-cover');});
  // Sticky chrome belongs to the new live route, never to the decorative old scene.
  clone.querySelectorAll('.topline,.backhead').forEach(n=>n.style.visibility='hidden');
  clone.style.margin='0';clone.style.width='100%';clone.style.maxWidth='none';inner.appendChild(clone);
  if(!snapshotStyles)snapshotStyles=Array.from(doc.styleSheets).map(sheet=>{try{return Array.from(sheet.cssRules).map(rule=>rule.cssText).join('\n');}catch(_){return '';}}).join('\n');
  const shadow=wrapper.attachShadow({mode:'closed'}),style=doc.createElement('style'),theme=doc.createElement('div');style.textContent=snapshotStyles+'\n*{animation:none!important;transition:none!important;pointer-events:none!important}';theme.className=doc.body.className;theme.appendChild(inner);shadow.append(style,theme);doc.body.appendChild(wrapper);outgoing=wrapper;
 }
 function capture(element){
  origin=null;if(!enabled()||!element)return;
  const cover=element.matches?.('img,image')?element:element.querySelector?.('.paper-poster,.cover img');
  const title=element.querySelector?.('h3:not(.sr-only),strong')||element.closest?.('.shelf-gallery')?.querySelector('.gallery-caption strong');
  const source=cover||element;const rect=source.getBoundingClientRect();if(rect.width<2||rect.height<2)return;
  const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
  let plane=null;if(cover instanceof root.SVGGraphicsElement){const r=cover.getBBox(),m=cover.getScreenCTM();if(m)plane={x:m.a*r.x+m.c*r.y+m.e,y:m.b*r.x+m.d*r.y+m.f,ux:m.a*r.width,uy:m.b*r.width,vx:m.c*r.height,vy:m.d*r.height};}
  origin={cover:box(source),plane,title:title?box(title):null,at:performance.now()};
 }
 function title(element,session){
  if(!element||session.returning)return;
  let mask=element.querySelector(':scope>.motion-title-mask');
  if(!mask){mask=root.document.createElement('span');mask.className='motion-title-mask';const ink=root.document.createElement('span');ink.className='motion-title-ink';while(element.firstChild)ink.appendChild(element.firstChild);mask.appendChild(ink);element.appendChild(mask);}
  const delay=session.ms*.30;
  animate(mask.firstElementChild,[{transform:'translateY(110%)'},{transform:'translateY(0)'}],{duration:session.ms-delay,delay,easing:curves.title,fill:'backwards'},session.animations,Math.max(0,performance.now()-session.start));
 }
 function firstScreen(element,session){
  if(session.returning)return;
  const selector='.settings-group,.bookcard,.historyrow,.continue,.detail-actions,.brief,.comment-entry,.chapterbtn,.gallery-caption,.gallery-pager,.comment-card';
  let rank=0;
  for(const node of element.querySelectorAll(selector)){
   if(node.dataset.arrived)continue;node.dataset.arrived='1';
   const r=node.getBoundingClientRect();if(r.top>root.innerHeight||r.bottom<0||!r.width||rank>=7)continue;
   const delay=Math.min(session.ms*.45+rank++*60,session.ms*.84);
   animate(node,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:session.ms-delay,delay,easing:curves.title,fill:'backwards'},session.animations,Math.max(0,performance.now()-session.start));
  }
 }
 function bind(element,session){
  if(!element||!enabled())return;session.element=element;const elapsed=Math.max(0,performance.now()-session.start),direction=session.direction,reverse=session.returning;
  const target=element.matches('#main-content,.reader')?element:element.querySelector('#main-content')||element;
  let frames;
  if(session.kind==='container-return')frames=[{opacity:0,offset:0},{opacity:1,offset:1}];
  else if(session.kind==='reader')frames=[{opacity:0,offset:0},{opacity:0,offset:.30},{opacity:1,offset:1}];
  else if(session.kind==='container'&&session.origin){
   const r=element.getBoundingClientRect(),o=session.origin.cover;
   const top=Math.max(0,o.top-r.top),left=Math.max(0,o.left-r.left),right=Math.max(0,r.width-left-o.width),bottom=Math.max(0,r.height-top-o.height);
   frames=[{opacity:.55,clipPath:`inset(${top}px ${right}px ${bottom}px ${left}px round 12px)`},{opacity:1,clipPath:'inset(0px 0px 0px 0px round 0px)'}];
  }else{
   const axis=session.kind==='axis'?'X':'Y',distance=session.kind==='axis'?32:Math.min(48,root.innerHeight*.06);
   frames=[{opacity:0,transform:`translate${axis}(${direction*distance}px)`,offset:0},{opacity:0,transform:`translate${axis}(${direction*distance*.75}px)`,offset:.15},{opacity:1,transform:`translate${axis}(0)`,offset:1}];
  }
  animate(target,frames,{duration:session.ms,easing:reverse?curves.exit:curves.enter},session.animations,elapsed);
  const heading=element.querySelector('.topline h1')||element.querySelector('.detail-meta h1')||element.querySelector('.discussion-title h1')||element.querySelector('.backhead>strong');
  title(heading,session);firstScreen(element,session);
  if(session.kind==='container'&&session.origin){
   // Cover and heading are live destination elements inside the expanding surface.
   for(const [node,from] of [[element.querySelector('.detail-cover'),session.origin.cover],[element.querySelector('.detail-meta'),session.origin.title]]){
    if(!node||!from)continue;const to=node.getBoundingClientRect();if(!to.width||!to.height)continue;
    const plane=node.classList.contains('detail-cover')?session.origin.plane:null,transform=plane?`matrix(${plane.ux/to.width},${plane.uy/to.width},${plane.vx/to.height},${plane.vy/to.height},${plane.x-to.left},${plane.y-to.top})`:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${Math.min(1,from.width/to.width)})`;
    animate(node,[{transformOrigin:'0 0',transform,opacity:.4},{transformOrigin:'0 0',transform:'translate(0,0) scale(1)',opacity:1}],{duration:session.ms,easing:curves.enter},session.animations,elapsed);
   }
  }
 }
 function enter(element,options={}){
  if(typeof options==='number')options={direction:options};
  if(!enabled()||themeBusy||!element){outgoing?.remove();outgoing=null;origin=null;return;}
  clearScene();const p=profile(),ms=options.returning?p.exit:options.kind==='reader'?p.reader:p.enter;
  const current={key:options.key||'',kind:options.kind||'vertical',direction:options.direction||1,returning:!!options.returning,start:performance.now(),ms,animations:new Set(),ghost:outgoing,origin:origin&&performance.now()-origin.at<2000?origin:null,timer:0};
  outgoing=null;origin=null;scene=current;
  if(current.ghost){const d=current.direction,kind=current.kind,axis=kind==='axis'?'X':'Y';const exitMs=Math.min(p.exit,ms*(kind==='reader'?.30:.55));
   if(options.returnTo){root.requestAnimationFrame(()=>{if(scene!==current)return;const target=options.returnTo();const r=target?.getBoundingClientRect();if(!r){animate(current.ghost,[{opacity:1},{opacity:0}],{duration:ms,easing:curves.exit,fill:'forwards'},current.animations);return;}animate(current.ghost,[{opacity:1,clipPath:'inset(0px 0px 0px 0px round 0px)'},{opacity:0,clipPath:`inset(${Math.max(0,r.top)}px ${Math.max(0,root.innerWidth-r.right)}px ${Math.max(0,root.innerHeight-r.bottom)}px ${Math.max(0,r.left)}px round 10px)`}],{duration:ms,easing:curves.exit,fill:'forwards'},current.animations);});}
   else animate(current.ghost,[{opacity:1,transform:`translate${axis}(0)`,offset:0},{opacity:0,transform:`translate${axis}(${-d*(kind==='reader'?0:24)}px)`,offset:1}],{duration:exitMs,easing:curves.exit,fill:'forwards'},current.animations);
  }
  bind(element,current);current.timer=setTimeout(()=>{if(scene===current)clearScene();},ms+40);scheduleHeader();
 }
 function refresh(element,key){
  const current=scene;if(!current||current.key!==key||!element||current.element===element||performance.now()-current.start>=current.ms)return;
  // Repainted API data joins the current route clock instead of replaying the title.
  for(const a of [...current.animations])if(a.effect?.target!==current.ghost){a.cancel();current.animations.delete(a);}
  bind(element,current);
 }
 function preview(element){
  if(!element)return;cancel(extras);
  const ms=profile().enter;animate(element,[{opacity:0,transform:'translateX(26px)'},{opacity:1,transform:'translateX(0)'}],{duration:ms});
  title(element.querySelector('.motion-demo-title'),{ms,start:performance.now(),returning:false,animations:extras});
  Array.from(element.querySelectorAll('i')).forEach((node,i)=>{const delay=Math.min(ms*.45+i*60,ms*.84);animate(node,[{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:ms-delay,delay,easing:curves.title,fill:'backwards'});});
 }
 function reveal(element){if(scene||element?.dataset.motionRevealed)return;if(element)element.dataset.motionRevealed='1';animate(element,[{opacity:0},{opacity:1}],{duration:180});}
 function arrive(element){
  if(!element)return;if(scene){firstScreen(element,scene);return;}let rank=0;for(const node of element.querySelectorAll('.grid>.bookcard,.chapterbtn,.comment-card')){
   if(node.dataset.arrived)continue;node.dataset.arrived='1';const r=node.getBoundingClientRect();if(r.top>root.innerHeight||r.bottom<0||rank>=7)continue;
   animate(node,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,delay:rank++*60,easing:curves.title,fill:'backwards'});
  }
 }
 function sheet(element){
  if(!element)return;const ms=profile().sheet;animate(element,[{transform:'translateY(100%)'},{transform:'translateY(0)'}],{duration:ms});
  animate(element.parentElement,[{backgroundColor:'transparent'},{backgroundColor:'rgba(17,19,14,.4)'}],{duration:ms*.6});
  Array.from(element.querySelectorAll('.about-facts>div')).forEach((node,i)=>{const delay=Math.min(ms*.3+i*50,ms*.8);animate(node,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:ms-delay,delay,easing:curves.title,fill:'backwards'});});
 }
 function leaveSheet(element){const a=animate(element,[{transform:'translateY(0)',opacity:1},{transform:'translateY(30%)',opacity:0}],{duration:profile().exit,easing:curves.exit,fill:'both'});return a?a.finished.catch(()=>{}):Promise.resolve();}
 function disclosure(group){
  const body=group.querySelector('.settings-group-body'),previous=disclosures.get(group),open=!(previous?previous.open:group.open);if(!body)return;
  const from=group.open?body.getBoundingClientRect().height:0;previous?.animation?.cancel();if(!enabled()){group.open=open;disclosures.delete(group);return;}if(open)group.open=true;
  const animation=animate(body,[{height:from+'px',opacity:open?.3:1},{height:(open?body.scrollHeight:0)+'px',opacity:open?1:.3}],{duration:profile().exit,fill:'both'});if(!animation){group.open=open;return;}const job={animation,open};disclosures.set(group,job);
  animation.finished.then(()=>{if(disclosures.get(group)!==job)return;group.open=open;disclosures.delete(group);animation.cancel();}).catch(()=>{if(disclosures.get(group)===job){group.open=open;disclosures.delete(group);}});
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
 let headerFrame=0;
 function scheduleHeader(){if(!root.document||headerFrame)return;headerFrame=root.requestAnimationFrame(()=>{headerFrame=0;const page=root.document.querySelector('.page-settings');if(page)page.style.setProperty('--header-collapse',Math.min(1,Math.max(0,root.scrollY/96)).toFixed(4));});}
 function stop(){clearScene();outgoing?.remove();outgoing=null;discard();cancelTurn();cancel(extras);themeAnimation?.cancel();themeTransition?.skipTransition();}
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
 if(root.document){root.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',stop);root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden)stop();});root.addEventListener('scroll',scheduleHeader,{passive:true});}
 const api=Object.freeze({styles,curves,timing,profile,duration,circle,hapticGate,configure,sync,prepare,capture,enter,refresh,finishRoute,preview,reveal,arrive,sheet,leaveSheet,disclosure,pageTurn,cancelTurn,discard,scheduleHeader,theme,stop});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.AppMotion=api;
})(typeof window==='object'?window:globalThis);

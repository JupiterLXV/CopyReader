// Runs with the shared offline fixtures: VISUAL_ONLY=1 node tests/ui-smoke.cjs.
// Inspect rendered pixels, retained surfaces and clocks, not just final DOM state.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {PNG}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'','pngjs'));
module.exports=async({page,root,book,chooseTab,shelfIdle,note,stableScreenshot,setDetailDelay})=>{
 const frame=()=>page.evaluate(()=>new Promise(requestAnimationFrame));
 const idle=()=>page.waitForFunction(()=>!document.querySelector('[data-motion-scene],.motion-outgoing'));
 const seek=ms=>page.evaluate(async ms=>{const animations=document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity);for(const a of animations)a.pause();await Promise.allSettled(animations.map(a=>a.ready));for(const a of animations)a.currentTime=ms;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);},ms);
 const resume=()=>page.evaluate(()=>{for(const a of document.getAnimations())if(a.playState==='paused')a.play();});
 const capture=async name=>{const viewport=await page.evaluate(()=>({inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.deepEqual(viewport,{inner:393,client:393,scroll:393},'moving pages must not expand the mobile viewport');const buffer=await stableScreenshot({path:path.join(root,'checks/visual-'+name+'.png')});return PNG.sync.read(buffer);};
 function difference(a,b,{x=0,y=106,width=393,height=734,threshold=20}={}){let changed=0,total=0;for(let j=y;j<y+height;j++)for(let i=x;i<x+width;i++){const k=(j*a.width+i)*4;if(Math.max(...[0,1,2].map(c=>Math.abs(a.data[k+c]-b.data[k+c])))>threshold)changed++;total++;}return changed/total;}
 await page.waitForFunction(()=>document.querySelectorAll('.bookcard').length===24);
 await page.evaluate(book=>ReaderNative.saveState(JSON.stringify({version:1,favorites:Object.fromEntries(Array.from({length:18},(_,i)=>['visual'+i,{...book,path_word:'visual'+i,name:'画面验证 '+i,cover:'https://fixture.example/cover-'+i+'.svg'}])),history:[],prefs:{theme:'light',shelfLayout:'shelf',motionStyle:'unified',motionSpeed:'standard'}})),book);
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.bookcard').length===24);await chooseTab('shelf');await shelfIdle();await page.waitForFunction(()=>document.querySelector('.paper-book.is-current .paper-poster')?.classList.contains('loaded'));
 const source=await capture('shelf-source');
 await page.locator('.nav [data-tab="history"]').evaluate(b=>b.click());await frame();await seek(0);
 const initial=await capture('empty-000');
 assert.ok(difference(source,initial,{y:310,height:220})<.003,'old book materials must survive the snapshot, including SVG IDs and canvas shadows');
 note('the first rendered frame preserves the original book gradients, covers and ground shadows');
 const coverage=await page.locator('#main-content').evaluate(el=>({width:el.offsetWidth,height:el.offsetHeight,viewport:innerHeight,header:document.querySelector('.topline').offsetHeight}));
 assert.equal(coverage.width,393);assert.ok(coverage.height+coverage.header>=coverage.viewport);
 const frames=[];for(const ms of [42,84,168,252,336,419]){await seek(ms);frames.push({ms,image:await capture('empty-'+String(ms).padStart(3,'0'))});}
 await resume();await idle();const final=await capture('empty-final');
 const oldPixels=frames.map(({ms,image})=>({ms,ratio:difference(image,final,{y:310,height:220})}));
 for(let i=1;i<oldPixels.length;i++)assert.ok(oldPixels[i].ratio<=oldPixels[i-1].ratio+.003,'the old shelf must disappear progressively, without returning or hanging below the short page');
 assert.ok(oldPixels.at(-1).ratio<.001);
 assert.ok(difference(frames.at(-1).image,final)<.001,'finishing the plane must not pop away a frozen lower page');
 note('a short empty page covers the viewport; six sampled frames reveal it continuously and the final cleanup has no visible pop');
 await chooseTab('discover');await idle();await page.evaluate(()=>scrollTo(0,620));await page.waitForFunction(()=>[...document.querySelectorAll('.cover img')].filter(img=>{const r=img.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).every(img=>img.complete&&img.naturalWidth>0));await page.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity));const scrolled=await capture('scrolled-source');setDetailDelay(400);
 await page.locator('.bookcard').nth(8).evaluate(b=>b.click());await frame();await seek(0);const pushInitial=await capture('detail-000');
 assert.ok(difference(scrolled,pushInitial,{y:110,height:530})<.003,'capture the outgoing scroll position before resetting it');
 await seek(105);await page.evaluate(()=>{window.visualHost=document.querySelector('#app');window.visualClock=visualHost.getAnimations()[0];});
 await page.waitForSelector('.chapterbtn');
 const loaded=await page.evaluate(()=>({same:visualHost===document.querySelector('#app')&&visualHost.getAnimations()[0]===visualClock,time:visualClock.currentTime,start:visualClock.startTime,children:[...document.querySelectorAll('.detail-actions,.brief')].flatMap(n=>n.getAnimations()).map(a=>a.currentTime)}));
 assert.equal(loaded.same,true);assert.equal(loaded.time,105);assert.equal(loaded.start,null);assert.ok(loaded.children.every(t=>Math.abs(t-105)<.01));
 await capture('detail-data-105');await seek(419);const pushLast=await capture('detail-419');await resume();await idle();assert.ok(difference(pushLast,await capture('detail-final'))<.003);
 setDetailDelay(0);note('a real delayed detail response retains the moving host and paused clock; newly loaded children join its current phase');
 await page.evaluate(()=>window.AppBack());await frame();await seek(160);
 const pop=await page.evaluate(()=>({old:Number(getComputedStyle(document.querySelector('.motion-outgoing')).zIndex),live:Number(getComputedStyle(document.querySelector('#app')).zIndex),x:new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.motion-outgoing')).transform).m41}));
 assert.ok(pop.old>pop.live);assert.ok(pop.x>0&&pop.x<393);await capture('return-160');await seek(319);const beforeEnd=await page.evaluate(()=>({x:document.querySelector('#app').getBoundingClientRect().x,nav:document.querySelector('.nav').getBoundingClientRect().bottom}));assert.ok(Math.abs(beforeEnd.x)<.1);assert.ok(beforeEnd.nav>775&&beforeEnd.nav<=840.1);const popLast=await capture('return-319');await resume();await idle();assert.ok(difference(popLast,await capture('return-final'),{threshold:80})<.003,'allow subpixel text antialiasing, but no displaced content or disappearing navigation');
 assert.ok(Math.abs(await page.evaluate(()=>scrollY)-620)<=2);note('returning draws the outgoing page above its parent and restores scroll without an end-frame jump');
 await chooseTab('history');await idle();await page.locator('.nav [data-tab="settings"]').evaluate(b=>b.click());await frame();await seek(100);
 await page.evaluate(()=>{window.visualPlane=document.querySelector('#main-content');window.visualClock=visualPlane.getAnimations()[0];for(const name of ['shelf','discover','history','settings'])document.querySelector('.nav [data-tab="'+name+'"]').click();});
 assert.equal(await page.evaluate(()=>visualPlane===document.querySelector('#main-content')&&visualPlane.getAnimations()[0]===visualClock&&visualClock.currentTime===100),true);
 await capture('retarget-100');await resume();await idle();assert.equal(await page.locator('.page-settings').count(),1);assert.equal(await page.locator('.motion-outgoing').count(),0);
 note('rapid tab changes retain one surface and one clock instead of snapping and restarting the transition');
 await page.locator('[data-settings-target="motion"]').evaluate(b=>b.click());await frame();await seek(105);const reversing=await capture('reverse-before');await page.evaluate(()=>window.AppBack());await frame();await seek(0);assert.ok(difference(reversing,await capture('reverse-after'),{threshold:80})<.006,'a quick return starts at the currently painted offsets, not the completed push');await resume();await idle();
 note('returning before entry finishes preserves the current page offset and frozen child clips');
 await chooseTab('discover');await idle();await page.evaluate(()=>scrollTo(0,620));await page.locator('.nav [data-tab="settings"]').evaluate(b=>b.click());await frame();await seek(100);
 const plane=await page.locator('#main-content').evaluate(el=>({height:el.scrollHeight,frames:el.getAnimations()[0].effect.getKeyframes().map(f=>f.clipPath)}));
 assert.ok(plane.frames.every(f=>!f.includes('%')));await capture('viewport-plane-100');await resume();await idle();
 await page.locator('.nav [data-tab="history"]').evaluate(b=>b.click());await frame();await seek(100);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('[data-motion-scene],.motion-outgoing,[inert]'));
 assert.equal(await page.locator('[data-motion-scene],.motion-outgoing,[inert]').count(),0);assert.equal(await page.locator('#main-content').evaluate(el=>getComputedStyle(el).clipPath),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});note('viewport geometry stays independent of content height and reduced motion clears every temporary clip and gate');
 fs.writeFileSync(path.join(root,'checks/visual-motion-results.json'),JSON.stringify({oldShelfPixels:oldPixels,coverage,delayedResponse:loaded,pop,passed:true},null,2));
};

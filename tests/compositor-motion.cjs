// Records normally playing compositor frames. No pause, seek, or animation flags.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {PNG}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'','pngjs'));
module.exports=async({page,context,root,book,chooseTab,shelfIdle,note,stableScreenshot})=>{
 await page.waitForFunction(()=>document.querySelectorAll('.bookcard').length===24);
 await page.evaluate(book=>ReaderNative.saveState(JSON.stringify({version:1,favorites:Object.fromEntries(Array.from({length:18},(_,i)=>['live'+i,{...book,path_word:'live'+i,name:'播放验证 '+i,cover:'https://fixture.example/cover-'+i+'.svg'}])),history:[],prefs:{theme:'light',shelfLayout:'shelf',motionStyle:'unified',motionSpeed:'standard'}})),book);
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.bookcard').length===24);await chooseTab('shelf');await shelfIdle();await page.waitForFunction(()=>document.querySelector('.paper-book.is-current .paper-poster')?.classList.contains('loaded'));
 const cdp=await context.newCDPSession(page),frames=[];
 cdp.on('Page.screencastFrame',event=>{frames.push({at:event.metadata.timestamp,buffer:Buffer.from(event.data,'base64')});cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'png',maxWidth:393,maxHeight:852,everyNthFrame:1});
 await page.locator('.nav [data-tab="history"]').evaluate(b=>b.click());await page.waitForFunction(()=>!document.querySelector('[data-motion-scene],.motion-outgoing'));await page.evaluate(()=>new Promise(requestAnimationFrame));
 const final=PNG.sync.read(await stableScreenshot({path:path.join(root,'checks/live-final.png')}));await cdp.send('Page.stopScreencast');
 assert.ok(frames.length>=4,'record more than the start/end of the actual animation');
 const samples=frames.map((frame,index)=>{const png=PNG.sync.read(frame.buffer);assert.equal(png.width,393);assert.equal(png.height,852);let changed=0;for(let y=310;y<530;y++)for(let x=0;x<393;x++){const k=(y*393+x)*4;if(Math.max(...[0,1,2].map(c=>Math.abs(png.data[k+c]-final.data[k+c])))>24)changed++;}fs.writeFileSync(path.join(root,'checks/live-'+String(index).padStart(2,'0')+'.png'),frame.buffer);return {index,at:frame.at,oldShelfPixels:changed/(393*220)};});
 assert.ok(samples.some(s=>s.oldShelfPixels>.2));assert.ok(samples.some(s=>s.oldShelfPixels>.015&&s.oldShelfPixels<.2),'the compositor must display intermediate reveals');assert.ok(samples.at(-1).oldShelfPixels<.001,'no old shelf remains at normal playback completion');
 for(let i=1;i<samples.length;i++)assert.ok(samples[i].oldShelfPixels<=samples[i-1].oldShelfPixels+.045,'the old shelf must not reappear during actual playback');
 fs.writeFileSync(path.join(root,'checks/compositor-motion-results.json'),JSON.stringify({frames:samples,passed:true},null,2));await cdp.detach();note('normal compositor playback reveals a short page progressively without an end-frame disappearance');
};

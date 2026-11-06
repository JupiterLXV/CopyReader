'use strict';
(() => {
const $ = (s,root=document)=>root.querySelector(s);
const app=$('#app'), dock=$('#app-dock'), modalRoot=$('#modal-root');
const paths={
 search:'M21 21l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 book:'M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1zM12 5v15',
 shelf:'M4 4v16M4 18h16M8 6v8M12 4v10M16 6l3 8',
 clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 arrow:'M15 5l-7 7 7 7', next:'M9 5l7 7-7 7',
 refresh:'M20.5 4v5h-5M20.2 9a8.5 8.5 0 1 0 .3 6',
 close:'M6 6l12 12M18 6L6 18', sun:'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 moon:'M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10',
 heart:'M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-4 4 1 9 8 15 7-6 12-11 8-15',
 play:'M9 5l10 7-10 7z', sort:'M7 4v16M3 16l4 4 4-4M16 4h5M16 9h4M16 14h3M16 19h2',
 list:'M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1',
 trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
 shield:'M12 2l8 3v6c0 5-4 8-8 11-4-3-8-6-8-11V5zM8 12l3 3 5-6',
 filter:'M4 7h16M7 12h10M10 17h4', wifi:'M2 8c5-5 15-5 20 0M5 12c4-4 10-4 14 0M8 16c2-2 6-2 8 0M12 20h.01',
 star:'M12 3l2 6 7 1-5 4 1 7-5-4-5 4 1-7-5-4 7-1z',
 comment:'M4 4h16v12H9l-5 4zM8 8h8M8 12h5',
 grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 volumes:'M4 5l4-1v16l-4-1zM10 4h4v16h-4zM16 5l4 2v13l-4-1z',open:'M6 18L18 6M6 6h12v12',
 user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
 edit:'M4 16L15 5l4 4L8 20H4zM13 7l4 4',check:'M5 12l4 4L20 5',plus:'M12 5v14M5 12h14',grip:'M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01',more:'M5 12h.01M12 12h.01M19 12h.01',up:'M5 15l7-7 7 7',down:'M5 9l7 7 7-7'
};
function icon(n){return `<svg viewBox="0 0 24 24" ${n==='refresh'?'class="icon-refresh"':''} aria-hidden="true"><path d="${paths[n]||paths.book}"/></svg>`;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function attr(k,v){return `data-${k}="${esc(v)}"`;}
function action(name,extra=''){return `data-act="${name}" ${extra}`;}
function refreshButton(name,label,busy=false){return `<button type="button" class="refresh-control ${busy?'is-refreshing':''}" ${action(name)} data-refresh aria-label="${esc(label)}" title="${esc(label)}" aria-busy="${busy}" ${busy?'disabled':''}>${icon('refresh')}<span>${busy?'刷新中':'刷新'}</span></button>`;}
function refreshBusy(name,busy){document.querySelectorAll(`[data-refresh][data-act="${name}"]`).forEach(button=>{button.disabled=busy;button.setAttribute('aria-busy',String(busy));button.classList.toggle('is-refreshing',busy);button.querySelector('span').textContent=busy?'刷新中':'刷新';});}

function isWord(s){return typeof s==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(s);}
function namedTerms(values){
 const terms=[],seen=new Set();
 if(!Array.isArray(values))return terms;
 for(const value of values){
  const name=typeof value==='string'?value:value?.name;
  if(typeof name!=='string'||!name.trim())continue;
  const id=isWord(value?.path_word)?value.path_word:'';
  const label=name.trim().slice(0,120),key=id||label;
  if(seen.has(key))continue;
  seen.add(key);terms.push({id,name:label});
 }
 return terms;
}
function cleanBook(b){
 if(!b||!isWord(b.path_word))return null;
 const cover=typeof b.cover==='string'&&/^https:\/\//.test(b.cover)?b.cover.slice(0,2048):'';
 const author=namedTerms(b.author).slice(0,12).map(({id,name})=>({path_word:id,name}));
 return {path_word:b.path_word,name:String(b.name||'未命名漫画').slice(0,240),cover,author,datetime_updated:String(b.datetime_updated||'').slice(0,20),status:BookMetadata.status(b.status),metadata_checked_at:Math.max(0,Math.min(Date.now(),Number(b.metadata_checked_at)||0))};
}
const SHELF_LIMIT=30;
const defaults=()=>({version:1,favorites:Object.create(null),showcase:[],history:[],prefs:{theme:'system',mode:'vertical',volume:true,shelfLayout:'shelf',shelfSource:'local',motionStyle:'unified',motionVersion:5,motionSpeed:'standard',readerTurn:'paper',shelfHaptics:true,settingsOpen:['reading','motion']},searches:[]});
let state=defaults();
function sanitize(raw){
 const n=defaults();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('备份格式不正确');
 const src=raw.favorites;if(src&&typeof src==='object'&&!Array.isArray(src))Object.values(src).slice(0,5000).forEach(b=>{const c=cleanBook(b);if(c)n.favorites[c.path_word]=c;});
 if(Array.isArray(raw.history))raw.history.slice(0,300).forEach(h=>{const b=cleanBook(h?.book);if(!b||!isWord(h.chapter))return;n.history.push({book:b,chapter:h.chapter,chapterName:String(h.chapterName||'').slice(0,200),group:isWord(h.group)?h.group:'default',page:Math.max(0,Math.min(5000,Math.trunc(Number(h.page)||0))),total:Math.max(1,Math.min(5000,Math.trunc(Number(h.total)||1))),at:Math.max(0,Math.min(Date.now(),Number(h.at)||0))});});
 if(['system','light','dark'].includes(raw.prefs?.theme))n.prefs.theme=raw.prefs.theme;
 if(['vertical','paged'].includes(raw.prefs?.mode))n.prefs.mode=raw.prefs.mode;
 n.prefs.volume=raw.prefs?.volume!==false;
 if(Object.hasOwn(AppMotion.styles,raw.prefs?.motionStyle))n.prefs.motionStyle=raw.prefs.motionStyle;
 // Older effect names intentionally migrate to the unified scene-based system.
 if(raw.prefs?.motionStyle==='none')n.prefs.motionStyle='none';
 if(raw.prefs?.readerTurn==='none')n.prefs.readerTurn='none';
 if(['quick','standard','calm'].includes(raw.prefs?.motionSpeed))n.prefs.motionSpeed=raw.prefs.motionSpeed;
 n.prefs.shelfHaptics=raw.prefs?.shelfHaptics!==false;
 if(Array.isArray(raw.prefs?.settingsOpen))n.prefs.settingsOpen=[...new Set(raw.prefs.settingsOpen.filter(x=>['reading','motion','data','network'].includes(x)))];
 if(['grid','shelf'].includes(raw.prefs?.shelfLayout))n.prefs.shelfLayout=raw.prefs.shelfLayout;
 if(['local','cloud','custom'].includes(raw.prefs?.shelfSource))n.prefs.shelfSource=raw.prefs.shelfSource;
 if(Array.isArray(raw.showcase)){const seen=new Set();for(const item of raw.showcase.slice(0,300)){const b=cleanBook(item);if(b&&!seen.has(b.path_word)){seen.add(b.path_word);n.showcase.push(b);if(n.showcase.length===SHELF_LIMIT)break;}}}
 n.searches=Array.isArray(raw.searches)?raw.searches.filter(s=>typeof s==='string').slice(0,12).map(s=>s.slice(0,120)):[];
 return n;
}
try{state=sanitize(JSON.parse(window.ReaderNative?ReaderNative.readState():localStorage.getItem('copyreader')||'{}'));}catch(e){}
function save(){try{const s=JSON.stringify(state);if(window.ReaderNative){if(ReaderNative.saveState(s)===false)throw Error('state rejected');}else localStorage.setItem('copyreader',s);return true;}catch(e){toast('本地保存失败，请先导出备份');return false;}}
let pending=new Map(),serial=0;
window.NativeResult=(id,res)=>{const p=pending.get(String(id));if(!p)return;pending.delete(String(id));clearTimeout(p.timer);if(res.ok){if(res.data?._stale&&!p.silent)toast('网络暂不可用，正在显示缓存内容');p.resolve(res.data);}else{if(res.code==='AUTH_EXPIRED'&&p.epoch===accountEpoch)invalidateAccount();const e=Error(res.error||'网络请求失败');e.code=res.code;p.reject(e);}};
function request(method,args={},options={}){
 return new Promise((resolve,reject)=>{
  if(!window.ReaderNative){reject(Error('请安装 Android 安装包使用在线搜索与阅读'));return;}
  const id=String(++serial),timer=options.timeout===0?0:setTimeout(()=>{
   pending.delete(id);const error=Error('请求超时，请稍后重试或在设置中切换线路');error.code='REQUEST_TIMEOUT';reject(error);
  },options.timeout||70000);
  pending.set(id,{resolve,reject,timer,epoch:accountEpoch,silent:!!options.silent});
  try{ReaderNative.call(id,method,JSON.stringify(args));}catch(e){pending.delete(id);clearTimeout(timer);reject(e);}
 });
}
let toastTimer;
function toast(t){const el=$('#toast');el.textContent=String(t);el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
window.NativeNotice=toast;
const systemDark=matchMedia('(prefers-color-scheme: dark)');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
AppMotion.configure(()=>state.prefs);AppMotion.sync();
let renderedView='',viewDirection=1,viewReturning=false,themeWanted=state.prefs.theme;
let settingsSection='',settingsSearchValue='',settingsHomeScroll=0;
let screen='main',tab='discover',route=0,mainScroll=0,detailScroll=0,exitAt=0;
const tabScroll={discover:0,shelf:0,history:0,settings:0};
function newListing(filters={}){
 return {mode:'latest',theme:'',author:'',query:'',searchType:'',items:[],offset:0,total:0,loading:false,error:'',generation:0,loaded:false,...filters};
}
const listing=newListing();
function resetDiscovery(){
 Object.assign(listing,newListing({mode:listing.mode,query:listing.query,generation:listing.generation+1}));
 if(screen==='main'&&tab==='discover')loadList();
}
let catalog=null;
let detail=null,reader=null,discussion=null,commentEditor=null,commentSending=false,shelfEditor=null;
let profileEditor=null,profileReading=null,profileSaving=false;
let accountEpoch=0,loginBusy=false,shelfTab=state.prefs.shelfSource;
let account={ready:false,loggedIn:false,profile:null,host:'',error:''};
let cloud={items:[],offset:0,total:0,loading:false,loaded:false,error:'',generation:0};
const galleryIndex={local:0,cloud:0,custom:0};
function sourceBooks(key=shelfTab){return key==='custom'?state.showcase:key==='cloud'?cloud.items:Object.values(state.favorites).reverse();}
function displayBooks(key=shelfTab){return sourceBooks(key).slice(0,SHELF_LIMIT);}
function chooseShelfSource(key){shelfTab=['local','cloud','custom'].includes(key)?key:'local';state.prefs.shelfSource=shelfTab;save();}
let galleryGesture=null,gallerySuppressUntil=0,gallery=null;
function resetCloud(){if(gallery?.key==='cloud')disposeGallery();cloud={items:[],offset:0,total:0,loading:false,loaded:false,error:'',generation:cloud.generation+1};galleryIndex.cloud=0;}
function invalidateAccount(){accountEpoch++;account={ready:true,loggedIn:false,profile:null,host:'',error:'登录已过期，请重新登录'};resetCloud();if(screen==='main'&&['shelf','settings'].includes(tab))renderMain();if(screen==='comments'&&discussion)paintCommentCompose();if(screen==='shelfEdit')shelfEditor?.refresh();}
async function initAccount(){const epoch=accountEpoch;try{const data=await request('account');if(epoch!==accountEpoch)return;account={ready:true,error:'',...data};}catch(e){if(epoch!==accountEpoch)return;account={ready:true,loggedIn:false,profile:null,host:'',error:e.message};}if(screen==='main'&&['shelf','settings'].includes(tab))renderMain();if(screen==='main'&&tab==='shelf'&&shelfTab==='cloud'&&account.loggedIn&&!cloud.loaded&&!cloud.loading)loadCloud();if(screen==='main'&&tab==='settings')refreshAccountProfile();if(screen==='detail'&&detail&&!detail.loading&&account.loggedIn)loadCloudStatus(detail);if(screen==='comments'&&discussion)paintCommentCompose();if(screen==='shelfEdit')shelfEditor?.refresh();}
function accountAvatar(profile,preview=''){
 const name=profile?.nickname||profile?.username||'读者';
 const url=typeof profile?.avatar==='string'&&/^https:\/\//.test(profile.avatar)?imgUrl(profile.avatar):'';
 const src=preview||url;
 return `<span class="account-avatar" aria-hidden="true">${esc(Array.from(name)[0]||'读')}${src?`<img src="${esc(src)}" alt="" decoding="async" data-cover>`:''}</span>`;
}
function accountCard(){
 if(!account.ready)return '<div class="accountcard"><div class="account-info"><strong>正在读取账号…</strong></div></div>';
 if(!account.loggedIn)return `<div class="accountcard"><div class="account-avatar">${icon('shield')}</div><div class="account-info"><strong>未登录</strong><p>${esc(account.error||'查看账号书架')}</p></div><button class="btn small" ${action('login')}>登录</button></div>`;
 const name=account.profile?.nickname||account.profile?.username||'拷贝漫画用户';
 return `<div class="accountcard">${accountAvatar(account.profile)}<div class="account-info"><strong>${esc(name)}</strong>${tab==='settings'?`<p>${esc(account.profile?.username||'')}</p>`:''}</div><button class="textbtn" ${action('logout')}>退出登录</button></div>${tab==='settings'?`<div class="account-links"><button class="textbtn" ${action('editProfile')}>${icon('edit')} 编辑资料</button><button class="textbtn" ${action('showCloud')}>查看账号书架 ${icon('next')}</button></div>${account.profileNeedsRefresh?`<button class="textbtn profile-refresh" ${action('refreshProfile')}>${icon('refresh')} 刷新账号资料</button>`:''}`:''}`;
}
function paintAccountSettings(){
 const section=$('#settings-account');if(!section)return;
 const focused=section.contains(document.activeElement)?document.activeElement.dataset.act:null;
 const modalAction=modalFocus&&section.contains(modalFocus)?modalFocus.dataset.act:null;
 section.innerHTML=accountCard();
 if(focused)$(`[data-act="${focused}"]`,section)?.focus({preventScroll:true});
 if(modalAction)modalFocus=$(`[data-act="${modalAction}"]`,section);
}
function refreshAccountProfile(force=false){
 if(!account.loggedIn)return Promise.resolve(false);
 const epoch=accountEpoch;
 if(profileReading?.epoch===epoch)return profileReading.promise;
 if(!force&&!account.profileNeedsRefresh&&Date.now()-(account.profileReadAt||0)<60000)return Promise.resolve(true);
 const job={epoch};
 job.promise=(async()=>{
  try{
   const data=await request('profile',{}, {silent:true});
   if(epoch!==accountEpoch||!data.loggedIn||!data.profile)return false;
   account.profile=data.profile;
   account.profileReadAt=Date.now();account.profileNeedsRefresh=false;
   paintAccountSettings();return true;
  }catch(error){if(force&&epoch===accountEpoch)toast(error.message);return false;}
  finally{if(profileReading===job)profileReading=null;}
 })();
 profileReading=job;return job.promise;
}
function showProfileEditor(){
 if(profileSaving||!account.loggedIn)return;
 const profile=account.profile||{},nickname=profile.nickname||'';
 profileEditor={epoch:accountEpoch,nickname,avatarId:'',picking:false,uncertain:false};
 modal('编辑账号资料',`<form id="profile-form"><div class="profile-photo"><div id="profile-photo-preview">${accountAvatar(profile)}</div><div><button type="button" class="btn outline small" id="profile-choose" ${action('chooseAvatar')}>选择头像</button><button type="button" class="textbtn" id="profile-undo" ${action('undoAvatar')} hidden>撤销选择</button></div></div><label class="field-label" for="profile-nickname">昵称</label><input class="login-input" id="profile-nickname" autocomplete="nickname" maxlength="128" value="${esc(nickname)}" placeholder="输入显示昵称"><p class="login-note">登录用户名 ${esc(profile.username||'')}</p><div class="login-error" id="profile-error" role="alert"></div><button class="btn full" type="submit" id="profile-save" disabled>保存资料</button><button type="button" class="textbtn rowgap" id="profile-check" ${action('checkProfile')} hidden>查看保存结果</button></form>`);
}
function updateProfileEditor(){
 const editor=profileEditor,input=$('#profile-nickname');if(!editor||!input)return;
 const name=input.value.trim(),changed=name!==editor.nickname.trim();
 const invalid=changed&&(!name||Array.from(name).length>64);
 const busy=profileSaving||editor.picking;
 input.disabled=profileSaving;
 $('#profile-choose').disabled=busy||editor.uncertain;
 $('#profile-choose').textContent=editor.picking?'正在读取图片…':'选择头像';
 $('#profile-undo').hidden=!editor.avatarId;
 $('#profile-undo').disabled=busy||editor.uncertain;
 $('#profile-save').disabled=busy||editor.uncertain||!account.loggedIn||invalid||(!changed&&!editor.avatarId);
 $('#profile-save').textContent=profileSaving?'正在保存…':'保存资料';
 $('#profile-check').hidden=!editor.uncertain;
 $('#modal-root [data-act="closeModal"]').disabled=profileSaving;
}
function paintProfilePreview(){
 const editor=profileEditor,preview=$('#profile-photo-preview');if(!editor||!preview)return;
 const url=editor.avatarId?`https://appassets.androidplatform.net/avatar-preview?id=${encodeURIComponent(editor.avatarId)}`:'';
 preview.innerHTML=accountAvatar(account.profile,url);
}
async function chooseAvatar(){
 const editor=profileEditor;
 if(!editor||editor.picking||profileSaving||editor.uncertain)return;
 editor.picking=true;$('#profile-error').textContent='';updateProfileEditor();
 try{
  const {id}=await request('chooseAvatar',{}, {timeout:0});
  if(!/^[a-f0-9-]{36}$/.test(id||''))return;
  if(profileEditor!==editor||editor.epoch!==accountEpoch){window.ReaderNative?.discardAvatar?.(id);return;}
  editor.avatarId=id;paintProfilePreview();
 }catch(error){if(profileEditor===editor)$('#profile-error').textContent=error.message;}
 finally{editor.picking=false;if(profileEditor===editor)updateProfileEditor();}
}
function undoAvatar(){
 if(!profileEditor?.avatarId||profileSaving)return;
 window.ReaderNative?.discardAvatar?.(profileEditor.avatarId);
 profileEditor.avatarId='';paintProfilePreview();updateProfileEditor();
}
async function saveProfile(){
 const editor=profileEditor,input=$('#profile-nickname');
 if(!editor||!input||profileSaving||editor.picking||editor.uncertain||editor.epoch!==accountEpoch||!account.loggedIn)return;
 const args={},name=input.value.trim();
 if(name!==editor.nickname.trim()){
  if(!name||Array.from(name).length>64){$('#profile-error').textContent='请输入1到64个字符的昵称';return;}
  args.nickname=name;
 }
 if(editor.avatarId)args.avatarId=editor.avatarId;
 if(!Object.keys(args).length)return;
 profileSaving=true;$('#profile-error').textContent='';updateProfileEditor();
 try{
  const data=await request('saveProfile',args,{timeout:120000});
  if(editor.epoch!==accountEpoch)return;
  if(!data.loggedIn)invalidateAccount();
  else{
   account.profile=data.profile;
   account.profileReadAt=Date.now();account.profileNeedsRefresh=!!data.refreshPending;
   paintAccountSettings();
  }
  profileSaving=false;closeModal();
  toast(!data.loggedIn?'资料已保存，请重新登录查看':data.refreshPending?'资料已保存，请刷新账号资料查看':'资料已保存');
 }catch(error){
  if(profileEditor!==editor)return;
  editor.uncertain=['PROFILE_UNCONFIRMED','REQUEST_TIMEOUT'].includes(error.code);
  $('#profile-error').textContent=editor.uncertain?'保存结果未确认，请先查看账号资料':error.message;
 }finally{profileSaving=false;if(profileEditor===editor)updateProfileEditor();}
}
async function checkProfile(){
 const editor=profileEditor;if(!editor?.uncertain)return;
 if(await refreshAccountProfile(true)&&profileEditor===editor){closeModal();toast('已读取源站账号资料');}
}
function showLogin(){
 if(loginBusy)return;
 if(!account.ready){toast('正在读取账号状态，请稍候');return;}
 let destination=window.ReaderNative?ReaderNative.getAccountApi():'https://api.copy202601.com';
 modal('登录拷贝漫画',`<form id="login-form" autocomplete="off"><p>请输入注册用户名。</p><label class="field-label" for="login-username">注册用户名</label><input class="login-input" id="login-username" name="username" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="200" placeholder="请输入注册用户名" required><label class="field-label" for="login-password">密码</label><input class="login-input" id="login-password" name="password" type="password" autocomplete="off" maxlength="512" placeholder="请输入密码" required><label class="password-check"><input id="show-password" type="checkbox"> 显示密码</label><div id="login-error" class="login-error" role="alert"></div><button class="btn full" type="submit" id="login-submit">登录</button><button class="textbtn rowgap" type="button" ${action('accountSettings')}>账号线路设置</button><p class="login-note">密码不保存。<br>登录地址：${esc(destination)}</p></form>`);
}
async function submitLogin(){
 if(loginBusy)return;const username=$('#login-username')?.value.trim();let password=$('#login-password')?.value;
 if(!username||!password){$('#login-error').textContent='请输入账号和密码';return;}
 loginBusy=true;const button=$('#login-submit');button.disabled=true;button.textContent='正在登录…';$('#login-error').textContent='';
 const epoch=++accountEpoch;
 const promise=request('login',{username,password});password='';$('#login-password').value='';
 try{
  const data=await promise;if(epoch!==accountEpoch)return;
  account={ready:true,error:'',...data};resetCloud();if(screen!=='shelfEdit')chooseShelfSource('cloud');loginBusy=false;closeModal();
  if(screen==='shelfEdit'&&shelfEditor){toast('登录成功');shelfEditor.switchSource('cloud');}
  else if(screen==='comments'&&discussion){toast('登录成功');paintCommentCompose();showCommentEditor(discussion.replyTarget);}
  else if(screen==='detail'&&detail){toast('登录成功');const word=detail.word;openBook(word);}else{toast('登录成功');screen='main';tab='shelf';render();window.scrollTo(0,0);loadCloud(true);}
 }catch(e){if(epoch!==accountEpoch)return;const error=$('#login-error');if(error)error.textContent=e.message||'登录失败，请重试';}
 finally{loginBusy=false;if($('#login-submit')){$('#login-submit').disabled=false;$('#login-submit').textContent='重新登录';}}
}
async function logout(){const epoch=++accountEpoch;try{await request('logout');if(epoch!==accountEpoch)return;account={ready:true,loggedIn:false,profile:null,host:'',error:''};resetCloud();chooseShelfSource('local');if(detail){detail.collect=0;detail.cloudReady=false;}render();toast('已退出账号，本地收藏已保留');}catch(e){toast(e.message);}}
function dark(){return state.prefs.theme==='dark'||state.prefs.theme==='system'&&systemDark.matches;}
function chrome(){AppMotion.sync();document.body.classList.toggle('dark',dark());document.body.classList.toggle('reader-open',screen==='reader');if(window.ReaderNative)ReaderNative.chrome(dark(),screen==='reader',state.prefs.volume);queueMicrotask(()=>{AppMotion.refresh(app,renderedView);});}
systemDark.addEventListener?.('change',()=>{if(state.prefs.theme==='system')changeTheme('system');});
function themeOrigin(element){const rect=(element||$('[data-act="quickTheme"]'))?.getBoundingClientRect();return {x:rect?rect.left+rect.width/2:innerWidth-34,y:rect?rect.top+rect.height/2:34};}
function changeTheme(value,element){
 if(!['system','light','dark'].includes(value))return;
 themeWanted=value;const origin=themeOrigin(element);
 return AppMotion.theme(async()=>{
  state.prefs.theme=value;save();chrome();
  $$('[data-act="quickTheme"]').forEach(button=>button.innerHTML=icon(dark()?'sun':'moon'));
  const label=$('[data-act="theme"] .setting-value');if(label)label.textContent={system:'跟随系统',light:'浅色',dark:'深色'}[value];
  if(gallery){const g=gallery,decoding=[];for(const node of g.nodes){const image=$('.paper-cast-shadow',node);if(image){image.src=ShelfMaterials.bookShadow(g.m,dark());if(image.decode)decoding.push(image.decode());}}paintGallery(g);await Promise.allSettled(decoding);}
 },origin);
}
function imgUrl(url){return url?`https://appassets.androidplatform.net/image?url=${encodeURIComponent(url)}`:'';}
function cover(b,meta='',deferred=false){
 return `<div class="cover"><span class="cover-fallback">${icon('book')}</span>${b.cover?`<img ${deferred?`data-deferred-cover="${esc(imgUrl(b.cover))}"`:`src="${esc(imgUrl(b.cover))}"`} loading="lazy" decoding="async" draggable="false" alt="${esc(b.name)}封面" data-cover>`:''}${meta?`<small>${esc(meta)}</small>`:''}</div>`;
}
function card(b,deferred=false){const authors=(b.author||[]).map(x=>x.name).filter(Boolean).join(' / '),date=b.datetime_updated?String(b.datetime_updated).slice(0,10):'';return `<button class="bookcard" ${action('book',attr('word',b.path_word))}>${cover(b,'',deferred)}<h3>${esc(b.name)}</h3><p class="book-author">${esc(authors)}</p>${date?`<p class="book-date">${esc(date)}</p>`:''}</button>`;}
let deferredCovers=null;
function clearDeferredCovers(){deferredCovers?.disconnect();}
function bindDeferredCovers(root=document){
 const load=image=>{if(!image.isConnected||!image.dataset.deferredCover)return;image.addEventListener('load',()=>image.classList.add('loaded'),{once:true});image.src=image.dataset.deferredCover;image.removeAttribute('data-deferred-cover');};
 if(!window.IntersectionObserver){root.querySelectorAll('img[data-deferred-cover]').forEach(load);return;}
 deferredCovers??=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){deferredCovers.unobserve(entry.target);load(entry.target);}},{rootMargin:'80px 0px'});
 root.querySelectorAll('img[data-deferred-cover]').forEach(image=>deferredCovers.observe(image));
}
function skeleton(){return `<div class="grid">${Array.from({length:9},()=>'<div class="skeleton"><div class="cover"></div><h3></h3><p></p></div>').join('')}</div>`;}
function empty(title,desc,button='',name='book'){return `<div class="empty">${icon(name)}<h3>${esc(title)}</h3><p>${esc(desc)}</p>${button}</div>`;}
function errorBox(message,retry){return `<div class="errorbox"><h3>加载失败</h3><p>${esc(message)}</p><button class="btn small" ${action(retry)}>重试</button><button class="btn small outline" ${action('tab',attr('tab','settings'))}>网络设置</button></div>`;}
function nav(){return `<nav class="nav" aria-label="主导航"><div class="nav-inner">${[['discover','book','发现'],['shelf','shelf','书架'],['history','clock','历史'],['settings','settings','设置']].map(([id,i,label])=>`<button ${action('tab',attr('tab',id))} class="${tab===id?'active':''}" ${tab===id?'aria-current="page"':''}><span>${icon(i)}</span>${label}</button>`).join('')}</div></nav>`;}
function render(){
 AppMotion.cancelTurn();
 const key=screen==='main'?'main:'+tab:screen+':'+(screen==='reader'?reader?.chapter:screen==='settings'?settingsSection:screen==='catalog'?catalog?.key:detail?.word||''),previous=renderedView,changed=previous!==key;
 const kind=screen==='main'&&previous.startsWith('main:')?'plane':screen==='reader'?'reader':'push';
 if(changed)AppMotion.prepare(app,{parent:screen==='settings',kind,returning:viewReturning});renderedView=key;
 if(screen!=='main'){dock.replaceChildren();disposeGallery();clearDeferredCovers();}chrome();
 if(screen==='settings')renderSettingsDetail();else if(screen==='shelfEdit')renderShelfEditor();else if(screen==='comments')renderComments();else if(screen==='reader')renderReader();else if(screen==='detail')renderDetail();else if(screen==='catalog')renderCatalog();else renderMain();
 if(changed){
  AppMotion.enter(app,{key,kind,direction:viewDirection,returning:viewReturning,keepParent:screen==='settings'&&!viewReturning});
 }
 viewDirection=1;viewReturning=false;
}
function renderMain(){
 document.body.classList.remove('keyboard-editing');disposeGallery();clearDeferredCovers();
 const titles={discover:'拷贝漫画',shelf:'书架',history:'历史',settings:'设置'},codes={discover:'01 / DISCOVER',shelf:'02 / COLLECTION',history:'03 / READING LOG',settings:'04 / SETTINGS'};
 const markup=`<div class="shell page-main page-${tab}"><header class="topline"><div class="archive-masthead"><h1>${titles[tab]}</h1><span class="archive-code" aria-hidden="true">${codes[tab]}</span></div><div class="header-actions">${tab==='shelf'?`<button class="iconbtn" ${action('tab',attr('tab','history'))} aria-label="阅读历史">${icon('clock')}</button><button class="iconbtn" ${action('shelfSearch')} aria-label="搜索漫画">${icon('search')}</button><button class="iconbtn" ${action('editShelf')} aria-label="整理自选书架">${icon('edit')}</button>`:''}<button class="iconbtn" ${action('quickTheme')} aria-label="切换深浅色">${icon(dark()?'sun':'moon')}</button></div></header><div id="main-content">${tab==='discover'?discoverContent():tab==='shelf'?shelfContent():tab==='history'?historyContent():settingsContent()}</div></div>${nav()}`;
 const existing=app.querySelector(':scope>.page-main');
 if(existing){
  const template=document.createElement('template');template.innerHTML=markup;
  const next=template.content.firstElementChild,content=existing.querySelector('#main-content');
  existing.className=next.className;existing.querySelector('.topline').replaceWith(next.querySelector('.topline'));
  content.replaceChildren(...next.querySelector('#main-content').childNodes);
 }else app.innerHTML=markup;
 dock.replaceChildren(app.querySelector(':scope>.nav')||document.createRange().createContextualFragment(nav()));
 app.style.setProperty('--main-header-height',app.querySelector('.topline').getBoundingClientRect().height+'px');
 bindPaperImages();mountGallery();bindDeferredCovers();if(tab==='settings'&&settingsSearchValue)filterSettings(settingsSearchValue);
}
function discoverContent(){
 const l=listing,h=state.history[0];
 return `<form class="searchbar" id="search-form" role="search">${icon('search')}<input id="search-input" type="search" placeholder="搜索漫画" aria-label="搜索漫画" value="${esc(l.query)}" enterkeyhint="search" maxlength="120"><button type="button" ${action(l.query?'clearSearch':'search')} aria-label="${l.query?'清除搜索':'搜索'}">${icon(l.query?'close':'next')}</button></form>
 <div class="chips browse-tabs">${[['latest','最近更新'],['popular','热门']].map(([m,t])=>`<button class="chip ${!l.query&&l.mode===m?'active':''}" ${action('listMode',attr('mode',m))}>${t}</button>`).join('')}<button class="chip ${l.theme?'label':''}" ${action('categories')}>${icon('filter')} <span>${esc(l.theme?categoryName(l.theme):'题材')}</span></button>${refreshButton('refreshList','刷新漫画列表',l.loading)}</div>
 ${!l.query&&!l.theme&&h?`<button class="continue" ${action('resumeDetail',attr('word',h.book.path_word))}>${cover(h.book)}<div class="info"><h3>${esc(h.book.name)}</h3><p>${esc(h.chapterName)} · ${h.page+1}/${h.total} 页</p></div><span class="resume-label">继续阅读 ${icon('next')}</span></button>`:''}
 <div id="book-list" class="browse-results" aria-label="${l.query?'搜索结果':l.theme?categoryName(l.theme):l.mode==='popular'?'热门':'最近更新'}">${listCards()}</div>`;
}
function listCards(l=listing){
 if(l.loading&&!l.items.length)return skeleton();
 if(l.error&&!l.items.length)return errorBox(l.error,'refreshList');
 if(l.loaded&&!l.items.length)return empty(l===listing?'暂无结果':'暂无作品',l===listing?'请更换关键词或题材。':'');
 return `${l===listing&&l.query?`<p class="quiet result-count">${l.total} 个结果</p>`:''}<div class="grid">${l.items.map(b=>card(b)).join('')}</div><div class="browse-tail">${listTail(l)}</div>`;
}
function listTail(l){return `${l.error?errorBox(l.error,'moreList'):''}${l.offset<l.total?`<button class="loadmore" ${action('moreList')} ${l.loading?'disabled':''}>${l.loading?'正在加载…':'加载更多'}</button>`:l.items.length?'<p class="statusline">已加载全部</p>':''}`;}
function paintBrowseResults(l){
 const list=$('#book-list');if(!list)return;
 const grid=$('.grid',list),cards=grid?$$('.bookcard',grid):[],tail=$('.browse-tail',list),items=l.items;
 if(cards.length&&tail&&cards.every((node,i)=>node.dataset.word===items[i]?.path_word)){
  cards.forEach(node=>node.dataset.arrived='1');
  if(cards.length<items.length)grid.insertAdjacentHTML('beforeend',items.slice(cards.length).map(b=>card(b)).join(''));
  tail.innerHTML=listTail(l);const count=$('.result-count',list);if(count)count.textContent=l.total+' 个结果';
 }else list.innerHTML=listCards(l);
 const total=$('#catalog-count');if(total)total.textContent=l.loaded?`${l.total} 部作品`:'';
 AppMotion.arrive(list);
}
async function loadList(reset=false,refresh=false){
 const l=screen==='catalog'?catalog.list:listing;
 if(l.loading&&!reset)return;
 if(reset){l.generation++;l.items=[];l.offset=0;l.total=0;l.loaded=false;}
 const generation=l.generation;
 const active=()=>l===listing?screen==='main'&&tab==='discover':screen==='catalog'&&catalog?.list===l;
 l.loading=true;l.error='';
 if(active()){
  if(l===listing&&(reset||!l.items.length))renderMain();else paintBrowseResults(l);
  refreshBusy('refreshList',true);
 }
 try{
  const args={q:l.query,mode:l.mode,theme:l.theme,offset:l.offset,refresh};
  if(l.author)args.author=l.author;
  if(l.searchType)args.type=l.searchType;
  const res=await request(l.query?'search':'list',args);
  if(generation!==l.generation)return;
  const r=res.results;
  if(!Array.isArray(r?.list))throw Error('作品列表格式不正确，请重试');
  const seen=new Set(l.items.map(b=>b.path_word));
  for(const row of r.list){
   const b=row?.comic||row;
   if(!isWord(b?.path_word)||seen.has(b.path_word))continue;
   seen.add(b.path_word);l.items.push(b);
  }
  l.offset+=r.list.length;
  l.total=r.list.length?Math.max(l.offset,Number(r.total)||0):l.offset;
  l.loaded=true;
 }catch(e){if(generation===l.generation)l.error=e.message;}
 finally{if(generation===l.generation){l.loading=false;if(active()){paintBrowseResults(l);refreshBusy('refreshList',false);}}}
}
function renderCatalog(){
 const c=catalog;
 const label=c.kind==='author'?'作者':'题材';
 app.innerHTML=`<div class="shell catalog-shell"><header class="backhead"><button class="iconbtn" ${action('back')} aria-label="返回">${icon('arrow')}</button><strong>${label}作品</strong><span class="header-spacer"></span>${refreshButton('refreshList','刷新作品列表',c.list.loading)}</header><div class="catalog-heading"><p>${label}</p><h1>${esc(c.name)}</h1><p id="catalog-count" role="status">${c.list.loaded?`${c.list.total} 部作品`:''}</p></div><div id="book-list" class="browse-results" aria-label="${esc(c.name)}的作品">${listCards(c.list)}</div></div>`;
}
function openCatalog(kind,id,name){
 if(screen!=='detail'||!detail||detail.loading||!name)return;
 if(kind==='theme'&&!isWord(id))id=categories.find(term=>term.name===name)?.id||'';
 if(kind==='theme'&&!id){toast('源站未提供这个标签的作品列表');return;}
 const list=kind==='author'
  ?newListing(isWord(id)?{author:id}:{query:name,searchType:'author'})
  :newListing({theme:id});
 cancelChapterLocation(detail);
 if(detail.chapLoading){detail.chapterToken++;detail.chapLoading=false;detail.chapterPending=null;}
 catalog={key:`${kind}:${id||name}`,kind,name,list,parent:detail,scroll:window.scrollY};
 screen='catalog';route++;render();window.scrollTo(0,0);loadList();
}
function shelfContent(){
 const books=sourceBooks();
 const tabs=`<div class="shelf-sources"><div class="chips shelf-tabs" role="group" aria-label="收藏来源">${[['local','本地'],['cloud','账号'],['custom','自选']].map(([id,label])=>`<button class="chip ${shelfTab===id?'active':''}" ${action('shelfTab',attr('value',id))} aria-pressed="${shelfTab===id}">${label}</button>`).join('')}</div>${shelfAccountTrigger()}</div>`;
 return tabs+(shelfTab==='cloud'?cloudContent():`<div class="sectionhead collection-head"><h2 id="shelf-count">${shelfCount(books.length)}</h2><div class="collection-tools">${layoutControl()}</div></div><div id="${shelfTab==='custom'?'custom-list':'local-list'}">${books.length?collection(books,shelfTab):shelfTab==='custom'?empty('自选书架','选择最多30本漫画，按自己的顺序陈列。',`<button class="btn" ${action('editShelf')}>添加漫画</button>`,'shelf'):empty('暂无本地收藏','在作品详情页添加收藏。',`<button class="btn" ${action('tab',attr('tab','discover'))}>浏览漫画</button>`,'shelf')}</div>`);
}
function openShelfEditor(){
 if(screen!=='main'||tab!=='shelf')return;
 mainScroll=window.scrollY;disposeGallery();clearDeferredCovers();screen='shelfEdit';route++;
 const editor=new ShelfEditor({root:app,limit:SHELF_LIMIT,esc,icon,cover,clean:cleanBook,request,toast,modal,closeModal,confirm:confirmModal,login:showLogin,
  active:instance=>screen==='shelfEdit'&&shelfEditor===instance,
  sources:()=>({local:sourceBooks('local'),cloud:account.loggedIn?cloud.items:[],cloudTotal:cloud.total,cloudError:cloud.error,cloudLoading:cloud.loading,cloudLoaded:cloud.loaded,loggedIn:account.loggedIn,ready:account.ready}),
  loadCloud:()=>loadCloud(),
  save:books=>{if(shelfEditor!==editor)return;const previous={books:state.showcase,layout:state.prefs.shelfLayout,source:state.prefs.shelfSource};state.showcase=books.map(cleanBook).filter(Boolean).slice(0,SHELF_LIMIT);state.prefs.shelfLayout='shelf';state.prefs.shelfSource='custom';if(!save()){state.showcase=previous.books;state.prefs.shelfLayout=previous.layout;state.prefs.shelfSource=previous.source;toast('保存失败，草稿已保留，请重试');return;}shelfTab='custom';galleryIndex.custom=0;finishShelfEditor(editor,true);toast('自选书架已保存');},
  cancel:()=>finishShelfEditor(editor,false)
 },state.showcase,shelfTab);
 shelfEditor=editor;render();window.scrollTo(0,0);
}
function renderShelfEditor(){if(shelfEditor){chrome();shelfEditor.render();}}
function finishShelfEditor(editor,saved=false){
 if(shelfEditor!==editor)return;shelfEditor=null;editor.destroy();closeModal();screen='main';tab='shelf';route++;viewReturning=true;viewDirection=-1;render();window.scrollTo(0,saved?0:mainScroll);
}
function shelfAccountTrigger(){
 const name=account.loggedIn?account.profile?.nickname||account.profile?.username||'账号':account.error?'重新登录':'登录';
 return `<button class="account-trigger" ${action(account.loggedIn?'shelfAccount':'login')} aria-label="${account.loggedIn?'账号信息':'登录拷贝漫画'}" ${!account.ready?'disabled':''}>${icon('user')}<span>${esc(account.ready?name:'…')}</span></button>`;
}
function shelfAccountMenu(){
 if(!account.loggedIn){showLogin();return;}
 modal('账号',`<div class="account-summary"><div class="account-avatar">${icon('user')}</div><div><strong>${esc(account.profile?.nickname||account.profile?.username||'拷贝漫画用户')}</strong><p>${esc(account.profile?.username||'')}</p></div></div><button class="account-menu-row" ${action('showCloud')}>${icon('shelf')}<span>账号书架</span>${icon('next')}</button><button class="account-menu-row" ${action('tab',attr('tab','settings'))}>${icon('settings')}<span>设置</span>${icon('next')}</button><button class="account-menu-row signout" ${action('logout')}>退出登录</button>`);
}
function shelfCount(total,loaded=null){
 return `<span class="count-number">${total===null?'—':Number(total)||0}</span><span class="count-unit">本漫画${loaded!==null&&loaded<total?`<small class="count-detail">已载入 ${loaded} 本</small>`:''}</span>`;
}
function layoutControl(){return `<div class="layout-control" role="group" aria-label="书架显示方式">${[['shelf','volumes','立体'],['grid','grid','网格']].map(([value,i,label])=>`<button ${action('shelfLayout',attr('value',value))} aria-label="${label}书架" aria-pressed="${state.prefs.shelfLayout===value}" class="${state.prefs.shelfLayout===value?'selected':''}">${icon(i)}</button>`).join('')}</div>`;}
function paperMetrics(){return ShelfMaterials.metrics(innerWidth,innerHeight);}
function bindPaperImages(root=document){root.querySelectorAll('.paper-poster').forEach(img=>{if(img.dataset.listening)return;img.dataset.listening='1';img.addEventListener('load',()=>img.classList.add('loaded'),{once:true});img.addEventListener('error',()=>img.classList.add('failed'),{once:true});});}
function paperPose(distance,m){return ShelfMaterials.pose(distance,m);}
function paperBook(b,index,m,near=true){
 const f=m.face,s=m.spine,h=m.body,t=m.top,a=m.projection,k=m.slope,posterW=f-8,posterH=posterW*1.42;
 const chars=Array.from(String(b.name||'')),title=chars.length>11?[...chars.slice(0,10),'…']:chars,titleTop=Math.max(31,(h-title.length*11.6)/2+8);
 const date=bookSpineStatus(b),code=String(index+1).padStart(2,'0');
 const shadow=ShelfMaterials.bookShadow(m,dark());
 const lines=[.2,.42,.65,.82].map(n=>`M${s*n+1} ${t+n*.9}L${f*a+s*n} ${4+n*.9}`).join('');
 return `${shadow?`<img class="paper-cast-shadow" src="${shadow}" alt="" aria-hidden="true" draggable="false">`:''}<svg class="paper-book-art" viewBox="0 0 ${m.front} ${m.height}" aria-hidden="true"><path class="paper-top" d="M0 ${t}L${f*a} 4L${s+f*a} 5.2L${s} ${t+1.2}Z"/><path class="paper-page-edge" d="${lines}"/><g transform="matrix(1 ${1.2/s} 0 1 0 ${t})"><rect class="paper-spine" x="0" y="0" width="${s}" height="${h}" rx=".7"/><rect class="paper-linen" x="0" y="0" width="${s}" height="${h}" fill="url(#paper-linen)"/><rect class="paper-spine-glaze" x="0" y="0" width="${s}" height="${h}" fill="url(#paper-spine-light)"/><path class="paper-binding" d="M${s-1.8} 3V${h-3}M2 23H${s-2}"/><text class="paper-code" x="${s/2}" y="16" text-anchor="middle">${code}</text><text class="paper-spine-title" text-anchor="middle">${title.map((c,i)=>`<tspan x="${s/2}" y="${titleTop+i*11.6}">${esc(c)}</tspan>`).join('')}</text><circle class="paper-bind-mark" cx="${s/2}" cy="${h-10}" r="1.6"/></g><g class="paper-cover-plane" transform="matrix(${a} ${-k} 0 1 ${s} ${t+1.2})"><rect class="paper-front" x="0" y="0" width="${f}" height="${h}" rx="1"/><rect class="paper-linen" x="0" y="0" width="${f}" height="${h}" fill="url(#paper-linen)"/><rect class="paper-poster-placeholder" x="4" y="4" width="${posterW}" height="${posterH}" rx=".8"/>${b.cover?`<image class="paper-poster" data-src="${esc(imgUrl(b.cover))}" ${near?`href="${esc(imgUrl(b.cover))}"`:''} x="4" y="4" width="${posterW}" height="${posterH}" preserveAspectRatio="xMidYMid slice" data-cover/>`:''}<rect class="paper-face-glaze" x="0" y="0" width="${f}" height="${h}" fill="url(#paper-face-light)"/><path class="paper-cover-seam" d="M2 1V${h-1}M${f-1} 1V${h-1}"/><text class="paper-date" x="6" y="${h-6}">${esc(date)}</text><text class="paper-code paper-edition" x="${f-6}" y="${h-6}" text-anchor="end">${code}</text></g></svg>`;
}
function shelfMeta(book){return BookMetadata.caption(book,historyFor(book.path_word));}
function bookSpineStatus(book){return BookMetadata.status(book.status)?.completed?'已完结':/^\d{4}-\d{2}-\d{2}/.test(book.datetime_updated||'')?book.datetime_updated.slice(5,10).replace('-','.') : '';}
const metadataPending=new Map(),metadataAttempt=new Map();let metadataTimer=0;
function rememberBookMetadata(raw,checked=false){
 const fresh=cleanBook({...raw,metadata_checked_at:checked?Date.now():raw.metadata_checked_at});if(!fresh)return;
 const merge=old=>({...old,...fresh,cover:fresh.cover||old.cover,author:fresh.author.length?fresh.author:old.author,status:fresh.status||old.status});
 let persistent=false;
 if(state.favorites[fresh.path_word]){state.favorites[fresh.path_word]=merge(state.favorites[fresh.path_word]);persistent=true;}
 state.showcase=state.showcase.map(b=>{if(b.path_word!==fresh.path_word)return b;persistent=true;return merge(b);});
 state.history=state.history.map(h=>{if(h.book.path_word!==fresh.path_word)return h;persistent=true;return {...h,book:merge(h.book)};});
 cloud.items=cloud.items.map(b=>b.path_word===fresh.path_word?merge(b):b);
 if(persistent)save();
 const g=gallery;if(g){g.books=g.books.map(b=>b.path_word===fresh.path_word?merge(b):b);for(const node of g.nodes)if(node.dataset.word===fresh.path_word){const label=$('.paper-date',node);if(label)label.textContent=bookSpineStatus(fresh);}if(g.books[galleryBookIndex(Math.round(g.position),g.books.length)]?.path_word===fresh.path_word){g.label=null;paintGallery(g);}}
}
function scheduleShelfMetadata(g,book){
 clearTimeout(metadataTimer);
 if(Date.now()-book.metadata_checked_at<43200000||metadataPending.has(book.path_word)||Date.now()-(metadataAttempt.get(book.path_word)||0)<300000)return;
 metadataTimer=setTimeout(async()=>{
  if(gallery!==g||screen!=='main'||tab!=='shelf'||metadataPending.size>=2)return;
  const word=book.path_word;metadataAttempt.set(word,Date.now());if(metadataAttempt.size>500)metadataAttempt.delete(metadataAttempt.keys().next().value);
  const task=request('detail',{comic:word},{silent:true});metadataPending.set(word,task);
  try{const raw=(await task).results?.comic;if(raw&&(!raw.path_word||raw.path_word===word))rememberBookMetadata({...raw,path_word:word},true);}catch(_){}finally{metadataPending.delete(word);}
 },360);
}
function collectionOverview(books,key){
 const partial=key==='cloud'&&cloud.items.length<cloud.total;
 return `<section class="collection-overview" aria-label="收藏列表"><div class="overview-head"><h2>${key==='custom'?'自选漫画':'全部漫画'} <small>${partial?`${books.length} / ${cloud.total}`:books.length}</small></h2><button class="textbtn" ${action('shelfLayout',attr('value','grid'))}>查看全部 ${icon('next')}</button></div><div class="grid">${books.slice(0,SHELF_LIMIT).map(b=>card(b,true)).join('')}</div></section>`;
}
function collection(books,key){
 if(state.prefs.shelfLayout!=='shelf')return `<div class="grid shelf-grid">${books.map(b=>card(b,true)).join('')}</div>`;
 books=books.slice(0,SHELF_LIMIT);if(!books.length)return '';
 const cursor=galleryIndex[key]||0,index=((cursor%books.length)+books.length)%books.length,selected=books[index],m=paperMetrics();
 let count=books.length===1?1:Math.min(29,Math.max(13,Math.ceil(m.width/m.pitch)+5));if(count%2===0)count--;
 const start=-Math.floor(count/2),info=shelfMeta(selected);
 return `<section class="shelf-gallery" aria-label="立体书架"><div class="shelf-stage paper-stage" data-gallery="${key}" data-book-count="${books.length}" data-cursor="${cursor}" data-pitch="${m.pitch}" tabindex="0" role="group" aria-label="左右滑动切换书籍，当前第 ${index+1} 本，共 ${books.length} 本" style="--paper-width:${m.front}px;--paper-height:${m.height}px;--stage-height:${m.stage}px;--floor-y:${m.base+m.body}px">${ShelfMaterials.defs()}<canvas class="paper-ground-shadows" aria-hidden="true"></canvas>${Array.from({length:count},(_,i)=>{const offset=start+i,slot=cursor+offset,bookIndex=((slot%books.length)+books.length)%books.length,b=books[bookIndex],p=paperPose(offset,m);return `<button class="shelf-book paper-book ${offset===0?'is-current':''}" ${action('galleryBook',`${attr('key',key)} ${attr('offset',offset)} ${attr('word',b.path_word)}`)} data-slot="${slot}" data-offset="${offset}" tabindex="${offset===0?0:-1}" ${offset===0?'':'aria-hidden="true"'} aria-label="${offset===0?'打开':'选中'} ${esc(b.name)}" style="--paper-x:${p.x}px;--paper-y:${p.y}px;z-index:${i+1}">${paperBook(b,bookIndex,m,Math.abs(offset)<=2)}<h3 class="sr-only">${esc(b.name)}</h3></button>`;}).join('')}</div><button class="gallery-caption" ${action('book',attr('word',selected.path_word))}><span><strong>${esc(selected.name)}</strong><small>${esc(info)}</small></span>${icon('open')}</button><div class="gallery-pager"><button class="iconbtn" ${action('galleryStep',`${attr('key',key)} ${attr('step',-1)}`)} aria-label="上一本" ${books.length<2?'disabled':''}>${icon('arrow')}</button><span aria-live="polite">${String(index+1).padStart(2,'0')} <i>/</i> ${String(books.length).padStart(2,'0')}</span><button class="iconbtn" ${action('galleryStep',`${attr('key',key)} ${attr('step',1)}`)} aria-label="下一本" ${books.length<2?'disabled':''}>${icon('next')}</button></div></section>${collectionOverview(books,key)}`;
}
function moveGallery(key,step){
 const g=gallery;if(!g||g.key!==key||g.books.length<2)return;
 const target=(g.target??Math.round(g.position))+step;
 animateGallery(g,ShelfMotion.settle(g.position,target,g.velocity));
}
function galleryBookIndex(slot,count){return ((slot%count)+count)%count;}
function mountGallery(){
 const stage=$('.paper-stage');if(!stage)return;
 if(gallery?.stage===stage)return;
 disposeGallery();
 const key=stage.dataset.gallery,books=displayBooks(key);
 if(!books.length)return;
 const nodes=$$('.paper-book',stage),position=Number(stage.dataset.cursor)||0;
 gallery={stage,key,books,nodes,first:Number(nodes[0].dataset.slot),position,velocity:0,target:null,simulation:null,frame:0,label:null,hapticGate:AppMotion.hapticGate(),m:paperMetrics()};
 paintGallery(gallery);setGalleryMotion(gallery,'idle');
}
function disposeGallery(){
 clearTimeout(metadataTimer);const g=gallery;if(!g)return;cancelAnimationFrame(g.frame);galleryIndex[g.key]=Math.round(g.position);
 gallery=null;if(galleryGesture?.stage===g.stage)galleryGesture=null;
}
function setGalleryMotion(g,value){
 g.stage.dataset.motion=value;g.stage.classList.toggle('is-moving',value!=='idle');
 $('.gallery-pager>span',g.stage.parentNode)?.setAttribute('aria-live',value==='idle'?'polite':'off');
}
function assignPaperSlot(g,node,slot){
 const index=galleryBookIndex(slot,g.books.length),book=g.books[index];
 node.dataset.slot=slot;node.dataset.word=book.path_word;
 node.innerHTML=paperBook(book,index,g.m,false)+`<h3 class="sr-only">${esc(book.name)}</h3>`;bindPaperImages(node);
}
function paintGallery(g){
 if(g!==gallery||!g.stage.isConnected)return;
 const poses=[],centre=Math.round(g.position),first=centre-Math.floor(g.nodes.length/2),changed=first!==g.first;
 // Rotate only the offscreen edge. Existing books and their decoded covers survive.
 while(g.first<first){const node=g.nodes.shift();assignPaperSlot(g,node,g.first+g.nodes.length+1);g.nodes.push(node);g.stage.appendChild(node);g.first++;}
 while(g.first>first){const node=g.nodes.pop();assignPaperSlot(g,node,g.first-1);g.nodes.unshift(node);g.stage.insertBefore(node,g.nodes[1]||null);g.first--;}
 for(let i=0;i<g.nodes.length;i++){
  const node=g.nodes[i],slot=Number(node.dataset.slot),offset=slot-centre,p=paperPose(slot-g.position,g.m);
  node.style.transform=`translate3d(${p.x.toFixed(3)}px,${p.y.toFixed(3)}px,0)`;poses.push(p);const shadow=$('.paper-cast-shadow',node);if(shadow)shadow.style.opacity=(.48+p.weight*.48).toFixed(3);
  node.style.zIndex=String(1000-Math.round(Math.abs(slot-g.position)*20));
  if(g.label!==centre){node.dataset.offset=offset;node.classList.toggle('is-current',offset===0);node.tabIndex=offset===0?0:-1;node.setAttribute('aria-label',`${offset===0?'打开':'选中'} ${g.books[galleryBookIndex(slot,g.books.length)].name}`);if(offset===0)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden','true');}
  if(Math.abs(slot-g.position)<=2.5){const image=$('.paper-poster',node);if(image&&!image.hasAttribute('href'))image.setAttribute('href',image.dataset.src);}
 }
 ShelfMaterials.paintFloor($('.paper-ground-shadows',g.stage),poses,g.m,dark());
 galleryIndex[g.key]=centre;g.stage.dataset.position=g.position.toFixed(5);g.stage.dataset.cursor=centre;
 if(g.label!==centre){
  if(g.hapticGate(centre,performance.now(),!!g.simulation||!!galleryGesture?.dragging,state.prefs.shelfHaptics)&&window.ReaderNative?.haptic)ReaderNative.haptic();
  const index=galleryBookIndex(centre,g.books.length),book=g.books[index],caption=$('.gallery-caption',g.stage.parentNode),pager=$('.gallery-pager>span',g.stage.parentNode);
  caption.dataset.word=book.path_word;$('strong',caption).textContent=book.name;$('small',caption).textContent=shelfMeta(book);
  const overview=$('.collection-overview',g.stage.parentNode.parentNode);if(overview)$$('.bookcard',overview).forEach(node=>node.classList.toggle('is-selected',node.dataset.word===book.path_word));
  pager.innerHTML=`${String(index+1).padStart(2,'0')} <i>/</i> ${String(g.books.length).padStart(2,'0')}`;
  g.stage.setAttribute('aria-label',`左右滑动切换书籍，当前第 ${index+1} 本，共 ${g.books.length} 本`);g.label=centre;scheduleShelfMetadata(g,book);
 }
}
function galleryFrame(g,now){
 g.frame=0;if(g!==gallery)return;
 if(!g.stage.isConnected||screen!=='main'||tab!=='shelf'){disposeGallery();return;}
 if(g.simulation){
  const sample=g.simulation.sample((now-g.started)/1000);g.position=sample.position;g.velocity=sample.velocity;
  if(sample.done){g.simulation=null;g.target=null;g.velocity=0;setGalleryMotion(g,'idle');}
 }
 paintGallery(g);
 if(g.simulation)queueGalleryFrame(g);
}
function queueGalleryFrame(g){if(!g.frame)g.frame=requestAnimationFrame(now=>galleryFrame(g,now));}
function stopGallery(g){
 if(g.simulation){const sample=g.simulation.sample((performance.now()-g.started)/1000);g.position=sample.position;g.velocity=sample.velocity;}
 cancelAnimationFrame(g.frame);g.frame=0;g.simulation=null;g.target=null;paintGallery(g);setGalleryMotion(g,'idle');
}
function animateGallery(g,simulation){
 cancelAnimationFrame(g.frame);g.frame=0;
 if(reducedMotion.matches||g.books.length<2){g.position=simulation.target;g.velocity=0;g.simulation=null;g.target=null;paintGallery(g);setGalleryMotion(g,'idle');return;}
 g.simulation=simulation;g.target=simulation.target;g.started=performance.now();setGalleryMotion(g,'settling');queueGalleryFrame(g);
}
function releaseGallery(g,velocity=0){
 if(reducedMotion.matches)velocity=0;
 animateGallery(g,ShelfMotion.release(g.position,velocity));
}
function recordGallerySample(gesture,e){
 const t=e.timeStamp,last=gesture.samples.at(-1);if(last&&t<=last.t)return;
 gesture.samples.push({x:e.clientX,t});while(gesture.samples.length>1&&gesture.samples[0].t<t-100)gesture.samples.shift();
}
function galleryReleaseVelocity(gesture){
 const samples=gesture.samples;if(samples.length<2)return 0;
 const first=samples[0],meanT=samples.reduce((n,p)=>n+p.t-first.t,0)/samples.length,meanX=samples.reduce((n,p)=>n+p.x,0)/samples.length;
 let numerator=0,denominator=0;for(const p of samples){const t=p.t-first.t-meanT;numerator+=t*(p.x-meanX);denominator+=t*t;}
 return denominator>0?-numerator/denominator*1000/gallery.m.pitch:0;
}
function cancelGalleryGesture(e){
 const gesture=galleryGesture;if(!gesture||e&&e.pointerId!==gesture.id)return;
 // Touch starts with implicit capture on the SVG face. Moving capture to the
 // stage releases that face first; only losing the stage itself cancels a drag.
 if(e?.type==='lostpointercapture'&&e.target!==gesture.stage)return;
 galleryGesture=null;gesture.stage.classList.remove('is-dragging');
 if(gesture.dragging||gesture.interrupted){gallerySuppressUntil=Date.now()+350;if(gallery?.stage===gesture.stage)releaseGallery(gallery);}
}
function resizeGallery(){
 const g=gallery;if(!g)return;
 cancelGalleryGesture();g.m=paperMetrics();const m=g.m;
 g.stage.style.setProperty('--paper-width',m.front+'px');g.stage.style.setProperty('--paper-height',m.height+'px');g.stage.style.setProperty('--stage-height',m.stage+'px');g.stage.style.setProperty('--floor-y',m.base+m.body+'px');g.stage.dataset.pitch=m.pitch;
 let count=g.books.length===1?1:Math.min(29,Math.max(13,Math.ceil(m.width/m.pitch)+5));if(count%2===0)count--;
 while(g.nodes.length>count)g.nodes.pop().remove();
 while(g.nodes.length<count){const node=document.createElement('button');node.className='shelf-book paper-book';node.dataset.act='galleryBook';node.dataset.key=g.key;g.stage.appendChild(node);g.nodes.push(node);}
 g.first=Math.round(g.position)-Math.floor(count/2);g.nodes.forEach((node,i)=>assignPaperSlot(g,node,g.first+i));g.label=null;paintGallery(g);
}
function cloudContent(){
 if(!account.ready)return '<div class="spinner" aria-label="正在读取账号"></div>';
 if(!account.loggedIn)return empty('未登录','登录后查看账号收藏。','','shelf');
 const c=cloud;return `<div class="sectionhead collection-head"><h2 id="shelf-count">${shelfCount(c.loaded?c.total:null,c.items.length)}</h2><div class="collection-tools">${layoutControl()}${refreshButton('refreshCloud','刷新账号书架',c.loading)}</div></div><div id="cloud-list">${cloudCards()}</div>`;
}
function cloudCards(){const c=cloud;if(c.loading&&!c.items.length)return skeleton();if(c.error&&!c.items.length)return errorBox(c.error,'refreshCloud');if(c.loaded&&!c.items.length&&c.offset>=c.total)return empty('暂无账号收藏','在作品详情页添加账号收藏。','','shelf');return `${collection(c.items,'cloud')}${c.error?errorBox(c.error,'moreCloud'):''}${c.offset<c.total?`<button class="loadmore" ${action('moreCloud')} ${c.loading?'disabled':''}>${c.loading?'正在加载…':'加载更多账号收藏'}</button>`:c.items.length?'<p class="statusline">已加载全部</p>':''}`;}
async function loadCloud(reset=false){
 if(!account.loggedIn||cloud.loading&&!reset)return;if(reset)resetCloud();const c=cloud,epoch=accountEpoch;c.loading=true;c.error='';if(screen==='main'&&tab==='shelf'&&shelfTab==='cloud'){if(reset||!c.items.length)renderMain();else{const button=$('[data-act="moreCloud"]');if(button){button.disabled=true;button.textContent='正在加载…';}}}
 try{const r=(await request('cloudShelf',{offset:c.offset})).results||{};if(epoch!==accountEpoch||cloud!==c)return;const rows=Array.isArray(r.list)?r.list:[],seen=new Set(c.items.map(b=>b.path_word));for(const row of rows){if(row.b_folder)continue;const b=row.comic||row;if(!isWord(b.path_word)||seen.has(b.path_word))continue;seen.add(b.path_word);c.items.push({...b,_cloudId:Number(row.uuid)||0});}c.offset+=rows.length;c.total=Math.max(c.offset,Number(r.total)||0);if(!rows.length)c.total=c.offset;c.loaded=true;}
 catch(e){if(epoch===accountEpoch&&cloud===c)c.error=e.message;}
 finally{if(cloud===c){c.loading=false;refreshBusy('refreshCloud',false);const el=$('#cloud-list');if(el){disposeGallery();clearDeferredCovers();el.innerHTML=cloudCards();bindPaperImages(el);mountGallery();bindDeferredCovers(el);const count=$('#shelf-count');if(count)count.innerHTML=shelfCount(c.loaded?c.total:null,c.items.length);}if(screen==='shelfEdit')shelfEditor?.refresh();}}
}
function historyContent(){return state.history.length?`<div class="sectionhead"><h2>阅读记录</h2><button class="textbtn" ${action('clearHistory')}>清空记录</button></div>${state.history.map(h=>`<div class="historyrow">${cover(h.book)}<button class="history-info" ${action('resume',attr('word',h.book.path_word))}><h3>${esc(h.book.name)}</h3><p>${esc(h.chapterName)} · ${h.page+1}/${h.total} 页</p><div class="progress"><span style="width:${Math.min(100,(h.page+1)/h.total*100)}%"></span></div></button><button class="iconbtn" ${action('removeHistory',attr('word',h.book.path_word))} aria-label="删除这条记录">${icon('close')}</button></div>`).join('')}`:empty('暂无阅读记录','','','clock');}
function switchButton(on,act,label){return `<button class="switch ${on?'on':''}" ${action(act)} role="switch" aria-checked="${on}" aria-label="${label}"></button>`;}
const settingsMeta={reading:{title:'阅读与外观',note:'主题、阅读方式与音量键',icon:'book',code:'SYSTEM / READING'},motion:{title:'动画与触感',note:'页面节奏、翻页与轻触反馈',icon:'sun',code:'SYSTEM / EFFECTS'},data:{title:'数据管理',note:'本地备份与图片缓存',icon:'shelf',code:'SYSTEM / STORAGE'},network:{title:'连接设置',note:'漫画与账号线路',icon:'wifi',code:'SYSTEM / CONNECTION'}};
function settingsGroup(id,body){return `<section class="settings-group archive-panel" id="settings-${id}" data-settings-group="${id}"><div class="settings-group-body">${body}</div></section>`;}
function settingsRow(title,note,act,value,on=null){return `<button class="settingrow settings-action" ${action(act)} ${on===null?'':`role="switch" aria-checked="${on}" aria-label="${esc(title)}"`}><span class="setting-copy"><strong>${title}</strong><span class="setting-description">${note}</span></span>${on===null?`<span class="setting-value">${esc(value)}</span>${icon('next')}`:`<span class="switch ${on?'on':''}" aria-hidden="true"></span>`}</button>`;}
function settingsSections(){
 const theme={system:'跟随系统',light:'浅色',dark:'深色'}[state.prefs.theme];
 const reading=settingsRow('界面主题','浅色、深色或跟随系统','theme',theme)+settingsRow('默认阅读方式','点击切换，立即保存','readerMode',state.prefs.mode==='vertical'?'竖向滚动':'逐页阅读')+settingsRow('音量键翻页','仅在阅读时生效','volume','',state.prefs.volume);
 const motion=settingsRow('页面动画','斜切换页，内容按同一时钟展开','toggleMotion','',state.prefs.motionStyle!=='none')+`<div class="motion-guide"><span>斜切换页 · 编号与内容展开</span><button class="textbtn" ${action('previewMotion')}>预览</button><div class="motion-demo" id="motion-preview" aria-hidden="true"><span class="motion-demo-title">设置</span><span class="archive-code" aria-hidden="true">04 / SETTINGS</span><i></i><i></i><i></i></div></div><label class="settingrow settings-select" for="motion-speed"><span class="setting-copy"><strong>动画节奏</strong><span class="setting-description">统一调整进场、返回与内容展开</span></span><select id="motion-speed" ${state.prefs.motionStyle==='none'?'disabled':''}><option value="quick" ${state.prefs.motionSpeed==='quick'?'selected':''}>轻快</option><option value="standard" ${state.prefs.motionSpeed==='standard'?'selected':''}>标准</option><option value="calm" ${state.prefs.motionSpeed==='calm'?'selected':''}>舒展</option></select></label>`+settingsRow('逐页翻页动画','纸页展开，与页面共用缓动曲线','toggleReaderTurn','',state.prefs.readerTurn!=='none')+settingsRow('书架轻触反馈','滑过书脊时轻震，遵循系统设置','toggleShelfHaptics','',state.prefs.shelfHaptics)+`<p class="settings-hint" id="motion-hint">${reducedMotion.matches?'系统已开启减少动态效果，动画暂不播放。':state.prefs.motionStyle==='none'?'页面、标题与翻页动画均已关闭。':'跟随系统的“减少动态效果”设置。'}</p>`;
 const data=settingsRow('导出本地备份','书架、阅读记录和偏好','export','导出')+settingsRow('导入本地备份','合并书架与历史，恢复偏好','import','导入')+settingsRow('清理图片缓存','<span id="cache-size">上限约 120 MB</span>','clearCache','清理');
 const network=`<section class="panel"><div class="settings-field"><strong>账号登录线路</strong><p class="quiet">下次登录生效</p><label for="account-api-url" class="sr-only">HTTPS 账号接口域名</label><input id="account-api-url" type="url" spellcheck="false" autocomplete="off" value="${esc(window.ReaderNative?ReaderNative.getAccountApi():'https://api.copy202601.com')}"><select id="account-protocol" aria-label="账号登录协议"><option value="modern" ${!window.ReaderNative||ReaderNative.getAccountProtocol()==='modern'?'selected':''}>新版账号协议</option><option value="legacy" ${window.ReaderNative&&ReaderNative.getAccountProtocol()==='legacy'?'selected':''}>旧版兼容协议</option></select><div class="actions"><button class="btn small secondary" ${action('saveAccountApi')}>保存账号线路</button><button class="btn small outline" ${action('resetAccountApi')}>恢复新版默认</button></div><button class="textbtn rowgap" ${action('legacyAccountApi')}>使用旧版账号线路</button></div></section><section class="panel"><div class="settings-field"><strong>漫画数据线路</strong><p class="quiet">默认题材和搜索使用新版目录。账号线路独立设置。</p><label for="api-url" class="sr-only">HTTPS 数据接口域名</label><input id="api-url" type="url" spellcheck="false" autocomplete="off" value="${esc(window.ReaderNative?ReaderNative.getApi():'https://api.2024manga.com')}"><div class="actions"><button class="btn small secondary" ${action('saveApi')}>保存漫画线路</button><button class="btn small outline" ${action('testApi')}>测试漫画连接</button></div><button class="textbtn rowgap" ${action('resetApi')}>恢复默认漫画线路</button></div></section>`;
 return {reading,motion,data,network};
}
function settingsContent(){return `<section id="settings-account" aria-label="账号资料">${accountCard()}</section><div class="settings-search">${icon('search')}<input type="search" id="settings-search" placeholder="搜索设置" aria-label="搜索设置" autocomplete="off" value="${esc(settingsSearchValue)}"><button type="button" ${action('clearSettingsSearch')} aria-label="清除设置搜索" ${settingsSearchValue?'':'hidden'}>${icon('close')}</button></div><p id="settings-search-status" class="sr-only" role="status"></p><p id="settings-no-results" class="settings-no-results" hidden>没有找到相关设置</p><div class="settings-entries">${Object.entries(settingsMeta).map(([id,m])=>`<button class="feature-entry archive-panel" ${action('settingsPage',attr('value',id))} data-settings-target="${id}"><span class="feature-entry-content">${icon(m.icon)}<span><strong>${m.title}</strong><small>${m.note}</small></span>${icon('next')}</span></button>`).join('')}</div><div class="settings-search-results" hidden></div><section class="about-app"><div class="about-app-heading"><span class="about-app-mark">${icon('book')}</span><div><h2>拷贝漫画</h2><p>1.13.2 · 第三方客户端</p></div></div><button class="textbtn" ${action('aboutApp')}>关于该应用 ${icon('next')}</button></section>`;}
function openSettingsSection(id){if(!settingsMeta[id]||screen!=='main'||tab!=='settings')return;settingsSearchValue=$('#settings-search')?.value||'';settingsHomeScroll=window.scrollY;document.activeElement?.blur();settingsSection=id;screen='settings';route++;viewReturning=false;viewDirection=1;render();window.scrollTo(0,0);}
function renderSettingsDetail(){const id=settingsSection,m=settingsMeta[id];if(!m)return;app.innerHTML=`<div class="shell page-settings-sub" data-settings-section="${id}"><header class="settings-subhead"><button class="iconbtn" ${action('back')} aria-label="返回设置">${icon('arrow')}</button><div class="archive-route-title"><h1>${m.title}</h1><span class="archive-code" aria-hidden="true">${m.code}</span></div><button class="iconbtn" ${action('quickTheme')} aria-label="切换深浅色">${icon(dark()?'sun':'moon')}</button></header><div id="main-content"><div class="archive-section" aria-hidden="true"><span class="archive-code">${m.code}</span><span class="archive-rule"></span><i></i></div>${settingsGroup(id,settingsSections()[id])}</div></div>`;AppMotion.bindBackGesture(app.firstElementChild,back);if(id==='data')request('cache').then(x=>{const el=$('#cache-size');if(el)el.textContent=`当前约 ${(x.bytes/1024/1024).toFixed(1)} MB · 上限约 120 MB`;}).catch(()=>{});}
function closeSettingsSection(){if(screen!=='settings')return;const id=settingsSection;screen='main';tab='settings';settingsSection='';viewReturning=true;viewDirection=-1;route++;render();window.scrollTo(0,settingsHomeScroll);$(`[data-settings-target="${id}"]`)?.focus({preventScroll:true});}

function showAbout(){modal('关于拷贝漫画',`<div class="about-dialog-heading"><span class="about-app-mark">${icon('book')}</span><div><h3>拷贝漫画</h3><p>版本 1.13.2</p></div></div><dl class="about-facts"><div><dt>应用</dt><dd>第三方 Android 漫画阅读客户端</dd></div><div><dt>功能</dt><dd>在线阅读、账号书架、自选书架与本地阅读记录</dd></div><div><dt>许可</dt><dd>MIT 开源许可</dd></div><div><dt>界面参考</dt><dd>Wenku8_Flutter</dd></div></dl><p class="about-repository">https://github.com/JupiterLXV/CopyReader</p>`);}
function findBook(word){return catalog?.list.items.find(b=>b.path_word===word)||listing.items.find(b=>b.path_word===word)||cloud.items.find(b=>b.path_word===word)||state.favorites[word]||state.showcase.find(b=>b.path_word===word)||state.history.find(h=>h.book.path_word===word)?.book||detail?.book;}
function historyFor(word){return state.history.find(h=>h.book.path_word===word);}
async function openBook(word,options={}){
 viewDirection=1;viewReturning=false;
 if(!isWord(word))return;if(screen==='main'){mainScroll=window.scrollY;tabScroll[tab]=mainScroll;}if(reader){reader.observer?.disconnect();persistReading();reader=null;}closeModal();const id=++route;
 const parentCatalog=screen==='catalog'?{view:catalog,scroll:window.scrollY}:detail?.word===word?detail.parentCatalog:null;
 const book=cleanBook(options.book)||cleanBook(findBook(word))||{path_word:word,name:'正在加载…',cover:'',author:[]};
 catalog=null;
 detail={word,book,parentCatalog,loading:true,error:'',groups:{},group:'default',chapters:[],total:0,chapLoading:false,chapError:'',chapterToken:0,chapterPending:null,locateGeneration:0,locating:false,locateError:'',reverse:false,filter:'',collect:0,cloudReady:false,cloudBusy:false,cloudError:''};
 screen='detail';render();window.scrollTo(0,0);
 try{const res=await request('detail',{comic:word,refresh:!!options.refresh});if(route!==id||!detail||detail.word!==word)return;const r=res.results||{};if(!r.comic)throw Error('漫画详情为空');detail.book=r.comic;rememberBookMetadata(r.comic,true);detail.groups=r.groups||{};detail.locked=r.is_lock===true;detail.group=detail.groups.default?'default':Object.keys(detail.groups)[0]||'default';detail.loading=false;renderDetail();if(options.locate)locateReadingChapter(detail);else loadChapters();loadCloudStatus(detail);}
 catch(e){if(route!==id)return;detail.loading=false;detail.error=e.message;AppMotion.discard();renderDetail();}
}
function renderDetail(){
 if(!detail)return;const d=detail,b=d.book,h=historyFor(d.word),fav=!!state.favorites[d.word];chrome();
 const authors=namedTerms(b.author).map(({id,name})=>`<button type="button" class="detail-author" ${action('openAuthor',attr('id',id)+' '+attr('label',name))} aria-label="查看作者 ${esc(name)} 的作品">${esc(name)}${icon('next')}</button>`).join('');
 const tags=namedTerms(b.theme).map(({id,name})=>`<button type="button" class="tag detail-tag" ${action('openTag',attr('id',id)+' '+attr('label',name))} aria-label="查看题材 ${esc(name)} 的作品">${esc(name)}</button>`).join('');
 app.innerHTML=`<div class="shell detail-shell"><div class="backhead"><button class="iconbtn" ${action('back')} aria-label="返回">${icon('arrow')}</button><strong>作品详情</strong><span style="flex:1"></span>${refreshButton('reloadDetail','刷新漫画详情',d.loading)}</div>
 <section class="detail-intro"><div class="detail-cover">${cover(b)}</div><div class="detail-meta"><h1>${esc(b.name)}</h1>${authors?`<div class="detail-authors" aria-label="作者">${authors}</div>`:''}<p>${esc(b.status?.display||'')}${b.region?.display?' · '+esc(b.region.display):''}</p></div></section>${tags?`<div class="tags detail-tags" aria-label="作品标签">${tags}</div>`:''}
 ${d.error?errorBox(d.error,'reloadDetail'):d.loading?'<div class="spinner"></div>':`<div class="actions detail-actions"><button class="btn" ${action('startRead')} ${d.locked?'disabled':''}>${icon('play')}${h?'继续阅读':'开始阅读'}</button><button class="btn secondary" ${action('favorite')}>${fav?'本地已收藏':'本地收藏'}</button></div>${h?`<div class="reading-mark"><p>上次读到 ${esc(h.chapterName)} · 第 ${h.page+1} 页</p><button class="textbtn" ${action('locateReadingChapter')}>定位章节</button></div>`:''}${d.locked?'<p class="settingnote">数据源限制了这部作品的访问，当前客户端无法阅读。</p>':''}<p class="brief">${esc(b.brief||'暂无简介')}</p><button class="comment-entry" ${action('openComicComments')}>${icon('comment')}<span>作品评论</span>${icon('next')}</button><div class="sectionhead"><h2>章节目录 <small>${d.total||''}</small></h2><button class="textbtn" ${action('reverseChapters')}>${icon('sort')} ${d.reverse?'倒序':'正序'}</button></div><div class="detailtools"><select id="group-select" aria-label="选择分组">${Object.entries(d.groups).map(([key,g])=>`<option value="${esc(key)}" ${key===d.group?'selected':''}>${esc(g.name||key)} · ${Number(g.count)||0} 话</option>`).join('')||'<option value="default">默认分组</option>'}</select></div><input class="chapter-filter" id="chapter-filter" type="search" placeholder="查找已加载章节" value="${esc(d.filter)}" aria-label="筛选已加载章节"><p id="chapter-locate-status" class="chapter-locate-status" role="status">${esc(d.locating?'正在定位上次阅读的章节…':d.locateError)}</p><div id="chapter-list">${chapterCards()}</div>`}</div>`;
 if(!d.loading&&!d.error){const block=document.createElement('div');block.id='cloud-control';block.innerHTML=cloudControl(d);$('.detail-actions',app)?.appendChild(block);}
}
function cloudControl(d){
 if(!account.loggedIn)return `<button class="btn outline cloud-button" ${action('login')}>账号收藏</button>`;
 if(!d.cloudReady)return `<button class="btn outline cloud-button" ${action('retryCloudStatus')} aria-label="${esc(d.cloudError||'正在读取账号收藏')}" ${!d.cloudError||d.cloudBusy?'disabled':''}>${d.cloudError?'重试账号':'账号加载中…'}</button>`;
 return `<button class="btn outline cloud-button ${d.collect>0?'collected':''}" ${action('cloudFavorite')} ${d.cloudBusy?'disabled':''}>${d.cloudBusy?'更新中…':d.collect>0?'账号已收藏':'账号收藏'}</button>`;
}
function paintCloudControl(d){const el=$('#cloud-control');if(detail===d&&screen==='detail'&&el)el.innerHTML=cloudControl(d);}
async function loadCloudStatus(d){
 if(!account.loggedIn||!d)return;const epoch=accountEpoch;d.cloudReady=false;d.cloudError='';paintCloudControl(d);
 try{const r=(await request('cloudStatus',{comic:d.word})).results||{};if(detail!==d||epoch!==accountEpoch)return;d.collect=Math.max(0,Number(r.collect)||0);d.cloudReady=true;}
 catch(e){if(detail===d&&epoch===accountEpoch){d.cloudError=e.message;toast(e.message);}}
 finally{paintCloudControl(d);}
}
async function changeCloudFavorite(d,remove){
 if(detail!==d||d.cloudBusy||!account.loggedIn||!d.cloudReady)return;
 if(!remove&&!isWord(d.book.uuid)){toast('漫画标识尚未取得，请刷新详情后重试');return;}
 const epoch=accountEpoch;d.cloudBusy=true;paintCloudControl(d);
 try{await request(remove?'cloudRemove':'cloudAdd',remove?{shelfId:d.collect}:{comicId:d.book.uuid});if(epoch!==accountEpoch)return;resetCloud();toast(remove?'已从账号书架移除':'已加入账号书架');await loadCloudStatus(d);}
 catch(e){if(epoch===accountEpoch)toast(e.message);}
 finally{d.cloudBusy=false;paintCloudControl(d);}
}
function chapterCards(){
 const d=detail;if(!d)return '';
 if(d.chapLoading&&!d.chapters.length)return '<div class="spinner"></div>';
 if(d.chapError&&!d.chapters.length)return errorBox(d.chapError,'moreChapters');
 let chapters=d.chapters.filter(c=>!d.filter||c.name?.toLowerCase().includes(d.filter.toLowerCase()));if(d.reverse)chapters=chapters.slice().reverse();const h=historyFor(d.word);
 return `<div class="chaptergrid">${chapters.map(c=>{const current=h?.chapter===c.uuid&&h.group===d.group;return `<button class="chapterbtn ${current?'current':''}" ${action('chapter',attr('id',c.uuid))} ${current?'aria-current="location"':''} title="${esc(c.name)}"><span class="chapter-name">${esc(c.name)}</span>${current?'<small class="chapter-read-tag">上次读到</small>':''}</button>`;}).join('')}</div>${!chapters.length&&!d.chapLoading?'<p class="statusline">暂无匹配章节</p>':''}${d.chapters.length<d.total?`<button class="loadmore" ${action('moreChapters')} ${d.chapLoading?'disabled':''}>${d.chapLoading?'正在加载…':`加载更多章节（${d.chapters.length}/${d.total}）`}</button>`:''}${d.chapError?errorBox(d.chapError,'moreChapters'):''}`;
}
function loadChapters(reset=false){
 const d=detail;if(!d)return Promise.resolve();if(d.chapLoading&&!reset)return d.chapterPending||Promise.resolve();
 if(reset){d.chapterToken++;d.chapters=[];d.total=0;}const token=d.chapterToken,group=d.group;d.chapLoading=true;d.chapError='';if($('#chapter-list'))$('#chapter-list').innerHTML=chapterCards();
 d.chapterPending=(async()=>{try{const r=(await request('chapters',{comic:d.word,group,offset:d.chapters.length})).results||{};if(detail!==d||d.chapterToken!==token||d.group!==group)return;const seen=new Set(d.chapters.map(c=>c.uuid));for(const c of r.list||[])if(isWord(c.uuid)&&!seen.has(c.uuid)){seen.add(c.uuid);d.chapters.push(c);}d.total=Number(r.total)||d.chapters.length;}
 catch(e){if(detail===d&&d.chapterToken===token)d.chapError=e.message;}
 finally{if(detail===d&&d.chapterToken===token){d.chapLoading=false;if($('#chapter-list'))$('#chapter-list').innerHTML=chapterCards();AppMotion.arrive($('#chapter-list'));paintChapterLocation(d);}}})();return d.chapterPending;
}
function cancelChapterLocation(d){if(!d)return;d.locateGeneration++;d.locating=false;d.locateError='';paintChapterLocation(d);}
function paintChapterLocation(d){
 if(detail!==d||screen!=='detail')return;const status=$('#chapter-locate-status');if(status)status.textContent=d.locating?`正在定位上次章节… ${d.chapters.length}${d.total?' / '+d.total:''}`:d.locateError;const button=$('[data-act="locateReadingChapter"]');if(button)button.disabled=d.locating;
}
async function locateReadingChapter(d=detail){
 const h=d&&historyFor(d.word);if(!h||detail!==d||screen!=='detail'||d.loading||d.error)return;
 cancelChapterLocation(d);const generation=d.locateGeneration,group=h.group;const valid=()=>detail===d&&screen==='detail'&&d.locateGeneration===generation&&d.group===group;
 if(!Object.prototype.hasOwnProperty.call(d.groups,group)&&Object.keys(d.groups).length){d.locateError='上次阅读的分组已不在当前目录中。';paintChapterLocation(d);return;}
 const changed=d.group!==group;d.group=group;d.filter='';d.locating=true;d.chapError='';if(changed)renderDetail();else if($('#chapter-filter'))$('#chapter-filter').value='';paintChapterLocation(d);
 try{if(changed)await loadChapters(true);else if(d.chapLoading)await d.chapterPending;else if(!d.chapters.length)await loadChapters();
 while(valid()){
  if(d.chapters.some(c=>c.uuid===h.chapter)){d.locating=false;if($('#chapter-list'))$('#chapter-list').innerHTML=chapterCards();paintChapterLocation(d);requestAnimationFrame(()=>{if(valid())$('[data-act="chapter"].current')?.scrollIntoView({block:'center',behavior:'auto'});});return;}
  if(d.chapError){d.locateError='目录加载失败，请重试定位。';break;}if(!d.total||d.chapters.length>=d.total)break;
  const before=d.chapters.length;paintChapterLocation(d);await loadChapters();if(d.chapError){d.locateError='目录加载失败，请重试定位。';break;}if(d.chapters.length===before)break;
 }if(valid()&&!d.locateError)d.locateError='当前目录中未找到上次阅读的章节。';
 }finally{if(detail===d&&d.locateGeneration===generation){d.locating=false;paintChapterLocation(d);}}
}
function openReaderCatalog(){
 const r=reader;if(!r)return;persistReading();r.observer?.disconnect();reader=null;closeModal();route++;
 if(detail?.word===r.book.path_word&&!detail.loading&&!detail.error){screen='detail';viewReturning=true;viewDirection=-1;render();locateReadingChapter(detail);}else openBook(r.book.path_word,{locate:true,book:r.book});
}
async function startRead(){
 const d=detail;if(!d||d.locked)return;const h=historyFor(d.word);
 if(h){openReader(d.book,h.chapter,h.group,h.page);return;}
 if(!d.chapters.length){await loadChapters();if(!d.chapters.length){toast('尚未取得章节，请先加载目录');return;}}
 openReader(d.book,d.chapters[0].uuid,d.group,0);
}
function favorite(){const d=detail;if(!d)return;const word=d.word;if(state.favorites[word]){delete state.favorites[word];toast('已从书架移除');}else{state.favorites[word]=cleanBook(d.book);toast('已加入本地书架');}save();renderDetail();}
function openComments(scope){
 const from=screen,source=from==='reader'?reader:detail;
 if(!source||source.loading||source.error||!['detail','reader'].includes(from))return;
 const book=cleanBook(source.book);if(!book)return;
 const comicId=from==='detail'?source.book.uuid:source.info?.comic_id||(detail?.word===book.path_word?detail.book.uuid:'');
 if(from==='reader'){persistReading();reader.observer?.disconnect();}
 discussion={from,scroll:window.scrollY,book,comicId,chapterId:from==='reader'?source.chapter:'',chapterName:from==='reader'?source.info?.name||'':'',scope:scope==='chapter'&&from==='reader'?'chapter':'comic',generation:0,items:[],offset:0,total:0,loading:false,loaded:false,error:'',drafts:{comic:'',chapter:''},thread:null,replyTarget:null};
 route++;screen='comments';closeModal();render();window.scrollTo(0,0);loadComments();
}
function cleanComment(row){
 if(!row||typeof row!=='object'||!/^[1-9]\d{0,19}$/.test(String(row.id??''))||typeof row.comment!=='string')return null;
 const replyCount=Number(row.count);
 return {id:String(row.id),name:String(row.user_name||'读者').slice(0,100),avatar:typeof row.user_avatar==='string'&&/^https:\/\//.test(row.user_avatar)?row.user_avatar.slice(0,2048):'',text:row.comment.slice(0,20000),date:String(row.create_at||'').replace('T',' ').slice(0,16),parent:String(row.parent_user_name||'').slice(0,100),replyCount:Number.isSafeInteger(replyCount)?Math.max(0,replyCount):0};
}
function commentCard(c,rootId=''){
 const d=discussion,canReply=d.scope==='comic'&&isWord(d.comicId);
 const thread=!rootId&&d.thread?.rootId===c.id?d.thread:null;
 const reply=canReply?`<div class="comment-actions"><button type="button" class="textbtn" ${action('replyComment',attr('id',c.id)+' '+attr('root',rootId||c.id))} aria-label="回复 ${esc(c.name)}">回复</button>${rootId?'':`<button type="button" class="textbtn thread-toggle" ${action('toggleReplies',attr('root',c.id))} aria-expanded="${!!thread}" aria-controls="replies-${c.id}" ${!thread&&!c.replyCount?'hidden':''}>${thread?'收起回复':`${c.replyCount} 条回复 ${icon('down')}`}</button>`}</div>`:'';
 const replies=canReply&&!rootId?`<div class="comment-thread" id="replies-${c.id}" ${thread?'':'hidden'}>${thread?threadContent(thread):''}</div>`:'';
 return `<article class="comment-card ${rootId?'reply-card':''}"><div class="comment-avatar" aria-hidden="true">${esc(c.name.slice(0,1))}${c.avatar?`<img src="${esc(imgUrl(c.avatar))}" alt="" loading="lazy" decoding="async" data-cover>`:''}</div><div class="comment-body"><div class="comment-meta"><strong>${esc(c.name)}</strong><time>${esc(c.date)}</time></div>${c.parent?`<p class="comment-parent">回复 @${esc(c.parent)}</p>`:''}<p class="comment-text">${esc(c.text)}</p>${reply}${replies}</div></article>`;
}
function threadContent(thread){
 const rows=thread.items.map(comment=>commentCard(comment,thread.rootId)).join('');
 const busy=thread.loading?'<p class="quiet" role="status">正在加载回复…</p>':'';
 const error=thread.error?`<p class="quiet" role="alert">${esc(thread.error)}</p>`:'';
 const more=thread.error||thread.offset<thread.total?`<button type="button" class="textbtn" ${action('moreReplies',attr('root',thread.rootId))} ${thread.loading?'disabled':''}>${thread.error?'重试':'加载更多回复'}</button>`:'';
 const empty=!rows&&!busy&&!error?'<p class="quiet">暂无回复</p>':'';
 return `${rows}${busy}${error}${empty}${more}`;
}
function paintThread(d,rootId){
 if(discussion!==d||screen!=='comments'||d.scope!=='comic')return;
 const mount=$(`#replies-${rootId}`),toggle=$(`[data-act="toggleReplies"][data-root="${rootId}"]`);
 const rootComment=d.items.find(comment=>comment.id===rootId);
 if(!mount||!toggle||!rootComment)return;
 const thread=d.thread?.rootId===rootId?d.thread:null;
 mount.hidden=!thread;mount.innerHTML=thread?threadContent(thread):'';
 toggle.hidden=!thread&&!rootComment.replyCount;
 toggle.setAttribute('aria-expanded',String(!!thread));
 toggle.innerHTML=thread?'收起回复':`${rootComment.replyCount} 条回复 ${icon('down')}`;
}
async function loadReplies(rootId,reset=false){
 const d=discussion;
 if(!d||screen!=='comments'||d.scope!=='comic'||!isWord(d.comicId))return;
 const rootComment=d.items.find(comment=>comment.id===rootId);
 if(!rootComment)return;
 const oldRoot=d.thread?.rootId;
 if(reset||oldRoot!==rootId)d.thread={rootId,items:[],offset:0,total:0,loading:false,error:''};
 const thread=d.thread;
 if(thread.loading)return;
 const active=()=>discussion===d&&d.scope==='comic'&&d.thread===thread;
 thread.loading=true;thread.error='';
 if(oldRoot&&oldRoot!==rootId)paintThread(d,oldRoot);
 paintThread(d,rootId);
 try{
  const {results:data}=await request('comments',{scope:'comic',target:d.comicId,replyId:rootId,offset:thread.offset});
  if(!active())return;
  if(!Array.isArray(data?.list))throw Error('回复列表格式不正确，请重试');
  const seen=new Set(thread.items.map(comment=>comment.id));
  for(const row of data.list){
   const comment=cleanComment(row);
   if(!comment||comment.id===rootId||seen.has(comment.id))continue;
   seen.add(comment.id);thread.items.push(comment);
  }
  thread.offset+=data.list.length;
  thread.total=data.list.length?Math.max(thread.offset,Number(data.total)||0):thread.offset;
  const currentRoot=d.items.find(comment=>comment.id===rootId);
  if(currentRoot)currentRoot.replyCount=thread.total;
 }catch(error){if(active())thread.error=error.message;}
 finally{if(active()){thread.loading=false;paintThread(d,rootId);}}
}
function toggleReplies(rootId){
 const d=discussion;if(d?.scope!=='comic')return;
 if(d.thread?.rootId===rootId){d.thread=null;paintThread(d,rootId);return;}
 loadReplies(rootId,true);
}
function replyToComment(id,rootId){
 const d=discussion;if(d?.scope!=='comic')return;
 const comment=id===rootId?d.items.find(row=>row.id===id):d.thread?.rootId===rootId?d.thread.items.find(row=>row.id===id):null;
 if(comment)showCommentEditor({id,rootId,name:comment.name,quote:comment.text.slice(0,180)});
}
function commentCards(){
 const d=discussion;if(!d)return '';
 if(d.loading&&!d.items.length)return '<div class="spinner" aria-label="正在加载评论"></div>';
 if(d.error&&!d.items.length)return errorBox(d.error,'refreshComments');
 if(d.loaded&&!d.items.length)return empty('暂无评论','');
 return `${d.items.map(comment=>commentCard(comment)).join('')}${d.error?errorBox(d.error,'moreComments'):''}${d.offset<d.total?`<button class="loadmore" ${action('moreComments')} ${d.loading?'disabled':''}>${d.loading?'正在加载…':'加载更多评论'}</button>`:d.items.length?'<p class="statusline">已加载全部</p>':''}`;
}
function renderComments(){
 const d=discussion;if(!d)return;chrome();
 app.innerHTML=`<div class="shell comments-shell"><header class="backhead"><button class="iconbtn" ${action('back')} aria-label="返回">${icon('arrow')}</button><strong>评论</strong><span style="flex:1"></span>${refreshButton('refreshComments','刷新评论',d.loading)}</header><div class="discussion-title"><h1>${esc(d.book.name)}</h1>${d.chapterId?`<p>${esc(d.chapterName)}</p>`:''}</div><div class="chips comment-tabs"><button class="chip ${d.scope==='comic'?'active':''}" ${action('commentScope',attr('scope','comic'))}>作品评论</button>${d.chapterId?`<button class="chip ${d.scope==='chapter'?'active':''}" ${action('commentScope',attr('scope','chapter'))}>本话评论</button>`:''}<span id="comment-total" class="quiet" role="status">${d.loaded?`${d.total} 条`:''}</span></div><section id="comment-list" aria-label="${d.scope==='chapter'?'本话评论':'作品评论'}">${commentCards()}</section></div>`;
 app.insertAdjacentHTML('beforeend','<div class="comment-compose-bar" id="comment-compose-bar"></div>');paintCommentCompose();
}
function paintCommentCompose(){
 const d=discussion,bar=$('#comment-compose-bar');if(!d||screen!=='comments'||!bar)return;
 const target=d.scope==='chapter'?d.chapterId:d.comicId;
 bar.innerHTML=`<button class="btn full" ${action('composeComment')} ${!account.ready||!isWord(target)?'disabled':''}>${icon('comment')} ${!account.ready?'正在读取账号…':account.loggedIn?'发表评论':'登录后发表评论'}</button>`;
}
function showCommentEditor(replyTo=null){
 const d=discussion;if(!d||screen!=='comments'||commentSending)return;
 const scope=d.scope,target=scope==='chapter'?d.chapterId:d.comicId;
 if(!isWord(target)){toast('未取得评论对象，请稍后重试');return;}
 if(scope!=='comic')replyTo=null;
 d.replyTarget=replyTo;
 if(!account.ready){toast('正在读取账号状态，请稍候');return;}
 if(!account.loggedIn){showLogin();return;}
 const draftKey=replyTo?`reply:${replyTo.id}`:scope;
 commentEditor={view:d,scope,target,replyTo,draftKey,epoch:accountEpoch};
 const name=account.profile?.nickname||account.profile?.username||'当前账号';
 const quote=replyTo?`<blockquote class="reply-quote"><strong>回复 @${esc(replyTo.name)}</strong><p>${esc(replyTo.quote)}</p></blockquote>`:'';
 modal(replyTo?'回复评论':'发表评论',`<form id="comment-form"><p class="comment-target">${esc(d.book.name)}${scope==='chapter'?` · ${esc(d.chapterName)}`:' · 作品评论'}</p>${quote}<label class="sr-only" for="comment-text">评论内容</label><textarea id="comment-text" class="comment-input" rows="6" maxlength="2000" placeholder="${replyTo?'输入回复':'输入评论'}" spellcheck="false">${esc(d.drafts[draftKey]||'')}</textarea><div class="comment-editor-meta"><span>${esc(name)}</span><span id="comment-length"></span></div><div id="comment-post-error" class="login-error" role="alert"></div><button id="comment-submit" class="btn full" type="submit">发送</button><button class="textbtn rowgap" id="comment-check-status" type="button" ${action('checkCommentStatus')} hidden>${replyTo?'查看回复':'刷新评论'}</button></form>`);
 updateCommentEditor();$('#comment-text')?.focus();
}
function updateCommentEditor(){
 const input=$('#comment-text'),button=$('#comment-submit'),length=$('#comment-length');if(!input||!button||!commentEditor)return;
 const count=Array.from(input.value).length;commentEditor.view.drafts[commentEditor.draftKey]=input.value;
 if(length){length.textContent=`${count}/1000`;length.classList.toggle('too-long',count>1000);}
 button.disabled=commentSending||!input.value.trim()||count>1000;
 button.textContent=commentSending?'正在发送…':account.loggedIn?'发送':'登录后发送';
 input.disabled=commentSending;$$('#modal-root [data-act="closeModal"]').forEach(el=>el.disabled=commentSending);
}
async function submitComment(){
 const editor=commentEditor,input=$('#comment-text');if(commentSending||!editor||!input||discussion!==editor.view||screen!=='comments')return;
 editor.view.drafts[editor.draftKey]=input.value;
 if(!account.loggedIn){showLogin();return;}
 if(editor.epoch!==accountEpoch){$('#comment-post-error').textContent='账号已变更，请重新打开编辑窗口';return;}
 const text=input.value.trim();if(!text||Array.from(text).length>1000){updateCommentEditor();return;}
 commentSending=true;$('#comment-post-error').textContent='';$('#comment-check-status').hidden=true;updateCommentEditor();
 try{
  const args={scope:editor.scope,target:editor.target,text};
  if(editor.replyTo)args.replyId=editor.replyTo.id;
  await request('postComment',args);
  delete editor.view.drafts[editor.draftKey];editor.view.replyTarget=null;
  commentSending=false;closeModal();toast(editor.replyTo?'回复已提交':'评论已提交');
  if(discussion===editor.view&&screen==='comments'&&discussion.scope===editor.scope){
   if(editor.replyTo)loadReplies(editor.replyTo.rootId,true);else loadComments(true);
  }
 }catch(e){
  const error=$('#comment-post-error');if(error)error.textContent=e.message||'发送失败，请重试';
  if(['COMMENT_UNCONFIRMED','REQUEST_TIMEOUT'].includes(e.code)&&$('#comment-check-status'))$('#comment-check-status').hidden=false;
 }finally{commentSending=false;updateCommentEditor();paintCommentCompose();}
}
function checkCommentStatus(){
 const reply=commentEditor?.replyTo;closeModal();
 if(reply)loadReplies(reply.rootId,true);else loadComments(true);
}
function paintComments(d){if(discussion!==d||screen!=='comments')return;refreshBusy('refreshComments',d.loading);const list=$('#comment-list'),total=$('#comment-total');if(list){list.innerHTML=commentCards();if(!d.loading)AppMotion.arrive(list);}if(total)total.textContent=d.loaded?`${d.total} 条`:'';paintCommentCompose();}
async function loadComments(reset=false){
 const d=discussion;if(!d||screen!=='comments'||d.loading&&!reset)return;
 if(reset){d.generation++;d.items=[];d.offset=0;d.total=0;d.loaded=false;}
 const generation=d.generation,scope=d.scope;d.loading=true;d.error='';paintComments(d);
 try{
  if(scope==='comic'&&!isWord(d.comicId)){
   const data=(await request('detail',{comic:d.book.path_word})).results||{};
   if(discussion!==d||d.generation!==generation||d.scope!==scope)return;
   d.comicId=data.comic?.uuid;if(!isWord(d.comicId))throw Error('未取得作品评论标识，请返回详情后重试');
  }
  const data=(await request('comments',{scope,target:scope==='chapter'?d.chapterId:d.comicId,offset:d.offset})).results;
  if(discussion!==d||d.generation!==generation||d.scope!==scope)return;
  if(!data||!Array.isArray(data.list))throw Error('评论数据格式暂不支持，请稍后重试');
  const rows=data.list,seen=new Set(d.items.map(c=>c.id));
  for(const row of rows){const c=cleanComment(row);if(c&&!seen.has(c.id)){seen.add(c.id);d.items.push(c);}}
  d.offset+=rows.length;d.total=Math.max(d.offset,Number(data.total)||0);if(!rows.length)d.total=d.offset;d.loaded=true;
 }catch(e){if(discussion===d&&d.generation===generation)d.error=e.message;}
 finally{if(discussion===d&&d.generation===generation){d.loading=false;paintComments(d);}}
}
function orderedPages(ch){
 const contents=Array.isArray(ch.contents)?ch.contents:[];
 if(!contents.length)throw Error('这个章节没有可用图片');
 let out;
 if(Array.isArray(ch.words)){
  if(ch.words.length!==contents.length||new Set(ch.words).size!==contents.length||ch.words.some(x=>!Number.isInteger(x)||x<0||x>=contents.length))throw Error('章节页码数据异常，请重试');
  out=new Array(contents.length);contents.forEach((c,i)=>out[ch.words[i]]=c.url);
 }else out=contents.map(c=>c.url);
 if(out.some(u=>typeof u!=='string'||!/^https:\/\//.test(u)))throw Error('章节包含不支持的图片地址');
 return out;
}
async function openReader(book,chapter,group='default',page=0,refresh=false){
 if(!isWord(chapter))return;
 if(reader&&!reader.loading)persistReading();
 if(screen!=='reader')detailScroll=window.scrollY;
 const token=++route;reader={book:cleanBook(book),chapter,group,page,initial:page,loading:true,error:'',pages:[],info:null,chrome:true,token,observer:null,anchorPage:null};
 screen='reader';closeModal();render();
 try{
  const result=(await request('chapter',{comic:book.path_word,chapter,refresh})).results||{};
  if(!reader||reader.token!==token||screen!=='reader')return;
  if(result.is_lock)throw Error('当前章节被数据源限制，暂时无法阅读');
  reader.info=result.chapter;reader.pages=orderedPages(result.chapter||{});reader.page=Math.min(Math.max(0,page),reader.pages.length-1);reader.loading=false;renderReader();persistReading();
 }catch(e){if(reader?.token!==token||screen!=='reader')return;reader.loading=false;reader.error=e.message;renderReader();}
}
function pageHtml(url,i){
 const caption=state.prefs.mode==='paged'?`<div class="page-caption">${i+1}</div>`:'';
 return `<div class="pagewrap" data-page="${i}"><img src="${esc(imgUrl(url))}" alt="第 ${i+1} 页" ${i<reader.page+3?'fetchpriority="high"':'loading="lazy"'} decoding="async" data-reader-image="${i}"><span class="reader-image-loading" aria-hidden="true">图片加载中…</span>${caption}</div>`;
}
function renderReader(){
 const r=reader;if(!r)return;r.observer?.disconnect();chrome();
 app.innerHTML=`<section class="reader ${r.chrome?'':'hidden-chrome'}" aria-label="漫画阅读器"><header class="reader-top"><button class="iconbtn" ${action('back')} aria-label="返回详情">${icon('arrow')}</button><div class="reader-title"><strong>${esc(r.book.name)}</strong><p>${esc(r.info?.name||'正在打开章节…')}</p></div><button class="iconbtn" ${action('openChapterComments')} aria-label="查看本话评论" ${r.loading||r.error?'disabled':''}>${icon('comment')}</button><button class="iconbtn" ${action('readerMenu')} aria-label="阅读设置">${icon('settings')}</button></header><div id="reader-scroll" class="reader-scroll ${state.prefs.mode==='paged'?'paged':''}">${r.loading?'<div class="spinner"></div>':r.error?errorBox(r.error,'retryReader'):state.prefs.mode==='paged'?pageHtml(r.pages[r.page],r.page):r.pages.map(pageHtml).join('')+`<div class="reader-end">本话结束<br>${r.info.next?`<button ${action('nextChapter')}>下一话 ${icon('next')}</button>`:''}<button ${action('openChapterComments')}>本话评论</button><button ${action('readerCatalog')}>返回目录</button></div>`}</div>${!r.loading&&!r.error?`<footer class="reader-bottom"><div class="reader-controls"><button ${action('prevChapter')} ${!r.info.prev?'disabled':''}>上一话</button><button ${action('toggleMode')}>${state.prefs.mode==='vertical'?'竖向滚动':'逐页阅读'}</button><button ${action('readerCatalog')}>目录 ${icon('list')}</button><button ${action('nextChapter')} ${!r.info.next?'disabled':''}>下一话</button></div><input id="page-range" type="range" min="0" max="${r.pages.length-1}" step="1" value="${r.page}" aria-label="跳转阅读页码"><div class="counts"><span id="page-count">${r.page+1} / ${r.pages.length}</span></div></footer>`:''}</section>`;
 if(r.loading||r.error)return;
 const scroll=$('#reader-scroll');
 if(state.prefs.mode==='vertical'){
  // Lock the requested page while earlier lazy images change height. User input
  // releases the lock; normal scroll tracking then finds the page at the top band.
  r.anchorPage=r.page;
  requestAnimationFrame(()=>restoreAnchor(r));
  let scheduled=false;
  scroll.addEventListener('scroll',()=>{if(scheduled||r.anchorPage!==null)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(reader!==r||r.anchorPage!==null)return;const pages=$$('.pagewrap',scroll),line=scroll.getBoundingClientRect().top+scroll.clientHeight*.18;let lo=0,hi=pages.length-1,index=0;while(lo<=hi){const mid=(lo+hi)>>1;if(pages[mid].getBoundingClientRect().top<=line){index=mid;lo=mid+1;}else hi=mid-1;}r.page=index;updateCount();scheduleProgress();});},{passive:true});
  scroll.addEventListener('wheel',()=>{r.anchorPage=null;},{passive:true});
 }else{
  warmReaderNeighbours(r);
 }
 bindReaderGestures(scroll,r);
}
function bindReaderGestures(scroll,r){
 const paged=scroll.classList.contains('paged'),passive={passive:true};
 let press=null,lastScroll=-Infinity;
 if(!paged)scroll.addEventListener('scroll',()=>{if(r.anchorPage===null)lastScroll=performance.now();},passive);
 scroll.parentElement.addEventListener('pointerdown',e=>{
  if(!scroll.contains(e.target)||!e.isPrimary||e.button!==0||e.target.closest('button,input')){press=null;return;}
  r.anchorPage=null;
  press={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),top:scroll.scrollTop,moved:false};
 },{capture:true,passive:true});
 scroll.addEventListener('pointermove',e=>{
  if(press?.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)press.moved=true;
 },passive);
 const cancel=e=>{if(press?.id===e.pointerId)press=null;};
 for(const event of ['pointercancel','pointerleave','lostpointercapture'])scroll.addEventListener(event,cancel,passive);
 scroll.addEventListener('pointerup',e=>{
  if(press?.id!==e.pointerId)return;
  const start=press;press=null;
  if(!e.isPrimary||!scroll.isConnected||e.target.closest('button,input'))return;
  const dx=e.clientX-start.x,dy=e.clientY-start.y,duration=performance.now()-start.at;
  if(paged&&duration<=700&&Math.abs(dx)>65&&Math.abs(dy)<70){step(dx<0?1:-1);return;}
  if(duration>320||start.moved||Math.hypot(dx,dy)>10)return;
  if(!paged&&(lastScroll>=start.at-120||scroll.scrollTop!==start.top))return;
  const viewport=window.visualViewport;
  const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
  const width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
  const x=(e.clientX-left)/width;
  if(paged&&(x<.23||x>.77)){step(x<.23?-1:1);return;}
  const centered=(x,y)=>Math.abs((x-left)/width-.5)<=.2&&Math.abs((y-top)/height-.5)<=.2;
  if(centered(start.x,start.y)&&centered(e.clientX,e.clientY))toggleChrome();
 },passive);
}
function $$(s,root=document){return [...root.querySelectorAll(s)];}
function restoreAnchor(r){if(reader!==r||r.anchorPage===null||state.prefs.mode!=='vertical')return;const scroll=$('#reader-scroll'),target=$(`[data-page="${r.anchorPage}"]`);if(!scroll||!target)return;r.page=r.anchorPage;const top=target.getBoundingClientRect().top-scroll.getBoundingClientRect().top+scroll.scrollTop-(r.chrome?78:0);scroll.scrollTop=Math.max(0,top);updateCount();}
function updateCount(){if(!reader)return;const count=$('#page-count'),range=$('#page-range');if(count)count.textContent=`${reader.page+1} / ${reader.pages.length}`;if(range)range.value=reader.page;}
function warmReaderNeighbours(r){
 r.warmed??=new Set();[r.page-1,r.page+1].filter(i=>i>=0&&i<r.pages.length&&!r.warmed.has(i)).forEach(i=>{r.warmed.add(i);const image=new Image();image.src=imgUrl(r.pages[i]);image.onerror=()=>r.warmed.delete(i);});
}
let progressTimer;
function scheduleProgress(){clearTimeout(progressTimer);progressTimer=setTimeout(persistReading,450);}
function persistReading(){
 const r=reader;if(!r||r.loading||r.error||!r.info||!r.pages.length)return;
 const h={book:cleanBook(r.book),chapter:r.chapter,chapterName:r.info.name||'',group:r.group,page:r.page,total:r.pages.length,at:Date.now()};
 state.history=[h,...state.history.filter(x=>x.book.path_word!==r.book.path_word)].slice(0,300);save();
}
window.persistReading=persistReading;
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistReading();});
window.addEventListener('pagehide',persistReading);
function jumpPage(value){const r=reader;if(!r||r.loading||r.error)return;const previous=r.page;r.page=Math.max(0,Math.min(r.pages.length-1,Number(value)||0));if(state.prefs.mode==='paged'){const scroll=$('#reader-scroll');if(scroll)AppMotion.pageTurn(scroll,()=>{scroll.innerHTML=pageHtml(r.pages[r.page],r.page);},Math.sign(r.page-previous)||1,state.prefs.readerTurn);updateCount();warmReaderNeighbours(r);}else{r.anchorPage=r.page;restoreAnchor(r);}persistReading();}
function step(direction){const r=reader;if(screen!=='reader'||!r||r.loading||r.error)return;if(state.prefs.mode==='paged'){if(r.page+direction<0){toast('已经是本话第一页');return;}if(r.page+direction>=r.pages.length){if(r.info.next)confirmModal('已经读完这一话','要继续打开下一话吗？',()=>changeChapter(1),'继续下一话');else toast('已经是最后一页');return;}jumpPage(r.page+direction);}else{r.anchorPage=null;$('#reader-scroll')?.scrollBy({top:direction*innerHeight*.8,behavior:'smooth'});}}
window.ReaderStep=step;
function toggleChrome(){
 const r=reader,view=$('.reader'),scroll=$('#reader-scroll');
 if(!r||r.loading||!view||!scroll)return;
 const top=scroll.scrollTop,keepPosition=state.prefs.mode==='vertical'&&top>0;
 const inset=keepPosition?parseFloat(getComputedStyle(scroll).paddingTop):0;
 r.chrome=!r.chrome;view.classList.toggle('hidden-chrome',!r.chrome);
 if(keepPosition)scroll.scrollTop=top+parseFloat(getComputedStyle(scroll).paddingTop)-inset;
}
function changeChapter(direction){const r=reader;if(!r)return;const id=direction>0?r.info?.next:r.info?.prev;if(isWord(id)){r.observer?.disconnect();persistReading();openReader(r.book,id,r.group,0);}else toast(direction>0?'已经是最后一话':'已经是第一话');}
async function resume(word){const h=historyFor(word);if(!h)return;mainScroll=window.scrollY;detail=null;openReader(h.book,h.chapter,h.group,h.page);}
function back(){
 if(modalRoot.children.length){dismissModal();return;}
 if(screen==='shelfEdit'){shelfEditor?.requestClose();return;}
 if(screen==='settings'){closeSettingsSection();return;}
 viewDirection=-1;viewReturning=true;
 if(screen==='comments'){const d=discussion;discussion=null;route++;screen=d?.from==='reader'&&reader?'reader':detail?'detail':'main';render();window.scrollTo(0,d?.scroll||0);return;}
 if(screen==='reader'){const r=reader;r?.observer?.disconnect();persistReading();route++;screen=detail?'detail':'main';reader=null;render();window.scrollTo(0,detail?detailScroll:mainScroll);return;}
 if(screen==='catalog'){
  const previous=catalog;catalog=null;detail=previous.parent;route++;screen='detail';render();window.scrollTo(0,previous.scroll);
  if(!detail.chapters.length&&!detail.chapError)loadChapters();
  return;
 }
 if(screen==='detail'){
  const parent=detail?.parentCatalog;route++;detail=null;
  if(parent){catalog=parent.view;screen='catalog';render();window.scrollTo(0,parent.scroll);return;}
  screen='main';render();window.scrollTo(0,mainScroll);return;
 }
 if(tab!=='discover'){setTab('discover',true);return;}
 if(Date.now()-exitAt<1800){if(window.ReaderNative)ReaderNative.exit();return;}exitAt=Date.now();toast('再按一次返回键退出');
}
window.AppBack=back;
let modalFocus=null,modalClosing=null;
async function dismissModal(){if(loginBusy||commentSending||profileSaving){closeModal();return;}const node=modalRoot.firstElementChild;if(!node)return;modalRoot.removeChild(node);node.inert=true;node.classList.add('modal-exit');node.style.pointerEvents='none';node.setAttribute('aria-hidden','true');node.removeAttribute('data-dismiss');$$('[id],[data-act],[role=dialog]',node).forEach(el=>{el.removeAttribute('id');el.removeAttribute('data-act');el.removeAttribute('role');});document.body.appendChild(node);closeModal();await AppMotion.leaveSheet($('.modal',node));node.remove();}
function closeModal(){
 if(loginBusy){toast('正在登录，请稍候');return;}
 if(commentSending){toast('正在发送，请稍候');return;}
 if(profileSaving){toast('正在保存资料，请稍候');return;}
 if(profileEditor?.avatarId)window.ReaderNative?.discardAvatar?.(profileEditor.avatarId);
 profileEditor=null;commentEditor=null;modalRoot.innerHTML='';modalClosing=null;document.body.style.overflow='';
 if(modalFocus?.isConnected)modalFocus.focus({preventScroll:true});modalFocus=null;
}
function modal(title,body){$$('.modal-exit').forEach(n=>n.remove());if(!modalRoot.children.length)modalFocus=document.activeElement;modalClosing=null;if(gallery){cancelGalleryGesture();stopGallery(gallery);gallery.position=Math.round(gallery.position);paintGallery(gallery);}modalRoot.innerHTML=`<div class="modalshade" data-dismiss><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modalhandle"></div><div class="sectionhead"><h2>${esc(title)}</h2><button class="textbtn" ${action('closeModal')} aria-label="关闭">${icon('close')}</button></div>${body}</section></div>`;document.body.style.overflow='hidden';$('.modal button')?.focus();AppMotion.sheet($('.modal'));}
let confirmAction=null;
function confirmModal(title,message,fn,label='确认'){confirmAction=fn;modal(title,`<p>${esc(message)}</p><div class="actions"><button class="btn outline" ${action('closeModal')}>取消</button><button class="btn" ${action('confirm')}>${esc(label)}</button></div>`);}
const allCategory={id:'',name:'全部题材'};
let categories=[allCategory];
let categoriesLoaded=false,categoriesPending=null;
function categoryName(word){return categories.find(term=>term.id===word)?.name||word;}
function paintCategories(){
 const panel=$('#category-options');if(!panel)return;
 const query=$('#category-search').value.trim().toLowerCase();
 const terms=categories.filter(({id,name})=>name.toLowerCase().includes(query)||id.toLowerCase().includes(query));
 const status=!categoriesLoaded?(categoriesPending?'正在加载题材…':'题材目录暂不可用，请刷新重试'):terms.length?'':'没有匹配的题材';
 panel.innerHTML=terms.map(({id,name})=>`<button type="button" class="chip ${listing.theme===id?'active':''}" ${action('category',attr('theme',id))} aria-pressed="${listing.theme===id}">${esc(name)}</button>`).join('')+(status?`<p class="quiet" role="status">${status}</p>`:'');
 refreshBusy('refreshCategories',!!categoriesPending);
}
async function refreshCategories(force=false){
 if(categoriesPending||categoriesLoaded&&!force)return;
 const task=request('themes',{refresh:force},{silent:true});categoriesPending=task;paintCategories();
 try{
  const response=await task;
  if(categoriesPending!==task)return;
  const result=response.results,tags=Array.isArray(result?.theme)?result.theme:result?.themes;
  if(!Array.isArray(tags))throw Error('源站未返回题材');
  categories=[allCategory,...namedTerms(tags).filter(term=>term.id)];categoriesLoaded=true;
  if(listing.theme&&!categories.some(term=>term.id===listing.theme))resetDiscovery();
  if(force&&response._stale)toast('网络暂不可用，正在显示上次的题材');
 }catch(e){if(force&&categoriesPending===task)toast('暂时无法更新题材，请稍后重试');}
 finally{if(categoriesPending===task){categoriesPending=null;paintCategories();}}
}
function openCategories(){
 modal('题材',`<div class="category-tools"><input class="login-input" id="category-search" type="search" placeholder="搜索题材" aria-label="搜索题材">${refreshButton('refreshCategories','更新题材目录')}</div><div id="category-options" class="chips category-options" aria-label="题材列表"></div>`);
 paintCategories();refreshCategories();
}
function saveMangaApi(value,notice){
 if(!window.ReaderNative){toast('请在 Android 应用中设置');return;}
 const previous=ReaderNative.getApi(),error=ReaderNative.setApi(value);
 if(error){toast(error);return;}
 const saved=ReaderNative.getApi();$('#api-url').value=saved;
 if(previous!==saved){
  categories=[allCategory];categoriesLoaded=false;categoriesPending=null;
  resetDiscovery();
 }
 toast(notice);
}
function showTheme(){modal('界面主题',`<div class="theme-choices">${[['system','跟随系统'],['light','浅色'],['dark','深色']].map(([id,label])=>`<button class="theme-choice ${state.prefs.theme===id?'selected':''}" ${action('setTheme',attr('value',id))} aria-pressed="${state.prefs.theme===id}"><span class="theme-swatch ${id}" aria-hidden="true"></span>${label}</button>`).join('')}</div>`);}
function toggleMode(){persistReading();if(!setPreference('mode',state.prefs.mode==='vertical'?'paged':'vertical'))return;if(screen==='reader'){AppMotion.cancelTurn();renderReader();}else{const value=$('[data-act="readerMode"] .setting-value');if(value)value.textContent=state.prefs.mode==='vertical'?'竖向滚动':'逐页阅读';}}
function readerMenu(){modal('阅读偏好',`<div class="settingrow"><strong>阅读方式</strong><button class="textbtn" ${action('modalMode')}>${state.prefs.mode==='vertical'?'竖向滚动':'逐页阅读'} ${icon('next')}</button></div><div class="settingrow"><strong>音量键翻页</strong>${switchButton(state.prefs.volume,'modalVolume','音量键翻页')}</div><p>轻点屏幕中央显示或收起菜单。逐页阅读时，可左右滑动或轻点两侧翻页。双指可缩放画面。</p>`);}
function setTab(value,returning=false){
 const tabs=['discover','shelf','history','settings'];
 if(!tabs.includes(value))return;
 settingsSection='';AppMotion.discard();viewReturning=returning;
 viewDirection=tabs.indexOf(value)>=tabs.indexOf(tab)?1:-1;
 if(shelfEditor){const editor=shelfEditor;shelfEditor=null;editor.destroy();}
 if(screen==='main')tabScroll[tab]=window.scrollY;
 if(reader){reader.observer?.disconnect();persistReading();reader=null;}
 route++;detail=null;catalog=null;discussion=null;screen='main';tab=value;
 closeModal();render();window.scrollTo(0,tabScroll[value]||0);
 if(value==='discover'&&!listing.loaded&&!listing.loading)loadList(true);
 if(value==='shelf'&&shelfTab==='cloud'&&account.loggedIn&&!cloud.loaded&&!cloud.loading)loadCloud();
 if(value==='settings')refreshAccountProfile();
}
function search(){const q=$('#search-input')?.value.trim()||'';listing.query=q;listing.theme='';if(q){state.searches=[q,...state.searches.filter(x=>x!==q)].slice(0,12);save();}document.activeElement?.blur();loadList(true);}
window.onImported=raw=>{
 try{
  const parsed=JSON.parse(raw);if(parsed?.version!==1||!parsed.favorites||!Array.isArray(parsed.history))throw Error('不支持的备份格式');
  const incoming=sanitize(parsed);if(!Object.keys(incoming.favorites).length&&!incoming.history.length&&!incoming.showcase.length)toast('该备份未包含书架或阅读记录');
  confirmModal('导入阅读备份',`发现 ${Object.keys(incoming.favorites).length} 部收藏、${incoming.history.length} 条记录${Array.isArray(parsed.showcase)?`、${incoming.showcase.length} 本自选漫画`:''}。将与本机内容合并，并使用备份中的阅读偏好。`,()=>{
   const previous=state;state=sanitize(state);
   state.favorites=Object.assign(Object.create(null),state.favorites,incoming.favorites);
   const all=[...state.history,...incoming.history].sort((a,b)=>b.at-a.at),seen=new Set();state.history=all.filter(h=>{const word=h.book.path_word;if(seen.has(word))return false;seen.add(word);return true;}).slice(0,300);
   if(Array.isArray(parsed.showcase))state.showcase=incoming.showcase;state.prefs=incoming.prefs;if(!save()){state=previous;render();return;}themeWanted=state.prefs.theme;shelfTab=state.prefs.shelfSource;render();toast('备份已合并');
  },'合并导入');
 }catch(e){toast('备份文件格式不正确，未修改本地数据');}
};
function filterSettings(query){
 const q=query.trim().toLowerCase();settingsSearchValue=query;const results=$('.settings-search-results');if(!results)return;
 $('.settings-entries').hidden=!!q;results.hidden=!q;let count=0;
 if(q){if(!results.children.length){const parts=settingsSections();results.innerHTML=Object.entries(settingsMeta).map(([id,m])=>`<div class="settings-search-group" data-settings-group="${id}"><h2>${m.title}</h2>${settingsGroup(id,parts[id])}</div>`).join('');}
  for(const group of $$('.settings-search-group',results)){let matches=0;for(const row of $$('.settingrow,.settings-field',group)){const match=row.textContent.toLowerCase().includes(q);row.hidden=!match;if(match)matches++;}group.hidden=!matches;$('.motion-guide',group)?.toggleAttribute('hidden',true);count+=matches;}
 }else results.innerHTML='';
 $('#settings-search-status').textContent=q?`找到 ${count} 项相关设置`:'';$('#settings-no-results').hidden=!q||count>0;$('[data-act="clearSettingsSearch"]').hidden=!q;
}
function setPreference(key,value){const old=state.prefs[key];state.prefs[key]=value;if(!save()){state.prefs[key]=old;return false;}return true;}
function syncMotionSettings(){
 const off=state.prefs.motionStyle==='none';if($('#motion-speed'))$('#motion-speed').disabled=off;
 const button=$('[data-act="toggleMotion"]');if(button){button.setAttribute('aria-checked',!off);$('.switch',button)?.classList.toggle('on',!off);}
 if($('#motion-hint'))$('#motion-hint').textContent=reducedMotion.matches?'系统已开启减少动态效果，动画暂不播放。':off?'页面转场和翻页动画均已关闭。':'跟随系统的“减少动态效果”设置。';
}
const editingField=element=>element?.matches?.('input:not([type=range]):not([type=checkbox]),textarea');
document.addEventListener('focusin',e=>{if(editingField(e.target))document.body.classList.add('keyboard-editing');});
document.addEventListener('focusout',()=>{queueMicrotask(()=>document.body.classList.toggle('keyboard-editing',!!editingField(document.activeElement)));});
document.addEventListener('submit',e=>{if(screen==='shelfEdit'&&shelfEditor?.submit(e))return;if(e.target.id==='search-form'){e.preventDefault();search();}if(e.target.id==='login-form'){e.preventDefault();submitLogin();}if(e.target.id==='comment-form'){e.preventDefault();submitComment();}if(e.target.id==='profile-form'){e.preventDefault();saveProfile();}});
document.addEventListener('change',e=>{
 if(e.target.id==='motion-speed'){if(!setPreference('motionSpeed',['quick','standard','calm'].includes(e.target.value)?e.target.value:'standard'))e.target.value=state.prefs.motionSpeed;AppMotion.sync();AppMotion.preview($('#motion-preview'));}
 if(e.target.id==='show-password'&&$('#login-password'))$('#login-password').type=e.target.checked?'text':'password';
 if(e.target.id==='group-select'){cancelChapterLocation(detail);detail.group=e.target.value;detail.filter='';if($('#chapter-filter'))$('#chapter-filter').value='';loadChapters(true);}
 if(e.target.id==='page-range')jumpPage(e.target.value);
});
document.addEventListener('input',e=>{if(e.target.id==='settings-search')filterSettings(e.target.value);if(e.target.id==='category-search')paintCategories();if(e.target.id==='profile-nickname')updateProfileEditor();if(screen==='shelfEdit')shelfEditor?.input(e);if(e.target.id==='comment-text')updateCommentEditor();if(e.target.id==='chapter-filter'&&detail){cancelChapterLocation(detail);detail.filter=e.target.value;$('#chapter-list').innerHTML=chapterCards();paintChapterLocation(detail);}if(e.target.id==='page-range'&&reader){$('#page-count').textContent=`${Number(e.target.value)+1} / ${reader.pages.length}`;}});
document.addEventListener('error',e=>{const el=e.target;if(el.matches?.('[data-cover]'))el.classList.add('failed');if(el.matches?.('[data-reader-image]')&&el.isConnected){if(el.complete&&el.naturalWidth>0)return;el.parentNode.classList.add('has-error');el.style.display='none';if($('.image-error',el.parentNode))return;const box=document.createElement('div');box.className='image-error';box.innerHTML=`第 ${Number(el.dataset.readerImage)+1} 页加载失败<button ${action('retryImage',attr('page',el.dataset.readerImage))}>点这里重试</button>`;el.parentNode.appendChild(box);}},true);
document.addEventListener('load',e=>{const el=e.target;if(el.matches?.('img[data-cover]'))AppMotion.reveal(el);if(el.matches?.('[data-reader-image]')&&el.isConnected){el.parentNode.classList.add('has-image');el.parentNode.classList.remove('has-error');el.style.display='';$('.image-error',el.parentNode)?.remove();if(reader&&reader.anchorPage!==null&&Number(el.dataset.readerImage)<=reader.anchorPage)requestAnimationFrame(()=>{if(reader)restoreAnchor(reader);});}},true);
document.addEventListener('click',async e=>{
 if(screen==='shelfEdit'&&shelfEditor&&(shelfEditor.menuClick(e)||shelfEditor.click(e)))return;
 if(e.detail!==0&&e.target.closest('.shelf-gallery')&&Date.now()<gallerySuppressUntil){e.preventDefault();return;}
 if(e.target.matches('[data-dismiss]')){dismissModal();return;}
 const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const a=b.dataset.act;
 switch(a){
 case 'accountSettings':if(loginBusy){toast('正在登录，请稍候');break;}closeModal();if(screen==='shelfEdit'&&shelfEditor){const editor=shelfEditor;editor.requestClose(()=>{finishShelfEditor(editor,false);setTab('settings');openSettingsSection('network');$('#account-api-url')?.scrollIntoView({block:'center'});});}else{setTab('settings');openSettingsSection('network');$('#account-api-url')?.scrollIntoView({block:'center'});}break;
 case 'saveAccountApi':{const error=window.ReaderNative?ReaderNative.setAccountApi($('#account-api-url').value,$('#account-protocol').value):'请在 Android 应用中设置';toast(error||'账号线路已保存，下次登录使用新设置');}break;
 case 'resetAccountApi':if(window.ReaderNative){const error=ReaderNative.setAccountApi('https://api.copy202601.com','modern');if(error){toast(error);break;}$('#account-api-url').value=ReaderNative.getAccountApi();$('#account-protocol').value='modern';toast('已恢复新版账号线路，请重新登录');}break;
 case 'legacyAccountApi':if(window.ReaderNative){const error=ReaderNative.setAccountApi('https://api.2024manga.com','legacy');if(error){toast(error);break;}$('#account-api-url').value=ReaderNative.getAccountApi();$('#account-protocol').value='legacy';toast('已选择旧版账号线路，请重新登录');}break;
 case 'login':showLogin();break;
 case 'editProfile':showProfileEditor();break;
 case 'chooseAvatar':chooseAvatar();break;
 case 'undoAvatar':undoAvatar();break;
 case 'checkProfile':checkProfile();break;
 case 'refreshProfile':refreshAccountProfile(true);break;
 case 'logout':confirmModal('退出当前账号','退出后会清除本机的登录凭证。本地收藏与阅读记录会保留。',logout,'退出登录');break;
 case 'showCloud':chooseShelfSource('cloud');setTab('shelf');break;
 case 'shelfLayout':state.prefs.shelfLayout=b.dataset.value==='grid'?'grid':'shelf';save();renderMain();window.scrollTo(0,0);break;
 case 'galleryStep':moveGallery(b.dataset.key,Number(b.dataset.step)||0);break;
 case 'galleryBook':if(Number(b.dataset.offset))moveGallery(b.dataset.key,Number(b.dataset.offset));else openBook(b.dataset.word);break;
 case 'editShelf':openShelfEditor();break;
 case 'shelfAccount':shelfAccountMenu();break;
 case 'shelfSearch':setTab('discover');$('#search-input')?.focus();break;
 case 'shelfTab':chooseShelfSource(b.dataset.value);renderMain();if(shelfTab==='cloud'&&account.loggedIn&&!cloud.loaded&&!cloud.loading)loadCloud();break;
 case 'refreshCloud':loadCloud(true);break;
 case 'moreCloud':loadCloud();break;
 case 'retryCloudStatus':loadCloudStatus(detail);break;
 case 'cloudFavorite':{const d=detail;if(d?.collect>0)confirmModal('从账号书架移除',`要从账号书架移除《${d.book.name}》吗？本地收藏会保留。`,()=>changeCloudFavorite(d,true),'移除账号收藏');else if(d)changeCloudFavorite(d,false);}break;
 case 'back':back();break;
 case 'tab':setTab(b.dataset.tab);break;
 case 'quickTheme':changeTheme((themeWanted==='dark'||themeWanted==='system'&&systemDark.matches)?'light':'dark',b);break;
 case 'theme':showTheme();break;
 case 'toggleShelfHaptics':state.prefs.shelfHaptics=!state.prefs.shelfHaptics;save();b.setAttribute('aria-checked',state.prefs.shelfHaptics);$('.switch',b)?.classList.toggle('on',state.prefs.shelfHaptics);break;
 case 'settingsPage':openSettingsSection(b.dataset.value);break;
 case 'previewMotion':AppMotion.preview($('#motion-preview'));break;
 case 'toggleMotion':if(setPreference('motionStyle',state.prefs.motionStyle==='none'?'unified':'none')){AppMotion.stop();AppMotion.sync();syncMotionSettings();}break;
 case 'toggleReaderTurn':if(setPreference('readerTurn',state.prefs.readerTurn==='none'?'paper':'none')){const on=state.prefs.readerTurn!=='none';b.setAttribute('aria-checked',on);$('.switch',b)?.classList.toggle('on',on);AppMotion.cancelTurn();}break;
 case 'aboutApp':showAbout();break;
 case 'setTheme':closeModal();changeTheme(b.dataset.value);break;
 case 'search':search();break;
 case 'clearSearch':listing.query='';loadList(true);break;
 case 'listMode':listing.mode=b.dataset.mode;listing.query='';loadList(true);break;
 case 'refreshList':loadList(true,true);break;
 case 'moreList':loadList();break;
 case 'categories':openCategories();break;
 case 'refreshCategories':refreshCategories(true);break;
 case 'openAuthor':openCatalog('author',b.dataset.id,b.dataset.label);break;
 case 'openTag':openCatalog('theme',b.dataset.id,b.dataset.label);break;
 case 'category':listing.theme=b.dataset.theme;listing.query='';closeModal();loadList(true);break;
 case 'book':if(screen==='main'&&tab==='shelf'){const books=displayBooks(),index=books.findIndex(book=>book.path_word===b.dataset.word);if(index>=0){let cursor=index;if(gallery){stopGallery(gallery);const current=Math.round(gallery.position),delta=index-galleryBookIndex(current,books.length);cursor=current+delta-Math.round(delta/books.length)*books.length;gallery.position=cursor;}galleryIndex[shelfTab]=cursor;}}openBook(b.dataset.word);break;
 case 'reloadDetail':{const word=detail?.word;if(word)openBook(word,{refresh:true});}break;
 case 'favorite':favorite();break;
 case 'openComicComments':openComments('comic');break;
 case 'openChapterComments':openComments('chapter');break;
 case 'composeComment':showCommentEditor();break;
 case 'replyComment':replyToComment(b.dataset.id,b.dataset.root);break;
 case 'toggleReplies':toggleReplies(b.dataset.root);break;
 case 'moreReplies':loadReplies(b.dataset.root);break;
 case 'checkCommentStatus':checkCommentStatus();break;
 case 'refreshComments':loadComments(true);break;
 case 'moreComments':loadComments();break;
 case 'commentScope':if(discussion&&['comic','chapter'].includes(b.dataset.scope)&&discussion.scope!==b.dataset.scope&&(b.dataset.scope==='comic'||discussion.chapterId)){discussion.scope=b.dataset.scope;discussion.thread=null;discussion.replyTarget=null;loadComments(true);renderComments();window.scrollTo(0,0);}break;
 case 'startRead':startRead();break;
 case 'moreChapters':loadChapters();break;
 case 'reverseChapters':detail.reverse=!detail.reverse;renderDetail();break;
 case 'chapter':{const c=detail?.chapters.find(c=>c.uuid===b.dataset.id);if(c)openReader(detail.book,c.uuid,detail.group,historyFor(detail.word)?.chapter===c.uuid?historyFor(detail.word).page:0);}break;
 case 'resume':resume(b.dataset.word);break;
 case 'resumeDetail':{const h=historyFor(b.dataset.word);if(h)openBook(b.dataset.word,{locate:true,book:h.book});}break;
 case 'locateReadingChapter':locateReadingChapter();break;
 case 'clearHistory':confirmModal('清空阅读记录','书架中的收藏会保留。阅读进度清空后无法撤销。',()=>{state.history=[];save();render();toast('阅读记录已清空');},'清空记录');break;
 case 'removeHistory':state.history=state.history.filter(h=>h.book.path_word!==b.dataset.word);save();render();break;
 case 'readerMode':case 'toggleMode':toggleMode();break;
 case 'volume':if(setPreference('volume',!state.prefs.volume)){b.setAttribute('aria-checked',state.prefs.volume);$('.switch',b)?.classList.toggle('on',state.prefs.volume);chrome();}break;
 case 'readerMenu':readerMenu();break;
 case 'modalMode':closeModal();toggleMode();break;
 case 'modalVolume':state.prefs.volume=!state.prefs.volume;save();chrome();readerMenu();break;
 case 'readerCatalog':openReaderCatalog();break;
 case 'prevChapter':changeChapter(-1);break;
 case 'nextChapter':changeChapter(1);break;
 case 'retryReader':{const r=reader;if(r)openReader(r.book,r.chapter,r.group,r.page,true);}break;
 case 'retryImage':{const wrap=$(`[data-page="${b.dataset.page}"]`),image=$('img',wrap);$('.image-error',wrap)?.remove();wrap.classList.remove('has-image','has-error');image.style.display='';image.src=imgUrl(reader.pages[Number(b.dataset.page)])+'&retry='+Date.now();}break;
 case 'closeModal':dismissModal();break;
 case 'clearSettingsSearch':$('#settings-search').value='';filterSettings('');$('#settings-search').focus();break;
 case 'confirm':{const fn=confirmAction;confirmAction=null;closeModal();fn?.();}break;
 case 'export':if(window.ReaderNative)ReaderNative.exportData(JSON.stringify(state,null,2));else toast('请在 Android 应用中导出备份');break;
 case 'import':if(window.ReaderNative)ReaderNative.importData();else toast('请在 Android 应用中导入备份');break;
 case 'clearCache':b.disabled=true;try{await request('clearCache');toast('图片缓存已清理');if($('#cache-size'))$('#cache-size').textContent='当前约 0 MB · 上限约 120 MB';}catch(e){toast(e.message);}finally{b.disabled=false;}break;
 case 'saveApi':saveMangaApi($('#api-url').value,'线路已保存');break;
 case 'resetApi':saveMangaApi('https://api.2024manga.com','已恢复默认线路');break;
 case 'testApi':{b.disabled=true;const old=b.textContent;b.textContent='连接中…';try{const address=$('#api-url').value.trim();await request('ping',{base:address});toast('此线路连接正常，点击保存后生效');}catch(e){toast(e.message);}finally{b.disabled=false;b.textContent=old;}}break;
 }
});
document.addEventListener('pointerdown',e=>{
 if(e.target.closest('.paper-stage,.reader-scroll'))AppMotion.finishRoute();
 if(e.target.closest('.shelf-gallery'))gallerySuppressUntil=0;
 const stage=e.target.closest('.paper-stage'),g=gallery;
 if(!g||stage!==g.stage||!e.isPrimary||e.button!==0)return;
 const interrupted=!!g.simulation;stopGallery(g);
 galleryGesture={key:g.key,id:e.pointerId,x:e.clientX,y:e.clientY,position:g.position,stage,dragging:false,axis:'',interrupted,samples:[]};recordGallerySample(galleryGesture,e);
},{passive:true});
document.addEventListener('pointermove',e=>{
 const gesture=galleryGesture,g=gallery;if(!gesture||!g||gesture.id!==e.pointerId||g.stage!==gesture.stage)return;
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
 if(!gesture.axis){
  if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)*1.1)gesture.axis='vertical';
  else if(g.books.length>1&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){gesture.axis='horizontal';gesture.dragging=true;gesture.stage.classList.add('is-dragging');setGalleryMotion(g,'dragging');try{gesture.stage.setPointerCapture(e.pointerId);}catch(error){}}
 }
 recordGallerySample(gesture,e);
 if(gesture.dragging){g.position=gesture.position-dx/g.m.pitch;g.velocity=0;queueGalleryFrame(g);if(e.cancelable)e.preventDefault();}
},{passive:false});
document.addEventListener('pointerup',e=>{
 const gesture=galleryGesture,g=gallery;if(!gesture||gesture.id!==e.pointerId)return;galleryGesture=null;
 gesture.stage.classList.remove('is-dragging');
 const moved=Math.max(Math.abs(e.clientX-gesture.x),Math.abs(e.clientY-gesture.y))>8;
 if(moved||gesture.interrupted)gallerySuppressUntil=Date.now()+350;
 if(g?.stage!==gesture.stage)return;
 if(gesture.dragging){g.position=gesture.position-(e.clientX-gesture.x)/g.m.pitch;recordGallerySample(gesture,e);paintGallery(g);releaseGallery(g,galleryReleaseVelocity(gesture));}
 else if(gesture.interrupted){g.position=Math.round(g.position);g.velocity=0;paintGallery(g);setGalleryMotion(g,'idle');}
});
document.addEventListener('pointercancel',cancelGalleryGesture);
document.addEventListener('lostpointercapture',cancelGalleryGesture);
document.addEventListener('dragstart',e=>{if(e.target.closest('.shelf-stage'))e.preventDefault();});
let galleryResizeFrame=0;
let headerScrollFrame=0;
window.addEventListener('scroll',()=>{if(!headerScrollFrame)headerScrollFrame=requestAnimationFrame(()=>{headerScrollFrame=0;document.body.classList.toggle('page-scrolled',window.scrollY>8);});},{passive:true});
window.addEventListener('resize',()=>{cancelAnimationFrame(galleryResizeFrame);galleryResizeFrame=requestAnimationFrame(resizeGallery);});
reducedMotion.addEventListener?.('change',()=>{cancelGalleryGesture();const g=gallery;if(g){stopGallery(g);g.position=Math.round(g.position);g.velocity=0;paintGallery(g);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&gallery){cancelGalleryGesture();const g=gallery;stopGallery(g);g.position=Math.round(g.position);g.velocity=0;paintGallery(g);}});
document.addEventListener('keydown',e=>{if(modalRoot.children.length){if(e.key==='Escape'){e.preventDefault();dismissModal();return;}if(e.key==='Tab'){const nodes=$$('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',modalRoot).filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(first&&e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(last&&!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}if(e.key==='Escape'){back();e.preventDefault();}if(screen==='reader'&&!modalRoot.children.length&&['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.key)){step(['ArrowRight','ArrowDown'].includes(e.key)?1:-1);e.preventDefault();}const stage=e.target.closest('.shelf-stage');if(stage&&['ArrowLeft','ArrowRight'].includes(e.key)){moveGallery(stage.dataset.gallery,e.key==='ArrowRight'?1:-1);document.querySelector('.shelf-stage')?.focus({preventScroll:true});e.preventDefault();}});
render();loadList(true);initAccount();
})();

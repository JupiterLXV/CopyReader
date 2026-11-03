'use strict';
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 class ShelfEditor{
  constructor(ctx,books,source='local'){
   this.ctx=ctx;this.books=[];const seen=new Set();
   for(const item of books){const b=ctx.clean(item);if(b&&!seen.has(b.path_word)){seen.add(b.path_word);this.books.push(b);if(this.books.length===ctx.limit)break;}}
   this.initial=JSON.stringify(this.books);this.view=this.books.length?'selected':'add';this.source=source==='cloud'?'cloud':'local';
   this.visible=ctx.limit;this.query='';this.results=[];this.offset=0;this.total=0;this.loading=false;this.error='';this.generation=0;this.scrolls={selected:0,add:0};this.candidates=new Map();this.drag=null;this.drop=null;this.flips=new Set();
   this.listeners=[['visibilitychange',()=>{if(document.hidden&&this.drag)this.finishDrag(true);}],['pointerdown',e=>this.startDrag(e)],['pointermove',e=>this.moveDrag(e),{passive:false}],['pointerup',e=>this.endDrag(e)],['pointercancel',e=>this.cancelPointer(e)],['lostpointercapture',e=>{if(e.target===this.ctx.root)this.cancelPointer(e);}],['keydown',e=>this.key(e)]];
   this.listeners.forEach(([name,fn,options])=>document.addEventListener(name,fn,options));this.onResize=()=>{if(this.drag)this.finishDrag(true);};root.addEventListener('resize',this.onResize);
  }
  active(){return this.ctx.active(this);}
  dirty(){return this.initial!==JSON.stringify(this.books);}
  count(){const el=this.ctx.root.querySelector('#shelf-edit-count');if(el)el.textContent=this.books.length+' / '+this.ctx.limit;}
  rows(){
   const {esc,icon,cover}=this.ctx;
   return this.books.map((b,i)=>`<div class="shelf-edit-row" data-row-word="${esc(b.path_word)}"><button class="reorder-handle" data-reorder="${esc(b.path_word)}" aria-label="拖动排序 ${esc(b.name)}"><span class="row-number">${String(i+1).padStart(2,'0')}</span>${icon('grip')}</button><div class="edit-thumb">${cover(b)}</div><div class="edit-book-info"><strong>${esc(b.name)}</strong><small>${esc((b.author||[]).map(a=>a.name).filter(Boolean).join(' / '))}</small></div><button class="iconbtn" data-edit="rowMenu" data-word="${esc(b.path_word)}" aria-label="管理 ${esc(b.name)}">${icon('more')}</button><button class="iconbtn" data-edit="remove" data-word="${esc(b.path_word)}" aria-label="移出自选 ${esc(b.name)}">${icon('close')}</button></div>`).join('');
  }
  render(){
   if(!this.active())return;this.finishDrop();
   const {esc,icon}=this.ctx;
   this.ctx.root.innerHTML=`<div class="shell shelf-editor"><header class="backhead"><button class="iconbtn" data-act="back" aria-label="返回书架">${icon('arrow')}</button><strong>整理自选书架</strong><span class="editor-header-space"></span><button class="btn small" data-edit="save">完成</button></header><div class="editor-switch"><div class="chips"><button class="chip ${this.view==='selected'?'active':''}" data-edit="view" data-value="selected">排列</button><button class="chip ${this.view==='add'?'active':''}" data-edit="view" data-value="add">添加漫画</button></div><span id="shelf-edit-count" aria-live="polite">${this.books.length} / ${this.ctx.limit}</span></div><div id="shelf-editor-body"></div><p class="sr-only" id="shelf-edit-status" role="status"></p></div>`;
   const body=this.ctx.root.querySelector('#shelf-editor-body');
   if(this.view==='selected')body.innerHTML=this.books.length?`<div class="editor-section-head"><p>拖动左侧手柄调整顺序</p><button class="textbtn" data-edit="clear">清空</button></div><div class="shelf-edit-rows">${this.rows()}</div><button class="loadmore" data-edit="view" data-value="add">${icon('plus')} 添加漫画</button>`:`<div class="empty">${icon('shelf')}<h3>还没有自选漫画</h3><button class="btn" data-edit="view" data-value="add">添加漫画</button></div>`;
   else{
    body.innerHTML=`<div class="editor-sources" role="group" aria-label="添加漫画来源">${[['local','本地'],['cloud','账号'],['search','搜索']].map(([key,label])=>`<button class="chip ${this.source===key?'active':''}" data-edit="source" data-value="${key}" aria-pressed="${this.source===key}">${label}</button>`).join('')}</div><form class="searchbar editor-search" id="shelf-search-form">${icon('search')}<input id="shelf-edit-query" type="search" value="${esc(this.query)}" placeholder="${this.source==='search'?'搜索漫画':'筛选已载入漫画'}" aria-label="${this.source==='search'?'搜索待添加漫画':'筛选可选漫画'}" enterkeyhint="search" maxlength="120"><button type="submit" aria-label="搜索待添加漫画">${icon('next')}</button></form><div class="editor-pick-head"><p>仅调整自选陈列，不修改收藏</p><button class="textbtn" data-edit="fill">${this.books.length?'补满30本':'添加前30本'}</button></div><div id="shelf-candidates"></div>`;
    this.paintCandidates();
   }
  }
  sourceItems(){
   const sources=this.ctx.sources();let items=this.source==='search'?this.results:this.source==='cloud'?sources.cloud:sources.local;
   const q=this.query.trim().toLocaleLowerCase();if(this.source!=='search'&&q)items=items.filter(b=>String(b.name||'').toLocaleLowerCase().includes(q));
   const map=new Map();for(const item of items){const b=this.ctx.clean(item);if(b&&!map.has(b.path_word))map.set(b.path_word,b);}return [...map.values()];
  }
  paintCandidates(){
   if(!this.active()||this.view!=='add')return;
   const el=this.ctx.root.querySelector('#shelf-candidates');if(!el)return;const {esc,icon,cover}=this.ctx,sources=this.ctx.sources();
   if(this.source==='cloud'&&!sources.ready){el.innerHTML='<div class="spinner" aria-label="正在读取账号"></div>';return;}
   if(this.source==='cloud'&&!sources.loggedIn){el.innerHTML=`<div class="empty">${icon('shield')}<h3>登录后选择账号收藏</h3><button class="btn" data-edit="login">登录</button></div>`;return;}
   const items=this.sourceItems();this.candidates=new Map(items.map(b=>[b.path_word,b]));
   if((this.loading||this.source==='cloud'&&sources.cloudLoading)&&!items.length){el.innerHTML='<div class="spinner" aria-label="正在搜索漫画"></div>';return;}
   if(this.error&&!items.length){el.innerHTML=`<div class="errorbox"><p>${esc(this.error)}</p><button class="btn small" data-edit="retry">重试</button></div>`;return;}
   if(!items.length){el.innerHTML=`<div class="empty">${icon(this.source==='search'?'search':'book')}<h3>${this.source==='search'&&(!this.query.trim()||this.query.trim()!==this.searchQuery)?'搜索想放进书架的漫画':'没有可选漫画'}</h3></div>`;return;}
   const shown=items.slice(0,this.visible);el.innerHTML=`<div class="grid candidate-grid">${shown.map(b=>`<button class="bookcard candidate-card" data-edit="pick" data-word="${esc(b.path_word)}" aria-pressed="false">${cover(b)}<span class="pick-badge" aria-hidden="true"></span><h3>${esc(b.name)}</h3><p class="book-author">${esc((b.author||[]).map(a=>a.name).filter(Boolean).join(' / '))}</p></button>`).join('')}</div>${items.length>shown.length?`<button class="loadmore" data-edit="moreCandidates">再显示30本</button>`:this.source==='cloud'&&sources.cloud.length<sources.cloudTotal?`<button class="loadmore" data-edit="moreCloud" ${this.loading?'disabled':''}>${this.loading?'正在载入…':'再载入30本账号收藏'}</button>`:this.source==='search'&&this.offset<this.total?`<button class="loadmore" data-edit="moreSearch" ${this.loading?'disabled':''}>${this.loading?'正在搜索…':'加载更多结果'}</button>`:''}${this.error?`<p class="editor-error" role="alert">${esc(this.error)}</p>`:''}`;
   this.paintSelection();
  }
  paintSelection(){
   this.count();const selected=new Map(this.books.map((b,i)=>[b.path_word,i+1]));
   this.ctx.root.querySelectorAll('.candidate-card').forEach(node=>{const n=selected.get(node.dataset.word);node.classList.toggle('is-picked',!!n);node.setAttribute('aria-pressed',String(!!n));node.querySelector('.pick-badge').textContent=n||'';});
   const fill=this.ctx.root.querySelector('[data-edit="fill"]');if(fill){fill.textContent=this.books.length?'补满30本':'添加前30本';fill.disabled=this.books.length>=this.ctx.limit;}
  }
  updateRows(){
   const list=this.ctx.root.querySelector('.shelf-edit-rows');if(!list||!this.books.length){this.render();return;}
   list.innerHTML=this.rows();this.count();
  }
  remove(word){const index=this.books.findIndex(b=>b.path_word===word);if(index<0)return;this.books.splice(index,1);if(this.view==='selected')this.updateRows();else this.paintSelection();}
  pick(word){
   if(this.books.some(b=>b.path_word===word)){this.remove(word);return;}
   if(this.books.length>=this.ctx.limit){this.ctx.toast('最多30本，请先移出一本');return;}
   const b=this.candidates.get(word);if(b){this.books.push(b);this.paintSelection();}
  }
  fill(){
   const seen=new Set(this.books.map(b=>b.path_word));for(const b of this.sourceItems()){if(this.books.length>=this.ctx.limit)break;if(!seen.has(b.path_word)){seen.add(b.path_word);this.books.push(b);}}
   this.paintSelection();
  }
  move(word,to,animate=true){
   const from=this.books.findIndex(b=>b.path_word===word);to=clamp(Math.trunc(to),0,this.books.length-1);if(from<0||to===from)return;
   const list=this.ctx.root.querySelector('.shelf-edit-rows'),before=list?[...list.children]:[],node=before[from],height=this.drag?this.drag.height:node?.getBoundingClientRect().height||72;
   const [book]=this.books.splice(from,1);this.books.splice(to,0,book);
   if(list&&node){
    list.insertBefore(node,to>from?before[to].nextSibling:before[to]);
    [...list.children].forEach((row,i)=>{row.querySelector('.row-number').textContent=String(i+1).padStart(2,'0');if(animate&&row!==this.drag?.row){const delta=(before.indexOf(row)-i)*height;if(delta){row.style.transition='none';row.style.transform=`translateY(${delta}px)`;const frame=requestAnimationFrame(()=>{this.flips.delete(frame);if(row.isConnected){row.style.transition='';row.style.transform='';}});this.flips.add(frame);}}});
   }
   const status=this.ctx.root.querySelector('#shelf-edit-status');if(status)status.textContent=`已移动到第 ${to+1} 位`;
  }
  switchView(view){if(this.drag)return;this.scrolls[this.view]=window.scrollY;this.view=view==='add'?'add':'selected';this.render();window.scrollTo(0,this.scrolls[this.view]||0);}
  switchSource(source){
   this.source=['local','cloud','search'].includes(source)?source:'local';this.visible=this.ctx.limit;this.query='';this.results=[];this.offset=this.total=0;this.error='';this.loading=false;this.generation++;this.render();
   if(this.source==='cloud'&&this.ctx.sources().loggedIn&&!this.ctx.sources().cloud.length)this.moreCloud();
  }
  input(e){if(!this.active()||e.target.id!=='shelf-edit-query')return;this.query=e.target.value;this.visible=this.ctx.limit;if(this.source!=='search')this.paintCandidates();else{this.generation++;this.loading=false;this.results=[];this.offset=this.total=0;this.error='';this.paintCandidates();}}
  submit(e){if(!this.active()||e.target.id!=='shelf-search-form')return false;e.preventDefault();if(this.source==='search')this.search(true);return true;}
  async search(reset){
   const query=this.query.trim();if(!query||this.loading&&!reset)return;if(query!==this.searchQuery)reset=true;this.searchQuery=query;const generation=++this.generation;
   if(reset){this.visible=this.ctx.limit;this.results=[];this.offset=this.total=0;}else this.visible+=this.ctx.limit;this.loading=true;this.error='';this.paintCandidates();
   try{const data=(await this.ctx.request('search',{q:query,offset:this.offset})).results;if(!this.active()||this.generation!==generation||this.source!=='search')return;if(!Array.isArray(data?.list))throw Error('搜索结果格式不正确，请重试');const seen=new Set(this.results.map(b=>b.path_word));for(const item of data.list){const b=this.ctx.clean(item);if(b&&!seen.has(b.path_word)){seen.add(b.path_word);this.results.push(b);}}this.offset+=data.list.length;this.total=Math.max(this.offset,Number(data.total)||0);if(!data.list.length)this.total=this.offset;}
   catch(e){if(this.active()&&this.generation===generation)this.error=e.message;}
   finally{if(this.active()&&this.generation===generation){this.loading=false;this.paintCandidates();}}
  }
  async moreCloud(){
   if(this.loading)return;this.loading=true;this.error='';this.paintCandidates();
   try{await this.ctx.loadCloud();if(this.active())this.visible=Math.max(this.visible,this.ctx.sources().cloud.length);if(this.active()&&this.ctx.sources().cloudError)this.error=this.ctx.sources().cloudError;}
   catch(e){if(this.active())this.error=e.message;}
   finally{if(this.active()){this.loading=false;this.paintCandidates();}}
  }
  refresh(){if(this.active()){const sources=this.ctx.sources();if(this.view==='add'&&this.source==='cloud'&&sources.loggedIn&&!sources.cloudLoaded&&!sources.cloudLoading&&!this.loading){this.moreCloud();return;}this.paintCandidates();this.count();}}
  click(e){
   if(!this.active())return false;const button=e.target.closest('[data-edit]');if(!button||!this.ctx.root.contains(button))return false;e.preventDefault();if(button.disabled||this.drag)return true;
   const a=button.dataset.edit,word=button.dataset.word;
   if(a==='save')this.ctx.save(this.books);
   else if(a==='view')this.switchView(button.dataset.value);
   else if(a==='source')this.switchSource(button.dataset.value);
   else if(a==='pick')this.pick(word);
   else if(a==='remove')this.remove(word);
   else if(a==='fill')this.fill();
   else if(a==='login')this.ctx.login();
   else if(a==='moreCandidates'){this.visible+=this.ctx.limit;this.paintCandidates();}
   else if(a==='moreCloud')this.moreCloud();
   else if(a==='moreSearch')this.search(false);
   else if(a==='retry')this.source==='cloud'?this.moreCloud():this.search(true);
   else if(a==='clear')this.ctx.confirm('清空自选书架','清空本次草稿中的所有自选漫画？',()=>{if(this.active()){this.books=[];this.render();}},'清空');
   else if(a==='rowMenu'){
    const index=this.books.findIndex(b=>b.path_word===word),book=this.books[index];if(!book)return true;this.menuWord=word;
    this.ctx.modal(book.name,`<button class="account-menu-row" data-edit="moveUp" ${index===0?'disabled':''}>${this.ctx.icon('up')} 上移</button><button class="account-menu-row" data-edit="moveDown" ${index===this.books.length-1?'disabled':''}>${this.ctx.icon('down')} 下移</button>`);
   }
   return true;
  }
  menuClick(e){
   const button=e.target.closest('[data-edit="moveUp"],[data-edit="moveDown"]');if(!this.active()||!button)return false;e.preventDefault();if(!button.disabled){const word=this.menuWord,index=this.books.findIndex(b=>b.path_word===word);this.ctx.closeModal();this.move(word,index+(button.dataset.edit==='moveUp'?-1:1));}return true;
  }
  requestClose(next=this.ctx.cancel){
   if(this.drag){this.finishDrag(true);return;}
   if(this.dirty())this.ctx.confirm('放弃本次修改','自选书架的修改还没有保存。',()=>next(),'放弃修改');else next();
  }
  key(e){
   if(!this.active()||!['ArrowUp','ArrowDown'].includes(e.key))return;const handle=e.target.closest('[data-reorder]');if(!handle)return;e.preventDefault();const index=this.books.findIndex(b=>b.path_word===handle.dataset.reorder);this.move(handle.dataset.reorder,index+(e.key==='ArrowUp'?-1:1));
  }
  startDrag(e){
   if(!this.active()||!e.isPrimary||e.button!==0||this.drag)return;const handle=e.target.closest('[data-reorder]');if(!handle||!this.ctx.root.contains(handle))return;
   this.finishDrop();e.preventDefault();const row=handle.closest('.shelf-edit-row'),list=row.parentNode,rect=row.getBoundingClientRect(),ghost=row.cloneNode(true);for(const frame of this.flips)cancelAnimationFrame(frame);this.flips.clear();list.querySelectorAll('.shelf-edit-row').forEach(node=>{node.style.transition='none';node.style.transform='';});ghost.style.transform='';ghost.classList.add('shelf-drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});document.body.appendChild(ghost);row.classList.add('is-dragged');
   this.drag={id:e.pointerId,word:handle.dataset.reorder,row,list,ghost,before:this.books.slice(),startScroll:window.scrollY,y:e.clientY,offset:e.clientY-rect.top,top:list.getBoundingClientRect().top+window.scrollY,height:rect.height,frame:0,time:performance.now()};
   try{this.ctx.root.setPointerCapture(e.pointerId);}catch(error){}
   this.drag.frame=requestAnimationFrame(t=>this.dragFrame(t));
  }
  moveDrag(e){if(this.drag?.id!==e.pointerId)return;this.drag.y=e.clientY;if(e.cancelable)e.preventDefault();}
  dragFrame(now){
   const d=this.drag;if(!d||!this.active())return;const dt=Math.min(.035,(now-d.time)/1000);d.time=now;
   const top=114,bottom=innerHeight-46;let speed=0;if(d.y<top+48)speed=-clamp((top+48-d.y)/48,0,1)*650;else if(d.y>bottom-48)speed=clamp((d.y-bottom+48)/48,0,1)*650;
   if(speed)window.scrollBy(0,speed*dt);d.ghost.style.top=(d.y-d.offset)+'px';
   const index=clamp(Math.floor((d.y+window.scrollY-d.top)/d.height),0,this.books.length-1);this.move(d.word,index);
   d.frame=requestAnimationFrame(t=>this.dragFrame(t));
  }
  endDrag(e){if(this.drag?.id===e.pointerId)this.finishDrag(false);}
  cancelPointer(e){if(this.drag?.id===e.pointerId)this.finishDrag(true);}
  finishDrag(cancel){
   const d=this.drag;if(!d)return;cancelAnimationFrame(d.frame);this.drag=null;d.list.querySelectorAll('.shelf-edit-row').forEach(node=>node.style.transition='');
   if(cancel){for(const frame of this.flips)cancelAnimationFrame(frame);this.flips.clear();d.list.querySelectorAll('.shelf-edit-row').forEach(node=>{node.style.transition='none';node.style.transform='';});this.books=d.before;const nodes=new Map([...d.list.children].map(node=>[node.dataset.rowWord,node]));for(const b of this.books)d.list.appendChild(nodes.get(b.path_word));[...d.list.children].forEach((node,i)=>node.querySelector('.row-number').textContent=String(i+1).padStart(2,'0'));window.scrollTo(0,d.startScroll);}
   try{if(this.ctx.root.hasPointerCapture(d.id))this.ctx.root.releasePointerCapture(d.id);}catch(error){}
   const target=d.row.getBoundingClientRect(),delta=target.top-parseFloat(d.ghost.style.top),drop={row:d.row,ghost:d.ghost,animation:null};this.drop=drop;
   if(cancel||root.matchMedia('(prefers-reduced-motion: reduce)').matches||typeof d.ghost.animate!=='function'){this.finishDrop();return;}
   drop.animation=d.ghost.animate([{transform:'translateY(0)'},{transform:`translateY(${delta}px)`}],{duration:150,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});drop.animation.onfinish=()=>{if(this.drop===drop)this.finishDrop();};
  }
  finishDrop(){if(!this.drop)return;const d=this.drop;this.drop=null;d.animation?.cancel();d.ghost.remove();d.row.classList.remove('is-dragged');}
  destroy(){this.generation++;root.removeEventListener('resize',this.onResize);if(this.drag)this.finishDrag(true);this.finishDrop();for(const id of this.flips)cancelAnimationFrame(id);this.flips.clear();this.listeners.forEach(([name,fn,options])=>document.removeEventListener(name,fn,options));}
 }
 root.ShelfEditor=ShelfEditor;
})(window);

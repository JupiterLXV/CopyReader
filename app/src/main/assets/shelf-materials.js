'use strict';
// One light direction for the paper faces, inter-book occlusion and floor casts.
(function(root){
 const sprites=new Map(),contexts=new WeakMap();
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function outline(m){
  const x=m.face*.66,s=m.spine,t=m.top,h=m.body;
  return [[0,t],[x,4],[x+s,5.2],[x+s,5.2+h],[s,t+1.2+h],[0,t+h]];
 }
 function path(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
 function bookShadow(m,dark){
  const key=[m.face.toFixed(2),m.spine.toFixed(2),m.body.toFixed(2),dark].join(':');
  if(sprites.has(key))return sprites.get(key);
  const canvas=document.createElement('canvas'),ratio=2,pad=16;
  canvas.width=Math.ceil((m.front+pad*2)*ratio);canvas.height=Math.ceil((m.height+pad*2)*ratio);
  const ctx=canvas.getContext('2d');if(!ctx)return '';
  ctx.scale(ratio,ratio);ctx.translate(pad,pad);
  ctx.shadowColor=dark?'rgba(0,0,0,.58)':'rgba(45,40,29,.24)';
  ctx.shadowBlur=4.5*ratio;ctx.shadowOffsetX=-4*ratio;ctx.shadowOffsetY=6*ratio;
  ctx.fillStyle='#000';path(ctx,outline(m));ctx.fill();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=ctx.shadowOffsetY=0;
  ctx.globalCompositeOperation='destination-out';path(ctx,outline(m));ctx.fill();
  const data=canvas.toDataURL('image/png');if(sprites.size>=8)sprites.delete(sprites.keys().next().value);sprites.set(key,data);return data;
 }
 function project(m,pose){
  const lift=clamp(pose.lift||0,0,m.body),height=lift/m.body;
  const x=m.width/2+pose.x-lift*.045,y=pose.y+lift+m.top+m.body+lift*.025;
  const dx=m.face*.66,dy=-m.face*.30,s=m.spine;
  const ray=[-10-lift*.18,10+lift*.11];
  const footprint=[[x,y],[x+s,y+1.2],[x+s+dx,y+1.2+dy],[x+dx,y+dy]];
  return {lift,height,ray,footprint,polygon:[...footprint,[x+dx+ray[0],y+dy+ray[1]],[x+ray[0],y+ray[1]]],opacity:.17-height*.07};
 }
 function paintFloor(canvas,poses,m,dark){
  if(!canvas)return;let ctx=contexts.get(canvas);if(!ctx){ctx=canvas.getContext('2d');if(!ctx)return;contexts.set(canvas,ctx);}
  const ratio=Math.min(2,root.devicePixelRatio||1),width=Math.ceil(m.width*ratio),height=Math.ceil(m.stage*ratio);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,m.width,m.stage);
  for(const pose of poses){
   const cast=project(m,pose),p=cast.footprint,a=p[0],d=p[3],ray=cast.ray;
   const colour=dark?'0,0,0':'85,76,59';
   const shade=ctx.createLinearGradient(d[0],d[1],a[0]+ray[0],a[1]+ray[1]);
   const alpha=cast.opacity*(dark?1.8:1);
   shade.addColorStop(0,`rgba(${colour},${alpha})`);shade.addColorStop(.48,`rgba(${colour},${alpha*.58})`);shade.addColorStop(1,`rgba(${colour},0)`);
   path(ctx,cast.polygon);ctx.fillStyle=shade;ctx.fill();
   // Contact darkens the footprint only while the volume is near its support.
   const contact=(1-clamp(cast.lift/(m.body*.38),0,1))*(dark ? .28 : .14);
   if(contact>0){ctx.strokeStyle=`rgba(${colour},${contact})`;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(a[0]-1,a[1]+.6);ctx.lineTo(p[1][0],p[1][1]+.6);ctx.lineTo(p[2][0],p[2][1]+.6);ctx.stroke();}
  }
  if(canvas.dataset.shadowCount!==String(poses.length))canvas.dataset.shadowCount=poses.length;
 }
 function defs(){return `<svg class="paper-material-defs" width="0" height="0" aria-hidden="true"><defs><linearGradient id="paper-spine-light"><stop offset="0" class="paper-stop-dark"/><stop offset=".23" class="paper-stop-light"/><stop offset=".78" stop-color="transparent"/><stop offset="1" class="paper-stop-seam"/></linearGradient><linearGradient id="paper-face-light"><stop offset="0" class="paper-stop-seam"/><stop offset=".12" stop-color="transparent"/><stop offset=".83" stop-color="transparent"/><stop offset="1" class="paper-stop-glint"/></linearGradient></defs></svg>`;}
 const api=Object.freeze({outline,project,bookShadow,paintFloor,defs});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.ShelfMaterials=api;
})(typeof window==='object'?window:globalThis);

'use strict';
// CopyReader's WebView implementation of the supplied motion specification.
// Reference: mikufoxxx/Wenku8_Flutter, ebcd7f1. No Flutter source is bundled.
(function(root){
 const curves=Object.freeze({enter:'cubic-bezier(.215,.61,.355,1)',exit:'cubic-bezier(.55,.055,.675,.19)',plane:'cubic-bezier(.18,.72,.18,1)',settle:'cubic-bezier(.2,1.08,.34,1)'});
 const timing=Object.freeze({quick:{enter:340,exit:260,reader:260,sheet:340},standard:{enter:420,exit:320,reader:320,sheet:420},calm:{enter:520,exit:380,reader:380,sheet:520}});
 function interval(role,index=0){if(role==='code')return [.16,.88];if(role==='rule')return [0,.46];if(role==='feature')return [.18,.84];const start=Math.min(.14+Math.min(Math.max(0,index),8)*.055,.6);return [start,start+.4];}
 function part(axis='horizontal',travel=[0,0]){return [{clipPath:axis==='vertical'?'inset(0 0 100% 0)':'inset(0 100% 0 0)',transform:`translate(${travel[0]}px,${travel[1]}px)`},{clipPath:'inset(0 0 0 0)',transform:'translate(0px,0px)'}];}
 function plane(width,direction=1,viewport){const slant=Math.min(180,Math.max(0,width)*.46),right=direction<0;
  if(viewport){const top=Math.max(0,viewport.top),bottom=top+Math.max(1,viewport.height),left=right?width:0,edge=right?-slant:width+slant,tip=right?width+slant:-slant;
   return [{clipPath:`polygon(${left}px ${top}px,${left}px ${top}px,${tip}px ${bottom}px,${left}px ${bottom}px)`,transform:`translate(${-24*direction}px,12px)`},{clipPath:`polygon(${left}px ${top}px,${edge}px ${top}px,${right?0:width}px ${bottom}px,${left}px ${bottom}px)`,transform:'translate(0px,0px)'}];}
  return [{clipPath:right?`polygon(100% 0,100% 0,calc(100% + ${slant}px) 100%,100% 100%)`:`polygon(0 0,0 0,-${slant}px 100%,0 100%)`,transform:`translate(${-24*direction}px,12px)`},{clipPath:right?`polygon(100% 0,-${slant}px 0,0 100%,100% 100%)`:`polygon(0 0,calc(100% + ${slant}px) 0,100% 100%,0 100%)`,transform:'translate(0px,0px)'}];
 }
 const api=Object.freeze({curves,timing,interval,part,plane});if(typeof module==='object'&&module.exports)module.exports=api;else root.ArchiveMotion=api;
})(typeof window==='object'?window:globalThis);

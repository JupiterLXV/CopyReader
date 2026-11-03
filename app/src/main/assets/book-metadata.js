'use strict';
(function(root){
 function status(raw){
  const text=String(typeof raw==='string'?raw:raw?.display||'').trim().slice(0,40);
  if(!text)return null;
  const completed=/^(已?完[结結]|已完成|完結済み|completed|finished)$/i.test(text);
  const display=completed?'已完结':/^(連載中|连载中|ongoing)$/i.test(text)?'连载中':text;
  return {display,completed};
 }
 function caption(book,history){
  const s=status(book.status),authors=(book.author||[]).map(a=>a.name).filter(Boolean).join(' / ');
  if(s?.completed)return authors?authors+' · 已完结':'已完结';
  if(authors)return [authors,s?.display].filter(Boolean).join(' · ');
  if(s?.display&&s.display!=='连载中')return s.display;
  if(history)return [s?.display,`上次读到 ${history.chapterName}`].filter(Boolean).join(' · ');
  const date=/^\d{4}-\d{2}-\d{2}/.test(book.datetime_updated||'')?book.datetime_updated.slice(5,10).replace('-','月')+'日':'';
  return s?.display?[s.display,date?date+'更新':''].filter(Boolean).join(' · '):date?'更新于 '+date:'';
 }
 const api=Object.freeze({status,caption});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BookMetadata=api;
})(typeof window==='object'?window:globalThis);

import { loadSeekableVideo } from './seekable-media.js';
// P11/P12: preserve the approved folder animation, with runtime alpha detection.
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const launch=document.querySelector('.folder-launch'),art=launch.querySelector('.folder-art');
const video=art.querySelector('video'),canvas=art.querySelector('canvas'),dialog=document.querySelector('#project-library');
const slot=dialog.querySelector('.library-folder-slot'),collections=dialog.querySelector('.library-collections'),detail=dialog.querySelector('.library-detail');
const context=canvas.getContext('2d',{willReadFrequently:true});
const fallback=document.querySelector('.project-fallback');
dialog.querySelector('.library-data-projects').append(...fallback.children);
dialog.querySelectorAll('.library-data-projects h3').forEach(heading=>{const replacement=document.createElement('h4');replacement.textContent=heading.textContent;heading.replaceWith(replacement);});
fallback.remove();launch.hidden=false;document.body.classList.add('folder-ready');
let renderer='poster',frameCount=0,frameId=null,intersection=false,wantsPlay=false,opening=false,closing=false,lastCategory='data',savedY=0;
let cardAnimations=[];
const collectionTitles={data:'Data Analytics',web:'Web Applications',game:'Interactive Games'};
const diagnostics=new URLSearchParams(location.search).has('diagnostics');
const telemetry=diagnostics?document.body.appendChild(Object.assign(document.createElement('output'),{id:'folder-diagnostics',hidden:true})):null;
function report(){
 art.dataset.renderer=renderer;
 if(telemetry)telemetry.textContent=JSON.stringify({renderer,frameCount,playing:!video.paused,open:dialog.open,closing,view:detail.hidden?'collections':lastCategory,collections:Object.keys(collectionTitles),scrollY,savedY,focus:document.activeElement?.className,mediaTime:video.currentTime,reduced:reduce.matches});
}
function stopFrame(){if(frameId!==null){if(video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameId);else cancelAnimationFrame(frameId);frameId=null;}}
function draw(){
 frameId=null;
 if(!wantsPlay||video.paused||renderer!=='canvas')return;
 try{
  context.drawImage(video,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  for(let i=0;i<data.length;i+=4){const warm=Math.max(data[i],data[i+1]);data[i+3]=Math.round(255*(1-Math.min(1,Math.max(0,(data[i+2]-warm-8)/48))));data[i+2]=Math.min(data[i+2],warm);}
  context.putImageData(pixels,0,0);frameCount++;art.dataset.ready='true';
 }catch{usePoster();return;}
 report();scheduleFrame();
}
function scheduleFrame(){if(frameId!==null||renderer!=='canvas'||!wantsPlay||video.paused)return;frameId=video.requestVideoFrameCallback?video.requestVideoFrameCallback(draw):requestAnimationFrame(draw);}
function usePoster(){renderer='poster';video.pause();stopFrame();art.dataset.ready='false';report();}
function loadFolderSource(path){loadSeekableVideo(video,path).catch(()=>video.dispatchEvent(new Event('error')));}
function useCanvas(){
 stopFrame();renderer='loading-canvas';art.dataset.ready='false';loadFolderSource('assets/folder-blue-loop.mp4');report();
}
video.addEventListener('loadeddata',()=>{
 if(renderer==='loading-webm'){
  try{
   const probe=document.createElement('canvas');probe.width=probe.height=2;const ctx=probe.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,2,2,0,0,2,2);
   if(ctx.getImageData(0,0,1,1).data[3]>20){useCanvas();return;}
   renderer='webm';art.dataset.ready='true';
  }catch{useCanvas();return;}
 }else if(renderer==='loading-canvas')renderer='canvas';
 sync();
});
video.addEventListener('error',()=>{if(renderer==='loading-webm'||renderer==='webm')useCanvas();else usePoster();});
video.addEventListener('play',scheduleFrame);
video.addEventListener('timeupdate',()=>{if(opening&&video.currentTime>=1.45){opening=false;video.pause();stopFrame();}report();});
function sync(){
 const workVisible=document.body.classList.contains('static-mode')?intersection:document.body.dataset.scene==='work';
 wantsPlay=!reduce.matches&&!document.hidden&&(dialog.open||workVisible);
 video.playbackRate=opening?1.4:1;
 if(wantsPlay&&(renderer==='webm'||renderer==='canvas')){
  if(dialog.open&&!opening){video.pause();stopFrame();}
  else video.play().then(scheduleFrame).catch(()=>{art.dataset.ready='false';report();});
 }else{video.pause();stopFrame();}
 if(reduce.matches)art.dataset.ready='false';
 report();
}
new IntersectionObserver(entries=>{intersection=entries[0].isIntersecting;sync();},{threshold:.05}).observe(launch);
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class','data-scene']});
document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',()=>{
 if(!reduce.matches&&renderer==='poster'){renderer='loading-webm';loadFolderSource('assets/folder-loop.webm');}
 else if(!reduce.matches&&video.readyState>=2&&(renderer==='webm'||renderer==='canvas'))art.dataset.ready='true';
 sync();
});
function fly(from,exiting=false){
 art.getAnimations().forEach(animation=>animation.cancel());
 if(reduce.matches)return;
 const visual=dialog.open?slot.querySelector('.folder-front'):art;
 visual.getAnimations().forEach(animation=>animation.cancel());
 const to=visual.getBoundingClientRect();if(!from.width||!to.width)return;
 const dx=from.left+from.width/2-to.left-to.width/2,dy=from.top+from.height/2-to.top-to.height/2;
 const scale=Math.min(from.width/to.width,from.height/to.height);
 visual.animate([{transformOrigin:'50% 50%',transform:`translate(${dx}px,${dy}px) scale(${scale})`},{transformOrigin:'50% 50%',transform:'none'}],{duration:exiting?300:520,easing:'cubic-bezier(.16,1,.3,1)'});
}
function spreadCards(){
 cardAnimations.forEach(animation=>animation.cancel());cardAnimations=[];
 if(reduce.matches)return;
 const origin=slot.getBoundingClientRect();
 for(const [index,card] of [...dialog.querySelectorAll('[data-collection]')].entries()){
  const target=card.getBoundingClientRect(),rest=getComputedStyle(card).transform;
  const dx=origin.left+origin.width/2-(target.left+target.width/2),dy=origin.top+origin.height*.3-(target.top+target.height/2);
  const animation=card.animate([{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.38) rotate(0deg)`},{opacity:1,transform:rest}],{duration:440,delay:180+index*40,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
  cardAnimations.push(animation);animation.finished.then(()=>animation.cancel()).catch(()=>{});
  for(const copy of card.querySelectorAll('.collection-name,.collection-summary,.collection-projects')){
   const reveal=copy.animate([{opacity:0},{opacity:1}],{duration:160,delay:420+index*40,easing:'ease-out',fill:'both'});
   cardAnimations.push(reveal);reveal.finished.then(()=>reveal.cancel()).catch(()=>{});
  }
 }
}
async function foldCards(){
 const poses=[...dialog.querySelectorAll('[data-collection]')].map(card=>({card,pose:getComputedStyle(card).transform,opacity:getComputedStyle(card).opacity}));
 cardAnimations.forEach(animation=>animation.cancel());cardAnimations=[];
 if(reduce.matches||collections.hidden)return;
 const origin=slot.getBoundingClientRect();
 for(const {card,pose,opacity} of poses){
  const rect=card.getBoundingClientRect(),dx=origin.left+origin.width/2-(rect.left+rect.width/2),dy=origin.top+origin.height*.3-(rect.top+rect.height/2);
  cardAnimations.push(card.animate([{opacity,transform:pose},{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.3) rotate(0deg)`}],{duration:170,easing:'ease-in',fill:'forwards'}));
 }
 await Promise.allSettled(cardAnimations.map(animation=>animation.finished));
}
function navigationLabel(){
 const button=dialog.querySelector('.library-close'),inDetail=!detail.hidden;
 button.setAttribute('aria-label',inDetail?'Back to collections':'Close folder');
 button.querySelector('span').textContent=inDetail?'Back':'Close folder';
 button.querySelector('path').setAttribute('d',inDetail?'m14 6-6 6 6 6M8 12h12':'m6 6 12 12M6 18 18 6');
}
function showCollections(){
 dialog.dataset.view='collections';detail.hidden=true;collections.hidden=false;
 if(dialog.open)dialog.scrollTop=0;
 dialog.querySelectorAll('[data-collection]').forEach(button=>button.removeAttribute('aria-expanded'));navigationLabel();report();
}
function returnToCollections(){
 clearProjectLink();
 showCollections();dialog.querySelector(`[data-collection="${lastCategory}"]`).focus({preventScroll:true});
}
function clearProjectLink(){const url=new URL(location.href);if(url.searchParams.has('project')){url.searchParams.delete('project');history.replaceState(null,'',url);}}
function navigateBack(){
 if(!detail.hidden)returnToCollections();else close();
}
function open(){
 if(dialog.open||closing)return;
 const from=art.getBoundingClientRect();savedY=scrollY;showCollections();
 document.documentElement.classList.add('projects-open');dialog.showModal();slot.append(art);dialog.scrollTop=0;launch.setAttribute('aria-expanded','true');
 fly(from);spreadCards();dialog.querySelector('.library-close').focus({preventScroll:true});
 opening=false; // The open stage exposes the real front-cover still, not a second video.
 video.pause();stopFrame();
 sync();
}
async function close(){
 if(!dialog.open||closing)return;closing=true;opening=false;
 clearProjectLink();
 dialog.dataset.closing='true';report();
 if(collections.hidden){
  if(!reduce.matches){const fade=detail.animate([{opacity:1},{opacity:0}],{duration:140});await fade.finished.catch(()=>{});fade.cancel();}
  showCollections();
 }else await foldCards();
 const from=slot.getBoundingClientRect();dialog.close();document.documentElement.classList.remove('projects-open');launch.prepend(art);launch.setAttribute('aria-expanded','false');
 cardAnimations.forEach(animation=>animation.cancel());cardAnimations=[];
 window.scrollTo({top:savedY,behavior:'instant'});fly(from,true);launch.focus({preventScroll:true});
 closing=false;delete dialog.dataset.closing;sync();
}
launch.addEventListener('click',open);
dialog.querySelector('.library-close').addEventListener('click',navigateBack);
dialog.addEventListener('click',event=>{if(event.target.closest('.return-portfolio'))returnToCollections();});
dialog.addEventListener('cancel',event=>{event.preventDefault();navigateBack();});
document.addEventListener('keydown',event=>{
 if(!dialog.open||event.key!=='Tab')return;
 const buttons=[...dialog.querySelectorAll('button:not([disabled]),a[href]')].filter(element=>element.getClientRects().length);
 const first=buttons[0],last=buttons.at(-1),focused=document.activeElement;
 if(!dialog.contains(focused)||event.shiftKey&&focused===first||!event.shiftKey&&focused===last){event.preventDefault();(event.shiftKey?last:first)?.focus({preventScroll:true});}
});
dialog.addEventListener('click',event=>{
 if(!event.target.closest('.collection-card,.library-folder-slot,.library-detail,.library-close,.library-header'))close();
});
dialog.querySelectorAll('[data-collection]').forEach(button=>button.addEventListener('click',()=>{
 lastCategory=button.dataset.collection;dialog.dataset.view='detail';collections.hidden=true;detail.hidden=false;
 dialog.querySelectorAll('[data-projects]').forEach(list=>{list.hidden=list.dataset.projects!==lastCategory;});
 const heading=dialog.querySelector('.collection-detail-title');heading.textContent=collectionTitles[lastCategory];heading.focus({preventScroll:true});dialog.scrollTop=0;report();
 navigationLabel();
}));
dialog.querySelector('.library-back').addEventListener('click',returnToCollections);
document.addEventListener('cms:updated',()=>{
 for(const [key]of Object.entries(collectionTitles))collectionTitles[key]=dialog.querySelector(`[data-collection="${key}"] .collection-label`)?.textContent||collectionTitles[key];
 if(!detail.hidden)dialog.querySelector('.collection-detail-title').textContent=collectionTitles[lastCategory];
});
if(reduce.matches)usePoster();else{renderer='loading-webm';loadFolderSource('assets/folder-loop.webm');}
if(telemetry)setInterval(report,250);

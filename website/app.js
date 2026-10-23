import { PointerGlow } from './pointer-glow.js';
import { TouchGaze } from './touch-gaze.js';
import './project-folder.js';
import { Biography, biographyTime } from './biography.js';
import { bufferedMediaNeeded, loadSeekableVideo } from './seekable-media.js';
history.scrollRestoration='manual';
const hero=document.querySelector('#hero-video'),main=document.querySelector('#main-video'),story=document.querySelector('#story'),home=document.querySelector('#home');
const chapters=[...document.querySelectorAll('.chapter')],poster=document.querySelector('.scene-poster'),status=document.querySelector('.media-status'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
const gazeLabel=document.querySelector('#gaze-direction'),gazeHelper=document.querySelector('#gaze-helper'),stageLabel=document.querySelector('[data-stage-label]'),stageHint=document.querySelector('[data-stage-hint]');
const clamp=(x,lo=0,hi=1)=>Math.min(hi,Math.max(lo,x)),ease=x=>x*x*(3-2*x),TAU=Math.PI*2,EXIT=96,REENTER=24;
// Measured 1063 poses: concentrate reading in the presenting hold; total remains 600vh.
export const segments=[[0,2.2,50],[2.2,3.8,320],[3.8,6.1,40],[6.1,8.9,95],[8.9,11.5,40],[11.5,15,55]];
export const chapterTimes={home:0,about:2.36,work:7.5,contact:15};
export function storyScene(time){
 if(time>=2.2&&time<=3.8)return'about';
 if(time>=6.1&&time<=8.9)return'work';
 if(time>=11.5)return'contact';
 return'none';
}
export function scrollToTime(p){let vh=clamp(p)*600;for(const[a,b,budget]of segments){if(vh<=budget)return a+(b-a)*vh/budget;vh-=budget;}return 15;}
export function timeToScroll(t){let vh=0;for(const[a,b,budget]of segments){if(t<=b)return(vh+clamp((t-a)/(b-a))*budget)/600;vh+=budget;}return 1;}
// Measured poses in the approved 3171 film. Extra knots compress stationary
// holds, while retaining its pout / ah / laugh / gritted-teeth expressions.
// The right seam seeks directly between matching right poses; never scrub
// through the return-to-front footage or the opening .50–.63s blink.
export const gazeKnots=[[0,2],[6,2.625],[45,3.25],[80,3.916667],
 [90,4.25],[100,4.791667],[135,5.383333],[165,5.958333],
 [180,6.75],[184,7.75],[190,8.25],[225,8.5],[260,8.958333],
 [270,9.5],[279,10.333333],[315,11.25],[345,12.166667],[360,13]];
export function angleToTime(angle,duration=15.041667){
 const degrees=(((angle%TAU)+TAU)%TAU)*180/Math.PI;
 for(let i=1;i<gazeKnots.length;i++){
  const [a,t0]=gazeKnots[i-1],[b,t1]=gazeKnots[i];
  if(degrees<=b)return Math.min(t0+(t1-t0)*(degrees-a)/(b-a),duration-.045);
 }
 return 2;
}
let mode='hero',presentation='none',failed=false,active='',blend=0,smoothTime=0,maxScroll=1,progress=0,lastTick=0,neutralAt=0,pendingFocus='',loadTimer,copyJump=false;
let mediaPrepared=!bufferedMediaNeeded,preparingMedia=false;
let pointerAngle=null,shownAngle=null,face={x:0,y:0},pointerTarget=0,lastInput=null,inputSerial=0;
let lastGazeCopy='',lastStageCopy='';
const gazeDirections=['RIGHT','UP RIGHT','UP','UP LEFT','LEFT','DOWN LEFT','DOWN','DOWN RIGHT'];
function updateFrameCopy(){
 const gaze=shownAngle===null?'LOOKING FORWARD':'LOOKING '+gazeDirections[((Math.round(shownAngle/(Math.PI/4))%8)+8)%8];
 if(gaze!==lastGazeCopy){gazeLabel.textContent=gaze;lastGazeCopy=gaze;}
 const atHome=mode==='hero'||mode==='neutralizing',key=atHome?'home':active;
 if(key===lastStageCopy)return;lastStageCopy=key;
 stageLabel.textContent=({home:'Home / Intro',about:'About / Background',work:'Work / Projects',contact:'Contact / Say hello'})[key]||'Between chapters';
 stageHint.textContent=key==='home'?'Pointer interaction':key==='contact'?'Let’s connect':'Scroll to continue';
}
const metrics={hero:[],main:[],coalesced:0},diagnostic=new URLSearchParams(location.search).has('diagnostics');
const telemetry=diagnostic?document.body.appendChild(Object.assign(document.createElement('output'),{id:'motion-diagnostics',hidden:true})):null;
class SeekQueue{
 constructor(video,name){
  this.video=video;this.name=name;this.desired=0;this.pending=false;this.presented=NaN;this.count=0;this.lastSeek=-Infinity;
  this.seekCost=16.7;this.frameStep=1/24;this.issuedFrame=null;
  const onFrame=(now,meta)=>{this.presented=meta.mediaTime;
   if(lastInput?.name===name&&this.issuedSerial===lastInput.serial&&lastInput.serial!==this.measured&&meta.presentationTime>=this.lastSeek&&Math.abs(meta.mediaTime-lastInput.target)<.075){
    this.measured=lastInput.serial;metrics[name].push({ms:performance.now()-lastInput.at,target:lastInput.target,presented:meta.mediaTime});if(metrics[name].length>250)metrics[name].shift();
   }video.requestVideoFrameCallback(onFrame);
  };
  if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(onFrame);
  video.addEventListener('seeked',()=>{
   if(this.pending&&Number.isFinite(this.lastSeek))this.seekCost=this.seekCost*.75+Math.min(120,performance.now()-this.lastSeek)*.25;
   this.pending=false;if(!video.requestVideoFrameCallback)this.presented=video.currentTime;
  });
  video.addEventListener('error',()=>{this.pending=false;});
  video.addEventListener('emptied',()=>{this.pending=false;this.presented=NaN;this.lastSeek=-Infinity;this.issuedSerial=null;this.issuedFrame=null;this.seekCost=16.7;});
 }
 update(time,now=performance.now()){
  this.desired=clamp(time,0,Math.max(0,(this.video.duration||0)-.045));
  if(this.pending||this.video.seeking||this.video.readyState<2){if(this.pending)metrics.coalesced++;return;}
  let destination=this.desired;
  if(this.name==='main'){
   // The approved film is 24fps. Request each required source frame once,
   // rather than chasing fractional times or buffering stale wheel targets.
   const frame=Math.round(this.desired/this.frameStep);
   const currentFrame=Math.round(this.video.currentTime/this.frameStep);
   if(frame===currentFrame||now-this.lastSeek<clamp(this.seekCost*.45,8,24))return;
   destination=clamp(frame*this.frameStep+.000001,0,Math.max(0,(this.video.duration||0)-.045));
   this.issuedFrame=frame;
  }else if(now-this.lastSeek<32||Math.abs(this.video.currentTime-this.desired)<.025)return;
  this.lastSeek=now;this.issuedSerial=lastInput?.name===this.name?lastInput.serial:null;this.pending=true;this.count++;this.video.currentTime=destination;
 }
 at(time){return!this.video.seeking&&Math.abs((Number.isFinite(this.presented)?this.presented:this.video.currentTime)-time)<.075;}
}
const heroSeek=new SeekQueue(hero,'hero'),mainSeek=new SeekQueue(main,'main');
const biography=new Biography(document.querySelector('#about'));
const glow=new PointerGlow(()=>!reduce.matches);
function input(name,target){lastInput={name,target,at:performance.now(),serial:++inputSerial};}
function setScene(scene){
 if(active===scene)return;active=scene;document.body.dataset.scene=scene;
 for(const chapter of chapters){const shown=chapter.dataset.scene===scene;chapter.classList.toggle('active',shown);chapter.inert=!shown;chapter.setAttribute('aria-hidden',String(!shown));}
 for(const link of document.querySelectorAll('nav a')){if(link.hash.slice(1)===scene)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
 if(pendingFocus===scene){pendingFocus='';requestAnimationFrame(()=>{const h=document.querySelector('#'+scene+'-title');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}});}
}
function setStatic(reason=''){
 touchGaze?.reset();delete document.body.dataset.touchGaze;
 biography.showAll();
 presentation='static';document.body.classList.remove('motion-mode');document.body.classList.add('static-mode');home.inert=false;
 for(const chapter of chapters){chapter.inert=false;chapter.removeAttribute('aria-hidden');}
 status.hidden=!reason;status.querySelector('span').textContent=reason;status.querySelector('button').hidden=!failed;hero.pause();main.pause();
 gazeLabel.textContent='SCROLL TO EXPLORE';gazeHelper.textContent='Take a look around.';
}
function dimensions(){
 if(presentation==='motion')story.style.height=innerWidth<=820?'700vh':'600vh';
 maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight);
 const rect=hero.getBoundingClientRect(),scale=innerWidth>820?Math.max(rect.width/1280,rect.height/720):rect.width/1280;
 face={x:rect.left+rect.width/2,y:rect.top+rect.height/2+(720*.32-360)*scale};
}
function startMotion(){
 if(reduce.matches||failed||!mediaPrepared||hero.readyState<2||presentation==='motion')return;
 presentation='motion';document.body.classList.remove('static-mode');document.body.classList.add('motion-mode');
 mode='hero';blend=0;smoothTime=0;pointerAngle=shownAngle=null;pointerTarget=0;
 lastGazeCopy=lastStageCopy='';updateTouchHint();
 heroSeek.update(0);mainSeek.update(0);status.hidden=true;active='__reset';setScene('none');dimensions();
 const entry=location.hash.slice(1),time=chapterTimes[entry];copyJump=entry==='about';
 if(time!==undefined)window.scrollTo({top:entry==='home'?0:EXIT+timeToScroll(time)*(maxScroll-EXIT),behavior:'instant'});
}
async function prepareMedia(){
 if(preparingMedia||mediaPrepared||reduce.matches)return;
 preparingMedia=true;status.hidden=false;status.querySelector('span').textContent='Loading the character animation…';
 for(const video of [hero,main]){video.pause();video.preload='none';video.load();}
 try{
  await Promise.all([hero,main].map(video=>loadSeekableVideo(video,video.querySelector('source').src)));
  mediaPrepared=true;preparingMedia=false;checkReady();
 }catch{preparingMedia=false;mediaFailure();}
}
function checkReady(){if(!mediaPrepared){prepareMedia();return;}hero.pause();main.pause();if(hero.readyState>=2){if(main.readyState>=2)clearTimeout(loadTimer);startMotion();}}
function mediaFailure(){if(preparingMedia&&!mediaPrepared)return;failed=true;clearTimeout(loadTimer);setStatic('The video could not load. You can still explore the portfolio.');}
for(const video of[hero,main]){video.muted=true;video.addEventListener('loadeddata',checkReady);video.addEventListener('error',mediaFailure);video.querySelector('source')?.addEventListener('error',mediaFailure);}
status.querySelector('button').addEventListener('click',()=>{failed=false;lastInput=null;metrics.hero.length=metrics.main.length=0;status.querySelector('button').hidden=true;status.querySelector('span').textContent='Loading the character animation…';if(!mediaPrepared)prepareMedia();else{hero.load();main.load();}armLoadTimer();});
function armLoadTimer(){clearTimeout(loadTimer);loadTimer=setTimeout(()=>{if((!mediaPrepared||hero.readyState<2||main.readyState<2)&&!reduce.matches){failed=true;setStatic('Taking a little longer. Explore the still version, or retry the animation.');}},15000);}
function resetPointer(){pointerAngle=shownAngle=null;pointerTarget=0;}
function lookAt(x,y,deadZone=48){
 const dx=x-face.x,dy=y-face.y;
 if(Math.hypot(dx,dy)<deadZone){resetPointer();input('hero',0);return;}
 pointerAngle=Math.atan2(-dy,dx);if(shownAngle===null)shownAngle=pointerAngle;input('hero',angleToTime(pointerAngle,hero.duration));
}
const touchPointer=matchMedia('(any-pointer: coarse)');
let touchGaze=new TouchGaze(document,window,{
 canStart:()=>presentation==='motion'&&mode==='hero'&&scrollY<=REENTER&&!reduce.matches&&!document.querySelector('dialog[open]'),
 contains:(x,y)=>{const r=hero.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;},
 onLook:(x,y)=>lookAt(x,y,Math.min(30,hero.getBoundingClientRect().width*.035)),
 onReset:resetPointer
});
function updateTouchHint(){
 const touch=presentation==='motion'&&touchPointer.matches&&!reduce.matches;
 if(touch)document.body.dataset.touchGaze='ready';else{delete document.body.dataset.touchGaze;touchGaze.reset();}
 gazeHelper.textContent=touch?'Tap the portrait. I’ll look.':'Move your cursor. I’ll follow.';
}
touchPointer.addEventListener('change',updateTouchHint);
document.addEventListener('pointermove',event=>{
 if(presentation!=='motion'||mode!=='hero'||event.pointerType==='touch')return;
 touchGaze.reset();lookAt(event.clientX,event.clientY);
},{passive:true});
document.documentElement.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')resetPointer();});window.addEventListener('blur',resetPointer);
window.addEventListener('resize',dimensions,{passive:true});
window.addEventListener('scroll',()=>{if(presentation==='motion'&&scrollY>EXIT)input('main',scrollToTime(clamp((scrollY-EXIT)/(maxScroll-EXIT))));},{passive:true});
document.addEventListener('biography:jump',event=>{
 if(presentation!=='motion')return;
 dimensions();copyJump=true;history.replaceState(null,'','#about');
 window.scrollTo({top:EXIT+timeToScroll(biographyTime(event.detail.index))*(maxScroll-EXIT),behavior:'instant'});
});
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href^="#"]');if(!link||presentation!=='motion')return;
 const id=link.hash.slice(1),times=chapterTimes;if(!(id in times))return;
 event.preventDefault();dimensions();copyJump=id==='about';history.replaceState(null,'','#'+id);pendingFocus=id==='home'?'':id;
 window.scrollTo({top:id==='home'?0:EXIT+timeToScroll(times[id])*(maxScroll-EXIT),behavior:'instant'});
 if(id==='home'){home.inert=false;const h=home.querySelector('h1');h.tabIndex=-1;h.focus({preventScroll:true});}
});
let previousBlend=-1,previousCopy=-1,previousProgress=-1,lastTelemetry=0;
function tick(timestamp){
 const dt=Math.min(50,timestamp-(lastTick||timestamp));lastTick=timestamp;
 if(presentation==='motion'){
  progress=clamp((scrollY-EXIT)/(maxScroll-EXIT));
  if(Math.abs(progress-previousProgress)>.0001){document.documentElement.style.setProperty('--progress',progress);previousProgress=progress;}
  const atTop=scrollY<=REENTER;
  if(scrollY>EXIT&&mode==='hero'){mode='neutralizing';neutralAt=timestamp;resetPointer();}
  if(atTop&&mode==='neutralizing')mode='hero';
  if(mode==='hero'){
   if(pointerAngle!==null){const diff=Math.atan2(Math.sin(pointerAngle-shownAngle),Math.cos(pointerAngle-shownAngle));shownAngle+=diff*(1-Math.exp(-dt/28));pointerTarget=angleToTime(shownAngle,hero.duration);}
   heroSeek.update(pointerTarget,timestamp);mainSeek.update(0,timestamp);blend=0;smoothTime=0;
  }else if(mode==='neutralizing'){
   heroSeek.update(0,timestamp);mainSeek.update(0,timestamp);
   if(heroSeek.at(0)&&main.readyState>=2&&mainSeek.at(0)&&timestamp-neutralAt>80)mode='story';
  }else{
   if(atTop)mode='returning';else if(mode==='returning')mode='story';heroSeek.update(0,timestamp);
   if(mode==='story'){
    blend=Math.min(1,blend+dt/160);
    // Native scroll already supplies continuous progress. Keep only the newest
    // target, especially on a fling, navigation jump or immediate reversal.
    if(blend>=1)smoothTime=Math.min(scrollToTime(progress),main.duration-.045);
   }else{
    smoothTime=0;if(mainSeek.at(0)&&heroSeek.at(0))blend=Math.max(0,blend-dt/160);if(blend===0){mode='hero';resetPointer();}
   }mainSeek.update(smoothTime,timestamp);
  }
  if(blend!==previousBlend){main.style.opacity=blend;hero.style.opacity=1-blend;previousBlend=blend;}
  const time=Number.isFinite(mainSeek.presented)?mainSeek.presented:main.currentTime;
  const scene=blend>.95&&(mode==='story'||mode==='returning')?storyScene(time):'none';setScene(scene);
  // Real media frames gate scene entry/exit. Inside the stable presenting pose,
  // the text rail has its own display-rate clock with a bounded media lead.
  biography.update(time,scene==='about',smoothTime,dt,copyJump);
  if(copyJump&&mainSeek.at(smoothTime))copyJump=false;
  updateFrameCopy();
  const heroCopy=1-ease(clamp((scrollY-EXIT)/220));
  if(Math.abs(heroCopy-previousCopy)>.001){document.documentElement.style.setProperty('--hero-copy',heroCopy);previousCopy=heroCopy;}
  home.inert=heroCopy<.05;poster.style.opacity='0';
  if(telemetry&&timestamp-lastTelemetry>100){lastTelemetry=timestamp;telemetry.textContent=JSON.stringify({mode,presentation,active,progress,blend,scrollY,maxScroll,face,heroTarget:heroSeek.desired,heroPresented:heroSeek.presented,mainTarget:mainSeek.desired,mainPresented:mainSeek.presented,seeks:{hero:heroSeek.count,main:mainSeek.count},metrics});}
 }requestAnimationFrame(tick);
}
Object.defineProperty(window,'portfolioState',{get:()=>({mode,presentation,ready:hero.readyState>=2,failed,active,progress,blend,heroTime:hero.currentTime,heroTarget:heroSeek.desired,mainTime:main.currentTime,mainTarget:mainSeek.desired,heroSeeking:hero.seeking,mainSeeking:main.seeking,maxScroll})});
reduce.addEventListener('change',()=>{reduce.matches?setStatic():(mediaPrepared?startMotion():prepareMedia());});
setStatic();armLoadTimer();checkReady();requestAnimationFrame(tick);








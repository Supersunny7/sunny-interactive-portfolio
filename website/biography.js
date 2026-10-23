// P15: five reading windows inside the film's measured presenting pose.
// Nothing is triggered once: a presented media frame determines the same state
// in either direction, including a seek from a navigation link or scrollbar.
export const BIO_START=2.2, BIO_END=3.8, BIO_COUNT=5;
const clamp=x=>Math.max(0,Math.min(1,x));
export function biographyState(time){
 const position=clamp((time-BIO_START)/(BIO_END-BIO_START))*BIO_COUNT;
 const index=Math.min(BIO_COUNT-1,Math.floor(position));
 const mix=position-index;
 // Highlight the nearest entry while the full rail keeps its spatial order.
 const weights=Array.from({length:BIO_COUNT},(_,i)=>i===index?1:0);
 const offset=6*(1-clamp(mix/.15));
 const opacity=clamp(Math.min(time-BIO_START,BIO_END-time)/.08);
 const travel=Math.max(0,Math.min(BIO_COUNT-1,position-.5));
 // Finish short-screen overflow before the film begins its outgoing dissolve.
 const tail=clamp((position-(BIO_COUNT-.5))/.25);
 return {index,mix,position,weights,offset,opacity,travel,tail};
}
export function biographyTime(index){
 return BIO_START+(Math.max(0,Math.min(BIO_COUNT-1,index))+.5)*(BIO_END-BIO_START)/BIO_COUNT;
}
// A stalled decoder may never carry the copy into the following scene. The
// quarter-second bound is deliberately wider than one source frame, so normal
// text movement is not quantized to the film's 24fps presentation clock.
export function biographyRailTarget(mediaTime,scrollTime){
 return Math.max(BIO_START,Math.min(BIO_END,Math.max(mediaTime-.24,Math.min(mediaTime+.24,scrollTime))));
}
export function advanceBiographyRail(previous,target,dt,snap=false){
 if(snap||!Number.isFinite(previous))return target;
 const next=previous+(target-previous)*(1-Math.exp(-Math.max(0,Math.min(50,dt))/42));
 return Math.abs(target-next)<.00002?target:next;
}
export class Biography{
 constructor(root){
  this.root=root;this.stages=[...root.querySelectorAll('.bio-stage')];
  this.buttons=[...root.querySelectorAll('[data-bio-jump]')];this.previous=-1;
  this.viewport=root.querySelector('.bio-stages');
  this.track=document.createElement('div');this.track.className='bio-track';
  this.track.append(...this.stages);this.viewport.append(this.track);
  this.step=0;this.viewportHeight=0;
  this.resize=new ResizeObserver(()=>this.measure());this.resize.observe(this.viewport);
  document.addEventListener('cms:updated',()=>requestAnimationFrame(()=>this.measure()));
  document.fonts.ready.then(()=>this.measure());
  for(const button of this.buttons)button.addEventListener('click',()=>{
   root.dispatchEvent(new CustomEvent('biography:jump',{bubbles:true,detail:{index:+button.dataset.bioJump}}));
  });
 }
 measure(){
  if(!document.body.classList.contains('motion-mode')){this.step=0;return;}
  const top=this.viewport.getBoundingClientRect().top;
  this.viewportHeight=Math.max(160,innerHeight-top-54);
  this.viewport.style.setProperty('--bio-viewport-height',`${this.viewportHeight}px`);
  const contentHeight=Math.max(...this.stages.map(stage=>{
   const meta=stage.querySelector('.bio-meta'),detail=stage.querySelector('.bio-detail');
   const style=getComputedStyle(stage),detailStyle=getComputedStyle(detail);
   return meta.getBoundingClientRect().height+detail.getBoundingClientRect().height+
    parseFloat(detailStyle.marginTop)+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
  }));
  this.step=Math.ceil(Math.max(this.viewportHeight,contentHeight));
  this.viewport.style.setProperty('--bio-step',`${this.step}px`);
  if(this.lastRail)this.move(this.lastRail);
 }
 move(state){
  const distance=state.travel*this.step+state.tail*Math.max(0,this.step-this.viewportHeight);
  const transform=`translate3d(0,${-distance}px,0)`;
  if(transform!==this.track.style.transform)this.track.style.transform=transform;
 }
 update(time,visible,scrollTime=time,dt=1000/60,snap=false){
  const target=biographyRailTarget(time,scrollTime);
  const drawTime=biographyRailTarget(time,advanceBiographyRail(this.lastDrawTime,target,dt,snap||!this.lastVisible));
  if(time===this.lastTime&&drawTime===this.lastDrawTime&&visible===this.lastVisible)return;
  const appeared=visible&&!this.lastVisible;
  this.lastTime=time;this.lastDrawTime=drawTime;this.lastVisible=visible;
  const state=biographyState(drawTime),mediaState=biographyState(time);
  this.lastRail=biographyState(drawTime);
  if(visible&&(appeared||!this.step))this.measure();
  if(visible)this.move(this.lastRail);
  if(mediaState.opacity!==this.lastOpacity){
   this.lastOpacity=mediaState.opacity;
   this.root.style.setProperty('--biography-opacity',String(mediaState.opacity));
  }
  if(state.index!==this.previous||visible!==this.previousVisible){
   this.root.dataset.biographyStage=String(state.index+1);
   for(const [i,stage]of this.stages.entries()){
    stage.inert=!visible||i!==state.index;
    stage.setAttribute('aria-hidden',String(!visible||i!==state.index));
   }
   this.previousVisible=visible;
   this.previous=state.index;
   for(const [i,button]of this.buttons.entries()){
    if(i===state.index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
   }
  }
 }
 showAll(){
  this.previous=-1;this.previousVisible=null;this.lastOpacity=NaN;this.lastTime=NaN;this.lastDrawTime=NaN;this.lastRail=null;this.step=0;
  delete this.root.dataset.biographyStage;this.root.style.removeProperty('--biography-opacity');
  this.track.style.removeProperty('transform');
  this.viewport.style.removeProperty('--bio-viewport-height');this.viewport.style.removeProperty('--bio-step');
  for(const stage of this.stages){stage.style.removeProperty('opacity');stage.style.removeProperty('transform');stage.inert=false;stage.removeAttribute('aria-hidden');}
  for(const button of this.buttons)button.removeAttribute('aria-current');
 }
}

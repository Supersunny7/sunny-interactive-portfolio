// Passive tap recognition: native scrolling and interactive controls keep priority.
export class TouchGaze {
 constructor(root,view,{canStart,contains,onLook,onReset,hold=1600}){
  this.candidate=null;this.ids=new Set();this.active=false;this.timer=null;
  this.reset=()=>{this.candidate=null;view.clearTimeout(this.timer);this.timer=null;if(this.active){this.active=false;onReset();}};
  const blocked=target=>target?.closest?.('a,button,input,select,textarea,[role="button"],[contenteditable="true"],dialog');
  root.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch')return;
   this.ids.add(e.pointerId);this.reset();
   if(this.ids.size!==1||!e.isPrimary||!canStart()||blocked(e.target)||!contains(e.clientX,e.clientY))return;
   this.candidate={id:e.pointerId,x:e.clientX,y:e.clientY,at:e.timeStamp};
  },{passive:true});
  root.addEventListener('pointermove',e=>{
   const c=this.candidate;if(c?.id===e.pointerId&&Math.hypot(e.clientX-c.x,e.clientY-c.y)>12)this.candidate=null;
  },{passive:true});
  root.addEventListener('pointerup',e=>{
   this.ids.delete(e.pointerId);const c=this.candidate;this.candidate=null;
   if(!c||c.id!==e.pointerId||e.timeStamp-c.at>450||Math.hypot(e.clientX-c.x,e.clientY-c.y)>12||!canStart()||blocked(e.target)||!contains(e.clientX,e.clientY))return;
   this.active=true;onLook(e.clientX,e.clientY);
   this.timer=view.setTimeout(this.reset,hold);
  },{passive:true});
  root.addEventListener('pointercancel',e=>{this.ids.delete(e.pointerId);this.reset();},{passive:true});
  for(const event of ['scroll','blur','resize'])view.addEventListener(event,this.reset,{passive:true});
  root.addEventListener('visibilitychange',()=>{if(root.hidden){this.ids.clear();this.reset();}});
 }
}

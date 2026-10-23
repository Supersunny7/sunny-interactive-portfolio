import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TouchGaze} from '../website/touch-gaze.js';
function setup(){
 const root=new EventTarget(),view=new EventTarget(),calls=[],timers=new Map();let allowed=true,id=0;
 view.setTimeout=fn=>{timers.set(++id,fn);return id;};view.clearTimeout=n=>timers.delete(n);
 new TouchGaze(root,view,{canStart:()=>allowed,contains:(x,y)=>x>=0&&x<=390&&y>=90&&y<=310,onLook:(x,y)=>calls.push(['look',x,y]),onReset:()=>calls.push(['reset'])});
 const emit=(type,props={})=>{const e=new Event(type);for(const [key,val]of Object.entries({pointerId:1,pointerType:'touch',isPrimary:true,clientX:320,clientY:200,timeStamp:type==='pointerdown'?0:100,...props}))Object.defineProperty(e,key,{value:val});root.dispatchEvent(e);return e;};
 return{root,view,calls,timers,emit,allow:v=>allowed=v,tap:props=>{emit('pointerdown',props);emit('pointerup',props);}};
}
test('tap responds on release, then returns once',()=>{const s=setup();s.emit('pointerdown');assert.equal(s.calls.length,0);const e=s.emit('pointerup');assert.equal(e.defaultPrevented,false);assert.deepEqual(s.calls,[['look',320,200]]);[...s.timers.values()][0]();assert.deepEqual(s.calls.at(-1),['reset']);assert.equal(s.timers.size,0);});
test('drag and move-out-return never become taps',()=>{const s=setup();s.emit('pointerdown');s.emit('pointermove',{clientY:230});s.emit('pointermove',{clientY:200});s.emit('pointerup');assert.equal(s.calls.length,0);});
test('scroll before release cancels; active gaze resets on scroll',()=>{const s=setup();s.emit('pointerdown');s.view.dispatchEvent(new Event('scroll'));s.emit('pointerup');assert.equal(s.calls.length,0);s.tap();s.view.dispatchEvent(new Event('scroll'));assert.deepEqual(s.calls.at(-1),['reset']);assert.equal(s.timers.size,0);});
test('two fingers suppress both releases',()=>{const s=setup();s.emit('pointerdown');s.emit('pointerdown',{pointerId:2,isPrimary:false});s.emit('pointerup',{pointerId:2});s.emit('pointerup');assert.equal(s.calls.length,0);s.tap();assert.equal(s.calls[0][0],'look');});
test('long press, outside portrait and mouse are ignored',()=>{for(const props of [{timeStamp:600},{clientY:500},{pointerType:'mouse'}]){const s=setup();s.emit('pointerdown',props.timeStamp?{}:props);s.emit('pointerup',props);assert.equal(s.calls.length,0);}});
test('interactive controls take priority',()=>{const s=setup();const control=new EventTarget();control.closest=()=>true;Object.defineProperty(control,'parentNode',{value:s.root});const e=new Event('pointerdown');for(const [k,v]of Object.entries({pointerType:'touch',pointerId:1,isPrimary:true,clientX:320,clientY:200,target:control}))Object.defineProperty(e,k,{value:v});s.root.dispatchEvent(e);s.emit('pointerup');assert.equal(s.calls.length,0);});
test('mode/reduced motion guard checked on release too',()=>{const s=setup();s.emit('pointerdown');s.allow(false);s.emit('pointerup');assert.equal(s.calls.length,0);s.tap();assert.equal(s.calls.length,0);});
test('cancel/blur/resize/hidden clear pending look and timer',()=>{for(const type of ['pointercancel','blur','resize','visibilitychange']){const s=setup();s.tap();if(type==='pointercancel')s.emit(type);else if(type==='visibilitychange'){s.root.hidden=true;s.root.dispatchEvent(new Event(type));}else s.view.dispatchEvent(new Event(type));assert.deepEqual(s.calls.at(-1),['reset']);assert.equal(s.timers.size,0);}});
test('new tap replaces old deadline and gesture',()=>{const s=setup();s.tap();s.tap({clientX:60});assert.equal(s.timers.size,1);assert.deepEqual(s.calls,[['look',320,200],['reset'],['look',60,200]]);});

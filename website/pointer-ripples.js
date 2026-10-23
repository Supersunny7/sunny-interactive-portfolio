const VERTEX='attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}';
const FRAGMENT='precision highp float;\nuniform sampler2D uVideo;\nuniform vec2 uResolution,uOrigin,uVideoSize;\nuniform float uScale;\nuniform vec4 uWaves[8];\nuniform int uCount;\nvoid main(){\n vec2 p=vec2(gl_FragCoord.x,uResolution.y-gl_FragCoord.y)/uScale;\n vec2 shift=vec2(0.);float shine=0.,coverage=0.;\n for(int i=0;i<8;i++){\n if(i>=uCount)break;\n vec4 w=uWaves[i];vec2 delta=p-w.xy;float distance=length(delta),age=w.z;\n float radius=mix(96.,208.,w.w)*age+3.,band=mix(4.8,6.8,w.w);\n if(abs(distance-radius)>band*3.)continue;\n float ring=exp(-pow((distance-radius)/band,2.)),fade=pow(1.-age,2.);\n shift+=delta/max(distance,1.)*sin((distance-radius)*.9)*ring*fade*mix(2.0,3.8,w.w);\n shine+=ring*fade*mix(.065,.09,w.w);coverage=max(coverage,ring*fade);\n }\n vec2 uv=(p+shift-uOrigin)/uVideoSize;uv=vec2(uv.x,1.-uv.y);\n vec3 color=texture2D(uVideo,clamp(uv,vec2(.001),vec2(.999))).rgb;\n gl_FragColor=vec4(min(vec3(1.),color+vec3(.94,.91,.79)*shine),coverage);\n}';
// Refraction uses the existing video, bounded to the area occupied by live waves.
export class PointerRipples {
 constructor(video,enabled){
  this.video=video;this.enabled=enabled;this.waves=[];this.frame=0;this.frames=0;this.lastPoint=null;this.dirty=true;this.uploadedTime=-1;this.suspended=false;
  this.createCanvas();
  try{this.initGL();}catch{
   this.canvas.remove();this.createCanvas();this.gl=null;this.ctx=this.canvas.getContext('2d');this.canvas.dataset.renderer='2d-fallback';
  }
  this.canvas.dataset.waves='0';this.canvas.dataset.moveRadius='96';this.canvas.dataset.clickRadius='208';this.resize();
  window.addEventListener('resize',()=>this.resize(),{passive:true});
  video.addEventListener('seeked',()=>{this.dirty=true;});
  const presented=()=>{this.dirty=true;video.requestVideoFrameCallback(presented);};
  if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(presented);
  document.addEventListener('pointermove',e=>{
   if(e.pointerType==='touch'||!this.allowed())return;
   const now=performance.now(),last=this.lastPoint;
   if(last&&now-last.time<42)return;
   if(last&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<4)return;
   this.lastPoint={x:e.clientX,y:e.clientY,time:now};this.add(e.clientX,e.clientY,0,now);
  },{passive:true});
  document.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.button===0&&this.allowed())this.add(e.clientX,e.clientY,1,performance.now());},{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{this.lastPoint=null;});
  window.addEventListener('blur',()=>this.stop());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
  document.addEventListener('scroll',()=>{if(!this.allowed())this.stop();},{passive:true});
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.suspended=true;this.stop();});
  this.canvas.addEventListener('webglcontextrestored',()=>{try{this.initGL();this.resize();this.suspended=false;this.dirty=true;}catch{this.suspended=true;}});
 }
 createCanvas(){
  this.canvas=document.createElement('canvas');this.canvas.className='pointer-water';this.canvas.setAttribute('aria-hidden','true');
  this.video.parentNode.insertBefore(this.canvas,this.video.parentNode.querySelector('.reading-shade'));
 }
 allowed(){return this.enabled()&&!document.hidden&&!this.suspended;}
 initGL(){
  const gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,premultipliedAlpha:false});if(!gl)throw Error('WebGL unavailable');this.gl=gl;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VERTEX));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);this.program=program;
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  this.uniforms={};for(const name of['uVideo','uResolution','uOrigin','uVideoSize','uScale','uCount','uWaves[0]'])this.uniforms[name]=gl.getUniformLocation(program,name);
  this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.uniform1i(this.uniforms.uVideo,0);gl.clearColor(0,0,0,0);this.canvas.dataset.renderer='webgl-refraction';
 }
 resize(){
  this.scale=Math.min(devicePixelRatio||1,1.25);this.canvas.width=Math.round((this.canvas.clientWidth||document.documentElement.clientWidth)*this.scale);this.canvas.height=Math.round((this.canvas.clientHeight||innerHeight)*this.scale);this.dirty=true;
  if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
 }
 add(x,y,click,now){
  if(this.waves.length>=8)this.waves.shift();this.waves.push({x,y,click,start:now,duration:click?1250:900});
  if(!this.frame)this.frame=requestAnimationFrame(time=>this.render(time));
 }
 stop(){
  if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.waves.length=0;this.lastPoint=null;this.canvas.classList.remove('is-active');this.canvas.dataset.waves='0';
  if(this.gl){this.gl.disable(this.gl.SCISSOR_TEST);this.gl.clear(this.gl.COLOR_BUFFER_BIT);}else this.ctx?.clearRect(0,0,this.canvas.width,this.canvas.height);
 }
 render(now){
  this.frame=0;if(!this.allowed()){this.stop();return;}this.waves=this.waves.filter(w=>now-w.start<w.duration);
  if(!this.waves.length){this.stop();return;}const start=performance.now();
  if(this.video.readyState>=2){try{this.gl?this.drawGL(now):this.draw2D(now);this.canvas.classList.add('is-active');}catch{this.stop();return;}}
  this.frames++;
  if(!this.lastStats||now-this.lastStats>120){this.lastStats=now;this.canvas.dataset.waves=String(this.waves.length);this.canvas.dataset.frames=String(this.frames);this.canvas.dataset.lastDrawMs=(performance.now()-start).toFixed(2);}
  this.frame=requestAnimationFrame(time=>this.render(time));
 }
 drawGL(now){
  const gl=this.gl,U=this.uniforms;gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT);
  if(this.dirty||this.uploadedTime!==this.video.currentTime){
   gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,this.video);this.dirty=false;this.uploadedTime=this.video.currentTime;
  }
  const rect=this.video.getBoundingClientRect(),fit=getComputedStyle(this.video).objectFit;
  const scale=fit==='contain'?Math.min(rect.width/this.video.videoWidth,rect.height/this.video.videoHeight):Math.max(rect.width/this.video.videoWidth,rect.height/this.video.videoHeight);
  const width=this.video.videoWidth*scale,height=this.video.videoHeight*scale;
  gl.uniform2f(U.uOrigin,rect.left+(rect.width-width)/2,rect.top+(rect.height-height)/2);gl.uniform2f(U.uVideoSize,width,height);
  gl.uniform2f(U.uResolution,this.canvas.width,this.canvas.height);gl.uniform1f(U.uScale,this.scale);
  const data=new Float32Array(32);let x0=this.canvas.width/this.scale,y0=this.canvas.height/this.scale,x1=0,y1=0;
  this.waves.forEach((w,i)=>{const age=Math.min(1,(now-w.start)/w.duration),radius=(w.click?208:96)*age+25;data.set([w.x,w.y,age,w.click],i*4);x0=Math.min(x0,w.x-radius);y0=Math.min(y0,w.y-radius);x1=Math.max(x1,w.x+radius);y1=Math.max(y1,w.y+radius);});
  gl.uniform4fv(U['uWaves[0]'],data);gl.uniform1i(U.uCount,this.waves.length);
  x0=Math.max(0,Math.floor(Math.max(x0,rect.left)*this.scale));y0=Math.max(0,Math.floor(Math.max(y0,rect.top)*this.scale));x1=Math.min(this.canvas.width,Math.ceil(Math.min(x1,rect.right)*this.scale));y1=Math.min(this.canvas.height,Math.ceil(Math.min(y1,rect.bottom)*this.scale));
  gl.enable(gl.SCISSOR_TEST);gl.scissor(x0,this.canvas.height-y1,Math.max(0,x1-x0),Math.max(0,y1-y0));gl.drawArrays(gl.TRIANGLES,0,6);gl.disable(gl.SCISSOR_TEST);
 }
 draw2D(now){
  const ctx=this.ctx;if(!ctx)return;ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.save();ctx.scale(this.scale,this.scale);
  for(const w of this.waves){const age=Math.min(1,(now-w.start)/w.duration);ctx.strokeStyle='rgba(244,238,219,'+(.23*(1-age)**2)+')';ctx.lineWidth=1;ctx.beginPath();ctx.arc(w.x,w.y,3+age*(w.click?208:96),0,Math.PI*2);ctx.stroke();}ctx.restore();
 }
}





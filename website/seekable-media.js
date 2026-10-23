// Some static hosts deliver video without HTTP byte ranges. A fully buffered
// Blob URL gives the media element native random access without changing frames.
export const bufferedMediaNeeded=location.protocol==='https:';
const sources=new Map();
export async function loadSeekableVideo(video,path){
 const url=new URL(path,document.baseURI).href;
 if(!bufferedMediaNeeded){video.src=url;video.load();return;}
 let source=sources.get(url);
 if(!source){
  source=fetch(url,{cache:'reload'}).then(async response=>{
   if(!response.ok)throw new Error('Video request failed');
   const blob=await response.blob();
   if(!blob.type.startsWith('video/')||blob.size<1024)throw new Error('Invalid video response');
   return URL.createObjectURL(blob);
  });
  sources.set(url,source);source.catch(()=>sources.delete(url));
 }
 video.preload='auto';video.src=await source;video.load();
}

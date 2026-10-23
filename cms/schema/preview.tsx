import {useState} from 'react';
import {useClient,useWorkspace,type DocumentActionComponent} from 'sanity';
import {createPreviewSecret} from '@sanity/preview-url-secret/create-secret';
import {urlSearchParamPreviewSecret,urlSearchParamPreviewPathname} from '@sanity/preview-url-secret/constants';
export const PreviewAction:DocumentActionComponent=(props)=>{
 const client=useClient({apiVersion:'2026-03-01'}),workspace=useWorkspace();const [busy,setBusy]=useState(false);
 return {label:busy?'正在打开预览…':'预览草稿（新标签页）',disabled:busy,onHandle:async()=>{
  const tab=window.open('about:blank','_blank');setBusy(true);
  try{
   const initial=workspace.dataset==='staging'?(process.env.SANITY_STUDIO_STAGING_PREVIEW_URL||'http://127.0.0.1:5191'):(process.env.SANITY_STUDIO_PREVIEW_URL||'http://127.0.0.1:5190');
   const {secret}=await createPreviewSecret(client,'sunny-portfolio-preview',window.location.href);
   const target=new URL('/api/preview-enable',initial);target.searchParams.set(urlSearchParamPreviewSecret,secret);
   const slug=(props.draft||props.published)?.slug as {current?:string}|undefined;
   target.searchParams.set(urlSearchParamPreviewPathname,props.type==='project'&&slug?.current?`/?project=${encodeURIComponent(slug.current)}#work`:props.type==='storyStage'||props.type==='experience'?'/#about':'/');
   if(tab)tab.location.href=target.href;else throw Error('请允许后台打开预览标签页');
   props.onComplete();
  }catch(e){tab?.close();window.alert(e instanceof Error?e.message:'预览暂时不可用');}finally{setBusy(false);}
 }};
};

import type {Content,Media,Project,Stage,CategoryKey} from './types';
export const categoryKeys:CategoryKey[]=['data','web','game'];
export const stageKeys=['campus','ensure','baynovation','extern','next'];
export const str=(v:unknown)=>typeof v==='string'?v.trim():'';
export function safeUrl(v:unknown,contact=false):string{
 const s=str(v);if(!s)return '';
 if(/^assets\/[a-zA-Z0-9_./-]+$/.test(s)&&!s.includes('..'))return s;
 try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;if(contact&&['mailto:','tel:'].includes(u.protocol))return s;}catch{}
 return '';
}
const arr=(v:unknown):any[]=>Array.isArray(v)?v:[];
const num=(v:unknown,f=0)=>typeof v==='number'&&Number.isFinite(v)?v:f;
export function normalize(raw:any):Content{
 if(!raw||!Array.isArray(raw.documents)||!Array.isArray(raw.assets))throw Error('Invalid content envelope');
 const docs=raw.documents.filter((d:any)=>d&&typeof d._id==='string'),byId=new Map(docs.map((d:any)=>[d._id.replace(/^drafts\./,''),d]));
 const assets=new Map(arr(raw.assets).map(a=>[a._id,a]));
 const asset=(value:any)=>assets.get(value?.asset?._ref)||value?.asset;
 const resolve=(ref:any):any=>byId.get(str(ref?._ref).replace(/^drafts\./,''));
 function media(m:any):Media{
  const a=['image','text'].includes(m?.kind)?asset(m?.image):undefined,v=m?.kind==='video'?asset(m?.video):undefined,p=asset(m?.posterImage),crop=m?.image?.crop;
  let src=safeUrl(a?.url)||safeUrl(v?.url)||safeUrl(m?.src);
  if(safeUrl(a?.url)){const u=new URL(a.url);u.searchParams.set('auto','format');u.searchParams.set('w','1600');u.searchParams.set('fit','max');
   if(crop&&a.metadata?.dimensions){const {width,height}=a.metadata.dimensions;u.searchParams.set('rect',[Math.round(width*crop.left),Math.round(height*crop.top),Math.round(width*(1-crop.left-crop.right)),Math.round(height*(1-crop.top-crop.bottom))].join(','));}src=u.href;}
  return {kind:['image','video','gallery','text'].includes(m?.kind)?m.kind:'image',src,alt:str(m?.alt),poster:safeUrl(p?.url)||safeUrl(m?.poster),
   width:num(a?.metadata?.dimensions?.width,num(m?.width,1000)),height:num(a?.metadata?.dimensions?.height,num(m?.height,700)),
   position:m?.image?.hotspot?`${m.image.hotspot.x*100}% ${m.image.hotspot.y*100}%`:'50% 50%',
   autoplay:!!m?.autoplay,loop:!!m?.loop,muted:m?.muted!==false,caption:str(m?.caption),body:str(m?.body),
   images:arr(m?.images).map(i=>media({kind:'image',image:i,alt:i.alt,caption:i.caption}))};
 }
 const links=(list:any)=>arr(list).map(l=>({label:str(l.label),value:str(l.value),url:safeUrl(l.url,true),wide:!!l.wide})).filter(l=>l.label&&l.url);
 const projectDocs=docs.filter((d:any)=>d._type==='project');
 const projects:Project[]=projectDocs.map((d:any)=>({id:d._id,title:str(d.title),slug:str(d.slug?.current),year:str(d.year),category:d.category,sortOrder:num(d.sortOrder),featured:!!d.featured,
  summary:str(d.summary),description:str(d.description),caption:str(d.caption),cover:media(d.cover),media:arr(d.media).map(media),technologies:str(d.technologies),links:links(d.links),statusLabel:str(d.statusLabel),returnToCollections:!!d.returnToCollections})).filter((p:any)=>p.title&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)&&categoryKeys.includes(p.category)).sort((a:Project,b:Project)=>a.sortOrder-b.sortOrder);
 if(new Set(projects.map(p=>p.slug)).size!==projects.length)throw Error('Duplicate slugs');
 const categories=categoryKeys.map(key=>{const d:any=docs.find((x:any)=>x._type==='category'&&x.key===key);if(!d)throw Error('Incomplete categories');const representative=resolve(d.representative);return {id:key,title:str(d.title),summary:str(d.summary),sortOrder:num(d.sortOrder),cover:media(representative?.category===key?representative.cover:d.cover),coverHeading:str(d.coverHeading)};}).sort((a,b)=>a.sortOrder-b.sortOrder);
 const stages:Stage[]=stageKeys.map((key,index)=>{
  const d:any=docs.find((x:any)=>x._type==='storyStage'&&x.key===key);if(!d)throw Error('Incomplete story stages');
  const primary=resolve(d.primary),roles=arr(d.roles).map(resolve).filter(Boolean);
  return {id:key,index,title:str(d.title),titleId:`bio-${key}-title`,year:str(d.year),ghostYear:str(d.ghostYear),navLabel:str(d.navLabel),
   organization:str(primary?.organization),role:key==='campus'?'':str(primary?.role),dateLabel:str(primary?.dateLabel),
   description:str(d.description)|| (roles.length?roles.map(r=>str(r.description)).filter(Boolean).join(' '):str(primary?.description)),
   roles:roles.map(r=>({role:str(r.role),dateLabel:str(r.dateLabel)})),tags:arr(d.tags).map(str).filter(Boolean)};
 });
 const p:any=docs.find((x:any)=>x._type==='profile'&&x._id==='profile'),s:any=docs.find((x:any)=>x._type==='siteSettings'&&x._id==='site-settings');
 if(!p||!s)throw Error('Missing site settings');
 return {version:1,projects,categories,stages,profile:{name:str(p.name),wordmarkFirst:str(p.wordmarkFirst),wordmarkRest:str(p.wordmarkRest),introduction:str(p.introduction),location:str(p.location),avatar:media(p.avatar),resumeUrl:safeUrl(asset(p.resume)?.url)||safeUrl(p.resumeUrl),contacts:links(p.contacts)},
  settings:{title:str(s.title),description:str(s.description),shareImage:safeUrl(asset(s.shareImage)?.url)||safeUrl(s.shareImageUrl),copy:Object.fromEntries(Object.entries(s.copy||{}).filter(([k,v])=>typeof v==='string'&&!k.startsWith('_')) as [string,string][]),music:{enabled:!!s.music?.enabled,url:safeUrl(asset(s.music?.audio)?.url)||safeUrl(s.music?.url),title:str(s.music?.title),loop:s.music?.loop!==false,volume:Math.max(0,Math.min(1,num(s.music?.volume,.25)))}}};
}
export function validateContent(c:any):c is Content{
 return !!c&&c.version===1&&Array.isArray(c.projects)&&Array.isArray(c.categories)&&c.categories.length===3&&Array.isArray(c.stages)&&c.stages.length===5&&!!c.profile&&Array.isArray(c.profile.contacts)&&!!c.settings?.copy;
}

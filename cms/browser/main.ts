import {createClient} from '@sanity/client';
import selectors from '../content/selectors.json';
import {safeUrl,validateContent} from '../content/normalize';
import type {Content,Envelope,Media,Project} from '../content/types';
// Keep the existing film, gaze and folder modules as the runtime.
// @ts-ignore -- intentionally external plain-JavaScript frontend
await import('./app.js');
const $=(s:string)=>document.querySelector<HTMLElement>(s);
const el=(tag:string,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
function setText(n:HTMLElement|null,value:string,breaks=false){if(!n)return;if(!breaks){n.textContent=value;return;}n.replaceChildren(...value.split('\n').flatMap((t,i)=>i?[document.createElement('br'),document.createTextNode(t)]:[document.createTextNode(t)]));}
function visual(m:Media,cls='project-preview'):HTMLElement{
 if(m.kind==='text'){const group=el('div','cms-text-block');if(safeUrl(m.src))group.append(visual({...m,kind:'image'}));group.append(el('p','project-description',m.body||''));return group;}
 if(m.kind==='gallery'){const group=el('div','cms-gallery');for(const i of m.images||[])group.append(visual(i));return group;}
 const src=safeUrl(m.src);
 if(!src)return el('p','project-caption','Media is not available.');
 if(m.kind==='video'){
  const v=document.createElement('video');v.className=cls;v.src=src;v.poster=safeUrl(m.poster);v.muted=m.muted!==false;v.loop=!!m.loop;v.autoplay=!!m.autoplay&&v.muted&&!matchMedia('(prefers-reduced-motion: reduce)').matches;v.controls=!!cls;v.playsInline=true;v.preload='metadata';return v;
 }
 const img=document.createElement('img');img.className=cls;img.src=src;img.alt=m.alt||'';img.width=m.width||1000;img.height=m.height||700;img.loading='lazy';img.decoding='async';if(m.position)img.style.objectPosition=m.position;return img;
}
function projectNode(p:Project){
 const article=el('article','project'+(p.slug==='xinfa-paint-factory'?' project-xinfa':''));article.dataset.projectSlug=p.slug;article.id='project-'+p.slug;
 article.append(visual(p.cover));if(p.caption)article.append(el('p','project-caption',p.caption));
  const heading=el('h4'),permalink=el('a','project-permalink',p.title);permalink.setAttribute('href',`?project=${encodeURIComponent(p.slug)}#work`);heading.append(permalink);article.append(heading,el('p','',p.summary));if(p.description)article.append(el('p','project-description',p.description));
 for(const m of p.media){article.append(visual(m));if(m.caption)article.append(el('p','project-caption',m.caption));}
 const bottom=el('div','project-bottom');bottom.append(el('span','',p.technologies));
 const links=el('div');for(const l of p.links){const url=safeUrl(l.url);if(!url)continue;const a=el('a','',l.label);a.setAttribute('href',url);a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer');links.append(a);}
 if(p.statusLabel)links.append(el('span','project-status',p.statusLabel));
 if(p.returnToCollections){const b=el('button','return-portfolio','← Back to collections') as HTMLButtonElement;b.type='button';links.append(b);}
 bottom.append(links);article.append(bottom);return article;
}
let current:Content|undefined,signature='',tags:string[]=[],liveSubscription:{unsubscribe():void}|undefined,liveConfig='',busy=false,refreshQueued=false;
function apply(c:Content){
 const active=document.activeElement as HTMLElement|null,focusedSlug=active?.closest<HTMLElement>('[data-project-slug]')?.dataset.projectSlug;
 const dialog=$('#project-library') as HTMLDialogElement,oldScroll=dialog.scrollTop;
 const visibleProject=[...dialog.querySelectorAll<HTMLElement>('[data-project-slug]')].find(n=>n.getBoundingClientRect().bottom>100&&n.getBoundingClientRect().top<innerHeight);
 const anchorSlug=visibleProject?.dataset.projectSlug,anchorY=visibleProject?.getBoundingClientRect().top;
 for(const [key,selector] of Object.entries(selectors)){const value=key==='aboutIntroduction'?c.profile.introduction:c.settings.copy[key];if(typeof value==='string')setText($(selector),value,true);}
 const w=$('.wordmark');if(w){w.replaceChildren(document.createTextNode(c.profile.wordmarkFirst),el('span','nickname',c.profile.wordmarkRest));w.setAttribute('aria-label',c.profile.name+', home');}
 document.title=c.settings.title;document.querySelector('meta[name="description"]')?.setAttribute('content',c.settings.description);
 for(const [index,s]of c.stages.entries()){
  const n=document.querySelectorAll<HTMLElement>('.bio-stage')[index];if(!n)continue;
  for(const [cls,v]of [['.bio-year-ghost',s.ghostYear],['.bio-year',s.year],['h3',s.title],['.bio-organization',s.organization],['.bio-date',s.dateLabel]] as const)setText(n.querySelector(cls),v);
  let role=n.querySelector<HTMLElement>('.bio-role');if(s.role&&!role){role=el('p','bio-role');n.querySelector('.bio-date')?.before(role);}if(role){setText(role,s.role);role.hidden=!s.role;}
  let roles=n.querySelector<HTMLElement>('.bio-roles');if(s.roles.length&&!roles){roles=el('div','bio-roles');n.querySelector('.bio-detail')?.prepend(roles);}if(roles){roles.hidden=!s.roles.length;roles.replaceChildren(...s.roles.map(r=>{const p=el('p');p.append(el('strong','',r.role),el('span','',r.dateLabel));return p;}));}
  setText(n.querySelector('.bio-description'),s.description);
  let skill=n.querySelector<HTMLElement>('.bio-tags');if(s.tags.length&&!skill){skill=el('ul','bio-tags');skill.setAttribute('aria-label','Skills');n.querySelector('.bio-detail')?.append(skill);}if(skill){skill.hidden=!s.tags.length;skill.replaceChildren(...s.tags.map(t=>el('li','',t)));}
  const button=$(`[data-bio-jump="${index}"]`);setText(button,s.navLabel);button?.setAttribute('aria-label',s.year+': '+s.title);
 }
 for(const cat of c.categories){
  const n=$(`[data-collection="${cat.id}"]`);if(!n)continue;
  setText(n.querySelector('.collection-label'),cat.title);setText(n.querySelector('.collection-summary'),cat.summary);
  const ps=c.projects.filter(p=>p.category===cat.id);setText(n.querySelector('.collection-number'),`${ps.length} project${ps.length===1?'':'s'}`);setText(n.querySelector('.collection-projects'),ps.map(p=>p.title).join(' · '));
  const cover=n.querySelector<HTMLElement>('.collection-cover');if(cover){const head=cover.querySelector('.collection-cover-title');head?.remove();cover.replaceChildren(visual(cat.cover,''));if(cat.coverHeading){const h=el('span','collection-cover-title'),[first,...rest]=cat.coverHeading.split('\n');h.append(document.createTextNode(first),el('span','',rest.join(' ')));cover.prepend(h);}}
  $('.collection-grid')?.append(n);
  const list=$(`[data-projects="${cat.id}"]`);if(list){list.replaceChildren(...ps.map(projectNode));if(!ps.length)list.append(el('p','project-caption','No published projects in this collection yet.'));}
 }
 setText($('.work-prompt > span'),`${c.projects.length} projects / ${c.categories.length} collections`);
 setText($('.work-categories p'),c.categories.map(c=>c.title).join('\n'),true);
 const contact=$('.contact-links');if(contact){contact.replaceChildren(...c.profile.contacts.map(l=>{const a=el('a','contact-link'+(l.wide?' contact-wide':''));a.setAttribute('href',safeUrl(l.url,true));if(l.url.startsWith('https:')){a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer');}a.append(el('span','contact-type',l.label),el('span','contact-value',l.value||l.label),el('span','contact-arrow','↗'));return a;}));}
 $('.cms-resume')?.remove();if(safeUrl(c.profile.resumeUrl)){const a=el('a','cms-resume','Download résumé');a.setAttribute('href',safeUrl(c.profile.resumeUrl));a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer');$('.bio-introduction')?.after(a);}
 current=c;document.dispatchEvent(new CustomEvent('cms:updated'));
 if(dialog.open){
  const anchor=[...dialog.querySelectorAll<HTMLElement>('[data-project-slug]')].find(n=>n.dataset.projectSlug===anchorSlug);
  if(anchor&&anchorY!==undefined)dialog.scrollTop+=anchor.getBoundingClientRect().top-anchorY;else dialog.scrollTop=oldScroll;
  if(focusedSlug){const node=[...dialog.querySelectorAll<HTMLElement>('[data-project-slug]')].find(n=>n.dataset.projectSlug===focusedSlug);if(node){const focusable=node.querySelector<HTMLElement>('a,button')||node;focusable.tabIndex=focusable.tabIndex<0?0:focusable.tabIndex;focusable.focus({preventScroll:true});}else{$('.library-back')?.click();const notice=$('.cms-notice')||el('p','cms-notice');notice.setAttribute('role','status');notice.textContent='This project is no longer published. Choose another collection.';$('.library-collections')?.prepend(notice);}}
 }
 configureMusic(c);
}
function configureMusic(c:Content){
 const music=c.settings.music,existing=document.querySelector<HTMLAudioElement>('#cms-music');
 if(!music.enabled||!safeUrl(music.url)){existing?.pause();existing?.remove();$('.cms-music-button')?.remove();return;}
 let audio=existing;if(!audio){audio=document.createElement('audio');audio.id='cms-music';audio.preload='none';document.body.append(audio);}
 if(audio.getAttribute('src')!==music.url){audio.pause();audio.src=music.url;}audio.loop=music.loop;audio.volume=music.volume;
 let button=$('.cms-music-button') as HTMLButtonElement|null;if(!button){button=el('button','cms-music-button','Play music') as HTMLButtonElement;button.type='button';button.onclick=async event=>{event.stopPropagation();try{if(audio!.paused){await audio!.play();button!.textContent='Pause music';localStorage.setItem('sunny-music-preference','on');}else{audio!.pause();button!.textContent='Play music';localStorage.setItem('sunny-music-preference','off');}}catch{button!.textContent='Retry music';}};document.body.append(button);}button.title=music.title||'Background music';attachControls();
}
function live(e:Envelope){
 if(e.preview||!e.live)return;
 const key=JSON.stringify(e.live);if(liveConfig===key)return;liveSubscription?.unsubscribe();liveConfig=key;
 liveSubscription=createClient({...e.live,useCdn:true}).live.events().subscribe({next:event=>{
  if(event.type==='message'&&event.tags.some(t=>tags.includes(t)))void refresh(event.id);
  if(['restart','reconnect'].includes(event.type))void refresh();
 },error:()=>{liveSubscription=undefined;liveConfig='';}});
}
function previewBanner(preview:boolean){
 let n=$('.cms-preview');if(preview){if(!n){n=el('aside','cms-preview');n.addEventListener('click',e=>e.stopPropagation());n.append(el('span','','Draft preview · expires in 30 minutes'));const a=el('a','','Exit preview');a.setAttribute('href','/api/preview-disable');n.append(a);document.body.append(n);attachControls();}}else n?.remove();
}
function attachControls(){const d=$('#project-library') as HTMLDialogElement;const target=d.open?d:document.body;for(const n of document.querySelectorAll('.cms-preview,.cms-music-button'))if(n.parentElement!==target)target.append(n);}
$('#project-library')?.addEventListener('toggle',attachControls);$('#project-library')?.addEventListener('close',attachControls);
async function accept(e:Envelope){
 if(!validateContent(e.content))throw Error('Invalid content');tags=e.syncTags||[];previewBanner(e.preview);live(e);
 const next=JSON.stringify(e.content);if(next!==signature){
  if(!current){const fallback=await fetch('/content-fallback.json').then(r=>r.json()).catch(()=>null);if(JSON.stringify(fallback)===next){current=e.content;signature=next;document.body.dataset.contentSource=e.source;return;}}
  apply(e.content);signature=next;
 }
 document.body.dataset.contentSource=e.source;
}
async function refresh(eventId?:string){
 if(document.hidden)return;if(busy){refreshQueued=true;return;}busy=true;
 try{const u=new URL('/api/content',location.origin);if(eventId)u.searchParams.set('liveEventId',eventId);if(new URLSearchParams(location.search).has('preview'))u.searchParams.set('draft','1');
  const r=await fetch(u,{credentials:'same-origin',signal:AbortSignal.timeout(9000),cache:'no-store'});if(r.status===401){const clean=new URL(location.href);clean.searchParams.delete('preview');history.replaceState(null,'',clean);previewBanner(false);const published=await fetch('/api/content',{cache:'no-store'});if(published.ok)await accept(await published.json());return;}if(!r.ok)throw Error('Content unavailable');const e=await r.json();await accept(e);
 }catch{document.body.dataset.contentSource=current?'retained':'local';}finally{busy=false;if(refreshQueued){refreshQueued=false;void refresh();}}
}
const initial=$('#cms-initial');if(initial){try{await accept(JSON.parse(initial.textContent||''));}catch{}}
await refresh();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});window.addEventListener('focus',()=>void refresh());window.addEventListener('online',()=>void refresh());
// A slow recovery check only while visible, alongside the live event stream.
setInterval(()=>{if(!document.hidden)void refresh();},60000);
function restoreProject(){const slug=new URLSearchParams(location.search).get('project');if(!slug)return;const n=document.querySelector<HTMLElement>(`[data-project-slug="${CSS.escape(slug)}"]`);if(!n)return;const key=n.closest<HTMLElement>('[data-projects]')?.dataset.projects;if(!key)return;$('.folder-launch')?.click();$(`[data-collection="${key}"]`)?.click();requestAnimationFrame(()=>n.scrollIntoView({block:'start'}));}
document.addEventListener('click',event=>{const a=(event.target as Element).closest<HTMLAnchorElement>('.project-permalink');if(a){event.preventDefault();history.replaceState(null,'',a.href);}});
restoreProject();

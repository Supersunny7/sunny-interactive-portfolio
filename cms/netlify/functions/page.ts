import {getEnvelope,noStore} from '../shared';
import {template} from '../../content/template';
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export default async function(request:Request){
 try{
  const data=await getEnvelope(request),s=data.content.settings,u=new URL(request.url);
  const p=data.content.projects.find(p=>p.slug===u.searchParams.get('project'));
  const title=p?`${p.title} — ${data.content.profile.name}`:s.title,description=p?p.summary:s.description;
  let html=template.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(title)}</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(description)}">`);
  const origin=process.env.SITE_URL||u.origin;
  const image=s.shareImage?new URL(s.shareImage,origin).href:'';
  const tags=`<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(origin+u.pathname+u.search)}"><meta name="twitter:card" content="${image?'summary_large_image':'summary'}">${image?`<meta property="og:image" content="${escape(image)}">`:''}${data.preview?'<meta name="robots" content="noindex,nofollow">':''}`;
  html=html.replace('</head>',tags+'</head>').replace('</body>',`<script id="cms-initial" type="application/json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script></body>`);
  return new Response(html,{headers:{...noStore,'Content-Type':'text/html; charset=utf-8'}});
 }catch{return new Response('Preview unavailable. Return to the published website.',{status:503,headers:noStore});}
}

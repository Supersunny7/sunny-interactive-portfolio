import {createClient} from '@sanity/client';
import {createHmac,timingSafeEqual,randomBytes} from 'node:crypto';
import fallback from '../content/fallback.json';
import {normalize} from '../content/normalize';
import {contentQuery} from '../content/queries';
import type {Content,Envelope} from '../content/types';
export const cookieName='sunny_preview';
export const localContent=fallback as Content;
export const config=()=>({projectId:process.env.SANITY_PROJECT_ID||'',dataset:process.env.SANITY_DATASET||'production',apiVersion:process.env.SANITY_API_VERSION||'2026-03-01'});
export function client(){const cfg=config();if(!cfg.projectId)throw Error('CMS not configured');return createClient({...cfg,token:process.env.SANITY_API_READ_TOKEN,useCdn:false,perspective:'published',timeout:6000});}
function signature(payload:string){const secret=process.env.PREVIEW_SESSION_SECRET;if(!secret||secret.length<32)throw Error('Preview secret unavailable');return createHmac('sha256',secret).update(payload).digest('base64url');}
export function signSession(now=Date.now()){const payload=Buffer.from(JSON.stringify({exp:now+30*60*1000,nonce:randomBytes(12).toString('hex')})).toString('base64url');return payload+'.'+signature(payload);}
export function previewSession(request:Request,now=Date.now()):boolean{
 try{const cookie=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!cookie)return false;const [p,s]=cookie.split('.');const expected=signature(p);if(s.length!==expected.length||!timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return false;return JSON.parse(Buffer.from(p,'base64url').toString()).exp>now;}catch{return false;}
}
export function sessionCookie(value:string,request:Request,clear=false){const secure=new URL(request.url).protocol==='https:',partitioned=secure&&request.headers.get('sec-fetch-dest')==='iframe'&&request.headers.get('sec-fetch-site')==='cross-site';return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=${partitioned?'None':'Lax'}; Max-Age=${clear?0:1800}${secure?'; Secure':''}${partitioned?'; Partitioned':''}`;}
export const noStore={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
export async function getEnvelope(request:Request):Promise<Envelope>{
 const preview=previewSession(request),cfg=config();
 if(new URL(request.url).searchParams.get('draft')==='1'&&!preview)throw new Error('Unauthorized preview');
 if(!cfg.projectId)return {content:localContent,source:'local',preview:false,syncTags:[]};
 try{
  const eventId=new URL(request.url).searchParams.get('liveEventId')||undefined;
  const response=await client().fetch(contentQuery,{}, {perspective:preview?'drafts':'published',filterResponse:false,lastLiveEventId:preview?undefined:eventId});
  return {content:normalize(response.result),source:'sanity',preview,syncTags:response.syncTags||[],live:preview?undefined:cfg};
 }catch(e){if(preview)throw e;return {content:localContent,source:'local',preview:false,syncTags:[],live:cfg};}
}

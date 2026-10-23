import {validatePreviewUrl} from '@sanity/preview-url-secret';
import {client,signSession,sessionCookie,noStore} from '../shared';
export default async function(request:Request){
 if(request.method!=='GET')return new Response(null,{status:405});
 try{
  const result=await validatePreviewUrl(client(),request.url);
  if(!result.isValid)return new Response('Preview requires a valid Studio session.',{status:401,headers:noStore});
  const target=new URL(result.redirectTo||'/',request.url),origin=new URL(request.url).origin;
  if(target.origin!==origin)return new Response('Invalid redirect',{status:400,headers:noStore});
  target.searchParams.set('preview','1');
  return new Response(null,{status:303,headers:{...noStore,Location:target.pathname+target.search+target.hash,'Set-Cookie':sessionCookie(signSession(),request)}});
 }catch{return new Response('Preview is not configured or the link has expired.',{status:401,headers:noStore});}
}

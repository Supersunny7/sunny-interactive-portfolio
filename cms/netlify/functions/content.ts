import {getEnvelope,noStore,previewSession} from '../shared';
export default async function(request:Request){
 if(request.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
 if(new URL(request.url).searchParams.get('draft')==='1'&&!previewSession(request))return new Response('{"error":"Preview requires authorization"}',{status:401,headers:noStore});
 try{return new Response(JSON.stringify(await getEnvelope(request)),{headers:noStore});}catch{return new Response('{"error":"Content unavailable"}',{status:503,headers:noStore});}
}

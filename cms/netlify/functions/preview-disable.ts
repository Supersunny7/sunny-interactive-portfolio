import {sessionCookie,noStore} from '../shared';
export default async function(request:Request){return new Response(null,{status:303,headers:{...noStore,Location:'/#work','Set-Cookie':sessionCookie('',request,true)}});}

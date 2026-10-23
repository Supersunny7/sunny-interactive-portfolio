import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist'),port=Number(process.env.PORTFOLIO_CMS_PORT||5190);
const handlers={};for(const name of ['content','page','preview-enable','preview-disable'])handlers[name]=(await import(`../private/functions/${name}.mjs`)).default;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp4':'video/mp4','.webm':'video/webm','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf'};
http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,`http://127.0.0.1:${port}`),name=['/','/index.html'].includes(u.pathname)?'page':u.pathname.startsWith('/api/')?u.pathname.slice(5):'';
 if(handlers[name]){const response=await handlers[name](new Request(u,{method:req.method,headers:req.headers}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
 const file=path.resolve(dist,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(dist+path.sep))return res.writeHead(403).end();
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();const size=fs.statSync(file).size;
 const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');let start=0,end=size-1;
 if(m){start=+m[1];end=m[2]?Math.min(+m[2],end):end;if(start>end||start>=size)return res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();}
 const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':end-start+1,'Cache-Control':'no-store','Accept-Ranges':'bytes'};
 if(m)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 res.writeHead(m?206:200,headers);if(req.method==='HEAD')return res.end();fs.createReadStream(file,{start,end}).pipe(res);
 }catch{res.writeHead(500).end('Preview error');}}).listen(port,'127.0.0.1',()=>console.log(`CMS preview http://127.0.0.1:${port}`));

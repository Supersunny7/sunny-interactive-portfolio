import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,safeUrl} from '../content/normalize';
import {seedDocuments} from '../tools/seed';
import {signSession,previewSession,sessionCookie} from '../netlify/shared';
const raw=()=>({documents:seedDocuments(),assets:[]});
test('migration preserves real records and publication structure',()=>{
 const c=normalize(raw());assert.equal(c.projects.length,5);assert.equal(c.categories.length,3);assert.equal(c.stages.length,5);assert.equal(c.profile.contacts.length,5);
 assert.equal(c.stages[2].role,'Data Analyst Intern');assert.equal(c.stages[3].organization,'Extern');assert.match(c.stages[3].dateLabel,/Project partner: Beats by Dre/);
 assert.match(c.stages[0].description,/Tutored mathematics and Chinese/);assert.doesNotMatch(c.stages[0].description,/basic/i);assert.match(c.stages[4].dateLabel,/Expected Dec 2027/);assert.deepEqual(c.stages[4].tags,[]);
 assert.equal(c.projects.find(p=>p.slug==='xinfa-paint-factory')?.year,'');
});
test('a valid empty published project list stays empty',()=>{const r=raw();r.documents=r.documents.filter(d=>d._type!=='project');assert.deepEqual(normalize(r).projects,[]);});
test('category representative uses a published project from the same category',()=>{const r=raw();const category=r.documents.find(d=>d._id==='category-data');category.representative={_ref:'project-chicago-311'};assert.equal(normalize(r).categories.find(c=>c.id==='data')?.cover.src,'assets/project-chicago311-overview.png');r.documents=r.documents.filter(d=>d._id!=='project-chicago-311');assert.equal(normalize(r).categories.find(c=>c.id==='data')?.cover.src,category.cover.src);});
test('duplicate project slugs fail closed',()=>{const r=raw();r.documents.push({...r.documents[0],_id:'duplicate'});assert.throws(()=>normalize(r),/Duplicate slugs/);});
test('missing schema envelope fails instead of clearing the website',()=>{assert.throws(()=>normalize({documents:[],assets:[]}));assert.throws(()=>normalize(null));});
test('a published experience update reaches its stage; unpublishing removes its role',()=>{const r=raw();const changed=r.documents.find(d=>d._id==='experience-baynovation');changed.role='Verified title';assert.equal(normalize(r).stages[2].role,'Verified title');r.documents=r.documents.filter(d=>d!==changed);assert.equal(normalize(r).stages[2].role,'');assert.equal(normalize(r).stages[2].description,'');});
test('URL validation prevents script, protocol-relative and credential-bearing links',()=>{
 for(const v of ['javascript:alert(1)','data:text/html,x','//evil.test','assets/../.env','https://x:y@evil.test'])assert.equal(safeUrl(v),'');
 assert.equal(safeUrl('tel:+15512401120',true),'tel:+15512401120');assert.equal(safeUrl('assets/project.png'),'assets/project.png');assert.equal(safeUrl('http://evil.test'),'');
});
test('preview sessions expire and reject forgery',()=>{
 process.env.PREVIEW_SESSION_SECRET='test-only-secret-that-is-long-enough-to-test';
 const token=signSession(1000),request=new Request('https://example.test',{headers:{cookie:'sunny_preview='+token}});
 assert.equal(previewSession(request,1001),true);assert.equal(previewSession(request,1801001),false);
 assert.equal(previewSession(new Request('https://example.test?preview=1')),false);
 assert.equal(previewSession(new Request('https://example.test',{headers:{cookie:'sunny_preview='+token+'x'}}),1001),false);
 assert.match(sessionCookie(token,request),/HttpOnly; SameSite=Lax; Max-Age=1800; Secure/);
});

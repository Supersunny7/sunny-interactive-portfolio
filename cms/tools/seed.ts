import fs from 'node:fs/promises';
import path from 'node:path';
import seed from '../content/fallback.json';
const root=path.resolve(import.meta.dirname,'..');
const base:any=seed;
export function seedDocuments(){
 const keyArray=(arr:any[],type='contentLink')=>arr.map((v,i)=>({_type:type,...v,_key:'item'+i}));
 const docs:any[]=[];
 for(const p of base.projects){const {id,...fields}=p;docs.push({_id:id,_type:'project',...fields,slug:{_type:'slug',current:p.slug},year:['chicago-311','olist-ecommerce','interactive-portfolio','aim-duel'].includes(p.slug)?'2026':'',cover:{_type:'media',...p.cover},media:keyArray(p.media,'media'),links:keyArray(p.links)});}
 for(const c of base.categories){const {id,...fields}=c;docs.push({_id:'category-'+id,_type:'category',key:id,...fields,cover:{_type:'media',...c.cover}});}
 const dates=[['2022-09-01','2026-06-01'],['2024-06-01','2024-08-01'],['2024-12-01','2025-02-01'],['2025-05-01','2025-08-01'],['2026-09-01','2027-12-01']];
 for(const [i,s]of base.stages.entries()){
  const id='experience-'+s.id;
  docs.push({_id:id,_type:'experience',kind:i===0||i===4?'education':'work',organization:s.organization,role:i===0?'B.S. in Data & Information Science':s.role,dateLabel:s.dateLabel,startDate:dates[i][0],endDate:dates[i][1],current:i===4,expected:i===4,partner:i===3?'Beats by Dre':'',description:i===0?'':s.description,tags:s.tags,sortOrder:i*10});
  const roles=s.roles.map((r:any,j:number)=>{
   const rid=`experience-campus-${j}`;
   docs.push({_id:rid,_type:'experience',kind:'work',organization:s.organization,role:r.role,dateLabel:r.dateLabel,startDate:j?'2023-10-01':'2022-10-01',endDate:'2024-05-01',current:false,description:j?'Tutored mathematics and Chinese, preparing materials and sharing learning feedback.':'Maintained residence halls, supplies and equipment, and helped train new staff.',tags:[],sortOrder:j*10});
   return {_type:'reference',_ref:rid,_key:'role'+j};
  });
  docs.push({_id:'stage-'+s.id,_type:'storyStage',key:s.id,title:s.title,year:s.year,ghostYear:s.ghostYear,navLabel:s.navLabel,primary:{_type:'reference',_ref:id},roles,description:'',tags:s.tags});
 }
 docs.push({_id:'profile',_type:'profile',...base.profile,contacts:keyArray(base.profile.contacts)});
 docs.push({_id:'site-settings',_type:'siteSettings',...base.settings,shareImage:undefined,shareImageUrl:base.settings.shareImage});
 return docs;
}
if(process.argv.includes('--write')){const docs=seedDocuments();await fs.writeFile(path.join(root,'content/seed.ndjson'),docs.map(d=>JSON.stringify(d)).join('\n')+'\n');console.log(JSON.stringify({documents:docs.length,projects:docs.filter(d=>d._type==='project').length}));}

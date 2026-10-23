import {createClient} from '@sanity/client';
import {seedDocuments} from './seed';
const projectId=process.env.SANITY_PROJECT_ID,dataset=process.env.SANITY_DATASET;
if(!projectId||!dataset||!process.env.SANITY_IMPORT_TOKEN)throw Error('Project, dataset and temporary import token are required');
const client=createClient({projectId,dataset,apiVersion:'2026-03-01',token:process.env.SANITY_IMPORT_TOKEN,useCdn:false});
const docs=seedDocuments();let tx=client.transaction();for(const doc of docs)tx=tx.createIfNotExists(doc);
await tx.commit();console.log(JSON.stringify({imported:docs.length,dataset,mode:'createIfNotExists; existing edits are preserved'}));

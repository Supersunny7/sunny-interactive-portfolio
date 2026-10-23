import {defineConfig,type WorkspaceOptions} from 'sanity';
import {structureTool} from 'sanity/structure';
import {presentationTool} from 'sanity/presentation';
import {schemaTypes} from './schema/index';
import {PreviewAction} from './schema/preview';
const projectId=process.env.SANITY_STUDIO_PROJECT_ID||process.env.SANITY_PROJECT_ID;
if(!projectId)throw new Error('请先在本地.env配置Sanity项目ID，再启动后台');
function workspace(dataset:'production'|'staging'):WorkspaceOptions{
 const preview=dataset==='production'?(process.env.SANITY_STUDIO_PREVIEW_URL||'http://127.0.0.1:5190'):(process.env.SANITY_STUDIO_STAGING_PREVIEW_URL||'http://127.0.0.1:5191');
 return {name:dataset,title:dataset==='production'?'Sunny 正式内容':'Sunny 测试内容',basePath:'/'+dataset,projectId:projectId!,dataset,schema:{types:schemaTypes},
 plugins:[structureTool({structure:S=>S.list().id('content').title('内容管理').items([
  S.listItem().id('projects').title('作品').child(S.documentTypeList('project').id('project-list').title('作品').defaultOrdering([{field:'sortOrder',direction:'asc'}])),
  S.listItem().id('categories').title('分类').child(S.documentTypeList('category').id('category-list').title('三个作品分类')),
  S.listItem().id('stages').title('履历五阶段').child(S.documentTypeList('storyStage').id('stage-list').title('履历五阶段')),
  S.listItem().id('experience').title('工作与教育记录').child(S.documentTypeList('experience').id('experience-list').title('工作与教育记录')),
  S.listItem().id('profile').title('个人资料与联系方式').child(S.document().schemaType('profile').documentId('profile')),
  S.listItem().id('settings').title('网站全局设置').child(S.document().schemaType('siteSettings').documentId('site-settings'))
 ])}),presentationTool({previewUrl:{initial:preview,previewMode:{enable:'/api/preview-enable',disable:'/api/preview-disable'}},allowOrigins:[preview]})],
 document:{actions:(prev,ctx)=>{
  const protectedTypes=['profile','siteSettings','storyStage','category'];
 const actions=protectedTypes.includes(ctx.schemaType)?prev.filter(a=>!['delete','duplicate','unpublish'].includes(a.action||'')):prev;
 return [...actions,PreviewAction];
 }}};
}
export default defineConfig([workspace('production'),workspace('staging')]);

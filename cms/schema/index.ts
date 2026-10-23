import {defineType,defineField,defineArrayMember} from 'sanity';
import {MediaInput} from './media-input';
const f=(name:string,title:string,type='string',extra:Record<string,unknown>={})=>defineField({name,title,type,...extra} as any);
const required=(r:any)=>r.required();
const short=(r:any)=>r.required().max(90).warning('标题较长，请检查手机预览。');
const order=f('sortOrder','展示顺序（数字越小越靠前）','number',{initialValue:10,validation:required});
const urlValidation=(r:any)=>r.custom((v:string)=>!v||/^(https:\/\/|mailto:|tel:|assets\/)/.test(v)||'仅支持 HTTPS、邮箱、电话或现有 assets 路径');
const categoryOptions=[{title:'Data Analytics',value:'data'},{title:'Web Applications',value:'web'},{title:'Interactive Games',value:'game'}];
const stageKeys=['campus','ensure','baynovation','extern','next'];
const isNotVideo=({parent}:any)=>parent?.kind!=='video';
const image=f('image','图片','image',{hidden:({parent}:any)=>!['image','text'].includes(parent?.kind),options:{hotspot:true},validation:(r:any)=>r.custom(async(v:any,ctx:any)=>{if(!v?.asset?._ref)return true;if(!/-(png|jpg|jpeg|webp|avif)$/.test(v.asset._ref))return '请选择 PNG / JPG / WebP / AVIF 图片';const a=await ctx.getClient({apiVersion:'2026-03-01'}).getDocument(v.asset._ref);return !a||a.size<=20*1024*1024||'图片超过20MB，请先压缩';})});
const file=(name:string,title:string,accept:string)=>f(name,title,'file',{options:{accept},validation:(r:any)=>r.custom(async(v:any,ctx:any)=>{if(!v?.asset?._ref)return true;const a=await ctx.getClient({apiVersion:'2026-03-01'}).getDocument(v.asset._ref);return !a||a.size<=100*1024*1024||'文件超过100MB，请先压缩或使用HTTPS媒体地址';})});
const media=defineType({name:'media',title:'媒体',type:'object',components:{input:MediaInput},initialValue:{kind:'image',muted:true,autoplay:false,loop:false},validation:(r:any)=>r.custom((v:any)=>{if(!v)return true;if(v.kind==='image'&&!v.image?.asset&&!v.src)return '请上传图片或填写现有图片地址';if(v.kind==='video'&&!v.video?.asset&&!v.src)return '请上传视频或填写HTTPS视频地址';if(v.kind==='gallery'&&!v.images?.length)return '请添加至少一张画廊图片';if(v.kind==='text'&&!v.body)return '请填写图文正文';return true;}),fields:[
 f('kind','类型','string',{options:{list:[{title:'图片',value:'image'},{title:'视频',value:'video'},{title:'多图画廊',value:'gallery'},{title:'图文说明',value:'text'}]},initialValue:'image',validation:required}),image,
 f('src','现有素材路径 / HTTPS地址','string',{validation:urlValidation,description:'上传素材优先。此字段用于保留已验证的原素材。'}),
 {...file('video','视频文件','video/mp4,video/webm'),hidden:isNotVideo},f('posterImage','视频海报','image',{hidden:isNotVideo,options:{hotspot:true}}),f('poster','现有海报路径','string',{hidden:isNotVideo,validation:urlValidation}),
 f('alt','图片替代文字'),f('caption','媒体说明','text',{rows:2}),f('body','图文正文','text',{rows:4,hidden:({parent}:any)=>parent?.kind!=='text'}),
 f('width','原图宽度','number'),f('height','原图高度','number'),
 f('autoplay','自动播放（静音视频）','boolean',{hidden:isNotVideo,initialValue:false}),f('loop','循环','boolean',{hidden:isNotVideo,initialValue:false}),f('muted','静音','boolean',{hidden:isNotVideo,initialValue:true}),
 f('images','画廊图片','array',{hidden:({parent}:any)=>parent?.kind!=='gallery',of:[defineArrayMember({type:'image',options:{hotspot:true},fields:[f('alt','替代文字'),f('caption','说明')]})]})
],preview:{select:{title:'alt',subtitle:'kind',media:'image'}}});
const link=defineType({name:'contentLink',title:'链接',type:'object',fields:[f('label','标签','string',{validation:required}),f('value','显示文字'),f('url','地址','string',{validation:urlValidation}),f('wide','联系区占整行','boolean')],preview:{select:{title:'label',subtitle:'url'}}});
const project=defineType({name:'project',title:'作品',type:'document',fields:[
 f('title','标题','string',{validation:short}),f('slug','唯一地址','slug',{options:{source:'title',maxLength:80},validation:required}),
 f('year','项目年份（不确定时留空）'),f('category','分类','string',{options:{list:categoryOptions},validation:required}),order,
 f('featured','精选','boolean',{initialValue:false}),f('summary','摘要','text',{rows:3,validation:(r:any)=>r.required().max(260).warning('摘要较长，请检查卡片布局')}),
 f('description','详细介绍','text',{rows:5}),f('caption','原始截图说明 / 数据说明','text',{rows:2}),f('cover','封面','media',{validation:required}),
 f('media','详情媒体（可拖拽排序）','array',{of:[defineArrayMember({type:'media'})]}),f('technologies','技术标签'),
 f('links','项目链接','array',{of:[defineArrayMember({type:'contentLink'})]}),f('statusLabel','项目状态说明'),
 f('returnToCollections','显示返回分类按钮','boolean',{initialValue:false})
],orderings:[{title:'展示顺序',name:'sort',by:[{field:'sortOrder',direction:'asc'}]}],preview:{select:{title:'title',subtitle:'category',media:'cover.image'}}});
const category=defineType({name:'category',title:'分类',type:'document',fields:[f('key','固定舞台位置','string',{options:{list:categoryOptions},validation:required}),f('title','分类标题','string',{validation:short}),f('summary','说明','text',{rows:2}),order,f('representative','代表作品（优先使用该作品封面）','reference',{to:[{type:'project'}],options:{filter:({document}:any)=>({filter:'category == $key',params:{key:document.key}})}}),f('cover','独立分类封面（未选择代表作品时使用）','media'),f('coverHeading','封面附加标题（可换行）','text',{rows:2})],preview:{select:{title:'title'}}});
const experience=defineType({name:'experience',title:'工作 / 教育 / 其他经历',type:'document',fields:[
 f('kind','记录类型','string',{options:{list:['work','education','award','activity','service','brand']},initialValue:'work',validation:required}),
 f('organization','公司或学校','string',{validation:required}),f('role','职位 / 学位 / 活动名称','string',{validation:required}),
 f('startDate','开始日期','date'),f('endDate','结束 / 预计日期','date'),f('current','目前进行中','boolean'),f('expected','预计结束','boolean'),
 f('dateLabel','网页日期说明','string',{description:'保留当前英文写法；修改开始/结束日期时请同步核对本字段。'}),
 f('location','地点'),f('partner','项目合作方（与任职主体分开）'),f('description','工作 / 学习内容','text',{rows:4}),
 f('tags','技能标签','array',{of:[defineArrayMember({type:'string'})]}),order
],preview:{select:{title:'organization',subtitle:'role'}}});
const stage=defineType({name:'storyStage',title:'履历叙事阶段',type:'document',fields:[
 f('key','固定阶段','string',{options:{list:stageKeys},validation:required}),f('title','阶段标题','string',{validation:short}),f('year','年份范围'),f('ghostYear','背景大年份'),f('navLabel','左侧年份按钮'),
 f('primary','主要学校 / 公司记录','reference',{to:[{type:'experience'}],validation:required}),
 f('roles','校园工作 / 补充记录','array',{of:[defineArrayMember({type:'reference',to:[{type:'experience'}]})]}),
 f('description','阶段总结','text',{rows:4,description:'校园阶段留空时合并校园工作说明；其他阶段留空时使用主要记录的说明。'}),
 f('tags','本阶段技能标签','array',{of:[defineArrayMember({type:'string'})],description:'Next chapter保持为空。'})
],preview:{select:{title:'title',subtitle:'year'}}});
const profile=defineType({name:'profile',title:'个人资料',type:'document',fields:[f('name','姓名','string',{validation:required}),f('wordmarkFirst','左上角姓名第一段'),f('wordmarkRest','左上角姓名第二段'),f('introduction','个人简介','text',{rows:4}),f('location','所在地'),f('avatar','头像','media'),file('resume','简历下载（仅上传你确认可公开的版本）','.pdf'),f('resumeUrl','现有简历地址','string',{validation:urlValidation}),f('contacts','联系方式与社交链接','array',{of:[defineArrayMember({type:'contentLink'})]})]});
const copyKeys=['heroTitle','heroIntroduction','heroAsideTitle','heroAsideText','heroMethod','heroSkills','aboutTitle','aboutIntroduction','workTitle','workIntroduction','workIndex','workPrompt','libraryEyebrow','libraryTitle','contactTitle','contactIntroduction','footer','headerTitle','headerSubtitle'];
const copyLabels:Record<string,string>={heroTitle:'首屏三行标题',heroIntroduction:'首屏介绍',heroAsideTitle:'首屏右侧小标题',heroAsideText:'首屏右侧说明',heroMethod:'首屏左下角说明',heroSkills:'首屏技能摘要',aboutTitle:'履历左侧三行标题',aboutIntroduction:'履历简介（主要维护于个人资料）',workTitle:'作品页标题',workIntroduction:'作品页介绍',workIndex:'作品页栏目编号',workPrompt:'打开文件夹提示',libraryEyebrow:'展开舞台小标题',libraryTitle:'展开舞台主标题',contactTitle:'联系页标题',contactIntroduction:'联系页介绍',footer:'页脚签名',headerTitle:'右上角职业方向',headerSubtitle:'右上角身份与所在地'};
const settings=defineType({name:'siteSettings',title:'网站全局设置',type:'document',fields:[f('title','SEO / 浏览器标题','string',{validation:required}),f('description','SEO说明','text',{rows:3}),f('shareImage','分享封面','image',{options:{hotspot:true}}),
 f('copy','网站文案','object',{fields:copyKeys.map(k=>f(k,copyLabels[k],'text',{rows:k.includes('Title')?3:2}))}),
 f('music','可选背景音乐','object',{fields:[f('enabled','启用（访客仍需手动播放）','boolean',{initialValue:false}),file('audio','音频','audio/mpeg,audio/ogg,audio/wav'),f('url','HTTPS音频地址','string',{validation:urlValidation}),f('title','音乐名称'),f('loop','循环','boolean',{initialValue:true}),f('volume','默认音量0–1','number',{validation:(r:any)=>r.min(0).max(1),initialValue:.25})]})]});
export const schemaTypes=[media,link,project,category,experience,stage,profile,settings];

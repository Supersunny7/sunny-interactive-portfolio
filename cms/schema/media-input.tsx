import type {ObjectInputProps} from 'sanity';
export function MediaInput(props:ObjectInputProps){
 const value=props.value as {kind?:string;src?:string;alt?:string;image?:{asset?:unknown}}|undefined;
 const src=value?.src,base=process.env.SANITY_STUDIO_PREVIEW_URL||'https://mingyang-sunny-li.netlify.app';
 const url=src&&(/^(https:\/\/|assets\/)/.test(src))?new URL(src,base).href:'';
 return <div>{url&&value?.kind==='image'&&!value?.image?.asset?<div style={{padding:12,border:'1px solid #bbb6',borderRadius:8,marginBottom:16}}><p style={{fontSize:12,marginTop:0}}>当前网页素材（可在下方上传新图替换）</p><img src={url} alt={value?.alt||'当前图片'} style={{width:'100%',maxHeight:180,objectFit:'contain'}}/></div>:null}{props.renderDefault(props)}</div>;
}

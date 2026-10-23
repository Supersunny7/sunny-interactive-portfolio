export type CategoryKey='data'|'web'|'game';
export interface Media {kind:'image'|'video'|'gallery'|'text';src?:string;alt?:string;width?:number;height?:number;poster?:string;autoplay?:boolean;loop?:boolean;muted?:boolean;caption?:string;body?:string;images?:Media[];position?:string}
export interface Link {label:string;url:string;value?:string;wide?:boolean}
export interface Project {id:string;title:string;slug:string;year:string;category:CategoryKey;sortOrder:number;featured:boolean;summary:string;description:string;caption:string;cover:Media;media:Media[];technologies:string;links:Link[];statusLabel:string;returnToCollections:boolean}
export interface Stage {id:string;index:number;title:string;titleId:string;year:string;ghostYear:string;navLabel:string;organization:string;role:string;dateLabel:string;description:string;roles:{role:string;dateLabel:string}[];tags:string[]}
export interface Category {id:CategoryKey;title:string;summary:string;sortOrder:number;cover:Media;coverHeading:string}
export interface Profile {name:string;wordmarkFirst:string;wordmarkRest:string;introduction:string;location:string;avatar?:Media;resumeUrl:string;contacts:Link[]}
export interface Settings {copy:Record<string,string>;title:string;description:string;shareImage:string;music:{enabled:boolean;url:string;title:string;loop:boolean;volume:number}}
export interface Content {version:number;projects:Project[];categories:Category[];stages:Stage[];profile:Profile;settings:Settings}
export interface Envelope {content:Content;source:'sanity'|'local';preview:boolean;syncTags:string[];live?:{projectId:string;dataset:string;apiVersion:string};revision?:string}

import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../content/normalize';
import {seedDocuments} from '../tools/seed';
test('switching a cover to video ignores its retained image field',()=>{
 const documents=seedDocuments();documents[0].cover={kind:'video',image:{asset:{_ref:'image'}},video:{asset:{_ref:'video'}},posterImage:{asset:{_ref:'poster'}},autoplay:true,muted:true};
 const content=normalize({documents,assets:[{_id:'image',url:'https://cdn.sanity.io/images/x/y/old.png'},{_id:'video',url:'https://cdn.sanity.io/files/x/y/video.mp4'},{_id:'poster',url:'https://cdn.sanity.io/images/x/y/poster.png'}]});
 assert.equal(content.projects[0].cover.kind,'video');assert.match(content.projects[0].cover.src!,/video\.mp4/);assert.match(content.projects[0].cover.poster!,/poster\.png/);
});
test('gallery and text blocks retain ordering and content',()=>{
 const documents=seedDocuments();documents[0].media=[{kind:'text',body:'Verified context'},{kind:'gallery',images:[{asset:{_ref:'image'},alt:'Actual screenshot'}]}];
 const c=normalize({documents,assets:[{_id:'image',url:'https://cdn.sanity.io/images/x/y/image.png'}]});
 assert.equal(c.projects[0].media[0].body,'Verified context');assert.equal(c.projects[0].media[1].images?.[0].alt,'Actual screenshot');
});

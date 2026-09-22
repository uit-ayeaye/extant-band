import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load} from 'cheerio';
import {validateContent,applyChanges,changesBetween,safeLink} from '../lib/content.mjs';
import {renderSite} from '../lib/render.mjs';
import {secretEqual,GitHub} from '../lib/services.mjs';
const c=JSON.parse(readFileSync('content/site.json'));const template=readFileSync('templates/index.html','utf8');
test('current content validates and identifies Oo Japan',()=>{assert.equal(validateContent(c).members[3].name,'Oo Japan');});
test('rejects unsafe URLs, traversal and unexpected fields',()=>{
 for(const s of ['javascript:alert(1)','data:text/html,<script>','//evil.test','https://user:pass@evil.test'])assert.equal(safeLink(s),false);
 assert.throws(()=>applyChanges(c,[{path:'/images/image-1',value:{src:'assets/../secret.png',alt:'',label:''}}]));
 assert.throws(()=>applyChanges(c,[{path:'/__proto__/polluted',value:true}]));
 assert.throws(()=>applyChanges(c,[{path:'/members',value:[{...c.members[0],admin:true}]}]));
 assert.equal({}.polluted,undefined);
});
test('sanitizes markup while escaping plain biography and release content',()=>{
 const n=applyChanges(c,[{path:'/copy/top-13',value:'Hello<script>alert(1)</script><img src=x onerror=alert(1)><strong>world</strong>'},{path:'/members',value:[{...c.members[0],bio:'<script>bad()</script>'}]}]);
 const html=renderSite(template,n);assert(!html.includes('alert(1)'));assert(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));assert(html.includes('<strong>world</strong>'));
});
test('preserves key sets and prevents unknown or duplicate records',()=>{
 assert.throws(()=>applyChanges(c,[{path:'/copy/not-a-key',value:'x'}]));assert.throws(()=>applyChanges(c,[{path:'/members',value:[c.members[0],c.members[0]]}]));
 const n=structuredClone(c);delete n.copy['top-13'];assert.throws(()=>validateContent(n,c));
});
test('build renders current lineup, computed counts, metadata, gallery and hidden sections',()=>{
 const n=structuredClone(c);n.sections.merch=false;n.members[0].name='Edited name';n.gallery=[{id:'live-one',src:'assets/press/live-yangon.jpg',alt:'Show',caption:'New photo'}];
 const $=load(renderSite(template,n));assert.equal($('#merch').length,0);assert.equal($('.gallery-item').length,1);assert.equal($('#gallery').attr('hidden'),undefined);assert.equal($('.member h3').first().text(),'Edited name');assert.equal($('.hero-stats .count').eq(1).attr('data-to'),String(n.releases.reduce((s,r)=>s+r.views,0)));assert(JSON.parse($('[data-band-schema]').text()).member.some(m=>m.name==='Oo Japan'));
});
test('script data cannot escape the embedded JSON',()=>{const n=structuredClone(c);n.releases[0].title='</script><script>alert(99)</script>';const html=renderSite(template,n);assert(!html.includes('</script><script>alert(99)'));assert(html.includes('\\u003c/script>'));});
test('precise diff covers changes and no-ops',()=>{assert.deepEqual(changesBetween(c,c),[]);assert.deepEqual(changesBetween(c,applyChanges(c,[{path:'/seo/title',value:'New title'}])).map(x=>x.path),['/seo/title']);});
test('webhook comparison fails closed',()=>{assert(!secretEqual('',''));assert(!secretEqual('abc','a'));assert(!secretEqual('abc','abd'));assert(secretEqual('abc','abc'));});
test('stale drafts cannot prepare or overwrite GitHub',async()=>{
 const requests=[];const gh=new GitHub({token:'test',repo:'example/band',request:async(url,options)=>{requests.push({url,options});return {object:{sha:'new-head'}};}});
 await assert.rejects(gh.prepare({base:'old-head'},[]),/site changed/);assert.equal(requests.length,1);assert.equal(requests[0].options.method,'GET');
});
test('publishing only writes content and staged uploads, with non-force ref update',async()=>{
 const calls=[];const gh=new GitHub({token:'test',repo:'example/band',request:async(url,options)=>{const body=options.body&&JSON.parse(options.body);calls.push({url,body});if(url.includes('git/ref/'))return {object:{sha:'base'}};if(url.endsWith('git/commits/base'))return {tree:{sha:'base-tree'}};if(url.endsWith('git/trees'))return {sha:'new-tree'};return {sha:'new-commit'};}});
 const sha=await gh.prepare({id:'abc',base:'base',summary:'Edit biography',content:c,createdAt:0},[]);await gh.advance(sha);
 assert.deepEqual(calls.find(x=>x.url.endsWith('git/trees')).body.tree.map(x=>x.path),['content/site.json']);assert.equal(calls.at(-1).body.force,false);assert.deepEqual(calls.find(x=>x.url.endsWith('git/commits')).body.parents,['base']);
});

test('Telegram updates must come from a human in their own private chat',async()=>{
 const {sender}=await import('../lib/bot.mjs');
 const message={from:{id:12345,is_bot:false},chat:{id:12345,type:'private'},text:'edit'};
 assert.equal(sender({message}).id,12345);
 assert.equal(sender({message:{...message,chat:{id:-1,type:'group'}}}),null);
 assert.equal(sender({message:{...message,from:{id:12345,is_bot:true}}}),null);
 assert.equal(sender({callback_query:{from:{id:99999},message,data:'publish:x'}}),null);
 assert.equal(sender({channel_post:message}),null);
});

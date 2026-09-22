import { z } from 'zod';
import { load } from 'cheerio';
const text = z.string().max(6000);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const asset = z.string().regex(/^assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:jpe?g|png|webp|gif|mp4|webm)$/).refine(s=>!s.includes('..'));
const imageAsset=asset.refine(s=>/\.(?:jpe?g|png|webp|gif)$/.test(s),'Use an image file');
const photo = z.union([imageAsset,z.literal('')]);
const video=z.union([asset.refine(s=>/\.(?:mp4|webm)$/.test(s)),z.literal('')]);
export function safeLink(s) {
 if(/^#[A-Za-z][\w-]*$/.test(s))return true;
 try {const u=new URL(s);return ['https:','mailto:','tel:'].includes(u.protocol)&&!u.username&&!u.password&&!/[\r\n]/.test(s);}catch{return false;}
}
const link=z.string().max(2000).refine(safeLink,'Use an HTTPS, email, telephone or section link');
const member=z.object({id,name:text,role:text,bio:text,photo,photoAlt:text}).strict();
const release=z.object({id:z.string().regex(/^[A-Za-z0-9_-]{11}$/),crew:z.array(z.tuple([text,text])).max(30),res:z.enum(['1080p','720p','360p','YouTube']),title:text,sub:text,kind:z.enum(['mv','live','lyric','doc']),kindLabel:text,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s),views:z.number().int().min(0).max(1e10),len:z.string().regex(/^\d{1,3}:\d{2}$/),at:z.number().min(0).max(10000),credits:text,poster:photo,preview:video,video}).strict();
// This editor supports a tiny inline vocabulary, not arbitrary rich HTML.
// Parse first, then reconstruct from escaped text and a fixed tag/attribute list.
// Never serialize user-provided element markup, URLs, styles or event handlers.
export function rich(input) {
 const $=load(input,{},false);
 const allowed=new Set(['br','strong','em','b','i','span','time']);
 const classes=new Set(['tri','accent','nowrap','muted','rec-dot','mono']);
 function render(node){
  if(node.type==='text')return escapeHtml(node.data);
  if(!node.tagName)return '';
  const tag=node.tagName.toLowerCase();
  if(['script','style','iframe','object','svg','math','template'].includes(tag))return '';
  const children=(node.children||[]).map(render).join('');
  if(!allowed.has(tag))return children;
  if(tag==='br')return '<br />';
  let attrs='';
  if(tag==='span'){
   const cls=(node.attribs.class||'').split(/\s+/).filter(c=>classes.has(c)).join(' ');
   if(cls)attrs+=' class="'+cls+'"';
  }
  if(['span','i'].includes(tag)&&['true','false'].includes(node.attribs['aria-hidden']))attrs+=' aria-hidden="'+node.attribs['aria-hidden']+'"';
  if(tag==='time'&&/^\d{4}-\d{2}-\d{2}$/.test(node.attribs.datetime||''))attrs+=' datetime="'+node.attribs.datetime+'"';
  return '<'+tag+attrs+'>'+children+'</'+tag+'>';
 }
 return $.root().contents().toArray().map(render).join('');
}
export const schema=z.object({version:z.literal(1),seo:z.object({title:text,description:text}).strict(),stats:z.object({followersThousands:z.number().min(0).max(1e7),foundedYear:z.number().int().min(1900).max(2100)}).strict(),sections:z.record(id,z.boolean()),copy:z.record(id,text),links:z.record(id,z.object({href:link,label:text}).strict()),images:z.record(id,z.object({src:imageAsset,alt:text,label:text}).strict()),members:z.array(member).min(1).max(20),releases:z.array(release).max(100),gallery:z.array(z.object({id,src:imageAsset,alt:text,caption:text}).strict()).max(100)}).strict();
export function validateContent(value, baseline) {
 if(JSON.stringify(value).length>250000)throw Error('Content exceeds 250 KB');
 const c=schema.parse(value);
 for(const key of ['members','releases','gallery'])if(new Set(c[key].map(x=>x.id)).size!==c[key].length)throw Error(`Duplicate ${key} ID`);
 if(baseline)for(const key of ['copy','links','images','sections']){
  if(JSON.stringify(Object.keys(c[key]).sort())!==JSON.stringify(Object.keys(baseline[key]).sort()))throw Error(`Keep the existing ${key} keys; hide sections or clear text instead`);
 }
 for(const [key,html] of Object.entries(c.copy))c.copy[key]=rich(html);
 return c;
}
export function applyChanges(content,changes) {
 if(!Array.isArray(changes)||changes.length>40)throw Error('Use 1–40 changes per request');
 const next=structuredClone(content);
 for(const change of changes){
  const {path,value}=change;
  // Deliberately shallow: no arbitrary JSON pointers, prototype mutation or filesystem paths.
  if(!/^\/(seo\/(title|description)|stats\/(followersThousands|foundedYear)|(?:copy|links|images|sections)\/[a-z0-9-]+|members|releases|gallery)$/.test(path))throw Error('Unsupported content path');
  const parts=path.slice(1).split('/');
  if(parts.length===1)next[parts[0]]=value;
  else {if(!Object.hasOwn(next[parts[0]],parts[1]))throw Error('Unknown content key');next[parts[0]][parts[1]]=value;}
 }
 return validateContent(next,content);
}
export function changesBetween(a,b) {
 const result=[];
 for(const key of ['seo','stats','copy','links','images','sections'])for(const sub of Object.keys(a[key]))if(JSON.stringify(a[key][sub])!==JSON.stringify(b[key][sub]))result.push({path:`/${key}/${sub}`,before:a[key][sub],after:b[key][sub]});
 for(const key of ['members','releases','gallery'])if(JSON.stringify(a[key])!==JSON.stringify(b[key]))result.push({path:`/${key}`,before:a[key],after:b[key]});
 return result;
}
export const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

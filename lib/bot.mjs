import {randomBytes} from 'node:crypto';
import {GitHub,env,tell,telegram,propose,digest} from './services.mjs';
import {get,put,claim,release,store} from './store.mjs';
import {stagePhoto} from './media.mjs';
import {changesBetween,validateContent} from './content.mjs';
export const owners=()=>env('OWNER_TELEGRAM_IDS').split(',').map(s=>s.trim()).filter(Boolean);
export async function roleFor(id){if(owners().includes(String(id)))return 'owner';return (await get(`access/${id}`))?.role==='editor'?'editor':null;}
export function sender(update){const cb=update.callback_query;const m=cb?.message||update.message;const user=cb?.from||m?.from;if(!m||!user||user.is_bot||m.chat.type!=='private'||m.chat.id!==user.id)return null;return {id:user.id,chat:m.chat.id,message:m,callback:cb};}
const HELP=`EXTANT • Site Manager\n\nSend an edit in English or Burmese, or a photo with a caption describing where it goes. I will create a draft first.\n\nExamples:\n• Update Oo Japan’s bio to …\n• Remove the gallery photo captioned …\n• Hide the merch section\n\n/draft — preview and review changes\n/publish — publish the current draft\n/cancel — discard your draft\n/history — previous content versions\n/rollback COMMIT — preview restoring a version\n/status — GitHub build and live site\n/whoami — your Telegram ID\n/privacy — data handling\n/help — this guide\n\nOwners: /access, /grant ID, /revoke ID\n\nContent edits are supported. Layout, code, domains and credentials need a developer.`;
export async function activeDraft(user){const active=await get(`active/${user}`);if(!active)return null;const d=await get(`drafts/${active.id}`);return d&&d.user===user&&d.expiresAt>Date.now()&&d.state==='draft'?d:null;}
export async function showDraft(d,chat){
 const token=d.previewToken;const diff=changesBetween(d.original,d.content);
 const lines=diff.map(x=>`${x.path}\nBefore: ${JSON.stringify(x.before)}\nAfter: ${JSON.stringify(x.after)}`).join('\n\n');
 await tell(chat,`DRAFT — ${d.summary}\n\n${diff.length} changed content areas. Review the complete change report and preview below. Nothing is published yet.`,{reply_markup:{inline_keyboard:[[{text:'Preview website',url:`${env('BOT_BASE_URL')}/preview/${token}`},{text:'Full change report',url:`${env('BOT_BASE_URL')}/preview/${token}?diff=1`}],[{text:'Publish',callback_data:`publish:${d.id}`},{text:'Cancel',callback_data:`cancel:${d.id}`}]]}});
 if(lines.length<=3000)await tell(chat,lines);
}
async function publishDraft(d,user,chat,gh){
 if(d.user!==user)throw Error('This draft belongs to another editor');
 const active=await get(`active/${user}`);if(active?.id!==d.id)throw Error('This draft was replaced or cancelled. Use /draft.');
 if(d.expiresAt<Date.now())throw Error('This draft expired. Send your request again.');
 const lock=await claim(`locks/publish/${d.id}`,180000);if(!lock){await tell(chat,'This publish is already running. Use /status shortly.');return;}
 try{
  d=await get(`drafts/${d.id}`);
  if(d.state==='published'){await tell(chat,`Already committed: ${d.commit.slice(0,7)}. Use /status for deployment.`);return;}
  if(d.state==='cancelled')throw Error('Draft cancelled');
  if(d.commit&&await gh.contains(d.commit)){d.state='published';await put(`drafts/${d.id}`,d);await tell(chat,`Confirmed published commit ${d.commit.slice(0,7)}. Use /status.`);return;}
  if(await gh.head()!==d.base)throw Error('The site changed after your preview. Use /cancel and request this edit again.');
  const files=[];
  for(const path of d.uploads){const id=path.match(/\/([a-f0-9]{32})\.webp$/)?.[1];const upload=await get(`uploads/${id}`);if(!upload||upload.user!==user||upload.path!==path)throw Error('A draft photo has expired. Upload it again.');files.push({path,data:upload.data});}
  // Save the exact prepared commit BEFORE advancing the ref: a retry can recover an uncertain write.
  if(!d.commit){d.commit=await gh.prepare(d,files);await put(`drafts/${d.id}`,d);}
  await put(`commits/${d.commit}`,{chat,user,draftId:d.id,createdAt:Date.now()});
  await gh.advance(d.commit);
  d.state='published';await put(`drafts/${d.id}`,d);
  await tell(chat,`Saved to GitHub: ${d.commit.slice(0,7)}\n${`https://github.com/${gh.repo}/commit/${d.commit}`}\n\nGitHub Pages is building. I’ll send the deployment result; /status also checks progress.\nUse /history to restore older content.`);
 }finally{await release(`locks/publish/${d.id}`,lock);}
}
async function cancelDraft(d,user,chat){if(!d||d.user!==user)throw Error('No current draft');const lock=await claim(`locks/publish/${d.id}`);if(!lock)throw Error('Publishing is already running; check /status');try{const fresh=await get(`drafts/${d.id}`);if(fresh.state==='published'||fresh.commit)throw Error('This draft has entered publishing. Use /status and /history.');await put(`drafts/${d.id}`,{...fresh,state:'cancelled'});await put(`active/${user}`,{id:null});await tell(chat,'Draft cancelled. The live site has not changed.');}finally{await release(`locks/publish/${d.id}`,lock);}}
export async function handleUpdate(update){
 const who=sender(update);if(!who)return;const {id,chat,message,callback}=who;const role=await roleFor(id);
 const text=(message.text||message.caption||'').trim();const [raw,...args]=text.split(/\s+/);const command=(raw||'').split('@')[0].toLowerCase();
 if(callback)await telegram('answerCallbackQuery',{callback_query_id:callback.id});
 if(!callback&&['/whoami','/start'].includes(command)&&!role){await tell(chat,`Your Telegram ID: ${id}\nAsk the site owner to approve this ID. Only approved editors can manage the site.`);return;}
 if(!role){await tell(chat,'This bot is private. Send /whoami and ask the site owner for access.');return;}
 const gh=new GitHub();
 if(callback){const [action,draftId]=callback.data?.split(':')||[];if(!/^[a-f0-9]{24}$/.test(draftId||''))return;const d=await get(`drafts/${draftId}`);if(!d||d.user!==id)throw Error('Draft not found');if(action==='publish')await publishDraft(d,id,chat,gh);else if(action==='cancel')await cancelDraft(d,id,chat);return;}
 if(['/start','/help'].includes(command)){await tell(chat,HELP);return;}
 if(command==='/whoami'){await tell(chat,`Your Telegram ID: ${id}\nRole: ${role}`);return;}
 if(command==='/privacy'){await tell(chat,'Edit requests and current public website content are sent to DeepSeek to prepare changes. Drafts and processed photos are stored temporarily in Netlify. Publishing puts content and photos in the public GitHub repository and on extant.band. Photo metadata is stripped. Removing a photo hides it from the page; previous Git versions retain it. Do not upload private information. Drafts expire after 24 hours; temporary records are cleaned after seven days.');return;}
 if(['/grant','/revoke','/access'].includes(command)){
  if(role!=='owner')throw Error('Only the owner can manage access');
  if(command==='/access'){const {blobs}=await store().list({prefix:'access/'});const users=await Promise.all(blobs.map(b=>get(b.key)));await tell(chat,`Owners: ${owners().join(', ')}\nEditors: ${users.filter(u=>u.role==='editor').map(u=>u.id).join(', ')||'none'}\n\nAsk clients to send /whoami, then /grant THEIR_ID. /revoke THEIR_ID removes editing access.`);return;}
  const target=args[0];if(!/^\d{5,16}$/.test(target||''))throw Error('Use /grant NUMERIC_ID or /revoke NUMERIC_ID');
  if(owners().includes(target))throw Error('Owner access is managed in server configuration');
  await put(`access/${target}`,{id:target,role:command==='/grant'?'editor':'revoked',by:id,updatedAt:Date.now()});
  await put(`audit/${Date.now()}-${randomBytes(4).toString('hex')}`,{action:command,target,by:id,createdAt:Date.now()});
  await tell(chat,`${command==='/grant'?'Editor access enabled':'Editor access removed'} for Telegram ID ${target}.`);return;
 }
 if(command==='/status'){
  const head=await gh.head(),runs=await gh.status();const run=runs.find(r=>r.head_sha===head);
  let live='unknown';try{const r=await fetch(`${env('SITE_URL')}/revision.json?t=${Date.now()}`,{signal:AbortSignal.timeout(10000)});if(r.ok)live=(await r.json()).commit;}catch{}
  await tell(chat,`GitHub: ${head.slice(0,7)}\nLatest build: ${run?`${run.status} / ${run.conclusion||'pending'}`:'queued or not started'}\nLive site revision: ${String(live).slice(0,7)}\n${run?.html_url||`https://github.com/${gh.repo}/actions`}\n${env('SITE_URL')}`);return;
 }
 if(command==='/history'){const history=await gh.history();await tell(chat,'CONTENT HISTORY\n\n'+history.map(h=>`${h.sha.slice(0,7)} · ${h.commit.author.date.slice(0,10)}\n${h.commit.message.split('\n')[0]}`).join('\n\n')+'\n\n/rollback COMMIT creates a draft. Review and publish to restore it. Code and credentials stay unchanged.');return;}
 const current=await activeDraft(id);
 if(command==='/draft'){if(current)await showDraft(current,chat);else await tell(chat,'No pending draft. Send an edit request or a photo with a caption.');return;}
 if(command==='/publish'){if(!current)throw Error('No draft to publish');await publishDraft(current,id,chat,gh);return;}
 if(command==='/cancel'){await put(`question/${id}`,null);if(current)await cancelDraft(current,id,chat);else await tell(chat,'Request cancelled. Send a new request when ready.');return;}
 if(command.startsWith('/')&&command!=='/rollback'){await tell(chat,'Unknown command. Use /help, or describe an edit without a slash.');return;}
 if(text.length>5000)throw Error('Please keep each request under 5,000 characters');
 const minute=Math.floor(Date.now()/60000),rate=await get(`rate/${id}/${minute}`)||{count:0};if(rate.count>=5)throw Error('Please wait a minute before another edit request');await put(`rate/${id}/${minute}`,{count:rate.count+1,createdAt:Date.now()});
 const snap=await gh.snapshot();
 if(current&&current.base!==snap.sha)throw Error('The live content changed since your pending draft. /cancel it and send your request again.');
 const pendingQuestion=await get(`question/${id}`);
 const pending=pendingQuestion&&Date.now()-pendingQuestion.createdAt<3600000?pendingQuestion:null;
 let uploads=[...new Set([...(current?.uploads||[]),...(pending?.uploads||[])])],result;
 if(command==='/rollback'){const restored=validateContent(await gh.restore(args[0]||''),snap.content);result={content:restored,summary:`Restore content from ${args[0]}`};uploads=[];}
 else {
  if(!text)throw Error('Please add a caption describing the photo and where it should go.');
  if(message.photo||message.document){const path=await stagePhoto(message,id);uploads=[...uploads,path];if(uploads.length>10)throw Error('Publish or cancel this draft before uploading more photos');}
  await tell(chat,'Preparing your draft…');
  result=await propose(current?.content||snap.content,pending?`Earlier request: ${pending.text}\nClarification asked: ${pending.question}\nUser reply: ${text}`:text,uploads);
  if(result.question){await put(`question/${id}`,{text,question:result.question,uploads,createdAt:Date.now()});await tell(chat,result.question+'\n\nReply with these details, or use /cancel to start over.');return;}
 }
 const refs=new Set([...Object.values(result.content.images).map(x=>x.src),...result.content.members.map(x=>x.photo),...result.content.gallery.map(x=>x.src),...result.content.releases.flatMap(x=>[x.poster,x.preview,x.video])].filter(Boolean));
 const oldRefs=new Set([...Object.values(snap.content.images).map(x=>x.src),...snap.content.members.map(x=>x.photo),...snap.content.gallery.map(x=>x.src),...snap.content.releases.flatMap(x=>[x.poster,x.preview,x.video])].filter(Boolean));
 for(const path of refs)if(!oldRefs.has(path)&&!uploads.includes(path)&&!await gh.hasAsset(path,snap.sha))throw Error('A photo or media file does not exist. Upload it first.');
 if(!changesBetween(snap.content,result.content).length){await tell(chat,'The proposed content is identical to the live content. No draft was created.');return;}
 const draftId=randomBytes(12).toString('hex'),previewToken=randomBytes(32).toString('hex');
 const draft={id:draftId,user:id,chat,base:snap.sha,original:snap.content,content:result.content,summary:result.summary,uploads:uploads.filter(p=>refs.has(p)),state:'draft',createdAt:Date.now(),expiresAt:Date.now()+86400000,previewToken};
 await put(`drafts/${draftId}`,draft);await put(`previews/${digest(previewToken)}`,{id:draftId,createdAt:Date.now()});await put(`active/${id}`,{id:draftId});
 await put(`question/${id}`,null);
 await showDraft(draft,chat);
}

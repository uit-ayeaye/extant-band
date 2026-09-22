import {env,tell} from '../../lib/services.mjs';
import {store,get,put} from '../../lib/store.mjs';
import {sender} from '../../lib/bot.mjs';
export default async()=>{
 const s=store();const now=Date.now();
 // Recover durable jobs after an interrupted function. Do not repeat completed requests.
 const {blobs:jobs}=await s.list({prefix:'jobs/'});
 for(const entry of jobs.slice(-100)){
  const j=await get(entry.key);if(!j||j.state==='done'||now-j.createdAt<300000)continue;
  if(j.attempts>=3||now-j.createdAt>86400000){await put(entry.key,{...j,state:'done',failed:true});const who=sender(j.update);if(who)await tell(who.chat,'An interrupted request could not be completed. Use /draft or /status to check progress, then resend it.');continue;}
  await fetch(`${env('BOT_BASE_URL')}/.netlify/functions/process-background`,{method:'POST',headers:{Authorization:`Bearer ${env('INTERNAL_SECRET')}`,'Content-Type':'application/json'},body:JSON.stringify({key:entry.key}),signal:AbortSignal.timeout(5000)});
 }
 // Time-limited records only; Git history and editor access are never deleted here.
 for(const prefix of ['jobs/','uploads/','drafts/','previews/','question/','rate/','notifications/','commits/']){
  const {blobs}=await s.list({prefix});for(const entry of blobs.slice(0,150)){const item=await get(entry.key);if(item?.createdAt&&now-item.createdAt>7*86400000)await s.delete(entry.key);}
 }
};
export const config={schedule:'*/10 * * * *'};

import {env,secretEqual} from '../../lib/services.mjs';
import {sender,roleFor} from '../../lib/bot.mjs';
import {get,put} from '../../lib/store.mjs';
export default async (req:Request) => {
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 if(!secretEqual(req.headers.get('X-Telegram-Bot-Api-Secret-Token'),env('TELEGRAM_WEBHOOK_SECRET')))return new Response('Unauthorized',{status:401});
 if(Number(req.headers.get('content-length'))>100000)return new Response('Too large',{status:413});
 const raw=await req.text();if(raw.length>100000)return new Response('Too large',{status:413});
 let update;try{update=JSON.parse(raw);}catch{return new Response('Invalid JSON',{status:400});}
 if(!Number.isSafeInteger(update.update_id)||update.update_id<0)return new Response('Invalid update',{status:400});
 const who=sender(update);if(!who)return new Response('Ignored');
 // Unknown users can discover their own ID, but cannot invoke AI or GitHub.
 if(!await roleFor(who.id)&&!/^\/(start|whoami)(?:\s|@|$)/.test(who.message.text||''))return new Response('Ignored');
 const key=`jobs/${update.update_id}`;const prior=await get(key);if(prior?.state==='done')return new Response('OK');
 if(!prior)await put(key,{update,state:'queued',createdAt:Date.now(),attempts:0},{onlyIfNew:true});
 const response=await fetch(`${env('BOT_BASE_URL')}/.netlify/functions/process-background`,{method:'POST',headers:{Authorization:`Bearer ${env('INTERNAL_SECRET')}`,'Content-Type':'application/json'},body:JSON.stringify({key}),signal:AbortSignal.timeout(10000)});
 return new Response(response.ok?'OK':'Retry later',{status:response.ok?200:503});
};
export const config={path:'/api/telegram'};

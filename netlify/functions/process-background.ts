import {env,secretEqual,tell} from '../../lib/services.mjs';
import {handleUpdate,sender} from '../../lib/bot.mjs';
import {get,put,claim,release} from '../../lib/store.mjs';
export default async (req:Request) => {
 if(!env('INTERNAL_SECRET')||!secretEqual(req.headers.get('Authorization'),`Bearer ${env('INTERNAL_SECRET')}`))return new Response('Unauthorized',{status:401});
 const {key}=await req.json();if(!/^jobs\/\d+$/.test(key))return;
 const lock=await claim(`locks/${key}`,240000);if(!lock)return;
 try{
  const job=await get(key);if(!job||job.state==='done')return;
  const who=sender(job.update);if(!who){await put(key,{...job,state:'done'});return;}
  const userLock=await claim(`locks/user/${who.id}`,180000);if(!userLock){await put(key,{...job,state:'queued'});throw Error('User busy');}
  try{
   await put(key,{...job,state:'running',attempts:job.attempts+1});
   try{await handleUpdate(job.update);await put(key,{...job,state:'done',finishedAt:Date.now()});}
   catch(error){
    // Never log requests, tokens, file URLs, model output, or provider bodies.
    console.error('Bot operation failed',error instanceof Error?error.name:'Error');
    const message=error instanceof Error&&error.name!=='ZodError'?error.message:'The proposed content did not pass validation. Please make a smaller, more specific request.';
    await tell(who.chat,`Could not complete the request: ${message}\n\nUse /draft or /status to check saved progress before retrying.`);
    await put(key,{...job,state:'done',failed:true,finishedAt:Date.now()});
   }
  }finally{await release(`locks/user/${who.id}`,userLock);}
 }finally{await release(`locks/${key}`,lock);}
};

import {createHmac} from 'node:crypto';
import {env,secretEqual,tell} from '../../lib/services.mjs';
import {get,put,claim,release} from '../../lib/store.mjs';
export default async(req:Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const raw=await req.text();if(raw.length>500000)return new Response('Too large',{status:413});
 if(!env('GITHUB_WEBHOOK_SECRET'))return new Response('Not configured',{status:503});
 const sig='sha256='+createHmac('sha256',env('GITHUB_WEBHOOK_SECRET')).update(raw).digest('hex');
 if(!secretEqual(req.headers.get('x-hub-signature-256'),sig))return new Response('Unauthorized',{status:401});
 const payload=JSON.parse(raw);if(req.headers.get('x-github-event')!=='workflow_run'||payload.action!=='completed')return new Response('OK');
 const run=payload.workflow_run;if(payload.repository.full_name!==env('GITHUB_REPOSITORY')||run.head_branch!==(env('GITHUB_BRANCH')||'main')||run.path!=='.github/workflows/pages.yml')return new Response('Ignored');
 const key=`notifications/${run.id}-${run.run_attempt}`;if(await get(key))return new Response('OK');
 const target=await get(`commits/${run.head_sha}`);if(!target)return new Response('OK');
 const lock=await claim(`locks/${key}`,60000);if(!lock)return new Response('Busy',{status:503});
 try{
  if(await get(key))return new Response('OK');
  const ok=run.conclusion==='success';await tell(target.chat,`${ok?'DEPLOYED':'DEPLOYMENT '+String(run.conclusion).toUpperCase()} — ${run.head_sha.slice(0,7)}\n${ok?'Your content is now published.':'The Git commit is saved. Check the build log; the site may still show the previous successful deployment.'}\n${ok?env('SITE_URL'):run.html_url}\n\n/history lets you restore a previous content version.`);
  await put(key,{createdAt:Date.now()});return new Response('OK');
 }finally{await release(`locks/${key}`,lock);}
};
export const config={path:'/api/github'};

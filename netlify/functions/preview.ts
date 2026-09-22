import {roleFor} from '../../lib/bot.mjs';
import {readFile} from 'node:fs/promises';
import {get} from '../../lib/store.mjs';
import {digest,env} from '../../lib/services.mjs';
import {renderSite} from '../../lib/render.mjs';
import {changesBetween,escapeHtml as e} from '../../lib/content.mjs';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export default async(req:Request,context:any)=>{
 const token=context.params.token;if(!/^[a-f0-9]{64}$/.test(token||''))return new Response('Not found',{status:404,headers});
 const pointer=await get(`previews/${digest(token)}`);const d=pointer&&await get(`drafts/${pointer.id}`);
 if(!d||d.expiresAt<Date.now()||d.state!=='draft'||!await roleFor(d.user))return new Response('This draft has expired, been cancelled or published.',{status:404,headers});
 const url=new URL(req.url);const media=url.searchParams.get('media');
 if(media){const path=`assets/uploads/${media}.webp`;if(!/^[a-f0-9]{32}$/.test(media)||!d.uploads.includes(path))return new Response('Not found',{status:404,headers});const f=await get(`uploads/${media}`);if(!f||f.user!==d.user)return new Response('Not found',{status:404,headers});return new Response(Buffer.from(f.data,'base64'),{headers:{...headers,'Content-Type':'image/webp'}});}
 if(url.searchParams.has('diff')){const changes=changesBetween(d.original,d.content);return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>EXTANT — Draft changes</title><style>body{font:16px/1.6 system-ui;max-width:1000px;margin:40px auto;padding:20px;background:#0a0e12;color:#eee}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#171d23;padding:20px}h2{color:#c5ff32}</style><h1>${e(d.summary)}</h1><p>Review every change. Publishing is available only inside Telegram.</p>${changes.map(x=>`<h2>${e(x.path)}</h2><h3>Before</h3><pre>${e(JSON.stringify(x.before,null,2))}</pre><h3>After</h3><pre>${e(JSON.stringify(x.after,null,2))}</pre>`).join('')}</html>`,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"}});}
 let html=renderSite(await readFile('templates/index.html','utf8'),d.content,{assetBase:env('SITE_URL')+'/',preview:true});
 for(const path of d.uploads)html=html.replaceAll(path,`${env('BOT_BASE_URL')}/preview/${token}?media=${path.split('/').at(-1).replace('.webp','')}`);
 return new Response(html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; base-uri ${env('SITE_URL')}; script-src 'unsafe-inline' ${env('SITE_URL')}; style-src 'unsafe-inline' ${env('SITE_URL')} https://fonts.googleapis.com; img-src 'self' ${env('SITE_URL')} https://i.ytimg.com data:; media-src ${env('SITE_URL')}; font-src ${env('SITE_URL')} https://fonts.gstatic.com; frame-ancestors 'none'; form-action 'none'`}});
};
export const config={path:'/preview/:token'};

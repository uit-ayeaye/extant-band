import {getStore} from '@netlify/blobs';
export const store=()=>getStore({name:'extant-manager',consistency:'strong'});
export async function get(key){return store().get(key,{type:'json'});}
export async function put(key,data,options={}){return store().setJSON(key,data,options);}
// Conditional writes prevent two webhook deliveries claiming the same job/draft.
export async function claim(key,ttl=180000){
 const s=store(),old=await s.getWithMetadata(key,{type:'json'});
 if(old?.data.until>Date.now())return null;
 const result=await s.setJSON(key,{until:Date.now()+ttl},{...(old?{onlyIfMatch:old.etag}:{onlyIfNew:true})});
 return result.modified?result.etag:null;
}
export async function release(key,etag){await put(key,{until:0},{onlyIfMatch:etag});}

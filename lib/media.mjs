import {randomBytes} from 'node:crypto';
import {telegram,env} from './services.mjs';
import {put} from './store.mjs';
export async function stagePhoto(message,user){
 const {default:sharp}=await import('sharp');
 const f=message.photo?.at(-1)||message.document;
 if(!f||!message.photo&&!/^image\/(jpeg|png|webp)$/.test(f.mime_type||''))throw Error('Send a JPEG, PNG or WebP photo, up to 8 MB.');
 if(f.file_size>8*1024*1024)throw Error('Photo limit is 8 MB.');
 const file=await telegram('getFile',{file_id:f.file_id});
 if(!file.file_path||file.file_path.includes('..'))throw Error('Invalid Telegram file');
 const response=await fetch(`https://api.telegram.org/file/bot${env('TELEGRAM_BOT_TOKEN')}/${file.file_path}`,{signal:AbortSignal.timeout(30000)});
 if(!response.ok||Number(response.headers.get('content-length'))>8*1024*1024)throw Error('Could not download the photo');
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>8*1024*1024){throw Error('Photo limit is 8 MB.');}chunks.push(chunk);}
 const data=await sharp(Buffer.concat(chunks),{limitInputPixels:40000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
 const id=randomBytes(16).toString('hex');const path=`assets/uploads/${id}.webp`;
 // Re-encoding verifies image bytes, removes EXIF and never allows active SVG/HTML.
 await put(`uploads/${id}`,{user,path,data:data.toString('base64'),createdAt:Date.now()});
 return path;
}

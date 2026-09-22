import {load} from 'cheerio';
import {validateContent,escapeHtml as e} from './content.mjs';
export function renderSite(template,input,{assetBase='',preview=false,revision=''}={}) {
 const c=validateContent(input);const $=load(template);
 $('[data-copy]').each((i,el)=>{const k=$(el).attr('data-copy');if(c.copy[k]!==undefined)$(el).html(c.copy[k]);});
 $('[data-link]').each((i,el)=>{const v=c.links[$(el).attr('data-link')];if(v)$(el).attr('href',v.href);});
 $('[data-image]').each((i,el)=>{const v=c.images[$(el).attr('data-image')];if(v)$(el).attr({src:v.src,alt:v.alt});});
 for(const [id,visible]of Object.entries(c.sections))if(!visible)$(`section#${id}`).remove();
 $('[data-members]').html(c.members.map(m=>`<article class="member" data-reveal>${m.photo?`<img class="member-photo" src="${e(m.photo)}" alt="${e(m.photoAlt)}" loading="lazy">`:''}<p class="member-role">${e(m.role)}</p><h3>${e(m.name)}</h3><p>${e(m.bio)}</p></article>`).join(''));
 if(c.gallery.length){$('#gallery').removeAttr('hidden');$('[data-gallery]').html(c.gallery.map(g=>`<figure class="gallery-item"><img src="${e(g.src)}" alt="${e(g.alt)}" loading="lazy"><figcaption>${e(g.caption)}</figcaption></figure>`).join(''));}
 $('.chip').each((i,el)=>{const kind=$(el).attr('data-filter');$(el).find('b').text(c.releases.filter(r=>kind==='all'||r.kind===kind).length);});
 const counts=[c.stats.followersThousands,c.releases.reduce((s,r)=>s+r.views,0),c.releases.length,new Date().getUTCFullYear()-c.stats.foundedYear];
 $('.hero-stats .count').each((i,el)=>$(el).attr('data-to',counts[i]).text(counts[i]));
 $('title').text(c.seo.title);$('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').attr('content',c.seo.description);
 $('meta[property="og:title"],meta[name="twitter:title"]').attr('content',c.seo.title);
 const band=JSON.parse($('[data-band-schema]').text());band.member=c.members.map(m=>({'@type':'Person',name:m.name,roleName:m.role}));band.description=c.seo.description;band.foundingDate=String(c.stats.foundedYear);
 $('[data-band-schema]').text(JSON.stringify(band).replace(/</g,'\\u003c'));
 $('script[src*="js/content.js"]').replaceWith(`<script>window.EXTANT_RELEASES=${JSON.stringify(c.releases).replace(/</g,'\\u003c')};</script>`);
 $('script[src^="js/"],link[href^="css/"]').each((i,el)=>{const attr=el.tagName==='script'?'src':'href';$(el).attr(attr,$(el).attr(attr).split('?')[0]+'?v='+encodeURIComponent(revision||'22'));});
 $('head').append(`<meta name="extant-revision" content="${e(revision)}">`);
 if(assetBase)$('head').prepend(`<base href="${e(assetBase)}">`);
 if(preview){$('head').append('<meta name="robots" content="noindex,nofollow">');$('body').prepend('<div class="preview-notice">Private draft preview — publish or cancel in Telegram.</div>');}
 $('[data-copy],[data-link],[data-image]').removeAttr('data-copy data-link data-image');
 return $.html();
}

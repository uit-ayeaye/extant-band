// One-time migration of the original static site. Kept for provenance; do not rerun.
import fs from 'node:fs';
import vm from 'node:vm';
import { load } from 'cheerio';
const $ = load(fs.readFileSync('index.html','utf8'));
const js = fs.readFileSync('js/main.js','utf8');
const releases = vm.runInNewContext(js.match(/var RELEASES = (\[[\s\S]*?\n  \]);/)[1]);
const decode = s => load('<p>'+s+'</p>')('p').text();
for(const r of releases){r.credits=decode(r.credits);r.crew=r.crew.map(pair=>pair.map(decode));r.poster=`assets/poster/${r.id}.jpg`;r.preview=`assets/preview/${r.id}.mp4`;r.video=`assets/full/${r.id}.webm`;}
const members=[];
$('.member').each((i,el)=>{const e=$(el);members.push({id:['novem-htoo','pz','min-khant','oo-japan'][i],name:e.find('h3').text(),role:e.find('.member-role').text(),bio:e.find('p').last().text().replace(/\s+/g,' ').trim(),photo:'',photoAlt:''});});
members[0].bio='EXTANT’s vocalist and the winner of The Voice Myanmar in 2019. His blind audition brought Slipknot’s “Spit It Out” to national television. Before EXTANT, he sang with Myanmar metal band Nightmare; his work also includes solo releases and collaborations across the local rock scene.';
members[3].name='Oo Japan';members[3].role='Drums · Idiots';members[3].bio='Oo Japan, known as Japan of the Myanmar rock band Idiots, plays drums with EXTANT. Credited as “Japan Idiots” on P Tripper, Dog Eat Dog and Main Character Syndrome, he connects the band’s rhythm section with Myanmar’s wider rock scene.';
$('.unit-grid').empty().attr('data-members','');
$('#unit-h').html('The current<br>lineup');
$('#unit .sect-note').text('Novem Htoo, PZ, Min Khant and Oo Japan — the four players credited on the band’s recent music videos. Oo Japan is also known for his work with Idiots.');
$('.drop-credits li').each((i,el)=>{if($(el).text().includes('Japan Idiots'))$(el).html('<span>Drums</span> Oo Japan (Idiots)');});
// Preserve historically transcribed video credits, but use the current display name on the page.
$('li').each((i,el)=>{if($(el).text().trim()==='Drums Japan Idiots')$(el).html('<span>Drums</span> Oo Japan (Idiots)');});
const content={version:1,seo:{title:$('title').text(),description:$('meta[name="description"]').attr('content')},stats:{followersThousands:28,foundedYear:2015},sections:{},copy:{},links:{},images:{},members,releases,gallery:[]};
$('main > section').each((i,el)=>{content.sections[$(el).attr('id')]=true;});
let n=0;
$('h1,h2,h3,h4,p,figcaption,dt,dd,a,button,span,li').each((i,el)=>{
 const e=$(el);if(e.closest('script,style,#modal,.unit-grid,.hero-stats,.filters,.ticker').length||e.parents('[data-copy]').length||!e.text().trim())return;
 if(e.find('img,video,a,button,input,ul,ol,div,p,h1,h2,h3,h4,svg').length)return;
 // Interactive attributes remain in the fixed template, never in AI-authored markup.
 if(e.find('[id],[data-yt],[data-text],.count').length||e.is('.count,[data-text]'))return;
 const section=e.closest('section').attr('id')||'global';const id=`${section}-${++n}`;
 content.copy[id]=e.html().trim();e.attr('data-copy',id);
});
n=0;$('a[href]').each((i,el)=>{const e=$(el);if(e.closest('#modal').length)return;const id=`link-${++n}`;content.links[id]={href:e.attr('href'),label:e.text().replace(/\s+/g,' ').trim()};e.attr('data-link',id);});
n=0;$('img').each((i,el)=>{const e=$(el);const id=`image-${++n}`;content.images[id]={src:e.attr('src'),alt:e.attr('alt')||'',label:(e.closest('section').attr('id')||'global')+' / '+(e.attr('alt')||'background')};e.attr('data-image',id);});
$('script[src="js/main.js?v=21"]').before('<script src="js/content.js"></script>');
$('script[type="application/ld+json"]').attr('data-band-schema','');
$('section#history').before('<section class="sect gallery" id="gallery" aria-labelledby="gallery-h" hidden><div class="wrap"><div class="sect-head"><div><p class="sect-label">Photo archive</p><h2 class="sect-title" id="gallery-h">On stage. Off guard.</h2></div></div><div class="gallery-grid" data-gallery></div></div></section>');
fs.writeFileSync('templates/index.html',$.html());
fs.writeFileSync('content/site.json',JSON.stringify(content,null,2)+'\n');
fs.writeFileSync('js/main.js',js.replace(/var RELEASES = \[[\s\S]*?\n  \];/,'var RELEASES = window.EXTANT_RELEASES || [];'));
console.log(`Migrated ${Object.keys(content.copy).length} text blocks, ${n} images, ${members.length} members and ${releases.length} releases.`);

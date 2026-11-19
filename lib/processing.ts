import {inputLimit} from './limits.ts';
import {safeName,parsePages,validateFiles,transformText,type Requirement} from './core.ts';
import type {Tool} from './catalog';
import {validateAcceptedFiles,validateRequirement,assertFileKind,imageDimensions,numericSetting,LIMITS} from './validation.ts';
import {padJpeg} from './jpeg-padding.ts';
export type Output={name:string;blob:Blob;note?:string;validation?:{format:string;bytes:number;sourceBytes:number;width?:number;height?:number;pages?:number;minKB:number;maxKB:number;rasterized?:boolean;padded?:boolean}};
export type Settings=Record<string,string>;
const result=(name:string,data:BlobPart,type='application/pdf',note?:string):Output=>({name,blob:new Blob([data],{type}),note});
export function download(out:Output){const url=URL.createObjectURL(out.blob);const a=document.createElement('a');a.href=url;a.download=out.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function zipOutputs(outputs:Output[]){const {zipSync}=await import('fflate');const entries:Record<string,Uint8Array>={};for(let i=0;i<outputs.length;i++)entries[`${String(i+1).padStart(2,'0')}_${outputs[i].name}`]=new Uint8Array(await outputs[i].blob.arrayBuffer());return result('formfino-files.zip',zipSync(entries) as BlobPart,'application/zip');}
export async function canvasFrom(file:Blob){
 await imageDimensions(file);
 let bitmap:ImageBitmap|HTMLImageElement;let url='';
 try{if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(file);else{url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();bitmap=img;}}
 catch{if(url)URL.revokeObjectURL(url);throw new Error('This image could not be decoded. Try exporting a fresh JPEG, PNG, or WebP copy.');}
 try{if(bitmap.width*bitmap.height>LIMITS.pixels||bitmap.width>10000||bitmap.height>10000)throw new Error('Use an image under 40 megapixels and 10,000 pixels per side.');const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d');if(!ctx)throw new Error('Your browser could not create an image canvas.');ctx.drawImage(bitmap,0,0);return c;}
 finally{if('close'in bitmap)bitmap.close();if(url)URL.revokeObjectURL(url);}
}
export const canvasToBlob=(source:HTMLCanvasElement,type='image/jpeg',q=.86)=>new Promise<Blob>((resolve,reject)=>{
 let c=source;
 // JPEG cannot represent transparency. Composite onto white explicitly.
 if(type==='image/jpeg'){c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,0,0);}
 c.toBlob(b=>{if(c!==source){c.width=0;c.height=0;}b&&b.type===type?resolve(b):reject(new Error(`Your browser could not export ${type.split('/')[1].toUpperCase()}. Try another format.`));},type,q);
});
const toBlob=canvasToBlob;
function sizedCanvas(source:HTMLCanvasElement,w:number,h:number,fit='contain',x=.5,y=.5){if(!Number.isFinite(w*h)||w<1||h<1||w>10000||h>10000||w*h>40_000_000)throw new Error('Use dimensions between 1 and 10,000 pixels, under 40 megapixels.');const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);if(fit==='stretch')ctx.drawImage(source,0,0,w,h);else{const ratio=fit==='cover'?Math.max(w/source.width,h/source.height):Math.min(w/source.width,h/source.height);ctx.drawImage(source,(w-source.width*ratio)*x,(h-source.height*ratio)*y,source.width*ratio,source.height*ratio);}return c;}
export async function imageForRequirement(file:File,r:Requirement,x=.5,y=.5,signal?:AbortSignal):Promise<Output>{
 validateRequirement(r);if(![x,y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw new Error('Crop positions must be between 0 and 1.');
 if(r.format==='pdf')throw new Error('Choose a PDF file for a PDF requirement.');
 const source=await canvasFrom(file);let canvas=source;
 try{
  signal?.throwIfAborted();
  const width=r.width||(r.height?Math.round(source.width*r.height/source.height):source.width),height=r.height||(r.width?Math.round(source.height*r.width/source.width):source.height);
  if(r.width||r.height)canvas=sizedCanvas(source,width,height,r.fit,x,y);
  const mime=r.format==='png'?'image/png':'image/jpeg';let b=await toBlob(canvas,mime,1),padded=false;
  for(let resize=0;resize<10&&r.maxKB&&b.size>r.maxKB*1000;resize++){
   if(mime==='image/jpeg'){let lo=.08,hi=1,best:Blob|null=null;for(let i=0;i<12;i++){signal?.throwIfAborted();const q=(lo+hi)/2,candidate=await toBlob(canvas,mime,q);if(candidate.size<=r.maxKB*1000){best=candidate;lo=q;}else hi=q;}if(best){b=best;break;}}
   if(r.width||r.height||mime==='image/png'||Math.max(canvas.width,canvas.height)<=320)break;
   const next=sizedCanvas(source,Math.max(1,Math.round(canvas.width*.8)),Math.max(1,Math.round(canvas.height*.8)));
   if(canvas!==source){canvas.width=0;canvas.height=0;}canvas=next;b=await toBlob(canvas,mime,1);
  }
  if(r.maxKB&&b.size>r.maxKB*1000)throw new Error(`${r.label}: cannot meet the size limit at these dimensions. Try JPG or check the requirements.`);
  if(r.minKB&&b.size<r.minKB*1000){
   if(mime!=='image/jpeg')throw new Error(`${r.label}: the PNG is below the minimum size. Use JPG if the form permits it, or check the minimum.`);
   b=new Blob([padJpeg(new Uint8Array(await b.arrayBuffer()),Math.ceil(r.minKB*1000)) as BlobPart],{type:mime});padded=true;
   if(r.maxKB&&b.size>r.maxKB*1000)throw new Error('The allowed byte range is too narrow. Check the minimum and maximum sizes.');
  }
  signal?.throwIfAborted();
  return {name:`${safeName(r.label)}.${r.format}`,blob:b,note:`${canvas.width} × ${canvas.height} px${padded?' · JPEG padding meets the minimum; pixel quality is unchanged.':''}`,validation:{format:r.format.toUpperCase(),bytes:b.size,sourceBytes:file.size,width:canvas.width,height:canvas.height,minKB:r.minKB,maxKB:r.maxKB,padded}};
 }finally{if(canvas!==source){canvas.width=0;canvas.height=0;}source.width=0;source.height=0;}
}
export async function openPdf(file:Blob,signal?:AbortSignal){const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/api/pdf-worker.mjs';signal?.throwIfAborted();const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true});const abort=()=>{void task.destroy();};signal?.addEventListener('abort',abort,{once:true});try{const doc=await task.promise;signal?.throwIfAborted();return doc;}finally{signal?.removeEventListener('abort',abort);}}
const pdfReader=openPdf;
export async function recognizeDetailed(file:Blob,progress:(s:string)=>void,signal?:AbortSignal){
 signal?.throwIfAborted();const canvas=await canvasFrom(file);
 let worker:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|undefined;
 let rejectAbort:((reason:unknown)=>void)|undefined;
 const cancelled=new Promise<never>((_,reject)=>{rejectAbort=reject;});
 // Aborting during the module import must not create an unhandled rejection.
 void cancelled.catch(()=>{});
 const abort=()=>{void worker?.terminate();rejectAbort?.(new DOMException('Cancelled','AbortError'));};
 signal?.addEventListener('abort',abort,{once:true});
 try{
  const {createWorker}=await import('tesseract.js');signal?.throwIfAborted();
  const creating=createWorker('eng',1,{workerPath:'/vendor/ocr/worker.min.js',corePath:'/vendor/ocr',langPath:'/vendor/ocr',logger:m=>{if(m.status&&!signal?.aborted)progress(`${m.status==='recognizing text'?'Reading text':m.status==='loading language traineddata'?'Loading English recognition model':'Preparing text recognition'} ${Math.round((m.progress||0)*100)}%`);}}).then(async value=>{if(signal?.aborted){await value.terminate();throw new DOMException('Cancelled','AbortError');}return value;});
  worker=await Promise.race([creating,cancelled]);signal?.throwIfAborted();
  const {data}=await Promise.race([worker.recognize(canvas),cancelled]);
  return {text:data.text,confidence:data.confidence};
 }finally{canvas.width=0;canvas.height=0;signal?.removeEventListener('abort',abort);if(worker)await worker.terminate();}
}
export async function recognize(file:Blob,progress:(s:string)=>void){return(await recognizeDetailed(file,progress)).text;}
async function renderPages(file:File,scale:number,gray=false){const doc=await pdfReader(file);try{if(doc.numPages>150)throw new Error('Raster export supports at most 150 pages per file.');const pages:HTMLCanvasElement[]=[];let total=0;for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const view=page.getViewport({scale});total+=view.width*view.height;if(view.width>10000||view.height>10000||view.width*view.height>LIMITS.pixels||total>64_000_000)throw new Error('This render is too large. Reduce the render scale or split the PDF.');const c=document.createElement('canvas');c.width=Math.ceil(view.width);c.height=Math.ceil(view.height);const ctx=c.getContext('2d')!;await page.render({canvas:c,canvasContext:ctx,viewport:view}).promise;if(gray){const im=ctx.getImageData(0,0,c.width,c.height);for(let n=0;n<im.data.length;n+=4){const g=.299*im.data[n]+.587*im.data[n+1]+.114*im.data[n+2];im.data[n]=im.data[n+1]=im.data[n+2]=g;}ctx.putImageData(im,0,0);}pages.push(c);}return pages;}finally{await doc.destroy();}}
export async function runTool(tool:Tool,files:File[],s:Settings,text:string,progress:(s:string)=>void):Promise<Output[]>{
 const id=tool.id;progress('Preparing your files…');
 if(files.length){validateAcceptedFiles(files,tool.accept||'',inputLimit(tool));if(!tool.multiple&&files.length>1)throw new Error('This tool accepts one file at a time.');}
 const settings={...s};for(const key of tool.settings||[]){
  const bounds:Record<string,[number,number,number,boolean]>={width:[800,1,10000,true],height:[800,1,10000,true],maxKB:[100,1,50000,false],quality:[80,10,100,false],scale:[1.3,.5,3,false],rotation:[90,90,270,true]};
  if(bounds[key]){const [fallback,min,max,integer]=bounds[key];settings[key]=String(numericSetting(s[key],fallback,min,max,key,integer));}
 }
 s=settings;if(tool.settings?.includes('rotation')&&![90,180,270].includes(+s.rotation))throw new Error('Choose a rotation of 90, 180, or 270 degrees.');
 if(s.text?.length>100)throw new Error('Keep labels under 100 characters.');
 if(tool.group==='Text')return[result(`${id}.${id.includes('json')?'json':'txt'}`,transformText(id,text),'text/plain;charset=utf-8')];
 if(tool.group==='Data'){
  if(files[0]?.size>LIMITS.dataBytes)throw new Error('Data input is limited to 5 MB.');
  const input=files.length?await files[0].text():text;if(input.length>LIMITS.dataBytes||new TextEncoder().encode(input).byteLength>LIMITS.dataBytes)throw new Error('Data input is limited to 5 MB.');
  const Papa=(await import('papaparse')).default;
  if(id==='json-csv'){const data=JSON.parse(input);if(!Array.isArray(data)||!data.length||!data.every(r=>r&&typeof r==='object'&&!Array.isArray(r)))throw new Error('Use a non-empty JSON array of objects.');const fields=[...new Set(data.flatMap(r=>Object.keys(r)))];if(!fields.length||fields.length*data.length>1_000_000)throw new Error('Use data with 1–1,000,000 cells.');return[result('converted.csv',Papa.unparse({fields,data:data.map(r=>fields.map(k=>r[k]??''))},{escapeFormulae:true}),'text/csv')];}
  const parsed=Papa.parse<string[]>(input,{skipEmptyLines:'greedy'});const parseError=parsed.errors.find(e=>e.code!=='UndetectableDelimiter');if(parseError)throw new Error(parseError.message);let rows=parsed.data;if(!rows.length)throw new Error('Enter CSV data first.');
  const columns=rows.reduce((n,r)=>Math.max(n,r.length),0);if(columns*rows.length>1_000_000)throw new Error('Use data with at most 1,000,000 cells.');
  if(id==='csv-json'){const [head,...body]=rows;if(new Set(head).size!==head.length||head.some(h=>!h.trim()))throw new Error('Column headers must be unique and non-empty.');if(body.some(r=>r.length!==head.length))throw new Error('Rows have different column counts. Use Inspect CSV to locate them before converting.');return[result('data.json',JSON.stringify(body.map(row=>Object.fromEntries(head.map((h,i)=>[h,row[i]??'']))),null,2),'application/json')];}
  if(id==='csv-inspect')return[result('inspection.json',JSON.stringify({rows:rows.length-1,columns:rows[0].length,headers:rows[0],inconsistentRows:rows.map((r,i)=>r.length!==rows[0].length?i+1:0).filter(Boolean),emptyCells:rows.flat().filter(c=>!c.trim()).length},null,2),'application/json')];
  if(id==='csv-dedupe'){const [header,...body]=rows;rows=[header,...Array.from(new Map(body.map(r=>[JSON.stringify(r),r])).values())];}
  if(id==='csv-trim')rows=rows.map(r=>r.map(c=>c.trim()));
  if(id==='csv-transpose')rows=Array.from({length:columns},(_,i)=>rows.map(r=>r[i]||''));
  return[result(id==='csv-tsv'?'data.tsv':'data.csv',Papa.unparse(rows,{delimiter:id==='csv-tsv'?'\t':',',escapeFormulae:true}),'text/plain')];
 }
 if(!files.length)validateFiles(files);
 for(const file of files)await assertFileKind(file,tool.group==='PDF'?'pdf':'image',inputLimit(tool));
 if(tool.group==='Image'){
  if(id==='image-ocr')return[result('recognized-text.txt',await recognize(files[0],progress),'text/plain')];
  if(id==='images-pdf'||id==='photo-sheet'){const {PDFDocument}=await import('pdf-lib');const pdf=await PDFDocument.create();for(const file of files){const canvas=await canvasFrom(file);const b=await toBlob(canvas);const image=await pdf.embedJpg(await b.arrayBuffer());const page=pdf.addPage([595.28,841.89]);if(id==='photo-sheet'){const w=(+s.width||200)*.75,h=(+s.height||230)*.75;if(w<20||h<20||w>550||h>790)throw new Error('Photo size must fit A4 (roughly 27–730 px wide and 27–1050 px high).');for(let y=20;y+h<822;y+=h+12)for(let x=20;x+w<575;x+=w+12)page.drawImage(image,{x,y,width:w,height:h});}else{const r=Math.min(555/image.width,802/image.height);page.drawImage(image,{x:(595-image.width*r)/2,y:(842-image.height*r)/2,width:image.width*r,height:image.height*r});}}return[result('photos.pdf',await pdf.save() as BlobPart)];}
  const outputs:Output[]=[];for(const file of files){progress(`Processing ${outputs.length+1} of ${files.length}`);let c=await canvasFrom(file);const base=safeName(file.name);
   if(id==='image-info'){outputs.push(result(`${base}-info.json`,JSON.stringify({name:file.name,width:c.width,height:c.height,bytes:file.size,type:file.type},null,2),'application/json'));continue;}
   if(id==='image-target'){outputs.push(await imageForRequirement(file,{id:'',label:base,width:0,height:0,minKB:0,maxKB:+s.maxKB||100,format:'jpg',fit:'contain'}));continue;}
   if(['image-resize','image-fit','image-crop'].includes(id))c=sizedCanvas(c,+s.width||800,+s.height||800,id==='image-crop'?'cover':id==='image-fit'?'contain':'stretch');
   if(['image-rotate','image-flip-h','image-flip-v'].includes(id)){const src=c;const rot=id==='image-rotate'?(+s.rotation||90):0;c=document.createElement('canvas');c.width=rot%180?src.height:src.width;c.height=rot%180?src.width:src.height;const ctx=c.getContext('2d')!;ctx.translate(c.width/2,c.height/2);ctx.rotate(rot*Math.PI/180);ctx.scale(id==='image-flip-h'?-1:1,id==='image-flip-v'?-1:1);ctx.drawImage(src,-src.width/2,-src.height/2);}
   if(['image-gray','image-sepia','image-invert'].includes(id)){const ctx=c.getContext('2d')!;const im=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<im.data.length;i+=4){const [r,g,b]=[im.data[i],im.data[i+1],im.data[i+2]];if(id==='image-invert'){im.data[i]=255-r;im.data[i+1]=255-g;im.data[i+2]=255-b;}else if(id==='image-gray')im.data[i]=im.data[i+1]=im.data[i+2]=.299*r+.587*g+.114*b;else{im.data[i]=.393*r+.769*g+.189*b;im.data[i+1]=.349*r+.686*g+.168*b;im.data[i+2]=.272*r+.534*g+.131*b;}}ctx.putImageData(im,0,0);}
   if(id==='image-watermark'){const ctx=c.getContext('2d')!;ctx.font=`${Math.max(16,c.width/28)}px sans-serif`;ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillText((s.text||'FormFino').slice(0,100),c.width*.05,c.height*.93,c.width*.9);}
   const ext=id==='image-png'||id==='image-metadata'?'png':id==='image-webp'?'webp':'jpg';outputs.push({name:`${base}-${id}.${ext}`,blob:await toBlob(c,`image/${ext==='jpg'?'jpeg':ext}`,Math.min(1,Math.max(.1,(+s.quality||80)/100)))});
  }return outputs;
 }
 if(id==='pdf-text'){const doc=await pdfReader(files[0]);try{if(doc.numPages>LIMITS.pages)throw new Error('Use PDFs with at most 1,000 pages.');const texts=[];for(let i=1;i<=doc.numPages;i++){const content=await(await doc.getPage(i)).getTextContent();texts.push(`--- Page ${i} ---\n`+content.items.map(item=>'str'in item?item.str+('hasEOL'in item&&item.hasEOL?'\n':' '):'').join(''));}return[result('document.txt',texts.join('\n\n'),'text/plain')];}finally{await doc.destroy();}}
 const {PDFDocument,StandardFonts,rgb,degrees}=await import('pdf-lib');
 if(['pdf-jpg','pdf-png','pdf-compress','pdf-grayscale','pdf-contact'].includes(id)){
  const pages=await renderPages(files[0],Math.min(3,Math.max(.5,+s.scale||1.3)),id==='pdf-grayscale');
  if(id==='pdf-jpg'||id==='pdf-png'){const ext=id==='pdf-png'?'png':'jpg';return Promise.all(pages.map(async(c,i)=>({name:`page-${i+1}.${ext}`,blob:await toBlob(c,ext==='png'?'image/png':'image/jpeg')})));}
  const pdf=await PDFDocument.create();const original=await PDFDocument.load(await files[0].arrayBuffer());let contactPage:any;
  for(let i=0;i<pages.length;i++){const c=pages[i],jpg=await pdf.embedJpg(await(await toBlob(c,'image/jpeg',(+s.quality||65)/100)).arrayBuffer());if(id==='pdf-contact'){if(i%4===0)contactPage=pdf.addPage([595,842]);const ratio=Math.min(267/c.width,380/c.height);contactPage.drawImage(jpg,{x:20+(i%2)*287+(267-c.width*ratio)/2,y:442-Math.floor(i%4/2)*412,width:c.width*ratio,height:c.height*ratio});}else{const originalPage=original.getPage(i);const raw=originalPage.getSize();const turned=Math.abs(originalPage.getRotation().angle)%180===90;const size=turned?{width:raw.height,height:raw.width}:raw;const page=pdf.addPage([size.width,size.height]);page.drawImage(jpg,{x:0,y:0,width:size.width,height:size.height});}c.width=0;c.height=0;}
  const bytes=await pdf.save();return[result(`${id}.pdf`,bytes as BlobPart,'application/pdf',id==='pdf-compress'?`Original ${(files[0].size/1000).toFixed(0)} KB → ${(bytes.length/1000).toFixed(0)} KB. Rasterized: text is no longer selectable.`:'Rasterized output. Review readability before use.')];
 }
 if(id==='merge-pdf'){const out=await PDFDocument.create();let total=0;for(const f of files){const d=await PDFDocument.load(await f.arrayBuffer());total+=d.getPageCount();if(total>LIMITS.pages)throw new Error('The merged PDF may contain at most 1,000 pages.');for(const p of await out.copyPages(d,d.getPageIndices()))out.addPage(p);}return[result('merged.pdf',await out.save() as BlobPart)];}
 const doc=await PDFDocument.load(await files[0].arrayBuffer());const count=doc.getPageCount();if(count>1000)throw new Error('Use PDFs with at most 1,000 pages.');
 if(id==='metadata-pdf'||id==='pdf-info')return[result(`${id}.json`,JSON.stringify(id==='metadata-pdf'?{title:doc.getTitle(),author:doc.getAuthor(),subject:doc.getSubject(),creator:doc.getCreator(),producer:doc.getProducer(),created:doc.getCreationDate(),modified:doc.getModificationDate(),pages:count}:doc.getPages().map((p,i)=>({page:i+1,...p.getSize(),rotation:p.getRotation().angle})),null,2),'application/json')];
 if(id==='split-pdf'){const out=[];for(let i=0;i<count;i++){const one=await PDFDocument.create();one.addPage((await one.copyPages(doc,[i]))[0]);out.push(result(`page-${i+1}.pdf`,await one.save() as BlobPart));}return out;}
 if(['extract-pages','remove-pages','reorder-pdf','reverse-pdf','duplicate-pages','odd-pages','even-pages'].includes(id)){
  let indices=doc.getPageIndices();if(id==='reverse-pdf')indices.reverse();else if(id==='odd-pages')indices=indices.filter(i=>i%2===0);else if(id==='even-pages')indices=indices.filter(i=>i%2===1);else{const chosen=parsePages(s.pages||'',count,id==='reorder-pdf');indices=id==='remove-pages'?indices.filter(i=>!chosen.includes(i)):id==='duplicate-pages'?indices.flatMap(i=>chosen.includes(i)?[i,i]:[i]):chosen;}if(!indices.length)throw new Error('This operation would leave no pages.');if(indices.length>LIMITS.pages)throw new Error('The output may contain at most 1,000 pages.');const out=await PDFDocument.create();for(const p of await out.copyPages(doc,indices))out.addPage(p);return[result(`${id}.pdf`,await out.save() as BlobPart)];
 }
 if(id==='pdf-a4'||id==='pdf-letter'){const out=await PDFDocument.create();const [w,h]=id==='pdf-a4'?[595.28,841.89]:[612,792];for(const p of doc.getPages()){const embedded=await out.embedPage(p);const angle=((p.getRotation().angle%360)+360)%360;const turned=angle%180===90;const viewW=turned?embedded.height:embedded.width,viewH=turned?embedded.width:embedded.height;const ratio=Math.min((w-40)/viewW,(h-40)/viewH);let x=(w-viewW*ratio)/2,y=(h-viewH*ratio)/2;if(angle===90)y+=embedded.width*ratio;else if(angle===180){x+=embedded.width*ratio;y+=embedded.height*ratio;}else if(angle===270)x+=embedded.height*ratio;out.addPage([w,h]).drawPage(embedded,{x,y,width:embedded.width*ratio,height:embedded.height*ratio,rotate:degrees(-angle)});}return[result(`${id}.pdf`,await out.save() as BlobPart)];}
 if(id==='clean-metadata'){doc.setTitle('');doc.setAuthor('');doc.setSubject('');doc.setKeywords([]);doc.setCreator('');doc.setProducer('');doc.setCreationDate(new Date(0));doc.setModificationDate(new Date(0));}
 if(id==='flatten-pdf')doc.getForm().flatten();
 if(id==='rotate-pdf')for(const p of doc.getPages())p.setRotation(degrees((p.getRotation().angle+(+s.rotation||90))%360));
 if(['page-numbers','watermark-pdf','header-pdf','footer-pdf'].includes(id)){const font=await doc.embedFont(StandardFonts.Helvetica);const label=s.text||'FormFino';if(/[^\x20-\x7E]/.test(label))throw new Error('PDF labels currently support basic Latin characters.');for(const [i,p]of doc.getPages().entries()){const size=id==='watermark-pdf'?Math.min(40,p.getWidth()/(Math.max(label.length,1)*.7)):11;const txt=id==='page-numbers'?`${i+1} / ${count}`:label;const width=font.widthOfTextAtSize(txt,size);p.drawText(txt,{font,size,x:Math.max(12,(p.getWidth()-width)/2),y:id==='header-pdf'?p.getHeight()-28:id==='watermark-pdf'?p.getHeight()/2:22,color:rgb(.2,.25,.23),opacity:id==='watermark-pdf'?.2:1});}}
 return[result(`${id}.pdf`,await doc.save() as BlobPart,'application/pdf',id==='clean-metadata'?'Standard document info cleared. Embedded XMP, attachments, and visible content are not scrubbed.':undefined)];
}

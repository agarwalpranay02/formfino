import {PDFDocument,PDFDict,PDFName} from 'pdf-lib';
import {safeName,type Requirement} from './core';
import {assertFileKind,validateRequirement} from './validation';
import {openPdf,canvasToBlob,type Output} from './processing';

export async function pdfForRequirement(file:File,r:Requirement,progress:(s:string)=>void,signal?:AbortSignal):Promise<Output>{
  validateRequirement(r);await assertFileKind(file,'pdf');signal?.throwIfAborted();
  const bytes=await file.arrayBuffer();
  const source=await PDFDocument.load(bytes,{updateMetadata:false});
  const pages=source.getPageCount();
  if(!pages||pages>1000)throw new Error('Use PDFs with 1–1,000 pages.');
  const minimum=Math.ceil(r.minKB*1000),maximum=r.maxKB?Math.floor(r.maxKB*1000):50_000_000;
  const output=(blob:Blob,note:string,rasterized=false):Output=>({name:`${safeName(r.label)}.pdf`,blob,note,validation:{format:'PDF',bytes:blob.size,sourceBytes:file.size,pages,minKB:r.minKB,maxKB:r.maxKB,rasterized}});
  if(file.size<=maximum){
    if(file.size<minimum)throw new Error(`${r.label}: the PDF is below the minimum size. Check the portal’s minimum; the original was not altered.`);
    return output(file,'Original preserved · page count and size checked');
  }
  const signed=source.context.enumerateIndirectObjects().some(([,object])=>object instanceof PDFDict&&(object.has(PDFName.of('ByteRange'))||object.get(PDFName.of('FT'))===PDFName.of('Sig')));
  if(signed)throw new Error(`${r.label}: this PDF contains a digital signature. Compression would invalidate it. Use the issuing authority’s smaller original.`);
  progress(`Optimizing ${r.label} without rasterizing…`);
  const optimized=await source.save({useObjectStreams:true,addDefaultPage:false});signal?.throwIfAborted();
  if(optimized.length<=maximum&&optimized.length>=minimum)return output(new Blob([optimized as BlobPart],{type:'application/pdf'}),'Optimized PDF · text and page content retained');
  if(pages>20)throw new Error(`${r.label}: automatic size targeting supports up to 20 pages. Split this document first.`);
  const doc=await openPdf(file,signal);let smallest=Math.min(file.size,optimized.length);
  const pageSizes=source.getPages().map(page=>{const size=page.getSize();return Math.abs(page.getRotation().angle)%180===90?{width:size.height,height:size.width}:size;});
  try{
    // Try a higher-resolution export before reducing resolution. Keep only one
    // decoded page in memory; JPEG data is bounded across the whole attempt.
    for(const scale of [2.5,2,1.5]){
      let low=.42,high=.94,best:Uint8Array|null=null;
      for(let attempt=0;attempt<6;attempt++){
        signal?.throwIfAborted();const quality=attempt===0?high:attempt===1?low:(low+high)/2;
        const target=await PDFDocument.create();let encodedBytes=0;
        for(let n=1;n<=pages;n++){
          signal?.throwIfAborted();progress(`${r.label} · checking size · page ${n} of ${pages}`);
          const page=await doc.getPage(n);const viewport=page.getViewport({scale});
          if(viewport.width*viewport.height>16_000_000||Math.max(viewport.width,viewport.height)>6000)throw new Error('A PDF page is too large to prepare safely. Export it at a standard page size.');
          const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          try{
            const rendering=page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport,background:'#ffffff'});
            const abort=()=>rendering.cancel();signal?.addEventListener('abort',abort,{once:true});
            try{await rendering.promise;}finally{signal?.removeEventListener('abort',abort);}
            signal?.throwIfAborted();const jpg=await canvasToBlob(canvas,'image/jpeg',quality);encodedBytes+=jpg.size;
            if(encodedBytes>60_000_000)throw new Error('This PDF needs too much memory. Split it into smaller documents.');
            const image=await target.embedJpg(await jpg.arrayBuffer());const size=pageSizes[n-1];
            target.addPage([size.width,size.height]).drawImage(image,{x:0,y:0,width:size.width,height:size.height});
          }finally{canvas.width=0;canvas.height=0;page.cleanup();}
        }
        const candidate=await target.save();signal?.throwIfAborted();smallest=Math.min(smallest,candidate.length);
        if(candidate.length<=maximum){
          if(candidate.length>=minimum)best=candidate;
          low=quality;if(attempt===0)break;
        }else{high=quality;if(attempt===1)break;}
      }
      if(best)return output(new Blob([best as BlobPart],{type:'application/pdf'}),`Rebuilt at ${Math.round(scale*72)} DPI · text is no longer selectable. Review every page.`,true);
    }
    throw new Error(`${r.label}: the supported export settings could not meet ${r.maxKB} KB. The smallest attempt was ${Math.ceil(smallest/1000)} KB. Try fewer pages or a cleaner scan; no oversized file was marked ready.`);
  }finally{await doc.destroy();}
}

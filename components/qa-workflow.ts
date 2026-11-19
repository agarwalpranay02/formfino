import {PDFDocument,PDFName,PDFNumber,degrees} from 'pdf-lib';
import {pdfForRequirement} from '../lib/pdf-target';
import {imageForRequirement,canvasToBlob,openPdf,recognizeDetailed} from '../lib/processing';
import type {Requirement} from '../lib/core';

export async function workflowChecks(log:(s:string)=>void){
 let passed=0,failed=0;const check=async(name:string,fn:()=>Promise<void>)=>{try{await fn();passed++;log(`PASS ${name}`);}catch(e){failed++;log(`FAIL ${name}: ${(e as Error).message}`);}};
 const assert=(value:unknown,message:string)=>{if(!value)throw new Error(message);};
 const r:Requirement={id:'pdf',label:'Certificate',format:'pdf',width:0,height:0,minKB:0,maxKB:200,fit:'contain'};
 const c=document.createElement('canvas');c.width=1200;c.height=1600;const ctx=c.getContext('2d')!;
 ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#152a20';ctx.font='bold 38px Arial';ctx.fillText('SYNTHETIC CERTIFICATE — TEST ONLY',65,105);ctx.font='22px Arial';
 for(let line=0;line<35;line++)ctx.fillText(`Readable document line ${line+1}: application reference ${1000+line}`,65,190+line*34);
 // A reproducible paper texture creates a realistic oversized scanned page.
 const pixels=ctx.getImageData(0,0,c.width,c.height);let seed=42;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const noise=seed%12;for(let n=0;n<3;n++)pixels.data[i+n]=Math.max(0,pixels.data[i+n]-noise);}ctx.putImageData(pixels,0,0);
 const png=await canvasToBlob(c,'image/png');const source=await PDFDocument.create();const img=await source.embedPng(await png.arrayBuffer());source.addPage([595,842]).drawImage(img,{x:0,y:0,width:595,height:842});
 const scan=new File([await source.save() as BlobPart],'synthetic-scan.pdf',{type:'application/pdf'});
 await check('PDF target: oversized scanned page fits 200 KB and remains renderable',async()=>{
  assert(scan.size>200000,'Fixture must exceed target');const out=await pdfForRequirement(scan,r,()=>{});assert(out.blob.size<=200000,'Output exceeds target');assert(out.validation?.rasterized,'Expected image recompression');
  const doc=await openPdf(out.blob);try{assert(doc.numPages===1,'Page count changed');const page=await doc.getPage(1),view=page.getViewport({scale:.5}),canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport:view}).promise;const data=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;assert(data.some((v,i)=>i%4!==3&&v<100),'Rendered document is blank');canvas.width=0;canvas.height=0;}finally{await doc.destroy();}
 });
 await check('PDF target: original bytes are preserved when they already fit',async()=>{const out=await pdfForRequirement(scan,{...r,maxKB:50000},()=>{});assert(out.blob===scan,'Original unnecessarily rewritten');assert(out.validation?.pages===1,'Page verification missing');});
 await check('PDF target: impossible size returns an error, not an oversized download',async()=>{let error='';try{await pdfForRequirement(scan,{...r,maxKB:1},()=>{});}catch(e){error=(e as Error).message;}assert(error.includes('smallest attempt'),'Missing actionable size failure');});
 await check('PDF target: digital signature fields block destructive compression',async()=>{const signed=await PDFDocument.create();signed.addPage();signed.catalog.set(PDFName.of('TestSignature'),signed.context.register(signed.context.obj({FT:PDFName.of('Sig'),ByteRange:[PDFNumber.of(0),PDFNumber.of(1)]})));const file=new File([await signed.save() as BlobPart],'signed.pdf',{type:'application/pdf'});let error='';try{await pdfForRequirement(file,{...r,maxKB:.1},()=>{});}catch(e){error=(e as Error).message;}assert(error.includes('digital signature'),'Signed PDF was not protected');});
 await check('PDF target: rotated scan keeps its displayed orientation',async()=>{source.getPage(0).setRotation(degrees(90));const file=new File([await source.save() as BlobPart],'rotated.pdf',{type:'application/pdf'});const out=await pdfForRequirement(file,r,()=>{});const pdf=await PDFDocument.load(await out.blob.arrayBuffer());assert(pdf.getPage(0).getWidth()===842&&pdf.getPage(0).getHeight()===595,'Rotated dimensions changed');});
 await check('PDF target: cancellation rejects work',async()=>{const controller=new AbortController();controller.abort();let rejected=false;try{await pdfForRequirement(scan,r,()=>{},controller.signal);}catch{rejected=true;}assert(rejected,'Cancellation ignored');});
 await check('JPEG minimum: valid padding meets range and preserves decoded pixels',async()=>{const file=new File([png],'image.png',{type:'image/png'});const rule={...r,format:'jpg' as const,label:'Photo',width:200,height:230,minKB:40,maxKB:50};const out=await imageForRequirement(file,rule);assert(out.blob.size>=40000&&out.blob.size<=50000,'Byte range not met');const bitmap=await createImageBitmap(out.blob);assert(bitmap.width===200&&bitmap.height===230,'Dimensions changed');bitmap.close();});
 await check('Image maximum: unconstrained dimensions can shrink to meet a target',async()=>{const file=new File([png],'image.png',{type:'image/png'});const out=await imageForRequirement(file,{...r,format:'jpg',maxKB:8});assert(out.blob.size<=8000,'Image exceeds target');});
 await check('OCR cancellation: no stale result is returned',async()=>{const controller=new AbortController();controller.abort();let rejected=false;try{await recognizeDetailed(png,()=>{},controller.signal);}catch{rejected=true;}assert(rejected,'Cancelled OCR returned a result');});
 c.width=0;c.height=0;return{passed,failed};
}

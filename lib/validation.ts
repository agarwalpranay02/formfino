import {validateFiles, type Requirement} from './core.ts';

import {LIMITS, mb} from './limits.ts';
export {LIMITS} from './limits.ts';

export function validateRequirement(r:Requirement){
  if(!r.label.trim()||r.label.length>80)throw new Error('Give each requirement a name of 1–80 characters.');
  if(!['jpg','png','pdf'].includes(r.format)||!['contain','cover'].includes(r.fit))throw new Error('Choose a supported format and image placement.');
  if([r.width,r.height,r.minKB,r.maxKB].some(v=>!Number.isFinite(v)||v<0))throw new Error('Dimensions and size limits must be non-negative numbers.');
  if(![r.width,r.height].every(Number.isInteger)||r.width>10000||r.height>10000||r.width*r.height>LIMITS.pixels)throw new Error('Use whole pixel dimensions up to 10,000, under 40 megapixels.');
  if(r.minKB>50000||r.maxKB>50000)throw new Error('File-size requirements must be at most 50,000 KB.');
  if(r.maxKB&&r.minKB>r.maxKB)throw new Error('Minimum size cannot exceed maximum size.');
}

export function validateAcceptedFiles(files:File[],accept:string,maxBytes=LIMITS.fileBytes){
  validateFiles(files,maxBytes);
  const aliases:Record<string,string[]>={'image/jpeg':['.jpg','.jpeg'],'image/png':['.png'],'image/webp':['.webp'],'application/pdf':['.pdf']};
  const choices=accept.toLowerCase().split(',');
  for(const file of files)if(!choices.some(choice=>choice.startsWith('.')?file.name.toLowerCase().endsWith(choice):file.type===choice||(!file.type&&aliases[choice]?.some(ext=>file.name.toLowerCase().endsWith(ext))))){
    throw new Error(`${file.name}: choose a supported file (${accept.replaceAll('image/','').replaceAll('application/','')}).`);
  }
}

export async function assertFileKind(file:Blob,kind:'image'|'pdf',maxBytes=LIMITS.fileBytes){
  if(!file.size||file.size>maxBytes)throw new Error('Choose a non-empty file up to '+mb(maxBytes)+'.');
  const bytes=new Uint8Array(await file.slice(0,1024).arrayBuffer());
  const text=new TextDecoder('latin1').decode(bytes);
  const pdf=text.includes('%PDF-');
  const image=(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)||
    (bytes[0]===137&&text.slice(1,4)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)||
    (text.slice(0,4)==='RIFF'&&text.slice(8,12)==='WEBP');
  if(!(kind==='pdf'?pdf:image))throw new Error(kind==='pdf'?'This file is not a readable PDF. Choose an unencrypted PDF.':'Choose a valid JPEG, PNG, or WebP image. Renaming an extension does not convert the file.');
}

// Read common image headers before the browser allocates a decoded bitmap.
export async function imageDimensions(file:Blob){
  await assertFileKind(file,'image');
  const bytes=new Uint8Array(await file.slice(0,262144).arrayBuffer());
  const view=new DataView(bytes.buffer);let width=0,height=0;
  if(bytes[0]===137&&bytes.length>=24){width=view.getUint32(16);height=view.getUint32(20);}
  else if(bytes[0]===255){
    let offset=2;
    while(offset+8<bytes.length){
      if(bytes[offset++]!==255)break;
      while(bytes[offset]===255)offset++;
      const marker=bytes[offset++];if(marker===0xda||marker===0xd9)break;
      const length=view.getUint16(offset);if(length<2)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){height=view.getUint16(offset+3);width=view.getUint16(offset+5);break;}
      offset+=length;
    }
  }else if(bytes.length>=30){
    const kind=String.fromCharCode(...bytes.slice(12,16));
    if(kind==='VP8X'){width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}
    else if(kind==='VP8 '){width=view.getUint16(26,true)&0x3fff;height=view.getUint16(28,true)&0x3fff;}
    else if(kind==='VP8L'){const bits=view.getUint32(21,true);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
  }
  if(width*height>LIMITS.pixels||width>10000||height>10000)throw new Error('Use an image under 40 megapixels and 10,000 pixels per side.');
  return {width,height};
}

export function storePreference(key:string,value:string){try{localStorage.setItem(key,value);return true}catch{return false}}
export function errorMessage(error:unknown){const message=error instanceof Error?error.message:'Unable to process this file. Please try another file.';return /encrypted|password/i.test(message)?'This PDF is password protected. Open it with your password and export an unencrypted copy first.':message;}

export function numericSetting(value:string|undefined,fallback:number,min:number,max:number,label:string,integer=false){
  const number=value===undefined||value.trim()===''?fallback:Number(value);
  if(!Number.isFinite(number)||number<min||number>max||(integer&&!Number.isInteger(number)))throw new Error(`${label} must be ${integer?'a whole number ':''}between ${min} and ${max}.`);
  return number;
}

export type Preset={name:string;items:Requirement[]};
export function readPresets(value:string|null):Preset[]{
  try{const parsed=JSON.parse(value||'[]');if(!Array.isArray(parsed))return [];
    return parsed.slice(-20).filter(p=>typeof p?.name==='string'&&p.name.length<=80&&Array.isArray(p.items)&&p.items.length>0&&p.items.length<=30&&p.items.every((r:Requirement)=>{try{validateRequirement(r);return typeof r.id==='string'}catch{return false}}));
  }catch{return []}
}

export function readHistory(value:string|null):{name:string;date:string}[]{
  try{const parsed=JSON.parse(value||'[]');return Array.isArray(parsed)?parsed.filter(x=>typeof x?.name==='string'&&x.name.length<150&&typeof x.date==='string'&&Number.isFinite(Date.parse(x.date))).slice(0,12):[]}catch{return []}
}

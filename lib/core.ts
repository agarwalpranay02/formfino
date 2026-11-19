import {LIMITS, mb} from './limits.ts';
export type Requirement = {id:string;label:string;width:number;height:number;minKB:number;maxKB:number;format:'jpg'|'png'|'pdf';fit:'contain'|'cover';sourceText?:string;warnings?:string[]};
export {parseRequirements} from './requirements.ts';
export const demoInstructions = 'Photo: JPG, 200 x 230 pixels, 20–50 KB.\nSignature: JPG, 300 x 100 pixels, under 20 KB.\nSupporting document: PDF, maximum 500 KB.';
export function parsePages(input:string,total:number,duplicates=false):number[]{
  if(!input.trim()) throw new Error('Enter page numbers, for example 1, 3-5.');
  if(!Number.isInteger(total)||total<1||total>1000||input.length>10000)throw new Error('Use a selection of up to 1,000 pages.');
  const out:number[]=[];
  for(const part of input.split(',')){const m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw new Error('Use page numbers or ranges, for example 1, 3-5.');const a=+m[1],b=+(m[2]||m[1]);if(a<1||b>total||a>b)throw new Error(`Page range must be within 1–${total}.`);for(let n=a;n<=b;n++)if(duplicates||!out.includes(n-1)){out.push(n-1);if(out.length>1000)throw new Error('The output may contain at most 1,000 pages.');}}
  if(out.length>1000)throw new Error('The output may contain at most 1,000 pages.');
  return out;
}
export function safeName(name:string) {
  const stem = name.normalize('NFC').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}\p{M}_-]/gu, '_');
  const base = Array.from(stem).slice(0, 80).join('') || 'document';
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base) ? '_' + base : base;
}
export function formatBytes(bytes:number){return bytes<1000?`${bytes} B`:bytes<1000000?`${(bytes/1000).toFixed(1)} KB`:`${(bytes/1000000).toFixed(1)} MB`;}
export function validateFiles(files: File[], maxBytes = LIMITS.fileBytes) {
  if (!files.length) throw new Error('Add at least one file.');
  if (files.length > LIMITS.files) throw new Error('Choose up to ' + LIMITS.files + ' files per batch.');
  if (files.some(f => f.size === 0)) throw new Error('One of these files is empty.');
  const large = files.find(f => f.size > maxBytes);
  if (large) throw new Error(large.name + ' exceeds the ' + mb(maxBytes) + ' limit for this task.');
  if (files.reduce((sum, f) => sum + f.size, 0) > LIMITS.batchBytes) throw new Error('Choose a smaller batch. The combined limit is ' + mb(LIMITS.batchBytes) + '.');
}
export function transformText(id:string,text:string){
 if(text.length>LIMITS.textCharacters)throw new Error('Use fewer than two million characters.');
 const lines=text.split(/\r?\n/);
 switch(id){case 'clean-text':return text.replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\u00a0/g,' ').split(/\r?\n/).map(l=>l.replace(/[ \t]+/g,' ').trim()).join('\n').trim();case 'unwrap-text':return text.split(/\n\s*\n/).map(p=>p.replace(/\s*\n\s*/g,' ')).join('\n\n');case 'dedupe-lines':return [...new Set(lines)].join('\n');case 'sort-lines':return lines.sort((a,b)=>a.localeCompare(b)).join('\n');case 'trim-lines':return lines.map(l=>l.trim()).join('\n');case 'remove-empty':return lines.filter(l=>l.trim()).join('\n');case 'text-upper':return text.toUpperCase();case 'text-lower':return text.toLowerCase();case 'text-title':return text.toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());case 'word-count':return JSON.stringify({words:text.trim()?text.trim().split(/\s+/).length:0,characters:[...text].length,lines:lines.length,paragraphs:text.trim()?text.trim().split(/\n\s*\n/).length:0},null,2);case 'text-json':return JSON.stringify(JSON.parse(text),null,2);case 'minify-json':return JSON.stringify(JSON.parse(text));case 'url-encode':return encodeURIComponent(text);case 'url-decode':return decodeURIComponent(text);case 'base64-encode':return btoa(Array.from(new TextEncoder().encode(text),b=>String.fromCharCode(b)).join(''));case 'base64-decode':return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text.trim()),c=>c.charCodeAt(0)));default:throw new Error('Unknown text tool.');}
}

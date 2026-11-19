import type {Requirement} from './core.ts';

const subject = /\b(photo(?:graph)?|signature|thumb(?: impression)?|declaration|certificate|document|marksheet|passport|identity|resume|cv)\b/i;
const rule = /\b(?:jpe?g|png|pdf|kb|mb|pixels?|width|height|dimensions?|format|size)\b/i;
const field = /^(?:file\s*)?(?:size|type|format|dimensions?|width|height|minimum|maximum|resolution|note|important)\b/i;

/** Conservative extraction: keep source text, surface uncertainty, never guess units. */
export function parseRequirements(text:string):Requirement[] {
  if(text.length>30000)throw new Error('Please use fewer than 30,000 characters.');
  const lines=text.replace(/\r/g,'').split(/\n|;|\.(?=\s*[A-Z][a-z]+\s*:)/)
    .map(s=>s.replace(/^\s*(?:[•●▪*]\s*|(?:\d+|[a-z])[.)]\s+)/i,'').trim()).filter(Boolean);
  if(lines.length>200)throw new Error('Crop the screenshot to the upload instructions, or paste only the requirements.');
  const groups:string[][]=[];
  for(const line of lines){
    const prefix=line.split(':')[0];
    const named=line.includes(':')&&prefix.length<=80&&!field.test(prefix)&&(/^[\w ()/-]+$/.test(prefix));
    const heading=subject.test(line)&&!field.test(line)&&(line.length<55&&!rule.test(line)||/^(?:upload\s+)?(?:your\s+)?(?:photo(?:graph)?|signature|thumb|declaration|certificate|document|marksheet|passport|identity|resume|cv)\b/i.test(line));
    const last=groups.at(-1),sameSubject=last&&subject.exec(last[0])?.[0].toLowerCase()===subject.exec(line)?.[0].toLowerCase();
    if(heading&&!named&&sameSubject)last!.push(line);
    else if(named||heading)groups.push([line]);
    else if(groups.length&&(rule.test(line)||/\d/.test(line)))groups[groups.length-1].push(line);
    else if(!groups.length&&rule.test(line))groups.push([line]);
  }
  if(groups.length>20)throw new Error('Use up to 20 requirement lines. Remove extra instructions and try again.');
  return groups.map((group,i)=>{
    const line=group.join('\n'),warnings:string[]=[];
    const physical=/(?<![\d.])\d+(?:\.\d+)?\s*(?:cm|mm|inches?)?\s*[x×*]\s*\d+(?:\.\d+)?\s*(?:cm|mm|inches?)\b/i.test(line);
    const explicitPixels=line.match(/(?<![\d.])(\d{1,5})\s*(?:px|pixels?)?\s*[x×*]\s*(\d{1,5})\s*(?:px|pixels?)\b/i);
    const dim=explicitPixels||(physical?null:line.match(/(?<![\d.])(\d{1,5})\s*(?:px|pixels?)?\s*(?:\(width\))?\s*[x×*]\s*(\d{1,5})(?![\d.])\s*(?:\(height\))?/i));
    const width=line.match(/\bwidth\s*[:=]?\s*(\d{1,5})\s*(?:px|pixels?)\b/i);
    const height=line.match(/\bheight\s*[:=]?\s*(\d{1,5})\s*(?:px|pixels?)\b/i);
    const toKB=(value:string,unit:string)=>Number(value)*(unit.toLowerCase()==='mb'?1000:1);
    const range=line.match(/(\d+(?:\.\d+)?)\s*(kb|mb)?\s*(?:[-–—]|to|and)\s*(\d+(?:\.\d+)?)\s*(kb|mb)\b/i);
    let minKB=0,maxKB=0;
    if(range){minKB=toKB(range[1],range[2]||range[4]);maxKB=toKB(range[3],range[4]);}
    else for(const match of line.matchAll(/(?<![\w.])(\d+(?:\.\d+)?)\s*(kb|mb)\b/gi)){
      const before=line.slice(Math.max(0,match.index!-42),match.index).toLowerCase();
      const after=line.slice(match.index!+match[0].length,match.index!+match[0].length+20).toLowerCase();
      const minimum=/(?:minimum|min\.?|at least|not less than|no less than)(?:\s+(?:file\s+)?size)?(?:\s+of)?\s*[:=]?\s*$/.test(before)||/^[ \t]*(?:minimum|min\b)(?![ \t]*:)/.test(after);
      if(minimum)minKB=Math.max(minKB,toKB(match[1],match[2]));else maxKB=maxKB?Math.min(maxKB,toKB(match[1],match[2])):toKB(match[1],match[2]);
    }
    const formats=[...new Set([...line.matchAll(/\b(jpe?g|png|pdf)\b/gi)].map(m=>m[1].toLowerCase().replace('jpeg','jpg')))];
    const format=(formats[0]||'jpg') as Requirement['format'];
    if(!formats.length)warnings.push('Format was not detected. JPG is selected; check your form.');
    if(formats.length>1)warnings.push(`Several formats are mentioned (${formats.join(', ').toUpperCase()}). Check the selected format.`);
    if(physical&&!explicitPixels)warnings.push('Physical dimensions were found. Enter the portal’s pixel dimensions; no DPI conversion was assumed.');
    if(!minKB&&!maxKB)warnings.push('No file-size limit was detected. Check whether your form specifies one.');
    if(/[\d][OoIl][\dOoIl]*\s*(?:KB|MB|pixels?)\b/i.test(line))warnings.push('A number may contain an OCR letter. Check it against the screenshot.');
    const prefix=group[0].includes(':')?group[0].split(':')[0]:'';
    const label=prefix&&!field.test(prefix)&&prefix.length<=80?prefix:subject.exec(line)?.[0]||`Document ${i+1}`;
    return {id:`requirement-${i}`,label:label[0].toUpperCase()+label.slice(1),width:dim?+dim[1]:width?+width[1]:0,height:dim?+dim[2]:height?+height[1]:0,minKB,maxKB,format,fit:'contain',sourceText:line,warnings};
  });
}

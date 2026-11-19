import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRequirements,parsePages} from '../lib/core.ts';
import {validateRequirement,validateAcceptedFiles,readPresets,readHistory,numericSetting,imageDimensions,assertFileKind} from '../lib/validation.ts';
import {securityHeaders} from '../lib/security.ts';
const base={id:'test',label:'Photo',width:200,height:230,minKB:0,maxKB:50,format:'jpg' as const,fit:'contain' as const};
test('minimum and maximum instructions retain their direction',()=>{for(const [line,min,max]of [['Photo: at least 20 KB, maximum 50 KB',20,50],['Photo: minimum 20 KB',20,0],['Photo: 20 KB minimum',20,0],['Photo: 20 KB to 50 KB',20,50],['PDF: 50 KB–1 MB',50,1000]] as const){const r=parseRequirements(line)[0];assert.deepEqual([r.minKB,r.maxKB],[min,max],line)}});
test('physical dimensions are never silently interpreted as pixels',()=>{for(const line of ['Photo: 35 x 45 mm','Photo: 2 x 2 inches','Photo: 3.5 x 4.5 cm'])assert.equal(parseRequirements(line)[0].width,0);assert.equal(parseRequirements('Photo: 200 × 230 pixels')[0].width,200)});
test('excess requirement lines and repeated page ranges are bounded',()=>{assert.throws(()=>parseRequirements(Array(21).fill('Photo: JPG').join('\n')));assert.throws(()=>parsePages('1-1000,1-1000',1000,true));});
test('requirement validation rejects corrupt numeric and format values',()=>{validateRequirement(base);for(const patch of [{width:NaN},{width:2.4},{height:10001},{width:10000,height:10000},{minKB:60},{maxKB:-1},{label:''},{format:'svg'}])assert.throws(()=>validateRequirement({...base,...patch} as typeof base));});
test('explicit zero and invalid numeric settings never become defaults',()=>{assert.equal(numericSetting('',800,1,10000,'Width',true),800);for(const v of ['0','-1','Infinity','1.3'])assert.throws(()=>numericSetting(v,800,1,10000,'Width',true));});
test('file acceptance rejects accidental mismatches and allows missing MIME',()=>{validateAcceptedFiles([new File(['x'],'photo.JPG')],'image/jpeg');assert.throws(()=>validateAcceptedFiles([new File(['x'],'script.svg',{type:'image/svg+xml'})],'image/jpeg,image/png'));});
test('file content checks reject renamed files',async()=>{await assert.rejects(()=>assertFileKind(new Blob(['not a pdf']),'pdf'));await assert.rejects(()=>assertFileKind(new Blob(['<svg></svg>']),'image'));await assertFileKind(new Blob(['%PDF-1.7\n']),'pdf');});
test('oversized PNG dimensions are rejected before decode',async()=>{const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);const view=new DataView(bytes.buffer);view.setUint32(16,100000);view.setUint32(20,100000);await assert.rejects(()=>imageDimensions(new Blob([bytes])),/40 megapixels/);});
test('malformed and unexpected saved state cannot crash the workspace',()=>{for(const text of ['{oops}','{}','null','[null]','[42]']){assert.deepEqual(readPresets(text),[]);assert.deepEqual(readHistory(text),[])}assert.equal(readPresets(JSON.stringify([{name:'Valid',items:[base]}])).length,1);assert.equal(readPresets(JSON.stringify([{name:'Bad',items:[{...base,maxKB:-2}]}])).length,0);});
test('security policy permits only nonce-authorized inline scripts',()=>{const headers=securityHeaders('test-nonce');const script=headers['Content-Security-Policy'].split(';').find(s=>s.trim().startsWith('script-src'))!;assert.ok(script.includes("'nonce-test-nonce'"));assert.ok(!script.includes("'unsafe-inline'"));assert.ok(!script.includes("'unsafe-eval'"));assert.equal(headers['X-Content-Type-Options'],'nosniff');assert.ok(headers['Content-Security-Policy'].includes("object-src 'none'"));});
test('operation-specific file limits include the boundary, and data is rejected at selection', async () => {
  const {inputLimit, LIMITS} = await import('../lib/limits.ts');
  const fake = (size:number, name='test.pdf') => ({size,name,type:''} as File);
  for(const id of ['merge-pdf','rotate-pdf','extract-pages','pdf-info','metadata-pdf']){
    const limit=inputLimit({id,group:'PDF'});
    assert.equal(limit,100_000_000);
    validateAcceptedFiles([fake(limit)],'.pdf',limit);
    assert.throws(()=>validateAcceptedFiles([fake(limit+1)],'.pdf',limit), /100 MB/);
  }
  assert.throws(()=>validateAcceptedFiles([fake(80_000_000),fake(70_000_001)],'.pdf',100_000_000),/150 MB/);
  validateAcceptedFiles([fake(80_000_000),fake(70_000_000)],'.pdf',100_000_000);
  assert.equal(inputLimit({id:'pdf-compress',group:'PDF'}),LIMITS.fileBytes);
  assert.throws(()=>validateAcceptedFiles([fake(50_000_001)],'.pdf'),/50 MB/);
  assert.throws(()=>validateAcceptedFiles([fake(5_000_001,'rows.csv')],'.csv',inputLimit({id:'csv-json',group:'Data'})),/5 MB/);
});

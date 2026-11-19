import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRequirements,parsePages,transformText,safeName,validateFiles,demoInstructions} from '../lib/core.ts';
test('parses application pack with independent constraints',()=>{const r=parseRequirements(demoInstructions);assert.equal(r.length,3);assert.deepEqual([r[0].width,r[0].height,r[0].minKB,r[0].maxKB],[200,230,20,50]);assert.equal(r[1].maxKB,20);assert.equal(r[2].format,'pdf');assert.equal(r[2].maxKB,500)});
test('supports MB and does not invent missing dimensions',()=>{const r=parseRequirements('Document: PDF, 1.5 MB')[0];assert.equal(r.maxKB,1500);assert.equal(r.width,0);assert.equal(parseRequirements('Photo: JPG')[0].maxKB,0)});
test('page ordering, duplicate selection and bounds',()=>{assert.deepEqual(parsePages('3,1-2',4),[2,0,1]);assert.deepEqual(parsePages('1,1',2,true),[0,0]);for(const s of ['0','1-8','2-1','foo','1,'])assert.throws(()=>parsePages(s,4));});
test('Unicode Base64 roundtrip',()=>{const t='Hello नमस्ते 👋';assert.equal(transformText('base64-decode',transformText('base64-encode',t)),t)});
test('text cleanup preserves paragraphs and removes invisible characters',()=>{assert.equal(transformText('clean-text',' hello\u200b   world \n\n next '),'hello world\n\nnext');assert.equal(transformText('dedupe-lines','a\nb\na'),'a\nb')});
test('rejects malformed JSON and unknown tools',()=>{assert.throws(()=>transformText('text-json','{oops}'));assert.throws(()=>transformText('not-a-tool','hi'))});
test('validates file resource limits',()=>{assert.throws(()=>validateFiles([]));assert.throws(()=>validateFiles([new File([],'empty.pdf')]));validateFiles([new File(['test'],'valid.txt')]);assert.throws(()=>validateFiles(Array.from({length:31},()=>new File(['x'],'x.txt'))));});
test('safe output names cannot contain path separators',()=>{assert.equal(safeName('../../private/file.pdf'),'______private_file');});
test('output names preserve international scripts and avoid reserved device names',()=>{
 assert.equal(safeName('身份证明.pdf'),'身份证明');
 assert.equal(safeName('Re\u0301sume\u0301.pdf'),'Résumé');
 assert.equal(safeName('con.pdf'),'_con');
});

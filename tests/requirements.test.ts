import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRequirements} from '../lib/core.ts';
import {padJpeg} from '../lib/jpeg-padding.ts';

const variants:[string,number,number][]=[
 ['20–50 KB',20,50],['20 KB to 50 KB',20,50],['20kb - 50kb',20,50],['0.02 MB to 50 KB',20,50],
 ['at least 20 KB, maximum 50 KB',20,50],['minimum: 20 KB; maximum: 50 KB',20,50],
 ['not less than 20 KB, not exceeding 50 KB',20,50],['no less than 20 KB, up to 50 KB',20,50],
 ['20 KB minimum, 50 KB maximum',20,50],['under 50 KB',0,50],['less than 50KB',0,50],
 ['maximum file size 50 KB',0,50],['minimum 20 KB',20,0],['at least 0.02 MB',20,0],
 ['50 KB–1 MB',50,1000],['1.5 MB',0,1500],['0.1–0.2 MB',100,200],
 ['Maximum: 50 KB\nMinimum: 20 KB',20,50],['File size: 20-50 KB',20,50],['20 KB — 50 KB',20,50],
];
for(const [text,min,max]of variants)test(`size instruction: ${text}`,()=>{const r=parseRequirements(`Photograph: JPG\n${text}`);assert.equal(r.length,1);assert.equal(r[0].minKB,min);assert.equal(r[0].maxKB,max);});
test('wrapped screenshot sections stay with their own file',()=>{
 const r=parseRequirements('Upload instructions\nPhotograph\nFormat: JPEG\nDimensions: 200 x 230 pixels\nSize: 20 to 50 KB\nSignature\nJPG\n140 x 60 pixels\n10 to 20 KB');
 assert.equal(r.length,2);assert.deepEqual(r.map(x=>[x.label,x.width,x.height,x.minKB,x.maxKB]),[['Photograph',200,230,20,50],['Signature',140,60,10,20]]);
});
test('missing format, ambiguous formats, physical units and possible OCR letters are flagged',()=>{
 assert.ok(parseRequirements('Photo: under 50 KB')[0].warnings!.some(w=>w.includes('Format')));
 assert.ok(parseRequirements('Photo: JPG/PNG, 2O KB')[0].warnings!.some(w=>w.includes('OCR')));
 assert.ok(parseRequirements('Photo: JPG/PNG, 50 KB')[0].warnings!.some(w=>w.includes('Several formats')));
 const physical=parseRequirements('Photo: JPG, 35 x 45 mm, 50 KB')[0];assert.equal(physical.width,0);assert.ok(physical.warnings!.some(w=>w.includes('Physical')));
});
test('explicit pixel width and height are retained without assuming DPI',()=>{
 const r=parseRequirements('Photo: JPG\nWidth: 200 pixels\nHeight: 230 px\n50 KB')[0];assert.equal(r.width,200);assert.equal(r.height,230);
});
test('unrelated prose is not invented as a document requirement',()=>{assert.equal(parseRequirements('Welcome to the application portal. Please sign in to continue.').length,0);});
test('JPEG padding is valid length-delimited COM data and preserves source bytes',()=>{
 const input=new Uint8Array([255,216,255,217]);
 for(const n of [5,8,50,65540,65541,65542,131079]){const padded=padJpeg(input,n);assert.ok(padded.length>=n);assert.ok(padded.length<=n+3);let offset=2;while(padded[offset]===255&&padded[offset+1]===254){const len=(padded[offset+2]<<8)+padded[offset+3];assert.ok(len>=2&&len<=65535);offset+=len+2;}assert.deepEqual(padded.slice(offset),input.slice(2));}
 assert.throws(()=>padJpeg(new Uint8Array([1,2]),100));assert.throws(()=>padJpeg(input,Infinity));
});

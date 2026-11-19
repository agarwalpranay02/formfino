import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('install manifest contains accessible app icons with actual PNG dimensions',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');
  for(const icon of manifest.icons){const data=await readFile(new URL('../public'+icon.src,import.meta.url));assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`,icon.sizes)}
});
test('service worker intercepts only same-origin navigations and leaves data requests alone',async()=>{
  const handlers:Record<string,(event:Record<string,unknown>)=>void>={};
  vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{self:{location:{origin:'https://formfino.example'},addEventListener:(name:string,fn:(event:Record<string,unknown>)=>void)=>handlers[name]=fn},URL,fetch:()=>Promise.resolve(new Response('page')),Response});
  for(const request of [{method:'POST',mode:'navigate',url:'https://formfino.example/'},{method:'GET',mode:'cors',url:'https://formfino.example/document.pdf'},{method:'GET',mode:'navigate',url:'https://foreign.example/'}])handlers.fetch({request,respondWith:()=>assert.fail('Private or foreign request intercepted')});
  let response:Promise<Response>|undefined;
  handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://formfino.example/'},respondWith:(value:Promise<Response>)=>response=value});
  assert.equal(await(await response)!.text(),'page');
});

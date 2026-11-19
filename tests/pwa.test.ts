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
test('service-worker install reuses an existing fallback and fetches only on a cache miss',async()=>{
  const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
  for(const exists of [true,false]){
    const handlers:Record<string,(event:Record<string,unknown>)=>void>={};let fetches=0,puts=0,installation:Promise<unknown>|undefined;
    vm.runInNewContext(source,{self:{addEventListener:(name:string,fn:(event:Record<string,unknown>)=>void)=>handlers[name]=fn},caches:{open:async()=>({match:async()=>exists?new Response('cached'):undefined,put:async()=>{puts++}})},fetch:async()=>{fetches++;return new Response('offline')},Response});
    handlers.install({waitUntil:(promise:Promise<unknown>)=>installation=promise});await installation;
    assert.equal(fetches,exists?0:1);assert.equal(puts,exists?0:1);
  }
});

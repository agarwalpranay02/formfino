/* Cache only this public offline page. Never cache documents, analytics or app HTML. */
const CACHE='formfino-offline-v2';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // Installation may be retried after a browser interruption. Reuse a valid
    // cached fallback rather than failing on an existing entry.
    if(await cache.match('/offline.html'))return;
    const response=await fetch('/offline.html',{cache:'reload'});
    if(!response.ok)throw new Error('Offline fallback could not be loaded');
    await cache.put('/offline.html',response);
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('formfino-offline-')&&key!==CACHE).map(key=>caches.delete(key)))));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).catch(async()=>{
    return await caches.match('/offline.html') || new Response('Connect to the internet to open FormFino.',{status:503,headers:{'Content-Type':'text/plain'}});
  }));
});

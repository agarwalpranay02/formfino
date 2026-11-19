import {stat,readFile} from 'node:fs/promises';
for(const file of ['public/vendor/pdf.worker.min.mjs','public/vendor/ocr/worker.min.js','public/vendor/ocr/eng.traineddata.gz','public/THIRD_PARTY_NOTICES.txt','public/manifest.webmanifest','public/icons/apple-touch-icon.png','public/sw.js','public/offline.html']){const s=await stat(file);if(s.size===0)throw new Error(`${file} is empty`);}
const pkg=JSON.parse(await readFile('package.json','utf8'));if(pkg.name!=='formfino')throw new Error('Unexpected package identity');
console.log('Local model, workers, notices, and app identity verified.');

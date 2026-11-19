import {mkdir,copyFile,readdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {createHash} from 'node:crypto';
import './prepare-pwa.mjs';
const require=createRequire(import.meta.url);
const root=process.cwd();
await mkdir('public/vendor/ocr',{recursive:true});
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/vendor/pdf.worker.min.mjs');
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/vendor/ocr/worker.min.js');
const tessDir=path.dirname(require.resolve('tesseract.js/package.json'));
const tessRequire=createRequire(path.join(tessDir,'package.json'));
const coreDir=path.dirname(tessRequire.resolve('tesseract.js-core/package.json'));
for(const name of await readdir(coreDir))if(/\.(wasm|js)$/.test(name))await copyFile(path.join(coreDir,name),path.join('public/vendor/ocr',name));
const model='public/vendor/ocr/eng.traineddata.gz';
try{await readFile(model)}catch{const url='https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz';const r=await fetch(url);if(!r.ok)throw new Error(`OCR model download failed: ${r.status}`);await writeFile(model,Buffer.from(await r.arrayBuffer()));}
if(createHash('sha256').update(await readFile(model)).digest('hex')!=='ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468')throw new Error('OCR model integrity check failed');
let notice='FormFino — Third-party software notices\n\nOriginal app interface and copy © 2026 FormFino.\n\n';
// Include direct and transitive installed package licenses, deduplicated by name/version.
const seen=new Set();async function scan(dir,depth=0){if(depth>6)return;for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){if(entry.name==='.bin')continue;const p=path.join(dir,entry.name);if(entry.isDirectory()||entry.isSymbolicLink()){let pkg;try{pkg=JSON.parse(await readFile(path.join(p,'package.json'),'utf8'))}catch{}if(pkg&&!seen.has(`${pkg.name}@${pkg.version}`)){seen.add(`${pkg.name}@${pkg.version}`);const names=await readdir(p);const ls=names.filter(n=>/^(licen[cs]e|copying|notice)(\.|$|-)/i.test(n));if(ls.length){notice+=`\n===== ${pkg.name}@${pkg.version} (${pkg.license||'see text'}) =====\n`;for(const n of ls)try{notice+=await readFile(path.join(p,n),'utf8')+'\n'}catch{}}}if(entry.name.startsWith('@')||entry.name==='.pnpm'||entry.name==='node_modules'||(!pkg&&depth<2))await scan(p,depth+1);}}}
await scan('node_modules');
await writeFile('public/THIRD_PARTY_NOTICES.txt',notice);
console.log(`Prepared PDF worker, local OCR runtime/model, and notices for ${seen.size} packages.`);

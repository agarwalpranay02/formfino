import {createRequire} from 'node:module';
import {mkdir,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const nextRequire=createRequire(require.resolve('next/package.json'));
const sharp=nextRequire('sharp');
const svg=await readFile('public/favicon.svg');
await mkdir('public/icons',{recursive:true});
for(const [name,size] of [['icon-192',192],['icon-512',512],['apple-touch-icon',180]]){
  await sharp(svg).resize(size,size).png().toFile(`public/icons/${name}.png`);
}
await sharp(svg).resize(330,330).extend({top:91,bottom:91,left:91,right:91,background:'#fdcc89'}).png().toFile('public/icons/maskable-512.png');
console.log('Generated desktop, Apple and Android app icons.');

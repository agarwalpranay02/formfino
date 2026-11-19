'use client';
import {useEffect,useRef,useState} from 'react';

const widths = [320,390,768,1280,1920,2560];
const delay = (ms:number) => new Promise(resolve => setTimeout(resolve,ms));
async function until(test:()=>boolean, label:string) {
  for(let i=0;i<160;i++){if(test())return;await delay(100);}
  throw new Error('Timed out waiting for '+label);
}
export default function ResponsiveChecks(){
  const frame=useRef<HTMLIFrameElement>(null);
  const [status,setStatus]=useState('390 px preview');
  useEffect(()=>{
    if(!new URLSearchParams(location.search).has('check'))return;
    let active=true;
    const run=async()=>{
      const f=frame.current!;
      for(const width of widths){
        if(!active)return;
        f.style.width=width+'px';f.src='/?layout='+width;
        await until(()=>!!f.contentDocument?.documentElement.dataset.theme&&f.contentWindow?.location.search==='?layout='+width,'application');
        if(!active)return;
        const d=f.contentDocument!, win=f.contentWindow!;
        await d.fonts.ready;
        if(!active)return;
        const visible=(e:Element)=>e.getClientRects().length>0;
        const check=(value:boolean,label:string)=>{if(!value)throw new Error(width+' px · '+label);};
        const click=(selector:string)=>{const button=[...d.querySelectorAll<HTMLElement>(selector)].find(visible);if(!button)throw new Error('Missing '+selector);button.click();};
        function fits(label:string){check(d.documentElement.scrollWidth<=d.documentElement.clientWidth+1,label+' overflows horizontally');}
        check(d.fonts.check('500 16px "Source Sans 3"')&&d.fonts.check('italic 500 32px "Spectral"'),'webfonts');
        check(parseFloat(win.getComputedStyle(d.querySelector('.desk-note')!).fontSize)>=15,'file hint size');
        fits('home');click('.sample-ticket,.sample-link');
        await until(()=>!!d.querySelector('.req-fields'),'sample review');fits('requirements');
        click('.desk-nav a[href="#tools"]');await until(()=>!!d.querySelector('.tool-grid'),'tool library');fits('library');
        click('.tool-card[href="?tool=merge-pdf"]');await until(()=>!!d.querySelector('.workspace'),'merge tool');fits('merge tool');
        check(d.querySelector('.workspace')!.textContent!.includes('100 MB'),'merge limit');
        click('.desk-nav a[href="#fill"]');await until(()=>visible(d.querySelector('.fill-sheet')!),'PDF form');fits('form');
        const limits=[...d.querySelectorAll<HTMLButtonElement>('.desk-foot button')].find(b=>b.textContent==='File limits');check(!!limits,'limits control');limits!.click();await until(()=>!!d.querySelector('dialog[open][aria-label="File limits"]'),'file limits');fits('limits');
        check(d.querySelector('dialog[open]')!.textContent!.includes('5 MB'),'data limit');
        if(active)setStatus('Passed through '+width+' px');
      }
      if(active){setStatus('PASS — 320, 390, 768, 1280, 1920 and 2560 px · home, sample review, library, merge, PDF form, file limits and fonts');f.style.width='390px';f.src='/';}
    };
    // React Strict Mode replays effects in development. Do not let the cancelled
    // first run click the sample a second time in the same iframe.
    Promise.resolve().then(()=>{if(active)return run();}).catch(error=>{if(active)setStatus('FAIL — '+String(error));});
    return()=>{active=false};
  },[]);
  return <main style={{padding:12}}><p role="status">{status}</p><iframe ref={frame} title="FormFino responsive preview" src="/" style={{width:390,height:844,border:'1px solid #ccd5df',marginTop:10,boxSizing:'content-box'}}/></main>;
}

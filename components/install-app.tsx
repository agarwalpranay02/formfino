'use client';
import {useEffect,useRef,useState} from 'react';
import {Download, X} from 'lucide-react';

type InstallPrompt=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};

export function InstallApp(){
  const [prompt,setPrompt]=useState<InstallPrompt|null>(null);
  const [installed,setInstalled]=useState(false);
  const [message,setMessage]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const display=matchMedia('(display-mode: standalone)');
    const check=()=>setInstalled(display.matches || (navigator as Navigator & {standalone?:boolean}).standalone===true);
    check();
    const available=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};
    const complete=()=>{setInstalled(true);setPrompt(null);dialog.current?.close()};
    window.addEventListener('beforeinstallprompt',available);
    window.addEventListener('appinstalled',complete);
    display.addEventListener('change',check);
    if(process.env.NODE_ENV==='production' && 'serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{/* Browsing works even if the browser disallows installation support. */});
    }
    return()=>{window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',complete);display.removeEventListener('change',check)};
  },[]);
  function close(){dialog.current?.close();trigger.current?.focus()}
  async function install(){
    if(!prompt)return;
    try{await prompt.prompt();const result=await prompt.userChoice;setPrompt(null);if(result.outcome==='accepted')close()}
    catch{setMessage('Use your browser’s menu to install FormFino.');setPrompt(null)}
  }
  if(installed)return null;
  return <><button ref={trigger} className="install-app" onClick={()=>dialog.current?.showModal()}><Download size={17}/>Install app</button>
    <dialog ref={dialog} className="legal-dialog install-dialog" aria-labelledby="install-title" onClick={event=>{if(event.target===event.currentTarget)close()}} onCancel={close}>
      <section className="legal-modal"><div className="panel-title"><h2 id="install-title">Your file desk, one tap away.</h2><button className="icon-button" aria-label="Close installation instructions" onClick={close}><X/></button></div>
        <p>Add FormFino to your home screen or desktop. It opens in its own window, with the same private file tools.</p>
        {prompt && <button className="button dark" onClick={()=>void install()}>Install FormFino<Download size={18}/></button>}
        <dl className="install-steps"><div><dt>iPhone & iPad</dt><dd>Open in Safari, tap Share, then Add to Home Screen. Turn on Open as Web App if shown, then tap Add.</dd></div><div><dt>Android</dt><dd>In Chrome, open the ⋮ menu and choose Install app or Add to Home screen.</dd></div><div><dt>Windows & Mac</dt><dd>In Chrome or Edge, use the install icon in the address bar. In Safari on Mac, choose File → Add to Dock.</dd></div></dl>
        <p>Connect to the internet when opening the app. Files are not saved in the app between sessions. Downloads stay in your device’s Downloads or Files app.</p><p role="status">{message}</p>
      </section>
    </dialog></>;
}

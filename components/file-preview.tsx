'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Loader2,ZoomIn,ZoomOut} from 'lucide-react';
import {openPdf} from '../lib/processing';
import {errorMessage} from '../lib/validation';

export function FilePreview({blob,name}:{blob:Blob;name:string}){
 const [url,setUrl]=useState(''),[page,setPage]=useState(1),[pages,setPages]=useState(0),[zoom,setZoom]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null),documentRef=useRef<Awaited<ReturnType<typeof openPdf>>|null>(null);
 const pdf=blob.type==='application/pdf';
 useEffect(()=>{
  setPage(1);setPages(0);setZoom(1);setError('');
  if(!pdf){const value=URL.createObjectURL(blob);setUrl(value);return()=>URL.revokeObjectURL(value);}
  let active=true;const controller=new AbortController();setBusy(true);
  openPdf(blob,controller.signal).then(doc=>{if(!active){void doc.destroy();return;}documentRef.current=doc;setPages(doc.numPages);}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;controller.abort();void documentRef.current?.destroy();documentRef.current=null;};
 },[blob,pdf]);
 useEffect(()=>{
  if(!pdf||!pages||!canvas.current||!documentRef.current)return;
  let active=true;let rendering:{cancel:()=>void;promise:Promise<unknown>}|undefined;setBusy(true);setError('');
  const doc=documentRef.current;
  (async()=>{const p=await doc.getPage(page);if(!active||!canvas.current)return;const natural=p.getViewport({scale:1});const viewport=p.getViewport({scale:Math.min(2,1000/natural.width,1400/natural.height)});const c=canvas.current;c.width=Math.ceil(viewport.width);c.height=Math.ceil(viewport.height);rendering=p.render({canvas:c,canvasContext:c.getContext('2d')!,viewport,background:'#fff'});await rendering.promise;p.cleanup();})().catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;rendering?.cancel();};
 },[blob,pdf,page,pages]);
 return <div className="file-preview"><div className="preview-toolbar"><span>{pdf?`Page ${page} of ${pages||'…'}`:'Image preview'}</span><div>{pdf&&<><button className="icon-button" aria-label="Previous preview page" disabled={page===1||busy} onClick={()=>setPage(page-1)}><ChevronLeft size={17}/></button><button className="icon-button" aria-label="Next preview page" disabled={page>=pages||busy} onClick={()=>setPage(page+1)}><ChevronRight size={17}/></button></>}<button className="icon-button" aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(Math.max(1,zoom-.5))}><ZoomOut size={17}/></button><button className="icon-button" aria-label="Zoom in" disabled={zoom>=3} onClick={()=>setZoom(Math.min(3,zoom+.5))}><ZoomIn size={17}/></button><span>{Math.round(zoom*100)}%</span></div></div>{error?<p className="error" role="alert">{error}</p>:<div className="preview-surface" aria-busy={busy}>{busy&&<span className="preview-loading" role="status"><Loader2 className="spin" size={20}/> Loading preview</span>}<div style={{width:`${zoom*100}%`,minHeight:200}}>{pdf?<canvas ref={canvas} role="img" aria-label={`${name}, page ${page}`} style={{display:'block',maxWidth:'100%',width:'100%',height:'auto'}}/>:url&&<img src={url} alt={name} style={{display:'block',width:'100%',height:'auto',objectFit:'contain',maxHeight:zoom===1?430:undefined}}/>}</div></div>}<p className="micro">Check small text, edges and image quality. A size check cannot confirm readability.</p></div>;
}

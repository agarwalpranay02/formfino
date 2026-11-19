'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,ArrowLeft,Check,CheckCircle2,ScanLine,ShieldCheck,Lock,Image as ImageIcon,FileText,Plus,Trash2,Bookmark,Loader2,X,Download,RotateCcw,AlertCircle,Eye} from 'lucide-react';
import {parseRequirements,demoInstructions,formatBytes,validateFiles,type Requirement} from '../lib/core';
import {imageForRequirement,recognizeDetailed,download,type Output} from '../lib/processing';
import {LIMITS, mb} from '../lib/limits';
import {validateRequirement,validateAcceptedFiles,readPresets,storePreference,errorMessage} from '../lib/validation';
import {Dropzone,OutputList} from './studio';
import {DeskSidebar} from './desk-sidebar';
import {FilePreview} from './file-preview';

type Item=Requirement&{file?:File;x:number;y:number};
export function PackBuilder({onDone,openJob}:{onDone:(name:string)=>void;openJob?:(id:string)=>void}){
 const [stage,setStage]=useState(0),[mode,setMode]=useState('screenshot'),[instructions,setInstructions]=useState(''),[items,setItems]=useState<Item[]>([]),[outputs,setOutputs]=useState<Output[]>([]);
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [presets,setPresets]=useState<{name:string;items:Requirement[]}[]>([]),[presetName,setPresetName]=useState(''),[views,setViews]=useState<Record<string,string>>({}),[screenshotFile,setScreenshotFile]=useState<File|null>(null),[screenshotUrl,setScreenshotUrl]=useState('');
 const [preview,setPreview]=useState(0),[original,setOriginal]=useState(false),[resetting,setResetting]=useState(false);
 const controller=useRef<AbortController|null>(null),panel=useRef<HTMLDivElement>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;try{setPresets(readPresets(localStorage.getItem('fr-presets')));}catch{}return()=>{mounted.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{const urls:Record<string,string>={};items.forEach(item=>{if(item.file&&item.format!=='pdf')urls[item.id]=URL.createObjectURL(item.file);});setViews(urls);return()=>Object.values(urls).forEach(u=>URL.revokeObjectURL(u));},[items]);
 useEffect(()=>{if(!screenshotFile){setScreenshotUrl('');return;}const url=URL.createObjectURL(screenshotFile);setScreenshotUrl(url);return()=>URL.revokeObjectURL(url);},[screenshotFile]);
 useEffect(()=>{if(stage>0){panel.current?.focus({preventScroll:true});panel.current?.scrollIntoView({behavior:'smooth',block:'start'});}},[stage]);
 useEffect(()=>{if(!busy&&!items.some(i=>i.file))return;const protect=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[busy,items]);
 const update=(id:string,patch:Partial<Item>,ruleChange=true)=>{setItems(a=>a.map(i=>i.id===id?{...i,...patch}:i));setOutputs([]);setError('');if(ruleChange)setConfirmed(false);};
 const go=(next:number)=>{setError('');setStage(next);setResetting(false);};
 function read(text=instructions){const parsed=parseRequirements(text);if(!parsed.length)throw new Error('No upload requirements were found. Crop to the instructions, paste the text, or enter the details manually.');setItems(parsed.map(r=>({...r,id:crypto.randomUUID(),x:.5,y:.5})));setOutputs([]);setConfirmed(false);go(1);}
 async function screenshot(files:File[]){
  setBusy(true);setError('');setNotice('');setStatus('Preparing text recognition…');const abort=new AbortController();controller.current=abort;
  try{validateAcceptedFiles(files,'image/jpeg,image/png,image/webp');setScreenshotFile(files[0]);const result=await recognizeDetailed(files[0],setStatus,abort.signal);abort.signal.throwIfAborted();setInstructions(result.text);read(result.text);if(result.confidence<80)setNotice('Some screenshot text was unclear. Compare every number with the image below.');}
  catch(e){if(mounted.current)setError(abort.signal.aborted?'Reading cancelled. Your original file is unchanged.':errorMessage(e));}
  finally{if(mounted.current)setBusy(false);controller.current=null;}
 }
 function add(){if(items.length>=20){setError('Use at most 20 requirements per pack.');return;}setItems(a=>[...a,{id:crypto.randomUUID(),label:`Document ${a.length+1}`,format:'jpg',width:0,height:0,minKB:0,maxKB:0,fit:'contain',x:.5,y:.5}]);setConfirmed(false);setOutputs([]);go(1);}
 function save(){try{items.forEach(validateRequirement);const name=presetName.trim();if(!name||!items.length)return;const next=[...presets.filter(p=>p.name!==name),{name,items:items.map(({id,label,format,width,height,minKB,maxKB,fit})=>({id,label,format,width,height,minKB,maxKB,fit}))}].slice(-20);setPresets(next);setNotice(storePreference('fr-presets',JSON.stringify(next))?'Preset saved on this device. Files are not saved.':'Browser storage is unavailable; preset saved for this session only.');setPresetName('');}catch(e){setError(errorMessage(e));}}
 async function prepare(){
  setError('');setOutputs([]);setBusy(true);const abort=new AbortController();controller.current=abort;
  try{if(!confirmed)throw new Error('Confirm the requirements first.');items.forEach(validateRequirement);for(const item of items)if(!item.file)throw new Error(`Add a file for ${item.label}.`);validateFiles(items.map(i=>i.file!));const next:Output[]=[];
   for(const item of items){abort.signal.throwIfAborted();setStatus(`Preparing ${item.label}…`);next.push(item.format==='pdf'?await (await import('../lib/pdf-target')).pdfForRequirement(item.file!,item,setStatus,abort.signal):await imageForRequirement(item.file!,item,item.x,item.y,abort.signal));}
   abort.signal.throwIfAborted();if(mounted.current){setOutputs(next);setPreview(0);setOriginal(false);go(3);onDone('Application pack');}
  }catch(e){if(mounted.current)setError(abort.signal.aborted?'Preparation cancelled. Your files and requirements are still here.':errorMessage(e));}
  finally{if(mounted.current)setBusy(false);controller.current=null;}
 }
 function trySample() {
   setScreenshotFile(null);
   setInstructions(demoInstructions);
   setNotice('These are sample requirements. Replace them with the values from your form.');
   try { read(demoInstructions); } catch (e) { setError(errorMessage(e)); }
 }
 function reset(){controller.current?.abort();setItems([]);setOutputs([]);setInstructions('');setScreenshotFile(null);setConfirmed(false);setNotice('');go(0);}
 function report(){const payload={product:'FormFino',createdAt:new Date().toISOString(),units:'KB = 1,000 bytes',scope:'Technical checks against user-confirmed requirements. Portal acceptance and visual quality need human review.',files:outputs.map(o=>({name:o.name,...o.validation,note:o.note}))};download({name:'formfino-check-report.json',blob:new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})});}
 const missing=items.filter(i=>!i.file).length;
 const current=outputs[preview],source=items[preview]?.file;
 return <div className={`application-desk stage-${stage}`}>
  <div className="desk-heading prepare-heading"><div><h1>Get your files <em>ready to submit.</em></h1><p>Show us the form’s upload instructions. We’ll size your photos and documents to match.</p></div>
    {stage===0&&!items.length&&<button type="button" className="sample-ticket" onClick={trySample} disabled={busy}>
      <span className="ticket-top"><ScanLine size={19}/> Try a sample form <ArrowUpRight size={18}/></span>
      <span className="ticket-rule"><span>Photo</span><strong>200 × 230 px</strong></span>
      <span className="ticket-rule"><span>Signature</span><strong>Under 20 KB</strong></span>
    </button>}
    {items.length>0&&<div className="reset-row">{resetting?<><p>Clear this pack?</p><button className="text-button" onClick={reset}>Clear pack</button><button className="text-button" onClick={()=>setResetting(false)}>Keep working</button></>:<button className="text-button" disabled={busy} onClick={()=>setResetting(true)}><RotateCcw size={15}/> Start again</button>}</div>}
  </div>
  <div className="desk-columns">
   <section className="flow-panel desk-sheet" ref={panel} tabIndex={-1} aria-label="Prepare an application pack">
    <ol className="desk-progress" aria-label="Application progress">{['Start','Check details','Add files','Download'].map((label,i)=><li key={label} aria-current={i===stage?'step':undefined} className={i<stage?'passed':''}><span>{i<stage?<Check size={13}/>:i+1}</span>{label}</li>)}</ol>
    <div className="flow-content"><div className="flow-title"><h2>{['Start with the form’s instructions','Check the file requirements','Add your originals','Review and download'][stage]}</h2>{stage>0&&<button className="icon-button" disabled={busy} aria-label="Go back one step" onClick={()=>go(stage-1)}><ArrowLeft size={20}/></button>}</div>
    <fieldset className="flow-fields" disabled={busy} aria-busy={busy}>
    {stage===0&&<>
     <div className="input-mode" aria-label="Choose instruction input"><button aria-pressed={mode==='screenshot'} className={mode==='screenshot'?'selected':''} onClick={()=>setMode('screenshot')}><ScanLine size={16}/> Screenshot</button><button aria-pressed={mode==='text'} className={mode==='text'?'selected':''} onClick={()=>setMode('text')}><FileText size={16}/> Paste text</button></div>
     {mode==='screenshot'?<div className="screenshot-entry"><Dropzone accept="image/jpeg,image/png,image/webp" onFiles={screenshot} disabled={busy} title="Choose a screenshot" hint="or drag the instructions image here"/><p className="desk-note">JPG, PNG or WebP · English text · Up to {mb(LIMITS.fileBytes)}</p></div>:<><label className="field-label" htmlFor="instructions">Paste the upload instructions from your form</label><textarea id="instructions" className="instructions-input" value={instructions} maxLength={30000} onChange={e=>{setInstructions(e.target.value);setError('');}} placeholder={demoInstructions}/><button className="button dark full" disabled={!instructions.trim()} onClick={()=>{try{setScreenshotFile(null);setNotice('');read();}catch(e){setError(errorMessage(e));}}}>Read requirements <ArrowRight size={17}/></button></>}
     <div className="entry-options"><button className="text-button sample-link" onClick={trySample}>Try a sample <ArrowUpRight size={14}/></button><button className="text-button" onClick={add}>Enter manually</button></div>
     {presets.length>0&&<label className="preset-select">Your saved presets<select value="" onChange={e=>{const p=presets[+e.target.value];if(p){setItems(p.items.map(i=>({...i,id:crypto.randomUUID(),x:.5,y:.5})));setInstructions('');setScreenshotFile(null);setConfirmed(false);setOutputs([]);setNotice('Saved requirements can change. Check them against your current form.');go(1);}}}><option value="" disabled>Choose a preset</option>{presets.map((p,i)=><option key={i} value={i}>{p.name}</option>)}</select></label>}
    </>}
    {stage===1&&<>
     <p className="flow-help">Compare these values with your form. Blank fields mean no limit was detected. Size limits use 1 KB = 1,000 bytes.</p>
     {notice&&<p className="notice" role="status"><AlertCircle size={17}/>{notice}</p>}
     {screenshotUrl&&<details className="source-details"><summary><Eye size={15}/> Compare with your screenshot</summary><img src={screenshotUrl} alt="Original upload requirements screenshot"/></details>}
     {items.map((item,index)=><article className="requirement-card" key={item.id}><div className="req-title"><span className="file-icon">{item.format==='pdf'?<FileText size={20}/>:<ImageIcon size={20}/>}</span><input aria-label={`Document ${index+1} label`} value={item.label} maxLength={80} onChange={e=>update(item.id,{label:e.target.value})}/><button className="icon-button" aria-label={`Remove ${item.label}`} onClick={()=>{setItems(a=>a.filter(i=>i.id!==item.id));setOutputs([]);setConfirmed(false);}}><Trash2 size={16}/></button></div>
      <div className="req-fields"><label>Format<select value={item.format} onChange={e=>update(item.id,{format:e.target.value as Requirement['format'],file:undefined})}><option value="jpg">JPG</option><option value="png">PNG</option><option value="pdf">PDF</option></select></label>{item.format!=='pdf'&&<><label>Width · px<input type="number" min="0" max="10000" value={item.width||''} placeholder="Original" onChange={e=>update(item.id,{width:Number(e.target.value)})}/></label><label>Height · px<input type="number" min="0" max="10000" value={item.height||''} placeholder="Original" onChange={e=>update(item.id,{height:Number(e.target.value)})}/></label></>}<label>Min · KB<input type="number" min="0" max="50000" step="any" value={item.minKB||''} placeholder="None" onChange={e=>update(item.id,{minKB:Number(e.target.value)})}/></label><label>Max · KB<input type="number" min="0" max="50000" step="any" value={item.maxKB||''} placeholder="None" onChange={e=>update(item.id,{maxKB:Number(e.target.value)})}/></label></div>
      {!!item.warnings?.length&&<ul className="rule-warnings">{item.warnings.map(w=><li key={w}>{w}</li>)}</ul>}
      {item.sourceText&&<details className="source-details"><summary>Detected source text</summary><p>{item.sourceText}</p></details>}
     </article>)}
     <button className="text-button" onClick={add}><Plus size={16}/> Add another requirement</button>
     <details className="save-details"><summary><Bookmark size={15}/> Save these requirements for next time</summary><div className="preset-save"><input aria-label="Preset name" value={presetName} maxLength={80} placeholder="e.g. My university application" onChange={e=>setPresetName(e.target.value)}/><button className="button light small" disabled={!presetName.trim()||!items.length} onClick={save}>Save preset</button></div></details>
     <label className="confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I checked the formats, dimensions and size limits against my form.</span></label>
     <button className="button dark full" disabled={!confirmed||!items.length} onClick={()=>{try{items.forEach(validateRequirement);go(2);}catch(e){setError(errorMessage(e));}}}>Continue to my files <ArrowRight size={17}/></button>
    </>}
    {stage===2&&<>
     <p className="flow-help">Add an original for each requirement. We’ll prepare a copy and check its dimensions, format and file size.</p>
     {items.map(item=><article className="requirement-card file-requirement" key={item.id}><div className="file-requirement-heading"><span className={`tool-icon ${item.format==='pdf'?'pdf':'image'}`}>{item.format==='pdf'?<FileText size={20}/>:<ImageIcon size={20}/>}</span><div><h3>{item.label}</h3><p>{item.format.toUpperCase()}{item.width||item.height?` · ${item.width||'auto'} × ${item.height||'auto'} px`:''}{item.maxKB?` · ${item.minKB?`${item.minKB}–`: 'up to '}${item.maxKB} KB`:item.minKB?` · at least ${item.minKB} KB`:''}</p></div>{item.file&&<CheckCircle2 size={19} className="success-icon"/>}</div>
      {item.file?<div className="attached-file">{views[item.id]&&<img src={views[item.id]} alt={`${item.label} placement preview`} style={{aspectRatio:item.width&&item.height?`${item.width}/${item.height}`:'1',objectFit:item.fit,objectPosition:`${item.x*100}% ${item.y*100}%`}}/>}<div><strong>{item.file.name}</strong><small>{formatBytes(item.file.size)}</small>{item.format!=='pdf'&&<><label className="inline-select">Image placement<select value={item.fit} onChange={e=>update(item.id,{fit:e.target.value as Item['fit']},false)}><option value="contain">Keep the entire image · white padding</option><option value="cover">Crop to fill the required dimensions</option></select></label>{item.fit==='cover'&&<div className="sliders"><label>Horizontal<input aria-label={`${item.label} horizontal crop`} type="range" min="0" max="1" step=".01" value={item.x} onChange={e=>update(item.id,{x:Number(e.target.value)},false)}/></label><label>Vertical<input aria-label={`${item.label} vertical crop`} type="range" min="0" max="1" step=".01" value={item.y} onChange={e=>update(item.id,{y:Number(e.target.value)},false)}/></label></div>}</>}</div><button className="icon-button" aria-label={`Remove file for ${item.label}`} onClick={()=>update(item.id,{file:undefined},false)}><X size={16}/></button></div>:<Dropzone accept={item.format==='pdf'?'.pdf':'image/jpeg,image/png,image/webp'} compact disabled={busy} title={`Choose ${item.label.toLowerCase()} file`} onFiles={files=>{try{validateFiles([...items.flatMap(i=>i.id!==item.id&&i.file?[i.file]:[]),files[0]]);update(item.id,{file:files[0]},false);}catch(e){setError(errorMessage(e));}}}/>}
      {item.format==='pdf'&&<p className="micro">If needed, we’ll compress up to 20 pages to meet the limit. Raster conversion removes selectable text; review every page. Digitally signed PDFs are not compressed.</p>}
     </article>)}
     <button className="button dark full" disabled={busy||missing>0} onClick={prepare}>{missing?`Add ${missing} more ${missing===1?'file':'files'} to continue`:<>Prepare my files <ArrowRight size={17}/></>}</button><p className="micro centered"><Lock size={12}/> Originals stay untouched. Files are not uploaded.</p>
    </>}
    </fieldset>
    {busy&&<div className="processing-status" role="status"><div><Loader2 className="spin" size={21}/><span>{status||'Preparing…'}<small>Working on this device. Keep this tab open.</small></span></div><button className="button light small" onClick={()=>controller.current?.abort()}>Cancel</button></div>}
    {error&&<p className="error" role="alert">{error}</p>}
    {stage===3&&outputs.length>0&&<><div className="checked-banner"><CheckCircle2 size={24}/><div><strong>{outputs.length} {outputs.length===1?'file matches':'files match'} your confirmed requirements</strong><p>Review appearance and legibility before submitting.</p></div></div><div className="review-tabs" aria-label="File to preview">{outputs.map((o,i)=><button key={i} aria-pressed={preview===i} className={preview===i?'selected':''} onClick={()=>{setPreview(i);setOriginal(false);}}>{o.name}</button>)}</div>{current&&<><div className="comparison-switch"><button className={!original?'selected':''} aria-pressed={!original} onClick={()=>setOriginal(false)}>Prepared · {formatBytes(current.blob.size)}</button><button className={original?'selected':''} aria-pressed={original} onClick={()=>setOriginal(true)}>Original · {formatBytes(source?.size||0)}</button></div><FilePreview key={`${preview}-${original}`} blob={original&&source?source:current.blob} name={current.name}/>{current.validation?.rasterized&&<p className="notice"><AlertCircle size={17}/>This PDF was rebuilt as images. Check every page; selectable text and interactive fields are not retained.</p>}</>}<OutputList outputs={outputs}/><button className="text-button report-download" onClick={report}><Download size={15}/> Download technical check report</button><p className="micro">The report contains output names and measured values, not file contents. Portal acceptance also depends on the official instructions and visual quality.</p></>}
   </div>
   <div className="desk-privacy"><Lock size={14}/> Files are processed on this device.</div>
  </section>
  {stage===0&&openJob&&<DeskSidebar open={openJob}/>}
  </div>
 </div>;
}

'use client';
import {useState} from 'react';
import {FilePenLine, Download} from 'lucide-react';
import {Dropzone} from './studio';
import {download} from '../lib/processing';
import {LIMITS, mb} from '../lib/limits';
import {safeName} from '../lib/core';
import {assertFileKind, errorMessage} from '../lib/validation';
import type {FieldValue, FormField} from '../lib/form-fields';
import {FilePreview} from './file-preview';

export function FillForm(){
  const [source,setSource]=useState<File|null>(null);
  const [fields,setFields]=useState<FormField[]>([]);
  const [changes,setChanges]=useState(new Map<string,FieldValue>());
  const [skipped,setSkipped]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<Blob|null>(null);

  async function choose([file]:File[]){
    setBusy(true);setError('');
    try {
      await assertFileKind(file,'pdf');
      const {inspectForm}=await import('../lib/form-fields');
      const parsed=await inspectForm(new Uint8Array(await file.arrayBuffer()));
      setSource(file);setFields(parsed.fields);setSkipped(parsed.skipped);setChanges(new Map());setResult(null);
    } catch(e){setError(errorMessage(e));} finally{setBusy(false);}
  }
  function edit(name:string,value:FieldValue){
    setChanges(before=>new Map(before).set(name,value));setResult(null);setError('');
  }
  async function prepare(){
    if(!source)return;
    setBusy(true);setError('');
    try{
      const {fillForm}=await import('../lib/form-fields');
      const out=await fillForm(new Uint8Array(await source.arrayBuffer()),changes);
      setResult(new Blob([out as BlobPart],{type:'application/pdf'}));
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  const name=source?safeName(source.name)+'-filled.pdf':'filled.pdf';
  return <section className="desk-page fill-page">
    <div className="desk-heading"><div><h1>Fill a PDF form</h1><p>Edit an interactive PDF and save a copy with your answers.</p></div><FilePenLine aria-hidden="true"/></div>
    <div className="fill-sheet">
      {!source?<><Dropzone accept=".pdf" disabled={busy} title="Choose a fillable PDF" hint="Drop your form here or browse files" onFiles={choose}/><p className="desk-note">Interactive PDF fields only · Up to {mb(LIMITS.fileBytes)} · Processed on this device</p></>:<>
        <div className="fill-source"><strong>{source.name}</strong><span>{fields.length} editable {fields.length===1?'field':'fields'}</span><button disabled={busy} onClick={()=>{setSource(null);setResult(null);setFields([]);setChanges(new Map());setError('');}}>Choose another PDF</button></div>
        {skipped>0&&<p className="desk-note">{skipped} locked or unsupported fields will keep their original values.</p>}
        <fieldset disabled={busy} className="fill-fields">
          {fields.map((field,i)=>{
            const value=changes.get(field.name)??field.value;
            return <div className="fill-field" key={field.name}><label htmlFor={'answer-'+i}>{field.name}{field.required?' (required by issuer)':''}</label>
              {field.type==='checkbox'?<input id={'answer-'+i} type="checkbox" checked={value===true} onChange={e=>edit(field.name,e.target.checked)}/>:
              field.type==='choice'||field.type==='multiple'?<select id={'answer-'+i} multiple={field.type==='multiple'} value={value as string|string[]} onChange={e=>edit(field.name,field.type==='multiple'?Array.from(e.target.selectedOptions,o=>o.value):e.target.value)}>{field.type==='choice'&&<option value="">No selection</option>}{field.options?.map(v=><option key={v} value={v}>{v}</option>)}</select>:
              field.type==='multiline'?<textarea id={'answer-'+i} maxLength={field.maxLength} value={String(value)} onChange={e=>edit(field.name,e.target.value)}/>:<input id={'answer-'+i} maxLength={field.maxLength} value={String(value)} onChange={e=>edit(field.name,e.target.value)}/>}
            </div>;
          })}
          <button className="button dark" disabled={!changes.size} onClick={prepare}>Prepare filled copy</button>
        </fieldset>
        {result&&<div className="fill-result"><h2>Review your filled copy</h2><FilePreview blob={result} name={name}/><button className="button dark" onClick={()=>download({name,blob:result})}><Download size={18}/> Download filled PDF</button></div>}
      </>}
      {busy&&<p role="status">Processing your form…</p>}{error&&<p className="error" role="alert">{error}</p>}
    </div>
  </section>;
}

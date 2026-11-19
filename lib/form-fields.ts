import {LIMITS, mb} from './limits.ts';
import {
  PDFCheckBox, PDFDict, PDFDocument, PDFDropdown, PDFName,
  PDFOptionList, PDFRadioGroup, PDFTextField,
} from 'pdf-lib';

export type FieldValue = string | string[] | boolean;
export type FormField = {
  name: string;
  type: 'text' | 'multiline' | 'checkbox' | 'choice' | 'multiple';
  value: FieldValue;
  options?: string[];
  maxLength?: number;
  required: boolean;
};

async function loadForm(bytes: Uint8Array) {
  if (bytes.byteLength > LIMITS.fileBytes) throw new Error('Choose a PDF up to ' + mb(LIMITS.fileBytes) + '.');
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  if (doc.getPageCount() > 1000) throw new Error('Use a form with at most 1,000 pages.');
  const dict = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
  if (dict?.has(PDFName.of('XFA'))) throw new Error('This is an XFA form. Open it in the application recommended by the issuer.');
  const signed = doc.context.enumerateIndirectObjects().some(([, value]) =>
    value instanceof PDFDict && (value.has(PDFName.of('ByteRange')) || value.get(PDFName.of('Type')) === PDFName.of('Sig')));
  if (signed) throw new Error('This PDF contains a digital signature. Use an unsigned original to make changes.');
  if (!dict) throw new Error('This PDF has no fillable fields. Choose an interactive PDF form.');
  return doc;
}

export async function inspectForm(bytes: Uint8Array) {
  const doc = await loadForm(bytes);
  const all = doc.getForm().getFields();
  if (all.length > 500) throw new Error('This form has more than 500 fields. Use the issuer’s recommended editor.');
  const fields: FormField[] = [];
  for (const field of all) {
    if (field.isReadOnly()) continue;
    const base = { name: field.getName(), required: field.isRequired() };
    if (field instanceof PDFTextField && !field.isPassword()) {
      fields.push({...base, type:field.isMultiline()?'multiline':'text', value:field.getText()||'', maxLength:Math.min(10000,field.getMaxLength()??10000)});
    } else if (field instanceof PDFCheckBox) {
      fields.push({...base, type:'checkbox', value:field.isChecked()});
    } else if (field instanceof PDFRadioGroup) {
      fields.push({...base, type:'choice', value:field.getSelected()||'', options:field.getOptions()});
    } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
      const multi = field.isMultiselect();
      fields.push({...base, type:multi?'multiple':'choice', value:multi?field.getSelected():field.getSelected()[0]||'', options:field.getOptions()});
    }
  }
  if (!fields.length) throw new Error('This form has no supported editable fields. Scanned pages and locked fields cannot be filled here.');
  return { fields, skipped:all.length-fields.length, pages:doc.getPageCount() };
}

export async function fillForm(bytes: Uint8Array, changes: ReadonlyMap<string,FieldValue>) {
  if (!changes.size) throw new Error('Edit at least one field before preparing a copy.');
  const doc = await loadForm(bytes);
  const form = doc.getForm();
  for (const [name,value] of changes) {
    const field = form.getField(name);
    if (field.isReadOnly()) throw new Error('A locked field cannot be changed.');
    if (field instanceof PDFTextField && typeof value==='string' && !field.isPassword()) field.setText(value);
    else if (field instanceof PDFCheckBox && typeof value==='boolean') value ? field.check() : field.uncheck();
    else if (field instanceof PDFRadioGroup && typeof value==='string') value ? field.select(value) : field.clear();
    else if ((field instanceof PDFDropdown || field instanceof PDFOptionList) && typeof value!=='boolean') {
      const selected = Array.isArray(value) ? value : value ? [value] : [];
      if (selected.some(v=>!field.getOptions().includes(v))) throw new Error('Select one of the options printed in the form.');
      selected.length ? field.select(selected) : field.clear();
    } else throw new Error('This field cannot be changed here.');
  }
  try { return await doc.save(); }
  catch (error) {
    if (error instanceof Error && /WinAnsi|cannot encode/i.test(error.message)) throw new Error('The PDF font cannot display one of the entered characters. Use an editor with a font for that language.');
    throw error;
  }
}

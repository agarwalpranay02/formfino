import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument, PDFName} from 'pdf-lib';
import {fillForm, inspectForm} from '../lib/form-fields.ts';
import {parseRequirements} from '../lib/requirements.ts';

test('interactive form round trip preserves locked values and editable fields', async()=>{
  const doc=await PDFDocument.create();
  const page=doc.addPage();
  const form=doc.getForm();
  form.createTextField('Name').addToPage(page);
  form.createCheckBox('Agreed').addToPage(page);
  const role=form.createDropdown('Course');role.addOptions(['A','B']);role.addToPage(page);
  const locked=form.createTextField('Issued by');locked.setText('Registrar');locked.enableReadOnly();locked.addToPage(page);
  const original=await doc.save();
  const info=await inspectForm(original);
  assert.equal(info.skipped,1);assert.equal(info.fields.length,3);
  const updated=await fillForm(original,new Map<string,string|boolean>([['Name','Ada'],['Agreed',true],['Course','B']]));
  const saved=(await PDFDocument.load(updated)).getForm();
  assert.equal(saved.getTextField('Name').getText(),'Ada');
  assert.equal(saved.getCheckBox('Agreed').isChecked(),true);
  assert.deepEqual(saved.getDropdown('Course').getSelected(),['B']);
  assert.equal(saved.getTextField('Issued by').getText(),'Registrar');
  assert.equal((await PDFDocument.load(original)).getForm().getTextField('Name').getText(),undefined);
  await assert.rejects(fillForm(original,new Map([['Issued by','Changed']])),/locked/);
});
test('static, XFA and signed PDFs are rejected before editing',async()=>{
  const doc=await PDFDocument.create();doc.addPage();
  await assert.rejects(inspectForm(await doc.save()),/no fillable fields/);
  const form=doc.getForm();form.createTextField('A');
  const dict=doc.catalog.lookup(PDFName.of('AcroForm'))!;
  (dict as import('pdf-lib').PDFDict).set(PDFName.of('XFA'),PDFName.of('Example'));
  await assert.rejects(inspectForm(await doc.save({updateFieldAppearances:false})),/XFA/);
  (dict as import('pdf-lib').PDFDict).delete(PDFName.of('XFA'));
  doc.context.register(doc.context.obj({Type:'Sig',ByteRange:[0,1,2,3]}));
  await assert.rejects(inspectForm(await doc.save()),/signature/);
});
test('separate portal minimum and maximum with “of” retain their direction',()=>{
  const [rule]=parseRequirements('Photograph: JPG. File size minimum of 5 KB and maximum of 600 KB.');
  assert.deepEqual([rule.minKB,rule.maxKB],[5,600]);
});

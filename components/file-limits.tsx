import {LIMITS, mb} from '../lib/limits';

export function FileLimits() {
  const rows = [
    ['Merge, extract or rotate PDF pages · inspect PDF metadata or page sizes', mb(LIMITS.structuralPdfBytes) + ' per file'],
    ['Other PDF tools, fillable forms, images and screenshots', mb(LIMITS.fileBytes) + ' per file'],
    ['Multiple-file tools', LIMITS.files + ' files, ' + mb(LIMITS.batchBytes) + ' combined'],
    ['Application packs', '20 requirements per pack'],
    ['Images', '40 megapixels, up to 10,000 pixels per side'],
    ['PDF pages', '1,000 pages for structural tools and fillable forms'],
    ['PDFs rendered as images', '150 pages and 64 megapixels in total per file'],
    ['PDF size targeting in a pack', '20 pages when recompression is needed'],
    ['Fillable forms', '500 fields'],
    ['CSV and JSON data tools', mb(LIMITS.dataBytes) + ' and 1 million cells'],
    ['Text tools', '2 million characters'],
  ];
  return <><p>Limits apply before or during processing on your device. Large images and scanned pages can use more memory than their file size suggests.</p>
    <dl className="limit-list">{rows.map(([task, limit]) => <div key={task}><dt>{task}</dt><dd>{limit}</dd></div>)}</dl></>;
}

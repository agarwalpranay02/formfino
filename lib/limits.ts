// Decimal units match the limits shown by upload portals.
export const LIMITS = {
  fileBytes: 50_000_000,
  structuralPdfBytes: 100_000_000,
  batchBytes: 150_000_000,
  dataBytes: 5_000_000,
  files: 30,
  pages: 1_000,
  pixels: 40_000_000,
  textCharacters: 2_000_000,
};
const largePdfTools = new Set(['merge-pdf', 'extract-pages', 'rotate-pdf', 'metadata-pdf', 'pdf-info']);
export function inputLimit(tool: {id: string; group: string}) {
  if (tool.group === 'Data') return LIMITS.dataBytes;
  return largePdfTools.has(tool.id) ? LIMITS.structuralPdfBytes : LIMITS.fileBytes;
}
export function mb(bytes: number) { return (bytes / 1_000_000) + ' MB'; }

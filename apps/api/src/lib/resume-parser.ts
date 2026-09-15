import { extractText } from 'unpdf';
import { unzipSync, strFromU8 } from 'fflate';

export async function extractResumeText(buffer: ArrayBuffer, ext: string): Promise<string> {
  if (ext === 'pdf') {
    return extractPdf(buffer);
  }
  if (ext === 'docx') {
    return extractDocx(buffer);
  }
  return new TextDecoder().decode(buffer);
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await extractText(new Uint8Array(buffer), { mergePages: true });
  return (pdf.text ?? '').trim().slice(0, 8000);
}

function extractDocx(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const docXml = files['word/document.xml'];
  if (!docXml) return '';
  const xml = strFromU8(docXml);
  // Strip XML tags and collapse whitespace
  return xml
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x[0-9A-Fa-f]+;/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 8000);
}

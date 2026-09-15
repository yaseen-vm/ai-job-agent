import { unzipSync, strFromU8 } from 'fflate';

export type ResumeInput =
  | { type: 'pdf'; base64: string }
  | { type: 'text'; text: string };

export function prepareResume(buffer: ArrayBuffer, ext: string): ResumeInput {
  if (ext === 'pdf') {
    return { type: 'pdf', base64: bufferToBase64(buffer) };
  }
  if (ext === 'docx') {
    return { type: 'text', text: extractDocx(buffer) };
  }
  return { type: 'text', text: new TextDecoder().decode(buffer).slice(0, 8000) };
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function extractDocx(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const docXml = files['word/document.xml'];
  if (!docXml) return '';
  return strFromU8(docXml)
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

import { unzipSync, strFromU8 } from 'fflate';

export async function extractResumeText(buffer: ArrayBuffer, ext: string): Promise<string> {
  if (ext === 'pdf') return extractPdf(buffer);
  if (ext === 'docx') return extractDocx(buffer);
  return new TextDecoder().decode(buffer).slice(0, 8000);
}

// Regex-based PDF text extractor — works for digitally-created PDFs (Word, Google Docs, etc.)
// Scanned/image-only PDFs will yield an empty string.
function extractPdf(buffer: ArrayBuffer): string {
  // PDFs embed Latin-1 strings; decode byte-by-byte to preserve them
  const bytes = new Uint8Array(buffer);
  let raw = '';
  for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);

  const parts: string[] = [];

  // Walk every BT…ET text block
  const blockRe = /BT([\s\S]*?)ET/g;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(raw)) !== null) {
    const content = block[1];
    // Match Tj / ' / " operators: (string) Tj  or  [(arr)] TJ
    const strRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")|(\[(?:[^\]]*)\])\s*TJ/g;
    let m: RegExpExecArray | null;
    while ((m = strRe.exec(content)) !== null) {
      if (m[1] !== undefined) {
        parts.push(decodePdfString(m[1]));
      } else if (m[2] !== undefined) {
        // TJ array: extract strings inside parens
        const arrRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
        let a: RegExpExecArray | null;
        while ((a = arrRe.exec(m[2])) !== null) parts.push(decodePdfString(a[1]));
      }
    }
    parts.push('\n');
  }

  // Also extract hex strings that appear in text blocks (common in newer PDFs)
  const hexBlockRe = /BT([\s\S]*?)ET/g;
  while ((block = hexBlockRe.exec(raw)) !== null) {
    const hexRe = /<([0-9A-Fa-f]+)>\s*Tj/g;
    let h: RegExpExecArray | null;
    while ((h = hexRe.exec(block[1])) !== null) {
      parts.push(hexToString(h[1]));
    }
  }

  return parts
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 8000);
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\(.)/g, '$1');
}

function hexToString(hex: string): string {
  let out = '';
  for (let i = 0; i + 1 < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
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

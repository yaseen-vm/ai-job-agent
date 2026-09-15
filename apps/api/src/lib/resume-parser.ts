import { inflateSync, unzipSync, strFromU8 } from 'fflate';

export async function extractResumeText(buffer: ArrayBuffer, ext: string): Promise<string> {
  if (ext === 'pdf') return extractPdf(buffer);
  if (ext === 'docx') return extractDocx(buffer);
  return new TextDecoder().decode(buffer).slice(0, 8000);
}

function extractPdf(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Decode byte-by-byte (Latin-1) so binary offsets stay correct
  const raw = Array.from(bytes, b => String.fromCharCode(b)).join('');

  const contentTexts: string[] = [];

  // Find every PDF object stream — match the dict + stream body using /Length
  // Pattern: <<...>> stream\r?\n<bytes>\r?\nendstream
  // We use /Length to know exactly how many bytes to read so compressed
  // bytes that contain "endstream" literally don't confuse us.
  const dictStreamRe = /(<<[\s\S]{0,1024}?>>)\s*stream\r?\n/g;
  let ds: RegExpExecArray | null;
  while ((ds = dictStreamRe.exec(raw)) !== null) {
    const dict = ds[1];

    // Only process content streams (skip images, metadata, etc.)
    if (dict.includes('/Image') || dict.includes('/XObject')) continue;

    const lengthMatch = /\/Length\s+(\d+)/.exec(dict);
    if (!lengthMatch) continue;
    const length = parseInt(lengthMatch[1], 10);
    if (!length || length > 2_000_000) continue;

    const streamStart = ds.index + ds[0].length;
    const streamBytes = bytes.slice(streamStart, streamStart + length);

    let content: string;
    if (dict.includes('/FlateDecode') || dict.includes('/Fl ') || dict.includes('/Fl\n') || dict.includes('/Fl>')) {
      try {
        const decompressed = inflateSync(streamBytes);
        content = Array.from(decompressed, b => String.fromCharCode(b)).join('');
      } catch {
        // Try without the last few bytes (some PDFs have trailing garbage)
        try {
          const decompressed = inflateSync(streamBytes.slice(0, -4));
          content = Array.from(decompressed, b => String.fromCharCode(b)).join('');
        } catch {
          continue;
        }
      }
    } else {
      content = Array.from(streamBytes, b => String.fromCharCode(b)).join('');
    }

    contentTexts.push(extractTextOps(content));
  }

  // Fallback: if no streams found (uncompressed or old-style PDF), scan raw bytes
  if (!contentTexts.some(t => t.trim().length > 0)) {
    contentTexts.push(extractTextOps(raw));
  }

  return contentTexts
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 8000);
}

function extractTextOps(content: string): string {
  const parts: string[] = [];
  const blockRe = /BT([\s\S]*?)ET/g;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(content)) !== null) {
    const b = block[1];

    // Tj / ' / "  operators with literal string
    const litRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
    let m: RegExpExecArray | null;
    while ((m = litRe.exec(b)) !== null) parts.push(decodePdfStr(m[1]));

    // TJ array
    const tjRe = /\[([\s\S]*?)\]\s*TJ/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRe.exec(b)) !== null) {
      const innerRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
      let inner: RegExpExecArray | null;
      while ((inner = innerRe.exec(tj[1])) !== null) parts.push(decodePdfStr(inner[1]));
    }

    // Hex strings: <AABBCC> Tj
    const hexRe = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
    let h: RegExpExecArray | null;
    while ((h = hexRe.exec(b)) !== null) parts.push(hexToStr(h[1].replace(/\s/g, '')));

    parts.push('\n');
  }
  return parts.join('');
}

function decodePdfStr(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
    .replace(/\\(.)/g, '$1');
}

function hexToStr(hex: string): string {
  let out = '';
  for (let i = 0; i + 1 < hex.length; i += 2)
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
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

import fs from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const source = process.argv[2];
if (!source) throw new Error('사용법: npm run pdf:import -- "PDF 절대 경로"');
const task = getDocument({ data: new Uint8Array(await fs.readFile(source)), useSystemFonts: true, isEvalSupported: false });
const pdf = await task.promise;
const pages = [];
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const content = await page.getTextContent();
  let lastY;
  let text = '';
  for (const item of content.items) {
    if (!('str' in item)) continue;
    const y = item.transform[5];
    if (lastY !== undefined && Math.abs(y - lastY) > 3) text += '\n';
    text += item.str + (item.hasEOL ? '\n' : ' ');
    lastY = y;
  }
  pages.push({ page: p, text: text.trim() });
}
await fs.mkdir('public/materials', { recursive: true });
await fs.copyFile(source, 'public/materials/sql-reference.pdf');
await fs.writeFile('public/materials/pages.json', JSON.stringify(pages, null, 2));
await fs.mkdir('tmp/pdfs', { recursive: true });
await fs.writeFile('tmp/pdfs/source.txt', pages.map(p => `\n===== PAGE ${p.page} =====\n${p.text}`).join('\n'));
console.log(`${pdf.numPages}쪽 전체 추출 완료 → public/materials/pages.json`);
await task.destroy();

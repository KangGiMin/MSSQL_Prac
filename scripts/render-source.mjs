import fs from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
const task = getDocument({
  data: new Uint8Array(await fs.readFile("public/materials/sql-reference.pdf")),
  useSystemFonts: true,
  isEvalSupported: false,
});
const pdf = await task.promise;
await fs.mkdir("tmp/pdfs", { recursive: true });
for (const pageNumber of [1, 24, 60, 88]) {
  const page = await pdf.getPage(pageNumber),
    viewport = page.getViewport({ scale: 1.2 });
  const { canvas, context } = pdf.canvasFactory.create(
    viewport.width,
    viewport.height,
  );
  await page.render({ canvasContext: context, viewport }).promise;
  await fs.writeFile(
    `tmp/pdfs/page-${pageNumber}.png`,
    canvas.toBuffer("image/png"),
  );
  pdf.canvasFactory.destroy({ canvas, context });
}
await task.destroy();
console.log("PDF 원본 1, 24, 60, 88쪽 렌더링 완료");

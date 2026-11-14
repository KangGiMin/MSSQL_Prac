import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const source = process.argv[2];
if (!source) throw new Error('사용법: npm run pdf:import -- "PDF 절대 경로"');
const output = path.resolve(process.argv[3] || "public/materials");
const manifestPath =
  output === path.resolve("public/materials")
    ? path.resolve("shared/source-manifest.json")
    : path.join(output, "manifest.json");
const destinationFor = (name) =>
  name === "manifest.json" ? manifestPath : path.join(output, name);
const sourceBytes = await fs.readFile(source);
const task = getDocument({
  data: new Uint8Array(sourceBytes),
  useSystemFonts: true,
  isEvalSupported: false,
});
const pdf = await task.promise;
const pages = [];
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const content = await page.getTextContent();
  let lastY;
  let text = "";
  for (const item of content.items) {
    if (!("str" in item)) continue;
    const y = item.transform[5];
    if (lastY !== undefined && Math.abs(y - lastY) > 3) text += "\n";
    text += item.str + (item.hasEOL ? "\n" : " ");
    lastY = y;
  }
  pages.push({ page: p, text: text.trim() });
}
const sha256 = createHash("sha256").update(sourceBytes).digest("hex");
let previousManifest;
try {
  previousManifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
} catch {}
const manifest = {
  pageCount: pdf.numPages,
  sourceSha256: sha256,
  curriculumSha256: previousManifest?.curriculumSha256 || null,
};
await fs.mkdir(output, { recursive: true });
const files = new Map([
  ["sql-reference.pdf", sourceBytes],
  ["pages.json", Buffer.from(JSON.stringify(pages, null, 2) + "\n")],
  ["manifest.json", Buffer.from(JSON.stringify(manifest, null, 2) + "\n")],
]);
for (const name of files.keys()) {
  try {
    if (!(await fs.lstat(destinationFor(name))).isFile())
      throw new Error(`${name}: 일반 파일이 아닌 경로는 교체할 수 없습니다.`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const token = randomUUID(),
  staged = new Map(),
  backups = new Map(),
  installed = [];
try {
  // Stage every byte before touching any original file.
  for (const [name, bytes] of files) {
    const stagedPath = path.join(
      path.dirname(destinationFor(name)),
      `.${token}-${path.basename(destinationFor(name))}.new`,
    );
    staged.set(name, stagedPath);
    await fs.writeFile(stagedPath, bytes);
  }
  for (const name of files.keys()) {
    const destination = destinationFor(name),
      backup = path.join(
        path.dirname(destinationFor(name)),
        `.${token}-${path.basename(destinationFor(name))}.bak`,
      );
    try {
      await fs.rename(destination, backup);
      backups.set(name, backup);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await fs.rename(staged.get(name), destination);
    installed.push(name);
  }
} catch (error) {
  for (const name of installed.reverse()) await fs.unlink(destinationFor(name));
  for (const [name, backup] of backups)
    await fs.rename(backup, destinationFor(name));
  throw error;
} finally {
  for (const file of staged.values()) await fs.unlink(file).catch(() => {});
  for (const backup of backups.values()) {
    // Only successful installs reach cleanup with the original still in a .bak file.
    if (installed.length === files.size)
      await fs.unlink(backup).catch(() => {});
  }
}
console.log(`${pdf.numPages}쪽 전체 추출 완료 → ${output}`);
if (manifest.curriculumSha256 !== manifest.sourceSha256)
  console.log(
    "교재가 변경되었습니다. 학습 콘텐츠와 원본 페이지 대응을 검토해 주세요.",
  );
await task.destroy();

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const execute = promisify(execFile);

test("PDF import updates actual page metadata and leaves originals intact on failure", async () => {
  const tempRoot = path.resolve(os.tmpdir()),
    directory = await fs.mkdtemp(path.join(tempRoot, "qg-pdf-test-"));
  const source = path.resolve("public/materials/sql-reference.pdf"),
    original = await fs.readFile(source);
  const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
  try {
    await execute(
      process.execPath,
      ["scripts/import-pdf.mjs", source, directory],
      { windowsHide: true },
    );
    const manifest = JSON.parse(
      await fs.readFile(path.join(directory, "manifest.json"), "utf8"),
    );
    const pages = JSON.parse(
      await fs.readFile(path.join(directory, "pages.json"), "utf8"),
    );
    assert.equal(manifest.pageCount, pages.length);
    assert.equal(manifest.sourceSha256, digest(original));
    assert.equal(
      digest(await fs.readFile(path.join(directory, "sql-reference.pdf"))),
      digest(original),
    );
    await execute(
      process.execPath,
      [
        "scripts/import-pdf.mjs",
        path.join(directory, "sql-reference.pdf"),
        directory,
      ],
      { windowsHide: true },
    );
    const previousManifest = await fs.readFile(
      path.join(directory, "manifest.json"),
      "utf8",
    );
    await fs.unlink(path.join(directory, "pages.json"));
    await fs.mkdir(path.join(directory, "pages.json"));
    await assert.rejects(
      execute(process.execPath, ["scripts/import-pdf.mjs", source, directory], {
        windowsHide: true,
      }),
    );
    assert.equal(
      await fs.readFile(path.join(directory, "manifest.json"), "utf8"),
      previousManifest,
    );
    assert.equal(
      digest(await fs.readFile(path.join(directory, "sql-reference.pdf"))),
      digest(original),
    );
    assert.equal(digest(await fs.readFile(source)), digest(original));
  } finally {
    if (!directory.startsWith(path.join(tempRoot, "qg-pdf-test-")))
      throw new Error("Unexpected temporary directory");
    await fs.rm(directory, { recursive: true, force: true });
  }
});

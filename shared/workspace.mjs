export const storagePrefix = "qg.";
export const storageKeys = Object.fromEntries(
  ["database", "queries", "history", "saved", "completed", "lessons"].map(
    (name) => [name, storagePrefix + name],
  ),
);
export const archivePrefix = storagePrefix + "archive.";
export const recoveryPrefix = storagePrefix + "recovered.";
export const practiceSessionKey = storagePrefix + "practice-session";
export const backupVersion = 1;
export const workspaceLimits = {
  records: 100,
  backupMegabytes: 20,
  queryTitleLength: 80,
};

export const sourceFiles = {
  directory: "public/materials",
  pdf: "sql-reference.pdf",
  pages: "pages.json",
  manifest: "manifest.json",
};
export const sourceUrls = {
  pdf: `${import.meta.env?.BASE_URL || "/"}materials/${sourceFiles.pdf}`,
  pages: `${import.meta.env?.BASE_URL || "/"}materials/${sourceFiles.pages}`,
};

export const defaultQueries = {
  company:
    "-- 사원 테이블에서 첫 번째 데이터를 만나 보세요.\nSELECT *\nFROM dbo.EMP;\n",
  store:
    "-- 온라인 스토어의 상품을 살펴보세요.\nSELECT *\nFROM dbo.Products;\n",
  campus:
    "-- 나의 첫 번째 SQL 쿼리\n-- 실행 버튼 또는 Ctrl + Enter를 눌러 보세요.\n\nSELECT *\nFROM dbo.exam;\n",
};

import { databases } from "../../shared/databases.mjs";
import { backupVersion, workspaceLimits } from "../../shared/workspace.mjs";
import { previewRows } from "../config/workbench.js";

export function validateBackup(data) {
  if (
    data.version !== backupVersion ||
    !data.queries ||
    databases.some((db) => typeof data.queries[db.id] !== "string") ||
    !["history", "saved", "completed", "archives"].every((key) =>
      Array.isArray(data[key]),
    )
  )
    throw new Error("올바른 QueryGround 백업 파일이 아닙니다.");
}

export function mergeRecords(imported, current) {
  return [
    ...new Map(
      [...imported, ...current]
        .filter((item) => item?.id)
        .map((item) => [item.id, item]),
    ).values(),
  ].slice(0, workspaceLimits.records);
}

export function lessonQuery(lesson, withAnswer) {
  const setup = lesson.setup ? `-- 선행 실습 준비\n${lesson.setup}` : "";
  return withAnswer
    ? `-- ${lesson.title}\n${setup}${lesson.answer}`
    : `-- ${lesson.title}\n-- ${lesson.explanation}\n\n${setup ? `${setup}\n` : ""}-- 여기에 SQL을 작성해 보세요.\n`;
}

export const quoteIdentifier = (name) => `[${name.replaceAll("]", "]]")}]`;

export const tablePreviewQuery = (table) =>
  `SELECT TOP (${previewRows}) *\nFROM ${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)};`;

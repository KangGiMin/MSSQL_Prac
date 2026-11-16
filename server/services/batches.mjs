import { queryLimits } from "../config/limits.mjs";
import { httpError } from "./errors.mjs";
// GO is a client batch separator. Ignore separators inside strings, identifiers, and comments.
export function splitBatches(source) {
  const batches = [];
  let buffer = "",
    state = "normal",
    depth = 0;
  for (const line of source.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    if (state === "normal" && /^\s*GO\s*(?:--.*)?$/i.test(line)) {
      if (buffer.trim()) batches.push(buffer.trim());
      buffer = "";
      continue;
    }
    if (state === "normal" && /^\s*GO\s+\d+\s*(?:--.*)?$/i.test(line))
      throw httpError(
        "GO 반복 횟수는 지원하지 않습니다. 배치를 나누어 실행해 주세요.",
      );
    buffer += line + "\n";
    for (let i = 0; i < line.length; i++) {
      const c = line[i],
        n = line[i + 1];
      if (state === "comment") {
        if (c === "/" && n === "*") {
          depth++;
          i++;
        } else if (c === "*" && n === "/") {
          if (--depth === 0) state = "normal";
          i++;
        }
      } else if (
        state === "string" ||
        state === "quoted" ||
        state === "bracket"
      ) {
        const end = state === "string" ? "'" : state === "quoted" ? '"' : "]";
        if (c === end) {
          if (n === end) i++;
          else state = "normal";
        }
      } else if (c === "-" && n === "-") break;
      else if (c === "/" && n === "*") {
        state = "comment";
        depth = 1;
        i++;
      } else if (c === "'") state = "string";
      else if (c === '"') state = "quoted";
      else if (c === "[") state = "bracket";
    }
  }
  if (buffer.trim()) batches.push(buffer.trim());
  if (batches.length > queryLimits.batches)
    throw httpError(
      `한 번에 최대 ${queryLimits.batches}개 배치까지 실행할 수 있습니다.`,
    );
  return batches;
}

import { concepts } from "./content/concepts.mjs";
import { exercises } from "./content/exercises.mjs";
import { advanced } from "./content/advanced.mjs";
import manifest from "./source-manifest.json" with { type: "json" };
export const lessons = [...concepts, ...exercises, ...advanced];
export const sourceCoverage = {
  pageCount: manifest.pageCount,
  matchesSource: manifest.sourceSha256 === manifest.curriculumSha256,
  concepts: concepts.length,
  exercises: exercises.length,
  advanced: advanced.length,
  missingSourceNumbers: [17, 18, 19, 20, 21, 35, 36, 37],
  note: "원본 1–50쪽의 개념과 51–90쪽에 실제 수록된 모든 문항을 수록했습니다. 51쪽 이후에는 문제·정답 쌍이 반복됩니다. 원본의 번호 중복은 25-ties, 31-column, 31-join, 32-left/right로 구분하고, 원본에 없는 번호의 문항은 만들지 않았습니다.",
};

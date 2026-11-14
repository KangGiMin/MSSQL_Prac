import assert from "node:assert/strict";

const expectedRows = {
  foundation: 5,
  "pdf-1": 15,
  "pdf-5": 4,
  "pdf-8": 2,
  "pdf-9": 2,
  "pdf-10": 2,
  "pdf-11": 20,
  "pdf-14": 140,
  "pdf-15": 2,
  "pdf-16": 30,
  "pdf-22": 1,
  "pdf-23": 121,
  "pdf-25": 10,
  "pdf-25-ties": 12,
  "pdf-26": 16,
  "pdf-27": 136,
  "pdf-28": 19,
  "pdf-29": 19,
  "pdf-30": 16,
  "pdf-31-column": 20,
  "pdf-31-join": 19,
  "pdf-32-left": 20,
  "pdf-32-right": 142,
  "pdf-33": 0,
  "pdf-34": 2,
  window: 14,
  pagination: 3,
  view: 10,
  procedure: 6,
  pivot: 6,
};
export function assertLessonResult(lesson, result) {
  const last = result.recordsets.at(-1);
  if (lesson.id in expectedRows)
    assert.equal(
      last?.totalRows,
      expectedRows[lesson.id],
      `${lesson.id}: expected row count`,
    );
  if (lesson.id === "pdf-1") {
    const index = last.columns.findIndex((c) => c.name === "영어"),
      scores = last.rows.map((row) => row[index]);
    assert.ok(scores.every((n) => n > 70));
    assert.deepEqual(
      scores,
      [...scores].sort((a, b) => b - a),
    );
  }
  if (lesson.id === "pdf-6") {
    const scores = [
      98, 95, 93, 92, 91, 90, 89, 88, 86, 85, 85, 85, 70, 60, 50, 75, 80, 65,
      77,
    ];
    assert.ok(
      Math.abs(
        Number(last.rows[0][0]) -
          scores.reduce((a, b) => a + b, 0) / scores.length,
      ) < 0.000001,
    );
  }
  if (lesson.id === "pdf-22") assert.equal(last.rows[0][0].trim(), "미등록");
  if (lesson.id === "set-ops") assert.deepEqual(last.rows, [[40]]);
  if (lesson.id === "pagination")
    assert.deepEqual(
      last.rows.map((row) => row[0]),
      [4, 5, 6],
    );
  if (lesson.id === "json") {
    assert.deepEqual(
      JSON.parse(result.recordsets[0].rows[0][0]).map((item) => item.ProductID),
      [1, 2, 3],
    );
    assert.deepEqual(last.rows, [
      [1, 2],
      [2, 3],
    ]);
  }
  if (lesson.id === "pdf-31-column") {
    const index = last.columns.findIndex((c) => c.name === "수험번호");
    assert.equal(last.rows.filter((row) => row[index] !== null).length, 15);
  }
}

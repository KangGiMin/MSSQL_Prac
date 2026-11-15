import test from "node:test";
import assert from "node:assert/strict";
import { databases } from "../shared/databases.mjs";
import {
  practiceProblems,
  pickPracticeProblem,
} from "../shared/practice-problems.mjs";

test("every dataset has multiple complete practice problems with unique IDs", () => {
  assert.equal(
    new Set(practiceProblems.map((problem) => problem.id)).size,
    practiceProblems.length,
  );
  for (const database of databases) {
    const problems = practiceProblems.filter(
      (problem) => problem.database === database.id,
    );
    assert.ok(problems.length >= 2);
    for (const problem of problems) {
      assert.ok(problem.title && problem.hint && problem.answer);
      assert.ok(
        problem.requirements.length &&
          problem.requirements.every(
            (item) => typeof item === "string" && item.trim(),
          ),
      );
      assert.ok(problem.tables.length);
      assert.match(problem.answer, /^SELECT\b/);
    }
  }
});

test("random choices stay within their dataset, cover every candidate and never immediately repeat", () => {
  for (const database of databases) {
    const pool = practiceProblems.filter(
      (problem) => problem.database === database.id,
    );
    const selected = new Set();
    for (let index = 0; index < pool.length; index++) {
      const problem = pickPracticeProblem(
        database.id,
        null,
        () => (index + 0.5) / pool.length,
      );
      assert.equal(problem.database, database.id);
      selected.add(problem.id);
    }
    assert.equal(selected.size, pool.length);
    for (const previous of pool) {
      for (const random of [() => 0, () => 0.999999]) {
        const next = pickPracticeProblem(database.id, previous.id, random);
        assert.equal(next.database, database.id);
        assert.notEqual(next.id, previous.id);
      }
    }
  }
  assert.equal(pickPracticeProblem("unknown"), null);
});

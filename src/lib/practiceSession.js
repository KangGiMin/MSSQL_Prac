import { databases } from "../../shared/databases.mjs";

const key = "qg.practice-session";

export function readPracticeSession() {
  const session = {
    view: "playground",
    problemIds: {},
    blankDatabases: [],
    reload: false,
  };
  if (typeof window === "undefined") return session;
  session.reload =
    window.performance.getEntriesByType("navigation")[0]?.type === "reload";
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(key));
    if (saved && typeof saved === "object") {
      if (["playground", "learn", "pdf", "history"].includes(saved.view))
        session.view = saved.view;
      if (saved.problemIds && typeof saved.problemIds === "object")
        session.problemIds = saved.problemIds;
      if (Array.isArray(saved.blankDatabases))
        session.blankDatabases = saved.blankDatabases.filter((id) =>
          databases.some((db) => db.id === id),
        );
    }
  } catch {
    // Refresh still clears the current editor when session storage is unavailable.
  }
  return session;
}

export function savePracticeSession(view, problems, blankDatabases) {
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        view,
        blankDatabases,
        problemIds: Object.fromEntries(
          Object.entries(problems).map(([database, problem]) => [
            database,
            problem.id,
          ]),
        ),
      }),
    );
  } catch {
    // Session metadata must never prevent editing or running SQL.
  }
}

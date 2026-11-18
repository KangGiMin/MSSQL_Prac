import { splitBatches } from "../../server/services/batches.mjs";
import {
  tokenize,
  upper,
  identifier,
  stringValue,
  sqlText,
  splitStatements,
  compileTokens,
  unsupported,
} from "./compiler.mjs";

const quote = (value) => '"' + String(value).replaceAll('"', '""') + '"';
const ids = ["company", "store", "campus"];
const validId = (id) => {
  if (!ids.includes(id)) throw new Error("등록된 실습 데이터가 아닙니다.");
  return id;
};
const scalar = (db, sql) => db.exec(sql)[0]?.values?.[0]?.[0];
function dateValue(value) {
  if (value === null) return null;
  const text = String(value).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
  const date = new Date(
    text.includes("T")
      ? text
      : text.replace(" ", "T") + (text.includes(":") ? "Z" : "T00:00:00Z"),
  );
  if (!Number.isFinite(date.getTime()))
    throw new Error("날짜 값을 확인해 주세요.");
  return date;
}
const dateText = (date) =>
  date.toISOString().replace("T", " ").replace("Z", "");
function registerFunctions(db, state, id) {
  db.create_function("LEN", (value) =>
    value === null ? null : Array.from(String(value).replace(/ +$/, "")).length,
  );
  const sliceText = (value, count, right) => {
    if (value === null || count === null) return null;
    const length = Math.trunc(Number(count));
    if (!Number.isFinite(length) || length < 0)
      throw new Error("문자열 길이는 0 이상의 정수여야 합니다.");
    if (!length) return "";
    return Array.from(String(value))
      .slice(right ? -length : 0, right ? undefined : length)
      .join("");
  };
  db.create_function("QG_LEFT", (value, count) =>
    sliceText(value, count, false),
  );
  db.create_function("QG_RIGHT", (value, count) =>
    sliceText(value, count, true),
  );
  db.create_function("GETDATE", () => {
    const date = new Date();
    return dateText(
      new Date(date.getTime() - date.getTimezoneOffset() * 60000),
    );
  });
  db.create_function("DB_NAME", () => `Browser_${id}`);
  db.create_function("QG_TRANCOUNT", () => (state.transaction ? 1 : 0));
  db.create_function("QG_DATEADD", (unit, count, value) => {
    const date = dateValue(value);
    if (!date) return null;
    const n = Number(count);
    switch (String(unit).toLowerCase()) {
      case "day":
      case "dd":
      case "d":
        date.setUTCDate(date.getUTCDate() + n);
        break;
      case "month":
      case "mm":
      case "m": {
        const day = date.getUTCDate();
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + n);
        const end = new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
        ).getUTCDate();
        date.setUTCDate(Math.min(day, end));
        break;
      }
      case "year":
      case "yy":
      case "yyyy": {
        const month = date.getUTCMonth();
        date.setUTCFullYear(date.getUTCFullYear() + n);
        if (date.getUTCMonth() !== month) date.setUTCDate(0);
        break;
      }
      case "hour":
      case "hh":
        date.setUTCHours(date.getUTCHours() + n);
        break;
      case "minute":
      case "mi":
        date.setUTCMinutes(date.getUTCMinutes() + n);
        break;
      case "second":
      case "ss":
        date.setUTCSeconds(date.getUTCSeconds() + n);
        break;
      default:
        throw new Error(
          "지원하는 DATEADD 단위: day, month, year, hour, minute, second",
        );
    }
    return dateText(date);
  });
  db.create_function("QG_DATEDIFF", (unit, start, end) => {
    const a = dateValue(start),
      b = dateValue(end);
    if (!a || !b) return null;
    switch (String(unit).toLowerCase()) {
      case "year":
      case "yy":
        return b.getUTCFullYear() - a.getUTCFullYear();
      case "month":
      case "mm":
        return (
          (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
          b.getUTCMonth() -
          a.getUTCMonth()
        );
      case "day":
      case "dd":
        return (
          Math.floor(b.getTime() / 86400000) -
          Math.floor(a.getTime() / 86400000)
        );
      case "hour":
      case "hh":
        return (
          Math.floor(b.getTime() / 3600000) - Math.floor(a.getTime() / 3600000)
        );
      case "minute":
      case "mi":
        return (
          Math.floor(b.getTime() / 60000) - Math.floor(a.getTime() / 60000)
        );
      case "second":
      case "ss":
        return Math.floor(b.getTime() / 1000) - Math.floor(a.getTime() / 1000);
      default:
        throw new Error(
          "지원하는 DATEDIFF 단위: day, month, year, hour, minute, second",
        );
    }
  });
  db.create_function("QG_CONVERT", (type, value, style) => {
    if (value === null) return null;
    if (style !== null && !(Number(style) === 112 && /^date\b/i.test(type)))
      throw new Error(
        "CONVERT의 스타일 지정은 DATE 자료형의 112 형식만 지원합니다.",
      );
    if (/^date\b/i.test(type)) return dateText(dateValue(value)).slice(0, 10);
    if (/^(?:n?var)?char/i.test(type)) return String(value);
    if (/^(int|bigint|smallint|tinyint)/i.test(type))
      return Math.trunc(Number(value));
    if (/^(decimal|numeric|float|real)/i.test(type)) return Number(value);
    throw new Error("이 CONVERT 자료형은 브라우저에서 지원하지 않습니다.");
  });
}
export function createBrowserEngine({ SQL, seeds, load, save }) {
  const exists = (db, name) =>
    !!scalar(
      db,
      `SELECT COUNT(*) FROM sqlite_schema WHERE name=${"'" + String(name).replaceAll("'", "''") + "'"} COLLATE NOCASE`,
    );
  async function open(id, reset = false) {
    validId(id);
    const saved = await load(id);
    const db = new SQL.Database(
      !reset && saved?.bytes ? new Uint8Array(saved.bytes) : undefined,
    );
    const state = { transaction: false };
    registerFunctions(db, state, id);
    db.run("PRAGMA foreign_keys=ON");
    if (reset || !saved?.bytes) {
      const tokens = tokenize(seeds[id]);
      for (const statement of splitStatements(tokens)) {
        const compiled = compileTokens(statement);
        if (compiled)
          db.run(typeof compiled === "string" ? compiled : compiled.sql);
      }
      await save(id, db.export(), saved?.revision || 0);
      registerFunctions(db, state, id);
      db.run("PRAGMA foreign_keys=ON");
    }
    return {
      db,
      state,
      revision:
        reset || !saved?.bytes ? (saved?.revision || 0) + 1 : saved.revision,
    };
  }
  async function schema(id) {
    const { db } = await open(id);
    try {
      const tables =
        db.exec(
          "SELECT name,type,sql FROM sqlite_schema WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )[0]?.values || [];
      return tables.map(([name, type, definition]) => {
        const fks =
          db.exec(`PRAGMA foreign_key_list(${quote(name)})`)[0]?.values || [];
        const columns =
          db.exec(`PRAGMA table_info(${quote(name)})`)[0]?.values || [];
        return {
          schema: "dbo",
          name,
          type: type === "view" ? "VIEW" : "USER_TABLE",
          rowCount:
            type === "view"
              ? null
              : Number(scalar(db, `SELECT COUNT(*) FROM ${quote(name)}`)),
          columns: columns.map(
            ([cid, column, dataType, notNull, defaultValue, pk]) => ({
              name: column,
              type: String(dataType).toLowerCase(),
              baseType: String(dataType).split("(")[0].toLowerCase(),
              nullable: !notNull && !pk,
              primary: !!pk,
              identity: false,
              defaultValue,
              checks: null,
              references: fks
                .filter((f) => f[3] === column)
                .map((f) => ({
                  name: `FK_${name}_${f[0]}`,
                  schema: "dbo",
                  table: f[2],
                  column: f[4],
                  onUpdate: f[5],
                  onDelete: f[6],
                })),
            }),
          ),
        };
      });
    } finally {
      db.close();
    }
  }
  function prepareConditional(db, tokens) {
    if (upper(tokens[0]) !== "IF") return tokens;
    const fn = upper(tokens[1]);
    if (fn === "COL_LENGTH" && tokens[2]?.value === "(") {
      const table = stringValue(tokens[3])?.replace(/^dbo\./i, ""),
        column = stringValue(tokens[5]);
      const end = tokens.findIndex((t, i) => i > 5 && t.value === ")");
      if (
        !table ||
        !column ||
        upper(tokens[end + 1]) !== "IS" ||
        upper(tokens[end + 2]) !== "NULL"
      )
        throw unsupported("이 IF 조건은 지원하지 않습니다.");
      const hasColumn = (
        db.exec(`PRAGMA table_info(${quote(table)})`)[0]?.values || []
      ).some((row) => row[1].toLowerCase() === column.toLowerCase());
      if (hasColumn) return [];
      const command = tokens.slice(end + 3),
        literal = command.find((token) => token.type === "string");
      if (!["EXEC", "EXECUTE"].includes(upper(command[0])) || !literal)
        throw unsupported("이 준비 SQL은 지원하지 않습니다.");
      return tokenize(stringValue(literal));
    }
    if (fn === "OBJECT_ID" && tokens[2]?.value === "(") {
      const table = stringValue(tokens[3])?.replace(/^dbo\./i, "");
      const end = tokens.findIndex((t, i) => i > 3 && t.value === ")");
      if (
        !table ||
        upper(tokens[end + 1]) !== "IS" ||
        upper(tokens[end + 2]) !== "NULL"
      )
        throw unsupported("이 OBJECT_ID 조건은 지원하지 않습니다.");
      return exists(db, table) ? [] : tokens.slice(end + 3);
    }
    throw unsupported("이 IF 조건은 지원하지 않습니다.");
  }
  async function query(id, source) {
    if (typeof source !== "string" || !source.trim())
      throw new Error("실행할 SQL을 입력해 주세요.");
    if (source.length > 50000)
      throw new Error("SQL은 50,000자 이하로 입력해 주세요.");
    const batches = splitBatches(source);
    if (!batches.length) throw new Error("실행할 SQL이 없습니다.");
    const started = performance.now();
    const { db, state, revision } = await open(id);
    const result = {
      recordsets: [],
      rowsAffected: [],
      messages: [
        "SQLite(WebAssembly) 브라우저 실습입니다. 일부 T-SQL만 변환하며, SQL Server의 자료형·권한·동시성 동작과 다를 수 있습니다.",
      ],
      maxRows: 1000,
      maxBytes: 8 * 1024 * 1024,
      error: null,
      elapsedMs: 0,
    };
    let batch = 1,
      usedBytes = 0;
    try {
      for (const sourceBatch of batches) {
        for (let tokens of splitStatements(tokenize(sourceBatch))) {
          tokens = prepareConditional(db, tokens);
          if (!tokens.length) continue;
          if (upper(tokens[0]) === "PRINT") {
            const sql = compileTokens([
              { type: "word", value: "SELECT" },
              ...tokens.slice(1),
            ]);
            result.messages.push(String(scalar(db, sql)));
            continue;
          }
          const compiled = compileTokens(tokens);
          if (!compiled) continue;
          const text = typeof compiled === "string" ? compiled : compiled.sql;
          for (const statement of db.iterateStatements(text)) {
            const names = statement.getColumnNames();
            if (names.length > 256)
              throw new Error("결과 열은 최대 256개까지 지원합니다.");
            const keep = names
              .map((name, index) => ({ name, index }))
              .filter((c) => c.name !== "__qg_tie_rank");
            const recordset = {
              columns: keep.map((c) => ({ name: c.name, type: "" })),
              rows: [],
              totalRows: 0,
              truncated: false,
              batch,
            };
            while (statement.step()) {
              const row = statement.get(),
                values = keep.map((c) => row[c.index]);
              recordset.totalRows++;
              const normalized = values.map((v) =>
                v instanceof Uint8Array
                  ? "0x" +
                    Array.from(v, (b) => b.toString(16).padStart(2, "0")).join(
                      "",
                    )
                  : v,
              );
              const size = new TextEncoder().encode(
                JSON.stringify(normalized),
              ).length;
              if (recordset.rows.length >= 1000) {
                recordset.truncated = true;
                recordset.limitReason = "rows";
              } else if (usedBytes + size > result.maxBytes) {
                recordset.truncated = true;
                recordset.limitReason = "bytes";
              } else {
                recordset.rows.push(normalized);
                usedBytes += size;
              }
            }
            if (names.length && result.recordsets.length < 20) {
              if (typeof compiled === "object" && compiled.forJson) {
                const json = JSON.stringify(
                  recordset.rows.map((row) =>
                    Object.fromEntries(
                      recordset.columns.map((column, i) => [
                        column.name,
                        row[i],
                      ]),
                    ),
                  ),
                );
                result.recordsets.push({
                  ...recordset,
                  columns: [{ name: "JSON", type: "text" }],
                  rows: [[json]],
                  totalRows: 1,
                });
              } else result.recordsets.push(recordset);
            } else if (names.length)
              result.messages.push("결과표는 최대 20개까지 표시합니다.");
          }
          const first = upper(tokens[0]);
          if (["INSERT", "UPDATE", "DELETE", "REPLACE"].includes(first))
            result.rowsAffected.push(db.getRowsModified());
          if (first === "BEGIN") state.transaction = true;
          if (["COMMIT", "ROLLBACK", "END"].includes(first))
            state.transaction = false;
        }
        batch++;
      }
    } catch (error) {
      result.error = {
        message:
          error.code === "EBROWSER_UNSUPPORTED"
            ? error.message
            : `${error.message} 브라우저는 SQLite 엔진입니다. SQL Server 전용 문법은 지원 안내를 확인해 주세요.`,
        code: error.code || "SQLITE_ERROR",
        batch,
      };
    } finally {
      try {
        db.run("ROLLBACK");
        result.messages.push(
          "끝내지 않은 트랜잭션을 자동으로 ROLLBACK했습니다.",
        );
      } catch {}
      try {
        await save(id, db.export(), revision);
      } finally {
        db.close();
      }
      result.elapsedMs = Math.round(performance.now() - started);
    }
    return result;
  }
  return {
    query,
    schema,
    reset: async (id) => {
      const { db } = await open(id, true);
      db.close();
      return { database: id, skipped: false };
    },
    setup: async () => {
      for (const id of ids) {
        const { db } = await open(id);
        db.close();
      }
      return { ok: true };
    },
    health: async (id) => {
      const { db } = await open(id || "campus");
      try {
        return {
          ok: true,
          id: id || "campus",
          engine: "SQLite (WebAssembly)",
          version: String(scalar(db, "SELECT sqlite_version()")),
          principal: "이 브라우저",
          browser: true,
          busy: false,
          publicWorkspace: false,
        };
      } finally {
        db.close();
      }
    },
  };
}

// A deliberately small, explicit T-SQL compatibility layer. SQLite executes the SQL.
// Strings, comments and delimited identifiers are tokenized before any rewriting.
export function tokenize(source) {
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const start = i,
      c = source[i],
      next = source[i + 1];
    if (/\s/.test(c)) {
      while (/\s/.test(source[++i] || "")) {}
      continue;
    }
    if (c === "-" && next === "-") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      let depth = 1;
      while (i < source.length && depth) {
        if (source.slice(i, i + 2) === "/*") {
          depth++;
          i += 2;
        } else if (source.slice(i, i + 2) === "*/") {
          depth--;
          i += 2;
        } else i++;
      }
      if (depth) throw new Error("닫히지 않은 SQL 주석입니다.");
      continue;
    }
    if ((c === "N" || c === "n") && next === "'") {
      i++;
    }
    if (source[i] === "'") {
      const stringStart = i++;
      let closed = false;
      while (i < source.length) {
        if (source[i++] === "'") {
          if (source[i] === "'") i++;
          else {
            closed = true;
            break;
          }
        }
      }
      if (!closed) throw new Error("닫히지 않은 SQL 문자열입니다.");
      tokens.push({ type: "string", value: source.slice(stringStart, i) });
      continue;
    }
    if (c === "[" || c === '"' || c === "`") {
      const end = c === "[" ? "]" : c;
      i++;
      let value = "",
        closed = false;
      while (i < source.length) {
        if (source[i] === end) {
          if (source[i + 1] === end) {
            value += end;
            i += 2;
          } else {
            i++;
            closed = true;
            break;
          }
        } else value += source[i++];
      }
      if (!closed) throw new Error("닫히지 않은 SQL 식별자입니다.");
      tokens.push({
        type: "quoted",
        value: '"' + value.replaceAll('"', '""') + '"',
      });
      continue;
    }
    if (/[\p{L}_@#$]/u.test(c)) {
      i++;
      while (i < source.length && /[\p{L}\p{N}_@#$]/u.test(source[i])) i++;
      tokens.push({ type: "word", value: source.slice(start, i) });
      continue;
    }
    if (/\d/.test(c)) {
      i++;
      while (i < source.length && /[\d.eE]/.test(source[i])) i++;
      tokens.push({ type: "number", value: source.slice(start, i) });
      continue;
    }
    i++;
    const pair = c + (source[i] || "");
    if (["<=", ">=", "<>", "!=", "||"].includes(pair)) {
      i++;
      tokens.push({ type: "symbol", value: pair });
    } else tokens.push({ type: "symbol", value: c });
  }
  return tokens;
}
export const upper = (token) =>
  token?.type === "word" ? token.value.toUpperCase() : "";
export const identifier = (token) =>
  token?.type === "quoted"
    ? token.value.slice(1, -1).replaceAll('""', '"')
    : token?.value;
export const sqlText = (tokens) => tokens.map((t) => t.value).join(" ");
const word = (value) => ({ type: "word", value });
const symbol = (value) => ({ type: "symbol", value });
const literal = (value) => ({
  type: "string",
  value: "'" + String(value).replaceAll("'", "''") + "'",
});
export const stringValue = (token) =>
  token?.type === "string"
    ? token.value.slice(1, -1).replaceAll("''", "'")
    : undefined;
function closing(tokens, start) {
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    if (tokens[i].value === "(") depth++;
    if (tokens[i].value === ")" && --depth === 0) return i;
  }
  throw new Error("SQL 괄호가 닫히지 않았습니다.");
}
function argumentsOf(tokens, start, end) {
  const args = [];
  let depth = 0,
    from = start + 1;
  for (let i = from; i < end; i++) {
    if (tokens[i].value === "(") depth++;
    if (tokens[i].value === ")") depth--;
    if (tokens[i].value === "," && depth === 0) {
      args.push(tokens.slice(from, i));
      from = i + 1;
    }
  }
  args.push(tokens.slice(from, end));
  return args;
}
const joinArgs = (args) =>
  args.flatMap((arg, i) => (i ? [symbol(","), ...arg] : arg));
export function unsupported(message) {
  return Object.assign(
    new Error(
      `${message} 브라우저 모드는 SQLite 엔진입니다. 이 SQL Server 전용 기능은 기존 로컬 MSSQL 모드에서 실습해 주세요.`,
    ),
    { code: "EBROWSER_UNSUPPORTED" },
  );
}
export function compileTokens(original) {
  const dbo = (token) =>
    ["word", "quoted"].includes(token?.type) &&
    identifier(token).toUpperCase() === "DBO";
  let t = original.filter(
    (token, i) =>
      !(dbo(token) && original[i + 1]?.value === ".") &&
      !(token.value === "." && dbo(original[i - 1])),
  );
  while (t.at(-1)?.value === ";") t.pop();
  if (!t.length) return "";
  const first = upper(t[0]);
  if (first === "BEGIN" && ["TRY", "CATCH"].includes(upper(t[1])))
    throw unsupported("TRY/CATCH는 지원하지 않습니다.");
  if (
    t.some(
      (token, i) =>
        ["DATALENGTH", "USER_NAME", "HAS_PERMS_BY_NAME"].includes(
          upper(token),
        ) ||
        (upper(token) === "SYS" && t[i + 1]?.value === ".") ||
        (upper(token) === "INCLUDE" && t[i + 1]?.value === "("),
    )
  )
    throw unsupported(
      "SQL Server의 저장 바이트·사용자·권한·시스템 카탈로그·INCLUDE 인덱스는 지원하지 않습니다.",
    );
  if (
    [
      "EXEC",
      "EXECUTE",
      "MERGE",
      "GRANT",
      "DENY",
      "REVOKE",
      "DECLARE",
      "WAITFOR",
      "USE",
      "BACKUP",
      "RESTORE",
    ].includes(first)
  )
    throw unsupported(`${first} 명령은 지원하지 않습니다.`);
  if (
    t.some(
      (token, i) =>
        [
          "PROCEDURE",
          "PROC",
          "FUNCTION",
          "PIVOT",
          "UNPIVOT",
          "OPENJSON",
        ].includes(upper(token)) ||
        (upper(token) === "ALTER" && upper(t[i + 1]) === "COLUMN"),
    )
  )
    throw unsupported(
      "프로시저·함수·PIVOT·ALTER COLUMN 등 일부 T-SQL 문법은 지원하지 않습니다.",
    );
  if (
    t.some(
      (token, i) => upper(token) === "ADD" && upper(t[i + 1]) === "CONSTRAINT",
    )
  )
    throw unsupported(
      "기존 테이블에 제약조건을 추가하는 문법은 지원하지 않습니다. CREATE TABLE에서 PK/FK를 선언할 수 있습니다.",
    );
  if (first === "IF") throw unsupported("이 IF 제어문은 지원하지 않습니다.");
  if (first === "SET") {
    if (["NOCOUNT", "XACT_ABORT"].includes(upper(t[1]))) return "";
    throw unsupported("서버의 SET 설정은 지원하지 않습니다.");
  }
  if (first === "BEGIN" && ["TRAN", "TRANSACTION"].includes(upper(t[1])))
    t = [word("BEGIN"), word("TRANSACTION"), ...t.slice(2)];
  if (
    ["COMMIT", "ROLLBACK"].includes(first) &&
    ["TRAN", "TRANSACTION"].includes(upper(t[1]))
  )
    t.splice(1, 1);
  if (first === "DELETE" && upper(t[1]) !== "FROM")
    t.splice(1, 0, word("FROM"));
  if (first === "INSERT" && upper(t[1]) !== "INTO" && upper(t[1]) !== "OR")
    t.splice(1, 0, word("INTO"));
  if (first === "WITH") {
    let depth = 0;
    for (let i = 1; i < t.length; i++) {
      if (t[i].value === "(") depth++;
      if (t[i].value === ")") depth--;
      if (!depth && upper(t[i]) === "INSERT") {
        if (upper(t[i + 1]) !== "INTO") t.splice(i + 1, 0, word("INTO"));
        break;
      }
    }
  }
  // UPDATE a SET ... FROM exam a -> UPDATE exam AS a SET ...
  if (first === "UPDATE") {
    let depth = 0,
      from = -1;
    for (let i = 2; i < t.length; i++) {
      if (t[i].value === "(") depth++;
      if (t[i].value === ")") depth--;
      if (!depth && upper(t[i]) === "FROM") {
        from = i;
        break;
      }
    }
    if (from >= 0 && identifier(t[from + 2]) === identifier(t[1])) {
      const after = t.slice(from + 3);
      t = [t[0], t[from + 1], word("AS"), t[1], ...t.slice(2, from), ...after];
    }
  }
  if (
    first === "CREATE" &&
    upper(t[1]) === "OR" &&
    upper(t[2]) === "ALTER" &&
    upper(t[3]) === "VIEW"
  ) {
    const name = t[4];
    return `DROP VIEW IF EXISTS ${name.value}; ${compileTokens([t[0], ...t.slice(3)])}`;
  }
  // SQL Server SELECT INTO creates a new table.
  if (first === "SELECT") {
    let depth = 0,
      into = -1;
    for (let i = 1; i < t.length; i++) {
      if (t[i].value === "(") depth++;
      if (t[i].value === ")") depth--;
      if (!depth && upper(t[i]) === "INTO") {
        into = i;
        break;
      }
    }
    if (into > 0)
      return `CREATE TABLE ${t[into + 1].value} AS ${compileTokens([...t.slice(0, into), ...t.slice(into + 2)])}`;
  }
  // Date functions need a quoted unit; CONVERT needs a quoted target type.
  for (let i = t.length - 1; i >= 0; i--) {
    const name = upper(t[i]);
    if (t[i + 1]?.value !== "(") continue;
    if (["DATEADD", "DATEDIFF", "CONVERT"].includes(name)) {
      const end = closing(t, i + 1),
        args = argumentsOf(t, i + 1, end);
      args[0] = [
        literal(name === "CONVERT" ? sqlText(args[0]) : identifier(args[0][0])),
      ];
      if (name === "CONVERT" && args.length === 2) args.push([word("NULL")]);
      t.splice(
        i,
        end - i + 1,
        word("QG_" + name),
        symbol("("),
        ...joinArgs(args),
        symbol(")"),
      );
    } else if (["LEFT", "RIGHT"].includes(name)) t[i] = word("QG_" + name);
    else if (name === "ISNULL") t[i] = word("IFNULL");
    else if (name === "SUBSTRING") t[i] = word("SUBSTR");
  }
  t = t.map((token) =>
    upper(token) === "@@TRANCOUNT" ? word("QG_TRANCOUNT()") : token,
  );
  // T-SQL string concatenation in literals and CAST(... AS [N]VARCHAR).
  for (let i = 0; i < t.length; i++)
    if (
      t[i].value === "+" &&
      (t[i - 1]?.type === "string" || t[i + 1]?.type === "string")
    )
      t[i] = symbol("||");
  // SQL Server TOP is converted only at the outer SELECT level.
  let top = null,
    ties = false;
  if (first === "SELECT") {
    const at = upper(t[1]) === "DISTINCT" ? 2 : 1;
    if (upper(t[at]) === "TOP") {
      let end = at + 2;
      let count = t[at + 1];
      if (count.value === "(") {
        count = t[at + 2];
        end = at + 4;
      }
      if (count.type !== "number" || !/^\d+$/.test(count.value))
        throw unsupported("TOP에는 정수 행 수를 입력해 주세요.");
      top = Number(count.value);
      if (upper(t[end]) === "WITH" && upper(t[end + 1]) === "TIES") {
        ties = true;
        end += 2;
      }
      t.splice(at, end - at);
    }
  }
  const offset = t.findIndex((token) => upper(token) === "OFFSET");
  if (
    offset >= 0 &&
    upper(t[offset + 2]) === "ROWS" &&
    upper(t[offset + 3]) === "FETCH"
  ) {
    const start = t[offset + 1],
      count = t[offset + 5];
    t = [...t.slice(0, offset), word("LIMIT"), count, word("OFFSET"), start];
  }
  const option = t.findIndex((token) => upper(token) === "OPTION");
  if (option >= 0) t = t.slice(0, option);
  let forJson = false;
  if (
    upper(t.at(-3)) === "FOR" &&
    upper(t.at(-2)) === "JSON" &&
    upper(t.at(-1)) === "PATH"
  ) {
    forJson = true;
    t = t.slice(0, -3);
  }
  if (top !== null && ties) {
    const from = t.findIndex((token) => upper(token) === "FROM");
    let depth = 0,
      order = -1;
    for (let i = 0; i < t.length - 1; i++) {
      if (t[i].value === "(") depth++;
      if (t[i].value === ")") depth--;
      if (depth === 0 && upper(t[i]) === "ORDER" && upper(t[i + 1]) === "BY")
        order = i;
    }
    if (from < 0 || order < 0)
      throw unsupported("WITH TIES에는 FROM과 ORDER BY가 필요합니다.");
    const sort = sqlText(t.slice(order + 2));
    return `SELECT * FROM (${sqlText(t.slice(0, from))}, RANK() OVER (ORDER BY ${sort}) AS __qg_tie_rank ${sqlText(t.slice(from, order))}) WHERE __qg_tie_rank <= ${top} ORDER BY ${sort}`;
  }
  let text = sqlText(t);
  if (top !== null) text += ` LIMIT ${top}`;
  return forJson ? { sql: text, forJson: true } : text;
}
export function splitStatements(tokens) {
  const statements = [];
  let from = 0;
  for (let i = 0; i < tokens.length; i++)
    if (tokens[i].value === ";") {
      if (i > from) statements.push(tokens.slice(from, i));
      from = i + 1;
    }
  if (from < tokens.length) statements.push(tokens.slice(from));
  return statements;
}

export function buildCsv(recordset) {
  const quote = (value) => {
    if (value === null || value === undefined) return "\\N";
    let text =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    if (typeof value === "string") {
      if (/^\\+N$/.test(text)) text = "\\" + text;
      if (/^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text;
    }
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      recordset.columns.map((c) => quote(c.name || "(열 이름 없음)")).join(","),
      ...recordset.rows.map((row) => row.map(quote).join(",")),
    ].join("\r\n")
  );
}

export function downloadText(
  text,
  filename,
  type = "text/plain;charset=utf-8;",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(recordset) {
  downloadText(
    buildCsv(recordset),
    `query-result-${Date.now()}.csv`,
    "text/csv;charset=utf-8;",
  );
}

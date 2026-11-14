export function downloadCsv(recordset) {
 const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
 const csv='\uFEFF'+[recordset.columns.map(c=>quote(c.name||'(열 이름 없음)')).join(','),...recordset.rows.map(row=>row.map(v=>quote(typeof v==='string'&&/^[=+\-@\t\r]/.test(v)?'\''+v:v)).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download=`query-result-${Date.now()}.csv`;a.click();URL.revokeObjectURL(url);
}

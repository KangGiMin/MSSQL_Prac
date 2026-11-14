import assert from 'node:assert/strict';
import { executeQuery } from '../server/services/query-service.mjs';
import { seedDatabase } from '../server/db/seed.mjs';
import { getSchema } from '../server/services/schema-service.mjs';
const database='QueryGround_Company';
try {
 await seedDatabase('company',{reset:true});
 let r=await executeQuery(database,"SELECT TOP(1) EMPNO,ENAME FROM dbo.EMP FOR JSON PATH; SELECT EMPNO FROM dbo.EMP FOR XML PATH('emp');");
 assert.equal(r.error,null);assert.equal(JSON.parse(r.recordsets[0].rows[0][0])[0].EMPNO,1001);assert.match(r.recordsets[1].rows[0][0],/<emp>/);
 console.log('PASS complete JSON/XML result values');
 r=await executeQuery(database,"CREATE TYPE dbo.QgCode FROM INT;\nGO\nCREATE SEQUENCE dbo.QgSequence AS INT START WITH 1;\nCREATE SYNONYM dbo.QgSynonym FOR dbo.EMP;\nGO\nCREATE VIEW dbo.QgView WITH SCHEMABINDING AS SELECT EMPNO,ENAME FROM dbo.EMP;\nGO\nCREATE VIEW dbo.QgNested WITH SCHEMABINDING AS SELECT EMPNO,ENAME FROM dbo.QgView;\nGO\nSELECT NEXT VALUE FOR dbo.QgSequence;");
 assert.equal(r.error,null,r.error?.message);
 await seedDatabase('company',{reset:true});
 assert.equal((await getSchema(database)).length,4);
 r=await executeQuery(database,"SELECT COUNT(*) AS n FROM sys.types WHERE is_user_defined=1; SELECT COUNT(*) FROM sys.sequences; SELECT COUNT(*) FROM sys.synonyms;");
 assert.equal(r.error,null);for(const rs of r.recordsets)assert.equal(rs.rows[0][0],0);
 console.log('PASS reset removes nested schema-bound views, types, sequences, and synonyms');
}finally{await seedDatabase('company',{reset:true});}

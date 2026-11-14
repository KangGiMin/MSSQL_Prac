// This test intentionally resets only this application's three marked practice DBs.
import assert from 'node:assert/strict';
import { executeQuery } from '../server/services/query-service.mjs';
import { seedDatabase } from '../server/db/seed.mjs';
import { databases } from '../server/config/databases.mjs';
import { getSchema } from '../server/services/schema-service.mjs';
import { lessons } from '../shared/curriculum.mjs';
const failures=[];
let checks=0;
async function check(name,fn){try{await fn();checks++;console.log(`PASS ${name}`);}catch(e){failures.push({name,error:e.message});console.error(`FAIL ${name}: ${e.message}`);}}
const db=id=>databases.find(d=>d.id===id).name;
try {
 for(const item of databases) await seedDatabase(item.id,{reset:true});
 await check('3 databases expose real schema',async()=>{for(const item of databases)assert.ok((await getSchema(item.name)).length>=4);});
 await check('SELECT, UPDATE, INSERT, DELETE persist across independent requests',async()=>{
   let r=await executeQuery(db('company'),"INSERT dbo.BONUS(ENAME,JOB,SAL,COMM) VALUES(N'통합테스트',N'QA',100,1); UPDATE dbo.BONUS SET SAL=200 WHERE ENAME=N'통합테스트'; SELECT SAL FROM dbo.BONUS WHERE ENAME=N'통합테스트';");
   assert.equal(r.error,null);assert.equal(r.recordsets.at(-1).rows[0][0],200);
   r=await executeQuery(db('company'),"DELETE FROM dbo.BONUS WHERE ENAME=N'통합테스트'; SELECT COUNT(*) FROM dbo.BONUS WHERE ENAME=N'통합테스트';");assert.equal(r.recordsets[0].rows[0][0],0);
 });
 await check('duplicate and unnamed columns retain their order and values',async()=>{
   const r=await executeQuery(db('company'),'SELECT 1 AS x, 2 AS x, 3;');assert.equal(r.error,null);assert.deepEqual(r.recordsets[0].rows[0],[1,2,3]);assert.equal(r.recordsets[0].columns.length,3);
 });
 await check('GO batches share temp tables and emit messages',async()=>{
   const r=await executeQuery(db('company'),"CREATE TABLE #q (n INT);\nGO\nINSERT #q VALUES(1); SELECT * FROM #q; PRINT N'완료';");assert.equal(r.error,null);assert.equal(r.recordsets[0].rows[0][0],1);assert.ok(r.messages.includes('완료'));
 });
 await check('unfinished transactions roll back automatically',async()=>{
   let r=await executeQuery(db('company'),"BEGIN TRAN; DELETE dbo.EMP; SELECT COUNT(*) AS n FROM dbo.EMP;");assert.equal(r.error,null);assert.equal(r.recordsets[0].rows[0][0],0);
   r=await executeQuery(db('company'),'SELECT COUNT(*) FROM dbo.EMP;');assert.equal(r.recordsets[0].rows[0][0],14);
 });
 await check('syntax errors return useful SQL Server diagnostics',async()=>{const r=await executeQuery(db('company'),'SELEC invalid');assert.ok(r.error?.message);});
 await check('unrestricted context reversion cannot escape to master',async()=>{
   for(const query of ["USE master; CREATE TABLE dbo.QueryGroundEscapeTest(id INT);","REVERT; USE master; CREATE TABLE dbo.QueryGroundEscapeTest(id INT);","EXECUTE AS LOGIN='sa'; SELECT 1;","SELECT * FROM kgm.sys.tables;","EXEC sp_configure 'xp_cmdshell',1;"]){const r=await executeQuery(db('company'),query);assert.ok(r.error,query);}
   const r=await executeQuery(db('company'),"REVERT; SELECT USER_NAME();");assert.ok(r.error||r.recordsets.at(-1)?.rows[0][0]==='QueryGroundStudent');
   // SQL Server permits read-only public metadata in master via guest; it grants no admin access.
   const metadata=await executeQuery(db('company'),"USE master; SELECT USER_NAME(),IS_SRVROLEMEMBER('sysadmin');");assert.equal(metadata.error,null);assert.deepEqual(metadata.recordsets[0].rows[0],['guest',0]);
 });
 await check('large output is capped without changing the SQL computation',async()=>{
   const r=await executeQuery(db('campus'),'SELECT a.수험번호 FROM dbo.exam_emp a CROSS JOIN dbo.exam_emp b;');assert.equal(r.error,null);assert.equal(r.recordsets[0].rows.length,1000);assert.equal(r.recordsets[0].totalRows,19600);assert.ok(r.recordsets[0].truncated);
 });
 await check('running query can be canceled and its connection cleaned up',async()=>{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),300);
   const start=Date.now();
   const r=await executeQuery(db('company'),"BEGIN TRAN; WAITFOR DELAY '00:00:10'; SELECT 1;",controller.signal);
   clearTimeout(timer);assert.ok(r.error);assert.ok(Date.now()-start<5000);
   const next=await executeQuery(db('company'),'SELECT USER_NAME();');assert.equal(next.error,null);assert.equal(next.recordsets[0].rows[0][0],'QueryGroundStudent');
 });
 for(const lesson of lessons){
   await check(`lesson ${lesson.id}`,async()=>{
     await seedDatabase(lesson.database,{reset:true});
     const r=await executeQuery(db(lesson.database),(lesson.setup||'')+lesson.answer);
     assert.equal(r.error,null,r.error?.message);
   });
 }
} finally {
 for(const item of databases)try{await seedDatabase(item.id,{reset:true});}catch(e){failures.push({name:'final reset '+item.id,error:e.message});}
}
console.log(JSON.stringify({passed:checks,failed:failures.length,failures},null,2));
if(failures.length)process.exitCode=1;

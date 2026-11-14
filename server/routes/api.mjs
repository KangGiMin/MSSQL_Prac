import { Router } from 'express';
import { databases, getDatabase } from '../config/databases.mjs';
import { getSchema } from '../services/schema-service.mjs';
import { executeQuery } from '../services/query-service.mjs';
import { seedDatabase } from '../db/seed.mjs';
import { lessons, sourceCoverage } from '../../shared/curriculum.mjs';
import { connect } from '../db/connection.mjs';

export const api = Router();
api.get('/health', async (_req,res) => {
  let pool;
  try {
    pool = await connect(databases[0].name);
    const result=await pool.request().query('SELECT CAST(SERVERPROPERTY(\'ProductVersion\') AS VARCHAR(30)) AS version, USER_NAME() AS principal');
    res.json({ok:true, engine:'Microsoft SQL Server',...result.recordset[0]});
  } catch (error) { res.status(503).json({ok:false,error:'SQL Server 연결을 확인해 주세요. .env 설정 후 npm run db:setup을 실행하세요.',detail:error.message}); }
  finally { if(pool) await pool.close(); }
});
api.get('/databases', (_req,res)=>res.json(databases));
api.get('/curriculum', (_req,res)=>res.json({lessons,sourceCoverage}));
api.get('/databases/:id/schema',async(req,res)=>res.json(await getSchema(getDatabase(req.params.id).name)));
api.post('/query',async(req,res)=>{
  const controller = new AbortController();
  res.on('close',()=>{if(!res.writableEnded) controller.abort();});
  const result=await executeQuery(getDatabase(req.body.database).name,req.body.sql,controller.signal);
  res.json(result);
});
api.post('/databases/:id/reset',async(req,res)=>{
  if(req.body.confirm!==req.params.id) return res.status(400).json({error:'초기화할 데이터베이스 확인 값이 필요합니다.'});
  res.json(await seedDatabase(req.params.id,{reset:true}));
});

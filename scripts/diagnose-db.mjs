import { connect } from '../server/db/connection.mjs';
const pool=await connect('QueryGround_Company');
try{
 for (const query of ["SELECT USER_NAME() AS principal,IS_SRVROLEMEMBER('sysadmin') AS isAdmin,DB_NAME() AS db;", "EXECUTE AS USER='QueryGroundStudent' WITH NO REVERT; SELECT USER_NAME() AS principal,IS_SRVROLEMEMBER('sysadmin') AS isAdmin;", "SELECT USER_NAME() AS principal,IS_SRVROLEMEMBER('sysadmin') AS isAdmin;", "USE master; SELECT USER_NAME() AS principal,DB_NAME() AS db;"]){
  try {console.log(JSON.stringify({query,result:(await pool.request().batch(query)).recordsets}));}catch(e){console.log({query,error:e.message});}
 }
}finally{await pool.close();}

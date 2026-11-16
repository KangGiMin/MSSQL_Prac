import { databaseMarkers } from "../config/sql.mjs";
import {
  dropObjects,
  readMarkersSql,
  markOwnedSql,
  studentSetupSql,
} from "./statements.mjs";
import fs from "node:fs/promises";
import { config } from "../config/env.mjs";
import { prepareAzureDatabase } from "./azure.mjs";
import { connect } from "./connection.mjs";
import { databases, getDatabase } from "../config/databases.mjs";
import { exclusive } from "../services/query-service.mjs";

export async function seedDatabase(id, { reset = false } = {}) {
  const db = getDatabase(id);
  return exclusive(db.name, async () => {
    if (config.platform === "azure") {
      const existing = await connect(db.name, { admin: true });
      try {
        if (await prepareAzureDatabase(existing, db.name, { reset }))
          return { skipped: true, database: db.name };
      } finally {
        await existing.close();
      }
    } else {
      const master = await connect("master", { admin: true });
      try {
        const found = await master
          .request()
          .query(`SELECT name FROM sys.databases WHERE name=N'${db.name}';`);
        if (found.recordset.length) {
          const existing = await connect(db.name, { admin: true });
          try {
            const marker = await existing.request().query(readMarkersSql);
            if (!marker.recordset.some((x) => x.name === databaseMarkers.owned))
              throw new Error(
                `${db.name}: 앱 소유 표시가 없는 동명 DB입니다. 자동 변경을 중단합니다.`,
              );
            if (
              !reset &&
              marker.recordset.some((x) => x.name === databaseMarkers.ready)
            )
              return { skipped: true, database: db.name };
          } finally {
            await existing.close();
          }
        } else {
          await master.request().batch(`CREATE DATABASE [${db.name}];`);
          const created = await connect(db.name, { admin: true });
          try {
            await created.request().batch(markOwnedSql);
          } finally {
            await created.close();
          }
        }
        await master
          .request()
          .batch(
            `ALTER DATABASE [${db.name}] SET TRUSTWORTHY OFF; ALTER DATABASE [${db.name}] SET DB_CHAINING OFF;`,
          );
      } finally {
        await master.close();
      }
    }
    const pool = await connect(db.name, { admin: true });
    try {
      // Only databases from the shared allow-list can reach this reset path.
      const seed = await fs.readFile(
        new URL(`../../database/seeds/${id}.sql`, import.meta.url),
        "utf8",
      );
      await pool
        .request()
        .batch(
          `SET XACT_ABORT ON; BEGIN TRAN; BEGIN TRY\n${dropObjects}\nEXEC sys.sp_executesql N'${seed.replaceAll("'", "''")}';\nCOMMIT; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;`,
        );
      await pool.request().batch(studentSetupSql);
      return { skipped: false, database: db.name };
    } finally {
      await pool.close();
    }
  });
}
export async function setupDatabases() {
  const results = [];
  for (const db of databases) results.push(await seedDatabase(db.id));
  return results;
}

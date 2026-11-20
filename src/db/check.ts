import 'dotenv/config';
import type { RowDataPacket } from 'mysql2/promise';
import {
  ensureMysqlSchema,
  getMysqlConfig,
  getMysqlPool,
  isMysqlConfigured,
  testMysqlConnection,
} from './mysql.ts';

async function main() {
  const cfg = getMysqlConfig();
  if (!isMysqlConfigured()) {
    console.error('MySQL credentials missing. Set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in .env.');
    process.exit(1);
  }

  console.log(`Connecting to MySQL host=${cfg.socketPath || `${cfg.host}:${cfg.port}`} database=${cfg.database} user=${cfg.user}...`);
  const info = await testMysqlConnection();
  await ensureMysqlSchema();
  const [tables] = await getMysqlPool().query<RowDataPacket[]>('SHOW TABLES');
  const tableNames = tables.map((row) => Object.values(row)[0]);

  console.log(`Connected to MySQL (${info.version}) database="${info.database}"`);
  console.log(`Tables verified (${tableNames.length}): ${tableNames.join(', ')}`);
  await getMysqlPool().end();
}

main().catch((err) => {
  console.error('MySQL connection check failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

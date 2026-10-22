import 'dotenv/config';
import { DataSource } from 'typeorm';
import { sslForDatabaseUrl } from './db-ssl';

/**
 * Standalone scripts (seed.ts) ke liye DataSource.
 * app.module.ts wali runtime config ka mirror hai —
 * DATABASE_URL hi single source of truth hai.
 */
const databaseUrl = process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: sslForDatabaseUrl(databaseUrl),
  synchronize: process.env.DATABASE_SYNC === 'true',
  logging: process.env.DATABASE_LOGGING === 'true',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [],
  // app.module.ts jaisi pool settings (Neon idle-connection drops ke liye)
  extra: {
    max: 10,
    keepAlive: true,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
  },
});

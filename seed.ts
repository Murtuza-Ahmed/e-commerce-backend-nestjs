/**
 * Seed runner: `npm run seed`
 * Pehle RBAC (permissions + roles), phir super admin.
 * DATABASE_SYNC=false par chalao — tables pehle se bani hon.
 */
import 'dotenv/config';
import { AppDataSource } from './src/config/data-source';
import { seedRbac } from './src/database/seeds/rbac.seed';
import { seedSuperAdmin } from './src/database/seeds/super-admin.seed';

async function run(): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD .env me set karen.',
    );
  }

  await AppDataSource.initialize();
  try {
    await seedRbac(AppDataSource);
    await seedSuperAdmin(AppDataSource, { email, password });
    console.info('Seed completed.');
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

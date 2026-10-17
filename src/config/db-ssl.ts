/**
 * Neon (aur aksar managed Postgres) ko SSL chahiye hota hai,
 * local Postgres ko nahi. DATABASE_URL me `?sslmode=require`
 * ho to SSL on, warna off — taake local dev kharab na ho.
 */
export function sslForDatabaseUrl(
  databaseUrl: string | undefined,
): { rejectUnauthorized: boolean } | undefined {
  if (databaseUrl && databaseUrl.includes('sslmode=require')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

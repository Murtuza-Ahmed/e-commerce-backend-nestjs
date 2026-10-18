/**
 * E2E setup — AppModule import hone SE PEHLE env set karna lazmi hai,
 * kyunke ConfigModule.forRoot() import par hi env validate karta hai.
 * Is file ko spec me sab se pehle import karo.
 */
const E2E_URL = process.env.E2E_DATABASE_URL;

if (E2E_URL) {
  process.env.DATABASE_URL = E2E_URL;
  process.env.DATABASE_SYNC = 'true';
  process.env.DATABASE_LOGGING = 'false';
  process.env.JWT_ACCESS_SECRET = 'e2e-access-secret-min-16-chars';
  process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret-min-16-chars';
  process.env.SUPER_ADMIN_EMAIL = 'super@e2e.test';
  process.env.SUPER_ADMIN_PASSWORD = 'SuperSecret123';
  process.env.OTP_SECRET = 'e2e-otp-secret';
} else {
  // Suite skip hogi, lekin import crash na ho — dummy values.
  process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
  process.env.JWT_ACCESS_SECRET = 'dummy-access-secret-min-16';
  process.env.JWT_REFRESH_SECRET = 'dummy-refresh-secret-min-16';
  process.env.SUPER_ADMIN_EMAIL = 'dummy@test.com';
  process.env.SUPER_ADMIN_PASSWORD = 'dummy1234';
}

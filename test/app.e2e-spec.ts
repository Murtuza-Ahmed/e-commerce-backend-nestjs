import './e2e-setup';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { OtpService } from '../src/otp/otp.service';
import { Role } from '../src/rbac/entities/role.entity';
import { seedRbac } from '../src/database/seeds/rbac.seed';
import { seedSuperAdmin } from '../src/database/seeds/super-admin.seed';

/**
 * Phase 1 e2e — asli PostgreSQL chahiye:
 *   E2E_DATABASE_URL=postgresql://... npm run test:e2e
 * Bina E2E_DATABASE_URL ke suite skip ho jata hai.
 */
const describeIfDb = process.env.E2E_DATABASE_URL ? describe : describe.skip;

describeIfDb('Phase 1 — Users/Auth/OTP/RBAC (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let otpService: OtpService;

  const SUPER_EMAIL = 'super@e2e.test';
  const SUPER_PASS = 'SuperSecret123';
  const CUSTOMER_EMAIL = 'customer@e2e.test';
  const CUSTOMER_PASS = 'Customer123';
  const CUSTOMER_PHONE = '+923001234567';

  let customerAccess = '';
  let customerRefresh = '';
  let superAccess = '';
  let adminId = '';
  let adminAccess = '';
  let adminRoleId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    otpService = moduleFixture.get(OtpService);
    await seedRbac(dataSource);
    await seedSuperAdmin(dataSource, {
      email: SUPER_EMAIL,
      password: SUPER_PASS,
    });
    adminRoleId = (
      await dataSource
        .getRepository(Role)
        .findOneOrFail({ where: { name: 'admin' } })
    ).id;
  }, 120_000);

  afterAll(async () => {
    await dataSource?.destroy();
    await app?.close();
  });

  const api = () => request(app.getHttpServer());

  it('health: GET /api/ public hai', async () => {
    await api()
      .get('/api/')
      .expect(200)
      .expect((res) => {
        if (res.body.status !== 'ok') throw new Error('health not ok');
      });
  });

  it('signup: naya customer + duplicate par 409', async () => {
    await api()
      .post('/api/auth/signup')
      .send({
        name: 'E2E Customer',
        email: CUSTOMER_EMAIL,
        phone: CUSTOMER_PHONE,
        password: CUSTOMER_PASS,
      })
      .expect(201)
      .expect((res) => {
        if (!res.body.email) throw new Error('email missing');
      });
    await api()
      .post('/api/auth/signup')
      .send({ name: 'Dup', email: CUSTOMER_EMAIL, password: CUSTOMER_PASS })
      .expect(409);
  });

  it('login: verify se pehle 403 EMAIL_NOT_VERIFIED', async () => {
    await api()
      .post('/api/auth/login')
      .send({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASS })
      .expect(403)
      .expect((res) => {
        if (res.body.code !== 'EMAIL_NOT_VERIFIED')
          throw new Error('expected EMAIL_NOT_VERIFIED');
      });
  });

  it('verify-email: ghalat OTP 400, sahi OTP par tokens', async () => {
    await api()
      .post('/api/auth/verify-email')
      .send({ email: CUSTOMER_EMAIL, otp: '000000' })
      .expect(400);

    const code = await otpService.issue(CUSTOMER_EMAIL, 'email_verification');
    await api()
      .post('/api/auth/verify-email')
      .send({ email: CUSTOMER_EMAIL, otp: code })
      .expect(200)
      .expect((res) => {
        if (!res.body.accessToken || !res.body.refreshToken)
          throw new Error('tokens missing');
        if (res.body.user.emailVerified !== true)
          throw new Error('not marked verified');
        customerAccess = res.body.accessToken;
        customerRefresh = res.body.refreshToken;
      });
  });

  it('me: apni profile', async () => {
    await api()
      .get('/api/users/me')
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(200)
      .expect((res) => {
        if (res.body.email !== CUSTOMER_EMAIL) throw new Error('wrong user');
        if (res.body.role.name !== 'customer') throw new Error('wrong role');
      });
  });

  it('RBAC: customer /users list nahi dekh sakta (403)', async () => {
    await api()
      .get('/api/users')
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(403);
  });

  it('refresh: rotation — naya pair, purana invalid', async () => {
    const oldRefresh = customerRefresh;
    await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200)
      .expect((res) => {
        customerAccess = res.body.accessToken;
        customerRefresh = res.body.refreshToken;
      });
    // purana refresh token ab kaam nahi karna chahiye
    await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);
  });

  it('logout ke baad refresh 401', async () => {
    await api()
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(200);
    await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: customerRefresh })
      .expect(401);
    // dobara login (logout ke baad bhi verified hai)
    await api()
      .post('/api/auth/login')
      .send({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASS })
      .expect(200)
      .expect((res) => {
        customerAccess = res.body.accessToken;
      });
  });

  it('super_admin login + permissions list', async () => {
    await api()
      .post('/api/auth/login')
      .send({ email: SUPER_EMAIL, password: SUPER_PASS })
      .expect(200)
      .expect((res) => {
        superAccess = res.body.accessToken;
        if (res.body.user.role.name !== 'super_admin')
          throw new Error('not super_admin');
      });
    await api()
      .get('/api/rbac/permissions')
      .set('Authorization', `Bearer ${superAccess}`)
      .expect(200)
      .expect((res) => {
        if (!Array.isArray(res.body) || res.body.length < 16)
          throw new Error('permissions seed missing');
      });
  });

  it('super_admin admin banata hai; admin login karke /users dekhta hai', async () => {
    await api()
      .post('/api/users')
      .set('Authorization', `Bearer ${superAccess}`)
      .send({
        name: 'E2E Admin',
        email: 'admin@e2e.test',
        password: 'AdminSecret123',
        roleId: adminRoleId,
      })
      .expect(201)
      .expect((res) => {
        adminId = res.body.id;
        if (res.body.role.name !== 'admin') throw new Error('wrong role');
      });

    await api()
      .post('/api/auth/login')
      .send({ email: 'admin@e2e.test', password: 'AdminSecret123' })
      .expect(200)
      .expect((res) => {
        adminAccess = res.body.accessToken;
      });

    await api()
      .get('/api/users')
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
  });

  it('admin super_admin ko delete nahi kar sakta (403); roles manage nahi kar sakta (403)', async () => {
    const superRow = await api()
      .get('/api/users')
      .set('Authorization', `Bearer ${superAccess}`)
      .expect(200);
    const superId = (
      superRow.body.data as Array<{ id: string; email: string }>
    ).find((u) => u.email === SUPER_EMAIL)!.id;

    await api()
      .delete(`/api/users/${superId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(403);

    await api()
      .post('/api/rbac/roles')
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'hacker' })
      .expect(403);
  });

  it('super_admin admin ko delete kar sakta hai', async () => {
    await api()
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${superAccess}`)
      .expect(200);
  });

  it('forgot-password -> reset-password -> naye password se login', async () => {
    await api()
      .post('/api/auth/forgot-password')
      .send({ email: CUSTOMER_EMAIL })
      .expect(200);

    const code = await otpService.issue(CUSTOMER_EMAIL, 'password_reset');
    await api()
      .post('/api/auth/reset-password')
      .send({ email: CUSTOMER_EMAIL, otp: code, newPassword: 'NewPass456' })
      .expect(200);

    // purana password ab nahi chalna chahiye
    await api()
      .post('/api/auth/login')
      .send({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASS })
      .expect(401);
    await api()
      .post('/api/auth/login')
      .send({ email: CUSTOMER_EMAIL, password: 'NewPass456' })
      .expect(200);
  });

  it('forgot-email: phone OTP -> masked email', async () => {
    await api()
      .post('/api/auth/forgot-email')
      .send({ phone: CUSTOMER_PHONE })
      .expect(200);

    const code = await otpService.issue(CUSTOMER_PHONE, 'email_recovery');
    await api()
      .post('/api/auth/recover-email')
      .send({ phone: CUSTOMER_PHONE, otp: code })
      .expect(200)
      .expect((res) => {
        if (res.body.email !== 'c***@e2e.test')
          throw new Error(`unexpected masked email: ${res.body.email}`);
      });
  });

  it('bina token ke protected route 401', async () => {
    await api().get('/api/users/me').expect(401);
  });
});

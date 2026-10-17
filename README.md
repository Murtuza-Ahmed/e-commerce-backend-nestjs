# Al-ucaaz API — Phase 1: Users

E-commerce backend, **phase-wise** ban raha hai — jaise asal professional projects bante hain:
**idea → programming → testing → dev → production**, har phase mukammal verify karke agla phase.

**Phase 1 = Users module (mukammal):** signup/signin, email OTP verification (bina OTP login nahi),
JWT access + refresh tokens (rotation), forgot/reset password, forgot email (phone SMS OTP),
authentication, authorization, **dynamic RBAC**, user management (super_admin / admin / customer),
tamam credentials env me, tests asli PostgreSQL par pass.

> Agle phases (catalog, orders, payments...) isi bunyad par ayenge. Payments ki
> permissions (`payments:*`) abhi se reserve hain taake RBAC pehle se tayyar ho.

---

## 1. Install (pehli dafa) — IMPORTANT

**Naya fresh clone lo.** Ye ZIP purani files delete nahi karta (ZIP sirf overwrite
karta hai) — purane template par extract karoge to purani todo files reh jayengi
aur build tootega. Is liye:

```bash
# 1. GitHub se NAYA fresh clone (purane folder me extract MAT karo)
git clone https://github.com/Murtuza-Ahmed/todo-app-nestjs al-ucaaz-backend
cd al-ucaaz-backend

# 2. Is ZIP ko us folder ke ANDAR "Extract Here" -> "Yes to All"
# 3. Dependencies
npm install

# 4. .env banao aur Neon + secrets bharo
cp .env.example .env
# .env kholo: DATABASE_URL (Neon, aakhir me ?sslmode=require),
# JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (16+ random characters),
# SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD, SMTP_*, TWILIO_* (neeche dekho)
```

### 5. Tables banao (sirf ek dafa)

`.env` me `DATABASE_SYNC=true` karo, phir:

```bash
npm run start:dev
```

Jab `Nest application successfully started` aa jaye to tables ban gayi — `Ctrl+C`
se band karo aur `.env` me wapas `DATABASE_SYNC=false` kar do.

> `DATABASE_SYNC=true` kabhi permanent mat rakho — schema change par data drop ho
> sakta hai. Production me hamesha `false`.

### 6. Seed (roles, permissions, super admin)

```bash
npm run seed
```

Ye banata hai: 16 permissions, 3 roles (`super_admin`, `admin`, `customer`),
aur `.env` wale email/password par super admin (verified, active).

### 7. Chalao

```bash
npm run start:dev
# API: http://localhost:3000/api
# Swagger: http://localhost:3000/api/api-docs
# Health: http://localhost:3000/api/
```

---

## 2. Credentials (.env) — kya kya lagta hai

| Variable | Lazmi? | Kaam |
|---|---|---|
| `DATABASE_URL` | Haan | Neon PostgreSQL string (`?sslmode=require` ke sath) |
| `DATABASE_SYNC` | Haan | Sirf pehli dafa `true`, phir `false` |
| `JWT_ACCESS_SECRET` | Haan | 16+ random characters (Render generate kar deta hai) |
| `JWT_REFRESH_SECRET` | Haan | 16+ random characters, access se mukhtalif |
| `JWT_ACCESS_EXPIRES_IN` | Nahi | Default `15m` (`15m`/`1h`/`3600` sab chalte hain) |
| `JWT_REFRESH_EXPIRES_IN` | Nahi | Default `7d` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Prod me haan | Koi bhi SMTP (Gmail App Password, Resend, SES). Na ho to **dev mode**: OTP terminal par print hota hai |
| `OTP_TTL_MINUTES` / `OTP_MAX_ATTEMPTS` | Nahi | Default `10` min / `5` attempts |
| `OTP_SECRET` | Prod me haan | OTP hash ka secret |
| `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM` | Nahi | Forgot-email SMS ke liye. Na ho to dev mode (terminal) |
| `SUPER_ADMIN_EMAIL/PASSWORD` | Haan | Seed ke liye pehla super admin |
| `CORS_ORIGIN` | Nahi | Default `*`; prod me frontend domain |
| `FRONTEND_URL` | Nahi | Frontend ka URL (mustaqbil ke emails ke liye) |

App start par env validate hota hai — koi lazmi cheez missing hui to app seedha
error dekar ruk jayegi (aadhi chalti app se behtar).

---

## 3. Flows

### A) User perspective (koi bhi customer)

1. `POST /api/auth/signup` `{name, email, phone?, password}` → account banta hai,
   email par 6-digit OTP jata hai. **Verify kiye baghair login nahi hoga.**
2. `POST /api/auth/verify-email` `{email, otp}` → verified + foran login tokens.
3. `POST /api/auth/login` `{email, password}` → `{accessToken, refreshToken, user}`.
4. Access token har request me: `Authorization: Bearer <token>`.
5. `POST /api/auth/refresh` `{refreshToken}` → naya pair (purana foran invalid — rotation).
6. `POST /api/auth/logout` → session khatam.
7. Password bhool gaye → `POST /api/auth/forgot-password` `{email}` → email par OTP →
   `POST /api/auth/reset-password` `{email, otp, newPassword}` (saari sessions logout).
8. Email bhool gaye → `POST /api/auth/forgot-email` `{phone}` → phone par SMS OTP →
   `POST /api/auth/recover-email` `{phone, otp}` → masked email (`m***@gmail.com`).
9. `GET /api/users/me`, `PATCH /api/users/me`, `POST /api/users/me/change-password`.

OTP ke rules: 6-digit, 10 min expiry, ghalat attempts par block, ek waqt me ek hi
valid code, DB me sirf hash (plain code kabhi store nahi hota).

### B) Super-admin perspective

Seed wala super admin login kare (`SUPER_ADMIN_EMAIL/PASSWORD`), phir:

- `POST /api/users` `{name, email, password, roleId}` → **admin ya customer banata hai**
  (staff-created accounts trusted → verified).
- `DELETE /api/users/:id` → **admin ko delete kar sakta hai.**
- `PATCH /api/users/:id/role` → kisi ka role change.
- `PATCH /api/users/:id/active` → activate/deactivate (deactivate = foran logout).
- `GET /api/rbac/permissions` → tamam permissions ki list.
- `POST /api/rbac/roles` `{name, level, permissionNames[]}` → **naya role.**
- `PUT /api/rbac/roles/:id/permissions` → role ki permissions badlo (dynamic RBAC).
- `DELETE /api/rbac/roles/:id` → role delete (system roles nahi, aur jis par users hon wo nahi).

### C) Admin perspective

Admin ke paas **sab kuch** hai siwaye:
- Role management (`roles:*`) — sirf super_admin.
- Kisi ka role change (`users:manage-roles`) — sirf super_admin.
- **Payment side update/delete** (`payments:update`, `payments:delete`) — requirement ke mutabiq admin ko nahi milte. Payments module agle phase me aayega; permissions abhi se tayyar hain.

**Level rule (dynamic):** har role ka `level` hota hai (super_admin 100 > admin 50 >
customer 10). Apne level ya upar wale user ko manage nahi kar sakte — admin
customer ko handle kar sakta hai, doosre admin ko nahi; super_admin sab ko.

---

## 4. API reference (mukhtasar)

Saari routes `/api` prefix ke neeche. `@Public` wali khuli, baqi par Bearer token lazmi.

**Auth** (`/api/auth`) — sab public siwaye logout:
`POST signup`, `POST verify-email`, `POST resend-otp`, `POST login`,
`POST refresh`, `POST logout` 🔒, `POST forgot-password`, `POST reset-password`,
`POST forgot-email`, `POST recover-email`

**Users** (`/api/users`) — 🔒 sab par login lazmi:
`GET me`, `PATCH me`, `POST me/change-password` (koi bhi user apne liye),
`GET /` (users:read), `GET /:id` (users:read), `POST /` (users:create),
`PATCH /:id` (users:update), `PATCH /:id/role` (users:manage-roles),
`PATCH /:id/active` (users:activate), `DELETE /:id` (users:delete)

**RBAC** (`/api/rbac`) — 🔒 sirf super_admin:
`GET permissions`, `GET roles`, `GET roles/:id`, `POST roles`,
`PATCH roles/:id`, `PUT roles/:id/permissions`, `DELETE roles/:id`

**Health:** `GET /api/` (public)

Rate limiting: global 120/min; signup/login/OTP endpoints par 10–20/min (brute-force protection).
Mukammal docs: `http://localhost:3000/api/api-docs`.

---

## 5. Dynamic RBAC — ye kaam kaise karta hai

- Permissions DB table me hain (`resource:action`, masalan `users:create`) — code me hardcode nahi.
- Har request par `JwtStrategy` user ka role + permissions **DB se fresh** load karta hai — token me permissions cache nahi, is liye permission badalte hi foran lagoo.
- Route par `@RequirePermissions('users:create')` → `PermissionsGuard` check karta hai.
- `grantsAll` wala role (super_admin) bypass karta hai.
- Nayi permission ya naya role super_admin `/api/rbac` se bana sakta hai — deploy ki zaroorat nahi.

---

## 6. Security notes (real-world)

- Passwords: bcrypt (12 rounds). Refresh tokens: DB me hash (SHA-256 pre-hash + bcrypt — bcrypt ke 72-byte truncation bug ka fix).
- Refresh rotation: har refresh par naya pair; purana foran invalid; reuse/shak par session kill.
- Login errors generic (email vs password ka farq nahi batate); forgot flows me account enumeration nahi.
- OTP: HMAC-SHA256 hash, expiry, attempt limit, ek waqt me ek valid.
- Helmet headers, CORS configurable, global validation pipe, env validation fail-fast.
- Deactivate ya password reset par saari sessions foran logout.

## 7. Tests

```bash
npx jest                        # unit (13 tests)
E2E_DATABASE_URL=postgresql://user:pass@host:5432/db npx jest --config ./test/jest-e2e.json
```

E2E asli PostgreSQL par chalta hai (bina `E2E_DATABASE_URL` ke skip): 15 tests —
signup→OTP→verify→login→refresh rotation→logout, RBAC allow/deny, super_admin ka
admin create/delete, forgot/reset password, forgot/recover email.

## 8. Production (Render + Neon)

1. Render Dashboard → New → Blueprint → ye repo (`render.yaml` mojood hai).
2. Dashboard me set karo: `DATABASE_URL` (Neon, `?sslmode=require`), `SMTP_*`,
   `TWILIO_*`, `CORS_ORIGIN` (frontend domain), `SUPER_ADMIN_EMAIL/PASSWORD`.
   JWT secrets aur `OTP_SECRET` Render khud generate kar dega.
3. Pehle deploy ke baad **ek dafa** `DATABASE_SYNC=true` karke deploy karo (tables),
   phir `false` karke dobara deploy karo. Phir Render shell me `npm run seed`.

## 9. Project structure

```
src/
├── main.ts                 # prefix /api, helmet, validation, CORS, Swagger
├── app.module.ts           # config validation, DB, global guards (throttle→JWT→permissions)
├── config/                 # env.validation.ts, db-ssl.ts, data-source.ts
├── common/                 # decorators (@Public/@RequirePermissions/@CurrentUser), crypto
├── rbac/                   # Role/Permission entities, guard, service, controller
├── users/                  # User entity, service, controller (me + staff management)
├── auth/                   # signup/login/OTP/refresh/forgot flows, JWT strategy
├── otp/                    # OTP engine (issue/verify, expiry, attempts)
├── mail/                   # SMTP email (dev fallback: terminal)
├── sms/                    # Twilio SMS (dev fallback: terminal)
└── health/                 # GET /api/
seed.ts                     # npm run seed — pehle RBAC, phir super admin
src/database/seeds/        # rbac.seed.ts, super-admin.seed.ts
```

Phase 2 jab shuru hoga to isi structure me naya module (masalan `catalog/`) aayega —
users/auth/RBAC ko chhede baghair.

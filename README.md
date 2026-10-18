# Al-ucaaz API

A phase-built e-commerce backend — engineered the way real production systems are built:
**plan → implement → test → verify**, one phase at a time. No shortcuts, no dead code.

**Stack:** NestJS 11 · TypeORM · PostgreSQL (Neon) · JWT · Cloudinary · Swagger

---

## What lives here

### Phase 1 — Users, Auth & Access Control ✅

| Area | Details |
|---|---|
| Signup / Signin | Email + password, bcrypt (12 rounds) |
| Email OTP | 6-digit, HMAC-hashed, 10-min expiry, attempt limits — **login is impossible without verification** |
| Tokens | JWT access (15m) + refresh (7d) with **rotation** — every refresh invalidates the previous pair |
| Recovery | Forgot/reset password via email OTP (all sessions revoked) · Forgot email via phone SMS OTP → masked email |
| Dynamic RBAC | Roles & permissions stored in the database — no hardcoded roles. Fresh permissions load on every request |
| User management | Self-service profile · staff CRUD with role-hierarchy protection (you can't manage your own level or above) |

### Phase 2 — Image Uploads ✅ (current)

| Area | Details |
|---|---|
| Cloudinary uploads | `POST /api/uploads` — images only, 5 MB max, returns `{url, publicId}` |
| User avatars | `PATCH /api/users/me/avatar` — any user can set their profile picture; the old image is auto-deleted from Cloudinary |
| New permissions | `uploads:create`, `uploads:delete` — staff only for the upload endpoints; avatars are self-service |

---

## Quick start

> **Start from a fresh clone.** This project is delivered as a flat archive — extracting
> over an old folder does **not** delete stale files and will break the build.
> ```bash
> git clone https://github.com/Murtuza-Ahmed/todo-app-nestjs al-ucaaz-backend
> cd al-ucaaz-backend
> # extract the archive here → "Yes to All"
> ```

```bash
npm install

# 1. Configure — copy and fill in every value (see Configuration below)
cp .env.example .env        # Windows: copy .env.example .env

# 2. Create tables — exactly once
#    Set DATABASE_SYNC=true in .env, then:
npm run start:dev
#    When "Nest application successfully started" appears, press Ctrl+C,
#    then set DATABASE_SYNC=false again.

# 3. Seed — roles, permissions, super admin
npm run seed

# 4. Run
npm run start:dev
```

| Endpoint | URL |
|---|---|
| API | `http://localhost:3000/api` |
| Swagger docs | `http://localhost:3000/api/api-docs` |
| Health | `http://localhost:3000/api/` |

Log in with your `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` to begin.

> Never leave `DATABASE_SYNC=true` permanently — a schema change can drop data.
> In production it must always be `false`.

---

## Configuration

All settings are validated at startup — the app refuses to boot with a clear error
instead of running half-configured.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string, ending with `?sslmode=require` |
| `DATABASE_SYNC` | Yes | `true` only for the one-time table creation, then `false` |
| `JWT_ACCESS_SECRET` | Yes | 16+ random characters |
| `JWT_REFRESH_SECRET` | Yes | 16+ random characters, different from the access secret |
| `JWT_ACCESS_EXPIRES_IN` | No | Default `15m` (`15m`, `1h`, `3600` all accepted) |
| `JWT_REFRESH_EXPIRES_IN` | No | Default `7d` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Prod: yes | Any SMTP provider (Gmail App Password, Resend, SES…). Without it, **dev mode**: OTPs are printed to the terminal |
| `OTP_TTL_MINUTES` / `OTP_MAX_ATTEMPTS` | No | Defaults `10` / `5` |
| `OTP_SECRET` | Prod: yes | Secret used to hash OTPs |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | No | SMS OTP for the forgot-email flow; dev mode prints to terminal |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Prod: yes | Image uploads; without them upload endpoints return a clear `400` |
| `OBSERVE_APP_KEY` / `OBSERVE_APP_SECRET` | No | [NestJS Observe](https://observe.nestjs.com) — official observability (traces, metrics, errors). Without them the SDK logs one warning and sends nothing |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | Yes | First super admin, created by `npm run seed` |
| `CORS_ORIGIN` | No | Default `*`; set your frontend domain in production |

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## API reference

Every route lives under `/api`. Routes marked 🔒 require `Authorization: Bearer <accessToken>`.
`@Public` routes are open. Full interactive docs at `/api/api-docs`.

### Auth — `/api/auth` (public, except logout)

| Method | Route | Notes |
|---|---|---|
| POST | `/signup` | Creates the account, sends a 6-digit OTP |
| POST | `/verify-email` | `{email, otp}` → verifies and returns tokens immediately |
| POST | `/resend-otp` | `{email, purpose}` — always the same response (no account enumeration) |
| POST | `/login` | Unverified accounts get `403 EMAIL_NOT_VERIFIED` |
| POST | `/refresh` | `{refreshToken}` → new pair, old pair instantly invalid |
| POST | `/logout` 🔒 | Revokes the session |
| POST | `/forgot-password` | Sends a reset OTP |
| POST | `/reset-password` | `{email, otp, newPassword}` — revokes all sessions |
| POST | `/forgot-email` | `{phone}` → SMS OTP |
| POST | `/recover-email` | `{phone, otp}` → returns a masked email (`j***@example.com`) |

### Users — `/api/users` 🔒

| Method | Route | Permission | Notes |
|---|---|---|---|
| GET | `/me` | — | Any logged-in user |
| PATCH | `/me` | — | Name / phone — JSON, or form-data with an optional `avatar` file (one request does both) |
| POST | `/me/change-password` | — | Revokes other sessions |
| PATCH | `/me/avatar` | — | Multipart image → Cloudinary; old avatar auto-deleted |
| DELETE | `/me/avatar` | — | Removes the avatar |
| GET | `/` | `users:read` | Paginated, searchable |
| GET | `/:id` | `users:read` | |
| POST | `/` | `users:create` | Staff-created accounts are pre-verified; optional `avatar` file via form-data |
| PATCH | `/:id` | `users:update` | JSON, or form-data with an optional `avatar` file |
| PATCH | `/:id/role` | `users:manage-roles` | Super admin only |
| PATCH | `/:id/active` | `users:activate` | Deactivation logs the user out instantly |
| DELETE | `/:id` | `users:delete` | Also deletes the user's Cloudinary avatar — no orphans |

### Uploads — `/api/uploads` 🔒

| Method | Route | Permission | Notes |
|---|---|---|---|
| POST | `/` | `uploads:create` | `multipart/form-data` with `file` (+ optional `folder`) → `{url, publicId}`. Images only, 5 MB max |
| DELETE | `/?publicId=` | `uploads:delete` | Removes from Cloudinary |

### RBAC — `/api/rbac` 🔒 (super admin)

`GET /permissions` · `GET /roles` · `GET /roles/:id` · `POST /roles` ·
`PATCH /roles/:id` · `PUT /roles/:id/permissions` · `DELETE /roles/:id`

### Health

`GET /api/` — public, for uptime checks.

**Rate limiting:** 120 req/min globally; 10–20 req/min on signup/login/OTP endpoints.

---

## Access control model

Permissions live in the database (`resource:action`, e.g. `users:create`) — nothing is
hardcoded. Every request reloads the user's role and permissions fresh, so a permission
change takes effect immediately without re-login.

- **Roles** carry a `level` (super_admin 100 › admin 50 › customer 10). You can only
  manage users **below** your level — an admin handles customers, never another admin.
- **`grantsAll`** (super_admin) bypasses every permission check.
- **Admin** has everything **except**: role management (`roles:*`), assigning user roles
  (`users:manage-roles`), and payment updates/deletes (`payments:update`, `payments:delete`)
  — the payment surface is reserved for a later phase and stays locked down by design.
- New roles and permissions can be created at runtime via `/api/rbac` — no deploy needed.

---

## Image uploads

Powered by Cloudinary. Configure the three `CLOUDINARY_*` variables and uploads go
live; without them the endpoints fail fast with a clear `400` instead of silently
breaking.

- General uploads: `POST /api/uploads` → take the returned `url` → store it wherever
  you need it (product images in a later phase, for example).
- Image validation is **content-based, not extension-based**: the server reads the
  file's magic bytes to confirm it's a real JPEG, PNG, GIF, WebP or BMP.
  A `.jfif` photo (JPEG data under the hood) uploads fine even when the
  client can't label its type — and a renamed `.exe` never sneaks through.
- Avatars: `PATCH /api/users/me/avatar` handles upload **and** cleanup — replacing an
  avatar deletes the previous file from Cloudinary, so no orphans accumulate.
  Deleting a user (`DELETE /api/users/:id`) also removes their Cloudinary avatar.
- One-shot profile updates: `PATCH /api/users/me`, `POST /api/users` and
  `PATCH /api/users/:id` accept **either** JSON **or** `multipart/form-data`.
  Send form-data with an `avatar` file field plus the regular fields to update
  data and picture in a single request. The picture is always optional — without
  it, the account is created/updated exactly as before.

---

## Observability

The app ships with the official [`@nestjs/observe`](https://observe.nestjs.com) SDK
wired in (`ObserveModule` + the `instrument` bootstrap option). Every request becomes
a trace of your own controllers, providers, guards and database queries — no manual
spans, no collector to run.

1. Create a free project at [observe.nestjs.com](https://observe.nestjs.com) and copy
   the app key + secret.
2. Set `OBSERVE_APP_KEY` / `OBSERVE_APP_SECRET` in `.env` (and in Render for production).
3. Restart — traces, errors and runtime metrics start flowing.

Without the keys the app runs exactly as before; the SDK logs a single warning and
sends nothing.

## Security notes

- Passwords: bcrypt, 12 rounds. Refresh tokens: SHA-256 pre-hash + bcrypt
  (bcrypt silently truncates past 72 bytes — two JWTs issued in the same second share
  a prefix, so the pre-hash is a real fix, not paranoia).
- Refresh **rotation**: each refresh mints a new pair and kills the old one; reuse or
  tampering kills the whole session.
- OTPs: 6-digit, HMAC-SHA256 hashed at rest, expiring, attempt-limited, single-active.
- Login and recovery responses are enumeration-safe (no "email not found" leaks).
- Helmet headers, configurable CORS, global validation pipe, fail-fast env validation,
  per-endpoint rate limits.
- Deactivation or password reset revokes every session immediately.

---

## Tests

```bash
npx jest                         # unit — 14 tests
E2E_DATABASE_URL=postgresql://user:pass@host:5432/db \
  npx jest --config ./test/jest-e2e.json   # e2e — 17 tests on real PostgreSQL
```

The e2e suite runs against a real database (skipped without `E2E_DATABASE_URL`) and
covers: signup → OTP → verify → login → refresh rotation → logout, RBAC allow/deny,
super-admin creates/deletes admins, forgot/reset password, forgot/recover email,
avatar upload endpoints, and upload behavior without credentials.

---

## Deployment (Render + Neon)

1. Render Dashboard → **New → Blueprint** → this repo (a `render.yaml` is included).
2. Set in the dashboard: `DATABASE_URL` (Neon, with `?sslmode=require`), `SMTP_*`,
   `TWILIO_*`, `CLOUDINARY_*`, `CORS_ORIGIN` (your frontend domain),
   `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`. JWT secrets and `OTP_SECRET` can be
   Render-generated.
3. After the first deploy, run **one** deploy with `DATABASE_SYNC=true` (creates tables),
   then set it back to `false` and redeploy. Then, in the Render shell: `npm run seed`.

---

## Project structure

```
src/
├── main.ts                  # /api prefix, helmet, validation, CORS, Swagger
├── app.module.ts            # env validation, DB, global guards (throttle → JWT → permissions)
├── config/                  # env validation, Neon-aware SSL, standalone data source
├── common/                  # decorators, crypto helpers, slugify
├── rbac/                    # Role/Permission entities, guard, management API
├── users/                   # User entity, auth-adjacent profile & staff management
├── auth/                    # signup/login/OTP/refresh/recovery, JWT strategy
├── otp/                     # OTP engine — issue/verify, expiry, attempt limits
├── mail/ / sms/             # SMTP email / Twilio SMS (terminal fallback in dev)
├── uploads/                 # Cloudinary service + upload endpoints
└── health/                  # GET /api/
seed.ts                      # npm run seed → RBAC → super admin
src/database/seeds/          # rbac.seed.ts, super-admin.seed.ts
test/                        # app.e2e-spec.ts (DB-gated), e2e-setup.ts
```

## Roadmap

- **Phase 3** — Catalog, one API group at a time (categories → products → variants)
- **Phase 4** — Orders & checkout (cart → order, stock decrement, coupons)
- **Phase 5** — Payments (the reserved `payments:*` permissions activate here)
- **Later** — Frontend wiring (`VITE_USE_API=true`), reviews, notifications

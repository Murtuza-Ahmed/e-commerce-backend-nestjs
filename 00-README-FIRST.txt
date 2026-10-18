Al-ucaaz API — PHASE 2 (Users + Image Uploads)
========================================================
Read THIS file first, then README.md (full documentation, in English).

STEP 0 — MOST IMPORTANT (otherwise the build breaks):
  This ZIP does not delete old files — it only overwrites.
  So start from a FRESH CLONE — do NOT extract over your old folder:
    git clone https://github.com/Murtuza-Ahmed/todo-app-nestjs al-ucaaz-backend
    cd al-ucaaz-backend
  Then extract this ZIP INSIDE that folder: "Extract Here" -> "Yes to All".

STEP 1 — Install:
  npm install

STEP 2 — Configure:
  Copy .env.example to .env and fill in every value.
  Minimum: DATABASE_URL (Neon, ends with ?sslmode=require),
  JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (16+ random chars),
  OTP_SECRET, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD.
  Optional (dev fallbacks exist): SMTP_*, TWILIO_*, CLOUDINARY_*.

STEP 3 — Create tables (ONE time only):
  In .env set DATABASE_SYNC=true, then run:
    npm run start:dev
  When "Nest application successfully started" appears, press Ctrl+C,
  then set DATABASE_SYNC=false again. (New columns like avatarUrl
  are also created this way — one sync run is enough.)

STEP 4 — Seed (roles, permissions, super admin):
  npm run seed
  Re-running the seed is safe — it upserts (RBAC re-sync also grants
  the admin role the new Phase-2 upload permissions).

STEP 5 — Run:
  npm run start:dev
  API:     http://localhost:3000/api
  Swagger: http://localhost:3000/api/api-docs
  Health:  http://localhost:3000/api/

WHAT'S NEW IN PHASE 2:
  - Image uploads via Cloudinary: POST /api/uploads (images only, 5MB)
  - User avatars: PATCH /api/users/me/avatar (old image auto-deleted)
  - New RBAC permissions: uploads:create, uploads:delete

VERIFY:
  npm run build          # must compile
  npx jest               # unit tests — 14 pass
  # e2e needs a real Postgres:
  E2E_DATABASE_URL=postgresql://user:pass@host:5432/db npx jest --config ./test/jest-e2e.json

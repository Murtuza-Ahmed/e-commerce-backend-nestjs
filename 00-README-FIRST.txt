Al-ucaaz API — PHASE 1 (Users, Auth, OTP, dynamic RBAC)
================================================
Pehle YE FILE parho, phir README.md.

STEP 0 — SAB SE ZAROORI (warna build tootega):
  Ye ZIP purani files DELETE nahi karta, sirf overwrite karta hai.
  Is liye NAYA FRESH CLONE lo — purane todo-app-nestjs folder me extract MAT karo:
    git clone https://github.com/Murtuza-Ahmed/todo-app-nestjs al-ucaaz-backend
    cd al-ucaaz-backend
  Phir is ZIP ko us folder ke ANDAR "Extract Here" -> "Yes to All".

STEP 1 — Install:
    npm install

STEP 2 — .env:
    cp .env.example .env        (Windows: copy .env.example .env)
  .env kholo aur bharo:
    DATABASE_URL = Neon ka connection string (aakhir me ?sslmode=require)
    JWT_ACCESS_SECRET / JWT_REFRESH_SECRET = 16+ random characters
    SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD
    SMTP_* = email OTP ke liye (na ho to dev mode: OTP terminal par print hoga)
    TWILIO_* = forgot-email SMS ke liye (optional)

STEP 3 — Tables (SIRF EK DAFA):
  .env me DATABASE_SYNC=true karo, phir:
    npm run start:dev
  "Nest application successfully started" aaye to Ctrl+C se band karo,
  aur .env me wapas DATABASE_SYNC=false kar do.

STEP 4 — Seed (roles + permissions + super admin):
    npm run seed

STEP 5 — Chalao:
    npm run start:dev
  API:     http://localhost:3000/api
  Swagger: http://localhost:3000/api/api-docs
  Login:   SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD se (super admin)

FLOWS (mukhtasar):
  Customer: signup -> email OTP -> verify-email -> login (bina OTP login NAHI)
  Super admin: login -> POST /api/users se admin banaye -> DELETE /api/users/:id se hataye
  Admin: sab kuch kar sakta hai SIWAYE role management aur payment update/delete ke

NOTES:
  - Har cheez test-shuda hai (13 unit + 15 e2e tests, asli PostgreSQL par).
  - Payments module agle phase me aayega; uski permissions abhi se tayyar hain.
  - Masla aaye to error ka text bhejo.

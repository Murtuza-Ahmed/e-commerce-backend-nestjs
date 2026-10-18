AL-UCAAZ BACKEND — EMAIL TEMPLATE FIX
=====================================
Extract at repo root ("Extract Here" -> "Yes to All"), phir:

  npm run build        (koi nayi dependency nahi — install ki zaroorat nahi)

Kya badla:
- src/mail/mail.service.ts .......... OTP emails ka premium branded English
                                      template (dark header, bara code box,
                                      expiry + security note). Saari 4 OTP
                                      purposes + email-changed notice ab
                                      English me, pehle Roman Urdu thi.
- src/mail/mail.service.spec.ts ..... naya unit test (4 tests)

Koi DB change nahi, koi env change nahi, koi seed nahi.

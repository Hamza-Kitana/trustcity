# TRUST City Hub

واجهة Vite + React لمدينة TRUST CFW.

## Vercel — Discord Client ID

متغيرات `VITE_*` تُدمَج عند **البناء**، وليس وقت التشغيل فقط.

1. في [Vercel](https://vercel.com) → المشروع → **Settings** → **Environment Variables**
2. أضف:
   - `VITE_DISCORD_CLIENT_ID` = Application ID من Discord Developer Portal
   - (اختياري) `VITE_DISCORD_INVITE_URL` = رابط انضمام السيرفر
3. في Discord → **OAuth2** → **Redirects** أضف:
   - `https://<دومينك>/auth/discord/callback` (نفس دومين Vercel بالضبط)
4. **Deployments** → آخر نشر → **Redeploy** (أو ادفع commit جديد إلى `main`)

بدون Redeploy بعد إضافة المتغيرات، يبقى الموقع بدون Client ID.

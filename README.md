# TRUST City Hub

واجهة Vite + React لمدينة **TRUST CFW**.

## Discord — تسجيل الدخول على Vercel

المعرّف مضبوط في `.env.production` ويُدمَج عند كل بناء على Vercel.

### خطوة واحدة في Discord Developer Portal

1. [Discord Developer Portal](https://discord.com/developers/applications) → تطبيقك (`1508945659447869630`)
2. **OAuth2** → **Redirects** → أضف **بالضبط**:
   - `https://trustcity.vercel.app/auth/discord/callback`
   - (للتطوير المحلي) `http://localhost:8080/auth/discord/callback`
3. احفظ التغييرات.

بعد كل دفع إلى `main`، Vercel يعيد النشر تلقائياً. إذا غيّرت المتغيرات من لوحة Vercel فقط، اضغط **Redeploy**.

### تطوير محلي

```bash
cp .env.example .env.local
npm install
npm run dev
```

افتح `http://localhost:8080` — أعد تشغيل السيرفر بعد تعديل `.env.local`.

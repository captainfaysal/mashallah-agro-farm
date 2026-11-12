# মাশাল্লাহ এগ্রো ফার্ম – Farm Management System

React + Vite + Tailwind (Vercel) · Express + Prisma (Render) · PostgreSQL (Supabase)

## কী কী আছে
- ক্রয়-বিক্রয় (পণ্য, দর, মোট, নগদ পরিশোধ, বাকি) ও স্বয়ংক্রিয় মজুদ হিসাব
- পার্টি তালিকা + প্রতিটি পার্টির লেজার (চলমান ব্যালেন্সসহ) + পেমেন্ট
- হিসাব নিষ্পত্তি: সরবরাহের চূড়ান্ত প্রাপ্য সমন্বয় করে; বাস্তবে পাওয়া টাকা পেমেন্টে আলাদাভাবে লিখতে হয়
- দৈনিক আয়-ব্যয় খাতা
- দৈনিক খাতায় ক্রয় ব্যয় ও পাওয়া পেমেন্টের আয় স্বয়ংক্রিয়ভাবে যুক্ত হয়; মালিকেরা অন্যান্য আয়-ব্যয় ম্যানুয়ালি যোগ করতে পারেন
- গরু: ক্রয়, খরচ, বিক্রয়, প্রতিটি গরুর লাভ/ক্ষতি
- ড্যাশবোর্ড: দৈনিক/মাসিক/বার্ষিক আয়, খরচ, লাভ-ক্ষতি, পাওনা-দেনা, চার্ট, প্রিন্ট
- বাংলা / English
- শুধু ২ জন মালিক লগইন করে তথ্য দেখতে ও পরিবর্তন করতে পারেন। সাধারণ দর্শক শুধু হোমপেজ দেখেন (গরুর সংখ্যা ও পণ্যের নাম, কোনো টাকার অংক নয়)।

## লোকাল চালানো
```bash
# 1) Backend
cd backend
cp .env.example .env        # Supabase URL, JWT_SECRET, মালিকদের ইমেইল/পাসওয়ার্ড বসান
npm install
npx prisma migrate dev --name init
npm run seed                # ২ জন মালিক তৈরি হবে
npm run dev                 # http://localhost:4000

# 2) Frontend (আরেকটি টার্মিনালে)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

## অনলাইনে দেওয়া (সব ফ্রি)
1. **GitHub**: পুরো ফোল্ডার একটি repo-তে push করুন।
2. **Supabase**: নতুন প্রজেক্ট খুলুন → Project Settings → Database → Connection string।
   `DATABASE_URL` = pooled (port 6543, শেষে `?pgbouncer=true`), `DIRECT_URL` = direct (port 5432)।
3. **Migration একবার নিজের পিসি থেকে চালান**: `cd backend && npx prisma migrate dev --name init`, তারপর `npm run seed`।
4. **Render**: New → Blueprint (render.yaml) অথবা Web Service, Root Directory `backend`।
   Environment: `DATABASE_URL`, `DIRECT_URL`, `CLIENT_URL` (আপনার Vercel লিংক, শেষে `/` ছাড়া), `NODE_ENV=production`, `JWT_SECRET`।
5. **Vercel**: Root Directory `frontend`, Environment `VITE_API_URL` = Render লিংক।
6. Vercel লিংক পাওয়ার পর Render-এ `CLIENT_URL` ঠিক করে redeploy দিন।

## জেনে রাখুন
- Render ফ্রি প্ল্যানে কিছুক্ষণ ব্যবহার না হলে সার্ভার ঘুমিয়ে যায়; প্রথম লোডে ~৩০-৫০ সেকেন্ড লাগতে পারে।
- Supabase ফ্রি প্ল্যানে ডাটাবেস নিয়মিত ব্যাকআপ (`pg_dump`) নিয়ে রাখা ভালো।
- Production-এ কুকি `httpOnly + secure + sameSite=none`; লগইনে rate limit আছে; লেখার রিকোয়েস্ট শুধু আপনার ফ্রন্টএন্ড origin থেকে গ্রহণযোগ্য।
- ড্যাশবোর্ডের দৈনিক/মাসিক/বার্ষিক লাভ-ক্ষতি, গরুর হিসাব বাদ দিয়ে: আয় = পাওয়া পেমেন্ট + খাতার অন্যান্য আয়; খরচ = ক্রয়ের ল্যান্ডেড কস্ট + খাতার ব্যয়।

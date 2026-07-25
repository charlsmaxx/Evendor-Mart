# Evendor

Africa's premium event marketplace — discover venues, compare vendors, request quotes, book with Paystack deposits, and manage events in one place.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS 4** + Framer Motion
- **Supabase** (Auth + PostgreSQL)
- **Prisma ORM**
- **Paystack** (NGN payments)
- **Cloudinary** (media)
- **Upstash Redis** (cache + rate limits)
- **Arcjet** (bot protection)

## Quick start

1. **Clone & install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and fill in values.

3. **Database**

   ```bash
   npx prisma db push
   npm run db:seed
   ```

   Run `supabase/rls.sql` in your Supabase SQL editor for Row Level Security policies.

4. **Supabase Auth**

   - Enable Email, Google OAuth, and Magic Link in Supabase Dashboard
   - Set Site URL to `http://localhost:3000`
   - Add redirect URL: `http://localhost:3000/api/auth/callback`

5. **Dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Seed accounts

After seeding, demo vendor users exist (`vendor1@evendor.app`, etc.). Create real users via `/register`. Admin user: `admin@evendor.app` (id `00000000-0000-0000-0000-000000000001`) — sign in via Supabase with matching UUID or update role in DB.

## Paystack webhooks

Point webhook URL to:

`https://your-domain.com/api/webhooks/paystack`

Events: `charge.success`

## Deploy (Vercel)

1. Import repo to Vercel
2. Add all env vars from `.env.example`
3. Set `DATABASE_URL` and `DIRECT_URL` for Prisma
4. Deploy

## Project structure

```
src/app/(marketing)   Landing + legal
src/app/(auth)        Login, register, OTP
src/app/(app)         Marketplace, dashboards, messages
src/app/api           REST API routes
src/components        UI, marketing, marketplace, dashboard
prisma/               Schema + seed
supabase/rls.sql      RLS policies
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Seed categories & demo vendors |

## Phase 2 (deferred)

- Full payment reconciliation, commission ledger
- AI recommendations (`ENABLE_AI=true`)
- Escrow release workflow
- Resend email, native mobile app

## License

Private — Evendor © 2026

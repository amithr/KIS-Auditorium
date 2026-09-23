# Auditorium Period Sign-up

Next.js (App Router) + Supabase app for one school auditorium, school year **2026–27**. Teachers request a single period (P1–P8 or After School); requests stay **pending until an admin approves** them.

## Pages

| Route | Who | What |
|-------|-----|------|
| `/schedule` | Public | Week grid (desktop) / day list + bottom sheet (mobile 1a) |
| `/admin` | Auth + admin allow-list | Pill tabs: Booking requests (inbox + confirmed) and Blocks & Drama classes |

## Setup

### 1. Install & env

```bash
npm install
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project (Settings → API Keys). The publishable key replaces the legacy anon key.

### 2. Database

In the Supabase SQL editor, run:

[`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)

That creates `bookings`, `schedule_entries`, and `admins`, enables RLS (public read/insert pending; admin mutations), and turns on Realtime.

### 3. Create an admin user

1. Authentication → Users → Add user (email + password).
2. Copy the user UUID and run:

```sql
insert into public.admins (user_id) values ('<auth-user-uuid>');
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000/schedule](http://localhost:3000/schedule).

## Design contract

- Tokens: light Nocturne (accent `#9184d9`, ground `#fcfcfe`, red-day `#b8384e`). Buttons outlined, never filled; Inter 400/500.
- Red/black days alternate over **school days only**, starting RED on Aug 20, 2026 — derived in `src/lib/calendar.ts`, not stored.
- Period times are placeholders in `src/lib/periods.ts` — confirm the real bell schedule before launch.
- Teachers stay anonymous (name + purpose free text). No account on the public page.

## Stack

- Next.js 16 App Router, TypeScript, CSS Modules
- `@supabase/ssr` + `@supabase/supabase-js` (Auth, Postgres, Realtime)

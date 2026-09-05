# Setup

## Requirements

- Node.js 20.19+ or 22.13+ (the repo was built on 22.12, which npm warns about but runs)
- npm 10+
- A Supabase project
- A Yelp Fusion API key (optional — only the admin research tool needs it)

## Install

```bash
npm install
npm run dev
```

The site runs at http://localhost:3000 with **no configuration at all**. Until
Supabase credentials exist, every public page renders from the development seed
content in `src/lib/data/seed/`. Forms return a clear "not connected" message
rather than failing silently, and `/admin` redirects to a login page that
explains what is missing.

## Environment variables

Copy `.env.example` to `.env.local` and fill it in. `.env.local` is git-ignored.

| Variable | Where it is used | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server; RLS applies | No |
| `SUPABASE_SECRET_KEY` | Server only; **bypasses RLS** | **Yes** |
| `YELP_API_KEY` | Server only; admin research | **Yes** |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, sitemap, OG | No |

This project uses Supabase's **current key system**
(`PUBLISHABLE_KEY` / `SECRET_KEY`). The legacy `ANON_KEY` / `SERVICE_ROLE_KEY`
names are still read as a fallback in `src/lib/env.ts` so an older `.env` keeps
working, but new setups should use the current names.

### How the secrets are kept off the browser

- `SUPABASE_SECRET_KEY` is read only inside `src/lib/supabase/admin.ts`, which
  starts with `import "server-only"`. If that module is ever imported into a
  Client Component, **the build fails** rather than shipping the key.
- `YELP_API_KEY` is read only inside `src/lib/yelp/`, also `server-only`, and
  reached exclusively through authenticated route handlers.
- Neither name is prefixed with `NEXT_PUBLIC_`, so Next will not inline them.

Restart the dev server after editing `.env.local` — Next reads env at boot.

## Supabase

### 1. Run the migrations

With the Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Or paste the files in `supabase/migrations/` into the SQL editor **in filename
order**:

1. `20260101000000_initial_schema.sql` — tables, indexes, `updated_at` triggers
2. `20260101000001_rls_policies.sql` — row level security

### 2. Verify RLS

Every table has RLS enabled. Confirm in Dashboard → Authentication → Policies
that no table shows "RLS disabled". The model is:

- **Anonymous** reads rows where `status = 'published'` only, and may `INSERT`
  into `nominations`, `leads` and `email_subscribers` but never read them back.
- **Authenticated** users are staff and have full access.

There are no public user accounts, so "authenticated" currently means "staff".
`public.is_admin()` is the single function every policy calls — when public
accounts are added later, tighten that function and every policy inherits it.

### 3. Create an admin user

Dashboard → Authentication → Users → Add user. Use a real email and a strong
password. That account can then sign in at `/admin/login`.

There is no public sign-up, and email confirmation is not wired, so create staff
accounts by hand.

### 4. Seed content (optional)

The seed taxonomy in `src/lib/data/seed/taxonomy.ts` (categories and places) is
real Long Island geography and is safe to insert as your first rows.

The seed **businesses** are entirely fictional — invented names, invented
addresses, `555-01xx` phone numbers. They exist so the site renders during
development. Do not load them into a production database; replace them with real
businesses researched through `/admin/generate`.

## Yelp

Get a key at https://www.yelp.com/developers/v3/manage_app and set `YELP_API_KEY`.

Yelp is a **research input**, not a data source we mirror. The integration
persists only what is permitted — business id, source URL, sync timestamp — in
`external_business_refs`. Ratings and review counts are shown to the editor
while researching and are never written to our business rows or published as
LongIsland.io ratings.

## Commands

```bash
npm run dev     # dev server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
npx tsc --noEmit  # type check
```

## Deploying to Vercel

1. Import the GitHub repository in Vercel.
2. Add all five environment variables in Project Settings → Environment
   Variables. Set `NEXT_PUBLIC_SITE_URL` to the production origin
   (`https://longisland.io`) — it drives canonical URLs, the sitemap and OG tags.
3. Deploy. The framework preset, build command and output are detected
   automatically.
4. Add the production domain in Supabase → Authentication → URL Configuration so
   admin sign-in redirects resolve.

Remote images are blocked by default. To use a remote image host, add it to
`images.remotePatterns` in `next.config.ts` first.

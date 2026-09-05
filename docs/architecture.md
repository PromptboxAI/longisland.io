# Architecture

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS v4 |
| Data | Supabase (Postgres + Auth + RLS) |
| Validation | Zod |
| Forms | React Hook Form + `@hookform/resolvers` |
| Icons | lucide-react |
| Hosting | Vercel |

No CSS-in-JS, no component library, no state management library. Tailwind v4
holds the design tokens directly in `src/app/globals.css` under `@theme`, so
there is no `tailwind.config.js`.

## Folder structure

```
src/
  app/
    (public routes)      /, /best, /category, /place, /business, /search, …
    admin/               staff-only routes
    api/                 route handlers (forms, admin research)
    sitemap.ts robots.ts
  components/
    site/                header, footer, search, breadcrumbs
    cards/               ranking, business, category, place cards
    rankings/            ranked entry, quick list
    forms/               nomination and lead forms, field primitives
    editorial/           methodology and byline disclosure
    admin/               admin shell, tables, editors
    ui/                  image, rule heading
  lib/
    supabase/            browser, server and privileged clients
    data/                queries, admin queries, seed content
    yelp/                third-party research integration
    seo/                 JSON-LD builders
    env.ts auth.ts site.ts slug.ts validation.ts
  types/database.ts
supabase/migrations/     schema then RLS
docs/
```

## Data model

Eight content tables plus two intake tables.

```
categories ──┐            places ──┐
             ├─< businesses         │
             │        │             │
             │        └──< external_business_refs
             │                      │
rankings ────┴──────────────────────┘
    │
    └──< ranking_entries >── businesses

nominations   leads   email_subscribers   content_items
```

- **categories** and **places** are both self-referencing trees. A category page
  aggregates its descendants; a county page aggregates its towns.
- **businesses** belong to one category and carry their own address. A business
  belongs to a place by its `city`/`county` text, not a foreign key — a business
  is in a town because of where it is, not because an editor filed it there.
- **ranking_entries** is the join that carries the editorial payload: position,
  reasoning, "best for", badge, and internal notes. `unique (ranking_id,
  business_id)` stops a business appearing twice on one list.
- **external_business_refs** records third-party provenance only.

`src/types/database.ts` mirrors these by hand. If you regenerate types with the
Supabase CLI, replace that file wholesale rather than maintaining both.

## Data access

Two layers, deliberately separated:

- `src/lib/data/queries.ts` — public reads, through `supabase/public.ts`: a
  **cookie-free** client on the publishable key, so RLS restricts it to published
  rows. Cookie-free matters twice over — `cookies()` cannot be called from
  `generateStaticParams`, and reading cookies would opt every public route out of
  static rendering.

  It **falls back to seed content** in two cases: no credentials at all, and
  credentials present but the schema not yet applied. The second is detected by a
  one-time probe (a plain `GET`, never `head: true` — PostgREST returns no body
  on HEAD, so a missing table would come back as a misleading 204 with no error).
  Without that probe, adding credentials to a project whose migrations had not
  run would blank the entire site. This is the only module that knows seed data
  exists.
- `src/lib/data/admin-queries.ts` — staff reads. Calls `requireAdmin()` first and
  uses the authenticated session, so RLS grants access to drafts.

Pages never talk to Supabase directly.

## Auth model

Supabase Auth, email and password, staff only. There is no public sign-up.

Three layers, in order:

1. **`src/middleware.ts`** refreshes the session cookie and redirects
   unauthenticated `/admin/*` traffic to `/admin/login`. It calls `getUser()`,
   which revalidates against the auth server — `getSession()` would trust the
   cookie as-is, which is not good enough for an access decision.
2. **`requireAdmin()`** re-checks on every admin page and Server Action. A Server
   Action is a public HTTP endpoint; it cannot assume the page around it was
   authorised.
3. **RLS** is the real boundary. Even a bypass of both layers above only reaches
   what the database policies allow.

`public.is_admin()` in the RLS migration is the single place to tighten when
public accounts are eventually added.

## API model

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/newsletter` | POST | Public | Email signup |
| `/api/nominations` | POST | Public | Business nomination |
| `/api/leads` | POST | Public | Advertiser enquiry |
| `/api/yelp/search` | POST | Staff | Yelp research search (the only Yelp caller) |
| `/api/admin/rankings` | POST | Staff | Create draft ranking from candidates |

Public endpoints validate with Zod, carry a honeypot field, and insert using the
publishable key so the public-insert RLS policy is what authorises the write —
the secret key is not needed for any public form.

Mutations inside the admin area use **Server Actions** rather than route
handlers (`src/app/admin/*/actions.ts`), because they mutate and revalidate in
one round trip.

## Ranking workflow

```
/admin/generate      Research candidates (Yelp) for a topic and area
      ↓              Editor selects and orders them
POST /api/admin/rankings
      ↓              Creates businesses (draft), records provenance,
                     creates ranking (DRAFT) with entries
/admin/rankings/[id] Editor writes intro, methodology, per-entry reasoning,
                     reorders with keyboard-accessible up/down controls
      ↓
   Publish           status → published, published_at stamped once
      ↓
   /best/[slug]      Public page; RLS now exposes the ranking and its entries
```

Nothing reaches the public site straight from a third-party search. The list is
always created as a draft and published deliberately.

The Yelp integration is one client — `search.ts` + `schema.ts` + `types.ts` —
reached only through `POST /api/yelp/search`, whose sole caller is
`/admin/generate`. Area presets and Nassau/Suffolk county inference live in
`areas.ts`. See docs/yelp-search.md for what was consolidated and why.

## Rendering and caching

- Public pages are statically generated with `generateStaticParams` and revalidate
  hourly (`export const revalidate = 3600`). Editorial content changes on a human
  schedule, not per request.
- Admin pages are `force-dynamic` — an editor must never see a cached queue.
- Server Actions call `revalidatePath()` for both the admin view and the public
  URL they affect, so publishing is visible immediately.

## Editorial integrity in code

The rule that advertising cannot buy a ranking position is enforced structurally,
not just stated:

- Ranking position lives in `ranking_entries.position` and is writable only
  through the admin editor.
- There is no advertiser-facing write path to any editorial table. The leads
  table is inert data.
- `EDITORIAL_INDEPENDENCE_NOTICE` in `src/lib/site.ts` is one constant rendered
  on every ranking page, the footer, `/advertise`, `/about` and `/methodology`,
  so the disclosure cannot drift out of sync between pages.
- No JSON-LD emits an `aggregateRating`. We do not publish a numeric score, and
  we do not restate a third party's as our own.

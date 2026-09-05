# LongIsland.io

A local discovery, rankings and reviews platform for Long Island, New York.

**Discover the best of Long Island.** Rankings, reviews, local finds and hidden
gems across Nassau, Suffolk and beyond.

## Quick start

```bash
npm install
npm run dev
```

http://localhost:3000 — the site runs with **no configuration**. Until Supabase
credentials exist, every page renders from development seed content, so the
build and the design are never blocked on the database.

To connect the database and the admin area, see [docs/setup.md](docs/setup.md).

## Documentation

| Document | Contents |
| --- | --- |
| [docs/setup.md](docs/setup.md) | Install, env vars, Supabase, migrations, deployment |
| [docs/architecture.md](docs/architecture.md) | Stack, structure, data model, auth, API, caching |
| [docs/editorial-workflow.md](docs/editorial-workflow.md) | Idea → published, and the standard at each step |

## What is built

**Public** — homepage, rankings index with filters, ranking detail pages,
category pages (100+), place pages (39 counties, regions and towns), business
profiles, search, nomination form, advertiser form, newsletter signup,
methodology, about, contact, privacy, terms, 404 and error states. Dynamic
metadata, Open Graph, JSON-LD (Article, ItemList, LocalBusiness, Breadcrumb),
sitemap and robots.

**Admin** — password sign-in, protected routes, dashboard, candidate research
against the Yelp Fusion API, ranking creation, a ranking editor with
keyboard-accessible reordering, business CRUD, nomination and lead queues, and a
content pipeline view.

**Database** — schema and row-level security as SQL migrations in
`supabase/migrations/`.

## Editorial policy

> Advertising relationships do not guarantee or determine organic ranking
> positions.

This is enforced structurally, not just stated. Ranking position is writable only
through the admin editor; there is no advertiser-facing write path to any
editorial table; the disclosure is a single constant rendered everywhere it
applies; and no structured data emits a rating, because we do not publish a
numeric score and will not restate a third party's as our own.

Yelp is a research input. Only the business id, source URL and sync timestamp are
persisted. Ratings and review counts are shown to editors while researching and
never appear on the public site.

## Seed data

`src/lib/data/seed/taxonomy.ts` holds real Long Island geography and ordinary
category names — safe to use as your first real rows.

`src/lib/data/seed/businesses.ts` is **entirely fictional**: invented names,
invented addresses, `555-01xx` phone numbers, no websites. It exists so the site
renders during development. Do not load it into production.

## Security

- `SUPABASE_SECRET_KEY` and `YELP_API_KEY` are server-only, never prefixed with
  `NEXT_PUBLIC_`, and read only from modules marked `import "server-only"` — so
  importing one into a Client Component fails the build instead of leaking it.
- RLS is enabled on every table. Anonymous access is limited to published rows
  plus inserts into the three intake tables.
- Admin access is checked in middleware, again in every page and Server Action,
  and finally by RLS.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the build
npm run lint     # eslint
npx tsc --noEmit # type check
```

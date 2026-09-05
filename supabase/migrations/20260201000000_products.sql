-- =============================================================================
-- LongIsland.io — products, affiliate offers and buying guides
--
-- Apply with: supabase db push   (or paste into the SQL editor, in order)
-- RLS policies live in the next migration; this file only creates structure.
--
-- This layer sits ALONGSIDE the local-business layer rather than inside it.
-- A business is a place you go; a product is a thing you buy. The two cross-link
-- editorially (see content_product_recommendations) but neither owns the other,
-- and nothing in this migration alters an existing table.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- product_categories
--   A separate tree from public.categories on purpose. "Coolers" is not a thing
--   you browse on Long Island the way "Pizza" is, and merging the two would put
--   commerce taxonomy into /categories and the local sitemap. Same shape as the
--   local tree, so the same traversal helpers work on both.
-- -----------------------------------------------------------------------------
create table if not exists public.product_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  parent_id   uuid references public.product_categories (id) on delete set null,
  icon        text,
  status      text not null default 'draft'
              check (status in ('draft', 'review', 'published', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists product_categories_parent_id_idx
  on public.product_categories (parent_id);
create index if not exists product_categories_status_idx
  on public.product_categories (status);

create trigger product_categories_set_updated_at
  before update on public.product_categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- products
--   One row per physical thing we might recommend. A product has no public URL
--   of its own: it is rendered inside a guide or a recommendation module. That
--   is deliberate — a page whose only content is a product name and a buy button
--   is a thin affiliate page, and we do not publish those.
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  brand             text,
  category_id       uuid references public.product_categories (id) on delete set null,
  -- What the thing is, factually. Kept separate from editorial_summary so a
  -- spec line can never be mistaken for a judgment we made.
  short_description text,
  editorial_summary text,
  image_url         text,
  status            text not null default 'draft'
                    check (status in ('draft', 'review', 'published', 'archived')),
  featured          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_brand_idx on public.products (brand);

create index if not exists products_search_idx on public.products
  using gin (to_tsvector('english',
    coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(short_description, '')));

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- affiliate_merchants
--   Merchants are data, not a hardcoded union type. product_offers.merchant
--   stores a slug from this table, so adding Walmart or TikTok Shop is a row,
--   not a deploy.
--
--   Nothing secret lives here. An affiliate tag travels in the query string of
--   every outbound link and is visible to anyone who follows one; it is stored
--   for maintainability, not confidentiality. Network API credentials, when
--   price syncing is eventually added, belong in environment variables.
-- -----------------------------------------------------------------------------
create table if not exists public.affiliate_merchants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  network         text not null default 'direct'
                  check (network in ('amazon', 'tiktok_shop', 'walmart', 'target',
                                     'home_depot', 'lowes', 'impact', 'cj',
                                     'shareasale', 'awin', 'rakuten', 'direct')),
  homepage_url    text,
  -- Merchant-neutral call to action. Defaults to "Check Price" in the UI;
  -- override per merchant when a network requires particular wording.
  cta_label       text,
  -- Extra disclosure some networks require adjacent to their links. Rendered in
  -- addition to the site-wide disclosure, never instead of it.
  disclosure_note text,
  status          text not null default 'draft'
                  check (status in ('draft', 'review', 'published', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists affiliate_merchants_status_idx
  on public.affiliate_merchants (status);

create trigger affiliate_merchants_set_updated_at
  before update on public.affiliate_merchants
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- product_offers
--   Where to buy one product, from one merchant. A product may have many.
--
--   affiliate_url and direct_url are stored separately so the honest destination
--   survives even when a tag is rotated or an affiliate programme ends: if
--   affiliate_url is null we link direct_url with no tracking rather than
--   dropping the buying option entirely.
-- -----------------------------------------------------------------------------
create table if not exists public.product_offers (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products (id) on delete cascade,
  -- Slug from public.affiliate_merchants. Text rather than a foreign key so an
  -- offer survives a merchant row being reorganised, and so importing from a
  -- network feed does not require the merchant to exist first.
  merchant            text not null,
  merchant_product_id text,
  affiliate_url       text check (affiliate_url ~* '^https?://'),
  direct_url          text check (direct_url ~* '^https?://'),
  price               numeric(10, 2) check (price >= 0),
  currency            text not null default 'USD',
  availability        text
                      check (availability in ('in_stock', 'out_of_stock',
                                              'preorder', 'discontinued')),
  -- A displayed price is a factual claim with a shelf life. The UI hides a price
  -- that has not been checked recently rather than showing a stale number.
  last_checked_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- An offer with neither URL is not an offer.
  constraint product_offers_has_url check (
    affiliate_url is not null or direct_url is not null
  ),
  -- One merchant lists a given product once.
  unique (product_id, merchant)
);

create index if not exists product_offers_product_id_idx
  on public.product_offers (product_id);
create index if not exists product_offers_merchant_idx
  on public.product_offers (merchant);

create trigger product_offers_set_updated_at
  before update on public.product_offers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- product_rankings — buying guides, published at /products/[slug].
--   Mirrors public.rankings deliberately, so the IDEA → RESEARCH → … → PUBLISHED
--   workflow an editor already knows transfers unchanged to commerce content.
-- -----------------------------------------------------------------------------
create table if not exists public.product_rankings (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  category_id       uuid references public.product_categories (id) on delete set null,
  -- Cross-link back into local content. A beach-gear guide points at the local
  -- "Beaches" category so each side can list the other without a join table.
  local_category_id uuid references public.categories (id) on delete set null,
  description       text,
  intro             text,
  methodology       text,
  status            text not null default 'draft'
                    check (status in ('draft', 'review', 'published', 'archived')),
  author_name       text,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists product_rankings_category_id_idx
  on public.product_rankings (category_id);
create index if not exists product_rankings_local_category_id_idx
  on public.product_rankings (local_category_id);
create index if not exists product_rankings_status_idx
  on public.product_rankings (status);
create index if not exists product_rankings_published_at_idx
  on public.product_rankings (published_at desc);

create trigger product_rankings_set_updated_at
  before update on public.product_rankings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- product_ranking_entries
--   Pros and cons live here rather than on the product, because they are
--   relative to the question the guide is asking. "Heavy" is a con in a guide to
--   packable chairs and a pro in a guide to wind-resistant umbrellas.
-- -----------------------------------------------------------------------------
create table if not exists public.product_ranking_entries (
  id                 uuid primary key default gen_random_uuid(),
  product_ranking_id uuid not null references public.product_rankings (id) on delete cascade,
  product_id         uuid not null references public.products (id) on delete cascade,
  position           integer not null check (position > 0),
  badge              text,
  best_for           text,
  editorial_reason   text,
  pros               jsonb not null default '[]'::jsonb,
  cons               jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Arrays of strings, so the UI can render them without shape-checking.
  constraint product_ranking_entries_pros_is_array
    check (jsonb_typeof(pros) = 'array'),
  constraint product_ranking_entries_cons_is_array
    check (jsonb_typeof(cons) = 'array'),
  -- A product appears at most once per guide.
  unique (product_ranking_id, product_id)
);

create index if not exists product_ranking_entries_ranking_idx
  on public.product_ranking_entries (product_ranking_id, position);
create index if not exists product_ranking_entries_product_idx
  on public.product_ranking_entries (product_id);

create trigger product_ranking_entries_set_updated_at
  before update on public.product_ranking_entries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- content_product_recommendations
--   The embedded "recommended products" module. A row attaches one product to
--   one host page — a local ranking, a place hub, a category hub, a business.
--
--   Addressed by (content_type, content_id) rather than by a column per host
--   type, so a new host surface needs no migration. The trade-off is no foreign
--   key, so a deleted host leaves orphan rows; they are invisible (nothing
--   queries that id any more) and cleaned up by the admin editor.
--
--   This is why no local table is touched by this migration: a ranking does not
--   gain a products column, it gains rows pointing at it.
-- -----------------------------------------------------------------------------
create table if not exists public.content_product_recommendations (
  id             uuid primary key default gen_random_uuid(),
  content_type   text not null
                 check (content_type in ('ranking', 'place', 'category', 'business')),
  content_id     uuid not null,
  product_id     uuid not null references public.products (id) on delete cascade,
  position       integer not null default 1 check (position > 0),
  -- The module heading on this host page, e.g. "Recommended Beach Gear".
  context_label  text,
  -- Why this product belongs next to this content. Rendered with the module, so
  -- the connection is stated rather than implied by proximity.
  editorial_note text,
  created_at     timestamptz not null default now(),
  -- One product recommended once per host page.
  unique (content_type, content_id, product_id)
);

create index if not exists content_product_recommendations_host_idx
  on public.content_product_recommendations (content_type, content_id, position);
create index if not exists content_product_recommendations_product_idx
  on public.content_product_recommendations (product_id);

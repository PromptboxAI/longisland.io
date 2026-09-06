-- =============================================================================
-- Editorial curation layer
--
-- Homepage and category programming is an EDITORIAL decision, not something the
-- frontend derives. Before this, every curated surface sliced the same feed
-- (`rankings.slice(0, n)`), so the lead, the rail and the picks overlapped by
-- construction and nothing could be pinned.
--
-- Two tables:
--   editorial_sections       named, scoped slots ("homepage primary feature")
--   editorial_section_items  what an editor put in a slot, in order
--
-- The content itself is NOT copied here. An item points at a row that already
-- exists (a ranking, business, category, place) or at an external URL, and its
-- presentation columns are nullable OVERRIDES that inherit from the target when
-- left blank. Copying title/dek at insert time would go stale the first time
-- someone edited the underlying record.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- editorial_sections
-- -----------------------------------------------------------------------------
create table if not exists public.editorial_sections (
  id          uuid primary key default gen_random_uuid(),

  -- Stable identifier the data layer asks for, e.g. 'homepage_primary'.
  key         text not null,

  -- A section is global, or attached to one category / place. That is what
  -- lets "related content" exist once per category rather than once per site.
  scope_type  text not null default 'global'
              check (scope_type in ('global', 'category', 'place')),
  category_id uuid references public.categories (id) on delete cascade,
  place_id    uuid references public.places (id) on delete cascade,

  title       text,
  description text,

  -- Presentation hint for whatever component renders the section. The frontend
  -- decides what a layout looks like; the database only records the intent.
  layout      text not null default 'grid'
              check (layout in ('feature', 'rail', 'grid', 'link_row')),

  max_items   integer check (max_items is null or max_items > 0),

  status      text not null default 'draft'
              check (status in ('draft', 'review', 'published', 'archived')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Scope columns must agree with scope_type, so a 'global' section cannot
  -- quietly carry a category_id that nothing reads.
  constraint editorial_sections_scope_consistent check (
    (scope_type = 'global'   and category_id is null and place_id is null) or
    (scope_type = 'category' and category_id is not null and place_id is null) or
    (scope_type = 'place'    and place_id is not null and category_id is null)
  )
);

-- One section per key per scope. NULLs never compare equal in a plain unique
-- constraint, so global sections would be allowed to duplicate — coalesce to a
-- sentinel uuid to close that.
create unique index if not exists editorial_sections_key_scope_idx
  on public.editorial_sections (
    key,
    coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(place_id,    '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists editorial_sections_status_idx
  on public.editorial_sections (status);

create trigger editorial_sections_set_updated_at
  before update on public.editorial_sections
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- editorial_section_items
-- -----------------------------------------------------------------------------
create table if not exists public.editorial_section_items (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references public.editorial_sections (id) on delete cascade,

  -- Editor-controlled order. Not unique: reordering through PostgREST cannot
  -- run a multi-statement swap in one transaction, and a unique constraint
  -- would reject the intermediate state. Determinism comes from the ordering
  -- (position, created_at, id) used everywhere, and the admin renormalises
  -- positions to 1..n after every mutation.
  position     integer not null default 1 check (position > 0),

  -- ---- destination: exactly one of these -----------------------------------
  -- Typed foreign keys rather than a polymorphic (type, id) pair, so a deleted
  -- ranking cannot leave a section pointing at nothing. product_ranking_id is
  -- deliberately absent until the product-affiliate branch lands.
  ranking_id   uuid references public.rankings (id)   on delete cascade,
  business_id  uuid references public.businesses (id) on delete cascade,
  category_id  uuid references public.categories (id) on delete cascade,
  place_id     uuid references public.places (id)     on delete cascade,
  external_url text,

  -- ---- presentation overrides ----------------------------------------------
  -- All nullable. Null means "inherit from the target". Only fill these in to
  -- deliberately say something different from the source record.
  kicker       text,
  headline     text,
  dek          text,
  image_url    text,
  badge        text,

  -- Paid placement. One auditable column, so "was this bought?" is answerable
  -- without reading editorial copy. Drives rel="sponsored" and the disclosure.
  is_sponsored boolean not null default false,

  status       text not null default 'draft'
               check (status in ('draft', 'review', 'published', 'archived')),

  -- Scheduling. Null start means "already live", null end means "no expiry".
  starts_at    timestamptz,
  ends_at      timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint editorial_section_items_one_destination check (
    (case when ranking_id   is not null then 1 else 0 end) +
    (case when business_id  is not null then 1 else 0 end) +
    (case when category_id  is not null then 1 else 0 end) +
    (case when place_id     is not null then 1 else 0 end) +
    (case when external_url is not null then 1 else 0 end) = 1
  ),

  -- An external destination has no record to inherit a headline from.
  constraint editorial_section_items_external_needs_headline check (
    external_url is null or headline is not null
  ),

  constraint editorial_section_items_window_valid check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

create index if not exists editorial_section_items_section_idx
  on public.editorial_section_items (section_id, position);
create index if not exists editorial_section_items_status_idx
  on public.editorial_section_items (status);
create index if not exists editorial_section_items_schedule_idx
  on public.editorial_section_items (starts_at, ends_at);

create trigger editorial_section_items_set_updated_at
  before update on public.editorial_section_items
  for each row execute function public.set_updated_at();

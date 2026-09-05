-- =============================================================================
-- LongIsland.io — initial schema
--
-- Apply with: supabase db push   (or paste into the SQL editor in order)
-- RLS policies live in the next migration; this file only creates structure.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Keeps updated_at honest without relying on the application to remember.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  parent_id     uuid references public.categories (id) on delete set null,
  icon          text,
  hero_image_url text,
  status        text not null default 'draft'
                check (status in ('draft', 'review', 'published', 'archived')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists categories_status_idx on public.categories (status);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- places
-- -----------------------------------------------------------------------------
create table if not exists public.places (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  type          text not null default 'town'
                check (type in ('island', 'county', 'region', 'town', 'village', 'hamlet')),
  parent_id     uuid references public.places (id) on delete set null,
  county        text,
  description   text,
  hero_image_url text,
  status        text not null default 'draft'
                check (status in ('draft', 'review', 'published', 'archived')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists places_parent_id_idx on public.places (parent_id);
create index if not exists places_status_idx on public.places (status);
create index if not exists places_type_idx on public.places (type);

create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- businesses
-- -----------------------------------------------------------------------------
create table if not exists public.businesses (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  address           text,
  city              text,
  county            text,
  zip               text,
  latitude          numeric(9, 6),
  longitude         numeric(9, 6),
  phone             text,
  website           text,
  category_id       uuid references public.categories (id) on delete set null,
  subcategory       text,
  description       text,
  editorial_summary text,
  status            text not null default 'draft'
                    check (status in ('draft', 'review', 'published', 'archived')),
  featured          boolean not null default false,
  claimed           boolean not null default false,
  primary_image_url text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists businesses_category_id_idx on public.businesses (category_id);
create index if not exists businesses_status_idx on public.businesses (status);
create index if not exists businesses_city_idx on public.businesses (city);
create index if not exists businesses_county_idx on public.businesses (county);

-- Powers site search over name and description.
create index if not exists businesses_search_idx on public.businesses
  using gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- external_business_refs
--   Third-party identifiers (Yelp, etc.) kept as research provenance only.
-- -----------------------------------------------------------------------------
create table if not exists public.external_business_refs (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  provider       text not null,
  external_id    text not null,
  external_url   text,
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  unique (provider, external_id)
);

create index if not exists external_refs_business_id_idx
  on public.external_business_refs (business_id);

-- -----------------------------------------------------------------------------
-- rankings
-- -----------------------------------------------------------------------------
create table if not exists public.rankings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  category_id  uuid references public.categories (id) on delete set null,
  place_id     uuid references public.places (id) on delete set null,
  geography    text,
  description  text,
  intro        text,
  methodology  text,
  status       text not null default 'draft'
               check (status in ('draft', 'review', 'published', 'archived')),
  author_name  text,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists rankings_category_id_idx on public.rankings (category_id);
create index if not exists rankings_place_id_idx on public.rankings (place_id);
create index if not exists rankings_status_idx on public.rankings (status);
create index if not exists rankings_published_at_idx on public.rankings (published_at desc);

create trigger rankings_set_updated_at
  before update on public.rankings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- ranking_entries
-- -----------------------------------------------------------------------------
create table if not exists public.ranking_entries (
  id               uuid primary key default gen_random_uuid(),
  ranking_id       uuid not null references public.rankings (id) on delete cascade,
  business_id      uuid not null references public.businesses (id) on delete cascade,
  position         integer not null check (position > 0),
  editorial_reason text,
  best_for         text,
  badge            text,
  editor_notes     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- A business appears at most once per list.
  unique (ranking_id, business_id)
);

create index if not exists ranking_entries_ranking_id_idx
  on public.ranking_entries (ranking_id, position);
create index if not exists ranking_entries_business_id_idx
  on public.ranking_entries (business_id);

create trigger ranking_entries_set_updated_at
  before update on public.ranking_entries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- nominations
-- -----------------------------------------------------------------------------
create table if not exists public.nominations (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null,
  town           text,
  category       text,
  website        text,
  reason         text,
  submitter_name text,
  email          text,
  status         text not null default 'new'
                 check (status in ('new', 'reviewing', 'approved', 'rejected')),
  created_at     timestamptz not null default now()
);

create index if not exists nominations_status_idx on public.nominations (status, created_at desc);

-- -----------------------------------------------------------------------------
-- leads
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  type          text not null default 'advertiser',
  name          text,
  business_name text,
  email         text,
  phone         text,
  website       text,
  category      text,
  interest      text,
  budget        text,
  message       text,
  status        text not null default 'new'
                check (status in ('new', 'contacted', 'qualified', 'closed', 'archived')),
  created_at    timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status, created_at desc);

-- -----------------------------------------------------------------------------
-- content_items
-- -----------------------------------------------------------------------------
create table if not exists public.content_items (
  id           uuid primary key default gen_random_uuid(),
  ranking_id   uuid references public.rankings (id) on delete set null,
  platform     text,
  content_type text,
  script       text,
  caption      text,
  video_url    text,
  status       text not null default 'idea'
               check (status in ('idea', 'script', 'media', 'ready', 'published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists content_items_status_idx on public.content_items (status);
create index if not exists content_items_ranking_id_idx on public.content_items (ranking_id);

create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- email_subscribers
-- -----------------------------------------------------------------------------
create table if not exists public.email_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  source     text,
  created_at timestamptz not null default now()
);

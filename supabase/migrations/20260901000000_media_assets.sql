-- =============================================================================
-- Media library
--
-- One row per uploaded file, referenced by every content type rather than
-- copied into it. The deciding case is a business photo that belongs on the
-- business profile, in three rankings and possibly a homepage override: without
-- a library that is four uploads, four URLs, and no way to correct them all at
-- once.
--
-- Rights travel with the asset, not with the record that happens to use it. A
-- business-provided photo carries permission that ends when the relationship
-- does, and a licensed image carries terms we must be able to produce later.
-- Recording that at upload costs one field; reconstructing it a year on is
-- impossible.
-- =============================================================================

create table if not exists public.media_assets (
  id            uuid primary key default gen_random_uuid(),

  -- Path inside the `media` storage bucket. Unique so the same object cannot be
  -- registered twice under two rows.
  storage_path  text not null unique,
  filename      text not null,
  mime_type     text not null,

  -- Recorded at upload so layouts can reserve space before the image loads.
  width         integer check (width  is null or width  > 0),
  height        integer check (height is null or height > 0),
  size_bytes    bigint  check (size_bytes is null or size_bytes >= 0),

  alt_text      text,
  caption       text,

  -- Provenance. `source` is a closed set because the answer determines what we
  -- are allowed to do with the file, and free text cannot be audited.
  source        text check (source in (
                  'own', 'business_provided', 'licensed',
                  'creator', 'manufacturer', 'other')),
  credit        text,
  source_url    text check (source_url is null or source_url ~* '^https?://'),
  license       text,
  permission_note text,

  -- Focal point as a 0-1 fraction of the frame, mapped to object-position.
  -- The same photo is cropped to 16:9, 16:10, 4:3 and 1:1 across the cards, and
  -- this is the one thing next/image cannot work out for itself.
  focal_x       numeric(4,3) not null default 0.5 check (focal_x between 0 and 1),
  focal_y       numeric(4,3) not null default 0.5 check (focal_y between 0 and 1),

  -- Library housekeeping, NOT a privacy control: the storage bucket is public,
  -- so hiding a row would break published pages without hiding the file.
  -- Archived assets are simply kept out of the picker.
  status        text not null default 'active'
                check (status in ('active', 'archived')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null
);

create index if not exists media_assets_status_idx    on public.media_assets (status);
create index if not exists media_assets_created_at_idx on public.media_assets (created_at desc);
create index if not exists media_assets_search_idx on public.media_assets
  using gin (to_tsvector('english',
    coalesce(filename, '') || ' ' || coalesce(alt_text, '') || ' ' || coalesce(caption, '')));

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
--
-- Public read is unconditional here, unlike every content table. The file it
-- points at is served from a public bucket, so withholding the row would only
-- break the pages that legitimately reference it while the image itself stayed
-- reachable. Writes stay admin-only, which is the boundary that matters.
-- -----------------------------------------------------------------------------
alter table public.media_assets enable row level security;

drop policy if exists media_assets_public_read on public.media_assets;
create policy media_assets_public_read
  on public.media_assets for select
  to anon, authenticated
  using (true);

drop policy if exists media_assets_admin_all on public.media_assets;
create policy media_assets_admin_all
  on public.media_assets for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

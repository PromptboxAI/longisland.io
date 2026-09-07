-- =============================================================================
-- Hero media on every content type
--
-- Two columns per surface, not one:
--
--   hero_media_id   a row in media_assets — the normal authoring path, and the
--                   only one that carries alt text, credit and focal point
--   hero_image_url  a pasted URL — the fallback, kept because some images will
--                   always come from somewhere we do not host
--
-- Resolution order is fixed and lives in one helper: the media asset wins, the
-- URL fills in, and a missing image falls through to the generated gradient.
-- Adding the media column alongside the existing URL columns means no data has
-- to be migrated and nothing that renders today changes.
--
-- rankings and product_rankings had NO image column of any kind, which is why
-- their cards have always rendered a placeholder frame.
-- =============================================================================

-- Local rankings: neither column existed.
alter table public.rankings
  add column if not exists hero_media_id uuid references public.media_assets (id) on delete set null,
  add column if not exists hero_image_url text;

-- Buying guides: neither column existed either, which is why ProductGuideCard
-- passes a literal null for its image source.
alter table public.product_rankings
  add column if not exists hero_media_id uuid references public.media_assets (id) on delete set null,
  add column if not exists hero_image_url text;

-- Articles get theirs in their own migration, with the table.

-- These four already have a URL column; they gain the library reference only.
alter table public.businesses
  add column if not exists primary_media_id uuid references public.media_assets (id) on delete set null;

alter table public.categories
  add column if not exists hero_media_id uuid references public.media_assets (id) on delete set null;

alter table public.places
  add column if not exists hero_media_id uuid references public.media_assets (id) on delete set null;

alter table public.products
  add column if not exists image_media_id uuid references public.media_assets (id) on delete set null;

-- The editorial override image, so a curated item can carry its own art without
-- changing the record it points at.
alter table public.editorial_section_items
  add column if not exists image_media_id uuid references public.media_assets (id) on delete set null;

create index if not exists rankings_hero_media_idx          on public.rankings (hero_media_id);
create index if not exists product_rankings_hero_media_idx  on public.product_rankings (hero_media_id);
create index if not exists businesses_primary_media_idx     on public.businesses (primary_media_id);
create index if not exists categories_hero_media_idx        on public.categories (hero_media_id);
create index if not exists places_hero_media_idx            on public.places (hero_media_id);
create index if not exists products_image_media_idx         on public.products (image_media_id);
create index if not exists editorial_items_image_media_idx  on public.editorial_section_items (image_media_id);

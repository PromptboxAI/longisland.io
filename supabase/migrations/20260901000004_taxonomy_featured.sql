-- =============================================================================
-- Featured + ordering on the taxonomies
--
-- These two columns are what let the homepage stop naming slugs in code.
-- REGION_SLUGS, CATEGORY_SECTIONS, CROSS_LINK_PLACES and PLACE_SECTIONS are
-- four hardcoded arrays that between them decide which areas and which
-- categories a reader is offered, and today adding a town or a category does
-- not make it appear anywhere.
--
-- This is taxonomy-driven rather than editor-curated on purpose. Which regions
-- exist is a fact about the taxonomy, not an editorial judgment made weekly, so
-- a flag and a sort order on the row is the honest model — editorial_sections
-- would be the wrong tool and would need re-curating every time a town is
-- added.
--
-- Retiring those arrays in the public code is Phase B; the columns land now so
-- the admin screens built in this pass can already set them.
-- =============================================================================

alter table public.categories
  add column if not exists featured boolean not null default false,
  add column if not exists sort_order integer not null default 0;

alter table public.places
  add column if not exists featured boolean not null default false,
  add column if not exists sort_order integer not null default 0;

-- Partial indexes: the only query that uses these asks for featured rows in
-- order, so indexing the unfeatured majority would be wasted.
create index if not exists categories_featured_idx on public.categories (sort_order, name)
  where featured;
create index if not exists places_featured_idx on public.places (sort_order, name)
  where featured;

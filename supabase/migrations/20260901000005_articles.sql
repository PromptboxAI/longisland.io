-- =============================================================================
-- Articles — the generic editorial content type
--
-- A fall weekend guide is not a ranking and not a social post. Until now it had
-- nowhere honest to live, which is why homepage_primary still required a
-- ranking.
--
-- One table with a `kind` column, not seven tables. The kinds differ in how they
-- are labelled and filtered, not in what they contain: every one of them is a
-- headline, a standfirst, a body and a picture. A separate table per kind would
-- buy nothing and cost a join in every listing.
--
-- Shaped deliberately to rhyme with `rankings` — same status vocabulary, same
-- published_at, same optional category and place — so listings, the sitemap,
-- cards and the editorial resolver generalise instead of forking.
--
-- Body is markdown, rendered through a sanitiser. Sanitising matters even with
-- trusted staff authors: it is the difference between a mistake being a broken
-- paragraph and a mistake being script execution on our own domain.
-- =============================================================================

create table if not exists public.articles (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,

  -- Presentation and filtering, not structure.
  kind            text not null default 'article'
                  check (kind in ('article', 'guide', 'feature',
                                  'seasonal', 'news', 'deal', 'roundup')),

  category_id     uuid references public.categories (id) on delete set null,
  place_id        uuid references public.places (id) on delete set null,

  -- Standfirst. Named `dek` to match what editorial_section_items already calls
  -- the same idea, so the inheritance in resolveItem() reads as one concept.
  dek             text,
  body            text,

  hero_media_id   uuid references public.media_assets (id) on delete set null,
  hero_image_url  text,

  -- Alt text normally travels with the media asset. This is the override for a
  -- hero used in a context where the generic description is not the right one.
  hero_image_alt  text,

  -- Free text for now. An authors table is Phase B, and a text column is what
  -- it will read from during that transition.
  author_name     text,

  seo_title       text,
  seo_description text,
  og_image_media_id uuid references public.media_assets (id) on delete set null,

  status          text not null default 'draft'
                  check (status in ('draft', 'review', 'published', 'archived')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists articles_status_idx       on public.articles (status);
create index if not exists articles_kind_idx         on public.articles (kind);
create index if not exists articles_category_id_idx  on public.articles (category_id);
create index if not exists articles_place_id_idx     on public.articles (place_id);
create index if not exists articles_published_at_idx on public.articles (published_at desc nulls last);
create index if not exists articles_hero_media_idx   on public.articles (hero_media_id);

create index if not exists articles_search_idx on public.articles
  using gin (to_tsvector('english',
    coalesce(title, '') || ' ' || coalesce(dek, '')));

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Per-record SEO
--
-- Two fields on every content type an editor publishes, edited inside that
-- record's own form. There is deliberately no SEO admin page: SEO belongs next
-- to the thing it describes, and a separate screen guarantees it is filled in
-- last, by someone who has forgotten what the page says.
--
-- Both are overrides. Empty means "derive from the title and description", so
-- nothing has to be backfilled and a record left alone behaves exactly as it
-- does today.
--
-- No canonical_url column. Every page here has exactly one home and Next
-- already emits the right canonical; a hand-editable override is a foot-gun
-- that silently de-indexes a page when it is set wrong. Add it if a real
-- syndication case turns up.
-- =============================================================================

alter table public.rankings
  add column if not exists seo_title text,
  add column if not exists seo_description text;

alter table public.product_rankings
  add column if not exists seo_title text,
  add column if not exists seo_description text;

alter table public.businesses
  add column if not exists seo_title text,
  add column if not exists seo_description text;

alter table public.categories
  add column if not exists seo_title text,
  add column if not exists seo_description text;

alter table public.places
  add column if not exists seo_title text,
  add column if not exists seo_description text;

-- Articles get theirs with the table.

-- -----------------------------------------------------------------------------
-- Social image override
--
-- Only on the three types that are actually shared as stories. Categories,
-- places and businesses fall back to their hero, which is the right image for
-- them anyway — an override there would be a field nobody ever fills in.
--
-- Generated OG images are Phase B; until then this is how a share gets art.
-- -----------------------------------------------------------------------------
alter table public.rankings
  add column if not exists og_image_media_id uuid references public.media_assets (id) on delete set null;

alter table public.product_rankings
  add column if not exists og_image_media_id uuid references public.media_assets (id) on delete set null;

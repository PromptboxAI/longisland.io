-- =============================================================================
-- Editorial curation: an individual PRODUCT as a target
--
-- A product_ranking is a buying guide — an article ABOUT products. A product is
-- the thing itself. Conflating them is what put a "Check Price" button on an
-- article, so they are separate destinations with separate presentation:
-- editorial targets link through their image and headline and carry no CTA,
-- while a product target renders the commerce card with a merchant offer.
--
-- This is the seventh arm. The pattern is unchanged from the product_ranking
-- migration: a typed foreign key with cascade, counted by the one-destination
-- CHECK, gated by the RLS target-publication guard.
--
-- Note what this migration deliberately does NOT do. It cannot guarantee that a
-- curated product has a buyable offer — RLS can see products.status, not the
-- state of a merchant's stock. A product whose offers are all unusable is
-- therefore visible to the query and skipped by the renderer, and flagged to the
-- editor in /admin/editorial. The alternative, a policy that joined offers and
-- re-evaluated freshness in SQL, would silently drop an editor's selection with
-- nothing anywhere to explain why.
-- =============================================================================

alter table public.editorial_section_items
  add column if not exists product_id uuid
    references public.products (id) on delete cascade;

-- Rebuild the one-destination CHECK to count the new column. A constraint
-- cannot be altered in place, so it is dropped and recreated; the table is
-- small and this runs inside the migration's transaction.
alter table public.editorial_section_items
  drop constraint if exists editorial_section_items_one_destination;

alter table public.editorial_section_items
  add constraint editorial_section_items_one_destination check (
    (case when ranking_id         is not null then 1 else 0 end) +
    (case when business_id        is not null then 1 else 0 end) +
    (case when category_id        is not null then 1 else 0 end) +
    (case when place_id           is not null then 1 else 0 end) +
    (case when product_ranking_id is not null then 1 else 0 end) +
    (case when product_id         is not null then 1 else 0 end) +
    (case when external_url       is not null then 1 else 0 end) = 1
  );

create index if not exists editorial_section_items_product_idx
  on public.editorial_section_items (product_id);

-- -----------------------------------------------------------------------------
-- RLS: the target-publication guard gains a products arm.
--
-- Recreated in full rather than patched, so the whole condition stays readable
-- in one place. Behaviour for the existing six arms is unchanged.
-- -----------------------------------------------------------------------------
drop policy if exists editorial_section_items_public_read on public.editorial_section_items;
create policy editorial_section_items_public_read
  on public.editorial_section_items for select
  to anon, authenticated
  using (
    status = 'published'

    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())

    and exists (
      select 1
      from public.editorial_sections s
      where s.id = editorial_section_items.section_id
        and s.status = 'published'
    )

    and (
      (ranking_id is not null and exists (
        select 1 from public.rankings r
        where r.id = editorial_section_items.ranking_id and r.status = 'published'))
      or
      (business_id is not null and exists (
        select 1 from public.businesses b
        where b.id = editorial_section_items.business_id and b.status = 'published'))
      or
      (category_id is not null and exists (
        select 1 from public.categories c
        where c.id = editorial_section_items.category_id and c.status = 'published'))
      or
      (place_id is not null and exists (
        select 1 from public.places p
        where p.id = editorial_section_items.place_id and p.status = 'published'))
      or
      (product_ranking_id is not null and exists (
        select 1 from public.product_rankings pr
        where pr.id = editorial_section_items.product_ranking_id
          and pr.status = 'published'))
      or
      (product_id is not null and exists (
        select 1 from public.products p
        where p.id = editorial_section_items.product_id
          and p.status = 'published'))
      or
      (external_url is not null)
    )
  );

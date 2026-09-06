-- =============================================================================
-- Editorial curation: product guides as a target
--
-- editorial_section_items could point at a ranking, business, category, place
-- or external URL. product_rankings did not exist in main when that table was
-- created, so the column was deliberately left out rather than referencing a
-- table that was not there yet.
--
-- This adds the sixth arm. The pattern is unchanged: a typed foreign key with
-- cascade, counted by the one-destination CHECK, and gated by the RLS
-- target-publication guard so featuring a draft guide cannot leak it.
-- =============================================================================

alter table public.editorial_section_items
  add column if not exists product_ranking_id uuid
    references public.product_rankings (id) on delete cascade;

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
    (case when external_url       is not null then 1 else 0 end) = 1
  );

create index if not exists editorial_section_items_product_ranking_idx
  on public.editorial_section_items (product_ranking_id);

-- -----------------------------------------------------------------------------
-- RLS: the target-publication guard gains a product_rankings arm.
--
-- Recreated in full rather than patched, so the whole condition stays readable
-- in one place. Behaviour for the existing five arms is unchanged.
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
      (external_url is not null)
    )
  );

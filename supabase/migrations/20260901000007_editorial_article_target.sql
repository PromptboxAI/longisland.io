-- =============================================================================
-- Editorial curation: an ARTICLE as a target
--
-- The eighth and, for now, final destination. With this the homepage feature no
-- longer requires a ranking: an editor can put a seasonal guide, a weekend
-- feature or a news piece in homepage_primary, Latest, Trending or related
-- content, and it renders as the editorial page it is.
--
-- The pattern is unchanged from the six migrations before it: a typed foreign
-- key with cascade, counted by the one-destination CHECK, gated by the RLS
-- target-publication guard so featuring a draft cannot leak it.
--
-- The CHECK is rebuilt in full for the third time. A constraint cannot be
-- altered in place, and listing all eight arms in one statement is the only way
-- to be sure none was dropped along the way.
-- =============================================================================

alter table public.editorial_section_items
  add column if not exists article_id uuid
    references public.articles (id) on delete cascade;

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
    (case when article_id         is not null then 1 else 0 end) +
    (case when external_url       is not null then 1 else 0 end) = 1
  );

create index if not exists editorial_section_items_article_idx
  on public.editorial_section_items (article_id);

-- -----------------------------------------------------------------------------
-- RLS: the target-publication guard gains an articles arm.
--
-- Recreated in full rather than patched, so the whole condition stays readable
-- in one place. Behaviour for the existing seven arms is unchanged.
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
      (article_id is not null and exists (
        select 1 from public.articles a
        where a.id = editorial_section_items.article_id
          and a.status = 'published'))
      or
      (external_url is not null)
    )
  );

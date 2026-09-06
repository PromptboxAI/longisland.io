-- =============================================================================
-- Editorial curation layer — Row Level Security
--
-- A public reader may see an item only when EVERY one of these holds:
--
--   1. the parent section is published
--   2. the item itself is published
--   3. the schedule window is open right now
--   4. the TARGET the item points at is published
--
-- (4) is the one that is easy to forget and the most damaging to miss: without
-- it, featuring a draft ranking on the homepage would publish that ranking's
-- existence and title, defeating the draft isolation the rankings policies
-- already enforce. It mirrors the ranking_entries policy, which gates on the
-- parent ranking's status for the same reason.
-- =============================================================================

alter table public.editorial_sections      enable row level security;
alter table public.editorial_section_items enable row level security;

-- -----------------------------------------------------------------------------
-- editorial_sections
-- -----------------------------------------------------------------------------
drop policy if exists editorial_sections_public_read on public.editorial_sections;
create policy editorial_sections_public_read
  on public.editorial_sections for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists editorial_sections_admin_all on public.editorial_sections;
create policy editorial_sections_admin_all
  on public.editorial_sections for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- editorial_section_items
-- -----------------------------------------------------------------------------
drop policy if exists editorial_section_items_public_read on public.editorial_section_items;
create policy editorial_section_items_public_read
  on public.editorial_section_items for select
  to anon, authenticated
  using (
    status = 'published'

    -- Schedule window. Null start = already live; null end = no expiry.
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())

    -- Parent section must itself be published.
    and exists (
      select 1
      from public.editorial_sections s
      where s.id = editorial_section_items.section_id
        and s.status = 'published'
    )

    -- Target must be published. Exactly one destination column is non-null
    -- (enforced by check constraint), so exactly one arm applies. An external
    -- URL has no row to gate on and is allowed through.
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
      (external_url is not null)
    )
  );

drop policy if exists editorial_section_items_admin_all on public.editorial_section_items;
create policy editorial_section_items_admin_all
  on public.editorial_section_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

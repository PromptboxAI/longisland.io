-- =============================================================================
-- LongIsland.io — Row Level Security
--
-- Model:
--   * Anonymous visitors read only rows with status = 'published'.
--   * Anonymous visitors may INSERT into the three public intake tables
--     (nominations, leads, email_subscribers) and may not read them back.
--   * Authenticated users are staff and have full access.
--
-- There are no public user accounts, so "authenticated" currently means "staff".
-- public.is_admin() is the single place to tighten that when public accounts
-- are introduced — swap its body for a membership or JWT-claim check and every
-- policy below inherits the change.
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
alter table public.categories             enable row level security;
alter table public.places                 enable row level security;
alter table public.businesses             enable row level security;
alter table public.rankings               enable row level security;
alter table public.ranking_entries        enable row level security;
alter table public.external_business_refs enable row level security;
alter table public.nominations            enable row level security;
alter table public.leads                  enable row level security;
alter table public.content_items          enable row level security;
alter table public.email_subscribers      enable row level security;

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read
  on public.categories for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- places
-- -----------------------------------------------------------------------------
drop policy if exists places_public_read on public.places;
create policy places_public_read
  on public.places for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists places_admin_all on public.places;
create policy places_admin_all
  on public.places for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- businesses
-- -----------------------------------------------------------------------------
drop policy if exists businesses_public_read on public.businesses;
create policy businesses_public_read
  on public.businesses for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists businesses_admin_all on public.businesses;
create policy businesses_admin_all
  on public.businesses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- rankings
-- -----------------------------------------------------------------------------
drop policy if exists rankings_public_read on public.rankings;
create policy rankings_public_read
  on public.rankings for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists rankings_admin_all on public.rankings;
create policy rankings_admin_all
  on public.rankings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- ranking_entries
--   Visible only when the PARENT ranking is published, so a draft list cannot
--   leak its contents through this table.
-- -----------------------------------------------------------------------------
drop policy if exists ranking_entries_public_read on public.ranking_entries;
create policy ranking_entries_public_read
  on public.ranking_entries for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.rankings r
      where r.id = ranking_entries.ranking_id
        and r.status = 'published'
    )
  );

drop policy if exists ranking_entries_admin_all on public.ranking_entries;
create policy ranking_entries_admin_all
  on public.ranking_entries for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- external_business_refs — staff only, no public read at all.
-- -----------------------------------------------------------------------------
drop policy if exists external_refs_admin_all on public.external_business_refs;
create policy external_refs_admin_all
  on public.external_business_refs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- nominations — anyone may submit; only staff may read or update.
-- -----------------------------------------------------------------------------
drop policy if exists nominations_public_insert on public.nominations;
create policy nominations_public_insert
  on public.nominations for insert
  to anon, authenticated
  with check (status = 'new');

drop policy if exists nominations_admin_read on public.nominations;
create policy nominations_admin_read
  on public.nominations for select
  to authenticated
  using (public.is_admin());

drop policy if exists nominations_admin_write on public.nominations;
create policy nominations_admin_write
  on public.nominations for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists nominations_admin_delete on public.nominations;
create policy nominations_admin_delete
  on public.nominations for delete
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- leads — same shape as nominations.
-- -----------------------------------------------------------------------------
drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert
  on public.leads for insert
  to anon, authenticated
  with check (status = 'new');

drop policy if exists leads_admin_read on public.leads;
create policy leads_admin_read
  on public.leads for select
  to authenticated
  using (public.is_admin());

drop policy if exists leads_admin_write on public.leads;
create policy leads_admin_write
  on public.leads for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists leads_admin_delete on public.leads;
create policy leads_admin_delete
  on public.leads for delete
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- content_items — staff only.
-- -----------------------------------------------------------------------------
drop policy if exists content_items_admin_all on public.content_items;
create policy content_items_admin_all
  on public.content_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- email_subscribers — public insert, staff read. No public select, so the
-- subscriber list cannot be enumerated.
-- -----------------------------------------------------------------------------
drop policy if exists email_subscribers_public_insert on public.email_subscribers;
create policy email_subscribers_public_insert
  on public.email_subscribers for insert
  to anon, authenticated
  with check (true);

drop policy if exists email_subscribers_admin_read on public.email_subscribers;
create policy email_subscribers_admin_read
  on public.email_subscribers for select
  to authenticated
  using (public.is_admin());

drop policy if exists email_subscribers_admin_delete on public.email_subscribers;
create policy email_subscribers_admin_delete
  on public.email_subscribers for delete
  to authenticated
  using (public.is_admin());

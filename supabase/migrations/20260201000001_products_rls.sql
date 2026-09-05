-- =============================================================================
-- LongIsland.io — Row Level Security for the product and affiliate layer
--
-- Same model as the local layer: anonymous visitors read published rows only,
-- authenticated users are staff. public.is_admin() is reused unchanged, so
-- tightening it later tightens these policies too.
--
-- Tables without a status column of their own (product_offers,
-- content_product_recommendations) inherit visibility from their product. An
-- unpublished product therefore leaks neither its offers nor its placements,
-- which is the same containment ranking_entries has under its parent ranking.
-- =============================================================================

alter table public.product_categories               enable row level security;
alter table public.products                         enable row level security;
alter table public.affiliate_merchants              enable row level security;
alter table public.product_offers                   enable row level security;
alter table public.product_rankings                 enable row level security;
alter table public.product_ranking_entries          enable row level security;
alter table public.content_product_recommendations  enable row level security;

-- -----------------------------------------------------------------------------
-- product_categories
-- -----------------------------------------------------------------------------
drop policy if exists product_categories_public_read on public.product_categories;
create policy product_categories_public_read
  on public.product_categories for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists product_categories_admin_all on public.product_categories;
create policy product_categories_admin_all
  on public.product_categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
drop policy if exists products_public_read on public.products;
create policy products_public_read
  on public.products for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists products_admin_all on public.products;
create policy products_admin_all
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- affiliate_merchants
--   Readable when published: the public UI needs the merchant's display name
--   and CTA label to label a button honestly ("Check price at Walmart").
-- -----------------------------------------------------------------------------
drop policy if exists affiliate_merchants_public_read on public.affiliate_merchants;
create policy affiliate_merchants_public_read
  on public.affiliate_merchants for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists affiliate_merchants_admin_all on public.affiliate_merchants;
create policy affiliate_merchants_admin_all
  on public.affiliate_merchants for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- product_offers — visible only when the parent product is published.
-- -----------------------------------------------------------------------------
drop policy if exists product_offers_public_read on public.product_offers;
create policy product_offers_public_read
  on public.product_offers for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_offers.product_id
        and p.status = 'published'
    )
  );

drop policy if exists product_offers_admin_all on public.product_offers;
create policy product_offers_admin_all
  on public.product_offers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- product_rankings
-- -----------------------------------------------------------------------------
drop policy if exists product_rankings_public_read on public.product_rankings;
create policy product_rankings_public_read
  on public.product_rankings for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists product_rankings_admin_all on public.product_rankings;
create policy product_rankings_admin_all
  on public.product_rankings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- product_ranking_entries
--   Visible only when the PARENT guide is published, so a draft guide cannot
--   leak its running order through this table.
-- -----------------------------------------------------------------------------
drop policy if exists product_ranking_entries_public_read on public.product_ranking_entries;
create policy product_ranking_entries_public_read
  on public.product_ranking_entries for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.product_rankings pr
      where pr.id = product_ranking_entries.product_ranking_id
        and pr.status = 'published'
    )
  );

drop policy if exists product_ranking_entries_admin_all on public.product_ranking_entries;
create policy product_ranking_entries_admin_all
  on public.product_ranking_entries for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- content_product_recommendations
--   Visible when the recommended product is published. The host page's own
--   visibility is already enforced by the host's policies — you only ever query
--   placements for a page you were allowed to render.
-- -----------------------------------------------------------------------------
drop policy if exists content_product_recommendations_public_read
  on public.content_product_recommendations;
create policy content_product_recommendations_public_read
  on public.content_product_recommendations for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = content_product_recommendations.product_id
        and p.status = 'published'
    )
  );

drop policy if exists content_product_recommendations_admin_all
  on public.content_product_recommendations;
create policy content_product_recommendations_admin_all
  on public.content_product_recommendations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

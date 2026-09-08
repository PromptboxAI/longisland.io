-- Outbound affiliate clicks.
--
-- One row per reader following a buy-link off the site. It answers "which
-- products earn clicks, from where" and nothing else — this measures CLICKS,
-- not purchases. No affiliate programme reports conversions back to us;
-- Amazon's are visible only in the Associates dashboard. Nothing built on this
-- table may imply revenue.
--
-- WHY NOTHING CASCADES
--
-- The obvious wiring — cascade from products and offers — quietly destroys the
-- record every time somebody tidies up. Delete a discontinued product and last
-- quarter's clicks vanish with it, so the reporting silently rewrites history
-- and the numbers stop reconciling with anything.
--
-- A click is a fact about a moment: someone followed this link, from this page,
-- on this date. That fact does not stop being true when the product is removed.
-- So the foreign keys are nullable and SET NULL, and everything needed to read
-- the row stands on its own copy.
--
-- WHAT IS DELIBERATELY NOT HERE
--
-- No IP address, no user agent, no cookie, no session, no identifier of any
-- kind. Not an oversight and not a shortcut: none of it is needed to answer the
-- question, and collecting it would drag this into consent-banner territory for
-- no gain. The table cannot identify a person because it never holds anything
-- that could.

create table if not exists public.affiliate_clicks (
  id            uuid primary key default gen_random_uuid(),

  -- Live links, for joining while the content still exists. Both nullable:
  -- see above.
  offer_id      uuid references public.product_offers (id) on delete set null,
  product_id    uuid references public.products (id)       on delete set null,

  -- The denormalised copy. This is what the report actually reads, so a row
  -- stays legible after the product, the offer or both are gone.
  product_name  text not null,
  merchant      text not null,
  -- 'affiliate' when the link was monetised, 'direct' when it was the
  -- merchant's plain URL. Kept because the mix matters and an offer can gain
  -- or lose its tag later.
  link_type     text not null default 'affiliate'
                check (link_type in ('affiliate', 'direct')),

  -- Where the click came from.
  source_path   text,
  -- Which surface: an editorial placement key like 'homepage_top_picks', or
  -- 'product_guide', 'product_detail', 'article'. Free text on purpose — a new
  -- surface must not need a migration before it can be measured.
  placement     text,

  clicked_at    timestamptz not null default now()
);

comment on table public.affiliate_clicks is
  'Outbound affiliate link clicks. Clicks only — never purchases or revenue. '
  'Survives deletion of the product or offer by design.';

create index if not exists affiliate_clicks_clicked_at_idx
  on public.affiliate_clicks (clicked_at desc);
create index if not exists affiliate_clicks_product_idx
  on public.affiliate_clicks (product_id, clicked_at desc);
create index if not exists affiliate_clicks_offer_idx
  on public.affiliate_clicks (offer_id);
create index if not exists affiliate_clicks_placement_idx
  on public.affiliate_clicks (placement);

alter table public.affiliate_clicks enable row level security;

-- Anyone may RECORD a click. The click happens before anyone signs in, and the
-- redirect must work for a reader who never will.
drop policy if exists affiliate_clicks_public_insert on public.affiliate_clicks;
create policy affiliate_clicks_public_insert
  on public.affiliate_clicks for insert
  to anon, authenticated
  with check (true);

-- Only admins may READ it. Insert-only for the public: a visitor can add to the
-- click stream and can never see it, which is the correct asymmetry for
-- something that is nobody's business but ours.
drop policy if exists affiliate_clicks_admin_read on public.affiliate_clicks;
create policy affiliate_clicks_admin_read
  on public.affiliate_clicks for select
  to authenticated
  using (public.is_admin());

-- No update or delete policy at all. A click is a record of something that
-- happened; there is no correct way to edit one.

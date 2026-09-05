-- =============================================================================
-- LongIsland.io — merchant button branding
--
-- Buy buttons should look like the merchant they lead to: an Amazon button in
-- Amazon yellow, a TikTok Shop button in TikTok red. Readers recognise where a
-- link goes before they click it, which is a clarity win as much as a
-- conversion one.
--
-- The colours are DATA, on the merchant row, not a hardcoded map in a
-- component. Adding a merchant with its own palette stays a row, not a deploy.
--
-- Additive and idempotent: safe to run whether or not 20260201000000-2 have
-- already been applied to this database.
--
-- Note on trademarks: buttons render the merchant NAME on the merchant's
-- colour. They do not render merchant logos or wordmark artwork, which carry
-- separate brand-guideline and licensing obligations per network. If a logo is
-- ever added, it must come from that network's own brand assets under their
-- terms.
-- =============================================================================

alter table public.affiliate_merchants
  add column if not exists brand_color text,
  add column if not exists brand_text_color text,
  add column if not exists brand_hover_color text;

-- Hex only, so a stray value can never be interpolated into a style attribute
-- as arbitrary CSS.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'affiliate_merchants_brand_color_hex'
  ) then
    alter table public.affiliate_merchants
      add constraint affiliate_merchants_brand_color_hex
      check (brand_color is null or brand_color ~* '^#[0-9a-f]{6}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'affiliate_merchants_brand_text_color_hex'
  ) then
    alter table public.affiliate_merchants
      add constraint affiliate_merchants_brand_text_color_hex
      check (brand_text_color is null or brand_text_color ~* '^#[0-9a-f]{6}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'affiliate_merchants_brand_hover_color_hex'
  ) then
    alter table public.affiliate_merchants
      add constraint affiliate_merchants_brand_hover_color_hex
      check (brand_hover_color is null or brand_hover_color ~* '^#[0-9a-f]{6}$');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Backfill the merchants we seed.
--
-- Only fills rows that have not been branded yet, so re-running never clobbers
-- a colour an editor has since changed.
-- -----------------------------------------------------------------------------
update public.affiliate_merchants as m
set brand_color       = v.bg,
    brand_text_color  = v.fg,
    brand_hover_color = v.hover
from (values
  -- Amazon's own action-button yellow, with their near-black text.
  ('amazon',      '#ffd814', '#0f1111', '#f7ca00'),
  ('tiktok-shop', '#fe2c55', '#ffffff', '#e11d48'),
  ('walmart',     '#0071dc', '#ffffff', '#005cb8'),
  ('target',      '#cc0000', '#ffffff', '#a80000'),
  ('home-depot',  '#f96302', '#ffffff', '#d95502'),
  ('lowes',       '#004990', '#ffffff', '#003a73')
) as v (slug, bg, fg, hover)
where m.slug = v.slug
  and m.brand_color is null;

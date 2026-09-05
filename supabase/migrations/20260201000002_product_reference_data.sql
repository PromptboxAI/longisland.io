-- =============================================================================
-- LongIsland.io — product taxonomy and merchant reference data
--
-- Reference rows, not content: the commerce category tree and the merchants we
-- can attach offers to. Published on insert so editors can use them immediately.
--
-- Idempotent — every statement is `on conflict (slug) do nothing`, so re-running
-- this migration against a database that already has it is a no-op and will not
-- clobber an editor's later edits to a name or description.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Top-level product groups
-- -----------------------------------------------------------------------------
insert into public.product_categories (name, slug, description, icon, status) values
  ('Outdoor & Beach', 'outdoor-beach',
   'Gear for the shoreline, the boat and the backyard.', 'umbrella', 'published'),
  ('Food & Cooking', 'food-cooking',
   'Equipment for cooking at home, outdoors and over fire.', 'chef-hat', 'published'),
  ('Home', 'home',
   'Appliances and equipment for keeping a Long Island house running.', 'house', 'published'),
  ('Family', 'family-gear',
   'Gear for getting kids out of the house and back again.', 'baby', 'published'),
  ('Travel & Outdoors', 'travel-outdoors',
   'Luggage, camping and power for going further than the beach.', 'tent', 'published'),
  ('Tech', 'tech',
   'Screens, sound and connected devices.', 'monitor-speaker', 'published'),
  ('Seasonal', 'seasonal',
   'What the season actually calls for, from beach chairs to snow blowers.', 'calendar', 'published')
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Child categories
--   Parent resolved by slug from the table rather than from a CTE, so this
--   statement is correct whether or not the inserts above were no-ops.
--
--   "Coolers" is filed once, under Outdoor & Beach. It belongs equally under
--   Travel & Outdoors, but two rows meaning the same thing would split the
--   products between them and give search engines a duplicate hub. One category
--   can be surfaced from more than one guide instead.
-- -----------------------------------------------------------------------------
insert into public.product_categories (name, slug, parent_id, status)
select value.name, value.slug, parent.id, 'published'
from (values
  -- Outdoor & Beach
  ('Beach Blankets',          'beach-blankets',          'outdoor-beach'),
  ('Beach Chairs',            'beach-chairs',            'outdoor-beach'),
  ('Beach Wagons',            'beach-wagons',            'outdoor-beach'),
  ('Coolers',                 'coolers',                 'outdoor-beach'),
  ('Beach Umbrellas',         'beach-umbrellas',         'outdoor-beach'),
  ('Sunshelters',             'sunshelters',             'outdoor-beach'),
  ('Waterproof Speakers',     'waterproof-speakers',     'outdoor-beach'),
  ('Dry Bags',                'dry-bags',                'outdoor-beach'),
  ('Beach Toys',              'beach-toys',              'outdoor-beach'),

  -- Food & Cooking
  ('Pizza Ovens',             'pizza-ovens',             'food-cooking'),
  ('Grills',                  'grills',                  'food-cooking'),
  ('Outdoor Griddles',        'outdoor-griddles',        'food-cooking'),
  ('Coffee Makers',           'coffee-makers',           'food-cooking'),
  ('Air Fryers',              'air-fryers',              'food-cooking'),
  ('Kitchen Tools',           'kitchen-tools',           'food-cooking'),

  -- Home
  ('Vacuums',                 'vacuums',                 'home'),
  ('Pressure Washers',        'pressure-washers',        'home'),
  ('Lawn Equipment',          'lawn-equipment',          'home'),
  ('Snow Blowers',            'snow-blowers',            'home'),
  ('Generators',              'generators',              'home'),
  ('Dehumidifiers',           'dehumidifiers',           'home'),
  ('Air Purifiers',           'air-purifiers',           'home'),

  -- Family
  ('Strollers',               'strollers',               'family-gear'),
  ('Car Seats',               'car-seats',               'family-gear'),
  ('Kids Travel Gear',        'kids-travel-gear',        'family-gear'),
  ('Backyard Toys',           'backyard-toys',           'family-gear'),

  -- Travel & Outdoors
  ('Luggage',                 'luggage',                 'travel-outdoors'),
  ('Camping Gear',            'camping-gear',            'travel-outdoors'),
  ('Portable Power Stations', 'portable-power-stations', 'travel-outdoors'),

  -- Tech
  ('TVs',                     'tvs',                     'tech'),
  ('Speakers',                'speakers',                'tech'),
  ('Headphones',              'headphones',              'tech'),
  ('Smart Home',              'smart-home',              'tech'),
  ('Cameras',                 'cameras',                 'tech'),

  -- Seasonal
  ('Beach Gear',              'beach-gear',              'seasonal'),
  ('Tailgating Gear',         'tailgating-gear',         'seasonal'),
  ('Fall Outdoor Gear',       'fall-outdoor-gear',       'seasonal'),
  ('Holiday Gifts',           'holiday-gifts',           'seasonal'),
  ('Snow Gear',               'snow-gear',               'seasonal')
) as value (name, slug, parent_slug)
join public.product_categories parent on parent.slug = value.parent_slug
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Merchants
--   No tracking identifiers are seeded. An affiliate tag is account-specific and
--   belongs to whoever runs the site, so each offer carries the affiliate URL an
--   editor pastes from the network dashboard. Rows here supply the display name,
--   the button wording and any network-required disclosure.
-- -----------------------------------------------------------------------------
insert into public.affiliate_merchants (name, slug, network, homepage_url, cta_label, disclosure_note, status) values
  ('Amazon', 'amazon', 'amazon', 'https://www.amazon.com', 'Check Price',
   'As an Amazon Associate, LongIsland.io earns from qualifying purchases.', 'published'),
  ('TikTok Shop', 'tiktok-shop', 'tiktok_shop', 'https://www.tiktok.com', 'Shop Now',
   null, 'published'),
  ('Walmart', 'walmart', 'walmart', 'https://www.walmart.com', 'Check Price', null, 'published'),
  ('Target', 'target', 'target', 'https://www.target.com', 'Check Price', null, 'published'),
  ('The Home Depot', 'home-depot', 'home_depot', 'https://www.homedepot.com', 'Check Price', null, 'published'),
  ('Lowe''s', 'lowes', 'lowes', 'https://www.lowes.com', 'Check Price', null, 'published'),
  ('Manufacturer Direct', 'direct', 'direct', null, 'View Deal', null, 'published')
on conflict (slug) do nothing;

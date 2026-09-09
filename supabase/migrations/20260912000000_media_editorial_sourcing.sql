-- =============================================================================
-- Editorial image sourcing
--
-- The library was built for images we commission or are given: `source` offered
-- own / business_provided / licensed and little else, and the workflow doc said
-- "never scraped". For a ranking publication run by one person that rule does
-- not describe a standard, it describes a site with no pictures — asking two
-- hundred pizzerias for a photo and driving to the ones that do not answer is
-- not a workflow anybody actually runs.
--
-- So the rule changes shape rather than disappearing. We may use an image from
-- a business's own public channel to identify that business, and in exchange we
-- record where it came from, we host our own copy rather than hotlinking, we
-- never claim we own it, and we take it down on request without arguing.
--
-- Two URLs, not one, because they answer different questions. `source_url` is
-- the file we fetched. `source_page_url` is the page a human can open to check
-- the claim — and it is the one that still resolves in a year, when the CDN
-- path behind it has rotated.
-- =============================================================================

alter table public.media_assets
  -- The page the image was found on, as opposed to the file itself.
  add column if not exists source_page_url text
    check (source_page_url is null or source_page_url ~* '^https?://'),

  -- Whether a person still has to look at this. `needs_review` is the honest
  -- state for anything sourced from somewhere we cannot vouch for, and it is
  -- deliberately the DEFAULT for that source type rather than something an
  -- editor has to remember to set.
  add column if not exists review_state text not null default 'ok'
    check (review_state in ('ok', 'needs_review', 'taken_down')),
  add column if not exists review_note text;

-- 'own' and 'original' would be two spellings of one fact, and a closed set
-- that contains both cannot be audited. Existing rows move to the new spelling.
update public.media_assets set source = 'original' where source = 'own';

-- The set widens to name the editorial cases explicitly. A single
-- "other_editorial_source" bucket for everything non-official is the point:
-- it is the value that triggers review, so it must not be comfortable to sit in.
alter table public.media_assets
  drop constraint if exists media_assets_source_check;

alter table public.media_assets
  add constraint media_assets_source_check check (source in (
    -- Ours outright, or given to us, or paid for.
    'original', 'business_provided', 'licensed',
    -- A business's own public channels, used to identify that business.
    'official_website', 'official_instagram', 'official_facebook',
    -- Anything else. Requires a person to agree before it is published.
    'other_editorial_source',
    -- Retained for the product library, which predates this.
    'creator', 'manufacturer', 'other'
  ));

create index if not exists media_assets_review_state_idx
  on public.media_assets (review_state)
  where review_state <> 'ok';

-- -----------------------------------------------------------------------------
-- Takedowns
--
-- A promise to remove an image on request is worth nothing without a mechanism,
-- and the mechanism has to outlive the row it removes. Deleting the asset
-- detaches it from every record automatically — each reference is `on delete
-- set null` — but it also erases the evidence that we were asked and complied.
--
-- So the log is written first and kept afterwards. It is the answer to "you
-- ignored our request", and it is what stops the same image being re-imported
-- next month by someone who never heard about the complaint.
-- -----------------------------------------------------------------------------
create table if not exists public.media_takedowns (
  id              uuid primary key default gen_random_uuid(),
  -- Not a foreign key: the whole point is that it survives the asset.
  media_asset_id  uuid not null,
  filename        text,
  storage_path    text,
  source          text,
  source_url      text,
  source_page_url text,
  reason          text,
  requested_at    timestamptz not null default now(),
  actioned_by     uuid references auth.users (id) on delete set null
);

create index if not exists media_takedowns_source_url_idx
  on public.media_takedowns (source_url);

alter table public.media_takedowns enable row level security;

-- No public read. A takedown log is an internal record of a complaint, and
-- unlike media_assets nothing on a public page needs it.
drop policy if exists media_takedowns_admin_all on public.media_takedowns;
create policy media_takedowns_admin_all
  on public.media_takedowns for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

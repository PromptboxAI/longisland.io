-- Private contact details for a business.
--
-- A separate table rather than a column on `businesses`, and the reason is not
-- tidiness.
--
-- Every public query on businesses selects `*`. Adding `contact_email` there
-- would put it in the payload of every listing, ranking and profile page on the
-- site — not visible, but present in the HTML, which is the same thing. The
-- obvious fix, revoking the column, cannot work: an admin and a member of the
-- public are both `authenticated` to Postgres, so a column grant cannot tell
-- them apart, and RLS is row-level.
--
-- A separate table CAN tell them apart, because the rows are the thing being
-- protected. `select *` on businesses cannot reach it however the query is
-- written, today or by someone in a hurry next year. That is the point: this is
-- safe by construction rather than by remembering.

create table if not exists public.business_contacts (
  business_id  uuid primary key
               references public.businesses (id) on delete cascade,
  -- Where we would write to them. Never rendered publicly.
  email        text,
  -- A private line, distinct from the public `businesses.phone`.
  contact_name text,
  phone        text,
  -- Anything an editor needs to remember about talking to them.
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.business_contacts is
  'Private contact details. Admin-only by RLS, and deliberately not a column on '
  'businesses, whose public queries select *.';

alter table public.business_contacts enable row level security;

-- No public read policy of any kind. There is no correct anonymous read here,
-- so there is no policy to get subtly wrong.
drop policy if exists business_contacts_admin_all on public.business_contacts;
create policy business_contacts_admin_all
  on public.business_contacts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists business_contacts_email_idx
  on public.business_contacts (email);

-- =============================================================================
-- Articles: row level security
--
-- Identical to rankings. Anonymous readers see published articles only; a draft
-- is invisible rather than merely unlinked, so a guessed slug returns nothing.
--
-- Admin preview does not weaken this. The preview route reads with the signed-in
-- editor's own session, so the admin policy below is what admits the draft — RLS
-- stays the boundary rather than being bypassed with a service key.
-- =============================================================================

alter table public.articles enable row level security;

drop policy if exists articles_public_read on public.articles;
create policy articles_public_read
  on public.articles for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists articles_admin_all on public.articles;
create policy articles_admin_all
  on public.articles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

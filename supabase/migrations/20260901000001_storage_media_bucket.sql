-- =============================================================================
-- Storage: the `media` bucket
--
-- Uploads go straight from the browser to Storage using a signed upload URL
-- that a Server Action mints after requireAdmin(). The file never passes
-- through the application, which matters for a reason that is easy to miss:
-- Next caps Server Action bodies at 1 MB by default and Vercel caps request
-- bodies at 4.5 MB, so an ordinary phone photo would fail if we proxied it.
--
-- That flow means the browser chooses the bytes, so the constraints below are
-- the real enforcement. A signed URL is scoped to a single server-chosen path,
-- and the bucket refuses anything that is not an image under 8 MB regardless of
-- what the client claimed it was sending. No privileged credential is ever
-- exposed to the browser.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  8388608,                       -- 8 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Object policies
--
-- Read is public: the pages that use these files are public, and Next's image
-- optimiser fetches them without a session. Every write is admin-only, checked
-- with the same predicate the content tables use.
-- -----------------------------------------------------------------------------
drop policy if exists media_objects_public_read on storage.objects;
create policy media_objects_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists media_objects_admin_insert on storage.objects;
create policy media_objects_admin_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists media_objects_admin_update on storage.objects;
create policy media_objects_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists media_objects_admin_delete on storage.objects;
create policy media_objects_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_admin());

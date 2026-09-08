-- =============================================================================
-- Raise the media upload ceiling from 8 MB to 50 MB.
--
-- 8 MB was my number, not a platform limit, and it was set thinking about
-- photographs. A PNG saved straight off a desktop screen is a different animal:
-- lossless, often 4K or wider, and routinely past 8 MB — so the cap was being
-- hit during ordinary work rather than catching anything unusual.
--
-- Readers do not pay for the extra bytes. Images are served through Next's
-- optimiser, which re-encodes and resizes per request, so the size here is what
-- the bucket stores and not what a page downloads.
--
-- A ceiling is kept rather than removed. It is the only thing standing between
-- a slipped digit and a bucket full of something nobody meant to upload, and at
-- 50 MB a screenshot will not reach it. allowed_mime_types is unchanged and
-- still admits images only.
--
-- NOTE: the matching MAX_BYTES in src/app/admin/media/actions.ts is raised in
-- the same commit. Both matter — the constant produces the readable error
-- before an upload starts, and this row is what actually refuses the bytes,
-- because the browser uploads straight to Storage through a signed URL.
-- =============================================================================

update storage.buckets
   set file_size_limit = 52428800          -- 50 MB
 where id = 'media';

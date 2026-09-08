/**
 * The upload ceiling, in one place.
 *
 * This number was written out in six: the server action that mints the ticket,
 * two client components' error strings, and three comments — each saying "8 MB"
 * in its own words. Raising the limit meant finding all six, and any one missed
 * would have told an editor their file was too big while the server happily
 * accepted it.
 *
 * Deliberately NOT in the actions file. That module is a "use server" boundary
 * and may only export async functions, so a client component cannot import a
 * constant from it — which is exactly why the number ended up copied into the
 * components in the first place.
 *
 * The real enforcement is `file_size_limit` on the media bucket: the browser
 * uploads straight to Storage through a signed URL, so this value only decides
 * whether we refuse politely first. Keep the two in step — see
 * supabase/migrations/20260911000000_raise_media_size_limit.sql.
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** The same figure as an editor reads it. */
export const MAX_UPLOAD_LABEL = `${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`;

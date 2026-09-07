-- Pending edits and staged AI drafts.
--
-- Two problems, one shape.
--
-- The first is that a published ranking saves live, so pausing mid-sentence
-- puts half a thought on the public page. The fix is not to stop autosaving —
-- losing an editor's work is worse — but to autosave long-form text somewhere
-- that is not the public value, and to require an explicit action to move it
-- across.
--
-- The second is that AI drafting writes straight into editorial fields, which
-- on a published ranking means AI copy reaches readers before a human has read
-- it. The fix is the same: somewhere to put a proposal that is not the value.
--
-- Both are a bag of field-name-to-text with no schema of their own, so both are
-- jsonb rather than a column per field. That is deliberate and it is the whole
-- reason this is one small migration rather than a revision system: no new
-- tables, no history, no joins, and adding a field later needs no migration at
-- all. What is stored is one pending value per field, not a chain of them.
--
-- Shape of both columns:
--   {"intro": "…", "methodology": "…"}
--
-- NULL and '{}' both mean nothing pending. Readers must treat them the same.

alter table public.rankings
  add column if not exists pending_changes jsonb,
  add column if not exists ai_draft jsonb;

alter table public.ranking_entries
  add column if not exists pending_changes jsonb,
  add column if not exists ai_draft jsonb;

comment on column public.rankings.pending_changes is
  'Long-form edits saved but not yet applied to the public page. One value per '
  'field name. NULL or {} means nothing pending.';

comment on column public.rankings.ai_draft is
  'AI-proposed copy awaiting human review. Never rendered publicly. Applying it '
  'writes through the same pending/live rules as a human edit.';

comment on column public.ranking_entries.pending_changes is
  'Long-form edits saved but not yet applied to the public page.';

comment on column public.ranking_entries.ai_draft is
  'AI-proposed copy awaiting human review. Never rendered publicly.';

-- No RLS changes are needed or wanted.
--
-- Both columns live on tables that already carry the right policies: admins
-- read and write, the public reads published rows. That last part is worth
-- being explicit about — an anonymous reader CAN select these columns on a
-- published ranking. That is safe because nothing public ever renders them:
-- the public queries name their columns and do not include these, and the page
-- components read the real fields. They hold unpublished editorial text, not
-- secrets, and the alternative — column-level security — would buy nothing and
-- cost a policy that has to be kept in step with every future column.

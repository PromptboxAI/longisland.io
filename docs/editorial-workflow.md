# Editorial workflow

The path a ranking travels from idea to published, and what has to be true at
each step before it moves on.

```
IDEA
 ↓
RESEARCH
 ↓
CANDIDATES
 ↓
EDITOR REVIEW
 ↓
APPROVED
 ↓
ARTICLE
 ↓
SCRIPT
 ↓
MEDIA
 ↓
READY
 ↓
PUBLISHED
 ↓
ANALYZED
```

## IDEA

A list worth making: a category people actually search for, scoped to a place
people actually go. "Best pizza on Long Island" and "best pizza in Huntington"
are two different lists with two different fields of candidates.

Sources: reader nominations in `/admin/nominations`, seasonal timing, gaps in
the category tree, search demand.

**Exit criteria:** a topic, an area, and a reason this list should exist.

## RESEARCH

`/admin/generate`. Enter the topic and area, set a review-count floor, and pull
candidates.

Yelp is a starting point, not an answer. Its ratings tell you where to look;
they do not tell you what is good, and they never appear on the public site.

**Exit criteria:** a candidate pool wider than the final list.

## CANDIDATES

Select and order the ones that belong. Selection order becomes the initial
ranking order and can be changed later.

Excluding is as important as including — closed, wrong category, chain
locations, duplicates.

**Exit criteria:** the intended number selected, plus a couple of alternates in
mind.

## EDITOR REVIEW

Creating the ranking makes a **draft**. Nothing is public. RLS hides both the
ranking and its entries.

Verify each entry before writing about it: still open, correct address and
phone, right category, not a duplicate of an existing business row.

**Exit criteria:** every entry verified against a source that is not Yelp.

## APPROVED

The list order is settled and defensible. If two entries could swap without
anyone noticing, the reasoning is not specific enough yet.

**Exit criteria:** you could defend each position out loud.

## ARTICLE

Write it in `/admin/rankings/[id]`:

- **Dek** — one sentence for cards and search results.
- **Intro** — why this list, what the standard was.
- **Methodology** — how it was researched. This publishes under "How we chose"
  and is what makes the list defensible. Be specific: how many places, over what
  period, what was held constant.
- **Per entry** — "Best for", "Why we picked it", and at most one badge.

House rules:

- Specifics beat superlatives. "A 90-second coal bake" beats "amazing crust".
- Never imply a third-party rating is ours.
- Never write copy an advertiser asked for. If a business on the list is also an
  advertiser, the copy reads exactly as it would otherwise.

**Exit criteria:** intro, methodology and a reason on every entry.

## SCRIPT

Optional. Social or video treatment, tracked in `/admin/content` against the
ranking.

## MEDIA

Photography and video. Owned, licensed or business-provided only — never
scraped. Until real imagery is attached, `EditorialImage` renders a branded
placeholder, which is the honest state rather than a borrowed photo.

Remote hosts must be added to `images.remotePatterns` in `next.config.ts`.

## READY

Final check:

- [ ] Slug is right — it is permanent once published
- [ ] Category and place set, so the list appears in the right hubs
- [ ] Methodology written
- [ ] Every entry has a reason
- [ ] Author set
- [ ] Preview looks right on mobile

## PUBLISHED

Publish from the editor. `status` becomes `published`, `published_at` is stamped
**once** — republishing after an edit does not reset the original date — and the
public path is revalidated.

The list is now a public claim about local businesses. Treat corrections as
urgent.

## ANALYZED

After it has been live a while: what got read, what got skipped, which entries
drew nominations or corrections. Feeds the next IDEA.

## Updating a published list

Lists are living. Places close, change hands and slip.

- Edit and republish — `published_at` is preserved, `updated_at` moves, and the
  page shows "Updated" instead of "Published".
- Removing an entry renumbers the rest automatically.
- **Do not change the slug** on a published ranking. It breaks every existing
  link and the search ranking that came with them.

## Corrections

Factual errors — address, phone, ownership, closure — are fixed promptly and
without argument. That policy is published on `/methodology`, so it is a promise
we have made, not an internal preference.

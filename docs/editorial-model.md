# Editorial curation model

How homepage and category programming is decided.

## Why this exists

Curated surfaces used to slice one feed:

```ts
const [lead, ...rest] = rankings;
const railItems = rankingsToRailItems(rankings.slice(0, 5));
const topPicks = rankings.slice(0, 5);
```

Three consequences. The slots overlapped by construction — the same ranking was
the lead, the top of the rail and the first pick. Nothing could be pinned. And
only a ranking could ever appear, so an article, a product guide or a seasonal
feature had nowhere to go.

Curation is now data. An editor decides what sits in each slot.

## Two tables

**`editorial_sections`** — a named, scoped slot.

| Column | Notes |
| --- | --- |
| `key` | What the site asks for: `homepage_primary`, `category_links`, … |
| `scope_type` | `global` \| `category` \| `place` |
| `category_id` / `place_id` | Set for scoped sections; a CHECK keeps them consistent with `scope_type` |
| `layout` | `feature` \| `rail` \| `grid` \| `link_row` — intent, not styling |
| `max_items` | Optional cap applied when reading |
| `status` | Draft sections hide all their items |

One section per key per scope, enforced by a unique index that coalesces the
nullable scope columns — otherwise NULLs would never compare equal and global
sections could silently duplicate.

**`editorial_section_items`** — what an editor put in a slot.

*Destination* — exactly one of `ranking_id`, `business_id`, `category_id`,
`place_id`, `external_url`, enforced by a CHECK. Typed foreign keys rather than
a polymorphic `(type, id)` pair, so a deleted ranking cannot leave a section
pointing at nothing; each FK cascades.

*Presentation* — `kicker`, `headline`, `dek`, `image_url`, `badge`, all
nullable. **Null means inherit from the target.** Copying the title in at insert
time would go stale the first time someone edited the underlying record. Only
fill these to say something deliberately different.

*Placement* — `is_sponsored` makes "was this bought?" one auditable column
rather than something inferred from copy. `starts_at` / `ends_at` schedule it.

## Ordering is deterministic

`position` is **not** unique. Reordering through PostgREST cannot run a
multi-statement swap inside one transaction, and a unique constraint would
reject the intermediate state.

Instead every reader — public and admin — orders by `(position, created_at, id)`,
so ties break the same way every time, and the admin renormalises positions to a
contiguous `1..n` after each mutation. A render taken mid-swap is still stable.

## What the public sees

RLS, not application code, decides. An item is visible only when **all** hold:

1. the item is `published`
2. the schedule window is open (`starts_at` null or past, `ends_at` null or future)
3. the parent section is `published`
4. **the target itself is `published`**

(4) is the one that matters most and is easiest to omit. Without it, featuring a
draft ranking would publish its existence and title, defeating the draft
isolation the `rankings` policies already enforce. It mirrors the
`ranking_entries` policy, which gates on its parent ranking for the same reason.

An `external_url` item has no row to gate on and passes that arm.

## Reading it

```ts
import { getSection } from "@/lib/data/queries";

const section = await getSection("homepage_primary");
const category = await getSection("related_content", { categoryId: category.id });
```

`getSection` returns a `ResolvedSection`, or `null` when the section does not
exist, is unpublished, or there is no database. Each item arrives fully
resolved:

```ts
{
  id, position, targetType,          // "ranking" | "business" | … | "external_url"
  href,                              // /best/…, /business/…, or the external URL
  kicker, headline, dek, imageUrl,   // override if set, else inherited
  badge, isSponsored,
  overrides: { kicker, headline, dek, imageUrl }   // true where an override won
}
```

Inheritance is applied once, here, so no component reimplements it. `overrides`
is exposed mainly so an admin preview can show what was customised.

Seed mode returns `null` rather than inventing sections: curation is an editor's
decision, and fabricating one is exactly what the seed gate exists to prevent.

Public pages revalidate hourly, so a scheduled item appears within an hour of
its `starts_at`, not to the second.

## Admin

`/admin/editorial` lists sections and creates them; `/admin/editorial/[id]`
edits one. An editor can set scope, key, layout, title, description, max items
and status; add items by target type with a filterable picker or a raw URL;
reorder with keyboard-accessible up/down controls; set overrides — each field
showing its inherited value as the placeholder, so it is obvious when you are
overriding rather than inheriting; mark sponsored; schedule; and remove.

Items are created as drafts. An item whose target is unpublished is flagged
inline, because RLS will hide it regardless of the item's own status.

## Not included yet

- **`product_ranking_id`** — added once the product-affiliate branch merges. It
  is one more nullable FK arm plus an update to the one-destination CHECK.
- **Public UI wiring.** The homepage and category pages still derive their
  content. The UI branch consumes `getSection()` when it is ready; nothing in
  those files changed here.
- **`content_product_recommendations`** is untouched. It solves a different
  problem (products inside a host page) and uses a polymorphic reference. Worth
  revisiting once both models are live, but not worth a migration now.

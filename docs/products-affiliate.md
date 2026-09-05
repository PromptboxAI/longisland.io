# Products and affiliate commerce

The commerce layer: product reviews, buying guides, merchant offers and the
recommendation modules that put products next to local content.

It sits **alongside** the local-business layer rather than inside it. A business
is a place you go; a product is a thing you buy. The two cross-link
editorially, and no local table was altered to add any of this.

## Page types

| URL | What it is |
| --- | --- |
| `/products` | Index of buying guides, filterable by product category |
| `/products/[slug]` | One buying guide — `best-beach-blankets`, `best-coolers` |
| `/affiliate-disclosure` | How we make money and what it does not buy |

There is deliberately **no page per product**. A page whose only content is a
name and a buy button is a thin affiliate page; products are rendered inside a
guide or a recommendation module, where there is editorial context around them.

## Data model

```
product_categories ──< products ──< product_offers >── affiliate_merchants
                          │                             (joined by slug)
                          ├──< product_ranking_entries >── product_rankings
                          │
                          └──< content_product_recommendations ──> any host page
```

- **product_categories** is its own tree, separate from `categories`. Merging
  them would put "Coolers" into `/categories` and the local sitemap.
- **products** carry `short_description` (facts) and `editorial_summary` (our
  take) as separate columns, so a spec line can never be mistaken for a judgment.
- **product_offers** hold `affiliate_url` and `direct_url` separately. If the
  tagged link is missing we link the plain one — losing a tag should cost us a
  commission, not cost the reader the buying option.
- **affiliate_merchants** makes merchants data. `product_offers.merchant` stores
  a slug from this table, so adding Walmart or TikTok Shop is a row, not a
  deploy. Nothing secret lives here (see "Tracking identifiers" below).
- **product_ranking_entries** carry `pros`/`cons` as jsonb arrays, on the entry
  rather than the product: "heavy" is a con in a guide to packable chairs and a
  pro in a guide to wind-resistant umbrellas.
- **content_product_recommendations** is addressed by `(content_type,
  content_id)` rather than a column per host type, so a new host surface needs
  no migration. The trade-off is no foreign key — a deleted host leaves orphan
  rows, which are invisible and cleaned up from the admin editor.

`product_rankings.local_category_id` is the whole cross-linking mechanism. One
nullable column pointing at `categories` lets a beach-gear guide list the local
beach rankings, and lets those pages offer the guide, with no join table.

Types are hand-written in `src/types/products.ts`, mirroring the migrations.

## Data access

Same two-layer split as the local content, in sibling modules:

- `src/lib/data/product-queries.ts` — public reads. **Probes for its own
  schema**, independently of `queries.ts`, because the product tables arrive in
  a later migration. A database with the local schema and not the product schema
  renders the local site live and the product site from seed fixtures, which is
  exactly the state the repo is in between the two `db push` runs.
- `src/lib/data/admin-product-queries.ts` — staff reads. No seed fallback: an
  editor looking at an empty products table needs to see that it is empty.

## Affiliate rules

All of them live in `src/lib/affiliate.ts`, because each is a policy decision
rather than a display detail.

**Disclosure is derived, not decorated.** `hasAffiliateLinks()` looks at whether
any rendered offer actually carries an affiliate URL. A guide that gains its
first tagged offer starts disclosing without anyone editing a template, and one
whose offers are all untagged does not claim a commercial relationship it does
not have. The disclosure renders above the first affiliate link, never below the
fold.

**Every affiliate link is `rel="sponsored nofollow noopener noreferrer"`**,
tagged or not, so an untagged offer that later gains a tag needs no change.

**CTAs are merchant-neutral** — "Check Price", "View Deal", "Shop Now". Never
"Buy now" (pressure) or "Best price" (a claim we cannot substantiate at render
time). The visible text repeats down a page, so the accessible name carries the
product and merchant.

**Buy buttons wear the merchant's colours.** An Amazon button is Amazon
yellow, a TikTok Shop button is TikTok red, so a reader can tell where a link
goes before clicking it. The palette lives on the merchant row
(`brand_color`, `brand_text_color`, `brand_hover_color`), not in a map in a
component — adding a merchant with its own colours is a row, and
`/admin/affiliate-offers` has the editor with a live preview. A merchant with no
colour set falls back to the house navy.

Two guardrails: the hex is validated by a check constraint *and* re-validated in
`merchantButtonTheme()` before it reaches an inline style, because a colour that
reaches a `style` attribute must never be able to carry arbitrary CSS. And
buttons render the merchant **name**, never its logo or wordmark — artwork
carries brand-guideline and licensing obligations per network that a colour and
a name do not.

**Prices have a shelf life.** A price is a factual claim, and we have no price
feed — the number is only as good as the last time an editor looked. Saving an
offer stamps `last_checked_at`, and after `PRICE_FRESHNESS_DAYS` (14) the price
is hidden rather than shown stale. Additionally, **Amazon prices are never
displayed**: the Associates operating agreement only permits prices sourced from
the Product Advertising API and kept continuously current, and we pull nothing
from it. Both rules apply to the JSON-LD too — markup never claims a price the
page itself will not show.

**No testing claims.** We research, we do not lab-test.
`PRODUCT_RESEARCH_NOTICE` says so and renders on every guide regardless of what
the editor wrote in the methodology field.

### Tracking identifiers

An affiliate tag travels in the query string of every outbound link and is
visible to anyone who follows one. It is not a secret, and `affiliate_merchants`
is the right place for merchant display config. Editors paste the tagged URL
from the network dashboard into each offer.

Network **API credentials** — if price syncing is ever added — belong in
environment variables and never in the database.

## SEO

`src/lib/seo/product-json-ld.ts` emits `Article` + `ItemList`, with a `Product`
node and `Offer`/`AggregateOffer` per entry.

It emits **no `aggregateRating` and no `review`**, the same rule the local
builders follow. We do not collect star ratings and we do not run a testing lab,
so a rating in our markup would be a fabrication. What we do have is an
editorial ranking, and `ItemList` states exactly that.

Guides are in the sitemap at priority 0.8 and carry canonical URLs and dynamic
metadata like every other content type.

## Admin

| Route | Purpose |
| --- | --- |
| `/admin/products` | Product list, create |
| `/admin/products/[id]` | Product details + merchant offers |
| `/admin/product-rankings` | Buying guide list, create |
| `/admin/product-rankings/[id]` | Guide details, picks, ordering |
| `/admin/affiliate-offers` | Every offer: what is untagged, what is stale; merchant list and button branding |

Mutations are Server Actions in `app/admin/products/actions.ts`,
`app/admin/product-rankings/actions.ts` and
`app/admin/recommendations/actions.ts`. Each re-checks `requireAdmin()` — a
Server Action is a public HTTP endpoint — and stored URLs are restricted to
`http`/`https` so a `javascript:` URL can never reach an href.

Reordering uses explicit up/down buttons, not drag-and-drop, matching the local
ranking editor so it works with a keyboard and a screen reader.

## Embedded recommendation modules

The module that puts products on a local page is **self-contained on both
sides**:

```tsx
// public — src/app/best/[slug]/page.tsx
<RecommendedProductsModule
  contentType="ranking"
  contentId={ranking.id}
  localCategoryId={ranking.category?.id}
/>

// admin — src/app/admin/rankings/[id]/page.tsx
<RecommendedProductsEditor contentType="ranking" contentId={ranking.id} />
```

Both are async server components that fetch their own data and bind their own
actions. A host page adds one import and one element; local templates stay
ignorant of the product layer, and nothing is hardcoded into them. The public
module renders **nothing at all** when no products are attached — no heading, no
empty state.

Adding place, category or business hosts needs no migration and no new action:
pass a different `contentType`.

## Editorial workflow

Identical to a local ranking (see editorial-workflow.md), with two additions:

- Every pick needs a **reason, a "best for", pros and cons**. An entry with pros
  and no cons reads as marketing copy — the editor is prompted to name the
  trade-off.
- Before publishing, check the offers. The guide editor warns when a pick has no
  merchant offer, and `/admin/affiliate-offers` lists everything untagged or
  stale across the whole catalogue.

Badges (`PRODUCT_BADGES`) drive the quick-picks rail: Our Pick, Best Value, Best
Premium, Best for Families, Best for Travel, Also Great. The rail sorts by badge
order rather than ranking order, so it reads as answers to different questions
rather than a second copy of the list.

## Not built yet

Deliberately deferred, with the schema already shaped for them:

- **Live price/availability sync** (Amazon PA-API, Walmart, Impact). The seam is
  `sortOffers()` — once a feed exists, only that comparator and the
  `PRICE_DISPLAY_BLOCKED_NETWORKS` set change.
- **Click tracking.** No redirect route and no click table: links go straight to
  the merchant. Adding tracking means adding a privacy-policy disclosure, so it
  is a product decision, not a technical one.
- **TikTok Shop / Amazon API integrations.** `affiliate_merchants.network`
  already carries the values; nothing calls an API.

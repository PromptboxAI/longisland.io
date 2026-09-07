# Editorial placement render matrix

What every placement accepts, shows, inherits and falls back to. Verified
against the code on 7 September 2026.

A note on the count: the brief asked for nine placements. There are **eight**
in `src/lib/editorial/placements.ts` — six on the homepage and two on the
category page. Nothing has been dropped; the ninth appears to be a
miscount. They are all listed below.

---

## Homepage

### 1. Primary Feature — `homepage_primary`

| | |
|---|---|
| **Location** | Homepage, centre column of the lead row |
| **Accepts** | Ranking, Article, Buying guide |
| **Section heading** | **Never rendered.** `showsHeading: false` — the selected item supplies the headline, and a section title above it would put two competing headlines on the page |
| **Description** | Never rendered |
| **Image** | Item override, else the target's hero image |
| **Headline / dek / kicker** | Item override, else the target's title / description / geography |
| **Override** | All four fields overridable per item |
| **Draft behaviour** | A draft section or draft item does not render publicly. A draft *target* resolves in preview and is hidden live |
| **Preview** | `/preview/homepage` renders it with drafts |
| **Revalidation** | Homepage is ISR at 3600s; `revalidatePath("/")` on section save |
| **Fallback** | **None. Manual only. Hidden when empty.** The lead story is the one editorial decision on the page that must never be made by a sort order |

### 2. Latest — `homepage_latest`

| | |
|---|---|
| **Location** | Homepage, left rail |
| **Accepts** | Ranking, Article, Buying guide |
| **Section heading** | **Rendered.** From section `title`, defaulting to "The Latest" |
| **Description** | Rendered when set |
| **Image** | Not used — this rail renders text cards |
| **Headline / dek / kicker** | Item override, else the target's own |
| **Override** | Yes |
| **Draft behaviour** | As above |
| **Preview** | `/preview/homepage` |
| **Revalidation** | ISR 3600s + on-demand |
| **Fallback** | **Automatic.** Newest published rankings, chronological, excluding whatever the feature is showing. This is the only automatic slot, because "the newest thing we published" is a fact rather than a claim |

### 3. Top Rankings — `homepage_top_rail`

| | |
|---|---|
| **Location** | Homepage, right rail |
| **Accepts** | Ranking, Article, Buying guide |
| **Section heading** | **Rendered.** From section `title`, defaulting to "Top Rankings" |
| **Description** | Not rendered by `TopRail` |
| **Image** | Item override, else target hero |
| **Headline / dek / kicker** | Item override, else target's own |
| **Override** | Yes |
| **Draft behaviour** | As above |
| **Preview** | `/preview/homepage` |
| **Revalidation** | ISR 3600s + on-demand |
| **Fallback** | **None today — curated only, hidden when empty.** An automatic fallback is permitted here per the current brief but is not implemented; a "Top" list assembled by recency is a claim nobody made. Eligibility would be explicit (the three types above) if one is added |

### 4. Top Picks — `homepage_top_picks`

| | |
|---|---|
| **Location** | Homepage, commerce row |
| **Accepts** | **Product, Buying guide only** |
| **Section heading** | **Rendered.** From section `title`, defaulting to "Our Top Picks" |
| **Description** | Rendered; defaults to "Products our editors rate, with where to buy them." |
| **Image** | Product image, or guide hero |
| **Headline / dek / kicker** | Item override, else product brand + name / summary / brand |
| **Override** | Yes |
| **Draft behaviour** | As above. A product with no usable offer is skipped even when published, and the picker says so before it is added |
| **Preview** | `/preview/homepage` |
| **Revalidation** | ISR 3600s + on-demand |
| **Fallback** | **None. Curated only, hidden when empty.** Anything that is not a product or a guide is skipped rather than substituted — a local restaurant ranking in a commerce row is the exact substitution this section exists to prevent |
| **Disclosure** | Follows the monetised links actually present, never the section name |

### 5. Trending — `homepage_trending`

| | |
|---|---|
| **Location** | Homepage, three cards below the newsletter band |
| **Accepts** | Ranking, Article, Buying guide |
| **Section heading** | **Rendered.** From section `title`, defaulting to "What's Trending Now" |
| **Description** | Rendered; defaults to "Chosen by our editors." |
| **Image** | Item override, else target hero |
| **Headline / dek / kicker** | Item override, else target's own |
| **Override** | Yes |
| **Draft behaviour** | As above |
| **Preview** | `/preview/homepage` |
| **Revalidation** | ISR 3600s + on-demand |
| **Fallback** | **None. Manually curated, hidden when empty.** Recency is not evidence of trending, and until there is traffic data behind it the word would be doing work nothing supports |

### 6. Related Content — `related_content`

| | |
|---|---|
| **Location** | Homepage, the Related Reviews line under the feature |
| **Accepts** | Ranking, Article, Buying guide, Business |
| **Section heading** | **Never rendered.** `showsHeading: false` — the row carries its own inline label |
| **Description** | Never rendered |
| **Image** | Not used — text links |
| **Headline** | Item override, else target title |
| **Override** | Headline and href |
| **Draft behaviour** | As above |
| **Preview** | `/preview/homepage` |
| **Revalidation** | ISR 3600s + on-demand |
| **Fallback** | **Automatic and contextual.** `deriveRelatedFallback` picks from content related to the feature, excluding the feature itself. Curated items always win |

---

## Category page

### 7. Featured Module — `category_module`

| | |
|---|---|
| **Location** | Category page, featured grid |
| **Scope** | Per category — one row per category, not global |
| **Accepts** | Ranking, Article, Buying guide, Business |
| **Section heading** | **Rendered.** From section `title`, defaulting to "Featured" |
| **Description** | Rendered when set |
| **Image** | Item override, else target hero |
| **Headline / dek / kicker** | Item override, else target's own |
| **Override** | Yes |
| **Draft behaviour** | As above |
| **Preview** | No dedicated preview path; view the category page |
| **Revalidation** | On-demand on section save |
| **Fallback** | Featured rankings for that category |

### 8. Heading Links — `category_links`

| | |
|---|---|
| **Location** | Category page, text links beside the section heading |
| **Scope** | Per category |
| **Accepts** | Ranking, Article, Buying guide, Category |
| **Section heading** | **Never rendered.** `showsHeading: false` |
| **Description** | Never rendered |
| **Image** | Not used |
| **Headline** | Item override, else target title |
| **Override** | Headline and href |
| **Draft behaviour** | As above |
| **Preview** | View the category page |
| **Revalidation** | On-demand on section save |
| **Fallback** | None — hidden when empty |

---

## Which placements render a section title

| Renders title | Renders description | Renders neither |
|---|---|---|
| Latest | Latest | Primary Feature |
| Top Rankings | Top Picks | Related Content |
| Top Picks | Trending | Heading Links |
| Trending | Featured Module | |
| Featured Module | | |

The three in the right-hand column set `showsHeading: false`. Their Title and
Description fields are **admin labels only** — they name the row in the
Editorial dashboard and never reach a reader. Everywhere else, the Title field
is the public heading, falling back to the default above only when it is blank.

## Fallback summary

| Placement | Fallback | When empty |
|---|---|---|
| Primary Feature | None — manual only | Hidden |
| Latest | Automatic, newest published | Never empty in practice |
| Top Rankings | None | Hidden |
| Top Picks | None — products and guides only, never substituted | Hidden |
| Trending | None — manual only | Hidden |
| Related Content | Automatic, derived from the feature | Hidden if nothing related |
| Featured Module | Featured rankings in that category | Hidden |
| Heading Links | None | Hidden |

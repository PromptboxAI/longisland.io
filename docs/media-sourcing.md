# Image sourcing and rights

What LongIsland.io may use as a picture of a business, what has to be recorded
about it, and how it comes down when someone asks.

## Why this replaced "never scraped"

The original rule was: *owned, licensed or business-provided only — never
scraped.* It is a clean rule and it describes a publication with a photographer
on staff.

This one is run by one person. Asking two hundred pizzerias for a photograph and
driving to the ones who do not reply is not a workflow; it is the reason the
site would have no pictures. A rule nobody can follow does not protect anyone —
it just gets quietly broken, which is worse than a narrower rule that is
actually kept.

So the standard changed shape rather than disappearing. We may use an image from
a business's own public channels **to identify that business**, and in exchange
we accept obligations that are real and enforced in the CMS: we host our own
copy, we record where it came from, we never claim it as ours, and we take it
down on request without arguing.

## The tiers

Prefer, in order. Do not drop a tier because it is quicker.

**Tier 1 — ours, or given to us**

- `original` — we shot it. No restrictions.
- `business_provided` — sent to us to use. Permission ends if the relationship
  does, so note who provided it and when.
- `licensed` — paid for. Record the terms in the credit so they can be produced
  later.

**Tier 2 — the business's own public channels**

- `official_website`
- `official_instagram`
- `official_facebook`

Used to show the business the image depicts. The website is preferred over
social: it is more stable, more clearly the business speaking for itself, and
less likely to be a repost of a customer's photo.

**Tier 3 — anything else**

- `other_editorial_source`

Lands as **Needs review** and will not publish until a person clears it. That is
the default the importer assigns, not a flag someone has to remember to raise.

## Rules that do not bend

- **Never hotlink.** The importer downloads the file into our own bucket. A
  hotlink spends someone else's bandwidth, breaks when they reorganise their
  CDN, and lets them change what our page shows.
- **Never claim ownership.** `source` records what it is. We do not mark a
  business's photograph as `original`.
- **Never remove a watermark, credit or signature.** If an image is watermarked,
  it ships watermarked or it does not ship.
- **Never present a generic image as the named business.** A stock photograph of
  a pizza on a business's profile implies it is *that* pizzeria's pizza. If we do
  not have a picture of the place, the branded placeholder is the honest answer
  and it is always available.
- **Prefer an official source over a customer's photo.** Where a business has
  published its own image, a third-party listing photo or a customer upload is
  never the better choice.
- **Record the source page, not just the image.** A CDN image URL rots. The page
  a person can open to check the claim is what survives.

## What gets stored

Every imported asset carries its provenance on the `media_assets` row:

| Field | What it holds |
| --- | --- |
| `source` | Which tier value above |
| `source_url` | The image file we fetched, after redirects |
| `source_page_url` | The page it was found on — required for tiers 2 and 3 |
| `credit` | Any credit line to display |
| `review_state` | `ok`, `needs_review`, or `taken_down` |
| `review_note` | Why a review was cleared |

Rights travel with the **asset**, not with the record using it. One correction
fixes every list the image appears on.

## Importing an image

On any image control: **Add from URL**.

1. Paste the image URL.
2. Choose where it came from.
3. Add the source page URL (required for tiers 2 and 3).
4. Add a credit if one is expected.

The server downloads the file, verifies it really is a JPEG, PNG, WebP or AVIF
by reading its magic bytes rather than trusting the content type, stores it in
our bucket under a path we choose, and records the provenance. If the record
already has an image, replacing it takes a second, explicit tick — an automated
pass must not silently overwrite a photograph somebody chose.

Requests are refused to loopback, private and link-local addresses, including
the cloud metadata endpoint, both before the fetch and again after redirects.

## Takedown

Anyone may ask us to remove an image. The answer is yes.

In the media library, **Take down** on the asset:

1. Writes a `media_takedowns` row — filename, source, both URLs, reason, who
   actioned it. This is written **first** and outlives everything else.
2. Deletes the `media_assets` row, which detaches it from every record that used
   it automatically (each reference is `on delete set null`).
3. Removes the object from storage, so the file stops being served rather than
   merely stopping being linked.

The log is the point. It is the answer to "you ignored us", and it is what stops
the same URL being re-imported next month by someone who never heard about the
complaint.

**Replacement** is the ordinary import flow: add another image from a tier the
complaint does not touch, or leave the placeholder. Never re-import a taken-down
URL.

## Review queue

`review_state = 'needs_review'` means a person has not yet agreed to this image.
Clear it only after looking at the actual picture and confirming it depicts the
named business and comes from where the record says. Clearing without looking is
the failure this field exists to prevent.

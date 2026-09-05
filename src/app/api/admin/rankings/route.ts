import { NextResponse } from "next/server";
import { z } from "zod";

import { businessSlug, slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a draft ranking from selected research candidates.
 *
 * For each candidate we upsert a business row, record the third-party
 * identifier in external_business_refs (id, url, timestamp only — no ratings or
 * review counts are persisted), and create a ranking entry at the chosen
 * position.
 *
 * The ranking is always created as a DRAFT. An editor writes the reasoning and
 * publishes deliberately; nothing reaches the public site straight from a
 * third-party search.
 */

const candidateSchema = z.object({
  externalId: z.string().min(1),
  provider: z.literal("yelp"),
  name: z.string().min(1).max(200),
  city: z.string().max(120).nullable(),
  county: z.string().max(120).nullable(),
  address: z.string().max(300).nullable(),
  zip: z.string().max(20).nullable(),
  phone: z.string().max(40).nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  externalUrl: z.string().max(500).nullable(),
});

const requestSchema = z.object({
  title: z.string().trim().min(4).max(200),
  slug: z.string().trim().max(100).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  placeId: z.string().uuid().nullable().optional(),
  geography: z.string().trim().max(120).optional(),
  candidates: z.array(candidateSchema).min(1).max(50),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid ranking." },
      { status: 400 },
    );
  }

  const { title, categoryId, placeId, geography, candidates } = parsed.data;

  // ---------------------------------------------------------------- ranking
  const { data: existingSlugs } = await supabase.from("rankings").select("slug");
  const takenRankingSlugs = new Set(
    (existingSlugs ?? []).map((row: { slug: string }) => row.slug),
  );

  const rankingSlug = uniqueSlug(
    parsed.data.slug ? slugify(parsed.data.slug) : slugify(title),
    takenRankingSlugs,
  );

  const { data: ranking, error: rankingError } = await supabase
    .from("rankings")
    .insert({
      title,
      slug: rankingSlug,
      category_id: categoryId ?? null,
      place_id: placeId ?? null,
      geography: geography ?? null,
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (rankingError || !ranking) {
    return NextResponse.json(
      { error: "Could not create the ranking." },
      { status: 500 },
    );
  }

  // ------------------------------------------------------------- businesses
  const { data: existingBusinessSlugs } = await supabase
    .from("businesses")
    .select("slug");
  const takenBusinessSlugs = new Set(
    (existingBusinessSlugs ?? []).map((row: { slug: string }) => row.slug),
  );

  // A business already researched for another list should be reused, not
  // duplicated — match on the third-party id we recorded last time.
  const { data: existingRefs } = await supabase
    .from("external_business_refs")
    .select("external_id, business_id")
    .eq("provider", "yelp")
    .in(
      "external_id",
      candidates.map((candidate) => candidate.externalId),
    );

  const refByExternalId = new Map(
    ((existingRefs ?? []) as { external_id: string; business_id: string }[]).map(
      (row) => [row.external_id, row.business_id],
    ),
  );

  const entries: {
    ranking_id: string;
    business_id: string;
    position: number;
  }[] = [];

  for (const [index, candidate] of candidates.entries()) {
    let businessId: string | undefined = refByExternalId.get(candidate.externalId);

    if (!businessId) {
      const slug = uniqueSlug(
        businessSlug(candidate.name, candidate.city),
        takenBusinessSlugs,
      );
      takenBusinessSlugs.add(slug);

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .insert({
          name: candidate.name,
          slug,
          address: candidate.address,
          city: candidate.city,
          county: candidate.county,
          zip: candidate.zip,
          phone: candidate.phone,
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          category_id: categoryId ?? null,
          status: "draft",
        })
        .select("id")
        .single();

      if (businessError || !business) continue;
      businessId = business.id as string;

      // Provenance only. Ratings and review counts are deliberately not stored.
      await supabase.from("external_business_refs").insert({
        business_id: businessId,
        provider: candidate.provider,
        external_id: candidate.externalId,
        external_url: candidate.externalUrl,
        last_synced_at: new Date().toISOString(),
      });
    }

    // Defensive: a candidate whose insert failed was skipped above, so this
    // should always hold — but the push needs a definite id either way.
    if (!businessId) continue;

    entries.push({
      ranking_id: ranking.id,
      business_id: businessId,
      position: index + 1,
    });
  }

  if (entries.length > 0) {
    const { error: entriesError } = await supabase
      .from("ranking_entries")
      .insert(entries);

    if (entriesError) {
      return NextResponse.json(
        {
          error:
            "The ranking was created but its entries failed to save. Open it and re-add them.",
          id: ranking.id,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { id: ranking.id, slug: ranking.slug, entries: entries.length },
    { status: 201 },
  );
}

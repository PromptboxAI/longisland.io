import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { fieldErrors, nominationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = nominationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields.",
        fields: fieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Nominations are not connected yet. Add Supabase credentials to .env.local.",
      },
      { status: 503 },
    );
  }

  const { data } = parsed;

  const { error } = await supabase.from("nominations").insert({
    business_name: data.businessName,
    town: data.town,
    category: data.category,
    website: data.websiteUrl || null,
    reason: data.reason,
    submitter_name: data.submitterName || null,
    email: data.email.toLowerCase(),
    status: "new",
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not submit your nomination. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

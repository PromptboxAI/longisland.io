import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { fieldErrors, leadSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(payload);
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
          "The contact form is not connected yet. Add Supabase credentials to .env.local.",
      },
      { status: 503 },
    );
  }

  const { data } = parsed;

  const { error } = await supabase.from("leads").insert({
    type: "advertiser",
    name: data.name,
    business_name: data.businessName,
    email: data.email.toLowerCase(),
    phone: data.phone || null,
    website: data.websiteUrl || null,
    category: data.category || null,
    interest: data.interest,
    budget: data.budget || null,
    message: data.message || null,
    status: "new",
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not send your message. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

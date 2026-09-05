import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { newsletterSchema } from "@/lib/validation";

/**
 * Newsletter signup.
 *
 * Inserts with the anon client, so the public-insert RLS policy is what
 * authorises the write — the service-role key is never needed here.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check your email address." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Signups are not connected yet. Add Supabase credentials to .env.local.",
      },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("email_subscribers").insert({
    email: parsed.data.email.toLowerCase(),
    source: parsed.data.source ?? "site",
  });

  // 23505 is a unique violation: already subscribed. Report success — telling a
  // visitor their address is already on the list leaks who is subscribed.
  if (error && error.code !== "23505") {
    return NextResponse.json(
      { error: "Could not complete signup. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

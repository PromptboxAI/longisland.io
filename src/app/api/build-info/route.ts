import { NextResponse } from "next/server";

/**
 * Which commit is actually serving this request.
 *
 * Written because a regression audit could not answer that question. Production
 * had drifted fourteen commits behind main, so behaviour that passed locally
 * kept failing on the live site — and the only way to tell was to fingerprint
 * the deployed CSS and guess. That is not a thing anyone should have to do
 * twice.
 *
 * A commit SHA is not a secret: it identifies a build, and knowing it grants
 * nothing. Everything here comes from Vercel's own system environment
 * variables, and nothing reads a value the platform did not set. There is a
 * deliberate no-op default so this endpoint says "unknown" on a local run
 * rather than leaking a developer's environment.
 *
 * Deliberately NOT included: any key, any connection string, any variable this
 * application defines for itself. The rule is that a value appears here only if
 * Vercel set it and it names a build.
 */

export const dynamic = "force-dynamic";

export function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  return NextResponse.json(
    {
      commit: sha,
      commitShort: sha ? sha.slice(0, 7) : null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
      environment: process.env.VERCEL_ENV ?? "local",
      deploymentUrl: process.env.VERCEL_URL ?? null,
      /*
       * Whether the features that need a key are actually wired here.
       *
       * Booleans only — never the values, never a prefix, never a length. This
       * exists because "AI drafting is not configured" on production had no
       * diagnosis short of signing in and looking at an editor screen.
       */
      configured: {
        supabase:
          Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
          Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
        supabaseSecret: Boolean(process.env.SUPABASE_SECRET_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        yelp: Boolean(process.env.YELP_API_KEY),
      },
    },
    {
      // A cached answer to "what is deployed right now" is worse than useless.
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}

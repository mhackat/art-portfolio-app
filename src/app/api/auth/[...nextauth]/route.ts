import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { checkRateLimit, loginLimit, RATE_LIMIT_WINDOW_MS } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

/** Pulled from a cloned request so the original body is still intact for the
 * NextAuth handler below — form bodies can only be read once otherwise. */
async function extractIdentifier(req: Request): Promise<string | undefined> {
  try {
    const form = await req.formData();
    const identifier = form.get("identifier");
    return typeof identifier === "string" && identifier.length > 0 ? identifier : undefined;
  } catch {
    return undefined;
  }
}

async function POST(req: NextRequest, context: { params: { nextauth: string[] } }) {
  if (context.params.nextauth?.join("/") === "callback/credentials") {
    // Keyed by the account being attempted, not the caller's IP — a shared/unknown
    // IP (e.g. every request from localhost in dev) would otherwise dump every
    // user's login attempts into one bucket and rate-limit each other out.
    const identifier = await extractIdentifier(req.clone());
    if (identifier) {
      const rateLimit = await checkRateLimit(
        "login-identifier",
        identifier.toLowerCase(),
        loginLimit(),
        RATE_LIMIT_WINDOW_MS
      );
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { message: "Too many login attempts. Please try again later." },
          { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
      }
    }
  }

  return handler(req, context);
}

export { handler as GET, POST };

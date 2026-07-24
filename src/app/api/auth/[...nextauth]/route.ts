import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

async function POST(req: NextRequest, context: { params: { nextauth: string[] } }) {
  if (context.params.nextauth?.join("/") === "callback/credentials") {
    const rateLimit = await checkRateLimit("login-ip", getClientIp(req), LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }
  }

  return handler(req, context);
}

export { handler as GET, POST };

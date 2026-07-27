import { prisma } from "@/lib/prisma";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Production is the only place the tight limits apply.
 *
 * `VERCEL_ENV` is set by the platform on every deployment and can't be
 * forgotten, so it's checked first: a missing or mistyped APP_ENV then can't
 * quietly relax the real site. APP_ENV is still honoured so a self-hosted or
 * non-Vercel production deployment can declare itself.
 */
function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production";
}

/**
 * Resolves a limit from an optional explicit override, falling back to a strict
 * production default or a relaxed one everywhere else.
 *
 * The relaxed defaults exist because local and test environments run an
 * automated suite that logs in repeatedly as the same handful of identities. At
 * production's numbers the limiter stops the tests rather than an attacker —
 * and a suite that fails for reasons unrelated to the code under test is worse
 * than no suite, because people learn to ignore it.
 */
function resolveLimit(overrideVar: string, productionDefault: number, relaxedDefault: number): number {
  const override = Number(process.env[overrideVar]);
  if (Number.isFinite(override) && override > 0) return Math.floor(override);

  return isProduction() ? productionDefault : relaxedDefault;
}

/** Failed logins per identifier per window. */
export function loginLimit(): number {
  return resolveLimit("RATE_LIMIT_LOGIN_MAX", 10, 200);
}

/** Signup attempts per email per window. */
export function signupLimit(): number {
  return resolveLimit("RATE_LIMIT_SIGNUP_MAX", 5, 100);
}

/**
 * Sliding-window rate limit backed by Postgres (not in-memory), so it stays correct
 * across dev server restarts and across multiple server instances in production.
 */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = `${bucket}:${identifier}`;
  const windowStart = new Date(Date.now() - windowMs);

  await prisma.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: windowStart } } });

  const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: windowStart } } });

  if (count >= limit) {
    const oldest = await prisma.rateLimitHit.findFirst({
      where: { key, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
    });
    const retryAfterMs = oldest ? oldest.createdAt.getTime() + windowMs - Date.now() : windowMs;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  await prisma.rateLimitHit.create({ data: { key } });
  return { allowed: true };
}

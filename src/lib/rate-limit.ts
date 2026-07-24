import { prisma } from "@/lib/prisma";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

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

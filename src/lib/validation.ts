import { z } from "zod";

/**
 * Loose shape checks for route params that get passed straight into a Prisma
 * findUnique/findFirst `where`, so obviously-malformed input fails fast with a clean
 * 400 instead of always falling through to a 404. Deliberately permissive (length only,
 * not a strict cuid/cuid2 format check) since this is fail-fast hygiene, not a security
 * boundary — Prisma's query builder already parameterizes these safely either way.
 */
export const idParamSchema = z.string().min(1).max(50);

export const usernameParamSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[a-zA-Z0-9_-]+$/);

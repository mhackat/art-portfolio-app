import { NextRequest, NextResponse } from "next/server";
import { searchUsers } from "@/lib/discovery";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List or search users by display name
 *     description: >
 *       Public endpoint for browsing artists. Without `q`, returns users ordered by
 *       display name. With `q`, returns users whose display name contains it
 *       (case-insensitive).
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Filter by display name (case-insensitive substring match)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max results (default 50, max 100)
 *     responses:
 *       200:
 *         description: Matching users, each with their latest artwork image if any
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || undefined;

  const limitParam = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const users = await searchUsers(q, limit);

  const publicUsers = users.map(({ displayName, latestArtworkImageUrl }) => ({
    displayName,
    latestArtworkImageUrl,
  }));

  return NextResponse.json(publicUsers);
}

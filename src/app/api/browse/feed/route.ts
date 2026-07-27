import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getShuffledArtworkFeed, FEED_MAX_LIMIT } from "@/lib/discovery";

const querySchema = z.object({
  seed: z.string().min(1).max(64),
  // Shape is validated in the data layer, which falls back to "from the start"
  // on anything it doesn't recognise — so a mangled cursor can't 500.
  cursor: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(FEED_MAX_LIMIT).optional(),
});

const DEFAULT_LIMIT = 10;

/**
 * @swagger
 * /api/browse/feed:
 *   get:
 *     summary: A shuffled page of artworks with their artists
 *     description: >
 *       Public, unauthenticated feed backing the browse gallery. Ordering is
 *       deterministic for a given `seed`, so paging through it never repeats or
 *       skips an artwork; use a fresh seed to reshuffle. Paging is by keyset —
 *       pass the previous response's `nextCursor`. Artists are interleaved, so
 *       the opening pages carry one piece from each before anyone's second,
 *       and artists with no artwork never appear.
 *     tags: [Discovery]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: seed
 *         required: true
 *         schema:
 *           type: string
 *         description: Shuffle seed. Any stable string; reuse it across pages of one session.
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema:
 *           type: string
 *         description: The `nextCursor` from the previous page. Omit for the first page.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 24
 *     responses:
 *       200:
 *         description: A page of artworks
 *       400:
 *         description: Invalid query parameters
 */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    seed: req.nextUrl.searchParams.get("seed") ?? undefined,
    cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid query parameters.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { seed, cursor, limit } = parsed.data;
  const page = await getShuffledArtworkFeed(seed, cursor ?? null, limit ?? DEFAULT_LIMIT);

  return NextResponse.json(page);
}

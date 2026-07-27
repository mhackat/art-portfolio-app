import { prisma } from "@/lib/prisma";

export type UserCard = {
  id: string;
  username: string;
  displayName: string;
  latestArtworkImageUrl: string | null;
};

async function withLatestArtwork(userIds: string[]): Promise<Map<string, UserCard>> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      displayName: true,
      artworks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { imageUrl: true },
      },
    },
  });

  const byId = new Map<string, UserCard>();
  for (const user of users) {
    byId.set(user.id, {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      latestArtworkImageUrl: user.artworks[0]?.imageUrl ?? null,
    });
  }
  return byId;
}

export async function getRandomUsersWithLatestArtwork(limit: number): Promise<UserCard[]> {
  const randomIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "public"."User" ORDER BY RANDOM() LIMIT ${limit}
  `;
  if (randomIds.length === 0) return [];

  const byId = await withLatestArtwork(randomIds.map((r) => r.id));
  return randomIds.map((r) => byId.get(r.id)).filter((u): u is UserCard => Boolean(u));
}

export type FeedItem = {
  id: string;
  title: string;
  imageUrl: string;
  username: string;
  displayName: string;
  /** Opaque keyset cursor — pass the last item's value back to fetch the next page. */
  cursor: string;
};

export type FeedPage = {
  items: FeedItem[];
  nextCursor: string | null;
};

/** Upper bound on a single request, so a hand-crafted `limit` can't ask for the
 * whole table. */
export const FEED_MAX_LIMIT = 24;

/** Cursor is `<round>:<hash>` — see getShuffledArtworkFeed for why it's a pair. */
const CURSOR_PATTERN = /^(\d{1,6}):([0-9a-f]{32})$/;

function parseCursor(cursor: string | null): { round: number; hash: string } {
  const match = cursor ? CURSOR_PATTERN.exec(cursor) : null;
  // Round numbering starts at 1, and every md5 digest sorts above the empty
  // string, so (0, "") is the "from the beginning" position.
  return match ? { round: Number(match[1]), hash: match[2] } : { round: 0, hash: "" };
}

/**
 * A shuffled page of artworks for /browse, joined to the artist who owns each one.
 *
 * Design notes, since "random", "varied" and "paginated" usually fight each other:
 *
 *  - Shuffling is `md5(artwork id || seed)`. Within one seed that order is fixed,
 *    so paging through it can't repeat or skip a row the way `ORDER BY RANDOM()`
 *    would when re-evaluated per request. A fresh seed per visit is what makes
 *    the feed feel different each time.
 *  - Artists are interleaved rather than capped. A window function numbers each
 *    artist's pieces in shuffled order, and the feed sorts by that number first:
 *    round 1 is one piece from every artist, round 2 a second from everyone who
 *    has one, and so on. Variety is highest exactly where it matters — the first
 *    screenful — while nothing is permanently hidden, so scrolling doesn't
 *    dead-end early just because one account owns half the gallery.
 *  - Paging is keyset, not OFFSET, over the (round, hash) pair that ordering
 *    implies. Page 10 costs what page 1 costs instead of scanning past every row
 *    before it.
 *  - Starting from Artwork and inner-joining User means artists with no artwork
 *    are excluded by construction — no separate existence check, no empty tiles.
 *
 * One round trip, no N+1: the artist for every row arrives with it.
 */
export async function getShuffledArtworkFeed(
  seed: string,
  cursor: string | null,
  limit: number
): Promise<FeedPage> {
  const take = Math.min(Math.max(1, Math.floor(limit) || 1), FEED_MAX_LIMIT);
  const { round, hash } = parseCursor(cursor);

  // Fetch one extra row purely to answer "is there another page?" without a
  // second count query.
  const rows = await prisma.$queryRaw<
    {
      id: string;
      title: string;
      imageUrl: string;
      username: string;
      displayName: string;
      shuffle: string;
      round: number;
    }[]
  >`
    WITH ranked AS (
      SELECT
        a."id",
        a."title",
        a."imageUrl",
        a."userId",
        md5(a."id" || ${seed}) AS shuffle,
        -- Cast to int so the driver hands back a JS number rather than a BigInt,
        -- which JSON.stringify refuses to serialize.
        (ROW_NUMBER() OVER (
          PARTITION BY a."userId"
          ORDER BY md5(a."id" || ${seed})
        ))::int AS round
      FROM "public"."Artwork" a
    )
    SELECT r."id", r."title", r."imageUrl", r."shuffle", r."round", u."username", u."displayName"
    FROM ranked r
    JOIN "public"."User" u ON u."id" = r."userId"
    WHERE (r."round", r."shuffle") > (${round}::int, ${hash})
    ORDER BY r."round", r."shuffle"
    LIMIT ${take + 1}
  `;

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const toCursor = (row: { round: number; shuffle: string }) => `${row.round}:${row.shuffle}`;

  return {
    items: page.map((row) => ({
      id: row.id,
      title: row.title,
      imageUrl: row.imageUrl,
      username: row.username,
      displayName: row.displayName,
      cursor: toCursor(row),
    })),
    nextCursor: hasMore ? toCursor(page[page.length - 1]) : null,
  };
}

export async function searchUsers(query: string | undefined, limit: number): Promise<UserCard[]> {
  const users = await prisma.user.findMany({
    where: query ? { displayName: { contains: query, mode: "insensitive" } } : undefined,
    orderBy: { displayName: "asc" },
    take: limit,
    select: {
      id: true,
      username: true,
      displayName: true,
      artworks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { imageUrl: true },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    latestArtworkImageUrl: user.artworks[0]?.imageUrl ?? null,
  }));
}

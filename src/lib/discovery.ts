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

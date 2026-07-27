import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ProfileShowcase from "@/components/profile/ProfileShowcase";

export const dynamic = "force-dynamic";

/** Cached per request so generateMetadata and the page body share one query
 * instead of each hitting the database for the same profile. */
const getProfile = cache(async (username: string) => {
  return prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      displayName: true,
      bio: true,
      artworks: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, description: true, imageUrl: true },
      },
    },
  });
});

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const user = await getProfile(params.username);
  if (!user) return { title: "Not found — Art Portfolio" };

  return {
    title: `${user.displayName} — Art Portfolio`,
    description: user.bio || `Work by ${user.displayName} (@${user.username}).`,
  };
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const user = await getProfile(params.username);

  if (!user) {
    notFound();
  }

  return (
    <ProfileShowcase
      displayName={user.displayName}
      username={user.username}
      bio={user.bio}
      artworks={user.artworks}
    />
  );
}

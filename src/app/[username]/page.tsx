import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ArtworkGallery from "@/components/profile/ArtworkGallery";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
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

  if (!user) {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16" data-testid="profile-page">
      <h1 data-testid="profile-displayname" className="text-2xl font-semibold">
        {user.displayName}
      </h1>
      <p className="text-sm text-gray-500">@{user.username}</p>
      {user.bio ? (
        <p data-testid="profile-bio" className="mt-3 text-gray-700">
          {user.bio}
        </p>
      ) : null}

      <ArtworkGallery artworks={user.artworks} />
    </main>
  );
}

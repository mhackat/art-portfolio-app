import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdminUserId } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import DeleteArtworkButton from "@/components/admin/DeleteArtworkButton";
import DeleteAllArtworksButton from "@/components/admin/DeleteAllArtworksButton";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleDateString();
}

/**
 * Moderation view for one user's gallery. Lives on its own page rather than in
 * the admin tabs because deleting a piece responsibly means seeing it first,
 * and thumbnails don't fit a table row.
 */
export default async function AdminUserArtworksPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id as string | undefined;

  if (!viewerId) {
    redirect("/login");
  }

  if (!(await isAdminUserId(viewerId))) {
    return (
      <main className="container mx-auto max-w-3xl px-6 py-16" data-testid="admin-access-denied">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-gray-600">You do not have admin access.</p>
      </main>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      artworks: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, description: true, imageUrl: true, createdAt: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-7xl px-6 py-16" data-testid="admin-user-artworks-page">
      <Link href="/admin?tab=users" data-testid="admin-back-link" className="text-sm underline">
        ← Back to admin
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{user.displayName}&rsquo;s artworks</h1>
          <p className="mt-1 text-sm text-gray-600">
            <Link href={`/${user.username}`} className="underline">
              @{user.username}
            </Link>{" "}
            · {user.email} · {user.artworks.length} artwork{user.artworks.length === 1 ? "" : "s"}
          </p>
        </div>
        <DeleteAllArtworksButton
          userId={user.id}
          displayName={user.displayName}
          artworkCount={user.artworks.length}
        />
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Deleting removes the artwork and its stored image. The account itself is untouched — to remove the user
        entirely, use the delete action on the admin user list.
      </p>

      {user.artworks.length === 0 ? (
        <p className="mt-10 text-sm text-gray-600" data-testid="admin-user-artworks-empty">
          This user has no artworks.
        </p>
      ) : (
        <ul
          data-testid="admin-user-artworks-list"
          className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {user.artworks.map((artwork) => (
            <li
              key={artwork.id}
              data-testid={`admin-artwork-item-${artwork.id}`}
              className="flex flex-col rounded border border-gray-200 p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded object-cover"
              />
              <h2 className="mt-3 truncate text-sm font-medium" title={artwork.title}>
                {artwork.title}
              </h2>
              {artwork.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-gray-600">{artwork.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-gray-400">Added {formatDate(artwork.createdAt)}</p>
              <div className="mt-3">
                <DeleteArtworkButton artworkId={artwork.id} title={artwork.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import Link from "next/link";
import { getRandomUsersWithLatestArtwork } from "@/lib/discovery";

export const dynamic = "force-dynamic";

export default async function Home() {
  const artists = await getRandomUsersWithLatestArtwork(10);

  return (
    <main className="container mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold">Art Portfolio</h1>
      <p className="mt-2 text-gray-600">
        A portfolio and gallery site for artists.{" "}
        <a className="underline" href="/signup">
          Sign up
        </a>{" "}
        to create your gallery, or view API docs at{" "}
        <a className="underline" href="/api-docs">
          /api-docs
        </a>
        .
      </p>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Discover artists</h2>
          <Link href="/browse" data-testid="browse-all-link" className="text-sm underline">
            Browse all artists
          </Link>
        </div>

        {artists.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500" data-testid="discover-empty-state">
            No artists yet — be the first to sign up.
          </p>
        ) : (
          <ul
            data-testid="discover-artist-list"
            className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5"
          >
            {artists.map((artist) => (
              <li key={artist.id} data-testid={`discover-artist-item-${artist.id}`}>
                <Link href={`/${artist.username}`} className="block">
                  {artist.latestArtworkImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.latestArtworkImageUrl}
                      alt={`Latest artwork by ${artist.displayName}`}
                      className="h-32 w-full rounded border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                      No artwork yet
                    </div>
                  )}
                  <p className="mt-1 truncate text-sm font-medium">{artist.displayName}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

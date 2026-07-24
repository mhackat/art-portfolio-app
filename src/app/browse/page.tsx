import Link from "next/link";
import { searchUsers } from "@/lib/discovery";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() || undefined;
  const users = await searchUsers(q, 100);

  return (
    <main className="container mx-auto max-w-4xl px-6 py-16" data-testid="browse-page">
      <h1 className="text-2xl font-semibold">Browse artists</h1>

      <form method="get" data-testid="browse-search-form" className="mt-6 flex gap-2">
        <input
          type="text"
          name="q"
          data-testid="browse-search-input"
          placeholder="Search by display name"
          defaultValue={q ?? ""}
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          data-testid="browse-search-button"
          className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
        >
          Search
        </button>
        {q ? (
          <Link
            href="/browse"
            data-testid="browse-clear-link"
            className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {users.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500" data-testid="browse-empty-state">
          {q ? `No artists found matching "${q}".` : "No artists yet."}
        </p>
      ) : (
        <ul
          data-testid="browse-artist-list"
          className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
        >
          {users.map((user) => (
            <li key={user.id} data-testid={`browse-artist-item-${user.id}`}>
              <Link href={`/${user.username}`} className="block">
                {user.latestArtworkImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.latestArtworkImageUrl}
                    alt={`Latest artwork by ${user.displayName}`}
                    className="h-32 w-full rounded border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                    No artwork yet
                  </div>
                )}
                <p className="mt-1 truncate text-sm font-medium">{user.displayName}</p>
                <p className="truncate text-xs text-gray-500">@{user.username}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

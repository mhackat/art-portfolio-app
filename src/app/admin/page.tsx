import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { isAdminUserId } from "@/lib/authz";
import { listUsersPaginated, listLockedUsersPaginated, listAccessCodes, isSortColumn } from "@/lib/admin";
import GenerateAccessCodeButton from "@/components/admin/GenerateAccessCodeButton";
import UnlockUserButton from "@/components/admin/UnlockUserButton";
import RevokeAllKeysButton from "@/components/admin/RevokeAllKeysButton";
import CleanupImagesButton from "@/components/admin/CleanupImagesButton";
import ResizableUserTable from "@/components/admin/ResizableUserTable";

const PAGE_SIZE = 50;
const LOCKED_PAGE_SIZE = 50;
const ACCESS_CODE_LIMIT = 50;

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleDateString();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; sortBy?: string; sortDir?: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    redirect("/login");
  }

  const isAdmin = await isAdminUserId(userId);
  if (!isAdmin) {
    return (
      <main className="container mx-auto max-w-3xl px-6 py-16" data-testid="admin-access-denied">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-gray-600">You do not have admin access.</p>
      </main>
    );
  }

  const page = Number(searchParams.page) || 1;
  const search = searchParams.q?.trim() || undefined;
  const sortByParam = isSortColumn(searchParams.sortBy) ? searchParams.sortBy : undefined;
  const sortDirParam = searchParams.sortDir === "asc" ? "asc" : undefined;

  const {
    users,
    totalCount,
    totalPages,
    page: currentPage,
    sortBy,
    sortDir,
  } = await listUsersPaginated(page, PAGE_SIZE, { search, sortBy: sortByParam, sortDir: sortDirParam });
  const { users: lockedUsers } = await listLockedUsersPaginated(1, LOCKED_PAGE_SIZE);
  const accessCodes = await listAccessCodes(ACCESS_CODE_LIMIT);

  // Preserves search/sort state across pagination and column-sort links.
  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { page: String(currentPage), q: search, sortBy, sortDir, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    return `/admin?${params.toString()}`;
  }

  return (
    <main className="container mx-auto max-w-7xl px-6 py-16" data-testid="admin-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin — Users</h1>
          <p className="mt-1 text-sm text-gray-600">
            {totalCount} total user{totalCount === 1 ? "" : "s"} · page {currentPage} of {totalPages}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <RevokeAllKeysButton />
          <CleanupImagesButton />
        </div>
      </div>

      <section className="mt-8" data-testid="admin-access-codes-section">
        <h2 className="text-lg font-medium">Signup access codes</h2>
        <p className="mt-1 text-sm text-gray-600">
          Signup is invite-only. Generate a one-time code and send it to the person requesting an account — they
          enter it on the sign-up page. Each code works for exactly one account.
        </p>

        <div className="mt-3">
          <GenerateAccessCodeButton />
        </div>

        {accessCodes.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No access codes generated yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {accessCodes.map((code) => (
              <li
                key={code.id}
                data-testid={`admin-access-code-row-${code.id}`}
                className={`flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm ${
                  code.usedAt ? "border-gray-200 bg-gray-50 text-gray-600" : "border-green-200 bg-green-50"
                }`}
              >
                <span>
                  <code>{code.codePrefix}…</code>
                  {code.note ? <span className="ml-2 text-gray-700">— {code.note}</span> : null}
                  <span className="ml-2 text-xs text-gray-500">issued {formatDate(code.createdAt)}</span>
                </span>
                <span className="shrink-0 text-xs">
                  {code.usedAt
                    ? `Used ${formatDate(code.usedAt)}${code.usedBy ? ` by @${code.usedBy.username}` : ""}`
                    : "Unused"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" data-testid="admin-locked-users-section">
        <h2 className="text-lg font-medium">Locked accounts</h2>
        {lockedUsers.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No locked accounts.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lockedUsers.map((user) => (
              <li
                key={user.id}
                data-testid={`admin-locked-user-row-${user.id}`}
                className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
              >
                <span>
                  <strong>{user.displayName}</strong> (@{user.username}, {user.email}) — locked{" "}
                  {user.lockReason === "admin" ? "by an admin" : "after too many failed login attempts"} on{" "}
                  {formatDate(user.lockedAt)}
                </span>
                <UnlockUserButton userId={user.id} displayName={user.displayName} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">All users</h2>
        <form action="/admin" method="GET" className="flex items-center gap-2" data-testid="admin-search-form">
          {sortBy !== "createdAt" ? <input type="hidden" name="sortBy" value={sortBy} /> : null}
          {sortDir !== "desc" ? <input type="hidden" name="sortDir" value={sortDir} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search name, username, or email"
            data-testid="admin-search-input"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            data-testid="admin-search-submit"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Search
          </button>
          {search ? (
            <Link href={buildQuery({ q: undefined, page: "1" })} data-testid="admin-search-clear" className="text-sm underline">
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      <div className="mt-3">
        <ResizableUserTable users={users} currentUserId={userId} search={search} sortBy={sortBy} sortDir={sortDir} />
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        {currentPage > 1 ? (
          <Link
            href={buildQuery({ page: String(currentPage - 1) })}
            data-testid="admin-prev-page-link"
            className="underline"
          >
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {currentPage < totalPages ? (
          <Link
            href={buildQuery({ page: String(currentPage + 1) })}
            data-testid="admin-next-page-link"
            className="underline"
          >
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}

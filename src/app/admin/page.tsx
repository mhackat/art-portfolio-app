import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { isAdminUserId } from "@/lib/authz";
import {
  listUsersPaginated,
  listLockedUsersPaginated,
  listAccessCodesPaginated,
  isSortColumn,
} from "@/lib/admin";
import GenerateAccessCodeButton from "@/components/admin/GenerateAccessCodeButton";
import RevokeAccessCodeButton from "@/components/admin/RevokeAccessCodeButton";
import RevokeUnusedCodesButton from "@/components/admin/RevokeUnusedCodesButton";
import SeedArtistsButton from "@/components/admin/SeedArtistsButton";
import UnlockUserButton from "@/components/admin/UnlockUserButton";
import RevokeAllKeysButton from "@/components/admin/RevokeAllKeysButton";
import CleanupImagesButton from "@/components/admin/CleanupImagesButton";
import ResizableUserTable from "@/components/admin/ResizableUserTable";

const PAGE_SIZE = 50;
const LOCKED_PAGE_SIZE = 50;
const CODE_PAGE_SIZE = 25;

export const dynamic = "force-dynamic";

const TABS = [
  { id: "users", label: "Users" },
  { id: "codes", label: "Sign-up codes" },
  { id: "tools", label: "Tools" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: unknown): value is TabId {
  return typeof value === "string" && TABS.some((t) => t.id === value);
}

function formatDate(value: Date) {
  return value.toLocaleDateString();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: {
    tab?: string;
    page?: string;
    codePage?: string;
    q?: string;
    sortBy?: string;
    sortDir?: string;
  };
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

  // Tab lives in the URL rather than component state, so a given view is
  // linkable and survives the refresh every mutating control triggers.
  const tab: TabId = isTabId(searchParams.tab) ? searchParams.tab : "users";

  const search = searchParams.q?.trim() || undefined;
  const sortByParam = isSortColumn(searchParams.sortBy) ? searchParams.sortBy : undefined;
  const sortDirParam = searchParams.sortDir === "asc" ? "asc" : undefined;

  // Only query what the visible tab needs.
  const userData =
    tab === "users"
      ? await listUsersPaginated(Number(searchParams.page) || 1, PAGE_SIZE, {
          search,
          sortBy: sortByParam,
          sortDir: sortDirParam,
        })
      : null;
  const lockedData = tab === "users" ? await listLockedUsersPaginated(1, LOCKED_PAGE_SIZE) : null;
  const codeData =
    tab === "codes" ? await listAccessCodesPaginated(Number(searchParams.codePage) || 1, CODE_PAGE_SIZE) : null;

  /** Keeps tab, search and sort state intact across every link on the page. */
  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      tab,
      page: searchParams.page,
      codePage: searchParams.codePage,
      q: search,
      sortBy: sortByParam,
      sortDir: sortDirParam,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    return `/admin?${params.toString()}`;
  }

  return (
    <main className="container mx-auto max-w-7xl px-6 py-16" data-testid="admin-page">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-gray-200" data-testid="admin-tabs">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              // Dropping page/codePage on a tab switch: page 7 of the user list
              // means nothing once you're looking at codes.
              href={buildQuery({ tab: t.id, page: undefined, codePage: undefined })}
              data-testid={`admin-tab-${t.id}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
                active
                  ? "border-gray-900 font-medium text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* ---------------------------------------------------------------- USERS */}
      {tab === "users" && userData && lockedData ? (
        <div data-testid="admin-users-tab">
          <section className="mt-8" data-testid="admin-locked-users-section">
            <h2 className="text-lg font-medium">Locked accounts</h2>
            {lockedData.users.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">No locked accounts.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {lockedData.users.map((user) => (
                  <li
                    key={user.id}
                    data-testid={`admin-locked-user-row-${user.id}`}
                    className="flex items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
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

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">All users</h2>
              <p className="mt-1 text-sm text-gray-600">
                {userData.totalCount} total user{userData.totalCount === 1 ? "" : "s"} · page {userData.page} of{" "}
                {userData.totalPages}
              </p>
            </div>
            <form action="/admin" method="GET" className="flex items-center gap-2" data-testid="admin-search-form">
              <input type="hidden" name="tab" value="users" />
              {sortByParam ? <input type="hidden" name="sortBy" value={sortByParam} /> : null}
              {sortDirParam ? <input type="hidden" name="sortDir" value={sortDirParam} /> : null}
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
                <Link
                  href={buildQuery({ q: undefined, page: "1" })}
                  data-testid="admin-search-clear"
                  className="text-sm underline"
                >
                  Clear
                </Link>
              ) : null}
            </form>
          </div>

          <div className="mt-3">
            <ResizableUserTable
              users={userData.users}
              currentUserId={userId}
              search={search}
              sortBy={userData.sortBy}
              sortDir={userData.sortDir}
            />
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            {userData.page > 1 ? (
              <Link
                href={buildQuery({ page: String(userData.page - 1) })}
                data-testid="admin-prev-page-link"
                className="underline"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {userData.page < userData.totalPages ? (
              <Link
                href={buildQuery({ page: String(userData.page + 1) })}
                data-testid="admin-next-page-link"
                className="underline"
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- CODES */}
      {tab === "codes" && codeData ? (
        <div data-testid="admin-codes-tab">
          <section className="mt-8">
            <h2 className="text-lg font-medium">Sign-up codes</h2>
            <p className="mt-1 text-sm text-gray-600">
              Sign-up is invite-only. Generate a one-time code and send it to whoever is asking for an account.
              Each code works for exactly one sign-up, and the full value is shown only once, at generation.
            </p>

            <div className="mt-4">
              <GenerateAccessCodeButton />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                {codeData.unusedCount} outstanding · {codeData.totalCount} total · page {codeData.page} of{" "}
                {codeData.totalPages}
              </p>
              <RevokeUnusedCodesButton unusedCount={codeData.unusedCount} />
            </div>

            {codeData.codes.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600" data-testid="admin-codes-empty">
                No access codes generated yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {codeData.codes.map((code) => (
                  <li
                    key={code.id}
                    data-testid={`admin-access-code-row-${code.id}`}
                    className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded border px-3 py-2 text-sm ${
                      code.usedAt ? "border-gray-200 bg-gray-50 text-gray-600" : "border-green-200 bg-green-50"
                    }`}
                  >
                    <span>
                      <code>{code.codePrefix}…</code>
                      {code.note ? <span className="ml-2 text-gray-700">— {code.note}</span> : null}
                      <span className="ml-2 text-xs text-gray-500">issued {formatDate(code.createdAt)}</span>
                    </span>

                    <span className="flex shrink-0 items-center gap-3 text-xs">
                      {code.usedAt ? (
                        <span>
                          Used {formatDate(code.usedAt)}
                          {code.usedBy ? (
                            <>
                              {" by "}
                              <Link
                                href={`/${code.usedBy.username}`}
                                data-testid={`admin-code-user-link-${code.id}`}
                                className="underline hover:text-gray-900"
                              >
                                @{code.usedBy.username}
                              </Link>
                            </>
                          ) : (
                            // The account was deleted; the code stays as the record it was spent.
                            " by a since-deleted account"
                          )}
                        </span>
                      ) : (
                        <>
                          <span className="font-medium text-green-800">Unused</span>
                          <RevokeAccessCodeButton codeId={code.id} codePrefix={code.codePrefix} />
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex items-center justify-between text-sm">
              {codeData.page > 1 ? (
                <Link
                  href={buildQuery({ codePage: String(codeData.page - 1) })}
                  data-testid="admin-codes-prev-link"
                  className="underline"
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              {codeData.page < codeData.totalPages ? (
                <Link
                  href={buildQuery({ codePage: String(codeData.page + 1) })}
                  data-testid="admin-codes-next-link"
                  className="underline"
                >
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </div>
          </section>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- TOOLS */}
      {tab === "tools" ? (
        <div data-testid="admin-tools-tab" className="mt-8 space-y-8">
          <section>
            <h2 className="text-lg font-medium">API authorizations</h2>
            <p className="mt-1 text-sm text-gray-600">
              Ends every Bearer-token API session across the site at once, including your own if you are using
              one.
            </p>
            <div className="mt-3">
              <RevokeAllKeysButton />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium">Orphaned images</h2>
            <p className="mt-1 text-sm text-gray-600">
              Reconciles the storage bucket against the database and reports files no artwork points at any
              more.
            </p>
            <div className="mt-3">
              <CleanupImagesButton />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium">Demo content</h2>
            <p className="mt-1 text-sm text-gray-600">
              Populates this environment with believable artists. Runs server-side, so it needs no database or
              storage credentials.
            </p>
            <div className="mt-3">
              <SeedArtistsButton />
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

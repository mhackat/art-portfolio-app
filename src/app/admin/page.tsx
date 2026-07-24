import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { isAdminUserId } from "@/lib/authz";
import { listUsersPaginated, listLockedUsersPaginated } from "@/lib/admin";
import UnlockUserButton from "@/components/admin/UnlockUserButton";
import RevokeAllKeysButton from "@/components/admin/RevokeAllKeysButton";
import ResizableUserTable from "@/components/admin/ResizableUserTable";

const PAGE_SIZE = 50;
const LOCKED_PAGE_SIZE = 50;

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleDateString();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { page?: string };
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
  const { users, totalCount, totalPages, page: currentPage } = await listUsersPaginated(page, PAGE_SIZE);
  const { users: lockedUsers } = await listLockedUsersPaginated(1, LOCKED_PAGE_SIZE);

  return (
    <main className="container mx-auto max-w-7xl px-6 py-16" data-testid="admin-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin — Users</h1>
          <p className="mt-1 text-sm text-gray-600">
            {totalCount} total user{totalCount === 1 ? "" : "s"} · page {currentPage} of {totalPages}
          </p>
        </div>
        <RevokeAllKeysButton />
      </div>

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

      <h2 className="mt-8 text-lg font-medium">All users</h2>
      <div className="mt-3">
        <ResizableUserTable users={users} currentUserId={userId} />
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        {currentPage > 1 ? (
          <Link
            href={`/admin?page=${currentPage - 1}`}
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
            href={`/admin?page=${currentPage + 1}`}
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

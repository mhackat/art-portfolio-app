import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { isAdminUserId } from "@/lib/authz";
import { listUsersPaginated, listLockedUsersPaginated } from "@/lib/admin";
import DeleteUserButton from "@/components/admin/DeleteUserButton";
import LockUserButton from "@/components/admin/LockUserButton";
import UnlockUserButton from "@/components/admin/UnlockUserButton";
import AdminPasswordActions from "@/components/admin/AdminPasswordActions";
import RevokeAllKeysButton from "@/components/admin/RevokeAllKeysButton";

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
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm" data-testid="admin-user-table">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">Display name</th>
              <th className="py-2 pr-4">Username</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Artworks</th>
              <th className="py-2 pr-4">Joined</th>
              <th className="py-2 pr-4">Portfolio</th>
              <th className="py-2 min-w-[180px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} data-testid={`admin-user-row-${user.id}`} className="border-b border-gray-100">
                <td className="py-2 pr-4">{user.displayName}</td>
                <td className="py-2 pr-4">@{user.username}</td>
                <td className="py-2 pr-4">{user.email}</td>
                <td className="py-2 pr-4">{user.artworkCount}</td>
                <td className="py-2 pr-4">{formatDate(user.createdAt)}</td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/${user.username}`}
                    data-testid={`admin-portfolio-link-${user.id}`}
                    className="underline"
                  >
                    View
                  </Link>
                </td>
                <td className="py-3">
                  <div className="flex flex-col items-start gap-2">
                    <DeleteUserButton userId={user.id} displayName={user.displayName} />
                    {user.id !== userId ? (
                      <LockUserButton userId={user.id} displayName={user.displayName} />
                    ) : null}
                    <AdminPasswordActions userId={user.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

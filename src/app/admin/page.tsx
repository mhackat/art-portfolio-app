import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { isAdminUserId } from "@/lib/authz";
import { listUsersPaginated } from "@/lib/admin";
import DeleteUserButton from "@/components/admin/DeleteUserButton";

const PAGE_SIZE = 50;

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

  return (
    <main className="container mx-auto max-w-5xl px-6 py-16" data-testid="admin-page">
      <h1 className="text-2xl font-semibold">Admin — Users</h1>
      <p className="mt-1 text-sm text-gray-600">
        {totalCount} total user{totalCount === 1 ? "" : "s"} · page {currentPage} of {totalPages}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm" data-testid="admin-user-table">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">Display name</th>
              <th className="py-2 pr-4">Username</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Artworks</th>
              <th className="py-2 pr-4">Joined</th>
              <th className="py-2 pr-4">Portfolio</th>
              <th className="py-2">Actions</th>
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
                <td className="py-2">
                  <DeleteUserButton userId={user.id} displayName={user.displayName} />
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

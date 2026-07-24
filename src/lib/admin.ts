import { prisma } from "@/lib/prisma";

export type AdminUserRow = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: Date;
  artworkCount: number;
};

export type PaginatedUsers = {
  users: AdminUserRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

/** pageSize is a parameter (not hardcoded) so pagination math can be exercised with
 * small values against real data without needing to seed dozens of test users. */
export async function listUsersPaginated(page: number, pageSize: number): Promise<PaginatedUsers> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const totalCount = await prisma.user.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(safePage, totalPages);

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      createdAt: true,
      _count: { select: { artworks: true } },
    },
  });

  return {
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      createdAt: u.createdAt,
      artworkCount: u._count.artworks,
    })),
    page: currentPage,
    pageSize,
    totalCount,
    totalPages,
  };
}

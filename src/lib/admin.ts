import { prisma } from "@/lib/prisma";

export type AdminUserRow = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: Date;
  artworkCount: number;
};

export const SORTABLE_COLUMNS = ["displayName", "username", "email", "artworkCount", "createdAt"] as const;
export type SortColumn = (typeof SORTABLE_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

export function isSortColumn(value: unknown): value is SortColumn {
  return typeof value === "string" && (SORTABLE_COLUMNS as readonly string[]).includes(value);
}

export type LockedUserRow = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  lockedAt: Date;
  lockReason: string | null;
};

export type PaginatedUsers = {
  users: AdminUserRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  sortBy: SortColumn;
  sortDir: SortDirection;
};

export type ListUsersOptions = {
  search?: string;
  sortBy?: SortColumn;
  sortDir?: SortDirection;
};

export type PaginatedLockedUsers = {
  users: LockedUserRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

/** pageSize is a parameter (not hardcoded) so pagination math can be exercised with
 * small values against real data without needing to seed dozens of test users. */
export async function listUsersPaginated(
  page: number,
  pageSize: number,
  options: ListUsersOptions = {}
): Promise<PaginatedUsers> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const sortBy = options.sortBy ?? "createdAt";
  const sortDir: SortDirection = options.sortDir === "asc" ? "asc" : "desc";
  const search = options.search?.trim();

  const where = search
    ? {
        OR: [
          { displayName: { contains: search, mode: "insensitive" as const } },
          { username: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  // artworkCount sorts by a relation aggregate, everything else is a plain column —
  // Prisma needs a different orderBy shape for each.
  const orderBy =
    sortBy === "artworkCount"
      ? [{ artworks: { _count: sortDir } }, { id: "desc" as const }]
      : [{ [sortBy]: sortDir }, { id: "desc" as const }];

  const totalCount = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(safePage, totalPages);

  const users = await prisma.user.findMany({
    where,
    orderBy,
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
    sortBy,
    sortDir,
  };
}

/** Same pagination shape as listUsersPaginated, scoped to only locked accounts —
 * expected to be a small, exceptional set, but kept paginated for consistency. */
export async function listLockedUsersPaginated(page: number, pageSize: number): Promise<PaginatedLockedUsers> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const where = { lockedAt: { not: null } } as const;
  const totalCount = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(safePage, totalPages);

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ lockedAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      lockedAt: true,
      lockReason: true,
    },
  });

  return {
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      // Safe to assert non-null: `where` already filters to lockedAt != null.
      lockedAt: u.lockedAt as Date,
      lockReason: u.lockReason,
    })),
    page: currentPage,
    pageSize,
    totalCount,
    totalPages,
  };
}

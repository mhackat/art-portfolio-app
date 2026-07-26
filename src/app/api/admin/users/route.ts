import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { listUsersPaginated, isSortColumn } from "@/lib/admin";

const PAGE_SIZE = 50;

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users, paginated (admin only)
 *     description: >
 *       Supports searching by display name, username, or email (`q`), and sorting by
 *       any of displayName, username, email, artworkCount, or createdAt.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 1-indexed page number (50 users per page)
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Filter by display name, username, or email (case-insensitive substring match)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [displayName, username, email, artworkCount, createdAt]
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: A page of users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 */
export async function GET(req: NextRequest) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("q")?.slice(0, 200) || undefined;
  const sortByParam = searchParams.get("sortBy");
  const sortBy = isSortColumn(sortByParam) ? sortByParam : undefined;
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : undefined;

  const result = await listUsersPaginated(page, PAGE_SIZE, { search, sortBy, sortDir });

  return NextResponse.json(result);
}

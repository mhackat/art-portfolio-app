import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { listUsersPaginated } from "@/lib/admin";

const PAGE_SIZE = 50;

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users, paginated (admin only)
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 1-indexed page number (50 users per page)
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

  const result = await listUsersPaginated(page, PAGE_SIZE);

  return NextResponse.json(result);
}

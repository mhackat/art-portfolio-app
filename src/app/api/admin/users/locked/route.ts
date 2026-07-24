import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { listLockedUsersPaginated } from "@/lib/admin";

const PAGE_SIZE = 50;

const pageQuerySchema = z.coerce.number().int().positive().optional();

/**
 * @swagger
 * /api/admin/users/locked:
 *   get:
 *     summary: List locked user accounts, paginated (admin only)
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 1-indexed page number (50 per page)
 *     responses:
 *       200:
 *         description: A page of locked users
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
  const parsedPage = pageQuerySchema.safeParse(searchParams.get("page") ?? undefined);
  const page = parsedPage.success && parsedPage.data ? parsedPage.data : 1;

  const result = await listLockedUsersPaginated(page, PAGE_SIZE);

  return NextResponse.json(result);
}

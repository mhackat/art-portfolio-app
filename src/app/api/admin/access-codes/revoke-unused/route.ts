import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

/**
 * @swagger
 * /api/admin/access-codes/revoke-unused:
 *   post:
 *     summary: Revoke every outstanding access code (admin only)
 *     description: >
 *       Deletes all codes that have not been redeemed, so none of the ones
 *       currently in circulation can be used to sign up. Codes that have already
 *       been used are left alone — they are the record of which account each one
 *       created, and cannot be redeemed again regardless.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Outstanding codes revoked
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 */
export async function POST(req: NextRequest) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  const { count } = await prisma.accessCode.deleteMany({ where: { usedAt: null } });

  return NextResponse.json({ count });
}

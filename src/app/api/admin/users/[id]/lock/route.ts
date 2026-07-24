import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { lockAccount } from "@/lib/account-lock";
import { idParamSchema } from "@/lib/validation";

/**
 * @swagger
 * /api/admin/users/{id}/lock:
 *   post:
 *     summary: Lock a user account (admin only)
 *     description: >
 *       Locks the account (blocking future logins on both the browser and API) and
 *       immediately revokes every API key it currently has. Admins cannot lock their
 *       own account through this endpoint. Locking an already-locked account is a
 *       no-op that still returns 200.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account locked
 *       400:
 *         description: Invalid id, or cannot lock your own account through this endpoint
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 *       404:
 *         description: User not found
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  if (!idParamSchema.safeParse(params.id).success) {
    return NextResponse.json({ message: "Invalid user id." }, { status: 400 });
  }

  if (params.id === authz.userId) {
    return NextResponse.json({ message: "You cannot lock your own account through this endpoint." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const { lockedAt } = await lockAccount(params.id, "admin");

  return NextResponse.json({ id: params.id, lockedAt: lockedAt.toISOString(), lockReason: "admin" });
}

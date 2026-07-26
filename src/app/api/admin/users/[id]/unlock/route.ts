import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { unlockAccount } from "@/lib/account-lock";
import { idParamSchema } from "@/lib/validation";

/**
 * @swagger
 * /api/admin/users/{id}/unlock:
 *   post:
 *     summary: Unlock a user account (admin only)
 *     description: >
 *       Clears the lock and resets the failed-login counter. Does not restore any API
 *       keys that were revoked when the account was locked — the user (or an admin)
 *       needs to issue new ones.
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
 *         description: Account unlocked
 *       400:
 *         description: Invalid id
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

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  await unlockAccount(params.id);

  return NextResponse.json({ id: params.id, lockedAt: null });
}

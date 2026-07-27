import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { idParamSchema } from "@/lib/validation";

/**
 * @swagger
 * /api/admin/access-codes/{id}:
 *   delete:
 *     summary: Revoke a single unused access code (admin only)
 *     description: >
 *       Deletes an outstanding code so it can no longer be redeemed. Codes that
 *       have already been used are refused: redeeming them again is impossible
 *       anyway, and removing the row would destroy the record of which account
 *       the code created.
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
 *       204:
 *         description: Code revoked
 *       400:
 *         description: Invalid id
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 *       404:
 *         description: Code not found
 *       409:
 *         description: Code has already been used and cannot be revoked
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  if (!idParamSchema.safeParse(params.id).success) {
    return NextResponse.json({ message: "Invalid access code id." }, { status: 400 });
  }

  const code = await prisma.accessCode.findUnique({
    where: { id: params.id },
    select: { id: true, usedAt: true },
  });
  if (!code) {
    return NextResponse.json({ message: "Access code not found." }, { status: 404 });
  }
  if (code.usedAt) {
    return NextResponse.json(
      { message: "This code has already been used, so there is nothing to revoke." },
      { status: 409 }
    );
  }

  // Guarded on usedAt so a redemption landing between the read above and this
  // delete can't quietly erase the record of the account it just created.
  const deleted = await prisma.accessCode.deleteMany({ where: { id: params.id, usedAt: null } });
  if (deleted.count === 0) {
    return NextResponse.json(
      { message: "This code was used a moment ago, so there is nothing to revoke." },
      { status: 409 }
    );
  }

  return new NextResponse(null, { status: 204 });
}

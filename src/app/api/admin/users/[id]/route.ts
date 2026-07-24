import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user and everything in their portfolio (admin only)
 *     description: >
 *       Deletes the user along with their artworks and API keys (cascading foreign
 *       keys). This cannot be undone. Admins cannot delete their own account through
 *       this endpoint.
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
 *         description: User deleted
 *       400:
 *         description: Cannot delete your own account through this endpoint
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 *       404:
 *         description: User not found
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  if (params.id === authz.userId) {
    return NextResponse.json(
      { message: "You cannot delete your own account through this endpoint." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  await prisma.user.delete({ where: { id: params.id } });

  return new NextResponse(null, { status: 204 });
}

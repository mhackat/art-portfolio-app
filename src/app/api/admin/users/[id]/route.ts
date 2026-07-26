import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { idParamSchema } from "@/lib/validation";
import { deleteImagesBestEffort } from "@/lib/storage";

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

  if (!idParamSchema.safeParse(params.id).success) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
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

  // Deleting the user cascades their artwork rows away in the database, which
  // would otherwise strand every one of their uploaded images in the bucket.
  const artworks = await prisma.artwork.findMany({
    where: { userId: params.id },
    select: { imageUrl: true },
  });

  await prisma.user.delete({ where: { id: params.id } });
  await deleteImagesBestEffort(artworks.map((artwork) => artwork.imageUrl));

  return new NextResponse(null, { status: 204 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { deleteImagesBestEffort } from "@/lib/storage";
import { idParamSchema } from "@/lib/validation";

/**
 * @swagger
 * /api/admin/users/{id}/artworks:
 *   delete:
 *     summary: Delete every artwork belonging to a user (admin only)
 *     description: >
 *       Empties one user's gallery without touching the account itself — they
 *       keep their profile, bio and API keys. Stored images are deleted too.
 *       This cannot be undone.
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
 *         description: Gallery emptied, returns how many were removed
 *       400:
 *         description: Invalid id
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
    return NextResponse.json({ message: "Invalid user id." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  // Collected before the delete — once the rows are gone there's no record of
  // which objects backed them.
  const artworks = await prisma.artwork.findMany({
    where: { userId: user.id },
    select: { imageUrl: true },
  });

  const { count } = await prisma.artwork.deleteMany({ where: { userId: user.id } });
  await deleteImagesBestEffort(artworks.map((artwork) => artwork.imageUrl));

  return NextResponse.json({ count });
}

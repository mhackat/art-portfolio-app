import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { deleteImagesBestEffort } from "@/lib/storage";
import { idParamSchema } from "@/lib/validation";

/**
 * @swagger
 * /api/admin/artworks/{artworkId}:
 *   delete:
 *     summary: Delete any user's artwork (admin only)
 *     description: >
 *       The owner-facing DELETE /api/artworks/{artworkId} only lets someone
 *       remove their own work. This is the moderation equivalent: an admin can
 *       remove a piece from any gallery. The stored image is deleted too.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: artworkId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Artwork deleted
 *       400:
 *         description: Invalid id
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 *       404:
 *         description: Artwork not found
 */
export async function DELETE(req: NextRequest, { params }: { params: { artworkId: string } }) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  if (!idParamSchema.safeParse(params.artworkId).success) {
    return NextResponse.json({ message: "Artwork not found." }, { status: 404 });
  }

  // Read the image URL first: once the row is gone there's no record of which
  // object backed it, and the sweeper would have to find it as an orphan.
  const artwork = await prisma.artwork.findUnique({
    where: { id: params.artworkId },
    select: { id: true, imageUrl: true },
  });
  if (!artwork) {
    return NextResponse.json({ message: "Artwork not found." }, { status: 404 });
  }

  await prisma.artwork.delete({ where: { id: artwork.id } });
  // Best-effort by design: the row is already gone, so a storage hiccup should
  // leave a sweepable orphan rather than fail a delete that has happened.
  await deleteImagesBestEffort([artwork.imageUrl]);

  return new NextResponse(null, { status: 204 });
}

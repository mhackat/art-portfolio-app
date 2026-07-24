import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnership } from "@/lib/authz";
import { uploadImage } from "@/lib/storage";
import { validateImageFile, isFileValidationError } from "@/lib/image-upload";

const updateFieldsSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

async function loadArtworkOr404(artworkId: string) {
  return prisma.artwork.findUnique({ where: { id: artworkId } });
}

/**
 * @swagger
 * /api/artworks/{artworkId}:
 *   patch:
 *     summary: Update an artwork
 *     description: >
 *       Only the authenticated owner of the artwork may update it. To replace the
 *       image, upload a new file directly from the caller's device as part of this
 *       request; omit it to leave the current image unchanged.
 *     tags: [Artworks]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: artworkId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional replacement image (PNG, JPEG, WEBP, or GIF, max 5MB)
 *     responses:
 *       200:
 *         description: Artwork updated
 *       400:
 *         description: Invalid fields, unsupported file type, or file too large
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but does not own this artwork
 *       404:
 *         description: Artwork not found
 *       503:
 *         description: Image storage is not configured
 *   delete:
 *     summary: Delete an artwork
 *     description: Only the authenticated owner of the artwork may delete it.
 *     tags: [Artworks]
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
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but does not own this artwork
 *       404:
 *         description: Artwork not found
 */
export async function PATCH(req: NextRequest, { params }: { params: { artworkId: string } }) {
  const artwork = await loadArtworkOr404(params.artworkId);
  if (!artwork) {
    return NextResponse.json({ message: "Artwork not found." }, { status: 404 });
  }

  const authz = await requireOwnership(req, artwork.userId);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ message: "Invalid form data." }, { status: 400 });
  }

  const titleRaw = form.get("title");
  const descriptionRaw = form.get("description");
  const parsed = updateFieldsSchema.safeParse({
    // A blank title (e.g. an empty field in a form) is treated the same as an omitted
    // one — leave the existing title alone — rather than rejected, since titles can
    // never be blank anyway. Description has no such restriction: a blank value there
    // is a valid, intentional "clear the description."
    title: typeof titleRaw === "string" && titleRaw.trim().length > 0 ? titleRaw : undefined,
    description: typeof descriptionRaw === "string" ? descriptionRaw : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  let imageUrl: string | undefined;
  const fileValue = form.get("file");
  if (fileValue !== null) {
    const file = validateImageFile(fileValue);
    if (isFileValidationError(file)) {
      return NextResponse.json({ message: file.message }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      imageUrl = await uploadImage(buffer, file.type, artwork.userId);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ message: "Image storage is not configured." }, { status: 503 });
    }
  }

  const updated = await prisma.artwork.update({
    where: { id: params.artworkId },
    data: { ...parsed.data, ...(imageUrl ? { imageUrl } : {}) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { artworkId: string } }) {
  const artwork = await loadArtworkOr404(params.artworkId);
  if (!artwork) {
    return NextResponse.json({ message: "Artwork not found." }, { status: 404 });
  }

  const authz = await requireOwnership(req, artwork.userId);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  await prisma.artwork.delete({ where: { id: params.artworkId } });

  return new NextResponse(null, { status: 204 });
}

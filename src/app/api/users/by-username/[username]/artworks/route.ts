import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnership } from "@/lib/authz";
import { uploadImage, deleteImagesBestEffort } from "@/lib/storage";
import { validateImageFile, isFileValidationError } from "@/lib/image-upload";
import { usernameParamSchema } from "@/lib/validation";

const artworkFieldsSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
});

/**
 * @swagger
 * /api/users/by-username/{username}/artworks:
 *   post:
 *     summary: Add a new artwork to a user's gallery, by username
 *     description: >
 *       Only the authenticated owner of this username may add artworks to it. The
 *       image is uploaded directly from the caller's device as part of this request.
 *     tags: [Artworks]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, file]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PNG, JPEG, WEBP, or GIF, max 5MB
 *     responses:
 *       201:
 *         description: Artwork created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Artwork'
 *       400:
 *         description: Invalid fields, missing file, unsupported file type, or file too large
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not the owner of this username
 *       404:
 *         description: User not found
 *       503:
 *         description: Image storage is not configured
 *   delete:
 *     summary: Delete all of a user's artworks at once, by username
 *     description: >
 *       Only the authenticated owner of this username may bulk-delete their own
 *       gallery. This cannot be undone.
 *     tags: [Artworks]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All artworks deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not the owner of this username
 *       404:
 *         description: User not found
 */
export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  if (!usernameParamSchema.safeParse(params.username).success) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { username: params.username } });
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const authz = await requireOwnership(req, user.id);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ message: "Invalid form data." }, { status: 400 });
  }

  const file = validateImageFile(form.get("file"));
  if (isFileValidationError(file)) {
    return NextResponse.json({ message: file.message }, { status: 400 });
  }

  const title = form.get("title");
  const description = form.get("description");
  const parsed = artworkFieldsSchema.safeParse({
    title: typeof title === "string" ? title : undefined,
    description: typeof description === "string" ? description : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let imageUrl: string;
  try {
    imageUrl = await uploadImage(buffer, file.type, user.id);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Image storage is not configured." }, { status: 503 });
  }

  const artwork = await prisma.artwork.create({
    data: { ...parsed.data, imageUrl, userId: user.id },
  });

  return NextResponse.json(artwork, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { username: string } }) {
  if (!usernameParamSchema.safeParse(params.username).success) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { username: params.username } });
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const authz = await requireOwnership(req, user.id);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
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

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { uploadImage } from "@/lib/storage";
import { validateImageFile, isFileValidationError } from "@/lib/image-upload";

/**
 * @swagger
 * /api/uploads:
 *   post:
 *     summary: Upload an image file and get back its public URL
 *     description: >
 *       Accepts a multipart/form-data upload with a "file" field (png, jpeg, webp, or
 *       gif, max 5MB) and returns its public URL. Not used by artwork create/update,
 *       which upload the file directly — this is a standalone primitive for other
 *       future uses. Not publicly documented; kept undocumented intentionally.
 *     tags: [Uploads]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Upload succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       400:
 *         description: Missing file, unsupported file type, or file too large
 *       401:
 *         description: Not authenticated
 *       503:
 *         description: Image storage is not configured
 */
export async function POST(req: NextRequest) {
  const authz = await requireAuth(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  const form = await req.formData().catch(() => null);
  const file = validateImageFile(form?.get("file") ?? null);
  if (isFileValidationError(file)) {
    return NextResponse.json({ message: file.message }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = await uploadImage(buffer, file.type, authz.userId);
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Image storage is not configured." }, { status: 503 });
  }
}

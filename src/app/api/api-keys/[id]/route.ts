import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { idParamSchema } from "@/lib/validation";

/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     description: Only the authenticated owner of the key may revoke it.
 *     tags: [API Keys]
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
 *         description: Key revoked
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but does not own this key
 *       404:
 *         description: Key not found
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authz = await requireAuth(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  if (!idParamSchema.safeParse(params.id).success) {
    return NextResponse.json({ message: "API key not found." }, { status: 404 });
  }

  const apiKey = await prisma.apiKey.findUnique({ where: { id: params.id } });
  if (!apiKey) {
    return NextResponse.json({ message: "API key not found." }, { status: 404 });
  }

  if (apiKey.userId !== authz.userId) {
    return NextResponse.json(
      { message: "You do not have permission to revoke this key." },
      { status: 403 }
    );
  }

  await prisma.apiKey.delete({ where: { id: params.id } });

  return new NextResponse(null, { status: 204 });
}

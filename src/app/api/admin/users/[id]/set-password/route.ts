import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { idParamSchema } from "@/lib/validation";

const setPasswordSchema = z.object({
  password: z.string().min(8),
});

/**
 * @swagger
 * /api/admin/users/{id}/set-password:
 *   post:
 *     summary: Directly set a user's password (admin only)
 *     description: >
 *       Immediately replaces the account's password and revokes every API key it
 *       currently has, since the credential trust boundary just changed. Does not
 *       change the account's lock status either way. For letting the user pick their
 *       own new password instead, see POST /api/admin/users/{id}/reset-link.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Invalid id or body
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

  const body = await req.json().catch(() => null);
  const parsed = setPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: params.id }, data: { passwordHash } }),
    prisma.apiKey.deleteMany({ where: { userId: params.id } }),
  ]);

  return NextResponse.json({ id: params.id, message: "Password updated." });
}

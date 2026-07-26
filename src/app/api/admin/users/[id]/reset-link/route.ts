import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { generateResetToken } from "@/lib/password-reset";
import { idParamSchema } from "@/lib/validation";

/**
 * @swagger
 * /api/admin/users/{id}/reset-link:
 *   post:
 *     summary: Generate a one-time password reset link for a user (admin only)
 *     description: >
 *       Creates a single-use, 24-hour link the admin can copy and hand off to the user
 *       manually (this app has no email-sending capability), so the user can set their
 *       own new password rather than the admin choosing one for them. The raw token is
 *       only ever shown in this response. Generating a new link invalidates any
 *       previously-issued, still-outstanding link for the same user. Does not revoke
 *       API keys or change lock status — nothing has actually changed yet.
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
 *         description: Reset link created
 *       400:
 *         description: Invalid id
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

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const { rawToken, tokenHash, expiresAt } = generateResetToken();

  await prisma.$transaction([
    // Invalidate any outstanding link for this user so at most one is ever valid.
    prisma.passwordResetToken.deleteMany({ where: { userId: params.id, consumedAt: null } }),
    prisma.passwordResetToken.create({ data: { userId: params.id, tokenHash, expiresAt } }),
  ]);

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  return NextResponse.json({ token: rawToken, resetUrl, expiresAt: expiresAt.toISOString() });
}

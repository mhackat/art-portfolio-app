import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnership } from "@/lib/authz";
import { usernameParamSchema } from "@/lib/validation";

const bioSchema = z.object({
  bio: z.string().max(2000),
});

/**
 * @swagger
 * /api/users/by-username/{username}/bio:
 *   patch:
 *     summary: Update a user's bio, by username
 *     description: Only the authenticated owner of this username may update it.
 *     tags: [Users]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bio]
 *             properties:
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bio updated
 *       400:
 *         description: Invalid body
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not the owner of this username
 *       404:
 *         description: User not found
 */
export async function PATCH(req: NextRequest, { params }: { params: { username: string } }) {
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

  const body = await req.json().catch(() => null);
  const parsed = bioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { bio: parsed.data.bio },
    select: { id: true, bio: true },
  });

  return NextResponse.json(updated);
}

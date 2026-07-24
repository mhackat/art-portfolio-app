import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { idParamSchema } from "@/lib/validation";

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user's public profile, bio, and gallery
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public profile
 *       404:
 *         description: User not found
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!idParamSchema.safeParse(params.id).success) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      artworks: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, description: true, imageUrl: true, createdAt: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  return NextResponse.json(user);
}

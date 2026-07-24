import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/api-keys";

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: End the current API session
 *     description: >
 *       Revokes the API key used in this call's Authorization header (the one
 *       returned by POST /api/auth/login, or any key from the dashboard). No body or
 *       id needed — it always revokes whichever key authenticated the request. This
 *       only applies to Bearer token sessions; browser cookie sessions use next-auth's
 *       own sign-out flow instead.
 *     tags: [Auth]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       204:
 *         description: Session ended
 *       401:
 *         description: Missing or invalid bearer token
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { message: "This endpoint requires an Authorization: Bearer <token> header." },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice("Bearer ".length).trim();
  if (!rawKey) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(rawKey) } });
  if (!apiKey) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  await prisma.apiKey.delete({ where: { id: apiKey.id } });

  return new NextResponse(null, { status: 204 });
}

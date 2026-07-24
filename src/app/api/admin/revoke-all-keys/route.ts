import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

/**
 * @swagger
 * /api/admin/revoke-all-keys:
 *   post:
 *     summary: Revoke every API key for every user, system-wide (admin only)
 *     description: >
 *       Deletes every API key in the system, immediately ending every Bearer-token
 *       session for every user — including the calling admin's own, if they
 *       authenticated with a Bearer token rather than a browser session. This does not
 *       affect anyone's password or lock status, only currently-issued API keys.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: All API keys revoked
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 */
export async function POST(req: NextRequest) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  const { count } = await prisma.apiKey.deleteMany({});

  return NextResponse.json({ count });
}

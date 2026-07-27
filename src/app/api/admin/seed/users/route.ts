import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { DEMO_ARTISTS, seededEmail, seededUsername } from "@/lib/demo-artists";

const seedSchema = z.object({
  count: z.number().int().min(1).max(DEMO_ARTISTS.length).optional(),
  // Chosen by the caller precisely so they end up knowing it — these are demo
  // accounts meant to be logged into afterwards, not real ones.
  password: z.string().min(8).max(200),
  emailDomain: z.string().min(3).max(100).optional(),
});

/**
 * @swagger
 * /api/admin/seed/users:
 *   post:
 *     summary: Create demo artist accounts (admin only)
 *     description: >
 *       Creates a batch of demo artists with a caller-supplied shared password,
 *       for populating an environment with believable content. Runs inside the
 *       deployment, so it needs no database or storage credentials of its own.
 *       Every username is suffixed with a short run id, so repeat runs never
 *       collide and a batch can be identified afterwards. Artworks are not
 *       created here — upload those separately as each artist.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               count:
 *                 type: integer
 *                 description: How many artists to create. Defaults to all available personas.
 *               password:
 *                 type: string
 *                 description: Shared password for every created account.
 *               emailDomain:
 *                 type: string
 *     responses:
 *       201:
 *         description: Accounts created
 *       400:
 *         description: Invalid body
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

  const raw = await req.json().catch(() => null);
  const parsed = seedSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { password, emailDomain } = parsed.data;
  const count = parsed.data.count ?? DEMO_ARTISTS.length;
  const runId = randomBytes(3).toString("hex");

  // Hashed once rather than per account: every one of these shares the same
  // caller-supplied password by design, so per-account salting protects nothing
  // here and 20 sequential bcrypt rounds would risk the function timeout.
  const passwordHash = await bcrypt.hash(password, 10);

  const created: { id: string; username: string; email: string; displayName: string }[] = [];

  for (const artist of DEMO_ARTISTS.slice(0, count)) {
    const user = await prisma.user.create({
      data: {
        username: seededUsername(artist.username, runId),
        email: seededEmail(artist.username, runId, emailDomain),
        displayName: artist.displayName,
        bio: artist.bio,
        passwordHash,
      },
      select: { id: true, username: true, email: true, displayName: true },
    });
    created.push(user);
  }

  return NextResponse.json({ runId, count: created.length, users: created }, { status: 201 });
}

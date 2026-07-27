import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { generateAccessCode } from "@/lib/access-codes";

const createSchema = z.object({
  note: z.string().max(200).optional(),
});

/**
 * @swagger
 * /api/admin/access-codes:
 *   post:
 *     summary: Generate a one-time signup access code (admin only)
 *     description: >
 *       Creates a single-use code that a prospective user must supply to POST /api/signup.
 *       The raw code is only ever returned here — only its hash is stored — so it must be
 *       copied and handed to the user out of band. Generating a code does not invalidate
 *       any previously-issued code; each is independently valid until consumed.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 description: Optional label to remember who the code was issued to.
 *     responses:
 *       201:
 *         description: Access code created
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

  // Body is optional — a bare POST from the admin button sends nothing at all.
  const raw = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { rawCode, codeHash, codePrefix } = generateAccessCode();

  const created = await prisma.accessCode.create({
    data: {
      codeHash,
      codePrefix,
      note: parsed.data.note?.trim() || "",
      createdById: authz.userId,
    },
    select: { id: true, codePrefix: true, note: true, createdAt: true },
  });

  return NextResponse.json({ ...created, code: rawCode }, { status: 201 });
}

/**
 * @swagger
 * /api/admin/access-codes:
 *   get:
 *     summary: List signup access codes (admin only)
 *     description: >
 *       Returns issued codes with their prefix only — the full code cannot be recovered
 *       after creation. Unused codes are listed first.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Access codes
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 */
export async function GET(req: NextRequest) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  const codes = await prisma.accessCode.findMany({
    orderBy: [{ usedAt: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: { id: true, codePrefix: true, note: true, createdAt: true, usedAt: true, usedByUserId: true },
  });

  return NextResponse.json({ codes });
}

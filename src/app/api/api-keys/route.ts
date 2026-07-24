import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { generateApiKey } from "@/lib/api-keys";

const createSchema = z.object({
  name: z.string().min(1).max(100).optional().default("Default"),
});

/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     summary: List your API keys
 *     description: Returns metadata only — the raw key value is never shown again after creation.
 *     tags: [API Keys]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *       401:
 *         description: Not authenticated
 *   post:
 *     summary: Create a new API key
 *     description: >
 *       The raw key is returned once in the response and is not recoverable afterwards.
 *       Use it as a Bearer token (`Authorization: Bearer <key>`) to call the API without
 *       a browser session — e.g. to upload artwork images via POST /api/uploads.
 *     tags: [API Keys]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: API key created — `key` is only ever shown in this response
 *       401:
 *         description: Not authenticated
 */
export async function GET(req: NextRequest) {
  const authz = await requireAuth(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: authz.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
  });

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const authz = await requireAuth(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: { userId: authz.userId, name: parsed.data.name, keyHash, keyPrefix },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  return NextResponse.json({ ...apiKey, key: rawKey }, { status: 201 });
}

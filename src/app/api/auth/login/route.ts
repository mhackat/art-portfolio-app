import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-keys";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in and get a session API key
 *     description: >
 *       For API clients that can't use the browser's cookie-based session. Exchanges
 *       an email/username + password for a bearer token — under the hood this creates
 *       the same kind of API key shown on the dashboard, so it's also listed there and
 *       can be revoked from either place. Send the returned token as
 *       `Authorization: Bearer <token>` on subsequent requests, and call
 *       POST /api/auth/logout with it when done to end the session.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or username
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Logged in — `token` is only ever shown in this response
 *       400:
 *         description: Invalid body
 *       401:
 *         description: Invalid identifier or password
 *       429:
 *         description: Too many login attempts — try again later
 */
export async function POST(req: NextRequest) {
  const ipRateLimit = await checkRateLimit("login-ip", getClientIp(req), LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!ipRateLimit.allowed) {
    return NextResponse.json(
      { message: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipRateLimit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { identifier, password } = parsed.data;

  const identifierRateLimit = await checkRateLimit(
    "login-identifier",
    identifier.toLowerCase(),
    LOGIN_LIMIT,
    LOGIN_WINDOW_MS
  );
  if (!identifierRateLimit.allowed) {
    return NextResponse.json(
      { message: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(identifierRateLimit.retryAfterSeconds) } }
    );
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });

  const invalidResponse = () =>
    NextResponse.json({ message: "Invalid email/username or password." }, { status: 401 });

  if (!user) {
    return invalidResponse();
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return invalidResponse();
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  await prisma.apiKey.create({
    data: { userId: user.id, name: "API session (login)", keyHash, keyPrefix },
  });

  return NextResponse.json(
    {
      token: rawKey,
      user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email },
    },
    { status: 201 }
  );
}

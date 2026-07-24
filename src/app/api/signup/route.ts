import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

const signupSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, - and _"),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
});

/**
 * @swagger
 * /api/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password, displayName]
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               displayName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created
 *       400:
 *         description: Invalid body
 *       409:
 *         description: Email or username already taken
 *       429:
 *         description: Too many signups from this IP — try again later
 */
export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit("signup", getClientIp(req), SIGNUP_LIMIT, SIGNUP_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Too many signup attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { email, username, password, displayName } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return NextResponse.json({ message: "Email or username already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, username, passwordHash, displayName },
    select: { id: true, email: true, username: true, displayName: true },
  });

  return NextResponse.json(user, { status: 201 });
}

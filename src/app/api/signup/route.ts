import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashAccessCode } from "@/lib/access-codes";

const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

const ACCESS_CODE_REQUIRED_MESSAGE =
  "A valid one-time access code is required to sign up. Please contact hirehackett@gmail.com for an access code.";

const signupSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, - and _"),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
  accessCode: z.string().min(1, "An access code is required."),
});

/**
 * @swagger
 * /api/signup:
 *   post:
 *     summary: Create a new user account (requires a one-time access code)
 *     description: >
 *       Registration is invite-only. You must supply a one-time `accessCode` issued by an
 *       administrator; each code works for exactly one account and is consumed on success.
 *       Please contact hirehackett@gmail.com for an access code.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password, displayName, accessCode]
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               displayName:
 *                 type: string
 *               accessCode:
 *                 type: string
 *                 description: >
 *                   A one-time access code issued by an administrator. Please contact
 *                   hirehackett@gmail.com for an access code.
 *     responses:
 *       201:
 *         description: Account created
 *       400:
 *         description: Invalid body
 *       403:
 *         description: Missing, invalid, or already-used access code
 *       409:
 *         description: Email or username already taken
 *       429:
 *         description: Too many signup attempts for this email — try again later
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    // A missing/blank access code is a policy failure, not a malformed request — report
    // it as 403 with the contact instructions rather than burying it in field issues.
    const onlyAccessCodeFailed = parsed.error.issues.every((issue) => issue.path[0] === "accessCode");
    if (onlyAccessCodeFailed) {
      return NextResponse.json({ message: ACCESS_CODE_REQUIRED_MESSAGE }, { status: 403 });
    }
    return NextResponse.json({ message: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { email, username, password, displayName, accessCode } = parsed.data;

  // Keyed by the email being signed up with, not the caller's IP — a shared/unknown
  // IP (e.g. every request from localhost in dev) would otherwise dump every
  // signup attempt into one bucket and rate-limit unrelated people out.
  const rateLimit = await checkRateLimit("signup", email.toLowerCase(), SIGNUP_LIMIT, SIGNUP_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Too many signup attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  // Cheap pre-check so a bad code fails before we spend a bcrypt round on it. The
  // authoritative check is the conditional update inside the transaction below.
  const codeRecord = await prisma.accessCode.findUnique({
    where: { codeHash: hashAccessCode(accessCode) },
    select: { id: true, usedAt: true },
  });
  if (!codeRecord || codeRecord.usedAt) {
    return NextResponse.json({ message: ACCESS_CODE_REQUIRED_MESSAGE }, { status: 403 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return NextResponse.json({ message: "Email or username already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Create the account and consume the code together: the `usedAt: null` guard on the
  // update means two requests racing the same code can't both win — the loser's update
  // matches zero rows and the throw rolls its user creation back.
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, username, passwordHash, displayName },
        select: { id: true, email: true, username: true, displayName: true },
      });

      const consumed = await tx.accessCode.updateMany({
        where: { id: codeRecord.id, usedAt: null },
        data: { usedAt: new Date(), usedByUserId: created.id },
      });
      if (consumed.count === 0) {
        throw new Error("ACCESS_CODE_ALREADY_USED");
      }

      return created;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCESS_CODE_ALREADY_USED") {
      return NextResponse.json({ message: ACCESS_CODE_REQUIRED_MESSAGE }, { status: 403 });
    }
    throw error;
  }

  return NextResponse.json(user, { status: 201 });
}

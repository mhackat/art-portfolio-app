import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/api-keys";
import { isAccountLockedUserId } from "@/lib/account-lock";

export type AuthzResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; message: string };

async function resolveUserId(req: NextRequest): Promise<string | undefined> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    // No separate lock check needed on this path: lockAccount() deletes every API key
    // the user has, so a revoked key simply stops resolving here the moment they're
    // locked — this lookup already fails closed.
    const rawKey = authHeader.slice("Bearer ".length).trim();
    if (!rawKey) return undefined;

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(rawKey) },
    });
    if (!apiKey) return undefined;

    prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return apiKey.userId;
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return undefined;

  // Session cookies are stateless JWTs, so unlike API keys they can't be revoked at
  // lock time — this live check (never trusts a cached claim, same as isAdminUserId
  // below) is what makes an existing browser session stop working the moment the
  // account is locked, instead of only blocking future logins.
  if (await isAccountLockedUserId(userId)) return undefined;

  return userId;
}

/**
 * Central place all mutating routes call to check "is the caller allowed to
 * act on resourceOwnerId?". Keeping this in one function means:
 *  - every route enforces the same rule
 *  - it's trivial to unit test in isolation
 *  - if the rule ever changes (e.g. add an admin role), it changes once
 *
 * Accepts either a next-auth session cookie or an `Authorization: Bearer <apiKey>`
 * header, so the same routes work from the browser dashboard and from direct API calls.
 */
export async function requireOwnership(req: NextRequest, resourceOwnerId: string): Promise<AuthzResult> {
  const userId = await resolveUserId(req);

  if (!userId) {
    return { ok: false, status: 401, message: "Authentication required." };
  }

  if (userId !== resourceOwnerId) {
    return { ok: false, status: 403, message: "You do not have permission to modify this resource." };
  }

  return { ok: true, userId };
}

/** Just checks "is someone logged in", without an ownership comparison. */
export async function requireAuth(req: NextRequest): Promise<AuthzResult> {
  const userId = await resolveUserId(req);

  if (!userId) {
    return { ok: false, status: 401, message: "Authentication required." };
  }
  return { ok: true, userId };
}

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks "is this user id an admin?" — gated by the ADMIN_EMAILS env var rather than a
 * DB role, since this app has no broader RBAC need yet. Always re-checked against the
 * live env var and the user's current email on every call (never trusts a cached
 * session claim), so revoking access takes effect immediately. Shared by requireAdmin
 * (route handlers) and server components that already have a userId from getServerSession.
 */
export async function isAdminUserId(userId: string): Promise<boolean> {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return false;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user && adminEmails.includes(user.email.toLowerCase());
}

/** Route-handler version of the admin check — see isAdminUserId. */
export async function requireAdmin(req: NextRequest): Promise<AuthzResult> {
  const userId = await resolveUserId(req);
  if (!userId) {
    return { ok: false, status: 401, message: "Authentication required." };
  }

  if (!(await isAdminUserId(userId))) {
    return { ok: false, status: 403, message: "Admin access required." };
  }

  return { ok: true, userId };
}

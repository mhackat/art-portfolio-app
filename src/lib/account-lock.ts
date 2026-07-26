import { prisma } from "@/lib/prisma";

const MAX_FAILED_LOGIN_ATTEMPTS = 3;

export type LockReason = "failed_attempts" | "admin";

/**
 * Locks an account and revokes every API key it currently has — a lock is only
 * meaningful if it also kills already-issued Bearer tokens, not just future logins.
 * Shared by the auto-lock-on-failed-attempts path and the admin manual-lock endpoint
 * so this "lock + revoke" behavior can't drift between the two call sites.
 */
export async function lockAccount(userId: string, reason: LockReason): Promise<{ lockedAt: Date }> {
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { lockedAt: new Date(), lockReason: reason },
      select: { lockedAt: true },
    }),
    prisma.apiKey.deleteMany({ where: { userId } }),
  ]);

  return { lockedAt: user.lockedAt as Date };
}

/** Unlocks an account. Revoked API keys are not restored — the user/admin issues new ones. */
export async function unlockAccount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lockedAt: null, lockReason: null, failedLoginAttempts: 0 },
  });
}

/**
 * Call after a failed password check. Increments the persistent failure counter and
 * locks the account once it reaches MAX_FAILED_LOGIN_ATTEMPTS. This is a separate
 * mechanism from the sliding-window rate limiter in rate-limit.ts: that one counts
 * every attempt (success or failure) and resets after 15 minutes; this one only counts
 * failures, never expires on its own, and requires an admin unlock once tripped.
 */
export async function recordFailedLoginAndMaybeLock(userId: string): Promise<{ locked: boolean }> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
    select: { failedLoginAttempts: true, lockedAt: true },
  });

  if (updated.lockedAt || updated.failedLoginAttempts < MAX_FAILED_LOGIN_ATTEMPTS) {
    return { locked: false };
  }

  await lockAccount(userId, "failed_attempts");
  return { locked: true };
}

/** Call after a successful login so old failures don't carry forward. */
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0 },
  });
}

/**
 * Live lock check — same "never trust a cached claim" philosophy as isAdminUserId in
 * authz.ts. Used there so an already-issued session immediately stops working the
 * moment a user is locked, rather than only affecting future logins.
 */
export async function isAccountLockedUserId(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lockedAt: true } });
  return !!user?.lockedAt;
}

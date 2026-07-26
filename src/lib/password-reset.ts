import { randomBytes, createHash } from "crypto";

const TOKEN_PREFIX = "prt_";
const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function generateResetToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
  const rawToken = `${TOKEN_PREFIX}${randomBytes(24).toString("hex")}`;
  return {
    rawToken,
    tokenHash: hashResetToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}

export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

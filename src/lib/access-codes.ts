import { randomBytes, createHash } from "crypto";

const CODE_PREFIX = "inv_";

/**
 * One-time signup invite codes. Hashed at rest exactly like API keys and password
 * reset tokens, so a database leak doesn't hand an attacker a working signup code —
 * the tradeoff is that a raw code can never be re-displayed, and a lost code just
 * means the admin generates a fresh one.
 */
export function generateAccessCode(): { rawCode: string; codeHash: string; codePrefix: string } {
  const rawCode = `${CODE_PREFIX}${randomBytes(16).toString("hex")}`;
  return {
    rawCode,
    codeHash: hashAccessCode(rawCode),
    codePrefix: rawCode.slice(0, CODE_PREFIX.length + 6),
  };
}

export function hashAccessCode(rawCode: string): string {
  return createHash("sha256").update(rawCode.trim()).digest("hex");
}

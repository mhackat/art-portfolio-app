import { randomBytes, createHash } from "crypto";

const KEY_PREFIX = "apk_";

export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const rawKey = `${KEY_PREFIX}${randomBytes(24).toString("hex")}`;
  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, KEY_PREFIX.length + 6),
  };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

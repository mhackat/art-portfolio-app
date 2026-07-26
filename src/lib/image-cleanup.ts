// Relative imports (not the usual "@/lib/..." alias) so scripts/cleanup-orphaned-images.ts
// can import this directly under tsx, which runs outside Next's bundler.
import { prisma } from "./prisma";
import { listStoredImageKeys, storedKeyForUrl, deleteStoredImageKeys } from "./storage";

export type OrphanScan = {
  totalObjects: number;
  referencedObjects: number;
  orphanedKeys: string[];
};

/**
 * Finds stored image objects that no artwork row points at any more.
 *
 * Shared by the CLI script and the admin endpoint so the two can't drift into
 * disagreeing about what counts as an orphan.
 */
export async function scanForOrphanedImages(): Promise<OrphanScan> {
  const [storedKeys, artworks] = await Promise.all([
    listStoredImageKeys(),
    prisma.artwork.findMany({ select: { imageUrl: true } }),
  ]);

  const referenced = new Set<string>();
  for (const { imageUrl } of artworks) {
    const key = storedKeyForUrl(imageUrl);
    // A URL that doesn't resolve to a key in this bucket (e.g. seed data pointing
    // at an external placeholder host) can't match anything we listed, so it has
    // no bearing on which stored objects are orphaned.
    if (key) referenced.add(key);
  }

  return {
    totalObjects: storedKeys.length,
    referencedObjects: referenced.size,
    orphanedKeys: storedKeys.filter((key) => !referenced.has(key)),
  };
}

/**
 * Re-scans and deletes whatever is orphaned right now.
 *
 * Deliberately recomputes rather than accepting a caller-supplied key list —
 * callers must never be able to hand this function arbitrary keys to delete,
 * and a list from an earlier preview may be stale by the time it's confirmed.
 * Re-scanning is also safe against concurrent uploads: an object created after
 * the scan simply isn't in the list.
 */
export async function deleteOrphanedImages(): Promise<OrphanScan & { deleted: number }> {
  const scan = await scanForOrphanedImages();
  await deleteStoredImageKeys(scan.orphanedKeys);

  return { ...scan, deleted: scan.orphanedKeys.length };
}

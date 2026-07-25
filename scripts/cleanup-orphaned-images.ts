import { prisma } from "../src/lib/prisma";
import { listStoredImageKeys, storedKeyForUrl, deleteStoredImageKeys } from "../src/lib/storage";

/**
 * Sweeps image objects that no artwork row references any more.
 *
 * The app now deletes an image whenever its artwork is deleted or its file is
 * replaced, so this shouldn't find much going forward — it exists to clear the
 * backlog left by earlier versions, and as a safety net for the best-effort
 * deletes in the request path (which log and move on if storage is briefly
 * unavailable, deliberately leaving an orphan rather than failing the request).
 *
 * Dry run by default. Pass --delete to actually remove anything.
 *
 *   npm run cleanup:images            # report only
 *   npm run cleanup:images -- --delete
 *
 * Runs against whichever environment DATABASE_URL and STORAGE_* point at, so
 * check those before using --delete.
 */

const shouldDelete = process.argv.includes("--delete");

async function main() {
  const [storedKeys, artworks] = await Promise.all([
    listStoredImageKeys(),
    prisma.artwork.findMany({ select: { imageUrl: true } }),
  ]);

  const referenced = new Set<string>();
  for (const { imageUrl } of artworks) {
    const key = storedKeyForUrl(imageUrl);
    // A URL that doesn't resolve to a key in this bucket (e.g. one written by a
    // different environment) can't be matched against anything we listed, so
    // it simply has no bearing on which stored objects are orphaned.
    if (key) referenced.add(key);
  }

  const orphans = storedKeys.filter((key) => !referenced.has(key));

  console.log(`Objects in bucket:        ${storedKeys.length}`);
  console.log(`Referenced by an artwork: ${referenced.size}`);
  console.log(`Orphaned:                 ${orphans.length}`);

  if (orphans.length === 0) {
    console.log("\nNothing to clean up.");
    return;
  }

  console.log("\nOrphaned keys:");
  for (const key of orphans) console.log(`  ${key}`);

  if (!shouldDelete) {
    console.log(`\nDry run — nothing deleted. Re-run with --delete to remove these ${orphans.length}.`);
    return;
  }

  await deleteStoredImageKeys(orphans);
  console.log(`\nDeleted ${orphans.length} orphaned object(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

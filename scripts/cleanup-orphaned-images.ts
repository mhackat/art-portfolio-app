import { prisma } from "../src/lib/prisma";
import { scanForOrphanedImages, deleteOrphanedImages } from "../src/lib/image-cleanup";

/**
 * Sweeps image objects that no artwork row references any more.
 *
 * The app now deletes an image whenever its artwork is deleted or its file is
 * replaced, so this shouldn't find much going forward — it exists to clear the
 * backlog left by earlier versions, and as a safety net for the best-effort
 * deletes in the request path (which log and move on if storage is briefly
 * unavailable, deliberately leaving an orphan rather than failing the request).
 *
 * The same thing is available to admins as a button on /admin; this is the
 * shell equivalent, sharing its logic via src/lib/image-cleanup.ts.
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
  const scan = shouldDelete ? await deleteOrphanedImages() : await scanForOrphanedImages();

  console.log(`Objects in bucket:        ${scan.totalObjects}`);
  console.log(`Referenced by an artwork: ${scan.referencedObjects}`);
  console.log(`Orphaned:                 ${scan.orphanedKeys.length}`);

  if (scan.orphanedKeys.length === 0) {
    console.log("\nNothing to clean up.");
    return;
  }

  console.log("\nOrphaned keys:");
  for (const key of scan.orphanedKeys) console.log(`  ${key}`);

  if (shouldDelete) {
    console.log(`\nDeleted ${scan.orphanedKeys.length} orphaned object(s).`);
  } else {
    console.log(
      `\nDry run — nothing deleted. Re-run with --delete to remove these ${scan.orphanedKeys.length}.`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

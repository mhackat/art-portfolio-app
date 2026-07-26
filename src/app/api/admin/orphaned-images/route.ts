import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { scanForOrphanedImages, deleteOrphanedImages } from "@/lib/image-cleanup";

// Listing a whole bucket and deleting in batches can outrun the default
// serverless timeout once storage grows; give it room.
export const maxDuration = 60;

/** Keeps a huge bucket from returning a multi-megabyte JSON body to the UI. */
const MAX_KEYS_IN_RESPONSE = 100;

/**
 * @swagger
 * /api/admin/orphaned-images:
 *   get:
 *     summary: Preview image objects no artwork references (admin only)
 *     description: >
 *       Read-only. Compares every object in the image bucket against the
 *       artwork rows that reference them and reports what's orphaned, without
 *       deleting anything. Use POST on this same path to actually remove them.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Scan results
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 *       503:
 *         description: Image storage is not configured
 *   post:
 *     summary: Delete image objects no artwork references (admin only)
 *     description: >
 *       Re-scans and permanently deletes every orphaned object in the image
 *       bucket. This cannot be undone. Operates on whichever bucket this
 *       deployment's STORAGE_* variables point at.
 *     tags: [Admin]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Orphaned objects deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Authenticated but not an admin
 *       503:
 *         description: Image storage is not configured
 */
export async function GET(req: NextRequest) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  try {
    const scan = await scanForOrphanedImages();

    return NextResponse.json({
      totalObjects: scan.totalObjects,
      referencedObjects: scan.referencedObjects,
      orphanedCount: scan.orphanedKeys.length,
      orphanedKeys: scan.orphanedKeys.slice(0, MAX_KEYS_IN_RESPONSE),
      truncated: scan.orphanedKeys.length > MAX_KEYS_IN_RESPONSE,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Image storage is not configured." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ message: authz.message }, { status: authz.status });
  }

  try {
    // Recomputed server-side rather than trusting a key list from the client —
    // see deleteOrphanedImages.
    const result = await deleteOrphanedImages();

    return NextResponse.json({
      deleted: result.deleted,
      totalObjects: result.totalObjects,
      referencedObjects: result.referencedObjects,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Image storage is not configured." }, { status: 503 });
  }
}

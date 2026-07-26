"use client";

import { useState } from "react";

type Scan = {
  totalObjects: number;
  referencedObjects: number;
  orphanedCount: number;
  orphanedKeys: string[];
  truncated: boolean;
};

/**
 * Deliberately two-step: scan (read-only) to see how much is orphaned, then an
 * explicit confirm to delete. Deleting storage objects can't be undone, and the
 * admin has no way to know the blast radius until the scan reports it.
 */
export default function CleanupImagesButton() {
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scan, setScan] = useState<Scan | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setError(null);
    setResult(null);
    setScan(null);
    setScanning(true);

    try {
      const res = await fetch("/api/admin/orphaned-images");

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not scan for orphaned images.");
        return;
      }

      setScan(await res.json());
    } finally {
      setScanning(false);
    }
  }

  async function handleDelete() {
    if (!scan) return;

    const confirmed = window.confirm(
      `Permanently delete ${scan.orphanedCount} orphaned image object(s) from storage? ` +
        `These aren't referenced by any artwork. This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setDeleting(true);

    try {
      const res = await fetch("/api/admin/orphaned-images", { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not delete orphaned images.");
        return;
      }

      const body = await res.json();
      setResult(`Deleted ${body.deleted} orphaned object${body.deleted === 1 ? "" : "s"}.`);
      setScan(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div data-testid="admin-cleanup-images">
      <button
        type="button"
        data-testid="admin-cleanup-images-scan-button"
        disabled={scanning || deleting}
        onClick={handleScan}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {scanning ? "Scanning..." : "Scan for orphaned images"}
      </button>

      {scan ? (
        <div data-testid="admin-cleanup-images-scan-result" className="mt-2 text-xs text-gray-600">
          <p>
            {scan.totalObjects} object{scan.totalObjects === 1 ? "" : "s"} in storage ·{" "}
            {scan.referencedObjects} referenced ·{" "}
            <strong className={scan.orphanedCount > 0 ? "text-amber-700" : undefined}>
              {scan.orphanedCount} orphaned
            </strong>
          </p>

          {scan.orphanedCount > 0 ? (
            <>
              <details className="mt-1">
                <summary className="cursor-pointer hover:underline">Show keys</summary>
                <ul className="mt-1 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed">
                  {scan.orphanedKeys.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
                {scan.truncated ? (
                  <p className="mt-1 italic">
                    Showing the first {scan.orphanedKeys.length} of {scan.orphanedCount}. Deleting removes all
                    of them.
                  </p>
                ) : null}
              </details>

              <button
                type="button"
                data-testid="admin-cleanup-images-delete-button"
                disabled={deleting}
                onClick={handleDelete}
                className="mt-2 rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : `Delete ${scan.orphanedCount} orphaned object${scan.orphanedCount === 1 ? "" : "s"}`}
              </button>
            </>
          ) : (
            <p className="mt-1">Nothing to clean up.</p>
          )}
        </div>
      ) : null}

      {result ? (
        <p data-testid="admin-cleanup-images-result" className="mt-1 text-xs text-green-700">
          {result}
        </p>
      ) : null}
      {error ? (
        <p data-testid="admin-cleanup-images-error" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAllArtworksButton({
  userId,
  displayName,
  artworkCount,
}: {
  userId: string;
  displayName: string;
  artworkCount: number;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleDeleteAll() {
    const confirmed = window.confirm(
      `Delete all ${artworkCount} artwork${artworkCount === 1 ? "" : "s"} belonging to ${displayName}?\n\n` +
        `Their account, profile and bio are left alone — only the gallery is emptied. ` +
        `The stored images are removed too. This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setResult(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/artworks`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not delete these artworks.");
        return;
      }

      const body = await res.json();
      setResult(`Deleted ${body.count} artwork${body.count === 1 ? "" : "s"}.`);
      router.refresh();
    } catch {
      setError("Could not delete these artworks.");
    } finally {
      setDeleting(false);
    }
  }

  if (artworkCount === 0) {
    return null;
  }

  return (
    <div data-testid="admin-delete-all-artworks">
      <button
        type="button"
        onClick={handleDeleteAll}
        disabled={deleting}
        data-testid="admin-delete-all-artworks-button"
        className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {deleting ? "Deleting..." : `Delete all ${artworkCount}`}
      </button>
      {result ? (
        <p data-testid="admin-delete-all-artworks-result" className="mt-1 text-xs text-green-700">
          {result}
        </p>
      ) : null}
      {error ? (
        <p data-testid="admin-delete-all-artworks-error" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

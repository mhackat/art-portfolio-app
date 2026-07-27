"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteArtworkButton({
  artworkId,
  title,
}: {
  artworkId: string;
  title: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete “${title}”?\n\nThe artwork and its stored image are removed for good. This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/artworks/${artworkId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not delete this artwork.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not delete this artwork.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        data-testid={`admin-delete-artwork-${artworkId}`}
        className="w-full rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
      {error ? (
        <p data-testid={`admin-delete-artwork-error-${artworkId}`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

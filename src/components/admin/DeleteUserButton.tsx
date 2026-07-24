"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteUserButton({ userId, displayName }: { userId: string; displayName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${displayName}? This permanently deletes their account, bio, all artworks, and API keys. This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not delete user.");
        return;
      }

      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        data-testid={`admin-delete-button-${userId}`}
        disabled={deleting}
        onClick={handleDelete}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
      {error ? (
        <p data-testid={`admin-delete-error-${userId}`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

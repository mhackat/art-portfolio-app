"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LockUserButton({ userId, displayName }: { userId: string; displayName: string }) {
  const router = useRouter();
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLock() {
    const confirmed = window.confirm(
      `Lock ${displayName}'s account? This immediately revokes all of their API keys and blocks them from logging in until an admin unlocks it.`
    );
    if (!confirmed) return;

    setError(null);
    setLocking(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/lock`, { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not lock account.");
        return;
      }

      router.refresh();
    } finally {
      setLocking(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        data-testid={`admin-lock-button-${userId}`}
        disabled={locking}
        onClick={handleLock}
        className="text-sm text-amber-700 hover:underline disabled:opacity-50"
      >
        {locking ? "Locking..." : "Lock"}
      </button>
      {error ? (
        <p data-testid={`admin-lock-error-${userId}`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

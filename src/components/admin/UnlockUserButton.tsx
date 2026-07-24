"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnlockUserButton({ userId, displayName }: { userId: string; displayName: string }) {
  const router = useRouter();
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    setError(null);
    setUnlocking(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/unlock`, { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not unlock account.");
        return;
      }

      router.refresh();
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        data-testid={`admin-unlock-button-${userId}`}
        disabled={unlocking}
        onClick={handleUnlock}
        className="text-sm text-blue-700 hover:underline disabled:opacity-50"
      >
        {unlocking ? "Unlocking..." : `Unlock ${displayName}`}
      </button>
      {error ? (
        <p data-testid={`admin-unlock-error-${userId}`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

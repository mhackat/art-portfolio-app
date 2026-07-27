"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RevokeAccessCodeButton({
  codeId,
  codePrefix,
}: {
  codeId: string;
  codePrefix: string;
}) {
  const router = useRouter();
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    const confirmed = window.confirm(
      `Revoke code ${codePrefix}…?\n\nWhoever is holding it will no longer be able to sign up with it. This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setRevoking(true);

    try {
      const res = await fetch(`/api/admin/access-codes/${codeId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not revoke this code.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not revoke this code.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {error ? (
        <span data-testid={`admin-revoke-code-error-${codeId}`} className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleRevoke}
        disabled={revoking}
        data-testid={`admin-revoke-code-${codeId}`}
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {revoking ? "Revoking..." : "Revoke"}
      </button>
    </span>
  );
}

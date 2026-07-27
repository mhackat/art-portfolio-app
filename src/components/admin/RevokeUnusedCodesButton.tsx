"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RevokeUnusedCodesButton({ unusedCount }: { unusedCount: number }) {
  const router = useRouter();
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleRevokeAll() {
    const confirmed = window.confirm(
      `Revoke all ${unusedCount} outstanding code${unusedCount === 1 ? "" : "s"}?\n\n` +
        `Anyone already holding one will no longer be able to sign up. Codes that have already been used are ` +
        `left alone. This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setResult(null);
    setRevoking(true);

    try {
      const res = await fetch("/api/admin/access-codes/revoke-unused", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not revoke the outstanding codes.");
        return;
      }

      const body = await res.json();
      setResult(`Revoked ${body.count} code${body.count === 1 ? "" : "s"}.`);
      router.refresh();
    } catch {
      setError("Could not revoke the outstanding codes.");
    } finally {
      setRevoking(false);
    }
  }

  if (unusedCount === 0) {
    return (
      <p data-testid="admin-revoke-unused-none" className="text-xs text-gray-500">
        No outstanding codes.
      </p>
    );
  }

  return (
    <div data-testid="admin-revoke-unused">
      <button
        type="button"
        onClick={handleRevokeAll}
        disabled={revoking}
        data-testid="admin-revoke-unused-button"
        className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {revoking ? "Revoking..." : `Revoke all ${unusedCount} outstanding`}
      </button>
      {result ? (
        <p data-testid="admin-revoke-unused-result" className="mt-1 text-xs text-green-700">
          {result}
        </p>
      ) : null}
      {error ? (
        <p data-testid="admin-revoke-unused-error" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";

export default function RevokeAllKeysButton() {
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleRevokeAll() {
    const confirmed = window.confirm(
      "Revoke every API key for every user on the site? This immediately ends all Bearer-token API sessions app-wide, including your own if you're using one. This cannot be undone."
    );
    if (!confirmed) return;

    setError(null);
    setResult(null);
    setRevoking(true);

    try {
      const res = await fetch("/api/admin/revoke-all-keys", { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not revoke API keys.");
        return;
      }

      const body = await res.json();
      setResult(`Revoked ${body.count} API key${body.count === 1 ? "" : "s"}.`);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div data-testid="admin-revoke-all-keys">
      <button
        type="button"
        data-testid="admin-revoke-all-keys-button"
        disabled={revoking}
        onClick={handleRevokeAll}
        className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {revoking ? "Revoking..." : "Revoke all API authorizations"}
      </button>
      {result ? (
        <p data-testid="admin-revoke-all-keys-result" className="mt-1 text-xs text-green-700">
          {result}
        </p>
      ) : null}
      {error ? (
        <p data-testid="admin-revoke-all-keys-error" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function ApiKeyManager({ initialKeys }: { initialKeys: ApiKey[] }) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setCopied(false);

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Default" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not create API key.");
        return;
      }

      const created = await res.json();
      setKeys((prev) => [
        { id: created.id, name: created.name, keyPrefix: created.keyPrefix, createdAt: created.createdAt, lastUsedAt: null },
        ...prev,
      ]);
      setNewRawKey(created.key);
      setName("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    setRevokingId(id);

    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not revoke API key.");
        return;
      }

      setKeys((prev) => prev.filter((k) => k.id !== id));
      router.refresh();
    } finally {
      setRevokingId(null);
    }
  }

  async function handleCopy() {
    if (!newRawKey) return;
    await navigator.clipboard.writeText(newRawKey);
    setCopied(true);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Use an API key to call the API directly (e.g. to upload artwork images) without a browser
        session. Send it as <code className="rounded bg-gray-100 px-1">Authorization: Bearer &lt;key&gt;</code>.
        See <a href="/api-docs" className="underline">/api-docs</a> for the full API reference.
      </p>

      {newRawKey ? (
        <div data-testid="api-key-reveal" className="rounded border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium">
            Copy this key now — it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code data-testid="api-key-value" className="flex-1 overflow-x-auto rounded bg-white px-2 py-1 text-sm">
              {newRawKey}
            </code>
            <button
              type="button"
              data-testid="api-key-copy-button"
              onClick={handleCopy}
              className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleCreate} data-testid="api-key-form" className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="apiKeyName" className="block text-sm font-medium">
            Key name
          </label>
          <input
            id="apiKeyName"
            data-testid="api-key-name-input"
            type="text"
            placeholder="Default"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          data-testid="api-key-create-button"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? "Generating..." : "Generate key"}
        </button>
      </form>

      {error ? (
        <p data-testid="api-key-error" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <ul data-testid="api-key-list" className="divide-y divide-gray-200 rounded border border-gray-200">
        {keys.length === 0 ? (
          <li className="p-3 text-sm text-gray-500">No API keys yet.</li>
        ) : (
          keys.map((key) => (
            <li
              key={key.id}
              data-testid={`api-key-item-${key.id}`}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {key.name} <span className="font-mono text-gray-500">{key.keyPrefix}...</span>
                </p>
                <p className="text-gray-500">
                  Created {formatDate(key.createdAt)} · Last used {formatDate(key.lastUsedAt)}
                </p>
              </div>
              <button
                type="button"
                data-testid={`api-key-revoke-button-${key.id}`}
                disabled={revokingId === key.id}
                onClick={() => handleRevoke(key.id)}
                className="text-red-600 hover:underline disabled:opacity-50"
              >
                {revokingId === key.id ? "Revoking..." : "Revoke"}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

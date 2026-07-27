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
    <div className="space-y-5">
      <p className="text-sm text-neutral-600">
        Send it as{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
          Authorization: Bearer &lt;key&gt;
        </code>
        . See{" "}
        <a href="/api-docs" className="underline hover:text-neutral-900">
          the API reference
        </a>{" "}
        for what you can call.
      </p>

      {newRawKey ? (
        <div data-testid="api-key-reveal" className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-900">
            Copy this now — it won&apos;t be shown again
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code
              data-testid="api-key-value"
              className="flex-1 select-all overflow-x-auto rounded border border-amber-200 bg-white px-3 py-2 font-mono text-sm"
            >
              {newRawKey}
            </code>
            <button
              type="button"
              data-testid="api-key-copy-button"
              onClick={handleCopy}
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm text-white transition-colors hover:bg-neutral-700"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleCreate}
        data-testid="api-key-form"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-4"
      >
        <div className="min-w-[12rem] flex-1">
          <label
            htmlFor="apiKeyName"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500"
          >
            Key name
          </label>
          <input
            id="apiKeyName"
            data-testid="api-key-name-input"
            type="text"
            placeholder="Default"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
          />
        </div>
        <button
          type="submit"
          data-testid="api-key-create-button"
          disabled={submitting}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
        >
          {submitting ? "Generating..." : "Generate key"}
        </button>
      </form>

      {error ? (
        <p data-testid="api-key-error" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <ul data-testid="api-key-list" className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
        {keys.length === 0 ? (
          <li className="p-4 text-sm text-neutral-500">No API keys yet.</li>
        ) : (
          keys.map((key) => (
            <li
              key={key.id}
              data-testid={`api-key-item-${key.id}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 text-sm transition-colors hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {key.name}{" "}
                  <span className="font-mono text-xs text-neutral-500">{key.keyPrefix}…</span>
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Created {formatDate(key.createdAt)} · Last used {formatDate(key.lastUsedAt)}
                </p>
              </div>
              <button
                type="button"
                data-testid={`api-key-revoke-button-${key.id}`}
                disabled={revokingId === key.id}
                onClick={() => handleRevoke(key.id)}
                className="shrink-0 rounded-full border border-red-300 px-3 py-1.5 text-xs text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
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

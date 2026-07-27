"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_PASSWORD = "Test123!";
const DEFAULT_COUNT = 20;

type SeedResult = {
  runId: string;
  count: number;
  users: { username: string; email: string; displayName: string }[];
};

export default function SeedArtistsButton() {
  const router = useRouter();
  const [count, setCount] = useState(String(DEFAULT_COUNT));
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSeed() {
    const parsedCount = Number(count);
    const confirmed = window.confirm(
      `Create ${parsedCount} demo artist accounts, all sharing the password "${password}"?\n\n` +
        `These are real, working accounts on this environment. They can be removed later from the user list.`
    );
    if (!confirmed) return;

    setError(null);
    setResult(null);
    setCopied(false);
    setRunning(true);

    try {
      const res = await fetch("/api/admin/seed/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parsedCount, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not create demo artists.");
        return;
      }

      setResult(await res.json());
      router.refresh();
    } catch {
      setError("Could not create demo artists.");
    } finally {
      setRunning(false);
    }
  }

  async function copyRunId() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.runId);
      setCopied(true);
    } catch {
      setError("Could not copy — select the run id manually.");
    }
  }

  return (
    <div data-testid="admin-seed-artists" className="rounded border border-gray-200 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-gray-600">
          Artists
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            data-testid="admin-seed-artists-count"
            className="mt-1 w-24 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-600">
          Shared password
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="admin-seed-artists-password"
            className="mt-1 w-48 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
          />
        </label>
        <button
          type="button"
          onClick={handleSeed}
          disabled={running}
          data-testid="admin-seed-artists-button"
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {running ? "Creating..." : "Create demo artists"}
        </button>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Creates working accounts that all share the password above. Galleries are uploaded separately, per
        artist, using the run id below.
      </p>

      {result ? (
        <div data-testid="admin-seed-artists-result" className="mt-3 rounded border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-900">
            Created {result.count} artist{result.count === 1 ? "" : "s"}. Every username ends with this run id —
            it&apos;s what the artwork uploader targets.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="select-all rounded border border-green-300 bg-white px-2 py-1 text-sm">
              {result.runId}
            </code>
            <button
              type="button"
              onClick={copyRunId}
              data-testid="admin-seed-artists-copy"
              className="rounded border border-green-300 px-2 py-1 text-xs text-green-800 hover:bg-green-100"
            >
              {copied ? "Copied" : "Copy run id"}
            </button>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-green-900">Show usernames</summary>
            <ul className="mt-1 space-y-0.5 text-xs text-green-900">
              {result.users.map((u) => (
                <li key={u.username}>
                  @{u.username} — {u.displayName}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}

      {error ? (
        <p data-testid="admin-seed-artists-error" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

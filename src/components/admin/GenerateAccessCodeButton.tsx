"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateAccessCodeButton() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");

  async function handleGenerate() {
    setError(null);
    setCode(null);
    setCopied(false);
    setGenerating(true);

    try {
      const res = await fetch("/api/admin/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not generate an access code.");
        return;
      }

      const body = await res.json();
      setCode(body.code);
      setNote("");
      // Refresh the server-rendered list below so the new code appears there too.
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError("Could not copy to clipboard — select and copy the code manually.");
    }
  }

  return (
    <div data-testid="admin-generate-access-code" className="rounded border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Optional note (who is this for?)"
          data-testid="admin-generate-access-code-note"
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          data-testid="admin-generate-access-code-button"
          disabled={generating}
          onClick={handleGenerate}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate access code"}
        </button>
      </div>

      {code ? (
        <div data-testid="admin-generate-access-code-result" className="mt-3 rounded border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-900">
            Copy this now — it is stored hashed and cannot be shown again. Give it to the new user; it works for
            exactly one signup.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 select-all break-all rounded border border-green-300 bg-white px-2 py-1 text-sm">
              {code}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              data-testid="admin-generate-access-code-copy"
              className="rounded border border-green-300 px-2 py-1 text-xs text-green-800 hover:bg-green-100"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p data-testid="admin-generate-access-code-error" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

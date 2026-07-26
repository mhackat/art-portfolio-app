"use client";

import { useState } from "react";

export default function AdminPasswordActions({ userId }: { userId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSettingPassword(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not set password.");
        return;
      }

      setPassword("");
      setSuccessMessage("Password updated.");
    } finally {
      setSettingPassword(false);
    }
  }

  async function handleGenerateResetLink() {
    setError(null);
    setSuccessMessage(null);
    setResetUrl(null);
    setCopied(false);
    setGeneratingLink(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-link`, { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not generate reset link.");
        return;
      }

      const body = await res.json();
      setResetUrl(body.resetUrl);
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleCopy() {
    if (!resetUrl) return;
    await navigator.clipboard.writeText(resetUrl);
    setCopied(true);
  }

  if (!expanded) {
    return (
      <button
        type="button"
        data-testid={`admin-password-actions-toggle-${userId}`}
        onClick={() => setExpanded(true)}
        className="whitespace-nowrap text-base text-gray-700 hover:underline"
      >
        Change Password
      </button>
    );
  }

  return (
    <div data-testid={`admin-password-actions-${userId}`} className="space-y-3 rounded border border-gray-200 p-3">
      <form onSubmit={handleSetPassword} className="flex items-end gap-2">
        <div>
          <label htmlFor={`set-password-${userId}`} className="block text-xs font-medium">
            Set a new password directly
          </label>
          <input
            id={`set-password-${userId}`}
            data-testid={`admin-set-password-input-${userId}`}
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          data-testid={`admin-set-password-button-${userId}`}
          disabled={settingPassword}
          className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {settingPassword ? "Saving..." : "Set password"}
        </button>
      </form>

      <div>
        <button
          type="button"
          data-testid={`admin-generate-reset-link-button-${userId}`}
          disabled={generatingLink}
          onClick={handleGenerateResetLink}
          className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {generatingLink ? "Generating..." : "Generate reset link"}
        </button>

        {resetUrl ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              data-testid={`admin-reset-link-input-${userId}`}
              type="text"
              readOnly
              value={resetUrl}
              onFocus={(e) => e.target.select()}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <button
              type="button"
              data-testid={`admin-reset-link-copy-button-${userId}`}
              onClick={handleCopy}
              className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
      </div>

      {successMessage ? (
        <p data-testid={`admin-password-actions-success-${userId}`} className="text-xs text-green-700">
          {successMessage}
        </p>
      ) : null}
      {error ? (
        <p data-testid={`admin-password-actions-error-${userId}`} className="text-xs text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="text-xs text-gray-500 hover:underline"
      >
        Close
      </button>
    </div>
  );
}

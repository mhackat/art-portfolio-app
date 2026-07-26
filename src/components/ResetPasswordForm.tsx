"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not reset password.");
        return;
      }

      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <p data-testid="reset-password-missing-token" className="mt-6 text-sm text-red-600">
        This link is missing its reset token. Ask an admin to generate a new one.
      </p>
    );
  }

  if (success) {
    return (
      <div data-testid="reset-password-success" className="mt-6">
        <p className="text-sm text-gray-700">Password updated. You can now log in.</p>
        <Link href="/login" className="mt-2 inline-block underline">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit} data-testid="reset-password-form">
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          data-testid="reset-password-input"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          data-testid="reset-password-confirm-input"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      {error ? (
        <p data-testid="reset-password-error" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        data-testid="reset-password-submit-button"
        disabled={submitting}
        className="w-full rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? "Updating..." : "Set new password"}
      </button>
    </form>
  );
}

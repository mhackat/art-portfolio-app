"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error === "ACCOUNT_LOCKED"
            ? "This account has been locked. Contact an admin to unlock it."
            : "Invalid email/username or password."
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">Log in</h1>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} data-testid="login-form">
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium">
            Email or username
          </label>
          <input
            id="identifier"
            data-testid="login-identifier-input"
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            data-testid="login-password-input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        {error ? (
          <p data-testid="login-error" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          data-testid="login-submit-button"
          disabled={submitting}
          className="w-full rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Need an account?{" "}
        <Link href="/signup" data-testid="login-signup-link" className="underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}

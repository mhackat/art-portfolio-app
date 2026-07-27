"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, displayName, password, accessCode: accessCode.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not create account.");
        return;
      }

      const signInResult = await signIn("credentials", {
        identifier: email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
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
      <h1 className="text-2xl font-semibold">Sign up</h1>

      <p
        data-testid="signup-access-code-notice"
        className="mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
      >
        Sign up is invite-only. You need a one-time access code to create an account — please contact{" "}
        <a href="mailto:hirehackett@gmail.com" className="font-medium underline">
          hirehackett@gmail.com
        </a>{" "}
        for an access code.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} data-testid="signup-form">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium">
            Display name
          </label>
          <input
            id="displayName"
            data-testid="signup-displayname-input"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            data-testid="signup-username-input"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            data-testid="signup-email-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            data-testid="signup-password-input"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="accessCode" className="block text-sm font-medium">
            Access code
          </label>
          <input
            id="accessCode"
            data-testid="signup-access-code-input"
            type="text"
            required
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="inv_..."
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-600">
            Don&apos;t have one? Contact{" "}
            <a href="mailto:hirehackett@gmail.com" className="underline">
              hirehackett@gmail.com
            </a>
            .
          </p>
        </div>

        {error ? (
          <p data-testid="signup-error" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          data-testid="signup-submit-button"
          disabled={submitting}
          className="w-full rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" data-testid="signup-login-link" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}

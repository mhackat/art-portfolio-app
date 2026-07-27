"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  username: "Username",
  password: "Password",
  displayName: "Display name",
  accessCode: "Access code",
};

type ValidationIssue = { message?: string; path?: (string | number)[] };

/**
 * The API answers a rejected sign-up with a generic `message` plus a per-field
 * `issues` array. Showing only the message leaves the reader staring at
 * "Invalid request body." with no idea which field is wrong, so prefer the
 * issues whenever they're present.
 */
function describeSignupError(body: { message?: string; issues?: ValidationIssue[] } | null): string[] {
  if (body?.issues?.length) {
    const described = body.issues
      .map((issue) => {
        if (!issue.message) return null;
        const label = typeof issue.path?.[0] === "string" ? FIELD_LABELS[issue.path[0] as string] : undefined;
        return label ? `${label}: ${issue.message}` : issue.message;
      })
      .filter((line): line is string => Boolean(line));

    if (described.length > 0) return described;
  }

  return [body?.message ?? "Could not create account."];
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, displayName, password, accessCode: accessCode.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErrors(describeSignupError(body));
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
          {/* Mirrors the server's rules so the browser catches the common
              mistakes (spaces, dots, too short) before a round trip. The server
              still validates — this is convenience, not the boundary. */}
          <input
            id="username"
            data-testid="signup-username-input"
            type="text"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_\-]+"
            title="Letters, numbers, hyphens and underscores only"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            3–30 characters. Letters, numbers, hyphens and underscores only.
          </p>
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

        {errors.length > 0 ? (
          <div
            data-testid="signup-error"
            role="alert"
            className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errors.length === 1 ? (
              <p>{errors[0]}</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </div>
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

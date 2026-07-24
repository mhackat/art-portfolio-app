"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BioEditor({ username, initialBio }: { username: string; initialBio: string }) {
  const router = useRouter();
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/users/by-username/${username}/bio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not update bio.");
        return;
      }

      setSaved(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="bio-form" className="space-y-3">
      <label htmlFor="bio" className="block text-sm font-medium">
        Bio
      </label>
      <textarea
        id="bio"
        data-testid="bio-textarea"
        rows={4}
        maxLength={2000}
        value={bio}
        onChange={(e) => {
          setBio(e.target.value);
          setSaved(false);
        }}
        className="w-full rounded border border-gray-300 px-3 py-2"
      />

      {error ? (
        <p data-testid="bio-error" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p data-testid="bio-saved" className="text-sm text-green-700">
          Saved.
        </p>
      ) : null}

      <button
        type="submit"
        data-testid="bio-save-button"
        disabled={submitting}
        className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save bio"}
      </button>
    </form>
  );
}

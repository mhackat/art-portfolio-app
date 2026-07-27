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
    <form onSubmit={handleSubmit} data-testid="bio-form">
      <label htmlFor="bio" className="sr-only">
        Bio
      </label>
      <textarea
        id="bio"
        data-testid="bio-textarea"
        rows={4}
        maxLength={2000}
        placeholder="A line or two about your work."
        value={bio}
        onChange={(e) => {
          setBio(e.target.value);
          setSaved(false);
        }}
        className="w-full rounded-lg border border-neutral-300 px-4 py-3 leading-relaxed outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900"
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          data-testid="bio-save-button"
          disabled={submitting}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save bio"}
        </button>

        {/* Sits beside the counter rather than above the button, so the form
            doesn't reflow and shift the button as messages come and go. */}
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

        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
          {bio.length} / 2000
        </span>
      </div>
    </form>
  );
}

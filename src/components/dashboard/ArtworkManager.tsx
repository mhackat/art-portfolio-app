"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Artwork = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
};

export default function ArtworkManager({
  username,
  initialArtworks,
}: {
  username: string;
  initialArtworks: Artwork[];
}) {
  const router = useRouter();
  const [artworks, setArtworks] = useState(initialArtworks);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return selected ? URL.createObjectURL(selected) : null;
    });
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please choose an image file.");
      return;
    }

    setSubmitting(true);

    try {
      const form = new FormData();
      form.set("title", title);
      form.set("description", description);
      form.set("file", file);

      const res = await fetch(`/api/users/by-username/${username}/artworks`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not add artwork.");
        return;
      }

      const created = await res.json();
      setArtworks((prev) => [created, ...prev]);
      resetForm();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(artworkId: string) {
    setError(null);
    setDeletingId(artworkId);

    try {
      const res = await fetch(`/api/artworks/${artworkId}`, { method: "DELETE" });

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not delete artwork.");
        return;
      }

      setArtworks((prev) => prev.filter((a) => a.id !== artworkId));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAll() {
    const confirmed = window.confirm(
      `Delete all ${artworks.length} artwork${artworks.length === 1 ? "" : "s"}? This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setDeletingAll(true);

    try {
      const res = await fetch(`/api/users/by-username/${username}/artworks`, { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not delete artworks.");
        return;
      }

      setArtworks([]);
      router.refresh();
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleAdd}
        data-testid="artwork-form"
        className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-4 sm:p-5"
      >
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div>
            <label htmlFor="title" className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              Title
            </label>
            <input
              id="title"
              data-testid="artwork-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 outline-none transition-colors focus:border-neutral-900"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500"
            >
              Description <span className="normal-case tracking-normal text-neutral-400">(optional)</span>
            </label>
            <input
              id="description"
              data-testid="artwork-description-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 outline-none transition-colors focus:border-neutral-900"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="image" className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            Image
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="Selected artwork preview"
                data-testid="artwork-image-preview"
                className="h-20 w-20 shrink-0 rounded-lg border border-neutral-200 object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-neutral-300 text-neutral-300">
                <span aria-hidden="true" className="text-2xl">
                  +
                </span>
              </div>
            )}
            <input
              id="image"
              data-testid="artwork-image-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              required
              ref={fileInputRef}
              onChange={handleFileChange}
              className="flex-1 text-sm text-neutral-600 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-neutral-300 file:bg-white file:px-4 file:py-2 file:text-sm file:text-neutral-800 hover:file:border-neutral-900"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            data-testid="artwork-add-button"
            disabled={submitting}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
          >
            {submitting ? "Uploading..." : "Add artwork"}
          </button>
          {error ? (
            <p data-testid="artwork-error" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      </form>

      {artworks.length === 0 ? (
        <p data-testid="artwork-empty-state" className="text-sm text-neutral-500">
          Nothing published yet — the first piece you add shows up on your profile straight away.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
              {artworks.length} published
            </span>
            <button
              type="button"
              data-testid="artwork-delete-all-button"
              disabled={deletingAll}
              onClick={handleDeleteAll}
              className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {deletingAll ? "Deleting all..." : "Delete all"}
            </button>
          </div>

          <ul data-testid="artwork-list" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => (
              <li
                key={artwork.id}
                data-testid={`artwork-item-${artwork.id}`}
                className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-md"
              >
                <div className="relative overflow-hidden bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-4">
                  <h3 className="truncate font-medium" title={artwork.title}>
                    {artwork.title}
                  </h3>
                  {artwork.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{artwork.description}</p>
                  ) : null}
                  <button
                    type="button"
                    data-testid={`artwork-delete-button-${artwork.id}`}
                    disabled={deletingId === artwork.id}
                    onClick={() => handleDelete(artwork.id)}
                    className="mt-3 text-sm text-red-600 transition-colors hover:text-red-800 disabled:opacity-50"
                  >
                    {deletingId === artwork.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

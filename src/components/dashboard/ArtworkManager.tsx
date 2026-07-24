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

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} data-testid="artwork-form" className="space-y-3">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            data-testid="artwork-title-input"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <input
            id="description"
            data-testid="artwork-description-input"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium">
            Image
          </label>
          <input
            id="image"
            data-testid="artwork-image-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            required
            ref={fileInputRef}
            onChange={handleFileChange}
            className="mt-1 w-full text-sm"
          />
          {previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl}
              alt="Selected artwork preview"
              data-testid="artwork-image-preview"
              className="mt-2 h-32 w-32 rounded border border-gray-200 object-cover"
            />
          ) : null}
        </div>

        {error ? (
          <p data-testid="artwork-error" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          data-testid="artwork-add-button"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? "Uploading..." : "Add artwork"}
        </button>
      </form>

      <ul data-testid="artwork-list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {artworks.map((artwork) => (
          <li
            key={artwork.id}
            data-testid={`artwork-item-${artwork.id}`}
            className="rounded border border-gray-200 p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artwork.imageUrl} alt={artwork.title} className="h-40 w-full rounded object-cover" />
            <h3 className="mt-2 font-medium">{artwork.title}</h3>
            {artwork.description ? <p className="text-sm text-gray-600">{artwork.description}</p> : null}
            <button
              type="button"
              data-testid={`artwork-delete-button-${artwork.id}`}
              disabled={deletingId === artwork.id}
              onClick={() => handleDelete(artwork.id)}
              className="mt-2 text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              {deletingId === artwork.id ? "Deleting..." : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

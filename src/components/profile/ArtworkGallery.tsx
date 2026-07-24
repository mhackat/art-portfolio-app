"use client";

import { useEffect, useState } from "react";

type Artwork = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
};

export default function ArtworkGallery({ artworks }: { artworks: Artwork[] }) {
  const [selected, setSelected] = useState<Artwork | null>(null);

  useEffect(() => {
    if (!selected) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selected]);

  if (artworks.length === 0) {
    return (
      <p className="mt-8 text-sm text-gray-500" data-testid="profile-empty-state">
        No artworks yet.
      </p>
    );
  }

  return (
    <>
      <ul data-testid="profile-artwork-list" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {artworks.map((artwork) => (
          <li key={artwork.id} data-testid={`profile-artwork-item-${artwork.id}`} className="rounded border border-gray-200 p-3">
            <button
              type="button"
              onClick={() => setSelected(artwork)}
              data-testid={`profile-artwork-open-${artwork.id}`}
              className="block w-full cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artwork.imageUrl} alt={artwork.title} className="h-40 w-full rounded object-cover" />
            </button>
            <h3 className="mt-2 font-medium">{artwork.title}</h3>
            {artwork.description ? <p className="text-sm text-gray-600">{artwork.description}</p> : null}
          </li>
        ))}
      </ul>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
          data-testid="artwork-modal-backdrop"
        >
          <div
            className="relative max-h-full max-w-full"
            onClick={(e) => e.stopPropagation()}
            data-testid="artwork-modal"
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              data-testid="artwork-modal-close"
              aria-label="Close"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.imageUrl}
              alt={selected.title}
              className="max-h-[85vh] max-w-full rounded object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 rounded-b bg-black/70 p-4 text-white">
              <h3 data-testid="artwork-modal-title" className="text-lg font-semibold">
                {selected.title}
              </h3>
              {selected.description ? (
                <p data-testid="artwork-modal-description" className="mt-1 text-sm text-gray-200">
                  {selected.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

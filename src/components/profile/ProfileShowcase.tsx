"use client";

import { useEffect, useState } from "react";
import { useRevealOnScroll } from "@/components/motion/Reveal";
import ArtworkSection from "@/components/artwork/ArtworkSection";

type Artwork = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
};

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[11px] uppercase tracking-[0.22em] ${className}`}>{children}</span>;
}

export default function ProfileShowcase({
  displayName,
  username,
  bio,
  artworks,
}: {
  displayName: string;
  username: string;
  bio: string;
  artworks: Artwork[];
}) {
  const [selected, setSelected] = useState<Artwork | null>(null);
  const nameWords = displayName.split(/\s+/).filter(Boolean);

  useRevealOnScroll([artworks.length]);

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

  return (
    <>
      {/* Sticky identity bar — stays on screen for the whole scroll so it's always
          clear whose portfolio this is, however deep into the work you are. */}
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-4 gap-y-1 px-6 py-3 sm:px-8">
          <span className="enter text-lg font-medium tracking-[-0.02em]" style={{ animationDelay: "0.05s" }}>
            {displayName}
          </span>
          <Eyebrow className="enter text-neutral-400">@{username}</Eyebrow>
          <Eyebrow className="enter ml-auto text-neutral-400">
            {artworks.length} {artworks.length === 1 ? "work" : "works"}
          </Eyebrow>
        </div>
      </div>

      <main data-testid="profile-page">
        {/* --------------------------------------------------------------- HERO
            Kept deliberately compact — an introduction, not a landing page. The
            work below is what the reader came for. */}
        <header className="px-6 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12">
          <div className="mx-auto max-w-6xl">
            <div className="enter flex flex-wrap items-center gap-x-4 gap-y-2 text-neutral-400">
              <Eyebrow>Portfolio</Eyebrow>
              <span className="h-px w-8 bg-neutral-300" />
              <Eyebrow>@{username}</Eyebrow>
            </div>

            {/* Animates on load rather than on scroll — it's already on screen, so
                waiting for an intersection would mean nothing visibly happens. */}
            <h1
              data-testid="profile-displayname"
              className="mt-4 text-[clamp(2rem,5.5vw,3.75rem)] font-medium leading-[0.96] tracking-[-0.04em]"
            >
              {nameWords.map((word, i) => (
                <span
                  key={`${word}-${i}`}
                  className="enter inline-block"
                  style={{ animationDelay: `${0.12 + i * 0.07}s` }}
                >
                  {word}
                  {i < nameWords.length - 1 ? " " : ""}
                </span>
              ))}
            </h1>

            {/* Bio and scroll cue share a row on wide screens rather than stacking,
                which keeps the whole introduction inside one screenful. */}
            <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              {bio ? (
                <p
                  data-testid="profile-bio"
                  className="enter max-w-xl leading-relaxed text-neutral-600"
                  style={{ animationDelay: "0.4s" }}
                >
                  {bio}
                </p>
              ) : (
                <span />
              )}

              {artworks.length > 0 ? (
                <div className="enter flex items-center gap-3 text-neutral-400" style={{ animationDelay: "0.5s" }}>
                  <span className="blink">↓</span>
                  <Eyebrow>Scroll the collection</Eyebrow>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {artworks.length === 0 ? (
          <p
            data-testid="profile-empty-state"
            className="px-6 pb-32 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400 sm:px-8"
          >
            No artworks yet
          </p>
        ) : (
          <div data-testid="profile-artwork-list">
            {artworks.map((artwork, i) => (
              <ArtworkSection
                key={artwork.id}
                testId={`profile-artwork-item-${artwork.id}`}
                actionTestId={`profile-artwork-open-${artwork.id}`}
                imageUrl={artwork.imageUrl}
                title={artwork.title}
                description={artwork.description}
                index={i}
                meta={displayName}
                eager={i === 0}
                ctaLabel="View full size"
                action={{
                  kind: "button",
                  onClick: () => setSelected(artwork),
                  ariaLabel: `Open ${artwork.title} full size`,
                }}
              />
            ))}
          </div>
        )}
      </main>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setSelected(null)}
          data-testid="artwork-modal-backdrop"
        >
          {/* Column, so the caption sits below the artwork rather than on top of
              it. The two heights are budgeted separately — image up to 70vh,
              caption up to 22vh — so a long description scrolls itself instead of
              pushing the picture off screen. */}
          <div
            className="relative flex max-h-[92vh] max-w-full flex-col overflow-hidden rounded-lg bg-neutral-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="artwork-modal"
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              data-testid="artwork-modal-close"
              aria-label="Close"
              className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.imageUrl}
              alt={selected.title}
              className="max-h-[70vh] max-w-[92vw] object-contain"
            />
            <div className="max-h-[22vh] shrink-0 overflow-y-auto border-t border-white/10 p-4 text-white">
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

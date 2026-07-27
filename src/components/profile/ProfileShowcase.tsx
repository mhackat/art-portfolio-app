"use client";

import { useEffect, useState } from "react";
import { Reveal, Words, useRevealOnScroll } from "@/components/motion/Reveal";

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
            {artworks.map((artwork, i) => {
              // Alternate which edge the caption sits against so the scroll doesn't
              // settle into a single repeating rhythm.
              const textRight = i % 2 === 1;

              return (
                <section
                  key={artwork.id}
                  data-testid={`profile-artwork-item-${artwork.id}`}
                  className="group relative flex min-h-[88vh] items-end overflow-hidden sm:items-center"
                >
                  {/* The artwork fills the whole section. object-cover crops rather
                      than letterboxes, which is the trade for edge-to-edge — the
                      modal is where the uncropped piece lives. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    // The first piece is the largest thing after the hero — eager so
                    // it isn't the slow paint.
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="absolute inset-0 h-full w-full scale-[1.02] object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                  />

                  {/* Scrim. Vertical on phones, where a side gradient would leave
                      text over the busiest part of the image; horizontal from the
                      caption's edge on wider screens. Without this, legibility
                      depends entirely on what the artist happened to upload. */}
                  <div
                    aria-hidden="true"
                    className={`absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/50 to-neutral-950/20 ${
                      textRight ? "md:bg-gradient-to-l" : "md:bg-gradient-to-r"
                    }`}
                  />

                  {/* Full-bleed click target sits under the caption so a click
                      anywhere on the artwork opens it. */}
                  <button
                    type="button"
                    onClick={() => setSelected(artwork)}
                    data-testid={`profile-artwork-open-${artwork.id}`}
                    aria-label={`Open ${artwork.title} full size`}
                    className="absolute inset-0 z-10 cursor-zoom-in"
                  />

                  {/* pointer-events-none so clicks pass through the caption to the
                      full-bleed button underneath — otherwise the artwork opens
                      everywhere except on its own title. The CTA re-enables them. */}
                  <div className="pointer-events-none relative z-20 mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
                    <div className={`relative max-w-xl ${textRight ? "md:ml-auto" : ""}`}>
                      {/* Overlay panel behind the caption. Reveals on scroll ahead of
                          the text so the surface arrives first and the words land on
                          it. Negative z-index is safe here: the caption wrapper is
                          `relative z-20`, so it owns a stacking context and this can
                          only go behind its own text — never behind the artwork.
                          Also carries the contrast the text needs, since a scrim
                          alone can't be trusted against every uploaded image. */}
                      <Reveal className="absolute -inset-x-5 -inset-y-6 -z-10 sm:-inset-x-7 sm:-inset-y-8">
                        <div className="h-full w-full rounded-2xl bg-neutral-950/55 shadow-2xl ring-1 ring-white/10 backdrop-blur-[3px]" />
                      </Reveal>

                      <Reveal delay={1}>
                        <div className="flex items-center gap-4 text-white/60">
                          <Eyebrow>W/{String(i + 1).padStart(3, "0")}</Eyebrow>
                          <span className="h-px w-8 bg-white/40" />
                          <Eyebrow>{displayName}</Eyebrow>
                        </div>
                      </Reveal>

                      {/* Starts after the panel and eyebrow so the cascade reads
                          surface → label → title → description → action. */}
                      <Words
                        as="h2"
                        text={artwork.title}
                        startDelay={0.16}
                        className="mt-5 text-[clamp(1.75rem,4.5vw,3.25rem)] font-medium leading-[1.04] tracking-[-0.035em] text-white"
                      />

                      {artwork.description ? (
                        <Reveal delay={4}>
                          <p className="mt-5 text-lg leading-relaxed text-white/80">{artwork.description}</p>
                        </Reveal>
                      ) : null}

                      <Reveal delay={5}>
                        {/* pointer-events-auto: the caption column sits above the
                            full-bleed button, so this needs to take its own clicks. */}
                        <button
                          type="button"
                          onClick={() => setSelected(artwork)}
                          className="swap pointer-events-auto mt-8 rounded-full bg-white px-6 py-3 text-sm text-neutral-900"
                        >
                          <span>View full size</span>
                          <span className="grid place-items-center" aria-hidden="true">
                            View full size
                          </span>
                        </button>
                      </Reveal>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setSelected(null)}
          data-testid="artwork-modal-backdrop"
        >
          <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()} data-testid="artwork-modal">
            <button
              type="button"
              onClick={() => setSelected(null)}
              data-testid="artwork-modal-close"
              aria-label="Close"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
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

"use client";

import Link from "next/link";
import { Reveal, Words } from "@/components/motion/Reveal";

/**
 * One artwork, filling a section edge to edge with its caption overlaid.
 *
 * Shared by the public profile (where a click opens the piece full size) and the
 * landing page (where it leads to the artist), so the two can't drift apart.
 * That difference is the only thing callers vary: pass an `onClick` or an `href`.
 */

type Action =
  | { kind: "button"; onClick: () => void; ariaLabel: string }
  | { kind: "link"; href: string; ariaLabel: string };

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[11px] uppercase tracking-[0.22em] ${className}`}>{children}</span>;
}

export default function ArtworkSection({
  imageUrl,
  title,
  description,
  index,
  meta,
  action,
  ctaLabel,
  eager = false,
  testId,
  actionTestId,
}: {
  imageUrl: string;
  title: string;
  description?: string;
  /** Zero-based; rendered as W/001 and used to alternate the caption's side. */
  index: number;
  /** Right-hand eyebrow — the artist's name. */
  meta: string;
  action: Action;
  ctaLabel: string;
  eager?: boolean;
  testId?: string;
  actionTestId?: string;
}) {
  // Alternate which edge the caption sits against so the scroll doesn't settle
  // into a single repeating rhythm.
  const textRight = index % 2 === 1;

  return (
    <section
      data-testid={testId}
      className="group relative flex min-h-[88vh] items-end overflow-hidden sm:items-center"
    >
      {/* The artwork fills the whole section. object-cover crops rather than
          letterboxes, which is the trade for edge-to-edge. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={title}
        // The first piece is the largest thing after the hero — eager so it isn't
        // the slow paint.
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full scale-[1.02] object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
      />

      {/* Scrim. Vertical on phones, where a side gradient would leave text over
          the busiest part of the image; horizontal from the caption's edge on
          wider screens. Without this, legibility depends entirely on what the
          artist happened to upload. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/50 to-neutral-950/20 ${
          textRight ? "md:bg-gradient-to-l" : "md:bg-gradient-to-r"
        }`}
      />

      {/* Full-bleed target under the caption, so a click anywhere on the artwork
          does the thing rather than only the CTA doing it. */}
      {action.kind === "button" ? (
        <button
          type="button"
          onClick={action.onClick}
          data-testid={actionTestId}
          aria-label={action.ariaLabel}
          className="absolute inset-0 z-10 cursor-zoom-in"
        />
      ) : (
        <Link
          href={action.href}
          data-testid={actionTestId}
          aria-label={action.ariaLabel}
          className="absolute inset-0 z-10"
        />
      )}

      {/* pointer-events-none so clicks pass through the caption to the target
          underneath — otherwise the artwork responds everywhere except on its own
          title. The CTA re-enables them. */}
      <div className="pointer-events-none relative z-20 mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        <div className={`relative max-w-xl ${textRight ? "md:ml-auto" : ""}`}>
          {/* Overlay panel behind the caption. Reveals on scroll ahead of the text
              so the surface arrives first and the words land on it. Negative
              z-index is safe here: the caption wrapper is `relative z-20`, so it
              owns a stacking context and this can only go behind its own text —
              never behind the artwork. It also carries the contrast the text
              needs, since a scrim alone can't be trusted against every image. */}
          <Reveal className="absolute -inset-x-5 -inset-y-6 -z-10 sm:-inset-x-7 sm:-inset-y-8">
            <div className="h-full w-full rounded-2xl bg-neutral-950/55 shadow-2xl ring-1 ring-white/10 backdrop-blur-[3px]" />
          </Reveal>

          <Reveal delay={1}>
            <div className="flex items-center gap-4 text-white/60">
              <Eyebrow>W/{String(index + 1).padStart(3, "0")}</Eyebrow>
              <span className="h-px w-8 bg-white/40" />
              <Eyebrow>{meta}</Eyebrow>
            </div>
          </Reveal>

          {/* Starts after the panel and eyebrow so the cascade reads
              surface → label → title → description → action. */}
          <Words
            as="h2"
            text={title}
            startDelay={0.16}
            className="mt-5 text-[clamp(1.75rem,4.5vw,3.25rem)] font-medium leading-[1.04] tracking-[-0.035em] text-white"
          />

          {description ? (
            <Reveal delay={4}>
              <p className="mt-5 text-lg leading-relaxed text-white/80">{description}</p>
            </Reveal>
          ) : null}

          <Reveal delay={5}>
            {/* pointer-events-auto: the caption column sits above the full-bleed
                target, so this needs to take its own clicks. */}
            {action.kind === "button" ? (
              <button
                type="button"
                onClick={action.onClick}
                className="swap pointer-events-auto mt-8 rounded-full bg-white px-6 py-3 text-sm text-neutral-900"
              >
                <span>{ctaLabel}</span>
                <span className="grid place-items-center" aria-hidden="true">
                  {ctaLabel}
                </span>
              </button>
            ) : (
              <Link
                href={action.href}
                className="swap pointer-events-auto mt-8 rounded-full bg-white px-6 py-3 text-sm text-neutral-900"
              >
                <span>{ctaLabel}</span>
                <span className="grid place-items-center" aria-hidden="true">
                  {ctaLabel}
                </span>
              </Link>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

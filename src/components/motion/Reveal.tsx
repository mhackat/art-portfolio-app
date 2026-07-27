"use client";

import { useEffect } from "react";

/**
 * Shared scroll-reveal used by /tour and /browse. The hidden starting state
 * lives in globals.css (`.reveal`); this only decides when to add `.is-visible`.
 *
 * The root layout carries a <noscript> override that cancels the hidden state
 * entirely, so a browser without JavaScript sees the content rather than a
 * blank page.
 */

/**
 * Watches every `.reveal` / `.tour-rule` currently in the document and reveals
 * it once it scrolls into view.
 *
 * `deps` re-runs the scan — pass whatever changes when new elements are appended
 * (an item count, for instance) so lazily-loaded content gets observed too.
 * Already-revealed elements are skipped on re-scan, so re-running is cheap and
 * never replays an animation the reader has already seen.
 */
export function useRevealOnScroll(deps: unknown[] = []) {
  useEffect(() => {
    const targets = document.querySelectorAll(
      ".reveal:not(.is-visible), .reveal-words:not(.is-visible), .tour-rule:not(.is-visible)"
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          // Reveal is one-way: stop watching so scrolling back up doesn't
          // re-trigger a fade the reader has already watched.
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Heading that animates in a word at a time once scrolled into view.
 *
 * Words are separate inline-blocks with an incremental transition-delay. The
 * trailing space is kept inside each word rather than between spans, because
 * whitespace between inline-blocks is collapsed by the layout engine and the
 * line would otherwise render as one run-on string.
 *
 * `as` picks the element so this can be an h1 on one page and an h2 on another
 * without nesting extra tags inside the heading.
 */
export function Words({
  text,
  as: Tag = "span",
  className = "",
  stagger = 0.055,
  startDelay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  /** Seconds added per word. */
  stagger?: number;
  /** Seconds before the first word starts. */
  startDelay?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag className={`reveal-words ${className}`}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="word" style={{ transitionDelay: `${startDelay + i * stagger}s` }}>
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}

/** Wraps content in the reveal treatment; `delay` staggers siblings. */
export function Reveal({
  children,
  delay,
  className = "",
}: {
  children: React.ReactNode;
  delay?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}) {
  return <div className={`reveal ${delay ? `reveal-delay-${delay}` : ""} ${className}`}>{children}</div>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Reveal, useRevealOnScroll } from "@/components/motion/Reveal";
import type { FeedItem } from "@/lib/discovery";

/** How many artworks each network request pulls. Small enough that a page lands
 * quickly, large enough that scrolling doesn't fire a request every other tile. */
const PAGE_SIZE = 10;

/** Auto-loading pauses every this many artworks and waits for a deliberate click,
 * so an idle scroll can't pull the whole gallery down by itself. */
const GATE_EVERY = 20;

export default function BrowseFeed({
  seed,
  initialItems,
  initialCursor,
}: {
  seed: string;
  initialItems: FeedItem[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState(GATE_EVERY);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Read inside the observer callback, which closes over its first render's
  // values — a ref keeps the check against current state.
  const state = useRef({ loading, cursor, count: items.length, gate });
  state.current = { loading, cursor, count: items.length, gate };

  // Re-scans when the list grows so lazily-appended tiles animate in too.
  useRevealOnScroll([items.length]);

  const loadMore = useCallback(async () => {
    const { loading: busy, cursor: from } = state.current;
    if (busy || !from) return;

    // Claim the slot synchronously. `loading` state only reaches the ref on the
    // next render, so two observer callbacks firing back-to-back would both get
    // past the check above and fetch the same cursor twice.
    state.current.loading = true;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ seed, cursor: from, limit: String(PAGE_SIZE) });
      const res = await fetch(`/api/browse/feed?${params.toString()}`);
      if (!res.ok) {
        setError("Could not load more artwork.");
        return;
      }

      const page: { items: FeedItem[]; nextCursor: string | null } = await res.json();
      // Guard against a duplicate in-flight request landing twice.
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
      });
      setCursor(page.nextCursor);
    } catch {
      setError("Could not load more artwork.");
    } finally {
      setLoading(false);
    }
  }, [seed]);

  // Auto-load when the sentinel scrolls into view, but only below the gate.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const { loading: busy, cursor: from, count, gate: ceiling } = state.current;
        if (busy || !from || count >= ceiling) return;
        void loadMore();
      },
      // Start fetching a screenful early so the next tiles are usually in place
      // before the reader reaches them.
      { rootMargin: "600px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const atGate = cursor !== null && items.length >= gate;
  const exhausted = cursor === null;

  function handleLoadMore() {
    setGate((g) => g + GATE_EVERY);
    void loadMore();
  }

  if (items.length === 0) {
    return (
      <p className="mt-16 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400" data-testid="browse-empty-state">
        No artwork published yet
      </p>
    );
  }

  return (
    <div>
      <ul
        data-testid="browse-artwork-grid"
        className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
      >
        {items.map((item, i) => (
          <li key={item.id} data-testid={`browse-artwork-item-${item.id}`}>
            {/* Stagger only within a row so a tile never waits on one far above it. */}
            <Reveal delay={((i % 3) + 1) as 1 | 2 | 3}>
              <Link href={`/${item.username}`} className="group block">
                <div className="relative overflow-hidden rounded-lg bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-700 backdrop-blur">
                    A/{String(i + 1).padStart(3, "0")}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-neutral-900 pt-3">
                  <h2 className="truncate text-lg font-medium tracking-[-0.02em]">{item.title}</h2>
                  <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400 transition-colors group-hover:text-neutral-900">
                    View
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-neutral-500">
                  {item.displayName} <span className="text-neutral-400">@{item.username}</span>
                </p>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>

      {/* Sentinel: parked below the grid so it enters view as the reader nears the end. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

      <div className="mt-16 flex flex-col items-center justify-center gap-4">
        {error ? (
          <p data-testid="browse-feed-error" className="font-mono text-[11px] uppercase tracking-[0.22em] text-red-600">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p data-testid="browse-feed-loading" className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
            Loading<span className="blink">…</span>
          </p>
        ) : null}

        {atGate && !loading ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
              {items.length} shown
            </p>
            <button
              type="button"
              onClick={handleLoadMore}
              data-testid="browse-load-more-button"
              className="swap rounded-full bg-neutral-900 px-7 py-3.5 text-sm text-white"
            >
              <span>Load more</span>
              <span className="grid place-items-center" aria-hidden="true">
                Load more
              </span>
            </button>
          </>
        ) : null}

        {exhausted && !loading ? (
          <p data-testid="browse-feed-end" className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
            End — {items.length} works
          </p>
        ) : null}
      </div>
    </div>
  );
}

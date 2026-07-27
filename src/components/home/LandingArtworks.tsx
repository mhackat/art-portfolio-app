"use client";

import { useRevealOnScroll } from "@/components/motion/Reveal";
import ArtworkSection from "@/components/artwork/ArtworkSection";
import type { FeedItem } from "@/lib/discovery";

/**
 * The landing page's run of artworks, shown the same way a portfolio shows its
 * own — full bleed, caption overlaid.
 *
 * Unlike the profile, each piece here belongs to a different artist, so the
 * click leads to whoever made it rather than opening the image: on a front page
 * the useful next step is the person, not a bigger picture.
 *
 * Also hosts the reveal observer for the whole page. It scans the document, so
 * the server-rendered hero above animates from here too.
 */
export default function LandingArtworks({ items }: { items: FeedItem[] }) {
  useRevealOnScroll([items.length]);

  if (items.length === 0) {
    return (
      <p
        data-testid="landing-empty-state"
        className="px-6 pb-32 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400 sm:px-8"
      >
        No artwork published yet
      </p>
    );
  }

  return (
    <div data-testid="landing-artwork-list">
      {items.map((item, i) => (
        <ArtworkSection
          key={item.id}
          testId={`landing-artwork-item-${item.id}`}
          actionTestId={`landing-artwork-link-${item.id}`}
          imageUrl={item.imageUrl}
          title={item.title}
          index={i}
          meta={item.displayName}
          eager={i === 0}
          ctaLabel={`View ${item.displayName}`}
          action={{
            kind: "link",
            href: `/${item.username}`,
            ariaLabel: `View ${item.displayName}'s portfolio`,
          }}
        />
      ))}
    </div>
  );
}

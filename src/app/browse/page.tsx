import { randomBytes } from "crypto";
import type { Metadata } from "next";
import { getShuffledArtworkFeed } from "@/lib/discovery";
import BrowseFeed from "@/components/browse/BrowseFeed";

export const metadata: Metadata = {
  title: "Browse — Art Portfolio",
  description: "A shuffled gallery of work from artists across the platform.",
};

export const dynamic = "force-dynamic";

/** Matches the client's page size so the first scroll continues seamlessly. */
const FIRST_PAGE_SIZE = 10;

export default async function BrowsePage() {
  // A fresh seed per visit is what reshuffles the gallery; it then stays fixed
  // for every page the client requests, which is what keeps paging stable.
  const seed = randomBytes(8).toString("hex");
  const { items, nextCursor } = await getShuffledArtworkFeed(seed, null, FIRST_PAGE_SIZE);

  return (
    <main className="px-6 pb-32 pt-16 sm:px-8 sm:pt-24" data-testid="browse-page">
      <div className="mx-auto max-w-6xl">
        <header className="mb-16 sm:mb-24">
          <div className="reveal">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-neutral-400">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em]">Art Portfolio®</span>
              <span className="h-px w-8 bg-neutral-300" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em]">The gallery</span>
            </div>
          </div>

          <div className="reveal reveal-delay-1">
            <h1 className="mt-8 text-[clamp(2.5rem,8vw,6rem)] font-medium leading-[0.94] tracking-[-0.045em]">
              Work from
              <br />
              <span className="text-neutral-400">across the platform.</span>
            </h1>
          </div>

          <div className="reveal reveal-delay-2">
            <p className="mt-10 max-w-xl text-lg leading-relaxed text-neutral-600">
              A shuffled selection, reordered every visit, with each artist limited to a handful of pieces so
              nobody crowds out the rest. Keep scrolling — it loads as you go. Any piece takes you to the
              artist who made it.
            </p>
          </div>
        </header>

        <BrowseFeed seed={seed} initialItems={items} initialCursor={nextCursor} />
      </div>
    </main>
  );
}

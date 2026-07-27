import { randomBytes } from "crypto";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getShuffledArtworkFeed } from "@/lib/discovery";
import LandingArtworks from "@/components/home/LandingArtworks";

export const dynamic = "force-dynamic";

/** Enough to establish the place without turning the front page into the gallery. */
const FEATURED_COUNT = 10;

export default async function Home() {
  // Fresh seed per visit, so the front page isn't the same ten pieces forever.
  const seed = randomBytes(8).toString("hex");

  const [{ items }, artworkCount, artistCount] = await Promise.all([
    getShuffledArtworkFeed(seed, null, FEATURED_COUNT),
    prisma.artwork.count(),
    prisma.user.count({ where: { artworks: { some: {} } } }),
  ]);

  return (
    <main data-testid="home-page">
      {/* ----------------------------------------------------------------- HERO */}
      <header className="px-6 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="enter flex flex-wrap items-center gap-x-4 gap-y-2 text-neutral-400">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em]">Art Portfolio®</span>
            <span className="h-px w-8 bg-neutral-300" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em]">A gallery for artists</span>
          </div>

          <h1 className="mt-10 text-[clamp(2.75rem,9vw,7.5rem)] font-medium leading-[0.9] tracking-[-0.045em]">
            <span className="enter inline-block" style={{ animationDelay: "0.1s" }}>
              Somewhere
            </span>{" "}
            <span className="enter inline-block" style={{ animationDelay: "0.18s" }}>
              to put
            </span>
            <br />
            <span className="enter inline-block text-neutral-400" style={{ animationDelay: "0.26s" }}>
              the work.
            </span>
          </h1>

          <div className="mt-12 grid gap-10 sm:mt-16 md:grid-cols-[1.1fr_1fr] md:gap-16">
            <p
              className="enter max-w-xl text-lg leading-relaxed text-neutral-600"
              style={{ animationDelay: "0.36s" }}
            >
              A home for an artist&apos;s gallery, a public profile, and an API that treats the two as the same
              thing. Below is a shuffled handful of what people have published — reordered every visit, one
              piece per artist before anyone&apos;s second.
            </p>

            <dl
              className="enter grid grid-cols-2 gap-x-6 gap-y-8 border-t border-neutral-200 pt-8 md:border-l md:border-t-0 md:pl-12 md:pt-0"
              style={{ animationDelay: "0.44s" }}
            >
              <div>
                <dd className="font-mono text-4xl font-light tracking-[-0.04em]">{artistCount}</dd>
                <dt className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                  Artists
                </dt>
              </div>
              <div>
                <dd className="font-mono text-4xl font-light tracking-[-0.04em]">{artworkCount}</dd>
                <dt className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                  Works
                </dt>
              </div>
            </dl>
          </div>

          <div className="enter mt-16 flex items-center gap-3 text-neutral-400 sm:mt-20" style={{ animationDelay: "0.52s" }}>
            <span className="blink">↓</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em]">
              {FEATURED_COUNT} pieces, chosen at random
            </span>
          </div>
        </div>
      </header>

      <LandingArtworks items={items} />

      {/* ------------------------------------------------------------------ CTA */}
      <section className="border-t border-neutral-200 px-6 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="reveal">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
              That&apos;s ten of {artworkCount}
            </span>
            <h2 className="mt-6 max-w-4xl text-[clamp(2rem,6vw,4.5rem)] font-medium leading-[1] tracking-[-0.04em]">
              There is rather more where that came from.
            </h2>
          </div>

          <div className="reveal reveal-delay-2 mt-10 flex flex-wrap gap-3">
            <Link href="/browse" className="swap rounded-full bg-neutral-900 px-7 py-3.5 text-sm text-white">
              <span>Browse the gallery</span>
              <span className="grid place-items-center" aria-hidden="true">
                Browse the gallery
              </span>
            </Link>
            <Link href="/tour" className="swap rounded-full border border-neutral-300 px-7 py-3.5 text-sm">
              <span>How it&apos;s built</span>
              <span className="grid place-items-center" aria-hidden="true">
                How it&apos;s built
              </span>
            </Link>
          </div>

          <div className="reveal reveal-delay-3 mt-20 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-200 pt-8 text-neutral-400">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em]">Art Portfolio®</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em]">
              <Link href="/api-docs" className="hover:text-neutral-900">
                API
              </Link>
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] sm:ml-auto">
              Invite-only — contact for access
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

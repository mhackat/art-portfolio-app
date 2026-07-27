"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Reveal, useRevealOnScroll } from "@/components/motion/Reveal";

/**
 * Figures quoted on the page. Kept in one place, and deliberately describing
 * shape rather than secrets — no environment names, hostnames, thresholds, or
 * credentials appear anywhere in this file.
 *
 * These are counted by hand from the two repositories; if the API or the suite
 * grows, update them here rather than in the copy below.
 */
const STATS = {
  endpoints: 30,
  routeFiles: 26,
  models: 6,
  migrations: 5,
  tests: 54,
  suites: 7,
};

const SUITES = [
  {
    id: "auth",
    name: "Auth",
    count: 9,
    body: "Login and logout over the API: correct credentials issue a token, wrong ones don't, and a revoked session stops authenticating immediately.",
  },
  {
    id: "artworks",
    name: "Artworks",
    count: 17,
    body: "The largest suite. Multipart uploads with a real image fixture, oversized-file rejection, ownership enforcement, and update/delete round-trips verified against what was actually sent.",
  },
  {
    id: "discovery",
    name: "Discovery",
    count: 9,
    body: "Public read paths — search, listing, pagination, and fetching a profile by id or username, including the shapes returned for accounts that don't exist.",
  },
  {
    id: "api-keys",
    name: "API keys",
    count: 7,
    body: "Key lifecycle: creation returns the raw value exactly once, the list only ever exposes prefixes, and deletion provably stops the key from authenticating.",
  },
  {
    id: "bio",
    name: "Bio",
    count: 6,
    body: "Runs serially by design — every test mutates the same field, so parallel execution would race a write in one test against a read-after-write assertion in another.",
  },
  {
    id: "admin",
    name: "Admin",
    count: 6,
    body: "Privileged endpoints, tagged so they can never run in CI. Covers the negative space: non-admins forbidden, unauthenticated requests rejected, self-deletion blocked.",
  },
];

const SECTIONS = [
  { id: "overview", index: "001", label: "Overview" },
  { id: "architecture", index: "002", label: "Architecture" },
  { id: "api", index: "003", label: "The API" },
  { id: "security", index: "004", label: "Security" },
  { id: "testing", index: "005", label: "Testing" },
  { id: "pipeline", index: "006", label: "Pipeline" },
  { id: "tradeoffs", index: "007", label: "Tradeoffs" },
  { id: "numbers", index: "008", label: "Numbers" },
];

const TICKER = [
  "TYPESCRIPT",
  "NEXT.JS 14",
  "POSTGRESQL",
  "PRISMA",
  "PLAYWRIGHT",
  "OPENAPI 3.0",
  "CI/CD",
  "REST",
  "ZOD",
  "BCRYPT",
  "OBJECT STORAGE",
  "SERVER COMPONENTS",
];

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-[0.22em] ${className}`}>{children}</span>
  );
}

function SectionHeading({
  index,
  kicker,
  title,
  dark = false,
}: {
  index: string;
  kicker: string;
  title: string;
  dark?: boolean;
}) {
  return (
    <div className="mb-12 sm:mb-16">
      <Reveal>
        <div className={`flex items-center gap-4 ${dark ? "text-neutral-500" : "text-neutral-400"}`}>
          <Eyebrow>/{index}</Eyebrow>
          <span className={`h-px w-8 ${dark ? "bg-neutral-700" : "bg-neutral-300"}`} />
          <Eyebrow>{kicker}</Eyebrow>
        </div>
      </Reveal>
      <Reveal delay={1}>
        <h2
          className={`mt-5 max-w-4xl text-[clamp(2rem,5.5vw,4rem)] font-medium leading-[1.02] tracking-[-0.035em] ${
            dark ? "text-white" : "text-neutral-900"
          }`}
        >
          {title}
        </h2>
      </Reveal>
    </div>
  );
}

/** Counts up to `value` the first time it scrolls into view, then stays put. */
function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect the same motion preference the stylesheet honours — jump straight
    // to the final value rather than animating.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || started.current) continue;
          started.current = true;

          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            // Ease-out cubic: fast off the mark, settling into the final number.
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(value * eased));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display}</span>;
}

function Ticker({ reverse = false }: { reverse?: boolean }) {
  // Rendered twice so the -50% keyframe lands exactly on a repeat.
  const row = (
    <div className="flex shrink-0 items-center">
      {TICKER.map((word) => (
        <span key={word} className="flex items-center">
          <span className="px-6 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500 sm:px-8">
            {word}
          </span>
          <span className="text-neutral-300">✳</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="tour-marquee overflow-hidden border-y border-neutral-200 py-4" aria-hidden="true">
      <div className={`tour-marquee-track ${reverse ? "tour-marquee-track--reverse" : ""}`}>
        {row}
        {row}
      </div>
    </div>
  );
}

/** Horizontal suite rail — snap-scrolls natively on touch, drags with a mouse. */
function SuiteRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Touch already has momentum scrolling; only take over for mouse input.
    if (e.pointerType !== "mouse" || !railRef.current) return;
    drag.current = { active: true, startX: e.clientX, startScroll: railRef.current.scrollLeft };
    railRef.current.classList.add("is-dragging");
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || !railRef.current) return;
    e.preventDefault();
    railRef.current.scrollLeft = drag.current.startScroll - (e.clientX - drag.current.startX);
  }, []);

  const endDrag = useCallback(() => {
    if (!railRef.current) return;
    drag.current.active = false;
    railRef.current.classList.remove("is-dragging");
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 text-neutral-500">
        <Eyebrow>Drag / swipe</Eyebrow>
        <span className="h-px w-10 bg-neutral-700" />
        <Eyebrow>{SUITES.length} suites</Eyebrow>
      </div>

      <div
        ref={railRef}
        className="tour-rail -mx-6 flex cursor-grab gap-4 overflow-x-auto px-6 pb-4 sm:-mx-8 sm:px-8"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {SUITES.map((suite, i) => (
          <article
            key={suite.id}
            className="flex w-[78vw] shrink-0 flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-6 sm:w-[340px] sm:p-8"
          >
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow className="text-neutral-500">
                  S/{String(i + 1).padStart(3, "0")}
                </Eyebrow>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <Eyebrow className="text-emerald-400">Pass</Eyebrow>
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-medium tracking-[-0.02em] text-white">{suite.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{suite.body}</p>
            </div>
            <p className="mt-8 font-mono text-5xl font-light tracking-[-0.04em] text-white">
              {String(suite.count).padStart(2, "0")}
              <span className="ml-2 align-middle font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                tests
              </span>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function TourContent() {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(SECTIONS[0].id);

  useRevealOnScroll();

  // Scroll progress bar + which section the side index should highlight.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);

        // The active section is the last one whose top has passed the upper
        // third of the viewport — steadier than a pure intersection test when
        // sections are taller than the screen.
        const marker = window.innerHeight / 3;
        let current = SECTIONS[0].id;
        for (const section of SECTIONS) {
          const el = document.getElementById(section.id);
          if (el && el.getBoundingClientRect().top <= marker) current = section.id;
        }
        setActive(current);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="bg-white text-neutral-900">
      {/* Scroll progress */}
      {/* Above the sticky nav (z-50) so the 2px line reads across the very top of
          the page rather than being covered by it. */}
      <div className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent">
        <div
          className="h-full origin-left bg-neutral-900 transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Section index — desktop only, mirrors webisoft's fixed side markers */}
      {/* Only shown once the viewport is wide enough for the rail to sit clear of
          the centred content column — below ~1400px it would overlap body text. */}
      <nav
        aria-label="Tour sections"
        className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 min-[1400px]:block"
      >
        <ul className="space-y-3">
          {SECTIONS.map((section) => {
            const isActive = active === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="group flex items-center gap-3"
                  aria-current={isActive ? "true" : undefined}
                >
                  <span
                    className={`h-px transition-all duration-300 ${
                      isActive ? "w-8 bg-neutral-900" : "w-3 bg-neutral-300 group-hover:w-6"
                    }`}
                  />
                  <Eyebrow
                    className={`transition-colors duration-300 ${
                      isActive ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"
                    }`}
                  >
                    {section.index}
                  </Eyebrow>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ---------------------------------------------------------------- HERO */}
      <header className="relative px-6 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-neutral-400">
              <Eyebrow>Art Portfolio®</Eyebrow>
              <span className="h-px w-8 bg-neutral-300" />
              <Eyebrow>Technical tour</Eyebrow>
              <Eyebrow className="ml-auto text-neutral-300">/{SECTIONS.length.toString().padStart(4, "0")}</Eyebrow>
            </div>
          </Reveal>

          <Reveal delay={1}>
            <h1 className="mt-10 text-[clamp(2.75rem,9vw,7.5rem)] font-medium leading-[0.9] tracking-[-0.045em]">
              A small app,
              <br />
              built like a
              <br />
              <span className="text-neutral-400">large one.</span>
            </h1>
          </Reveal>

          <div className="mt-12 grid gap-10 sm:mt-16 md:grid-cols-[1.1fr_1fr] md:gap-16">
            <Reveal delay={2}>
              <p className="max-w-xl text-lg leading-relaxed text-neutral-600">
                This is a portfolio platform for artists — profiles, galleries, image uploads, a documented
                public API. The product is the easy half. The half worth showing you is everything wrapped
                around it: how requests are authorized, how the API contract stays honest, and the test suite
                that has to go green before a single line reaches production.
              </p>
            </Reveal>

            <Reveal delay={3}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-neutral-200 pt-8 md:border-l md:border-t-0 md:pl-12 md:pt-0">
                {[
                  { k: "Endpoints", v: STATS.endpoints },
                  { k: "Automated tests", v: STATS.tests },
                  { k: "Data models", v: STATS.models },
                  { k: "Migrations", v: STATS.migrations },
                ].map((stat) => (
                  <div key={stat.k}>
                    <dd className="font-mono text-4xl font-light tracking-[-0.04em]">
                      <CountUp value={stat.v} />
                    </dd>
                    <dt className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      {stat.k}
                    </dt>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <Reveal delay={4}>
            <div className="mt-16 flex items-center gap-3 text-neutral-400 sm:mt-20">
              <span className="blink">↓</span>
              <Eyebrow>Scroll to begin</Eyebrow>
            </div>
          </Reveal>
        </div>
      </header>

      <Ticker />

      {/* ------------------------------------------------------------ OVERVIEW */}
      <section id="overview" className="scroll-mt-16 px-6 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading index="001" kicker="Overview" title="Built to be tested, not just to work." />

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {[
              {
                n: "01",
                h: "One rule, one place",
                p: "Every mutating route asks the same question through the same function: may this caller act on this resource? Changing the rule means changing one file, and there is nowhere for a route to quietly disagree.",
              },
              {
                n: "02",
                h: "Docs that can't drift",
                p: "The OpenAPI specification is generated at build time from annotations that live beside the handlers themselves. Documentation and behaviour ship together or not at all.",
              },
              {
                n: "03",
                h: "A gate, not a habit",
                p: "The test suite lives in its own repository and runs as a required check. Reaching production isn't a matter of remembering to run the tests — it's mechanically impossible while they're red.",
              },
            ].map((item, i) => (
              <Reveal key={item.n} delay={(i + 1) as 1 | 2 | 3}>
                <div className="border-t border-neutral-900 pt-5">
                  <Eyebrow className="text-neutral-400">{item.n}</Eyebrow>
                  <h3 className="mt-4 text-xl font-medium tracking-[-0.02em]">{item.h}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">{item.p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- ARCHITECTURE */}
      <section id="architecture" className="scroll-mt-16 border-t border-neutral-200 px-6 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            index="002"
            kicker="Architecture"
            title="A typed path from the browser to the database."
          />

          <div className="space-y-0">
            {[
              {
                k: "Framework",
                v: "Next.js 14, App Router",
                p: "Authenticated pages render on the server as React Server Components, so the dashboard and admin views arrive already populated instead of flashing empty and then fetching.",
              },
              {
                k: "Language",
                v: "TypeScript, strict mode",
                p: "Types run end to end — the database client is generated from the schema, so a column rename becomes a compile error in every file that touched it rather than a runtime surprise.",
              },
              {
                k: "Data",
                v: `PostgreSQL via Prisma · ${STATS.models} models`,
                p: `Schema changes ship as ${STATS.migrations} versioned migrations, applied automatically as part of deployment. The schema is never edited by hand in a live environment.`,
              },
              {
                k: "Validation",
                v: "Zod at every boundary",
                p: "Request bodies and route parameters are parsed into typed values before any handler logic runs. Malformed input fails fast with a structured response, never a stack trace.",
              },
              {
                k: "Media",
                v: "S3-compatible object storage",
                p: "Images live in object storage rather than the database, addressed by generated keys. A reconciliation job sweeps for files whose database records are gone, so deletes can't quietly leak storage.",
              },
              {
                k: "Sessions",
                v: "Two front doors, one lock",
                p: "The browser authenticates with a session cookie; scripts authenticate with a bearer API key. Both resolve to the same identity and pass through the same authorization check.",
              },
            ].map((row, i) => (
              <Reveal key={row.k}>
                <div className="grid gap-3 border-b border-neutral-200 py-8 md:grid-cols-[140px_1fr_1.4fr] md:gap-8">
                  <Eyebrow className="pt-1 text-neutral-400">
                    {String(i + 1).padStart(2, "0")} — {row.k}
                  </Eyebrow>
                  <h3 className="text-lg font-medium tracking-[-0.02em]">{row.v}</h3>
                  <p className="text-sm leading-relaxed text-neutral-600">{row.p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- API */}
      <section id="api" className="scroll-mt-16 border-t border-neutral-200 px-6 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            index="003"
            kicker="The API"
            title="A public contract, generated from the code that honours it."
          />

          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <Reveal>
              <p className="text-lg leading-relaxed text-neutral-600">
                {STATS.endpoints} endpoints across {STATS.routeFiles} route modules, all reachable with an API
                key as well as from the browser. The interactive documentation is generated from the source at
                build time — so the page you can click through is produced by the same commit that defines the
                behaviour, not maintained alongside it and hoped to match.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/api-docs"
                  className="swap rounded-full bg-neutral-900 px-6 py-3 text-sm text-white"
                >
                  <span>Open the live API docs</span>
                  {/* Purely the hover-swap copy — hidden from assistive tech so the
                      label isn't announced twice. */}
                  <span className="grid place-items-center" aria-hidden="true">
                    Open the live API docs
                  </span>
                </Link>
                <Link
                  href="/browse"
                  className="swap rounded-full border border-neutral-300 px-6 py-3 text-sm"
                >
                  <span>Browse the gallery</span>
                  <span className="grid place-items-center" aria-hidden="true">
                    Browse the gallery
                  </span>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={1}>
              <div className="overflow-hidden rounded-lg border border-neutral-200">
                <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                  <Eyebrow className="ml-2 text-neutral-400">Request</Eyebrow>
                </div>
                <pre className="overflow-x-auto px-4 py-5 font-mono text-xs leading-relaxed text-neutral-700">
                  <code>{`GET /api/users/by-username/:username
Authorization: Bearer <your-api-key>
Accept: application/json

200 OK
{
  "username": "...",
  "displayName": "...",
  "bio": "...",
  "artworks": [ ... ]
}`}</code>
                </pre>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-neutral-500">
                Keys are issued per account from the dashboard, shown once, and revocable at any time.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ SECURITY */}
      <section id="security" className="scroll-mt-16 border-t border-neutral-200 px-6 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading index="004" kicker="Security" title="Assume the database will be read by someone else." />

          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                h: "Nothing sensitive at rest",
                p: "Passwords are hashed with bcrypt and a per-user salt. API keys, reset tokens and invite codes are stored only as digests — the raw value is displayed exactly once, at creation, and cannot be recovered afterwards.",
              },
              {
                h: "Authorization in one function",
                p: "Ownership checks aren't sprinkled through handlers. Every mutating route defers to a single module, which makes the rule auditable and testable in isolation.",
              },
              {
                h: "Lockout that actually revokes",
                p: "Repeated failed logins lock an account, and locking revokes active API keys rather than merely blocking future logins. Live sessions are re-checked per request, so access ends immediately.",
              },
              {
                h: "Rate limiting by identity",
                p: "Limits are keyed to the account being acted on rather than the caller's IP address — so users behind one shared address, including CI, can't exhaust each other's budget.",
              },
              {
                h: "Invite-only registration",
                p: "Accounts require a single-use code. Redemption and account creation happen inside one transaction with a guard on the code's unused state, so two people racing the same code cannot both succeed.",
              },
              {
                h: "Privilege re-checked live",
                p: "Administrative access is resolved from an allowlist on every single request instead of being baked into a token at login. Revoking it takes effect on the next request, with nothing stale to expire.",
              },
            ].map((item, i) => (
              <Reveal key={item.h} delay={((i % 3) + 1) as 1 | 2 | 3}>
                <div className="h-full border-t border-neutral-900 pt-5">
                  <h3 className="text-lg font-medium tracking-[-0.02em]">{item.h}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">{item.p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Ticker reverse />

      {/* ------------------------------------------------------------- TESTING */}
      <section id="testing" className="scroll-mt-16 bg-neutral-950 px-6 py-24 text-white sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            index="005"
            kicker="Testing"
            title="An independent suite that can veto a release."
            dark
          />

          <div className="mb-16 grid gap-12 md:grid-cols-2 md:gap-16">
            <Reveal>
              <p className="text-lg leading-relaxed text-neutral-400">
                {STATS.tests} automated tests live in a separate repository from the application, exercising it
                purely over HTTP — the same way any other consumer would. Nothing reaches inside the process,
                stubs the database, or trusts an internal function. If the suite passes, the API genuinely
                behaves as promised from the outside.
              </p>
            </Reveal>
            <Reveal delay={1}>
              <ul className="space-y-4 text-sm leading-relaxed text-neutral-400">
                {[
                  "Authenticates once per run and shares the token, so the suite tests the rate limiter instead of tripping it.",
                  "Suites that mutate shared state are marked serial; everything else runs in parallel.",
                  "Privileged tests are tagged and excluded by tag, not by hoping a secret stays unset.",
                  "Failures retain a full trace — request, response and timing — so a red CI run is diagnosable without a rerun.",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal>
            <SuiteRail />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ PIPELINE */}
      <section id="pipeline" className="scroll-mt-16 border-t border-neutral-200 px-6 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading index="006" kicker="Pipeline" title="Red means it does not ship." />

          <div className="relative">
            <div className="tour-rule absolute left-0 top-0 hidden h-px w-full bg-neutral-900 md:block" />
            <ol className="grid gap-10 md:grid-cols-4 md:gap-6 md:pt-10">
              {[
                { n: "01", h: "Open a pull request", p: "Any change targeting the main branch triggers the pipeline automatically." },
                { n: "02", h: "Deploy a preview", p: "The change is built and published to a dedicated pre-production environment with its own isolated database." },
                { n: "03", h: "Run the suite", p: "The external test repository is checked out and run against that environment — real HTTP, real database, real storage." },
                { n: "04", h: "Gate the merge", p: "The result is a required status check. While it's red the merge button is disabled, so production is protected by the pipeline rather than by discipline." },
              ].map((step, i) => (
                <Reveal key={step.n} delay={(i + 1) as 1 | 2 | 3 | 4}>
                  <li className="relative">
                    <span className="absolute -top-10 left-0 hidden h-3 w-px bg-neutral-900 md:block" />
                    <Eyebrow className="text-neutral-400">{step.n}</Eyebrow>
                    <h3 className="mt-3 text-lg font-medium tracking-[-0.02em]">{step.h}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.p}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>

          <Reveal>
            <div className="mt-16 rounded-lg border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
              <Eyebrow className="text-neutral-400">Also automated</Eyebrow>
              <p className="mt-3 max-w-3xl leading-relaxed text-neutral-700">
                Database migrations are applied as part of the deploy step, and the API specification is
                regenerated on every build. Neither is a manual checklist item, because manual checklist items
                are the ones that get skipped at 6pm on a Friday.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- TRADEOFFS */}
      <section id="tradeoffs" className="scroll-mt-16 border-t border-neutral-200 px-6 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading index="007" kicker="Tradeoffs" title="Every decision here cost something." />

          <Reveal>
            <p className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-600">
              Choices worth making are worth writing down, including what they gave up. These are recorded in
              the repositories themselves, next to the code they explain.
            </p>
          </Reveal>

          <div className="space-y-0">
            {[
              {
                d: "The suite runs as one long-lived account and creates none of its own.",
                w: "Fast, and there is no cleanup step to fail.",
                c: "Tests that would prove one user cannot touch another's resources need a second account, so that boundary is verified by hand.",
              },
              {
                d: "Test data is never torn down after a run.",
                w: "You can open the app afterwards and see exactly what the run did.",
                c: "Data accumulates over time and is pruned manually.",
              },
              {
                d: "Administrative access comes from an allowlist, not a role column.",
                w: "No permission system to maintain before there is a second kind of privilege.",
                c: "Granting access is a configuration change rather than something done in the product.",
              },
              {
                d: "Rate limits are keyed to the target identity rather than the caller's address.",
                w: "Shared addresses — offices, CI runners — don't consume one another's budget.",
                c: "A determined caller can spread attempts across many identities, so it is a throttle, not a shield.",
              },
            ].map((row, i) => (
              <Reveal key={row.d}>
                <div className="grid gap-4 border-b border-neutral-200 py-8 md:grid-cols-[1.2fr_1fr_1fr] md:gap-8">
                  <div>
                    <Eyebrow className="text-neutral-400">D/{String(i + 1).padStart(3, "0")}</Eyebrow>
                    <p className="mt-3 font-medium leading-snug tracking-[-0.01em]">{row.d}</p>
                  </div>
                  <div>
                    <Eyebrow className="text-emerald-600">Gained</Eyebrow>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-600">{row.w}</p>
                  </div>
                  <div>
                    <Eyebrow className="text-neutral-400">Given up</Eyebrow>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-600">{row.c}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- NUMBERS */}
      <section id="numbers" className="scroll-mt-16 bg-neutral-950 px-6 py-24 text-white sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading index="008" kicker="By the numbers" title="The whole thing, counted." dark />

          <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3">
            {[
              { v: STATS.tests, k: "Automated tests", s: "Across the API surface" },
              { v: STATS.endpoints, k: "Endpoints", s: "All documented" },
              { v: STATS.suites, k: "Test suites", s: "Organised by feature" },
              { v: STATS.models, k: "Data models", s: "Relational, migrated" },
              { v: STATS.migrations, k: "Migrations", s: "Applied on deploy" },
              { v: 1, k: "Required gate", s: "Between a branch and production" },
            ].map((stat, i) => (
              <Reveal key={stat.k} delay={((i % 3) + 1) as 1 | 2 | 3}>
                <div className="border-t border-neutral-800 pt-5">
                  <p className="font-mono text-[clamp(2.5rem,7vw,4.5rem)] font-light leading-none tracking-[-0.05em]">
                    <CountUp value={stat.v} />
                  </p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-white">{stat.k}</p>
                  <p className="mt-1 text-sm text-neutral-500">{stat.s}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ CTA */}
      <section className="border-t border-neutral-200 px-6 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Eyebrow className="text-neutral-400">Thanks for scrolling</Eyebrow>
            <h2 className="mt-6 max-w-4xl text-[clamp(2rem,6vw,4.5rem)] font-medium leading-[1] tracking-[-0.04em]">
              Questions or inquiries?
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-neutral-600">
              Send an email and I&apos;ll get back to you.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <div className="mt-10">
              <a
                href="mailto:hirehackett@gmail.com"
                className="swap rounded-full bg-neutral-900 px-7 py-3.5 text-sm text-white"
              >
                <span>hirehackett@gmail.com</span>
                <span className="grid place-items-center" aria-hidden="true">
                  hirehackett@gmail.com
                </span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------------- FOOTER */}
      <section className="border-t border-neutral-200 px-6 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-neutral-400">
              <Eyebrow>Art Portfolio®</Eyebrow>
              <Eyebrow>Technical tour</Eyebrow>
              <Eyebrow className="sm:ml-auto">End /{SECTIONS.length.toString().padStart(4, "0")}</Eyebrow>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

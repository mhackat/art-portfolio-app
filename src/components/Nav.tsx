"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const { data: session, status } = useSession();
  const navRef = useRef<HTMLElement>(null);

  /**
   * Publishes the bar's real height as --nav-h so anything else that sticks can
   * sit directly beneath it (the profile page's artist bar does).
   *
   * Measured rather than hardcoded because this row wraps to two lines when a
   * signed-in admin's six links don't fit a phone — so its height depends on
   * auth state and viewport width, not on a breakpoint.
   */
  useEffect(() => {
    const node = navRef.current;
    if (!node) return;

    const publish = () => {
      const height = node.offsetHeight;
      // Ignore a zero/absurd reading taken before styles have settled — the CSS
      // fallback is closer to the truth than a bad measurement would be.
      if (height > 0) {
        document.documentElement.style.setProperty("--nav-h", `${height}px`);
      }
    };

    // First read happens after a frame, so it measures a laid-out, styled bar
    // rather than whatever the markup looks like mid-hydration.
    const frame = requestAnimationFrame(publish);

    const observer = new ResizeObserver(publish);
    observer.observe(node);
    // Belt and braces: ResizeObserver is delivered on the frame lifecycle, so a
    // backgrounded tab can miss changes it would otherwise report.
    window.addEventListener("resize", publish);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", publish);
    };
    // Re-measures when the link set changes (signing in adds rows).
  }, [status, session?.user]);

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md"
    >
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Art Portfolio
        </Link>
        {/* Wraps rather than overflowing: signed in as an admin this row carries
            six items, which is wider than a phone viewport on one line. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" data-testid="nav-links">
          <Link href="/browse" data-testid="nav-browse-link" className="hover:underline">
            Browse
          </Link>
          <Link href="/tour" data-testid="nav-tour-link" className="hover:underline">
            Tour
          </Link>
          {status === "authenticated" && session?.user ? (
            <>
              <Link href="/dashboard" data-testid="nav-dashboard-link" className="hover:underline">
                Dashboard
              </Link>
              <Link
                href={`/${(session.user as any).username}`}
                data-testid="nav-profile-link"
                className="hover:underline"
              >
                My profile
              </Link>
              {(session.user as any).isAdmin ? (
                <Link href="/admin" data-testid="nav-admin-link" className="hover:underline">
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                data-testid="nav-signout-button"
                className="text-gray-600 hover:underline"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </button>
            </>
          ) : status === "unauthenticated" ? (
            <>
              <Link href="/login" data-testid="nav-login-link" className="hover:underline">
                Log in
              </Link>
              <Link
                href="/signup"
                data-testid="nav-signup-link"
                className="rounded bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-700"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const { data: session, status } = useSession();

  return (
    <nav className="border-b border-gray-200">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Art Portfolio
        </Link>
        <div className="flex items-center gap-4 text-sm" data-testid="nav-links">
          <Link href="/browse" data-testid="nav-browse-link" className="hover:underline">
            Browse
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

import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import BioEditor from "@/components/dashboard/BioEditor";
import ArtworkManager from "@/components/dashboard/ArtworkManager";
import ApiKeyManager from "@/components/dashboard/ApiKeyManager";

export const metadata: Metadata = {
  title: "Dashboard — Art Portfolio",
};

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[11px] uppercase tracking-[0.22em] ${className}`}>{children}</span>;
}

/** Consistent shell for each area of the dashboard. */
function Panel({
  label,
  title,
  description,
  children,
  delay,
  testId,
}: {
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
  delay: string;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className="enter rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-4 text-neutral-400">
        <Eyebrow>{label}</Eyebrow>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <h2 className="mt-4 text-xl font-medium tracking-[-0.02em]">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-600">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      username: true,
      bio: true,
      artworks: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, description: true, imageUrl: true },
      },
      apiKeys: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const apiKeys = user.apiKeys.map((key) => ({
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    createdAt: key.createdAt.toISOString(),
    lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
  }));

  return (
    <main className="bg-neutral-50/60" data-testid="dashboard-page">
      <div className="container mx-auto max-w-5xl px-6 py-12 sm:py-16">
        {/* ------------------------------------------------------------- HEADER */}
        <header>
          <div className="enter flex flex-wrap items-center gap-x-4 gap-y-2 text-neutral-400">
            <Eyebrow>Dashboard</Eyebrow>
            <span className="h-px w-8 bg-neutral-300" />
            <Eyebrow>@{user.username}</Eyebrow>
          </div>

          <h1
            className="enter mt-5 text-[clamp(1.875rem,5vw,3rem)] font-medium leading-[1.02] tracking-[-0.035em]"
            style={{ animationDelay: "0.08s" }}
          >
            Welcome, {user.displayName}
          </h1>

          <div
            className="enter mt-6 flex flex-wrap items-center gap-x-8 gap-y-4"
            style={{ animationDelay: "0.16s" }}
          >
            <div>
              <p className="font-mono text-3xl font-light tracking-[-0.04em]">{user.artworks.length}</p>
              <Eyebrow className="text-neutral-400">
                {user.artworks.length === 1 ? "Artwork" : "Artworks"}
              </Eyebrow>
            </div>
            <div>
              <p className="font-mono text-3xl font-light tracking-[-0.04em]">{apiKeys.length}</p>
              <Eyebrow className="text-neutral-400">{apiKeys.length === 1 ? "API key" : "API keys"}</Eyebrow>
            </div>
            <Link
              href={`/${user.username}`}
              data-testid="dashboard-profile-link"
              className="ml-auto rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm transition-colors hover:border-neutral-900"
            >
              View public profile →
            </Link>
          </div>
        </header>

        <div className="mt-10 space-y-6">
          <Panel
            label="01 — Profile"
            title="Bio"
            description="Shown at the top of your public profile, under your name."
            delay="0.24s"
          >
            <BioEditor username={user.username} initialBio={user.bio} />
          </Panel>

          <Panel
            label="02 — Gallery"
            title="Artworks"
            description="Everything here appears on your public profile and can surface on the front page. PNG, JPEG, WebP or GIF, up to 5MB each."
            delay="0.3s"
          >
            <ArtworkManager username={user.username} initialArtworks={user.artworks} />
          </Panel>

          <Panel
            label="03 — Access"
            title="API keys"
            description="For calling the API without a browser session. Each key is shown once, at creation, and can be revoked at any time."
            delay="0.36s"
          >
            <ApiKeyManager initialKeys={apiKeys} />
          </Panel>
        </div>
      </div>
    </main>
  );
}

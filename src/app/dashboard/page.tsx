import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import BioEditor from "@/components/dashboard/BioEditor";
import ArtworkManager from "@/components/dashboard/ArtworkManager";
import ApiKeyManager from "@/components/dashboard/ApiKeyManager";

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
    <main className="container mx-auto max-w-3xl px-6 py-16" data-testid="dashboard-page">
      <h1 className="text-2xl font-semibold">Welcome, {user.displayName}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Public profile:{" "}
        <a className="underline" href={`/${user.username}`}>
          /{user.username}
        </a>
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Bio</h2>
        <div className="mt-3">
          <BioEditor username={user.username} initialBio={user.bio} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Artworks</h2>
        <div className="mt-3">
          <ArtworkManager username={user.username} initialArtworks={user.artworks} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">API keys</h2>
        <div className="mt-3">
          <ApiKeyManager initialKeys={apiKeys} />
        </div>
      </section>
    </main>
  );
}

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("TestPassword123!", 10);

  const userA = await prisma.user.upsert({
    where: { email: "usera@example.com" },
    update: {},
    create: {
      email: "usera@example.com",
      username: "usera",
      passwordHash,
      displayName: "User A",
      bio: "I paint mostly landscapes.",
      artworks: {
        create: [
          {
            title: "Sunset Ridge",
            description: "Oil on canvas, 2024",
            imageUrl: "https://placehold.co/600x400?text=Sunset+Ridge",
          },
        ],
      },
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "userb@example.com" },
    update: {},
    create: {
      email: "userb@example.com",
      username: "userb",
      passwordHash,
      displayName: "User B",
      bio: "Digital illustrator, sci-fi themes.",
      artworks: {
        create: [
          {
            title: "Neon City",
            description: "Digital, 2024",
            imageUrl: "https://placehold.co/600x400?text=Neon+City",
          },
        ],
      },
    },
  });

  console.log({ userA: userA.id, userB: userB.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

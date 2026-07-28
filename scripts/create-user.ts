import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Creates a single account directly, bypassing the invite-only signup flow.
 *
 * Exists for one situation: an environment with no users at all. Signup needs an
 * access code, minting a code needs an admin, and an admin has to be an account
 * — so a freshly reset database can't bootstrap itself over the API.
 *
 * Point it at whichever database needs the account:
 *   DATABASE_URL="postgres://..." USER_EMAIL=you@example.com USER_PASSWORD='...' \
 *     npx tsx scripts/create-user.ts
 *
 * Safe to re-run: an existing email has its password reset instead of erroring.
 * Being an admin is separate — the email must also appear in that deployment's
 * ADMIN_EMAILS variable.
 */

const prisma = new PrismaClient();

const email = process.env.USER_EMAIL;
const password = process.env.USER_PASSWORD;
const username = process.env.USER_USERNAME || "mrhappenstance";
const displayName = process.env.USER_DISPLAY_NAME || "Mr Happenstance";

async function main() {
  if (!email || !password) {
    throw new Error("USER_EMAIL and USER_PASSWORD are required.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required — set it to the database you mean to write to.");
  }

  // Print the host so a mistake is visible before anything is written.
  console.log(`Database host : ${new URL(process.env.DATABASE_URL).host}`);
  console.log(`Account       : ${email} (@${username})`);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, lockedAt: null, lockReason: null, failedLoginAttempts: 0 },
    create: { email, username, displayName, passwordHash, bio: "" },
    select: { id: true, email: true, username: true, displayName: true, createdAt: true },
  });

  console.log("\nDone:", JSON.stringify(user, null, 2));
  console.log("\nIf this account needs admin rights, its email must also be listed in");
  console.log("that deployment's ADMIN_EMAILS variable.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

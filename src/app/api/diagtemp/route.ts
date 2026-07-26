import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary diagnostic route — reports what THIS running deployment actually
// connects to, without leaking the password. Deleted immediately after use.
export async function GET() {
  const raw = process.env.DATABASE_URL ?? "";
  const hostMatch = raw.match(/@([^/]+)\//);
  const dbNameMatch = raw.match(/\/([^/?]+)(\?|$)/);

  try {
    const rows = (await prisma.$queryRawUnsafe(
      "SELECT current_database() as db, (SELECT count(*)::int FROM \"User\") as user_count, (SELECT count(*)::int FROM information_schema.columns WHERE table_name='User' AND column_name='failedLoginAttempts') as has_lockout_col"
    )) as any[];

    return NextResponse.json({
      envHost: hostMatch?.[1] ?? null,
      envDbName: dbNameMatch?.[1] ?? null,
      envUrlLength: raw.length,
      query: rows[0],
    });
  } catch (err: any) {
    return NextResponse.json({
      envHost: hostMatch?.[1] ?? null,
      envDbName: dbNameMatch?.[1] ?? null,
      envUrlLength: raw.length,
      error: err?.message ?? String(err),
    });
  }
}

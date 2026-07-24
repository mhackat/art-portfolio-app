import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { getApiDocs } from "../src/lib/swagger";

// Runs at build/dev-start time (not per-request) so the generated Next.js API
// route source can be scanned for @swagger JSDoc comments while it's actually
// present on disk. Vercel's deployed serverless functions don't reliably have
// the raw source tree available at runtime, so this can't run there safely.
const spec = getApiDocs();

const outDir = join(process.cwd(), "src", "generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "openapi.json"), JSON.stringify(spec, null, 2));

console.log("Generated src/generated/openapi.json");

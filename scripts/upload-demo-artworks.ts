import { readdirSync, readFileSync, statSync } from "fs";
import { extname, join } from "path";
import { DEMO_ARTISTS, seededUsername } from "../src/lib/demo-artists";

/**
 * Fills seeded demo artists' galleries by talking to the public API exactly as
 * any client would: log in, then POST each artwork as its owner.
 *
 * Needs no database or storage credentials — only the base URL, the run id from
 * the admin "create demo artists" button, and the shared password those accounts
 * were created with. That's what makes it safe to point at production.
 *
 *   SEED_RUN_ID=a3f9c1 tsx scripts/upload-demo-artworks.ts
 *
 * No image file is ever used twice.
 */

const BASE_URL = (process.env.API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const RUN_ID = process.env.SEED_RUN_ID;
const PASSWORD = process.env.SEED_PASSWORD || "Test123!";
const IMAGE_DIR = process.env.SEED_IMAGE_DIR || "C:/Users/PC/Pictures/For test site";
const MIN_ARTWORKS = Number(process.env.SEED_MIN_ARTWORKS || 5);
const MAX_ARTWORKS = Number(process.env.SEED_MAX_ARTWORKS || 7);
const USER_COUNT = Number(process.env.SEED_USER_COUNT || DEMO_ARTISTS.length);

/**
 * Vercel caps a serverless request body at 4.5MB — below the app's own 5MB rule,
 * so the platform limit is the binding one. Anything above this is skipped rather
 * than sent and failed.
 */
const MAX_UPLOAD_BYTES = 4.4 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const TITLE_OPENERS = ["Study for", "Notes on", "Field Record:", "Untitled —", "After", "Variations on", "Late", "First Light on", "Fragment:", "Toward"];
const TITLE_SUBJECTS = ["a Quiet Harbour", "the North Wall", "Winter Ground", "Static", "the Long Room", "Low Tide", "Machinery", "an Open Window", "Red Weather", "the Second Garden", "Drift", "Slow Water", "the Far Terrace", "Ash and Linen", "a Borrowed View", "Threshold", "Copper Light", "the Sleeping Yard", "Interference", "Salt"];
const DESCRIPTIONS = [
  "Worked over three sittings, then left alone.",
  "One of a short series; the others didn't survive.",
  "Started from a photograph, ended somewhere else entirely.",
  "The colour is closer to correct in person.",
  "Painted quickly, which is unusual for me.",
  "A rework of something I abandoned two years ago.",
  "Mostly an excuse to use a single pigment.",
  "This one took far longer than it looks.",
  "Made during a week of bad light.",
  "",
];

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function login(identifier: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  if (res.status !== 201) {
    throw new Error(`Login failed for ${identifier} (${res.status}): ${await res.text()}`);
  }
  return (await res.json()).token;
}

async function uploadArtwork(username: string, token: string, file: string): Promise<void> {
  const buffer = readFileSync(file);
  const contentType = CONTENT_TYPES[extname(file).toLowerCase()];

  const form = new FormData();
  form.set("title", `${pick(TITLE_OPENERS)} ${pick(TITLE_SUBJECTS)}`);
  form.set("description", pick(DESCRIPTIONS));
  form.set("file", new Blob([buffer], { type: contentType }), file.split(/[\\/]/).pop());

  const res = await fetch(`${BASE_URL}/api/users/by-username/${username}/artworks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (res.status !== 201) {
    throw new Error(`Upload failed for @${username} (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
}

async function main() {
  if (!RUN_ID) {
    throw new Error("SEED_RUN_ID is required — it's the run id shown by the admin 'create demo artists' button.");
  }

  console.log(`Target    : ${BASE_URL}`);
  console.log(`Run id    : ${RUN_ID}`);
  console.log(`Images    : ${IMAGE_DIR}`);

  const pool = shuffle(
    readdirSync(IMAGE_DIR)
      .filter((name) => CONTENT_TYPES[extname(name).toLowerCase()])
      .map((name) => join(IMAGE_DIR, name))
      .filter((path) => statSync(path).size <= MAX_UPLOAD_BYTES)
  );

  const worstCase = USER_COUNT * MAX_ARTWORKS;
  if (pool.length < worstCase) {
    throw new Error(`Need up to ${worstCase} images but only ${pool.length} are usable in ${IMAGE_DIR}.`);
  }
  console.log(`Pool      : ${pool.length} usable images\n`);

  let poolIndex = 0;
  const used = new Set<string>();
  let uploaded = 0;
  const failures: string[] = [];

  for (const artist of DEMO_ARTISTS.slice(0, USER_COUNT)) {
    const username = seededUsername(artist.username, RUN_ID);

    let token: string;
    try {
      token = await login(username);
    } catch (err) {
      failures.push(`${username}: ${(err as Error).message}`);
      console.log(`  --  @${username} — login failed, skipped`);
      continue;
    }

    const wanted = randomInt(MIN_ARTWORKS, MAX_ARTWORKS);
    let made = 0;

    for (let i = 0; i < wanted; i++) {
      const file = pool[poolIndex++];
      if (used.has(file)) throw new Error(`Image reuse detected: ${file}`);
      used.add(file);

      try {
        await uploadArtwork(username, token, file);
        made++;
        uploaded++;
      } catch (err) {
        failures.push((err as Error).message);
      }
    }

    console.log(`  ${String(made).padStart(2)}  @${username}`);
  }

  console.log(`\nUploaded ${uploaded} artworks across ${USER_COUNT} artists.`);
  console.log(`Unique images consumed: ${used.size}`);
  if (failures.length) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures.slice(0, 10)) console.log(`  - ${f}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

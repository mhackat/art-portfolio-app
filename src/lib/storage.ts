import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

/** S3's DeleteObjects API caps each request at 1000 keys. */
const MAX_KEYS_PER_DELETE = 1000;

/** Every key this app writes lives under this prefix — see uploadImage. */
const ARTWORK_KEY_PREFIX = "artworks/";

function getConfig() {
  const bucket = process.env.STORAGE_BUCKET;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const endpoint = process.env.STORAGE_ENDPOINT;
  const region = process.env.STORAGE_REGION || "auto";
  const publicUrlBase = process.env.STORAGE_PUBLIC_URL_BASE;

  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint || !publicUrlBase) {
    throw new Error(
      "Image storage is not configured. Set STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, " +
        "STORAGE_SECRET_ACCESS_KEY, STORAGE_ENDPOINT, and STORAGE_PUBLIC_URL_BASE in .env."
    );
  }

  return { bucket, accessKeyId, secretAccessKey, endpoint, region, publicUrlBase };
}

let client: S3Client | null = null;

function getClient(config: ReturnType<typeof getConfig>) {
  if (!client) {
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}

export async function uploadImage(
  buffer: Buffer,
  contentType: string,
  ownerId: string
): Promise<string> {
  const config = getConfig();
  const s3 = getClient(config);

  const extension = contentType.split("/")[1] || "bin";
  const key = `${ARTWORK_KEY_PREFIX}${ownerId}/${randomUUID()}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${config.publicUrlBase.replace(/\/$/, "")}/${key}`;
}

/**
 * Reverses uploadImage's URL construction to recover the bucket key.
 *
 * Deliberately strict — returns undefined unless the URL actually starts with
 * this environment's configured public base. That means we only ever issue a
 * delete for an object we can prove belongs to this bucket, so a stale URL
 * left over from a different environment (or any value that didn't come from
 * uploadImage) is skipped rather than turned into a guessed key.
 */
function keyFromPublicUrl(url: string, publicUrlBase: string): string | undefined {
  const base = `${publicUrlBase.replace(/\/$/, "")}/`;
  if (!url.startsWith(base)) return undefined;

  const key = url.slice(base.length);
  if (!key || !key.startsWith(ARTWORK_KEY_PREFIX)) return undefined;

  return key;
}

/** Deletes objects by raw bucket key, chunked to respect the API limit. */
export async function deleteStoredImageKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const config = getConfig();
  const s3 = getClient(config);

  for (let i = 0; i < keys.length; i += MAX_KEYS_PER_DELETE) {
    const chunk = keys.slice(i, i + MAX_KEYS_PER_DELETE);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: config.bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      })
    );
  }
}

/** Deletes previously-uploaded images given their public URLs. Throws on failure. */
export async function deleteImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const config = getConfig();
  const keys = urls
    .map((url) => keyFromPublicUrl(url, config.publicUrlBase))
    .filter((key): key is string => key !== undefined);

  await deleteStoredImageKeys(keys);
}

/**
 * Fire-and-forget variant for request handlers. Callers delete the database row
 * first and then call this: by that point the user's action has already
 * succeeded, so a storage hiccup should leave a harmless orphaned object (which
 * scripts/cleanup-orphaned-images.ts can sweep up later) rather than fail the
 * request or, worse, leave a row pointing at an image that's already gone.
 */
export async function deleteImagesBestEffort(urls: string[]): Promise<void> {
  try {
    await deleteImages(urls);
  } catch (err) {
    console.error("Failed to delete image object(s) from storage:", err);
  }
}

/** Every artwork image key currently in the bucket. Used for orphan reconciliation. */
export async function listStoredImageKeys(): Promise<string[]> {
  const config = getConfig();
  const s3 = getClient(config);

  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: ARTWORK_KEY_PREFIX,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of page.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

/** Exposed so the reconciliation script can map DB URLs into comparable keys. */
export function storedKeyForUrl(url: string): string | undefined {
  return keyFromPublicUrl(url, getConfig().publicUrlBase);
}

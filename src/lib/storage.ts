import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

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
  const key = `artworks/${ownerId}/${randomUUID()}.${extension}`;

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

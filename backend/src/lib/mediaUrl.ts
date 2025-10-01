import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.S3_REGION || "us-east-1";
const ENDPOINT = (process.env.S3_PUBLIC_ENDPOINT || "http://localhost:9000").replace(/\/+$/, "");
export const BUCKET = process.env.S3_BUCKET || "marketplace";
const S3_PUBLIC_READ = String(process.env.S3_PUBLIC_READ || "").toLowerCase() === "true";

export const s3 = new S3Client({
  region: REGION,
  endpoint: process.env.S3_PUBLIC_ENDPOINT || "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || "minioadmin",
  },
});

function extractKey(u: string): { key?: string; external?: boolean } {
  if (!u) return {};
  if (/^s3:\/\//i.test(u)) {
    const k = u.replace(/^s3:\/\//i, "").replace(/^\/+/, "");
    const parts = k.split("/");
    if (parts[0] === BUCKET) return { key: parts.slice(1).join("/") };
    return { key: k };
  }
  try {
    const url = new URL(u);
    const ourHost = new URL(ENDPOINT).host;
    if (url.host === ourHost) {
      const path = url.pathname.replace(/^\/+/, "");
      const parts = path.split("/");
      if (parts[0] === BUCKET && parts.length > 1) return { key: parts.slice(1).join("/") };
    }
    return { external: true };
  } catch {
    return { key: u.replace(/^\/+/, "") };
  }
}

/** Devuelve URL usable en <img>:
 * - S3_PUBLIC_READ=true  -> pública
 * - S3_PUBLIC_READ=false -> presigned GET
 * - URL externa → se devuelve tal cual
 */
export async function viewUrl(u?: string | null, expiresSec = 3600): Promise<string | null> {
  if (!u) return null;
  const { key, external } = extractKey(u);
  if (external) return u;
  if (!key) return u;
  if (S3_PUBLIC_READ) return `${ENDPOINT}/${BUCKET}/${key}`;
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return await getSignedUrl(s3, cmd, { expiresIn: expiresSec });
}

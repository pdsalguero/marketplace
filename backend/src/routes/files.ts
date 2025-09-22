import { Router } from "express";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const router = Router();

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_PUBLIC_ENDPOINT || "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || "minioadmin",
  },
});

const BUCKET = process.env.S3_BUCKET || "marketplace";

/**
 * GET /api/files/presigned-get?key=<object-key>
 */
router.get("/files/presigned-get", async (req, res) => {
  try {
    const key = req.query.key as string | undefined;
    if (!key) return res.status(400).json({ error: "key required" });

    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 min en DEV
    res.json({ url });
  } catch (err) {
    console.error("presigned-get error", err);
    res.status(500).json({ error: "cannot generate get url" });
  }
});

/**
 * POST /api/files/presigned-put-batch
 * body: { files: [{ fileName, fileType }...] }
 * resp: { items: [{ fileName, fileType, key, uploadURL }] }
 */
router.post("/files/presigned-put-batch", async (req, res) => {
  try {
    const files = (req.body?.files ?? []) as Array<{ fileName?: string; fileType?: string }>;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files array required" });
    }

    // Validación simple DEV (en prod, endurecer: tamaño, mime exacto)
    const isImage = (t?: string) => !!t && /^image\//i.test(t);

    const items = await Promise.all(
      files.map(async ({ fileName, fileType }) => {
        if (!fileName || !fileType || !isImage(fileType)) {
          throw new Error(`invalid file: ${fileName || "?"} (${fileType || "?"})`);
        }
        const safeName = encodeURIComponent(fileName);
        const key = `ads/${crypto.randomUUID()}-${safeName}`;

        const cmd = new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          ContentType: fileType, // firma el mismo tipo que enviará el browser
        });

        const uploadURL = await getSignedUrl(s3, cmd, { expiresIn: 60 });
        return { fileName, fileType, key, uploadURL };
      })
    );

    res.json({ items });
  } catch (err: any) {
    console.error("presigned-put-batch error", err);
    res.status(400).json({ error: err.message || "cannot generate put urls" });
  }
});

export default router;

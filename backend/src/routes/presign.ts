import { Router } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const router = Router();

// S3/MinIO client — usa ENDPOINT PÚBLICO (accesible desde el navegador)
// No uses el nombre del contenedor (p. ej. "minio:9000") aquí.
const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_PUBLIC_ENDPOINT || "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId:
      process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || "minioadmin",
    secretAccessKey:
      process.env.S3_SECRET_KEY ||
      process.env.MINIO_ROOT_PASSWORD ||
      "minioadmin",
  },
});

/**
 * GET /api/ads/presigned-url?fileName=foo.png&fileType=image/png
 * Devuelve { uploadURL, key } para PUT directo a MinIO/S3 desde el navegador.
 */
router.get("/ads/presigned-url", async (req, res) => {
  try {
    const { fileName, fileType } = req.query as {
      fileName?: string;
      fileType?: string;
    };
    if (!fileName || !fileType) {
      return res.status(400).json({ error: "fileName & fileType required" });
    }

    const bucket = process.env.S3_BUCKET || "marketplace";
    const key = `ads/${crypto.randomUUID()}-${encodeURIComponent(fileName)}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType, // firma con el tipo que enviará el browser
    });

    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 60 }); // 60s
    res.json({ uploadURL, key });
  } catch (err) {
    console.error("presigned-url error", err);
    res.status(500).json({ error: "cannot generate presigned url" });
  }
});

export default router;

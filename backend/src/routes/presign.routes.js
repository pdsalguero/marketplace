// backend/src/routes/presign.routes.js
import express from "express";
import s3 from "../config/s3.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const router = express.Router();

/**
 * GET /api/ads/presigned-url?fileName=foo.png&fileType=image/png
 * Devuelve { uploadURL, key } para que el cliente haga un PUT directo a MinIO/S3
 */
router.get("/ads/presigned-url", async (req, res) => {
  try {
    // (Opcional) valida JWT desde req.headers.authorization si lo necesitas
    const { fileName, fileType } = req.query;
    if (!fileName || !fileType) {
      return res.status(400).json({ error: "fileName & fileType required" });
    }

    const key = `ads/${crypto.randomUUID()}-${encodeURIComponent(fileName)}`;
    const bucket = process.env.S3_BUCKET || "marketplace";

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType, // firma con el tipo que enviará el browser
    });

    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 60 }); // expira en 60s
    res.json({ uploadURL, key });
  } catch (err) {
    console.error("presigned-url error", err);
    res.status(500).json({ error: "cannot generate presigned url" });
  }
});

export default router;

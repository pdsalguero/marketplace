// backend/src/config/s3.js
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  // ⚠️ Usa el ENDPOINT PÚBLICO accesible desde el navegador (no "minio:9000")
  endpoint: process.env.S3_PUBLIC_ENDPOINT || "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || "minioadmin",
  },
});

export default s3;

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();
const prisma = new PrismaClient();

// ⚡ Configuración MinIO / S3
const s3 = new S3Client({
 // endpoint: process.env.S3_ENDPOINT, // ej: http://localhost:9000
  endpoint: "http://localhost:9001",
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true, // 👈 necesario para MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

// ===============================
// Crear anuncio protegido
// ===============================
router.post("/", authenticate, async (req: AuthRequest, res) => {
  const { title, description, price, imageKey } = req.body;
  const userId = req.user!.id;

  try {
    const ad = await prisma.ad.create({
      data: { title, description, price: parseFloat(price), userId, imageKey },
    });
    res.json(ad);
  } catch (err) {
    console.error("Error Prisma:", err);
    res.status(400).json({ error: "Error al crear anuncio PRISMA" });
  }
});

// ===============================
// Listar todos los anuncios
// ===============================
router.get("/", async (_req, res) => {
  const ads = await prisma.ad.findMany({ include: { user: true } });
  res.json(ads);
});

// ===============================
// Obtener presigned URL (MinIO)
// ===============================
router.get("/presigned-url", authenticate, async (req: AuthRequest, res) => {
  try {
    const { fileName, fileType } = req.query;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }

    const key = `uploads/${Date.now()}_${fileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: fileType as string,
    });

    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 60 });
    res.json({ uploadURL, key });
  } catch (err: any) {
    console.error("❌ Error generando presigned URL:", err);
    res.status(500).json({ error: err.message || "Error generando presigned URL" });
  }
});

// ===============================
// Obtener detalle de un anuncio
// ===============================
router.get("/:id", async (req, res) => {
  try {

    console.log("Params recibidos:", req.params);

    const id = parseInt(req.params.id, 10);

    console.log("ID parseado:", id);


    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const ad = await prisma.ad.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!ad) {
      return res.status(404).json({ error: "Anuncio no encontrado" });
    }

    res.json(ad);
  } catch (err) {
    console.error("Error al buscar anuncio:", err);
    res.status(500).json({ error: "Error al buscar anuncio" });
  }
});

// ===============================
// Editar anuncio (solo dueño)
// ===============================
router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, description, price } = req.body;

  try {
    const ad = await prisma.ad.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    if (ad.userId !== req.user?.id)
      return res.status(403).json({ error: "No autorizado" });

    const updated = await prisma.ad.update({
      where: { id: Number(id) },
      data: { title, description, price: parseFloat(price) },
    });

    res.json(updated);
  } catch (err) {
    console.error("Error al editar anuncio:", err);
    res.status(500).json({ error: "Error al editar anuncio" });
  }
});

// ===============================
// Eliminar anuncio (solo dueño)
// ===============================
router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const ad = await prisma.ad.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    if (ad.userId !== req.user?.id)
      return res.status(403).json({ error: "No autorizado" });

    await prisma.ad.delete({ where: { id: Number(id) } });
    res.json({ message: "Anuncio eliminado" });
  } catch (err) {
    console.error("Error al eliminar anuncio:", err);
    res.status(500).json({ error: "Error al eliminar anuncio" });
  }
});



export default router;

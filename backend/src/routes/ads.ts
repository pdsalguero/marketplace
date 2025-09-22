import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();
const prisma = new PrismaClient();

// ⚡ Configuración MinIO / S3
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT, // ej: http://localhost:9000  (accesible desde el backend)
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true, // 👈 necesario para MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

// ===============================
// Crear anuncio (protegido)
// ===============================
router.post("/", authenticate, async (req: AuthRequest, res) => {
  const { title, description, price, imageKey, imageKeys } = req.body as {
    title: string;
    description: string;
    price: number | string;
    imageKey?: string | null;
    imageKeys?: unknown;
  };
  const userId = req.user!.id;

  try {
    // Normaliza el array de keys (máx 12 strings)
    const keys: string[] = Array.isArray(imageKeys)
      ? (imageKeys as unknown[]).filter((s) => typeof s === "string").slice(0, 12) as string[]
      : [];

    // imageKey principal: usa el recibido o toma el primero del array
    const primaryKey: string | null =
      typeof imageKey === "string" && imageKey.length
        ? imageKey
        : keys.length > 0
        ? keys[0]
        : null;

    const ad = await prisma.ad.create({
      data: {
        title,
        description,
        price: typeof price === "string" ? parseFloat(price) : Number(price),
        userId,
        imageKey: primaryKey,
        // ⚠️ Requiere que tengas 'imageKeys' como JSON en Prisma (ver schema más abajo)
        imageKeys: keys,
      },
      include: { user: true },
    });

    res.status(201).json(ad);
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
// Obtener presigned URL (MinIO) - single
// (si usas el batch en /files/presigned-put-batch, puedes mantener igual este endpoint)
// ===============================
router.get("/presigned-url", authenticate, async (req: AuthRequest, res) => {
  try {
    const { fileName, fileType } = req.query as { fileName?: string; fileType?: string };

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }

    const safeName = encodeURIComponent(fileName);
    const key = `uploads/${Date.now()}_${safeName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: fileType,
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
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const ad = await prisma.ad.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!ad) {
      return res.status(404).json({ error: "Anuncio no encontrado" });
    }

    // ad.imageKeys saldrá en la respuesta si existe en el modelo Prisma
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
  const { title, description, price, imageKey, imageKeys } = req.body as {
    title?: string;
    description?: string;
    price?: number | string;
    imageKey?: string | null;
    imageKeys?: unknown;
  };

  try {
    const ad = await prisma.ad.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    if (ad.userId !== req.user?.id)
      return res.status(403).json({ error: "No autorizado" });

    // Normaliza opcionalmente imageKeys si llega
    let keys: string[] | undefined;
    if (typeof imageKeys !== "undefined") {
      keys = Array.isArray(imageKeys)
        ? (imageKeys as unknown[]).filter((s) => typeof s === "string").slice(0, 12) as string[]
        : [];
    }

    // Determina imageKey principal si llega o si viene un array nuevo
    let primaryKey: string | null | undefined = undefined;
    if (typeof imageKey !== "undefined") {
      primaryKey = imageKey ?? null;
    } else if (keys && keys.length) {
      primaryKey = keys[0];
    }

    const updated = await prisma.ad.update({
      where: { id: Number(id) },
      data: {
        ...(typeof title !== "undefined" ? { title } : {}),
        ...(typeof description !== "undefined" ? { description } : {}),
        ...(typeof price !== "undefined"
          ? { price: typeof price === "string" ? parseFloat(price) : Number(price) }
          : {}),
        ...(typeof primaryKey !== "undefined" ? { imageKey: primaryKey } : {}),
        ...(typeof keys !== "undefined" ? { imageKeys: keys } : {}),
      },
      include: { user: true },
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

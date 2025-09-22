import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();
const prisma = new PrismaClient();

/**
 * MinIO/S3 client (para presigned-url opcional)
 */
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT, // p.ej. http://minio:9000 (desde backend en Docker)
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

// ===============================
// Crear anuncio (protegido) — múltiples imágenes y categoría (si existe en DB)
// ===============================
router.post("/", authenticate, async (req: AuthRequest, res) => {
  const { title, description, price, imageKey, imageKeys, category } = req.body as {
    title: string;
    description: string;
    price: number | string;
    imageKey?: string | null;
    imageKeys?: unknown;
    category?: string; // enum Category: AUTOS, INMUEBLES, ...
  };
  const userId = req.user!.id;

  try {
    const keys: string[] = Array.isArray(imageKeys)
      ? (imageKeys as unknown[]).filter((s) => typeof s === "string").slice(0, 12) as string[]
      : [];

    const primaryKey =
      typeof imageKey === "string" && imageKey.length ? imageKey : keys[0] ?? null;

    // Intento 1: con category (si la columna existe)
    try {
      const ad = await prisma.ad.create({
        data: {
          title,
          description,
          price: typeof price === "string" ? parseFloat(price) : Number(price),
          userId,
          imageKey: primaryKey,
          imageKeys: keys as any, // si la columna no existe, caerá al catch
          category: ((category || "OTROS").toUpperCase()) as any,
        },
        include: { user: true },
      });
      return res.status(201).json(ad);
    } catch (e1) {
      console.warn("create ad: retry sin imageKeys/category", String(e1));
      // Intento 2: sin imageKeys/category (para bases que aún no migraron)
      const ad = await prisma.ad.create({
        data: {
          title,
          description,
          price: typeof price === "string" ? parseFloat(price) : Number(price),
          userId,
          imageKey: primaryKey,
          // sin imageKeys / category
        } as any,
        include: { user: true },
      });
      return res.status(201).json(ad);
    }
  } catch (err) {
    console.error("Error Prisma (create):", err);
    res.status(400).json({ error: "Error al crear anuncio PRISMA" });
  }
});

// ===============================
// Listar anuncios — filtros (+ fallback si faltan columnas)
// GET /api/ads?q=&minPrice=&maxPrice=&category=AUTOS&sort=price_desc|price_asc|created_desc&page=1&pageSize=12
// ===============================
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim() || undefined;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const category = (req.query.category as string | undefined)?.toUpperCase();

    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 12)));

    const sort = (req.query.sort as string) || "created_desc";
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    else if (sort === "price_desc") orderBy = { price: "desc" };

    const where: any = { AND: [] as any[] };
    if (q) {
      where.AND.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (typeof minPrice === "number" && !Number.isNaN(minPrice)) where.AND.push({ price: { gte: minPrice } });
    if (typeof maxPrice === "number" && !Number.isNaN(maxPrice)) where.AND.push({ price: { lte: maxPrice } });
    if (category) where.AND.push({ category }); // podría fallar si la columna no existe
    if (where.AND.length === 0) delete where.AND;

    try {
      // Intento 1: query completo (con createdAt/category/imageKeys)
      const [total, items] = await Promise.all([
        prisma.ad.count({ where }),
        prisma.ad.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { user: true },
        }),
      ]);
      return res.json({ items, total, page, pageSize });
    } catch (e1) {
      console.warn("list ads: retry seguro", String(e1));
      // Intento 2 (seguro): sin category en where, orden por id, y select mínimo
      const where2: any = { ...where };
      if (where2.AND) {
        where2.AND = where2.AND.filter((c: any) => !("category" in c));
        if (where2.AND.length === 0) delete where2.AND;
      }
      const [total2, items2] = await Promise.all([
        prisma.ad.count({ where: where2 }),
        prisma.ad.findMany({
          where: where2,
          orderBy: { id: "desc" }, // si no existe createdAt aún
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            imageKey: true,
            // imageKeys / category omitidos para evitar error si no existen
            createdAt: true,
            user: { select: { id: true, email: true } },
          },
        }),
      ]);
      return res.json({ items: items2, total: total2, page, pageSize });
    }
  } catch (err) {
    console.error("Error listando anuncios:", err);
    res.status(500).json({ error: "Error listando anuncios" });
  }
});

// ===============================
// Stats rápidas (min/max/total)
// ===============================
router.get("/stats/basic", async (_req, res) => {
  try {
    const [min, max, total] = await Promise.all([
      prisma.ad.aggregate({ _min: { price: true } }),
      prisma.ad.aggregate({ _max: { price: true } }),
      prisma.ad.count(),
    ]);
    res.json({
      minPrice: min._min.price ?? 0,
      maxPrice: max._max.price ?? 0,
      total,
    });
  } catch (err) {
    console.error("Error stats:", err);
    res.status(500).json({ error: "Error obteniendo stats" });
  }
});

// ===============================
// Presigned URL (single) — opcional si ya usas /files/presigned-put-batch
// ===============================
router.get("/presigned-url", authenticate, async (req: AuthRequest, res) => {
  try {
    const { fileName, fileType } = req.query as { fileName?: string; fileType?: string };
    if (!fileName || !fileType) return res.status(400).json({ error: "Parámetros inválidos" });

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
// Detalle — con fallback si faltan columnas
// ===============================
router.get("/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    try {
      const ad = await prisma.ad.findUnique({
        where: { id },
        include: { user: true },
      });
      if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
      return res.json(ad);
    } catch (e1) {
      console.warn("ad detail: retry select mínimo", String(e1));
      const ad = await prisma.ad.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          imageKey: true,
          createdAt: true,
          user: { select: { id: true, email: true } },
        },
      });
      if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
      return res.json(ad);
    }
  } catch (err) {
    console.error("Error al buscar anuncio:", err);
    res.status(500).json({ error: "Error al buscar anuncio" });
  }
});

// ===============================
// Editar (solo dueño) — con tolerancia si faltan columnas
// ===============================
router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, description, price, imageKey, imageKeys, category } = req.body as {
    title?: string;
    description?: string;
    price?: number | string;
    imageKey?: string | null;
    imageKeys?: unknown;
    category?: string;
  };

  try {
    const ad = await prisma.ad.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    if (ad.userId !== req.user?.id) return res.status(403).json({ error: "No autorizado" });

    let keys: string[] | undefined;
    if (typeof imageKeys !== "undefined") {
      keys = Array.isArray(imageKeys)
        ? (imageKeys as unknown[]).filter((s) => typeof s === "string").slice(0, 12) as string[]
        : [];
    }

    let primaryKey: string | null | undefined = undefined;
    if (typeof imageKey !== "undefined") {
      primaryKey = imageKey ?? null;
    } else if (keys && keys.length) {
      primaryKey = keys[0];
    }

    // Intento 1: actualizar todo
    try {
      const updated = await prisma.ad.update({
        where: { id: Number(id) },
        data: {
          ...(typeof title !== "undefined" ? { title } : {}),
          ...(typeof description !== "undefined" ? { description } : {}),
          ...(typeof price !== "undefined"
            ? { price: typeof price === "string" ? parseFloat(price) : Number(price) }
            : {}),
          ...(typeof primaryKey !== "undefined" ? { imageKey: primaryKey } : {}),
          ...(typeof keys !== "undefined" ? { imageKeys: keys as any } : {}),
          ...(typeof category !== "undefined" ? { category: (category || "OTROS").toUpperCase() as any } : {}),
        },
        include: { user: true },
      });
      return res.json(updated);
    } catch (e1) {
      console.warn("update ad: retry sin imageKeys/category", String(e1));
      const updated = await prisma.ad.update({
        where: { id: Number(id) },
        data: {
          ...(typeof title !== "undefined" ? { title } : {}),
          ...(typeof description !== "undefined" ? { description } : {}),
          ...(typeof price !== "undefined"
            ? { price: typeof price === "string" ? parseFloat(price) : Number(price) }
            : {}),
          ...(typeof primaryKey !== "undefined" ? { imageKey: primaryKey } : {}),
          // sin imageKeys / category
        } as any,
        include: { user: true },
      });
      return res.json(updated);
    }
  } catch (err) {
    console.error("Error al editar anuncio:", err);
    res.status(500).json({ error: "Error al editar anuncio" });
  }
});

// ===============================
// Eliminar (solo dueño)
// ===============================
router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const ad = await prisma.ad.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    if (ad.userId !== req.user?.id) return res.status(403).json({ error: "No autorizado" });

    await prisma.ad.delete({ where: { id: Number(id) } });
    res.json({ message: "Anuncio eliminado" });
  } catch (err) {
    console.error("Error al eliminar anuncio:", err);
    res.status(500).json({ error: "Error al eliminar anuncio" });
  }
});

export default router;

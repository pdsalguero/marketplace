// backend/src/routes/ads.ts
import { Router, Request, Response } from "express";
import {
  PrismaClient,
  Prisma,
  ListingStatus,
  Condition,
} from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const prisma = new PrismaClient();
const router = Router();

// ---------- S3 presign client (opcional) ----------
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true,
  credentials: process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      }
    : undefined,
});

// ---------- helpers ----------
const asNum = (v: any) =>
  v === undefined || v === null || v === "" ? undefined : Number(v);
const asStr = (v: any) =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

function toDecimal2(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return undefined;
  return new Prisma.Decimal(n.toFixed(2));
}

async function resolveCategoryIdFromSlug(slug?: string | null) {
  if (!slug) return undefined;
  const c = await prisma.category.findUnique({ where: { slug } });
  return c?.id;
}
async function resolveLocationIdFromSlug(slug?: string | null) {
  if (!slug) return undefined;
  const l = await prisma.location.findUnique({ where: { slug } });
  return l?.id;
}

// ==================================================
// CREATE  (POST /api/ads)
// ==================================================
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Aseguramos string (UUID) aunque el middleware envíe number
    const sellerId = String(req.user!.id);

    const {
      title,
      description,
      price, // number
      currency, // string, default ARS
      condition, // "new" | "used"
      categorySlug, // padre
      subcategorySlug, // hijo (si viene, tiene prioridad)
      provinceSlug,
      citySlug,
      imageUrls, // string[]
    } = req.body as any;

    const categoryId =
      (await resolveCategoryIdFromSlug(subcategorySlug)) ||
      (await resolveCategoryIdFromSlug(categorySlug));
    if (!categoryId) {
      return res.status(400).json({ error: "Categoría no encontrada" });
    }

    const provinceId = await resolveLocationIdFromSlug(provinceSlug);
    const cityId = await resolveLocationIdFromSlug(citySlug);

    const created = await prisma.listing.create({
      data: {
        sellerId,
        categoryId,
        title: String(title ?? "").trim(),
        description: asStr(description),
        priceAmount: toDecimal2(asNum(price)) ?? new Prisma.Decimal(0),
        currency: asStr(currency) ?? "ARS",
        condition:
          (condition === "new" || condition === "used"
            ? condition
            : "used") as Condition,
        quantity: 1,
        status: ListingStatus.pending,
        provinceId,
        cityId,
        media:
          Array.isArray(imageUrls) && imageUrls.length
            ? {
                create: imageUrls.slice(0, 12).map((url: string, i: number) => ({
                  url,
                  position: i,
                })),
              }
            : undefined,
      },
      include: {
        media: true,
        category: { select: { id: true, name: true, slug: true, parentId: true } },
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("Create listing error:", err);
    return res.status(500).json({ error: "Error al crear el aviso" });
  }
});

// ==================================================
// LIST  (GET /api/ads)
// ==================================================
router.get("/", async (req: Request, res: Response) => {
  try {
    const q = asStr(req.query.q);
    const minPrice = asNum(req.query.minPrice);
    const maxPrice = asNum(req.query.maxPrice);
    const categorySlug = asStr(req.query.category);
    const subcategorySlug = asStr(req.query.subcategory);
    const provinceSlug = asStr(req.query.province);
    const citySlug = asStr(req.query.city);
    const status = asStr(req.query.status) as ListingStatus | undefined; // optional filter

    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 12)));

    const sort = String(req.query.sort || "published_desc");
    let orderBy: Prisma.ListingOrderByWithRelationInput = { publishedAt: "desc" };
    if (sort === "price_asc") orderBy = { priceAmount: "asc" };
    else if (sort === "price_desc") orderBy = { priceAmount: "desc" };
    else if (sort === "created_desc") orderBy = { createdAt: "desc" };

    const whereAND: Prisma.ListingWhereInput[] = [];
    // Por defecto, mostramos solo activos si no se pasó status
    if (!status) whereAND.push({ status: ListingStatus.active });

    if (status) whereAND.push({ status });

    if (q) {
      whereAND.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (typeof minPrice === "number")
      whereAND.push({ priceAmount: { gte: toDecimal2(minPrice) } });
    if (typeof maxPrice === "number")
      whereAND.push({ priceAmount: { lte: toDecimal2(maxPrice) } });

    let filterCategoryId: string | undefined;
    if (subcategorySlug)
      filterCategoryId = await resolveCategoryIdFromSlug(subcategorySlug);
    else if (categorySlug)
      filterCategoryId = await resolveCategoryIdFromSlug(categorySlug);
    if (filterCategoryId) whereAND.push({ categoryId: filterCategoryId });

    const provinceId = await resolveLocationIdFromSlug(provinceSlug || undefined);
    if (provinceId) whereAND.push({ provinceId });
    const cityId = await resolveLocationIdFromSlug(citySlug || undefined);
    if (cityId) whereAND.push({ cityId });

    const where: Prisma.ListingWhereInput =
      whereAND.length ? { AND: whereAND } : {};

    const [total, items] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          media: { orderBy: { position: "asc" } },
          category: { select: { id: true, name: true, slug: true, parentId: true } },
          seller: { select: { id: true, email: true } },
        },
      }),
    ]);

    return res.json({ items, total, page, pageSize });
  } catch (err) {
    console.error("List listings error:", err);
    return res.status(500).json({ error: "Error listando avisos" });
  }
});

// ==================================================
// STATS  (GET /api/ads/stats/basic)
// ==================================================
router.get("/stats/basic", async (_req, res) => {
  try {
    const [min, max, total] = await Promise.all([
      prisma.listing.aggregate({
        _min: { priceAmount: true },
        where: { status: ListingStatus.active },
      }),
      prisma.listing.aggregate({
        _max: { priceAmount: true },
        where: { status: ListingStatus.active },
      }),
      prisma.listing.count({ where: { status: ListingStatus.active } }),
    ]);
    res.json({
      minPrice: min._min.priceAmount ?? new Prisma.Decimal(0),
      maxPrice: max._max.priceAmount ?? new Prisma.Decimal(0),
      total,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Error obteniendo stats" });
  }
});

// ==================================================
// PRESIGNED (GET /api/ads/presigned-url)
// ==================================================
router.get("/presigned-url", authenticate, async (req: AuthRequest, res) => {
  try {
    if (!process.env.S3_BUCKET) {
      return res.status(400).json({ error: "S3_BUCKET no configurado" });
    }
    const { fileName, fileType } = req.query as any;
    if (!fileName || !fileType)
      return res.status(400).json({ error: "Parámetros inválidos" });
    const key = `uploads/${Date.now()}_${encodeURIComponent(String(fileName))}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: String(fileType),
    });
    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 60 });
    res.json({ uploadURL, key });
  } catch (err: any) {
    console.error("Presigned error:", err);
    res
      .status(500)
      .json({ error: err.message || "Error generando presigned URL" });
  }
});

// ==================================================
// DETAIL  (GET /api/ads/:id)
// ==================================================
router.get("/:id", async (req, res) => {
  try {
    const id = String(req.params.id); // UUID
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        media: { orderBy: { position: "asc" } },
        category: { select: { id: true, name: true, slug: true, parentId: true } },
        seller: { select: { id: true, email: true } },
      },
    });
    if (!listing) return res.status(404).json({ error: "Aviso no encontrado" });
    res.json(listing);
  } catch (err) {
    console.error("Get listing error:", err);
    res.status(500).json({ error: "Error obteniendo aviso" });
  }
});

// ==================================================
// UPDATE  (PUT /api/ads/:id)
// ==================================================
router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const me = String(req.user!.id);

    const current = await prisma.listing.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "Aviso no encontrado" });
    if (current.sellerId !== me) return res.status(403).json({ error: "No autorizado" });

    const {
      title,
      description,
      price,
      currency,
      condition,
      categorySlug,
      subcategorySlug,
      provinceSlug,
      citySlug,
      imageUrls,
      status, // opcional
    } = req.body as any;

    const categoryId =
      (await resolveCategoryIdFromSlug(subcategorySlug)) ||
      (await resolveCategoryIdFromSlug(categorySlug));

    const provinceId = await resolveLocationIdFromSlug(provinceSlug);
    const cityId = await resolveLocationIdFromSlug(citySlug);

    const data: Prisma.ListingUpdateInput = {
      ...(title !== undefined && { title: String(title).trim() }),
      ...(description !== undefined && { description: asStr(description) ?? null }),
      ...(price !== undefined && {
        priceAmount: toDecimal2(asNum(price)) ?? undefined,
      }),
      ...(currency !== undefined && { currency: String(currency || "ARS") }),
      ...(condition !== undefined &&
        (condition === "new" || condition === "used") && { condition }),
      ...(categoryId && { category: { connect: { id: categoryId } } }),
      ...(provinceSlug !== undefined && { provinceId: provinceId ?? null }),
      ...(citySlug !== undefined && { cityId: cityId ?? null }),
      ...(status && { status }),
    };

    // reemplazo total de media si viene array
    if (Array.isArray(imageUrls)) {
      data.media = {
        deleteMany: { listingId: id },
        create: imageUrls.slice(0, 12).map((url: string, i: number) => ({
          url,
          position: i,
        })),
      };
    }

    const updated = await prisma.listing.update({
      where: { id },
      data,
      include: { media: { orderBy: { position: "asc" } } },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update listing error:", err);
    res.status(500).json({ error: "Error actualizando aviso" });
  }
});

// ==================================================
// DELETE  (DELETE /api/ads/:id)
// ==================================================
router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const me = String(req.user!.id);

    const current = await prisma.listing.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "Aviso no encontrado" });
    if (current.sellerId !== me) return res.status(403).json({ error: "No autorizado" });

    await prisma.listing.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete listing error:", err);
    res.status(500).json({ error: "Error eliminando aviso" });
  }
});

export default router;

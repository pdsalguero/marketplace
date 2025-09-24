import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();
const prisma = new PrismaClient();

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

// ---------- Helpers ----------
const num = (v: any) => (v === undefined || v === null || v === "" ? undefined : Number(v));
const str = (v: any) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);
const upper = (v: any) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined);

// ---------- CREATE ----------
router.post("/", authenticate, async (req: AuthRequest, res) => {
  const body = req.body as any;
  const userId = req.user!.id;

  // Normaliza imágenes
  const keys: string[] = Array.isArray(body.imageKeys)
    ? body.imageKeys.filter((s: any) => typeof s === "string").slice(0, 12)
    : [];
  const primaryKey = str(body.imageKey) ?? (keys[0] ?? null);

  // Normaliza campos básicos
  const data: any = {
    title: String(body.title ?? "").trim(),
    description: String(body.description ?? "").trim(),
    price: Number(body.price),
    userId,
    imageKey: primaryKey,
    imageKeys: keys.length ? keys : undefined,
  };

  // Categoría y Subcategoría
  const cat = upper(body.category);
  if (cat) data.category = cat;

  const subcat = upper(body.subcategory); // NUEVO
  if (subcat) data.subcategory = subcat;  // NUEVO

  // Atributos AUTOS (agrega solo si existen en tu schema)
  const brand = str(body.brand);
  if (brand) data.brand = brand;
  const model = str(body.model);
  if (model) data.model = model;
  const year = num(body.year);
  if (typeof year === "number" && !Number.isNaN(year)) data.year = year;
  const mileage = num(body.mileage);
  if (typeof mileage === "number" && !Number.isNaN(mileage)) data.mileage = mileage;
  const transmission = upper(body.transmission);
  if (transmission) data.transmission = transmission;
  const fuel = upper(body.fuel);
  if (fuel) data.fuel = fuel;
  const location = str(body.location);
  if (location) data.location = location;

  try {
    const ad = await prisma.ad.create({ data, include: { user: true } });
    return res.status(201).json(ad);
  } catch (e1: any) {
    // Fallback para DBs sin columnas nuevas
    console.warn("create fallback (DB sin columnas nuevas):", String(e1?.message || e1));
    const minimal: any = {
      title: data.title,
      description: data.description,
      price: data.price,
      userId,
      imageKey: data.imageKey ?? null,
    };
    try {
      const ad = await prisma.ad.create({ data: minimal, include: { user: true } });
      return res.status(201).json(ad);
    } catch (e2: any) {
      console.error("Error Prisma (create):", e2);
      return res.status(400).json({ error: "Error al crear anuncio PRISMA" });
    }
  }
});

// ---------- LIST ----------
router.get("/", async (req, res) => {
  try {
    const q = str(req.query.q);
    const minPrice = num(req.query.minPrice);
    const maxPrice = num(req.query.maxPrice);
    const category = upper(req.query.category);
    const subcategory = upper(req.query.subcategory); // NUEVO

    const brand = str(req.query.brand);
    const model = str(req.query.model);
    const yearMin = num(req.query.yearMin);
    const yearMax = num(req.query.yearMax);
    const mileageMax = num(req.query.mileageMax);
    const transmission = upper(req.query.transmission);
    const fuel = upper(req.query.fuel);
    const location = str(req.query.location);

    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 12)));

    const sort = String(req.query.sort || "created_desc");
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    else if (sort === "price_desc") orderBy = { price: "desc" };

    const where: any = { AND: [] as any[] };
    if (q) where.AND.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] });
    if (typeof minPrice === "number") where.AND.push({ price: { gte: minPrice } });
    if (typeof maxPrice === "number") where.AND.push({ price: { lte: maxPrice } });
    if (category) where.AND.push({ category });
    if (subcategory) where.AND.push({ subcategory }); // NUEVO

    if (category === "AUTOS") {
      if (brand) where.AND.push({ brand });
      if (model) where.AND.push({ model });
      if (typeof yearMin === "number") where.AND.push({ year: { gte: yearMin } });
      if (typeof yearMax === "number") where.AND.push({ year: { lte: yearMax } });
      if (typeof mileageMax === "number") where.AND.push({ mileage: { lte: mileageMax } });
      if (transmission) where.AND.push({ transmission });
      if (fuel) where.AND.push({ fuel });
      if (location) where.AND.push({ location: { contains: location, mode: "insensitive" } });
    }
    if (where.AND.length === 0) delete where.AND;

    try {
      const [total, items] = await Promise.all([
        prisma.ad.count({ where }),
        prisma.ad.findMany({
          where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: { user: true },
        }),
      ]);
      return res.json({ items, total, page, pageSize });
    } catch (e1: any) {
      console.warn("list fallback:", String(e1?.message || e1));
      // fallback sin category/createdAt/subcategory
      const where2: any = { AND: [] as any[] };
      if (q) where2.AND.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] });
      if (typeof minPrice === "number") where2.AND.push({ price: { gte: minPrice } });
      if (typeof maxPrice === "number") where2.AND.push({ price: { lte: maxPrice } });
      if (where2.AND.length === 0) delete where2.AND;

      const [total2, items2] = await Promise.all([
        prisma.ad.count({ where: where2 }),
        prisma.ad.findMany({
          where: where2, orderBy: { id: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
          select: { id: true, title: true, description: true, price: true, imageKey: true, createdAt: true, user: { select: { id: true, email: true } } },
        }),
      ]);
      return res.json({ items: items2, total: total2, page, pageSize });
    }
  } catch (err) {
    console.error("Error listando anuncios:", err);
    res.status(500).json({ error: "Error listando anuncios" });
  }
});

// ---------- STATS ----------
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

// ---------- PRESIGNED (opcional) ----------
router.get("/presigned-url", authenticate, async (req: AuthRequest, res) => {
  try {
    const { fileName, fileType } = req.query as any;
    if (!fileName || !fileType) return res.status(400).json({ error: "Parámetros inválidos" });
    const key = `uploads/${Date.now()}_${encodeURIComponent(fileName)}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!, Key: key, ContentType: fileType,
    });
    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 60 });
    res.json({ uploadURL, key });
  } catch (err: any) {
    console.error("❌ Error generando presigned URL:", err);
    res.status(500).json({ error: err.message || "Error generando presigned URL" });
  }
});

// ---------- DETAIL ----------
router.get("/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    const ad = await prisma.ad.findUnique({ where: { id }, include: { user: true } });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    res.json(ad);
  } catch (err) {
    console.error("Error al buscar anuncio:", err);
    res.status(500).json({ error: "Error al buscar anuncio" });
  }
});

// ---------- UPDATE ----------
router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const body = req.body as any;

  try {
    const ad = await prisma.ad.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    if (ad.userId !== req.user?.id) return res.status(403).json({ error: "No autorizado" });

    const data: any = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.description !== undefined) data.description = String(body.description).trim();
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.imageKey !== undefined) data.imageKey = str(body.imageKey) ?? null;
    if (Array.isArray(body.imageKeys)) data.imageKeys = body.imageKeys.filter((s: any) => typeof s === "string").slice(0, 12);
    if (body.category !== undefined) data.category = upper(body.category);

    // NUEVO: subcategory
    if (body.subcategory !== undefined) data.subcategory = upper(body.subcategory) ?? null;

    // autos
    if (body.brand !== undefined) data.brand = str(body.brand);
    if (body.model !== undefined) data.model = str(body.model);
    if (body.year !== undefined) data.year = num(body.year) ?? null;
    if (body.mileage !== undefined) data.mileage = num(body.mileage) ?? null;
    if (body.transmission !== undefined) data.transmission = upper(body.transmission) ?? null;
    if (body.fuel !== undefined) data.fuel = upper(body.fuel) ?? null;
    if (body.location !== undefined) data.location = str(body.location) ?? null;

    const updated = await prisma.ad.update({ where: { id: Number(id) }, data, include: { user: true } });
    res.json(updated);
  } catch (err) {
    console.error("Error al editar anuncio:", err);
    res.status(500).json({ error: "Error al editar anuncio" });
  }
});

// ---------- DELETE ----------
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

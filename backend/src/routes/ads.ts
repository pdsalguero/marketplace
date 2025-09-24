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
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! },
});

// ===== CREATE (con atributos AUTOS opcionales) =====
router.post("/", authenticate, async (req: AuthRequest, res) => {
  const {
    title, description, price, imageKey, imageKeys, category,
    brand, model, year, mileage, transmission, fuel, location,
  } = req.body as any;

  const userId = req.user!.id;

  try {
    const keys: string[] = Array.isArray(imageKeys) ? imageKeys.filter((s: any) => typeof s === "string").slice(0, 12) : [];
    const primaryKey = typeof imageKey === "string" && imageKey.length ? imageKey : (keys[0] ?? null);
    const cat = ((category || "OTROS").toUpperCase()) as any;

    // intento 1: con todos los campos
    try {
      const ad = await prisma.ad.create({
        data: {
          title,
          description,
          price: typeof price === "string" ? parseFloat(price) : Number(price),
          userId,
          imageKey: primaryKey,
          imageKeys: keys as any,
          category: cat,
          brand, model,
          year: year ? Number(year) : null,
          mileage: mileage ? Number(mileage) : null,
          transmission: transmission || null,
          fuel: fuel || null,
          location: location || null,
        } as any,
        include: { user: true },
      });
      return res.status(201).json(ad);
    } catch (e1) {
      console.warn("create fallback (sin autos attrs):", String(e1));
      const ad = await prisma.ad.create({
        data: {
          title,
          description,
          price: typeof price === "string" ? parseFloat(price) : Number(price),
          userId,
          imageKey: primaryKey,
          category: cat,
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

// ===== LIST (filtros + fallback) =====
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim() || undefined;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const category = (req.query.category as string | undefined)?.toUpperCase();

    // filtros autos
    const brand = req.query.brand as string | undefined;
    const model = req.query.model as string | undefined;
    const yearMin = req.query.yearMin ? Number(req.query.yearMin) : undefined;
    const yearMax = req.query.yearMax ? Number(req.query.yearMax) : undefined;
    const mileageMax = req.query.mileageMax ? Number(req.query.mileageMax) : undefined;
    const transmission = req.query.transmission as string | undefined;
    const fuel = req.query.fuel as string | undefined;
    const location = req.query.location as string | undefined;

    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 12)));

    const sort = (req.query.sort as string) || "created_desc";
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    else if (sort === "price_desc") orderBy = { price: "desc" };

    const where: any = { AND: [] as any[] };
    if (q) where.AND.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] });
    if (typeof minPrice === "number" && !Number.isNaN(minPrice)) where.AND.push({ price: { gte: minPrice } });
    if (typeof maxPrice === "number" && !Number.isNaN(maxPrice)) where.AND.push({ price: { lte: maxPrice } });
    if (category) where.AND.push({ category });

    // si se pide AUTOS, agrega filtros avanzados
    if (category === "AUTOS") {
      if (brand) where.AND.push({ brand: { equals: brand } });
      if (model) where.AND.push({ model: { equals: model } });
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
        prisma.ad.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: { user: true } }),
      ]);
      return res.json({ items, total, page, pageSize });
    } catch (e1) {
      console.warn("list fallback:", String(e1));
      // fallback sin autos ni category ni createdAt
      const where2: any = { AND: [] as any[] };
      if (q) where2.AND.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] });
      if (typeof minPrice === "number" && !Number.isNaN(minPrice)) where2.AND.push({ price: { gte: minPrice } });
      if (typeof maxPrice === "number" && !Number.isNaN(maxPrice)) where2.AND.push({ price: { lte: maxPrice } });
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

// ===== DETAIL / UPDATE / DELETE (dejamos igual con tolerancia) =====
router.get("/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    const ad = await prisma.ad.findUnique({ where: { id }, include: { user: true } });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    res.json(ad);
  } catch (e1) {
    console.warn("detail fallback:", String(e1));
    const id = Number.parseInt(req.params.id, 10);
    const ad = await prisma.ad.findUnique({
      where: { id },
      select: { id: true, title: true, description: true, price: true, imageKey: true, createdAt: true, user: { select: { id: true, email: true } } },
    });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    res.json(ad);
  }
});

router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const body = req.body as any;

  try {
    const ad = await prisma.ad.findUnique({ where: { id: Number(id) } });
    if (!ad) return res.status(404).json({ error: "Anuncio no encontrado" });
    if (ad.userId !== req.user?.id) return res.status(403).json({ error: "No autorizado" });

    const data: any = {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.price !== undefined ? { price: typeof body.price === "string" ? parseFloat(body.price) : Number(body.price) } : {}),
      ...(body.imageKey !== undefined ? { imageKey: body.imageKey ?? null } : {}),
      ...(Array.isArray(body.imageKeys) ? { imageKeys: body.imageKeys.slice(0,12) } : {}),
      ...(body.category !== undefined ? { category: (body.category || "OTROS").toUpperCase() } : {}),
      ...(body.brand !== undefined ? { brand: body.brand } : {}),
      ...(body.model !== undefined ? { model: body.model } : {}),
      ...(body.year !== undefined ? { year: body.year ? Number(body.year) : null } : {}),
      ...(body.mileage !== undefined ? { mileage: body.mileage ? Number(body.mileage) : null } : {}),
      ...(body.transmission !== undefined ? { transmission: body.transmission || null } : {}),
      ...(body.fuel !== undefined ? { fuel: body.fuel || null } : {}),
      ...(body.location !== undefined ? { location: body.location || null } : {}),
    };

    // fallback: si falla por columnas, quitar autos attrs
    try {
      const updated = await prisma.ad.update({ where: { id: Number(id) }, data, include: { user: true } });
      return res.json(updated);
    } catch (e1) {
      console.warn("update fallback:", String(e1));
      const { brand, model, year, mileage, transmission, fuel, location, ...rest } = data;
      const updated = await prisma.ad.update({ where: { id: Number(id) }, data: rest, include: { user: true } });
      return res.json(updated);
    }
  } catch (err) {
    console.error("Error al editar anuncio:", err);
    res.status(500).json({ error: "Error al editar anuncio" });
  }
});

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

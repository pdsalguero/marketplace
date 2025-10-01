// backend/src/routes/ads.ts
import { Router, Response, Request } from "express";
import { PrismaClient, ListingStatus, Condition } from "@prisma/client";
import { AuthRequest, authenticate } from "../middleware/auth";
import { viewUrl } from "../lib/mediaUrl";

const prisma = new PrismaClient();
const router = Router();

const SELLER_ALLOWED_STATUSES: ListingStatus[] = [
  ListingStatus.active, ListingStatus.paused, ListingStatus.draft, ListingStatus.sold_out,
];

async function findCategoryIdBySlug(slug?: string | null) {
  if (!slug) return undefined;
  const c = await prisma.category.findUnique({ where: { slug: String(slug) } });
  return c?.id;
}
async function findLocationIdBySlug(slug?: string | null) {
  if (!slug) return undefined;
  const l = await prisma.location.findUnique({ where: { slug: String(slug) } });
  return l?.id;
}
function buildCategoryPath(cat: any): string[] {
  if (!cat) return [];
  const chain = [cat];
  if (cat.parent) chain.unshift(cat.parent);
  if (cat.parent?.parent) chain.unshift(cat.parent.parent);
  return chain.map((c) => c.slug).filter(Boolean);
}
async function descendantsIdsForCategorySlug(slug: string): Promise<string[]> {
  const cat = await prisma.category.findUnique({
    where: { slug },
    include: { children: { include: { children: true } } },
  });
  if (!cat) return [];
  const ids = new Set<string>([cat.id]);
  for (const c1 of cat.children) {
    ids.add(c1.id);
    for (const c2 of c1.children) ids.add(c2.id);
  }
  return Array.from(ids);
}

// ---- atributos (defs heredadas) ----
async function getAttrDefsMapByCategoryId(categoryId: string) {
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, parent: { select: { id: true, parent: { select: { id: true } } } } },
  });
  if (!cat) return new Map<string, any>();
  const ids = [cat.id];
  if (cat.parent?.id) ids.push(cat.parent.id);
  if (cat.parent?.parent?.id) ids.push(cat.parent.parent.id);

  const defs = await prisma.listingAttributeDef.findMany({
    where: { categoryId: { in: ids } },
    select: { id: true, key: true, name: true, dataType: true, enumOptions: true, isRequired: true },
  });
  const map = new Map<string, any>();
  for (const d of defs) map.set(d.key, d);
  return map;
}
function normalizeAttributeValue(dt: string, v: any) {
  if (v === null || typeof v === "undefined" || v === "") return { text: null, num: null, bool: null };
  if (dt === "number") {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error("Valor numérico inválido");
    return { text: null, num: n, bool: null };
  }
  if (dt === "boolean") {
    const b = typeof v === "boolean" ? v : String(v).toLowerCase() === "true";
    return { text: null, num: null, bool: b };
  }
  // text | enum
  return { text: String(v), num: null, bool: null };
}

/* ================= PUBLIC LIST ================= */
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(60, Math.max(1, parseInt(String(req.query.pageSize || "12"), 10) || 12));

    const q = String(req.query.q || "").trim();
    const categorySlug = req.query.categorySlug ? String(req.query.categorySlug) : "";
    const subCategorySlug = (req.query.subCategorySlug || req.query.subcategorySlug) ? String(req.query.subCategorySlug || req.query.subcategorySlug) : "";
    const provinceSlug = req.query.provinceSlug ? String(req.query.provinceSlug) : "";

    const where: any = { status: ListingStatus.active, deletedAt: null };
    if (q) where.title = { contains: q, mode: "insensitive" };

    if (subCategorySlug) {
      const subId = await findCategoryIdBySlug(subCategorySlug);
      if (subId) where.categoryId = subId; else return res.json({ items: [], page, pageSize, total: 0, totalPages: 1 });
    } else if (categorySlug) {
      const ids = await descendantsIdsForCategorySlug(categorySlug);
      if (ids.length) where.categoryId = { in: ids }; else return res.json({ items: [], page, pageSize, total: 0, totalPages: 1 });
    }
    if (provinceSlug) {
      const pid = await findLocationIdBySlug(provinceSlug);
      if (pid) where.provinceId = pid; else return res.json({ items: [], page, pageSize, total: 0, totalPages: 1 });
    }

    const [total, rows] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        orderBy: [{ promotedUntil: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, title: true, priceAmount: true, currency: true, createdAt: true,
          category: { select: { name: true } },
          media: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        },
      }),
    ]);

    const items = await Promise.all(rows.map(async (r) => ({
      id: r.id, title: r.title, price: r.priceAmount, currency: r.currency,
      categoryName: r.category?.name ?? "-", coverUrl: await viewUrl(r.media[0]?.url ?? null),
      createdAt: r.createdAt,
    })));

    return res.json({ items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (e) {
    console.error("GET /api/ads error:", e);
    return res.status(500).json({ error: "Error listando avisos" });
  }
});

/* ================ PUBLIC DETAIL ================= */
router.get("/public/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const listing = await prisma.listing.findFirst({
      where: { id, status: ListingStatus.active, deletedAt: null },
      select: {
        id: true, title: true, description: true, priceAmount: true, currency: true, condition: true, status: true,
        category: { select: { id: true, slug: true, name: true, parent: { select: { id: true, slug: true, name: true, parent: { select: { id: true, slug: true, name: true } } } } } },
        provinceId: true, cityId: true,
        media: { orderBy: { position: "asc" }, select: { id: true, url: true, position: true } },
        createdAt: true, publishedAt: true,
        attributes: { select: { valueText: true, valueNumber: true, valueBool: true, attrDef: { select: { key: true, name: true, dataType: true } } } },
      },
    });
    if (!listing) return res.status(404).json({ error: "No encontrado" });

    const media = await Promise.all(listing.media.map(async (m) => ({ id: m.id, position: m.position, url: await viewUrl(m.url) })));
    const categoryPath = buildCategoryPath(listing.category);

    const attrs: Record<string, any> = {};
    listing.attributes.forEach((a) => {
      const k = a.attrDef.key;
      const dt = a.attrDef.dataType;
      attrs[k] = dt === "number" ? a.valueNumber :
                 dt === "boolean" ? a.valueBool :
                 a.valueText;
    });

    return res.json({
      id: listing.id, title: listing.title, description: listing.description,
      price: listing.priceAmount, currency: listing.currency, condition: listing.condition,
      status: listing.status, categorySlug: listing.category.slug, categoryPath,
      media, attributes: attrs, createdAt: listing.createdAt, publishedAt: listing.publishedAt,
    });
  } catch (e) {
    console.error("GET /api/ads/public/:id error:", e);
    return res.status(500).json({ error: "Error obteniendo aviso" });
  }
});

/* ================== CREATE ================== */
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user!.id);
    const {
      title, description, price, categorySlug, provinceSlug, citySlug, condition,
      media, attributes,
    } = req.body as {
      title?: string; description?: string; price?: number;
      categorySlug?: string; provinceSlug?: string | null; citySlug?: string | null;
      condition?: "new" | "used";
      media?: Array<{ url: string; position?: number }>;
      attributes?: Array<{ key: string; value: any }>;
    };

    if (!title?.trim() || !(Number(price) > 0) || !categorySlug) {
      return res.status(400).json({ error: "title, price y categorySlug son requeridos" });
    }

    const categoryId = await findCategoryIdBySlug(categorySlug);
    if (!categoryId) return res.status(400).json({ error: "Categoría inválida" });

    const provinceId = await findLocationIdBySlug(provinceSlug);
    const cityId = await findLocationIdBySlug(citySlug);
    if (cityId && provinceId) {
      const city = await prisma.location.findUnique({ where: { id: cityId }, select: { parentId: true } });
      if (city?.parentId && city.parentId !== provinceId) return res.status(400).json({ error: "La ciudad no pertenece a la provincia" });
    }

    // attrs map (heredados)
    const defMap = await getAttrDefsMapByCategoryId(categoryId);
    const attrsInput = Array.isArray(attributes) ? attributes : [];
    const toCreateAttrs = attrsInput
      .filter((a) => a && defMap.has(a.key))
      .map((a) => {
        const def = defMap.get(a.key);
        const norm = normalizeAttributeValue(def.dataType, a.value);
        return {
          attrDefId: def.id,
          valueText: norm.text,
          valueNumber: norm.num as any,
          valueBool: norm.bool as any,
        };
      });

    const created = await prisma.listing.create({
      data: {
        title: title.trim(),
        description: description?.trim() || "",
        priceAmount: Number(price),
        currency: "ARS",
        sellerId: userId,
        categoryId,
        condition: condition === "used" ? "used" : "new",
        provinceId: provinceId ?? null,
        cityId: cityId ?? null,
        status: ListingStatus.active,
        publishedAt: new Date(),
        media: Array.isArray(media) && media.length ? {
          createMany: { data: media.filter((m) => m?.url).map((m, i) => ({ url: m.url, position: Number.isFinite(m.position) ? (m.position as number) : i })) },
        } : undefined,
        attributes: toCreateAttrs.length ? { createMany: { data: toCreateAttrs } } : undefined,
      },
      select: { id: true },
    });

    return res.status(201).json({ id: created.id });
  } catch (err) {
    console.error("create ad error:", err);
    return res.status(500).json({ error: "Error creando anuncio" });
  }
});

export default router


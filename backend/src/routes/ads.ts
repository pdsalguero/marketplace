import { Router, Response, Request } from "express";
import { PrismaClient, ListingStatus, Condition } from "@prisma/client";
import { AuthRequest, authenticate } from "../middleware/auth";
import { viewUrl } from "../lib/mediaUrl";

const prisma = new PrismaClient();
const router = Router();

// Estados que el vendedor puede elegir desde el editor
const SELLER_ALLOWED_STATUSES: ListingStatus[] = [
  ListingStatus.active,
  ListingStatus.paused,
  ListingStatus.draft,
  ListingStatus.sold_out,
];

// Helpers
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
  const ids = new Set<string>();
  ids.add(cat.id);
  for (const c1 of cat.children) {
    ids.add(c1.id);
    for (const c2 of c1.children) ids.add(c2.id);
  }
  return Array.from(ids);
}

/* ============================================================
   PUBLIC: LISTADO PAGINADO
   GET /api/ads?page=1&pageSize=12
   filtros opcionales: q, categorySlug, subCategorySlug, provinceSlug
   ============================================================ */
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(60, Math.max(1, parseInt(String(req.query.pageSize || "12"), 10) || 12));

    const q = String(req.query.q || "").trim();
    const categorySlug = req.query.categorySlug ? String(req.query.categorySlug) : "";
    const subCategorySlug = (req.query.subCategorySlug || req.query.subcategorySlug) ? String(req.query.subCategorySlug || req.query.subcategorySlug) : "";
    const provinceSlug = req.query.provinceSlug ? String(req.query.provinceSlug) : "";

    // Filtros base
    const where: any = {
      status: ListingStatus.active,
      deletedAt: null,
    };

    if (q) where.title = { contains: q, mode: "insensitive" };

    // Filtro por subcategoría directa (más específico)
    if (subCategorySlug) {
      const subId = await findCategoryIdBySlug(subCategorySlug);
      if (subId) where.categoryId = subId;
      else return res.json({ items: [], page, pageSize, total: 0, totalPages: 1 });
    } else if (categorySlug) {
      // Filtro por categoría incluyendo descendientes
      const ids = await descendantsIdsForCategorySlug(categorySlug);
      if (ids.length) where.categoryId = { in: ids };
      else return res.json({ items: [], page, pageSize, total: 0, totalPages: 1 });
    }

    // Filtro ubicación (provincia)
    if (provinceSlug) {
      const pid = await findLocationIdBySlug(provinceSlug);
      if (pid) where.provinceId = pid;
      else return res.json({ items: [], page, pageSize, total: 0, totalPages: 1 });
    }

    const [total, rows] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        orderBy: [{ promotedUntil: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          priceAmount: true,
          currency: true,
          createdAt: true,
          category: { select: { name: true } },
          media: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        },
      }),
    ]);

    const items = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        title: r.title,
        price: r.priceAmount,
        currency: r.currency,
        categoryName: r.category?.name ?? "-",
        coverUrl: await viewUrl(r.media[0]?.url ?? null),
        createdAt: r.createdAt,
      }))
    );

    return res.json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (e) {
    console.error("GET /api/ads error:", e);
    return res.status(500).json({ error: "Error listando avisos" });
  }
});

/* ============================================================
   PUBLIC: DETALLE
   GET /api/ads/public/:id
   ============================================================ */
router.get("/public/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const listing = await prisma.listing.findFirst({
      where: { id, status: ListingStatus.active, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        priceAmount: true,
        currency: true,
        condition: true,
        status: true,
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
            parent: { select: { id: true, slug: true, name: true, parent: { select: { id: true, slug: true, name: true } } } },
          },
        },
        provinceId: true,
        cityId: true,
        media: { orderBy: { position: "asc" }, select: { id: true, url: true, position: true } },
        createdAt: true,
        publishedAt: true,
      },
    });
    if (!listing) return res.status(404).json({ error: "No encontrado" });

    const media = await Promise.all(
      listing.media.map(async (m) => ({ id: m.id, position: m.position, url: await viewUrl(m.url) }))
    );
    const categoryPath = buildCategoryPath(listing.category);

    return res.json({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.priceAmount,
      currency: listing.currency,
      condition: listing.condition,
      status: listing.status,
      categorySlug: listing.category.slug,
      categoryPath,
      media,
      createdAt: listing.createdAt,
      publishedAt: listing.publishedAt,
    });
  } catch (e) {
    console.error("GET /api/ads/public/:id error:", e);
    return res.status(500).json({ error: "Error obteniendo aviso" });
  }
});

/* ============================================================
   AUTH: CREAR (queda ACTIVE)
   POST /api/ads
   ============================================================ */
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user!.id);
    const {
      title,
      description,
      price,
      categorySlug,
      provinceSlug,
      citySlug,
      condition,
      media,
    } = req.body as {
      title?: string;
      description?: string;
      price?: number;
      categorySlug?: string;
      provinceSlug?: string | null;
      citySlug?: string | null;
      condition?: "new" | "used";
      media?: Array<{ url: string; position?: number }>;
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
      if (city?.parentId && city.parentId !== provinceId) {
        return res.status(400).json({ error: "La ciudad no pertenece a la provincia" });
      }
    }

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

        status: ListingStatus.active, // Active al crear
        publishedAt: new Date(),

        media: Array.isArray(media) && media.length
          ? {
              createMany: {
                data: media
                  .filter((m) => m?.url)
                  .map((m, i) => ({
                    url: m.url,
                    position: Number.isFinite(m.position) ? (m.position as number) : i,
                  })),
              },
            }
          : undefined,
      },
      select: { id: true },
    });

    return res.status(201).json({ id: created.id });
  } catch (err) {
    console.error("create ad error:", err);
    return res.status(500).json({ error: "Error creando anuncio" });
  }
});

/* ============================================================
   AUTH: OBTENER PARA EDICIÓN
   GET /api/ads/:id
   ============================================================ */
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        priceAmount: true,
        currency: true,
        condition: true,
        status: true,
        sellerId: true,
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
            parent: { select: { id: true, slug: true, name: true, parent: { select: { id: true, slug: true, name: true } } } },
          },
        },
        provinceId: true,
        cityId: true,
        media: { orderBy: { position: "asc" }, select: { id: true, url: true, position: true } },
      },
    });

    if (!listing) return res.status(404).json({ error: "No existe" });
    if (String(listing.sellerId) !== String(req.user!.id) && !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const [prov, city] = await Promise.all([
      listing.provinceId ? prisma.location.findUnique({ where: { id: listing.provinceId }, select: { slug: true, name: true } }) : null,
      listing.cityId ? prisma.location.findUnique({ where: { id: listing.cityId }, select: { slug: true, name: true } }) : null,
    ]);

    const media = await Promise.all(
      listing.media.map(async (m) => ({
        id: m.id,
        position: m.position,
        url: await viewUrl(m.url),
      }))
    );

    const categoryPath = buildCategoryPath(listing.category);

    return res.json({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.priceAmount,
      currency: listing.currency,
      condition: listing.condition,
      status: listing.status,
      categorySlug: listing.category.slug,
      categoryPath,
      province: prov ? { slug: prov.slug, name: prov.name } : null,
      city: city ? { slug: city.slug, name: city.name } : null,
      media,
    });
  } catch (e) {
    console.error("GET /api/ads/:id error:", e);
    return res.status(500).json({ error: "Error obteniendo anuncio" });
  }
});

/* ============================================================
   AUTH: EDITAR
   PATCH /api/ads/:id
   ============================================================ */
router.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const body = req.body as {
      title?: string;
      description?: string;
      price?: number;
      condition?: "new" | "used";
      categorySlug?: string;
      provinceSlug?: string | null;
      citySlug?: string | null;
      status?: ListingStatus;
      media?: Array<{ url: string; position?: number }>;
    };

    const existing = await prisma.listing.findUnique({ where: { id }, select: { sellerId: true } });
    if (!existing) return res.status(404).json({ error: "No existe" });
    if (String(existing.sellerId) !== String(req.user!.id) && !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const categoryId = body.categorySlug ? await findCategoryIdBySlug(body.categorySlug) : undefined;
    if (body.categorySlug && !categoryId) return res.status(400).json({ error: "Categoría inválida" });

    const provinceId = body.hasOwnProperty("provinceSlug") ? await findLocationIdBySlug(body.provinceSlug ?? null) : undefined;
    const cityId = body.hasOwnProperty("citySlug") ? await findLocationIdBySlug(body.citySlug ?? null) : undefined;

    if (typeof cityId !== "undefined" && cityId && typeof provinceId !== "undefined" && provinceId) {
      const city = await prisma.location.findUnique({ where: { id: cityId }, select: { parentId: true } });
      if (city?.parentId && city.parentId !== provinceId) {
        return res.status(400).json({ error: "La ciudad no pertenece a la provincia" });
      }
    }

    const data: any = {};
    if (typeof body.title !== "undefined") data.title = body.title?.trim() || "";
    if (typeof body.description !== "undefined") data.description = body.description?.trim() || "";
    if (typeof body.price !== "undefined") {
      if (!(Number(body.price) > 0)) return res.status(400).json({ error: "Precio inválido" });
      data.priceAmount = Number(body.price);
    }
    if (typeof body.condition !== "undefined") {
      data.condition = body.condition === "used" ? Condition.used : Condition.new;
    }
    if (typeof categoryId !== "undefined") data.categoryId = categoryId;
    if (typeof provinceId !== "undefined") data.provinceId = provinceId ?? null;
    if (typeof cityId !== "undefined") data.cityId = cityId ?? null;

    if (typeof body.status !== "undefined") {
      const desired = body.status as ListingStatus;
      if (!req.user!.isAdmin && !SELLER_ALLOWED_STATUSES.includes(desired)) {
        return res.status(400).json({ error: "Cambio de estado no permitido" });
      }
      data.status = desired;
      if (desired === ListingStatus.active) {
        data.publishedAt = new Date();
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.listing.update({ where: { id }, data });

      if (Array.isArray(body.media)) {
        await tx.listingMedia.deleteMany({ where: { listingId: id } });
        if (body.media.length) {
          await tx.listingMedia.createMany({
            data: body.media
              .filter((m) => m?.url)
              .map((m, i) => ({
                listingId: id,
                url: m.url,
                position: Number.isFinite(m.position) ? (m.position as number) : i,
              })),
          });
        }
      }
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/ads/:id error:", e);
    return res.status(500).json({ error: "Error actualizando anuncio" });
  }
});

export default router;

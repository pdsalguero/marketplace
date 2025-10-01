import { Router, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { AuthRequest, authenticate } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

/** Helpers */
async function getLocationBySlug(slug?: string | null) {
  if (!slug) return null;
  return prisma.location.findUnique({ where: { slug: String(slug) } });
}

/** GET /api/users/me */
router.get("/users/me", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = String(req.user!.id);

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isAdmin: true,
      status: true,
      createdAt: true,
      profile: {
        select: {
          displayName: true,
          phone: true,
          avatarUrl: true,
          addressText: true,
          provinceId: true,
          cityId: true,
        },
      },
    },
  });

  if (!me) return res.status(404).json({ error: "Usuario no encontrado" });

  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Vary", "Authorization");

  return res.json(me);
});

/** PUT /api/users/me */
router.put("/users/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user!.id);
    const {
      displayName,
      phone,
      avatarUrl,
      provinceSlug,
      citySlug,
      addressText,
    } = req.body as {
      displayName?: string;
      phone?: string;
      avatarUrl?: string;
      provinceSlug?: string | null;
      citySlug?: string | null;
      addressText?: string;
    };

    // Resolver provincia/ciudad por slug (si vinieron)
    const province = await getLocationBySlug(provinceSlug);
    const city = await getLocationBySlug(citySlug);

    // Validar consistencia: si vienen ambas, la ciudad debe pertenecer a esa provincia
    if (city && province && city.parentId && city.parentId !== province.id) {
      return res.status(400).json({ error: "La ciudad no pertenece a la provincia seleccionada" });
    }

    // Upsert directo sobre UserProfile por userId (evita tipos de nested upsert)
    await prisma.userProfile.upsert({
      where: { userId }, // ⬅️ userId debe ser único en el modelo UserProfile
      create: {
        userId,
        displayName: displayName ?? "Usuario",
        phone: phone ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
        addressText: addressText ?? undefined,
        provinceId: province ? province.id : undefined,
        cityId: city ? city.id : undefined,
      },
      update: {
        ...(displayName !== undefined && { displayName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(addressText !== undefined && { addressText }),
        ...(provinceSlug !== undefined && { provinceId: province ? province.id : null }),
        ...(citySlug !== undefined && { cityId: city ? city.id : null }),
      },
    });

    // Devolvemos el usuario actualizado
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            displayName: true,
            phone: true,
            avatarUrl: true,
            addressText: true,
            provinceId: true,
            cityId: true,
          },
        },
      },
    });

    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    res.set("Vary", "Authorization");

    return res.json(me);
  } catch (err) {
    console.error("update me error:", err);
    return res.status(500).json({ error: "Error actualizando perfil" });
  }
});

/** GET /api/users/me/listings */
router.get("/users/me/listings", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = String(req.user!.id);
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 12)));

  const where: Prisma.ListingWhereInput = { sellerId: userId };

  const [total, items] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        media: { orderBy: { position: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Vary", "Authorization");

  return res.json({ items, total, page, pageSize });
});

export default router;

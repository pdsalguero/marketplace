import { Router, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { AuthRequest, authenticate } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

/**
 * Convierte un slug de ubicación (provincia/ciudad) a su ID interno.
 */
async function resolveLocationIdFromSlug(slug?: string | null) {
  if (!slug) return undefined;
  const l = await prisma.location.findUnique({ where: { slug } });
  return l?.id;
}

/**
 * GET /api/users/me
 * Devuelve el usuario autenticado.
 * Headers anti-cache para evitar 304 sin body y variar por Authorization.
 */
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
          about: true,
          provinceId: true,
          cityId: true,
          addressText: true,
        },
      },
    },
  });

  if (!me) return res.status(404).json({ error: "Usuario no encontrado" });

  // Evita respuestas 304 y asegura que el cache dependa del header Authorization
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Vary", "Authorization");

  return res.json(me);
});

/**
 * PUT /api/users/me
 * Actualiza datos del perfil del usuario autenticado (upsert del perfil).
 * Acepta slugs de provincia/ciudad y los traduce a IDs.
 */
router.put("/users/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user!.id);
    const {
      displayName,
      phone,
      avatarUrl,
      about,
      provinceSlug,
      citySlug,
      addressText,
    } = req.body as {
      displayName?: string;
      phone?: string;
      avatarUrl?: string;
      about?: string;
      provinceSlug?: string | null;
      citySlug?: string | null;
      addressText?: string;
    };

    const provinceId = await resolveLocationIdFromSlug(provinceSlug);
    const cityId = await resolveLocationIdFromSlug(citySlug);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          upsert: {
            create: {
              displayName: displayName ?? "Usuario",
              phone,
              avatarUrl,
              about,
              provinceId: provinceId ?? undefined,
              cityId: cityId ?? undefined,
              addressText,
            },
            update: {
              ...(displayName !== undefined && { displayName }),
              ...(phone !== undefined && { phone }),
              ...(avatarUrl !== undefined && { avatarUrl }),
              ...(about !== undefined && { about }),
              ...(provinceSlug !== undefined && { provinceId: provinceId ?? null }),
              ...(citySlug !== undefined && { cityId: cityId ?? null }),
              ...(addressText !== undefined && { addressText }),
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            displayName: true,
            phone: true,
            avatarUrl: true,
            about: true,
            provinceId: true,
            cityId: true,
            addressText: true,
          },
        },
      },
    });

    // Anti-cache en la respuesta de actualización también
    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    res.set("Vary", "Authorization");

    return res.json(updated);
  } catch (err) {
    console.error("update me error:", err);
    return res.status(500).json({ error: "Error actualizando perfil" });
  }
});

/**
 * GET /api/users/me/listings
 * Paginado de publicaciones del usuario autenticado.
 */
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

  // Anti-cache en listados del usuario
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Vary", "Authorization");

  return res.json({ items, total, page, pageSize });
});

export default router;

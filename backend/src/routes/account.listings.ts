import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { viewUrl } from "../lib/mediaUrl";

const prisma = new PrismaClient();
const router = Router();

/** GET /api/account/listings */
router.get("/", authenticate, async (req: any, res) => {
  try {
    const userId = String(req.user!.id);

    const rows = await prisma.listing.findMany({
      where: { sellerId: userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        priceAmount: true,
        currency: true,
        status: true,
        createdAt: true,
        category: { select: { name: true } },
        media: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
    });

    const items = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        title: r.title,
        price: r.priceAmount,
        currency: r.currency,
        status: r.status,
        categoryName: r.category?.name ?? "-",
        coverUrl: await viewUrl(r.media[0]?.url ?? null), // firmada si el bucket es privado
        createdAt: r.createdAt,
      }))
    );

    res.json({ items });
  } catch (e) {
    console.error("GET /api/account/listings error:", e);
    res.status(500).json({ error: "No se pudieron listar tus avisos" });
  }
});

export default router;

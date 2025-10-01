import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

/**
 * Supone un modelo Location con:
 * - id: string
 * - name: string
 * - slug: string (unique)
 * - parentId: string | null  (null => Provincia; no-null => Ciudad de esa provincia)
 *
 * Si tu schema difiere, ajusta los WHERE/selects.
 */

// GET /api/locations/provinces
router.get("/locations/provinces", async (_req: Request, res: Response) => {
  try {
    const items = await prisma.location.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    res.json({ items });
  } catch (err) {
    console.error("provinces error:", err);
    res.status(500).json({ error: "Error listando provincias" });
  }
});

// GET /api/locations/cities?provinceSlug=xxx
router.get("/locations/cities", async (req: Request, res: Response) => {
  try {
    const provinceSlug = String(req.query.provinceSlug || "");
    if (!provinceSlug) return res.status(400).json({ error: "provinceSlug requerido" });

    const province = await prisma.location.findUnique({
      where: { slug: provinceSlug },
      select: { id: true },
    });
    if (!province) return res.status(404).json({ error: "Provincia no encontrada" });

    const items = await prisma.location.findMany({
      where: { parentId: province.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    res.json({ items });
  } catch (err) {
    console.error("cities error:", err);
    res.status(500).json({ error: "Error listando ciudades" });
  }
});

export default router;

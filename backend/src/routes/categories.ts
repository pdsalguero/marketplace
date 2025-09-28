// backend/src/routes/categories.ts
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

type CategoryDTO = { id: string; slug: string; name: string; label: string; icon?: string | null };

// GET /api/categories  -> categorías de nivel 1
router.get("/", async (_req: Request, res: Response<CategoryDTO[]>) => {
  const cats = await prisma.category.findMany({
    where: { isActive: true, level: 1 },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true },
  });
  const items = cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, label: c.name, icon: null }));
  return res.status(200).json(items);
});

// GET /api/categories/:slug/children  -> subcategorías directas
router.get("/:slug/children", async (req: Request, res: Response<CategoryDTO[]>) => {
  const { slug } = req.params;
  const cat = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, slug: true, name: true },
      },
    },
  });
  if (!cat) return res.status(404).json([]);
  const items = cat.children.map((c) => ({ id: c.id, slug: c.slug, name: c.name, label: c.name, icon: null }));
  return res.status(200).json(items);
});

// GET /api/categories/:slug  -> devuelve la categoría y sus children (útil para fallback del frontend)
router.get("/:slug", async (req: Request, res: Response<any>) => {
  const { slug } = req.params;
  const cat = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, slug: true, name: true },
      },
    },
  });
  if (!cat) return res.status(404).json({ error: "Not found" });
  return res.status(200).json({
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    label: cat.name,
    children: cat.children.map((c) => ({ id: c.id, slug: c.slug, name: c.name, label: c.name, icon: null })),
  });
});

export default router;

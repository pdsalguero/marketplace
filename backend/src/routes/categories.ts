// backend/src/routes/categories.ts
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

type CategoryDTO = { id: string; slug: string; name: string; label: string; icon?: string | null };
type CategoryNode = CategoryDTO & { children?: CategoryNode[] };

// GET /api/categories  -> nivel 1
router.get("/", async (_req: Request, res: Response<CategoryDTO[]>) => {
  const cats = await prisma.category.findMany({
    where: { isActive: true, level: 1 },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true },
  });
  const items = cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, label: c.name, icon: null }));
  return res.status(200).json(items);
});

// GET /api/categories/tree  -> árbol 1->2->3
router.get("/tree", async (_req: Request, res: Response<CategoryNode[]>) => {
  const level1 = await prisma.category.findMany({
    where: { isActive: true, level: 1 },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true, slug: true, name: true,
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true, slug: true, name: true,
          children: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, slug: true, name: true },
          },
        },
      },
    },
  });

  const toNode = (c: any): CategoryNode => ({
    id: c.id, slug: c.slug, name: c.name, label: c.name, icon: null,
    children: Array.isArray(c.children) ? c.children.map(toNode) : [],
  });

  return res.status(200).json(level1.map(toNode));
});

// GET /api/categories/:slug/children
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

// GET /api/categories/:slug/attribute-defs?inherit=1
// Devuelve atributos definidos para la categoría y sus ancestros (por defecto inherit=1)
router.get("/:slug/attribute-defs", async (req: Request, res: Response) => {
  const { slug } = req.params;
  const inherit = String(req.query.inherit ?? "1") !== "0";

  const cat = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, level: true,
      parent: { select: { id: true, slug: true, name: true, parent: { select: { id: true, slug: true, name: true } } } },
    },
  });
  if (!cat) return res.status(404).json([]);

  const ids: string[] = [cat.id];
  if (inherit) {
    if (cat.parent?.id) ids.push(cat.parent.id);
    if (cat.parent?.parent?.id) ids.push(cat.parent.parent.id);
  }

  const defs = await prisma.listingAttributeDef.findMany({
    where: { categoryId: { in: ids } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, categoryId: true, name: true, key: true, dataType: true, enumOptions: true, isRequired: true, sortOrder: true },
  });

  return res.json(defs.map((d) => ({
    id: d.id,
    categoryId: d.categoryId,
    key: d.key,
    name: d.name,
    dataType: d.dataType,          // "text" | "number" | "boolean" | "enum"
    enumOptions: d.enumOptions,    // array cuando dataType = "enum"
    isRequired: d.isRequired,
    sortOrder: d.sortOrder,
  })));
});

// GET /api/categories/:slug
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

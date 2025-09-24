// src/routes/categories.ts
import { Router } from 'express';
import prisma from '../prisma';

const r = Router();

r.get('/categories', async (_req, res, next) => {
  try {
    const nodes = await prisma.categoryNode.findMany({
      select: { id: true, key: true, name: true, parentId: true, order: true, active: true },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { id: 'asc' }],
    });

    const byId = new Map(nodes.map(n => [n.id, { ...n, children: [] as any[] }]));
    const roots: any[] = [];
    for (const n of byId.values()) {
      if (n.parentId) byId.get(n.parentId)?.children.push(n);
      else roots.push(n);
    }
    res.json(roots);
  } catch (e) { next(e); }
});

export default r;

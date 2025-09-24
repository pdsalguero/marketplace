// prisma/seed.ts
/// <reference types="node" />

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


// Config
const SITE = process.env.MELI_SITE ?? 'MLA'; // ej. MLA (Argentina), MLM (México), MLC (Chile)
const MAX_CONCURRENCY = Number(process.env.MELI_CONCURRENCY ?? 4);
const RETRIES = 3;
const BACKOFF_MS = 400;

console.log("→ Seed ML recursivo activo. SITE=", SITE);


// Helpers HTTP
async function delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }

async function getJSON(url, attempt = 1) {
  const headers = {
    'User-Agent': 'MarketplaceSeed/1.0 (+seed@example.com)',
    'Accept': 'application/json',
  };
  if (process.env.MELI_AUTHORIZATION) {
    headers['Authorization'] = process.env.MELI_AUTHORIZATION; // ej: "Bearer xxxxxx"
  }
  const res = await fetch(url, { headers });
  if (res.ok) return res.json();

  const RETRY_STATUSES = [403, 429, 500, 502, 503, 504];
  if (RETRY_STATUSES.includes(res.status) && attempt < RETRIES) {
    await delay(BACKOFF_MS * attempt);
    return getJSON(url, attempt + 1);
  }
  throw new Error(`HTTP ${res.status} ${res.statusText} -> ${url}`);
}

type RootCategory = { id: string; name: string; };
type CategoryNodeAPI = {
  id: string;
  name: string;
  children_categories: { id: string; name: string; }[];
};

async function fetchRootCategories(site: string) {
  return getJSON<RootCategory[]>(`https://api.mercadolibre.com/sites/${site}/categories`);
}
async function fetchCategory(id: string) {
  return getJSON<CategoryNodeAPI>(`https://api.mercadolibre.com/categories/${id}`);
}

// DB helper
async function upsertCategoryNode(params: {
  key: string; name: string; parentId?: number | null; order?: number;
}) {
  const { key, name, parentId = null, order = 0 } = params;
  return prisma.categoryNode.upsert({
    where: { key },
    update: { name, parentId, order, active: true },
    create: { key, name, parentId, order, active: true },
    select: { id: true }
  });
}

async function seedAll() {
  console.log(`→ Descargando raíces del sitio ${SITE}...`);
  const roots = await fetchRootCategories(SITE);

  // Insertar raíces y preparar cola
  type QueueItem = { meliId: string; parentDbId: number | null; };
  const queue: QueueItem[] = [];
  const visited = new Set<string>(); // evita ciclos/duplicados por id de ML

  // upsert raíces
  for (let i = 0; i < roots.length; i++) {
    const r = roots[i];
    const key = `${SITE}:${r.id}`;
    const row = await upsertCategoryNode({ key, name: r.name, order: i });
    queue.push({ meliId: r.id, parentDbId: row.id });
    visited.add(r.id);
  }

  // Consumir cola BFS con concurrencia limitada
  let inFlight = 0;
  let idx = 0;

  async function worker(item: QueueItem) {
    try {
      const node = await fetchCategory(item.meliId);
      // upsert de hijos
      for (let i = 0; i < (node.children_categories?.length ?? 0); i++) {
        const ch = node.children_categories[i];
        const key = `${SITE}:${ch.id}`;
        const child = await upsertCategoryNode({
          key,
          name: ch.name,
          parentId: item.parentDbId ?? null,
          order: i
        });
        if (!visited.has(ch.id)) {
          visited.add(ch.id);
          queue.push({ meliId: ch.id, parentDbId: child.id });
        }
      }
    } catch (e) {
      console.error(`× Error en categoría ${item.meliId}:`, (e as Error).message);
    }
  }

  async function runPool() {
    const total = queue.length;
    while (idx < queue.length || inFlight > 0) {
      while (inFlight < MAX_CONCURRENCY && idx < queue.length) {
        const item = queue[idx++];
        inFlight++;
        worker(item)
          .finally(() => { inFlight--; })
          .catch(() => { inFlight--; });
      }
      // pequeña pausa para permitir que baje la concurrencia
      await delay(50);
      if (idx % 50 === 0) {
        console.log(`… procesadas ~${idx}/${queue.length} categorías en cola (puede crecer)`);
      }
    }
  }

  await runPool();
  console.log(`✅ Seed completo. Nodos en DB: ${await prisma.categoryNode.count()}`);
}

async function main() {
  await seedAll();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

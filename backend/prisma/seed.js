// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs/promises');

const prisma = new PrismaClient();

const SITE = process.env.MELI_SITE || 'MLA';                 // p.ej. MLA (Argentina)
const MAX_CONCURRENCY = Number(process.env.MELI_CONCURRENCY || 4);
const RETRIES = 3;
const BACKOFF_MS = 400;

function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

async function getJSON(url, attempt = 1) {
  const headers = {
    'User-Agent': 'MarketplaceSeed/1.0 (+seed@example.com)',
    'Accept': 'application/json',
  };
  const res = await fetch(url, { headers });
  if (res.ok) return res.json();

  const RETRY_STATUSES = [403, 429, 500, 502, 503, 504];
  if (RETRY_STATUSES.includes(res.status) && attempt < RETRIES) {
    await delay(BACKOFF_MS * attempt);
    return getJSON(url, attempt + 1);
  }
  throw new Error(`HTTP ${res.status} ${res.statusText} -> ${url}`);
}

async function fetchRootCategories(site) {
  return getJSON(`https://api.mercadolibre.com/sites/${site}/categories`);
}
async function fetchCategory(id) {
  return getJSON(`https://api.mercadolibre.com/categories/${id}`);
}

async function upsertCategoryNode({ key, name, parentId = null, order = 0 }) {
  return prisma.categoryNode.upsert({
    where: { key },
    update: { name, parentId, order, active: true },
    create: { key, name, parentId, order, active: true },
    select: { id: true }
  });
}

async function seedFromAPI() {
  console.log(`→ API mode. SITE=${SITE}`);
  const roots = await fetchRootCategories(SITE);

  // Cola BFS
  const queue = []; // { meliId, parentDbId }
  const visited = new Set();

  // Insertar raíces
  for (let i = 0; i < roots.length; i++) {
    const r = roots[i];
    const row = await upsertCategoryNode({ key: `${SITE}:${r.id}`, name: r.name, order: i });
    queue.push({ meliId: r.id, parentDbId: row.id });
    visited.add(r.id);
  }

  let inFlight = 0, idx = 0;
  async function worker(item) {
    try {
      const node = await fetchCategory(item.meliId);
      const children = node.children_categories || [];
      for (let i = 0; i < children.length; i++) {
        const ch = children[i];
        const child = await upsertCategoryNode({
          key: `${SITE}:${ch.id}`,
          name: ch.name,
          parentId: item.parentDbId,
          order: i
        });
        if (!visited.has(ch.id)) {
          visited.add(ch.id);
          queue.push({ meliId: ch.id, parentDbId: child.id });
        }
      }
    } catch (e) {
      console.error(`× ${item.meliId}:`, e.message);
    }
  }

  async function runPool() {
    while (idx < queue.length || inFlight > 0) {
      while (inFlight < MAX_CONCURRENCY && idx < queue.length) {
        const it = queue[idx++];
        inFlight++;
        worker(it).finally(() => { inFlight--; });
      }
      await delay(50);
    }
  }

  await runPool();
}

async function seedFromFile(path) {
  console.log(`→ OFFLINE mode. Archivo=${path}`);
  const content = await fs.readFile(path, 'utf-8');
  /** @type {{id:string,name:string,parentId:string|null}[]} */
  const dump = JSON.parse(content);

  const idMap = new Map(); // meliId -> dbId
  let order = 0;

  // Padres primero
  for (const n of dump.filter(d => d.parentId === null)) {
    const row = await upsertCategoryNode({ key: `${SITE}:${n.id}`, name: n.name, order: order++ });
    idMap.set(n.id, row.id);
  }
  // Luego el resto por pasadas hasta completar
  let remaining = dump.filter(d => d.parentId !== null);
  while (remaining.length) {
    const next = [];
    for (const n of remaining) {
      const parentDbId = idMap.get(n.parentId);
      if (!parentDbId) { next.push(n); continue; }
      const row = await upsertCategoryNode({
        key: `${SITE}:${n.id}`, name: n.name, parentId: parentDbId, order: 0
      });
      idMap.set(n.id, row.id);
    }
    if (next.length === remaining.length) {
      throw new Error('No se pudo resolver jerarquía offline (faltan padres en el dump).');
    }
    remaining = next;
  }
}

async function main() {
  console.log('→ Seed ML recursivo activo.');
  const offline = process.env.MELI_OFFLINE_JSON;

  // (Opcional) limpiar antes si quieres reseed limpio
  if (process.env.TRUNCATE_FIRST === '1') {
    console.log('→ TRUNCATE CategoryNode...');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "CategoryNode" RESTART IDENTITY CASCADE;');
  }

  if (offline) await seedFromFile(offline);
  else await seedFromAPI();

  const total = await prisma.categoryNode.count();
  console.log(`✅ Listo. CategoryNode total: ${total}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

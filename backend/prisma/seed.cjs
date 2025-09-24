const { PrismaClient } = require("@prisma/client");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const prisma = new PrismaClient();

async function upsertNode(node, parentId) {
  const data = { name: node.name, order: node.order ?? 0, active: node.active ?? true, parentId };
  const saved = await prisma.categoryNode.upsert({
    where: { key: node.key },
    update: data,
    create: { key: node.key, ...data },
  });
  if (Array.isArray(node.children)) {
    for (const child of node.children) await upsertNode(child, saved.id);
  }
}

async function main() {
  const file = join(process.cwd(), "prisma", "seed-taxonomy.json");
  const raw = readFileSync(file, "utf-8");
  const json = JSON.parse(raw);
  if (!json.categories || !Array.isArray(json.categories)) throw new Error("seed-taxonomy.json inválido");
  for (const root of json.categories) await upsertNode(root, null);
  console.log("✅ Taxonomía cargada/actualizada");
}

main()
  .catch((e) => { console.error("❌ Seed taxonomy error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

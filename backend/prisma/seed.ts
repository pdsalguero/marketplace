import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

type Node = {
  key: string;
  name: string;
  order?: number;
  active?: boolean;
  children?: Node[];
};

async function upsertNode(node: Node, parentId: number | null) {
  const data = {
    name: node.name,
    order: node.order ?? 0,
    active: node.active ?? true,
    parentId,
  };

  const saved = await prisma.categoryNode.upsert({
    where: { key: node.key },
    update: data,
    create: { key: node.key, ...data },
  });

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      await upsertNode(child, saved.id);
    }
  }
}

async function main() {
  // Usamos CWD para evitar problemas de __dirname/ESM
  const file = join(process.cwd(), "prisma", "seed-taxonomy.json");
  const raw = readFileSync(file, "utf-8");
  const json = JSON.parse(raw) as { categories: Node[] };

  if (!json.categories || !Array.isArray(json.categories)) {
    throw new Error("seed-taxonomy.json inválido: falta 'categories[]'");
  }

  for (const root of json.categories) {
    await upsertNode(root, null);
  }

  console.log("✅ Taxonomía cargada/actualizada");
}

main()
  .catch((e) => {
    console.error("❌ Seed taxonomy error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

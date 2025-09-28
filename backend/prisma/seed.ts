import { PrismaClient } from '@prisma/client'
/// <reference types="node" />
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

type CategoryNode = {
  name: string
  slug: string
  children?: CategoryNode[]
}

async function seedLocations() {
  const provinciasCsvPath = path.join('data', 'provincias.csv')
  const ciudadesCsvPath = path.join('data', 'ciudades.csv')

  if (!fs.existsSync(provinciasCsvPath)) {
    throw new Error(`Falta ${provinciasCsvPath}.`)
  }
  if (!fs.existsSync(ciudadesCsvPath)) {
    throw new Error(`Falta ${ciudadesCsvPath}. Ejecutá: npm run build:ciudades`)
  }

  // Provincias
  const provLines = fs.readFileSync(provinciasCsvPath, 'utf8').trim().split(/\r?\n/).slice(1)
  for (const prov of provLines) {
    const slug = `ar-${slugify(prov)}`
    await prisma.location.upsert({
      where: { slug },
      update: {},
      create: { country: 'AR', name: prov, slug },
    })
  }

  const provs = await prisma.location.findMany({ where: { country: 'AR', parentId: null } })
  const provMap = new Map(provs.map((p) => [normalize(p.name), p.id]))

  // Ciudades
  const ciudadesLines = fs.readFileSync(ciudadesCsvPath, 'utf8').trim().split(/\r?\n/).slice(1)
  for (const line of ciudadesLines) {
    if (!line) continue
    const [cityRaw, provRaw] = parseCsvLine(line)
    const provId = provMap.get(normalize(provRaw))
    if (!provId) continue
    const slug = `ar-${slugify(provRaw)}-${slugify(cityRaw)}`
    await prisma.location.upsert({
      where: { slug },
      update: {},
      create: { country: 'AR', name: cityRaw, slug, parentId: provId },
    })
  }

  console.log('✓ Ubicaciones AR sembradas.')
}

async function seedCategories() {
  const file = path.join('data', 'categories.json')
  const json = JSON.parse(fs.readFileSync(file, 'utf8')) as CategoryNode[]

  async function insertNode(node: CategoryNode, parentId: string | null, level: number) {
    const created = await prisma.category.upsert({
      where: { slug: node.slug },
      update: {},
      create: {
        name: node.name,
        slug: node.slug,
        parentId,
        level,
        isActive: true,
        sortOrder: 0,
      },
    })
    if (node.children?.length) {
      for (const child of node.children) {
        await insertNode(child, created.id, level + 1)
      }
    }
  }

  for (const root of json) {
    await insertNode(root, null, 1)
  }
  console.log('✓ Categorías (3 niveles) sembradas.')
}

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
function normalize(s: string) {
  return s.trim().toLowerCase()
}

// City,Province (CSV básico con comillas opcionales)
function parseCsvLine(line: string): [string, string] {
  const matches = line.match(/^("([^"]|"")*"|[^,]*),(.*)$/)
  if (!matches) {
    const parts = line.split(',')
    return [parts[0], parts.slice(1).join(',')]
  }
  const city = matches[1].replace(/^"|"$/g, '').replace(/""/g, '"')
  const prov = matches[3].replace(/^"|"$/g, '').replace(/""/g, '"')
  return [city, prov]
}

async function main() {
  await seedLocations()
  await seedCategories()
}

main()
  .then(() => console.log('✓ Seed completo'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

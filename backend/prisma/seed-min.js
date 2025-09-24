// prisma/seed-min.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Árbol mínimo (padres + subcategorías) — idempotente
const CATS = [
  {
    key: 'MLA:AUTOS',
    name: 'Autos, Motos y Otros',
    children: [
      { key: 'MLA:AUTOS_USADOS', name: 'Autos Usados' },
      { key: 'MLA:AUTOS_NUEVOS', name: 'Autos Nuevos' },
      { key: 'MLA:MOTOS', name: 'Motos' },
      { key: 'MLA:CAMIONES_BUSES', name: 'Camiones y Buses' },
      { key: 'MLA:ACCESORIOS_VEHICULOS', name: 'Accesorios para Vehículos' },
    ],
  },
  {
    key: 'MLA:INMUEBLES',
    name: 'Inmuebles',
    children: [
      { key: 'MLA:DEPARTAMENTOS', name: 'Departamentos' },
      { key: 'MLA:CASAS', name: 'Casas' },
      { key: 'MLA:ALQUILER_TEMPORARIO', name: 'Alquiler Temporario' },
      { key: 'MLA:LOCALES', name: 'Locales' },
      { key: 'MLA:TERRENOS', name: 'Terrenos' },
    ],
  },
  {
    key: 'MLA:ELECTRONICA',
    name: 'Electrónica, Audio y Video',
    children: [
      { key: 'MLA:CELULARES', name: 'Celulares' },
      { key: 'MLA:SMARTPHONES', name: 'Smartphones' },
      { key: 'MLA:LAPTOPS', name: 'Laptops' },
      { key: 'MLA:TELEVISORES', name: 'Televisores' },
      { key: 'MLA:AURICULARES', name: 'Auriculares' },
    ],
  },
  {
    key: 'MLA:HOGAR',
    name: 'Hogar, Muebles y Jardín',
    children: [
      { key: 'MLA:MUEBLES', name: 'Muebles' },
      { key: 'MLA:DECORACION', name: 'Decoración' },
      { key: 'MLA:JARDIN', name: 'Jardín' },
      { key: 'MLA:COCINA', name: 'Cocina' },
    ],
  },
  {
    key: 'MLA:EMPLEO',
    name: 'Empleos',
    children: [
      { key: 'MLA:ADMINISTRACION', name: 'Administración' },
      { key: 'MLA:VENTAS', name: 'Ventas' },
      { key: 'MLA:IT', name: 'Tecnología / IT' },
      { key: 'MLA:LOGISTICA', name: 'Logística' },
    ],
  },
  {
    key: 'MLA:SERVICIOS',
    name: 'Servicios',
    children: [
      { key: 'MLA:TECNICOS', name: 'Servicios Técnicos' },
      { key: 'MLA:EVENTOS', name: 'Eventos' },
      { key: 'MLA:CLASES', name: 'Clases y Cursos' },
      { key: 'MLA:TRANSPORTE', name: 'Transporte' },
    ],
  },
  {
    key: 'MLA:MODA',
    name: 'Ropa y Accesorios',
    children: [
      { key: 'MLA:INDUMENTARIA', name: 'Indumentaria' },
      { key: 'MLA:CALZADO', name: 'Calzado' },
      { key: 'MLA:ACCESORIOS', name: 'Accesorios' },
    ],
  },
  {
    key: 'MLA:MASCOTAS',
    name: 'Animales y Mascotas',
    children: [
      { key: 'MLA:PERROS', name: 'Perros' },
      { key: 'MLA:GATOS', name: 'Gatos' },
      { key: 'MLA:ACCESORIOS_MASCOTAS', name: 'Accesorios' },
    ],
  },
  {
    key: 'MLA:OTROS',
    name: 'Otros',
    children: [
      { key: 'MLA:COLECCIONABLES', name: 'Coleccionables' },
      { key: 'MLA:ANTIGUEDADES', name: 'Antigüedades' },
    ],
  },
];

async function upsertCategoryNode({ key, name, parentId = null, order = 0 }) {
  return prisma.categoryNode.upsert({
    where: { key },
    update: { name, parentId, order, active: true },
    create: { key, name, parentId, order, active: true },
    select: { id: true },
  });
}

async function main() {
  // Limpieza opcional (quita el comentario si querés empezar de cero cada vez)
  // await prisma.$executeRawUnsafe('TRUNCATE TABLE "CategoryNode" RESTART IDENTITY CASCADE;');

  let idx = 0;
  for (const p of CATS) {
    const parent = await upsertCategoryNode({ key: p.key, name: p.name, order: idx++ });
    let childOrder = 0;
    for (const c of p.children || []) {
      await upsertCategoryNode({
        key: c.key,
        name: c.name,
        parentId: parent.id,
        order: childOrder++,
      });
    }
  }

  const total = await prisma.categoryNode.count();
  console.log(`✅ Seed mínimo listo. CategoryNode total: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

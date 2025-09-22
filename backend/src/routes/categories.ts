import { Router } from "express";

const router = Router();

/**
 * Catálogo base de categorías estilo Yapo.
 * code: enum Category del schema Prisma (AUTOS, INMUEBLES, ...)
 * slug: para URLs legibles si quieres usarlas en el futuro
 * icon: solo decorativo para el frontend
 */
export const CATEGORIES = [
  { slug: "autos",       label: "Autos",        code: "AUTOS",       icon: "🚗" },
  { slug: "inmuebles",   label: "Inmuebles",    code: "INMUEBLES",   icon: "🏠" },
  { slug: "electronica", label: "Electrónica",  code: "ELECTRONICA", icon: "📱" },
  { slug: "hogar",       label: "Hogar",        code: "HOGAR",       icon: "🛋️" },
  { slug: "empleo",      label: "Empleo",       code: "EMPLEO",      icon: "💼" },
  { slug: "servicios",   label: "Servicios",    code: "SERVICIOS",   icon: "🧰" },
  { slug: "moda",        label: "Moda",         code: "MODA",        icon: "👗" },
  { slug: "mascotas",    label: "Mascotas",     code: "MASCOTAS",    icon: "🐾" },
  { slug: "otros",       label: "Otros",        code: "OTROS",       icon: "📦" },
];

router.get("/categories", (_req, res) => {
  res.json({ items: CATEGORIES });
});

export default router;

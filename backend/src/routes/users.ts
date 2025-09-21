// backend/src/routes/users.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Obtener datos del usuario logueado
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true }, // 👈 solo devolvemos lo necesario
    });

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json(user);
  } catch (err) {
    console.error("Error en /users/me:", err);
    res.status(500).json({ error: "Error obteniendo usuario" });
  }
});

// GET /api/users/me/ads → anuncios del usuario logueado
router.get("/me/ads", authenticate, async (req: AuthRequest, res) => {
  try {
    const ads = await prisma.ad.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(ads);
  } catch (err) {
    console.error("Error en /users/me/ads:", err);
    res.status(500).json({ error: "Error obteniendo anuncios del usuario" });
  }
});

export default router;

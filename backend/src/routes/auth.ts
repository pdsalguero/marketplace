import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authenticate, signToken, AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

/** POST /api/auth/register */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email ya registrado" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: { create: { displayName: displayName || email.split("@")[0] } },
      },
      select: { id: true, email: true, isAdmin: true, profile: { select: { displayName: true, avatarUrl: true } } },
    });

    const token = signToken({ id: created.id, email: created.email, isAdmin: created.isAdmin });
    return res.status(201).json({
      token,
      user: {
        id: created.id,
        email: created.email,
        isAdmin: created.isAdmin,
        displayName: created.profile?.displayName || "",
        avatarUrl: created.profile?.avatarUrl || null,
      },
    });
  } catch (e) {
    console.error("auth/register error:", e);
    return res.status(500).json({ error: "Error registrando usuario" });
  }
});

/** POST /api/auth/login */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, isAdmin: true, status: true, profile: { select: { displayName: true, avatarUrl: true } } },
    });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    if (String(user.status) === "banned") return res.status(403).json({ error: "Usuario bloqueado" });

    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin });
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        displayName: user.profile?.displayName || "",
        avatarUrl: user.profile?.avatarUrl || null,
      },
    });
  } catch (e) {
    console.error("auth/login error:", e);
    return res.status(500).json({ error: "Error iniciando sesión" });
  }
});

/** GET /api/auth/me */
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: String(req.user!.id) },
      select: { id: true, email: true, isAdmin: true, profile: { select: { displayName: true, avatarUrl: true } } },
    });
    if (!u) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json({
      id: u.id,
      email: u.email,
      isAdmin: u.isAdmin,
      displayName: u.profile?.displayName || "",
      avatarUrl: u.profile?.avatarUrl || null,
    });
  } catch (e) {
    console.error("auth/me error:", e);
    return res.status(500).json({ error: "Error obteniendo perfil" });
  }
});

export default router;

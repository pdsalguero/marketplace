import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const router = Router();

function signToken(user: { id: string; email: string; isAdmin: boolean }) {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET || "devsecret",
    { expiresIn: "7d" }
  );
}

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body as {
      email?: string;
      password?: string;
      displayName?: string;
    };
    if (!email || !password) {
      return res.status(400).json({ error: "email y password son requeridos" });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email ya registrado" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: displayName ? { create: { displayName } } : undefined,
      },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        profile: { select: { displayName: true } },
      },
    });

    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin });
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("signup error:", err);
    return res.status(500).json({ error: "Error creando usuario" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "email y password son requeridos" });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        passwordHash: true,
        profile: { select: { displayName: true } },
      },
    });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {});

    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin });
    const { passwordHash, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Error en login" });
  }
});

export default router;

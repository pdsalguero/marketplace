import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AuthUser {
  id: string;          // UUID
  email: string;
  isAdmin?: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "No token" });

    const payload: any = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    const id = String(payload.id ?? payload.userId ?? "");
    if (!id) return res.status(401).json({ error: "Invalid token" });

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isAdmin: true },
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

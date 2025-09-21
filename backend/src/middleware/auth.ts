import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: number };
}


export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Token requerido" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token inválido" });

  try {
    const secret = process.env.JWT_SECRET || "secret123";
    const payload = jwt.verify(token, secret) as any; // { userId: number }

    if (!payload?.userId) {
      console.error("El token no tiene userId:", payload);
      return res.status(403).json({ error: "Token inválido" });
    }

    console.log("✅ Token decodificado:", payload);
    
    req.user = { id: payload.userId }; // 👈 Mapear userId → id
    next();
  } catch (err) {
    console.error("Error JWT:", err);
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
}

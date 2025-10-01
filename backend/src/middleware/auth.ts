import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, SignOptions, Secret } from "jsonwebtoken";

export type JwtUser = { id: string; email: string; isAdmin?: boolean };
export interface AuthRequest extends Request { user?: JwtUser; }

const JWT_SECRET: Secret = (process.env.JWT_SECRET ?? "dev-secret");

// Convierte "7d" | "12h" | "30m" | "45s" | "604800" → segundos (number)
function parseExpiresToSeconds(input?: string): number {
  const v = (input ?? "7d").trim();
  if (/^\d+$/.test(v)) return Number(v);
  const m = v.match(/^(\d+)\s*([smhd])$/i);
  if (!m) return 7 * 24 * 60 * 60;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult = u === "s" ? 1 : u === "m" ? 60 : u === "h" ? 3600 : 86400;
  return n * mult;
}

export function signToken(user: JwtUser): string {
  const payload = { id: user.id, email: user.email, isAdmin: !!user.isAdmin };
  const options: SignOptions = { expiresIn: parseExpiresToSeconds(process.env.JWT_EXPIRES) };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || "";
    const [, token] = auth.split(" ");
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload | string;
    if (typeof decoded === "string") return res.status(401).json({ error: "Invalid token" });

    req.user = { id: String(decoded.id), email: String(decoded.email), isAdmin: !!decoded.isAdmin };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

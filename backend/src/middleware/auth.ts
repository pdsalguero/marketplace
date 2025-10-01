import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type JwtUser = { id: string; email: string; isAdmin?: boolean };
export interface AuthRequest extends Request {
  user?: JwtUser;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
export const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

export function signToken(user: JwtUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || "";
    const [, token] = auth.split(" ");
    if (!token) return res.status(401).json({ error: "Missing token" });
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUser;
    req.user = { id: decoded.id, email: decoded.email, isAdmin: !!decoded.isAdmin };
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

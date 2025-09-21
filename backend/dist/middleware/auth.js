"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authenticate(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader)
        return res.status(401).json({ error: "Token requerido" });
    const token = authHeader.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "Token inválido" });
    try {
        const secret = process.env.JWT_SECRET || "secret123";
        const payload = jsonwebtoken_1.default.verify(token, secret); // { userId: number }
        if (!payload?.userId) {
            console.error("El token no tiene userId:", payload);
            return res.status(403).json({ error: "Token inválido" });
        }
        console.log("✅ Token decodificado:", payload);
        req.user = { id: payload.userId }; // 👈 Mapear userId → id
        next();
    }
    catch (err) {
        console.error("Error JWT:", err);
        return res.status(403).json({ error: "Token inválido o expirado" });
    }
}

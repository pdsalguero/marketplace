"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/users.ts
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Obtener los anuncios del usuario logueado
router.get("/me/ads", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: "No autenticado" });
        const ads = await prisma_1.prisma.ad.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        res.json(ads);
    }
    catch (err) {
        console.error("Error obteniendo anuncios del usuario:", err);
        res.status(500).json({ error: "Error interno" });
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Crear anuncio protegido
router.post("/", auth_1.authenticate, async (req, res) => {
    const { title, description, price } = req.body;
    const userId = req.user.id; // ← ahora viene del token
    try {
        const ad = await prisma.ad.create({ data: { title, description, price, userId } });
        res.json(ad);
    }
    catch (err) {
        console.error("Error Prisma:", err);
        res.status(400).json({ error: "Error al crear anuncio PRISMA" });
    }
});
const s3 = new aws_sdk_1.default.S3({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    s3ForcePathStyle: true, // 👈 necesario para MinIO
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
});
// Listar todos los anuncios
router.get("/", async (_req, res) => {
    const ads = await prisma.ad.findMany({ include: { user: true } });
    res.json(ads);
});
// Obtener detalle de un anuncio
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const ad = await prisma.ad.findUnique({
            where: { id: Number(id) },
            include: { user: true }, // 👈 incluye info del usuario
        });
        if (!ad)
            return res.status(404).json({ error: "Anuncio no encontrado" });
        res.json(ad);
    }
    catch (err) {
        console.error("Error al buscar anuncio:", err);
        res.status(500).json({ error: "Error al buscar anuncio" });
    }
});
// Editar anuncio (solo dueño)
router.put("/:id", auth_1.authenticate, async (req, res) => {
    const { id } = req.params;
    const { title, description, price } = req.body;
    try {
        const ad = await prisma.ad.findUnique({ where: { id: Number(id) } });
        if (!ad)
            return res.status(404).json({ error: "Anuncio no encontrado" });
        if (ad.userId !== req.user?.id)
            return res.status(403).json({ error: "No autorizado" });
        const updated = await prisma.ad.update({
            where: { id: Number(id) },
            data: { title, description, price: parseFloat(price) },
        });
        res.json(updated);
    }
    catch (err) {
        console.error("Error al editar anuncio:", err);
        res.status(500).json({ error: "Error al editar anuncio" });
    }
});
// Eliminar anuncio (solo dueño)
router.delete("/:id", auth_1.authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const ad = await prisma.ad.findUnique({ where: { id: Number(id) } });
        if (!ad)
            return res.status(404).json({ error: "Anuncio no encontrado" });
        if (ad.userId !== req.user?.id)
            return res.status(403).json({ error: "No autorizado" });
        await prisma.ad.delete({ where: { id: Number(id) } });
        res.json({ message: "Anuncio eliminado" });
    }
    catch (err) {
        console.error("Error al eliminar anuncio:", err);
        res.status(500).json({ error: "Error al eliminar anuncio" });
    }
});
router.get("/presigned-url", async (req, res) => {
    try {
        const { fileName, fileType } = req.query;
        if (!fileName || !fileType) {
            return res.status(400).json({ error: "Parámetros inválidos" });
        }
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: `uploads/${Date.now()}_${fileName}`,
            ContentType: fileType,
            Expires: 60,
        };
        const uploadURL = await s3.getSignedUrlPromise("putObject", params);
        res.json({ uploadURL, key: params.Key });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error generando presigned URL" });
    }
});
exports.default = router;

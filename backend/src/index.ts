import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Rutas
import authRoutes from "./routes/auth";
import adsRoutes from "./routes/ads";
import userRoutes from "./routes/users";
import presignRoutes from "./routes/presign";
import filesRoutes from "./routes/files";
import categoriesRoutes from "./routes/categories";
import autosRoutes from "./routes/autos";

dotenv.config();
const app = express();

// Middlewares base
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

// Healthchecks
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true, api: true }));

// Prefijo /api
app.use("/api", categoriesRoutes);
app.use("/api", filesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);      // => /api/users/...
app.use("/api/ads", adsRoutes);
app.use("/api", autosRoutes);

// (Opcional) mantener si usas el single presign
app.use("/api", presignRoutes);

// Manejo de errores
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

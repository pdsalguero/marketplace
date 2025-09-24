import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import adsRoutes from "./routes/ads";
import userRoutes from "./routes/users";
import presignRoutes from "./routes/presign"; // si lo estás usando
import filesRoutes from "./routes/files";     // GET y PUT batch de imágenes
import categoriesRoutes from "./routes/categories";
import autosRoutes from "./routes/autos";


dotenv.config();
const app = express();

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

// Rutas públicas
app.use("/api", categoriesRoutes);
app.use("/api", filesRoutes);     // /files/presigned-get, /files/presigned-put-batch
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api", autosRoutes);


// (Opcional) mantener si usas el single presign en /api/ads/presigned-url
app.use("/api", presignRoutes);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

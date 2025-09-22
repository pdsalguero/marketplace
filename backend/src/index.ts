import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import adsRoutes from "./routes/ads";
import userRoutes from "./routes/users";
import presignRoutes from "./routes/presign"; // POST/PUT presign
import filesRoutes from "./routes/files";     // GET presign

dotenv.config();
const app = express();

// Ajusta origins si usas otro puerto/origen en el frontend
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

// Rutas
app.use("/api", presignRoutes);   // GET /api/ads/presigned-url
app.use("/api", filesRoutes);     // GET /api/files/presigned-get
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ads", adsRoutes);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

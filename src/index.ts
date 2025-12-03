// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import prisma from "./config/database";
import fileUpload from "express-fileupload";

// Importar rutas de API
import authRoutes from "./routes/auth.routes";



dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================
// Configuración general
// ============================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    abortOnLimit: true,
    useTempFiles: false,
  })
);

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================
// Registro de rutas principales
// ============================
app.use("/api/auth", authRoutes);
// ============================
// Health Check
// ============================
app.get("/", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", db: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", db: "not connected" });
  }
});


// ============================
// Iniciar servidor
// ============================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

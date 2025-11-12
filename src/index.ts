// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import prisma from "./config/database";
import fileUpload from "express-fileupload";

// 🧩 Importar rutas existentes
import authRoutes from "./routes/auth.routes";
import areaRoutes from "./routes/areaRoutes";
import niveleRoutes from "./routes/nivelRoutes";
import importarCSVRoutes from "./routes/importarCSV.routes";
import evaluadorRoutes from "./routes/evaluador.routes";
import asingarAreaNivelRoutes from "./routes/asignar-area-nivel.routes";

// 🆕 Importar nuevas rutas
import inscritosRoutes from "./routes/inscritos.routes"; // HU-04
import fasesRoutes from "./routes/fases.routes"; // HU-Fases
import premiadosRoutes from "./routes/premiados.routes"; // HU-08 (premiados)
import medalleroRoutes from "./routes/medallero.routes";
// 🧱 Middlewares
import { manejoErrores } from "./middlewares/manejo-errores";

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
app.use("/api/evaluadores", evaluadorRoutes);
app.use("/api/inscripciones", importarCSVRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/niveles", niveleRoutes);
app.use("/api/asignaciones", asingarAreaNivelRoutes);

// 🆕 Nueva ruta HU-04: Lista de Olímpistas Inscritos
app.use("/api", inscritosRoutes);

// 🆕 Nueva ruta HU-Fases: gestión de estados de fases
app.use("/api", fasesRoutes);

// ✅ SIMULADOR TEMPORAL DE ADMIN (solo para pruebas locales)
app.use((req, _res, next) => {
  (req as any).usuario = { id: 1, rol: "ADMINISTRADOR" };
  next();
});

// 🆕 Nueva ruta HU-08: Gestión de premiados
app.use("/api", premiadosRoutes);

app.use("/api", medalleroRoutes); 

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
// Middleware global de manejo de errores
// ============================
app.use(manejoErrores);

// ============================
// Iniciar servidor
// ============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

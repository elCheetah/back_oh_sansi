import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import fileUpload from "express-fileupload";
import prisma from "./config/database";
import estadisticasRoutes from "./routes/dashboardEstadisticas.routes";
// ============================
// Importacion de rutas
// ============================
import authRoutes from "./routes/auth.routes";
import recuperarPassRoutes from "./routes/recuperarPass.routes";
import dashboardEvaluadorRoutes from "./routes/dashboardEvaluador.routes";
import evaluacionIndividualRoutes from "./routes/evaluacionIndividual.routes";

import categoriasRoutes from "./routes/categorias.routes";

import areaRoutes from "./routes/areaRoutes";
import niveleRoutes from "./routes/nivelRoutes";

import configMedallasRoutes from "./routes/configMedallas.routes";


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true,
    useTempFiles: false,
  })
);

app.use(cors());
app.use(helmet());

// ============================
// Ruta de APIs
// ============================
app.use("/api/auth", authRoutes);
app.use("/api/recuperarPass", recuperarPassRoutes);
app.use("/api/estadisticas", estadisticasRoutes);
app.use("/api/evaluador", dashboardEvaluadorRoutes);
app.use("/api/evaluacion-individual", evaluacionIndividualRoutes);


app.use("/api/categorias", categoriasRoutes);

app.use("/api/config-medallas", configMedallasRoutes);

app.use("/api/areas", areaRoutes);
app.use("/api/niveles", niveleRoutes);

// ============================
// Consulta de conexion a la db
// ============================
app.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", db: "connected" });
  } catch {
    res.status(500).json({ status: "error", db: "not connected" });
  }
});


// ============================
// Running server
// ============================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

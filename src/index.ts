import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import fileUpload from "express-fileupload";
import prisma from "./config/database";

// ============================
// Importacion de rutas
// ============================
import authRoutes from "./routes/auth.routes";
import recuperarPassRoutes from "./routes/recuperarPass.routes";
import dashboardEvaluadorRoutes from "./routes/dashboardEvaluador.routes";
import evaluacionIndividualRoutes from "./routes/evaluacionIndividual.routes";
import estadisticasRoutes from "./routes/dashboardEstadisticas.routes";
import categoriasRoutes from "./routes/categorias.routes";

import areaRoutes from "./routes/areaRoutes";
import niveleRoutes from "./routes/nivelRoutes";

import configMedallasRoutes from "./routes/configMedallas.routes";
import asignacionesEvaluadorRoutes from "./routes/asignacionesEvaluador.routes";

import inscritosIndividualesRoutes from "./routes/inscritosIndividuales.routes";
import inscritosGrupalesRoutes from "./routes/inscritosGrupales.routes";

import importarCSVRoutes from './routes/importarCSV.routes';
import historialRoutes from './routes/historial.routes';
import parametrizarMedalleroRoutes from "./routes/parametrizarMedallero.routes";

import clasificadosRoutes from './routes/clasificadosRoutes';
import premiadosRoutes from './routes/premiadosRoutes';
import filtrosRoutes from './routes/filtrosRoutes';
import olimpistaRoutes from './routes/consultaOlimpistaRoutes';
import evaluadoresRoutes from "./routes/evaluadores.routes";
import designarEvaluadoresRoutes from "./routes/designarevaluadores.routes";

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

app.use("/api/asignaciones-evaluador", asignacionesEvaluadorRoutes);

app.use("/api/areas", areaRoutes);
app.use("/api/niveles", niveleRoutes);

app.use('/api/inscripciones', importarCSVRoutes);
app.use("/api/inscritos/individuales", inscritosIndividualesRoutes);
app.use("/api/inscritos/grupales", inscritosGrupalesRoutes);
app.use('/api/historial', historialRoutes);
app.use("/api/parametrizacion-medallas", parametrizarMedalleroRoutes);

app.use('/api/clasificados', clasificadosRoutes);
app.use('/api/premiados', premiadosRoutes);
app.use('/api/filtros/categorias', filtrosRoutes);
app.use('/api/olimpista', olimpistaRoutes);
app.use("/api/evaluadores", evaluadoresRoutes);
app.use("/api/designar-evaluadores", designarEvaluadoresRoutes);

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

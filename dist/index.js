"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const database_1 = __importDefault(require("./config/database"));
// ============================
// Importacion de rutas
// ============================
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const recuperarPass_routes_1 = __importDefault(require("./routes/recuperarPass.routes"));
const dashboardEvaluador_routes_1 = __importDefault(require("./routes/dashboardEvaluador.routes"));
const evaluacionIndividual_routes_1 = __importDefault(require("./routes/evaluacionIndividual.routes"));
const dashboardEstadisticas_routes_1 = __importDefault(require("./routes/dashboardEstadisticas.routes"));
const categorias_routes_1 = __importDefault(require("./routes/categorias.routes"));
const evaluador_routes_1 = __importDefault(require("./routes/evaluador.routes"));
const areaRoutes_1 = __importDefault(require("./routes/areaRoutes"));
const nivelRoutes_1 = __importDefault(require("./routes/nivelRoutes"));
const configMedallas_routes_1 = __importDefault(require("./routes/configMedallas.routes"));
const asignacionesEvaluador_routes_1 = __importDefault(require("./routes/asignacionesEvaluador.routes"));
const inscritosIndividuales_routes_1 = __importDefault(require("./routes/inscritosIndividuales.routes"));
const inscritosGrupales_routes_1 = __importDefault(require("./routes/inscritosGrupales.routes"));
const importarCSV_routes_1 = __importDefault(require("./routes/importarCSV.routes"));
const historial_routes_1 = __importDefault(require("./routes/historial.routes"));
const parametrizarMedallero_routes_1 = __importDefault(require("./routes/parametrizarMedallero.routes"));
const clasificadosRoutes_1 = __importDefault(require("./routes/clasificadosRoutes"));
const premiadosRoutes_1 = __importDefault(require("./routes/premiadosRoutes"));
const filtrosRoutes_1 = __importDefault(require("./routes/filtrosRoutes"));
const consultaOlimpistaRoutes_1 = __importDefault(require("./routes/consultaOlimpistaRoutes"));
const evaluadores_routes_1 = __importDefault(require("./routes/evaluadores.routes"));
const designarevaluadores_routes_1 = __importDefault(require("./routes/designarevaluadores.routes"));
const gestionFases_routes_1 = __importDefault(require("./routes/gestionFases.routes"));
const ganadoresCertificado_routes_1 = __importDefault(require("./routes/ganadoresCertificado.routes"));
const evaluaciones_routes_1 = __importDefault(require("./routes/evaluaciones.routes"));
const aprobarCalificaciones_routes_1 = __importDefault(require("./routes/aprobarCalificaciones.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ limit: "50mb", extended: true }));
app.use((0, express_fileupload_1.default)({
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true,
    useTempFiles: false,
}));
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
// ============================
// Ruta de APIs
// ============================
app.use("/api/auth", auth_routes_1.default);
app.use("/api/recuperarPass", recuperarPass_routes_1.default);
app.use("/api/estadisticas", dashboardEstadisticas_routes_1.default);
app.use("/api/evaluador", dashboardEvaluador_routes_1.default);
app.use("/api/evaluacion-individual", evaluacionIndividual_routes_1.default);
app.use("/api/categorias", categorias_routes_1.default);
app.use("/api/config-medallas", configMedallas_routes_1.default);
app.use("/api/evaluadores", evaluador_routes_1.default);
app.use("/api/asignaciones-evaluador", asignacionesEvaluador_routes_1.default);
app.use("/api/areas", areaRoutes_1.default);
app.use("/api/niveles", nivelRoutes_1.default);
app.use('/api/inscripciones', importarCSV_routes_1.default);
app.use("/api/inscritos/individuales", inscritosIndividuales_routes_1.default);
app.use("/api/inscritos/grupales", inscritosGrupales_routes_1.default);
app.use('/api/historial', historial_routes_1.default);
app.use("/api/parametrizacion-medallas", parametrizarMedallero_routes_1.default);
app.use('/api/clasificados', clasificadosRoutes_1.default);
app.use('/api/premiados', premiadosRoutes_1.default);
app.use('/api/filtros/categorias', filtrosRoutes_1.default);
app.use('/api/olimpista', consultaOlimpistaRoutes_1.default);
app.use("/api/evaluadores", evaluadores_routes_1.default);
app.use("/api/designar", designarevaluadores_routes_1.default);
app.use("/api/gestion-fases", gestionFases_routes_1.default);
app.use("/api/ganadores-certificados", ganadoresCertificado_routes_1.default);
app.use("/api/evaluaciones", evaluaciones_routes_1.default);
app.use("/api/aprobacion-calificaciones", aprobarCalificaciones_routes_1.default);
// ============================
// Consulta de conexion a la db
// ============================
app.get("/", async (_req, res) => {
    try {
        await database_1.default.$queryRaw `SELECT 1`;
        res.status(200).json({ status: "ok", db: "connected" });
    }
    catch {
        res.status(500).json({ status: "error", db: "not connected" });
    }
});
// ============================
// Running server
// ============================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

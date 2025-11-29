"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
// 🧩 Importar rutas existentes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const areaRoutes_1 = __importDefault(require("./routes/areaRoutes"));
const nivelRoutes_1 = __importDefault(require("./routes/nivelRoutes"));
const importarCSV_routes_1 = __importDefault(require("./routes/importarCSV.routes"));
const evaluador_routes_1 = __importDefault(require("./routes/evaluador.routes"));
const asignar_area_nivel_routes_1 = __importDefault(require("./routes/asignar-area-nivel.routes"));
// 🆕 Importar nuevas rutas
const inscritos_routes_1 = __importDefault(require("./routes/inscritos.routes")); // HU-04
const equipos_routes_1 = __importDefault(require("./routes/equipos.routes"));
const fases_routes_1 = __importDefault(require("./routes/fases.routes")); // HU-Fases
const premiados_routes_1 = __importDefault(require("./routes/premiados.routes")); // HU-08 (premiados)
const medallero_routes_1 = __importDefault(require("./routes/medallero.routes"));
// 🧱 Middlewares
const manejo_errores_1 = require("./middlewares/manejo-errores");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// ============================
// Configuración general
// ============================
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ limit: "50mb", extended: true }));
app.use((0, express_fileupload_1.default)({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    abortOnLimit: true,
    useTempFiles: false,
}));
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ============================
// Registro de rutas principales
// ============================
app.use("/api/auth", auth_routes_1.default);
app.use("/api/evaluadores", evaluador_routes_1.default);
app.use("/api/inscripciones", importarCSV_routes_1.default);
app.use("/api/areas", areaRoutes_1.default);
app.use("/api/niveles", nivelRoutes_1.default);
app.use("/api/asignaciones", asignar_area_nivel_routes_1.default);
// 🆕 Nueva ruta HU-04: Lista de Olímpistas Inscritos
app.use("/api", inscritos_routes_1.default);
app.use("/api", equipos_routes_1.default);
// 🆕 Nueva ruta HU-Fases: gestión de estados de fases
app.use("/api", fases_routes_1.default);
// SIMULADOR TEMPORAL DE ADMIN (solo para pruebas locales)
app.use((req, _res, next) => {
    req.usuario = { id: 1, rol: "ADMINISTRADOR" };
    next();
});
app.use("/api", premiados_routes_1.default);
app.use("/api", medallero_routes_1.default);
// ============================
// Health Check
// ============================
app.get("/", async (req, res) => {
    try {
        await database_1.default.$queryRaw `SELECT 1`;
        res.status(200).json({ status: "ok", db: "connected" });
    }
    catch (error) {
        res.status(500).json({ status: "error", db: "not connected" });
    }
});
// ============================
// Middleware global de manejo de errores
// ============================
app.use(manejo_errores_1.manejoErrores);
// ============================
// Iniciar servidor
// ============================
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

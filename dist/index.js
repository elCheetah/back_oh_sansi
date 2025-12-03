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
// Importar rutas de API
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
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
// Iniciar servidor
// ============================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

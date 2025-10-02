"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/config/database.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// (Opcional) Conectar para verificar al inicio
async function connectDB() {
    try {
        await prisma.$connect();
        console.log('✅ Conexión a la base de datos exitosa');
    }
    catch (error) {
        console.error('❌ Error de conexión a la base de datos:', error);
        process.exit(1);
    }
}
connectDB();
exports.default = prisma;

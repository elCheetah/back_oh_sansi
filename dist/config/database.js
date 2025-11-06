"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: ['query', 'warn', 'error'],
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
(async () => {
    try {
        await exports.prisma.$connect();
        console.log('✅ Conexión establecida con la base de datos');
    }
    catch (error) {
        console.error('❌ Error al conectar Prisma:', error);
    }
})();
exports.default = exports.prisma;

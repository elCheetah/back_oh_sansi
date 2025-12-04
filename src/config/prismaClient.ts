// src/config/prismaClient.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Conexión establecida con la base de datos");
  } catch (error) {
    console.error("❌ Error al conectar Prisma:", error);
  }
})();

export default prisma;

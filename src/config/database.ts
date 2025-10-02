// src/config/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// (Opcional) Conectar para verificar al inicio
async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos exitosa');
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error);
    process.exit(1);
  }
}

connectDB();

export default prisma;

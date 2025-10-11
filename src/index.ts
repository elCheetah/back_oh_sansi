// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import prisma from './config/database';
import fileUpload from 'express-fileupload';
import areaRoutes from './routes/areaRoutes';
import niveleRoutes from './routes/nivelRoutes';
import importarCSVRoutes from './routes/importarCSV.routes';
import { manejoErrores } from './middlewares/manejo-errores';
import evaluadorRoutes from './routes/evaluador.routes'; // 👈 Importamos tus rutas
import asingarAreaNivelRoutes from './routes/asignar-area-nivel.routes'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// File upload (multipart/form-data)
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  abortOnLimit: true,
  useTempFiles: false
}));
// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Registrar tus rutas
app.use('/api/evaluadores', evaluadorRoutes);
app.use('/api/inscripciones', importarCSVRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/niveles', niveleRoutes);
app.use('/api/asignaciones', asingarAreaNivelRoutes);

// Health Check
app.get('/', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'not connected' });
  }
});


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

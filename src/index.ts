import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import prisma from './config/database';

import importarCSVRoutes from './routes/importarCSVRoutes';

import { errorHandler } from './middlewares/error-handler';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//ruta de apis 
app.use('/api/importar', importarCSVRoutes);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(errorHandler);
// Health Check
app.get('/', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // prueba rápida a DB
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'not connected' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

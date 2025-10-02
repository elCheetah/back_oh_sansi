
/*
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import evaluadorRoutes from './routes/evaluador.routes'; // 👈 importar las rutas del evaluador

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Registrar las rutas
app.use('/api/evaluadores', evaluadorRoutes);

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Servidor funcionando' });
});

export default app;
*/
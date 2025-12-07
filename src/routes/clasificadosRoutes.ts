// src/routes/clasificadosRoutes.ts
import { Router } from 'express';
import { getClasificados } from '../controllers/clasificadosController';

const router = Router();

router.get('/', getClasificados);

export default router;
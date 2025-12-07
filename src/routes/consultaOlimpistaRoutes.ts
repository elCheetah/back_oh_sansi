// src/routes/consultaOlimpistaRoutes.ts
import { Router } from 'express';
import { getOlimpistaPorCI } from '../controllers/consultaOlimpistaController';

const router = Router();

router.get('/:ci', getOlimpistaPorCI);

export default router;
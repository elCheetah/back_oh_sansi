// src/routes/premiadosRoutes.ts
import { Router } from 'express';
import { getPremiados } from '../controllers/premiadosController';

const router = Router();

router.get('/', getPremiados);

export default router;
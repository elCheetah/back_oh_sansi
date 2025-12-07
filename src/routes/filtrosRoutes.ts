// src/routes/filtrosRoutes.ts
import { Router } from 'express';
import { getFiltrosCategorias } from '../controllers/filtrosController';

const router = Router();

router.get('/', getFiltrosCategorias);

export default router;
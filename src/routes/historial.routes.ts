import { Router } from 'express';
import { obtenerHistorialController } from '../controllers/historial.controller';

const router = Router();

// GET /api/historial
router.get('/', obtenerHistorialController);

export default router;

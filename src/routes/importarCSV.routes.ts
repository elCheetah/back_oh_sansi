import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler';
import { importarDesdeArchivo } from './../controllers/importarCSV.controller';

const router = Router();

/**
 * POST /api/inscripciones/csv
 * Body: multipart/form-data con "archivo" (.xlsx, .xls o .csv)
 */
router.post('/csv', asyncHandler(importarDesdeArchivo));

export default router;
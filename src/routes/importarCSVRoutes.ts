import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler';
import { importarUnico } from '../controllers/importarCSVController';
import { uploadMem } from '../middlewares/multer';

const router = Router();

/**
 * ÚNICO ENDPOINT con multipart/form-data con key "archivo" (XLSX/CSV)
 */
router.post('/inscripciones', uploadMem.single('archivo'), asyncHandler(importarUnico));

export default router;

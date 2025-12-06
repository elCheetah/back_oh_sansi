import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler';
import { importarDesdeArchivo } from './../controllers/importarCSV.controller';

const router = Router();

router.post('/csv', asyncHandler(importarDesdeArchivo));

export default router;

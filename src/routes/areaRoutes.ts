import { Router } from 'express';
import {
  crearArea,
  listarAreas,
  actualizarArea,
  eliminarArea
} from '../controllers/areasController';
import { validarDatosArea } from '../middlewares/validarAreaNivel';

const router = Router();

router.post('/', validarDatosArea, crearArea);
router.get('/', listarAreas);
router.put('/:id', validarDatosArea, actualizarArea);
router.delete('/:id', eliminarArea);

export default router;

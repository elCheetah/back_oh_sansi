import { Router } from 'express';
import {
  crearNivel,
  listarNiveles,
  actualizarNivel,
  eliminarNivel
} from '../controllers/areasController';
import { validarDatosNivel } from '../middlewares/validarAreaNivel';

const router = Router();

router.post('/', validarDatosNivel, crearNivel);
router.get('/', listarNiveles);
router.put('/:id', validarDatosNivel, actualizarNivel);
router.delete('/:id', eliminarNivel);

export default router;

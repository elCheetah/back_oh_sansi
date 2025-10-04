
// src/routes/apiRoutes.ts
import { Router } from 'express';
import { validarDatosArea, validarDatosNivel } from '../middlewares/validarAreaNivel';
import {
  crearArea,
  listarAreas,
  actualizarArea,
  eliminarArea,
  crearNivel,
  listarNiveles,
  actualizarNivel,
  eliminarNivel
} from '../controllers/areasController';




const router = Router();

// Endpoints para Áreas
router.post('/areas', validarDatosArea, crearArea);
router.get('/areas', listarAreas);
router.put('/areas/:id', validarDatosArea, actualizarArea);   //  actualizar
router.delete('/areas/:id', eliminarArea);                    //  eliminar

// Endpoints para Niveles
router.post('/niveles', validarDatosNivel, crearNivel);
router.get('/niveles', listarNiveles);
router.put('/niveles/:id', validarDatosNivel, actualizarNivel); //  actualizar
router.delete('/niveles/:id', eliminarNivel);                   //  eliminar

export default router;


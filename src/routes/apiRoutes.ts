// src/routes/apiRoutes.ts
/*import { Router } from 'express';
import {
  crearArea,
  listarAreas,
  crearNivel,
  listarNiveles
} from '../controllers/areasController';
import { validarDatosArea, validarDatosNivel } from '../middlewares/validarAreaNivel';

const router = Router();

/**
 * Rutas para áreas
 *//*
router.post('/areas', validarDatosArea, crearArea);
router.get('/areas', listarAreas);

/**
 * Rutas para niveles
 *//*
router.post('/niveles', validarDatosNivel, crearNivel);
router.get('/niveles', listarNiveles);

export default router;*/
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


import { Router } from 'express';
// Importamos las nuevas funciones de listado separado
import { listarIndividuales, listarEquipos, registrarEvaluacion } from '../controllers/evaluacion.controller';
import { validarRegistroEvaluacion } from '../middlewares/evaluacion';

const router = Router();

// 1. Ruta para obtener la lista de participantes INDIVIDUALES (Vista 1)
// Endpoint: /api/evaluaciones/individuales?evaluadorId=X&faseId=Y
router.get('/individuales', listarIndividuales);

// 2. Ruta para obtener la lista de participantes por EQUIPO (Vista 2)
// Endpoint: /api/evaluaciones/equipos?evaluadorId=X&faseId=Y
router.get('/equipos', listarEquipos);

// 3. Ruta de registro (Mantenida UNIFICADA)
// Endpoint: /api/evaluaciones/registro
router.post('/registro', validarRegistroEvaluacion, registrarEvaluacion);

export default router;
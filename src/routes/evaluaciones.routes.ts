// src/routes/evaluaciones.routes.ts

import { Router } from 'express';
import { listarParticipacionesParaCalificar, registrarEvaluacion } from '../controllers/evaluacion.controller';
import { validarRegistroEvaluacion } from '../middlewares/evaluacion';

const router = Router();

// Ruta para obtener la lista de participaciones que el evaluador puede calificar
// Ejemplo: GET /api/evaluaciones/participaciones?areaId=1&nivelId=3&faseId=1
router.get('/participaciones', listarParticipacionesParaCalificar);

// Ruta para registrar la nota y comentarios de una participación específica
// Ejemplo: POST /api/evaluaciones/registro
router.post('/registro', validarRegistroEvaluacion, registrarEvaluacion);

export default router;
// src/routes/aprobarCalificaciones.routes.ts
import { Router } from "express";
import { validateAuth } from "../middlewares/validarAuth";
import {
  obtenerResumenAprobacionController,
  obtenerTablaAprobacionController,
  aprobarEvaluacionController,
  rechazarEvaluacionController,
  listarParticipantesCategoriaResponsableController,
} from "../controllers/aprobarCalificaciones.controller";

const router = Router();

// Todas requieren auth
router.use(validateAuth);

// GET /api/aprobacion-calificaciones/resumen
router.get("/resumen", obtenerResumenAprobacionController);

// GET /api/aprobacion-calificaciones/tabla?evaluadorId=XX&tipoFase=CLASIFICATORIA|FINAL
router.get("/tabla", obtenerTablaAprobacionController);

// PATCH /api/aprobacion-calificaciones/evaluaciones/:idEvaluacion/aprobar
router.patch(
  "/evaluaciones/:idEvaluacion/aprobar",
  aprobarEvaluacionController
);

// PATCH /api/aprobacion-calificaciones/evaluaciones/:idEvaluacion/rechazar
router.patch(
  "/evaluaciones/:idEvaluacion/rechazar",
  rechazarEvaluacionController
);
// GET /api/aprobacion-calificaciones/categoria/participantes
router.get(
  "/categoria/participantes",
  listarParticipantesCategoriaResponsableController
);
export default router;

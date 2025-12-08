import { Router } from "express";
import { validateAuth } from "../middlewares/validarAuth";
import {
  listarCategoriasAsignadasController,
  listarParticipantesAsignadosController,
  guardarEvaluacionController,
  descalificarParticipacionController,
} from "../controllers/evaluaciones.controller";

const router = Router();

// Cards del tablero para el evaluador logueado
router.get(
  "/mis-categorias",
  validateAuth,
  listarCategoriasAsignadasController
);

// Lista de participantes asignados por categoría/fase
// GET /evaluaciones/participantes?categoriaId=1&tipoFase=CLASIFICATORIA|FINAL
router.get(
  "/participantes",
  validateAuth,
  listarParticipantesAsignadosController
);

// Guardar / editar una nota (por fila)
router.post(
  "/guardar",
  validateAuth,
  guardarEvaluacionController
);

// Descalificar participación (cambiar EstadoParticipacion a DESCALIFICADO)
router.post(
  "/descalificar",
  validateAuth,
  descalificarParticipacionController
);

export default router;

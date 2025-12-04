// src/routes/asignacionesEvaluador.routes.ts
import { Router } from "express";
import {
  listarCategoriasPorAreaCtrl,
  listarEvaluadoresDisponiblesCtrl,
  asignarEvaluadoresCategoriaCtrl,
  agregarEvaluadorCategoriaCtrl,
  cambiarEvaluadorCtrl,
  quitarAsignacionCtrl,
} from "../controllers/asignacionesEvaluador.controller";
import {
  validarParamArea,
  validarParamCategoria,
  validarParamAsignacion,
  validarBodyAsignarCategoria,
  validarBodyAgregarEvaluador,
  validarBodyCambiarEvaluador,
} from "../middlewares/validarAsignacionesEvaluador";

const router = Router();

/**
 * GET /api/asignaciones-evaluador/area/:areaId?gestion=2025
 */
router.get("/area/:areaId", validarParamArea, listarCategoriasPorAreaCtrl);

/**
 * GET /api/asignaciones-evaluador/categoria/:categoriaId/evaluadores-disponibles
 */
router.get(
  "/categoria/:categoriaId/evaluadores-disponibles",
  validarParamCategoria,
  listarEvaluadoresDisponiblesCtrl
);

/**
 * POST /api/asignaciones-evaluador/categoria/:categoriaId/asignar
 * Body: { evaluadorPrincipalId, evaluadorSecundarioId?, indiceInicio?, indiceFin? }
 */
router.post(
  "/categoria/:categoriaId/asignar",
  validarParamCategoria,
  validarBodyAsignarCategoria,
  asignarEvaluadoresCategoriaCtrl
);

/**
 * POST /api/asignaciones-evaluador/categoria/:categoriaId/agregar-evaluador
 * Body: { nuevoEvaluadorId, indiceInicio?, indiceFin? }
 */
router.post(
  "/categoria/:categoriaId/agregar-evaluador",
  validarParamCategoria,
  validarBodyAgregarEvaluador,
  agregarEvaluadorCategoriaCtrl
);

/**
 * PATCH /api/asignaciones-evaluador/asignacion/:asignacionId/cambiar-evaluador
 * Body: { nuevoUsuarioId }
 */
router.patch(
  "/asignacion/:asignacionId/cambiar-evaluador",
  validarParamAsignacion,
  validarBodyCambiarEvaluador,
  cambiarEvaluadorCtrl
);

/**
 * PATCH /api/asignaciones-evaluador/asignacion/:asignacionId/quitar
 */
router.patch(
  "/asignacion/:asignacionId/quitar",
  validarParamAsignacion,
  quitarAsignacionCtrl
);

export default router;

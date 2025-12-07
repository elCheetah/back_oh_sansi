import { Router } from "express";
import { validateAuth } from "../middlewares/validarAuth";
import {
  listarCategoriasConEvaluadoresController,
  listarEvaluadoresDisponiblesController,
  asignarEvaluadorCategoriaController,
  eliminarAsignacionEvaluadorController,
} from "../controllers/designarevaluadores.controller";

const router = Router();

// Lista categorías con sus evaluadores asignados
router.get(
  "/evaluadores",
  validateAuth,
  listarCategoriasConEvaluadoresController
);

// Lista evaluadores disponibles para una categoría (para el select)
router.get(
  "/evaluadores/:idCategoria/evaluadores-disponibles",
  validateAuth,
  listarEvaluadoresDisponiblesController
);

// Asignar evaluador a categoría
router.post(
  "/evaluadores/:idCategoria/evaluadores",
  validateAuth,
  asignarEvaluadorCategoriaController
);

// Eliminar (desactivar) asignación de evaluador de categoría
router.delete(
  "/evaluadores/:idCategoria/evaluadores/:idEvaluador",
  validateAuth,
  eliminarAsignacionEvaluadorController
);

export default router;

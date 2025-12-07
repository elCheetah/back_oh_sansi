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
  "/",
  validateAuth,
  listarCategoriasConEvaluadoresController
);

// Lista evaluadores disponibles para una categoría (para el select)
router.get(
  "/:idCategoria/evaluadores-disponibles",
  validateAuth,
  listarEvaluadoresDisponiblesController
);

// Asignar evaluador a categoría
router.post(
  "/:idCategoria/evaluadores",
  validateAuth,
  asignarEvaluadorCategoriaController
);

// Eliminar (desactivar) asignación de evaluador de categoría
router.delete(
  "/:idCategoria/evaluadores/:idEvaluador",
  validateAuth,
  eliminarAsignacionEvaluadorController
);

export default router;

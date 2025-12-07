// src/routes/evaluadores.routes.ts
import { Router } from "express";
import {
  listarEvaluadoresController,
  actualizarEstadoEvaluadorController,
} from "../controllers/evaluadores.controller";
import { validateAuth } from "../middlewares/validarAuth";

const router = Router();

// Todas las rutas de evaluadores requieren auth
router.use(validateAuth);

// GET /api/evaluadores
router.get("/", listarEvaluadoresController);

// PATCH /api/evaluadores/:idUsuario/estado
router.patch("/:idUsuario/estado", actualizarEstadoEvaluadorController);

export default router;

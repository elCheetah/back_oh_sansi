// src/routes/gestionEvaluador.routes.ts
import { Router } from "express";
import {
  listarGestionEvaluadoresController,
  actualizarEstadoGestionEvaluadorController,
} from "../controllers/gestionEvaluador.controller";

const router = Router();

// GET /api/evaluadores
router.get("/evaluadores", listarGestionEvaluadoresController);

// PATCH /api/evaluadores/:id/estado
router.patch(
  "/evaluadores/:id/estado",
  actualizarEstadoGestionEvaluadorController
);

export default router;

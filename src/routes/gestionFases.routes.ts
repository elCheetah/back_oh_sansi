// src/routes/gestionFases.routes.ts
import { Router } from "express";
import {
  crearGestionFasesController,
  listarGestionesFasesController,
  actualizarGestionFasesController,
  gestionarFaseAccionController,
} from "../controllers/gestionFases.controller";
import { validateAuth } from "../middlewares/validarAuth";

const router = Router();

// Crear gestión con sus 2 fases (clasificatoria y final)
router.post("/", validateAuth, crearGestionFasesController);

// Listar TODAS las gestiones con sus fases
router.get("/", validateAuth, listarGestionesFasesController);

// Actualizar nombre / fechas de la gestión (afecta a ambas fases)
router.patch("/:gestion", validateAuth, actualizarGestionFasesController);

// Gestionar una fase individual (abrir, cerrar, publicar, quitar publicación)
router.patch("/fase/:id/accion", validateAuth, gestionarFaseAccionController);

export default router;

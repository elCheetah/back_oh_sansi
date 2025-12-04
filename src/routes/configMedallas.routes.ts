// src/routes/configMedallas.routes.ts
import { Router } from "express";
import {
  listarConfigMedallasCtrl,
  actualizarConfigMedallasCtrl,
} from "../controllers/configMedallas.controller";
import { validarActualizarConfigMedallas } from "../middlewares/validarConfigMedallas";

const router = Router();

/**
 * GET /api/config-medallas
 */
router.get("/", listarConfigMedallasCtrl);

/**
 * PUT /api/config-medallas/:categoriaId
 */
router.put(
  "/:categoriaId",
  validarActualizarConfigMedallas,
  actualizarConfigMedallasCtrl
);

export default router;

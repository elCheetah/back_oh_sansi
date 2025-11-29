// src/routes/parametrizacionMedallas.routes.ts
import { Router } from "express";
import {
  obtenerTablaParametrizacionMedallas,
  guardarParametrizacionMedallas,
  eliminarParametrizacionMedallas,
} from "../controllers/parametrizacionMedallasController";
import { validarGuardarConfigMedallas } from "../middlewares/validarConfigMedallas";
// import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Tabla completa para el front
router.get(
  "/",
  // requireAuth,
  obtenerTablaParametrizacionMedallas
);

// Guardar (crear/actualizar) una fila de configuración
router.put(
  "/:areaId/:nivelId",
  // requireAuth,
  validarGuardarConfigMedallas,
  guardarParametrizacionMedallas
);

// Limpiar configuración de un área+nivel
router.delete(
  "/:areaId/:nivelId",
  // requireAuth,
  eliminarParametrizacionMedallas
);

export default router;

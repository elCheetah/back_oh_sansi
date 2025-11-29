// src/routes/parametrizacionMedallas.routes.ts
import { Router } from "express";
import {
  obtenerTablaParametrizacionMedallas,
  guardarParametrizacionMedallas,
  eliminarParametrizacionMedallas,
} from "../controllers/parametrizacionMedallas.controller";
import { validarGuardarConfigMedallas } from "../middlewares/validarConfigMedallas";


const router = Router();

// Tabla completa para el front
router.get(
  "/",
  obtenerTablaParametrizacionMedallas
);

// Guardar (crear/actualizar) una fila de configuración
router.put(
  "/:areaId/:nivelId",
  validarGuardarConfigMedallas,
  guardarParametrizacionMedallas
);

// Limpiar configuración de un área+nivel
router.delete(
  "/:areaId/:nivelId",
  eliminarParametrizacionMedallas
);

export default router;

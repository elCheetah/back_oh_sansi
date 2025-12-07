import { Router } from "express";
import {
  getParametrizacionMedallero,
  patchParametrizacionMedallero,
} from "../controllers/parametrizarMedallero.controller";
import { validateAuth } from "../middlewares/validarAuth";

const router = Router();

// GET /api/parametrizacion-medallas
router.get("/", validateAuth, getParametrizacionMedallero);

// PATCH /api/parametrizacion-medallas/:idCategoria
router.patch("/:idCategoria", validateAuth, patchParametrizacionMedallero);

export default router;

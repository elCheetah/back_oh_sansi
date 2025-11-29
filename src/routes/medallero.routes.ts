import { Router } from "express";
import { previsualizarMedallero, publicarMedallero, historialMedallero, medalleroPublico } from "../controllers/medallero.controller";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

/**
 * ADMIN (privado)
 * - Previsualizar (no persiste)
 * - Publicar (persiste snapshot en `reportes`)
 * - Historial
 */
router.get("/medallero/preview", requireAdmin, previsualizarMedallero);
router.post("/medallero/publicar", requireAdmin, publicarMedallero);
router.get("/medallero/historial", requireAdmin, historialMedallero);

/**
 * PÚBLICO (sin auth)
 * - Última publicación disponible (opcionalmente filtrada)
 */
router.get("/public/medallero", medalleroPublico);

export default router;

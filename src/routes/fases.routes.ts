import { Router } from "express";
import { FasesController } from "../controllers/fases.controller";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/fases/estado", requireAdmin, FasesController.estado);
router.post("/fases/abrir", requireAdmin, FasesController.abrir);
router.post("/fases/cerrar", requireAdmin, FasesController.cerrar);
router.post("/fases/publicar", requireAdmin, FasesController.publicar);
router.get("/fases/historial", requireAdmin, FasesController.historial);

export default router;
